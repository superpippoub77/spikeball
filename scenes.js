// ============================================================
//  Schermate e flusso arcade (ricostruiti dal video completo)
//  Attract: logo → demo → "easy to play" → "challenge a friend" → demo → classifica
//  Gioco:   select game → select your team → how to play → presentazione incontro
//           → formazione → FINAL SET → partita → YOU WON + bonus → TECHNIC n → ...
//           → CONGRATULATIONS → inserimento nome → GAME OVER
// ============================================================
const KEYS = { start: ['ENTER', 'ONE'], btn: ['Z', 'SPACE'], btn2: ['G'] };
const ORD = ['1ST', '2ND', '3RD', '4TH', '5TH'];

class Base extends Phaser.Scene {
  bg(alpha = 1) { makePattern(this); makeCommon(this); return this.add.image(0, 0, 'pattern').setOrigin(0).setAlpha(alpha); }
  keysInit() {
    const kb = this.input.keyboard, K = Phaser.Input.Keyboard.KeyCodes;
    this.K = kb.addKeys({ up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, z: K.Z, sp: K.SPACE, en: K.ENTER, one: K.ONE, two: K.TWO,
                          w: K.W, s: K.S, a: K.A, d: K.D, g: K.G, t: K.T, esc: K.ESC });
  }
  jd(k) {
    const j = Phaser.Input.Keyboard.JustDown(this.K[k]);
    if (this._born === undefined) this._born = this.time.now;
    return j && this.time.now - this._born > 350;   // ignora i tasti ereditati dalla schermata precedente
  }
  btn() { return this.jd('z') || this.jd('sp'); }
  startPressed() { return this.jd('en') || this.jd('one'); }
  creditText(x = 314, y = 214) {
    this.crTxt = this.add.text(x, y, '', TXT(7)).setOrigin(1, 0).setDepth(50);
    const upd = () => this.crTxt.setText(CFG.FREE_PLAY ? 'FREE PLAY' : `CREDIT:${GS.credits}`);
    upd(); this.events.on('update', upd);
  }
  // nel ciclo attract: START con credito → menu
  attractInput() {
    if (this.jd('t')) { SFX.select(); this.scene.start('Practice'); return true; }
    if (this.jd('esc')) { SFX.select(); this.scene.start('MainMenu'); return true; }
    if ((this.startPressed() || this.btn()) && (GS.credits > 0 || CFG.FREE_PLAY)) { SFX.select(); this.scene.start('SelectGame'); return true; }
    return false;
  }
  timeCounter(sec, x, y, onZero) {
    this.tLeft = sec;
    this.tTxt = this.add.text(x, y, `TIME ${sec}`, TXT(8)).setOrigin(0.5);
    this.time.addEvent({ delay: 1000, repeat: sec, callback: () => {
      this.tLeft--; if (this.tLeft >= 0) this.tTxt.setText(`TIME ${this.tLeft}`);
      if (this.tLeft === 0) onZero();
    } });
  }
}

// ---------------- ATTRACT ----------------
const ATTRACT = ['Logo', 'demo', 'Easy', 'Challenge', 'demo', 'Ranking'];
function nextAttract(scene) {
  GS.attract = (GS.attract + 1) % ATTRACT.length;
  const k = ATTRACT[GS.attract];
  if (k === 'demo') {
    const pool = [...SELECTABLE, ...STAGES.map(s => s.team)];
    const L = pool[Math.floor(Math.random() * pool.length)];
    let R; do { R = pool[Math.floor(Math.random() * pool.length)]; } while (R === L);
    scene.scene.start('Match', { mode: 'demo', left: L, right: R, humans: [0, 0], skillL: 0.8, skillR: 0.8, start: [9, 9], time: 0,
      setLabel: 'FINAL SET', demoTime: 32, onDone: s => nextAttract(s) });
  } else scene.scene.start(k);
}

