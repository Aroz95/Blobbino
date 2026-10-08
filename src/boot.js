import { APP_VERSION, KEY, esc } from './game/util.js';
import { LINES, VARS, dexList, lineAdult, lineChild, specOf } from './game/blobs.js';
import { FURN } from './game/catalog.js';
import {
  blobById, drawFurnV, formName, initState, migrateWorld, setState, setWorld, state, world
} from './game/state.js';
import { simulate } from './game/evolution.js';
import { casaView, initHouse, moveBlob, setRoom, showHouse, visits } from './game/house.js';
import {
  adopt, autoBackup, initRemote, makeBackup, readBackups, readLocal, save, setSaveLocked
} from './game/save.js';
import { toast } from './game/texts.js';
import { ensureDay, tick } from './game/wishes.js';
import { initInterface, openSheet, render } from './legacy/interface.js';
import { initShop } from './legacy/shop.js';
import { initActions } from './legacy/actions.js';
import { initCodes } from './legacy/codes.js';
import { decodeSave, initTransfer } from './legacy/transfer.js';
import { H, W, ball, ev, floorFood, pet, readTokens, setEv } from './room/scene.js';
import { initPointer } from './room/pointer.js';
import { initFood } from './room/food.js';
import { startEvent } from './room/events.js';
import { fName } from './draw/furniture.js';
import { focusBlob, guests } from './room/guests.js';
import { initWalk, walk } from './walk/walk.js';
import { drawSpecimen } from './places/house-view.js';
import { HOOP } from './room/hoop.js';
import { frame } from './room/loop.js';
import { initMinigames } from './minigames.js';

/* ================= avvio ================= */
// prima i collegamenti di ogni parte (pulsanti, tocchi, eventi), nell'ordine del vecchio file unico
initState();
initHouse();
initInterface();
initShop();
initActions();
initCodes();
initTransfer();
initPointer();
initFood();
initWalk();
initMinigames();
readTokens();
const mq = matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener && mq.addEventListener('change', readTokens);
new MutationObserver(readTokens).observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
(function safeStart(){
  const rec = readLocal();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch {}
  // copia prima di ogni aggiornamento dell'app (le migrazioni toccano i dati)
  if (rec && rec.state && rec.ver !== APP_VERSION) makeBackup(rec.state, 'update');
  let raw = null; try { raw = localStorage.getItem(KEY); } catch {}
  if (!(raw && !rec)){
    try { adopt(rec); if (world) autoBackup(); return; }
    catch (e){ console.error('Salvataggio illeggibile', e); }
  }
  if (!raw && !readBackups().length){ adopt(null); return; }
  for (const b of readBackups()){ try { adopt({state: JSON.parse(JSON.stringify(b.state))}); if (world){ save(); setTimeout(() => toast('Il salvataggio era rovinato: ho ripristinato la copia di sicurezza del ' + new Date(b.t).toLocaleString('it-IT'), 5000), 800); return; } } catch {} }
  setSaveLocked(true); setWorld(null); setState(null);
  setTimeout(() => openSheet('Problema col salvataggio', `<p class="story">Non riesco a leggere la tua casa. Non ho cancellato niente: i dati sono ancora sul telefono.</p><p class="shopnote">Copia questo testo e mandalo a chi ti aiuta con l'app, così si può recuperare.</p><textarea class="code" readonly>${esc(localStorage.getItem(KEY) || '')}</textarea><div class="sheet-actions"><button class="btn" data-close type="button">Ok</button></div>`), 500);
})();
if (!state) render(true);
requestAnimationFrame(frame);
setInterval(tick, 1000);
setTimeout(tick, 600);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); else if (state) save(); });
window.addEventListener('pagehide', () => { if (state) save(); });
/* niente zoom su iPhone: né doppio tocco né pizzico */
document.addEventListener('gesturestart', e => e.preventDefault(), {passive: false});
document.addEventListener('dblclick', e => e.preventDefault(), {passive: false});
{ let lastEnd = 0; document.addEventListener('touchend', e => { const now = Date.now(); if (now - lastEnd < 320 && !e.target.closest('button,a,label,input,textarea,select,canvas,[data-k],[role="button"]')) e.preventDefault(); lastEnd = now; }, {passive: false}); }
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http') && !window.claude) window.addEventListener('load', () => {
  const hadCtrl = !!navigator.serviceWorker.controller; let reloaded = false;
  navigator.serviceWorker.register('./sw.js', {updateViaCache: 'none'}).then(reg => {
    const check = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    setInterval(check, 30 * 60e3);
  }).catch(() => {});
  // quando arriva una versione nuova, ricarica da sola (una volta)
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadCtrl || reloaded) return; reloaded = true; try { save(); } catch {} location.reload(); });
});
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}
if (location.hash === '#debug') window.__bb = {ev: t => { setEv(null); startEvent(t); }, get e(){ return ev; }, pet, ball, hoop: () => HOOP(), get W(){ return W; }, get H(){ return H; }, get s(){ return state; }, get world(){ return world; }, ensureDay, setRoom, tick, raw: () => state && blobById(state.id), render: () => render(true), get guests(){ return guests; }, visits, moveBlob, showHouse, focusBlob, get casaView(){ return casaView; }, get ff(){ return floorFood; }, get walk(){ return walk; }};
if (location.hash === '#debug') window.__bbx = {drawFurnV, FURN, fName, LINES, VARS, drawSpecimen, specOf, lineChild, lineAdult, simulate, formName, decodeSave, migrateWorld, dexList, setWorld: w => { setWorld(w); }};
initRemote();
