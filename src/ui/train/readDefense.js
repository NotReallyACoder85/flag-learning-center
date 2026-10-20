// Read the defense: watch the motion, decide man or zone, then see the tell.
import { esc } from '../dom.js';
import { S, ctx } from '../state.js';
import { plays, copy } from '../../data/index.js';
import { readRound } from '../../engine/index.js';
import { refresh, playUntil } from '../player.js';
import { markDefender } from '../field.js';
import { runQuiz } from './runner.js';

const library = plays.map((p) => p.call);
const watchMotion = () => playUntil(ctx.sc.tm + 0.5); // stop right after the motion, before the snap

export function startReadDefense(api) {
  runQuiz(api, {
    title: 'Read the defense',
    questions: (rng, n) => readRound(rng, library, n),
    show(q, head) {
      return {
        view: 'field',
        enter() {
          S.quiz = true;
          Object.assign(S, { form: q.play.form, digits: q.play.digits.slice(), motion: { ...q.play.motion }, def: q.play.def, name: '' });
          refresh(false);
        },
        html: `${head}<h2 class="qtext">Man or zone?</h2>
          <p class="hint">${copy.train.readQuestion}</p>
          <button class="cta ghost" data-act="watch" type="button">Watch the motion</button>
          <div class="two" role="group" aria-label="Your answer">
            <button class="optbtn" data-act="pick" data-v="man" type="button">Man<small>${copy.train.manHint}</small></button>
            <button class="optbtn" data-act="pick" data-v="zone" type="button">Zone<small>${copy.train.zoneHint}</small></button>
          </div>
          <div class="tfb" id="tfb" role="status" aria-live="polite"></div>`,
      };
    },
    onAct: (act) => (act === 'watch' ? (watchMotion(), true) : false),
    grade(q, btn) {
      const tell = copy.tell[q.answer];
      return {
        ok: btn.dataset.v === q.answer,
        detail: `<b>${esc(tell.title)}.</b> ${esc(tell.text.replace('{who}', q.who))}`,
        rightEl: api.root.querySelector(`[data-v="${q.answer}"]`),
      };
    },
    // Show the tell: replay the motion and ring the defender who went with him.
    after(q) { markDefender(q.follower); watchMotion(); },
  });
}
