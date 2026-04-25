import http from "http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 3000);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const nowMs = () => Date.now();

function randRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += chars[(Math.random() * chars.length) | 0];
  return out;
}

function makeRoomState() {
  const W = 720;
  const H = 420;
  const P = { w: 14, h: 92, sp: 540 };
  const left = { x: 26, y: H / 2 - P.h / 2, ...P, up: false, down: false };
  const right = { x: W - 26 - P.w, y: H / 2 - P.h / 2, ...P, up: false, down: false };
  const ball0 = { r: 10, spin: 0 };
  const ball = { x: W / 2, y: H / 2, vx: 420, vy: 180, spin: 0, ...ball0 };
  return {
    W, H,
    running: false,
    overSent: false,
    sL: 0,
    sR: 0,
    left,
    right,
    ball,
    lastTick: nowMs(),
  };
}

function resetRound(st, dir = 1) {
  st.ball = {
    x: st.W / 2,
    y: st.H / 2,
    vx: 420 * dir,
    vy: (Math.random() * 2 - 1) * 220,
    spin: 0,
    r: 10,
  };
  st.left.y = st.H / 2 - st.left.h / 2;
  st.right.y = st.H / 2 - st.right.h / 2;
}

function tickRoom(st, dtMs) {
  const dt = Math.min(40, Math.max(1, dtMs));
  const sec = dt / 1000;

  const moveP = (p) => {
    if (p.up) p.y -= p.sp * sec;
    if (p.down) p.y += p.sp * sec;
    p.y = clamp(p.y, 10, st.H - p.h - 10);
  };
  moveP(st.left);
  moveP(st.right);

  if (!st.running) return;

  const b = st.ball;
  b.x += b.vx * sec;
  b.y += b.vy * sec;
  b.vy += b.spin * sec;
  b.spin *= Math.pow(0.88, dt / 16);

  // walls
  if (b.y - b.r < 10) { b.y = 10 + b.r; b.vy *= -1; }
  if (b.y + b.r > st.H - 10) { b.y = st.H - 10 - b.r; b.vy *= -1; }

  const collide = (p) => {
    const nx = clamp(b.x, p.x, p.x + p.w);
    const ny = clamp(b.y, p.y, p.y + p.h);
    const dx = b.x - nx, dy = b.y - ny;
    return dx * dx + dy * dy <= b.r * b.r;
  };

  // paddles
  if (b.vx < 0 && collide(st.left)) {
    b.x = st.left.x + st.left.w + b.r;
    const off = (b.y - (st.left.y + st.left.h / 2)) / (st.left.h / 2);
    b.vx = Math.abs(b.vx) * 1.04;
    b.vy += off * 240;
    b.spin = clamp(b.spin + off * 220, -520, 520);
  }
  if (b.vx > 0 && collide(st.right)) {
    b.x = st.right.x - b.r;
    const off = (b.y - (st.right.y + st.right.h / 2)) / (st.right.h / 2);
    b.vx = -Math.abs(b.vx) * 1.04;
    b.vy += off * 240;
    b.spin = clamp(b.spin + off * 220, -520, 520);
  }

  // cap
  const sp = Math.hypot(b.vx, b.vy) || 1;
  const cap = 1020;
  if (sp > cap) { b.vx = (b.vx / sp) * cap; b.vy = (b.vy / sp) * cap; }

  // score
  if (b.x < -50) { st.sR++; resetRound(st, 1); }
  if (b.x > st.W + 50) { st.sL++; resetRound(st, -1); }

  if (st.sL >= 7 || st.sR >= 7) {
    st.running = false;
  }
}

/** rooms: code -> { code, createdAt, clients: Map(ws,{side}), state } */
const rooms = new Map();

function getOrCreateRoom(code) {
  const c = (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const key = c || randRoomCode();
  let r = rooms.get(key);
  if (!r) {
    r = { code: key, createdAt: nowMs(), clients: new Map(), state: makeRoomState() };
    rooms.set(key, r);
  }
  return r;
}

function roomSides(room) {
  const used = new Set();
  for (const v of room.clients.values()) used.add(v.side);
  return used;
}

function pickSide(room) {
  const used = roomSides(room);
  if (!used.has("L")) return "L";
  if (!used.has("R")) return "R";
  return null;
}

function broadcast(room, obj) {
  const msg = JSON.stringify(obj);
  for (const ws of room.clients.keys()) {
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}

function send(ws, obj) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end("pong-online ws server\n");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws._room = null;

  send(ws, { t: "hello", v: 1 });

  ws.on("message", (buf) => {
    let msg;
    try { msg = JSON.parse(String(buf)); } catch { return; }
    if (!msg || typeof msg !== "object") return;

    if (msg.t === "join") {
      const room = getOrCreateRoom(msg.code || "");
      const side = pickSide(room);
      if (!side) {
        send(ws, { t: "err", m: "Room voll (max 2)." });
        return;
      }
      // leave previous
      if (ws._room && ws._room !== room) {
        try { ws._room.clients.delete(ws); } catch {}
      }
      ws._room = room;
      room.clients.set(ws, { side });
      send(ws, { t: "joined", code: room.code, side, W: room.state.W, H: room.state.H });
      broadcast(room, { t: "peers", n: room.clients.size });
      // send snapshot immediately
      send(ws, { t: "state", s: serializeState(room.state) });
      return;
    }

    const room = ws._room;
    if (!room) return;
    const meta = room.clients.get(ws);
    if (!meta) return;

    if (msg.t === "in") {
      const up = !!msg.up;
      const down = !!msg.down;
      if (meta.side === "L") { room.state.left.up = up; room.state.left.down = down; }
      if (meta.side === "R") { room.state.right.up = up; room.state.right.down = down; }
      return;
    }

    if (msg.t === "start") {
      room.state.running = true;
      room.state.overSent = false;
      room.state.lastTick = nowMs();
      broadcast(room, { t: "run", v: true });
      return;
    }

    if (msg.t === "reset") {
      room.state = makeRoomState();
      broadcast(room, { t: "reset" });
      broadcast(room, { t: "state", s: serializeState(room.state) });
      return;
    }
  });

  ws.on("close", () => {
    const room = ws._room;
    if (!room) return;
    room.clients.delete(ws);
    broadcast(room, { t: "peers", n: room.clients.size });
    // cleanup empty rooms after some time
  });
});

function serializeState(st) {
  return {
    running: st.running,
    sL: st.sL,
    sR: st.sR,
    L: { y: st.left.y },
    R: { y: st.right.y },
    B: { x: st.ball.x, y: st.ball.y, vx: st.ball.vx, vy: st.ball.vy, spin: st.ball.spin, r: st.ball.r },
  };
}

// main tick loop (server authoritative)
setInterval(() => {
  const t = nowMs();
  for (const room of rooms.values()) {
    const st = room.state;
    const dt = t - st.lastTick;
    st.lastTick = t;
    tickRoom(st, dt);
    // broadcast at ~30Hz (every other tick)
    if ((t / 33) | 0) {
      broadcast(room, { t: "state", s: serializeState(st) });
      if (!st.overSent && !st.running && (st.sL >= 7 || st.sR >= 7)) {
        st.overSent = true;
        broadcast(room, { t: "over", w: st.sL > st.sR ? "L" : "R" });
      }
    }
  }
}, 16);

server.listen(PORT, () => {
  console.log(`pong-online listening on :${PORT}`);
});

