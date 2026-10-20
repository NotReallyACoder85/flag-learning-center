import { parseCall } from '../src/engine/index.js';
import { formations, plays } from '../src/data/index.js';

export const FORM_KEYS = Object.keys(formations);
export const DEFS = ['none', 'c3', 'c2', 'man'];
export const MOTIONS = [null].concat(
  ['A', 'B', 'Y', 'Z'].flatMap((who) => ['cross', 'enter', 'exit'].map((tag) => ({ who, tag })))
);
export const libraryPlays = plays.map((p) => ({ ...parseCall(p.call), call: p.call }));
