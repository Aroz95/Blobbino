import { useEffect, useRef } from 'react';
import { useGame } from '../store.js';
import { RAR, dexInfo, dexList, rarStars, specOf } from '../game/blobs.js';
import { FOODS, GAMES, PLACES, STICKERS } from '../game/catalog.js';
import { state, world } from '../game/state.js';
import { openDexDetail } from '../legacy/album-detail.js';
import { drawSpecimen } from '../places/house-view.js';

const STAGES = [['egg', 'Uova'], ['baby', 'Cuccioli'], ['child', 'Piccoli'], ['adult', 'Adulti']];
const GAME_RECORDS = [['memory', 'Memory', 'round'], ['catch', 'Acchiappa', 'punti'], ['hide', 'Nascondino', 'di fila']];

// impronta di tutto ciò che l'album mostra: quando cambia, la scheda si ridisegna
function albumKey(){
  const w = world, s = state;
  return JSON.stringify([
    w && w.dex,
    s && [s.name, s.traits, s.known, s.records, s.stickers, s.wishesDone, s.tricksDone, s.daily.streak, s.hoops, s.chests, s.level],
  ]);
}

export default function Album({ stage, onStage }){
  useGame(albumKey);
  const s = state, dex = world ? world.dex : {};
  const total = STAGES.flatMap(([st]) => dexList(st).map(k => st + ':' + k));
  const list = dexList(stage);
  const found = list.filter(k => dex[stage + ':' + k]).length;

  return (
    <>
      <section className="card">
        <h2 className="sec">Album dei blob <span className="count">{`${total.filter(k => dex[k]).length} / ${total.length}`}</span></h2>
        <div className="seg seg4" role="tablist">
          {STAGES.map(([st, label]) => (
            <button key={st} type="button" aria-selected={st === stage} onClick={() => onStage(st)}>{label}</button>
          ))}
        </div>
        <p className="shopnote" style={{margin: '0 0 10px'}}>{`${found} su ${list.length} scoperti. Più stelle, più è raro. Tocca per i dettagli.`}</p>
        <div className="dexgrid">
          {list.map(k => <DexCard key={stage + ':' + k} stage={stage} k={k} got={dex[stage + ':' + k]}/>)}
        </div>
      </section>
      <section className="card">
        <h2 className="sec">{s ? `I gusti di ${s.name}` : 'I suoi gusti'}</h2>
        <div className="traits"><Traits s={s}/></div>
      </section>
      <section className="card">
        <h2 className="sec">Record</h2>
        <div className="recs"><Records s={s}/></div>
      </section>
      <Stickers s={s}/>
    </>
  );
}

function DexCard({ stage, k, got }){
  const cv = useRef(null);
  const I = dexInfo(stage, k), found = !!got;
  // il blob si disegna dopo che la scheda è a schermo, così il canvas ha già la sua misura
  useEffect(() => { drawSpecimen(cv.current, specOf(stage, k), !found); }, [stage, k, found]);

  return (
    <button className={`dx r${I.r}${found ? '' : ' miss'}`} type="button" onClick={() => openDexDetail(stage, k)}>
      <canvas ref={cv} aria-hidden="true"/>
      <small>{found ? I.n : '???'}</small>
      <span className="rar" style={{color: RAR[I.r].c}}>{rarStars(I.r)}</span>
      {found && got.shiny && <span className="sh">✨</span>}
    </button>
  );
}

function Traits({ s }){
  const T = s ? s.traits : {}, K = s ? s.known : {};
  const rows = [
    ['Cibo preferito', K.favFood && `${FOODS[T.favFood].e} ${FOODS[T.favFood].n}`, 'Prova cibi diversi'],
    ['Cibo che odia', K.hateFood && `${FOODS[T.hateFood].e} ${FOODS[T.hateFood].n}`, 'Lo scopri a tue spese'],
    ['Gioco preferito', K.favGame && `${GAMES[T.favGame].e} ${GAMES[T.favGame].n}`, 'Gioca a tutti e tre'],
    ['Posto preferito', K.favPlace && `${PLACES[T.favPlace].e} ${PLACES[T.favPlace].n}`, 'Portalo a passeggio'],
  ];
  return rows.map(([label, value, hint]) => (
    <div className="trait" key={label}>
      <span className="label">{label}</span>
      <div className={value ? 'v' : 'v unk'}>{value || '???'}</div>
      <small>{value ? 'Scoperto' : hint}</small>
    </div>
  ));
}

function Records({ s }){
  const r = s ? s.records : {memory: 0, catch: 0, hide: 0};
  const rows = GAME_RECORDS.map(([k, n, u]) => [r[k], n, u]);
  if (s) rows.push(
    [s.wishesDone, 'Desideri', 'esauditi'], [s.tricksDone, 'Trucchi', 'fatti'], [s.daily.streak, 'Giorni', 'di fila'],
    [s.hoops, 'Canestri', 'fatti'], [s.chests, 'Forzieri', 'aperti'], [s.level, 'Livello', 'amicizia'],
  );
  return rows.map(([v, n, u]) => <div className="rec" key={n}><b>{v}</b><span>{n}<br/>{u}</span></div>);
}

function Stickers({ s }){
  const ids = Object.keys(STICKERS);
  const have = ids.filter(id => s && s.stickers[id]).length;
  return (
    <section className="card">
      <h2 className="sec">Figurine <span className="count">{`${have} / ${ids.length}`}</span></h2>
      <div className="stickers">
        {ids.map(id => {
          const S = STICKERS[id], got = s && s.stickers[id];
          return (
            <div key={id} className={got ? 'stk' : 'stk miss'} title={got ? S.n : S.how}>
              <span className="em">{S.e}</span><small>{got ? S.n : S.how}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
