// ===== Routine — komplette App =====

const el = (id) => document.getElementById(id);
let mode = "login";
let currentUser = null;
let trackers = [];
let currentDate = todayStr();
let currentWeek = todayStr(); // Datum irgendwo in der angezeigten Woche
let fields = [];
let chart = null;
let editingTrackerId = null;
let selectedIcon = null;
let dirty = false; // ungespeicherte Änderungen im Heute-Formular

// ---------- Datums-Helfer ----------
function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function todayStr() { return fmt(new Date()); }
function parseDate(s) { return new Date(s + "T00:00:00"); }
function addDays(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return fmt(d); }
function weekBounds(s) {
  const d = parseDate(s);
  const dow = (d.getDay() + 6) % 7; // Mo=0 … So=6
  const mo = new Date(d); mo.setDate(d.getDate() - dow);
  const su = new Date(mo); su.setDate(mo.getDate() + 6);
  return { from: fmt(mo), to: fmt(su) };
}
function deLabel(s) {
  const d = parseDate(s);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

// ---------- Zahlen-Helfer ----------
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sum = (a) => a.reduce((x, y) => x + y, 0);
const round1 = (n) => Math.round(n * 10) / 10;
function timeToMin(t) { if (!t) return null; const [h, m] = String(t).split(":"); return (+h) * 60 + (+m); }
function minToTime(min) { const h = Math.floor(min / 60), m = Math.round(min % 60); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; }

// ---------- View-Umschaltung ----------
function show(view) {
  el("loading").classList.add("hidden");
  el("auth-view").classList.toggle("hidden", view !== "auth");
  el("app-view").classList.toggle("hidden", view !== "app");
}

// ============================================================
//  AUTH
// ============================================================
function msg(text, ok = false) {
  const m = el("auth-msg");
  m.textContent = text;
  m.className = "msg" + (ok ? " ok" : text ? " err" : "");
}
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    mode = tab.dataset.tab;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    el("auth-submit").textContent = mode === "login" ? "Einloggen" : "Konto erstellen";
    el("password").setAttribute("autocomplete", mode === "login" ? "current-password" : "new-password");
    msg("");
  });
});
el("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = el("email").value.trim();
  const password = el("password").value;
  el("auth-submit").disabled = true;
  msg("");
  try {
    if (mode === "signup") {
      const { error } = await db.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin + window.location.pathname },
      });
      if (error) throw error;
      msg("Fast fertig! Bestätige deine E-Mail über den Link im Postfach, dann kannst du dich einloggen.", true);
    } else {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) { msg(fehlerText(err)); }
  finally { el("auth-submit").disabled = false; }
});

// Passwort ein-/ausblenden
el("pw-toggle").addEventListener("click", () => {
  const p = el("password");
  const show = p.type === "password";
  p.type = show ? "text" : "password";
  el("pw-toggle").textContent = show ? "verbergen" : "anzeigen";
});

// Passwort vergessen
el("forgot").addEventListener("click", async () => {
  const email = el("email").value.trim();
  if (!email) { msg("Gib oben zuerst deine E-Mail ein, dann klick nochmal hier."); return; }
  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });
  if (error) msg(fehlerText(error));
  else msg("E-Mail zum Zurücksetzen ist unterwegs – schau ins Postfach.", true);
});
function fehlerText(err) {
  const m = (err && err.message) || "Unbekannter Fehler.";
  if (m.includes("Invalid login")) return "E-Mail oder Passwort falsch.";
  if (m.includes("Email not confirmed")) return "Bitte zuerst die E-Mail bestätigen (Link im Postfach).";
  if (m.includes("already registered")) return "Diese E-Mail ist schon registriert – log dich einfach ein.";
  if (m.includes("at least 6")) return "Passwort muss mindestens 6 Zeichen haben.";
  return m;
}
el("logout").addEventListener("click", () => { if (confirmDiscard()) db.auth.signOut(); });

