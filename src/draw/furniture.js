import { FURN } from '../game/catalog.js';
import { blobById, blobEmoji, palFor, state } from '../game/state.js';
import { curRoom } from '../legacy/shop.js';
import { FLOOR, H, R, W, ball, pet, petVisible } from '../room/scene.js';
import { isNight } from '../room/events.js';
import { emojiC, heartC, rrC, rrPath, star5C, trampFx } from './items.js';
import { star4C } from '../places/valley.js';
import { HOOP } from '../room/hoop.js';

/* ---------- 4 versioni diverse di ogni arredo ---------- */
const FVN = {
  orso:['Orsetto','Coniglio di peluche','Panda di peluche','Dino di peluche'],
  cactus:['Cactus','Cactus a palla','Fico d\'india','Cactus a candela'],
  girasole:['Girasole','Vaso di tulipani','Vaso di rose','Mazzo di margherite'],
  radio:['Radiolina','Chitarra','Tastiera','Tamburo'],
  pianta:['Pianta grande','Palmetta','Abete in vaso','Bambù'],
  cuscino:['Cuscino a cuore','Pouf tondo','Cuscino a stella','Cuscino nuvola'],
  lampada:['Lampada lava','Lampada a fungo','Abat-jour','Lampada luna'],
  specchio:['Specchio','Specchio tondo','Specchio a cuore','Specchio lungo'],
  letto:['Lettino','Cuccia morbida','Amaca','Futon'],
  tenda:['Tenda indiana','Casetta di cartone','Igloo','Fortino di cuscini'],
  trampolino:['Trampolino','Tappeto elastico','Materasso a molle','Fungo gonfiabile'],
  piscina:['Piscina di palline','Piscina gonfiabile','Sabbiera','Vasca di bolle'],
  palla:['Palla da spiaggia','Pallone da basket','Pallina da tennis','Pallone da calcio'],
  canestro:['Canestro','Canestro di legno','Canestro stellato','Canestro neon'],
  quadro:['Quadro','Quadro del tramonto','Mappa del tesoro','Quadro della luna'],
  lanterna:['Lanterna','Palla da discoteca','Lampadina','Candela'],
  ritratto:['Ritratto','Polaroid','Cornice ovale','Cornice a cuore'],
  lucine:['Lucine','Bandierine','Stelline appese','Cuoricini appesi'],
  orologio:['Orologio a cucù','Orologio tondo','Sveglia','Orologio gatto'],
  acquario:['Acquario','Boccia dei pesci','Vasca delle meduse','Terrario']
};
const fName = (id, v) => (FVN[id] && FVN[id][v]) || FURN[id].n;
const HOOPV = [{board:null, line:null, mark:'#ff8fbf', rim:'#ff6f6f', net:'rgba(160,120,150,.7)'}, {board:'#c99a6b', line:'#8a5a2b', mark:'#fff4e0', rim:'#e0742a', net:'rgba(120,90,60,.75)'},
  {board:'#ffe27a', line:'#e0b44a', mark:'#ff8fbf', rim:'#a893ff', net:'rgba(150,120,200,.7)', star:true}, {board:'#2b2547', line:'#6fe6ff', mark:'#ff5fd2', rim:'#6fe6ff', net:'rgba(111,230,255,.7)'}];
