// Route Lab: routes beyond the 0-9 tree. Build one from a template (Wheel, Post-Corner...), or tune ANY route:
// a longer or shorter stem, a longer or shorter break, and (for the center) which way it goes. Pure functions, no DOM.
import { routes, routelab } from '../data/index.js';
import { clamp } from './math.js';
import { routeFor } from './routes.js';

export const TEMPLATES = routelab.templates;
export const LIMITS = routelab.limits;

const r1 = (v) => Math.round(v * 10) / 10;
const len = (s) => Math.hypot(s[0], s[1]);

/** The kind used by Cover 2 reads: vertical, breaking out, or breaking in (judged from the last leg). */
export function kindOf(points, abs) {
  if (abs) return 'in';
  const a = points.length > 1 ? points[points.length - 2] : [0, 0], b = points[points.length - 1];
  const dl = b[0] - a[0], dd = b[1] - a[1];
  return Math.abs(dl) < 0.5 * Math.abs(dd) ? 'vert' : dl > 0 ? 'out' : 'in';
}

/** Split a list of points into { stem, steps } (stem = straight-up first leg, or null). */
function split(points) {
  const first = points[0];
  const hasStem = first && Math.abs(first[0]) < 0.05 && first[1] > 0 && points.length > 1;
  const from = hasStem ? first : [0, 0];
  const rest = hasStem ? points.slice(1) : points;
  const steps = [];
  let prev = from;
  rest.forEach((p) => { steps.push([p[0] - prev[0], p[1] - prev[1]]); prev = p; });
  return { stem: hasStem ? first[1] : null, steps };
}

/** Resolve a base ({tree}, {tpl} or {pts}) to { name, stem, steps, tree?, abs?, kindAbs }. */
function resolveBase(base) {
  if (base.tree != null) {
    const r = routes[base.tree];
    return { name: r.name, tree: base.tree, ...split(r.points) };
  }
  if (base.tpl) {
    const t = TEMPLATES.find((x) => x.id === base.tpl);
    return { name: t.name, stem: t.stem, steps: t.steps };
  }
  return { name: base.name, abs: !!base.abs, tree: base.treeNum, ...split(base.pts) };
}

/** What a route was made from, so tuning always works from the original shape (no drift from repeated taps). */
function labOf(route) {
  if (typeof route === 'number') return { base: { tree: route } };
  if (route.lab) return route.lab;
  return { base: { pts: route.points, name: route.name, abs: !!route.abs, treeNum: route.tree } };
}

/** Current stem, break length and limits for a route (number, drawn route, or none). */
export function paramsOf(route) {
  if (route == null) return null;
  const lab = labOf(route), b = resolveBase(lab.base);
  const baseLen = b.steps.length ? len(b.steps[0]) || 1 : 1;
  const hasStem = b.stem != null;
  const abs = lab.base.tpl ? !!lab.abs : !!b.abs;
  return {
    hasStem,
    stem: hasStem ? lab.stem ?? b.stem : null,
    stemMin: LIMITS.stemMin, stemMax: LIMITS.stemMax,
    brk: r1(lab.brk ?? baseLen),
    brkMin: r1(Math.max(2, baseLen * LIMITS.breakMinScale)), brkMax: r1(baseLen * LIMITS.breakMaxScale),
    hasFlip: abs, flip: !!lab.flip,
  };
}

/**
 * Build a route object the engine can run.
 *   base: { tree: n } | { tpl: id } | { pts, name, abs, treeNum }
 *   opts: { stem, brk, flip, center }  (all optional; center = this receiver is the center, so a template goes left/right)
 */
export function buildRoute(base, opts = {}) {
  const b = resolveBase(base);
  const baseLen = b.steps.length ? len(b.steps[0]) || 1 : 1;
  const stem = b.stem == null ? null : clamp(opts.stem ?? b.stem, LIMITS.stemMin, LIMITS.stemMax);
  // a break length that is back at the default (as displayed, rounded) means "untouched", so nudging up and down is exact
  const asked = opts.brk != null && Math.abs(opts.brk - baseLen) < 0.06 ? null : opts.brk;
  const brk = asked == null ? baseLen : clamp(asked, Math.max(2, baseLen * LIMITS.breakMinScale), baseLen * LIMITS.breakMaxScale);
  const k = brk / baseLen;
  const abs = base.tpl ? !!opts.center : !!b.abs;
  const flip = abs && !!opts.flip;
  let x = 0, y = stem == null ? 0 : stem;
  const pts = stem == null ? [] : [[0, stem]];
  b.steps.forEach(([dx, dy]) => { x += dx * k; y += dy * k; pts.push([x, y]); });
  const points = pts.map(([lat, d]) => [r1(clamp(flip ? -lat : lat, -LIMITS.maxLateral, LIMITS.maxLateral)), r1(clamp(d, -6, LIMITS.maxDepth))]);
  const tunedStem = stem != null && opts.stem != null && Math.abs(stem - b.stem) > 0.04;
  const tunedBrk = asked != null && Math.abs(k - 1) > 0.02;
  const route = { name: b.name, kind: kindOf(points, abs), points };
  if (abs) route.abs = true;
  if (b.tree != null) route.tree = b.tree;
  const detail = tunedStem && tunedBrk ? `stem ${r1(stem)} · break ${r1(brk)}` : tunedStem ? `${r1(stem)} yd stem` : tunedBrk ? `${r1(brk)} yd break` : '';
  if (detail) route.detail = detail;
  route.lab = { base, ...(tunedStem ? { stem: r1(stem) } : {}), ...(tunedBrk ? { brk: r1(brk) } : {}), ...(flip ? { flip: true } : {}), ...(base.tpl && abs ? { abs: true } : {}) };
  return route;
}

/** A template route for a receiver. */
export const fromTemplate = (id, center = false) => buildRoute({ tpl: id }, { center });

/** Change the stem by delta yards. Returns a new route (the original is untouched). */
export function nudgeStem(route, delta) {
  const p = paramsOf(route), lab = labOf(route);
  if (!p.hasStem) return route;
  return buildRoute(lab.base, { stem: p.stem + delta, brk: lab.brk, flip: lab.flip, center: !!lab.abs });
}

/** Change the break length by delta yards. */
export function nudgeBreak(route, delta) {
  const p = paramsOf(route), lab = labOf(route);
  return buildRoute(lab.base, { stem: lab.stem, brk: p.brk + delta, flip: lab.flip, center: !!lab.abs });
}

/** Send a center's route the other way. */
export function flipRoute(route) {
  const p = paramsOf(route), lab = labOf(route);
  if (!p.hasFlip) return route;
  return buildRoute(lab.base, { stem: lab.stem, brk: lab.brk, flip: !lab.flip, center: !!lab.abs });
}

/** Words for a route: { name, detail }. Works for numbers, drawn routes and tuned routes. */
export function describeRoute(route) {
  const r = routeFor(route);
  return r ? { name: r.name, detail: r.detail || '' } : null;
}

export const templatesIn = (group) => TEMPLATES.filter((t) => t.group === group);
