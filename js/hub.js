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

  function isMobileLike() {
    try {
      // iPadOS meldet sich teils als Mac; pointer+touch ist hier zuverlässiger.
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
    // 1) URL override: ?filter=mobile
    try {
      const p = new URLSearchParams(location.search);
      const f = (p.get("filter") || "").toLowerCase().trim();
      if (f) return f;
    } catch {}
    // 2) last chosen
    try {
      const last = (localStorage.getItem(FILTER_LS_KEY) || "").toLowerCase().trim();
      if (last) return last;
    } catch {}
    // 3) auto on mobile-like devices
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

    for (const it of sorted) {
      const tags = normalizeTags(it.tags);
      const a = el("a", {
        class: `tile${it.big ? " big" : ""}`,
        href: it.href || "#",
        "data-tags": tags.join(" "),
      });
      a.innerHTML = `
        <div class="tile__emoji" aria-hidden="true">${it.emoji || "🎲"}</div>
        <div class="tile__label">${it.label || ""}</div>
        <h2 class="tile__title">${it.title || "Untitled"}</h2>
        <p class="tile__desc">${it.desc || ""}</p>
        <div class="tile__go">${tags.includes("test") || tags.includes("tool") ? "Öffnen →" : "Spielen →"}</div>
      `;

      const sec = (it.section || (tags.includes("test") || tags.includes("tool") ? "tests" : "games")).toLowerCase();
      if (sec === "tests") gridTests.appendChild(a);
      else if (sec === "online") gridOnline.appendChild(a);
      else gridGames.appendChild(a);
    }
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
    if (countLine) countLine.textContent = shown ? `${shown} Treffer` : "Keine Treffer.";
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
})();

