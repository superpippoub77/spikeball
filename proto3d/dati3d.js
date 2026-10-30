// ============================================================
//  DATI DEL GIOCO PER IL PROTOTIPO 3D: le stesse squadre, giocatori, sponsor, arbitri e campionati
//  configurati nel gioco valgono anche qui.
//  - squadre: nazionali (config.js), club di squadre.json (o del file trascinato nel gioco, 'sf91_squadre'),
//    squadre create nell'EDITOR ('sf91_editor'), squadre dei campionati senza rosa (generate dal nome, come nel gioco)
//  - i miei giocatori ('sf91_miei_giocatori'): entrano nella rosa della loro squadra; se giochi con quella squadra
//    il tuo giocatore in campo sei tu (nome, numero, pelle, capelli e foto)
//  - sponsor e arbitri dell'EDITOR: sui cartelloni e sul seggiolone
//  - campionati: campionati.json (con calendario e risultati reali) e quelli creati nell'EDITOR (girone all'italiana)
// ============================================================
const R_SKINS = ['#f2c8a8', '#eeb088', '#e8b088', '#d8a070', '#b67a4c', '#8a5a38'];
const R_HAIR = ['#2a1408', '#3a2010', '#5a3010', '#141414', '#8a5a20', '#c09050', '#d8b060'];
const GEN_SURNAMES = ['ROSSI', 'BIANCHI', 'FERRARI', 'ESPOSITO', 'COLOMBO', 'RICCI', 'MARINO', 'GRECO', 'BRUNO', 'GALLO', 'CONTI', 'MANCINI', 'COSTA', 'GIORDANO', 'RIZZO', 'LOMBARDI', 'MORETTI', 'BARBIERI', 'FONTANA', 'SANTORO'];
const GEN_COLORS = [['#c81e3a', '#ffffff', '#1a1a1a'], ['#1f55c8', '#ffd23a', '#1a2a70'], ['#1e8a3a', '#ffffff', '#145a28'], ['#f07a1a', '#1a1a1a', '#1a1a1a'],
  ['#7a3ad8', '#ffffff', '#3a1a70'], ['#f4f4f4', '#c81e3a', '#c81e3a'], ['#1a1a1a', '#f2d020', '#1a1a1a'], ['#0aa0c8', '#ffffff', '#0a4a6a']];
export const asciiUp = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
const hashS = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
// percorsi delle immagini del gioco (loghi/...) visti dalla cartella proto3d/
export const rel = u => !u ? null : /^(data:|https?:|blob:)/.test(u) ? u : '../' + String(u).replace(/^\.?\//, '');
const ls = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };

export const DATA = { teams: [], groups: {}, byName: {}, sponsors: [], refs: [], camps: [], my: [], errors: [] };

