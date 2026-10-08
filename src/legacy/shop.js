import { $, STAR, esc } from '../game/util.js';
import { FORMS } from '../game/blobs.js';
import {
  ACAD_PRICE, ACC, CIRCLES, FOODS, FURN, RUGS, SLOTS, TASTY, acadIds, slotKey
} from '../game/catalog.js';
import {
  drawFurnV, fKey, fvarOf, nm, ownsF, palFor, placeF, roomWithF, setShopSec, shopSec, state, unplaceF,
  world
} from '../game/state.js';
import { activeRoom } from '../game/house.js';
import { save } from '../game/save.js';
import { addCoins, dayKey, rich, sfx, toast } from '../game/texts.js';
import { fulfill } from '../game/wishes.js';
import { openSheet, render } from './interface.js';
import { burst, tokens } from '../room/scene.js';
import { drawAcc } from '../draw/items.js';
import { drawRug, fName } from '../draw/furniture.js';
import { drawSpecimen } from '../places/house-view.js';

/* ================= negozio ================= */
let shopSub = {acc:'all', furn:'floor'};
const curRoom = () => world ? world.rooms[activeRoom] : null;
function dailyOffer(){
  if (!world) return null;
  const day = dayKey(Date.now()); let h = 7; for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pool = [...Object.keys(ACC).filter(k => ACC[k].price > 0 && !world.hats.includes(k)).map(k => ['acc', k]),
    ...Object.keys(FURN).filter(k => !world.furn.includes(k)).map(k => ['furn', k])];
  if (!pool.length) return null;
  const [kind, id] = pool[h % pool.length];
  return {kind, id, price: Math.round((kind === 'acc' ? ACC : FURN)[id].price * .6)};
}
function priceOf(kind, id){
  const o = dailyOffer(); if (o && o.kind === kind && o.id === id) return o.price;
  if (kind === 'furn') id = String(id).split('@')[0];
  return (kind === 'food' ? FOODS : kind === 'acc' ? ACC : kind === 'rug' ? RUGS : FURN)[id].price;
}
function sizeCv(cv){ const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth || 120, h = cv.clientHeight || 90; cv.width = w * dpr; cv.height = h * dpr; const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h); return {c, w, h}; }
function drawMiniBlob(c, w, h, pal, worn, scale = .3){
  const R2 = Math.min(w, h) * scale, ry2 = R2 * .88;
  c.save(); c.translate(w / 2, h * .62);
  if (worn.back) drawAcc(c, worn.back, R2, ry2, 0, pal);
  const g = c.createRadialGradient(-R2*.35, -ry2*.45, R2*.1, 0, 0, R2*1.15); g.addColorStop(0, pal.a); g.addColorStop(1, pal.b);
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, R2, ry2, 0, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-R2*.42, -ry2*.5, R2*.14, R2*.08, -.6, 0, 7); c.fill();
  c.fillStyle = '#ff8fb3'; c.globalAlpha = .55; c.beginPath(); c.ellipse(-R2*.43, -ry2*.08 + R2*.2, R2*.12, R2*.07, 0, 0, 7); c.ellipse(R2*.43, -ry2*.08 + R2*.2, R2*.12, R2*.07, 0, 0, 7); c.fill(); c.globalAlpha = 1;
  c.fillStyle = c.strokeStyle = '#3b2842'; c.lineWidth = Math.max(1.5, R2*.05); c.lineCap = 'round';
  for (const d of [-1, 1]){ c.beginPath(); c.ellipse(d*R2*.3, -ry2*.08, R2*.085, R2*.125, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(d*R2*.3 - R2*.03, -ry2*.08 - R2*.05, R2*.032, 0, 7); c.fill(); c.fillStyle = '#3b2842'; }
  c.beginPath(); c.arc(0, -ry2*.08 + R2*.22, R2*.09, .2*Math.PI, .8*Math.PI); c.stroke();
  for (const k of ['neck', 'face', 'hat']) if (worn[k]) drawAcc(c, worn[k], R2, ry2, 0, pal);
  c.restore();
}
function renderShop(){
  const s = state, list = $('shopList'), room = curRoom();
  document.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-selected', b.dataset.s === shopSec ? 'true' : 'false'));
  const coins = world ? world.coins : 0;
  const buyBtn = (kind, id) => { const p = priceOf(kind, id); return `<button class="btn small${!rich() && coins < p ? ' poor' : ''}" data-buy type="button">${p ? STAR + p : 'Prendi'}</button>`; };
  // offerta del giorno
  const off = dailyOffer(), ob = $('offer');
  ob.hidden = !off || shopSec === 'food';
  if (off && !ob.hidden){
    const X = (off.kind === 'acc' ? ACC : FURN)[off.id];
    ob.innerHTML = `<canvas data-${off.kind}="${off.id}" aria-hidden="true"></canvas><div><span class="label">Offerta del giorno</span><div><b>${X.n}</b></div><small><s>${X.price}</s> → ${off.price} stelline</small></div>
      <span class="item" data-id="${off.id}" data-k="${off.kind}" style="all:unset">${!rich() && coins < off.price ? `<button class="btn small poor" data-buy type="button">${STAR}${off.price}</button>` : `<button class="btn small" data-buy type="button">${STAR}${off.price}</button>`}</span>`;
  }
  // anteprima del look
  const lk = $('look'); lk.hidden = shopSec !== 'acc' || !s || s.stage === 'egg';
  if (!lk.hidden){
    $('lookTitle').textContent = `Il look di ${nm(s)}`;
    $('lookWorn').innerHTML = Object.keys(SLOTS).map(sl => { const id = s[sl === 'head' ? 'hat' : sl]; return `<span>${SLOTS[sl]}: ${id ? ACC[id].n : '—'}</span>`; }).join('');
  }
  // sottosezioni
  const subs = shopSec === 'acc' ? [['all','Tutti'], ...Object.entries(SLOTS)] : shopSec === 'furn' ? [['floor','Pavimento'],['wall','Parete'],['special','Interattivi'],['rug','Tappeti']] : [];
  $('shopSub').innerHTML = subs.map(([k, n]) => `<button type="button" data-sub="${k}" aria-pressed="${shopSub[shopSec] === k}">${n}</button>`).join('');
  $('shopSub').hidden = !subs.length;
  let html = '';
  if (shopSec === 'food'){
    $('shopNote').textContent = 'Il cibo finisce in dispensa: lo trovi con l\'attrezzo Cibo. Acqua e pappa sono sempre gratis.';
    for (const id of TASTY){
      const F = FOODS[id], n = world ? (world.inv[id] || 0) : 0;
      const tags = s && s.known.favFood && s.traits.favFood === id ? '<span class="tag">Preferito</span>' : s && s.known.hateFood && s.traits.hateFood === id ? '<span class="tag">Lo odia</span>' : '';
      const fx = [`Pancia +${F.hunger}`, F.fun ? `Gioia +${F.fun}` : '', F.health ? `Salute +${F.health}` : ''].filter(Boolean).join(' · ');
      html += `<div class="item" data-id="${id}" data-k="food"><div class="em">${F.e}</div><b>${F.n}${tags}</b><small>${fx}</small>${n ? `<span class="own">In dispensa: ${n}</span>` : ''}${buyBtn('food', id)}</div>`;
    }
  } else if (shopSec === 'acc'){
    $('shopNote').textContent = 'Ogni blob indossa un accessorio per parte: testa, viso, collo e schiena. Quelli comprati valgono per tutti i tuoi blob.';
    if (shopSub.acc === 'all'){ const owned = Object.keys(CIRCLES).filter(c => acadIds(c).every(id => world && world.hats.includes(id)));
      html += `<div class="item acad" data-acad="1"><canvas class="prev" data-acadprev="1" aria-hidden="true"></canvas><b>🪄 Set dell'Accademia di Magia</b><small>Set esclusivo: cappello, tunica e medaglione del tuo circolo. ${owned.length ? 'Hai: ' + owned.map(c => CIRCLES[c].e + ' ' + CIRCLES[c].n).join(', ') : 'Scegli tra 4 circoli.'}</small><button class="btn small" data-acadopen type="button">${STAR}${ACAD_PRICE} · Scegli</button></div>`; }
    for (const id in ACC){
      const A = ACC[id]; if (shopSub.acc !== 'all' && A.slot !== shopSub.acc) continue;
      if (A.set && !(world && world.hats.includes(id))) continue;
      if (A.lv && (!s || s.level < A.lv)){ html += `<div class="item"><canvas class="prev" style="filter:brightness(0);opacity:.15" data-acc="${id}"></canvas><b>???</b><small>Si sblocca con l'amicizia livello ${A.lv}</small></div>`; continue; }
      const own = world && world.hats.includes(id), on = s && s[slotKey(id)] === id;
      html += `<div class="item" data-id="${id}" data-k="acc"><canvas class="prev" data-acc="${id}" aria-hidden="true"></canvas><b>${A.n}</b><small>${SLOTS[A.slot]}${A.float ? ' · lo fa planare' : ''}${on ? ' · lo indossa' : ''}</small>${own ? `<button class="btn small ${on ? 'ghost' : ''}" data-wear type="button">${on ? 'Togli' : 'Indossa'}</button>` : buyBtn('acc', id)}</div>`;
    }
  } else {
    const sub = shopSub.furn;
    if (sub === 'rug'){
      $('shopNote').textContent = 'Il tappeto cambia solo nella stanza in cui sei.';
      for (const id in RUGS){
        const own = world && world.rugs.includes(id), on = room && room.rug === id;
        html += `<div class="item" data-id="${id}" data-k="rug"><canvas class="prev" data-rug="${id}" aria-hidden="true"></canvas><b>${RUGS[id].n}</b><small>${on ? 'In questa stanza' : 'Tappeto'}</small>${own ? `<button class="btn small ${on ? 'ghost' : ''}" data-rugset type="button"${on ? ' disabled' : ''}>${on ? 'In uso' : 'Usa'}</button>` : buyBtn('rug', id)}</div>`;
      }
    } else {
      $('shopNote').textContent = 'Ogni arredo esiste in 4 versioni da comprare a parte: così puoi arredare tutte le stanze. Con Arreda in Casa li sposti, e toccandoli li specchi.';
      for (const bid in FURN){
        const F = FURN[bid];
        if (sub === 'special' ? !F.special : (F.kind !== sub)) continue;
        const v = (shopFv[bid] ?? (room && room.furnOn.includes(bid) ? fvarOf(room, bid) : 0)), id = fKey(bid, v);
        const own = ownsF(bid, v), on = room && room.furnOn.includes(bid) && fvarOf(room, bid) === v;
        const wr = !on && own ? roomWithF(bid, v) : null, where = wr ? wr.name : null;
        const dots = `<span class="fvars">${[0, 1, 2, 3].map(i => `<button type="button" class="fv${i === v ? ' on' : ''}${ownsF(bid, i) ? ' own' : ''}" data-fv="${bid}:${i}" aria-label="${esc(fName(bid, i))}" title="${esc(fName(bid, i))}"><canvas data-fvprev="${bid}@${i}" aria-hidden="true"></canvas></button>`).join('')}</span>`;
        html += `<div class="item" data-id="${id}" data-k="furn"><canvas class="prev" data-furn="${id}" aria-hidden="true"></canvas><b>${esc(fName(bid, v))}</b><small>${F.d}${where ? ` Ora è in: ${esc(where)}.` : ''}</small>${dots}${own ? `<button class="btn small ${on ? 'ghost' : ''}" data-place type="button">${on ? 'Togli' : 'Metti qui'}</button>` : buyBtn('furn', id)}</div>`;
      }
    }
  }
  list.innerHTML = html;
  drawShopPreviews();
}
function drawShopPreviews(){
  const s = state, pal = s && s.stage !== 'egg' ? palFor(s) : FORMS.baby.pal;
  const worn = s ? {hat: s.hat, face: s.face, neck: s.neck, back: s.back} : {};
  if (!$('look').hidden){ const {c, w, h} = sizeCv($('lookCv')); drawMiniBlob(c, w, h, pal, worn, .3); }
  document.querySelectorAll('#tab-negozio canvas[data-acadprev]').forEach(cv => { const {c, w, h} = sizeCv(cv); drawMiniBlob(c, w, h, pal, {hat:'acad_cometa_cap', neck:'acad_cometa_med', back:'acad_cometa_robe'}, .27); });
  document.querySelectorAll('#tab-negozio canvas[data-acc]').forEach(cv => {
    const id = cv.dataset.acc, {c, w, h} = sizeCv(cv), one = {}; one[slotKey(id)] = id;
    drawMiniBlob(c, w, h, pal, one, .27);
  });
  document.querySelectorAll('#tab-negozio canvas[data-furn]').forEach(cv => {
    const [id, vv] = cv.dataset.furn.split('@'), F = FURN[id], {c, w, h} = sizeCv(cv);
    const S = Math.min(h * .7, w * .85 / Math.min(F.wf || 1, 3));
    drawFurnV(c, id, +vv || 0, false, w / 2, h / 2, S, 0, false);
  });
  document.querySelectorAll('#tab-negozio canvas[data-fvprev]').forEach(cv => {
    const [id, vv] = cv.dataset.fvprev.split('@'), F = FURN[id], {c, w, h} = sizeCv(cv);
    drawFurnV(c, id, +vv || 0, false, w / 2, h / 2, Math.min(h * .62, w * .8 / Math.min(F.wf || 1, 3)), 0, false);
  });
  document.querySelectorAll('#tab-negozio canvas[data-rug]').forEach(cv => {
    const id = cv.dataset.rug, {c, w, h} = sizeCv(cv);
    drawRug(c, w / 2, h * .55, w * .42, h * .26, id, tokens.rug, 0);
  });
}
function shopAction(kind, id, act){
  const s = state, room = curRoom();
  if (!world){ toast('Prima dai un nome al tuo uovo.'); return; }
  if (act === 'buy'){
    const p = priceOf(kind, id);
    if (!rich() && world.coins < p){ toast(`Ti mancano ${p - world.coins} stelline. Giochi, eventi, missioni e passeggiate ne fanno guadagnare.`); return; }
    addCoins(-p); sfx.coin();
    if (kind === 'food'){ world.inv[id] = (world.inv[id] || 0) + 1; toast(`${FOODS[id].e} ${FOODS[id].n} in dispensa`); }
    else if (kind === 'acc'){ world.hats.push(id); if (s && s.stage !== 'egg'){ s[slotKey(id)] = id; fulfill('hat', id); toast(`${nm(s)} indossa: ${ACC[id].n.toLowerCase()}!`); } else toast(`${ACC[id].n} nell'armadio`); }
    else if (kind === 'furn'){ const [bid, vv] = id.split('@'), v = +vv || 0; world.furn.push(fKey(bid, v)); if (room) placeF(room, bid, v); toast(`${fName(bid, v)} in ${room ? room.name : 'soffitta'}. Usa Arreda per spostarlo o specchiarlo.`); }
    else if (kind === 'rug'){ world.rugs.push(id); if (room) room.rug = id; toast(`Tappeto ${RUGS[id].n.toLowerCase()} steso!`); }
  } else if (act === 'wear'){
    if (!s || s.stage === 'egg'){ toast('Vai in una stanza con un blob per vestirlo.'); return; }
    const key = slotKey(id);
    if (s[key] === id) s[key] = null; else { s[key] = id; fulfill('hat', id); }
  } else if (act === 'place'){
    if (!room) return;
    const [bid, vv] = id.split('@'), v = +vv || 0;
    if (room.furnOn.includes(bid) && fvarOf(room, bid) === v) unplaceF(room, bid);
    else placeF(room, bid, v);
  } else if (act === 'rug'){ if (room) room.rug = id; }
  save(); render(true);
}
let shopFv = {};
function shopClick(e){
  const fv = e.target.closest('[data-fv]'); if (fv){ const [bid, i] = fv.dataset.fv.split(':'); shopFv[bid] = +i; renderShop(); return; }
  if (e.target.closest('[data-acadopen]')){ openAcademy(); return; }
  const b = e.target.closest('button'), it = e.target.closest('[data-id]'); if (!b || !it) return;
  const act = b.hasAttribute('data-buy') ? 'buy' : b.hasAttribute('data-wear') ? 'wear' : b.hasAttribute('data-place') ? 'place' : b.hasAttribute('data-rugset') ? 'rug' : null;
  if (act) shopAction(it.dataset.k, it.dataset.id, act);
}