class LogoScene extends Base {
  update() {
    if (this.attractInput()) return;
    this.coinTxt.setText(GS.credits > 0 || CFG.FREE_PLAY ? 'PRESS 1P BUTTON!' : 'INSERT COINS!').setVisible(Math.floor(this.time.now / 450) % 2 === 0);
  }
  constructor() { super('Logo'); }
  create() {
    camSetup(this);
    this.bg(); this.keysInit(); this.creditText();
    makePlayerTex(this, 'ITA', 0); makePlayerTex(this, 'CHN', 1);
    // tre "fotogrammi" che entrano, come nell'intro originale
    const panel = (x, y, w, h, fn) => { const c = this.add.container(x, y); const r = this.add.rectangle(0, 0, w, h, 0x101010).setOrigin(0); c.add(r); fn(c); return c; };
    const p1 = panel(-120, 14, 92, 64, c => { c.add(this.add.rectangle(2, 2, 88, 60, 0xc86a3a).setOrigin(0)); c.add(this.add.sprite(46, 64, plKey('ITA', 0), PF.spike).setOrigin(0.5, 1).setScale(1.6)); });
    const p2 = panel(340, 30, 76, 70, c => { c.add(this.add.rectangle(2, 2, 72, 66, 0x2a2a2a).setOrigin(0)); c.add(this.add.sprite(38, 72, plKey('ITA', 0), PF.set).setOrigin(0.5, 1).setScale(1.8)); });
    const p3 = panel(100, 240, 130, 74, c => {
      c.add(this.add.rectangle(2, 2, 126, 70, 0x1a1a1a).setOrigin(0));
      const g = this.add.graphics(); g.lineStyle(1, 0x606060); for (let i = 0; i < 8; i++) g.lineBetween(4, 28 + i * 5, 124, 28 + i * 5); for (let i = 0; i < 24; i++) g.lineBetween(4 + i * 5, 28, 4 + i * 5, 64);
      g.fillStyle(0xd0d0d0).fillRect(4, 26, 120, 3); c.add(g);
      c.add(this.add.sprite(44, 80, plKey('CHN', 1), PF.block).setOrigin(0.5, 1).setScale(1.8));
      c.add(this.add.image(88, 20, 'ballbig').setScale(1));
    });
    this.tweens.add({ targets: p1, x: 18, duration: 600, ease: 'Cubic.out' });
    this.tweens.add({ targets: p2, x: 118, duration: 600, delay: 400, ease: 'Cubic.out' });
    this.tweens.add({ targets: p3, y: 112, duration: 600, delay: 800, ease: 'Cubic.out' });
    this.time.delayedCall(1500, () => {
      const l1 = this.add.text(160, 66, GAME_TITLE[0] + ' ' + GAME_TITLE[1].split(' ')[0], { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '30px', fontStyle: 'italic bold', color: '#ffffff' })
        .setOrigin(0.5).setStroke('#d0208a', 5).setShadow(3, 3, '#1a0a50', 0, true, true).setScale(3, 0.1);
      this.tweens.add({ targets: l1, scaleX: 1, scaleY: 1, duration: 400, ease: 'Back.out' });
      this.add.text(250, 92, GAME_TITLE[1].split(' ')[1] || '', TXT(10, '#ffe030')).setOrigin(0.5).setStroke('#000', 3);
      SFX.jingle();
    });
    this.add.text(160, 200, '(c)2026  TRIBUTE GAME', TXT(8)).setOrigin(0.5).setStroke('#000', 2);
    this.coinTxt = this.add.text(160, 176, '', TXT(8, '#a0b8ff')).setOrigin(0.5).setStroke('#ffffff', 2).setDepth(10);
    this.time.delayedCall(7000, () => nextAttract(this));
  }
}

class EasyScene extends Base {
  constructor() { super('Easy'); }
  create() {
    camSetup(this);
    this.bg(); this.keysInit(); this.creditText();
    const t = this.add.text(160, 100, 'EASY TO PLAY.\n\nONLY ONE BUTTON\n\nTO USE.', { ...TXT(10), align: 'center' }).setOrigin(0.5).setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, duration: 700, ease: 'Back.out' });
    const g = this.add.graphics();
    g.fillStyle(0x901010).fillEllipse(70, 196, 90, 34); g.fillStyle(0xe02020).fillEllipse(70, 188, 84, 30); g.fillStyle(0xff6060).fillEllipse(62, 182, 40, 10);
    const star = this.add.graphics(); star.fillStyle(0xfff060);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; star.fillTriangle(70, 188, 70 + Math.cos(a) * 52, 188 + Math.sin(a) * 30, 70 + Math.cos(a + 0.3) * 30, 188 + Math.sin(a + 0.3) * 18); }
    star.setDepth(-1).setAlpha(0.8);
    this.time.delayedCall(4500, () => nextAttract(this));
  }
  update() { this.attractInput(); }
}

class ChallengeScene extends Base {
  constructor() { super('Challenge'); }
  create() {
    camSetup(this);
    this.bg(); this.keysInit(); this.creditText();
    const t = this.add.text(160, 100, 'CHALLENGE A FRIEND\n\nFOR ADDED EXCITEMENT', { ...TXT(10), align: 'center' }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 600 });
    this.time.delayedCall(4500, () => nextAttract(this));
  }
  update() { this.attractInput(); }
}

function drawRanking(scene, y0, highlightIdx) {
  const R = GS.loadRanking(), objs = [];
  R.forEach((r, i) => {
    const y = y0 + i * 18;
    objs.push(scene.add.text(80, y, `${i + 1}:`, TXT(8, '#ffe030')));
    objs.push(scene.add.text(150, y, String(r.score), TXT(8, i === 0 ? '#ffffff' : '#c8c8c8')).setOrigin(1, 0));
    objs.push(scene.add.text(166, y, r.name.padEnd(3, ' '), TXT(10, i === highlightIdx ? '#ffffff' : '#c8c8c8')));
    if (r.stage === 'ALL') objs.push(scene.add.text(214, y, 'ALL', TXT(8)));
    else objs.push(scene.add.image(214, y - 1, makeFlagTex(scene, r.stage, 14, 9)).setOrigin(0));
  });
  return objs;
}

class RankingScene extends Base {
  constructor() { super('Ranking'); }
  create() {
    camSetup(this);
    this.bg(); this.keysInit(); this.creditText();
    this.add.text(160, 22, '- SCORE RANKING -', TXT(8, '#ffe030')).setOrigin(0.5);
    drawRanking(this, 50);
    this.add.text(160, 160, 'INSERT COINS!', TXT(8)).setOrigin(0.5);
    // volti che scorrono ai lati
    const codes = ['URS', 'CUB', 'USA', 'JPN', 'CHN', 'ITA', 'BRA', 'GER'];
    this.cols = [];
    for (const [x, dir] of [[26, -1], [294, 1]]) {
      const col = [];
      for (let i = 0; i < 6; i++) {
        const code = codes[(i * 3 + (dir > 0 ? 1 : 0)) % codes.length], idx = i % 4;
        col.push(this.add.image(x, i * 48, makeFaceTex(this, code, idx, 'neutral')));
      }
      this.cols.push({ col, dir });
    }
    this.time.delayedCall(8000, () => nextAttract(this));
  }
  update(t, dt) {
    if (this.attractInput()) return;
    for (const { col, dir } of this.cols) for (const im of col) { im.y += dir * dt * 0.02; if (im.y < -30) im.y += 288; if (im.y > 258) im.y -= 288; }
  }
}

