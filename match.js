// ============================================================
//  Partita: un solo pulsante + joystick a 8 direzioni (dal manuale).
//  - Battuta: pulsante = lancio, pulsante di nuovo = colpo.
//      joystick SU al lancio = battuta a "parabola altissima" (towering)
//      joystick verso rete al lancio = battuta in salto
//  - Ricezione: solo joystick (il pulsante non si usa). SU in ricezione = open attack.
//  - Alzata: automatica; se la ricezione è sbagliata muovi l'alzatore col joystick.
//      SU = palla alta, GIÙ = palla bassa (primo tempo), INDIETRO = seconda linea.
//      Pulsante prima dell'alzata = quick attack. Durante l'alzata in salto:
//      joystick verso rete + pulsante = surprise attack (palleggio di seconda).
//  - Schiacciata: rincorsa e salto automatici, pulsante al momento giusto.
//      sinistra/destra = lungo/corto, SU = pallonetto, GIÙ = power spike.
//      Pulsante prima che l'asso salti = finta (fake attack).
//  - Muro: pulsante al momento giusto.
// ============================================================
// INDICE DELLA SCENA 'Match' (tutte le partite: arcade, demo, pratica, moderna, campionato)
//   create / buildArena / buildModernArena / makeTeam / buildHud ......... preparazione
//   setupInput / pollInput ................................................ tastiera (P1 frecce+Z, P2 WASD+G)
//   update -> step(dt) ................................................... ciclo principale (fisica a passi fissi)
//   prepareServe / updateServe / toss / hitServe ........................ battuta
//   think / choosePlayer ................................................... IA: chi va sulla palla e dove
//   movePlayer / blockerJump / jump / startDive ......................... movimento dei giocatori
//   updateBall / checkContacts / doPass / doSet / doSpike / doBlock ....... palla e tocchi
//   ballLanded / endRally / updateDead / applyScore / matchOver ........... punto, punteggio, fine partita
//   render ................................................................. telecamera, sprite, ombre, indicatori
//
// STATI DELLA PARTITA (this.state): intro -> serve -> rally -> dead -> serve ... -> end
// GIOCATORE (p): x, z (altezza), vz, state (pose: idle, run, pass, set, jump, spike, block, dive, down...), animT (durata posa),
//   idx = posto in campo, pos = ruolo del posto (FORMATIONS in config.js: mb, set, oh, def, bk, lib, bch), ni = indice del giocatore (nome/volto) che ruota.
// SQUADRA (t): side (-1 sinistra, +1 destra), human (0 = IA, 1 = P1, 2 = P2), skill, score, touches, plan (piano dell'IA),
//   attacker / attackType (chi schiaccia e come), blockers (chi salta a muro).
// PALLA (this.ball): x, h, vx, vy, live (in gioco), held (in mano al battitore), lastTeam / lastPlayer / lastKind (ultimo tocco),
//   ver = contatore che cambia a ogni tocco (serve per sapere se un evento riguarda ancora lo stesso colpo).
//
// Configurazione ricevuta in init(d): mode ('1p','2p','demo','practice','modern'), left/right (codici squadra), humans, skillL/R,
//   start (punteggio iniziale), time (secondi o null), modern (opzioni della modalità moderna), onDone (cosa fare a fine partita).
class MatchScene extends Phaser.Scene {
  constructor() { super('Match'); }

  init(d) {
    this.cfg = d;
    this.mode = d.mode;
  }

  create() {
    camSetup(this);
    this.camT = undefined; this.camV = 0;
    this.simT = 0; this.serveMsg = null; this.phantom = null; this.thunder = null; this.aimD = 6;
    // la scena viene riusata: niente oggetti della partita precedente (modalità moderna)
    this.mSb = null; this.mSbT = null; this.mSetT = null; this.hudCam = null; this.ballRef = null; this.zoom = 0; this.camCx = undefined; this.camBot = undefined;
    const d = this.cfg;
    makeCommon(this); makeArena(this); makeBalls(this);
    // regole: arcade 1991 / rally point moderno (impostazioni di Thunder Spikes)
    this.modern = d.modern || null;
    const md = this.modern;
    this.beach = !!d.beach;            // beach volley: 2 contro 2 sulla sabbia (vedi beach.js)
    this.nPl = this.beach ? 2 : (FORMATIONS[d.players] ? d.players : 4);   // giocatori in campo per squadra
    this.rules = {
      target: md ? md.targetPts : CFG.TARGET, winBy: CFG.WIN_BY, cap: md ? 999 : CFG.CAP,
      sideOut: md ? md.sideOut : CFG.SIDE_OUT, fx: md ? md.fx : true,
      beach: this.beach, switchEvery: d.switchEvery || 0   // beach: cambio campo ogni 7 punti (5 nel terzo set)
    };
    // misure del campo: 9 m per metà campo, 8 m sulla sabbia (battuta e stacco della battuta in salto si spostano di conseguenza)
    CFG.HALF = this.beach ? CFG.BEACH_HALF : 180; CFG.SERVE_X = CFG.HALF + 75; CFG.JS_TAKEOFF = CFG.HALF + 16;
    this.women = !!d.women;            // versione femminile (giocatrici, nomi e telecronaca al femminile)
    this.he = this.women ? 'SHE' : 'HE';
    setLook(this, this.beach, this.women);
    for (const code of [d.left, d.right]) applyLineup(this, code, this.nPl);   // formazione scelta (lineup.js)
    for (const code of [d.left, d.right]) for (let i = 0; i < this.nPl; i++) { makePlayerTex(this, code, i); makeFaceTex(this, code, i, 'neutral'); makeFaceTex(this, code, i, 'cheer'); }
    ['whistle', 'pointL', 'pointR', 'out', 'touch', 'net', 'win'].forEach(p => makeRefTex(this, p));
    if (md && md.arena !== 'classic') this.buildModernArena(md);
    else this.buildArena(TEAMS[d.floor || d.right].fl);

    this.teams = [this.makeTeam(0, d.left, -1), this.makeTeam(1, d.right, 1)];
    this.teams[0].human = d.humans[0]; this.teams[1].human = d.humans[1];
    this.teams[0].skill = d.skillL; this.teams[1].skill = d.skillR;
    this.teams[0].score = d.start[0]; this.teams[1].score = d.start[1];
    // statistiche squadra (attacco/difesa/velocità) e statistiche per giocatore
    this.teams.forEach((t, i) => {
      const s = (d.stats && d.stats[i]) || [80, 80, 80];
      t.atkK = 0.9 + (s[0] - 70) / 150; t.defK = (s[1] - 75) / 200; t.spdK = 0.88 + (s[2] - 70) / 140;
      t.pstats = {};
    });

    this.ball = { x: 0, h: 0, vx: 0, vy: 0, held: null, live: false, bouncing: false, ver: 0, lastTeam: null, lastPlayer: null, lastKind: null, spin: 0, trail: [] };
    this.shadowG = this.add.graphics().setDepth(5);
    this.fx = this.add.graphics().setDepth(990);
    this.ballSpr = this.add.image(0, 0, md ? md.ball : 'ball').setDepth(1000);
    if (md && md.arena !== 'classic' && !md.sand) {
      // riflessi sul pavimento lucido
      this.ballRef = this.add.image(0, 0, md.ball).setDepth(-15).setAlpha(0.3).setFlipY(true);
      for (const t of this.teams) for (const p of t.players) p.ref = this.add.sprite(0, 0, p.spr.texture.key, 0).setOrigin(0.5, 0).setFlipX(p.spr.flipX).setFlipY(true).setAlpha(0.28).setDepth(-15);
    }
    this.popups = [];

    this.buildHud();
    this.setupInput();
    if (md) this.setupModernHud();

    this.serving = this.teams[d.firstServe || 0];
    this.timeLeft = d.time;            // null = nessun limite (demo)
    this.acc = 0; this.camX = 0; this.lastVer = -1; this.verAge = 0;
    this.lastPointServer = null;
    this.state = 'intro'; this.stateT = 0;
    this.prepareServe();
    // dissolvenza d'ingresso con "FINAL SET"
    this.introDark = this.add.rectangle(160, 112, 320, 224, 0x000000, 1).setScrollFactor(0).setDepth(1900);
    this.introTxt = this.add.text(160, 92, d.setLabel || 'FINAL SET', TXT(12, '#b0b0b0')).setOrigin(0.5).setScrollFactor(0).setDepth(1901);
    this.tweens.add({ targets: this.introDark, alpha: 0.55, duration: 900 });
    this.cameras.main.fadeIn(400);
  }

  // ------------------------------------------------ arena
  // palazzetto arcade: sfondi a parallasse, tabellone LED, pavimento, linee e rete
  buildArena(floorColor) {
    const W = CFG.OX * 2, FY = CFG.FLOOR_Y;
    this.add.image(0, 0, 'bg_far').setOrigin(0).setScrollFactor(0.5).setDepth(-50);
    this.add.image(0, 112, 'bg_ads').setOrigin(0).setScrollFactor(0.65).setDepth(-45);
    this.add.image(0, 134, 'bg_mid').setOrigin(0).setScrollFactor(0.8).setDepth(-40);
    this.add.image(0, 176, 'bg_boards').setOrigin(0).setScrollFactor(0.9).setDepth(-35);
    // tabellone come nel video HD: pannello grigio scuro, sigle in riquadri, cifre LED rosse a 7 segmenti
    const sbx = 226, sby = 56;
    this.sbX = sbx; this.sbY = sby;
    const sb = this.add.graphics().setScrollFactor(0.5).setDepth(-30);
    sb.fillStyle(0x1c1c1c, 1).fillRect(sbx - 1, sby - 1, 92, 38);
    sb.fillStyle(0x3a3a38, 1).fillRect(sbx, sby, 90, 36);
    sb.fillStyle(0x4a4a46, 1).fillRect(sbx, sby, 90, 1);
    for (const lx of [sbx + 12, sbx + 52]) { sb.fillStyle(0x161616, 1).fillRect(lx, sby + 3, 26, 9); sb.lineStyle(1, 0x5a5a56).strokeRect(lx + 0.5, sby + 3.5, 25, 8); }
    this.sbNames = [this.add.text(sbx + 25, sby + 4, '', TXT(6, '#e0e0d8')).setOrigin(0.5, 0).setScrollFactor(0.5).setDepth(-29),
                    this.add.text(sbx + 65, sby + 4, '', TXT(6, '#e0e0d8')).setOrigin(0.5, 0).setScrollFactor(0.5).setDepth(-29)];
    this.sbG = this.add.graphics().setScrollFactor(0.5).setDepth(-28);
    // pavimento (video HD): bordo scuro, fascia del colore del campo, riga gialla, riga bianca spessa, campo
    const g = this.add.graphics().setDepth(-20);
    const fc = Phaser.Display.Color.IntegerToColor(floorColor);
    g.fillStyle(0x2a2a2a, 1).fillRect(0, 198, W, 2);
    g.fillStyle(fc.clone().darken(12).color, 1).fillRect(0, 200, W, 3);
    g.fillStyle(0xf0b830, 1).fillRect(0, 203, W, 1);
    g.fillStyle(floorColor, 1).fillRect(0, 204, W, 20);
    g.fillStyle(fc.clone().lighten(14).color, 1).fillRect(0, 209, W, 15);
    g.fillStyle(0xffffff, 1).fillRect(SX(-CFG.HALF), 205, CFG.HALF * 2, 3);
    for (const x of [-60, 60]) g.fillStyle(0xe8e8e8, 1).fillRect(SX(x) - 2, 205, 4, 3);
    // palo della rete (video HD): asta sottile nera con giunti in alto, cilindro blu in basso, base metallica
    const n = this.add.graphics().setDepth(FY + 2), cx = SX(0);
    const top = FY - CFG.NET_H - 14, mid = FY - 26;
    n.fillStyle(0x0c0c10, 1).fillRect(cx - 1.5, top, 3, mid - top);
    n.fillStyle(0x6a6a72, 1).fillRect(cx - 0.5, top, 1, mid - top);
    for (let y = top + 3; y < mid - 2; y += 7) { n.fillStyle(0x2a2a30, 1).fillRect(cx - 2.5, y, 5, 2); n.fillStyle(0xb0b0b8, 1).fillRect(cx - 1.5, y, 1, 1); }
    n.fillStyle(0xd8d8e0, 1).fillRect(cx - 1, top - 4, 2, 4);
    n.fillStyle(0x1a2a6a, 1).fillRect(cx - 3.5, mid, 7, FY - mid + 2);
    n.fillStyle(0x3a5ab8, 1).fillRect(cx - 2, mid, 2, FY - mid + 2);
    n.fillStyle(0x0a1236, 1).fillRect(cx + 2, mid, 1.5, FY - mid + 2);
    n.fillStyle(0x9a9aa4, 1).fillRect(cx - 3.5, mid - 2, 7, 2).fillRect(cx - 3.5, mid + 9, 7, 1);
    n.fillStyle(0x1a1a1e, 1).fillRect(cx - 5, FY + 1, 10, 3);
    n.fillStyle(0x6a6a70, 1).fillRect(cx - 5, FY + 1, 10, 1);
  }

  // arena della modalità moderna (Thunder Spikes): sfondo scelto, pavimento lucido, palo blu
  buildModernArena(md) {
    if (md.sand) return this.buildBeachArena(md);   // spiaggia: beach.js
    const W = CFG.OX * 2, FY = CFG.FLOOR_Y;
    this.add.image(0, ATOP, makeModernArena(this, md.arena)).setOrigin(0).setScrollFactor(0.82, 1).setDepth(-50);
    // pavimento lucido con gradiente e linee del campo
    const g = this.add.graphics().setDepth(-20), fc = Phaser.Display.Color.IntegerToColor(md.floor);
    g.fillStyle(fc.clone().darken(20).color, 1).fillRect(0, 198, W, 4);
    g.fillGradientStyle(fc.clone().lighten(6).color, fc.clone().lighten(6).color, fc.clone().darken(18).color, fc.clone().darken(18).color, 1).fillRect(0, 202, W, 60);
    g.fillStyle(0xffffff, 0.9).fillRect(SX(-CFG.HALF), 205, CFG.HALF * 2, 2);
    g.fillStyle(0xffffff, 0.12).fillRect(SX(-CFG.HALF), 207, CFG.HALF * 2, 4);
    for (const x of [-60, 60]) g.fillStyle(0xffffff, 0.9).fillRect(SX(x) - 1, 205, 2, 2);
    g.fillStyle(0xf2c818, 0.6).fillRect(SX(-CFG.HALF) - 2, 205, 2, 2).fillRect(SX(CFG.HALF), 205, 2, 2);
    // palo moderno (blu) con antenna bianca/rossa
    const n = this.add.graphics().setDepth(FY + 2), cx = SX(0), top = FY - CFG.NET_H - 14;
    n.fillStyle(0x1a3aa8, 1).fillRect(cx - 2, top, 4, FY - top + 2);
    n.fillStyle(0x5a8af0, 1).fillRect(cx - 1, top, 1, FY - top + 2);
    n.fillStyle(0xffffff, 1).fillRect(cx - 0.5, top - 16, 1, 16);
    for (let y = top - 16; y < top; y += 4) n.fillStyle(0xe02020, 1).fillRect(cx - 0.5, y, 1, 2);
    n.fillStyle(0x0a0a0a, 0.8).fillRect(cx - 1, FY - CFG.NET_H, 2, 22);
    n.fillStyle(0x202020, 1).fillRect(cx - 5, FY + 1, 10, 2);
    this.sbX = -999; this.sbY = -999; this.sbNames = [this.add.text(0, 0, ''), this.add.text(0, 0, '')]; this.sbNames.forEach(t => t.setVisible(false));
    this.sbG = this.add.graphics().setVisible(false);
  }

