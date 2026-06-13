/* ============================================================
   FREQUENZ (Wellenlänge) — Server-Modul
   Rundenbasiert, server-autoritativ. Ein Hinweisgeber sieht eine
   geheime Zielzone auf einem Spektrum und gibt EIN Hinweiswort;
   alle anderen schieben einen Regler dorthin. Punkte nach Nähe.
   Abgekapselt — verändert keine anderen Spiele.
   ============================================================ */
export const MAX_PLAYERS = 10;
const REVEAL_MS = 6000;
const CLUE_MS = 75000;   // Zeit für den Hinweisgeber
const GUESS_MS = 50000;  // Zeit zum Raten
const MAX_CLUE_LEN = 60;

/* Spektren: [linkes Extrem, rechtes Extrem] */
export const SPECTRA = [
  ["Kalt", "Heiß"], ["Überbewertet", "Unterbewertet"], ["Nutzlos", "Nützlich"],
  ["Gruselig", "Niedlich"], ["Alltäglich", "Bizarr"], ["Ungesund", "Gesund"],
  ["Leise", "Laut"], ["Billig", "Teuer"], ["Langweilig", "Spannend"],
  ["Peinlich", "Cool"], ["Fantasie", "Realität"], ["Schwach", "Mächtig"],
  ["Vorübergehend", "Für immer"], ["Verboten", "Erlaubt"], ["Hässlich", "Schön"],
  ["Einfach", "Kompliziert"], ["Böse", "Gut"], ["Künstlich", "Natürlich"],
  ["Wertlos", "Wertvoll"], ["Sicher", "Gefährlich"], ["Modern", "Altmodisch"],
  ["Weich", "Hart"], ["Geheim", "Öffentlich"], ["Normal", "Verrückt"],
  ["Unwichtig", "Lebenswichtig"], ["Nervig", "Angenehm"], ["Klein", "Riesig"],
  ["Realistisch", "Magisch"], ["Schnell", "Langsam"], ["Trocken", "Nass"],
  ["Spießig", "Rebellisch"], ["Süß", "Herzhaft"], ["Vergänglich", "Klassisch"],
  ["Kindisch", "Erwachsen"], ["Friedlich", "Aggressiv"], ["Dunkel", "Hell"],
  ["Schwer zu kriegen", "Leicht zu kriegen"], ["Romantisch", "Unromantisch"],
  ["Vergessen", "Legendär"], ["Privat", "Berühmt"], ["Ekelhaft", "Lecker"],
  ["Faul", "Fleißig"], ["Zufällig", "Geplant"], ["Schräg", "Normal"],
  ["Stressig", "Entspannt"], ["Albern", "Ernst"], ["Mainstream", "Nische"],
  ["Praktisch", "Luxuriös"], ["Veraltet", "Zukunft"], ["Harmlos", "Tödlich"],
];

export function makeFrequenzState() {
  return {
    phase: "lobby",        // lobby | clue | guess | reveal
    matchLive: false,
    sessionOver: false,
    round: 0,
    totalRounds: 8,
    order: [],             // Reihenfolge der Spieler-Slots (Strings)
    giverIdx: 0,
    giver: null,           // Slot des aktuellen Hinweisgebers (String)
    spectrum: null,        // [links, rechts]
    target: 0,             // geheime Zielposition 0..100
    clue: "",
    guesses: {},           // slot -> 0..100
    scores: {},            // slot -> Punkte
    lastReveal: null,
    deadline: 0,           // Phasen-Deadline (ms)
    revealUntil: 0,
    lastSpectrumIdx: -1,
  };
}

function openSlots(room) {
  const out = [];
  for (const [ws, meta] of room.clients) {
    if (ws.readyState === ws.OPEN) out.push(String(meta.side));
  }
  out.sort((a, b) => Number(a) - Number(b));
  return out;
}

export function freqTryStartMatch(room) {
  if (room.game !== "frequenz") return;
  const st = room.state;
  const open = [...room.clients.keys()].filter((ws) => ws.readyState === ws.OPEN);
  const readyN = open.filter((ws) => room.clients.get(ws)?.ready).length;
  st.matchLive = open.length >= 2 && readyN === open.length;
}

export function freqBeginMatch(room) {
  const st = room.state;
  if (room.game !== "frequenz" || !st.matchLive) return false;
  const slots = openSlots(room);
  if (slots.length < 2) return false;
  st.sessionOver = false;
  st.order = slots.slice();
  st.giverIdx = 0;
  st.round = 0;
  st.totalRounds = Math.max(4, Math.min(16, slots.length * 2));
  st.lastSpectrumIdx = -1;
  st.scores = {};
  for (const s of slots) st.scores[s] = 0;
  st.lastReveal = null;
  return freqStartRound(room);
}

export function freqStartRound(room) {
  const st = room.state;
  if (room.game !== "frequenz") return false;
  if (st.round >= st.totalRounds) return false;

  // Hinweisgeber rotieren (nur noch verbundene Slots berücksichtigen)
  const slots = openSlots(room);
  if (slots.length < 2) return false;
  st.order = st.order.filter((s) => slots.includes(s));
  for (const s of slots) if (!st.order.includes(s)) st.order.push(s);
  st.giver = st.order[st.giverIdx % st.order.length];

  let idx = (Math.random() * SPECTRA.length) | 0;
  if (idx === st.lastSpectrumIdx) idx = (idx + 1) % SPECTRA.length;
  st.lastSpectrumIdx = idx;
  st.spectrum = SPECTRA[idx];
  st.target = 6 + ((Math.random() * 88) | 0);   // 6..94
  st.clue = "";
  st.guesses = {};
  st.lastReveal = null;
  st.round++;
  st.phase = "clue";
  st.deadline = Date.now() + CLUE_MS;
  for (const s of slots) if (st.scores[s] == null) st.scores[s] = 0;
  return true;
}

