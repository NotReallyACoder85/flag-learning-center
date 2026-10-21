import { routes } from '../data/index.js';

/** The ten numbered routes. */
export const ROUTES = routes;

/**
 * A receiver's route: a tree number (0-9), a drawn route object (from the playbook), or null for none.
 * Returns the route ({ name, kind, points, ... }) or undefined when he has no route.
 */
export const routeFor = (d) => (d == null ? undefined : typeof d === 'object' ? d : routes[d]);
export const hasRoute = (d) => d != null;
