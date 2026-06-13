// ── Luxus WC 2026 Service Worker ──────────────────────────────────────────────
const CACHE_NAME  = 'luxus-wc-v0.4.0';
const API_HOST    = 'raw.githubusercontent.com';

const STATIC_ASSETS = [
  './',
  './welcome.html',
  './index.html',
  './bracket.html',
  './dashboard.html',
  './leaderboard.html',
  './groups.html',
  './css/style.css',
  './js/version.js',
  './js/flags.js',
  './js/data.js',
  './js/api.js',
  './js/auth.js',
  './js/app.js',
  './js/bracket.js',
  './js/dashboard.js',
  './js/leaderboard.js',
  './js/groups.js',
  './js/welcome.js',
  './js/settings.js',
  './js/welcome-fixtures.js',
  './manifest.json',
];

// ── Install: pre-cache all static assets ──────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete stale caches ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  // Only handle same-scheme requests
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);

  // Network-first for the scores API (always try to fetch fresh data)
  if (url.hostname === API_HOST) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for Google Fonts and CDN assets
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'flagcdn.com') {
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        }))
    );
    return;
  }

  // Cache-first for everything else (static assets)
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      }))
  );
});
