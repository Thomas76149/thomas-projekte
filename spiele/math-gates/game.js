'use strict';
/* ============================================================
   MATH GATES — Crowd Runner
   Eine sichtbare Menge kleiner Renner läuft eine Straße entlang,
   wächst/schrumpft an Mathe-Toren, weicht Hindernissen aus und
   crasht am Ende in einen Boss. Pseudo-3D, Partikel, Sound.
   Vanilla, eine Datei. Reduced-Motion respektiert.
   ============================================================ */
(() => {
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const c = document.getElementById('c');
const ctx = c.getContext('2d');
const W = c.width, H = c.height;            // 1200 x 720

const btnStart  = document.getElementById('btnStart');
const btnRestart= document.getElementById('btnRestart');
const btnEasy   = document.getElementById('btnEasy');
const btnHard   = document.getElementById('btnHard');
const countEl   = document.getElementById('count');
const stageEl   = document.getElementById('stage');
const bestEl    = document.getElementById('best');
const ov        = document.getElementById('ov');
const ovTitle   = document.getElementById('ovTitle');
const ovText    = document.getElementById('ovText');
const ovAgain   = document.getElementById('ovAgain');
const ovClose   = document.getElementById('ovClose');

/* ---------- Perspektive ---------- */
const HORIZON = 170, GROUNDY = 658, CX = W/2, ROAD_NEAR = 560;
const PLAYER_Z = 0.12;
function project(laneX, z){
  const s = 1 / (1 + Math.max(0, z) * 2.0);   // z=0→1, z=1→0.33, z=3→0.14
  return { x: CX + laneX * ROAD_NEAR * s, y: HORIZON + (GROUNDY - HORIZON) * s, s };
}

/* ---------- Status ---------- */
let mode = localStorage.getItem('mg_mode') || 'easy';
let state = 'idle';                 // idle | run | win | lose
let running = false;
let count = 1, shownCount = 1;
let laneX = 0;
let keyL = false, keyR = false, drag = null;
let traveled = 0, trackLen = 1, speed = 0;
let events = [], boss = null;
let particles = [], floats = [], rings = [];
let shake = 0, flash = 0, flashCol = '#5dffb4', hitFlash = 0;
let best = parseInt(localStorage.getItem('mg_best') || '0', 10) || 0;
let t = 0, last = 0, raf = 0;

/* ---------- Crowd-Formation (feste Slots) ---------- */
const MAXFIG = 42;
const slots = [];
for (let i = 0; i < MAXFIG; i++){
  // grob kreisförmiger Pulk, leichte Tiefe
  const ring = Math.floor(Math.sqrt(i) * 1.3);
  const ang = i * 2.399963;                 // goldener Winkel → gleichmäßig
  const r = 0.018 + ring * 0.012;
  slots.push({ ox: Math.cos(ang) * r, oz: 0.02 + Math.abs(Math.sin(ang)) * r * 2.2 + i * 0.0015, ph: Math.random() * 6.28 });
}
slots.sort((a, b) => b.oz - a.oz);          // hinten zuerst zeichnen

/* ---------- Audio ---------- */
let AC = null, master = null;
function audio(){
  if (AC) return;
  try{
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.5; master.connect(AC.destination);
  }catch(e){ AC = null; }
}
function blip(f0, f1, dur, type, vol){
  if (!AC) return;
  const o = AC.createOscillator(), g = AC.createGain(), now = AC.currentTime;
  o.type = type || 'triangle';
  o.frequency.setValueAtTime(f0, now);
  o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), now + dur);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(vol || 0.3, now + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0008, now + dur);
  o.connect(g); g.connect(master); o.start(now); o.stop(now + dur + 0.02);
}
function noiseHit(){
  if (!AC) return;
  const n = AC.sampleRate * 0.18, buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0);
  for (let i=0;i<n;i++) d[i] = (Math.random()*2-1) * (1 - i/n);
  const s = AC.createBufferSource(); s.buffer = buf;
  const f = AC.createBiquadFilter(); f.type='lowpass'; f.frequency.value=900;
  const g = AC.createGain(); g.gain.value = 0.5;
  s.connect(f); f.connect(g); g.connect(master); s.start();
}
function chordWin(){
  if (!AC) return;
  [523, 659, 784, 1046].forEach((f,i)=> setTimeout(()=>blip(f, f, 0.5, 'sawtooth', 0.18), i*70));
}

