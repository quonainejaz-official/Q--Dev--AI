/**
 * Service Worker for Q-Dev-AI PWA (17).
 * Caches static assets for offline access. API calls go to network only.
 */

const CACHE_NAME = "qai-v3";
const STATIC_ASSETS = [
  "/",
  "/css/styles.css",
  "/js/chat.js",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only cache same-origin GET requests for static assets.
  if (request.method !== "GET") return;
  if (!request.url.startsWith(self.location.origin)) return;

  // API calls: network only.
  if (request.url.includes("/api/")) return;

  // Always prefer the latest HTML after a deployment. Previously `/` was
  // served cache-first, which could leave users on old markup while newer JS
  // and CSS were loaded from the network.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  const isFreshAsset =
    request.destination === "script" ||
    request.destination === "style" ||
    request.url.endsWith(".js") ||
    request.url.endsWith(".css");

  if (isFreshAsset) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      // Return cached, but also fetch fresh copy in background.
      const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
