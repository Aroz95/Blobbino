import { EMO } from '../game/util.js';
import { FURN } from '../game/catalog.js';
import { drawFurnRoom, state } from '../game/state.js';
import { curRoom } from '../legacy/shop.js';
import { FLOOR, H, R, W, ctx, ev, fallingPot, roomColors, tokens } from '../room/scene.js';
import { editMode } from '../room/pointer.js';
import { WIN } from '../room/events.js';
import { heartC } from './items.js';
import { drawRug, fposPx, furnBox, hasFurn } from './furniture.js';
import { star4C } from '../places/valley.js';
import { drawHoopBack } from '../room/hoop.js';

/* ---------- disegno ---------- */
function heart(x, y, s){ ctx.beginPath(); ctx.moveTo(x, y + s*.3); ctx.bezierCurveTo(x, y - s*.3, x - s, y - s*.3, x - s, y + s*.2);
  ctx.bezierCurveTo(x - s, y + s*.7, x, y + s, x, y + s*1.2); ctx.bezierCurveTo(x, y + s, x + s, y + s*.7, x + s, y + s*.2);
  ctx.bezierCurveTo(x + s, y - s*.3, x, y - s*.3, x, y + s*.3); ctx.fill(); }
function star4(x, y, s){ ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill(); }
function star5(x, y, r){ ctx.beginPath(); for (let i = 0; i < 10; i++){ const a = -Math.PI/2 + i*Math.PI/5, rr = i % 2 ? r*.48 : r;
  ctx.lineTo(x + Math.cos(a)*rr, y + Math.sin(a)*rr); } ctx.closePath(); ctx.fill(); }
