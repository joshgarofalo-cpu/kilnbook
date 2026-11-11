// Service worker: a small helper the phone runs in the background.
// For now it keeps a copy of the app's files so the Home Screen app opens even on bad wifi.
// Later it will also receive push alerts for low stock.
//
// Strategy: always try the network first (so updates show up right away),
// and fall back to the saved copy only when offline. Database calls are never cached.
const CACHE = 'kilnbook-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('/')))
  );
});
