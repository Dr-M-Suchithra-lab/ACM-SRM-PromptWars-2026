// FairShift service worker: keeps the app shell available on weak or no network.
// API responses are never cached (they are personal and must be fresh).
const CACHE = "fairshift-v1";
const SHELL = [
  "/",
  "/worker",
  "/admin",
  "/css/app.css",
  "/js/common.js",
  "/js/i18n.js",
  "/js/worker.js",
  "/js/admin.js",
  "/js/landing.js",
  "/img/icons.svg",
  "/img/logo.svg",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Network first so updates show immediately; fall back to the cached shell offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
