/**
 * What the app should be calling out at time t.
 * tell: 'man' | 'zone' | null (after motion, with a defense on)
 * result: the open-receiver result | null (at the end of the play, with a defense on)
 */
export function callouts(sc, play, t) {
  const tell = sc.mover && play.def !== 'none' && t >= sc.tm ? (play.def === 'man' ? 'man' : 'zone') : null;
  const result = sc.result && t >= sc.end - 0.05 ? sc.result : null;
  return { tell, result };
}
