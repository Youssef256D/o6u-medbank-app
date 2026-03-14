const serviceWorkerUrl = new URL(self.location.href);
const cacheVersion = String(serviceWorkerUrl.searchParams.get("v") || "").trim();
const versionSuffix = cacheVersion ? `?v=${encodeURIComponent(cacheVersion)}` : "";
const CACHE_NAME = `o6u-medbank-static-v${(cacheVersion || "runtime").replace(/\./g, "-")}`;

const PRECACHE_URLS = [
  `./styles.css${versionSuffix}`,
  `./bootstrap.js${versionSuffix}`,
  `./main.js${versionSuffix}`,
  `./supabase.config.js${versionSuffix}`,
  "./manifest.webmanifest",
  "./robots.txt",
  "./sitemap.xml",
  "./Assets/Fav%20icon.png",
  "./Assets/web%20Logo.png",
  "./Assets/branding/apple-touch-icon.png",
  "./Assets/branding/favicon-192x192.png",
  "./Assets/branding/favicon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  const isVersioned = requestUrl.searchParams.has("v");
  if (!isVersioned) {
    event.respondWith(
      fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => caches.match(request)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
    }),
  );
});
