// Turns a playbook entry (data) into a play the engine can run: { form, digits, motion, name, id }.
// digits go in A, B, Y, Z, C order, the same as a play call. Each is a drawn route object.
import { playbook } from '../data/index.js';

const ORDER = ['A', 'B', 'Y', 'Z', 'C'];

export function playFromEntry(entry) {
  return {
    id: entry.id,
    name: entry.name,
    form: entry.formation,
    digits: ORDER.map((l) => entry.routes[l]),
    motion: entry.motion ? { who: entry.motion.who, tag: 'custom', to: entry.motion.to } : null,
  };
}

export const playbookEntries = playbook.plays;
export const playbookSections = playbook.sections;
export const findEntry = (id) => playbook.plays.find((p) => p.id === id);
