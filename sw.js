// Service worker: precache app shell so the scanner works fully offline once installed.

const VERSION = 'v3';
const CACHE_NAME = `emvco-qr-scanner-${VERSION}`;
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'parser.js',
  'app.js',
  'manifest.json',
  'icon.svg',
  'lib/jsQR.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first strategy: serve from cache, fall back to network, then update cache.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        const url = new URL(e.request.url);
        if (url.origin === self.location.origin) {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
