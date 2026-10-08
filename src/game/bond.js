import { LEVELS } from './catalog.js';
import { giveSticker, log, state } from './state.js';
import { saveSoon } from './save.js';
import { sfx } from './texts.js';
import { openSheet } from '../legacy/interface.js';
import { burst } from '../room/scene.js';

/* ================= amicizia ================= */
let xpBudget = 20, lastBudget = Date.now();
function gainXp(n, sv){
  const s = sv || state; if (!s || s.stage === 'egg' || n <= 0) return;
  s.xp += n;
  while (s.level < LEVELS.length && s.xp >= LEVELS[s.level].xp){
    s.level++;
    const L = LEVELS[s.level - 1];
    log(s, Date.now(), `Amicizia livello ${s.level}! ${L.t}.`);
    if (L.perk === 'aura') giveSticker(s, 'migliori');
    if (!sv || (state && sv.id === state.id)) levelUpQueue.push(s.level);
  }
  saveSoon();
}
function budgetXp(n){
  const now = Date.now();
  xpBudget = Math.min(20, xpBudget + (now - lastBudget) / 15000); lastBudget = now;
  if (xpBudget >= n){ xpBudget -= n; gainXp(n); }
}
let levelUpQueue = [];
function showLevelUp(lv){
  const L = LEVELS[lv - 1];
  sfx.level(); burst('confetti', 40);
  openSheet(`Amicizia livello ${lv}!`, `<div class="loot"><div class="big-em">${L.e}</div>
    <p style="text-align:center"><b>${L.t}</b></p><p class="story">${L.how}.</p></div>
    <div class="sheet-actions"><button class="btn" data-close type="button">Proviamo!</button></div>`);
}

export { budgetXp, gainXp, levelUpQueue, showLevelUp };
