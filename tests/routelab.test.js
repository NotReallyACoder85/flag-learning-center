import { describe, it, expect } from 'vitest';
import {
  TEMPLATES, templatesIn, buildRoute, fromTemplate, nudgeStem, nudgeBreak, flipRoute, paramsOf, describeRoute, kindOf,
  buildScene, playFromEntry, playbookEntries, routeFor, LET, LOS, PX,
} from '../src/engine/index.js';
import { routelab, routes } from '../src/data/index.js';
import { ALL_FORM_KEYS, DEFS } from './helpers.js';

const finite = (p) => Number.isFinite(p[0]) && Number.isFinite(p[1]);
const L = routelab.limits;

describe('templates', () => {
  it('has the five specials and six double moves', () => {
    expect(templatesIn('special').map((t) => t.name)).toEqual(['Wheel', 'Snag', 'Trail', 'Swing', 'Arrow']);
    expect(templatesIn('double').map((t) => t.name)).toEqual(['Post-Corner', 'Corner-Post', 'Out & Up', 'In & Up', 'Slant & Go', 'Hitch & Go']);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
  });
  it('every template builds a valid route, for a side receiver and for the center', () => {
    TEMPLATES.forEach((t) => [false, true].forEach((center) => {
      const r = fromTemplate(t.id, center);
      expect(r.name).toBe(t.name);
      expect(['in', 'out', 'vert']).toContain(r.kind);
      expect(r.points.length).toBeGreaterThanOrEqual(2);
      r.points.forEach((p) => {
        expect(finite(p), t.id).toBe(true);
        expect(Math.abs(p[0])).toBeLessThanOrEqual(L.maxLateral);
        expect(p[1]).toBeLessThanOrEqual(L.maxDepth);
      });
      expect(!!r.abs).toBe(center); // only the center's template routes go to an absolute side
    }));
  });
  it('double moves have a stem, and the wheel does not', () => {
    expect(paramsOf(fromTemplate('post-corner')).hasStem).toBe(true);
    expect(paramsOf(fromTemplate('wheel')).hasStem).toBe(false);
    expect(paramsOf(fromTemplate('snag')).hasStem).toBe(false);
  });
  it('the double moves match the shapes in the playbook', () => {
    expect(fromTemplate('post-corner').points).toEqual([[0, 7], [-2.6, 9], [4.1, 12.5]]);
    expect(fromTemplate('corner-post').points).toEqual([[0, 7], [2.6, 8.5], [-4.1, 12.5]]);
    expect(fromTemplate('wheel').points.at(-1)).toEqual([8.2, 12.5]);
  });
});

describe('stem', () => {
  it('a longer stem moves the whole break deeper and keeps its shape', () => {
    const a = fromTemplate('post-corner'), b = nudgeStem(a, 3);
    expect(b.points[0]).toEqual([0, 10]);
    b.points.slice(1).forEach((p, i) => {
      expect(p[0]).toBeCloseTo(a.points[i + 1][0], 1);
      expect(p[1]).toBeCloseTo(a.points[i + 1][1] + 3, 1);
    });
    expect(b.detail).toBe('10 yd stem');
  });
  it('works on the numbered routes too: a Slant with a longer stem is still a Slant', () => {
    const s = nudgeStem(2, 2); // Slant: 3 yard stem -> 5
    expect(s.name).toBe('Slant');
    expect(s.tree).toBe(2);
    expect(s.points[0]).toEqual([0, 5]);
    expect(s.points[1][1]).toBeCloseTo(routes[2].points[1][1] + 2, 1);
    expect(s.detail).toBe('5 yd stem');
  });
  it('stays inside the limits', () => {
    let r = fromTemplate('post-corner');
    for (let i = 0; i < 40; i++) r = nudgeStem(r, 1);
    expect(r.points[0][1]).toBe(L.stemMax);
    for (let i = 0; i < 40; i++) r = nudgeStem(r, -1);
    expect(r.points[0][1]).toBe(L.stemMin);
  });
  it('does nothing for a route with no stem', () => {
    const w = fromTemplate('wheel');
    expect(nudgeStem(w, 2)).toBe(w);
  });
  it('tapping up then down gets exactly the original back (no drift)', () => {
    let r = fromTemplate('out-and-up');
    const orig = JSON.stringify(r.points);
    r = nudgeStem(r, 1); r = nudgeStem(r, 1); r = nudgeStem(r, -1); r = nudgeStem(r, -1);
    expect(JSON.stringify(r.points)).toBe(orig);
    expect(r.detail).toBeUndefined();
  });
});

