import { $, clamp, lim, pick } from '../game/util.js';
import { FOODS, FREE } from '../game/catalog.js';
import { isForm, log, particles, reveal, setShopSec, state } from '../game/state.js';
import { bodyOf, note } from '../game/evolution.js';
import { save, saveSoon } from '../game/save.js';
import { chat, say, sfx, toast } from '../game/texts.js';
import { gainXp } from '../game/bond.js';
import { fulfill, mission } from '../game/wishes.js';
import { render, setTab, setTrayKey } from '../legacy/interface.js';
import {
  H, R, W, awake, burst, cv, dragFood, floorFood, mouthPos, pet, returnFood, setDragFood, setExpr,
  setLastTouch, squish
} from './scene.js';

/* ---------- cibo trascinato ---------- */
/* vassoio: scorri di lato per vedere i cibi, trascina verso l'alto per darne uno */
let pendingFood = null;
function dropFood(){
  if (!dragFood) return;
  const f = dragFood; setDragFood(null); setTrayKey('');
  const s = state;
  if (!s || f.y > H + 10 || f.x < -10 || f.x > W + 10 || f.y < -10){ if (f.paid) returnFood(f); render(); return; }
  const id = f.id, F = FOODS[id];
  if (!FREE.includes(id) && !f.paid){ if (!s.inv[id]) { render(); return; } s.inv[id]--; }
  const m = mouthPos();
  if (Math.hypot(f.x - m.x, f.y - m.y) < R * .8 && awake()) eat(id, true, f.x, f.y);
  else if (F.drink){ burst('drop', 8, f.x, f.y); if (s.inv[id] !== undefined) {} }
  else floorFood.push({id, x: lim(f.x, 20, W - 20), y: f.y, vy: 0, t: Date.now()});
  save(); render();
}

function eat(id, byHand, fx, fy){
  const s = state, F = FOODS[id], n = s.name;
  if (F.drink){
    if (s.thirst >= 96){ say('Non ha sete adesso.'); return false; }
    s.thirst = clamp(s.thirst + F.thirst); s.trust = clamp(s.trust + 1);
    pet.anim = {type:'eat', t:0, dur:.7}; burst('drop', 8); sfx.chomp(); say('Glu glu glu!', 1400);
    if (byHand) gainXp(1);
    return true;
  }
  if (s.hunger >= 97){
    if ((s.fat || 0) >= 100 || id === s.traits.hateFood){
      say((s.fat || 0) >= 100 ? 'Non ce la fa proprio più!' : 'Ha la pancia piena!'); setExpr('yuck', 1.2);
      if (byHand) floorFood.push({id, x: fx, y: fy, vy: 0, t: Date.now()});
      return false;
    }
    const was = bodyOf(s);
    pet.anim = {type:'eat', t:0, dur:.9}; sfx.chomp();
    s.fat = Math.min(100, (s.fat || 0) + F.hunger * .7 + (F.sweet ? 6 : 0)); s.fun = clamp(s.fun + F.fun * .5);
    squish(.25);
    if (was !== 'obeso' && bodyOf(s) === 'obeso'){ log(s, Date.now(), `${n} ha mangiato troppo ed è diventato obeso.`); say(`Troppo cibo! ${n} sta diventando obeso 🍩`, 2600); }
    else say(pick(['Era già pieno… ma che buono!', 'Burp! Ancora?', 'Un altro boccone… solo uno!', 'Pancia piena piena!']), 1600);
    saveSoon(); return true;
  }
  if (byHand && s.trust < 35 && Math.random() < .4){
    say(`${n} ti guarda di sbieco e non mangia dalla tua mano.`); setExpr('shy', 1.5);
    floorFood.push({id, x: fx, y: fy, vy: 0, t: Date.now()});
    return false;
  }
  pet.anim = {type:'eat', t:0, dur:.9}; sfx.chomp();
  mission('newFood', 1, id);
  if (id === s.traits.hateFood){
    const first = reveal(s, 'hateFood');
    s.hunger = clamp(s.hunger + 4); s.fun = clamp(s.fun - 8); setExpr('yuck', 1.8); sfx.sad();
    particles.push({type:'food', e:F.e, x:pet.x, y:pet.y, vx:(Math.random() < .5 ? -1 : 1) * 260, vy:-380, life:1.4, age:0, s:R * .4});
    say(first ? `Bleah! Hai scoperto che ${n} odia ${F.n.toLowerCase()}.` : `Bleah! Lo sapevi che odia ${F.n.toLowerCase()}…`, 3000);
    if (first) log(s, Date.now(), `Scoperto: ${n} odia ${F.n.toLowerCase()} ${F.e}.`);
    return true;
  }
  s.hunger = clamp(s.hunger + F.hunger); s.fun = clamp(s.fun + F.fun);
  s.health = clamp(s.health + (F.health || 0)); s.thirst = clamp(s.thirst + (F.thirst || 0)); s.trust = clamp(s.trust + 1);
  if (F.sweet){ s.snacks++; note('sweet'); if (isForm('budino')) s.fun = clamp(s.fun + F.fun * .5); }
  if (byHand){ gainXp(id === 'pappa' ? 1 : 3); mission('feedHand'); note('feed'); }
  if (['mela','carota','zuppa'].includes(id)) note('healthy');
  if (id === s.traits.favFood){
    const first = reveal(s, 'favFood');
    s.fun = clamp(s.fun + 15); s.trust = clamp(s.trust + 3); burst('heart', 12); setExpr('happy', 2);
    pet.vy = -H * .9; pet.ground = false;
    say(first ? `Che festa! Hai scoperto il suo cibo preferito: ${F.n.toLowerCase()}!` : `${F.e} Il suo preferito! Gnam!`, 3000);
    if (first) log(s, Date.now(), `Scoperto: il cibo preferito di ${n} è ${F.n.toLowerCase()} ${F.e}.`);
  } else { burst('crumb', 10); chat(pick(['Gnam gnam!','Buono!','Slurp!']), .9); }
  fulfill('food', id);
  return true;
}

