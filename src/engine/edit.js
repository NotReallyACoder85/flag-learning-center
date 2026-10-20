// Pure helpers for editing a play in the builder. Nothing here touches the DOM.
import { MOTION_TAGS } from './constants.js';

/** No routes at all, no motion (the "Clear routes" state). Receivers with no route stand still. */
export const erasedPlay = () => ({ digits: [null, null, null, null, null], motion: null });

/** New digits with route n (0-9, or null for none) for receiver index i (0 = A ... 4 = C). */
export function setRoute(digits, i, n) {
  const next = digits.slice();
  next[i] = n;
  return next;
}

/** Pick who goes in motion. who = 'None' or A/B/Y/Z. Keeps the current tag (default Cross). */
export function setMotionWho(motion, who) {
  if (who === 'None') return null;
  return { who, tag: motion ? motion.tag : 'cross' };
}

/** Change the motion tag. Ignored when nobody is in motion. */
export function setMotionTag(motion, tag) {
  if (!motion || !MOTION_TAGS.includes(tag)) return motion;
  return { who: motion.who, tag };
}
