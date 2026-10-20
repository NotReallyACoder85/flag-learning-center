// Call quiz: see the play and pick the call, or see the call and pick the picture.
import { esc } from '../dom.js';
import { S } from '../state.js';
import { plays, settings } from '../../data/index.js';
import { callRound, callText, describePlay, explainDiff } from '../../engine/index.js';
import { refresh, replay } from '../player.js';
import { thumb } from '../glyphs.js';
import { burst, shake } from '../celebrate.js';
import { recordAnswer } from '../progress.js';
import { newRng, header, feedbackHTML, showSummary } from './shared.js';

const library = plays.map((p) => p.call);
const TITLE = 'Call quiz';

export function startCallQuiz(api) {
  const n = settings.quizLength;
  const qs = callRound(newRng(), library, n);
  const results = [];
  let i = 0, locked = false;

  function show() {
    const q = qs[i];
    locked = false;
    const head = header(TITLE, i, n, results);
    if (q.kind === 'pickCall') {
      api.setView('field');
      S.quiz = true;
      Object.assign(S, { form: q.play.form, digits: q.play.digits.slice(), motion: q.play.motion ? { ...q.play.motion } : null, def: 'none', name: '' });
      refresh(false);
      api.root.innerHTML = `${head}<h2 class="qtext">What is the call?</h2><p class="hint">Run the play, then pick the call that matches.</p>
        <button class="cta ghost" data-act="run" type="button">Run it</button>
        <div class="optlist" role="group" aria-label="Choose the call">${q.options.map((c, k) => `<button class="optbtn" data-act="pick" data-k="${k}" type="button">${esc(c)}</button>`).join('')}</div>
        <div class="tfb" id="tfb" role="status" aria-live="polite"></div>`;
    } else {
      api.setView('panel');
      api.root.innerHTML = `${head}<h2 class="qtext">Which picture is this call?</h2>
        <div class="bigcall">${esc(callText(q.play))}</div>
        <div class="cards pics" role="group" aria-label="Choose the picture">${q.optionPlays.map((p, k) => `<button class="card" data-act="pick" data-k="${k}" type="button" aria-label="Option ${k + 1}: ${esc(describePlay(p))}"><span class="th">${thumb(p)}</span></button>`).join('')}</div>
        <div class="tfb" id="tfb" role="status" aria-live="polite"></div>`;
    }
    api.setHandler(onAct);
  }

  function onAct(act, btn) {
    if (act === 'back') return api.hub();
    if (act === 'run') return replay();
    if (act === 'next') { i++; return i < n ? show() : showSummary(api, { title: TITLE, correct: results.filter(Boolean).length, n, again: () => startCallQuiz(api) }); }
    if (act !== 'pick' || locked) return;
    locked = true;
    const q = qs[i], k = +btn.dataset.k, ok = k === q.answer;
    results.push(ok);
    api.root.querySelectorAll('[data-act="pick"]').forEach((b) => { b.disabled = true; });
    btn.classList.add(ok ? 'right' : 'wrong');
    api.root.querySelector(`[data-k="${q.answer}"]`).classList.add('right');
    const { gain, streak, rankUp } = recordAnswer(ok);
    if (ok) burst(); else shake(btn);
    if (rankUp) burst();
    const detail = ok ? '' : `${esc(explainDiff(q.play, q.optionPlays[k]))} The call is <b>${esc(callText(q.play))}</b>.`;
    $fb(feedbackHTML({ ok, detail, gain, streak, rankUp }) + `<button class="cta" data-act="next" type="button">${i + 1 < n ? 'Next' : 'See results'}</button>`);
  }

  const $fb = (html) => { api.root.querySelector('#tfb').innerHTML = html; api.root.querySelector('[data-act="next"]').focus(); };
  show();
}