/* ---------- Track bauen ---------- */
function rnd(a, b){ return a + Math.random() * (b - a); }
function makeOpGood(){ return Math.random() < 0.5 ? { t:'+', v: 5 + (Math.random()*16|0) } : { t:'×', v: 2 }; }
function makeOpBad(){  return Math.random() < 0.5 ? { t:'-', v: 4 + (Math.random()*12|0) } : { t:'÷', v: 2 }; }
function makeGatePair(hard){
  let L, R; const r = Math.random();
  if (r < (hard ? 0.5 : 0.32)) { L = makeOpGood(); R = makeOpBad(); }   // klug wählen
  else if (r < (hard ? 0.72 : 0.62)) { L = makeOpGood(); R = makeOpGood(); } // beide gut → größeres
  else { L = makeOpBad(); R = makeOpGood(); }
  if (Math.random() < 0.5){ const tmp = L; L = R; R = tmp; }
  return [L, R];
}
function buildTrack(){
  events = [];
  const hard = mode === 'hard';
  let d = 12;
  const nGates = hard ? 14 : 11;
  for (let i = 0; i < nGates; i++){
    // Erstes Tor immer freundlich: bootstrap aus der kleinen Start-Menge.
    const ops = i === 0
      ? [{ t:'+', v: 9 + (Math.random()*7|0) }, { t:'×', v: 2 }]
      : makeGatePair(hard);
    events.push({ dist: d, kind: 'gate', ops, done: false });
    d += rnd(9.5, 13.5);
    // Hindernisse erst ab dem 3. Tor — sonst stirbt die winzige Start-Menge sofort.
    if (i >= 2 && Math.random() < (hard ? 0.55 : 0.32)){
      events.push({ dist: d, kind: 'obs', laneX: Math.random() < 0.5 ? -0.55 : 0.55, done: false });
      d += rnd(6.5, 9);
    }
  }
  d += 11;
  const thresh = hard ? Math.round(rnd(70, 120)) : Math.round(rnd(35, 60));
  boss = { dist: d, thresh, done: false };
  events.push({ dist: d, kind: 'boss', done: false });
  trackLen = d + 6;
}

function applyOp(n, op){
  let r = n;
  if (op.t === '+') r = n + op.v;
  else if (op.t === '-') r = n - op.v;
  else if (op.t === '×') r = n * op.v;
  else if (op.t === '÷') r = n / op.v;
  return Math.max(0, Math.min(9999, Math.round(r)));
}
const opStr = op => op.t + op.v;
const opGood = op => op.t === '+' || op.t === '×';

/* ---------- Steuerung-Reset ---------- */
function reset(){
  running = false; cancelAnimationFrame(raf);
  state = 'idle';
  count = 1; shownCount = 1; laneX = 0; targetReset();
  traveled = 0; speed = 0;
  particles = []; floats = []; rings = [];
  shake = 0; flash = 0; hitFlash = 0;
  buildTrack();
  syncHUD(); draw();
  hideOverlay();
}
function targetReset(){ keyL = false; keyR = false; drag = null; }

function start(){
  if (running) return;
  audio(); if (AC && AC.state === 'suspended') AC.resume();
  if (state === 'win' || state === 'lose' || count <= 0) reset();
  running = true; state = 'run';
  speed = mode === 'hard' ? 7.2 : 6.4;
  hideOverlay();
  last = performance.now();
  raf = requestAnimationFrame(loop);
}

/* ---------- Effekte ---------- */
function burst(x, y, col, n, spd){
  if (REDUCED) n = Math.min(n, 6);
  for (let i = 0; i < n; i++){
    const a = Math.random() * 6.28, v = rnd(1, spd || 5);
    particles.push({ x, y, vx: Math.cos(a)*v, vy: Math.sin(a)*v - 2, life: 1, col, r: rnd(2, 5) });
  }
}
function floatText(x, y, txt, col){ floats.push({ x, y, txt, col, life: 1 }); }
function ring(x, y, col){ if (!REDUCED) rings.push({ x, y, r: 8, col, life: 1 }); }

