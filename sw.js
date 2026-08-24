/* ============================================================
   Utah Bucket List — service worker
   Single job: make sure the installed (Add to Home Screen) app never
   shows stale code. Network-first for every same-origin request — the
   cache is only ever a fallback for when there's no connection at all,
   never the primary source. That's the opposite of the typical
   cache-first PWA pattern on purpose: freshness matters more here than
   offline support, and GitHub Pages caches everything (including
   index.html itself) for 10 minutes server-side with no way to
   override that from a static site, so relying on HTTP caching alone
   isn't enough for "always show what I just deployed."
   ============================================================ */

const CACHE_NAME = "utah-bucket-list-v1";

self.addEventListener("install", () => {
  // Don't wait for existing tabs/home-screen instances to close before
  // this version takes over.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
