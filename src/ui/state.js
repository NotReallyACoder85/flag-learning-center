import { playbookEntries, playFromEntry } from '../engine/index.js';

const first = playFromEntry(playbookEntries[0]);

/** UI state. The play fields (form, digits, motion, def, slow) are passed straight to the engine. */
export const S = {
  form: first.form,
  digits: first.digits,
  motion: first.motion,
  name: first.name,
  playId: first.id, // set while a playbook play is loaded, null for anything the player built or typed
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
