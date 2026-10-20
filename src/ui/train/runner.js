// The shared quiz flow: ask a question, lock the answer, show feedback, next, then the round summary.
// Each quiz only says how to build its questions, show one, and grade an answer.
import { S } from '../state.js';
import { settings } from '../../data/index.js';
import { burst, shake } from '../celebrate.js';
import { recordAnswer } from '../progress.js';
import { newRng, header, feedbackHTML, showSummary } from './shared.js';

/**
 * cfg = {
 *   title,
 *   questions(rng, n)            -> array of questions,
 *   show(q, head)                -> { html, view: 'field' | 'panel', enter?() }   (head = the header HTML to put on top),
 *   grade(q, btn)                -> { ok, detail, rightEl }                      (rightEl = the button holding the right answer),
 *   after?(q, result)            -> runs after an answer is graded,
 *   onAct?(act, btn, q)          -> return true if the quiz handled the action itself,
 * }
 */
export function runQuiz(api, cfg) {
  const n = settings.quizLength;
  const qs = cfg.questions(newRng(), n);
  const results = [];
  let i = 0, locked = false;
  const again = () => runQuiz(api, cfg);

  function show() {
    const q = qs[i];
    locked = false;
    const { html, view, enter } = cfg.show(q, header(cfg.title, i, n, results));
    api.setView(view);
    if (view === 'field') S.quiz = true; // quiz-style field: no colors or labels that give the answer away
    if (enter) enter();
    api.root.innerHTML = html;
    api.setHandler(onAct);
  }

  function onAct(act, btn) {
    const q = qs[i];
    if (act === 'back') return api.hub();
    if (cfg.onAct && cfg.onAct(act, btn, q)) return;
    if (act === 'next') {
      i++;
      return i < n ? show() : showSummary(api, { title: cfg.title, correct: results.filter(Boolean).length, n, again });
    }
    if (act !== 'pick' || locked) return;
    locked = true;
    const r = cfg.grade(q, btn);
    results.push(r.ok);
    api.root.querySelectorAll('[data-act="pick"]').forEach((b) => { b.disabled = true; });
    btn.classList.add(r.ok ? 'right' : 'wrong');
    if (r.rightEl) r.rightEl.classList.add('right');
    const { gain, streak, rankUp } = recordAnswer(r.ok);
    if (r.ok || rankUp) burst();
    if (!r.ok) shake(btn);
    if (cfg.after) cfg.after(q, r);
    const box = api.root.querySelector('#tfb');
    box.innerHTML = feedbackHTML({ ok: r.ok, detail: r.detail, gain, streak, rankUp }) + `<button class="cta" data-act="next" type="button">${i + 1 < n ? 'Next' : 'See results'}</button>`;
    box.querySelector('[data-act="next"]').focus();
  }

  show();
}
