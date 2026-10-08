/* ================= catalogo: stanze, cibi, accessori, mobili, giochi, luoghi, figurine, livelli, missioni ================= */
const ROOM_NAMES = ['Cameretta', 'Stanza dei giochi', 'Soffitta', 'Serra'];
const ROOM_PRICES = [0, 0, 120, 250];
const THEMES = {rosa:{n:'Rosa', h:330}, menta:{n:'Menta', h:160}, lilla:{n:'Lilla', h:270}, cielo:{n:'Cielo', h:205}, pesca:{n:'Pesca', h:22}, limone:{n:'Limone', h:52}};
const BRANCHES = {
  nuvola:  {name:'Nuvola',  desc:'morbido e sereno, cresciuto con tante attenzioni'},
  stellino:{name:'Stellino',desc:'pieno di energia, adora giocare'},
  budino:  {name:'Budino',  desc:'goloso e coccolone'},
  muschio: {name:'Muschio', desc:'un po\' timido, ha imparato a cavarsela da solo'}
};
const FOODS = {
  acqua:   {e:'💧', n:'Acqua',       price:0,  hunger:0,  fun:0, thirst:35, drink:true},
  pappa:   {e:'🥣', n:'Pappa',       price:0,  hunger:22, fun:0},
  mela:    {e:'🍎', n:'Mela',        price:4,  hunger:18, fun:4,  health:4},
  carota:  {e:'🥕', n:'Carota',      price:4,  hunger:16, fun:2,  health:6},
  fragola: {e:'🍓', n:'Fragola',     price:6,  hunger:12, fun:12, sweet:true},
  biscotto:{e:'🍪', n:'Biscotto',    price:5,  hunger:10, fun:12, sweet:true},
  onigiri: {e:'🍙', n:'Onigiri',     price:7,  hunger:35, fun:6},
  zuppa:   {e:'🍲', n:'Zuppa calda', price:8,  hunger:30, fun:4,  health:12},
  budino:  {e:'🍮', n:'Budino',      price:8,  hunger:14, fun:18, sweet:true},
  pizzetta:{e:'🍕', n:'Pizzetta',    price:9,  hunger:40, fun:10},
  gelato:  {e:'🍦', n:'Gelato',      price:10, hunger:12, fun:22, sweet:true, thirst:6}
};
const FREE = ['acqua','pappa'];
const TASTY = Object.keys(FOODS).filter(k => !FREE.includes(k));
const ACC = {
  fiore:{slot:'head', n:'Fiore', price:25, e:'🌸'},
  fiocco:{slot:'head', n:'Fiocco', price:30, e:'🎀'},
  festa:{slot:'head', n:'Cappellino da festa', price:35, e:'🥳', draw:'party'},
  berretto:{slot:'head', n:'Berretto', price:40, e:'🧢'},
  pompon:{slot:'head', n:'Cuffia col pompon', price:40, e:'🧶', draw:'beanie'},
  paglia:{slot:'head', n:'Cappello di paglia', price:45, e:'👒'},
  gatto:{slot:'head', n:'Orecchie da gatto', price:50, e:'🐱', draw:'cat'},
  cuoco:{slot:'head', n:'Cappello da cuoco', price:55, e:'🍳', draw:'chef'},
  cilindro:{slot:'head', n:'Cilindro', price:60, e:'🎩'},
  ghirlanda:{slot:'head', n:'Ghirlanda di fiori', price:65, e:'💐', draw:'flowercrown'},
  tocco:{slot:'head', n:'Tocco da laureato', price:70, e:'🎓'},
  mago:{slot:'head', n:'Cappello da mago', price:80, e:'🧙', draw:'wizard'},
  corona:{slot:'head', n:'Coroncina', price:90, e:'👑'},
  unicorno:{slot:'head', n:'Corno di unicorno', price:120, e:'🦄', draw:'unicorn'},
  aureola:{slot:'head', n:'Aureola', price:150, e:'😇', draw:'halo'},
  stellina:{slot:'head', n:'Stellina', price:0, lv:6, e:'🌟'},
  baffi:{slot:'face', n:'Baffoni', price:30, e:'🥸', draw:'mustache'},
  occhiali:{slot:'face', n:'Occhiali tondi', price:35, e:'👓', draw:'round'},
  sole:{slot:'face', n:'Occhiali da sole', price:50, e:'🕶️', draw:'sun'},
  maschera:{slot:'face', n:'Mascherina da eroe', price:55, e:'🦸', draw:'mask'},
  cuoricini:{slot:'face', n:'Occhiali a cuore', price:60, e:'😍', draw:'heart'},
  monocolo:{slot:'face', n:'Monocolo', price:70, e:'🧐', draw:'monocle'},
  papillon:{slot:'neck', n:'Papillon', price:30, e:'🎀', draw:'bowtie'},
  bandana:{slot:'neck', n:'Bandana', price:35, e:'🟥', draw:'bandana'},
  sciarpa:{slot:'neck', n:'Sciarpa', price:40, e:'🧣', draw:'scarf'},
  campanella:{slot:'neck', n:'Campanella', price:45, e:'🔔', draw:'bell'},
  perle:{slot:'neck', n:'Collana di perle', price:75, e:'📿', draw:'pearls'},
  medaglia:{slot:'neck', n:'Medaglia d\'oro', price:200, e:'🏅', draw:'medal'},
  zainetto:{slot:'back', n:'Zainetto', price:50, e:'🎒', draw:'backpack'},
  palloncino:{slot:'back', n:'Palloncino legato', price:60, e:'🎈', draw:'balloon', float:true},
  mantello:{slot:'back', n:'Mantello da eroe', price:90, e:'🧥', draw:'cape'},
  farfalla:{slot:'back', n:'Ali di farfalla', price:110, e:'🦋', draw:'bfly', float:true},
  ali:{slot:'back', n:'Ali d\'angelo', price:140, e:'🪽', draw:'wings', float:true}
};
/* Set dell'Accademia di Magia: quattro circoli originali, ognuno con cappello, tunica e medaglione */
const ACAD_PRICE = 600;
const CIRCLES = {
  cometa:  {n:'Cometa',   e:'☄️', a:'#6a4fc8', d:'#3f2c86', b:'#d9dff0', em:'star',  m:'Sognatori e curiosi: guardano sempre in alto.'},
  brace:   {n:'Brace',    e:'🔥', a:'#ff7a33', d:'#c2481a', b:'#fff0d2', em:'flame', m:'Calorosi e coraggiosi: scaldano chiunque.'},
  marea:   {n:'Marea',    e:'🌊', a:'#16a9a1', d:'#0b6f6a', b:'#ff9c86', em:'wave',  m:'Calmi e gentili: vanno d\'accordo con tutti.'},
  lucciola:{n:'Lucciola', e:'✨', a:'#4cbf7f', d:'#24804f', b:'#ffe066', em:'glow',  m:'Allegri e brillanti: illuminano la notte.'}
};
for (const c in CIRCLES){
  const C = CIRCLES[c];
  ACC['acad_' + c + '_cap']  = {slot:'head', n:`Cappello · ${C.n}`,   price:0, set:'acad', circle:c, e:'🧙', draw:'acadcap'};
  ACC['acad_' + c + '_med']  = {slot:'neck', n:`Medaglione · ${C.n}`, price:0, set:'acad', circle:c, e:'🏅', draw:'acadmed'};
  ACC['acad_' + c + '_robe'] = {slot:'back', n:`Tunica · ${C.n}`,     price:0, set:'acad', circle:c, e:'🧥', draw:'acadrobe'};
}
const acadIds = c => ['acad_' + c + '_cap', 'acad_' + c + '_med', 'acad_' + c + '_robe'];
const HATS = ACC;
const SLOTS = {head:'Testa', face:'Viso', neck:'Collo', back:'Schiena'};
const slotKey = id => ACC[id].slot === 'head' ? 'hat' : ACC[id].slot;
const FURN = {
  orso:{n:'Orsetto', price:40, kind:'floor', e:'🧸', s:.15, x:.08, d:'Ci va ad abbracciarlo da solo.'},
  cactus:{n:'Cactus', price:30, kind:'floor', e:'🌵', s:.16, x:.7, d:'Lo tocca sempre. Non impara mai.'},
  girasole:{n:'Girasole', price:35, kind:'floor', e:'🌻', s:.22, x:.84, d:'Allegro e sempre rivolto verso di lui.'},
  radio:{n:'Radiolina', price:50, kind:'floor', e:'📻', s:.1, x:.75, d:'Ogni tanto ci balla davanti.'},
  pianta:{n:'Pianta grande', price:55, kind:'floor', e:'🪴', s:.2, x:.93, d:'La annusa… e starnutisce.'},
  cuscino:{n:'Cuscino a cuore', price:45, kind:'floor', draw:true, s:.08, x:.35, wf:1.8, d:'Ci si siede sopra a riposare.'},
  lampada:{n:'Lampada lava', price:65, kind:'floor', draw:true, s:.2, x:.2, wf:.45, d:'Bolle colorate che salgono e scendono.'},
  specchio:{n:'Specchio', price:70, kind:'floor', draw:true, s:.32, x:.12, wf:.55, special:true, d:'Ci si specchia e si fa i complimenti.'},
  letto:{n:'Lettino', price:90, kind:'floor', draw:true, s:.13, x:.27, wf:2.6, special:true, d:'Ci dorme sotto la copertina e recupera più energia.'},
  tenda:{n:'Tenda indiana', price:100, kind:'floor', draw:true, s:.3, x:.86, wf:.85, special:true, d:'Ci si nasconde dentro: toccala per trovarlo!'},
  trampolino:{n:'Trampolino', price:120, kind:'floor', draw:true, s:.09, x:.62, wf:2.6, special:true, d:'Ci salta sopra da solo. Lancialo lì per rimbalzi altissimi!'},
  piscina:{n:'Piscina di palline', price:150, kind:'floor', draw:true, s:.11, x:.42, wf:2.6, special:true, d:'Ci si tuffa dentro tra le palline colorate.'},
  palla:{n:'Palla', price:20, kind:'floor', draw:true, s:.09, x:.3, wf:1, special:true, d:'La rincorre, la calcia e (con l\'amicizia) te la riporta.'},
  canestro:{n:'Canestro', price:60, kind:'wall', draw:true, s:.2, x:.5, y:.4, wf:.9, special:true, d:'Tiri a canestro, schiacciate e lui che prova da solo.'},
  quadro:{n:'Quadro', price:30, kind:'wall', e:'🖼️', s:.12, x:.62, y:.18, d:'Lo guarda e fa il critico d\'arte.'},
  lanterna:{n:'Lanterna', price:45, kind:'wall', e:'🏮', s:.09, x:.9, y:.235, d:'Fa luce calda di notte.'},
  ritratto:{n:'Ritratto', price:50, kind:'wall', draw:true, s:.14, x:.2, y:.55, wf:.8, d:'Un ritratto di chi abita la stanza.'},
  lucine:{n:'Lucine', price:60, kind:'wall', draw:true, s:.06, x:.5, y:.06, wf:8, d:'Una fila di lucine colorate che brillano.'},
  orologio:{n:'Orologio a cucù', price:80, kind:'wall', draw:true, s:.14, x:.42, y:.18, wf:.8, d:'Segna l\'ora vera, col pendolo.'},
  acquario:{n:'Acquario', price:130, kind:'wall', draw:true, s:.14, x:.78, y:.5, wf:1.6, special:true, d:'Pesciolini da guardare insieme.'}
};
const RUGS = {
  rosa:{n:'Classico', price:0}, prato:{n:'Prato fiorito', price:35}, scacchi:{n:'A scacchi', price:40},
  nuvola:{n:'Nuvola soffice', price:45}, stelle:{n:'Cielo stellato', price:50}, arcobaleno:{n:'Arcobaleno', price:60}
};
const GAMES = {
  memory:{e:'🎨', n:'Memory dei colori', d:'Ripeti la sequenza che si illumina.', unit:'round'},
  catch: {e:'🧺', n:'Acchiappa la pappa', d:'Prendi il cibo che cade. Evita la cacca!', unit:'punti'},
  hide:  {e:'📦', n:'Nascondino', d:'Segui la scatola dove si nasconde.', unit:'di fila'}
};
const PLACES = {
  parco:{e:'🌳', n:'Parco', dove:'al parco', min:15, energy:10, coins:[3,8],  chance:.5,
    stickers:['scoiattolo','foglia','palloncino','coccinella'],
    stories:[n=>`${n} ha rincorso le foglie finché non gli è girata la testa.`, n=>`${n} ha fatto amicizia con un bambino che mangiava un gelato.`, n=>`${n} ha dormito dieci minuti su una panchina al sole.`, n=>`${n} ha provato lo scivolo. Due volte. Poi tre.`]},
  lago: {e:'🦆', n:'Lago',  dove:'al lago',  min:30, energy:16, coins:[6,14], chance:.6,
    stickers:['anatroccolo','sasso','conchiglia','ninfea'],
    stories:[n=>`${n} ha guardato le anatre per mezz'ora senza muoversi.`, n=>`${n} ha provato a far rimbalzare un sasso. Il sasso non era d'accordo.`, n=>`${n} si è specchiato nell'acqua e si è fatto una linguaccia.`, n=>`${n} ha contato le barchette: sette, forse otto.`]},
  bosco:{e:'🌲', n:'Bosco', dove:'nel bosco', min:60, energy:24, coins:[10,22], chance:.75,
    stickers:['fungo','lucciola','gufo','pigna'],
    stories:[n=>`${n} ha seguito un sentiero di funghi fino a una radura segreta.`, n=>`${n} ha sentito un gufo e ha risposto “uh uh”. Sono amici adesso.`, n=>`${n} si è perso per un attimo, poi ha ritrovato la strada seguendo le lucciole.`, n=>`${n} ha raccolto castagne e ne ha mangiate metà per strada.`]}
};
const STICKERS = {
  farfalla:{e:'🦋',n:'Farfalla',how:'Prendila in cameretta'}, bolle:{e:'🫧',n:'Tutte le bolle',how:'Scoppiale tutte'},
  tesoro:{e:'💎',n:'Tesoro',how:'Cerca dove luccica'}, stella:{e:'🌠',n:'Stella cadente',how:'Di notte, alla finestra'},
  arcobaleno:{e:'🌈',n:'Arcobaleno',how:'Di giorno, alla finestra'}, amico:{e:'👋',n:'Un amico',how:'Saluta chi viene a trovarlo'},
  pioggia:{e:'💫',n:'Pioggia di stelle',how:'Raccogline tante'}, topolino:{e:'🐭',n:'Topolino',how:'Acchiappa il ladruncolo'},
  fantasmino:{e:'👻',n:'Fantasmino',how:'Di notte, scaccialo'}, temporale:{e:'⛈️',n:'Temporale',how:'Calmalo con le coccole'},
  lettera:{e:'💌',n:'Posta!',how:'Leggi una lettera'}, uccellino:{e:'🐦',n:'Uccellino',how:'Salutalo alla finestra'},
  canestro:{e:'🏀',n:'Cecchino',how:'Fai 10 canestri'}, schiacciata:{e:'💥',n:'Schiacciata',how:'Lancia il blob nel canestro'},
  forziere:{e:'🧰',n:'Missione compiuta',how:'Completa le missioni del giorno'},
  amiciblob:{e:'🤝',n:'Amici per la pelle',how:'Due blob diventano migliori amici'},
  scoiattolo:{e:'🐿️',n:'Scoiattolo',how:'Al parco'}, foglia:{e:'🍁',n:'Foglia rossa',how:'Al parco'},
  palloncino:{e:'🎈',n:'Palloncino',how:'Al parco'}, coccinella:{e:'🐞',n:'Coccinella',how:'Al parco'},
  anatroccolo:{e:'🐥',n:'Anatroccolo',how:'Al lago'}, sasso:{e:'🪨',n:'Sasso piatto',how:'Al lago'},
  conchiglia:{e:'🐚',n:'Conchiglia',how:'Al lago'}, ninfea:{e:'🪷',n:'Ninfea',how:'Al lago'},
  fungo:{e:'🍄',n:'Fungo magico',how:'Nel bosco'}, lucciola:{e:'✨',n:'Lucciole',how:'Nel bosco'},
  gufo:{e:'🦉',n:'Gufo saggio',how:'Nel bosco'}, pigna:{e:'🌰',n:'Castagna',how:'Nel bosco'},
  schiusa:{e:'🐣',n:'Benvenuto',how:'Schiudi l\'uovo'}, desiderio:{e:'💭',n:'Primo desiderio',how:'Esaudisci un desiderio'},
  desideri10:{e:'🌟',n:'Dieci desideri',how:'Esaudisci 10 desideri'}, gusti:{e:'🔍',n:'Lo conosci bene',how:'Scopri tutti i gusti'},
  memory8:{e:'🧠',n:'Super memoria',how:'Memory: 8 round'}, catch25:{e:'🧺',n:'Mani veloci',how:'Acchiappa: 25 punti'},
  hide5:{e:'🕵️',n:'Occhio di falco',how:'Nascondino: 5 di fila'}, settimana:{e:'📅',n:'Una settimana',how:'7 giorni di fila'},
  migliori:{e:'💞',n:'Migliori amici',how:'Amicizia livello 10'},
  evo_nuvola:{e:'☁️',n:'Nuvola',how:'Evoluzione segreta'}, evo_stellino:{e:'⭐',n:'Stellino',how:'Evoluzione segreta'},
  evo_budino:{e:'🍮',n:'Budino',how:'Evoluzione segreta'}, evo_muschio:{e:'🌿',n:'Muschio',how:'Evoluzione segreta'}
};
const LEVELS = [
  {xp:0,    e:'👋', t:'Coccole, solletico e lanci', how:'Strofina il dito sul blob. Strofina veloce per il solletico. Tienilo premuto e lancialo.'},
  {xp:25,   e:'🙋', t:'Trucco: saluto', trick:'wave', how:'Tocca due volte il blob'},
  {xp:70,   e:'🤸', t:'Trucco: salto mortale', trick:'jump', how:'Scorri verso l\'alto partendo dal blob'},
  {xp:140,  e:'⚽', t:'Ti riporta la palla', perk:'fetch', how:'Lancia la palla: te la riporta e a volte trova una stellina'},
  {xp:230,  e:'🌀', t:'Trucco: giravolta', trick:'spin', how:'Disegna un cerchio intorno al blob'},
  {xp:350,  e:'🌟', t:'Regalo: cappellino Stellina', perk:'hat', how:'Lo trovi gratis nel negozio'},
  {xp:500,  e:'💃', t:'Trucco: balletto', trick:'dance', how:'Tocca tre volte il blob'},
  {xp:680,  e:'🎁', t:'Ti lascia dei regali', perk:'gifts', how:'Ogni tanto trovi un pacchetto sul pavimento'},
  {xp:900,  e:'🛞', t:'Trucco: capriola', trick:'roll', how:'Scorri di lato partendo dal blob'},
  {xp:1200, e:'💞', t:'Migliori amici', perk:'aura', how:'Un\'aura arcobaleno e una figurina speciale'}
];
const DAYMOODS = {
  giocherellone:{e:'🤪', n:'Giocherellone', d:'Oggi vuole giocare a palla e volare in alto.', wish:{ball:3, throw:3, hoop:2}, beh:{ball:3, shoot:3}},
  coccolone:{e:'🥰', n:'Coccolone', d:'Oggi ti cerca di continuo per le coccole.', wish:{cuddle:4, tickle:3}, beh:{attention:4, look:2}},
  goloso:{e:'😋', n:'Goloso', d:'Oggi pensa solo al cibo.', wish:{food:4}, beh:{}},
  curioso:{e:'🧐', n:'Curioso', d:'Oggi succedono più sorprese del solito.', wish:{walk:3}, beh:{window:3}, ev:.6},
  combinaguai:{e:'😈', n:'Combinaguai', d:'Oggi ne combina di tutti i colori.', wish:{}, beh:{mischief:5, tail:2}},
  dormiglione:{e:'😴', n:'Dormiglione', d:'Oggi se la prende comoda.', wish:{cuddle:2}, beh:{yawn:3, idle:3}},
  artista:{e:'🎨', n:'Artista', d:'Oggi canta e disegna sui muri.', wish:{trick:3}, beh:{sing:5, mischief:2}},
  sportivo:{e:'🏀', n:'Sportivo', d:'Oggi vuole fare canestro.', wish:{hoop:3, dunk:3}, beh:{shoot:6}}
};
const MISSIONS = {
  bounceWall:{t:'Fallo rimbalzare contro i muri', n:5, e:'🧱'},
  ceiling:{t:'Lancialo fino al soffitto', n:1, e:'🚀'},
  hoop:{t:'Fai canestro con la palla', n:3, e:'🏀'},
  dunk:{t:'Lancia il blob dentro il canestro', n:1, e:'💥'},
  kicks:{t:'Fagli calciare la palla', n:8, e:'⚽'},
  tickle:{t:'Fallo ridere col solletico', n:15, e:'🤭'},
  pets:{t:'Fagli tante carezze', n:40, e:'🤗'},
  events:{t:'Approfitta delle sorprese', n:3, e:'🎉'},
  feedHand:{t:'Dagli da mangiare a mano', n:3, e:'🍽️'},
  newFood:{t:'Fagli assaggiare cibi diversi', n:2, e:'🍓'},
  clean:{t:'Pulisci cacche o pasticci', n:2, e:'🧹'},
  tricks:{t:'Fagli fare dei trucchi', n:3, e:'✨', lv:2},
  trickVar:{t:'Fagli fare trucchi diversi', n:2, e:'🎪', lv:3},
  games:{t:'Gioca a minigiochi diversi', n:2, e:'🎮'},
  record:{t:'Supera un tuo record in un minigioco', n:1, e:'🏆'},
  memory5:{t:'Arriva al round 5 a Memory', n:1, e:'🎨'},
  catch15:{t:'Fai 15 punti ad Acchiappa', n:1, e:'🧺'},
  hide3:{t:'Trovalo 3 volte di fila a Nascondino', n:1, e:'📦'},
  walk:{t:'Portalo a fare una passeggiata', n:1, e:'🌳'},
  wish:{t:'Esaudisci dei desideri', n:2, e:'💭'},
  airtime:{t:'Tienilo in aria 2 secondi di fila', n:1, e:'🎈'},
  catchBall:{t:'Afferra la palla mentre vola', n:2, e:'🫴'},
  social:{t:'Fai giocare insieme due blob', n:3, e:'🤝', multi:true}
};
const LETTERS = [
  {from:'Lumaca Ugo', e:'🐌', m:n=>`Caro ${n}, sono partito martedì per venirti a trovare. Dovrei arrivare verso marzo. Tienimi da parte un biscotto.`},
  {from:'Nonna Gelatina', e:'🍮', m:n=>`Tesoro ${n}, mi raccomando: mangia la verdura e non rimbalzare sui mobili. Ti mando un pensierino.`},
  {from:'Il gufo del bosco', e:'🦉', m:n=>`Uh uh, ${n}. Stanotte la luna era tonda come te. Volevo solo dirtelo.`},
  {from:'Pippo il palloncino', e:'🎈', m:n=>`Ciao ${n}! Sono volato via dal parco e ora vedo tutto da quassù. Le case sembrano biscotti.`},
  {from:'Un fan misterioso', e:'🕵️', m:n=>`Ho visto ${n} fare una capriola dalla finestra. Dieci e lode. Firmato: nessuno.`},
  {from:'La nuvola Fiocco', e:'☁️', m:n=>`${n}, domani passo sopra casa tua. Se piove un po' scusami, è che starnutisco.`},
  {from:'Cugino Blobbone', e:'🫠', m:n=>`Ehi ${n}! Ho imparato a stare in equilibrio su un piede. Non ho piedi, ma ci ho provato lo stesso.`},
  {from:'Il postino', e:'📮', m:n=>`Gentile ${n}, questa lettera non era per te, ma era troppo carina per non consegnarla. Buona giornata.`},
  {from:'Anatroccolo Bice', e:'🐥', m:n=>`Qua qua ${n}! Al lago ti aspettiamo. Porta le briciole, quelle buone.`},
  {from:'La fatina dei denti', e:'🧚', m:n=>`Caro ${n}, mi dicono che non hai denti. Ti lascio lo stesso una stellina, per sicurezza.`},
  {from:'Il topolino', e:'🐭', m:n=>`Scusa ${n} per quella volta del biscotto. Era buonissimo, però. Pace?`},
  {from:'Il sole', e:'☀️', m:n=>`Buongiorno ${n}! Domani mi alzo presto apposta per entrare dalla tua finestra.`}
];
const TRICK_NAME = {wave:'il saluto', jump:'il salto mortale', spin:'la giravolta', dance:'il balletto', roll:'la capriola'};

export {
  ACAD_PRICE, ACC, CIRCLES, DAYMOODS, FOODS, FREE, FURN, GAMES, HATS, LETTERS, LEVELS, MISSIONS,
  PLACES, ROOM_NAMES, ROOM_PRICES, RUGS, SLOTS, STICKERS, TASTY, THEMES, TRICK_NAME, acadIds, slotKey
};
