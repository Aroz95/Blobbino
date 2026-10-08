import { HOUR, MIN, clamp } from './util.js';
import { FORMS, RAR, STATS, VARS } from './blobs.js';
import { STICKERS } from './catalog.js';
import { core, formName, giveSticker, log, nm, pickAdult, pickChildVar, seeForm, state } from './state.js';
import { say } from './texts.js';
import { setHatchFx } from './wishes.js';

/* evoluzione: le scelte di gioco decidono la forma */
/* corporatura: magro se ha fame, obeso se mangia oltre il pieno */
const BODY = {magro:{n:'Magro', e:'🦴', tip:'Ha fame: dagli da mangiare'}, normale:{n:'Normale', e:'💪', tip:'In forma'}, obeso:{n:'Obeso', e:'🍩', tip:'Ha mangiato troppo: fallo giocare per farlo dimagrire'}};
function bodyOf(b){ if (!b || b.stage === 'egg') return 'normale'; if ((b.fat || 0) >= 20) return 'obeso'; if (b.hunger < 50) return 'magro'; return 'normale'; }
function bodyShape(b){
  if (!b || b.stage === 'egg') return {x:1, y:1};
  const f = Math.min(1, (b.fat || 0) / 80);
  if (f > 0) return {x: 1 + .34*f, y: 1 - .05*f};
  const k = Math.max(0, Math.min(1, (50 - (b.hunger ?? 100)) / 40));
  return {x: 1 - .26*k, y: 1 + .05*k};
}
function burnFat(s, n){ if (s && s.fat > 0){ const was = bodyOf(s); s.fat = Math.max(0, s.fat - n); if (was === 'obeso' && bodyOf(s) !== 'obeso'){ log(s, Date.now(), `${nm(s)} è tornato in forma!`); if (state && s.id === state.id) say(`${nm(s)} è tornato in forma! 💪`, 2200); } } }
function note(k, n = 1){
  if (state && ['throw','ball','game','walk','trick','tickle'].includes(k)) burnFat(state, (k === 'walk' ? 8 : k === 'game' ? 4 : 1.5) * n);
  const s = state; if (!s || s.stage === 'egg' || s.stage === 'adult') return;
  s.care[k] = (s.care[k] || 0) + n;
  const h = new Date().getHours(); if (h >= 21 || h < 6) s.care.night = (s.care.night || 0) + n * .5;
}
function pickChild(s){
  const c = s.care, g = k => c[k] || 0;
  const play = g('throw') * 2 + g('ball') + g('game') * 3 + g('walk') + g('trick') * 1.5;
  const cu = g('pet') * .35 + g('feed') * 2 + g('clean') + g('tickle') * .3 + g('sweet') * 2 + g('healthy') * 2;
  return play > cu ? 'saltello' : 'morbidello';
}
function formScores(s){
  const c = s.care, g = k => c[k] || 0;
  if (g('neglect') > 15 && s.trust < 45) return {[g('night') > 8 ? 'ombra' : 'muschio']: 1};
  if (s.childForm === 'saltello') return {stellino: g('game') * 2 + 1, razzo: g('throw') * 1.5, pallino: g('ball') * .9, esploratore: g('walk') * 2, saltimbanco: g('trick') * 1.4};
  return {nuvola: g('pet') * .3 + 1, budino: g('sweet') * 3, bocciolo: g('healthy') * 2.5 + g('clean') * .8, gelatina: g('tickle') * .35, lumino: g('night') * .35};
}
function pickForm(s){ const sc = formScores(s); return Object.keys(sc).reduce((a, b) => sc[b] > sc[a] ? b : a); }
function trendOf(s){
  if (s.stage === 'baby') return pickChild(s) === 'saltello' ? 'giocherellona' : 'coccolona';
  if (s.stage === 'child'){ const A = pickAdult(s); return A.av ? `verso ${VARS.adult[A.av].n}` : FORMS[A.form].trend; }
  return '';
}