/* collegamenti da fare all'avvio: li chiama boot.js, quando tutti i moduli sono già caricati */
export function initFood(){
  $('tray').addEventListener('click', e => { const b = e.target.closest('[data-more]'); if (b){ setShopSec('food'); setTab('negozio'); } });
  $('tray').addEventListener('pointerdown', e => {
    const b = e.target.closest('.fchip'); if (!b || !state || b.hasAttribute('data-more')) return;
    pendingFood = {id: b.dataset.f, x0: e.clientX, y0: e.clientY, t: Date.now(), el: b};
  });
  $('tray').addEventListener('pointerup', () => {
    if (pendingFood && !dragFood && Date.now() - pendingFood.t < 400) toast('Trascina il cibo verso la bocca del blob', 1600);
    pendingFood = null;
  });
  document.addEventListener('pointermove', e => {
    if (pendingFood && !dragFood){
      const dx = e.clientX - pendingFood.x0, dy = e.clientY - pendingFood.y0;
      if (dy < -8 && -dy >= Math.abs(dx) * .7){
        const r = cv.getBoundingClientRect();
        setDragFood({id: pendingFood.id, x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height});
        pendingFood = null; setLastTouch(Date.now());
        try { e.target.releasePointerCapture && e.target.releasePointerCapture(e.pointerId); } catch {}
      } else if (Math.abs(dx) > 12 && Math.abs(dx) > -dy * 1.4) pendingFood = null;   // scorrimento di lato: ci pensa il browser
      return;
    }
    if (!dragFood) return;
    const r = cv.getBoundingClientRect();
    dragFood.x = (e.clientX - r.left) * W / r.width; dragFood.y = (e.clientY - r.top) * H / r.height;
  });
  document.addEventListener('pointerup', dropFood);
  document.addEventListener('pointercancel', () => { pendingFood = null; if (!dragFood) return; if (dragFood.paid) returnFood(dragFood); setDragFood(null); setTrayKey(''); render(); });
}

export { eat };
