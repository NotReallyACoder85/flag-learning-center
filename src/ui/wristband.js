// Wristband: an arm band set is 3 inserts (4.25" x 2"), each a card of 6 plays or the route tree. Build, reorder, print.
import { $, esc } from './dom.js';
import { S } from './state.js';
import {
  SLOTS, INSERTS, MAX_BANDS, emptyBand, newId, flatPositions, flatCount, flatOf, getFlat, setFlat, clearFlat, swapFlat, moveFlat, firstEmptyFlat, filledCount,
  setCardType, setCardTitle, slotPlay, printableCards, cardsPerSheet,
  playbookEntries, playbookSections, playFromEntry, parseCall, callText, sanitizePlay,
} from '../engine/index.js';
import { formations, routes } from '../data/index.js';
import { wristDiagram } from './diagrams.js';
import { thumb } from './glyphs.js';
import { loadBands, saveBands, loadMine } from './storage.js';

let state = loadBands();
let sel = null;        // the play position (0-17) picked for moving or editing
let pickFor = 0;       // the position the play picker is filling
let pickTab = 'book';  // 'book' | 'mine' | 'field'
let search = '';
let copies = 1, sheet = 'portrait', guides = true, msg = '', undo = null;

const band = () => state.bands.find((b) => b.id === state.active);
const persist = () => saveBands(state);
const update = (fn) => {
  state = { ...state, bands: state.bands.map((b) => (b.id === state.active ? fn(b) : b)) };
  persist();
};
const lengthClass = (n) => (n.length <= 13 ? 'n1' : n.length <= 24 ? 'n2' : 'n3');

/** One play slot, for the screen (interactive) or for print. f = play number minus 1. */
function cellHTML(slot, f, interactive, b) {
  const tag = interactive ? 'button' : 'div';
  const attrs = interactive ? ` type="button" data-f="${f}"` : '';
  if (!slot) {
    return `<${tag} class="wslot empty"${attrs}${interactive ? ` aria-label="Play ${f + 1}: empty. Tap to add a play."` : ''}><span class="wnum">${f + 1}</span>${interactive ? '<span class="wadd">+ Add play</span>' : ''}</${tag}>`;
  }
  const p = slotPlay(slot);
  const a11y = interactive ? ` draggable="true" aria-pressed="${sel === f}" aria-label="Play ${f + 1}: ${esc(p.name)}. ${sel === f ? 'Selected. Tap another slot to swap places.' : 'Tap to select.'}"` : '';
  const name = b.names ? `<span class="wname ${lengthClass(p.name)}">${esc(p.name)}</span>` : '';
  return `<${tag} class="wslot${interactive && sel === f ? ' sel' : ''}"${attrs}${a11y}><span class="wnum">${f + 1}</span><span class="wdia">${wristDiagram(p, b.color)}</span>${name}</${tag}>`;
}

/** A small black route picture for the route tree table. Same shape as the Route diagram: sideline on the left. */
function treePic(r) {
  const pts = [[20, 43]].concat(r.points.map(([lat, d]) => [20 - lat * 1.9, 43 - d * 2]));
  const a = pts[pts.length - 2], z = pts[pts.length - 1];
  const ang = (Math.atan2(z[1] - a[1], z[0] - a[0]) * 180) / Math.PI;
  return `<svg viewBox="0 0 40 46" aria-hidden="true"><polyline points="${pts.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ')}" fill="none" stroke="#111" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M0 0L-5 -3L-5 3Z" fill="#111" transform="translate(${z[0].toFixed(1)},${z[1].toFixed(1)}) rotate(${ang.toFixed(1)})"/><circle cx="20" cy="43" r="2.6" fill="#111"/></svg>`;
}

/** The route tree as a table: number, name, and (optionally) the route drawn small. 5 rows in 2 columns. */
function treeHTML(b, c) {
  const rows = routes.map((r) => `<div class="wtrow"><span class="wtn">${r.id}</span>${b.pics ? `<span class="wtp">${treePic(r)}</span>` : ''}<span class="wtt">${esc(r.name)}</span></div>`).join('');
  return `<div class="wcard wtree"><div class="wtitle">${esc(c.title || 'Route tree')}</div><div class="wtgrid">${rows}</div></div>`;
}

/** One insert. */
function cardHTML(b, ci, interactive) {
  const c = b.cards[ci];
  if (c.type === 'tree') return treeHTML(b, c);
  const title = c.title ? `<div class="wtitle">${esc(c.title)}</div>` : '';
  const cells = c.slots.map((s, k) => cellHTML(s, flatOf(b, ci, k), interactive, b)).join('');
  return `<div class="wcard${b.color ? ' wcolor' : ''}">${title}<div class="wgrid">${cells}</div></div>`;
}

