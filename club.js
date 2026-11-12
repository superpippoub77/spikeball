// ============================================================
//  SPIKE CLUB: il tuo club di pallavolo (idee di gioco ispirate a Spikair Volleyball, grafica e regole nostre)
//  - Crei il club: nome, colori presi da una squadra del gioco, rosa di 8 giocatori (maschile o femminile).
//  - Stagioni a divisioni (SERIE C -> SUPERLEGA): 6 partite contro le squadre del gioco della tua fascia di forza
//    (nazionali, club di squadre.json, squadre dell'editor e dei campionati). Con 4 vittorie su 6 si sale,
//    con 1 o meno si scende; in SUPERLEGA con 4 vittorie si vince lo scudetto. Trofei nella bacheca.
//  - ALLENAMENTO: i punti allenamento (3 per vittoria, 2 per sconfitta) alzano attacco, difesa e velocità dei
//    giocatori; la forza della squadra in partita (TEAM_STATS) è la media dei 4 titolari.
//  - MERCATO: giocatori di altre squadre in vendita con i crediti (vittorie, punti perfetti); si vende per fare posto.
//  - In partita, come in Spikair: il comando passa da solo al giocatore che deve toccare la palla (motore del gioco)
//    e ogni tocco ha un giudizio PERFETTO / BUONO / SCARSO che ne cambia la qualità; schiacciate e battute perfette
//    hanno lo stacco "anime": rallentatore, lampo e scritta grande.
//  Il club diventa la squadra CLB (rosterTeam di roster.js), quindi usa formazione, volti, numeri e statistiche del gioco.
//  Salvataggio nel browser: 'sf91_club'.
// ============================================================
const CLUB_DIVS = ['SERIE C', 'SERIE B', 'SERIE A2', 'SERIE A1', 'SUPERLEGA'];
const CLUB_ARENA = [3, 2, 1, 0, 0];   // campo di ogni divisione (ARENAS)
const CLUB_GAMES = 6, CLUB_MAX = 8;
const CLUB = {
  data: null, ui: null, view: 'hub', msg: '',
  load() { try { this.data = JSON.parse(localStorage.getItem('sf91_club')) || null; } catch (e) { this.data = null; } },
  save() { try { localStorage.setItem('sf91_club', JSON.stringify(this.data)); } catch (e) { /* */ } }
};
CLUB.load();
const cT = s => (typeof T === 'function' ? T(s) : s);
const cEsc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const cPick = a => a[Math.floor(Math.random() * a.length)];
const clubLv = p => Math.round((p.att + p.dif + p.spd) / 3);

