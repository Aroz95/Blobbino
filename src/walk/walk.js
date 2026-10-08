import { $, clamp, esc, pick, rf, rnd } from '../game/util.js';
import { ADULT_ORDER, FORMS, VARS } from '../game/blobs.js';
import { ACC, FOODS, FURN, PLACES, STICKERS, TASTY, slotKey } from '../game/catalog.js';
import { giveSticker, isForm, log, nm, pickWeighted, reveal, state, world } from '../game/state.js';
import { bodyOf, note } from '../game/evolution.js';
import { save, saveSoon } from '../game/save.js';
import { addCoins, dayKey, rich, say, sfx } from '../game/texts.js';
import { gainXp } from '../game/bond.js';
import { fulfill, mission } from '../game/wishes.js';
import { render, setTrayKey } from '../legacy/interface.js';
import { priceOf } from '../legacy/shop.js';
import { drawWalkMap, drawWalkStreet } from './walk-draw.js';

/* ================= passeggiata nel quartiere (stile Nintendogs) ================= */
const WG = {C:5, R:6, home:[2,5]};
const WPL = {
  '1,4':'fontana', '3,4':'panchina', '2,3':'parco', '4,5':'mercato', '0,3':'gelateria', '4,3':'bottega',
  '1,2':'nonna', '3,1':'lago', '2,0':'collina', '4,0':'giostre', '0,0':'bosco'
};
const WPLACE = {
  fontana:  {e:'⛲', n:'Fontana', col:'#8fd3ff', d:'Acqua fresca e una monetina per un desiderio.'},
  panchina: {e:'🪑', n:'Panchina', col:'#c9a46a', d:'Un posto all\'ombra per riprendere fiato.'},
  parco:    {e:'🌳', n:'Parco', col:'#7fd38a', d:'Prato, palla e altri blob a passeggio.'},
  mercato:  {e:'🧺', n:'Mercato', col:'#ffb36b', d:'Frutta e verdura a metà prezzo.'},
  gelateria:{e:'🍦', n:'Gelateria', col:'#ffb8d5', d:'Il gelato più buono del quartiere.'},
  bottega:  {e:'🛍️', n:'Bottega', col:'#b79bff', d:'Accessori e mobili scontati, diversi ogni giorno.'},
  nonna:    {e:'👵', n:'Casa di Nonna Blobba', col:'#ffd86b', d:'Ha sempre un regalino pronto. Uno al giorno.'},
  lago:     {e:'🦆', n:'Lago', col:'#6fb8ff', d:'Anatre, sassi piatti e tesori sulla riva.'},
  collina:  {e:'⛰️', n:'Collina', col:'#9fcf8a', d:'Da lassù si vede tutto il quartiere.'},
  giostre:  {e:'🎠', n:'Giostre', col:'#ff8fbf', d:'Un giro sulla giostra non si nega a nessuno.'},
  bosco:    {e:'🌲', n:'Bosco', col:'#4f9f63', d:'Lontano e misterioso: chi esplora trova tesori.'}
};
const PAL_NAMES = ['Pallina','Gnocco','Biscotto','Ciuffo','Mirtillo','Pepe','Zuccherino','Briciola','Polpetta','Fagiolo','Tortellino','Bignè','Pistacchio','Nocciola','Marshmallow','Caramella'];
const wKey = (c, r) => c + ',' + r;
const wMan = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
const wRange = s => (s.walkRange || 8) + (s.stage === 'adult' && s.form === 'esploratore' ? 4 : 0);
let walk = null;   // stato della passeggiata in corso

function walkDay(){
  const d = dayKey(Date.now());
  if (!world.walkDay || world.walkDay.d !== d){
    const free = []; for (let c = 0; c < WG.C; c++) for (let r = 0; r < WG.R; r++){ const k = wKey(c, r); if (!WPL[k] && k !== wKey(...WG.home)) free.push(k); }
    const myst = []; while (myst.length < 2){ const k = pick(free); if (!myst.includes(k)) myst.push(k); }
    world.walkDay = {d, nonna:false, myst, shop:null, market:null};
  }
  return world.walkDay;
}
function placeAt(k){ if (WPL[k]) return WPL[k]; return world.walkDay && world.walkDay.myst.includes(k) ? 'mistero' : null; }