// ============================================================
//  NAVIGATION
// ============================================================
const VIEWS = ["heute", "woche", "verlauf", "tracker", "mehr"];
// Schutz vor Datenverlust: nur nachfragen, wenn wirklich ungespeicherte Änderungen da sind
function confirmDiscard() {
  if (!dirty) return true;
  return confirm("Du hast ungespeicherte Änderungen. Wirklich verwerfen?");
}
window.addEventListener("beforeunload", (e) => {
  if (dirty) { e.preventDefault(); e.returnValue = ""; }
});
// Strg/Cmd+S speichert den Tag (nur im Heute-Tab)
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    if (!el("app-view").classList.contains("hidden") && !el("view-heute").classList.contains("hidden")) {
      e.preventDefault();
      saveEintrag();
    }
  }
});
document.querySelectorAll(".nav-btn").forEach((b) => {
  b.addEventListener("click", () => openView(b.dataset.view));
});
function openView(view) {
  if (!confirmDiscard()) return;
  document.querySelectorAll(".nav-btn").forEach((x) => x.classList.toggle("active", x.dataset.view === view));
  VIEWS.forEach((v) => el("view-" + v).classList.toggle("hidden", v !== view));
  if (view === "woche") ladeWoche();
  if (view === "verlauf") initVerlauf();
  if (view === "tracker") renderTrackerList();
}

// ============================================================
//  DATEN LADEN (Bereich mit Werten)
// ============================================================
async function ladeRange(from, to) {
  const { data, error } = await db
    .from("entries")
    .select("entry_date, entry_values(tracker_id, value_bool, value_num, value_time)")
    .gte("entry_date", from).lte("entry_date", to).order("entry_date");
  if (error) { console.error(error); return []; }
  return (data || []).map((e) => ({
    date: e.entry_date,
    values: Object.fromEntries((e.entry_values || []).map((v) => [v.tracker_id, v])),
  }));
}

// ============================================================
//  TRACKER laden
// ============================================================
async function ladeTracker() {
  const { data, error } = await db.from("trackers").select("*").order("position");
  if (error) { console.error(error); trackers = []; return; }
  trackers = data;
}

// ============================================================
//  HEUTE — Tageseintrag
// ============================================================
el("date-prev").addEventListener("click", () => gotoDate(addDays(currentDate, -1)));
el("date-next").addEventListener("click", () => gotoDate(addDays(currentDate, 1)));
el("date-today").addEventListener("click", () => gotoDate(todayStr()));
el("date-input").addEventListener("change", (e) => gotoDate(e.target.value));
function gotoDate(date) {
  if (!confirmDiscard()) { el("date-input").value = currentDate; return; }
  el("date-input").value = date; ladeEintrag(date);
}

async function ladeEintrag(date) {
  currentDate = date;
  setDateHeading(date);
  saveMsg("");
  const { data: entry } = await db.from("entries").select("id").eq("entry_date", date).maybeSingle();
  const map = {};
  if (entry) {
    const { data: vals } = await db.from("entry_values").select("*").eq("entry_id", entry.id);
    (vals || []).forEach((v) => (map[v.tracker_id] = v));
  }
  renderForm(map);
}

