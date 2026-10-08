import { esc } from '../game/util.js';
import { FORMS, LINES, RAR, VARS, dexInfo, lineAdult, lineChild, rarStars, specOf } from '../game/blobs.js';
import { world } from '../game/state.js';
import { BODY } from '../game/evolution.js';
import { openSheet } from './interface.js';
import { drawSpecimen } from '../places/house-view.js';

/* ================= album =================
   La scheda la disegna React (src/ui/Album.jsx); qui resta il dettaglio che si apre toccando un blob. */
function dexHow(st, k){
  const way = w => w === 'play' ? 'giochi tanto con lui (lanci, palla, minigiochi, passeggiate)' : 'te ne prendi cura (carezze, pappa a mano, pulizia)';
  if (st === 'egg'){ const V = VARS.egg[k], L = LINES[k]; return `Linea ${L.e} ${L.n}. ` + (V.r >= 3 ? 'Un uovo raro: capita più spesso a chi ha genitori rari.' : V.r === 2 ? 'Un uovo non comunissimo.' : 'Un uovo comune.') + ' Le uova spesso somigliano a quelle dei genitori.'; }
  if (st === 'baby'){ const L = LINES[k]; return `Linea ${L.e} ${L.n}: nasce da un ${VARS.egg[k].n.toLowerCase()}.`; }
  if (st === 'child'){ const V = VARS.child[k], L = LINES[V.line];
    if (V.line === 'pois') return `Linea ${L.e} ${L.n}: il Cucciolo diventa ${V.n} se ${way(V.fam === 'saltello' ? 'play' : 'care')}.`;
    const A = lineAdult(V.line, 'care'), B = lineAdult(V.line, 'play');
    return `Linea ${L.e} ${L.n}: cresce da ${VARS.baby[V.line].n}. Da grande diventa ${VARS.adult[A].n} oppure ${VARS.adult[B].n}.`; }
  if (FORMS[k]){ const F = FORMS[k]; return F.secret ? 'Una forma segreta di qualsiasi linea. Si dice che nasca quando un piccolo viene trascurato…' : `Linea 🐣 Classica: nasce da un ${FORMS[F.fam].n} cresciuto con: ${F.hint.toLowerCase()}.`; }
  const V = VARS.adult[k], L = LINES[V.line];
  return `Linea ${L.e} ${L.n}: ${VARS.child[lineChild(V.line)].n} diventa ${V.n} se ${way(V.way)}. Abilità di ${FORMS[V.base].n}.`;
}
function openDexDetail(st, k){
  const I = dexInfo(st, k), got = world && world.dex[st + ':' + k];
  const F = st === 'adult' ? FORMS[FORMS[k] ? k : VARS.adult[k].base] : null;
  const ab = st === 'adult' ? F.ab : st === 'child' ? (VARS.child[k].fam ? FORMS[VARS.child[k].fam].ab : `Un piccolo della linea ${LINES[VARS.child[k].line].e} ${LINES[VARS.child[k].line].n}: coccole o gioco decideranno come cresce.`) : st === 'baby' ? 'Appena nato, tutto da scoprire.' : '';
  openSheet(got ? I.n : '???', `<div class="loot"><canvas class="dexbig" id="dexBig" aria-label="${got ? esc(I.n) : 'Non ancora scoperto'}"></canvas>
    <p class="rarline" style="color:${RAR[I.r].c}">${rarStars(I.r)} ${RAR[I.r].n}</p>
    ${got && ab ? `<p class="story">${ab}</p>` : ''}${got && st !== 'egg' ? `<div class="bodies">${['magro','normale','obeso'].map(bk => `<figure><canvas data-body="${bk}" aria-label="${BODY[bk].n}"></canvas><figcaption>${BODY[bk].n}</figcaption></figure>`).join('')}</div>` : ''}<p class="shopnote">${dexHow(st, k)}</p>
    ${st !== 'egg' ? (got && got.shiny ? '<p class="shopnote">✨ Hai trovato anche la versione dorata!</p>' : got ? '<p class="shopnote">Esiste anche una rarissima versione dorata.</p>' : '') : ''}
    ${got ? `<p class="shopnote">Scoperto il ${new Date(got.t).toLocaleDateString('it-IT')}.</p>` : ''}</div>
    <div class="sheet-actions"><button class="btn" data-close type="button">Chiudi</button></div>`, body => requestAnimationFrame(() => { const b = specOf(st, k); if (got && got.shiny && st !== 'egg') b.shiny = true; drawSpecimen(body.querySelector('#dexBig'), b, !got);
      body.querySelectorAll('[data-body]').forEach(c => { const v = Object.assign({}, b, c.dataset.body === 'magro' ? {hunger: 10} : c.dataset.body === 'obeso' ? {fat: 90} : {}); drawSpecimen(c, v, false); }); }));
}

export { openDexDetail };
