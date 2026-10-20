// Service worker template. The build (see vite.config.js) fills in VERSION and FILES,
// so every deploy gets a fresh cache and old ones are deleted. Works fully offline after the first load.
const VERSION = '__VERSION__';
const CACHE = 'flc-' + VERSION;
const FILES = __FILES__;
const INDEX = new URL('index.html', self.registration.scope).href;
// Files are versioned by the build, so ignore Vary headers (some hosts send Vary: Origin, which makes module scripts miss the cache).
const MATCH = { ignoreVary: true };

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new URL(f, self.registration.scope).href)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('flc-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // The app is a single page: always answer page loads with the cached shell.
    event.respondWith(caches.match(INDEX, MATCH).then((hit) => hit || fetch(req)));
    return;
  }
  event.respondWith(caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((hit) => hit || fetch(req)));
});
