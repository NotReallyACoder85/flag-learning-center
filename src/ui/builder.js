// Draw Up: formation, routes (the 0-9 tree and the Route Lab), motion, type-a-call, and My Plays.
import { $, cap, esc } from './dom.js';
import { S } from './state.js';
import {
  LET, ROUTES, checkCall, callText, erasedPlay, setRoute, setMotionWho, setMotionTag,
  templatesIn, fromTemplate, nudgeStem, nudgeBreak, flipRoute, paramsOf, sanitizePlay,
} from '../engine/index.js';
import { formations, baseFormations } from '../data/index.js';
import { glyph, formThumb } from './glyphs.js';
import { savedCardHTML } from './panels.js';
import { refresh, loadCall, loadSavedPlay } from './player.js';
import { loadMine, saveMine, MAX_NAME } from './storage.js';
import { touched } from './beat.js';

let mine = loadMine();
let routeTab = 'tree'; // 'tree' = the 0-9 routes, 'more' = specials and double moves
let lastSel = null;

function say(msg, ok = false) {
  const m = $('#codeErr');
  m.textContent = msg;
  m.classList.toggle('ok', ok);
}

/** Apply an edit to the play, then redraw. */
function change(fn) {
  fn();
  S.name = 'My play';
  S.playId = null;
  say('');
  touched();
  refresh(false);
}

/** Which key a route belongs to: a tree number, or a template id. */
const sourceOf = (d) => (typeof d === 'number' ? { tree: d } : d && d.lab ? d.lab.base : {});

const unit = (n) => `${Number.isInteger(n) ? n : n.toFixed(1)} yd${n === 1 ? '' : 's'}`;

function renderKeys(si) {
  const cur = sourceOf(S.digits[si]);
  const tabs = [['tree', 'Route tree'], ['more', 'More routes']];
  $('#routeTabs').innerHTML = tabs.map(([k, t]) => `<button class="pill" data-rt="${k}" data-fk="rt:${k}" aria-pressed="${routeTab === k}">${t}</button>`).join('');
  if (routeTab === 'tree') {
    $('#keys').innerHTML = `<div class="keys">${ROUTES.map((r, n) => `<button class="key" data-n="${n}" data-fk="k:${n}" aria-pressed="${cur.tree === n}" aria-label="Route ${n}, ${esc(r.name)}">${glyph(n)}<b>${n}</b><span>${esc(r.name)}</span></button>`).join('')}</div>`;
    return;
  }
  const keyFor = (t) => `<button class="key" data-tpl="${t.id}" data-fk="tpl:${t.id}" aria-pressed="${cur.tpl === t.id}" aria-label="${esc(t.name)}">${glyph(fromTemplate(t.id, S.sel === 'C'))}<span class="kn">${esc(t.name)}</span></button>`;
  $('#keys').innerHTML = `<div class="klabel">Specials</div><div class="keys">${templatesIn('special').map(keyFor).join('')}</div><div class="klabel">Double moves</div><div class="keys k3">${templatesIn('double').map(keyFor).join('')}</div>`;
}

/** Stem, Break and (for the center) Direction controls for the selected receiver's route. */
function renderTuner(si) {
  const p = paramsOf(S.digits[si]);
  if (!p) { $('#tuner').innerHTML = '<div class="tn-empty">Pick a route, then tune how long it runs before it cuts.</div>'; return; }
  const row = (label, key, val, can, up, down, what) => `<div class="tn"><span class="tn-l">${label}</span><button class="stepbtn" data-tune="${key}-" data-fk="tn:${key}-" aria-label="Shorter ${what}" ${can && val > down ? '' : 'disabled'}>−</button><output class="tn-v" aria-live="polite">${can ? unit(val) : '—'}</output><button class="stepbtn" data-tune="${key}+" data-fk="tn:${key}+" aria-label="Longer ${what}" ${can && val < up ? '' : 'disabled'}>+</button></div>`;
  $('#tuner').innerHTML =
    row('Stem', 'stem', p.stem, p.hasStem, p.stemMax - 0.01, p.stemMin + 0.01, 'stem') +
    row('Break', 'brk', p.brk, true, p.brkMax - 0.05, p.brkMin + 0.05, 'break') +
    (p.hasFlip ? `<div class="tn"><span class="tn-l">Direction</span><button class="flipbtn" data-tune="flip" data-fk="tn:flip" aria-label="Send this route the other way">${p.flip ? '◀ Left' : 'Right ▶'}</button></div>` : '');
}

