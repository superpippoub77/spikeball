// ============================================================
//  SPIKE FEVER '91 — remake fedele alla struttura di POWER SPIKES (Video System 1991)
//  Unità in pixel nativi, risoluzione 320x224 come la scheda arcade.
// ============================================================
// INDICE DEL FILE
//   1. titolo, autore, versione            5. GS: stato globale della partita arcade (gettoni, classifica)
//   2. CFG: tutte le costanti di gioco      6. PHYS: fisica balistica della palla
//   3. STAGES / TEAMS / HOMES                7. funzioni di utilità (rnd, clamp, SX, testi)
//   4. GFX: versione grafica (ARCADE/HD/3D)  8. camSetup: preparazione comune delle scene
//
// SISTEMA DI COORDINATE (vale per tutto il gioco):
//   x = posizione orizzontale in pixel nativi, 0 = rete; squadra sinistra x < 0 (side = -1), destra x > 0 (side = +1).
//   h / z = altezza dal pavimento (palla / giocatore), verso l'alto. Sullo schermo: y = CFG.FLOOR_Y - h.
//   SX(x) converte la x del campo nella x del mondo (il mondo è largo 2*CFG.OX, la telecamera scorre).
//   20 px = 1 metro (CFG.PPM). Tempi in secondi.
const GAME_TITLE = ['SPIKE', "FEVER '91"];     // titolo mostrato (modificabile)
const GAME_AUTHOR = 'SpikeCode AI';
const GAME_VERSION = '2.4.1';                  // da aggiornare a ogni rilascio
const PATTERN_TEXT = "S-FEVER'S Volleyball Simulator";

// ---- COSTANTI DI GIOCO: il posto giusto per regolare fisica, velocità e regole ----
// W/H: risoluzione nativa (320x224 come la scheda arcade); ZOOM: ingrandimento del canvas (3 = 960 px; in HD/3D diventa 6).
// RUN: velocità di corsa (px/s); DIVE_V: velocità del tuffo; NET_H: altezza della rete (52 px = 2,6 m).
// HALF: metà campo (180 px = 9 m); WORLD_HALF: metà mondo (fuori campo compreso); FLOOR_Y: y del pavimento sullo schermo.
// REACH / DIVE_REACH: distanza (px) entro cui un giocatore tocca la palla in piedi / in tuffo.
// PASS_LO/HI, SET_LO/HI: fasce di altezza della palla per bagher e alzata.
// SETTER_D: dove l'alzatore aspetta la palla (distanza dalla rete); SPIKE_SPEED: velocità base della schiacciata.
// STEP: passo della simulazione (1/120 s): la fisica avanza sempre a passi uguali, indipendenti dal frame rate.
// OX: spostamento orizzontale del campo nel mondo (vedi SX).
const CFG = {
  W: 320, H: 224, ZOOM: 3,
  PPM: 20,               // 1 m = 20 px
  G: 200,                // gravità palla px/s²
  PG: 425,               // 0,4 s per arrivare in cima, ~0,8 s in aria
  JUMP_V: 170,           // salto misurato sul video: ~34 px (quanto il giocatore)
  RUN: 88,
  DIVE_V: 160,
  NET_H: 52,
  HALF: 180,
  WORLD_HALF: 280,
  FLOOR_Y: 206,
  REACH: 12, DIVE_REACH: 38,
  PASS_LO: 3, PASS_HI: 27,
  SET_LO: 18, SET_HI: 56,
  REACH_UP: 46,          // altezza della mano a braccia alzate sopra i piedi
  HIT_H: 80,             // altezza di colpo in schiacciata (apice salto + braccio)
  SET_JUMP_H: 68,        // altezza di contatto dell'alzata in salto
  COUNT_STEP: 1.2,       // secondi per ogni numero del conto alla rovescia dell'arbitro
  SETTER_D: 30,
  SPIKE_SPEED: 430,
  SERVE_X: 255,          // il battitore sta ~4 m dietro la linea di fondo (video)
  JS_TAKEOFF: 196,       // battuta in salto: stacco sempre prima della linea di fondo (180)
  STEP: 1 / 120,
  OX: 280,
  // ---- regole dal manuale operatore ----
  TARGET: 15, WIN_BY: 2, CAP: 999,  // rally point moderno: set a 15 (tie-break) con 2 punti di scarto, senza tetto
  RALLY_START_SHIFT: 7,  // in rally point i punteggi di partenza 1P (12-12, 11-12...) si abbassano di 7: partite di durata simile
  SIDE_OUT: false,       // false = RALLY POINT (regola odierna: ogni azione vale un punto). true = cambio palla 1991
  MATCH_TIME: 180,       // 3 minuti (DIP: 3 o 2 minuti)
  SERVE_COUNT: 5,        // conto alla rovescia dell'arbitro
  START_2P: [9, 9],      // DIP: 9-9 / 7-7 / 5-5 / 0-0
  HARD: false,           // DIP difficoltà
  FREE_PLAY: false,      // true = niente gettoni
  TEST_MODE: false,      // true = sovraimpressione comandi sempre attiva (in partita si attiva/disattiva col tasto T)
  BEACH_HALF: 160,       // beach volley: campo di 8 x 8 m
  POINT_SCORE: 400,      // punti per ogni punto conquistato
  BONUS_PER_SEC: 100, BONUS_BASE: 2500
};

