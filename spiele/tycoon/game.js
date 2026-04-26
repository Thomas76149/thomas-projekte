/**
 * Fabrik‑Clicker — Klicks, Combo, Upgrades, passives Einkommen, Effekte, localStorage.
 */

const SAVE_KEY = "thomasfun_clicker_v1";
const SOUND_KEY = "thomasfun_clicker_sound";
const COMBO_WINDOW_MS_BASE = 480;
const COMBO_CAP_BASE = 40;

const UPGRADES = [
  {
    id: "hammer",
    name: "Starker Griff",
    desc: "+1 ₡ pro Tap (vor der Combo‑Staffel).",
    baseCost: 25,
    costMul: 1.15,
    tapFlat: 1,
  },
  {
    id: "coffee",
    name: "Kaffeepause",
    desc: "Längeres Combo‑Fenster (+45 ms) und +2 Combo‑Maximum pro Stufe.",
    baseCost: 80,
    costMul: 1.17,
    comboWindow: 45,
    comboCapAdd: 2,
  },
  {
    id: "line",
    name: "Mini‑Band",
    desc: "+3 ₡/s passiv pro Stufe.",
    baseCost: 120,
    costMul: 1.16,
    passive: 3,
  },
  {
    id: "bot",
    name: "Kleiner Bot",
    desc: "+11 ₡/s passiv pro Stufe.",
    baseCost: 550,
    costMul: 1.18,
    passive: 11,
  },
  {
    id: "poster",
    name: "Motivations‑Poster",
    desc: "+7 % passives Einkommen pro Stufe (nur Band + Bot).",
    baseCost: 400,
    costMul: 1.2,
    passiveMult: 0.07,
  },
];

const fmt = (n) => {
  const x = Math.floor(n);
  if (x >= 1e9) return `${(x / 1e9).toFixed(2)}B`;
  if (x >= 1e6) return `${(x / 1e6).toFixed(2)}M`;
  if (x >= 1e4) return `${(x / 1e3).toFixed(1)}k`;
  return String(x);
};

let money = 0;
let totalClicks = 0;
let bestCombo = 0;
let combo = 0;
let lastClickTs = 0;
let passiveAcc = 0;
let levels = Object.fromEntries(UPGRADES.map((u) => [u.id, 0]));
let lastPassiveTs = performance.now();
let savePassiveTimer = 0;

/** @type {{ u: (typeof UPGRADES)[0], title: HTMLElement, buy: HTMLButtonElement, card: HTMLElement }[]} */
let shopRows = [];

let audioCtx = null;

const elMoney = document.getElementById("money");
const elSub = document.getElementById("sub");
const elRate = document.getElementById("rate");
const elCombo = document.getElementById("combo");
const elComboBar = document.getElementById("comboBar");
const tapZone = document.getElementById("tapZone");
const tapRing = document.getElementById("tapRing");
const fxRoot = document.getElementById("fxRoot");
const stage = document.getElementById("stage");
const elUp = document.getElementById("upgrades");
const btnSave = document.getElementById("btnSave");
const btnReset = document.getElementById("btnReset");
const chkSound = document.getElementById("chkSound");

function soundOn() {
  return !chkSound || chkSound.checked;
}

function ensureAudio() {
  if (!soundOn()) return null;
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function beep(freq0, freq1, dur, vol) {
  const c = ensureAudio();
  if (!c) return;
  const t0 = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(freq0, t0);
  if (freq1 != null) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq1), t0 + dur * 0.85);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function sfxTap(comboLv) {
  const bump = Math.min(18, comboLv) * 14;
  beep(520 + bump, 220 + bump * 0.5, 0.06, 0.055);
}

function sfxBuy() {
  beep(200, 440, 0.1, 0.065);
  setTimeout(() => beep(540, 920, 0.08, 0.045), 55);
}

