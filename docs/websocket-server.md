# Öffentlicher WebSocket-Server (Render)

Spiele mit Online-Room (Pong, Panzer, Tic-Tac-Toe, RPS, UNO) nutzen denselben **Node/WebSocket-Server** auf Render.

| Verwendung | URL |
|--------------|-----|
| HTTP (Health / Info) | `https://thomas-projekte.onrender.com` |
| WebSocket (Clients: `netUrl` / gleicher Host) | `wss://thomas-projekte.onrender.com` |

- Im Browser immer **`wss://`** (TLS), nicht `ws://`, außer lokal beim Entwickeln.
- Server-Code: `server/pong-online/` (`server.js` + z. B. `tanks.js`).

Quelle: vom Projektbesitzer genannt; Health-Check liefert u. a. `pong-online ws server` auf der HTTP-Root.