// Avversari della modalità 1 giocatore e punteggio di partenza (giocatore - CPU), come nel video
// skill = bravura della CPU (0-1): incide su ricezione, tempi del muro, errori in attacco.
const STAGES = [
  { team: 'CHN', start: [12, 12], label: '1ST MATCH', skill: 0.55 },
  { team: 'JPN', start: [11, 12], label: '2ND MATCH', skill: 0.63 },
  { team: 'USA', start: [10, 12], label: '3RD MATCH', skill: 0.71 },
  { team: 'CUB', start: [9, 12],  label: '4TH MATCH', skill: 0.79 },
  { team: 'URS', start: [8, 11],  label: 'FINAL',     skill: 0.87 }
];
const SELECTABLE = ['ITA', 'FRA', 'GER', 'GBR', 'ESP', 'SWE', 'NOR', 'DEN', 'BRA'];

// sh = maglia, tr = bordo, so = pantaloncini, ha = capelli, sk = pelle, fl = pavimento
// Nazionali. Per ogni squadra: name, colori (sh/tr/so), capelli dei 3 tipi di giocatore (ha), pelle (sk),
// nomi dei giocatori (names: i primi 4 sono quelli in campo), colore del pavimento nell'arena arcade (fl).
// Altre nazionali sono aggiunte in modern.js; i club e le squadre personalizzate in roster.js / league.js.
const TEAMS = {
  ITA: { name: 'ITALY',   sh: '#2a48d8', tr: '#ffffff', so: '#f4f4f4', ha: ['#5a2a10', '#2a1408', '#8a4a18'], sk: '#eeb088', names: ['MARCO', 'TEO', 'MARIO', 'JULIO', 'PAOLO', 'LUCA'], fl: 0x24a83a },
  FRA: { name: 'FRANCE',  sh: '#2a48d8', tr: '#e02828', so: '#f4f4f4', ha: ['#3a2010', '#c08a40', '#5a3010'], sk: '#f0b890', names: ['PAUL', 'ALAIN', 'LUC', 'HENRI', 'JEAN', 'MARC'], fl: 0x24a83a },
  GER: { name: 'GERMANY', sh: '#1a1a1a', tr: '#e0c020', so: '#f4f4f4', ha: ['#d8b060', '#8a5a20', '#e0c080'], sk: '#f2c0a0', names: ['HANS', 'ERIC', 'KARL', 'OTTO', 'UWE', 'JENS'], fl: 0xe0a040 },
  GBR: { name: 'BRITAIN', sh: '#f4f4f4', tr: '#2040b0', so: '#2040b0', ha: ['#a05020', '#3a2010', '#d0a050'], sk: '#f2c4a8', names: ['JOHN', 'DAVE', 'NICK', 'ANDY', 'MARK', 'IAN'], fl: 0x24a83a },
  ESP: { name: 'SPAIN',   sh: '#d82020', tr: '#f0d020', so: '#1a2a70', ha: ['#1a0e06', '#3a2010', '#2a1808'], sk: '#e8a878', names: ['JOSE', 'JUAN', 'PACO', 'RAUL', 'LUIS', 'TONI'], fl: 0xe0a040 },
  SWE: { name: 'SWEDEN',  sh: '#f0d020', tr: '#2050c0', so: '#2050c0', ha: ['#e0c070', '#d8b060', '#a07030'], sk: '#f2c8a8', names: ['LARS', 'OLOF', 'NILS', 'SVEN', 'ERIK', 'BJORN'], fl: 0x2f6fe0 },
  NOR: { name: 'NORWAY',  sh: '#d02020', tr: '#ffffff', so: '#203080', ha: ['#e0c070', '#a07030', '#d8b060'], sk: '#f2c8a8', names: ['ODD', 'KNUT', 'ARNE', 'GEIR', 'TOR', 'PER'], fl: 0x24a83a },
  DEN: { name: 'DENMARK', sh: '#d02020', tr: '#ffffff', so: '#f4f4f4', ha: ['#d8b060', '#8a5a20', '#3a2010'], sk: '#f2c8a8', names: ['JENS', 'POUL', 'HANS', 'NIELS', 'KIM', 'BO'], fl: 0xe0a040 },
  BRA: { name: 'BRAZIL',  sh: '#f2d020', tr: '#1e9a40', so: '#2040c0', ha: ['#1a0e06', '#2a1808', '#3a2010'], sk: '#b67a4c', names: ['SILVA', 'RENAN', 'BETO', 'XANDO', 'MAURO', 'TANDE'], fl: 0x2f6fe0 },
  CHN: { name: 'CHINA',   sh: '#f4f4f4', tr: '#2040c0', so: '#f4f4f4', ha: ['#141414', '#1a1a1a', '#202020'], sk: '#f0c49c', names: ['ZHANG', 'LI', 'WANG', 'CHEN', 'LIU', 'YANG'], fl: 0x1f9a8a },
  JPN: { name: 'JAPAN',   sh: '#f4f4f4', tr: '#d42020', so: '#d42020', ha: ['#141414', '#1a1a1a', '#2a1a10'], sk: '#f2c49c', names: ['SATO', 'UNO', 'TANAKA', 'KATO', 'ITO', 'MORI'], fl: 0x24a83a },
  USA: { name: 'U.S.A',   sh: '#d42a2a', tr: '#ffffff', so: '#2a3ccc', ha: ['#8a4a18', '#d8b060', '#3a2010'], sk: '#f2b48c', names: ['TOM', 'JOHN', 'TED', 'BOB', 'MIKE', 'STEVE'], fl: 0xe0a040 },
  CUB: { name: 'CUBA',    sh: '#1a1a1a', tr: '#1e9a40', so: '#1e8a3a', ha: ['#0e0806', '#1a0e06', '#0e0806'], sk: '#8a5a38', names: ['CHIKO', 'PAURO', 'DIEGO', 'TANOS', 'MIGER', 'RAUL'], fl: 0x2f6fe0 },
  URS: { name: 'USSR',    sh: '#d42020', tr: '#f2d22a', so: '#d42020', ha: ['#d8b060', '#8a5a20', '#c09050'], sk: '#f2c4a4', names: ['VASIL', 'IGOR', 'YURI', 'OLEG', 'BORIS', 'IVAN'], fl: 0xe07a3a }
};

