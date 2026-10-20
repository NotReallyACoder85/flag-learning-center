// Service worker template. The build (see vite.config.js) fills in VERSION and FILES,
// so every deploy gets a fresh cache and old ones are deleted. Works fully offline after the first load.
const VERSION = '3ed6e2ba3b';
const CACHE = 'flc-' + VERSION;
const FILES = ["assets/barlow-condensed-latin-500-normal-BgYH2mbd.woff2","assets/barlow-condensed-latin-500-normal-HIEiP5Ov.woff","assets/barlow-condensed-latin-600-normal-BFJEwTuo.woff","assets/barlow-condensed-latin-600-normal-DepVgxBB.woff2","assets/barlow-condensed-latin-700-normal-Dmwat-ge.woff","assets/barlow-condensed-latin-700-normal-v1xN8_Wq.woff2","assets/barlow-latin-400-normal-fsAxiSwU.woff","assets/barlow-latin-400-normal-qiz4-Cze.woff2","assets/barlow-latin-500-normal-BPAOfeC8.woff2","assets/barlow-latin-500-normal-C1h8hMer.woff","assets/barlow-latin-600-normal-CNwfPWQD.woff","assets/barlow-latin-600-normal-DILqtrty.woff2","assets/barlow-latin-700-normal-A9pxMQ4z.woff2","assets/barlow-latin-700-normal-__SGTsZ1.woff","assets/big-shoulders-display-latin-700-normal-CMi6UoP4.woff","assets/big-shoulders-display-latin-700-normal-KM2fueoL.woff2","assets/big-shoulders-display-latin-800-normal-CI0lhnTM.woff","assets/big-shoulders-display-latin-800-normal-DDUD9Xuh.woff2","assets/big-shoulders-display-latin-900-normal-CW8trzgu.woff2","assets/big-shoulders-display-latin-900-normal-DMT-1gsg.woff","assets/index-BH6f2U9U.js","assets/index-B_1e04yl.css","icons/favicon.png","icons/icon-180.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","index.html","manifest.webmanifest"];
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
