const c = document.getElementById("c");
const ctx = c.getContext("2d");
const btnStart = document.getElementById("btnStart");
const btnRestart = document.getElementById("btnRestart");
const btnEasy = document.getElementById("btnEasy");
const btnHard = document.getElementById("btnHard");
const elCount = document.getElementById("count");
const elStage = document.getElementById("stage");
const elBest = document.getElementById("best");
const ov = document.getElementById("ov");
const ovTitle = document.getElementById("ovTitle");
const ovText = document.getElementById("ovText");
const ovAgain = document.getElementById("ovAgain");
const ovClose = document.getElementById("ovClose");

const AC = window.AudioContext || window.webkitAudioContext;
let actx = null;
function tone(freq, dur=0.05, type="sine", vol=0.05){
  try{
    actx ||= new AC();
    if (actx.state === "suspended") actx.resume();
    const t0 = actx.currentTime;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    const v0 = Math.max(0.000001, +vol || 0);
    g.gain.setValueAtTime(v0, t0);
    // exponential ramps can't start at 0; linear is safer for tiny beeps
    g.gain.linearRampToValueAtTime(0.000001, t0 + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch {}
}

const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const lerp = (a,b,t)=>a+(b-a)*t;
const rand = (a,b)=>a+Math.random()*(b-a);
const hypot = Math.hypot;

let best = +(localStorage.getItem("mg_best")||"0")||0;

// World
const W = 18;          // lane half-width in world coords (normalized)
const roadW = 18;
const speed = 12.5;    // forward speed
const segLen = 18;     // gate spacing
const levelLen = 18;   // number of segments before boss (a bit shorter / fewer gates)
const gateRowGap = 6.5; // second gate row after the first (same segment)
const MAX_COUNT = 2_000_000_000; // prevents Infinity + keeps UI/math stable

let running = false;
let tNow = 0;
let fx = []; // particles
let shots = []; // enemy bullets

let player = null;
let segments = [];
let boss = null;
let state = "idle"; // idle | run | boss | win | lose
let mode = (localStorage.getItem("mg_mode") || "easy");

function setMode(m){
  mode = (m === "hard") ? "hard" : "easy";
  localStorage.setItem("mg_mode", mode);
  if (btnEasy && btnHard){
    btnEasy.classList.toggle("active", mode === "easy");
    btnHard.classList.toggle("active", mode === "hard");
  }
  reset();
}

function reset(){
  running = false;
  tNow = 0;
  fx = [];
  shots = [];
  state = "idle";
  player = {
    x: 0,
    vx: 0,
    count: 1,
    alive: true,
    hitT: 0,
    size: 1.0,
  };
  segments = makeSegments(levelLen);
  boss = null;
  hideOverlay();
  syncUI();
  draw();
}

function fmtInt(n){
  const x = Math.floor(Math.max(0, +n || 0));
  if (!isFinite(x)) return "0";
  if (x >= 1_000_000) return `${(x/1_000_000).toFixed(1)}M`;
  if (x >= 10_000) return `${Math.round(x/1000)}k`;
  return String(x);
}

function clampCount(n){
  let x = Math.floor(+n || 0);
  if (!isFinite(x)) x = 1;
  x = Math.max(0, Math.min(MAX_COUNT, x));
  return x;
}

function syncUI(){
  try{
    elCount.textContent = `👥 ${fmtInt(player?.count)}`;
    const prog = clamp((tNow / (levelLen*segLen)) * 100, 0, 100);
    elStage.textContent = (state === "boss" || state === "win" || state === "lose") ? "Boss!" : `Strecke: ${prog.toFixed(0)}%`;
    elBest.textContent = best ? `Best: ${fmtInt(best)}` : "Best: —";
  } catch {}
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

function makeGate(){
  // gates are either +n, -n, *k, /k
  const r = Math.random();
  let op = "+", val = 5;
  if (mode === "easy"){
    // fewer × gates (they snowball counts hard)
    if (r < 0.52){ op="+"; val = [3,5,8,12][(Math.random()*4)|0]; }
    else if (r < 0.66){ op="-"; val = [2,4,6,9][(Math.random()*4)|0]; }
    else if (r < 0.78){ op="×"; val = [2,3][(Math.random()*2)|0]; }
    else { op="÷"; val = [2,3][(Math.random()*2)|0]; }
  } else {
    if (r < 0.30){ op="+"; val = [3,5,8,12][(Math.random()*4)|0]; }
    else if (r < 0.54){ op="-"; val = [3,5,8,12][(Math.random()*4)|0]; }
    else if (r < 0.66){ op="×"; val = [2,3][(Math.random()*2)|0]; }
    else { op="÷"; val = [2,3,4][(Math.random()*3)|0]; }
  }
  return {op, val};
}

function isGoodGate(g){
  return g.op === "+" || g.op === "×";
}

function applyGate(count, g){
  let out = count;
  if (g.op === "+") out = count + g.val;
  else if (g.op === "-") out = Math.max(0, count - g.val);
  else if (g.op === "×") out = count * g.val;
  else if (g.op === "÷") out = Math.max(0, Math.floor(count / g.val));
  return clampCount(out);
}

function keepAliveDuringRun(){
  // During the running phase, hitting 0 shouldn't instantly "kill" you.
  // You keep going with 1 point so hits feel like penalties, not a hard fail.
  if (state !== "boss" && state !== "win" && state !== "lose"){
    if (player && player.count <= 0) player.count = 1;
    if (player) player.count = clampCount(player.count);
  }
}

function makeSegments(n){
  const out = [];
  for (let i=1;i<=n;i++){
    const z = i * segLen;
    // gate rows: not every segment has 2 (less spammy)
    const mkRow = (rowIdx)=>{
      const gL = makeGate();
      const gR = makeGate();
      // keep early segments easy (both rows)
      if (i <= 4){
        gL.op = "+"; gL.val = [3,5,8][(Math.random()*3)|0];
        gR.op = "+"; gR.val = [3,5,8][(Math.random()*3)|0];
      } else if (i <= 7 && rowIdx === 2){
        // second row slightly spicier but not brutal
        const mulChance = (mode === "hard") ? 0.22 : 0.14;
        if (Math.random() < mulChance){ gL.op = "×"; gL.val = 2; }
        if (Math.random() < mulChance){ gR.op = "×"; gR.val = 2; }
      }
      return {
        z: (z + (rowIdx === 1 ? rand(-2.2, 2.2) : gateRowGap + rand(-1.3, 1.3))),
        w: 7.0,
        leftX: -6.2,
        rightX: 6.2,
        L: gL,
        R: gR,
        used: false,
      };
    };
    // obstacles
    const obs = [];
    const baseN = (i <= 4) ? 1 : (i <= 10) ? 2 : 3;
    const oN = baseN + ((mode === "hard" && i >= 6) ? 1 : 0);
    for (let k=0;k<oN;k++){
      const x = rand(-W*0.85, W*0.85);
      const r = rand(1.2, 2.0);
      const dmg = (i <= 6) ? (mode === "hard" ? 3 : 2) : (i <= 12) ? (mode === "hard" ? 4 : 3) : (mode === "hard" ? 5 : 4);
      const typ = (Math.random() < (mode === "hard" ? 0.55 : 0.35) && i >= 5) ? "raider" : "spike";
      if (typ === "raider"){
        obs.push({
          type:"raider",
          x,
          z: z + rand(-6, 6),
          r: 1.8,
          dmg: Math.max(1, Math.floor(Math.max(2, dmg-1))),
          hp: 1,
          cd: rand(0.2, 0.9),
          hit: false,
        });
      } else {
        obs.push({
          type:"spike",
          x,
          z: z + rand(-6, 6),
          r,
          dmg: Math.max(1, Math.floor(dmg)),
          hit: false,
        });
      }
    }
    out.push({
      z,
      gates: (()=>{
        const gs = [mkRow(1)];
        // add a second row only sometimes (later + every 3rd segment)
        if (i >= 6 && (i % 3 === 0)) gs.push(mkRow(2));
        // in hard mode: slightly more often
        if (mode === "hard" && i >= 6 && (i % 4 === 0) && gs.length === 1) gs.push(mkRow(2));
        return gs;
      })(),
      obs
    });
  }
  return out;
}

function spawnBoss(){
  // Boss HP tuned for big endgame counts.
  const need = (mode === "hard") ? 50000 : 20000;
  boss = {
    z: levelLen*segLen + 26,
    hp: need,
    hpMax: need,
    x: 0,
    r: 4.6,
    hit: 0,
  };
}

function worldToScreen(wx, wz){
  // camera: player at fixed screen y, z forward
  const camZ = tNow - 12;
  const dz = wz - camZ;
  // pseudo perspective
  const p = 1 / (1 + dz*0.06);
  const sx = c.width*0.5 + wx * 22 * p;
  const sy = c.height*0.80 - dz * 18 * p;
  if (!isFinite(sx) || !isFinite(sy) || !isFinite(p) || p <= 0){
    return {sx: c.width*0.5, sy: c.height*0.8, p: 0.0001};
  }
  return {sx, sy, p};
}

function drawRoad(){
  ctx.save();
  // background fog
  const g = ctx.createLinearGradient(0,0,0,c.height);
  g.addColorStop(0, "rgba(10,12,24,1)");
  g.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,c.width,c.height);

  // subtle moving aurora / dust
  const tt = tNow * 0.045;
  ctx.globalCompositeOperation = "screen";
  for (let i=0;i<3;i++){
    const x = c.width*(0.18 + i*0.32) + Math.sin(tt + i*1.7)*120;
    const y = c.height*(0.18 + i*0.08) + Math.cos(tt*1.2 + i)*60;
    const rr = 520 + i*180;
    const gg = ctx.createRadialGradient(x,y, 10, x,y, rr);
    gg.addColorStop(0, `rgba(34,211,238,${0.10 - i*0.02})`);
    gg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gg;
    ctx.fillRect(0,0,c.width,c.height);
  }
  ctx.globalCompositeOperation = "source-over";

  // road ribbon
  ctx.globalCompositeOperation = "screen";
  for (let i=0;i<60;i++){
    const wz = (tNow - 20) + i*3.2;
    const a = 0.10 + i/60 * 0.10;
    const left = worldToScreen(-roadW, wz);
    const right = worldToScreen(roadW, wz);
    const mid = worldToScreen(0, wz);
    ctx.strokeStyle = `rgba(34,211,238,${a})`;
    ctx.lineWidth = 2 + 10*mid.p;
    ctx.beginPath();
    ctx.moveTo(left.sx, left.sy);
    ctx.lineTo(right.sx, right.sy);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";

  // lane hints
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  for (let i=0;i<24;i++){
    const wz = (tNow - 5) + i*6;
    const p0 = worldToScreen(0, wz);
    const p1 = worldToScreen(0, wz+2);
    ctx.beginPath();
    ctx.moveTo(p0.sx, p0.sy);
    ctx.lineTo(p1.sx, p1.sy);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGate(g){
  const z = g.z;
  const L = worldToScreen(g.leftX, z);
  const R = worldToScreen(g.rightX, z);
  const w = g.w;

  function drawSide(p, gate, col){
    const ww = Math.max(8, w * p.p * 18);
    const hh = Math.max(8, 72 * p.p);
    ctx.save();
    ctx.translate(p.sx, p.sy);
    ctx.globalCompositeOperation = "screen";
    // glow aura (avoid ctx.ellipse for compatibility)
    const glow = ctx.createRadialGradient(0, -hh*0.15, 1, 0, -hh*0.15, Math.max(30, ww*1.25));
    glow.addColorStop(0, col.replace("0.16", "0.30").replace("0.12","0.26").replace("0.10","0.22"));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(20, ww*0.62), 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = col;
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 2;
    roundRect(-ww*0.5, -hh, ww, hh*2, Math.max(0, 14*p.p));
    ctx.fill(); ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    ctx.shadowColor = "rgba(0,0,0,0.0)";
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.font = `${Math.max(14, 46*p.p)}px system-ui,Segoe UI,Roboto`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(`${gate.op}${gate.val}`, 0, -6);
    ctx.restore();
  }

  const colL = isGoodGate(g.L) ? "rgba(93,255,180,0.16)" : "rgba(255,107,107,0.16)";
  const colR = isGoodGate(g.R) ? "rgba(93,255,180,0.16)" : "rgba(255,107,107,0.16)";
  drawSide(L, g.L, colL);
  drawSide(R, g.R, colR);
}

function drawObstacle(o){
  const typ = (o && o.type === "raider") ? "raider" : "spike";
  const p = worldToScreen(o.x, o.z);
  const sc = p.p * 18;
  ctx.save();
  ctx.globalCompositeOperation = "screen";

  if (typ === "raider"){
    const r = 2.2 * sc;
    // body
    ctx.fillStyle = "rgba(255,107,107,0.10)";
    ctx.strokeStyle = "rgba(255,107,107,0.40)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, r, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();

    // head + visor
    ctx.fillStyle = "rgba(255,215,106,0.22)";
    ctx.beginPath();
    ctx.arc(p.sx, p.sy - r*0.25, r*0.35, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = "rgba(34,211,238,0.32)";
    ctx.beginPath();
    ctx.moveTo(p.sx - r*0.32, p.sy - r*0.25);
    ctx.lineTo(p.sx + r*0.32, p.sy - r*0.25);
    ctx.stroke();

    // gun
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 6*p.p;
    ctx.beginPath();
    ctx.moveTo(p.sx + r*0.1, p.sy + r*0.05);
    ctx.lineTo(p.sx + r*0.85, p.sy - r*0.05);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,107,107,0.75)";
    ctx.font = `${Math.max(12, 22*p.p)}px system-ui,Segoe UI,Roboto`;
    ctx.textAlign="center"; ctx.textBaseline="top";
    ctx.fillText(`-${o.dmg}`, p.sx, p.sy + r*0.85);
  } else {
    // spikes: triangle cluster
    const r = o.r * sc;
    ctx.fillStyle = "rgba(255,107,107,0.10)";
    ctx.strokeStyle = "rgba(255,107,107,0.38)";
    ctx.lineWidth = 2;
    for (let i=0;i<3;i++){
      const dx = (i-1)*r*0.55;
      const h = r*0.95;
      ctx.beginPath();
      ctx.moveTo(p.sx + dx, p.sy - h);
      ctx.lineTo(p.sx + dx - r*0.55, p.sy + h*0.55);
      ctx.lineTo(p.sx + dx + r*0.55, p.sy + h*0.55);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,107,107,0.75)";
    ctx.font = `${Math.max(12, 24*p.p)}px system-ui,Segoe UI,Roboto`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(`-${o.dmg}`, p.sx, p.sy + r*0.8);
  }
  ctx.restore();
}

function drawShots(){
  for (const b of shots){
    const s = worldToScreen(b.x, b.z);
    const r = 0.55 * s.p * 18;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    // trail
    const t0 = worldToScreen(b.x - b.vx*0.06, b.z - b.vz*0.06);
    ctx.strokeStyle = "rgba(255,107,107,0.35)";
    ctx.lineWidth = Math.max(1, 4*s.p);
    ctx.beginPath();
    ctx.moveTo(t0.sx, t0.sy);
    ctx.lineTo(s.sx, s.sy);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,107,107,0.85)";
    ctx.beginPath();
    ctx.arc(s.sx, s.sy, r, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBoss(){
  if (!boss) return;
  const p = worldToScreen(boss.x, boss.z);
  const r = boss.r * p.p * 18;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "rgba(255,107,107,0.12)";
  ctx.strokeStyle = "rgba(255,107,107,0.45)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p.sx, p.sy, r, 0, Math.PI*2);
  ctx.fill(); ctx.stroke();
  // face-ish
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.beginPath();
  ctx.arc(p.sx - r*0.3, p.sy - r*0.15, r*0.12, 0, Math.PI*2);
  ctx.arc(p.sx + r*0.3, p.sy - r*0.15, r*0.12, 0, Math.PI*2);
  ctx.fill();

  // hp bar
  const w = 180*p.p;
  const h = 14*p.p;
  const x = p.sx - w/2;
  const y = p.sy - r - 26*p.p;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(0,0,0,0.40)";
  roundRect(x, y, w, h, 6*p.p);
  ctx.fill();
  const f = clamp(boss.hp / boss.hpMax, 0, 1);
  ctx.fillStyle = "rgba(255,107,107,0.85)";
  roundRect(x, y, w*f, h, 6*p.p);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.font = `${Math.max(12, 18*p.p)}px system-ui,Segoe UI,Roboto`;
  ctx.textAlign="center"; ctx.textBaseline="bottom";
  ctx.fillText(`Boss HP: ${fmtInt(boss.hp)}`, p.sx, y - 6*p.p);
  ctx.restore();
}

function drawPlayer(){
  const p = worldToScreen(player.x, tNow);
  const r = 2.1 * p.p * 18;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const hit = clamp(player.hitT, 0, 1);
  ctx.fillStyle = `rgba(34,211,238,${0.14 + hit*0.18})`;
  ctx.strokeStyle = "rgba(93,255,180,0.40)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p.sx, p.sy, r, 0, Math.PI*2);
  ctx.fill(); ctx.stroke();

  // crowd dots
  const n = clamp(player.count, 1, 160);
  const show = Math.min(22, Math.ceil(Math.sqrt(n)));
  for (let i=0;i<show;i++){
    const a = (i/show)*Math.PI*2;
    const wob = 0.10 * Math.sin(performance.now()*0.003 + i*1.7);
    const rr = r * (0.42 + wob);
    ctx.fillStyle = "rgba(255,215,106,0.28)";
    ctx.beginPath();
    ctx.arc(p.sx + Math.cos(a)*rr, p.sy + Math.sin(a)*rr, 3.2*p.p, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();

  // count label near bottom
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "900 18px system-ui,Segoe UI,Roboto";
  ctx.textAlign = "center"; ctx.textBaseline="middle";
  ctx.fillText(`${fmtInt(player.count)}`, p.sx, p.sy - r - 18);
  ctx.restore();
}

function drawFX(dt){
  const sec = dt/1000;
  for (const p of fx){
    p.x += p.vx*sec; p.z += p.vz*sec;
    p.vx *= Math.pow(0.82, dt/16);
    p.vz *= Math.pow(0.82, dt/16);
    p.life -= sec;
  }
  fx = fx.filter(p => p.life > 0).slice(-450);

  for (const p of fx){
    const s = worldToScreen(p.x, p.z);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = clamp(p.life / p.lifeMax, 0, 1);
    ctx.fillStyle = p.col;
    ctx.beginPath();
    ctx.arc(s.sx, s.sy, p.r * s.p, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

function roundRect(x,y,w,h,r){
  const rr = Math.max(0, Math.min(r, Math.min(w,h)/2));
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}

function spawnBurst(wx, wz, col){
  for (let i=0;i<22;i++){
    const a = Math.random()*Math.PI*2;
    const sp = rand(7, 22);
    fx.push({x: wx, z: wz, vx: Math.cos(a)*sp, vz: Math.sin(a)*sp, life: rand(0.18, 0.40), lifeMax: 0.40, r: rand(8, 16), col});
  }
}

function step(dt){
  const sec = dt/1000;
  if (!running) return;

  player.hitT = Math.max(0, player.hitT - sec*2.2);

  // move forward (stop in boss arena)
  if (state !== "boss"){
    tNow += speed * sec;
  } else if (boss){
    // still move up to the boss line, then lock there
    tNow += speed * sec;
    tNow = Math.min(tNow, boss.z - 6);
  }

  // horizontal movement
  player.x += player.vx * sec;
  player.x = clamp(player.x, -W, W);
  player.vx *= Math.pow(0.85, dt/16);

  // gates + obstacles
  for (const s of segments){
    for (const g of (s.gates || [])){
      if (!g.used && tNow >= g.z){
        g.used = true;
        const left = {x: g.leftX, w: g.w, gate: g.L};
        const right = {x: g.rightX, w: g.w, gate: g.R};
        const pick = (Math.abs(player.x - left.x) < Math.abs(player.x - right.x)) ? left : right;
        const before = player.count;
        const after = applyGate(before, pick.gate);
        player.count = clampCount(after);
        keepAliveDuringRun();
        spawnBurst(pick.x, g.z, isGoodGate(pick.gate) ? "rgba(93,255,180,0.65)" : "rgba(255,107,107,0.75)");
        tone(pick.gate.op === "×" ? 260 : pick.gate.op === "÷" ? 180 : pick.gate.op === "-" ? 150 : 340, 0.06, "triangle", 0.05);
      }
    }
    for (const o of s.obs){
      if (o.hit) continue;
      if (!isFinite(o.x)) o.x = 0;
      if (!isFinite(o.z)) o.z = s.z;
      if (!isFinite(o.r) || o.r <= 0) o.r = 1.6;
      if (!isFinite(o.dmg) || o.dmg <= 0) o.dmg = 1;
      // raiders shoot
      const typ = (o && o.type === "raider") ? "raider" : "spike";
      if (typ === "raider" && !isFinite(o.cd)) o.cd = rand(0.2, 0.9);
      if (typ === "raider"){
        o.cd -= sec;
        const dz = o.z - tNow;
        if (o.cd <= 0 && dz > 2.5 && dz < 16){
          o.cd = (mode === "hard") ? rand(0.28, 0.55) : rand(0.40, 0.80);
          const aimX = player.x + player.vx*0.06;
          const dx = aimX - o.x;
          const sp = (mode === "hard") ? 26 : 21;
          const len = Math.hypot(dx, 1) || 1;
          shots.push({
            x: o.x,
            z: o.z,
            vx: (dx/len) * sp,
            vz: (-1/len) * sp,
            life: 1.8,
            dmg: 1,
          });
          tone(240, 0.03, "square", 0.03);
        }
      }
      if (tNow >= o.z - 0.6 && tNow <= o.z + 0.6){
        if (Math.abs(player.x - o.x) < o.r + 1.0){
          o.hit = true;
          player.count = clampCount(Math.max(0, player.count - o.dmg));
          keepAliveDuringRun();
          player.hitT = 1.0;
          spawnBurst(o.x, o.z, "rgba(255,107,107,0.75)");
          tone(130, 0.08, "sawtooth", 0.05);
        }
      }
    }
  }

  // enemy shots
  for (const b of shots){
    b.x += b.vx * sec;
    b.z += b.vz * sec;
    b.life -= sec;
    if (Math.abs(b.z - tNow) < 0.75 && Math.abs(b.x - player.x) < 1.15){
      b.life = -1;
      player.count = clampCount(Math.max(0, player.count - b.dmg));
      keepAliveDuringRun();
      player.hitT = 1.0;
      spawnBurst(player.x, tNow, "rgba(255,107,107,0.85)");
      tone(150, 0.06, "sawtooth", 0.05);
    }
  }
  shots = shots.filter(b => b.life > 0).slice(-220);

  // transition to boss
  if (!boss && tNow >= levelLen*segLen + 6){
    spawnBoss();
    state = "boss";
    tone(96, 0.18, "sine", 0.06);
  }

  // boss fight: when close enough, count becomes damage
  if (boss){
    if (tNow >= boss.z - 6){
      // drain count into boss hp
      const dps = (mode === "hard") ? 14 : 18; // hard: even slower
      const take = Math.min(Math.max(0, player.count), dps*sec);
      player.count = clampCount(player.count - take);
      boss.hp -= take;
      if (!isFinite(boss.hp)) boss.hp = boss.hpMax;
      boss.hp = Math.max(0, boss.hp);
      boss.hit = 0.10;
      if ((Math.random() < 0.25) && take > 0) spawnBurst(0, boss.z, "rgba(255,215,106,0.35)");
      if (boss.hp <= 0){
        boss.hp = 0;
        running = false;
        state = "win";
        best = Math.max(best, Math.floor(Math.max(0, player.count)));
        localStorage.setItem("mg_best", String(Math.floor(best)));
        showOverlay("Gewonnen!", `Boss besiegt. Übrig: ${fmtInt(player.count)} 👥`);
        tone(520,0.10,"triangle",0.06);
        tone(780,0.10,"triangle",0.05);
      } else if (player.count <= 0){
        running = false;
        state = "lose";
        showOverlay("Game Over", "Zu wenig Leute für den Boss.");
        tone(120,0.14,"sawtooth",0.06);
      }
    }
  }

  // last-line defense against NaNs/Infs (these will crash canvas ops next frame)
  if (!isFinite(tNow) || tNow < 0) tNow = 0;
  if (player){
    if (!isFinite(player.x)) player.x = 0;
    player.x = clamp(player.x, -W, W);
    if (!isFinite(player.vx)) player.vx = 0;
    player.count = clampCount(player.count);
  }

  syncUI();
}

function draw(dt=16){
  // hard-reset canvas state to avoid "stuck white screen" after exceptions
  ctx.setTransform(1,0,0,1,0,0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowBlur = 0;
  ctx.shadowColor = "rgba(0,0,0,0)";
  try { ctx.filter = "none"; } catch {}

  drawRoad();

  // draw upcoming segments (back to front)
  const camZ = tNow - 12;
  const zMax = camZ + 120;
  const drawSegs = [];
  for (const s of segments){
    if (s.z < camZ - 10) continue;
    if (s.z > zMax) break;
    drawSegs.push(s);
  }

  // obstacles first (farther first)
  for (const s of drawSegs){
    for (const o of s.obs){
      if (o.z < camZ - 2 || o.z > zMax) continue;
      drawObstacle(o);
    }
  }
  drawShots();
  // gates
  for (const s of drawSegs){
    for (const g of (s.gates || [])){
      if (g.z < camZ - 2 || g.z > zMax) continue;
      drawGate(g);
    }
  }
  if (boss) drawBoss();
  drawPlayer();
  drawFX(dt);
}

if (btnEasy && btnHard){
  btnEasy.addEventListener("click", ()=>setMode("easy"));
  btnHard.addEventListener("click", ()=>setMode("hard"));
  setMode(mode);
}

let last = performance.now();
function loop(ts){
  const dt = Math.min(40, ts - last);
  last = ts;
  try{
    step(dt);
    draw(dt);
  } catch (err){
    running = false;
    state = "lose";
    const msg = (err && (err.message || String(err))) ? String(err.message || err) : "Unbekannter Fehler";
    showOverlay("Fehler", `${msg}\n\nDrück „Nochmal“.`);
    console.error(err);
  }
  if (running) requestAnimationFrame(loop);
}

function start(){
  if (running) return;
  running = true;
  state = "run";
  last = performance.now();
  requestAnimationFrame(loop);
}

// Input
let targetX = 0;
function setTarget(dx){
  targetX = clamp(targetX + dx, -W, W);
}
function updateSteer(){
  try{
    const dx = targetX - player.x;
    player.vx += clamp(dx, -10, 10) * 3.2;
  } catch {}
}
setInterval(()=>{ if (running) updateSteer(); }, 16);

addEventListener("keydown", (e)=>{
  if (e.code === "ArrowLeft" || e.code === "KeyA") setTarget(-5.5);
  if (e.code === "ArrowRight" || e.code === "KeyD") setTarget(5.5);
  if (e.code === "Space") start();
});

// touch swipe
let touch = null;
c.addEventListener("pointerdown", (e)=>{
  try{ c.setPointerCapture(e.pointerId); } catch {}
  touch = {id:e.pointerId, x:e.clientX, y:e.clientY};
});
c.addEventListener("pointermove", (e)=>{
  if (!touch || touch.id !== e.pointerId) return;
  const dx = e.clientX - touch.x;
  const w = Math.max(1, c.getBoundingClientRect().width);
  const nx = clamp(dx / w, -1, 1);
  targetX = nx * W;
});
c.addEventListener("pointerup", (e)=>{
  if (!touch || touch.id !== e.pointerId) return;
  touch = null;
});

btnStart.addEventListener("click", start);
btnRestart.addEventListener("click", reset);
ovAgain.addEventListener("click", ()=>{ hideOverlay(); reset(); start(); });
ovClose.addEventListener("click", ()=> hideOverlay());
ov.addEventListener("click", (e)=>{ if (e.target === ov) hideOverlay(); });

reset();

