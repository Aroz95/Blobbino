import { $, clamp, esc, pick, rf, rnd } from '../game/util.js';
import { FORMS } from '../game/blobs.js';
import { FOODS, LETTERS, STICKERS, TASTY } from '../game/catalog.js';
import { giveSticker, isForm, kindOf, log, state } from '../game/state.js';
import { note } from '../game/evolution.js';
import { save, saveSoon } from '../game/save.js';
import { addCoins, chat, say, sfx, tone } from '../game/texts.js';
import { budgetXp, gainXp } from '../game/bond.js';
import { DM, mission } from '../game/wishes.js';
import { openSheet, setTrayKey, tab } from '../legacy/interface.js';
import {
  FLOOR, H, R, W, awake, burst, ev, floatText, groundY, nextEvAt, pet, petVisible, setEv, setExpr,
  setNextEvAt, squish
} from './scene.js';

/* ---------- eventi a sorpresa ---------- */
function isNight(){ const h = new Date().getHours(); return h >= 20 || h < 7; }
const WIN = () => ({x: W*.07, y: H*.1, w: W*.27, h: H*.33});
const EV_MEMO = {butterfly:'Che bella la farfalla di prima!', bubbles:'Le bolle di sapone! Rifacciamolo!', glint:'Chissà se ci sono altri tesori…',
  visitor:'Il mio amico tornerà a trovarmi?', star:'Ho visto una stella cadente con te!', rainbow:'Hai visto l\'arcobaleno?', starRain:'Piovevano stelline!',
  mouse:'Quel topolino era velocissimo!', balloon:'Ne voglio un altro di palloncino!', ghost:'Meno male che c\'eri tu col fantasmino…',
  storm:'Che paura il temporale…', letter:'Mi scrivi anche tu una lettera?', bird:'L\'uccellino cantava benissimo!'};
