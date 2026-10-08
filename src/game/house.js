import { $, HOUR, MIN, STAR, clamp, esc, lim, pick, rnd } from './util.js';
import { FORMS, LINES, RAR, STATS, VARS, rarStars, statColor, statIcon } from './blobs.js';
import { FURN, PLACES, ROOM_PRICES, THEMES } from './catalog.js';
import {
  blobById, blobEmoji, formName, giveSticker, homeIdx, houseBlobs, kindOf, log, newBlob, newRoom, nm,
  presentIn, rarOf, seeForm, setState, state, view, world
} from './state.js';
import { BODY, bodyOf, setEggNotice } from './evolution.js';
import { save, saveSoon } from './save.js';
import { chat, rich, say, sfx, toast } from './texts.js';
import { mission } from './wishes.js';
import { closeSheet, openSheet, render, setDiaryKey, setTrayKey, tab } from '../legacy/interface.js';
import { curRoom } from '../legacy/shop.js';
import { burst, lastTouch, pet, resetScene } from '../room/scene.js';
import { editMode, setDragF, setEditMode } from '../room/pointer.js';
import { focusBlob, setGuests, setGuestsInit } from '../room/guests.js';
import { drawSpecimen, houseEnts, houseLayout } from '../places/house-view.js';
import { setValleyKey, valleyEnts } from '../places/valley.js';

