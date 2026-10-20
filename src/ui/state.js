import { plays } from '../data/index.js';
import { parseCall } from '../engine/index.js';

const first = plays.find((p) => /\s[abyz]\s/i.test(p.call)) || plays[0];

/** UI state. The play fields (form, digits, motion, def, slow) are passed straight to the engine. */
export const S = {
  ...parseCall(first.call),
  name: first.name,
  def: 'c3',
  slow: false,
  zones: true,
  tilt: true,
  tab: 'play',
  sel: 'A',
  t: 0,
  playing: false,
};

/** Current built scene. */
export const ctx = { sc: null };
