import { describe, it, expect } from 'vitest';
import {
  drawnRoute, setEnding, setCurve, smooth, buildScene, sanitizeRoute, sanitizePlay, fromTemplate, nudgeStem, MAX_DRAW_POINTS, LOS, PX,
} from '../src/engine/index.js';
import { formations } from '../src/data/index.js';
import { wristDiagram } from '../src/ui/diagrams.js';
import { thumb, glyph } from '../src/ui/glyphs.js';

const start = (l) => [formations.dubs.pos[l][0], LOS + formations.dubs.pos[l][1] * PX];
const play = (routes) => ({ form: 'dubs', digits: routes, motion: null, def: 'c3', slow: false });
const LET = ['A', 'B', 'Y', 'Z', 'C'];
const taps = [[120, 240], [90, 180], [150, 130]];

describe('drawing a route', () => {
  it('the path goes through the tapped points, for receivers on either side and the center', () => {
    LET.forEach((l, i) => {
      const route = drawnRoute(taps, start(l), { center: l === 'C' });
      const digits = [null, null, null, null, null];
      digits[i] = route;
      const path = buildScene(play(digits)).path[l];
      expect(path).toHaveLength(taps.length + 1);
      taps.forEach((t, k) => {
        expect(Math.abs(path[k + 1][0] - t[0])).toBeLessThan(1);
        expect(Math.abs(path[k + 1][1] - t[1])).toBeLessThan(1);
      });
    });
  });
  it('no points means no route, and the number of points is capped', () => {
    expect(drawnRoute([], start('A'))).toBeNull();
    expect(drawnRoute(Array(20).fill([100, 200]), start('A')).points).toHaveLength(MAX_DRAW_POINTS);
  });
  it('a curved route passes through the same points with many small pieces', () => {
    const digits = [drawnRoute(taps, start('A'), { curve: true }), null, null, null, null];
    const path = buildScene(play(digits)).path.A;
    expect(path.length).toBeGreaterThan(20);
    taps.forEach((t) => expect(path.some((p) => Math.hypot(p[0] - t[0], p[1] - t[1]) < 1)).toBe(true));
    expect(smooth([[0, 0], [5, 5]])).toEqual([[0, 0], [5, 5]]);
  });
});

describe('how a route ends', () => {
  it('a tree route can sit, and going back to an arrow makes it a plain number again', () => {
    const sit = setEnding(2, 'sit');
    expect(sit).toMatchObject({ end: 'sit', tree: 2, name: 'Slant' });
    expect(setEnding(sit, 'arrow')).toBe(2);
    expect(buildScene(play([sit, 9, 9, 9, 9])).sit).toEqual({ A: true });
    expect(setEnding(null, 'sit')).toBeNull();
  });
  it('tuning a route keeps its ending and curve', () => {
    const r = setCurve(setEnding(fromTemplate('post-corner'), 'sit'), true);
    expect(nudgeStem(r, 1)).toMatchObject({ end: 'sit', curve: true });
  });
  it('is saved with the play', () => {
    const r = drawnRoute(taps, start('B'), { curve: true, end: 'sit' });
    expect(sanitizeRoute(JSON.parse(JSON.stringify(r)))).toMatchObject({ curve: true, end: 'sit', drawn: true, points: r.points });
    expect(sanitizePlay({ form: 'dubs', motion: null, routes: [2, r, 9, 9, 9] }).routes[1].end).toBe('sit');
  });
  it('shows as a circle on every diagram', () => {
    const digits = [setEnding(9, 'sit'), 9, 9, 9, 9];
    const p = { form: 'dubs', digits, motion: null };
    expect((wristDiagram(p).match(/class="wd-sit"/g) || [])).toHaveLength(1);
    expect(thumb(p)).toContain('r="8" fill="none"');
    expect(glyph(digits[0])).toContain('r="3.6"');
    expect(wristDiagram(p)).not.toMatch(/NaN|undefined/);
  });
});
