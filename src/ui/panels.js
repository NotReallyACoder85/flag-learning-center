// HTML renderers for the head, receiver tiles, defense picker, legend and Playbook panel.
import { $, cap, esc } from './dom.js';
import { S } from './state.js';
import { LET, ROUTES, callText, parseCall } from '../engine/index.js';
import { formations, plays, copy } from '../data/index.js';
import { glyph, thumb, COV_ICON } from './glyphs.js';
import { HEX } from './theme.js';

export function renderHead() {
  $('#fmName').textContent = formations[S.form].name;
  $('#callName').textContent = S.name || '';
  $('#mChip').innerHTML = S.motion
    ? `<span class="mchip">Motion · ${S.motion.who} ${cap(S.motion.tag)}</span>`
    : '<span class="mchip none">No motion</span>';
}

export function renderTiles() {
  $('#tiles').innerHTML = LET.map((l, i) => {
    const n = S.digits[i];
    return `<div class="tile" role="listitem" style="--c:${HEX[l]};color:${HEX[l]}" aria-label="${l}: route ${n}, ${esc(ROUTES[n].name)}"><span class="let ${l === 'C' ? 'sq' : ''}">${l}</span>${glyph(n)}<span class="num">${n}</span><span class="rn">${esc(ROUTES[n].name)}</span></div>`;
  }).join('');
}

export function renderCov() {
  $('#covSeg').innerHTML = ['none', 'c3', 'c2', 'man']
    .map((k) => `<button class="cv" data-def="${k}" aria-pressed="${S.def === k}">${COV_ICON[k]}<b>${copy.coverage[k][0]}</b><span>${copy.coverage[k][1]}</span></button>`)
    .join('');
}

export function renderLegend() {
  const dot = (c, label) => `<span><i style="border-color:${c}"></i>${label}</span>`;
  $('#legend').innerHTML =
    S.def === 'none' ? '<span>Dashed line = the route. The bright line draws as the player runs.</span>'
    : S.def === 'man' ? dot('#FFD21F', 'Defender (letter is who he covers)') + dot('#6EA2FF', 'Deep safety')
    : dot('#6EA2FF', 'Deep') + dot('#FFD21F', S.def === 'c3' ? 'Flat' : 'Flat (CB)') + dot('#fff', S.def === 'c3' ? 'Middle' : 'Hook');
}

export function cardCode(code) {
  const p = parseCall(code);
  return `<span class="cd"><small>${formations[p.form].name}</small>${p.digits.join('')}${p.motion ? `<i>${p.motion.who} ${p.motion.tag}</i>` : ''}</span>`;
}

export function cardHTML(code, name, attrs, pressed) {
  return `<button class="card" ${attrs} aria-pressed="${pressed}"><span class="th">${thumb(parseCall(code))}</span><span class="bd">${cardCode(code)}<span class="cn">${esc(name)}</span></span></button>`;
}

/** "How to read a call" card plus the play library. */
export function renderPlaybook() {
  const cur = callText(S).toLowerCase();
  const entry = plays.find((p) => p.call.toLowerCase() === cur);
  $('#anat').innerHTML =
    `<div class="seg3"><b>${formations[S.form].name}</b><span>Formation. ${formations[S.form].desc}</span></div>` +
    `<div class="seg3"><b>${S.digits.join('')}</b><span>Routes left to right: A, B, Y, Z, then the center C.</span></div>` +
    (S.motion ? `<div class="seg3 m"><b>${S.motion.who} ${cap(S.motion.tag)}</b><span>Motion. ${S.motion.who} ${copy.motionDesc[S.motion.tag]}.</span></div>` : '') +
    (entry ? `<div class="note glass" style="flex-basis:100%">${esc(entry.note)}</div>` : '');
  $('#plays').innerHTML = plays.map((p, i) => cardHTML(p.call, p.name, `data-i="${i}"`, p.call.toLowerCase() === cur)).join('');
}
