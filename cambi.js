// ============================================================
//  CAMBI durante la partita
//  A palla ferma (tra un punto e l'altro o prima della battuta) il giocatore 1 preme X, il giocatore 2 Q:
//  si apre il pannello dei cambi con chi è in campo e chi è in panchina.
//    ↑↓ giocatore in campo   ← → chi entra dalla panchina   Z: cambio   X / Q / ESC: chiudi
//  Il giocatore che entra prende il posto (e il turno di battuta) di chi esce. Il libero (ruolo L) ha la maglia
//  di un altro colore, è più bravo in ricezione e difesa, e non batte, non attacca e non mura (match.js -> isLib).
//  I cambi valgono per la partita in corso: alla partita dopo torna la formazione scelta.
// ============================================================
const _setupInputSub = MatchScene.prototype.setupInput;
MatchScene.prototype.setupInput = function () {
  _setupInputSub.apply(this, arguments);
  const K = Phaser.Input.Keyboard.KeyCodes, kb = this.input.keyboard;
  this.kSub = { 1: kb.addKey(K.X), 2: kb.addKey(K.Q), esc: kb.addKey(K.ESC) };
  this.subCount = { 1: 0, 2: 0 };
};
// palla ferma: punto appena finito o battuta non ancora lanciata
MatchScene.prototype.canSub = function () {
  return this.mode !== 'demo' && this.mode !== 'practice' && !this.leaving &&
    (this.state === 'dead' || (this.state === 'serve' && this.servePhase !== 'toss'));
};
// panchina: i giocatori della rosa oltre quelli in campo (TEAMS[code].names dopo i primi n, vedi applyLineup)
MatchScene.prototype.benchOf = function (t) {
  const P = TEAMS[t.code], n = t.players.length;
  return P.names.map((_, i) => i).filter(i => i >= n);
};
const _pollInputSub = MatchScene.prototype.pollInput;
MatchScene.prototype.pollInput = function () {
  if (this.sub) { this.subInput(); return; }
  _pollInputSub.apply(this, arguments);
  if (!this.kSub || !this.canSub()) return;
  for (const n of [1, 2]) {
    if (!Phaser.Input.Keyboard.JustDown(this.kSub[n])) continue;
    const t = this.teams.find(x => x.human === n);
    if (!t) continue;
    if (!this.benchOf(t).length) { this.announce('NESSUN GIOCATORE IN PANCHINA'); continue; }
    this.openSub(t);
  }
};
// promemoria a palla ferma: X (o Q per il giocatore 2) apre i cambi
const _renderSub = MatchScene.prototype.render;
MatchScene.prototype.render = function (dt) {
  _renderSub.apply(this, arguments);
  if (!this.kSub) return;
  if (!this.subHint) this.subHint = this.add.text(4, 214, '', UI.f(5, '#ffd23a', true)).setScrollFactor(0).setDepth(2050).setStroke('#000000', 2);
  const hs = this.teams.filter(t => t.human && this.benchOf(t).length);
  const on = !this.sub && this.canSub() && hs.length > 0;
  if (on) { const s = hs.map(t => (t.human === 1 ? 'X' : 'Q') + ': CAMBI ' + t.code).join('   '); if (this.subHint.text !== T(s)) this.subHint.setText(s); }
  this.subHint.setVisible(on);
};
MatchScene.prototype.openSub = function (t) {
  this.sub = { t, sel: 0, b: 0, wasPaused: this.paused };
  this.paused = true;
  const D = 2600;
  this.subBg = this.add.rectangle(160, 112, 300, 170, 0x05153a, 0.94).setScrollFactor(0).setDepth(D).setStrokeStyle(1, 0x3a7ae0);
  this.subObjs = [];
  this.drawSub();
  SFX.select();
};
MatchScene.prototype.drawSub = function () {
  const S = this.sub, t = S.t, P = TEAMS[t.code], D = 2601;
  this.subObjs.forEach(o => o.destroy()); this.subObjs = [];
  const add = o => (this.subObjs.push(o.setScrollFactor(0).setDepth(D)), o);
  const bench = this.benchOf(t);
  S.b = (S.b + bench.length) % bench.length;
  add(this.add.text(160, 34, `CAMBI - ${P.name}`, UI.f(8, '#ffd23a', true)).setOrigin(0.5));
  add(this.add.text(160, 46, `cambi fatti: ${this.subCount[t.human]}`, UI.f(5, '#9ab8f0')).setOrigin(0.5));
  add(this.add.text(28, 56, 'IN CAMPO', UI.f(6, '#ffffff', true)));
  add(this.add.text(178, 56, 'ENTRA', UI.f(6, '#ffffff', true)));
  const role = i => (P.roles && P.roles[i]) || '';
  t.players.forEach((p, k) => {
    const y = 68 + k * 15, on = k === S.sel;
    if (on) add(this.add.rectangle(88, y + 5, 128, 13, 0x1a5ad8, 1).setStrokeStyle(1, 0xffd23a));
    add(this.add.image(32, y + 5, makeFaceTex(this, t.code, p.ni, 'neutral')).setScale(0.3));
    add(this.add.text(42, y, `${P.nums && P.nums[p.ni] ? '#' + P.nums[p.ni] + ' ' : ''}${p.name}  ${role(p.ni)}`, UI.f(5.5, on ? '#ffd23a' : '#ffffff', true)));
  });
  // chi entra: scorre con ← →
  const j = bench[S.b];
  add(this.add.image(196, 92, makeFaceTex(this, t.code, j, 'neutral')).setScale(0.9));
  add(this.add.text(218, 78, `◄ ${P.nums && P.nums[j] ? '#' + P.nums[j] + ' ' : ''}${this.nameOf(t.code, j)} ►`, UI.f(6, '#ffd23a', true)));
  const tr = playerTraits(t.code, P.names[j], this.women);
  add(this.add.text(218, 90, `${isLiberoRole(role(j)) ? 'LIBERO' : role(j)}  ${tr.cm}cm`, UI.f(5, '#ffffff', true)));
  add(this.add.text(218, 99, `${tr.tag}  ·  ${ATK_STYLES[tr.stile].nome}`, UI.f(4.5, '#7ad0ff', true)));
  add(this.add.text(178, 116, `${bench.length} in panchina`, UI.f(4.5, '#9ab8f0')));
  add(this.add.text(160, 186, '↑↓ chi esce   ← → chi entra   Z: cambio   X / ESC: chiudi', UI.f(5, '#9ab8f0')).setOrigin(0.5));
};
MatchScene.prototype.subInput = function () {
  const S = this.sub, J = Phaser.Input.Keyboard.JustDown, k = S.t.human === 2 ? this.k2 : this.k1;
  const n = S.t.players.length;
  if (J(k.u)) { S.sel = (S.sel + n - 1) % n; this.drawSub(); SFX.blip(); }
  if (J(k.d)) { S.sel = (S.sel + 1) % n; this.drawSub(); SFX.blip(); }
  if (J(k.l)) { S.b--; this.drawSub(); SFX.blip(); }
  if (J(k.r)) { S.b++; this.drawSub(); SFX.blip(); }
  if (J(k.a) || (S.t.human === 1 && J(this.k1b.a))) { this.doSub(S.t, S.t.players[S.sel], this.benchOf(S.t)[S.b]); this.drawSub(); }
  if (J(this.kSub[1]) || J(this.kSub[2]) || J(this.kSub.esc)) this.closeSub();
};
MatchScene.prototype.closeSub = function () {
  this.subObjs.forEach(o => o.destroy()); this.subBg.destroy();
  this.paused = this.sub.wasPaused; this.sub = null;
  for (const n of [1, 2]) this.inp[n] = {};   // i tasti premuti nel pannello non valgono in partita
  SFX.select();
};
// cambio: chi entra prende l'indice della rosa di chi esce (nome, numero, colori, ruolo, statistiche...)
MatchScene.prototype.doSub = function (t, p, j) {
  const P = TEAMS[t.code], i = p.ni;
  for (const key of ['names', 'sks', 'ha', 'shs', 'trs', 'nums', 'roles', 'ages', 'lv', 'fotos']) {
    const a = P[key]; if (!Array.isArray(a) || a.length <= Math.max(i, j)) continue;
    [a[i], a[j]] = [a[j], a[i]];
  }
  [t.pstats[i], t.pstats[j]] = [t.pstats[j], t.pstats[i]];
  if (P._sig !== undefined) P._sig = 'cambi';   // alla prossima partita torna la formazione scelta
  // texture di giocatori e volti da rifare con i nuovi dati
  dropTeamTex(this, t.code);
  for (const q of t.players) makePlayerTex(this, t.code, q.ni);
  for (const q of t.players) { q.name = this.nameOf(t.code, q.ni); q.spr.setTexture(plKey(t.code, q.ni)); if (q.ref) q.ref.setTexture(q.spr.texture.key); }
  if (this.state === 'serve' && this.server && this.server.team === t) {   // il battitore può essere cambiato: batte chi entra
    const s = this.serverOf(t);
    if (s !== this.server) { this.server.x = t.side * this.server.homeD; this.server = s; this.ball.held = s; s.x = t.side * CFG.SERVE_X; }
    this.serveMsg = null;
  }
  this.subCount[t.human]++;
  this.announce(`CAMBIO: ENTRA ${this.nameOf(t.code, i)}, ESCE ${this.nameOf(t.code, j)}`);
  SFX.whistle();
};
