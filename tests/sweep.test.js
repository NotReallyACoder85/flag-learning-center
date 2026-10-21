// Every formation x defense x motion x route set builds, animates and evaluates without error.
import { describe, it, expect } from 'vitest';
import { buildScene, LET } from '../src/engine/index.js';
import { ALL_FORM_KEYS, DEFS, MOTIONS, libraryPlays } from './helpers.js';

const finite = (p) => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]);

function check(play, label) {
  const s = buildScene(play);
  expect(s.end, label).toBeGreaterThan(0);
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const st = s.stateAt((s.end * i) / steps);
    LET.forEach((l) => expect(finite(st.off[l]), `${label} off ${l} @${i}`).toBe(true));
    s.defs.forEach((d) => expect(finite(st.def[d.id]), `${label} def ${d.id} @${i}`).toBe(true));
  }
  if (play.def === 'none') expect(s.result, label).toBeNull();
  else {
    expect(s.result, label).toBeTruthy();
    expect(Number.isFinite(s.result.sep), label).toBe(true);
    expect(typeof s.result.why, label).toBe('string');
  }
}

describe('sweep: every formation x defense x motion', () => {
  const routeSets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => Array(5).fill(n));
  routeSets.push([2, 1, 1, 2, 9], [0, 7, 2, 9, 4], [9, 4, 6, 9, 1]);
  it('builds with no errors and finite positions', () => {
    let n = 0;
    ALL_FORM_KEYS.forEach((form) =>
      DEFS.forEach((def) =>
        MOTIONS.forEach((motion) =>
          routeSets.forEach((digits) => {
            [false, true].forEach((slow) => { check({ form, digits, motion, def, slow }, `${form} ${def} ${JSON.stringify(motion)} ${digits.join('')} slow=${slow}`); n++; });
          })
        )
      )
    );
    expect(n).toBe(ALL_FORM_KEYS.length * DEFS.length * MOTIONS.length * routeSets.length * 2);
  });
});

describe('sweep: every library play against every defense', () => {
  libraryPlays.forEach((p) =>
    DEFS.forEach((def) => it(`${p.call} vs ${def}`, () => check({ ...p, def, slow: false }, `${p.call} ${def}`)))
  );
});
