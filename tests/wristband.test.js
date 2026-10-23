import { describe, it, expect } from 'vitest';
import {
  SLOTS, INSERTS, emptyBand, sanitizeSlot, sanitizeBand, sanitizeBands, flatPositions, flatCount, flatOf, getFlat, setFlat, clearFlat, swapFlat, moveFlat,
  firstEmptyFlat, filledCount, setCardType, setCardTitle, slotPlay, printableCards, cardsPerSheet, CARD_IN,
  playbookEntries, fromTemplate, nudgeStem, buildScene,
} from '../src/engine/index.js';
import { callbook } from '../src/data/index.js';
import { wristDiagram } from '../src/ui/diagrams.js';

const pb = (i) => ({ pb: playbookEntries[i].id });
const code = { name: 'Quick slants', code: 'dubs 21129' };
const custom = () => ({ name: 'Mine', play: { form: 'dubs', motion: null, routes: [nudgeStem(fromTemplate('post-corner'), 2), 2, 3, 9, 4] } });

describe('the arm band', () => {
  it('holds 3 inserts of 4.25 x 2 inches, 6 plays each: 18 plays in all', () => {
    expect(CARD_IN).toEqual({ w: 4.25, h: 2 });
    expect(SLOTS).toBe(6);
    expect(INSERTS).toBe(3);
    const b = emptyBand();
    expect(b.cards).toHaveLength(3);
    expect(flatCount(b)).toBe(18);
  });
  it('a letter sheet holds 5 inserts upright and 8 on its side', () => {
    expect(cardsPerSheet(false)).toBe(5);
    expect(cardsPerSheet(true)).toBe(8);
    expect(Math.floor(10.5 / CARD_IN.h) * Math.floor(8 / CARD_IN.w)).toBe(5);
    expect(Math.floor(8 / CARD_IN.h) * Math.floor(10.5 / CARD_IN.w)).toBe(8);
  });
  it('plays are numbered 1 to 18 across the inserts', () => {
    const b = emptyBand();
    expect(flatPositions(b)[0]).toEqual({ card: 0, slot: 0 });
    expect(flatPositions(b)[6]).toEqual({ card: 1, slot: 0 });
    expect(flatPositions(b)[17]).toEqual({ card: 2, slot: 5 });
    expect(flatOf(b, 2, 3)).toBe(15);
  });
});

describe('the route tree insert', () => {
  it('an insert can be the route tree, and the plays are then numbered across the other two', () => {
    const b = setCardType(emptyBand(), 1, 'tree');
    expect(flatCount(b)).toBe(12);
    expect(flatPositions(b)[6]).toEqual({ card: 2, slot: 0 }); // play 7 is the first slot of insert 3
    expect(flatOf(b, 1, 0)).toBe(-1);
  });
  it('switching an insert to the route tree and back keeps its plays', () => {
    let b = setFlat(emptyBand(), 7, pb(2));
    b = setCardType(b, 1, 'tree');
    expect(filledCount(b)).toBe(0);
    b = setCardType(b, 1, 'plays');
    expect(getFlat(b, 7)).toEqual(pb(2));
  });
  it('printing skips a play insert with nothing on it, but always prints the route tree', () => {
    let b = emptyBand();
    expect(printableCards(b)).toHaveLength(0);
    b = setFlat(b, 0, pb(0));
    expect(printableCards(b).map((x) => x.ci)).toEqual([0]);
    b = setCardType(b, 2, 'tree');
    expect(printableCards(b).map((x) => x.ci)).toEqual([0, 2]);
  });
});

describe('the 4 plays + route tree insert', () => {
  it('holds 4 plays, so the set has 16 numbered plays and the next insert starts at 5', () => {
    const b = setCardType(emptyBand(), 1, 'mix');
    expect(flatCount(b)).toBe(16);
    expect(flatPositions(b)[6 + 3]).toEqual({ card: 1, slot: 3 });
    expect(flatPositions(b)[6 + 4]).toEqual({ card: 2, slot: 0 });
    expect(flatOf(b, 1, 4)).toBe(-1);
  });
  it('always prints, and survives a save and load', () => {
    const b = setCardType(emptyBand(), 0, 'mix');
    expect(printableCards(b).map((x) => x.ci)).toEqual([0]);
    expect(sanitizeBand(JSON.parse(JSON.stringify(b))).cards[0].type).toBe('mix');
  });
});

