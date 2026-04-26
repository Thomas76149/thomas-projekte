import http from "http";
import { WebSocketServer } from "ws";
import * as tanks from "./tanks.js";
import * as trivia from "./trivia.js";

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
  const Pv = { w: 14, h: 92, sp: 540 };
  const Ph = { w: 92, h: 14, sp: 540 };
  const left = { x: 26, y: H / 2 - Pv.h / 2, ...Pv, up: false, down: false };
  const right = { x: W - 26 - Pv.w, y: H / 2 - Pv.h / 2, ...Pv, up: false, down: false };
  const top = { x: W / 2 - Ph.w / 2, y: 12, ...Ph, left: false, right: false };
  const bot = { x: W / 2 - Ph.w / 2, y: H - 12 - Ph.h, ...Ph, left: false, right: false };
  const ball0 = { r: 10, spin: 0 };
  const ball = { x: W / 2, y: H / 2, vx: 420, vy: 180, spin: 0, ...ball0 };
  return {
    W,
    H,
    mode: "2",
    running: false,
    overSent: false,
    sL: 0,
    sR: 0,
    sT: 0,
    sB: 0,
    left,
    right,
    top,
    bot,
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
    acceptPicks: false,
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
    allowMoves: false,
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
  if (game === "tanks") return tanks.makeTanksState();
  if (game === "trivia") return trivia.makeTriviaState();
  return makePongState();
}

function resetPongRound(st, dir = 1) {
  const W = st.W;
  const H = st.H;
  if (st.mode === "4") {
    const ang = Math.random() * Math.PI * 2;
    const spd = 440;
    st.ball = {
      x: W / 2,
      y: H / 2,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      spin: 0,
      r: 10,
    };
  } else {
    st.ball = {
      x: W / 2,
      y: H / 2,
      vx: 420 * dir,
      vy: (Math.random() * 2 - 1) * 220,
      spin: 0,
      r: 10,
    };
  }
  st.left.y = st.H / 2 - st.left.h / 2;
  st.right.y = st.H / 2 - st.right.h / 2;
  st.top.x = st.W / 2 - st.top.w / 2;
  st.bot.x = st.W / 2 - st.bot.w / 2;
}

function pongCollide(p, b) {
  const nx = clamp(b.x, p.x, p.x + p.w);
  const ny = clamp(b.y, p.y, p.y + p.h);
  const dx = b.x - nx;
  const dy = b.y - ny;
  return dx * dx + dy * dy <= b.r * b.r;
}

