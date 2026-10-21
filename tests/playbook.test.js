// The coach's playbook (from the 2x2 Attack System PDF): every play loads, runs and reads sensibly.
import { describe, it, expect } from 'vitest';
import { buildScene, playFromEntry, playbookEntries, playbookSections, routeFor, LET, LOS, PX } from '../src/engine/index.js';
import { formations, baseFormations, playbook } from '../src/data/index.js';
import { DEFS } from './helpers.js';

const finite = (p) => Number.isFinite(p[0]) && Number.isFinite(p[1]);

describe('playbook data', () => {
  it('has the 28 passing plays from the PDF, each once (no mirror-image copies)', () => {
    expect(playbookEntries).toHaveLength(28);
    expect(new Set(playbookEntries.map((p) => p.id)).size).toBe(28);
  });
  it('every play is in a known section and a real formation', () => {
    const secs = new Set(playbookSections.map((s) => s.id));
    playbookEntries.forEach((p) => {
      expect(secs.has(p.section), p.id).toBe(true);
      expect(formations[p.formation], p.id).toBeTruthy();
    });
    expect(playbookSections.every((s) => playbookEntries.some((p) => p.section === s.id))).toBe(true);
  });
  it('every play gives all five receivers a named, drawn route', () => {
    playbookEntries.forEach((p) => {
      ['A', 'B', 'C', 'Y', 'Z'].forEach((l) => {
        const r = p.routes[l];
        expect(r, `${p.id} ${l}`).toBeTruthy();
        expect(r.name.length).toBeGreaterThan(1);
        expect(['in', 'out', 'vert']).toContain(r.kind);
        expect(r.points.length).toBeGreaterThanOrEqual(1);
        r.points.forEach((pt) => expect(pt.every(Number.isFinite)).toBe(true));
        if (r.tree != null) expect(Number.isInteger(r.tree) && r.tree >= 0 && r.tree <= 9).toBe(true);
      });
      expect(p.routes.C.abs, `${p.id} centre`).toBe(true);
    });
  });
  it('playbook-only formations stay out of Draw Up and the formation quiz', () => {
    expect(baseFormations).toEqual(['dubs', 'chiefs', 'dubstight', 'trips', 'quads']);
    expect(formations.stacked.playbook).toBe(true);
  });
  it('the PDF notes that every play came from its source', () => {
    expect(playbook._note).toMatch(/PDF/);
  });
});

describe('playbook plays run', () => {
  it('every play against every defense: finite positions the whole way, and a read at the end', () => {
    playbookEntries.forEach((e) => {
      DEFS.forEach((def) => {
        const s = buildScene({ ...playFromEntry(e), def, slow: false });
        for (let i = 0; i <= 16; i++) {
          const st = s.stateAt((s.end * i) / 16);
          LET.forEach((l) => expect(finite(st.off[l]), `${e.id} ${def} ${l}`).toBe(true));
          s.defs.forEach((d) => expect(finite(st.def[d.id]), `${e.id} ${def} ${d.id}`).toBe(true));
        }
        if (def === 'none') expect(s.result).toBeNull();
        else expect(s.result, `${e.id} ${def}`).toBeTruthy();
      });
    });
  });
  it('routes are drawn as in the PDF: a route ends where its waypoints say', () => {
    const e = playbookEntries.find((p) => p.id === 'man-smash-double-slant');
    const s = buildScene({ ...playFromEntry(e), def: 'none', slow: false });
    // B runs a corner: 7 yards up, then 4.6 yards out toward the left sideline to 11 yards deep
    expect(s.pre.B[0] - s.E.B[0]).toBeCloseTo(4.6 * PX, 0);
    expect(LOS - s.E.B[1]).toBeCloseTo(11 * PX, 0);
    // Z (right side) runs a slant: toward the middle
    expect(s.E.Z[0]).toBeLessThan(s.pre.Z[0]);
  });
  it("the center's wheel goes to the right and is never mirrored", () => {
    const e = playbookEntries.find((p) => p.id === 'man-smash-double-slant');
    const s = buildScene({ ...playFromEntry(e), def: 'none', slow: false });
    expect(s.E.C[0]).toBeGreaterThan(s.pre.C[0] + 10 * PX);
    // the same play with a motion that flips the strong side must not flip him
    const moved = buildScene({ ...playFromEntry(e), motion: { who: 'Y', tag: 'cross' }, def: 'none', slow: false });
    expect(moved.E.C[0]).toBeGreaterThan(moved.pre.C[0] + 10 * PX);
  });
  it('motion goes to the spot in the PDF, then the route starts from there', () => {
    const e = playbookEntries.find((p) => p.id === 'man-slant-flood');
    const play = playFromEntry(e);
    const s = buildScene({ ...play, def: 'none', slow: false });
    expect(play.motion).toMatchObject({ who: 'B', tag: 'custom' });
    expect(s.post.B[0]).toBe(e.motion.to[0]);
    expect(s.post.B[1]).toBeCloseTo(LOS + e.motion.to[1] * PX);
    expect(s.path.B[0]).toEqual(s.post.B);
    expect(s.tm).toBe(1.4);
  });
  it('man coverage follows the motion man in the motion plays', () => {
    ['man-slant-flood', 'c2-motion-flood-right'].forEach((id) => {
      const play = playFromEntry(playbookEntries.find((p) => p.id === id));
      const s = buildScene({ ...play, def: 'man', slow: false });
      const at = s.stateAt(s.ts);
      expect(Math.hypot(at.def.DB[0] - at.off.B[0], at.def.DB[1] - at.off.B[1]), id).toBeLessThan(60);
    });
  });
  it('a stacked play lines up with the two stacks', () => {
    const e = playbookEntries.find((p) => p.formation === 'stacked');
    const s = buildScene({ ...playFromEntry(e), def: 'none', slow: false });
    expect(s.pre.A[0]).toBe(s.pre.B[0]);
    expect(s.pre.B[1]).toBeGreaterThan(s.pre.A[1]); // B is behind A
    expect(s.pre.Y[0]).toBe(s.pre.Z[0]);
  });
  it('routeFor accepts numbers, drawn routes and nothing', () => {
    expect(routeFor(2).name).toBe('Slant');
    const drawn = { name: 'Snag', kind: 'in', points: [[0, 1]] };
    expect(routeFor(drawn)).toBe(drawn);
    expect(routeFor(null)).toBeUndefined();
  });
});
