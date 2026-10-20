import { settings } from '../data/index.js';

/** Rank for an XP total. Returns { rank, next, toNext, pct } (next is null at the top rank). */
export function rankFor(xp, ranks = settings.ranks) {
  let i = 0;
  ranks.forEach((r, k) => { if (xp >= r.xp) i = k; });
  const rank = ranks[i], next = ranks[i + 1] || null;
  return { rank, next, toNext: next ? next.xp - xp : 0, pct: next ? Math.round(((xp - rank.xp) / (next.xp - rank.xp)) * 100) : 100 };
}

/** XP for a right answer. streak = how many in a row, counting this one. */
export function answerXp(streak, cfg = settings.xp) {
  return cfg.correct + Math.min(Math.max(streak - 1, 0), cfg.streakBonusCap) * cfg.streakBonus;
}

export const starXp = (stars, cfg = settings.xp) => stars * cfg.perStar;

/** Stars for a quiz round: all right = 3, 80%+ = 2, 60%+ = 1. */
export function roundStars(correct, n) {
  if (correct === n) return 3;
  return correct / n >= 0.8 ? 2 : correct / n >= 0.6 ? 1 : 0;
}
