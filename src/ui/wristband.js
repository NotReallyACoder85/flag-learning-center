// Wristband: build 4.25" x 2" cards of 6 plays, rearrange them, and print.
import { $, esc } from './dom.js';
import { S } from './state.js';
import {
  SLOTS, MAX_BANDS, emptyBand, newId, setSlot, clearSlot, swapSlots, firstEmpty, filledCount, slotPlay, cardsPerSheet,
  playbookEntries, playbookSections, playFromEntry, parseCall, callText, sanitizePlay,
} from '../engine/index.js';
import { formations } from '../data/index.js';
import { wristDiagram } from './diagrams.js';
import { thumb } from './glyphs.js';
import { loadBands, saveBands, loadMine } from './storage.js';

let state = loadBands();
let sel = null;        // the slot picked for moving or editing
let pickFor = 0;       // the slot the play picker is filling
let pickTab = 'book';  // 'book' | 'mine' | 'field'
let search = '';
let copies = 1, sheet = 'portrait', guides = true, msg = '';

const band = () => state.bands.find((b) => b.id === state.active);
const persist = () => saveBands(state);
const update = (fn) => {
  state = { ...state, bands: state.bands.map((b) => (b.id === state.active ? fn(b) : b)) };
  persist();
};
const lengthClass = (n) => (n.length <= 13 ? 'n1' : n.length <= 24 ? 'n2' : 'n3');

/** One slot, for the screen (interactive) or for print. */
function cellHTML(slot, i, interactive, color) {
  const tag = interactive ? 'button' : 'div';
  const attrs = interactive ? ` type="button" data-i="${i}"` : '';
  if (!slot) {
    return `<${tag} class="wslot empty"${attrs}${interactive ? ` aria-label="Slot ${i + 1}: empty. Tap to add a play."` : ''}><span class="wnum">${i + 1}</span>${interactive ? '<span class="wadd">+ Add play</span>' : ''}</${tag}>`;
  }
  const p = slotPlay(slot);
  const a11y = interactive ? ` draggable="true" aria-pressed="${sel === i}" aria-label="Slot ${i + 1}: ${esc(p.name)}. ${sel === i ? 'Selected. Tap another slot to swap places.' : 'Tap to select.'}"` : '';
  return `<${tag} class="wslot${interactive && sel === i ? ' sel' : ''}"${attrs}${a11y}><span class="wnum">${i + 1}</span><span class="wdia">${wristDiagram(p, color)}</span><span class="wname ${lengthClass(p.name)}">${esc(p.name)}</span></${tag}>`;
}

/** The whole card. */
function cardHTML(b, interactive) {
  const title = b.title ? `<div class="wtitle">${esc(b.title)}</div>` : '';
  return `<div class="wcard${b.color ? ' wcolor' : ''}">${title}<div class="wgrid">${b.slots.map((s, i) => cellHTML(s, i, interactive, b.color)).join('')}</div></div>`;
}

