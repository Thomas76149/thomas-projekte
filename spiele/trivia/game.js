/**
 * Trivia — WebSocket game: "trivia"
 */
const DEFAULT_WSS_URL = "wss://thomas-projekte.onrender.com";

const netStat = document.getElementById("netStat");
const netUrl = document.getElementById("netUrl");
const roomInp = document.getElementById("roomInp");
const btnHost = document.getElementById("btnHost");
const btnJoin = document.getElementById("btnJoin");
const btnReset = document.getElementById("btnReset");
const btnReady = document.getElementById("btnReady");
const btnStartQuiz = document.getElementById("btnStartQuiz");
const lobbyLine = document.getElementById("lobbyLine");
const catGrid = document.getElementById("catGrid");
const selDiff = document.getElementById("selDiff");
const inpRounds = document.getElementById("inpRounds");
const optsPanel = document.getElementById("optsPanel");
const quizPanel = document.getElementById("quizPanel");
const qmeta = document.getElementById("qmeta");
const qtext = document.getElementById("qtext");
const answersEl = document.getElementById("answers");
const revealPanel = document.getElementById("revealPanel");
const finalPanel = document.getElementById("finalPanel");
const leaderBoard = document.getElementById("leaderBoard");
const scoreBoardBody = document.getElementById("scoreBoardBody");
const readyStripHint = document.getElementById("readyStripHint");

let ws = null;
let online = false;
let mySlot = "0";
let imReady = false;
/** @type {any} */
let lastState = null;
let catLabels = new Map();
let timerId = 0;
let prevPhase = "";
let prevQKey = "";
let prevSessionOver = false;
let lastBuiltAnswersQKey = "";

const AC = window.AudioContext || window.webkitAudioContext;
let actx = null;

function ensureAudio() {
  try {
    actx ||= new AC();
    if (actx.state === "suspended") actx.resume();
  } catch {
    /* ignore */
  }
}

function beep(freq, dur, type = "sine", vol = 0.055) {
  try {
    ensureAudio();
    const t0 = actx.currentTime;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g);
    g.connect(actx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  } catch {
    /* ignore */
  }
}

function playSfx(kind) {
  if (kind === "good") {
    beep(480, 0.07, "triangle", 0.06);
    setTimeout(() => beep(720, 0.1, "sine", 0.05), 70);
  } else if (kind === "partial") {
    beep(360, 0.11, "triangle", 0.05);
    setTimeout(() => beep(440, 0.08, "sine", 0.04), 100);
  } else if (kind === "bad") {
    beep(130, 0.18, "sawtooth", 0.045);
  } else if (kind === "whoosh") {
    beep(240, 0.05, "sine", 0.035);
  } else if (kind === "tick") {
    beep(520, 0.04, "square", 0.025);
  }
}

document.addEventListener(
  "pointerdown",
  () => {
    ensureAudio();
  },
  { once: true },
);

