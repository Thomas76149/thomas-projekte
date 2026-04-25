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

function makeUnoState() {
  return {
    started: false,
    hostId: null,
    players: [], // [{id,name}]
    hands: new Map(), // id -> [{id,col,v}]
    deck: [],
    discard: [],
    curCol: null, // active color for wild
    turnIdx: 0,
    dir: 1,
    drawStack: 0,
    mustSkip: false,
    canPass: false,
    msg: "Warte auf Start.",
    nextCardId: 1,
  };
}

function makeState(game) {
  if (game === "rps") return makeRpsState();
  if (game === "ttt") return makeTttState();
  if (game === "uno") return makeUnoState();
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
  if (gg === "uno") return "uno";
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

function randId() {
  return Math.random().toString(36).slice(2, 9) + Math.random().toString(36).slice(2, 6);
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
  ws._id = randId();

  send(ws, { t: "hello", v: 1 });

  ws.on("message", (buf) => {
    let msg;
    try { msg = JSON.parse(String(buf)); } catch { return; }
    if (!msg || typeof msg !== "object") return;

    if (msg.t === "join") {
      const room = getOrCreateRoom(msg.game || "pong", msg.code || "");
      let side = pickSide(room);
      if (room.game !== "uno" && !side) {
        send(ws, { t: "err", m: "Room voll (max 2)." });
        return;
      }
      // leave previous
      if (ws._room && ws._room !== room) {
        try { ws._room.clients.delete(ws); } catch {}
      }
      ws._room = room;
      if (room.game === "uno") {
        // UNO: many players
        const st = room.state;
        const name = String(msg.name || "Player").slice(0, 18);
        // capacity
        if (room.clients.size >= 8) {
          send(ws, { t: "err", m: "Room voll (max 8)." });
          return;
        }
        room.clients.set(ws, { side: ws._id });
        if (!st.players.some((p) => p.id === ws._id)) st.players.push({ id: ws._id, name });
        if (!st.hostId) st.hostId = ws._id;
        if (!st.hands.has(ws._id)) st.hands.set(ws._id, []);
        send(ws, { t: "joined", game: room.game, code: room.code, id: ws._id, host: st.hostId === ws._id });
        broadcastUno(room);
        return;
      } else {
        room.clients.set(ws, { side });
      }
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

    // UNO actions
    if (room.game === "uno" && msg.t === "uno_start") {
      const st = room.state;
      if (ws._id !== st.hostId) return;
      if (st.started) return;
      if (st.players.length < 2) {
        send(ws, { t: "uno_hint", m: "Mindestens 2 Spieler." });
        return;
      }
      unoStart(st);
      broadcastUno(room);
      return;
    }
    if (room.game === "uno" && msg.t === "uno_draw") {
      const st = room.state;
      if (!st.started) return;
      if (st.players[st.turnIdx]?.id !== ws._id) return;
      const drew = unoDraw(st, ws._id);
      st.msg = drew ? "Gezogen." : "Deck leer.";
      broadcastUno(room);
      return;
    }
    if (room.game === "uno" && msg.t === "uno_pass") {
      const st = room.state;
      if (!st.started) return;
      if (st.players[st.turnIdx]?.id !== ws._id) return;
      if (!st.canPass) return;
      st.canPass = false;
      unoNextTurn(st);
      st.msg = "Weiter.";
      broadcastUno(room);
      return;
    }
    if (room.game === "uno" && msg.t === "uno_play") {
      const st = room.state;
      if (!st.started) return;
      if (st.players[st.turnIdx]?.id !== ws._id) return;
      const id = Number(msg.id);
      const col = msg.col; // optional for wild
      const ok = unoPlay(st, ws._id, id, col);
      if (!ok) send(ws, { t: "uno_hint", m: "Nicht spielbar." });
      broadcastUno(room);
      return;
    }
  });

  ws.on("close", () => {
    const room = ws._room;
    if (!room) return;
    room.clients.delete(ws);
    if (room.game === "uno") {
      const st = room.state;
      st.players = st.players.filter((p) => p.id !== ws._id);
      st.hands.delete(ws._id);
      if (st.hostId === ws._id) st.hostId = st.players[0]?.id || null;
      if (st.started && st.players.length) {
        // if leaver was current, advance
        if (st.turnIdx >= st.players.length) st.turnIdx = 0;
      }
      broadcastUno(room);
      return;
    }
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
  if (game === "uno") {
    // public state only
    return {
      started: st.started,
      hostId: st.hostId,
      players: st.players.map((p) => ({ id: p.id, name: p.name, n: (st.hands.get(p.id)?.length || 0) })),
      turnId: st.players[st.turnIdx]?.id || null,
      turnName: st.players[st.turnIdx]?.name || null,
      dir: st.dir,
      deckN: st.deck.length,
      top: st.discard[st.discard.length - 1] || null,
      curCol: st.curCol,
      canStart: !st.started && st.players.length >= 2,
      canPass: st.canPass,
      msg: st.msg,
      drawStack: st.drawStack,
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

// --- UNO implementation (MVP) ---
function unoMakeDeck(st) {
  const colors = ["R", "G", "B", "Y"];
  const deck = [];
  const push = (col, v, n) => { for (let i = 0; i < n; i++) deck.push({ id: st.nextCardId++, col, v }); };
  for (const c of colors) {
    push(c, "0", 1);
    for (let n = 1; n <= 9; n++) push(c, String(n), 2);
    push(c, "S", 2); // skip
    push(c, "R", 2); // reverse
    push(c, "+2", 2);
  }
  push("W", "W", 4);
  push("W", "W4", 4);
  // shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
  }
  return deck;
}

function unoStart(st) {
  st.started = true;
  st.msg = "Game gestartet.";
  st.dir = 1;
  st.turnIdx = 0;
  st.drawStack = 0;
  st.canPass = false;
  st.deck = unoMakeDeck(st);
  st.discard = [];
  // deal 7
  for (const p of st.players) st.hands.set(p.id, []);
  for (let r = 0; r < 7; r++) {
    for (const p of st.players) {
      const card = st.deck.pop();
      if (card) st.hands.get(p.id).push(card);
    }
  }
  // flip first non-wild to start (simple)
  let top = st.deck.pop();
  while (top && top.col === "W") {
    st.deck.unshift(top);
    top = st.deck.pop();
  }
  if (top) st.discard.push(top);
  st.curCol = top ? top.col : "R";
}

function unoTop(st) {
  return st.discard[st.discard.length - 1] || null;
}

function unoIsPlayable(st, card) {
  const top = unoTop(st);
  if (!top) return true;
  const curCol = st.curCol || top.col;
  if (card.col === "W") return true;
  if (card.col === curCol) return true;
  if (card.v === top.v) return true;
  return false;
}

function unoNextTurn(st, steps = 1) {
  const n = st.players.length || 1;
  st.turnIdx = (st.turnIdx + steps * st.dir + n * 10) % n;
}

function unoEnsureDeck(st) {
  if (st.deck.length > 0) return true;
  // recycle discard except top
  const top = st.discard.pop();
  const pile = st.discard;
  st.discard = top ? [top] : [];
  // shuffle pile into deck
  for (let i = pile.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = pile[i]; pile[i] = pile[j]; pile[j] = t;
  }
  st.deck = pile;
  return st.deck.length > 0;
}

function unoDraw(st, pid) {
  if (!unoEnsureDeck(st)) return false;
  const n = Math.max(1, st.drawStack || 1);
  st.drawStack = 0;
  const h = st.hands.get(pid) || [];
  for (let i = 0; i < n; i++) {
    const c = st.deck.pop();
    if (c) h.push(c);
  }
  st.hands.set(pid, h);
  st.canPass = true;
  return true;
}

function unoPlay(st, pid, cardId, wildCol) {
  const h = st.hands.get(pid);
  if (!h) return false;
  const idx = h.findIndex((c) => c.id === cardId);
  if (idx < 0) return false;
  const card = h[idx];
  if (!unoIsPlayable(st, card)) return false;
  if (card.col === "W") {
    const col = ["R", "G", "B", "Y"].includes(wildCol) ? wildCol : null;
    if (!col) return false;
    st.curCol = col;
  } else {
    st.curCol = card.col;
  }
  h.splice(idx, 1);
  st.discard.push(card);
  st.hands.set(pid, h);
  st.canPass = false;

  // win
  if (h.length === 0) {
    st.msg = `${st.players.find(p=>p.id===pid)?.name||"Spieler"} hat gewonnen!`;
    st.started = false;
    return true;
  }

  // effects
  if (card.v === "S") {
    unoNextTurn(st, 2);
    st.msg = "Skip!";
    return true;
  }
  if (card.v === "R") {
    st.dir *= -1;
    // in 2 players reverse acts like skip
    if (st.players.length === 2) unoNextTurn(st, 2);
    else unoNextTurn(st, 1);
    st.msg = "Reverse!";
    return true;
  }
  if (card.v === "+2") {
    st.drawStack += 2;
    unoNextTurn(st, 1);
    st.msg = "+2!";
    return true;
  }
  if (card.col === "W" && card.v === "W4") {
    st.drawStack += 4;
    unoNextTurn(st, 1);
    st.msg = "Wild +4!";
    return true;
  }
  // normal
  unoNextTurn(st, 1);
  st.msg = "Weiter.";
  return true;
}

function broadcastUno(room) {
  const st = room.state;
  // public snapshot per-client with private hand
  for (const [ws] of room.clients) {
    const pid = ws._id;
    const h = st.hands.get(pid) || [];
    const pub = serializeState("uno", st);
    // mark playable
    const handOut = h.map((c) => ({ ...c, playable: (pub.turnId === pid) && st.started && unoIsPlayable(st, c) && (c.col !== "W" || true) }));
    send(ws, { t: "uno_state", s: pub, hand: handOut });
  }
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