function renderForm(map) {
  const form = el("entry-form");
  form.innerHTML = "";
  fields = [];
  dirty = false; // frisch geladen = sauber
  const active = trackers.filter((t) => t.active);
  if (!active.length) {
    el("today-progress").classList.add("hidden");
    form.innerHTML = `<p class="hint">Noch keine Tracker. Leg unter „Tracker" welche an.</p>`;
    return;
  }
  renderTodayProgress(active, map);
  active.forEach((t) => {
    const v = map[t.id];
    const row = document.createElement("div");
    row.className = "field";
    const label = document.createElement("div");
    label.className = "field-label";
    label.innerHTML = `<span class="ico">${t.icon || "•"}</span> ${escapeHtml(t.name)}` +
      (t.unit ? ` <span class="unit">(${escapeHtml(t.unit)})</span>` : "");
    row.appendChild(label);
    let get;

    if (t.type === "boolean") {
      let state = v ? v.value_bool === true : false;
      const seg = document.createElement("div"); seg.className = "seg";
      const bNein = mkSeg("Nein", state === false);
      const bJa = mkSeg("Ja", state === true);
      bNein.onclick = () => { state = false; setSeg(bNein, bJa); dirty = true; };
      bJa.onclick = () => { state = true; setSeg(bJa, bNein); dirty = true; };
      seg.append(bNein, bJa); row.appendChild(seg);
      get = () => ({ value_bool: state });

    } else if (t.type === "scale") {
      let sel = v && v.value_num != null ? Number(v.value_num) : null;
      const wrap = document.createElement("div"); wrap.className = "scale";
      const btns = [];
      const paint = () => btns.forEach((b, idx) => {
        const val = idx + 1;
        b.classList.toggle("on", sel === val);
        b.classList.toggle("lit", sel != null && val <= sel);
      });
      for (let i = 1; i <= 10; i++) {
        const b = document.createElement("button");
        b.type = "button"; b.className = "scale-btn"; b.textContent = i;
        b.onclick = () => { sel = i; paint(); dirty = true; };
        btns.push(b); wrap.appendChild(b);
      }
      paint();
      const ends = document.createElement("div"); ends.className = "scale-ends";
      ends.innerHTML = "<span>niedrig</span><span>hoch</span>";
      const box = document.createElement("div"); box.className = "scale-box";
      box.append(wrap, ends);
      row.appendChild(box);
      get = () => (sel == null ? null : { value_num: sel });

    } else if (t.type === "number") {
      const inp = document.createElement("input");
      inp.type = "number"; inp.step = "any"; inp.inputMode = "decimal"; inp.className = "fi"; inp.placeholder = t.unit || "";
      if (v && v.value_num != null) inp.value = v.value_num;
      row.appendChild(inp);
      get = () => (inp.value === "" ? null : { value_num: parseFloat(inp.value) });

    } else if (t.type === "time") {
      const inp = document.createElement("input");
      inp.type = "time"; inp.className = "fi";
      if (v && v.value_time) inp.value = String(v.value_time).slice(0, 5);
      row.appendChild(inp);
      get = () => (inp.value === "" ? null : { value_time: inp.value });

    } else {
      const ta = document.createElement("textarea");
      ta.className = "fi"; ta.rows = t.name.toLowerCase().includes("reflex") ? 3 : 2;
      if (v && v.value_text) ta.value = v.value_text;
      // automatisch mitwachsen beim Tippen
      const grow = () => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; };
      ta.style.overflow = "hidden";
      ta.addEventListener("input", grow);
      row.appendChild(ta);
      requestAnimationFrame(grow);
      get = () => (ta.value.trim() === "" ? null : { value_text: ta.value.trim() });
    }
    fields.push({ tracker_id: t.id, get });
    form.appendChild(row);
  });
}
function mkSeg(text, on) { const b = document.createElement("button"); b.type = "button"; b.className = "seg-btn" + (on ? " on" : ""); b.textContent = text; return b; }
function setSeg(on, off) { on.classList.add("on"); off.classList.remove("on"); }

el("save-entry").addEventListener("click", saveEintrag);
el("entry-form").addEventListener("input", () => { dirty = true; });
async function saveEintrag() {
  el("save-entry").disabled = true;
  saveMsg("Speichere…");
  try {
    const { data: entry, error: e1 } = await db.from("entries")
      .upsert({ user_id: currentUser.id, entry_date: currentDate }, { onConflict: "user_id,entry_date" })
      .select("id").single();
    if (e1) throw e1;
    const toUpsert = [], toDelete = [];
    fields.forEach((f) => {
      const val = f.get();
      if (val == null) toDelete.push(f.tracker_id);
      else toUpsert.push({ entry_id: entry.id, tracker_id: f.tracker_id, user_id: currentUser.id, ...val });
    });
    if (toUpsert.length) {
      const { error: e2 } = await db.from("entry_values").upsert(toUpsert, { onConflict: "entry_id,tracker_id" });
      if (e2) throw e2;
    }
    if (toDelete.length) {
      const { error: e3 } = await db.from("entry_values").delete().eq("entry_id", entry.id).in("tracker_id", toDelete);
      if (e3) throw e3;
    }
    saveMsg("");
    toast("Gespeichert ✓");
    await ladeEintrag(currentDate); // Fortschritt aktualisieren
    renderStreakChips();            // Serien könnten sich geändert haben
  } catch (err) { saveMsg("Fehler: " + (err.message || err), "err"); }
  finally { el("save-entry").disabled = false; }
}
let saveMsgTimer = null;
function saveMsg(text, cls = "") {
  const m = el("save-msg");
  m.textContent = text;
  m.className = "msg " + cls;
  clearTimeout(saveMsgTimer);
  if (cls === "ok") saveMsgTimer = setTimeout(() => { m.textContent = ""; m.className = "msg"; }, 2500);
}

