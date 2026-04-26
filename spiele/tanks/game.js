/**
 * Multiplayer Jetkampf — WebSocket game: "tanks" (Legacy-ID)
 * Große Arena, Kamera auf eigenem Jet, MG-Dauerfeuer (Leertaste halten), Rand-Markierungen für Gegner.
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

let WORLD_W = 4800;
let WORLD_H = 3600;
let TW = 40;
let wallStr = "";

/** Sichtfeld (CSS-Pixel) */
let VW = 920;
let VH = 520;

/** @type {{ p: any[], b: any[], u?: any[], live?: boolean } | null} */
let lastState = null;
let imReady = false;

const keys = new Set();

let screenShake = 0;
let prevMyHp = null;
const bootTime = performance.now();

/** @type {{ x: number; y: number; vx: number; vy: number; life: number; col: string }[]} */
let particles = [];

function roundRectPath(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

function spawnBurst(x, y, col, n = 12) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 120 + Math.random() * 280;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.22 + Math.random() * 0.4,
      col,
    });
  }
  if (particles.length > 500) particles.splice(0, particles.length - 500);
}

function stepParticles(dt) {
  const sec = dt / 1000;
  for (const p of particles) {
    p.x += p.vx * sec;
    p.y += p.vy * sec;
    p.vx *= Math.pow(0.9, dt / 16);
    p.vy *= Math.pow(0.9, dt / 16);
    p.life -= sec;
  }
  particles = particles.filter((p) => p.life > 0);
}

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
  const cols = Math.floor(WORLD_W / TW);
  const rows = Math.floor(WORLD_H / TW);
  if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return true;
  return wallStr.charAt(ty * cols + tx) === "1";
}

function resizeCanvas() {
  const card = cv.closest(".card");
  const maxW = card ? Math.min(960, card.clientWidth - 28) : 920;
  const maxH = Math.min(560, typeof window !== "undefined" ? window.innerHeight * 0.52 : 520);
  VW = Math.max(480, Math.floor(maxW));
  VH = Math.max(320, Math.floor(maxH));
  cv.width = VW;
  cv.height = VH;
}

