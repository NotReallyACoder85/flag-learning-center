// Boot and event wiring.
import { $ } from './dom.js';
import { S } from './state.js';
import { findEntry } from '../engine/index.js';
import { drawStatic, setPickHandler, markSelected } from './field.js';
import { refresh, loadCall, loadPlay, togglePlay, play, replay, seek, onRefresh } from './player.js';
import { renderTiles, renderPlaybook } from './panels.js';
import { renderBuilder, initBuilder } from './builder.js';
import { syncView } from './view.js';
import { initTrain, showHub, exitTrain } from './train/index.js';
import { initBeat, startChallenge } from './beat.js';

const TABS = ['play', 'build', 'train'];

function setTab(t) {
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
}

/** Choose which receiver the route keypad edits. */
function pickRecv(l) {
  S.sel = l;
  if (S.tab !== 'build') setTab('build');
  else { renderTiles(); renderBuilder(); markSelected(); }
}

export function start() {
  drawStatic();
  setPickHandler(pickRecv);
  onRefresh(renderBuilder);
  initBuilder();
  initBeat();
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
  $('#covSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    S.def = b.dataset.def;
    refresh(false);
  });
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
  // Space bar plays/pauses on desktop, unless typing or pressing a control.
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(tag)) return;
    e.preventDefault();
    togglePlay();
  });

}