// ---------------- giocatori e squadra ----------------
function clubNewPlayer(fem, role, base, used) {
  let n; do { n = cPick(fem ? ED_FEM_FIRST : GEN_FIRST) + '|' + cPick(GEN_LAST); } while (used && used.has(n));
  if (used) used.add(n);
  const [nome, cognome] = n.split('|'), v = () => clamp(Math.round(base + rnd(-7, 7)), 30, 99);
  return { nome, cognome, num: 1 + Math.floor(Math.random() * 23), role, att: v(), dif: v(), spd: v(), age: 18 + Math.floor(Math.random() * 14),
    sk: cPick(['#f2c8a8', '#eeb088', '#e8b088', '#d8a070', '#b67a4c', '#8a5a38']), ha: cPick(['#2a1408', '#3a2010', '#5a3010', '#141414', '#8a5a20', '#c09050']), starter: false };
}
// la squadra CLB del gioco, rifatta a ogni cambio (rosa, titolari, statistiche)
function clubRegister() {
  const C = CLUB.data; if (!C) return;
  const st = C.players.filter(p => p.starter);
  if (st.length < 4) for (const p of C.players) { if (st.length >= 4) break; if (!p.starter) { p.starter = true; st.push(p); } }
  const nums = new Set();
  for (const p of C.players) { while (nums.has(p.num)) p.num = p.num % 30 + 1; nums.add(p.num); }
  const sq = { tipo: 'club', codice: 'CLB', nome: C.name, colori: { maglia: C.sh, bordo: C.tr, pantaloncini: C.so },
    titolari: st.slice(0, 4).map(p => p.num),
    giocatori: C.players.map(p => ({ nome: p.nome, cognome: p.cognome, numero: p.num, sigla: p.role, eta: p.age, livello: clubLv(p) / 10, pelle: p.sk, capelli: p.ha })) };
  if (TEAMS.CLB) delete TEAMS.CLB;
  try { rosterTeam(sq, 0); } catch (e) { console.error(e); return; }
  if (!TEAMS.CLB) return;
  Object.assign(TEAMS.CLB, { custom: true, club: true, sesso: C.fem ? 'F' : 'M' });
  const s4 = st.slice(0, 4), avg = k => Math.round(s4.reduce((a, p) => a + p[k], 0) / s4.length);
  TEAM_STATS.CLB = [avg('att'), avg('dif'), avg('spd')];
}
function clubCreate(name, base, fem) {
  const P = TEAMS[base] || TEAMS.ITA, used = new Set();
  const roles = ['P', 'S', 'S', 'C', 'O', 'L', 'S', 'C'];
  CLUB.data = { name: String(name || 'SPIKE CLUB').trim().toUpperCase().slice(0, 24) || 'SPIKE CLUB', base, sh: P.sh, tr: P.tr, so: P.so, fem: !!fem,
    div: 0, season: 1, round: 0, credits: 300, tp: 4, res: [], opps: [], trophies: [], last: null, market: [],
    players: roles.map((r, i) => Object.assign(clubNewPlayer(fem, r, 56, used), { num: [3, 7, 11, 14, 9, 5, 1, 12][i], starter: i < 4 })) };
  clubSeason(); clubMarket(); clubRegister(); CLUB.save();
}
// avversari della stagione: le squadre del gioco divise in 5 fasce di forza (una per divisione)
function clubPool() {
  return Object.keys(TEAMS).filter(c => c !== 'CLB' && c[0] !== '_' && TEAMS[c] && TEAMS[c].name && !TEAMS[c].emblem && !TEAMS[c].flagOf)
    .map(c => ({ c, f: statsOf(c).reduce((a, v) => a + v, 0) / 3 })).sort((a, b) => a.f - b.f);
}
function clubSeason() {
  const C = CLUB.data, pool = clubPool(), n = pool.length, band = Math.max(CLUB_GAMES, Math.ceil(n / CLUB_DIVS.length));
  const from = clamp(Math.round(C.div / (CLUB_DIVS.length - 1) * (n - band)), 0, Math.max(0, n - band));
  const list = pool.slice(from, from + band).map(x => x.c).sort(() => Math.random() - 0.5);
  while (list.length < CLUB_GAMES && n) list.push(pool[Math.floor(Math.random() * n)].c);
  C.opps = list.slice(0, CLUB_GAMES); C.round = 0; C.res = [];
}
// mercato: giocatori di altre squadre, più forti salendo di divisione
function clubMarket() {
  const C = CLUB.data, pool = clubPool(), out = [], used = new Set(C.players.map(p => p.cognome));
  for (let k = 0; k < 6 && pool.length; k++) {
    const t = pool[Math.floor(Math.random() * pool.length)].c, P = TEAMS[t], i = Math.floor(Math.random() * (P.names || ['X']).length);
    const base = clamp(50 + C.div * 8 + rnd(-4, 10), 40, 95);
    const pl = clubNewPlayer(C.fem, cPick(['S', 'S', 'O', 'C', 'P', 'L']), base);
    const nm = String((P.names || [])[i] || pl.cognome);
    if (used.has(nm)) continue; used.add(nm);
    pl.cognome = nm.charAt(0) + nm.slice(1).toLowerCase(); pl.nome = ''; pl.from = t;
    if (P.sks && P.sks[i]) pl.sk = P.sks[i];
    pl.price = Math.round(Math.pow(clubLv(pl), 2) / 20 / 10) * 10;
    out.push(pl);
  }
  C.market = out;
}

