import { describe, it, expect } from 'vitest';
import {
  SLOTS, emptyBand, sanitizeSlot, sanitizeBand, sanitizeBands, setSlot, clearSlot, swapSlots, firstEmpty, filledCount, slotPlay, cardsPerSheet, CARD_IN,
  playbookEntries, fromTemplate, nudgeStem, buildScene,
} from '../src/engine/index.js';
import { callbook } from '../src/data/index.js';
import { wristDiagram } from '../src/ui/diagrams.js';

const pb = (i) => ({ pb: playbookEntries[i].id });
const code = { name: 'Quick slants', code: 'dubs 21129' };
const custom = () => ({ name: 'Mine', play: { form: 'dubs', motion: null, routes: [nudgeStem(fromTemplate('post-corner'), 2), 2, 3, 9, 4] } });

describe('the card', () => {
  it('is 4.25 x 2 inches with 6 slots', () => {
    expect(CARD_IN).toEqual({ w: 4.25, h: 2 });
    expect(SLOTS).toBe(6);
    expect(emptyBand().slots).toHaveLength(6);
  });
  it('a letter sheet holds 5 cards upright and 8 on its side', () => {
    expect(cardsPerSheet(false)).toBe(5);
    expect(cardsPerSheet(true)).toBe(8);
    // 0.25" margins: 8.0 x 10.5 usable upright, 10.5 x 8.0 sideways
    expect(Math.floor(10.5 / CARD_IN.h) * Math.floor(8 / CARD_IN.w)).toBe(5);
    expect(Math.floor(8 / CARD_IN.h) * Math.floor(10.5 / CARD_IN.w)).toBe(8);
  });
});

describe('editing slots', () => {
  it('sets, clears and swaps without changing the original card', () => {
    const b = emptyBand();
    const a = setSlot(b, 2, pb(0));
    expect(b.slots[2]).toBeNull();
    expect(a.slots[2]).toEqual(pb(0));
    const s = swapSlots(setSlot(a, 5, pb(1)), 2, 5);
    expect(s.slots[2]).toEqual(pb(1));
    expect(s.slots[5]).toEqual(pb(0));
    expect(clearSlot(s, 2).slots[2]).toBeNull();
  });
  it('swapping with an empty slot moves the play', () => {
    const a = swapSlots(setSlot(emptyBand(), 0, pb(3)), 0, 4);
    expect(a.slots[0]).toBeNull();
    expect(a.slots[4]).toEqual(pb(3));
  });
  it('finds the first empty slot and counts the filled ones', () => {
    let b = emptyBand();
    expect(firstEmpty(b)).toBe(0);
    b = setSlot(setSlot(b, 0, pb(0)), 1, pb(1));
    expect(firstEmpty(b)).toBe(2);
    expect(filledCount(b)).toBe(2);
    for (let i = 2; i < 6; i++) b = setSlot(b, i, pb(i));
    expect(firstEmpty(b)).toBe(-1);
  });
});

describe('saved cards are checked on load', () => {
  it('keeps playbook, call and custom-route slots and drops the rest', () => {
    expect(sanitizeSlot(pb(5))).toEqual(pb(5));
    expect(sanitizeSlot(code)).toEqual({ name: 'Quick slants', code: 'Dubs 21129' });
    expect(sanitizeSlot(custom())).toMatchObject({ name: 'Mine', play: { form: 'dubs' } });
    [null, 5, 'x', {}, { pb: 'gone' }, { name: 'x', code: 'nope' }, { name: 'x', play: { form: 'zzz' } }].forEach((v) => expect(sanitizeSlot(v)).toBeNull());
  });
  it('always has 6 slots, trims names, and survives junk', () => {
    const b = sanitizeBand({ id: 'a', name: '  X'.repeat(30), title: 'T'.repeat(80), color: 1, slots: [pb(0), 7, null, pb(1), pb(2), pb(3), pb(4), pb(5)] });
    expect(b.slots).toHaveLength(6);
    expect(b.slots[1]).toBeNull();
    expect(b.name.length).toBeLessThanOrEqual(30);
    expect(b.title.length).toBeLessThanOrEqual(40);
    expect(b.color).toBe(true);
    expect(sanitizeBand(null)).toBeNull();
    expect(sanitizeBand({}).slots).toHaveLength(6);
  });
  it('a saved set keeps its cards and active card, and never ends up empty', () => {
    const raw = { active: 'b', bands: [{ id: 'a', name: 'A', slots: [] }, { id: 'b', name: 'B', slots: [pb(0)] }] };
    const s = sanitizeBands(JSON.parse(JSON.stringify(raw)));
    expect(s.bands.map((b) => b.id)).toEqual(['a', 'b']);
    expect(s.active).toBe('b');
    ['nope', null, 5, {}, { bands: 'x' }, { bands: [null, 3] }].forEach((v) => {
      const r = sanitizeBands(v);
      expect(r.bands.length).toBeGreaterThanOrEqual(1);
      expect(r.bands.some((b) => b.id === r.active)).toBe(true);
    });
  });
  it('drops duplicate card ids and an unknown active card', () => {
    const s = sanitizeBands({ active: 'zzz', bands: [{ id: 'a', name: 'A' }, { id: 'a', name: 'dup' }] });
    expect(s.bands).toHaveLength(1);
    expect(s.active).toBe('a');
  });
});

describe('drawing a slot', () => {
  it('every playbook play, call and custom play gives something the engine can run', () => {
    const slots = [...playbookEntries.map((e) => ({ pb: e.id })), ...callbook.map((c) => ({ name: c.name, code: c.call })), custom()];
    slots.forEach((slot) => {
      const p = slotPlay(sanitizeSlot(slot));
      expect(p.name.length).toBeGreaterThan(0);
      const s = buildScene({ form: p.form, digits: p.digits, motion: p.motion, def: 'none', slow: false });
      expect(s.end).toBeGreaterThan(0);
    });
  });
});

describe('wristband diagram', () => {
  it('draws every playbook play and every call, in black and white and in color', () => {
    const plays = [...playbookEntries.map((e) => slotPlay({ pb: e.id })), ...callbook.map((c) => slotPlay({ name: c.name, code: c.call }))];
    plays.forEach((p) => [false, true].forEach((color) => {
      const svg = wristDiagram(p, color);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).not.toMatch(/NaN|undefined/);
      expect((svg.match(/class="wd-l"/g) || []).length).toBe(5); // A B Y Z C
    }));
  });
  it('black and white uses no color, and color mode uses the receiver colors', () => {
    const p = slotPlay({ pb: playbookEntries[0].id });
    expect(wristDiagram(p, false)).not.toMatch(/#F59A3C|#4C8DFF|#27D3B2|#C060F2/i);
    expect(wristDiagram(p, true)).toMatch(/#F59A3C/i);
  });
});
