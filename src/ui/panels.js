// HTML renderers for the head, receiver tiles, defense picker, legend and Playbook panel.
import { $, cap, esc } from './dom.js';
import { S } from './state.js';
import { LET, callText, digitsText, parseCall, routeFor, playFromEntry, playbookEntries, playbookSections, findEntry } from '../engine/index.js';
import { formations, callbook, copy } from '../data/index.js';
import { glyph, thumb, COV_ICON } from './glyphs.js';
import { HEX } from './theme.js';

export function renderHead() {
  $('#miniName').textContent = (S.name || formations[S.form].name) + (S.name ? ' · ' + formations[S.form].name : '') + (S.motion ? ' · Motion' : '');
  $('#fmName').textContent = formations[S.form].name;
  $('#callName').textContent = S.name || '';
  $('#mChip').innerHTML = S.motion
    ? `<span class="mchip">Motion · ${S.motion.who}${S.motion.tag === 'custom' ? '' : ' ' + cap(S.motion.tag)}</span>`
    : '<span class="mchip none">No motion</span>';
}

/** What a tile or button shows for a receiver: the number, a label, and the words for screen readers. */
function routeFace(d) {
  const r = routeFor(d); // undefined when the receiver has no route
  if (!r) return { r, num: '–', name: 'No route', say: 'no route' };
  const num = typeof d === 'number' ? d : r.tree != null ? r.tree : '<i class="dotmark"></i>'; // a drawn route shows its tree number when it has one
  const say = typeof d === 'number' ? `route ${d}, ${r.name}` : `${r.name}${r.key ? ', key route' : ''}`;
  return { r, num, name: r.name, say };
}

export function renderTiles() {
  $('#tiles').innerHTML = LET.map((l, i) => {
    const d = S.digits[i], f = routeFace(d);
    return `<button class="tile ${f.r && f.r.key ? 'key' : ''}" data-l="${l}" data-fk="tile:${l}" style="--c:${HEX[l]};color:${HEX[l]}" aria-pressed="${S.tab === 'build' && S.sel === l}" aria-label="${l}: ${esc(f.say)}. Tap to change."><span class="let ${l === 'C' ? 'sq' : ''}">${l}</span>${f.r ? glyph(d) : '<svg viewBox="0 0 40 44" aria-hidden="true"></svg>'}<span class="num">${f.num}</span><span class="rn">${esc(f.name)}</span>${f.r && f.r.key ? '<span class="keymark" aria-hidden="true">★</span>' : ''}</button>`;
  }).join('');
  $('#chips').innerHTML = LET.map((l, i) => {
    const f = routeFace(S.digits[i]);
    return `<button class="chip" data-l="${l}" data-fk="chip:${l}" style="--c:${HEX[l]}" aria-pressed="${S.tab === 'build' && S.sel === l}" aria-label="${l}: ${esc(f.say)}. Tap to change."><span class="cl ${l === 'C' ? 'sq' : ''}">${l}</span><b>${f.num}</b></button>`;
  }).join('');
}

export function renderCov() {
  $('#covSeg').innerHTML = ['none', 'c3', 'c2', 'man']
    .map((k) => `<button class="cv" data-def="${k}" aria-pressed="${S.def === k}">${COV_ICON[k]}<b>${copy.coverage[k][0]}</b><span>${copy.coverage[k][1]}</span></button>`)
    .join('');
}

const MINI_DEF = { none: 'Off', c3: 'Cov 3', c2: 'Cov 2', man: 'Man' };

/** Compact defense switch inside the pinned field block (phones). */
export function renderMiniDef() {
  $('#miniDef').innerHTML = ['none', 'c3', 'c2', 'man'].map((k) => `<button class="md" data-def="${k}" aria-pressed="${S.def === k}" aria-label="${copy.coverage[k][0]}">${MINI_DEF[k]}</button>`).join('');
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

const thumbs = new Map(); // playbook thumbnails never change, so draw each once
const playThumb = (e) => {
  if (!thumbs.has(e.id)) thumbs.set(e.id, thumb(playFromEntry(e)));
  return thumbs.get(e.id);
};

function playCard(e, pressed) {
  const f = formations[e.formation];
  return `<button class="card" data-id="${esc(e.id)}" data-fk="card:${esc(e.id)}" aria-pressed="${pressed}"><span class="th">${playThumb(e)}</span><span class="bd"><span class="cd">${esc(e.name)}</span><span class="cn">${esc(f.name)}${e.motion ? ' · Motion' : ''}</span></span></button>`;
}

/** "How to read this play" card for a playbook play. */
function playbookAnatomy(e) {
  const sec = playbookSections.find((s) => s.id === e.section);
  const names = LET.map((l, i) => `${l} ${esc(routeFor(S.digits[i]) ? routeFor(S.digits[i]).name : 'no route')}`).join(', ');
  const anyKey = LET.some((l, i) => routeFor(S.digits[i]) && routeFor(S.digits[i]).key);
  return `<div class="seg3"><b>${esc(formations[e.formation].name)}</b><span>Formation. ${esc(formations[e.formation].desc)}</span></div>` +
    `<div class="seg3"><b>Routes</b><span>${names}.</span></div>` +
    (e.motion ? `<div class="seg3 m"><b>${e.motion.who} Motion</b><span>Motion. ${e.motion.who} moves to a new spot before the snap, then runs his route from there.</span></div>` : '') +
    `<div class="note glass" style="flex-basis:100%">${esc(sec ? sec.blurb : '')} ${esc(e.note || '')}${anyKey ? ' A gold star marks a key route in the playbook diagram.' : ''}</div>`;
}

/** "How to read this play" card plus the playbook, grouped by the sections in the coach's playbook. */
export function renderPlaybook() {
  const entry = S.playId ? findEntry(S.playId) : null;
  if (entry) $('#anat').innerHTML = playbookAnatomy(entry);
  else {
    const cur = callText(S).toLowerCase();
    const known = callbook.find((p) => p.call.toLowerCase() === cur);
    $('#anat').innerHTML =
      `<div class="seg3"><b>${formations[S.form].name}</b><span>Formation. ${formations[S.form].desc}</span></div>` +
      `<div class="seg3"><b>${digitsText(S.digits)}</b><span>Routes left to right: A, B, Y, Z, then the center C.</span></div>` +
      (S.motion ? `<div class="seg3 m"><b>${S.motion.who} ${cap(S.motion.tag)}</b><span>Motion. ${S.motion.who} ${copy.motionDesc[S.motion.tag] || 'moves before the snap'}.</span></div>` : '') +
      (known ? `<div class="note glass" style="flex-basis:100%">${esc(known.note)}</div>` : '');
  }
  const at = S.playId ? playbookEntries.findIndex((e) => e.id === S.playId) : -1;
  $('#pbPrev').disabled = at <= 0;
  $('#pbNext').disabled = at === playbookEntries.length - 1;
  $('#plays').innerHTML = playbookSections.map((sec) => {
    const items = playbookEntries.filter((e) => e.section === sec.id);
    return `<section class="grp"><h3 class="grp-h">${esc(sec.name)}<span>${items.length} plays</span></h3><p class="grp-b">${esc(sec.blurb)}</p><div class="cards" role="group" aria-label="${esc(sec.name)}">${items.map((e) => playCard(e, e.id === S.playId)).join('')}</div></section>`;
  }).join('');
}
