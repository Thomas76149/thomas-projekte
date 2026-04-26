import { TRIVIA_QUESTIONS, TRIVIA_CATS } from "./trivia-questions.js";

export const MAX_PLAYERS = 8;
const QUESTION_MS = 14000;
const REVEAL_MS = 3800;
const MAX_TEXT_ANSWER_LEN = 140;

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + c);
    }
  }
  return dp[m][n];
}

export function normAnswerText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 0..1 — 1 = identisch nach Normalisierung */
export function textSimilarity(userRaw, correctRaw) {
  const A = normAnswerText(userRaw);
  const B = normAnswerText(correctRaw);
  if (!A || !B) return 0;
  if (A === B) return 1;
  const d = levenshtein(A, B);
  const mx = Math.max(A.length, B.length);
  return Math.max(0, 1 - d / mx);
}

/** Multiplikator (nach Normalisierung inkl. Groß/klein); volle Punktzahl ab hoher Ähnlichkeit */
function textScoreMultiplier(sim) {
  if (sim >= 0.93) return 1;
  if (sim >= 0.84) return 0.72;
  if (sim >= 0.72) return 0.48;
  if (sim >= 0.58) return 0.28;
  if (sim >= 0.45) return 0.12;
  return 0;
}

export function makeTriviaState() {
  return {
    phase: "lobby",
    matchLive: false,
    sessionOver: false,
    opts: {
      cats: [],
      diff: "all",
      rounds: 10,
      answerMode: "mcq", // mcq | text
    },
    round: 0,
    totalRounds: 10,
    usedIds: [],
    /** Zähler pro Kategorie im laufenden Match — für ausgewogene Themenwahl */
    catPickCounts: Object.create(null),
    /** verhindert dieselbe Frage direkt zweimal hintereinander */
    lastQuestionId: null,
    current: null,
    /** slot -> number (mcq) oder string (text) */
    answers: {},
    /** slot -> Date.now() beim ersten Absenden */
    answerTimes: {},
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
  const banId = st.lastQuestionId;
  let pool = filterPool(st).filter((q) => !st.usedIds.includes(q.id));
  if (banId != null) pool = pool.filter((q) => q.id !== banId);
  if (!pool.length) {
    st.usedIds = [];
    pool = filterPool(st).filter((q) => q.id !== banId);
  }
  if (!pool.length) {
    pool = filterPool(st);
    if (banId != null && pool.length > 1) pool = pool.filter((q) => q.id !== banId);
  }
  if (!pool.length) return null;

  if (!st.catPickCounts) st.catPickCounts = Object.create(null);

  const wantCats = st.opts.cats && st.opts.cats.length ? st.opts.cats : null;
  const byCat = new Map();
  for (const q of pool) {
    if (wantCats && !wantCats.includes(q.cat)) continue;
    if (!byCat.has(q.cat)) byCat.set(q.cat, []);
    byCat.get(q.cat).push(q);
  }

  const catsWithQs = [...byCat.keys()];
  let raw;
  if (catsWithQs.length === 0) {
    raw = pool[(Math.random() * pool.length) | 0];
  } else if (catsWithQs.length === 1) {
    const one = byCat.get(catsWithQs[0]);
    raw = one[(Math.random() * one.length) | 0];
  } else {
    for (const c of catsWithQs) {
      if (st.catPickCounts[c] == null) st.catPickCounts[c] = 0;
    }
    let min = Infinity;
    for (const c of catsWithQs) min = Math.min(min, st.catPickCounts[c]);
    const tier = catsWithQs.filter((c) => st.catPickCounts[c] === min);
    const pickCat = tier[(Math.random() * tier.length) | 0];
    const catPool = byCat.get(pickCat);
    raw = catPool[(Math.random() * catPool.length) | 0];
  }

  st.catPickCounts[raw.cat] = (st.catPickCounts[raw.cat] || 0) + 1;
  st.usedIds.push(raw.id);
  st.lastQuestionId = raw.id;
  return raw;
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
  st.lastQuestionId = null;
  st.catPickCounts = Object.create(null);
  st.lastReveal = null;
  st.current = null;
  st.phase = "lobby";
  st.answerTimes = {};

  st.scores = {};
  for (const [ws, meta] of room.clients) {
    if (ws.readyState !== ws.OPEN) continue;
    st.scores[String(meta.side)] = 0;
  }

  return triviaStartRound(room);
}

export function triviaStartRound(room) {
  const st = room.state;
  if (room.game !== "trivia") return false;
  if (st.round >= st.totalRounds) return false;

  const raw = pickQuestion(st);
  if (!raw) return false;

  const mode = st.opts.answerMode === "text" ? "text" : "mcq";

  st.round++;
  st.phase = "question";
  st.answers = {};
  st.answerTimes = {};
  st.lastReveal = null;
  const endsAt = Date.now() + QUESTION_MS;
  st.current = {
    id: raw.id,
    cat: raw.cat,
    diff: raw.diff,
    q: raw.q,
    choices: raw.choices.slice(),
    a: raw.a,
    answerMode: mode,
    correctText: raw.choices[raw.a] || "",
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
  if (st.current.answerMode !== "mcq") return false;
  if (Date.now() > st.current.endsAt) return false;
  const i = Number(idx);
  if (!Number.isFinite(i) || i < 0 || i > 3) return false;
  if (st.answerTimes[slotStr] == null) st.answerTimes[slotStr] = Date.now();
  st.answers[slotStr] = i;
  return true;
}

export function triviaApplyTextAnswer(st, slotStr, text) {
  if (st.phase !== "question" || !st.current) return false;
  if (st.current.answerMode !== "text") return false;
  if (Date.now() > st.current.endsAt) return false;
  let t = String(text || "").trim().slice(0, MAX_TEXT_ANSWER_LEN);
  if (!t) return false;
  if (st.answerTimes[slotStr] == null) st.answerTimes[slotStr] = Date.now();
  st.answers[slotStr] = t;
  return true;
}

export function triviaFinalizeQuestion(room) {
  const st = room.state;
  if (st.phase !== "question" || !st.current) return;
  const cur = st.current;
  const mode = cur.answerMode;
  const correctIdx = cur.a;
  const correctText = cur.correctText || cur.choices[correctIdx] || "";
  const breakdown = [];

  /** Punkte-Basis ab verbleibender Zeit beim Absenden (schnell = bis ~500, knapp vor Ende ≈ 40) */
  function basePointsForSlot(slot) {
    const tAns = st.answerTimes[slot];
    if (tAns == null) return 0;
    const leftAtSubmit = Math.max(0, cur.endsAt - tAns);
    const speed = Math.min(1, leftAtSubmit / QUESTION_MS);
    return Math.round(40 + 460 * speed);
  }

  for (const [ws, meta] of room.clients) {
    if (ws.readyState !== ws.OPEN) continue;
    const slot = String(meta.side);
    const rawPick = st.answers[slot];
    let pts = 0;
    let pick = null;
    let pickText = null;
    let similarity = 0;
    let ok = false;
    let near = false;

    if (mode === "mcq") {
      pick = rawPick === undefined ? null : rawPick;
      if (pick === correctIdx) {
        pts = basePointsForSlot(slot);
        ok = true;
      }
      breakdown.push({
        slot,
        name: meta.name || `P${Number(slot) + 1}`,
        pts,
        pick,
        pickText: pick !== null && pick !== undefined ? cur.choices[pick] : null,
        similarity: pick === correctIdx ? 1 : 0,
        ok,
        near: false,
      });
    } else {
      pickText = rawPick === undefined ? null : String(rawPick);
      if (pickText) {
        similarity = textSimilarity(pickText, correctText);
        const mult = textScoreMultiplier(similarity);
        const base = basePointsForSlot(slot);
        pts = Math.round(base * mult);
        ok = mult >= 1;
        near = mult > 0 && mult < 1;
      }
      breakdown.push({
        slot,
        name: meta.name || `P${Number(slot) + 1}`,
        pts,
        pick: null,
        pickText,
        similarity: pickText ? Math.round(similarity * 1000) / 1000 : 0,
        ok,
        near,
      });
    }

    if (pts > 0) st.scores[slot] = (st.scores[slot] || 0) + pts;
  }

  st.lastReveal = {
    mode,
    correct: mode === "mcq" ? correctIdx : null,
    correctText,
    breakdown,
  };
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
  st.lastQuestionId = null;
  st.catPickCounts = Object.create(null);
  st.current = null;
  st.answers = {};
  st.answerTimes = {};
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
  if (msg.answerMode != null) {
    const m = String(msg.answerMode).toLowerCase();
    if (m === "text" || m === "mcq") st.opts.answerMode = m;
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
    const mode = st.current.answerMode;
    qPublic = {
      mode,
      id: st.current.id,
      cat: st.current.cat,
      diff: st.current.diff,
      q: st.current.q,
      endsAt: st.current.endsAt,
      round: st.round,
      totalRounds: st.totalRounds,
    };
    if (mode === "mcq") qPublic.choices = st.current.choices;
  }

  let reveal = null;
  if (st.lastReveal) {
    reveal = {
      mode: st.lastReveal.mode,
      correct: st.lastReveal.correct,
      correctText: st.lastReveal.correctText,
      breakdown: st.lastReveal.breakdown.map((b) => ({
        side: b.slot,
        name: b.name,
        pts: b.pts,
        pick: b.pick,
        pickText: b.pickText,
        similarity: b.similarity,
        ok: b.ok,
        near: b.near,
      })),
    };
  }

  let myAnswer = null;
  if (st.phase === "question" && st.current) {
    const mine = st.answers[sideStr];
    if (mine !== undefined) myAnswer = mine;
  } else if (st.phase === "reveal" && st.lastReveal) {
    const row = st.lastReveal.breakdown.find((b) => b.slot === sideStr);
    if (row && st.lastReveal.mode === "mcq" && row.pick !== null && row.pick !== undefined) myAnswer = row.pick;
    if (row && st.lastReveal.mode === "text" && row.pickText) myAnswer = row.pickText;
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
