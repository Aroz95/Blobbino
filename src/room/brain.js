import { clamp, lim, pick, rf, rnd } from '../game/util.js';
import { FOODS, LEVELS } from '../game/catalog.js';
import { blobById, isForm, log, nm, perk, presentIn, setState, state, view, world } from '../game/state.js';
import { bodyOf, note } from '../game/evolution.js';
import {
  activeRoom, applyMove, pendingLeave, setPendingLeave, setPresentKey, socialFx
} from '../game/house.js';
import { save, saveSoon } from '../game/save.js';
import { addCoins, chat, say, sfx, toast, tone } from '../game/texts.js';
import { budgetXp } from '../game/bond.js';
import { DM, idleLine, mission, setWelcome, welcome, wishProgress } from '../game/wishes.js';
import { render, setDiaryKey, setTrayKey } from '../legacy/interface.js';
import {
  FLOOR, G, H, R, W, awake, ball, burst, ev, floatText, floorFood, geo, groundY, lastTouch, pet,
  setExpr, setFallingPot, squish
} from './scene.js';
import { doTrick } from './pointer.js';
import { eat } from './food.js';
import { WIN, evTarget, isNight } from './events.js';
import { fposPx, hasFurn } from '../draw/furniture.js';
import { guests, setGuests } from './guests.js';
import { HOOP, hoopCoins, lastHoopRefill, setHoopCoins, setLastHoopRefill } from './hoop.js';
import { blobR } from '../draw/pet.js';

