// ============================================================
//  MODERN — modalità moderna in stile Thunder Spikes Volleyball (2026)
//  intrecciata con il motore arcade di Power Spikes (1991):
//  menu principale, selezione squadre a gruppi con statistiche, impostazioni
//  partita (campo, pallone, punti di partenza, indicatore di rimbalzo, bersaglio
//  d'attacco, regole), arene HD con pavimento a specchio, telecamera con zoom,
//  fascia WIN! e statistiche di fine partita per giocatore.
// ============================================================

// ---------------- nazionali in più (Thunder Spikes) + statistiche ----------------
// INDICE DEL FILE
//   1. nazionali in più e statistiche (TEAM_STATS: attacco, difesa, velocità 0-100), gruppi della selezione
//   2. bandiere aggiuntive, palloni (BALLS), arene moderne (ARENAS / makeModernArena)
//   3. MSET = impostazioni scelte nei menu, OPT = valori possibili; UI = funzioni per pannelli, testi, barre
//   4. scene: MainMenu, TeamSelect, MatchSettings, MatchStats; startModernMatch avvia la partita
Object.assign(TEAMS, {
  ARG: { name: 'ARGENTINA', sh: '#9ad0f0', tr: '#ffffff', so: '#1a2a60', ha: ['#2a1408', '#3a2010', '#1a0e06'], sk: '#e8b088', names: ['LUCAS', 'FACU', 'NICO', 'BRUNO', 'EZE', 'SEBA'], fl: 0xd02828 },
  POL: { name: 'POLAND', sh: '#f4f4f4', tr: '#d82030', so: '#d82030', ha: ['#c09050', '#5a3a1a', '#d8b878'], sk: '#f2c8a8', names: ['BARTEK', 'KUBA', 'MICHAL', 'PAWEL', 'OLEK', 'TOMEK'], fl: 0xd06030 },
  SRB: { name: 'SERBIA', sh: '#c82030', tr: '#2040a0', so: '#2040a0', ha: ['#2a1408', '#3a2010', '#5a3010'], sk: '#f0c0a0', names: ['NIKOLA', 'MARKO', 'URO', 'DUSAN', 'LAZAR', 'IVAN'], fl: 0x2f6fe0 },
  CAN: { name: 'CANADA', sh: '#d82020', tr: '#ffffff', so: '#1a1a1a', ha: ['#8a5a20', '#3a2010', '#d8b060'], sk: '#f2c4a4', names: ['RYAN', 'BLAIR', 'GAVIN', 'NICK', 'JOHN', 'STEPH'], fl: 0x24a83a },
  KOR: { name: 'KOREA', sh: '#f4f4f4', tr: '#d82030', so: '#1a3aa0', ha: ['#141414', '#1a1a1a', '#202020'], sk: '#f0c49c', names: ['KIM', 'LEE', 'PARK', 'CHOI', 'JUNG', 'KANG'], fl: 0xe0a040 },
  GRE: { name: 'GREECE', sh: '#1a4ab8', tr: '#ffffff', so: '#ffffff', ha: ['#1a0e06', '#2a1408', '#3a2010'], sk: '#e8b088', names: ['NIKOS', 'GIORGOS', 'KOSTAS', 'YANNIS', 'DIMOS', 'TAKIS'], fl: 0x24a83a },
  POR: { name: 'PORTUGAL', sh: '#c82020', tr: '#20a040', so: '#20a040', ha: ['#2a1408', '#1a0e06', '#3a2010'], sk: '#e8b088', names: ['JOAO', 'RUI', 'TIAGO', 'NUNO', 'PEDRO', 'HUGO'], fl: 0x24a83a },
  UKR: { name: 'UKRAINE', sh: '#f2d020', tr: '#2058c8', so: '#2058c8', ha: ['#c09050', '#5a3a1a', '#d8b878'], sk: '#f2c8a8', names: ['OLEH', 'DMYTRO', 'YURII', 'TARAS', 'ILLIA', 'VASYL'], fl: 0x2f6fe0 },
  EGY: { name: 'EGYPT', sh: '#1a1a1a', tr: '#d82020', so: '#1a1a1a', ha: ['#0e0806', '#1a0e06', '#140a06'], sk: '#b67a4c', names: ['AHMED', 'OMAR', 'HOSSAM', 'KARIM', 'MOHAMED', 'ALI'], fl: 0x2f6fe0 },
  NED: { name: 'NETHERLANDS', sh: '#f07018', tr: '#ffffff', so: '#f07018', ha: ['#e0c070', '#c09050', '#8a5a20'], sk: '#f2c8a8', names: ['NIMIR', 'THIJS', 'BENNIE', 'MAARTEN', 'WOUT', 'ROBBERT'], fl: 0xe0a040 }
});
// attacco / difesa / velocità (0-100) come le schede di Thunder Spikes
const TEAM_STATS = {
  BRA: [90, 84, 88], ARG: [85, 79, 82], USA: [86, 82, 84], ITA: [88, 85, 82], FRA: [87, 83, 86], POL: [89, 84, 80],
  JPN: [78, 88, 90], CUB: [91, 72, 86], URS: [90, 80, 78], SRB: [84, 80, 79], CAN: [84, 79, 81], GER: [82, 80, 78],
  CHN: [80, 82, 80], KOR: [74, 84, 86], GRE: [72, 70, 74], POR: [70, 72, 72], ESP: [74, 72, 76], NED: [80, 76, 78],
  UKR: [76, 74, 76], EGY: [74, 70, 78], SWE: [72, 70, 72], NOR: [68, 66, 70], DEN: [66, 66, 68], GBR: [64, 64, 66]
};
const GROUPS = [
  ['BRA', 'ARG', 'USA', 'ITA', 'FRA', 'POL', 'JPN', 'CUB', 'URS', 'SRB', 'CAN', 'GER'],
  ['CHN', 'KOR', 'NED', 'UKR', 'EGY', 'ESP', 'GRE', 'POR', 'SWE', 'NOR', 'DEN', 'GBR']
];
const GROUP_NAMES = ['GROUP I', 'GROUP II'];   // roster.js aggiunge i gruppi CLUB
const statsOf = c => TEAM_STATS[c] || [70, 70, 70];

// ---------------- bandiere aggiuntive ----------------
const _drawFlagBase = drawFlag;
drawFlag = function (c, x, y, w, h, code) {
  const R = (a, b, cw, ch, col) => { c.fillStyle = col; c.fillRect(x + a, y + b, cw, ch); };
  const h3 = (a, b, d) => { const k = h / 3; R(0, 0, w, k + 1, a); R(0, k, w, k + 1, b); R(0, 2 * k, w, h - 2 * k, d); };
  switch (code) {
    case 'ARG': h3('#74acdf', '#ffffff', '#74acdf'); c.fillStyle = '#f6b40e'; c.beginPath(); c.arc(x + w / 2, y + h / 2, h * 0.11, 0, 7); c.fill(); return;
    case 'POL': R(0, 0, w, h / 2, '#ffffff'); R(0, h / 2, w, h / 2, '#dc143c'); return;
    case 'SRB': h3('#c6363c', '#0c4076', '#ffffff'); R(w * 0.22, h * 0.25, w * 0.14, h * 0.45, '#c6363c'); R(w * 0.24, h * 0.3, w * 0.1, h * 0.12, '#f0c040'); return;
    case 'CAN': R(0, 0, w, h, '#ffffff'); R(0, 0, w * 0.26, h, '#d52b1e'); R(w * 0.74, 0, w * 0.26, h, '#d52b1e');
      c.fillStyle = '#d52b1e'; star(c, x + w / 2, y + h * 0.52, h * 0.28); return;
    case 'KOR': R(0, 0, w, h, '#ffffff'); c.fillStyle = '#cd2e3a'; c.beginPath(); c.arc(x + w / 2, y + h / 2, h * 0.22, Math.PI, 0); c.fill();
      c.fillStyle = '#0047a0'; c.beginPath(); c.arc(x + w / 2, y + h / 2, h * 0.22, 0, Math.PI); c.fill();
      c.fillStyle = '#000'; for (const [a, b] of [[0.15, 0.2], [0.78, 0.2], [0.15, 0.7], [0.78, 0.7]]) R(w * a, h * b, w * 0.08, h * 0.12, '#000'); return;
    case 'GRE': for (let i = 0; i < 9; i++) R(0, (h / 9) * i, w, h / 9 + 0.5, i % 2 ? '#ffffff' : '#0d5eaf');
      R(0, 0, w * 0.38, h * 5 / 9, '#0d5eaf'); R(w * 0.15, 0, w * 0.08, h * 5 / 9, '#ffffff'); R(0, h * 2 / 9, w * 0.38, h / 9, '#ffffff'); return;
    case 'POR': R(0, 0, w * 0.4, h, '#046a38'); R(w * 0.4, 0, w * 0.6, h, '#da291c'); c.fillStyle = '#ffe900'; c.beginPath(); c.arc(x + w * 0.4, y + h / 2, h * 0.2, 0, 7); c.fill(); return;
    case 'UKR': R(0, 0, w, h / 2, '#0057b7'); R(0, h / 2, w, h / 2, '#ffd700'); return;
    case 'EGY': h3('#ce1126', '#ffffff', '#000000'); R(w * 0.45, h * 0.4, w * 0.1, h * 0.2, '#c09300'); return;
    case 'NED': h3('#ae1c28', '#ffffff', '#21468b'); return;
  }
  _drawFlagBase(c, x, y, w, h, code);
};