// Freundliche Datums-Überschrift (Heute / Gestern / Wochentag)
function setDateHeading(date) {
  const h = el("date-heading");
  const wd = parseDate(date).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
  let prefix = "";
  if (date === todayStr()) prefix = "Heute · ";
  else if (date === addDays(todayStr(), -1)) prefix = "Gestern · ";
  h.textContent = prefix + wd;
}

// Fortschritt: wie viele Tracker sind heute schon eingetragen
function renderTodayProgress(active, map) {
  const box = el("today-progress");
  const filled = active.filter((t) => map[t.id] != null).length;
  const total = active.length;
  const pct = total ? Math.round((filled / total) * 100) : 0;
  box.classList.remove("hidden");
  box.classList.toggle("complete", filled === total && total > 0);
  const done = filled === total;
  box.innerHTML =
    `<div class="tp-bar"><div class="tp-fill" style="width:${pct}%"></div></div>
     <div class="tp-txt"><span>${done ? "Alles eingetragen 🎉" : filled + " von " + total + " eingetragen"}</span><span>${pct}%</span></div>`;
}

// Aktive 🔥-Serien oben im Heute-Tab
async function renderStreakChips() {
  const box = el("streak-chips");
  const bools = trackers.filter((t) => t.active && t.type === "boolean");
  if (!bools.length) { box.classList.add("hidden"); box.innerHTML = ""; return; }
  const rows = await ladeRange(addDays(todayStr(), -59), todayStr());
  const byDate = Object.fromEntries(rows.map((r) => [r.date, r.values]));
  const chips = bools
    .map((t) => ({ t, s: streak(t.id, byDate) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  if (!chips.length) { box.classList.add("hidden"); box.innerHTML = ""; return; }
  box.classList.remove("hidden");
  box.innerHTML = chips
    .map((x) => `<span class="chip">${x.t.icon || "🔥"} ${escapeHtml(x.t.name)} · 🔥 ${x.s}</span>`)
    .join("");
}

// ============================================================
//  WOCHE — Übersicht + Streaks
// ============================================================
el("week-prev").addEventListener("click", () => { currentWeek = addDays(currentWeek, -7); ladeWoche(); });
el("week-next").addEventListener("click", () => { currentWeek = addDays(currentWeek, 7); ladeWoche(); });
el("week-now").addEventListener("click", () => { currentWeek = todayStr(); ladeWoche(); });

async function ladeWoche() {
  const { from, to } = weekBounds(currentWeek);
  el("week-label").textContent = `${deLabel(from)} – ${deLabel(to)}`;
  const box = el("week-stats");
  box.innerHTML = `<p class="hint">lädt…</p>`;

  const weekRows = await ladeRange(from, to);
  // Für Streaks: letzte 60 Tage (relativ zu heute)
  const streakRows = await ladeRange(addDays(todayStr(), -59), todayStr());
  const byDate = Object.fromEntries(streakRows.map((r) => [r.date, r.values]));

  // Aktivitäts-Heatmap: 5 Wochen bis zum Sonntag der angezeigten Woche
  const hmStart = addDays(to, -34);
  const hmRows = await ladeRange(hmStart, to);
  renderHeatmap(Object.fromEntries(hmRows.map((r) => [r.date, r.values])), hmStart);

  box.innerHTML = "";
  const active = trackers.filter((t) => t.active && t.type !== "text");
  if (!active.length) { box.innerHTML = `<p class="hint">Keine auswertbaren Tracker.</p>`; return; }

  active.forEach((t) => {
    const a = aggregate(t, weekRows);
    const card = document.createElement("div");
    card.className = "stat-card";
    let extra = "";
    if (t.type === "boolean") {
      const s = streak(t.id, byDate);
      if (s > 0) extra = `<span class="streak">🔥 ${s}</span>`;
    }
    let bar = "";
    if (a.ratio != null) {
      const pct = Math.min(100, Math.round(a.ratio * 100));
      bar = `<div class="goalbar"><div class="goalbar-fill" style="width:${pct}%"></div></div>
             <div class="goal-txt">Ziel: ${pct}%</div>`;
    }
    card.innerHTML =
      `<div class="stat-top"><span class="ico">${t.icon || "•"}</span><span class="stat-name">${escapeHtml(t.name)}</span>${extra}</div>
       <div class="stat-main">${a.main}</div>
       <div class="stat-sub">${a.sub || ""}</div>${bar}`;
    card.style.cursor = "pointer";
    card.title = "Im Verlauf ansehen";
    card.onclick = () => { openView("verlauf"); el("chart-tracker").value = t.id; renderChart(); };
    box.appendChild(card);
  });
}

function aggregate(t, rows) {
  const vals = rows.map((r) => r.values[t.id]).filter(Boolean);
  if (t.type === "boolean") {
    const c = vals.filter((v) => v.value_bool === true).length;
    return { main: `${c} <span class="dim">/ 7</span>`, sub: "Tage", ratio: t.target ? c / t.target : null };
  }
  if (t.type === "scale") {
    const n = vals.map((v) => Number(v.value_num)).filter((x) => !isNaN(x));
    if (!n.length) return { main: "–", sub: "keine Daten" };
    return { main: `Ø ${round1(avg(n))}`, sub: "von 10" };
  }
  if (t.type === "number") {
    const n = vals.map((v) => Number(v.value_num)).filter((x) => !isNaN(x));
    if (!n.length) return { main: "–", sub: "keine Daten" };
    const u = t.unit ? " " + t.unit : "";
    return { main: `Ø ${round1(avg(n))}${u}`, sub: `Σ ${round1(sum(n))}${u}`, ratio: t.target ? sum(n) / t.target : null };
  }
  if (t.type === "time") {
    const m = vals.map((v) => timeToMin(v.value_time)).filter((x) => x != null);
    if (!m.length) return { main: "–", sub: "keine Daten" };
    return { main: `Ø ${minToTime(avg(m))}`, sub: "Uhr" };
  }
  return { main: "–" };
}

function renderHeatmap(byDate, start) {
  const wrap = el("week-heatmap");
  const today = todayStr();
  let html = "";
  for (let i = 0; i < 35; i++) {
    const k = addDays(start, i);
    const cnt = byDate[k] ? Object.keys(byDate[k]).length : 0;
    const lvl = cnt === 0 ? 0 : cnt <= 1 ? 1 : cnt <= 3 ? 2 : cnt <= 5 ? 3 : 4;
    const future = k > today ? " future" : "";
    const isToday = k === today ? " today" : "";
    html += `<div class="hm-cell l${lvl}${future}${isToday}" title="${deLabel(k)}: ${cnt} eingetragen"></div>`;
  }
  wrap.innerHTML = `<div class="hm-grid">${html}</div>`;
}

function streak(trackerId, byDate) {
  let s = 0;
  let d = new Date();
  const todayKey = fmt(d);
  const todayVal = byDate[todayKey] && byDate[todayKey][trackerId];
  if (!(todayVal && todayVal.value_bool === true)) {
    if (todayVal && todayVal.value_bool === false) return 0; // heute bewusst "Nein"
    d.setDate(d.getDate() - 1); // heute noch offen → ab gestern zählen
  }
  while (true) {
    const k = fmt(d);
    const v = byDate[k] && byDate[k][trackerId];
    if (v && v.value_bool === true) { s++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return s;
}

// ============================================================
//  VERLAUF — Charts
// ============================================================
function initVerlauf() {
  const sel = el("chart-tracker");
  const prev = sel.value;
  sel.innerHTML = "";
  trackers.filter((t) => t.active && t.type !== "text").forEach((t) => {
    const o = document.createElement("option");
    o.value = t.id; o.textContent = `${t.icon || "•"} ${t.name}`;
    sel.appendChild(o);
  });
  if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
  if (!sel.options.length) {
    if (chart) { chart.destroy(); chart = null; }
    el("chart-empty").textContent = "Noch keine auswertbaren Tracker – leg im Tracker-Tab welche an.";
    el("chart-empty").classList.remove("hidden");
    return;
  }
  el("chart-empty").textContent = "Für diesen Zeitraum gibt es noch keine Daten.";
  renderChart();
}
el("chart-tracker").addEventListener("change", renderChart);
el("chart-range").addEventListener("change", renderChart);

async function renderChart() {
  const t = trackers.find((x) => x.id === el("chart-tracker").value);
  if (!t) { if (chart) { chart.destroy(); chart = null; } return; }
  const days = parseInt(el("chart-range").value, 10);
  const from = addDays(todayStr(), -(days - 1));
  const rows = await ladeRange(from, todayStr());
  const byDate = Object.fromEntries(rows.map((r) => [r.date, r.values]));

  const labels = [], data = [];
  for (let i = 0; i < days; i++) {
    const k = addDays(from, i);
    labels.push(deLabel(k));
    const v = byDate[k] && byDate[k][t.id];
    data.push(valForChart(t, v));
  }
  const hasData = data.some((x) => x != null);
  el("chart-empty").classList.toggle("hidden", hasData);
  drawChart(t, labels, data);
}
function valForChart(t, v) {
  if (!v) return null;
  if (t.type === "time") return timeToMin(v.value_time);
  if (t.type === "boolean") return v.value_bool ? 1 : 0;
  return v.value_num != null ? Number(v.value_num) : null;
}
function drawChart(t, labels, data) {
  const ctx = el("chart-canvas");
  if (chart) chart.destroy();
  const accent = getCss("--accent");
  const grid = getCss("--border");
  const dim = getCss("--text-dim");
  const isTime = t.type === "time";
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: t.name, data,
        borderColor: accent, backgroundColor: accent + "33",
        borderWidth: 2, pointRadius: 2, pointBackgroundColor: accent,
        tension: 0.25, spanGaps: true, fill: true,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => (isTime ? minToTime(c.parsed.y) : c.parsed.y) } },
      },
      scales: {
        x: { ticks: { color: dim, maxTicksLimit: 8 }, grid: { color: grid } },
        y: {
          ticks: { color: dim, callback: (v) => (isTime ? minToTime(v) : v) },
          grid: { color: grid },
          min: t.type === "scale" ? 0 : undefined, max: t.type === "scale" ? 10 : undefined,
        },
      },
    },
  });
}
function getCss(name) { return getComputedStyle(document.body).getPropertyValue(name).trim(); }

