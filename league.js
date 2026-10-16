// ============================================================
//  CAMPIONATI da campionati.json
//  Ogni campionato ha squadre e giornate (gara, data, ora, impianto, casa, ospite,
//  eventuale risultato reale con parziali). Le squadre presenti in squadre.json
//  giocano con i loro giocatori; le altre vengono create in automatico (sempre uguali).
//  Giochi le tue gare, le altre della giornata sono simulate; classifica FIPAV.
//  I progressi restano salvati nel browser.
// ============================================================
// INDICE DEL FILE
//   1. caricamento di campionati.json
//   2. squadre generate (nomi, numeri, ruoli, colori) per chi non è in squadre.json; leagueTeams collega nome -> codice
//   3. stato salvato nel browser, risultati (reali o giocati), classifica FIPAV, simulazione delle gare
//   4. partita della propria squadra giocata a set (startLeagueSet)
//   5. scene: Leagues (scelta), LeagueTeam, LeagueHub (classifica/risultati/calendario), LeagueSet (tra i set)
const LEAGUES = { list: [], source: null, errors: [] };

async function loadLeagues() {
  let data = null, src = null;
  try { const s = localStorage.getItem('sf91_campionati'); if (s) { data = JSON.parse(s); src = 'file trascinato'; } } catch (e) { /* */ }
  if (!data) {
    try { const r = await fetch('campionati.json', { cache: 'no-store' }); if (r.ok) { data = await r.json(); src = 'campionati.json'; } }
    catch (e) { /* file:// o file assente: si può trascinare il file sulla finestra */ }
  }
  const list = data && (Array.isArray(data) ? data : data.campionati);
  if (!Array.isArray(list)) return;
  LEAGUES.source = src;
  list.forEach((c, i) => {
    if (!c || !Array.isArray(c.giornate) || !c.giornate.length) { LEAGUES.errors.push(`campionato ${i + 1}: mancano le giornate`); return; }
    c.id = String(c.id || c.nome || 'camp' + i);
    c.nome = c.nome || c.id;
    if (!Array.isArray(c.squadre) || !c.squadre.length) {   // squadre ricavate dal calendario
      const s = [];
      c.giornate.forEach(g => (g.gare || []).forEach(x => [x.casa, x.ospite].forEach(n => { if (n && !s.includes(n)) s.push(n); })));
      c.squadre = s.map(nome => ({ nome }));
    }
    c.squadre = c.squadre.map(s => typeof s === 'string' ? { nome: s } : s);
    LEAGUES.list.push(c);
  });
}
const _startGameLeague = startGame;
startGame = function () { loadLeagues().finally(_startGameLeague); };

// ---------------- squadre generate ----------------
const GEN_FIRST = ['Marco', 'Luca', 'Andrea', 'Matteo', 'Davide', 'Simone', 'Federico', 'Alessandro', 'Lorenzo', 'Riccardo', 'Stefano', 'Paolo',
  'Giorgio', 'Nicola', 'Fabio', 'Michele', 'Giacomo', 'Tommaso', 'Filippo', 'Edoardo', 'Gabriele', 'Pietro', 'Enrico', 'Emanuele', 'Daniele',
  'Alberto', 'Mattia', 'Samuele', 'Leonardo', 'Francesco', 'Roberto', 'Claudio', 'Massimo', 'Diego', 'Elia', 'Jacopo', 'Ivan', 'Omar', 'Sergio', 'Walter'];
const GEN_LAST = ['Rossi', 'Ferrari', 'Bianchi', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'Costa', 'Giordano', 'Mancini',
  'Rizzo', 'Lombardi', 'Moretti', 'Barbieri', 'Fontana', 'Santoro', 'Mariani', 'Rinaldi', 'Caruso', 'Ferrara', 'Galli', 'Martini', 'Leone',
  'Longo', 'Gentile', 'Martinelli', 'Vitale', 'Serra', 'Coppola', 'Testa', 'Pellegrini', 'Bellini', 'Guerra', 'Sala', 'Ferri', 'Villa', 'Grassi',
  'Bertolini', 'Zanetti', 'Ferraris', 'Pozzi', 'Ghisio', 'Cerutti', 'Carrara', 'Bonetti', 'Airoldi', 'Fumagalli', 'Brambilla', 'Crespi', 'Re', 'Sacchi'];
