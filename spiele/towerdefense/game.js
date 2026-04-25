const c = document.getElementById("c");
    const ctx = c.getContext("2d");
    const btnStart = document.getElementById("btnStart");
    const btnReset = document.getElementById("btnReset");
    const btnCenter = document.getElementById("btnCenter");
    const btnSpeed = document.getElementById("btnSpeed");
    const btnBuild = document.getElementById("btnBuild");
    const loadoutEl = document.getElementById("loadout");
    const ghost = document.getElementById("ghost");
    const moneyEl = document.getElementById("money");
    const limitEl = document.getElementById("limit");
    // Loadout is rendered dynamically (no fixed labels here).
    const coinsEl = document.getElementById("coins");
    const menuCoinsEl = document.getElementById("menuCoins");
    const towerMenu = document.getElementById("towerMenu");
    const btnMove = document.getElementById("btnMove");
    const btnSell = document.getElementById("btnSell");
    const selTarget = document.getElementById("selTarget");
    const btnCloseMenu = document.getElementById("btnCloseMenu");
    const towerInfo = document.getElementById("towerInfo");
    const towerUpRule = document.getElementById("towerUpRule");
    const btnUpA = document.getElementById("btnUpA");
    const btnUpB = document.getElementById("btnUpB");
    const upAIco = document.getElementById("upAIco");
    const upBIco = document.getElementById("upBIco");
    const upATitle = document.getElementById("upATitle");
    const upADesc = document.getElementById("upADesc");
    const upALvl = document.getElementById("upALvl");
    const upACost = document.getElementById("upACost");
    const upBTitle = document.getElementById("upBTitle");
    const upBDesc = document.getElementById("upBDesc");
    const upBLvl = document.getElementById("upBLvl");
    const upBCost = document.getElementById("upBCost");
    const upADetailTitle = document.getElementById("upADetailTitle");
    const upBDetailTitle = document.getElementById("upBDetailTitle");
    const upADetail = document.getElementById("upADetail");
    const upBDetail = document.getElementById("upBDetail");
    const stDmg = document.getElementById("stDmg");
    const stRange = document.getElementById("stRange");
    const stRof = document.getElementById("stRof");
    const stSpread = document.getElementById("stSpread");
    const stTurn = document.getElementById("stTurn");
    const stBullet = document.getElementById("stBullet");
    const waveEl = document.getElementById("wave");
    const killsEl = document.getElementById("kills");
    const hpEl = document.getElementById("hp");
    const ov = document.getElementById("ov");
    const ovTitle = document.getElementById("ovTitle");
    const ovText = document.getElementById("ovText");
    const ovAgain = document.getElementById("ovAgain");
    const ovSettings = document.getElementById("ovSettings");
    const ovClose = document.getElementById("ovClose");
    const mainMenu = document.getElementById("mainMenu");
    const menuPane = document.getElementById("menuPane");
    const btnMenuTutorial = document.getElementById("btnMenuTutorial");
    const btnMenuCampaign = document.getElementById("btnMenuCampaign");
    const btnMenuShop = document.getElementById("btnMenuShop");
    const btnMenuSettings = document.getElementById("btnMenuSettings");
    const btnMenuClose = document.getElementById("btnMenuClose");
    const settingsWin = document.getElementById("settingsWin");
    const btnSettingsClose = document.getElementById("btnSettingsClose");
    const shopWin = document.getElementById("shopWin");
    const btnShopClose = document.getElementById("btnShopClose");
    const shopCoinsEl = document.getElementById("shopCoins");
    const shopListEl = document.getElementById("shopList");
    const chkAutostart = document.getElementById("chkAutostart");
    const rngSfx = document.getElementById("rngSfx");
    const tutorialBox = document.getElementById("tutorialBox");
    const tutorialText = document.getElementById("tutorialText");
    const tutorialStepEl = document.getElementById("tutorialStep");
    const btnTutorialExit = document.getElementById("btnTutorialExit");
    const miniToastEl = document.getElementById("miniToast");

    const AC = window.AudioContext || window.webkitAudioContext;
    let actx=null;
    function tone(freq, dur=0.05, type="sine", vol=0.05){
      try{
        actx ||= new AC();
        if (actx.state === "suspended") actx.resume();
        const t0 = actx.currentTime;
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type=type; o.frequency.setValueAtTime(freq, t0);
        const v = vol * clamp(settings.sfxVol ?? 0.8, 0, 1);
        g.gain.setValueAtTime(v, t0);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        o.connect(g); g.connect(actx.destination);
        o.start(t0); o.stop(t0 + dur + 0.02);
      } catch {}
    }
    function gunShot(vol=0.06){
      try{
        actx ||= new AC();
        if (actx.state === "suspended") actx.resume();
        const ac = actx;
        const t0 = ac.currentTime;
        const m = clamp(settings.sfxVol ?? 0.8, 0, 1);

        // transient click
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = "square";
        o.frequency.setValueAtTime(220, t0);
        o.frequency.exponentialRampToValueAtTime(90, t0 + 0.02);
        g.gain.setValueAtTime(vol * 0.55 * m, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.035);
        o.connect(g); g.connect(ac.destination);
        o.start(t0); o.stop(t0 + 0.05);

        // noise burst (body)
        const dur = 0.06;
        const sr = ac.sampleRate;
        const buf = ac.createBuffer(1, Math.floor(sr * dur), sr);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < ch.length; i++){
          const w = 1 - i / ch.length;
          ch[i] = (Math.random()*2-1) * (w*w);
        }
        const ns = ac.createBufferSource();
        ns.buffer = buf;
        const ng = ac.createGain();
        ng.gain.setValueAtTime(vol * 0.85 * m, t0);
        ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        // simple lowpass to avoid harsh hiss
        const lp = ac.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.setValueAtTime(1800, t0);
        lp.frequency.exponentialRampToValueAtTime(900, t0 + dur);
        ns.connect(lp); lp.connect(ng); ng.connect(ac.destination);
        ns.start(t0);
        ns.stop(t0 + dur);

        // bass thump
        const bo = ac.createOscillator();
        const bg = ac.createGain();
        bo.type = "sine";
        bo.frequency.setValueAtTime(90, t0);
        bo.frequency.exponentialRampToValueAtTime(55, t0 + 0.06);
        bg.gain.setValueAtTime(vol * 0.45, t0);
        bg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
        bo.connect(bg); bg.connect(ac.destination);
        bo.start(t0);
        bo.stop(t0 + 0.09);
      } catch {}
    }

    // Grenadier SFX (kept simple & mobile-friendly)
    function grenShot(kind="grenadier", vol=0.065){
      try{
        actx ||= new AC();
        if (actx.state === "suspended") actx.resume();
        const ac = actx;
        const t0 = ac.currentTime;
        const m = clamp(settings.sfxVol ?? 0.8, 0, 1);

        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = "triangle";
        const f0 = (kind === "rocket") ? 120 : (kind === "artillery") ? 95 : 110;
        const f1 = (kind === "rocket") ? 70 : (kind === "artillery") ? 55 : 65;
        o.frequency.setValueAtTime(f0, t0);
        o.frequency.exponentialRampToValueAtTime(f1, t0 + 0.08);
        g.gain.setValueAtTime(vol * m, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.10);
        o.connect(g); g.connect(ac.destination);
        o.start(t0); o.stop(t0 + 0.12);

        // tiny click for "thunk"
        const o2 = ac.createOscillator();
        const g2 = ac.createGain();
        o2.type = "square";
        o2.frequency.setValueAtTime(260, t0);
        g2.gain.setValueAtTime(vol * 0.35 * m, t0);
        g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02);
        o2.connect(g2); g2.connect(ac.destination);
        o2.start(t0); o2.stop(t0 + 0.03);
      } catch {}
    }

    function rocketWhoosh(vol=0.04){
      try{
        actx ||= new AC();
        if (actx.state === "suspended") actx.resume();
        const ac = actx;
        const t0 = ac.currentTime;
        const m = clamp(settings.sfxVol ?? 0.8, 0, 1);
        const dur = 0.12;
        const sr = ac.sampleRate;
        const buf = ac.createBuffer(1, Math.floor(sr * dur), sr);
        const ch = buf.getChannelData(0);
        for (let i=0; i<ch.length; i++){
          const w = 1 - i / ch.length;
          ch[i] = (Math.random()*2-1) * (w*w);
        }
        const ns = ac.createBufferSource();
        ns.buffer = buf;
        const bp = ac.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.setValueAtTime(900, t0);
        bp.frequency.exponentialRampToValueAtTime(520, t0 + dur);
        bp.Q.setValueAtTime(0.9, t0);
        const ng = ac.createGain();
        ng.gain.setValueAtTime(vol * m, t0);
        ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        ns.connect(bp); bp.connect(ng); ng.connect(ac.destination);
        ns.start(t0);
      } catch {}
    }

    function boom(vol=0.07){
      try{
        actx ||= new AC();
        if (actx.state === "suspended") actx.resume();
        const ac = actx;
        const t0 = ac.currentTime;
        const m = clamp(settings.sfxVol ?? 0.8, 0, 1);
        // make grenadier explosions feel loud (while still user-controlled)
        const v = clamp(vol * 1.75, 0, 0.16) * m;
        // low thump
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(92, t0);
        o.frequency.exponentialRampToValueAtTime(38, t0 + 0.12);
        g.gain.setValueAtTime(v, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
        o.connect(g); g.connect(ac.destination);
        o.start(t0); o.stop(t0 + 0.18);
        // short noise burst
        const dur = 0.09;
        const sr = ac.sampleRate;
        const buf = ac.createBuffer(1, Math.floor(sr * dur), sr);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < ch.length; i++){
          const w = 1 - i / ch.length;
          ch[i] = (Math.random()*2-1) * (w*w*w);
        }
        const ns = ac.createBufferSource();
        ns.buffer = buf;
        const lp = ac.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.setValueAtTime(900, t0);
        lp.frequency.exponentialRampToValueAtTime(420, t0 + dur);
        const ng = ac.createGain();
        ng.gain.setValueAtTime(v * 0.65, t0);
        ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        ns.connect(lp); lp.connect(ng); ng.connect(ac.destination);
        ns.start(t0);
      } catch {}
    }
    function vibr(p){ try{ if (navigator.vibrate) navigator.vibrate(p); } catch{} }
    function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
    function lerp(a,b,t){ return a + (b-a)*t; }
    function rand(a,b){ return a + Math.random()*(b-a); }
    function hypot(x,y){ return Math.hypot(x,y); }

    // world is larger than the viewport (canvas). We pan the camera around it.
    const WORLD_W = 2600;
    const WORLD_H = 1500;

    // fixed path (polyline) - scaled up for the bigger world
    const PATH_SCALE = WORLD_W / 960;
    const basePath = [
      {x: -40, y: 120},
      {x: 260, y: 120},
      {x: 260, y: 330},
      {x: 560, y: 330},
      {x: 560, y: 190},
      {x: 880, y: 190},
      {x: 1020, y: 190},
    ];
    let path = basePath.map(p => ({x: p.x * PATH_SCALE, y: p.y * PATH_SCALE}));

    const PATH_HALF_W = 22 * PATH_SCALE; // visual road half-width (block placement)

    function pointSegDist(px, py, ax, ay, bx, by){
      const abx = bx - ax, aby = by - ay;
      const apx = px - ax, apy = py - ay;
      const ab2 = abx*abx + aby*aby;
      const t = ab2 > 1e-6 ? clamp((apx*abx + apy*aby)/ab2, 0, 1) : 0;
      const cx = ax + abx*t, cy = ay + aby*t;
      return hypot(px - cx, py - cy);
    }

    function isOnPath(x, y){
      for (let i=0;i<path.length-1;i++){
        const a = path[i], b = path[i+1];
        if (pointSegDist(x, y, a.x, a.y, b.x, b.y) <= PATH_HALF_W + 18) return true;
      }
      return false;
    }

    function canPlaceAt(x, y){
      if (x < 18 || y < 18 || x > WORLD_W-18 || y > WORLD_H-18) return false;
      if (isOnPath(x, y)) return false;
      for (const t of towers){
        if (hypot(t.x - x, t.y - y) < TOWER_TABOO_R) return false;
      }
      return true;
    }

    let running=false, paused=false, raf=0, last=0;
    let timeScale = 1.0;
    let buildMode=false;
    let baseHP=5;
    let wave=1, kills=0;
    let enemies=[], bullets=[], parts=[];
    let towers=[]; // {id,x,y,ang,cdMs,range,turnSp,mode,idleT}
    let nextTowerId = 1;
    let drag = null; // {type, slot, id}
    let selectedTowerId = 0;
    let camX = 0, camY = 0;
    let pan = null; // {id, sx, sy, cx, cy}
    let hoverTowerId = 0;
    let hoverWX = 0, hoverWY = 0;
    let hoverEnemyId = 0;
    let nextEnemyId = 1;
    let gameMode = "menu"; // menu | tutorial | campaign | shop | settings
    let lastNonMenuMode = "campaign";
    let tutorialOn = false;
    let tutorialStep = 0;
    let tutorialSpots = []; // {x,y,done}
    let overlayMode = "restart"; // restart | next | resume
    let menuAnimOn = false;
    let menuAnimT = 0;
    let menuRaf = 0;
    let menuDots = [];
    let pendingNextWave = false;
    let pendingLoadout = null; // {id,sx,sy,slot,tid,type,started}

    // Campaign (Kapitel 1)
    const CAMP_KEY = "td_campaign_unlocked_c1";
    let campUnlocked = +(localStorage.getItem(CAMP_KEY) || "1");
    campUnlocked = clamp(campUnlocked, 1, 10);
    let campLevel = 1; // 1..10

    const CH1_LEVELS = [
      // waves: number = normal wave size, {boss:'mini'|'big'} = boss wave
      // Level 1-3 should be VERY easy
      {name:"Wiese 1", waves:[6,7,8,9,10], path: () => {
        const y = WORLD_H*0.52;
        return [{x:-120,y},{x:WORLD_W*0.55,y},{x:WORLD_W+200,y}];
      }},
      {name:"Wiese 2", waves:[7,8,9,10,11,12], path: () => {
        const y = WORLD_H*0.45;
        return [{x:-120,y},{x:WORLD_W*0.40,y},{x:WORLD_W*0.40,y:WORLD_H*0.70},{x:WORLD_W+200,y:WORLD_H*0.70}];
      }},
      {name:"Wiese 3", waves:[8,9,10,11,12,13], path: () => {
        return [{x:-120,y:WORLD_H*0.30},{x:WORLD_W*0.55,y:WORLD_H*0.30},{x:WORLD_W*0.55,y:WORLD_H*0.62},{x:WORLD_W+200,y:WORLD_H*0.62}];
      }},
      // From here: more waves, so you can actually build/max towers.
      {name:"Wiese 4", waves:[11,13,15,17,19,21,23,25], path: () => {
        return [{x:-120,y:WORLD_H*0.62},{x:WORLD_W*0.30,y:WORLD_H*0.62},{x:WORLD_W*0.30,y:WORLD_H*0.36},{x:WORLD_W*0.72,y:WORLD_H*0.36},{x:WORLD_W+200,y:WORLD_H*0.36}];
      }},
      // Level 5 ends with a mini boss
      {name:"Wiese 5", waves:[12,14,16,18,20,22,24,26,28,{boss:"mini"}], path: () => {
        return [{x:-120,y:WORLD_H*0.38},{x:WORLD_W*0.30,y:WORLD_H*0.38},{x:WORLD_W*0.30,y:WORLD_H*0.78},{x:WORLD_W*0.68,y:WORLD_H*0.78},{x:WORLD_W*0.68,y:WORLD_H*0.28},{x:WORLD_W+200,y:WORLD_H*0.28}];
      }},
      {name:"Wiese 6", waves:[13,15,17,20,23,26,30,34,38,42,46,50], path: () => {
        return [{x:-120,y:WORLD_H*0.52},{x:WORLD_W*0.22,y:WORLD_H*0.52},{x:WORLD_W*0.22,y:WORLD_H*0.28},{x:WORLD_W*0.48,y:WORLD_H*0.28},{x:WORLD_W*0.48,y:WORLD_H*0.72},{x:WORLD_W*0.78,y:WORLD_H*0.72},{x:WORLD_W+200,y:WORLD_H*0.72}];
      }},
      {name:"Wiese 7", waves:[14,16,19,22,26,30,34,38,42,46,50,56,62,68], path: () => {
        return [{x:-120,y:WORLD_H*0.26},{x:WORLD_W*0.60,y:WORLD_H*0.26},{x:WORLD_W*0.60,y:WORLD_H*0.56},{x:WORLD_W*0.34,y:WORLD_H*0.56},{x:WORLD_W*0.34,y:WORLD_H*0.76},{x:WORLD_W+200,y:WORLD_H*0.76}];
      }},
      {name:"Wiese 8", waves:[15,18,22,26,30,34,38,42,46,50,56,62,68,74,80,86], path: () => {
        return [{x:-120,y:WORLD_H*0.70},{x:WORLD_W*0.40,y:WORLD_H*0.70},{x:WORLD_W*0.40,y:WORLD_H*0.40},{x:WORLD_W*0.78,y:WORLD_H*0.40},{x:WORLD_W*0.78,y:WORLD_H*0.62},{x:WORLD_W+200,y:WORLD_H*0.62}];
      }},
      {name:"Wiese 9", waves:[16,20,24,28,32,36,40,44,50,56,62,68,74,80,88,96,104,112], path: () => {
        return [{x:-120,y:WORLD_H*0.40},{x:WORLD_W*0.28,y:WORLD_H*0.40},{x:WORLD_W*0.28,y:WORLD_H*0.64},{x:WORLD_W*0.52,y:WORLD_H*0.64},{x:WORLD_W*0.52,y:WORLD_H*0.32},{x:WORLD_W*0.76,y:WORLD_H*0.32},{x:WORLD_W*0.76,y:WORLD_H*0.76},{x:WORLD_W+200,y:WORLD_H*0.76}];
      }},
      // Level 10 ends with the big boss
      {name:"Wiese 10", waves:[18,22,26,30,34,38,42,46,52,58,66,74,82,90,98,106,114,122,130,{boss:"big"}], path: () => {
        return [{x:-120,y:WORLD_H*0.52},{x:WORLD_W*0.22,y:WORLD_H*0.52},{x:WORLD_W*0.22,y:WORLD_H*0.22},{x:WORLD_W*0.52,y:WORLD_H*0.22},{x:WORLD_W*0.52,y:WORLD_H*0.80},{x:WORLD_W*0.82,y:WORLD_H*0.80},{x:WORLD_W*0.82,y:WORLD_H*0.36},{x:WORLD_W+200,y:WORLD_H*0.36}];
      }},
    ];

    // Settings
    const SET_KEY = "td_settings_v1";
    const COIN_KEY = "td_coins_v1";
    const TUT_REWARD_KEY = "td_tutorial_rewarded_v1"; // legacy (kept for old saves)
    const OWNED_KEY = "td_owned_towers_v1";
    const CAMP_COIN_CLAIM_KEY = "td_campaign_coin_claimed_c1";
    const settings = (() => {
      try{
        return JSON.parse(localStorage.getItem(SET_KEY) || "{}") || {};
      } catch { return {}; }
    })();
    // sfx volume (0..1)
    if (typeof settings.sfxVol !== "number") settings.sfxVol = 0.8;

    // owned towers (unlocks)
    let owned = new Set(["pistol"]);
    try{
      const raw = JSON.parse(localStorage.getItem(OWNED_KEY) || "null");
      if (raw && Array.isArray(raw)){
        owned = new Set(raw.filter(x => typeof x === "string"));
        owned.add("pistol");
      }
    } catch {}
    function saveOwned(){
      try{ localStorage.setItem(OWNED_KEY, JSON.stringify([...owned])); } catch {}
    }

    // Loadout: what is equipped (owned != equipped)
    const LOADOUT_KEY = "td_loadout_v1";
    /** @type {(null|string)[]} */
    let loadout = ["pistol", null, null, null, null];
    try{
      const raw = JSON.parse(localStorage.getItem(LOADOUT_KEY) || "null");
      if (raw && Array.isArray(raw) && raw.length === 5){
        loadout = raw.map(x => (typeof x === "string" ? x : null));
        loadout[0] ||= "pistol";
      }
    } catch {}
    function saveLoadout(){
      try{ localStorage.setItem(LOADOUT_KEY, JSON.stringify(loadout)); } catch {}
    }

    function towerCardData(id){
      if (id === "pistol"){
        return {
          id,
          name: "Pistole",
          cost: MG_COST,
          svg: `<svg class="sico" viewBox="0 0 64 64" aria-hidden="true">
            <path fill="rgba(220,235,255,.92)" d="M10 28h30c2 0 4 2 4 4v6h-6v-4H24v10c0 2-2 4-4 4H10v-6h8V28z"/>
            <path fill="rgba(255,215,106,.75)" d="M40 28h10v6H40z"/>
            <path fill="rgba(34,211,238,.35)" d="M18 44h8v4h-8z"/>
          </svg>`
        };
      }
      if (id === "grenadier"){
        return {
          id,
          name: "Grenadier",
          cost: GREN_COST,
          svg: `<svg class="sico" viewBox="0 0 64 64" aria-hidden="true">
            <path fill="rgba(255,215,106,.90)" d="M14 34h34v8H14z"/>
            <path fill="rgba(220,235,255,.85)" d="M18 26h18v8H18z"/>
            <path fill="rgba(34,211,238,.45)" d="M40 24h6v20h-6z"/>
            <circle cx="22" cy="46" r="6" fill="rgba(255,107,107,.65)"/>
          </svg>`
        };
      }
      if (id === "minigunner"){
        return {
          id,
          name: "Minigunner",
          cost: MINI_COST,
          svg: `<svg class="sico" viewBox="0 0 64 64" aria-hidden="true">
            <path fill="rgba(255,215,106,.90)" d="M14 36h36v8H14z"/>
            <path fill="rgba(220,235,255,.80)" d="M18 26h18v10H18z"/>
            <path fill="rgba(34,211,238,.45)" d="M38 28h10v6H38z"/>
            <path fill="rgba(255,107,107,.35)" d="M44 22h4v22h-4z"/>
          </svg>`
        };
      }
      return { id, name: id, cost: 0, svg: "" };
    }

    function renderLoadout(){
      if (!loadoutEl) return;
      for (let i=0;i<5;i++){
        const slot = loadoutEl.querySelector(`.slot[data-slot="${i}"]`);
        if (!slot) continue;
        const tid = loadout[i];
        slot.innerHTML = "";
        if (!tid){
          slot.classList.add("empty");
          slot.style.opacity = "0.35";
          slot.innerHTML = `<div><b>—</b><small>leer</small></div>`;
          continue;
        }
        const d = towerCardData(tid);
        slot.classList.remove("empty");
        slot.style.opacity = "1";
        slot.innerHTML = `
          <div style="display:grid;place-items:center;gap:6px">
            ${d.svg}
            <div><b>${d.name}</b><small>€${d.cost}</small></div>
          </div>
        `;
        slot.classList.toggle("canbuy", money >= d.cost);
        slot.classList.toggle("cantbuy", money < d.cost);
      }
    }

    let coins = 0;
    try{
      coins = +(localStorage.getItem(COIN_KEY) || "0") || 0;
    } catch { coins = 0; }
    coins = Math.max(0, coins|0);

    function saveCoins(){
      try{ localStorage.setItem(COIN_KEY, String(coins|0)); } catch {}
    }
    function addCoins(n){
      coins = Math.max(0, (coins|0) + (n|0));
      saveCoins();
      syncUI();
    }

    function spendCoins(n){
      n = n|0;
      if (coins < n) return false;
      coins -= n;
      saveCoins();
      syncUI();
      return true;
    }

    function awardTutorialCoinsOnce(){
      try{
        if (localStorage.getItem(TUT_REWARD_KEY)) return false;
        localStorage.setItem(TUT_REWARD_KEY, "1");
      } catch {
        if (awardTutorialCoinsOnce._done) return false;
        awardTutorialCoinsOnce._done = true;
      }
      addCoins(50);
      return true;
    }
    if (typeof settings.autostart !== "boolean") settings.autostart = false; // user requested default OFF
    function saveSettings(){
      try{ localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch {}
    }
    let spawnAcc=0, waveLeft=0, waveSpawned=0;
    let campWave = 1;
    let campWaveCount = 1;
    let campWaveBoss = null; // "mini" | "big" | null
    // Campaign enemy progression is per LEVEL (not per wave)
    let shake=0, flash=0;
    let money = 120;
    const MG_COST = 50;
    const GREN_COST = 120;
    const MINI_COST = 550;
    const KILL_REWARD = 10;
    const TOWER_LIMIT = 20;
    const TOWER_TABOO_R = 34;
    const UP_MAX = 5;

    const PISTOL_PATH_A = [
      {name:"Halbautomatik‑Kit", desc:"leicht höhere Feuerrate (kontrolliert)"},
      {name:"Abzug‑Tuning", desc:"noch etwas schneller (bleibt präzise)"},
      {name:"Maschinengewehr", desc:"richtiges MG: sehr hohe RPM + großer Spread"},
      {name:"Hochdruck‑System", desc:"noch mehr RPM, wilderes Feuer"},
      {name:"Doppel‑MG", desc:"endgame: brutal schnell + maximaler Spray"},
    ];
    const PISTOL_PATH_B = [
      {name:"Größeres Kaliber", desc:"mehr Schaden + etwas mehr Range"},
      {name:"Match‑Munition", desc:"noch mehr Schaden + Range"},
      {name:"Scharfschützengewehr", desc:"sehr viel Schaden + große Range, aber low RPM"},
      {name:"Panzerbrecher", desc:"noch mehr Damage, noch mehr Range"},
      {name:"Rail‑Prototype", desc:"max Damage + max Range, ultra langsam"},
    ];

    const GREN_PATH_A = [
      {name:"Stabiler Zünder", desc:"Granaten explodieren zuverlässiger (mehr AoE)"},
      {name:"Raketen‑Motoren", desc:"erste Mini‑Rockets: schneller, gerader Flug"},
      {name:"Raketenwerfer", desc:"Rockets statt Granaten: schneller, größere Explosion"},
      {name:"Split‑Rockets", desc:"Explosion spawnt Mini‑Splitter‑Explosionen"},
      {name:"Vierfach‑Salve", desc:"endgame: 4 langsam homing Rockets (fächern aus, finden das Ziel)"},
    ];
    const GREN_PATH_B = [
      {name:"Schweres Rohr", desc:"mehr Schaden, etwas mehr Range (langsamer)"},
      {name:"Mörser‑Ladung", desc:"Vorbereitung: größerer AoE, schwerer Schuss (noch kein Bogen)"},
      {name:"Artillerie", desc:"ab jetzt Lob‑Schüsse (Bogen) + massiver Radius + Slow"},
      {name:"Druckwelle", desc:"Slow stärker & länger, riesige Zone"},
      {name:"Belagerungs‑Kanone", desc:"L5: extrem Range + extrem Schaden (teuer, aber brutal)"},
    ];

    const MINI_PATH_A = [
      {name:"Vorschub‑Motor", desc:"leicht höhere ROF (kontrolliert)"},
      {name:"Barrel‑Stabilizer", desc:"weniger Spread + etwas mehr Turn"},
      {name:"Minigun", desc:"extreme ROF, Spool‑Up (kurz), mehr Spread"},
      {name:"Overdrive‑Gears", desc:"noch mehr ROF + längere Salven"},
      {name:"Twin‑Feed", desc:"L5: 2 Projektile pro Schuss (teuer, aber krank)"},
    ];
    const MINI_PATH_B = [
      {name:"Präzisions‑Gurt", desc:"mehr Range + weniger Spread"},
      {name:"AP‑Munition", desc:"mehr Damage + etwas Bullet‑Speed"},
      {name:"Long‑Range Minigun", desc:"mehr Range + stabiler Strahl, aber weniger ROF"},
      {name:"Durchschlag", desc:"Projektile piercen 2 Gegner"},
      {name:"Hyper‑Pierce", desc:"L5: pierce 4 + hoher Damage"},
    ];

    function towerPaths(t){
      if (t && t.baseType === "grenadier") return {A: GREN_PATH_A, B: GREN_PATH_B};
      if (t && t.baseType === "minigunner") return {A: MINI_PATH_A, B: MINI_PATH_B};
      return {A: PISTOL_PATH_A, B: PISTOL_PATH_B};
    }

    function towerBaseName(t){
      if (t && t.baseType === "grenadier") return "Grenadier";
      if (t && t.baseType === "minigunner") return "Minigunner";
      return "Pistole";
    }

    function showOverlay(title, text){
      ovTitle.textContent = title;
      ovText.textContent = text;
      ov.classList.add("show");
      ov.setAttribute("aria-hidden","false");
    }
    function hideOverlay(){
      ov.classList.remove("show");
      ov.setAttribute("aria-hidden","true");
    }

    function openWin(winEl){
      winEl.classList.add("show");
      winEl.setAttribute("aria-hidden","false");
    }
    function closeWin(winEl){
      winEl.classList.remove("show");
      winEl.setAttribute("aria-hidden","true");
    }
    function openSettings(){
      chkAutostart.checked = !!settings.autostart;
      if (rngSfx) rngSfx.value = String(Math.round(clamp(settings.sfxVol, 0, 1) * 100));
      openWin(settingsWin);
    }
    function openShop(){
      renderShopWin();
      openWin(shopWin);
    }

    function renderShopWin(){
      if (shopCoinsEl) shopCoinsEl.textContent = `🪙${coins|0}`;
      if (!shopListEl) return;
      shopListEl.className = "shopList";
      const items = [
        {
          id: "grenadier",
          title: "Grenadier",
          price: 200,
          desc: "AoE‑Tower: Granaten/Rockets/Artillerie. Gut gegen Gruppen, später Slow/DoT‑Zonen.",
          svg: `<svg viewBox="0 0 64 64" aria-hidden="true">
            <path fill="rgba(255,215,106,.90)" d="M14 34h34v8H14z"/>
            <path fill="rgba(220,235,255,.85)" d="M18 26h18v8H18z"/>
            <path fill="rgba(34,211,238,.45)" d="M40 24h6v20h-6z"/>
            <circle cx="22" cy="46" r="6" fill="rgba(255,107,107,.65)"/>
          </svg>`
        },
        {
          id: "minigunner",
          title: "Minigunner",
          price: 500,
          desc: "Dauerfeuer‑Tower: Minigun. Pfad A: Spool‑Up/Overdrive. Pfad B: Präzision/Pierce. Bis 2‑2 harmonisch.",
          svg: `<svg viewBox="0 0 64 64" aria-hidden="true">
            <path fill="rgba(255,215,106,.90)" d="M14 36h36v8H14z"/>
            <path fill="rgba(220,235,255,.80)" d="M18 26h18v10H18z"/>
            <path fill="rgba(34,211,238,.45)" d="M38 28h10v6H38z"/>
            <path fill="rgba(255,107,107,.35)" d="M44 22h4v22h-4z"/>
          </svg>`
        }
      ];
      shopListEl.innerHTML = "";
      for (const it of items){
        const isOwned = owned.has(it.id);
        const canBuy = !isOwned && coins >= it.price;
        const isEquipped = loadout.includes(it.id);
        const el = document.createElement("div");
        el.className = "shopItem";
        el.innerHTML = `
          <div class="ico">${it.svg}</div>
          <div style="min-width:0;flex:1">
            <div class="t">${it.title}</div>
            <div class="d">${it.desc}</div>
            <div class="row">
              <span class="${isOwned ? "owned" : "price"}">${isOwned ? "GEKAUFT" : `Preis: 🪙${it.price}`}</span>
              <button type="button" class="primary" data-buy="${it.id}" ${(!isOwned && !canBuy) ? "disabled" : ""}>${isOwned ? (isEquipped ? "Ausgerüstet" : "Ausrüsten") : "Kaufen"}</button>
            </div>
          </div>
        `;
        const btn = el.querySelector("button[data-buy]");
        if (btn){
          btn.addEventListener("click", ()=>{
            if (!owned.has(it.id)){
              if (!spendCoins(it.price)) { tone(160,0.08,"sawtooth",0.05); vibr(10); return; }
              owned.add(it.id);
              saveOwned();
              tone(720,0.06,"triangle",0.05);
              vibr(12);
              renderShopWin();
              syncUI();
              return;
            }
            // owned: equip into loadout (not in tutorial)
            if (tutorialOn) return;
            if (loadout.includes(it.id)) return;
            const idx = loadout.findIndex(x => !x);
            if (idx < 0) { tone(160,0.08,"sawtooth",0.05); vibr(10); return; }
            loadout[idx] = it.id;
            saveLoadout();
            tone(540,0.06,"triangle",0.04);
            renderShopWin();
            syncUI();
          });
        }
        shopListEl.appendChild(el);
      }
    }

    function pauseGame(reason="Pause"){
      if (!running) return;
      if (paused) return;
      paused = true;
      overlayMode = "resume";
      showOverlay("Pause", reason);
      // reuse overlay buttons: "Nochmal" becomes "Weiter" while paused
      ovAgain.textContent = "Weiter";
    }

    function resumeGame(){
      if (!paused) return;
      paused = false;
      overlayMode = "restart";
      hideOverlay();
      ovAgain.textContent = "Nochmal";
      last = performance.now();
    }

    let toastTimer = 0;
    function showMiniToast(text, ms=900){
      if (!miniToastEl) return;
      miniToastEl.textContent = text;
      miniToastEl.classList.add("show");
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(()=> miniToastEl.classList.remove("show"), ms);
    }
    function syncUI(){
      if (gameMode === "campaign"){
        waveEl.textContent = `Level: ${campLevel} · Welle: ${campWave}/${campWaveCount}`;
      } else {
        waveEl.textContent = `Wave: ${wave}`;
      }
      killsEl.textContent = `Kills: ${kills}`;
      moneyEl.textContent = `€${money|0}`;
      if (coinsEl) coinsEl.textContent = `🪙${coins|0}`;
      if (menuCoinsEl) menuCoinsEl.textContent = `🪙${coins|0}`;
      limitEl.textContent = `Türme: ${towers.length}/${TOWER_LIMIT}`;
      hpEl.textContent = `Base: ${baseHP}`;
      btnSpeed.textContent = `Speed: ${timeScale.toFixed(1)}×`;
      renderLoadout();
      // live update panel (so upgrade buttons enable immediately when money changes)
      if (towerMenu.classList.contains("show") && selectedTowerId){
        renderTowerPanel();
      }
    }

    function upCost(nextLevel){
      // generic baseline curve
      return 25 + nextLevel*25;
    }

    function upCostFor(t, path, nextLevel){
      let c = upCost(nextLevel);
      if (t && t.baseType === "grenadier"){
        // Grenadier Artillerie should be noticeably more expensive (endgame nuke).
        if (path === "B" && nextLevel >= 3){
          c = Math.round(c * 2.4 + 80 * (nextLevel - 2));
        }
        // Rocket path gets a smaller surcharge at high levels.
        if (path === "A" && nextLevel >= 4){
          c = Math.round(c * 1.35 + 40 * (nextLevel - 3));
        }
      }
      if (t && t.baseType === "minigunner"){
        // Minigunner gets pricier fast (high DPS tower).
        if (path === "A" && nextLevel >= 3) c = Math.round(c * 1.55 + 60 * (nextLevel - 2));
        if (path === "B" && nextLevel >= 3) c = Math.round(c * 1.40 + 50 * (nextLevel - 2));
      }
      return c;
    }

    function towerTotalValue(t){
      // basis + already bought upgrades (deterministic cost curve)
      const a = t.upA || 0;
      const b = t.upB || 0;
      const base = (t.baseType === "grenadier") ? GREN_COST : (t.baseType === "minigunner") ? MINI_COST : MG_COST;
      let v = base;
      for (let i=1;i<=a;i++) v += upCostFor(t, "A", i);
      for (let i=1;i<=b;i++) v += upCostFor(t, "B", i);
      return v;
    }

    function recomputeTowerStats(t){
      // default base type (backwards compatible)
      if (!t.baseType){
        t.baseType =
          (t.kind === "grenadier" || t.kind === "rocket" || t.kind === "artillery") ? "grenadier"
          : (t.kind === "minigun") ? "minigunner"
          : "pistol";
      }
      // Base: Pistolenturm
      const a = t.upA || 0;
      const b = t.upB || 0;

      if (t.baseType === "grenadier"){
        // Base: Grenadier (slow AoE)
        t.kind = "grenadier";
        t.range = 280;
        t.turnSp = 2.2;
        t.fireMs = 1400; // long reload feel
        t.spreadMax = 3 * (Math.PI/180);
        t.dmg = 10;
        t.projSp = 520;
        t.aoeR = 70;
        t.slowMul = 1.0;
        t.slowSec = 0;
        t.dotDps = 0;
        t.dotSec = 0;
        t.lob = false;
        t.grav = 0;
        t.multi = 1;
        t.homing = 0;

        // A path -> rockets (single big rocket fantasy)
        if (a === 1){ t.aoeR = 82; t.dmg = 11; }
        if (a === 2){ t.projSp = 520; t.fireMs = 1350; t.homing = 0.05; t.range += 40; }
        if (a >= 3){
          t.kind = "rocket";
          // rockets: slower-ish but track (cool feeling)
          t.range = 440;
          t.projSp = 380; // slow rocket
          t.fireMs = 2600; // very slow reload
          t.aoeR = 95;
          t.dmg = 14;
          t.homing = 0.14; // always tracks hard
          t.multi = 1;     // IMPORTANT: only one rocket
          t.spreadMax = 3.0 * (Math.PI/180);
        }
        if (a >= 4){
          // split rockets -> extra small splashes
          t.split = 2;
        } else t.split = 0;
        if (a >= 5){
          // L5: ONE huge rocket, even slower, big boom
          t.multi = 1;
          t.fireMs = 3400;
          t.range = 520;
          t.projSp = 340; // even slower, but strong tracking
          t.homing = 0.18;
          t.spreadMax = 2.5 * (Math.PI/180);
          t.aoeR = 125;
          t.dmg = 18.5;
        }

        // B path -> artillery
        if (b === 1){ t.dmg += 3; t.range += 20; t.fireMs += 80; }
        // b==2 is still a "pre-artillery" upgrade (no lob yet)
        if (b === 2){ t.aoeR += 26; t.fireMs += 140; t.dmg += 2; }
        if (b >= 3){
          t.kind = "artillery";
          t.lob = true;
          t.grav = 1250;
          // IMPORTANT: when going Artillery, do NOT inherit rocket-style homing/split from A<=2.
          // Otherwise mixed builds like 2-5 can feel "buggy" (shell tries to home mid-arc).
          t.homing = 0;
          t.split = 0;
          t.spreadMax = 2.5 * (Math.PI/180);

          // heavy reload fantasy (slow)
          t.fireMs = 2400;
          t.range = 360;
          t.dmg = 18 + (a>=3?2:0);
          t.aoeR = 120;
          t.slowMul = 0.62;
          t.slowSec = 1.6;
        }
        if (b >= 4){
          t.aoeR = 145;
          t.fireMs = Math.max(t.fireMs, 3000);
          t.slowMul = 0.52;
          t.slowSec = 2.2;
        }
        if (b >= 5){
          // L5 artillery: extreme range + damage (expensive endgame nuke)
          t.kind = "artillery";
          t.lob = true;
          t.grav = 1400;
          t.homing = 0;
          t.split = 0;
          t.spreadMax = 2.2 * (Math.PI/180);
          t.fireMs = 3800;
          t.range = 560;
          t.dmg = 55;
          t.aoeR = 190;
          // keep the CC flavor but focus on the nuke fantasy
          t.slowMul = 0.70;
          t.slowSec = 1.3;
          t.dotDps = 0;
          t.dotSec = 0;
        }

        // Cross-path small synergies (levels 1-2 only)
        if (a > 0 && a < 3 && b >= 3){
          t.aoeR += 10;
          t.dmg += 1;
        }
        if (b > 0 && b < 3 && a >= 3){
          t.aoeR += 8;
        }
        return;
      }

      if (t.baseType === "minigunner"){
        const a = t.upA || 0;
        const b = t.upB || 0;
        t.kind = "minigun";
        t.range = 260;
        t.turnSp = 2.0;
        // Starts fast already (minigun fantasy)
        t.fireMs = 55;
        t.spreadMax = 11 * (Math.PI/180);
        t.dmg = 1.35;
        t.projSp = 920;
        t.multi = 1;
        t.spool = 0.0; // 0..1 (ramps when firing)
        t.pierceBase = 1;

        // Cross‑path harmony up to 2‑2: both sides always give value.
        if (a >= 1){ t.fireMs = Math.max(28, t.fireMs - 6); }
        if (b >= 1){ t.range += 30; t.spreadMax *= 0.85; }
        if (a >= 2){ t.turnSp += 0.25; t.fireMs = Math.max(26, t.fireMs - 6); }
        if (b >= 2){ t.dmg += 0.55; t.projSp += 90; }

        // Specialize at 3+
        if (a >= 3){
          // Minigun storm
          t.fireMs = 36;
          t.spreadMax = 14 * (Math.PI/180);
          t.dmg = 1.25 + (b>=2?0.30:0);
          t.projSp = 980;
          t.spoolUp = 0.95; // faster spool
        } else {
          t.spoolUp = 0.60;
        }
        if (a >= 4){
          t.fireMs = 30;
          t.spreadMax = 16 * (Math.PI/180);
          t.dmg += 0.20;
        }
        if (a >= 5){
          // Twin‑feed: 2 projectiles per tick (very strong, very expensive path)
          t.multi = 2;
          t.fireMs = 34;
          t.spreadMax = 14 * (Math.PI/180);
        }

        if (b >= 3){
          // Long‑range minigun (precision line)
          t.range = 340 + (a>=2?10:0);
          t.fireMs = 72;
          t.spreadMax = 4.2 * (Math.PI/180);
          t.dmg = 2.8 + (a>=2?0.2:0);
          t.projSp = 980;
          t.spoolUp = 0.40;
        }
        if (b >= 4){
          t.pierceBase = 2;
          t.dmg += 0.35;
        }
        if (b >= 5){
          t.pierceBase = 4;
          t.dmg += 0.65;
          t.range += 30;
        }
        return;
      }

      t.kind = "pistol";
      t.range = 230;
      t.turnSp = 3.1;
      t.fireMs = 420;           // low RPM
      t.spreadMax = 2 * (Math.PI/180);
      t.dmg = 6;                // a bit more damage
      t.projSp = 720;

      // Path A: faster fire rate. At level 3 -> MG.
      if (a === 1){ t.kind = "pistol_semi"; t.fireMs = 340; }
      if (a === 2){ t.kind = "pistol_fast"; t.fireMs = 270; }
      if (a >= 3){
        t.kind = "mg";
        t.turnSp = 1.3;
        t.fireMs = (a === 3) ? 55 : (a === 4) ? 45 : 38;
        t.spreadMax = (a === 3) ? (20*Math.PI/180) : (a === 4) ? (24*Math.PI/180) : (28*Math.PI/180);
        t.dmg = 2;
        t.range = 240 + (a-3)*10;
        t.projSp = 640;
      }

      // Path B: damage + range. At level 3 -> Sniper.
      // If we're already MG (A>=3), B(1-2) should NOT revert the weapon back to pistol.
      if (b === 1 && a < 3){ t.kind = "pistol_caliber"; t.dmg = 8; t.range = 255; t.fireMs = 460; }
      if (b === 2 && a < 3){ t.kind = "pistol_caliber2"; t.dmg = 10; t.range = 275; t.fireMs = 500; }
      if (b >= 3){
        t.kind = "sniper";
        t.turnSp = 1.05;
        t.fireMs = (b === 3) ? 1150 : (b === 4) ? 1350 : 1600;
        t.spreadMax = (b === 3) ? (0.7*Math.PI/180) : (b === 4) ? (0.5*Math.PI/180) : (0.35*Math.PI/180);
        t.dmg = (b === 3) ? 18 : (b === 4) ? 26 : 36;
        t.range = (b === 3) ? 520 : (b === 4) ? 620 : 760;
        t.projSp = 980;
      }

      // Cross-path bonuses still matter (e.g. 0-3 -> 2-3 should buff sniper a bit)
      // Only the "minor" levels (1-2) leak into the other specialization.
      const aMinor = Math.min(a, 2);
      const bMinor = Math.min(b, 2);
      if (t.kind === "sniper" && aMinor > 0){
        // Semi/trigger tuning makes the sniper cycle a bit faster
        const mul = (aMinor === 1) ? 0.92 : 0.85;
        t.fireMs = Math.max(520, Math.round(t.fireMs * mul));
      }
      if (t.kind === "mg" && bMinor > 0){
        // caliber/range knowledge improves MG effective reach + slightly more punch
        t.range += (bMinor === 1) ? 18 : 34;
        t.dmg += (bMinor === 1) ? 0.5 : 1.0;
      }
      // small synergy when both are in the "2-2 zone"
      if (aMinor > 0 && bMinor > 0 && a <= 2 && b <= 2){
        t.range += 8;
        t.fireMs = Math.max(180, t.fireMs - 15);
      }
    }

    function canUpgradePath(t, path){
      const a = t.upA || 0;
      const b = t.upB || 0;
      const other = (path === "A") ? b : a;
      const self = (path === "A") ? a : b;
      if (self >= UP_MAX) return false;
      // exclusivity rule: up to 2-2 is allowed; once one side >2, the other side is capped at 2
      if (other > 2 && self >= 2) return false;
      return true;
    }

    function renderTowerPanel(){
      const t = towers.find(x => x.id === selectedTowerId);
      if (!t) return;
      t.upA = t.upA || 0;
      t.upB = t.upB || 0;
      recomputeTowerStats(t);

      const paths = towerPaths(t);
      const PATH_A = paths.A;
      const PATH_B = paths.B;

      const totalV = towerTotalValue(t);
      const sellBack = Math.floor(totalV * 0.5);
      const moveCost = Math.ceil(totalV * 0.10);
      const rof = (1000/(t.fireMs||420)).toFixed(1);
      towerInfo.textContent = `${towerBaseName(t)} · DMG ${t.dmg|0} · Range ${t.range|0} · ROF ${rof}/s · Wert €${totalV}`;
      const lock = (t.upA > 2) ? "B max 2" : (t.upB > 2) ? "A max 2" : "frei bis 2-2";
      towerUpRule.textContent = `Regel: ${lock}`;

      // stats cards
      stDmg.innerHTML = `<b>${(t.dmg||0).toFixed( (t.dmg%1)?1:0 )}</b>`;
      stRange.innerHTML = `<b>${t.range|0}</b>`;
      stRof.innerHTML = `<b>${rof}/s</b> (${Math.round(60000/(t.fireMs||420))} RPM)`;
      stSpread.innerHTML = `<b>±${((t.spreadMax||0)*180/Math.PI).toFixed(1)}°</b>`;
      stTurn.innerHTML = `<b>${(t.turnSp||0).toFixed(2)}</b>`;
      stBullet.innerHTML = `<b>${(t.projSp||0)|0}</b> px/s`;

      const nextA = t.upA + 1;
      const nextB = t.upB + 1;

      // Button text = next upgrade name (no "Pfad A/B" label)
      upATitle.textContent = t.upA >= UP_MAX ? (PATH_A[UP_MAX-1]?.name || "MAX") : (PATH_A[nextA-1]?.name || "Upgrade");
      upADesc.textContent = t.upA >= UP_MAX ? "Maximal" : (PATH_A[nextA-1]?.desc || "—");
      upALvl.textContent = `${t.upA}/${UP_MAX}`;
      upACost.textContent = t.upA >= UP_MAX ? "MAX" : `€${upCostFor(t, "A", nextA)}`;

      upBTitle.textContent = t.upB >= UP_MAX ? (PATH_B[UP_MAX-1]?.name || "MAX") : (PATH_B[nextB-1]?.name || "Upgrade");
      upBDesc.textContent = t.upB >= UP_MAX ? "Maximal" : (PATH_B[nextB-1]?.desc || "—");
      upBLvl.textContent = `${t.upB}/${UP_MAX}`;
      upBCost.textContent = t.upB >= UP_MAX ? "MAX" : `€${upCostFor(t, "B", nextB)}`;

      const aOk = canUpgradePath(t, "A");
      const bOk = canUpgradePath(t, "B");
      const aCost = upCostFor(t, "A", nextA);
      const bCost = upCostFor(t, "B", nextB);
      btnUpA.disabled = !aOk || money < aCost;
      btnUpB.disabled = !bOk || money < bCost;
      btnUpA.classList.toggle("locked", !aOk && t.upA < UP_MAX);
      btnUpB.classList.toggle("locked", !bOk && t.upB < UP_MAX);
      btnUpA.classList.toggle("canbuy", aOk && t.upA < UP_MAX && money >= aCost);
      btnUpA.classList.toggle("cantbuy", aOk && t.upA < UP_MAX && money < aCost);
      btnUpB.classList.toggle("canbuy", bOk && t.upB < UP_MAX && money >= bCost);
      btnUpB.classList.toggle("cantbuy", bOk && t.upB < UP_MAX && money < bCost);

      btnSell.textContent = `Sell (+€${sellBack})`;
      btnMove.textContent = `Move (-€${moveCost})`;
      btnMove.disabled = money < moveCost;

      const nextAName = PATH_A[nextA-1]?.name || "—";
      const nextADesc = PATH_A[nextA-1]?.desc || "MAX";
      const nextBName = PATH_B[nextB-1]?.name || "—";
      const nextBDesc = PATH_B[nextB-1]?.desc || "MAX";
      upADetailTitle.textContent = `Oben – ${t.upA >= UP_MAX ? "MAX" : nextAName}`;
      upADetail.innerHTML =
        `<b>Jetzt:</b> ${(t.upA||0)===0 ? towerBaseName(t) : (PATH_A[(t.upA||0)-1]?.name || "—")}<br>` +
        `<b>Nächstes:</b> ${t.upA >= UP_MAX ? "—" : nextADesc}<br>` +
        `<b>Konzept:</b> ${(t.baseType==="grenadier") ? "Rockets: (später) Tracking + große Explosionen." : "mehr Feuerrate → ab L3 echtes MG."}`;

      upBDetailTitle.textContent = `Unten – ${t.upB >= UP_MAX ? "MAX" : nextBName}`;
      upBDetail.innerHTML =
        `<b>Jetzt:</b> ${(t.upB||0)===0 ? towerBaseName(t) : (PATH_B[(t.upB||0)-1]?.name || "—")}<br>` +
        `<b>Nächstes:</b> ${t.upB >= UP_MAX ? "—" : nextBDesc}<br>` +
        `<b>Konzept:</b> ${(t.baseType==="grenadier") ? "Artillerie: ab L3 Lob‑Schüsse (Bogen) + riesige Zone + Slow." : "mehr Damage+Range → ab L3 Sniper."}`;

      // icons
      setIcon(upAIco, iconForName(upATitle.textContent));
      setIcon(upBIco, iconForName(upBTitle.textContent));
    }

    function iconForName(name){
      const n = (name||"").toLowerCase();
      if (n.includes("maschinen") || n.includes("mg")) return "mg";
      if (n.includes("mini") || n.includes("gat") || n.includes("minigun")) return "mg";
      if (n.includes("scharf") || n.includes("sniper") || n.includes("rail")) return "sniper";
      if (n.includes("kaliber") || n.includes("munition") || n.includes("panzer")) return "caliber";
      if (n.includes("raket") || n.includes("artiller") || n.includes("mörser") || n.includes("granat") || n.includes("druckwelle")) return "gren";
      return "pistol";
    }
    function setIcon(el, kind){
      const col = (kind === "sniper") ? "rgba(93,255,180,.92)"
        : (kind === "mg") ? "rgba(255,215,106,.92)"
        : (kind === "gren") ? "rgba(255,215,106,.92)"
        : (kind === "caliber") ? "rgba(255,107,107,.88)"
        : "rgba(220,235,255,.92)";
      if (kind === "mg"){
        el.innerHTML = `<svg viewBox="0 0 64 64"><path fill="${col}" d="M10 28h26c2 0 4 2 4 4v6h-6v-4H22v10c0 2-2 4-4 4H10v-6h6V28z"/><path fill="rgba(255,215,106,.55)" d="M38 24h16v8H38z"/><path fill="rgba(255,215,106,.55)" d="M38 34h16v8H38z"/></svg>`;
      } else if (kind === "sniper"){
        el.innerHTML = `<svg viewBox="0 0 64 64"><path fill="${col}" d="M10 32h44v6H10z"/><path fill="rgba(34,211,238,.45)" d="M22 24h16v6H22z"/><path fill="rgba(255,255,255,.18)" d="M46 28h8v14h-8z"/></svg>`;
      } else if (kind === "gren"){
        el.innerHTML = `<svg viewBox="0 0 64 64"><path fill="${col}" d="M12 34h40v8H12z"/><path fill="rgba(220,235,255,.35)" d="M18 26h18v8H18z"/><path fill="rgba(34,211,238,.35)" d="M42 24h8v20h-8z"/><circle cx="22" cy="46" r="6" fill="rgba(255,107,107,.55)"/></svg>`;
      } else if (kind === "caliber"){
        el.innerHTML = `<svg viewBox="0 0 64 64"><path fill="${col}" d="M14 26h28c2 0 4 2 4 4v6h-6v-4H28v12c0 2-2 4-4 4H14v-6h8V26z"/><path fill="rgba(255,215,106,.55)" d="M46 26h6v12h-6z"/></svg>`;
      } else {
        el.innerHTML = `<svg viewBox="0 0 64 64"><path fill="${col}" d="M12 28h30c2 0 4 2 4 4v6h-6v-4H26v10c0 2-2 4-4 4H12v-6h8V28z"/><path fill="rgba(255,215,106,.55)" d="M42 28h10v6H42z"/></svg>`;
      }
    }

    function reset(){
      // Reset the current run state, but DON'T wipe global mode/progression (tutorial/campaign/menu).
      running=false;
      paused=false;
      cancelAnimationFrame(raf);
      buildMode=false;
      baseHP=5;
      wave=1; kills=0;
      enemies=[]; bullets=[]; parts=[];
      towers=[];
      nextTowerId = 1;
      spawnAcc=0; waveLeft=0; waveSpawned=0;
      pendingNextWave = false;
      shake=0; flash=0;
      money = (gameMode === "campaign") ? 250 : 120;
      timeScale = 1.0;
      // Campaign: on defeat/restart you go back to wave 1 of the SAME level.
      if (gameMode === "campaign"){
        campWave = 1;
        campWaveBoss = null;
        campWaveCount = (CH1_LEVELS[clamp(campLevel,1,10)-1]?.waves?.length) || campWaveCount || 1;
      }
      hideOverlay();
      syncUI();
      draw();
    }

    function start(){
      if (running) return;
      hideOverlay();
      running=true;
      paused=false;
      ovAgain.textContent = "Nochmal";
      last = performance.now();
      if (waveLeft <= 0) beginWave();
      raf = requestAnimationFrame(loop);
    }

    function showMenu(){
      if (gameMode !== "menu") lastNonMenuMode = gameMode;
      gameMode = "menu";
      mainMenu.classList.add("show");
      mainMenu.setAttribute("aria-hidden","false");
      paused = false;
      running = false;
      cancelAnimationFrame(raf);
      tutorialBox.classList.remove("show");
      startMenuAnim();
    }
    function hideMenu(){
      mainMenu.classList.remove("show");
      mainMenu.setAttribute("aria-hidden","true");
      stopMenuAnim();
    }

    function closeMenuAndReturn(){
      hideMenu();
      gameMode = lastNonMenuMode || "campaign";
      syncUI();
      draw();
    }

    function startMenuAnim(){
      if (menuAnimOn) return;
      menuAnimOn = true;
      menuAnimT = performance.now();
      // spawn dots once
      menuDots = [];
      for (let i=0;i<80;i++){
        menuDots.push({
          x: Math.random()*WORLD_W,
          y: Math.random()*WORLD_H,
          r: 1.0 + Math.random()*2.2,
          sp: 10 + Math.random()*30,
          a: Math.random()*Math.PI*2,
          col: (Math.random()<0.5) ? "rgba(34,211,238,0.18)" : "rgba(93,255,180,0.16)",
        });
      }
      const tick = (ts)=>{
        if (!menuAnimOn) return;
        const dt = Math.min(40, ts - menuAnimT);
        menuAnimT = ts;
        const sec = dt/1000;
        // soft drift
        for (const d of menuDots){
          d.a += sec * 0.25;
          d.x += Math.cos(d.a)*d.sp*sec;
          d.y += Math.sin(d.a)*d.sp*sec*0.6;
          if (d.x < -60) d.x = WORLD_W+60;
          if (d.x > WORLD_W+60) d.x = -60;
          if (d.y < -60) d.y = WORLD_H+60;
          if (d.y > WORLD_H+60) d.y = -60;
        }
        // animate a subtle background even if the game isn't running
        draw();
        menuRaf = requestAnimationFrame(tick);
      };
      menuRaf = requestAnimationFrame(tick);
    }
    function stopMenuAnim(){
      menuAnimOn = false;
      if (menuRaf) cancelAnimationFrame(menuRaf);
      menuRaf = 0;
    }

    function setMapTutorialDefault(){
      // Tutorial should be the "old" map (the one we had before)
      path = basePath.map(p => ({x: p.x * PATH_SCALE, y: p.y * PATH_SCALE}));
      camX = 0; camY = 0;
      rebuildPathCache();
    }

    function setMapCampaignLevel(lv){
      const idx = clamp(lv, 1, 10) - 1;
      path = CH1_LEVELS[idx].path();
      // center camera roughly on mid path
      const mid = path[(path.length/2)|0];
      camX = clamp(mid.x - c.width*0.35, 0, Math.max(0, WORLD_W - c.width));
      camY = clamp(mid.y - c.height*0.55, 0, Math.max(0, WORLD_H - c.height));
      rebuildPathCache();
    }

    function startTutorial(){
      hideMenu();
      gameMode = "tutorial";
      tutorialOn = true;
      tutorialStep = 1;
      // Tutorial loadout: only pistol equipped.
      loadout = ["pistol", null, null, null, null];
      saveLoadout();
      reset();
      // override reset state
      tutorialOn = true;
      tutorialStep = 1;
      tutorialBox.classList.add("show");
      money = 150;
      baseHP = 40;
      wave = 1;
      kills = 0;
      enemies = []; bullets = []; parts = [];
      towers = [];
      setMapTutorialDefault();
      tutorialSpots = makeTutorialSpots();
      syncUI();
      updateTutorialUI();
      draw();
    }

    function makeTutorialSpots(){
      // Build spots near corners but safely away from the path.
      const pts = [];
      const corners = [1,2,4].filter(i => path[i] && path[i-1] && path[i+1]);
      for (const i of corners){
        const p0 = path[i-1], p1 = path[i], p2 = path[i+1];
        const dx1 = p1.x - p0.x, dy1 = p1.y - p0.y;
        const dx2 = p2.x - p1.x, dy2 = p2.y - p1.y;
        // use outgoing direction
        const len = Math.max(1e-6, hypot(dx2, dy2));
        const ux = dx2/len, uy = dy2/len;
        let px = -uy, py = ux; // perp
        // push away strongly
        let sx = p1.x + px*200 + ux*40;
        let sy = p1.y + py*200 + uy*40;
        // if still on path, flip side
        if (isOnPath(sx, sy)){
          px = -px; py = -py;
          sx = p1.x + px*200 + ux*40;
          sy = p1.y + py*200 + uy*40;
        }
        // final nudge if needed
        let tries = 0;
        while (isOnPath(sx, sy) && tries < 6){
          sx += px*40; sy += py*40;
          tries++;
        }
        pts.push({x: sx, y: sy, done: false});
      }
      return pts;
    }

    function claimTutorialSpotIfAny(tx, ty){
      if (!tutorialOn) return false;
      let best = -1, bestD = 1e9;
      for (let i=0;i<tutorialSpots.length;i++){
        const s = tutorialSpots[i];
        if (!s || s.done) continue;
        const d = hypot(tx - s.x, ty - s.y);
        if (d < bestD){ bestD = d; best = i; }
      }
      if (best >= 0 && bestD <= 78){
        const s = tutorialSpots[best];
        s.done = true;
        // confirmation FX
        for (let i=0;i<26;i++){
          const a = Math.random()*Math.PI*2;
          const sp = 120 + Math.random()*520;
          parts.push({x:s.x,y:s.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:0.30+Math.random()*0.22,col:"rgba(93,255,180,0.75)",s:2+Math.random()*3.4});
        }
        flash = Math.min(1, flash + 0.10);
        // Tutorial: keep it subtle (no "screen vibration").
        shake = Math.max(shake, tutorialOn ? 1.2 : 4);
        return true;
      }
      return false;
    }

    function startCampaign(level=1){
      hideMenu();
      gameMode = "campaign";
      tutorialOn = false;
      tutorialBox.classList.remove("show");
      campLevel = clamp(level, 1, 10);
      setMapCampaignLevel(campLevel);
      reset();
      // campaign difficulty per level
      wave = campLevel;
      campWave = 1;
      money = 250;
      const cfg = CH1_LEVELS[clamp(campLevel,1,10)-1];
      campWaveCount = (cfg.waves && cfg.waves.length) ? cfg.waves.length : 1;
      beginWave();
      // Level should only start when the user presses Start.
      running = false;
      paused = false;
      pendingNextWave = false;
      syncUI();
      draw();
    }

    function updateTutorialUI(){
      if (!tutorialOn) return;
      tutorialBox.classList.add("show");
      tutorialBox.setAttribute("aria-hidden","false");
      tutorialStepEl.textContent = `Step ${tutorialStep}/4`;
      if (tutorialStep === 1) tutorialText.textContent = "Zieh unten die Pistole aufs Feld (nicht auf den Pfad).";
      else if (tutorialStep === 2) tutorialText.textContent = "Drück Start und lass die Pistole 5 Gegner erledigen.";
      else if (tutorialStep === 3) tutorialText.textContent = "Tippe deinen Turm an und kaufe 1 Upgrade (oben oder unten).";
      else tutorialText.textContent = "Nice. Tutorial geschafft! +50 Münzen. Du kannst jetzt Kampagne starten.";
    }

    function checkTutorialProgress(){
      if (!tutorialOn) return;
      // Step 1 should only complete when the player actually uses a suggested spot.
      if (tutorialStep === 1 && (tutorialSpots || []).some(s => s && s.done)){
        tutorialStep = 2;
        updateTutorialUI();
      } else if (tutorialStep === 2 && kills >= 5){
        tutorialStep = 3;
        updateTutorialUI();
      } else if (tutorialStep === 3){
        const t0 = towers[0];
        if (t0 && ((t0.upA||0) + (t0.upB||0)) >= 1){
          tutorialStep = 4;
          updateTutorialUI();
          awardTutorialCoinsOnce();
        }
      }
    }

    function beginWave(){
      if (gameMode === "campaign"){
        const cfg = CH1_LEVELS[clamp(campLevel,1,10)-1];
        const list = (cfg.waves && cfg.waves.length) ? cfg.waves : [cfg.enemies || 18];
        campWaveCount = list.length;
        const idx = clamp(campWave, 1, campWaveCount) - 1;
        const w = list[idx];
        campWaveBoss = null;
        if (typeof w === "number") waveLeft = w;
        else if (w && typeof w === "object" && w.boss){
          campWaveBoss = (w.boss === "big") ? "big" : "mini";
          waveLeft = 1;
        } else {
          waveLeft = 18;
        }
      } else {
        // Tutorial should be forgiving and consistent.
        if (tutorialOn) waveLeft = 6;
        else waveLeft = 8 + wave*2;
      }
      waveSpawned = 0;
      spawnAcc = 0;
    }

    function spawnEnemy(){
      // 3 enemy types: normal / speedy / tanky
      if (tutorialOn){
        enemies.push({
          id: nextEnemyId++,
          kind: "normal",
          name: "Normal",
          t: 0,
          hp: 18,
          hpMax: 18,
          sp: 58,
          r: 12,
          hit: 0,
          vx: 0,
          vy: 0
        });
        waveSpawned++;
        waveLeft--;
        return;
      }

      // Campaign bosses (single spawn waves)
      if (gameMode === "campaign" && campWaveBoss && waveSpawned === 0){
        const baseHp = 70 + (campLevel * 26);
        const kind = (campWaveBoss === "big") ? "boss" : "miniboss";
        const name = (campWaveBoss === "big") ? "Boss" : "Mini‑Boss";
        const hp = (campWaveBoss === "big") ? Math.round(baseHp * 6.2) : Math.round(baseHp * 2.8);
        const sp = (campWaveBoss === "big") ? (78 + campLevel*2) : (92 + campLevel*2.5);
        const r = (campWaveBoss === "big") ? 28 : 20;
        enemies.push({id: nextEnemyId++, kind, name, t:0, hp, hpMax: hp, sp, r, hit:0, vx:0, vy:0});
        waveSpawned++;
        waveLeft--;
        return;
      }

      const diffWave = (gameMode === "campaign") ? (campLevel + campWave - 1) : wave;
      // Early campaign (Grasland) should be really easy: low HP + low speed.
      let baseHp = 26 + diffWave*6;
      let baseSp = 82 + diffWave*3;
      if (gameMode === "campaign"){
        if (campLevel <= 3){
          baseHp = 18 + diffWave*4;
          baseSp = 64 + diffWave*2.2;
        } else if (campLevel <= 5){
          baseHp = 22 + diffWave*5;
          baseSp = 74 + diffWave*2.6;
        }
      }
      let kind = "normal";
      // Campaign: unlock enemy types per LEVEL
      if (gameMode === "campaign"){
        const L = campLevel|0;
        const r = Math.random();
        if (L >= 6){
          // all types can appear
          if (r < 0.14) kind = "shield";
          else if (r < 0.30) kind = "regen";
          else if (r < 0.50) kind = "speedy";
          else if (r < 0.70) kind = "tanky";
        } else if (L >= 5){
          if (r < 0.14) kind = "shield";
          else if (r < 0.34) kind = "regen";
          else if (r < 0.58) kind = "speedy";
          else if (r < 0.78) kind = "tanky";
        } else if (L >= 4){
          if (r < 0.22) kind = "regen";
          else if (r < 0.52) kind = "speedy";
          else if (r < 0.74) kind = "tanky";
        } else if (L >= 3){
          if (r < 0.30) kind = "speedy";
          else if (r < 0.52) kind = "tanky";
        } else if (L >= 2){
          if (r < 0.30) kind = "speedy";
        }
        // tiny deterministic spice, but still per-level rule
        if (L >= 3 && (waveSpawned % 9) === 0) kind = "tanky";
        if (L >= 2 && (waveSpawned % 7) === 0) kind = "speedy";
      } else {
        // non-campaign (endless): scale with wave number
        if (wave >= 2 && Math.random() < 0.28) kind = "speedy";
        if (wave >= 4 && Math.random() < 0.22) kind = "tanky";
        if (wave >= 6 && (waveSpawned % 7) === 0) kind = "tanky";
        if (wave >= 3 && (waveSpawned % 5) === 0) kind = "speedy";
      }

      let hp = baseHp, sp = baseSp, r = 12, name = "Normal";
      let shieldHp = 0, regen = 0;
      if (kind === "speedy"){
        name = "Speedy";
        hp = Math.round(baseHp * 0.70);
        sp = baseSp * 1.55;
        r = 10;
      } else if (kind === "tanky"){
        name = "Tank";
        hp = Math.round(baseHp * 2.35);
        sp = baseSp * 0.75;
        r = 15;
      } else if (kind === "regen"){
        name = "Regenerator";
        hp = Math.round(baseHp * 1.25);
        sp = baseSp * 0.92;
        r = 13;
        regen = 7 + diffWave*0.6; // hp/s
      } else if (kind === "shield"){
        name = "Shield";
        hp = Math.round(baseHp * 1.05);
        sp = baseSp * 1.00;
        r = 13;
        shieldHp = 24 + diffWave*3;
      }
      enemies.push({id: nextEnemyId++, kind, name, t:0, hp, hpMax: hp, shieldHp, regen, sp, r, hit:0, vx:0, vy:0});
      waveSpawned++;
      waveLeft--;
    }

    function pathPos(t){
      // t in [0..1] across segments with constant speed approximation
      // We'll move in "distance along path" space instead (t is dist).
      let d = t;
      for (let i=0;i<path.length-1;i++){
        const a=path[i], b=path[i+1];
        const seg = hypot(b.x-a.x, b.y-a.y);
        if (d <= seg){
          const u = d/seg;
          return {x: lerp(a.x,b.x,u), y: lerp(a.y,b.y,u), dx: (b.x-a.x)/seg, dy:(b.y-a.y)/seg};
        }
        d -= seg;
      }
      const last = path[path.length-1];
      const prev = path[path.length-2];
      const seg = hypot(last.x-prev.x, last.y-prev.y) || 1;
      return {x:last.x, y:last.y, dx:(last.x-prev.x)/seg, dy:(last.y-prev.y)/seg, end:true};
    }

    function totalPathLen(){
      let s=0;
      for (let i=0;i<path.length-1;i++){
        s += hypot(path[i+1].x-path[i].x, path[i+1].y-path[i].y);
      }
      return s;
    }
    let PATH_LEN = totalPathLen();

    // Cache sampled points along the path for fast/pretty arrow animation.
    let pathCache = []; // [{x,y,dx,dy,ang}]
    function rebuildPathCache(){
      PATH_LEN = totalPathLen();
      const step = 22 * PATH_SCALE; // dense enough to smooth corners
      const pts = [];
      for (let d=0; d<=PATH_LEN; d+=step){
        const p = pathPos(d);
        pts.push({x:p.x, y:p.y, dx:p.dx||1, dy:p.dy||0});
      }
      // smooth tangent using neighbors
      for (let i=0;i<pts.length;i++){
        const p0 = pts[Math.max(0, i-1)];
        const p1 = pts[Math.min(pts.length-1, i+1)];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const len = hypot(dx,dy) || 1;
        pts[i].dx = dx/len;
        pts[i].dy = dy/len;
        pts[i].ang = Math.atan2(pts[i].dy, pts[i].dx);
      }
      pathCache = pts;
    }

    function dmgEnemy(e, dmg, hx, hy){
      if (e.dead) return;
      if (e.shieldHp && e.shieldHp > 0){
        const s = Math.min(e.shieldHp, dmg);
        e.shieldHp -= s;
        dmg -= s;
        for (let i=0;i<3;i++){
          const a = Math.random()*Math.PI*2;
          const sp = rand(60, 160);
          parts.push({x:hx, y:hy, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, life: rand(0.10, 0.22), s: rand(2.2, 4.0), col:"rgba(120,220,255,0.55)"});
        }
        if (dmg <= 0){
          e.hit = 0.08;
          return;
        }
      }
      e.hp -= dmg;
      e.hit = 0.08;
      flash = Math.min(1, flash + 0.03);
      // hit effects OFF (sound + spark), instead: small "chips" break off the enemy
      const col = "rgba(249,115,22,0.85)";
      for (let i=0;i<6;i++){
        const a = Math.random()*Math.PI*2;
        const sp = 70 + Math.random()*260;
        parts.push({x:hx,y:hy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:0.22+Math.random()*0.16,col,s:1.8+Math.random()*2.6, sq:true, rot:Math.random()*Math.PI*2, vr:(Math.random()*2-1)*10});
      }
      if (e.hp <= 0){
        kills++;
        // progressive money: later campaign levels pay slightly more per kill
        money += KILL_REWARD + ((gameMode === "campaign") ? Math.floor(campLevel * 0.8) : 0);
        // Tutorial: keep screen shake mild (otherwise it can feel like constant vibration).
        shake = Math.max(shake, tutorialOn ? 2.2 : 7);
        flash = Math.min(1, flash + 0.18);
        // pop explosion
        for (let i=0;i<24;i++){
          const a = Math.random()*Math.PI*2;
          const sp = 120 + Math.random()*520;
          parts.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:0.32+Math.random()*0.28,col:"rgba(34,211,238,0.85)",s:2+Math.random()*3.4});
        }
        // kill sound OFF for now
        e.dead = true;
      }
    }

    function explodeAt(x, y, r, dmg, opts={}){
      // sound (throttled to avoid spam)
      explodeAt.sfxT = Math.max(0, (explodeAt.sfxT || 0) - 1);
      if ((explodeAt.sfxT || 0) <= 0){
        boom(clamp(0.045 + r/900, 0.045, 0.095));
        explodeAt.sfxT = 2; // only every few explosions
      }
      // big boom fx
      flash = Math.min(1, flash + 0.14);
      shake = Math.max(shake, tutorialOn ? 1.6 : 5.5);
      for (let i=0;i<34;i++){
        const a = Math.random()*Math.PI*2;
        const sp = 90 + Math.random()*520;
        parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:0.22+Math.random()*0.22,col:"rgba(255,215,106,0.75)",s:2+Math.random()*3.6});
      }
      for (let i=0;i<18;i++){
        const a = Math.random()*Math.PI*2;
        const sp = 40 + Math.random()*240;
        parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:0.30+Math.random()*0.18,col:"rgba(34,211,238,0.45)",s:2+Math.random()*3.2, sq:true, rot:Math.random()*Math.PI*2, vr:(Math.random()*2-1)*10});
      }
      // damage in radius
      for (const e of enemies){
        if (e.dead) continue;
        const dx = e.x - x, dy = e.y - y;
        const d = hypot(dx, dy);
        if (d > r + e.r) continue;
        // small falloff (center feels stronger)
        const mul = clamp(1 - d / (r + 1), 0.35, 1);
        dmgEnemy(e, (dmg * mul), x, y);
        if (opts.slowSec && opts.slowMul && opts.slowMul < 0.99){
          e.slowT = Math.max(e.slowT || 0, opts.slowSec);
          e.slowMul = Math.min(e.slowMul || 1, opts.slowMul);
        }
        if (opts.dotSec && opts.dotDps){
          e.dotT = Math.max(e.dotT || 0, opts.dotSec);
          e.dotDps = Math.max(e.dotDps || 0, opts.dotDps);
        }
      }
    }

    function pickTarget(tower){
      if (!tower) return null;
      const mode = tower.mode || "first";
      const inRange = [];
      for (const e of enemies){
        if (e.dead) continue;
        const dx = e.x - tower.x, dy = e.y - tower.y;
        const d = hypot(dx,dy);
        if (d <= tower.range) inRange.push({e, d});
      }
      if (!inRange.length) return null;
      if (mode === "random") return inRange[(Math.random()*inRange.length)|0].e;
      if (mode === "closest") return inRange.sort((a,b)=>a.d-b.d)[0].e;
      if (mode === "farthest") return inRange.sort((a,b)=>b.d-a.d)[0].e;
      if (mode === "strongest") return inRange.sort((a,b)=>b.e.hp-a.e.hp)[0].e;
      if (mode === "weakest") return inRange.sort((a,b)=>a.e.hp-b.e.hp)[0].e;
      if (mode === "first") return inRange.sort((a,b)=>b.e.t-a.e.t)[0].e;
      if (mode === "last") return inRange.sort((a,b)=>a.e.t-b.e.t)[0].e;
      return inRange[0].e;
    }

    function enemyHitTest(p){
      for (let i=enemies.length-1;i>=0;i--){
        const e = enemies[i];
        if (e.dead) continue;
        const dx = p.x - e.x, dy = p.y - e.y;
        if (dx*dx + dy*dy <= (e.r+10)*(e.r+10)) return e.id;
      }
      return 0;
    }

    function pickInBarrel(tower, cone){
      // Any enemy roughly in the current barrel direction.
      // Used so MG can "spray" at stuff in front of the barrel even if target mode differs.
      let best = null;
      let bestScore = -1e9;
      for (const e of enemies){
        if (e.dead) continue;
        const dx = e.x - tower.x, dy = e.y - tower.y;
        const d = hypot(dx,dy);
        if (d > tower.range) continue;
        const a = Math.atan2(dy, dx);
        let da = a - tower.ang;
        while (da > Math.PI) da -= Math.PI*2;
        while (da < -Math.PI) da += Math.PI*2;
        const ad = Math.abs(da);
        if (ad > cone) continue;
        // prefer: closer to centerline and closer distance
        const score = -(ad * 2.2) - (d * 0.01);
        if (score > bestScore){ bestScore = score; best = e; }
      }
      return best;
    }

    function segCircleHit(ax, ay, bx, by, cx, cy, r){
      // segment AB vs circle centered at C
      const abx = bx - ax, aby = by - ay;
      const acx = cx - ax, acy = cy - ay;
      const ab2 = abx*abx + aby*aby;
      const t = ab2 > 1e-6 ? clamp((acx*abx + acy*aby)/ab2, 0, 1) : 0;
      const px = ax + abx*t, py = ay + aby*t;
      const dx = px - cx, dy = py - cy;
      return (dx*dx + dy*dy) <= r*r;
    }

    function hasTowerLOS(fromTower, tx, ty){
      // Blocks bullets: if another tower sits between shooter and target.
      const blockR = 18;
      for (const t of towers){
        if (t.id === fromTower.id) continue;
        if (segCircleHit(fromTower.x, fromTower.y, tx, ty, t.x, t.y, blockR)) return false;
      }
      return true;
    }

    function leadAim(tx, ty, tvx, tvy, sx, sy, projSp, maxT=0.55){
      // solve |(T + V*t) - S| = sp*t
      const rx = tx - sx, ry = ty - sy;
      const a = (tvx*tvx + tvy*tvy) - projSp*projSp;
      const b = 2*(rx*tvx + ry*tvy);
      const c2 = (rx*rx + ry*ry);
      let t = 0;
      if (Math.abs(a) < 1e-6){
        t = (Math.abs(b) < 1e-6) ? 0 : (-c2 / b);
      } else {
        const disc = b*b - 4*a*c2;
        if (disc >= 0){
          const s = Math.sqrt(disc);
          const t1 = (-b - s) / (2*a);
          const t2 = (-b + s) / (2*a);
          t = Math.min(t1 > 0 ? t1 : 1e9, t2 > 0 ? t2 : 1e9);
          if (!isFinite(t) || t === 1e9) t = 0;
        } else t = 0;
      }
      t = clamp(t, 0, maxT);
      return {x: tx + tvx*t, y: ty + tvy*t};
    }

    function tryShoot(tower, dt){
      if (!tower) return;
      // cooldown is in milliseconds (dt is ms)
      tower.cdMs = Math.max(0, (tower.cdMs ?? 0) - dt);
      tower.idleT = (tower.idleT ?? 0);
      tower.fireHoldT = (tower.fireHoldT ?? 0); // keeps firing briefly
      tower.sfxAcc = (tower.sfxAcc ?? 0);
      tower.recoil = (tower.recoil ?? 0);
      tower.heat = (tower.heat ?? 0);
      tower.recoil = Math.max(0, tower.recoil - dt/90); // quick kick + decay
      tower.heat = Math.max(0, tower.heat - dt/900); // slow cool-down
      const target = pickTarget(tower);
      const sec = dt/1000;
      if (target){
        tower.idleT = 0;
        tower.fireHoldT = 0.25; // don't stop instantly when target leaves range
        const projSp = tower.projSp || 640;
        // Grenadier uses explosive projectiles (AoE) and can lob shells.
        if (tower.baseType === "grenadier"){
          const aim = leadAim(target.x, target.y, target.vx||0, target.vy||0, tower.x, tower.y, projSp, 0.9);
          const dx0 = aim.x - tower.x, dy0 = aim.y - tower.y;
          const ang0 = Math.atan2(dy0, dx0);
          // We'll rotate towards the actual shot direction (especially important for lob shots),
          // otherwise the turret can "snap" or wobble.
          if (tower.cdMs > 0) return;
          if (!tower.lob && !hasTowerLOS(tower, target.x, target.y)) return;

          const maxSpread = tower.spreadMax || (3 * (Math.PI/180));
          const multi = tower.multi || 1;
          for (let i=0;i<multi;i++){
            const spread = rand(-maxSpread, maxSpread);
            const shotAng = tower.ang + spread;
            const muzzleLen = 34;
            let bx = tower.x + Math.cos(shotAng)*muzzleLen;
            let by = tower.y + Math.sin(shotAng)*muzzleLen;

            let vx = Math.cos(shotAng) * projSp;
            let vy = Math.sin(shotAng) * projSp;
            let life = tower.lob ? 1.45 : 1.05;
            // Artillery lob: compute a ballistic shot that lands on the predicted aim spot.
            if (tower.lob && tower.grav){
              const g = tower.grav;
              // Important: spawn from the tower center for lob shots.
              // Otherwise a "rotating muzzle offset" makes the shell miss and look like it falls down.
              bx = tower.x;
              by = tower.y;
              const ax = aim.x - bx;
              const ay = aim.y - by;
              const dist = Math.max(1, hypot(ax, ay));
              // Choose a flight time that produces a consistent arc.
              // Slightly longer than "direct" time => nicer parabola and less weird jitter.
              let T = clamp(dist / (projSp * 0.85), 0.80, 1.55);
              vx = ax / T;
              vy = (ay / T) - 0.5 * g * T;
              // If the required speed is too high, increase time until it's feasible.
              for (let it=0; it<5; it++){
                const spReq = hypot(vx, vy);
                if (spReq <= projSp * 1.05) break;
                T *= 1.10;
                vx = ax / T;
                vy = (ay / T) - 0.5 * g * T;
              }
              const angShot = Math.atan2(vy, vx);
              // rotate turret towards the computed ballistic direction (no snapping)
              let da = angShot - tower.ang;
              while (da > Math.PI) da -= Math.PI*2;
              while (da < -Math.PI) da += Math.PI*2;
              const maxTurn = (tower.turnSp * 0.55) * sec;
              tower.ang += clamp(da, -maxTurn, maxTurn);
              // only fire when reasonably aligned with the ballistic shot direction
              if (Math.abs(da) > 0.22) return;
              life = clamp(T + 0.35, 0.95, 2.10);
            }
            // Non-lob grenadier: rotate towards direct aim and only fire if aligned a bit
            if (!tower.lob){
              let da0 = ang0 - tower.ang;
              while (da0 > Math.PI) da0 -= Math.PI*2;
              while (da0 < -Math.PI) da0 += Math.PI*2;
              const maxTurn0 = (tower.turnSp * 0.55) * sec;
              tower.ang += clamp(da0, -maxTurn0, maxTurn0);
              if (Math.abs(da0) > 0.65) return;
            }

            tower.cdMs = tower.fireMs || 980;
            bullets.push({
              x: bx, y: by,
              vx, vy,
              g: tower.grav || 0,
              life: (tower.kind === "rocket") ? 12.0 : life,
              dmg: tower.dmg || 10,
              kind: tower.kind || "grenadier",
              aoe: tower.aoeR || 70,
              slowMul: tower.slowMul || 1.0,
              slowSec: tower.slowSec || 0,
              dotDps: tower.dotDps || 0,
              dotSec: tower.dotSec || 0,
              split: tower.split || 0,
              homing: tower.homing || 0,
              targetId: target.id,
              // big rockets
              size: (tower.kind === "rocket") ? (((tower.upA||0) >= 5) ? 2.25 : 1.35) : (tower.kind === "artillery") ? 1.35 : 1,
              spd: (tower.kind === "rocket") ? (hypot(vx, vy) || (tower.projSp||340)) : undefined,
              homeX: tower.x, homeY: tower.y,
              // Artillery should always explode where it was aimed (even if it "misses")
              explodeX: tower.lob ? aim.x : undefined,
              explodeY: tower.lob ? aim.y : undefined,
            });

            // muzzle FX
            for (let k=0;k<7;k++){
              const a = shotAng + rand(-0.8, 0.8);
              const s = 80 + Math.random()*320;
              parts.push({x:bx,y:by,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0.12+Math.random()*0.10,col:"rgba(255,215,106,0.75)",s:2+Math.random()*2.6});
            }
          }
          tower.recoil = 1.0;
          tower.heat = Math.min(1, (tower.heat||0) + 0.18);
          // Grenadier SFX: heavy thunk + (rocket) whoosh
          tower.sfxAcc += 1;
          if ((tower.sfxAcc % 1) === 0) grenShot(tower.kind || "grenadier", 0.070);
          if ((tower.kind === "rocket") && ((tower.sfxAcc % 2) === 0)) rocketWhoosh(0.040);
          return;
        }
        const maxLeadT = (tower.kind === "sniper") ? 1.6 : 0.55;
        const aim = leadAim(target.x, target.y, target.vx||0, target.vy||0, tower.x, tower.y, projSp, maxLeadT);
        const dx = aim.x - tower.x, dy = aim.y - tower.y;
        const ang = Math.atan2(dy, dx);
        // rotate slowly (feels heavier)
        let da = ang - tower.ang;
        while (da > Math.PI) da -= Math.PI*2;
        while (da < -Math.PI) da += Math.PI*2;
        const maxTurn = (tower.turnSp * 0.55) * sec; // slower turn
        tower.ang += clamp(da, -maxTurn, maxTurn);
        // fire if roughly in barrel corridor (sniper requires near-perfect alignment)
        const cone = (tower.kind === "sniper") ? 0.035 : 0.75; // radians
        const aligned = Math.abs(da) < cone;
        const close = hypot(target.x - tower.x, target.y - tower.y) < 86;
        const barrelEnemy = (tower.kind === "sniper") ? null : pickInBarrel(tower, cone);
        const shootEnemy = barrelEnemy || target;
        if (((tower.kind === "sniper") ? aligned : (aligned || close || barrelEnemy)) && tower.cdMs <= 0){
          // don't shoot "through" other towers
          if (!hasTowerLOS(tower, shootEnemy.x, shootEnemy.y)) return;
          // MG: faster fire rate with small spread
          // Minigunner: spool-up + sustained fire feel
          if (tower.kind === "minigun"){
            tower.spool = clamp((tower.spool || 0) + (dt/1000) * (tower.spoolUp || 0.60), 0, 1);
            const spMul = 1.0 - 0.45 * (tower.spool || 0); // faster when spooled
            tower.cdMs = Math.max(14, (tower.fireMs || 55) * spMul);
          } else {
            tower.cdMs = tower.fireMs || 50;
          }
          const sp = tower.projSp || projSp;
          const maxSpread = (tower.spreadMax || (20 * (Math.PI/180)));
          const spread = rand(-maxSpread, maxSpread);
          const aim2 = leadAim(shootEnemy.x, shootEnemy.y, shootEnemy.vx||0, shootEnemy.vy||0, tower.x, tower.y, sp, maxLeadT);
          const baseAng = Math.atan2(aim2.y - tower.y, aim2.x - tower.x);
          // Bullet must come straight out of the barrel:
          // spawn point and travel direction use the same angle.
          // (aiming happens by rotating the turret towards baseAng over time)
          const shotAng = (tower.kind === "sniper") ? baseAng : (tower.ang + spread);
          const muzzleLen = (tower.kind === "sniper") ? 44 : (tower.kind === "mg") ? 33 : 29;
          const bx = tower.x + Math.cos(shotAng)*muzzleLen;
          const by = tower.y + Math.sin(shotAng)*muzzleLen;
          const pierce =
            (tower.kind === "sniper" && (tower.upB||0) >= 5) ? 3
            : (tower.kind === "minigun" ? (tower.pierceBase || 1) : 1);
          const multi = (tower.kind === "mg" && (tower.upA||0) >= 5) ? 2 : 1;
          const ox = -Math.sin(shotAng), oy = Math.cos(shotAng);
          const sep = (tower.kind === "mg" && multi === 2) ? 6 : 0;
          for (let i=0;i<multi;i++){
            const sgn = (i === 0) ? -1 : 1;
            const px = bx + ox * sep * sgn;
            const py = by + oy * sep * sgn;
            const aShot = (tower.kind === "mg" && multi === 2) ? (shotAng + rand(-0.02, 0.02)) : shotAng;
            bullets.push({
              x:px,y:py,
              vx:Math.cos(aShot)*sp,vy:Math.sin(aShot)*sp,
              life: (tower.kind === "minigun") ? 0.55 : 0.95,
              dmg: tower.dmg || 2,
              kind: tower.kind || "pistol",
              pierce,
              // bigger, cooler rockets
              size: (tower.kind === "rocket") ? 1.75 : (tower.kind === "artillery") ? 1.35 : 1,
              homeX: tower.x, homeY: tower.y,
            });
          }
          tower.recoil = 1.0;
          // Minigun: more heat buildup (visual spin/juice)
          tower.heat = Math.min(1, (tower.heat||0) + ((tower.kind === "minigun") ? 0.16 : 0.22));
          // muzzle flash
          const mfN = (tower.kind === "minigun") ? 2 : 3;
          for (let i=0;i<mfN;i++){
            const a = shotAng + rand(-0.7, 0.7);
            const s = 90 + Math.random()*340;
            const col = (tower.kind === "minigun") ? "rgba(34,211,238,0.75)" : "rgba(255,215,106,0.85)";
            parts.push({x:bx,y:by,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0.09+Math.random()*0.06,col,s:2+Math.random()*2.4});
          }
          // Minigun: eject a casing sometimes
          if (tower.kind === "minigun" && (Math.random() < 0.35)){
            const ca = shotAng + Math.PI/2 + rand(-0.7, 0.7);
            const cs = 120 + Math.random()*260;
            parts.push({x: tower.x, y: tower.y, vx: Math.cos(ca)*cs, vy: Math.sin(ca)*cs, life: 0.35+Math.random()*0.18, s: 2.2+Math.random()*2.2, col:"rgba(255,215,106,0.55)", sq:true, rot:rand(0,Math.PI*2), vr:rand(-10,10)});
          }
          // SFX
          tower.sfxAcc += 1;
          if (tower.kind === "minigun"){
            if ((tower.sfxAcc % 3) === 0) gunShot(0.055);
          } else {
            // MG sound: faster + louder (still throttled a bit)
            if ((tower.sfxAcc % 2) === 0) gunShot(0.080);
          }
          // no vibrate spam
        }
      } else {
        tower.fireHoldT = Math.max(0, tower.fireHoldT - sec);
        if (tower.kind === "minigun"){
          // spool down when not shooting
          tower.spool = clamp((tower.spool || 0) - (dt/1000) * 0.55, 0, 1);
        }
        // idle: wait 3s, then slowly return to "rest" angle (0°)
        tower.idleT += dt/1000;
          if (tower.idleT >= 3){
          const rest = Math.PI; // look towards spawn (left)
          let da = rest - tower.ang;
          while (da > Math.PI) da -= Math.PI*2;
          while (da < -Math.PI) da += Math.PI*2;
          const maxTurn = (tower.turnSp * 0.45) * sec;
          tower.ang += clamp(da, -maxTurn, maxTurn);
        }
      }
    }

    function step(dt){
      const sec = dt/1000;
      // wave spawns
      if (waveLeft > 0){
        spawnAcc += dt;
        const diffWave = (gameMode === "campaign") ? (campLevel + campWave - 1) : wave;
        const every = tutorialOn ? 900 : Math.max(280, 760 - diffWave*30);
        while (spawnAcc >= every && waveLeft > 0){
          spawnAcc -= every;
          spawnEnemy();
        }
      } else if (enemies.length === 0 && running){
        // wave clear reward (progressively more money)
        if (gameMode === "campaign"){
          const bonus = 20 + campLevel*8 + campWave*5;
          money += bonus;
        } else if (!tutorialOn){
          money += 10 + wave*3;
        }
        // next wave
        if (gameMode === "campaign"){
          if (campWave < campWaveCount){
            if (settings.autostart){
              campWave++;
              beginWave();
            } else {
              running = false;
              pendingNextWave = true;
              overlayMode = "restart";
              // stop any lingering screen shake between waves
              shake = 0;
              flash = 0;
              showMiniToast(`Welle ${campWave}/${campWaveCount} bewältigt`);
              // user can now build and press Start when ready
              return;
            }
          } else {
            // all waves done -> handled by campaign completion check below
          }
        } else {
          if (tutorialOn){
            // Tutorial: spawn more mini-waves until the step requirement is met.
            // Otherwise you can end up with "no enemies left" but still <5 kills.
            if (tutorialStep === 2 && kills < 5){
              beginWave(); // keep wave number stable
            }
          } else {
            if (settings.autostart){
              wave++;
              beginWave();
            } else {
              running = false;
              pendingNextWave = true;
              overlayMode = "restart";
              shake = 0;
              flash = 0;
              showMiniToast(`Welle ${wave} bewältigt`);
              return;
            }
          }
        }
      }

      // enemies move
      for (const e of enemies){
        if (e.dead) continue;
        if (e.regen && e.hp > 0 && e.hp < e.hpMax){
          e.hp = Math.min(e.hpMax, e.hp + e.regen * sec);
        }
        // debuffs (slow + dot)
        if (e.slowT && e.slowT > 0){
          e.slowT = Math.max(0, e.slowT - sec);
        } else {
          e.slowMul = 1;
        }
        if (e.dotT && e.dotT > 0){
          e.dotT = Math.max(0, e.dotT - sec);
          if (e.dotDps) dmgEnemy(e, e.dotDps * sec, e.x, e.y);
        } else {
          e.dotDps = 0;
        }
        const spMul = (e.slowMul || 1);
        e.t += e.sp * spMul * sec;
        const p = pathPos(e.t);
        e.x = p.x; e.y = p.y;
        e.vx = (p.dx || 0) * e.sp * spMul;
        e.vy = (p.dy || 0) * e.sp * spMul;
        if (p.end || e.t > PATH_LEN + 40){
          e.dead = true;
          baseHP--;
          shake = Math.max(shake, tutorialOn ? 2.2 : 10);
          flash = Math.min(1, flash + 0.22);
          if (baseHP <= 0){
            running=false;
            if (gameMode === "campaign"){
              showOverlay("Game Over", `Level ${campLevel} · Welle ${campWave}/${campWaveCount}`);
            } else {
              showOverlay("Game Over", `Waves: ${wave} · Kills: ${kills}`);
            }
          }
        }
        e.hit = Math.max(0, e.hit - sec);
      }
      enemies = enemies.filter(e => !e.dead);

      // campaign level complete check (ONLY after the last wave of the level)
      if (gameMode === "campaign" && campWave >= campWaveCount && waveLeft <= 0 && enemies.length === 0 && running && !paused){
        running = false;
        overlayMode = "next";
        showOverlay(`Kapitel 1 · Level ${campLevel} geschafft`, "Weiter zum nächsten Level?");
        ovAgain.textContent = (campLevel >= 10) ? "Fertig" : "Nächstes";

        // Reward: progressive coins per level (first-time per level).
        // L1=50, L2=60, L3=70, ...
        try{
          const claimed = +(localStorage.getItem(CAMP_COIN_CLAIM_KEY) || "0") || 0;
          if (campLevel > claimed){
            localStorage.setItem(CAMP_COIN_CLAIM_KEY, String(campLevel));
            const reward = 50 + (campLevel - 1) * 10;
            addCoins(reward);
          }
        } catch {}
      }

      // tower shooting
      for (const t of towers) tryShoot(t, dt);

      function bulletImpactFX(x, y, ang){
        // ricochet chips: bounce a little, fade out
        const n = 4 + (Math.random()*4|0);
        for (let i=0;i<n;i++){
          const a = ang + Math.PI + rand(-0.9, 0.9);
          const sp = rand(120, 360);
          parts.push({
            x, y,
            vx: Math.cos(a)*sp,
            vy: Math.sin(a)*sp,
            life: rand(0.18, 0.42),
            s: rand(1.2, 2.2),
            col: "rgba(255,215,106,0.85)",
            sq: true,
            rot: rand(0, Math.PI*2),
            vr: rand(-10, 10),
          });
        }
        // a few dust puffs towards the ground
        for (let i=0;i<3;i++){
          const a = ang + Math.PI + rand(-1.2, 1.2);
          const sp = rand(40, 140);
          parts.push({x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, life: rand(0.10, 0.18), s: rand(2.2, 4.4), col:"rgba(255,255,255,0.14)"});
        }
      }

      // bullets
      for (const b of bullets){
        const prevX = b.x, prevY = b.y;
        if (b.g) b.vy += b.g * (dt/1000);
        // rocket trail
        if (b.kind === "rocket"){
          const a = Math.atan2(b.vy, b.vx);
          const back = a + Math.PI + rand(-0.55, 0.55);
          const sp2 = rand(40, 160);
          parts.push({x: b.x - Math.cos(a)*8, y: b.y - Math.sin(a)*8, vx: Math.cos(back)*sp2, vy: Math.sin(back)*sp2, life: rand(0.10, 0.20), s: rand(2.4, 4.8), col:"rgba(255,255,255,0.12)"});
          parts.push({x: b.x, y: b.y, vx: rand(-30,30), vy: rand(-30,30), life: rand(0.06, 0.12), s: rand(1.6, 3.0), col:"rgba(255,215,106,0.20)"});
        }

        // homing (rockets should keep tracking until hit, even if they "miss" once)
        if (b.homing){
          let te = null;
          if (b.targetId){
            te = enemies.find(e => e.id === b.targetId && !e.dead) || null;
          }
          // reacquire if target died or was never set (rocket keeps hunting)
          if (!te && b.kind === "rocket"){
            let best = null, bestD = 1e18;
            for (const e of enemies){
              if (e.dead) continue;
              const d = (e.x-b.x)*(e.x-b.x) + (e.y-b.y)*(e.y-b.y);
              if (d < bestD){ bestD = d; best = e; }
            }
            if (best){ te = best; b.targetId = best.id; }
          }
          if (te){
            const ang = Math.atan2(te.y - b.y, te.x - b.x);
            let sp = (b.kind === "rocket" ? (b.spd || 0) : 0) || hypot(b.vx, b.vy) || 1;
            if (!isFinite(sp) || sp < 1) sp = (b.kind === "rocket" ? (b.spd || 340) : 340);
            // rockets should NOT be too agile: heavy turn, still reliable tracking
            const turn = (b.kind === "rocket") ? clamp(b.homing, 0, 0.065) : clamp(b.homing, 0, 0.28);
            let nvx = lerp(b.vx, Math.cos(ang)*sp, turn);
            let nvy = lerp(b.vy, Math.sin(ang)*sp, turn);
            if (!isFinite(nvx) || !isFinite(nvy)){
              nvx = Math.cos(ang)*sp;
              nvy = Math.sin(ang)*sp;
            }
            // keep rockets from "stalling" due to numeric drift
            if (b.kind === "rocket"){
              const l = hypot(nvx, nvy) || 1;
              const want = b.spd || sp;
              nvx = (nvx / l) * want;
              nvy = (nvy / l) * want;
            }
            b.vx = nvx;
            b.vy = nvy;
          }
        }
        b.x += b.vx*sec;
        b.y += b.vy*sec;
        b.life -= sec;
        const bang = Math.atan2(b.vy, b.vx);
        // world bounds => impact fx + despawn
        if (b.x < 0 || b.y < 0 || b.x > WORLD_W || b.y > WORLD_H){
          bulletImpactFX(clamp(b.x, 0, WORLD_W), clamp(b.y, 0, WORLD_H), bang);
          b.life = -1;
          continue;
        }
        // hit check
        b.hit = b.hit || new Set();
        for (const e of enemies){
          const dx = b.x - e.x, dy = b.y - e.y;
          if (dx*dx + dy*dy <= (e.r+3)*(e.r+3)){
            if (b.hit.has(e.id)) continue;
            b.hit.add(e.id);
            if (b.aoe){
              explodeAt(b.x, b.y, b.aoe, b.dmg || 10, {
                slowMul: b.slowMul || 1,
                slowSec: b.slowSec || 0,
                dotDps: b.dotDps || 0,
                dotSec: b.dotSec || 0
              });
              if (b.split){
                for (let k=0;k<b.split;k++){
                  const a = Math.random()*Math.PI*2;
                  const rr = (b.aoe || 70) * 0.55;
                  explodeAt(b.x + Math.cos(a)*rr, b.y + Math.sin(a)*rr, (b.aoe||70)*0.55, (b.dmg||10)*0.45, {});
                }
              }
              b.life = -1;
              break;
            } else {
              dmgEnemy(e, b.dmg || 2, b.x, b.y);
              b.pierce = (b.pierce ?? 1) - 1;
              if (b.pierce <= 0){
                b.life = -1;
                break;
              }
              break;
            }
          }
        }
        // lifetime ended => small ground impact
        if (b.life <= 0){
          if (b.aoe){
            const ex = (typeof b.explodeX === "number") ? b.explodeX : b.x;
            const ey = (typeof b.explodeY === "number") ? b.explodeY : b.y;
            // Visual consistency: snap the shell to its intended impact point.
            b.x = ex; b.y = ey;
            explodeAt(ex, ey, b.aoe, b.dmg || 10, {
              slowMul: b.slowMul || 1,
              slowSec: b.slowSec || 0,
              dotDps: b.dotDps || 0,
              dotSec: b.dotSec || 0
            });
          } else {
            bulletImpactFX(b.x, b.y, bang);
          }
        }
      }
      bullets = bullets.filter(b => b.life > 0);

      // particles/decals
      for (const p of parts){
        p.x += p.vx*sec; p.y += p.vy*sec;
        p.vx *= Math.pow(0.84, dt/16);
        p.vy *= Math.pow(0.84, dt/16);
        if (p.sq){
          p.rot = (p.rot || 0) + (p.vr || 0) * sec;
          p.vr = (p.vr || 0) * Math.pow(0.86, dt/16);
        }
        p.life -= sec;
      }
      parts = parts.filter(p => p.life > 0).slice(-520);

      // screen fx decay
      flash *= Math.pow(0.86, dt/16);
      shake *= Math.pow(0.80, dt/16);

      syncUI();
      checkTutorialProgress();
    }

    function drawPath(){
      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      // glow underlay
      ctx.globalCompositeOperation = "screen";
      ctx.strokeStyle = "rgba(34,211,238,0.10)";
      ctx.lineWidth = 46;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i=1;i<path.length;i++) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
      // main path
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 34 * PATH_SCALE;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i=1;i<path.length;i++) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
      // center line
      ctx.strokeStyle = "rgba(255,215,106,0.12)";
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 16]);
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i=1;i<path.length;i++) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Start/End markers + direction arrows (readability)
      const s = path[0];
      const e = path[path.length-1];
      if (s && e){
        // start marker
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = "rgba(93,255,180,0.22)";
        ctx.strokeStyle = "rgba(93,255,180,0.55)";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(s.x, s.y, 22, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(93,255,180,0.85)";
        ctx.font = "1000 12px system-ui,Segoe UI,Roboto";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("START", s.x, s.y-32);

        // end marker
        ctx.fillStyle = "rgba(255,107,107,0.18)";
        ctx.strokeStyle = "rgba(255,107,107,0.55)";
        ctx.beginPath(); ctx.arc(e.x, e.y, 24, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,107,107,0.88)";
        ctx.fillText("ZIEL", e.x, e.y-34);
        ctx.restore();
      }

      // Static direction arrows on the path (NO animation -> no lag)
      if (!running && gameMode !== "menu" && pathCache.length > 2){
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        const spacing = 140 * PATH_SCALE;
        const cacheStep = 22 * PATH_SCALE;
        const maxIdx = pathCache.length - 1;
        const n = Math.max(6, Math.ceil(PATH_LEN / spacing) + 1);
        for (let k=0;k<n;k++){
          const d = (k + 0.35) * spacing;
          const idx = Math.max(0, Math.min(maxIdx, Math.round(d / cacheStep)));
          const p = pathCache[idx];
          if (!p) continue;
          const ang = p.ang || 0;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(ang);
          ctx.globalAlpha = 0.26;
          ctx.fillStyle = "rgba(255,215,106,0.30)";
          ctx.beginPath();
          ctx.moveTo(28, 0);
          ctx.lineTo(-14, -12);
          ctx.lineTo(-7, 0);
          ctx.lineTo(-14, 12);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 0.34;
          ctx.fillStyle = "rgba(255,255,255,0.16)";
          ctx.beginPath();
          ctx.moveTo(22, 0);
          ctx.lineTo(-10, -8);
          ctx.lineTo(-5, 0);
          ctx.lineTo(-10, 8);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
      ctx.restore();
    }

    function drawTowerVisual(tower, alpha=1){
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(tower.x, tower.y);
      // base
      ctx.globalCompositeOperation = "screen";
      const isMini = tower.baseType === "minigunner";
      ctx.fillStyle = isMini ? "rgba(255,215,106,0.18)" : "rgba(34,211,238,0.22)";
      ctx.strokeStyle = isMini ? "rgba(255,215,106,0.22)" : "rgba(255,255,255,0.16)";
      ctx.lineWidth = 2;
      if (isMini){
        // heavier base plate
        roundRect(-22,-18,44,36,12);
        ctx.fill(); ctx.stroke();
        ctx.globalAlpha = alpha * 0.75;
        ctx.strokeStyle = "rgba(34,211,238,0.22)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.stroke();
        ctx.globalAlpha = alpha;
      } else {
        roundRect(-18,-18,36,36,10);
        ctx.fill(); ctx.stroke();
      }

      // turret body
      ctx.rotate(tower.ang);
      const recoil = (tower.recoil||0);
      ctx.translate(-recoil*2.2, 0);
      ctx.fillStyle = isMini ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.16)";
      ctx.strokeStyle = isMini ? "rgba(255,215,106,0.42)" : "rgba(93,255,180,0.35)";
      ctx.lineWidth = 2;
      if (isMini){
        // wider body + ammo box
        roundRect(-10,-12, 30, 24, 9);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 2;
        roundRect(-18,-10, 10, 20, 6);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,215,106,0.20)";
        ctx.fillRect(-16, -6, 6, 2);
        ctx.fillRect(-16,  0, 6, 2);
      } else {
        roundRect(-8,-10, 26, 20, 8);
        ctx.fill(); ctx.stroke();
      }

      // inner neon slit
      ctx.globalAlpha = alpha * 0.7;
      ctx.strokeStyle = isMini ? "rgba(255,215,106,0.26)" : "rgba(34,211,238,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-3, 0); ctx.lineTo(12, 0);
      ctx.stroke();
      ctx.globalAlpha = alpha;

      // weapon barrels (changes with upgrades)
      ctx.lineCap = "round";
      if (tower.baseType === "grenadier"){
        const rocketBig = (tower.kind === "rocket") && ((tower.upA||0) >= 5);
        const tubeW = (tower.kind === "rocket") ? (rocketBig ? 12 : 8) : (tower.kind === "artillery") ? 7 : 6;
        const tubeL = (tower.kind === "rocket") ? (rocketBig ? 46 : 40) : (tower.kind === "artillery") ? 46 : 34;
        // launcher tube
        ctx.strokeStyle = (tower.kind === "artillery") ? "rgba(93,255,180,0.55)" : "rgba(255,215,106,0.55)";
        ctx.lineWidth = tubeW;
        ctx.beginPath();
        ctx.moveTo(10, 0); ctx.lineTo(tubeL, 0);
        ctx.stroke();
        // muzzle ring
        ctx.globalAlpha = alpha * 0.7;
        ctx.strokeStyle = (tower.kind === "rocket") ? "rgba(255,107,107,0.30)" : (tower.kind === "artillery") ? "rgba(93,255,180,0.26)" : "rgba(255,215,106,0.24)";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(tubeL+1.0, 0, (tower.kind === "rocket") ? (rocketBig ? 9.4 : 7.8) : 7.2, 0, Math.PI*2); ctx.stroke();
        if (tower.kind === "rocket"){
          ctx.globalAlpha = alpha * 0.5;
          ctx.fillStyle = "rgba(0,0,0,0.22)";
          ctx.beginPath();
          ctx.ellipse(tubeL+1.0, 0, rocketBig ? 9.2 : 7.6, rocketBig ? 6.0 : 5.0, 0, 0, Math.PI*2);
          ctx.fill();
          ctx.globalAlpha = alpha;
        } else {
          ctx.globalAlpha = alpha;
        }
      }
      else if (tower.kind === "sniper"){
        ctx.strokeStyle = "rgba(93,255,180,0.55)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(10, 0); ctx.lineTo(44, 0);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        ctx.strokeStyle = "rgba(34,211,238,0.35)";
        ctx.lineWidth = 2;
        roundRect(6, -14, 22, 8, 4);
        ctx.fill(); ctx.stroke();
      } else if (tower.kind === "mg"){
        ctx.strokeStyle = "rgba(255,215,106,0.55)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(12, -4.5); ctx.lineTo(32, -8.2);
        ctx.moveTo(12,  4.5); ctx.lineTo(32,  8.2);
        ctx.stroke();
        ctx.globalAlpha = alpha * 0.7;
        ctx.strokeStyle = "rgba(255,215,106,0.35)";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(33.2, 0, 7.5, 0, Math.PI*2); ctx.stroke();
        ctx.globalAlpha = alpha;
      } else if (tower.kind === "minigun"){
        // spinning barrel cluster
        const spin = (tower.heat || 0) * 18 + (tower.recoil || 0) * 12;
        ctx.save();
        ctx.translate(22, 0);
        ctx.rotate(spin);
        ctx.strokeStyle = "rgba(255,215,106,0.55)";
        ctx.lineWidth = 3.4;
        for (let k=0;k<6;k++){
          const a = (k/6)*Math.PI*2;
          const ox = Math.cos(a)*5.2;
          const oy = Math.sin(a)*5.2;
          ctx.beginPath();
          ctx.moveTo(-6 + ox, oy);
          ctx.lineTo(16 + ox, oy);
          ctx.stroke();
        }
        ctx.restore();
        // front ring
        ctx.globalAlpha = alpha * 0.75;
        ctx.strokeStyle = "rgba(34,211,238,0.30)";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(33.6, 0, 8.0, 0, Math.PI*2); ctx.stroke();
        ctx.globalAlpha = alpha;
      } else {
        const thick = (tower.kind === "pistol_caliber" || tower.kind === "pistol_caliber2") ? 4.6 : 3.6;
        const len = (tower.kind === "pistol_fast") ? 30 : 28;
        ctx.strokeStyle = "rgba(220,235,255,0.55)";
        ctx.lineWidth = thick;
        ctx.beginPath();
        ctx.moveTo(12, 0); ctx.lineTo(len, 0);
        ctx.stroke();
        ctx.globalAlpha = alpha * 0.65;
        ctx.strokeStyle = "rgba(255,215,106,0.22)";
        ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(len+1.0, 0, 5.8, 0, Math.PI*2); ctx.stroke();
        ctx.globalAlpha = alpha;
      }

      // muzzle glow
      const heat = (tower.heat||0);
      ctx.globalAlpha = alpha * (0.25 + heat*0.55);
      ctx.fillStyle = (tower.kind === "sniper") ? "rgba(93,255,180,0.25)"
        : (tower.kind === "mg") ? "rgba(255,215,106,0.35)"
        : (tower.baseType === "grenadier") ? "rgba(255,215,106,0.30)"
        : "rgba(220,235,255,0.22)";
      ctx.shadowColor = (tower.kind === "sniper") ? "rgba(93,255,180,0.45)"
        : (tower.kind === "mg") ? "rgba(255,215,106,0.55)"
        : (tower.baseType === "grenadier") ? "rgba(255,215,106,0.45)"
        : "rgba(220,235,255,0.35)";
      ctx.shadowBlur = 14 + heat*24;
      const glowX = (tower.kind === "sniper") ? 44 : (tower.kind === "mg" || tower.kind === "minigun") ? 33 : (tower.baseType === "grenadier") ? 36 : 29.5;
      ctx.beginPath(); ctx.arc(glowX,0, 8 + heat*4, 0, Math.PI*2); ctx.fill();

      ctx.restore();
    }

    function draw(){
      const sx = (shake>0)? (Math.random()*2-1)*shake : 0;
      const sy = (shake>0)? (Math.random()*2-1)*shake : 0;
      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,c.width,c.height);
      ctx.save(); ctx.translate(sx,sy);
      ctx.save(); ctx.translate(-camX, -camY);

      // campaign "grass" background
      if (gameMode === "campaign"){
        const x0 = camX, y0 = camY, x1 = camX + c.width, y1 = camY + c.height;
        const g = ctx.createLinearGradient(x0, y0, x0, y1);
        g.addColorStop(0, "rgba(18,42,18,0.95)");
        g.addColorStop(1, "rgba(10,26,12,0.98)");
        ctx.fillStyle = g;
        ctx.fillRect(x0, y0, c.width, c.height);
        // subtle grass speckles
        ctx.globalAlpha = 0.20;
        ctx.fillStyle = "rgba(93,255,180,0.10)";
        for (let i=0;i<220;i++){
          const px = x0 + Math.random()*c.width;
          const py = y0 + Math.random()*c.height;
          ctx.fillRect(px, py, 1.5, 1.5);
        }
        ctx.globalAlpha = 1;
      }

      // menu background (ambient dots + soft waves)
      if (gameMode === "menu"){
        const x0 = camX, y0 = camY;
        const g = ctx.createRadialGradient(x0 + c.width*0.35, y0 + c.height*0.25, 40, x0 + c.width*0.45, y0 + c.height*0.45, c.width*0.9);
        g.addColorStop(0, "rgba(34,211,238,0.10)");
        g.addColorStop(1, "rgba(0,0,0,0.90)");
        ctx.fillStyle = g;
        ctx.fillRect(x0, y0, c.width, c.height);
        ctx.globalCompositeOperation = "screen";
        // dots
        for (const d of menuDots){
          ctx.fillStyle = d.col;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
          ctx.fill();
        }
        // soft wave lines
        ctx.strokeStyle = "rgba(255,215,106,0.07)";
        ctx.lineWidth = 2;
        const t = performance.now()*0.0005;
        for (let k=0;k<4;k++){
          const yy = y0 + 120 + k*140;
          ctx.beginPath();
          for (let x=x0; x<=x0+c.width; x+=40){
            const off = Math.sin(t*2 + x*0.006 + k)*14;
            if (x === x0) ctx.moveTo(x, yy+off);
            else ctx.lineTo(x, yy+off);
          }
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";

        // Important: when we're in the main menu, we don't render the game world behind it.
        ctx.restore(); // undo translate(-camX,-camY)
        ctx.restore(); // undo translate(shake)
        return;
      }

      // bg grid
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      // draw only the visible part (performance)
      const gx0 = Math.floor(camX/40)*40;
      const gx1 = Math.min(WORLD_W, camX + c.width + 40);
      const gy0 = Math.floor(camY/40)*40;
      const gy1 = Math.min(WORLD_H, camY + c.height + 40);
      for (let x=gx0;x<=gx1;x+=40){ ctx.beginPath(); ctx.moveTo(x,gy0); ctx.lineTo(x,gy1); ctx.stroke(); }
      for (let y=gy0;y<=gy1;y+=40){ ctx.beginPath(); ctx.moveTo(gx0,y); ctx.lineTo(gx1,y); ctx.stroke(); }
      ctx.restore();

      drawPath();

      // placement preview (range + taboo radius)
      const preview = drag && drag.cx != null ? {x: drag.cx, y: drag.cy} : null;
      if (preview){
        const placeCost = drag?.fromTower ? 0
          : (drag?.type === "Grenadier") ? GREN_COST
          : (drag?.type === "Minigunner") ? MINI_COST
          : MG_COST;
        const ok = canPlaceAt(preview.x, preview.y) && towers.length < TOWER_LIMIT && (drag.fromTower ? true : (money >= placeCost));
        const g = drag.fromTower && drag.old
          ? {...drag.old, x: preview.x, y: preview.y, recoil: 0, heat: 0}
          : {
            id:-1, x: preview.x, y: preview.y, ang: Math.PI, upA: 0, upB: 0, recoil: 0, heat: 0,
            baseType: (drag?.type === "Grenadier") ? "grenadier" : (drag?.type === "Minigunner") ? "minigunner" : "pistol",
            kind: (drag?.type === "Grenadier") ? "grenadier" : (drag?.type === "Minigunner") ? "minigun" : "pistol"
          };
        recomputeTowerStats(g);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.strokeStyle = ok ? "rgba(93,255,180,0.35)" : "rgba(255,107,107,0.35)";
        ctx.lineWidth = 2;
        ctx.setLineDash([10,10]);
        ctx.beginPath();
        ctx.arc(preview.x, preview.y, g.range || 220, 0, Math.PI*2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.arc(preview.x, preview.y, TOWER_TABOO_R, 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();

        // turret ghost preview (instead of dragging a box)
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = ok ? 0.55 : 0.55;
        // tint a bit based on ok/invalid
        if (!ok){
          ctx.shadowColor = "rgba(255,107,107,0.35)";
          ctx.shadowBlur = 18;
        } else {
          ctx.shadowColor = "rgba(93,255,180,0.25)";
          ctx.shadowBlur = 14;
        }
        drawTowerVisual(g, 0.62);
        ctx.restore();
      }

      // tutorial hints (arrows + suggested placement spots)
      if (tutorialOn && tutorialStep === 1){
        const pulse = 0.5 + 0.5*Math.sin(performance.now()*0.004);
        const spots = (tutorialSpots || []).filter(s => s && !s.done);

        // draw spots
        for (const s of spots){
          const ok = canPlaceAt(s.x, s.y);
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.strokeStyle = ok ? "rgba(93,255,180,0.30)" : "rgba(255,107,107,0.30)";
          ctx.lineWidth = 3;
          ctx.setLineDash([10,10]);
          ctx.beginPath(); ctx.arc(s.x, s.y, 22 + pulse*5, 0, Math.PI*2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 0.14 + pulse*0.10;
          ctx.fillStyle = ok ? "rgba(93,255,180,0.22)" : "rgba(255,107,107,0.18)";
          ctx.beginPath(); ctx.arc(s.x, s.y, 44 + pulse*10, 0, Math.PI*2); ctx.fill();

          // arrow pointing into the spot
          const ax = s.x - 60, ay = s.y - 60;
          const bx = s.x - 18, by = s.y - 18;
          const ang = Math.atan2(by-ay, bx-ax);
          ctx.strokeStyle = "rgba(255,215,106,0.28)";
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
          ctx.fillStyle = "rgba(255,215,106,0.35)";
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx - Math.cos(ang-0.6)*14, by - Math.sin(ang-0.6)*14);
          ctx.lineTo(bx - Math.cos(ang+0.6)*14, by - Math.sin(ang+0.6)*14);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // step-specific extra hint: step 1 highlights the spots stronger
        for (const s of spots){
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.strokeStyle = "rgba(34,211,238,0.20)";
          ctx.lineWidth = 2;
          ctx.setLineDash([6,10]);
          ctx.beginPath(); ctx.arc(s.x, s.y, 70 + pulse*12, 0, Math.PI*2); ctx.stroke();
          ctx.restore();
        }
      }

      // (enemy hit decals disabled for now)

      // enemies
      for (const e of enemies){
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.globalCompositeOperation = "screen";
        const hot = e.hit > 0 ? 1 : 0;
        const baseCol = (e.kind === "tanky") ? "rgba(34,211,238,0.85)" : (e.kind === "speedy") ? "rgba(255,215,106,0.90)" : "rgba(249,115,22,0.85)";
        const col = hot ? "rgba(255,215,106,0.95)" : baseCol;
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 22;
        ctx.beginPath(); ctx.arc(0,0,e.r,0,Math.PI*2); ctx.fill();
        // small visual hint
        if (e.kind === "tanky"){
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "rgba(255,255,255,0.18)";
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0,0,e.r+3,0,Math.PI*2); ctx.stroke();
        } else if (e.kind === "speedy"){
          ctx.shadowBlur = 0;
          ctx.strokeStyle = "rgba(255,255,255,0.14)";
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0,0,e.r+2,-0.8,0.8); ctx.stroke();
        }
        // hp ring
        const t = clamp(e.hp/e.hpMax, 0, 1);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,255,255,0.20)";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0,0,e.r+10,0,Math.PI*2); ctx.stroke();
        ctx.strokeStyle = "rgba(93,255,180,0.75)";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0,0,e.r+10,-Math.PI/2, -Math.PI/2 + Math.PI*2*t); ctx.stroke();

        // HP number above the enemy
        ctx.globalCompositeOperation = "source-over";
        ctx.font = "1000 12px system-ui,Segoe UI,Roboto";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const hpTxt = `${Math.max(0, e.hp|0)}`;
        const ty = -(e.r + 22);
        // outline for readability
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(0,0,0,0.55)";
        ctx.strokeText(hpTxt, 0, ty);
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.fillText(hpTxt, 0, ty);
        ctx.restore();
      }

      // enemy hover tooltip (name)
      if (hoverEnemyId){
        const he = enemies.find(x => x.id === hoverEnemyId && !x.dead);
        if (he){
          const label = he.name || he.kind || "Enemy";
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.font = "900 14px system-ui,Segoe UI,Roboto";
          const pad = 8;
          const w = ctx.measureText(label).width + pad*2;
          const h = 24;
          const x = he.x - w/2;
          const y = he.y - (he.r + 36);
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.strokeStyle = "rgba(255,255,255,0.18)";
          ctx.lineWidth = 2;
          roundRect(x, y, w, h, 10);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.fillText(label, x + pad, y + 16);
          ctx.restore();
        }
      }

      // bullets (slow projectile + short trail)
      for (const b of bullets){
        const a = Math.atan2(b.vy, b.vx);
        const tx = Math.cos(a), ty = Math.sin(a);
        const sz = b.size || 1;
        const L = ((b.kind === "sniper") ? 18 : (b.kind === "minigun") ? 14 : (b.kind === "mg") ? 10 : (b.kind === "rocket") ? 16 : 12) * sz;
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.strokeStyle =
          (b.kind === "sniper") ? "rgba(93,255,180,0.55)" :
          (b.kind === "minigun") ? "rgba(34,211,238,0.55)" :
          (b.kind === "mg") ? "rgba(255,215,106,0.55)" :
          (b.kind === "rocket") ? "rgba(255,120,80,0.55)" :
          "rgba(220,235,255,0.45)";
        ctx.lineWidth = ((b.kind === "sniper") ? 2.4 : (b.kind === "rocket") ? 2.6 : (b.kind === "minigun") ? 2.0 : 2) * sz;
        ctx.shadowColor =
          (b.kind === "rocket") ? "rgba(255,120,80,0.35)" :
          (b.kind === "minigun") ? "rgba(34,211,238,0.28)" :
          "rgba(255,215,106,0.25)";
        ctx.shadowBlur = (b.kind === "rocket") ? 18 : (b.kind === "minigun") ? 14 : 12;
        ctx.beginPath();
        ctx.moveTo(b.x - tx*L, b.y - ty*L);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        // rocket looks like a real rocket (nose + fins + flame)
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(a);
        if (b.kind === "rocket"){
          const bw = 26 * sz;
          const bh = 7.2 * sz;
          // flame
          ctx.save();
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = "rgba(255,120,80,0.30)";
          ctx.beginPath();
          ctx.moveTo(-bw*0.72, 0);
          ctx.quadraticCurveTo(-bw*1.05, -bh*0.55, -bw*1.25, 0);
          ctx.quadraticCurveTo(-bw*1.05,  bh*0.55, -bw*0.72, 0);
          ctx.fill();
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = "rgba(255,215,106,0.22)";
          ctx.beginPath();
          ctx.moveTo(-bw*0.62, 0);
          ctx.quadraticCurveTo(-bw*0.92, -bh*0.42, -bw*1.10, 0);
          ctx.quadraticCurveTo(-bw*0.92,  bh*0.42, -bw*0.62, 0);
          ctx.fill();
          ctx.restore();

          // body
          ctx.fillStyle = "rgba(255,235,220,0.16)";
          ctx.strokeStyle = "rgba(255,160,120,0.70)";
          ctx.lineWidth = 2.2 * sz;
          roundRect(-bw*0.55, -bh/2, bw*0.92, bh, 3.5*sz);
          ctx.fill(); ctx.stroke();

          // nose cone
          ctx.fillStyle = "rgba(255,160,120,0.75)";
          ctx.beginPath();
          ctx.moveTo(bw*0.40, 0);
          ctx.lineTo(bw*0.18, -bh*0.52);
          ctx.lineTo(bw*0.18,  bh*0.52);
          ctx.closePath();
          ctx.fill();

          // fins
          ctx.fillStyle = "rgba(34,211,238,0.18)";
          ctx.beginPath();
          ctx.moveTo(-bw*0.10, -bh*0.50);
          ctx.lineTo(-bw*0.26, -bh*1.05);
          ctx.lineTo(-bw*0.02, -bh*0.72);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(-bw*0.10,  bh*0.50);
          ctx.lineTo(-bw*0.26,  bh*1.05);
          ctx.lineTo(-bw*0.02,  bh*0.72);
          ctx.closePath();
          ctx.fill();
        } else {
        ctx.fillStyle =
          (b.kind === "sniper") ? "rgba(93,255,180,0.95)" :
          (b.kind === "minigun") ? "rgba(34,211,238,0.92)" :
          (b.kind === "mg") ? "rgba(255,215,106,0.95)" :
          (b.kind === "rocket") ? "rgba(255,160,120,0.96)" :
          "rgba(240,248,255,0.92)";
        ctx.shadowBlur = (b.kind === "rocket") ? 22 : (b.kind === "minigun") ? 18 : 16;
        const bw = ((b.kind === "sniper") ? 16 : (b.kind === "minigun") ? 12 : (b.kind === "mg") ? 10 : (b.kind === "rocket") ? 22 : 12) * sz;
        const bh = ((b.kind === "sniper") ? 3.0 : (b.kind === "minigun") ? 2.4 : (b.kind === "mg") ? 3.2 : (b.kind === "rocket") ? 5.0 : 2.8) * sz;
        roundRect(-bw*0.55, -bh/2, bw, bh, 2);
        ctx.fill();
        }
        ctx.restore();
        ctx.restore();
      }

      // towers
      for (const tower of towers){
        // keep derived stats in sync (in case upgrades changed)
        recomputeTowerStats(tower);
        // hover level badge (e.g. "2-3")
        if (tower.id === hoverTowerId){
          const a = tower.upA || 0, b = tower.upB || 0;
          const label = `${a}-${b}`;
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.font = "900 14px system-ui,Segoe UI,Roboto";
          const pad = 7;
          const w = ctx.measureText(label).width + pad*2;
          const h = 22;
          const x = tower.x - w/2;
          const y = tower.y - 42;
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.strokeStyle = "rgba(255,255,255,0.18)";
          ctx.lineWidth = 2;
          roundRect(x, y, w, h, 10);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = "rgba(255,215,106,0.92)";
          ctx.fillText(label, x + pad, y + 16);
          ctx.restore();
        }
        // selected range sphere
        if (tower.id === selectedTowerId){
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.strokeStyle = "rgba(34,211,238,0.28)";
          ctx.lineWidth = 2;
          ctx.setLineDash([10,10]);
          ctx.beginPath();
          ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI*2);
          ctx.stroke();
          ctx.setLineDash([]);
          // blocked angles by other towers (no line-of-sight)
          const blockR = 18;
          for (const ot of towers){
            if (ot.id === tower.id) continue;
            const dx = ot.x - tower.x, dy = ot.y - tower.y;
            const d = hypot(dx,dy);
            if (d < 1 || d > tower.range) continue;
            const half = Math.asin(Math.min(0.95, blockR / d));
            const a0 = Math.atan2(dy, dx);
            ctx.strokeStyle = "rgba(255,107,107,0.35)";
            ctx.lineWidth = 6;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(tower.x, tower.y, tower.range, a0-half, a0+half);
            ctx.stroke();
          }
          ctx.restore();
        }
        drawTowerVisual(tower, 1);
      }

      // particles (chips can be squares)
      for (const p of parts){
        ctx.globalAlpha = clamp(p.life/0.20, 0, 1);
        ctx.fillStyle = p.col;
        if (p.sq){
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot || 0);
          const ss = p.s;
          ctx.fillRect(-ss, -ss, ss*2, ss*2);
          ctx.restore();
        } else {
          ctx.beginPath(); ctx.arc(p.x,p.y,p.s,0,Math.PI*2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      ctx.restore(); // world (camera)

      // flash
      if (flash > 0.001){
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = Math.min(0.55, flash);
        ctx.fillStyle = "rgba(255,215,106,1)";
        ctx.fillRect(0,0,c.width,c.height);
        ctx.restore();
      }

      ctx.restore();
    }

    function roundRect(x,y,w,h,r){
      const rr = Math.min(r, w/2, h/2);
      ctx.beginPath();
      ctx.moveTo(x+rr, y);
      ctx.arcTo(x+w, y, x+w, y+h, rr);
      ctx.arcTo(x+w, y+h, x, y+h, rr);
      ctx.arcTo(x, y+h, x, y, rr);
      ctx.arcTo(x, y, x+w, y, rr);
      ctx.closePath();
    }

    function loop(ts){
      if (!running) return;
      if (paused){ raf = requestAnimationFrame(loop); return; }
      const rawDt = Math.min(40, ts - last);
      last = ts;
      try{
        step(rawDt * timeScale);
        draw();
      } catch (err){
        paused = true;
        const msg = (err && err.message) ? err.message : String(err);
        showOverlay("Fehler", msg);
        ovAgain.textContent = "Weiter";
        console.error(err);
      }
      raf = requestAnimationFrame(loop);
    }

    // placement helpers (drag & drop)
    function toWorldXY(e){
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) * (c.width / r.width);
      const y = (e.clientY - r.top) * (c.height / r.height);
      return {x:x+camX, y:y+camY};
    }

    function ghostAt(clientX, clientY){
      ghost.style.transform = `translate(${clientX - 55}px, ${clientY - 38}px)`;
    }
    function ghostShow(on){
      ghost.style.transform = on ? ghost.style.transform : "translate(-9999px,-9999px)";
    }
    function beginDrag(e, type="Pistol", slot=0){
      if (type === "Pistol" && money < MG_COST) { tone(160,0.08,"sawtooth",0.05); vibr(10); return; }
      if (type === "Grenadier" && money < GREN_COST) { tone(160,0.08,"sawtooth",0.05); vibr(10); return; }
      if (type === "Minigunner" && money < MINI_COST) { tone(160,0.08,"sawtooth",0.05); vibr(10); return; }
      if (tutorialOn && type === "Grenadier") { tone(160,0.08,"sawtooth",0.05); vibr(10); return; } // tutorial only uses pistol
      if (tutorialOn && type === "Minigunner") { tone(160,0.08,"sawtooth",0.05); vibr(10); return; } // tutorial only uses pistol
      if (!drag?.fromTower && towers.length >= TOWER_LIMIT) { tone(160,0.08,"sawtooth",0.05); vibr(10); return; }
      drag = {type, slot};
      ghost.textContent = (type === "Pistol") ? "Pistole" : (type === "Grenadier") ? "Grenadier" : (type === "Minigunner") ? "Minigunner" : type;
      ghostAt(e.clientX, e.clientY);
      ghostShow(true);
      buildMode = true;
      // Autostart should not start combat on placement; Start is explicit.
      syncUI();
      draw();
    }
    function endDrag(e){
      if (!drag) return;
      const p = toWorldXY(e);
      let placed = false;
      if (canPlaceAt(p.x, p.y) && towers.length < TOWER_LIMIT){
        if (drag.fromTower && drag.old){
          const t = {...drag.old, id: drag.old.id || nextTowerId++, x: p.x, y: p.y, cdMs: 0};
          recomputeTowerStats(t);
          towers.push(t);
          placed = true;
        } else if (drag.type === "Pistol"){
          if (money >= MG_COST){
            money -= MG_COST;
            const t = {id: nextTowerId++, baseType:"pistol", x: p.x, y: p.y, ang: Math.PI, cdMs: 0, range: 220, turnSp: 1.3, mode: "first", upA: 0, upB: 0};
            recomputeTowerStats(t);
            towers.push(t);
            placed = true;
          }
        } else if (drag.type === "Grenadier"){
          if (money >= GREN_COST){
            money -= GREN_COST;
            const t = {id: nextTowerId++, baseType:"grenadier", x: p.x, y: p.y, ang: Math.PI, cdMs: 0, range: 280, turnSp: 2.2, mode: "first", upA: 0, upB: 0};
            recomputeTowerStats(t);
            towers.push(t);
            placed = true;
          }
        } else if (drag.type === "Minigunner"){
          if (money >= MINI_COST){
            money -= MINI_COST;
            const t = {id: nextTowerId++, baseType:"minigunner", x: p.x, y: p.y, ang: Math.PI, cdMs: 0, range: 260, turnSp: 2.0, mode: "first", upA: 0, upB: 0};
            recomputeTowerStats(t);
            towers.push(t);
            placed = true;
          }
        }
        if (placed){
          if (drag.fromTower && drag.moveCost){
            money -= drag.moveCost;
          }
          tone(740,0.06,"triangle",0.05);
          vibr(12);
          // tutorial: placing on suggested spot makes it disappear + FX
          if (!drag.fromTower){
            claimTutorialSpotIfAny(p.x, p.y);
          }
          // Tutorial progress should not depend on the game loop running.
          checkTutorialProgress();
        }
      }
      // if move cancelled (invalid spot), restore tower without charging
      if (!placed && drag.fromTower && drag.old){
        const t = {...drag.old, id: drag.old.id || nextTowerId++, x: drag.oldX ?? drag.old.x, y: drag.oldY ?? drag.old.y, cdMs: 0};
        recomputeTowerStats(t);
        towers.push(t);
      }
      drag = null;
      ghostShow(false);
      if (placed) buildMode = false;
      syncUI();
      draw();
    }

    loadoutEl.addEventListener("pointerdown", (e)=>{
      const slot = e.target.closest(".slot");
      if (!slot) return;
      const id = +slot.dataset.slot;
      if (slot.classList.contains("empty")) return;
      slot.setPointerCapture(e.pointerId);
      const tid = loadout[id];
      if (!tid) return;
      // Don't start placing on simple tap/click. Only start drag after moving a bit.
      const type = (tid === "grenadier") ? "Grenadier" : (tid === "minigunner") ? "Minigunner" : "Pistol";
      pendingLoadout = {id: e.pointerId, sx: e.clientX, sy: e.clientY, slot: id, tid, type, started:false};
    });

    function towerHitTest(p){
      // return tower id if hit
      for (let i=towers.length-1;i>=0;i--){
        const t = towers[i];
        if (hypot(p.x - t.x, p.y - t.y) <= 26) return t.id;
      }
      return 0;
    }

    function openTowerMenu(){
      const t = towers.find(x => x.id === selectedTowerId);
      if (!t) return;
      selTarget.value = t.mode || "first";
      towerMenu.classList.add("show");
      towerMenu.setAttribute("aria-hidden","false");
      renderTowerPanel();
    }
    function closeTowerMenu(){
      selectedTowerId = 0;
      towerMenu.classList.remove("show");
      towerMenu.setAttribute("aria-hidden","true");
      draw();
    }

    btnCloseMenu.addEventListener("click", closeTowerMenu);
    // click-outside disabled (side panel)
    btnSell.addEventListener("click", ()=>{
      const idx = towers.findIndex(t => t.id === selectedTowerId);
      if (idx >= 0){
        const t = towers[idx];
        const refund = Math.floor(towerTotalValue(t) * 0.5);
        money += refund;
        towers.splice(idx, 1);
      }
      closeTowerMenu();
      tone(220,0.08,"sawtooth",0.05);
      vibr(10);
      syncUI(); draw();
    });
    btnMove.addEventListener("click", ()=>{
      // start dragging existing tower to a new position
      const idx = towers.findIndex(t => t.id === selectedTowerId);
      if (idx < 0) return;
      const old = towers[idx];
      const mv = Math.ceil(towerTotalValue(old) * 0.10);
      if (money < mv) { tone(160,0.08,"sawtooth",0.05); vibr(10); return; }
      towers.splice(idx, 1);
      closeTowerMenu();
      drag = {type:"Pistol", slot:0, moving:true, fromTower:true, old:{...old}, moveCost: mv, oldX: old.x, oldY: old.y};
      buildMode = true;
      ghost.textContent = "Pistole";
      ghostShow(true);
      syncUI(); draw();
    });
    selTarget.addEventListener("change", ()=>{
      const t = towers.find(x => x.id === selectedTowerId);
      if (!t) return;
      t.mode = selTarget.value;
    });

    btnUpA.addEventListener("click", ()=>{
      const t = towers.find(x => x.id === selectedTowerId);
      if (!t) return;
      if (!canUpgradePath(t, "A")) return;
      const next = (t.upA||0) + 1;
      const cost = upCostFor(t, "A", next);
      if (money < cost) return;
      money -= cost;
      t.upA = next;
      recomputeTowerStats(t);
      tone(720,0.06,"triangle",0.05);
      vibr(12);
      checkTutorialProgress();
      syncUI(); renderTowerPanel(); draw();
    });
    btnUpB.addEventListener("click", ()=>{
      const t = towers.find(x => x.id === selectedTowerId);
      if (!t) return;
      if (!canUpgradePath(t, "B")) return;
      const next = (t.upB||0) + 1;
      const cost = upCostFor(t, "B", next);
      if (money < cost) return;
      money -= cost;
      t.upB = next;
      recomputeTowerStats(t);
      tone(720,0.06,"triangle",0.05);
      vibr(12);
      checkTutorialProgress();
      syncUI(); renderTowerPanel(); draw();
    });

    // click tower on canvas to open menu
    c.addEventListener("pointerdown", (e)=>{
      if (drag) return;
      const p = toWorldXY(e);
      const hitId = towerHitTest(p);
      if (hitId){
        selectedTowerId = hitId;
        openTowerMenu();
        return;
      }
      // click empty space => close panel / deselect
      if (towerMenu.classList.contains("show")){
        closeTowerMenu();
        return;
      }
      // pan the larger map by dragging empty space (mobile-friendly)
      const r = c.getBoundingClientRect();
      pan = {id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: camX, cy: camY, rw: r.width, rh: r.height};
      try{ c.setPointerCapture(e.pointerId); } catch {}
    });
    addEventListener("pointermove", (e)=>{
      if (pendingLoadout && pendingLoadout.id === e.pointerId && !drag){
        const dx = e.clientX - pendingLoadout.sx;
        const dy = e.clientY - pendingLoadout.sy;
        if (!pendingLoadout.started && (dx*dx + dy*dy) >= (10*10)){
          pendingLoadout.started = true;
          beginDrag(e, pendingLoadout.type, pendingLoadout.slot);
          pendingLoadout = null;
          return;
        }
      }
      if (pan && pan.id === e.pointerId && !drag){
        const dx = (e.clientX - pan.sx) * (c.width / pan.rw);
        const dy = (e.clientY - pan.sy) * (c.height / pan.rh);
        camX = clamp(pan.cx - dx, 0, Math.max(0, WORLD_W - c.width));
        camY = clamp(pan.cy - dy, 0, Math.max(0, WORLD_H - c.height));
        draw();
        return;
      }
      // hover badge (desktop): show upgrade levels like "2-3"
      const r = c.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!drag && inside){
        const x = (e.clientX - r.left) * (c.width / r.width);
        const y = (e.clientY - r.top) * (c.height / r.height);
        hoverWX = x + camX; hoverWY = y + camY;
        hoverTowerId = towerHitTest({x: hoverWX, y: hoverWY});
        hoverEnemyId = enemyHitTest({x: hoverWX, y: hoverWY});
        draw();
        return;
      }
      if (!drag) return;
      ghostAt(e.clientX, e.clientY);
      if (inside){
        const x = (e.clientX - r.left) * (c.width / r.width);
        const y = (e.clientY - r.top) * (c.height / r.height);
        drag.cx = x + camX; drag.cy = y + camY;
      } else {
        drag.cx = null; drag.cy = null;
      }
      draw();
    });
    addEventListener("pointerup", (e)=>{
      if (pendingLoadout && pendingLoadout.id === e.pointerId){
        pendingLoadout = null;
      }
      if (pan && pan.id === e.pointerId){
        pan = null;
        try{ c.releasePointerCapture(e.pointerId); } catch {}
      }
      if (!drag) return;
      endDrag(e);
    });
    addEventListener("pointercancel", ()=>{
      pan = null;
      if (!drag) return;
      drag = null;
      ghostShow(false);
      syncUI();
      draw();
    });

    // btnBuild hidden (pads removed)
    btnBuild.addEventListener("click", ()=>{});
    btnStart.addEventListener("click", ()=>{
      if (pendingNextWave){
        pendingNextWave = false;
        if (gameMode === "campaign"){
          campWave++;
          beginWave();
        } else {
          wave++;
          beginWave();
        }
      }
      start();
    });
    btnReset.addEventListener("click", ()=>{
      // "Aufgeben" with confirmation
      if (!running) { showMenu(); return; }
      paused = true;
      overlayMode = "giveup_confirm";
      showOverlay("Aufgeben?", "Willst du wirklich aufgeben?");
      ovAgain.textContent = "Ja, aufgeben";
      ovClose.textContent = "Abbrechen";
    });
    btnCenter.addEventListener("click", ()=>{
      camX = 0; camY = 0;
      draw();
    });
    btnSpeed.addEventListener("click", ()=>{
      // cycle: 0.5x -> 1.0x -> 2.0x
      if (timeScale === 1.0) timeScale = 2.0;
      else if (timeScale === 2.0) timeScale = 0.5;
      else timeScale = 1.0;
      syncUI();
    });
    ovAgain.addEventListener("click", ()=>{
      if (overlayMode === "giveup_confirm"){
        // confirm give up -> back to menu
        paused = false;
        running = false;
        overlayMode = "restart";
        hideOverlay();
        showMenu();
        return;
      }
      if (overlayMode === "nextwave"){
        hideOverlay();
        overlayMode = "restart";
        if (pendingNextWave){
          pendingNextWave = false;
          if (gameMode === "campaign"){
            campWave++;
            beginWave();
          } else {
            wave++;
            beginWave();
          }
        }
        start();
        return;
      }
      if (overlayMode === "resume" || paused){ resumeGame(); return; }
      if (overlayMode === "next"){
        hideOverlay();
        if (campLevel >= 10){
          // chapter finished -> back to menu
          campUnlocked = 10;
          localStorage.setItem(CAMP_KEY, String(campUnlocked));
          showMenu();
          return;
        }
        campUnlocked = Math.max(campUnlocked, campLevel + 1);
        localStorage.setItem(CAMP_KEY, String(campUnlocked));
        startCampaign(campLevel + 1);
        return;
      }
      hideOverlay(); reset(); start();
    });
    ovClose.addEventListener("click", ()=>{
      if (overlayMode === "giveup_confirm"){
        // cancel give up
        ovClose.textContent = "Schließen";
        resumeGame();
        return;
      }
      if (overlayMode === "nextwave"){
        hideOverlay();
        overlayMode = "restart";
        pendingNextWave = false;
        showMenu();
        return;
      }
      if (paused) resumeGame();
      else hideOverlay();
    });
    ov.addEventListener("click", (e)=>{
      if (e.target !== ov) return;
      if (paused) resumeGame();
      else hideOverlay();
    });

    ovSettings.addEventListener("click", ()=>{
      openSettings();
    });

    addEventListener("keydown", (e)=>{
      if (e.code === "Escape"){
        if (towerMenu.classList.contains("show")) closeTowerMenu();
        else pauseGame("ESC");
      }
    });

    document.addEventListener("visibilitychange", ()=>{
      if (document.hidden) pauseGame("Tab gewechselt");
      else if (paused){
        // coming back: keep it paused, but ensure the overlay is visible
        showOverlay("Pause", "Tab gewechselt");
        ovAgain.textContent = "Weiter";
      }
    });

    // Persist progress even when the page is closed.
    addEventListener("beforeunload", ()=>{
      try{ saveCoins(); saveOwned(); saveSettings(); saveLoadout(); } catch {}
    });

    addEventListener("error", (e)=>{
      try{
        paused = true;
        showOverlay("Fehler", (e && e.message) ? e.message : "Unbekannter Fehler");
        ovAgain.textContent = "Weiter";
      } catch {}
    });

    btnMenuTutorial.addEventListener("click", ()=>{
      menuPane.innerHTML = `<div class="subpill">Tutorial: Basic Einführung mit nur der Pistole.</div>
      <div style="margin-top:10px" class="cta"><button class="primary" id="btnStartTut">Tutorial starten</button></div>`;
      setTimeout(()=>{
        const b = document.getElementById("btnStartTut");
        if (b) b.onclick = startTutorial;
      }, 0);
    });
    btnMenuCampaign.addEventListener("click", ()=>{
      campUnlocked = +(localStorage.getItem(CAMP_KEY) || String(campUnlocked || 1));
      campUnlocked = clamp(campUnlocked, 1, 10);
      const nodes = [
        {x:12,y:74},{x:22,y:56},{x:32,y:70},{x:44,y:52},{x:56,y:66},
        {x:68,y:48},{x:78,y:62},{x:86,y:40},{x:90,y:58},{x:92,y:26},
      ];
      let html = `<div class="subpill"><b>Kampagne</b> · Staffel 1: Grasland (10 Levels)</div>
      <div style="margin-top:10px;color:rgba(180,200,230,.92);font-weight:900;line-height:1.35">
        Ziele: Schaffe alle Wellen eines Levels. Pro Level‑Abschluss: <b>+50🪙</b> (einmalig).
      </div>
      <div class="campMap" aria-label="Kampagnenkarte (Staffel 1)">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="pathG" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stop-color="rgba(93,255,180,.22)"/>
              <stop offset="1" stop-color="rgba(34,211,238,.10)"/>
            </linearGradient>
          </defs>
          <path d="M12 74 L22 56 L32 70 L44 52 L56 66 L68 48 L78 62 L86 40 L90 58 L92 26"
            fill="none" stroke="url(#pathG)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 74 L22 56 L32 70 L44 52 L56 66 L68 48 L78 62 L86 40 L90 58 L92 26"
            fill="none" stroke="rgba(255,215,106,.10)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
      for (let i=1;i<=10;i++){
        const locked = i > campUnlocked;
        const p = nodes[i-1];
        const waves = (CH1_LEVELS[i-1] && CH1_LEVELS[i-1].waves) ? CH1_LEVELS[i-1].waves.length : 1;
        html += `<button class="campNode ${locked?'':'primary'}" style="left:${p.x}%;top:${p.y}%"
          ${locked?'disabled':''} data-lv="${i}">L${i}<small>${waves} Wellen</small></button>`;
      }
      html += `</div>
      <div style="margin-top:10px;color:rgba(200,220,255,.72);font-weight:800">Unlocked: ${campUnlocked}/10</div>`;
      menuPane.innerHTML = html;
      setTimeout(()=>{
        menuPane.querySelectorAll("button[data-lv]").forEach(btn=>{
          btn.addEventListener("click", ()=>{
            const lv = +btn.getAttribute("data-lv");
            startCampaign(lv);
          });
        });
      }, 0);
    });
    btnMenuShop.addEventListener("click", ()=>{
      openShop();
    });
    btnMenuSettings.addEventListener("click", ()=>{
      openSettings();
    });
    btnMenuClose.addEventListener("click", ()=>{
      closeMenuAndReturn();
    });
    btnTutorialExit.addEventListener("click", ()=>{
      tutorialOn = false;
      tutorialBox.classList.remove("show");
      showMenu();
    });

    // open menu with M
    addEventListener("keydown", (e)=>{
      if (e.code === "KeyM"){
        showMenu();
      }
    });

    btnSettingsClose.addEventListener("click", ()=> closeWin(settingsWin));
    settingsWin.addEventListener("click", (e)=>{ if (e.target === settingsWin) closeWin(settingsWin); });
    btnShopClose.addEventListener("click", ()=> closeWin(shopWin));
    shopWin.addEventListener("click", (e)=>{ if (e.target === shopWin) closeWin(shopWin); });
    chkAutostart.addEventListener("change", ()=>{
      settings.autostart = chkAutostart.checked;
      saveSettings();
    });
    if (rngSfx){
      rngSfx.addEventListener("input", ()=>{
        settings.sfxVol = clamp((+rngSfx.value || 0) / 100, 0, 1);
        saveSettings();
      });
    }

    // ensure the menu has a living background on first load
    showMenu();
    reset();
