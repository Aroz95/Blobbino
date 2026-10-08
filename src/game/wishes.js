import { $, HOUR, MIN, clamp, esc, pick, rf, rnd } from './util.js';
import { RAR, VARS, rarStars } from './blobs.js';
import {
  ACC, DAYMOODS, FOODS, GAMES, HATS, LEVELS, MISSIONS, PLACES, STICKERS, TASTY, TRICK_NAME, slotKey
} from './catalog.js';
import { giveSticker, houseBlobs, log, perk, reveal, state, view, world } from './state.js';
import { eggNotice, evoQueue, setEggNotice, simulate } from './evolution.js';
import { canLay, layEgg, openHouse, setRoom, showEvo, visits } from './house.js';
import { autoBackup, save, saveSoon } from './save.js';
import { addCoins, dayKey, say, sfx, toast } from './texts.js';
import { gainXp, levelUpQueue, showLevelUp } from './bond.js';
import { closeSheet, openSheet, render, setTrayKey } from '../legacy/interface.js';
import { R, burst, dragFood, pet } from '../room/scene.js';
import { ptr } from '../room/pointer.js';
import { hasFurn } from '../draw/furniture.js';

/* ================= desideri, regalo, passeggiate ================= */
function makeWish(s){
  const now = Date.now(), opts = [];
  const dm = DM();
  const add = (w, n = 1) => { const k = Math.max(1, Math.round(n * ((dm && dm.wish[w.type]) || 1))); for (let i = 0; i < k; i++) opts.push(w); };
  if (hasFurn('canestro') && hasFurn('palla')) add({type:'hoop', e:'🏀', text:'vuole vederti fare canestro', reward:rnd(6,9)}, 2);
  if (s.energy > 30 && hasFurn('canestro')) add({type:'dunk', e:'💥', text:'vuole fare una schiacciata nel canestro', reward:rnd(7,10)});
  add({type:'tickle', e:'🤭', text:'vuole il solletico', reward:rnd(4,7)});
  const food = Math.random() < .35 ? s.traits.favFood : pick(TASTY.filter(k => k !== s.traits.hateFood));
  const F = FOODS[food];
  add({type:'food', target:food, e:F.e, text:`vorrebbe ${F.n.toLowerCase()}`, reward:F.price + rnd(4,8)}, 2);
  add({type:'cuddle', e:'🤗', text:'ha voglia di coccole', reward:rnd(4,7)}, 2);
  if (hasFurn('palla')) add({type:'ball', e:'⚽', text:'vuole giocare a palla', reward:rnd(5,8)}, 2);
  if (s.energy > 30) add({type:'throw', e:'🚀', text:'vuole volare in alto', reward:rnd(5,8)}, 2);
  const g = Math.random() < .35 ? s.traits.favGame : pick(Object.keys(GAMES));
  add({type:'game', target:g, e:GAMES[g].e, text:`vuole giocare a ${GAMES[g].n}`, reward:rnd(8,12)});
  if (s.energy > 35 && !s.sick){
    const p = Math.random() < .35 ? s.traits.favPlace : pick(Object.keys(PLACES));
    add({type:'walk', target:p, e:PLACES[p].e, text:`sogna una passeggiata ${PLACES[p].dove}`, reward:rnd(8,12)});
  }
  if (s.hygiene < 85) add({type:'bath', e:'🫧', text:'vorrebbe essere lavato per bene', reward:rnd(5,8)}, 2);
  const tricks = LEVELS.slice(0, s.level).filter(l => l.trick).map(l => l.trick);
  if (tricks.length){ const tr = pick(tricks); add({type:'trick', target:tr, e:'✨', text:`vuole mostrarti ${TRICK_NAME[tr]}`, reward:rnd(6,9)}, 2); }
  const hats = s.hats.filter(h => ACC[h] && s[slotKey(h)] !== h);
  if (hats.length){ const h = pick(hats); add({type:'hat', target:h, e:HATS[h].e, text:`vorrebbe indossare ${HATS[h].n.toLowerCase()}`, reward:rnd(6,10)}); }
  return Object.assign({}, pick(opts), {exp: now + 90*MIN, prog:0});
}
function fulfill(type, target){
  const s = state; if (!s) return false;
  const w = s.wish;
  if (!w || w.type !== type || (w.target && w.target !== target)) return false;
  addCoins(w.reward); s.trust = clamp(s.trust + 5); s.fun = clamp(s.fun + 6); s.wishesDone++;
  log(s, Date.now(), `Desiderio esaudito: ${s.name} ${w.text}. +${w.reward} stelline.`);
  giveSticker(s, 'desiderio'); if (s.wishesDone >= 10) giveSticker(s, 'desideri10');
  s.wish = null; s.nextWishAt = Date.now() + rnd(10, 25)*MIN;
  gainXp(10); burst('sparkle', 14); sfx.coin(); mission('wish');
  setTimeout(() => say(`Desiderio esaudito! +${w.reward} stelline`, 2600), 700);
  saveSoon();
  return true;
}
function wishProgress(type, amount, need){
  const w = state && state.wish; if (!w || w.type !== type) return;
  w.prog = (w.prog || 0) + amount;
  if (w.prog >= need) fulfill(type, w.target);
}
let welcome = false, hatchFx = 0, missionDirty = true;
const DM = () => state && state.dayMood ? DAYMOODS[state.dayMood.id] : null;
function ensureDay(s){
  const today = dayKey(Date.now());
  if (!s.dayMood || s.dayMood.day !== today){ s.dayMood = {day: today, id: pick(Object.keys(DAYMOODS))}; missionDirty = true; }
  if (!s.missions || s.missions.day !== today){
    const many = houseBlobs().filter(b => b.stage !== 'egg').length >= 2;
    const pool = Object.keys(MISSIONS).filter(id => (!MISSIONS[id].lv || s.level >= MISSIONS[id].lv) && (!MISSIONS[id].multi || many)).sort(() => Math.random() - .5);
    s.missions = {day: today, list: pool.slice(0, 3).map(id => ({id, p:0, done:false})), sets:{}, chest:false};
    missionDirty = true;
  }
}
function mission(id, amt = 1, key){
  const s = state; if (!s || !s.missions || s.stage === 'egg') return;
  const m = s.missions.list.find(x => x.id === id && !x.done); if (!m) return;
  if (key !== undefined){ const set = s.missions.sets[id] = s.missions.sets[id] || []; if (set.includes(key)) return; set.push(key); m.p = set.length; }
  else m.p += amt;
  const M = MISSIONS[id];
  if (m.p >= M.n){
    m.p = M.n; m.done = true; addCoins(8); gainXp(10); sfx.coin();
    toast(`Missione compiuta: ${M.e} +8 stelline`, 2600); log(s, Date.now(), `Missione compiuta: ${M.t.toLowerCase()}.`);
    if (s.missions.list.every(x => x.done) && !s.missions.chest){ s.missions.chest = true; setTimeout(tryChest, 1400); }
  }
  missionDirty = true; saveSoon();
}
function tryChest(){ if (!$('sheet').hidden || !$('gameOverlay').hidden || ptr.down){ setTimeout(tryChest, 1500); return; } openChest(); }
function openChest(){
  const s = state; if (!s) return; s.chests++;
  const coins = 15 + Math.min(s.chests, 10) * 2, f1 = pick(TASTY), f2 = pick(TASTY);
  s.inv[f1] = (s.inv[f1] || 0) + 1; s.inv[f2] = (s.inv[f2] || 0) + 1; addCoins(coins); gainXp(20);
  const nw = giveSticker(s, 'forziere'); setTrayKey('');
  log(s, Date.now(), `Forziere del giorno: +${coins} stelline, ${FOODS[f1].e} e ${FOODS[f2].e}.`);
  save(); render(true); sfx.level(); burst('confetti', 40);
  openSheet('Forziere del giorno!', `<div class="loot"><div class="big-em">🧰</div><p style="text-align:center">Hai completato tutte le missioni di oggi.</p>
    <div class="rows"><div class="rowi"><div class="em">⭐</div><div><b>+${coins} stelline</b><small>Più forzieri apri, più sono ricchi</small></div><span></span></div>
    <div class="rowi"><div class="em" style="font-size:22px">${FOODS[f1].e}${FOODS[f2].e}</div><div><b>${FOODS[f1].n} e ${FOODS[f2].n.toLowerCase()}</b><small>In dispensa</small></div><span></span></div>
    ${nw ? '<div class="rowi hl"><div class="em">🧰</div><div><b>Figurina: Missione compiuta</b><small>Guardala nell\'album</small></div><span></span></div>' : ''}</div>
    <p class="shopnote">Domani arrivano tre missioni nuove.</p></div><div class="sheet-actions"><button class="btn" data-close type="button">Evviva!</button></div>`);
}
function renderMissions(){
  missionDirty = false;
  const s = state, card = $('missionCard');
  card.hidden = !s || s.stage === 'egg' || !s.missions;
  if (card.hidden) return;
  const L = s.missions.list, done = L.filter(m => m.done).length;
  $('chestTag').textContent = s.missions.chest ? '🧰 Forziere aperto' : `${done}/3 · 🧰`;
  $('missionList').innerHTML = L.map(m => { const M = MISSIONS[m.id];
    return `<div class="mrow${m.done ? ' done' : ''}"><span class="em">${M.e}</span><span class="mt">${M.t}</span><span class="mp">${m.done ? '✓' : m.p + '/' + M.n}</span></div>`; }).join('');
}
function idleLine(){
  const s = state, h = new Date().getHours(), L = [];
  if (h < 11) L.push('Buongiorno! Colazione?', 'Ho fatto un sogno stranissimo…');
  else if (h < 18) L.push('Che si fa oggi pomeriggio?', 'Mi annoio un pochino…', 'Sai che ti voglio bene?');
  else L.push('Si sta facendo sera…', 'Mi racconti una storia?', 'Guarda quante cose abbiamo fatto oggi!');
  if (s.hunger < 50) L.push('Mi brontola la pancia…');
  if (s.fun < 50) L.push('Giochiamo a palla?', 'Lanciami in alto!');
  if (s.hygiene < 50) L.push('Mi sento un po\' appiccicoso…');
  const dm = DM();
  if (dm) L.push({giocherellone:'Lanciami! Lanciami!', coccolone:'Mi fai una coccola?', goloso:'Cosa c\'è da mangiare?', curioso:'Cosa c\'è là fuori?',
    combinaguai:'Non ho fatto niente io…', dormiglione:'Ancora cinque minuti…', artista:'Quel muro è così bianco…', sportivo:'Scommetto che faccio canestro!'}[s.dayMood.id]);
  if (s.lastEv) L.push(s.lastEv);
  if (s.missions && !s.missions.chest) L.push('Abbiamo ancora delle missioni da fare!');
  return pick(L);
}
function tick(){
  if (!world) return;
  autoBackup();
  const now = Date.now();
  let ch = false;
  const hb = houseBlobs();
  for (const b of hb) if (simulate(view(b), now)) ch = true;
  for (const b of hb) if (canLay(b, now)){ layEgg(b); ch = true; }
  visits(now);
  const s = state;
  const anyone = hb.find(b => b.stage !== 'egg');
  if (anyone) ensureDay(s && s.stage !== 'egg' ? s : view(anyone));
  const free = $('sheet').hidden && $('gameOverlay').hidden && !ptr.down && !dragFood;
  if (free && evoQueue.length){ showEvo(evoQueue.shift()); render(true); return; }
  if (free && eggNotice){
    const n = eggNotice; setEggNotice(null); sfx.level(); render(true);
    openSheet('Un uovo!', `<div class="loot"><div class="big-em">🥚</div>
      <p style="text-align:center"><b>${esc(n.parent)} ha deposto un uovo${n.shiny ? ' che luccica' : ''}!</b></p>
      ${n.egg && VARS.egg[n.egg] ? `<p class="rarline" style="color:${RAR[VARS.egg[n.egg].r].c}">${VARS.egg[n.egg].n} · ${rarStars(VARS.egg[n.egg].r)} ${RAR[VARS.egg[n.egg].r].n}</p>` : ''}
      <p class="story">${n.room >= 0 ? `L'ho messo nella stanza ${esc(world.rooms[n.room].name)}. Si schiude tra pochi minuti: vai a scaldarlo e a dargli un nome.` : 'In casa non c\'era una stanza libera, così è al sicuro nella Valle dei Blob. Compra una stanza o fai spazio per riportarlo a casa.'}</p></div>
      <div class="sheet-actions">${n.room >= 0 ? `<button class="btn" id="goEgg" type="button">Vai a vederlo</button>` : `<button class="btn" id="goHouse" type="button">Apri la casa</button>`}</div>`, b => {
        const g = b.querySelector('#goEgg'); if (g) g.onclick = () => { closeSheet(); setRoom(n.room); };
        const h = b.querySelector('#goHouse'); if (h) h.onclick = () => openHouse();
      });
    return;
  }
  if (free && levelUpQueue.length){ showLevelUp(levelUpQueue.shift()); return; }
  const back = hb.find(b => b.walk && b.walk.back);
  if (back && free){ walkReturn(view(back)); return; }
  if (anyone && world.daily.last !== dayKey(now) && free){ dailyGift(); return; }
  if (s && s.stage !== 'egg'){
    if (s.wish && now > s.wish.exp){
      log(s, now, `${s.name} ci è rimasto male: nessuno ha esaudito il suo desiderio.`);
      s.trust = clamp(s.trust - 2); s.wish = null; s.nextWishAt = now + rnd(10, 25)*MIN; ch = true;
    }
    if (!s.wish && now >= s.nextWishAt && !s.walk && !s.sleeping && s.name){
      s.wish = makeWish(s); log(s, now, `${s.name} ${s.wish.text}.`); ch = true;
      say(`${s.wish.e} ${s.name} ${s.wish.text}!`, 3200);
    }
    if (perk('gifts') && !s.gift && now - s.lastGift > 3*HOUR && !s.walk){ s.gift = {x: rf(.2, .8)}; s.lastGift = now; ch = true; }
  }
  if (ch) saveSoon();
  render();
}
function dailyGift(){
  const s = state && state.stage !== 'egg' ? state : view(houseBlobs().find(b => b.stage !== 'egg')), now = Date.now(), y = dayKey(now - 24*HOUR);
  const streak = s.daily.last === y ? s.daily.streak + 1 : 1;
  const coins = 8 + Math.min(streak, 7) * 2;
  let food = null; if (Math.random() < .5){ food = pick(TASTY); s.inv[food] = (s.inv[food] || 0) + 1; }
  s.daily = {last: dayKey(now), streak};
  addCoins(coins); gainXp(5, s);
  const sevenNew = streak >= 7 && giveSticker(s, 'settimana');
  log(s, now, `Regalo del giorno: +${coins} stelline${food ? ' e ' + FOODS[food].e + ' ' + FOODS[food].n.toLowerCase() : ''}.`);
  save(); render(true);
  openSheet('Regalo del giorno', `<div class="loot">
    <p>${streak > 1 ? `Sei passato a trovare ${esc(s.name)} per <b>${streak} giorni di fila</b>.` : `Ogni giorno che passi a trovare ${esc(s.name)} c'è un regalo. Più giorni di fila, più è grande.`}</p>
    <div class="rows">
      <div class="rowi"><div class="em">⭐</div><div><b>+${coins} stelline</b><small>Da spendere nel negozio</small></div><span></span></div>
      ${food ? `<div class="rowi"><div class="em">${FOODS[food].e}</div><div><b>${FOODS[food].n}</b><small>Aggiunto alla dispensa</small></div><span></span></div>` : ''}
      ${sevenNew ? `<div class="rowi hl"><div class="em">📅</div><div><b>Figurina: Una settimana</b><small>Sette giorni insieme!</small></div><span></span></div>` : ''}
      ${DM() ? `<div class="rowi"><div class="em">${DM().e}</div><div><b>Oggi è ${DM().n.toLowerCase()}</b><small>${DM().d}</small></div><span></span></div>` : ''}
      <div class="rowi"><div class="em">🎯</div><div><b>Tre missioni nuove</b><small>Completale tutte per aprire il forziere</small></div><span></span></div>
    </div></div>
    <div class="sheet-actions"><button class="btn" data-close type="button">Grazie!</button></div>`);
}
function walkReturn(sv){
  const s = sv || state, w = s.walk, P = PLACES[w.place], fav = s.traits.favPlace === w.place, now = Date.now();
  const expl = s.stage === 'adult' && s.form === 'esploratore';
  let coins = Math.round(rnd(P.coins[0], P.coins[1]) * (fav ? 1.5 : 1));
  let food = null; if (Math.random() < .4){ food = pick(TASTY); s.inv[food] = (s.inv[food] || 0) + 1; }
  let stk = null, dup = false;
  if (Math.random() < P.chance + (fav ? .25 : 0) + (expl ? .2 : 0)){
    stk = pick(P.stickers);
    if (s.stickers[stk]){ dup = true; coins += 5; } else giveSticker(s, stk, now);
  }
  const story = pick(P.stories)(s.name);
  const newFav = fav && reveal(s, 'favPlace');
  s.fun = clamp(s.fun + (fav ? 15 : 6)); s.trust = clamp(s.trust + 2); s.walks++;
  addCoins(coins); s.walk = null; gainXp(6, s);
  log(s, now, story);
  if (state && state.id === s.id){ pet.x = -R; pet.beh = {type:'enter', until: now + 6000}; }
  save(); render(true);
  openSheet(`${s.name} è tornato!`, `<div class="loot">
    <p class="story">${esc(story)}</p>
    ${newFav ? `<p><b>Hai scoperto un suo gusto:</b> il posto che preferisce è il ${P.n.toLowerCase()} ${P.e}.</p>` : ''}
    <div class="rows">
      <div class="rowi"><div class="em">⭐</div><div><b>+${coins} stelline</b><small>${fav ? 'Bonus posto preferito' : 'Trovate per strada'}</small></div><span></span></div>
      ${food ? `<div class="rowi"><div class="em">${FOODS[food].e}</div><div><b>${FOODS[food].n}</b><small>Aggiunto alla dispensa</small></div><span></span></div>` : ''}
      ${stk ? `<div class="rowi${dup ? '' : ' hl'}"><div class="em">${STICKERS[stk].e}</div><div><b>${dup ? 'Doppione' : 'Nuova figurina'}: ${STICKERS[stk].n}</b><small>${dup ? 'Ce l\'avevi già: +5 stelline' : 'Guardala nell\'album'}</small></div><span></span></div>` : ''}
    </div></div>
    <div class="sheet-actions"><button class="btn" data-close type="button">Bentornato!</button></div>`);
}

// gli altri moduli non possono riassegnare una variabile importata: la cambiano con questi
export function setWelcome(v){ welcome = v; }
export function setHatchFx(v){ hatchFx = v; }

export {
  DM, ensureDay, fulfill, hatchFx, idleLine, mission, missionDirty, renderMissions, tick, welcome,
  wishProgress
};
