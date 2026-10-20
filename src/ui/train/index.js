// Train tab: the hub (rank + four modes) and the router between screens.
import { $, esc } from '../dom.js';
import { S } from '../state.js';
import { refresh } from '../player.js';
import { rankFor } from '../../engine/index.js';
import { getProgress, resetProgress } from '../progress.js';
import { syncView } from '../view.js';
import { startRouteQuiz } from './routeQuiz.js';
import { startFormationQuiz } from './formationQuiz.js';
import { startCallQuiz } from './callQuiz.js';
import { startReadDefense } from './readDefense.js';
import { showConcepts } from './concepts.js';

let api = null;
let handler = null;

export function initTrain({ setTab, watch, startBeat }) {
  const root = $('#trainRoot');
  api = {
    root,
    setHandler: (fn) => { handler = fn; },
    setView(kind) {
      if (kind) document.body.dataset.quiz = kind;
      else delete document.body.dataset.quiz;
      syncView();
    },
    /** Put the field back to normal after a quiz drew it in quiz style. */
    endField() {
      if (S.quiz) { S.quiz = false; refresh(false); }
    },
    hub: showHub,
    setTab,
    watch,
    startBeat,
  };
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b && handler) handler(b.dataset.act, b);
  });
}

const MODES = [
  { id: 'routes', big: '0-9', start: true, title: 'Route numbers', text: 'See a route and pick its number. Learn the whole route tree.' },
  { id: 'forms', big: '2x2', start: true, title: 'Formations', text: 'Match each formation to its name.' },
  { id: 'call', big: '21', title: 'Call quiz', text: 'See a play and pick the call, or read a call and pick the picture.' },
  { id: 'read', big: '?', title: 'Read the defense', text: 'Watch the motion. Did a defender go with him? Man or zone?' },
  { id: 'beat', big: 'W', title: 'Beat the coverage', text: 'Build a play that gets someone open against the defense.' },
  { id: 'concepts', big: 'C', title: 'Concept cards', text: 'Route combos and how to read the defense.' },
];

export function showHub() {
  api.setView(null);
  api.endField();
  const p = getProgress(), r = rankFor(p.xp);
  api.root.innerHTML = `<div class="rankcard glass">
      <div class="rk"><span class="rk-label">Your rank</span><b>${esc(r.rank.name)}</b></div>
      <div class="rk-xp">${p.xp} XP${r.next ? ` · ${r.toNext} to ${esc(r.next.name)}` : ' · top rank!'}</div>
      <div class="bar" role="progressbar" aria-label="Progress to the next rank" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${r.pct}"><i style="width:${r.pct}%"></i></div>
      <div class="rk-streak">${p.best > 1 ? `Best streak: ${p.best} in a row` : 'Get answers right in a row for bonus XP.'}</div>
    </div>
    <div class="train">${MODES.map((m) => `<button class="tc glass" data-act="mode" data-mode="${m.id}" type="button">${m.start ? '<span class="soon">Start here</span>' : ''}<h2>${m.title}</h2><p>${m.text}</p><span class="big" aria-hidden="true">${m.big}</span></button>`).join('')}</div>
    <button class="linkbtn" data-act="reset" type="button">Reset my progress</button>`;
  handler = (act, b) => {
    if (act === 'reset') {
      if (window.confirm('Reset your rank and XP on this device?')) { resetProgress(); showHub(); }
    } else if (act === 'mode') {
      ({ routes: () => startRouteQuiz(api), forms: () => startFormationQuiz(api), call: () => startCallQuiz(api), read: () => startReadDefense(api), beat: () => api.startBeat(), concepts: () => showConcepts(api) })[b.dataset.mode]();
    }
  };
}

/** Leaving the Train tab: drop any quiz styling. */
export function exitTrain() {
  api.setView(null);
  api.endField();
}
