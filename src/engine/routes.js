import { routes } from '../data/index.js';

/** Route by number 0-9. */
export const ROUTES = routes;
/** Route by number, or undefined for "no route" (null). */
export const routeFor = (n) => (n == null ? undefined : routes[n]);
export const hasRoute = (n) => n != null;