// giocatore della rosa: nome in campo, numero, ruolo (P alzatore, C centrale, O opposto, S schiacciatore, L libero), aspetto, livello
function plFrom(p, i) {
  const sig = asciiUp(p.sigla || p.ruolo || 'S')[0], h = hashS(asciiUp(p.nome) + asciiUp(p.cognome) + i);
  return { name: asciiUp(p.cognome || p.nome).slice(0, 14) || 'GIOCATORE ' + (i + 1), num: p.numero != null && p.numero !== '' ? p.numero : i + 1,
    role: 'PCOSL'.includes(sig) ? sig : 'S', lv: Number(p.livello) || 5,
    sk: p.pelle && String(p.pelle)[0] === '#' ? p.pelle : R_SKINS[h % R_SKINS.length], ha: p.capelli && String(p.capelli)[0] === '#' ? p.capelli : R_HAIR[h % R_HAIR.length] };
}
// ordina la rosa per il campo: alzatore, due attaccanti, difensore / centrale, poi la panchina (per livello)
function orderRoster(list) {
  const left = list.slice().sort((a, b) => b.lv - a.lv), take = roles => { const i = left.findIndex(p => roles.includes(p.role)); return i >= 0 ? left.splice(i, 1)[0] : left.shift(); };
  const out = [take('P'), take('SO'), take('OS'), take('LC')].filter(Boolean);
  return out.concat(left);
}
function addTeam(code, T, group) {
  TEAMS[code] = T; DATA.teams.push(code); (DATA.groups[group] = DATA.groups[group] || []).push(code);
  DATA.byName[asciiUp(T.name)] = code;
}
function clubTeam(sq, group, extra = {}) {
  let code = asciiUp(sq.codice).replace(/[^A-Z0-9]/g, '').slice(0, 3) || asciiUp(sq.nome).split(/\s+/).map(w => w[0]).join('').replace(/[^A-Z0-9]/g, '').slice(0, 3);
  if (!code) return null;
  if (TEAMS[code] && !TEAMS[code].club) code = code.slice(0, 2) + 'X';   // non sovrascrive una nazionale
  const col = sq.colori || { maglia: sq.maglia, bordo: sq.bordo, pantaloncini: sq.pantaloncini };
  const players = (sq.giocatori || []).filter(p => p && (p.cognome || p.nome)).map(plFrom);
  if (players.length < 2) return null;
  addTeam(code, Object.assign({ name: asciiUp(sq.nome) || code, sh: col.maglia || '#2a48d8', tr: col.bordo || '#ffffff', so: col.pantaloncini || '#1a1a1a', sk: R_SKINS[0], ha: R_HAIR,
    names: players.map(p => p.name), plist: orderRoster(players), logo: rel(sq.logo), club: true, sex: asciiUp(sq.sesso || 'M')[0] }, extra), group);
  return code;
}
// squadra di un campionato senza rosa: colori e nomi inventati ma sempre uguali (dal nome)
function genTeam(name, logo) {
  const key = asciiUp(name); if (DATA.byName[key]) return DATA.byName[key];
  const h = hashS(key); let code = 'G' + (DATA.teams.length % 100).toString().padStart(2, '0');
  while (TEAMS[code]) code = 'G' + Math.floor(Math.random() * 99).toString().padStart(2, '0');
  const c = GEN_COLORS[h % GEN_COLORS.length], plist = [];
  for (let i = 0; i < 8; i++) plist.push({ name: GEN_SURNAMES[(h + i * 7) % GEN_SURNAMES.length], num: 1 + (h + i * 5) % 24, role: 'PSOLCSSO'[i], lv: 4 + (h >> i) % 3, sk: R_SKINS[(h + i) % R_SKINS.length], ha: R_HAIR[(h + i * 3) % R_HAIR.length] });
  addTeam(code, { name: key, sh: c[0], tr: c[1], so: c[2], sk: R_SKINS[0], ha: R_HAIR, names: plist.map(p => p.name), plist: orderRoster(plist), logo: rel(logo), club: true, generated: true, sex: 'M' }, 'ALTRE SQUADRE DEI CAMPIONATI');
  return code;
}
// calendario all'italiana (metodo del cerchio, come edCalendar dell'editor)
function calendar(names, ritorno) {
  const t = names.slice(); if (t.length % 2) t.push(null);
  const n = t.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const gare = [];
    for (let i = 0; i < n / 2; i++) { const a = t[i], b = t[n - 1 - i]; if (a && b) gare.push(r % 2 ? { casa: b, ospite: a } : { casa: a, ospite: b }); }
    rounds.push({ numero: r + 1, gare }); t.splice(1, 0, t.pop());
  }
  return ritorno ? rounds.concat(rounds.map((g, i) => ({ numero: rounds.length + i + 1, gare: g.gare.map(x => ({ casa: x.ospite, ospite: x.casa })) }))) : rounds;
}

export async function loadGameData() {
  // nazionali del gioco
  for (const code of Object.keys(TEAMS)) {
    const P = TEAMS[code]; if (!P.names) continue;
    DATA.teams.push(code); (DATA.groups.NAZIONALI = DATA.groups.NAZIONALI || []).push(code); DATA.byName[asciiUp(P.name)] = code;
  }
  // club: squadre.json (o il file trascinato nel gioco)
  let sq = ls('sf91_squadre');
  if (!sq) for (const f of ['../squadre.json', '../squadre.esempio.json']) { try { const r = await fetch(f, { cache: 'no-store' }); if (r.ok) { sq = await r.json(); break; } } catch (e) { /* */ } }
  for (const s of (sq && (sq.squadre || sq)) || []) if (asciiUp(s.tipo) !== 'NAZIONALE') clubTeam(s, 'CLUB');
  // editor: squadre, sponsor, arbitri, campionati
  const ed = ls('sf91_editor') || {};
  for (const s of ed.squadre || []) clubTeam(s, 'MIE SQUADRE', { mine: true });
  DATA.sponsors = (ed.sponsor || []).filter(s => s && s.nome).slice(0, 6);
  DATA.refs = (ed.arbitri || []).filter(a => a && (a.nome || a.cognome));
  // campionati: campionati.json e quelli dell'editor
  let cj = null; try { const r = await fetch('../campionati.json', { cache: 'no-store' }); if (r.ok) cj = await r.json(); } catch (e) { /* */ }
  for (const c of (cj && cj.campionati) || []) {
    const teams = (c.squadre || []).map(s => DATA.byName[asciiUp(s.nome)] || genTeam(s.nome, s.logo));
    const byN = n => DATA.byName[asciiUp(n)] || genTeam(n);
    const giornate = Array.isArray(c.giornate) && c.giornate.length ? c.giornate.map((g, gi) => ({ numero: g.numero || gi + 1, gare: (g.gare || []).map(x => ({ casa: byN(x.casa), ospite: byN(x.ospite), risultato: x.risultato })) }))
      : calendar(teams, true);
    DATA.camps.push({ id: 'json:' + (c.id || c.nome), nome: c.nome, sesso: asciiUp(c.sesso || 'M')[0], logo: rel(c.logo), teams, giornate });
  }
  for (const c of ed.campionati || []) {
    const teams = (c.squadre || []).map(s => (s.codice && TEAMS[s.codice] ? s.codice : null) || DATA.byName[asciiUp(s.nome)] || genTeam(s.nome)).filter(Boolean);
    if (teams.length >= 2) DATA.camps.push({ id: 'ed:' + c.id, nome: asciiUp(c.nome), sesso: 'M', logo: rel(c.logo), teams, giornate: calendar(teams, c.ritorno !== false) });
  }
  // i miei giocatori: nella rosa della loro squadra, in campo se titolari
  DATA.my = (ls('sf91_miei_giocatori') || []).filter(d => d && d.team);
  for (const d of DATA.my) {
    const T = TEAMS[d.team]; if (!T) continue;
    if (!T.plist) {   // nazionale: la rosa nasce dai nomi del gioco
      T.plist = T.names.map((n, i) => ({ name: n, num: [3, 7, 11, 14, 9, 5][i] || i + 1, role: 'PSOLCS'[i] || 'S', lv: 6, sk: T.sk, ha: T.ha[i % T.ha.length] }));
    }
    const sk = d.skinHex || R_SKINS[(d.pelle || 0) % R_SKINS.length], ha = d.hairHex || R_HAIR[(d.capelli || 0) % R_HAIR.length];
    const lv = d.stats ? Object.values(d.stats).reduce((a, b) => a + b, 0) / Object.values(d.stats).length / 10 : 5;
    const e = { name: asciiUp(d.cognome || d.nome).slice(0, 14), num: d.numero, role: asciiUp(d.ruolo || 'S')[0], lv, sk, ha, mine: true, foto: d.foto || null, sex: d.sesso || 'M' };
    // titolare: subito dopo l'alzatore (il posto che comandi tu), altrimenti in panchina
    if (d.titolare !== false) T.plist.splice(1, 0, e); else T.plist.push(e);
    T.names = T.plist.map(p => p.name);
  }
}