// ---------------- SELECT GAME ----------------
class SelectGameScene extends Base {
  constructor() { super('SelectGame'); }
  create() {
    camSetup(this);
    this.bg(); this.keysInit(); this.creditText();
    this.add.text(160, 34, 'SELECT GAME', TXT(12)).setOrigin(0.5);
    this.opts = [this.add.text(150, 78, '1 PLAYER', TXT(8)).setOrigin(0.5), this.add.text(150, 120, '2 PLAYERS', TXT(8)).setOrigin(0.5)];
    this.cur = this.add.image(0, 0, 'ballbig');
    this.sel = 0; this.done = false; this.refresh();
    this.timeCounter(9, 160, 186, () => this.choose());
  }
  refresh() {
    const two = GS.credits >= 2 || CFG.FREE_PLAY;
    this.opts[1].setColor(two ? (this.sel === 1 ? '#ffffff' : '#c0c0c0') : '#8a8a40');
    this.opts[0].setColor(this.sel === 0 ? '#ffffff' : '#c0c0c0');
    this.cur.setPosition(this.opts[this.sel].x - this.opts[this.sel].width / 2 - 14, this.opts[this.sel].y);
  }
  choose() {
    if (this.done) return;
    this.done = true; SFX.select();
    if (this.sel === 1 && (GS.credits >= 2 || CFG.FREE_PLAY)) { GS.mode = '2p'; if (!CFG.FREE_PLAY) GS.credits -= 2; }
    else { GS.mode = '1p'; if (!CFG.FREE_PLAY) GS.credits = Math.max(0, GS.credits - 1); }
    GS.score = 0; GS.stage = 0;
    this.scene.start('SelectTeam');
  }
  update() {
    if (this.done) return;
    if (this.jd('up') || this.jd('down')) { this.sel = 1 - this.sel; if (this.sel === 1 && GS.credits < 2 && !CFG.FREE_PLAY) this.sel = 0; this.refresh(); SFX.blip(); }
    if (this.btn() || this.startPressed()) this.choose();
  }
}

// ---------------- SELECT YOUR TEAM ----------------
class SelectTeamScene extends Base {
  constructor() { super('SelectTeam'); }
  create() {
    camSetup(this);
    this.bg(); this.keysInit(); this.creditText();
    this.add.text(160, 12, 'SELECT YOUR TEAM', TXT(12)).setOrigin(0.5, 0);
    SELECTABLE.forEach((c, i) => {
      this.add.image(66, 38 + i * 17, makeFlagTex(this, c, 22, 14)).setOrigin(0, 0.5);
      this.add.text(94, 38 + i * 17, c, TXT(10)).setOrigin(0, 0.5);
    });
    this.c = [0, GS.mode === '2p' ? 1 : -1];
    this.ok = [false, GS.mode !== '2p'];
    this.m1 = this.add.image(50, 0, 'mark1p').setOrigin(0.5);
    this.m2 = GS.mode === '2p' ? this.add.image(50, 0, 'mark2p').setOrigin(0.5) : null;
    this.big = this.add.image(230, 72, makeFlagTex(this, 'ITA', 88, 58));
    this.bigName = this.add.text(230, 112, '', TXT(12)).setOrigin(0.5);
    if (this.m2) { this.big2 = this.add.image(230, 150, makeFlagTex(this, 'FRA', 60, 40)); this.bigName2 = this.add.text(230, 178, '', TXT(10)).setOrigin(0.5); }
    this.refresh();
    this.timeCounter(9, 160, 206, () => { this.ok = [true, true]; this.go(); });
  }
  refresh() {
    const c1 = SELECTABLE[this.c[0]];
    this.m1.y = 36 + this.c[0] * 17;
    this.big.setTexture(makeFlagTex(this, c1, 88, 58)); this.bigName.setText(TEAMS[c1].name.split('').join(' '));
    if (this.m2) { const c2 = SELECTABLE[this.c[1]]; this.m2.y = 40 + this.c[1] * 17; this.m2.x = 44; this.big2.setTexture(makeFlagTex(this, c2, 60, 40)); this.bigName2.setText(TEAMS[c2].name); }
  }
  go() {
    if (this.gone) return; this.gone = true; SFX.select();
    GS.p1 = SELECTABLE[this.c[0]];
    if (GS.mode === '2p') { GS.p2 = SELECTABLE[this.c[1]]; this.scene.start('SelectSets'); }
    else this.scene.start('HowTo', { next: s => startStage(s) });
  }
  update() {
    if (this.gone) return;
    if (!this.ok[0]) {
      if (this.jd('up')) { this.c[0] = (this.c[0] + 8) % 9; SFX.blip(); this.refresh(); }
      if (this.jd('down')) { this.c[0] = (this.c[0] + 1) % 9; SFX.blip(); this.refresh(); }
      if (this.btn() || this.startPressed()) { this.ok[0] = true; SFX.select(); this.m1.setTint(0x808080); }
    }
    if (this.m2 && !this.ok[1]) {
      if (this.jd('w')) { this.c[1] = (this.c[1] + 8) % 9; SFX.blip(); this.refresh(); }
      if (this.jd('s')) { this.c[1] = (this.c[1] + 1) % 9; SFX.blip(); this.refresh(); }
      if (this.jd('g') || this.jd('two')) { this.ok[1] = true; SFX.select(); this.m2.setTint(0x808080); }
    }
    if (this.ok[0] && this.ok[1]) this.go();
  }
}