function comboWindowMs() {
  const u = UPGRADES.find((x) => x.id === "coffee");
  const lv = levels.coffee || 0;
  return COMBO_WINDOW_MS_BASE + lv * (u.comboWindow || 0);
}

function comboCap() {
  const u = UPGRADES.find((x) => x.id === "coffee");
  const lv = levels.coffee || 0;
  return COMBO_CAP_BASE + lv * (u.comboCapAdd || 0);
}

function tapFlatBonus() {
  const u = UPGRADES.find((x) => x.id === "hammer");
  return (levels.hammer || 0) * (u.tapFlat || 0);
}

function passiveBasePerSec() {
  let s = 0;
  for (const u of UPGRADES) {
    if (u.passive) s += (levels[u.id] || 0) * u.passive;
  }
  return s;
}

function passiveMult() {
  const u = UPGRADES.find((x) => x.id === "poster");
  return 1 + (levels.poster || 0) * (u.passiveMult || 0);
}

function passivePerSec() {
  return passiveBasePerSec() * passiveMult();
}

function costFor(u) {
  const lv = levels[u.id] || 0;
  return Math.ceil(u.baseCost * Math.pow(u.costMul, lv));
}

function clickGain() {
  const flat = 1 + tapFlatBonus();
  const cap = comboCap();
  return flat + Math.min(cap, combo);
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (typeof d.money === "number" && d.money >= 0) money = d.money;
    if (typeof d.totalClicks === "number" && d.totalClicks >= 0) totalClicks = d.totalClicks;
    if (typeof d.bestCombo === "number" && d.bestCombo >= 0) bestCombo = d.bestCombo;
    if (d.levels && typeof d.levels === "object") {
      for (const id of Object.keys(levels)) {
        const n = Number(d.levels[id]);
        if (Number.isFinite(n) && n >= 0) levels[id] = Math.min(n, 9999);
      }
    }
  } catch {
    /* ignore */
  }
}

function save() {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ money, totalClicks, bestCombo, levels, v: 2 }),
    );
  } catch {
    /* ignore */
  }
}

function schedulePassiveSave() {
  if (savePassiveTimer) return;
  savePassiveTimer = window.setTimeout(() => {
    savePassiveTimer = 0;
    save();
  }, 450);
}

function paintShop() {
  for (const { u, title, buy } of shopRows) {
    const lv = levels[u.id] || 0;
    const c = costFor(u);
    title.textContent = `${u.name} · Stufe ${lv}`;
    buy.textContent = `${fmt(c)} ₡`;
    buy.disabled = money < c;
  }
}

function paint() {
  if (elMoney) elMoney.textContent = `${fmt(money)} ₡`;
  const p = passivePerSec();
  if (elSub) {
    elSub.textContent = `Klicks gesamt: ${fmt(totalClicks)} · Beste Combo: ×${bestCombo}`;
  }
  if (elRate) {
    elRate.textContent =
      p > 0
        ? `Passiv +${p.toFixed(2)} ₡/s · Combo‑Fenster ${(comboWindowMs() / 1000).toFixed(2)}s · Max‑Combo ${comboCap()}`
        : `Passiv +0 ₡/s · Tippe und kauf Upgrades`;
  }
  if (elCombo) elCombo.textContent = combo > 0 ? `Combo ×${combo}` : "Combo —";
  if (elComboBar) {
    const cap = comboCap();
    const pct = cap > 0 ? Math.min(100, (combo / cap) * 100) : 0;
    elComboBar.style.width = `${pct}%`;
  }
  paintShop();
}

function floatText(x, y, text) {
  const el = document.createElement("div");
  el.className = "floater";
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function spawnParticles(x, y) {
  if (!fxRoot) return;
  const n = 14;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("span");
    p.className = "particle";
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const dist = 36 + Math.random() * 52;
    p.style.setProperty("--dx", `${Math.cos(ang) * dist}px`);
    p.style.setProperty("--dy", `${Math.sin(ang) * dist}px`);
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    fxRoot.appendChild(p);
    setTimeout(() => p.remove(), 650);
  }
}

