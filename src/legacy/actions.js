import { SOUND_KEY } from '../config.js';
import { $, clamp, pick, reduced } from '../game/util.js';
import { FOODS, GAMES, LEVELS, PLACES } from '../game/catalog.js';
import {
  log, newBlob, newWorld, setParticles, setShopSec, setSound, setState, setWorld, sound, state,
  syncDex, world
} from '../game/state.js';
import { simulate } from '../game/evolution.js';
import { setRoom } from '../game/house.js';
import { autoBackup, save, setAllowEmptySave } from '../game/save.js';
import { say } from '../game/texts.js';
import { HINTS, closeSheet, openSheet, render, setTab, setTool } from './interface.js';
import { burst, pet, setEv, setExpr, setFloorFood } from '../room/scene.js';
import { openWalk } from '../walk/walk.js';
import { openGame } from '../minigames.js';

/* ================= azioni dei pulsanti ================= */
function ready(){
  const s = state;
  if (!s){ $('nameInput').focus(); return null; }
  simulate(s, Date.now());
  if (s.stage === 'egg'){ say('È ancora un uovo. Accarezzalo, manca poco!'); return null; }
  if (s.walk){ say(`${s.name} è ancora ${PLACES[s.walk.place].dove}.`); return null; }
  return s;
}
function openTricks(){
  const s = state, lv = s ? s.level : 1;
  const rows = LEVELS.map((L, i) => {
    const got = i < lv;
    return `<div class="rowi${got ? '' : ' lock'}"><div class="em">${got ? L.e : '🔒'}</div><div><b>${L.t}</b><small>${got ? L.how : `Livello ${i + 1} · ${L.xp} punti amicizia`}</small></div><span class="tag">Lv ${i + 1}</span></div>`;
  }).join('');
  openSheet('Trucchi e amicizia', `<p class="shopnote" style="margin-bottom:12px">I punti amicizia arrivano da coccole, giochi, pasti dati a mano, desideri esauditi, eventi e trucchi.</p><div class="rows">${rows}</div>`);
}
function openGames(){
  const s = state, w = s.wish;
  const rows = Object.keys(GAMES).map(id => {
    const G = GAMES[id], wished = w && w.type === 'game' && w.target === id;
    const tag = wished ? '<span class="tag">Desiderio</span>' : s.known.favGame && s.traits.favGame === id ? '<span class="tag">Preferito</span>' : '';
    return `<div class="rowi${wished ? ' hl' : ''}"><div class="em">${G.e}</div><div><b>${G.n}${tag}</b><small>${G.d} Record: ${s.records[id]} ${G.unit}</small></div><button class="btn small" data-game="${id}" type="button">Gioca</button></div>`;
  }).join('');
  openSheet('A cosa giochiamo?', `<div class="rows">${rows}</div>`, b => b.addEventListener('click', e => {
    const t = e.target.closest('[data-game]'); if (t){ closeSheet(); openGame(t.dataset.game); }
  }));
}
function askReset(){
  const w = $('resetWrap'), n = state ? state.name : 'il blob';
  w.innerHTML = '<span class="confirm"><span></span><button class="btn small" id="rsYes" type="button">Sì, ricomincia</button><button class="btn small ghost" id="rsNo" type="button">Annulla</button></span>';
  w.querySelector('.confirm span').textContent = `Cancellare tutta la casa e tutti i blob per sempre?`;
  const back = () => { w.innerHTML = '<button class="linkbtn" id="resetBtn" type="button">Ricomincia da capo</button>'; $('resetBtn').addEventListener('click', askReset); };
  $('rsNo').onclick = back;
  $('rsYes').onclick = () => { autoBackup('reset'); setAllowEmptySave(true); setWorld(null); setState(null); setParticles([]); setFloorFood([]); setEv(null); save(); render(true); back(); $('nameInput').value = ''; window.scrollTo(0, 0); };
}

