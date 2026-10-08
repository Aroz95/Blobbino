import { lim, pick, rf, rnd } from '../game/util.js';
import { blobById, nm, presentIn, setState, state, view, world } from '../game/state.js';
import { activeRoom, pickW, setPresentKey, setRoom, socialFx } from '../game/house.js';
import { chat, say, sfx } from '../game/texts.js';
import { render, setDiaryKey, setTrayKey } from '../legacy/interface.js';
import {
  FLOOR, G, H, R, W, awake, ball, burst, ctx, geo, groundY, pet, petVisible, setExpr, tokens
} from './scene.js';
import { setEditMode } from './pointer.js';
import { hasFurn } from '../draw/furniture.js';
import { roundRect } from '../draw/blob.js';
import { blobR, drawPet } from '../draw/pet.js';

/* ---------- ospiti: gli altri blob presenti nella stanza ---------- */
let guests = [], guestsInit = false;
function mkGuest(id, entering){
  const b = blobById(id), r = blobR(b);
  return {id, x: entering ? W + r * 1.2 : rf(.15, .85) * W, y: FLOOR - r * .88 * .78, vx:0, vy:0, ground:true, rot:0, vr:0, sq:1, sqv:0, dir:-1,
    hop:0, wob:0, look:null, expr:null, exprUntil:0, anim:null, held:false, beh: entering ? {type:'enter', until: Date.now() + 8000} : null, sink:0, bub:null, leaving:false};
}
function syncGuests(){
  if (!world) return;
  const pres = presentIn(activeRoom);
  if (!state && pres.length){
    const b = pres[0]; setState(view(b)); geo();
    Object.assign(pet, {x: W + R, y: groundY(), vx:0, vy:0, ground:true, rot:0, held:false, anim:null, expr:null, look:null, sink:0});
    pet.beh = {type:'enter', until: Date.now() + 8000}; guests = guests.filter(g => g.id !== b.id); setPresentKey(''); render(true);
  }
  for (const b of pres){ if (state && b.id === state.id) continue; if (!guests.find(g => g.id === b.id)) guests.push(mkGuest(b.id, guestsInit)); }
  for (const g of guests) if (!pres.find(b => b.id === g.id) || (state && g.id === state.id)) g.leaving = true;
  guestsInit = true;
}
function focusBlob(id){
  const g = guests.find(x => x.id === id), b = blobById(id); if (!b) return;
  if (!g){ setRoom(activeRoom, id); return; }
  const old = state ? blobById(state.id) : null;
  guests = guests.filter(x => x !== g);
  if (old && old.at === activeRoom){ const og = mkGuest(old.id, false); og.x = pet.x; guests.push(og); }
  setState(view(b)); geo();
  Object.assign(pet, {x: g.x, vx:0, vy:0, ground:true, rot:0, vr:0, sq:1, sqv:0, held:false, beh:null, anim:null, expr:null, look:null, hop:0, wob:0, airFrom:0, sink:0, sinkT:0});
  pet.y = groundY(); setEditMode(false); setTrayKey(''); setDiaryKey(''); setPresentKey('');
  render(true); say(`${nm(b)}!`, 1200);
}
const petFree = () => state && petVisible() && awake() && !pet.held;
function walkG(g, tx, dt, sp = 1){ const b = blobById(g.id), r = blobR(b), dx = tx - g.x; if (Math.abs(dx) < 4){ g.hop = 0; return true; } g.dir = Math.sign(dx); g.x += Math.sign(dx) * Math.min(Math.abs(dx), r * 2.4 * sp * dt); g.hop += dt * 9; return false; }
function guestChoose(g, b){
  const opts = [[{type:'wander', tx: rf(.1, .9) * W}, 3], [{type:'idle'}, 1.5]];
  if (petFree() && state.stage !== 'egg'){ opts.push([{type:'hug'}, 2], [{type:'tag'}, 1.5], [{type:'jump'}, 1.5], [{type:'talk'}, 2]); if (hasFurn('palla')) opts.push([{type:'kick'}, 1.5]); }
  if (guests.filter(x => !x.leaving && x !== g).length) opts.push([{type:'buddy'}, 1.5]);
  return Object.assign({until: Date.now() + rnd(3000, 6500)}, pickW(opts));
}
function updateGuests(dt){
  const now = Date.now(), g0 = G();
  for (const g of guests){
    const b = blobById(g.id); if (!b){ g.dead = true; continue; }
    const r = blobR(b), gY = FLOOR - r * .88 * .78;
    g.sqv += ((1 - g.sq) * 220 - g.sqv * 13) * dt; g.sq = lim(g.sq + g.sqv * dt, .55, 1.4); g.wob = Math.max(0, g.wob - dt * 1.6);
    if (g.leaving){ walkG(g, W + r * 1.6, dt, 1.3); if (g.x > W + r * 1.2) g.dead = true; continue; }
    if (b.stage === 'egg'){ g.y = gY; continue; }
    if (!g.ground){
      g.vy += g0 * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.x = lim(g.x, r, W - r);
      if (g.y >= gY){ g.y = gY; if (g.vy > 420){ g.vy = -g.vy * .35; g.sqv -= 3; } else { g.ground = true; g.vy = 0; g.vx = 0; } }
      continue;
    }
    g.y = gY;
    if (b.sleeping){ g.hop = 0; continue; }
    if (!g.beh || now > g.beh.until || g.beh.done) g.beh = guestChoose(g, b);
    const B = g.beh, me = state ? blobById(state.id) : null;
    switch (B.type){
      case 'enter':
        if (!B.tx) B.tx = rf(.3, .75) * W;
        if (walkG(g, B.tx, dt)){ B.done = true; g.bub = {t: pick(['Ciao!','Eccomi!','Permesso!','Si può?']), until: now + 1600};
          if (petFree()){ setExpr('happy', 1.5); chat(`Ciao ${nm(b)}!`, .9); } }
        break;
      case 'wander': if (walkG(g, B.tx, dt, B.fast ? 1.8 : 1)) B.type = 'idle'; break;
      case 'idle': g.hop = 0; break;
      case 'hug': case 'talk': {
        if (!petFree()){ B.done = true; break; }
        const side = g.x < pet.x ? -1 : 1, tx = lim(pet.x + side * (R + r) * (B.type === 'hug' ? .78 : 1.15), r, W - r);
        if (walkG(g, tx, dt, 1.2)){ g.look = {x: pet.x, y: pet.y}; pet.look = {x: g.x, y: g.y};
          if (!B.did){ B.did = 1; B.until = now + 2600;
            if (B.type === 'hug'){ g.expr = 'love'; g.exprUntil = performance.now() + 2500; setExpr('love', 2.5); burst('heart', 6, (g.x + pet.x) / 2, pet.y - R * .3); sfx.purr(); g.bub = {t: '♡', until: now + 1800}; }
            else { const topic = pick(['🍓','⚽','🌈','🎵','🦋','🍦','⭐','🏀']); g.bub = {t: topic + '?', until: now + 1500}; setTimeout(() => { if (state) chat(pick([`${topic}! Sì!`, `Mmh, ${topic}…`, `${topic} è il mio preferito!`]), 1); }, 1300); }
            socialFx(me, b); } }
        break; }
      case 'tag': {
        if (!petFree()){ B.done = true; break; }
        if (walkG(g, pet.x + (g.x < pet.x ? -1 : 1) * (R + r) * .7, dt, 1.9) && !B.did){
          B.did = 1; g.bub = {t: 'Preso!', until: now + 1300}; if (pet.ground){ pet.vy = -H * .8; pet.ground = false; sfx.boing(); }
          chat(pick(['Ce l\'ho io!', 'Ora ti prendo!']), 1); socialFx(me, b);
          g.beh = {type:'wander', tx: pet.x < W / 2 ? W * .88 : W * .12, until: now + 2600, fast: 1};
        }
        break; }
      case 'jump':
        if (!B.n) B.n = 0;
        if (B.n < 3 && g.ground){ B.n++; g.vy = -H * rf(.8, 1.05); g.ground = false; sfx.boing(); if (B.n === 1){ g.bub = {t: 'Salta con me!', until: now + 1400}; socialFx(me, b); }
          if (petFree() && pet.ground){ pet.vy = -H * .85; pet.ground = false; } }
        else if (B.n >= 3) B.done = true;
        break;
      case 'kick':
        if (!hasFurn('palla') || ball.held){ B.done = true; break; }
        if (walkG(g, ball.x - Math.sign((state ? pet.x : W / 2) - ball.x || 1) * (r + ball.r) * .8, dt, 1.4) && ball.y > FLOOR - ball.r * 3){
          ball.vx = Math.sign((state ? pet.x : W / 2) - ball.x || 1) * rf(300, 480); ball.vy = -rf(200, 380); ball.ground = false; ball.by = 'blob'; sfx.pop(); g.sqv -= 2;
          g.bub = {t: 'Passaggio!', until: now + 1200}; socialFx(me, b); B.done = true; }
        break;
      case 'buddy': {
        const o = guests.find(x => !x.leaving && x !== g && blobById(x.id) && blobById(x.id).stage !== 'egg');
        if (!o){ B.done = true; break; }
        const ro = blobR(blobById(o.id));
        if (walkG(g, o.x + (g.x < o.x ? -1 : 1) * (r + ro) * .8, dt) && !B.did){ B.did = 1; g.expr = 'love'; g.exprUntil = performance.now() + 2200; o.expr = 'love'; o.exprUntil = performance.now() + 2200; burst('heart', 4, (g.x + o.x) / 2, g.y - r * .4); socialFx(b, blobById(o.id)); B.until = now + 2400; }
        break; }
    }
  }
  guests = guests.filter(g => !g.dead);
}
function drawGuests(t){
  for (const g of guests){
    const b = blobById(g.id); if (!b) continue;
    drawPet(t, view(b), g, true);
    const r = blobR(b);
    if (g.bub && Date.now() < g.bub.until){
      ctx.font = `800 ${Math.max(12, Math.round(r * .32))}px "M PLUS Rounded 1c", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(g.bub.t).width + 16, bx = lim(g.x, tw / 2 + 4, W - tw / 2 - 4), by = Math.max(16, g.y - r * 1.35);
      ctx.fillStyle = tokens.panel; roundRect(bx - tw / 2, by - 13, tw, 26, 12); ctx.fill(); ctx.fillStyle = tokens.ink; ctx.fillText(g.bub.t, bx, by + 1);
    }
    if (b.name){ ctx.font = `800 ${Math.max(10, Math.round(r * .2))}px "M PLUS Rounded 1c", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = tokens.ink; ctx.globalAlpha = .55; ctx.fillText(b.name, g.x, FLOOR + H * .045); ctx.globalAlpha = 1; }
  }
}

// gli altri moduli non possono riassegnare una variabile importata: la cambiano con questi
export function setGuests(v){ guests = v; }
export function setGuestsInit(v){ guestsInit = v; }

export { drawGuests, focusBlob, guests, syncGuests, updateGuests };
