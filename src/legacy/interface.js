import { notify } from '../store.js';
import { $, HOUR, MIN, esc } from '../game/util.js';
import { FORMS, STATS, statColor, statIcon } from '../game/blobs.js';
import { FOODS, FREE, LEVELS, PLACES, TASTY } from '../game/catalog.js';
import { blobById, houseBlobs, nm, setUnseenStickers, state, world } from '../game/state.js';
import { BODY, bodyOf, trendOf } from '../game/evolution.js';
import {
  activeRoom, blobPlace, casaView, openHouse, renderBlobList, renderRoomHead, setBlobListKey,
  showHouse
} from '../game/house.js';
import { fmtDur, mood, rich, stageName, trustHint } from '../game/texts.js';
import { DM, missionDirty, renderMissions } from '../game/wishes.js';
import { renderShop } from './shop.js';
import { dragFood } from '../room/scene.js';
import { editMode } from '../room/pointer.js';
import { isNight } from '../room/events.js';
import { renderValleyList, setValleyKey } from '../places/valley.js';

/* ================= interfaccia ================= */
let tab = 'casa';
let tool = 'hand';
function openSheet(title, html, onMount){
  const old = $('sheetBody'), body = old.cloneNode(false);
  old.replaceWith(body);
  $('sheetTitle').textContent = title; body.innerHTML = html; $('sheet').hidden = false;
  if (onMount) onMount(body);
}
function closeSheet(){ $('sheet').hidden = true; }

const statEls = {};

