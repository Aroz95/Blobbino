import { $, EMO, lim, rf } from '../game/util.js';
import { FACE_DY, FORMS, VARS, shapeOf, shapeTop } from '../game/blobs.js';
import { FURN, ROOM_PRICES, THEMES } from '../game/catalog.js';
import {
  core, drawFurnRoom, homeIdx, houseBlobs, kindOf, palFor, presentIn, varOf, world
} from '../game/state.js';
import { FLOOR, H, W, ctx, setCtx, setFLOOR, setH, setW, tokens } from '../room/scene.js';
import { isNight } from '../room/events.js';
import { drawAcc, emojiC, rrC } from '../draw/items.js';
import { drawRug } from '../draw/furniture.js';
import { star4C } from './valley.js';
import { drawPattern } from '../draw/blob.js';
import { SIDE_FEATS, drawFeat, featsOf } from '../draw/features.js';
import { blobPathC, drawPet } from '../draw/pet.js';

/* ---------- vista della casa ---------- */
let houseEnts = {}, lastHouseT = 0;
function houseLayout(w, h){
  const x0 = w * .06, bw = w * .88, roofH = h * .16, y0 = h * .2, bh = h * .72, pad = w * .025, gap = w * .025;
  const rw = (bw - pad * 2 - gap) / 2, rhh = (bh - pad * 2 - gap) / 2;
  const top = y0 + pad, bot = y0 + pad + rhh + gap, lx = x0 + pad, rx2 = x0 + pad + rw + gap;
  return {x0, y0, bw, bh, roofH, rooms: [{x: lx, y: bot, w: rw, h: rhh}, {x: rx2, y: bot, w: rw, h: rhh}, {x: lx, y: top, w: rw, h: rhh}, {x: rx2, y: top, w: rw, h: rhh}]};
}
function roomColorsFor(room){
  const th = room ? room.theme : 'rosa';
  if (th === 'rosa') return {wall: tokens.wall, wall2: tokens['wall-2'], floor: tokens.floor, rug: tokens.rug};
  const h = THEMES[th].h, dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  return dark ? {wall:`hsl(${h},22%,22%)`, wall2:`hsl(${h},22%,27%)`, floor:`hsl(${h},20%,29%)`, rug:`hsl(${h},28%,36%)`}
              : {wall:`hsl(${h},70%,92%)`, wall2:`hsl(${h},80%,96%)`, floor:`hsl(${h},55%,86%)`, rug:`hsl(${h},75%,80%)`};
}
function drawBlobMini(c, x, y, r, b, t, o = {}){
  if (b.stage === 'egg'){
    const EV = VARS.egg[b.egg] || VARS.egg.pois, ex = r*.62, ey = r*.8;
    c.save(); c.translate(x, y - r*.1); c.rotate(o.still ? 0 : Math.sin(t*3)*.06);
    const g = c.createRadialGradient(-ex*.4, -ey*.4, r*.05, 0, 0, r); g.addColorStop(0, EV.pal.a); g.addColorStop(1, EV.pal.b);
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, ex, ey, 0, 0, 7); c.fill(); c.save(); c.clip(); drawPattern(c, EV.pat, ex, ey, r*.7, t, EV.pc); c.restore();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-ex*.4, -ey*.5, ex*.17, ey*.08, -.6, 0, 7); c.fill();
    c.restore(); return;
  }
  if (typeof drawPet === 'function' && !o.simple) return drawPetOn(c, x, y, r, b, t, o);
  const pal = palFor(b), ry = r * .88, V = varOf(b), F = FORMS[kindOf(b)] || {}, dark = !b.shiny && V && 'dark' in V ? V.dark : F.dark, ink = dark ? '#fff6d8' : '#3b2842';
  const feats = featsOf(V), baseLook = !V || (!V.feat && !V.shape) || feats.includes('base'), kind = kindOf(b), shape = shapeOf(b), topU = shapeTop(shape), fdy = ry*(FACE_DY[shape] || 0);
  c.save(); c.translate(x, y);
  if (o.flip) c.scale(-1, 1);
  for (const f of feats) if (f !== 'base' && (!b.hat || SIDE_FEATS.has(f))) drawFeat(c, f, r, ry, r, t, pal, 'back', topU);
  if (baseLook && kind === 'morbidello'){ c.fillStyle = pal.b; for (const d of [-1, 1]){ c.beginPath(); c.arc(d*r*.55, -ry*.8, r*.2, 0, 7); c.fill(); } }
  if (baseLook && kind === 'saltello'){ c.strokeStyle = pal.b; c.lineWidth = Math.max(1.5, r*.06); for (const d of [-1, 1]){ c.beginPath(); c.moveTo(d*r*.3, -ry*.85); c.lineTo(d*r*.4, -ry*1.3); c.stroke(); c.fillStyle = '#ffcf3f'; c.beginPath(); c.arc(d*r*.4, -ry*1.33, r*.08, 0, 7); c.fill(); } }
  if (baseLook && kind === 'baby' && !b.hat){ c.strokeStyle = pal.b; c.lineWidth = Math.max(1.5, r*.06); c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -ry*.95); c.bezierCurveTo(r*.2, -ry*1.3, r*.28, -ry*1.02, r*.12, -ry*1.05); c.stroke(); }
  if (b.back) drawAcc(c, b.back, r, ry, t, pal);
  const g = c.createRadialGradient(-r * .35, -ry * .45, r * .1, 0, 0, r * 1.15); g.addColorStop(0, pal.a); g.addColorStop(1, pal.b);
  c.fillStyle = g; blobPathC(c, r, ry, o.still ? 0 : t, kind, 0, shape); c.fill();
  if (V && V.pat){ c.save(); blobPathC(c, r, ry, o.still ? 0 : t, kind, 0, shape); c.clip(); drawPattern(c, V.pat, r, ry, r, t, V.pc); c.restore(); }
  for (const f of feats) if (f !== 'base' && (!b.hat || SIDE_FEATS.has(f) || f === 'baffi')) drawFeat(c, f, r, ry, r, t, pal, 'front', topU);
  c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-r * .4, -ry * .5 + fdy * .5, r * .14, r * .08, -.6, 0, 7); c.fill();
  const em = FORMS[kind] && !baseLook ? null : null; void em;
  c.fillStyle = c.strokeStyle = ink; c.lineWidth = Math.max(1.2, r * .07); c.lineCap = 'round';
  const eyes = o.eyes || (b.sleeping ? 'sleep' : 'open');
  for (const d of [-1, 1]){
    if (eyes === 'sleep'){ c.beginPath(); c.arc(d * r * .3, -ry * .1 + fdy, r * .09, .15 * Math.PI, .85 * Math.PI); c.stroke(); }
    else if (eyes === 'happy'){ c.beginPath(); c.arc(d * r * .3, -ry * .02 + fdy, r * .1, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke(); }
    else { c.beginPath(); c.ellipse(d * r * .3, -ry * .08 + fdy, r * .085, r * .12, 0, 0, 7); c.fill(); }
  }
  if (eyes === 'happy'){ c.fillStyle = '#ff7aa8'; c.beginPath(); c.arc(0, ry * .2 + fdy, r * .1, 0, Math.PI); c.fill(); }
  c.fillStyle = '#ff8fb3'; c.globalAlpha = .5; for (const d of [-1, 1]){ c.beginPath(); c.ellipse(d * r * .5, ry * .12 + fdy, r * .1, r * .06, 0, 0, 7); c.fill(); } c.globalAlpha = 1;
  for (const k of ['neck', 'face', 'hat']) if (b[k]) drawAcc(c, b[k], r, ry, t, pal);
  c.restore();
}
/* disegna un blob esattamente come in casa, su qualunque canvas */
function drawPetOn(c, x, y, r, b, t, o = {}){
  const sv = [ctx, W, H, FLOOR], sc = b.stage === 'egg' ? .8 : ({baby:.7, child:.85}[b.stage] || 1);
  const S = r / (.2 * sc);
  const spec = Object.assign({hunger:100, thirst:100, fun:100, energy:100, hygiene:100, health:100, trust:100, level:1, sleeping:false, sick:false, walk:null, wish:null}, b);
  if (o.eyes === 'sleep') spec.sleeping = true;
  const P = {x, y, vx:0, vy:0, ground:true, rot:0, vr:0, sq:1, sqv:0, wob:0, hop:0, look:null, anim:null, held:false, sink:0,
    expr: o.eyes === 'happy' ? 'happy' : o.eyes === 'sleep' ? null : 'ok', exprUntil: 1e15};
  c.save();
  if (o.flip){ c.translate(x, 0); c.scale(-1, 1); c.translate(-x, 0); }
  setCtx(c); setW(S); setH(S); setFLOOR(y + r * .88 * .78);
  try { drawPet(o.still ? 0 : t, spec, P, true); } finally { setCtx(sv[0]); setW(sv[1]); setH(sv[2]); setFLOOR(sv[3]); c.restore(); }
}
/* figura grande per album ed evoluzione */
function drawSpecimen(cv, b, locked){
  if (!cv) return;
  const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth || cv.width, h = cv.clientHeight || cv.height;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  const r = Math.min(w, h) * (b.stage === 'egg' ? .34 : .3);
  const emo = null;
  drawBlobMini(c, w / 2, h * .6, r, b, 1.3, {still: true, eyes: locked ? 'open' : 'happy'});
  if (emo){ c.font = `${Math.round(r * .55)}px ${EMO}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(emo, w / 2 + r * .95, h * .6 - r * .85); }
  if (locked){ c.globalCompositeOperation = 'source-in'; c.fillStyle = document.documentElement.dataset.theme === 'dark' || matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.dataset.theme !== 'light' ? '#4a3d55' : '#e3d3df'; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#ffffff'; c.font = `800 ${Math.round(r * .7)}px "M PLUS Rounded 1c", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', w / 2, h * .6); }
}
function drawHouse(t, dt){
  const cvh = $('houseCv'); if (!cvh || !cvh.clientWidth || !world) return;
  const dpr = Math.min(2, devicePixelRatio || 1), w = cvh.clientWidth, h = cvh.clientHeight;
  if (cvh.width !== Math.round(w * dpr)){ cvh.width = Math.round(w * dpr); cvh.height = Math.round(h * dpr); }
  const c = cvh.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  const night = isNight();
  const sky = c.createLinearGradient(0, 0, 0, h); if (night){ sky.addColorStop(0, '#26235a'); sky.addColorStop(1, '#4a3d7c'); } else { sky.addColorStop(0, '#aee0ff'); sky.addColorStop(1, '#e8f6ff'); }
  c.fillStyle = sky; rrC(c, 0, 0, w, h, 24); c.fill();
  if (night){ c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(w * .86, h * .1, w * .045, 0, 7); c.fill(); c.fillStyle = '#fff'; for (let i = 0; i < 12; i++){ c.globalAlpha = .4 + .6 * Math.abs(Math.sin(t * 1.5 + i)); star4C(c, (i * 83 % 100) / 100 * w, (i * 37 % 20) / 100 * h + 6, 2.2); } c.globalAlpha = 1; }
  else { c.fillStyle = '#ffd86b'; c.beginPath(); c.arc(w * .86, h * .09, w * .05, 0, 7); c.fill(); c.fillStyle = '#fff'; const cx2 = ((t * 8) % (w + 80)) - 40; c.beginPath(); c.arc(cx2, h * .1, 12, 0, 7); c.arc(cx2 + 14, h * .085, 15, 0, 7); c.arc(cx2 + 28, h * .1, 11, 0, 7); c.fill(); }
  c.fillStyle = night ? '#3c5a46' : '#9fdc9a'; c.fillRect(0, h * .92, w, h * .08);
  const L = houseLayout(w, h);
  // tetto e camino
  c.fillStyle = '#c9a46a'; c.fillRect(L.x0 + L.bw * .72, L.y0 - L.roofH * .85, L.bw * .07, L.roofH * .6);
  c.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 3; i++){ const p = (t * .3 + i / 3) % 1; c.globalAlpha = 1 - p; c.beginPath(); c.arc(L.x0 + L.bw * .755 + Math.sin(p * 6) * 6, L.y0 - L.roofH * .9 - p * h * .12, 5 + p * 8, 0, 7); c.fill(); } c.globalAlpha = 1;
  c.fillStyle = '#ff8fbf'; c.beginPath(); c.moveTo(L.x0 - w * .03, L.y0 + 2); c.lineTo(w / 2, L.y0 - L.roofH); c.lineTo(L.x0 + L.bw + w * .03, L.y0 + 2); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; for (let i = 1; i < 4; i++){ const yy = L.y0 - L.roofH + i * L.roofH / 4, half = (w / 2 - L.x0 + w * .03) * i / 4; c.beginPath(); c.moveTo(w / 2 - half, yy); c.lineTo(w / 2 + half, yy); c.stroke(); }
  c.fillStyle = tokens.panel; c.strokeStyle = tokens.line; c.lineWidth = 2; rrC(c, L.x0, L.y0, L.bw, L.bh, 8); c.fill(); c.stroke();
  for (let i = 0; i < 4; i++){
    const q = L.rooms[i];
    if (i >= world.rooms.length){
      c.save(); c.setLineDash([6, 5]); c.strokeStyle = tokens.line; c.lineWidth = 2; rrC(c, q.x, q.y, q.w, q.h, 10); c.stroke(); c.restore();
      c.fillStyle = tokens.ink; c.globalAlpha = .45; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `800 ${Math.round(q.h * .2)}px "M PLUS Rounded 1c", sans-serif`; c.fillText(i === world.rooms.length ? '+' : '🔒', q.x + q.w / 2, q.y + q.h * .42);
      if (i === world.rooms.length){ c.font = `800 ${Math.max(11, Math.round(q.h * .085))}px "M PLUS Rounded 1c", sans-serif`; c.fillText(ROOM_PRICES[i] ? `Nuova stanza · ${ROOM_PRICES[i]}★` : 'Nuova stanza gratis', q.x + q.w / 2, q.y + q.h * .7); }
      c.globalAlpha = 1; continue;
    }
    const room = world.rooms[i], col = roomColorsFor(room);
    c.save(); rrC(c, q.x, q.y, q.w, q.h, 10); c.clip();
    const g = c.createLinearGradient(0, q.y, 0, q.y + q.h); g.addColorStop(0, col.wall2); g.addColorStop(1, col.wall); c.fillStyle = g; c.fillRect(q.x, q.y, q.w, q.h);
    const fy = q.y + q.h * .9;
    c.fillStyle = night ? '#4a3d7c' : '#bfe6ff'; rrC(c, q.x + q.w * .07, q.y + q.h * .14, q.w * .2, q.h * .26, 4); c.fill();
    c.fillStyle = col.floor; c.fillRect(q.x, fy - q.h * .08, q.w, q.h);
    drawRug(c, q.x + q.w * .55, fy + q.h * .02, q.w * .32, q.h * .06, room.rug || 'rosa', col.rug, t);
    for (const id of room.furnOn){ const F = FURN[id]; if (!F) continue; const fp = (room.fpos && room.fpos[id]) || {x: F.x, y: F.y}, S = F.s * q.h;
      drawFurnRoom(c, room, id, q.x + fp.x * q.w, F.kind === 'wall' ? q.y + fp.y * q.h : fy - S * .46, S, t, false); }
    const pres = presentIn(i);
    pres.forEach((b, k) => { if (!houseEnts[b.id] || houseEnts[b.id].room !== i) houseEnts[b.id] = {x: (k + 1) / (pres.length + 1), tx: rf(.2, .8), hop: 0, room: i}; });
    for (const a of pres) for (const o of pres){ if (a === o) continue; const ea = houseEnts[a.id], eo = houseEnts[o.id], d = ea.x - eo.x;
      if (Math.abs(d) < .3){ const push = (.3 - Math.abs(d)) * dt * 2 * (d < 0 ? -1 : 1); ea.x = lim(ea.x + push, .12, .88); if (Math.abs(ea.tx - eo.x) < .3) ea.tx = lim(eo.x + (d < 0 ? -.35 : .35), .12, .88); } }
    pres.forEach((b, k) => {
      const he = houseEnts[b.id] || (houseEnts[b.id] = {x: .3 + k * .25, tx: rf(.2, .8), hop: 0});
      const moving = !b.sleeping && b.stage !== 'egg';
      if (moving){ if (Math.abs(he.tx - he.x) < .01){ if (Math.random() < dt * .4) he.tx = rf(.15, .85); he.hop = 0; } else { he.x += Math.sign(he.tx - he.x) * Math.min(Math.abs(he.tx - he.x), .12 * dt); he.hop += dt * 8; } }
      const r = q.h * .17 * (b.stage === 'egg' ? .8 : ({baby:.7, child:.85}[b.stage] || 1));
      const bx = q.x + he.x * q.w, by = fy - r * .88 * .78 - Math.abs(Math.sin(he.hop)) * r * .14;
      drawBlobMini(c, bx, by, r, b, t);
      const st = b.stage === 'egg' ? '' : b.sick ? '🤒' : b.sleeping ? '💤' : b.wish ? b.wish.e : core(b) < 35 ? '❗' : '';
      if (st){ c.fillStyle = tokens.panel; c.beginPath(); c.arc(bx + r * .75, by - r * 1.05, r * .38, 0, 7); c.fill(); emojiC(c, st, bx + r * .75, by - r * 1.05, r * .45); }
      c.fillStyle = tokens.ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `800 ${Math.max(10, Math.round(q.h * .075))}px "M PLUS Rounded 1c", sans-serif`;
      c.fillText(b.name || 'Uovo', bx, Math.min(q.y + q.h - 7, fy + q.h * .05));
    });
    const away = houseBlobs().filter(b => b.walk && homeIdx(b) === i);
    if (away.length){ emojiC(c, '🪧', q.x + q.w * .85, fy - q.h * .1, q.h * .18); c.fillStyle = tokens.ink; c.font = `800 ${Math.max(10, Math.round(q.h * .07))}px "M PLUS Rounded 1c", sans-serif`; c.textAlign = 'right'; c.fillText(`${away[0].name} è fuori`, q.x + q.w - 6, q.y + q.h * .5); }
    c.restore();
    c.fillStyle = 'rgba(255,255,255,.82)'; c.font = `800 ${Math.max(10, Math.round(q.h * .075))}px "M PLUS Rounded 1c", sans-serif`;
    const tw = c.measureText(room.name).width + 12; rrC(c, q.x + 6, q.y + 6, tw, q.h * .12, 8); c.fill();
    c.fillStyle = '#3b2842'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(room.name, q.x + 12, q.y + 6 + q.h * .06);
    c.strokeStyle = tokens.line; c.lineWidth = 2; rrC(c, q.x, q.y, q.w, q.h, 10); c.stroke();
  }
}

export { drawBlobMini, drawHouse, drawSpecimen, houseEnts, houseLayout };
