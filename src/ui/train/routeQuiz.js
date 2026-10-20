// Route quiz: see the route and pick its number, or see the number and pick the route.
import { esc } from '../dom.js';
import { routes } from '../../data/index.js';
import { routeRound, withArticle } from '../../engine/index.js';
import { routeDiagram, blurbLabel } from '../diagrams.js';
import { runQuiz } from './runner.js';

export function startRouteQuiz(api) {
  runQuiz(api, {
    title: 'Route numbers',
    questions: (rng, n) => routeRound(rng, n),
    show(q, head) {
      if (q.kind === 'routeNumber') {
        return {
          view: 'panel',
          html: `${head}<h2 class="qtext">What number is this route?</h2>
            <div class="rdiag">${routeDiagram(q.route)}</div>
            <div class="keypad10" role="group" aria-label="Pick the route number">${q.options.map((id) => `<button class="numkey" data-act="pick" data-v="${id}" type="button">${id}</button>`).join('')}</div>
            <div class="tfb" id="tfb" role="status" aria-live="polite"></div>`,
        };
      }
      return {
        view: 'panel',
        html: `${head}<h2 class="qtext">Which route is this number?</h2>
          <div class="bignum" aria-label="Route number ${q.route}">${q.route}</div>
          <div class="cards pics rpics" role="group" aria-label="Pick the route">${q.options.map((id, k) => `<button class="card" data-act="pick" data-v="${id}" type="button" aria-label="Option ${k + 1}: ${esc(blurbLabel(id))}"><span class="th rth">${routeDiagram(id, false)}</span></button>`).join('')}</div>
          <div class="tfb" id="tfb" role="status" aria-live="polite"></div>`,
      };
    },
    grade(q, btn) {
      const picked = +btn.dataset.v, r = routes[q.answer];
      const miss = picked === q.answer ? '' : ` That was ${withArticle(routes[picked].name)} (${picked}).`;
      return {
        ok: picked === q.answer,
        detail: `${q.answer} is ${esc(withArticle(r.name))}. ${esc(r.blurb)}${esc(miss)}`,
        rightEl: api.root.querySelector(`[data-v="${q.answer}"]`),
      };
    },
  });
}
