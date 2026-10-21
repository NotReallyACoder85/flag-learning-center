// Playback loop and scene refresh. Everything that changes the play goes through refresh().
import { $ } from './dom.js';
import { S, ctx } from './state.js';
import { buildScene, parseCall, callText, LET, routeFor, playFromEntry, DEF_NAME, clamp as clampN } from '../engine/index.js';
import { drawScene, renderField } from './field.js';
import { renderLower, resetLower } from './lower.js';
import { renderHead, renderTiles, renderCov, renderLegend, renderPlaybook } from './panels.js';

const ICO = {
  play: '<path d="M5 3l12 7-12 7z" fill="currentColor"/>',
  pause: '<path d="M5 3h4v14H5zM11 3h4v14h-4z" fill="currentColor"/>',
  replay: '<path d="M10 3a7 7 0 1 0 7 7h-2.4A4.6 4.6 0 1 1 10 5.4V9l5-4.5L10 0z" fill="currentColor" transform="translate(0 1.5)"/>',
};
export const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

let raf = null, lastTs = 0;
/** Optional stop time (seconds). Used by Read the Defense to show only the motion. */
const limit = () => (S.limit == null ? ctx.sc.end : S.limit);
let afterRefresh = () => {};
/** Let other modules (the builder) re-render when the scene changes. */
export function onRefresh(fn) { afterRefresh = fn; }

function setIcon() {
  const done = ctx.sc && S.t >= ctx.sc.end - 0.01;
  $('#playIco').innerHTML = S.playing ? ICO.pause : done ? ICO.replay : ICO.play;
  $('#playBtn').setAttribute('aria-label', S.playing ? 'Pause' : done ? 'Replay' : 'Play');
}

/** Draw the play at time t (field, callouts, scrubber). */
function tick(t) {
  renderField(t);
  renderLower(t);
  const pr = t / ctx.sc.end;
  $('#scrub').value = Math.round(pr * 1000);
  $('#scrub').style.setProperty('--p', (pr * 100).toFixed(1) + '%');
}

export function stop() {
  if (raf) cancelAnimationFrame(raf);
  raf = null;
  S.playing = false;
  setIcon();
}

function loop(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;
  S.t = Math.min(limit(), S.t + dt);
  tick(S.t);
  if (S.t >= limit()) stop();
  else raf = requestAnimationFrame(loop);
}

export function play() {
  if (reduceMotion) { S.t = ctx.sc.end; tick(S.t); stop(); return; }
  if (S.t >= ctx.sc.end - 0.01) S.t = 0;
  S.playing = true;
  setIcon();
  lastTs = performance.now();
  raf = requestAnimationFrame(loop);
}

/** Play from the start and stop at time t. */
export function playUntil(t) {
  stop();
  S.limit = t;
  S.t = 0;
  if (reduceMotion) { S.t = t; tick(t); return; }
  play();
}

export function replay() {
  stop();
  S.t = 0;
  play();
}

export const togglePlay = () => (S.playing ? stop() : play());

/** Text version of the diagram for screen readers. */
function describeField() {
  if (S.quiz) return $('#field').setAttribute('aria-label', 'Quiz diagram. Use the button below to watch it.');
  const routes = LET.map((l, i) => `${l} ${routeFor(S.digits[i]) ? routeFor(S.digits[i]).name : 'no route'}`).join(', ');
  const motion = S.motion ? ` ${S.motion.who} goes in motion${S.motion.tag === 'custom' ? '' : ` (${S.motion.tag})`}.` : '';
  const def = S.def === 'none' ? 'No defense.' : `Against ${DEF_NAME[S.def]}.`;
  const title = S.playId ? S.name : callText(S);
  $('#field').setAttribute('aria-label', `${title}. ${def}${motion} Routes: ${routes}.`);
}

/** Rebuild the scene from S and redraw everything. keepT keeps the current time. */
export function refresh(keepT = false) {
  const focusKey = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.fk;
  stop();
  resetLower();
  ctx.sc = buildScene(S);
  // Plays only run when the player presses Play. Reduced-motion users see the finished play.
  S.limit = undefined;
  S.t = reduceMotion && !S.quiz ? ctx.sc.end : keepT ? clampN(S.t, 0, ctx.sc.end) : 0;
  drawScene();
  renderHead(); renderTiles(); renderCov(); renderLegend(); renderPlaybook();
  const zb = $('#zoneBtn');
  zb.textContent = S.def === 'man' ? 'Matchups' : 'Zones';
  zb.disabled = S.def === 'none';
  zb.setAttribute('aria-pressed', S.zones);
  describeField();
  afterRefresh();
  if (focusKey) {
    const again = document.querySelector(`[data-fk="${focusKey}"]`);
    if (again && again !== document.activeElement) again.focus({ preventScroll: true });
  }
  tick(S.t);
  stop();
}

export function seek(frac) {
  stop();
  S.t = frac * ctx.sc.end;
  tick(S.t);
}

/** Load a call string. Returns false if it does not parse. */
export function loadCall(code, name) {
  const p = parseCall(code);
  if (!p) return false;
  S.form = p.form; S.digits = p.digits; S.motion = p.motion; S.name = name || ''; S.playId = null;
  refresh(false);
  return true;
}

/** Load a play from the playbook (the coach's diagrams). */
export function loadPlay(entry) {
  const p = playFromEntry(entry);
  S.form = p.form; S.digits = p.digits; S.motion = p.motion; S.name = entry.name; S.playId = entry.id;
  refresh(false);
}
