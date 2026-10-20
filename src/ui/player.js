// Playback loop and scene refresh. Everything that changes the play goes through refresh().
import { $ } from './dom.js';
import { S, ctx } from './state.js';
import { buildScene, parseCall, clamp as clampN } from '../engine/index.js';
import { drawScene, renderField } from './field.js';
import { renderLower, resetLower } from './lower.js';
import { renderHead, renderTiles, renderCov, renderLegend, renderPlaybook } from './panels.js';

const ICO = {
  play: '<path d="M5 3l12 7-12 7z" fill="currentColor"/>',
  pause: '<path d="M5 3h4v14H5zM11 3h4v14h-4z" fill="currentColor"/>',
  replay: '<path d="M10 3a7 7 0 1 0 7 7h-2.4A4.6 4.6 0 1 1 10 5.4V9l5-4.5L10 0z" fill="currentColor" transform="translate(0 1.5)"/>',
};
export const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

let raf = null, lastTs = 0, autoTimer = null;
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
  S.t = Math.min(ctx.sc.end, S.t + dt);
  tick(S.t);
  if (S.t >= ctx.sc.end) stop();
  else raf = requestAnimationFrame(loop);
}

export function play() {
  clearTimeout(autoTimer);
  if (reduceMotion) { S.t = ctx.sc.end; tick(S.t); stop(); return; }
  if (S.t >= ctx.sc.end - 0.01) S.t = 0;
  S.playing = true;
  setIcon();
  lastTs = performance.now();
  raf = requestAnimationFrame(loop);
}

export function replay() {
  stop();
  S.t = 0;
  play();
}

export const togglePlay = () => (S.playing ? stop() : play());
export const playSoon = (ms = 300) => { clearTimeout(autoTimer); autoTimer = setTimeout(play, ms); };

/** Rebuild the scene from S and redraw everything. keepT keeps the current time. */
export function refresh(keepT = false) {
  const focusKey = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.fk;
  stop();
  clearTimeout(autoTimer);
  resetLower();
  ctx.sc = buildScene(S);
  S.t = keepT ? clampN(S.t, 0, ctx.sc.end) : 0;
  drawScene();
  renderHead(); renderTiles(); renderCov(); renderLegend(); renderPlaybook();
  const zb = $('#zoneBtn');
  zb.textContent = S.def === 'man' ? 'Matchups' : 'Zones';
  zb.disabled = S.def === 'none';
  zb.setAttribute('aria-pressed', S.zones);
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
export function loadCall(code, name, autoplay = true) {
  const p = parseCall(code);
  if (!p) return false;
  S.form = p.form; S.digits = p.digits; S.motion = p.motion; S.name = name || '';
  refresh(false);
  if (autoplay) playSoon(450);
  return true;
}
