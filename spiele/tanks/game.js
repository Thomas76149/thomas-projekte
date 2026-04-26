/**
 * Panzer — WebSocket wie Pong, game: "tanks"
 * Öffentlicher Server (Render): https://thomas-projekte.onrender.com
 */
const DEFAULT_WSS_URL = "wss://thomas-projekte.onrender.com";

const COLORS = ["#5dffb4", "#22d3ee", "#f97316", "#c084fc"];

const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");
const netStat = document.getElementById("netStat");
const netUrl = document.getElementById("netUrl");
const roomInp = document.getElementById("roomInp");
const btnHost = document.getElementById("btnHost");
const btnJoin = document.getElementById("btnJoin");
const btnReset = document.getElementById("btnReset");
const hudEl = document.getElementById("hud");

let ws = null;
let online = false;
let mySlot = 0;
let roomCode = "";

let W = 768;
let H = 624;
let TW = 24;
let wallStr = "";

/** @type {{ p: any[], b: any[], u: any[] } | null} */
let lastState = null;

const keys = new Set();

try {
  const saved = localStorage.getItem("tanks_ws_url") || localStorage.getItem("pong_ws_url");
  netUrl.value = (saved && String(saved).trim()) || DEFAULT_WSS_URL;
} catch {
  netUrl.value = DEFAULT_WSS_URL;
}

function normalizeWsUrl(u) {
  const s = (u || "").trim();
  if (!s) return "";
  return s.replace(/^http/i, "ws");
}

function setNetLabel(txt, ok = false) {
  netStat.textContent = txt;
  netStat.style.borderColor = ok ? "rgba(93,255,180,.4)" : "rgba(255,255,255,.14)";
  netStat.style.color = ok ? "rgba(93,255,180,.95)" : "rgba(255,255,255,.85)";
}

function wallAt(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= W / TW || ty >= H / TW) return true;
  const cols = W / TW;
  return wallStr.charAt(ty * cols + tx) === "1";
}

function draw() {
  ctx.fillStyle = "#060a10";
  ctx.fillRect(0, 0, W, H);

  const cols = W / TW;
  const rows = H / TW;
  ctx.fillStyle = "#1e293b";
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      if (wallAt(tx, ty)) {
        ctx.fillRect(tx * TW, ty * TW, TW + 0.5, TW + 0.5);
      }
    }
  }
  ctx.strokeStyle = "rgba(34,211,238,.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += TW) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += TW) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  if (!lastState) return;

  for (const u of lastState.u || []) {
    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle =
      u.t === "H" ? "rgba(74,222,128,.85)" : u.t === "R" ? "rgba(251,146,60,.9)" : u.t === "S" ? "rgba(56,189,248,.9)" : "rgba(192,132,252,.9)";
    const s = 10;
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.restore();
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 9px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(u.t, u.x, u.y);
  }

  for (const b of lastState.b || []) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = COLORS[b.o % COLORS.length] || "#fff";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  (lastState.p || []).forEach((pl, i) => {
    if (!pl) return;
    const col = COLORS[i % COLORS.length];
    if (i === mySlot && online) {
      ctx.strokeStyle = "rgba(255,255,255,.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(pl.x, pl.y, 13, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = pl.iv ? "rgba(255,255,255,.7)" : "rgba(0,0,0,.45)";
    ctx.lineWidth = pl.iv ? 3 : 2;
    ctx.stroke();

    const br = 22;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pl.x, pl.y);
    ctx.lineTo(pl.x + Math.cos(pl.a) * br, pl.y + Math.sin(pl.a) * br);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pl.x + Math.cos(pl.a) * 6, pl.y + Math.sin(pl.a) * 6);
    ctx.lineTo(pl.x + Math.cos(pl.a) * br, pl.y + Math.sin(pl.a) * br);
    ctx.stroke();

    for (let h = 0; h < pl.hp; h++) {
      ctx.fillStyle = "rgba(248,113,113,.9)";
      ctx.fillRect(pl.x - 16 + h * 8, pl.y - 22, 6, 3);
    }
    if (pl.sh > 0) {
      ctx.strokeStyle = "rgba(192,132,252,.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, 16, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

function syncHud() {
  if (!lastState) {
    hudEl.innerHTML = "";
    return;
  }
  const parts = [];
  (lastState.p || []).forEach((pl, i) => {
    if (!pl) return;
    parts.push(
      `<span class="pill" style="border-color:${COLORS[i]}55">P${i + 1}: ♥${pl.hp} · ${pl.k}★</span>`,
    );
  });
  hudEl.innerHTML = parts.join(" ") || '<span class="pill">Warte auf State…</span>';
}

function loop() {
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function sendInput() {
  if (!ws || ws.readyState !== 1) return;
  ws.send(
    JSON.stringify({
      t: "in",
      u: keys.has("KeyW") || keys.has("ArrowUp"),
      d: keys.has("KeyS") || keys.has("ArrowDown"),
      l: keys.has("KeyA") || keys.has("ArrowLeft"),
      r: keys.has("KeyD") || keys.has("ArrowRight"),
    }),
  );
}

function sendFire() {
  if (!ws || ws.readyState !== 1) return;
  ws.send(JSON.stringify({ t: "fire" }));
}

window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === "Space") sendFire();
  sendInput();
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  sendInput();
});

