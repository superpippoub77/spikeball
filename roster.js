// ============================================================
//  SQUADRE DA FILE JSON
//  Club nuovi (quanti se ne vuole) e nazionali con i propri giocatori:
//  nome, cognome, numero di maglia, ruolo, età, livello.
//  Si caricano da squadre.json (con un server locale) oppure trascinando
//  un file .json sulla finestra del gioco (resta salvato nel browser).
//  Formato: vedi squadre.esempio.json e il README.
// ============================================================
// INDICE DEL FILE
//   1. ruoli (ROLE_WORDS, SLOT_ROLES) e scelta dei 4 titolari (pickStarters)
//   2. rosterTeam: da una squadra del JSON a una voce di TEAMS (+ TEAM_STATS)
//   3. caricamento (squadre.json, esempio, file trascinato) e loghi (preloadLogos, LOGO_CACHE)
//   4. stemmi/loghi nelle bandiere, trascinamento dei file, avviso nel menu principale
const ROSTER = { source: null, teams: [], errors: [] };

// sigle di ruolo: P alzatore, C centrale, O opposto, S schiacciatore/banda, L libero
const ROLE_WORDS = { ALZATORE: 'P', PALLEGGIATORE: 'P', CENTRALE: 'C', OPPOSTO: 'O', BANDA: 'S', SCHIACCIATORE: 'S', MARTELLO: 'S', LIBERO: 'L' };
// posti in campo (vedi HOMES): 0 centrale, 1 alzatore, 2 attaccante (asso), 3 difensore/battitore
const SLOT_ROLES = [['C'], ['P'], ['O', 'S'], ['L', 'S']];
const SLOT_ORDER = [1, 0, 2, 3];   // prima l'alzatore, poi centrale, asso, difensore
const R_SKINS = ['#f2c8a8', '#eeb088', '#e8b088', '#d8a070', '#b67a4c', '#8a5a38'];
const R_HAIR = ['#2a1408', '#3a2010', '#5a3010', '#141414', '#8a5a20', '#c09050', '#d8b060'];

const asciiUp = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
function roleCodes(pl) {
  const out = [];
  for (const part of String(pl.sigla || '').split('/')) { const c = asciiUp(part)[0]; if (c && 'PCOSL'.includes(c)) out.push(c); }
  const w = ROLE_WORDS[asciiUp(pl.ruolo)];
  if (w && !out.includes(w)) out.push(w);
  return out.length ? out : ['S'];
}
// livello libero (es. 1-10) → valore 0-100 come le statistiche delle nazionali
const lvToStat = lv => clamp(Math.round(40 + (Number(lv) || 5) * 7), 30, 99);

// sceglie i 4 in campo per ruolo principale (prima sigla) e livello; 'wanted' = numeri di maglia indicati come titolari
function pickStarters(players, wanted) {
  let pool = players;
  if (Array.isArray(wanted) && wanted.length) {
    const sel = wanted.map(n => players.find(p => String(p.numero) === String(n))).filter(Boolean);
    if (sel.length >= 4) pool = sel;
  }
  const left = pool.slice(), slots = [];
  const lv = p => Number(p.livello) || 0;
  for (const s of SLOT_ORDER) {
    const fit = left.filter(p => p._roles.some(r => SLOT_ROLES[s].includes(r)));
    // prima chi ha quel ruolo come principale (prima sigla), poi il ruolo preferito del posto, poi il livello
    const sec = p => SLOT_ROLES[s].includes(p._roles[0]) ? 0 : 1, pref = p => SLOT_ROLES[s].indexOf(p._roles.find(r => SLOT_ROLES[s].includes(r)));
    fit.sort((a, b) => sec(a) - sec(b) || pref(a) - pref(b) || lv(b) - lv(a));
    const p = fit[0] || left.slice().sort((a, b) => lv(b) - lv(a))[0];
    if (!p) break;
    slots[s] = p; left.splice(left.indexOf(p), 1);
  }
  return slots;
}

