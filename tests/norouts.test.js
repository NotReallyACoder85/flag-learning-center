// A receiver can have no route (the "Clear routes" state). He stands still and nothing breaks.
import { describe, it, expect } from 'vitest';
import { buildScene, callText, checkCall, digitsText, erasedPlay, setRoute, LET, LOS } from '../src/engine/index.js';
import { FORM_KEYS, DEFS, MOTIONS } from './helpers.js';

const finite = (p) => Number.isFinite(p[0]) && Number.isFinite(p[1]);

describe('no-route receivers', () => {
  it('digits show blanks as underscores in the call text', () => {
    expect(digitsText([2, null, 1, null, 9])).toBe('2_1_9');
    expect(callText({ form: 'dubs', digits: erasedPlay().digits, motion: null })).toBe('Dubs _____');
  });
  it('a half-built call is not a valid call (the player must finish it)', () => {
    expect(checkCall('Dubs _____').error).toBeTruthy();
  });
  it('stand still for the whole play', () => {
    const s = buildScene({ form: 'dubs', digits: erasedPlay().digits, motion: null, def: 'none', slow: false });
    LET.forEach((l) => {
      expect(s.path[l]).toHaveLength(1);
      expect(s.stateAt(s.end).off[l]).toEqual(s.pre[l]);
    });
  });
  it('a mover with no route still moves, then stands still at the new spot', () => {
    const s = buildScene({ form: 'dubs', digits: erasedPlay().digits, motion: { who: 'Y', tag: 'cross' }, def: 'none', slow: false });
    expect(s.stateAt(s.end).off.Y).toEqual(s.post.Y);
    expect(s.post.Y[0]).toBeLessThan(180);
  });
  it('only receivers with a route can be the open receiver', () => {
    ['c3', 'c2', 'man'].forEach((def) => {
      const digits = setRoute(erasedPlay().digits, 1, 7); // only B runs a route
      const s = buildScene({ form: 'dubs', digits, motion: null, def, slow: false });
      expect(s.result.open).toBe('B');
    });
  });
  it('no routes at all: no result and no ball target', () => {
    ['c3', 'c2', 'man'].forEach((def) => {
      const s = buildScene({ form: 'dubs', digits: erasedPlay().digits, motion: null, def, slow: false });
      expect(s.result).toBeNull();
      expect(s.defs.length).toBeGreaterThan(0);
    });
  });
  it('sweep: every formation x defense x motion with empty and mixed route sets stays finite', () => {
    const sets = [erasedPlay().digits, [null, 7, null, null, 4], [2, null, null, 2, null], [null, null, null, null, 9]];
    FORM_KEYS.forEach((form) =>
      DEFS.forEach((def) =>
        MOTIONS.forEach((motion) =>
          sets.forEach((digits) => {
            const s = buildScene({ form, digits, motion, def, slow: false });
            for (let i = 0; i <= 12; i++) {
              const st = s.stateAt((s.end * i) / 12);
              LET.forEach((l) => expect(finite(st.off[l]), `${form} ${def} off ${l}`).toBe(true));
              s.defs.forEach((d) => expect(finite(st.def[d.id]), `${form} ${def} def ${d.id}`).toBe(true));
            }
            if (def !== 'none' && digits.some((d) => d != null)) expect(s.result).toBeTruthy();
          })
        )
      )
    );
    expect(LOS).toBe(300);
  });
});
