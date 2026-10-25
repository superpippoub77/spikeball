// ============================================================
//  FORMAZIONE: chi gioca e in quale posto.
//  - Ogni squadra ha una "rosa" (pool): i giocatori del JSON (squadre.json) oppure i nomi della nazionale.
//  - Per ogni numero di giocatori in campo (2, 3, 4, 6) si può scegliere chi va in ogni posto
//    (schermata 'Formazione'); la scelta resta salvata nel browser (localStorage 'sf91_formazioni').
//  - Senza scelta i titolari si prendono in automatico per ruolo e livello.
//  - applyLineup riscrive le liste della squadra (names, sks, ha, nums, roles, lv...) nell'ordine dei posti:
//    i primi N sono in campo, gli altri in panchina. La partita la chiama prima di disegnare i giocatori.
// ============================================================
// INDICE DEL FILE
//   1. nomi dei posti (POS_NAMES), ruoli adatti a ogni posto (POS_ROLES)
//   2. teamPool: la rosa di una squadra;  autoLineup: titolari automatici
//   3. LINEUPS (salvataggio), applyLineup
//   4. scena Formazione (scelta dei giocatori)
const POS_NAMES = { mb: 'CENTRALE', set: 'ALZATORE', oh: 'ATTACCANTE', def: 'DIFESA / BATTUTA', bk: 'DIFESA', lib: 'LIBERO', bch: 'BEACH' };
// sigle di ruolo adatte a ogni posto, in ordine di preferenza (P alzatore, C centrale, O opposto, S banda, L libero)
const POS_ROLES = { mb: ['C'], set: ['P'], oh: ['O', 'S'], def: ['S', 'O', 'L'], bk: ['S', 'O', 'L'], lib: ['L', 'S'], bch: [] };
const POS_FILL = ['set', 'mb', 'oh', 'def', 'bk', 'lib', 'bch'];   // ordine in cui si riempiono i posti

// rosa della squadra: dal JSON se c'è, altrimenti dalle liste originali (nazionali, squadre beach)
function teamPool(code) {
  const P = TEAMS[code];
  if (!P._base) P._base = { names: P.names.slice(), sks: P.sks && P.sks.slice(), ha: P.ha.slice(), shs: P.shs && P.shs.slice(), trs: P.trs && P.trs.slice(),
                            nums: P.nums && P.nums.slice(), roles: P.roles && P.roles.slice(), ages: P.ages && P.ages.slice(), lv: P.lv && P.lv.slice() };
  if (P._pool) return P._pool;
  const B = P._base;
  if (P._players) {
    const surname = p => asciiUp(p.cognome || p.nome);
    const label = p => P._players.filter(q => surname(q) === surname(p)).length > 1 ? `${asciiUp(p.nome)[0] || ''}.${surname(p)}` : surname(p);
    const H = p => hashStr(asciiUp(p.nome) + asciiUp(p.cognome));
    const nat = !P.club;
    P._pool = P._players.map(p => ({
      label: label(p), sk: p.pelle || (nat ? P.sk : R_SKINS[H(p) % R_SKINS.length]), ha: p.capelli || R_HAIR[H(p) % R_HAIR.length],
      sh: p.maglia || null, tr: p.bordo || null, num: p.numero != null && p.numero !== '' ? String(p.numero) : '',
      role: asciiUp(p.sigla) || p._roles[0], roles: p._roles, age: Number(p.eta) || null, lv: Number(p.livello) || 5
    }));
  } else {
    P._pool = B.names.map((n, i) => ({
      label: n, sk: (B.sks && B.sks[i]) || P.sk, ha: B.ha[i % B.ha.length], sh: (B.shs && B.shs[i]) || null, tr: (B.trs && B.trs[i]) || null,
      num: B.nums ? B.nums[i] : '', role: B.roles ? B.roles[i] : '', roles: [], age: B.ages ? B.ages[i] : null, lv: B.lv ? B.lv[i] : null
    }));
  }
  return P._pool;
}

