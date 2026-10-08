import { clamp, lim, pick, rf, rnd } from '../game/util.js';
import { FURN, LEVELS } from '../game/catalog.js';
import { blobById, fvarOf, isForm, learned, state, unplaceF, world } from '../game/state.js';
import { bodyOf, note } from '../game/evolution.js';
import { save, saveSoon } from '../game/save.js';
import { addCoins, chat, say, sfx, toast } from '../game/texts.js';
import { budgetXp, gainXp } from '../game/bond.js';
import { fulfill, mission, wishProgress } from '../game/wishes.js';
import { closeSheet, openSheet, tool } from '../legacy/interface.js';
import { curRoom } from '../legacy/shop.js';
import {
  FLOOR, G, H, R, W, awake, ball, burst, cv, ev, fit, floatText, floorFood, flower, pet, petVisible,
  setDragFood, setExpr, setFlower, setLastTouch, squish
} from './scene.js';
import { evTap, openGift, stormCalm } from './events.js';
import { fName, fposPx, furnBox, hasFurn } from '../draw/furniture.js';
import { focusBlob, guests } from './guests.js';
import { HOOP } from './hoop.js';
import { blobR } from '../draw/pet.js';

/* ---------- puntatore: carezze, lanci, gesti ---------- */
const ptr = {down:false};
let tapCount = 0, tapT = 0;
function toCanvas(e){ const r = cv.getBoundingClientRect(); return {x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height}; }
const hitPet = p => petVisible() || (state && state.stage === 'egg') ? Math.hypot(p.x - pet.x, (p.y - pet.y) * 1.1) < R * 1.1 : false;
const hitBall = p => hasFurn('palla') && Math.hypot(p.x - ball.x, p.y - ball.y) < ball.r * 2;
let editMode = false, dragF = null;
function furnHit(p){
  const r = curRoom(); if (!r) return null;
  for (let i = r.furnOn.length - 1; i >= 0; i--){ const id = r.furnOn[i]; if (!FURN[id]) continue; const q = furnBox(id);
    if (Math.abs(p.x - q.x) < q.w/2 + 8 && Math.abs(p.y - q.y) < q.S/2 + 8) return id; }
  return null;
}
function endPointer(e){
  if (editMode){
    if (dragF){
      const id = dragF.id, tapd = dragF.moved < 8; dragF = null; if (id === 'palla'){ ball.held = false; ball.ground = false; } save();
      if (tapd){ const r0 = curRoom(), v0 = fvarOf(r0, id);
        openSheet(fName(id, v0), `<p class="shopnote">${FURN[id].d}</p><div class="sheet-actions"><button class="btn ghost" id="fRemove" type="button">Togli dalla stanza</button>${id === 'palla' || id === 'canestro' ? '' : `<button class="btn ghost" id="fFlip" type="button">↔ Specchia</button>`}<button class="btn" data-close type="button">Fatto</button></div>`,
        b => { b.querySelector('#fRemove').onclick = () => { unplaceF(curRoom(), id); save(); closeSheet(); toast(`${fName(id, v0)} messo in soffitta`); };
          const fl = b.querySelector('#fFlip'); if (fl) fl.onclick = () => { const r = curRoom(); if (!r.fflip) r.fflip = {}; r.fflip[id] = !r.fflip[id]; save(); }; }); }
    }
    return;
  }
  if (!ptr.down) return;
  clearTimeout(ptr.holdT);
  const now = performance.now();
  const sm = ptr.samples.filter(s => now - s.t < 120);
  const a = sm[0] || ptr.samples[0], b = ptr.samples[ptr.samples.length - 1];
  const dt = Math.max(.016, (b.t - a.t) / 1000);
  const vel = {x: (b.x - a.x) / dt, y: (b.y - a.y) / dt};
  ptr.down = false;
  if (ptr.mode === 'grab'){ release(vel); }
  else if (ptr.mode === 'ball'){ ball.held = false; ball.by = 'you'; ball.vx = lim(vel.x, -2600, 2600); ball.vy = lim(vel.y, -2600, 2600); if (Math.hypot(vel.x, vel.y) > 400) wishProgress('ball', 1, 3); }
  else if (ptr.mode !== 'sponge'){
    const dur = now - ptr.t0, dist = Math.hypot(ptr.x - ptr.sx, ptr.y - ptr.sy);
    if (Math.abs(ptr.angle) > 5.3 && dur < 2500 && awake()) gesture('spin');
    else if (dur < 320 && dist < 14) tap({x:ptr.x, y:ptr.y});
    else if (ptr.onPet && dur < 450 && dist > 55 && awake()){
      const dx = ptr.x - ptr.sx, dy = ptr.y - ptr.sy;
      if (-dy > Math.abs(dx) * 1.2) gesture('jump');
      else if (Math.abs(dx) > Math.abs(dy) * 1.3) gesture('roll', Math.sign(dx));
    }
  }
  ptr.mode = null;
  if (pet.expr === 'love' || pet.expr === 'laugh') setExpr(pet.expr, .5);
  saveSoon();
}

