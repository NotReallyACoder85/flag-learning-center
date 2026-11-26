// Routes drawn by hand on the field: tapped points become a route that is straight or curved,
// and ends in an arrow (keep running) or a circle (sit in that spot). Pure functions, no DOM.
import { routelab } from '../data/index.js';
import { LOS, PX } from './constants.js';
import { clamp } from './math.js';
import { kindOf, buildRoute } from './routelab.js';

export const MAX_DRAW_POINTS = 8;
const r1 = (v) => Math.round(v * 10) / 10;

/**
 * Field pixels to a route. start = where the receiver stands (after motion). The center's routes are measured
 * to the right and never mirrored; everyone else's are measured toward their own sideline.
 * Returns null with no points.
 */
export function drawnRoute(taps, start, { center = false, curve = false, end = 'arrow' } = {}) {
  if (!taps.length) return null;
  const L = routelab.limits;
  const inD = center ? -1 : start[0] < 180 ? 1 : -1;
  const points = taps.slice(0, MAX_DRAW_POINTS).map(([x, y]) => [
    r1(clamp((start[0] - clamp(x, 10, 350)) / (inD * PX), -L.maxLateral, L.maxLateral)) || 0,
    r1(clamp((LOS - y) / PX, -6, L.maxDepth)) || 0,
  ]);
  const route = { name: 'Custom', kind: kindOf(points, center), points, drawn: true };
  if (center) route.abs = true;
  if (curve) route.curve = true;
  if (end === 'sit') route.end = 'sit';
  return route;
}

/** Change how a route ends. A tree number that goes back to an arrow is a plain number again (so it keeps its call code). */
export function setEnding(route, end) {
  if (route == null) return route;
  const out = typeof route === 'number' ? buildRoute({ tree: route }) : { ...route };
  if (end === 'sit') out.end = 'sit';
  else {
    delete out.end;
    const b = out.lab && out.lab.base;
    if (b && b.tree != null && !out.detail && !out.curve) return b.tree;
  }
  return out;
}

/** Make a drawn route curved or straight. */
export function setCurve(route, curve) {
  if (!route || typeof route !== 'object') return route;
  const out = { ...route };
  if (curve) out.curve = true;
  else delete out.curve;
  return out;
}
