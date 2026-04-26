/** Top-Down-Panzer: Server-Autorität, Kachelkarte, abprallende Kugeln, bis 4 Spieler. */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function makeTanksWallStr() {
  const C = 32;
  const R = 26;
  const a = Array.from({ length: R }, () => Array(C).fill(0));
  for (let x = 0; x < C; x++) {
    a[0][x] = 1;
    a[R - 1][x] = 1;
  }
  for (let y = 0; y < R; y++) {
    a[y][0] = 1;
    a[y][C - 1] = 1;
  }
  // Halb-Labyrinth: Blöcke + Lücken, mittlerer Ost-West-Korridor
  const mid = Math.floor(R / 2);
  for (let x = 2; x < C - 2; x++) a[mid][x] = 0;

  for (let y = 3; y < R - 3; y += 2) {
    for (let x = 3; x < C - 3; x += 3) {
      if (((x + y) >> 2) % 3 === 0) continue;
      a[y][x] = 1;
      if (y % 4 === 1 && x + 1 < C - 1) a[y][x + 1] = 1;
    }
  }
  for (let y = 4; y < R - 4; y += 5) {
    for (let x = 5; x < C - 5; x += 6) {
      a[y][x] = 0;
      a[y][x + 1] = 0;
      a[y + 1][x] = 0;
    }
  }
  const clear2 = (tx, ty) => {
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        const xx = tx + dx;
        const yy = ty + dy;
        if (xx > 0 && xx < C - 1 && yy > 0 && yy < R - 1) a[yy][xx] = 0;
      }
    }
  };
  clear2(1, 1);
  clear2(C - 4, 1);
  clear2(1, R - 4);
  clear2(C - 4, R - 4);

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
  for (let iter = 0; iter < 6; iter++) {
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
  const corners = [
    [2, 2],
    [st.COLS - 4, 2],
    [2, st.ROWS - 4],
    [st.COLS - 4, st.ROWS - 4],
  ];
  let [tx, ty] = corners[slot] || [4, 4];
  for (let d = 0; d < 80; d++) {
    let ok = true;
    for (let dy = 0; dy < 2 && ok; dy++) {
      for (let dx = 0; dx < 2 && ok; dx++) {
        if (wallAt(st, tx + dx, ty + dy)) ok = false;
      }
    }
    if (ok) break;
    tx = 2 + ((d * 11) % (st.COLS - 6));
    ty = 2 + ((d * 5) % (st.ROWS - 6));
  }
  const cx = (tx + 1) * st.TW;
  const cy = (ty + 1) * st.TW;
  const ang = Math.atan2(st.H / 2 - cy, st.W / 2 - cx);
  return {
    x: cx,
    y: cy,
    a: ang,
    hp: 3,
    kills: 0,
    cd: 0,
    shield: 0,
    speedT: 0,
    rapidT: 0,
    invuln: 2000,
    wantFire: false,
    in: { u: false, d: false, l: false, r: false },
  };
}

export function makeTanksState() {
  const TW = 24;
  const COLS = 32;
  const ROWS = 26;
  const wallStr = makeTanksWallStr();
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
    /** Bis alle Ready: kein Tick, keine Inputs */
    matchLive: false,
  };
}

const TR = 13;
const BR = 4;
const BULLET_SPEED = 430;
const ROT_SPEED = 2.75;
const BASE_SPEED = 112;
const MAX_BOUNCES = 14;
const MAX_BULLETS = 32;
const BULLET_LIFE_MS = 5200;

function moveBulletReflect(b, dt, st) {
  const sec = dt / 1000;
  let { x, y, vx, vy } = b;

  const stepX = vx * sec;
  x += stepX;
  if (circleHitsWall(x, y, BR, st)) {
    x -= stepX;
    vx *= -1;
    b.bz = (b.bz || 0) + 1;
  }
  const stepY = vy * sec;
  y += stepY;
  if (circleHitsWall(x, y, BR, st)) {
    y -= stepY;
    vy *= -1;
    b.bz = (b.bz || 0) + 1;
  }
  b.x = x;
  b.y = y;
  b.vx = vx;
  b.vy = vy;
  b.age = (b.age || 0) + dt;
}