function rub(seg, speed){
  const s = state;
  if (s.stage === 'egg'){ ptr.rub += seg; if (ptr.rub > 80){ ptr.rub = 0; burst('heart', 1); pet.wob = 1; s.hatchAt -= 1500; sfx.purr(); } return; }
  ptr.rub += seg; ptr.rubWish += seg;
  const tick = speed > 1300 ? 70 : 95;
  if (ptr.rub < tick) return;
  ptr.rub = 0;
  if (s.sleeping){ burst('heart', 1); if (Math.random() < .3) chat('Sorride nel sonno…', 1); return; }
  if (speed > 1300){
    pet.tickle += .12;
    setExpr('laugh', .6); s.fun = clamp(s.fun + .9); burst('note', 1); if (Math.random() < .5) sfx.giggle();
    mission('tickle'); wishProgress('tickle', 1, 8); note('tickle');
    if (ev && ev.type === 'storm') ev.calm += seg * 2;
    pet.wob = 1; squish(.15);
    if (pet.tickle > 3.2){
      pet.tickle = 0; ptr.mode = 'done'; say(pick(['Basta solletico! Hihihi','Ahah, non respiro più!']), 2000);
      pet.vx = (Math.random() < .5 ? -1 : 1) * R * 6; pet.vy = -H * 1.1; pet.ground = false; sfx.boing();
    }
    budgetXp(1);
  } else {
    setExpr(s.trust < 35 ? 'shy' : 'love', .8);
    s.trust = clamp(s.trust + (s.trust < 35 ? 1.2 : .6)); s.fun = clamp(s.fun + .35);
    burst('heart', 1); if (Math.random() < .35) sfx.purr();
    budgetXp(1); mission('pets'); note('pet');
    if (ev && ev.type === 'storm'){ ev.calm += 95; if (ev.calm > 600) stormCalm(); }
    if (s.trust < 35) chat(`${s.name} all'inizio si irrigidisce… poi si lascia andare.`, .6);
    else chat(pick(['Prrr…','Che bello…','Ancora!','Mmmh ♡']), .25);
  }
  if (s.wish && s.wish.type === 'cuddle' && ptr.rubWish > 500){ ptr.rubWish = 0; fulfill('cuddle'); }
}
function scrub(seg){
  const s = state; if (s.hygiene >= 100 && !(s.wish && s.wish.type === 'bath')){ if (Math.random() < .05) chat('È già pulitissimo!', 1); return; }
  ptr.scrub += seg;
  const was = s.hygiene;
  s.hygiene = clamp(s.hygiene + seg * .085);
  if (ptr.scrub > 30){ ptr.scrub = 0; burst('bubble', 2, ptr.x, ptr.y); if (Math.random() < .25) sfx.pop(); setExpr('love', .6); pet.wob = .6; }
  if (was < 100 && s.hygiene >= 100){
    say('Pulitissimo! Profuma di sapone.', 2200); burst('sparkle', 12); sfx.giggle(); budgetXp(3); note('clean', 3);
    fulfill('bath');
  }
}
function startGrab(){
  const s = state;
  if (s.sleeping){ say(`Lascialo dormire…`); return; }
  if (s.energy < 10){ say(`${s.name} è troppo stanco per volare.`); return; }
  ptr.mode = 'grab'; pet.held = true; pet.ground = false; pet.hx = ptr.x; pet.hy = ptr.y; pet.beh = null; pet.anim = null;
  setExpr('wee', 99); sfx.wee();
  if (s.trust < 35){ say('Mettimi giù!'); s.trust = clamp(s.trust - 1); setExpr('shy', 99); }
  else chat(pick(['Wiii!','Dove andiamo?','Più in alto!']), .7);
}
function release(vel){
  pet.held = false;
  pet.vx = lim(vel.x, -2400, 2400); pet.vy = lim(vel.y, -2600, 2600);
  if (isForm('razzo')){ pet.vx *= 1.4; pet.vy *= 1.5; sfx.wee(); }
  if (bodyOf(state) === 'obeso'){ pet.vx *= .75; pet.vy *= .78; }
  note('throw');
  pet.vr = lim(pet.vx / (R * 4), -12, 12);
  pet.airFrom = pet.y; pet.airStart = performance.now();
  const now = Date.now(); pet.throws = pet.throws.filter(t => now - t < 30000); pet.throws.push(now);
  if (pet.vy < -900) fulfill('throw');
  if (Math.hypot(pet.vx, pet.vy) < 200) setExpr(null, 0);
}
function tap(p){
  const s = state;
  // eventi e oggetti prima del blob
  if (ev && evTap(p)) return;
  if (pet.beh && pet.beh.type === 'hide' && pet.beh.in && hasFurn('tenda')){ const tp = fposPx('tenda'); if (Math.abs(p.x - tp.x) < tp.w*.5 && Math.abs(p.y - tp.y) < tp.S*.5){
    pet.beh = null; s.fun = clamp(s.fun + 3); budgetXp(1); sfx.giggle(); burst('heart', 6); pet.vy = -H * .9; pet.ground = false; say(pick(['Trovato!','Uffa, mi hai visto!','Bubu settete!']), 1600); return; } }
  if (flower && Math.hypot(p.x - flower.x, p.y - (FLOOR - R*.25)) < R*.55){ const c = rnd(2, 3); addCoins(c); floatText('+' + c, flower.x, FLOOR - R*.6); sfx.coin(); burst('sparkle', 8, flower.x, FLOOR - R*.3); setFlower(null); budgetXp(1); saveSoon(); return; }
  if (s.gift && Math.hypot(p.x - s.gift.x * W, p.y - (FLOOR - R * .3)) < R * .5){ openGift(); return; }
  for (let i = 0; i < s.messes.length; i++){
    const m = s.messes[i], mx = m.type === 'pot' ? W * .83 : m.x * W, my = m.type === 'pot' ? FLOOR - R * .15 : H * .6;
    if (Math.hypot(p.x - mx, p.y - my) < R * .6){ s.messes.splice(i, 1); burst('sparkle', 10, mx, my); sfx.pop(); gainXp(3); mission('clean'); note('clean', 2); say(m.type === 'pot' ? 'Pianta rimessa a posto!' : 'Muro pulito!'); if (awake()) setExpr('shy', 1.5); save(); return; }
  }
  if (!s.walk) for (let i = 0; i < s.poops; i++){
    const px = W * (.2 + i * .1), py = FLOOR + H * .03;
    if (Math.hypot(p.x - px, p.y - py) < Math.max(26, R * .45)){
      s.poops--; s.hygiene = clamp(s.hygiene + 6); burst('sparkle', 8, px, py); sfx.pop(); gainXp(2); mission('clean'); note('clean', 2); floatText('Pulito!', px, py - 20, '#2fb585');
      if (s.wish && s.wish.type === 'bath' && s.hygiene >= 100) fulfill('bath');
      save(); return;
    }
  }
  for (const g of guests){ const gb = blobById(g.id); if (!gb || g.leaving) continue; if (Math.hypot(p.x - g.x, p.y - g.y) < blobR(gb) * 1.05){ focusBlob(g.id); return; } }
  if (hitPet(p)){
    if (s.stage === 'egg'){ pet.wob = 1; sfx.boing(); say(pick(['Toc toc!','Qualcosa si muove là dentro…','Crrr…'])); return; }
    squish(.35); sfx.boing();
    tapCount++; clearTimeout(tapT);
    tapT = setTimeout(() => { const n = tapCount; tapCount = 0; resolveTaps(n); }, 280);
    return;
  }
  if (hitBall(p) && petVisible()){ ball.by = 'you'; ball.vx = (ball.x - p.x) * 20 + rf(-200, 200); ball.vy = -rf(400, 700); ball.ground = false; sfx.pop(); return; }
  // tocco sul pavimento: viene lì
  if (awake() && pet.ground && p.y > H * .55){
    pet.beh = {type:'come', tx: lim(p.x, R, W - R), until: Date.now() + 5000};
    floatText('•', p.x, p.y, '#ff6fae');
    chat(pick(['Arrivo!','Eccomi!']), .5);
  }
}
function resolveTaps(n){
  const s = state; if (!petVisible()) return;
  if (s.sleeping){ say('Zzz…'); return; }
  if (n >= 3 && learned('dance')){ doTrick('dance'); return; }
  if (n >= 2 && learned('wave')){ doTrick('wave'); return; }
  pet.look = null;
  if (s.trust < 35){ say(`${s.name} fa un passo indietro.`); setExpr('shy', 1.2); pet.vx = R * 2; return; }
  if (s.sick){ say('Non mi sento tanto bene…'); return; }
  setExpr('happy', .8); burst('heart', 1);
  chat(pick(['Hihi!','Ehi, sei tu!','Pio pio!','Che si fa oggi?','Boing!']), .8);
}
function gesture(tr, dir){
  if (!learned(tr)){
    if (tr === 'jump'){ pet.vy = -H * 1.1; pet.ground = false; sfx.boing(); chat('Hop!', .6); }
    else { const L = LEVELS.findIndex(l => l.trick === tr); chat(`Non sa ancora farlo. Lo impara al livello ${L + 1}!`, 1); }
    return;
  }
  doTrick(tr, dir);
}
function doTrick(tr, dir, self){
  const s = state; if (!awake() || pet.held) return;
  if (s.energy < 8){ if (!self) say('Troppo stanco per i trucchi…'); return; }
  pet.beh = null; s.fun = clamp(s.fun + 2); s.energy = clamp(s.energy - .5);
  if (!self){ s.tricksDone++; budgetXp(2); mission('tricks'); mission('trickVar', 1, tr); note('trick'); }
  if (tr === 'wave'){ pet.anim = {type:'wave', t:0, dur:1.6}; say('Ciao ciao!', 1500); sfx.giggle(); }
  else if (tr === 'jump'){ pet.ground = false; pet.vy = -Math.sqrt(2 * G() * H * .5); pet.vr = (2 * Math.PI) / (2 * -pet.vy / G()) * (pet.dir || 1); pet.anim = {type:'flip', t:0, dur:9}; sfx.wee(); setExpr('wee', 1.2); }
  else if (tr === 'spin'){ pet.anim = {type:'spin', t:0, dur:.9}; sfx.wee(); setExpr('happy', 1.2); }
  else if (tr === 'dance'){ pet.anim = {type:'dance', t:0, dur:3.6}; setExpr('happy', 3.6); say('♪ Balliamo! ♪', 2000); }
  else if (tr === 'roll'){ pet.anim = {type:'roll', t:0, dur:1.1, dir: dir || pet.dir || 1}; sfx.boing(); setExpr('wee', 1.1); }
  burst('sparkle', 6);
  if (!self && s.wish && s.wish.type === 'trick' && s.wish.target === tr) fulfill('trick', tr);
}