// 2 giocatori: 1 SET MATCH o 5 SET MATCH (dal manuale)
class SelectSetsScene extends Base {
  constructor() { super('SelectSets'); }
  create() {
    camSetup(this);
    this.bg(); this.keysInit(); this.creditText();
    this.add.text(160, 34, 'SELECT MATCH', TXT(12)).setOrigin(0.5);
    this.opts = [this.add.text(160, 80, '1 SET MATCH', TXT(8)).setOrigin(0.5), this.add.text(160, 116, '5 SET MATCH', TXT(8)).setOrigin(0.5)];
    this.cur = this.add.image(0, 0, 'ballbig'); this.sel = 0; this.refresh();
    this.timeCounter(9, 160, 186, () => this.go());
  }
  refresh() { this.cur.setPosition(this.opts[this.sel].x - 66, this.opts[this.sel].y); }
  go() { if (this.gone) return; this.gone = true; SFX.select(); GS.sets = this.sel ? 5 : 1; GS.setWins = [0, 0]; GS.setNo = 0; this.scene.start('HowTo', { next: s => start2P(s) }); }
  update() {
    if (this.gone) return;
    if (this.jd('up') || this.jd('down') || this.jd('w') || this.jd('s')) { this.sel = 1 - this.sel; this.refresh(); SFX.blip(); }
    if (this.btn() || this.startPressed() || this.jd('g')) this.go();
  }
}

// ---------------- HOW TO PLAY ----------------
const HOWTO = [
  { title: 'HOW TO PLAY', rows: [['', 'USE ONLY ONE BUTTON'], ['', ''], ['', 'JOYSTICK: PLAYER MOVEMENT,'], ['', '          BALL DIRECTION'], ['', 'BUTTON:   JUMP,HIT,ETC.']], pic: 'stick' },
  { title: 'HOW TO PLAY', rows: [['SERVE', ''], ['', 'PRESS BUTTON TO TOSS THE BALL'], ['', 'AND PRESS BUTTON AGAIN TO HIT.']], pic: 'serve' },
  { title: '', rows: [['RECEIVING:', 'USE THE JOYSTICK TO POSITION'], ['', 'THE RECEIVER.BUTTON IS NOT USED.'], ['', ''], ['SET-UP:', 'THE SET-UP IS AUTOMATIC BUT IF'], ['', 'THE RECEIVER MISHITS THE BALL,'], ['', 'USE THE JOYSTICK TO POSITION'], ['', 'THE SETTER.BUTTON IS NOT USED.'], ['', ''], ['SPIKE:', 'APPROACH AND JUMP SET IS AUTO-'], ['', 'MATIC.PRESS THE BUTTON TO SPIKE'], ['', 'AT THE RIGHT TIME.']] }
];
const TECHNIC = [
  { title: 'TECHNIC 1', rows: [['BLOCK:', 'PRESS THE BUTTON TO BLOCK AT THE'], ['', 'RIGHT TIME.'], ['', ''], ['DIRECTION OF THE BALL:', ''], ['', 'PUSH THE JOYSTICK TO THE LEFT'], ['', 'OR RIGHT WHEN HITTING.']], pic: 'dir' },
  { title: 'TECHNIC 2', rows: [['QUICK ATTACK:', 'PRESS THE BUTTON BEFORE THE'], ['', 'SET-UP,PROMPTS THE SPIKER TO'], ['', 'GET A HEADSTART ON THE SPIKE.'], ['', ''], ['OPEN ATTACK:', 'WHEN RECEIVING,PLACE THE'], ['', 'JOYSTICK IN THE UP POSITION'], ['', 'AND ACE SPIKER SPIKES.']] },
  { title: 'TECHNIC 3', rows: [['TYPES OF SET-UPS:', 'JOYSTICK'], ['', '  UP    HIGH SET'], ['', '  DOWN  LOW SET'], ['', '  BACK  BACKROW SET'], ['', ''], ['SPIKING POWER AND DINK:', ''], ['', '  UP    FEINT SHOT'], ['', '  DOWN  POWER SPIKES']] },
  { title: 'TECHNIC 4', rows: [['FAKE ATTACK:', 'BEFORE THE ACE SPIKER GOES'], ['', 'FOR THE SPIKE,PRESS THE BUTTON'], ['', 'AND HE WILL FAKE A SPIKE.'], ['', ''], ['SURPRISE ATTACK:', 'DURING JUMP SET,MOVE THE'], ['', 'JOYSTICK TOWARDS THE NET,'], ['', 'AND PRESS THE BUTTON.']] }
];

