// Service worker: hybrid strategy.
// - Network-first (with cache fallback) for app shell — HTML, app/parser/style.
//   Ensures updates land on next online visit without manual cache clearing.
// - Cache-first for the heavy static library (jsQR) and icons.
// - Stale cache is wiped on every activation.

const VERSION = 'v12';
const CACHE_NAME = `emvco-qr-scanner-${VERSION}`;
const NETWORK_TIMEOUT_MS = 2500;

const APP_SHELL = [
  './',
  'index.html',
  'app.js',
  'parser.js',
  'visit.js',
  'style.css',
  'manifest.json',
];

const STATIC_ASSETS = [
  'lib/jsQR.js',
  'icon.svg',
];

const PRECACHE = [...APP_SHELL, ...STATIC_ASSETS];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // ignore cross-origin

  const path = url.pathname.replace(/^.*\//, '');
  const isStatic = STATIC_ASSETS.some(a => a.endsWith(path)) || path === 'icon.svg' || path === 'jsQR.js';

  if (isStatic) {
    e.respondWith(cacheFirst(e.request));
  } else {
    e.respondWith(networkFirst(e.request));
  }
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const resp = await fetch(req);
    const copy = resp.clone();
    caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
    return resp;
  } catch {
    return cached || Response.error();
  }
}

async function networkFirst(req) {
  try {
    const resp = await Promise.race([
      fetch(req),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS)),
    ]);
    if (resp && resp.ok) {
      const copy = resp.clone();
      caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
      return resp;
    }
    const cached = await caches.match(req);
    return cached || resp;
  } catch {
    const cached = await caches.match(req);
    return cached || new Response('Offline and not cached', { status: 503 });
  }
}