  // modalità moderna: seconda telecamera per l'interfaccia, così quella di gioco può zoomare
  setupModernHud() {
    // seconda telecamera per l'interfaccia: la telecamera di gioco può zoomare senza deformare l'HUD
    this.hudCam = this.cameras.add(0, 0, CFG.W * CFG.ZOOM, CFG.H * CFG.ZOOM).setOrigin(0, 0).setZoom(CFG.ZOOM);
    this.timeLbl.setVisible(false); this.timeText.setVisible(false);
    this.annText.setPosition(160, this.cfg.setsWon ? 42 : 34).setOrigin(0.5, 0);   // telecronaca sotto il tabellone LED, non dietro
    if (!this.rules.fx) this.annText.setVisible(false);
    // tabellone LED appeso (Thunder Spikes)
    this.mSb = this.add.graphics().setScrollFactor(0).setDepth(2000);
    this.mSbT = [this.add.text(140, 3, '', UI.f(6, '#d8d8d8', true)).setOrigin(0.5, 0).setScrollFactor(0).setDepth(2001),
                 this.add.text(180, 3, '', UI.f(6, '#d8d8d8', true)).setOrigin(0.5, 0).setScrollFactor(0).setDepth(2001)];
    this.updateScoreboard();
  }

  // ogni oggetto va su una sola telecamera: quelli fissi (scrollFactor 0) sull'HUD, gli altri sul campo
  routeCameras() {
    if (!this.hudCam) return;
    for (const o of this.children.list) {
      if (o._cam) continue;
      o._cam = true;
      if (o.scrollFactorX === 0) this.cameras.main.ignore(o); else this.hudCam.ignore(o);
    }
  }

  // statistiche per giocatore (punti, schiacciate, pallonetti, muri, ace) per la schermata MATCH STATS
  stat(p, k) {
    const s = p.team.pstats[p.ni] || (p.team.pstats[p.ni] = { pts: 0, spike: 0, lob: 0, block: 0, ace: 0 });
    s[k] = (s[k] || 0) + 1;
  }

  // cifra a 7 segmenti (LED rosso con alone)
  led(g, x, y, d, w, h, col) {
    const S = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', ' ': '' }[d] || '';
    const t = 2, segs = { a: [x + 1, y, w - 2, t], d: [x + 1, y + h - t, w - 2, t], g: [x + 1, y + h / 2 - t / 2, w - 2, t],
      f: [x, y + 1, t, h / 2 - 1], b: [x + w - t, y + 1, t, h / 2 - 1], e: [x, y + h / 2, t, h / 2 - 1], c: [x + w - t, y + h / 2, t, h / 2 - 1] };
    for (const k of 'abcdefg') { const r = segs[k]; g.fillStyle(S.includes(k) ? col : 0x221010, 1).fillRect(r[0], r[1], r[2], r[3]); }
  }

  // nome del giocatore del posto i (nella versione femminile i nomi delle giocatrici)
  nameOf(code, i) { return this.women ? femLabel(code, TEAMS[code].names[i]) : TEAMS[code].names[i]; }

  // crea la squadra e i giocatori in campo secondo la formazione (FORMATIONS in config.js);
  // lo sprite usa plKey, che sceglie la texture giusta per la versione grafica
  makeTeam(id, code, side) {
    const P = TEAMS[code], F = FORMATIONS[this.nPl];
    const t = { id, code, side, pal: P, human: 0, skill: 0.8, touches: 0, score: 0, plan: null, planCache: null, attacker: null, attackType: null,
                rot: 0, streak: 0, blockers: [], blockedVer: -1, combo: false, players: [], mishit: false, open: false, quickReq: false, surprise: false };
    // batte il posto più lontano dalla rete
    t.srvI = F.reduce((best, h, i) => h.d > F[best].d ? i : best, 0);
    F.forEach((hm, i) => {
      const p = { team: t, idx: i, ni: i, pos: hm.pos, name: this.nameOf(code, i), homeD: hm.d, dep: hm.dep, x: side * hm.d, z: 0, vz: 0, vx: 0,
                  state: 'idle', animT: 0, runT: 0, diveT: 0, downT: 0, diveDir: 0, hitWin: 0, blocked: false, decided: -1, missVer: -1, jumpedVer: -1, decoy: false };
      p.spr = this.add.sprite(0, 0, plKey(code, i), 0).setOrigin(0.5, 1).setFlipX(side === 1);
      t.players.push(p);
    });
    return t;
  }