describe('editing plays', () => {
  it('sets, clears and swaps without changing the original', () => {
    const b = emptyBand();
    const a = setFlat(b, 2, pb(0));
    expect(getFlat(b, 2)).toBeNull();
    expect(getFlat(a, 2)).toEqual(pb(0));
    const s = swapFlat(setFlat(a, 5, pb(1)), 2, 5);
    expect(getFlat(s, 2)).toEqual(pb(1));
    expect(getFlat(s, 5)).toEqual(pb(0));
    expect(getFlat(clearFlat(s, 2), 2)).toBeNull();
  });
  it('moving a play earlier or later swaps it with its neighbor', () => {
    let b = setFlat(setFlat(setFlat(emptyBand(), 0, pb(0)), 1, pb(1)), 2, pb(2));
    b = moveFlat(b, 2, -1);
    expect([0, 1, 2].map((f) => getFlat(b, f))).toEqual([pb(0), pb(2), pb(1)]);
    b = moveFlat(b, 0, 1);
    expect([0, 1, 2].map((f) => getFlat(b, f))).toEqual([pb(2), pb(0), pb(1)]);
  });
  it('a play can move across inserts: later from slot 6 of insert 1 lands in insert 2', () => {
    let b = setFlat(emptyBand(), 5, pb(4));
    b = moveFlat(b, 5, 1);
    expect(getFlat(b, 5)).toBeNull();
    expect(getFlat(b, 6)).toEqual(pb(4));
    expect(b.cards[1].slots[0]).toEqual(pb(4));
  });
  it('moving past either end does nothing', () => {
    const b = setFlat(emptyBand(), 0, pb(0));
    expect(moveFlat(b, 0, -1)).toBe(b);
    const e = setFlat(emptyBand(), 17, pb(0));
    expect(moveFlat(e, 17, 1)).toBe(e);
  });
  it('moving a play into an empty neighbor shifts its position', () => {
    const b = moveFlat(setFlat(emptyBand(), 3, pb(7)), 3, 1);
    expect(getFlat(b, 3)).toBeNull();
    expect(getFlat(b, 4)).toEqual(pb(7));
  });
  it('finds the first empty position and counts what is filled', () => {
    let b = emptyBand();
    expect(firstEmptyFlat(b)).toBe(0);
    b = setFlat(setFlat(b, 0, pb(0)), 1, pb(1));
    expect(firstEmptyFlat(b)).toBe(2);
    expect(filledCount(b)).toBe(2);
    for (let f = 0; f < 18; f++) b = setFlat(b, f, pb(f % 28));
    expect(firstEmptyFlat(b)).toBe(-1);
    expect(filledCount(b)).toBe(18);
  });
  it('titles belong to an insert', () => {
    const b = setCardTitle(emptyBand(), 1, '  Red zone  ');
    expect(b.cards[1].title).toBe('Red zone');
    expect(b.cards[0].title).toBe('');
  });
});

describe('saved sets are checked on load', () => {
  it('keeps playbook, call and custom-route slots and drops the rest', () => {
    expect(sanitizeSlot(pb(5))).toEqual(pb(5));
    expect(sanitizeSlot(code)).toEqual({ name: 'Quick slants', code: 'Dubs 21129' });
    expect(sanitizeSlot(custom())).toMatchObject({ name: 'Mine', play: { form: 'dubs' } });
    [null, 5, 'x', {}, { pb: 'gone' }, { name: 'x', code: 'nope' }, { name: 'x', play: { form: 'zzz' } }].forEach((v) => expect(sanitizeSlot(v)).toBeNull());
  });
  it('always has 3 inserts of 6 slots, and cleans names, titles and types', () => {
    const b = sanitizeBand({ id: 'a', name: '  X'.repeat(30), color: 1, names: 1, pics: false,
      cards: [{ type: 'plays', title: 'T'.repeat(80), slots: [pb(0), 7, null, pb(1), pb(2), pb(3), pb(4)] }, { type: 'weird' }, { type: 'tree' }, { type: 'plays' }] });
    expect(b.cards).toHaveLength(3);
    b.cards.forEach((c) => expect(c.slots).toHaveLength(6));
    expect(b.cards.map((c) => c.type)).toEqual(['plays', 'plays', 'tree']);
    expect(b.cards[0].title.length).toBeLessThanOrEqual(40);
    expect(b.cards[0].slots[1]).toBeNull();
    expect(b.name.length).toBeLessThanOrEqual(30);
    expect([b.color, b.names, b.pics]).toEqual([true, true, false]);
    expect(sanitizeBand(null)).toBeNull();
    expect(sanitizeBand({}).cards).toHaveLength(3);
  });
  it('turns an older single card into insert 1 of a new set', () => {
    const old = { id: 'old', name: 'Game 3', title: 'Eagles', color: true, slots: [pb(0), null, pb(2), null, null, pb(5)] };
    const b = sanitizeBand(JSON.parse(JSON.stringify(old)));
    expect(b.cards).toHaveLength(3);
    expect(b.cards[0]).toMatchObject({ type: 'plays', title: 'Eagles' });
    expect(b.cards[0].slots).toEqual(old.slots);
    expect(b.cards[1].slots.every((s) => s === null)).toBe(true);
    expect(b.color).toBe(true);
    expect(b.pics).toBe(true);
    expect(b.names).toBe(false);
    expect(getFlat(b, 5)).toEqual(pb(5));
  });
  it('a saved list keeps its sets and active set, and never ends up empty', () => {
    const raw = { active: 'b', bands: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B', slots: [pb(0)] }] };
    const s = sanitizeBands(JSON.parse(JSON.stringify(raw)));
    expect(s.bands.map((b) => b.id)).toEqual(['a', 'b']);
    expect(s.active).toBe('b');
    ['nope', null, 5, {}, { bands: 'x' }, { bands: [null, 3] }].forEach((v) => {
      const r = sanitizeBands(v);
      expect(r.bands.length).toBeGreaterThanOrEqual(1);
      expect(r.bands.some((b) => b.id === r.active)).toBe(true);
    });
  });
  it('drops duplicate ids and an unknown active set', () => {
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
      expect((svg.match(/class="wd-l"/g) || []).length).toBe(5);
    }));
  });
  it('black and white uses no color, and color mode uses the receiver colors', () => {
    const p = slotPlay({ pb: playbookEntries[0].id });
    expect(wristDiagram(p, false)).not.toMatch(/#F59A3C|#4C8DFF|#27D3B2|#C060F2/i);
    expect(wristDiagram(p, true)).toMatch(/#F59A3C/i);
  });
});