/* ---------- Event-Auflösung ---------- */
function resolveGate(ev){
  ev.done = true;
  const op = laneX < 0 ? ev.ops[0] : ev.ops[1];
  const before = count;
  count = applyOp(count, op);
  const p = project(laneX, PLAYER_Z);
  const good = opGood(op);
  floatText(p.x, p.y - 120, (count >= before ? '+' : '') + (count - before), good ? '#5dffb4' : '#ff6b6b');
  burst(p.x, p.y - 80, good ? '#5dffb4' : '#ff6b6b', good ? 22 : 14, 6);
  ring(p.x, p.y - 70, good ? '#5dffb4' : '#ff6b6b');
  flash = 0.5; flashCol = good ? '#5dffb4' : '#ff6b6b';
  if (good) blip(360, 760, 0.18, 'triangle', 0.28);
  else { blip(420, 150, 0.22, 'sawtooth', 0.25); shake = REDUCED ? 0 : 6; }
  if (count <= 0) lose();
}
function resolveObs(ev){
  ev.done = true;
  if (Math.abs(laneX - ev.laneX) < 0.34){
    const dmg = Math.max(1, Math.round(count * (mode === 'hard' ? 0.22 : 0.16)));   // prozentual, nie Instakill
    const before = count; count = Math.max(0, count - dmg);
    const p = project(laneX, PLAYER_Z);
    floatText(p.x, p.y - 110, '-' + (before - count), '#ff6b6b');
    burst(p.x, p.y - 60, '#ff9a6b', 18, 7);
    hitFlash = 0.6; shake = REDUCED ? 0 : 12; noiseHit();
    if (count <= 0) lose();
  }
}
function resolveBoss(){
  if (boss.done) return; boss.done = true;
  running = false; cancelAnimationFrame(raf);
  const p = project(0, PLAYER_Z);
  if (count >= boss.thresh){
    state = 'win';
    burst(W/2, H*0.4, '#5dffb4', REDUCED?10:60, 11); shake = REDUCED?0:16; chordWin();
    if (count > best){ best = count; localStorage.setItem('mg_best', String(best)); }
    syncHUD();
    showOverlay('You made it! 🎉', `Your ${count} overran the boss (${boss.thresh}).`, 'Again');
  } else {
    state = 'lose';
    burst(W/2, H*0.45, '#ff6b6b', REDUCED?10:40, 9); shake = REDUCED?0:14; blip(200, 60, 0.6, 'sawtooth', 0.3);
    showOverlay('Too few …', `${count} against ${boss.thresh} — just not enough. Take more good gates!`, 'Again');
  }
}
function lose(){
  if (state === 'lose') return;
  running = false; cancelAnimationFrame(raf);
  state = 'lose';
  shake = REDUCED ? 0 : 12; blip(220, 55, 0.5, 'sawtooth', 0.28);
  showOverlay('All gone …', 'Your crowd shrank to 0. Watch out for the red gates!', 'Again');
}

/* ---------- Update ---------- */
function update(dt){
  // Bewegung
  const mv = 2.4 * dt;
  if (drag != null) laneX = drag;
  else { if (keyL) laneX -= mv; if (keyR) laneX += mv; }
  laneX = Math.max(-1, Math.min(1, laneX));

  // Vortrieb (leicht beschleunigend)
  speed += dt * 0.25;
  traveled += speed * dt;

  // Events auflösen, die die Spielerebene erreichen
  for (const ev of events){
    if (ev.done) continue;
    const z = ev.dist - traveled;
    if (z <= PLAYER_Z){
      if (ev.kind === 'gate') resolveGate(ev);
      else if (ev.kind === 'obs') resolveObs(ev);
      else if (ev.kind === 'boss') resolveBoss();
    }
  }

  // sanft angezeigte Zahl angleichen
  shownCount += (count - shownCount) * Math.min(1, dt * 12);
  if (Math.abs(shownCount - count) < 0.5) shownCount = count;

  // Partikel / Floats / Ringe
  for (const p of particles){ p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.vx *= 0.98; p.life -= dt * 1.4; }
  particles = particles.filter(p => p.life > 0);
  for (const f of floats){ f.y -= 50 * dt; f.life -= dt * 0.9; }
  floats = floats.filter(f => f.life > 0);
  for (const r of rings){ r.r += 220 * dt; r.life -= dt * 1.6; }
  rings = rings.filter(r => r.life > 0);
  if (shake > 0) shake = Math.max(0, shake - dt * 30);
  if (flash > 0) flash = Math.max(0, flash - dt * 1.8);
  if (hitFlash > 0) hitFlash = Math.max(0, hitFlash - dt * 1.6);
}

