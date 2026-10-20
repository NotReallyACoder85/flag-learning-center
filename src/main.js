import './styles/fonts.js';
import './styles/base.css';
import { formations, routes, plays, settings } from './data/index.js';

// Phase 0 placeholder: proves data and fonts load. Replaced by the real UI in Phase 2.
document.querySelector('#app').innerHTML = `
  <section class="glass" style="padding:20px">
    <h1 style="font:900 2.4rem/1 var(--f-disp);text-transform:uppercase;margin:0 0 8px">${settings.appName}</h1>
    <p style="color:var(--muted);margin:0">
      Loaded ${plays.length} plays, ${Object.keys(formations).length} formations, ${routes.length} routes.
    </p>
  </section>`;
