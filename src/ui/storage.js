// My Plays live on this device only. Works even when storage is blocked (falls back to this page's memory).
import { parseCall, callText } from '../engine/index.js';

const KEY = 'rams_myplays';
export const MAX_NAME = 30;

/** Keep only well-formed saved plays. Never throws. */
export function sanitize(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => p && typeof p.code === 'string' && typeof p.name === 'string' && parseCall(p.code))
    .map((p) => ({ code: callText(parseCall(p.code)), name: p.name.trim().slice(0, MAX_NAME) || 'My play' }));
}

export function loadMine() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch (e) {
    return [];
  }
}

/** Returns true if the list was kept on the device, false if storage is blocked. */
export function saveMine(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
}
