// Service worker for basic offline support without caching dynamic Next build assets.
// Important: never cache /_next/* files aggressively, otherwise CSS/JS can go stale.

const CACHE_NAME = "swapways-shell-v2";
const SHELL_URLS = ["/", "/dashboard"];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isNextBuildAsset(url) {
  return url.pathname.startsWith("/_next/");
}

function isNavigation(request) {
  return request.mode === "navigate";
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;

  // Let Next.js handle build assets with normal HTTP caching.
  if (isNextBuildAsset(url)) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-first for navigations to avoid stale HTML/app shell.
  if (isNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Stale-while-revalidate for same-origin non-build GET assets/pages.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

