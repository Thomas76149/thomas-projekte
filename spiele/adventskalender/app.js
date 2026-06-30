const STORAGE_KEY = "thomas-fun-advent-opened-v1";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** @type {{ day: number, title: string, text: string }[]} */
const DOORS = [
  { day: 1, title: "Start", text: "Wishing you all the best for the holiday season." },
  { day: 2, title: "School", text: "Stay curious — hard work helps, but so do breaks." },
  { day: 3, title: "Movement", text: "A bit of exercise does both body and mind good." },
  { day: 4, title: "Food", text: "Eating healthy doesn't mean perfect — more like mindful." },
  { day: 5, title: "Balance", text: "Don't game too much — and when you do, enjoy it." },
  { day: 6, title: "Team", text: "A good project thrives on clear goals and kind people." },
  { day: 7, title: "Code", text: "Debugging in small steps beats guessing in big ones." },
  { day: 8, title: "Orbit", text: "Dream big — and plan the next 3 concrete steps." },
  { day: 9, title: "Rest", text: "Today: 10 deliberate minutes without a screen." },
  { day: 10, title: "Music", text: "A study playlist can work wonders." },
  { day: 11, title: "Friends", text: "Message someone you're rooting for." },
  { day: 12, title: "Midpoint", text: "Halftime — you've got this. Hydrate." },
  { day: 13, title: "Experiment", text: "Try something you've never built before." },
  { day: 14, title: "Reading", text: "A good tutorial saves hours of trial and error." },
  { day: 15, title: "Git", text: "Small commits, clear messages — future you says thanks." },
  { day: 16, title: "Design", text: "Whitespace isn't a bug, it's breathing room for the UI." },
  { day: 17, title: "Security", text: "Never put passwords and tokens in the repo — .env stays local." },
  { day: 18, title: "Speed", text: "Done fast is rarely clean — find the golden mean." },
  { day: 19, title: "Help", text: "Asking is a superpower, not a weakness." },
  { day: 20, title: "Fire", text: "When it's on fire: reproduce first, then fix." },
  { day: 21, title: "Polish", text: "Polish is what turns “okay” into “wow”." },
  { day: 22, title: "Anticipation", text: "Two doors left — keep going." },
  { day: 23, title: "Christmas Eve", text: "Tomorrow's the big day — today: prepare in a relaxed way." },
  { day: 24, title: "Merry Christmas", text: "Thanks for clicking all the way through — enjoy the holidays." },
];

function loadOpened() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveOpened(set) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

function isDemoMode() {
  if (new URLSearchParams(location.search).get("demo") === "1") return true;
  return document.getElementById("demoLocal")?.checked ?? false;
}

function canOpenDay(dayNum) {
  if (isDemoMode()) return true;
  const now = new Date();
  if (now.getMonth() !== 11) return false;
  return now.getDate() >= dayNum;
}

function seasonMessage() {
  if (isDemoMode()) return "Demo active — all doors unlocked.";
  const now = new Date();
  if (now.getMonth() !== 11) return "Calendar is active in December — or use demo mode.";
  return `Today is December ${now.getDate()} — doors up to ${now.getDate()} are unlocked.`;
}

function doorRipple(btn, clientX, clientY, muted) {
  if (reduceMotion) return;
  const r = btn.getBoundingClientRect();
  const el = document.createElement("span");
  el.className = "doorRipple" + (muted ? " doorRipple--muted" : "");
  el.style.left = `${clientX - r.left}px`;
  el.style.top = `${clientY - r.top}px`;
  btn.appendChild(el);
  requestAnimationFrame(() => el.classList.add("go"));
  setTimeout(() => el.remove(), 650);
}

function openModal(day, title, text) {
  const modal = document.getElementById("modal");
  const panel = modal.querySelector(".modal__panel");
  document.getElementById("modalDay").textContent = `Door ${day}`;
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").textContent = text;
  modal.hidden = false;
  if (panel) {
    panel.classList.remove("modal__panel--in");
    if (!reduceMotion) {
      void panel.offsetWidth;
      panel.classList.add("modal__panel--in");
    }
  }
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.hidden = true;
  modal.querySelector(".modal__panel")?.classList.remove("modal__panel--in");
}

function buildSnow() {
  const el = document.querySelector(".snow");
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 28; i++) {
    const s = document.createElement("span");
    s.textContent = "❄";
    s.style.left = `${Math.random() * 100}%`;
    s.style.animationDuration = `${8 + Math.random() * 12}s`;
    s.style.animationDelay = `${-Math.random() * 20}s`;
    s.style.opacity = String(0.25 + Math.random() * 0.45);
    frag.appendChild(s);
  }
  el.appendChild(frag);
}

function renderGrid(opened) {
  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  for (const { day, title, text } of DOORS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "door";
    btn.dataset.day = String(day);

    const allowed = canOpenDay(day);
    const isOpen = opened.has(day);

    if (isOpen) {
      btn.classList.add("is-open");
      btn.textContent = title;
      btn.addEventListener("click", (e) => {
        doorRipple(btn, e.clientX, e.clientY, false);
        openModal(day, title, text);
      });
    } else {
      btn.textContent = String(day);
      if (!allowed) {
        btn.disabled = true;
        btn.title = "Not yet available";
      }
      btn.addEventListener("click", (e) => {
        if (!canOpenDay(day)) {
          doorRipple(btn, e.clientX, e.clientY, true);
          openModal(day, "Patience", "This door isn't ready yet — or enable demo mode.");
          return;
        }
        doorRipple(btn, e.clientX, e.clientY, false);
        if (!reduceMotion) {
          btn.classList.add("door--openflash");
          setTimeout(() => btn.classList.remove("door--openflash"), 560);
        }
        opened.add(day);
        saveOpened(opened);
        btn.classList.add("is-open");
        btn.textContent = title;
        openModal(day, title, text);
      });
    }
    grid.appendChild(btn);
  }
}

document.getElementById("demoLocal")?.addEventListener("change", () => {
  document.getElementById("seasonHint").textContent = seasonMessage();
  renderGrid(loadOpened());
});

document.querySelectorAll("[data-close]").forEach((el) => {
  el.addEventListener("click", closeModal);
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

if (new URLSearchParams(location.search).get("demo") === "1") {
  const cb = document.getElementById("demoLocal");
  if (cb) cb.checked = true;
}

document.getElementById("seasonHint").textContent = seasonMessage();
buildSnow();
renderGrid(loadOpened());
