// ============================================================
//  BEACH VOLLEY: 2 contro 2 sulla sabbia, sole, mare e regole da spiaggia.
//  Regole (FIVB beach):
//   - 2 giocatori per squadra, campo 8 x 8 m (CFG.BEACH_HALF), niente cambi né libero, nessun ruolo fisso
//     (alza chi non ha ricevuto, attacca l'altro);
//   - rally point: set a 21 con 2 punti di scarto, partita al meglio dei 3 set, il terzo (tie-break) a 15;
//   - cambio campo ogni 7 punti giocati (ogni 5 nel terzo set);
//   - il tocco a muro conta come primo tocco; vietato il pallonetto a mano aperta (si gioca lo "shot");
//   - niente palleggio di seconda di là; la battuta si alterna tra i due giocatori.
//  Il motore è lo stesso della pallavolo indoor (match.js): qui ci sono squadre, arene, menu e la gestione dei set.
// ============================================================
// INDICE DEL FILE
//   1. squadre da spiaggia (aggiunte a TEAMS), gruppo BEACH, bandiere/stemmi, pallone da beach
//   2. arene sulla sabbia (BEACH_ARENAS, makeBeachArena) e campo di sabbia (MatchScene.buildBeachArena)
//   3. BSET: impostazioni scelte; startBeachMatch: partita su più set
//   4. scene: BeachSelect (squadre), BeachSettings (campo, formato, formazioni), BeachSet (fine set)

// ---------------- squadre ----------------
// flagOf = bandiera della nazione; emblem = disegno dello stemma per le squadre inventate
Object.assign(TEAMS, {
  SUN: { name: 'SUNSET SHARKS', sh: '#ff7a1a', tr: '#14c8c0', so: '#0e6a8a', ha: ['#e0c070', '#3a2010', '#c08a40'], sk: '#e8a878', names: ['KAI', 'BRODY', 'ZANE', 'TANNER', 'REEF', 'COLE'], emblem: 'sun' },
  COC: { name: 'COCO LOCOS', sh: '#f4f4f4', tr: '#20a050', so: '#18884a', ha: ['#1a0e06', '#2a1808', '#5a3010'], sk: '#c8885a', names: ['RICO', 'PACO', 'TITO', 'NANDO', 'CHUY', 'LALO'], emblem: 'coco' },
  PAL: { name: 'PALM KINGS', sh: '#f2d020', tr: '#1a7a3a', so: '#1a1a1a', ha: ['#2a1408', '#8a5a20', '#141414'], sk: '#d8a070', names: ['DUKE', 'ACE', 'REX', 'MAX', 'JET', 'BUZZ'], emblem: 'palm' },
  TIK: { name: 'TIKI BROS', sh: '#8a4a1a', tr: '#ffb020', so: '#f07a1a', ha: ['#0e0806', '#1a0e06', '#2a1408'], sk: '#a8703c', names: ['KOA', 'NALU', 'MAKANI', 'KEOLA', 'IKAIKA', 'MANU'], emblem: 'tiki' },
  WAV: { name: 'WAVE RIDERS', sh: '#2ad0f0', tr: '#ffffff', so: '#1a3aa0', ha: ['#d8b060', '#e0c070', '#a07030'], sk: '#f2c0a0', names: ['SKYLER', 'DUSTY', 'CHAD', 'BLAKE', 'TROY', 'DYLAN'], emblem: 'wave' },
  MNG: { name: 'MANGO JAM', sh: '#ffb21a', tr: '#e8306a', so: '#e8306a', ha: ['#3a2010', '#141414', '#8a4a18'], sk: '#b67a4c', names: ['JOJO', 'BENTO', 'ZICO', 'RUDY', 'LIMA', 'TOTO'], emblem: 'mango' },
  ITB: { name: 'ITALIA BEACH', sh: '#2a48d8', tr: '#ffffff', so: '#1a1a3a', ha: ['#2a1408', '#5a2a10', '#8a4a18'], sk: '#e8a878', names: ['SANDRO', 'NICOLA', 'ALEX', 'DANIELE', 'PIETRO', 'MATTIA'], flagOf: 'ITA' },
  BRB: { name: 'BRASIL PRAIA', sh: '#f2d020', tr: '#1e9a40', so: '#2040c0', ha: ['#1a0e06', '#2a1808', '#3a2010'], sk: '#a8703c', names: ['GUGA', 'DUDU', 'TICO', 'BIBA', 'NENE', 'CACAU'], flagOf: 'BRA' },
  USB: { name: 'USA BEACH', sh: '#ffffff', tr: '#d42a2a', so: '#2a3ccc', ha: ['#d8b060', '#8a4a18', '#3a2010'], sk: '#f2b48c', names: ['JAKE', 'CODY', 'TREY', 'CHASE', 'BRANT', 'SHANE'], flagOf: 'USA' },
  NOB: { name: 'NORGE BEACH', sh: '#d02020', tr: '#ffffff', so: '#203080', ha: ['#e0c070', '#d8b060', '#a07030'], sk: '#f2c8a8', names: ['SVEIN', 'HAKON', 'LEIF', 'EIRIK', 'STIG', 'TROND'], flagOf: 'NOR' }
});
Object.assign(TEAM_STATS, {
  SUN: [84, 78, 86], COC: [78, 84, 82], PAL: [86, 76, 78], TIK: [80, 80, 80], WAV: [74, 80, 88], MNG: [76, 74, 80],
  ITB: [84, 84, 82], BRB: [90, 86, 88], USB: [86, 84, 84], NOB: [88, 86, 82]
});
const BEACH_TEAMS = ['SUN', 'COC', 'PAL', 'TIK', 'WAV', 'MNG', 'ITB', 'BRB', 'USB', 'NOB'];