function simulate(s, to){
  let ev = false;
  if (s.stage === 'egg'){
    if (to < s.hatchAt){ s.last = to; return false; }
    s.stage = 'baby'; s.hatchedAt = s.hatchAt; s.last = s.hatchAt;
    log(s, s.hatchAt, `Crack! L'uovo si è schiuso: benvenuto ${nm(s)}!`);
    s.bv = VARS.baby[s.egg] ? s.egg : 'pois';
    giveSticker(s, 'schiusa', s.hatchAt); seeForm('baby:' + s.bv, s); ev = true;
    if (VARS.baby[s.bv].r >= 3) log(s, s.hatchAt, `È un ${VARS.baby[s.bv].n}: ${RAR[VARS.baby[s.bv].r].n.toLowerCase()}!`);
    if (state && s.id === state.id) setHatchFx(1);
  }
  let t = s.last;
  if (to - t > 14*24*HOUR) t = to - 14*24*HOUR;
  const dk = s.stage === 'adult' && s.form === 'muschio' ? .65 : 1, hk = s.stage === 'adult' && s.form === 'bocciolo' ? .6 : 1;
  while (t < to){
    const ms = Math.min(10*MIN, to - t), h = ms / HOUR; t += ms;
    const away = s.walk && !s.walk.back;
    if (away){
      s.hunger -= 6*h*dk; s.thirst -= 9*h*dk; s.fun += 4*h; s.energy -= 8*h; s.hygiene -= 4*h*hk;
      if (t >= s.walk.end){ s.walk.back = true; ev = true; }
    } else {
      const sl = s.sleeping, k = (sl ? .45 : 1) * dk;
      s.hunger -= 6*h*k; s.thirst -= 8*h*k;
      s.fun -= (s.sick ? 9 : 5.5) * h * (sl ? .3 : 1) * dk;
      s.energy += sl ? 14*h*(s.furnOn.includes('letto') ? 1.35 : 1) : -4.5*h;
      s.hygiene -= (3.5 + 4*s.poops + 1.5*s.messes.length) * h * hk;
      s.poopClock += h * (sl ? .4 : 1);
      if (s.poopClock >= 3.5){ s.poopClock -= 3.5; if (s.poops < 3){ s.poops++; ev = true; } }
    }
    if (s.fat > 0){ s.fat = Math.max(0, s.fat - 3*h); if (s.hunger < 55){ const m = Math.min(s.fat, 55 - s.hunger); s.hunger += m*.8; s.fat -= m; } }
    for (const [key] of STATS) if (key !== 'health') s[key] = clamp(s[key]);
    const c = core(s);
    if (s.sick) s.health -= 4*h; else if (c > 45) s.health += 3*h;
    s.health = Math.max(5, clamp(s.health));
    const risky = s.hygiene < 25 || s.poops >= 3 || (s.hunger < 15 && s.thirst < 15) || s.health < 30;
    s.riskClock = risky ? s.riskClock + h : Math.max(0, s.riskClock - h);
    if (!s.sick && s.riskClock >= 1){ s.sick = true; s.riskClock = 0; s.care.neglect = (s.care.neglect || 0) + 4; log(s, t, `${nm(s)} si è ammalato. Serve una medicina.`); ev = true; }
    if (c < 30) s.trust -= 4*h; else if (c < 45) s.trust -= 1.5*h; else if (c > 65) s.trust += .6*h;
    if (c < 35 && s.stage !== 'adult') s.care.neglect = (s.care.neglect || 0) + 3*h;
    s.trust = clamp(s.trust);
    if (!s.distrust && s.trust < 35){ s.distrust = true; log(s, t, `${nm(s)} si sente trascurato e non si fida più tanto.`); ev = true; }
    if (s.distrust && s.trust >= 50){ s.distrust = false; log(s, t, `${nm(s)} si fida di nuovo di te.`); ev = true; }
    if (!away){
      if (!s.sleeping && s.energy < 12){ s.sleeping = true; log(s, t, `${nm(s)} è crollato dal sonno.`); ev = true; }
      if (s.sleeping && s.energy >= 100){ s.sleeping = false; log(s, t, `${nm(s)} si è svegliato riposato.`); ev = true; }
    }
    const age = (t - s.hatchedAt) / HOUR;
    if (s.stage === 'baby' && age >= 2){
      s.stage = 'child'; s.childForm = pickChild(s); s.cv = pickChildVar(s); seeForm('child:' + s.cv, s);
      log(s, t, `${nm(s)} è cresciuto: è diventato un ${formName(s)}!`); ev = true; evoQueue.push(s.id);
    }
    if (s.stage === 'child' && age >= 12){
      s.stage = 'adult'; { const A = pickAdult(s); s.form = A.form; s.av = A.av; } s.adultAt = t; const F = FORMS[s.form];
      seeForm('adult:' + (s.av || s.form), s);
      if (STICKERS['evo_' + s.form]) giveSticker(s, 'evo_' + s.form, t);
      log(s, t, `${nm(s)} si è evoluto in ${formName(s)}${s.shiny ? ' dorato' : ''}! ${F.ab}`); ev = true; evoQueue.push(s.id);
    }
  }
  s.last = to;
  return ev;
}
let evoQueue = [], eggNotice = null;

// gli altri moduli non possono riassegnare una variabile importata: la cambiano con questi
export function setEvoQueue(v){ evoQueue = v; }
export function setEggNotice(v){ eggNotice = v; }

export { BODY, bodyOf, bodyShape, eggNotice, evoQueue, note, pickForm, simulate, trendOf };