export function freqApplyClue(st, slotStr, text) {
  if (st.phase !== "clue") return false;
  if (slotStr !== st.giver) return false;
  const t = String(text || "").trim().replace(/\s+/g, " ").slice(0, MAX_CLUE_LEN);
  if (!t) return false;
  st.clue = t;
  st.phase = "guess";
  st.deadline = Date.now() + GUESS_MS;
  return true;
}

export function freqApplyGuess(st, slotStr, pos) {
  if (st.phase !== "guess") return false;
  if (slotStr === st.giver) return false;   // Hinweisgeber rät nicht
  const p = Number(pos);
  if (!Number.isFinite(p)) return false;
  st.guesses[slotStr] = Math.max(0, Math.min(100, p));
  return true;
}

export function freqAllGuessed(room) {
  const st = room.state;
  let pending = 0;
  for (const [ws, meta] of room.clients) {
    if (ws.readyState !== ws.OPEN) continue;
    const s = String(meta.side);
    if (s === st.giver) continue;
    if (st.guesses[s] === undefined) pending++;
  }
  return pending === 0;
}

function pointsForDist(d) {
  if (d <= 3) return 5;
  if (d <= 8) return 4;
  if (d <= 15) return 3;
  if (d <= 24) return 2;
  if (d <= 34) return 1;
  return 0;
}

export function freqFinalizeRound(room) {
  const st = room.state;
  if (st.phase !== "guess" && st.phase !== "clue") return;
  const breakdown = [];
  let sum = 0, count = 0;
  for (const [ws, meta] of room.clients) {
    if (ws.readyState !== ws.OPEN) continue;
    const s = String(meta.side);
    if (s === st.giver) continue;
    const g = st.guesses[s];
    let pts = 0;
    if (g !== undefined) { pts = pointsForDist(Math.abs(g - st.target)); sum += pts; count++; }
    st.scores[s] = (st.scores[s] || 0) + pts;
    breakdown.push({ side: s, name: meta.name || `P${Number(s) + 1}`, pos: g === undefined ? null : g, pts });
  }
  // Hinweisgeber-Punkte = Durchschnitt der Rater (gute Hinweise belohnen)
  const giverPts = count ? Math.round(sum / count) : 0;
  if (st.giver != null) st.scores[st.giver] = (st.scores[st.giver] || 0) + giverPts;
  let giverName = "";
  for (const [, meta] of room.clients) if (String(meta.side) === st.giver) giverName = meta.name || "";

  st.lastReveal = {
    spectrum: st.spectrum, target: st.target, clue: st.clue,
    giver: st.giver, giverName, giverPts, breakdown,
  };
  st.phase = "reveal";
  st.revealUntil = Date.now() + REVEAL_MS;
}

export function freqTickReveal(room) {
  const st = room.state;
  if (st.phase !== "reveal") return;
  if (Date.now() < st.revealUntil) return;
  st.lastReveal = null;
  st.giverIdx++;
  if (st.round >= st.totalRounds) {
    st.phase = "lobby"; st.matchLive = false; st.sessionOver = true;
    for (const [, meta] of room.clients) if (meta) meta.ready = false;
  } else if (!freqStartRound(room)) {
    st.phase = "lobby"; st.matchLive = false; st.sessionOver = true;
    for (const [, meta] of room.clients) if (meta) meta.ready = false;
  }
}

export function freqResetRoom(room) {
  const st = room.state;
  st.phase = "lobby"; st.matchLive = false; st.sessionOver = false;
  st.round = 0; st.giverIdx = 0; st.giver = null; st.spectrum = null;
  st.clue = ""; st.guesses = {}; st.lastReveal = null; st.deadline = 0; st.revealUntil = 0;
  for (const k of Object.keys(st.scores)) st.scores[k] = 0;
}

export function serializeFreqStateForClient(st, room, sideStr) {
  const roster = [];
  for (const [ws, meta] of room.clients) {
    if (ws.readyState !== ws.OPEN) continue;
    roster.push({ side: meta.side, name: meta.name || "", score: st.scores[String(meta.side)] || 0 });
  }
  roster.sort((a, b) => Number(a.side) - Number(b.side));

  const isGiver = String(st.giver) === sideStr;
  // Ziel ist GEHEIM: nur der Hinweisgeber sieht es (während clue/guess), beim Reveal alle.
  let target = null;
  if (st.phase === "reveal") target = st.target;
  else if (isGiver && (st.phase === "clue" || st.phase === "guess")) target = st.target;

  let reveal = null;
  if (st.lastReveal) reveal = { ...st.lastReveal };

  return {
    phase: st.phase,
    live: st.matchLive,
    sessionOver: !!st.sessionOver,
    round: st.round,
    totalRounds: st.totalRounds,
    roster,
    giver: st.giver,
    isGiver,
    spectrum: st.spectrum,
    clue: st.clue,
    target,                                   // null außer beim Geber / im Reveal
    deadline: st.deadline,
    myGuess: st.guesses[sideStr] === undefined ? null : st.guesses[sideStr],
    guessedCount: Object.keys(st.guesses).length,
    needGuesses: Math.max(0, roster.length - 1),
    reveal,
  };
}
