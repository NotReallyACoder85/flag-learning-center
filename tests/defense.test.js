import { describe, it, expect } from 'vitest';
import { buildScene, parseCall, overloadShift, callouts, LOS, PX } from '../src/engine/index.js';
import { formations, settings } from '../src/data/index.js';
import { FORM_KEYS, MOTIONS, libraryPlays } from './helpers.js';

const scene = (call, def) => buildScene({ ...parseCall(call), def, slow: false });
const prePos = (form) => {
  const o = {};
  Object.entries(formations[form].pos).forEach(([l, [x, d]]) => (o[l] = [x, LOS + d * PX]));
  return o;
};

describe('strength shift (overload)', () => {
  it('is zero for balanced sets', () => {
    ['dubs', 'chiefs', 'dubstight'].forEach((f) => expect(overloadShift(prePos(f))).toBe(0));
  });
  it('slides toward the strong side, by 12 px per extra receiver', () => {
    expect(overloadShift(prePos('trips'))).toBe(-24); // 3 left, 1 right
  });
  it('is capped (Quads: 4 left, 0 right)', () => {
    expect(overloadShift(prePos('quads'))).toBe(-settings.overload.maxPx);
  });
  it('motion that flips the balance moves the zones (Dubs + Y Cross becomes trips left)', () => {
    const plain = scene('Dubs 21129', 'c3'), moved = scene('Dubs 21129 Y Cross', 'c3');
    const mid = (s) => s.defs.find((d) => d.id === 'M').zone[0];
    expect(mid(moved)).toBeLessThan(mid(plain));
  });
  it('balanced sets keep the original zone landmarks', () => {
    const s = scene('Dubs 21129', 'c3');
    expect(s.defs.find((d) => d.id === 'LCB').zone).toEqual([8, 56, 112, 132]);
    expect(s.defs.find((d) => d.id === 'M').zone).toEqual([124, 192, 112, 84]);
    const c2 = scene('Dubs 21129', 'c2');
    expect(c2.defs.find((d) => d.id === 'LS').zone).toEqual([8, 56, 168, 132]);
    expect(c2.defs.find((d) => d.id === 'RLB').zone).toEqual([184, 192, 72, 84]);
  });
});

describe('zones tile the field (no overlaps, gaps at most 8 px, no overlaps, inside the field)', () => {
  const rows = (s, y) => s.defs.map((d) => d.zone).filter((z) => z[1] === y).sort((a, b) => a[0] - b[0]);
  it.each([['c3'], ['c2']])('%s, every formation x motion', (def) => {
    FORM_KEYS.forEach((form) =>
      MOTIONS.forEach((motion) => {
        const digits = [2, 1, 1, 2, 9];
        const s = buildScene({ form, digits, motion, def, slow: false });
        [56, 192].forEach((y) => {
          const r = rows(s, y);
          expect(r.length).toBeGreaterThanOrEqual(2);
          expect(r[0][0], `${form} ${def} left edge`).toBe(8);
          const last = r[r.length - 1];
          expect(last[0] + last[2], `${form} ${def} right edge`).toBe(352);
          for (let i = 1; i < r.length; i++) {
            const gap = r[i][0] - (r[i - 1][0] + r[i - 1][2]);
            expect(gap, `${form} ${def} ${JSON.stringify(motion)} y${y}`).toBeGreaterThanOrEqual(0);
            expect(gap).toBeLessThanOrEqual(8); // Cover 2 leaves 8 px down the middle, as in the prototype
          }
          r.forEach((z) => expect(z[2]).toBeGreaterThan(40));
        });
      })
    );
  });
});

describe('callouts (tell and result)', () => {
  it('no defense: nothing is called out', () => {
    libraryPlays.forEach((p) => {
      const s = buildScene({ ...p, def: 'none', slow: false });
      expect(callouts(s, { ...p, def: 'none' }, s.end)).toEqual({ tell: null, result: null });
    });
  });
  it.each([['c3', 'zone'], ['c2', 'zone'], ['man', 'man']])('%s: result at the end of every play, tell after motion (%s)', (def, kind) => {
    libraryPlays.forEach((p) => {
      const play = { ...p, def, slow: false };
      const s = buildScene(play);
      const end = callouts(s, play, s.end);
      expect(end.result, p.call).toBeTruthy();
      expect(end.tell, p.call).toBe(p.motion ? kind : null);
      // before the end there is no result yet; before motion finishes there is no tell
      expect(callouts(s, play, 0).result).toBeNull();
      if (p.motion) expect(callouts(s, play, 0).tell).toBeNull();
    });
  });
});

describe('man coverage follows the motion man', () => {
  it('the defender on the mover ends up on the new side', () => {
    const s = scene('Dubs 21129 Y Cross', 'man');
    const at = s.stateAt(s.ts);
    expect(at.def.DY[0]).toBeLessThan(180); // Y crossed to the left, his defender went with him
    expect(Math.abs(at.def.DY[0] - at.off.Y[0])).toBeLessThan(12);
  });
});