const HINTS = {
  hand: 'Strofina per coccolarlo · tienilo premuto per lanciarlo',
  food: 'Trascina il cibo fino alla sua bocca',
  sponge: 'Strofina la spugna sul blob per lavarlo'
};
let diaryKey = '', trayKey = '';
function render(full){
  const s = state, egg = !s || s.stage === 'egg', now = Date.now();
  const emptyRoom = !!world && !s;
  $('namer').hidden = emptyRoom || !!(s && s.name);
  if (s && !s.name){
    $('namerLabel').textContent = s.parentName ? `Il piccolo di ${s.parentName}: come lo chiami?` : 'Come chiamerai il tuo blob?';
    $('namerText').textContent = s.stage === 'egg' ? 'Accarezza l\'uovo per scaldarlo: si schiude prima.' : 'È appena nato e aspetta un nome!';
    $('importLink').hidden = true;
  } else { $('importLink').hidden = !!world; }
  renderRoomHead();
  $('houseView').hidden = casaView !== 'house' || !world;
  $('valleyView').hidden = casaView !== 'valley' || !world;
  $('roomView').hidden = casaView !== 'room' && !!world;
  $('petName').textContent = s ? (s.name || (s.stage === 'egg' ? 'Un uovo nuovo' : 'Senza nome')) : world ? world.rooms[activeRoom].name : 'Un uovo misterioso';
  $('stageChip').textContent = emptyRoom ? 'Stanza libera' : stageName(s);
  $('coinVal').textContent = rich() ? '∞' : world ? world.coins : 0;
  if (emptyRoom) $('ageText').textContent = 'Nessuno abita qui';
  else if (!s) $('ageText').textContent = 'In attesa di un nome';
  else if (s.stage === 'egg') $('ageText').textContent = `Si schiude tra ${fmtDur(s.hatchAt - now)}`;
  else if (s.stage === 'adult') $('ageText').textContent = `${s.gen}ª generazione`;
  else $('ageText').textContent = `${s.stage === 'baby' ? 'Cresce' : 'Si evolve'} tra ${fmtDur(s.hatchedAt + (s.stage === 'baby' ? 2 : 12)*HOUR - now)} · tendenza ${trendOf(s)}`;
  const F = s && s.stage === 'adult' ? FORMS[s.form] : null;
  $('abilityLine').hidden = !F; if (F) $('abilityLine').textContent = `${F.e} Abilità di ${F.n}: ${F.ab}`;
  $('moodText').textContent = mood(s).t;
  const dm = DM(); $('moodChip').hidden = !dm || egg; if (dm) $('moodChip').textContent = `${dm.e} ${dm.n}`;
  if (missionDirty || full) renderMissions();
  if (casaView === 'house' && world){
    const hb = houseBlobs();
    $('petName').textContent = 'La tua casa';
    $('stageChip').textContent = `${hb.length} ${hb.length === 1 ? 'blob' : 'blob'} in casa`;
    $('ageText').textContent = `${world.rooms.length} ${world.rooms.length === 1 ? 'stanza' : 'stanze'}${world.valley.length ? ' · ' + world.valley.length + ' nella Valle' : ''}`;
    $('moodChip').hidden = !dm;
    if (full) setBlobListKey('');
    renderBlobList();
  }
  if (casaView === 'valley' && world){
    const n = world.valley.length;
    $('petName').textContent = 'Valle dei Blob';
    $('stageChip').textContent = n ? `${n} ${n === 1 ? 'blob' : 'blob'} in libertà` : 'Nessuno per ora';
    $('ageText').textContent = isNight() ? 'È notte nella Valle' : 'Una giornata di sole nella Valle';
    if (full) setValleyKey('');
    renderValleyList();
  }
  $('hintText').textContent = editMode ? 'Modalità Arreda: trascina i mobili' : !s ? '' : egg ? 'Accarezza l\'uovo per scaldarlo' : s.walk ? 'È fuori casa' : s.sleeping ? 'Dorme: accarezzalo piano' : HINTS[tool];

  const aw = $('away');
  if (emptyRoom){
    aw.hidden = false;
    const owner = blobById(world.rooms[activeRoom].blob);
    aw.innerHTML = owner ? `${esc(nm(owner))} non è in camera.<small>${blobPlace(owner)}. Tornerà presto!</small>` : `Questa stanza è libera.<small>Qui può schiudersi un uovo nuovo, o puoi riportare un blob dalla Valle.</small><button class="btn small" id="awHouse" type="button" style="margin-top:8px">Apri la casa</button>`;
    if ($('awHouse')) $('awHouse').onclick = openHouse;
  } else if (s && s.walk){
    const P = PLACES[s.walk.place];
    aw.hidden = false;
    aw.innerHTML = `${esc(s.name)} è ${P.dove} ${P.e}<small>${s.walk.back ? 'Sta rientrando…' : 'Torna tra ' + fmtDur(s.walk.end - now)}</small>`;
  } else aw.hidden = true;

  const w = s && s.wish;
  $('wishCard').classList.toggle('idle', !w);
  $('wishBtn').hidden = !w || !!s.walk;
  if (w){
    $('wishEm').textContent = w.e;
    $('wishT').textContent = `${s.name} ${w.text}`;
    $('wishS').textContent = `Scade tra ${fmtDur(w.exp - now)} · premio ${w.reward} stelline`;
  } else {
    $('wishEm').textContent = '💭';
    $('wishT').textContent = 'Nessun desiderio';
    $('wishS').textContent = egg ? 'Quando nasce, ogni tanto ti chiederà qualcosa.'
      : s.walk ? 'È in giro: niente richieste per ora.'
      : s.sleeping ? 'Mentre dorme non chiede niente.'
      : `Il prossimo arriva tra circa ${fmtDur(Math.max(MIN, s.nextWishAt - now))}.`;
  }

  const lv = s ? s.level : 1, xp = s ? s.xp : 0;
  $('lvText').textContent = `Livello ${lv}`;
  if (lv >= LEVELS.length){ $('xpBar').style.width = '100%'; $('nextUnlock').innerHTML = 'Siete migliori amici. Ha imparato tutto!'; }
  else {
    const a = LEVELS[lv - 1].xp, b = LEVELS[lv].xp;
    $('xpBar').style.width = Math.round((xp - a) / (b - a) * 100) + '%';
    $('nextUnlock').innerHTML = `Prossimo: <b>${LEVELS[lv].e} ${LEVELS[lv].t}</b> · mancano ${b - xp} punti`;
  }
  $('trustVal').textContent = s ? Math.round(s.trust) : 60;
  $('trustHint').textContent = trustHint(s);

  for (const [k] of STATS){
    const v = s ? Math.round(s[k]) : 0, el = statEls[k];
    el.querySelector('.row span:last-child').textContent = egg ? '—' : v;
    el.querySelector('i').style.width = (egg ? 0 : v) + '%';
    el.classList.toggle('low', !egg && v < 25);
  }
  { const nb = $('needsBar'); nb.hidden = egg || !s || !world;
    if (!nb.hidden) for (const [k, l] of STATS){ const v = Math.round(s[k]), el = nb.querySelector(`[data-k="${k}"]`); el.querySelector('.ring').style.setProperty('--p', v); el.classList.toggle('low', v < 25); el.querySelector('small').textContent = v < 25 ? `${l} ${v}` : l; el.title = `${l}: ${v}%`; } }
  { const bl = $('bodyLine'); if (egg || !s){ bl.textContent = ''; } else { const bo = bodyOf(s), B = BODY[bo]; bl.innerHTML = `Corporatura: <b>${B.e} ${B.n}</b> · ${B.tip}${bo === 'obeso' ? ` (${Math.round(s.fat)}%)` : ''}`; } }
  const live = s && !egg && !s.walk;
  const wishTool = w && ({food:'food', cuddle:'hand', ball:'hand', throw:'hand', trick:'hand', hoop:'hand', dunk:'hand', tickle:'hand', bath:'sponge', game:'play', walk:'walk'})[w.type];
  document.querySelectorAll('.tool').forEach(b => {
    const key = b.dataset.t || b.dataset.a;
    if (b.dataset.t) b.setAttribute('aria-pressed', tool === key ? 'true' : 'false');
    const need = live && ((key === 'food' && (s.hunger < 30 || s.thirst < 30)) || (key === 'sponge' && s.hygiene < 35) ||
      (key === 'medicine' && s.sick) || (key === 'light' && !s.sleeping && s.energy < 20) || (key === 'play' && s.fun < 30));
    b.classList.toggle('wished', !!live && key === wishTool && tool !== key);
    b.classList.toggle('need', !!need && key !== wishTool);
    const off = b.dataset.a && (!live || (s.sleeping && key !== 'light' && key !== 'tricks') || (key === 'medicine' && !s.sick));
    b.setAttribute('aria-disabled', off ? 'true' : 'false');
  });
  $('lightLabel').textContent = s && s.sleeping ? 'Sveglia' : 'Nanna';
  $('lightIc').textContent = s && s.sleeping ? '☀️' : '🌙';
  renderTray();

  const entries = s ? s.log : [{t:now, m:'Un uovo tondo e caldo aspetta qualcuno che se ne prenda cura.'}];
  const key = entries.length + '|' + (entries[0] && entries[0].t) + '|' + (entries[0] && entries[0].m);
  if (key !== diaryKey){
    diaryKey = key;
    const ol = $('diary'); ol.innerHTML = '';
    entries.slice(0, 8).forEach(e => {
      const li = document.createElement('li'), tm = document.createElement('time'), sp = document.createElement('span');
      const d = new Date(e.t), today = d.toDateString() === new Date().toDateString();
      tm.textContent = (today ? '' : d.toLocaleDateString('it-IT', {day:'numeric', month:'short'}) + ' ') + d.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
      sp.textContent = e.m; li.append(tm, sp); ol.appendChild(li);
    });
  }
  if (full && tab === 'negozio') renderShop();
  notify();
}
function renderTray(){
  const s = state, tr = $('tray');
  const show = tool === 'food' && s && s.stage !== 'egg' && !s.walk;
  tr.hidden = !show;
  if (!show || dragFood) return;
  const w = s.wish && s.wish.type === 'food' ? s.wish.target : null;
  const ids = ['acqua', 'pappa', ...TASTY.filter(id => s.inv[id] > 0)];
  const key = ids.map(id => id + (s.inv[id] || 0)).join() + w;
  if (key === trayKey) return; trayKey = key;
  tr.innerHTML = ids.map(id => `<button class="fchip${id === w ? ' wish' : ''}" data-f="${id}" type="button" aria-label="${FOODS[id].n}">${FOODS[id].e}${FREE.includes(id) ? '' : `<span class="n">${s.inv[id]}</span>`}</button>`).join('')
    + `<button class="fchip more" data-more type="button" aria-label="Compra altro cibo">+</button>`;
}

