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

function makePongState() {
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

function makeRpsState() {
  return {
    overSent: false,
    round: 1,
    picks: { A: null, B: null },
    sA: 0,
    sB: 0,
    lastResult: null, // {A,B,w}
  };
}

function makeTttState() {
  return {
    overSent: false,
    b: Array(9).fill(""),
    turn: "X", // X or O
    over: false,
    winLine: [],
    sX: 0,
    sO: 0,
  };
}

function makeState(game) {
  if (game === "rps") return makeRpsState();
  if (game === "ttt") return makeTttState();
  return makePongState();
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

/** rooms: key -> { game, code, createdAt, clients: Map(ws,{side}), state } */
const rooms = new Map();

function normalizeGame(g) {
  const gg = String(g || "").toLowerCase();
  if (gg === "rps") return "rps";
  if (gg === "ttt") return "ttt";
  return "pong";
}

function roomKey(game, code) {
  return `${game}:${code}`;
}

function getOrCreateRoom(game, code) {
  const g = normalizeGame(game);
  const c = (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  const key = c || randRoomCode();
  const k = roomKey(g, key);
  let r = rooms.get(k);
  if (!r) {
    r = { game: g, code: key, createdAt: nowMs(), clients: new Map(), state: makeState(g) };
    rooms.set(k, r);
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
  if (room.game === "pong") {
    if (!used.has("L")) return "L";
    if (!used.has("R")) return "R";
    return null;
  }
  if (room.game === "rps") {
    if (!used.has("A")) return "A";
    if (!used.has("B")) return "B";
    return null;
  }
  // ttt
  if (!used.has("X")) return "X";
  if (!used.has("O")) return "O";
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
      const room = getOrCreateRoom(msg.game || "pong", msg.code || "");
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
      const extra = room.game === "pong" ? { W: room.state.W, H: room.state.H } : {};
      send(ws, { t: "joined", game: room.game, code: room.code, side, ...extra });
      broadcast(room, { t: "peers", n: room.clients.size });
      // send snapshot immediately
      send(ws, { t: "state", game: room.game, s: serializeState(room.game, room.state) });
      return;
    }

    const room = ws._room;
    if (!room) return;
    const meta = room.clients.get(ws);
    if (!meta) return;

    if (room.game === "pong" && msg.t === "in") {
      const up = !!msg.up;
      const down = !!msg.down;
      if (meta.side === "L") { room.state.left.up = up; room.state.left.down = down; }
      if (meta.side === "R") { room.state.right.up = up; room.state.right.down = down; }
      return;
    }

    if (room.game === "pong" && msg.t === "start") {
      room.state.running = true;
      room.state.overSent = false;
      room.state.lastTick = nowMs();
      broadcast(room, { t: "run", v: true });
      return;
    }

    if (msg.t === "reset") {
      room.state = makeState(room.game);
      broadcast(room, { t: "reset" });
      broadcast(room, { t: "state", game: room.game, s: serializeState(room.game, room.state) });
      return;
    }

    if (room.game === "rps" && msg.t === "pick") {
      const m = String(msg.m || "").toLowerCase();
      if (!["r", "p", "s"].includes(m)) return;
      const st = room.state;
      if (meta.side !== "A" && meta.side !== "B") return;
      st.picks[meta.side] = m;
      broadcast(room, { t: "state", game: "rps", s: serializeState("rps", st) });
      if (st.picks.A && st.picks.B) {
        const w = rpsWinner(st.picks.A, st.picks.B);
        st.lastResult = { A: st.picks.A, B: st.picks.B, w };
        if (w === "A") st.sA++;
        else if (w === "B") st.sB++;
        st.round++;
        st.picks.A = null;
        st.picks.B = null;
        broadcast(room, { t: "rps_result", r: st.lastResult, sA: st.sA, sB: st.sB, round: st.round });
        broadcast(room, { t: "state", game: "rps", s: serializeState("rps", st) });
      }
      return;
    }

    if (room.game === "ttt" && msg.t === "move") {
      const st = room.state;
      if (st.over) return;
      const idx = Number(msg.i);
      if (!Number.isFinite(idx) || idx < 0 || idx > 8) return;
      if (st.b[idx]) return;
      const side = meta.side; // "X" or "O"
      if (side !== st.turn) return;

      st.b[idx] = side;
      const res = tttWinner(st.b);
      if (res.w) {
        st.over = true;
        st.winLine = res.line || [];
        if (res.w === "X") st.sX++;
        else if (res.w === "O") st.sO++;
        broadcast(room, { t: "over", game: "ttt", w: res.w, line: st.winLine, sX: st.sX, sO: st.sO });
      } else {
        st.turn = (st.turn === "X") ? "O" : "X";
      }
      broadcast(room, { t: "state", game: "ttt", s: serializeState("ttt", st) });
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

function serializeState(game, st) {
  if (game === "rps") {
    return {
      round: st.round,
      picks: { A: !!st.picks.A, B: !!st.picks.B }, // don't leak actual pick
      sA: st.sA,
      sB: st.sB,
    };
  }
  if (game === "ttt") {
    return {
      b: st.b,
      turn: st.turn,
      over: st.over,
      line: st.winLine || [],
      sX: st.sX,
      sO: st.sO,
    };
  }
  return {
    running: st.running,
    sL: st.sL,
    sR: st.sR,
    L: { y: st.left.y },
    R: { y: st.right.y },
    B: { x: st.ball.x, y: st.ball.y, vx: st.ball.vx, vy: st.ball.vy, spin: st.ball.spin, r: st.ball.r },
  };
}

function rpsWinner(a, b) {
  if (a === b) return "D";
  if (a === "r" && b === "s") return "A";
  if (a === "p" && b === "r") return "A";
  if (a === "s" && b === "p") return "A";
  return "B";
}

const TTT_WINS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];
function tttWinner(b) {
  for (const line of TTT_WINS) {
    const [i,j,k] = line;
    if (b[i] && b[i] === b[j] && b[i] === b[k]) return { w: b[i], line };
  }
  if (b.every(Boolean)) return { w: "D", line: [] };
  return { w: null, line: [] };
}

// main tick loop (server authoritative)
setInterval(() => {
  const t = nowMs();
  for (const room of rooms.values()) {
    const st = room.state;
    if (room.game === "pong") {
      const dt = t - st.lastTick;
      st.lastTick = t;
      tickRoom(st, dt);
      // broadcast at ~30Hz
      if ((t / 33) | 0) {
        broadcast(room, { t: "state", game: "pong", s: serializeState("pong", st) });
        if (!st.overSent && !st.running && (st.sL >= 7 || st.sR >= 7)) {
          st.overSent = true;
          broadcast(room, { t: "over", game: "pong", w: st.sL > st.sR ? "L" : "R" });
        }
      }
    }
  }
}, 16);

server.listen(PORT, () => {
  console.log(`pong-online listening on :${PORT}`);
});

