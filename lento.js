// ============================================================
//  PRATICA LENTA (menu TUTORIAL / PRATICA, riga VELOCITÀ)
//  - NORMALE: la pratica di sempre.
//  - LENTA: il gioco va al 45% della velocità e si FERMA a ogni passaggio (battuta, lancio, momento di colpire,
//    ricezione, alzata, schiacciata, muro) con le istruzioni scritte in grande. Da fermo si tiene la direzione
//    giusta e si preme Z: l'azione parte esattamente in quel momento. INVIO (START) continua senza premere Z.
//    Le istruzioni sono quelle della sovraimpressione T (testHelp in match.js).
// ============================================================
const SLOW_K = 0.45;
let PRACTICE_SLOW = false;
try { PRACTICE_SLOW = localStorage.getItem('sf91_pslow') === '1'; } catch (e) { /* */ }
function setPracticeSlow(v) { PRACTICE_SLOW = v; try { localStorage.setItem('sf91_pslow', v ? '1' : '0'); } catch (e) { /* */ } }

// ---------------- menu della pratica: riga VELOCITÀ sotto gli esercizi ----------------
const _practiceCreate = PracticeScene.prototype.create;
PracticeScene.prototype.create = function () {
  _practiceCreate.apply(this, arguments);
  this.spdTxt = this.add.text(70, 54 + DRILLS.length * 22, '', TXT(8));
  this.refresh();
};
const _practiceRefresh = PracticeScene.prototype.refresh;
PracticeScene.prototype.refresh = function () {
  if (!this.spdTxt) return _practiceRefresh.apply(this, arguments);
  const on = this.sel === DRILLS.length;
  this.opts.forEach((o, i) => o.setColor(i === this.sel ? '#ffffff' : '#9098c8'));
  this.spdTxt.setText(`VELOCITÀ: ${PRACTICE_SLOW ? 'LENTA' : 'NORMALE'}${on ? '  ◄ ►' : ''}`).setColor(on ? '#ffffff' : '#9098c8');
  this.cur.y = (on ? this.spdTxt : this.opts[this.sel]).y + 4;
};
PracticeScene.prototype.update = function () {
  if (this.gone) return;
  const n = DRILLS.length + 1;
  if (this.jd('up')) { this.sel = (this.sel + n - 1) % n; this.refresh(); SFX.blip(); }
  if (this.jd('down')) { this.sel = (this.sel + 1) % n; this.refresh(); SFX.blip(); }
  if (this.jd('esc')) { this.gone = true; this.scene.start('MainMenu'); return; }
  if (this.sel === DRILLS.length) {
    if (this.jd('left') || this.jd('right') || this.btn()) { setPracticeSlow(!PRACTICE_SLOW); this.refresh(); SFX.blip(); }
    return;
  }
  if (this.btn() || this.startPressed()) {
    this.gone = true; SFX.select();
    this.scene.start('Match', { mode: 'practice', drill: DRILLS[this.sel][0], test: true, slow: PRACTICE_SLOW, left: 'ITA', right: 'JPN', humans: [1, 0],
      skillL: 0.85, skillR: 0.7, start: [0, 0], time: null, setLabel: 'PRACTICE', firstServe: 0, onDone: m => m.scene.start('Practice') });
  }
};

// ---------------- partita di pratica lenta ----------------
const _createSlow = MatchScene.prototype.create;
MatchScene.prototype.create = function (d) {
  this.slow = null; this.slowFreeze = null; this.slowSeen = new Set(); this.slowPrevState = null;
  _createSlow.apply(this, arguments);
  if (!d || d.mode !== 'practice' || !d.slow) return;
  this.slow = true;
  const st = { fontFamily: 'Arial, sans-serif', fontSize: '8px', color: '#ffffff', resolution: CFG.ZOOM, lineSpacing: 2, align: 'center', wordWrap: { width: 296 } };
  this.slowBox = this.add.rectangle(160, 58, 312, 100, 0x000000, 0.82).setStrokeStyle(1, 0xffd23a).setOrigin(0.5, 0).setScrollFactor(0).setDepth(2450).setVisible(false);
  this.slowTxt = this.add.text(160, 63, '', st).setOrigin(0.5, 0).setScrollFactor(0).setDepth(2451).setVisible(false);
  this.slowKey = this.add.text(160, 0, '', Object.assign({}, st, { fontSize: '8px', color: '#ffd23a', fontStyle: 'bold' })).setOrigin(0.5, 0).setScrollFactor(0).setDepth(2451).setVisible(false);
  this.slowTag = this.add.text(316, 214, 'LENTA', Object.assign({}, st, { fontSize: '6px', color: '#ffd23a' })).setOrigin(1, 0).setScrollFactor(0).setDepth(2451);
};

