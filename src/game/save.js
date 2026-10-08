import { BACKUP_KEY } from '../config.js';
import { $, APP_VERSION, HOUR, KEY, MIN } from './util.js';
import { blobById, houseBlobs, migrateWorld, setState, setWorld, state, view, world } from './state.js';
import { simulate } from './evolution.js';
import { setCasaView, setRoom } from './house.js';
import { toast } from './texts.js';
import { setWelcome } from './wishes.js';
import { render } from '../legacy/interface.js';

/* ================= salvataggio ================= */
let db = null, uid = null, writing = false, again = null, saveT = 0;
function readLocal(){ try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }
/* salvataggi: mai sovrascrivere una casa con il vuoto, copie di sicurezza a rotazione */
const BAK_KEY = BACKUP_KEY, BAK_MAX = 6;
let saveLocked = false, allowEmptySave = false;
function readBackups(){ try { const a = JSON.parse(localStorage.getItem(BAK_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } }
function writeBackups(a){ for (let n = a.length; n > 0; n--){ try { localStorage.setItem(BAK_KEY, JSON.stringify(a.slice(0, n))); return true; } catch {} } return false; }
function makeBackup(stateObj, why){
  if (!stateObj || !stateObj.blobs || !stateObj.blobs.length) return;
  const a = readBackups(), now = Date.now();
  a.unshift({t: now, why, ver: typeof APP_VERSION === 'number' ? APP_VERSION : 0, n: stateObj.blobs.length, names: stateObj.blobs.slice(0, 4).map(b => b.name || 'Uovo'), state: stateObj});
  writeBackups(a.slice(0, BAK_MAX));
}
function autoBackup(force){
  if (!world) return;
  const a = readBackups(), last = a[0];
  if (force || !last || Date.now() - last.t > 12 * HOUR) makeBackup(JSON.parse(JSON.stringify(world)), force || 'auto');
}
function save(){
  if (saveLocked) return;
  if (!world && !allowEmptySave){ const cur = readLocal(); if (cur && cur.state) return; }
  allowEmptySave = false;
  const rec = {state: world ? JSON.parse(JSON.stringify(world)) : null, savedAt: Date.now(), ver: typeof APP_VERSION === 'number' ? APP_VERSION : 0};
  try { localStorage.setItem(KEY, JSON.stringify(rec)); }
  catch { if (!save.warned){ save.warned = true; toast('Attenzione: non riesco a salvare. Fai un backup da "Backup" in fondo alla pagina.', 4000); } }
  pushRemote(rec);
}
function saveSoon(){ clearTimeout(saveT); saveT = setTimeout(save, 600); }
async function pushRemote(rec){
  if (!db || !uid) return;
  if (writing){ again = rec; return; }
  writing = true;
  try { await db.doc(`data/users/${uid}/pet`).set(rec); } catch (e){ if (e && e.code === 'invalid_argument') db = null; }
  writing = false;
  if (again){ const r = again; again = null; pushRemote(r); }
}
function adopt(rec){
  if (!rec) return;
  setWorld(rec.state ? migrateWorld(rec.state) : null);
  if (world){
    const now = Date.now(), r = world.rooms[world.activeRoom || 0], ab = r && r.blob && blobById(r.blob);
    const away = ab ? now - ab.last : 0;
    for (const b of houseBlobs()) simulate(view(b), now);
    setRoom(world.activeRoom || 0);
    if (houseBlobs().length >= 2 || world.rooms.length >= 2) setCasaView('house');
    if (state && away > 20*MIN && state.stage !== 'egg' && !state.walk && !state.sleeping) setWelcome(true);
  } else { setState(null); render(true); }
}
async function initRemote(){
  if (!window.claude || !window.claude.use) return;
  try {
    const user = await claude.use('user');
    uid = user ? await user.id() : null;
    db = await claude.use('db');
    if (!db || !uid) return;
    const snap = await db.doc(`data/users/${uid}/pet`).get();
    const local = readLocal();
    if (snap.exists){
      const remote = snap.data();
      if (!local || (remote.savedAt || 0) > (local.savedAt || 0)){
        try { localStorage.setItem(KEY, JSON.stringify(remote)); } catch {}
        adopt(remote);
      }
    } else if (local && local.state) pushRemote(local);
    $('saveNote').textContent = 'Salvato nel tuo account';
  } catch {}
}

// gli altri moduli non possono riassegnare una variabile importata: la cambiano con questi
export function setSaveLocked(v){ saveLocked = v; }
export function setAllowEmptySave(v){ allowEmptySave = v; }

export { BAK_MAX, adopt, autoBackup, initRemote, makeBackup, readBackups, readLocal, save, saveSoon };
