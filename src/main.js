import './styles/fonts.js';
import './styles/base.css';
import './styles/app.css';
import { start } from './ui/app.js';

start();

// Offline support: only in the built app (the dev server must not cache files).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}));
}