/* ---------- cervello del blob ---------- */
function choose(){
  const s = state, now = Date.now(), opts = [];
  const dm = DM();
  const add = (b, w) => { if (dm && dm.beh[b.type]) w *= dm.beh[b.type]; if (w > 0) opts.push([b, w]); };
  if (welcome){ setWelcome(false); return {type:'welcome', until: now + 4000}; }
  const ff = floorFood.find(f => f.y >= FLOOR - 30 && (FOODS[f.id].drink ? s.thirst < 92 : s.hunger < 92) && f.id !== s.traits.hateFood);
  if (ff) return {type:'eatFloor', food:ff, until: now + 8000};
  if (ev){
    const T = ev.type;
    if (['butterfly','bubbles','starRain','balloon','mouse'].includes(T)) return {type:'chaseEv', until: now + 3000};
    if (T === 'glint') return {type:'dig', until: now + 6000};
    if (T === 'visitor') return {type:'greet', until: now + 5000};
    if (T === 'star' || T === 'rainbow' || T === 'bird') return {type:'window', until: now + 4000};
    if (((T === 'ghost' && !isForm('ombra')) || T === 'storm') && !ev.done) return {type:'scared', until: now + 3000};
    if (T === 'letter') return {type:'come', tx: lim(ev.x + R * 1.3, R, W - R), until: now + 3000};
  }
  if (s.distrust) add({type:'sulk', tx: W * .85}, 4);
  const hasBall = hasFurn('palla'), ballMoving = hasBall && Math.hypot(ball.vx, ball.vy) > 60;
  if (ballMoving && !ball.held) add({type:'ball'}, 8);
  if (hasBall && perk('fetch') && !ballMoving && !ball.held && Math.abs(ball.x - W * .5) > W * .22) add({type:'fetch'}, 3);
  add({type:'wander', tx: rf(R, W - R)}, 3);
  add({type:'look'}, 2);
  add({type:'idle'}, 1.5);
  add({type:'window'}, 1);
  if (hasBall) add({type:'ball'}, 1.2);
  if (s.energy < 30) add({type:'yawn'}, 3);
  if (s.poops > 0) add({type:'stinky'}, 2);
  if (now - lastTouch > 30000 && s.trust > 45) add({type:'attention'}, 3);
  if (s.furnOn.includes('orso')) add({type:'bear'}, 1.2);
  if (guests.some(g => !g.leaving)) add({type:'social'}, 3);
  if (hasFurn('trampolino')) add({type:'tramp'}, 2.2);
  if (hasFurn('tenda')) add({type:'hide'}, 1.3);
  if (hasFurn('piscina')) add({type:'pit'}, 1.6);
  if (hasFurn('cuscino')) add({type:'sit'}, 1.2);
  if (hasFurn('specchio')) add({type:'mirror'}, 1);
  if (hasFurn('acquario')) add({type:'fish'}, 1);
  if (hasFurn('cactus')) add({type:'ouch'}, .7);
  if (hasFurn('letto') && s.energy < 40) add({type:'nap'}, 2.5);
  if (s.furnOn.includes('radio')) add({type:'radio'}, 1.2);
  if (s.furnOn.includes('pianta')) add({type:'sniff'}, 1);
  if (s.furnOn.includes('quadro')) add({type:'art'}, .8);
  add({type:'hiccup'}, .5);
  if (hasBall && hasFurn('canestro')) add({type:'shoot'}, (!ball.held && Math.hypot(ball.vx, ball.vy) < 30 ? 1.4 : 0) * (isForm('pallino') ? 5 : 1));
  if (isForm('saltimbanco')) add({type:'show'}, 3);
  add({type:'sing'}, .9);
  add({type:'tail'}, .6);
  if (s.tricksDone > 0 && LEVELS.slice(0, s.level).some(l => l.trick)) add({type:'mimic'}, .8);
  if (s.messes.length < 2 && s.stage !== 'baby' || (s.messes.length < 2 && Math.random() < .5)) add({type:'mischief'}, s.fun < 45 ? 2.5 : .5);
  let tot = opts.reduce((a, o) => a + o[1], 0), r = Math.random() * tot;
  for (const [b, w] of opts){ if ((r -= w) <= 0) return Object.assign({until: now + rnd(3000, 6000)}, b); }
  return {type:'idle', until: now + 2000};
}
function walkTo(tx, dt, speedMul = 1){
  const dx = tx - pet.x;
  if (Math.abs(dx) < 4){ pet.hop = 0; return true; }
  pet.dir = Math.sign(dx);
  const bo = bodyOf(state), sp = R * 2.4 * speedMul * (state.energy < 25 ? .6 : 1) * (bo === 'obeso' ? .65 : bo === 'magro' ? .85 : 1);
  pet.x += Math.sign(dx) * Math.min(Math.abs(dx), sp * dt);
  pet.hop += dt * 9;
  return false;
}
function brain(dt){
  const s = state, now = Date.now();
  if (s.sleeping){ pet.beh = {type:'sleep'}; walkTo(W * .56, dt, .5); return; }
  if (!pet.beh || pet.beh.type === 'sleep' || (pet.beh.until && now > pet.beh.until) || pet.beh.done) pet.beh = choose();
  const b = pet.beh;
  b.t = (b.t || 0) + dt;
  switch (b.type){
    case 'enter': if (walkTo(W * .5, dt)){ setExpr('happy', 1.5); chat(state.visit ? pick(['Permesso! Si può?', 'Eccomi qua!']) : 'Sono a casa!', 1); b.done = true; } break;
    case 'leave':
      pet.look = null; walkTo(W + R * 1.6, dt, 1.2);
      if (pet.x > W + R * 1.1){ const pl = pendingLeave, raw = blobById(state.id); setPendingLeave(null);
        if (pl && raw){ applyMove(raw, pl.to, pl.isVisit); toast(`${nm(raw)} è andato in ${world.rooms[pl.to].name}`); }
        setState(null); const pres = presentIn(activeRoom); if (pres.length){ const nb = pres[0], g = guests.find(x => x.id === nb.id); setState(view(nb)); geo();
          if (g){ Object.assign(pet, {x: g.x, ground:true, vx:0, vy:0, beh:null, anim:null}); setGuests(guests.filter(x => x !== g)); } else { pet.x = W * .5; pet.beh = null; } pet.y = groundY(); }
        setPresentKey(''); setTrayKey(''); setDiaryKey(''); render(true); }
      break;
    case 'social': {
      const g = guests.find(x => !x.leaving && blobById(x.id) && blobById(x.id).stage !== 'egg' && !blobById(x.id).sleeping);
      if (!g){ b.done = true; break; }
      const gb = blobById(g.id), rg = blobR(gb);
      if (walkTo(lim(g.x + (pet.x < g.x ? -1 : 1) * (R + rg) * .8, R, W - R), dt, 1.2)){
        pet.look = {x: g.x, y: g.y}; g.look = {x: pet.x, y: pet.y};
        if (!b.act){ b.act = pick(['hug', 'jump', 'talk']); b.until = Date.now() + 2600;
          if (b.act === 'hug'){ setExpr('love', 2.5); g.expr = 'love'; g.exprUntil = performance.now() + 2500; burst('heart', 6, (g.x + pet.x) / 2, pet.y - R * .3); sfx.purr(); chat(pick([`Ti voglio bene, ${gb.name}!`, `Abbraccio per ${gb.name}!`]), .8); }
          else if (b.act === 'jump'){ pet.vy = -H * .9; pet.ground = false; if (g.ground){ g.vy = -H * .9; g.ground = false; } sfx.boing(); chat('Salto insieme!', .7); }
          else { chat(pick([`${gb.name}, giochiamo?`, `Sai che ${gb.name} è simpaticissimo?`, `Ehi ${gb.name}!`]), .9); g.bub = {t: pick(['Sì!', 'Ok!', 'Hihi!', '♡']), until: Date.now() + 1500}; }
          socialFx(blobById(state.id), gb); } }
      break; }
    case 'welcome':
      if (walkTo(W * .5, dt, 1.4) && !b.jumped){ b.jumped = true; pet.vy = -H * 1.2; pet.ground = false; sfx.boing(); setExpr('happy', 2); say(`${s.name} è felicissimo di rivederti!`, 2400); burst('heart', 8); }
      break;
    case 'come': if (walkTo(b.tx, dt, 1.3)){ setExpr('happy', .8); pet.look = null; b.done = true; } break;
    case 'wander': pet.look = null; if (walkTo(b.tx, dt)) b.type = 'idle'; break;
    case 'idle': pet.hop = 0; if (!b.said && b.t > 1){ b.said = true; chat(idleLine(), .25); } break;
    case 'look': pet.hop = 0; pet.look = null; if (b.t > .2 && !b.said){ b.said = true; chat(idleLine(), .5); } break;
    case 'window': {
      const w = WIN();
      if (walkTo(w.x + w.w * .5, dt)){ pet.look = {x: w.x + w.w/2, y: w.y}; if (!b.said){ b.said = true; chat(isNight() ? pick(['Quante stelle…','La luna!']) : pick(['Che bel sole!','Una nuvola a forma di torta!']), .6); } }
      break; }
    case 'ball': case 'fetch': {
      pet.look = {x: ball.x, y: ball.y};
      const tx = b.type === 'fetch' ? ball.x + (ball.x > W/2 ? 1 : -1) * (R + ball.r) * .9 : ball.x - Math.sign(ball.x - pet.x || 1) * (R * .8);
      walkTo(tx, dt, 1.5);
      if (Math.abs(ball.x - pet.x) < R + ball.r && ball.y > FLOOR - ball.r * 3 && !ball.held && pet.ground){
        const toCenter = Math.sign(W/2 - ball.x) || 1;
        const dirK = b.type === 'fetch' ? toCenter : (Math.sign(ball.x - pet.x) || 1);
        ball.vx = dirK * (b.type === 'fetch' ? rf(160, 260) : rf(320, 620)); ball.vy = -(b.type === 'fetch' ? rf(80, 160) : rf(250, 520)); ball.ground = false;
        sfx.pop(); squish(.2); budgetXp(1); s.fun = clamp(s.fun + 1); ball.by = 'blob';
        b.kicks = (b.kicks || 0) + 1; mission('kicks'); note('ball', .5);
        if (state.wish && state.wish.type === 'ball') wishProgress('ball', 1, 3);
        if (b.type === 'fetch' && Math.abs(ball.x - W/2) < W * .2){ b.done = true; chat('Eccola!', 1); if (Math.random() < .25){ addCoins(1); floatText('+1', pet.x, pet.y - R); sfx.coin(); } }
        if (b.type === 'ball' && b.kicks > 2) b.done = true;
      }
      break; }
    case 'chaseEv': {
      if (!ev){ b.done = true; break; }
      const tg = evTarget(); if (!tg){ b.done = true; break; }
      pet.look = tg;
      walkTo(lim(tg.x, R, W - R), dt, ev.type === 'mouse' ? 1.9 : 1.6);
      if (ev.type !== 'mouse' && Math.abs(tg.x - pet.x) < R && pet.ground && tg.y < pet.y - R && Math.random() < dt * 1.5){ pet.vy = -H * rf(1.1, 1.6); pet.ground = false; sfx.boing(); }
      break; }
    case 'scared': {
      if (!ev || ev.done){ b.done = true; break; }
      const tx = ev.type === 'ghost' ? (ev.x < W / 2 ? W - R * 1.2 : R * 1.2) : W * .5;
      walkTo(tx, dt, 1.4); setExpr('shy', .3); pet.wob = Math.max(pet.wob, .5);
      if (ev.type === 'ghost') pet.look = {x: ev.x, y: ev.y};
      if (!b.said){ b.said = 1; chat(pick(['Ho paura!','Aiuto!','Mamma mia…']), 1); }
      break; }
    case 'dig':
      if (!ev){ b.done = true; break; }
      pet.look = {x: ev.x, y: FLOOR};
      if (walkTo(ev.x - R * .9, dt)){ pet.wob = .5; if (!b.said){ b.said = true; chat('Scava scava…', 1); } }
      break;
    case 'greet':
      if (!ev){ b.done = true; break; }
      pet.look = {x: ev.x, y: groundY()};
      if (walkTo(ev.x - R * 2.3, dt) && pet.ground && Math.random() < dt * 1.2){ pet.vy = -H * .8; pet.ground = false; }
      break;
    case 'sulk': pet.look = {x: W, y: pet.y}; walkTo(b.tx, dt, .7); break;
    case 'yawn': pet.hop = 0; setExpr('tired', .5); if (!b.said){ b.said = true; chat('Ahhh… che sonno', .8); } break;
    case 'stinky': {
      const px = W * .2;
      if (walkTo(px + R * 1.4, dt)){ setExpr('yuck', .5); pet.look = {x: px, y: FLOOR}; if (!b.said){ b.said = true; chat('Puzza! Puliamo?', 1); } }
      break; }
    case 'attention':
      if (walkTo(W * .5, dt, 1.2)){ pet.look = null; if (!b.j){ b.j = 1; say(pick(['Giochiamo?','Ehi! Ci sei?','Coccole?']), 2000); }
        if (pet.ground && b.t % 1.2 < dt){ pet.vy = -H * .7; pet.ground = false; sfx.boing(); } }
      break;
    case 'bear': { const F = fposPx('orso'); if (walkTo(F.x + R * 1.1, dt)){ pet.look = {x: F.x, y: F.y}; setExpr('love', .5); if (Math.random() < dt * 2) burst('heart', 1); if (!b.said){ b.said = true; chat('Orsetto mio!', .7); } } break; }
    case 'radio': { const F = fposPx('radio'); if (walkTo(F.x - R * 1.4, dt)){ if (!pet.anim) pet.anim = {type:'dance', t:0, dur:3, quiet:true}; b.until = Math.min(b.until, now + 3000); } break; }
    case 'sniff': { const F = fposPx('pianta'); if (walkTo(F.x - R * 1.3, dt) && !b.s){ b.s = 1; setTimeout(() => { if (!awake()) return; sfx.sneeze(); squish(.5); pet.vy = -H * .5; pet.ground = false; say('Etciù!', 1400); }, 900); } break; }
    case 'art': { const F = fposPx('quadro'); if (walkTo(F.x, dt)){ pet.look = {x: F.x, y: F.y}; if (!b.said){ b.said = true; chat(pick(['Un capolavoro.','Mmh… interessante.','Ci vedo una banana.']), .8); } } break; }
    case 'hiccup': pet.hop = 0; if (b.t % .9 < dt && pet.ground){ pet.vy = -H * .35; pet.ground = false; floatText('hic!', pet.x + R, pet.y - R, '#a893ff'); tone(800, .05, 'square', .05); } break;
    case 'mischief': {
      const hasPot = s.messes.some(m => m.type === 'pot');
      if (!hasPot && !b.kind) b.kind = Math.random() < .55 ? 'pot' : 'doodle';
      if (!b.kind) b.kind = 'doodle';
      if (b.kind === 'pot'){
        if (walkTo(W * .82, dt) && pet.ground && !b.j){ b.j = 1; pet.vy = -Math.sqrt(2 * G() * (groundY() - H * .34)); pet.ground = false; sfx.boing();
          setTimeout(() => { if (!state || state.messes.some(m => m.type === 'pot')) return; setFallingPot({x: W * .8, y: H * .3 - 18, vy: 0, rot: 0}); }, 380); }
      } else {
        if (!b.x) b.x = rf(.42, .66);
        if (walkTo(b.x * W, dt)){ pet.wob = .6; b.d = (b.d || 0) + dt; pet.look = {x: b.x * W, y: H * .6};
          if (b.d > 1.6 && !b.ok){ b.ok = 1; if (s.messes.length < 2){ s.messes.push({type:'doodle', x: b.x, seed: rnd(1, 9999)}); say(pick(['Ho fatto un disegno! Ti piace?','Un capolavoro sul muro!']), 2400); saveSoon(); } b.done = true; } }
      }
      break; }
    case 'shoot': {
      const h = HOOP();
      if (ball.held){ b.done = true; break; }
      if (!b.phase){
        pet.look = {x: ball.x, y: ball.y};
        if (Math.hypot(ball.vx, ball.vy) > 60){ b.done = true; break; }
        if (walkTo(ball.x - Math.sign(ball.x - pet.x || 1) * R * .7, dt, 1.3)){ b.phase = 1; b.t2 = 0; chat(pick(['Guarda qua!','Tiro da tre!','Occhio al canestro!']), .8); }
      } else if (b.phase === 1){
        pet.look = {x: h.x, y: h.y}; b.t2 += dt;
        if (b.t2 > .55){
          const T = rf(.75, 1), hit = Math.random() < (isForm('pallino') ? .85 : .5);
          const tx = h.x + (hit ? rf(-h.w * .15, h.w * .15) : pick([-1, 1]) * rf(h.w * .55, h.w * .9)), ty = h.y - 4;
          ball.ground = false; ball.y = Math.min(ball.y, FLOOR - ball.r - 2); ball.by = 'blob';
          ball.vx = (tx - ball.x) / T; ball.vy = (ty - ball.y - .5 * G() * T * T) / T;
          pet.vy = -H * .6; pet.ground = false; sfx.boing(); b.phase = 2; b.until = Date.now() + 2500;
        }
      }
      break; }
    case 'sing':
      pet.hop = 0; setExpr('happy', .3);
      if (b.t % .45 < dt){ burst('note', 1); sfx.note(); }
      if (!b.said){ b.said = 1; chat(pick(['La la laaa ♪','Do re mi blob ♪','♪ Bloppy bloppy ♪']), 1); }
      break;
    case 'tail':
      if (!pet.anim && b.t < 1.8) pet.anim = {type:'spin', t:0, dur:.6};
      if (b.t > 1.9 && !b.d){ b.d = 1; setExpr('dizzy', 1.6); chat(pick(['Mi sono girato da solo…','Ho rincorso la mia coda. Non ho la coda.']), .9); b.until = Date.now() + 1800; }
      break;
    case 'mimic':
      if (!b.d){ b.d = 1; const tricks = LEVELS.slice(0, s.level).filter(l => l.trick).map(l => l.trick); const tr = pick(tricks);
        chat('Guarda cosa so fare!', 1); setTimeout(() => { if (awake() && !pet.held && pet.ground) doTrick(tr, undefined, true); }, 800); b.until = Date.now() + 3000; }
      break;
    case 'show':
      if (!b.d){ b.d = 1; const tr = pick(['wave','spin','dance','jump']); chat(pick(['Signore e signori…!','Tenetevi forte!','E ora… un numero speciale!']), 1);
        setTimeout(() => { if (!awake() || pet.held || !pet.ground) return; doTrick(tr, undefined, true);
          setTimeout(() => { if (!state) return; setHoopCoins(Math.min(6, hoopCoins + (Date.now() - lastHoopRefill) / 120000)); setLastHoopRefill(Date.now());
            if (hoopCoins >= 1){ setHoopCoins(hoopCoins - 1); addCoins(1); floatText('👏 +1', pet.x, pet.y - R * 1.3); sfx.coin(); } }, 1100); }, 800);
        b.until = Date.now() + 4000; }
      break;
    case 'tramp': { const p = fposPx('trampolino'); if (!b.on){ if (walkTo(p.x, dt, 1.2) && pet.ground){ b.on = 1; b.n = 0; pet.vy = -H*1.1; pet.ground = false; sfx.boing(); chat(pick(['Boing!','Più in alto!','Wiii!']), .8); b.until = Date.now() + 7000; } } else if (pet.ground) b.done = true; break; }
    case 'hide': { const p = fposPx('tenda'); if (!b.in){ if (walkTo(p.x, dt, 1.2)){ b.in = 1; chat('Non mi trovi!', 1); b.until = Date.now() + 9000; } } break; }
    case 'pit': { const p = fposPx('piscina'); if (!b.in){ if (walkTo(p.x, dt, 1.2) && pet.ground){ b.in = 1; pet.vy = -H*.9; pet.ground = false; b.until = Date.now() + 5500; sfx.boing(); } }
      else if (pet.ground){ pet.sinkT = R*.55; if (!b.sp){ b.sp = 1; burst('balls', 14, pet.x, pet.y); chat('Splash tra le palline!', 1); } if (Math.random() < dt*2) burst('balls', 2, pet.x, pet.y - R*.3); } break; }
    case 'sit': { const p = fposPx('cuscino'); if (walkTo(p.x, dt)){ pet.sinkT = -p.S*.35; setExpr('love', .4); if (!b.said){ b.said = 1; chat(pick(['Che comodo…','Questo cuscino è mio.']), .7); } if (Math.random() < dt) burst('heart', 1); } break; }
    case 'mirror': { const p = fposPx('specchio'); if (walkTo(p.x + R*1.15, dt)){ pet.look = {x: p.x, y: p.y}; if (!b.said){ b.said = 1; chat(pick(['Chi è il blob più bello del reame?','Oggi sono proprio in forma!','Mi faccio l\'occhiolino.']), 1); } } break; }
    case 'fish': { const p = fposPx('acquario'); if (walkTo(p.x, dt)){ pet.look = {x: p.x, y: p.y}; if (!b.said){ b.said = 1; chat(pick(['Ciao pesciolini!','Glu glu?','Quello arancione è mio amico.']), .9); } } break; }
    case 'ouch': { const p = fposPx('cactus'); if (walkTo(p.x - R*1.05, dt) && !b.d){ b.d = 1; setTimeout(() => { if (!awake() || !pet.ground) return; squish(.4); pet.vy = -H*.9; pet.vx = -R*2; pet.ground = false; sfx.sad(); say('Ahia! Di nuovo!', 1500); setExpr('yuck', 1.5); }, 600); } break; }
    case 'nap': { const p = fposPx('letto'); if (walkTo(p.x + p.w*.12, dt, .8) && !b.d){ b.d = 1; chat('Un pisolino sul lettino…', 1); if (state.energy < 40){ state.sleeping = true; log(state, Date.now(), `${state.name} si è messo a nanna nel lettino.`); saveSoon(); } } break; }
    case 'eatFloor': {
      const f = b.food;
      if (!floorFood.includes(f)){ b.done = true; break; }
      pet.look = {x: f.x, y: f.y};
      if (walkTo(f.x - Math.sign(f.x - pet.x || 1) * R * .6, dt, 1.2)){
        floorFood.splice(floorFood.indexOf(f), 1);
        eat(f.id, false, f.x, f.y); save(); render(); b.done = true;
      }
      break; }
  }
  if (pet.anim && pet.anim.type === 'dance' && Math.random() < dt * 3) { burst('note', 1); if (!pet.anim.quiet || Math.random() < .3) sfx.note(); }
}

export { brain, walkTo };