class InfoScene extends Base {
  constructor(key) { super(key || 'HowTo'); }
  init(d) { this.d = d; }
  pages() { return HOWTO; }
  create() {
    camSetup(this);
    this.bg(); this.keysInit();
    this.page = 0; this.objs = []; this.showPage();
    if (this.d && this.d.scoreLine) this.add.text(8, 6, `SCORE: ${GS.score}`, TXT(8)).setDepth(5);
  }
  showPage() {
    this.objs.forEach(o => o.destroy()); this.objs = [];
    const P = this.pages()[this.page];
    if (P.title) this.objs.push(this.add.text(160, 14, P.title, TXT(12)).setOrigin(0.5, 0));
    let y = P.title ? 40 : 14;
    const wide = P.rows.some(r => r[0].length > 12);
    P.rows.forEach(r => {
      if (r[0]) this.objs.push(this.add.text(6, y, r[0], TXT(7, '#ffe030')));
      if (r[1]) this.objs.push(this.add.text(r[0].length > 12 ? 6 + (r[1].startsWith(' ') ? 0 : 0) : 70, r[0].length > 12 ? y + 10 : y, r[1], TXT(7)));
      y += r[0].length > 12 ? 20 : 11;
    });
    const g = this.add.graphics(); this.objs.push(g);
    if (P.pic === 'stick') {
      g.fillStyle(0xffc020); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, x = 70 + Math.cos(a) * 26, yy = 150 + Math.sin(a) * 26; g.fillTriangle(x + Math.cos(a) * 6, yy + Math.sin(a) * 6, x + Math.cos(a + 2) * 5, yy + Math.sin(a + 2) * 5, x + Math.cos(a - 2) * 5, yy + Math.sin(a - 2) * 5); }
      g.fillStyle(0x404040).fillRect(68, 150, 4, 18); g.fillStyle(0xd02020).fillCircle(70, 148, 9); g.fillStyle(0xff8080).fillCircle(67, 145, 3);
      g.fillStyle(0x901010).fillEllipse(210, 160, 50, 18); g.fillStyle(0xe02020).fillEllipse(210, 155, 46, 16);
      g.lineStyle(1, 0xc02020).strokeEllipse(256, 157, 34, 14).strokeEllipse(296, 157, 34, 14);
    } else if (P.pic === 'serve' || P.pic === 'dir') {
      g.lineStyle(1, 0xffffff); g.lineBetween(70, 196, 300, 196); g.lineBetween(180, 196, 180, 160);
      g.lineStyle(1, 0xffffff, 0.8);
      for (let i = 0; i < 30; i++) { const t = i / 30; g.fillStyle(0xffffff).fillRect(90 + t * 200, 172 - Math.sin(t * Math.PI) * 30 + t * 24, 1, 1); }
      if (P.pic === 'dir') { for (let i = 0; i < 30; i++) { const t = i / 30; g.fillStyle(0xff3030).fillRect(90 + t * 170, 172 - Math.sin(t * Math.PI) * 26 + t * 24, 1, 1); } g.fillStyle(0xffe030).fillTriangle(160, 150, 168, 146, 168, 154); g.fillStyle(0xff3030).fillTriangle(196, 150, 188, 146, 188, 154); }
      g.fillStyle(0xffffff).fillCircle(90, 172, 3);
    }
    this.objs.push(this.add.text(160, 212, 'BUTTON=SKIP', TXT(8)).setOrigin(0.5));
    this.pageT = 0;
  }
  next() {
    this.page++;
    if (this.page >= this.pages().length) { if (!this.gone) { this.gone = true; this.d.next(this); } return; }
    this.showPage();
  }
  update(t, dt) {
    if (this.gone) return;
    this.pageT += dt;
    if (this.btn() || this.jd('g')) { SFX.blip(); this.page = this.pages().length - 1; this.next(); return; }
    if (this.pageT > 6500) this.next();
  }
}
class TechnicScene extends InfoScene {
  constructor() { super('Technic'); }
  pages() { return [TECHNIC[this.d.n]]; }
}

// ---------------- presentazione incontro e formazione ----------------
class MatchIntroScene extends Base {
  constructor() { super('MatchIntro'); }
  init(d) { this.d = d; }
  create() {
    camSetup(this);
    makeCommon(this); this.keysInit();
    const d = this.d;
    this.add.image(0, 0, makeHallTex(this, TEAMS[d.right].fl)).setOrigin(0);
    this.cameras.main.fadeIn(700);
    if (d.scoreLine) this.add.text(8, 6, `SCORE: ${GS.score}`, TXT(8));
    this.add.text(160, 46, d.label, TXT(12)).setOrigin(0.5);
    const f1 = this.add.image(-60, 96, makeFlagTex(this, d.left, 72, 48));
    const f2 = this.add.image(380, 96, makeFlagTex(this, d.right, 72, 48));
    this.tweens.add({ targets: f1, x: 100, duration: 500, ease: 'Cubic.out' });
    this.tweens.add({ targets: f2, x: 220, duration: 500, ease: 'Cubic.out' });
    this.time.delayedCall(500, () => {
      this.add.text(160, 96, 'VS', TXT(10)).setOrigin(0.5);
      this.add.text(100, 128, TEAMS[d.left].name.split('').join(' '), TXT(9)).setOrigin(0.5).setStroke('#000', 2);
      this.add.text(220, 128, TEAMS[d.right].name.split('').join(' '), TXT(9)).setOrigin(0.5).setStroke('#000', 2);
      SFX.jingle();
    });
    this.time.delayedCall(4200, () => { this.cameras.main.fadeOut(300); this.time.delayedCall(320, () => d.next(this)); });
  }
}