// ---------------- partita del club ----------------
function clubPlay(scene) {
  const C = CLUB.data, opp = C.opps[C.round]; if (!opp) return;
  if (!!GS.women !== C.fem) setWomen(C.fem);
  clubRegister();
  Object.assign(MSET, { left: 'CLB', right: opp, leftAI: false, rightAI: true, players: 0, rules: C.div >= 3 ? 0 : 1, arena: CLUB_ARENA[C.div], start: 0, women: C.fem ? 1 : 0 });
  GS.clubGame = { opp, round: C.round, perf: 0, good: 0, bad: 0 };
  clubUiClose();
  startModernMatch(scene);
}
function clubRecord(m) {
  const C = CLUB.data, G = GS.clubGame; if (!C || !G) return;
  GS.clubGame = null;
  const us = m.teams[0].score, them = m.teams[1].score, won = m.winner === m.teams[0];
  C.res.push([us, them]);
  const gain = (won ? 150 : 50) + G.perf * 5;
  C.credits += gain; C.tp += won ? 3 : 2;
  // esperienza: ogni titolare migliora un po' in una delle tre qualità
  for (const p of C.players.filter(q => q.starter)) { const k = cPick(['att', 'dif', 'spd']); p[k] = Math.min(99, p[k] + (won ? 1 : 0) + (Math.random() < 0.5 ? 1 : 0)); }
  let msg = `${won ? 'VITTORIA' : 'SCONFITTA'} ${us}-${them} CONTRO ${TEAMS[G.opp] ? TEAMS[G.opp].name : G.opp} · +${gain} CREDITI · TOCCHI PERFETTI: ${G.perf}`;
  C.round++;
  if (C.round >= C.opps.length) {
    const w = C.res.filter(r => r[0] > r[1]).length, name = CLUB_DIVS[C.div];
    if (w >= 4 && C.div === CLUB_DIVS.length - 1) { C.trophies.push({ s: C.season, t: 'SCUDETTO ' + name }); C.credits += 1000; msg += ` · CAMPIONI DI ${name}!`; }
    else if (w >= 4) { C.trophies.push({ s: C.season, t: 'PROMOZIONE DALLA ' + name }); C.div++; C.credits += 300; msg += ` · PROMOSSI IN ${CLUB_DIVS[C.div]}!`; }
    else if (w <= 1 && C.div > 0) { C.div--; msg += ` · RETROCESSI IN ${CLUB_DIVS[C.div]}`; }
    else msg += ` · SALVI IN ${name} (${w} VITTORIE)`;
    C.season++; clubSeason();
  }
  C.last = msg; clubMarket(); clubRegister(); CLUB.save();
}

// giudizio dei tocchi e stacco "anime" (solo nelle partite del club, per la squadra che comandi)
const _createClub = MatchScene.prototype.create;
MatchScene.prototype.create = function (d) {
  this.club = false; this.slowT = 0;
  _createClub.apply(this, arguments);
  if (!GS.clubGame || !d || d.left !== 'CLB' || d.mode !== 'modern') return;
  this.club = true;
  this.cfg.onDone = m => { clubRecord(m); m.scene.start('Club'); };
};
function clubGrade(m, t, p, q, kind) {
  if (!m.club || !t.human) return q;
  const G = GS.clubGame || {};
  if (q >= 0.85) {
    G.perf = (G.perf || 0) + 1;
    if (kind === 'spike' || kind === 'serve') clubCutIn(m, p, kind === 'spike' ? 'SCHIACCIATA PERFETTA!' : 'BATTUTA PERFETTA!');
    else m.popup(p, cT('PERFETTO!'));
    return Math.min(1, q + (kind === 'pass' ? 0.08 : 0.1));
  }
  if (q >= 0.55) { G.good = (G.good || 0) + 1; m.popup(p, cT('BUONO')); return q; }
  G.bad = (G.bad || 0) + 1; m.popup(p, cT(kind === 'pass' ? 'SCARSO' : 'FUORI TEMPO')); return q;
}
function clubCutIn(m, p, text) {
  m.slowT = 0.55;
  const flash = m.add.rectangle(0, 0, CFG.W, CFG.H, 0xffffff, 0.75).setOrigin(0).setScrollFactor(0).setDepth(2600);
  const band = m.add.rectangle(0, 92, CFG.W, 34, 0x0a1a4a, 0.85).setOrigin(0).setScrollFactor(0).setDepth(2601);
  const tx = m.add.text(CFG.W + 10, 109, cT(text), TXT(10, '#ffd23a')).setOrigin(0.5).setScrollFactor(0).setDepth(2602).setStroke('#e02020', 3);
  const nm = m.add.text(CFG.W / 2, 124, String(TEAMS[p.team.code].names[p.ni] || ''), TXT(6, '#ffffff')).setOrigin(0.5).setScrollFactor(0).setDepth(2602);
  m.tweens.add({ targets: flash, alpha: 0, duration: 220 });
  m.tweens.add({ targets: tx, x: CFG.W / 2, duration: 160, ease: 'Back.out' });
  m.time.delayedCall(900, () => m.tweens.add({ targets: [band, tx, nm], alpha: 0, duration: 250, onComplete: () => { flash.destroy(); band.destroy(); tx.destroy(); nm.destroy(); } }));
  try { m.shake(160, 0.006); } catch (e) { /* */ }
}
for (const [name, kind, qi, ti, pi] of [['doPass', 'pass', 2, 0, 1], ['doSpike', 'spike', 2, 0, 1], ['doSet', 'set', 2, 0, 1]]) {
  const orig = MatchScene.prototype[name];
  if (!orig) continue;
  MatchScene.prototype[name] = function (...a) {
    if (this.club) a[qi] = clubGrade(this, a[ti], a[pi], a[qi], kind);
    return orig.apply(this, a);
  };
}
const _hitServeClub = MatchScene.prototype.hitServe;
MatchScene.prototype.hitServe = function (s, q) {
  if (this.club) q = clubGrade(this, s.team, s, q, 'serve');
  return _hitServeClub.call(this, s, q);
};
// rallentatore dello stacco
const _updateClub = MatchScene.prototype.update;
MatchScene.prototype.update = function (time, delta) {
  if (this.club && this.slowT > 0) { this.slowT -= delta / 1000; delta *= 0.3; }
  return _updateClub.call(this, time, delta);
};