// ---------------- palloni ----------------
const BALLS = [
  { key: 'ball', name: 'CLASSIC' },
  { key: 'ball_pro', name: 'PRO' },
  { key: 'ball_gold', name: 'RETRO' }
];
function makeBalls(scene) {
  makeCommon(scene);
  const mk = (key, base, a, b, hd) => {
    if (scene.textures.exists(key)) return;
    const { t, c } = canvasTex(scene, key, 8, 8);
    if (GR > 1) drawBallHD(c, 4, 4, 4, hd);
    else {
      c.fillStyle = base; c.fillRect(2, 0, 4, 8); c.fillRect(0, 2, 8, 4); c.fillRect(1, 1, 6, 6);
      c.fillStyle = a; c.fillRect(1, 1, 3, 3); c.fillRect(5, 4, 2, 3);
      c.fillStyle = b; c.fillRect(4, 1, 2, 2); c.fillRect(1, 5, 3, 2);
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(2, 1, 1, 1);
    }
    texDone(t);
  };
  mk('ball_pro', '#f4f4f4', '#2050d0', '#f2c818', HD_BALL.pro);
  mk('ball_gold', '#d8a050', '#b07020', '#f0d090', HD_BALL.retro);
}

// ---------------- arene HD ----------------
// mondo: x 0..560, y da -110 a 224 (la telecamera allarga lo zoom e mostra più tribuna)
const ARENAS = [
  { id: 'arena', name: 'VOLLEYBALL ARENA', floor: 0xd8262a, line: '#ffffff', wall: '#9a9ea4' },
  { id: 'pro', name: 'PRO SPORTS HALL', floor: 0x2a6ad8, line: '#ffffff', wall: '#8a8e96' },
  { id: 'gym', name: 'GYM HALL', floor: 0x2a9a4a, line: '#f4f4f4', wall: '#b8b0a0' },
  { id: 'school', name: 'OUTDOOR SCHOOL', floor: 0x3aa860, line: '#ffffff', wall: '#c8c0b0' },
  { id: 'classic', name: 'CLASSIC 1991', floor: null }
];
const ATOP = -110;

function makeModernArena(scene, id) {
  const key = 'marena_' + id;
  if (scene.textures.exists(key)) return key;
  const W = 560, H = 224 - ATOP, Y = v => v - ATOP;
  const { t, c } = canvasTex(scene, key, W, H);
  const R = seeded(hashStr(id));
  // spettatori con il volto riconoscibile (fanPerson in gfx.js), a file sfalsate sui gradoni
  const person = (x, y, s, pal) => fanPerson(c, x, y, R, pal);
  const crowdRows = (y0, y1, seat, pal, dens) => {
    for (let y = y0, r = 0; y < y1; y += 11, r++) {
      c.fillStyle = seat; c.fillRect(0, Y(y) + 12, W, 2);
      for (let x = (r % 2) * 4; x < W; x += 8) if (R() < dens) person(x, Y(y), 1, pal);
    }
  };
  const fans = ['#f2d020', '#2a7a3a', '#e8e8e8', '#2a48c8', '#d83030', '#202020', '#9ad0f0', '#f07018'];
  if (id === 'arena') {
    // stadio enorme: luci sul soffitto, tribune arancioni piene, tunnel centrale con scalinata
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#07090c'); g.addColorStop(1, '#1a1c22');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let x = 10; x < W; x += 9) { c.fillStyle = '#ffffff'; c.fillRect(x, Y(-104), 3, 2); c.fillStyle = 'rgba(255,255,240,0.25)'; c.fillRect(x - 2, Y(-102), 7, 3); }
    c.fillStyle = '#3a2a1c'; c.fillRect(0, Y(-92), W, 270);
    crowdRows(-92, 176, '#a8581c', fans, 0.92);
    // scale laterali
    for (const sx of [60, 500]) { c.fillStyle = '#2a2e38'; c.beginPath(); c.moveTo(sx - 4, Y(-92)); c.lineTo(sx + 4, Y(-92)); c.lineTo(sx + 22, Y(176)); c.lineTo(sx + 10, Y(176)); c.fill(); }
    // tunnel con scalinata dietro la rete
    c.fillStyle = '#06080a'; c.fillRect(262, Y(40), 36, 30);
    c.fillStyle = '#d8d8d0'; c.fillRect(272, Y(38), 16, 2);
    for (let y = 70; y < 176; y += 5) { c.fillStyle = y % 10 ? '#2a3240' : '#3a4454'; c.fillRect(268, Y(y), 24, 5); }
  } else if (id === 'pro') {
    c.fillStyle = '#14181e'; c.fillRect(0, 0, W, H);
    for (let x = 20; x < W; x += 40) { c.fillStyle = '#ffffff'; c.fillRect(x, Y(-100), 14, 2); c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(x - 3, Y(-98), 20, 4); }
    c.fillStyle = '#2a2c34'; c.fillRect(0, Y(-80), W, 60);
    for (let x = 16; x < W; x += 34) { c.fillStyle = '#0a0e1a'; c.beginPath(); c.arc(x, Y(-52), 9, 0, 7); c.fill(); c.fillStyle = '#28408a'; c.beginPath(); c.arc(x, Y(-52), 7, 0, 7); c.fill(); }
    c.fillStyle = '#3a1a1e'; c.fillRect(0, Y(-20), W, 196);
    crowdRows(-18, 176, '#6a1e24', fans, 0.55);
    for (let x = 0; x < W; x += 70) { c.fillStyle = '#c8a020'; c.fillRect(x + 10, Y(150), 40, 6); }
  } else if (id === 'gym') {
    c.fillStyle = '#c8bca0'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#9a8e74'; c.fillRect(0, Y(-110), W, 30);
    for (let x = 8; x < W; x += 38) { c.fillStyle = '#d8f0f8'; c.fillRect(x, Y(-70), 26, 34); c.fillStyle = '#7aa8c0'; c.fillRect(x + 12, Y(-70), 2, 34); c.fillRect(x, Y(-54), 26, 2); }
    c.fillStyle = '#5a4e3a'; c.fillRect(0, Y(-28), W, 4);
    c.fillStyle = '#e8e0cc'; c.fillRect(0, Y(-24), W, 200);
    for (let y = -10; y < 170; y += 24) { c.fillStyle = '#d8d0bc'; c.fillRect(0, Y(y), W, 1); }
    // spalti in legno con pochi spettatori
    for (let y = 104; y < 176; y += 12) { c.fillStyle = '#a8784a'; c.fillRect(0, Y(y) + 12, W, 3); for (let x = 0; x < W; x += 10) if (R() < 0.35) person(x, Y(y), 1, fans); }
    c.fillStyle = '#d02828'; c.fillRect(20, Y(20), 30, 40); c.fillStyle = '#ffffff'; c.fillRect(28, Y(30), 14, 20);
  } else if (id === 'school') {
    const g = c.createLinearGradient(0, 0, 0, Y(120)); g.addColorStop(0, '#5ab0f0'); g.addColorStop(1, '#bfe6ff');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(255,255,255,0.85)'; const x = R() * W, y = Y(-100 + R() * 40); c.beginPath(); c.ellipse(x, y, 30, 8, 0, 0, 7); c.fill(); }
    c.fillStyle = '#d8c8a8'; c.fillRect(60, Y(-30), 440, 150); c.fillStyle = '#b84a3a'; c.fillRect(50, Y(-40), 460, 12);
    for (let r = 0; r < 3; r++) for (let x = 76; x < 490; x += 30) { c.fillStyle = '#5a8ab0'; c.fillRect(x, Y(-14 + r * 40), 18, 24); c.fillStyle = '#e8e8e8'; c.fillRect(x + 8, Y(-14 + r * 40), 2, 24); }
    for (let x = 0; x < W; x += 40) { c.fillStyle = '#3a7a34'; c.beginPath(); c.arc(x + 20, Y(130), 22, 0, 7); c.fill(); c.fillStyle = '#5a3a1a'; c.fillRect(x + 18, Y(140), 4, 40); }
    c.fillStyle = '#7a7a7a'; for (let x = 0; x < W; x += 6) c.fillRect(x, Y(150), 1, 26); c.fillRect(0, Y(150), W, 1);
  }
  // tribune in penombra (luce concentrata sul campo, come in Thunder Spikes)
  if (id !== 'school' && id !== 'gym') { const sh = c.createLinearGradient(0, 0, 0, Y(176)); sh.addColorStop(0, 'rgba(0,0,0,0.75)'); sh.addColorStop(1, 'rgba(0,0,0,0.5)'); c.fillStyle = sh; c.fillRect(0, 0, W, Y(176)); }
  // muretto/balaustra grigia dietro il campo (come in Thunder Spikes)
  c.fillStyle = '#5a5e64'; c.fillRect(0, Y(176), W, 22);
  c.fillStyle = id === 'school' ? '#9a9a9a' : '#9a9ea4'; c.fillRect(0, Y(178), W, 18);
  c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(0, Y(178), W, 2);
  texDone(t); return key;
}