class LineupScene extends Base {
  constructor() { super('Lineup'); }
  init(d) { this.d = d; }
  create() {
    camSetup(this);
    makeCommon(this);
    this.add.image(0, 0, makeLineupCourt(this, this.d.team)).setOrigin(0);
    if (this.d.scoreLine) this.add.text(8, 6, `SCORE: ${GS.score}`, TXT(8, '#000000'));
    const code = this.d.team, pos = [[42, 34], [86, 34], [30, 86], [76, 86], [18, 140], [64, 140]];
    pos.forEach(([x, y], i) => {
      const im = this.add.image(x - 200, y, makeFaceTex(this, code, i % 4, 'neutral')).setOrigin(0).setScale(1.1);
      this.tweens.add({ targets: im, x, duration: 300, delay: i * 120, ease: 'Cubic.out' });
    });
    this.time.delayedCall(3200, () => this.d.next(this));
  }
}

// ---------------- flusso 1 giocatore ----------------
function startStage(scene) {
  const st = STAGES[GS.stage];
  scene.scene.start('MatchIntro', { left: GS.p1, right: st.team, label: st.label, scoreLine: true,
    next: s1 => s1.scene.start('Lineup', { team: GS.p1, scoreLine: true,
      next: s2 => s2.scene.start('Match', {
        mode: '1p', left: GS.p1, right: st.team, humans: [1, 0], skillL: 0.85, skillR: st.skill + (CFG.HARD ? 0.08 : 0),
        start: st.start.map(v => CFG.SIDE_OUT ? v : Math.max(0, v - CFG.RALLY_START_SHIFT)), time: CFG.MATCH_TIME, setLabel: 'FINAL SET', firstServe: 0, onDone: m => after1P(m), onContinue: m => startStage(m)
      }) }) });
}

function after1P(m) {
  const [a, b] = m.teams;
  const won = a.score > b.score;
  const bonus = won ? Math.ceil(m.timeLeft || 0) * CFG.BONUS_PER_SEC + CFG.BONUS_BASE : 0;
  if (won) {
    m.scene.start('YouWon', { bonus, team: GS.p1, next: s => {
      if (GS.stage >= STAGES.length - 1) s.scene.start('Congrats');
      else { const n = GS.stage; GS.stage++; s.scene.start('Technic', { n: Math.min(n, 3), scoreLine: true, next: s3 => startStage(s3) }); }
    } });
  } else m.scene.start('NameEntry', { stage: STAGES[GS.stage].team });
}

class YouWonScene extends Base {
  constructor() { super('YouWon'); }
  init(d) { this.d = d; }
  create() {
    camSetup(this);
    this.bg(); this.keysInit();
    this.scoreTxt = this.add.text(8, 6, `SCORE: ${GS.score}`, TXT(8));
    // "foto" della squadra che esulta: due giocatori abbracciati
    const fr = this.add.rectangle(160, 92, 112, 86, 0x101010);
    this.add.rectangle(160, 92, 108, 82, 0x2a3a70);
    const code = this.d.team;
    this.add.sprite(140, 132, plKey(code, 0), PF.cheer).setOrigin(0.5, 1).setScale(2);
    this.add.sprite(180, 132, plKey(code, 1), PF.cheer).setOrigin(0.5, 1).setScale(2).setFlipX(true);
    this.add.text(160, 150, 'YOU WON!', TXT(12)).setOrigin(0.5);
    this.bonus = this.d.bonus;
    this.bTxt = this.add.text(160, 176, '', TXT(8)).setOrigin(0.5);
    this.bTxt.setText(`BONUS    ${this.bonus}`);
    SFX.jingle();
    this.counting = false;
    this.time.delayedCall(1500, () => this.counting = true);
  }
  update(t, dt) {
    if (this.counting && this.bonus > 0) {
      const k = Math.min(this.bonus, 200); this.bonus -= k; GS.score += k;
      this.scoreTxt.setText(`SCORE: ${GS.score}`); this.bTxt.setText(`BONUS    ${this.bonus}`);
      if (Math.floor(t / 60) % 2) SFX.tone(1200, 0.02, 'square', 0.04);
    } else if (this.counting && !this.leaving) {
      this.leaving = true; this.time.delayedCall(1500, () => this.d.next(this));
    }
  }
}

class ContinueScene extends Base {
  constructor() { super('Continue'); }
  create() {
    camSetup(this);
    this.bg(0.5); this.keysInit(); this.creditText();
    this.add.text(160, 70, 'CONTINUE ?', TXT(14)).setOrigin(0.5);
    this.add.text(160, 160, 'INSERT COIN AND PUSH START', TXT(7)).setOrigin(0.5);
    this.n = 9; this.nt = this.add.text(160, 110, '9', TXT(24, '#ffe030')).setOrigin(0.5);
    this.time.addEvent({ delay: 1000, repeat: 9, callback: () => { this.n--; if (this.n >= 0) this.nt.setText(String(this.n)); else this.end(); } });
    SFX.sad();
  }
  end() { if (this.gone) return; this.gone = true; GS.lastStage = STAGES[GS.stage].team; this.scene.start('NameEntry', { stage: STAGES[GS.stage].team }); }
  update() {
    if (this.gone) return;
    if ((this.startPressed() || this.btn()) && (GS.credits > 0 || CFG.FREE_PLAY)) {
      this.gone = true; if (!CFG.FREE_PLAY) GS.credits--; SFX.select(); startStage(this);
    }
  }
}

