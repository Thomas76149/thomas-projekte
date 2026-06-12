(() => {
  const items = Array.isArray(window.THOMASFUN_ITEMS) ? window.THOMASFUN_ITEMS : [];

  const q = document.getElementById("q");
  const btnClear = document.getElementById("btnClear");
  const chips = [...document.querySelectorAll("[data-filter]")];
  const countLine = document.getElementById("countLine");

  const secGames = document.getElementById("secGames");
  const secOnline = document.getElementById("secOnline");
  const secTests = document.getElementById("secTests");
  const gridGames = document.getElementById("gridGames");
  const gridOnline = document.getElementById("gridOnline");
  const gridTests = document.getElementById("gridTests");

  let filter = "all";
  const FILTER_LS_KEY = "hub_filter_v1";

  /* Kuratierte Akzent-Palette: bunt, aber abgestimmt (kein Neon-Chaos).
     Jede Kachel bekommt stabil eine Farbe anhand ihres Titels. */
  const PALETTE = [
    ["#ff7a1a", "rgba(255,122,26,.38)"],
    ["#ff5d73", "rgba(255,93,115,.38)"],
    ["#c46bff", "rgba(196,107,255,.38)"],
    ["#5b8cff", "rgba(91,140,255,.38)"],
    ["#22d3ee", "rgba(34,211,238,.38)"],
    ["#2dd4a7", "rgba(45,212,167,.38)"],
    ["#f5c542", "rgba(245,197,66,.38)"],
    ["#ff6a52", "rgba(255,106,82,.38)"],
  ];
  function colorFor(str) {
    let h = 0;
    const s = String(str || "");
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  function isMobileLike() {
    try {
      const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      const small = Math.min(window.innerWidth || 9999, window.innerHeight || 9999) <= 900;
      const touch = (navigator.maxTouchPoints || 0) > 1;
      return coarse || (touch && small);
    } catch {
      return false;
    }
  }

  function applyFilter(next) {
    filter = next || "all";
    chips.forEach((x) => x.setAttribute("aria-pressed", x.getAttribute("data-filter") === filter ? "true" : "false"));
    try { localStorage.setItem(FILTER_LS_KEY, filter); } catch {}
    apply();
  }

  function initialFilter() {
    try {
      const p = new URLSearchParams(location.search);
      const f = (p.get("filter") || "").toLowerCase().trim();
      if (f) return f;
    } catch {}
    try {
      const last = (localStorage.getItem(FILTER_LS_KEY) || "").toLowerCase().trim();
      if (last) return last;
    } catch {}
    return isMobileLike() ? "mobile" : "all";
  }

  function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else n.setAttribute(k, v);
    }
    for (const c of children) n.appendChild(c);
    return n;
  }

  function normalizeTags(tags) {
    return (tags || []).map((t) => String(t).toLowerCase()).filter(Boolean);
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function render() {
    if (!gridGames || !gridTests || !gridOnline) return;
    gridGames.innerHTML = "";
    gridOnline.innerHTML = "";
    gridTests.innerHTML = "";

    const sorted = [...items].sort((a, b) => {
      const af = normalizeTags(a.tags).includes("featured") ? 1 : 0;
      const bf = normalizeTags(b.tags).includes("featured") ? 1 : 0;
      if (af !== bf) return bf - af;
      const ab = a.big ? 1 : 0;
      const bb = b.big ? 1 : 0;
      if (ab !== bb) return bb - ab;
      return String(a.title || "").localeCompare(String(b.title || ""), "de");
    });

    sorted.forEach((it, idx) => {
      const tags = normalizeTags(it.tags);
      const [c, cg] = colorFor(it.title);
      const a = el("a", {
        class: `tile${it.big ? " big" : ""}`,
        href: it.href || "#",
        "data-tags": tags.join(" "),
        style: `--c:${c};--cg:${cg};--i:${idx}`,
      });
      a.innerHTML = `
        <div class="tile__emoji" aria-hidden="true">${esc(it.emoji) || "🎲"}</div>
        <div class="tile__label">${esc(it.label)}</div>
        <h2 class="tile__title">${esc(it.title) || "Untitled"}</h2>
        <p class="tile__desc">${esc(it.desc)}</p>
        <div class="tile__go">${tags.includes("test") || tags.includes("tool") ? "Öffnen →" : "Spielen →"}</div>
      `;

      const sec = (it.section || (tags.includes("test") || tags.includes("tool") ? "tests" : "games")).toLowerCase();
      if (sec === "tests") gridTests.appendChild(a);
      else if (sec === "online") gridOnline.appendChild(a);
      else gridGames.appendChild(a);
    });
  }

  function apply() {
    const term = (q?.value || "").trim().toLowerCase();
    const tiles = [...document.querySelectorAll(".tile[data-tags]")];
    let shown = 0;
    let shownGames = 0;
    let shownOnline = 0;
    let shownTests = 0;

    for (const t of tiles) {
      const tags = (t.getAttribute("data-tags") || "").toLowerCase();
      const text = (t.innerText || "").toLowerCase();
      const matchTerm = !term || tags.includes(term) || text.includes(term);
      const matchFilter = filter === "all" || tags.includes(filter);
      const ok = matchTerm && matchFilter;
      t.classList.toggle("hidden", !ok);
      if (ok) {
        shown++;
        const sec = (t.closest(".section")?.id || "").toLowerCase();
        if (tags.includes("test") || tags.includes("tool")) shownTests++;
        else if (sec.includes("online")) shownOnline++;
        else shownGames++;
      }
    }

    secGames?.classList.toggle("hidden", shownGames === 0);
    secOnline?.classList.toggle("hidden", shownOnline === 0);
    secTests?.classList.toggle("hidden", shownTests === 0);
    if (countLine) countLine.textContent = shown ? `${shown} ${shown === 1 ? "Treffer" : "Treffer"}` : "Keine Treffer.";
  }

  chips.forEach((c) => {
    c.addEventListener("click", () => {
      applyFilter(c.getAttribute("data-filter") || "all");
    });
  });

  q?.addEventListener("input", apply);
  btnClear?.addEventListener("click", () => {
    if (q) q.value = "";
    applyFilter("all");
    q?.focus();
  });

  render();
  applyFilter(initialFilter());

  /* ============================================================
     Hintergrund-Animation — ruhige „Constellation": driftende
     Punkte mit Linien zu nahen Nachbarn. Bewusst sparsam &
     performant; bei reduced-motion ganz aus.
     ============================================================ */
  (function bgfx() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = document.getElementById("bgfx");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    let W = 0, H = 0, DPR = Math.min(2, window.devicePixelRatio || 1), nodes = [];

    function build() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const n = Math.min(64, Math.round((W * H) / 26000));
      nodes = [];
      for (let i = 0; i < n; i++) {
        nodes.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.16, vy: (Math.random() - 0.5) * 0.16,
          r: Math.random() * 1.4 + 0.6,
        });
      }
    }
    const MAXD = 132, MAXD2 = MAXD * MAXD;
    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (const p of nodes) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < MAXD2) {
            const al = (1 - d2 / MAXD2) * 0.16;
            ctx.strokeStyle = `rgba(255,160,90,${al})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = "rgba(255,180,120,0.35)";
      for (const p of nodes) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill(); }
      requestAnimationFrame(frame);
    }
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { DPR = Math.min(2, window.devicePixelRatio || 1); build(); }, 180); });
    build();
    requestAnimationFrame(frame);
  })();
})();
