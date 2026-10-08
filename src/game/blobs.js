import { varOf } from './state.js';

/* ================= contenuti ================= */
const STATS = [['hunger','Pancia'],['thirst','Acqua'],['fun','Gioia'],['energy','Energia'],['hygiene','Pulizia'],['health','Salute']];
const statColor = {hunger:'#ff9ec7',thirst:'#7cc8ff',fun:'#ffc94f',energy:'#a893ff',hygiene:'#6fdcb6',health:'#ff7eb0'};
const statIcon = {hunger:'🍎', thirst:'💧', fun:'😊', energy:'⚡', hygiene:'🧼', health:'❤️'};
const FORMS = {
  baby:{n:'Cucciolo', e:'🐣', pal:{a:'#ffd3e6', b:'#ff9fca'}},
  morbidello:{n:'Morbidello', e:'🧸', child:true, pal:{a:'#fde2ff', b:'#e4a6f0'}, ab:'Un piccolo coccolone: diventerà tenero, goloso, curato, ridanciano o nottambulo.', hint:'Da piccolo: tante cure'},
  saltello:{n:'Saltello', e:'🦘', child:true, pal:{a:'#c2f5e2', b:'#78d9b6'}, ab:'Un piccolo scalmanato: diventerà giocherellone, spericolato, sportivo, avventuroso o da circo.', hint:'Da piccolo: tanto gioco'},
  nuvola:{n:'Nuvola', e:'☁️', fam:'morbidello', seed:'pet', pal:{a:'#eef8ff', b:'#a9d6fb'}, trend:'tenera', ab:'Quando lo lanci plana leggero come una nuvola.', hint:'Tante carezze'},
  budino:{n:'Budino', e:'🍮', fam:'morbidello', seed:'sweet', pal:{a:'#ffe6c9', b:'#ffab76'}, trend:'golosa', ab:'I dolci lo rendono felicissimo e attira i topolini.', hint:'Tanti dolci'},
  bocciolo:{n:'Bocciolo', e:'🌸', fam:'morbidello', seed:'healthy', pal:{a:'#f3ffe9', b:'#9fdc9a'}, trend:'curata', ab:'Fa sbocciare fiori che valgono stelline e si sporca meno.', hint:'Frutta, verdura e pulizia'},
  gelatina:{n:'Gelatina', e:'🍬', fam:'morbidello', seed:'tickle', pal:{a:'#f1dcff', b:'#b48cff'}, trend:'ridanciana', ab:'Rimbalza come una molla: i lanci durano il triplo.', hint:'Tanto solletico'},
  lumino:{n:'Lumino', e:'✨', fam:'morbidello', seed:'night', dark:true, pal:{a:'#6575c0', b:'#2c3570'}, trend:'nottambula', ab:'Brilla al buio e di notte attira le stelle cadenti.', hint:'Tante coccole di sera'},
  stellino:{n:'Stellino', e:'⭐', fam:'saltello', seed:'game', pal:{a:'#fff0b8', b:'#ffc84a'}, trend:'giocherellona', ab:'Nei minigiochi guadagna il 50% di stelline in più.', hint:'Tanti minigiochi'},
  razzo:{n:'Razzo', e:'🚀', fam:'saltello', seed:'throw', pal:{a:'#ffe1e1', b:'#ff6b6b'}, trend:'spericolata', ab:'Quando lo lanci vola altissimo con la scia di fuoco.', hint:'Tanti lanci'},
  pallino:{n:'Pallino', e:'🏀', fam:'saltello', seed:'ball', pal:{a:'#ffd9b0', b:'#ff8c3a'}, trend:'sportiva', ab:'Tira a canestro da solo, quasi non sbaglia e ti regala stelline.', hint:'Tanta palla e canestri'},
  esploratore:{n:'Esploratore', e:'🎒', fam:'saltello', seed:'walk', pal:{a:'#f3e3c3', b:'#c9a46a'}, trend:'avventurosa', ab:'A passeggio va più lontano (+4 passi) e trova più tesori.', hint:'Tante passeggiate'},
  saltimbanco:{n:'Saltimbanco', e:'🎪', fam:'saltello', seed:'trick', pal:{a:'#e7dcff', b:'#9b7bff'}, trend:'da circo', ab:'Fa spettacoli da solo e il pubblico lascia stelline.', hint:'Tanti trucchi'},
  muschio:{n:'Muschio', e:'🌿', secret:true, pal:{a:'#d7efcb', b:'#95c882'}, trend:'selvatica', ab:'Se la cava da solo: i bisogni calano più piano.', hint:'Forma segreta'},
  ombra:{n:'Ombra', e:'🌑', secret:true, dark:true, pal:{a:'#77708a', b:'#3a3444'}, trend:'misteriosa', ab:'Passa attraverso i muri e i fantasmini sono suoi amici.', hint:'Forma segreta'}
};
const SHINY = {a:'#fff7d1', b:'#f5c542'};
/* varianti: ogni fase della vita ha le sue, alcune più rare */
const RAR = {1:{n:'Comune', c:'#9b8aa6', w:10}, 2:{n:'Non comune', c:'#3fae7f', w:5}, 3:{n:'Raro', c:'#4f7dff', w:2.5}, 4:{n:'Leggendario', c:'#e8960c', w:1}};
const rarStars = r => '★'.repeat(r) + '☆'.repeat(4 - r);
const VARS = {
  egg: {
    pois:      {n:'Uovo a pois',      r:1, pal:{a:'#fffaf2', b:'#ffe0c6'}, pat:'spots',   pc:'#ffb3d1'},
    righe:     {n:'Uovo di pioggia',  r:1, pal:{a:'#f3fbff', b:'#cfe9ff'}, pat:'gocce',   pc:'rgba(90,170,255,.7)'},
    cuori:     {n:'Uovo dei cuori',   r:1, pal:{a:'#fff5f8', b:'#ffd6e4'}, pat:'cuori',   pc:'#ff86ad'},
    foglie:    {n:'Uovo di bosco',    r:1, pal:{a:'#f6fff0', b:'#d6f2c6'}, pat:'macchie', pc:'rgba(110,200,105,.6)'},
    zigzag:    {n:'Uovo di zucchero', r:2, pal:{a:'#fff6fa', b:'#ffd6e8'}, pat:'pois',    pc:'#ff86ad'},
    stelle:    {n:'Uovo stellato',    r:2, pal:{a:'#fff9e8', b:'#ffe6a8'}, pat:'stelle',  pc:'#ffbf1f'},
    nuvole:    {n:'Uovo nuvoloso',    r:2, pal:{a:'#eaf5ff', b:'#a9d4ff'}, pat:'nuvole',  pc:'rgba(255,255,255,.95)'},
    maculato:  {n:'Uovo maculato',    r:2, pal:{a:'#ffffff', b:'#eee6e0'}, pat:'macchie', pc:'rgba(80,62,62,.8)'},
    arcobaleno:{n:'Uovo arcobaleno',  r:3, pal:{a:'#ffffff', b:'#f2eaff'}, pat:'arcobaleno'},
    galassia:  {n:'Uovo galattico',   r:3, pal:{a:'#6a59b8', b:'#241d4f'}, pat:'stelle',  pc:'#fff3b0', dark:true},
    cristallo: {n:'Uovo di cristallo',r:3, pal:{a:'#f4fdff', b:'#a9e6ff'}, pat:'cristallo'},
    drago:     {n:'Uovo di drago',    r:4, pal:{a:'#ffb36b', b:'#e0452f'}, pat:'squame',  pc:'rgba(255,215,106,.8)'}
  },
  baby: {
    pois:      {n:'Cucciolo',      e:'🐣', r:1, feat:['base']},
    righe:     {n:'Gocciolina',    e:'💧', r:1, shape:'goccia', pal:{a:'#e6f6ff', b:'#7cc4ff'}},
    cuori:     {n:'Cuoricino',     e:'💗', r:1, shape:'cuore', pal:{a:'#ffe1ea', b:'#ff7fa8'}},
    foglie:    {n:'Peretta',       e:'🍐', r:1, shape:'pera', pal:{a:'#f6ffd1', b:'#b8dc5a'}, feat:['picciolo']},
    zigzag:    {n:'Confettino',    e:'🍬', r:2, shape:'uovo', pal:{a:'#fff3f8', b:'#ffb8d5'}, pat:'pois', pc:'rgba(255,255,255,.85)'},
    stelle:    {n:'Stellina',      e:'🌟', r:2, shape:'stella', pal:{a:'#fffbe0', b:'#ffcf4a'}},
    nuvole:    {n:'Nuvoletta',     e:'🌥️', r:2, shape:'nuvola', pal:{a:'#ffffff', b:'#c2e0ff'}},
    maculato:  {n:'Macchietta',    e:'🐮', r:2, shape:'mochi', pal:{a:'#ffffff', b:'#e6ddd7'}, feat:['mucca'], pat:'macchie', pc:'rgba(70,55,55,.75)'},
    arcobaleno:{n:'Arcobalenino',  e:'🌈', r:3, shape:'tondo', pal:{a:'#ffffff', b:'#e7dcff'}, feat:['arco'], pat:'arcobaleno'},
    galassia:  {n:'Pianetino',     e:'🪐', r:3, shape:'tondo', pal:{a:'#8b7be0', b:'#3a2f86'}, feat:['anello'], pat:'stelle', pc:'#fff3b0', dark:true},
    cristallo: {n:'Cristallino',   e:'💎', r:3, shape:'diamante', pal:{a:'#f2fdff', b:'#8fdcff'}, pat:'cristallo'},
    drago:     {n:'Draghetto',     e:'🐲', r:4, shape:'pera', pal:{a:'#ffc08a', b:'#ff6a3d'}, feat:['cresta', 'cornini', 'ali']}
  },
  child: {
    morbidello: {n:'Morbidello',     e:'🧸', r:1, fam:'morbidello', line:'pois', feat:['base']},
    saltello:   {n:'Saltello',       e:'🦘', r:1, fam:'saltello', line:'pois', feat:['base']},
    goccione:   {n:'Goccione',       e:'💧', r:1, line:'righe', shape:'goccia', pal:{a:'#dff1ff', b:'#5fb0f5'}, feat:['goccia'], pat:'gocce', pc:'rgba(255,255,255,.7)'},
    amorino:    {n:'Amorino',        e:'💘', r:1, line:'cuori', shape:'cuore', pal:{a:'#ffe1ea', b:'#ff6f9c'}, feat:['ali']},
    germoglio:  {n:'Germoglio',      e:'🌿', r:1, line:'foglie', shape:'pera', pal:{a:'#eaffd9', b:'#8fd06a'}, feat:['foglia']},
    pasticcino: {n:'Pasticcino',     e:'🧁', r:2, line:'zigzag', shape:'fragola', pal:{a:'#fff0f6', b:'#ffb8d5'}, feat:['pirottino', 'panna']},
    cometa:     {n:'Cometina',       e:'☄️', r:2, line:'stelle', shape:'stella', pal:{a:'#6d7fe0', b:'#26306e'}, pat:'stelle', pc:'#ffe9a0', dark:true},
    batuffolo:  {n:'Batuffolo',      e:'☁️', r:2, line:'nuvole', shape:'nuvola', pal:{a:'#ffffff', b:'#b5d8ff'}, feat:['ciuffo']},
    vitellino:  {n:'Vitellino',      e:'🐄', r:2, line:'maculato', shape:'mochi', pal:{a:'#ffffff', b:'#ddd2ca'}, feat:['mucca'], pat:'macchie', pc:'rgba(70,55,55,.8)'},
    unicorno:   {n:'Unicornino',     e:'🦄', r:3, line:'arcobaleno', shape:'cuore', pal:{a:'#ffffff', b:'#f0d9ff'}, feat:['corno'], pat:'arcobaleno'},
    satellino:  {n:'Satellino',      e:'🛰️', r:3, line:'galassia', shape:'tondo', pal:{a:'#7c6ed6', b:'#2c2470'}, feat:['anello', 'antenne'], pat:'stelle', pc:'#fff3b0', dark:true},
    fiocco:     {n:'Fiocco di neve', e:'❄️', r:3, line:'cristallo', shape:'fiore6', pal:{a:'#f7fdff', b:'#9fd4ff'}, feat:['fiocco']},
    draghino:   {n:'Draghino',       e:'🐉', r:4, line:'drago', shape:'pera', pal:{a:'#ffb37a', b:'#f0552e'}, feat:['cresta', 'cornini', 'ali']}
  },
  adult: {
    iride:      {n:'Nuvola Arcobaleno',    e:'🌈', r:1, line:'righe', way:'care', base:'nuvola',      shape:'nuvola',   pal:{a:'#ffffff', b:'#d8ccff'}, pat:'arcobaleno'},
    getto:      {n:'Getto',                e:'💦', r:1, line:'righe', way:'play', base:'razzo',       shape:'goccia',   pal:{a:'#d6efff', b:'#2f8fe0'}, feat:['goccia'], pat:'gocce', pc:'rgba(255,255,255,.7)'},
    cuorpanna:  {n:'Cuor di Panna',        e:'🍰', r:1, line:'cuori', way:'care', base:'budino',      shape:'cuore',    pal:{a:'#fff6ee', b:'#ffc0d2'}, feat:['panna']},
    cupido:     {n:'Cupido',               e:'🏹', r:1, line:'cuori', way:'play', base:'saltimbanco', shape:'cuore',    pal:{a:'#ffe6ef', b:'#ff5c8d'}, feat:['ali', 'cuore']},
    alberello:  {n:'Alberello',            e:'🌳', r:1, line:'foglie', way:'care', base:'bocciolo',   shape:'nuvola',   pal:{a:'#e3ffd2', b:'#5fbf5a'}, feat:['foglia']},
    boschivo:   {n:'Esploratore dei Boschi', e:'🌰', r:1, line:'foglie', way:'play', base:'esploratore', deco:true, shape:'pera',  pal:{a:'#f1dcc0', b:'#a0703f'}},
    cioccolato: {n:'Budino al cioccolato', e:'🍫', r:2, line:'zigzag', way:'care', base:'budino', deco:true,     shape:'campana',  pal:{a:'#e6bf98', b:'#8a5532'}},
    leccalecca: {n:'Lecca-lecca',          e:'🍭', r:2, line:'zigzag', way:'play', base:'pallino',    shape:'tondo',    pal:{a:'#fff0f7', b:'#ff8fc0'}, pat:'spirale', pc:'rgba(255,255,255,.75)'},
    aurora:     {n:'Lumino Aurora',        e:'🌠', r:2, line:'stelle', way:'care', base:'lumino',     shape:'stella4',  pal:{a:'#6fd8c6', b:'#3c3f9e'}, dark:true},
    supernova:  {n:'Supernova',            e:'💫', r:2, line:'stelle', way:'play', base:'stellino',   shape:'stella',   pal:{a:'#ffe0f0', b:'#ff7fbf'}},
    cumulo:     {n:'Cumulo',               e:'☁️', r:2, line:'nuvole', way:'care', base:'nuvola',     shape:'nuvola',   pal:{a:'#ffffff', b:'#cfe6ff'}, feat:['ciuffo']},
    temporale:  {n:'Temporale',            e:'⛈️', r:2, line:'nuvole', way:'play', base:'razzo',      shape:'nuvola',   pal:{a:'#9fb0cf', b:'#4a5878'}, feat:['saetta'], dark:true},
    mucchina:   {n:'Mucchina dei Fiori',   e:'🌼', r:2, line:'maculato', way:'care', base:'bocciolo', shape:'mochi',    pal:{a:'#ffffff', b:'#ffd6e4'}, feat:['mucca'], pat:'macchie', pc:'rgba(255,130,170,.6)'},
    torello:    {n:'Torello',              e:'🐂', r:2, line:'maculato', way:'play', base:'pallino',  shape:'mochi',    pal:{a:'#e8c8a8', b:'#9a6038'}, feat:['cornini'], pat:'macchie', pc:'rgba(60,35,25,.6)'},
    unicornone: {n:'Unicorno',             e:'🦄', r:3, line:'arcobaleno', way:'care', base:'gelatina', shape:'uovo',   pal:{a:'#ffffff', b:'#ecdcff'}, feat:['corno'], pat:'arcobaleno'},
    pegaso:     {n:'Pegaso',               e:'🪽', r:3, line:'arcobaleno', way:'play', base:'saltimbanco', shape:'uovo', pal:{a:'#f6f0ff', b:'#bfa6ff'}, feat:['corno', 'ali']},
    galattica:  {n:'Gelatina Galattica',   e:'🌌', r:3, line:'galassia', way:'care', base:'gelatina', shape:'goccia',   pal:{a:'#8a77e0', b:'#2a2060'}, pat:'stelle', pc:'#fff3b0', dark:true},
    spaziale:   {n:'Razzo Spaziale',       e:'🛸', r:3, line:'galassia', way:'play', base:'razzo',    shape:'goccia',   pal:{a:'#f2f5fa', b:'#a3b4cc'}},
    cristneve:  {n:'Cristallo di Neve',    e:'❄️', r:3, line:'cristallo', way:'care', base:'lumino',  shape:'diamante', pal:{a:'#f4fdff', b:'#9fdcff'}, feat:['fiocco'], pat:'cristallo'},
    prisma:     {n:'Prisma',               e:'🔷', r:3, line:'cristallo', way:'play', base:'stellino', shape:'diamante', pal:{a:'#ffffff', b:'#c9e4ff'}, pat:'arcobaleno'},
    dragoluna:  {n:'Drago Lunare',         e:'🌙', r:4, line:'drago', way:'care', base:'lumino',      shape:'pera',     pal:{a:'#8f7fe0', b:'#3a2c86'}, feat:['cresta', 'cornini', 'ali'], pat:'stelle', pc:'#fff3b0', dark:true},
    dragofuoco: {n:'Drago di Fuoco',       e:'🔥', r:4, line:'drago', way:'play', base:'razzo',       shape:'pera',     pal:{a:'#ffb070', b:'#e0352a'}, feat:['cresta', 'cornini', 'ali']}
  }
};
/* linee evolutive: ogni uovo ha la sua; coccole o gioco decidono l'adulto */
const LINES = {pois:{n:'Classica', e:'🐣'}, righe:{n:'Pioggia', e:'💧'}, cuori:{n:'Amore', e:'💗'}, foglie:{n:'Bosco', e:'🌿'}, zigzag:{n:'Dolci', e:'🍬'}, stelle:{n:'Stelle', e:'🌟'},
  nuvole:{n:'Cielo', e:'☁️'}, maculato:{n:'Fattoria', e:'🐮'}, arcobaleno:{n:'Arcobaleno', e:'🌈'}, galassia:{n:'Spazio', e:'🪐'}, cristallo:{n:'Ghiaccio', e:'💎'}, drago:{n:'Drago', e:'🐲'}};
