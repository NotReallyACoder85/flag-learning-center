// Rank and XP, saved on this device only. Works even if storage is blocked.
import { rankFor, answerXp } from '../engine/index.js';

const KEY = 'flc_progress';
let data = { xp: 0, streak: 0, best: 0 };
try {
  const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
  data = { xp: Math.max(0, Math.floor(+raw.xp) || 0), streak: 0, best: Math.max(0, Math.floor(+raw.best) || 0) };
} catch (e) { /* keep defaults */ }

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage blocked: progress lasts until the page closes */ }
}

export const getProgress = () => ({ ...data });

/** Apply a change and report the new rank if it went up. */
function change(fn) {
  const before = rankFor(data.xp).rank.name;
  fn();
  save();
  const after = rankFor(data.xp).rank;
  return after.name !== before ? after : null;
}

export function recordAnswer(correct) {
  let gain = 0;
  const rankUp = change(() => {
    if (correct) { data.streak++; data.best = Math.max(data.best, data.streak); gain = answerXp(data.streak); data.xp += gain; }
    else data.streak = 0;
  });
  return { gain, streak: data.streak, rankUp };
}

export function addXp(n) {
  const rankUp = change(() => { data.xp += n; });
  return { gain: n, rankUp };
}

export function resetProgress() {
  data = { xp: 0, streak: 0, best: 0 };
  save();
}
