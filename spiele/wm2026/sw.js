/* WM 2026 — Service Worker
   - App-Shell: cache-first (offline startfähig)
   - Flaggen (flagcdn) + Fonts: stale-while-revalidate (nach 1. Laden offline da)
   - Ergebnis-Daten holt die App selbst live; SW cached nur als Fallback.
   Cache-Version hochzählen, wenn sich Shell-Dateien ändern. */
const VERSION = "wm2026-v3";
const SHELL = "shell-" + VERSION;
const RUNTIME = "rt-" + VERSION;
const SHELL_FILES = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-180.png", "./icon-maskable-512.png",
  "./data/worldcup.json", "./data/worldcup.groups.json"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Live-Ergebnisse (GitHub raw): immer Netz zuerst, Fallback Cache
  if (url.hostname.includes("githubusercontent.com")) {
    e.respondWith(
      fetch(req).then(r => { const cp = r.clone(); caches.open(RUNTIME).then(c => c.put(req, cp)); return r; })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Flaggen + Fonts: stale-while-revalidate
  if (url.hostname.includes("flagcdn.com") || url.hostname.includes("fonts.g")) {
    e.respondWith(
      caches.match(req).then(cached => {
        const net = fetch(req).then(r => { const cp = r.clone(); caches.open(RUNTIME).then(c => c.put(req, cp)); return r; }).catch(() => cached);
        return cached || net;
      })
    );
    return;
  }

  // App-Shell (eigene Domain): cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(r => {
        const cp = r.clone(); caches.open(SHELL).then(c => c.put(req, cp)); return r;
      }).catch(() => caches.match("./index.html")))
    );
  }
});
