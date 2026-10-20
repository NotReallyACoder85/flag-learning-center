import { LET, LOS, PX, ROUTES, buildScene } from '../engine/index.js';
import { formations } from '../data/index.js';
import { HEX } from './theme.js';

export function arrowPath(a, b, sz) {
  const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  return `<path d="M0 0L-${sz} -${sz * 0.56}L-${sz} ${sz * 0.56}Z" transform="translate(${b[0].toFixed(1)},${b[1].toFixed(1)}) rotate(${ang.toFixed(1)})"/>`;
}

/** Small route icon for a route number. */
export function glyph(n) {
  const pts = [[20, 38]].concat(ROUTES[n].points.map(([lat, d]) => [20 - lat * 1.55, 38 - d * 1.9]));
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  return `<svg viewBox="0 0 40 44" aria-hidden="true"><g fill="currentColor" stroke="currentColor"><polyline points="${pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="38" r="3" stroke="none"/>${arrowPath(a, b, 6.5).replace('<path', '<path stroke="none"')}</g></svg>`;
}

const player = (l, q, r = 10.5) =>
  l === 'C' ? `<rect x="${q[0] - 10}" y="${q[1] - 10}" width="20" height="20" rx="5" fill="${HEX[l]}"/>` : `<circle cx="${q[0]}" cy="${q[1]}" r="${r}" fill="${HEX[l]}"/>`;

/** Mini play diagram for a parsed play. */
export function thumb(p) {
  const s2 = buildScene({ form: p.form, digits: p.digits, motion: p.motion, def: 'none', slow: false });
  let g = '<svg viewBox="0 66 360 304" aria-hidden="true"><line x1="0" x2="360" y1="300" y2="300" stroke="#fff" stroke-opacity=".45" stroke-width="2"/>';
  LET.forEach((l) => {
    const pts = s2.path[l];
    g += `<polyline points="${pts.map((q) => q[0].toFixed(0) + ',' + q[1].toFixed(0)).join(' ')}" fill="none" stroke="${HEX[l]}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/><g fill="${HEX[l]}">${arrowPath(pts[pts.length - 2], pts[pts.length - 1], 13)}</g>`;
  });
  if (s2.mover) {
    const a = s2.pre[s2.mover], b = s2.post[s2.mover];
    g += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#fff" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>`;
  }
  LET.forEach((l) => (g += player(l, s2.pre[l])));
  return g + '<circle cx="180" cy="348" r="9" fill="#F0484B"/></svg>';
}

/** Formation picker thumbnail. */
export function formThumb(key) {
  const f = formations[key];
  let g = '<svg viewBox="0 286 360 78" aria-hidden="true"><line x1="0" x2="360" y1="300" y2="300" stroke="#fff" stroke-opacity=".3" stroke-width="2"/>';
  LET.forEach((l) => (g += player(l, [f.pos[l][0], LOS + f.pos[l][1] * PX])));
  return g + '<circle cx="180" cy="348" r="9" fill="#F0484B"/></svg>';
}

export const COV_ICON = {
  none: '<svg viewBox="0 0 44 28" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-opacity=".5" stroke-dasharray="2 3" stroke-width="1.6"><circle cx="9" cy="14" r="4"/><circle cx="22" cy="14" r="4"/><circle cx="35" cy="14" r="4"/></g></svg>',
  c3: '<svg viewBox="0 0 44 28" aria-hidden="true"><g fill="#6EA2FF"><circle cx="9" cy="6" r="3.4"/><circle cx="22" cy="6" r="3.4"/><circle cx="35" cy="6" r="3.4"/></g><g fill="#FFD21F"><circle cx="9" cy="21" r="3.4"/><circle cx="22" cy="21" r="3.4" fill="#fff"/><circle cx="35" cy="21" r="3.4"/></g></svg>',
  c2: '<svg viewBox="0 0 44 28" aria-hidden="true"><g fill="#6EA2FF"><circle cx="14" cy="6" r="3.4"/><circle cx="30" cy="6" r="3.4"/></g><g fill="#FFD21F"><circle cx="6" cy="21" r="3.4"/><circle cx="17" cy="21" r="3.4" fill="#fff"/><circle cx="27" cy="21" r="3.4" fill="#fff"/><circle cx="38" cy="21" r="3.4"/></g></svg>',
  man: '<svg viewBox="0 0 44 28" aria-hidden="true"><g fill="#6EA2FF"><circle cx="22" cy="6" r="3.4"/></g><g fill="#FFD21F"><circle cx="5" cy="21" r="3.4"/><circle cx="13.5" cy="21" r="3.4"/><circle cx="22" cy="21" r="3.4"/><circle cx="30.5" cy="21" r="3.4"/><circle cx="39" cy="21" r="3.4"/></g></svg>',
};
