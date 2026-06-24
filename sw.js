/**
 * DRESSROOM — Service Worker
 * ───────────────────────────
 * Caches the app shell so it works fully offline after the first load,
 * and is required for the app to pass PWA installability checks
 * (PWABuilder, Chrome's installability criteria, etc).
 *
 * Bump CACHE_NAME whenever you change index.html so users get the update.
 */

const CACHE_NAME = 'dressroom-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
];

// ── INSTALL: pre-cache the app shell ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clean up old caches ──────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: cache-first for app shell, network-first for everything else ──
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // App shell files: cache-first (instant load, works offline)
  const isAppShell = APP_SHELL.some((path) =>
    url.pathname.endsWith(path.replace('./', '/'))
  );

  if (isAppShell) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req))
    );
    return;
  }

  // Everything else (e.g. the background-removal model files served from
  // the jsdelivr CDN): try network first, fall back to cache if offline.
  // This lets the ML model cache itself after first successful download,
  // so background removal keeps working offline afterwards.
  event.respondWith(
    fetch(req)
      .then((res) => {
        // Cache a copy for offline use next time
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
