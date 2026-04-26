import { TRIVIA_QUESTIONS, TRIVIA_CATS } from "./trivia-questions.js";

export const MAX_PLAYERS = 8;
const QUESTION_MS = 14000;
const REVEAL_MS = 3500;

export function makeTriviaState() {
  return {
    phase: "lobby", // lobby | question | reveal
    matchLive: false,
    sessionOver: false,
    opts: {
      cats: [],
      diff: "all",
      rounds: 10,
    },
    round: 0,
    totalRounds: 10,
    usedIds: [],
    current: null,
    answers: {},
    scores: {},
    lastReveal: null,
    revealUntil: 0,
  };
}

function filterPool(st) {
  const { cats, diff } = st.opts;
  return TRIVIA_QUESTIONS.filter((q) => {
    if (cats && cats.length && !cats.includes(q.cat)) return false;
    if (diff && diff !== "all" && q.diff !== diff) return false;
    return true;
  });
}

function pickQuestion(st) {
  let pool = filterPool(st).filter((q) => !st.usedIds.includes(q.id));
  if (!pool.length) {
    st.usedIds = [];
    pool = filterPool(st);
  }
  if (!pool.length) return null;
  return pool[(Math.random() * pool.length) | 0];
}

export function triviaTryStartMatch(room) {
  if (room.game !== "trivia") return;
  const st = room.state;
  const open = [...room.clients.keys()].filter((ws) => ws.readyState === ws.OPEN);
  const readyN = open.filter((ws) => room.clients.get(ws)?.ready).length;
  st.matchLive = open.length >= 2 && readyN === open.length;
}

export function triviaBeginMatch(room) {
  const st = room.state;
  if (room.game !== "trivia") return false;
  if (!st.matchLive) return false;
  const open = [...room.clients.keys()].filter((ws) => ws.readyState === ws.OPEN);
  if (open.length < 2) return false;

  st.sessionOver = false;
  st.totalRounds = Math.max(1, Math.min(50, Number(st.opts.rounds) || 10));
  st.round = 0;
  st.usedIds = [];
  st.lastReveal = null;
  st.current = null;
  st.phase = "lobby";

  for (const [, meta] of room.clients) {
    const s = String(meta.side);
    if (st.scores[s] == null) st.scores[s] = 0;
  }

  return triviaStartRound(room);
}

export function triviaStartRound(room) {
  const st = room.state;
  if (room.game !== "trivia") return false;
  if (st.round >= st.totalRounds) return false;

  const raw = pickQuestion(st);
  if (!raw) return false;

  st.round++;
  st.phase = "question";
  st.answers = {};
  st.lastReveal = null;
  const endsAt = Date.now() + QUESTION_MS;
  st.current = {
    id: raw.id,
    cat: raw.cat,
    diff: raw.diff,
    q: raw.q,
    choices: raw.choices.slice(),
    a: raw.a,
    endsAt,
  };
  for (const [, meta] of room.clients) {
    const s = String(meta.side);
    if (st.scores[s] == null) st.scores[s] = 0;
  }
  return true;
}

export function triviaApplyAnswer(st, slotStr, idx) {
  if (st.phase !== "question" || !st.current) return false;
  if (Date.now() > st.current.endsAt) return false;
  const i = Number(idx);
  if (!Number.isFinite(i) || i < 0 || i > 3) return false;
  st.answers[slotStr] = i;
  return true;
}

export function triviaFinalizeQuestion(room) {
  const st = room.state;
  if (st.phase !== "question" || !st.current) return;
  const correct = st.current.a;
  const breakdown = [];
  const now = Date.now();
  for (const [ws, meta] of room.clients) {
    if (ws.readyState !== ws.OPEN) continue;
    const slot = String(meta.side);
    let pick = st.answers[slot];
    if (pick === undefined) pick = null;
    let pts = 0;
    if (pick === correct) {
      const left = Math.max(0, st.current.endsAt - now);
      pts = 100 + Math.round((left / QUESTION_MS) * 400);
    }
    if (pts > 0) st.scores[slot] = (st.scores[slot] || 0) + pts;
    breakdown.push({ slot, name: meta.name || `P${Number(slot) + 1}`, pts, pick, correct: pick === correct });
  }
  st.lastReveal = { correct, breakdown };
  st.phase = "reveal";
  st.revealUntil = Date.now() + REVEAL_MS;
  st.current = null;
}