/** The order list: every play position, with move earlier / later, change and remove. */
function orderHTML(b) {
  const n = flatCount(b);
  const rows = flatPositions(b).map((_, f) => {
    const slot = getFlat(b, f);
    if (!slot) return `<li class="wbrow empty"><span class="wbr-n">${f + 1}</span><span class="wbr-t">Empty</span><button class="cta ghost wbr-b" data-wb="add" data-f="${f}" type="button" aria-label="Add a play at position ${f + 1}">+ Add</button></li>`;
    const p = slotPlay(slot);
    return `<li class="wbrow${sel === f ? ' sel' : ''}"><span class="wbr-n">${f + 1}</span><span class="wbr-t">${esc(p.name)}</span>
      <span class="wbr-btns">
        <button class="stepbtn" data-wb="up" data-f="${f}" type="button" aria-label="Move ${esc(p.name)} earlier, to ${f}" ${f === 0 ? 'disabled' : ''}>↑</button>
        <button class="stepbtn" data-wb="down" data-f="${f}" type="button" aria-label="Move ${esc(p.name)} later, to ${f + 2}" ${f === n - 1 ? 'disabled' : ''}>↓</button>
        <button class="cta ghost wbr-b" data-wb="change" data-f="${f}" type="button" aria-label="Change ${esc(p.name)}">Change</button>
        <button class="cta ghost wbr-b wbr-x" data-wb="remove" data-f="${f}" type="button" aria-label="Remove ${esc(p.name)} from the wristband">Remove</button>
      </span></li>`;
  }).join('');
  return `<ol class="wb-order">${rows}</ol>`;
}