// ---------------- impostazioni correnti ----------------
const MENU_SEX = 20, MENU_GFX = 21;   // menu principale: righe SQUADRE e GRAFICA (le schede sono 0-7, la lingua -1)
const MSET = { left: 'BRA', right: 'ARG', leftAI: false, rightAI: true, arena: 0, ball: 1, start: 0, rebound: 0, target: 0, rules: 0, fx: 0, players: 0, women: GS.women ? 1 : 0 };
// scelta maschile / femminile del menu principale: vale per tutte le modalità e resta salvata nel browser
function setWomen(on) {
  GS.women = !!on; MSET.women = on ? 1 : 0;
  if (typeof BSET !== 'undefined') BSET.women = on ? 1 : 0;
  try { localStorage.setItem('sf91_women', on ? '1' : '0'); } catch (e) { /* */ }
}
const OPT = {
  start: [0, 5, 10, 15],
  rebound: ['EASY', 'HARD', 'OFF'],
  target: ['ON', 'OFF'],
  rules: ['RALLY 25', 'RALLY 15', 'SIDE-OUT 15 (1991)'],
  fx: ['ON', 'OFF'],
  women: ['MASCHILE', 'FEMMINILE'],
  shake: ['ON', 'OFF'],               // scossa dello schermo su schiacciate e muri (GS.shake, vale in tutte le modalità)   // versione del gioco: squadre maschili o femminili
  players: PLAYER_COUNTS.map(n => n + ' CONTRO ' + n)   // giocatori in campo (FORMATIONS in config.js)
};

// ---------------- UI helpers ----------------
// UI.f(dimensione, colore, grassetto): stile di testo dei menu moderni (Arial Black, nitido in ogni versione)
const UI = {
  bg(scene) {
    const g = scene.add.graphics();
    g.fillGradientStyle(0x0c3a8a, 0x0c3a8a, 0x05153a, 0x05153a, 1).fillRect(0, 0, 320, 224);
    g.lineStyle(1, 0x2a5ab8, 0.35);
    for (let i = 0; i < 9; i++) g.strokeCircle(30 + i * 40, 30 + (i % 3) * 70, 26);
    return g;
  },
  panel(scene, x, y, w, h, title) {
    const g = scene.add.graphics();
    g.fillStyle(0x0a1e4a, 0.85).fillRoundedRect(x, y, w, h, 4);
    g.lineStyle(1, 0x3a7ae0, 1).strokeRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, 4);
    if (title) scene.add.text(x + 5, y + 3, title, UI.f(7, '#ffffff', true));
    return g;
  },
  f(size, color = '#ffffff', bold = false) { return { fontFamily: '"Arial Black", Arial, sans-serif', fontSize: size + 'px', color, fontStyle: bold ? 'bold' : 'normal', resolution: CFG.ZOOM }; },
  button(scene, x, y, label, color = 0x2a8ae8) {
    const g = scene.add.graphics();
    g.fillStyle(color, 1).fillTriangle(x - 34, y, x - 28, y - 7, x - 28, y + 7).fillRect(x - 28, y - 7, 56, 14).fillTriangle(x + 28, y - 7, x + 34, y, x + 28, y + 7);
    scene.add.text(x, y, label, UI.f(7)).setOrigin(0.5);
    return g;
  },
  bars(scene, x, y, code, right) {
    const s = statsOf(code), lab = ['ATTACK', 'DEFENSE', 'SPEED'];
    const g = scene.add.graphics(), objs = [g];
    s.forEach((v, i) => {
      const yy = y + i * 11;   // spazio per l'etichetta sopra ogni barra
      g.fillStyle(0x0a1530, 1).fillRect(x, yy, 46, 6);
      g.fillStyle(v >= 80 ? 0xf07a20 : 0xf2c818, 1).fillRect(right ? x : x + 46 - 46 * v / 100, yy, 46 * v / 100, 6);
      objs.push(scene.add.text(right ? x + 50 : x - 4, yy - 1, String(v), UI.f(6)).setOrigin(right ? 0 : 1, 0));
      objs.push(scene.add.text(right ? x : x + 46, yy - 4.5, lab[i], UI.f(3.6, '#9ab8f0')).setOrigin(right ? 0 : 1, 0));
    });
    return objs;
  }
};