/* ================= casa, stanze e valle ================= */
let activeRoom = 0;
let casaView = 'room', pendingLeave = null;
function setRoom(i, focusId){
  if (!world) return;
  activeRoom = lim(i, 0, world.rooms.length - 1); world.activeRoom = activeRoom;
  const pres = presentIn(activeRoom), owner = world.rooms[activeRoom].blob;
  const f = pres.find(b => b.id === focusId) || pres.find(b => b.id === owner) || pres[0]
    || (blobById(owner) && blobById(owner).walk ? blobById(owner) : null);
  setState(f ? view(f) : null);
  casaView = 'room'; pendingLeave = null;
  if (typeof resetScene === 'function') resetScene();
  setGuests([]); setGuestsInit(false);
  setTrayKey(''); setDiaryKey(''); render(true);
}
function showValley(){ casaView = 'valley'; setEditMode(false); window.scrollTo(0, 0); setValleyKey(''); render(true); }
function showHouse(){ casaView = 'house'; setEditMode(false); pendingLeave = null; window.scrollTo(0, 0); blobListKey = ''; render(true); }
function pickW(opts){ const tot = opts.reduce((a, o) => a + o[1], 0); let r = Math.random() * tot; for (const [v, w] of opts){ if ((r -= w) <= 0) return v; } return opts.length ? opts[opts.length - 1][0] : null; }
function bond(a, b, n){
  if (!a || !b || a.id === b.id) return;
  if (!world.bonds) world.bonds = {};
  const k = [a.id, b.id].sort().join('|'), was = world.bonds[k] || 0; world.bonds[k] = was + n;
  if (was < 25 && world.bonds[k] >= 25){ log(view(a), Date.now(), `${nm(a)} e ${nm(b)} sono diventati migliori amici!`); log(view(b), Date.now(), `${nm(b)} e ${nm(a)} sono diventati migliori amici!`); if (giveSticker(view(a), 'amiciblob')) toast('Nuova figurina: 🤝 Amici per la pelle!'); }
}
const bestFriend = b => { let best = null, bv = 0; for (const k in world.bonds){ const [x, y] = k.split('|'); if (x !== b.id && y !== b.id) continue; const o = blobById(x === b.id ? y : x); if (o && world.bonds[k] > bv){ bv = world.bonds[k]; best = o; } } return bv >= 8 ? best : null; };
let lastSocial = {};
function socialFx(a, b){
  if (!a || !b) return;
  const k = [a.id, b.id].sort().join('|'), now = Date.now();
  if (now - (lastSocial[k] || 0) < 6000) return; lastSocial[k] = now;
  a.fun = clamp(a.fun + 3); b.fun = clamp(b.fun + 3); a.trust = clamp(a.trust + .5); b.trust = clamp(b.trust + .5);
  bond(a, b, 1); mission('social'); saveSoon();
}
function applyMove(b, to, isVisit){
  const from = b.at, now = Date.now(); b.at = to;
  const room = world.rooms[to];
  if (isVisit){
    b.visit = {to, until: now + rnd(4, 12) * MIN};
    const there = houseBlobs().filter(x => x.at === to && x.id !== b.id && x.stage !== 'egg');
    log(view(b), now, there.length ? `${nm(b)} è andato a trovare ${nm(there[0])} in ${room.name}.` : `${nm(b)} è andato a curiosare in ${room.name}.`);
  } else b.visit = null;
  saveSoon();
  void from;
}
function moveBlob(b, to, isVisit){
  if (to < 0 || to === b.at) { if (!isVisit) b.visit = null; return; }
  const focused = state && state.id === b.id && casaView === 'room' && tab === 'casa' && !document.hidden;
  if (focused){
    if (Date.now() - lastTouch < 45000 || !pet.ground || pet.held || pendingLeave || !$('sheet').hidden){ if (b.visit) b.visit.until = Date.now() + 2*MIN; else b.nextVisitAt = Date.now() + 3*MIN; return; }
    pendingLeave = {id: b.id, to, isVisit}; pet.beh = {type:'leave', until: Date.now() + 15000};
    chat(isVisit ? pick(['Vado a fare un giro!', 'Torno subito!', 'Vado a trovare gli altri!']) : 'Torno nella mia stanza!', 1);
    return;
  }
  applyMove(b, to, isVisit);
}
function visits(now){
  if (!world || world.rooms.length < 2) return;
  const hb = houseBlobs();
  for (const b of hb){
    const busy = b.stage === 'egg' || b.walk || b.sleeping || b.sick || !b.name;
    if (b.visit){ if (now > b.visit.until && !b.walk) moveBlob(b, homeIdx(b), false); continue; }
    if (busy) continue;
    if (b.at !== homeIdx(b) && homeIdx(b) >= 0){ moveBlob(b, homeIdx(b), false); continue; }
    if (now < (b.nextVisitAt || 0)){ continue; }
    b.nextVisitAt = now + rnd(6, 16) * MIN;
    if (Math.random() < .6){
      const opts = [];
      world.rooms.forEach((r, i) => { if (i === b.at) return; const n = hb.filter(x => x.at === i && x.stage !== 'egg' && !x.walk).length; const toys = r.furnOn.filter(f => FURN[f] && FURN[f].special).length; opts.push([i, 1 + n * 3 + toys * .4]); });
      const i = pickW(opts); if (i !== null && i !== undefined) moveBlob(b, i, true);
    }
  }
  // incontri nelle stanze che non stai guardando
  world.rooms.forEach((r, i) => {
    if (casaView === 'room' && i === activeRoom && tab === 'casa') return;
    const here = hb.filter(x => x.at === i && x.stage !== 'egg' && !x.sleeping && !x.walk);
    if (here.length >= 2 && Math.random() < 1 / 150){
      const [a, c] = here.sort(() => Math.random() - .5);
      const k = [a.id, c.id].sort().join('|');
      if (now - (lastSocial[k] || 0) > 20 * MIN){ socialFx(a, c); lastSocial[k] = now; log(view(a), now, `${nm(a)} e ${nm(c)} hanno giocato insieme in ${r.name}.`); }
    }
  });
}
function blobPlace(b){
  if (b.walk) return `A passeggio ${PLACES[b.walk.place].dove}`;
  const r = world.rooms[b.at]; if (!r) return 'Nella Valle';
  return b.visit ? `In visita: ${r.name}` : `In ${r.name}`;
}
function blobStatus(b){
  if (b.stage === 'egg') return '🥚';
  const st = [];
  if (b.sick) st.push('🤒'); if (b.sleeping) st.push('💤'); if (b.wish) st.push(b.wish.e);
  if (b.hunger < 30) st.push('🍽️'); if (b.thirst < 30) st.push('💧'); if (b.hygiene < 30) st.push('🛁'); if (b.fun < 30) st.push('😞');
  return st.join('') || '😊';
}
let blobListKey = '';
function renderBlobList(){
  const hb = houseBlobs();
  const key = hb.map(b => b.id + b.at + blobStatus(b) + (b.name || '') + b.stage + (b.walk ? 1 : 0) + (b.visit ? 1 : 0) + STATS.map(([k]) => Math.round(b[k] / 10)).join('')).join(',');
  if (key === blobListKey) return; blobListKey = key;
  $('blobList').innerHTML = hb.map(b => { const bf = b.stage !== 'egg' ? bestFriend(b) : null;
    return `<div class="rowi"><div class="em">${blobEmoji(b)}</div><div><b>${esc(b.name || 'Senza nome')}</b><small class="where">${blobPlace(b)}${bf ? ` · amico di ${esc(nm(bf))}` : ''}</small><span class="st">${blobStatus(b)}</span>${b.stage !== 'egg' ? `<span class="minibars">${STATS.map(([k, l]) => `<span title="${l} ${Math.round(b[k])}%">${statIcon[k]}<i><b style="width:${Math.round(b[k])}%;background:${b[k] < 25 ? '#e5484d' : statColor[k]}"></b></i></span>`).join('')}</span>` : ''}</div>
    <button class="btn small" data-goblob="${b.id}" type="button">${b.walk ? 'Vedi' : 'Vai'}</button></div>`; }).join('')
    + (world.valley.length ? `<p class="shopnote" style="margin-top:4px">${world.valley.length} ${world.valley.length === 1 ? 'blob riposa' : 'blob riposano'} nella Valle.</p>` : '');
}

