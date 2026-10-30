// ============================================================
//  NOMI DEI GIOCATORI E PANNELLO STATISTICHE (tutte le grafiche)
//  - N in partita: nomi dei giocatori in piccolo SOPRA la testa, SOTTO i piedi o spenti (resta salvato).
//    Scritta bianca con il bordo nero, gialla per il giocatore che comandi: si legge su ogni sfondo.
//  - B in partita: mostra / nasconde il riquadro con energia ed errori (fatica.js), che ora sta in alto,
//    sotto il tabellone, e non copre più i giocatori.
// ============================================================
const NAMES_MODES = ['NOMI SPENTI', 'NOMI SOPRA I GIOCATORI', 'NOMI SOTTO I GIOCATORI'];
const SHOWOPT = { names: 0, stats: true };
try {
  SHOWOPT.names = Number(localStorage.getItem('sf91_names')) || 0;
  SHOWOPT.stats = localStorage.getItem('sf91_stats') !== '0';
} catch (e) { /* */ }
function showOptSave() { try { localStorage.setItem('sf91_names', String(SHOWOPT.names)); localStorage.setItem('sf91_stats', SHOWOPT.stats ? '1' : '0'); } catch (e) { /* */ } }

const _setupInputNames = MatchScene.prototype.setupInput;
MatchScene.prototype.setupInput = function () {
  _setupInputNames.apply(this, arguments);
  const K = Phaser.Input.Keyboard.KeyCodes;
  this.kShow = this.input.keyboard.addKeys({ n: K.N, b: K.B });
};
const _pollNames = MatchScene.prototype.pollInput;
MatchScene.prototype.pollInput = function () {
  _pollNames.apply(this, arguments);
  if (!this.kShow || this.mode === 'demo') return;
  const J = Phaser.Input.Keyboard.JustDown;
  if (J(this.kShow.n)) { SHOWOPT.names = (SHOWOPT.names + 1) % 3; showOptSave(); this.announce(NAMES_MODES[SHOWOPT.names]); }
  if (J(this.kShow.b)) { SHOWOPT.stats = !SHOWOPT.stats; showOptSave(); this.announce(SHOWOPT.stats ? 'STATISTICHE VISIBILI' : 'STATISTICHE NASCOSTE'); }
};

const _renderNames = MatchScene.prototype.render;
MatchScene.prototype.render = function (dt) {
  _renderNames.apply(this, arguments);
  const mode = this.mode === 'demo' ? 0 : SHOWOPT.names;
  for (const t of this.teams) for (const p of t.players) {
    if (!mode) { if (p.nameT) p.nameT.setVisible(false); continue; }
    if (!p.nameT || !p.nameT.scene) p.nameT = this.add.text(0, 0, '', UI.f(4.2, '#ffffff', true)).setStroke('#000000', 1.6).setDepth(1399);
    const s = p.spr, mine = !!t.human && s.isTinted;
    const nm = String(p.name || '').toUpperCase().slice(0, 12);
    if (p.nameT.text !== nm) p.nameT.setText(nm);
    p.nameT.setColor(mine ? '#ffe030' : '#ffffff').setVisible(s.visible);
    if (mode === 1) p.nameT.setOrigin(0.5, 1).setPosition(s.x, s.y - 41);
    else p.nameT.setOrigin(0.5, 0).setPosition(s.x, CFG.FLOOR_Y + p.dep + 2);
  }
  // con i nomi sopra, la scritta P1 / P2 sale un po'
  if (mode === 1) for (const t of this.teams) if (t.tag && t.tagOn) t.tag.y -= 7;
};
