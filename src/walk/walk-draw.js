import { EMO } from '../game/util.js';
import { state } from '../game/state.js';
import { isNight } from '../room/events.js';
import { emojiC, heartC, rrC } from '../draw/items.js';
import { EDGE, WG, WPLACE, placeAt, wKey, wMan, wRange, walk, walkNodePx, walkPathHome } from './walk.js';
import { drawBlobMini } from '../places/house-view.js';
import { star4C } from '../places/valley.js';

/* ---------- disegno: mappa ---------- */
function drawWalkMap(c, w, h, t){
  const s = state, range = wRange(s), route = walk.route, last = route[route.length - 1];
  c.fillStyle = '#c4ebb4'; rrC(c, 0, 0, w, h, 18); c.fill();
  // isolati
  for (let cc = 0; cc < WG.C - 1; cc++) for (let r = 0; r < WG.R - 1; r++){
    const [x0, y0] = walkNodePx(cc, r, w, h), [x1, y1] = walkNodePx(cc + 1, r + 1, w, h), bw = x1 - x0, bh = y1 - y0, seed = cc * 7 + r * 13;
    c.fillStyle = seed % 3 ? '#e9f6df' : '#d7f0c8'; rrC(c, x0 + 9, y0 + 9, bw - 18, bh - 18, 8); c.fill();
    for (let i = 0; i < 2; i++){ const hx = x0 + 18 + i * (bw - 36) * .55, hy = y0 + bh * .5;
      if ((seed + i) % 4 === 0){ c.fillStyle = '#7fcf7a'; c.beginPath(); c.arc(hx + 6, hy, 8, 0, 7); c.fill(); }
      else { c.fillStyle = ['#ffd3e6', '#d6ecff', '#fff0b8', '#e7dcff'][(seed + i) % 4]; c.fillRect(hx, hy - 4, 14, 11); c.fillStyle = ['#ff8fbf', '#7cc8ff', '#ffb02e', '#b79bff'][(seed + i) % 4]; c.beginPath(); c.moveTo(hx - 2, hy - 4); c.lineTo(hx + 7, hy - 11); c.lineTo(hx + 16, hy - 4); c.fill(); } }
  }
  // strade
  c.strokeStyle = '#fbf6ef'; c.lineWidth = 12; c.lineCap = 'round';
  for (let r = 0; r < WG.R; r++){ const [a] = walkNodePx(0, r, w, h), [b, y] = walkNodePx(WG.C - 1, r, w, h); c.beginPath(); c.moveTo(a, y); c.lineTo(b, y); c.stroke(); }
  for (let cc = 0; cc < WG.C; cc++){ const [x, a] = walkNodePx(cc, 0, w, h), [, b] = walkNodePx(cc, WG.R - 1, w, h); c.beginPath(); c.moveTo(x, a); c.lineTo(x, b); c.stroke(); }
  // percorso
  if (route.length > 1){ c.strokeStyle = '#ff6fae'; c.lineWidth = 7; c.lineJoin = 'round'; c.beginPath(); route.forEach(([cc, r], i) => { const [x, y] = walkNodePx(cc, r, w, h); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
    const back = walkPathHome(last); if (back.length){ c.save(); c.setLineDash([4, 6]); c.strokeStyle = 'rgba(255,111,174,.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(...walkNodePx(...last, w, h)); back.forEach(([cc, r]) => c.lineTo(...walkNodePx(cc, r, w, h))); c.stroke(); c.restore(); } }
  // incroci raggiungibili
  for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nc = last[0] + dc, nr = last[1] + dr; if (nc < 0 || nr < 0 || nc >= WG.C || nr >= WG.R) continue;
    if (route.length + wMan([nc, nr], WG.home) > range) continue; const [x, y] = walkNodePx(nc, nr, w, h);
    c.strokeStyle = '#ff6fae'; c.lineWidth = 2.5; c.globalAlpha = .5 + .5 * Math.sin(t * 5); c.beginPath(); c.arc(x, y, 11, 0, 7); c.stroke(); c.globalAlpha = 1; }
  // luoghi
  for (let cc = 0; cc < WG.C; cc++) for (let r = 0; r < WG.R; r++){
    const k = wKey(cc, r), pk = placeAt(k), [x, y] = walkNodePx(cc, r, w, h);
    if (cc === WG.home[0] && r === WG.home[1]){ c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 15, 0, 7); c.fill(); emojiC(c, '🏠', x, y, 19); continue; }
    if (!pk){ c.fillStyle = '#e2d6cf'; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); continue; }
    const far = wMan([cc, r], WG.home) * 2 > range;
    c.globalAlpha = far ? .45 : 1; c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 15, 0, 7); c.fill();
    c.strokeStyle = pk === 'mistero' ? '#b79bff' : WPLACE[pk].col; c.lineWidth = 2.5; c.stroke();
    emojiC(c, pk === 'mistero' ? '❓' : WPLACE[pk].e, x, y, 17); c.globalAlpha = 1;
    if (far){ c.font = '11px ' + EMO; c.textAlign = 'center'; c.fillText('🔒', x + 12, y - 11); }
  }
  // il blob alla fine del percorso
  const [bx, by] = walkNodePx(...last, w, h); drawBlobMini(c, bx, by - 14, 11, state, t);
  // legenda
  c.fillStyle = 'rgba(255,255,255,.85)'; rrC(c, 8, 6, w - 16, 18, 9); c.fill(); c.fillStyle = '#3b2842'; c.font = '800 11px "M PLUS Rounded 1c", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(`Resistenza ${range} passi · 🔒 = ancora troppo lontano`, w / 2, 15);
}

