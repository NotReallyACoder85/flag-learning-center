// Teaching diagrams for the route and formation quizzes.
import { routes, formations } from '../data/index.js';
import { LET, LOS, PX, buildScene } from '../engine/index.js';
import { HEX } from './theme.js';

const PER_YD = 6; // px per yard in the route diagram
const X0 = 100, Y0 = 190; // where the receiver starts

/**
 * One route drawn from a receiver on the line, with yard lines so depth can be read.
 * Receiver is on the left side, so the sideline is on the left and the middle of the field is on the right.
 * full = with yard numbers and labels (the big question picture); otherwise a small clean version.
 */
export function routeDiagram(n, full = true) {
  const pts = [[X0, Y0]].concat(routes[n].points.map(([lat, d]) => [X0 - lat * PER_YD, Y0 - d * PER_YD]));
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  const ticks = [5, 10, 15].map((d) => `<line x1="8" x2="192" y1="${Y0 - d * PER_YD}" y2="${Y0 - d * PER_YD}" stroke="#fff" stroke-opacity=".18"/>${full ? `<text x="14" y="${Y0 - d * PER_YD - 3}" class="rd-t">${d} yds</text>` : ''}`).join('');
  return `<svg viewBox="0 0 200 216" role="img" aria-label="${blurbLabel(n)}">
    
    <line x1="8" x2="8" y1="6" y2="${Y0 + 8}" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>
    <line x1="192" x2="192" y1="6" y2="${Y0 + 8}" stroke="#fff" stroke-opacity=".3" stroke-dasharray="4 5"/>
    ${ticks}
    <line x1="8" x2="192" y1="${Y0}" y2="${Y0}" stroke="#fff" stroke-width="2.5"/>
    ${full ? `<text x="14" y="${Y0 + 16}" class="rd-t">SIDELINE</text><text x="186" y="${Y0 + 16}" class="rd-t" text-anchor="end">MIDDLE</text>` : ''}
    <polyline points="${pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="none" stroke="#FFD21F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M0 0L-10 -5.5L-10 5.5Z" fill="#FFD21F" transform="translate(${b[0].toFixed(1)},${b[1].toFixed(1)}) rotate(${ang.toFixed(1)})"/>
    <circle cx="${X0}" cy="${Y0}" r="9" fill="${HEX.B}" stroke="#fff" stroke-opacity=".6" stroke-width="1.5"/>
  </svg>`;
}

/** Route in words for screen readers (never says the route's number or name). */
export const blurbLabel = (n) => routes[n].blurb.replace(/"/g, '');

/**
 * A formation from above. letters = show A, B, Y, Z, C and Q inside the players (the big question picture).
 */
export function formDiagram(key, letters = true) {
  const f = formations[key];
  const player = (l, x, y) => {
    const shape = l === 'C'
      ? `<rect x="${x - 14}" y="${y - 14}" width="28" height="28" rx="7" fill="${HEX[l]}"/>`
      : `<circle cx="${x}" cy="${y}" r="14" fill="${HEX[l]}"/>`;
    return shape + (letters ? `<text x="${x}" y="${y + 1}" class="fd-l">${l}</text>` : '');
  };
  const dots = LET.map((l) => player(l, f.pos[l][0], LOS + f.pos[l][1] * PX)).join('');
  const qb = `<circle cx="180" cy="348" r="13" fill="#F0484B"/>${letters ? '<text x="180" y="349" class="fd-l">Q</text>' : ''}`;
  return `<svg viewBox="0 272 360 96" role="img" aria-label="${f.desc.replace(/"/g, '')}"><line x1="0" x2="360" y1="${LOS}" y2="${LOS}" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>${dots}${qb}</svg>`;
}

/**
 * A play drawn for a wristband slot: black lines on white (or colored), big dots with letters, bold arrowheads.
 * Built to stay readable when printed about 1.4 inches wide.
 */
export function wristDiagram(play, color = false) {
  const s = buildScene({ form: play.form, digits: play.digits, motion: play.motion, def: 'none', slow: false });
  const ink = '#111';
  const col = (l) => (color ? HEX[l] : ink);
  // fit the picture to what is on the field, so short plays are drawn bigger (but never zoomed in absurdly far)
  const xs = [180], ys = [350];
  LET.forEach((l) => {
    xs.push(s.pre[l][0]); ys.push(s.pre[l][1]);
    s.path[l].forEach((p) => { xs.push(p[0]); ys.push(p[1]); });
  });
  const pad = 22;
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad + 8;
  const w = Math.max(x1 - x0, 270), h = Math.max(y1 - y0, 170);
  const vx = (x0 + x1) / 2 - w / 2, vy = y1 - h;
  let g = `<line x1="${vx}" x2="${vx + w}" y1="${LOS}" y2="${LOS}" stroke="${ink}" stroke-width="2" stroke-opacity=".55"/>`;
  LET.forEach((l) => {
    const pts = s.path[l];
    if (pts.length < 2) return;
    const a = pts[pts.length - 2], b = pts[pts.length - 1];
    const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    g += `<polyline points="${pts.map((p) => p[0].toFixed(0) + ',' + p[1].toFixed(0)).join(' ')}" fill="none" stroke="${col(l)}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M0 0L-16 -8L-16 8Z" fill="${col(l)}" transform="translate(${b[0].toFixed(0)},${b[1].toFixed(0)}) rotate(${ang.toFixed(0)})"/>`;
  });
  if (s.mover) {
    const a = s.pre[s.mover], b = s.post[s.mover];
    g += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${ink}" stroke-width="3.4" stroke-dasharray="1 7" stroke-linecap="round"/>`;
  }
  LET.forEach((l) => {
    const q = s.pre[l];
    const shape = l === 'C' ? `<rect x="${q[0] - 14}" y="${q[1] - 14}" width="28" height="28" rx="5" fill="${col(l)}"/>` : `<circle cx="${q[0]}" cy="${q[1]}" r="14" fill="${col(l)}"/>`;
    g += shape + `<text x="${q[0]}" y="${q[1] + 1}" class="wd-l" fill="${color ? '#06102A' : '#fff'}">${l}</text>`;
  });
  g += `<circle cx="180" cy="350" r="10" fill="none" stroke="${color ? HEX.A : ink}" stroke-width="3"/>`;
  return `<svg class="wd" viewBox="${vx.toFixed(0)} ${vy.toFixed(0)} ${w.toFixed(0)} ${h.toFixed(0)}" aria-hidden="true">${g}</svg>`;
}
