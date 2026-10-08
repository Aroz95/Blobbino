import { shapeXY } from '../game/blobs.js';
import { heartC, star5C } from './items.js';

/* caratteristiche sulla testa (orecchie, corna, antenne...) */
const SIDE_FEATS = new Set(['ali', 'anello', 'nori', 'pirottino', 'baffi', 'cresta']);
const FRONT_FEATS = new Set(['nori', 'pirottino', 'panna', 'berretto', 'bandana', 'cappellofungo', 'baffi']);
function drawFeat(c, f, rx, ry, R, t, pal, layer = 'back', topU = -1){
  const col = pal.b, top = ry*topU*.9;
  if (f === 'anello'){ c.save(); c.strokeStyle = '#ffd88a'; c.lineWidth = R*.1; c.lineCap = 'round'; c.beginPath();
    if (layer === 'back') c.ellipse(0, ry*.05, rx*1.45, ry*.32, -.22, Math.PI, Math.PI*2); else c.ellipse(0, ry*.05, rx*1.45, ry*.32, -.22, 0, Math.PI);
    c.stroke(); c.restore(); return; }
  if ((layer === 'front') !== FRONT_FEATS.has(f)) return;
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  switch (f){
    case 'picciolo': c.strokeStyle = '#8a5a2b'; c.lineWidth = Math.max(2, R*.07); c.beginPath(); c.moveTo(0, top + R*.05); c.quadraticCurveTo(R*.05, top - R*.15, R*.12, top - R*.25); c.stroke();
      c.fillStyle = '#6fcf73'; c.save(); c.translate(R*.1, top - R*.15); c.rotate(-.5 + Math.sin(t*1.5)*.12); c.beginPath(); c.ellipse(R*.14, 0, R*.15, R*.07, 0, 0, 7); c.fill(); c.restore(); break;
    case 'nori': c.fillStyle = '#2f4a3a'; roundRectC(c, -rx*.42, ry*.28, rx*.84, ry*.5, R*.06); c.fill(); c.fillStyle = 'rgba(255,255,255,.12)'; roundRectC(c, -rx*.36, ry*.33, rx*.2, ry*.38, R*.04); c.fill(); break;
    case 'pirottino': { const y0 = ry*.22, y1 = ry*.8; c.fillStyle = '#ff9ec7'; c.beginPath(); c.moveTo(-rx*.98, y0); for (let i = 0; i <= 8; i++){ const x = -rx*.98 + rx*1.96*i/8; c.quadraticCurveTo(x - rx*.12, y0 - R*.1, x, y0); } c.lineTo(rx*.72, y1); c.lineTo(-rx*.72, y1); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.7)'; for (const [x, y] of [[-.5,.45],[0,.6],[.5,.45],[-.25,.7],[.28,.7]]){ c.beginPath(); c.arc(x*rx, y*ry, R*.04, 0, 7); c.fill(); } break; }
    case 'baffi': c.strokeStyle = 'rgba(90,60,50,.55)'; c.lineWidth = Math.max(1.2, R*.025); for (const d of [-1, 1]) for (const k of [-1, 1]){ c.beginPath(); c.moveTo(d*rx*.42, ry*.18 + k*R*.04); c.lineTo(d*rx*.8, ry*.13 + k*R*.1); c.stroke(); } break;
    case 'cresta': c.fillStyle = '#ffd36b'; for (let i = 0; i < 4; i++){ const a = -Math.PI/2 + .25 + i*.36, [ux, uy] = shapeXY('pera', a), x = ux*rx, y = uy*ry, nx = Math.cos(a), ny = Math.sin(a);
      c.beginPath(); c.moveTo(x - ny*R*.1, y + nx*R*.1); c.lineTo(x + nx*R*.24, y + ny*R*.24); c.lineTo(x + ny*R*.1, y - nx*R*.1); c.closePath(); c.fill(); } break;
    case 'berretto': c.fillStyle = '#8fa8ff'; c.beginPath(); c.moveTo(-rx*.62, top + R*.32); c.quadraticCurveTo(-rx*.1, top - R*.55, rx*.55, top - R*.15 + Math.sin(t*1.5)*R*.04); c.quadraticCurveTo(rx*.3, top + R*.05, rx*.62, top + R*.32); c.closePath(); c.fill();
      c.fillStyle = '#fff'; roundRectC(c, -rx*.66, top + R*.24, rx*1.32, R*.16, R*.08); c.fill(); c.beginPath(); c.arc(rx*.58, top - R*.15 + Math.sin(t*1.5)*R*.04, R*.1, 0, 7); c.fill(); break;
    case 'bandana': c.fillStyle = '#e54b4b'; c.beginPath(); c.ellipse(0, top + R*.3, rx*.82, R*.42, 0, Math.PI, Math.PI*2); c.fill(); c.fillRect(-rx*.82, top + R*.24, rx*1.64, R*.1);
      c.beginPath(); c.moveTo(rx*.75, top + R*.28); c.lineTo(rx*1.05, top + R*.1 + Math.sin(t*3)*R*.04); c.lineTo(rx*1.02, top + R*.45); c.closePath(); c.fill();
      c.fillStyle = '#fff'; for (const [x, y] of [[-.4,.1],[0,-.02],[.4,.1],[-.15,.2],[.2,.2]]){ c.beginPath(); c.arc(x*rx, top + y*R + R*.08, R*.035, 0, 7); c.fill(); } break;
    case 'cappellofungo': c.fillStyle = '#ff5b4d'; c.beginPath(); c.ellipse(0, top + R*.42, rx*1.22, R*.62, 0, Math.PI, Math.PI*2); c.quadraticCurveTo(0, top + R*.55, -rx*1.22, top + R*.42); c.fill();
      c.fillStyle = '#fff'; for (const [x, y, z] of [[-.6,.05,.1],[0,-.15,.13],[.55,0,.09],[-.25,.25,.07],[.3,.25,.07]]){ c.beginPath(); c.arc(x*rx, top + y*R + R*.12, z*R, 0, 7); c.fill(); } break;
    case 'goccia': c.fillStyle = col; c.beginPath(); c.moveTo(R*.05, top - R*.5); c.quadraticCurveTo(R*.24, top - R*.12, R*.05, top + R*.02); c.quadraticCurveTo(-R*.14, top - R*.12, R*.05, top - R*.5); c.fill(); break;
    case 'cuore': c.strokeStyle = col; c.lineWidth = Math.max(2, R*.05); c.beginPath(); c.moveTo(0, top); c.quadraticCurveTo(R*.15, top - R*.25, R*.08, top - R*.38); c.stroke(); c.fillStyle = '#ff5c8d'; heartC(c, R*.08, top - R*.48, R*.15); c.fill(); break;
    case 'foglia': c.strokeStyle = '#5fae5a'; c.lineWidth = Math.max(2, R*.05); c.beginPath(); c.moveTo(0, top); c.lineTo(0, top - R*.25); c.stroke(); c.fillStyle = '#6fcf73'; c.translate(0, top - R*.25); c.rotate(Math.sin(t*1.5)*.15);
      c.beginPath(); c.ellipse(-R*.14, -R*.05, R*.16, R*.08, -.5, 0, 7); c.fill(); c.beginPath(); c.ellipse(R*.14, -R*.08, R*.16, R*.08, .5, 0, 7); c.fill(); break;
    case 'saetta': c.fillStyle = '#ffb300'; c.translate(R*.05, top - R*.05); c.rotate(.2); c.beginPath(); c.moveTo(-R*.05, -R*.45); c.lineTo(R*.14, -R*.45); c.lineTo(R*.03, -R*.22); c.lineTo(R*.16, -R*.22); c.lineTo(-R*.1, R*.05); c.lineTo(-R*.01, -R*.17); c.lineTo(-R*.14, -R*.17); c.closePath(); c.fill(); break;
    case 'stella': { c.strokeStyle = col; c.lineWidth = Math.max(2, R*.05); const sw = Math.sin(t*2)*R*.08; c.beginPath(); c.moveTo(0, top); c.quadraticCurveTo(R*.2, top - R*.3, sw, top - R*.45); c.stroke(); c.fillStyle = '#ffcf3f'; star5C(c, sw, top - R*.52, R*.17); break; }
    case 'ciuffo': c.fillStyle = pal.a; c.strokeStyle = col; c.lineWidth = 1.5; for (const [x, y, z] of [[-.13,-.12,.13],[.12,-.15,.14],[0,-.27,.15]]){ c.beginPath(); c.arc(x*R, top + y*R, z*R, 0, 7); c.fill(); c.stroke(); } break;
    case 'mucca': c.fillStyle = '#fff3d6'; for (const d of [-1, 1]){ c.beginPath(); c.moveTo(d*R*.25, top + R*.05); c.quadraticCurveTo(d*R*.36, top - R*.28, d*R*.42, top - R*.3); c.lineTo(d*R*.36, top + R*.06); c.closePath(); c.fill(); }
      c.fillStyle = col; for (const d of [-1, 1]){ c.beginPath(); c.ellipse(d*rx*.78, top + R*.18, R*.18, R*.08, d*.4, 0, 7); c.fill(); } break;
    case 'antenne': c.strokeStyle = col; c.lineWidth = Math.max(2, R*.045); for (const d of [-1, 1]){ const sw = Math.sin(t*3 + d)*R*.06; c.beginPath(); c.moveTo(d*R*.22, top + R*.04); c.lineTo(d*R*.34 + sw, top - R*.35); c.stroke(); c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(d*R*.34 + sw, top - R*.38, R*.07, 0, 7); c.fill(); } break;
    case 'gemma': c.fillStyle = '#c6f3ff'; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.translate(0, top - R*.22 + Math.sin(t*2)*R*.03); c.beginPath(); c.moveTo(0, -R*.2); c.lineTo(R*.15, -R*.05); c.lineTo(0, R*.18); c.lineTo(-R*.15, -R*.05); c.closePath(); c.fill(); c.stroke(); break;
    case 'cornini': c.fillStyle = '#ffe08a'; for (const d of [-1, 1]){ c.beginPath(); c.moveTo(d*R*.12, top + R*.04); c.quadraticCurveTo(d*R*.22, top - R*.2, d*R*.32, top - R*.26); c.quadraticCurveTo(d*R*.3, top - R*.05, d*R*.32, top + R*.06); c.closePath(); c.fill(); } break;
    case 'gatto': for (const d of [-1, 1]){ c.fillStyle = col; c.beginPath(); c.moveTo(d*R*.18, top + R*.06); c.lineTo(d*R*.42, top - R*.32); c.lineTo(d*R*.6, top + R*.16); c.closePath(); c.fill();
      c.fillStyle = '#ffc6dc'; c.beginPath(); c.moveTo(d*R*.28, top + R*.05); c.lineTo(d*R*.42, top - R*.17); c.lineTo(d*R*.5, top + R*.1); c.closePath(); c.fill(); } break;
    case 'panna': c.fillStyle = '#fffaf5'; for (const [x, y, z] of [[-.2,.02,.15],[.2,.02,.15],[0,-.08,.17],[0,-.25,.12]]){ c.beginPath(); c.arc(x*R, top + y*R, z*R, 0, 7); c.fill(); } c.fillStyle = '#ff4f6d'; c.beginPath(); c.arc(R*.02, top - R*.4, R*.09, 0, 7); c.fill(); break;
    case 'fiocco': c.strokeStyle = '#7fbfff'; c.lineWidth = Math.max(2, R*.045); c.translate(R*.15, top - R*.12); c.rotate(t*.4); for (let i = 0; i < 6; i++){ c.rotate(Math.PI/3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -R*.2); c.moveTo(0, -R*.12); c.lineTo(R*.06, -R*.17); c.moveTo(0, -R*.12); c.lineTo(-R*.06, -R*.17); c.stroke(); } break;
    case 'luna': c.strokeStyle = col; c.lineWidth = Math.max(2, R*.045); c.beginPath(); c.moveTo(0, top); c.lineTo(0, top - R*.28); c.stroke(); c.fillStyle = '#ffe58a'; c.beginPath(); c.arc(0, top - R*.42, R*.15, 0, 7); c.fill();
      c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(R*.08, top - R*.47, R*.13, 0, 7); c.fill(); break;
    case 'corno': c.fillStyle = '#ffd86b'; c.beginPath(); c.moveTo(-R*.1, top + R*.03); c.lineTo(R*.04, top - R*.55); c.lineTo(R*.12, top + R*.03); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5; for (let i = 1; i < 4; i++){ const y = top - R*.13*i; c.beginPath(); c.moveTo(-R*.09 + i*R*.035, y + R*.03); c.lineTo(R*.1 - i*R*.02, y - R*.02); c.stroke(); }
      for (const [x, y, col2] of [[-.3,.02,'#ff9ec7'],[-.38,.12,'#9fd0ff'],[-.42,.24,'#c9a8ff']]){ c.fillStyle = col2; c.beginPath(); c.arc(x*R, top + y*R, R*.09, 0, 7); c.fill(); } break;
    case 'coniglio': for (const d of [-1, 1]){ c.save(); c.translate(d*R*.22, top + R*.05); c.rotate(d*(.18 + Math.sin(t*2 + d)*.06)); c.fillStyle = col; c.beginPath(); c.ellipse(0, -R*.32, R*.12, R*.34, 0, 0, 7); c.fill(); c.fillStyle = '#ffc6dc'; c.beginPath(); c.ellipse(0, -R*.3, R*.06, R*.25, 0, 0, 7); c.fill(); c.restore(); } break;
    case 'elica': c.fillStyle = col; c.beginPath(); c.ellipse(0, top + R*.02, R*.24, R*.13, 0, Math.PI, 0); c.fill(); c.strokeStyle = '#5a4a5a'; c.lineWidth = Math.max(2, R*.04); c.beginPath(); c.moveTo(0, top - R*.1); c.lineTo(0, top - R*.2); c.stroke();
      { const sp = Math.cos(t*12); c.fillStyle = '#ff6fae'; c.beginPath(); c.ellipse(R*.2*sp, top - R*.22, Math.abs(R*.2*sp) + 1, R*.05, 0, 0, 7); c.fill(); c.fillStyle = '#ffc94f'; c.beginPath(); c.ellipse(-R*.2*sp, top - R*.22, Math.abs(R*.2*sp) + 1, R*.05, 0, 0, 7); c.fill(); } break;
    case 'ali': c.fillStyle = 'rgba(255,255,255,.85)'; c.strokeStyle = col; c.lineWidth = 1.5; for (const d of [-1, 1]){ c.save(); c.translate(d*rx*.85, -ry*.15); c.rotate(d*(-.4 + Math.sin(t*8)*.25)); c.beginPath(); c.ellipse(d*R*.18, -R*.12, R*.22, R*.13, d*-.5, 0, 7); c.fill(); c.stroke(); c.restore(); } break;
    case 'arco': c.lineWidth = R*.06; ['#ff8fa8','#ffd36b','#8fe39a','#8cc8ff'].forEach((cc, i) => { c.strokeStyle = cc; c.beginPath(); c.arc(0, top + R*.05, R*(.38 - i*.07), Math.PI*1.1, Math.PI*1.9); c.stroke(); }); break;
  }
  c.restore();
}
function featsOf(V){ return V && V.feat ? V.feat : []; }
function roundRectC(c, x, y, w, h, r){ c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

export { SIDE_FEATS, drawFeat, featsOf };