function ballStyle(c, r, v){
  if (v === 1){ c.fillStyle = '#ff8c3a'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.strokeStyle = 'rgba(70,30,10,.7)'; c.lineWidth = Math.max(1.2, r * .09);
    c.beginPath(); c.moveTo(-r, 0); c.lineTo(r, 0); c.moveTo(0, -r); c.lineTo(0, r); c.stroke(); c.beginPath(); c.arc(-r * 1.25, 0, r * .8, -.85, .85); c.stroke(); c.beginPath(); c.arc(r * 1.25, 0, r * .8, Math.PI - .85, Math.PI + .85); c.stroke(); }
  else if (v === 2){ c.fillStyle = '#d9f24a'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = Math.max(1.2, r * .12);
    c.beginPath(); c.arc(-r * 1.1, 0, r * .75, -1, 1); c.stroke(); c.beginPath(); c.arc(r * 1.1, 0, r * .75, Math.PI - 1, Math.PI + 1); c.stroke(); }
  else if (v === 3){ c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.strokeStyle = 'rgba(60,40,60,.25)'; c.lineWidth = 1; c.stroke(); c.fillStyle = '#3b2842';
    const pent = (x, y, s) => { c.beginPath(); for (let i = 0; i < 5; i++){ const a = -Math.PI / 2 + i * Math.PI * 2 / 5; c.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); } c.closePath(); c.fill(); };
    pent(0, 0, r * .32); for (let i = 0; i < 5; i++){ const a = -Math.PI / 2 + i * Math.PI * 2 / 5; c.save(); c.beginPath(); c.arc(0, 0, r, 0, 7); c.clip(); pent(Math.cos(a) * r * .95, Math.sin(a) * r * .95, r * .3); c.restore(); } }
  else { c.fillStyle = '#7cc8ff'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, -.4, .8); c.closePath(); c.fill();
    c.fillStyle = '#ffc94f'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r, 2.2, 3.2); c.closePath(); c.fill(); }
}
function potC(c, cx, by, pw, ph, col, rim){
  c.fillStyle = col; c.beginPath(); c.moveTo(cx - pw * .5, by - ph); c.lineTo(cx + pw * .5, by - ph); c.lineTo(cx + pw * .38, by); c.lineTo(cx - pw * .38, by); c.closePath(); c.fill();
  c.fillStyle = rim || col; rrC(c, cx - pw * .56, by - ph - ph * .22, pw * 1.12, ph * .26, 3); c.fill();
}
function plushC(c, cx, cy, S, kind, t){
  const P = {coniglio:{b:'#f6ecff', d:'#e2cff5'}, panda:{b:'#ffffff', d:'#3b3346'}, dino:{b:'#8fd36a', d:'#5fae4a'}}[kind];
  const by = cy + S * .2, hy = cy - S * .14;
  if (kind === 'coniglio') for (const d of [-1, 1]){ c.fillStyle = P.b; c.beginPath(); c.ellipse(cx + d * S * .1, hy - S * .3, S * .07, S * .2, d * .15, 0, 7); c.fill(); c.fillStyle = '#ffc6dc'; c.beginPath(); c.ellipse(cx + d * S * .1, hy - S * .3, S * .035, S * .14, d * .15, 0, 7); c.fill(); }
  if (kind === 'panda') for (const d of [-1, 1]){ c.fillStyle = P.d; c.beginPath(); c.arc(cx + d * S * .17, hy - S * .16, S * .07, 0, 7); c.fill(); }
  if (kind === 'dino'){ c.fillStyle = P.d; c.beginPath(); c.moveTo(cx + S * .22, by + S * .1); c.quadraticCurveTo(cx + S * .5, by + S * .05, cx + S * .48, by - S * .12); c.quadraticCurveTo(cx + S * .36, by + S * .02, cx + S * .2, by - S * .04); c.fill();
    c.fillStyle = '#ffd24a'; for (let i = 0; i < 4; i++){ const a = -2.4 + i * .5, x = cx + Math.cos(a) * S * .24, y = hy + Math.sin(a) * S * .22; c.beginPath(); c.moveTo(x - S * .04, y); c.lineTo(x + Math.cos(a) * S * .1, y + Math.sin(a) * S * .1); c.lineTo(x + S * .04, y); c.fill(); } }
  c.fillStyle = kind === 'panda' ? P.d : P.b; for (const d of [-1, 1]){ c.beginPath(); c.ellipse(cx + d * S * .25, by - S * .02, S * .08, S * .13, d * .5, 0, 7); c.fill(); }
  c.fillStyle = P.b; c.beginPath(); c.ellipse(cx, by, S * .27, S * .25, 0, 0, 7); c.fill();
  c.fillStyle = kind === 'panda' ? P.d : P.b; for (const d of [-1, 1]){ c.beginPath(); c.ellipse(cx + d * S * .15, by + S * .22, S * .1, S * .07, 0, 0, 7); c.fill(); }
  c.fillStyle = kind === 'dino' ? '#d7f5b8' : '#fff'; c.beginPath(); c.ellipse(cx, by + S * .04, S * .15, S * .14, 0, 0, 7); c.fill();
  c.fillStyle = P.b; c.beginPath(); c.arc(cx, hy, S * .22, 0, 7); c.fill(); if (kind === 'coniglio' || kind === 'panda'){ c.strokeStyle = 'rgba(120,100,130,.25)'; c.lineWidth = 1; c.stroke(); }
  if (kind === 'panda'){ c.fillStyle = P.d; for (const d of [-1, 1]){ c.beginPath(); c.ellipse(cx + d * S * .08, hy - S * .01, S * .055, S * .07, d * .4, 0, 7); c.fill(); } }
  c.fillStyle = kind === 'panda' ? '#fff' : '#3b2842'; for (const d of [-1, 1]){ c.beginPath(); c.arc(cx + d * S * .08, hy - S * .01, S * .025, 0, 7); c.fill(); }
  c.fillStyle = kind === 'coniglio' ? '#ff8fb3' : '#3b2842'; c.beginPath(); c.arc(cx, hy + S * .07, S * .025, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,143,179,.45)'; for (const d of [-1, 1]){ c.beginPath(); c.ellipse(cx + d * S * .14, hy + S * .07, S * .04, S * .025, 0, 0, 7); c.fill(); }
}
function mirrorGlass(c, cx, cy, S, w, path, live){
  c.save(); path(); c.clip();
  const g = c.createLinearGradient(cx - w * .4, cy - S * .4, cx + w * .4, cy + S * .2); g.addColorStop(0, '#e9f6ff'); g.addColorStop(1, '#a9d6fb'); c.fillStyle = g; c.fillRect(cx - w, cy - S, w * 2, S * 2);
  if (live && petVisible() && Math.abs(pet.x - cx) < R * 2.6){ const pal = palFor(state); c.fillStyle = pal.b; c.globalAlpha = .75; c.beginPath(); c.ellipse(cx + (pet.x - cx) * .15, cy + S * .08, w * .3, S * .2, 0, 0, 7); c.fill(); c.globalAlpha = 1;
    c.fillStyle = '#3b2842'; for (const d of [-1, 1]){ c.beginPath(); c.arc(cx + (pet.x - cx) * .15 + d * w * .1, cy + S * .02, 1.8, 0, 7); c.fill(); } }
  c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - w * .2, cy - S * .3); c.lineTo(cx - w * .05, cy - S * .38); c.stroke();
  c.restore();
}
function clockHands(c, x, y, rr){
  const d = new Date(), hA = ((d.getHours() % 12) + d.getMinutes() / 60) / 12 * Math.PI * 2, mA = d.getMinutes() / 60 * Math.PI * 2;
  c.strokeStyle = '#3b2842'; c.lineCap = 'round'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(hA) * rr * .5, y - Math.cos(hA) * rr * .5); c.stroke();
  c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.sin(mA) * rr * .78, y - Math.cos(mA) * rr * .78); c.stroke();
}
function drawFurnAlt(c, id, v, cx, cy, S, t, live){
  const F = FURN[id], w = S * (F.wf || 1), base = cy + S * .5;
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  switch (id){
    case 'orso': plushC(c, cx, cy, S, ['', 'coniglio', 'panda', 'dino'][v], t); break;
    case 'cactus': {
      potC(c, cx, base, S * .42, S * .26, v === 3 ? '#ffffff' : '#d9784a', v === 3 ? '#f1e7ee' : '#e98c5c');
      if (v === 3){ c.fillStyle = '#ff9ec7'; for (const [x, y] of [[-.1, -.12], [.1, -.15], [0, -.08]]){ c.beginPath(); c.arc(cx + x * S, base + y * S, S * .018, 0, 7); c.fill(); } }
      const top = base - S * .32;
      if (v === 1){ c.fillStyle = '#5fbf63'; c.beginPath(); c.ellipse(cx, top - S * .17, S * .22, S * .2, 0, 0, 7); c.fill(); c.strokeStyle = '#3f9a4a'; c.lineWidth = 1.2; for (const k of [-.12, 0, .12]){ c.beginPath(); c.ellipse(cx + k * S * .5, top - S * .17, S * .05, S * .19, 0, 0, 7); c.stroke(); }
        for (let i = 0; i < 5; i++){ const a = i * 1.26; c.fillStyle = '#ff7aa8'; c.beginPath(); c.ellipse(cx + Math.cos(a) * S * .05, top - S * .38 + Math.sin(a) * S * .05, S * .05, S * .03, a, 0, 7); c.fill(); } c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(cx, top - S * .38, S * .03, 0, 7); c.fill(); }
      else if (v === 2){ c.fillStyle = '#6fc46a'; const pads = [[0, -.18, .14, .2, 0], [-.15, -.42, .1, .14, -.5], [.14, -.44, .1, .15, .45]];
        for (const [x, y, a, b, r] of pads){ c.beginPath(); c.ellipse(cx + x * S, top + y * S + S * .1, a * S, b * S, r, 0, 7); c.fill(); }
        c.fillStyle = '#ff5f6d'; for (const [x, y] of [[-.18, -.56], [.18, -.6], [.04, -.42]]){ c.beginPath(); c.ellipse(cx + x * S, top + y * S + S * .1, S * .035, S * .045, 0, 0, 7); c.fill(); }
        c.fillStyle = '#e9ffd6'; for (let i = 0; i < 10; i++){ const [x, y] = pads[i % 3]; c.beginPath(); c.arc(cx + (x + Math.cos(i * 2.3) * .06) * S, top + (y + Math.sin(i * 1.7) * .1) * S + S * .1, 1.2, 0, 7); c.fill(); } }
      else { c.fillStyle = '#58b56a'; for (const [x, hh, ww] of [[0, .62, .09], [-.12, .4, .07], [.12, .48, .075]]){ rrC(c, cx + x * S - ww * S, top - hh * S, ww * 2 * S, hh * S + 2, ww * S); c.fill(); }
        c.fillStyle = '#fff3b0'; for (const [x, hh] of [[0, .62], [-.12, .4], [.12, .48]]){ c.beginPath(); c.arc(cx + x * S, top - hh * S + 3, S * .025, 0, 7); c.fill(); } }
      break; }
    case 'girasole': {
      const flower = ['', '🌷', '🌹', '🌼'][v];
      if (v === 2){ c.fillStyle = 'rgba(190,230,255,.65)'; rrC(c, cx - S * .12, base - S * .4, S * .24, S * .4, S * .06); c.fill(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5; c.stroke(); }
      else potC(c, cx, base, S * .4, S * .26, v === 1 ? '#ffd24a' : '#7cc8ff', v === 1 ? '#ffe27a' : '#a9d6fb');
      const heads = v === 3 ? [[-.16, -.62], [0, -.74], [.16, -.6], [-.07, -.5], [.09, -.5]] : [[-.14, -.66], [0, -.78], [.14, -.64]];
      c.strokeStyle = '#4fae5a'; c.lineWidth = 2; for (const [x, y] of heads){ c.beginPath(); c.moveTo(cx, base - S * .3); c.quadraticCurveTo(cx + x * S * .6, base - S * .5, cx + x * S, base + y * S + S * .1); c.stroke(); }
      for (const [x, y] of heads) emojiC(c, flower, cx + x * S, base + y * S, S * (v === 3 ? .22 : .28), Math.sin(t + x * 9) * .08);
      break; }
    case 'radio': emojiC(c, ['', '🎸', '🎹', '🥁'][v], cx, cy - (v === 1 ? S * .2 : 0), S * (v === 1 ? 1.45 : 1.15), v === 1 ? -.35 : 0); break;
    case 'pianta': potC(c, cx, base, S * .42, S * .28, ['', '#c97a4a', '#ffffff', '#3f9a8a'][v], ['', '#d98c5c', '#eee5ec', '#56b3a2'][v]); emojiC(c, ['', '🌴', '🌲', '🎋'][v], cx, base - S * .62, S * .72); break;
    case 'cuscino':
      if (v === 1){ c.fillStyle = '#6fdcb6'; c.beginPath(); c.ellipse(cx, cy + S * .05, w * .46, S * .5, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(cx, cy - S * .28, w * .4, S * .14, 0, 0, 7); c.fill();
        c.fillStyle = '#3fae8a'; for (const d of [-1, 0, 1]){ c.beginPath(); c.arc(cx + d * w * .2, cy + S * .05, S * .06, 0, 7); c.fill(); } }
      else if (v === 2){ c.fillStyle = '#ffd24a'; c.save(); c.translate(cx, cy + S * .05); c.scale(w / S * .55, 1); star5C(c, 0, 0, S * .62); c.restore(); c.fillStyle = '#3b2842'; for (const d of [-1, 1]){ c.beginPath(); c.arc(cx + d * S * .12, cy + S * .02, 1.6, 0, 7); c.fill(); } }
      else { c.fillStyle = '#eaf4ff'; for (const [x, y, r] of [[-.3, .12, .3], [0, -.05, .42], [.3, .12, .3], [-.15, .2, .3], [.15, .2, .3]]){ c.beginPath(); c.ellipse(cx + x * w, cy + y * S, r * w * .55, r * S * 1.1, 0, 0, 7); c.fill(); } c.fillStyle = '#3b2842'; for (const d of [-1, 1]){ c.beginPath(); c.arc(cx + d * w * .08, cy + S * .02, 1.6, 0, 7); c.fill(); } }
      break;
    case 'lampada':
      if (v === 1){ c.fillStyle = '#e9d8c0'; rrC(c, cx - S * .06, cy - S * .05, S * .12, S * .55, 4); c.fill();
        const glow = c.createRadialGradient(cx, cy - S * .2, 2, cx, cy - S * .2, S * .55); glow.addColorStop(0, 'rgba(255,220,140,.4)'); glow.addColorStop(1, 'rgba(255,220,140,0)'); c.fillStyle = glow; c.beginPath(); c.arc(cx, cy - S * .2, S * .55, 0, 7); c.fill();
        c.fillStyle = '#ff5b4d'; c.beginPath(); c.ellipse(cx, cy - S * .1, S * .3, S * .28, 0, Math.PI, 0); c.fill(); c.fillStyle = '#fff'; for (const [x, y, r] of [[-.15, -.2, .05], [.05, -.3, .06], [.17, -.17, .04]]){ c.beginPath(); c.arc(cx + x * S, cy + y * S, r * S, 0, 7); c.fill(); } }
      else if (v === 2){ c.fillStyle = '#c9a46a'; c.beginPath(); c.ellipse(cx, base - S * .03, S * .16, S * .05, 0, 0, 7); c.fill(); c.fillRect(cx - 1.5, cy - S * .2, 3, S * .66);
        const glow = c.createRadialGradient(cx, cy - S * .15, 2, cx, cy - S * .15, S * .5); glow.addColorStop(0, 'rgba(255,230,160,.45)'); glow.addColorStop(1, 'rgba(255,230,160,0)'); c.fillStyle = glow; c.beginPath(); c.arc(cx, cy - S * .15, S * .5, 0, 7); c.fill();
        c.fillStyle = '#fff3d6'; c.beginPath(); c.moveTo(cx - S * .12, cy - S * .42); c.lineTo(cx + S * .12, cy - S * .42); c.lineTo(cx + S * .22, cy - S * .14); c.lineTo(cx - S * .22, cy - S * .14); c.closePath(); c.fill(); c.strokeStyle = '#e8c88a'; c.lineWidth = 1.5; c.stroke(); }
      else { c.fillStyle = '#b8a8d0'; rrC(c, cx - S * .12, base - S * .08, S * .24, S * .08, 3); c.fill(); c.fillRect(cx - 1.5, base - S * .2, 3, S * .14);
        const glow = c.createRadialGradient(cx, cy - S * .12, S * .1, cx, cy - S * .12, S * .55); glow.addColorStop(0, 'rgba(255,246,200,.5)'); glow.addColorStop(1, 'rgba(255,246,200,0)'); c.fillStyle = glow; c.beginPath(); c.arc(cx, cy - S * .12, S * .55, 0, 7); c.fill();
        c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(cx, cy - S * .12, S * .25, 0, 7); c.fill(); c.fillStyle = 'rgba(220,200,140,.6)'; for (const [x, y, r] of [[-.08, -.18, .05], [.09, -.05, .04], [.02, -.02, .03]]){ c.beginPath(); c.arc(cx + x * S, cy + y * S, r * S, 0, 7); c.fill(); } }
      break;
    case 'specchio': {
      c.strokeStyle = '#c9a46a'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx - w * .3, cy + S * .5); c.lineTo(cx, cy + S * .25); c.lineTo(cx + w * .3, cy + S * .5); c.stroke();
      let path;
      if (v === 1){ path = () => { c.beginPath(); c.arc(cx, cy - S * .1, w * .4, 0, 7); }; c.fillStyle = '#ff8fbf'; c.beginPath(); c.arc(cx, cy - S * .1, w * .5, 0, 7); c.fill(); }
      else if (v === 2){ const hp = (k) => { c.beginPath(); const s = w * k, x = cx, y = cy - S * .28; c.moveTo(x, y + s * .3); c.bezierCurveTo(x, y - s * .3, x - s, y - s * .3, x - s, y + s * .2); c.bezierCurveTo(x - s, y + s * .7, x, y + s, x, y + s * 1.2); c.bezierCurveTo(x, y + s, x + s, y + s * .7, x + s, y + s * .2); c.bezierCurveTo(x + s, y - s * .3, x, y - s * .3, x, y + s * .3); };
        c.fillStyle = '#ff5f7f'; hp(.62); c.fill(); path = () => hp(.5); }
      else { path = () => { c.beginPath(); rrPath(c, cx - w * .33, cy - S * .55, w * .66, S * .82, w * .12); }; c.fillStyle = '#e0b44a'; c.beginPath(); rrPath(c, cx - w * .42, cy - S * .62, w * .84, S * .96, w * .16); c.fill(); }
      mirrorGlass(c, cx, cy, S, w, path, live); break; }
    case 'letto':
      if (v === 1){ c.fillStyle = '#ff9ec7'; c.beginPath(); c.ellipse(cx, cy + S * .15, w * .5, S * .38, 0, 0, 7); c.fill(); c.fillStyle = '#ffd6e7'; c.beginPath(); c.ellipse(cx, cy + S * .08, w * .4, S * .24, 0, 0, 7); c.fill();
        c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(cx - w * .25, cy + S * .02, w * .12, S * .12, 0, 0, 7); c.fill(); }
      else if (v === 2){ c.strokeStyle = '#8a5a2b'; c.lineWidth = 3; for (const d of [-1, 1]){ c.beginPath(); c.moveTo(cx + d * w * .5, base); c.lineTo(cx + d * w * .5, cy - S * 1.1); c.stroke(); }
        c.strokeStyle = '#c9a46a'; c.lineWidth = 1.5; for (const d of [-1, 1]){ c.beginPath(); c.moveTo(cx + d * w * .5, cy - S); c.lineTo(cx + d * w * .4, cy - S * .55); c.stroke(); }
        const sag = live && state && state.sleeping ? S * .1 : 0; c.fillStyle = '#7cc8ff'; c.beginPath(); c.moveTo(cx - w * .4, cy - S * .6); c.quadraticCurveTo(cx, cy + S * .25 + sag, cx + w * .4, cy - S * .6); c.quadraticCurveTo(cx, cy + S * .05 + sag, cx - w * .4, cy - S * .6); c.fill();
        c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - w * .3, cy - S * .43); c.quadraticCurveTo(cx, cy + S * .1 + sag, cx + w * .3, cy - S * .43); c.stroke(); }
      else { c.fillStyle = '#e8dccf'; rrC(c, cx - w * .5, cy + S * .05, w, S * .42, 8); c.fill(); c.fillStyle = '#ffffff'; rrC(c, cx - w * .46, cy - S * .15, w * .22, S * .25, 8); c.fill();
        if (!(live && state && state.sleeping)){ c.fillStyle = '#2c3570'; rrC(c, cx - w * .2, cy - S * .05, w * .68, S * .2, 6); c.fill(); c.fillStyle = '#ffe27a'; for (let i = 0; i < 5; i++) star4C(c, cx - w * .1 + i * w * .13, cy + S * .05 + (i % 2) * S * .04, S * .05); } }
      break;
    case 'tenda':
      if (v === 1){ c.fillStyle = '#d9a46a'; c.fillRect(cx - w * .48, cy - S * .2, w * .96, S * .7); c.fillStyle = '#c48e55'; c.beginPath(); c.moveTo(cx - w * .48, cy - S * .2); c.lineTo(cx - w * .62, cy - S * .48); c.lineTo(cx - w * .06, cy - S * .48); c.lineTo(cx, cy - S * .2); c.fill(); c.beginPath(); c.moveTo(cx + w * .48, cy - S * .2); c.lineTo(cx + w * .62, cy - S * .48); c.lineTo(cx + w * .06, cy - S * .48); c.lineTo(cx, cy - S * .2); c.fill();
        c.fillStyle = '#5b3a2f'; c.beginPath(); c.moveTo(cx - w * .17, base); c.lineTo(cx - w * .17, cy + S * .1); c.arc(cx, cy + S * .1, w * .17, Math.PI, 0); c.lineTo(cx + w * .17, base); c.fill(); c.fillStyle = '#ff8fbf'; heartC(c, cx + w * .3, cy - S * .05, S * .05); }
      else if (v === 2){ c.fillStyle = '#e8f4ff'; c.beginPath(); c.moveTo(cx - w * .52, base); c.arc(cx, base, w * .52, Math.PI, 0); c.closePath(); c.fill(); c.strokeStyle = '#9cc7e6'; c.lineWidth = 2; c.stroke(); c.lineWidth = 1.5;
        for (let r = 1; r <= 3; r++){ const yy = base - r * S * .22; const hw2 = Math.sqrt(Math.max(0, (w * .52) ** 2 - (r * S * .22) ** 2)); c.beginPath(); c.moveTo(cx - hw2, yy); c.lineTo(cx + hw2, yy); c.stroke(); for (let i = -2; i <= 2; i++){ const x = cx + i * w * .2 + (r % 2) * w * .1; if (Math.abs(x - cx) < hw2){ c.beginPath(); c.moveTo(x, yy); c.lineTo(x, yy + S * .22); c.stroke(); } } }
        c.fillStyle = '#3b4a6a'; c.beginPath(); c.moveTo(cx - w * .17, base); c.arc(cx, base, w * .17, Math.PI, 0); c.fill(); }
      else { const cols = ['#ff9ec7', '#ffd24a', '#7cc8ff', '#a893ff', '#6fdcb6'];
        for (const [x, y, ww, hh, i] of [[-.38, .32, .26, .36, 0], [.38, .32, .26, .36, 1], [-.36, -.02, .24, .3, 2], [.36, -.02, .24, .3, 3], [0, -.32, .7, .26, 4]]){ c.fillStyle = cols[i]; rrC(c, cx + x * w - ww * w * .5, cy + y * S - hh * S * .5, ww * w, hh * S, S * .08); c.fill(); }
        c.fillStyle = 'rgba(60,40,70,.55)'; c.beginPath(); c.moveTo(cx - w * .2, base); c.lineTo(cx - w * .2, cy - S * .1); c.lineTo(cx + w * .2, cy - S * .1); c.lineTo(cx + w * .2, base); c.fill(); }
      break;
    case 'trampolino': {
      const dip = live ? trampFx * S * .35 : 0;
      if (v === 1){ c.strokeStyle = '#5b4b6b'; c.lineWidth = 3; for (const d of [-1, 1]){ c.beginPath(); c.moveTo(cx + d * w * .42, cy - S * .05); c.lineTo(cx + d * w * .42, cy + S * .5); c.stroke(); }
        c.fillStyle = '#ff8fbf'; rrC(c, cx - w * .5, cy - S * .3, w, S * .3, 4); c.fill(); c.fillStyle = '#3b2842'; rrC(c, cx - w * .44, cy - S * .25 + dip * .5, w * .88, S * .18, 3); c.fill(); }
      else if (v === 2){ c.strokeStyle = '#9aa0b0'; c.lineWidth = 2; for (let i = 0; i < 6; i++){ const x = cx - w * .4 + i * w * .16; c.beginPath(); for (let k = 0; k <= 6; k++) c.lineTo(x + (k % 2 ? 4 : -4), cy + S * .12 + k * S * .06 - dip * .3); c.stroke(); }
        c.fillStyle = '#ffe9c6'; rrC(c, cx - w * .5, cy - S * .25 + dip, w, S * .32, S * .12); c.fill(); c.fillStyle = '#ffb36b'; for (let i = 0; i < 7; i++){ c.beginPath(); c.arc(cx - w * .42 + i * w * .14, cy - S * .09 + dip, S * .035, 0, 7); c.fill(); } }
      else { c.fillStyle = '#fff3e0'; rrC(c, cx - w * .14, cy - S * .05, w * .28, S * .55, S * .08); c.fill(); c.fillStyle = '#ff5b4d'; c.beginPath(); c.ellipse(cx, cy - S * .05 + dip, w * .5, S * .38 - dip * .5, 0, Math.PI, 0); c.fill();
        c.fillStyle = '#fff'; for (const [x, y, r] of [[-.25, -.18, .08], [.05, -.28, .1], [.28, -.14, .07]]){ c.beginPath(); c.arc(cx + x * w, cy + y * S + dip, r * S * 1.2, 0, 7); c.fill(); } }
      break; }
    case 'piscina': {
      if (v === 1){ c.fillStyle = '#ffb36b'; c.beginPath(); c.ellipse(cx, cy + S * .1, w * .52, S * .45, 0, 0, 7); c.fill(); c.fillStyle = '#ffe27a'; for (let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2; c.beginPath(); c.arc(cx + Math.cos(a) * w * .46, cy + S * .1 + Math.sin(a) * S * .38, S * .06, 0, 7); c.fill(); }
        c.fillStyle = '#7cc8ff'; c.beginPath(); c.ellipse(cx, cy + S * .05, w * .38, S * .25, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(cx - w * .12, cy, w * .1, S * .05, 0, 0, 7); c.fill();
        emojiC(c, '🦆', cx + w * .18 + Math.sin(t) * w * .05, cy - S * .05, S * .4); }
      else if (v === 2){ c.fillStyle = '#c9a46a'; rrC(c, cx - w * .5, cy - S * .2, w, S * .7, 4); c.fill(); c.fillStyle = '#f3d9a4'; rrC(c, cx - w * .45, cy - S * .15, w * .9, S * .45, 3); c.fill();
        c.fillStyle = '#e9c98a'; for (let i = 0; i < 9; i++){ c.beginPath(); c.arc(cx - w * .4 + i * w * .1, cy - S * .1 + Math.sin(i) * S * .05, S * .04, 0, 7); c.fill(); }
        c.fillStyle = '#ff6f6f'; c.beginPath(); c.moveTo(cx + w * .2, cy - S * .3); c.lineTo(cx + w * .34, cy - S * .3); c.lineTo(cx + w * .31, cy - S * .05); c.lineTo(cx + w * .23, cy - S * .05); c.fill(); c.strokeStyle = '#ff6f6f'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx + w * .27, cy - S * .32, S * .07, Math.PI, 0); c.stroke();
        c.fillStyle = '#7cc8ff'; c.beginPath(); c.moveTo(cx - w * .32, cy - S * .2); c.lineTo(cx - w * .2, cy - S * .35); c.lineTo(cx - w * .14, cy - S * .3); c.lineTo(cx - w * .26, cy - S * .15); c.fill(); }
      else { c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(cx - w * .5, cy - S * .25); c.lineTo(cx + w * .5, cy - S * .25); c.quadraticCurveTo(cx + w * .48, base, cx + w * .3, base); c.lineTo(cx - w * .3, base); c.quadraticCurveTo(cx - w * .48, base, cx - w * .5, cy - S * .25); c.fill(); c.strokeStyle = '#d6e6f0'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#c9a46a'; for (const d of [-1, 1]){ c.beginPath(); c.arc(cx + d * w * .36, base + S * .02, S * .05, 0, 7); c.fill(); }
        for (let i = 0; i < 14; i++){ const x = cx - w * .45 + (i * 37 % 90) / 100 * w, y = cy - S * .3 - (i % 3) * S * .1 + Math.sin(t * 2 + i) * 2; c.fillStyle = 'rgba(255,255,255,.95)'; c.strokeStyle = 'rgba(160,200,240,.6)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, S * (.08 + (i % 3) * .03), 0, 7); c.fill(); c.stroke(); } }
      break; }
    case 'palla': c.translate(cx, cy); ballStyle(c, S * .45, v); break;
    case 'canestro': { const P = HOOPV[v];
      c.fillStyle = P.board || '#fff'; c.strokeStyle = P.line || 'rgba(180,150,170,.8)'; c.lineWidth = 2;
      if (P.star){ star5C(c, cx, cy - S * .3, w * .62); } else { rrC(c, cx - w * .55, cy - S * .5, w * 1.1, S * .45, 6); c.fill(); c.stroke(); }
      c.strokeStyle = P.mark; c.lineWidth = 2.5; rrC(c, cx - w * .22, cy - S * .36, w * .44, S * .24, 3); c.stroke();
      c.strokeStyle = P.net; c.lineWidth = 1.5; for (let i = 0; i <= 4; i++){ const f = i / 4; c.beginPath(); c.moveTo(cx - w * .38 + f * w * .76, cy); c.lineTo(cx - w * .22 + f * w * .44, cy + S * .42); c.stroke(); }
      c.strokeStyle = P.rim; c.lineWidth = 4; c.beginPath(); c.moveTo(cx - w * .4, cy); c.lineTo(cx + w * .4, cy); c.stroke(); break; }
    case 'quadro': c.fillStyle = '#c9a46a'; rrC(c, cx - S * .5, cy - S * .42, S, S * .84, 4); c.fill(); emojiC(c, ['', '🌅', '🗺️', '🎑'][v], cx, cy, S * .78); break;
    case 'lanterna':
      if (v === 1){ c.strokeStyle = 'rgba(90,70,90,.6)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx, cy - S * 1.2); c.lineTo(cx, cy - S * .4); c.stroke(); c.save(); c.translate(cx, cy); c.rotate(t * .8);
        c.fillStyle = '#d6dbe6'; c.beginPath(); c.arc(0, 0, S * .42, 0, 7); c.fill(); for (let i = 0; i < 16; i++){ c.fillStyle = ['#ffffff', '#a9b4c8', '#ff9ec7', '#7cc8ff'][i % 4]; c.fillRect(Math.cos(i * 2.4) * S * .25 - 2, Math.sin(i * 1.7) * S * .25 - 2, 4, 4); } c.restore();
        if (live){ c.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 4; i++) star4C(c, cx + Math.cos(t * 2 + i * 1.6) * S * 1.2, cy + Math.sin(t * 2 + i * 1.6) * S * .8 + S, 3); } }
      else if (v === 2){ c.strokeStyle = 'rgba(90,70,90,.6)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(cx, cy - S * 1.2); c.lineTo(cx, cy - S * .35); c.stroke();
        const night = isNight(); if (night){ const g = c.createRadialGradient(cx, cy, 2, cx, cy, S * 1.2); g.addColorStop(0, 'rgba(255,230,140,.45)'); g.addColorStop(1, 'rgba(255,230,140,0)'); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, S * 1.2, 0, 7); c.fill(); }
        emojiC(c, '💡', cx, cy, S * .9, Math.PI); }
      else { c.fillStyle = '#c9a46a'; rrC(c, cx - S * .35, cy + S * .2, S * .7, S * .12, 3); c.fill(); c.fillStyle = '#fff6e6'; rrC(c, cx - S * .12, cy - S * .25, S * .24, S * .48, 3); c.fill();
        const fl = 1 + Math.sin(t * 9) * .1; c.fillStyle = '#ffb02e'; c.beginPath(); c.ellipse(cx, cy - S * .38, S * .07 * fl, S * .13 * fl, 0, 0, 7); c.fill(); c.fillStyle = '#fff3b0'; c.beginPath(); c.ellipse(cx, cy - S * .35, S * .03, S * .06, 0, 0, 7); c.fill();
        if (isNight()){ const g = c.createRadialGradient(cx, cy - S * .35, 2, cx, cy - S * .35, S); g.addColorStop(0, 'rgba(255,200,120,.35)'); g.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = g; c.beginPath(); c.arc(cx, cy - S * .35, S, 0, 7); c.fill(); } }
      break;
    case 'ritratto': {
      const who = live && state ? blobEmoji(blobById(state.id)) : '🐣';
      if (v === 1){ c.fillStyle = '#ffffff'; rrC(c, cx - w * .45, cy - S * .5, w * .9, S * 1.05, 2); c.fill(); c.strokeStyle = 'rgba(160,140,170,.4)'; c.lineWidth = 1; c.stroke(); c.fillStyle = '#ffe6f0'; c.fillRect(cx - w * .37, cy - S * .42, w * .74, S * .7); emojiC(c, who, cx, cy - S * .07, S * .45); }
      else if (v === 2){ c.fillStyle = '#e0b44a'; c.beginPath(); c.ellipse(cx, cy, w * .5, S * .55, 0, 0, 7); c.fill(); c.fillStyle = '#f0f6ff'; c.beginPath(); c.ellipse(cx, cy, w * .4, S * .45, 0, 0, 7); c.fill(); emojiC(c, who, cx, cy + 1, S * .48); }
      else { c.fillStyle = '#ff6f9c'; heartC(c, cx, cy - S * .45, w * .62); c.fillStyle = '#fff0f5'; heartC(c, cx, cy - S * .33, w * .48); emojiC(c, who, cx, cy + S * .05, S * .4); }
      break; }
    case 'lucine': {
      const half = w / 2, x0 = cx - half, x1 = cx + half, ctrlY = cy + S * 1.4;
      c.strokeStyle = 'rgba(90,70,90,.6)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0, cy); c.quadraticCurveTo(cx, ctrlY, x1, cy); c.stroke();
      const cols = ['#ff6f9a', '#ffd24a', '#6fdcb6', '#7cc8ff', '#a893ff'];
      for (let i = 1; i < 12; i++){ const u = i / 12, x = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * cx + u * u * x1, y = (1 - u) * (1 - u) * cy + 2 * (1 - u) * u * ctrlY + u * u * cy;
        c.fillStyle = cols[i % 5];
        if (v === 1){ c.beginPath(); c.moveTo(x - S * .3, y); c.lineTo(x + S * .3, y); c.lineTo(x, y + S * .8); c.closePath(); c.fill(); }
        else if (v === 2){ c.globalAlpha = .6 + .4 * Math.sin(t * 2.5 + i); c.fillStyle = '#ffe27a'; star5C(c, x, y + S * .45, S * .35); c.globalAlpha = 1; }
        else { c.globalAlpha = .65 + .35 * Math.sin(t * 2 + i); heartC(c, x, y + S * .1, S * .3); c.globalAlpha = 1; } }
      break; }
    case 'orologio':
      if (v === 1){ c.fillStyle = '#ffffff'; c.beginPath(); c.arc(cx, cy, w * .55, 0, 7); c.fill(); c.strokeStyle = '#7cc8ff'; c.lineWidth = 4; c.stroke(); c.fillStyle = '#a9b4c8'; for (let i = 0; i < 12; i++){ const a = i / 12 * Math.PI * 2; c.beginPath(); c.arc(cx + Math.sin(a) * w * .43, cy - Math.cos(a) * w * .43, i % 3 ? 1.2 : 2.2, 0, 7); c.fill(); } clockHands(c, cx, cy, w * .4); }
      else if (v === 2){ c.fillStyle = '#ff6f6f'; for (const d of [-1, 1]){ c.beginPath(); c.arc(cx + d * w * .32, cy - w * .42, w * .16, 0, 7); c.fill(); } c.strokeStyle = '#ff6f6f'; c.lineWidth = 3; for (const d of [-1, 1]){ c.beginPath(); c.moveTo(cx + d * w * .25, cy + w * .38); c.lineTo(cx + d * w * .38, cy + w * .55); c.stroke(); }
        c.fillStyle = '#ff6f6f'; c.beginPath(); c.arc(cx, cy, w * .48, 0, 7); c.fill(); c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(cx, cy, w * .38, 0, 7); c.fill(); clockHands(c, cx, cy, w * .35); }
      else { c.fillStyle = '#3b2842'; for (const d of [-1, 1]){ c.beginPath(); c.moveTo(cx + d * w * .15, cy - S * .3); c.lineTo(cx + d * w * .4, cy - S * .62); c.lineTo(cx + d * w * .45, cy - S * .2); c.fill(); }
        rrC(c, cx - w * .45, cy - S * .35, w * .9, S * 1.05, w * .3); c.fill(); const sw = Math.sin(t * 3) * .5;
        c.strokeStyle = '#3b2842'; c.lineWidth = 3; c.beginPath(); c.moveTo(cx, cy + S * .65); c.quadraticCurveTo(cx + Math.sin(sw) * S * .3, cy + S * .85, cx + Math.sin(sw) * S * .4, cy + S * 1.05); c.stroke();
        c.fillStyle = '#fff'; for (const d of [-1, 1]){ c.beginPath(); c.ellipse(cx + d * w * .2, cy - S * .15, w * .12, S * .1, 0, 0, 7); c.fill(); c.fillStyle = '#3b2842'; c.beginPath(); c.arc(cx + d * w * .2 + Math.sin(sw) * w * .06, cy - S * .15, w * .05, 0, 7); c.fill(); c.fillStyle = '#fff'; }
        c.beginPath(); c.arc(cx, cy + S * .28, w * .3, 0, 7); c.fill(); clockHands(c, cx, cy + S * .28, w * .28); }
      break;
    case 'acquario':
      if (v === 1){ const r = Math.min(w * .4, S * .55); c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fillStyle = 'rgba(124,200,255,.4)'; c.fill(); c.strokeStyle = 'rgba(220,240,255,.9)'; c.lineWidth = 2.5; c.stroke(); c.fillStyle = '#c9a46a'; c.beginPath(); c.ellipse(cx, cy + r * .9, r * .7, r * .12, 0, 0, 7); c.fill();
        const fx = cx + Math.sin(t * .8) * r * .45, dir = Math.cos(t * .8) >= 0 ? 1 : -1; c.fillStyle = '#ff8c3a'; c.beginPath(); c.ellipse(fx, cy, S * .12, S * .08, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(fx - dir * S * .1, cy); c.lineTo(fx - dir * S * .2, cy - S * .07); c.lineTo(fx - dir * S * .2, cy + S * .07); c.closePath(); c.fill(); }
      else if (v === 2){ c.fillStyle = 'rgba(40,50,110,.75)'; rrC(c, cx - w * .45, cy - S * .55, w * .9, S * 1.1, 8); c.fill(); c.strokeStyle = '#b7c7ff'; c.lineWidth = 2.5; c.stroke();
        for (let i = 0; i < 3; i++){ const jx = cx - w * .25 + i * w * .25, jy = cy - S * .15 + Math.sin(t * 1.5 + i * 2) * S * .2; c.fillStyle = ['rgba(255,150,220,.8)', 'rgba(170,230,255,.8)', 'rgba(200,170,255,.8)'][i];
          c.beginPath(); c.arc(jx, jy, S * .11, Math.PI, 0); c.fill(); c.strokeStyle = c.fillStyle; c.lineWidth = 1.2; for (let k = -1; k <= 1; k++){ c.beginPath(); c.moveTo(jx + k * S * .05, jy); c.quadraticCurveTo(jx + k * S * .05 + Math.sin(t * 3 + k) * 3, jy + S * .12, jx + k * S * .05, jy + S * .22); c.stroke(); } } }
      else { c.fillStyle = 'rgba(220,245,230,.5)'; rrC(c, cx - w * .5, cy - S * .5, w, S, 6); c.fill(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2.5; c.stroke();
        c.fillStyle = '#8a6a4a'; rrC(c, cx - w * .48, cy + S * .25, w * .96, S * .23, 5); c.fill(); c.fillStyle = '#5fbf63'; for (const x of [-.32, -.12, .3]){ c.beginPath(); c.ellipse(cx + x * w, cy + S * .12, S * .07, S * .18, x, 0, 7); c.fill(); }
        c.fillStyle = '#7fcf7a'; c.beginPath(); c.arc(cx + w * .12, cy + S * .2, S * .1, 0, 7); c.fill(); const sx = cx - w * .1 + Math.sin(t * .3) * w * .15; c.fillStyle = '#d9a46a'; c.beginPath(); c.arc(sx, cy + S * .18, S * .07, 0, 7); c.fill(); c.fillStyle = '#ffd6c0'; rrC(c, sx - S * .1, cy + S * .21, S * .22, S * .05, 3); c.fill(); }
      break;
  }
  c.restore();
}

function drawRug(c, x, y, rw, rh, id, base, t){
  c.save(); c.beginPath(); c.ellipse(x, y, rw, rh, 0, 0, 7);
  if (id === 'nuvola'){ c.restore(); c.save(); c.fillStyle = '#ffffff'; for (let i = 0; i < 9; i++){ const a = i / 9 * Math.PI * 2; c.beginPath(); c.ellipse(x + Math.cos(a)*rw*.82, y + Math.sin(a)*rh*.7, rw*.24, rh*.45, 0, 0, 7); c.fill(); } c.beginPath(); c.ellipse(x, y, rw*.85, rh*.8, 0, 0, 7); c.fill(); c.restore(); return; }
  c.fillStyle = id === 'stelle' ? '#2c3570' : id === 'prato' ? '#9fdc9a' : id === 'scacchi' ? '#fff3f8' : base; c.fill();
  c.clip();
  if (id === 'stelle'){ c.fillStyle = '#ffe27a'; for (let i = 0; i < 12; i++) star5C(c, x - rw + ((i*53) % 100) / 100 * rw * 2, y - rh + ((i*37) % 100) / 100 * rh * 2, rh*.12); }
  else if (id === 'prato'){ c.strokeStyle = '#6fbf73'; c.lineWidth = 1.5; for (let i = 0; i < 30; i++){ const gx = x - rw + i / 30 * rw * 2; c.beginPath(); c.moveTo(gx, y + rh*.4); c.lineTo(gx + 2, y + rh*.4 - rh*.25); c.stroke(); }
    for (let i = 0; i < 6; i++){ c.fillStyle = ['#ff9ec7','#ffe27a','#fff'][i % 3]; c.beginPath(); c.arc(x - rw*.7 + i*rw*.28, y - rh*.15 + (i % 2)*rh*.3, rh*.1, 0, 7); c.fill(); } }
  else if (id === 'scacchi'){ c.fillStyle = '#ff9ec7'; const sq = rh * .45; for (let i = -12; i < 12; i++) for (let j = -4; j < 4; j++) if ((i + j) % 2 === 0) c.fillRect(x + i*sq, y + j*sq, sq, sq); }
  else if (id === 'arcobaleno'){ const cols = ['#ff7b7b','#ffb36b','#ffe26b','#7be08a','#7bc4ff','#a993ff']; cols.forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rw*(1 - i*.15), rh*(1 - i*.15), 0, 0, 7); c.fill(); }); }
  c.restore();
}
function fposPx(id){
  const F = FURN[id], r = curRoom(), fp = (r && r.fpos && r.fpos[id]) || {x:F.x, y:F.y}, S = F.s * H;
  return F.kind === 'wall' ? {x: fp.x * W, y: fp.y * H, S, w: S * (F.wf || 1)} : {x: fp.x * W, y: FLOOR - S * .46, S, w: S * (F.wf || 1)};
}
const hasFurn = id => { const r = curRoom(); return !!r && r.furnOn.includes(id); };
function furnBox(id){
  if (id === 'palla') return {x: ball.x, y: ball.y, S: ball.r * 2.2, w: ball.r * 2.2};
  if (id === 'canestro'){ const h = HOOP(); return {x: h.x, y: h.y - H * .02, S: H * .2, w: h.w * 1.45}; }
  return fposPx(id);
}

export { HOOPV, ballStyle, drawFurnAlt, drawRug, fName, fposPx, furnBox, hasFurn };