/* ---------- Zeichnen ---------- */
function drawFigure(x, y, s, ph){
  const h = 52 * s, w = 15 * s;
  const swing = REDUCED ? 0 : Math.sin(t * 0.018 + ph);
  ctx.lineCap = 'round';
  // Beine
  ctx.strokeStyle = '#1f5f7a'; ctx.lineWidth = Math.max(1.4, 4.5 * s);
  ctx.beginPath(); ctx.moveTo(x, y - h*0.42); ctx.lineTo(x + swing*w*0.5, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - h*0.42); ctx.lineTo(x - swing*w*0.5, y); ctx.stroke();
  // Körper
  const bodyY = y - h*0.42;
  ctx.fillStyle = '#22d3ee';
  roundRect(x - w*0.5, bodyY - h*0.4, w, h*0.42, w*0.45); ctx.fill();
  // Arme
  ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = Math.max(1.2, 3.4*s);
  ctx.beginPath(); ctx.moveTo(x - w*0.4, bodyY - h*0.28); ctx.lineTo(x - w*0.7 - swing*w*0.4, bodyY - h*0.05); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w*0.4, bodyY - h*0.28); ctx.lineTo(x + w*0.7 + swing*w*0.4, bodyY - h*0.05); ctx.stroke();
  // Kopf
  ctx.fillStyle = '#d6f7ff';
  ctx.beginPath(); ctx.arc(x, bodyY - h*0.52, w*0.52, 0, 6.2832); ctx.fill();
}
function roundRect(x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.arcTo(x+w, y, x+w, y+h, r); ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r); ctx.arcTo(x, y, x+w, y, r); ctx.closePath();
}