export function renderWristband() {
  const b = band(), root = $('#wristRoot');
  const filled = b.slots[sel] ? slotPlay(b.slots[sel]).name : '';
  const perSheet = cardsPerSheet(sheet === 'landscape');
  root.innerHTML = `
    <div class="wb-top">
      <label class="wb-lbl" for="wbSelect">Card</label>
      <select id="wbSelect" class="wb-select">${state.bands.map((x) => `<option value="${esc(x.id)}" ${x.id === state.active ? 'selected' : ''}>${esc(x.name)} (${filledCount(x)}/${SLOTS})</option>`).join('')}</select>
      <div class="row">
        <button class="cta ghost" data-wb="new" type="button" ${state.bands.length >= MAX_BANDS ? 'disabled' : ''}>New</button>
        <button class="cta ghost" data-wb="copy" type="button" ${state.bands.length >= MAX_BANDS ? 'disabled' : ''}>Duplicate</button>
        <button class="cta ghost" data-wb="rename" type="button">Rename</button>
        <button class="cta ghost" data-wb="delete" type="button">Delete</button>
      </div>
    </div>
    <div class="wb-opts">
      <label class="wb-field"><span>Title on the card (optional)</span><input id="wbTitle" type="text" maxlength="40" value="${esc(b.title)}" placeholder="Game 3: Eagles"></label>
      <label class="wb-check"><input id="wbColor" type="checkbox" ${b.color ? 'checked' : ''}> Color (uses more ink; black and white prints best)</label>
    </div>
    <div class="wb-cardwrap">${cardHTML(b, true)}<p class="hint">Exactly 4.25 inches wide and 2 inches tall when printed.</p></div>
    <div class="wb-act" role="group" aria-label="Slot actions" aria-live="polite">${
      sel !== null && b.slots[sel]
        ? `<b>Slot ${sel + 1}: ${esc(filled)}</b><button class="cta ghost" data-wb="change" type="button">Change play</button><button class="cta ghost" data-wb="clear" type="button">Clear</button><button class="cta ghost" data-wb="done" type="button">Done</button><p class="hint">Tap another slot to swap places. You can also drag one slot onto another.</p>`
        : '<p class="hint">Tap an empty slot to add a play. Tap a filled slot to select it, then tap another slot to swap places. You can also drag.</p>'
    }</div>
    ${msg ? `<div class="wb-msg" role="status">${esc(msg)}</div>` : ''}
    <div class="wb-print glass">
      <div class="lbl">Print</div>
      <div class="tn"><span class="tn-l">Copies</span><button class="stepbtn" data-wb="copies-" aria-label="Fewer copies" ${copies <= 1 ? 'disabled' : ''}>−</button><output class="tn-v" aria-live="polite">${copies}</output><button class="stepbtn" data-wb="copies+" aria-label="More copies" ${copies >= 40 ? 'disabled' : ''}>+</button></div>
      <label class="wb-field"><span>Sheet</span><select id="wbSheet" class="wb-select"><option value="portrait" ${sheet === 'portrait' ? 'selected' : ''}>Letter, upright: 5 cards per page</option><option value="landscape" ${sheet === 'landscape' ? 'selected' : ''}>Letter, sideways: 8 cards per page</option></select></label>
      <label class="wb-check"><input id="wbGuides" type="checkbox" ${guides ? 'checked' : ''}> Cut guides (a thin dashed outline)</label>
      <button class="cta" data-wb="print" type="button">Print ${copies} ${copies === 1 ? 'card' : 'cards'} (${Math.ceil(copies / perSheet)} ${Math.ceil(copies / perSheet) === 1 ? 'page' : 'pages'})</button>
      <p class="hint">In the print dialog, set Scale to 100% (not "Fit to page") and turn off headers and footers, so the card prints at its true size.</p>
    </div>`;
}

/* ---------- play picker ---------- */

let dlg = null;
const slotName = (slot) => slotPlay(slot).name;

function itemHTML(attr, name, sub, svg) {
  return `<button class="wbitem" type="button" ${attr}><span class="th">${svg}</span><span class="wbi-n">${esc(name)}</span><span class="wbi-s">${esc(sub)}</span></button>`;
}

/** The play on the field right now, as something a slot can hold (or null if it is not finished). */
function fieldSlot() {
  if (S.playId) return { pb: S.playId };
  if (S.digits.some((d) => d == null)) return null;
  const name = S.name && S.name !== 'My play' ? S.name : 'My play';
  if (S.digits.every((d) => typeof d === 'number')) return { name, code: callText(S) };
  const play = sanitizePlay({ form: S.form, motion: S.motion, routes: S.digits });
  return play ? { name, play } : null;
}

