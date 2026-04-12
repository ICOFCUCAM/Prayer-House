// WANKONG Service Worker — offline-first for shell + API caching

const CACHE_VERSION = 'wk-v1';
const SHELL_CACHE   = `${CACHE_VERSION}-shell`;
const API_CACHE     = `${CACHE_VERSION}-api`;
const AUDIO_CACHE   = `${CACHE_VERSION}-audio`;

// Resources to cache on install (app shell)
const SHELL_ASSETS = [
  '/',
  '/manifest.json',
];

// ── Install ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('wk-') && k !== SHELL_CACHE && k !== API_CACHE && k !== AUDIO_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests (except Supabase CDN)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin && !url.hostname.includes('supabase')) return;

  // Audio files — cache-first with background refresh
  if (url.pathname.match(/\.(mp3|m4a|ogg|wav|aac|flac)$/i)) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(res => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // API (Supabase) — network-first, 3s timeout, fall back to cache
  if (url.hostname.includes('supabase')) {
    event.respondWith(
      Promise.race([
        fetch(request).then(res => {
          if (res.ok) {
            caches.open(API_CACHE).then(c => c.put(request, res.clone()));
          }
          return res;
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]).catch(() =>
        caches.match(request).then(cached => cached || new Response('{"error":"offline"}', {
          headers: { 'Content-Type': 'application/json' },
        }))
      )
    );
    return;
  }

  // App shell / static assets — cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok && request.destination !== 'video') {
          caches.open(SHELL_CACHE).then(c => c.put(request, res.clone()));
        }
        return res;
      }).catch(() =>
        // Offline fallback for navigation requests
        request.mode === 'navigate'
          ? caches.match('/')
          : new Response('', { status: 503 })
      );
    })
  );
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'WANKONG', body: event.data.text(), url: '/' };
  }

  const title   = payload.title   ?? 'WANKONG';
  const options = {
    body:    payload.body    ?? '',
    icon:    payload.icon    ?? '/pwa-192x192.png',
    badge:   payload.badge   ?? '/pwa-96x96.png',
    image:   payload.image,
    tag:     payload.tag     ?? 'wankong-notification',
    data:    { url: payload.url ?? '/' },
    actions: payload.actions ?? [],
    vibrate: [100, 50, 100],
    timestamp: payload.timestamp ?? Date.now(),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click → open / focus window ──────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Focus existing tab if already open on this origin
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// ── Background Sync (for queued uploads) ─────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'upload-sync') {
    event.waitUntil(flushUploadQueue());
  }
});

async function flushUploadQueue() {
  // Read queued uploads from IndexedDB and retry them
  // (Actual implementation depends on idb-keyval or similar)
  console.log('[SW] Background sync: upload-sync');
}