// ---------------- MENU PRINCIPALE ----------------
// menu principale a schede: ARCADE, SINGLE MATCH, TUTORIAL, CAREER (campionati, vedi league.js), BEACH (beach.js)
class MainMenuScene extends Base {
  constructor() { super('MainMenu'); }
  create() {
    camSetup(this); makeCommon(this); this.keysInit(); setLook(this, false);
    const g = this.add.graphics();
    g.fillGradientStyle(0x0a0e14, 0x0a0e14, 0x1a2420, 0x1a2420, 1).fillRect(0, 0, 320, 224);
    g.fillStyle(0xfff8d0, 0.08).fillTriangle(250, 0, 200, 224, 320, 224);
    g.fillStyle(0xfff8d0, 0.06).fillTriangle(60, 0, 0, 224, 120, 224);
    g.fillStyle(0x203028, 1).fillRect(0, 180, 320, 44);
    g.fillStyle(0xc02020, 1).fillRect(40, 140, 2, 42);
    makePlayerTex(this, 'BRA', 0); makePlayerTex(this, 'ITA', 1);
    this.add.sprite(280, 186, plKey('BRA', 0), PF.idle).setOrigin(0.5, 1).setFlipX(true).setTint(0x8a8a8a);
    this.add.text(160, 22, GAME_TITLE[0], { fontFamily: '"Arial Black", Arial', fontSize: '26px', fontStyle: 'bold', color: '#ffd23a', resolution: CFG.ZOOM }).setOrigin(0.5).setStroke('#1a3a8a', 5);
    this.add.text(160, 44, 'VOLLEYBALL  ·  ' + GAME_TITLE[1], UI.f(8, '#7ad0ff', true)).setOrigin(0.5).setStroke('#0a1a4a', 3);
    this.cards = [
      { label: 'ARCADE', sub: 'POWER SPIKES 1991', hint: 'Il gioco arcade originale: gettoni, 5 avversari, Technic', icon: 'stick' },
      { label: 'SINGLE MATCH', sub: 'VS', hint: 'Partita singola: squadre, campo, pallone e regole a scelta', icon: 'vs' },
      { label: 'TUTORIAL', sub: 'PRATICA', hint: 'Allenati su ogni fondamentale con i comandi in sovraimpressione', icon: 'tut' },
      { label: 'CAREER', sub: 'CAMPIONATI', hint: 'Campionati (campionati.json) o torneo contro le nazionali', icon: 'cup' },
      { label: 'BEACH', sub: 'SABBIA', hint: 'Beach volley 2 contro 2: sole, sabbia, set a 21 e regole da spiaggia', icon: 'sun' },
      { label: 'MY PLAYER', sub: 'LA MIA SCHEDA', hint: 'Crea i tuoi giocatori: giocano nella loro squadra e migliorano partita dopo partita', icon: 'me' },
      { label: 'EDITOR', sub: 'SQUADRE', hint: 'Squadre, arbitri, sponsor, campionati e profilo sul server', icon: 'ed' },
      { label: 'COME SI GIOCA', sub: 'GUIDA', hint: 'Guida illustrata: comandi, battute, ricezione, alzata, attacco, muro, crediti', icon: 'help' }
    ];
    // schede su due righe (4 + 4); sopra le schede la riga LINGUA, sotto le righe SQUADRE (MENU_SEX) e GRAFICA (MENU_GFX)
    const POS = [[52, 96], [124, 96], [196, 96], [268, 96], [52, 150], [124, 150], [196, 150], [268, 150]];
    this.cardObjs = this.cards.map((cd, i) => {
      const [x, y] = POS[i];
      const cont = this.add.container(x, y);
      const bg = this.add.graphics();
      cont.add(bg);
      cont.add(this.add.text(0, -18, cd.label, UI.f(cd.label.length > 10 ? 4.8 : 5.8, '#ffffff', true)).setOrigin(0.5));
      // icona a sinistra (rimpicciolita), a destra il conteggio o l'avanzamento
      const ik = this.add.container(-16, 7).setScale(0.62); cont.add(ik);
      const ic = this.add.graphics(); ik.add(ic);
      const right = (t, col = '#ffd23a') => cont.add(this.add.text(15, 4, t, { ...UI.f(4.4, col, true), align: 'center' }).setOrigin(0.5));
      if (cd.icon === 'stick') { ic.fillStyle(0x303030).fillRect(-2, -10, 4, 16); ic.fillStyle(0xe02020).fillCircle(0, -12, 7); ic.fillStyle(0x2a2a2a).fillRect(-12, 6, 24, 6); }
      else if (cd.icon === 'vs') { ic.lineStyle(1, 0xffffff).strokeRect(-14, -16, 28, 14); for (let k = 0; k < 6; k++) ic.lineBetween(-14 + k * 5.6, -16, -14 + k * 5.6, -2); ik.add(this.add.text(0, 8, 'VS', UI.f(12, '#ffd23a', true)).setOrigin(0.5)); }
      else if (cd.icon === 'tut') { ic.fillStyle(0xe8d8b0).fillRect(-10, -18, 20, 26); ic.fillStyle(0x6a6a6a).fillRect(-6, -14, 12, 1).fillRect(-6, -10, 12, 1).fillRect(-6, -6, 8, 1); ik.add(this.add.image(7, 4, 'ballbig').setScale(0.9)); }
      else if (cd.icon === 'me') {
        ic.fillStyle(0xe8b088).fillCircle(0, -14, 5); ic.fillStyle(0x3a2010).fillEllipse(0, -18, 10, 4);
        ic.fillStyle(0xf2c818).fillRect(-8, -8, 16, 14); ic.fillStyle(0x1a1a2a).fillRect(-3, -5, 6, 7);
        const nMy = MYP.list.length;
        right(nMy ? nMy + (nMy === 1 ? ' GIOCATORE' : ' GIOCATORI') : 'NUOVO');
      }
      else if (cd.icon === 'ed') {
        ic.fillStyle(0xf2f2f2).fillRect(-11, -18, 18, 24); ic.fillStyle(0x1a5ad8).fillRect(-8, -14, 12, 3).fillRect(-8, -9, 12, 2).fillRect(-8, -5, 8, 2);
        ic.fillStyle(0xf2c818).fillTriangle(4, 6, 14, -12, 17, -10).fillTriangle(4, 6, 7, 8, 17, -10);
        const nEd = ED.data.squadre.length;
        right(nEd ? nEd + (nEd === 1 ? ' SQUADRA' : ' SQUADRE') : 'NUOVO');
      }
      else if (cd.icon === 'sun') {
        ic.fillStyle(0x3ab0f0).fillRect(-14, -18, 28, 16); ic.fillStyle(0x1a7ad0).fillRect(-14, -2, 28, 4); ic.fillStyle(0xf2d8a0).fillRect(-14, 2, 28, 8);
        ic.fillStyle(0xffe040).fillCircle(6, -11, 4); ic.fillStyle(0x7a4a1a).fillRect(-9, -12, 2, 14); ic.fillStyle(0x2a9a3a).fillEllipse(-11, -13, 9, 3).fillEllipse(-5, -13, 9, 3);
        ik.add(this.add.image(2, 6, 'ballbig').setScale(0.7)); right(cd.sub, '#ffe0a0');
      }
      else if (cd.icon === 'help') {
        ic.fillStyle(0x2a8ae8).fillCircle(0, -6, 14); ic.lineStyle(2, 0xffffff).strokeCircle(0, -6, 14);
        ik.add(this.add.text(0, -6, '?', UI.f(18, '#ffffff', true)).setOrigin(0.5)); right(cd.sub, '#7ad0ff');
      }
      else { ic.fillStyle(0xf2c818).fillRect(-8, -16, 16, 12).fillRect(-3, -4, 6, 8).fillRect(-8, 4, 16, 3); ic.fillStyle(0xf2c818).fillCircle(-10, -12, 3).fillCircle(10, -12, 3); }
      const pct = i === 0 ? Math.min(100, (GS.bestStage || 0) * 20) : i === 2 ? 34 : i === 3 ? Math.round((GS.careerBest || 0) * 25) : null;
      if (pct !== null) { const pb = this.add.graphics(); pb.fillStyle(0x0a1a3a).fillRect(3, 10, 24, 3); pb.fillStyle(0xf2c818).fillRect(3, 10, 24 * pct / 100, 3); cont.add(pb); cont.add(this.add.text(15, 2, pct + '%', UI.f(6, '#ffffff', true)).setOrigin(0.5)); }
      cont.bg = bg;
      return cont;
    });
    this.hint = this.add.text(160, 181, '', UI.f(6, '#ffd23a')).setOrigin(0.5);
    this.add.text(160, 218, 'FRECCE: SCEGLI    Z / INVIO: CONFERMA    ↑ LINGUA    ↓ SQUADRE E GRAFICA', UI.f(5, '#8aa0c8')).setOrigin(0.5);
    // riga SQUADRE: maschili o femminili, per tutte le modalità (si ricorda; si può cambiare anche nelle impostazioni)
    this.sexBox = this.add.graphics();
    this.add.text(116, 191.5, 'SQUADRE', UI.f(5, '#9ab8f0', true)).setOrigin(1, 0.5);
    this.sexTxt = this.add.text(166, 191.5, '', UI.f(6, '#ffffff', true)).setOrigin(0.5);
    this.sexArrows = [this.add.text(126, 191.5, '◄', UI.f(6, '#ffd23a', true)).setOrigin(0.5), this.add.text(206, 191.5, '►', UI.f(6, '#ffd23a', true)).setOrigin(0.5)];
    this.sexTxt.setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.sel = MENU_SEX; this.toggleSex(); });
    // riga della versione grafica, sotto le schede (↓ per arrivarci, ← → per cambiarla: la pagina si ricarica)
    this.gfxSel = GFX_MODES.indexOf(GFX);
    this.gfxBox = this.add.graphics();
    this.add.text(116, 204.5, 'GRAFICA', UI.f(5, '#9ab8f0', true)).setOrigin(1, 0.5);
    this.gfxTxt = this.add.text(166, 204.5, '', UI.f(6, '#ffffff', true)).setOrigin(0.5);
    this.gfxArrows = [this.add.text(126, 204.5, '◄', UI.f(6, '#ffd23a', true)).setOrigin(0.5), this.add.text(206, 204.5, '►', UI.f(6, '#ffd23a', true)).setOrigin(0.5)];
    this.gfxTxt.setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.sel = MENU_GFX; this.cycleGfx(1); });
    // riga della lingua (i18n.js): bandiera e nome, ← → per cambiarla
    const lg = LANGS.find(l => l.id === I18N.lang) || LANGS[0];
    this.langBox = this.add.graphics();
    this.langFlag = this.add.image(140, 61, makeFlagTex(this, lg.flag, 15, 10));
    this.langTxt = this.add.text(152, 61, '', UI.f(5.5, '#ffffff', true)).setOrigin(0, 0.5);
    { const l = I18N.lang; I18N.lang = null; this.langTxt.setText(`${lg.name}`); I18N.lang = l; }
    this.langArrows = [this.add.text(118, 61, '◄', UI.f(6, '#ffd23a', true)).setOrigin(0.5), this.add.text(202, 61, '►', UI.f(6, '#ffd23a', true)).setOrigin(0.5)];
    this.langFlag.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.cycleLang(1));
    this.sel = GS.menuSel === undefined ? 0 : GS.menuSel;
    try { if (sessionStorage.getItem('sf91_menuGfx')) { sessionStorage.removeItem('sf91_menuGfx'); this.sel = MENU_GFX; } } catch (e) { /* */ }
    this.refresh();
  }
  // squadre maschili / femminili: vale per arcade, single match, beach e i miei giocatori nuovi
  toggleSex() { setWomen(!GS.women); SFX.blip(); this.refresh(); }
  // versione grafica: si sceglie con ← → e si applica (ricaricando la pagina) dopo un attimo senza altre pressioni
  cycleGfx(d) {
    const n = GFX_MODES.length;
    this.gfxSel = (this.gfxSel + d + n) % n; SFX.blip(); this.refresh();
    if (this.gfxTimer) this.gfxTimer.remove();
    if (GFX_MODES[this.gfxSel] === GFX) return;
    this.gfxTimer = this.time.delayedCall(900, () => {
      try { sessionStorage.setItem('sf91_menuGfx', '1'); } catch (e) { /* */ }
      const u = new URL(location.href); u.searchParams.set('gfx', GFX_MODES[this.gfxSel]); this.gone = true; location.href = u.href;
    });
  }
  cycleLang(d) {
    const i = LANGS.findIndex(l => l.id === I18N.lang), n = LANGS.length;
    setLang(LANGS[((i < 0 ? 0 : i) + d + n) % n].id);
    GS.menuSel = -1; SFX.blip(); this.scene.restart();
  }
  refresh() {
    this.cardObjs.forEach((c, i) => {
      const on = i === this.sel;
      const beach = i === 4;
      c.bg.clear().fillStyle(on ? (beach ? 0xe07a1a : 0x1a5ad8) : (beach ? 0x8a4a12 : 0x0e2a6a), 0.95).fillRoundedRect(-33, -25, 66, 50, 4).lineStyle(on ? 2 : 1, on ? 0xffd23a : 0x3a6ac8).strokeRoundedRect(-33, -25, 66, 50, 4);
      c.setScale(on ? 1.06 : 1);
    });
    const L = this.sel < 0;
    this.langBox.clear().fillStyle(L ? 0x1a5ad8 : 0x0e2a6a, 0.9).fillRoundedRect(110, 54, 100, 14, 4).lineStyle(L ? 2 : 1, L ? 0xffd23a : 0x3a6ac8).strokeRoundedRect(110, 54, 100, 14, 4);
    this.langArrows.forEach(a => a.setVisible(L));
    const G = this.sel === MENU_GFX, gm = GFX_MODES[this.gfxSel];
    this.gfxBox.clear().fillStyle(G ? 0x1a5ad8 : 0x0e2a6a, 0.9).fillRoundedRect(120, 198, 92, 13, 4).lineStyle(G ? 2 : 1, G ? 0xffd23a : 0x3a6ac8).strokeRoundedRect(120, 198, 92, 13, 4);
    const X = this.sel === MENU_SEX;
    this.sexBox.clear().fillStyle(X ? (GS.women ? 0xb83a7a : 0x1a5ad8) : 0x0e2a6a, 0.9).fillRoundedRect(120, 185, 92, 13, 4).lineStyle(X ? 2 : 1, X ? 0xffd23a : 0x3a6ac8).strokeRoundedRect(120, 185, 92, 13, 4);
    this.sexTxt.setText(GS.women ? 'FEMMINILI' : 'MASCHILI').setColor(GS.women ? '#ffb0d8' : '#ffffff');
    this.sexArrows.forEach(a => a.setVisible(X));
    this.gfxTxt.setText(GFX_NAMES[gm]).setColor(gm === GFX ? '#ffffff' : '#ffd23a');
    this.gfxArrows.forEach(a => a.setVisible(G));
    this.hint.setText(L ? '← → LINGUA' : X ? '← → SQUADRE MASCHILI / FEMMINILI' : G ? (gm === GFX ? '← → GRAFICA' : 'CARICAMENTO DELLA GRAFICA...') : this.cards[this.sel].hint);
  }
  update() {
    if (this.gone) return;
    // righe: lingua (-1), schede 0-3, schede 4-6, grafica (7)
    if (this.sel === MENU_GFX) {
      if (this.jd('left')) this.cycleGfx(-1);
      else if (this.jd('right') || this.btn()) this.cycleGfx(1);
      else if (this.jd('up')) { this.sel = MENU_SEX; this.refresh(); SFX.blip(); }
      return;
    }
    if (this.sel === MENU_SEX) {
      if (this.jd('left') || this.jd('right') || this.btn()) this.toggleSex();
      else if (this.jd('up')) { this.sel = this.lastCard >= 4 ? this.lastCard : 5; this.refresh(); SFX.blip(); }
      else if (this.jd('down')) { this.sel = MENU_GFX; this.refresh(); SFX.blip(); }
      return;
    }
    const row = this.sel < 0 ? -1 : this.sel < 4 ? 0 : 1;
    if (row < 0) {
      if (this.jd('left')) { this.cycleLang(-1); return; }
      if (this.jd('right') || this.btn()) { this.cycleLang(1); return; }
      if (this.jd('down')) { this.sel = 0; this.refresh(); SFX.blip(); }
      return;
    }
    const lo = row ? 4 : 0, hi = row ? 7 : 3;
    if (this.jd('left')) { this.sel = this.sel > lo ? this.sel - 1 : hi; this.refresh(); SFX.blip(); }
    if (this.jd('right')) { this.sel = this.sel < hi ? this.sel + 1 : lo; this.refresh(); SFX.blip(); }
    if (this.jd('up')) { this.sel = row ? this.sel - 4 : -1; this.refresh(); SFX.blip(); }
    if (this.jd('down')) { if (row) this.lastCard = this.sel; this.sel = row ? MENU_SEX : this.sel + 4; this.refresh(); SFX.blip(); }
    if (this.jd('t')) { this.gone = true; this.scene.start('Practice'); return; }
    if (this.btn() || this.startPressed()) {
      this.gone = true; SFX.select(); GS.menuSel = this.sel;
      if (this.gfxTimer) this.gfxTimer.remove();
      if (this.sel === 0) { GS.attract = -1; nextAttract(this); }
      else if (this.sel === 1) { GS.career = null; this.scene.start('TeamSelect'); }
      else if (this.sel === 2) this.scene.start('Practice');
      else if (this.sel === 3) this.scene.start('Leagues');
      else if (this.sel === 4) this.scene.start('BeachSelect');
      else if (this.sel === 5) this.scene.start('MyPlayers');
      else if (this.sel === 6) this.scene.start('Editor');
      else this.scene.start('Guide');
    }
  }
}

