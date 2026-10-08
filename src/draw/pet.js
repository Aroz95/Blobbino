import { lim, reduced, rf } from '../game/util.js';
import { FACE_DY, FORMS, VARS, shapeOf, shapeTop, shapeXY } from '../game/blobs.js';
import { FOODS, LEVELS } from '../game/catalog.js';
import { fvarOf, kindOf, palFor, particles, setParticles, state, varOf, world } from '../game/state.js';
import { bodyShape } from '../game/evolution.js';
import { mood } from '../game/texts.js';
import { curRoom } from '../legacy/shop.js';
import {
  FLOOR, H, R, W, awake, ball, ctx, dragFood, ev, groundY, mouthPos, pet, petVisible, tokens
} from '../room/scene.js';
import { isNight } from '../room/events.js';
import { drawAcc } from './items.js';
import { ballStyle } from './furniture.js';
import { star4C } from '../places/valley.js';
import { drawPattern, emoji, heart, roundRect, star4, star5 } from './blob.js';
import { SIDE_FEATS, drawFeat, featsOf } from './features.js';

/* ================= disegno del blob nella stanza: uovo, corpo, faccia, palla, eventi, particelle ================= */
function drawEgg(t, s, P = pet, Rl = R){
  const r = Rl, cx = P.x, cy = FLOOR - Rl * .88 * .78;
  const left = s ? Math.max(0, (s.hatchAt - Date.now()) / 1000) : 99;
  const shake = (left < 12 ? .16 : .05) * Math.sin(t*(left < 12 ? 14 : 3)) + (P.wob || 0)*.25*Math.sin(t*20);
  ctx.save(); ctx.translate(cx, cy + r*.9); ctx.rotate(shake); ctx.translate(0, -r*.9);
  ctx.fillStyle = 'rgba(80,30,60,.12)'; ctx.beginPath(); ctx.ellipse(0, r*.95, r*.7, r*.14, 0, 0, 7); ctx.fill();
  const EV = VARS.egg[(s && s.egg) || 'pois'] || VARS.egg.pois;
  const g = ctx.createRadialGradient(-r*.3, -r*.4, r*.1, 0, 0, r*1.2); g.addColorStop(0, EV.pal.a); g.addColorStop(1, EV.pal.b);
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r*.72, r*.92, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.clip(); drawPattern(ctx, EV.pat, r*.72, r*.92, r*.8, t, EV.pc); ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-r*.28, -r*.45, r*.12, r*.07, -.6, 0, 7); ctx.fill();
  if (EV.r >= 3){ ctx.fillStyle = '#fff6c0'; for (let i = 0; i < 3; i++){ const a = t*1.1 + i*2.1; ctx.globalAlpha = .4 + .6*Math.abs(Math.sin(t*3 + i)); star4C(ctx, Math.cos(a)*r*.95, Math.sin(a)*r*1.05, r*.07); } ctx.globalAlpha = 1; }
  if (left < 15){ ctx.strokeStyle = '#8a6a5a'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.beginPath();
    const p = [[-.55,-.1],[-.35,-.25],[-.18,-.05],[0,-.28],[.18,-.08],[.35,-.3],[.55,-.12]]; const n = Math.ceil((15 - left)/15*p.length);
    p.slice(0, n).forEach(([x, y], i) => i ? ctx.lineTo(x*r, y*r) : ctx.moveTo(x*r, y*r)); ctx.stroke(); }
  ctx.restore();
}
function blobPath(rx, ry, t, kind, wob = pet.wob, shape = 'tondo'){ blobPathC(ctx, rx, ry, t, kind, wob, shape); }
function blobPathC(c, rx, ry, t, kind, wob = 0, shape = 'tondo'){
  const N = shape === 'tondo' ? 48 : 96, pts = [];
  for (let i = 0; i < N; i++){
    const a = i/N*Math.PI*2; let r = 1 + .025*Math.sin(a*3 + t*2) + (wob || 0) * .05 * Math.sin(a*5 + t*25);
    if (shape === 'tondo'){
      if (kind === 'nuvola' && Math.sin(a) < .2) r += .07*Math.max(0, Math.cos(a*6));
      if (kind === 'ombra' && Math.sin(a) > .3) r += .06*Math.sin(a*9 + t*4);
    }
    const [ux, uy] = shapeXY(shape, a);
    let x = ux*rx*r, y = uy*ry*r;
    if (y > ry*.78) y = ry*.78 + (y - ry*.78)*.3;
    pts.push([x, y]);
  }
  c.beginPath();
  for (let i = 0; i < N; i++){ const p = pts[i], q = pts[(i + 1) % N], mx = (p[0] + q[0])/2, my = (p[1] + q[1])/2;
    if (!i) c.moveTo(mx, my); else c.quadraticCurveTo(p[0], p[1], mx, my); }
  const p = pts[0], q = pts[1]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0])/2, (p[1] + q[1])/2); c.closePath();
}
function currentExpr(s = state, P = pet){
  const now = performance.now(), m = mood(s).k;
  if (P.anim && P.anim.type === 'eat') return 'eat';
  if (P.held) return P.expr === 'shy' ? 'shy' : 'wee';
  if (P.expr && now < P.exprUntil) return P.expr;
  if (P === pet && dragFood && awake()){ const mp = mouthPos(); if (Math.hypot(dragFood.x - mp.x, dragFood.y - mp.y) < R * 2.2) return 'open'; }
  if (!P.ground) return m === 'happy' ? 'wee' : 'ok';
  return m;
}
const blobR = b => Math.min(W, H) * .2 * (!b || b.stage === 'egg' ? .8 : ({baby:.7, child:.85}[b.stage] || 1));
function drawPet(t, s = state, P = pet, guest = false){
  if (!s){ if (!world){ pet.y = groundY(); drawEgg(t, s); } return; }
  const R = blobR(s), RY = R * .88, gYl = FLOOR - RY * .78;
  if (s.stage === 'egg'){ P.y = gYl; drawEgg(t, s, P, R); return; }
  if (s.walk) return;
  const kind = kindOf(s), pal = palFor(s), m = currentExpr(s, P), V = varOf(s), feats = featsOf(V), baseLook = !V || (!V.feat && !V.shape) || feats.includes('base');
  const shape = shapeOf(s), topU = shapeTop(shape), deco = !V || !V.shape || !!V.deco;
  const FD = FORMS[kind] || {}, darkB = !s.shiny && V && 'dark' in V ? V.dark : FD.dark, INK = darkB ? '#fff6d8' : '#3b2842', HL = darkB ? '#2c3570' : '#fff';
  if (V && V.r >= 4 && !s.shiny){ const gl = ctx.createRadialGradient(P.x, P.y, R*.5, P.x, P.y, R*1.7); gl.addColorStop(0, pal.b + '55'); gl.addColorStop(1, pal.b + '00'); ctx.globalAlpha = .7 + .3*Math.sin(t*2); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(P.x, P.y, R*1.7, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  if (V && V.r >= 3 && !s.shiny){ ctx.fillStyle = V.r >= 4 ? '#ffe9a6' : '#cfe0ff'; for (let i = 0; i < 2; i++){ const a = -t*1.1 + i*Math.PI; ctx.globalAlpha = .45 + .45*Math.sin(t*3.5 + i); star4(P.x + Math.cos(a)*R*1.2, P.y + Math.sin(a)*R*.85, R*.07); } ctx.globalAlpha = 1; }
  if (kind === 'lumino'){ const gl = ctx.createRadialGradient(P.x, P.y, R*.4, P.x, P.y, R*(isNight() ? 2.2 : 1.5)); gl.addColorStop(0, 'rgba(255,230,140,.35)'); gl.addColorStop(1, 'rgba(255,230,140,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(P.x, P.y, R*2.2, 0, 7); ctx.fill(); }
  if (s.shiny){ ctx.fillStyle = '#ffe27a'; for (let i = 0; i < 3; i++){ const a = t*1.3 + i*2.1; ctx.globalAlpha = .5 + .5*Math.sin(t*4 + i); star4(P.x + Math.cos(a)*R*1.25, P.y + Math.sin(a)*R*.9, R*.08); } ctx.globalAlpha = 1; }
  const breathe = reduced ? 0 : Math.sin(t*(m === 'sleep' ? 1.2 : 2.2))*.03;
  const hopY = P.ground && P.hop ? -Math.abs(Math.sin(P.hop)) * R * .14 : 0;
  const BSH = bodyShape(s), rx = R*(1 + breathe)*BSH.x, ry = RY*(1 - breathe)*BSH.y;
  const sx = 1 + (1 - P.sq) * .7, sy = P.sq;
  // ombra
  const shH = Math.max(0, (gYl - P.y) / H);
  ctx.fillStyle = 'rgba(80,30,60,.14)'; ctx.beginPath(); ctx.ellipse(P.x, FLOOR + 2, rx*.85*(1 - shH*.8)*sx, R*.12*(1 - shH*.6), 0, 0, 7); ctx.fill();
  // aura migliori amici
  if (LEVELS.slice(0, s.level).some(l => l.perk === 'aura')){ const gl = ctx.createRadialGradient(P.x, P.y, R*.6, P.x, P.y, R*1.6); const hue = (t*60) % 360;
    gl.addColorStop(0, `hsla(${hue},90%,75%,.35)`); gl.addColorStop(1, `hsla(${(hue + 120) % 360},90%,75%,0)`); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(P.x, P.y, R*1.6, 0, 7); ctx.fill(); }
  ctx.save();
  ctx.translate(P.x, P.y + hopY + (P.sink || 0)); ctx.rotate(P.rot);
  ctx.translate(0, ry*.78); ctx.scale(sx, sy); ctx.translate(0, -ry*.78);
  // decorazioni dietro
  if (deco && kind === 'stellino' && !s.hat){ ctx.strokeStyle = pal.b; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -ry*.9);
    ctx.quadraticCurveTo(R*.25*Math.sin(t*2), -ry*1.25, R*.1*Math.sin(t*2), -ry*1.45); ctx.stroke();
    ctx.fillStyle = '#ffcf3f'; star5(R*.1*Math.sin(t*2), -ry*1.5, R*.2); }
  if (deco && kind === 'morbidello' && baseLook){ ctx.fillStyle = pal.b; for (const d of [-1, 1]){ ctx.beginPath(); ctx.ellipse(d*rx*.55, -ry*.8, R*.2, R*.2, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ffc6dc'; ctx.beginPath(); ctx.arc(d*rx*.55, -ry*.8, R*.1, 0, 7); ctx.fill(); ctx.fillStyle = pal.b; } }
  if (deco && kind === 'saltello' && baseLook){ ctx.strokeStyle = pal.b; ctx.lineWidth = 3; ctx.lineCap = 'round'; for (const d of [-1, 1]){ const sw = Math.sin(t*4 + d)*R*.08; ctx.beginPath(); ctx.moveTo(d*R*.3, -ry*.85); ctx.quadraticCurveTo(d*R*.45 + sw, -ry*1.2, d*R*.38 + sw, -ry*1.35); ctx.stroke(); ctx.fillStyle = '#ffcf3f'; ctx.beginPath(); ctx.arc(d*R*.38 + sw, -ry*1.38, R*.08, 0, 7); ctx.fill(); } }
  if (deco && kind === 'muschio' && !s.hat){ ctx.fillStyle = '#6fbf73'; ctx.save(); ctx.translate(0, -ry*.92); ctx.rotate(Math.sin(t*1.5)*.15);
    ctx.beginPath(); ctx.ellipse(-R*.12, -R*.12, R*.1, R*.2, -.7, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(R*.12, -R*.14, R*.1, R*.22, .7, 0, 7); ctx.fill(); ctx.restore(); }
  if (deco && kind === 'razzo'){ ctx.fillStyle = '#d94b4b'; for (const d of [-1, 1]){ ctx.beginPath(); ctx.moveTo(d*rx*.75, ry*.1); ctx.lineTo(d*rx*1.18, ry*.72); ctx.lineTo(d*rx*.55, ry*.62); ctx.closePath(); ctx.fill(); } }
  if (deco && kind === 'esploratore'){ ctx.fillStyle = '#8a5a2b'; roundRect(-rx*1.02, -ry*.35, rx*.5, ry*.9, R*.12); ctx.fill(); ctx.fillStyle = '#a8743f'; roundRect(-rx*.98, -ry*.1, rx*.42, ry*.3, R*.06); ctx.fill(); }
  if (deco && kind === 'lumino' && !s.hat){ ctx.strokeStyle = pal.b; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -ry*.9); ctx.lineTo(0, -ry*1.25); ctx.stroke();
    const gl = .6 + .4*Math.sin(t*3); ctx.fillStyle = `rgba(255,230,120,${gl})`; ctx.beginPath(); ctx.arc(0, -ry*1.32, R*.12, 0, 7); ctx.fill(); }
  // braccino per il saluto
  if (P.anim && P.anim.type === 'wave'){ ctx.save(); ctx.translate(rx*.85, -ry*.1); ctx.rotate(-1.2 + Math.sin(P.anim.t*14)*.5); ctx.fillStyle = pal.b; ctx.beginPath(); ctx.ellipse(0, -R*.25, R*.13, R*.28, 0, 0, 7); ctx.fill(); ctx.restore(); }
  for (const f of feats) if (f !== 'base' && (!s.hat || SIDE_FEATS.has(f))) drawFeat(ctx, f, rx, ry, R, t, pal, 'back', topU);
  if (s.back) drawAcc(ctx, s.back, R, ry, t, pal);
  if (deco && kind === 'gelatina' || kind === 'ombra') ctx.globalAlpha = kind === 'ombra' ? .82 : .88;
  blobPath(rx, ry, t, kind, P.wob, shape);
  const g = ctx.createRadialGradient(-rx*.35, -ry*.45, R*.1, 0, 0, R*1.15);
  g.addColorStop(0, pal.a); g.addColorStop(1, pal.b); ctx.fillStyle = g; ctx.fill();
  ctx.globalAlpha = 1;
  if (V && V.pat){ ctx.save(); ctx.clip(); drawPattern(ctx, V.pat, rx, ry, R, t, V.pc); ctx.restore(); blobPath(rx, ry, t, kind, P.wob, shape); }
  if (feats.length){ ctx.save(); for (const f of feats) if (f !== 'base' && (!s.hat || SIDE_FEATS.has(f) || f === 'baffi')) drawFeat(ctx, f, rx, ry, R, t, pal, 'front', topU); ctx.restore(); blobPath(rx, ry, t, kind, P.wob, shape); }
  if (deco && kind === 'gelatina'){ ctx.fillStyle = 'rgba(255,255,255,.45)'; for (let i = 0; i < 4; i++){ const a = t*.7 + i*1.7; ctx.beginPath(); ctx.arc(Math.cos(a)*R*.45, Math.sin(a*1.3)*R*.3 + R*.1, R*(.05 + (i % 2)*.03), 0, 7); ctx.fill(); } }
  if (deco && kind === 'lumino'){ for (let i = 0; i < 5; i++){ ctx.fillStyle = `rgba(255,230,120,${.5 + .5*Math.sin(t*2 + i)})`; ctx.beginPath(); ctx.arc(Math.cos(i*1.3)*R*.6, Math.sin(i*2.1)*R*.35 + R*.15, R*.045, 0, 7); ctx.fill(); } }
  if (deco && kind === 'pallino'){ ctx.save(); blobPath(rx, ry, t, kind, P.wob, shape); ctx.clip(); ctx.strokeStyle = 'rgba(90,40,10,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-rx, ry*.05); ctx.quadraticCurveTo(0, ry*.25, rx, ry*.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -ry); ctx.lineTo(0, -ry*.62); ctx.moveTo(0, ry*.55); ctx.lineTo(0, ry); ctx.stroke();
    ctx.beginPath(); ctx.arc(-rx*1.15, 0, rx*.6, -.9, .9); ctx.stroke(); ctx.beginPath(); ctx.arc(rx*1.15, 0, rx*.6, Math.PI - .9, Math.PI + .9); ctx.stroke(); ctx.restore();
    if (!s.hat){ ctx.fillStyle = '#fff'; roundRect(-rx*.75, -ry*.62, rx*1.5, R*.14, R*.06); ctx.fill(); ctx.fillStyle = '#ff5b5b'; ctx.fillRect(-rx*.75, -ry*.62 + R*.05, rx*1.5, R*.04); } }
  if (deco && kind === 'razzo'){ ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -ry*.45, R*.13, 0, 7); ctx.fill(); ctx.strokeStyle = '#d94b4b'; ctx.lineWidth = 2.5; ctx.stroke();
    if (!P.ground && Math.hypot(P.vx, P.vy) > 500) for (let i = 0; i < 2; i++) particles.push({type:'fire', x: P.x + rf(-R*.3, R*.3), y: P.y + RY*.6, vx: -P.vx*.1, vy: -P.vy*.1, life:.5, age:0, s: R*.18}); }
  if (deco && kind === 'bocciolo' && !s.hat){ ctx.save(); ctx.translate(R*.15, -ry*.95); ctx.rotate(Math.sin(t*1.2)*.12);
    for (let i = 0; i < 5; i++){ const a = i * Math.PI * 2 / 5; ctx.fillStyle = '#ff9ec7'; ctx.beginPath(); ctx.ellipse(Math.cos(a)*R*.13, Math.sin(a)*R*.13, R*.11, R*.08, a, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(0, 0, R*.08, 0, 7); ctx.fill(); ctx.restore(); }
  if (deco && kind === 'saltimbanco' && !s.hat){ for (const d of [-1, 1]){ ctx.fillStyle = d < 0 ? '#ff6fae' : '#ffc94f'; ctx.beginPath(); ctx.moveTo(d*R*.05, -ry*.9); ctx.quadraticCurveTo(d*R*.55, -ry*1.45, d*R*.7, -ry*1.05); ctx.lineTo(d*R*.45, -ry*.78); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(d*R*.7, -ry*1.05 + Math.sin(t*6 + d)*2, R*.07, 0, 7); ctx.fill(); } }
  if (deco && kind === 'esploratore' && !s.hat){ ctx.fillStyle = '#b89155'; ctx.beginPath(); ctx.ellipse(0, -ry*.86, rx*.7, R*.1, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(0, -ry*.95, rx*.42, R*.22, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#6b4a24'; ctx.fillRect(-rx*.42, -ry*.97, rx*.84, R*.05); }
  if (!deco && kind === 'razzo' && !P.ground && Math.hypot(P.vx, P.vy) > 500) for (let i = 0; i < 2; i++) particles.push({type:'fire', x: P.x + rf(-R*.3, R*.3), y: P.y + RY*.6, vx: -P.vx*.1, vy: -P.vy*.1, life:.5, age:0, s: R*.18});
  if (m === 'sick'){ ctx.fillStyle = 'rgba(150,200,110,.35)'; ctx.fill(); }
  // sporco
  if (s.hygiene < 60){ ctx.fillStyle = 'rgba(140,100,70,.35)'; const n = Math.round((60 - s.hygiene) / 10);
    for (let i = 0; i < n; i++){ const a = i * 2.4, rr = R * (.35 + (i % 3) * .15); ctx.beginPath(); ctx.ellipse(Math.cos(a)*rr, Math.sin(a)*rr*.7 + ry*.1, R*.08, R*.06, a, 0, 7); ctx.fill(); } }
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-rx*.42, -ry*.5, R*.14, R*.08, -.6, 0, 7); ctx.fill();
  if (BSH.x > 1.08){ ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(0, ry*.42, rx*.5, ry*.26, 0, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = Math.max(1.5, R*.03); ctx.beginPath(); ctx.arc(0, ry*.45, R*.05, 0, 7); ctx.stroke(); }
  if (deco && kind === 'budino'){ ctx.fillStyle = '#b8683a'; ctx.beginPath(); ctx.moveTo(-rx*.72, -ry*.5);
    for (let i = 0; i <= 8; i++) ctx.lineTo(-rx*.72 + rx*1.44*i/8, -ry*.5 + (i % 2 ? R*.18 : R*.02));
    ctx.quadraticCurveTo(0, -ry*1.25, -rx*.72, -ry*.5); ctx.fill();
    if (!s.hat){ ctx.fillStyle = '#ff4f6d'; ctx.beginPath(); ctx.arc(R*.05, -ry*1.02, R*.13, 0, 7); ctx.fill(); } }
  if (deco && kind === 'baby' && baseLook && !s.hat){ ctx.strokeStyle = pal.b; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -ry*.95);
    ctx.bezierCurveTo(R*.2, -ry*1.3, R*.28, -ry*1.02, R*.12, -ry*1.05); ctx.stroke(); }
  if (deco && kind === 'nuvola'){ ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++){ const a = t*.8 + i*2.1; ctx.globalAlpha = .6 + .4*Math.sin(t*3 + i);
    star4(Math.cos(a)*rx*1.15, -ry*.9 + Math.sin(a)*R*.18, R*.07); } ctx.globalAlpha = 1; }
  // faccia
  let lx = 0, ly = 0;
  if (P.look){ const dx = P.look.x - P.x, dy = P.look.y - P.y, d = Math.hypot(dx, dy) || 1; lx = dx / d * R * .1; ly = dy / d * R * .06; }
  else if (m !== 'sleep') lx = Math.sin(t*.5) * R * .03;
  if (m === 'shy' || m === 'distrust') lx -= R * .12;
  const ex = R*.3*Math.min(1, BSH.x + .1), ey = -ry*.08 + ly + ry*(FACE_DY[shape] || 0), fx = lx, er = R*.1;
  ctx.fillStyle = '#ff8fb3'; ctx.globalAlpha = m === 'love' || m === 'shy' ? .85 : .55;
  ctx.beginPath(); ctx.ellipse(fx - ex*1.45, ey + R*.2, R*.12, R*.07, 0, 0, 7); ctx.ellipse(fx + ex*1.45, ey + R*.2, R*.12, R*.07, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  if (deco && kind === 'muschio'){ ctx.fillStyle = '#8fb87a'; for (const [dx, dy] of [[-1.3,.05],[-1.1,.12],[1.3,.05],[1.1,.12]]){ ctx.beginPath(); ctx.arc(fx + dx*ex, ey + R*.13 + dy*R, R*.025, 0, 7); ctx.fill(); } }
  ctx.fillStyle = ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, R*.05); ctx.lineCap = 'round';
  const blink = (t % 4.3) < .13;
  for (const d of [-1, 1]){
    const X = fx + d*ex, Y = ey;
    if (m === 'sleep' || m === 'love' || (blink && !['happy','sick','dizzy','wee','laugh'].includes(m))){ ctx.beginPath(); ctx.arc(X, Y - er*.2, er*.9, .15*Math.PI, .85*Math.PI); ctx.stroke(); }
    else if (m === 'happy' || m === 'laugh' || m === 'eat'){ ctx.beginPath(); ctx.arc(X, Y + er*.5, er, 1.15*Math.PI, 1.85*Math.PI); ctx.stroke(); }
    else if (m === 'sick' || m === 'dizzy'){ ctx.beginPath(); for (let a = 0; a < Math.PI*4; a += .3){ const rr = er*a/(Math.PI*4); ctx.lineTo(X + Math.cos(a + t*(m === 'dizzy' ? 8 : 3))*rr, Y + Math.sin(a + t*(m === 'dizzy' ? 8 : 3))*rr); } ctx.stroke(); }
    else if (m === 'yuck'){ ctx.beginPath(); ctx.moveTo(X - er*.8, Y - er*.5); ctx.lineTo(X + er*.2*d, Y); ctx.lineTo(X - er*.8, Y + er*.5); ctx.stroke(); }
    else if (m === 'wee'){ ctx.beginPath(); ctx.arc(X, Y, er*1.05, 0, 7); ctx.fill(); ctx.fillStyle = HL; ctx.beginPath(); ctx.arc(X - er*.35, Y - er*.35, er*.38, 0, 7); ctx.arc(X + er*.3, Y + er*.3, er*.18, 0, 7); ctx.fill(); ctx.fillStyle = INK; }
    else {
      const h = m === 'tired' ? er*.55 : er*1.25;
      ctx.beginPath(); ctx.ellipse(X, Y, er*.85, h, 0, 0, 7); ctx.fill();
      ctx.fillStyle = HL; ctx.beginPath(); ctx.arc(X - er*.3 + lx*.3, Y - h*.4, er*.32, 0, 7); ctx.fill(); ctx.fillStyle = INK;
      if (m === 'sad' || m === 'distrust'){ ctx.beginPath(); ctx.moveTo(X - d*er*1.1, Y - er*2.2); ctx.lineTo(X + d*er*.4, Y - er*1.7); ctx.stroke(); }
    }
  }
  const my = ey + R*.28;
  ctx.beginPath();
  if (m === 'eat'){ const o = Math.abs(Math.sin(P.anim.t * 16)); ctx.fillStyle = '#c24d77'; ctx.ellipse(fx, my, R*.12, R*.04 + o*R*.09, 0, 0, 7); ctx.fill(); }
  else if (m === 'open' || m === 'wee'){ ctx.fillStyle = '#c24d77'; ctx.ellipse(fx, my + R*.02, R*.1, R*.12, 0, 0, 7); ctx.fill(); }
  else if (m === 'laugh' || m === 'happy'){ ctx.fillStyle = '#ff6f9a'; ctx.moveTo(fx - R*.14, my - R*.02); ctx.quadraticCurveTo(fx, my + R*(m === 'laugh' ? .3 : .22), fx + R*.14, my - R*.02); ctx.closePath(); ctx.fill(); }
  else if (m === 'sleep'){ ctx.ellipse(fx, my, R*.04, R*.05, 0, 0, 7); ctx.fill(); }
  else if (m === 'sad' || m === 'distrust' || m === 'yuck'){ ctx.arc(fx, my + R*.1, R*.1, 1.2*Math.PI, 1.8*Math.PI); ctx.stroke(); }
  else if (m === 'sick' || m === 'dizzy'){ ctx.moveTo(fx - R*.12, my); for (let i = 1; i <= 4; i++) ctx.quadraticCurveTo(fx - R*.12 + R*.06*(i - .5), my + (i % 2 ? -1 : 1)*R*.05, fx - R*.12 + R*.06*i, my); ctx.stroke(); }
  else if (m === 'love' || m === 'shy'){ ctx.arc(fx, my - R*.08, R*.07, .2*Math.PI, .8*Math.PI); ctx.stroke(); }
  else { ctx.arc(fx, my - R*.06, R*.09, .2*Math.PI, .8*Math.PI); ctx.stroke(); }
  if (m === 'distrust'){ ctx.fillStyle = '#8fd0ff'; const p = (t*20) % 20; ctx.globalAlpha = 1 - p/20;
    ctx.beginPath(); ctx.ellipse(fx + ex + er*.4, ey + R*.15 + p, R*.035, R*.055, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  for (const k of ['neck', 'face', 'hat']) if (s[k]) drawAcc(ctx, s[k], R, ry, t, pal, fx, ey, ex);
  ctx.restore();
  if (m === 'dizzy'){ ctx.fillStyle = '#ffcf3f'; for (let i = 0; i < 3; i++){ const a = t*4 + i*2.1; star5(P.x + Math.cos(a)*R*.7, P.y - RY*1.05 + Math.sin(a)*R*.15, R*.09); } }
  if (m === 'sleep'){
    const dreams = ['⚽','🦋','🍦','🌈','🧸','🏀','⭐', FOODS[s.traits.favFood].e];
    const de = dreams[Math.floor(t / 4) % dreams.length];
    const bx = lim(P.x - R * 1.05, R * .5, W - R * .5), by = Math.max(R * .5, P.y - RY - R * .55);
    ctx.globalAlpha = .9; ctx.fillStyle = tokens.panel;
    ctx.beginPath(); ctx.arc(P.x - R * .45, P.y - RY * .85, R * .06, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(P.x - R * .7, P.y - RY * 1.05, R * .1, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(bx, by, R * .42, R * .32, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    emoji(de, bx, by, R * .36);
  }
  if (m === 'sleep'){ ctx.fillStyle = tokens.ink;
    for (let i = 0; i < 3; i++){ const p = (t*.5 + i/3) % 1; ctx.globalAlpha = 1 - p; ctx.font = `${Math.round(R*(.16 + p*.14))}px "Mochiy Pop One", sans-serif`;
      ctx.fillText('z', P.x + rx*.7 + p*R*.4, P.y - ry*.6 - p*R*.8); } ctx.globalAlpha = 1; }
  if (m === 'sick' && !P.held){ ctx.fillStyle = '#fff'; ctx.strokeStyle = '#ff7d9a'; ctx.lineWidth = 2; ctx.save(); ctx.translate(P.x + rx*.55, P.y - ry*.75); ctx.rotate(.3);
    roundRect(-R*.2, -R*.07, R*.4, R*.14, R*.05); ctx.fill(); ctx.stroke(); ctx.restore(); }
  if (!guest && s.wish && !s.sleeping && !P.held){
    const bob = Math.sin(t*2)*3, br = Math.max(22, R*.4);
    const bx = lim(P.x + R*1.05, br + 6, W - br - 6), by = Math.max(br*.8 + 6, P.y - RY - br*.7) + bob;
    ctx.fillStyle = tokens.panel; ctx.strokeStyle = tokens.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(P.x + R*.6, P.y - RY*.8 + bob*.5, br*.1, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(P.x + R*.78, P.y - RY*1.0 + bob*.7, br*.16, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(bx, by, br, br*.78, 0, 0, 7); ctx.fill(); ctx.stroke();
    emoji(s.wish.e, bx, by + 1, br*.95);
  }
}
function drawBall(){
  if (!petVisible() && !(state && state.walk)) return;
  const r = ball.r;
  ctx.fillStyle = 'rgba(80,30,60,.12)'; ctx.beginPath(); ctx.ellipse(ball.x, FLOOR + 2, r * (1 - Math.min(.7, (FLOOR - ball.y) / H)), r * .3, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(ball.x, ball.y); ctx.rotate(ball.spin);
  ballStyle(ctx, r, fvarOf(curRoom(), 'palla'));
  ctx.restore();
}
function drawEvent(t){
  if (!ev) return;
  if (ev.type === 'butterfly'){ ctx.save(); ctx.translate(ev.x, ev.y); ctx.scale(Math.sign(ev.vx) || 1, 1); ctx.scale(.7 + .3*Math.abs(Math.sin(t*14)), 1); emoji('🦋', 0, 0, R*.5); ctx.restore(); }
  if (ev.type === 'bubbles') for (const b of ev.items){ if (!b.alive) continue;
    ctx.strokeStyle = 'rgba(124,200,255,.9)'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(200,235,255,.25)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(b.x - b.r*.35, b.y - b.r*.35, b.r*.2, 0, 7); ctx.fill(); }
  if (ev.type === 'starRain') for (const b of ev.items){ if (!b.alive) continue; ctx.fillStyle = '#ffd24a'; star5(b.x, b.y, Math.max(9, W * .028)); ctx.fillStyle = '#fff'; star4(b.x + 6, b.y - 6, 3 + Math.abs(Math.sin(t * 8 + b.ph)) * 3); }
  if (ev.type === 'mouse'){ ctx.save(); ctx.translate(ev.x, ev.y - R * .12 - Math.abs(Math.sin(t * 22)) * 3); ctx.scale(ev.dir > 0 ? -1 : 1, 1); emoji('🐁', 0, 0, R * .5); ctx.restore(); }
  if (ev.type === 'balloon'){ ctx.strokeStyle = tokens.ink; ctx.globalAlpha = .4; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ev.x, ev.y + R * .3);
    for (let i = 1; i <= 6; i++) ctx.lineTo(ev.x + Math.sin(t * 3 + i) * 4, ev.y + R * .3 + i * R * .12); ctx.stroke(); ctx.globalAlpha = 1; emoji('🎈', ev.x, ev.y, R * .7); }
  if (ev.type === 'ghost'){ ctx.globalAlpha = ev.a * (.7 + .3 * Math.sin(t * 4)); emoji('👻', ev.x, ev.y, R * .75); ctx.globalAlpha = 1; }
  if (ev.type === 'letter') emoji('✉️', ev.x, FLOOR - 10, R * .45, Math.sin(t * 3) * .08);
  if (ev.type === 'bird'){ emoji('🐦', ev.x, ev.y - (ev.landed ? Math.abs(Math.sin(t * 6)) * 2 : 0), R * .42); }
  if (ev.type === 'storm'){ ctx.fillStyle = 'rgba(30,30,70,.14)'; ctx.fillRect(0, 0, W, H); if (ev.flash > 0){ ctx.fillStyle = `rgba(255,255,255,${ev.flash * .55})`; ctx.fillRect(0, 0, W, H); } }
  if (ev.type === 'glint'){ ctx.fillStyle = '#fff4b0'; const s = 6 + Math.abs(Math.sin(t*6))*8; star4(ev.x, FLOOR - 6, s); ctx.fillStyle = '#ffd24a'; star4(ev.x + 9, FLOOR - 14, s*.45); }
  if (ev.type === 'visitor'){
    const x = ev.x, y = groundY() - Math.abs(Math.sin(t*5))*R*.1, r = R*.75;
    ctx.fillStyle = 'rgba(80,30,60,.12)'; ctx.beginPath(); ctx.ellipse(x, FLOOR + 2, r*.8, r*.12, 0, 0, 7); ctx.fill();
    ctx.fillStyle = ev.pal.b; ctx.beginPath(); ctx.ellipse(x, y + r*.2, r, r*.85, 0, 0, 7); ctx.fill();
    ctx.fillStyle = ev.pal.a; ctx.beginPath(); ctx.ellipse(x - r*.35, y - r*.2, r*.2, r*.12, -.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#3b2842'; for (const d of [-1, 1]){ ctx.beginPath(); ctx.ellipse(x + d*r*.3 - r*.08, y + r*.1, r*.08, r*.12, 0, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#3b2842'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x - r*.08, y + r*.3, r*.1, .2*Math.PI, .8*Math.PI); ctx.stroke();
    if (!ev.greeted){ const bob = Math.sin(t*3)*3; emoji('👋', x, y - r*1.1 + bob, r*.5); }
  }
}
function drawParticles(dt){
  setParticles(particles.filter(p => (p.age += dt) < p.life));
  for (const p of particles){
    const grav = p.type === 'crumb' || p.type === 'drop' || p.type === 'confetti' || p.type === 'food' || p.type === 'balls' ? 520 : p.type === 'bubble' ? -40 : p.type === 'text' ? 0 : -10;
    p.x += p.vx*dt; p.y += p.vy*dt; p.vy += grav*dt;
    ctx.globalAlpha = Math.max(0, 1 - p.age/p.life);
    if (p.type === 'heart'){ ctx.fillStyle = '#ff6fae'; heart(p.x, p.y, p.s*.7); }
    else if (p.type === 'sparkle'){ ctx.fillStyle = '#ffd24a'; star4(p.x, p.y, p.s); }
    else if (p.type === 'drop'){ ctx.fillStyle = '#7cc8ff'; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s*.35, p.s*.5, 0, 0, 7); ctx.fill(); }
    else if (p.type === 'bubble'){ ctx.strokeStyle = 'rgba(124,200,255,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, p.s*.6, 0, 7); ctx.stroke(); }
    else if (p.type === 'note'){ ctx.fillStyle = '#a893ff'; ctx.font = `${Math.round(p.s*2)}px "Mochiy Pop One", sans-serif`; ctx.fillText(p.s > 9 ? '♪' : '♫', p.x, p.y); }
    else if (p.type === 'confetti'){ ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.age*8); ctx.fillRect(-p.s*.4, -p.s*.2, p.s*.8, p.s*.4); ctx.restore(); }
    else if (p.type === 'text'){ ctx.fillStyle = p.c; ctx.font = `800 ${p.s}px "M PLUS Rounded 1c", sans-serif`; ctx.textAlign = 'center'; ctx.fillText(p.txt, p.x, p.y); }
    else if (p.type === 'food'){ emoji(p.e, p.x, p.y, p.s, p.age*10); }
    else if (p.type === 'balls'){ ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s*.45, 0, 7); ctx.fill(); }
    else if (p.type === 'fire'){ ctx.fillStyle = `hsl(${40 - p.age*60},100%,60%)`; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, p.s*(1 - p.age/p.life)), 0, 7); ctx.fill(); }
    else { ctx.fillStyle = '#e8b97f'; ctx.beginPath(); ctx.arc(p.x, p.y, p.s*.3, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}

export { blobPathC, blobR, drawBall, drawEvent, drawParticles, drawPet };
