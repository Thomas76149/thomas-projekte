# thomas.fun — Kleine Web-Sachen

Spiele, Mini-Tools und Tests — alles Vanilla HTML, CSS & JS, ohne Frameworks.

**Live:** https://thomas-projekte.pages.dev (Auto-Deploy via Cloudflare Pages bei jedem Push auf `main`)

## Struktur

- `index.html` + `css/` + `js/` — der Hub (Startseite mit Projektübersicht, Daten in `js/hub-data.js`)
- `spiele/<name>/` — ein Ordner pro Spiel/Tool
- `server/pong-online/` — Node.js-Server für die Online-Spiele