function openWalk(){
  const s = state; if (!s) return;
  if (s.walk){ say(`${nm(s)} è già fuori a passeggio.`); return; }
  if (s.sick){ say(`${nm(s)} è malato: prima la medicina.`); return; }
  if (s.energy < 15){ say(`${nm(s)} è troppo stanco per uscire. Fallo riposare un po'.`); return; }
  if (!world.pals) world.pals = {};
  walkDay();
  walk = {mode:'plan', route:[WG.home.slice()], t0: performance.now()};
  $('wTitle').textContent = 'Dove andiamo?';
  $('walkOverlay').hidden = false; $('wPanel').hidden = true;
  walkButtons(); walkMsg(`Disegna il percorso: tocca o trascina sugli incroci vicini. ${nm(s)} può fare ${wRange(s)} passi in tutto, ritorno compreso.`);
  requestAnimationFrame(() => { sizeWalkCv(); requestAnimationFrame(walkLoop); });
}
function sizeWalkCv(){ const cv = $('wCv'), dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(cv.clientWidth * dpr); cv.height = Math.round(cv.clientHeight * dpr); }
function walkMsg(m){ $('wMsg').textContent = m; }
function walkButtons(list){
  const a = $('wActions');
  if (walk.mode === 'plan'){
    const n = walk.route.length - 1, back = wMan(walk.route[walk.route.length - 1], WG.home);
    $('wInfo').textContent = `Passi ${n} + ritorno ${back} / ${wRange(state)}`;
    a.innerHTML = `<button class="btn ghost" data-w="close" type="button">Annulla</button><button class="btn ghost" data-w="undo" type="button"${n ? '' : ' disabled'}>↩︎ Indietro</button><button class="btn" data-w="go" type="button"${n ? '' : ' disabled'}>Si parte!</button>`;
    return;
  }
  $('wInfo').textContent = '';
  a.innerHTML = (list || []).map(([id, label, ghost]) => `<button class="btn${ghost ? ' ghost' : ''}" data-w="${id}" type="button">${label}</button>`).join('')
    + (walk.mode === 'go' && !walk.homeward ? `<button class="btn ghost small" data-w="home" type="button">🏠 Torna a casa</button>` : '');
}
function walkNodePx(c, r, w, h){ const m = 26, top = 46; return [m + c * (w - 2 * m) / (WG.C - 1), top + r * (h - top - m) / (WG.R - 1)]; }
function walkTryAdd(k){
  const route = walk.route, last = route[route.length - 1], [c, r] = k.split(',').map(Number);
  if (route.length > 1){ const prev = route[route.length - 2]; if (prev[0] === c && prev[1] === r){ route.pop(); walkButtons(); return; } }
  if (wMan(last, [c, r]) !== 1) return;
  if (route.length + wMan([c, r], WG.home) > wRange(state)){ walkMsg(`Troppo lontano: ${nm(state)} non ce la farebbe a tornare. Passeggiando spesso diventa più resistente!`); sfx.sad && sfx.sad(); return; }
  route.push([c, r]); sfx.pop && sfx.pop();
  const pk = placeAt(k); walkMsg(pk ? (pk === 'mistero' ? '❓ Un posto misterioso… chissà cosa c\'è!' : `${WPLACE[pk].e} ${WPLACE[pk].n}: ${WPLACE[pk].d}`) : 'Continua il percorso, oppure parti!');
  walkButtons();
}
function walkHitNode(e){
  const cv = $('wCv'), b = cv.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
  let best = null, bd = 26;
  for (let c = 0; c < WG.C; c++) for (let r = 0; r < WG.R; r++){ const [px, py] = walkNodePx(c, r, b.width, b.height), d = Math.hypot(px - x, py - y); if (d < bd){ bd = d; best = wKey(c, r); } }
  return best;
}
let walkDrag = false, walkLastK = null;

