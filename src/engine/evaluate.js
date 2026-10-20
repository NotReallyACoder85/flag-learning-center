import { LOS, PX, LET, OPEN_SEPARATION_YDS } from './constants.js';
import { routeFor } from './routes.js';

/** Find the receiver with the most separation when the play ends, and explain why. Null with no defense. */
export function evaluate(sc, play) {
  if (!sc.defs.length) return null;
  const st = sc.stateAt(sc.end);
  let best = null;
  LET.forEach((l, i) => {
    if (play.digits[i] == null) return; // no route, nobody is throwing to him
    const p = st.off[l];
    let md = Infinity, who = '';
    sc.defs.forEach((d) => {
      const q = st.def[d.id];
      const dist = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (dist < md) { md = dist; who = d.id; }
    });
    const sep = md / PX;
    if (!best || sep > best.sep) best = { l, sep, p, who };
  });
  if (!best) return null; // no routes drawn yet
  return {
    open: best.l,
    sep: best.sep,
    tight: best.sep < OPEN_SEPARATION_YDS,
    why: whyText(play.def, best.p, best.l, play),
  };
}

/** One-sentence teaching explanation. An approximation, not a physics sim. */
export function whyText(cov, p, l, play) {
  const d = (LOS - p[1]) / PX;
  const wide = Math.abs(p[0] - 180) > 84;
  const r = routeFor(play.digits[LET.indexOf(l)]).name;
  if (cov === 'c3') {
    if (d <= 9 && wide) return 'He is in the flat. Cover 3 has only three players underneath, so quick outs and flats get room.';
    if (d > 9 && Math.abs(Math.abs(p[0] - 180) - 60) < 36) return 'He is in the seam between the corner and the safety. Thirds leave a gap where they meet.';
    if (d > 9) return 'He is deep and ran away from his third.';
    return 'He is in the soft spot between the linebackers and the M underneath.';
  }
  if (cov === 'c2') {
    if (d > 11 && Math.abs(p[0] - 180) < 50) return 'He is in the deep middle. Two safeties split the field, so the hole between them is the soft spot in Cover 2.';
    if (d > 9 && wide) return 'He is on the deep sideline, behind the corner and outside the safety.';
    return 'He is in a hook or curl window. The linebackers have a lot of ground to cover.';
  }
  return `He won his one-on-one. The ${r.toLowerCase()} broke away from a defender who was trailing him.`;
}
