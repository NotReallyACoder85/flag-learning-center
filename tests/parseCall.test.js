import { describe, it, expect } from 'vitest';
import { parseCall, checkCall, callText } from '../src/engine/index.js';
import { callbook } from '../src/data/index.js';

describe('parseCall', () => {
  it('parses formation, digits and no motion', () => {
    expect(parseCall('Dubs 21129')).toEqual({ form: 'dubs', digits: [2, 1, 1, 2, 9], motion: null });
  });
  it('parses motion', () => {
    expect(parseCall('Dubs 21129 Y Cross').motion).toEqual({ who: 'Y', tag: 'cross' });
    expect(parseCall('chiefs 93496 b exit').motion).toEqual({ who: 'B', tag: 'exit' });
  });
  it('is case-insensitive and tolerates spaces and hyphens', () => {
    expect(parseCall('  DUBS   21129  ')).toBeTruthy();
    expect(parseCall('Dubs-Tight 22222').form).toBe('dubstight');
    expect(parseCall('dubstight22222').form).toBe('dubstight');
    expect(parseCall('Dubs Tight 22222').form).toBe('dubstight');
    expect(parseCall('Trips07294')).toBeTruthy();
    expect(parseCall('Dubs 21129 YCross').motion.who).toBe('Y');
    expect(parseCall('trips-07294 b-exit')).toEqual({ form: 'trips', digits: [0, 7, 2, 9, 4], motion: { who: 'B', tag: 'exit' } });
    expect(parseCall('Dubs-Tight-22222').form).toBe('dubstight');
  });
  it('rejects bad input without throwing', () => {
    ['', 'Dubs', 'Dubs 2112', 'Dubs 211299', 'Dubs 2112a', 'Foo 21129', 'Dubs 21129 C Cross', 'Dubs 21129 Y Spin', 'Dubs 21129 Y', null, undefined, 42].forEach((s) =>
      expect(parseCall(s)).toBeNull()
    );
  });
  it('rejects route numbers that are not digits 0-9 only', () => {
    expect(parseCall('Dubs 2-129')).toBeNull();
  });
});

describe('checkCall', () => {
  it('returns the play for a valid call', () => {
    expect(checkCall('Trips 07294').play.form).toBe('trips');
  });
  it.each([
    ['', /Type a call/],
    ['Hello 21129', /Start with a formation/],
    ['Dubs', /five route numbers/],
    ['Dubs abc', /five route numbers/],
    ['Dubs 2112', /exactly five/],
    ['Dubs 211299', /exactly five/],
    ['Dubs 21129 C Cross', /Motion is a letter/],
    ['Dubs 21129 Y', /Motion is a letter/],
  ])('explains "%s"', (input, msg) => {
    const r = checkCall(input);
    expect(r.play).toBeUndefined();
    expect(r.error).toMatch(msg);
    expect(r.error).toMatch(/Dubs 21129 Y Cross/);
  });
  it('never throws on odd input', () => {
    [null, undefined, 5, {}, '\n', '💥'].forEach((v) => expect(() => checkCall(v)).not.toThrow());
  });
});

describe('callText', () => {
  it('round-trips every library play', () => {
    callbook.forEach((p) => expect(callText(parseCall(p.call))).toBe(p.call));
  });
});
