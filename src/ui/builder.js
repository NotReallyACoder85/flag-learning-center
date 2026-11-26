// Draw Up: formation, routes (the 0-9 tree and the Route Lab), motion, type-a-call, and My Plays.
import { $, cap, esc } from './dom.js';
import { S, ctx } from './state.js';
import { setDrawHandler, markPoints } from './field.js';
import {
  LET, ROUTES, checkCall, callText, erasedPlay, setRoute, setMotionWho, setMotionTag,
  templatesIn, fromTemplate, nudgeStem, nudgeBreak, flipRoute, paramsOf, sanitizePlay, routeFor,
  drawnRoute, setEnding, setCurve, MAX_DRAW_POINTS,
} from '../engine/index.js';
import { formations, baseFormations } from '../data/index.js';
import { glyph, formThumb } from './glyphs.js';
import { savedCardHTML } from './panels.js';
import { refresh, loadCall, loadSavedPlay } from './player.js';
import { loadMine, saveMine, MAX_NAME } from './storage.js';
import { touched } from './beat.js';

let mine = loadMine();
let routeTab = 'tree'; // 'tree' = the 0-9 routes, 'more' = specials and double moves, 'draw' = draw your own
let curve = false;     // line style for drawn routes
let drawing = null;    // { l, before, taps } while the player is tapping points on the field
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
  const tabs = [['tree', 'Route tree'], ['more', 'More routes'], ['draw', 'Draw']];
  $('#routeTabs').innerHTML = tabs.map(([k, t]) => `<button class="pill" data-rt="${k}" data-fk="rt:${k}" aria-pressed="${routeTab === k}">${t}</button>`).join('');
  if (routeTab === 'draw') {
    const n = drawing ? drawing.taps.length : 0;
    const r = routeFor(S.digits[si]);
    const curved = drawing ? curve : r && r.drawn ? !!r.curve : curve;
    $('#keys').innerHTML = `<div class="tn"><span class="tn-l">Line</span><button class="pill" data-curve="0" data-fk="cv:0" aria-pressed="${!curved}">Straight</button><button class="pill" data-curve="1" data-fk="cv:1" aria-pressed="${curved}">Curved</button></div>
      ${drawing
        ? `<p class="drawhelp" role="status">Tap the field where ${drawing.l} should go, one point at a time (${n} of ${MAX_DRAW_POINTS}).</p>
           <div class="row"><button class="cta" data-draw="done" data-fk="dr:done">Done</button><button class="cta ghost" data-draw="undo" data-fk="dr:undo" ${n ? '' : 'disabled'}>Undo point</button><button class="cta ghost" data-draw="cancel" data-fk="dr:cancel">Cancel</button></div>`
        : `<div class="row"><button class="cta" data-draw="start" data-fk="dr:start">Draw a route for ${S.sel}</button></div>`}`;
    return;
  }
  if (routeTab === 'tree') {
    $('#keys').innerHTML = `<div class="keys">${ROUTES.map((r, n) => `<button class="key" data-n="${n}" data-fk="k:${n}" aria-pressed="${cur.tree === n}" aria-label="Route ${n}, ${esc(r.name)}">${glyph(n)}<b>${n}</b><span>${esc(r.name)}</span></button>`).join('')}</div>`;
    return;
  }
  const keyFor = (t) => `<button class="key" data-tpl="${t.id}" data-fk="tpl:${t.id}" aria-pressed="${cur.tpl === t.id}" aria-label="${esc(t.name)}">${glyph(fromTemplate(t.id, S.sel === 'C'))}<span class="kn">${esc(t.name)}</span></button>`;
  $('#keys').innerHTML = `<div class="klabel">Specials</div><div class="keys">${templatesIn('special').map(keyFor).join('')}</div><div class="klabel">Double moves</div><div class="keys k3">${templatesIn('double').map(keyFor).join('')}</div>`;
}

