/* WM 2026 — Service Worker (robust)
   - Navigationen: NETWORK-FIRST (neueste Version gewinnt; offline -> Cache-Fallback).
     So macht ein alter/kaputter Cache die Seite nie "nicht verfügbar".
   - Statische Assets (eigene Domain): cache-first.
   - Flaggen/Fonts: stale-while-revalidate. Live-Ergebnisse (GitHub): network-first.
   - Precache ist best-effort: einzelne fehlende Datei bricht die Installation nicht ab.
   Version hochzählen, wenn sich Shell-Dateien ändern. */
const VERSION = "wm2026-v6";
const SHELL = "shell-" + VERSION;
const RUNTIME = "rt-" + VERSION;
const CORE = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-180.png", "./icon-maskable-512.png",
  "./data/worldcup.json", "./data/worldcup.groups.json"
];
const FLAG_CODES = ["mx","za","kr","cz","ca","ba","qa","ch","br","ma","ht","gb-sct","us","py","au","tr","de","cw","ci","ec","nl","jp","se","tn","be","eg","ir","nz","es","cv","sa","uy","fr","sn","iq","no","ar","dz","at","jo","pt","cd","uz","co","gb-eng","hr","gh","pa"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    // Core muss klappen, Flaggen best-effort (allSettled)
    try { await c.addAll(CORE); } catch (_) {}
    await Promise.allSettled(FLAG_CODES.map(code => c.add("./flags/" + code + ".svg")));
    self.skipWaiting();
  })());
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== RUNTIME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 1) Navigationen -> NETWORK-FIRST
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(r => { caches.open(SHELL).then(c => c.put(req, r.clone())); return r; })
        .catch(() => caches.match(req).then(m => m || caches.match("./index.html")))
    );
    return;
  }
  // 2) Live-Ergebnisse (GitHub) -> network-first, Cache als Fallback
  if (url.hostname.includes("githubusercontent.com")) {
    e.respondWith(
      fetch(req).then(r => { const cp = r.clone(); caches.open(RUNTIME).then(c => c.put(req, cp)); return r; })
        .catch(() => caches.match(req))
    );
    return;
  }
  // 3) Flaggen-CDN / Fonts -> stale-while-revalidate
  if (url.hostname.includes("flagcdn.com") || url.hostname.includes("fonts.g")) {
    e.respondWith(
      caches.match(req).then(cached => {
        const net = fetch(req).then(r => { const cp = r.clone(); caches.open(RUNTIME).then(c => c.put(req, cp)); return r; }).catch(() => cached);
        return cached || net;
      })
    );
    return;
  }
  // 4) Eigene statische Assets -> cache-first, sonst Netz
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(r => {
        const cp = r.clone(); caches.open(SHELL).then(c => c.put(req, cp)); return r;
      }))
    );
  }
});