function roundRect(x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function cloud(x, y, r){ ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.arc(x + r, y - r*.4, r*1.1, 0, 7); ctx.arc(x + r*2, y, r*.9, 0, 7); ctx.fill(); }
function emoji(e, x, y, size, rot){
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
  ctx.font = `${Math.round(size)}px ${EMO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(e, 0, 0); ctx.restore();
}
function drawRoom(t, night){
  const RC = roomColors();
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, RC.wall2); g.addColorStop(1, RC.wall);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = tokens.line; for (let y = 18; y < FLOOR - 20; y += 34) for (let x = (y/34 % 2)*17 + 10; x < W; x += 34){ ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill(); }
  const w = WIN(), wx = w.x, wy = w.y, ww = w.w, wh = w.h;
  ctx.fillStyle = tokens.panel; roundRect(wx - 6, wy - 6, ww + 12, wh + 12, 16); ctx.fill();
  const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
  if (night){ sky.addColorStop(0, '#26235a'); sky.addColorStop(1, '#4a3d7c'); } else { sky.addColorStop(0, '#aee0ff'); sky.addColorStop(1, '#e2f4ff'); }
  ctx.fillStyle = sky; roundRect(wx, wy, ww, wh, 11); ctx.fill();
  ctx.save(); roundRect(wx, wy, ww, wh, 11); ctx.clip();
  if (night){ ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(wx + ww*.68, wy + wh*.35, ww*.14, 0, 7); ctx.fill();
    ctx.fillStyle = '#4a3d7c'; ctx.beginPath(); ctx.arc(wx + ww*.74, wy + wh*.3, ww*.12, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; for (let i = 0; i < 6; i++){ const tw = .5 + .5*Math.sin(t*2 + i*2); ctx.globalAlpha = .4 + .6*tw; star4(wx + ww*((i*37 % 90 + 5)/100), wy + wh*((i*53 % 70 + 10)/100), 2.5); } ctx.globalAlpha = 1; }
  else { ctx.fillStyle = '#ffd86b'; ctx.beginPath(); ctx.arc(wx + ww*.7, wy + wh*.32, ww*.13, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; cloud(wx + ((t*6) % (ww + 60)) - 30, wy + wh*.65, ww*.12); }
  if (ev && ev.type === 'star'){ const p = ev.t / ev.life, sx = wx + ww*(.1 + p*.9), sy = wy + wh*(.15 + p*.5);
    const gr = ctx.createLinearGradient(sx - ww*.4, sy - wh*.2, sx, sy); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, '#fff6c8');
    ctx.strokeStyle = gr; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx - ww*.4, sy - wh*.2); ctx.lineTo(sx, sy); ctx.stroke(); ctx.fillStyle = '#fff'; star4(sx, sy, 6); }
  if (ev && ev.type === 'storm'){ ctx.fillStyle = 'rgba(40,40,80,.55)'; ctx.fillRect(wx, wy, ww, wh); ctx.strokeStyle = 'rgba(210,225,255,.85)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 16; i++){ const rx = wx + ((i * 37 + t * 160) % ww), ry = wy + ((i * 53 + t * 420) % wh); ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 4, ry + 10); ctx.stroke(); } }
  if (ev && ev.type === 'rainbow'){ const cols = ['#ff7b7b','#ffb36b','#ffe26b','#7be08a','#7bc4ff','#a993ff'];
    ctx.lineWidth = Math.max(3, ww*.04); ctx.globalAlpha = Math.min(1, ev.t, ev.life - ev.t);
    cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(wx + ww*.5, wy + wh*1.05, ww*(.55 - i*.045), Math.PI, 0); ctx.stroke(); }); ctx.globalAlpha = 1; }
  ctx.restore();
  ctx.fillStyle = tokens.panel; ctx.fillRect(wx + ww/2 - 2, wy, 4, wh); ctx.fillRect(wx, wy + wh/2 - 2, ww, 4);
  // disegni sul muro
  if (state) for (const m of state.messes) if (m.type === 'doodle'){
    const cx = m.x * W, cy = H * .6; let sd = m.seed;
    const r2 = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
    ctx.strokeStyle = ['#ff6fae','#7cc8ff','#ffb52e'][m.seed % 3]; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - R*.4, cy); for (let i = 0; i < 7; i++) ctx.lineTo(cx + (r2() - .5) * R * .9, cy + (r2() - .5) * R * .6); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + R*.15, cy - R*.1, R*.15, 0, 7); ctx.stroke();
  }
  if (hasFurn('canestro')) drawHoopBack();
  // mensola
  const sx = W*.72, sy = H*.3;
  ctx.fillStyle = tokens.panel; roundRect(sx, sy, W*.2, 7, 3); ctx.fill();
  const potDown = state && state.messes.some(m => m.type === 'pot') || fallingPot;
  if (!potDown){
    ctx.fillStyle = '#ffb3cf'; roundRect(sx + W*.07, sy - 18, 20, 18, 5); ctx.fill();
    ctx.fillStyle = '#7fcf9e'; for (const a of [-.6, 0, .6]){ ctx.save(); ctx.translate(sx + W*.07 + 10, sy - 18); ctx.rotate(a + Math.sin(t*1.3)*.05); ctx.beginPath(); ctx.ellipse(0, -10, 5, 11, 0, 0, 7); ctx.fill(); ctx.restore(); }
  }
  ctx.fillStyle = RC.floor; ctx.fillRect(0, FLOOR - H*.08, W, H);
  drawRug(ctx, W*.55, FLOOR + H*.02, W*.32, H*.06, (curRoom() && curRoom().rug) || 'rosa', RC.rug, t);
  const room = curRoom();
  if (room) for (const id of room.furnOn){ if (!FURN[id]) continue; const p = furnBox(id); if (id !== 'canestro' && id !== 'palla') drawFurnRoom(ctx, room, id, p.x, p.y, p.S, t, true);
    if (editMode){ ctx.save(); ctx.strokeStyle = '#ff6fae'; ctx.setLineDash([5, 4]); ctx.lineWidth = 2; roundRect(p.x - p.w/2 - 4, p.y - p.S/2 - 4, p.w + 8, p.S + 8, 8); ctx.stroke(); ctx.restore(); } }
  if (hasFurn('lanterna') && night){ const lp = fposPx('lanterna'); const gl = ctx.createRadialGradient(lp.x, lp.y, 2, lp.x, lp.y, W*.25); gl.addColorStop(0, 'rgba(255,190,90,.35)'); gl.addColorStop(1, 'rgba(255,190,90,0)'); ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H); }
  // vaso caduto
  const drawPot = (x, y, rot, broken) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = '#ffb3cf'; roundRect(-10, -9, 20, 18, 5); ctx.fill();
    ctx.fillStyle = '#7fcf9e'; for (const a of [-.6, 0, .6]){ ctx.save(); ctx.translate(0, -9); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -10, 5, 11, 0, 0, 7); ctx.fill(); ctx.restore(); }
    ctx.restore();
    if (broken){ ctx.fillStyle = '#9b6b4f'; for (let i = 0; i < 6; i++){ ctx.beginPath(); ctx.arc(x - 18 + i * 7, FLOOR - 2 + (i % 2) * 3, 3, 0, 7); ctx.fill(); } }
  };
  if (fallingPot) drawPot(fallingPot.x, fallingPot.y, fallingPot.rot, false);
  if (state && state.messes.some(m => m.type === 'pot')) drawPot(W * .83, FLOOR - 12, 1.4, true);
}
function drawPoop(x, y, s, t){
  ctx.fillStyle = '#c79a78';
  ctx.beginPath(); ctx.ellipse(x, y, s, s*.45, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y - s*.45, s*.72, s*.36, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + s*.05, y - s*.82, s*.42, s*.28, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#3b2842'; ctx.beginPath(); ctx.arc(x - s*.25, y - s*.4, s*.08, 0, 7); ctx.arc(x + s*.25, y - s*.4, s*.08, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(160,140,120,.5)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 2; i++){ const o = (t*18 + i*12) % 24; ctx.globalAlpha = 1 - o/24; ctx.beginPath();
    ctx.moveTo(x - 6 + i*12, y - s*1.2 - o); ctx.quadraticCurveTo(x - 2 + i*12, y - s*1.4 - o, x - 6 + i*12, y - s*1.6 - o); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
/* motivi sul corpo (il chiamante ha già ritagliato la forma) */
const PAT_PTS = [[-.55,-.35],[.1,-.6],[.5,-.25],[-.2,.05],[.35,.3],[-.5,.4],[.05,.55],[.7,.15],[-.75,-.05],[.25,-.15]];
function drawPattern(c, pat, rx, ry, R, t, pc){
  c.save(); c.fillStyle = c.strokeStyle = pc || 'rgba(255,255,255,.5)'; c.lineCap = 'round'; c.lineJoin = 'round';
  if (pat === 'spots'){ for (const [x, y, z] of [[-.3,-.3,.13],[.25,-.5,.09],[.3,.1,.15],[-.2,.35,.1],[.05,-.05,.07]]){ c.beginPath(); c.arc(x*R*1.25, y*R*1.25, z*R*1.25, 0, 7); c.fill(); } }
  else if (pat === 'pois'){ const sp = R*.4; for (let y = -ry, j = 0; y < ry; y += sp*.85, j++) for (let x = -rx + (j % 2)*sp/2; x < rx; x += sp){ c.beginPath(); c.arc(x, y, R*.065, 0, 7); c.fill(); } }
  else if (pat === 'righe'){ c.lineWidth = R*.13; for (let x = -rx*2; x < rx*2; x += R*.38){ c.beginPath(); c.moveTo(x, -ry*1.1); c.lineTo(x + ry*.9, ry*1.1); c.stroke(); } }
  else if (pat === 'macchie'){ PAT_PTS.slice(0, 6).forEach(([x, y], i) => { c.beginPath(); c.ellipse(x*rx, y*ry, R*(.12 + (i % 3)*.05), R*(.09 + (i % 2)*.05), i, 0, 7); c.fill(); }); }
  else if (pat === 'stelle'){ PAT_PTS.forEach(([x, y], i) => { c.globalAlpha = .55 + .45*Math.sin(t*2.5 + i*1.7); star4C(c, x*rx, y*ry, R*(.06 + (i % 3)*.025)); }); c.globalAlpha = 1; }
  else if (pat === 'cuori'){ PAT_PTS.slice(0, 7).forEach(([x, y], i) => heartC(c, x*rx, y*ry, R*(.09 + (i % 2)*.04))); c.fill(); }
  else if (pat === 'zigzag'){ c.lineWidth = R*.08; for (const yy of [-.45, 0, .45]){ c.beginPath(); for (let i = 0, x = -rx*1.1; x < rx*1.1; x += R*.22, i++) c.lineTo(x, yy*ry + (i % 2 ? -1 : 1)*R*.09); c.stroke(); } }
  else if (pat === 'nuvole'){ for (const [x, y] of [[-.45,-.35],[.4,.05],[-.2,.45]]){ c.beginPath(); c.arc(x*rx, y*ry, R*.13, 0, 7); c.arc(x*rx + R*.15, y*ry - R*.05, R*.16, 0, 7); c.arc(x*rx + R*.3, y*ry, R*.12, 0, 7); c.fill(); } }
  else if (pat === 'arcobaleno'){ c.lineWidth = R*.13; ['#ff8fa8','#ffbf6b','#ffe66b','#8fe39a','#8cc8ff','#b79bff'].forEach((col, i) => { c.strokeStyle = col; c.globalAlpha = .55; c.beginPath(); c.arc(0, ry*1.25, R*(1.55 - i*.13), Math.PI*1.08, Math.PI*1.92); c.stroke(); }); c.globalAlpha = 1; }
  else if (pat === 'squame'){ c.lineWidth = Math.max(1.2, R*.04); const sp = R*.26; for (let y = -ry*.2, j = 0; y < ry; y += sp*.6, j++) for (let x = -rx + (j % 2)*sp/2; x < rx; x += sp){ c.beginPath(); c.arc(x, y, sp*.48, .1*Math.PI, .9*Math.PI); c.stroke(); } }
  else if (pat === 'cristallo'){ c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = Math.max(1, R*.03); for (let i = 0; i < 6; i++){ const a = i*Math.PI/3 + .3; c.beginPath(); c.moveTo(0, ry*.1); c.lineTo(Math.cos(a)*rx*1.2, Math.sin(a)*ry*1.2 + ry*.1); c.stroke(); }
    c.fillStyle = `rgba(255,255,255,${.35 + .25*Math.sin(t*2)})`; c.beginPath(); c.moveTo(-rx*.5, -ry*.6); c.lineTo(-rx*.1, -ry*.75); c.lineTo(-rx*.25, -ry*.2); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(rx*.35, ry*.2); c.lineTo(rx*.65, ry*.05); c.lineTo(rx*.55, ry*.45); c.closePath(); c.fill(); }
  else if (pat === 'dado'){ for (const [x, y] of [[-.62,-.5],[.62,-.5],[-.62,.52],[.62,.52]]){ c.beginPath(); c.arc(x*rx*.85, y*ry*.85, R*.075, 0, 7); c.fill(); } }
  else if (pat === 'gocce'){ PAT_PTS.slice(0, 7).forEach(([x, y], i) => { const X = x*rx, Y = y*ry, z = R*(.06 + (i % 2)*.03); c.beginPath(); c.moveTo(X, Y - z*1.8); c.quadraticCurveTo(X + z, Y, X, Y + z); c.quadraticCurveTo(X - z, Y, X, Y - z*1.8); c.fill(); }); }
  else if (pat === 'saette'){ PAT_PTS.slice(0, 6).forEach(([x, y], i) => { c.save(); c.translate(x*rx, y*ry); c.rotate(.3 - (i % 2)*.5); const z = R*.14; c.beginPath(); c.moveTo(-z*.2, -z); c.lineTo(z*.4, -z); c.lineTo(z*.05, -z*.15); c.lineTo(z*.45, -z*.15); c.lineTo(-z*.3, z); c.lineTo(-z*.05, z*.1); c.lineTo(-z*.4, z*.1); c.closePath(); c.fill(); c.restore(); }); }
  else if (pat === 'spirale'){ c.lineWidth = R*.1; c.beginPath(); for (let a = 0; a < Math.PI * 7; a += .15){ const rr = R * .06 * a; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * .9 + ry*.05); } c.stroke(); }
  else if (pat === 'rombi'){ const sp = R*.42; for (let y = -ry, j = 0; y < ry + sp; y += sp*.5, j++) for (let x = -rx + (j % 2)*sp/2; x < rx + sp; x += sp){ if ((j + Math.round(x / sp)) % 2) continue; c.beginPath(); c.moveTo(x, y - sp*.25); c.lineTo(x + sp*.25, y); c.lineTo(x, y + sp*.25); c.lineTo(x - sp*.25, y); c.closePath(); c.fill(); } }
  c.restore();
}

export { drawPattern, drawPoop, drawRoom, emoji, heart, roundRect, star4, star5 };
