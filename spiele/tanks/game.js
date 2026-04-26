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

/** @type {{ x: number; y: number; vx: number; vy: number; life: number; col: string; sz?: number }[]} */
let particles = [];

/** Schockwellen wenn Kugeln verglühen (Wand/Timeout/Treffer) */
/** @type {{ x: number; y: number; r: number; life: number; maxLife: number; col: string }[]} */
let shockRings = [];

/** Muzzle-Flash am eigenen Jet */
/** @type {{ x: number; y: number; a: number; life: number; maxLife: number }[]} */
let muzzleFlashes = [];

/** Letzter Bullet-Snapshot für Verschwinden-Erkennung */
/** @type {{ x: number; y: number; vx: number; vy: number; o: number }[]} */
let prevBullets = [];
let wasMatchLive = false;
let myPrevBulletCount = 0;
let lastShootSfxMs = 0;
let lastThrustSfxMs = 0;
let lastDespawnSfxMs = 0;

/** Parallax-Sterne (Weltkoordinaten) */
/** @type {{ x: number; y: number; z: number; tw: number }[]} */
let starField = [];

/** Schub-Kondensstreifen (eigener Jet) */
/** @type {{ x: number; y: number; life: number }[]} */
let engineTrail = [];

/** @type {AudioContext | null} */
let audioCtx = null;

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
  for (const r of shockRings) {
    r.life -= sec;
    r.r += dt * 0.22;
  }
  shockRings = shockRings.filter((r) => r.life > 0);
  for (const m of muzzleFlashes) {
    m.life -= sec;
  }
  muzzleFlashes = muzzleFlashes.filter((m) => m.life > 0);
  for (const tr of engineTrail) {
    tr.life -= sec;
  }
  engineTrail = engineTrail.filter((tr) => tr.life > 0);
  if (engineTrail.length > 140) engineTrail.splice(0, engineTrail.length - 140);
}

function initStarField() {
  if (starField.length) return;
  const rnd = (s) => {
    let x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  let s = 12.9898;
  const n = 420;
  for (let i = 0; i < n; i++) {
    s += 1.618;
    starField.push({
      x: rnd(s) * WORLD_W,
      y: rnd(s * 1.7) * WORLD_H,
      z: 0.3 + rnd(s * 2.1) * 0.7,
      tw: rnd(s * 3.2) > 0.92 ? 2.2 : 1,
    });
  }
}

function ensureAudio() {
  if (audioCtx) return audioCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    audioCtx = new AC();
  } catch {
    return null;
  }
  return audioCtx;
}

function resumeAudio() {
  const c = ensureAudio();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

["pointerdown", "keydown", "touchstart"].forEach((ev) => {
  window.addEventListener(ev, () => resumeAudio(), { passive: true });
});

/** Kurzer SFX — Asteroiden-Cab-Stil */
function sfxShoot() {
  const c = ensureAudio();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  const f = c.createBiquadFilter();
  o.type = "square";
  o.frequency.setValueAtTime(880, t);
  o.frequency.exponentialRampToValueAtTime(2200, t + 0.02);
  o.frequency.exponentialRampToValueAtTime(400, t + 0.06);
  f.type = "highpass";
  f.frequency.value = 200;
  g.gain.setValueAtTime(0.06, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  o.connect(f);
  f.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + 0.08);
}

function sfxDespawn() {
  const c = ensureAudio();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(420, t);
  o.frequency.exponentialRampToValueAtTime(120, t + 0.1);
  g.gain.setValueAtTime(0.05, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + 0.12);
}

function sfxThrust() {
  const c = ensureAudio();
  if (!c) return;
  const t = c.currentTime;
  const dur = 0.05;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(55 + Math.random() * 25, t);
  g.gain.setValueAtTime(0.028, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.01);
}

function sfxHit() {
  const c = ensureAudio();
  if (!c) return;
  const t = c.currentTime;
  for (let i = 0; i < 3; i++) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(180 - i * 40, t);
    g.gain.setValueAtTime(0.05 - i * 0.012, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2 + i * 0.04);
    o.connect(g);
    g.connect(c.destination);
    o.start(t + i * 0.02);
    o.stop(t + 0.35);
  }
}