function drawRoad(){
  // Himmel
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON + 40);
  sky.addColorStop(0, '#0b1024'); sky.addColorStop(1, '#16224a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, HORIZON + 40);
  // Horizont-Glow
  const glow = ctx.createRadialGradient(CX, HORIZON, 0, CX, HORIZON, 360);
  glow.addColorStop(0, 'rgba(34,211,238,.22)'); glow.addColorStop(1, 'rgba(34,211,238,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, HORIZON + 120);

  // Straße (Trapez)
  const nL = project(-1.15, 0), nR = project(1.15, 0), fL = project(-1.15, 7.5), fR = project(1.15, 7.5);
  const road = ctx.createLinearGradient(0, HORIZON, 0, GROUNDY);
  road.addColorStop(0, '#1a2140'); road.addColorStop(1, '#252e52');
  ctx.fillStyle = road;
  ctx.beginPath(); ctx.moveTo(nL.x, nL.y); ctx.lineTo(fL.x, fL.y); ctx.lineTo(fR.x, fR.y); ctx.lineTo(nR.x, nR.y); ctx.closePath(); ctx.fill();
  // Randkanten (neon)
  ctx.strokeStyle = 'rgba(93,255,180,.55)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(nL.x, nL.y); ctx.lineTo(fL.x, fL.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(nR.x, nR.y); ctx.lineTo(fR.x, fR.y); ctx.stroke();
  // bewegte Mittelstreifen
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  const start = Math.ceil(traveled / 2) * 2;
  for (let m = start; m < traveled + 26; m += 2){
    const z = m - traveled; if (z < 0.05) continue;
    const a = project(-0.05, z), b = project(0.05, z), a2 = project(-0.05, z + 0.9), b2 = project(0.05, z + 0.9);
    ctx.globalAlpha = Math.min(1, a.s * 2.2);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(a2.x, a2.y); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGate(ev, z){
  const half = 0.55;
  for (let side = 0; side < 2; side++){
    const op = ev.ops[side];
    const cxLane = side === 0 ? -half : half;
    const a = project(cxLane - 0.42, z), b = project(cxLane + 0.42, z);
    const topA = project(cxLane - 0.42, z); // same x; we lift on screen
    const good = opGood(op);
    const col = good ? '#5dffb4' : '#ff6b6b';
    const hgt = (a.y - HORIZON) * 0.62;     // Bogenhöhe in px, skaliert mit Tiefe
    // Pfosten
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, 9 * a.s); ctx.globalAlpha = Math.min(1, a.s * 2.4);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x, a.y - hgt); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x, b.y - hgt); ctx.stroke();
    // Querbalken
    ctx.beginPath(); ctx.moveTo(a.x, a.y - hgt); ctx.lineTo(b.x, b.y - hgt); ctx.stroke();
    // Füllung (Glas)
    ctx.globalAlpha = Math.min(0.5, a.s * 1.1);
    ctx.fillStyle = good ? 'rgba(93,255,180,.20)' : 'rgba(255,107,107,.20)';
    ctx.fillRect(a.x, a.y - hgt, b.x - a.x, hgt);
    ctx.globalAlpha = 1;
    // Label
    const fs = Math.max(11, 40 * a.s);
    ctx.font = `900 ${fs}px system-ui, sans-serif`;
    ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(opStr(op), (a.x + b.x) / 2, a.y - hgt / 2);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}
function drawObs(ev, z){
  const p = project(ev.laneX, z), s = p.s;
  const w = 120 * s, h = 90 * s;
  ctx.globalAlpha = Math.min(1, s * 2.4);
  // Warn-Block mit Zacken
  ctx.fillStyle = '#3a2230';
  roundRect(p.x - w/2, p.y - h, w, h, 6 * s); ctx.fill();
  ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = Math.max(1.5, 4*s); ctx.stroke();
  ctx.fillStyle = '#ff6b6b'; ctx.font = `900 ${Math.max(12,46*s)}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('⚠', p.x, p.y - h/2);
  ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.globalAlpha = 1;
}
function drawBoss(z){
  const p = project(0, z), s = p.s;
  const w = 360 * s, h = 280 * s;
  ctx.globalAlpha = Math.min(1, s * 2.2);
  // großer Gegner-Pulk als Wand
  ctx.fillStyle = 'rgba(255,107,107,.14)';
  roundRect(p.x - w/2, p.y - h, w, h, 14*s); ctx.fill();
  ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = Math.max(2, 6*s); ctx.stroke();
  // Boss-Figur
  ctx.fillStyle = '#ff6b6b';
  ctx.beginPath(); ctx.arc(p.x, p.y - h*0.62, 34*s, 0, 6.2832); ctx.fill();
  roundRect(p.x - 30*s, p.y - h*0.5, 60*s, 70*s, 16*s); ctx.fill();
  // Schwellenwert
  ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.max(14,52*s)}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('👹 ' + boss.thresh, p.x, p.y - h - 18*s);
  ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.globalAlpha = 1;
}

function drawCrowd(){
  const shown = Math.min(Math.round(shownCount), MAXFIG);
  for (let i = 0; i < shown; i++){
    const sl = slots[i];
    const p = project(laneX + sl.ox, PLAYER_Z + sl.oz);
    drawFigure(p.x, p.y, p.s, sl.ph);
  }
  // Zahl über dem Pulk
  const head = project(laneX, PLAYER_Z);
  const label = '👥 ' + Math.round(shownCount);
  ctx.font = '900 30px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.strokeText(label, head.x, head.y - 92);
  ctx.fillStyle = '#eafff7'; ctx.fillText(label, head.x, head.y - 92);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function draw(){
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (shake > 0){ ctx.save(); ctx.translate((Math.random()-0.5)*shake, (Math.random()-0.5)*shake); }

  drawRoad();

  // Events von hinten nach vorne
  const vis = events
    .map(ev => ({ ev, z: ev.dist - traveled }))
    .filter(o => !o.ev.done && o.z > PLAYER_Z - 0.05 && o.z < 8)
    .sort((a, b) => b.z - a.z);
  for (const o of vis){
    if (o.ev.kind === 'gate') drawGate(o.ev, o.z);
    else if (o.ev.kind === 'obs') drawObs(o.ev, o.z);
    else if (o.ev.kind === 'boss') drawBoss(o.z);
  }

  drawCrowd();

  // Ringe
  for (const r of rings){
    ctx.globalAlpha = r.life; ctx.strokeStyle = r.col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.2832); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Partikel
  for (const p of particles){
    ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Floats
  ctx.font = '900 34px system-ui, sans-serif'; ctx.textAlign = 'center';
  for (const f of floats){
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillStyle = f.col; ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';

  if (shake > 0) ctx.restore();

  // Vollbild-Flash
  if (flash > 0){ ctx.fillStyle = flashCol; ctx.globalAlpha = flash * 0.18; ctx.fillRect(0,0,W,H); ctx.globalAlpha = 1; }
  if (hitFlash > 0){ ctx.fillStyle = '#ff2a3a'; ctx.globalAlpha = hitFlash * 0.28; ctx.fillRect(0,0,W,H); ctx.globalAlpha = 1; }
}

/* ---------- HUD ---------- */
function syncHUD(){
  countEl.textContent = '👥 ' + Math.round(state==='run'?shownCount:count);
  const pct = Math.max(0, Math.min(100, Math.round(traveled / trackLen * 100)));
  stageEl.textContent = 'Distance: ' + pct + '%';
  bestEl.textContent = 'Best: ' + (best > 0 ? best : '—');
}

/* ---------- Loop ---------- */
function loop(now){
  const dt = Math.min(0.05, (now - last) / 1000) || 0.016; last = now;
  if (running){ update(dt); }
  t = now;
  draw(); syncHUD();
  if (running) raf = requestAnimationFrame(loop);
}

/* ---------- Overlay ---------- */
function showOverlay(title, text, again){
  ovTitle.textContent = title; ovText.textContent = text;
  if (again) ovAgain.textContent = again;
  ov.classList.add('show'); ov.setAttribute('aria-hidden', 'false');
}
function hideOverlay(){ ov.classList.remove('show'); ov.setAttribute('aria-hidden', 'true'); }

/* ---------- Mode ---------- */
function setMode(m){
  mode = m === 'hard' ? 'hard' : 'easy';
  localStorage.setItem('mg_mode', mode);
  btnEasy.classList.toggle('active', mode === 'easy');
  btnHard.classList.toggle('active', mode === 'hard');
  reset();
}

/* ---------- Eingaben ---------- */
btnStart.addEventListener('click', () => { btnStart.blur(); start(); });
btnRestart.addEventListener('click', () => { reset(); });
btnEasy.addEventListener('click', () => setMode('easy'));
btnHard.addEventListener('click', () => setMode('hard'));
ovAgain.addEventListener('click', () => { reset(); start(); });
ovClose.addEventListener('click', hideOverlay);
ov.addEventListener('click', (e) => { if (e.target === ov) hideOverlay(); });

window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA'){ e.preventDefault(); keyL = true; }
  else if (e.code === 'ArrowRight' || e.code === 'KeyD'){ e.preventDefault(); keyR = true; }
  else if (e.code === 'Space'){ e.preventDefault(); if (!running) start(); }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keyL = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keyR = false;
});

// Touch / Drag: Position absolut über die Canvasbreite
let pId = null;
c.addEventListener('pointerdown', (e) => {
  try{ c.setPointerCapture(e.pointerId); }catch(_){}
  pId = e.pointerId; setDrag(e);
  if (!running && state !== 'win' && state !== 'lose') start();
});
c.addEventListener('pointermove', (e) => { if (e.pointerId === pId) setDrag(e); });
c.addEventListener('pointerup', (e) => { if (e.pointerId === pId){ pId = null; drag = null; } });
c.addEventListener('pointercancel', () => { pId = null; drag = null; });
function setDrag(e){
  const r = c.getBoundingClientRect();
  const nx = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;   // -1 .. 1
  drag = Math.max(-1, Math.min(1, nx * 1.15));
}

/* ---------- Start ---------- */
btnEasy.classList.toggle('active', mode === 'easy');
btnHard.classList.toggle('active', mode === 'hard');
reset();

/* Debug-Hook */
window.__mg = {
  get state(){ return state; }, get count(){ return count; }, set count(v){ count = v; },
  get traveled(){ return traveled; }, set traveled(v){ traveled = v; },
  get boss(){ return boss; }, get events(){ return events; }, start, reset, applyOp,
  scene(n, tr, lx){ count = n; shownCount = n; traveled = tr; laneX = lx == null ? 0 : lx; t = 1000; draw(); },
  sim(steps, lane){ if (speed <= 0) speed = 6.4; running = false; if (lane != null){ drag = lane; } for (let i = 0; i < steps; i++){ update(0.05); if (state === 'win' || state === 'lose') break; } draw(); syncHUD(); return { state, count, traveled: Math.round(traveled*10)/10, bossThresh: boss && boss.thresh }; }
};
})();