// Formazione a 4 (3 a rete + 1 in fondo)
// 0 = centrale (primo tempo, muro), 1 = alzatore, 2 = schiacciatore "asso", 3 = difensore/battitore
// d = distanza dalla rete della posizione di partenza, dep = piccolo spostamento verticale (profondità) dello sprite.
const HOMES = [{ d: 18, dep: 3 }, { d: 31, dep: -2 }, { d: 44, dep: 4 }, { d: 140, dep: 0 }];

// Formazioni per numero di giocatori in campo (scelta nelle impostazioni partita; il beach volley usa sempre 2).
// Per ogni posto: d = distanza dalla rete, dep = profondità dello sprite, pos = ruolo del posto:
//   mb centrale (primo tempo, muro), set alzatore, oh attaccante di palla alta (muro), def difensore/battitore (seconda linea),
//   bk secondo difensore (seconda linea), lib difensore puro, bch beach (fa tutto: riceve, alza, attacca, mura).
// Batte il giocatore del posto più lontano dalla rete; ruotando, i nomi passano da un posto all'altro.
const FORMATIONS = {
  2: [{ d: 46, dep: 3, pos: 'bch' }, { d: 112, dep: -3, pos: 'bch' }],
  3: [{ d: 31, dep: -2, pos: 'set' }, { d: 46, dep: 4, pos: 'oh' }, { d: 128, dep: 0, pos: 'def' }],
  4: HOMES.map((h, i) => ({ ...h, pos: ['mb', 'set', 'oh', 'def'][i] })),
  6: [{ d: 16, dep: 4, pos: 'mb' }, { d: 30, dep: -3, pos: 'set' }, { d: 45, dep: 6, pos: 'oh' },
      { d: 92, dep: -5, pos: 'lib' }, { d: 116, dep: 5, pos: 'bk' }, { d: 142, dep: -1, pos: 'def' }]
};
const PLAYER_COUNTS = [4, 6, 3, 2];

CFG.TPEAK = CFG.JUMP_V / CFG.PG;

// Grafica: tre versioni
//   'pixel' = ARCADE (pixel art originale), 'hd' = HD (giocatori disegnati, canvas 1920 px),
//   '3d' = 3D (giocatori fotorealistici dal foglio sprite, canvas 1920 px, telecamera più vicina).
// Si sceglie con ?gfx=pixel|hd|3d nell'indirizzo oppure col tasto H; la scelta viene ricordata.
const GFX_MODES = ['pixel', 'hd', '3d'];
const GFX_NAMES = { pixel: 'ARCADE', hd: 'HD', '3d': '3D' };
const GFX = (() => {
  let m = null;
  try { m = new URLSearchParams(location.search).get('gfx'); if (m) localStorage.setItem('sf91_gfx', m); else m = localStorage.getItem('sf91_gfx'); } catch (e) {}
  return GFX_MODES.includes(m) ? m : 'pixel';
})();
const HIRES = GFX !== 'pixel';
if (HIRES) CFG.ZOOM = 6;
const GR = HIRES ? CFG.ZOOM : 1;   // risoluzione delle texture rispetto ai pixel nativi

