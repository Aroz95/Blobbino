import { clamp, pick } from '../game/util.js';
import { fvarOf, giveSticker, isForm, state } from '../game/state.js';
import { note } from '../game/evolution.js';
import { saveSoon } from '../game/save.js';
import { addCoins, chat, say, sfx, toast, tone } from '../game/texts.js';
import { budgetXp } from '../game/bond.js';
import { fulfill, mission } from '../game/wishes.js';
import { curRoom } from '../legacy/shop.js';
import { H, W, awake, ball, burst, ctx, floatText, pet, setExpr, tokens } from './scene.js';
import { star5C } from '../draw/items.js';
import { HOOPV } from '../draw/furniture.js';
import { roundRect } from '../draw/blob.js';

/* ---------- canestro ---------- */
const HOOP = () => { const r = curRoom(), fp = (r && r.fpos && r.fpos.canestro) || {x:.5, y:.4}; return {x: fp.x * W, y: fp.y * H, w: Math.max(W * .15, ball.r * 3.8)}; };
let hoopFx = 0, hoopStreak = 0, lastHoopAt = 0, hoopCoins = 6, lastHoopRefill = Date.now(), lastDunk = 0;
function scoreHoop(by){
  const s = state, h = HOOP(), now = Date.now();
  hoopFx = 1; tone(1400, .18, 'sine', .08, .4);
  if (by === 'you'){
    hoopCoins = Math.min(6, hoopCoins + (now - lastHoopRefill) / 120000); lastHoopRefill = now;
    hoopStreak = now - lastHoopAt < 12000 ? hoopStreak + 1 : 1; lastHoopAt = now;
    s.hoops++;
    let c = 0; if (hoopCoins >= 1){ hoopCoins--; c = hoopStreak >= 3 ? 2 : 1; addCoins(c); sfx.coin(); floatText(`+${c}`, h.x + h.w, h.y); }
    floatText(hoopStreak > 1 ? `Canestro x${hoopStreak}!` : 'Canestro!', h.x, h.y - H * .12, '#ff6fae');
    if (hoopStreak > s.records.hoop) s.records.hoop = hoopStreak;
    mission('hoop'); fulfill('hoop'); budgetXp(1); note('ball', 2);
    if (s.hoops >= 10 && giveSticker(s, 'canestro')) toast('Nuova figurina: 🏀 Cecchino!');
    if (awake()){ setExpr('happy', 1.5); if (pet.ground && !pet.held){ pet.vy = -H * .7; pet.ground = false; } chat(pick(['Canestro!!','Che tiro!','Sei un campione!','Ancora uno!']), .8); }
  } else {
    floatText('Canestro!', h.x, h.y - H * .12, '#a893ff');
    if (isForm('pallino')){ hoopCoins = Math.min(6, hoopCoins + (now - lastHoopRefill) / 120000); lastHoopRefill = now; if (hoopCoins >= 1){ hoopCoins--; addCoins(1); floatText('+1', h.x + h.w, h.y); sfx.coin(); } }
    if (awake()){ setExpr('happy', 2); say(pick(['Ho fatto canestro! Hai visto?!','Tre punti per me!','Sono un fenomeno!']), 2000); s.fun = clamp(s.fun + 3); burst('heart', 4); }
  }
  saveSoon();
}
function dunk(){
  const s = state, h = HOOP(), now = Date.now();
  if (now - lastDunk < 3000) return; lastDunk = now;
  hoopFx = 1.5; burst('confetti', 24, h.x, h.y); sfx.level();
  floatText('Schiacciata!', h.x, h.y - H * .12, '#ff6fae');
  const nw = giveSticker(s, 'schiacciata');
  addCoins(2); budgetXp(3); mission('dunk'); fulfill('dunk');
  say(nw ? 'Schiacciata! Nuova figurina: 💥' : pick(['Schiacciata!!','Sono volato nel canestro!']), 2000);
  saveSoon();
}
function drawHoopBack(){
  const h = HOOP(), P = HOOPV[fvarOf(curRoom(), 'canestro')] || HOOPV[0];
  ctx.fillStyle = P.board || tokens.panel; ctx.strokeStyle = P.line || tokens.line; ctx.lineWidth = 2;
  if (P.star){ star5C(ctx, h.x, h.y - H * .065, h.w * .78); ctx.stroke(); } else { roundRect(h.x - h.w * .7, h.y - H * .11, h.w * 1.4, H * .1, 8); ctx.fill(); ctx.stroke(); }
  ctx.strokeStyle = P.mark; ctx.lineWidth = 2.5; roundRect(h.x - h.w * .28, h.y - H * .07, h.w * .56, H * .055, 3); ctx.stroke();
}
function drawHoopFront(t){
  const h = HOOP(), hw = h.w / 2, nh = H * .075, wig = Math.sin(t * 30) * hoopFx * 4;
  hoopFx = Math.max(0, hoopFx - .02);
  const P = HOOPV[fvarOf(curRoom(), 'canestro')] || HOOPV[0];
  ctx.strokeStyle = P.net; ctx.lineWidth = 1.5;
  for (let i = 0; i <= 5; i++){ const f = i / 5; ctx.beginPath(); ctx.moveTo(h.x - hw + f * h.w, h.y); ctx.lineTo(h.x - hw * .55 + f * hw * 1.1 + wig, h.y + nh); ctx.stroke(); }
  for (const k of [.45, .85]){ ctx.beginPath(); ctx.moveTo(h.x - hw * (1 - k * .45) + wig * k, h.y + nh * k); ctx.lineTo(h.x + hw * (1 - k * .45) + wig * k, h.y + nh * k); ctx.stroke(); }
  ctx.strokeStyle = P.rim; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(h.x - hw, h.y); ctx.lineTo(h.x + hw, h.y); ctx.stroke();
}

// gli altri moduli non possono riassegnare una variabile importata: la cambiano con questi
export function setHoopCoins(v){ hoopCoins = v; }
export function setLastHoopRefill(v){ lastHoopRefill = v; }

export { HOOP, drawHoopBack, drawHoopFront, dunk, hoopCoins, lastHoopRefill, scoreHoop };
