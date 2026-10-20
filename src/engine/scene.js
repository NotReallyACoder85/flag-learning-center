import { formations } from '../data/index.js';
import { LOS, PX, LET, SKILL, MOTION_TIME, ROUTE_TIME, ROUTE_TIME_SLOW } from './constants.js';
import { clamp, lerp, lerp2, ease, polyAt } from './math.js';
import { routeFor } from './routes.js';
import { motionDest } from './motion.js';
import { mkDef, align3, align2, zoneTargets, targets2 } from './defenses.js';
import { evaluate } from './evaluate.js';

const MAN_CUSHION = 42; // px, closes to 10 px

/**
 * Build everything the UI needs to draw a play.
 * play: { form, digits, motion, def ('none'|'c3'|'c2'|'man'), slow }
 * Returns positions over time via stateAt(t) -> { off, def }, plus route paths and the result.
 */
export function buildScene(play) {
  const f = formations[play.form];
  const pre = {};
  LET.forEach((l) => (pre[l] = [f.pos[l][0], LOS + f.pos[l][1] * PX]));
  const post = {};
  LET.forEach((l) => (post[l] = pre[l].slice()));
  const mover = play.motion ? play.motion.who : null;
  if (mover) post[mover] = motionDest(pre, mover, play.motion.tag);

  // The center breaks toward the strong side (right on ties).
  const lc = SKILL.filter((l) => post[l][0] < 178).length;
  const rc = SKILL.filter((l) => post[l][0] > 182).length;
  const cIn = lc > rc ? -1 : 1;

  const path = {}, E = {};
  LET.forEach((l, i) => {
    const [x0, y0] = post[l];
    const inD = l === 'C' ? cIn : x0 < 180 ? 1 : -1;
    const pts = [[x0, y0]].concat(routeFor(play.digits[i]).points.map(([lat, d]) => [clamp(x0 - inD * lat * PX, 10, 350), LOS - d * PX]));
    path[l] = pts;
    E[l] = pts[pts.length - 1];
  });

  const tm = mover ? MOTION_TIME : 0;
  const ts = tm + (mover ? 0.4 : 0.5);
  const routeDur = play.slow ? ROUTE_TIME_SLOW : ROUTE_TIME;
  const end = ts + routeDur + 0.7;

  const offPos = (l, t) => {
    if (t < tm && l === mover) return lerp2(pre[l], post[l], ease(t / tm));
    if (t < ts) return post[l];
    return polyAt(path[l], (t - ts) / routeDur);
  };

  const sc = { pre, post, path, E, tm, ts, routeDur, end, mover, offPos, defs: [], stateAt: null, cov: play.def };
  const offOnly = (t) => {
    const off = {};
    LET.forEach((l) => (off[l] = offPos(l, t)));
    return off;
  };

  if (play.def === 'c3' || play.def === 'c2') {
    const mk = play.def === 'c3' ? align3 : align2;
    const A0 = mk(pre), A1 = mk(post);
    const T = play.def === 'c3' ? zoneTargets(A1, E) : targets2(post, E, play.digits, A1);
    sc.defs = A1.map((d, i) => ({ ...d, a0: [A0[i].x, A0[i].y], a1: [d.x, d.y], tg: T[d.id] }));
    sc.stateAt = (t) => {
      const off = offOnly(t), def = {};
      const u = (t - ts) / routeDur;
      sc.defs.forEach((d) => {
        if (t < ts) {
          const k = mover ? ease(clamp((t - 0.25) / (tm - 0.15), 0, 1)) : 1;
          def[d.id] = lerp2(d.a0, d.a1, k);
        } else def[d.id] = lerp2(d.a1, d.tg, ease(clamp((u - 0.05) / 0.9, 0, 1)));
      });
      return { off, def };
    };
  } else if (play.def === 'man') {
    const manPos = (l, t) => {
      const u = clamp((t - ts) / routeDur, 0, 1);
      const rp = t < ts ? offPos(l, t) : polyAt(path[l], clamp(u - 0.12, 0, 1));
      const shade = l === 'C' ? 0 : clamp((180 - rp[0]) / 30, -1, 1) * 6;
      const cush = 10 + (MAN_CUSHION - 10) * (1 - ease(clamp(u * 1.5, 0, 1)));
      return [rp[0] + shade, rp[1] - cush];
    };
    const deep = LET.reduce((a, b) => (E[a][1] < E[b][1] ? a : b));
    const sA = [180, LOS - 132];
    const sT = [lerp(180, E[deep][0], 0.35), Math.min(E[deep][1] - 20, 150)];
    sc.defs = LET.map((l) => mkDef('D' + l, l, 'flat', 0, 0, null, '', l)).concat([mkDef('S', 'S', 'deep', 180, LOS - 132, null, '')]);
    sc.stateAt = (t) => {
      const off = offOnly(t), def = {};
      LET.forEach((l) => (def['D' + l] = manPos(l, t)));
      def.S = t < ts ? sA : lerp2(sA, sT, ease(clamp(((t - ts) / routeDur - 0.05) / 0.9, 0, 1)));
      return { off, def };
    };
  } else {
    sc.stateAt = (t) => ({ off: offOnly(t), def: {} });
  }
  sc.result = evaluate(sc, play);
  return sc;
}