export function renderBuilder() {
  const si = LET.indexOf(S.sel);
  // when you pick a different receiver, show the list his route came from
  if (S.sel !== lastSel) {
    lastSel = S.sel;
    const src = sourceOf(S.digits[si]);
    if (src.tpl) routeTab = 'more';
    else if (src.tree != null) routeTab = 'tree';
  }
  $('#formRow').innerHTML = baseFormations
    .map((k) => `<button class="fcard" data-f="${k}" data-fk="f:${k}" aria-pressed="${S.form === k}">${formThumb(k)}<b>${formations[k].name}</b></button>`)
    .join('');
  $('#keyLbl').textContent = '2 · Route for receiver ' + S.sel;
  renderKeys(si);
  renderTuner(si);
  $('#mWho').innerHTML = ['None', 'A', 'B', 'Y', 'Z']
    .map((w) => `<button class="pill" data-w="${w}" data-fk="w:${w}" aria-pressed="${(S.motion ? S.motion.who : 'None') === w}">${w === 'None' ? 'No motion' : w}</button>`)
    .join('');
  $('#mTag').innerHTML = ['cross', 'enter', 'exit']
    .map((t) => `<button class="pill" data-t="${t}" data-fk="t:${t}" aria-pressed="${!!S.motion && S.motion.tag === t}" ${S.motion && S.motion.tag !== 'custom' ? '' : 'disabled'}>${cap(t)}</button>`)
    .join('');
  const input = $('#codeIn');
  if (document.activeElement !== input) input.value = callText(S);
  $('#mine').innerHTML = mine.length
    ? mine
        .map((p, i) => `<div class="mine">${savedCardHTML(p, `data-mi="${i}"`)}<div class="macts"><button class="xbtn" data-ren="${i}" aria-label="Rename ${esc(p.name)}">Rename</button><button class="xbtn del" data-del="${i}" aria-label="Delete ${esc(p.name)}">Delete</button></div></div>`)
        .join('')
    : '<div class="empty">Nothing saved yet. Build a play and tap Save play.</div>';
}

function save() {
  if (S.digits.some((d) => d == null)) return say('Give every receiver a route before saving.');
  const custom = S.digits.some((d) => typeof d === 'object');
  let entry;
  if (!custom) {
    const code = callText(S);
    if (mine.some((p) => p.code && p.code.toLowerCase() === code.toLowerCase())) return say('That play is already saved.');
    entry = { code, name: 'My play ' + (mine.length + 1) };
  } else {
    // routes beyond the 0-9 tree cannot be written as a call, so the whole play is saved
    const play = sanitizePlay({ form: S.form, motion: S.motion, routes: S.digits });
    if (!play) return say('This play cannot be saved. Try changing a route.');
    const key = JSON.stringify(play);
    if (mine.some((p) => p.play && JSON.stringify(p.play) === key)) return say('That play is already saved.');
    entry = { name: 'My play ' + (mine.length + 1), play };
  }
  mine.unshift(entry);
  const kept = saveMine(mine);
  say(kept ? 'Saved.' : 'Saved for now, but this browser cannot keep it after you close the page.', kept);
  renderBuilder();
}

function rename(i) {
  const p = mine[i];
  if (!p) return;
  const name = window.prompt('Name this play:', p.name);
  if (name === null) return;
  p.name = name.trim().slice(0, MAX_NAME) || p.name;
  saveMine(mine);
  renderBuilder();
}

function remove(i) {
  const p = mine[i];
  if (!p || !window.confirm(`Delete "${p.name}"?`)) return;
  mine.splice(i, 1);
  saveMine(mine);
  renderBuilder();
}

/** Stem, break or direction change for the selected receiver. */
function tune(what) {
  const si = LET.indexOf(S.sel), cur = S.digits[si];
  if (cur == null) return;
  const next = what === 'stem+' ? nudgeStem(cur, 1) : what === 'stem-' ? nudgeStem(cur, -1)
    : what === 'brk+' ? nudgeBreak(cur, 1) : what === 'brk-' ? nudgeBreak(cur, -1) : flipRoute(cur);
  change(() => { S.digits = setRoute(S.digits, si, next); });
}

export function initBuilder() {
  const panel = $('#p-build');
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !panel.contains(b)) return;
    const d = b.dataset;
    const si = LET.indexOf(S.sel);
    if (d.f) change(() => { S.form = d.f; });
    else if (d.rt) { routeTab = d.rt; renderBuilder(); }
    else if (d.n) change(() => { S.digits = setRoute(S.digits, si, +d.n); });
    else if (d.tpl) change(() => { S.digits = setRoute(S.digits, si, fromTemplate(d.tpl, S.sel === 'C')); });
    else if (d.tune) tune(d.tune);
    else if (d.w) change(() => { S.motion = setMotionWho(S.motion, d.w); });
    else if (d.t) change(() => { S.motion = setMotionTag(S.motion, d.t); });
    else if (d.mi !== undefined || b.classList.contains('card')) {
      const p = mine[b.dataset.mi];
      if (!p) return;
      if (p.code) loadCall(p.code, p.name);
      else loadSavedPlay(p);
    } else if (d.ren !== undefined) rename(+d.ren);
    else if (d.del !== undefined) remove(+d.del);
    else if (b.id === 'saveBtn') save();
    else if (b.id === 'resetBtn') change(() => Object.assign(S, erasedPlay()));
  });
  $('#codeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const r = checkCall($('#codeIn').value);
    if (r.error) return say(r.error);
    loadCall(callText(r.play), 'My play');
    $('#codeIn').value = callText(r.play);
    say('');
  });
}