// ---------------- SELEZIONE SQUADRE ----------------
// selezione squadre a gruppi (Q/E), C = IA/tastiera, schede dei 4 giocatori in campo
class TeamSelectScene extends Base {
  constructor() { super('TeamSelect'); }
  create() {
    camSetup(this); makeCommon(this); this.keysInit();
    UI.bg(this);
    this.career = !!GS.career;
    this.side = 0; this.grp = [0, 0];
    this.idx = [GROUPS[0].indexOf(MSET.left), GROUPS[0].indexOf(MSET.right)].map(v => Math.max(0, v));
    this.dyn = [];
    UI.panel(this, 6, 76, 148, 116, null); UI.panel(this, 166, 76, 148, 116, null);
    this.cursor = this.add.graphics().setDepth(5);
    this.add.text(160, 10, this.career ? 'CAREER - SCEGLI LA TUA SQUADRA' : 'SINGLE MATCH - SQUADRE', UI.f(7, '#ffd23a', true)).setOrigin(0.5);
    this.add.text(160, 208, '← → ↑ ↓ squadra   Q/E gruppo   C: IA/TASTIERA   Z: conferma   ESC: indietro', UI.f(5, '#9ab8f0')).setOrigin(0.5);
    this.draw();
  }
  draw() {
    this.dyn.forEach(o => o.destroy()); this.dyn = [];
    const D = o => (this.dyn.push(o), o);
    for (const s of [0, 1]) {
      if (this.career && s === 1) {
        D(this.add.text(240, 120, 'AVVERSARI:\nGRUPPO I\n(4 turni)', { ...UI.f(8, '#ffffff', true), align: 'center' }).setOrigin(0.5));
        continue;
      }
      const ox = s ? 166 : 6, code = GROUPS[this.grp[s]][this.idx[s]];
      const ai = s ? MSET.rightAI : MSET.leftAI;
      const fxp = s ? ox + 40 : ox + 108;
      D(this.add.image(fxp, 34, makeFlagTex(this, code, 42, 28)));
      const nm = TEAMS[code].name;
      D(this.add.text(fxp, 56, nm, UI.f(nm.length > 16 ? 5 : nm.length > 11 ? 6 : 8, '#ffffff', true)).setOrigin(0.5, 0));
      UI.bars(this, s ? ox + 84 : ox + 16, 22, code, !!s).forEach(D);
      const gn = GROUP_NAMES[this.grp[s]] || `GROUP ${this.grp[s] + 1}`;
      D(this.add.text(ox + 8, 80, gn, UI.f(gn.length > 26 ? 4 : gn.length > 18 ? 5 : 7, '#ffffff', true)));
      D(this.add.text(ox + 140, 80, ai ? 'AI' : (s ? 'P2' : 'P1'), UI.f(7, ai ? '#7ad0ff' : '#ffd23a', true)).setOrigin(1, 0));
      GROUPS[this.grp[s]].forEach((c, i) => {
        const fx = ox + 10 + (i % 6) * 23, fy = 96 + Math.floor(i / 6) * 18;
        D(this.add.image(fx, fy, makeFlagTex(this, c, 18, 12)).setOrigin(0));
      });
      // schede giocatori (ruoli come Thunder Spikes)
      ['REC', 'SPK', 'SPK', 'SET'].forEach((r, i) => {
        const cx = ox + 10 + i * 34, cy = 136;
        const g = D(this.add.graphics()); g.fillStyle(0x0e2a6a).fillRect(cx, cy, 30, 50); g.lineStyle(1, 0x5a9af0).strokeRect(cx + 0.5, cy + 0.5, 29, 49);
        const ni = [3, 0, 2, 1][i];
        D(this.add.image(cx + 15, cy + 13, makeFaceTex(this, code, ni, 'neutral')).setScale(0.5));
        const P = TEAMS[code], pn = P.names[ni];
        D(this.add.text(cx + 15, cy + 25, pn, UI.f(pn.length > 10 ? 3.4 : 4.5, '#ffffff')).setOrigin(0.5, 0));
        if (P.lv) {   // squadra da file JSON: numero di maglia, ruolo, livello ed età
          D(this.add.text(cx + 15, cy + 32, `#${P.nums[ni] || '-'} ${P.roles[ni]}`, UI.f(4.5, '#ffd23a', true)).setOrigin(0.5, 0));
          D(this.add.text(cx + 15, cy + 40, `${lvToStat(P.lv[ni])}${P.ages[ni] ? '  ' + P.ages[ni] + 'a' : ''}`, UI.f(4.5, '#7ad0ff', true)).setOrigin(0.5, 0));
          return;
        }
        D(this.add.text(cx + 15, cy + 32, r, UI.f(5, '#ffd23a', true)).setOrigin(0.5, 0));
        const st = statsOf(code), v = Math.round((st[[1, 0, 0, 2][i]] + (ni * 7) % 9) - 4);
        D(this.add.text(cx + 15, cy + 40, String(v), UI.f(6, '#7ad0ff', true)).setOrigin(0.5, 0));
      });
    }
    const ox = this.side ? 166 : 6, i = this.idx[this.side];
    this.cursor.clear().lineStyle(2, 0xffd23a).strokeRect(ox + 9 + (i % 6) * 23, 95 + Math.floor(i / 6) * 18, 20, 14);
  }
  update() {
    if (this.gone) return;
    const s = this.side, n = GROUPS[this.grp[s]].length;
    let ch = false;
    if (this.jd('left')) { this.idx[s] = (this.idx[s] + n - 1) % n; ch = true; }
    if (this.jd('right')) { this.idx[s] = (this.idx[s] + 1) % n; ch = true; }
    if (this.jd('up') || this.jd('down')) { this.idx[s] = (this.idx[s] + 6) % n; ch = true; }
    const gd = Phaser.Input.Keyboard.JustDown(this.kq) ? -1 : Phaser.Input.Keyboard.JustDown(this.ke) ? 1 : 0;
    if (gd) { this.grp[s] = (this.grp[s] + gd + GROUPS.length) % GROUPS.length; this.idx[s] = Math.min(this.idx[s], GROUPS[this.grp[s]].length - 1); ch = true; }
    if (Phaser.Input.Keyboard.JustDown(this.kc)) { if (s) MSET.rightAI = !MSET.rightAI; else MSET.leftAI = !MSET.leftAI; ch = true; }
    if (ch) { SFX.blip(); this.draw(); }
    if (this.jd('esc')) { if (s === 1) { this.side = 0; this.draw(); } else { this.gone = true; this.scene.start('MainMenu'); } return; }
    if (this.btn() || this.startPressed()) {
      SFX.select();
      if (s === 0) MSET.left = GROUPS[this.grp[0]][this.idx[0]]; else MSET.right = GROUPS[this.grp[1]][this.idx[1]];
      if (s === 0 && !this.career) { this.side = 1; this.draw(); return; }
      if (this.career) {
        const pool = GROUPS[0].filter(c => c !== MSET.left);
        GS.career = { round: 0, team: MSET.left, opps: [pool[7], pool[5], pool[2], pool[0]] };
        MSET.right = GS.career.opps[0]; MSET.rightAI = true;
      }
      this.gone = true; this.scene.start('MatchSettings');
    }
  }
  keysInit() {
    super.keysInit();
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.kq = this.input.keyboard.addKey(K.Q); this.ke = this.input.keyboard.addKey(K.E); this.kc = this.input.keyboard.addKey(K.C);
  }
}

