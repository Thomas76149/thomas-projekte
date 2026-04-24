const STORAGE_KEY = "thomas-fun-advent-opened-v1";

/** @type {{ day: number, title: string, text: string }[]} */
const DOORS = [
  { day: 1, title: "Start", text: "Ich wünsche dir alles Gute für die Adventszeit." },
  { day: 2, title: "Schule", text: "Bleib neugierig — Fleiß hilft, aber Pausen auch." },
  { day: 3, title: "Bewegung", text: "Ein bisschen Sport tut Körper und Kopf gut." },
  { day: 4, title: "Essen", text: "Gesund ernähren heißt nicht perfekt — eher bewusst." },
  { day: 5, title: "Balance", text: "Nicht zu viel zocken — und wenn, dann mit Freude." },
  { day: 6, title: "Team", text: "Ein gutes Projekt lebt von klaren Zielen und netten Menschen." },
  { day: 7, title: "Code", text: "Kleine Schritte debuggen ist besser als große raten." },
  { day: 8, title: "Orbit", text: "Träum groß — und plane die nächsten 3 konkreten Schritte." },
  { day: 9, title: "Ruhe", text: "Heute: bewusst 10 Minuten ohne Bildschirm." },
  { day: 10, title: "Musik", text: "Eine Playlist fürs Lernen kann Wunder wirken." },
  { day: 11, title: "Freunde", text: "Schreib jemandem, dem du’s gönnt." },
  { day: 12, title: "Mitte", text: "Halbzeit — du schaffst das. Hydrate." },
  { day: 13, title: "Experiment", text: "Probier eine Sache, die du noch nie gebaut hast." },
  { day: 14, title: "Lesen", text: "Ein gutes Tutorial spart Stunden Trial-and-Error." },
  { day: 15, title: "Git", text: "Kleine Commits, klare Messages — zukünftiges du sagt Danke." },
  { day: 16, title: "Design", text: "Whitespace ist kein Bug, sondern Atmen für’s UI." },
  { day: 17, title: "Sicherheit", text: "Passwörter und Tokens nie ins Repo — .env bleibt lokal." },
  { day: 18, title: "Speed", text: "Schnell fertig ist selten sauber — such die goldene Mitte." },
  { day: 19, title: "Hilfe", text: "Fragen ist eine Superkraft, keine Schwäche." },
  { day: 20, title: "Feuer", text: "Wenn’s brennt: erst reproduzieren, dann fixen." },
  { day: 21, title: "Feinschliff", text: "Polish ist das, was aus „okay“ „wow“ macht." },
  { day: 22, title: "Vorfreude", text: "Noch zwei Türchen — bleib dran." },
  { day: 23, title: "Heiligabend", text: "Morgen ist großer Tag — heute: entspannt vorbereiten." },
  { day: 24, title: "Frohe Weihnachten", text: "Danke, dass du durchgeklickt hast — genieß die Feiertage." },
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
  if (isDemoMode()) return "Demo aktiv — alle Türen frei.";
  const now = new Date();
  if (now.getMonth() !== 11) return "Kalender ist im Dezember aktiv — oder Demo-Modus nutzen.";
  return `Heute ist der ${now.getDate()}. Dezember — Türchen bis ${now.getDate()} sind frei.`;
}

function openModal(day, title, text) {
  const modal = document.getElementById("modal");
  document.getElementById("modalDay").textContent = `Türchen ${day}`;
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").textContent = text;
  modal.hidden = false;
}

function closeModal() {
  document.getElementById("modal").hidden = true;
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
      btn.addEventListener("click", () => openModal(day, title, text));
    } else {
      btn.textContent = String(day);
      if (!allowed) {
        btn.disabled = true;
        btn.title = "Noch nicht verfügbar";
      }
      btn.addEventListener("click", () => {
        if (!canOpenDay(day)) {
          openModal(day, "Geduld", "Dieses Türchen ist noch nicht dran — oder Demo-Modus aktivieren.");
          return;
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