  // testi e pannelli: telecronaca, tempo, arbitro, volti, punteggio grande, aiuti (HIT!/MOVE), sovraimpressione T
  buildHud() {
    this.annText = this.add.text(8, 6, '', TXT(8)).setScrollFactor(0).setDepth(2000).setShadow(1, 1, '#000', 0);
    this.timeLbl = this.add.text(212, 20, 'Time', { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '12px', color: '#ffe820', fontStyle: 'bold' }).setScrollFactor(0).setDepth(2000).setShadow(1, 1, '#000', 0);
    this.timeText = this.add.text(254, 22, "00'00\"", TXT(8)).setScrollFactor(0).setDepth(2000).setShadow(1, 1, '#000', 0);
    // pannelli: arbitro, volto grande, battuta (volto + arbitro + numero)
    this.refPanel = this.add.image(160, 70, 'ref_whistle').setScrollFactor(0).setDepth(2100).setScale(1.5).setVisible(false);
    this.facePanel = this.add.image(140, 70, 'face_ITA_0_cheer').setScrollFactor(0).setDepth(2100).setScale(2.0, 1.6).setVisible(false);
    this.serveFace = this.add.image(52, 74, 'face_ITA_0_neutral').setScrollFactor(0).setDepth(2100).setScale(1.2).setVisible(false);
    this.serveRef = this.add.image(132, 76, 'ref_whistle').setScrollFactor(0).setDepth(2100).setScale(1.5).setVisible(false);
    this.serveNum = this.add.text(98, 48, '5', TXT(16)).setScrollFactor(0).setDepth(2101).setStroke('#000', 3).setVisible(false);
    this.bigScore = this.add.text(160, 70, '', { fontFamily: FONT, fontSize: 28 * FONT_K + 'px', color: '#f0e0ff' }).setOrigin(0.5).setScrollFactor(0).setDepth(2200).setStroke('#6a3a9a', 4).setVisible(false);
    this.bigNames = this.add.text(160, 44, '', TXT(10)).setOrigin(0.5).setScrollFactor(0).setDepth(2200).setVisible(false);
    if (this.mode === 'demo') {
      this.demoText = this.add.text(150, 120, 'GAME OVER\nINSERT COINS!', { ...TXT(8, '#8090ff'), align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(2050).setStroke('#ffffff', 2);
    }
    this.hitTxt = this.add.text(0, 0, 'HIT!\nPRESS\nBUTTON!', { ...TXT(6), align: 'center' }).setOrigin(0.5, 1).setDepth(1600).setStroke('#000', 2).setVisible(false);
    this.moveTxt = this.add.text(0, 0, 'MOVE\n<-  ->', { ...TXT(6), align: 'center' }).setOrigin(0.5, 1).setDepth(1600).setStroke('#000', 2).setVisible(false);
    this.testOn = !!this.cfg.test || CFG.TEST_MODE;
    this.testBox = this.add.rectangle(0, 16, 320, 58, 0x000000, 0.75).setOrigin(0).setScrollFactor(0).setDepth(2400).setVisible(this.testOn);
    this.testTxt = this.add.text(4, 18, '', { fontFamily: 'Arial, sans-serif', fontSize: '7px', color: '#ffffff', resolution: CFG.ZOOM, lineSpacing: 1, wordWrap: { width: 312 } })
      .setScrollFactor(0).setDepth(2401).setVisible(this.testOn);
    this.updateScoreboard();
  }

  setupInput() {
    const K = Phaser.Input.Keyboard.KeyCodes, kb = this.input.keyboard;
    this.k1 = kb.addKeys({ l: K.LEFT, r: K.RIGHT, u: K.UP, d: K.DOWN, a: K.Z });
    this.k1b = kb.addKeys({ a: K.SPACE });
    this.k2 = kb.addKeys({ l: K.A, r: K.D, u: K.W, d: K.S, a: K.G });
    this.kp = kb.addKeys({ p: K.P, m: K.M, t: K.T, en: K.ENTER, one: K.ONE });
    this.kesc = kb.addKey(K.ESC);
    this.inp = { 1: {}, 2: {} }; this._born = this.time.now;
    this.paused = false;
    this.pauseText = this.add.text(160, 100, 'PAUSE', TXT(16, '#ffe030')).setOrigin(0.5).setScrollFactor(0).setDepth(2300).setVisible(false);
  }

  // legge i tasti a ogni frame; inp[1] e inp[2]: l/r/u/d = direzioni tenute, a = pulsante appena premuto
  pollInput() {
    const J = Phaser.Input.Keyboard.JustDown;
    for (const [n, k] of [[1, this.k1], [2, this.k2]]) {
      const s = this.inp[n];
      s.l = k.l.isDown; s.r = k.r.isDown; s.u = k.u.isDown; s.d = k.d.isDown;
      if ((J(k.a) || (n === 1 && J(this.k1b.a))) && this.time.now - this._born > 400) s.a = true;
    }
    if (J(this.kp.p)) { this.paused = !this.paused; this.pauseText.setVisible(this.paused); }
    if (J(this.kp.m)) SFX.muted = !SFX.muted;
    if (J(this.kp.t)) { this.testOn = !this.testOn; this.testBox.setVisible(this.testOn); this.testTxt.setVisible(this.testOn); }
    if (this.mode === 'practice' && J(this.kesc) && !this.leaving) { this.leaving = true; this.scene.start('Practice'); }
    if (this.mode === 'modern' && J(this.kesc) && !this.leaving) { this.leaving = true; this.scene.start('MainMenu'); }
    // partita dimostrativa dell'attract: START o pulsante con credito -> scelta del gioco, ESC -> menu principale
    // (prima la demo ignorava lo START e il gioco sembrava bloccato fino alla fine della demo)
    if (this.mode === 'demo' && !this.leaving && this.time.now - this._born > 400) {
      const start = J(this.kp.en) || J(this.kp.one) || this.inp[1].a;
      if (start && (GS.credits > 0 || CFG.FREE_PLAY)) { this.leaving = true; SFX.select(); this.scene.start('SelectGame'); }
      else if (J(this.kesc)) { this.leaving = true; this.scene.start('MainMenu'); }
    }
  }
  // +1 = verso la rete/avversario
  // direzione orizzontale del giocatore umano: +1 = verso la rete, -1 = verso il fondo (vale per entrambi i lati)
  dirX(t) { const s = this.inp[t.human]; if (!s) return 0; return ((s.r ? 1 : 0) - (s.l ? 1 : 0)) * -t.side; }
  up(t) { const s = this.inp[t.human]; return !!(s && s.u && !s.d); }
  down(t) { const s = this.inp[t.human]; return !!(s && s.d && !s.u); }
  pressed(t) { const s = this.inp[t.human]; return !!(s && s.a); }

  other(t) { return t === this.teams[0] ? this.teams[1] : this.teams[0]; }
  // squadra che sta dalla parte della x indicata (nel beach le squadre cambiano campo)
  teamAt(x) { return this.teams.find(t => (x < 0) === (t.side < 0)); }
  // rapporto tra il campo attuale e quello indoor da 9 m (beach: 8/9): le distanze in metri dell'IA si adattano
  courtK() { return CFG.HALF / 180; }
  announce(m) { this.annText.setText(m); }
  // scossa dello schermo su schiacciate, battute in salto e muri: leggera, e solo con ARCADE FX attivo
  shake(ms, k) { if (this.rules.fx) this.cameras.main.shake(ms, k); }

  // ------------------------------------------------ ciclo principale
  update(time, delta) {
    this.pollInput();
    if (!this.paused) {
      // passi uguali per frame (niente scatti da accumulo): il frame viene diviso in sotto-passi <= 1/120 s
      const fd = Math.min(delta, 50) / 1000, n = Math.max(1, Math.ceil(fd / CFG.STEP - 1e-6));
      for (let i = 0; i < n; i++) this.step(fd / n);
    }
    this.render(delta / 1000);
  }

  // un passo di simulazione (dt <= 1/120 s): tempo, battuta, IA, movimento, palla, punto
  step(dt) {
    const b = this.ball;
    this.simT = (this.simT || 0) + dt * 1000;
    if (b.ver !== this.lastVer) { this.lastVer = b.ver; this.verAge = 0; } else this.verAge += dt;
    this.stateT += dt;
    if (this.state === 'intro') {
      if (this.stateT > (this.mode === 'practice' ? 0.8 : 2.4)) { this.introTxt.destroy(); this.tweens.add({ targets: this.introDark, alpha: 0, duration: 400 }); this.state = 'serve'; this.stateT = 0; if (this.mode === 'practice') this.practiceRestart(); else this.startServeAnnounce(); }
    }
    if ((this.state === 'serve' && this.servePhase !== 'walk') || this.state === 'rally') {
      if (this.timeLeft !== null && this.timeLeft > 0) {
        this.timeLeft = Math.max(0, this.timeLeft - dt);
        if (this.timeLeft === 0 && this.cfg.timeUpEnds) { this.timeUp(); }
      }
    }
    if (this.state === 'serve') this.updateServe(dt);
    // mira della schiacciata (freccia blu nel campo avversario, mossa con sinistra/destra)
    for (const t of this.teams) if (t.human && this.attacking(t)) t.aimD = clamp((t.aimD || 6) + this.dirX(t) * 4 * dt, 2.5, CFG.HALF / CFG.PPM - 0.4);
    for (const t of this.teams) this.think(t);
    for (const t of this.teams) for (const p of t.players) this.movePlayer(p, dt);
    this.updateBall(dt);
    if (this.state === 'dead') this.updateDead();
    if (this.state === 'end') this.updateEnd();
    if (this.cfg.demoTime && this.simT / 1000 > this.cfg.demoTime && this.state !== 'end' && !this.leaving) {
      this.leaving = true; this.cameras.main.fadeOut(500); this.time.delayedCall(520, () => this.cfg.onDone(this));
    }
    for (const n of [1, 2]) this.inp[n].a = false;
  }
  matchClock() { this._clk = (this._clk || 0) + CFG.STEP; return this._clk; }

  // ------------------------------------------------ battuta
  // Battute (frecce riferite al battitore rivolto verso la rete; A = pulsante):
  //   neutro + A, A           = battuta dall'alto
  //   → + A                   = battuta in salto (rincorsa e stacco automatici, A in cima al salto)
  //   ↑ + A, ↑ + A            = TOWERING SERVE (altissima, ~5 s in aria)
  //   ↗ + A, ↘ + A            = PHANTOM SERVE (la palla si sdoppia in 3 scendendo)
  //   ↖ + A, ↙ + A            = THUNDER SERVE (lampo bianco e palla che piomba giù)
  // rimette tutti in posizione e dà la palla al battitore (posto t.srvI, il più lontano dalla rete)
  prepareServe() {
    const t = this.serving, b = this.ball;
    for (const tt of this.teams) { tt.touches = 0; tt.plan = null; tt.planCache = null; tt.attacker = null; tt.attackType = null; tt.blockers = []; tt.mishit = false; tt.open = false; tt.quickReq = false; tt.surprise = false; tt.recvAnn = false; tt.jumpSet = false; tt.combo = false; tt.blockedVer = -1; tt.ctrl = null; tt.ctrlMoved = false; }
    for (const tt of this.teams) for (const p of tt.players) { p.z = 0; p.vz = 0; p.vx = 0; p.diveT = 0; p.downT = 0; p.state = 'idle'; p.decoy = false; p.hitWin = 0; p.jumpedVer = -1; p.role = null; }
    const s = t.players[t.srvI];
    this.server = s;
    b.held = s; b.live = false; b.bouncing = false; b.lastTeam = t; b.lastPlayer = null; b.lastKind = null; b.ver++; b.trail = [];
    this.servePhase = 'walk'; this.serveZone = false; this.serveKind = null; this.serveWhiff = false; this.count = CFG.SERVE_COUNT; this.countT = 0;
    this.netTouched = false;
    // come nell'originale: il battitore è già fuori dal campo con la palla in mano
    for (const tt of this.teams) for (const p of tt.players) p.x = tt.side * p.homeD;
    s.x = t.side * CFG.SERVE_X;
    this.phantom = null; this.thunder = null;
  }

  startServeAnnounce() {
    this.announce(this.serveMsg || `${this.server.name} IS NOW SERVING.`);
    this.serveMsg = null;
  }

  // fasi della battuta: walk (va in posizione) -> ready (conto alla rovescia; il pulsante lancia la palla) -> toss (palla in aria,
  // il pulsante colpisce quando è nella zona giusta). L'IA sceglie il tipo di battuta da sola.
  updateServe(dt) {
    const t = this.serving, s = this.server, b = this.ball, side = t.side;
    const hum = !!t.human;
    if (this.servePhase === 'walk') {
      // l'arbitro fischia quando il battitore è al suo posto dietro la linea di fondo
      if (this.stateT > 0.5 && (Math.abs(s.x - side * CFG.SERVE_X) < 2 || this.stateT > 3)) {
        this.servePhase = 'ready'; this.countT = 0; this.count = CFG.SERVE_COUNT; this.panelT = 0;
        this.showServePanel(true); SFX.whistle();
      }
      return;
    }
    if (this.servePhase === 'ready') {
      this.panelT += dt;
      // prima l'arbitro indica la battuta, poi fischia e conta
      if (this.panelT > 0.8 && this.serveRef.texture.key !== 'ref_whistle') { this.serveRef.setTexture('ref_whistle'); this.serveNum.setVisible(true); }
      if (this.panelT > 0.8) {
        this.countT += dt;
        if (this.countT >= CFG.COUNT_STEP) { this.countT -= CFG.COUNT_STEP; this.count = Math.max(0, this.count - 1); this.serveNum.setText(String(this.count)); }
      }
      if (hum) {
        if (this.pressed(t) && this.panelT > 0.3) {
          const u = this.up(t), dx = this.dirX(t);
          this.toss(u && dx > 0 ? 'phantom' : u && dx < 0 ? 'thunder' : u ? 'tower' : dx > 0 && !this.down(t) ? 'jump' : 'float');
        }
        else if (this.count === 0) this.toss('float');
      } else if (this.panelT > 1.3 + rnd(0, 0.02)) {
        const r = Math.random();
        this.toss(r < 0.06 ? 'tower' : r < 0.11 ? 'phantom' : r < 0.16 ? 'thunder' : r < 0.16 + 0.2 + t.skill * 0.25 ? 'jump' : 'float');
        this.aiSpecial = true;
      }
      return;
    }
    if (this.servePhase !== 'toss') return;
    const press = hum && this.pressed(t);
    const k = this.serveKind;
    if (k !== 'jump') {
      // zona di colpo: dall'alto (mano sopra la testa) o dal basso (mano all'altezza dell'anca)
      const low = k === 'tower';
      const lo = low ? 8 : 42, hi = low ? 38 : 66, mid = (lo + hi) / 2;
      const zoneOk = b.h > lo && b.h < hi;
      this.serveZone = zoneOk;
      if (hum) {
        if (press && !this.serveWhiff) {
          if (zoneOk) {
            // la seconda direzione conferma la battuta speciale
            const u = this.up(t), d = this.down(t), dx = this.dirX(t);
            this.serveSpecial = (k === 'tower' && u) || (k === 'phantom' && d && dx > 0) || (k === 'thunder' && d && dx < 0);
            this.hitServe(s, clamp(1 - Math.abs(b.h - mid) / 18, 0, 1));
          } else this.serveWhiff = true;
        }
      } else if (b.vy < 0 && b.h <= mid + 1) { this.serveSpecial = true; this.hitServe(s, clamp(t.skill + rnd(-0.25, 0.2), 0, 1)); }
      return;
    }
    // battuta in salto (come nel video): rincorsa e stacco automatici, sempre dietro la linea di fondo.
    // Il joystick non muove il battitore; il pulsante colpisce in cima al salto.
    if (s.z <= 0 && s.vz <= 0 && !s.served && !s.jsJumped) {
      const takeoff = side * CFG.JS_TAKEOFF;
      const tLeft = this.jsHitT - this.jsT - CFG.TPEAK;
      const dx = takeoff - s.x;
      if (tLeft > 0) { const sp = Math.abs(dx) / tLeft; s.x += clamp(dx, -sp * dt, sp * dt); s.state = Math.abs(dx) > 1 ? 'run' : 'idle'; s.runT += dt * 1.4; }
      if (tLeft <= 0) { s.x = takeoff; this.jump(s, -side * 12); s.state = 'jump'; s.jsJumped = true; }
    }
    this.jsT += dt;
    this.serveZone = s.z > 2 && !s.served && Math.abs(b.x - this.handX(s, 5)) < 12 && b.h - s.z > 28 && b.h - s.z < 54;
    if (press) s.hitWin = 0.16;
    if (s.hitWin > 0) s.hitWin -= dt;
    if (s.z > 2 && !s.served && Math.abs(b.x - this.handX(s, 5)) < 10) {
      const dh = b.h - s.z;
      if (dh > 35 && dh < 58 && (hum ? s.hitWin > 0 : dh < CFG.REACH_UP + 3)) {
        const q = clamp(1 - Math.abs(dh - CFG.REACH_UP) / 10, 0, 1) * (hum ? 1 : 0.55 + t.skill * 0.5);
        this.hitServe(s, clamp(q, 0, 1));
      }
    }
  }

  // pannello con volto del battitore, arbitro e conto alla rovescia (solo con ARCADE FX attivo)
  showServePanel(on) {
    const s = this.server;
    if (!this.rules.fx) on = false;
    this.serveFace.setVisible(on); this.serveRef.setVisible(on); this.serveNum.setVisible(false);
    if (on) {
      this.serveFace.setTexture(makeFaceTex(this, s.team.code, s.ni, 'neutral'));
      this.serveRef.setTexture(s.team.side < 0 ? 'ref_pointL' : 'ref_pointR');
      this.serveNum.setText(String(this.count));
    }
  }

  // lancio della palla; kind = float, jump, tower, phantom, thunder
  toss(kind) {
    const t = this.serving, s = this.server, b = this.ball, side = t.side;
    this.serveKind = kind; this.servePhase = 'toss'; s.served = false; this.serveZone = false;
    this.showServePanel(false);
    b.held = null; b.live = true; b.ver++; b.lastKind = 'serve';
    b.x = s.x - side * 5; b.h = 26; b.vx = 0;
    this.serveSpecial = false;
    if (kind === 'float') b.vy = Math.sqrt(2 * CFG.G * (88 - 26));
    else if (kind === 'tower') { b.h = 20; b.vy = Math.sqrt(2 * CFG.G * (50 - 20)); }
    else if (kind === 'phantom' || kind === 'thunder') b.vy = Math.sqrt(2 * CFG.G * (88 - 26));
    else {
      // lancio alto e in avanti: la palla scende all'altezza di colpo sopra il punto di stacco
      b.h = 34; b.vy = Math.sqrt(2 * CFG.G * (104 - 34));
      const tH = PHYS.timeToH(b.h, b.vy, CFG.HIT_H);
      const hitX = side * (CFG.JS_TAKEOFF - 12 * CFG.TPEAK - 5);
      b.vx = (hitX - b.x) / tH;
      this.jsHitT = tH; this.jsT = 0; s.jsJumped = false;
      this.announce('JUMPING SERVE');
    }
    s.state = 'toss'; s.animT = kind === 'jump' ? 0.25 : 0.4;
    t.touches = 3;
    SFX.blip();
  }

  // colpo di battuta: q = qualità 0-1 (tempismo). q basso = possibile errore (rete o fuori)
  hitServe(s, q) {
    const t = s.team, b = this.ball, side = t.side, k = this.serveKind;
    s.served = true;
    const aim = t.human ? this.dirX(t) : 0;
    const K = this.courtK();
    let d = (aim > 0 ? rnd(7.6, 8.5) : aim < 0 ? rnd(3.2, 4.2) : rnd(3.5, 8.5)) * K;
    let v;
    const err = q < 0.2 && Math.random() < 0.7;
    const special = this.serveSpecial && this.rules.fx;
    if (k === 'tower') {
      this.snap(s, 7, 16);
      const apex = special ? rnd(560, 640) : rnd(115, 135);   // towering: ~5 s in aria come nel video
      v = err ? PHYS.arcTo(b.x, b.h, -side * (Math.random() < 0.5 ? 40 : CFG.HALF + 20), 0, apex) : PHYS.arcTo(b.x, b.h, -side * d * CFG.PPM, 0, apex);
      for (let i = 0; i < 20 && !err && !PHYS.clears(b.x, b.h, v, 6); i++) v = PHYS.arcTo(b.x, b.h, -side * d * CFG.PPM, 0, apex + i * 8);
      if (special) this.announce('WOW! A TOWERING SERVE.');
      s.state = 'pass'; s.animT = 0.35; SFX.bump();
    } else if (k === 'float' || k === 'phantom' || k === 'thunder') {
      this.snap(s, 3, 52);
      let apex = k === 'float' || !special ? rnd(80, 98) : k === 'phantom' ? rnd(110, 125) : rnd(125, 140);
      if (special && k === 'phantom') { this.phantom = { on: true }; this.announce('PHANTOM SERVE!'); }
      if (special && k === 'thunder') { this.thunder = { armed: true }; this.announce('THUNDER SERVE!'); }
      if (err) v = Math.random() < 0.5 ? PHYS.arcTo(b.x, b.h, -side * 60, 0, b.h + 4) : PHYS.arcTo(b.x, b.h, -side * (CFG.HALF + 35), 0, apex);
      else {
        v = PHYS.arcTo(b.x, b.h, -side * d * CFG.PPM, 0, apex);
        for (let i = 0; i < 20 && !PHYS.clears(b.x, b.h, v, 6); i++) { apex += 5; v = PHYS.arcTo(b.x, b.h, -side * d * CFG.PPM, 0, apex); }
      }
      s.state = 'spike'; s.animT = 0.3; SFX.bump();
    } else {
      this.snap(s, 5, CFG.REACH_UP);
      let sp = 320 + 110 * q;
      if (err) v = Math.random() < 0.5 ? PHYS.shotTo(b.x, b.h, 0, 30, sp) : PHYS.shotTo(b.x, b.h, -side * (CFG.HALF + 42), 0, sp);
      else {
        d = Math.max(d, 5);
        v = PHYS.shotTo(b.x, b.h, -side * d * CFG.PPM, 0, sp);
        for (let i = 0; i < 25 && !PHYS.clears(b.x, b.h, v, 4); i++) { if (d < 8.6 * K) d += 0.3; else sp *= 0.93; v = PHYS.shotTo(b.x, b.h, -side * d * CFG.PPM, 0, sp); }
      }
      s.state = 'spike'; s.animT = 0.3; SFX.spike(); this.shake(70, 0.002);
    }
    b.vx = v.vx; b.vy = v.vy; b.ver++;
    b.lastTeam = t; b.lastPlayer = s; b.lastKind = 'serve';
    if (this.mode !== 'practice') this.stat(s, 't_serve');
    this.state = 'rally'; this.stateT = 0;
  }

  // posizione della mano: fwd = px davanti verso la rete, up = altezza sopra i piedi
  handX(p, fwd) { return p.x - p.team.side * fwd; }
  snap(p, fwd, up) { const b = this.ball; b.x = this.handX(p, fwd); b.h = p.z + up; if (b.x * p.team.side < 1) b.x = p.team.side * 1; }

  // ------------------------------------------------ pianificazione
  // IA della squadra (anche per la squadra umana, per sapere chi deve giocare la palla): in base ai tocchi già fatti
  // decide il prossimo gesto (pass / set / spike / over), dove (xc) e quando (tc) colpire, e chi (plan.p).
  // Prepara anche il muro quando l'avversario costruisce l'attacco.
  think(t) {
    const b = this.ball, side = t.side;
    t.plan = null;
    if (this.state !== 'rally' || !b.live) { t.blockers = []; return; }
    const next = b.lastTeam === t ? t.touches + 1 : 1;
    if (next <= 3) {
      let kind = next === 1 ? 'pass' : next === 2 ? 'set' : (t.attacker ? 'spike' : 'over');
      if (kind === 'spike' && PHYS.apexOf(b.h, b.vy) < CFG.HIT_H - 8) kind = 'over';
      let hc = kind === 'set' ? (t.jumpSet ? CFG.SET_JUMP_H : 40) : kind === 'spike' ? CFG.HIT_H : 14;
      let tc = PHYS.timeToH(b.h, b.vy, hc);
      if (tc === null && kind === 'set') { hc = 40; t.jumpSet = false; tc = PHYS.timeToH(b.h, b.vy, hc); }
      if (tc === null && kind === 'set') { hc = 24; tc = PHYS.timeToH(b.h, b.vy, hc); }
      if (tc === null && kind !== 'pass') { kind = 'over'; hc = 14; tc = PHYS.timeToH(b.h, b.vy, hc); }
      if (kind === 'spike' && t.attackType === 'quick' && b.vy > 0 && b.h < hc) {
        // primo tempo: il colpo avviene mentre la palla sale
        const disc = b.vy * b.vy - 2 * CFG.G * (hc - b.h);
        if (disc >= 0) tc = (b.vy - Math.sqrt(disc)) / CFG.G;
      }
      if (tc !== null) {
        const xc = b.x + b.vx * tc;
        if (xc * side > 2 || kind === 'spike') {
          let p = null;
          const pc = t.planCache;
          if (pc && pc.ver === b.ver && pc.kind === kind) p = pc.p;
          if (!p) p = this.choosePlayer(t, kind, xc, tc);
          if (p) {
            t.plan = { kind, xc, tc, hc, p };
            t.planCache = { ver: b.ver, kind, p };
            if (kind === 'pass' && b.lastTeam !== t && !t.recvAnn && b.x * side > 0 && b.lastKind !== 'barely') {
              t.recvAnn = true; this.announce(`${p.name} IS NOW RECEIVING.`);
            }
          }
        }
      }
    }
    // muro: gli attaccanti di prima linea vanno a rete quando l'avversario costruisce l'attacco
    // (beach: mura uno solo, il più vicino alla rete; l'altro difende)
    const o = this.other(t);
    const oppBuilding = b.lastTeam === o && ((o.touches === 2 && o.attacker) || (b.lastKind === 'spike' && b.x * o.side > -40));
    if (oppBuilding) {
      if (!t.blockers.length) t.blockers = this.blockersOf(t);
    } else if (!(b.lastTeam === o && b.lastKind === 'spike')) t.blockers = [];
  }

  // chi va a muro: centrale e attaccante di palla alta (con 3 giocatori anche l'alzatore); beach: il più vicino alla rete
  blockersOf(t) {
    const P = t.players;
    if (this.nPl <= 2) return [P.slice().sort((a, b) => Math.abs(a.x) - Math.abs(b.x))[0]];
    const front = P.filter(p => p.pos === 'mb' || p.pos === 'oh');
    if (front.length < 2) front.push(...P.filter(p => p.pos === 'set'));
    return front.slice(0, 2);
  }
  // giocatore nel posto con quel ruolo (escluso 'not'), o null
  byPos(t, pos, not) { return t.players.find(q => q.pos === pos && q !== not) || null; }

  // il giocatore che arriva prima sul punto di contatto (con piccole preferenze di ruolo)
  choosePlayer(t, kind, xc, tc) {
    const b = this.ball, side = t.side;
    const last = b.lastTeam === t ? b.lastPlayer : null;
    const arrive = p => Math.abs(p.x - (xc + side * 6)) / CFG.RUN;
    let best = null, bt = 1e9;
    const pick = pen => { for (const p of t.players) { if (p === last || p.decoy || p.z > 2) continue; const v = arrive(p) + (pen ? pen(p) : 0); if (v < bt) { bt = v; best = p; } } };
    // in ricezione l'alzatore si tiene fuori se può, gli attaccanti di prima linea un po'; il libero si offre per primo
    // chi il giocatore umano ha già spostato in attesa della palla ha la precedenza
    // zone: le palle che superano la prima linea toccano ai difensori arretrati, quelle corte alla prima linea
    const zone = Math.abs(xc) / CFG.HALF, frontRow = p => p.pos === 'mb' || p.pos === 'set' || p.pos === 'oh';
    const zonePen = p => this.nPl <= 2 ? 0 : frontRow(p) ? (zone > CFG.FRONT_ZONE ? 0.45 : 0) : (zone < CFG.FRONT_ZONE * 0.6 ? 0.25 : 0);
    if (kind === 'pass') pick(p => zonePen(p) + (t.human && t.ctrlMoved && p === t.ctrl ? -0.15 : 0) + (p.pos === 'set' ? 0.6 : 0) + (p.pos === 'mb' || p.pos === 'oh' ? 0.1 : 0) - (p.pos === 'lib' ? 0.08 : 0));
    else if (kind === 'set') { const st = this.byPos(t, 'set'); if (st && st !== last && (arrive(st) < tc + 0.25 || t.human)) return st; pick(); }
    else if (kind === 'spike') return t.attacker !== last ? t.attacker : null;
    else pick();
    return best;
  }

  humanMoves(p) {
    const t = p.team;
    if (!t.human) return false;
    if (this.state === 'rally' && t.plan) return t.plan.p === p && (t.plan.kind === 'pass' || (t.plan.kind === 'set' && t.mishit));
    // palla nell'altro campo (o battuta avversaria): come in Power Spikes ci si piazza in anticipo con il difensore
    const waiting = (this.state === 'rally' && this.ball.lastTeam !== t) || (this.state === 'serve' && this.serving !== t);
    return waiting && p === this.ctrlOf(t);
  }
  // giocatore comandato in attesa: il difensore più arretrato che non va a muro,
  // oppure quello che il giocatore ha già spostato in questa attesa
  ctrlOf(t) {
    let c = t.ctrl;
    if (!t.ctrlMoved || !c || t.blockers.includes(c) || c.z > 0) {
      c = t.players.filter(q => !t.blockers.includes(q) && q.z <= 0).sort((a, b) => Math.abs(b.x) - Math.abs(a.x))[0] || null;
      t.ctrl = c;
    }
    return c;
  }

  // movimento di un giocatore: in aria segue la fisica del salto; a terra va verso il suo obiettivo
  // (posizione, rincorsa d'attacco sincronizzata, muro) oppure segue i tasti se è il ricevitore umano.
  movePlayer(p, dt) {
    const t = p.team, side = t.side, b = this.ball;
    if (p.animT > 0) p.animT -= dt;
    if (p.hitWin > 0 && !(this.state === 'serve' && p === this.server)) p.hitWin -= dt;
    if (p.diveT > 0) {
      p.diveT -= dt; p.x += p.diveDir * CFG.DIVE_V * dt; p.state = 'dive';
      if (Math.random() < dt * 30) this.sand(p.x + p.diveDir * 6, p.dep, 2, 55, 0);
      if (p.diveT <= 0) { p.downT = 0.55; this.sand(p.x, p.dep, 12, 70, 18); }   // solco del tuffo
      this.clampX(p); return;
    }
    if (p.downT > 0) { p.downT -= dt; p.state = 'down'; return; }
    // in aria
    if (p.z > 0 || p.vz > 0) {
      p.vz -= CFG.PG * dt; p.z += p.vz * dt; p.x += p.vx * dt;
      if (t.human && this.pressed(t)) {
        if (t.attacker === p && !p.decoy) p.hitWin = 0.16;
        if (t.plan && t.plan.kind === 'set' && t.plan.p === p && this.dirX(t) > 0) t.surprise = true;
      }
      if (p.z <= 0) { this.sand(p.x, p.dep, 9, clamp(-p.vz * 0.45, 30, 80), 8); p.z = 0; p.vz = 0; p.vx = 0; if (p.animT <= 0) p.state = 'idle'; p.decoy = false; }
      else if (p.animT <= 0) p.state = t.blockers.includes(p) && b.lastTeam !== t ? 'block' : (p.vz > 40 ? 'jump' : p.state === 'spike' || p.state === 'dump' ? p.state : 'jump');
      this.clampX(p); return;
    }
    if (this.state === 'serve' && p === this.server && this.servePhase !== 'walk') return;

    const plan = t.plan;
    const sandK = this.beach ? CFG.SAND_K : 1;   // sulla sabbia si corre più piano
    const pSpd = this.trOf(p).spd;   // c'è chi è più rapido e chi meno
    let target = side * p.homeD, speed = CFG.RUN * (t.human ? 1 : 0.85 + t.skill * 0.3) * (t.spdK || 1) * sandK * pSpd, human = false;
    const own = this.state === 'rally' && b.lastTeam === t;
    // il battitore va subito dietro la linea di fondo (anche durante la presentazione), da dove parte la rincorsa della battuta in salto
    if ((this.state === 'serve' || this.state === 'intro') && p === this.server) target = side * CFG.SERVE_X;
    else if (this.state === 'dead' || this.state === 'end') target = p.x;
    else if (plan && plan.p === p && plan.kind === 'spike') {
      // rincorsa sincronizzata: arriva al punto di stacco esattamente quando deve saltare
      const tHit = PHYS.timeToH(b.h, b.vy, CFG.HIT_H);
      const jvx = this.jumpVX(t.attackType);
      target = plan.xc + side * (5 + jvx * CFG.TPEAK);
      if (tHit !== null) {
        const need = tHit - CFG.TPEAK;
        if (need > 0.45) { target = target + side * 22; }            // aspetta in posizione di rincorsa
        else speed = clamp(Math.abs(target - p.x) / Math.max(0.06, need), CFG.RUN * 0.4, CFG.RUN * 1.9);
      }
    } else if (plan && plan.p === p) {
      target = plan.xc + side * (plan.kind === 'set' ? 2 : 6);
      human = this.humanMoves(p);
    } else if (!plan && this.humanMoves(p)) {
      human = true;
    } else if (t.blockers.includes(p) && !own) {
      target = side * (8 + t.blockers.indexOf(p) * 7);
    } else if (own && t.quickPlan && p.pos === 'mb' && t.touches === 1 && plan && plan.kind === 'set') {
      // primo tempo: il centrale rincorre e salta insieme all'alzatore
      const tcSet = plan.tc, takeoff = side * 20;
      const tJump = tcSet - CFG.TPEAK + 0.12;
      if (tJump > 0.5) target = side * 40;
      else { target = takeoff; speed = clamp(Math.abs(takeoff - p.x) / Math.max(0.06, tJump), CFG.RUN * 0.5, CFG.RUN * 1.9); }
      if (tJump <= 0.01 && p.jumpedVer !== b.ver) { this.jump(p, -side * 14); p.jumpedVer = b.ver; p.role = 'quick'; }
    }

    let mv = 0;
    if (human) {
      const s = this.inp[t.human];
      mv = ((s.r ? 1 : 0) - (s.l ? 1 : 0)) * CFG.RUN * 1.05 * (t.spdK || 1) * sandK * pSpd * dt;   // la SPEED della squadra (e del giocatore) conta anche per chi gioca
      if (mv && !plan) t.ctrlMoved = true;   // spostato in attesa: resta lui il ricevitore preferito
    } else {
      const reacting = plan && plan.p === p && plan.kind === 'pass' && this.verAge < (t.human ? 0.06 : 0.24 - t.skill * 0.12);
      const dx = (reacting ? p.x : target) - p.x;
      if (Math.abs(dx) > 0.6) mv = clamp(dx, -speed * dt, speed * dt);
    }
    p.x += mv; this.clampX(p);
    if (p.animT <= 0) {
      if (Math.abs(mv) > 0.05) {
        p.state = 'run'; p.runT += dt * Math.max(1, Math.abs(mv) / dt / CFG.RUN);
        if (this.beach && Math.random() < dt * 6) this.sand(p.x - Math.sign(mv) * 3, p.dep, 2, 28, 3);   // passi nella sabbia
      }
      else if ((this.state === 'dead' || this.state === 'end') && this.stateT > 0.4) p.state = this.winner === t ? 'cheer' : 'sad';
      else p.state = 'idle';
    }

    // pulsante a terra: quick attack (prima dell'alzata) o finta dell'asso
    if (t.human && this.pressed(t) && this.state === 'rally' && b.lastTeam === t) {
      if (t.touches === 1 && !t.attacker) { t.quickReq = true; if (!t.mishit) t.quickPlan = true; }
      // finta: solo sull'attacco di palla alta dell'asso (in seconda linea e primo tempo il pulsante non fa fintare)
      else if (t.touches === 2 && t.attacker === p && t.attackType === 'high' && plan && plan.kind === 'spike' && plan.tc > 0.35 && !p.decoy) this.fakeAttack(t, p);
    }
    // alzata in salto
    if (plan && plan.p === p && plan.kind === 'set' && t.jumpSet && p.jumpedVer !== b.ver) {
      const tHit = PHYS.timeToH(b.h, b.vy, CFG.SET_JUMP_H);
      if (tHit !== null && tHit <= CFG.TPEAK * 0.8 && Math.abs(p.x - target) < 8) { this.jump(p, 0, 0.8); p.jumpedVer = b.ver; }
    }
    // stacco automatico dello schiacciatore
    if (plan && plan.p === p && plan.kind === 'spike' && p.jumpedVer !== b.ver) {
      const tHit = PHYS.timeToH(b.h, b.vy, CFG.HIT_H);
      const jit = t.human ? 0 : (p.jj || 0);
      if (tHit !== null && tHit <= CFG.TPEAK + 0.01 + jit && Math.abs(p.x - target) < 16) {
        this.jump(p, -side * this.jumpVX(t.attackType)); p.jumpedVer = b.ver; p.role = 'hit';
      }
    }
    // muro
    if (t.blockers.includes(p) && !own && this.state === 'rally') this.blockerJump(t, p);
  }

  // la squadra sta attaccando (terzo tocco in arrivo)? hitWindow: la palla è colpibile dallo schiacciatore adesso?
  attacking(t) { const b = this.ball; return this.state === 'rally' && b.live && b.lastTeam === t && t.touches === 2 && b.lastKind === 'set' && t.attacker; }
  hitWindow(t) {
    const b = this.ball, a = t.attacker;
    if (!this.attacking(t) || !a || a.z <= 2 || a.decoy) return false;
    const dh = b.h - a.z;
    return Math.abs(b.x - this.handX(a, 5)) < 14 && dh > 30 && dh < 62;
  }

  jumpVX(type) { return type === 'back' ? 70 : type === 'quick' ? 22 : 42; }

  // salto a muro: l'umano col pulsante, l'IA poco dopo lo stacco dello schiacciatore (probabilità legata alla skill)
  blockerJump(t, p) {
    const b = this.ball, o = this.other(t);
    if (p.z > 0 || p.lastBlockJump > this.simT - 700) return;
    let want = false;
    if (t.human) want = this.pressed(t);
    else {
      // l'IA salta a muro poco dopo lo stacco dello schiacciatore
      const q = o.attacker;
      if (q && q.z > 4 && q.vz > 0 && p.readKey !== b.ver) {
        p.readKey = b.ver;
        if (Math.random() < 0.2 + t.skill * 0.4) p.blockAt = this.simT + rnd(90, 170);
      }
      want = p.blockAt && this.simT >= p.blockAt;
    }
    if (want) { p.blockAt = 0; p.lastBlockJump = this.simT; this.jump(p, 0, 0.9); p.state = 'block'; }
  }

  fakeAttack(t, p) {
    // l'asso finta lo stacco, il centrale (che rientra dalla finta di primo tempo) colpisce
    if (this.beach) return;
    this.jump(p, -t.side * 30); p.decoy = true; p.jumpedVer = this.ball.ver;
    const mb = this.byPos(t, 'mb', p), bk = this.byPos(t, 'def', p) || this.byPos(t, 'bk', p);
    const alt = mb && mb.z <= 0 ? mb : bk;
    if (!alt) { p.decoy = false; return; }   // senza un secondo attaccante (beach) niente finta
    t.attacker = alt; t.attackType = alt === bk ? 'back' : 'high'; t.planCache = null; alt.jumpedVer = -1;
  }

  jump(p, vx, k = 1) { if (p.z <= 0) this.sand(p.x, p.dep, 7, 60, 6); p.vz = CFG.JUMP_V * k; p.z = 0.1; p.vx = vx; p.state = 'jump'; }

  // ------------------------------------------------ sabbia (beach): spruzzi che si alzano e impronte che restano
  // x = posizione in campo, dep = profondità, n = granelli, power = forza dello spruzzo, mark = larghezza dell'impronta (0 = nessuna)
  sand(x, dep, n, power, mark) {
    if (!this.beach) return;
    const S = this.sandFx || (this.sandFx = { parts: [], marks: [] }), y = CFG.FLOOR_Y + dep;
    for (let i = 0; i < n; i++) S.parts.push({ x: SX(x) + rnd(-3, 3), y: y + rnd(-1, 1), z: rnd(0, 2), vx: rnd(-1, 1) * power * 0.7, vz: rnd(0.35, 1) * power,
      life: rnd(0.35, 0.75), c: Math.random() < 0.5 ? 0xd8b878 : 0xf4e0b0 });
    if (mark) S.marks.push({ x: SX(x), y, w: mark, t: CFG.SAND_MARK_T });
    if (S.parts.length > 300) S.parts.splice(0, S.parts.length - 300);
    if (S.marks.length > 40) S.marks.shift();
  }
  // granelli in volo (nel livello degli effetti) e impronte a terra (sotto le ombre), aggiornati a ogni disegno
  drawSand(dt, g, f) {
    const S = this.sandFx; if (!S) return;
    for (const m of S.marks) {
      m.t -= dt; const a = clamp(m.t / CFG.SAND_MARK_T, 0, 1);
      g.fillStyle(0x5a3a10, 0.22 * a).fillEllipse(m.x, m.y + 0.5, m.w, Math.max(2, m.w * 0.28));          // conca
      g.fillStyle(0xfff0c8, 0.25 * a).fillEllipse(m.x, m.y - 0.8, m.w + 2, 1.2);                          // bordo di sabbia smossa
    }
    S.marks = S.marks.filter(m => m.t > 0);
    for (const p of S.parts) {
      p.vz -= 300 * dt; p.z += p.vz * dt; p.x += p.vx * dt; p.life -= dt;
      if (p.z < 0) { p.z = 0; p.vz = 0; p.vx *= 0.3; }
      f.fillStyle(p.c, clamp(p.life * 2, 0, 1)).fillRect(p.x - 0.5, p.y - p.z - 0.5, 1.2, 1.2);
    }
    S.parts = S.parts.filter(p => p.life > 0);
  }

  clampX(p) {
    if (p.team.side < 0) p.x = clamp(p.x, -CFG.WORLD_HALF + 10, -5); else p.x = clamp(p.x, 5, CFG.WORLD_HALF - 10);
  }

  startDive(p, dir, dist) {
    p.diveT = clamp((dist - 6) / CFG.DIVE_V, 0.08, 0.28); p.diveDir = dir; p.state = 'dive';
    SFX.tone(200, 0.08, 'triangle', 0.08, -80);
    if (p.team.human) this.popup(p, 'Go!');
  }

  popup(p, text) {
    const t = this.add.text(SX(p.x), CFG.FLOOR_Y - 30, text, TXT(7, '#ffffff')).setOrigin(0.5).setDepth(1500).setStroke('#e02020', 2);
    this.tweens.add({ targets: t, y: t.y - 12, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  // ------------------------------------------------ palla
  // fisica della palla: gravità, passaggio sopra la rete (o rete toccata), battuta THUNDER, contatti, caduta a terra
  updateBall(dt) {
    const b = this.ball;
    if (b.held) { const p = b.held; b.x = p.x - p.team.side * 5; b.h = p.z + 22; b.vx = b.vy = 0; return; }
    if (b.bouncing) {
      b.vy -= CFG.G * dt; b.x += b.vx * dt; b.h += b.vy * dt;
      if (b.h <= 0) { b.h = 0; b.vy = -b.vy * 0.45; b.vx *= 0.6; if (b.vy < 20) b.vy = 0; }
      b.x = clamp(b.x, -CFG.WORLD_HALF + 4, CFG.WORLD_HALF - 4);
      return;
    }
    if (!b.live) return;
    const px = b.x, ph = b.h;
    b.vy -= CFG.G * dt; b.x += b.vx * dt; b.h += b.vy * dt;
    b.spin += b.vx * dt * 0.1;
    if ((px < 0) !== (b.x < 0) && px !== 0) {
      const f = Math.abs(px) / (Math.abs(px) + Math.abs(b.x));
      const hc = ph + (b.h - ph) * f;
      if (hc < CFG.NET_H) {
        b.x = Math.sign(px) * 4; b.vx = -b.vx * 0.18; b.vy = Math.min(b.vy, 0) * 0.3 - 10; b.ver++;
        this.netTouched = true; SFX.tone(110, 0.15, 'triangle', 0.2, -30);
        this.announce('AW,IT HITS THE NET.');
      } else this.onCross(this.teamAt(b.x));
    }
    // THUNDER SERVE: lampo bianco e la palla piomba giù nel campo di chi riceve
    if (this.thunder && this.thunder.armed && b.lastKind === 'serve' && b.vy < 0 && b.x * this.other(this.serving).side > 20 && b.h < 115) {
      this.thunder.armed = false;
      this.cameras.main.flash(260, 255, 255, 255);
      b.vy = -360; b.vx *= 0.35; b.ver++;
      SFX.noise(0.5, 0.5, 300, 0.5); SFX.tone(60, 0.4, 'sawtooth', 0.25, -20);
    }
    if (this.state === 'rally') this.checkContacts();
    if (b.live && b.h <= 0) this.ballLanded();
  }

  onCross(t) {
    const b = this.ball;
    t.recvAnn = false;
    if (b.lastKind === 'barely') this.announce(`NOW IT IS THE ${t.code}'S BIG CHANCE!`);
  }

  // penalità di ricezione per palle veloci (0 - 0,45)
  speedPen() { const b = this.ball; return clamp((Math.hypot(b.vx, b.vy) - 220) / 500, 0, 0.45); }

  // controlla se un giocatore tocca la palla: muro (un solo tentativo per colpo), bagher/difesa, alzata, schiacciata.
  // Qui stanno le probabilità di errore dell'IA (p.miss): sono le regolazioni principali del bilanciamento.
  checkContacts() {
    const b = this.ball;
    for (const t of this.teams) {
      const side = t.side;
      // muro (una sola volta per colpo)
      if (b.lastTeam !== t && b.vx * side > 0 && t.blockedVer !== b.ver) {
        for (const bl of t.blockers) {
          const dh = b.h - bl.z;
          const blk = this.trOf(bl).blk;   // i più alti arrivano più in alto e più larghi
          if (bl.z > 4 && Math.abs(b.x - this.handX(bl, 3)) < 8 + blk * 0.4 && dh > 36 && dh < 58 + blk) { t.blockedVer = b.ver; this.doBlock(t, bl); return; }
        }
      }
      const pl = t.plan; if (!pl) continue;
      const p = pl.p;
      if (b.lastTeam === t && b.lastPlayer === p) continue;
      const ai = !t.human;
      const reach = CFG.REACH * (ai ? 0.85 + t.skill * 0.3 : 1);
      if (pl.kind === 'pass' || pl.kind === 'over') {
        if (p.missVer !== b.ver) {
          p.missVer = b.ver;
          const sp = b.lastKind === 'serve' && ((this.phantom && this.phantom.on) || (this.thunder && !this.thunder.armed)) ? 0.35 : 0;
          // in ricezione la velocità della battuta pesa meno che in difesa sulla schiacciata (troppi ace)
          const kSpd = b.lastKind === 'serve' ? 0.3 : 1.1;
          p.miss = ai && Math.random() < clamp(0.02 + sp + this.speedPen() * kSpd - (t.skill - 0.5) * 0.35 - (t.defK || 0) - this.plK(p) - this.trOf(p).rcv, 0.02, 0.8);
        }
        if (p.diveT > 0 || p.state === 'dive') {
          const cx = p.x + p.diveDir * 9;
          if (Math.abs(b.x - cx) < 11 && b.h < 16 && !p.miss) { b.x = cx; b.h = 6; this.doPass(t, p, rnd(0.3, 0.75), true); return; }
          continue;
        }
        if (p.z > 0 || p.downT > 0) continue;
        const cx = this.handX(p, 6), dx = b.x - cx;
        // bagher laterale (come nell'originale): palla un po' fuori portata, il ricevitore allunga le braccia di lato
        const lat = Math.abs(dx) > reach && Math.abs(dx) <= reach + CFG.LAT_REACH;
        if (b.h >= CFG.PASS_LO && b.h <= CFG.PASS_HI && b.vy < 0 && (Math.abs(dx) <= reach || lat) && !p.miss) {
          if (lat) { b.h = clamp(b.h, 8, 16); } else this.snap(p, 6, clamp(b.h, 11, 20));
          if (pl.kind === 'over') { this.doOver(t, p); return; }
          let q;
          const rcv = this.trOf(p).rcv;   // c'è chi riceve meglio
          if (ai) q = clamp(t.skill * 0.95 + rnd(-0.3, 0.25) - this.speedPen() - (lat ? 0.15 : 0) + rcv, 0, 1);
          else { q = clamp(1 - Math.min(Math.abs(dx), reach) / reach * 0.55 - (lat ? 0.2 : 0) - this.speedPen() * 0.7 + this.plK(p) + rcv + rnd(-0.12, 0.1), 0, 1); t.open = this.up(t); }
          this.doPass(t, p, q, false);
          if (lat) { p.state = 'passside'; p.latBack = dx * -t.side < 0; }   // all'indietro: lo sprite si gira
          return;
        }
        if (b.vy < 0 && b.h < 40 && p.decided !== b.ver) {
          const tl = PHYS.timeToH(b.h, b.vy, 8);
          if (tl !== null && tl < 0.3) {
            // chi gioca muove da sé il ricevitore: il tuffo parte se la palla cade oltre il bagher laterale
            // (se sta già correndo verso la palla conta anche la corsa: niente tuffi inutili sulle schiacciate forti)
            const dxp = b.x + b.vx * tl - cx, run = CFG.RUN * 0.9 * tl;
            const toward = ai || Math.sign(this.dirX(t) * -t.side) === Math.sign(dxp);
            const runCover = toward ? run : 0, far = ai ? reach : reach + CFG.LAT_REACH + 4;
            if (Math.abs(dxp) - runCover > far && Math.abs(dxp) < CFG.DIVE_REACH + run) {
              p.decided = b.ver;
              if (!ai || Math.random() < 0.3 + t.skill * 0.6) this.startDive(p, Math.sign(dxp), Math.abs(dxp));
            }
          }
        }
      } else if (pl.kind === 'set') {
        if (p.diveT > 0 || p.downT > 0) continue;
        const dh = b.h - p.z;
        if (Math.abs(b.x - this.handX(p, 2)) < reach && dh > 34 && dh < 58 && b.vy < 0) {
          this.snap(p, 2, 48);
          this.doSet(t, p, clamp((ai ? t.skill : 0.9) + rnd(-0.15, 0.12) - (p.z > 2 ? 0 : 0.05), 0, 1)); return;
        }
        if (b.vy < 0 && b.h >= 16 && b.h <= 30 && Math.abs(b.x - this.handX(p, 4)) <= reach && p.z <= 0) {
          this.snap(p, 6, 16); this.doSet(t, p, clamp((ai ? t.skill : 0.8) - 0.3 + rnd(-0.1, 0.1), 0, 1)); return;   // alzata di bagher
        }
      } else if (pl.kind === 'spike') {
        if (p.z > 2 && !p.decoy) {
          const dh = b.h - p.z;
          if (Math.abs(b.x - this.handX(p, 5)) < 10 && dh > 38 && dh < 58 && (ai ? dh < CFG.REACH_UP + 4 : p.hitWin > 0)) {
            const qT = clamp(1 - Math.abs(dh - CFG.REACH_UP) / 9, 0, 1), qP = clamp(1 - Math.abs(p.vz) / CFG.JUMP_V, 0, 1);
            let q = qT * 0.6 + qP * 0.4;
            if (ai) q = clamp(q * 0.5 + t.skill * 0.55 + rnd(-0.15, 0.1), 0, 1);
            this.snap(p, 5, CFG.REACH_UP);
            this.doSpike(t, p, q); return;
          }
        } else if (p.diveT <= 0 && p.downT <= 0 && p.z <= 0 && p.jumpedVer === b.ver) {
          // ha saltato a vuoto: rimette la palla di là in bagher se riesce
          if (b.vy < 0 && b.h < 26 && b.h > 6 && Math.abs(b.x - this.handX(p, 6)) < CFG.REACH + 2) { this.snap(p, 6, 14); this.doOver(t, p); return; }
        }
      }
    }
  }

  // registra un tocco (conta i tocchi della squadra e aggiorna l'ultimo tocco della palla)
  touch(t, p, kind) {
    const b = this.ball;
    if (b.lastTeam === t) t.touches++; else t.touches = 1;
    t.ctrlMoved = false;   // nuova azione: in attesa si torna a comandare il difensore arretrato
    b.lastTeam = t; b.lastPlayer = p; b.lastKind = kind; b.ver++;
    if (p && this.mode !== 'practice') this.stat(p, 't_' + kind);   // tocchi per giocatore (crescita del "mio giocatore")
  }

  // bagher/difesa: q = qualità. q < 0,22 palla rimandata di là a stento, q < 0,45 ricezione sbagliata, altrimenti palla all'alzatore
  doPass(t, p, q, dive) {
    const b = this.ball, side = t.side;
    this.touch(t, p, 'pass');
    p.state = dive ? 'dive' : 'pass'; p.animT = dive ? 0 : 0.3;
    SFX.bump();
    t.mishit = false; t.quickReq = false; t.quickPlan = false; t.surprise = false; t.attacker = null;
    for (const q of t.players) q.role = null;
    let v;
    if (q < 0.22) {
      v = PHYS.arcTo(b.x, b.h, -side * rnd(60, 150), 0, rnd(85, 110));
      for (let i = 0; i < 12 && !PHYS.clears(b.x, b.h, v, 6); i++) v = PHYS.arcTo(b.x, b.h, -side * rnd(60, 150), 0, 110 + i * 6);
      b.lastKind = 'barely';
      this.announce(`${p.name} CAN BARELY RETURN IT.`);
    } else if (q < 0.45) {
      v = PHYS.arcTo(b.x, b.h, side * rnd(45, 100), 40, rnd(90, 120));
      t.mishit = true; t.jumpSet = false;
      this.announce(`OH! ${this.he} MISHITS THE BALL!`);
    } else {
      let tx = side * CFG.SETTER_D + side * (1 - q) * rnd(-12, 34);
      tx = side < 0 ? Math.min(tx, -14) : Math.max(tx, 14);
      t.jumpSet = !this.beach && q > 0.55 && (t.human ? true : Math.random() < 0.75);
      v = PHYS.arcTo(b.x, b.h, tx, t.jumpSet ? CFG.SET_JUMP_H : 40, rnd(108, 128));
      t.quickPlan = !t.human && !!this.byPos(t, 'mb') && Math.random() < 0.06 + t.skill * 0.06;
      if (dive) this.announce(`A FINE DIVING PLAY BY ${p.name}!`);
    }
    b.vx = v.vx; b.vy = v.vy;
  }

  // alzata: sceglie l'attaccante e il tipo di attacco (high, quick = primo tempo, back = seconda linea)
  doSet(t, p, q) {
    const b = this.ball, side = t.side;
    // palleggio di seconda (vietato nel beach: il palleggio deve andare dritto, niente "dump")
    if (p.z > 2 && !this.beach && (t.human ? t.surprise : (Math.random() < 0.05 + t.skill * 0.05))) {
      this.touch(t, p, 'spike');
      p.state = 'dump'; p.animT = 0.3;   // di fronte, colpo con il braccio più lontano dalla rete
      let v = PHYS.arcTo(b.x, b.h, -side * rnd(25, 55), 0, b.h + 8);
      for (let i = 0; i < 10 && !PHYS.clears(b.x, b.h, v, 3); i++) v = PHYS.arcTo(b.x, b.h, -side * rnd(25, 55), 0, b.h + 12 + i * 4);
      b.vx = v.vx; b.vy = v.vy; b.lastKind = 'dink';
      this.announce(`SURPRISE ATTACK! ${p.name}`); SFX.set(); t.surprise = false; t.combo = false; return;
    }
    this.touch(t, p, 'set');
    p.state = 'set'; p.animT = 0.3; SFX.set();
    if (t.mishit) this.announce(`NOW ${p.name} SETS UP THE BALL.`);
    // attaccanti disponibili secondo la formazione: centrale (primo tempo), palla alta, seconda linea
    const mb = this.byPos(t, 'mb', p), back = this.byPos(t, 'def', p) || this.byPos(t, 'bk', p);
    const high = this.byPos(t, 'oh', p) || mb || t.players.find(q => q !== p && q.pos !== 'lib') || back;
    const quickReady = mb && mb.z > 2 && mb.role === 'quick';
    let type;
    if (t.human) {
      if (quickReady || (this.down(t) && mb && mb.z <= 0)) type = 'quick';
      else if (this.dirX(t) < 0 && back) type = 'back';
      else type = 'high';
    } else {
      const r = Math.random();
      type = quickReady ? 'quick' : r < 0.05 && mb ? 'quick' : r < 0.8 || !back ? 'high' : 'back';
    }
    const att = type === 'quick' ? mb : type === 'back' ? back : high;
    let v;
    if (type === 'quick' && att.z > 2) {
      // centrale già in aria accanto all'alzatore: palla corta direttamente alla mano
      const T = 0.22;
      const hz = att.z + att.vz * T - 0.5 * CFG.PG * T * T;
      const hx = this.handX(att, 5) + att.vx * T;
      v = { vx: (hx - b.x) / T, vy: (hz + CFG.REACH_UP - b.h + 0.5 * CFG.G * T * T) / T };
    } else if (type === 'quick') {
      // primo tempo "da fermo" (come la CPU nel video): alzata bassa, il centrale rincorre e stacca
      v = PHYS.arcTo(b.x, b.h, side * 14, CFG.HIT_H, CFG.HIT_H + 14);
    } else {
      const xa = side * (type === 'high' ? (this.beach ? 28 : 24) : 66) + side * (1 - q) * rnd(-10, 14);
      const apex = (type === 'high' ? (t.open ? 140 : 130) : 124) + (1 - q) * rnd(-12, 12);
      v = PHYS.arcTo(b.x, b.h, xa, CFG.HIT_H, apex);
      if (type === 'high' && Math.random() < 0.5) this.announce(`${att.name} GOES FOR THE KILL.`);
    }
    b.vx = v.vx; b.vy = v.vy;
    t.attacker = att; t.attackType = type; att.jj = rnd(-0.03, 0.03); att.decoy = false;
    if (att.z <= 0) att.jumpedVer = -1;
    t.quickReq = false; t.quickPlan = false; t.aimD = 6;
  }

  // schiacciata: stile (normale, power, pallonetto), punto d'arrivo, velocità, possibili errori
  doSpike(t, p, q) {
    const b = this.ball, side = t.side, o = this.other(t);
    this.touch(t, p, 'spike');
    p.state = 'spike'; p.animT = 0.3; p.hitWin = 0;
    const type = t.attackType;
    const blockUp = o.blockers.some(q2 => q2.z > 8);
    let style;
    if (t.human) style = this.up(t) ? 'dink' : this.down(t) ? 'power' : 'normal';
    else { const r = Math.random(), sh = this.beach ? (blockUp ? 0.3 : 0.12) : (blockUp ? 0.1 : 0.03); style = r < sh ? 'dink' : r < 0.35 ? 'power' : 'normal'; }
    if (style === 'dink' && this.beach) {
      // beach: il pallonetto a mano aperta è fallo; si gioca il "shot" (palla piazzata a nocche o a mano chiusa, dietro il muro)
      const far = Math.random() < 0.5;
      let v = PHYS.arcTo(b.x, b.h, -side * (far ? rnd(90, CFG.HALF - 12) : rnd(35, 70)), 0, b.h + (far ? 22 : 12));
      for (let i = 0; i < 10 && !PHYS.clears(b.x, b.h, v, 12); i++) v = PHYS.arcTo(b.x, b.h, -side * rnd(40, 110), 0, b.h + 18 + i * 5);
      b.vx = v.vx; b.vy = v.vy; b.lastKind = 'dink';
      this.announce(far ? `A SKY-HIGH SHOT BY ${p.name}!` : `A POKIE BY ${p.name}!`); SFX.set(); return;
    }
    if (style === 'dink') {
      // pallonetto: palla morbida appena oltre il muro
      let v = PHYS.arcTo(b.x, b.h, -side * rnd(30, 60), 0, b.h + 10);
      for (let i = 0; i < 10 && !PHYS.clears(b.x, b.h, v, 12); i++) v = PHYS.arcTo(b.x, b.h, -side * rnd(30, 60), 0, b.h + 16 + i * 5);
      b.vx = v.vx; b.vy = v.vy; b.lastKind = 'dink';
      this.announce(`IT'S A DINK BY ${p.name}!`); SFX.set(); return;
    }
    if (type === 'quick') this.announce(`A QUICK MOVE BY ${p.name}!`);
    else if (type === 'back') this.announce(`A BACK ATTACK BY ${p.name}!`);
    else if (style === 'power') this.announce(`POWER SPIKE! ${p.name}!`);
    else this.announce(`SPIKE BY ${p.name}!`);
    const K = this.courtK();
    let d = t.human ? (t.aimD || 6) : this.modern ? this.aiSpikeTarget(t) : rnd(3, 8.4) * K;
    if (type === 'back') d = Math.max(d, 5);
    let sp = CFG.SPIKE_SPEED * (t.atkK || 1) * (1 + this.plK(p) + this.trOf(p).atk) * (0.8 + 0.32 * q) * (type === 'quick' ? 1.05 : type === 'back' ? 0.95 : 1) * (style === 'power' ? 1.2 : 1);
    let v;
    const aiErr = !t.human && Math.random() < 0.05 + (1 - t.skill) * 0.16;
    const errQ = style === 'power' ? 0.3 : 0.18;
    if (aiErr || (q < errQ && Math.random() < 0.6)) {
      v = Math.random() < 0.25 ? PHYS.shotTo(b.x, b.h, 0, CFG.NET_H - 12, sp) : PHYS.shotTo(b.x, b.h, -side * rnd(9.6, 10.8) * CFG.PPM, 0, sp);
    } else {
      v = PHYS.shotTo(b.x, b.h, -side * d * CFG.PPM, 0, sp);
      for (let i = 0; i < 30 && !PHYS.clears(b.x, b.h, v, 2); i++) { if (d < 8.7 * K) d += 0.3; else sp *= 0.92; v = PHYS.shotTo(b.x, b.h, -side * d * CFG.PPM, 0, sp); }
    }
    b.vx = v.vx; b.vy = v.vy;
    SFX.spike(); this.shake(90, style === 'power' ? 0.004 : 0.0025);
  }

  // caratteristiche del giocatore che ha ora quel posto (altezza, muro, ricezione, velocità, potenza: playerTraits in gfx.js)
  trOf(p) { return playerTraits(p.team.code, TEAMS[p.team.code].names[p.ni] || String(p.ni), this.women); }

  // livello del singolo giocatore (squadre JSON): +-3% per punto rispetto alla media dei titolari
  plK(p) {
    const lv = p.team.pal.lv; if (!lv) return 0;
    const n = p.team.players.length, on = lv.slice(0, n);   // media dei giocatori in campo
    return ((lv[p.ni] || 0) - on.reduce((a, v) => a + v, 0) / n) * 0.03;
  }

  // modalità moderna: l'IA cerca il buco nella difesa; più la squadra è forte, più alternative valuta
  aiSpikeTarget(t) {
    const o = this.other(t), n = 1 + Math.round(t.skill * 4);
    const K = this.courtK();
    let best = rnd(3, 8.4) * K, bestGap = -1;
    for (let i = 0; i < n; i++) {
      const d = rnd(3, 8.4) * K, x = -t.side * d * CFG.PPM;
      const gap = Math.min(...o.players.map(q => Math.abs(q.x - x)));
      if (gap > bestGap) { bestGap = gap; best = d; }
    }
    return best;
  }

  // palla rimandata di là senza attacco (free ball)
  doOver(t, p) {
    const b = this.ball, side = t.side;
    this.touch(t, p, 'over');
    p.state = 'pass'; p.animT = 0.3; SFX.bump(); t.combo = false;
    const K = this.courtK();
    let v = PHYS.arcTo(b.x, b.h, -side * rnd(60, 140) * K, 0, 92);
    for (let i = 0; i < 12 && !PHYS.clears(b.x, b.h, v, 6); i++) v = PHYS.arcTo(b.x, b.h, -side * rnd(60, 140) * K, 0, 100 + i * 6);
    b.vx = v.vx; b.vy = v.vy;
  }

  // muro: murata vincente (chance), tocco a muro che schizza via (+0,15), oppure la palla passa
  doBlock(t, p) {
    const b = this.ball, o = this.other(t);
    const two = t.blockers.filter(q => q.z > 4 && Math.abs(q.x - p.x) < 14).length >= 2;
    let chance = (t.human ? 0.3 : 0.07 + t.skill * 0.16) + (two ? 0.08 : 0);
    if (o.attackType === 'quick') chance -= 0.1;
    if (o.attackType === 'back') chance -= 0.06;
    if (b.lastKind === 'dink') chance += 0.2;
    const r = Math.random();
    p.state = 'block'; p.animT = 0.25;
    this.snap(p, 3, 50);
    if (r < chance + 0.15 && this.mode !== 'practice') this.stat(p, 't_block');
    if (r < chance) {
      b.vx = -b.vx * rnd(0.25, 0.45); b.vy = -rnd(40, 90); b.x = -t.side * 3;
      b.lastTeam = t; b.lastPlayer = p; b.lastKind = 'block'; b.ver++; t.touches = 0;
      this.announce('THE SPIKE WAS BLOCKED.');
      SFX.block(); this.shake(100, 0.003);
    } else if (r < chance + 0.15) {
      // tocco a muro: la palla schizza via, difficile da recuperare (non una palla regalata)
      b.vx = b.vx * rnd(0.3, 0.6); b.vy = rnd(70, 140);
      b.lastTeam = t; b.lastPlayer = null; b.lastKind = 'blocktouch'; b.ver++;
      t.touches = this.beach ? 1 : 0;   // beach: il tocco a muro conta come primo tocco (restano 2 tocchi)
      SFX.set();
    } else { b.x = this.handX(p, 6); b.ver++; t.blockedVer = b.ver; }   // passata: niente altri tentativi di muro sullo stesso colpo
  }
  // ------------------------------------------------ fine azione
  // palla a terra: chi fa il punto (dentro/fuori, ultimo tocco), messaggio della telecronaca, statistiche
  ballLanded() {
    const b = this.ball;
    this.sand(b.x, 0, Math.round(clamp(Math.abs(b.vy) / 12, 8, 26)), clamp(Math.abs(b.vy) * 0.45, 50, 130), 7);   // la palla affonda nella sabbia
    b.live = false; b.h = 0; b.bouncing = true; b.vy = Math.abs(b.vy) * 0.4; b.vx *= 0.6;
    SFX.floor();
    const land = this.teamAt(b.x);
    const inside = Math.abs(b.x) <= CFG.HALF;
    let winner, ref, face = null, faceMsg = null;
    if (inside) {
      winner = this.other(land);
      ref = winner.side < 0 ? 'pointL' : 'pointR';
      if (this.netTouched && b.lastTeam === land) ref = 'net';
      const maker = b.lastTeam === winner ? b.lastPlayer : null;
      if (maker) {
        face = maker;
        const k = b.lastKind;
        if (k === 'spike') faceMsg = Math.random() < 0.4 ? `${this.he} SUCCEEDS!` : Math.random() < 0.5 ? `IT'S ${maker.name} WHO MADE THE PLAY!` : `${maker.name}'S GOT IT!`;
        else if (k === 'block') faceMsg = `BLOCKED BY THE ${maker.team.code} TEAM.${maker.name} DID IT!`;
        else faceMsg = Math.random() < 0.5 ? `IT'S ${maker.name} WHO MADE THE PLAY!` : `${maker.name}'S GOT IT!`;
      }
      const near = land.players.some(p => Math.abs(p.x - b.x) < 40);
      if (near && b.lastTeam !== land) this.announce('OH,NO! JUST OUT OF REACH.');
    } else {
      winner = this.other(b.lastTeam);
      ref = 'out';
      if (b.lastKind === 'blocktouch') { ref = 'touch'; this.announce('ONE TOUCH!'); }
    }
    // statistiche per giocatore (schermata Match Stats)
    const mk = b.lastTeam === winner ? b.lastPlayer : null;
    if (mk) {
      this.stat(mk, 'pts');
      const k = b.lastKind;
      if (k === 'spike') this.stat(mk, 'spike'); else if (k === 'dink' || k === 'feint') this.stat(mk, 'lob');
      else if (k === 'block') this.stat(mk, 'block'); else if (k === 'serve') this.stat(mk, 'ace');
    }
    this.endRally(winner, ref, face, faceMsg);
  }

  endRally(winner, ref, face, faceMsg) {
    this.state = 'dead'; this.stateT = 0; this.winner = winner;
    this.pend = { ref, face, faceMsg, stage: 0 };
    SFX.whistle(); SFX.cheer(!!face);
  }

  // pausa dopo il punto: gesto dell'arbitro, volto del giocatore, punteggio; poi nuova battuta o fine partita
  updateDead() {
    const P = this.pend, t = this.stateT;
    if (this.mode === 'practice') { if (t > 1.4) this.practiceRestart(); return; }
    if (!this.rules.fx) {
      if (P.stage === 0 && t > 1.3) {
        P.stage = 3; this.applyScore(this.winner);
        if (this.matchOver()) this.startEnd(); else { this.checkSwitch(); this.prepareServe(); this.state = 'serve'; this.stateT = 0; }
      }
      return;
    }
    if (P.stage === 0 && t > 0.6) {
      P.stage = 1; this.refPanel.setTexture('ref_' + P.ref).setVisible(true);
    }
    if (P.stage === 1 && t > 1.7) {
      P.stage = 2; this.refPanel.setVisible(false);
      if (P.face) { this.facePanel.setTexture(makeFaceTex(this, P.face.team.code, P.face.ni, 'cheer')).setVisible(true); this.announce(P.faceMsg); }
    }
    if (P.stage === 2 && t > (P.face ? 3.0 : 1.9)) {
      P.stage = 3; this.facePanel.setVisible(false);
      this.applyScore(this.winner);
      if (this.matchOver()) this.startEnd();
      else { this.checkSwitch(); this.prepareServe(); this.state = 'serve'; this.stateT = 0; if (this.mode === 'practice') this.practiceRestart(); else this.startServeAnnounce(); }
    }
  }

  // assegna il punto (rally point o cambio palla 1991) e fa ruotare la squadra che conquista la battuta
  applyScore(w) {
    if (this.mode === 'practice') return;
    const wasServing = this.serving === w;
    if (!this.rules.sideOut || wasServing) {
      w.score++;
      if (w.human === 1 && this.mode === '1p') GS.score += CFG.POINT_SCORE;
    }
    if (wasServing) {
      w.streak++;
      const s = w.players[w.srvI];
      this.serveMsg = w.streak >= 2 ? `${w.code} IS ON A ROLL.  ${s.name} SERVES AGAIN.` : `${s.name} IS SERVING AGAIN.`;
    } else {
      this.serving.streak = 0;
      this.serving = w; w.streak = 0;
      // rotazione: i nomi scorrono di un posto (beach: i due giocatori si alternano al servizio)
      const n = w.players.length;
      w.rot = (w.rot + 1) % n;
      w.players.forEach((p, i) => { p.ni = (i + w.rot) % n; p.name = this.nameOf(w.code, p.ni); p.spr.setTexture(plKey(w.code, p.ni)); if (p.ref) p.ref.setTexture(p.spr.texture.key); });
      this.serveMsg = `${w.players[w.srvI].name} IS NOW SERVING.`;
    }
    this.updateScoreboard();
  }

  // beach: cambio campo ogni 7 punti giocati (5 nel terzo set). Le squadre si scambiano il lato.
  checkSwitch() {
    const n = this.rules.switchEvery, tot = this.teams[0].score + this.teams[1].score;
    if (!n || !tot || tot % n) return;
    for (const t of this.teams) {
      t.side = -t.side;
      for (const p of t.players) { p.spr.setFlipX(t.side === 1); if (p.ref) p.ref.setFlipX(t.side === 1); }
    }
    this.serveMsg = `CHANGE OF SIDES!  ${this.serving.players[this.serving.srvI].name} SERVES.`;
    this.cameras.main.flash(250, 255, 240, 200);
    this.updateScoreboard();
  }

  // fine set: punteggio obiettivo raggiunto con 2 punti di scarto (o tetto)
  matchOver() {
    // dal video: 15-14 si continua, 16-14 e 17-15 chiudono, 16-16 → 17-16 chiude (tetto a 17)
    const [a, b] = this.teams, hi = Math.max(a.score, b.score), lead = Math.abs(a.score - b.score), R = this.rules;
    return (hi >= R.target && lead >= R.winBy) || hi >= R.cap;
  }

  timeUp() {
    const [a, b] = this.teams;
    if (a.score !== b.score && this.state !== 'end') { this.winner = a.score > b.score ? a : b; this.startEnd(); }
  }

  // fine partita: fascia WIN! (moderna) o sequenza arcade
  startEnd() {
    const [a, b] = this.teams;
    const w = a.score > b.score ? a : b;
    this.winner = w; this.state = 'end'; this.stateT = 0; this.endStage = 0;
    if (this.modern) {
      this.showServePanel(false); this.refPanel.setVisible(false); this.facePanel.setVisible(false);
      // fascia WIN! come in Thunder Spikes
      const band = this.add.rectangle(-320, 70, 320, 50, 0x0c3a9a, 0.92).setOrigin(0, 0.5).setScrollFactor(0).setDepth(2300);
      const fl = this.add.image(-250, 66, makeFlagTex(this, w.code, 42, 28)).setScrollFactor(0).setDepth(2301);
      const nm = this.add.text(-250, 86, TEAMS[w.code].name, UI.f(6, '#ffffff', true)).setOrigin(0.5).setScrollFactor(0).setDepth(2301);
      const wt = this.add.text(-130, 70, 'WIN!', UI.f(26, '#ffffff', true)).setOrigin(0.5).setScrollFactor(0).setDepth(2301);
      this.tweens.add({ targets: band, x: 0, duration: 450, ease: 'Cubic.out' });
      this.tweens.add({ targets: [fl, nm], x: '+=320', duration: 450, ease: 'Cubic.out' });
      this.tweens.add({ targets: wt, x: '+=340', duration: 550, delay: 120, ease: 'Back.out' });
      SFX.jingle(); SFX.cheer(true);
      this.time.delayedCall(3600, () => { this.cameras.main.fadeOut(400); this.time.delayedCall(420, () => this.cfg.onDone(this)); });
      this.endStage = 9; return;
    }
    this.announce(`${w.code} HAS WON THE MATCH.`);
    this.refPanel.setTexture('ref_win').setVisible(true);
    SFX.cheer(true);
  }

  updateEnd() {
    const t = this.stateT;
    if (this.endStage === 9) return;
    const lost = this.mode === '1p' && this.winner.human !== 1;
    if (this.endStage === 0 && t > 2.0) {
      this.endStage = 1; this.refPanel.setVisible(false);
      this.tweens.add({ targets: this.introDark, alpha: 0.65, duration: 500 });
      const [a, b] = this.teams;
      this.bigNames.setText(`${a.code}     ${b.code}`).setVisible(true);
      this.bigScore.setText(`${a.score}-${b.score}`).setVisible(true);
      if (lost) {
        // come nel video: "YOU LOST  CONTINUE PLAY? 9" sul tabellone finale
        this.contN = 9;
        this.lostTxt = this.add.text(160, 110, 'YOU LOST', TXT(8)).setOrigin(0.5).setScrollFactor(0).setDepth(2200);
        this.contTxt = this.add.text(150, 128, 'CONTINUE PLAY?', TXT(8)).setOrigin(0.5).setScrollFactor(0).setDepth(2200);
        this.contNum = this.add.text(222, 128, '9', TXT(16)).setOrigin(0.5).setScrollFactor(0).setDepth(2200);
        this.contStart = t; SFX.sad();
      }
    }
    if (this.endStage === 1 && lost) {
      const J = Phaser.Input.Keyboard.JustDown;
      const startP = J(this.kp.en) || J(this.kp.one) || J(this.k1.a);
      if (startP && (GS.credits > 0 || CFG.FREE_PLAY)) {
        if (!CFG.FREE_PLAY) GS.credits--;
        this.endStage = 2; SFX.select(); this.cameras.main.fadeOut(400);
        this.time.delayedCall(420, () => this.cfg.onContinue(this)); return;
      }
      const n = 9 - Math.floor(t - this.contStart);
      if (n !== this.contN) { this.contN = n; if (n >= 0) { this.contNum.setText(String(n)); SFX.blip(); } }
      if (this.contN < 0) { this.endStage = 2; this.cameras.main.fadeOut(500); this.time.delayedCall(520, () => this.cfg.onDone(this)); }
      return;
    }
    if (this.endStage === 1 && t > 5.0) {
      this.endStage = 2;
      this.cameras.main.fadeOut(500);
      this.time.delayedCall(520, () => this.cfg.onDone(this));
    }
  }

  // ---------------- modalità test: comandi da eseguire in questo momento
  // testo della sovraimpressione T: cosa premere in questo momento
  testHelp() {
    const t = this.teams.find(x => x.human === 1) || this.teams[0];
    const b = this.ball, o = this.other(t), L = [];
    const fwd = t.side < 0 ? 'DESTRA' : 'SINISTRA', back = t.side < 0 ? 'SINISTRA' : 'DESTRA';
    L.push(`[TEST]  stato: ${this.state}${this.state === 'serve' ? '/' + this.servePhase : ''}   tocchi ${t.code}: ${b.lastTeam === t ? t.touches : 0}   (T = nascondi${this.mode === 'practice' ? ', ESC = menu pratica' : ''})`);
    if (this.state === 'serve' && this.serving === t) {
      if (this.servePhase !== 'toss') {
        L.push('BATTUTA - premi Z per lanciare. Direzione tenuta al lancio:');
        L.push(`  nessuna = dall'alto   |   ${fwd} (verso rete) = IN SALTO`);
        L.push(`  SU = TOWERING (poi SU+Z)   |   SU+${fwd} = PHANTOM (poi GIU+${fwd}+Z)   |   SU+${back} = THUNDER (poi GIU+${back}+Z)`);
      } else {
        const k = this.serveKind;
        const need = k === 'tower' ? 'tieni SU e ' : k === 'phantom' ? `tieni GIU+${fwd} e ` : k === 'thunder' ? `tieni GIU+${back} e ` : '';
        L.push(k === 'jump' ? 'BATTUTA IN SALTO - rincorsa e stacco automatici: premi Z quando la palla diventa ROSSA'
                            : `BATTUTA (${k.toUpperCase()}) - ${need}premi Z quando la palla diventa ROSSA`);
        L.push(`  al colpo: ${fwd} = lunga, ${back} = corta` + (this.serveZone ? '   >>> ORA! <<<' : ''));
      }
    } else if (this.state === 'serve') {
      L.push(`RICEZIONE in arrivo - ${o.code} batte. Preparati a muovere il ricevitore con ${back}/${fwd}.`);
    } else if (this.state === 'rally') {
      const pl = t.plan;
      if (pl && pl.kind === 'pass') {
        L.push(`RICEZIONE - muovi il giocatore SCHIARITO sotto la FRECCIA BLU con ${back}/${fwd}. Z non serve.`);
        L.push('  il tuffo è automatico. Tieni SU mentre ricevi = OPEN ATTACK (alzata alta all\'asso).');
      } else if (b.lastTeam === t && t.touches === 1 && b.lastKind === 'pass') {
        if (t.mishit) L.push(`RICEZIONE SBAGLIATA - muovi l'ALZATORE sotto la palla con ${back}/${fwd}.`);
        L.push('ALZATA - premi Z ADESSO = PRIMO TEMPO (il centrale salta con l\'alzatore).');
        L.push(`  al tocco dell'alzatore: SU = palla alta   GIU = palla bassa   ${back} = SECONDA LINEA`);
        L.push(`  se l'alzatore palleggia in salto: ${fwd} + Z = SURPRISE ATTACK`);
      } else if (this.attacking(t)) {
        L.push('SCHIACCIATA - rincorsa e salto automatici: premi Z quando la palla è ROSSA' + (this.hitWindow(t) ? '   >>> ORA! <<<' : ''));
        L.push(`  ${back}/${fwd} = sposta la freccia blu (mira)   SU = pallonetto   GIU = power spike`);
        L.push('  Z prima che l\'asso salti = FAKE ATTACK');
      } else if (t.blockers.length && b.lastTeam === o) {
        L.push('MURO - premi Z quando lo schiacciatore avversario salta.');
        if (o.attacker && o.attacker.z > 0) L.push('  >>> SALTA ORA! <<<');
      } else L.push('...attendi');
    } else if (this.state === 'dead') L.push('azione finita');
    return L.join('\n');
  }

  // ---------------- pratica dei fondamentali
  practiceRestart() {
    const d = this.cfg.drill, [H, C] = this.teams;
    this.serving = d === 'receive' || d === 'block' ? C : H;
    this.prepareServe();
    if (d === 'serve' || d === 'receive') { this.state = 'serve'; this.stateT = 0; this.announce(d === 'serve' ? 'PRACTICE: SERVE' : 'PRACTICE: RECEIVE'); return; }
    // ATTACCO / MURO: l'allenatore simula una buona ricezione e la palla va all'alzatore
    const t = d === 'block' ? C : H, side = t.side, b = this.ball, rec = t.players[t.srvI];
    b.held = null; b.live = true; b.bouncing = false;
    b.x = side * 110; b.h = 16;
    const v = PHYS.arcTo(b.x, b.h, side * CFG.SETTER_D, CFG.SET_JUMP_H, 116);
    b.vx = v.vx; b.vy = v.vy; b.ver++;
    b.lastTeam = t; b.lastPlayer = rec; b.lastKind = 'pass'; t.touches = 1;
    t.jumpSet = true; t.mishit = false; t.attacker = null;
    t.quickPlan = !t.human && Math.random() < 0.3;
    this.state = 'rally'; this.stateT = 0;
    this.announce(d === 'block' ? 'PRACTICE: BLOCK' : 'PRACTICE: SET & SPIKE');
  }

  updateScoreboard() {
    if (this.mSb) {
      const [a, b] = this.teams.slice().sort((x, y) => x.side - y.side), g = this.mSb, red = 0xff2a1a;
      g.clear().fillStyle(0x050505, 0.85).fillRect(124, 0, 72, 30);
      this.mSbT[0].setText(a.code); this.mSbT[1].setText(b.code);
      const dg = (n, x0) => { const s = String(n).padStart(2, ' '); this.led(g, x0, 11, s[0], 8, 13, red); this.led(g, x0 + 10, 11, s[1], 8, 13, red); };
      dg(a.score, 128); dg(b.score, 172);
      g.fillStyle(red, 1).fillRect(157, 17, 6, 2);
      g.fillStyle(this.serving === a ? red : 0x3a1010, 1).fillRect(128, 26, 18, 2);
      g.fillStyle(this.serving === b ? red : 0x3a1010, 1).fillRect(172, 26, 18, 2);
      // set vinti (partite su più set, es. beach al meglio dei 3)
      const sw = this.cfg.setsWon;
      if (sw) {
        const [wa, wb] = a === this.teams[0] ? sw : [sw[1], sw[0]];
        if (!this.mSetT) this.mSetT = this.add.text(160, 31, '', UI.f(4.5, '#ffd23a', true)).setOrigin(0.5, 0).setScrollFactor(0).setDepth(2001);
        g.fillStyle(0x050505, 0.85).fillRect(136, 30, 48, 8);
        this.mSetT.setText(`SET ${wa + wb + 1}   ${wa}-${wb}`);
      }
    }
    if (!this.sbNames || this.sbX < -100) return;
    const [a, b] = this.teams.slice().sort((x, y) => x.side - y.side), g = this.sbG, x = this.sbX, y = this.sbY;
    this.sbNames[0].setText(a.code); this.sbNames[1].setText(b.code);
    g.clear();
    const red = 0xff3a1a, digits = (n, x0) => { const s = String(n).padStart(2, ' '); this.led(g, x0, y + 15, s[0], 9, 14, red); this.led(g, x0 + 11, y + 15, s[1], 9, 14, red); };
    digits(a.score, x + 14); digits(b.score, x + 55);
    g.fillStyle(red, 1).fillRect(x + 4, y + 18, 2, 2).fillRect(x + 4, y + 24, 2, 2).fillRect(x + 84, y + 18, 2, 2).fillRect(x + 84, y + 24, 2, 2);
    g.fillRect(x + 40, y + 21, 6, 2);
    // barretta sotto la squadra al servizio (accesa) e l'altra spenta
    g.fillStyle(this.serving === a ? red : 0x4a1410, 1).fillRect(x + 14, y + 31, 20, 2);
    g.fillStyle(this.serving === b ? red : 0x4a1410, 1).fillRect(x + 55, y + 31, 20, 2);
  }

  // movimenti in più tempi, come nella pallavolo vera (versioni ARCADE e HD):
  //  - schiacciata: in salto il braccio si carica dietro la testa, al colpo si distende in alto, poi accompagna verso il basso;
  //  - bagher: mentre la palla arriva il ricevitore si piega sulle gambe con le braccia tese in basso, al contatto spinge.
  // secondi allo stacco di chi sta prendendo la rincorsa (schiacciatore o battitore in salto), altrimenti null
  takeoffIn(p) {
    const t = p.team, b = this.ball, pl = t.plan;
    if (this.state === 'serve' && this.server === p && this.serveKind === 'jump' && this.servePhase === 'toss' && !p.jsJumped) return this.jsHitT - this.jsT - CFG.TPEAK;
    if (this.state === 'rally' && pl && pl.kind === 'spike' && pl.p === p && p.jumpedVer !== b.ver) {
      const th = PHYS.timeToH(b.h, b.vy, CFG.HIT_H); return th === null ? null : th - CFG.TPEAK;
    }
    return null;
  }

  motion(p, st) {
    const t = p.team, b = this.ball;
    // rincorsa "a 4 appoggi": passi di corsa, poi il passo lungo con il piccolo balzo e le braccia indietro, poi lo stacco a piedi pari
    if (p.z <= 0 && (st === 'run' || st === 'idle')) {
      const tj = this.takeoffIn(p);
      if (tj !== null && tj < CFG.APPR_T) return tj < CFG.PLANT_T ? 'plant' : 'appr';
    }
    if (st === 'spike') return p.animT > 0.18 ? 'spike' : 'spkfol';
    // esultanze diverse per ogni giocatore, che cambiano ogni tanto: braccia al cielo, pugno, salto a braccia larghe
    if (st === 'cheer') return ['cheer', 'cheer2', 'cheer3'][(p.ni + Math.floor(this.stateT / 0.7)) % 3];
    if (st === 'pass' && p.animT > 0.22) return 'passload';
    // battuta da fermo: palla in discesa = braccio caricato
    if (st === 'toss' && this.state === 'serve' && this.server === p && this.serveKind !== 'jump' && this.serveKind !== 'tower' && b.vy < 0) return 'srvload';
    // palleggio: mentre la palla scende l'alzatore si piega e porta le mani a finestra sopra la fronte, poi spinge
    if (st !== 'set' && st !== 'dump' && st !== 'dive' && this.state === 'rally' && t.plan && t.plan.p === p && t.plan.kind === 'set' && b.vy < 0) {
      const tl = PHYS.timeToH(b.h, b.vy, t.jumpSet ? CFG.SET_JUMP_H : 40);
      if (tl !== null && tl < 0.35 && Math.abs(p.x - t.plan.xc) < 16) return 'setload';
    }
    if (p.z > 0 && (st === 'jump' || st === 'idle')) {
      const attacking = (t.attacker === p && !p.decoy && b.lastTeam === t && t.touches === 2) ||
                        (this.state === 'serve' && this.server === p && this.serveKind === 'jump' && !p.served);
      if (attacking) return p.vz > 70 ? 'jump' : 'spkload';
    }
    if (p.z <= 0 && (st === 'idle' || st === 'run') && this.state === 'rally' && t.plan && t.plan.p === p && t.plan.kind === 'pass' && b.vy < 0) {
      const tl = PHYS.timeToH(b.h, b.vy, 14);
      if (tl !== null && tl < 0.4 && Math.abs(p.x - (t.plan.xc + t.side * 6)) < 14) return 'passload';
    }
    return st;
  }

  // ------------------------------------------------ rendering
  // DISEGNO (ogni frame, dopo la simulazione): telecamera (anche zoom e inseguimento nelle versioni moderne/3D),
  // fotogramma e posizione degli sprite, riflessi, ombre, indicatori (punto di caduta, bersaglio d'attacco), HIT!/MOVE.
  render(dt) {
    const b = this.ball, FY = CFG.FLOOR_Y;
    const fx = b.held ? b.x : b.x + b.vx * 0.12;
    // telecamera morbida: obiettivo filtrato + "smooth damp" (niente scatti ai colpi)
    const target = clamp(SX(fx) - 160, 0, CFG.OX * 2 - CFG.W);
    if (this.camT === undefined) { this.camT = target; this.camV = 0; }
    this.camT += (target - this.camT) * Math.min(1, dt * 6);
    const st = 0.3, om = 2 / st, k = om * dt, ex = 1 / (1 + k + 0.48 * k * k + 0.235 * k * k * k);
    const ch = this.camX - this.camT, tmp = (this.camV + om * ch) * dt;
    this.camV = (this.camV - om * tmp) * ex; this.camX = this.camT + (ch + tmp) * ex;
    this.camX = clamp(this.camX, 0, CFG.OX * 2 - CFG.W);
    this.cameras.main.scrollX = this.camX;
    if (this.modern) {
      // zoom dinamico (Thunder Spikes): largo in battuta e a fine azione, più stretto durante lo scambio
      const zk = CFG.ZOOM / 3;   // valori pensati per lo zoom 3x della pixel art
      // versione 3D: telecamera vicina, giocatori grandi come in una ripresa televisiva
      const near = GFX === '3d';
      const zt = (this.state === 'rally' ? (near ? 4.1 + clamp(0.3 - b.h / 300, 0, 0.3) : 2.75 + clamp(0.25 - b.h / 400, 0, 0.25)) : (near ? 3.7 : 2.35)) * zk;
      this.zoom = this.zoom || (near ? 3.7 : 2.35) * zk;
      this.zoom += (zt - this.zoom) * Math.min(1, dt * 1.6);
      const cam = this.cameras.main, vw = CFG.W * CFG.ZOOM / this.zoom, vh = CFG.H * CFG.ZOOM / this.zoom;
      cam.setZoom(this.zoom);
      let cx = this.camX + 160, bot = 232;
      if (near) {
        // inquadratura stretta: a metà tra l'azione e il pallone, e in verticale segue le palle alte
        const k = Math.min(1, dt * 3);
        this.camCx = this.camCx === undefined ? cx : this.camCx + ((cx + SX(b.x)) / 2 - this.camCx) * k;
        const want = clamp(FY - b.h - 26 + vh, FY + 12, 232);   // i piedi restano sempre in vista
        this.camBot = this.camBot === undefined ? 232 : this.camBot + (want - this.camBot) * k;
        cx = this.camCx; bot = this.camBot;
      }
      cam.scrollX = clamp(cx - vw / 2, 0, CFG.OX * 2 - vw);
      cam.scrollY = Math.max(ATOP, bot - vh);
    }

    for (const t of this.teams) t.tagOn = false;
    for (const t of this.teams) for (const p of t.players) {
      let st = this.motion(p, p.state);
      if (st === 'run') st = Math.floor(p.runT * 8) % 2 ? 'run2' : 'run1';
      p.spr.setFrame(usePhoto() ? photoFrame(this, p) : PF[st] !== undefined ? PF[st] : 0);
      p.spr.setFlipX((t.side === 1) !== (st === 'passside' && !!p.latBack));
      let lift = st === 'cheer3' ? 4 * Math.abs(Math.sin(this.stateT * 9)) : 0;   // saltello dell'esultanza
      if (st === 'appr') lift = 3 * Math.sin(Math.PI * clamp((CFG.APPR_T - this.takeoffIn(p)) / (CFG.APPR_T - CFG.PLANT_T), 0, 1));   // piccolo balzo della rincorsa
      p.spr.x = SX(p.x); p.spr.y = FY + p.dep - p.z - lift;
      p.spr.setDepth(FY + p.dep);
      // il ricevitore designato appare schiarito, come nell'originale
      const hl = this.state === 'rally' && t.plan && t.plan.p === p && (t.plan.kind === 'pass' || (t.human && (t.plan.kind === 'spike' || (t.plan.kind === 'set' && t.mishit)))) ||
        (this.state !== 'end' && this.state !== 'dead' && !t.plan && this.humanMoves(p));
      if (hl) p.spr.setTint(0xffd8e8); else p.spr.clearTint();
      // chi comanda la persona: alone rosso leggero e P1/P2 sopra la testa
      const mine = hl && !!t.human;
      if (p.spr.preFX) {
        if (!p.glow && mine) { p.spr.preFX.setPadding(6); p.glow = p.spr.preFX.addGlow(0xff3030, 3, 0, false, 0.1, 10); }
        if (p.glow) p.glow.active = mine;
      }
      if (mine) {
        if (!t.tag) t.tag = this.add.text(0, 0, 'P' + t.human, TXT(7, t.human === 1 ? '#ff5050' : '#50a0ff')).setOrigin(0.5, 1).setDepth(1400).setStroke('#000000', 2);
        t.tag.setPosition(p.spr.x, p.spr.y - 44).setVisible(true); t.tagOn = true;
      }
    }
    for (const t of this.teams) if (t.tag && !t.tagOn) t.tag.setVisible(false);
    if (this.ballRef) {
      for (const t of this.teams) for (const p of t.players) {
        p.ref.setTexture(p.spr.texture.key, p.spr.frame.name); p.ref.x = p.spr.x; p.ref.y = FY + p.dep + p.z; p.ref.setFlipX(p.spr.flipX);
      }
      this.ballRef.x = SX(b.x); this.ballRef.y = FY + 2 + b.h + 4; this.ballRef.setVisible(b.h < 120);
    }
    this.routeCameras();
    const g = this.shadowG; g.clear();
    this.fx.clear();
    this.drawSand(dt, g, this.fx);
    for (const t of this.teams) for (const p of t.players) g.fillStyle(0x000000, 0.3).fillEllipse(SX(p.x), FY + p.dep, clamp(12 - p.z * 0.2, 6, 12), 3);
    if (b.live || b.held || b.bouncing) g.fillStyle(0x000000, 0.45).fillEllipse(SX(b.x), FY + 2, clamp(7 - b.h * 0.05, 3, 7), 2);
    const f = this.fx;
    const md = this.modern;
    if (md) {
      // REBOUND INDICATOR (Thunder Spikes): arco bianco sopra il punto di caduta
      const mode = md.rebound;
      if (mode !== 'OFF' && this.state === 'rally' && b.live && b.vy < 0) {
        const tl = PHYS.timeToH(b.h, b.vy, 0);
        const lx = b.x + b.vx * (tl || 0);
        const humanSide = this.teams.some(t => t.human && lx * t.side > 0);
        if (tl !== null && (mode === 'EASY' || (humanSide && tl < 0.7))) {
          const ax = SX(lx), ay = FY - 40;
          f.lineStyle(2, 0xffffff, 0.95).beginPath(); f.arc(ax, ay - 6, 7, 0.25 * Math.PI, 0.75 * Math.PI, false); f.strokePath();
        }
      }
    } else {
      // marcatore blu del punto di caduta (squadra umana in ricezione)
      for (const t of this.teams) {
        if (!t.human || this.state !== 'rally' || !t.plan || t.plan.kind !== 'pass') continue;
        const ax = Math.round(SX(t.plan.xc)), ay = FY - 40;
        const col = t.human === 1 ? 0x2050ff : 0xff3030;
        f.fillStyle(0xffffff, 1).fillRect(ax - 4, ay - 6, 9, 4).fillTriangle(ax - 6, ay - 3, ax + 6, ay - 3, ax, ay + 4);
        f.fillStyle(col, 1).fillRect(ax - 3, ay - 5, 7, 3).fillTriangle(ax - 4, ay - 2, ax + 4, ay - 2, ax, ay + 2);
      }
    }
    let red = false, showHit = false, showMove = false, hx = 0, hy = 0;
    for (const t of this.teams) {
      if (!t.human || !this.attacking(t)) continue;
      const ax = Math.round(SX(-t.side * (t.aimD || 6) * CFG.PPM));
      if (md) {
        // ATTACK TARGET: triangolo nero sul pavimento
        if (md.target) { f.fillStyle(0x000000, 0.9).fillTriangle(ax - 4, FY + 8, ax + 4, FY + 8, ax, FY + 1); f.lineStyle(1, 0xffffff, 0.7).strokeTriangle(ax - 4, FY + 8, ax + 4, FY + 8, ax, FY + 1); }
      } else {
        const ay = FY - 40;
        f.fillStyle(0xffffff, 1).fillRect(ax - 4, ay - 6, 9, 4).fillTriangle(ax - 6, ay - 3, ax + 6, ay - 3, ax, ay + 4);
        f.fillStyle(t.human === 1 ? 0x2050ff : 0xff3030, 1).fillRect(ax - 3, ay - 5, 7, 3).fillTriangle(ax - 4, ay - 2, ax + 4, ay - 2, ax, ay + 2);
      }
      const a = t.attacker; hx = SX(a.x); hy = FY + a.dep - a.z - 52;
      if (this.hitWindow(t)) { red = true; showHit = Math.floor(this.time.now / 120) % 2 === 0; }
      else if (a.z > 0 || (t.plan && t.plan.kind === 'spike' && t.plan.tc < 1.0)) showMove = true;
    }
    // HIT! PRESS BUTTON! anche in battuta (si vede nel video)
    if (this.state === 'serve' && this.servePhase === 'toss' && this.serving.human && this.serveZone) {
      const sv = this.server; hx = SX(sv.x); hy = FY + sv.dep - sv.z - 52; showHit = Math.floor(this.time.now / 120) % 2 === 0; red = true;
    }
    // PHANTOM SERVE: la palla si sdoppia in tre mentre scende
    if (this.phantom && this.phantom.on && b.live && b.lastKind === 'serve' && b.vy < 0 && b.x * this.other(this.serving).side > 0 && b.h < 110 && b.h > 25) {
      const spread = 16 * Math.sin(Math.PI * (110 - b.h) / 85);
      for (const o of [-spread, spread]) f.fillStyle(0xffffff, 0.9).fillCircle(SX(b.x + o), FY + 2 - b.h - 4, 3.5);
    }
    this.hitTxt.setVisible(showHit).setPosition(hx, hy);
    this.moveTxt.setVisible(showMove).setPosition(hx, hy);
    if (red) this.ballSpr.setTint(0xff4040); else this.ballSpr.clearTint();
    const sp = Math.hypot(b.vx, b.vy);
    if (b.live && sp > 260) { b.trail.unshift([b.x, b.h]); if (b.trail.length > 5) b.trail.pop(); } else if (b.trail.length) b.trail.pop();
    b.trail.forEach((tp, i) => { if (i) f.fillStyle(0xffffff, 0.35 - i * 0.06).fillCircle(SX(tp[0]), FY + 2 - tp[1], 3 - i * 0.4); });
    this.ballSpr.x = SX(b.x); this.ballSpr.y = FY + 2 - b.h - 4;
    this.ballSpr.rotation = b.spin;

    if (this.testOn) this.testTxt.setText(this.testHelp());
    const sec = this.timeLeft === null ? 0 : Math.ceil(this.timeLeft);
    this.timeText.setText(`${String(Math.floor(sec / 60)).padStart(2, '0')}'${String(sec % 60).padStart(2, '0')}"`);
    if (this.demoText) {
      this.demoText.setText(GS.credits > 0 ? 'PUSH START\nBUTTON' : 'GAME OVER\nINSERT COINS!');
      this.demoText.setVisible(Math.floor(this.time.now / 500) % 2 === 0);
    }
  }
}
