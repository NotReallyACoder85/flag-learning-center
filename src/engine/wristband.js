// Wristband sets: an arm band holds 3 inserts, each 4.25" x 2". An insert is either a card of 6 plays or the route tree.
// Plays are numbered 1..18 across the set (skipping any insert that is the route tree). Pure logic, no DOM.
import { parseCall, callText } from './parseCall.js';
import { sanitizePlay } from './saved.js';
import { findEntry, playFromEntry } from './playbook.js';

export const SLOTS = 6;     // plays per insert
export const INSERTS = 3;   // inserts per arm band
export const MAX_BANDS = 20;
export const CARD_IN = { w: 4.25, h: 2 };

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const newId = () => 'wb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const emptyCard = (type = 'plays') => ({ type, title: '', slots: Array(SLOTS).fill(null) });

export function emptyBand(name = 'Wristband 1') {
  return { id: newId(), name, color: false, names: false, pics: true, cards: Array.from({ length: INSERTS }, () => emptyCard()) };
}

/**
 * One slot holds: { pb: playbookId } or { name, code } (a call) or { name, play } (a play with custom routes).
 * Anything else, or a playbook id that no longer exists, becomes an empty slot.
 */
export function sanitizeSlot(s) {
  if (!s || typeof s !== 'object') return null;
  if (typeof s.pb === 'string') return findEntry(s.pb) ? { pb: s.pb } : null;
  const name = text(s.name, 30) || 'My play';
  if (typeof s.code === 'string' && parseCall(s.code)) return { name, code: callText(parseCall(s.code)) };
  const play = sanitizePlay(s.play);
  return play ? { name, play } : null;
}

function sanitizeCard(c) {
  const slots = (c && Array.isArray(c.slots) ? c.slots.slice(0, SLOTS) : []).map(sanitizeSlot);
  while (slots.length < SLOTS) slots.push(null);
  return { type: c && c.type === 'tree' ? 'tree' : 'plays', title: text(c && c.title, 40), slots };
}

/** A saved arm band. An older single card ({ slots, title }) becomes insert 1 of a new set. */
export function sanitizeBand(b) {
  if (!b || typeof b !== 'object') return null;
  let cards = b.cards;
  if (!Array.isArray(cards) && Array.isArray(b.slots)) cards = [{ type: 'plays', title: b.title, slots: b.slots }];
  cards = (Array.isArray(cards) ? cards : []).slice(0, INSERTS).map(sanitizeCard);
  while (cards.length < INSERTS) cards.push(emptyCard());
  return { id: text(b.id, 40) || newId(), name: text(b.name, 30) || 'Wristband', color: !!b.color, names: !!b.names, pics: b.pics !== false, cards };
}

/** The saved sets: { bands, active }. Always has at least one set, and ids are unique. */
export function sanitizeBands(raw) {
  const seen = new Set();
  const bands = (raw && Array.isArray(raw.bands) ? raw.bands : [])
    .slice(0, MAX_BANDS)
    .map(sanitizeBand)
    .filter((b) => b && !seen.has(b.id) && seen.add(b.id));
  if (!bands.length) bands.push(emptyBand());
  return { bands, active: bands.some((b) => b.id === (raw && raw.active)) ? raw.active : bands[0].id };
}

/* ---- positions: play number n (1-based) is flat index n-1, counted across the play inserts only ---- */

export function flatPositions(band) {
  const out = [];
  band.cards.forEach((c, card) => { if (c.type === 'plays') c.slots.forEach((_, slot) => out.push({ card, slot })); });
  return out;
}
export const flatCount = (band) => flatPositions(band).length;
export const flatOf = (band, card, slot) => flatPositions(band).findIndex((p) => p.card === card && p.slot === slot);

export function getFlat(band, f) {
  const p = flatPositions(band)[f];
  return p ? band.cards[p.card].slots[p.slot] : null;
}

export function setFlat(band, f, slot) {
  const p = flatPositions(band)[f];
  if (!p) return band;
  const cards = band.cards.map((c, ci) => (ci === p.card ? { ...c, slots: c.slots.map((s, si) => (si === p.slot ? slot : s)) } : c));
  return { ...band, cards };
}
export const clearFlat = (band, f) => setFlat(band, f, null);

export function swapFlat(band, f, g) {
  const a = getFlat(band, f), b = getFlat(band, g);
  return setFlat(setFlat(band, f, b), g, a);
}

/** Move a play one place earlier (-1) or later (+1), across inserts. Swaps with whatever is there (a play or an empty slot). */
export function moveFlat(band, f, dir) {
  const g = f + dir;
  return g < 0 || g >= flatCount(band) ? band : swapFlat(band, f, g);
}

export function firstEmptyFlat(band) {
  for (let f = 0; f < flatCount(band); f++) if (getFlat(band, f) == null) return f;
  return -1;
}
export const filledCount = (band) => flatPositions(band).filter((p) => band.cards[p.card].slots[p.slot]).length;

export function setCardType(band, ci, type) {
  return { ...band, cards: band.cards.map((c, i) => (i === ci ? { ...c, type: type === 'tree' ? 'tree' : 'plays' } : c)) }; // slots are kept, so switching back restores them
}
export function setCardTitle(band, ci, title) {
  return { ...band, cards: band.cards.map((c, i) => (i === ci ? { ...c, title: text(title, 40) } : c)) };
}

/** What a slot needs to be drawn: { name, form, digits, motion }. */
export function slotPlay(slot) {
  if (slot.pb) {
    const e = findEntry(slot.pb), p = playFromEntry(e);
    return { name: e.name, form: p.form, digits: p.digits, motion: p.motion };
  }
  if (slot.code) return { name: slot.name, ...parseCall(slot.code) };
  return { name: slot.name, form: slot.play.form, digits: slot.play.routes, motion: slot.play.motion };
}

/** Inserts that have something to print: the route tree, or a play insert with at least one play. */
export const printableCards = (band) => band.cards.map((c, ci) => ({ c, ci })).filter(({ c }) => c.type === 'tree' || c.slots.some(Boolean));

/** How many inserts fit on a letter sheet, with 0.25" margins. Upright: 1 across, 5 down. Sideways: 2 across, 4 down. */
export const cardsPerSheet = (landscape) => (landscape ? 8 : 5);