// titolari automatici: per ogni posto chi ha quel ruolo come principale, poi il ruolo adatto, poi il livello
function autoLineup(code, n) {
  const pool = teamPool(code), F = FORMATIONS[n], out = new Array(n);
  if (!pool[0] || !pool[0].roles.length) return F.map((_, i) => i % pool.length);   // senza ruoli: in ordine
  const left = pool.map((_, i) => i), lv = i => pool[i].lv || 0;
  for (const pos of POS_FILL) F.forEach((f, s) => {
    if (f.pos !== pos || out[s] !== undefined || !left.length) return;
    const want = POS_ROLES[pos];
    const score = i => { const r = pool[i].roles, k = want.indexOf(r[0]); return k >= 0 ? k : want.some(w => r.includes(w)) ? 10 : 20; };
    left.sort((a, b) => score(a) - score(b) || lv(b) - lv(a));
    out[s] = left.shift();
  });
  return out.map((v, i) => v === undefined ? i % pool.length : v);
}

// formazioni scelte: { codice: { n: [etichette dei giocatori nell'ordine dei posti] } }
const LINEUPS = (() => { try { return JSON.parse(localStorage.getItem('sf91_formazioni')) || {}; } catch (e) { return {}; } })();
function saveLineups() { try { localStorage.setItem('sf91_formazioni', JSON.stringify(LINEUPS)); } catch (e) { /* */ } }

// indici della rosa in campo per n giocatori (scelta salvata se ancora valida, altrimenti automatica)
function lineupOf(code, n) {
  const pool = teamPool(code), saved = LINEUPS[code] && LINEUPS[code][n];
  if (saved) {
    const idx = saved.map(l => pool.findIndex(p => p.label === l));
    if (idx.length === n && idx.every(i => i >= 0) && new Set(idx).size === n) return idx;
  }
  return autoLineup(code, n);
}

// riscrive le liste della squadra: i primi n sono i titolari nell'ordine dei posti, poi la panchina
// nome femminile di un giocatore della rosa (versione femminile): legato al suo posto nella rosa, non al posto in campo
function femLabel(code, label) { const k = teamPool(code).findIndex(p => p.label === label); return femName(code, Math.max(0, k)); }

function applyLineup(scene, code, n) {
  const P = TEAMS[code], pool = teamPool(code), on = lineupOf(code, n);
  const order = on.concat(pool.map((_, i) => i).filter(i => !on.includes(i)));
  const sig = order.join(',');
  if (P._sig === sig) return;
  const L = order.map(i => pool[i]);
  P.names = L.map(p => p.label); P.sks = L.map(p => p.sk); P.ha = L.map(p => p.ha);
  P.shs = L.map(p => p.sh); P.trs = L.map(p => p.tr); P.nums = L.map(p => p.num);
  P.fotos = L.map(p => p.foto || null);   // foto dei giocatori creati (ritratto, myplayer.js)
  P.roles = L.map(p => p.role); P.ages = L.map(p => p.age);
  if (pool.some(p => p.lv)) P.lv = L.map(p => p.lv || 5); else delete P.lv;
  if (!pool.some(p => p.num)) delete P.nums;
  if (P._sig !== undefined && scene) dropTeamTex(scene, code);   // volti e giocatori vanno ridisegnati
  P._sig = sig;
}

