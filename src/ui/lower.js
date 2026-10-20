// "Lower third" callouts under the field: the tell (after motion) and the result (at the end).
import { $, esc } from './dom.js';
import { S, ctx } from './state.js';
import { setHot } from './field.js';
import { ROUTES, LET, DEF_NAME } from '../engine/index.js';
import { copy } from '../data/index.js';

let lastKey = '';
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => esc(vars[k]));

export const resetLower = () => { lastKey = ''; };

export function renderLower(t) {
  const sc = ctx.sc;
  const showTell = !!sc.mover && S.def !== 'none' && t >= sc.tm;
  const showRes = !!sc.result && t >= sc.end - 0.05;
  const key = showTell + '|' + showRes;
  if (key === lastKey) return;
  lastKey = key;

  let html = '', n = 0;
  if (S.def === 'none') html = `<div class="l3 idle">${copy.idle.noDefense}</div>`;
  else {
    if (showTell) {
      n++;
      const tell = copy.tell[S.def === 'man' ? 'man' : 'zone'];
      html += `<div class="l3 tell"><span class="k">Tell</span><div><b>${tell.title}</b><span class="tx">${fill(tell.text, { who: S.motion.who })}</span></div></div>`;
    }
    if (showRes) {
      n++;
      const r = sc.result;
      if (r.tight) {
        html += `<div class="l3 res tight"><span class="k">Read</span><div><b>Covered on every route</b><span class="tx">${fill(copy.covered, { defense: DEF_NAME[S.def], sep: r.sep.toFixed(1) })}</span></div></div>`;
      } else {
        const route = ROUTES[S.digits[LET.indexOf(r.open)]].name.toLowerCase();
        html += `<div class="l3 res"><span class="k">Open</span><div><b>${r.open} on the ${esc(route)}, ${r.sep.toFixed(1)} yds of space</b><span class="tx">${esc(r.why)}</span></div></div>`;
      }
    }
    if (!n) html = `<div class="l3 idle">${sc.mover ? copy.idle.motion : copy.idle.play}</div>`;
  }
  const L = $('#lower');
  L.className = 'lower' + (n === 2 ? ' two' : '');
  L.innerHTML = html;
  setHot(showRes && !sc.result.tight ? sc.result.open : null);
}
