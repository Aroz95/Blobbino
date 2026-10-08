import { $, esc, lim, pick, rf, rnd } from '../game/util.js';
import { blobById, blobEmoji, formName, nm, pickWeighted, world } from '../game/state.js';
import { tokens } from '../room/scene.js';
import { isNight } from '../room/events.js';
import { rrC } from '../draw/items.js';
import { drawBlobMini } from './house-view.js';

/* ---------- la Valle dei Blob: si guarda e basta ---------- */
let valleyEnts = {}, valleyKey = '', vBugs = [], vFx = [];
const VACT = {wander:'passeggia sul prato', sleep:'fa un pisolino', butterfly:'insegue una farfalla', swim:'fa il bagno nel laghetto', tree:'riposa sotto l\'albero', flower:'annusa i fiori', stars:'guarda le stelle', sun:'prende il sole', play:'gioca con', egg:'si scalda al sole', eggn:'dorme sotto le stelle', roll:'fa le capriole', fireflies:'acchiappa le lucciole'};
const VPLACE = {tree:{x:.17, d:.18}, swim:{x:.72, d:.6}, flower:{x:.46, d:.12}};
function valleyBlobs(){ return world ? world.valley.map(blobById).filter(Boolean) : []; }
function vChoose(v, b, all, night){
  if (b.stage === 'egg'){ v.act = night ? 'eggn' : 'egg'; v.until = Date.now() + 60000; return; }
  const opts = [['wander', 3], ['sleep', night ? 5 : .8], ['tree', 1.5], ['roll', 1]];
  if (!night) opts.push(['butterfly', 2.2], ['swim', 1.6], ['flower', 1.6], ['sun', 1]); else opts.push(['stars', 3], ['fireflies', 1.5]);
  const free = all.filter(x => x.id !== b.id && x.stage !== 'egg' && valleyEnts[x.id] && !['sleep','play'].includes(valleyEnts[x.id].act));
  if (free.length) opts.push(['play', 2.5]);
  const act = pickWeighted(opts); v.act = act; v.partner = null; v.until = Date.now() + rnd(act === 'sleep' ? 14000 : 7000, act === 'sleep' ? 26000 : 15000);
  if (act === 'play'){ const o = pick(free), ov = valleyEnts[o.id]; v.partner = o.id; ov.act = 'play'; ov.partner = b.id; ov.until = v.until; const mx = lim((v.x + ov.x) / 2, .15, .85), md = lim((v.d + ov.d) / 2, .1, .9); v.tx = mx - .06; v.td = md; ov.tx = mx + .06; ov.td = md; return; }
  const pl = VPLACE[act];
  if (pl){ v.tx = lim(pl.x + rf(-.08, .08), .06, .94); v.td = lim(pl.d + rf(-.06, .06), 0, 1); }
  else if (act === 'butterfly'){ v.bug = vBugs.length ? rnd(0, vBugs.length - 1) : 0; }
  else if (act === 'wander' || act === 'roll'){ v.tx = rf(.08, .92); v.td = rf(.05, .95); }
  else { v.tx = v.x; v.td = v.d; }
}
function drawValley(t, dt){
  const cvv = $('valleyCv'); if (!cvv || !cvv.clientWidth || !world) return;
  const dpr = Math.min(2, devicePixelRatio || 1), w = cvv.clientWidth, h = cvv.clientHeight;
  if (cvv.width !== Math.round(w * dpr)){ cvv.width = Math.round(w * dpr); cvv.height = Math.round(h * dpr); }
  const c = cvv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
  const night = isNight(), now = Date.now();
  c.save(); rrC(c, 0, 0, w, h, 24); c.clip();
  // cielo
  const sky = c.createLinearGradient(0, 0, 0, h * .5); if (night){ sky.addColorStop(0, '#1f1d4d'); sky.addColorStop(1, '#4b3f80'); } else { sky.addColorStop(0, '#9fd8ff'); sky.addColorStop(1, '#fdf1ff'); }
  c.fillStyle = sky; c.fillRect(0, 0, w, h);
  if (night){ c.fillStyle = '#fff'; for (let i = 0; i < 26; i++){ c.globalAlpha = .3 + .7 * Math.abs(Math.sin(t * 1.3 + i * 2.7)); star4C(c, (i * 97 % 100) / 100 * w, (i * 53 % 38) / 100 * h + 4, 1.6 + (i % 3)); } c.globalAlpha = 1;
    c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(w * .8, h * .12, w * .05, 0, 7); c.fill(); c.fillStyle = '#4b3f80'; c.beginPath(); c.arc(w * .82, h * .11, w * .045, 0, 7); c.fill(); }
  else { c.fillStyle = '#ffd86b'; c.beginPath(); c.arc(w * .8, h * .12, w * .06, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < 3; i++){ const cx2 = ((t * (6 + i * 3) + i * 160) % (w + 120)) - 60, cy2 = h * (.08 + i * .06); c.beginPath(); c.arc(cx2, cy2, 12, 0, 7); c.arc(cx2 + 15, cy2 - 5, 16, 0, 7); c.arc(cx2 + 31, cy2, 11, 0, 7); c.fill(); } }
  // colline e montagne
  c.fillStyle = night ? '#3a3a6e' : '#c9b8f0'; c.beginPath(); c.moveTo(0, h * .42); c.lineTo(w * .18, h * .24); c.lineTo(w * .34, h * .4); c.lineTo(w * .55, h * .2); c.lineTo(w * .78, h * .38); c.lineTo(w * .92, h * .28); c.lineTo(w, h * .36); c.lineTo(w, h * .5); c.lineTo(0, h * .5); c.fill();
  c.fillStyle = night ? '#f4f0ff' : '#ffffff'; for (const [px, py] of [[.18, .24], [.55, .2]]){ c.beginPath(); c.moveTo(w * px, h * py); c.lineTo(w * (px - .05), h * (py + .06)); c.lineTo(w * (px + .05), h * (py + .06)); c.fill(); }
  c.fillStyle = night ? '#2f5a4c' : '#a6e3a0'; c.beginPath(); c.moveTo(0, h * .5); c.quadraticCurveTo(w * .3, h * .36, w * .6, h * .46); c.quadraticCurveTo(w * .85, h * .4, w, h * .46); c.lineTo(w, h); c.lineTo(0, h); c.fill();
  c.fillStyle = night ? '#386b59' : '#b9eeb1'; c.fillRect(0, h * .52, w, h);
  c.fillStyle = night ? '#3f7563' : '#c8f5c0'; for (let i = 0; i < 18; i++){ const gx = (i * 61 % 100) / 100 * w, gy = h * (.56 + (i * 37 % 40) / 100); c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + 3, gy - 7); c.lineTo(gx + 6, gy); c.fill(); }
  const yOf = d => h * (.54 + d * .4), sOf = d => .62 + d * .55;
  // laghetto
  const px = w * .72, py = yOf(.62), prx = w * .2, pry = h * .065;
  c.fillStyle = night ? '#2c4f8a' : '#8fd3ff'; c.beginPath(); c.ellipse(px, py, prx, pry, 0, 0, 7); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; for (let i = 0; i < 2; i++){ const k = (t * .4 + i * .5) % 1; c.globalAlpha = 1 - k; c.beginPath(); c.ellipse(px - prx * .3 + i * prx * .5, py, prx * .2 * (.4 + k), pry * .3 * (.4 + k), 0, 0, 7); c.stroke(); } c.globalAlpha = 1;
  // albero
  const tx0 = w * .14, ty0 = yOf(.15);
  c.fillStyle = '#a8743f'; c.fillRect(tx0 - w * .02, ty0 - h * .2, w * .04, h * .2);
  c.fillStyle = night ? '#2f6b4a' : '#6fcf73'; for (const [ox, oy, rr] of [[0, -.26, .1], [-.06, -.21, .08], [.06, -.21, .08], [0, -.18, .07]]){ c.beginPath(); c.arc(tx0 + ox * w, ty0 + oy * h, rr * w, 0, 7); c.fill(); }
  c.fillStyle = '#ff6b6b'; for (const [ox, oy] of [[-.04, -.25], [.05, -.22], [.01, -.3]]){ c.beginPath(); c.arc(tx0 + ox * w, ty0 + oy * h, w * .012, 0, 7); c.fill(); }
  // fiori
  for (let i = 0; i < 9; i++){ const fx2 = w * (.36 + (i * 23 % 22) / 100), fy2 = yOf(.05 + (i * 13 % 18) / 100); c.fillStyle = ['#ff9ec7', '#ffd24a', '#b79bff'][i % 3]; for (let k = 0; k < 5; k++){ const a = k * 1.26; c.beginPath(); c.arc(fx2 + Math.cos(a) * 3.2, fy2 + Math.sin(a) * 3.2, 2.6, 0, 7); c.fill(); } c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(fx2, fy2, 2, 0, 7); c.fill(); }
  // farfalle o lucciole
  if (vBugs.length !== 3) vBugs = [0, 1, 2].map(i => ({x: rf(.1, .9), y: rf(.5, .9), ph: i * 2, sp: rf(.05, .1)}));
  for (const g of vBugs){ g.ph += dt; g.x += Math.cos(g.ph * .6) * g.sp * dt; g.y += Math.sin(g.ph * 1.3) * .04 * dt; g.x = lim(g.x, .05, .95); g.y = lim(g.y, .5, .92);
    const bx = g.x * w, by = g.y * h - 10;
    if (night){ c.fillStyle = `rgba(255,240,140,${.4 + .6 * Math.abs(Math.sin(g.ph * 3))})`; c.beginPath(); c.arc(bx, by, 3, 0, 7); c.fill(); }
    else { const fl = Math.abs(Math.sin(g.ph * 12)); c.fillStyle = '#ff9ec7'; c.beginPath(); c.ellipse(bx - 4 * fl, by, 4 * fl + .5, 3, 0, 0, 7); c.ellipse(bx + 4 * fl, by, 4 * fl + .5, 3, 0, 0, 7); c.fill(); c.fillStyle = '#5a4a5a'; c.fillRect(bx - .7, by - 3, 1.4, 6); } }
  // i blob
  const vb = valleyBlobs();
  for (const id in valleyEnts) if (!vb.find(b => b.id === id)) delete valleyEnts[id];
  vb.forEach((b, i) => { if (!valleyEnts[b.id]) valleyEnts[b.id] = {x: rf(.15, .85), d: rf(.1, .9), tx: .5, td: .5, act: null, until: 0, hop: 0, flip: false}; });
  for (const b of vb){
    const v = valleyEnts[b.id];
    if (!v.act || now > v.until) vChoose(v, b, vb, night);
    if (v.act === 'butterfly'){ const g = vBugs[v.bug % vBugs.length]; v.tx = g.x; v.td = lim((g.y * h - h * .54) / (h * .4), 0, 1); }
    if (v.act === 'play' && (!v.partner || !valleyEnts[v.partner] || valleyEnts[v.partner].act !== 'play')){ v.act = null; continue; }
    const sp = (v.act === 'butterfly' || v.act === 'play' ? .14 : .07) * dt;
    const dx = v.tx - v.x, dd = v.td - v.d, moving = Math.abs(dx) > .006 || Math.abs(dd) > .006;
    if (moving && v.act !== 'sleep' && b.stage !== 'egg'){ const L = Math.hypot(dx, dd) || 1; v.x += dx / L * Math.min(L, sp); v.d += dd / L * Math.min(L, sp); v.hop += dt * 9; if (Math.abs(dx) > .004) v.flip = dx < 0; }
    else { v.hop = (v.act === 'play' || v.act === 'butterfly' || v.act === 'roll') && b.stage !== 'egg' ? v.hop + dt * 7 : 0;
      if (v.act === 'play' && Math.random() < dt * 1.2) vFx.push({x: v.x * w, y: yOf(v.d) - 30, life: 1.2, e: '♡'}); }
    v.moving = moving;
  }
  const order = vb.slice().sort((a, b) => valleyEnts[a.id].d - valleyEnts[b.id].d);
  for (const b of order){
    const v = valleyEnts[b.id], sc = sOf(v.d), r = w * .07 * sc * (b.stage === 'egg' ? .8 : ({baby: .7, child: .85}[b.stage] || 1));
    const gy = yOf(v.d), inPond = v.act === 'swim' && !v.moving && Math.hypot((v.x * w - px) / prx, (gy - py) / pry) < 1;
    let by = gy - r * .88 * .78 - Math.abs(Math.sin(v.hop)) * r * (v.act === 'play' ? .5 : .2);
    if (inPond) by = gy - r * .25 + Math.sin(t * 2 + v.x * 9) * r * .06;
    v.px = v.x * w; v.py = by; v.pr = r;
    c.fillStyle = 'rgba(40,60,40,.16)'; if (!inPond){ c.beginPath(); c.ellipse(v.x * w, gy, r * .85, r * .14, 0, 0, 7); c.fill(); }
    c.save();
    if (inPond){ c.beginPath(); c.rect(0, 0, w, gy + r * .05); c.clip(); }
    if (v.act === 'roll' && !v.moving && b.stage !== 'egg'){ c.translate(v.x * w, by); c.rotate(v.hop * .7); c.translate(-v.x * w, -by); }
    const eyes = b.stage === 'egg' ? null : (v.act === 'sleep' || v.act === 'tree' && !v.moving && Math.sin(t * .2 + v.x * 5) > .3) ? 'sleep' : ['play', 'butterfly', 'sun', 'swim', 'flower', 'roll', 'fireflies'].includes(v.act) ? 'happy' : 'open';
    drawBlobMini(c, v.x * w, by, r, b, t, {eyes, flip: v.flip});
    c.restore();
    if (inPond){ c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(v.x * w, gy + r * .05, r * 1.05, r * .18, 0, 0, 7); c.stroke(); }
    if (v.act === 'sleep' && !v.moving){ c.fillStyle = night ? '#fff' : '#6b5a8e'; c.font = `800 ${Math.round(r * .45)}px "M PLUS Rounded 1c", sans-serif`; c.textAlign = 'left'; for (let k = 0; k < 2; k++){ const ph = (t * .6 + k * .5) % 1; c.globalAlpha = 1 - ph; c.fillText('z', v.x * w + r * .7 + ph * r * .4, by - r * .7 - ph * r * .9); } c.globalAlpha = 1; }
    if (v.act === 'stars' && !v.moving){ c.fillStyle = '#fff6c0'; for (let k = 0; k < 2; k++){ c.globalAlpha = .5 + .5 * Math.sin(t * 4 + k); star4C(c, v.x * w + (k ? r : -r) * .7, by - r * 1.3, r * .12); } c.globalAlpha = 1; }
    if (v.act === 'flower' && !v.moving && Math.random() < dt * .8) vFx.push({x: v.x * w + rf(-r, r), y: by - r, life: 1.4, e: '✿'});
    if (v.tag && now < v.tag){ const lab = `${b.name || 'Uovo'} · ${formName(b)}`; c.font = `800 ${Math.max(11, Math.round(w * .033))}px "M PLUS Rounded 1c", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const tw = c.measureText(lab).width + 16, bx2 = lim(v.x * w, tw / 2 + 4, w - tw / 2 - 4), by2 = Math.max(16, by - r * 1.45); c.fillStyle = tokens.panel || '#fff'; rrC(c, bx2 - tw / 2, by2 - 12, tw, 24, 12); c.fill(); c.fillStyle = tokens.ink || '#3b2842'; c.fillText(lab, bx2, by2 + 1); }
  }
  for (const f of vFx){ f.life -= dt; f.y -= dt * 22; c.globalAlpha = Math.max(0, Math.min(1, f.life)); c.fillStyle = '#ff6fae'; c.font = `800 14px "M PLUS Rounded 1c", sans-serif`; c.textAlign = 'center'; c.fillText(f.e, f.x, f.y); } c.globalAlpha = 1;
  vFx = vFx.filter(f => f.life > 0);
  if (!vb.length){ c.fillStyle = night ? '#fff' : '#3b2842'; c.globalAlpha = .7; c.textAlign = 'center'; c.font = `800 ${Math.round(w * .042)}px "M PLUS Rounded 1c", sans-serif`; c.fillText('La Valle è tranquilla: nessun blob qui.', w / 2, h * .72); c.font = `600 ${Math.round(w * .034)}px "M PLUS Rounded 1c", sans-serif`; c.fillText('Puoi mandarci un blob da “Gestisci casa”.', w / 2, h * .78); c.globalAlpha = 1; }
  c.restore();
  if (Math.floor(t * 2) !== Math.floor((t - dt) * 2)) renderValleyList();
}
function renderValleyList(){
  if (!world) return;
  const vb = valleyBlobs();
  const rows = vb.map(b => { const v = valleyEnts[b.id], act = v && v.act ? (v.act === 'play' ? `gioca con ${esc(nm(blobById(v.partner) || b))}` : VACT[v.act]) : 'si guarda intorno';
    return [b, act]; });
  const key = rows.map(([b, a]) => b.id + a).join('|');
  if (key === valleyKey) return; valleyKey = key;
  $('valleyList').innerHTML = rows.length ? rows.map(([b, a]) => `<div class="rowi"><div class="em">${blobEmoji(b)}</div><div><b>${esc(b.name || 'Uovo')}</b><small class="where">${formName(b)}${b.shiny && b.stage !== 'egg' ? ' dorato' : ''} · ${a}</small></div></div>`).join('')
    : '<p class="shopnote">Quando la casa è piena, o vuoi far riposare un blob, mandalo qui da “Gestisci casa”.</p>';
}
function star4C(c, x, y, s){ c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill(); }

// gli altri moduli non possono riassegnare una variabile importata: la cambiano con questi
export function setValleyKey(v){ valleyKey = v; }

export { drawValley, renderValleyList, star4C, valleyEnts };