/** Stem, Break and (for the center) Direction controls for the selected receiver's route. */
function renderTuner(si) {
  const cur = routeFor(S.digits[si]);
  const sits = !!cur && cur.end === 'sit';
  const endRow = cur ? `<div class="tn"><span class="tn-l">End</span><button class="pill" data-end="arrow" data-fk="end:arrow" aria-pressed="${!sits}">Arrow: keep running</button><button class="pill" data-end="sit" data-fk="end:sit" aria-pressed="${sits}">Circle: sit</button></div>` : '';
  const p = paramsOf(S.digits[si]);
  if (!p || routeTab === 'draw' || cur.drawn) { $('#tuner').innerHTML = endRow || '<div class="tn-empty">Pick or draw a route, then choose how it ends.</div>'; return; }
  const row = (label, key, val, can, up, down, what) => `<div class="tn"><span class="tn-l">${label}</span><button class="stepbtn" data-tune="${key}-" data-fk="tn:${key}-" aria-label="Shorter ${what}" ${can && val > down ? '' : 'disabled'}>−</button><output class="tn-v" aria-live="polite">${can ? unit(val) : '—'}</output><button class="stepbtn" data-tune="${key}+" data-fk="tn:${key}+" aria-label="Longer ${what}" ${can && val < up ? '' : 'disabled'}>+</button></div>`;
  $('#tuner').innerHTML = endRow +
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
    const r = routeFor(S.digits[si]);
    if (r && r.drawn) routeTab = 'draw';
    else if (src.tpl) routeTab = 'more';
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

/* ---------- drawing a route on the field ---------- */

/** Put the tapped points on the selected receiver and redraw. */
function applyTaps() {
  const { l, taps } = drawing;
  const route = drawnRoute(taps, ctx.sc.post[l], { center: l === 'C', curve, end: drawing.end });
  change(() => { S.digits = setRoute(S.digits, LET.indexOf(l), route); });
  markPoints(taps);
}

function addPoint(p) {
  if (!drawing || drawing.taps.length >= MAX_DRAW_POINTS) return;
  drawing.taps.push([Math.min(350, Math.max(10, p[0])), Math.min(390, Math.max(10, p[1]))]);
  applyTaps();
}

function startDraw() {
  const l = S.sel, si = LET.indexOf(l), before = S.digits[si];
  const r = routeFor(before);
  drawing = { l, before, was: { name: S.name, playId: S.playId }, taps: [], end: r && r.end === 'sit' ? 'sit' : 'arrow' };
  // the field lies flat while drawing, so a tap lands exactly where it looks
  document.body.classList.add('drawing');
  setDrawHandler(addPoint);
  applyTaps();
}

/** Stop drawing. keep = false (or no points) puts the old route back. */
export function endDraw(keep = true) {
  if (!drawing) return;
  const { l, before, was, taps } = drawing;
  drawing = null;
  document.body.classList.remove('drawing');
  setDrawHandler(null);
  if (!keep || !taps.length) {
    // put the old route back, and the play's name if it was a playbook play
    S.digits = setRoute(S.digits, LET.indexOf(l), before);
    Object.assign(S, was);
    refresh(false);
  }
  markPoints([]);
  renderBuilder();
}

function drawAction(what) {
  if (what === 'start') startDraw();
  else if (what === 'undo' && drawing) { drawing.taps.pop(); applyTaps(); }
  else endDraw(what === 'done');
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
    if (d.draw) return drawAction(d.draw);
    if (d.curve) {
      curve = d.curve === '1';
      if (drawing) return applyTaps();
      const r = routeFor(S.digits[si]);
      return r && r.drawn ? change(() => { S.digits = setRoute(S.digits, si, setCurve(S.digits[si], curve)); }) : renderBuilder();
    }
    if (d.end) {
      if (drawing) { drawing.end = d.end; return applyTaps(); }
      return change(() => { S.digits = setRoute(S.digits, si, setEnding(S.digits[si], d.end)); });
    }
    // anything else (another route, formation, motion, save...) finishes the drawing first
    if (drawing) endDraw(true);
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
    endDraw(true);
    const r = checkCall($('#codeIn').value);
    if (r.error) return say(r.error);
    loadCall(callText(r.play), 'My play');
    $('#codeIn').value = callText(r.play);
    say('');
  });
}
