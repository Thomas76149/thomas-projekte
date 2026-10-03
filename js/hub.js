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
    { key:"special",  title:"Specials & Seasonal",   icon:"✨" },
    { key:"arcade",   title:"Arcade & Action",       icon:"🕹️" },
    { key:"puzzle",   title:"Puzzle & Brains",        icon:"🧩" },
    { key:"online",   title:"Online & Multiplayer",   icon:"🌐" },
    { key:"strategy", title:"Strategy",               icon:"🗺️" },
    { key:"data",     title:"Data & Simulations",     icon:"📊" },
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
        const a = el("a",{ class:`tile${it.big?" big":""}`, href:it.href||"#", "data-tags":tags.join(" "), style:`--i:${gi++}` });
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
     Sternenhimmel — wird nur beim Laden und nach Resize gezeichnet
     ============================================================ */
  (function stars(){
    const cv=document.getElementById("stars"); if(!cv) return; const ctx=cv.getContext("2d");
    let seed=7; const rnd=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
    function draw(){
      const w=cv.clientWidth, h=cv.clientHeight; if(!w||!h) return;
      const dpr=Math.min(2,devicePixelRatio||1);
      cv.width=Math.round(w*dpr); cv.height=Math.round(h*dpr); ctx.setTransform(dpr,0,0,dpr,0,0);
      seed=7; const n=Math.round(w*h/5200);
      for(let i=0;i<n;i++){
        const x=rnd()*w, y=rnd()*h, r=rnd()<.08?1.6:rnd()*.9+.35, fade=1-(y/h)*.55;
        ctx.globalAlpha=(rnd()*.55+.35)*fade;
        ctx.fillStyle=rnd()<.15?"#ffd6f6":(rnd()<.2?"#bdf4ff":"#ffffff");
        ctx.beginPath(); ctx.arc(x,y,r,0,6.283); ctx.fill();
      }
      ctx.globalAlpha=1;
    }
    let rt; addEventListener("resize",()=>{ clearTimeout(rt); rt=setTimeout(draw,200); });
    draw();
  })();

  const CONFETTI_COLORS = ["#36e2ff","#ff4fd8","#ffd25c","#ffffff"];
  const FOOTBALL_COLORS = ["#1fd76b","#ffcc3e","#ffffff","#0f9d4d"];

  /* ============================================================
     Konfetti
     ============================================================ */
  const confCv=document.getElementById("confetti"); const cctx=confCv?confCv.getContext("2d"):null; let confP=[],confRAF=null;
  function sizeConf(){ if(!confCv) return; const DPR=Math.min(2,devicePixelRatio||1); confCv.width=innerWidth*DPR; confCv.height=innerHeight*DPR; cctx.setTransform(DPR,0,0,DPR,0,0); }
  addEventListener("resize",sizeConf); sizeConf();
  function confetti(n,colors){ if(reduce||!cctx) return; colors=colors||CONFETTI_COLORS;
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
  ball?.addEventListener("click",()=>{ ballN++; ball.classList.remove("spin"); void ball.offsetWidth; ball.classList.add("spin"); confetti(26,CONFETTI_COLORS);
    clearTimeout(ballT); ballT=setTimeout(()=>ballN=0,1600);
    if(ballN===5){ toast("⚽ Tooor! Du hast den Ball gefunden."); confetti(70,FOOTBALL_COLORS); }
    if(ballN>=9){ takeover("⚽","GOOOAL!","Du klickst schneller als der VAR gucken kann.", FOOTBALL_COLORS); ballN=0; }
  });
  // 2) Konami + Wort-Trigger
  const KONAMI="ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,b,a"; const kbuf=[];
  const WORDS=[
    { w:"tor", fn:()=>{ confetti(60,FOOTBALL_COLORS); flash("TOOOR!"); } },
    { w:"goal", fn:()=>{ confetti(60,FOOTBALL_COLORS); flash("GOAL!"); } },
    { w:"thomas", fn:()=>{ takeover("👋","Hey Thomas!","Deine Seite, deine Regeln. 🎮", null); } },
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
  console.log("%cthomas.fun","font-family:monospace;font-size:26px;font-weight:bold;color:#36e2ff;text-shadow:0 2px 8px rgba(54,226,255,.4)");
  console.log("%cVersteckt: Konami ↑↑↓↓←→←→ B A · tipp 'tor' · oder klick den Ball ⚽","color:#9aa0ad");

})();