describe('break', () => {
  it('scales the first break to the length asked for', () => {
    const a = fromTemplate('post-corner'), p = paramsOf(a);
    const b = nudgeBreak(a, 1);
    const first = Math.hypot(b.points[1][0] - b.points[0][0], b.points[1][1] - b.points[0][1]);
    expect(first).toBeCloseTo(p.brk + 1, 0);
    expect(b.points[0]).toEqual(a.points[0]); // stem untouched
    expect(b.detail).toMatch(/yd break/);
  });
  it('works without a stem (the wheel reaches wider)', () => {
    const a = fromTemplate('wheel'), b = nudgeBreak(a, 2);
    expect(b.points.at(-1)[0]).toBeGreaterThan(a.points.at(-1)[0]);
    expect(nudgeBreak(nudgeBreak(a, 2), -2).points).toEqual(a.points);
  });
  it('stays inside the limits', () => {
    let r = fromTemplate('post-corner');
    for (let i = 0; i < 30; i++) r = nudgeBreak(r, 1);
    const p = paramsOf(r);
    expect(p.brk).toBeLessThanOrEqual(p.brkMax + 0.05);
    for (let i = 0; i < 30; i++) r = nudgeBreak(r, -1);
    expect(paramsOf(r).brk).toBeGreaterThanOrEqual(2 - 0.05);
  });
  it('stem and break tuning combine and survive each other', () => {
    let r = fromTemplate('corner-post');
    r = nudgeStem(r, 2); r = nudgeBreak(r, 1); r = nudgeStem(r, -1);
    const p = paramsOf(r);
    expect(p.stem).toBe(8);
    expect(r.points[0]).toEqual([0, 8]);
  });
});

describe('center direction', () => {
  it('a center template can be flipped to the other side, and flipping twice is a no-op', () => {
    const w = fromTemplate('wheel', true);
    expect(paramsOf(w).hasFlip).toBe(true);
    expect(w.points.at(-1)[0]).toBeGreaterThan(0);
    const f = flipRoute(w);
    expect(f.points.at(-1)[0]).toBeLessThan(0);
    expect(flipRoute(f).points).toEqual(w.points);
  });
  it('side receivers have no flip', () => {
    const w = fromTemplate('wheel', false);
    expect(paramsOf(w).hasFlip).toBe(false);
    expect(flipRoute(w)).toBe(w);
  });
  it('flip survives stem and break tuning', () => {
    const r = nudgeStem(flipRoute(fromTemplate('post-corner', true)), 1);
    expect(r.points.at(-1)[0]).toBeLessThan(0);
  });
  it('a flipped center route really runs to the left in the scene', () => {
    const play = { form: 'dubs', digits: [null, null, null, null, flipRoute(fromTemplate('wheel', true))], motion: null, def: 'none', slow: false };
    const s = buildScene(play);
    expect(s.E.C[0]).toBeLessThan(s.pre.C[0] - 5 * PX);
  });
});

describe('tuning any route', () => {
  it('a drawn playbook route can be tuned, and keeps its name and number', () => {
    const e = playbookEntries.find((p) => p.id === 'man-smash-double-slant');
    const corner = e.routes.B; // Corner (7): 7 up, then out
    const t = nudgeStem(corner, 2);
    expect(t.name).toBe('Corner');
    expect(t.tree).toBe(7);
    expect(t.points[0][1]).toBe(corner.points[0][1] + 2);
    expect(nudgeStem(t, -2).points).toEqual(corner.points);
  });
  it('a numbered route with no changes stays a plain number elsewhere (describeRoute works for all three kinds)', () => {
    expect(describeRoute(7)).toEqual({ name: 'Corner', detail: '' });
    expect(describeRoute(nudgeStem(7, 1)).detail).toBe('11 yd stem');
    expect(describeRoute(null)).toBeNull();
  });
  it('paramsOf gives the defaults for a plain numbered route', () => {
    expect(paramsOf(2)).toMatchObject({ hasStem: true, stem: 3 });
    expect(paramsOf(null)).toBeNull();
  });
  it('kindOf: out, in and vertical', () => {
    expect(kindOf([[0, 7], [5, 7]])).toBe('out');
    expect(kindOf([[0, 7], [-5, 7]])).toBe('in');
    expect(kindOf([[0, 7], [0.5, 15]])).toBe('vert');
    expect(kindOf([[1, 1]], true)).toBe('in');
  });
});

