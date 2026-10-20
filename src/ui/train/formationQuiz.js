// Formation quiz: see the formation and pick its name, or see the name and pick the formation.
import { esc } from '../dom.js';
import { formations } from '../../data/index.js';
import { formationRound } from '../../engine/index.js';
import { formDiagram } from '../diagrams.js';
import { runQuiz } from './runner.js';

export function startFormationQuiz(api) {
  runQuiz(api, {
    title: 'Formations',
    questions: (rng, n) => formationRound(rng, n),
    show(q, head) {
      if (q.kind === 'formName') {
        return {
          view: 'panel',
          html: `${head}<h2 class="qtext">What is this formation?</h2>
            <div class="fdiag">${formDiagram(q.form, true)}</div>
            <p class="hint">A, B, Y, Z go left to right. C is the center. Q is the quarterback.</p>
            <div class="optlist" role="group" aria-label="Pick the formation name">${q.options.map((k) => `<button class="optbtn" data-act="pick" data-v="${k}" type="button">${esc(formations[k].name)}</button>`).join('')}</div>
            <div class="tfb" id="tfb" role="status" aria-live="polite"></div>`,
        };
      }
      return {
        view: 'panel',
        html: `${head}<h2 class="qtext">Which picture is this formation?</h2>
          <div class="bigcall">${esc(formations[q.form].name)}</div>
          <div class="cards pics" role="group" aria-label="Pick the formation">${q.options.map((k, i) => `<button class="card" data-act="pick" data-v="${k}" type="button" aria-label="Option ${i + 1}: ${esc(formations[k].desc)}"><span class="th fth">${formDiagram(k, false)}</span></button>`).join('')}</div>
          <div class="tfb" id="tfb" role="status" aria-live="polite"></div>`,
      };
    },
    grade(q, btn) {
      const picked = btn.dataset.v, f = formations[q.answer];
      const miss = picked === q.answer ? '' : ` That was ${formations[picked].name}.`;
      return {
        ok: picked === q.answer,
        detail: `<b>${esc(f.name)}:</b> ${esc(f.desc)}${esc(miss)}`,
        rightEl: api.root.querySelector(`[data-v="${q.answer}"]`),
      };
    },
  });
}