// ============================================================
//  TRACKER-VERWALTUNG (CRUD)
// ============================================================
function renderTrackerList() {
  const list = el("tracker-list");
  list.innerHTML = "";
  const typLabel = { boolean: "Ja/Nein", number: "Zahl", scale: "Skala 1–10", time: "Uhrzeit", text: "Text" };
  trackers.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = "track-item" + (t.active ? "" : " off");
    li.innerHTML =
      `<span class="ico">${t.icon || "•"}</span>
       <span class="tname">${escapeHtml(t.name)}</span>
       <span class="ttype">${typLabel[t.type]}${t.unit ? " · " + escapeHtml(t.unit) : ""}${t.target ? " · Ziel " + t.target : ""}</span>
       <span class="track-actions">
         <button class="mini" data-act="up"     title="hoch"    ${i === 0 ? "disabled" : ""}>▲</button>
         <button class="mini" data-act="down"   title="runter"  ${i === trackers.length - 1 ? "disabled" : ""}>▼</button>
         <button class="mini" data-act="toggle" title="${t.active ? "ausblenden" : "einblenden"}">${t.active ? "👁" : "🚫"}</button>
         <button class="mini" data-act="edit"   title="bearbeiten">✏️</button>
         <button class="mini danger" data-act="del" title="löschen">🗑</button>
       </span>`;
    li.querySelector('[data-act="up"]').onclick = () => moveTracker(i, -1);
    li.querySelector('[data-act="down"]').onclick = () => moveTracker(i, 1);
    li.querySelector('[data-act="toggle"]').onclick = () => toggleActive(t);
    li.querySelector('[data-act="edit"]').onclick = () => openTrackerForm(t);
    li.querySelector('[data-act="del"]').onclick = () => deleteTracker(t);
    list.appendChild(li);
  });
}

