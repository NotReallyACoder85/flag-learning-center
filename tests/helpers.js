import { parseCall } from '../src/engine/index.js';
import { formations, baseFormations, callbook } from '../src/data/index.js';

/** Formations you can type in a call. */
export const FORM_KEYS = baseFormations;
/** Every formation, including playbook-only ones (for engine sweeps). */
export const ALL_FORM_KEYS = Object.keys(formations);
export const DEFS = ['none', 'c3', 'c2', 'man'];
export const MOTIONS = [null].concat(
  ['A', 'B', 'Y', 'Z'].flatMap((who) => ['cross', 'enter', 'exit'].map((tag) => ({ who, tag })))
);
export const libraryPlays = callbook.map((p) => ({ ...parseCall(p.call), call: p.call }));
