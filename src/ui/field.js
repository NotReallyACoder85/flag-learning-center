// The SVG field: static turf, then per-play routes, defenders and players, moved by renderField(t).
import { $, el } from './dom.js';
import { S, ctx } from './state.js';
import { LOS, LET, QB, clamp, lerp, ease, polyLen } from '../engine/index.js';
import { COL, CLS_COL } from './theme.js';

const svg = $('#field');
const LAYERS = ['zones', 'routes', 'trail', 'match', 'def', 'off', 'ball'];
const G = {};
let offEls = {}, defEls = {}, matchEls = [], trails = {}, lens = {}, ballEl = null;
let pickHandler = null;

/** Make receivers tappable (used by the builder). Pass null to turn off. */
export function setPickHandler(fn) { pickHandler = fn; }

export function drawStatic() {
  svg.innerHTML = '';
  const defs = el('defs', {}, svg);
  const g1 = el('linearGradient', { id: 'tg', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  el('stop', { offset: 0, 'stop-color': '#0A2B6E' }, g1);
  el('stop', { offset: 1, 'stop-color': '#061744' }, g1);
  const g2 = el('radialGradient', { id: 'tr', cx: 0.5, cy: 0.78, r: 0.7 }, defs);
  el('stop', { offset: 0, 'stop-color': '#3170FF', 'stop-opacity': 0.38 }, g2);
  el('stop', { offset: 1, 'stop-color': '#3170FF', 'stop-opacity': 0 }, g2);
  el('rect', { width: 360, height: 400, fill: 'url(#tg)' }, svg);
  for (let i = 0; i < 7; i += 2) el('rect', { x: 0, y: i * 60, width: 360, height: 60, fill: '#fff', 'fill-opacity': 0.028 }, svg);
  el('rect', { width: 360, height: 400, fill: 'url(#tr)' }, svg);
  [240, 180, 120, 60].forEach((y, i) => {
    el('line', { x1: 0, x2: 360, y1: y, y2: y, stroke: '#fff', 'stroke-opacity': 0.2, 'stroke-width': 1 }, svg);
    el('text', { x: 34, y: y + 30, class: 'yn' }, svg).textContent = (i + 1) * 5;
    el('text', { x: 326, y: y + 30, class: 'yn' }, svg).textContent = (i + 1) * 5;
  });
  for (let y = 0; y < 400; y += 12) {
    el('line', { x1: 118, x2: 123, y1: y, y2: y, stroke: '#fff', 'stroke-opacity': 0.13 }, svg);
    el('line', { x1: 237, x2: 242, y1: y, y2: y, stroke: '#fff', 'stroke-opacity': 0.13 }, svg);
  }
  el('line', { x1: 0, x2: 360, y1: LOS, y2: LOS, stroke: '#fff', 'stroke-width': 8, 'stroke-opacity': 0.07 }, svg);
  el('line', { x1: 0, x2: 360, y1: LOS, y2: LOS, stroke: '#fff', 'stroke-width': 2.2, 'stroke-opacity': 0.9 }, svg);
  el('text', { x: 354, y: LOS + 15, class: 'yl', 'text-anchor': 'end' }, svg).textContent = 'LOS';
  LAYERS.forEach((k) => (G[k] = el('g', {}, svg)));
}

const arrowAt = (b, ang, size, attrs, parent) =>
  el('path', { d: `M0 0L-${size} -${size * 0.55}L-${size} ${size * 0.55}Z`, transform: `translate(${b[0]},${b[1]}) rotate(${ang})`, ...attrs }, parent);
const angle = (a, b) => (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;

function drawPlayer(parent, l) {
  el('ellipse', { cx: 0, cy: 12, rx: 10, ry: 4, fill: '#000', 'fill-opacity': 0.4 }, parent);
  el('circle', { class: 'halo', r: 14 }, parent);
  if (l === 'C') el('rect', { x: -12, y: -12, width: 24, height: 24, rx: 7, fill: COL[l], stroke: '#fff', 'stroke-opacity': 0.5, 'stroke-width': 1.5 }, parent);
  else el('circle', { r: 12.5, fill: l === 'Q' ? 'var(--cQ)' : COL[l], stroke: '#fff', 'stroke-opacity': 0.5, 'stroke-width': 1.5 }, parent);
  el('circle', { cx: -4, cy: -4.5, r: 4.5, fill: '#fff', 'fill-opacity': 0.28 }, parent);
  el('text', {}, parent).textContent = l;
}

/** Rebuild routes, defenders and players for the current scene. */
export function drawScene() {
  const sc = ctx.sc;
  LAYERS.forEach((k) => (G[k].innerHTML = ''));
  offEls = {}; defEls = {}; matchEls = []; trails = {}; lens = {};

  if (S.zones && (S.def === 'c3' || S.def === 'c2')) {
    sc.defs.forEach((d) => {
      const z = d.zone, c = CLS_COL[d.cls];
      el('rect', { x: z[0], y: z[1], width: z[2], height: z[3], rx: 10, fill: c, 'fill-opacity': 0.1, stroke: c, 'stroke-opacity': 0.55, 'stroke-dasharray': '3 4' }, G.zones);
      el('text', { x: z[0] + z[2] / 2, y: z[1] + z[3] - 7, class: 'zl' }, G.zones).textContent = d.zn;
    });
  }
  LET.forEach((l) => {
    const pts = sc.path[l];
    lens[l] = polyLen(pts);
    const s = pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    el('polyline', { points: s, fill: 'none', stroke: COL[l], 'stroke-width': 2, 'stroke-opacity': 0.42, 'stroke-dasharray': '2 5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, G.routes);
    const a = pts[pts.length - 2], b = pts[pts.length - 1];
    arrowAt(b, angle(a, b), 9, { fill: COL[l], 'fill-opacity': 0.5 }, G.routes);
    const glow = el('polyline', { points: s, fill: 'none', stroke: COL[l], 'stroke-width': 9, 'stroke-opacity': 0.22, 'stroke-linejoin': 'round' }, G.trail);
    const core = el('polyline', { points: s, fill: 'none', stroke: COL[l], 'stroke-width': 3, 'stroke-linejoin': 'round' }, G.trail);
    trails[l] = [glow, core];
  });
  if (sc.mover) {
    const a = sc.pre[sc.mover], b = sc.post[sc.mover];
    el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: '#fff', 'stroke-width': 2.4, 'stroke-dasharray': '1 6', 'stroke-linecap': 'round', 'stroke-opacity': 0.9 }, G.routes);
    arrowAt(b, angle(a, b), 9, { fill: '#fff' }, G.routes);
  }
  if (S.def === 'man' && S.zones) {
    LET.forEach((l) => matchEls.push([l, el('line', { stroke: '#fff', 'stroke-opacity': 0.3, 'stroke-dasharray': '3 4', 'stroke-width': 1.4 }, G.match)]));
  }
  sc.defs.forEach((d) => {
    const g = el('g', {}, G.def), c = CLS_COL[d.cls];
    el('circle', { r: 19, fill: c, 'fill-opacity': 0.13 }, g);
    el('circle', { r: 12.5, fill: '#040A1E', stroke: c, 'stroke-width': 2.6 }, g);
    el('text', { fill: c, class: 'dt' }, g).textContent = d.label;
    defEls[d.id] = g;
  });
  LET.forEach((l) => {
    const g = el('g', { class: 'off' }, G.off);
    drawPlayer(g, l);
    if (pickHandler) {
      g.classList.add('pick');
      g.setAttribute('tabindex', 0);
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', 'Receiver ' + l);
      g.addEventListener('click', () => pickHandler(l));
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickHandler(l); }
      });
    }
    offEls[l] = g;
  });
  const q = el('g', { class: 'off', transform: `translate(${QB[0]},${QB[1]})` }, G.off);
  drawPlayer(q, 'Q');
  ballEl = el('ellipse', { rx: 6, ry: 4, fill: '#B65A22', stroke: '#fff', 'stroke-width': 1.4, visibility: 'hidden' }, G.ball);
  markSelected();
}

