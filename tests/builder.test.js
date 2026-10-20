import { describe, it, expect } from 'vitest';
import { buildScene, parseCall, callText, checkCall, erasedPlay, setRoute, setMotionWho, setMotionTag, LET } from '../src/engine/index.js';
import { sanitize, MAX_NAME } from '../src/ui/storage.js';
import { FORM_KEYS, DEFS, MOTIONS } from './helpers.js';

describe('edit helpers', () => {
  it('setRoute changes one receiver and leaves the original alone', () => {
    const d = [2, 1, 1, 2, 9];
    expect(setRoute(d, 2, 7)).toEqual([2, 1, 7, 2, 9]);
    expect(d).toEqual([2, 1, 1, 2, 9]);
  });
  it('setMotionWho picks a mover, defaults to Cross, keeps the tag, clears on None', () => {
    expect(setMotionWho(null, 'Y')).toEqual({ who: 'Y', tag: 'cross' });
    expect(setMotionWho({ who: 'Y', tag: 'exit' }, 'B')).toEqual({ who: 'B', tag: 'exit' });
    expect(setMotionWho({ who: 'Y', tag: 'exit' }, 'None')).toBeNull();
  });
  it('setMotionTag only works with a mover and a valid tag', () => {
    expect(setMotionTag({ who: 'Y', tag: 'cross' }, 'enter')).toEqual({ who: 'Y', tag: 'enter' });
    expect(setMotionTag(null, 'enter')).toBeNull();
    expect(setMotionTag({ who: 'Y', tag: 'cross' }, 'spin')).toEqual({ who: 'Y', tag: 'cross' });
  });
  it('erasedPlay is all fades, no motion', () => {
    expect(erasedPlay()).toEqual({ digits: [9, 9, 9, 9, 9], motion: null });
  });
});

describe('tapping and typing give the same play', () => {
  const sample = (scene) => [0, 0.3, 0.6, 1].map((f) => scene.stateAt(scene.end * f));
  it('every formation x motion x defense: build by taps, then type its call', () => {
    FORM_KEYS.forEach((form) =>
      MOTIONS.forEach((motion) =>
        DEFS.forEach((def) => {
          // build by taps
          let digits = erasedPlay().digits;
          [2, 1, 1, 2, 9].forEach((n, i) => (digits = setRoute(digits, i, n)));
          const tapped = { form, digits, motion, def, slow: false };
          // type the call text the builder would show
          const typed = { ...checkCall(callText(tapped)).play, def, slow: false };
          expect(typed).toEqual(tapped);
          expect(sample(buildScene(typed))).toEqual(sample(buildScene(tapped)));
        })
      )
    );
  });
  it('callText -> parseCall round-trips for any route set', () => {
    for (let n = 0; n < 10; n++) {
      const p = { form: 'trips', digits: LET.map((_, i) => (n + i) % 10), motion: { who: 'A', tag: 'enter' } };
      expect(parseCall(callText(p))).toEqual(p);
    }
  });
});

describe('saved plays (sanitize)', () => {
  it('keeps good entries and canonicalizes the call text', () => {
    expect(sanitize([{ code: 'dubs 21129 y cross', name: 'Mine' }])).toEqual([{ code: 'Dubs 21129 Y Cross', name: 'Mine' }]);
  });
  it('drops junk without throwing', () => {
    const junk = [null, 5, 'x', {}, { code: 'nope', name: 'x' }, { code: 'Dubs 21129', name: 7 }, { name: 'x' }];
    expect(sanitize(junk)).toEqual([]);
    expect(sanitize(null)).toEqual([]);
    expect(sanitize({ a: 1 })).toEqual([]);
  });
  it('trims names, caps length, and falls back to a default', () => {
    expect(sanitize([{ code: 'Dubs 21129', name: 'x'.repeat(100) }])[0].name).toHaveLength(MAX_NAME);
    expect(sanitize([{ code: 'Dubs 21129', name: '   ' }])[0].name).toBe('My play');
  });
});
