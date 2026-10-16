// ============================================================
//  IL MIO GIOCATORE: una scheda personale (nome, numero, ruolo, età, aspetto, squadra)
//  e statistiche che crescono partita dopo partita in base a quello che il giocatore fa davvero:
//    schiacciate -> ATTACCO, ricezioni/difese -> DIFESA, muri -> MURO, battute e ace -> BATTUTA, alzate -> ALZATA.
//  Il livello (1-10) è la media delle statistiche e in partita rende il giocatore più forte (match.js -> plK).
//  Il giocatore entra nella rosa della sua squadra e va sempre in campo (lineup.js), in ogni modalità:
//  partita singola, beach volley, campionati, arcade.
//  Salvataggio nel browser: localStorage 'sf91_mio_giocatore'.
// ============================================================
// INDICE DEL FILE
//   1. MYP: dati, livello, voce della rosa (myEntry)
//   2. inserimento nella rosa e in formazione (teamPool / lineupOf estese)
//   3. crescita a fine partita (myPlayerAfterMatch, agganciata a MatchScene.startEnd)
//   4. scena MyPlayer: scheda e modifica
const MY_ROLES = [['P', 'ALZATORE'], ['C', 'CENTRALE'], ['O', 'OPPOSTO'], ['S', 'SCHIACCIATORE'], ['L', 'LIBERO']];
const MY_STATS = [['att', 'ATTACCO'], ['dif', 'DIFESA'], ['muro', 'MURO'], ['batt', 'BATTUTA'], ['alz', 'ALZATA']];
// statistiche di partenza per ruolo (0-100)
// (72 di media = livello 4,6: un buon giocatore che deve ancora crescere)
const MY_BASE = { P: { alz: 82, dif: 74 }, C: { muro: 82, att: 78 }, O: { att: 82, muro: 76 }, S: { att: 80, dif: 78 }, L: { dif: 84, alz: 76 } };

const MYP = {
  data: null,
  load() { try { this.data = JSON.parse(localStorage.getItem('sf91_mio_giocatore')); } catch (e) { this.data = null; } return this.data; },
  save() { try { localStorage.setItem('sf91_mio_giocatore', JSON.stringify(this.data)); } catch (e) { /* */ } },
  fresh() {
    return { nome: 'MARIO', cognome: 'ROSSI', numero: 10, ruolo: 'S', eta: 20, pelle: 1, capelli: 1, team: 'ITA',
             st: this.baseStats('S'), xp: 0, partite: 0, vinte: 0, tot: { pts: 0, spike: 0, block: 0, ace: 0, lob: 0 } };
  },
  baseStats(r) { const b = MY_BASE[r] || {}; const o = {}; MY_STATS.forEach(([k]) => { o[k] = b[k] || 68; }); return o; },
  // livello 1-10 dalla media delle statistiche (inverso di lvToStat in roster.js)
  level(d = this.data) { const v = MY_STATS.map(([k]) => d.st[k]); return clamp(Math.round(((v.reduce((a, x) => a + x, 0) / v.length) - 40) / 7 * 10) / 10, 1, 10); },
  label(d = this.data) { return asciiUp(d.cognome || d.nome) || 'IO'; },
  // le squadre tengono in cache rosa e formazione: vanno ricalcolate quando la scheda cambia
  dirty(code) { const P = code && TEAMS[code]; if (P) { P._pool = null; if (P._sig !== undefined) P._sig = 'da rifare'; } }
};
MYP.load();

// voce della rosa per il mio giocatore (stessa forma delle altre voci di teamPool)
function myEntry() {
  const d = MYP.data;
  return { label: MYP.label(), sk: R_SKINS[d.pelle % R_SKINS.length], ha: R_HAIR[d.capelli % R_HAIR.length], sh: null, tr: null,
           num: String(d.numero), role: d.ruolo, roles: [d.ruolo], age: d.eta, lv: MYP.level(), me: true };
}

