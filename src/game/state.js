import { SOUND_KEY } from '../config.js';
import { MIN, pick, rnd } from './util.js';
import { ADULT_R, FORMS, RAR, SHINY, VARS, lineAdult, lineChild, lineOf } from './blobs.js';
import { FURN, GAMES, LEVELS, PLACES, ROOM_NAMES, STICKERS, TASTY } from './catalog.js';
import { pickForm } from './evolution.js';
import { drawFurnShape } from '../draw/items.js';

/* ================= stato ================= */
let world = null, state = null;
let shopSec = 'food', unseenStickers = false;
let sound = true;
let particles = [];

const GK = new Set(['coins','inv','hats','furn','stickers','daily','records','wishesDone','missions','dayMood','hoops','chests','lastEv','dex']);
const RK = new Set(['furnOn','messes','gift','lastGift','poops','theme']);
const roomOf = b => world && b.at !== null && b.at !== undefined && !world.valley.includes(b.id) ? world.rooms[b.at] || null : null;
const homeIdx = b => world ? world.rooms.findIndex(r => r.blob === b.id) : -1;
const RDEF = {furnOn:[], messes:[], poops:0, gift:null, lastGift:0, theme:'rosa', fpos:{}, rug:'rosa', fvar:{}, fflip:{}};
/* varianti di colore dei mobili: ogni variante si compra a parte e va in una stanza */
const fKey = (id, v) => v ? id + '@' + v : id;
const ownsF = (id, v) => !!world && world.furn.includes(fKey(id, v));
const fvarOf = (r, id) => (r && r.fvar && r.fvar[id]) || 0;
const roomWithF = (id, v) => world ? world.rooms.find(r => r.furnOn.includes(id) && fvarOf(r, id) === v) || null : null;
function placeF(room, id, v){
  for (const r of world.rooms) if (r !== room && r.furnOn.includes(id) && fvarOf(r, id) === v) r.furnOn = r.furnOn.filter(x => x !== id);
  if (!room.fvar) room.fvar = {};
  if (!room.furnOn.includes(id)) room.furnOn.push(id);
  room.fvar[id] = v;
}
function unplaceF(room, id){ room.furnOn = room.furnOn.filter(x => x !== id); if (room.fvar) delete room.fvar[id]; if (room.fflip) delete room.fflip[id]; }
function drawFurnV(c, id, v, flip, cx, cy, S, t, live){
  if (!FURN[id]) return;
  c.save();
  if (flip){ c.translate(cx, 0); c.scale(-1, 1); c.translate(-cx, 0); }
  drawFurnShape(c, id, cx, cy, S, t, live, v);
  c.restore();
}
const drawFurnRoom = (c, room, id, cx, cy, S, t, live) => drawFurnV(c, id, fvarOf(room, id), !!(room && room.fflip && room.fflip[id]), cx, cy, S, t, live);
function view(b){
  return new Proxy(b, {
    get(t, k){ if (GK.has(k)) return world[k]; if (RK.has(k)){ const r = roomOf(t); return r ? r[k] : RDEF[k]; } return t[k]; },
    set(t, k, v){ if (GK.has(k)) world[k] = v; else if (RK.has(k)){ const r = roomOf(t); if (r) r[k] = v; } else t[k] = v; return true; }
  });
}
const nm = b => (b && b.name) || 'il piccolo';
const houseBlobs = () => world ? world.blobs.filter(b => !world.valley.includes(b.id) && world.rooms.some(r => r.blob === b.id)) : [];
const presentIn = i => houseBlobs().filter(b => b.at === i && !b.walk);
const blobById = id => world && world.blobs.find(b => b.id === id);