// ---------------- pagina del club (sopra il gioco, come la sala online; frecce, Z e ESC funzionano) ----------------
function clubUiClose() { if (CLUB.ui) { CLUB.ui.remove(); CLUB.ui = null; } const k = window.__game && window.__game.input.keyboard; if (k) k.preventDefault = true; }
function clubUiOpen() {
  if (!document.getElementById('clubCss')) {
    const css = document.createElement('style'); css.id = 'clubCss';
    css.textContent = `#club { position: fixed; inset: 0; z-index: 45; background: radial-gradient(circle at 70% 0%, #1a2a6a, #060c24 70%); color: #fff; font: 14px Arial, sans-serif; overflow-y: auto; padding: 12px max(14px, env(safe-area-inset-left)); }
      #club h1 { font: 24px "Arial Black", Arial; color: #ffd23a; margin: 2px 0; } #club h2 { font: 15px "Arial Black", Arial; color: #7ad0ff; margin: 12px 0 4px; }
      #club .muted { color: #9ab8f0; font-size: 12px; } #club .msg { color: #ffd23a; font-weight: bold; margin: 6px 0; }
      #club .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 6px 0; }
      #club button { background: #1a5ad8; color: #fff; border: 1px solid #7ab0ff; border-radius: 6px; padding: 7px 13px; font: bold 13px Arial; cursor: pointer; }
      #club button.green { background: #1e8a3a; border-color: #7ae09a; } #club button.red { background: #a02028; border-color: #ff8a8a; } #club button:disabled { opacity: 0.35; }
      #club button:focus, #club select:focus, #club input:focus { outline: 3px solid #ffd23a; outline-offset: 1px; }
      #club input, #club select { font: bold 15px Arial; padding: 5px 8px; border-radius: 6px; border: 1px solid #7ab0ff; }
      #club table { border-collapse: collapse; } #club td { padding: 3px 7px; border-bottom: 1px solid #1a3a7a; white-space: nowrap; } #club tr.st td:first-child { color: #ffd23a; }
      #club .bar { display: inline-block; width: 46px; height: 6px; background: #1a2a4a; border-radius: 3px; vertical-align: middle; } #club .bar i { display: block; height: 100%; border-radius: 3px; background: #3ad070; }
      #club .badge { display: inline-block; background: #ffd23a; color: #111; border-radius: 4px; padding: 1px 6px; font-weight: bold; margin: 2px; }
      #club .kit { display: inline-block; width: 18px; height: 18px; border-radius: 4px; vertical-align: middle; border: 2px solid #fff; }`;
    document.head.appendChild(css);
  }
  const k = window.__game && window.__game.input.keyboard; if (k) k.preventDefault = false;
  CLUB.ui = document.createElement('div'); CLUB.ui.id = 'club'; document.body.appendChild(CLUB.ui);
  clubDraw();
}
const bar = v => `<span class="bar"><i style="width:${v}%;background:${v > 75 ? '#3ad070' : v > 55 ? '#f0c030' : '#e04030'}"></i></span> ${v}`;
function clubDraw() {
  const el = CLUB.ui; if (!el) return;
  const C = CLUB.data;
  let h = '';
  if (!C) {
    const teams = Object.keys(TEAMS).filter(c => c[0] !== '_' && c !== 'CLB' && TEAMS[c] && TEAMS[c].name && TEAMS[c].sh && !TEAMS[c].emblem && !TEAMS[c].flagOf);
    h = `<h1>SPIKE CLUB</h1><p class="muted">${cT('Crea il tuo club: parti dalla SERIE C, vinci le partite, allena i giocatori, compra rinforzi e arriva allo scudetto della SUPERLEGA.')}</p>
      <div class="row"><label>${cT('NOME DEL CLUB')} <input id="cName" maxlength="24" value="SPIKE CLUB"></label></div>
      <div class="row"><label>${cT('COLORI COME')} <select id="cBase">${teams.map(c => `<option value="${c}"${c === 'ITA' ? ' selected' : ''}>${cEsc(TEAMS[c].name)}</option>`).join('')}</select></label></div>
      <div class="row"><label>${cT('SQUADRA')} <select id="cFem"><option value="0"${GS.women ? '' : ' selected'}>${cT('MASCHILE')}</option><option value="1"${GS.women ? ' selected' : ''}>${cT('FEMMINILE')}</option></select></label></div>
      <div class="row"><button class="green" data-a="create">${cT('CREA IL CLUB')}</button><button class="red" data-a="exit">${cT('ESCI')}</button></div>`;
  } else {
    const w = C.res.filter(r => r[0] > r[1]).length, l = C.res.length - w, opp = C.opps[C.round];
    const top = `<h1><span class="kit" style="background:${C.sh};border-color:${C.tr}"></span> ${cEsc(C.name)}</h1>
      <div class="row"><span class="badge">${CLUB_DIVS[C.div]}</span><span>${cT('STAGIONE')} ${C.season} · ${cT('PARTITA')} ${Math.min(C.round + 1, CLUB_GAMES)}/${CLUB_GAMES} · ${w}V ${l}P</span>
      <span>${cT('CREDITI')}: <b>${C.credits}</b></span><span>${cT('PUNTI ALLENAMENTO')}: <b>${C.tp}</b></span><span>${cT('FORZA')}: <b>${(TEAM_STATS.CLB || [0, 0, 0]).join(' / ')}</b></span></div>
      ${C.last ? `<p class="msg">${cEsc(cT(C.last))}</p>` : ''}${CLUB.msg ? `<p class="msg">${cEsc(cT(CLUB.msg))}</p>` : ''}
      <div class="row"><button data-v="hub"${CLUB.view === 'hub' ? ' disabled' : ''}>${cT('CLUB')}</button><button data-v="train"${CLUB.view === 'train' ? ' disabled' : ''}>${cT('ALLENAMENTO')}</button><button data-v="market"${CLUB.view === 'market' ? ' disabled' : ''}>${cT('MERCATO')}</button><button data-v="trophy"${CLUB.view === 'trophy' ? ' disabled' : ''}>${cT('BACHECA')}</button></div>`;
    h = top;
    if (CLUB.view === 'hub') {
      h += `<h2>${cT('PROSSIMA PARTITA')}</h2><div class="row">${opp ? `<b>${cEsc(C.name)}</b> - <b>${cEsc(TEAMS[opp] ? TEAMS[opp].name : opp)}</b> <span class="muted">(${cT('forza')} ${statsOf(opp).join(' / ')})</span> <button class="green" data-a="play">${cT('GIOCA')}</button>` : ''}</div>
        <h2>${cT('CALENDARIO')}</h2><table>${C.opps.map((o, i) => `<tr><td>${i + 1}</td><td>${cEsc(TEAMS[o] ? TEAMS[o].name : o)}</td><td>${C.res[i] ? `${C.res[i][0]}-${C.res[i][1]} ${C.res[i][0] > C.res[i][1] ? '✔' : '✘'}` : i === C.round ? '◄' : ''}</td></tr>`).join('')}</table>
        <h2>${cT('ROSA')} <span class="muted">(${cT('4 titolari: il clic su TITOLARE li cambia')})</span></h2>` + clubRoster(C, 'starter');
      h += `<div class="row"><button class="red" data-a="exit">${cT('ESCI')}</button><button data-a="reset">${cT('RICOMINCIA DA CAPO')}</button></div>`;
    } else if (CLUB.view === 'train') {
      h += `<h2>${cT('ALLENAMENTO')}</h2><p class="muted">${cT('Ogni punto allenamento alza di 3 una qualità di un giocatore (massimo 99). I punti arrivano giocando: 3 per una vittoria, 2 per una sconfitta.')}</p>` + clubRoster(C, 'train');
    } else if (CLUB.view === 'market') {
      h += `<h2>${cT('MERCATO')}</h2><p class="muted">${cT('Giocatori di altre squadre. La rosa ha al massimo 8 giocatori: vendi qualcuno per fare posto. Il mercato cambia dopo ogni partita.')}</p>
        <table><tr class="muted"><td></td><td>${cT('RUOLO')}</td><td>ATT</td><td>DIF</td><td>VEL</td><td>${cT('PREZZO')}</td><td></td></tr>${C.market.map((p, i) => `<tr><td>${cEsc((p.nome ? p.nome + ' ' : '') + p.cognome)} <span class="muted">(${cEsc(TEAMS[p.from] ? TEAMS[p.from].name : '')})</span></td><td>${p.role}</td><td>${bar(p.att)}</td><td>${bar(p.dif)}</td><td>${bar(p.spd)}</td><td>${p.price}</td>
          <td><button data-buy="${i}"${C.credits < p.price || C.players.length >= CLUB_MAX ? ' disabled' : ''}>${cT('COMPRA')}</button></td></tr>`).join('')}</table>
        <h2>${cT('VENDI')}</h2>` + clubRoster(C, 'sell');
    } else {
      h += `<h2>${cT('BACHECA')}</h2>${C.trophies.length ? C.trophies.map(t => `<div class="row"><span class="badge">🏆</span> ${cT('STAGIONE')} ${t.s}: <b>${cEsc(t.t)}</b></div>`).join('') : `<p class="muted">${cT('Ancora nessun trofeo: vinci 4 partite su 6 per salire di divisione.')}</p>`}`;
    }
  }
  el.innerHTML = h;
  // azioni
  el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => clubAct(b.dataset.a));
  el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { CLUB.view = b.dataset.v; CLUB.msg = ''; clubDraw(); });
  el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => clubAct('starter', +b.dataset.st));
  el.querySelectorAll('[data-tr]').forEach(b => b.onclick = () => clubAct('train', b.dataset.tr));
  el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => clubAct('buy', +b.dataset.buy));
  el.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => clubAct('sell', +b.dataset.sell));
  const first = el.querySelector('button.green:not([disabled])') || el.querySelector('button:not([disabled]), input, select');
  if (first && !el.contains(document.activeElement)) first.focus();
}
function clubRoster(C, mode) {
  return `<table><tr class="muted"><td>N.</td><td>${cT('GIOCATORE')}</td><td>${cT('RUOLO')}</td><td>${cT('ETÀ')}</td><td>ATT</td><td>DIF</td><td>VEL</td><td>LV</td><td></td></tr>` + C.players.map((p, i) => {
    const cell = k => mode === 'train' ? `${bar(p[k])} <button data-tr="${i}:${k}"${C.tp < 1 || p[k] >= 99 ? ' disabled' : ''}>+3</button>` : bar(p[k]);
    const act = mode === 'starter' ? `<button data-st="${i}">${p.starter ? cT('TITOLARE ✔') : cT('PANCHINA')}</button>`
      : mode === 'sell' ? `<button data-sell="${i}"${C.players.length <= 5 || p.starter ? ' disabled' : ''}>${cT('VENDI')} (${Math.round(Math.pow(clubLv(p), 2) / 20 * 0.6 / 10) * 10})</button>` : '';
    return `<tr class="${p.starter ? 'st' : ''}"><td>${p.num}</td><td>${cEsc((p.nome ? p.nome + ' ' : '') + p.cognome)}</td><td>${p.role}</td><td>${p.age}</td><td>${cell('att')}</td><td>${cell('dif')}</td><td>${cell('spd')}</td><td>${(clubLv(p) / 10).toFixed(1)}</td><td>${act}</td></tr>`;
  }).join('') + '</table>';
}
function clubAct(a, v) {
  const C = CLUB.data; CLUB.msg = '';
  if (a === 'create') { clubCreate(CLUB.ui.querySelector('#cName').value, CLUB.ui.querySelector('#cBase').value, CLUB.ui.querySelector('#cFem').value === '1'); CLUB.view = 'hub'; }
  else if (a === 'exit') { clubUiClose(); const s = window.__game.scene.getScenes(true)[0]; s.scene.start('MainMenu'); return; }
  else if (a === 'reset') { if (!confirm(cT('Ricominciare da capo? Il club attuale si perde.'))) return; CLUB.data = null; CLUB.save(); try { localStorage.removeItem('sf91_club'); } catch (e) { /* */ } if (TEAMS.CLB) delete TEAMS.CLB; }
  else if (a === 'play') { clubPlay(window.__game.scene.getScenes(true)[0]); return; }
  else if (a === 'starter') {
    const p = C.players[v], n = C.players.filter(q => q.starter).length;
    if (p.starter) { CLUB.msg = 'SCEGLI CHI ENTRA AL SUO POSTO'; p.starter = false; }
    else if (n >= 4) { CLUB.msg = 'GIÀ 4 TITOLARI: TOGLINE PRIMA UNO'; }
    else p.starter = true;
    if (C.players.filter(q => q.starter).length === 4) clubRegister();
  } else if (a === 'train') {
    const [i, k] = v.split(':'), p = C.players[+i];
    if (C.tp > 0 && p[k] < 99) { p[k] = Math.min(99, p[k] + 3); C.tp--; clubRegister(); }
  } else if (a === 'buy') {
    const p = C.market[v];
    if (p && C.credits >= p.price && C.players.length < CLUB_MAX) { C.credits -= p.price; C.market.splice(v, 1); delete p.price; p.starter = false; C.players.push(p); clubRegister(); CLUB.msg = 'ACQUISTO FATTO'; }
  } else if (a === 'sell') {
    const p = C.players[v];
    if (p && !p.starter && C.players.length > 5) { C.credits += Math.round(Math.pow(clubLv(p), 2) / 20 * 0.6 / 10) * 10; C.players.splice(v, 1); clubRegister(); }
  }
  CLUB.save(); clubDraw();
}
// frecce, Z / INVIO e ESC dentro la pagina (anche dal gamepad, che manda gli stessi tasti)
window.addEventListener('keydown', e => {
  if (!CLUB.ui) return;
  const el = CLUB.ui, a = document.activeElement, typing = a && a.tagName === 'INPUT';
  const list = [...el.querySelectorAll('button:not([disabled]), select, input')];
  let i = list.indexOf(a);
  if (e.key === 'Escape') { e.preventDefault(); if (CLUB.view !== 'hub') { CLUB.view = 'hub'; clubDraw(); } else clubAct('exit'); return; }
  if (a && a.tagName === 'SELECT' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault(); a.selectedIndex = clamp(a.selectedIndex + (e.key === 'ArrowRight' ? 1 : -1), 0, a.options.length - 1); a.dispatchEvent(new Event('change')); return;
  }
  if (typing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || (e.key.length === 1 && e.key !== ' '))) return;
  if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) {
    e.preventDefault(); if (!list.length) return;
    i = (i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length; list[i].focus(); return;
  }
  if ((e.key === 'z' || e.key === 'Z' || e.key === ' ' || e.key === 'Enter') && a && a.tagName === 'BUTTON' && !typing) { e.preventDefault(); a.click(); }
}, true);

class ClubScene extends Base {
  constructor() { super('Club'); }
  create() {
    camSetup(this); UI.bg(this);
    this.add.text(160, 112, 'SPIKE CLUB', UI.f(10, '#ffd23a', true)).setOrigin(0.5);
    clubRegister();
    CLUB.view = 'hub'; CLUB.msg = '';
    clubUiOpen();
  }
}
// tornando al menu principale (per esempio con ESC durante una partita del club) la partita non conta
const _mainClub = MainMenuScene.prototype.create;
MainMenuScene.prototype.create = function () { GS.clubGame = null; clubUiClose(); return _mainClub.apply(this, arguments); };
// il club come squadra CLB anche fuori dalla sezione (formazione, statistiche...)
const _startGameClub = startGame;
startGame = function () { try { clubRegister(); } catch (e) { /* */ } _startGameClub(); };