class CongratsScene extends Base {
  constructor() { super('Congrats'); }
  create() {
    camSetup(this);
    this.bg(); this.keysInit();
    this.add.text(8, 6, `SCORE: ${GS.score}`, TXT(8));
    this.add.rectangle(160, 80, 200, 110, 0x101010); this.add.rectangle(160, 80, 196, 106, 0x2a4a50);
    this.add.rectangle(160, 128, 196, 10, 0xd0d0c0);
    for (let i = 0; i < 8; i++) this.add.sprite(78 + i * 23, 126, plKey(GS.p1, i % 4), PF.cheer).setOrigin(0.5, 1).setScale(1.3);
    const t = this.add.text(160, 160, 'CONGRATULATIONS!', { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '22px', fontStyle: 'italic bold', color: '#ffd030' }).setOrigin(0.5).setStroke('#7a4a00', 4).setScale(0);
    this.tweens.add({ targets: t, scale: 1, duration: 700, ease: 'Back.out' });
    SFX.jingle(); this.time.delayedCall(600, () => SFX.jingle());
    this.time.delayedCall(6000, () => this.scene.start('NameEntry', { stage: 'ALL' }));
  }
}

class NameEntryScene extends Base {
  constructor() { super('NameEntry'); }
  init(d) { this.d = d; }
  create() {
    camSetup(this);
    this.bg(); this.keysInit();
    const R = GS.loadRanking();
    this.pos = R.findIndex(r => GS.score > r.score);
    if (this.pos < 0 || GS.mode !== '1p') { this.scene.start('GameOver'); return; }
    R.splice(this.pos, 0, { score: GS.score, name: 'A', stage: this.d.stage }); R.length = 5;
    this.add.text(160, 30, 'INPUT YOUR NAME', TXT(8, '#ffe030')).setOrigin(0.5);
    this.letters = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ.!'.split('');
    this.name = []; this.li = 1; this.redraw();
    this.timeLeft = 30;
    this.time.addEvent({ delay: 1000, loop: true, callback: () => { if (--this.timeLeft <= 0) this.finish(); } });
  }
  redraw() {
    (this.objs || []).forEach(o => o.destroy());
    const R = GS.ranking;
    R[this.pos].name = (this.name.join('') + (this.name.length < 3 ? this.letters[this.li] : '')).trim() || ' ';
    this.objs = drawRanking(this, 60, this.pos);
  }
  finish() { if (this.gone) return; this.gone = true; GS.ranking[this.pos].name = this.name.join('') || 'AAA'; GS.saveRanking(); this.time.delayedCall(800, () => this.scene.start('GameOver')); }
  update() {
    if (this.gone || this.pos < 0) return;
    if (this.jd('right') || this.jd('up')) { this.li = (this.li + 1) % this.letters.length; this.redraw(); SFX.blip(); }
    if (this.jd('left') || this.jd('down')) { this.li = (this.li + this.letters.length - 1) % this.letters.length; this.redraw(); SFX.blip(); }
    if (this.btn() || this.startPressed()) { this.name.push(this.letters[this.li]); SFX.select(); if (this.name.length >= 3) this.finish(); this.redraw(); }
  }
}

class GameOverScene extends Base {
  constructor() { super('GameOver'); }
  create() {
    camSetup(this);
    this.cameras.main.setBackgroundColor('#000000');
    const t = this.add.text(160, 112, 'GAME OVER', { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '24px', fontStyle: 'italic bold', color: '#e0d8ff' }).setOrigin(0.5).setStroke('#4a3ac0', 4).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 600 });
    this.time.delayedCall(4000, () => { GS.attract = -1; nextAttract(this); });
  }
}

// ---------------- 2 giocatori ----------------
function start2P(scene) {
  const n = GS.setNo;
  scene.scene.start('MatchIntro', { left: GS.p1, right: GS.p2, label: GS.sets === 1 ? '1 SET MATCH' : `${ORD[n]} SET`, scoreLine: false,
    next: s1 => s1.scene.start('Match', {
      mode: '2p', left: GS.p1, right: GS.p2, humans: [1, 2], skillL: 0.85, skillR: 0.85, start: CFG.START_2P.slice(), time: CFG.MATCH_TIME,
      timeUpEnds: true, floor: GS.p2, setLabel: GS.sets === 1 ? 'FINAL SET' : `${ORD[n]} SET`, firstServe: n % 2, onDone: m => after2P(m)
    }) });
}
function after2P(m) {
  const [a, b] = m.teams;
  const w = a.score > b.score ? 0 : 1;
  GS.setWins[w]++; GS.setNo++;
  if (GS.sets === 5 && GS.setWins[0] < 3 && GS.setWins[1] < 3 && m.timeLeft > 0) start2P(m);
  else m.scene.start('Winner2P', { code: w ? GS.p2 : GS.p1, sets: GS.setWins.slice(), a: a.score, b: b.score });
}
class Winner2PScene extends Base {
  constructor() { super('Winner2P'); }
  init(d) { this.d = d; }
  create() {
    camSetup(this);
    this.bg(); makeCommon(this);
    this.add.image(160, 70, makeFlagTex(this, this.d.code, 88, 58));
    this.add.text(160, 120, `${this.d.code} WINS!`, TXT(14, '#ffe030')).setOrigin(0.5).setStroke('#000', 3);
    this.add.text(160, 150, GS.sets === 5 ? `SETS ${this.d.sets[0]} - ${this.d.sets[1]}` : `${this.d.a} - ${this.d.b}`, TXT(10)).setOrigin(0.5);
    SFX.jingle();
    this.time.delayedCall(5000, () => this.scene.start('GameOver'));
  }
}