/* ---------- partenza ---------- */
function walkPathHome(from){ const p = []; let [c, r] = from; while (r !== WG.home[1]){ r += Math.sign(WG.home[1] - r); p.push([c, r]); } while (c !== WG.home[0]){ c += Math.sign(WG.home[0] - c); p.push([c, r]); } return p; }
function walkStart(){
  const s = state;
  const out = walk.route.slice(), path = out.concat(walkPathHome(out[out.length - 1]));
  Object.assign(walk, {mode:'go', path, outLen: out.length - 1, x:0, speed:120, ents:[], loot:{coins:0, items:[]}, met:[], seen:[], visited:{}, stop:null, hop:0, jump:0, tired:false, homeward:false, msgT:0, lastNode:0, puddleJump:false});
  $('wTitle').textContent = `A passeggio con ${nm(s)}`; $('wPanel').hidden = true;
  mission('walk'); s.walks = (s.walks || 0) + 1;
  log(s, Date.now(), `${nm(s)} è uscito a fare una passeggiata nel quartiere.`);
  walkSpawn(0); walkButtons(); walkMsg('Si parte! Tocca i regali, gli amici e le cose che luccicano.');
}
const EDGE = 440;
function walkSpawn(i){
  // eventi lungo il tratto i (da path[i] a path[i+1])
  const home = i >= walk.outLen, n = Math.random() < (home ? .35 : .75) ? (Math.random() < .3 && !home ? 2 : 1) : 0;
  const types = [['gift', 2], ['friend', 2.4], ['sniff', 1.5], ['glint', 1.4 + (isForm('esploratore') ? 1 : 0)], ['puddle', 1], ['butterfly', .9], ['cat', .7]];
  if (!walk.pooped) types.push(['poop', 1.3]);
  const used = [];
  for (let k = 0; k < n; k++){
    let t = pickWeighted(types); if (used.includes(t)) continue; used.push(t);
    if (t === 'poop') walk.pooped = true;
    const x = (i + rf(.3, .78)) * EDGE + k * 60;
    walk.ents.push(walkMakeEnt(t, x));
  }
}
function walkMakeEnt(t, x){
  const e = {t, x, done:false, ph: Math.random() * 6};
  if (t === 'friend') e.pal = walkPal();
  return e;
}
function walkPal(){
  const names = Object.keys(world.pals);
  if (names.length && Math.random() < .5){ const n = pick(names); return Object.assign({name:n}, world.pals[n]); }
  const free = PAL_NAMES.filter(n => !world.pals[n]); const name = free.length ? pick(free) : pick(PAL_NAMES);
  const stage = Math.random() < .65 ? 'adult' : 'child';
  const spec = {stage, egg:'pois', bv: pick(Object.keys(VARS.baby)), shiny: Math.random() < .03, hat:null, face:null, neck:null, back:null};
  if (stage === 'child'){ spec.cv = pick(Object.keys(VARS.child)); spec.childForm = VARS.child[spec.cv].fam; }
  else { spec.form = pick(ADULT_ORDER.slice(0, 10)); spec.cv = FORMS[spec.form].fam; const v = Object.keys(VARS.adult).find(k => VARS.adult[k].base === spec.form); spec.av = v && Math.random() < .15 ? v : null; }
  if (Math.random() < .5){ const hats = Object.keys(ACC).filter(k => slotKey(k) === 'hat'); if (hats.length) spec.hat = pick(hats); }
  return {name, spec, met:0};
}