function setTab(t){
  tab = t;
  for (const id of ['casa','negozio','album']) $('tab-' + id).hidden = id !== t;
  if (t === 'album') setUnseenStickers(false);
  window.scrollTo(0, 0);
  render(true);
}
/* tocco sulla barra a schede (src/ui/TabBar.jsx): "Casa" quando sei già in casa riporta alla vista della casa */
function pickTab(t){
  if (t === 'casa' && tab === 'casa' && world && (casaView === 'valley' || (casaView === 'room' && world.rooms.length > 1))){ showHouse(); return; }
  setTab(t);
}
function setTool(t){ tool = t; trayKey = ''; render(); }

/* collegamenti da fare all'avvio: li chiama boot.js, quando tutti i moduli sono già caricati */
export function initInterface(){
  $('sheetClose').addEventListener('click', closeSheet);
  $('sheet').addEventListener('click', e => { if (e.target === $('sheet') || e.target.closest('[data-close]')) closeSheet(); });
  (function buildStats(){
    for (const [k, l] of STATS){
      const d = document.createElement('div'); d.className = 'stat';
      d.innerHTML = `<div class="row"><span>${l}</span><span>0</span></div><div class="bar"><i style="background:${statColor[k]}"></i></div>`;
      $('stats').appendChild(d); statEls[k] = d;
    }
    $('needsBar').innerHTML = STATS.map(([k, l]) => `<div class="nd" data-k="${k}" title="${l}"><span class="ring" style="--c:${statColor[k]};--p:0"><span class="ic">${statIcon[k]}</span></span><small>${l}</small></div>`).join('');
    const bd = document.createElement('p'); bd.id = 'bodyLine'; bd.className = 'shopnote'; bd.style.cssText = 'grid-column:1/-1;margin:4px 0 0;text-align:center;font-size:12px'; $('needsBar').appendChild(bd);
  })();
}

// gli altri moduli non possono riassegnare una variabile importata: la cambiano con questi
export function setDiaryKey(v){ diaryKey = v; }
export function setTrayKey(v){ trayKey = v; }

export { HINTS, closeSheet, openSheet, pickTab, render, setTab, setTool, tab, tool };
