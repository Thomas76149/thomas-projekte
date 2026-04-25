(() => {
  const c = document.getElementById("c");
  const ctx = c.getContext("2d");
  const slotEls = [0, 1, 2].map((i) => document.getElementById(`slot${i}`));
  const btnNew = document.getElementById("btnNew");
  const btnUndo = document.getElementById("btnUndo");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const hintEl = document.getElementById("hint");

  const ov = document.getElementById("ov");
  const ovTitle = document.getElementById("ovTitle");
  const ovText = document.getElementById("ovText");
  const ovAgain = document.getElementById("ovAgain");
  const ovClose = document.getElementById("ovClose");

  // --- Konzept (kurz) ---
  // 10x10 Grid. Unten liegen 3 Shapes. Du platzierst ein Shape aufs Grid.
  // Wenn eine Reihe oder Spalte voll ist, wird sie gelöscht und gibt Punkte.
  // Kein "Fall" wie Tetris: nur platzieren + clearen.

  const N = 10;
  const CELL = c.width / N;
  const BEST_KEY = "blockblast_best_v1";

  const rng = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // --- tiny SFX (WebAudio) ---
  const AC = window.AudioContext || window.webkitAudioContext;
  let actx = null;
  function tone(freq, dur = 0.06, type = "sine", vol = 0.05) {
    try {
      actx ||= new AC();
      if (actx.state === "suspended") actx.resume();
      const t0 = actx.currentTime;
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    } catch {}
  }

  // etwas "sattere" Palette fürs Board (wir machen Highlights im Draw)
  const COLORS = [
    "#22d3ee", // cyan
    "#3af0a8", // mint
    "#ffd76a", // gold
    "#ff8a3d", // orange
    "#b899ff", // purple
  ];

  /** Shapes are list of (x,y) blocks; anchored at (0,0) min. */
  const SHAPES = [
    // singles/lines
    [[0, 0]],
    [[0, 0], [1, 0]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [0, 1]],
    [[0, 0], [0, 1], [0, 2]],
    [[0, 0], [0, 1], [0, 2], [0, 3]],
    // squares
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
    // L / corners
    [[0, 0], [0, 1], [0, 2], [1, 2]],
    [[1, 0], [1, 1], [1, 2], [0, 2]],
    [[0, 0], [1, 0], [0, 1]],
    [[0, 0], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [1, 1]],
    [[1, 0], [0, 1], [1, 1]],
    // T-ish / plus-ish
    [[0, 0], [1, 0], [2, 0], [1, 1]],
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
    // zigzag
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [0, 1], [1, 1]],
  ];

  function loadBest() {
    try { return Number(localStorage.getItem(BEST_KEY) || 0) || 0; } catch { return 0; }
  }
  function saveBest(v) {
    try { localStorage.setItem(BEST_KEY, String(Math.max(0, Math.floor(v)))); } catch {}
  }
  function syncBest() {
    const b = loadBest();
    bestEl.textContent = b ? `Best: ${b}` : "Best: —";
  }

  function showOverlay(title, text) {
    ovTitle.textContent = title;
    ovText.textContent = text;
    ov.classList.add("show");
    ov.setAttribute("aria-hidden", "false");
  }
  function hideOverlay() {
    ov.classList.remove("show");
    ov.setAttribute("aria-hidden", "true");
  }

  /** grid[y][x] = 0 empty, else color index + 1 */
  let grid = [];
  let score = 0;

  /** 3 slots: {cells:[[x,y]], col:string, id:number} or null */
  let tray = [null, null, null];
  let sel = -1; // selected slot index

  // Undo snapshot (one step)
  let undo = null; // {grid, tray, score, sel}

  // Drag state
  let dragging = false;
  let dragFromSlot = -1;
  let pointer = { x: 0, y: 0, down: false };
  let shakeT = 0;

  // FX: pop/particles/clear flash/score popups
  let fx = []; // [{t, kind, ...}]
  let rafFx = 0;
  let lastFx = 0;

  function kickFxLoop() {
    if (rafFx) return;
    lastFx = 0;
    rafFx = requestAnimationFrame(stepFx);
  }
  function stepFx(ts) {
    if (!lastFx) lastFx = ts;
    const dt = Math.min(40, ts - lastFx);
    lastFx = ts;
    const sec = dt / 1000;
    if (shakeT > 0) shakeT = Math.max(0, shakeT - sec);
    for (const p of fx) p.t += sec;
    fx = fx.filter((p) => p.t < (p.life || 0.5));
    draw();
    if (fx.length || shakeT > 0 || dragging || pointer.down) rafFx = requestAnimationFrame(stepFx);
    else { cancelAnimationFrame(rafFx); rafFx = 0; }
  }

  function cloneGrid(g) {
    return g.map((row) => row.slice());
  }
  function snapshotUndo() {
    undo = {
      grid: cloneGrid(grid),
      tray: tray.map((t) => (t ? { cells: t.cells.map((p) => [p[0], p[1]]), col: t.col, id: t.id } : null)),
      score,
      sel,
    };
    btnUndo.disabled = false;
  }
  function applyUndo() {
    if (!undo) return;
    grid = cloneGrid(undo.grid);
    tray = undo.tray.map((t) => (t ? { cells: t.cells.map((p) => [p[0], p[1]]), col: t.col, id: t.id } : null));
    score = undo.score;
    sel = undo.sel;
    undo = null;
    btnUndo.disabled = true;
    renderSlots();
    syncUI();
    draw();
  }

  function makePiece() {
    const shape = SHAPES[(Math.random() * SHAPES.length) | 0];
    const col = COLORS[(Math.random() * COLORS.length) | 0];
    return { cells: shape.map((p) => [p[0], p[1]]), col, id: (Math.random() * 1e9) | 0 };
  }

  function refillTrayIfNeeded() {
    if (tray.every(Boolean)) return;
    if (tray.every((t) => !t)) {
      tray = [makePiece(), makePiece(), makePiece()];
      sel = -1;
      renderSlots();
      return;
    }
  }

  function newGame() {
    grid = Array.from({ length: N }, () => Array(N).fill(0));
    score = 0;
    tray = [makePiece(), makePiece(), makePiece()];
    sel = -1;
    undo = null;
    btnUndo.disabled = true;
    hideOverlay();
    syncUI();
    syncBest();
    renderSlots();
    draw();
  }

  function syncUI() {
    scoreEl.textContent = `Score: ${score}`;
    syncBest();
  }

  function boundsForCells(cells) {
    let maxX = 0, maxY = 0;
    for (const [x, y] of cells) { if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
    return { w: maxX + 1, h: maxY + 1 };
  }

  function canPlace(piece, gx, gy) {
    for (const [dx, dy] of piece.cells) {
      const x = gx + dx, y = gy + dy;
      if (x < 0 || x >= N || y < 0 || y >= N) return false;
      if (grid[y][x]) return false;
    }
    return true;
  }

  function place(piece, gx, gy) {
    const colIdx = COLORS.indexOf(piece.col);
    const v = (colIdx >= 0 ? colIdx : 0) + 1;
    for (const [dx, dy] of piece.cells) {
      const x = gx + dx, y = gy + dy;
      grid[y][x] = v;
      fx.push({ kind: "pop", t: 0, life: 0.22, x, y, col: piece.col });
      for (let i = 0; i < 2; i++) {
        fx.push({
          kind: "dust",
          t: 0,
          life: 0.35 + Math.random() * 0.15,
          x: (x + 0.5) * CELL,
          y: (y + 0.5) * CELL,
          vx: (Math.random() * 2 - 1) * 240,
          vy: (Math.random() * 2 - 1) * 240,
          col: piece.col,
          r: 1.8 + Math.random() * 2.4,
        });
      }
    }
    // base score: each block placed
    score += piece.cells.length;
    const cleared = clearLines();
    if (cleared > 0) {
      // simple bonus: more lines -> more reward
      score += cleared * cleared * 10;
    }
  }

  function clearLines() {
    const fullRows = [];
    const fullCols = [];
    for (let y = 0; y < N; y++) {
      if (grid[y].every((v) => v !== 0)) fullRows.push(y);
    }
    for (let x = 0; x < N; x++) {
      let ok = true;
      for (let y = 0; y < N; y++) if (!grid[y][x]) { ok = false; break; }
      if (ok) fullCols.push(x);
    }
    if (!fullRows.length && !fullCols.length) return 0;

    // clear FX before wiping
    for (const y of fullRows) fx.push({ kind: "clearRow", t: 0, life: 0.35, y });
    for (const x of fullCols) fx.push({ kind: "clearCol", t: 0, life: 0.35, x });

    // clear (row+col together)
    for (const y of fullRows) for (let x = 0; x < N; x++) grid[y][x] = 0;
    for (const x of fullCols) for (let y = 0; y < N; y++) grid[y][x] = 0;
    return fullRows.length + fullCols.length;
  }

  function anyMoveLeft() {
    for (const t of tray) {
      if (!t) continue;
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          if (canPlace(t, x, y)) return true;
        }
      }
    }
    return false;
  }

  function gameOverIfNeeded() {
    if (tray.every((t) => !t)) return;
    if (anyMoveLeft()) return;
    const best = loadBest();
    if (score > best) saveBest(score);
    syncBest();
    tone(140, 0.14, "sawtooth", 0.07);
    showOverlay("Game Over", `Score: ${score} · Best: ${loadBest()}`);
  }

  // --- Drawing ---
  function snapOriginForPieceAtPointer(piece, px, py) {
    const rect = c.getBoundingClientRect();
    const x = (px - rect.left) * (c.width / rect.width);
    const y = (py - rect.top) * (c.height / rect.height);
    if (x < 0 || y < 0 || x >= c.width || y >= c.height) return null;
    const b = boundsForCells(piece.cells);
    const pivotX = (b.w - 1) / 2;
    const pivotY = (b.h - 1) / 2;
    const cx = x / CELL - 0.5;
    const cy = y / CELL - 0.5;
    return {
      x: Math.round(cx - pivotX),
      y: Math.round(cy - pivotY),
    };
  }

  function drawGrid() {
    ctx.clearRect(0, 0, c.width, c.height);
    // bg glow
    const bg = ctx.createRadialGradient(c.width * 0.5, c.height * 0.22, 10, c.width * 0.5, c.height * 0.5, c.width * 0.95);
    bg.addColorStop(0, "rgba(34,211,238,0.14)");
    bg.addColorStop(0.55, "rgba(255,215,106,0.05)");
    bg.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);

    // cell background (statt nur lines)
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const pad = 5;
        const xx = x * CELL + pad;
        const yy = y * CELL + pad;
        const w = CELL - pad * 2;
        const a = 0.10 + ((x + y) % 2) * 0.03;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        roundRect(xx, yy, w, w, 12);
        ctx.fill();
      }
    }

    // filled cells
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const v = grid[y][x];
        if (!v) continue;
        const col = COLORS[(v - 1) % COLORS.length];
        drawBlock(x, y, col, 1);
      }
    }

    // screen shake (tiny)
    if (shakeT > 0) {
      const s = (shakeT / 0.18);
      const dx = (Math.random() * 2 - 1) * 5 * s;
      const dy = (Math.random() * 2 - 1) * 5 * s;
      ctx.save();
      ctx.translate(dx, dy);
    } else {
      ctx.save();
    }

    // FX behind ghost
    drawFx();

    // hover ghost (if dragging/selected)
    const piece = (sel >= 0 && tray[sel]) ? tray[sel] : (dragging && tray[dragFromSlot] ? tray[dragFromSlot] : null);
    if (piece) {
      const org = snapOriginForPieceAtPointer(piece, pointer.x, pointer.y);
      if (org) {
        const ok = canPlace(piece, org.x, org.y);
        for (const [dx, dy] of piece.cells) {
          const x = org.x + dx, y = org.y + dy;
          if (x < 0 || y < 0 || x >= N || y >= N) continue;
          drawBlock(x, y, piece.col, ok ? 0.35 : 0.20, ok ? "rgba(93,255,180,0.6)" : "rgba(255,107,107,0.6)");
        }
      }
    }

    ctx.restore();
  }

  function drawFx() {
    // clear flashes
    for (const p of fx) {
      if (p.kind === "clearRow") {
        const a = 1 - (p.t / p.life);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = a * 0.55;
        ctx.fillStyle = "rgba(93,255,180,1)";
        ctx.fillRect(0, p.y * CELL, c.width, CELL);
        ctx.restore();
      } else if (p.kind === "clearCol") {
        const a = 1 - (p.t / p.life);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = a * 0.55;
        ctx.fillStyle = "rgba(34,211,238,1)";
        ctx.fillRect(p.x * CELL, 0, CELL, c.height);
        ctx.restore();
      }
    }

    // pops + dust
    for (const p of fx) {
      if (p.kind === "pop") {
        const a = 1 - (p.t / p.life);
        const s = 1 + (1 - a) * 0.18;
        const cx = (p.x + 0.5) * CELL;
        const cy = (p.y + 0.5) * CELL;
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = a * 0.8;
        ctx.strokeStyle = p.col;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, (CELL * 0.28) * s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (p.kind === "dust") {
        const a = 1 - (p.t / p.life);
        const sec = p.t;
        const x = p.x + p.vx * sec;
        const y = p.y + p.vy * sec + 220 * sec * sec;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = a * 0.65;
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawBlock(x, y, col, alpha = 1, outline = null) {
    const pad = 5;
    const xx = x * CELL + pad;
    const yy = y * CELL + pad;
    const w = CELL - pad * 2;
    const r = 14;

    // drop shadow (depth)
    ctx.save();
    ctx.globalAlpha = alpha * 0.8;
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 7;
    ctx.fillStyle = "rgba(0,0,0,0.01)";
    roundRect(xx, yy, w, w, r);
    ctx.fill();
    ctx.restore();

    // body
    ctx.save();
    ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(xx, yy, xx, yy + w);
    g.addColorStop(0, "rgba(255,255,255,0.22)");
    g.addColorStop(0.22, col);
    g.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = g;
    roundRect(xx, yy, w, w, r);
    ctx.fill();

    // top highlight stripe
    ctx.globalAlpha = alpha * 0.65;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(xx + 6, yy + 6, w - 12, Math.max(10, w * 0.18), 10);
    ctx.fill();

    // outline + glow for ghost
    ctx.globalAlpha = Math.min(1, alpha * 0.95);
    ctx.lineWidth = 2.2;
    if (outline) {
      ctx.shadowColor = outline;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = outline;
    } else {
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
    }
    roundRect(xx, yy, w, w, r);
    ctx.stroke();
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function pointerToCell(px, py) {
    const rect = c.getBoundingClientRect();
    const x = (px - rect.left) * (c.width / rect.width);
    const y = (py - rect.top) * (c.height / rect.height);
    if (x < 0 || y < 0 || x >= c.width || y >= c.height) return null;
    return { x: Math.floor(x / CELL), y: Math.floor(y / CELL) };
  }

  function renderSlots() {
    for (let i = 0; i < 3; i++) {
      const host = slotEls[i];
      host.innerHTML = "";
      const t = tray[i];
      const mini = document.createElement("canvas");
      mini.width = 220;
      mini.height = 150;
      mini.style.width = "100%";
      mini.style.height = "100%";
      mini.style.borderRadius = "14px";
      mini.style.border = (i === sel) ? "2px solid rgba(93,255,180,.65)" : "1px solid rgba(255,255,255,.10)";
      mini.style.background = "rgba(0,0,0,.10)";
      mini.style.touchAction = "none";
      host.appendChild(mini);

      const mctx = mini.getContext("2d");
      if (!t) {
        mctx.fillStyle = "rgba(180,200,230,.35)";
        mctx.font = "900 14px system-ui,Segoe UI,Roboto";
        mctx.textAlign = "center";
        mctx.fillText("—", mini.width / 2, mini.height / 2 + 6);
        continue;
      }

      const b = boundsForCells(t.cells);
      const size = Math.min(34, Math.floor(Math.min((mini.width - 28) / b.w, (mini.height - 28) / b.h)));
      const offX = Math.floor((mini.width - b.w * size) / 2);
      const offY = Math.floor((mini.height - b.h * size) / 2);

      for (const [dx, dy] of t.cells) {
        const xx = offX + dx * size;
        const yy = offY + dy * size;
        const g = mctx.createLinearGradient(xx, yy, xx + size, yy + size);
        g.addColorStop(0, "rgba(255,255,255,0.22)");
        g.addColorStop(0.2, t.col);
        g.addColorStop(1, "rgba(0,0,0,0.20)");
        mctx.fillStyle = g;
        mctx.strokeStyle = "rgba(255,255,255,0.16)";
        mctx.lineWidth = 2;
        mctx.beginPath();
        const r = 8;
        mctx.moveTo(xx + r, yy);
        mctx.arcTo(xx + size, yy, xx + size, yy + size, r);
        mctx.arcTo(xx + size, yy + size, xx, yy + size, r);
        mctx.arcTo(xx, yy + size, xx, yy, r);
        mctx.arcTo(xx, yy, xx + size, yy, r);
        mctx.closePath();
        mctx.fill();
        mctx.stroke();
      }

      // click select
      host.onclick = () => {
        if (!tray[i]) return;
        sel = (sel === i) ? -1 : i;
        renderSlots();
        draw();
      };

      // drag from slot
      host.onpointerdown = (e) => {
        if (!tray[i]) return;
        dragging = true;
        dragFromSlot = i;
        sel = i; // QoL: beim Ziehen ist das Teil automatisch "selected"
        renderSlots();
        pointer.down = true;
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        kickFxLoop();
        try { host.setPointerCapture(e.pointerId); } catch {}
      };
      host.onpointermove = (e) => {
        if (!dragging) return;
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        draw();
      };
      host.onpointerup = (e) => {
        if (!dragging) return;
        pointer.down = false;
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        attemptDropFromDrag();
        dragging = false;
        dragFromSlot = -1;
        try { host.releasePointerCapture(e.pointerId); } catch {}
        draw();
      };
      host.onpointercancel = () => {
        dragging = false;
        dragFromSlot = -1;
        draw();
      };
    }
  }

  function attemptPlaceSelectedAt(cell) {
    if (sel < 0) return false;
    const piece = tray[sel];
    if (!piece) return false;
    if (!canPlace(piece, cell.x, cell.y)) return false;
    snapshotUndo();
    place(piece, cell.x, cell.y);
    tray[sel] = null;
    sel = -1;
    refillTrayIfNeeded();
    renderSlots();
    syncUI();
    draw();
    gameOverIfNeeded();
    // SFX & juice
    tone(520, 0.05, "triangle", 0.05);
    if (fx.some((p) => p.kind === "clearRow" || p.kind === "clearCol")) {
      tone(880, 0.08, "sine", 0.05);
      shakeT = 0.18;
    }
    kickFxLoop();
    return true;
  }

  function attemptDropFromDrag() {
    if (dragFromSlot < 0) return;
    const piece = tray[dragFromSlot];
    if (!piece) return;
    const org = snapOriginForPieceAtPointer(piece, pointer.x, pointer.y);
    if (!org) return;
    if (!canPlace(piece, org.x, org.y)) { tone(200, 0.06, "square", 0.035); return; }
    snapshotUndo();
    place(piece, org.x, org.y);
    tray[dragFromSlot] = null;
    sel = -1;
    refillTrayIfNeeded();
    renderSlots();
    syncUI();
    draw();
    gameOverIfNeeded();
    tone(560, 0.06, "triangle", 0.055);
    if (fx.some((p) => p.kind === "clearRow" || p.kind === "clearCol")) {
      tone(880, 0.08, "sine", 0.05);
      shakeT = 0.18;
    }
    kickFxLoop();
  }

  function draw() {
    drawGrid();
  }

  // Canvas interaction: tap-to-place
  c.addEventListener("pointerdown", (e) => {
    pointer.down = true;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    try { c.setPointerCapture(e.pointerId); } catch {}
    kickFxLoop();
    draw();
  });
  c.addEventListener("pointermove", (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (pointer.down) draw();
  });
  c.addEventListener("pointerup", (e) => {
    pointer.down = false;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    // Tap-to-place nutzt auch Snap (zentriert)
    const piece = (sel >= 0 && tray[sel]) ? tray[sel] : null;
    if (piece) {
      const org = snapOriginForPieceAtPointer(piece, pointer.x, pointer.y);
      if (org) {
        if (!attemptPlaceSelectedAt(org)) tone(200, 0.06, "square", 0.03);
      }
    }
    try { c.releasePointerCapture(e.pointerId); } catch {}
    draw();
  });
  c.addEventListener("pointercancel", () => { pointer.down = false; draw(); });

  btnNew.addEventListener("click", newGame);
  btnUndo.addEventListener("click", applyUndo);
  ovAgain.addEventListener("click", () => { hideOverlay(); newGame(); });
  ovClose.addEventListener("click", hideOverlay);
  ov.addEventListener("click", (e) => { if (e.target === ov) hideOverlay(); });

  // init
  syncBest();
  newGame();
})();

