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

let ws = null;
let online = false;
let mySlot = "0";
let imReady = false;
/** @type {any} */
let lastState = null;
let catLabels = new Map();
let timerId = 0;

try {
  const saved = localStorage.getItem("trivia_ws_url") || localStorage.getItem("pong_ws_url") || localStorage.getItem("tanks_ws_url");
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

function syncUiFromState(s) {
  if (!s) return;

  if (s.cats && s.cats.length && catGrid.children.length === 0) buildCatGrid(s.cats);

  if (s.opts) {
    selDiff.value = s.opts.diff || "all";
    inpRounds.value = String(s.opts.rounds ?? 10);
    const set = new Set(s.opts.cats || []);
    catGrid.querySelectorAll("input[type=checkbox]").forEach((el) => {
      el.checked = set.size > 0 && set.has(el.value);
    });
  }

  const inQuiz = s.phase === "question" || s.phase === "reveal";
  optsPanel.hidden = inQuiz;
  btnStartQuiz.disabled = !(s.live && !inQuiz);

  quizPanel.hidden = !inQuiz;
  finalPanel.hidden = !s.sessionOver;

  if (s.sessionOver && s.roster) {
    const sorted = [...s.roster].sort((a, b) => (b.score || 0) - (a.score || 0));
    leaderBoard.innerHTML = sorted
      .map(
        (r, i) =>
          `<div><span>${i + 1}. ${r.name || "P" + (Number(r.side) + 1)}</span><span>${r.score ?? 0} Pkt</span></div>`,
      )
      .join("");
  }

  if (s.q) {
    qmeta.innerHTML = `<span class="pill">Runde ${s.q.round}/${s.q.totalRounds}</span><span class="pill">${catLabel(s.q.cat)}</span><span class="pill">${diffLabel(s.q.diff)}</span><span class="pill timer" id="qTimer">⏱ …</span>`;
    qtext.textContent = s.q.q;
    answersEl.innerHTML = "";
    s.q.choices.forEach((txt, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ans";
      b.textContent = `${String.fromCharCode(65 + i)}) ${txt}`;
      b.dataset.i = String(i);
      const answered = s.myAnswer !== null && s.myAnswer !== undefined;
      if (answered && s.myAnswer === i) b.classList.add("picked");
      b.disabled = answered;
      b.addEventListener("click", () => {
        if (!ws || ws.readyState !== 1) return;
        ws.send(JSON.stringify({ t: "trivia_answer", i }));
      });
      answersEl.appendChild(b);
    });
    if (timerId) clearInterval(timerId);
    const endsAt = s.q.endsAt;
    const tick = () => {
      const el = document.getElementById("qTimer");
      if (!el) return;
      const left = Math.max(0, endsAt - Date.now());
      el.textContent = `⏱ ${(left / 1000).toFixed(1)}s`;
    };
    tick();
    timerId = setInterval(tick, 100);
    revealPanel.hidden = true;
    revealPanel.innerHTML = "";
  } else {
    if (timerId) clearInterval(timerId);
    timerId = 0;
    if (!inQuiz) {
      answersEl.innerHTML = "";
      qtext.textContent = "";
      qmeta.innerHTML = "";
      revealPanel.hidden = true;
      revealPanel.innerHTML = "";
    }
  }

  if (s.reveal) {
    revealPanel.hidden = false;
    const correct = s.reveal.correct;
    const lines = s.reveal.breakdown
      .map((b) => {
        const mark = b.ok ? "✓" : "✗";
        const pts = b.pts > 0 ? `+${b.pts}` : "0";
        return `${mark} ${b.name}: ${pts}`;
      })
      .join("<br>");
    revealPanel.innerHTML = `<h3>Lösung: ${String.fromCharCode(65 + correct)}</h3><div>${lines}</div>`;

    const buttons = answersEl.querySelectorAll("button.ans");
    buttons.forEach((btn, i) => {
      btn.disabled = true;
      if (i === correct) btn.classList.add("correct");
      else if (s.myAnswer === i && i !== correct) btn.classList.add("wrong");
    });
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
  });
  ws.addEventListener("close", () => {
    setNetLabel("Offline");
    online = false;
    imReady = false;
    btnReady.textContent = "Ready";
    btnHost.disabled = false;
    btnJoin.disabled = false;
    lobbyLine.textContent = "";
    lastState = null;
    if (timerId) clearInterval(timerId);
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
      btnReady.textContent = imReady ? "Nicht ready" : "Ready";
      return;
    }
    if (msg.t === "joined") {
      roomInp.value = msg.code || "";
      mySlot = String(msg.side ?? "0");
      setNetLabel(`Online · ${msg.code} · Du: P${Number(mySlot) + 1}`, true);
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
    }
  });
}

btnHost.addEventListener("click", () => connect(""));
btnJoin.addEventListener("click", () => connect((roomInp.value || "").trim()));

btnReady.addEventListener("click", () => {
  if (!ws || ws.readyState !== 1) return;
  imReady = !imReady;
  ws.send(JSON.stringify({ t: "ready", v: imReady }));
  btnReady.textContent = imReady ? "Nicht ready" : "Ready";
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

buildCatGrid([]);

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