function tickRoom(st, dtMs) {
  const dt = Math.min(40, Math.max(1, dtMs));
  const sec = dt / 1000;

  const moveV = (p) => {
    if (p.up) p.y -= p.sp * sec;
    if (p.down) p.y += p.sp * sec;
    p.y = clamp(p.y, 10, st.H - p.h - 10);
  };
  const moveH = (p) => {
    if (p.left) p.x -= p.sp * sec;
    if (p.right) p.x += p.sp * sec;
    p.x = clamp(p.x, 10, st.W - p.w - 10);
  };
  moveV(st.left);
  moveV(st.right);
  moveH(st.top);
  moveH(st.bot);

  if (!st.running) return;

  const b = st.ball;
  b.x += b.vx * sec;
  b.y += b.vy * sec;
  b.vy += b.spin * sec;
  b.spin *= Math.pow(0.88, dt / 16);

  if (st.mode === "2") {
    if (b.y - b.r < 10) {
      b.y = 10 + b.r;
      b.vy *= -1;
    }
    if (b.y + b.r > st.H - 10) {
      b.y = st.H - 10 - b.r;
      b.vy *= -1;
    }
  }

  if (b.vx < 0 && pongCollide(st.left, b)) {
    b.x = st.left.x + st.left.w + b.r;
    const off = (b.y - (st.left.y + st.left.h / 2)) / (st.left.h / 2);
    b.vx = Math.abs(b.vx) * 1.04;
    b.vy += off * 240;
    b.spin = clamp(b.spin + off * 220, -520, 520);
  }
  if (b.vx > 0 && pongCollide(st.right, b)) {
    b.x = st.right.x - b.r;
    const off = (b.y - (st.right.y + st.right.h / 2)) / (st.right.h / 2);
    b.vx = -Math.abs(b.vx) * 1.04;
    b.vy += off * 240;
    b.spin = clamp(b.spin + off * 220, -520, 520);
  }

  if (st.mode === "4") {
    if (b.vy < 0 && pongCollide(st.top, b)) {
      b.y = st.top.y + st.top.h + b.r;
      b.vy = Math.abs(b.vy) * 1.04;
      const off = (b.x - (st.top.x + st.top.w / 2)) / (st.top.w / 2);
      b.vx += off * 240;
      b.spin = clamp(b.spin + off * 220, -520, 520);
    }
    if (b.vy > 0 && pongCollide(st.bot, b)) {
      b.y = st.bot.y - b.r;
      b.vy = -Math.abs(b.vy) * 1.04;
      const off = (b.x - (st.bot.x + st.bot.w / 2)) / (st.bot.w / 2);
      b.vx += off * 240;
      b.spin = clamp(b.spin + off * 220, -520, 520);
    }
  }

  const sp = Math.hypot(b.vx, b.vy) || 1;
  const cap = 1020;
  if (sp > cap) {
    b.vx = (b.vx / sp) * cap;
    b.vy = (b.vy / sp) * cap;
  }

  if (st.mode === "2") {
    if (b.x < -50) {
      st.sR++;
      resetPongRound(st, 1);
    }
    if (b.x > st.W + 50) {
      st.sL++;
      resetPongRound(st, -1);
    }
    if (st.sL >= 7 || st.sR >= 7) st.running = false;
  } else {
    if (b.x < -50) {
      st.sR++;
      resetPongRound(st);
    }
    if (b.x > st.W + 50) {
      st.sL++;
      resetPongRound(st);
    }
    if (b.y < -50) {
      st.sB++;
      resetPongRound(st);
    }
    if (b.y > st.H + 50) {
      st.sT++;
      resetPongRound(st);
    }
    if (st.sL >= 7 || st.sR >= 7 || st.sT >= 7 || st.sB >= 7) st.running = false;
  }
}

/** rooms: key -> { game, code, createdAt, clients: Map(ws,{side}), state } */
const rooms = new Map();

function normalizeGame(g) {
  const gg = String(g || "").toLowerCase();
  if (gg === "rps") return "rps";
  if (gg === "ttt") return "ttt";
  if (gg === "uno") return "uno";
  if (gg === "tanks") return "tanks";
  if (gg === "trivia") return "trivia";
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
    for (const s of ["L", "R", "T", "B"]) {
      if (!used.has(s)) return s;
    }
    return null;
  }
  if (room.game === "rps") {
    if (!used.has("A")) return "A";
    if (!used.has("B")) return "B";
    return null;
  }
  if (room.game === "ttt") {
    if (!used.has("X")) return "X";
    if (!used.has("O")) return "O";
    return null;
  }
  if (room.game === "tanks") {
    for (let i = 0; i < 4; i++) {
      if (!used.has(String(i))) return String(i);
    }
    return null;
  }
  if (room.game === "trivia") {
    for (let i = 0; i < trivia.MAX_PLAYERS; i++) {
      if (!used.has(String(i))) return String(i);
    }
    return null;
  }
  return null;
}

function randId() {
  return Math.random().toString(36).slice(2, 9) + Math.random().toString(36).slice(2, 6);
}