// costruisce la squadra: colori, nomi (cognomi), numeri, ruoli, età, livelli dei 4 titolari e statistiche; restituisce il codice
function rosterTeam(sq, i) {
  const err = m => ROSTER.errors.push(`${sq.nome || 'squadra ' + (i + 1)}: ${m}`);
  const tipo = asciiUp(sq.tipo) === 'NAZIONALE' ? 'nazionale' : 'club';
  let code = asciiUp(sq.codice).replace(/[^A-Z0-9]/g, '').slice(0, 3);
  if (!code) code = asciiUp(sq.nome).split(/\s+/).map(w => w[0]).join('').replace(/[^A-Z0-9]/g, '').slice(0, 3);
  if (code.length < 2) return err('manca il codice (3 lettere)');
  if (tipo === 'club' && TEAMS[code] && !TEAMS[code].club) return err(`il codice ${code} è già di una nazionale: usane un altro`);
  if (tipo === 'nazionale' && !TEAMS[code]) return err(`nazionale ${code} sconosciuta`);
  const players = (Array.isArray(sq.giocatori) ? sq.giocatori : []).filter(p => p && (p.cognome || p.nome));
  if (players.length < 4) return err('servono almeno 4 giocatori');
  players.forEach(p => { p._roles = roleCodes(p); });
  const st = pickStarters(players, sq.titolari);
  // cognome in maiuscolo; con cognomi uguali si aggiunge l'iniziale del nome
  const surname = p => asciiUp(p.cognome || p.nome);
  const label = p => players.filter(q => surname(q) === surname(p)).length > 1 ? `${asciiUp(p.nome)[0] || ''}.${surname(p)}` : surname(p);
  const base = TEAMS[code] || {};
  const col = sq.colori || {};
  const H = p => hashStr(asciiUp(p.nome) + asciiUp(p.cognome));
  const pal = Object.assign({}, base, {
    name: asciiUp(sq.nome) || base.name || code,
    sh: col.maglia || base.sh || '#2a48d8', tr: col.bordo || base.tr || '#ffffff', so: col.pantaloncini || base.so || '#1a1a1a',
    sk: base.sk || R_SKINS[0],
    fl: col.pavimento ? parseInt(String(col.pavimento).replace('#', ''), 16) : (base.fl || 0x2f6fe0),
    names: st.map(label),
    sks: st.map(p => p.pelle || (tipo === 'nazionale' ? base.sk : R_SKINS[H(p) % R_SKINS.length])),
    ha: st.map(p => p.capelli || R_HAIR[H(p) % R_HAIR.length]),
    shs: st.map(p => p.maglia || null), trs: st.map(p => p.bordo || null),   // maglia diversa (es. libero)
    nums: st.map(p => p.numero != null && p.numero !== '' ? String(p.numero) : ''),
    roles: st.map(p => asciiUp(p.sigla) || p._roles[0]),
    ages: st.map(p => Number(p.eta) || null),
    lv: st.map(p => Number(p.livello) || 5),
    roster: players.map(p => ({ nome: asciiUp(p.nome), cognome: surname(p), numero: p.numero, ruolo: asciiUp(p.ruolo), sigla: asciiUp(p.sigla), eta: Number(p.eta) || null, livello: Number(p.livello) || null })),
    _players: players,   // rosa completa: serve alla scelta della formazione (lineup.js)
    club: tipo === 'club', badge: asciiUp(sq.sigla_stemma || '').slice(0, 3) || code, logo: sq.logo || base.logo || null
  });
  if (!sq.colori && tipo === 'club') err('nessun colore indicato: uso maglia blu');
  TEAMS[code] = pal;
  // statistiche: indicate nel file oppure ricavate dal livello dei titolari (l'età incide sulla velocità)
  if (Array.isArray(sq.statistiche) && sq.statistiche.length === 3) TEAM_STATS[code] = sq.statistiche.map(v => clamp(Number(v) || 70, 30, 99));
  else {
    const v = st.map(p => lvToStat(p.livello)), avg = a => a.reduce((s, x) => s + x, 0) / a.length;
    const ages = pal.ages.filter(Boolean), age = ages.length ? avg(ages) : 26;
    TEAM_STATS[code] = [Math.round(avg([v[0], v[2], v[2]])), Math.round(avg([v[3], v[3], v[1]])), clamp(Math.round(avg(v) - Math.max(0, age - 30) + Math.max(0, 20 - age) * 0.5), 30, 99)];
  }
  ROSTER.teams.push(code);
  return code;
}

function applyRosters(data, source) {
  const list = data && (Array.isArray(data) ? data : data.squadre);
  if (!Array.isArray(list)) { ROSTER.errors.push(`${source}: manca l'elenco "squadre"`); return; }
  ROSTER.source = source;
  list.forEach(rosterTeam);
  // i club vanno in gruppi da 12 nella selezione squadre
  const clubs = ROSTER.teams.filter(c => TEAMS[c].club);
  for (let i = 0; i < clubs.length; i += 12) { GROUPS.push(clubs.slice(i, i + 12)); GROUP_NAMES.push(clubs.length > 12 ? `CLUB ${i / 12 + 1}` : 'CLUB'); }
}

async function loadRosters() {
  let data = null, src = null;
  try { const s = localStorage.getItem('sf91_squadre'); if (s) { data = JSON.parse(s); src = 'file trascinato'; } } catch (e) { /* storage non disponibile */ }
  for (const f of ['squadre.json', 'squadre.esempio.json']) {
    if (data) break;
    try { const r = await fetch(f, { cache: 'no-store' }); if (r.ok) { data = await r.json(); src = f; } }
    catch (e) { /* file:// o file assente: si può trascinare il file sulla finestra */ }
  }
  if (data) { try { applyRosters(data, src); } catch (e) { ROSTER.errors.push(`${src}: ${e.message}`); } }
  // loghi delle squadre (squadre.json e campionati.json), caricati prima dell'avvio
  const urls = Object.values(TEAMS).map(t => t.logo);
  if (typeof LEAGUES !== 'undefined') LEAGUES.list.forEach(l => l.squadre.forEach(s => urls.push(s.logo)));
  await preloadLogos(urls);
}