/** Ring the receiver the keypad is editing (Draw Up only). */
export function markSelected() {
  Object.entries(offEls).forEach(([l, g]) => g.classList.toggle('sel', S.tab === 'build' && S.sel === l));
}

/** Pulse the open receiver (or clear all pulses with null). */
export function setHot(letter) {
  Object.entries(offEls).forEach(([l, g]) => g.classList.toggle('hot', l === letter));
}

/** Move everything to time t and draw the route trails up to that point. */
export function renderField(t) {
  const sc = ctx.sc, st = sc.stateAt(t);
  LET.forEach((l) => offEls[l].setAttribute('transform', `translate(${st.off[l][0]},${st.off[l][1]})`));
  sc.defs.forEach((d) => {
    const p = st.def[d.id];
    defEls[d.id].setAttribute('transform', `translate(${p[0]},${p[1]})`);
  });
  matchEls.forEach(([l, ln]) => {
    const p = st.def['D' + l], o = st.off[l];
    ln.setAttribute('x1', p[0]); ln.setAttribute('y1', p[1]); ln.setAttribute('x2', o[0]); ln.setAttribute('y2', o[1]);
  });
  const u = clamp((t - sc.ts) / sc.routeDur, 0, 1);
  LET.forEach((l) => {
    const d = `${(u * lens[l]).toFixed(1)} ${(lens[l] + 20).toFixed(1)}`;
    trails[l].forEach((p) => p.setAttribute('stroke-dasharray', u <= 0 ? '0 9999' : d));
  });
  const uu = (t - sc.ts) / sc.routeDur;
  if (sc.result && uu > 0.55) {
    const f = ease(clamp((uu - 0.55) / 0.4, 0, 1)), tp = st.off[sc.result.open];
    ballEl.setAttribute('visibility', 'visible');
    ballEl.setAttribute('cx', lerp(QB[0], tp[0], f));
    ballEl.setAttribute('cy', lerp(QB[1] - 14, tp[1], f));
  } else ballEl.setAttribute('visibility', 'hidden');
}
