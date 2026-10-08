import { MIN, rf, rnd } from '../game/util.js';
import { FOODS } from '../game/catalog.js';
import { drawFurnRoom, isForm, state, world } from '../game/state.js';
import { casaView } from '../game/house.js';
import { chat, sfx } from '../game/texts.js';
import { hatchFx, setHatchFx } from '../game/wishes.js';
import { tab, tool } from '../legacy/interface.js';
import { curRoom } from '../legacy/shop.js';
import {
  FLOOR, H, R, RY, W, awake, ball, burst, ctx, dragFood, ev, fit, floorFood, flower, geo, nextFlowerAt,
  pet, petVisible, readTokens, setFlower, setNextFlowerAt, tokens
} from './scene.js';
import { ptr } from './pointer.js';
import { isNight, updateEvent } from './events.js';
import { brain, walkTo } from './brain.js';
import { physics } from './physics.js';
import { setTrampFx, trampFx } from '../draw/items.js';
import { fposPx, hasFurn } from '../draw/furniture.js';
import { drawGuests, syncGuests, updateGuests } from './guests.js';
import { drawHouse } from '../places/house-view.js';
import { drawValley } from '../places/valley.js';
import { drawHoopFront } from './hoop.js';
import { drawPoop, drawRoom, emoji, roundRect } from '../draw/blob.js';
import { drawBall, drawEvent, drawParticles, drawPet } from '../draw/pet.js';

/* ================= ciclo di animazione: ogni fotogramma aggiorna fisica, cervello e disegno ================= */
let lastT = performance.now();
function frame(now){
  const dt = Math.min(.04, (now - lastT) / 1000); lastT = now;
  if (tab === 'casa' && casaView !== 'room' && world){ if (!tokens.panel) readTokens(); if (casaView === 'house') drawHouse(now / 1000, dt); else drawValley(now / 1000, dt); requestAnimationFrame(frame); return; }
  if (tab === 'casa' && fit()){
    syncGuests(); updateGuests(dt);
    geo();
    const t = now / 1000, s = state;
    if (pet.ground) pet.sinkT = 0;
    if (s && awake() && !pet.held && pet.ground && !ptr.down) brain(dt);
    else if (s && petVisible() && s.sleeping && hasFurn('letto') && pet.ground && !pet.held){ const p = fposPx('letto'); walkTo(p.x + p.w*.12, dt, .6); pet.sinkT = -p.S*.2; }
    if (!pet.ground) pet.sinkT = 0;
    pet.sink = (pet.sink || 0) + ((pet.sinkT || 0) - (pet.sink || 0)) * Math.min(1, dt * 8);
    setTrampFx(Math.max(0, trampFx - dt * 3));
    if (s && awake() && !pet.held && pet.ground && ptr.down && pet.beh && pet.beh.type === 'come') brain(dt);
    physics(dt);
    if (s) updateEvent(dt);
    if (isForm('bocciolo') && awake() && !flower && Date.now() > nextFlowerAt){ setFlower({x: rf(.15, .85) * W, t: 0}); setNextFlowerAt(Date.now() + rnd(4, 8) * MIN); chat('Guarda, è sbocciato un fiore!', 1); }
    if (hatchFx){ setHatchFx(0); burst('confetti', 40); sfx.level(); }
    drawRoom(t, isNight());
    if (s && s.poops && !s.walk) for (let i = 0; i < s.poops; i++) drawPoop(W*(.2 + i*.1), FLOOR + H*.03, Math.min(W, H)*.04, t + i);
    if (s && s.gift){ const gx = s.gift.x * W; emoji('🎁', gx, FLOOR - R*.3 - Math.abs(Math.sin(t*3))*4, R*.55); }
    if (ev && ev.type === 'glint') drawEvent(t);
    for (const f of floorFood) emoji(FOODS[f.id].e, f.x, f.y - R*.15, R*.4);
    if (flower){ flower.t += dt; const sc = Math.min(1, flower.t); emoji('🌼', flower.x, FLOOR - R*.25*sc, R*.5*sc + 1); }
    if (ev && ev.type === 'visitor') drawEvent(t);
    if (hasFurn('palla') && ball.y < pet.y) drawBall();
    drawGuests(t);
    drawPet(t);
    if (s && petVisible()){
      const bh = pet.beh;
      if (bh && bh.type === 'hide' && bh.in && hasFurn('tenda')){ const p = fposPx('tenda'); drawFurnRoom(ctx, curRoom(), 'tenda', p.x, p.y, p.S, t, true);
        if ((t % 3) > .2){ ctx.fillStyle = '#fff'; for (const d of [-1, 1]){ ctx.beginPath(); ctx.arc(p.x + d*p.w*.05, p.y + p.S*.3, 2.6, 0, 7); ctx.fill(); } } }
      if (bh && bh.type === 'pit' && bh.in && (pet.sink || 0) > 3 && hasFurn('piscina')){ const p = fposPx('piscina'); drawFurnRoom(ctx, curRoom(), 'piscina', p.x, p.y, p.S, t, true); }
      if (s.sleeping && hasFurn('letto')){ const p = fposPx('letto'); if (Math.abs(pet.x - (p.x + p.w*.12)) < 8){ ctx.fillStyle = '#a893ff'; roundRect(pet.x - R*1.05, pet.y + RY*.05 + (pet.sink || 0), R*2.1, RY*.85, R*.25); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 5; i++){ ctx.beginPath(); ctx.arc(pet.x - R*.7 + i*R*.35, pet.y + RY*.35 + (i % 2)*RY*.2 + (pet.sink || 0), R*.06, 0, 7); ctx.fill(); } } }
    }
    if (hasFurn('palla') && ball.y >= pet.y) drawBall();
    if (hasFurn('canestro')) drawHoopFront(t);
    if (ev && ev.type !== 'glint' && ev.type !== 'visitor') drawEvent(t);
    drawParticles(dt);
    if (s && s.sleeping && !s.walk){ ctx.fillStyle = 'rgba(30,15,60,.32)'; ctx.fillRect(0, 0, W, H); }
    if (dragFood) emoji(FOODS[dragFood.id].e, dragFood.x, dragFood.y - 10, R*.55);
    if (ptr.down && tool === 'sponge') emoji('🧽', ptr.x, ptr.y, R*.5, Math.sin(t*20)*.2);
  }
  requestAnimationFrame(frame);
}

export { frame };
