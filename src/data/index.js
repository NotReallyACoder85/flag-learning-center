// Single entry point for all coach-editable data files.
import formations from './formations.json';
import routes from './routes.json';
import callbook from './callbook.json';
import playbook from './playbook.json';
import settings from './settings.json';
import copy from './copy.json';
import concepts from './concepts.json';

export { formations, routes, callbook, playbook, settings, copy, concepts };

/** Formations a player can pick in Draw Up and meet in the formation quiz (playbook-only sets are left out). */
export const baseFormations = Object.keys(formations).filter((k) => !formations[k].playbook);