try {
  const saved =
    localStorage.getItem("trivia_ws_url") || localStorage.getItem("pong_ws_url") || localStorage.getItem("tanks_ws_url");
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

function refreshReadyButton() {
  const connected = ws && ws.readyState === 1;
  btnReady.disabled = !connected;
  btnReady.setAttribute("aria-pressed", imReady ? "true" : "false");
  btnReady.classList.remove("btn-ready--idle", "btn-ready--off", "btn-ready--on");
  const label = btnReady.querySelector(".btn-ready__label");
  const ico = btnReady.querySelector(".btn-ready__ico");
  if (!connected) {
    btnReady.classList.add("btn-ready--idle");
    if (label) label.textContent = "Ich bin bereit";
    if (ico) ico.textContent = "◎";
    if (readyStripHint) {
      readyStripHint.innerHTML =
        "Mit <strong>Host</strong> oder <strong>Join</strong> verbinden — dann hier <strong>bereit</strong> schalten.";
    }
    return;
  }
  if (imReady) {
    btnReady.classList.add("btn-ready--on");
    if (label) label.textContent = "Bereit ✓ — antippen zum Zurücknehmen";
    if (ico) ico.textContent = "✓";
    if (readyStripHint) {
      readyStripHint.innerHTML =
        "Du bist <strong>bereit</strong>. Sind alle ✓ in der Raumzeile, kann der Host <strong>Quiz starten</strong> wählen.";
    }
  } else {
    btnReady.classList.add("btn-ready--off");
    if (label) label.textContent = "Tippen: Ich bin bereit";
    if (ico) ico.textContent = "○";
    if (readyStripHint) {
      readyStripHint.innerHTML =
        "Alle Spieler müssen <strong>bereit</strong> sein (Status siehst du in der Zeile darunter: ✓ oder …).";
    }
  }
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

function getAnswerModeRadio() {
  const r = document.querySelector('input[name="answerMode"]:checked');
  return r ? r.value : "mcq";
}

function sendOpts() {
  if (!ws || ws.readyState !== 1) return;
  const cats = [];
  catGrid.querySelectorAll('input[type="checkbox"]:checked').forEach((el) => {
    cats.push(el.value);
  });
  ws.send(
    JSON.stringify({
      t: "trivia_opts",
      cats,
      diff: selDiff.value,
      rounds: Number(inpRounds.value) || 10,
      answerMode: getAnswerModeRadio(),
    }),
  );
}

function buildCatGrid(cats) {
  catGrid.innerHTML = "";
  catLabels = new Map((cats || []).map((c) => [c.id, c.label]));
  for (const c of cats || []) {
    const id = `cat_${c.id}`;
    const lab = document.createElement("label");
    lab.innerHTML = `<input type="checkbox" value="${c.id}" id="${id}" /> ${c.label}`;
    catGrid.appendChild(lab);
  }
  catGrid.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("change", sendOpts);
  });
}

function catLabel(id) {
  return catLabels.get(id) || id;
}

function diffLabel(d) {
  if (d === "easy") return "leicht";
  if (d === "medium") return "mittel";
  if (d === "hard") return "schwer";
  return d || "—";
}

function renderScoreboard(s) {
  if (!scoreBoardBody) return;
  const roster = s?.roster;
  if (!roster || !roster.length) {
    scoreBoardBody.innerHTML = `<div class="scorePlaceholder">${online ? "Warte…" : "Offline"}</div>`;
    return;
  }
  const sorted = [...roster].sort((a, b) => (b.score || 0) - (a.score || 0));
  const leadScore = sorted[0]?.score ?? 0;
  scoreBoardBody.innerHTML = sorted
    .map((r) => {
      const isMe = String(r.side) === String(mySlot);
      const isLead = (r.score || 0) === leadScore && leadScore > 0;
      const cls = ["scoreRow", isMe ? "scoreRow--me" : "", isLead ? "scoreRow--lead" : ""].filter(Boolean).join(" ");
      return `<div class="${cls}"><span>${escapeHtml(r.name || "P" + (Number(r.side) + 1))}</span><span class="scoreRow__pts">${r.score ?? 0}</span></div>`;
    })
    .join("");
}

function flashQuiz() {
  if (!quizPanel) return;
  quizPanel.classList.remove("fx-flash");
  void quizPanel.offsetWidth;
  quizPanel.classList.add("fx-flash");
}

function flashConfetti() {
  document.body.classList.remove("fx-confetti");
  void document.body.offsetWidth;
  document.body.classList.add("fx-confetti");
  setTimeout(() => document.body.classList.remove("fx-confetti"), 1200);
}