function renderPicker() {
  const q = search.trim().toLowerCase();
  let body = '';
  if (pickTab === 'book') {
    body = playbookSections.map((sec) => {
      const items = playbookEntries.filter((e) => e.section === sec.id && (!q || e.name.toLowerCase().includes(q)));
      return items.length ? `<h3 class="grp-h">${esc(sec.name)}</h3><div class="wbgrid">${items.map((e) => itemHTML(`data-pb="${esc(e.id)}"`, e.name, formations[e.formation].name + (e.motion ? ' · Motion' : ''), thumb(playFromEntry(e)))).join('')}</div>` : '';
    }).join('') || '<p class="hint">No plays match.</p>';
  } else if (pickTab === 'mine') {
    const mine = loadMine();
    const items = mine.map((p, i) => ({ p, i })).filter(({ p }) => !q || p.name.toLowerCase().includes(q));
    body = items.length
      ? `<div class="wbgrid">${items.map(({ p, i }) => {
          const play = p.code ? parseCall(p.code) : { form: p.play.form, digits: p.play.routes, motion: p.play.motion };
          return itemHTML(`data-mine="${i}"`, p.name, p.code || 'Custom routes', thumb(play));
        }).join('')}</div>`
      : '<p class="hint">Nothing saved yet. Build a play in Draw Up and tap Save play, and it will show up here.</p>';
  } else {
    const slot = fieldSlot();
    body = slot
      ? `<div class="wbgrid">${itemHTML('data-field="1"', slotName(slot), 'On the field now', thumb(slotPlay(slot)))}</div>`
      : '<p class="hint">The play on the field is not finished yet. Give every receiver a route in Draw Up first.</p>';
  }
  $('#wbDlgBody').innerHTML = body;
  dlg.querySelectorAll('.wbtab').forEach((t) => t.setAttribute('aria-pressed', t.dataset.tab === pickTab));
  $('#wbSearch').style.display = pickTab === 'field' ? 'none' : '';
}

function openPicker(i) {
  pickFor = i;
  search = '';
  $('#wbSearch').value = '';
  $('#wbDlgTitle').textContent = `Pick a play for slot ${i + 1}`;
  renderPicker();
  if (!dlg.open) dlg.showModal();
}

function choose(slot) {
  if (!slot) return;
  update((b) => setSlot(b, pickFor, slot));
  dlg.close();
  sel = null;
  msg = '';
  renderWristband();
}

function initPicker() {
  dlg = document.createElement('dialog');
  dlg.className = 'wbdlg';
  dlg.setAttribute('aria-labelledby', 'wbDlgTitle');
  dlg.innerHTML = `<div class="wbdlg-in">
      <div class="thead"><h2 id="wbDlgTitle" class="qtext">Pick a play</h2><button class="back" data-close="1" type="button">Close</button></div>
      <div class="pills" role="group" aria-label="Where to pick from"><button class="pill wbtab" data-tab="book" type="button">Playbook</button><button class="pill wbtab" data-tab="mine" type="button">My plays</button><button class="pill wbtab" data-tab="field" type="button">On the field</button></div>
      <input id="wbSearch" class="wb-search" type="search" placeholder="Search plays" aria-label="Search plays" autocomplete="off">
      <div id="wbDlgBody"></div>
    </div>`;
  document.body.appendChild(dlg);
  dlg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (e.target === dlg) return dlg.close(); // a click on the dim background
    if (!b) return;
    if (b.dataset.close) dlg.close();
    else if (b.dataset.tab) { pickTab = b.dataset.tab; renderPicker(); }
    else if (b.dataset.pb) choose({ pb: b.dataset.pb });
    else if (b.dataset.mine !== undefined) {
      const p = loadMine()[+b.dataset.mine];
      if (p) choose(p.code ? { name: p.name, code: p.code } : { name: p.name, play: p.play });
    } else if (b.dataset.field) choose(fieldSlot());
  });
  $('#wbSearch').addEventListener('input', (e) => { search = e.target.value; renderPicker(); });
}

/* ---------- printing ---------- */

function cleanupPrint() {
  const r = $('#printRoot'), st = $('#printPage');
  if (r) r.remove();
  if (st) st.remove();
}

/** Put N copies of the card in a hidden sheet, size the page, and open the print dialog. */
function printCards() {
  const b = band();
  if (!filledCount(b)) { msg = 'Add at least one play before printing.'; return renderWristband(); }
  cleanupPrint();
  const root = document.createElement('div');
  root.id = 'printRoot';
  root.className = guides ? 'guides' : '';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = Array.from({ length: copies }, () => cardHTML(b, false)).join('');
  const st = document.createElement('style');
  st.id = 'printPage';
  st.textContent = `@page{size:letter ${sheet === 'landscape' ? 'landscape' : 'portrait'};margin:.25in}`;
  document.head.appendChild(st);
  document.body.appendChild(root);
  window.addEventListener('afterprint', cleanupPrint, { once: true });
  window.print();
}

/* ---------- actions ---------- */