// istruzioni del momento (senza la riga di stato della sovraimpressione T)
function slowLines(m) {
  // il battitore va ancora al suo posto o l'arbitro non ha ancora dato la battuta: Z non varrebbe
  if (m.state === 'serve' && (m.servePhase === 'walk' || (m.servePhase === 'ready' && m.serving.human && (m.panelT || 0) < 0.35))) return null;
  const L = m.testHelp().split('\n').slice(1);
  const main = L.join('\n');
  if (!main || /^\.\.\.attendi|^azione finita/.test(main)) return null;
  return L;
}
function slowShow(m, L) {
  const txt = L.map(s => s.trim()).join('\n'), now = /ORA!/.test(txt);
  // attesa: la palla non è ancora al punto giusto, Z adesso sarebbe troppo presto (il gioco si ferma di nuovo dopo)
  const wait = !now && /quando la palla (diventa|è) ROSSA|quando lo schiacciatore avversario salta/.test(txt);
  const noZ = wait || /Z non serve|Preparati a muovere/.test(txt);
  m.slowFreeze = { noZ };
  m.slowTxt.setText(txt.replace(/\s*>>> (SALTA )?ORA! <<</g, ''));
  m.slowKey.setText(now ? '>>> PREMI Z ADESSO! <<<   (INVIO = continua senza premere)'
    : wait ? 'Z o INVIO = continua: il gioco si ferma di nuovo al momento di premere Z'
    : noZ ? 'Z o INVIO = continua (qui si usano solo le frecce)'
    : 'Tieni la direzione che vuoi e premi Z   ·   INVIO = continua senza Z');
  const h = m.slowTxt.height;
  m.slowKey.setY(63 + h + 4);
  m.slowBox.setSize(312, h + m.slowKey.height + 14);
  m.slowBox.setVisible(true); m.slowTxt.setVisible(true); m.slowKey.setVisible(true);
  m.testBox.setVisible(false); m.testTxt.setVisible(false);
}
function slowHide(m) {
  m.slowFreeze = null;
  m.slowBox.setVisible(false); m.slowTxt.setVisible(false); m.slowKey.setVisible(false);
  m.testBox.setVisible(m.testOn); m.testTxt.setVisible(m.testOn);
}

const _updateSlow = MatchScene.prototype.update;
MatchScene.prototype.update = function (time, delta) {
  if (!this.slow) return _updateSlow.apply(this, arguments);
  // passaggi già spiegati in questa azione: si riparte da capo a ogni nuova battuta
  if (this.state !== this.slowPrevState) { if (this.state === 'serve' || this.state === 'dead') this.slowSeen.clear(); this.slowPrevState = this.state; }
  if (this.slowFreeze) {
    this.pollInput();
    if (this.leaving) return;
    const go = this.inp[1].a, skip = Phaser.Input.Keyboard.JustDown(this.kp.en);
    if (go || skip) {
      const noZ = this.slowFreeze.noZ;
      slowHide(this);
      if (skip || noZ) this.inp[1].a = false;   // INVIO: si continua senza l'azione di Z
      this.slowStep(delta);                      // con Z l'azione parte in questo stesso istante
    } else this.inp[1].a = false;
    this.render(0);
    return;
  }
  this.pollInput();
  this.slowStep(delta);
  this.render(delta * SLOW_K / 1000);
  if (this.paused || this.leaving || this.state === 'intro') return;
  const L = slowLines(this);
  if (!L) return;
  const key = L.join('\n');
  if (this.slowSeen.has(key)) return;
  this.slowSeen.add(key);
  slowShow(this, L);
};
// stessa simulazione di update (match.js), al rallentatore
MatchScene.prototype.slowStep = function (delta) {
  if (this.paused) return;
  const fd = Math.min(delta, 50) / 1000 * SLOW_K, n = Math.max(1, Math.ceil(fd / CFG.STEP - 1e-6));
  for (let i = 0; i < n; i++) this.step(fd / n);
};