/** UNO: ob für diese seatId noch eine WebSocket verbunden ist */
function unoSeatOnline(room, seatId) {
  for (const [, meta] of room.clients) {
    if (meta && meta.side === seatId) return true;
  }
  return false;
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

function clearAllReady(room) {
  for (const meta of room.clients.values()) {
    if (meta) meta.ready = false;
  }
}

function buildLobbyPayload(room) {
  const roster = [];
  for (const [ws, meta] of room.clients) {
    if (ws.readyState !== ws.OPEN) continue;
    roster.push({
      side: meta.side,
      ready: !!meta.ready,
      name: meta.name || "",
    });
  }
  roster.sort((a, b) => String(a.side).localeCompare(String(b.side)));
  let allReady = roster.length > 0 && roster.every((r) => r.ready);
  if (room.game === "pong") allReady = allReady && (roster.length === 2 || roster.length === 4);
  if (room.game === "ttt" || room.game === "rps") allReady = allReady && roster.length === 2;
  if (room.game === "tanks") allReady = allReady && roster.length >= 2;
  if (room.game === "trivia") allReady = allReady && roster.length >= 2;
  return { t: "lobby", game: room.game, code: room.code, peers: roster.length, roster, allReady };
}

function broadcastLobby(room) {
  if (room.game === "uno") return;
  broadcast(room, buildLobbyPayload(room));
}

function syncRpsAcceptPicks(room) {
  const st = room.state;
  if (room.game !== "rps") return;
  let a = false;
  let b = false;
  for (const [, meta] of room.clients) {
    if (meta.side === "A") a = !!meta.ready;
    if (meta.side === "B") b = !!meta.ready;
  }
  st.acceptPicks = a && b;
}

function syncTttAllowMoves(room) {
  const st = room.state;
  if (room.game !== "ttt") return;
  let x = false;
  let o = false;
  for (const [, meta] of room.clients) {
    if (meta.side === "X") x = !!meta.ready;
    if (meta.side === "O") o = !!meta.ready;
  }
  st.allowMoves = x && o;
}

function tanksTryStartMatch(room) {
  if (room.game !== "tanks") return;
  const st = room.state;
  const metas = [...room.clients.values()];
  if (metas.length < 2 || !metas.every((m) => m.ready)) st.matchLive = false;
  else st.matchLive = true;
}

function broadcastTrivia(room) {
  if (room.game !== "trivia") return;
  for (const [ws, meta] of room.clients) {
    send(ws, {
      t: "state",
      game: "trivia",
      s: trivia.serializeTriviaStateForClient(room.state, room, String(meta.side)),
    });
  }
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
      if (room.game === "trivia" && room.state.phase !== "lobby") {
        send(ws, { t: "err", m: "Quiz läuft — bitte warten bis die Runde vorbei ist." });
        return;
      }
      let side = pickSide(room);
      if (room.game !== "uno" && !side) {
        let fullMsg = "Room voll (max 2).";
        if (room.game === "tanks" || room.game === "pong") fullMsg = "Room voll (max 4).";
        if (room.game === "trivia") fullMsg = `Room voll (max ${trivia.MAX_PLAYERS}).`;
        send(ws, { t: "err", m: fullMsg });
        return;
      }
      // leave previous
      if (ws._room && ws._room !== room) {
        try { ws._room.clients.delete(ws); } catch {}
      }
      ws._room = room;
      if (room.game === "uno") {
        const st = room.state;
        const name = String(msg.name || "Player").slice(0, 18);
        let pk = String(msg.pk || "").trim().slice(0, 40);
        if (!pk) pk = randId();

        const existing = st.players.find((p) => p.pk === pk);
        if (st.started && !existing) {
          send(ws, { t: "err", m: "Spiel läuft – kein neuer Beitritt. Gleiches Gerät/Tab: einfach wieder verbinden." });
          return;
        }
        if (!existing && room.clients.size >= 8) {
          send(ws, { t: "err", m: "Room voll (max 8)." });
          return;
        }

        let seatId;
        if (existing) {
          seatId = existing.id;
          existing.name = name;
          existing.offline = false;
        } else {
          seatId = randId();
          st.players.push({ id: seatId, name, pk, offline: false });
          st.hands.set(seatId, []);
        }
        if (!st.hostId) st.hostId = seatId;
        room.clients.set(ws, { side: seatId });
        send(ws, {
          t: "joined",
          game: room.game,
          code: room.code,
          id: seatId,
          pk,
          host: st.hostId === seatId,
        });
        broadcastUno(room);
        return;
      } else {
        const cname = String(msg.name || "").slice(0, 18);
        room.clients.set(ws, { side, ready: false, name: cname });
        if (room.game === "tanks") {
          const st = room.state;
          const slot = Number(side);
          if (slot >= 0 && slot <= 3 && !st.players[slot]) {
            st.players[slot] = tanks.spawnTank(st, slot);
          }
          st.matchLive = false;
          tanksTryStartMatch(room);
        }
        if (room.game === "trivia") {
          trivia.triviaTryStartMatch(room);
        }
      }
      const extra = {};
      if (room.game === "pong") {
        extra.W = room.state.W;
        extra.H = room.state.H;
      }
      if (room.game === "tanks") {
        const st = room.state;
        extra.W = st.W;
        extra.H = st.H;
        extra.tw = st.TW;
        extra.walls = st.wallStr;
      }
      send(ws, { t: "joined", game: room.game, code: room.code, side, ...extra });
      broadcast(room, { t: "peers", n: room.clients.size });
      broadcastLobby(room);
      if (room.game === "rps") syncRpsAcceptPicks(room);
      if (room.game === "ttt") syncTttAllowMoves(room);
      if (room.game === "tanks") tanksTryStartMatch(room);
      if (room.game === "trivia") {
        trivia.triviaTryStartMatch(room);
        broadcastTrivia(room);
      } else {
        broadcast(room, { t: "state", game: room.game, s: serializeState(room.game, room.state) });
      }
      return;
    }

    const room = ws._room;
    if (!room) return;
    const meta = room.clients.get(ws);
    if (!meta) return;

    if (msg.t === "ready") {
      meta.ready = !!msg.v;
      broadcastLobby(room);
      if (room.game === "rps") syncRpsAcceptPicks(room);
      if (room.game === "ttt") syncTttAllowMoves(room);
      tanksTryStartMatch(room);
      if (room.game === "trivia") {
        trivia.triviaTryStartMatch(room);
        broadcastTrivia(room);
      }
      if (room.game === "rps" || room.game === "ttt") {
        broadcast(room, { t: "state", game: room.game, s: serializeState(room.game, room.state) });
      }
      if (room.game === "tanks") {
        broadcast(room, { t: "state", game: "tanks", s: serializeState("tanks", room.state) });
      }
      return;
    }

    if (room.game === "pong" && msg.t === "in") {
      const st = room.state;
      if (!st.running) return;
      const up = !!msg.up;
      const down = !!msg.down;
      const left = !!msg.left;
      const right = !!msg.right;
      if (meta.side === "L") {
        st.left.up = up;
        st.left.down = down;
      }
      if (meta.side === "R") {
        st.right.up = up;
        st.right.down = down;
      }
      if (meta.side === "T") {
        st.top.left = left;
        st.top.right = right;
      }
      if (meta.side === "B") {
        st.bot.left = left;
        st.bot.right = right;
      }
      return;
    }

    if (room.game === "tanks" && msg.t === "in") {
      const slot = Number(meta.side);
      if (slot >= 0 && slot <= 3) tanks.tanksApplyInput(room.state, slot, msg);
      return;
    }
    if (room.game === "tanks" && msg.t === "fire") {
      const slot = Number(meta.side);
      if (slot >= 0 && slot <= 3) tanks.tanksSetFire(room.state, slot);
      return;
    }

    if (room.game === "pong" && msg.t === "start") {
      const st = room.state;
      const n = room.clients.size;
      if (n !== 2 && n !== 4) {
        send(ws, { t: "err", m: "Pong: genau 2 oder 4 Spieler nötig." });
        return;
      }
      if (![...room.clients.values()].every((m) => m.ready)) {
        send(ws, { t: "err", m: "Alle müssen Ready drücken." });
        return;
      }
      st.mode = n === 4 ? "4" : "2";
      st.running = true;
      st.overSent = false;
      st.lastTick = nowMs();
      resetPongRound(st, Math.random() < 0.5 ? 1 : -1);
      broadcast(room, { t: "run", v: true });
      broadcast(room, { t: "state", game: "pong", s: serializeState("pong", st) });
      return;
    }

    if (msg.t === "reset") {
      if (room.game === "tanks") {
        room.state = tanks.makeTanksState();
        for (const [, cmeta] of room.clients) {
          const slot = Number(cmeta.side);
          if (slot >= 0 && slot <= 3) room.state.players[slot] = tanks.spawnTank(room.state, slot);
        }
      } else if (room.game === "trivia") {
        trivia.triviaResetRoom(room);
      } else {
        room.state = makeState(room.game);
      }
      clearAllReady(room);
      if (room.game === "rps") syncRpsAcceptPicks(room);
      if (room.game === "ttt") syncTttAllowMoves(room);
      if (room.game === "tanks") tanksTryStartMatch(room);
      if (room.game === "trivia") trivia.triviaTryStartMatch(room);
      broadcast(room, { t: "reset" });
      if (room.game === "trivia") broadcastTrivia(room);
      else broadcast(room, { t: "state", game: room.game, s: serializeState(room.game, room.state) });
      broadcastLobby(room);
      return;
    }

    if (room.game === "trivia" && msg.t === "trivia_opts") {
      trivia.triviaMergeOpts(room.state, msg);
      broadcastTrivia(room);
      return;
    }

    if (room.game === "trivia" && msg.t === "trivia_start") {
      if (!room.state.matchLive) {
        send(ws, { t: "err", m: "Alle müssen Ready sein (mind. 2 Spieler)." });
        return;
      }
      if (room.state.phase !== "lobby") {
        send(ws, { t: "err", m: "Schon aktiv." });
        return;
      }
      if (!trivia.triviaBeginMatch(room)) {
        send(ws, { t: "err", m: "Start nicht möglich (zu wenig Fragen im Filter?)." });
        return;
      }
      broadcastTrivia(room);
      broadcastLobby(room);
      return;
    }

    if (room.game === "trivia" && msg.t === "trivia_answer") {
      const st = room.state;
      if (st.phase !== "question") return;
      const slotStr = String(meta.side);
      if (trivia.triviaApplyAnswer(st, slotStr, msg.i)) broadcastTrivia(room);
      return;
    }

    if (room.game === "trivia" && msg.t === "trivia_answer_text") {
      const st = room.state;
      if (st.phase !== "question") return;
      const slotStr = String(meta.side);
      if (trivia.triviaApplyTextAnswer(st, slotStr, msg.text)) broadcastTrivia(room);
      return;
    }

    if (room.game === "rps" && msg.t === "pick") {
      const m = String(msg.m || "").toLowerCase();
      if (!["r", "p", "s"].includes(m)) return;
      const st = room.state;
      if (!st.acceptPicks) {
        send(ws, { t: "err", m: "Beide müssen Ready drücken." });
        return;
      }
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
        clearAllReady(room);
        st.acceptPicks = false;
        broadcast(room, { t: "rps_result", r: st.lastResult, sA: st.sA, sB: st.sB, round: st.round });
        broadcast(room, { t: "state", game: "rps", s: serializeState("rps", st) });
        broadcastLobby(room);
      }
      return;
    }

    if (room.game === "ttt" && msg.t === "move") {
      const st = room.state;
      if (!st.allowMoves) return;
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
      if (meta.side !== st.hostId) return;
      if (st.started) return;
      const onlineN = st.players.filter((p) => unoSeatOnline(room, p.id)).length;
      if (onlineN < 2) {
        send(ws, { t: "uno_hint", m: "Mindestens 2 Spieler online." });
        return;
      }
      unoStart(st);
      broadcastUno(room);
      return;
    }
    if (room.game === "uno" && msg.t === "uno_draw") {
      const st = room.state;
      if (!st.started) return;
      if (st.players[st.turnIdx]?.id !== meta.side) return;
      const drew = unoDraw(st, meta.side);
      st.msg = drew ? "Gezogen." : "Deck leer.";
      broadcastUno(room);
      return;
    }
    if (room.game === "uno" && msg.t === "uno_pass") {
      const st = room.state;
      if (!st.started) return;
      if (st.players[st.turnIdx]?.id !== meta.side) return;
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
      if (st.players[st.turnIdx]?.id !== meta.side) return;
      const id = Number(msg.id);
      const col = msg.col; // optional for wild
      const ok = unoPlay(st, meta.side, id, col);
      if (!ok) send(ws, { t: "uno_hint", m: "Nicht spielbar." });
      broadcastUno(room);
      return;
    }
  });

  ws.on("close", () => {
    const room = ws._room;
    if (!room) return;
    const meta = room.clients.get(ws);
    room.clients.delete(ws);
    if (room.game === "uno") {
      const st = room.state;
      const seatId = meta?.side;
      if (!seatId) {
        broadcastUno(room);
        return;
      }
      if (st.started) {
        const p = st.players.find((x) => x.id === seatId);
        if (p) p.offline = true;
        const curId = st.players[st.turnIdx]?.id;
        if (curId === seatId) {
          st.canPass = false;
          let guard = 0;
          while (
            st.players.length &&
            st.players[st.turnIdx] &&
            !unoSeatOnline(room, st.players[st.turnIdx].id) &&
            guard++ < 16
          ) {
            unoNextTurn(st, 1);
          }
          st.msg = "Spieler getrennt – Zug weiter.";
        }
      } else {
        st.players = st.players.filter((p) => p.id !== seatId);
        st.hands.delete(seatId);
        if (st.hostId === seatId) st.hostId = st.players[0]?.id || null;
        if (st.turnIdx >= st.players.length) st.turnIdx = 0;
      }
      broadcastUno(room);
      return;
    }
    if (room.game === "trivia") {
      if (room.state.phase !== "lobby") trivia.triviaResetRoom(room);
      clearAllReady(room);
      trivia.triviaTryStartMatch(room);
      broadcast(room, { t: "peers", n: room.clients.size });
      broadcastTrivia(room);
      broadcastLobby(room);
      return;
    }
    if (room.game === "tanks") {
      const slot = Number(meta?.side);
      if (Number.isFinite(slot) && slot >= 0 && slot <= 3) {
        room.state.players[slot] = null;
        room.state.bullets = room.state.bullets.filter((b) => b.own !== slot);
      }
      room.state.matchLive = false;
      tanksTryStartMatch(room);
      broadcast(room, { t: "peers", n: room.clients.size });
      broadcast(room, { t: "state", game: "tanks", s: serializeState("tanks", room.state) });
      broadcastLobby(room);
      return;
    }
    if (room.game === "pong" && room.state.running) {
      room.state.running = false;
    }
    if (room.game === "rps") syncRpsAcceptPicks(room);
    if (room.game === "ttt") syncTttAllowMoves(room);
    broadcast(room, { t: "peers", n: room.clients.size });
    broadcastLobby(room);
    if (room.game === "pong") {
      broadcast(room, { t: "state", game: "pong", s: serializeState("pong", room.state) });
    }
    if (room.game === "rps" || room.game === "ttt") {
      broadcast(room, { t: "state", game: room.game, s: serializeState(room.game, room.state) });
    }
    // cleanup empty rooms after some time
  });
});

