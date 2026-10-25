// ============================================================
//  CATEGORIE FIPAV: la piramide dei campionati e le squadre divise per serie
//  Nazionali (Lega e FIPAV): SuperLega/A1, A2, A3, B (maschile) o B1, B2 (femminile)
//  Regionali (Comitati Regionali): Serie C, Serie D
//  Territoriali (Comitati Territoriali): Prima, Seconda, Terza Divisione
//  (A3 femminile: nuova dalla stagione 2026/27.) La tabella si può cambiare nel JSON con "categorie".
//  Nei file JSON (tutti i campi sono facoltativi; la categoria si ricava anche dal nome del campionato):
//    campionati.json -> ogni campionato: "categoria": "Prima Divisione", "sesso": "M", "regione": "Piemonte",
//                       "territorio": "Piemonte Nord Est", "girone": "A", "promosse": 1, "retrocesse": 2
//    squadre.json    -> ogni squadra:    "categoria": "Serie D", "sesso": "F", "regione": ..., "territorio": ...
//  Le squadre di ogni categoria (anche quelle dei campionati, create in automatico) si scelgono nel SINGLE MATCH
//  con Q/E, in ordine di serie. Una squadra cambia categoria dall'editor (scheda CATEGORIE) oppure da sola
//  a fine campionato (promosse e retrocesse); i cambi restano nel browser ('sf91_categorie').
// ============================================================
const FIPAV_LEVELS = [
  // maschile
  { id: 'A1', sesso: 'M', nome: 'SuperLega', ambito: 'nazionale', livello: 1, alias: /superlega|serie\s*a\s*1|\ba1\b/ },
  { id: 'A2', sesso: 'M', nome: 'Serie A2', ambito: 'nazionale', livello: 2, alias: /serie\s*a\s*2|\ba2\b/ },
  { id: 'A3', sesso: 'M', nome: 'Serie A3', ambito: 'nazionale', livello: 3, alias: /serie\s*a\s*3|\ba3\b/ },
  { id: 'B', sesso: 'M', nome: 'Serie B', ambito: 'nazionale', livello: 4, alias: /serie\s*b\b(?!\s*[12])|^b$/ },
  { id: 'C', sesso: 'M', nome: 'Serie C', ambito: 'regionale', livello: 5, alias: /serie\s*c\b|^c$/ },
  { id: 'D', sesso: 'M', nome: 'Serie D', ambito: 'regionale', livello: 6, alias: /serie\s*d\b|^d$/ },
  { id: 'PD', sesso: 'M', nome: 'Prima Divisione', ambito: 'territoriale', livello: 7, alias: /prima\s*div|\b1\s*[°^ªa]?\s*div/ },
  { id: 'SD', sesso: 'M', nome: 'Seconda Divisione', ambito: 'territoriale', livello: 8, alias: /seconda\s*div|\b2\s*[°^ªa]?\s*div/ },
  { id: 'TD', sesso: 'M', nome: 'Terza Divisione', ambito: 'territoriale', livello: 9, alias: /terza\s*div|\b3\s*[°^ªa]?\s*div/ },
  // femminile
  { id: 'A1', sesso: 'F', nome: 'Serie A1', ambito: 'nazionale', livello: 1, alias: /serie\s*a\s*1|\ba1\b/ },
  { id: 'A2', sesso: 'F', nome: 'Serie A2', ambito: 'nazionale', livello: 2, alias: /serie\s*a\s*2|\ba2\b/ },
  { id: 'A3', sesso: 'F', nome: 'Serie A3', ambito: 'nazionale', livello: 3, alias: /serie\s*a\s*3|\ba3\b/ },
  { id: 'B1', sesso: 'F', nome: 'Serie B1', ambito: 'nazionale', livello: 4, alias: /serie\s*b\s*1|\bb1\b/ },
  { id: 'B2', sesso: 'F', nome: 'Serie B2', ambito: 'nazionale', livello: 5, alias: /serie\s*b\s*2|\bb2\b|serie\s*b\b|^b$/ },
  { id: 'C', sesso: 'F', nome: 'Serie C', ambito: 'regionale', livello: 6, alias: /serie\s*c\b|^c$/ },
  { id: 'D', sesso: 'F', nome: 'Serie D', ambito: 'regionale', livello: 7, alias: /serie\s*d\b|^d$/ },
  { id: 'PD', sesso: 'F', nome: 'Prima Divisione', ambito: 'territoriale', livello: 8, alias: /prima\s*div|\b1\s*[°^ªa]?\s*div/ },
  { id: 'SD', sesso: 'F', nome: 'Seconda Divisione', ambito: 'territoriale', livello: 9, alias: /seconda\s*div|\b2\s*[°^ªa]?\s*div/ },
  { id: 'TD', sesso: 'F', nome: 'Terza Divisione', ambito: 'territoriale', livello: 10, alias: /terza\s*div|\b3\s*[°^ªa]?\s*div/ }
];
const catKey = c => c.id + '|' + c.sesso;
const catByKey = k => FIPAV_LEVELS.find(c => catKey(c) === k) || null;
const catLabel = c => `${asciiUp(c.nome)} ${c.sesso}`;
// sesso da un campo o da un nome ("Maschile", "Femminile", "M", "F")
function sexOf(...txt) {
  for (const t of txt) {
    const s = asciiUp(t);
    if (!s) continue;
    if (/^F$|FEMMINIL|DONNE|WOMEN|FEMENIN|FEMININ|FRAUEN/.test(s)) return 'F';
    if (/^M$|MASCHIL|UOMINI|\bMEN\b|MASCULIN|HERREN|MANNER/.test(s)) return 'M';
  }
  return null;
}
// categoria da un testo ("Prima Divisione Maschile 2026/27", "Serie B1", "1^ DIV") e dal sesso
function catOf(txt, sesso) {
  const s = String(txt || '').toLowerCase();
  if (!s) return null;
  const sx = sesso || 'M';
  return FIPAV_LEVELS.find(c => c.sesso === sx && c.alias.test(s)) || null;
}
// categorie personalizzate nel JSON (stessa forma della tabella; sostituiscono quelle con lo stesso id e sesso)
function catApplyCustom(list) {
  if (!Array.isArray(list)) return;
  for (const x of list) {
    if (!x || !x.id) continue;
    const c = { id: asciiUp(x.id), sesso: sexOf(x.sesso) || 'M', nome: x.nome || x.id, ambito: x.ambito || 'territoriale', livello: Number(x.livello) || 50,
                alias: new RegExp((x.alias || [x.nome || x.id]).map(a => String(a).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')) };
    const i = FIPAV_LEVELS.findIndex(o => catKey(o) === catKey(c));
    if (i >= 0) FIPAV_LEVELS[i] = c; else FIPAV_LEVELS.push(c);
  }
  FIPAV_LEVELS.sort((a, b) => a.sesso.localeCompare(b.sesso) || a.livello - b.livello);
}

// cambi di categoria (promozioni, retrocessioni, spostamenti dall'editor): nome squadra -> chiave categoria
const CAT_MOVES = (() => { try { return JSON.parse(localStorage.getItem('sf91_categorie')) || {}; } catch (e) { return {}; } })();
function catSaveMoves() { try { localStorage.setItem('sf91_categorie', JSON.stringify(CAT_MOVES)); } catch (e) { /* */ } }
// informazioni di categoria delle squadre: codice -> { cat (chiave), base (chiave d'origine), regione, territorio, girone, lega }
const TEAM_CAT = {};
const teamCatKey = code => { const t = TEAM_CAT[code]; return t ? (CAT_MOVES[TEAMS[code].name] || t.base) : null; };

// campionati: categoria e sesso dai campi o dal nome; ordinati dalla serie più alta
const _loadLeaguesCat = loadLeagues;
loadLeagues = async function () {
  await _loadLeaguesCat();
  let raw = null; try { raw = JSON.parse(localStorage.getItem('sf91_campionati') || 'null'); } catch (e) { /* */ }
  if (raw && raw.categorie) catApplyCustom(raw.categorie);
  for (const lg of LEAGUES.list) {
    lg.sesso = sexOf(lg.sesso, lg.nome) || 'M';
    const c = catOf(lg.categoria, lg.sesso) || catOf(lg.nome, lg.sesso);
    lg.cat = c ? catKey(c) : null;
  }
  const lvl = lg => (catByKey(lg.cat) || { livello: 99 }).livello;
  LEAGUES.list.sort((a, b) => lvl(a) - lvl(b) || a.sesso.localeCompare(b.sesso) || String(a.nome).localeCompare(String(b.nome)));
};
// dopo le squadre: le squadre dei campionati vengono create subito e tutte vanno nei gruppi per categoria
const _loadRostersCat = loadRosters;
loadRosters = async function () {
  await _loadRostersCat();
  let raw = null; try { raw = JSON.parse(localStorage.getItem('sf91_squadre') || 'null'); } catch (e) { /* */ }
  if (!raw) try { const r = await fetch('squadre.json', { cache: 'no-store' }); if (r.ok) raw = await r.json(); } catch (e) { /* */ }
  if (raw && raw.categorie) catApplyCustom(raw.categorie);
  // squadre di squadre.json con la categoria indicata
  for (const sq of (raw && raw.squadre) || []) {
    const code = Object.keys(TEAMS).find(c => TEAMS[c].club && TEAMS[c].name === asciiUp(sq.nome));
    const sx = sexOf(sq.sesso, sq.nome) || 'M', c = catOf(sq.categoria, sx);
    if (code && c) TEAM_CAT[code] = { base: catKey(c), regione: sq.regione || '', territorio: sq.territorio || '', girone: '' };
  }
  // squadre dei campionati (create ora, non più solo quando si apre il campionato)
  for (const lg of LEAGUES.list) {
    const codes = leagueTeams(lg);
    for (const s of lg.squadre) {
      const m = codes[s.nome]; if (!m) continue;
      if (!TEAM_CAT[m.code] && lg.cat) TEAM_CAT[m.code] = { base: lg.cat, regione: lg.regione || '', territorio: lg.territorio || '', girone: lg.girone || '' };
    }
  }
  // squadre create nell'editor con la categoria scelta
  for (const t of (typeof ED !== 'undefined' ? ED.data.squadre : [])) {
    const code = edTeamCode(t);
    if (TEAMS[code] && t.categoria && catByKey(t.categoria)) TEAM_CAT[code] = { base: t.categoria, regione: '', territorio: t.territorio || '', girone: '' };
  }
  catBuildGroups();
};
// gruppi della selezione squadre: nazionali e MIE SQUADRE come prima, poi le categorie dalla più alta, poi i club senza categoria
function catBuildGroups() {
  const keep = [], keepN = [];
  GROUPS.forEach((g, i) => { if (!/^CLUB/.test(GROUP_NAMES[i]) && !g._cat) { keep.push(g); keepN.push(GROUP_NAMES[i]); } });
  const by = new Map();
  for (const code of Object.keys(TEAM_CAT)) {
    const k = teamCatKey(code), c = catByKey(k); if (!c) continue;
    const t = TEAM_CAT[code], sub = [t.territorio || t.regione, t.girone ? 'GIR. ' + asciiUp(t.girone) : ''].filter(Boolean).join(' · ');
    const gk = k + '|' + (CAT_MOVES[TEAMS[code].name] ? '' : sub);   // le squadre spostate vanno nel gruppo generale della nuova categoria
    if (!by.has(gk)) by.set(gk, { c, sub: CAT_MOVES[TEAMS[code].name] ? '' : sub, codes: [] });
    by.get(gk).codes.push(code);
  }
  const cats = [...by.values()].sort((a, b) => a.c.sesso.localeCompare(b.c.sesso) || a.c.livello - b.c.livello || a.sub.localeCompare(b.sub));
  const outG = [], outN = [];
  for (const x of cats) {
    x.codes.sort((a, b) => TEAMS[a].name.localeCompare(TEAMS[b].name));
    for (let i = 0; i < x.codes.length; i += 12) {
      const g = x.codes.slice(i, i + 12); g._cat = x.c;
      outG.push(g); outN.push(catLabel(x.c) + (x.sub ? ' · ' + asciiUp(x.sub) : '') + (x.codes.length > 12 ? ` ${i / 12 + 1}` : ''));
    }
  }
  const placed = new Set(Object.keys(TEAM_CAT).filter(c => teamCatKey(c)));
  const free = ROSTER.teams.filter(c => TEAMS[c] && TEAMS[c].club && !TEAMS[c].custom && !placed.has(c));
  for (let i = 0; i < free.length; i += 12) { outG.push(free.slice(i, i + 12)); outN.push(free.length > 12 ? `CLUB ${i / 12 + 1}` : 'CLUB'); }
  GROUPS.length = 0; GROUP_NAMES.length = 0;
  keep.concat(outG).forEach(g => GROUPS.push(g)); keepN.concat(outN).forEach(n => GROUP_NAMES.push(n));
}
// sposta una squadra in un'altra categoria (null = torna a quella d'origine)
function catMove(code, key) {
  const nm = TEAMS[code].name;
  if (!TEAM_CAT[code]) TEAM_CAT[code] = { base: key, regione: '', territorio: '', girone: '' };
  if (!key || key === TEAM_CAT[code].base) delete CAT_MOVES[nm]; else CAT_MOVES[nm] = key;
  catSaveMoves(); catBuildGroups();
}
// categoria vicina nella piramide (dir -1 = sopra, +1 = sotto)
function catStep(key, dir) {
  const c = catByKey(key); if (!c) return null;
  const same = FIPAV_LEVELS.filter(x => x.sesso === c.sesso).sort((a, b) => a.livello - b.livello), i = same.indexOf(c);
  const n = same[i + dir]; return n ? catKey(n) : null;
}

// fine campionato: le prime "promosse" salgono di categoria, le ultime "retrocesse" scendono (una volta sola)
const _hubCreateCat = LeagueHubScene.prototype.create;
LeagueHubScene.prototype.create = function () {
  _hubCreateCat.apply(this, arguments);
  const lg = this.lg, st = this.st;
  if (this.cr >= 0 || !lg.cat) return;
  const up = lg.promosse !== undefined ? Number(lg.promosse) : 1, down = lg.retrocesse !== undefined ? Number(lg.retrocesse) : 0;
  const tab = standings(lg, st), codes = leagueTeams(lg);
  const ups = tab.slice(0, up).map(t => t.nome), downs = down ? tab.slice(-down).map(t => t.nome) : [];
  if (!st.moved) {
    const hi = catStep(lg.cat, -1), lo = catStep(lg.cat, 1);
    for (const n of ups) if (hi && codes[n]) catMove(codes[n].code, hi);
    for (const n of downs) if (lo && codes[n]) catMove(codes[n].code, lo);
    st.moved = true; leagueSave(lg, st);
  }
  const hi = catByKey(catStep(lg.cat, -1)), lo = catByKey(catStep(lg.cat, 1));
  const R = (y, t, col) => this.add.text(212, y, t, { ...UI.f(4.5, col, true), wordWrap: { width: 100 } });
  if (hi && ups.length) R(100, `PROMOSSE IN ${asciiUp(hi.nome)}: ${ups.map(shortName).join(', ')}`, '#7ae07a');
  if (lo && downs.length) R(130, `RETROCESSE IN ${asciiUp(lo.nome)}: ${downs.map(shortName).join(', ')}`, '#ff8a6a');
};
