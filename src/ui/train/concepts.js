// Concept cards: short lessons with a Watch it button.
import { esc } from '../dom.js';
import { concepts } from '../../data/index.js';
import { DEF_NAME } from '../../engine/index.js';

export function showConcepts(api) {
  api.setView(null);
  list();

  function list() {
    api.root.innerHTML = `<div class="thead"><button class="back" data-act="back" type="button">← Train</button><div class="tmeta"><b>Concept cards</b><span>Tap one to learn it</span></div></div>
      <div class="clist">${concepts.cards.map((c) => `<button class="ccard glass" data-act="open" data-id="${esc(c.id)}" type="button"><b>${esc(c.title)}</b><span>${esc(c.tagline)}</span></button>`).join('')}</div>`;
    api.setHandler((act, btn) => (act === 'back' ? api.hub() : act === 'open' ? detail(concepts.cards.find((c) => c.id === btn.dataset.id)) : null));
  }

  function detail(c) {
    api.root.innerHTML = `<div class="thead"><button class="back" data-act="list" type="button">← Concepts</button></div>
      <h2 class="ctitle">${esc(c.title)}</h2>
      <p class="ctag">${esc(c.tagline)}</p>
      <ol class="how">${c.how.map((h) => `<li>${esc(h)}</li>`).join('')}</ol>
      <div class="goodvs"><span>Great against:</span> ${c.goodVs.map((g) => `<i class="chip2">${esc(g)}</i>`).join('')}</div>
      <div class="look glass"><b>Look for it:</b> ${esc(c.look)}</div>
      <button class="cta" data-act="watch" type="button">Watch it</button>
      <p class="hint">Runs ${esc(c.watch.call)} against ${esc(DEF_NAME[c.watch.def])}.</p>`;
    api.setHandler((act) => (act === 'list' ? list() : act === 'watch' ? api.watch(c.watch.call, c.title, c.watch.def) : null));
  }
}
