import { LOS, PX, SKILL } from './constants.js';
import { clamp } from './math.js';

/** Receivers on each side of the center, ordered outside-in. Center is on neither side. */
export function sides(P) {
  const L = [], R = [];
  SKILL.forEach((l) => (P[l][0] < 180 ? L : R).push(l));
  L.sort((a, b) => P[a][0] - P[b][0]);
  R.sort((a, b) => P[b][0] - P[a][0]);
  return { L, R };
}

/** Where a motion player ends up. pre = pre-snap positions keyed by letter. */
export function motionDest(pre, who, tag) {
  const x = pre[who][0];
  const left = x < 180;
  const others = SKILL.filter((l) => l !== who);
  const far = others.filter((l) => (pre[l][0] < 180) !== left);
  const same = others.filter((l) => (pre[l][0] < 180) === left);
  if (tag === 'cross') {
    let dx;
    if (far.length) {
      const inner = far.reduce((a, b) => (Math.abs(pre[a][0] - 180) < Math.abs(pre[b][0] - 180) ? a : b));
      dx = pre[inner][0] + (left ? -34 : 34);
    } else dx = left ? 220 : 140;
    dx = left ? clamp(dx, 210, 340) : clamp(dx, 20, 150);
    return [dx, LOS + PX];
  }
  if (tag === 'enter') return [left ? Math.max(x, 148) : Math.min(x, 212), LOS + PX];
  const xs = same.map((l) => pre[l][0]);
  let dx = left ? 22 : 338;
  if (xs.length) {
    const o = left ? Math.min(...xs) : Math.max(...xs);
    if (left ? o < x : o > x) dx = o + (left ? -26 : 26);
  }
  return [clamp(dx, 22, 338), LOS];
}
