/**
 * Multiplayer Jetkampf (game id weiterhin "tanks"):
 * Große offene Arena (nur Rand-Wände), Jet mit Schub/Drehung, MG-Dauerfeuer, keine Powerups.
 */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Nur Außenwand — kein Labyrinth */
export function makeTanksWallStr(cols, rows) {
  const a = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let x = 0; x < cols; x++) {
    a[0][x] = 1;
    a[rows - 1][x] = 1;
  }
  for (let y = 0; y < rows; y++) {
    a[y][0] = 1;
    a[y][cols - 1] = 1;
  }
  return a.map((row) => row.map((c) => (c ? "1" : "0")).join("")).join("");
}

function wallAt(st, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= st.COLS || ty >= st.ROWS) return true;
  return st.wallStr.charAt(ty * st.COLS + tx) === "1";
}

function circleHitsWall(cx, cy, r, st) {
  const tw = st.TW;
  const txi = Math.floor(cx / tw);
  const tyi = Math.floor(cy / tw);
  for (let ty = Math.max(0, tyi - 1); ty <= Math.min(st.ROWS - 1, tyi + 1); ty++) {
    for (let tx = Math.max(0, txi - 1); tx <= Math.min(st.COLS - 1, txi + 1); tx++) {
      if (!wallAt(st, tx, ty)) continue;
      const wx = tx * tw;
      const wy = ty * tw;
      const px = clamp(cx, wx, wx + tw);
      const py = clamp(cy, wy, wy + tw);
      const dx = cx - px;
      const dy = cy - py;
      if (dx * dx + dy * dy < r * r) return true;
    }
  }
  return false;
}

function resolveCircleWall(x, y, r, st) {
  let cx = x;
  let cy = y;
  const tw = st.TW;
  for (let iter = 0; iter < 8; iter++) {
    const txi = Math.floor(cx / tw);
    const tyi = Math.floor(cy / tw);
    let hit = false;
    for (let ty = Math.max(0, tyi - 1); ty <= Math.min(st.ROWS - 1, tyi + 1); ty++) {
      for (let tx = Math.max(0, txi - 1); tx <= Math.min(st.COLS - 1, txi + 1); tx++) {
        if (!wallAt(st, tx, ty)) continue;
        const wx = tx * tw;
        const wy = ty * tw;
        const px = clamp(cx, wx, wx + tw);
        const py = clamp(cy, wy, wy + tw);
        const dx = cx - px;
        const dy = cy - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < r * r - 1e-6) {
          hit = true;
          const d = Math.sqrt(Math.max(d2, 1e-8));
          cx = px + (dx / d) * r;
          cy = py + (dy / d) * r;
        }
      }
    }
    if (!hit) break;
  }
  return { x: cx, y: cy };
}

export function spawnTank(st, slot) {
  const margin = 6;
  const corners = [
    [margin, margin],
    [st.COLS - margin - 2, margin],
    [margin, st.ROWS - margin - 2],
    [st.COLS - margin - 2, st.ROWS - margin - 2],
  ];
  let [tx, ty] = corners[slot] || [margin, margin];
  const cx = (tx + 1) * st.TW;
  const cy = (ty + 1) * st.TW;
  const ang = Math.atan2(st.H / 2 - cy, st.W / 2 - cx);
  return {
    x: cx,
    y: cy,
    vx: 0,
    vy: 0,
    a: ang,
    hp: 4,
    kills: 0,
    cd: 0,
    shield: 0,
    invuln: 2000,
    fireHeld: false,
    in: { u: false, d: false, l: false, r: false },
  };
}

export function makeTanksState() {
  const TW = 40;
  const COLS = 120;
  const ROWS = 90;
  const wallStr = makeTanksWallStr(COLS, ROWS);
  return {
    TW,
    COLS,
    ROWS,
    W: COLS * TW,
    H: ROWS * TW,
    wallStr,
    players: [null, null, null, null],
    bullets: [],
    powerups: [],
    pupAcc: 0,
    lastTick: Date.now(),
    matchLive: false,
  };
}

const JR = 14;
const BR = 2.8;
const BULLET_SPEED = 820;
const ROT_SPEED = 3.1;
const BASE_ACCEL = 520;
const MAX_SPEED = 540;
const MAX_BULLETS = 220;
const BULLET_LIFE_MS = 520;
const MG_CD_MS = 52;

function moveBulletLinear(b, dt, st) {
  const sec = dt / 1000;
  b.x += b.vx * sec;
  b.y += b.vy * sec;
  b.age = (b.age || 0) + dt;
  if (b.age > BULLET_LIFE_MS) return false;
  if (circleHitsWall(b.x, b.y, BR, st)) return false;
  return true;
}