export function triviaTickReveal(room) {
  const st = room.state;
  if (st.phase !== "reveal") return;
  if (Date.now() < st.revealUntil) return;
  st.lastReveal = null;
  if (st.round >= st.totalRounds) {
    st.phase = "lobby";
    st.matchLive = false;
    st.sessionOver = true;
    for (const [, meta] of room.clients) {
      if (meta) meta.ready = false;
    }
  } else if (!triviaStartRound(room)) {
    st.phase = "lobby";
    st.matchLive = false;
    st.sessionOver = true;
    for (const [, meta] of room.clients) {
      if (meta) meta.ready = false;
    }
  }
}

export function triviaResetRoom(room) {
  const st = room.state;
  st.phase = "lobby";
  st.matchLive = false;
  st.sessionOver = false;
  st.round = 0;
  st.totalRounds = 10;
  st.usedIds = [];
  st.current = null;
  st.answers = {};
  st.lastReveal = null;
  st.revealUntil = 0;
  for (const k of Object.keys(st.scores)) st.scores[k] = 0;
}

export function triviaMergeOpts(st, msg) {
  if (msg.cats != null) {
    const arr = Array.isArray(msg.cats) ? msg.cats : [];
    st.opts.cats = arr.map((c) => String(c).toLowerCase()).filter(Boolean);
  }
  if (msg.diff != null) {
    const d = String(msg.diff).toLowerCase();
    if (["all", "easy", "medium", "hard"].includes(d)) st.opts.diff = d;
  }
  if (msg.rounds != null) {
    const n = Number(msg.rounds);
    if (Number.isFinite(n)) st.opts.rounds = Math.max(3, Math.min(40, Math.round(n)));
  }
}

export function serializeTriviaStateForClient(st, room, sideStr) {
  const roster = [];
  for (const [ws, meta] of room.clients) {
    if (ws.readyState !== ws.OPEN) continue;
    roster.push({
      side: meta.side,
      score: st.scores[String(meta.side)] || 0,
      name: meta.name || "",
    });
  }
  roster.sort((a, b) => Number(a.side) - Number(b.side));

  let qPublic = null;
  if (st.current) {
    qPublic = {
      id: st.current.id,
      cat: st.current.cat,
      diff: st.current.diff,
      q: st.current.q,
      choices: st.current.choices,
      endsAt: st.current.endsAt,
      round: st.round,
      totalRounds: st.totalRounds,
    };
  }

  let reveal = null;
  if (st.lastReveal) {
    reveal = {
      correct: st.lastReveal.correct,
      breakdown: st.lastReveal.breakdown.map((b) => ({
        side: b.slot,
        name: b.name,
        pts: b.pts,
        pick: b.pick,
        ok: b.correct,
      })),
    };
  }

  let myAnswer = null;
  if (st.phase === "question" && st.current) {
    const mine = st.answers[sideStr];
    myAnswer = mine !== undefined ? mine : null;
  } else if (st.phase === "reveal" && st.lastReveal) {
    const row = st.lastReveal.breakdown.find((b) => b.slot === sideStr);
    if (row && row.pick !== null && row.pick !== undefined) myAnswer = row.pick;
  }

  return {
    phase: st.phase,
    live: st.matchLive,
    playing: st.phase === "question" || st.phase === "reveal",
    sessionOver: !!st.sessionOver,
    opts: { ...st.opts },
    round: st.round,
    totalRounds: st.totalRounds,
    roster,
    q: qPublic,
    reveal,
    myAnswer,
    cats: TRIVIA_CATS,
  };
}

export { TRIVIA_CATS, TRIVIA_QUESTIONS };