function openAcademy(){
  const s = state, ok = s && s.stage !== 'egg';
  const rows = Object.keys(CIRCLES).map(c => { const C = CIRCLES[c], own = acadIds(c).every(id => world.hats.includes(id)), on = ok && acadIds(c).every(id => s[slotKey(id)] === id);
    return `<div class="rowi"><canvas data-circ="${c}" style="width:76px;height:76px;flex:none" aria-hidden="true"></canvas><div style="flex:1;min-width:0"><b>${C.e} Circolo ${C.n}</b><small>${C.m}</small></div>${own ? `<button class="btn small${on ? ' ghost' : ''}" data-acwear="${c}" type="button"${ok ? '' : ' disabled'}>${on ? 'Indossato' : 'Indossa'}</button>` : `<button class="btn small${!rich() && world.coins < ACAD_PRICE ? ' poor' : ''}" data-acbuy="${c}" type="button">${STAR}${ACAD_PRICE}</button>`}</div>`; }).join('');
  openSheet('🪄 Accademia di Magia', `<p class="shopnote" style="margin-bottom:10px">Il set completo del circolo: cappello a punta, tunica e medaglione con lo stemma. Un acquisto, tre pezzi, per tutti i tuoi blob.</p><div class="rows">${rows}</div>`, body => {
    body.querySelectorAll('[data-circ]').forEach(cv => { const c = cv.dataset.circ, base = ok ? Object.assign({}, s) : {stage:'baby', bv:'pois', egg:'pois'}; const [h, n, bk] = acadIds(c); drawSpecimen(cv, Object.assign(base, {hat:h, neck:n, back:bk, face:null}), false); });
    body.addEventListener('click', e => {
      const b = e.target.closest('[data-acbuy]'), w = e.target.closest('[data-acwear]');
      if (b){ const c = b.dataset.acbuy;
        if (!rich() && world.coins < ACAD_PRICE){ toast(`Servono ${ACAD_PRICE} stelline per il set: ne hai ${world.coins}.`); return; }
        addCoins(-ACAD_PRICE); for (const id of acadIds(c)) if (!world.hats.includes(id)) world.hats.push(id);
        if (ok) for (const id of acadIds(c)) s[slotKey(id)] = id;
        sfx.coin(); burst && ok && burst('confetti', 30); save(); render(true);
        toast(`Benvenuto nel Circolo ${CIRCLES[c].n}! ${CIRCLES[c].e}`, 2600); openAcademy(); }
      if (w && ok){ const c = w.dataset.acwear; for (const id of acadIds(c)) s[slotKey(id)] = id; save(); render(true); toast(`${nm(s)} indossa il set del Circolo ${CIRCLES[c].n}`); openAcademy(); }
    });
  });
}

/* collegamenti da fare all'avvio: li chiama boot.js, quando tutti i moduli sono già caricati */
export function initShop(){
  document.querySelector('.seg').addEventListener('click', e => { const b = e.target.closest('button'); if (b){ setShopSec(b.dataset.s); renderShop(); } });
  $('shopSub').addEventListener('click', e => { const b = e.target.closest('[data-sub]'); if (b){ shopSub[shopSec] = b.dataset.sub; renderShop(); } });
  $('shopList').addEventListener('click', shopClick);
  $('offer').addEventListener('click', shopClick);
}

export { curRoom, priceOf, renderShop };
