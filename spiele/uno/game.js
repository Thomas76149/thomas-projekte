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

  function unoPk() {
    try {
      let k = sessionStorage.getItem("uno_pk_v1");
      if (!k) {
        k = (typeof crypto !== "undefined" && crypto.randomUUID)
          ? crypto.randomUUID().replace(/-/g, "")
          : "u" + Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem("uno_pk_v1", k);
      }
      return k;
    } catch {
      return "u" + Math.random().toString(36).slice(2, 14);
    }
  }

  function setLobbyJoined(joined) {
    btnJoin.style.display = joined ? "none" : "";
    btnHost.style.display = joined ? "none" : "";
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
      ws.send(JSON.stringify({ t: "join", game: "uno", code: c, name: nameInp.value, pk: unoPk() }));
    });
    ws.addEventListener("close", () => {
      setNetLabel("Offline");
      online = false;
      setLobbyJoined(false);
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
        if (msg.pk) try { sessionStorage.setItem("uno_pk_v1", String(msg.pk)); } catch {}
        setNetLabel(`Online · ${roomCode}`, true);
        setLobbyJoined(true);
        hintEl.textContent = "Warte auf Start (Host).";
        render();
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
  /** CSS-Klasse für Kartenfarbe (Wild oben: aktive Farbe aus state.curCol) */
  function uFaceClass(card, isTopPile) {
    if (!card) return "u-w";
    if (card.col === "W") {
      const cc = isTopPile && state && ["R", "G", "B", "Y"].includes(state.curCol) ? state.curCol : null;
      if (cc) return "u-" + ({ R: "r", G: "g", B: "b", Y: "y" }[cc] || "w");
      return "u-w";
    }
    return "u-" + ({ R: "r", G: "g", B: "b", Y: "y" }[card.col] || "w");
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
      topCardEl.className = "cardBig";
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
    topCardEl.className = "cardBig " + uFaceClass(state.top, true);
    topCardEl.style.opacity = "1";

    turnEl.textContent = `Zug: ${state.turnName || "—"}`;
    dirEl.textContent = state.dir === -1 ? "↺" : "↻";
    deckEl.textContent = `Deck: ${state.deckN}`;

    const inPlay = state.phase === "play";
    btnDraw.disabled = !myTurn() || !inPlay;
    btnPass.disabled = !myTurn() || !state.canPass;

    // players list
    playersEl.innerHTML = "";
    for (const p of (state.players || [])) {
      const row = document.createElement("div");
      row.className = "p"
        + (p.id === meId ? " me" : "")
        + (p.id === state.turnId ? " turn" : "")
        + (p.offline ? " offline" : "");
      row.innerHTML = `<div class=\"name\">${p.name}${p.offline ? " · offline" : ""}</div><div class=\"cnt\">${p.n} Karten</div>`;
      playersEl.appendChild(row);
    }

    // hand
    handEl.innerHTML = "";
    for (const c of hand) {
      const el = document.createElement("div");
      const playable = myTurn() && inPlay && !!c.playable;
      el.className = "hcard " + uFaceClass(c, false) + (playable ? "" : " bad");
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