el("tracker-new").addEventListener("click", () => openTrackerForm(null));
el("tf-cancel").addEventListener("click", closeTrackerForm);
el("tf-type").addEventListener("change", syncTrackerFormFields);
el("tf-save").addEventListener("click", saveTracker);
el("tf-icon-btn").addEventListener("click", () => el("emoji-grid").classList.toggle("hidden"));

function openTrackerForm(t) {
  editingTrackerId = t ? t.id : null;
  el("tf-title").textContent = t ? "Tracker bearbeiten" : "Neuer Tracker";
  el("tf-name").value = t ? t.name : "";
  el("tf-type").value = t ? t.type : "boolean";
  el("tf-unit").value = t && t.unit ? t.unit : "";
  el("tf-target").value = t && t.target != null ? t.target : "";
  selectedIcon = t && t.icon ? t.icon : null;
  updateEmojiBtn();
  el("emoji-grid").classList.add("hidden");
  tfMsg("");
  syncTrackerFormFields();
  el("tracker-form").classList.remove("hidden");
  el("tracker-form").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function closeTrackerForm() { el("tracker-form").classList.add("hidden"); editingTrackerId = null; }
function syncTrackerFormFields() {
  const type = el("tf-type").value;
  el("tf-unit-wrap").style.display = type === "number" ? "" : "none";
  el("tf-target-wrap").style.display = (type === "number" || type === "boolean") ? "" : "none";
}

async function saveTracker() {
  const name = el("tf-name").value.trim();
  if (!name) { tfMsg("Bitte einen Namen eingeben.", "err"); return; }
  const type = el("tf-type").value;
  const unit = type === "number" ? (el("tf-unit").value.trim() || null) : null;
  const targetRaw = el("tf-target").value;
  const target = (type === "number" || type === "boolean") && targetRaw !== "" ? parseFloat(targetRaw) : null;
  const icon = selectedIcon || null;

  const wasEdit = !!editingTrackerId;
  el("tf-save").disabled = true;
  tfMsg("Speichere…");
  try {
    if (editingTrackerId) {
      const { error } = await db.from("trackers").update({ name, type, unit, target, icon }).eq("id", editingTrackerId);
      if (error) throw error;
    } else {
      const pos = trackers.length ? Math.max(...trackers.map((t) => t.position)) + 1 : 1;
      const { error } = await db.from("trackers").insert({ user_id: currentUser.id, name, type, unit, target, icon, position: pos });
      if (error) throw error;
    }
    await ladeTracker();
    renderTrackerList();
    closeTrackerForm();
    toast(wasEdit ? "Tracker aktualisiert ✓" : "Tracker angelegt ✓");
  } catch (err) { tfMsg("Fehler: " + (err.message || err), "err"); }
  finally { el("tf-save").disabled = false; }
}

async function deleteTracker(t) {
  if (!confirm(`„${t.name}" wirklich löschen? Alle bisher eingetragenen Werte dieses Trackers gehen dabei verloren.`)) return;
  const { error } = await db.from("trackers").delete().eq("id", t.id);
  if (error) { alert("Fehler beim Löschen: " + error.message); return; }
  await ladeTracker();
  renderTrackerList();
  toast(t.name + " gelöscht");
}

async function toggleActive(t) {
  const { error } = await db.from("trackers").update({ active: !t.active }).eq("id", t.id);
  if (error) { alert("Fehler: " + error.message); return; }
  await ladeTracker();
  renderTrackerList();
}

async function moveTracker(index, dir) {
  const other = index + dir;
  if (other < 0 || other >= trackers.length) return;
  const a = trackers[index], b = trackers[other];
  // Positionen tauschen
  await db.from("trackers").update({ position: b.position }).eq("id", a.id);
  await db.from("trackers").update({ position: a.position }).eq("id", b.id);
  await ladeTracker();
  renderTrackerList();
}
function tfMsg(text, cls = "") { const m = el("tf-msg"); m.textContent = text; m.className = "msg " + cls; }

// ============================================================
//  MEHR — Theme + Export
// ============================================================
function setTheme(theme) {
  document.body.classList.toggle("light", theme === "light");
  localStorage.setItem("routine-theme", theme);
  document.querySelectorAll("#theme-seg .seg-btn").forEach((b) => b.classList.toggle("on", b.dataset.theme === theme));
  if (chart) renderChart(); // Chart-Farben an Theme anpassen
}
document.querySelectorAll("#theme-seg .seg-btn").forEach((b) => {
  b.addEventListener("click", () => setTheme(b.dataset.theme));
});

el("export-csv").addEventListener("click", exportCSV);
async function exportCSV() {
  const rows = await ladeRange("0001-01-01", "9999-12-31");
  const cols = trackers;
  const header = ["Datum", ...cols.map((c) => c.name)];
  const lines = [header.map(csvEsc).join(",")];
  rows.forEach((r) => {
    const line = [r.date];
    cols.forEach((c) => line.push(csvCell(c, r.values[c.id])));
    lines.push(line.map(csvEsc).join(","));
  });
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "routine-export.csv";
  a.click(); URL.revokeObjectURL(url);
  toast("CSV exportiert ✓");
}
function csvCell(t, v) {
  if (!v) return "";
  if (t.type === "boolean") return v.value_bool ? "Ja" : "Nein";
  if (t.type === "time") return v.value_time ? String(v.value_time).slice(0, 5) : "";
  if (t.type === "text") return v.value_text || "";
  return v.value_num != null ? String(v.value_num) : "";
}
function csvEsc(s) { s = String(s ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

// ============================================================
//  TOAST (schwebende Meldung)
// ============================================================
function toast(text, type = "ok") {
  const wrap = el("toast-wrap");
  if (!wrap) return;
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.textContent = text;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add("in"));
  setTimeout(() => { t.classList.remove("in"); setTimeout(() => t.remove(), 320); }, 2300);
}

// ============================================================
//  EMOJI-PICKER
// ============================================================
const EMOJIS = [
  "🎯","💪","🏃","🚴","🏋️","🧘","🚿","💧","☕","🍎",
  "🥗","🍳","😴","🌅","🌙","⏰","📚","💻","✍️","🎨",
  "🎸","🎮","🧹","💊","🦷","🚶","🧠","❤️","🙏","😊",
  "🔥","🌱","🌳","🚭","🍺","💰","⚽","📝","✅","⭐",
];
function buildEmojiGrid() {
  const g = el("emoji-grid");
  if (!g) return;
  g.innerHTML = "";
  const none = document.createElement("button");
  none.type = "button"; none.className = "emoji-cell none"; none.textContent = "✕"; none.title = "kein Symbol";
  none.onclick = () => { selectedIcon = null; updateEmojiBtn(); g.classList.add("hidden"); };
  g.appendChild(none);
  EMOJIS.forEach((e) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "emoji-cell"; b.textContent = e;
    b.onclick = () => { selectedIcon = e; updateEmojiBtn(); g.classList.add("hidden"); };
    g.appendChild(b);
  });
}
function updateEmojiBtn() {
  const btn = el("tf-icon-btn");
  btn.textContent = selectedIcon || "＋";
  btn.classList.toggle("empty", !selectedIcon);
  el("emoji-grid").querySelectorAll(".emoji-cell").forEach((c) =>
    c.classList.toggle("on", c.textContent === selectedIcon)
  );
}

// ---------- Utils ----------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ============================================================
//  START
// ============================================================
async function initApp(user) {
  currentUser = user;
  el("who").textContent = user.email;
  show("app");
  await ladeTracker();
  currentDate = todayStr();
  currentWeek = todayStr();
  el("date-input").value = currentDate;
  await ladeEintrag(currentDate);
  renderStreakChips();
  openView("heute");
}

// Theme sofort setzen (auch vor Login) + Emoji-Auswahl vorbereiten
setTheme(localStorage.getItem("routine-theme") || "dark");
buildEmojiGrid();

db.auth.onAuthStateChange((event, session) => {
  setTimeout(async () => {
    // Passwort-Reset: nach Klick im E-Mail-Link neues Passwort setzen
    if (event === "PASSWORD_RECOVERY") {
      const np = prompt("Neues Passwort setzen (mind. 6 Zeichen):");
      if (np && np.length >= 6) {
        const { error } = await db.auth.updateUser({ password: np });
        alert(error ? "Fehler: " + error.message : "Passwort geändert ✓");
      }
    }
    if (session) initApp(session.user);
    else show("auth");
  }, 0);
});
