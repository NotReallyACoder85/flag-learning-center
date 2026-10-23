// My Plays live on this device only. Works even when storage is blocked (falls back to this page's memory).
// A play is saved either as a call ({ code, name }) or, when it uses routes beyond the 0-9 tree, as a whole play ({ name, play }).
import { parseCall, callText, sanitizePlay } from '../engine/index.js';

const KEY = 'rams_myplays';
export const MAX_NAME = 30;

/** Keep only well-formed saved plays. Never throws. */
export function sanitize(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  raw.forEach((p) => {
    if (!p || typeof p.name !== 'string') return;
    const name = p.name.trim().slice(0, MAX_NAME) || 'My play';
    if (typeof p.code === 'string' && parseCall(p.code)) out.push({ code: callText(parseCall(p.code)), name });
    else {
      const play = sanitizePlay(p.play);
      if (play) out.push({ name, play });
    }
  });
  return out;
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
