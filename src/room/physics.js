import { clamp, lim, pick } from '../game/util.js';
import { ACC, FOODS, FREE } from '../game/catalog.js';
import { isForm, state } from '../game/state.js';
import { saveSoon } from '../game/save.js';
import { chat, say, sfx, toast, tone } from '../game/texts.js';
import { budgetXp } from '../game/bond.js';
import { mission } from '../game/wishes.js';
import { setTrayKey } from '../legacy/interface.js';
import {
  FLOOR, G, H, R, RY, W, ball, burst, fallingPot, floorFood, groundY, pet, petVisible, returnFood,
  setExpr, setFallingPot, setFloorFood, squish
} from './scene.js';
import { setTrampFx } from '../draw/items.js';
import { fposPx, hasFurn } from '../draw/furniture.js';
import { HOOP, dunk, scoreHoop } from './hoop.js';

/* ---------- fisica ---------- */
function physics(dt){
  const s = state, g = G();
  // squash a molla
  pet.sqv += ((1 - pet.sq) * 220 - pet.sqv * 13) * dt; pet.sq += pet.sqv * dt; pet.sq = lim(pet.sq, .55, 1.4);
  pet.wob = Math.max(0, pet.wob - dt * 1.6);
  if (!petVisible()) return;
  if (pet.held){
    const nx = pet.x + (pet.hx - pet.x) * Math.min(1, dt * 18), ny = pet.y + (pet.hy - pet.y) * Math.min(1, dt * 18);
    pet.rot = lim((nx - pet.x) * .02, -.5, .5); pet.x = lim(nx, R, W - R); pet.y = lim(ny, RY, groundY());
    return;
  }
  const a = pet.anim;
  if (a){
    a.t += dt;
    if (a.type === 'spin') pet.rot = (a.t / a.dur) * Math.PI * 2;
    if (a.type === 'wave' || a.type === 'dance') pet.rot = Math.sin(a.t * (a.type === 'dance' ? 9 : 7)) * (a.type === 'dance' ? .2 : .08);
    if (a.type === 'dance'){ pet.x = lim(pet.x + Math.cos(a.t * 4.5) * R * 1.2 * dt, R, W - R); if (pet.ground && a.t % .55 < dt){ pet.vy = -H * .35; pet.ground = false; } }
    if (a.type === 'roll'){ pet.x += a.dir * R * 4.5 * dt; pet.rot += a.dir * (R * 4.5 / RY) * dt; if (pet.x < R || pet.x > W - R){ a.dir = -a.dir; pet.x = lim(pet.x, R, W - R); squish(.3); sfx.boing(); } }
    if (a.t > a.dur && a.type !== 'flip'){ pet.anim = null; pet.rot = 0; }
  }
  if (!pet.ground){
    const ppy = pet.y;
    pet.vy += g * (isForm('nuvola') ? .45 : 1) * (state.back && ACC[state.back] && ACC[state.back].float ? .8 : 1) * dt; pet.x += pet.vx * dt; pet.y += pet.vy * dt; pet.rot += pet.vr * dt;
    const thrown = pet.airFrom && !pet.anim;
    if (hasFurn('trampolino') && pet.vy > 0){
      const tp = fposPx('trampolino'), surf = tp.y - tp.S*.12, pb = ppy + RY*.78, bot = pet.y + RY*.78;
      if (pb <= surf + 2 && bot >= surf && Math.abs(pet.x - tp.x) < tp.w * .45){
        const boost = pet.beh && pet.beh.type === 'tramp' && (pet.beh.n || 0) < 5;
        const v = Math.max(pet.vy * .95, boost ? H * 1.9 : 0);
        if (v > H * .8){ pet.y = surf - RY*.78; pet.vy = -Math.min(v, H * 3); setTrampFx(1); squish(.3); tone(420, .16, 'sine', .1, 2.2);
          if (pet.beh && pet.beh.type === 'tramp') pet.beh.n = (pet.beh.n || 0) + 1; setExpr('wee', .8); }
      }
    }
    if (isForm('ombra')){ if (pet.x < -R * .6) pet.x = W + R * .5; else if (pet.x > W + R * .6) pet.x = -R * .5; }
    else if (pet.x < R){ pet.x = R; pet.vx = Math.abs(pet.vx) * .55; squish(.2); sfx.boing(); if (thrown && Math.abs(pet.vx) > 60) mission('bounceWall'); }
    else if (pet.x > W - R){ pet.x = W - R; pet.vx = -Math.abs(pet.vx) * .55; squish(.2); sfx.boing(); if (thrown && Math.abs(pet.vx) > 60) mission('bounceWall'); }
    if (pet.y < RY){ pet.y = RY; pet.vy = Math.abs(pet.vy) * .4; squish(.25); sfx.boing(); if (thrown) mission('ceiling'); }
    if (hasFurn('canestro')){ const h = HOOP(); if (thrown && ppy < h.y && pet.y >= h.y && pet.vy > 0 && Math.abs(pet.x - h.x) < h.w / 2 + R * .3) dunk(); }
    // urto con la palla in volo
    const db = Math.hypot(ball.x - pet.x, ball.y - pet.y);
    if (db < R + ball.r && !ball.held && hasFurn('palla')){ ball.by = 'you'; const nx = (ball.x - pet.x) / db, ny = (ball.y - pet.y) / db; ball.vx = nx * 600 + pet.vx * .5; ball.vy = ny * 600; ball.ground = false; ball.x = pet.x + nx * (R + ball.r + 1); ball.y = pet.y + ny * (R + ball.r + 1); sfx.pop(); }
    if (pet.y >= groundY()){
      pet.y = groundY();
      const impact = pet.vy;
      const gel = isForm('gelatina');
      if (impact > (gel ? 160 : 420)){
        pet.vy = -impact * (gel ? .74 : .38); pet.vx *= .7; pet.vr *= .5;
        squish(lim(impact / 2600, .1, .45)); sfx.boing();
      } else {
        pet.ground = true; pet.vy = 0; pet.vx = 0; pet.vr = 0;
        const flip = a && a.type === 'flip';
        if (flip){ pet.anim = null; burst('sparkle', 6); }
        if (!a || a.type !== 'roll') pet.rot = 0;
        if (pet.airFrom){
          const height = (groundY() - Math.min(pet.airFrom, pet.y)) ;
          pet.airFrom = 0;
          if (pet.airStart && (performance.now() - pet.airStart) / 1000 >= 2) mission('airtime');
          pet.airStart = 0;
          const recent = pet.throws.filter(t => Date.now() - t < 30000).length;
          if (recent >= 5){ setExpr('dizzy', 2.5); say('Mi gira tutto…', 2000); s.fun = clamp(s.fun - 2); pet.throws = []; }
          else if (s.trust >= 35 && s.energy > 15){ setExpr('happy', 1.2); s.fun = clamp(s.fun + 2.5); s.energy = clamp(s.energy - .8); budgetXp(1); chat(pick(['Ancora!','Di nuovo!','Wiii!']), .7); }
          void height;
        }
      }
    }
  } else {
    pet.y = groundY();
    if (!(pet.beh && (pet.beh.type === 'enter' || pet.beh.type === 'leave'))) pet.x = lim(pet.x, R, W - R);
  }
  // palla
  if (!ball.held && hasFurn('palla')){
    const br = ball.r;
    if (!ball.ground){
      const bpy = ball.y, h = HOOP();
      ball.vy += g * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (hasFurn('canestro')) for (const ex of [h.x - h.w / 2, h.x + h.w / 2]){
        const dx = ball.x - ex, dy = ball.y - h.y, d = Math.hypot(dx, dy) || 1;
        if (d < br + 3){ const nx = dx / d, ny = dy / d, vn = ball.vx * nx + ball.vy * ny;
          if (vn < 0){ ball.vx -= 1.7 * vn * nx; ball.vy -= 1.7 * vn * ny; tone(700, .05, 'square', .04); }
          ball.x = ex + nx * (br + 3); ball.y = h.y + ny * (br + 3); }
      }
      if (hasFurn('canestro') && bpy < h.y && ball.y >= h.y && ball.vy > 0 && Math.abs(ball.x - h.x) < h.w / 2 - br * .4) scoreHoop(ball.by || 'you');
      if (ball.x < br){ ball.x = br; ball.vx = Math.abs(ball.vx) * .7; }
      if (ball.x > W - br){ ball.x = W - br; ball.vx = -Math.abs(ball.vx) * .7; }
      if (ball.y < br){ ball.y = br; ball.vy = Math.abs(ball.vy) * .6; }
      if (ball.y > FLOOR - br){ ball.y = FLOOR - br; if (ball.vy > 120){ ball.vy = -ball.vy * .62; if (ball.vy < -200) tone(330, .05, 'sine', .05); } else { ball.vy = 0; ball.ground = true; } }
    } else {
      ball.x += ball.vx * dt; ball.vx *= Math.pow(.25, dt);
      if (ball.x < br || ball.x > W - br){ ball.vx = -ball.vx * .7; ball.x = lim(ball.x, br, W - br); }
      if (Math.abs(ball.vx) < 8) ball.vx = 0;
    }
    ball.spin += ball.vx / br * dt;
    // la palla contro il blob a terra
    if (petVisible() && pet.ground){
      const d = Math.hypot(ball.x - pet.x, ball.y - pet.y);
      if (d < R * .9 + br && Math.hypot(ball.vx, ball.vy) > 250){ ball.vx = -ball.vx * .5; ball.vy = -Math.abs(ball.vy) * .5 - 150; ball.ground = false; squish(.3); setExpr('wee', .6); sfx.boing(); }
    }
  }
  // cibo per terra
  for (const f of floorFood){ if (f.y < FLOOR - 4){ f.vy += g * dt; f.y = Math.min(FLOOR - 4, f.y + f.vy * dt); } }
  { const old = floorFood.filter(f => Date.now() - f.t > 60000);
    if (old.length){ old.forEach(returnFood); setFloorFood(floorFood.filter(f => !old.includes(f))); setTrayKey(''); if (old.some(f => !FREE.includes(f.id))) toast(`${old.map(f => FOODS[f.id].e).join('')} rimesso in dispensa`, 1800); saveSoon(); } }
  if (fallingPot){
    fallingPot.vy += g * dt; fallingPot.y += fallingPot.vy * dt; fallingPot.rot += 6 * dt;
    if (fallingPot.y > FLOOR - 14){ setFallingPot(null); if (state && state.messes.length < 2){ state.messes.push({type:'pot'}); sfx.sad(); say('Ops… è caduta la piantina!', 2200); setExpr('shy', 2); burst('crumb', 12, W * .83, FLOOR - 10); saveSoon(); } }
  }
}

export { physics };
