export const $ = (sel, root = document) => root.querySelector(sel);
export const NS = 'http://www.w3.org/2000/svg';

/** Create an SVG element with attributes, optionally appended to a parent. */
export function el(name, attrs = {}, parent) {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);
export const cap = (s) => s[0].toUpperCase() + s.slice(1);