/* collegamenti da fare all'avvio: li chiama boot.js, quando tutti i moduli sono già caricati */
export function initPointer(){
  cv.addEventListener('pointerdown', e => {
    if (editMode && world && fit()){
      e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch {}
      const p = toCanvas(e), id = furnHit(p);
      if (id){ const q = id === 'canestro' ? HOOP() : furnBox(id); dragF = {id, ox: q.x - p.x, oy: q.y - p.y, moved: 0, lx: p.x, ly: p.y}; if (id === 'palla') ball.held = true; }
      return;
    }
    if (!state || !fit()) return;
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch {}
    const p = toCanvas(e), now = performance.now();
    // riprendi il cibo lasciato per terra
    { let best = null, bd = R * .55;
      for (const f of floorFood){ const d = Math.hypot(p.x - f.x, p.y - (f.y - R * .15)); if (d < bd){ bd = d; best = f; } }
      if (best){ floorFood.splice(floorFood.indexOf(best), 1); setDragFood({id: best.id, x: p.x, y: p.y, paid: true}); setLastTouch(Date.now()); try { cv.releasePointerCapture(e.pointerId); } catch {} return; } }
    setLastTouch(Date.now());
    Object.assign(ptr, {down:true, sx:p.x, sy:p.y, x:p.x, y:p.y, t0:now, moved:0, mode:null, onPet:hitPet(p), onBall:hitBall(p),
      angle:0, lastAng:null, samples:[{x:p.x, y:p.y, t:now}], rub:0, rubWish:0, scrub:0});
    if (tool === 'sponge') ptr.mode = 'sponge';
    else if (ptr.onBall && !ptr.onPet && petVisible()){
      if (!ball.ground && ball.y < FLOOR - ball.r * 3) mission('catchBall');
      ptr.mode = 'ball'; ball.held = true; ball.ground = false;
    }
    else if (ptr.onPet && petVisible()){
      clearTimeout(ptr.holdT);
      ptr.holdT = setTimeout(() => { if (ptr.down && ptr.moved < 12 && !ptr.mode) startGrab(); }, 300);
    }
  });
  cv.addEventListener('pointermove', e => {
    if (editMode){
      if (!dragF) return;
      const p = toCanvas(e), F = FURN[dragF.id], r = curRoom();
      dragF.moved += Math.hypot(p.x - dragF.lx, p.y - dragF.ly); dragF.lx = p.x; dragF.ly = p.y;
      if (dragF.id === 'palla'){ ball.x = lim(p.x + dragF.ox, ball.r, W - ball.r); ball.y = lim(p.y + dragF.oy, ball.r, FLOOR - ball.r); ball.vx = ball.vy = 0; return; }
      const nx = lim((p.x + dragF.ox) / W, .04, .96);
      if (dragF.id === 'canestro'){ r.fpos.canestro = {x: lim(nx, .15, .85), y: lim((p.y + dragF.oy) / H, .2, .6)}; return; }
      r.fpos[dragF.id] = F.kind === 'wall' ? {x: nx, y: lim((p.y + dragF.oy) / H, .06, .66)} : {x: nx, y: F.y};
      return;
    }
    if (!ptr.down) return;
    const p = toCanvas(e), now = performance.now();
    const seg = Math.hypot(p.x - ptr.x, p.y - ptr.y);
    ptr.moved += seg; ptr.x = p.x; ptr.y = p.y;
    ptr.samples.push({x:p.x, y:p.y, t:now}); if (ptr.samples.length > 8) ptr.samples.shift();
    if (petVisible()){
      const d = Math.hypot(p.x - pet.x, p.y - pet.y);
      if (d > R * .5 && d < R * 3.2){
        const a = Math.atan2(p.y - pet.y, p.x - pet.x);
        if (ptr.lastAng !== null){ let da = a - ptr.lastAng; if (da > Math.PI) da -= 2*Math.PI; if (da < -Math.PI) da += 2*Math.PI; ptr.angle += da; }
        ptr.lastAng = a;
      }
    }
    if (ptr.mode === 'grab'){ pet.hx = p.x; pet.hy = p.y; return; }
    if (ptr.mode === 'ball'){ ball.x = lim(p.x, ball.r, W - ball.r); ball.y = lim(p.y, ball.r, FLOOR - ball.r); return; }
    if (ptr.mode === 'sponge'){ if (hitPet(p) && petVisible()) scrub(seg); return; }
    if (ptr.onPet && ptr.moved > 12 && !ptr.mode){ clearTimeout(ptr.holdT); ptr.mode = 'rub'; }
    if (ptr.mode === 'rub' && hitPet(p)){
      const sm = ptr.samples, a = sm[0], b = sm[sm.length - 1];
      let path = 0; for (let i = 1; i < sm.length; i++) path += Math.hypot(sm[i].x - sm[i-1].x, sm[i].y - sm[i-1].y);
      const speed = path / Math.max(.016, (b.t - a.t) / 1000);
      rub(seg, speed);
    }
  });
  cv.addEventListener('pointerup', endPointer);
  cv.addEventListener('pointercancel', endPointer);
  cv.addEventListener('contextmenu', e => e.preventDefault());
}

// gli altri moduli non possono riassegnare una variabile importata: la cambiano con questi
export function setEditMode(v){ editMode = v; }
export function setDragF(v){ dragF = v; }

export { doTrick, editMode, ptr };
