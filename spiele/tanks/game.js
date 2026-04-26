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

/** @type {{ p: any[], b: any[], u: any[], live?: boolean } | null} */
let lastState = null;
let imReady = false;

const keys = new Set();

let screenShake = 0;
let prevMyHp = null;
let muzzleUntil = 0;
const bootTime = performance.now();

/** @type {{ x: number; y: number; vx: number; vy: number; life: number; col: string }[]} */
let particles = [];

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function spawnBurst(x, y, col, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 80 + Math.random() * 220;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.25 + Math.random() * 0.35,
      col,
    });
  }
  if (particles.length > 400) particles.splice(0, particles.length - 400);
}

function stepParticles(dt) {
  const sec = dt / 1000;
  for (const p of particles) {
    p.x += p.vx * sec;
    p.y += p.vy * sec;
    p.vx *= Math.pow(0.92, dt / 16);
    p.vy *= Math.pow(0.92, dt / 16);
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
  if (tx < 0 || ty < 0 || tx >= W / TW || ty >= H / TW) return true;
  const cols = W / TW;
  return wallStr.charAt(ty * cols + tx) === "1";
}

let lastFrameTs = performance.now();

function draw() {
  const now = performance.now();
  const dt = Math.min(48, now - lastFrameTs);
  lastFrameTs = now;
  const t = (now - bootTime) / 1000;
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);

  if (lastState?.p?.[mySlot]) {
    const hp = lastState.p[mySlot].hp;
    if (prevMyHp != null && hp < prevMyHp) {
      screenShake = Math.min(1.15, screenShake + 0.55);
      spawnBurst(lastState.p[mySlot].x, lastState.p[mySlot].y, "#ff6b6b", 14);
    }
    prevMyHp = hp;
  } else {
    prevMyHp = null;
  }
  if (screenShake > 0.02) screenShake *= 0.86;
  else screenShake = 0;

  const sx = screenShake > 0 ? (Math.random() - 0.5) * 7 * screenShake : 0;
  const sy = screenShake > 0 ? (Math.random() - 0.5) * 7 * screenShake : 0;

  ctx.save();
  ctx.translate(sx, sy);

  const bg = ctx.createRadialGradient(W * 0.35, H * 0.2, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.85);
  bg.addColorStop(0, "#0f172a");
  bg.addColorStop(0.45, "#070b14");
  bg.addColorStop(1, "#020308");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const gridOff = (t * 18) % TW;
  const gridA = 0.05 + 0.035 * pulse;
  ctx.strokeStyle = `rgba(34,211,238,${gridA})`;
  ctx.lineWidth = 1;
  for (let x = -TW; x <= W + TW; x += TW) {
    const gx = x + gridOff * 0.15;
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, H);
    ctx.stroke();
  }
  for (let y = -TW; y <= H + TW; y += TW) {
    const gy = y + gridOff * 0.1;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(W, gy);
    ctx.stroke();
  }

  const cols = W / TW;
  const rows = H / TW;
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      if (!wallAt(tx, ty)) continue;
      const x = tx * TW;
      const y = ty * TW;
      const g = ctx.createLinearGradient(x, y, x + TW, y + TW);
      g.addColorStop(0, "#334155");
      g.addColorStop(0.5, "#1e293b");
      g.addColorStop(1, "#0f172a");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, TW + 0.5, TW + 0.5);
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(x, y, TW + 0.5, 2.5);
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(x, y, 2.5, TW + 0.5);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(x + TW - 2.5, y, 2.5, TW + 0.5);
      ctx.fillRect(x, y + TW - 2.5, TW + 0.5, 2.5);
    }
  }

  if (!lastState) {
    ctx.restore();
    return;
  }

  stepParticles(dt);

  for (const u of lastState.u || []) {
    const bob = Math.sin(t * 3.2 + u.x * 0.05) * 2;
    const sc = 1 + 0.12 * Math.sin(t * 4 + u.y * 0.04);
    const col =
      u.t === "H"
        ? "rgba(74,222,128,1)"
        : u.t === "R"
          ? "rgba(251,146,60,1)"
          : u.t === "S"
            ? "rgba(56,189,248,1)"
            : "rgba(192,132,252,1)";
    ctx.save();
    ctx.translate(u.x, u.y + bob);
    ctx.rotate((Math.PI / 4) + t * 0.8);
    ctx.scale(sc, sc);
    ctx.shadowColor = col;
    ctx.shadowBlur = 18;
    ctx.fillStyle = col;
    const s = 9;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.font = "900 10px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(u.t, u.x + 0.7, u.y + bob + 0.7);
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(u.t, u.x, u.y + bob);
    ctx.restore();
  }

  for (const b of lastState.b || []) {
    const col = COLORS[b.o % COLORS.length] || "#fff";
    const rg = ctx.createRadialGradient(b.x - 1, b.y - 1, 0, b.x, b.y, 10);
    rg.addColorStop(0, "#ffffff");
    rg.addColorStop(0.35, col);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4.2, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  if (online && lastState.live === false) {
    ctx.fillStyle = "rgba(2,4,10,0.72)";
    ctx.fillRect(0, 0, W, H);
    const vx = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, Math.max(W, H) * 0.5);
    vx.addColorStop(0, "rgba(34,211,238,0.08)");
    vx.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = vx;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "900 18px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(34,211,238,0.4)";
    ctx.shadowBlur = 20;
    ctx.fillText("Lobby — 2+ Panzer, alle Ready", W / 2, H / 2 - 16);
    ctx.shadowBlur = 0;
    ctx.font = "600 13px system-ui,sans-serif";
    ctx.fillStyle = "rgba(200,210,230,.92)";
    ctx.fillText("Steuerung erst im laufenden Kampf aktiv.", W / 2, H / 2 + 14);
    ctx.restore();
    return;
  }

  (lastState.p || []).forEach((pl, i) => {
    if (!pl) return;
    const col = COLORS[i % COLORS.length];

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(pl.x + 3, pl.y + 5, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (i === mySlot && online) {
      ctx.strokeStyle = `rgba(93,255,180,${0.35 + 0.25 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, 21 + pulse * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(pl.x, pl.y);
    ctx.rotate(pl.a);

    const bodyG = ctx.createLinearGradient(-12, -10, 12, 10);
    bodyG.addColorStop(0, col);
    bodyG.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = "rgba(15,23,42,0.95)";
    roundRectPath(ctx, -11, -9, 22, 18, 5);
    ctx.fill();
    ctx.fillStyle = bodyG;
    roundRectPath(ctx, -10, -8, 20, 16, 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, -10, -8, 20, 16, 4);
    ctx.stroke();

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(-11, -9, 4, 18);
    ctx.fillRect(7, -9, 4, 18);

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    const turG = ctx.createRadialGradient(-2, -2, 0, 0, 0, 8);
    turG.addColorStop(0, col);
    turG.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = turG;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const bx0 = 7;
    const bw = 17;
    const bh = 5;
    ctx.fillStyle = "rgba(15,23,42,1)";
    roundRectPath(ctx, bx0, -bh / 2 - 0.5, bw + 1, bh + 1, 2);
    ctx.fill();
    const barG = ctx.createLinearGradient(bx0, 0, bx0 + bw, 0);
    barG.addColorStop(0, "#475569");
    barG.addColorStop(0.5, "#94a3b8");
    barG.addColorStop(1, "#1e293b");
    ctx.fillStyle = barG;
    roundRectPath(ctx, bx0, -bh / 2, bw, bh, 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    roundRectPath(ctx, bx0, -bh / 2, bw, bh, 2);
    ctx.stroke();

    if (now < muzzleUntil && i === mySlot && online) {
      ctx.save();
      ctx.translate(bx0 + bw, 0);
      const mz = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
      mz.addColorStop(0, "rgba(255,255,255,0.95)");
      mz.addColorStop(0.4, "rgba(255,200,100,0.5)");
      mz.addColorStop(1, "rgba(255,100,50,0)");
      ctx.fillStyle = mz;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    const barY = pl.y - 24;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    roundRectPath(ctx, pl.x - 18, barY - 1, 36, 7, 2);
    ctx.fill();
    for (let h = 0; h < pl.hp; h++) {
      ctx.fillStyle = "rgba(248,113,113,0.95)";
      ctx.fillRect(pl.x - 16 + h * 8, barY + 1, 6, 4);
    }

    if (pl.sh > 0) {
      ctx.strokeStyle = `rgba(192,132,252,${0.65 + 0.25 * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, 18 + pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  for (const p of particles) {
    const a = Math.max(0, p.life / 0.35);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.col;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2 + 2 * a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore();
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
lastFrameTs = performance.now();
requestAnimationFrame(loop);

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
    }),
  );
}

function sendFire() {
  if (!ws || ws.readyState !== 1) return;
  if (lastState && lastState.live === false) return;
  ws.send(JSON.stringify({ t: "fire" }));
}

window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === "Space") {
    sendFire();
    if (online && lastState?.live !== false) muzzleUntil = performance.now() + 90;
  }
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
    const nm = (document.getElementById("playerName")?.value || "").trim().slice(0, 18);
    ws.send(JSON.stringify({ t: "join", game: "tanks", code: code || "", name: nm }));
  });
  ws.addEventListener("close", () => {
    setNetLabel("Offline");
    online = false;
    imReady = false;
    const br = document.getElementById("btnReady");
    if (br) br.textContent = "Ready";
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
      if (br) br.textContent = imReady ? "Nicht ready" : "Ready";
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

document.getElementById("btnReady")?.addEventListener("click", () => {
  if (!ws || ws.readyState !== 1) return;
  imReady = !imReady;
  ws.send(JSON.stringify({ t: "ready", v: imReady }));
  const br = document.getElementById("btnReady");
  if (br) br.textContent = imReady ? "Nicht ready" : "Ready";
});

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
