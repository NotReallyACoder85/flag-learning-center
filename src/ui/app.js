// Boot and event wiring.
import { $ } from './dom.js';
import { S } from './state.js';
import { plays } from '../data/index.js';
import { drawStatic } from './field.js';
import { refresh, loadCall, togglePlay, play, seek, playSoon, reduceMotion } from './player.js';
import { renderTiles, renderPlaybook } from './panels.js';
import { renderBuilder, initBuilder } from './builder.js';
import { setPickHandler } from './field.js';
import { onRefresh } from './player.js';

const TABS = ['play', 'build', 'train'];

function setTab(t) {
  S.tab = t;
  TABS.forEach((k) => {
    $('#p-' + k).hidden = k !== t;
    $('#tab-' + k).setAttribute('aria-selected', k === t);
  });
  renderTiles();
  renderPlaybook();
  renderBuilder();
}

/** Choose which receiver the route keypad edits. */
function pickRecv(l) {
  S.sel = l;
  if (S.tab !== 'build') setTab('build');
  else { renderTiles(); renderBuilder(); }
}

export function start() {
  drawStatic();
  setPickHandler(pickRecv);
  onRefresh(renderBuilder);
  initBuilder();
  refresh(false);
  setTab('play');

  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
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
    playSoon(300);
  });
  $('#scrub').addEventListener('input', (e) => seek(e.target.value / 1000));
  $('#tiles').addEventListener('click', (e) => {
    const b = e.target.closest('.tile');
    if (b) pickRecv(b.dataset.l);
  });
  $('#plays').addEventListener('click', (e) => {
    const b = e.target.closest('.card');
    if (!b) return;
    const p = plays[b.dataset.i];
    loadCall(p.call, p.name);
  });
  // Space bar plays/pauses on desktop, unless typing or pressing a control.
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(tag)) return;
    e.preventDefault();
    togglePlay();
  });

  if (reduceMotion) { play(); } else playSoon(700);
}