// ---------------- SCENA: scelta della formazione ----------------
// dati: { code, n, back: nome della scena a cui tornare, backData }
// ↑↓ posto   ← → cambia giocatore (scambio se è già in campo)   A: automatica   Z/ESC: conferma
class FormazioneScene extends Base {
  constructor() { super('Formazione'); }
  init(d) { this.d = d; }
  create() {
    camSetup(this); makeCommon(this); this.keysInit(); UI.bg(this); setLook(this, !!this.d.beach, !!this.d.women);
    this.ka = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    const { code, n } = this.d;
    this.pool = teamPool(code); this.on = lineupOf(code, n).slice(); this.F = FORMATIONS[n];
    this.add.image(26, 18, makeFlagTex(this, code, 30, 20));
    this.add.text(48, 8, `FORMAZIONE - ${TEAMS[code].name}`, UI.f(7, '#ffd23a', true));
    this.add.text(48, 20, `${n} giocatori in campo${this.d.beach ? ' (beach volley)' : ''}  ·  rosa di ${this.pool.length}`, UI.f(5, '#9ab8f0'));
    UI.panel(this, 6, 34, 172, 168, 'IN CAMPO'); UI.panel(this, 184, 34, 130, 168, 'ROSA');
    this.add.text(160, 212, '↑↓ posto   ← → cambia giocatore   A: automatica   Z / ESC: conferma', UI.f(5, '#9ab8f0')).setOrigin(0.5);
    this.dyn = []; this.sel = 0; this.draw();
  }
  draw() {
    const code = this.d.code;
    this.dyn.forEach(o => o.destroy()); this.dyn = [];
    const D = o => (this.dyn.push(o), o), rh = Math.min(26, 152 / this.F.length);
    this.F.forEach((f, s) => {
      const y = 48 + s * rh, p = this.pool[this.on[s]], cur = s === this.sel;
      const g = D(this.add.graphics());
      g.fillStyle(cur ? 0x1a5ad8 : 0x0e2a6a, 1).fillRect(10, y - 2, 164, rh - 3);
      if (cur) g.lineStyle(1, 0xffd23a).strokeRect(10.5, y - 1.5, 163, rh - 4);
      D(this.add.text(14, y, this.d.beach ? `GIOCATORE ${s + 1}` : POS_NAMES[f.pos], UI.f(4.5, '#7ad0ff', true)));
      D(this.add.text(14, y + 7, `${cur ? '◄ ' : ''}${p.num ? '#' + p.num + ' ' : ''}${this.d.women ? femLabel(code, p.label) : p.label}${cur ? ' ►' : ''}`, UI.f(rh > 20 ? 7 : 6, '#ffffff', true)));
      const tr = playerTraits(code, p.label, this.d.women);   // altezza e specialità
      D(this.add.text(170, y + 1, [p.role, p.lv ? 'LV ' + p.lv : '', p.age ? p.age + 'a' : '', tr.cm + 'cm'].filter(Boolean).join('  '), UI.f(4.5, '#ffd23a', true)).setOrigin(1, 0));
      D(this.add.text(170, y + 8, tr.tag, UI.f(4.2, '#7ad0ff', true)).setOrigin(1, 0));
    });
    const max = 26, first = Math.max(0, Math.min(this.on[this.sel] - 12, this.pool.length - max));
    this.pool.slice(first, first + max).forEach((p, k) => {
      const i = first + k, slot = this.on.indexOf(i);
      D(this.add.text(188, 47 + k * 5.6, `${slot >= 0 ? '●' : '○'} ${p.num ? '#' + p.num + ' ' : ''}${this.d.women ? femLabel(this.d.code, p.label) : p.label}  ${p.role || ''}`,
        UI.f(4.2, i === this.on[this.sel] ? '#ffd23a' : slot >= 0 ? '#ffffff' : '#8aa0c8', slot >= 0)));
    });
  }
  update() {
    if (this.gone) return;
    const n = this.F.length, P = this.pool.length;
    if (this.jd('up')) { this.sel = (this.sel + n - 1) % n; SFX.blip(); this.draw(); }
    if (this.jd('down')) { this.sel = (this.sel + 1) % n; SFX.blip(); this.draw(); }
    const dx = this.jd('left') ? -1 : this.jd('right') ? 1 : 0;
    if (dx && P > 1) {
      // giocatore successivo della rosa; se è già in campo i due si scambiano il posto
      const nx = (this.on[this.sel] + dx + P) % P, other = this.on.indexOf(nx);
      if (other >= 0) this.on[other] = this.on[this.sel];
      this.on[this.sel] = nx; SFX.blip(); this.draw();
    }
    if (Phaser.Input.Keyboard.JustDown(this.ka)) { this.on = autoLineup(this.d.code, n); SFX.select(); this.draw(); }
    if (this.btn() || this.startPressed() || this.jd('esc')) {
      this.gone = true; SFX.select();
      const { code } = this.d;
      (LINEUPS[code] = LINEUPS[code] || {})[n] = this.on.map(i => this.pool[i].label);
      saveLineups(); applyLineup(this, code, n);
      this.scene.start(this.d.back, this.d.backData);
    }
  }
}
