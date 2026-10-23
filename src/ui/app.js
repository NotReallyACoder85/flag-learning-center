// Boot and event wiring.
import { $ } from './dom.js';
import { S } from './state.js';
import { findEntry, playbookEntries } from '../engine/index.js';
import { drawStatic, setPickHandler, markSelected } from './field.js';
import { refresh, loadCall, loadPlay, togglePlay, play, replay, seek, onRefresh, reduceMotion } from './player.js';
import { renderTiles, renderPlaybook } from './panels.js';
import { renderBuilder, initBuilder } from './builder.js';
import { syncView } from './view.js';
import { initTrain, showHub, exitTrain } from './train/index.js';
import { initBeat, startChallenge } from './beat.js';
import { initWristband, renderWristband, addToActiveCard } from './wristband.js';

const TABS = ['play', 'build', 'wrist', 'train'];

function setTab(t) {
  setTheater(false);
  if (S.tab === 'train' && t !== 'train') exitTrain();
  S.tab = t;
  document.body.dataset.tab = t;
  syncView();
  TABS.forEach((k) => {
    $('#p-' + k).hidden = k !== t;
    $('#tab-' + k).setAttribute('aria-selected', k === t);
    $('#tab-' + k).tabIndex = k === t ? 0 : -1; // only the current tab is in the Tab order; arrows move between tabs
  });
  renderTiles();
  renderPlaybook();
  renderBuilder();
  markSelected();
  if (t === 'train') showHub();
  if (t === 'wrist') renderWristband();
}

/** Choose which receiver the route keypad edits. */
function pickRecv(l) {
  S.sel = l;
  if (S.tab !== 'build') setTab('build');
  else { renderTiles(); renderBuilder(); markSelected(); }
}

/**
 * Full-window field. The field grows to fill the window; only Play, the defense choices and the arrows stay.
 * Everything behind it is made inert so Tab and screen readers stay inside.
 */