export function tickTanks(st, dtMs) {
  if (!st.matchLive) return;
  const dt = clamp(dtMs, 1, 55);
  const sec = dt / 1000;

  for (let si = 0; si < 4; si++) {
    const p = st.players[si];
    if (!p || p.hp <= 0) continue;
    if (p.invuln > 0) p.invuln -= dt;
    if (p.speedT > 0) p.speedT -= dt;
    if (p.rapidT > 0) p.rapidT -= dt;
    if (p.cd > 0) p.cd -= dt;

    const spMul = p.speedT > 0 ? 1.38 : 1;
    const rot = ((p.in.r ? 1 : 0) - (p.in.l ? 1 : 0)) * ROT_SPEED * sec;
    p.a += rot;

    const cs = Math.cos(p.a);
    const sn = Math.sin(p.a);
    let spd = BASE_SPEED * spMul;
    if (p.in.u) {
      p.x += cs * spd * sec;
      p.y += sn * spd * sec;
    }
    if (p.in.d) {
      p.x -= cs * spd * 0.52 * sec;
      p.y -= sn * spd * 0.52 * sec;
    }
    const r = resolveCircleWall(p.x, p.y, TR, st);
    p.x = r.x;
    p.y = r.y;
  }

  // Tank–Tank weich trennen
  for (let a = 0; a < 4; a++) {
    const pa = st.players[a];
    if (!pa || pa.hp <= 0) continue;
    for (let b = a + 1; b < 4; b++) {
      const pb = st.players[b];
      if (!pb || pb.hp <= 0) continue;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const d = Math.hypot(dx, dy) || 1;
      const minD = TR * 2 + 2;
      if (d < minD) {
        const push = (minD - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        pa.x -= nx * push;
        pa.y -= ny * push;
        pb.x += nx * push;
        pb.y += ny * push;
        const ra = resolveCircleWall(pa.x, pa.y, TR, st);
        const rb = resolveCircleWall(pb.x, pb.y, TR, st);
        pa.x = ra.x;
        pa.y = ra.y;
        pb.x = rb.x;
        pb.y = rb.y;
      }
    }
  }

  // Schüsse
  for (let i = st.bullets.length - 1; i >= 0; i--) {
    const b = st.bullets[i];
    moveBulletReflect(b, dt, st);
    if ((b.bz || 0) > MAX_BOUNCES || (b.age || 0) > BULLET_LIFE_MS) {
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
      if (d < TR + BR - 1) {
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
            p.a = sp.a;
            p.hp = 3;
            p.invuln = 2200;
            p.cd = 400;
          }
        }
        break;
      }
    }
    if (hit) st.bullets.splice(i, 1);
  }

  // Feuern
  for (let si = 0; si < 4; si++) {
    const p = st.players[si];
    if (!p || p.hp <= 0) continue;
    if (p.wantFire && p.cd <= 0 && st.bullets.length < MAX_BULLETS) {
      p.wantFire = false;
      const cdBase = p.rapidT > 0 ? 210 : 380;
      p.cd = cdBase;
      const cs = Math.cos(p.a);
      const sn = Math.sin(p.a);
      const muzzle = TR + BR + 4;
      st.bullets.push({
        x: p.x + cs * muzzle,
        y: p.y + sn * muzzle,
        vx: cs * BULLET_SPEED,
        vy: sn * BULLET_SPEED,
        own: si,
        bz: 0,
        age: 0,
      });
    }
  }

  // Powerups
  st.pupAcc += dt;
  if (st.powerups.length < 4 && st.pupAcc > 9000) {
    st.pupAcc = 0;
    for (let tryN = 0; tryN < 35; tryN++) {
      const tx = 2 + ((Math.random() * (st.COLS - 4)) | 0);
      const ty = 2 + ((Math.random() * (st.ROWS - 4)) | 0);
      if (wallAt(st, tx, ty)) continue;
      const px = (tx + 0.5) * st.TW;
      const py = (ty + 0.5) * st.TW;
      let free = true;
      for (const p of st.players) {
        if (!p || p.hp <= 0) continue;
        if (Math.hypot(p.x - px, p.y - py) < TR + 18) free = false;
      }
      for (const u of st.powerups) {
        if (Math.hypot(u.x - px, u.y - py) < 40) free = false;
      }
      if (!free) continue;
      const types = ["R", "S", "H", "P"];
      st.powerups.push({ x: px, y: py, t: types[(Math.random() * types.length) | 0] });
      break;
    }
  }

  for (let pi = st.powerups.length - 1; pi >= 0; pi--) {
    const u = st.powerups[pi];
    for (let si = 0; si < 4; si++) {
      const p = st.players[si];
      if (!p || p.hp <= 0) continue;
      if (Math.hypot(p.x - u.x, p.y - u.y) < TR + 14) {
        if (u.t === "H") p.hp = Math.min(5, p.hp + 2);
        if (u.t === "R") p.rapidT = 10000;
        if (u.t === "S") p.speedT = 9000;
        if (u.t === "P") p.shield = Math.min(2, p.shield + 1);
        st.powerups.splice(pi, 1);
        break;
      }
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
  const u = st.powerups.map((z) => ({
    x: Math.round(z.x * 10) / 10,
    y: Math.round(z.y * 10) / 10,
    t: z.t,
  }));
  return { p, b, u, live: !!st.matchLive };
}

export function tanksApplyInput(st, slot, msg) {
  if (!st.matchLive) return;
  const p = st.players[slot];
  if (!p || p.hp <= 0) return;
  p.in.u = !!msg.u;
  p.in.d = !!msg.d;
  p.in.l = !!msg.l;
  p.in.r = !!msg.r;
}

export function tanksSetFire(st, slot) {
  if (!st.matchLive) return;
  const p = st.players[slot];
  if (!p || p.hp <= 0) return;
  p.wantFire = true;
}