/** Wenn eine Kugel aus dem State fällt: Funken + Ringe + Sound */
function spawnBulletVanishFX(x, y, vx, vy, col) {
  const spd = Math.hypot(vx, vy) || 1;
  const bx = -vx / spd;
  const by = -vy / spd;
  const n = 22 + ((Math.random() * 14) | 0);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 80 + Math.random() * 320;
    const bias = 0.55;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * sp * 0.55 + bx * sp * bias,
      vy: Math.sin(a) * sp * 0.55 + by * sp * bias,
      life: 0.15 + Math.random() * 0.45,
      col: Math.random() > 0.35 ? col : i % 3 === 0 ? "#fff7c2" : "#ffffff",
      sz: 0.8 + Math.random() * 2.8,
    });
  }
  for (let k = 0; k < 2; k++) {
    shockRings.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      r: 6 + k * 4,
      life: 0.28 + k * 0.08,
      maxLife: 0.28 + k * 0.08,
      col,
    });
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * 420,
      vy: Math.sin(a) * 420,
      life: 0.08 + Math.random() * 0.06,
      col: "rgba(255,255,255,0.95)",
      sz: 3.5,
    });
  }
  if (shockRings.length > 80) shockRings.splice(0, shockRings.length - 80);
  if (particles.length > 650) particles.splice(0, particles.length - 650);
  const tms = performance.now();
  if (tms - lastDespawnSfxMs > 32) {
    lastDespawnSfxMs = tms;
    sfxDespawn();
  }
}

