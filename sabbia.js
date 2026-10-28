// ============================================================
//  BEACH: SABBIA CHE SI DEFORMA E TIME-OUT PER SPIANARLA
//  - Ogni passo, stacco, atterraggio, tuffo e pallone a terra scava una buca nella sabbia e alza un bordo di sabbia
//    smossa intorno (oltre agli spruzzi di match.js -> sand). Le buche restano: durante il set il manto diventa
//    sempre più irregolare, su e giù, soprattutto dove si gioca di più.
//  - TIME-OUT (R per il giocatore 1, Y per il giocatore 2; sul telefono ⋯ > R): a palla ferma, UNO per squadra in
//    ogni set. Il gioco si ferma, entra il rastrello e spiana tutta la sabbia del campo, poi si riprende.
//    Il set successivo è una nuova partita: sabbia spianata e time-out di nuovo disponibile.
//  Il manto è una griglia (SBX x SBY unità) disegnata su una texture che si aggiorna solo quando la sabbia cambia.
// ============================================================
const SAND_GRID = { dx: 2, dy: 1.5, y0: -8, rows: 13 };   // celle di 2 x 1,5 unità, da 8 unità dietro a 11 davanti alla linea dei piedi

// buca (k > 0) con il bordo rialzato intorno; x in unità dello schermo, y = linea dei piedi (FLOOR_Y + profondità)
MatchScene.prototype.sandDig = function (x, y, w, k) {
  const G = this.sandGrid || (this.sandGrid = { h: new Float32Array(Math.ceil(CFG.OX * 2 / SAND_GRID.dx) * SAND_GRID.rows), dirty: true });
  const cols = Math.ceil(CFG.OX * 2 / SAND_GRID.dx), rx = Math.max(2, w * 0.55), ry = Math.max(1.5, w * 0.18);
  const cy = (y - CFG.FLOOR_Y - SAND_GRID.y0) / SAND_GRID.dy;
  for (let r = Math.floor(cy - ry * 1.6 / SAND_GRID.dy); r <= Math.ceil(cy + ry * 1.6 / SAND_GRID.dy); r++) {
    if (r < 0 || r >= SAND_GRID.rows) continue;
    for (let c = Math.floor((x - rx * 1.5) / SAND_GRID.dx); c <= Math.ceil((x + rx * 1.5) / SAND_GRID.dx); c++) {
      if (c < 0 || c >= cols) continue;
      const ex = (c * SAND_GRID.dx - x) / rx, ey = (r - cy) * SAND_GRID.dy / ry, d = Math.hypot(ex, ey), i = r * cols + c;
      if (d < 1) G.h[i] -= k * (1 - d * d);                                // buca
      else if (d < 1.5) G.h[i] += k * 0.45 * Math.sin((d - 1) / 0.5 * Math.PI);   // bordo di sabbia smossa
      G.h[i] = clamp(G.h[i], -2, 1.6);
    }
  }
  G.dirty = true;
};

// spruzzi più evidenti (anche qualche zolla) e deformazione del manto a ogni impronta
const _sandBeach = MatchScene.prototype.sand;
MatchScene.prototype.sand = function (x, dep, n, power, mark) {
  _sandBeach.call(this, x, dep, Math.round(n * 1.5), power, mark);
  if (!this.beach) return;
  const S = this.sandFx, y = CFG.FLOOR_Y + dep;
  if (power > 45) for (let i = 0; i < Math.ceil(n / 3); i++)
    S.parts.push({ x: SX(x) + rnd(-3, 3), y, z: rnd(0, 2), vx: rnd(-1, 1) * power * 0.5, vz: rnd(0.3, 0.8) * power, life: rnd(0.4, 0.8), c: 0xc8a868, s: rnd(1.8, 2.6) });
  if (mark) this.sandDig(SX(x), y, mark, clamp(mark / 10, 0.18, 1.2));
};

// texture del manto: chiara dove la sabbia è alta, scura nelle buche (ombra in basso a destra, luce in alto a sinistra)
MatchScene.prototype.drawSandGrid = function () {
  const G = this.sandGrid; if (!G || !G.dirty) return;
  const now = this.time.now; if (G.last && now - G.last < 120) return;   // al massimo 8 volte al secondo
  G.last = now; G.dirty = false;
  const W = CFG.OX * 2, H = SAND_GRID.rows * SAND_GRID.dy + 4, cols = Math.ceil(W / SAND_GRID.dx);
  if (!this.sandTex) {
    const key = 'sanddef_' + (++MatchScene.sandN || (MatchScene.sandN = 1));
    const { t, c } = canvasTex(this, key, W, H); this.sandTex = { t, c, key };
    this.sandImg = this.add.image(0, CFG.FLOOR_Y + SAND_GRID.y0 - 2, key).setOrigin(0).setDepth(-19);
    this.events.once('shutdown', () => { if (this.textures.exists(key)) this.textures.remove(key); });
  }
  const { t, c } = this.sandTex, base = Phaser.Display.Color.IntegerToColor(this.sandColor || 0xe8c890);
  const dark = base.clone().darken(38), lite = base.clone().lighten(16);
  c.clearRect(0, 0, W, H);
  for (let r = 0; r < SAND_GRID.rows; r++) for (let col = 0; col < cols; col++) {
    const h = G.h[r * cols + col]; if (Math.abs(h) < 0.04) continue;
    const C = h < 0 ? dark : lite, a = clamp(Math.abs(h) * (h < 0 ? 0.6 : 0.7), 0, 0.75);
    c.fillStyle = `rgba(${C.red},${C.green},${C.blue},${a})`;
    c.beginPath(); c.ellipse(col * SAND_GRID.dx + 1, 2 + r * SAND_GRID.dy + 0.75, SAND_GRID.dx * 0.75, SAND_GRID.dy * 0.6, 0, 0, 7); c.fill();
  }
  t.refresh();
};

