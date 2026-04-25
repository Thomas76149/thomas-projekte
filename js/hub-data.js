// Zentrale Liste: hier fügst du neue Spiele/Tools hinzu.
// Tags steuern Filter + Suche (z.B. "game", "test", "arcade", "puzzle", "mobile", "canvas", "strategy").

window.THOMASFUN_ITEMS = [
  // Featured / große Games
  {
    title: "Jet‑Kampf",
    href: "spiele/jetspiel/index.html",
    emoji: "🎮",
    label: "Canvas · Arcade",
    desc: "Arcade mit Wärme, Upgrades, verschiedenen Gegnern — auch Touch.",
    tags: ["game","arcade","canvas","mobile","featured"],
    big: true,
    section: "games",
  },
  {
    title: "Tower Defense",
    href: "spiele/towerdefense/index.html",
    emoji: "🗼",
    label: "Strategy · TD",
    desc: "Upgrades (2 Pfade), Kampagne (Kapitel 1) & Tutorial — viel Juice.",
    tags: ["game","strategy","towerdefense","mobile","canvas","featured"],
    big: true,
    section: "games",
  },
  {
    title: "Tunnel Runner",
    href: "spiele/tunnel-runner/index.html",
    emoji: "🕳️",
    label: "Pseudo‑3D · Arcade",
    desc: "Neon‑Tunnel in Fake‑3D: Gates dodgen, Speed steigt, Highscore.",
    tags: ["game","arcade","mobile","canvas","featured"],
    big: true,
    section: "games",
  },
  {
    title: "Asteroids",
    href: "spiele/asteroids/index.html",
    emoji: "🪐",
    label: "Arcade · Physics",
    desc: "Rotation, Schub, Schießen, Steine splitten — Score & Wellen.",
    tags: ["game","arcade","space","canvas","featured"],
    big: true,
    section: "games",
  },

  // Games
  { title:"Breakout", href:"spiele/breakout/index.html", emoji:"🧱", label:"Canvas · Arcade", desc:"Paddle bewegen, Ball bouncen, Blöcke zerstören — Touch & Keyboard.", tags:["game","arcade","canvas","mobile"], big:true, section:"games" },
  { title:"Math Gates", href:"spiele/math-gates/index.html", emoji:"🧮", label:"Runner · Zahlen", desc:"Gates mit + − × ÷, Hindernisse & Boss am Ende. Ohne Werbung.", tags:["game","arcade","mobile","canvas"], big:true, section:"games" },
  { title:"Tic‑Tac‑Toe", href:"spiele/tictactoe/index.html", emoji:"❎", label:"Board · Mini", desc:"Gegen Bot oder 2‑Spieler — mit fettem Win/Lose/Draw‑Screen.", tags:["game","board","mini","mobile"], section:"games" },
  { title:"Memory", href:"spiele/memory/index.html", emoji:"🧠", label:"Puzzle", desc:"Paare finden, Bestzeit jagen.", tags:["game","puzzle","memory","mobile"], section:"games" },
  { title:"2048", href:"spiele/2048/index.html", emoji:"🧩", label:"Puzzle", desc:"Schieben, mergen, Score jagen — Keyboard & Touch.", tags:["game","puzzle","mobile"], section:"games" },
  { title:"Minesweeper", href:"spiele/minesweeper/index.html", emoji:"💣", label:"Puzzle · Board", desc:"Aufdecken, markieren, nicht boomen — Touch & Maus, Bestzeiten.", tags:["game","puzzle","board","mobile"], section:"games" },
  { title:"Snake", href:"spiele/snake/index.html", emoji:"🐍", label:"Arcade", desc:"Klassiker: fressen, wachsen, nicht crashen. Auch Mobile‑Buttons.", tags:["game","arcade","snake","mobile"], section:"games" },
  { title:"Pong", href:"spiele/pong/index.html", emoji:"🏓", label:"Arcade", desc:"Gegen Bot — mit Sparks, Sound und Finish‑Overlay.", tags:["game","arcade"], section:"games" },
  { title:"Spider‑Swing", href:"spiele/orbit-hook/index.html", emoji:"🪝", label:"Arcade · One‑Button", desc:"Spider‑Ball: an Felsen schwingen, runterfallen möglich, Ziel erreichen.", tags:["game","arcade","mobile","canvas"], section:"games" },
  { title:"Time‑Stop Dash", href:"spiele/time-stop-dash/index.html", emoji:"⏱️", label:"Arcade · Skill", desc:"Zeit läuft nur bei Bewegung — dash durch Neon‑Hindernisse.", tags:["game","arcade","reflex","mobile","canvas"], section:"games" },
  { title:"Loop‑Runner", href:"spiele/loop-runner/index.html", emoji:"⭕", label:"Arcade · Minimal", desc:"Auf dem Ring laufen, innen/außen wechseln — dodge die Gates.", tags:["game","arcade","mobile","canvas"], section:"games" },
  { title:"Stein‑Schere‑Papier", href:"spiele/rps/index.html", emoji:"🪨", label:"Mini", desc:"Streak jagen — mit Partikeln, Sound und Vibration.", tags:["game","mini","mobile"], section:"games" },

  // Tests & Tools
  { title:"CPS‑Tester", href:"spiele/cps/index.html", emoji:"🖱️", label:"Test", desc:"CPS messen: Zeit 0,1s–60s selbst wählen, Klicks beim Drücken, Bestwert.", tags:["test","tool","cps","mobile"], section:"tests" },
  { title:"Reflex‑Test", href:"spiele/reflex/index.html", emoji:"⚡", label:"Test", desc:"Drück so schnell du kannst, wenn es grün wird — mit Rating & Durchschnitt.", tags:["test","tool","reflex","mobile"], section:"tests" },
  { title:"Adventskalender", href:"spiele/adventskalender/index.html", emoji:"🎁", label:"UI · Dezember", desc:"24 Türchen, Speicherstand, Demo‑Modus.", tags:["tool","ui"], section:"tests" },
  { title:"To‑Do Liste", href:"spiele/todo/index.html", emoji:"✅", label:"App", desc:"Filter, erledigt löschen — localStorage.", tags:["tool","mobile"], section:"tests" },
  { title:"Satelliten‑Ping", href:"spiele/spielchen/index.html", emoji:"🛰️", label:"Reflex", desc:"Kurz reagieren, wenn das Signal da ist.", tags:["game","reflex","mobile"], section:"tests" },
];