/* ---------- azioni ---------- */
function walkReward(kind, v, label){
  const s = state;
  if (kind === 'coins'){ addCoins(v); walk.loot.coins += v; floatWalk(`+${v}★`); }
  else if (kind === 'food'){ world.inv[v] = (world.inv[v] || 0) + 1; walk.loot.items.push(`${FOODS[v].e} ${FOODS[v].n}`); floatWalk(FOODS[v].e); }
  else if (kind === 'sticker'){ if (s.stickers[v]){ addCoins(5); walk.loot.coins += 5; walk.loot.items.push(`${STICKERS[v].e} doppione (+5★)`); } else { giveSticker(s, v); walk.loot.items.push(`${STICKERS[v].e} figurina: ${STICKERS[v].n}`); } floatWalk(STICKERS[v].e); }
  else if (kind === 'acc'){ world.hats.push(v); walk.loot.items.push(`${ACC[v].e || '🎀'} ${ACC[v].n}`); floatWalk(ACC[v].e || '🎀'); }
  if (label) walkMsg(label);
  sfx.coin && sfx.coin(); saveSoon();
}
function floatWalk(t){ walk.floats = walk.floats || []; walk.floats.push({t, x: walk.x, y: 0, life: 1.4}); }
function walkAction(a, v){
  const s = state; if (!walk) return;
  if (a === 'close'){ closeWalk(); return; }
  if (walk.mode === 'plan'){
    if (a === 'undo' && walk.route.length > 1){ walk.route.pop(); walkButtons(); }
    if (a === 'go') walkStart();
    return;
  }
  const st = walk.stop;
  if (a === 'home'){
    if (walk.homeward) return;
    const cur = Math.min(walk.path.length - 1, Math.floor(walk.x / EDGE + .001));
    const at = walk.path[cur]; walk.path = walk.path.slice(0, cur + 1).concat(walkPathHome(at)); if (walk.path.length - 1 <= cur) walk.path.push(WG.home.slice()); walk.outLen = cur; walk.homeward = true;
    walk.ents = walk.ents.filter(e => e.x < (cur + 1) * EDGE || e.done);
    if (walk.mode === 'place'){ walk.mode = 'go'; $('wPanel').hidden = true; }
    walk.stop = null; walkMsg('Si torna a casa!'); walkButtons(); return;
  }
  if (a === 'cont'){ if (st) st.e.done = true; walk.stop = null; if (walk.mode === 'place'){ walk.mode = 'go'; $('wPanel').hidden = true; } walkButtons(); return; }
  if (!st && walk.mode !== 'place' && a !== 'jump' && a !== 'end') return;
  const e = st && st.e;
  switch (a){
    case 'gift': {
      const r = Math.random();
      if (r < .45) walkReward('coins', rnd(3, 9), 'Dentro c\'erano delle stelline!');
      else if (r < .85) walkReward('food', pick(TASTY), 'Un pacchetto pieno di cose buone!');
      else { const cheap = Object.keys(ACC).filter(k => ACC[k].price > 0 && ACC[k].price <= 40 && !world.hats.includes(k)); if (cheap.length) walkReward('acc', pick(cheap), 'Un accessorio nuovo nel pacchetto!'); else walkReward('coins', 12, 'Un bel mucchietto di stelline!'); }
      s.fun = clamp(s.fun + 5); e.done = true; walk.stop = null; break; }
    case 'greet': {
      const p = e.pal; p.met = (p.met || 0) + 1; world.pals[p.name] = {spec: p.spec, met: p.met};
      if (!walk.met.includes(p.name)) walk.met.push(p.name);
      s.fun = clamp(s.fun + 8); s.trust = clamp(s.trust + 1); gainXp(2);
      e.hearts = 1.6; sfx.giggle && sfx.giggle();
      let m = p.met === 1 ? `${p.name} è nuovo del quartiere. Piacere!` : p.met === 3 ? `${p.name} e ${nm(s)} ormai sono amici di passeggiata!` : pick([`${p.name} è contentissimo di rivedervi!`, `${p.name} e ${nm(s)} si annusano felici.`, `${p.name} fa le feste!`]);
      if (p.met >= 3 && Math.random() < .5){ const f = pick(TASTY); world.inv[f] = (world.inv[f] || 0) + 1; walk.loot.items.push(`${FOODS[f].e} regalo di ${p.name}`); m += ` Vi regala ${FOODS[f].e}!`; }
      walkMsg(m); e.done = true; walk.stop = null; break; }
    case 'pickup': s.trust = clamp(s.trust + 2); gainXp(1); walkMsg('Raccolta! Che padrone modello 👍'); e.done = true; e.clean = true; walk.stop = null; break;
    case 'leave': s.trust = clamp(s.trust - 1); walkMsg('Un vicino si affaccia e brontola… 😤'); e.done = true; walk.stop = null; break;
    case 'sniff': e.sniffT = 2.2; walk.stop = {e, wait:true}; walkMsg(`${nm(s)} annusa tutto con grande attenzione…`); walkButtons([]); return;
    case 'pull': s.fun = clamp(s.fun - 3); walkMsg('Tiri il guinzaglio: un po\' di broncio.'); e.done = true; walk.stop = null; break;
    case 'dig': {
      const near = walkNearPlace(), pool = near && PLACES[near] ? PLACES[near].stickers : null, r = Math.random();
      if (pool && r < .3) walkReward('sticker', pick(pool), 'Hai trovato una figurina sepolta!');
      else if (r < .8) walkReward('coins', rnd(4, isForm('esploratore') ? 16 : 11), 'Un tesoretto di stelline!');
      else walkReward('food', pick(TASTY), 'Qualcuno aveva nascosto uno spuntino!');
      e.done = true; walk.stop = null; break; }
    case 'calm': s.trust = clamp(s.trust + 1); walkMsg(`${nm(s)} si tranquillizza. Il gatto se ne va sbadigliando.`); e.done = true; e.gone = true; walk.stop = null; break;
    case 'jump': walk.puddleJump = true; walk.jump = 1; sfx.boing && sfx.boing(); walkButtons(); return;
    case 'end': closeWalk(); return;
    default: if (walk.mode === 'place') return placeAction(a, v);
  }
  saveSoon(); walkButtons();
}
function walkNearPlace(){ const i = Math.round(walk.x / EDGE), n = walk.path[Math.min(i, walk.path.length - 1)]; const p = n && placeAt(wKey(...n)); return p === 'lago' || p === 'parco' || p === 'bosco' ? p : pick(['parco', 'lago', 'bosco']); }

