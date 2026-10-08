import { $, MIN, pick } from './util.js';
import { core, formName, sound, world } from './state.js';
import { casaView } from './house.js';
import { tab } from '../legacy/interface.js';

/* ================= testi e feedback ================= */
let bubbleTimer = 0;
let toastTimer = 0;
function fmtDur(ms){
  const m = Math.max(0, Math.ceil(ms / MIN)), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mm = m % 60;
  if (d) return `${d}g ${h}h`; if (h) return `${h}h ${mm}m`; return `${mm} min`;
}
function dayKey(t){ const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
function stageName(s){
  if (!s) return 'Uovo';
  if (s.stage === 'egg') return 'Uovo';
  return formName(s) + (s.shiny ? ' dorato ✨' : '') + (s.gen > 1 ? ` · ${s.gen}ª gen.` : '');
}
function mood(s){
  if (!s || s.stage === 'egg') return {k:'egg', t:'nel guscio'};
  if (s.walk) return {k:'away', t:'in giro'};
  if (s.sleeping) return {k:'sleep', t:'dorme della grossa'};
  if (s.sick) return {k:'sick', t:'malaticcio'};
  if (s.trust < 35) return {k:'distrust', t:'diffidente'};
  const c = core(s);
  if (c < 35) return {k:'sad', t:'giù di morale'};
  if (s.energy < 25) return {k:'tired', t:'assonnato'};
  if (s.fun > 65 && c > 60) return {k:'happy', t:'felicissimo'};
  return {k:'ok', t:'tranquillo'};
}
function trustHint(s){
  if (!s || s.stage === 'egg') return 'Cresce con le coccole.';
  if (s.trust < 35) return 'Si tiene a distanza. Coccolalo con pazienza.';
  if (s.trust < 60) return 'Sta imparando a fidarsi.';
  if (s.trust < 85) return 'Ti vuole bene.';
  return 'Siete inseparabili.';
}
function say(msg, ms = 2600){
  if (tab !== 'casa' || casaView !== 'room' || !$('sheet').hidden || !$('gameOverlay').hidden || !$('walkOverlay').hidden) return toast(msg, ms);
  const b = $('bubble'); b.textContent = msg; b.classList.add('show');
  clearTimeout(bubbleTimer); bubbleTimer = setTimeout(() => b.classList.remove('show'), ms);
}
let lastChat = 0;
function chat(msg, p = .5){ const now = Date.now(); if (now - lastChat < 6000 || Math.random() > p) return; lastChat = now; say(msg, 2200); }
function toast(msg, ms = 2400){
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
const rich = () => !!(world && world.dev);
function addCoins(n){
  if (!world) return;
  if (n < 0 && rich()) return;
  world.coins += n;
  const c = $('coins'); c.classList.add('pop'); setTimeout(() => c.classList.remove('pop'), 220);
}
let audio = null;
function tone(f, d = .25, type = 'triangle', vol = .14, slide = 0){
  if (!sound) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator(), g = audio.createGain(), t0 = audio.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t0 + d);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + d);
    o.connect(g).connect(audio.destination); o.start(t0); o.stop(t0 + d + .02);
  } catch {}
}
const sfx = {
  boing: () => tone(260, .22, 'sine', .16, 2.2),
  pop: () => tone(900, .08, 'sine', .14, 1.8),
  chomp: () => { tone(180, .07, 'square', .06); setTimeout(() => tone(150, .07, 'square', .06), 110); },
  giggle: () => [0, 90, 180].forEach((d, i) => setTimeout(() => tone(700 + i*120, .07, 'triangle', .1), d)),
  purr: () => tone(70, .35, 'sawtooth', .035),
  coin: () => { tone(988, .08, 'square', .06); setTimeout(() => tone(1319, .14, 'square', .06), 80); },
  wee: () => tone(500, .35, 'sine', .1, 1.8),
  sad: () => tone(330, .4, 'triangle', .1, .6),
  level: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, .18, 'triangle', .12), i*110)),
  sneeze: () => { tone(500, .1, 'sawtooth', .05, 1.5); setTimeout(() => tone(200, .15, 'square', .08, .5), 260); },
  note: () => tone(pick([523, 587, 659, 784, 880]), .2, 'triangle', .08)
};

export { addCoins, chat, dayKey, fmtDur, mood, rich, say, sfx, stageName, toast, tone, trustHint };