/* collegamenti da fare all'avvio: li chiama boot.js, quando tutti i moduli sono già caricati */
export function initActions(){
  $('tools').addEventListener('click', e => {
    const b = e.target.closest('.tool'); if (!b) return;
    if (b.dataset.t){ setTool(b.dataset.t); if (b.dataset.t !== 'hand' && state && state.stage !== 'egg') say(HINTS[b.dataset.t], 2000); return; }
    const a = b.dataset.a;
    if (a === 'tricks'){ openTricks(); return; }
    const s = ready(); if (!s) return;
    if (a === 'light'){
      if (s.sleeping){
        s.sleeping = false; pet.beh = null;
        if (s.energy < 40){ s.trust = clamp(s.trust - 2); say('Brontola: aveva ancora sonno.'); } else say('Buongiorno!');
      } else {
        if (s.energy > 85){ say(`${s.name} non ha sonno per niente!`); return; }
        s.sleeping = true; log(s, Date.now(), `Hai messo ${s.name} a nanna.`); say('Buonanotte…');
      }
    } else if (s.sleeping){ say(`Shh… ${s.name} sta dormendo.`); return; }
    else if (a === 'medicine'){
      if (!s.sick){ say(`${s.name} sta benissimo, niente medicine!`); return; }
      s.sick = false; s.riskClock = 0; s.health = clamp(s.health + 15); s.fun = clamp(s.fun - 5);
      log(s, Date.now(), `${s.name} ha preso la medicina e sta guarendo.`); burst('sparkle', 8); setExpr('yuck', 1.2); say('Bleah… ma va già meglio!');
    } else if (a === 'play'){ openGames(); return; }
    else if (a === 'walk'){ openWalk(); return; }
    save(); render(true);
  });
  $('wishBtn').addEventListener('click', () => {
    const s = state, w = s && s.wish; if (!w) return;
    const go = (t, msg) => { setTool(t); window.scrollTo({top:0, behavior: reduced ? 'auto' : 'smooth'}); say(msg, 3000); };
    if (w.type === 'food') go('food', `Trascina ${FOODS[w.target].e} fino alla sua bocca. ${s.inv[w.target] ? '' : 'Prima compralo nel negozio!'}`);
    else if (w.type === 'cuddle') go('hand', 'Strofina il dito sul blob per coccolarlo.');
    else if (w.type === 'ball') go('hand', 'Lancia la palla: trascinala e lasciala andare.');
    else if (w.type === 'throw') go('hand', 'Tienilo premuto, poi lancialo verso l\'alto!');
    else if (w.type === 'trick') go('hand', LEVELS.find(l => l.trick === w.target).how + '.');
    else if (w.type === 'bath') go('sponge', 'Strofina la spugna sul blob finché è pulitissimo.');
    else if (w.type === 'hoop') go('hand', 'Trascina la palla e lanciala nel canestro!');
    else if (w.type === 'dunk') go('hand', 'Tienilo premuto e lancialo dentro il canestro!');
    else if (w.type === 'tickle') go('hand', 'Strofina veloce sul blob per fargli il solletico.');
    else if (w.type === 'game') openGames();
    else if (w.type === 'walk') openWalk();
    else if (w.type === 'hat'){ setShopSec('acc'); setTab('negozio'); }
  });
  $('namer').addEventListener('submit', e => {
    e.preventDefault();
    const n = ($('nameInput').value.trim() || pick(['Mochi','Bloppo','Pallotto','Gommina','Budy','Fiocco'])).slice(0, 14);
    $('nameInput').value = '';
    if (!world){
      setWorld(newWorld()); const b = newBlob(n); b.at = 0; world.blobs.push(b); world.rooms[0].blob = b.id; syncDex(world);
      setRoom(0); save(); say(`Ciao ${n}! Accarezzalo per scaldarlo…`);
    } else if (state && !state.name){
      state.name = n; log(state, Date.now(), `Si chiama ${n}!`); save(); render(true); say(`Ciao ${n}!`);
    }
  });
  $('resetBtn').addEventListener('click', askReset);
  $('soundBtn').addEventListener('click', () => {
    setSound(!sound); $('soundBtn').textContent = `Suoni: ${sound ? 'sì' : 'no'}`;
    try { localStorage.setItem(SOUND_KEY, sound ? 'on' : 'off'); } catch {}
  });
  $('soundBtn').textContent = `Suoni: ${sound ? 'sì' : 'no'}`;
}

export { ready };