// bandiera della nazione per le coppie nazionali, stemma disegnato per le squadre inventate
const _drawFlagBeach = drawFlag;
drawFlag = function (c, x, y, w, h, code) {
  const P = TEAMS[code];
  if (P && P.flagOf) return _drawFlagBeach(c, x, y, w, h, P.flagOf);
  if (!P || !P.emblem) return _drawFlagBeach(c, x, y, w, h, code);
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#6ad0ff'); g.addColorStop(0.62, '#bfeaff'); g.addColorStop(0.62, '#f2d8a0'); g.addColorStop(1, '#e0b878');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  const cx = x + w / 2, cy = y + h * 0.5, r = h * 0.3;
  const E = {
    sun: () => { c.fillStyle = '#ff9a1a'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); c.fillStyle = P.tr; c.beginPath(); c.moveTo(cx - r * 1.4, cy + r * 0.6); c.lineTo(cx, cy - r * 0.6); c.lineTo(cx + r * 0.3, cy + r * 0.6); c.fill(); },
    coco: () => { c.fillStyle = '#6a3a1a'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(cx, cy, r * 0.65, 0, 7); c.fill(); c.fillStyle = '#20a050'; c.fillRect(cx - r, cy - r * 1.3, r * 2, r * 0.4); },
    palm: () => { c.fillStyle = '#7a4a1a'; c.fillRect(cx - r * 0.12, cy - r * 0.6, r * 0.24, r * 1.8); c.fillStyle = '#1a8a3a'; for (let a = 0; a < 5; a++) { c.beginPath(); c.ellipse(cx + Math.cos(a * 1.26) * r * 0.6, cy - r * 0.7 + Math.sin(a * 1.26) * r * 0.3, r * 0.7, r * 0.2, a * 1.26, 0, 7); c.fill(); } },
    tiki: () => { c.fillStyle = '#8a4a1a'; c.fillRect(cx - r * 0.6, cy - r * 1.2, r * 1.2, r * 2.3); c.fillStyle = '#ffb020'; c.fillRect(cx - r * 0.45, cy - r * 0.7, r * 0.3, r * 0.3); c.fillRect(cx + r * 0.15, cy - r * 0.7, r * 0.3, r * 0.3); c.fillRect(cx - r * 0.4, cy + r * 0.2, r * 0.8, r * 0.25); },
    wave: () => { c.fillStyle = '#1a6ad0'; c.beginPath(); c.arc(cx, cy + r * 0.3, r * 1.1, Math.PI, 0); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(cx + r * 0.3, cy + r * 0.3, r * 0.6, Math.PI, 0); c.fill(); },
    mango: () => { c.fillStyle = '#ffb21a'; c.beginPath(); c.ellipse(cx, cy, r * 1.1, r * 0.85, 0.4, 0, 7); c.fill(); c.fillStyle = '#e8306a'; c.beginPath(); c.ellipse(cx + r * 0.3, cy + r * 0.2, r * 0.6, r * 0.45, 0.4, 0, 7); c.fill(); c.fillStyle = '#2a8a3a'; c.fillRect(cx - r * 0.1, cy - r * 1.1, r * 0.5, r * 0.25); }
  };
  E[P.emblem]();
  c.fillStyle = '#1a1a2a'; c.font = `bold ${Math.max(4, h * 0.22)}px Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillText(code, cx, y + h - 1.5); c.textAlign = 'left';
};

// pallone da beach (giallo, blu e bianco)
function makeBeachBall(scene) {
  makeBalls(scene);
  if (scene.textures.exists('ball_beach')) return;
  const { t, c } = canvasTex(scene, 'ball_beach', 8, 8);
  if (GR > 1) drawBallHD(c, 4, 4, 4, { base: ['#ffffff', '#fff4c8', '#c8b070'], a: 'rgba(250,200,20,0.95)', b: 'rgba(30,90,220,0.9)', seam: 'rgba(40,40,80,0.6)' });
  else {
    c.fillStyle = '#fff4c8'; c.fillRect(2, 0, 4, 8); c.fillRect(0, 2, 8, 4); c.fillRect(1, 1, 6, 6);
    c.fillStyle = '#f2c818'; c.fillRect(1, 1, 3, 3); c.fillRect(5, 4, 2, 3);
    c.fillStyle = '#2058d8'; c.fillRect(4, 1, 2, 2); c.fillRect(1, 5, 3, 2);
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(2, 1, 1, 1);
  }
  texDone(t);
}

// ---------------- arene ----------------
// sky = colori del cielo dall'alto, sea = mare, sand = sabbia del campo, sun = posizione del sole
const BEACH_ARENAS = [
  { id: 'copa', name: 'COPACABANA', sky: ['#1a7ae8', '#5ab8ff', '#bfe8ff'], sea: ['#1a8ad0', '#2ab0d8'], sand: 0xf0d8a0, sun: [430, -80], sunCol: 'rgba(255,240,170,0.9)' },
  { id: 'tour', name: 'BEACH TOUR STADIUM', sky: ['#2a86f0', '#7ac8ff', '#d8f2ff'], sea: ['#1a7ac0', '#38a8d0'], sand: 0xeccf96, sun: [120, -90], sunCol: 'rgba(255,245,190,0.9)' },
  { id: 'sunset', name: 'TROPICAL SUNSET', sky: ['#3a1a5a', '#c83a6a', '#ff9a4a', '#ffd88a'], sea: ['#6a3a7a', '#e87a5a'], sand: 0xe8c08a, sun: [280, 40], sunCol: 'rgba(255,200,90,0.95)' }
];

function makeBeachArena(scene, id) {
  const key = 'barena_' + id;
  if (scene.textures.exists(key)) return key;
  const A = BEACH_ARENAS.find(a => a.id === id) || BEACH_ARENAS[0];
  const W = 560, H = 224 - ATOP, Y = v => v - ATOP;
  const { t, c } = canvasTex(scene, key, W, H);
  const R = seeded(hashStr('beach:' + id)), dusk = id === 'sunset';
  const swim = ['#ff4f7a', '#ffd23a', '#2ad0c0', '#ff8a2a', '#ffffff', '#3a8af0', '#e83a3a', '#9a4ae0', '#3ac04a'];
  const person = GR > 1 ? (x, y) => crowdPersonHD(c, x, y, swim, R) : (x, y) => {
    c.fillStyle = swim[Math.floor(R() * swim.length)]; c.fillRect(x, y + 3, 4, 4);
    c.fillStyle = R() < 0.6 ? '#e8b088' : '#9a6038'; c.fillRect(x + 1, y, 2, 3);
    c.fillStyle = R() < 0.5 ? '#2a1a10' : '#d8b060'; c.fillRect(x + 1, y, 2, 1);
  };
  // cielo
  const sky = c.createLinearGradient(0, 0, 0, Y(120));
  A.sky.forEach((col, i) => sky.addColorStop(i / (A.sky.length - 1), col));
  c.fillStyle = sky; c.fillRect(0, 0, W, H);
  // sole con alone
  const [sx, syw] = A.sun, sy = Y(syw);
  const sg = c.createRadialGradient(sx, sy, 2, sx, sy, dusk ? 90 : 60);
  sg.addColorStop(0, 'rgba(255,255,235,1)'); sg.addColorStop(0.16, A.sunCol); sg.addColorStop(0.45, 'rgba(255,220,130,0.22)'); sg.addColorStop(1, 'rgba(255,220,130,0)');
  c.fillStyle = sg; c.fillRect(sx - 90, sy - 90, 180, 180);
  c.fillStyle = dusk ? '#ffe6a0' : '#fffbe0'; c.beginPath(); c.arc(sx, sy, dusk ? 16 : 9, 0, 7); c.fill();
  // nuvole
  for (let i = 0; i < 8; i++) {
    const x = R() * W, y = Y(-100 + R() * 70), w = 18 + R() * 26;
    c.fillStyle = dusk ? 'rgba(255,170,150,0.7)' : 'rgba(255,255,255,0.88)';
    for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(x + (k - 1.5) * w * 0.4, y - (k % 2) * 3, w * 0.4, 5 + (k % 2) * 2, 0, 0, 7); c.fill(); }
  }
  // gabbiani
  c.strokeStyle = dusk ? '#3a1a3a' : '#2a3a4a'; c.lineWidth = 0.7;
  for (let i = 0; i < 6; i++) { const x = R() * W, y = Y(-90 + R() * 60); c.beginPath(); c.moveTo(x - 3, y - 1); c.quadraticCurveTo(x - 1.5, y - 2.5, x, y); c.quadraticCurveTo(x + 1.5, y - 2.5, x + 3, y - 1); c.stroke(); }
  // montagne / isole all'orizzonte
  const hz = 104;
  const hill = (x0, w, h, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(x0, Y(hz)); c.quadraticCurveTo(x0 + w * 0.2, Y(hz - h), x0 + w * 0.5, Y(hz - h)); c.quadraticCurveTo(x0 + w * 0.8, Y(hz - h), x0 + w, Y(hz)); c.fill(); };
  if (id === 'copa') { hill(20, 70, 50, '#3a6a5a'); hill(70, 40, 26, '#4a7a62'); hill(330, 160, 22, '#5a8a74'); hill(470, 90, 34, '#4a7a6a'); }
  else if (id === 'sunset') { hill(60, 120, 20, '#4a2a4a'); hill(380, 70, 30, '#3a2040'); }
  else { hill(0, 140, 18, '#6a9aa0'); hill(400, 160, 14, '#7aaab0'); }
  // mare con onde e riflesso del sole
  const sea = c.createLinearGradient(0, Y(hz), 0, Y(150));
  sea.addColorStop(0, A.sea[0]); sea.addColorStop(1, A.sea[1]);
  c.fillStyle = sea; c.fillRect(0, Y(hz), W, Y(150) - Y(hz));
  for (let y = hz + 3; y < 150; y += 4) for (let x = (y * 7) % 23; x < W; x += 20 + R() * 20) { c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x, Y(y), 4 + R() * 6, 0.8); }
  c.fillStyle = dusk ? 'rgba(255,200,110,0.5)' : 'rgba(255,255,230,0.35)';
  for (let y = hz + 1; y < 148; y += 3) c.fillRect(sx - 14 + R() * 6, Y(y), 16 + R() * 10, 1);
  // barca a vela
  c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(250, Y(118)); c.lineTo(250, Y(100)); c.lineTo(262, Y(118)); c.fill();
  c.fillStyle = dusk ? '#2a1a2a' : '#8a3a2a'; c.fillRect(244, Y(118), 22, 3);
  // battigia e sabbia lontana
  c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(0, Y(150), W, 2);
  const sd = c.createLinearGradient(0, Y(151), 0, Y(198));
  sd.addColorStop(0, dusk ? '#d8a878' : '#f2dcaa'); sd.addColorStop(1, dusk ? '#c89060' : '#e2c286');
  c.fillStyle = sd; c.fillRect(0, Y(151), W, Y(198) - Y(151));
  // tribune: grande tribuna dello stadio oppure gradinate basse ai lati
  const stand = (x0, x1, y0, y1, frame) => {
    c.fillStyle = frame; c.fillRect(x0, Y(y0), x1 - x0, Y(y1) - Y(y0));
    for (let y = y0 + 2; y < y1 - 4; y += 7) {
      c.fillStyle = shade(frame, 1.25); c.fillRect(x0, Y(y) + 5, x1 - x0, 2);
      for (let x = x0 + 2 + ((y / 7) % 2) * 3; x < x1 - 4; x += 5) if (R() < 0.85) person(x, Y(y));
    }
    c.fillStyle = shade(frame, 0.6); for (let x = x0; x < x1; x += 24) c.fillRect(x, Y(y1 - 4), 2, 6);
  };
  if (id === 'tour') {
    stand(40, 520, 30, 180, '#5a6a7a');
    c.fillStyle = '#e8306a'; c.fillRect(40, Y(20), 480, 10);   // striscione del torneo
    c.fillStyle = '#ffffff'; c.font = 'bold 7px Arial, sans-serif'; c.textAlign = 'center';
    c.fillText(`${GAME_TITLE[0]} ${GAME_TITLE[1]}  ·  BEACH VOLLEY WORLD TOUR`, 280, Y(27.5)); c.textAlign = 'left';
    for (const fx of [60, 160, 400, 500]) { c.fillStyle = '#d8d8d8'; c.fillRect(fx, Y(-30), 1.5, 50); c.fillStyle = ['#ffd23a', '#2ad0c0', '#ff4f7a', '#3a8af0'][fx % 4]; c.fillRect(fx + 1.5, Y(-30), 12, 8); }
  } else {
    stand(0, 150, 140, 182, dusk ? '#4a3a4a' : '#7a8a96'); stand(410, 560, 140, 182, dusk ? '#4a3a4a' : '#7a8a96');
  }
  // palme
  const palm = (x, h, lean) => {
    c.strokeStyle = dusk ? '#2a1420' : '#7a4a22'; c.lineWidth = 4; c.beginPath(); c.moveTo(x, Y(196)); c.quadraticCurveTo(x + lean * 0.3, Y(196 - h * 0.6), x + lean, Y(196 - h)); c.stroke();
    c.strokeStyle = dusk ? 'rgba(0,0,0,0.3)' : 'rgba(60,30,10,0.45)'; c.lineWidth = 1;
    for (let k = 0; k < h; k += 5) { const tt = k / h; const px = x + lean * tt * tt, py = Y(196 - k); c.beginPath(); c.moveTo(px - 2, py); c.lineTo(px + 2, py - 1); c.stroke(); }
    const tx = x + lean, ty = Y(196 - h);
    c.fillStyle = dusk ? '#1a0e1a' : '#1e8a3a';
    for (let a = 0; a < 7; a++) {
      const an = -Math.PI * 0.95 + a * Math.PI * 0.32;
      c.beginPath(); c.moveTo(tx, ty);
      c.quadraticCurveTo(tx + Math.cos(an) * 16, ty + Math.sin(an) * 10 - 8, tx + Math.cos(an) * 26, ty + Math.sin(an) * 8 + 6);
      c.quadraticCurveTo(tx + Math.cos(an) * 12, ty + Math.sin(an) * 6 - 2, tx, ty); c.fill();
    }
    if (!dusk) { c.fillStyle = '#6a3a14'; c.beginPath(); c.arc(tx - 2, ty + 3, 2.2, 0, 7); c.arc(tx + 2, ty + 3.5, 2.2, 0, 7); c.fill(); }
  };
  palm(18, 120, 22); palm(150, 92, -16); palm(400, 100, 18); palm(546, 128, -24);
  // ombrelloni, asciugamani, torce tiki al tramonto
  const umbrella = (x, col) => {
    c.fillStyle = '#e8e8e8'; c.fillRect(x, Y(178), 1, 18);
    c.fillStyle = col; c.beginPath(); c.moveTo(x - 12, Y(181)); c.quadraticCurveTo(x, Y(170), x + 12, Y(181)); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.moveTo(x - 4, Y(180)); c.quadraticCurveTo(x, Y(172), x + 4, Y(180)); c.fill();
  };
  [[190, '#ff4f7a'], [228, '#ffd23a'], [330, '#2ad0c0'], [366, '#ff8a2a']].forEach(([x, col]) => umbrella(x, col));
  for (const [x, col] of [[200, '#3a8af0'], [342, '#ff4f7a']]) { c.fillStyle = col; c.fillRect(x, Y(194), 16, 3); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(x + 3, Y(194), 2, 3); }
  if (dusk) for (const x of [175, 260, 300, 385]) { c.fillStyle = '#3a2010'; c.fillRect(x, Y(168), 2, 28); c.fillStyle = '#ffb030'; c.beginPath(); c.ellipse(x + 1, Y(166), 2.5, 4, 0, 0, 7); c.fill(); }
  // tabellone del punteggio di bordo campo e luce calda
  c.fillStyle = 'rgba(255,240,200,0.08)'; c.fillRect(0, 0, W, H);
  texDone(t); return key;
}

// campo di sabbia (sostituisce pavimento e palo dell'arena moderna)
MatchScene.prototype.buildBeachArena = function (md) {
  const W = CFG.OX * 2, FY = CFG.FLOOR_Y, A = BEACH_ARENAS.find(a => a.id === md.arena) || BEACH_ARENAS[0];
  this.add.image(0, ATOP, makeBeachArena(this, A.id)).setOrigin(0).setScrollFactor(0.82, 1).setDepth(-50);
  const g = this.add.graphics().setDepth(-20), sc = Phaser.Display.Color.IntegerToColor(A.sand);
  g.fillStyle(sc.clone().darken(10).color, 1).fillRect(0, 196, W, 6);
  g.fillGradientStyle(sc.clone().lighten(4).color, sc.clone().lighten(4).color, sc.clone().darken(14).color, sc.clone().darken(14).color, 1).fillRect(0, 202, W, 60);
  // granelli, impronte e piccole dune
  const R = seeded(77);
  for (let i = 0; i < 900; i++) {
    const x = R() * W, y = 197 + R() * 60, d = R();
    g.fillStyle(d < 0.5 ? sc.clone().darken(16).color : sc.clone().lighten(14).color, 0.55).fillRect(x, y, d < 0.9 ? 0.6 : 1.2, 0.6);
  }
  for (let i = 0; i < 40; i++) { const x = SX(rnd(-CFG.HALF, CFG.HALF)), y = 207 + R() * 14; g.fillStyle(sc.clone().darken(22).color, 0.35).fillEllipse(x, y, 2.4, 1); }
  // nastri del campo (blu) e picchetti agli angoli
  const L = CFG.HALF;
  g.fillStyle(0x1a5ad8, 1).fillRect(SX(-L), 205, L * 2, 1.6);
  g.fillStyle(0x0a2a8a, 1).fillRect(SX(-L), 206.6, L * 2, 0.6);
  for (const x of [-L, L]) g.fillStyle(0x1a5ad8, 1).fillRect(SX(x) - 1, 203, 2, 4);
  // pali imbottiti, rete con banda blu e antenne
  const n = this.add.graphics().setDepth(FY + 2), cx = SX(0), top = FY - CFG.NET_H - 10;
  n.fillStyle(0x606870, 1).fillRect(cx - 1.5, top, 3, FY - top + 2);
  n.fillStyle(0xf2d020, 1).fillRect(cx - 3, FY - 40, 6, 42);             // imbottitura gialla
  n.fillStyle(0x1a5ad8, 1).fillRect(cx - 3, FY - 40, 6, 3).fillRect(cx - 3, FY - 20, 6, 3);
  n.fillStyle(0xffffff, 0.4).fillRect(cx - 2, FY - 40, 1, 42);
  n.fillStyle(0x1a5ad8, 1).fillRect(cx - 1.2, FY - CFG.NET_H - 1, 2.4, 3);  // banda della rete
  n.fillStyle(0x0a0a0a, 0.75).fillRect(cx - 1, FY - CFG.NET_H + 2, 2, 20);
  n.fillStyle(0xffffff, 1).fillRect(cx - 0.5, top - 14, 1, 16);
  for (let y = top - 14; y < top + 2; y += 4) n.fillStyle(0xe02020, 1).fillRect(cx - 0.5, y, 1, 2);
  n.fillStyle(sc.clone().darken(25).color, 1).fillEllipse(cx, FY + 2, 14, 3);
  this.sbX = -999; this.sbY = -999; this.sbNames = [this.add.text(0, 0, ''), this.add.text(0, 0, '')]; this.sbNames.forEach(t => t.setVisible(false));
  this.sbG = this.add.graphics().setVisible(false);
};

// ---------------- impostazioni e partita su più set ----------------
const BSET = { left: 'SUN', right: 'COC', leftAI: false, rightAI: true, arena: 0, fmt: 0, ball: 0, rebound: 0, target: 0, fx: 0, women: 0 };
const BEACH_FORMATS = [
  { name: '2 SET SU 3 (21 - 21 - 15)', sets: 3, pts: 21 },
  { name: '1 SET A 21', sets: 1, pts: 21 },
  { name: '1 SET A 15', sets: 1, pts: 15 }
];
const BEACH_BALLS = ['ball_beach', 'ball', 'ball_pro', 'ball_gold'];
const BEACH_M = { sets: [], stats: [{}, {}] };   // partita in corso: punteggi dei set e statistiche sommate

const setsWon = sets => sets.reduce((c, s) => (s[0] > s[1] ? c[0]++ : c[1]++, c), [0, 0]);

// avvia il set successivo (fresh = nuova partita)
function startBeachMatch(scene, fresh = true) {
  if (fresh) { BEACH_M.sets = []; BEACH_M.stats = [{}, {}]; }
  const F = BEACH_FORMATS[BSET.fmt], A = BEACH_ARENAS[BSET.arena], k = BEACH_M.sets.length;
  const need = Math.ceil(F.sets / 2), won = setsWon(BEACH_M.sets);
  const decider = F.sets > 1 && k === F.sets - 1;
  const st = [statsOf(BSET.left), statsOf(BSET.right)];
  const sk = s => clamp(0.35 + (s[0] + s[1] + s[2] - 210) / 90 * 0.55, 0.4, 0.92);
  const humans = [BSET.leftAI ? 0 : 1, BSET.rightAI ? 0 : (BSET.leftAI ? 1 : 2)];
  const pts = decider ? 15 : F.pts;
  scene.scene.start('Match', {
    mode: 'modern', beach: true, players: 2, women: BSET.women === 1, left: BSET.left, right: BSET.right, humans, skillL: sk(st[0]), skillR: sk(st[1]),
    stats: st, start: [0, 0], time: null, firstServe: k % 2,
    setLabel: F.sets > 1 ? `SET ${k + 1}${decider ? '  ·  TIE-BREAK' : ''}   ${BSET.left} ${won[0]}-${won[1]} ${BSET.right}` : 'BEACH VOLLEY',
    setsWon: F.sets > 1 ? won : null, switchEvery: pts <= 15 ? 5 : 7,
    modern: { arena: A.id, sand: true, floor: A.sand, ball: BEACH_BALLS[BSET.ball], rebound: OPT.rebound[BSET.rebound], target: BSET.target === 0,
              targetPts: pts, sideOut: false, fx: BSET.fx === 0 },
    onDone: m => {
      BEACH_M.sets.push([m.teams[0].score, m.teams[1].score]);
      m.teams.forEach((t, i) => { for (const [ni, s] of Object.entries(t.pstats)) { const o = BEACH_M.stats[i][ni] || (BEACH_M.stats[i][ni] = {}); for (const key in s) o[key] = (o[key] || 0) + s[key]; } });
      const w = setsWon(BEACH_M.sets);
      if (w[0] >= need || w[1] >= need) {
        m.scene.start('MatchStats', {
          beach: true, sets: BEACH_M.sets.slice(), winner: w[0] > w[1] ? 0 : 1,
          teams: m.teams.map((t, i) => ({ code: t.code, score: F.sets > 1 ? w[i] : t.score, players: t.players.map(p => ({ name: p.name, ni: p.ni, idx: p.idx, pos: p.pos })), stats: BEACH_M.stats[i] }))
        });
      } else m.scene.start('BeachSet');
    }
  });
}

// ---------------- SCENE ----------------
// fondale estivo dei menu beach
function beachBg(scene) {
  const g = scene.add.graphics();
  g.fillGradientStyle(0x2a9af0, 0x2a9af0, 0x9ad8ff, 0x9ad8ff, 1).fillRect(0, 0, 320, 150);
  g.fillStyle(0x1a8ad0, 1).fillRect(0, 150, 320, 18);
  g.fillStyle(0xffffff, 0.5); for (let x = 0; x < 320; x += 18) g.fillRect(x + (x % 7), 156, 8, 1);
  g.fillGradientStyle(0xf2dcaa, 0xf2dcaa, 0xd8b878, 0xd8b878, 1).fillRect(0, 168, 320, 56);
  g.fillStyle(0xfff4c0, 1).fillCircle(282, 26, 12); g.fillStyle(0xfff8d8, 0.25).fillCircle(282, 26, 22);
  return g;
}

// selezione delle coppie: squadre beach (gruppo BEACH) e tutte le altre, con anteprima dei giocatori in costume
class BeachSelectScene extends Base {
  constructor() { super('BeachSelect'); }
  create() {
    camSetup(this); makeCommon(this); this.keysInit(); setLook(this, true);
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.kq = this.input.keyboard.addKey(K.Q); this.ke = this.input.keyboard.addKey(K.E); this.kc = this.input.keyboard.addKey(K.C); this.kf = this.input.keyboard.addKey(K.F);
    beachBg(this);
    this.groups = [BEACH_TEAMS, ...GROUPS]; this.gnames = ['BEACH', ...GROUP_NAMES];
    const find = c => { for (let g = 0; g < this.groups.length; g++) { const i = this.groups[g].indexOf(c); if (i >= 0) return [g, i]; } return [0, 0]; };
    const a = find(BSET.left), b = find(BSET.right);
    this.grp = [a[0], b[0]]; this.idx = [a[1], b[1]]; this.side = BSET._side || 0; BSET._side = 0;
    this.add.text(160, 9, 'BEACH VOLLEY - SCEGLI LE COPPIE', UI.f(8, '#ffffff', true)).setOrigin(0.5).setStroke('#0a3a7a', 3);
    this.add.text(160, 214, '← → coppia   Q/E gruppo   C: IA/TASTIERA   F: FORMAZIONE   Z: conferma   ESC: indietro', UI.f(4.6, '#0a2a5a', true)).setOrigin(0.5);
    this.dyn = []; this.draw();
  }
  code(s) { return this.groups[this.grp[s]][this.idx[s]]; }
  draw() {
    this.dyn.forEach(o => o.destroy()); this.dyn = [];
    const D = o => (this.dyn.push(o), o);
    for (const s of [0, 1]) {
      const ox = s ? 166 : 6, code = this.code(s), P = TEAMS[code], ai = s ? BSET.rightAI : BSET.leftAI, on = s === this.side;
      applyLineup(this, code, 2);
      const g = D(this.add.graphics());
      g.fillStyle(0x0a2a5a, 0.72).fillRoundedRect(ox, 22, 148, 168, 5);
      g.lineStyle(on ? 2 : 1, on ? 0xffd23a : 0x6ac8ff).strokeRoundedRect(ox + 0.5, 22.5, 147, 167, 5);
      D(this.add.text(ox + 6, 26, this.gnames[this.grp[s]], UI.f(6, '#7ad0ff', true)));
      D(this.add.text(ox + 142, 26, ai ? 'IA' : (s ? 'P2' : 'P1'), UI.f(7, ai ? '#7ad0ff' : '#ffd23a', true)).setOrigin(1, 0));
      D(this.add.image(ox + 74, 52, makeFlagTex(this, code, 36, 24)));
      D(this.add.text(ox + 74, 67, `◄  ${P.name}  ►`, UI.f(P.name.length > 14 ? 5.5 : 7, '#ffffff', true)).setOrigin(0.5, 0));
      // i due giocatori in costume da spiaggia
      for (let i = 0; i < 2; i++) {
        makePlayerTex(this, code, i);
        const x = ox + 50 + i * 48;
        D(this.add.ellipse(x, 138, 26, 5, 0x000000, 0.25));
        D(this.add.sprite(x, 138, plKey(code, i), PF.idle).setOrigin(0.5, 1).setScale(1.3).setFlipX(i === 1));
        D(this.add.text(x, 141, `${P.nums && P.nums[i] ? '#' + P.nums[i] + ' ' : ''}${P.names[i]}`, UI.f(P.names[i].length > 9 ? 4.2 : 5.2, '#ffd23a', true)).setOrigin(0.5, 0));
      }
      UI.bars(this, ox + 50, 158, code, true).forEach(D);
    }
  }
  update() {
    if (this.gone) return;
    const s = this.side, n = this.groups[this.grp[s]].length;
    let ch = false;
    if (this.jd('left')) { this.idx[s] = (this.idx[s] + n - 1) % n; ch = true; }
    if (this.jd('right')) { this.idx[s] = (this.idx[s] + 1) % n; ch = true; }
    const gd = Phaser.Input.Keyboard.JustDown(this.kq) ? -1 : Phaser.Input.Keyboard.JustDown(this.ke) ? 1 : 0;
    if (gd) { const G = this.groups.length; this.grp[s] = (this.grp[s] + gd + G) % G; this.idx[s] = Math.min(this.idx[s], this.groups[this.grp[s]].length - 1); ch = true; }
    if (Phaser.Input.Keyboard.JustDown(this.kc)) { if (s) BSET.rightAI = !BSET.rightAI; else BSET.leftAI = !BSET.leftAI; ch = true; }
    if (ch) { SFX.blip(); if (s) BSET.right = this.code(1); else BSET.left = this.code(0); this.draw(); }
    if (Phaser.Input.Keyboard.JustDown(this.kf)) {
      this.gone = true; SFX.select(); BSET._side = s;
      this.scene.start('Formazione', { code: this.code(s), n: 2, beach: true, back: 'BeachSelect' }); return;
    }
    if (this.jd('esc')) { if (s === 1) { this.side = 0; this.draw(); } else { this.gone = true; this.scene.start('MainMenu'); } return; }
    if (this.btn() || this.startPressed()) {
      SFX.select();
      if (s === 0) { BSET.left = this.code(0); this.side = 1; this.draw(); return; }
      BSET.right = this.code(1); this.gone = true; this.scene.start('BeachSettings');
    }
  }
}

// impostazioni: spiaggia, formato della partita, pallone, aiuti, formazioni
class BeachSettingsScene extends Base {
  constructor() { super('BeachSettings'); }
  create() {
    camSetup(this); makeCommon(this); makeBeachBall(this); this.keysInit(); setLook(this, true);
    beachBg(this);
    const L = BSET.left, Rt = BSET.right;
    this.add.image(110, 20, makeFlagTex(this, L, 36, 24)); this.add.image(210, 20, makeFlagTex(this, Rt, 36, 24));
    this.add.text(160, 20, 'VS', UI.f(12, '#ffffff', true)).setOrigin(0.5).setStroke('#0a3a7a', 3);
    this.add.text(110, 35, TEAMS[L].name, UI.f(5.5, '#ffffff', true)).setOrigin(0.5, 0).setStroke('#0a3a7a', 2);
    this.add.text(210, 35, TEAMS[Rt].name, UI.f(5.5, '#ffffff', true)).setOrigin(0.5, 0).setStroke('#0a3a7a', 2);
    const p = this.add.graphics(); p.fillStyle(0x0a2a5a, 0.78).fillRoundedRect(6, 48, 150, 122, 4).fillRoundedRect(162, 48, 152, 156, 4);
    this.preview = this.add.image(81, 104, '__DEFAULT');
    this.fieldName = this.add.text(81, 158, '', UI.f(6, '#7ad0ff', true)).setOrigin(0.5);
    this.rows = [['field', 'SPIAGGIA'], ['fmt', 'PARTITA'], ['ball', 'PALLONE'], ['rebound', 'REBOUND INDICATOR'], ['target', 'ATTACK TARGET'],
                 ['fx', 'ARCADE FX'], ['women', 'SQUADRE'], ['lineL', 'FORMAZIONE ' + L], ['lineR', 'FORMAZIONE ' + Rt], ['play', 'PLAY']];
    this.rowT = this.rows.map((r, i) => [this.add.text(166, 52 + i * 15, r[1], UI.f(5.5, '#9ab8f0')), this.add.text(310, 58.5 + i * 15, '', UI.f(6, '#ffffff', true)).setOrigin(1, 0)]);
    this.ballImg = this.add.image(300, 90, 'ball_beach').setScale(1.4);
    this.add.text(81, 178, 'REGOLE BEACH: 2 contro 2, rally a 21,\ncambio campo ogni 7 punti, muro = 1° tocco,\nniente pallonetto a mano aperta', { ...UI.f(4.4, '#0a2a5a', true), align: 'center' }).setOrigin(0.5, 0);
    this.add.text(240, 212, '↑↓ voce   ← → cambia   Z: avanti   ESC: indietro', UI.f(4.6, '#0a2a5a', true)).setOrigin(0.5);
    this.sel = this.rows.length - 1; this.refresh();
  }
  val(k) {
    if (k === 'field') return '';
    if (k === 'fmt') return BEACH_FORMATS[BSET.fmt].name;
    if (k === 'ball') return '';
    if (k === 'rebound') return OPT.rebound[BSET.rebound];
    if (k === 'target' || k === 'fx' || k === 'women') return OPT[k][BSET[k]];
    if (k === 'lineL' || k === 'lineR') { const c = k === 'lineL' ? BSET.left : BSET.right; applyLineup(this, c, 2); return BSET.women ? femName(c, 0) + ' + ' + femName(c, 1) : TEAMS[c].names.slice(0, 2).join(' + '); }
    return '►';
  }
  refresh() {
    const a = BEACH_ARENAS[BSET.arena];
    this.preview.setTexture(makeBeachArena(this, a.id)).setDisplaySize(140, 84);
    this.fieldName.setText('◄  ' + a.name + '  ►');
    this.ballImg.setTexture(BEACH_BALLS[BSET.ball]);
    this.rows.forEach((r, i) => { const on = i === this.sel; this.rowT[i][0].setColor(on ? '#ffd23a' : '#9ab8f0'); this.rowT[i][1].setText(this.val(r[0])).setColor(on ? '#ffd23a' : '#ffffff'); });
  }
  change(d) {
    const k = this.rows[this.sel][0], cyc = (key, n) => { BSET[key] = (BSET[key] + d + n) % n; };
    if (k === 'field') cyc('arena', BEACH_ARENAS.length);
    else if (k === 'fmt') cyc('fmt', BEACH_FORMATS.length);
    else if (k === 'ball') cyc('ball', BEACH_BALLS.length);
    else if (k === 'rebound') cyc('rebound', OPT.rebound.length);
    else if (k === 'target' || k === 'fx' || k === 'women') cyc(k, OPT[k].length);
    else return;
    SFX.blip(); this.refresh();
  }
  update() {
    if (this.gone) return;
    const n = this.rows.length;
    if (this.jd('up')) { this.sel = (this.sel + n - 1) % n; this.refresh(); SFX.blip(); }
    if (this.jd('down')) { this.sel = (this.sel + 1) % n; this.refresh(); SFX.blip(); }
    if (this.jd('left')) this.change(-1);
    if (this.jd('right')) this.change(1);
    if (this.jd('esc')) { this.gone = true; this.scene.start('BeachSelect'); return; }
    if (this.btn() || this.startPressed()) {
      const k = this.rows[this.sel][0];
      this.gone = true; SFX.select();
      if (k === 'lineL' || k === 'lineR') this.scene.start('Formazione', { code: k === 'lineL' ? BSET.left : BSET.right, n: 2, beach: true, back: 'BeachSettings' });
      else startBeachMatch(this, true);
    }
  }
}

// tra un set e l'altro: punteggi dei set
class BeachSetScene extends Base {
  constructor() { super('BeachSet'); }
  create() {
    camSetup(this); makeCommon(this); this.keysInit(); beachBg(this);
    const w = setsWon(BEACH_M.sets);
    const g = this.add.graphics(); g.fillStyle(0x0a2a5a, 0.8).fillRoundedRect(30, 30, 260, 150, 6);
    this.add.text(160, 40, `FINE SET ${BEACH_M.sets.length}`, UI.f(9, '#ffd23a', true)).setOrigin(0.5);
    this.add.image(90, 78, makeFlagTex(this, BSET.left, 36, 24)); this.add.image(230, 78, makeFlagTex(this, BSET.right, 36, 24));
    this.add.text(90, 96, TEAMS[BSET.left].name, UI.f(5.5, '#ffffff', true)).setOrigin(0.5, 0);
    this.add.text(230, 96, TEAMS[BSET.right].name, UI.f(5.5, '#ffffff', true)).setOrigin(0.5, 0);
    this.add.text(160, 78, `${w[0]} - ${w[1]}`, UI.f(18, '#ffffff', true)).setOrigin(0.5);
    this.add.text(160, 120, BEACH_M.sets.map(s => s.join('-')).join('     '), UI.f(7, '#7ad0ff', true)).setOrigin(0.5);
    const decider = BEACH_M.sets.length === BEACH_FORMATS[BSET.fmt].sets - 1;
    this.add.text(160, 142, decider ? 'TIE-BREAK A 15  ·  cambio campo ogni 5 punti' : 'prossimo set a 21  ·  cambio campo ogni 7 punti', UI.f(5, '#ffffff')).setOrigin(0.5);
    this.add.text(160, 200, 'Z: SET SUCCESSIVO', UI.f(8, '#0a2a5a', true)).setOrigin(0.5);
  }
  update() {
    if (this.gone || !(this.btn() || this.startPressed())) return;
    this.gone = true; SFX.select(); startBeachMatch(this, false);
  }
}
