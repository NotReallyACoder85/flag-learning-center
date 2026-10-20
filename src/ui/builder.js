// Draw Up: formation, routes, motion, type-a-call, and My Plays.
import { $, cap, esc } from './dom.js';
import { S } from './state.js';
import { LET, ROUTES, checkCall, callText, erasedPlay, setRoute, setMotionWho, setMotionTag } from '../engine/index.js';
import { formations } from '../data/index.js';
import { glyph, formThumb } from './glyphs.js';
import { cardHTML } from './panels.js';
import { refresh, loadCall } from './player.js';
import { loadMine, saveMine, MAX_NAME } from './storage.js';
import { touched } from './beat.js';

let mine = loadMine();

function say(msg, ok = false) {
  const m = $('#codeErr');
  m.textContent = msg;
  m.classList.toggle('ok', ok);
}

/** Apply an edit to the play, then redraw and run it. */
function change(fn) {
  fn();
  S.name = 'My play';
  say('');
  touched();
  refresh(false);
}

export function renderBuilder() {
  const si = LET.indexOf(S.sel);
  $('#formRow').innerHTML = Object.keys(formations)
    .map((k) => `<button class="fcard" data-f="${k}" data-fk="f:${k}" aria-pressed="${S.form === k}">${formThumb(k)}<b>${formations[k].name}</b></button>`)
    .join('');
  $('#keyLbl').textContent = '2 · Route for receiver ' + S.sel;
  $('#keys').innerHTML = ROUTES
    .map((r, n) => `<button class="key" data-n="${n}" data-fk="k:${n}" aria-pressed="${S.digits[si] === n}" aria-label="Route ${n}, ${esc(r.name)}">${glyph(n)}<b>${n}</b><span>${esc(r.name)}</span></button>`)
    .join('');
  $('#mWho').innerHTML = ['None', 'A', 'B', 'Y', 'Z']
    .map((w) => `<button class="pill" data-w="${w}" data-fk="w:${w}" aria-pressed="${(S.motion ? S.motion.who : 'None') === w}">${w === 'None' ? 'No motion' : w}</button>`)
    .join('');
  $('#mTag').innerHTML = ['cross', 'enter', 'exit']
    .map((t) => `<button class="pill" data-t="${t}" data-fk="t:${t}" aria-pressed="${!!S.motion && S.motion.tag === t}" ${S.motion ? '' : 'disabled'}>${cap(t)}</button>`)
    .join('');
  const input = $('#codeIn');
  if (document.activeElement !== input) input.value = callText(S);
  $('#mine').innerHTML = mine.length
    ? mine
        .map((p, i) => `<div class="mine">${cardHTML(p.code, p.name, `data-mi="${i}"`, false)}<div class="macts"><button class="xbtn" data-ren="${i}" aria-label="Rename ${esc(p.name)}">Rename</button><button class="xbtn del" data-del="${i}" aria-label="Delete ${esc(p.name)}">Delete</button></div></div>`)
        .join('')
    : '<div class="empty">Nothing saved yet. Build a play and tap Save play.</div>';
}

function save() {
  if (S.digits.some((d) => d == null)) return say('Give every receiver a route before saving.');
  const code = callText(S);
  if (mine.some((p) => p.code.toLowerCase() === code.toLowerCase())) return say('That play is already saved.');
  mine.unshift({ code, name: 'My play ' + (mine.length + 1) });
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

export function initBuilder() {
  const panel = $('#p-build');
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !panel.contains(b)) return;
    const d = b.dataset;
    if (d.f) change(() => { S.form = d.f; });
    else if (d.n) change(() => { S.digits = setRoute(S.digits, LET.indexOf(S.sel), +d.n); });
    else if (d.w) change(() => { S.motion = setMotionWho(S.motion, d.w); });
    else if (d.t) change(() => { S.motion = setMotionTag(S.motion, d.t); });
    else if (d.mi !== undefined || b.classList.contains('card')) {
      const p = mine[b.dataset.mi];
      if (p) loadCall(p.code, p.name);
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