const lineOf = b => (b && (b.bv || b.egg)) || 'pois';
const lineChild = line => Object.keys(VARS.child).find(k => VARS.child[k].line === line);
const lineAdult = (line, way) => Object.keys(VARS.adult).find(k => VARS.adult[k].line === line && VARS.adult[k].way === way);
/* forme del corpo: punto sul contorno per l'angolo a (0 = destra, giù = positivo) */
function shapeXY(shape, a){
  let x = Math.cos(a), y = Math.sin(a); const k = (y + 1) / 2;
  switch (shape){
    case 'stella': { const r = .8 + .28*Math.cos(5*(a + Math.PI/2)); x *= r * 1.05; y *= r * 1.05; break; }
    case 'stella4': { const c4 = Math.cos(4*(a + Math.PI/2)), r = .74 + .36*Math.sign(c4)*Math.pow(Math.abs(c4), 1.6); x *= r * 1.08; y *= r * 1.08; break; }
    case 'pera': x *= .58 + .52*k; if (y < 0) y *= 1.12; break;
    case 'campana': x *= .74 + .34*k; if (y < 0) y *= .95; break;
    case 'fragola': x *= 1.12 - .38*k; break;
    case 'cuore': { const th = a + Math.PI/2, X = 16*Math.pow(Math.sin(th), 3), Y = 13*Math.cos(th) - 5*Math.cos(2*th) - 2*Math.cos(3*th) - Math.cos(4*th); x = X / 15; y = -(Y + 2.5) / 14; break; }
    case 'goccia': if (y < 0){ x *= Math.pow(1 + y, .55); y *= 1.32; } break;
    case 'nuvola': { if (y < .35){ const r = 1 + .1*Math.abs(Math.cos(a*3.5)); x *= r; y *= r; } break; }
    case 'triangolo': { const r = .86 + .17*Math.cos(3*(a + Math.PI/2)); x *= r * 1.05; y *= r * 1.05; break; }
    case 'cubo': x = Math.sign(x)*Math.pow(Math.abs(x), .3)*.92; y = Math.sign(y)*Math.pow(Math.abs(y), .3)*.92; break;
    case 'mochi': x *= 1.14; y *= .8; break;
    case 'fiore': { const r = .86 + .16*Math.abs(Math.cos(2.5*(a + Math.PI/2))); x *= r * 1.04; y *= r * 1.04; break; }
    case 'fiore6': { const r = .88 + .14*Math.abs(Math.cos(3*(a + Math.PI/2))); x *= r * 1.03; y *= r * 1.03; break; }
    case 'diamante': { const d = Math.abs(x) + Math.abs(y); x = (x / d * .7 + x * .3) * 1.12; y = (y / d * .7 + y * .3) * 1.18; break; }
    case 'uovo': x *= .84; if (y < 0) y *= 1.2; break;
  }
  return [x, y];
}
const shapeOf = b => { const V = varOf(b); return (V && V.shape) || 'tondo'; };
const shapeTop = sh => sh === 'cuore' ? -.62 : shapeXY(sh, -Math.PI/2)[1];
const FACE_DY = {pera:.14, campana:.08, goccia:.16, triangolo:.14, fragola:-.04, mochi:.06, stella:.06, stella4:.06, diamante:.04, uovo:.02, cuore:.02, cubo:.02};
const ADULT_R = {nuvola:1, budino:1, bocciolo:1, stellino:1, razzo:1, pallino:1, gelatina:2, lumino:2, esploratore:2, saltimbanco:2, muschio:3, ombra:3};
const ADULT_ORDER = ['nuvola','budino','bocciolo','gelatina','lumino','stellino','razzo','pallino','esploratore','saltimbanco','muschio','ombra'];
function dexList(st){
  if (st === 'adult') return [...ADULT_ORDER, ...Object.keys(VARS.adult)];
  return Object.keys(VARS[st]);
}
function dexInfo(st, k){
  if (st === 'adult' && FORMS[k]) return {n: FORMS[k].n, e: FORMS[k].e, r: ADULT_R[k] || 1};
  const V = VARS[st][k]; return {n: V.n, e: V.e || '🥚', r: V.r};
}
function specOf(st, k){
  const b = {id:'dex_' + st + k, stage: st, egg:'pois', bv:'pois', cv:null, childForm:null, form:null, av:null, shiny:false, hat:null, face:null, neck:null, back:null};
  if (st === 'egg') b.egg = k; else if (st === 'baby') b.bv = k;
  else if (st === 'child'){ b.cv = k; b.childForm = VARS.child[k].fam || 'morbidello'; b.bv = VARS.child[k].line || 'pois'; b.egg = b.bv; }
  else if (FORMS[k]) b.form = k; else { b.av = k; b.form = VARS.adult[k].base; b.bv = b.egg = VARS.adult[k].line; b.cv = lineChild(b.bv); b.childForm = VARS.adult[k].way === 'play' ? 'saltello' : 'morbidello'; }
  return b;
}

export {
  ADULT_ORDER, ADULT_R, FACE_DY, FORMS, LINES, RAR, SHINY, STATS, VARS, dexInfo, dexList, lineAdult,
  lineChild, lineOf, rarStars, shapeOf, shapeTop, shapeXY, specOf, statColor, statIcon
};
