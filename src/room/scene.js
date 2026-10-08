import { $, MIN, lim, pick, rf, rnd } from '../game/util.js';
import { FREE, THEMES } from '../game/catalog.js';
import { particles, setParticles, state, world } from '../game/state.js';
import { activeRoom } from '../game/house.js';
import { ptr } from './pointer.js';

/* ================= il mondo della cameretta ================= */
const cv = $('scene'); let ctx = cv.getContext('2d');
let W = 0, H = 0, FLOOR = 0, R = 40, RY = 35, tokens = {};
const PAL = {
  baby:{a:'#ffd3e6', b:'#ff9fca'}, child:{a:'#c2f5e2', b:'#78d9b6'},
  nuvola:{a:'#e3f3ff', b:'#9fcff7'}, stellino:{a:'#fff0b8', b:'#ffc84a'},
  budino:{a:'#ffe0c4', b:'#ffab76'}, muschio:{a:'#d7efcb', b:'#95c882'}
};
const pet = {x:0, y:0, vx:0, vy:0, ground:true, rot:0, vr:0, sq:1, sqv:0, dir:1, held:false, hx:0, hy:0,
  look:null, expr:null, exprUntil:0, anim:null, beh:null, hop:0, wob:0, throws:[], tickle:0, airFrom:0};
const ball = {x:0, y:0, vx:0, vy:0, r:14, ground:true, held:false, spin:0};
let floorFood = [], dragFood = null, ev = null, nextEvAt = Date.now() + rnd(12, 22)*1000, fallingPot = null;
let lastTouch = Date.now(), inited = false;

function returnFood(f){ if (world && f && !FREE.includes(f.id)) world.inv[f.id] = (world.inv[f.id] || 0) + 1; }
function resetScene(){
  floorFood.forEach(returnFood); if (dragFood && dragFood.paid) returnFood(dragFood);
  floorFood = []; ev = null; setParticles([]); fallingPot = null; dragFood = null; ptr.down = false;
  nextEvAt = Date.now() + rnd(12, 22) * 1000; flower = null;
  Object.assign(pet, {vx:0, vy:0, ground:true, rot:0, vr:0, sq:1, sqv:0, held:false, beh:null, anim:null, expr:null, look:null, hop:0, wob:0, airFrom:0});
  if (W){ geo(); pet.x = W * .55; pet.y = groundY(); ball.x = W * .3; ball.y = FLOOR - ball.r; ball.vx = ball.vy = 0; ball.ground = true; ball.held = false; }
}
let flower = null, nextFlowerAt = Date.now() + 3 * MIN;
function roomColors(){
  const r = world && world.rooms[activeRoom], th = r ? r.theme : 'rosa';
  if (th === 'rosa') return {wall: tokens.wall, wall2: tokens['wall-2'], floor: tokens.floor, rug: tokens.rug};
  const h = THEMES[th].h, cs = getComputedStyle(document.documentElement).colorScheme;
  const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  return dark ? {wall:`hsl(${h},22%,22%)`, wall2:`hsl(${h},22%,27%)`, floor:`hsl(${h},20%,29%)`, rug:`hsl(${h},28%,36%)`}
              : {wall:`hsl(${h},70%,92%)`, wall2:`hsl(${h},80%,96%)`, floor:`hsl(${h},55%,86%)`, rug:`hsl(${h},75%,80%)`};
}
function readTokens(){
  const cs = getComputedStyle(document.documentElement);
  for (const k of ['wall','wall-2','floor','rug','panel','ink','line']) tokens[k] = cs.getPropertyValue('--' + k).trim();
}
function geo(){
  const s = state;
  const sc = !s || s.stage === 'egg' ? .8 : {baby:.7, child:.85}[s.stage] || 1;
  R = Math.min(W, H) * .2 * sc; RY = R * .88;
  ball.r = Math.min(W, H) * .045;
}
const groundY = () => FLOOR - RY * .78;
function fit(){
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return false;
  if (w !== W || h !== H){
    const fx = W ? w / W : 1;
    W = w; H = h; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    FLOOR = H * .9; geo();
    if (!inited){ pet.x = W * .55; pet.y = groundY(); ball.x = W * .3; ball.y = FLOOR - ball.r; inited = true; }
    else { pet.x *= fx; ball.x *= fx; pet.y = Math.min(pet.y, groundY()); ball.y = Math.min(ball.y, FLOOR - ball.r); }
  }
  return true;
}
const G = () => H * 3.4;
const petVisible = () => state && state.stage !== 'egg' && !state.walk;
const awake = () => petVisible() && !state.sleeping;
const mouthPos = () => ({x: pet.x + (pet.look ? lim((pet.look.x - pet.x) / W, -1, 1) * R * .1 : 0), y: pet.y + R * .22});
function setExpr(e, sec){ pet.expr = e; pet.exprUntil = performance.now() + sec * 1000; }
function squish(a){ pet.sqv -= a * 14; }
function burst(type, n = 8, x, y){
  const px = x ?? pet.x, py = y ?? pet.y - R * .4;
  for (let i = 0; i < n; i++) particles.push({type, x: px + (Math.random() - .5) * R, y: py,
    vx: (Math.random() - .5) * (type === 'confetti' ? 320 : 70), vy: type === 'confetti' ? -rf(150, 380) : -40 - Math.random() * 70,
    life: 1.3 + Math.random() * .7, age: 0, s: 6 + Math.random() * 6, c: pick(['#ff8fbf','#ffc94f','#6fdcb6','#a893ff','#7cc8ff'])});
}
function floatText(txt, x, y, col){ particles.push({type:'text', txt, x, y, vx:0, vy:-40, life:1.2, age:0, s:14, c:col || '#ffb52e'}); }

// gli altri moduli non possono riassegnare una variabile importata: la cambiano con questi
export function setCtx(v){ ctx = v; }
export function setW(v){ W = v; }
export function setH(v){ H = v; }
export function setFLOOR(v){ FLOOR = v; }
export function setFloorFood(v){ floorFood = v; }
export function setDragFood(v){ dragFood = v; }
export function setEv(v){ ev = v; }
export function setNextEvAt(v){ nextEvAt = v; }
export function setFallingPot(v){ fallingPot = v; }
export function setLastTouch(v){ lastTouch = v; }
export function setFlower(v){ flower = v; }
export function setNextFlowerAt(v){ nextFlowerAt = v; }

export {
  FLOOR, G, H, R, RY, W, awake, ball, burst, ctx, cv, dragFood, ev, fallingPot, fit, floatText,
  floorFood, flower, geo, groundY, lastTouch, mouthPos, nextEvAt, nextFlowerAt, pet, petVisible,
  readTokens, resetScene, returnFood, roomColors, setExpr, squish, tokens
};
