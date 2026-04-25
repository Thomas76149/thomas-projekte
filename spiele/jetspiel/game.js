(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const startOverlay = document.getElementById("startOverlay");
  const gameOverOverlay = document.getElementById("gameOverOverlay");
  const gameRow = document.getElementById("gameRow");
  const body = document.body;
  const scoreEl = document.getElementById("score");
  const creditsEl = document.getElementById("credits");
  const enemiesHud = document.getElementById("enemiesHud");
  const livesEl = document.getElementById("lives");
  const heatDock = document.getElementById("heatDock");
  const heatFill = document.getElementById("heatFill");
  const heatPct = document.getElementById("heatPct");
  const heatLabel = document.getElementById("heatLabel");
  const shopSubline = document.getElementById("shopSubline");
  const shipPreviewCanvas = document.getElementById("shipPreviewCanvas");
  const shieldTag = document.getElementById("shieldTag");
  const shieldNum = document.getElementById("shieldNum");
  const rocketNum = document.getElementById("rocketNum");
  const upTag = document.getElementById("upTag");
  const goText = document.getElementById("goText");
  const toastEl = document.getElementById("toast");
  const shopGrid = document.getElementById("shopGrid");
  const shopCreditsVal = document.getElementById("shopCreditsVal");
  const shopControls = document.getElementById("shopControls");
  const wavePill = document.getElementById("wavePill");
  const upgradeHud = document.getElementById("upgradeHud");
  const shopContinueBar = document.getElementById("shopContinueBar");
  const btnShopContinue = document.getElementById("btnShopContinue");
  const soundOn = document.getElementById("soundOn");
  const diffHint = document.getElementById("diffHint");
  const diffHud = document.getElementById("diffHud");
  const shipHint = document.getElementById("shipHint");
  const novaTag = document.getElementById("novaTag");
  const novaCd = document.getElementById("novaCd");
  const comboStage = document.getElementById("comboStage");
  const comboBigNum = document.getElementById("comboBigNum");
  const comboBarFill = document.getElementById("comboBarFill");
  const voiceBubble = document.getElementById("voiceBubble");
  const voiceText = document.getElementById("voiceText");
  const pauseOverlay = document.getElementById("pauseOverlay");
  const btnResume = document.getElementById("btnResume");
  const btnPauseMenu = document.getElementById("btnPauseMenu");
  const btnPause = document.getElementById("btnPause");
  const btnFs = document.getElementById("btnFs");
  const btnFsTop = document.getElementById("btnFsTop");
  const canvasWrap = document.getElementById("canvasWrap");
  const modHint = document.getElementById("modHint");
  const modRowPulse = document.getElementById("modRowPulse");
  const modRowBeam = document.getElementById("modRowBeam");
  const btnInstallTop = document.getElementById("btnInstallTop");

  const DIFF_STORAGE_KEY = "jetkampf-difficulty-v1";
  const SHIP_STORAGE_KEY = "jetkampf-ship-v1";
  const WEAPON_MOD_KEY_LEGACY = "jetkampf-weaponmod-v1";
  const MOD_KEY_PULSE = "jetkampf-mod-pulse-v2";
  const MOD_KEY_BEAM = "jetkampf-mod-beam-v2";
  const MOD_MIGRATE_FLAG = "jetkampf-mod-migrated-v2";
  const META_KEY = "jetkampf-meta-v1";

  /** @type {'pulse' | 'beam'} */
  let shipClass = "pulse";
  const SHIP_LABELS = { pulse: "Pulsjäger", beam: "Strahljäger" };
  const SHIP_HINTS = {
    pulse: "Langsame Bolzen, kein Wärme-Balken — dafür unbegrenzt feuern (kein Überhitzen).",
    beam: "Dauerstrahl mit Wärme-Leiste & Überhitzung — Schaden pro Takt ist begrenzt.",
  };

  /** @type {string} */
  let weaponMod = "standard";
  const MOD_HINTS_PULSE = {
    standard: "Ausgewogen — keine Sonderregeln.",
    pbreach: "+28 % Bolzen- und Raketenschaden gegen Panzer.",
    psalve: "Bolzen: etwas schnelleres Feuer (~12 %).",
    pwolke: "Startet mit Spread-Stufe 1 (Seitenbolzen).",
  };
  const MOD_HINTS_BEAM = {
    standard: "Ausgewogen — keine Sonderregeln.",
    bbreach: "+28 % Strahl-, Bolzen- und Raketenschaden gegen Panzer.",
    bflux: "Strahl: +12 % DPS, dafür +9 % Wärmeaufbau.",
    bbulk: "Jeder Lauf startet mit +1 Schild-Ladung.",
  };
  const MOD_LABELS = {
    standard: "Std",
    pbreach: "Pz.-Bruch",
    psalve: "Salve",
    pwolke: "Wolke",
    bbreach: "Pz.-Bruch",
    bflux: "Flux",
    bbulk: "Bollwerk",
  };

  let metaMaxWave = 0;
  let unlockTrail = false;
  let unlockBeamTint = false;
  let unlockHullChrome = false;

  let combo = 0;
  let comboTimerMs = 0;
  let hitstopMs = 0;
  let paused = false;
  /** 0 ruhig, 1 Ion, 2 Trümmer, 3 Wind */
  let envMode = 0;
  let voiceHideTimer = 0;
  let deferredInstallPrompt = null;
  let lastOneLifeVoiceWave = -999;

  /** @type {'easy' | 'medium' | 'hard'} */
  let difficulty = "medium";

  const DIFF = {
    easy: {
      label: "Leicht",
      waveEnemyMul: 0.68,
      spawnIntervalMul: 1.22,
      enemyVxMul: 0.84,
      tankHpExtra: -1,
      wobblerHp: 2,
      tankBulletSpdMul: 0.86,
      tankShootCooldownMul: 1.38,
      shopPriceMul: 0.86,
      waveClearBonusMul: 0.95,
      creditFromKillMul: 0.9,
      livesStart: 4,
      heatGainMul: 0.88,
      rankBias: -55,
      hunterSteerMul: 0.82,
    },
    medium: {
      label: "Mittel",
      waveEnemyMul: 1,
      spawnIntervalMul: 1,
      enemyVxMul: 1,
      tankHpExtra: 0,
      wobblerHp: 2,
      tankBulletSpdMul: 1,
      tankShootCooldownMul: 1,
      shopPriceMul: 1,
      waveClearBonusMul: 0.82,
      creditFromKillMul: 0.78,
      livesStart: 3,
      heatGainMul: 1,
      rankBias: 0,
      hunterSteerMul: 1,
    },
    hard: {
      label: "Schwer",
      waveEnemyMul: 1.42,
      spawnIntervalMul: 0.74,
      enemyVxMul: 1.16,
      tankHpExtra: 2,
      wobblerHp: 3,
      tankBulletSpdMul: 1.22,
      tankShootCooldownMul: 0.64,
      shopPriceMul: 1.2,
      waveClearBonusMul: 0.7,
      creditFromKillMul: 0.68,
      livesStart: 3,
      heatGainMul: 1.14,
      rankBias: 140,
      hunterSteerMul: 1.22,
    },
  };

  const DIFF_HINTS = {
    easy: "Weniger Feinde, langsamere Panzer-Schüsse, günstigerer Shop, 4 Leben.",
    medium: "Ausgewogene Kurve — Standard-Empfehlung.",
    hard: "Deutlich mehr Feinde, schnellere Gegner, härtere Panzer, teurerer Shop.",
  };

  function diff() {
    return DIFF[difficulty] || DIFF.medium;
  }

  function shopPriceCredits(raw) {
    return Math.max(1, Math.ceil(raw * diff().shopPriceMul));
  }

  function loadDifficulty() {
    try {
      const v = localStorage.getItem(DIFF_STORAGE_KEY);
      if (v === "easy" || v === "medium" || v === "hard") difficulty = v;
    } catch (_) {}
  }

  function saveDifficulty() {
    try {
      localStorage.setItem(DIFF_STORAGE_KEY, difficulty);
    } catch (_) {}
  }

  function syncDifficultyChips() {
    document.querySelectorAll(".diffChip[data-diff]").forEach((btn) => {
      const d = btn.getAttribute("data-diff");
      btn.setAttribute("aria-pressed", d === difficulty ? "true" : "false");
    });
    if (diffHint) diffHint.textContent = DIFF_HINTS[difficulty] || "";
  }

  function loadShip() {
    try {
      const v = localStorage.getItem(SHIP_STORAGE_KEY);
      if (v === "pulse" || v === "beam") shipClass = v;
    } catch (_) {}
  }

  function saveShip() {
    try {
      localStorage.setItem(SHIP_STORAGE_KEY, shipClass);
    } catch (_) {}
  }

  function syncShipChips() {
    document.querySelectorAll(".shipChip").forEach((btn) => {
      const s = btn.getAttribute("data-ship");
      btn.setAttribute("aria-pressed", s === shipClass ? "true" : "false");
    });
    if (shipHint) shipHint.textContent = SHIP_HINTS[shipClass] || "";
    if (modRowPulse) modRowPulse.hidden = shipClass !== "pulse";
    if (modRowBeam) modRowBeam.hidden = shipClass !== "beam";
    loadWeaponMod();
    syncModChips();
    ensureShipPreviewRunning();
  }

  function migrateWeaponModsOnce() {
    try {
      if (localStorage.getItem(MOD_MIGRATE_FLAG)) return;
      const old = localStorage.getItem(WEAPON_MOD_KEY_LEGACY);
      if (old === "breach") {
        localStorage.setItem(MOD_KEY_PULSE, "pbreach");
        localStorage.setItem(MOD_KEY_BEAM, "bbreach");
      } else if (old === "flux") {
        localStorage.setItem(MOD_KEY_BEAM, "bflux");
        localStorage.setItem(MOD_KEY_PULSE, "standard");
      } else if (old === "bulwark") {
        localStorage.setItem(MOD_KEY_BEAM, "bbulk");
        localStorage.setItem(MOD_KEY_PULSE, "standard");
      }
      localStorage.removeItem(WEAPON_MOD_KEY_LEGACY);
      localStorage.setItem(MOD_MIGRATE_FLAG, "1");
    } catch (_) {}
  }

  function modStorageKey() {
    return shipClass === "beam" ? MOD_KEY_BEAM : MOD_KEY_PULSE;
  }

  function allowedWeaponMods() {
    return shipClass === "beam"
      ? new Set(["standard", "bbreach", "bflux", "bbulk"])
      : new Set(["standard", "pbreach", "psalve", "pwolke"]);
  }

  function loadWeaponMod() {
    try {
      const v = localStorage.getItem(modStorageKey());
      weaponMod = allowedWeaponMods().has(v) ? v : "standard";
    } catch (_) {
      weaponMod = "standard";
    }
  }

  function saveWeaponMod() {
    try {
      localStorage.setItem(modStorageKey(), weaponMod);
    } catch (_) {}
  }

  function modHintForCurrent() {
    return shipClass === "beam" ? MOD_HINTS_BEAM : MOD_HINTS_PULSE;
  }

  function syncModChips() {
    document.querySelectorAll(".modChip").forEach((btn) => {
      const row = btn.closest("[id^='modRow']");
      if (row && row.hidden) return;
      const m = btn.getAttribute("data-mod");
      btn.setAttribute("aria-pressed", m === weaponMod ? "true" : "false");
    });
    if (modHint) {
      const bits = [modHintForCurrent()[weaponMod] || ""];
      if (metaMaxWave > 0) bits.push(`Rekord: Welle ${metaMaxWave}.`);
      const u = [];
      if (unlockTrail) u.push("Trail");
      if (unlockBeamTint) u.push("Strahl-Farbe");
      if (unlockHullChrome) u.push("Chrom-Rand");
      if (u.length) bits.push(`Freigeschaltet: ${u.join(", ")}.`);
      modHint.textContent = bits.filter(Boolean).join(" ");
    }
  }

  function loadMetaProgress() {
    try {
      const j = localStorage.getItem(META_KEY);
      const o = j ? JSON.parse(j) : {};
      metaMaxWave = typeof o.m === "number" ? o.m : 0;
    } catch (_) {
      metaMaxWave = 0;
    }
    unlockTrail = metaMaxWave >= 6;
    unlockBeamTint = metaMaxWave >= 12;
    unlockHullChrome = metaMaxWave >= 20;
  }

  function saveMetaProgress() {
    try {
      localStorage.setItem(META_KEY, JSON.stringify({ m: metaMaxWave }));
    } catch (_) {}
  }

  function recordMetaWave(w) {
    if (w > metaMaxWave) {
      metaMaxWave = w;
      saveMetaProgress();
      loadMetaProgress();
      syncModChips();
    }
  }

  function pickEnvMode() {
    envMode = (Math.max(0, wave - 1) + (difficulty === "hard" ? 2 : 0)) % 4;
  }

  function triggerHitstop(ms) {
    hitstopMs = Math.max(hitstopMs, ms);
  }

  function showVoiceLine(text, ms = 3200) {
    if (!voiceBubble || !voiceText) return;
    voiceText.textContent = text;
    voiceBubble.hidden = false;
    voiceHideTimer = ms;
  }

  function tickVoice(dt) {
    if (voiceHideTimer <= 0) return;
    voiceHideTimer -= dt;
    if (voiceHideTimer <= 0 && voiceBubble) voiceBubble.hidden = true;
  }

  let bgmLayer = "";

  function initBgm() {
    /* Kein Dauer-Ambient mehr — Oszillatoren wirkten wie nerviges Rauschen. Nur SFX bleiben. */
  }

  function setBgmLayer(layer) {
    if (!soundOn.checked || !actx || !soundReady) return;
    bgmLayer = layer;
  }

  function stopBgm() {
    bgmLayer = "";
  }

  function decorateElite(u) {
    if (!u || u.boss || wave < 2) return;
    if (Math.random() > 0.125) return;
    u.elite = true;
    u.eliteType = Math.floor(Math.random() * 3);
    if (u.eliteType === 0) {
      const add = u.kind === "tank" ? 3 : 2;
      u.hp = (u.hp ?? 1) + add;
      u.maxHp = u.hp;
      u.pts = Math.floor(u.pts * 1.38);
    } else if (u.eliteType === 1) {
      u.vx *= 1.26;
      u.pts = Math.floor(u.pts * 1.24);
    } else {
      u.eliteWeaver = true;
      u.pts = Math.floor(u.pts * 1.2);
    }
  }

  function requestFullscreenGame() {
    const el = canvasWrap || document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) req.call(el).catch(() => {});
  }

  /* —— Web Audio (procedural, keine Dateien) —— */
  const AC = window.AudioContext || window.webkitAudioContext;
  let actx = null;
  let soundReady = false;

  function ensureAudio() {
    if (!AC || actx) return;
    actx = new AC();
  }

  function resumeAudio() {
    ensureAudio();
    if (actx && actx.state === "suspended") actx.resume();
    soundReady = true;
  }

  function playTone(freq, dur, type = "square", vol = 0.06, slide = 0, filterHz = 0) {
    if (!soundOn.checked || !actx || !soundReady) return;
    const t0 = actx.currentTime;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    const endF = Math.max(28, freq * (slide || 1));
    if (slide && Math.abs(endF - freq) > 0.6) {
      o.frequency.exponentialRampToValueAtTime(endF, t0 + dur);
    }
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    if (filterHz > 0 && actx.createBiquadFilter) {
      const f = actx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(filterHz, t0);
      f.Q.setValueAtTime(0.7, t0);
      o.connect(f);
      f.connect(g);
    } else {
      o.connect(g);
    }
    g.connect(actx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function playNoise(dur = 0.06, vol = 0.05, fade = "out") {
    if (!soundOn.checked || !actx || !soundReady) return;
    const t0 = actx.currentTime;
    const len = Math.max(256, Math.floor(actx.sampleRate * dur));
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = fade === "out" ? 1 - i / len : i / len;
      d[i] = (Math.random() * 2 - 1) * env * env;
    }
    const src = actx.createBufferSource();
    src.buffer = buf;
    const g = actx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(g);
    g.connect(actx.destination);
    src.start(t0);
  }

  function sfxShoot() {
    playNoise(0.028, 0.035, "out");
    playTone(920, 0.04, "square", 0.038, 0.42, 4200);
    playTone(2100, 0.022, "sine", 0.018, 0.55, 8000);
  }
  function sfxExplode() {
    playNoise(0.14, 0.065, "out");
    playTone(95, 0.2, "sawtooth", 0.065, 0.18, 900);
    playTone(55, 0.28, "square", 0.045, 0.12, 400);
  }
  function sfxPickup() {
    playTone(520, 0.05, "sine", 0.06, 1.85, 6000);
    setTimeout(() => playTone(990, 0.07, "sine", 0.05, 1.4, 9000), 45);
    setTimeout(() => playTone(1320, 0.05, "triangle", 0.03, 0.9, 12000), 110);
  }
  function sfxWave() {
    playTone(165, 0.1, "triangle", 0.07, 1.5, 2500);
    setTimeout(() => playTone(248, 0.14, "sine", 0.06, 1.25, 4000), 70);
    playNoise(0.05, 0.02, "in");
  }
  function sfxHit() {
    playNoise(0.07, 0.045, "out");
    playTone(220, 0.08, "sawtooth", 0.055, 0.35, 2200);
  }
  function sfxOverheat() {
    playNoise(0.2, 0.08, "out");
    playTone(88, 0.22, "sawtooth", 0.075, 0.22, 600);
  }
  function sfxBuy() {
    playTone(523, 0.06, "sine", 0.06, 1.4, 5000);
    playTone(784, 0.08, "sine", 0.045, 1.2, 7000);
    playTone(1046, 0.1, "triangle", 0.035, 0.85, 10000);
    playNoise(0.045, 0.02, "in");
  }
  function sfxMissile() {
    playNoise(0.04, 0.03, "in");
    playTone(180, 0.2, "triangle", 0.055, 2.4, 1500);
    setTimeout(() => playTone(90, 0.15, "sine", 0.04, 0.5, 800), 60);
  }

  function sfxBossAppear() {
    playTone(62, 0.35, "sawtooth", 0.08, 2.8, 400);
    setTimeout(() => playTone(98, 0.4, "triangle", 0.07, 2.2, 900), 120);
    playNoise(0.12, 0.055, "in");
  }
  function sfxBossHit() {
    playTone(140, 0.06, "square", 0.055, 0.55, 1800);
    playNoise(0.04, 0.028, "out");
  }
  function sfxBossDead() {
    playNoise(0.35, 0.09, "out");
    playTone(70, 0.45, "sawtooth", 0.09, 0.2, 500);
    setTimeout(() => playTone(45, 0.55, "square", 0.07, 0.15, 300), 80);
    setTimeout(() => playTone(880, 0.2, "sine", 0.04, 0.35, 6000), 200);
  }
  function sfxBeam() {
    playTone(440, 0.035, "triangle", 0.028, 0.75, 6000);
    playNoise(0.022, 0.018, "out");
  }
  function sfxNova() {
    playNoise(0.24, 0.08, "out");
    playTone(55, 0.2, "sawtooth", 0.07, 0.25, 400);
    setTimeout(() => playTone(880, 0.12, "sine", 0.045, 0.4, 7000), 60);
  }
  function sfxSplash() {
    playNoise(0.08, 0.04, "out");
    playTone(200, 0.07, "square", 0.04, 0.5, 2000);
  }

  const keys = new Set();
  let lastShot = 0;
  let lastMissile = 0;
  /** Puls: deutlich langsamerer Grundtakt (kein Wärme-System). */
  const pulseBaseCooldownMs = 272;
  const jetSpeedPps = 560;

  const jet = { x: 160, y: H / 2 - 38, w: 102, h: 76 };
  /** Erlaubter Horizontalbereich zum Ausweichen (linker Bildschirmteil). */
  const jetXMin = 72;
  const jetXMax = 392;
  const bullets = [];
  const missiles = [];
  const enemyBullets = [];
  const ufos = [];
  const pickups = [];
  const particles = [];
  let stars = [];
  let nebulaOff = 0;

  let score = 0;
  let credits = 0;
  let lives = 3;
  let wave = 1;
  let heat = 0;
  let overheatLock = 0;
  let shieldCharges = 0;
  let missileStock = 4;
  let fireMul = 1;
  let spreadLevel = 0;
  let bulletDmg = 1;
  let heatPerShot = 19;
  let coolBonus = 1;
  let dmgShopLevel = 0;
  let coolShopLevel = 0;
  let lifeBuys = 0;
  let creditKillBonusLevel = 0;
  let missileDmgShopLevel = 0;
  let thrusterShopLevel = 0;
  let beamCoilLevel = 0;
  let beamDissipLevel = 0;
  let beamSplashLevel = 0;
  let missileServoLevel = 0;
  let boltFocusLevel = 0;
  let overheatServoLevel = 0;
  let capacitorLevel = 0;
  let comboExtendLevel = 0;
  let healKitBuys = 0;
  let creditInjectBuys = 0;
  let novaCdReliefLevel = 0;
  let hangarKickbackLevel = 0;
  let pickupCreditsBonus = 0;
  let contractCashUsed = false;
  let contractBossUsed = false;

  /** @type {'combat' | 'shop'} */
  let phase = "combat";
  let waveSpawnBudget = 0;
  let waveSpawned = 0;

  let running = false;
  let raf = 0;
  let lastT = 0;
  let spawnAcc = 0;
  let shake = 0;
  let comboRumble = 0;
  let comboTimerMax = 1;
  let aimTouchId = null;
  let aimTouchY = null;
  /** clientX beim Steuer-Finger (linkes Spielfeld) */
  let aimTouchX = null;
  /** Screen tint 0..1 (boss kill / hurt) — kind: "boss" | "hurt" | "ice" */
  let screenFlash = 0;
  let screenFlashKind = "ice";
  let bossHitFx = 0;
  let lastBossHitSfx = 0;

  let hasRocketSplash = false;
  let hasNovaCore = false;
  let shopFilter = "all";
  // Hangar "Verträge" (Risk/Reward) gelten jeweils nur für die nächste Welle.
  let contractCreditsNext = 0;
  let stressNext = 0;
  let pickupDropMulNext = 1;
  let forceBossNext = false;
  // Nova-Rework: Ladungen statt "schwer zu timen" Cooldown-only.
  let novaCharges = 0;
  let novaCooldownMs = 0;
  let lastBeamTick = 0;
  let lastBeamSfx = 0;
  let novaKeyLatch = false;
  /** RAF id für die Schiffsvorschau im Startmenü */
  let shipPreviewAnim = 0;

  function enemiesRemaining() {
    return Math.max(0, waveSpawnBudget - waveSpawned) + ufos.length;
  }

  function isBossWave(w) {
    return w >= 5 && w % 5 === 0;
  }
  function nextBossWave(w) {
    if (w < 5) return 5;
    return Math.ceil(w / 5) * 5;
  }
  function bossTier(w) {
    return Math.floor(w / 5) - 1;
  }
  function bossStyle(w) {
    return bossTier(w) % 8;
  }
  function bossHpTierMul(w) {
    return 1 + Math.max(0, bossTier(w)) * 0.13;
  }

  const BOSS_NAMES = [
    "Biokern",
    "Klingenwerk",
    "Hexkern",
    "Nebelmutter",
    "Panzergeist",
    "Splitterwerk",
    "Rotorkern",
    "Tieffront",
  ];

  function waveEnemyQuota(w) {
    if (isBossWave(w)) return 1;
    const base = 14 + w * 8 + Math.floor(w / 2) * 6 + Math.floor(w / 5) * 10;
    return Math.max(6, Math.round(base * diff().waveEnemyMul));
  }

  function beginCombatWave() {
    phase = "combat";
    body.classList.remove("phase-shop");
    upgradeHud.hidden = true;
    if (shopContinueBar) shopContinueBar.hidden = true;
    // QoL: always keep the game aligned (no manual scrolling).
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch (_) {
      window.scrollTo(0, 0);
    }
    pickEnvMode();
    // Risk/Reward-Deals aus dem Hangar werden hier "eingelöst".
    if (contractCreditsNext) {
      credits += contractCreditsNext;
      showToast(`Vertrag erfüllt · +${contractCreditsNext} ₡`);
      contractCreditsNext = 0;
    }
    const virtualBossWave = forceBossNext ? nextBossWave(wave) : wave;
    waveSpawnBudget = forceBossNext ? 1 : waveEnemyQuota(wave);
    waveSpawned = 0;
    spawnAcc = 0;
    bullets.length = 0;
    missiles.length = 0;
    enemyBullets.length = 0;
    pickups.length = 0;
    // Pro Welle mindestens 1 Nova-Ladung, mit Prisma-Upgrades mehr.
    if (hasNovaCore) novaCharges = Math.max(novaCharges, 1 + Math.min(3, novaCdReliefLevel));
    wavePill.textContent = `Welle ${wave}`;
    // Boss-Vertrag: Boss direkt spawnen (nicht über spawnUfo), damit nie "1 Normaler" passieren kann.
    if (forceBossNext && !isBossWave(wave)) {
      const bn = BOSS_NAMES[bossStyle(virtualBossWave)];
      showToast(`BOSS · ${bn} — Welle ${wave}`);
      showVoiceLine(`Tower: Massesignatur — ${bn}. Alle Kanäle feuerfrei.`);
      sfxBossAppear();
      setBgmLayer("boss");
      spawnBoss();
      waveSpawned = 1;
      forceBossNext = false;
    }
    else if (isBossWave(wave)) {
      const bn = BOSS_NAMES[bossStyle(virtualBossWave)];
      showToast(`BOSS · ${bn} — Welle ${wave}`);
      showVoiceLine(`Tower: Massesignatur — ${bn}. Alle Kanäle feuerfrei.`);
      sfxBossAppear();
      setBgmLayer("boss");
      spawnUfo();
      forceBossNext = false;
      // Boss-Vertrag verbraucht sich nach dem Spawn.
    } else {
      showToast(`Welle ${wave} — ${waveSpawnBudget} Kontakte`);
      const lines = [
        "Tower: Kontaktliste aktualisiert — viel Erfolg.",
        "Tower: Radargerät sauber — rein in die Welle.",
        "Tower: Treibstoff gut — wir halten dich im Loop.",
      ];
      showVoiceLine(lines[wave % lines.length]);
      sfxWave();
      setBgmLayer("combat");
    }
    syncHud();
    renderShop();
  }

  function beginShopPhase() {
    phase = "shop";
    body.classList.add("phase-shop");
    recordMetaWave(wave);
    upgradeHud.hidden = false;
    if (shopContinueBar) shopContinueBar.hidden = false;
    // QoL: open hangar as overlay over the game, snap to top.
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch (_) {
      window.scrollTo(0, 0);
    }
    wavePill.textContent = `Welle ${wave} ✓`;
    const bonus = Math.max(6, Math.floor((30 + wave * 16) * diff().waveClearBonusMul));
    credits += bonus;
    showToast(`Welle ${wave} clear · +${bonus} ₡`);
    // Wenn die Welle früh endet, liegen oft noch Pickups rum. In der Shop-Phase würden sie nicht mehr
    // eingesammelt werden -> also automatisch einsammeln (ohne Sound-Spam).
    if (pickups.length) {
      for (const p of pickups) applyPickup(p, true);
      pickups.length = 0;
    }
    showVoiceLine("Tower: Hangar offen — Credits klug investieren.");
    sfxWave();
    // kleiner "Hangar-Stinger" (fühlt sich nach Phase-Shift an)
    sfxBuy();
    setBgmLayer("shop");
    syncHud();
    renderShop();
  }

  function exitShopPhase() {
    if (phase !== "shop") return;
    if (hangarKickbackLevel > 0) {
      credits += 10 + wave * 3 + hangarKickbackLevel * 5;
    }
    wave++;
    beginCombatWave();
  }

  const SHOP_CATALOG = [
    {
      id: "rockets",
      ships: ["pulse", "beam"],
      tier: "std",
      tag: "Munition",
      label: "Raketen +5",
      detail: "Volle Ladung — Lager deckelt bei 50.",
      price: () => 30 + wave * 6,
      can() {
        return missileStock < 50;
      },
      buy() {
        missileStock = Math.min(50, missileStock + 5);
      },
    },
    {
      id: "rocket_pair",
      ships: ["pulse", "beam"],
      tier: "std",
      tag: "Munition",
      label: "Raketen +2",
      detail: "Kleiner Nachschub — guter Preis pro Rakete.",
      price: () => 18 + wave * 3,
      can() {
        return missileStock <= 48;
      },
      buy() {
        missileStock = Math.min(50, missileStock + 2);
      },
    },
    {
      id: "dmg",
      ships: ["pulse", "beam"],
      tier: "std",
      tag: "Waffe",
      label: "Feuerkraft +1",
      detailPulse: "Jeder Bolzen +1 Schaden (auch Spread).",
      detailBeam: "Strahl-Tick und Nova profitieren mit.",
      price: () => 48 + dmgShopLevel * 22,
      can() {
        return dmgShopLevel < 7;
      },
      buy() {
        dmgShopLevel++;
        bulletDmg++;
      },
    },
    {
      id: "shield",
      ships: ["pulse", "beam"],
      tier: "std",
      tag: "Abwehr",
      label: "Schild +1",
      detail: "Ein Treffer weniger weh — max. 7 Ladungen.",
      price: () => 36 + Math.floor(wave * 1.5),
      can() {
        return shieldCharges < 7;
      },
      buy() {
        shieldCharges = Math.min(7, shieldCharges + 1);
      },
    },
    {
      id: "shield_double",
      ships: ["pulse", "beam"],
      tier: "rare",
      tag: "Abwehr",
      label: "Doppelbarriere +2",
      detail: "Zwei Ladungen in einem Kauf (max. 7 gesamt).",
      price: () => 92 + wave * 14,
      can() {
        return shieldCharges <= 5;
      },
      buy() {
        shieldCharges = Math.min(7, shieldCharges + 2);
      },
    },
    {
      id: "life",
      ships: ["pulse", "beam"],
      tier: "std",
      tag: "Rumpf",
      label: "Extra Leben",
      detail: "Max. 8 Leben — steigt im Preis.",
      price: () => 128 + lifeBuys * 72,
      can() {
        return lifeBuys < 4 && lives < 8;
      },
      buy() {
        lifeBuys++;
        lives = Math.min(8, lives + 1);
      },
    },
    {
      id: "heal_kit",
      ships: ["pulse", "beam"],
      tier: "std",
      tag: "Rumpf",
      label: "Reparaturkit +1 HP",
      detail: "Nur wenn du unter dem Lebens-Maximum bist.",
      price: () => 58 + healKitBuys * 38 + wave * 4,
      can() {
        return healKitBuys < 3 && lives < 8;
      },
      buy() {
        healKitBuys++;
        lives = Math.min(8, lives + 1);
      },
    },
    {
      id: "credit_inject",
      ships: ["pulse", "beam"],
      tier: "std",
      tag: "Ökonomie",
      label: "Sofortliquidität",
      detail: "Credits direkt aufs Konto — Preis steigt leicht je Kauf.",
      price: () => 26 + creditInjectBuys * 16 + wave * 4,
      can() {
        return creditInjectBuys < 5;
      },
      buy() {
        creditInjectBuys++;
        credits += 52 + Math.floor(wave * 3.5);
      },
    },
    {
      id: "hangar_bonus",
      ships: ["pulse", "beam"],
      tier: "std",
      tag: "Ökonomie",
      label: "Tower-Bonus",
      detail: "Jedes Mal wenn du „Weiter“ drückst: automatische Nachzahlung.",
      price: () => 62 + hangarKickbackLevel * 48,
      can() {
        return hangarKickbackLevel < 4;
      },
      buy() {
        hangarKickbackLevel++;
      },
    },
    {
      id: "scav_salvage",
      ships: ["pulse", "beam"],
      tier: "std",
      tag: "Ökonomie",
      label: "Plünder-Sensor",
      detail: "Grüne Credit-Kisten im Feld zahlen spürbar mehr aus.",
      price: () => 48 + pickupCreditsBonus * 32,
      can() {
        return pickupCreditsBonus < 4;
      },
      buy() {
        pickupCreditsBonus++;
      },
    },
    {
      id: "bounty",
      ships: ["pulse", "beam"],
      tier: "rare",
      tag: "Ökonomie",
      label: "Kopfgeld",
      detail: "+5 % Kill-Credits pro Stufe (max. 5 Stufen = +25 %).",
      price: () => 92 + creditKillBonusLevel * 46 + wave * 7,
      can() {
        return creditKillBonusLevel < 5;
      },
      buy() {
        creditKillBonusLevel++;
      },
    },
    {
      id: "missile_tip",
      ships: ["pulse", "beam"],
      tier: "std",
      tag: "Munition",
      label: "Sprengspitze",
      detail: "Raketen treffen härter (+1 Basis je Stufe, max. 4).",
      price: () => 58 + missileDmgShopLevel * 32,
      can() {
        return missileDmgShopLevel < 4;
      },
      buy() {
        missileDmgShopLevel++;
      },
    },
    {
      id: "missile_servo",
      ships: ["pulse", "beam"],
      tier: "std",
      tag: "Munition",
      label: "Laderiegel",
      detail: "Raketen-Taste (E) feuert spürbar öfter.",
      price: () => 68 + missileServoLevel * 38,
      can() {
        return missileServoLevel < 3;
      },
      buy() {
        missileServoLevel++;
      },
    },
    {
      id: "thruster",
      ships: ["pulse", "beam"],
      tier: "std",
      tag: "Mobilität",
      label: "Schubvektor",
      detail: "Steuerung spürbar flotter — WASD / Pfeile / Wischen.",
      price: () => 58 + thrusterShopLevel * 34,
      can() {
        return thrusterShopLevel < 4;
      },
      buy() {
        thrusterShopLevel++;
      },
    },
    {
      id: "combo_relay",
      ships: ["pulse", "beam"],
      tier: "rare",
      tag: "Taktik",
      label: "Komborelais",
      detail: "Deutlich längeres Kombo-Fenster (max. 2 Stufen) — bleib im Flow.",
      price: () => 82 + comboExtendLevel * 48 + wave * 5,
      can() {
        return comboExtendLevel < 2;
      },
      buy() {
        comboExtendLevel++;
      },
    },
    {
      id: "bolt_bus",
      tier: "std",
      tag: "Puls",
      label: "Zielhilfe",
      detail: "Nur der mittlere Bolzen profitiert (+9 % je Stufe, max. 3).",
      ships: ["pulse"],
      price: () => 74 + boltFocusLevel * 42,
      can() {
        return shipClass === "pulse" && boltFocusLevel < 3;
      },
      buy() {
        boltFocusLevel++;
      },
    },
    {
      id: "rapid",
      tier: "std",
      tag: "Puls",
      label: "Feuertempo",
      detail: "Kürzere Pause zwischen Bolzen (stärker als Feld-Pickups).",
      ships: ["pulse"],
      price: () => 58 + Math.floor((1 / fireMul) * 14),
      can() {
        return shipClass === "pulse" && fireMul > 0.38;
      },
      buy() {
        fireMul *= 0.898;
      },
    },
    {
      id: "spread",
      tier: "rare",
      tag: "Puls",
      label: "Spread-Stufe",
      detail: "Extra-Seitenbolzen — Außenlinien sind absichtlich viel schwächer.",
      ships: ["pulse"],
      price: () => 148 + spreadLevel * 88,
      can() {
        return spreadLevel < 3 && shipClass === "pulse";
      },
      buy() {
        spreadLevel++;
      },
    },
    {
      id: "cool",
      tier: "std",
      tag: "Strahl",
      label: "Kühlrippe",
      detail: "Strahl erzeugt weniger Hitze; Passivkühlung steigt.",
      ships: ["beam"],
      price: () => 40 + coolShopLevel * 28,
      can() {
        return shipClass === "beam" && coolShopLevel < 6;
      },
      buy() {
        coolShopLevel++;
        heatPerShot *= 0.87;
        coolBonus += 0.11;
      },
    },
    {
      id: "beam_sink",
      tier: "rare",
      tag: "Strahl",
      label: "Wärmesenke",
      detail: "Solange du strahlst: Hitze staut langsamer.",
      ships: ["beam"],
      price: () => 84 + beamDissipLevel * 46 + wave * 5,
      can() {
        return shipClass === "beam" && beamDissipLevel < 4;
      },
      buy() {
        beamDissipLevel++;
      },
    },
    {
      id: "beam_coil",
      tier: "rare",
      tag: "Strahl",
      label: "Teilfokus-Spule",
      detail: "Strahl tickt schneller = mehr Treffer pro Sekunde.",
      ships: ["beam"],
      price: () => 102 + beamCoilLevel * 52 + wave * 6,
      can() {
        return shipClass === "beam" && beamCoilLevel < 4;
      },
      buy() {
        beamCoilLevel++;
      },
    },
    {
      id: "beam_splash",
      tier: "rare",
      tag: "Strahl",
      label: "Ion-Diffusor",
      detail: "Strahl-Treffer machen Splash-Schaden um das Ziel (max. 3).",
      ships: ["beam"],
      price: () => 96 + beamSplashLevel * 54 + wave * 6,
      can() {
        return shipClass === "beam" && beamSplashLevel < 3;
      },
      buy() {
        beamSplashLevel++;
      },
    },
    {
      id: "capacitor",
      tier: "std",
      tag: "Strahl",
      label: "Kondensator",
      detail: "Wenn du nicht strahlst: Leiste sinkt schneller.",
      ships: ["beam"],
      price: () => 56 + capacitorLevel * 34,
      can() {
        return shipClass === "beam" && capacitorLevel < 3;
      },
      buy() {
        capacitorLevel++;
      },
    },
    {
      id: "overheat_vent",
      tier: "std",
      tag: "Strahl",
      label: "Sicherheitsventil",
      detail: "Kürzere Überhitzung und schnelleres Freigeben der Waffe.",
      ships: ["beam"],
      price: () => 78 + overheatServoLevel * 46,
      can() {
        return shipClass === "beam" && overheatServoLevel < 3;
      },
      buy() {
        overheatServoLevel++;
      },
    },
    {
      id: "nova_prism",
      ships: ["pulse", "beam"],
      tier: "epic",
      tag: "Nova",
      label: "Entlade-Prisma",
      detail: "Kürzere Nova-Wartezeit — nur sinnvoll mit Nova-Kern.",
      price: () => 180 + novaCdReliefLevel * 70 + wave * 22,
      can() {
        return hasNovaCore && novaCdReliefLevel < 5;
      },
      buy() {
        novaCdReliefLevel++;
      },
    },
    {
      id: "contract_cash_stress",
      ships: ["pulse", "beam"],
      tier: "rare",
      tag: "Vertrag",
      label: "Vertrag: Sofort-Cash",
      detail: "+150 ₡ jetzt — aber nächste Welle: schnellerer Spawn & weniger Drops.",
      price: () => 0,
      can() {
        return phase === "shop" && !contractCashUsed;
      },
      buy() {
        contractCashUsed = true;
        credits += 150;
        stressNext = Math.min(3, stressNext + 1);
        pickupDropMulNext = Math.max(0.55, (pickupDropMulNext || 1) * 0.78);
        showToast("Vertrag angenommen · Cash jetzt, Stress später.");
      },
    },
    {
      id: "contract_boss_early",
      ships: ["pulse", "beam"],
      tier: "epic",
      tag: "Vertrag",
      label: "Vertrag: Boss-Signal",
      detail: "+220 ₡ jetzt — aber nächste Welle wird ein Boss (früher als geplant).",
      price: () => 0,
      can() {
        return phase === "shop" && !contractBossUsed && !forceBossNext;
      },
      buy() {
        contractBossUsed = true;
        credits += 220;
        forceBossNext = true;
        stressNext = Math.min(3, stressNext + 1);
        showToast("WARNUNG · Boss-Signal in der nächsten Welle.");
      },
    },
    {
      id: "rocket_splash",
      ships: ["pulse", "beam"],
      tier: "epic",
      tag: "Episch",
      label: "Fragmentation",
      detail: "Einmalig: Raketen machen Flächenschaden am Einschlag.",
      price: () => 285 + wave * 52,
      can() {
        return !hasRocketSplash;
      },
      buy() {
        hasRocketSplash = true;
      },
    },
    {
      id: "nova_core",
      ships: ["pulse", "beam"],
      tier: "epic",
      tag: "Episch",
      label: "Nova-Kern",
      detail: "Einmalig: Taste Q — große Schockwelle.",
      price: () => 418 + wave * 78,
      can() {
        return !hasNovaCore;
      },
      buy() {
        hasNovaCore = true;
        novaCooldownMs = 0;
      },
    },
  ];

  function shopTierRank(t) {
    return t === "epic" ? 2 : t === "rare" ? 1 : 0;
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove("show"), 2400);
  }

  function burst(x, y, col, n = 20, opts = {}) {
    const grav = opts.grav ?? 52;
    const lifeM = opts.lifeM ?? 1;
    const add = !!opts.add;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.85;
      const sp = (opts.spd0 ?? 160) + Math.random() * (opts.spd1 ?? 380);
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: (0.45 + Math.random() * 0.45) * lifeM,
        col,
        s: (opts.smin ?? 1.5) + Math.random() * (opts.smax ?? 5.5),
        grav,
        add,
        spin: (Math.random() - 0.5) * 0.02,
      });
    }
  }

  function ringBurst(x, y, col, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      const sp = 220 + Math.random() * 120;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.55 + Math.random() * 0.35,
        col,
        s: 2 + Math.random() * 4,
        grav: 12,
        add: true,
        spin: 0,
      });
    }
  }

  function spawnIntervalMs() {
    const pending = waveSpawnBudget - waveSpawned;
    const rush = pending > 14 ? 0.72 : pending > 8 ? 0.85 : 1;
    // Stress-Vertrag: schnelleres Spawnen in der nächsten Welle (risk/reward)
    const stressMul = Math.max(0.58, 1 - stressNext * 0.12);
    return Math.max(
      232,
      (538 - wave * 17 - Math.min(score, 260) * 0.72) * rush * diff().spawnIntervalMul * stressMul
    );
  }

  function comboRefreshMs() {
    return 820 + comboExtendLevel * 125;
  }

  function syncComboStage() {
    if (!comboStage || !comboBigNum || !comboBarFill) return;
    const show = running && phase === "combat" && combo > 1;
    comboStage.hidden = !show;
    if (!show) return;
    comboBigNum.textContent = String(combo);
    const denom = Math.max(1, comboTimerMax);
    const pct = Math.max(0, Math.min(100, (comboTimerMs / denom) * 100));
    comboBarFill.style.width = `${pct}%`;
    comboStage.classList.toggle("comboStage--hot", combo >= 6);
    comboStage.classList.toggle("comboStage--mega", combo >= 12 && combo < 20);
    comboStage.classList.toggle("comboStage--insane", combo >= 20);
  }

  function syncHud() {
    const showBeamHeat = shipClass === "beam" && phase === "combat" && running;
    if (canvasWrap) canvasWrap.classList.toggle("canvasWrap--strahlHud", showBeamHeat);
    if (heatDock) {
      heatDock.hidden = !showBeamHeat;
      if (showBeamHeat && heatFill && heatPct) {
        const h = Math.min(100, Math.max(0, heat));
        heatFill.style.width = `${h}%`;
        heatPct.textContent = `${Math.round(h)}%`;
        if (heatLabel) {
          heatLabel.textContent = overheatLock > 0 ? "Überhitzung" : "Wärme";
        }
        heatDock.classList.toggle("heatDock--warn", h >= 52 && overheatLock <= 0);
        heatDock.classList.toggle("heatDock--hot", h >= 68 && overheatLock <= 0);
        heatDock.classList.toggle("heatDock--critical", h >= 82 && overheatLock <= 0);
        heatDock.classList.toggle("heatDock--locked", overheatLock > 0);
        heatDock.setAttribute(
          "aria-valuetext",
          overheatLock > 0 ? "Überhitzung, Waffe gesperrt" : `Wärme ${Math.round(h)} von 100`
        );
      } else if (heatDock) {
        heatDock.classList.remove("heatDock--warn", "heatDock--hot", "heatDock--critical", "heatDock--locked");
      }
    }
    creditsEl.textContent = String(credits);
    if (phase === "combat" && waveSpawnBudget > 0) {
      const rest = waveSpawnBudget - waveSpawned + ufos.length;
      const elites = ufos.reduce((n, u) => n + (u && u.elite ? 1 : 0), 0);
      const nb = nextBossWave(wave);
      enemiesHud.textContent = `Rest ${rest}${elites ? ` · Elite ${elites}` : ""} · Boss ${nb}`;
    } else if (phase === "shop") {
      enemiesHud.textContent = "Hangar";
    } else {
      enemiesHud.textContent = "—";
    }
    diffHud.hidden = !startOverlay.hidden;
    diffHud.textContent = `${diff().label} · ${SHIP_LABELS[shipClass] || shipClass}`;

    if (hasNovaCore) {
      novaTag.hidden = false;
      const ch = Math.max(0, novaCharges | 0);
      novaCd.textContent = ch > 0 ? `◆${ch}` : novaCooldownMs > 0 ? `${Math.ceil(novaCooldownMs / 1000)}s` : "◆";
    } else {
      novaTag.hidden = true;
    }

    shieldTag.hidden = shieldCharges <= 0;
    shieldNum.textContent = String(shieldCharges);
    rocketNum.textContent = String(missileStock);
    const bits = [];
    if (shipClass === "pulse" && fireMul < 0.99) bits.push(`Feuer ×${(1 / fireMul).toFixed(1)}`);
    if (spreadLevel > 0 && shipClass === "pulse") bits.push(`Spread ${spreadLevel}`);
    if (bulletDmg > 1) bits.push(`DMG ${bulletDmg}`);
    if (hasRocketSplash) bits.push("Frag");
    if (hasNovaCore) bits.push("Nova");
    if (shipClass === "beam" && coolShopLevel > 0) bits.push(`Kühl ×${coolShopLevel}`);
    if (creditKillBonusLevel > 0) bits.push(`Kopfgeld ×${creditKillBonusLevel}`);
    if (missileDmgShopLevel > 0) bits.push(`Rkt+${missileDmgShopLevel}`);
    if (thrusterShopLevel > 0) bits.push(`Schub ×${thrusterShopLevel}`);
    if (shipClass === "beam" && beamCoilLevel > 0) bits.push(`Spule ×${beamCoilLevel}`);
    if (shipClass === "beam" && beamSplashLevel > 0) bits.push(`Splash ×${beamSplashLevel}`);
    if (hangarKickbackLevel > 0) bits.push(`Tower+×${hangarKickbackLevel}`);
    if (weaponMod !== "standard") bits.push(`Mod: ${MOD_LABELS[weaponMod] || weaponMod}`);
    upTag.textContent = bits.length ? bits.join(" · ") : "—";
    syncComboStage();
  }

  function renderShop() {
    if (shopSubline) {
      shopSubline.textContent =
        shipClass === "beam"
          ? "Strahl: Kühlung & Wärme bändigen, Spule für mehr DPS. Unten: Weiter in die nächste Welle."
          : "Puls: Feuertempo & Zielhilfe — Spread für Breite (Außen schwächer). Unten: Weiter.";
    }
    if (shopCreditsVal) shopCreditsVal.textContent = String(credits);
    shopGrid.innerHTML = "";
    const shopActive = phase === "shop";
    const rows = SHOP_CATALOG.filter((item) => (item.ships || []).includes(shipClass));
    const esc = (s) =>
      String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const detailFor = (item) =>
      shipClass === "beam" && item.detailBeam
        ? item.detailBeam
        : shipClass === "pulse" && item.detailPulse
          ? item.detailPulse
          : item.detail;

    const visible = rows
      .filter((item) => {
        const tier = item.tier || "std";
        const tag = item.tag || "";
        const price = shopPriceCredits(item.price());
        const canBuy = shopActive && item.can() && credits >= price;
        if (shopFilter === "all") return true;
        if (shopFilter === "affordable") return canBuy;
        if (shopFilter === "epic") return tier === "epic";
        return tag === shopFilter;
      })
      .sort(
        (a, b) =>
          shopTierRank(a.tier || "std") - shopTierRank(b.tier || "std") ||
          String(a.tag || "").localeCompare(String(b.tag || "")) ||
          String(a.id).localeCompare(String(b.id))
      );

    const sectionOrder = ["Waffe", "Munition", "Abwehr", "Rumpf", "Mobilität", "Taktik", "Ökonomie", "Puls", "Strahl", "Nova", "Episch"];
    const tagRank = (t) => {
      const i = sectionOrder.indexOf(t);
      return i === -1 ? 999 : i;
    };
    visible.sort((a, b) => tagRank(a.tag || "") - tagRank(b.tag || "") || (shopTierRank(a.tier || "std") - shopTierRank(b.tier || "std")) || String(a.id).localeCompare(String(b.id)));

    let currentTag = "";
    for (const item of visible) {
      const tier = item.tier === "epic" ? "epic" : item.tier === "rare" ? "rare" : "std";
      const tag = item.tag || (tier === "epic" ? "Episch" : tier === "rare" ? "Rar" : "Hangar");
      if (tag !== currentTag) {
        currentTag = tag;
        const h = document.createElement("div");
        h.className = "shopSectionTitle";
        h.textContent = tag;
        shopGrid.append(h);
      }

      const price = shopPriceCredits(item.price());
      const can = item.can();
      const affordable = credits >= price;
      const canBuy = shopActive && can && affordable;
      const state = !can ? "MAX" : !shopActive ? "PAUSE" : affordable ? "KAUFBAR" : "ZU TEUER";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `shopCard shopCard--${tier}`;
      btn.disabled = !canBuy;
      const stateCls = !can ? "shopCard-state--max" : affordable ? "shopCard-state--buy" : "shopCard-state--poor";
      btn.innerHTML = `<span class="shopCard-inner"><span class="shopCard-tag">${esc(tier === "epic" ? "EPISCH" : tier === "rare" ? "RAR" : "HANGAR")}</span><span class="shopCard-title">${esc(item.label)}</span><span class="shopCard-detail">${esc(detailFor(item) || " ")}</span><span class="shopCard-priceRow"><span class="shopCard-price">${price} ₡</span><span class="shopCard-state ${stateCls}">${esc(state)}</span></span></span>`;
      btn.addEventListener("click", () => {
        if (phase !== "shop") return;
        const p = shopPriceCredits(item.price());
        if (credits < p || !item.can()) return;
        credits -= p;
        item.buy();
        sfxBuy();
        if (navigator.vibrate) navigator.vibrate([20, 35, 18]);
        syncHud();
        scoreEl.textContent = String(score);
        livesEl.textContent = String(lives);
        renderShop();
      });
      shopGrid.append(btn);
    }
  }

  function seedStars() {
    stars = Array.from({ length: 160 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: 0.35 + Math.random() * 2.6,
      tw: Math.random() * Math.PI * 2,
      layer: Math.random() < 0.32 ? 0 : Math.random() < 0.48 ? 1 : 2,
    }));
  }

  function resetGame() {
    score = 0;
    credits = 0;
    lives = diff().livesStart;
    wave = 1;
    heat = 0;
    overheatLock = 0;
    shieldCharges = 0;
    missileStock = 4;
    fireMul = 1;
    spreadLevel = 0;
    bulletDmg = 1;
    heatPerShot = 19;
    coolBonus = 1;
    dmgShopLevel = 0;
    coolShopLevel = 0;
    lifeBuys = 0;
    creditKillBonusLevel = 0;
    missileDmgShopLevel = 0;
    thrusterShopLevel = 0;
    beamCoilLevel = 0;
    beamDissipLevel = 0;
    beamSplashLevel = 0;
    missileServoLevel = 0;
    boltFocusLevel = 0;
    overheatServoLevel = 0;
    capacitorLevel = 0;
    comboExtendLevel = 0;
    healKitBuys = 0;
    creditInjectBuys = 0;
    novaCdReliefLevel = 0;
    hangarKickbackLevel = 0;
    pickupCreditsBonus = 0;
    contractCashUsed = false;
    contractBossUsed = false;
    combo = 0;
    comboTimerMs = 0;
    comboTimerMax = 1;
    comboRumble = 0;
    hitstopMs = 0;
    lastOneLifeVoiceWave = -999;
    if (shipClass === "beam" && weaponMod === "bbulk") shieldCharges = 1;
    if (shipClass === "pulse" && weaponMod === "pwolke") spreadLevel = 1;
    jet.x = Math.min(jetXMax, Math.max(jetXMin, 160));
    jet.y = H / 2 - jet.h / 2;
    ufos.length = 0;
    particles.length = 0;
    spawnAcc = 0;
    screenFlash = 0;
    screenFlashKind = "ice";
    bossHitFx = 0;
    lastBossHitSfx = 0;
    hasRocketSplash = false;
    hasNovaCore = false;
    novaCharges = 0;
    novaCooldownMs = 0;
    novaKeyLatch = false;
    lastBeamTick = 0;
    lastBeamSfx = 0;
    phase = "combat";
    body.classList.remove("phase-shop");
    upgradeHud.hidden = true;
    scoreEl.textContent = "0";
    livesEl.textContent = String(lives);
    beginCombatWave();
  }

  function collides(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function applyExplosionDamage(px, py, radius, dmg, excludeIndex) {
    for (let j = ufos.length - 1; j >= 0; j--) {
      if (j === excludeIndex) continue;
      const o = ufos[j];
      const cx = o.x + o.w / 2;
      const cy = o.y + o.h / 2;
      const rr = radius + Math.max(o.w, o.h) * 0.28;
      if ((cx - px) ** 2 + (cy - py) ** 2 > rr * rr) continue;
      o.hp -= dmg;
      if (o.boss && o.hp > 0) {
        bossHitFx = Math.min(1, bossHitFx + 0.12);
        burst(px, py, "#ffdd88", 6, { add: true, spd0: 40, spd1: 180, lifeM: 0.35 });
      }
      if (o.hp <= 0) {
        const ucx = o.x + o.w / 2;
        const ucy = o.y + o.h / 2;
        onUfoDestroyed(o, ucx, ucy);
        ufos.splice(j, 1);
        checkWaveComplete();
      }
    }
  }

  function findBeamTarget() {
    const x0 = jet.x + jet.w - 10;
    const y0 = jet.y + jet.h / 2;
    const band = 17;
    let best = null;
    let bestX = Infinity;
    for (const u of ufos) {
      if (u.x + u.w < x0) continue;
      if (u.y + u.h < y0 - band || u.y > y0 + band) continue;
      if (u.x < bestX) {
        bestX = u.x;
        best = u;
      }
    }
    const x1 = best ? Math.min(W - 20, best.x + best.w * 0.35) : W - 24;
    return { target: best, x0, y0, x1 };
  }

  function tickBeamDamage(now) {
    const { target, x0, y0 } = findBeamTarget();
    if (target) {
      let beamDmg = Math.max(0.55, bulletDmg * 0.48);
      if (weaponMod === "bflux") beamDmg *= 1.12;
      if (weaponMod === "bbreach" && target.kind === "tank") beamDmg *= 1.28;
      target.hp -= beamDmg;
      burst(x0 + 20, y0, "rgba(255,200,180,0.9)", 3, { add: true, spd0: 40, spd1: 120, lifeM: 0.35 });
      // Strahlenjäger-AoE: kleiner Splash um das Ziel, damit Beam nicht "single target only" ist.
      // Baseline sehr klein, Upgrade skaliert spürbar.
      const baseSplash = 0.16;
      const splashMul = baseSplash + beamSplashLevel * 0.12;
      if (splashMul > 0.01) {
        const ti = ufos.indexOf(target);
        const splashR = 66 + beamSplashLevel * 14 + Math.min(20, beamCoilLevel * 3);
        const splashD = Math.max(0.35, beamDmg * splashMul);
        applyExplosionDamage(x0 + 20, y0, splashR, splashD, ti);
        if (beamSplashLevel > 0) burst(x0 + 20, y0, "rgba(120,220,255,0.75)", 2, { add: true, spd0: 30, spd1: 110, lifeM: 0.25 });
      }
      if (target.boss && target.hp > 0) {
        bossHitFx = Math.min(1, bossHitFx + 0.08);
        triggerHitstop(36);
        shake = Math.min(42, shake + 5);
        if (now - lastBossHitSfx > 130) {
          lastBossHitSfx = now;
          sfxBossHit();
        }
      }
      if (target.hp <= 0) {
        const ucx = target.x + target.w / 2;
        const ucy = target.y + target.h / 2;
        const ti = ufos.indexOf(target);
        onUfoDestroyed(target, ucx, ucy);
        if (ti >= 0) ufos.splice(ti, 1);
        checkWaveComplete();
      }
    }
    if (now - lastBeamSfx > 110) {
      lastBeamSfx = now;
      sfxBeam();
    }
  }

  function triggerNovaExplosion() {
    if (!hasNovaCore || phase !== "combat") return;
    if (novaCharges <= 0 && novaCooldownMs > 0) return;
    const px = jet.x + jet.w * 0.55;
    const py = jet.y + jet.h * 0.5;
    // Rework: größerer Radius, räumt Gegnerkugeln weg, kurzer Slowmo -> fühlt sich "wertvoll" an.
    const R = 360;
    const dmg = Math.ceil(4.6 + bulletDmg * 1.35);
    if (novaCharges > 0) novaCharges--;
    novaCooldownMs = Math.max(4200, 7800 - novaCdReliefLevel * 520);
    screenFlash = Math.min(1, 0.52);
    screenFlashKind = "boss";
    shake = Math.min(44, shake + 22);
    triggerHitstop(92);
    sfxNova();
    burst(px, py, "#ffd76a", 64, { add: true, lifeM: 1.2, spd0: 120, spd1: 620 });
    burst(px, py, "#9ad0ff", 48, { grav: 18, spd0: 90, spd1: 520, lifeM: 1.05 });
    ringBurst(px, py, "#ffa8ff", 26);
    ringBurst(px, py, "rgba(120, 220, 255, 0.9)", 20);
    // Bullet clear: macht Nova viel leichter "sinnvoll" einzusetzen.
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const eb = enemyBullets[i];
      const cx = eb.x + eb.w / 2;
      const cy = eb.y + eb.h / 2;
      if ((cx - px) ** 2 + (cy - py) ** 2 <= (R + 40) ** 2) {
        enemyBullets.splice(i, 1);
      }
    }
    for (let j = ufos.length - 1; j >= 0; j--) {
      const u = ufos[j];
      const cx = u.x + u.w / 2;
      const cy = u.y + u.h / 2;
      const rr = R + Math.max(u.w, u.h) * 0.3;
      if ((cx - px) ** 2 + (cy - py) ** 2 > rr * rr) continue;
      u.hp -= dmg;
      if (u.boss && u.hp > 0) bossHitFx = Math.min(1, bossHitFx + 0.15);
      if (u.hp <= 0) {
        const ucx = u.x + u.w / 2;
        const ucy = u.y + u.h / 2;
        onUfoDestroyed(u, ucx, ucy);
        ufos.splice(j, 1);
        checkWaveComplete();
      }
    }
    if (navigator.vibrate) navigator.vibrate([25, 35, 25, 60]);
    syncHud();
    renderShop();
  }

  function pickEnemyKind() {
    // Progression: am Anfang nur schwach, dann pro "Meilenstein-Welle" neue Arten.
    const r = Math.random() * 100;
    if (wave <= 2) return r < 60 ? "scout" : "wobbler";
    if (wave === 3) return r < 45 ? "scout" : r < 75 ? "wobbler" : "swarm";
    if (wave === 4) return r < 34 ? "scout" : r < 62 ? "wobbler" : r < 84 ? "swarm" : "hunter";
    if (wave === 5) return r < 26 ? "scout" : r < 52 ? "wobbler" : r < 74 ? "swarm" : r < 92 ? "hunter" : "tank";
    // Ab Welle 6: neuer Anti-Spread Gegner "prism"
    return r < 18
      ? "scout"
      : r < 38
        ? "wobbler"
        : r < 60
          ? "swarm"
          : r < 78
            ? "hunter"
            : r < 92
              ? "tank"
              : "prism";
  }

  function pushBossBullet(ox, oy, ang, sp, sz = 15) {
    enemyBullets.push({
      x: ox,
      y: oy,
      w: sz,
      h: sz,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp,
      bossBullet: true,
    });
  }

  function spawnBoss() {
    const st = bossStyle(wave);
    const tierM = bossHpTierMul(wave);
    const dLife = difficulty === "easy" ? 0.84 : difficulty === "hard" ? 1.2 : 1;
    // Boss-Buff (massiv): die sollen Endgegner sein.
    const baseHp = 120 + wave * 14;
    const hp = Math.max(90, Math.round(baseHp * tierM * dLife));
    const vm = diff().enemyVxMul;
    const bmul = diff().tankBulletSpdMul;

    if (st === 0) {
      ufos.push({
        kind: "boss",
        bossStyle: 0,
        boss: true,
        hp,
        maxHp: hp,
        x: W + 24,
        y: H / 2 - 66,
        w: 286,
        h: 132,
        vx: -46 * vm,
        vy: 0,
        t: 0,
        shootT: 520,
        pts: 300 + wave * 48,
        drop: 0.94,
        bmul,
      });
      return;
    }
    if (st === 1) {
      const baseY = 100 + Math.random() * (H - 260);
      ufos.push({
        kind: "boss",
        bossStyle: 1,
        boss: true,
        hp,
        maxHp: hp,
        x: W + 50,
        y: baseY,
        baseY,
        w: 232,
        h: 56,
        vx: -118 * vm,
        vy: 0,
        t: 0,
        shootT: 250,
        pts: 360 + wave * 54,
        drop: 0.9,
        bmul,
      });
      return;
    }
    if (st === 2) {
      const cy = H * 0.5;
      ufos.push({
        kind: "boss",
        bossStyle: 2,
        boss: true,
        hp: Math.round(hp * 1.1),
        maxHp: Math.round(hp * 1.1),
        x: W + 30,
        y: cy - 92,
        w: 184,
        h: 184,
        vx: -36 * vm,
        vy: 0,
        t: 0,
        shootT: 1250,
        centerY: cy,
        pts: 400 + wave * 58,
        drop: 0.88,
        bmul,
      });
      return;
    }
    if (st === 3) {
      ufos.push({
        kind: "boss",
        bossStyle: 3,
        boss: true,
        hp: Math.round(hp * 1.06),
        maxHp: Math.round(hp * 1.06),
        x: W + 28,
        y: H / 2 - 72,
        w: 262,
        h: 144,
        vx: -52 * vm,
        vy: 0,
        t: 0,
        shootT: 470,
        pts: 440 + wave * 62,
        drop: 0.86,
        bmul,
      });
      return;
    }
    if (st === 4) {
      ufos.push({
        kind: "boss",
        bossStyle: 4,
        boss: true,
        hp: Math.round(hp * 1.08),
        maxHp: Math.round(hp * 1.08),
        x: W + 20,
        y: H / 2 - 70,
        w: 298,
        h: 128,
        vx: -40 * vm,
        vy: 0,
        t: 0,
        shootT: 660,
        pts: 460 + wave * 64,
        drop: 0.9,
        bmul,
      });
      return;
    }
    if (st === 5) {
      const baseY = 90 + Math.random() * (H - 240);
      ufos.push({
        kind: "boss",
        bossStyle: 5,
        boss: true,
        hp: Math.round(hp * 0.96),
        maxHp: Math.round(hp * 0.96),
        x: W + 44,
        y: baseY,
        baseY,
        w: 248,
        h: 52,
        vx: -132 * vm,
        vy: 0,
        t: 0,
        shootT: 220,
        pts: 420 + wave * 58,
        drop: 0.88,
        bmul,
      });
      return;
    }
    if (st === 6) {
      const cy = H * 0.5;
      ufos.push({
        kind: "boss",
        bossStyle: 6,
        boss: true,
        hp: Math.round(hp * 1.14),
        maxHp: Math.round(hp * 1.14),
        x: W + 26,
        y: cy - 96,
        w: 196,
        h: 196,
        vx: -32 * vm,
        vy: 0,
        t: 0,
        shootT: 1080,
        centerY: cy,
        pts: 480 + wave * 66,
        drop: 0.87,
        bmul,
      });
      return;
    }
    ufos.push({
      kind: "boss",
      bossStyle: 7,
      boss: true,
      hp: Math.round(hp * 1.1),
      maxHp: Math.round(hp * 1.1),
      x: W + 30,
      y: H / 2 - 78,
      w: 272,
      h: 152,
      vx: -48 * vm,
      vy: 0,
      t: 0,
      shootT: 400,
      pts: 500 + wave * 68,
      drop: 0.85,
      bmul,
    });
  }

  function spawnUfo() {
    if (phase !== "combat" || waveSpawned >= waveSpawnBudget) return;
    waveSpawned++;
    if ((forceBossNext || isBossWave(wave)) && waveSpawned === 1) {
      spawnBoss();
      return;
    }
    const kind = pickEnemyKind();
    const vm = diff().enemyVxMul;
    const dTankCd = diff().tankShootCooldownMul;
    // Mid-/Late-Scaling: macht Gegner zäher, wenn du voll ausgebaut bist.
    const hpWaveMul = wave <= 5 ? 1 : wave <= 10 ? 1.2 : wave <= 18 ? 1.45 : 1.75;

    if (kind === "prism") {
      // Anti-Spread: schluckt kleine Treffer (Side-Bolts), will "Center Bolt / Beam / Rocket / Nova".
      const h = 46 + Math.random() * 10;
      const w = h * 1.3;
      const hp = Math.max(6, Math.round((6 + wave * 1.35) * hpWaveMul));
      ufos.push({
        kind,
        hp,
        maxHp: hp,
        x: W + 18,
        y: 34 + Math.random() * (H - 68 - h),
        w,
        h,
        vx: -(170 + wave * 10 + Math.random() * 60) * vm,
        vy: (Math.random() - 0.5) * 28,
        t: 0,
        pts: 32 + hp * 10,
        drop: 0.22,
        shootT: 9999,
        prism: true,
      });
      decorateElite(ufos[ufos.length - 1]);
      return;
    }

    if (kind === "swarm") {
      const h = 18 + Math.random() * 8;
      const w = h * 1.2;
      ufos.push({
        kind,
        hp: Math.max(1, Math.round(1 * hpWaveMul)),
        maxHp: Math.max(1, Math.round(1 * hpWaveMul)),
        x: W + 12,
        y: 50 + Math.random() * (H - 100 - h),
        w,
        h,
        vx: -(380 + Math.random() * 160 + wave * 15) * vm,
        vy: (Math.random() - 0.5) * 40,
        t: 0,
        pts: 8,
        drop: 0.08,
        shootT: 9999,
      });
      decorateElite(ufos[ufos.length - 1]);
      return;
    }
    if (kind === "scout") {
      const h = 32 + Math.random() * 14;
      const w = h * 1.25;
      ufos.push({
        kind,
        hp: Math.max(1, Math.round(1 * hpWaveMul)),
        maxHp: Math.max(1, Math.round(1 * hpWaveMul)),
        x: W + 16,
        y: 44 + Math.random() * (H - 88 - h),
        w,
        h,
        vx: -(260 + Math.random() * 140 + wave * 14 + Math.min(score, 200) * 0.18) * vm,
        vy: 0,
        t: 0,
        pts: 15,
        drop: 0.15,
        shootT: 9999,
      });
      decorateElite(ufos[ufos.length - 1]);
      return;
    }
    if (kind === "wobbler") {
      const h = 38 + Math.random() * 14;
      const w = h * 1.3;
      const baseY = 56 + Math.random() * (H - 112 - h);
      const wh = diff().wobblerHp;
      ufos.push({
        kind,
        hp: Math.max(1, Math.round(wh * hpWaveMul)),
        maxHp: Math.max(1, Math.round(wh * hpWaveMul)),
        x: W + 16,
        y: baseY,
        baseY,
        w,
        h,
        vx: -(190 + Math.random() * 95 + wave * 10) * vm,
        vy: 0,
        t: Math.random() * 6,
        pts: 26,
        drop: 0.24,
        shootT: 9999,
      });
      decorateElite(ufos[ufos.length - 1]);
      return;
    }
    if (kind === "hunter") {
      const h = 34 + Math.random() * 12;
      const w = h * 1.2;
      ufos.push({
        kind,
        hp: Math.max(1, Math.round(2 * hpWaveMul)),
        maxHp: Math.max(1, Math.round(2 * hpWaveMul)),
        x: W + 16,
        y: 48 + Math.random() * (H - 96 - h),
        w,
        h,
        vx: -(320 + Math.random() * 130 + wave * 12) * vm,
        vy: 0,
        t: 0,
        pts: 22,
        drop: 0.22,
        shootT: 9999,
      });
      decorateElite(ufos[ufos.length - 1]);
      return;
    }
    const h = 58 + Math.random() * 22;
    const w = h * 1.15;
    const hp = Math.max(
      2,
      5 + Math.floor((wave * 3 + Math.min(score, 400)) / 90) + diff().tankHpExtra
    );
    ufos.push({
      kind: "tank",
      hp: Math.max(2, Math.round(hp * hpWaveMul)),
      maxHp: Math.max(2, Math.round(hp * hpWaveMul)),
      x: W + 16,
      y: 40 + Math.random() * (H - 80 - h),
      w,
      h,
      vx: -(92 + Math.random() * 52 + wave * 5) * vm,
      vy: 0,
      t: 0,
      pts: 18 + hp * 12,
      drop: 0.62,
      shootT: Math.max(380, 1600 + Math.random() * 800 - wave * 35) * dTankCd,
    });
    decorateElite(ufos[ufos.length - 1]);
  }

  function spreadSideBoltDamage() {
    if (spreadLevel <= 0) return bulletDmg;
    const mult = Math.max(0.13, 0.28 - spreadLevel * 0.065);
    return Math.max(1, Math.round(bulletDmg * mult));
  }

  function missileCooldownMs() {
    return Math.max(232, 400 - missileServoLevel * 52);
  }

  function beamTickIntervalMs() {
    return Math.max(46, 78 - beamCoilLevel * 7);
  }

  function spawnPickup(x, y) {
    const kinds = [
      "rapid",
      "dmg",
      // weniger DMG-Pickups -> weniger "Snowball"
      "shield",
      "credits",
      // weniger Credits im Feld
      "spread",
    ];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    pickups.push({
      kind,
      x,
      y,
      w: 26,
      h: 26,
      vx: -38 - Math.random() * 48,
      vy: (Math.random() - 0.5) * 36,
      t: 0,
    });
  }

  function tryShoot(now) {
    if (shipClass === "beam") return;
    if (phase !== "combat") return;
    const salveMul = weaponMod === "psalve" ? 0.88 : 1;
    const cd = pulseBaseCooldownMs * fireMul * salveMul;
    if (now - lastShot < cd) return;
    lastShot = now;
    sfxShoot();

    const baseY = jet.y + jet.h / 2 - 4;
    const baseX = jet.x + jet.w - 8;
    const sideDmg = spreadSideBoltDamage();
    const centerDmg = Math.max(1, Math.round(bulletDmg * (1 + 0.09 * boltFocusLevel)));
    const push = (angDeg, vxBoost, dmgOverride) => {
      const rad = (angDeg * Math.PI) / 180;
      const spd = 980 + vxBoost;
      const dm = dmgOverride ?? bulletDmg;
      bullets.push({
        x: baseX,
        y: baseY,
        w: 14 + dm * 2,
        h: 5 + Math.min(dm, 5),
        vx: spd * Math.cos(rad),
        vy: spd * Math.sin(rad),
        dmg: dm,
      });
    };
    push(0, bulletDmg * 48, centerDmg);
    if (spreadLevel >= 1) {
      push(-6.5, 0, sideDmg);
      push(6.5, 0, sideDmg);
    }
    if (spreadLevel >= 2) {
      push(-13, 0, sideDmg);
      push(13, 0, sideDmg);
    }
    if (spreadLevel >= 3) {
      push(-20, 0, sideDmg);
      push(20, 0, sideDmg);
    }
  }

  function tryMissile(now) {
    if (phase !== "combat" || missileStock <= 0) return;
    if (now - lastMissile < missileCooldownMs()) return;
    lastMissile = now;
    missileStock--;
    sfxMissile();
    const cx = jet.x + jet.w - 6;
    const cy = jet.y + jet.h / 2;
    missiles.push({
      x: cx,
      y: cy,
      vx: 560,
      vy: 0,
      r: 14,
      dmg: 3 + missileDmgShopLevel + Math.floor(bulletDmg * 0.88),
      life: 18,
      fxAcc: 0,
    });
    syncHud();
    renderShop();
  }

  function applyPickup(p, silent = false) {
    if (p.kind === "rapid") {
      if (shipClass === "pulse") fireMul = Math.max(0.38, fireMul * 0.903);
      else credits += 14 + wave;
    }
    else if (p.kind === "dmg") bulletDmg = Math.min(8, bulletDmg + 1);
    else if (p.kind === "spread") {
      if (shipClass === "pulse") spreadLevel = Math.min(3, spreadLevel + 1);
      else credits += 14 + wave;
    }
    else if (p.kind === "shield") shieldCharges = Math.min(7, shieldCharges + 1);
    else if (p.kind === "credits") credits += 6 + Math.floor(wave * 1.2) + pickupCreditsBonus * 3;
    if (!silent) {
      sfxPickup();
      syncHud();
      renderShop();
    }
  }

  function onUfoDestroyed(u, cx, cy) {
    const cr = Math.max(2, Math.floor(u.pts / 4) + 2 + wave);
    const bountyMul = 1 + Math.min(0.25, creditKillBonusLevel * 0.05);
    credits += Math.max(1, Math.floor(cr * diff().creditFromKillMul * bountyMul));
    score += u.pts;
    combo += 1;
    comboTimerMax = Math.max(1, comboRefreshMs());
    comboTimerMs = comboTimerMax;
    comboRumble = Math.min(36, comboRumble + 1.15 + combo * 0.52);
    if (combo > 1) {
      const cb = Math.floor((combo - 1) * 2.2);
      if (cb > 0) score += cb;
    }
    if (combo >= 8 && combo % 4 === 0) shake = Math.min(40, shake + 10);
    if (u.elite) {
      triggerHitstop(48);
      shake = Math.min(36, shake + 14);
    }
    if (u.boss) {
      sfxBossDead();
      triggerHitstop(95);
      burst(cx, cy, "#ffd76a", 44, { add: true, lifeM: 1.3, spd0: 100, spd1: 540 });
      burst(cx, cy, "#56e8ff", 38, { grav: 20, lifeM: 1.15 });
      ringBurst(cx, cy, "#ff9dff", 18);
      screenFlash = Math.min(1, 0.75);
      screenFlashKind = "boss";
      shake = Math.min(56, shake + 38);
      credits += Math.max(0, Math.floor((32 + wave * 14) * diff().creditFromKillMul * bountyMul));
    } else {
      sfxExplode();
      burst(cx, cy, "#9ad0ff", 24, { grav: 48 });
      shake = Math.min(22, shake + (u.elite ? 10 : 6));
    }
    const dropMul = Math.max(0.12, Math.min(1.0, pickupDropMulNext || 1));
    // Globaler Drop-Nerf: weniger Schneeball im Mid/Late.
    const globalDropNerf = wave <= 4 ? 0.92 : wave <= 10 ? 0.72 : 0.6;
    if (Math.random() < u.drop * dropMul * globalDropNerf) spawnPickup(u.x + u.w * 0.3, u.y + u.h * 0.35);
    scoreEl.textContent = String(score);
    syncHud();
    renderShop();
  }

  function checkWaveComplete() {
    if (phase !== "combat") return;
    if (waveSpawned >= waveSpawnBudget && ufos.length === 0) beginShopPhase();
  }

  function ufoPalette(u) {
    if (u.kind === "swarm") return ["#e8fff4", "#7af0c2", "#0a6048"];
    if (u.kind === "scout") return ["#b8ffe8", "#56e0b0", "#0a5c48"];
    if (u.kind === "wobbler") return ["#ffd6a8", "#ff9f6e", "#8c3d1a"];
    if (u.kind === "hunter") return ["#ffb8c8", "#ff5c7a", "#6a1028"];
    if (u.kind === "prism") return ["#e8f5ff", "#56e8ff", "#113a6a"];
    return ["#d0c8ff", "#8b7aff", "#2a1a5c"];
  }

  function drawJet(t) {
    const { x, y, w, h } = jet;
    const beamShip = shipClass === "beam";
    if (shieldCharges > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(120, 220, 255, ${0.3 + 0.1 * Math.sin(t * 0.004)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(x + w * 0.45, y + h * 0.5, w * 0.8, h * 0.66, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 7; i++) {
      const px = x - 10 - i * 18 - (t * 0.018) % 28;
      const py = y + h / 2 + Math.sin(t * 0.025 + i) * (4 + i * 0.6);
      const grd = ctx.createRadialGradient(px, py, 0, px, py, 18 + i * 5);
      if (beamShip) {
        grd.addColorStop(0, "rgba(255,160,90,0.85)");
        grd.addColorStop(0.45, "rgba(255,90,40,0.35)");
        grd.addColorStop(1, "transparent");
      } else if (unlockTrail) {
        grd.addColorStop(0, "rgba(120,255,210,0.82)");
        grd.addColorStop(0.5, "rgba(60,200,255,0.4)");
        grd.addColorStop(1, "transparent");
      } else {
        grd.addColorStop(0, "rgba(130,210,255,0.75)");
        grd.addColorStop(1, "transparent");
      }
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(px, py, 12 + i * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(x + w * 0.2, y + h / 2);
    ctx.beginPath();
    ctx.moveTo(w * 0.75, 0);
    ctx.lineTo(-w * 0.15, -h * 0.42);
    ctx.lineTo(-w * 0.05, 0);
    ctx.lineTo(-w * 0.15, h * 0.42);
    ctx.closePath();
    const g = ctx.createLinearGradient(-w, 0, w, 0);
    if (beamShip) {
      g.addColorStop(0, "#4a2020");
      g.addColorStop(0.45, heat > 68 ? "#ff6622" : "#ff9944");
      g.addColorStop(1, heat > 68 ? "#fff0c8" : "#ffd8a8");
      ctx.shadowColor = heat > 68 ? "#ff4400" : "#ff8833";
    } else {
      g.addColorStop(0, "#2a3f6a");
      g.addColorStop(0.5, "#56a7ff");
      g.addColorStop(1, "#d8f0ff");
      ctx.shadowColor = "#48b8ff";
    }
    ctx.shadowBlur = beamShip ? 12 + (heat / 100) * 18 : 14;
    ctx.fillStyle = g;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = beamShip ? "rgba(255, 220, 200, 0.55)" : "rgba(220, 240, 255, 0.65)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    if (unlockHullChrome) {
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawShipPreview(t) {
    if (!shipPreviewCanvas) return;
    const pc = shipPreviewCanvas.getContext("2d");
    const pw = shipPreviewCanvas.width;
    const ph = shipPreviewCanvas.height;
    pc.clearRect(0, 0, pw, ph);
    const bg = pc.createRadialGradient(pw * 0.35, ph * 0.42, 0, pw * 0.52, ph * 0.5, pw * 0.85);
    bg.addColorStop(0, "rgba(55, 95, 170, 0.55)");
    bg.addColorStop(1, "rgba(5, 8, 20, 0.98)");
    pc.fillStyle = bg;
    pc.fillRect(0, 0, pw, ph);
    const x = 72;
    const y = ph / 2;
    const w = 78;
    const h = 56;
    const beamShip = shipClass === "beam";
    pc.save();
    pc.globalAlpha = 0.5;
    for (let i = 0; i < 6; i++) {
      const px = x - 8 - i * 14 - ((t * 22) % 24);
      const py = y + Math.sin(t * 2.8 + i * 0.65) * 5;
      const grd = pc.createRadialGradient(px, py, 0, px, py, 12 + i * 3);
      if (beamShip) {
        grd.addColorStop(0, "rgba(255,150,80,0.85)");
        grd.addColorStop(0.5, "rgba(255,90,40,0.35)");
        grd.addColorStop(1, "transparent");
      } else {
        grd.addColorStop(0, "rgba(130,210,255,0.75)");
        grd.addColorStop(1, "transparent");
      }
      pc.fillStyle = grd;
      pc.beginPath();
      pc.arc(px, py, 10 + i * 2.5, 0, Math.PI * 2);
      pc.fill();
    }
    pc.restore();
    pc.save();
    pc.translate(x + w * 0.2, y);
    pc.beginPath();
    pc.moveTo(w * 0.72, 0);
    pc.lineTo(-w * 0.12, -h * 0.42);
    pc.lineTo(-w * 0.04, 0);
    pc.lineTo(-w * 0.12, h * 0.42);
    pc.closePath();
    const g = pc.createLinearGradient(-w, 0, w, 0);
    if (beamShip) {
      g.addColorStop(0, "#4a2020");
      g.addColorStop(0.45, "#ff9944");
      g.addColorStop(1, "#ffe8c8");
      pc.shadowColor = "#ff8833";
    } else {
      g.addColorStop(0, "#2a3f6a");
      g.addColorStop(0.5, "#56a7ff");
      g.addColorStop(1, "#d8f0ff");
      pc.shadowColor = "#48b8ff";
    }
    pc.shadowBlur = 14;
    pc.fillStyle = g;
    pc.fill();
    pc.shadowBlur = 0;
    pc.strokeStyle = beamShip ? "rgba(255, 220, 200, 0.55)" : "rgba(220, 240, 255, 0.65)";
    pc.lineWidth = 2;
    pc.stroke();
    pc.restore();

    const noseX = x + w - 4;
    if (shipClass === "pulse") {
      for (let i = 0; i < 3; i++) {
        const phase = (t * 2.6 + i * 0.33) % 1;
        const bx = noseX + phase * (pw - noseX - 36);
        const bh = 5 + Math.sin(t * 4 + i) * 0.4;
        const lg = pc.createLinearGradient(bx, y, bx + 38, y);
        lg.addColorStop(0, "#fffce8");
        lg.addColorStop(0.45, "#ffee88");
        lg.addColorStop(1, "#ffaa44");
        pc.fillStyle = lg;
        pc.shadowColor = "#ffcc66";
        pc.shadowBlur = 8;
        pc.fillRect(bx, y - bh / 2, 34, bh);
        pc.shadowBlur = 0;
      }
    } else {
      const x1 = pw - 26;
      const flick = 0.88 + 0.12 * Math.sin(t * 11);
      pc.save();
      pc.globalCompositeOperation = "lighter";
      const lg = pc.createLinearGradient(noseX, y, x1, y);
      lg.addColorStop(0, "rgba(255,255,255,0.95)");
      lg.addColorStop(0.12, "rgba(255,220,160,0.85)");
      lg.addColorStop(0.5, "rgba(255,120,60,0.42)");
      lg.addColorStop(1, "rgba(255,80,40,0.07)");
      pc.strokeStyle = lg;
      pc.lineWidth = (4.2 + Math.sin(t * 7.5) * 0.7) * flick;
      pc.shadowColor = "#ff8844";
      pc.shadowBlur = 16;
      pc.beginPath();
      pc.moveTo(noseX, y);
      pc.lineTo(x1, y);
      pc.stroke();
      pc.restore();
    }
  }

  function stopShipPreview() {
    if (shipPreviewAnim) cancelAnimationFrame(shipPreviewAnim);
    shipPreviewAnim = 0;
  }

  function ensureShipPreviewRunning() {
    if (!shipPreviewCanvas || startOverlay.hidden) return;
    if (shipPreviewAnim) return;
    const step = (now) => {
      if (startOverlay.hidden) {
        shipPreviewAnim = 0;
        return;
      }
      drawShipPreview(now * 0.001);
      shipPreviewAnim = requestAnimationFrame(step);
    };
    shipPreviewAnim = requestAnimationFrame(step);
  }

  function renderBoss(u, t) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.0033 + u.bossStyle * 1.7);
    const ix = u.x + u.w / 2;
    const iy = u.y + u.h / 2;
    if (bossHitFx > 0.05) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${bossHitFx * 0.5})`;
      ctx.lineWidth = 4 + bossHitFx * 10;
      ctx.strokeRect(u.x - 5, u.y - 5, u.w + 10, u.h + 10);
      ctx.restore();
    }

    ctx.save();
    if (u.bossStyle === 0 || u.bossStyle === 4) {
      ctx.translate(ix, iy);
      ctx.rotate(Math.sin(t * 0.0011) * 0.06);
      const g = ctx.createRadialGradient(-20, -18, 8, 0, 0, u.w * 0.55);
      if (u.bossStyle === 4) {
        g.addColorStop(0, "#ffd8c8");
        g.addColorStop(0.35, "#ff8844");
        g.addColorStop(0.7, "#6a2010");
        g.addColorStop(1, "#180808");
      } else {
        g.addColorStop(0, "#c8ffd8");
        g.addColorStop(0.35, "#3cff9a");
        g.addColorStop(0.7, "#0a6a42");
        g.addColorStop(1, "#021810");
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, u.w * 0.42, u.h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.45 * pulse;
      ctx.fillStyle = "#7affc8";
      ctx.beginPath();
      ctx.ellipse(-u.w * 0.12, 4, u.w * 0.22, u.h * 0.22, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.35 * pulse;
      ctx.beginPath();
      ctx.ellipse(u.w * 0.1, -6, u.w * 0.18, u.h * 0.16, -0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (u.bossStyle === 1 || u.bossStyle === 5) {
      ctx.translate(ix, iy);
      ctx.rotate(Math.sin(t * 0.0024) * 0.12);
      const gr = ctx.createLinearGradient(-u.w * 0.5, 0, u.w * 0.5, 0);
      if (u.bossStyle === 5) {
        gr.addColorStop(0, "#061820");
        gr.addColorStop(0.3, "#44e8ff");
        gr.addColorStop(0.55, "#b8fff8");
        gr.addColorStop(0.78, "#2288aa");
        gr.addColorStop(1, "#041018");
      } else {
        gr.addColorStop(0, "#1a0a28");
        gr.addColorStop(0.25, "#ff4d8a");
        gr.addColorStop(0.55, "#ffb8e8");
        gr.addColorStop(0.75, "#ff2a6a");
        gr.addColorStop(1, "#120818");
      }
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(u.w * 0.46, 0);
      ctx.lineTo(-u.w * 0.42, -u.h * 0.42);
      ctx.lineTo(-u.w * 0.5, 0);
      ctx.lineTo(-u.w * 0.42, u.h * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.25 + pulse * 0.35})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(u.w * 0.28, -u.h * 0.08, 5, 0, Math.PI * 2);
      ctx.arc(u.w * 0.28, u.h * 0.08, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (u.bossStyle === 2 || u.bossStyle === 6) {
      ctx.translate(ix, iy);
      ctx.rotate(t * 0.0009);
      const R = Math.min(u.w, u.h) * 0.44;
      const petals = u.bossStyle === 6 ? 7 : 6;
      for (let k = 0; k < petals; k++) {
        const a = ((Math.PI * 2) / petals) * k + t * 0.0012;
        ctx.fillStyle =
          u.bossStyle === 6
            ? k % 2
              ? "#9aff66"
              : "#d8ff88"
            : k % 2
              ? "#7a9fff"
              : "#c8a8ff";
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2);
        ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
        ctx.lineTo(
          Math.cos(a + (Math.PI * 2) / petals) * R,
          Math.sin(a + (Math.PI * 2) / petals) * R
        );
        ctx.closePath();
        ctx.fill();
      }
      const core = ctx.createRadialGradient(0, 0, 2, 0, 0, R * 0.5);
      if (u.bossStyle === 6) {
        core.addColorStop(0, "#ffffff");
        core.addColorStop(0.45, "#b8ff66");
        core.addColorStop(1, "#1a4020");
      } else {
        core.addColorStop(0, "#ffffff");
        core.addColorStop(0.4, "#56a7ff");
        core.addColorStop(1, "#1a2050");
      }
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.32, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.translate(ix, iy);
      const wob = Math.sin(t * 0.0018) * 10;
      const ng = ctx.createRadialGradient(-30 + wob, -20, 4, 0, 0, u.w * 0.5);
      if (u.bossStyle === 7) {
        ng.addColorStop(0, "#ffe0e0");
        ng.addColorStop(0.35, "#ff4466");
        ng.addColorStop(0.65, "#6a1020");
        ng.addColorStop(1, "#120408");
      } else {
        ng.addColorStop(0, "#e8d8ff");
        ng.addColorStop(0.35, "#8b62ff");
        ng.addColorStop(0.65, "#3a1a6a");
        ng.addColorStop(1, "#0a0418");
      }
      ctx.fillStyle = ng;
      ctx.beginPath();
      ctx.ellipse(0, 0, u.w * 0.44, u.h * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.4 + pulse * 0.35;
      ctx.strokeStyle = u.bossStyle === 7 ? "#ff8899" : "#c4a8ff";
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.ellipse(0, 0, u.w * 0.48 + 8, u.h * 0.46 + 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    const bw = Math.min(380, u.w * 0.92);
    const bx = u.x + (u.w - bw) / 2;
    const by = u.y - 14;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(bx - 1, by - 1, bw + 2, 10);
    const hpw = bw * (u.hp / u.maxHp);
    const hg = ctx.createLinearGradient(bx, by, bx + hpw, by);
    hg.addColorStop(0, "#ff6b9d");
    hg.addColorStop(0.5, "#ffd76a");
    hg.addColorStop(1, "#5dffb4");
    ctx.fillStyle = hg;
    ctx.fillRect(bx, by, Math.max(2, hpw), 8);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.strokeRect(bx, by, bw, 8);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 13px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(BOSS_NAMES[u.bossStyle] || "BOSS", ix, by - 4);
  }

  function drawUfo(u, t) {
    if (u.kind === "boss") {
      renderBoss(u, t);
      return;
    }
    const [c0, c1, c2] = ufoPalette(u);
    ctx.save();
    ctx.translate(u.x + u.w / 2, u.y + u.h / 2);
    ctx.scale(1, u.kind === "swarm" ? 0.62 : 0.55);
    const rg = ctx.createRadialGradient(0, -u.h * 0.1, 2, 0, 0, u.w * 0.55);
    rg.addColorStop(0, c0);
    rg.addColorStop(0.4, c1);
    rg.addColorStop(1, c2);
    ctx.shadowColor = c1;
    ctx.shadowBlur = u.kind === "swarm" ? 8 : 14;
    ctx.beginPath();
    ctx.ellipse(0, 0, u.w * 0.48, u.h * 0.9, 0, 0, Math.PI * 2);
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
    ctx.lineWidth = 2;
    ctx.stroke();
    if (u.elite) {
      ctx.strokeStyle = "rgba(255, 215, 106, 0.92)";
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 7]);
      ctx.beginPath();
      ctx.ellipse(0, 0, u.w * 0.52, u.h * 0.94, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.beginPath();
    ctx.ellipse(u.x + u.w * 0.5, u.y + u.h * 0.28, u.w * 0.1, u.h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    if (u.kind === "prism") {
      // Shield-Readability: zeigt, dass kleine Treffer schlecht wirken.
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.006 + (u.t || 0) * 0.001);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.22 + pulse * 0.18;
      ctx.strokeStyle = "rgba(120, 220, 255, 0.9)";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.ellipse(u.x + u.w * 0.5, u.y + u.h * 0.5, u.w * 0.56, u.h * 0.56, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (u.maxHp > 1) {
      const bw = u.w * 0.72;
      const bx = u.x + (u.w - bw) / 2;
      const by = u.y - 9;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(bx, by, bw, 6);
      ctx.fillStyle = "#5dffb4";
      ctx.fillRect(bx, by, bw * (u.hp / u.maxHp), 6);
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.strokeRect(bx, by, bw, 6);
    }
  }

  function drawPickup(p) {
    const colors = {
      rapid: ["#56a7ff", "#9ad0ff"],
      dmg: ["#ff6b6b", "#ffb3a0"],
      spread: ["#e0b0ff", "#ff9dff"],
      shield: ["#5dffb4", "#b8fff0"],
      credits: ["#ffd76a", "#fff3b0"],
    };
    const [a, b] = colors[p.kind] || ["#fff", "#ccc"];
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.rotate(p.t * 0.003);
    if (p.kind === "credits") {
      ctx.fillStyle = a;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = b;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#1a1408";
      ctx.font = "bold 12px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("₡", 0, 0);
    } else {
      const g = ctx.createLinearGradient(-14, -14, 14, 14);
      g.addColorStop(0, a);
      g.addColorStop(1, b);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(11, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-11, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBackground(t) {
    nebulaOff += 0.011;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#030612");
    g.addColorStop(0.45, "#0a1430");
    g.addColorStop(1, "#0c2044");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = 0.35;
    const nx = Math.sin(nebulaOff * 0.9) * 140;
    const ng = ctx.createRadialGradient(W * 0.26 + nx, H * 0.3, 0, W * 0.34 + nx, H * 0.36, W * 0.55);
    ng.addColorStop(0, "rgba(100, 160, 255, 0.65)");
    ng.addColorStop(0.45, "rgba(40, 80, 200, 0.2)");
    ng.addColorStop(1, "transparent");
    ctx.fillStyle = ng;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.22;
    const nx2 = Math.cos(nebulaOff * 0.75) * 100;
    const ng2 = ctx.createRadialGradient(W * 0.78 + nx2, H * 0.62, 0, W * 0.72 + nx2, H * 0.55, H * 0.45);
    ng2.addColorStop(0, "rgba(180, 100, 255, 0.35)");
    ng2.addColorStop(1, "transparent");
    ctx.fillStyle = ng2;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 8; i++) {
      const y = ((i * 137 + t * 0.04) % (H + 80)) - 40;
      const gr = ctx.createLinearGradient(0, y, W, y + 2);
      gr.addColorStop(0, "transparent");
      gr.addColorStop(0.5, "rgba(200, 230, 255, 0.5)");
      gr.addColorStop(1, "transparent");
      ctx.fillStyle = gr;
      ctx.fillRect(0, y, W, 2);
    }
    ctx.restore();

    if (envMode === 1) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.14;
      for (let j = 0; j < 6; j++) {
        const px = ((j * 337 + t * 14) % (W + 100)) - 50;
        const py = 120 + Math.sin(t * 0.0011 + j * 0.9) * (H * 0.35);
        const rg = ctx.createRadialGradient(px, py, 0, px, py, 140);
        rg.addColorStop(0, "rgba(90, 255, 200, 0.38)");
        rg.addColorStop(1, "transparent");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(px, py, 130, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (envMode === 2) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      for (let j = 0; j < 16; j++) {
        const px = ((j * 173 + t * 22) % (W + 80)) - 40;
        const py = ((j * 97 + t * 11) % (H + 50)) - 25;
        const sz = 5 + (j % 4) * 7;
        ctx.fillStyle = j % 2 ? "rgba(130, 150, 190, 0.5)" : "rgba(70, 80, 110, 0.4)";
        ctx.fillRect(px, py, sz, sz * 0.75);
      }
      ctx.restore();
    } else if (envMode === 3) {
      ctx.save();
      ctx.globalAlpha = 0.13;
      for (let j = 0; j < 10; j++) {
        const y = ((j * 151 + t * (18 + j * 0.15)) % (H + 70)) - 35;
        const gr = ctx.createLinearGradient(0, y, W, y + 4);
        gr.addColorStop(0, "transparent");
        gr.addColorStop(0.5, "rgba(255, 150, 90, 0.45)");
        gr.addColorStop(1, "transparent");
        ctx.fillStyle = gr;
        ctx.fillRect(0, y, W, 4);
      }
      ctx.restore();
    }

    for (const s of stars) {
      const spd = 0.12 + s.layer * 0.34;
      const a = 0.2 + s.layer * 0.16 + Math.sin(t * 0.0016 + s.tw) * 0.32;
      const tw = s.s * (0.85 + s.layer * 0.35);
      const g2 = ctx.createLinearGradient(s.x, s.y, s.x + tw, s.y);
      g2.addColorStop(0, `rgba(255,255,255,${a * 0.15})`);
      g2.addColorStop(0.5, `rgba(200, 230, 255, ${a})`);
      g2.addColorStop(1, `rgba(255,255,255,${a * 0.12})`);
      ctx.fillStyle = g2;
      ctx.fillRect(s.x, s.y, tw, s.s * 0.85);
      s.x -= spd;
      if (s.x < 0) s.x = W;
    }
  }

  function drawHeatOverlay() {
    if (shipClass !== "beam") return;
    if (heat < 58 && overheatLock <= 0) return;
    const a = Math.min(0.22, (heat - 50) / 105) + (overheatLock > 0 ? 0.15 : 0);
    ctx.fillStyle = `rgba(255, 80, 40, ${a})`;
    ctx.fillRect(0, 0, W, H);
  }

  function drawPhaseBanner() {
    if (phase !== "shop") return;
    ctx.save();
    ctx.fillStyle = "rgba(4, 8, 20, 0.55)";
    ctx.fillRect(0, 0, W, 72);
    ctx.strokeStyle = "rgba(255, 215, 106, 0.4)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, 70);
    ctx.fillStyle = "#ffd76a";
    ctx.font = "bold 28px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HANGAR  —  Weiter unten", W / 2, 46);
    ctx.restore();
  }

  function nearestUfo(px, py) {
    let best = null;
    let bestD = 1e9;
    for (const u of ufos) {
      const cx = u.x + u.w / 2;
      const cy = u.y + u.h / 2;
      let d = (cx - px) ** 2 + (cy - py) ** 2;
      if (u.boss) d *= 0.52;
      if (d < bestD) {
        bestD = d;
        best = u;
      }
    }
    return best;
  }

  function updateBoss(u, dt, sec) {
    const hold = 210;
    const jcx = jet.x + jet.w * 0.42;
    const jcy = jet.y + jet.h * 0.5;
    const uc = u.x + u.w * 0.32;
    const uy = u.y + u.h * 0.5;
    const bmul = u.bmul ?? diff().tankBulletSpdMul;
    const st = u.bossStyle;

    if (st === 0 || st === 4) {
      const aim = jcy - (u.y + u.h / 2);
      u.y += aim * Math.min(1.7, 2.2 * sec);
      u.y = Math.max(34, Math.min(H - u.h - 34, u.y));
    } else if (st === 1 || st === 5) {
      u.y = u.baseY + Math.sin(u.t * 0.00275) * 124;
    } else if (st === 2 || st === 6) {
      if (u.vx !== 0) {
        u.x += (u.vx * dt) / 1000;
        if (u.x < hold) {
          u.x = hold;
          u.vx = 0;
        }
      } else {
        const midX = hold + 38;
        u.x = midX - u.w / 2 + Math.cos(u.t * 0.00152) * 68;
        u.y = u.centerY - u.h / 2 + Math.sin(u.t * 0.00228) * 134;
      }
    } else {
      u.y += Math.sin(u.t * 0.00202) * 86 * sec;
      u.y = Math.max(30, Math.min(H - u.h - 30, u.y));
    }

    if (st !== 2 && st !== 6) {
      u.x += (u.vx * dt) / 1000;
      if (u.x < hold) {
        u.x = hold;
        u.vx = 0;
      }
    }

    u.shootT -= dt;
    if (u.shootT > 0 || u.x > W - 64) return;

    const baseAng = Math.atan2(jcy - uy, jcx - uc);
    const sp = (172 + wave * 9) * bmul * 1.35;

    if (st === 0) {
      for (const off of [-0.4, -0.14, 0.14, 0.4]) {
        pushBossBullet(u.x + 8, uy, baseAng + off, sp * 0.9, 13);
      }
      u.shootT = 1320 * diff().tankShootCooldownMul;
    } else if (st === 4) {
      for (const off of [-0.55, -0.28, 0, 0.28, 0.55]) {
        pushBossBullet(u.x + 8, uy, baseAng + off, sp * 0.88, 13);
      }
      u.shootT = 1180 * diff().tankShootCooldownMul;
    } else if (st === 1) {
      pushBossBullet(u.x, uy, baseAng, sp * 1.42, 12);
      u.shootT = 340 * diff().tankShootCooldownMul;
    } else if (st === 5) {
      for (const off of [-0.18, 0, 0.18]) {
        pushBossBullet(u.x, uy, baseAng + off, sp * 1.48, 11);
      }
      u.shootT = 300 * diff().tankShootCooldownMul;
    } else if (st === 2) {
      for (let i = 0; i < 8; i++) {
        const ang = (Math.PI * 2 * i) / 8 + u.t * 0.00035;
        pushBossBullet(uc, uy, ang, sp * 0.72, 13);
      }
      u.shootT = 1980 * diff().tankShootCooldownMul;
    } else if (st === 6) {
      for (let i = 0; i < 10; i++) {
        const ang = (Math.PI * 2 * i) / 10 + u.t * 0.00042;
        pushBossBullet(uc, uy, ang, sp * 0.68, 12);
      }
      u.shootT = 1680 * diff().tankShootCooldownMul;
    } else if (st === 3) {
      pushBossBullet(u.x + 4, uy - 22, baseAng, sp * 1.02, 14);
      pushBossBullet(u.x + 4, uy + 22, baseAng, sp * 1.02, 14);
      u.shootT = 820 * diff().tankShootCooldownMul;
    } else {
      pushBossBullet(u.x + 4, uy - 28, baseAng - 0.06, sp * 1.05, 14);
      pushBossBullet(u.x + 4, uy, baseAng, sp * 1.08, 14);
      pushBossBullet(u.x + 4, uy + 28, baseAng + 0.06, sp * 1.05, 14);
      u.shootT = 680 * diff().tankShootCooldownMul;
    }
  }

  function togglePause(force) {
    if (!running || phase !== "combat") return;
    if (typeof force === "boolean") paused = force;
    else paused = !paused;
    if (pauseOverlay) pauseOverlay.hidden = !paused;
    if (paused) {
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "KeyW",
        "KeyS",
        "KeyA",
        "KeyD",
        "Space",
        "KeyE",
        "KeyQ",
      ].forEach((c) => keys.delete(c));
      const anyBoss = ufos.some((u) => u.boss);
      setBgmLayer(anyBoss ? "boss" : "shop");
    } else {
      const anyBoss = ufos.some((u) => u.boss);
      setBgmLayer(anyBoss ? "boss" : "combat");
    }
  }

  function update(dt, now) {
    const sec = dt / 1000;
    tickVoice(dt);
    if (paused && phase === "combat") {
      syncHud();
      return;
    }
    if (overheatLock > 0) overheatLock -= dt * (1 + overheatServoLevel * 0.22);
    screenFlash = Math.max(0, screenFlash - sec * 2.5);
    bossHitFx *= Math.pow(0.87, dt / 16);
    if (novaCooldownMs > 0) novaCooldownMs -= dt;

    if (phase === "shop") {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= sec;
        p.x += p.vx * sec;
        p.y += p.vy * sec;
        p.vy += (p.grav ?? 40) * sec;
        if (p.spin) p.rot = (p.rot || 0) + p.spin * dt * 0.08;
        if (p.life <= 0) particles.splice(i, 1);
      }
      tickVoice(dt);
      syncHud();
      return;
    }

    const up = keys.has("ArrowUp") || keys.has("KeyW");
    const down = keys.has("ArrowDown") || keys.has("KeyS");
    const left = keys.has("ArrowLeft") || keys.has("KeyA");
    const right = keys.has("ArrowRight") || keys.has("KeyD");
    const fire = keys.has("Space");
    const miss = keys.has("KeyE");
    const jMove = jetSpeedPps * (1 + thrusterShopLevel * 0.088);
    if (up) jet.y -= jMove * sec;
    if (down) jet.y += jMove * sec;
    if (left) jet.x -= jMove * sec;
    if (right) jet.x += jMove * sec;

    if (aimTouchId != null && aimTouchY != null) {
      const rect = canvas.getBoundingClientRect();
      const scaleY = H / rect.height;
      const scaleX = W / rect.width;
      const targetY = (aimTouchY - rect.top) * scaleY - jet.h / 2;
      jet.y += (targetY - jet.y) * Math.min(1, 11 * sec);
      if (aimTouchX != null) {
        const rawX = (aimTouchX - rect.left) * scaleX - jet.w / 2;
        const targetX = Math.max(jetXMin, Math.min(jetXMax, rawX));
        jet.x += (targetX - jet.x) * Math.min(1, 9 * sec);
      }
    }

    jet.y = Math.max(14, Math.min(H - jet.h - 14, jet.y));
    jet.x = Math.max(jetXMin, Math.min(jetXMax, jet.x));

    const novaQ = keys.has("KeyQ");
    if (novaQ && !novaKeyLatch && hasNovaCore && novaCooldownMs <= 0 && phase === "combat") {
      novaKeyLatch = true;
      triggerNovaExplosion();
    }
    if (!novaQ) novaKeyLatch = false;

    if (shipClass === "pulse" && fire) tryShoot(now);
    else if (shipClass === "beam" && fire && overheatLock <= 0 && phase === "combat") {
      if (heat >= 92) {
        overheatLock = Math.max(540, 820 - overheatServoLevel * 96);
        sfxOverheat();
      } else {
        const fluxM = weaponMod === "bflux" ? 1.09 : 1;
        const dissip = 1 - Math.min(0.16, beamDissipLevel * 0.042);
        heat += 64 * sec * diff().heatGainMul * fluxM * dissip;
        if (now - lastBeamTick >= beamTickIntervalMs()) {
          lastBeamTick = now;
          tickBeamDamage(now);
        }
      }
    }
    if (miss) tryMissile(now);

    if (shipClass === "beam") {
      /* Beim aktiven Strahl keine passive Kühlung — sonst gleicht (64/s Zufluss vs. bis 66/s Abfluss)
         die Leiste unter ~92 und es gibt keine Überhitzung. */
      const passiveCool = !(fire && overheatLock <= 0 && phase === "combat");
      if (passiveCool) {
        const cool = (40 + (heat > 70 ? 26 : 0)) * coolBonus * (1 + 0.055 * capacitorLevel);
        heat = Math.max(0, heat - cool * sec);
        if (heat < 26 && overheatLock <= 0) heat *= 0.987;
      }
    } else {
      heat = 0;
      overheatLock = 0;
    }

    if (comboTimerMs > 0) {
      comboTimerMs -= dt * (1.62 + combo * 0.065);
      if (comboTimerMs <= 0) {
        combo = 0;
        comboTimerMs = 0;
        comboTimerMax = 1;
      }
    }
    if (comboRumble > 0.08) comboRumble *= Math.pow(0.9, dt / 16);
    else comboRumble = 0;

    spawnAcc += dt;
    const spawnMs = spawnIntervalMs();
    while (spawnAcc >= spawnMs && waveSpawned < waveSpawnBudget) {
      spawnAcc -= spawnMs;
      spawnUfo();
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= sec;
      p.x += p.vx * sec;
      p.y += p.vy * sec;
      p.vy += (p.grav ?? 52) * sec;
      if (p.spin) p.rot = (p.rot || 0) + p.spin * dt * 0.08;
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += (b.vx * dt) / 1000;
      b.y += (b.vy * dt) / 1000;
      if (b.x > W + 60 || b.y < -50 || b.y > H + 50) bullets.splice(i, 1);
    }

    for (let mi = missiles.length - 1; mi >= 0; mi--) {
      const m = missiles[mi];
      m.life -= sec;
      const target = nearestUfo(m.x, m.y);
      const maxSp = 660;
      if (target) {
        const tx = target.x + target.w / 2;
        const ty = target.y + target.h / 2;
        const ang = Math.atan2(ty - m.y, tx - m.x);
        // Weniger agil: deutlich kleinere "Turn-/Steer-Rate" (mehr Trägheit).
        m.vx += (Math.cos(ang) * maxSp - m.vx) * 0.85 * sec;
        m.vy += (Math.sin(ang) * maxSp - m.vy) * 0.85 * sec;
      } else {
        m.vx += 240 * sec;
      }
      const sp = Math.hypot(m.vx, m.vy);
      if (sp > maxSp) {
        m.vx = (m.vx / sp) * maxSp;
        m.vy = (m.vy / sp) * maxSp;
      }
      m.x += m.vx * sec;
      m.y += m.vy * sec;
      // Bleibt sehr lange im Feld; despawn nur bei sehr weitem Offscreen oder nach sehr langer Zeit.
      if (m.life <= 0 || m.x > W + 900 || m.y < -300 || m.y > H + 300) {
        missiles.splice(mi, 1);
        continue;
      }

      // Trail/Smoke: kleine Partikelspur für "geilere" Raketen.
      m.fxAcc = (m.fxAcc || 0) + dt;
      const fxEvery = 32;
      while (m.fxAcc >= fxEvery) {
        m.fxAcc -= fxEvery;
        const back = Math.atan2(m.vy, m.vx) + Math.PI;
        const sx = m.x + Math.cos(back) * (m.r + 4) + (Math.random() - 0.5) * 2.5;
        const sy = m.y + Math.sin(back) * (m.r + 4) + (Math.random() - 0.5) * 2.5;
        const spd = 50 + Math.random() * 85;
        particles.push({
          x: sx,
          y: sy,
          vx: Math.cos(back) * spd + (Math.random() - 0.5) * 40,
          vy: Math.sin(back) * spd + (Math.random() - 0.5) * 40,
          s: 5 + Math.random() * 4,
          col: Math.random() < 0.35 ? "rgba(255,170,90,0.9)" : "rgba(140,170,210,0.75)",
          life: 0.35 + Math.random() * 0.25,
          add: Math.random() < 0.55,
          grav: 0,
        });
      }

      for (let ui = ufos.length - 1; ui >= 0; ui--) {
        const u = ufos[ui];
        const cx = u.x + u.w / 2;
        const cy = u.y + u.h / 2;
        if ((cx - m.x) ** 2 + (cy - m.y) ** 2 < (m.r + Math.max(u.w, u.h) * 0.36) ** 2) {
          let md = m.dmg;
          if ((weaponMod === "pbreach" || weaponMod === "bbreach") && u.kind === "tank") md *= 1.28;
          u.hp -= md;
          missiles.splice(mi, 1);
          burst(m.x, m.y, "#ffcc66", 36, { add: true, spd0: 110, spd1: 520, lifeM: 0.95 });
          burst(m.x, m.y, "#ff9944", 22, { grav: 28, spd0: 90, spd1: 420, lifeM: 0.75 });
          shake = Math.min(26, shake + 12);
          if (hasRocketSplash) {
            const splashD = Math.max(1, Math.floor(1.2 + bulletDmg * 0.48));
            const splashR = 118 + missileDmgShopLevel * 18;
            applyExplosionDamage(m.x, m.y, splashR, splashD, ui);
            burst(m.x, m.y, "#ff9944", 26, { add: true, spd0: 120, spd1: 560, lifeM: 0.8 });
            ringBurst(m.x, m.y, "rgba(255, 210, 140, 0.9)", 16 + Math.floor(missileDmgShopLevel * 2));
            sfxSplash();
            if (navigator.vibrate) navigator.vibrate([18, 28, 14]);
          }
          if (u.boss && u.hp > 0) {
            bossHitFx = Math.min(1, bossHitFx + 0.35);
            triggerHitstop(40);
            burst(m.x, m.y, "#fff5cc", 14, { add: true, spd0: 100, spd1: 400, lifeM: 0.55 });
            if (now - lastBossHitSfx > 100) {
              lastBossHitSfx = now;
              sfxBossHit();
            }
          }
          if (u.hp <= 0) {
            const ucx = u.x + u.w / 2;
            const ucy = u.y + u.h / 2;
            onUfoDestroyed(u, ucx, ucy);
            ufos.splice(ui, 1);
            checkWaveComplete();
          }
          break;
        }
      }
    }

    for (let ei = enemyBullets.length - 1; ei >= 0; ei--) {
      const eb = enemyBullets[ei];
      eb.x += eb.vx * sec;
      eb.y += eb.vy * sec;
      if (eb.x < -40 || eb.x > W + 40 || eb.y < -40 || eb.y > H + 40) {
        enemyBullets.splice(ei, 1);
        continue;
      }
      if (collides(eb, jet)) {
        enemyBullets.splice(ei, 1);
        sfxHit();
        if (navigator.vibrate) navigator.vibrate(35);
        if (shieldCharges > 0) {
          shieldCharges--;
          syncHud();
        } else {
          combo = 0;
          comboTimerMs = 0;
          comboTimerMax = 1;
          comboRumble = 0;
          lives--;
          livesEl.textContent = String(lives);
          shake = 22;
          screenFlash = 0.38;
          screenFlashKind = "hurt";
          burst(jet.x + jet.w / 2, jet.y + jet.h / 2, "#ff6666", 22, { spd0: 90, spd1: 340 });
          if (navigator.vibrate) navigator.vibrate([60, 40, 80]);
          if (lives <= 0) {
            running = false;
            recordMetaWave(wave);
            stopBgm();
            combo = 0;
            comboTimerMs = 0;
            comboTimerMax = 1;
            comboRumble = 0;
            paused = false;
            if (pauseOverlay) pauseOverlay.hidden = true;
            body.classList.remove("phase-shop");
            goText.textContent = `Game Over (${diff().label}) — ${score} Punkte · Welle ${wave} · ${credits} ₡`;
            gameOverOverlay.hidden = false;
          } else if (lives === 1 && lastOneLifeVoiceWave !== wave) {
            lastOneLifeVoiceWave = wave;
            showVoiceLine("Tower: Rumpf kritisch — noch ein Treffer und du bist raus.");
          }
        }
      }
    }

    for (let pi = pickups.length - 1; pi >= 0; pi--) {
      const p = pickups[pi];
      p.t += dt;
      p.x += (p.vx * dt) / 1000;
      p.y += (p.vy * dt) / 1000;
      const jcx = jet.x + jet.w / 2;
      const jcy = jet.y + jet.h / 2;
      const pcx = p.x + p.w / 2;
      const pcy = p.y + p.h / 2;
      const pull = 6000 * sec / (130 + Math.hypot(jcx - pcx, jcy - pcy));
      p.x += (jcx - pcx) * pull * 0.00015;
      p.y += (jcy - pcy) * pull * 0.00015;

      if (collides(p, jet)) {
        applyPickup(p);
        pickups.splice(pi, 1);
        continue;
      }
      if (p.x < -60 || p.y < -60 || p.y > H + 60) pickups.splice(pi, 1);
    }

    for (let ui = ufos.length - 1; ui >= 0; ui--) {
      const u = ufos[ui];
      u.t += dt;
      if (u.kind === "boss") {
        updateBoss(u, dt, sec);
      } else {
        u.x += (u.vx * dt) / 1000;
        if (u.kind === "swarm") u.y += u.vy * sec;
      }

      if (u.kind === "tank" && wave >= 2) {
        u.shootT -= dt;
        if (u.shootT <= 0 && u.x < W - 50) {
          u.shootT = Math.max(
            380,
            (2000 + Math.random() * 900 - wave * 40) * diff().tankShootCooldownMul
          );
          const jcx = jet.x + jet.w * 0.5;
          const jcy = jet.y + jet.h * 0.5;
          const ucx = u.x;
          const ucy = u.y + u.h / 2;
          const ang = Math.atan2(jcy - ucy, jcx - ucx);
          const sp = (240 + wave * 14) * diff().tankBulletSpdMul;
          enemyBullets.push({
            x: ucx,
            y: ucy,
            w: 14,
            h: 14,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
          });
        }
      }

      if (u.kind === "wobbler") {
        u.y = u.baseY + Math.sin(u.t * 0.0024) * 58;
      } else if (u.kind === "hunter") {
        const aim = jet.y + jet.h / 2 - (u.y + u.h / 2);
        u.vy = Math.max(-175, Math.min(175, u.vy + aim * 1.03 * diff().hunterSteerMul * sec));
        u.vy *= Math.pow(0.985, dt / 16);
        u.y += u.vy * sec;
        u.y = Math.max(20, Math.min(H - u.h - 20, u.y));
      }
      if (u.eliteWeaver) {
        u.y += Math.sin(u.t * 0.0085) * 34 * sec;
        u.y = Math.max(16, Math.min(H - u.h - 16, u.y));
      }

      if (u.x + u.w < -60) {
        ufos.splice(ui, 1);
        checkWaveComplete();
        continue;
      }

      if (collides(u, jet)) {
        sfxHit();
        if (shieldCharges > 0) {
          shieldCharges -= 1;
          ufos.splice(ui, 1);
          syncHud();
          burst(jet.x + jet.w / 2, jet.y + jet.h / 2, "#7cf0ff", 14);
          checkWaveComplete();
          continue;
        }
        ufos.splice(ui, 1);
        combo = 0;
        comboTimerMs = 0;
        comboTimerMax = 1;
        comboRumble = 0;
        lives -= 1;
        livesEl.textContent = String(lives);
        shake = 24;
        screenFlash = 0.4;
        screenFlashKind = "hurt";
        burst(jet.x + jet.w / 2, jet.y + jet.h / 2, "#ff8888", 26, { spd0: 100, spd1: 380 });
        if (lives <= 0) {
          running = false;
          recordMetaWave(wave);
          stopBgm();
          combo = 0;
          comboTimerMs = 0;
          comboTimerMax = 1;
          comboRumble = 0;
          paused = false;
          if (pauseOverlay) pauseOverlay.hidden = true;
          body.classList.remove("phase-shop");
          goText.textContent = `Game Over (${diff().label}) — ${score} Punkte · Welle ${wave} · ${credits} ₡`;
          gameOverOverlay.hidden = false;
        } else {
          if (lives === 1 && lastOneLifeVoiceWave !== wave) {
            lastOneLifeVoiceWave = wave;
            showVoiceLine("Tower: Rumpf kritisch — noch ein Treffer und du bist raus.");
          }
          checkWaveComplete();
        }
        continue;
      }

      for (let bi = bullets.length - 1; bi >= 0; bi--) {
        const b = bullets[bi];
        if (!collides(u, b)) continue;
        let dmg = b.dmg;
        if ((weaponMod === "pbreach" || weaponMod === "bbreach") && u.kind === "tank") dmg *= 1.28;
        // Anti-Spread Konter: Prism frisst kleine Treffer fast komplett.
        if (u.kind === "prism") {
          const minHit = 2.2 + Math.min(1.8, wave * 0.08);
          if (dmg < minHit) dmg *= 0.22;
        }
        u.hp -= dmg;
        bullets.splice(bi, 1);
        if (u.boss && u.hp > 0) {
          bossHitFx = Math.min(1, bossHitFx + 0.16);
          triggerHitstop(32);
          burst(b.x, b.y, "#ffffff", 6, { spd0: 70, spd1: 300, grav: 12, lifeM: 0.42, add: true });
          if (now - lastBossHitSfx > 110) {
            lastBossHitSfx = now;
            sfxBossHit();
          }
        }
        if (u.hp <= 0) {
          const ucx = u.x + u.w / 2;
          const ucy = u.y + u.h / 2;
          onUfoDestroyed(u, ucx, ucy);
          ufos.splice(ui, 1);
          checkWaveComplete();
        }
        break;
      }
    }

    if (shake > 0.4) shake *= Math.pow(0.88, dt / 16);
    if (running && phase === "combat" && combo > 6) {
      comboRumble = Math.min(42, comboRumble + (combo - 6) * 0.0028 * dt);
    }
    syncHud();
  }

  function draw(t) {
    ctx.save();
    const sh = shake + comboRumble;
    if (sh > 0.5) {
      ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
    }
    drawBackground(t);
    for (const p of pickups) drawPickup(p);
    for (const eb of enemyBullets) {
      const r = eb.w / 2;
      const cx = eb.x + eb.w / 2;
      const cy = eb.y + eb.h / 2;
      if (eb.bossBullet) {
        const g = ctx.createRadialGradient(cx - 2, cy - 2, 0, cx, cy, r + 6);
        g.addColorStop(0, "#fff8ff");
        g.addColorStop(0.35, "#ff66aa");
        g.addColorStop(0.7, "#8844ff");
        g.addColorStop(1, "rgba(40,0,60,0.15)");
        ctx.fillStyle = g;
        ctx.shadowColor = "#ff44cc";
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255, 200, 255, 0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#ff5588";
        ctx.shadowColor = "#ff2244";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    for (const m of missiles) {
      ctx.save();
      ctx.translate(m.x, m.y);
      const ang = Math.atan2(m.vy, m.vx);
      ctx.rotate(ang);
      const r = m.r ?? 12;
      const gr = ctx.createLinearGradient(-r - 8, 0, r + 12, 0);
      gr.addColorStop(0, "#fff8f0");
      gr.addColorStop(0.35, "#ffb066");
      gr.addColorStop(1, "#441800");
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = "#ff9a44";
      ctx.shadowBlur = 16 + r * 0.55;
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(r + 12, 0);
      ctx.lineTo(-r - 8, r * 0.6);
      ctx.lineTo(-r * 0.35, 0);
      ctx.lineTo(-r - 8, -r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
    for (const b of bullets) {
      const bx = b.x + b.w / 2;
      const by = b.y + b.h / 2;
      const g = ctx.createLinearGradient(b.x, by, b.x + b.w, by);
      g.addColorStop(0, "#fffce8");
      g.addColorStop(0.45, "#ffee88");
      g.addColorStop(1, "#ffaa44");
      ctx.fillStyle = g;
      ctx.shadowColor = "#ffcc66";
      ctx.shadowBlur = 14;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.shadowBlur = 0;
    }
    for (const u of ufos) drawUfo(u, t);

    // Tank-Warnung: wenn ein Tank kurz vorm Schuss ist, zeichne eine "Danger-Line".
    if (phase === "combat") {
      const jcx = jet.x + jet.w * 0.45;
      const jcy = jet.y + jet.h * 0.5;
      for (const u of ufos) {
        if (!u || u.kind !== "tank" || u.x > W - 60) continue;
        if (u.shootT == null) continue;
        if (u.shootT > 520 || u.shootT < 0) continue;
        const ucx = u.x;
        const ucy = u.y + u.h / 2;
        const a = Math.max(0, Math.min(1, (520 - u.shootT) / 520));
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.12 + a * 0.42;
        ctx.strokeStyle = `rgba(255, 90, 110, ${0.25 + a * 0.55})`;
        ctx.lineWidth = 2 + a * 3;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(ucx, ucy);
        ctx.lineTo(jcx, jcy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.2 + a * 0.6;
        ctx.fillStyle = "rgba(255, 70, 95, 0.9)";
        ctx.beginPath();
        ctx.arc(jcx, jcy, 8 + a * 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    drawJet(t);
    if (
      shipClass === "beam" &&
      phase === "combat" &&
      keys.has("Space") &&
      overheatLock <= 0 &&
      heat < 91
    ) {
      const { x0, y0, x1 } = findBeamTarget();
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createLinearGradient(x0, y0, x1, y0);
      g.addColorStop(0, unlockBeamTint ? "rgba(220,255,255,0.95)" : "rgba(255,255,255,0.95)");
      g.addColorStop(0.12, unlockBeamTint ? "rgba(160,240,255,0.88)" : "rgba(255,220,160,0.85)");
      g.addColorStop(0.55, unlockBeamTint ? "rgba(80,200,255,0.5)" : "rgba(255,120,60,0.45)");
      g.addColorStop(1, unlockBeamTint ? "rgba(40,120,255,0.1)" : "rgba(255,80,40,0.08)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 5 + (heat / 100) * 7;
      ctx.shadowColor = "#ff8844";
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y0);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y0);
      ctx.stroke();
      ctx.restore();
    }
    for (const p of particles) {
      if (p.add) continue;
      const al = Math.max(0, Math.min(1, p.life * 1.55));
      ctx.globalAlpha = al;
      ctx.fillStyle = p.col;
      const s = p.s;
      if (p.rot) {
        ctx.save();
        ctx.translate(p.x + s / 2, p.y + s / 2);
        ctx.rotate(p.rot);
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      } else {
        ctx.fillRect(p.x, p.y, s, s);
      }
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of particles) {
      if (!p.add) continue;
      const al = Math.max(0, Math.min(1, p.life * 1.8));
      ctx.globalAlpha = al * 0.85;
      ctx.fillStyle = p.col;
      const s = p.s * 1.15;
      ctx.beginPath();
      ctx.arc(p.x + p.s / 2, p.y + p.s / 2, s * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    drawHeatOverlay();
    if (screenFlash > 0.02) {
      let rgba = `rgba(130, 210, 255, ${screenFlash * 0.42})`;
      if (screenFlashKind === "hurt") rgba = `rgba(255, 65, 95, ${screenFlash * 0.5})`;
      if (screenFlashKind === "boss") rgba = `rgba(170, 230, 255, ${screenFlash * 0.48})`;
      ctx.fillStyle = rgba;
      ctx.fillRect(0, 0, W, H);
    }
    if (shipClass === "beam" && overheatLock > 0) {
      ctx.fillStyle = "rgba(255,60,40,0.4)";
      ctx.font = "bold 32px system-ui,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ÜBERHITZUNG", W / 2, 64);
    }
    drawPhaseBanner();
    ctx.restore();
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(50, now - (lastT || now));
    lastT = now;
    if (hitstopMs > 0) {
      hitstopMs -= dt;
      if (hitstopMs < 0) hitstopMs = 0;
      draw(now);
      if (running) raf = requestAnimationFrame(loop);
      return;
    }
    update(dt, now);
    draw(now);
    if (running) raf = requestAnimationFrame(loop);
  }

  function start() {
    resumeAudio();
    stopShipPreview();
    startOverlay.hidden = true;
    paused = false;
    if (pauseOverlay) pauseOverlay.hidden = true;
    resetGame();
    gameOverOverlay.hidden = true;
    running = true;
    lastT = 0;
    raf = requestAnimationFrame(loop);
  }

  function stopLoop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  document.getElementById("btnStart").addEventListener("click", start);
  document.getElementById("btnRestart").addEventListener("click", start);
  document.getElementById("btnMenu").addEventListener("click", () => {
    stopLoop();
    stopBgm();
    paused = false;
    if (pauseOverlay) pauseOverlay.hidden = true;
    gameOverOverlay.hidden = true;
    startOverlay.hidden = false;
    body.classList.remove("phase-shop");
    syncHud();
    ensureShipPreviewRunning();
  });

  document.querySelectorAll(".diffChip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = btn.getAttribute("data-diff");
      if (d !== "easy" && d !== "medium" && d !== "hard") return;
      difficulty = d;
      saveDifficulty();
      syncDifficultyChips();
    });
  });
  if (btnShopContinue) {
    btnShopContinue.addEventListener("click", () => {
      if (phase === "shop") exitShopPhase();
    });
  }

  // Shop filter chips
  if (shopControls) {
    shopControls.addEventListener("click", (e) => {
      const el = e.target && e.target.closest ? e.target.closest("[data-shop-filter]") : null;
      if (!el) return;
      const f = el.getAttribute("data-shop-filter") || "all";
      shopFilter = f;
      shopControls.querySelectorAll("[data-shop-filter]").forEach((b) => {
        b.setAttribute("aria-pressed", b.getAttribute("data-shop-filter") === f ? "true" : "false");
      });
      renderShop();
    });
  }

  btnPause.addEventListener("click", () => togglePause());
  btnResume.addEventListener("click", () => togglePause(false));
  btnPauseMenu.addEventListener("click", () => {
    togglePause(false);
    stopLoop();
    stopBgm();
    body.classList.remove("phase-shop");
    startOverlay.hidden = false;
    syncHud();
    ensureShipPreviewRunning();
  });
  const goFs = () => requestFullscreenGame();
  btnFs.addEventListener("click", goFs);
  btnFsTop.addEventListener("click", goFs);

  soundOn.addEventListener("change", () => {
    if (!soundOn.checked) stopBgm();
    else if (running) {
      const bossHere = ufos.some((u) => u.boss);
      setBgmLayer(phase === "shop" ? "shop" : bossHere ? "boss" : "combat");
    }
  });

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (btnInstallTop) btnInstallTop.hidden = false;
  });
  if (btnInstallTop) {
    btnInstallTop.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      btnInstallTop.hidden = true;
      deferredInstallPrompt = null;
    });
  }

  document.querySelectorAll(".modChip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const m = btn.getAttribute("data-mod");
      if (!allowedWeaponMods().has(m)) return;
      weaponMod = m;
      saveWeaponMod();
      syncModChips();
    });
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape") {
      if (running && startOverlay.hidden && gameOverOverlay.hidden) {
        e.preventDefault();
        togglePause();
      }
      return;
    }
    if (paused && running && phase === "combat" && startOverlay.hidden && gameOverOverlay.hidden) {
      e.preventDefault();
      return;
    }
    if (
      e.code === "Space" ||
      e.code === "KeyE" ||
      e.code === "KeyQ" ||
      e.code === "ArrowLeft" ||
      e.code === "ArrowRight" ||
      e.code === "ArrowUp" ||
      e.code === "ArrowDown"
    )
      e.preventDefault();
    keys.add(e.code);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));

  const touchBar = document.getElementById("touchBar");
  const press = (code, down) => {
    if (down) keys.add(code);
    else keys.delete(code);
  };
  touchBar.querySelectorAll("button").forEach((btn) => {
    const act = btn.getAttribute("data-act");
    const map = {
      up: "ArrowUp",
      down: "ArrowDown",
      left: "ArrowLeft",
      right: "ArrowRight",
      fire: "Space",
      missile: "KeyE",
      nova: "KeyQ",
    };
    const code = map[act];
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      press(code, true);
    });
    btn.addEventListener("pointerup", (e) => {
      e.preventDefault();
      press(code, false);
    });
    btn.addEventListener("pointercancel", () => press(code, false));
    btn.addEventListener("pointerleave", (e) => {
      if (e.buttons === 0) press(code, false);
    });
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (!running || phase !== "combat") return;
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * W;
    if (nx < W * 0.4) {
      aimTouchId = e.pointerId;
      aimTouchY = e.clientY;
      aimTouchX = e.clientX;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_) {}
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerId !== aimTouchId) return;
    aimTouchY = e.clientY;
    aimTouchX = e.clientX;
  });
  canvas.addEventListener("pointerup", (e) => {
    if (e.pointerId === aimTouchId) {
      aimTouchId = null;
      aimTouchY = null;
      aimTouchX = null;
    }
  });
  canvas.addEventListener("pointercancel", () => {
    aimTouchId = null;
    aimTouchY = null;
    aimTouchX = null;
  });

  migrateWeaponModsOnce();
  loadDifficulty();
  syncDifficultyChips();
  loadShip();
  syncShipChips();
  loadMetaProgress();

  document.querySelectorAll(".shipChip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = btn.getAttribute("data-ship");
      if (s !== "pulse" && s !== "beam") return;
      shipClass = s;
      saveShip();
      syncShipChips();
      syncHud();
    });
  });

  seedStars();
  wavePill.textContent = "Welle 1";
  syncHud();
  renderShop();
  ensureShipPreviewRunning();
})();