function syncUiFromState(s) {
  if (!s) return;

  if (s.cats && s.cats.length && catGrid.children.length === 0) buildCatGrid(s.cats);

  if (s.opts) {
    selDiff.value = s.opts.diff || "all";
    inpRounds.value = String(s.opts.rounds ?? 10);
    const am = s.opts.answerMode === "text" ? "text" : "mcq";
    const radio = document.querySelector(`input[name="answerMode"][value="${am}"]`);
    if (radio) radio.checked = true;
    const set = new Set(s.opts.cats || []);
    catGrid.querySelectorAll("input[type=checkbox]").forEach((el) => {
      el.checked = set.size > 0 && set.has(el.value);
    });
  }

  renderScoreboard(s);

  const inQuiz = s.phase === "question" || s.phase === "reveal";
  optsPanel.hidden = inQuiz;
  btnStartQuiz.disabled = !(s.live && !inQuiz);

  quizPanel.hidden = !inQuiz;
  finalPanel.hidden = !s.sessionOver;

  const questionKey = s.phase === "question" && s.q ? `${s.q.id}-${s.q.round}` : "";
  if (s.phase === "question" && s.q && questionKey !== prevQKey) {
    playSfx("whoosh");
    flashQuiz();
  }
  prevQKey = questionKey;

  if (s.phase === "reveal" && prevPhase === "question" && s.reveal) {
    const me = s.reveal.breakdown?.find((b) => String(b.side) === String(mySlot));
    if (me) {
      if (me.ok) {
        playSfx("good");
        flashConfetti();
      } else if (me.pts > 0) playSfx("partial");
      else playSfx("bad");
    }
  }
  prevPhase = s.phase;

  const podiumEl = document.getElementById("podiumSpot");
  if (s.sessionOver && s.roster) {
    const sorted = [...s.roster].sort((a, b) => (b.score || 0) - (a.score || 0));
    const n = sorted.length;
    const myIdx = sorted.findIndex((r) => String(r.side) === String(mySlot));
    const myRank = myIdx >= 0 ? myIdx + 1 : n;
    const justEnded = !prevSessionOver;
    prevSessionOver = true;
    const medals = ["🥇", "🥈", "🥉"];
    if (podiumEl) {
      const top3 = sorted
        .slice(0, 3)
        .map((r, i) => {
          const place = i + 1;
          const isMe = String(r.side) === String(mySlot);
          return `<div class="podium__card podium__card--${place} ${isMe ? "podium__card--me" : ""}"><span class="podium__medal" aria-hidden="true">${medals[i]}</span><span class="podium__name">${escapeHtml(r.name || "P" + (Number(r.side) + 1))}</span><span class="podium__pts">${r.score ?? 0} Pkt</span></div>`;
        })
        .join("");
      podiumEl.innerHTML = `<p class="podium__you">Dein Platz: <strong class="podium__rankNum">${myRank}</strong> <span class="podium__of">von ${n}</span></p><div class="podium__row">${top3}</div>`;
      if (justEnded) {
        podiumEl.classList.remove("podium--in");
        void podiumEl.offsetWidth;
        requestAnimationFrame(() => podiumEl.classList.add("podium--in"));
      }
    }
    leaderBoard.innerHTML = sorted
      .map(
        (r, i) =>
          `<div class="${String(r.side) === String(mySlot) ? "leader__me" : ""}"><span>${i + 1}. ${escapeHtml(r.name || "P" + (Number(r.side) + 1))}</span><span>${r.score ?? 0} Pkt</span></div>`,
      )
      .join("");
  } else {
    prevSessionOver = false;
    if (podiumEl) {
      podiumEl.classList.remove("podium--in");
      podiumEl.innerHTML = "";
    }
  }

  if (s.phase === "question" && s.q) {
    const mode = s.q.mode || "mcq";
    const needFullBuild = questionKey !== lastBuiltAnswersQKey;

    if (needFullBuild) {
      lastBuiltAnswersQKey = questionKey;
      const modePill = mode === "text" ? "Freitext" : "A·B·C·D";
      qmeta.innerHTML = `<span class="pill">${escapeHtml(modePill)}</span><span class="pill">Runde ${s.q.round}/${s.q.totalRounds}</span><span class="pill">${escapeHtml(catLabel(s.q.cat))}</span><span class="pill">${escapeHtml(diffLabel(s.q.diff))}</span><span class="pill timer" id="qTimer">⏱ …</span>`;
      qtext.textContent = s.q.q;
      answersEl.innerHTML = "";

      if (mode === "text") {
        const wrap = document.createElement("div");
        wrap.className = "textAns";
        const inp = document.createElement("input");
        inp.type = "text";
        inp.maxLength = 140;
        inp.placeholder = "Antwort eingeben…";
        inp.autocomplete = "off";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sendText";
        btn.textContent = "Antwort senden";
        const answered = typeof s.myAnswer === "string" && s.myAnswer.length > 0;
        if (answered) {
          inp.value = s.myAnswer;
          inp.disabled = true;
          btn.disabled = true;
        } else {
          btn.addEventListener("click", () => {
            if (!ws || ws.readyState !== 1) return;
            const t = inp.value.trim();
            if (!t) return;
            ws.send(JSON.stringify({ t: "trivia_answer_text", text: t }));
          });
          inp.addEventListener("keydown", (e) => {
            if (e.key === "Enter") btn.click();
          });
        }
        wrap.appendChild(inp);
        wrap.appendChild(btn);
        answersEl.appendChild(wrap);
      } else if (s.q.choices) {
        s.q.choices.forEach((txt, i) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "ans";
          b.textContent = `${String.fromCharCode(65 + i)}) ${txt}`;
          b.dataset.i = String(i);
          const answered = s.myAnswer !== null && s.myAnswer !== undefined;
          if (answered && Number(s.myAnswer) === i) b.classList.add("picked");
          b.disabled = answered;
          b.addEventListener("click", () => {
            if (!ws || ws.readyState !== 1) return;
            ws.send(JSON.stringify({ t: "trivia_answer", i }));
          });
          answersEl.appendChild(b);
        });
      }

      if (timerId) clearInterval(timerId);
      const endsAt = s.q.endsAt;
      let tickedWarn = false;
      const tick = () => {
        const el = document.getElementById("qTimer");
        if (!el) return;
        const left = Math.max(0, endsAt - Date.now());
        el.textContent = `⏱ ${(left / 1000).toFixed(1)}s`;
        if (left < 3200) el.classList.add("timer--warn");
        else el.classList.remove("timer--warn");
        if (left < 3100 && left > 2900 && !tickedWarn) {
          tickedWarn = true;
          playSfx("tick");
        }
      };
      tick();
      timerId = setInterval(tick, 100);
      revealPanel.hidden = true;
      revealPanel.innerHTML = "";
    } else {
      if (mode === "text") {
        const inp = answersEl.querySelector(".textAns input[type=text]");
        const btn = answersEl.querySelector(".textAns .sendText");
        if (inp && btn) {
          const answered = typeof s.myAnswer === "string" && s.myAnswer.length > 0;
          inp.disabled = answered;
          btn.disabled = answered;
          if (answered) inp.value = s.myAnswer;
        }
      } else if (s.q.choices) {
        const answered = s.myAnswer !== null && s.myAnswer !== undefined;
        answersEl.querySelectorAll("button.ans").forEach((b) => {
          const i = Number(b.dataset.i);
          if (!Number.isFinite(i)) return;
          b.disabled = answered;
          b.classList.toggle("picked", answered && Number(s.myAnswer) === i);
        });
      }
    }
  } else {
    if (timerId) clearInterval(timerId);
    timerId = 0;
    if (!inQuiz) {
      lastBuiltAnswersQKey = "";
      answersEl.innerHTML = "";
      qtext.textContent = "";
      qmeta.innerHTML = "";
      revealPanel.hidden = true;
      revealPanel.innerHTML = "";
    }
  }

  if (s.reveal) {
    revealPanel.hidden = false;
    const r = s.reveal;
    let head = "";
    if (r.mode === "text") {
      head = `<h3>Richtige Antwort</h3><p class="revealAns">${escapeHtml(r.correctText || "")}</p>`;
    } else {
      const letter = r.correct != null ? String.fromCharCode(65 + r.correct) : "?";
      head = `<h3>Lösung: ${escapeHtml(letter)}</h3><p class="revealAns">${escapeHtml(r.correctText || "")}</p>`;
    }
    const lines = r.breakdown
      .slice()
      .sort((a, b) => Number(a.side) - Number(b.side))
      .map((b) => {
        const pts = b.pts > 0 ? `+${b.pts}` : "0";
        let extra = "";
        if (r.mode === "text") {
          if (b.pickText) {
            extra = ` — „${escapeHtml(b.pickText.slice(0, 80))}${b.pickText.length > 80 ? "…" : ""}" (~${Math.round((b.similarity || 0) * 100)} % ähnlich)`;
          } else {
            extra = " — keine Antwort";
          }
        } else {
          const pi = b.pick;
          const hasPick = pi !== null && pi !== undefined && Number.isFinite(Number(pi));
          if (hasPick) {
            const n = Number(pi);
            const letter = n >= 0 && n <= 3 ? String.fromCharCode(65 + n) : "?";
            const txt = b.pickText ? escapeHtml(String(b.pickText)) : "";
            extra = txt ? ` — ${letter}: ${txt}` : ` — ${letter}`;
          } else {
            extra = " — keine Antwort";
          }
        }
        let tag = "✗";
        if (b.ok) tag = "✓";
        else if (b.near || (b.pts > 0 && !b.ok)) tag = "≈";
        return `${tag} ${escapeHtml(b.name)}: <strong>${pts}</strong>${extra}`;
      })
      .join("<br>");
    revealPanel.innerHTML = `${head}<div class="revealLines">${lines}</div>`;

    if (r.mode === "mcq" && r.correct != null) {
      const buttons = answersEl.querySelectorAll("button.ans");
      buttons.forEach((btn, i) => {
        btn.disabled = true;
        if (i === r.correct) btn.classList.add("correct");
        else if (Number(s.myAnswer) === i && i !== r.correct) btn.classList.add("wrong");
      });
    }
  }
}