// ---------------- loghi ----------------
// immagini dei loghi già caricate (indirizzo -> Image); drawFlag le usa al posto dello stemma
const LOGO_CACHE = {};
function preloadLogos(urls) {
  const web = /^https?:$/.test(location.protocol);
  return Promise.all([...new Set(urls.filter(Boolean))].map(u => new Promise(done => {
    // da file:// il browser non lascia usare le immagini nel gioco (solo data:...): resta lo stemma
    if (!web && !String(u).startsWith('data:')) { ROSTER.errors.push(`logo ${u}: apri il gioco con un server locale`); return done(); }
    const im = new Image();
    try { if (/^https?:/.test(u) && new URL(u).origin !== location.origin) im.crossOrigin = 'anonymous'; } catch (e) { /* */ }
    im.onload = () => {
      try {   // l'immagine deve poter andare in una texture (altrimenti il canvas resta "sporco")
        const t = document.createElement('canvas'); t.width = t.height = 2; const g = t.getContext('2d');
        g.drawImage(im, 0, 0, 2, 2); g.getImageData(0, 0, 1, 1); LOGO_CACHE[u] = im;
      } catch (e) { ROSTER.errors.push(`logo ${u}: il sito non permette di usarlo`); }
      done();
    };
    im.onerror = () => { ROSTER.errors.push(`logo non trovato: ${u}`); done(); };
    setTimeout(done, 5000);
    im.src = u;
  })));
}

// stemma dei club al posto della bandiera
const _drawFlagRoster = drawFlag;
drawFlag = function (c, x, y, w, h, code) {
  const P = TEAMS[code];
  if (!P || !P.club) return _drawFlagRoster(c, x, y, w, h, code);
  const img = P.logo && LOGO_CACHE[P.logo];
  if (img) {   // logo della squadra, intero e centrato su fondo bianco
    c.fillStyle = '#ffffff'; c.fillRect(x, y, w, h);
    const k = Math.min(w / img.width, h / img.height) * 0.94, iw = img.width * k, ih = img.height * k;
    c.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
    return;
  }
  c.fillStyle = P.sh; c.fillRect(x, y, w, h);
  c.fillStyle = P.tr; c.fillRect(x, y + h * 0.72, w, h * 0.12); c.fillRect(x + w * 0.08, y, w * 0.07, h);
  c.fillStyle = P.so; c.fillRect(x, y + h * 0.84, w, h * 0.16);
  c.fillStyle = P.tr; c.font = `bold ${Math.max(4, h * 0.42)}px Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(P.badge, x + w * 0.55, y + h * 0.4); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
};

// trascina un file .json sulla finestra: le squadre vengono salvate nel browser e la pagina si ricarica
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
  e.preventDefault();
  const f = e.dataTransfer && e.dataTransfer.files[0];
  if (!f) return;
  f.text().then(t => {
    try {
      const d = JSON.parse(t);
      if (d && d.campionati) localStorage.setItem('sf91_campionati', t);
      if (!d || !d.campionati || d.squadre) localStorage.setItem('sf91_squadre', t);
      location.reload();
    }
    catch (err) { alert('File squadre non valido: ' + err.message); }
  });
});

// le squadre vanno caricate prima di avviare il gioco
const _startGameRoster = startGame;
startGame = function () { loadRosters().finally(_startGameRoster); };

// menu principale: da dove arrivano le squadre, eventuali errori; CANC dimentica il file trascinato
const _mainMenuCreate = MainMenuScene.prototype.create;
MainMenuScene.prototype.create = function () {
  _mainMenuCreate.call(this);
  const n = ROSTER.teams.filter(c => TEAMS[c] && !TEAMS[c].generated).length;   // (le squadre generate dei campionati non contano)
  const msg = n ? `SQUADRE: ${n} da ${ROSTER.source}${ROSTER.source === 'file trascinato' ? '  (CANC per toglierlo)' : ''}` : 'SQUADRE PERSONALIZZATE: trascina un file .json sulla finestra';
  // in alto a destra (sotto le schede c'è la riga GRAFICA)
  this.add.text(314, 4, msg, UI.f(4.5, ROSTER.errors.length ? '#ff9a6a' : '#8aa0c8')).setOrigin(1, 0);
  if (ROSTER.errors.length) this.add.text(314, 11, ROSTER.errors[0], UI.f(4.5, '#ff9a6a')).setOrigin(1, 0);
  this.input.keyboard.on('keydown-DELETE', () => { try { localStorage.removeItem('sf91_squadre'); localStorage.removeItem('sf91_campionati'); } catch (e) { /* */ } location.reload(); });
};