/* ---------- disegno: strada ---------- */
function drawWalkStreet(c, w, h, t, dt){
  const s = state, cam = walk.x - w * .35, gy = h * .74, night = isNight();
  const sky = c.createLinearGradient(0, 0, 0, h * .6); if (night){ sky.addColorStop(0, '#26235a'); sky.addColorStop(1, '#5a4c8e'); } else { sky.addColorStop(0, '#9fd8ff'); sky.addColorStop(1, '#fff1f8'); }
  c.fillStyle = sky; rrC(c, 0, 0, w, h, 18); c.fill(); c.save(); rrC(c, 0, 0, w, h, 18); c.clip();
  if (night){ c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(w * .82, h * .12, 16, 0, 7); c.fill(); } else { c.fillStyle = '#ffd86b'; c.beginPath(); c.arc(w * .82, h * .12, 20, 0, 7); c.fill(); }
  // colline lontane
  c.fillStyle = night ? '#3b4a7a' : '#bfe3c0'; c.beginPath(); c.moveTo(0, gy - 60);
  for (let x = 0; x <= w + 20; x += 20){ const wx = x + cam * .15; c.lineTo(x, gy - 70 - 22 * Math.sin(wx / 90) - 12 * Math.sin(wx / 37)); } c.lineTo(w, gy); c.lineTo(0, gy); c.fill();
  // case
  const HW = 120, hcam = cam * .55, i0 = Math.floor(hcam / HW) - 1;
  for (let i = i0; i < i0 + Math.ceil(w / HW) + 3; i++){
    const x = i * HW - hcam, sd = Math.abs((i * 9301 + 49297) % 233280), kind = sd % 5;
    if (kind === 4){ c.fillStyle = night ? '#2f6b4a' : '#7fcf7a'; c.fillRect(x + 55, gy - 52, 8, 40); c.beginPath(); c.arc(x + 59, gy - 62, 26, 0, 7); c.fill(); continue; }
    const hh = 60 + sd % 40, col = ['#ffd3e6', '#d6ecff', '#fff0b8', '#e7dcff'][kind], roof = ['#ff8fbf', '#7cc8ff', '#ffb02e', '#b79bff'][kind];
    c.fillStyle = col; c.fillRect(x + 12, gy - hh - 12, 92, hh); c.fillStyle = roof; c.beginPath(); c.moveTo(x + 4, gy - hh - 12); c.lineTo(x + 58, gy - hh - 44); c.lineTo(x + 112, gy - hh - 12); c.fill();
    c.fillStyle = night ? '#ffe9a0' : '#bfe6ff'; for (const wx of [24, 72]) c.fillRect(x + wx, gy - hh + 4, 18, 16);
    c.fillStyle = '#c9a46a'; c.fillRect(x + 50, gy - 40, 16, 28);
  }
  // marciapiede e strada
  c.fillStyle = '#efe4dc'; c.fillRect(0, gy - 12, w, 26); c.fillStyle = '#d9cbc2'; c.fillRect(0, gy + 14, w, 4);
  c.fillStyle = night ? '#4a4560' : '#a8a3ad'; c.fillRect(0, gy + 18, w, h - gy); c.fillStyle = '#fff'; for (let x = -((cam) % 60); x < w; x += 60) c.fillRect(x, gy + 40, 30, 4);
  // lampioni
  for (let x = -((cam) % 260) + 120; x < w + 40; x += 260){ c.fillStyle = '#6b5a7a'; c.fillRect(x, gy - 110, 5, 100); c.fillStyle = night ? '#ffe9a0' : '#fff6d0'; c.beginPath(); c.arc(x + 2, gy - 112, 9, 0, 7); c.fill(); }
  // luoghi e casa sul percorso
  walk.path.forEach((n, i) => {
    const pk = i === 0 || i === walk.path.length - 1 ? 'home' : (i <= walk.outLen ? placeAt(wKey(...n)) : null); if (!pk) return;
    const x = i * EDGE - cam; if (x < -120 || x > w + 120) return;
    if (pk === 'home'){ c.fillStyle = '#fff'; c.fillRect(x - 40, gy - 90, 80, 78); c.fillStyle = '#ff8fbf'; c.beginPath(); c.moveTo(x - 50, gy - 90); c.lineTo(x, gy - 126); c.lineTo(x + 50, gy - 90); c.fill(); c.fillStyle = '#c9a46a'; c.fillRect(x - 10, gy - 44, 20, 32); emojiC(c, '🏠', x, gy - 140, 20); return; }
    const P = pk === 'mistero' ? {e:'❓', n:'???', col:'#b79bff'} : WPLACE[pk];
    c.fillStyle = P.col; rrC(c, x - 46, gy - 96, 92, 84, 10); c.fill(); c.fillStyle = 'rgba(255,255,255,.85)'; rrC(c, x - 38, gy - 88, 76, 22, 8); c.fill();
    c.fillStyle = '#3b2842'; c.font = '800 11px "M PLUS Rounded 1c", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(P.n.length > 12 ? P.n.split(' ').pop() : P.n, x, gy - 77);
    emojiC(c, P.e, x, gy - 40, 34);
  });
  // cose per strada
  for (const en of walk.ents){
    if (en.gone) continue; const x = en.x - cam; if (x < -60 || x > w + 60) continue;
    if (en.t === 'gift' && !en.done) emojiC(c, '🎁', x, gy - 4 + Math.sin(t * 4 + en.ph) * 2, 26);
    else if (en.t === 'glint' && !en.done){ c.fillStyle = '#ffe27a'; c.globalAlpha = .5 + .5 * Math.sin(t * 6 + en.ph); star4C(c, x, gy - 4, 10); c.globalAlpha = 1; }
    else if (en.t === 'poop'){ if (!en.clean) emojiC(c, '💩', x - 36, gy - 2, 18); }
    else if (en.t === 'sniff'){ emojiC(c, '🌼', x + 6, gy - 6, 20); if (en.sniffT) emojiC(c, '👃', x - 22, gy - 52, 16); }
    else if (en.t === 'puddle'){ c.fillStyle = 'rgba(110,180,255,.75)'; c.beginPath(); c.ellipse(x, gy + 6, 28, 7, 0, 0, 7); c.fill(); }
    else if (en.t === 'butterfly' && !en.done) emojiC(c, '🦋', x + Math.sin(t * 3 + en.ph) * 14, gy - 60 + Math.sin(t * 5 + en.ph) * 10, 20);
    else if (en.t === 'cat') emojiC(c, '🐈', x + 20, gy - 10, 28);
    else if (en.t === 'friend' && en.pal){
      const fx = x + 10; drawBlobMini(c, fx, gy - 14 - Math.abs(Math.sin(t * 6 + en.ph)) * (en.hearts ? 8 : 0), 22, en.pal.spec, t, {eyes: en.hearts ? 'happy' : 'open', flip: true});
      c.fillStyle = '#3b2842'; c.font = '800 11px "M PLUS Rounded 1c", sans-serif'; c.textAlign = 'center'; c.fillText(en.pal.name, fx, gy - 56);
      if (en.hearts){ c.fillStyle = '#ff6fae'; c.globalAlpha = Math.min(1, en.hearts); heartC(c, fx - 18, gy - 72 - (1.6 - en.hearts) * 20, 7); heartC(c, fx + 10, gy - 80 - (1.6 - en.hearts) * 26, 6); c.globalAlpha = 1; }
    }
  }
  // il blob al guinzaglio
  const bx = w * .35, stopped = !!walk.stop || walk.mode !== 'go', hop = stopped ? 0 : Math.abs(Math.sin(walk.hop)) * 7, jy = Math.sin(Math.min(1, walk.jump) * Math.PI) * 38;
  const by = gy - 14 - hop - jy, br = 26;
  c.strokeStyle = '#ff6fae'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(bx - 70, 0); c.quadraticCurveTo(bx - 60, by - 50, bx - 4, by - br * .7); c.stroke();
  const tired = s.energy < 12, sniff = walk.stop && walk.stop.e && walk.stop.e.sniffT;
  drawBlobMini(c, bx, by, br, s, t, {eyes: tired ? 'sleep' : (walk.jump > 0 || sniff || walk.mode === 'place') ? 'happy' : 'open'});
  if (tired){ c.fillStyle = '#6b5a8e'; c.font = '800 13px "M PLUS Rounded 1c", sans-serif'; c.fillText('💦', bx + 24, by - 26); }
  // stelline e oggetti che volano
  if (walk.floats) for (const f of walk.floats){ f.life -= dt; f.y += dt * 40; c.globalAlpha = Math.max(0, f.life); c.font = `800 18px ${EMO}`; c.textAlign = 'center'; c.fillStyle = '#e8960c'; c.fillText(f.t, bx, by - 40 - f.y); c.globalAlpha = 1; }
  if (walk.floats) walk.floats = walk.floats.filter(f => f.life > 0);
  // minimappa
  const mw = 74, mh = 86, mx = w - mw - 8, my = 8;
  c.fillStyle = 'rgba(255,255,255,.88)'; rrC(c, mx, my, mw, mh, 10); c.fill();
  const np = (cc, r) => [mx + 9 + cc * (mw - 18) / (WG.C - 1), my + 9 + r * (mh - 18) / (WG.R - 1)];
  c.strokeStyle = '#eadfd6'; c.lineWidth = 2; for (let r = 0; r < WG.R; r++){ c.beginPath(); c.moveTo(...np(0, r)); c.lineTo(...np(WG.C - 1, r)); c.stroke(); } for (let cc = 0; cc < WG.C; cc++){ c.beginPath(); c.moveTo(...np(cc, 0)); c.lineTo(...np(cc, WG.R - 1)); c.stroke(); }
  c.strokeStyle = '#ff6fae'; c.lineWidth = 3; c.beginPath(); walk.path.forEach((n, i) => i ? c.lineTo(...np(...n)) : c.moveTo(...np(...n))); c.stroke();
  const fi = walk.x / EDGE, i = Math.min(walk.path.length - 2, Math.floor(fi)), f = fi - i, A = np(...walk.path[Math.max(0, i)]), B = np(...walk.path[Math.min(walk.path.length - 1, i + 1)]);
  c.fillStyle = '#3b2842'; c.beginPath(); c.arc(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, 4, 0, 7); c.fill();
  // energia
  c.fillStyle = 'rgba(255,255,255,.88)'; rrC(c, 8, 8, 104, 22, 11); c.fill(); c.fillStyle = '#3b2842'; c.font = '800 11px "M PLUS Rounded 1c", sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('⚡', 14, 19);
  c.fillStyle = '#eadfd6'; rrC(c, 30, 15, 74, 8, 4); c.fill(); c.fillStyle = s.energy < 20 ? '#e5484d' : '#a893ff'; rrC(c, 30, 15, 74 * s.energy / 100, 8, 4); c.fill();
  c.restore();
}

export { drawWalkMap, drawWalkStreet };