// ---------------- IMPOSTAZIONI PARTITA ----------------
class MatchSettingsScene extends Base {
  constructor() { super('MatchSettings'); }
  create() {
    camSetup(this); makeCommon(this); makeBalls(this); this.keysInit();
    UI.bg(this);
    const L = MSET.left, Rt = MSET.right;
    this.add.image(110, 22, makeFlagTex(this, L, 36, 24)); this.add.image(210, 22, makeFlagTex(this, Rt, 36, 24));
    this.add.text(160, 22, 'VS', UI.f(12, '#ffffff', true)).setOrigin(0.5);
    this.add.text(110, 38, TEAMS[L].name, UI.f(6, '#ffffff', true)).setOrigin(0.5, 0); this.add.text(210, 38, TEAMS[Rt].name, UI.f(6, '#ffffff', true)).setOrigin(0.5, 0);
    UI.bars(this, 22, 12, L, false); UI.bars(this, 252, 12, Rt, true);
    UI.panel(this, 6, 52, 150, 120, 'PLAYING FIELD');
    this.preview = this.add.image(81, 108, '__DEFAULT').setDisplaySize(140, 76);
    this.fieldName = this.add.text(81, 158, '', UI.f(6, '#7ad0ff', true)).setOrigin(0.5);
    this.rows = [
      ['women', 'SQUADRE (maschili / femminili)'], ['field', 'CAMPO'], ['ball', 'BALL'], ['start', 'STARTING POINTS'], ['rebound', 'REBOUND INDICATOR'],
      ['target', 'ATTACK TARGET'], ['rules', 'REGOLE'], ['fx', 'ARCADE FX (telecronaca, arbitro, battute speciali)'], ['shake', 'SCOSSA DELLO SCHERMO'], ['crt', 'EFFETTO CRT (tasto K)'],
      ['players', 'GIOCATORI IN CAMPO'], ['lineL', 'FORMAZIONE ' + L], ['lineR', 'FORMAZIONE ' + Rt], ['play', 'PLAY']
    ];
    this.rowT = this.rows.map((r, i) => [this.add.text(166, 52 + i * 11.2, r[1], UI.f(5.5, '#9ab8f0')), this.add.text(312, 52 + i * 11.2, '', UI.f(6.5, '#ffffff', true)).setOrigin(1, 0)]);
    this.ballImg = this.add.image(305, 78, 'ball').setScale(1.3);
    this.add.text(160, 212, '↑↓ voce   ← → cambia   Z: avanti   ESC: indietro', UI.f(5, '#9ab8f0')).setOrigin(0.5);
    this.sel = this.rows.length - 1; this.refresh();
  }
  val(k) {
    if (k === 'lineL' || k === 'lineR') return 'SCEGLI ►';
    if (k === 'field') return ARENAS[MSET.arena].name;
    if (k === 'ball') return '';
    if (k === 'start') return String(OPT.start[MSET.start]);
    if (k === 'play') return '►';
    if (k === 'shake') return GS.shake ? 'ON' : 'OFF';
    if (k === 'crt') return GS.crt ? 'ON' : 'OFF';
    return OPT[k][MSET[k]];
  }
  refresh() {
    const a = ARENAS[MSET.arena];
    if (a.id === 'classic') { makeArena(this); this.preview.setTexture('bg_far'); }
    else this.preview.setTexture(makeModernArena(this, a.id));
    this.preview.setDisplaySize(140, 76);
    this.fieldName.setText('◄  ' + a.name + '  ►');
    this.ballImg.setTexture(BALLS[MSET.ball].key);
    this.rows.forEach((r, i) => { this.rowT[i][0].setColor(i === this.sel ? '#ffd23a' : '#9ab8f0'); this.rowT[i][1].setText(this.val(r[0])).setColor(i === this.sel ? '#ffd23a' : '#ffffff'); });
  }
  change(d) {
    const k = this.rows[this.sel][0];
    const cyc = (key, n) => { MSET[key] = (MSET[key] + d + n) % n; };
    if (k === 'field') cyc('arena', ARENAS.length);
    else if (k === 'ball') cyc('ball', BALLS.length);
    else if (k === 'start') cyc('start', OPT.start.length);
    else if (k === 'shake') { GS.shake = !GS.shake; GS.saveOpts(); }
    else if (k === 'crt') { GS.crt = !GS.crt; GS.saveOpts(); applyCRT(); }
    else if (OPT[k]) cyc(k, OPT[k].length);
    else return;
    SFX.blip(); this.refresh();
  }
  update() {
    if (this.gone) return;
    if (this.jd('up')) { this.sel = (this.sel + this.rows.length - 1) % this.rows.length; this.refresh(); SFX.blip(); }
    if (this.jd('down')) { this.sel = (this.sel + 1) % this.rows.length; this.refresh(); SFX.blip(); }
    if (this.jd('left')) this.change(-1);
    if (this.jd('right')) this.change(1);
    if (this.jd('esc')) { this.gone = true; this.scene.start(GS.career && GS.career.round > 0 ? 'MainMenu' : 'TeamSelect'); return; }
    if (this.btn() || this.startPressed()) {
      const k = this.rows[this.sel][0];
      this.gone = true; SFX.select();
      // formazione: scelta dei giocatori in campo per il numero di giocatori impostato
      if (k === 'lineL' || k === 'lineR') this.scene.start('Formazione', { code: k === 'lineL' ? MSET.left : MSET.right, n: PLAYER_COUNTS[MSET.players], women: MSET.women === 1, back: 'MatchSettings' });
      else this.scene.start('CoinToss', { a: MSET.left, b: MSET.right, human: [MSET.leftAI ? 0 : 1, MSET.rightAI ? 0 : (MSET.leftAI ? 1 : 2)],
        next: (s, toss) => startModernMatch(s, toss) });   // sorteggio: chi batte e in che campo
    }
  }
}