setInterval(() => {
  if (online) sendInput();
}, 50);

function connect(code) {
  const url = normalizeWsUrl(netUrl.value);
  if (!url) return;
  try {
    localStorage.setItem("tanks_ws_url", url);
  } catch {
    /* ignore */
  }

  try {
    ws && ws.close();
  } catch {
    /* ignore */
  }
  ws = null;
  online = true;
  btnHost.disabled = true;
  btnJoin.disabled = true;
  setNetLabel("Verbinden…");

  ws = new WebSocket(url);
  ws.addEventListener("open", () => {
    setNetLabel("Verbunden…", true);
    ws.send(JSON.stringify({ t: "join", game: "tanks", code: code || "" }));
  });
  ws.addEventListener("close", () => {
    setNetLabel("Offline");
    online = false;
    btnHost.disabled = false;
    btnJoin.disabled = false;
  });
  ws.addEventListener("error", () => setNetLabel("Fehler"));
  ws.addEventListener("message", (ev) => {
    let msg = null;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (!msg) return;
    if (msg.t === "err") {
      setNetLabel(msg.m || "Fehler");
      return;
    }
    if (msg.t === "joined") {
      roomCode = msg.code || "";
      roomInp.value = roomCode;
      mySlot = Number(msg.side) || 0;
      if (msg.W && msg.H) {
        W = msg.W;
        H = msg.H;
        cv.width = W;
        cv.height = H;
      }
      if (msg.tw) TW = msg.tw;
      if (msg.walls) wallStr = msg.walls;
      setNetLabel(`Online · ${roomCode} · Du: P${mySlot + 1}`, true);
      return;
    }
    if (msg.t === "state" && msg.s) {
      lastState = msg.s;
      syncHud();
      return;
    }
    if (msg.t === "reset") {
      return;
    }
    if (msg.t === "peers") {
      /* optional */
    }
  });
}

btnHost.addEventListener("click", () => connect(""));
btnJoin.addEventListener("click", () => connect((roomInp.value || "").trim()));

btnReset.addEventListener("click", () => {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: "reset" }));
});

/** URL-Params ?ws=…&room=… */
(function bootParams() {
  try {
    const p = new URLSearchParams(location.search);
    const w = p.get("ws");
    const r = p.get("room");
    if (w) netUrl.value = w;
    if (r) roomInp.value = r;
    if (w && r) connect(r);
    else if (w) connect("");
  } catch {
    /* ignore */
  }
})();