export function tickTanks(st, dtMs) {
  if (!st.matchLive) return;
  const dt = clamp(dtMs, 1, 55);
  const sec = dt / 1000;

  for (let si = 0; si < 4; si++) {
    const p = st.players[si];
    if (!p || p.hp <= 0) continue;
    if (p.invuln > 0) p.invuln -= dt;
    if (p.cd > 0) p.cd -= dt;

    const rot = ((p.in.r ? 1 : 0) - (p.in.l ? 1 : 0)) * ROT_SPEED * sec;
    p.a += rot;

    const cs = Math.cos(p.a);
    const sn = Math.sin(p.a);

    const thrust = BASE_ACCEL;
    if (p.in.u) {
      p.vx += cs * thrust * sec;
      p.vy += sn * thrust * sec;
    }
    if (p.in.d) {
      p.vx -= cs * thrust * 0.42 * sec;
      p.vy -= sn * thrust * 0.42 * sec;
    }

    const fr = p.in.u || p.in.d ? 0.9975 : 0.985;
    const fmul = Math.pow(fr, dt / 16);
    p.vx *= fmul;
    p.vy *= fmul;

    const spd = Math.hypot(p.vx, p.vy);
    if (spd > MAX_SPEED) {
      const k = MAX_SPEED / spd;
      p.vx *= k;
      p.vy *= k;
    }

    p.x += p.vx * sec;
    p.y += p.vy * sec;
    const r = resolveCircleWall(p.x, p.y, JR, st);
    p.x = r.x;
    p.y = r.y;
    if (circleHitsWall(p.x, p.y, JR - 0.5, st)) {
      p.vx *= 0.88;
      p.vy *= 0.88;
    }
  }

  for (let a = 0; a < 4; a++) {
    const pa = st.players[a];
    if (!pa || pa.hp <= 0) continue;
    for (let b = a + 1; b < 4; b++) {
      const pb = st.players[b];
      if (!pb || pb.hp <= 0) continue;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const d = Math.hypot(dx, dy) || 1;
      const minD = JR * 2 + 2;
      if (d < minD) {
        const push = (minD - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        pa.x -= nx * push;
        pa.y -= ny * push;
        pb.x += nx * push;
        pb.y += ny * push;
        const ra = resolveCircleWall(pa.x, pa.y, JR, st);
        const rb = resolveCircleWall(pb.x, pb.y, JR, st);
        pa.x = ra.x;
        pa.y = ra.y;
        pb.x = rb.x;
        pb.y = rb.y;
      }
    }
  }

  for (let i = st.bullets.length - 1; i >= 0; i--) {
    const b = st.bullets[i];
    if (!moveBulletLinear(b, dt, st)) {
      st.bullets.splice(i, 1);
      continue;
    }
    let hit = false;
    for (let si = 0; si < 4; si++) {
      const p = st.players[si];
      if (!p || p.hp <= 0) continue;
      if (si === b.own) continue;
      if (p.invuln > 0) continue;
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d < JR + BR) {
        hit = true;
        if (p.shield > 0) {
          p.shield -= 1;
        } else {
          p.hp -= 1;
          if (p.hp <= 0) {
            const killer = st.players[b.own];
            if (killer) killer.kills += 1;
            const sp = spawnTank(st, si);
            p.x = sp.x;
            p.y = sp.y;
            p.vx = sp.vx;
            p.vy = sp.vy;
            p.a = sp.a;
            p.hp = 4;
            p.invuln = 2200;
            p.cd = 350;
          }
        }
        break;
      }
    }
    if (hit) st.bullets.splice(i, 1);
  }

  for (let si = 0; si < 4; si++) {
    const p = st.players[si];
    if (!p || p.hp <= 0) continue;
    if (p.fireHeld && p.cd <= 0 && st.bullets.length < MAX_BULLETS) {
      p.cd = MG_CD_MS;
      const cs = Math.cos(p.a);
      const sn = Math.sin(p.a);
      const muzzle = JR + BR + 5;
      st.bullets.push({
        x: p.x + cs * muzzle,
        y: p.y + sn * muzzle,
        vx: cs * BULLET_SPEED,
        vy: sn * BULLET_SPEED,
        own: si,
        age: 0,
      });
    }
  }
}

export function serializeTanksState(st) {
  const p = [];
  for (let i = 0; i < 4; i++) {
    const pl = st.players[i];
    if (!pl) {
      p.push(null);
      continue;
    }
    p.push({
      x: Math.round(pl.x * 10) / 10,
      y: Math.round(pl.y * 10) / 10,
      a: Math.round(pl.a * 1000) / 1000,
      hp: pl.hp,
      k: pl.kills,
      sh: pl.shield,
      iv: pl.invuln > 0 ? 1 : 0,
    });
  }
  const b = st.bullets.map((z) => ({
    x: Math.round(z.x * 10) / 10,
    y: Math.round(z.y * 10) / 10,
    vx: Math.round(z.vx * 10) / 10,
    vy: Math.round(z.vy * 10) / 10,
    o: z.own,
  }));
  return { p, b, u: [], live: !!st.matchLive };
}

export function tanksApplyInput(st, slot, msg) {
  if (!st.matchLive) return;
  const p = st.players[slot];
  if (!p || p.hp <= 0) return;
  p.in.u = !!msg.u;
  p.in.d = !!msg.d;
  p.in.l = !!msg.l;
  p.in.r = !!msg.r;
  p.fireHeld = !!msg.f;
}

/** Legacy: Einzelfeuer — nicht mehr genutzt (MG über msg.f) */
export function tanksSetFire() {}