// traduce MSET (scelte dei menu) nella configurazione della scena Match; skill dell'IA ricavata dalle statistiche
// toss = esito del sorteggio (CoinToss): { aServes, aLeft } riferiti a MSET.left; senza sorteggio batte la squadra a sinistra
function startModernMatch(scene, toss) {
  const a = ARENAS[MSET.arena], sp = OPT.start[MSET.start];
  const rules = [{ target: 25, sideOut: false }, { target: 15, sideOut: false }, { target: 15, sideOut: true }][MSET.rules];
  let codes = [MSET.left, MSET.right], st = [statsOf(MSET.left), statsOf(MSET.right)];
  const sk = s => clamp(0.35 + (s[0] + s[1] + s[2] - 210) / 90 * 0.55, 0.4, 0.92);
  let humans = [MSET.leftAI ? 0 : 1, MSET.rightAI ? 0 : (MSET.leftAI ? 1 : 2)];
  let first = 0;
  if (toss) {
    if (!toss.aLeft) { codes = codes.reverse(); st = st.reverse(); humans = humans.reverse(); }   // la squadra A gioca nel campo destro
    first = toss.aServes === toss.aLeft ? 0 : 1;
  }
  scene.scene.start('Match', {
    mode: 'modern', left: codes[0], right: codes[1], humans, skillL: sk(st[0]), skillR: sk(st[1]), players: PLAYER_COUNTS[MSET.players],
    stats: st, start: [sp, sp], time: null, women: MSET.women === 1, setLabel: codes[0] + ' vs ' + codes[1],
    firstServe: first,
    modern: { arena: a.id, floor: a.floor, ball: BALLS[MSET.ball].key, rebound: OPT.rebound[MSET.rebound], target: MSET.target === 0,
              targetPts: rules.target, sideOut: rules.sideOut, fx: MSET.fx === 0 },
    onDone: m => m.scene.start('MatchStats', { teams: m.teams.map(t => ({ code: t.code, score: t.score, players: t.players.map(p => ({ name: p.name, ni: p.ni, idx: p.idx, pos: p.pos })), stats: t.pstats })), winner: m.winner.id })
  });
}

// ---------------- STATISTICHE DI FINE PARTITA ----------------
class MatchStatsScene extends Base {
  constructor() { super('MatchStats'); }
  init(d) { this.d = d; }
  create() {
    camSetup(this); makeCommon(this); this.keysInit();
    UI.bg(this);
    const d = this.d, T = d.teams;
    this.add.image(60, 18, makeFlagTex(this, T[0].code, 36, 24)); this.add.image(260, 18, makeFlagTex(this, T[1].code, 36, 24));
    this.add.text(60, 33, TEAMS[T[0].code].name, UI.f(6, '#ffffff', true)).setOrigin(0.5, 0); this.add.text(260, 33, TEAMS[T[1].code].name, UI.f(6, '#ffffff', true)).setOrigin(0.5, 0);
    this.add.text(160, 18, `${T[0].score}  |  ${T[1].score}`, UI.f(14, '#ffffff', true)).setOrigin(0.5);
    if (d.sets) this.add.text(160, 33, d.sets.map(s => s.join('-')).join('   '), UI.f(5.5, '#7ad0ff', true)).setOrigin(0.5, 0);   // parziali dei set
    this.add.text(d.winner ? 300 : 20, 18, 'WIN', UI.f(10, '#ffd23a', true)).setOrigin(d.winner ? 1 : 0, 0.5);
    const rows = ['Points', 'Spike Points', 'Lob Points', 'Block Points', 'Aces'], keys = ['pts', 'spike', 'lob', 'block', 'ace'];
    [0, 1].forEach(s => {
      const ox = s ? 164 : 4;
      UI.panel(this, ox, 48, 152, 110, 'MATCH STATS');
      // colonne: un giocatore per posto (con 4 in campo l'ordine classico REC, SPK, SPK, SET)
      const PL = T[s].players, short = { mb: 'SPK', set: 'SET', oh: 'SPK', def: 'REC', bk: 'DEF', lib: 'LIB', bch: 'BCH' };
      const order = PL.length === 4 ? [3, 0, 2, 1] : PL.map((_, i) => i), step = Math.min(22, 84 / Math.max(1, order.length - 1));
      rows.forEach((r, i) => this.add.text(ox + 4, 96 + i * 12, r, UI.f(5, '#ff8ab8')));
      order.forEach((pi, c) => {
        const cx = ox + 54 + c * step;
        this.add.text(cx, 60, short[PL[pi] && PL[pi].pos] || ['REC', 'SPK', 'SPK', 'SET'][c] || '', UI.f(5, '#9ab8f0', true)).setOrigin(0.5, 0);
        const ni = T[s].players[pi] ? T[s].players[pi].ni : pi;
        this.add.image(cx, 76, makeFaceTex(this, T[s].code, ni, 'neutral')).setScale(0.38);
        const st = (T[s].stats || {})[ni] || {};
        keys.forEach((k, i) => this.add.text(cx, 96 + i * 12, String(st[k] || 0), UI.f(6, '#ffffff', true)).setOrigin(0.5, 0));
      });
      const tot = k => Object.values(T[s].stats || {}).reduce((a, v) => a + (v[k] || 0), 0);
      keys.forEach((k, i) => this.add.text(ox + 146, 96 + i * 12, String(k === 'pts' ? T[s].score : tot(k)), UI.f(6, '#ffd23a', true)).setOrigin(1, 0));
    });
    const car = GS.career;
    this.opts = car && !d.beach ? (d.winner === 0 && car.round < 3 ? ['QUIT', 'NEXT MATCH'] : ['QUIT', 'RESTART']) : ['QUIT', 'MATCH SETTINGS', 'RESTART'];
    this.optT = this.opts.map((o, i) => this.add.text(60 + i * (200 / Math.max(1, this.opts.length - 1)), 180, o, UI.f(7, '#ffffff', true)).setOrigin(0.5));
    if (car && !d.beach) {
      let msg;
      if (d.winner === 0 && car.round >= 3) { msg = 'CAMPIONE DEL TORNEO!'; GS.careerBest = 4; }
      else if (d.winner === 0) { msg = `TURNO ${car.round + 1} SUPERATO`; GS.careerBest = Math.max(GS.careerBest || 0, car.round + 1); }
      else msg = 'ELIMINATO';
      this.add.text(160, 166, msg, UI.f(8, '#ffd23a', true)).setOrigin(0.5);
    }
    this.sel = this.opts.length - 1; this.refresh();
  }
  refresh() { this.optT.forEach((t, i) => t.setColor(i === this.sel ? '#ffd23a' : '#ffffff').setScale(i === this.sel ? 1.15 : 1)); }
  update() {
    if (this.gone) return;
    if (this.jd('left')) { this.sel = (this.sel + this.opts.length - 1) % this.opts.length; this.refresh(); SFX.blip(); }
    if (this.jd('right')) { this.sel = (this.sel + 1) % this.opts.length; this.refresh(); SFX.blip(); }
    if (this.btn() || this.startPressed()) {
      this.gone = true; SFX.select();
      const o = this.opts[this.sel];
      if (o === 'QUIT') { GS.career = null; this.scene.start('MainMenu'); }
      else if (o === 'MATCH SETTINGS') this.scene.start(this.d.beach ? 'BeachSettings' : 'MatchSettings');
      else if (o === 'NEXT MATCH') { GS.career.round++; MSET.right = GS.career.opps[GS.career.round]; startModernMatch(this); }
      else if (this.d.beach) startBeachMatch(this, true);
      else startModernMatch(this);
    }
  }
}

