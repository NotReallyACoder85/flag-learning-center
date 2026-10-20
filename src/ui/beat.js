// Beat the coverage: a challenge banner on top of Draw Up. The player builds a play, taps Grade, and gets stars.
import { $, esc } from './dom.js';
import { S } from './state.js';
import { settings, copy } from '../data/index.js';
import { DEF_NAME, ROUTES, LET, erasedPlay, gradePlay, starXp } from '../engine/index.js';
import { refresh, seek } from './player.js';
import { burst } from './celebrate.js';
import { addXp } from './progress.js';
import { stars } from './train/shared.js';

let ch = null; // { n, def, stars, grade }

const rotation = (n) => settings.beat.order[n % settings.beat.order.length];

function setupPlay() {
  S.def = ch.def;
  Object.assign(S, erasedPlay());
  S.name = 'Challenge';
  refresh(false);
  render();
}

export function startChallenge(setTab) {
  ch = { n: 0, def: rotation(0), stars: 0, grade: null };
  document.body.dataset.challenge = '1';
  setTab('build');
  setupPlay();
}

/** The player changed the play, so an old grade no longer applies. */
export function touched() {
  if (ch && ch.grade) { ch.grade = null; render(); }
}

function resultHTML() {
  const g = ch.grade;
  if (!g) return '';
  if (g.error) return `<div class="fbbox no"><b class="bad">${esc(g.error)}</b></div>`;
  const openRoute = ROUTES[S.digits[LET.indexOf(g.open)]].name.toLowerCase();
  return g.passed
    ? `<div class="fbbox ok"><div class="sum-stars" aria-label="${g.stars} out of 3 stars">${stars(g.stars)}</div><b class="good">${esc(g.open)} is open on the ${esc(openRoute)}, ${g.sep.toFixed(1)} yds of space.</b><p>${esc(g.why)}</p>${g.gain ? `<span class="xp">+${g.gain} XP</span>` : ''}</div>`
    : `<div class="fbbox no"><b class="bad">${esc(copy.train.beatCovered)}</b></div>`;
}

export function render() {
  const box = $('#challenge');
  if (!ch) { box.innerHTML = ''; delete document.body.dataset.challenge; return; }
  const g = ch.grade;
  box.innerHTML = `<div class="challenge glass">
      <div class="ch-top"><span class="ch-tag">Challenge ${ch.n + 1}</span><b>Beat ${esc(DEF_NAME[ch.def])}</b><button class="xbtn" data-ch="exit" type="button">Exit</button></div>
      <p class="hint">${copy.train.beatIntro}</p>
      <div id="chResult" role="status" aria-live="polite">${resultHTML()}</div>
      <div class="row"><button class="cta" data-ch="grade" type="button">Grade my play</button>${g && g.passed ? '<button class="cta ghost" data-ch="next" type="button">Next challenge</button>' : ''}</div>
    </div>`;
}

export function initBeat() {
  $('#challenge').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ch]');
    if (!b || !ch) return;
    if (b.dataset.ch === 'exit') { ch = null; render(); }
    else if (b.dataset.ch === 'next') { ch = { n: ch.n + 1, def: rotation(ch.n + 1), stars: 0, grade: null }; setupPlay(); }
    else if (b.dataset.ch === 'grade') {
      const g = gradePlay(S, ch.def);
      if (!g.complete) { ch.grade = { error: copy.train.beatNotComplete }; return render(); }
      if (S.def !== ch.def) { S.def = ch.def; refresh(false); }
      seek(1); // jump to the end so the field and the callout show what happened
      g.gain = 0;
      if (g.stars > ch.stars) {
        const r = addXp(starXp(g.stars - ch.stars));
        g.gain = r.gain;
        ch.stars = g.stars;
        burst();
      }
      ch.grade = g;
      render();
    }
  });
}