const GEN_KITS = [['#c81e2a', '#ffffff', '#1a1a1a'], ['#1a4fb8', '#ffffff', '#1a2a60'], ['#f2c818', '#1a3a8a', '#1a3a8a'], ['#1e8a3a', '#ffffff', '#ffffff'],
  ['#f07a1a', '#1a1a1a', '#1a1a1a'], ['#6a2a9a', '#f2c818', '#1a1a1a'], ['#f4f4f4', '#c81e2a', '#c81e2a'], ['#0a8a9a', '#ffffff', '#0a3a4a'],
  ['#8a1a2a', '#f2c818', '#f4f4f4'], ['#1a1a1a', '#f2c818', '#1a1a1a'], ['#9ad0f0', '#1a2a60', '#1a2a60'], ['#e04a8a', '#ffffff', '#1a1a1a']];
const GEN_STOP = new Set(['A', 'S', 'D', 'ASD', 'SSD', 'US', 'GS', 'G', 'VOLLEY', 'PALLAVOLO', 'TEAM', 'DIV', 'SPB', 'IMPRESA', 'COSTRUZIONE', 'CLUB', 'POLISPORTIVA', 'SPORT', 'SC', 'AS']);

function leagueCode(nome) {
  const words = asciiUp(nome).split(/[\s.\-']+/).filter(Boolean);
  const cands = [];
  for (const w of words) if (/^[A-Z]{3,}$/.test(w) && !GEN_STOP.has(w)) cands.push(w.slice(0, 3));
  for (const w of words) if (/^[A-Z]{3,}$/.test(w)) cands.push(w.slice(0, 3));
  const letters = words.join('').replace(/[^A-Z]/g, '');
  cands.push(letters.slice(0, 3));
  for (const c of cands) if (c.length === 3 && !TEAMS[c]) return c;
  for (let k = 2; k < 99; k++) { const c = letters.slice(0, 2) + k; if (!TEAMS[c]) return c.slice(0, 3); }
  return 'X' + Math.floor(Math.random() * 99);
}

// squadra generata: sempre uguale per lo stesso nome (numeri casuali con seme = nome)
function genTeam(nome) {
  const R = seeded(hashStr('lega:' + asciiUp(nome)));
  const kit = GEN_KITS[Math.floor(R() * GEN_KITS.length)];
  const base = 4.6 + R() * 1.8;   // forza media della squadra (livello 1-10)
  const roles = [['Alzatore', 'P'], ['Alzatore', 'P'], ['Centrale', 'C1'], ['Centrale', 'C2'], ['Centrale', 'C1'], ['Opposto', 'O'], ['Opposto', 'O'],
    ['Banda', 'S1'], ['Banda', 'S1'], ['Banda', 'S2'], ['Banda', 'S2'], ['Libero', 'L1']];
  const used = new Set(), nums = new Set();
  const giocatori = roles.map(([ruolo, sigla]) => {
    let nm; do { nm = GEN_FIRST[Math.floor(R() * GEN_FIRST.length)] + '|' + GEN_LAST[Math.floor(R() * GEN_LAST.length)]; } while (used.has(nm)); used.add(nm);
    let n; do { n = 1 + Math.floor(R() * 24); } while (nums.has(n)); nums.add(n);
    const [nome1, cognome] = nm.split('|');
    return { nome: nome1, cognome, numero: n, ruolo, sigla, eta: 18 + Math.floor(R() * 17), livello: clamp(Math.round(base + (R() - 0.5) * 2.4), 3, 8) };
  });
  return { codice: leagueCode(nome), nome, tipo: 'club', colori: { maglia: kit[0], bordo: kit[1], pantaloncini: kit[2] }, giocatori };
}

// nome della squadra del calendario -> codice (squadre.json se c'è, altrimenti generata)
function leagueTeams(lg) {
  if (lg._codes) return lg._codes;
  const map = {};
  for (const s of lg.squadre) {
    const up = asciiUp(s.nome);
    let code = s.codice && TEAMS[asciiUp(s.codice)] ? asciiUp(s.codice) : null;
    if (!code) code = Object.keys(TEAMS).find(c => TEAMS[c].club && TEAMS[c].name === up) || null;
    if (code) { if (s.logo && !TEAMS[code].logo) TEAMS[code].logo = s.logo; map[s.nome] = { code, real: !TEAMS[code].generated }; continue; }
    const sq = genTeam(s.nome), errs = ROSTER.errors.length;
    if (s.logo) sq.logo = s.logo;
    if (s.colori) sq.colori = s.colori;
    code = rosterTeam(sq, 0);
    ROSTER.errors.length = errs;   // le squadre generate non danno avvisi nel menu
    if (code) { TEAMS[code].generated = true; map[s.nome] = { code, real: false }; }
  }
  return (lg._codes = map);
}

// ---------------- stato salvato ----------------
function leagueLoad(lg) {
  let st = null;
  try { st = JSON.parse(localStorage.getItem('sf91_lega_' + lg.id) || 'null'); } catch (e) { /* */ }
  return st || { team: null, results: {}, sets: Number(lg.set) || 3 };
}
function leagueSave(lg, st) { try { localStorage.setItem('sf91_lega_' + lg.id, JSON.stringify(st)); } catch (e) { /* */ } }

const garaId = (g, gi, k) => String(g.gara || `${gi}-${k}`);
// risultato di una gara: reale dal calendario oppure giocato/simulato
function garaResult(lg, st, g, id) {
  if (Array.isArray(g.risultato) && g.risultato.length === 2) {
    const p = (g.parziali || []).map(x => String(x).split(/[\/\-]/).map(Number)).filter(x => x.length === 2 && !isNaN(x[0]));
    return { h: g.risultato[0], a: g.risultato[1], parz: p, real: true };
  }
  return st.results[id] || null;
}
function allGare(lg) {
  const out = [];
  lg.giornate.forEach((gg, gi) => (gg.gare || []).forEach((g, k) => out.push({ g, gi, num: gg.numero || gi + 1, id: garaId(g, gi, k) })));
  return out;
}

// punti FIPAV: vittoria netta 3-0, al tie-break (set decisivo) 2-1
function matchPoints(h, a) {
  const tie = Math.min(h, a) > 0 && Math.abs(h - a) === 1 && Math.max(h, a) >= 2;
  if (h > a) return tie ? [2, 1] : [3, 0];
  return tie ? [1, 2] : [0, 3];
}

// classifica: punti, vittorie, quoziente set, quoziente punti (ordine FIPAV)
function standings(lg, st) {
  const T = {};
  for (const s of lg.squadre) T[s.nome] = { nome: s.nome, pt: 0, g: 0, v: 0, p: 0, sv: 0, sp: 0, pf: 0, ps: 0 };
  for (const { g, id } of allGare(lg)) {
    const r = garaResult(lg, st, g, id); if (!r) continue;
    const H = T[g.casa], A = T[g.ospite]; if (!H || !A) continue;
    const [ph, pa] = matchPoints(r.h, r.a);
    H.pt += ph; A.pt += pa; H.g++; A.g++;
    if (r.h > r.a) { H.v++; A.p++; } else { A.v++; H.p++; }
    H.sv += r.h; H.sp += r.a; A.sv += r.a; A.sp += r.h;
    for (const [x, y] of r.parz || []) { H.pf += x; H.ps += y; A.pf += y; A.ps += x; }
  }
  const q = (a, b) => b ? a / b : (a ? 99 : 0);
  return Object.values(T).sort((a, b) => b.pt - a.pt || b.v - a.v || q(b.sv, b.sp) - q(a.sv, a.sp) || q(b.pf, b.ps) - q(a.pf, a.ps));
}

// ---------------- simulazione ----------------
function teamPower(code) { const s = statsOf(code); return (s[0] + s[1] + s[2]) / 3; }
function simSetScore(win, tb) {
  const to = tb ? 15 : 25;
  if (Math.random() < 0.14) { const l = to - 1 + Math.floor(Math.random() * 4); return [l + 2, l]; }   // ai vantaggi
  return [to, to - 2 - Math.floor(Math.random() * (tb ? 8 : 12))];
}
// simula una gara: probabilità di vincere il set dalla differenza di forza (+3% in casa)
function simMatch(hc, ac, sets) {
  const need = Math.ceil(sets / 2), p = clamp(0.5 + (teamPower(hc) - teamPower(ac)) / 40 + 0.03, 0.12, 0.88);
  let h = 0, a = 0; const parz = [];
  while (h < need && a < need) {
    const tb = sets === 5 && h === 2 && a === 2;
    const hw = Math.random() < p, sc = simSetScore(hw, tb);
    parz.push(hw ? sc : [sc[1], sc[0]]); if (hw) h++; else a++;
  }
  return { h, a, parz };
}

// prima giornata con gare non ancora giocate (-1 = campionato concluso)
function currentRound(lg, st) {
  const G = allGare(lg);
  for (let gi = 0; gi < lg.giornate.length; gi++) if (G.some(x => x.gi === gi && !garaResult(lg, st, x.g, x.id))) return gi;
  return -1;   // campionato concluso
}
// simula tutte le gare non giocate della giornata (esclusa eventualmente la propria)
function simRound(lg, st, gi, skipMine) {
  const codes = leagueTeams(lg), mine = st.team;
  for (const x of allGare(lg)) {
    if (x.gi !== gi || garaResult(lg, st, x.g, x.id)) continue;
    if (skipMine && (x.g.casa === mine || x.g.ospite === mine)) continue;
    const hc = codes[x.g.casa] && codes[x.g.casa].code, ac = codes[x.g.ospite] && codes[x.g.ospite].code;
    if (!hc || !ac) continue;
    st.results[x.id] = simMatch(hc, ac, 5);
  }
}
function myGara(lg, st, gi) { return allGare(lg).find(x => x.gi === gi && (x.g.casa === st.team || x.g.ospite === st.team)) || null; }

const shortName = n => { const s = asciiUp(n).replace(/^(A\.S\.D\.|S\.S\.D\.|ASD|SSD)\s+/, ''); return s.length > 20 ? s.slice(0, 19) + '.' : s; };
const fmtDate = g => { if (!g.data) return ''; const [y, m, d] = g.data.split('-'); return `${d}/${m}/${y}${g.ora ? ' ' + g.ora : ''}`; };

// ---------------- partita della propria squadra (a set) ----------------
const LG = { lg: null, st: null, gara: null, sets: [], gi: 0 };
// gioca un set della propria gara; a fine set onDone decide se continuare o chiudere la partita
function startLeagueSet(scene) {
  const { lg, st, gara } = LG, codes = leagueTeams(lg);
  const hc = codes[gara.g.casa].code, ac = codes[gara.g.ospite].code;
  const N = st.sets, need = Math.ceil(N / 2);
  const won = LG.sets.reduce((c, s) => (s[0] > s[1] ? c[0]++ : c[1]++, c), [0, 0]);
  const tb = N > 1 && won[0] === need - 1 && won[1] === need - 1;
  const a = ARENAS[MSET.arena], stt = [statsOf(hc), statsOf(ac)];
  const sk = s => clamp(0.35 + (s[0] + s[1] + s[2] - 210) / 90 * 0.55, 0.4, 0.92);
  const home = gara.g.casa === st.team;
  scene.scene.start('Match', {
    mode: 'modern', left: hc, right: ac, humans: home ? [1, 0] : [0, 1], skillL: sk(stt[0]), skillR: sk(stt[1]),
    stats: stt, start: [0, 0], time: null, setLabel: `SET ${LG.sets.length + 1}   ${hc} ${won[0]}-${won[1]} ${ac}`,
    firstServe: LG.sets.length % 2,
    modern: { arena: a.id === 'classic' ? 'arena' : a.id, floor: a.floor || ARENAS[0].floor, ball: BALLS[MSET.ball].key, rebound: OPT.rebound[MSET.rebound],
              target: MSET.target === 0, targetPts: tb ? 15 : 25, sideOut: false, fx: MSET.fx === 0 },
    onDone: m => {
      LG.sets.push([m.teams[0].score, m.teams[1].score]);
      const w = LG.sets.reduce((c, s) => (s[0] > s[1] ? c[0]++ : c[1]++, c), [0, 0]);
      if (w[0] >= need || w[1] >= need) {
        LG.st.results[LG.gara.id] = { h: w[0], a: w[1], parz: LG.sets.slice(), played: true };
        simRound(LG.lg, LG.st, LG.gi, false);
        leagueSave(LG.lg, LG.st);
        m.scene.start('LeagueSet', { done: true });
      } else m.scene.start('LeagueSet', { done: false });
    }
  });
}

// ---------------- SCENE ----------------
const leaguePanel = (s, x, y, w, h, t) => UI.panel(s, x, y, w, h, t);

class LeagueSelectScene extends Base {
  constructor() { super('Leagues'); }
  create() {
    camSetup(this); makeCommon(this); this.keysInit(); UI.bg(this);
    this.add.text(160, 12, 'CAREER - SCEGLI LA COMPETIZIONE', UI.f(8, '#ffd23a', true)).setOrigin(0.5);
    this.items = [{ k: 'torneo', t: 'TORNEO NAZIONALI', s: '4 turni a eliminazione contro il Gruppo I' }];
    for (const lg of LEAGUES.list) {
      const st = leagueLoad(lg), cr = currentRound(lg, st), tot = lg.giornate.length;
      const prog = st.team ? (cr < 0 ? 'CONCLUSO' : `giornata ${cr + 1}/${tot} con ${shortName(st.team)}`) : `${lg.squadre.length} squadre, ${tot} giornate`;
      this.items.push({ k: 'lega', lg, t: asciiUp(lg.nome), s: prog });
    }
    leaguePanel(this, 20, 26, 280, 170, null);
    this.rows = this.items.map((it, i) => [this.add.text(34, 34 + i * 20, it.t, UI.f(7, '#ffffff', true)), this.add.text(34, 43 + i * 20, it.s, UI.f(5, '#9ab8f0'))]);
    if (!LEAGUES.list.length) this.add.text(160, 150, 'Nessun campionato: aggiungi campionati.json (vedi README)\no trascina il file sulla finestra del gioco', { ...UI.f(5, '#9ab8f0'), align: 'center' }).setOrigin(0.5);
    this.cur = this.add.image(26, 0, 'ballbig').setScale(0.5);
    this.add.text(160, 210, '↑↓ scegli   Z: conferma   ESC: menu', UI.f(5, '#9ab8f0')).setOrigin(0.5);
    this.sel = 0; this.refresh();
  }
  refresh() { this.rows.forEach((r, i) => r[0].setColor(i === this.sel ? '#ffd23a' : '#ffffff')); this.cur.y = 38 + this.sel * 20; }
  update() {
    if (this.gone) return;
    const n = this.items.length;
    if (this.jd('up')) { this.sel = (this.sel + n - 1) % n; this.refresh(); SFX.blip(); }
    if (this.jd('down')) { this.sel = (this.sel + 1) % n; this.refresh(); SFX.blip(); }
    if (this.jd('esc')) { this.gone = true; this.scene.start('MainMenu'); return; }
    if (this.btn() || this.startPressed()) {
      this.gone = true; SFX.select();
      const it = this.items[this.sel];
      if (it.k === 'torneo') { GS.career = { round: 0 }; this.scene.start('TeamSelect'); return; }
      leagueTeams(it.lg);
      const st = leagueLoad(it.lg);
      LG.lg = it.lg;
      this.scene.start(st.team ? 'LeagueHub' : 'LeagueTeam');
    }
  }
}

class LeagueTeamScene extends Base {
  constructor() { super('LeagueTeam'); }
  create() {
    camSetup(this); makeCommon(this); this.keysInit(); UI.bg(this);
    const lg = LG.lg, codes = leagueTeams(lg);
    this.add.text(160, 10, asciiUp(lg.nome), UI.f(7, '#ffd23a', true)).setOrigin(0.5);
    this.add.text(160, 20, 'SCEGLI LA TUA SQUADRA', UI.f(6, '#ffffff', true)).setOrigin(0.5);
    leaguePanel(this, 10, 30, 300, 172, null);
    this.teams = lg.squadre.map(s => s.nome);
    this.rows = this.teams.map((nome, i) => {
      const c = codes[nome], col = i % 2, row = Math.floor(i / 2), x = 18 + col * 148, y = 38 + row * 16;
      if (c) this.add.image(x + 9, y + 5, makeFlagTex(this, c.code, 16, 11));
      const t = this.add.text(x + 21, y, shortName(nome), UI.f(5.5, '#ffffff', true));
      this.add.text(x + 21, y + 7, c && c.real ? 'GIOCATORI VERI (squadre.json)' : 'giocatori generati', UI.f(3.8, c && c.real ? '#7ad0ff' : '#8a9ac0'));
      return t;
    });
    this.add.text(160, 210, '← → ↑ ↓ scegli   Z: conferma   ESC: indietro', UI.f(5, '#9ab8f0')).setOrigin(0.5);
    this.sel = Math.max(0, this.teams.findIndex(n => leagueTeams(lg)[n] && leagueTeams(lg)[n].real)); this.refresh();
  }
  refresh() { this.rows.forEach((t, i) => t.setColor(i === this.sel ? '#ffd23a' : '#ffffff')); }
  update() {
    if (this.gone) return;
    const n = this.teams.length;
    if (this.jd('left') || this.jd('right')) { this.sel = this.sel ^ 1; if (this.sel >= n) this.sel = n - 1; this.refresh(); SFX.blip(); }
    if (this.jd('up')) { this.sel = (this.sel + n - 2) % n; this.refresh(); SFX.blip(); }
    if (this.jd('down')) { this.sel = (this.sel + 2) % n; this.refresh(); SFX.blip(); }
    if (this.jd('esc')) { this.gone = true; this.scene.start('Leagues'); return; }
    if (this.btn() || this.startPressed()) {
      this.gone = true; SFX.select();
      const st = leagueLoad(LG.lg); st.team = this.teams[this.sel]; leagueSave(LG.lg, st);
      this.scene.start('LeagueHub');
    }
  }
}

class LeagueHubScene extends Base {
  constructor() { super('LeagueHub'); }
  init(d) { this.page = d && d.page || 'table'; }
  create() {
    camSetup(this); makeCommon(this); this.keysInit(); UI.bg(this);
    const lg = LG.lg, st = (LG.st = leagueLoad(lg)), codes = leagueTeams(lg);
    this.lg = lg; this.st = st;
    const cr = currentRound(lg, st), tot = lg.giornate.length;
    this.cr = cr;
    this.add.text(160, 7, asciiUp(lg.nome), UI.f(7, '#ffd23a', true)).setOrigin(0.5);
    this.add.text(160, 16, cr < 0 ? 'CAMPIONATO CONCLUSO' : `GIORNATA ${lg.giornate[cr].numero || cr + 1} DI ${tot}   ·   ${shortName(st.team)}`, UI.f(5, '#ffffff', true)).setOrigin(0.5);
    // pannello sinistro: classifica o risultati (Q/E)
    leaguePanel(this, 4, 24, 200, 156, null);
    this.left = [];
    this.drawLeft();
    // pannello destro: prossima gara
    leaguePanel(this, 208, 24, 108, 156, cr < 0 ? 'FINALE' : 'LA TUA GARA');
    const mine = cr >= 0 ? myGara(lg, st, cr) : null;
    this.mine = mine;
    const R = (y, t, sz = 5, col = '#ffffff', b = false) => this.add.text(212, y, t, { ...UI.f(sz, col, b), wordWrap: { width: 100 } });
    if (cr < 0) {
      const tab = standings(lg, st), pos = tab.findIndex(t => t.nome === st.team) + 1;
      R(38, 'CAMPIONE', 5, '#9ab8f0'); R(46, shortName(tab[0].nome), 6, '#ffd23a', true);
      R(70, 'LA TUA SQUADRA', 5, '#9ab8f0'); R(78, `${pos}° POSTO  ·  ${tab[pos - 1].pt} PUNTI`, 6, '#ffffff', true);
    } else if (!mine) R(40, 'In questa giornata la tua squadra riposa.', 5, '#ffffff');
    else {
      const g = mine.g, r = garaResult(lg, st, g, mine.id);
      R(36, `GARA ${g.gara || ''}  ·  ${fmtDate(g)}`, 4.5, '#9ab8f0');
      if (codes[g.casa]) this.add.image(222, 54, makeFlagTex(this, codes[g.casa].code, 16, 11));
      R(49, shortName(g.casa), 5, g.casa === st.team ? '#ffd23a' : '#ffffff', true).setX(233);
      R(60, 'vs', 4.5, '#9ab8f0').setX(222);
      if (codes[g.ospite]) this.add.image(222, 74, makeFlagTex(this, codes[g.ospite].code, 16, 11));
      R(69, shortName(g.ospite), 5, g.ospite === st.team ? '#ffd23a' : '#ffffff', true).setX(233);
      if (g.impianto) R(86, g.impianto, 3.8, '#9ab8f0');
      if (g.arbitro) R(120, 'Arbitro: ' + g.arbitro, 3.8, '#9ab8f0');
      if (r) R(134, `GIÀ GIOCATA: ${r.h}-${r.a}${r.real ? ' (reale)' : ''}`, 5, '#7ad0ff', true);
    }
    // comandi
    this.opts = cr < 0 ? ['RICOMINCIA', 'ESCI'] : mine && !garaResult(lg, st, mine.g, mine.id) ? ['GIOCA', 'SIMULA', 'SET', 'RICOMINCIA', 'ESCI'] : ['CONTINUA', 'SET', 'RICOMINCIA', 'ESCI'];
    this.optT = this.opts.map((o, i) => this.add.text(30 + i * (260 / Math.max(1, this.opts.length - 1)), 192, '', UI.f(6.5, '#ffffff', true)).setOrigin(0.5));
    this.add.text(160, 210, '← → comando   Z: conferma   Q/E: classifica / risultati / calendario   ESC: indietro', UI.f(4.3, '#9ab8f0')).setOrigin(0.5);
    this.sel = 0; this.confirm = false; this.refresh();
  }
  drawLeft() {
    this.left.forEach(o => o.destroy()); this.left = [];
    const L = (x, y, t, sz = 4.5, col = '#ffffff', b = false, o = 0) => { const tx = this.add.text(x, y, t, UI.f(sz, col, b)).setOrigin(o, 0); this.left.push(tx); return tx; };
    const lg = this.lg, st = this.st;
    if (this.page === 'table') {
      L(10, 28, 'CLASSIFICA', 5.5, '#ffd23a', true);
      const cols = [['PT', 120], ['G', 135], ['V', 148], ['P', 161], ['SET', 182]];
      cols.forEach(([t, x]) => L(x, 30, t, 4, '#9ab8f0', true, 0.5));
      standings(lg, st).forEach((t, i) => {
        const y = 40 + i * 13.5, me = t.nome === st.team, c = me ? '#ffd23a' : '#ffffff';
        L(10, y, `${i + 1}`, 4.8, c, true);
        L(20, y, shortName(t.nome), 4.5, c, me);
        L(120, y, String(t.pt), 5, c, true, 0.5); L(135, y, String(t.g), 4.5, c, false, 0.5); L(148, y, String(t.v), 4.5, c, false, 0.5); L(161, y, String(t.p), 4.5, c, false, 0.5);
        L(182, y, `${t.sv}-${t.sp}`, 4.5, c, false, 0.5);
      });
    } else {
      // risultati della giornata appena giocata, oppure calendario della giornata corrente
      const gi = this.page === 'res' ? Math.max(0, (this.cr < 0 ? lg.giornate.length : this.cr) - 1) : Math.max(0, this.cr);
      L(10, 28, `${this.page === 'res' ? 'RISULTATI' : 'CALENDARIO'} GIORNATA ${lg.giornate[gi].numero || gi + 1}`, 5.5, '#ffd23a', true);
      allGare(lg).filter(x => x.gi === gi).forEach((x, i) => {
        const r = garaResult(lg, st, x.g, x.id), y = 42 + i * 26, me = x.g.casa === st.team || x.g.ospite === st.team, c = me ? '#ffd23a' : '#ffffff';
        L(10, y, shortName(x.g.casa), 4.5, c, me); L(10, y + 7, shortName(x.g.ospite), 4.5, c, me);
        if (r) { L(150, y, String(r.h), 6, c, true, 0.5); L(150, y + 7, String(r.a), 6, c, true, 0.5); L(14, y + 15, (r.parz || []).map(p => p.join('-')).join('   '), 3.6, '#9ab8f0', false); }
        else L(150, y + 3, fmtDate(x.g), 3.8, '#9ab8f0', false, 0.5);
      });
    }
  }
  refresh() {
    this.optT.forEach((t, i) => {
      const o = this.opts[i];
      t.setText(o === 'SET' ? `SET: ${this.st.sets}` : o === 'RICOMINCIA' && this.confirm && i === this.sel ? 'SICURO? Z' : o)
        .setColor(i === this.sel ? '#ffd23a' : '#ffffff').setScale(i === this.sel ? 1.1 : 1);
    });
  }
  update() {
    if (this.gone) return;
    const n = this.opts.length;
    if (this.jd('left')) { this.sel = (this.sel + n - 1) % n; this.confirm = false; this.refresh(); SFX.blip(); }
    if (this.jd('right')) { this.sel = (this.sel + 1) % n; this.confirm = false; this.refresh(); SFX.blip(); }
    const qe = Phaser.Input.Keyboard.JustDown(this.kq) ? -1 : Phaser.Input.Keyboard.JustDown(this.ke) ? 1 : 0;
    if (qe) { const P = ['table', 'res', 'cal']; this.page = P[(P.indexOf(this.page) + qe + 3) % 3]; this.drawLeft(); SFX.blip(); }
    if (this.jd('esc')) { this.gone = true; this.scene.start('Leagues'); return; }
    if (!(this.btn() || this.startPressed())) return;
    const o = this.opts[this.sel], lg = this.lg, st = this.st;
    SFX.select();
    if (o === 'SET') { st.sets = st.sets === 1 ? 3 : st.sets === 3 ? 5 : 1; leagueSave(lg, st); this.refresh(); return; }
    if (o === 'RICOMINCIA') {
      if (!this.confirm) { this.confirm = true; this.refresh(); return; }
      leagueSave(lg, { team: null, results: {}, sets: st.sets }); this.gone = true; this.scene.start('LeagueTeam'); return;
    }
    if (o === 'ESCI') { this.gone = true; this.scene.start('MainMenu'); return; }
    if (o === 'CONTINUA') { simRound(lg, st, this.cr, false); leagueSave(lg, st); this.scene.restart({ page: 'res' }); return; }
    if (o === 'SIMULA') {
      const m = this.mine, codes = leagueTeams(lg);
      st.results[m.id] = simMatch(codes[m.g.casa].code, codes[m.g.ospite].code, st.sets);
      simRound(lg, st, this.cr, false); leagueSave(lg, st); this.scene.restart({ page: 'res' }); return;
    }
    if (o === 'GIOCA') {
      this.gone = true;
      Object.assign(LG, { lg, st, gara: this.mine, sets: [], gi: this.cr });
      startLeagueSet(this);
    }
  }
  keysInit() {
    super.keysInit();
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.kq = this.input.keyboard.addKey(K.Q); this.ke = this.input.keyboard.addKey(K.E);
  }
}

// tra un set e l'altro (e a fine partita)
class LeagueSetScene extends Base {
  constructor() { super('LeagueSet'); }
  init(d) { this.finished = !!(d && d.done); }   // (non 'done': camSetup lo azzera)
  create() {
    camSetup(this); makeCommon(this); this.keysInit(); UI.bg(this);
    const g = LG.gara.g, codes = leagueTeams(LG.lg);
    const w = LG.sets.reduce((c, s) => (s[0] > s[1] ? c[0]++ : c[1]++, c), [0, 0]);
    leaguePanel(this, 30, 30, 260, 150, this.finished ? 'FINE PARTITA' : `FINE SET ${LG.sets.length}`);
    this.add.image(90, 70, makeFlagTex(this, codes[g.casa].code, 36, 24)); this.add.image(230, 70, makeFlagTex(this, codes[g.ospite].code, 36, 24));
    this.add.text(90, 88, shortName(g.casa), UI.f(5.5, '#ffffff', true)).setOrigin(0.5, 0);
    this.add.text(230, 88, shortName(g.ospite), UI.f(5.5, '#ffffff', true)).setOrigin(0.5, 0);
    this.add.text(160, 70, `${w[0]} - ${w[1]}`, UI.f(18, '#ffd23a', true)).setOrigin(0.5);
    this.add.text(160, 110, LG.sets.map(s => s.join('-')).join('    '), UI.f(6, '#7ad0ff', true)).setOrigin(0.5);
    if (this.finished) {
      const mine = g.casa === LG.st.team ? w[0] > w[1] : w[1] > w[0];
      this.add.text(160, 132, mine ? 'VITTORIA!' : 'SCONFITTA', UI.f(12, mine ? '#ffd23a' : '#ff8a8a', true)).setOrigin(0.5);
      this.add.text(160, 152, 'le altre gare della giornata sono state simulate', UI.f(4.5, '#9ab8f0')).setOrigin(0.5);
    }
    this.add.text(160, 200, this.finished ? 'Z: CLASSIFICA E RISULTATI' : 'Z: SET SUCCESSIVO', UI.f(7, '#ffffff', true)).setOrigin(0.5);
  }
  update() {
    if (this.gone || !(this.btn() || this.startPressed())) return;
    this.gone = true; SFX.select();
    if (this.finished) this.scene.start('LeagueHub', { page: 'res' }); else startLeagueSet(this);
  }
}