function rollTraits(){
  const f = TASTY.slice().sort(() => Math.random() - .5);
  return {favFood:f[0], hateFood:f[1], favGame:pick(Object.keys(GAMES)), favPlace:pick(Object.keys(PLACES))};
}
function newRoom(i){ return {name: ROOM_NAMES[i] || `Stanza ${i + 1}`, theme: ['rosa','menta','lilla','cielo'][i] || 'rosa', blob:null, furnOn:[], messes:[], poops:0, gift:null, lastGift:0, fpos:{}, rug:'rosa'}; }
function pickWeighted(opts){ const tot = opts.reduce((a, o) => a + o[1], 0); let r = Math.random() * tot; for (const [v, w] of opts){ if ((r -= w) <= 0) return v; } return opts[opts.length - 1][0]; }
function bestRar(b){ return Math.max(b.egg ? VARS.egg[b.egg].r : 1, b.bv ? VARS.baby[b.bv].r : 1, b.cv && VARS.child[b.cv] ? VARS.child[b.cv].r : 1, b.av ? VARS.adult[b.av].r : 1); }
function rollEgg(parent){
  if (parent && parent.egg && VARS.egg[parent.egg] && Math.random() < .35) return parent.egg;
  const boost = parent && bestRar(parent) >= 3 ? 2 : 1;
  return pickWeighted(Object.keys(VARS.egg).map(k => { const r = VARS.egg[k].r; return [k, RAR[r].w * (r >= 3 ? boost : 1)]; }));
}
function pickChildVar(s){
  const line = lineOf(s);
  if (line === 'pois') return s.childForm || 'morbidello';
  return lineChild(line) || s.childForm || 'morbidello';
}
function pickAdult(s){
  const line = lineOf(s), f = pickForm(s);
  if (FORMS[f] && FORMS[f].secret) return {form: f, av: null};
  if (line === 'pois') return {form: f, av: null};
  const av = lineAdult(line, s.childForm === 'saltello' ? 'play' : 'care');
  return av ? {form: VARS.adult[av].base, av} : {form: f, av: null};
}
function newBlob(name, parent){
  const now = Date.now();
  const b = {id: 'b' + now.toString(36) + rnd(100, 999), name: name || '', gen: parent ? (parent.gen || 1) + 1 : 1,
    parent: parent ? parent.id : null, parentName: parent ? parent.name : null,
    stage:'egg', form:null, childForm:null, egg: rollEgg(parent), bv:null, cv:null, av:null, shiny: Math.random() < (parent && parent.shiny ? 1/8 : 1/30),
    born:now, hatchAt: now + (parent ? 3*MIN : 40000), hatchedAt:null, adultAt:null, lastEgg:0, last:now,
    hunger:80, thirst:80, fun:70, energy:90, hygiene:100, health:100, trust:60,
    sick:false, sleeping:false, distrust:false, poopClock:0, riskClock:0,
    care:{}, traits: rollTraits(), known:{}, hat:null, face:null, neck:null, back:null, wish:null, nextWishAt: now + 3*MIN, walk:null,
    snacks:0, plays:0, cuddles:[], xp:0, level:1, tricksDone:0, walks:0,
    log:[{t:now, m: parent ? `${parent.name} ha deposto un uovo!` : `${name} è un uovo tiepido. Accarezzalo per scaldarlo!`}]};
  if (parent){ const pf = FORMS[parent.form]; if (pf && pf.seed) b.care[pf.seed] = 4; }
  return b;
}
function newWorld(){
  return {v:4, coins:20, inv:{mela:2, biscotto:1}, hats:[], furn:[], stickers:{}, daily:{last:'', streak:0},
    records:{memory:0, catch:0, hide:0, hoop:0}, wishesDone:0, missions:null, dayMood:null, hoops:0, chests:0, lastEv:null,
    dex:{}, rooms:[Object.assign(newRoom(0), {furnOn:['canestro','palla']})], blobs:[], valley:[], activeRoom:0, rugs:['rosa'], furn:['canestro','palla'], toys:1, dev:false};
}
function migrateBlob(b){
  const now = Date.now();
  const d = {id:'b1', gen:1, parent:null, form:null, childForm:null, shiny:false, adultAt:null, lastEgg:0, care:{}, known:{}, hat:null, face:null, neck:null, back:null,
    wish:null, nextWishAt: now + 3*MIN, walk:null, snacks:0, plays:0, cuddles:[], xp:0, level:1, tricksDone:0, walks:0, poopClock:0, riskClock:0};
  for (const k in d) if (b[k] === undefined) b[k] = d[k];
  if (!b.traits) b.traits = rollTraits();
  if (!b.form && b.branch) b.form = b.branch;
  if (b.stage === 'child' && !b.childForm) b.childForm = b.plays > 3 ? 'saltello' : 'morbidello';
  if (b.stage === 'adult' && !FORMS[b.form]) b.form = 'nuvola';
  if (b.stage === 'adult' && !b.adultAt) b.adultAt = now;
  if (!b.egg || !VARS.egg[b.egg]) b.egg = 'pois';
  if (b.stage !== 'egg' && !VARS.baby[b.bv]) b.bv = b.egg;
  if ((b.stage === 'child' || b.stage === 'adult') && !VARS.child[b.cv]) b.cv = b.childForm || (FORMS[b.form] && FORMS[b.form].fam) || 'morbidello';
  if (b.av === undefined) b.av = null;
  { const line = lineOf(b);
    if (b.stage === 'child' || b.stage === 'adult'){
      if (line === 'pois'){ if (!['morbidello','saltello'].includes(b.cv)) b.cv = b.childForm === 'saltello' ? 'saltello' : 'morbidello'; }
      else b.cv = lineChild(line) || b.cv;
      if (!b.childForm) b.childForm = (FORMS[b.form] && FORMS[b.form].fam) || 'morbidello';
    }
    if (b.stage === 'adult'){
      if (FORMS[b.form] && FORMS[b.form].secret){ b.av = null; }
      else if (line === 'pois'){ b.av = null; }
      else { const way = (FORMS[b.form] && FORMS[b.form].fam === 'saltello') || b.childForm === 'saltello' ? 'play' : 'care', av = lineAdult(line, way); if (av && b.av !== av){ b.av = av; b.form = VARS.adult[av].base; } }
    }
    if (b.av && !VARS.adult[b.av]) b.av = null;
  }
  if (b.wish && !b.wish.type) b.wish = null;
  return b;
}
function migrateWorld(x){
  if (!x) return null;
  if (!x.blobs){
    const old = x, w = newWorld();
    for (const k of GK) if (old[k] !== undefined) w[k] = old[k];
    const r = w.rooms[0];
    for (const k of RK) if (old[k] !== undefined) r[k] = old[k];
    r.theme = r.theme || 'rosa';
    const b = Object.assign({}, old);
    for (const k of GK) delete b[k];
    for (const k of RK) delete b[k];
    migrateBlob(b);
    w.blobs.push(b); r.blob = b.id;
    x = w;
  }
  const w0 = newWorld();
  for (const k in w0) if (x[k] === undefined && k !== 'toys') x[k] = w0[k];
  if (x.records.hoop === undefined) x.records.hoop = 0;
  for (const r of x.rooms) for (const k in RDEF) if (r[k] === undefined) r[k] = JSON.parse(JSON.stringify(RDEF[k]));
  if (!x.rugs) x.rugs = ['rosa'];
  if (!x.toys){
    x.toys = 1;
    for (const id of ['canestro','palla']){
      if (!x.furn.includes(id)) x.furn.push(id);
      if (!x.rooms.some(r => r.furnOn.includes(id))) (x.rooms[x.activeRoom || 0] || x.rooms[0]).furnOn.push(id);
    }
  }
  x.blobs.forEach(migrateBlob);
  x.valley = x.valley.filter(id => x.blobs.some(b => b.id === id));
  if (!x.bonds) x.bonds = {};
  for (const k of Object.keys(x.dex)) if (!k.includes(':')){ const nk = k === 'baby' ? 'baby:pois' : FORMS[k] && FORMS[k].child ? 'child:' + k : FORMS[k] ? 'adult:' + k : null; if (nk && !x.dex[nk]) x.dex[nk] = x.dex[k]; delete x.dex[k]; }
  syncDex(x);
  x.blobs.forEach(b => { const hi = x.rooms.findIndex(r => r.blob === b.id); if (x.valley.includes(b.id) || hi < 0) b.at = null; else if (b.at === undefined || b.at === null || !x.rooms[b.at]) b.at = hi; });
  x.v = 4;
  return x;
}
function syncDex(w, notify){
  let added = false;
  const mark = (k, sh) => { if (!w.dex[k]){ w.dex[k] = {t: Date.now(), shiny: !!sh}; added = true; } else if (sh && !w.dex[k].shiny){ w.dex[k].shiny = true; added = true; } };
  for (const b of w.blobs){
    mark('egg:' + (b.egg || 'pois'), false);
    if (b.stage !== 'egg' && b.bv) mark('baby:' + b.bv, b.shiny);
    if ((b.stage === 'child' || b.stage === 'adult') && b.cv) mark('child:' + b.cv, b.shiny);
    if (b.stage === 'adult' && b.form) mark('adult:' + (b.av || b.form), b.shiny);
  }
  if (added && notify) unseenStickers = true;
  return added;
}
function seeForm(f, b){
  if (!world.dex[f]){ world.dex[f] = {t: Date.now(), shiny: !!b.shiny}; unseenStickers = true; return true; }
  if (b.shiny && !world.dex[f].shiny){ world.dex[f].shiny = true; unseenStickers = true; return true; }
  return false;
}
function log(s, t, m){ s.log.unshift({t, m}); s.log.length = Math.min(s.log.length, 14); }
function core(s){ return (s.hunger + s.thirst + s.fun + s.energy + s.hygiene) / 5; }
function kindOf(s){ return s.stage === 'adult' ? s.form : s.stage === 'child' ? s.childForm : 'baby'; }
function varOf(b){
  if (!b) return null;
  if (b.stage === 'egg') return VARS.egg[b.egg] || VARS.egg.pois;
  if (b.stage === 'baby') return VARS.baby[b.bv] || VARS.baby.pois;
  if (b.stage === 'child') return VARS.child[b.cv] || VARS.child[b.childForm] || null;
  return b.av ? VARS.adult[b.av] || null : null;
}
function palFor(s){ if (s.shiny && s.stage !== 'egg') return SHINY; const V = varOf(s); return V && V.pal && s.stage !== 'egg' ? V.pal : (FORMS[kindOf(s)] || FORMS.baby).pal; }
function formName(b){ const V = varOf(b); return b.stage === 'egg' ? (V ? V.n : 'Uovo') : V ? V.n : (FORMS[kindOf(b)] || FORMS.baby).n; }
function rarOf(b){ const V = varOf(b); return V ? V.r : b.stage === 'adult' ? ADULT_R[b.form] || 1 : 1; }
const blobEmoji = b => { if (!b) return '·'; if (b.stage === 'egg') return '🥚'; const V = varOf(b); return V && V.e ? V.e : (FORMS[kindOf(b)] || FORMS.baby).e; };
const isForm = f => !!state && state.stage === 'adult' && state.form === f;
function giveSticker(s, id, t){
  if (s.stickers[id]) return false;
  s.stickers[id] = t || Date.now(); unseenStickers = true;
  log(s, t || Date.now(), `Nuova figurina: ${STICKERS[id].e} ${STICKERS[id].n}.`);
  return true;
}
function reveal(s, key){
  if (s.known[key]) return false;
  s.known[key] = true;
  if (['favFood','hateFood','favGame','favPlace'].every(k => s.known[k])) giveSticker(s, 'gusti');
  return true;
}
const learned = tr => !!state && LEVELS.slice(0, state.level).some(l => l.trick === tr);
const perk = p => !!state && LEVELS.slice(0, state.level).some(l => l.perk === p);

/* collegamenti da fare all'avvio: li chiama boot.js, quando tutti i moduli sono già caricati */
export function initState(){
  try { sound = localStorage.getItem(SOUND_KEY) !== 'off'; } catch {}
}

// gli altri moduli non possono riassegnare una variabile importata: la cambiano con questi
export function setWorld(v){ world = v; }
export function setState(v){ state = v; }
export function setShopSec(v){ shopSec = v; }
export function setUnseenStickers(v){ unseenStickers = v; }
export function setSound(v){ sound = v; }
export function setParticles(v){ particles = v; }

export {
  blobById, blobEmoji, core, drawFurnRoom, drawFurnV, fKey, formName, fvarOf, giveSticker, homeIdx,
  houseBlobs, isForm, kindOf, learned, log, migrateWorld, newBlob, newRoom, newWorld, nm, ownsF,
  palFor, particles, perk, pickAdult, pickChildVar, pickWeighted, placeF, presentIn, rarOf, reveal,
  roomWithF, seeForm, shopSec, sound, state, syncDex, unplaceF, unseenStickers, varOf, view, world
};
