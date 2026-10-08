import { $, EMO, clamp, pick, rnd } from './game/util.js';
import { FORMS } from './game/blobs.js';
import { FOODS, GAMES, TASTY } from './game/catalog.js';
import { giveSticker, isForm, log, palFor, reveal, state } from './game/state.js';
import { note, simulate } from './game/evolution.js';
import { save } from './game/save.js';
import { addCoins, say, tone } from './game/texts.js';
import { gainXp } from './game/bond.js';
import { fulfill, mission } from './game/wishes.js';
import { closeSheet, render } from './legacy/interface.js';
import { ready } from './legacy/actions.js';
import { tokens } from './room/scene.js';

/* ================= minigiochi ================= */
let game = null, runId = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
function palOf(){ return state ? palFor(state) : FORMS.baby.pal; }
function openGame(id){
  const s = ready(); if (!s) return;
  if (s.sleeping){ say(`Shh… ${s.name} sta dormendo.`); return; }
  game = GAME_IMPL[id]; game.id = id;
  $('gTitle').textContent = GAMES[id].n;
  $('gMsg').textContent = GAMES[id].d;
  $('gScore').textContent = `Record ${s.records[id]}`;
  $('gBody').innerHTML = '';
  game.mount($('gBody'));
  $('gStart').hidden = false; $('gStart').textContent = 'Inizia';
  $('gameOverlay').hidden = false; $('gStart').focus();
}
function exitGame(){
  runId++; if (game && game.stop) game.stop();
  $('gameOverlay').hidden = true; game = null; render(true);
}
function finishGame(id, score){
  const s = state; simulate(s, Date.now());
  let coins = id === 'memory' ? score * 2 : id === 'catch' ? Math.floor(score / 2) : score * 3;
  if (isForm('stellino')) coins = Math.round(coins * 1.5);
  let fun = Math.min(40, 6 + (id === 'memory' ? score * 6 : id === 'catch' ? score * 1.2 : score * 7));
  const fav = s.traits.favGame === id;
  if (fav){ fun *= 1.5; coins += 3; }
  addCoins(coins); s.fun = clamp(s.fun + fun); s.trust = clamp(s.trust + Math.min(5, 1 + Math.floor(score / 2)));
  s.energy = clamp(s.energy - 6); s.plays++;
  gainXp(Math.min(12, 2 + score));
  const rec = score > s.records[id]; if (rec) s.records[id] = score;
  if (id === 'memory' && score >= 8) giveSticker(s, 'memory8');
  if (id === 'catch' && score >= 25) giveSticker(s, 'catch25');
  if (id === 'hide' && score >= 5) giveSticker(s, 'hide5');
  const newFav = fav && reveal(s, 'favGame');
  if (newFav) log(s, Date.now(), `Scoperto: il gioco preferito di ${s.name} è ${GAMES[id].n}.`);
  if (rec && score >= 3) log(s, Date.now(), `Nuovo record a ${GAMES[id].n}: ${score} ${GAMES[id].unit}!`);
  fulfill('game', id);
  mission('games', 1, id); note('game', 3);
  if (rec && score > 0) mission('record');
  if (id === 'memory' && score >= 5) mission('memory5');
  if (id === 'catch' && score >= 15) mission('catch15');
  if (id === 'hide' && score >= 3) mission('hide3');
  save(); render(true);
  $('gScore').textContent = `Record ${s.records[id]}`;
  $('gMsg').textContent = `${rec && score ? 'Nuovo record! ' : ''}+${coins} stelline.` + (newFav ? ' Si vede che è il suo gioco preferito!' : fav ? ' Il suo preferito: bonus!' : '');
  $('gStart').hidden = false; $('gStart').textContent = 'Gioca ancora';
}
const GAME_IMPL = {
  memory: {
    mount(b){
      b.innerHTML = `<div class="pads">${['M16 28S3 20 3 11.5A6.5 6.5 0 0 1 16 8a6.5 6.5 0 0 1 13 3.5C29 20 16 28 16 28z','M16 3c2 7 6 11 13 13-7 2-11 6-13 13-2-7-6-11-13-13 7-2 11-6 13-13z','M16 4a12 12 0 1 1 0 24 12 12 0 0 1 0-24z','M20 4a12 12 0 1 0 8 19A11 11 0 0 1 20 4z']
        .map((d, i) => `<button class="pad p${i}" data-p="${i}" type="button" aria-label="${['Rosa','Menta','Giallo','Lilla'][i]}" disabled><svg viewBox="0 0 32 32"><path d="${d}"/></svg></button>`).join('')}</div>`;
      this.pads = [...b.querySelectorAll('.pad')];
      b.querySelector('.pads').addEventListener('click', e => this.press(e));
    },
    async flash(i, ms){ const p = this.pads[i]; p.classList.add('lit'); tone([523.25, 659.25, 783.99, 987.77][i]); await wait(ms); p.classList.remove('lit'); },
    setPads(on){ this.pads.forEach(p => p.disabled = !on); this.busy = !on; },
    start(run){ this.run = run; this.seq = []; this.next(); },
    async next(){
      const run = this.run;
      this.seq.push(rnd(0, 3)); this.pos = 0;
      $('gScore').textContent = `Round ${this.seq.length}`; $('gMsg').textContent = 'Guarda bene…';
      this.setPads(false); await wait(500);
      const sp = Math.max(260, 460 - this.seq.length * 18);
      for (const i of this.seq){ if (run !== runId) return; await this.flash(i, sp); await wait(130); }
      if (run !== runId) return;
      $('gMsg').textContent = 'Tocca a te!'; this.setPads(true);
    },
    async press(e){
      const p = e.target.closest('.pad'); if (!p || this.busy) return;
      const i = +p.dataset.p; this.flash(i, 200);
      if (i !== this.seq[this.pos]){ this.setPads(false); tone(180, .4, 'sawtooth'); finishGame('memory', this.seq.length - 1); return; }
      this.pos++;
      if (this.pos === this.seq.length){ this.setPads(false); $('gMsg').textContent = 'Perfetto!'; await wait(650); if (this.run === runId) this.next(); }
    },
    stop(){}
  },
  catch: {
    mount(b){
      b.innerHTML = '<canvas class="gcanvas" aria-label="Campo di gioco: trascina il dito per muovere il blob"></canvas>';
      const c = this.c = b.querySelector('canvas'); this.ctx = c.getContext('2d');
      this.px = .5; this.tx = .5; this.items = []; this.score = 0; this.lives = 3; this.running = false;
      const move = e => { const r = c.getBoundingClientRect(); this.tx = Math.max(.08, Math.min(.92, (e.clientX - r.left) / r.width)); };
      c.addEventListener('pointerdown', e => { move(e); try { c.setPointerCapture(e.pointerId); } catch {} });
      c.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons || e.pressure) move(e); });
      this.key = e => { if (e.key === 'ArrowLeft') this.tx = Math.max(.08, this.tx - .12); if (e.key === 'ArrowRight') this.tx = Math.min(.92, this.tx + .12); };
      document.addEventListener('keydown', this.key);
      this.draw();
    },
    hud(){ $('gScore').textContent = `${this.score} punti · ${'♥'.repeat(Math.max(0, this.lives))}${'♡'.repeat(Math.max(0, 3 - this.lives))}`; },
    start(run){
      this.run = run; this.items = []; this.score = 0; this.lives = 3; this.t = 0; this.spawn = 0; this.running = true;
      $('gMsg').textContent = 'Trascina il dito per muoverti.'; this.hud();
      let last = performance.now();
      const loop = now => {
        if (this.run !== runId || !this.running) return;
        const dt = Math.min(.05, (now - last) / 1000); last = now;
        this.step(dt); this.draw();
        if (this.running) requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },
    step(dt){
      this.t += dt; this.spawn -= dt;
      this.px += (this.tx - this.px) * Math.min(1, dt * 14);
      if (this.spawn <= 0){
        this.spawn = Math.max(.42, 1.05 - this.t * .012);
        const r = Math.random();
        const kind = r < .14 ? 'poop' : r < .23 ? 'star' : 'food';
        this.items.push({kind, x: .08 + Math.random() * .84, y: -.05, e: kind === 'poop' ? '💩' : kind === 'star' ? '⭐' : FOODS[pick(TASTY)].e,
          v: .26 + Math.min(.34, this.t * .006) + Math.random() * .06});
      }
      for (const it of this.items){
        it.y += it.v * dt;
        if (!it.done && it.y > .8 && it.y < .92 && Math.abs(it.x - this.px) < .12){
          it.done = true; it.hit = true;
          if (it.kind === 'poop'){ this.lives--; tone(160, .35, 'sawtooth'); $('gMsg').textContent = 'Puah!'; }
          else { this.score += it.kind === 'star' ? 3 : 1; tone(it.kind === 'star' ? 1046 : 784, .12); }
          this.hud();
        }
        if (!it.done && it.y > 1.02){
          it.done = true;
          if (it.kind === 'food'){ this.lives--; tone(220, .2); $('gMsg').textContent = 'Ops, è caduto!'; this.hud(); }
        }
      }
      this.items = this.items.filter(it => !it.done || (!it.hit && it.y < 1.1));
      if (this.lives <= 0 || this.t > 60){ this.running = false; finishGame('catch', this.score); }
    },
    draw(){
      const c = this.c, cx = this.ctx, dpr = Math.min(2, devicePixelRatio || 1), Wc = c.clientWidth, Hc = c.clientHeight;
      if (c.width !== Math.round(Wc * dpr) || c.height !== Math.round(Hc * dpr)){ c.width = Math.round(Wc * dpr); c.height = Math.round(Hc * dpr); }
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, Wc, Hc);
      cx.fillStyle = tokens.floor; cx.fillRect(0, Hc * .93, Wc, Hc * .07);
      cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.font = `${Math.round(Wc * .1)}px ${EMO}`;
      for (const it of this.items) if (!it.hit) cx.fillText(it.e, it.x * Wc, it.y * Hc);
      const pal = palOf(), Rr = Wc * .11, x = this.px * Wc, y = Hc * .87;
      cx.fillStyle = pal.b; cx.beginPath(); cx.ellipse(x, y, Rr, Rr * .78, 0, 0, 7); cx.fill();
      cx.fillStyle = pal.a; cx.beginPath(); cx.ellipse(x - Rr * .3, y - Rr * .35, Rr * .25, Rr * .14, -.5, 0, 7); cx.fill();
      cx.fillStyle = '#3b2842';
      for (const d of [-1, 1]){ cx.beginPath(); cx.ellipse(x + d * Rr * .32, y - Rr * .05, Rr * .09, Rr * .13, 0, 0, 7); cx.fill(); }
      cx.beginPath(); cx.ellipse(x, y + Rr * .28, Rr * .14, Rr * .12, 0, 0, 7); cx.fillStyle = '#ff6f9a'; cx.fill();
    },
    stop(){ this.running = false; document.removeEventListener('keydown', this.key); }
  },
  hide: {
    mount(b){
      const pal = palOf();
      b.innerHTML = `<div class="hide"><div class="floor"></div>
        <div class="hblob" hidden><svg viewBox="0 0 100 80"><path d="M50 6C78 6 94 30 94 52c0 18-14 24-44 24S6 70 6 52C6 30 22 6 50 6z" fill="${pal.b}"/><ellipse cx="36" cy="44" rx="5" ry="7" fill="#3b2842"/><ellipse cx="64" cy="44" rx="5" ry="7" fill="#3b2842"/><path d="M42 58q8 7 16 0" stroke="#3b2842" stroke-width="4" fill="none" stroke-linecap="round"/></svg></div>
        ${[0,1,2].map(i => `<button class="box" data-i="${i}" type="button" aria-label="Scatola ${i + 1}" disabled></button>`).join('')}</div>`;
      this.boxes = [...b.querySelectorAll('.box')]; this.blob = b.querySelector('.hblob');
      this.pos = [0, 1, 2]; this.place();
      b.querySelector('.hide').addEventListener('click', e => { const x = e.target.closest('.box'); if (x) this.tap(+x.dataset.i); });
    },
    slot: i => [4, 36, 68][i],
    place(){ this.boxes.forEach((bx, i) => bx.style.left = this.slot(this.pos[i]) + '%'); },
    showBlobAt(box){ this.blob.style.left = (this.slot(this.pos[box]) + 4) + '%'; this.blob.hidden = false; },
    lock(on){ this.boxes.forEach(b => b.disabled = on); this.busy = on; },
    start(run){ this.run = run; this.streak = 0; $('gScore').textContent = 'Di fila: 0'; this.round(); },
    async round(){
      const run = this.run; this.lock(true);
      this.boxes.forEach(b => { b.style.setProperty('--d', '300ms'); b.classList.remove('up'); });
      this.hid = rnd(0, 2);
      $('gMsg').textContent = 'Guarda dove si nasconde…';
      this.showBlobAt(this.hid); this.boxes[this.hid].classList.add('up');
      await wait(1000); if (run !== runId) return;
      this.boxes[this.hid].classList.remove('up'); await wait(380); if (run !== runId) return;
      this.blob.hidden = true;
      const swaps = Math.min(14, 3 + this.streak), d = Math.max(170, 430 - this.streak * 35);
      $('gMsg').textContent = 'Mescolo…';
      for (let k = 0; k < swaps; k++){
        const a = rnd(0, 2); let c = rnd(0, 2); if (c === a) c = (a + 1) % 3;
        [this.pos[a], this.pos[c]] = [this.pos[c], this.pos[a]];
        this.boxes.forEach(bx => bx.style.setProperty('--d', d + 'ms'));
        this.place(); tone(440 + k * 20, .06, 'sine');
        await wait(d + 40); if (run !== runId) return;
      }
      $('gMsg').textContent = 'Dov\'è finito?'; this.lock(false);
    },
    async tap(i){
      if (this.busy) return; this.lock(true);
      const run = this.run;
      this.boxes[i].classList.add('up');
      if (i === this.hid){
        this.showBlobAt(i); this.streak++; tone(880, .15); tone(1175, .2);
        $('gScore').textContent = `Di fila: ${this.streak}`; $('gMsg').textContent = 'Trovato!';
        await wait(900); if (run === runId) this.round();
      } else {
        tone(196, .35, 'sawtooth'); $('gMsg').textContent = 'Era di qua!';
        await wait(450); if (run !== runId) return;
        this.boxes[this.hid].classList.add('up'); this.showBlobAt(this.hid);
        await wait(900); if (run !== runId) return;
        finishGame('hide', this.streak);
      }
    },
    stop(){}
  }
};

/* collegamenti da fare all'avvio: li chiama boot.js, quando tutti i moduli sono già caricati */
export function initMinigames(){
  $('gStart').addEventListener('click', () => {
    const s = state; simulate(s, Date.now());
    if (s.energy < 12){ $('gMsg').textContent = `${s.name} è troppo stanco. Lascialo riposare un po'.`; return; }
    $('gStart').hidden = true; runId++; game.start(runId);
  });
  $('gExit').addEventListener('click', exitGame);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('walkOverlay').hidden) $('wExit').click(); else if (!$('gameOverlay').hidden) exitGame(); else if (!$('sheet').hidden) closeSheet();
  });
}

export { openGame };