function connect(code) {
  const url = normalizeWsUrl(netUrl.value);
  if (!url) return;
  try {
    localStorage.setItem("trivia_ws_url", url);
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
    ws.send(JSON.stringify({ t: "join", game: "trivia", code: code || "", name: nm }));
    refreshReadyButton();
  });
  ws.addEventListener("close", () => {
    setNetLabel("Offline");
    online = false;
    imReady = false;
    btnHost.disabled = false;
    btnJoin.disabled = false;
    lobbyLine.textContent = "";
    lastState = null;
    prevPhase = "";
    prevQKey = "";
    prevSessionOver = false;
    lastBuiltAnswersQKey = "";
    if (timerId) clearInterval(timerId);
    renderScoreboard(null);
    refreshReadyButton();
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
      lobbyLine.textContent = roster.length
        ? "Raum: " +
          roster.map((r) => `P${Number(r.side) + 1}${r.name ? " " + r.name : ""}:${r.ready ? "✓" : "…"}`).join(" · ")
        : `Verbunden: ${msg.peers || 0}`;
      const me = roster.find((r) => String(r.side) === String(mySlot));
      if (me) imReady = !!me.ready;
      refreshReadyButton();
      return;
    }
    if (msg.t === "joined") {
      roomInp.value = msg.code || "";
      mySlot = String(msg.side ?? "0");
      setNetLabel(`Online · ${msg.code} · Du: P${Number(mySlot) + 1}`, true);
      refreshReadyButton();
      return;
    }
    if (msg.t === "state" && msg.game === "trivia" && msg.s) {
      lastState = msg.s;
      syncUiFromState(msg.s);
      return;
    }
    if (msg.t === "reset") {
      finalPanel.hidden = true;
      quizPanel.hidden = true;
      optsPanel.hidden = false;
      prevPhase = "";
      prevQKey = "";
      prevSessionOver = false;
      lastBuiltAnswersQKey = "";
    }
  });
}

btnHost.addEventListener("click", () => connect(""));
btnJoin.addEventListener("click", () => connect((roomInp.value || "").trim()));

btnReady.addEventListener("click", () => {
  if (!ws || ws.readyState !== 1) return;
  imReady = !imReady;
  ws.send(JSON.stringify({ t: "ready", v: imReady }));
  playSfx(imReady ? "whoosh" : "tick");
  refreshReadyButton();
});

btnStartQuiz.addEventListener("click", () => {
  if (!ws || ws.readyState !== 1) return;
  sendOpts();
  ws.send(JSON.stringify({ t: "trivia_start" }));
});

btnReset.addEventListener("click", () => {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ t: "reset" }));
});

selDiff.addEventListener("change", sendOpts);
inpRounds.addEventListener("change", sendOpts);
document.querySelectorAll('input[name="answerMode"]').forEach((r) => {
  r.addEventListener("change", sendOpts);
});

buildCatGrid([]);
renderScoreboard(null);
refreshReadyButton();

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