/* ---------- luoghi ---------- */
function openPlace(pk){
  const s = state, P = pk === 'mistero' ? {e:'❓', n:'Posto misterioso'} : WPLACE[pk], d = walkDay();
  walk.mode = 'place'; walk.place = pk; walkButtons([]);
  if (!walk.visited[pk]){ walk.visited[pk] = true; if (!world.wplaces) world.wplaces = {}; if (!world.wplaces[pk] && pk !== 'mistero'){ world.wplaces[pk] = Date.now(); log(s, Date.now(), `${nm(s)} ha scoperto: ${P.n}.`); } }
  if (PLACES[pk]){ fulfill('walk', pk); if (s.traits.favPlace === pk){ s.fun = clamp(s.fun + 10); if (reveal(s, 'favPlace')) walk.loot.items.push(`💡 Il suo posto preferito è: ${P.n}`); } }
  let acts = [];
  if (pk === 'fontana') acts = [['drink', '💧 Bevi'], ['coinwish', '🪙 Monetina (1★)']];
  else if (pk === 'panchina') acts = [['rest', '😌 Riposa']];
  else if (pk === 'parco') acts = [['ball', '⚽ Gioca a palla'], ['pdig', '🔍 Cerca nel prato']];
  else if (pk === 'mercato'){ if (!d.market) d.market = TASTY.slice().sort(() => Math.random() - .5).slice(0, 3); acts = d.market.map(f => ['buyfood', `${FOODS[f].e} ${Math.max(1, Math.ceil(FOODS[f].price / 2))}★`, f]); }
  else if (pk === 'gelateria') acts = [['icecream', '🍦 Gelato (6★)']];
  else if (pk === 'bottega'){ if (!d.shop){ const pool = [...Object.keys(ACC).filter(k => ACC[k].price > 0 && !world.hats.includes(k)).map(k => 'acc:' + k), ...Object.keys(FURN).filter(k => FURN[k].price > 0 && !world.furn.includes(k)).map(k => 'furn:' + k)]; d.shop = pool.sort(() => Math.random() - .5).slice(0, 2); }
    acts = d.shop.filter(x => { const [kd, id] = x.split(':'); return kd === 'acc' ? !world.hats.includes(id) : !world.furn.includes(id); }).map(x => { const [kd, id] = x.split(':'), X = kd === 'acc' ? ACC[id] : FURN[id]; return ['buyitem', `${X.e || '🎁'} ${X.n} · ${Math.round(priceOf(kd, id) * .75)}★`, x]; }); }
  else if (pk === 'nonna') acts = d.nonna ? [] : [['nonna', '🎁 Saluta la nonna']];
  else if (pk === 'lago') acts = [['ducks', '🦆 Guarda le anatre'], ['stones', '🪨 Cerca sassi']];
  else if (pk === 'collina') acts = [['view', '🌄 Guarda il panorama']];
  else if (pk === 'giostre') acts = [['ride', '🎠 Un giro (4★)']];
  else if (pk === 'bosco') acts = [['explore', '🔦 Esplora il bosco']];
  else if (pk === 'mistero') acts = [['mystery', '❓ Guarda cosa c\'è']];
  walk.placeDone = {};
  renderPlace(pk, acts, pk === 'nonna' && d.nonna ? 'La nonna vi ha già fatto un regalo oggi. Torna domani!' : '');
}
function renderPlace(pk, acts, note){
  const P = pk === 'mistero' ? {e:'❓', n:'Posto misterioso', d:'Oggi qui c\'è qualcosa di strano…'} : WPLACE[pk];
  walk.placeActs = acts;
  $('wPanel').innerHTML = `<div class="wplace"><div class="big-em" style="font-size:44px">${P.e}</div><div><b>${P.n}</b><small>${P.d}</small></div></div>
    ${note ? `<p class="shopnote" style="margin:6px 0 0">${note}</p>` : ''}
    <div class="row" style="margin-top:10px">${acts.map(([id, l, v]) => `<button class="btn small${walk.placeDone[id + (v || '')] ? ' ghost' : ''}" data-w="${id}" ${v ? `data-v="${v}"` : ''} type="button"${walk.placeDone[id + (v || '')] ? ' disabled' : ''}>${l}</button>`).join('')}<button class="btn small ghost" data-w="cont" type="button">Prosegui →</button></div>`;
  $('wPanel').hidden = false;
}
function placeAction(a, v){
  const s = state, d = walkDay(), pay = n => { if (!rich() && world.coins < n){ walkMsg('Non hai abbastanza stelline.'); return false; } addCoins(-n); return true; };
  const done = () => { walk.placeDone[a + (v || '')] = true; renderPlace(walk.place, walk.placeActs, ''); saveSoon(); };
  switch (a){
    case 'drink': s.thirst = clamp(s.thirst + 40); walkMsg('Slurp! Acqua freschissima.'); walk.jump = .6; break;
    case 'coinwish': if (!pay(1)) return; if (Math.random() < .4){ walkReward('food', pick(TASTY), 'Il desiderio si è avverato: uno spuntino!'); } else { s.fun = clamp(s.fun + 6); walkMsg('Plin! La monetina affonda. Chissà…'); } break;
    case 'rest': s.energy = clamp(s.energy + 15); walk.tired = false; walkMsg(`${nm(s)} si riposa al sole. Energia +15.`); break;
    case 'ball': s.fun = clamp(s.fun + 15); s.energy = clamp(s.energy - 4); note('ball', 2); walk.jump = 1; walkMsg('Che corse sul prato!');
      if (Math.random() < .5){ const e = walkMakeEnt('friend', walk.x + 90); walk.ents.push(e); walkMsg('Che corse sul prato! Arriva qualcuno a giocare…'); } break;
    case 'pdig': walk.stop = {e:{}}; walkAction('dig'); walk.stop = null; walk.mode = 'place'; break;
    case 'buyfood': { const p = Math.max(1, Math.ceil(FOODS[v].price / 2)); if (!pay(p)) return; world.inv[v] = (world.inv[v] || 0) + 1; walk.loot.items.push(`${FOODS[v].e} ${FOODS[v].n} dal mercato`); walkMsg(`${FOODS[v].e} in dispensa!`); setTrayKey(''); break; }
    case 'icecream': if (!pay(6)) return; s.fun = clamp(s.fun + 25); if (s.hunger >= 97) s.fat = Math.min(100, (s.fat || 0) + 10); s.hunger = clamp(s.hunger + 10); note('sweet', 1); walkMsg('Gnam! Il gelato più buono del mondo 🍦'); break;
    case 'buyitem': { const [kd, id] = v.split(':'), p = Math.round(priceOf(kd, id) * .75); if (!pay(p)) return; if (kd === 'acc') world.hats.push(id); else world.furn.push(id); walk.loot.items.push(`${(kd === 'acc' ? ACC : FURN)[id].e || '🎁'} ${(kd === 'acc' ? ACC : FURN)[id].n} (in armadio/soffitta)`); walkMsg('Comprato! Lo trovi nel negozio, già tuo.'); break; }
    case 'nonna': d.nonna = true; if (Math.random() < .5){ const f = pick(TASTY), g = pick(TASTY); world.inv[f] = (world.inv[f] || 0) + 1; world.inv[g] = (world.inv[g] || 0) + 1; walk.loot.items.push(`${FOODS[f].e}${FOODS[g].e} dalla nonna`); walkMsg(`La nonna vi riempie le tasche: ${FOODS[f].e} ${FOODS[g].e}!`); } else walkReward('coins', 10, 'La nonna vi dà la paghetta: 10 stelline!'); s.trust = clamp(s.trust + 2); break;
    case 'ducks': s.fun = clamp(s.fun + 10); walkMsg('Qua qua! Le anatre seguono il blob lungo la riva.'); break;
    case 'stones': { const r = Math.random(); if (r < .35) walkReward('sticker', pick(PLACES.lago.stickers), 'Sulla riva c\'era una figurina!'); else if (r < .8) walkReward('coins', rnd(5, 12), 'Un sasso luccicante vale stelline!'); else walkMsg('Solo sassi normali. Però bellissimi.'); break; }
    case 'view': { const first = !(world.wplaces && world.wplaces.collinaView); if (!world.wplaces) world.wplaces = {}; world.wplaces.collinaView = 1; s.fun = clamp(s.fun + 8); gainXp(first ? 10 : 3); if (first) walkReward('coins', 15, 'Che vista! Prima volta in cima: 15 stelline!'); else walkMsg('Da quassù si vede la vostra casa!'); break; }
    case 'ride': if (!pay(4)) return; s.fun = clamp(s.fun + 25); s.energy = clamp(s.energy - 5); walk.jump = 1; walkMsg('Wiii! Giro, giro tondo…'); break;
    case 'explore': { const r = Math.random(); if (r < .5) walkReward('sticker', pick(PLACES.bosco.stickers), 'Nel bosco hai trovato una figurina rara!'); else walkReward('coins', rnd(8, 18), 'Un tesoro tra le radici!'); s.energy = clamp(s.energy - 4); note('walk', 1); break; }
    case 'mystery': { const r = Math.random(); if (r < .3){ const e = walkMakeEnt('friend', walk.x + 90); walk.ents.push(e); walkMsg('Dal nulla spunta un blob!'); } else if (r < .65) walkReward('coins', rnd(8, 20), 'Un forziere nascosto!'); else { const cheap = Object.keys(ACC).filter(k => ACC[k].price > 0 && !world.hats.includes(k)); if (cheap.length) walkReward('acc', pick(cheap), 'Un accessorio misterioso!'); else walkReward('coins', 20, 'Un sacchetto di stelline!'); } break; }
  }
  done();
}

