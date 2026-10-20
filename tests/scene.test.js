import { describe, it, expect } from 'vitest';
import { buildScene, parseCall, motionDest, LOS, PX, ROUTES } from '../src/engine/index.js';
import { formations } from '../src/data/index.js';

const scene = (call, def = 'none', slow = false) => buildScene({ ...parseCall(call), def, slow });

describe('timeline', () => {
  it('has no motion phase without motion', () => {
    const s = scene('Dubs 21129');
    expect(s.tm).toBe(0);
    expect(s.routeDur).toBe(3.6);
  });
  it('motion takes 1.4 s then snap', () => {
    const s = scene('Dubs 21129 Y Cross');
    expect(s.tm).toBe(1.4);
    expect(s.ts).toBeCloseTo(1.8);
  });
  it('slow mode runs routes for 7 s', () => {
    expect(scene('Dubs 21129', 'none', true).routeDur).toBe(7);
  });
});

describe('alignment and routes', () => {
  it('lines everyone up from the formation data', () => {
    const s = scene('Dubs 21129');
    expect(s.pre.A).toEqual([45, LOS]);
    expect(s.pre.B).toEqual([108, LOS + PX]);
  });
  it('mirrors routes by side: slants break toward the center', () => {
    const s = scene('Dubs 22222');
    expect(s.E.A[0]).toBeGreaterThan(s.pre.A[0]); // left receiver slants right
    expect(s.E.Z[0]).toBeLessThan(s.pre.Z[0]); // right receiver slants left
  });
  it('routes end at the right depth', () => {
    const s = scene('Dubs 99999');
    expect(LOS - s.E.A[1]).toBeCloseTo(18 * PX);
  });
  it('routes do not change because of motion (receivers who stay on their side)', () => {
    const a = scene('Dubs 21129'), b = scene('Dubs 21129 Y Cross');
    expect(b.E.A).toEqual(a.E.A);
    expect(b.E.B).toEqual(a.E.B);
    expect(b.E.Z).toEqual(a.E.Z);
  });
  it('the center breaks toward the strong side, so motion that flips it mirrors his break', () => {
    const a = scene('Dubs 66666'), b = scene('Dubs 66666 Y Cross');
    expect(a.E.C[0]).toBeGreaterThan(180); // 2x2 ties go right
    expect(b.E.C[0]).toBeLessThan(180); // trips left now
  });
  it('routes start from the post-motion position and orient to the new side', () => {
    const s = scene('Dubs 22222 Y Cross');
    expect(s.post.Y[0]).toBeLessThan(180);
    expect(s.path.Y[0]).toEqual(s.post.Y);
    expect(s.E.Y[0]).toBeGreaterThan(s.post.Y[0]); // slants in from the left side now
  });
  it('keeps routes on the field', () => {
    ['Quads 99999', 'Trips 55555', 'Dubs 77777'].forEach((c) => {
      const s = scene(c);
      Object.values(s.path).forEach((pts) => pts.forEach(([x]) => expect(x >= 10 && x <= 350).toBe(true)));
    });
  });
});

describe('motionDest', () => {
  const pre = (name) => {
    const f = formations[name].pos, o = {};
    Object.keys(f).forEach((l) => (o[l] = [f[l][0], LOS + f[l][1] * PX]));
    return o;
  };
  it('cross lands on the other side of center', () => {
    const p = pre('dubs');
    expect(motionDest(p, 'Y', 'cross')[0]).toBeLessThan(180);
    expect(motionDest(p, 'A', 'cross')[0]).toBeGreaterThan(180);
  });
  it('enter moves toward center without crossing', () => {
    const p = pre('dubs');
    expect(motionDest(p, 'A', 'enter')[0]).toBe(148);
    expect(motionDest(p, 'Z', 'enter')[0]).toBe(212);
    expect(motionDest(p, 'B', 'enter')[0]).toBe(148);
  });
  it('exit goes outside the outermost receiver on his side', () => {
    const p = pre('dubs');
    expect(motionDest(p, 'B', 'exit')[0]).toBeLessThan(45);
    expect(motionDest(p, 'A', 'exit')).toEqual([22, LOS]);
  });
  it('cross with nobody on the far side still produces a spot on the field', () => {
    const d = motionDest(pre('quads'), 'A', 'cross');
    expect(d[0]).toBeGreaterThanOrEqual(140);
    expect(d[0]).toBeLessThanOrEqual(340);
  });
});

describe('result', () => {
  it('is null with no defense', () => {
    expect(scene('Dubs 21129').result).toBeNull();
  });
  it('names an open receiver or reports tight coverage, with a reason', () => {
    ['c3', 'c2', 'man'].forEach((d) => {
      const r = scene('Dubs 21129 Y Cross', d).result;
      expect('ABYZC').toContain(r.open);
      expect(Number.isFinite(r.sep)).toBe(true);
      expect(r.why.length).toBeGreaterThan(10);
    });
  });
  it('man has six defenders (one per receiver plus the safety); zones have six', () => {
    expect(scene('Dubs 21129', 'man').defs).toHaveLength(6);
    expect(scene('Dubs 21129', 'c3').defs).toHaveLength(6);
    expect(scene('Dubs 21129', 'c2').defs).toHaveLength(6);
  });
});

describe('route data', () => {
  it('has routes 0-9 in order with valid kinds and waypoints', () => {
    expect(ROUTES).toHaveLength(10);
    ROUTES.forEach((r, i) => {
      expect(r.id).toBe(i);
      expect(['in', 'out', 'vert']).toContain(r.kind);
      expect(r.points.length).toBeGreaterThan(0);
    });
  });
});