function slotClick(i) {
  const b = band();
  if (sel === null) {
    if (!b.slots[i]) return openPicker(i);
    sel = i;
  } else if (sel === i) sel = null;
  else {
    update((x) => swapSlots(x, sel, i)); // swap with a filled slot, or move into an empty one
    sel = null;
  }
  msg = '';
  renderWristband();
  const again = $(`.wslot[data-i="${sel === null ? i : sel}"]`);
  if (again) again.focus({ preventScroll: true });
}

/** Add a play to the first empty slot of the active card (used by the Playbook's "Add to wristband" button). */
export function addToActiveCard(slot) {
  const b = band(), i = firstEmpty(b);
  if (i < 0) return `"${b.name}" is full. Open the Wristband tab to replace a slot.`;
  update((x) => setSlot(x, i, slot));
  return `Added to "${b.name}", slot ${i + 1}.`;
}

export function initWristband() {
  initPicker();
  const root = $('#wristRoot');
  root.addEventListener('click', (e) => {
    const slot = e.target.closest('.wslot');
    if (slot) return slotClick(+slot.dataset.i);
    const b = e.target.closest('button');
    if (!b || !b.dataset.wb) return;
    const act = b.dataset.wb, cur = band();
    if (act === 'new') {
      const nb = emptyBand(`Wristband ${state.bands.length + 1}`);
      state = { bands: [...state.bands, nb], active: nb.id }; sel = null; persist();
    } else if (act === 'copy') {
      const nb = { ...cur, id: newId(), name: (cur.name + ' copy').slice(0, 30) };
      state = { bands: [...state.bands, nb], active: nb.id }; sel = null; persist();
    } else if (act === 'rename') {
      const name = window.prompt('Name this card:', cur.name);
      if (name === null) return;
      update((x) => ({ ...x, name: name.trim().slice(0, 30) || x.name }));
    } else if (act === 'delete') {
      if (!window.confirm(`Delete "${cur.name}"?`)) return;
      const rest = state.bands.filter((x) => x.id !== cur.id);
      const bands = rest.length ? rest : [emptyBand()];
      state = { bands, active: bands[0].id }; sel = null; persist();
    } else if (act === 'change') openPicker(sel);
    else if (act === 'clear') { update((x) => clearSlot(x, sel)); sel = null; }
    else if (act === 'done') sel = null;
    else if (act === 'copies-') copies = Math.max(1, copies - 1);
    else if (act === 'copies+') copies = Math.min(40, copies + 1);
    else if (act === 'print') return printCards();
    msg = '';
    renderWristband();
  });
  root.addEventListener('change', (e) => {
    if (e.target.id === 'wbSelect') { state = { ...state, active: e.target.value }; persist(); sel = null; msg = ''; renderWristband(); }
    else if (e.target.id === 'wbColor') { update((x) => ({ ...x, color: e.target.checked })); renderWristband(); }
    else if (e.target.id === 'wbSheet') { sheet = e.target.value; renderWristband(); }
    else if (e.target.id === 'wbGuides') { guides = e.target.checked; }
  });
  root.addEventListener('input', (e) => {
    if (e.target.id === 'wbTitle') {
      update((x) => ({ ...x, title: e.target.value.slice(0, 40) }));
      const card = $('.wb-cardwrap .wcard'), t = e.target.value.trim();
      // update the title on the card without redrawing (so typing keeps its place)
      let el = card.querySelector('.wtitle');
      if (t && !el) { el = document.createElement('div'); el.className = 'wtitle'; card.prepend(el); }
      if (el) { if (t) el.textContent = t; else el.remove(); }
    }
  });
  // drag one slot onto another to swap (mouse; tap-to-swap covers touch)
  let dragFrom = null;
  root.addEventListener('dragstart', (e) => { const s = e.target.closest('.wslot[data-i]'); if (!s) return; dragFrom = +s.dataset.i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragFrom)); });
  root.addEventListener('dragover', (e) => { if (dragFrom !== null && e.target.closest('.wslot')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } });
  root.addEventListener('drop', (e) => {
    const s = e.target.closest('.wslot[data-i]');
    if (dragFrom === null || !s) return;
    e.preventDefault();
    const to = +s.dataset.i;
    if (to !== dragFrom) update((x) => swapSlots(x, dragFrom, to));
    dragFrom = null; sel = null; renderWristband();
  });
  root.addEventListener('dragend', () => { dragFrom = null; });
}