/* ---------- ciclo ---------- */
function walkTap(e){
  const cv = $('wCv'), b = cv.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
  if (walk.mode !== 'go') return;
  const cam = walk.x - b.width * .35;
  for (const en of walk.ents){ if (en.done) continue; const sx = en.x - cam; if (Math.abs(sx - x) < 40 && y > b.height * .45){
    if (en.t === 'gift' || en.t === 'glint'){ walk.stop = {e: en}; walkAction(en.t === 'gift' ? 'gift' : 'dig'); return; }
    if (en.t === 'friend'){ walk.stop = {e: en}; walkAction('greet'); return; }
    if (en.t === 'puddle'){ walkAction('jump'); return; }
  } }
  const bx = b.width * .35; if (Math.abs(x - bx) < 40 && Math.abs(y - b.height * .72) < 60){ walk.jump = .8; sfx.boing && sfx.boing(); }
}
function walkLoop(now){
  if (!walk || $('walkOverlay').hidden) return;
  const cv = $('wCv'); if (!cv.width) sizeWalkCv();
  const dt = Math.min(.05, (now - (walk.lt || now)) / 1000); walk.lt = now;
  const c = cv.getContext('2d'), dpr = cv.width / (cv.clientWidth || 1), w = cv.clientWidth, h = cv.clientHeight, t = now / 1000;
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  if (walk.mode === 'plan') drawWalkMap(c, w, h, t);
  else { walkUpdate(dt, w); drawWalkStreet(c, w, h, t, dt); }
  requestAnimationFrame(walkLoop);
}
function walkUpdate(dt, w){
  const s = state;
  if (walk.jump > 0) walk.jump = Math.max(0, walk.jump - dt * 1.6);
  for (const en of walk.ents){ if (en.hearts) en.hearts = Math.max(0, en.hearts - dt); if (en.sniffT){ en.sniffT -= dt; if (en.sniffT <= 0){ en.sniffT = 0; s.fun = clamp(s.fun + 6); en.done = true; walk.stop = null; walkMsg(Math.random() < .3 ? 'Ha fiutato qualcosa che luccica!' : 'Che profumi interessanti!'); if (Math.random() < .3) walk.ents.push(walkMakeEnt('glint', walk.x + 70)); walkButtons(); } } }
  if (walk.mode !== 'go' || walk.stop) return;
  const total = (walk.path.length - 1) * EDGE;
  const sp = walk.speed * (walk.homeward || walk.x >= walk.outLen * EDGE ? 1.35 : 1) * (s.energy < 12 ? .55 : 1) * (bodyOf(s) === 'obeso' ? .75 : 1);
  const nx = Math.min(total, walk.x + sp * dt);
  // eventi davanti
  for (const en of walk.ents){
    if (en.done || en.x > nx + 34 || en.x < walk.x - 200) continue;
    if (en.t === 'butterfly'){ if (nx >= en.x - 30){ en.done = true; s.fun = clamp(s.fun + 3); walk.jump = 1; walkMsg(`${nm(s)} saltella dietro a una farfalla! 🦋`); } continue; }
    if (en.t === 'puddle'){ if (nx >= en.x - 10){ en.done = true; if (walk.puddleJump || walk.jump > .2){ walkMsg('Salto perfetto sopra la pozzanghera!'); gainXp(1); } else { s.hygiene = clamp(s.hygiene - 15); walkMsg('SPLASH! Dritto nella pozzanghera… 💦'); } walk.puddleJump = false; walkButtons(); }
      else if (nx >= en.x - 160 && !en.warned){ en.warned = true; walkMsg('Attento, una pozzanghera! Tocca Salta!'); walkButtons([['jump', '💦 Salta!']]); } continue; }
    if (nx >= en.x - 34){
      walk.x = en.x - 34; walk.stop = {e: en};
      const P = en.pal;
      const map = {
        gift: [['🎁 Un pacchetto per terra!', [['gift', '🎁 Apri'], ['cont', 'Lascia', 1]]]],
        friend: [[`Ecco ${P ? P.name : 'un blob'}${P && P.met ? ' (già vi conoscete!)' : ''}`, [['greet', '👋 Saluta'], ['cont', 'Prosegui', 1]]]],
        poop: [[`Ops… ${nm(s)} ha fatto i bisogni 💩`, [['pickup', '🧻 Raccogli'], ['leave', 'Lascia lì', 1]]]],
        sniff: [[`${nm(s)} si ferma: c'è un odore interessante…`, [['sniff', '👃 Lascialo annusare'], ['pull', 'Tira il guinzaglio', 1]]]],
        glint: [['Qualcosa luccica tra l\'erba ✨', [['dig', '✨ Scava'], ['cont', 'Prosegui', 1]]]],
        cat: [[`Un gatto! ${nm(s)} si spaventa 🙀`, [['calm', '🤗 Calmalo']]]]
      }[en.t];
      if (map){ walkMsg(map[0][0]); walkButtons(map[0][1]); if (en.t === 'cat') { s.fun = clamp(s.fun - 3); walk.jump = .5; } }
      return;
    }
  }
  walk.hop += dt * 9;
  // arrivo a un incrocio
  const prevNode = Math.floor(walk.x / EDGE + 1e-6), node = Math.floor(nx / EDGE + 1e-6);
  walk.x = nx;
  if (node > prevNode){
    s.energy = clamp(s.energy - 1.8); s.hunger = clamp(s.hunger - 1); s.thirst = clamp(s.thirst - 1.5); s.fun = clamp(s.fun + 1.5);
    walk.lastNode = node;
    if (node < walk.path.length - 1) walkSpawn(node);
    if (node >= walk.path.length - 1){ walkEnd(); return; }
    if (s.energy < 12 && !walk.homeward && node < walk.outLen){ walkMsg(`${nm(s)} è stanchissimo… meglio tornare a casa.`); walkAction('home'); return; }
    const pk = node <= walk.outLen ? placeAt(wKey(...walk.path[node])) : null;
    if (pk && !walk.visited[pk]) openPlace(pk);
  }
}
function walkEnd(){
  const s = state, steps = walk.path.length - 1, range = s.walkRange || 8;
  walk.mode = 'end';
  note('walk', Math.max(1, Math.round(steps / 3))); gainXp(Math.min(12, steps));
  let grew = false;
  if (steps >= range - 2 && range < 24){ s.walkRange = range + 1; grew = true; }
  log(s, Date.now(), `${nm(s)} è tornato dalla passeggiata: ${steps} isolati${walk.met.length ? `, ha incontrato ${walk.met.join(', ')}` : ''}.`);
  save();
  $('wTitle').textContent = 'Bentornati a casa!';
  const L = walk.loot;
  $('wPanel').innerHTML = `<div class="rows">
    <div class="rowi"><div class="em">👣</div><div><b>${steps} isolati</b><small>${Object.keys(walk.visited).filter(k => k !== 'mistero').map(k => WPLACE[k].e).join(' ') || 'Un giro tranquillo'}</small></div></div>
    ${L.coins ? `<div class="rowi"><div class="em">⭐</div><div><b>+${L.coins} stelline</b><small>Trovate per strada</small></div></div>` : ''}
    ${L.items.map(it => `<div class="rowi"><div class="em">🎒</div><div><b>${esc(it)}</b></div></div>`).join('')}
    ${walk.met.length ? `<div class="rowi"><div class="em">👋</div><div><b>Amici incontrati</b><small>${walk.met.map(esc).join(', ')}</small></div></div>` : ''}
    ${grew ? `<div class="rowi hl"><div class="em">💪</div><div><b>Più resistente!</b><small>Ora può fare ${wRange(s)} passi in tutto: potete andare più lontano.</small></div></div>` : `<div class="rowi"><div class="em">💪</div><div><b>Resistenza ${wRange(s)} passi</b><small>Usa quasi tutti i passi per allenarlo e andare più lontano.</small></div></div>`}
  </div>`;
  $('wPanel').hidden = false; walkMsg(''); walkButtons([['end', 'Fine']]);
}
function closeWalk(){ $('walkOverlay').hidden = true; walk = null; setTrayKey(''); save(); render(true); }

/* collegamenti da fare all'avvio: li chiama boot.js, quando tutti i moduli sono già caricati */
export function initWalk(){
  $('wCv').addEventListener('pointerdown', e => {
    if (!walk) return;
    if (walk.mode === 'plan'){ e.preventDefault(); walkDrag = true; const k = walkHitNode(e); walkLastK = k; if (k) walkTryAdd(k); return; }
    walkTap(e);
  });
  $('wCv').addEventListener('pointermove', e => { if (!walk || walk.mode !== 'plan' || !walkDrag) return; const k = walkHitNode(e); if (k && k !== walkLastK){ walkLastK = k; walkTryAdd(k); } });
  document.addEventListener('pointerup', () => { walkDrag = false; walkLastK = null; });
  $('wActions').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b) walkAction(b.dataset.w); });
  $('wPanel').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b) walkAction(b.dataset.w, b.dataset.v); });
  $('wExit').addEventListener('click', () => {
    if (!walk || walk.mode === 'plan' || walk.mode === 'end'){ closeWalk(); return; }
    walkAction('home');
  });
}

export { EDGE, WG, WPLACE, openWalk, placeAt, wKey, wMan, wRange, walk, walkNodePx, walkPathHome };