function canLay(b, now){ return b.stage === 'adult' && b.adultAt && now - b.adultAt > 3*HOUR && b.trust >= 50 && now - (b.lastEgg || 0) > 20*HOUR && !b.walk && !b.sleeping && b.health > 50; }
function layEgg(p){
  const now = Date.now(); p.lastEgg = now;
  const egg = newBlob('', p); world.blobs.push(egg);
  let i = world.rooms.findIndex(r => !r.blob);
  if (i < 0 && world.rooms.length < 2){ world.rooms.push(newRoom(world.rooms.length)); i = world.rooms.length - 1; }
  if (i >= 0){ world.rooms[i].blob = egg.id; egg.at = i; } else { world.valley.push(egg.id); egg.at = null; }
  log(view(p), now, `${p.name} ha deposto un uovo! ${i >= 0 ? 'È nella stanza ' + world.rooms[i].name + '.' : 'In casa non c\'era posto: è al sicuro nella Valle dei Blob.'}`);
  setEggNotice({room: i, parent: p.name, shiny: egg.shiny, egg: egg.egg}); seeForm('egg:' + egg.egg, egg);
  save();
}
function freeRoom(){ return world.rooms.findIndex(r => !r.blob); }
function toValley(i){
  const r = world.rooms[i], b = blobById(r.blob); if (!b) return;
  if (b.walk){ toast(`${nm(b)} è a passeggio: aspetta che torni.`); return; }
  r.blob = null; world.valley.push(b.id); b.wish = null; b.at = null; b.visit = null;
  log(view(b), Date.now(), `${nm(b)} è andato a vivere nella Valle dei Blob.`);
  if (i === activeRoom) setRoom(i);
  save(); openHouse(); toast(`${nm(b)} è partito per la Valle`);
}
function fromValley(id){
  const i = freeRoom(); if (i < 0){ toast('Serve una stanza libera: compra una stanza o manda qualcuno nella Valle.'); return; }
  const b = blobById(id); world.valley = world.valley.filter(x => x !== id);
  world.rooms[i].blob = id; b.at = i; b.visit = null; b.last = Date.now(); if (b.stage === 'egg') b.hatchAt = Math.max(b.hatchAt, Date.now() + 2*MIN);
  b.nextWishAt = Date.now() + 3*MIN;
  log(view(b), Date.now(), `${nm(b)} è tornato a casa dalla Valle.`);
  save(); closeSheet(); setRoom(i); say(`Bentornato ${nm(b)}!`);
}
function buyRoom(){
  const n = world.rooms.length; if (n >= 4) return;
  const p = ROOM_PRICES[n];
  if (!rich() && world.coins < p){ toast(`Ti mancano ${p - world.coins} stelline.`); return; }
  if (!rich()) world.coins -= p; world.rooms.push(newRoom(n)); sfx.coin(); save(); render(true); if (!$('sheet').hidden) openHouse(); toast(`Nuova stanza: ${world.rooms[n].name}!`);
}
function setTheme(i, th){
  const r = world.rooms[i]; if (r.theme === th) return;
  if (!rich() && world.coins < 10){ toast('Cambiare carta da parati costa 10 stelline.'); return; }
  if (!rich()) world.coins -= 10; r.theme = th; sfx.coin(); save(); render(true); openHouse();
}
function openHouse(){
  const rows = world.rooms.map((r, i) => {
    const b = r.blob && blobById(r.blob);
    return `<div class="rowi${i === activeRoom ? ' hl' : ''}"><div class="em">${b ? blobEmoji(b) : '🚪'}</div><div><b>${esc(r.name)}</b><small>${b ? `${esc(nm(b))} · ${formName(b)}${b.shiny && b.stage !== 'egg' ? ' dorato' : ''}` : 'Stanza libera'}</small></div>
      <span style="display:flex;gap:6px">${b ? `<button class="btn small ghost" data-valley="${i}" type="button">Valle</button>` : ''}<button class="btn small" data-go="${i}" type="button">Vai</button></span></div>`;
  }).join('');
  const n = world.rooms.length;
  const buy = n < 4 ? `<div class="rowi"><div class="em">➕</div><div><b>Nuova stanza</b><small>Per far crescere più blob insieme</small></div><button class="btn small${!rich() && world.coins < ROOM_PRICES[n] ? ' poor' : ''}" data-buyroom type="button">${ROOM_PRICES[n] ? STAR + ROOM_PRICES[n] : 'Gratis'}</button></div>` : '';
  const cur = world.rooms[activeRoom];
  const sw = Object.keys(THEMES).map(k => `<button class="sw" data-th="${k}" type="button" aria-pressed="${cur.theme === k}" aria-label="${THEMES[k].n}" style="background:hsl(${THEMES[k].h},80%,82%)"></button>`).join('');
  const vb = world.valley.map(id => blobById(id)).filter(Boolean);
  const valley = vb.length ? vb.map(b => `<div class="rowi"><div class="em">${blobEmoji(b)}</div><div><b>${esc(nm(b))}</b><small>${formName(b)}${b.shiny && b.stage !== 'egg' ? ' dorato' : ''} · ${b.gen}ª generazione</small></div><button class="btn small" data-back="${b.id}" type="button">Riporta</button></div>`).join('')
    : '<p class="shopnote">Nella Valle non c\'è ancora nessuno. Quando la casa è piena, qui i blob riposano senza bisogni.</p>';
  openSheet('La tua casa', `<div class="rows">${rows}${buy}</div>
    <p class="subhead">Carta da parati: ${esc(cur.name)}</p><p class="shopnote">10 stelline per cambiarla.</p><div class="swatches">${sw}</div>
    <p class="subhead">🏞️ Valle dei Blob</p><div class="rows">${valley}</div>`, body => body.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.go){ closeSheet(); setRoom(+b.dataset.go); }
    else if (b.dataset.valley) toValley(+b.dataset.valley);
    else if (b.dataset.back) fromValley(b.dataset.back);
    else if (b.hasAttribute('data-buyroom')) buyRoom();
    else if (b.dataset.th) setTheme(activeRoom, b.dataset.th);
  }));
}
let presentKey = '';
function renderRoomHead(){
  const rh = $('roomHead'); rh.hidden = !world;
  if (!world) return;
  const pres = presentIn(activeRoom);
  const key = pres.map(b => b.id + blobEmoji(b) + (b.name || '')).join() + (state ? state.id : '') + editMode;
  $('editBtn').textContent = editMode ? '✅ Fatto' : '🛋️ Arreda';
  $('editBtn').setAttribute('aria-pressed', editMode ? 'true' : 'false');
  if (key === presentKey) return; presentKey = key;
  $('presentChips').innerHTML = pres.length > 1 ? pres.map(b => `<button class="room" data-focus="${b.id}" type="button" aria-pressed="${!!state && state.id === b.id}"><span class="e">${blobEmoji(b)}</span>${esc(b.name || 'Uovo')}</button>`).join('')
    : `<span class="shopnote" style="align-self:center;white-space:nowrap">${esc(world.rooms[activeRoom].name)}</span>`;
}
const NEED_TIP = {hunger:'Trascina il cibo alla sua bocca', thirst:'Dagli l\'acqua dal vassoio del cibo', fun:'Coccole, lanci, palla e minigiochi', energy:'Mettilo a nanna con 🌙', hygiene:'Lavalo con la spugna e pulisci la cacca', health:'Se sta male usa la medicina'};
function showEvo(id){
  const b = blobById(id); if (!b) return;
  const k = kindOf(b), F = FORMS[k], r = rarOf(b);
  if (state && state.id === id){ burst('confetti', 40); sfx.level(); }
  openSheet(b.stage === 'adult' ? `${nm(b)} si è evoluto!` : `${nm(b)} è cresciuto!`, `<div class="loot"><canvas class="dexbig" id="evoCv" width="360" height="360" aria-label="${formName(b)}"></canvas>
    <p style="text-align:center"><b>${formName(b)}${b.shiny ? ' dorato ✨' : ''}</b></p><p class="rarline" style="color:${RAR[r].c}">${rarStars(r)} ${RAR[r].n}${r >= 3 ? '!' : ''}</p><p class="story">${b.av ? `Linea ${LINES[VARS.adult[b.av].line].e} ${LINES[VARS.adult[b.av].line].n}. ` : ''}${F.ab}</p>
    ${b.stage === 'child' ? '<p class="shopnote">Da qui a 10 ore diventerà adulto. Come giochi con lui decide in cosa si trasformerà: guarda la sua tendenza in alto.</p>' : '<p class="shopnote">Lo trovi nell\'Enciclopedia dei blob. Se lo tratti bene, tra qualche ora potrebbe deporre un uovo.</p>'}</div>
    <div class="sheet-actions"><button class="btn" data-close type="button">Che bello!</button></div>`, body => drawSpecimen(body.querySelector('#evoCv'), b));
}