describe('Route Lab routes run everywhere', () => {
  it('every template (side and center, tuned) x formation x defense: finite positions and a read', () => {
    const variants = [];
    TEMPLATES.forEach((t) => [false, true].forEach((c) => {
      const base = fromTemplate(t.id, c);
      variants.push(base, nudgeStem(base, 3), nudgeBreak(base, 2), nudgeBreak(nudgeStem(base, -2), -1));
    }));
    ALL_FORM_KEYS.forEach((form) =>
      DEFS.forEach((def) => {
        variants.forEach((r, i) => {
          const digits = [r, 2, r, 9, r];
          const s = buildScene({ form, digits, motion: null, def, slow: false });
          for (let k = 0; k <= 8; k++) {
            const st = s.stateAt((s.end * k) / 8);
            LET.forEach((l) => expect(finite(st.off[l]), `${form} ${def} ${i}`).toBe(true));
            s.defs.forEach((d) => expect(finite(st.def[d.id]), `${form} ${def} ${d.id}`).toBe(true));
          }
          if (def !== 'none') expect(s.result).toBeTruthy();
        });
      })
    );
  });
  it('a route survives being saved and loaded as JSON', () => {
    const r = nudgeStem(fromTemplate('post-corner'), 2);
    const back = JSON.parse(JSON.stringify(r));
    expect(back).toEqual(r);
    expect(nudgeStem(back, 1).points[0][1]).toBe(10);
    expect(routeFor(back)).toBe(back);
  });
});

import { sanitizeRoute, sanitizePlay, nudgeBreak as nb } from '../src/engine/index.js';
import { sanitize } from '../src/ui/storage.js';

describe('saved plays', () => {
  const good = () => ({ form: 'dubs', motion: { who: 'Y', tag: 'cross' }, routes: [nudgeStem(fromTemplate('post-corner'), 2), 2, fromTemplate('wheel', true), 9, 4] });
  it('a play with custom routes survives a trip through JSON unchanged', () => {
    const p = good();
    expect(sanitizePlay(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
  it('a custom route keeps its tuning info so it can still be adjusted after loading', () => {
    const r = sanitizeRoute(JSON.parse(JSON.stringify(nudgeStem(fromTemplate('post-corner'), 2))));
    expect(nudgeStem(r, 1).points[0][1]).toBe(10);
  });
  it('drops anything that is not a real play, without throwing', () => {
    [null, 5, 'x', {}, { form: 'nope', routes: [1, 2, 3, 4, 5] }, { form: 'dubs', routes: [1, 2, 3] }, { form: 'dubs', routes: [1, 2, 3, 4, null] },
     { form: 'dubs', routes: [1, 2, 3, 4, { name: 'x', points: 'bad' }] }, { form: 'dubs', routes: [1, 2, 3, 4, 12] }, { form: 'dubs', routes: [1, 2, 3, 4, 5], motion: { who: 'C', tag: 'cross' } }]
      .forEach((v) => expect(sanitizePlay(v)).toBeNull());
  });
  it('cleans values that are out of range and ignores a damaged tuning record', () => {
    const r = sanitizeRoute({ name: 'Wild', kind: 'bogus', points: [[500, 500], [-500, -500]], lab: { base: { tpl: 'nope' } } });
    expect(r.kind).toMatch(/in|out|vert/);
    r.points.forEach(([a, b]) => { expect(Math.abs(a)).toBeLessThanOrEqual(22); expect(b).toBeLessThanOrEqual(22); expect(b).toBeGreaterThanOrEqual(-6); });
    expect(r.lab).toBeUndefined();
  });
  it('a saved list can hold call-coded plays and whole plays together', () => {
    const list = sanitize([{ code: 'dubs 21129', name: 'A' }, { name: 'B', play: good() }, { name: 'C', play: { form: 'zzz' } }, { code: 'bad', name: 'D' }]);
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({ code: 'Dubs 21129', name: 'A' });
    expect(list[1].play.routes[0].name).toBe('Post-Corner');
  });
  it('a saved custom play still runs against every defense', () => {
    const p = sanitizePlay(JSON.parse(JSON.stringify(good())));
    DEFS.forEach((def) => {
      const s = buildScene({ form: p.form, digits: p.routes, motion: p.motion, def, slow: false });
      expect(s.end).toBeGreaterThan(0);
    });
  });
});

describe('route label', () => {
  it('says what was tuned: stem, break, or both', () => {
    const a = fromTemplate('post-corner');
    expect(nudgeStem(a, 2).detail).toBe('9 yd stem');
    expect(nudgeBreak(a, 1).detail).toMatch(/yd break$/);
    const both = nudgeBreak(nudgeStem(a, 2), 1);
    expect(both.detail).toMatch(/^stem 9 · break 4\.\d$/);
  });
});