let recentEv = [];
function startEvent(force){
  const s = state, nm = s.name, night = isNight();
  const opts = ['butterfly','bubbles','glint','visitor','starRain','mouse','balloon','letter','storm'];
  if (night) opts.push('star','ghost','ghost'); else opts.push('rainbow','bird','bird','butterfly');
  if (isForm('budino')) opts.push('mouse', 'mouse');
  if (isForm('lumino') && night) opts.push('star', 'star', 'starRain');
  let pool = opts.filter(o => !recentEv.includes(o)); if (!pool.length) pool = opts;
  const type = force || pick(pool); recentEv.push(type); if (recentEv.length > 5) recentEv.shift();
  pet.beh = null;
  if (type === 'butterfly'){ setEv({type, x:-30, y:H*.35, vx:W*.16, base:H*.32, t:0, life:24, turns:0}); say('Una farfalla! Prendila al volo!', 2400); }
  else if (type === 'bubbles'){ setEv({type, t:0, life:12, popped:0, items:Array.from({length:6}, (_, i) => ({x:rf(.1,.9)*W, y:FLOOR + i*H*.12, r:rf(.035,.055)*W, ph:rf(0,6), alive:true}))}); say('Bolle di sapone! Scoppiale!', 2200); }
  else if (type === 'glint'){ setEv({type, x:rf(.15,.85)*W, t:0, life:22}); say(`${nm} ha visto qualcosa che luccica…`, 2400); }
  else if (type === 'visitor'){ const k = pick(Object.keys(FORMS).filter(k => k !== kindOf(s) && !FORMS[k].dark)); setEv({type, x:W + R, dir:-1, pal:FORMS[k].pal, t:0, life:20, greeted:false}); say('Toc toc! È arrivato un amico!', 2400); sfx.giggle(); }
  else if (type === 'star'){ setEv({type, t:0, life:4.5}); say('Guarda fuori! Una stella cadente!', 2400); }
  else if (type === 'rainbow'){ setEv({type, t:0, life:14}); say('È spuntato l\'arcobaleno! Toccalo!', 2400); }
  else if (type === 'starRain'){ setEv({type, t:0, life:14, got:0, items:Array.from({length:9}, (_, i) => ({x:rf(.08,.92)*W, y:-20 - i*H*.11, vy:H*rf(.13,.2), ph:rf(0,6), alive:true}))}); say('Piovono stelline! Raccoglile!', 2400); }
  else if (type === 'mouse'){ setEv({type, x:-20, y:FLOOR - 8, dir:1, t:0, life:9, flip:1.2}); say('Un topolino! Acchiappalo prima che rubi qualcosa!', 2600); }
  else if (type === 'balloon'){ setEv({type, x:rf(.25,.75)*W, y:FLOOR - 10, t:0, life:16}); say('Un palloncino! Cosa ci sarà dentro?', 2400); }
  else if (type === 'letter'){ setEv({type, x:-30, t:0, life:40}); say(`Posta! È arrivata una lettera per ${nm}.`, 2400); sfx.note(); }
  else if (type === 'storm'){ setEv({type, t:0, life:18, calm:0, flash:0, nextFlash:1}); say(`Temporale! ${nm} ha paura: coccolalo!`, 2800); }
  else if (type === 'ghost'){ setEv({type, x:W*.2, y:H*.45, t:0, life:18, hits:0, a:0}); say(`Un fantasmino! ${nm} trema: toccalo per scacciarlo!`, 2800); }
  else if (type === 'bird'){ setEv({type, t:0, life:18, x:-20, y:H*.12, landed:false, leaving:false}); say('Un uccellino alla finestra!', 2200); }
}
function endEvent(){ setEv(null); const m = (DM() && DM().ev) || 1; setNextEvAt(Date.now() + rnd(35, 80) * 1000 * m); }
function evReward(stk, coins, xp, msg, x, y){
  const s = state;
  if (coins){ addCoins(coins); floatText(`+${coins}`, x, y); sfx.coin(); }
  gainXp(xp);
  const nw = stk && giveSticker(s, stk);
  say(nw ? `${msg} Nuova figurina: ${STICKERS[stk].e} ${STICKERS[stk].n}!` : msg, 2800);
  if (ev && EV_MEMO[ev.type]) s.lastEv = EV_MEMO[ev.type];
  mission('events'); note('event'); saveSoon();
}
const birdPos = () => { const w = WIN(); return {x: w.x + w.w * .78, y: w.y + w.h + 2 - R * .18}; };
function evTarget(){
  const e = ev; if (!e) return null;
  if (e.type === 'butterfly' || e.type === 'balloon' || e.type === 'mouse') return {x:e.x, y:e.y};
  if (e.type === 'bubbles' || e.type === 'starRain'){ const al = e.items.filter(i => i.alive); if (!al.length) return null;
    const n = al.reduce((a, c) => Math.abs(c.x - pet.x) < Math.abs(a.x - pet.x) ? c : a); return {x:n.x, y:n.y}; }
  return null;
}
function stormCalm(){
  if (!ev || ev.type !== 'storm' || ev.done) return;
  ev.done = true; state.trust = clamp(state.trust + 4); burst('heart', 10); setExpr('love', 2);
  evReward('temporale', 3, 6, `${state.name} si è calmato tra le tue coccole.`, pet.x, pet.y - R);
  ev.life = Math.min(ev.life, ev.t + 2.5);
}
function popBalloon(byPet){
  const e = ev, s = state; sfx.pop(); burst('confetti', 16, e.x, e.y);
  const food = Math.random() < .4 ? pick(TASTY) : null, coins = rnd(3, 7);
  if (food){ s.inv[food] = (s.inv[food] || 0) + 1; setTrayKey(''); }
  const inside = food ? `${FOODS[food].e} e qualche stellina` : 'qualche stellina';
  evReward(null, coins, 3, byPet ? `${s.name} l'ha fatto scoppiare! Dentro c'era ${inside}.` : `Pop! Dentro c'era ${inside}.`, e.x, e.y);
  endEvent();
}
function openLetter(){
  const s = state, L = pick(LETTERS), food = Math.random() < .5 ? pick(TASTY) : null, coins = rnd(2, 6), x = ev.x;
  if (food){ s.inv[food] = (s.inv[food] || 0) + 1; setTrayKey(''); }
  burst('sparkle', 8, x, FLOOR - 10);
  evReward('lettera', coins, 3, 'Che bella lettera!', x, FLOOR - 30);
  log(s, Date.now(), `Lettera da ${L.from} ${L.e}.`);
  endEvent(); save();
  openSheet(`Lettera da ${L.from}`, `<div class="loot"><div class="big-em">${L.e}</div><p class="story">${esc(L.m(s.name))}</p>
    <div class="rows"><div class="rowi"><div class="em">⭐</div><div><b>+${coins} stelline</b><small>Erano nella busta</small></div><span></span></div>
    ${food ? `<div class="rowi"><div class="em">${FOODS[food].e}</div><div><b>${FOODS[food].n}</b><small>Un pensierino, in dispensa</small></div><span></span></div>` : ''}</div></div>
    <div class="sheet-actions"><button class="btn" data-close type="button">Che carino!</button></div>`);
}
function evTap(p){
  const e = ev, s = state;
  if (e.type === 'butterfly' && Math.hypot(p.x - e.x, p.y - e.y) < R * .55){ burst('sparkle', 12, e.x, e.y); evReward('farfalla', 3, 4, 'Presa! La lasci andare libera.', e.x, e.y); endEvent(); return true; }
  if (e.type === 'bubbles'){
    for (const b of e.items) if (b.alive && Math.hypot(p.x - b.x, p.y - b.y) < b.r * 1.5){
      b.alive = false; e.popped++; sfx.pop(); burst('bubble', 4, b.x, b.y); addCoins(1); floatText('+1', b.x, b.y); budgetXp(1);
      if (e.popped >= e.items.length){ evReward('bolle', 3, 3, 'Tutte scoppiate!', b.x, b.y); endEvent(); }
      return true;
    }
  }
  if (e.type === 'starRain'){
    for (const b of e.items) if (b.alive && Math.hypot(p.x - b.x, p.y - b.y) < Math.max(26, W * .06)){
      b.alive = false; e.got++; addCoins(1); floatText('+1', b.x, b.y); tone(1100 + e.got * 60, .08, 'square', .05); burst('sparkle', 4, b.x, b.y); budgetXp(1);
      return true;
    }
  }
  if (e.type === 'glint' && Math.hypot(p.x - e.x, p.y - (FLOOR - 6)) < R * .6){
    const gem = Math.random() < .15; burst('sparkle', 14, e.x, FLOOR - 10);
    evReward(gem ? 'tesoro' : null, gem ? 15 : rnd(3, 8), 3, gem ? 'Un diamante!' : 'Stelline nascoste!', e.x, FLOOR - 20); endEvent(); return true;
  }
  const w = WIN();
  if ((e.type === 'star' || e.type === 'rainbow') && p.x > w.x - 10 && p.x < w.x + w.w + 10 && p.y > w.y - 10 && p.y < w.y + w.h + 10){
    burst('sparkle', 14, p.x, p.y);
    if (e.type === 'star') evReward('stella', 8, 5, 'Desiderio espresso!', p.x, p.y);
    else evReward('arcobaleno', 5, 4, 'Che colori!', p.x, p.y);
    endEvent(); return true;
  }
  if (e.type === 'visitor' && Math.hypot(p.x - e.x, p.y - groundY()) < R * .9 && !e.greeted){
    e.greeted = true; e.life = Math.min(e.life, e.t + 5);
    const f = pick(TASTY); s.inv[f] = (s.inv[f] || 0) + 1;
    burst('heart', 8, e.x, groundY());
    evReward('amico', 2, 5, `Ciao! Ti ha portato ${FOODS[f].e} ${FOODS[f].n.toLowerCase()}.`, e.x, groundY() - R);
    setTrayKey('');
    return true;
  }
  if (e.type === 'mouse' && Math.hypot(p.x - e.x, p.y - e.y) < R * .55){
    s.inv.biscotto = (s.inv.biscotto || 0) + 1; setTrayKey(''); burst('sparkle', 10, e.x, e.y);
    evReward('topolino', 3, 4, 'Preso! Per scusarsi ti lascia un biscotto.', e.x, e.y - 20); endEvent(); return true;
  }
  if (e.type === 'balloon' && Math.hypot(p.x - e.x, p.y - e.y) < R * .5){ popBalloon(false); return true; }
  if (e.type === 'ghost' && Math.hypot(p.x - e.x, p.y - e.y) < R * .6 && isForm('ombra')){
    burst('heart', 6, e.x, e.y); evReward('fantasmino', 5, 5, `Il fantasmino è amico di ${s.name}: vi lascia un regalo!`, e.x, e.y); endEvent(); return true;
  }
  if (e.type === 'ghost' && Math.hypot(p.x - e.x, p.y - e.y) < R * .6){
    e.hits++; sfx.pop(); burst('sparkle', 6, e.x, e.y);
    if (e.hits >= 3){ s.trust = clamp(s.trust + 3); burst('heart', 8); evReward('fantasmino', 4, 5, `Fantasmino scacciato! ${s.name} ti abbraccia.`, e.x, e.y); endEvent(); }
    else { floatText('Sciò!', e.x, e.y - 20, '#a893ff'); e.x = rf(.15, .85) * W; e.y = rf(.25, .6) * H; }
    return true;
  }
  if (e.type === 'letter' && e.x > 0 && Math.hypot(p.x - e.x, p.y - (FLOOR - 10)) < R * .55){ openLetter(); return true; }
  if (e.type === 'bird' && e.landed && Math.hypot(p.x - e.x, p.y - e.y) < R * .5){
    evReward('uccellino', 2, 3, 'Cip cip! Ti ha lasciato una piuma e una stellina.', e.x, e.y); e.landed = false; e.leaving = true; return true;
  }
  return false;
}
function openGift(){
  const s = state; const x = s.gift.x * W; s.gift = null;
  const food = Math.random() < .5 ? pick(TASTY) : null, coins = rnd(5, 12);
  if (food) s.inv[food] = (s.inv[food] || 0) + 1;
  burst('confetti', 24, x, FLOOR - R * .3); sfx.level();
  evReward(null, coins, 3, `Un regalo da ${s.name}! +${coins} stelline${food ? ' e ' + FOODS[food].e : ''}.`, x, FLOOR - R);
  setTrayKey(''); save();
}
function updateEvent(dt){
  if (!ev){
    if (Date.now() > nextEvAt && awake() && tab === 'casa' && !document.hidden && $('sheet').hidden && $('gameOverlay').hidden) startEvent();
    else if (Date.now() > nextEvAt && !awake()) setNextEvAt(Date.now() + 20000);
    return;
  }
  const e = ev, s = state; e.t += dt;
  if (e.type === 'butterfly'){
    e.x += e.vx * dt; e.y = e.base + Math.sin(e.t * 2.2) * H * .1 + Math.sin(e.t * 5) * H * .02;
    if ((e.x > W * .9 && e.vx > 0) || (e.x < W * .1 && e.vx < 0 && e.t > 2)){ if (e.t < e.life) e.vx = -e.vx; e.turns++; }
    if (e.t > e.life && (e.x < -40 || e.x > W + 40)){ endEvent(); return; }
    if (e.t > e.life) e.vx = Math.sign(e.vx || 1) * W * .3;
  } else if (e.type === 'bubbles'){
    let alive = 0;
    for (const b of e.items){ if (!b.alive) continue; b.y -= H * .1 * dt; b.x += Math.sin(e.t * 1.5 + b.ph) * 20 * dt; if (b.y < -b.r){ b.alive = false; } else alive++;
      if (!pet.ground && Math.hypot(b.x - pet.x, b.y - pet.y) < b.r + R * .8){ b.alive = false; sfx.pop(); burst('bubble', 3, b.x, b.y); chat('Pop!', .6); } }
    if (!alive) endEvent();
  } else if (e.type === 'starRain'){
    let alive = 0;
    for (const b of e.items){ if (!b.alive) continue; b.y += b.vy * dt; b.x += Math.sin(e.t * 2 + b.ph) * 15 * dt;
      if (!pet.ground && Math.hypot(b.x - pet.x, b.y - pet.y) < R * .9){ b.alive = false; e.got++; addCoins(1); floatText('+1', b.x, b.y); tone(1100 + e.got * 60, .08, 'square', .05); continue; }
      if (b.y > FLOOR - 6){ b.alive = false; burst('sparkle', 2, b.x, FLOOR - 6); } else alive++; }
    if (!alive){
      if (e.got >= 6) evReward('pioggia', 2, 4, `Ne avete raccolte ${e.got}!`, W / 2, H * .3);
      else if (e.got) evReward(null, 0, 2, `Raccolte ${e.got} stelline.`, W / 2, H * .3);
      else chat('Sono cadute tutte…', 1);
      endEvent();
    }
  } else if (e.type === 'visitor'){
    const tx = e.t < e.life ? W * .8 : W + R * 1.5;
    if (Math.abs(tx - e.x) > 3) e.x += Math.sign(tx - e.x) * R * 2 * dt;
    if (e.t > e.life && e.x > W + R){ chat('Ciao amico!', 1); endEvent(); }
  } else if (e.type === 'mouse'){
    if (e.t < e.life){
      e.flip -= dt; if (e.flip <= 0){ e.flip = rf(.6, 1.4); e.dir = Math.random() < .5 ? -1 : 1; }
      if (petVisible() && Math.abs(e.x - pet.x) < R * 1.4) e.dir = Math.sign(e.x - pet.x) || 1;
      if (e.x < 20) e.dir = 1; if (e.x > W - 20) e.dir = -1;
    } else e.dir = e.x < W / 2 ? -1 : 1;
    e.x += e.dir * W * .42 * dt;
    if (awake() && pet.ground && Math.abs(e.x - pet.x) < R * .6 && Math.random() < dt * 1.2){
      evReward('topolino', 1, 2, `${s.name} ha acchiappato il topolino da solo!`, e.x, e.y - 20); endEvent(); return;
    }
    if (e.t > e.life && (e.x < -30 || e.x > W + 30)){
      const have = TASTY.filter(k => s.inv[k] > 0);
      if (have.length){ const k = pick(have); s.inv[k]--; setTrayKey(''); say(`Il topolino è scappato con ${FOODS[k].e}!`, 2600); log(s, Date.now(), `Un topolino ha rubato ${FOODS[k].e} ${FOODS[k].n.toLowerCase()}.`); saveSoon(); }
      else say('Il topolino è scappato a mani vuote.', 2200);
      endEvent();
    }
  } else if (e.type === 'balloon'){
    e.y -= H * .06 * dt; e.x += Math.sin(e.t * 1.3) * 18 * dt;
    if (!pet.ground && Math.hypot(pet.x - e.x, pet.y - e.y) < R * 1.1){ popBalloon(true); return; }
    if (e.y < -40){ chat('Volato via…', 1); endEvent(); }
  } else if (e.type === 'ghost'){
    e.a = Math.min(1, e.t / 1.5); e.x += Math.sin(e.t * .9) * W * .08 * dt; e.y += Math.cos(e.t * 1.3) * H * .05 * dt;
    if (e.t > e.life){ s.trust = clamp(s.trust - 1); say('Il fantasmino se n\'è andato… che paura.', 2200); endEvent(); }
  } else if (e.type === 'storm'){
    e.nextFlash -= dt;
    if (e.nextFlash <= 0 && e.t < e.life - 1){ e.flash = 1; e.nextFlash = rf(2.2, 4.5); setTimeout(() => tone(55, 1.2, 'sawtooth', .07, .6), 250); if (!e.done && awake()){ squish(.2); pet.wob = 1; } }
    e.flash = Math.max(0, e.flash - dt * 3);
    if (e.t > e.life){ if (!e.done){ s.trust = clamp(s.trust - 1); say('Il temporale è passato. Che spavento…', 2200); } endEvent(); }
  } else if (e.type === 'letter'){
    if (e.x < W * .1) e.x += W * .25 * dt;
    if (e.t > e.life){ chat('La lettera è finita sotto il letto…', 1); endEvent(); }
  } else if (e.type === 'bird'){
    const bp = birdPos();
    if (!e.landed && !e.leaving){ e.x += (bp.x - e.x) * Math.min(1, dt * 2); e.y += (bp.y - e.y) * Math.min(1, dt * 2); if (Math.hypot(bp.x - e.x, bp.y - e.y) < 4) e.landed = true; }
    else if (e.landed){ if (Math.random() < dt * 1.2){ burst('note', 1, e.x, e.y - 10); if (Math.random() < .5) tone(rf(1800, 2600), .08, 'sine', .05, 1.3); } if (e.t > e.life){ e.landed = false; e.leaving = true; } }
    else { e.x += W * .5 * dt; e.y -= H * .3 * dt; if (e.y < -30 || e.x > W + 30) endEvent(); }
  } else if (e.t > e.life){ if (e.type === 'glint') chat('Oh, è sparito…', .8); endEvent(); }
}

export { WIN, evTap, evTarget, isNight, openGift, startEvent, stormCalm, updateEvent };
