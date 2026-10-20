// Pieces shared by the Train screens.
import { esc } from '../dom.js';
import { copy } from '../../data/index.js';
import { makeRng, roundStars, starXp } from '../../engine/index.js';
import { burst } from '../celebrate.js';
import { addXp } from '../progress.js';

export const newRng = () => makeRng((Date.now() ^ 0x9e3779b9) >>> 0);
export const pickText = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const stars = (n, of = 3) => '★'.repeat(n) + '☆'.repeat(of - n);

/** Top of a quiz screen: back button, title, and one pip per question. */
export function header(title, i, n, results) {
  const pips = Array.from({ length: n }, (_, k) => {
    const state = k < results.length ? (results[k] ? 'right' : 'wrong') : k === i ? 'now' : '';
    return `<i class="pip ${state}"></i>`;
  }).join('');
  return `<div class="thead"><button class="back" data-act="back" type="button">← Train</button><div class="tmeta"><b>${esc(title)}</b><span>Question ${i + 1} of ${n}</span></div></div><div class="pips" aria-hidden="true">${pips}</div>`;
}

/** Text shown after an answer. */
export function feedbackHTML({ ok, detail = '', gain = 0, streak = 0, rankUp = null }) {
  const head = ok ? `<b class="good">${pickText(copy.train.cheers)}</b>` : `<b class="bad">${pickText(copy.train.oops)}</b>`;
  const xp = ok ? `<span class="xp">+${gain} XP${streak > 1 ? ` · Streak ${streak}` : ''}</span>` : '';
  const up = rankUp ? `<div class="rankup">Rank up! You are now ${esc(rankUp.name)}.</div>` : '';
  return `<div class="fbbox ${ok ? 'ok' : 'no'}">${head} ${xp}${detail ? `<p>${detail}</p>` : ''}${up}</div>`;
}

/** End of a round: stars, bonus XP, and buttons. */
export function showSummary(api, { title, correct, n, again }) {
  const s = roundStars(correct, n);
  const { gain, rankUp } = addXp(starXp(s));
  if (s >= 2) burst();
  api.setView(null);
  api.endField();
  api.root.innerHTML = `<div class="summary glass">
    <div class="sum-title">${esc(title)}</div>
    <div class="sum-stars" aria-label="${s} out of 3 stars">${stars(s)}</div>
    <h2>${copy.train.summary[s]}</h2>
    <p>You got <b>${correct} of ${n}</b> right.</p>
    <p class="xp">+${gain} bonus XP</p>
    ${rankUp ? `<div class="rankup">Rank up! You are now ${esc(rankUp.name)}.</div>` : ''}
    <div class="row"><button class="cta" data-act="again" type="button">Play again</button><button class="cta ghost" data-act="back" type="button">Back to Train</button></div>
  </div>`;
  api.setHandler((act) => (act === 'again' ? again() : act === 'back' ? api.hub() : null));
}
