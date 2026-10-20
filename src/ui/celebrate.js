// Little rewards: confetti for a right answer, a shake for a wrong one. Skipped for reduced-motion users.
import { reduceMotion } from './player.js';

const COLORS = ['#FFD21F', '#3170FF', '#FFFFFF', '#52E08E'];

export function burst() {
  if (reduceMotion) return;
  const wrap = document.createElement('div');
  wrap.className = 'confetti';
  wrap.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 36; i++) {
    const s = document.createElement('i');
    s.style.cssText = `left:${Math.random() * 100}%;background:${COLORS[i % 4]};animation-delay:${(Math.random() * 0.25).toFixed(2)}s;--dx:${Math.round((Math.random() - 0.5) * 160)}px;--r:${Math.round(Math.random() * 720)}deg`;
    wrap.appendChild(s);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 1800);
}

export function shake(el) {
  if (reduceMotion || !el) return;
  el.classList.remove('shake');
  void el.offsetWidth; // restart the animation
  el.classList.add('shake');
}
