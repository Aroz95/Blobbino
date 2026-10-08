import { $, esc } from '../game/util.js';
import { houseBlobs, migrateWorld, setWorld, state, view, world } from '../game/state.js';
import { setEvoQueue, simulate } from '../game/evolution.js';
import { setCasaView, setRoom } from '../game/house.js';
import { BAK_MAX, adopt, autoBackup, readBackups, save } from '../game/save.js';
import { say, toast } from '../game/texts.js';
import { setWelcome } from '../game/wishes.js';
import { closeSheet, openSheet, render } from './interface.js';

/* ================= trasferimento ================= */
/* codice di trasferimento: compresso (BLOB2) se il telefono lo permette, altrimenti BLOB1 */
const b64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = str => { const bin = atob(str); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };
async function pipeBytes(bytes, stream){ const r = new Response(new Blob([bytes]).stream().pipeThrough(stream)); return new Uint8Array(await r.arrayBuffer()); }
function slimWorld(w){ const x = JSON.parse(JSON.stringify(w)); for (const b of x.blobs || []) if (b.log) b.log = b.log.slice(0, 6); return x; }
async function encodeSave(){
  const json = JSON.stringify({v:4, world: slimWorld(world)}), raw = new TextEncoder().encode(json);
  if (typeof CompressionStream === 'function'){
    try { return 'BLOB2:' + b64(await pipeBytes(raw, new CompressionStream('deflate-raw'))); } catch {}
  }
  return 'BLOB1:' + b64(raw);
}
async function decodeSave(code){
  let c = String(code || '').replace(/[​-‍﻿]/g, '');
  const i = c.search(/blob[12]\s*:/i);
  if (i < 0) throw new Error('nocode');
  const kind = c.slice(i, i + 5).toUpperCase();
  c = c.slice(i).replace(/^blob([12])\s*:/i, 'BLOB$1:');
  let body = c.slice(6).replace(/[^A-Za-z0-9+/=]/g, '');
  body = body.replace(/=+$/, ''); while (body.length % 4) body += '=';
  let bytes;
  try { bytes = unb64(body); } catch { throw new Error('broken'); }
  let json;
  try {
    if (kind === 'BLOB2'){
      if (typeof DecompressionStream !== 'function') throw new Error('old');
      bytes = await pipeBytes(bytes, new DecompressionStream('deflate-raw'));
    }
    json = new TextDecoder().decode(bytes);
  } catch (e){ throw new Error(e.message === 'old' ? 'old' : 'broken'); }
  let data; try { data = JSON.parse(json); } catch { throw new Error('broken'); }
  const x = data && (data.world || data.state);
  if (!x || !(x.blobs || (x.name && x.stage))) throw new Error('broken');
  return x;
}
function copyText(text){
  const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
  document.body.appendChild(ta); ta.focus(); ta.select(); ta.setSelectionRange(0, text.length);
  let ok = false; try { ok = document.execCommand('copy'); } catch {}
  ta.remove(); return ok;
}
function openTransfer(){
  const has = !!world;
  openSheet('Trasferisci il tuo blob', `
    ${has ? `<p class="shopnote" style="margin-bottom:8px"><b>Da qui a un altro posto.</b> Safari e l'app sulla schermata Home tengono i dati separati: copia questo codice e incollalo dall'altra parte.</p>
    <textarea class="code" id="exportCode" readonly aria-label="Codice del tuo blob">Preparo il codice…</textarea>
    <div class="sheet-actions" style="margin-top:8px">${navigator.share ? '<button class="btn ghost" id="shareCode" type="button">Condividi…</button>' : ''}<button class="btn" id="copyCode" type="button">Copia il codice</button></div>
    <p class="shopnote" style="margin-top:6px">Consiglio: incollalo in Note o mandatelo su WhatsApp, così non lo perdi.</p>
    <hr style="border:0;border-top:1px solid var(--line);margin:16px 0">` : ''}
    <p class="shopnote" style="margin-bottom:8px"><b>Da un altro posto a qui.</b> Incolla il codice copiato da Safari o da un altro dispositivo.</p>
    <textarea class="code" id="importCode" placeholder="BLOB2:…" aria-label="Incolla qui il codice" autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false"></textarea>
    <div class="sheet-actions" style="margin-top:6px"><button class="btn ghost small" id="pasteCode" type="button">📋 Incolla</button><label class="btn ghost small" style="cursor:pointer">📄 Apri file del codice<input type="file" id="fileCode" accept=".txt,text/plain,*/*" hidden></label></div>
    <p class="err" id="importErr"></p>
    <div class="sheet-actions" style="margin-top:4px" id="importActions"><button class="btn ${has ? 'ghost' : ''}" id="loadCode" type="button">Carica questo blob</button></div>`, b => {
    const cp = b.querySelector('#copyCode'), sh = b.querySelector('#shareCode');
    let codeText = '';
    if (cp){ cp.disabled = true; encodeSave().then(cd => { codeText = cd; const ta = b.querySelector('#exportCode'); if (ta) ta.value = cd; cp.disabled = false; }); }
    if (cp) cp.addEventListener('click', () => {
      if (!codeText) return;
      // prima la copia sincrona (funziona sempre su iPhone), poi l'API moderna
      let ok = copyText(codeText);
      if (!ok && navigator.clipboard) navigator.clipboard.writeText(codeText).then(() => { cp.textContent = 'Copiato!'; }).catch(() => {});
      cp.textContent = ok ? 'Copiato!' : 'Tieni premuto sul codice e copia';
      setTimeout(() => { cp.textContent = 'Copia il codice'; }, 2500);
    });
    if (sh) sh.addEventListener('click', () => { if (codeText) navigator.share({text: codeText}).catch(() => {}); });
    $('importCode').addEventListener('input', () => { $('importErr').textContent = ''; });
    $('pasteCode').addEventListener('click', async () => {
      let t = '';
      try {
        if (navigator.clipboard && navigator.clipboard.read){
          for (const it of await navigator.clipboard.read()){
            for (const ty of it.types){ if (ty.startsWith('text/') || ty === 'application/octet-stream'){ const x = await (await it.getType(ty)).text(); if (/blob[12]:/i.test(x)){ t = x; break; } if (!t) t = x; } }
            if (/blob[12]:/i.test(t)) break;
          }
        }
      } catch {}
      if (!t){ try { t = await navigator.clipboard.readText(); } catch {} }
      if (t){ $('importCode').value = t; $('importErr').textContent = ''; $('loadCode').click(); }
      else $('importErr').textContent = 'Non riesco a leggere gli appunti: tieni premuto nel riquadro e scegli Incolla, oppure usa "Apri file del codice".';
    });
    $('fileCode').addEventListener('change', async e => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      try { $('importCode').value = await f.text(); $('importErr').textContent = ''; $('loadCode').click(); }
      catch { $('importErr').textContent = 'Non riesco ad aprire questo file.'; }
    });
    $('loadCode').addEventListener('click', async () => {
      let incoming;
      const txt = $('importCode').value;
      if (!txt.trim()){ $('importErr').textContent = 'Incolla prima il codice.'; return; }
      try { incoming = await decodeSave(txt); }
      catch (e){ const seen = txt.trim().slice(0, 30); $('importErr').textContent = e.message === 'nocode' ? `Non trovo il codice nel testo incollato (inizia con «${seen}»). Se l'hai salvato come file, usa "Apri file del codice".` : e.message === 'old' ? 'Questo telefono è troppo vecchio per questo codice: aggiorna iOS o crea il codice dall\'altro lato dopo averlo aggiornato.' : 'Il codice è incompleto o rovinato. Copialo di nuovo per intero, fino all\'ultima lettera.'; return; }
      const doLoad = () => {
        setWorld(migrateWorld(incoming));
        for (const b of houseBlobs()) simulate(view(b), Date.now());
        setEvoQueue([]);
        setRoom(world.activeRoom || 0); setWelcome(true);
        if (houseBlobs().length >= 2){ setCasaView('house'); render(true); }
        save(); closeSheet(); say(state && state.name ? `Bentornato ${state.name}!` : 'Casa trasferita!', 2600);
      };
      if (!has){ doLoad(); return; }
      const a = $('importActions');
      a.innerHTML = `<span class="shopnote" style="flex:1 1 100%">Questo sostituisce tutta la tua casa con quella del codice.</span><button class="btn ghost" id="noLoad" type="button">Annulla</button><button class="btn" id="yesLoad" type="button">Sostituisci</button>`;
      $('noLoad').onclick = () => openTransfer();
      $('yesLoad').onclick = doLoad;
    });
  });
}
function openBackups(){
  const a = readBackups(), why = {auto:'Automatica', update:'Prima di un aggiornamento', reset:'Prima di ricominciare', manual:'Fatta da te'};
  const lastExp = world && world.lastExport ? new Date(world.lastExport).toLocaleDateString('it-IT') : 'mai';
  const rows = a.length ? a.map((b, i) => `<div class="rowi"><div class="em">🗂️</div><div style="flex:1;min-width:0"><b>${new Date(b.t).toLocaleString('it-IT', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}</b><small>${why[b.why] || 'Copia'} · ${b.n} blob: ${b.names.map(esc).join(', ')}${b.n > 4 ? '…' : ''}</small></div><button class="btn small ghost" data-restore="${i}" type="button">Ripristina</button></div>`).join('')
    : '<p class="shopnote">Ancora nessuna copia: la prima si crea da sola.</p>';
  openSheet('Backup e copie di sicurezza', `
    <p class="shopnote" style="margin-bottom:8px">L'app tiene da sola le ultime ${BAK_MAX} copie della casa su questo telefono: una ogni 12 ore e una prima di ogni aggiornamento. Se qualcosa va storto, puoi tornare indietro.</p>
    <div class="sheet-actions" style="justify-content:flex-start;margin-bottom:10px"><button class="btn small" id="bakNow" type="button">Fai una copia adesso</button><button class="btn small ghost" id="bakFile" type="button">📤 Salva fuori dal telefono</button></div>
    <p class="shopnote" style="margin-bottom:10px">Le copie qui sopra spariscono se cancelli l'app o i dati di Safari. Per stare tranquillo salva ogni tanto una copia fuori dal telefono (Note, File, WhatsApp). Ultima volta: <b>${lastExp}</b>.</p>
    <div class="rows">${rows}</div>`, body => {
    body.querySelector('#bakNow').onclick = () => { autoBackup('manual'); toast('Copia fatta!'); openBackups(); };
    body.querySelector('#bakFile').onclick = async () => {
      const code = await encodeSave(); world.lastExport = Date.now(); save();
      const name = `blobbino-backup-${new Date().toISOString().slice(0, 10)}.txt`;
      try { const f = new File([code], name, {type: 'text/plain'}); if (navigator.canShare && navigator.canShare({files: [f]})){ await navigator.share({files: [f], title: 'Backup Blobbino'}); toast('Backup salvato!'); openBackups(); return; } } catch (e){ if (e && e.name === 'AbortError') return; }
      try { if (navigator.share){ await navigator.share({text: code, title: 'Backup Blobbino'}); toast('Backup salvato!'); openBackups(); return; } } catch (e){ if (e && e.name === 'AbortError') return; }
      const url = URL.createObjectURL(new Blob([code], {type: 'text/plain'})), l = document.createElement('a'); l.href = url; l.download = name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); toast('Backup scaricato!');
    };
    body.addEventListener('click', e => {
      const r = e.target.closest('[data-restore]'); if (!r) return;
      const b = readBackups()[+r.dataset.restore]; if (!b) return;
      r.outerHTML = `<span style="display:flex;gap:6px"><button class="btn small" data-yes="${r.dataset.restore}" type="button">Sì, ripristina</button></span>`;
      body.querySelector(`[data-yes="${r.dataset.restore}"]`).onclick = () => {
        autoBackup('manual');
        adopt({state: JSON.parse(JSON.stringify(b.state))}); save(); closeSheet();
        toast('Casa ripristinata alla copia del ' + new Date(b.t).toLocaleString('it-IT'), 3500);
      };
    });
  });
}

/* collegamenti da fare all'avvio: li chiama boot.js, quando tutti i moduli sono già caricati */
export function initTransfer(){
  $('transferBtn').addEventListener('click', openTransfer);
  $('backupBtn').addEventListener('click', openBackups);
  $('importLink').addEventListener('click', openTransfer);
}

export { decodeSave };