// ---------------- SORTEGGIO (testa o croce) ----------------
// Prima della partita il capitano chiama testa o croce. Chi vince sceglie BATTUTA / RICEZIONE oppure il CAMPO
// (sinistro / destro); l'altra squadra prende la scelta rimasta, come nelle regole della pallavolo.
// dati: { a, b: codici delle squadre (a = squadra di casa / sinistra di default), human: [ha, hb] (0 = computer),
//         next(scene, { aServes, aLeft }) }
class CoinTossScene extends Base {
  constructor() { super('CoinToss'); }
  init(d) { this.d = d; this.gone = false; }
  create() {
    camSetup(this); makeCommon(this); this.keysInit(); UI.bg(this);
    const d = this.d, T = [d.a, d.b];
    this.add.text(160, 10, 'SORTEGGIO', UI.f(10, '#ffd23a', true)).setOrigin(0.5, 0);
    T.forEach((c, i) => {
      this.add.image(i ? 250 : 70, 52, makeFlagTex(this, c, 40, 27));
      this.add.text(i ? 250 : 70, 70, TEAMS[c].name, UI.f(5.5, '#ffffff', true)).setOrigin(0.5, 0);
      this.add.text(i ? 250 : 70, 80, d.human[i] ? 'P' + d.human[i] : 'CPU', UI.f(5, d.human[i] ? '#ffd23a' : '#9ab8f0', true)).setOrigin(0.5, 0);
    });
    this.coin = this.add.graphics(); this.coinTxt = this.add.text(160, 60, '', UI.f(12, '#5a3a08', true)).setOrigin(0.5);
    this.msg = this.add.text(160, 108, '', { ...UI.f(6.5, '#ffffff', true), align: 'center' }).setOrigin(0.5, 0);
    this.optT = [0, 1, 2, 3].map(i => this.add.text(160, 136 + i * 13, '', UI.f(6.5, '#ffffff', true)).setOrigin(0.5, 0));
    this.add.text(160, 212, '↑↓ / ← → scegli   Z: conferma', UI.f(5, '#9ab8f0')).setOrigin(0.5);
    // chiama chi gioca (la squadra di casa se giocano in due); senza persone chiama il computer
    this.caller = d.human[0] ? 0 : d.human[1] ? 1 : 0;
    this.face = 0; this.res = {}; this.said = [];
    this.drawCoin(1, 0);
    this.ask('call', `IL CAPITANO DI ${TEAMS[T[this.caller]].name}\nCHIAMA:`, ['TESTA', 'CROCE'], this.caller);
  }
  drawCoin(sy, face) {
    const g = this.coin; g.clear();
    g.fillStyle(0x000000, 0.35).fillEllipse(162, 63, 40, 40 * Math.max(0.08, Math.abs(sy)));
    g.fillStyle(0xd8a020, 1).fillEllipse(160, 60, 40, 40 * Math.max(0.08, Math.abs(sy)));
    g.fillStyle(0xf2c840, 1).fillEllipse(160, 60, 32, 32 * Math.max(0.08, Math.abs(sy)));
    this.coinTxt.setText(Math.abs(sy) > 0.35 ? (face ? '✚' : 'T') : '').setScale(1, Math.max(0.1, Math.abs(sy)));
  }
  // domanda alla squadra who: persona = menu, computer = scelta automatica dopo un attimo
  ask(step, text, opts, who) {
    this.step = step; this.opts = opts; this.who = who; this.sel = 0;
    this.msg.setText(text);
    this.optT.forEach((t, i) => t.setText(opts[i] || ''));
    this.refresh();
    // computer: si vede la sua scelta evidenziata (con il nome della squadra) prima di andare avanti
    if (!this.d.human[who]) this.time.delayedCall(900, () => {
      const i = this.aiPick(step); this.sel = i; this.refresh();
      if (step !== 'call') this.msg.setText(`${text}\nCPU SCEGLIE: ${opts[i]}`);
      this.time.delayedCall(step === 'call' ? 300 : 1300, () => this.choose(i));
    });
  }
  aiPick(step) {
    if (step === 'call') return Math.random() < 0.5 ? 0 : 1;
    if (step === 'win') return Math.random() < 0.7 ? 0 : 2;            // di solito il computer sceglie di battere
    return Math.floor(Math.random() * this.opts.length);
  }
  refresh() { this.optT.forEach((t, i) => t.setColor(i === this.sel ? '#ffd23a' : '#ffffff').setScale(i === this.sel ? 1.1 : 1)); }
  choose(i) {
    if (this.step === 'call') {
      this.call = i; this.step = 'flip'; this.optT.forEach(t => t.setText(''));
      this.msg.setText(`${TEAMS[[this.d.a, this.d.b][this.caller]].name} CHIAMA ${i ? 'CROCE' : 'TESTA'}...`);
      const out = Math.random() < 0.5 ? 0 : 1; SFX.select();
      this.tweens.addCounter({ from: 0, to: Math.PI * 9 + (out ? Math.PI : 0), duration: 1600, ease: 'Cubic.out',
        onUpdate: tw => { const v = tw.getValue(); this.drawCoin(Math.cos(v), Math.floor((v + Math.PI / 2) / Math.PI) % 2); },
        onComplete: () => {
          this.drawCoin(1, out);
          this.winner = out === this.call ? this.caller : 1 - this.caller;
          const W = TEAMS[[this.d.a, this.d.b][this.winner]].name;
          this.time.delayedCall(500, () => this.ask('win', `${out ? 'CROCE' : 'TESTA'}!  VINCE ${W}\nCHE COSA SCEGLIE?`, ['BATTUTA', 'RICEZIONE', 'CAMPO SINISTRO', 'CAMPO DESTRO'], this.winner));
        } });
      return;
    }
    const me = this.who, other = 1 - me, o = this.opts[i];
    this.said.push(`${TEAMS[[this.d.a, this.d.b][me]].name} → ${o}`);
    if (o === 'BATTUTA' || o === 'RICEZIONE') this.res.serve = o === 'BATTUTA' ? me : other;
    else this.res.left = o === 'CAMPO SINISTRO' ? me : other;
    if (this.step === 'win') {   // l'altra squadra prende la scelta rimasta
      const name = TEAMS[[this.d.a, this.d.b][other]].name;
      // regola: chi vince il sorteggio sceglie UNA cosa (battuta/ricezione oppure campo), l'altra squadra quella rimasta
      const why = `${TEAMS[[this.d.a, this.d.b][me]].name} HA SCELTO ${o}`;
      if (this.res.serve === undefined) this.ask('lose', `${why}\n${name}: BATTUTA O RICEZIONE?`, ['BATTUTA', 'RICEZIONE'], other);
      else this.ask('lose', `${why}\n${name}: IN QUALE CAMPO?`, ['CAMPO SINISTRO', 'CAMPO DESTRO'], other);
      return;
    }
    // riepilogo e via
    const T = [this.d.a, this.d.b];
    this.step = 'done'; this.optT.forEach(t => t.setText(''));
    this.msg.setText(`${this.said.join('\n')}\n\nBATTE PER PRIMA: ${TEAMS[T[this.res.serve]].name}\n${TEAMS[T[this.res.left]].name} NEL CAMPO SINISTRO\n\nZ: VIA!`);
    if (!this.d.human[0] && !this.d.human[1]) this.time.delayedCall(1500, () => this.go());
  }
  go() { if (this.gone) return; this.gone = true; SFX.select(); this.d.next(this, { aServes: this.res.serve === 0, aLeft: this.res.left === 0 }); }
  update() {
    if (this.gone) return;
    if (this.step === 'done') { if (this.btn() || this.startPressed()) this.go(); return; }
    if (this.step === 'flip' || !this.d.human[this.who]) return;
    const n = this.opts.length;
    if (this.jd('up') || this.jd('left')) { this.sel = (this.sel + n - 1) % n; this.refresh(); SFX.blip(); }
    if (this.jd('down') || this.jd('right')) { this.sel = (this.sel + 1) % n; this.refresh(); SFX.blip(); }
    if (this.btn() || this.startPressed()) { SFX.select(); this.choose(this.sel); }
  }
}
