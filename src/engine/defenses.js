import { LOS, PX, LET } from './constants.js';
import { clamp, lerp } from './math.js';
import { sides } from './motion.js';
import { routeFor } from './routes.js';
import { settings } from '../data/index.js';

// cls: deep / flat / hook (drives color). zone: [x, y, w, h] landmark rectangle.
export const mkDef = (id, label, cls, x, y, zone, zn, match) => ({ id, label, cls, x, y, zone, zn, match });

/**
 * How far zones slide toward the strong side (px, negative = left). 0 for balanced sets.
 * Strong side = the side with more receivers after motion. Tune in settings.json ("overload").
 */
export function overloadShift(P) {
  const { L, R } = sides(P);
  const imb = L.length - R.length;
  if (!imb) return 0;
  const { pxPerReceiver, maxPx } = settings.overload;
  return -Math.sign(imb) * Math.min(Math.abs(imb) * pxPerReceiver, maxPx);
}

export function align3(P) {
  const { L, R } = sides(P);
  const s = overloadShift(P);
  const b1 = 122 + s, b2 = 238 + s; // boundaries between the three thirds
  const third = (y, h) => [[8, y, b1 - 2 - 8, h], [b1 + 2, y, b2 - b1 - 4, h], [b2 + 2, y, 352 - (b2 + 2), h]];
  const deep = third(56, 132), under = third(192, 84);
  const cb = (arr, left) => (arr.length ? clamp(P[arr[0]][0] + (left ? 10 : -10), left ? 24 : 240, left ? 120 : 336) : left ? 100 : 260);
  const lb = (arr, left) =>
    arr.length >= 2 ? clamp(P[arr[1]][0] + (left ? 12 : -12), left ? 60 : 222, left ? 138 : 300) : arr.length === 1 ? (left ? 105 : 255) : left ? 130 : 230;
  return [
    mkDef('LCB', 'CB', 'deep', cb(L, true), LOS - 84, deep[0], 'Deep left'),
    mkDef('S', 'S', 'deep', 180 + s, LOS - 132, deep[1], 'Deep middle'),
    mkDef('RCB', 'CB', 'deep', cb(R, false), LOS - 84, deep[2], 'Deep right'),
    mkDef('LLB', 'LB', 'flat', lb(L, true), LOS - 60, under[0], 'Flat'),
    mkDef('M', 'M', 'hook', 180 + s, LOS - 60, under[1], 'Middle'),
    mkDef('RLB', 'LB', 'flat', lb(R, false), LOS - 60, under[2], 'Flat'),
  ];
}

export function align2(P) {
  const { L, R } = sides(P);
  const s = overloadShift(P);
  const out = [];
  [['L', L, 1, true], ['R', R, -1, false]].forEach(([sd, arr, inD, left]) => {
    const r1 = arr[0], r2 = arr[1];
    const cx = r1 ? clamp(P[r1][0] + inD * 24, left ? 24 : 240, left ? 120 : 336) : left ? 54 : 306;
    const lx = r2 ? clamp(P[r2][0] + inD * 36, left ? 100 : 210, left ? 150 : 260) : (left ? 141 : 219) + s;
    const sx = r2 ? clamp(P[r2][0] + inD * 12, left ? 85 : 225, left ? 135 : 275) : (left ? 117 : 243) + s;
    // halves split at 180 + s; hooks sit beside the split, flats outside them
    const flat = left ? [8, 192, 92 + s, 84] : [260 + s, 192, 92 - s, 84];
    const hook = left ? [104 + s, 192, 72, 84] : [184 + s, 192, 72, 84];
    const half = left ? [8, 56, 168 + s, 132] : [184 + s, 56, 168 - s, 132];
    out.push(mkDef(sd + 'CB', 'CB', 'flat', cx, LOS - 60, flat, 'Flat'));
    out.push(mkDef(sd + 'LB', 'LB', 'hook', lx, LOS - 36, hook, 'Hook'));
    out.push(mkDef(sd + 'S', 'S', 'deep', sx, LOS - 120, half, 'Deep half'));
  });
  return out;
}

const inRect = (p, z) => p[0] >= z[0] && p[0] <= z[0] + z[2] && p[1] >= z[1] && p[1] <= z[1] + z[3];

/** Zone defenders drop to their landmark, or shade toward a receiver who ends up in their zone. E = route end points. */
export function zoneTargets(defs, E) {
  const t = {};
  defs.forEach((d) => {
    const z = d.zone;
    const cx = z[0] + z[2] / 2;
    const deep = z[1] < 100;
    const base = [cx, deep ? LOS - 15 * PX : LOS - 6 * PX];
    const c = LET.filter((l) => inRect(E[l], z));
    if (!c.length) { t[d.id] = base; return; }
    const r = E[c.reduce((a, b) => (Math.hypot(E[a][0] - base[0], E[a][1] - base[1]) < Math.hypot(E[b][0] - base[0], E[b][1] - base[1]) ? a : b))];
    t[d.id] = deep ? [lerp(cx, r[0], 0.65), clamp(r[1] - 14, 50, 190)] : [lerp(cx, r[0], 0.6), clamp(r[1] + 8, 196, 284)];
  });
  return t;
}

/** Cover 2: corners, linebackers and safeties read the #2 receiver (out / in / vertical). */
export function targets2(P, E, digits, defs) {
  const { L, R } = sides(P);
  const t = {};
  const kind = (l) => routeFor(digits[LET.indexOf(l)]).kind;
  const def = zoneTargets(defs, E);
  [['L', L, 1], ['R', R, -1]].forEach(([sd, arr, inD]) => {
    const r1 = arr[0], r2 = arr[1];
    if (!r2) return;
    const e1 = r1 && E[r1], e2 = E[r2], out = -inD, k = kind(r2);
    const cb = sd + 'CB', lb = sd + 'LB', s = sd + 'S';
    const lbA = defs.find((d) => d.id === lb);
    if (k === 'out') {
      t[cb] = [e2[0] + out * 8, clamp(e2[1] + 6, 190, 290)];
      if (e1) t[s] = [e1[0] + inD * 6, e1[1] - 20];
      t[lb] = [lbA.x + out * 10, LOS - 96];
    } else if (k === 'in') {
      if (e1) { t[cb] = [e1[0], e1[1] - 24]; t[s] = [e1[0] + inD * 8, e1[1] - 10]; }
      t[lb] = [e2[0] + inD * 4, e2[1] + 8];
    } else {
      if (e1) t[cb] = [e1[0], e1[1] - 24];
      t[s] = [e2[0], e2[1] - 22];
      t[lb] = [lbA.x, LOS - 120];
    }
  });
  Object.keys(t).forEach((k) => {
    t[k] = [clamp(t[k][0], 10, 350), clamp(t[k][1], 48, 288)];
    def[k] = t[k];
  });
  return def;
}