function setTheater(on) {
  const body = document.body;
  if (on === body.classList.contains('theater')) return;
  body.classList.toggle('theater', on);
  const btn = $('#expandBtn');
  btn.setAttribute('aria-pressed', on);
  btn.setAttribute('aria-label', on ? 'Close the full-window field' : 'Enlarge field');
  const behind = [$('.nav'), $('.side'), $('.installtip'), ...document.querySelectorAll('.stage > :not(#pitchwrap)')];
  behind.forEach((el) => { if (el) el.inert = on; });
  const wrap = $('#pitchwrap');
  if (on) { wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-label', 'Field, full window'); }
  else { wrap.removeAttribute('role'); wrap.removeAttribute('aria-label'); }
  // put focus on the play button inside (so the space bar plays), or back on the Enlarge button when closing
  (on ? $(S.tab === 'play' ? '#pbPlay' : '#miniPlay') : btn).focus({ preventScroll: true });
}

/** Move to the previous (-1) or next (+1) play in the playbook, and bring it into view in its row. */
function stepPlay(dir) {
  const at = S.playId ? playbookEntries.findIndex((e) => e.id === S.playId) : -1;
  const to = at < 0 ? 0 : at + dir;
  if (to < 0 || to >= playbookEntries.length) return;
  loadPlay(playbookEntries[to]);
  const card = $('#plays .card[aria-pressed="true"]');
  if (!card) return;
  const row = card.parentElement, behavior = reduceMotion ? 'auto' : 'smooth';
  row.scrollTo({ left: card.offsetLeft - (row.clientWidth - card.offsetWidth) / 2, behavior });
  const rect = card.closest('.grp').getBoundingClientRect(), pin = $('#pitchwrap').getBoundingClientRect();
  if (document.body.dataset.stick && (rect.top < pin.bottom || rect.bottom > innerHeight)) card.closest('.grp').scrollIntoView({ block: 'start', behavior });
}

/** Keep --pin-h equal to the height of the pinned field block, so scrolling to a row stops just below it. */
function trackPinnedHeight() {
  const pw = $('#pitchwrap');
  const set = () => document.documentElement.style.setProperty('--pin-h', pw.getBoundingClientRect().height + 'px');
  set();
  if ('ResizeObserver' in window) new ResizeObserver(set).observe(pw);
}

export function start() {
  drawStatic();
  setPickHandler(pickRecv);
  onRefresh(renderBuilder);
  initBuilder();
  initBeat();
  initWristband();
  // "Add to wristband" on a Playbook play
  $('#anat').addEventListener('click', (e) => {
    const b = e.target.closest('[data-wb="add"]');
    if (!b || !S.playId) return;
    $('#wbMsg').textContent = addToActiveCard({ pb: S.playId });
  });
  initTrain({
    setTab,
    startBeat: () => startChallenge(setTab),
    // "Watch it" on a concept card: show the play against its defense and run it
    watch: (call, name, def) => { S.def = def; setTab('play'); loadCall(call, name); play(); },
  });
  refresh(false);
  setTab('play');

  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $('.tabs').addEventListener('keydown', (e) => {
    const i = TABS.indexOf(S.tab);
    const next = { ArrowRight: (i + 1) % TABS.length, ArrowLeft: (i + TABS.length - 1) % TABS.length, Home: 0, End: TABS.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setTab(TABS[next]);
    $('#tab-' + TABS[next]).focus();
  });
  $('#playBtn').addEventListener('click', togglePlay);
  $('#slowBtn').addEventListener('click', (e) => {
    S.slow = !S.slow;
    e.currentTarget.setAttribute('aria-pressed', S.slow);
    refresh(false);
  });
  $('#zoneBtn').addEventListener('click', () => { S.zones = !S.zones; refresh(true); });
  $('#viewBtn').addEventListener('click', (e) => {
    S.tilt = !S.tilt;
    e.currentTarget.setAttribute('aria-pressed', S.tilt);
    e.currentTarget.textContent = S.tilt ? '3D' : 'Flat';
    $('#pitchwrap').classList.toggle('flat', !S.tilt);
  });
  [$('#covSeg'), $('#miniDef')].forEach((box) =>
    box.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      S.def = b.dataset.def;
      refresh(false);
    })
  );
  $('#pbPlay').addEventListener('click', togglePlay);
  $('#expandBtn').addEventListener('click', () => setTheater(!document.body.classList.contains('theater')));
  $('#pbPrev').addEventListener('click', () => stepPlay(-1));
  $('#pbNext').addEventListener('click', () => stepPlay(1));
  trackPinnedHeight();
  $('#scrub').addEventListener('input', (e) => seek(e.target.value / 1000));
  [$('#tiles'), $('#chips')].forEach((box) =>
    box.addEventListener('click', (e) => {
      const b = e.target.closest('.tile, .chip');
      if (b) pickRecv(b.dataset.l);
    })
  );
  $('#miniPlay').addEventListener('click', replay);
  $('#plays').addEventListener('click', (e) => {
    const b = e.target.closest('.card');
    if (!b) return;
    loadPlay(findEntry(b.dataset.id));
  });
  // Escape closes the full-window field; F opens or closes it.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('theater')) { e.preventDefault(); setTheater(false); return; }
    if ((e.key === 'f' || e.key === 'F') && !e.altKey && !e.ctrlKey && !e.metaKey && S.tab !== 'train') {
      const t = e.target;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      e.preventDefault();
      setTheater(!document.body.classList.contains('theater'));
    }
  });
  // Left and right arrows step through the playbook (not while typing, on a slider, or moving between tabs).
  document.addEventListener('keydown', (e) => {
    if (S.tab !== 'play' || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (t.closest && t.closest('.tabs')) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
    e.preventDefault();
    stepPlay(e.key === 'ArrowLeft' ? -1 : 1);
  });
  // Space bar plays/pauses on desktop, unless typing or pressing a control.
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(tag)) return;
    e.preventDefault();
    togglePlay();
  });

}
