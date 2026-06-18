(() => {
  "use strict";
  const items = Array.isArray(window.THOMASFUN_ITEMS) ? window.THOMASFUN_ITEMS : [];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const q = document.getElementById("q");
  const btnClear = document.getElementById("btnClear");
  const chips = [...document.querySelectorAll("[data-filter]")];
  const countLine = document.getElementById("countLine");
  const cats = document.getElementById("cats");

  let filter = "all";
  const FILTER_LS_KEY = "hub_filter_v1";

  /* ============================================================
     Abteilungen (Kategorien)
     ============================================================ */
  const CATS = [
    { key:"special",  title:"Specials & Saisonales", icon:"✨" },
    { key:"arcade",   title:"Arcade & Action",       icon:"🕹️" },
    { key:"puzzle",   title:"Puzzle & Köpfchen",      icon:"🧩" },
    { key:"online",   title:"Online & Multiplayer",   icon:"🌐" },
    { key:"strategy", title:"Strategie",              icon:"🗺️" },
    { key:"data",     title:"Daten & Simulationen",   icon:"📊" },
    { key:"tools",    title:"Tests & Tools",          icon:"🧪" },
  ];
  function categoryOf(it) {
    if (it.cat) return it.cat;
    const t = normalizeTags(it.tags);
    if (t.includes("online")) return "online";
    if (t.includes("seasonal")) return "special";
    if (t.includes("strategy") || t.includes("towerdefense") || t.includes("naval")) return "strategy";
    if (t.includes("sim") || t.includes("data")) return "data";
    if (t.includes("puzzle")) return "puzzle";
    if (t.includes("test") || t.includes("tool")) return "tools";
    return "arcade";
  }

  /* Kuratierte Akzent-Palette pro Kachel (stabil nach Titel). */
  const PALETTE = [
    ["#ff7a1a","rgba(255,122,26,.38)"],["#ff5d73","rgba(255,93,115,.38)"],
    ["#c46bff","rgba(196,107,255,.38)"],["#5b8cff","rgba(91,140,255,.38)"],
    ["#22d3ee","rgba(34,211,238,.38)"],["#2dd4a7","rgba(45,212,167,.38)"],
    ["#f5c542","rgba(245,197,66,.38)"],["#ff6a52","rgba(255,106,82,.38)"],
  ];
  function colorFor(str){ let h=0; const s=String(str||""); for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return PALETTE[h%PALETTE.length]; }

  function isMobileLike(){ try{ const coarse=matchMedia&&matchMedia("(pointer: coarse)").matches; const small=Math.min(innerWidth||9999,innerHeight||9999)<=900; const touch=(navigator.maxTouchPoints||0)>1; return coarse||(touch&&small);}catch{return false;} }
  function normalizeTags(tags){ return (tags||[]).map(t=>String(t).toLowerCase()).filter(Boolean); }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
  function el(tag,attrs={},kids=[]){ const n=document.createElement(tag); for(const[k,v]of Object.entries(attrs)){ if(k==="class")n.className=v; else if(k==="html")n.innerHTML=v; else n.setAttribute(k,v);} for(const c of kids) n.appendChild(c); return n; }

  /* ============================================================
     Render — Kategorien dynamisch aufbauen
     ============================================================ */
  function render(){
    if(!cats) return;
    cats.innerHTML = "";
    const sorted = [...items].sort((a,b)=>{
      const af=normalizeTags(a.tags).includes("featured")?1:0, bf=normalizeTags(b.tags).includes("featured")?1:0; if(af!==bf) return bf-af;
      const ab=a.big?1:0, bb=b.big?1:0; if(ab!==bb) return bb-ab;
      return String(a.title||"").localeCompare(String(b.title||""),"de");
    });
    let gi=0;
    CATS.forEach(cat=>{
      const list = sorted.filter(it=> categoryOf(it)===cat.key);
      if(!list.length) return;
      const sec = el("section",{ class:"section", id:"sec-"+cat.key, "data-cat":cat.key });
      sec.appendChild(el("h2",{ html:`<span class="ic">${cat.icon}</span>${esc(cat.title)}<span class="cnt">${list.length}</span><span class="ln"></span>` }));
      const grid = el("div",{ class:"grid" });
      list.forEach(it=>{
        const tags = normalizeTags(it.tags);
        const [c,cg] = colorFor(it.title);
        const a = el("a",{ class:`tile${it.big?" big":""}`, href:it.href||"#", "data-tags":tags.join(" "), style:`--c:${c};--cg:${cg};--i:${gi++}` });
        const pwa = tags.includes("app") ? `<span class="pwa">APP</span>` : "";
        const verb = (tags.includes("test")||tags.includes("tool")) ? "Öffnen →" : (tags.includes("app")?"Starten →":"Spielen →");
        a.innerHTML = `${pwa}
          <div class="tile__emoji" aria-hidden="true">${esc(it.emoji)||"🎲"}</div>
          <div class="tile__label">${esc(it.label)}</div>
          <h2 class="tile__title">${esc(it.title)||"Untitled"}</h2>
          <p class="tile__desc">${esc(it.desc)}</p>
          <div class="tile__go">${verb}</div>`;
        grid.appendChild(a);
      });
      sec.appendChild(grid);
      cats.appendChild(sec);
    });
  }

  function apply(){
    const term = (q?.value||"").trim().toLowerCase();
    const tiles = [...document.querySelectorAll(".tile[data-tags]")];
    let shown=0;
    for(const t of tiles){
      const tags=(t.getAttribute("data-tags")||"").toLowerCase();
      const text=(t.innerText||"").toLowerCase();
      const matchTerm=!term||tags.includes(term)||text.includes(term);
      const matchFilter=filter==="all"||tags.includes(filter);
      const ok=matchTerm&&matchFilter; t.classList.toggle("hidden",!ok); if(ok) shown++;
    }
    document.querySelectorAll(".section[data-cat]").forEach(sec=>{
      const vis=[...sec.querySelectorAll(".tile")].some(t=>!t.classList.contains("hidden"));
      sec.classList.toggle("hidden",!vis);
    });
    if(countLine) countLine.textContent = shown ? `${shown} ${shown===1?"Eintrag":"Einträge"}` : "Keine Treffer.";
  }

  function applyFilter(next){ filter=next||"all"; chips.forEach(x=>x.setAttribute("aria-pressed",x.getAttribute("data-filter")===filter?"true":"false")); try{localStorage.setItem(FILTER_LS_KEY,filter);}catch{} apply(); }
  function initialFilter(){ try{const p=new URLSearchParams(location.search);const f=(p.get("filter")||"").toLowerCase().trim(); if(f) return f;}catch{} try{const l=(localStorage.getItem(FILTER_LS_KEY)||"").toLowerCase().trim(); if(l) return l;}catch{} return isMobileLike()?"mobile":"all"; }

  chips.forEach(c=> c.addEventListener("click",()=> applyFilter(c.getAttribute("data-filter")||"all")));
  q?.addEventListener("input",apply);
  btnClear?.addEventListener("click",()=>{ if(q) q.value=""; applyFilter("all"); q?.focus(); });

  render();
  applyFilter(initialFilter());

  /* ============================================================
     THEME-ENGINE — Saison automatisch, Fußball-Modus bei WM/EM
     ============================================================ */
  const THEME_KEY = "hub_theme_v1";
  const THEME_META = {
    winter:["❄️","Winter"], spring:["🌸","Frühling"], summer:["☀️","Sommer"],
    autumn:["🍂","Herbst"], football:["⚽","Fußball"],
  };
  const THEME_BG = { autumn:"#0b0a08", winter:"#070b12", spring:"#080f0a", summer:"#0c0a06", football:"#06140d" };
  // Turnier-Kalender (Datumsbereiche). "app" = Link, wenn vorhanden.
  const TOURNAMENTS = [
    { name:"WM 2026", emoji:"⚽", start:"2026-06-11", end:"2026-07-19", app:"spiele/wm2026/index.html", host:"USA · Kanada · Mexiko" },
    { name:"EM 2028", emoji:"🏆", start:"2028-06-09", end:"2028-07-09", host:"GB & Irland" },
    { name:"WM 2030", emoji:"⚽", start:"2030-06-13", end:"2030-07-21", host:"Spanien · Portugal · Marokko" },
    { name:"EM 2032", emoji:"🏆", start:"2032-06-12", end:"2032-07-12", host:"Italien · Türkei" },
  ];
  const d2 = s => { const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
  const DAY = 86400000;
  function activeTournament(now){ for(const t of TOURNAMENTS){ const s=d2(t.start), e=new Date(+d2(t.end)+DAY); if(now>=s && now<e) return t; } return null; }
  function soonTournament(now){ let best=null; for(const t of TOURNAMENTS){ const s=d2(t.start); const diff=(s-now)/DAY; if(diff>0 && diff<=30 && (!best||s<d2(best.start))) best=t; } return best; }
  function seasonOf(now){ const m=now.getMonth()+1; if(m<=2||m===12) return "winter"; if(m<=5) return "spring"; if(m<=8) return "summer"; return "autumn"; }
  function autoTheme(now){ return activeTournament(now) ? "football" : seasonOf(now); }

  let override = (()=>{ try{ return localStorage.getItem(THEME_KEY)||"auto"; }catch{ return "auto"; } })();
  function effectiveTheme(now){ return override==="auto" ? autoTheme(now) : override; }
  let setParticles = () => {}; // wird von der fx-IIFE unten gesetzt

  const seasonBtn = document.getElementById("seasonBtn");
  const tband = document.getElementById("tband");

  function applyTheme(){
    const now = new Date();
    const theme = effectiveTheme(now);
    document.body.dataset.theme = theme;
    // Baum folgt immer der echten Jahreszeit (auch im Fußball-Modus)
    const SEASONS = ["winter","spring","summer","autumn"];
    document.body.dataset.season = SEASONS.includes(theme) ? theme : seasonOf(now);
    const meta = document.querySelector('meta[name="theme-color"]'); if(meta) meta.setAttribute("content", THEME_BG[theme]||"#0a0b0f");
    // Button-Label
    if(seasonBtn){
      if(override==="auto"){ const [em]=THEME_META[theme]||["🔁"]; seasonBtn.innerHTML = `<span class="em">${em}</span> Auto`; seasonBtn.title="Theme: automatisch nach Datum — klick zum Umschalten"; }
      else { const [em,nm]=THEME_META[override]||["🎨",override]; seasonBtn.innerHTML = `<span class="em">${em}</span> ${nm}`; seasonBtn.title="Theme fest gewählt — klick für nächstes (… → Auto)"; }
    }
    setParticles(document.body.dataset.season);
    renderBanner(theme, now);
  }
  function renderBanner(theme, now){
    if(!tband) return;
    const act = activeTournament(now);
    if(theme==="football"){
      const t = act || TOURNAMENTS[0];
      const day = act ? Math.floor((now - d2(act.start))/DAY)+1 : null;
      tband.href = t.app || "#";
      tband.classList.toggle("show",true);
      tband.innerHTML = `<span class="tb-emoji">${t.emoji}</span>
        <span><b>${esc(t.name)} läuft</b>${day?` · Tag ${day}`:""} <span class="live">live</span></span>
        ${t.app?`<span class="tb-go">zur Übersicht →</span>`:""}`;
      return;
    }
    const soon = override==="auto" ? soonTournament(now) : null;
    if(soon){
      const days = Math.ceil((d2(soon.start)-now)/DAY);
      tband.href = soon.app || "#";
      tband.classList.add("show");
      tband.innerHTML = `<span class="tb-emoji">${soon.emoji}</span>
        <span><b>${esc(soon.name)}</b> startet in ${days} Tag${days===1?"":"en"} · ${esc(soon.host)}</span>
        ${soon.app?`<span class="tb-go">Vorschau →</span>`:""}`;
      return;
    }
    tband.classList.remove("show");
  }

  const CYCLE = ["auto","football","winter","spring","summer","autumn"];
  seasonBtn?.addEventListener("click",()=>{
    const i = CYCLE.indexOf(override); override = CYCLE[(i+1)%CYCLE.length];
    try{ localStorage.setItem(THEME_KEY,override); }catch{}
    applyTheme();
    const now=new Date(); const eff=effectiveTheme(now); const [em,nm]=THEME_META[eff]||["🔁","Auto"];
    toast(override==="auto" ? `🔁 Auto-Theme (${nm} ${em})` : `${em} ${nm}-Theme`);
    confetti(34, themeConfetti(eff));
  });
  function themeConfetti(theme){
    return ({ winter:["#bfe6ff","#ffffff","#7fc8ff"], spring:["#ffc6e3","#4be38b","#ffffff"],
      summer:["#ffe16b","#ffb020","#ff7a1a"], autumn:["#ff7a1a","#ffb020","#c0531a","#e0a020"],
      football:["#1fd76b","#ffcc3e","#ffffff","#0f9d4d"] }[theme]) || null;
  }

  applyTheme();

  /* ============================================================
     Hintergrund-Partikel (Theme-abhängig)
     ============================================================ */
  (function fx(){
    if(reduce) return;
    const cv=document.getElementById("bgfx"); if(!cv) return; const ctx=cv.getContext("2d");
    let W=0,H=0,DPR=1,parts=[],cfg=null,t=0,last=0;
    const CFG = {
      autumn:{type:"emoji", glyphs:["🍂","🍁","🍃"], n:24, sz:[16,32], vy:[.5,1.2], sway:1.1, wind:.7},
      winter:{type:"snow", n:70, sz:[1,3.6], vy:[.4,1.3], wind:.14},
      spring:{type:"emoji", glyphs:["🌸","🌷","🌼","🦋"], n:20, sz:[14,26], vy:[.25,.7], sway:1.25, wind:.22},
      summer:{type:"orb", n:40, color:"rgba(255,214,120,.6)", wind:.05},
      default:{type:"orb", n:40, color:"rgba(255,200,140,.5)"},
    };
    function accent(){ const c=getComputedStyle(document.body).getPropertyValue("--accent").trim(); return c||"#ff7a1a"; }
    function rnd(a,b){ return a+Math.random()*(b-a); }
    function size(){ W=innerWidth;H=innerHeight;DPR=Math.min(1.5,devicePixelRatio||1); cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR); ctx.setTransform(DPR,0,0,DPR,0,0); }
    function mk(kind){
      if(kind==="snow") return {k:"snow",x:Math.random()*W,y:Math.random()*H,r:rnd(cfg.sz[0],cfg.sz[1]),vy:rnd(cfg.vy[0],cfg.vy[1]),ph:Math.random()*6.28,a:rnd(.4,.95)};
      if(kind==="orb") return {k:"orb",x:Math.random()*W,y:Math.random()*H,r:rnd(.6,2),vx:rnd(-.16,.16),vy:rnd(-.16,.16),tw:Math.random()*6.28};
      const g=cfg.glyphs[Math.floor(Math.random()*cfg.glyphs.length)];
      return {k:"emoji",g,x:Math.random()*W,y:Math.random()*H,s:rnd(cfg.sz[0],cfg.sz[1]),vy:rnd(cfg.vy[0],cfg.vy[1]),rot:Math.random()*6.28,vr:rnd(-.02,.02),ph:Math.random()*6.28,sw:cfg.sway||.6};
    }
    function build(){ size(); parts=[]; if(!cfg) return; const orbs=cfg.orbs||0;
      for(let i=0;i<cfg.n;i++) parts.push(mk(cfg.type));
      for(let i=0;i<orbs;i++){ const o=mk("orb"); parts.push(o); }
    }
    setParticles = (theme)=>{ cfg = CFG[theme]||CFG.default; build(); };
    function frame(ts){ const dt=last?Math.min(2.5,(ts-last)/16.667):1; last=ts; t+=0.016*dt; ctx.clearRect(0,0,W,H); const acc=accent(); const wind=(cfg&&cfg.wind)||0;
      for(const p of parts){
        if(p.k==="orb"){ p.x+=p.vx*dt;p.y+=p.vy*dt; if(p.x<0||p.x>W)p.vx*=-1; if(p.y<0||p.y>H)p.vy*=-1; p.tw+=0.03*dt;
          ctx.globalAlpha=.35+.25*Math.sin(p.tw); ctx.fillStyle=cfg.color||acc; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.283); ctx.fill(); ctx.globalAlpha=1; continue; }
        if(p.k==="snow"){ p.y+=p.vy*dt; p.x+=(Math.sin(t+p.ph)*.4 + wind)*dt; if(p.y>H+5){p.y=-5;p.x=Math.random()*W;} if(p.x>W+5)p.x=-5; if(p.x<-5)p.x=W+5; ctx.globalAlpha=p.a; ctx.fillStyle="rgba(226,242,255,1)"; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.283); ctx.fill(); ctx.globalAlpha=1; continue; }
        // emoji (mit Wind)
        p.y+=p.vy*dt; p.x+=(Math.sin(t+p.ph)*p.sw + wind)*dt; p.rot+=p.vr*dt;
        if(p.y>H+30){p.y=-30;p.x=Math.random()*W;} if(p.x>W+30)p.x=-30; if(p.x<-30)p.x=W+30;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.globalAlpha=.85; ctx.font=p.s+"px serif"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(p.g,0,0); ctx.restore(); ctx.globalAlpha=1;
      }
      requestAnimationFrame(frame);
    }
    let rt; addEventListener("resize",()=>{ clearTimeout(rt); rt=setTimeout(build,180); });
    if(cfg) build(); requestAnimationFrame(frame);
    // Falls Theme schon vor fx() gesetzt: aktuelles anwenden
    setParticles(document.body.dataset.season||"summer");
  })();
  // Partikel jetzt sicher setzen (Setup steht) — nach Jahreszeit
  setParticles(document.body.dataset.season || seasonOf(new Date()));

  /* ============================================================
     Konfetti
     ============================================================ */
  const confCv=document.getElementById("confetti"); const cctx=confCv?confCv.getContext("2d"):null; let confP=[],confRAF=null;
  function sizeConf(){ if(!confCv) return; const DPR=Math.min(2,devicePixelRatio||1); confCv.width=innerWidth*DPR; confCv.height=innerHeight*DPR; cctx.setTransform(DPR,0,0,DPR,0,0); }
  addEventListener("resize",sizeConf); sizeConf();
  function confetti(n,colors){ if(reduce||!cctx) return; colors=colors||["#ff7a1a","#ffb020","#ffffff","#22d3ee","#c46bff"];
    for(let i=0;i<n;i++) confP.push({x:Math.random()*innerWidth,y:-20-Math.random()*innerHeight*.3,vx:(Math.random()-.5)*5,vy:Math.random()*4+3,r:Math.random()*7+4,a:Math.random()*6.28,va:(Math.random()-.5)*.3,c:colors[i%colors.length]});
    if(!confRAF) confRAF=requestAnimationFrame(confTick);
  }
  function confTick(){ cctx.clearRect(0,0,innerWidth,innerHeight); confP=confP.filter(p=>p.y<innerHeight+30);
    for(const p of confP){ p.x+=p.vx;p.y+=p.vy;p.vy+=.12;p.a+=p.va;p.vx*=.99; cctx.save();cctx.translate(p.x,p.y);cctx.rotate(p.a);cctx.fillStyle=p.c;cctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*.6);cctx.restore(); }
    if(confP.length) confRAF=requestAnimationFrame(confTick); else { confRAF=null; cctx.clearRect(0,0,innerWidth,innerHeight); }
  }

  /* ============================================================
     Toast
     ============================================================ */
  let toastT=null; const toastEl=document.getElementById("toast");
  function toast(msg){ if(!toastEl) return; toastEl.textContent=msg; toastEl.classList.add("show"); clearTimeout(toastT); toastT=setTimeout(()=>toastEl.classList.remove("show"),2400); }

  /* ============================================================
     Easter-Eggs 🥚
     ============================================================ */
  // 1) Logo-Ball antippen
  const ball=document.getElementById("logoBall"); let ballN=0,ballT=null;
  ball?.addEventListener("click",()=>{ ballN++; ball.classList.remove("spin"); void ball.offsetWidth; ball.classList.add("spin"); confetti(26,themeConfetti(document.body.dataset.theme));
    clearTimeout(ballT); ballT=setTimeout(()=>ballN=0,1600);
    if(ballN===5){ toast("⚽ Tooor! Du hast den Ball gefunden."); confetti(70,themeConfetti("football")); }
    if(ballN>=9){ takeover("⚽","GOOOAL!","Du klickst schneller als der VAR gucken kann.", themeConfetti("football")); ballN=0; }
  });
  // 2) Konami + Wort-Trigger
  const KONAMI="ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,b,a"; const kbuf=[];
  const WORDS=[
    { w:"tor", fn:()=>{ confetti(60,themeConfetti("football")); flash("TOOOR!"); } },
    { w:"goal", fn:()=>{ confetti(60,themeConfetti("football")); flash("GOAL!"); } },
    { w:"thomas", fn:()=>{ takeover("👋","Hey Thomas!","Deine Seite, deine Regeln. 🎮", null); } },
    { w:"wm", fn:()=>{ override="football"; try{localStorage.setItem(THEME_KEY,"football");}catch{} applyTheme(); toast("⚽ Fußball-Modus an"); } },
    { w:"schnee", fn:()=>{ override="winter"; try{localStorage.setItem(THEME_KEY,"winter");}catch{} applyTheme(); toast("❄️ Winter-Modus"); } },
  ];
  let wbuf="";
  addEventListener("keydown",e=>{
    kbuf.push(e.key); if(kbuf.length>12) kbuf.shift();
    if(kbuf.join(",").endsWith(KONAMI)){ takeover("🏆","Deutschland wird Weltmeister!","Konami-Code aktiviert. Glaub fest dran. 🤫", ["#000","#dd0000","#ffce00","#fff"]); }
    if(e.key.length===1){ wbuf=(wbuf+e.key.toLowerCase()).slice(-8); for(const it of WORDS){ if(wbuf.endsWith(it.w)){ it.fn(); wbuf=""; break; } } }
  });
  function flash(txt){ if(reduce) return; const d=document.createElement("div"); d.textContent=txt;
    d.style.cssText="position:fixed;inset:0;z-index:95;display:grid;place-items:center;font-family:var(--font-head);font-weight:700;font-size:16vw;color:#fff;text-shadow:0 0 40px var(--accent-glow);pointer-events:none;opacity:0;transition:.2s";
    document.body.appendChild(d); requestAnimationFrame(()=>d.style.opacity="1"); setTimeout(()=>{d.style.opacity="0"; setTimeout(()=>d.remove(),300);},700);
  }
  // Overlay
  const tk=document.getElementById("takeover");
  function takeover(emoji,title,sub,colors){ if(!tk) return; tk.querySelector(".big-emoji").textContent=emoji; tk.querySelector("h1").textContent=title; tk.querySelector("p").textContent=sub||""; tk.classList.add("show"); confetti(150,colors); }
  tk?.querySelector("button")?.addEventListener("click",()=> tk.classList.remove("show"));
  tk?.addEventListener("click",e=>{ if(e.target===tk) tk.classList.remove("show"); });

  // 3) Konsolen-Gruß
  console.log("%cthomas.fun","font-family:monospace;font-size:26px;font-weight:bold;color:#ff7a1a;text-shadow:0 2px 8px rgba(255,122,26,.4)");
  console.log("%cVersteckt: Konami ↑↑↓↓←→←→ B A · tipp 'tor', 'wm', 'schnee' · oder klick den Ball ⚽","color:#9aa0ad");
})();