function reconcileBullets(curr) {
  const list = curr || [];
  if (!prevBullets.length) {
    prevBullets = list.map((b) => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, o: b.o }));
    return;
  }
  const used = new Set();
  const maxD = 110;
  for (const pb of prevBullets) {
    let best = -1;
    let bestD = maxD;
    for (let i = 0; i < list.length; i++) {
      if (used.has(i)) continue;
      if (list[i].o !== pb.o) continue;
      const d = Math.hypot(list[i].x - pb.x, list[i].y - pb.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best < 0) {
      const col = COLORS[pb.o % COLORS.length] || "#fff";
      spawnBulletVanishFX(pb.x, pb.y, pb.vx, pb.vy, col);
    } else {
      used.add(best);
    }
  }
  prevBullets = list.map((b) => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, o: b.o }));
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

  const margin = 80;
  for (const st of starField) {
    if (st.x < camX - margin || st.x > camX + VW + margin || st.y < camY - margin || st.y > camY + VH + margin) continue;
    const tw = st.tw * st.z;
    const flick = 0.65 + 0.35 * Math.sin(t * (1.2 + st.z * 2) + st.x * 0.01);
    ctx.fillStyle = `rgba(255,255,255,${0.15 * st.z * flick})`;
    ctx.fillRect(st.x, st.y, tw, tw);
  }

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

  for (const tr of engineTrail) {
    const a = Math.max(0, tr.life / 0.35);
    ctx.globalAlpha = a * 0.55;
    const g = ctx.createRadialGradient(tr.x, tr.y, 0, tr.x, tr.y, 14);
    g.addColorStop(0, "rgba(120,220,255,0.55)");
    g.addColorStop(0.4, "rgba(93,255,180,0.25)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(tr.x, tr.y, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const b of lastState.b || []) {
    const col = COLORS[b.o % COLORS.length] || "#fff";
    const spd = Math.hypot(b.vx, b.vy) || 1;
    const nx = b.vx / spd;
    const ny = b.vy / spd;
    const len = 26;
    for (let layer = 0; layer < 3; layer++) {
      const lag = layer * 5;
      const x1 = b.x - nx * (len * 0.42 + lag);
      const y1 = b.y - ny * (len * 0.42 + lag);
      const x2 = b.x + nx * (len * 0.62 - lag * 0.15);
      const y2 = b.y + ny * (len * 0.62 - lag * 0.15);
      const lg = ctx.createLinearGradient(x1, y1, x2, y2);
      lg.addColorStop(0, `rgba(255,255,255,${0.06 + 0.04 * (2 - layer)})`);
      lg.addColorStop(0.35, col);
      lg.addColorStop(0.72, "#fff7c2");
      lg.addColorStop(1, "rgba(255,200,80,0)");
      ctx.strokeStyle = lg;
      ctx.lineWidth = 4.2 - layer * 0.9;
      ctx.lineCap = "round";
      ctx.globalAlpha = 0.35 + (0.32 * (2 - layer)) / 2;
      ctx.shadowColor = col;
      ctx.shadowBlur = layer === 0 ? 16 : 7;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }

  for (const m of muzzleFlashes) {
    const a = Math.max(0, m.life / m.maxLife);
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.a);
    ctx.globalAlpha = 0.55 + 0.45 * a;
    const gr = ctx.createRadialGradient(8, 0, 0, 22, 0, 36);
    gr.addColorStop(0, "rgba(255,255,255,0.95)");
    gr.addColorStop(0.25, "#fff7c2");
    gr.addColorStop(0.55, "rgba(255,160,60,0.75)");
    gr.addColorStop(1, "rgba(255,80,20,0)");
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(32, -10);
    ctx.lineTo(38, 0);
    ctx.lineTo(32, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
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
    const maxL = 0.45;
    const a = Math.max(0, Math.min(1, p.life / maxL));
    ctx.globalAlpha = a;
    ctx.fillStyle = p.col;
    const rad = (p.sz != null ? p.sz : 2) + 2.2 * a;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const r of shockRings) {
    const a = Math.max(0, r.life / r.maxLife);
    ctx.strokeStyle = r.col;
    ctx.globalAlpha = a * 0.85;
    ctx.lineWidth = 2.5 + (1 - a) * 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
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
      spawnBurst(me.x, me.y, "#ff6b6b", 22);
      sfxHit();
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

  if (wasMatchLive && !lastState.live) {
    prevBullets = [];
    shockRings.length = 0;
    muzzleFlashes.length = 0;
    engineTrail.length = 0;
  }
  wasMatchLive = !!lastState.live;
  if (!lastState.live) prevBullets = [];

  initStarField();

  if (lastState.live) {
    reconcileBullets(lastState.b || []);
    const myB = (lastState.b || []).filter((b) => b.o === mySlot).length;
    if (me && myB > myPrevBulletCount) {
      const nowMs = performance.now();
      if (nowMs - lastShootSfxMs > 42) {
        lastShootSfxMs = nowMs;
        sfxShoot();
        const cs = Math.cos(me.a);
        const sn = Math.sin(me.a);
        if (muzzleFlashes.length < 10) {
          muzzleFlashes.push({
            x: me.x + cs * 26,
            y: me.y + sn * 26,
            a: me.a,
            life: 0.1,
            maxLife: 0.1,
          });
        }
      }
    }
    myPrevBulletCount = myB;

    const thrust = keys.has("KeyW") || keys.has("ArrowUp");
    if (me && thrust) {
      const tms = performance.now();
      if (tms - lastThrustSfxMs > 95) {
        lastThrustSfxMs = tms;
        sfxThrust();
      }
      if (Math.random() < dt / 90) {
        engineTrail.push({
          x: me.x - Math.cos(me.a) * 18 + (Math.random() - 0.5) * 6,
          y: me.y - Math.sin(me.a) * 18 + (Math.random() - 0.5) * 6,
          life: 0.28 + Math.random() * 0.12,
        });
      }
    }
  } else {
    myPrevBulletCount = (lastState.b || []).filter((b) => b.o === mySlot).length;
  }

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
      starField = [];
      initStarField();
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