function serializeState(game, st, room) {
  if (game === "tanks") return tanks.serializeTanksState(st);
  if (game === "rps") {
    return {
      round: st.round,
      picks: { A: !!st.picks.A, B: !!st.picks.B }, // don't leak actual pick
      sA: st.sA,
      sB: st.sB,
      acceptPicks: !!st.acceptPicks,
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
      allowMoves: !!st.allowMoves,
    };
  }
  if (game === "uno") {
    const onlineCount = st.players.filter((p) => (room ? unoSeatOnline(room, p.id) : true)).length;
    return {
      started: st.started,
      phase: st.started ? "play" : "lobby",
      hostId: st.hostId,
      players: st.players.map((p) => ({
        id: p.id,
        name: p.name,
        n: (st.hands.get(p.id)?.length || 0),
        offline: room ? !unoSeatOnline(room, p.id) : false,
      })),
      turnId: st.players[st.turnIdx]?.id || null,
      turnName: st.players[st.turnIdx]?.name || null,
      dir: st.dir,
      deckN: st.deck.length,
      top: st.discard[st.discard.length - 1] || null,
      curCol: st.curCol,
      canStart: !st.started && onlineCount >= 2,
      canPass: st.canPass,
      msg: st.msg,
      drawStack: st.drawStack,
    };
  }
  return {
    running: st.running,
    mode: st.mode || "2",
    sL: st.sL,
    sR: st.sR,
    sT: st.sT || 0,
    sB: st.sB || 0,
    L: { y: st.left.y },
    R: { y: st.right.y },
    Pt: { x: st.top.x },
    Pb: { x: st.bot.x },
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
  for (const [ws, cmeta] of room.clients) {
    const pid = cmeta.side;
    const h = st.hands.get(pid) || [];
    const pub = serializeState("uno", st, room);
    const handOut = h.map((c) => ({
      ...c,
      playable: (pub.turnId === pid) && st.started && unoIsPlayable(st, c),
    }));
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
      room._pongSnap = room._pongSnap || 0;
      if (t - room._pongSnap >= 33) {
        room._pongSnap = t;
        broadcast(room, { t: "state", game: "pong", s: serializeState("pong", st) });
      }
      if (!st.overSent && !st.running) {
        let w = null;
        if ((st.mode || "2") === "2") {
          if (st.sL >= 7 || st.sR >= 7) w = st.sL > st.sR ? "L" : "R";
        } else {
          const m = Math.max(st.sL || 0, st.sR || 0, st.sT || 0, st.sB || 0);
          if (m >= 7) {
            if (st.sL >= 7 && st.sL === m) w = "L";
            else if (st.sR >= 7 && st.sR === m) w = "R";
            else if (st.sT >= 7 && st.sT === m) w = "T";
            else if (st.sB >= 7 && st.sB === m) w = "B";
          }
        }
        if (w) {
          st.overSent = true;
          broadcast(room, { t: "over", game: "pong", w });
        }
      }
    }
    if (room.game === "tanks") {
      const st = room.state;
      const dt = t - st.lastTick;
      st.lastTick = t;
      tanks.tickTanks(st, dt);
      room._tanksBw = room._tanksBw ?? 0;
      if (t - room._tanksBw >= 42) {
        room._tanksBw = t;
        broadcast(room, { t: "state", game: "tanks", s: serializeState("tanks", st) });
      }
    }
    if (room.game === "trivia") {
      const st = room.state;
      if (st.phase === "question" && st.current) {
        let cutoff = t >= st.current.endsAt;
        if (!cutoff) {
          let online = 0;
          let allAnswered = true;
          for (const [ws, m] of room.clients) {
            if (ws.readyState !== ws.OPEN) continue;
            online++;
            if (st.answers[String(m.side)] === undefined) allAnswered = false;
          }
          cutoff = online >= 2 && allAnswered;
        }
        if (cutoff) {
          trivia.triviaFinalizeQuestion(room);
          broadcastTrivia(room);
        }
      } else if (st.phase === "reveal" && t >= st.revealUntil) {
        trivia.triviaTickReveal(room);
        broadcastTrivia(room);
        broadcastLobby(room);
      }
    }
  }
}, 16);

server.listen(PORT, () => {
  console.log(`pong-online listening on :${PORT}`);
});

