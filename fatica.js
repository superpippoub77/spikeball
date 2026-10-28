// ============================================================
//  STANCHEZZA E ERRORI DEI GIOCATORI
//  - Energia (0-100%) per giocatore della rosa (indice ni): cala a ogni punto giocato e con gli sforzi (corsa,
//    salti, tuffi); chi è in panchina recupera; a ogni set (nuova partita) si riparte riposati. Nel beach il
//    time-out fa recuperare un po' la squadra che lo chiede.
//  - Rendimento: con la stanchezza calano velocità (fino al 18%), salto (fino al 7%) e precisione di ricezione,
//    alzata, attacco e battuta, quindi crescono gli errori.
//  - Errori per giocatore (pstats.err) su azioni giocate (pstats.t_*): palla mandata fuori o in rete, ricezione
//    sbagliata, palla caduta nella sua zona.
//  - A palla ferma, per la squadra di chi gioca: riquadro con barra dell'energia ed errori di ogni giocatore in campo;
//    gli stessi dati (anche per la panchina) nel pannello dei cambi (X / Q), per decidere se e chi sostituire.
// ============================================================
const FAT = { point: 0.4, bench: 1.4, jump: 0.35, dive: 0.9, run: 0.0045, timeout: 6 };

MatchScene.prototype.energyOf = function (t, ni) { t.en = t.en || []; return t.en[ni] === undefined ? 100 : t.en[ni]; };
MatchScene.prototype.tire = function (p, v) {
  const t = p.team; t.en = t.en || [];
  t.en[p.ni] = clamp(this.energyOf(t, p.ni) - v, 0, 100);
};
// stanchezza 0 (riposato) .. 1 (sfinito); l'effetto cresce sotto l'80% di energia
MatchScene.prototype.fatigue = function (p) { return clamp((80 - this.energyOf(p.team, p.ni)) / 80, 0, 1); };
MatchScene.prototype.errRate = function (t, ni) {
  const s = t.pstats && t.pstats[ni]; if (!s) return 0;
  let n = 0; for (const k in s) if (k.startsWith('t_')) n += s[k];
  return n ? Math.round((s.err || 0) / n * 100) : 0;
};

// ---------------- effetti sul gioco ----------------
const _trOfFat = MatchScene.prototype.trOf;
MatchScene.prototype.trOf = function (p) {
  const tr = _trOfFat.call(this, p), F = this.fatigue(p);
  return F > 0 ? Object.assign({}, tr, { spd: tr.spd * (1 - 0.18 * F) }) : tr;
};
const _plKFat = MatchScene.prototype.plK;
MatchScene.prototype.plK = function (p) { return _plKFat.call(this, p) - 0.15 * this.fatigue(p); };   // ricezione e potenza
const _jumpFat = MatchScene.prototype.jump;
MatchScene.prototype.jump = function (p, vx, k) {
  _jumpFat.apply(this, arguments);
  p.vz *= 1 - 0.07 * this.fatigue(p); this.tire(p, FAT.jump);
};
const _diveFat = MatchScene.prototype.startDive;
MatchScene.prototype.startDive = function (p) { _diveFat.apply(this, arguments); this.tire(p, FAT.dive); };
const _moveFat = MatchScene.prototype.movePlayer;
MatchScene.prototype.movePlayer = function (p, dt) {
  const x0 = p.x;
  _moveFat.apply(this, arguments);
  if (p.z <= 0 && this.state === 'rally') this.tire(p, Math.abs(p.x - x0) * FAT.run);
};
for (const [fn, k] of [['doSet', 0.25], ['doSpike', 0.35], ['hitServe', 0.3]]) {
  const orig = MatchScene.prototype[fn];
  MatchScene.prototype[fn] = function (a, b, q) {
    if (fn === 'hitServe') return orig.call(this, a, clamp(b * (1 - k * this.fatigue(a)), 0, 1));   // (s, q)
    return orig.call(this, a, b, clamp(q * (1 - k * this.fatigue(b)), 0, 1));                      // (t, p, q)
  };
}
// ricezione sbagliata = errore
const _doPassFat = MatchScene.prototype.doPass;
MatchScene.prototype.doPass = function (t, p, q, dive) {
  const was = t.mishit;
  _doPassFat.apply(this, arguments);
  if (t.mishit && !was && this.mode !== 'practice') this.stat(p, 'err');
};
// fine dell'azione: errore di chi ha perso il punto, energia di chi era in campo e recupero della panchina
const _endRallyFat = MatchScene.prototype.endRally;
MatchScene.prototype.endRally = function (winner) {
  const b = this.ball, lose = this.other(winner);
  if (this.mode !== 'practice') {
    if (b.lastTeam === lose && b.lastPlayer && b.lastKind !== 'blocktouch') this.stat(b.lastPlayer, 'err');   // fuori, in rete, battuta sbagliata
    else if (lose.plan && lose.plan.p && (lose.plan.kind === 'pass' || lose.plan.kind === 'over')) this.stat(lose.plan.p, 'err');   // palla caduta nella sua zona
  }
  for (const t of this.teams) {
    t.en = t.en || [];
    const onCourt = new Set(t.players.map(q => q.ni));
    for (const q of t.players) this.tire(q, FAT.point);
    for (let i = 0; i < (TEAMS[t.code].names || []).length; i++) if (!onCourt.has(i)) t.en[i] = Math.min(100, this.energyOf(t, i) + FAT.bench);
  }
  return _endRallyFat.apply(this, arguments);
};
// cambi: chi entra porta con sé la sua energia
const _doSubFat = MatchScene.prototype.doSub;
MatchScene.prototype.doSub = function (t, p, j) {
  const i = p.ni; t.en = t.en || [];
  const ei = this.energyOf(t, i), ej = this.energyOf(t, j);
  _doSubFat.apply(this, arguments);
  t.en[i] = ej; t.en[j] = ei;
};
// time-out nel beach: un po' di fiato per chi lo chiede
if (MatchScene.prototype.startTimeout) {
  const _toFat = MatchScene.prototype.startTimeout;
  MatchScene.prototype.startTimeout = function (t) { _toFat.apply(this, arguments); for (const q of t.players) this.tire(q, -FAT.timeout); };
}

