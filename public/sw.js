// Service worker for basic offline support without caching dynamic Next build assets.
// Important: never cache /_next/* files aggressively, otherwise CSS/JS can go stale.

const CACHE_NAME = "swapways-shell-v5";

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

/** Never cache favicons / PWA icons — stale SW cache kept showing the old Vercel tab icon. */
function isIconOrManifest(url) {
  const p = url.pathname;
  if (p === "/favicon.ico") return true;
  if (p === "/manifest.webmanifest") return true;
  if (p === "/icon" || p.startsWith("/icon.")) return true;
  if (p === "/apple-icon" || p.startsWith("/apple-icon.")) return true;
  if (p.startsWith("/images/") && (p.includes("logo") || p.includes("icon"))) return true;
  return false;
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

  // Always fetch fresh icons so the browser tab matches the latest deploy.
  if (isIconOrManifest(url)) {
    event.respondWith(fetch(request));
    return;
  }

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