// ---------------- MODALITÀ TEST: pratica dei fondamentali ----------------
const DRILLS = [
  ['serve', 'BATTUTA (anche speciali)'],
  ['receive', 'RICEZIONE (la CPU batte)'],
  ['attack', 'ALZATA E SCHIACCIATA'],
  ['block', 'MURO E DIFESA (la CPU attacca)']
];
class PracticeScene extends Base {
  constructor() { super('Practice'); }
  create() {
    camSetup(this);
    this.bg(); this.keysInit();
    this.add.text(160, 18, 'TEST MODE - PRATICA', TXT(10, '#ffe030')).setOrigin(0.5);
    this.opts = DRILLS.map((d, i) => this.add.text(70, 54 + i * 22, d[1], TXT(8)));
    this.sel = 0; this.cur = this.add.image(54, 0, 'ballbig');
    const st = { fontFamily: 'Arial, sans-serif', fontSize: '7px', color: '#c8d0ff', resolution: CFG.ZOOM, align: 'center' };
    this.add.text(160, 160, 'FRECCE = joystick   Z = pulsante\nIn partita: T mostra/nasconde i comandi   ESC = torna qui\nI comandi da eseguire appaiono in basso in ogni momento', st).setOrigin(0.5, 0);
    this.add.text(160, 206, 'Z = INIZIA     ESC = MENU PRINCIPALE', TXT(7)).setOrigin(0.5);
    this.refresh();
  }
  refresh() { this.opts.forEach((o, i) => o.setColor(i === this.sel ? '#ffffff' : '#9098c8')); this.cur.y = this.opts[this.sel].y + 4; }
  update() {
    if (this.gone) return;
    if (this.jd('up')) { this.sel = (this.sel + DRILLS.length - 1) % DRILLS.length; this.refresh(); SFX.blip(); }
    if (this.jd('down')) { this.sel = (this.sel + 1) % DRILLS.length; this.refresh(); SFX.blip(); }
    if (this.jd('esc')) { this.gone = true; this.scene.start('MainMenu'); return; }
    if (this.btn() || this.startPressed()) {
      this.gone = true; SFX.select();
      this.scene.start('Match', { mode: 'practice', drill: DRILLS[this.sel][0], test: true, left: 'ITA', right: 'JPN', humans: [1, 0],
        skillL: 0.85, skillR: 0.7, start: [0, 0], time: null, setLabel: 'PRACTICE', firstServe: 0, onDone: m => m.scene.start('Practice') });
    }
  }
}

// ---------------- avvio ----------------
function startGame() {
  if (HIRES) {   // testi nitidi alla risoluzione dello schermo
    const F = Phaser.GameObjects.GameObjectFactory.prototype, text = F.text;
    F.text = function (x, y, s, style) { return text.call(this, x, y, s, Object.assign({}, style, { resolution: CFG.ZOOM })); };
  }
  window.__game = new Phaser.Game({
    // rendering a 3x della risoluzione nativa: lo scorrimento è fluido (sub-pixel) e la grafica resta a pixel
    type: HIRES ? Phaser.WEBGL : Phaser.AUTO, parent: 'game', width: CFG.W * CFG.ZOOM, height: CFG.H * CFG.ZOOM,
    pixelArt: true, antialias: false, roundPixels: false, backgroundColor: '#000000', fps: { target: 60, smoothStep: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [MainMenuScene, TeamSelectScene, MatchSettingsScene, MatchStatsScene, LeagueSelectScene, LeagueTeamScene, LeagueHubScene, LeagueSetScene, LogoScene, MatchScene, EasyScene, ChallengeScene, RankingScene, SelectGameScene, SelectTeamScene, SelectSetsScene,
            InfoScene, TechnicScene, PracticeScene, MatchIntroScene, LineupScene, YouWonScene, ContinueScene, CongratsScene, NameEntryScene, GameOverScene, Winner2PScene]
  });
  // gettone: tasto 5 o C (ovunque)
  window.addEventListener('keydown', e => {
    SFX.init();
    if (e.key === '5' || e.key === 'c' || e.key === 'C') { GS.credits = Math.min(9, GS.credits + 1); SFX.coin(); }
    // H: ARCADE -> HD -> 3D -> ARCADE (ricarica la pagina)
    if (e.key === 'h' || e.key === 'H') { const u = new URL(location.href); u.searchParams.set('gfx', GFX_MODES[(GFX_MODES.indexOf(GFX) + 1) % GFX_MODES.length]); location.href = u.href; }
  });
  if (HIRES) document.body.classList.add('hd');
}

(function boot() {
  GS.loadRanking();
  let started = false;
  const go = () => { if (started) return; if (document.readyState !== 'complete') { window.addEventListener('load', go, { once: true }); return; } started = true; startGame(); };
  if (document.fonts && document.fonts.load) Promise.race([Promise.all([document.fonts.load('8px "Press Start 2P"'), document.fonts.load('8px "Russo One"')]), new Promise(r => setTimeout(r, 2000))]).then(go, go);
  else go();
})();