// ---------------- nella rosa e sempre in campo ----------------
const _teamPoolMy = teamPool;
teamPool = function (code) {
  const P = TEAMS[code], had = !!P._pool, pool = _teamPoolMy(code);
  if (!had && MYP.data && MYP.data.team === code) {
    const e = myEntry();
    if (pool.some(p => p.label === e.label)) e.label = `${asciiUp(MYP.data.nome)[0] || ''}.${e.label}`;
    pool.push(e);
  }
  return pool;
};
const _lineupOfMy = lineupOf;
lineupOf = function (code, n) {
  const on = _lineupOfMy(code, n), pool = teamPool(code), mi = pool.findIndex(p => p.me);
  if (mi < 0 || on.includes(mi)) return on;
  // entra nel posto adatto al suo ruolo (o in uno qualsiasi tranne l'alzatore)
  const F = FORMATIONS[n], r = MYP.data.ruolo;
  let s = F.findIndex(f => (POS_ROLES[f.pos] || []).includes(r));
  if (s < 0) s = F.findIndex(f => f.pos !== 'set');
  const o = on.slice(); o[Math.max(0, s)] = mi; return o;
};

// ---------------- crescita a fine partita ----------------
// ogni gesto fatto in partita fa crescere la statistica collegata (sempre più piano man mano che si avvicina a 99)
function myPlayerAfterMatch(m) {
  const d = MYP.data; if (!d) return null;
  const t = m.teams.find(x => x.code === d.team); if (!t) return null;
  const label = teamPool(d.team).find(p => p.me);
  const ni = label ? t.pal.names.indexOf(label.label) : -1;
  if (ni < 0 || ni >= t.players.length) return null;
  const s = t.pstats[ni] || {}, n = k => s[k] || 0;
  const before = MYP.level();
  const grow = (k, x) => { if (x <= 0) return; d.st[k] = clamp(d.st[k] + Math.min(3, 0.4 + x * 0.15) * (99 - d.st[k]) / 30, 0, 99); };
  grow('att', n('t_spike') + n('spike') * 1.5);
  grow('dif', n('t_pass') + n('t_over') * 0.5);
  grow('muro', n('t_block') + n('block') * 2);
  grow('batt', n('t_serve') * 0.4 + n('ace') * 2);
  grow('alz', n('t_set'));
  const won = m.winner === t;
  if (won) MY_STATS.forEach(([k]) => { d.st[k] = clamp(d.st[k] + 0.3 * (99 - d.st[k]) / 50, 0, 99); });
  const xp = 20 + n('pts') * 5 + (won ? 30 : 0);
  d.xp += xp; d.partite++; if (won) d.vinte++;
  for (const k of Object.keys(d.tot)) d.tot[k] += n(k);
  MYP.save(); MYP.dirty(d.team);
  return { xp, before, after: MYP.level(), name: label.label };
}
const _startEndMy = MatchScene.prototype.startEnd;
MatchScene.prototype.startEnd = function () {
  _startEndMy.call(this);
  if (this.mode === 'demo' || this.mode === 'practice') return;
  const r = myPlayerAfterMatch(this);
  if (!r) return;
  const up = r.after > r.before;
  this.add.text(160, 196, `★ ${r.name}  +${r.xp} XP   LIVELLO ${r.before.toFixed(1)} → ${r.after.toFixed(1)}${up ? '  ▲' : ''}`, UI.f(6, up ? '#ffd23a' : '#ffffff', true))
    .setOrigin(0.5).setScrollFactor(0).setDepth(2400).setStroke('#0a1a4a', 3);
};

