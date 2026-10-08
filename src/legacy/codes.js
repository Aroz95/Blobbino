import { $, HOUR } from '../game/util.js';
import { blobById, state, world } from '../game/state.js';
import { layEgg } from '../game/house.js';
import { save } from '../game/save.js';
import { addCoins, rich, sfx, toast } from '../game/texts.js';
import { tick } from '../game/wishes.js';
import { closeSheet, openSheet, render } from './interface.js';
import { awake, burst, setEv } from '../room/scene.js';
import { startEvent } from '../room/events.js';

/* ================= codice segreto e strumenti di test ================= */
const DEV_HASH = '6a178f8b545406fca4557701ef1454adc6edd3dca62b722e1f7f693e8ed631b7';
/* codici regalo: una volta per casa, salvati solo come impronta */
const GIFT_CODES = {'d605375e0080210433d17d6a37f0d08c0ab017bd642daa11c9a7fed2b4609c86': 300};
async function sha256hex(txt){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function openCode(){
  if (rich()){
    openSheet('Modalità test', `<p class="shopnote" style="margin-bottom:10px">Stelline infinite attive: compri tutto gratis. Questi strumenti servono solo a te per provare il gioco.</p>
      <div class="rows">
        <div class="rowi"><div class="em">⏩</div><div><b>Fallo crescere subito</b><small>Uovo → cucciolo → piccolo → adulto</small></div><button class="btn small" data-dev="grow" type="button">Vai</button></div>
        <div class="rowi"><div class="em">🥚</div><div><b>Fagli deporre un uovo</b><small>Solo se è adulto</small></div><button class="btn small" data-dev="egg" type="button">Vai</button></div>
        <div class="rowi"><div class="em">🎉</div><div><b>Sorpresa adesso</b><small>Fa partire subito un evento</small></div><button class="btn small" data-dev="event" type="button">Vai</button></div>
        <div class="rowi"><div class="em">📅</div><div><b>Nuovo giorno</b><small>Regalo, umore e missioni nuove</small></div><button class="btn small" data-dev="day" type="button">Vai</button></div>
        <div class="rowi"><div class="em">💭</div><div><b>Desiderio adesso</b><small>Gli fa venire subito un desiderio</small></div><button class="btn small" data-dev="wish" type="button">Vai</button></div>
      </div>
      <div class="sheet-actions"><button class="btn ghost" data-dev="off" type="button">Esci dalla modalità test</button></div>`, b => b.addEventListener('click', e => {
      const t = e.target.closest('[data-dev]'); if (!t) return;
      const k = t.dataset.dev, raw = state && blobById(state.id), now = Date.now();
      if (k === 'off'){ world.dev = false; save(); closeSheet(); render(true); toast('Modalità test disattivata'); return; }
      if (k === 'day'){ world.daily.last = ''; world.missions = null; world.dayMood = null; closeSheet(); tick(); return; }
      if (!raw){ toast('Vai in una stanza con un blob.'); return; }
      if (k === 'grow'){
        if (raw.stage === 'egg') raw.hatchAt = now - 1000;
        else if (raw.stage === 'baby') raw.hatchedAt = now - 2*HOUR - 1000;
        else if (raw.stage === 'child') raw.hatchedAt = now - 12*HOUR - 1000;
        else { toast('È già adulto.'); return; }
        closeSheet(); tick();
      } else if (k === 'egg'){
        if (raw.stage !== 'adult'){ toast('Prima fallo diventare adulto.'); return; }
        closeSheet(); layEgg(raw); tick();
      } else if (k === 'event'){
        if (!awake()){ toast('Deve essere sveglio e in casa.'); return; }
        closeSheet(); setEv(null); startEvent();
      } else if (k === 'wish'){
        if (raw.stage === 'egg' || raw.sleeping || raw.walk){ toast('Deve essere sveglio e in casa.'); return; }
        raw.wish = null; raw.nextWishAt = 0; closeSheet(); tick();
      }
    }));
    return;
  }
  openSheet('Codice segreto', `<p class="shopnote" style="margin-bottom:10px">Se hai un codice segreto o un codice regalo, scrivilo qui.</p>
    <input id="devCode" class="code" style="min-height:0;height:46px;font-size:16px" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Codice">
    <p class="err" id="devErr"></p>
    <div class="sheet-actions"><button class="btn" id="devGo" type="button">Attiva</button></div>`, b => {
    const go = async () => {
      const v = $('devCode').value.trim().toUpperCase().replace(/[\s-]+/g, '');
      if (!v){ $('devErr').textContent = 'Scrivi prima il codice.'; return; }
      if (!window.crypto || !crypto.subtle){ $('devErr').textContent = 'Qui il codice non si può verificare. Prova dall\'app installata.'; return; }
      const hx = await sha256hex(v);
      if (GIFT_CODES[hx]){
        if (!world){ $('devErr').textContent = 'Prima dai un nome al tuo uovo.'; return; }
        world.redeemed = world.redeemed || [];
        if (world.redeemed.includes(hx)){ $('devErr').textContent = 'Hai già usato questo codice in questa casa.'; return; }
        world.redeemed.push(hx); addCoins(GIFT_CODES[hx]); save(); render(true); sfx.coin(); closeSheet();
        burst && state && burst('confetti', 30); toast(`🎁 Regalo! +${GIFT_CODES[hx]} stelline`, 3000); return;
      }
      if (hx !== DEV_HASH){ $('devErr').textContent = 'Codice non valido.'; return; }
      if (!world){ $('devErr').textContent = 'Prima dai un nome al tuo uovo.'; return; }
      world.dev = true; save(); render(true); sfx.level(); openCode(); toast('Modalità test attiva: stelline infinite!');
    };
    $('devGo').onclick = go;
    $('devCode').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    $('devCode').addEventListener('input', () => { $('devErr').textContent = ''; });
  });
}

/* collegamenti da fare all'avvio: li chiama boot.js, quando tutti i moduli sono già caricati */
export function initCodes(){
  $('codeBtn').addEventListener('click', openCode);
}