// ---------------- barre ----------------
// barra dell'energia: verde, gialla sotto il 65%, rossa sotto il 40%
function fatBar(g, x, y, w, h, e) {
  g.fillStyle(0x000000, 0.6).fillRect(x - 0.5, y - 0.5, w + 1, h + 1);
  g.fillStyle(e >= 65 ? 0x3ad05a : e >= 40 ? 0xf2c818 : 0xe8302a, 1).fillRect(x, y, w * e / 100, h);
}
// a palla ferma: riquadro con la squadra di chi gioca (giocatore 1 a sinistra, 2 a destra)
const _renderFat = MatchScene.prototype.render;
MatchScene.prototype.render = function (dt) {
  _renderFat.apply(this, arguments);
  if (this.mode === 'demo' || this.mode === 'practice') return;
  const show = !this.sub && !this.timeoutFx && typeof this.canSub === 'function' && this.canSub();
  if (!this.fatObjs) this.fatObjs = { g: this.add.graphics().setScrollFactor(0).setDepth(2040), txt: [] };
  const F = this.fatObjs; F.g.clear();
  let k = 0;
  if (show) for (const t of this.teams.filter(q => q.human)) {
    const left = t.human === 1, x0 = left ? 4 : 222, n = t.players.length, y0 = 206 - n * 8;
    F.g.fillStyle(0x05153a, 0.82).fillRoundedRect(x0 - 2, y0 - 9, 96, n * 8 + 10, 3);
    const lab = F.txt[k] || (F.txt[k] = this.add.text(0, 0, '', UI.f(4.2, '#9ab8f0', true)).setScrollFactor(0).setDepth(2041)); k++;
    lab.setPosition(x0, y0 - 8).setText(`${t.code}  ENERGIA   ERRORI`).setVisible(true);
    t.players.forEach((p, r) => {
      const y = y0 + r * 8, e = Math.round(this.energyOf(t, p.ni)), er = this.errRate(t, p.ni);
      const tx = F.txt[k] || (F.txt[k] = this.add.text(0, 0, '', UI.f(4.2, '#ffffff', true)).setScrollFactor(0).setDepth(2041)); k++;
      tx.setPosition(x0, y).setText(String(p.name).slice(0, 9)).setVisible(true);
      fatBar(F.g, x0 + 34, y + 1.5, 32, 3.5, e);
      const t2 = F.txt[k] || (F.txt[k] = this.add.text(0, 0, '', UI.f(4.2, '#ffffff', true)).setScrollFactor(0).setDepth(2041)); k++;
      t2.setPosition(x0 + 69, y).setText(`${e}% ${er}%`).setColor(er >= 30 ? '#ff8a7a' : '#ffffff').setVisible(true);
    });
  }
  for (; k < F.txt.length; k++) F.txt[k].setVisible(false);
};
// pannello dei cambi: energia ed errori di chi è in campo e di chi può entrare
const _drawSubFat = MatchScene.prototype.drawSub;
MatchScene.prototype.drawSub = function () {
  _drawSubFat.apply(this, arguments);
  const S = this.sub, t = S.t, D = 2602, g = this.add.graphics().setScrollFactor(0).setDepth(D);
  this.subObjs.push(g);
  const add = o => (this.subObjs.push(o.setScrollFactor(0).setDepth(D)), o);
  add(this.add.text(118, 56, 'ENERGIA  ERR', UI.f(4.5, '#9ab8f0', true)));
  t.players.forEach((p, r) => {
    const y = 68 + r * 15, e = Math.round(this.energyOf(t, p.ni)), er = this.errRate(t, p.ni);
    fatBar(g, 118, y + 2.5, 22, 4, e);
    add(this.add.text(142, y + 0.5, `${e}% ${er}%`, UI.f(4.5, er >= 30 ? '#ff8a7a' : '#ffffff', true)));
  });
  const bench = this.benchOf(t), j = bench[S.b];
  if (j !== undefined) {
    const e = Math.round(this.energyOf(t, j)), er = this.errRate(t, j);
    add(this.add.text(218, 108, 'ENERGIA', UI.f(4.5, '#9ab8f0', true)));
    fatBar(g, 246, 110, 26, 4, e);
    add(this.add.text(275, 108, `${e}%  ERR ${er}%`, UI.f(4.5, '#ffffff', true)));
  }
};