function drawWorld(camX, camY, dt, t) {
  const cols = Math.floor(WORLD_W / TW);
  const rows = Math.floor(WORLD_H / TW);
  const txi0 = Math.max(0, Math.floor(camX / TW) - 1);
  const txi1 = Math.min(cols - 1, Math.ceil((camX + VW) / TW) + 1);
  const tyi0 = Math.max(0, Math.floor(camY / TW) - 1);
  const tyi1 = Math.min(rows - 1, Math.ceil((camY + VH) / TW) + 1);

  const gridStep = 200;
  const gx0 = Math.floor(camX / gridStep) * gridStep;
  ctx.strokeStyle = "rgba(34,211,238,0.06)";
  ctx.lineWidth = 1;
  for (let x = gx0; x < camX + VW + gridStep; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, camY);
    ctx.lineTo(x, camY + VH);
    ctx.stroke();
  }
  const gy0 = Math.floor(camY / gridStep) * gridStep;
  for (let y = gy0; y < camY + VH + gridStep; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(camX, y);
    ctx.lineTo(camX + VW, y);
    ctx.stroke();
  }

  for (let ty = tyi0; ty <= tyi1; ty++) {
    for (let tx = txi0; tx <= txi1; tx++) {
      if (!wallAt(tx, ty)) continue;
      const x = tx * TW;
      const y = ty * TW;
      const g = ctx.createLinearGradient(x, y, x + TW, y + TW);
      g.addColorStop(0, "#1e3a5f");
      g.addColorStop(0.5, "#0f172a");
      g.addColorStop(1, "#020617");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, TW + 0.5, TW + 0.5);
      ctx.strokeStyle = "rgba(56,189,248,0.25)";
      ctx.strokeRect(x + 0.5, y + 0.5, TW - 1, TW - 1);
    }
  }

  for (const b of lastState.b || []) {
    const col = COLORS[b.o % COLORS.length] || "#fff";
    const spd = Math.hypot(b.vx, b.vy) || 1;
    const nx = b.vx / spd;
    const ny = b.vy / spd;
    const len = 22;
    const x1 = b.x - nx * len * 0.35;
    const y1 = b.y - ny * len * 0.35;
    const x2 = b.x + nx * len * 0.65;
    const y2 = b.y + ny * len * 0.65;
    const lg = ctx.createLinearGradient(x1, y1, x2, y2);
    lg.addColorStop(0, "rgba(255,255,255,0.05)");
    lg.addColorStop(0.35, col);
    lg.addColorStop(0.7, "#fff7c2");
    lg.addColorStop(1, "rgba(255,200,80,0)");
    ctx.strokeStyle = lg;
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.shadowColor = col;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  (lastState.p || []).forEach((pl, i) => {
    if (!pl) return;
    const col = COLORS[i % COLORS.length];

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(pl.x + 4, pl.y + 8, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (i === mySlot && online) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3);
      ctx.strokeStyle = `rgba(93,255,180,${0.25 + 0.2 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, 26 + pulse * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(pl.x, pl.y);
    ctx.rotate(pl.a);

    const body = ctx.createLinearGradient(18, 0, -20, 0);
    body.addColorStop(0, col);
    body.addColorStop(0.45, "rgba(255,255,255,0.35)");
    body.addColorStop(1, "rgba(15,23,42,0.95)");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(-16, -15);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-16, 15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(4, -5, 2.2, 0, Math.PI * 2);
    ctx.arc(4, 5, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(34,211,238,0.9)";
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-22, -7);
    ctx.lineTo(-18, 0);
    ctx.lineTo(-22, 7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    const barY = pl.y - 30;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    roundRectPath(ctx, pl.x - 20, barY - 1, 40, 8, 3);
    ctx.fill();
    const maxHp = 4;
    for (let h = 0; h < maxHp; h++) {
      ctx.fillStyle = h < pl.hp ? "rgba(248,113,113,0.95)" : "rgba(60,60,80,0.6)";
      ctx.fillRect(pl.x - 18 + h * 9, barY + 1.5, 7, 5);
    }
  });

  for (const p of particles) {
    const a = Math.max(0, p.life / 0.4);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.col;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2 + 2.5 * a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Rand-Chevrons für Gegner außerhalb des sichtbaren Mittelfelds */
function drawEnemyMarkers(camX, camY) {
  const me = lastState?.p?.[mySlot];
  if (!me || !lastState?.live) return;
  const pad = 18;
  const cx = VW / 2;
  const cy = VH / 2;
  const inner = 0.32;

  (lastState.p || []).forEach((pl, i) => {
    if (!pl || i === mySlot) return;
    const sx = pl.x - camX;
    const sy = pl.y - camY;
    if (sx > VW * inner && sx < VW * (1 - inner) && sy > VH * inner && sy < VH * (1 - inner)) return;

    const dx = sx - cx;
    const dy = sy - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const ndx = dx / dist;
    const ndy = dy / dist;

    let t = 1e9;
    if (ndx !== 0) {
      t = Math.min(t, ndx > 0 ? (VW - pad - cx) / ndx : (pad - cx) / ndx);
    }
    if (ndy !== 0) {
      t = Math.min(t, ndy > 0 ? (VH - pad - cy) / ndy : (pad - cy) / ndy);
    }
    if (!Number.isFinite(t) || t < 0) return;
    const ex = cx + ndx * t;
    const ey = cy + ndy * t;
    const ang = Math.atan2(dy, dx);
    const col = COLORS[i % COLORS.length];

    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(ang);
    ctx.fillStyle = col;
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-7, 7);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-7, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

let lastFrameTs = performance.now();

function draw() {
  const now = performance.now();
  const dt = Math.min(48, now - lastFrameTs);
  lastFrameTs = now;
  const t = (now - bootTime) / 1000;

  const me = lastState?.p?.[mySlot];
  if (me) {
    const hp = me.hp;
    if (prevMyHp != null && hp < prevMyHp) {
      screenShake = Math.min(1.2, screenShake + 0.5);
      spawnBurst(me.x, me.y, "#ff6b6b", 16);
    }
    prevMyHp = hp;
  } else {
    prevMyHp = null;
  }
  if (screenShake > 0.02) screenShake *= 0.86;
  else screenShake = 0;

  const sx = screenShake > 0 ? (Math.random() - 0.5) * 8 * screenShake : 0;
  const sy = screenShake > 0 ? (Math.random() - 0.5) * 8 * screenShake : 0;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const bg = ctx.createRadialGradient(VW * 0.4, VH * 0.15, 0, VW * 0.5, VH * 0.5, Math.max(VW, VH) * 0.9);
  bg.addColorStop(0, "#0c1224");
  bg.addColorStop(0.5, "#050810");
  bg.addColorStop(1, "#020308");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VW, VH);

  if (!lastState) return;

  stepParticles(dt);

  let camX = 0;
  let camY = 0;
  if (me) {
    camX = clamp(me.x - VW / 2, 0, Math.max(0, WORLD_W - VW));
    camY = clamp(me.y - VH / 2, 0, Math.max(0, WORLD_H - VH));
  }

  ctx.save();
  ctx.translate(sx, sy);

  if (online && lastState.live === false) {
    ctx.fillStyle = "rgba(2,4,10,0.78)";
    ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "900 17px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(34,211,238,0.35)";
    ctx.shadowBlur = 18;
    ctx.fillText("Lobby — 2+ Piloten, alle Ready", VW / 2, VH / 2 - 14);
    ctx.shadowBlur = 0;
    ctx.font = "600 13px system-ui,sans-serif";
    ctx.fillStyle = "rgba(200,210,230,.9)";
    ctx.fillText("Im Kampf: Kamera folgt deinem Jet · MG mit Leertaste halten", VW / 2, VH / 2 + 14);
    ctx.restore();
    return;
  }

  ctx.translate(-camX, -camY);
  drawWorld(camX, camY, dt, t);
  ctx.restore();

  ctx.save();
  ctx.translate(sx, sy);
  drawEnemyMarkers(camX, camY);
  ctx.restore();
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
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
resizeCanvas();
lastFrameTs = performance.now();
requestAnimationFrame(loop);
window.addEventListener("resize", () => resizeCanvas());

function sendInput() {
  if (!ws || ws.readyState !== 1) return;
  if (lastState && lastState.live === false) return;
  ws.send(
    JSON.stringify({
      t: "in",
      u: keys.has("KeyW") || keys.has("ArrowUp"),
      d: keys.has("KeyS") || keys.has("ArrowDown"),
      l: keys.has("KeyA") || keys.has("ArrowLeft"),
      r: keys.has("KeyD") || keys.has("ArrowRight"),
      f: keys.has("Space"),
    }),
  );
}

window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
    e.preventDefault();
  }
  sendInput();
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  sendInput();
});

setInterval(() => {
  if (online) sendInput();
}, 40);

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
    const nm = (document.getElementById("playerName")?.value || "").trim().slice(0, 18);
    ws.send(JSON.stringify({ t: "join", game: "tanks", code: code || "", name: nm }));
  });
  ws.addEventListener("close", () => {
    setNetLabel("Offline");
    online = false;
    imReady = false;
    const br = document.getElementById("btnReady");
    if (br) {
      br.textContent = "Ready";
      br.classList.remove("is-ready");
    }
    const lb = document.getElementById("lobbyLine");
    if (lb) lb.textContent = "";
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
    if (msg.t === "lobby") {
      const roster = Array.isArray(msg.roster) ? msg.roster : [];
      const lb = document.getElementById("lobbyLine");
      if (lb) {
        lb.textContent = roster.length
          ? "Raum: " + roster.map((r) => `P${Number(r.side) + 1}${r.name ? " " + r.name : ""}:${r.ready ? "✓" : "…"}`).join(" · ")
          : `Verbunden: ${msg.peers || 0}`;
      }
      const me = roster.find((r) => Number(r.side) === mySlot);
      if (me) imReady = !!me.ready;
      const br = document.getElementById("btnReady");
      if (br) {
        br.textContent = imReady ? "Nicht ready" : "Ready";
        br.classList.toggle("is-ready", imReady);
      }
      return;
    }
    if (msg.t === "joined") {
      roomCode = msg.code || "";
      roomInp.value = roomCode;
      mySlot = Number(msg.side) || 0;
      if (msg.W && msg.H) {
        WORLD_W = msg.W;
        WORLD_H = msg.H;
      }
      if (msg.tw) TW = msg.tw;
      if (msg.walls) wallStr = msg.walls;
      resizeCanvas();
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
  });
}

btnHost.addEventListener("click", () => connect(""));
btnJoin.addEventListener("click", () => connect((roomInp.value || "").trim()));

document.getElementById("btnReady")?.addEventListener("click", () => {
  if (!ws || ws.readyState !== 1) return;
  imReady = !imReady;
  ws.send(JSON.stringify({ t: "ready", v: imReady }));
  const br = document.getElementById("btnReady");
  if (br) {
    br.textContent = imReady ? "Nicht ready" : "Ready";
    br.classList.toggle("is-ready", imReady);
  }
});

btnReset.addEventListener("click", () => {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: "reset" }));
});

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