// ---------------- campionato nel prototipo (classifica salvata a parte: 'sf91_p3d_camp') ----------------
const CKEY = 'sf91_p3d_camp';
export function campState(c) { const all = ls(CKEY) || {}; return all[c.id] || { mine: null, res: {} }; }
export function campSave(c, st) { const all = ls(CKEY) || {}; all[c.id] = st; try { localStorage.setItem(CKEY, JSON.stringify(all)); } catch (e) { /* */ } }
const gid = (gi, k) => gi + '-' + k;
// risultato di una gara: reale (dal calendario), giocata qui o simulata
export function campResult(c, st, gi, k) { const g = c.giornate[gi].gare[k]; return st.res[gid(gi, k)] || (Array.isArray(g.risultato) && g.risultato.length === 2 ? g.risultato : null); }
export function campNext(c, st) {
  for (let gi = 0; gi < c.giornate.length; gi++) {
    const gare = c.giornate[gi].gare;
    for (let k = 0; k < gare.length; k++) { const g = gare[k]; if ((g.casa === st.mine || g.ospite === st.mine) && !campResult(c, st, gi, k)) return { gi, k, g }; }
  }
  return null;
}
// registra la tua gara e simula le altre della stessa giornata (e di quelle prima) ancora senza risultato
export function campRecord(c, st, next, mineWon) {
  const g = next.g, home = g.casa === st.mine;
  const sets = mineWon ? [3, Math.floor(Math.random() * 3)] : [Math.floor(Math.random() * 3), 3];
  st.res[gid(next.gi, next.k)] = home ? sets : [sets[1], sets[0]];
  for (let gi = 0; gi <= next.gi; gi++) c.giornate[gi].gare.forEach((x, k) => {
    if (campResult(c, st, gi, k)) return;
    const w = Math.random() < 0.5, l = Math.floor(Math.random() * 3);
    st.res[gid(gi, k)] = w ? [3, l] : [l, 3];
  });
  campSave(c, st);
}
// classifica: 3 punti per il 3-0 e il 3-1, 2 e 1 per il 3-2 (come in Italia)
export function campTable(c, st) {
  const T = {}; for (const code of c.teams) T[code] = { code, pts: 0, g: 0, w: 0, l: 0, sv: 0, sp: 0 };
  c.giornate.forEach((gg, gi) => gg.gare.forEach((g, k) => {
    const r = campResult(c, st, gi, k); if (!r || !T[g.casa] || !T[g.ospite]) return;
    const [a, b] = r, H = T[g.casa], A = T[g.ospite];
    H.g++; A.g++; H.sv += a; H.sp += b; A.sv += b; A.sp += a;
    const W = a > b ? H : A, L = a > b ? A : H, close = Math.min(a, b) === 2;
    W.w++; L.l++; W.pts += close ? 2 : 3; L.pts += close ? 1 : 0;
  }));
  return Object.values(T).sort((x, y) => y.pts - x.pts || y.w - x.w || (y.sv - y.sp) - (x.sv - x.sp));
}
