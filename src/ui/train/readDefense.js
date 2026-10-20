// Read the defense: watch the motion, decide man or zone, then see the tell.
import { esc } from '../dom.js';
import { S, ctx } from '../state.js';
import { plays, settings, copy } from '../../data/index.js';
import { readRound } from '../../engine/index.js';
import { refresh, playUntil } from '../player.js';
import { markDefender } from '../field.js';
import { burst, shake } from '../celebrate.js';
import { recordAnswer } from '../progress.js';
import { newRng, header, feedbackHTML, showSummary } from './shared.js';

const library = plays.map((p) => p.call);
const TITLE = 'Read the defense';
const fill = (tpl, who) => tpl.replace('{who}', who);

export function startReadDefense(api) {
  const n = settings.quizLength;
  const qs = readRound(newRng(), library, n);
  const results = [];
  let i = 0, locked = false;

  const watch = () => playUntil(ctx.sc.tm + 0.5); // stop right after the motion, before the snap

  function show() {
    const q = qs[i];
    locked = false;
    api.setView('field');
    S.quiz = true;
    Object.assign(S, { form: q.play.form, digits: q.play.digits.slice(), motion: { ...q.play.motion }, def: q.play.def, name: '' });
    refresh(false);
    api.root.innerHTML = `${header(TITLE, i, n, results)}<h2 class="qtext">Man or zone?</h2>
      <p class="hint">${copy.train.readQuestion}</p>
      <button class="cta ghost" data-act="watch" type="button">Watch the motion</button>
      <div class="two" role="group" aria-label="Your answer">
        <button class="optbtn" data-act="pick" data-v="man" type="button">Man<small>${copy.train.manHint}</small></button>
        <button class="optbtn" data-act="pick" data-v="zone" type="button">Zone<small>${copy.train.zoneHint}</small></button>
      </div>
      <div class="tfb" id="tfb" role="status" aria-live="polite"></div>`;
    api.setHandler(onAct);
  }

  function onAct(act, btn) {
    if (act === 'back') return api.hub();
    if (act === 'watch') return watch();
    if (act === 'next') { i++; return i < n ? show() : showSummary(api, { title: TITLE, correct: results.filter(Boolean).length, n, again: () => startReadDefense(api) }); }
    if (act !== 'pick' || locked) return;
    locked = true;
    const q = qs[i], ok = btn.dataset.v === q.answer;
    results.push(ok);
    api.root.querySelectorAll('[data-act="pick"]').forEach((b) => { b.disabled = true; });
    btn.classList.add(ok ? 'right' : 'wrong');
    api.root.querySelector(`[data-v="${q.answer}"]`).classList.add('right');
    const { gain, streak, rankUp } = recordAnswer(ok);
    if (ok || rankUp) burst();
    if (!ok) shake(btn);
    // Show the tell: replay the motion and ring the defender who went with him.
    markDefender(q.follower);
    watch();
    const tell = copy.tell[q.answer];
    const detail = `<b>${esc(tell.title)}.</b> ${esc(fill(tell.text, q.who))}`;
    const box = api.root.querySelector('#tfb');
    box.innerHTML = feedbackHTML({ ok, detail, gain, streak, rankUp }) + `<button class="cta" data-act="next" type="button">${i + 1 < n ? 'Next' : 'See results'}</button>`;
    box.querySelector('[data-act="next"]').focus();
  }

  show();
}