// ---------------- SCENA: la scheda del mio giocatore ----------------
// ↑↓ voce   ← → cambia   lettere: scrivi nome/cognome (CANC per cancellare)   INVIO: salva   ESC: indietro (salva)
class MyPlayerScene extends Base {
  constructor() { super('MyPlayer'); }
  create() {
    camSetup(this); makeCommon(this); this.keysInit(); setLook(this, false); UI.bg(this);
    if (!MYP.data) MYP.data = MYP.fresh();
    this.d = JSON.parse(JSON.stringify(MYP.data)); this.oldTeam = this.d.team;
    this.teams = [...new Set([...GROUPS.flat(), ...BEACH_TEAMS])].filter(c => TEAMS[c]);
    if (!this.teams.includes(this.d.team)) this.d.team = this.teams[0];
    this.rows = [['nome', 'NOME'], ['cognome', 'COGNOME'], ['numero', 'NUMERO'], ['ruolo', 'RUOLO'], ['eta', 'ETÀ'],
                 ['pelle', 'PELLE'], ['capelli', 'CAPELLI'], ['team', 'SQUADRA'], ['save', 'SALVA']];
    this.add.text(160, 8, 'IL MIO GIOCATORE', UI.f(9, '#ffd23a', true)).setOrigin(0.5);
    UI.panel(this, 6, 22, 150, 180, null); UI.panel(this, 162, 22, 152, 180, 'SCHEDA');
    this.add.text(160, 212, '↑↓ voce   ← → cambia   scrivi il nome con la tastiera   INVIO: salva   ESC: indietro', UI.f(4.6, '#9ab8f0')).setOrigin(0.5);
    this.rowT = this.rows.map((r, i) => [this.add.text(168, 38 + i * 14, r[1], UI.f(5.5, '#9ab8f0')), this.add.text(308, 38 + i * 14, '', UI.f(6.5, '#ffffff', true)).setOrigin(1, 0)]);
    this.sel = 0; this.dyn = [];
    this.input.keyboard.on('keydown', e => this.typed(e));
    this.refresh();
  }
  // nome e cognome si scrivono direttamente
  typed(e) {
    const k = this.rows[this.sel][0];
    if (this.gone || (k !== 'nome' && k !== 'cognome')) return;
    if (/^[a-zA-Z' ]$/.test(e.key) && this.d[k].length < 12) this.d[k] += e.key.toUpperCase();
    else if (e.key === 'Backspace' || e.key === 'Delete') this.d[k] = this.d[k].slice(0, -1);
    else return;
    SFX.blip(); this.refresh();
  }
  val(k) {
    const d = this.d;
    if (k === 'nome' || k === 'cognome') return (d[k] || '') + (this.rows[this.sel][0] === k && Math.floor(this.time.now / 400) % 2 ? '_' : ' ');
    if (k === 'ruolo') return MY_ROLES.find(r => r[0] === d.ruolo)[1];
    if (k === 'pelle' || k === 'capelli') return '◄ ■ ►';
    if (k === 'team') return TEAMS[d.team].name;
    if (k === 'save') return '►';
    return String(d[k]);
  }
  refresh() {
    const d = this.d;
    this.rows.forEach((r, i) => { const on = i === this.sel; this.rowT[i][0].setColor(on ? '#ffd23a' : '#9ab8f0'); this.rowT[i][1].setText(this.val(r[0])).setColor(on ? '#ffd23a' : '#ffffff'); });
    this.rowT[5][1].setColor(R_SKINS[d.pelle % R_SKINS.length]); this.rowT[6][1].setColor(R_HAIR[d.capelli % R_HAIR.length]);
    // anteprima: giocatore con i colori della squadra scelta
    const T = TEAMS[d.team];
    TEAMS._ME = { name: T.name, sh: T.sh, tr: T.tr, so: T.so, sk: R_SKINS[d.pelle % R_SKINS.length], ha: [R_HAIR[d.capelli % R_HAIR.length]], names: [MYP.label(d)],
                  sks: [R_SKINS[d.pelle % R_SKINS.length]], nums: [String(d.numero)], fl: T.fl };
    this.dyn.forEach(o => o.destroy()); this.dyn = [];
    dropTeamTex(this, '_ME'); if (this.textures.exists('ph__ME')) this.textures.remove('ph__ME');
    const D = o => (this.dyn.push(o), o);
    makePlayerTex(this, '_ME', 0);
    D(this.add.ellipse(46, 134, 34, 6, 0x000000, 0.3));
    D(this.add.sprite(46, 134, plKey('_ME', 0), PF.idle).setOrigin(0.5, 1).setScale(2.1));
    D(this.add.image(116, 52, makeFaceTex(this, '_ME', 0, 'neutral')).setScale(1.05));
    D(this.add.image(116, 86, makeFlagTex(this, d.team, 30, 20)));
    D(this.add.text(116, 98, `#${d.numero}  ${MY_ROLES.find(r => r[0] === d.ruolo)[1]}`, UI.f(5, '#ffd23a', true)).setOrigin(0.5, 0));
    const lv = MYP.level(d);
    D(this.add.text(116, 108, `LIVELLO ${lv.toFixed(1)}`, UI.f(7, '#ffffff', true)).setOrigin(0.5, 0));
    // statistiche
    const g = D(this.add.graphics());
    MY_STATS.forEach(([k, lab], i) => {
      const y = 146 + i * 10, v = Math.round(d.st[k]);
      D(this.add.text(12, y - 1, lab, UI.f(4.6, '#9ab8f0', true)));
      g.fillStyle(0x0a1530, 1).fillRect(52, y, 70, 5);
      g.fillStyle(v >= 80 ? 0xf07a20 : v >= 65 ? 0xf2c818 : 0x5ab0f0, 1).fillRect(52, y, 70 * v / 100, 5);
      D(this.add.text(150, y - 1, String(v), UI.f(5.5, '#ffffff', true)).setOrigin(1, 0));
    });
    D(this.add.text(81, 196, `${d.partite} partite · ${d.vinte} vinte · ${d.tot.pts} punti · ${d.tot.ace} ace · ${d.tot.block} muri · ${d.xp} XP`, UI.f(4.2, '#7ad0ff')).setOrigin(0.5, 1));
  }
  change(dx) {
    const d = this.d, k = this.rows[this.sel][0];
    if (k === 'numero') d.numero = (d.numero - 1 + dx + 99) % 99 + 1;
    else if (k === 'eta') d.eta = clamp(d.eta + dx, 14, 60);
    else if (k === 'pelle') d.pelle = (d.pelle + dx + R_SKINS.length) % R_SKINS.length;
    else if (k === 'capelli') d.capelli = (d.capelli + dx + R_HAIR.length) % R_HAIR.length;
    else if (k === 'ruolo') {
      const i = MY_ROLES.findIndex(r => r[0] === d.ruolo), nr = MY_ROLES[(i + dx + MY_ROLES.length) % MY_ROLES.length][0];
      if (d.partite === 0) d.st = MYP.baseStats(nr);   // prima di giocare il ruolo decide le statistiche di partenza
      d.ruolo = nr;
    } else if (k === 'team') { const i = this.teams.indexOf(d.team); d.team = this.teams[(i + dx + this.teams.length) % this.teams.length]; }
    else return;
    SFX.blip(); this.refresh();
  }
  saveAndExit() {
    this.gone = true; SFX.select();
    if (!this.d.nome && !this.d.cognome) this.d.cognome = 'IO';
    MYP.data = this.d; MYP.save(); MYP.dirty(this.oldTeam); MYP.dirty(this.d.team);
    this.scene.start('MainMenu');
  }
  update() {
    if (this.gone) return;
    const n = this.rows.length;
    if (this.jd('up')) { this.sel = (this.sel + n - 1) % n; this.refresh(); SFX.blip(); }
    if (this.jd('down')) { this.sel = (this.sel + 1) % n; this.refresh(); SFX.blip(); }
    if (this.jd('left')) this.change(-1);
    if (this.jd('right')) this.change(1);
    const k = this.rows[this.sel][0], text = k === 'nome' || k === 'cognome';
    if (this.jd('esc') || this.jd('en') || (!text && k === 'save' && this.btn())) { this.saveAndExit(); return; }
    if (text && Math.floor(this.time.now / 400) !== this._blink) { this._blink = Math.floor(this.time.now / 400); this.rowT[this.sel][1].setText(this.val(k)); }
  }
}