// ---------------- time-out ----------------
const _setupInputSand = MatchScene.prototype.setupInput;
MatchScene.prototype.setupInput = function () {
  _setupInputSand.apply(this, arguments);
  const K = Phaser.Input.Keyboard.KeyCodes, kb = this.input.keyboard;
  this.kTo = { 1: kb.addKey(K.R), 2: kb.addKey(K.Y) };
  this.toUsed = {};   // squadre che hanno già chiesto il time-out in questo set
};
MatchScene.prototype.canTimeout = function (t) {
  return this.beach && !!t && !this.toUsed[t.code] && !this.sub && !this.timeoutFx && typeof this.canSub === 'function' && this.canSub();
};
const _pollInputSand = MatchScene.prototype.pollInput;
MatchScene.prototype.pollInput = function () {
  if (this.timeoutFx) return;   // durante il time-out il gioco è fermo
  _pollInputSand.apply(this, arguments);
  if (!this.kTo || !this.beach) return;
  for (const n of [1, 2]) {
    if (!Phaser.Input.Keyboard.JustDown(this.kTo[n])) continue;
    const t = this.teams.find(x => x.human === n);
    if (!t) continue;
    if (this.toUsed[t.code]) { this.announce('TIME-OUT GIÀ USATO IN QUESTO SET'); continue; }
    if (this.canTimeout(t)) this.startTimeout(t);
  }
};
MatchScene.prototype.startTimeout = function (t) {
  this.toUsed[t.code] = true;
  this.timeoutFx = { t, T: 0, t0: performance.now(), wasPaused: this.paused, objs: [] };
  this.paused = true; this.announce('');
  const D = 2500, F = this.timeoutFx;
  F.objs.push(this.add.rectangle(160, 70, 200, 34, 0x05153a, 0.9).setScrollFactor(0).setDepth(D).setStrokeStyle(1, 0x3a7ae0));
  F.objs.push(this.add.text(160, 61, `TIME-OUT ${t.code}`, UI.f(9, '#ffd23a', true)).setOrigin(0.5).setScrollFactor(0).setDepth(D + 1));
  F.objs.push(this.add.text(160, 76, 'SI SPIANA LA SABBIA', UI.f(5.5, '#ffffff', true)).setOrigin(0.5).setScrollFactor(0).setDepth(D + 1));
  F.rake = this.add.graphics().setDepth(CFG.FLOOR_Y + 30); F.objs.push(F.rake);
  SFX.whistle();
};
// rastrello che passa da un lato all'altro del campo e spiana la sabbia dietro di sé
MatchScene.prototype.updateTimeout = function (dt) {
  const F = this.timeoutFx, L = CFG.HALF + 30, DUR = 2.6;
  F.T = (performance.now() - F.t0) / 1000;   // tempo reale: dura uguale anche se il gioco va a scatti
  const k = clamp(F.T / DUR, 0, 1), rx = SX(-L + 2 * L * k), FY = CFG.FLOOR_Y;
  const G = this.sandGrid;
  if (G) {
    const cols = Math.ceil(CFG.OX * 2 / SAND_GRID.dx), upTo = Math.floor(rx / SAND_GRID.dx);
    for (let r = 0; r < SAND_GRID.rows; r++) for (let c = 0; c <= upTo && c < cols; c++) { const i = r * cols + c; if (G.h[i]) { G.h[i] *= 0.6; if (Math.abs(G.h[i]) < 0.03) G.h[i] = 0; } }
    G.dirty = true;
  }
  if (this.sandFx) this.sandFx.marks = this.sandFx.marks.filter(m => m.x > rx);
  // rastrello: manico inclinato e pettine sulla sabbia
  const g = F.rake; g.clear();
  if (k < 1) {
    g.lineStyle(1.4, 0x8a5a2a, 1).lineBetween(rx - 22, FY - 34, rx, FY + 1);
    g.fillStyle(0x6a6a6a, 1).fillRect(rx - 1, FY - 9, 2.4, 20);
    for (let y = FY - 8; y < FY + 11; y += 2.5) g.fillRect(rx + 1, y, 2, 0.8);
    if (Math.random() < dt * 30) this.sandFx && this.sandFx.parts.push({ x: rx + 3, y: FY + rnd(-6, 8), z: 0, vx: rnd(10, 40), vz: rnd(10, 40), life: 0.4, c: 0xd8b878 });
  }
  if (F.T > DUR + 0.6) {
    F.objs.forEach(o => o.destroy());
    this.paused = F.wasPaused; this.timeoutFx = null;
    this.announce(`${F.t.code}: SABBIA SPIANATA`);
  }
};
const _renderSand = MatchScene.prototype.render;
MatchScene.prototype.render = function (dt) {
  _renderSand.apply(this, arguments);
  if (!this.beach) return;
  if (this.timeoutFx) this.updateTimeout(dt);
  this.drawSandGrid();
  // promemoria a palla ferma: R (Y per il giocatore 2) = time-out, finché non è stato usato
  if (!this.toHint) this.toHint = this.add.text(316, 214, '', UI.f(5, '#ffd23a', true)).setOrigin(1, 0).setScrollFactor(0).setDepth(2050).setStroke('#000000', 2);
  const hs = this.kTo ? this.teams.filter(t => t.human && this.canTimeout(t)) : [];
  const on = hs.length > 0;
  if (on) { const s = hs.map(t => (t.human === 1 ? 'R' : 'Y') + ': TIME-OUT ' + t.code).join('   '); if (this.toHint.text !== T(s)) this.toHint.setText(s); }
  this.toHint.setVisible(on);
};