function ripple(x, y) {
  if (!fxRoot) return;
  const r = document.createElement("span");
  r.className = "ripple";
  r.style.left = `${x}px`;
  r.style.top = `${y}px`;
  fxRoot.appendChild(r);
  setTimeout(() => r.remove(), 700);
}

function onTap(clientX, clientY) {
  const t = performance.now();
  const win = comboWindowMs();
  if (t - lastClickTs <= win) {
    combo = Math.min(comboCap(), combo + 1);
  } else {
    combo = 1;
  }
  lastClickTs = t;
  if (combo > bestCombo) bestCombo = combo;

  const g = clickGain();
  money += g;
  totalClicks += 1;
  save();

  sfxTap(combo);
  floatText(clientX, clientY - 8, `+${fmt(g)}`);
  spawnParticles(clientX, clientY);
  ripple(clientX, clientY);

  if (stage) {
    stage.classList.remove("stage--pulse");
    void stage.offsetWidth;
    stage.classList.add("stage--pulse");
  }
  if (tapRing) {
    tapRing.classList.remove("tap-ring--pop");
    void tapRing.offsetWidth;
    tapRing.classList.add("tap-ring--pop");
  }

  paint();
}

function buildShop() {
  if (!elUp) return;
  elUp.innerHTML = "";
  shopRows = [];
  for (const u of UPGRADES) {
    const card = document.createElement("div");
    card.className = "up-card";
    const title = document.createElement("h3");
    const p = document.createElement("p");
    p.textContent = u.desc;
    const buy = document.createElement("button");
    buy.type = "button";
    buy.className = "buy";
    buy.addEventListener("click", () => {
      const c = costFor(u);
      if (money < c) return;
      money -= c;
      levels[u.id] = (levels[u.id] || 0) + 1;
      save();
      sfxBuy();
      card.classList.add("up-card--flash");
      setTimeout(() => card.classList.remove("up-card--flash"), 320);
      paint();
    });
    card.append(title, p, buy);
    elUp.append(card);
    shopRows.push({ u, title, buy, card });
  }
}

function tickPassive(now) {
  const dt = Math.min(2, (now - lastPassiveTs) / 1000);
  lastPassiveTs = now;
  const rate = passivePerSec();
  passiveAcc += rate * dt;
  let n = 0;
  while (passiveAcc >= 1 && n < 30) {
    money += 1;
    passiveAcc -= 1;
    n += 1;
  }
  if (n) schedulePassiveSave();
  paint();
  requestAnimationFrame(tickPassive);
}

tapZone.addEventListener("pointerdown", (ev) => {
  ev.preventDefault();
  tapZone.setPointerCapture(ev.pointerId);
  ensureAudio();
  onTap(ev.clientX, ev.clientY);
});

btnSave.addEventListener("click", () => {
  save();
  try {
    localStorage.setItem(SOUND_KEY, chkSound.checked ? "1" : "0");
  } catch {
    /* ignore */
  }
  btnSave.textContent = "Gespeichert ✓";
  setTimeout(() => {
    btnSave.textContent = "Speichern";
  }, 900);
});

btnReset.addEventListener("click", () => {
  if (!confirm("Wirklich zurücksetzen?")) return;
  money = 0;
  totalClicks = 0;
  bestCombo = 0;
  combo = 0;
  lastClickTs = 0;
  passiveAcc = 0;
  levels = Object.fromEntries(UPGRADES.map((x) => [x.id, 0]));
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
  paint();
});

try {
  const s = localStorage.getItem(SOUND_KEY);
  if (s === "0" && chkSound) chkSound.checked = false;
} catch {
  /* ignore */
}

if (chkSound) {
  chkSound.addEventListener("change", () => {
    if (chkSound.checked) ensureAudio();
  });
}

load();
buildShop();
paint();
requestAnimationFrame(tickPassive);