const DEFAULT_RANKING = [
  { score: 10000, name: 'ABC', stage: 'URS' }, { score: 3000, name: 'DEF', stage: 'CUB' },
  { score: 1500, name: 'GHI', stage: 'USA' }, { score: 1000, name: 'JKL', stage: 'JPN' },
  { score: 500, name: 'MNO', stage: 'CHN' }
];

// ---------------- stato globale della partita arcade ----------------
const GS = {
  credits: 0, mode: '1p', p1: 'ITA', p2: 'FRA', stage: 0, score: 0, sets: 1,
  ranking: null, attract: 0,
  loadRanking() {
    if (this.ranking) return this.ranking;
    try { const r = JSON.parse(localStorage.getItem('sf91_rank')); if (Array.isArray(r) && r.length === 5) this.ranking = r; } catch (e) {}
    if (!this.ranking) this.ranking = DEFAULT_RANKING.map(x => ({ ...x }));
    return this.ranking;
  },
  saveRanking() { try { localStorage.setItem('sf91_rank', JSON.stringify(this.ranking)); } catch (e) {} }
};

// ---------------- fisica balistica ----------------
// arcTo: velocità per andare da (x0,h0) a (x1,h1) passando per l'altezza massima apex (traiettorie alte: bagher, alzate).
// shotTo: velocità per arrivare in (x1,h1) a una certa velocità orizzontale (traiettorie tese: schiacciate, battute in salto).
// heightAtX: altezza della palla quando passa per la x indicata (Infinity se non ci arriva).
// timeToH: tra quanto tempo la palla, scendendo, sarà all'altezza H (null se non ci arriva).
// apexOf: altezza massima della traiettoria; clears: la palla passa sopra la rete con un margine?
const PHYS = {
  arcTo(x0, h0, x1, h1, apex) {
    const g = CFG.G;
    apex = Math.max(apex, h0 + 2, h1 + 2);
    const vy = Math.sqrt(2 * g * (apex - h0));
    const t1 = vy / g, t2 = Math.sqrt(2 * (apex - h1) / g);
    return { vx: (x1 - x0) / (t1 + t2), vy };
  },
  shotTo(x0, h0, x1, h1, speed) {
    const g = CFG.G;
    const T = Math.max(0.08, Math.abs(x1 - x0) / speed);
    return { vx: (x1 - x0) / T, vy: (h1 - h0 + 0.5 * g * T * T) / T };
  },
  heightAtX(x0, h0, vx, vy, X) {
    if (Math.abs(vx) < 1e-3) return Infinity;
    const t = (X - x0) / vx;
    if (t < 0) return Infinity;
    return h0 + vy * t - 0.5 * CFG.G * t * t;
  },
  timeToH(h, vy, H) {
    const disc = vy * vy + 2 * CFG.G * (h - H);
    if (disc < 0) return null;
    return (vy + Math.sqrt(disc)) / CFG.G;
  },
  apexOf(h, vy) { return vy > 0 ? h + vy * vy / (2 * CFG.G) : h; },
  clears(x0, h0, v, margin = 3) {
    const hn = PHYS.heightAtX(x0, h0, v.vx, v.vy, 0);
    return hn === Infinity || hn > CFG.NET_H + margin;
  }
};

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SX = x => x + CFG.OX;
// in HD un carattere sportivo pulito al posto di quello a pixel
const FONT = HIRES ? '"Russo One", "Arial Black", sans-serif' : '"Press Start 2P", "Courier New", monospace';
const FONT_K = HIRES ? 1.35 : 1;   // Russo One ha lettere più basse: stessa altezza visiva del carattere a pixel
const TXT = (size = 8, color = '#ffffff') => ({ fontFamily: FONT, fontSize: size * FONT_K + 'px', color });

// Da chiamare all'inizio di create() di ogni scena. ATTENZIONE: Phaser riusa gli oggetti scena,
// quindi qui si azzerano le proprietà gone/done/leaving/_born/counting: non usare questi nomi per altri scopi
// (es. league.js usa 'finished' e non 'done').
function camSetup(scene) {
  scene.cameras.main.setOrigin(0, 0).setZoom(CFG.ZOOM);
  // le scene di Phaser vengono riusate: azzera gli stati della visita precedente
  scene.gone = false; scene.done = false; scene.leaving = false; scene._born = undefined; scene.counting = false;
}