/* collegamenti da fare all'avvio: li chiama boot.js, quando tutti i moduli sono già caricati */
export function initHouse(){
  $('backHouse').addEventListener('click', showHouse);
$('needsBar').addEventListener('click', () => {
  const s = state; if (!s || s.stage === 'egg') return;
  const bo = bodyOf(s), B = BODY[bo];
  openSheet(`Come sta ${nm(s)}`, `<div class="rows">${STATS.map(([k, l]) => { const v = Math.round(s[k]);
    return `<div class="rowi"><div class="em">${statIcon[k]}</div><div style="flex:1;min-width:0"><b>${l} · <span style="color:${v < 25 ? '#e5484d' : 'inherit'}">${v}%</span></b><span class="bar" style="display:block;margin:5px 0 3px"><i style="width:${v}%;background:${v < 25 ? '#e5484d' : statColor[k]}"></i></span><small>${NEED_TIP[k]}</small></div></div>`; }).join('')}
    <div class="rowi"><div class="em">${B.e}</div><div><b>Corporatura · ${B.n}${bo === 'obeso' ? ` (${Math.round(s.fat)}%)` : ''}</b><small>${B.tip}</small></div></div></div>
    <div class="sheet-actions"><button class="btn" data-close type="button">Chiudi</button></div>`);
});
  $('editBtn').addEventListener('click', () => {
    setEditMode(!editMode); setDragF(null);
    if (editMode){ const r = curRoom(); toast(r && r.furnOn.length ? 'Trascina i mobili per spostarli. Toccane uno per toglierlo.' : 'Questa stanza non ha mobili: comprali nel negozio, reparto Arredo.', 3200); }
    render(true);
  });
  $('presentChips').addEventListener('click', e => { const b = e.target.closest('[data-focus]'); if (!b || (state && b.dataset.focus === state.id)) return; focusBlob(b.dataset.focus); });
  $('valleyBtn').addEventListener('click', showValley);
  $('backHouse2').addEventListener('click', showHouse);
  $('valleyCv').addEventListener('click', e => {
    const r = $('valleyCv').getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bd = 1e9;
    for (const id in valleyEnts){ const v = valleyEnts[id]; if (!v.px) continue; const d = Math.hypot(x - v.px, y - v.py); if (d < v.pr * 1.4 && d < bd){ bd = d; best = v; } }
    if (best){ best.tag = Date.now() + 2500; }
  });
  $('manageBtn').addEventListener('click', openHouse);
  $('blobList').addEventListener('click', e => { const b = e.target.closest('[data-goblob]'); if (!b) return; const x = blobById(b.dataset.goblob); if (!x) return; const i = x.walk ? homeIdx(x) : x.at; setRoom(i < 0 ? 0 : i, x.id); });
  $('houseCv').addEventListener('click', e => {
    if (!world) return;
    const cvh = $('houseCv'), r = cvh.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const L = houseLayout(r.width, r.height);
    for (let i = 0; i < 4; i++){ const q = L.rooms[i]; if (x < q.x || x > q.x + q.w || y < q.y || y > q.y + q.h) continue;
      if (i < world.rooms.length){
        const hit = presentIn(i).find(b => { const he = houseEnts[b.id]; return he && Math.abs(x - (q.x + he.x * q.w)) < q.h * .16 && y > q.y + q.h * .45; });
        setRoom(i, hit ? hit.id : undefined); return;
      }
      if (i === world.rooms.length){ const p = ROOM_PRICES[i];
        openSheet('Nuova stanza', `<p class="shopnote">Una stanza in più per far crescere altri blob, ospitare le visite e arredare.</p><div class="sheet-actions"><button class="btn ghost" data-close type="button">Non ora</button><button class="btn" id="buyR" type="button">${p ? STAR + p : 'Gratis'}</button></div>`,
          b => { b.querySelector('#buyR').onclick = () => { closeSheet(); buyRoom(); closeSheet(); }; }); }
      return;
    }
  });
}

// gli altri moduli non possono riassegnare una variabile importata: la cambiano con questi
export function setCasaView(v){ casaView = v; }
export function setPendingLeave(v){ pendingLeave = v; }
export function setBlobListKey(v){ blobListKey = v; }
export function setPresentKey(v){ presentKey = v; }

export {
  activeRoom, applyMove, blobPlace, canLay, casaView, layEgg, moveBlob, openHouse, pendingLeave, pickW,
  renderBlobList, renderRoomHead, setRoom, showEvo, showHouse, socialFx, visits
};
