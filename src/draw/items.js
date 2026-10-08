import { EMO } from '../game/util.js';
import { ACC, CIRCLES, FURN } from '../game/catalog.js';
import { blobById, blobEmoji, palFor, state } from '../game/state.js';
import { R, pet, petVisible } from '../room/scene.js';
import { drawFurnAlt } from './furniture.js';
import { star4C } from '../places/valley.js';

/* ---------- accessori, mobili e tappeti (disegno su un contesto qualunque) ---------- */
function rrPath(c, x, y, w, h, r){ c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function rrC(c, x, y, w, h, r){ c.beginPath(); rrPath(c, x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }
function emojiC(c, e, x, y, size, rot){ c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.font = `${Math.round(size)}px ${EMO}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e, 0, 0); c.restore(); }
function heartC(c, x, y, s){ c.beginPath(); c.moveTo(x, y + s*.3); c.bezierCurveTo(x, y - s*.3, x - s, y - s*.3, x - s, y + s*.2);
  c.bezierCurveTo(x - s, y + s*.7, x, y + s, x, y + s*1.2); c.bezierCurveTo(x, y + s, x + s, y + s*.7, x + s, y + s*.2); c.bezierCurveTo(x + s, y - s*.3, x, y - s*.3, x, y + s*.3); c.fill(); }
function star5C(c, x, y, r){ c.beginPath(); for (let i = 0; i < 10; i++){ const a = -Math.PI/2 + i*Math.PI/5, rr = i % 2 ? r*.48 : r; c.lineTo(x + Math.cos(a)*rr, y + Math.sin(a)*rr); } c.closePath(); c.fill(); }
function acadEmblem(c, em, x, y, r, col, t){
  c.save(); c.fillStyle = c.strokeStyle = col;
  if (em === 'star') star5C(c, x, y, r);
  else if (em === 'flame'){ c.beginPath(); c.moveTo(x, y - r*1.2); c.quadraticCurveTo(x + r*1.1, y, x, y + r*.9); c.quadraticCurveTo(x - r*1.1, y, x, y - r*1.2); c.fill(); }
  else if (em === 'wave'){ c.lineWidth = r*.45; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - r, y + r*.2); c.quadraticCurveTo(x - r*.5, y - r*.7, x, y + r*.2); c.quadraticCurveTo(x + r*.5, y + r*1.1, x + r, y + r*.2); c.stroke(); }
  else { c.globalAlpha = .55 + .45*Math.sin(t*4); c.beginPath(); c.arc(x, y, r*.7, 0, 7); c.fill(); c.globalAlpha = 1; star4C(c, x, y, r*1.15); }
  c.restore();
}
function drawAcc(c, id, R, ry, t, pal, fx = 0, ey = null, ex = null){
  const A = ACC[id]; if (!A) return;
  if (ey === null) ey = -ry * .08; if (ex === null) ex = R * .3;
  const top = -ry * .9;
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  if (!A.draw){ emojiC(c, A.e, R*.06, -ry*.98, R*.62, -.14); c.restore(); return; }
  switch (A.draw){
    case 'party': c.beginPath(); c.moveTo(-R*.26, top + R*.08); c.lineTo(R*.22, top + R*.04); c.lineTo(R*.04, top - R*.6); c.closePath(); c.fillStyle = '#ff8fbf'; c.fill();
      c.save(); c.clip(); c.strokeStyle = '#ffe27a'; c.lineWidth = R*.08; for (let i = 0; i < 4; i++){ c.beginPath(); c.moveTo(-R*.4, top - i*R*.18 + R*.05); c.lineTo(R*.4, top - i*R*.18 - R*.07); c.stroke(); } c.restore();
      c.fillStyle = '#7cc8ff'; c.beginPath(); c.arc(R*.04, top - R*.62, R*.08, 0, 7); c.fill(); break;
    case 'acadcap': { const C = CIRCLES[A.circle];
      c.fillStyle = C.d; c.beginPath(); c.ellipse(0, top + R*.06, R*.62, R*.12, 0, 0, 7); c.fill();
      c.fillStyle = C.a; c.beginPath(); c.moveTo(-R*.34, top + R*.04); c.quadraticCurveTo(-R*.08, top - R*.55, R*.26 + Math.sin(t*1.5)*R*.03, top - R*.86); c.quadraticCurveTo(R*.1, top - R*.4, R*.34, top + R*.04); c.closePath(); c.fill();
      c.fillStyle = C.b; c.fillRect(-R*.33, top - R*.06, R*.66, R*.09);
      acadEmblem(c, C.em, 0, top - R*.24, R*.1, C.b, t); break; }
    case 'acadmed': { const C = CIRCLES[A.circle];
      c.strokeStyle = C.a; c.lineWidth = R*.08; c.beginPath(); c.moveTo(-R*.42, ry*.44); c.lineTo(0, ry*.66); c.lineTo(R*.42, ry*.44); c.stroke();
      c.fillStyle = C.b; c.beginPath(); c.arc(0, ry*.7, R*.15, 0, 7); c.fill(); c.strokeStyle = C.d; c.lineWidth = Math.max(1.5, R*.03); c.stroke();
      acadEmblem(c, C.em, 0, ry*.7, R*.09, C.a, t); break; }
    case 'acadrobe': { const C = CIRCLES[A.circle], sw = Math.sin(t*2)*R*.04;
      c.fillStyle = C.d; c.beginPath(); c.moveTo(-R*.62, -ry*.3); c.quadraticCurveTo(-R*1.08 + sw, ry*.4, -R*1.02 + sw, ry*.95); c.lineTo(R*1.02 + sw, ry*.95); c.quadraticCurveTo(R*1.08 + sw, ry*.4, R*.62, -ry*.3); c.closePath(); c.fill();
      c.fillStyle = C.a; c.fillRect(-R*1.04 + sw, ry*.84, R*2.08, R*.09);
      c.fillStyle = C.d; c.beginPath(); c.ellipse(0, -ry*.52, R*.5, R*.3, 0, Math.PI, 0); c.fill(); break; }
    case 'wizard': c.fillStyle = '#6a4bc4'; c.beginPath(); c.ellipse(0, top + R*.05, R*.58, R*.11, 0, 0, 7); c.fill();
      c.beginPath(); c.moveTo(-R*.32, top + R*.03); c.quadraticCurveTo(-R*.05, top - R*.5, R*.38, top - R*.78); c.quadraticCurveTo(R*.1, top - R*.35, R*.32, top + R*.03); c.closePath(); c.fill();
      c.fillStyle = '#ffe27a'; star5C(c, -R*.02, top - R*.2, R*.08); star5C(c, R*.16, top - R*.44, R*.05); break;
    case 'cat': for (const d of [-1, 1]){ c.fillStyle = pal.b; c.beginPath(); c.moveTo(d*R*.52, top + R*.18); c.lineTo(d*R*.62, top - R*.32); c.lineTo(d*R*.16, top + R*.04); c.closePath(); c.fill();
      c.fillStyle = '#ffb3d1'; c.beginPath(); c.moveTo(d*R*.47, top + R*.08); c.lineTo(d*R*.55, top - R*.18); c.lineTo(d*R*.28, top + R*.04); c.closePath(); c.fill(); } break;
    case 'unicorn': { const g = c.createLinearGradient(0, top - R*.6, 0, top); g.addColorStop(0, '#fff6c8'); g.addColorStop(1, '#ffd166'); c.fillStyle = g;
      c.beginPath(); c.moveTo(-R*.12, top + R*.06); c.lineTo(R*.04, top - R*.62); c.lineTo(R*.14, top + R*.06); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(200,140,40,.6)'; c.lineWidth = 1.5; for (let i = 1; i < 4; i++){ c.beginPath(); c.moveTo(-R*.1 + i*R*.035, top - i*R*.14 + R*.04); c.lineTo(R*.12 - i*R*.02, top - i*R*.14 - R*.03); c.stroke(); }
      c.fillStyle = '#ff9ec7'; c.beginPath(); c.arc(-R*.24, top + R*.04, R*.07, 0, 7); c.fill(); c.fillStyle = '#a893ff'; c.beginPath(); c.arc(R*.28, top + R*.05, R*.06, 0, 7); c.fill(); break; }
    case 'chef': c.fillStyle = '#fff'; c.strokeStyle = 'rgba(160,130,150,.5)'; c.lineWidth = 1.5;
      for (const [x, y, r] of [[-R*.2, -R*.26, R*.17], [R*.04, -R*.36, R*.2], [R*.25, -R*.24, R*.16]]){ c.beginPath(); c.arc(x, top + y, r, 0, 7); c.fill(); c.stroke(); }
      rrC(c, -R*.32, top - R*.14, R*.64, R*.22, R*.05); c.fill(); c.stroke(); break;
    case 'beanie': c.fillStyle = '#7cc8ff'; c.beginPath(); c.ellipse(0, top + R*.1, R*.52, R*.44, 0, Math.PI, 0); c.fill();
      c.fillStyle = '#4da7e8'; rrC(c, -R*.55, top + R*.04, R*1.1, R*.15, R*.07); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, top - R*.36, R*.12, 0, 7); c.fill(); break;
    case 'halo': c.strokeStyle = '#ffd24a'; c.lineWidth = R*.08; c.beginPath(); c.ellipse(0, top - R*.3 + Math.sin(t*2)*R*.03, R*.36, R*.1, 0, 0, 7); c.stroke(); break;
    case 'flowercrown': { const cols = ['#ff9ec7','#ffe27a','#a893ff','#7be08a','#7cc8ff'];
      for (let i = 0; i < 7; i++){ const a = Math.PI*(1.12 + i*.127), x = Math.cos(a)*R*.66, y = top + R*.4 + Math.sin(a)*R*.44;
        c.fillStyle = cols[i % 5]; c.beginPath(); c.arc(x, y, R*.1, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, R*.035, 0, 7); c.fill(); } break; }
    case 'round': c.strokeStyle = '#3b2842'; c.lineWidth = Math.max(1.5, R*.045); c.fillStyle = 'rgba(255,255,255,.18)';
      for (const d of [-1, 1]){ c.beginPath(); c.arc(fx + d*ex, ey, R*.17, 0, 7); c.fill(); c.stroke(); }
      c.beginPath(); c.moveTo(fx - ex + R*.17, ey); c.quadraticCurveTo(fx, ey - R*.06, fx + ex - R*.17, ey); c.stroke(); break;
    case 'sun': c.fillStyle = 'rgba(30,25,40,.9)'; for (const d of [-1, 1]){ rrC(c, fx + d*ex - R*.2, ey - R*.13, R*.4, R*.25, R*.09); c.fill(); }
      c.strokeStyle = 'rgba(30,25,40,.9)'; c.lineWidth = Math.max(1.5, R*.05); c.beginPath(); c.moveTo(fx - ex + R*.2, ey - R*.04); c.lineTo(fx + ex - R*.2, ey - R*.04); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.55)'; for (const d of [-1, 1]) c.fillRect(fx + d*ex - R*.13, ey - R*.09, R*.09, R*.035); break;
    case 'heart': c.fillStyle = '#ff4f7b'; for (const d of [-1, 1]) heartC(c, fx + d*ex, ey - R*.16, R*.17);
      c.strokeStyle = '#ff4f7b'; c.lineWidth = Math.max(1.5, R*.04); c.beginPath(); c.moveTo(fx - ex + R*.15, ey - R*.02); c.lineTo(fx + ex - R*.15, ey - R*.02); c.stroke(); break;
    case 'monocle': c.strokeStyle = '#e0b44a'; c.lineWidth = Math.max(1.5, R*.045); c.fillStyle = 'rgba(255,255,255,.2)';
      c.beginPath(); c.arc(fx + ex, ey, R*.18, 0, 7); c.fill(); c.stroke();
      c.setLineDash([2, 3]); c.lineWidth = 1.2; c.beginPath(); c.moveTo(fx + ex + R*.12, ey + R*.13); c.quadraticCurveTo(fx + ex + R*.35, ey + R*.35, fx + ex + R*.25, ey + R*.6); c.stroke(); c.setLineDash([]); break;
    case 'mustache': c.fillStyle = '#6b4a24';
      for (const d of [-1, 1]){ c.beginPath(); c.ellipse(fx + d*R*.12, ey + R*.24, R*.13, R*.055, d*.25, 0, 7); c.fill(); c.beginPath(); c.arc(fx + d*R*.26, ey + R*.19, R*.045, 0, 7); c.fill(); } break;
    case 'mask': c.fillStyle = '#ff4f6d'; c.beginPath(); rrPath(c, fx - R*.56, ey - R*.14, R*1.12, R*.28, R*.13);
      c.moveTo(fx - ex + R*.12, ey); c.ellipse(fx - ex, ey, R*.12, R*.13, 0, 0, 7); c.moveTo(fx + ex + R*.12, ey); c.ellipse(fx + ex, ey, R*.12, R*.13, 0, 0, 7); c.fill('evenodd');
      c.beginPath(); c.moveTo(fx + R*.55, ey - R*.05); c.lineTo(fx + R*.8, ey - R*.15); c.lineTo(fx + R*.76, ey + R*.05); c.closePath(); c.fill(); break;
    case 'bowtie': { const ny = ry*.56; c.fillStyle = '#ff4f6d'; for (const d of [-1, 1]){ c.beginPath(); c.moveTo(0, ny); c.lineTo(d*R*.25, ny - R*.13); c.lineTo(d*R*.25, ny + R*.13); c.closePath(); c.fill(); }
      c.fillStyle = '#d93659'; c.beginPath(); c.arc(0, ny, R*.07, 0, 7); c.fill(); break; }
    case 'scarf': c.fillStyle = '#ff8c3a'; c.beginPath(); c.ellipse(0, ry*.56, R*.84, R*.13, 0, 0, 7); c.fill();
      rrC(c, R*.24, ry*.56, R*.2, R*.4, R*.06); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = Math.max(1.5, R*.05); for (const x of [-R*.45, -R*.1, R*.6]){ c.beginPath(); c.moveTo(x - R*.05, ry*.47); c.lineTo(x + R*.05, ry*.65); c.stroke(); }
      c.beginPath(); c.moveTo(R*.26, ry*.56 + R*.26); c.lineTo(R*.42, ry*.56 + R*.26); c.stroke(); break;
    case 'pearls': c.fillStyle = '#fffaf0'; c.strokeStyle = 'rgba(180,160,170,.7)'; c.lineWidth = 1;
      for (let i = 0; i < 11; i++){ const a = Math.PI*(.17 + i*.066); c.beginPath(); c.arc(Math.cos(a)*R*.62, ry*.22 + Math.sin(a)*R*.36, R*.055, 0, 7); c.fill(); c.stroke(); } break;
    case 'bandana': c.fillStyle = '#e8473f'; c.beginPath(); c.moveTo(-R*.6, ry*.4); c.lineTo(R*.6, ry*.4); c.lineTo(0, ry*.8); c.closePath(); c.fill();
      c.fillStyle = '#fff'; for (const [x, y] of [[-R*.25, ry*.47], [R*.2, ry*.49], [0, ry*.62], [-R*.05, ry*.45]]){ c.beginPath(); c.arc(x, y, R*.03, 0, 7); c.fill(); } break;
    case 'bell': c.fillStyle = '#ff5b5b'; c.beginPath(); c.ellipse(0, ry*.5, R*.8, R*.07, 0, 0, 7); c.fill();
      c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(0, ry*.64, R*.11, 0, 7); c.fill(); c.fillStyle = '#a8743f'; c.fillRect(-R*.06, ry*.67, R*.12, R*.02); break;
    case 'medal': c.strokeStyle = '#4da7e8'; c.lineWidth = R*.07; c.beginPath(); c.moveTo(-R*.32, ry*.36); c.lineTo(0, ry*.58); c.lineTo(R*.32, ry*.36); c.stroke();
      c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(0, ry*.66, R*.13, 0, 7); c.fill(); c.fillStyle = '#fff6c8'; star5C(c, 0, ry*.66, R*.07); break;
    case 'wings': { const fl = Math.sin(t*6)*.15; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(180,160,190,.6)'; c.lineWidth = 1.5;
      for (const d of [-1, 1]){ c.save(); c.translate(d*R*.65, -ry*.2); c.rotate(d*(.45 + fl));
        c.beginPath(); c.ellipse(d*R*.35, 0, R*.42, R*.22, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.ellipse(d*R*.24, R*.14, R*.3, R*.15, 0, 0, 7); c.fill(); c.stroke(); c.restore(); } break; }
    case 'bfly': { const fl = Math.sin(t*7)*.12;
      for (const d of [-1, 1]){ c.save(); c.translate(d*R*.55, -ry*.25); c.rotate(d*(.35 + fl));
        c.fillStyle = '#ff9ec7'; c.beginPath(); c.ellipse(d*R*.38, -R*.08, R*.38, R*.3, d*.4, 0, 7); c.fill();
        c.fillStyle = '#a893ff'; c.beginPath(); c.ellipse(d*R*.28, R*.28, R*.24, R*.2, -d*.3, 0, 7); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(d*R*.45, -R*.1, R*.07, 0, 7); c.fill(); c.restore(); } break; }
    case 'cape': { const sw = Math.sin(t*3)*R*.1; c.fillStyle = '#e8473f'; c.beginPath(); c.moveTo(-R*.55, -ry*.15);
      c.quadraticCurveTo(-R*.98 + sw, ry*.55, -R*.75 + sw, ry*.92); c.lineTo(R*.75 + sw, ry*.92); c.quadraticCurveTo(R*.98 + sw, ry*.55, R*.55, -ry*.15); c.closePath(); c.fill(); break; }
    case 'backpack': c.fillStyle = '#ff8c3a'; rrC(c, R*.5, -ry*.4, R*.52, ry*.95, R*.13); c.fill(); c.fillStyle = '#ffb36b'; rrC(c, R*.58, -ry*.05, R*.36, ry*.35, R*.08); c.fill(); break;
    case 'balloon': { const by = -ry*1.95 + Math.sin(t*1.5)*R*.06, bx = R*.55 + Math.sin(t*1.1)*R*.05;
      c.strokeStyle = 'rgba(80,60,90,.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(R*.25, -ry*.65); c.quadraticCurveTo(R*.5, -ry*1.2, bx, by + R*.32); c.stroke();
      c.fillStyle = '#ff6f9a'; c.beginPath(); c.ellipse(bx, by, R*.27, R*.33, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(bx - R*.09, by - R*.1, R*.06, R*.1, -.4, 0, 7); c.fill(); break; }
  }
  c.restore();
}
let trampFx = 0;
function drawFurnShape(c, id, cx, cy, S, t, live, v = 0){
  const F = FURN[id]; if (!F) return;
  if (v){ drawFurnAlt(c, id, v, cx, cy, S, t, live); return; }
  if (F.e){ emojiC(c, F.e, cx, cy, S); return; }
  const w = S * (F.wf || 1);
  c.save();
  switch (id){
    case 'lampada': {
      c.fillStyle = '#5b4b6b'; c.beginPath(); c.moveTo(cx - w*.4, cy + S*.5); c.lineTo(cx + w*.4, cy + S*.5); c.lineTo(cx + w*.22, cy + S*.3); c.lineTo(cx - w*.22, cy + S*.3); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(cx - w*.15, cy - S*.45); c.lineTo(cx + w*.15, cy - S*.45); c.lineTo(cx + w*.08, cy - S*.5); c.lineTo(cx - w*.08, cy - S*.5); c.closePath(); c.fill();
      const g = c.createLinearGradient(0, cy - S*.45, 0, cy + S*.3); g.addColorStop(0, '#ff9ec7'); g.addColorStop(1, '#a893ff'); c.fillStyle = g;
      c.beginPath(); c.moveTo(cx - w*.15, cy - S*.45); c.quadraticCurveTo(cx - w*.48, cy, cx - w*.22, cy + S*.3); c.lineTo(cx + w*.22, cy + S*.3); c.quadraticCurveTo(cx + w*.48, cy, cx + w*.15, cy - S*.45); c.closePath(); c.fill();
      c.fillStyle = '#ffe27a'; for (let i = 0; i < 3; i++){ const yy = cy + Math.sin(t*.8 + i*2.1)*S*.22 - S*.05; c.beginPath(); c.ellipse(cx + (i - 1)*w*.09, yy, w*.1, S*.065, 0, 0, 7); c.fill(); }
      break; }
    case 'cuscino':
      c.fillStyle = '#ff8fbf'; c.beginPath(); c.ellipse(cx, cy + S*.1, w*.5, S*.42, 0, 0, 7); c.fill();
      c.fillStyle = '#ff5f9f'; heartC(c, cx, cy - S*.12, S*.22); break;
    case 'letto':
      c.fillStyle = '#c99a6b'; rrC(c, cx - w*.5, cy - S*.95, w*.1, S*1.45, 5); c.fill(); rrC(c, cx - w*.5, cy + S*.05, w, S*.45, 5); c.fill();
      c.fillStyle = '#fff'; rrC(c, cx - w*.44, cy - S*.25, w*.9, S*.32, 6); c.fill();
      c.fillStyle = '#ffffff'; rrC(c, cx - w*.43, cy - S*.55, w*.2, S*.32, 8); c.fill(); c.strokeStyle = 'rgba(180,160,190,.5)'; c.lineWidth = 1; c.stroke();
      if (!(live && state && state.sleeping)){ c.fillStyle = '#a893ff'; rrC(c, cx - w*.12, cy - S*.3, w*.58, S*.36, 6); c.fill();
        c.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 5; i++){ c.beginPath(); c.arc(cx - w*.05 + i*w*.1, cy - S*.12 + (i % 2)*S*.08, S*.04, 0, 7); c.fill(); } }
      break;
    case 'trampolino': {
      const dip = live ? trampFx * S * .35 : 0;
      c.strokeStyle = '#5b4b6b'; c.lineWidth = 3; c.lineCap = 'round';
      for (const d of [-1, 1]){ c.beginPath(); c.moveTo(cx + d*w*.36, cy - S*.05); c.lineTo(cx + d*w*.42, cy + S*.5); c.stroke(); }
      c.fillStyle = '#5b4b6b'; c.beginPath(); c.ellipse(cx, cy - S*.12, w*.5, S*.32, 0, 0, 7); c.fill();
      c.fillStyle = '#7cc8ff'; c.beginPath(); c.ellipse(cx, cy - S*.12 + dip, w*.43, S*.22, 0, 0, 7); c.fill();
      c.fillStyle = '#ffe27a'; for (let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2; c.beginPath(); c.arc(cx + Math.cos(a)*w*.465, cy - S*.12 + Math.sin(a)*S*.27, 1.8, 0, 7); c.fill(); }
      break; }
    case 'tenda':
      c.strokeStyle = '#8a5a2b'; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx - w*.12, cy - S*.62); c.lineTo(cx + w*.1, cy - S*.4); c.moveTo(cx + w*.12, cy - S*.62); c.lineTo(cx - w*.1, cy - S*.4); c.stroke();
      c.beginPath(); c.moveTo(cx, cy - S*.48); c.lineTo(cx - w*.5, cy + S*.5); c.lineTo(cx + w*.5, cy + S*.5); c.closePath();
      c.save(); c.clip(); for (let i = 0; i < 7; i++){ c.fillStyle = i % 2 ? '#ffd6e7' : '#ff9ec7'; c.fillRect(cx - w*.5, cy - S*.5 + i*S*.15, w, S*.15); } c.restore();
      c.fillStyle = '#5b3a4f'; c.beginPath(); c.moveTo(cx, cy - S*.02); c.lineTo(cx - w*.17, cy + S*.5); c.lineTo(cx + w*.17, cy + S*.5); c.closePath(); c.fill();
      c.fillStyle = '#ffe27a'; c.beginPath(); c.moveTo(cx + w*.12, cy - S*.62); c.lineTo(cx + w*.3, cy - S*.56); c.lineTo(cx + w*.12, cy - S*.5); c.closePath(); c.fill();
      break;
    case 'piscina': {
      const cols = ['#ff8fbf','#ffc94f','#6fdcb6','#a893ff','#7cc8ff'];
      c.fillStyle = '#bfe8ff'; rrC(c, cx - w*.5, cy - S*.28, w, S*.78, S*.22); c.fill(); c.strokeStyle = '#7cc8ff'; c.lineWidth = 3; c.stroke();
      for (let i = 0; i < 16; i++){ c.fillStyle = cols[i % 5]; const row = i >= 9 ? 1 : 0, k = row ? i - 9 : i;
        c.beginPath(); c.arc(cx - w*.42 + k*w*(row ? .13 : .105) + row*w*.05, cy - S*.3 - row*S*.13 + Math.sin(t*2 + i)*1.2, S*.14, 0, 7); c.fill(); }
      break; }
    case 'specchio': {
      c.strokeStyle = '#c9a46a'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx - w*.3, cy + S*.5); c.lineTo(cx, cy + S*.25); c.lineTo(cx + w*.3, cy + S*.5); c.stroke();
      c.fillStyle = '#e0b44a'; c.beginPath(); c.ellipse(cx, cy - S*.1, w*.5, S*.4, 0, 0, 7); c.fill();
      const g = c.createLinearGradient(cx - w*.4, cy - S*.4, cx + w*.4, cy + S*.2); g.addColorStop(0, '#e9f6ff'); g.addColorStop(1, '#a9d6fb'); c.fillStyle = g;
      c.beginPath(); c.ellipse(cx, cy - S*.1, w*.4, S*.33, 0, 0, 7); c.fill();
      if (live && petVisible() && Math.abs(pet.x - cx) < R * 2.6){
        c.save(); c.beginPath(); c.ellipse(cx, cy - S*.1, w*.4, S*.33, 0, 0, 7); c.clip();
        const pal = palFor(state); c.fillStyle = pal.b; c.globalAlpha = .75; c.beginPath(); c.ellipse(cx + (pet.x - cx)*.15, cy + S*.08, w*.3, S*.2, 0, 0, 7); c.fill();
        c.fillStyle = '#3b2842'; for (const d of [-1, 1]){ c.beginPath(); c.arc(cx + (pet.x - cx)*.15 + d*w*.1, cy + S*.02, 1.8, 0, 7); c.fill(); } c.restore(); }
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - w*.2, cy - S*.3); c.lineTo(cx - w*.05, cy - S*.38); c.stroke();
      break; }
    case 'lucine': {
      const half = w / 2, x0 = cx - half, x1 = cx + half, ctrlY = cy + S*1.4;
      c.strokeStyle = 'rgba(90,70,90,.6)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0, cy); c.quadraticCurveTo(cx, ctrlY, x1, cy); c.stroke();
      const cols = ['#ff6f9a','#ffd24a','#6fdcb6','#7cc8ff','#a893ff'];
      for (let i = 1; i < 12; i++){ const u = i / 12, x = (1-u)*(1-u)*x0 + 2*(1-u)*u*cx + u*u*x1, y = (1-u)*(1-u)*cy + 2*(1-u)*u*ctrlY + u*u*cy;
        c.globalAlpha = .55 + .45*Math.sin(t*3 + i*1.7); c.fillStyle = cols[i % 5]; c.beginPath(); c.ellipse(x, y + S*.35, S*.22, S*.32, 0, 0, 7); c.fill(); }
      c.globalAlpha = 1; break; }
    case 'orologio': {
      c.fillStyle = '#a8743f'; c.beginPath(); c.moveTo(cx - w*.62, cy - S*.28); c.lineTo(cx, cy - S*.62); c.lineTo(cx + w*.62, cy - S*.28); c.closePath(); c.fill();
      c.fillStyle = '#c99a6b'; rrC(c, cx - w*.5, cy - S*.3, w, S*.75, 6); c.fill();
      c.strokeStyle = '#8a5a2b'; c.lineWidth = 2; const sw = Math.sin(t*3)*.35; c.beginPath(); c.moveTo(cx, cy + S*.42); c.lineTo(cx + Math.sin(sw)*S*.35, cy + S*.42 + Math.cos(sw)*S*.35); c.stroke();
      c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(cx + Math.sin(sw)*S*.35, cy + S*.42 + Math.cos(sw)*S*.35, S*.06, 0, 7); c.fill();
      c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(cx, cy + S*.06, w*.36, 0, 7); c.fill();
      const d = new Date(), hA = ((d.getHours() % 12) + d.getMinutes() / 60) / 12 * Math.PI * 2, mA = d.getMinutes() / 60 * Math.PI * 2;
      c.strokeStyle = '#3b2842'; c.lineCap = 'round'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(cx, cy + S*.06); c.lineTo(cx + Math.sin(hA)*w*.18, cy + S*.06 - Math.cos(hA)*w*.18); c.stroke();
      c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx, cy + S*.06); c.lineTo(cx + Math.sin(mA)*w*.28, cy + S*.06 - Math.cos(mA)*w*.28); c.stroke();
      break; }
    case 'acquario': {
      c.fillStyle = 'rgba(124,200,255,.5)'; rrC(c, cx - w*.5, cy - S*.5, w, S, 8); c.fill(); c.strokeStyle = '#d7efff'; c.lineWidth = 3; c.stroke();
      c.fillStyle = '#f3d9a4'; rrC(c, cx - w*.48, cy + S*.3, w*.96, S*.18, 6); c.fill();
      c.strokeStyle = '#4fbf7a'; c.lineWidth = 2.5; for (const px of [-.3, .25]){ c.beginPath(); c.moveTo(cx + px*w, cy + S*.35); c.quadraticCurveTo(cx + px*w + Math.sin(t*2)*4, cy, cx + px*w, cy - S*.15); c.stroke(); }
      for (let i = 0; i < 2; i++){ const ph = t*.7 + i*2.5, fxp = cx + Math.sin(ph)*w*.32, fy = cy - S*.1 + i*S*.22, dir = Math.cos(ph) >= 0 ? 1 : -1;
        c.fillStyle = i ? '#ff8c3a' : '#ffd24a'; c.beginPath(); c.ellipse(fxp, fy, S*.1, S*.065, 0, 0, 7); c.fill();
        c.beginPath(); c.moveTo(fxp - dir*S*.08, fy); c.lineTo(fxp - dir*S*.17, fy - S*.06); c.lineTo(fxp - dir*S*.17, fy + S*.06); c.closePath(); c.fill(); }
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1; for (let i = 0; i < 3; i++){ const by = cy + S*.3 - ((t*20 + i*15) % (S*.75)); c.beginPath(); c.arc(cx + w*.3, by, 2, 0, 7); c.stroke(); }
      break; }
    case 'canestro': {
      c.fillStyle = '#ffffff'; c.strokeStyle = 'rgba(180,150,170,.8)'; c.lineWidth = 2; rrC(c, cx - w*.55, cy - S*.5, w*1.1, S*.45, 6); c.fill(); c.stroke();
      c.strokeStyle = '#ff8fbf'; c.lineWidth = 2.5; rrC(c, cx - w*.22, cy - S*.36, w*.44, S*.24, 3); c.stroke();
      c.strokeStyle = 'rgba(160,120,150,.7)'; c.lineWidth = 1.5; for (let i = 0; i <= 4; i++){ const f = i / 4; c.beginPath(); c.moveTo(cx - w*.38 + f*w*.76, cy); c.lineTo(cx - w*.22 + f*w*.44, cy + S*.42); c.stroke(); }
      c.strokeStyle = '#ff6f6f'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - w*.4, cy); c.lineTo(cx + w*.4, cy); c.stroke();
      break; }
    case 'palla': {
      const r = S * .45; c.fillStyle = '#7cc8ff'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r, -.4, .8); c.closePath(); c.fill();
      c.fillStyle = '#ffc94f'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r, 2.2, 3.2); c.closePath(); c.fill();
      break; }
    case 'ritratto': {
      c.fillStyle = '#e0b44a'; rrC(c, cx - w*.5, cy - S*.5, w, S, 4); c.fill();
      c.fillStyle = '#fff7e6'; rrC(c, cx - w*.4, cy - S*.4, w*.8, S*.8, 3); c.fill();
      const who = live && state ? blobEmoji(blobById(state.id)) : '🐣'; emojiC(c, who, cx, cy + 1, S*.5);
      break; }
  }
  c.restore();
}

// gli altri moduli non possono riassegnare una variabile importata: la cambiano con questi
export function setTrampFx(v){ trampFx = v; }

export { drawAcc, drawFurnShape, emojiC, heartC, rrC, rrPath, star5C, trampFx };
