// Checking plays that were saved on the device. Anything unexpected is cleaned up or dropped, never trusted.
import { formations, routelab } from '../data/index.js';
import { clamp } from './math.js';
import { kindOf } from './routelab.js';

const KINDS = ['in', 'out', 'vert'];
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const pair = (p) => Array.isArray(p) && p.length === 2 && num(p[0]) && num(p[1]);

function cleanPoints(pts) {
  if (!Array.isArray(pts) || pts.length < 1 || pts.length > 10 || !pts.every(pair)) return null;
  const L = routelab.limits;
  return pts.map(([lat, d]) => [Math.round(clamp(lat, -L.maxLateral, L.maxLateral) * 10) / 10, Math.round(clamp(d, -6, L.maxDepth) * 10) / 10]);
}

function cleanBase(b) {
  if (!b || typeof b !== 'object') return null;
  if (Number.isInteger(b.tree) && b.tree >= 0 && b.tree <= 9) return { tree: b.tree };
  if (typeof b.tpl === 'string' && routelab.templates.some((t) => t.id === b.tpl)) return { tpl: b.tpl };
  const pts = cleanPoints(b.pts);
  if (pts && text(b.name, 30)) {
    const out = { pts, name: text(b.name, 30), abs: !!b.abs };
    if (Number.isInteger(b.treeNum) && b.treeNum >= 0 && b.treeNum <= 9) out.treeNum = b.treeNum;
    return out;
  }
  return null;
}

/** A saved route: a tree number 0-9, or a drawn route object. Returns the cleaned route, or null if it cannot be used. */
export function sanitizeRoute(r) {
  if (Number.isInteger(r) && r >= 0 && r <= 9) return r;
  if (!r || typeof r !== 'object') return null;
  const points = cleanPoints(r.points), name = text(r.name, 30);
  if (!points || !name) return null;
  const out = { name, kind: KINDS.includes(r.kind) ? r.kind : kindOf(points, !!r.abs), points };
  if (r.abs) out.abs = true;
  if (Number.isInteger(r.tree) && r.tree >= 0 && r.tree <= 9) out.tree = r.tree;
  if (text(r.detail, 24)) out.detail = text(r.detail, 24);
  const base = r.lab && cleanBase(r.lab.base);
  if (base) {
    const lab = { base };
    if (num(r.lab.stem)) lab.stem = clamp(r.lab.stem, routelab.limits.stemMin, routelab.limits.stemMax);
    if (num(r.lab.brk)) lab.brk = clamp(r.lab.brk, 0.5, 40);
    if (r.lab.flip) lab.flip = true;
    if (r.lab.abs) lab.abs = true;
    out.lab = lab;
  }
  return out;
}

/** A saved whole play: { form, motion, routes: [A, B, Y, Z, C] }. Returns the cleaned play, or null. */
export function sanitizePlay(p) {
  if (!p || typeof p !== 'object' || !formations[p.form]) return null;
  if (!Array.isArray(p.routes) || p.routes.length !== 5) return null;
  const routes = p.routes.map(sanitizeRoute);
  if (routes.some((r) => r == null)) return null;
  let motion = null;
  const m = p.motion;
  if (m) {
    if (!['A', 'B', 'Y', 'Z'].includes(m.who)) return null;
    if (['cross', 'enter', 'exit'].includes(m.tag)) motion = { who: m.who, tag: m.tag };
    else if (m.tag === 'custom' && Array.isArray(m.to) && pair(m.to)) motion = { who: m.who, tag: 'custom', to: [Math.round(clamp(m.to[0], 10, 350)), Math.round(clamp(m.to[1], -2, 8) * 10) / 10] };
    else return null;
  }
  return { form: p.form, motion, routes };
}