export function renderWristband() {
  const b = band(), root = $('#wristRoot');
  const hasTree = b.cards.some((c) => c.type === 'tree');
  const sets = printableCards(b).length;
  const inserts = sets * copies;
  const perSheet = cardsPerSheet(sheet === 'landscape');
  const pages = Math.ceil(inserts / perSheet);
  const total = flatCount(b);
  root.innerHTML = `
    <div class="wb-top">
      <label class="wb-lbl" for="wbSelect">Arm band set</label>
      <select id="wbSelect" class="wb-select">${state.bands.map((x) => `<option value="${esc(x.id)}" ${x.id === state.active ? 'selected' : ''}>${esc(x.name)} (${filledCount(x)}/${flatCount(x)} plays)</option>`).join('')}</select>
      <div class="row">
        <button class="cta ghost" data-wb="new" type="button" ${state.bands.length >= MAX_BANDS ? 'disabled' : ''}>New</button>
        <button class="cta ghost" data-wb="copy" type="button" ${state.bands.length >= MAX_BANDS ? 'disabled' : ''}>Duplicate</button>
        <button class="cta ghost" data-wb="rename" type="button">Rename</button>
        <button class="cta ghost" data-wb="delete" type="button">Delete</button>
      </div>
    </div>
    <div class="wb-opts">
      <label class="wb-check"><input id="wbNames" type="checkbox" ${b.names ? 'checked' : ''}> Show play names under each diagram (off gives the diagrams more room)</label>
      <label class="wb-check"><input id="wbColor" type="checkbox" ${b.color ? 'checked' : ''}> Color (uses more ink; black and white prints best)</label>
      ${hasTree ? `<label class="wb-check"><input id="wbPics" type="checkbox" ${b.pics ? 'checked' : ''}> Draw each route next to its name on the route tree</label>` : ''}
    </div>
    ${msg ? `<div class="wb-msg" role="status">${esc(msg)}${undo ? ' <button class="cta ghost" data-wb="undo" type="button">Undo</button>' : ''}</div>` : ''}
    ${b.cards.map((c, ci) => `
    <section class="wb-ins" aria-label="Insert ${ci + 1}">
      <div class="wb-inshead">
        <h3 class="grp-h">Insert ${ci + 1}</h3>
        <div class="pills" role="group" aria-label="Insert ${ci + 1} contents">
          <button class="pill" data-wb="type" data-ci="${ci}" data-v="plays" aria-pressed="${c.type === 'plays'}" type="button">6 plays</button>
          <button class="pill" data-wb="type" data-ci="${ci}" data-v="tree" aria-pressed="${c.type === 'tree'}" type="button">Route tree</button>
        </div>
      </div>
      <label class="wb-field"><span>Title on this insert (optional)</span><input class="wbCardTitle" data-ci="${ci}" type="text" maxlength="40" value="${esc(c.title)}" placeholder="${c.type === 'tree' ? 'Route tree' : 'Game 3: Eagles'}"></label>
      <div class="wb-cardwrap">${cardHTML(b, ci, true)}</div>
    </section>`).join('')}
    <p class="hint">Each insert is exactly 4.25 inches wide and 2 inches tall when printed. Tap an empty slot to add a play. Tap a play, then another slot, to swap places (or drag on a computer).</p>
    <section class="wb-ordersec glass" aria-label="Order and remove plays">
      <div class="lbl">Order and remove (${filledCount(b)} of ${total} plays)</div>
      <p class="hint">Use the arrows to move a play earlier or later. It can move from one insert to the next. Remove takes it off the wristband.</p>
      ${orderHTML(b)}
    </section>
    <div class="wb-print glass">
      <div class="lbl">Print</div>
      <div class="tn"><span class="tn-l">Sets</span><button class="stepbtn" data-wb="copies-" aria-label="Fewer sets" ${copies <= 1 ? 'disabled' : ''}>−</button><output class="tn-v" aria-live="polite">${copies}</output><button class="stepbtn" data-wb="copies+" aria-label="More sets" ${copies >= 40 ? 'disabled' : ''}>+</button></div>
      <p class="hint">One set is every insert above that has plays on it, plus the route tree if you chose it (${sets} ${sets === 1 ? 'insert' : 'inserts'}).</p>
      <label class="wb-field"><span>Sheet</span><select id="wbSheet" class="wb-select"><option value="portrait" ${sheet === 'portrait' ? 'selected' : ''}>Letter, upright: 5 inserts per page</option><option value="landscape" ${sheet === 'landscape' ? 'selected' : ''}>Letter, sideways: 8 inserts per page</option></select></label>
      <label class="wb-check"><input id="wbGuides" type="checkbox" ${guides ? 'checked' : ''}> Cut guides (a thin dashed outline)</label>
      <button class="cta" data-wb="print" type="button" ${sets ? '' : 'disabled'}>Print ${copies} ${copies === 1 ? 'set' : 'sets'} (${inserts} inserts, ${pages} ${pages === 1 ? 'page' : 'pages'})</button>
      <p class="hint">In the print dialog, set Scale to 100% (not "Fit to page") and turn off headers and footers, so the inserts print at true size.</p>
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
  $('#wbDlgTitle').textContent = `Pick a play for position ${i + 1}`;
  renderPicker();
  if (!dlg.open) dlg.showModal();
}

function choose(slot) {
  if (!slot) return;
  update((b) => setFlat(b, pickFor, slot));
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

/** Put N copies of the set (each printable insert) in a hidden sheet, size the page, and open the print dialog. */
function printCards() {
  const b = band(), list = printableCards(b);
  if (!list.length) { msg = 'Add at least one play before printing.'; undo = null; return renderWristband(); }
  cleanupPrint();
  const root = document.createElement('div');
  root.id = 'printRoot';
  root.className = guides ? 'guides' : '';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = Array.from({ length: copies }, () => list.map(({ ci }) => cardHTML(b, ci, false)).join('')).join('');
  const st = document.createElement('style');
  st.id = 'printPage';
  st.textContent = `@page{size:letter ${sheet === 'landscape' ? 'landscape' : 'portrait'};margin:.25in}`;
  document.head.appendChild(st);
  document.body.appendChild(root);
  window.addEventListener('afterprint', cleanupPrint, { once: true });
  window.print();
}

/* ---------- actions ---------- */

const focusSoon = (q) => { const el = $(q); if (el) el.focus({ preventScroll: true }); };

function slotClick(f) {
  const b = band();
  if (sel === null) {
    if (!getFlat(b, f)) return openPicker(f);
    sel = f;
  } else if (sel === f) sel = null;
  else {
    update((x) => swapFlat(x, sel, f)); // swap with a filled slot, or move into an empty one
    sel = null;
  }
  msg = ''; undo = null;
  renderWristband();
  focusSoon(`.wslot[data-f="${f}"]`);
}

/** Add a play to the first empty position of the active set (used by the Playbook's "Add to wristband" button). */
export function addToActiveCard(slot) {
  const b = band(), f = firstEmptyFlat(b);
  if (f < 0) return `"${b.name}" is full. Open the Wristband tab to remove or replace a play.`;
  update((x) => setFlat(x, f, slot));
  return `Added to "${b.name}" as play ${f + 1}.`;
}

export function initWristband() {
  initPicker();
  const root = $('#wristRoot');
  root.addEventListener('click', (e) => {
    const slot = e.target.closest('.wslot');
    if (slot) return slotClick(+slot.dataset.f);
    const b = e.target.closest('button');
    if (!b || !b.dataset.wb) return;
    const act = b.dataset.wb, cur = band(), f = +b.dataset.f;
    let refocus = null;
    if (act === 'new') {
      const nb = emptyBand(`Wristband ${state.bands.length + 1}`);
      state = { bands: [...state.bands, nb], active: nb.id }; sel = null; persist();
    } else if (act === 'copy') {
      const nb = { ...cur, id: newId(), name: (cur.name + ' copy').slice(0, 30) };
      state = { bands: [...state.bands, nb], active: nb.id }; sel = null; persist();
    } else if (act === 'rename') {
      const name = window.prompt('Name this arm band set:', cur.name);
      if (name === null) return;
      update((x) => ({ ...x, name: name.trim().slice(0, 30) || x.name }));
    } else if (act === 'delete') {
      if (!window.confirm(`Delete "${cur.name}"?`)) return;
      const rest = state.bands.filter((x) => x.id !== cur.id);
      const bands = rest.length ? rest : [emptyBand()];
      state = { bands, active: bands[0].id }; sel = null; persist();
    } else if (act === 'type') {
      update((x) => setCardType(x, +b.dataset.ci, b.dataset.v)); sel = null;
    } else if (act === 'add' || act === 'change') return openPicker(f);
    else if (act === 'up' || act === 'down') {
      const g = f + (act === 'up' ? -1 : 1);
      update((x) => moveFlat(x, f, act === 'up' ? -1 : 1));
      sel = null;
      refocus = `[data-wb="${act}"][data-f="${g}"]:not(:disabled), [data-wb="${act === 'up' ? 'down' : 'up'}"][data-f="${g}"]:not(:disabled)`;
    } else if (act === 'remove') {
      const was = getFlat(cur, f);
      update((x) => clearFlat(x, f)); sel = null;
      undo = { id: cur.id, f, slot: was };
      msg = `Removed "${slotPlay(was).name}" (play ${f + 1}).`;
      renderWristband();
      return focusSoon('.wb-msg button');
    } else if (act === 'undo') {
      if (undo && undo.id === cur.id) {
        const g = getFlat(cur, undo.f) == null ? undo.f : firstEmptyFlat(cur);
        if (g >= 0) update((x) => setFlat(x, g, undo.slot));
      }
      undo = null; msg = '';
      return renderWristband();
    } else if (act === 'copies-') copies = Math.max(1, copies - 1);
    else if (act === 'copies+') copies = Math.min(40, copies + 1);
    else if (act === 'print') return printCards();
    msg = ''; undo = null;
    renderWristband();
    if (refocus) focusSoon(refocus);
  });
  root.addEventListener('change', (e) => {
    const id = e.target.id;
    if (id === 'wbSelect') { state = { ...state, active: e.target.value }; persist(); sel = null; msg = ''; undo = null; renderWristband(); }
    else if (id === 'wbColor') { update((x) => ({ ...x, color: e.target.checked })); renderWristband(); }
    else if (id === 'wbNames') { update((x) => ({ ...x, names: e.target.checked })); renderWristband(); }
    else if (id === 'wbPics') { update((x) => ({ ...x, pics: e.target.checked })); renderWristband(); }
    else if (id === 'wbSheet') { sheet = e.target.value; renderWristband(); }
    else if (id === 'wbGuides') { guides = e.target.checked; }
  });
  root.addEventListener('input', (e) => {
    if (!e.target.classList.contains('wbCardTitle')) return;
    const ci = +e.target.dataset.ci, t = e.target.value.trim();
    update((x) => setCardTitle(x, ci, e.target.value));
    // update the title on the card without redrawing (so typing keeps its place)
    const card = e.target.closest('.wb-ins').querySelector('.wcard'), tree = band().cards[ci].type === 'tree';
    let el = card.querySelector('.wtitle');
    if (t && !el) { el = document.createElement('div'); el.className = 'wtitle'; card.prepend(el); }
    if (el) { if (t) el.textContent = t; else if (tree) el.textContent = 'Route tree'; else el.remove(); }
  });
  // drag one slot onto another to swap (mouse; tap-to-swap covers touch)
  let dragFrom = null;
  root.addEventListener('dragstart', (e) => { const s = e.target.closest('.wslot[data-f]'); if (!s) return; dragFrom = +s.dataset.f; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragFrom)); });
  root.addEventListener('dragover', (e) => { if (dragFrom !== null && e.target.closest('.wslot')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } });
  root.addEventListener('drop', (e) => {
    const s = e.target.closest('.wslot[data-f]');
    if (dragFrom === null || !s) return;
    e.preventDefault();
    const to = +s.dataset.f;
    if (to !== dragFrom) update((x) => swapFlat(x, dragFrom, to));
    dragFrom = null; sel = null; renderWristband();
  });
  root.addEventListener('dragend', () => { dragFrom = null; });
}
