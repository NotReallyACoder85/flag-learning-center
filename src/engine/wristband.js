// Wristband cards: 6 plays on a 4.25" x 2" card. Pure logic, no DOM. Cards are saved on the device only.
import { parseCall, callText } from './parseCall.js';
import { sanitizePlay } from './saved.js';
import { findEntry, playFromEntry } from './playbook.js';

export const SLOTS = 6;
export const MAX_BANDS = 20;
export const CARD_IN = { w: 4.25, h: 2 };

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const newId = () => 'wb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function emptyBand(name = 'Wristband 1') {
  return { id: newId(), name, title: '', color: false, slots: Array(SLOTS).fill(null) };
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

export function sanitizeBand(b) {
  if (!b || typeof b !== 'object') return null;
  const slots = (Array.isArray(b.slots) ? b.slots.slice(0, SLOTS) : []).map(sanitizeSlot);
  while (slots.length < SLOTS) slots.push(null);
  return { id: text(b.id, 40) || newId(), name: text(b.name, 30) || 'Wristband', title: text(b.title, 40), color: !!b.color, slots };
}

/** The saved set of cards: { bands, active }. Always has at least one card, and ids are unique. */
export function sanitizeBands(raw) {
  const seen = new Set();
  const bands = (raw && Array.isArray(raw.bands) ? raw.bands : [])
    .slice(0, MAX_BANDS)
    .map(sanitizeBand)
    .filter((b) => b && !seen.has(b.id) && seen.add(b.id));
  if (!bands.length) bands.push(emptyBand());
  return { bands, active: bands.some((b) => b.id === (raw && raw.active)) ? raw.active : bands[0].id };
}

const withSlots = (band, slots) => ({ ...band, slots });

export function setSlot(band, i, slot) {
  const slots = band.slots.slice();
  slots[i] = slot;
  return withSlots(band, slots);
}
export const clearSlot = (band, i) => setSlot(band, i, null);

export function swapSlots(band, i, j) {
  const slots = band.slots.slice();
  [slots[i], slots[j]] = [slots[j], slots[i]];
  return withSlots(band, slots);
}

export const firstEmpty = (band) => band.slots.findIndex((s) => s == null);
export const filledCount = (band) => band.slots.filter(Boolean).length;

/** What a slot needs to be drawn: { name, form, digits, motion }. */
export function slotPlay(slot) {
  if (slot.pb) {
    const e = findEntry(slot.pb), p = playFromEntry(e);
    return { name: e.name, form: p.form, digits: p.digits, motion: p.motion };
  }
  if (slot.code) return { name: slot.name, ...parseCall(slot.code) };
  return { name: slot.name, form: slot.play.form, digits: slot.play.routes, motion: slot.play.motion };
}

/** How many cards fit on a letter sheet, with 0.25" margins. Portrait: 1 across, 5 down. Landscape: 2 across, 4 down. */
export const cardsPerSheet = (landscape) => (landscape ? 8 : 5);
