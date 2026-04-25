(() => {
  const netStat = document.getElementById("netStat");
  const nameInp = document.getElementById("name");
  const roomInp = document.getElementById("room");
  const btnHost = document.getElementById("btnHost");
  const btnJoin = document.getElementById("btnJoin");
  const btnStart = document.getElementById("btnStart");
  const btnDraw = document.getElementById("btnDraw");
  const btnPass = document.getElementById("btnPass");
  const topCardEl = document.getElementById("topCard");
  const playersEl = document.getElementById("players");
  const handEl = document.getElementById("hand");
  const hintEl = document.getElementById("hint");
  const turnEl = document.getElementById("turn");
  const dirEl = document.getElementById("dir");
  const deckEl = document.getElementById("deck");

  const colorOv = document.getElementById("colorOv");
  const btnColorCancel = document.getElementById("btnColorCancel");

  const WS_URL = "wss://thomas-projekte.onrender.com";

  let ws = null;
  let online = false;
  let meId = null;
  let roomCode = "";

  let state = null; // public
  let hand = []; // private
  let pendingWild = null; // {cardId}

  function setNetLabel(txt, ok = false) {
    netStat.textContent = txt;
    netStat.style.borderColor = ok ? "rgba(93,255,180,.35)" : "rgba(255,255,255,.14)";
    netStat.style.color = ok ? "rgba(93,255,180,.95)" : "rgba(255,255,255,.85)";
  }

  function loadName() {
    try {
      const n = localStorage.getItem("uno_name_v1") || "";
      if (n) nameInp.value = n;
    } catch {}
    if (!nameInp.value) nameInp.value = "Player" + String((Math.random() * 900 + 100) | 0);
  }
  function saveName() {
    try {
      localStorage.setItem("uno_name_v1", (nameInp.value || "").slice(0, 18));
    } catch {}
  }

  function connect(code) {
    saveName();
    const c = (code || "").trim().toUpperCase();
    roomInp.value = c;
    if (ws) try { ws.close(); } catch {}
    ws = null;
    online = true;
    setNetLabel("Verbinden…");
    hintEl.textContent = "Verbinden…";

    ws = new WebSocket(WS_URL);
    ws.addEventListener("open", () => {
      setNetLabel("Connected", true);
      ws.send(JSON.stringify({ t: "join", game: "uno", code: c, name: nameInp.value }));
    });
    ws.addEventListener("close", () => {
      setNetLabel("Offline");
      online = false;
      meId = null;
      state = null;
      hand = [];
      render();
    });
    ws.addEventListener("error", () => setNetLabel("Fehler"));
    ws.addEventListener("message", (ev) => {
      let msg = null;
      try { msg = JSON.parse(ev.data); } catch {}
      if (!msg) return;
      if (msg.t === "err") { setNetLabel(msg.m || "Fehler"); hintEl.textContent = msg.m || "Fehler"; return; }
      if (msg.t === "joined" && msg.game === "uno") {
        roomCode = msg.code || "";
        roomInp.value = roomCode;
        meId = msg.id || null;
        setNetLabel(`Online · ${roomCode}`, true);
        hintEl.textContent = "Warte auf Start (Host).";
        return;
      }
      if (msg.t === "uno_state") {
        state = msg.s || null;
        hand = Array.isArray(msg.hand) ? msg.hand : [];
        btnStart.disabled = !state?.canStart;
        render();
        return;
      }
      if (msg.t === "uno_hint") {
        hintEl.textContent = msg.m || "";
      }
    });
  }

  function send(obj) {
    if (!ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify(obj));
  }

  function cardLabel(c) {
    if (!c) return "—";
    const col = c.col || "W";
    const v = c.v;
    if (col === "W") return v === "W4" ? "WILD+4" : "WILD";
    return `${col}${v}`;
  }
  function colorName(col) {
    return col === "R" ? "Rot" : col === "G" ? "Grün" : col === "B" ? "Blau" : col === "Y" ? "Gelb" : "Wild";
  }

  function myTurn() {
    if (!state || !meId) return false;
    return state.turnId === meId;
  }

  function openColorPick(cardId) {
    pendingWild = { cardId };
    colorOv.classList.add("show");
    colorOv.setAttribute("aria-hidden", "false");
  }
  function closeColorPick() {
    pendingWild = null;
    colorOv.classList.remove("show");
    colorOv.setAttribute("aria-hidden", "true");
  }

  function render() {
    if (!state) {
      topCardEl.textContent = "—";
      playersEl.innerHTML = "";
      handEl.innerHTML = "";
      turnEl.textContent = "Zug: —";
      dirEl.textContent = "↻";
      deckEl.textContent = "Deck: —";
      btnDraw.disabled = true;
      btnPass.disabled = true;
      return;
    }
    topCardEl.textContent = cardLabel(state.top);
    topCardEl.style.opacity = "1";

    turnEl.textContent = `Zug: ${state.turnName || "—"}`;
    dirEl.textContent = state.dir === -1 ? "↺" : "↻";
    deckEl.textContent = `Deck: ${state.deckN}`;

    btnDraw.disabled = !myTurn() || state.phase !== "play";
    btnPass.disabled = !myTurn() || !state.canPass;

    // players list
    playersEl.innerHTML = "";
    for (const p of (state.players || [])) {
      const row = document.createElement("div");
      row.className = "p" + (p.id === meId ? " me" : "") + (p.id === state.turnId ? " turn" : "");
      row.innerHTML = `<div class=\"name\">${p.name}</div><div class=\"cnt\">${p.n} Karten</div>`;
      playersEl.appendChild(row);
    }

    // hand
    handEl.innerHTML = "";
    for (const c of hand) {
      const el = document.createElement("div");
      const playable = myTurn() && state.phase === "play" && !!c.playable;
      el.className = "hcard" + (playable ? "" : " bad");
      el.textContent = cardLabel(c);
      el.title = playable ? "Spielen" : "Nicht spielbar";
      el.addEventListener("click", () => {
        if (!playable) return;
        if (c.col === "W") return openColorPick(c.id);
        send({ t: "uno_play", id: c.id });
      });
      handEl.appendChild(el);
    }

    hintEl.textContent = state.msg || hintEl.textContent;
  }

  // events
  btnHost.addEventListener("click", () => connect(roomInp.value || ""));
  btnJoin.addEventListener("click", () => {
    const c = (roomInp.value || "").trim();
    if (!c) { setNetLabel("Room fehlt"); return; }
    connect(c);
  });
  btnStart.addEventListener("click", () => send({ t: "uno_start" }));
  btnDraw.addEventListener("click", () => send({ t: "uno_draw" }));
  btnPass.addEventListener("click", () => send({ t: "uno_pass" }));

  btnColorCancel.addEventListener("click", closeColorPick);
  colorOv.addEventListener("click", (e) => { if (e.target === colorOv) closeColorPick(); });
  document.querySelectorAll(".colors [data-c]").forEach((b) => {
    b.addEventListener("click", () => {
      if (!pendingWild) return;
      const col = b.getAttribute("data-c");
      closeColorPick();
      send({ t: "uno_play", id: pendingWild.cardId, col });
    });
  });

  nameInp.addEventListener("change", saveName);

  // auto-connect via ?room=
  loadName();
  try {
    const p = new URLSearchParams(location.search);
    const roomP = p.get("room");
    if (roomP) {
      roomInp.value = roomP.toUpperCase();
      connect(roomInp.value);
    }
  } catch {}

  // quick copy/share: tap netStat copies link if connected
  netStat.style.cursor = "pointer";
  netStat.title = "Tippen: Link kopieren";
  netStat.addEventListener("click", async () => {
    if (!roomCode) return;
    const url = new URL(location.href);
    url.searchParams.set("room", roomCode);
    try {
      await navigator.clipboard.writeText(url.toString());
      hintEl.textContent = "Link kopiert!";
    } catch {
      hintEl.textContent = "Kopieren ging nicht (Browser).";
    }
  });
})();

