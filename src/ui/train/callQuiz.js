// Call quiz: see the play and pick the call, or see the call and pick the picture.
import { esc } from '../dom.js';
import { S } from '../state.js';
import { callbook } from '../../data/index.js';
import { callRound, callText, describePlay, explainDiff } from '../../engine/index.js';
import { refresh, replay } from '../player.js';
import { thumb } from '../glyphs.js';
import { runQuiz } from './runner.js';

const library = callbook.map((p) => p.call);

export function startCallQuiz(api) {
  runQuiz(api, {
    title: 'Call quiz',
    questions: (rng, n) => callRound(rng, library, n),
    show(q, head) {
      if (q.kind === 'pickCall') {
        return {
          view: 'field',
          enter() {
            S.quiz = true;
            Object.assign(S, { form: q.play.form, digits: q.play.digits.slice(), motion: q.play.motion ? { ...q.play.motion } : null, def: 'none', name: '', playId: null });
            refresh(false);
          },
          html: `${head}<h2 class="qtext">What is the call?</h2><p class="hint">Run the play, then pick the call that matches.</p>
            <button class="cta ghost" data-act="run" type="button">Run it</button>
            <div class="optlist" role="group" aria-label="Choose the call">${q.options.map((c, k) => `<button class="optbtn" data-act="pick" data-k="${k}" type="button">${esc(c)}</button>`).join('')}</div>
            <div class="tfb" id="tfb" role="status" aria-live="polite"></div>`,
        };
      }
      return {
        view: 'panel',
        html: `${head}<h2 class="qtext">Which picture is this call?</h2>
          <div class="bigcall">${esc(callText(q.play))}</div>
          <div class="cards pics" role="group" aria-label="Choose the picture">${q.optionPlays.map((p, k) => `<button class="card" data-act="pick" data-k="${k}" type="button" aria-label="Option ${k + 1}: ${esc(describePlay(p))}"><span class="th">${thumb(p)}</span></button>`).join('')}</div>
          <div class="tfb" id="tfb" role="status" aria-live="polite"></div>`,
      };
    },
    onAct: (act) => (act === 'run' ? (replay(), true) : false),
    grade(q, btn) {
      const k = +btn.dataset.k, ok = k === q.answer;
      const detail = ok ? '' : `${esc(explainDiff(q.play, q.optionPlays[k]))} The call is <b>${esc(callText(q.play))}</b>.`;
      return { ok, detail, rightEl: api.root.querySelector(`[data-k="${q.answer}"]`) };
    },
  });
}
