// ============================================================
//  EDITOR: squadre, arbitri, sponsor e campionati creati dal giocatore, e profilo sul server
//  - SQUADRE: nome, sigla, colori, logo, allenatore, dirigente, maschile/femminile e rosa. La rosa parte da giocatori
//    inventati (o copiati da una squadra esistente, anche di un campionato) e si modifica a piacere, con le foto.
//    Le squadre diventano club veri e propri (rosterTeam in roster.js): gruppo MIE SQUADRE nella selezione, formazione,
//    I MIEI GIOCATORI. Una squadra con lo stesso nome di una squadra di un campionato la sostituisce in quel campionato.
//  - ARBITRI: nome, nazione e foto; in partita ne viene scelto uno (nome e foto nel pannello della battuta).
//  - SPONSOR: nome, colore e logo, sui cartelloni del palazzetto (ARCADE) e sulla balaustra (arene moderne).
//  - CAMPIONATI: girone all'italiana (andata o andata e ritorno) tra le squadre scelte, giocato come gli altri campionati.
//  - PROFILO: utente e password (api/profilo.php). Salva sul server tutto quello che il gioco tiene nel browser
//    (squadre, arbitri, sponsor, campionati, i miei giocatori, formazioni, classifiche) e lo ricarica da un altro dispositivo.
//  Tutto resta nel browser in localStorage 'sf91_editor'. L'editor è una pagina HTML sopra il gioco (comoda anche sul telefono).
// ============================================================
// INDICE DEL FILE
//   1. ED: dati salvati, giocatori inventati, girone all'italiana
//   2. all'avvio: squadre (loadRosters), campionati (loadLeagues), sponsor nei cartelloni, arbitro, allenatore nella presentazione
//   3. profilo sul server (PROF)
//   4. pagina dell'editor (openEditor) e scena Editor
const ED_KEY = 'sf91_editor';
const ED = {
  data: { squadre: [], arbitri: [], sponsor: [], campionati: [] },
  load() {
    try { const d = JSON.parse(localStorage.getItem(ED_KEY)); if (d) Object.assign(this.data, d); } catch (e) { /* */ }
    for (const k of ['squadre', 'arbitri', 'sponsor', 'campionati']) if (!Array.isArray(this.data[k])) this.data[k] = [];
  },
  save() {
    try { localStorage.setItem(ED_KEY, JSON.stringify(this.data)); return true; }
    catch (e) { alert('Spazio del browser pieno: togli qualche foto o logo.'); return false; }
  },
  id: () => 'e' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)
};
ED.load();

const ED_FEM_FIRST = ['Giulia', 'Sara', 'Martina', 'Chiara', 'Francesca', 'Alessia', 'Elena', 'Sofia', 'Valentina', 'Federica', 'Ilaria', 'Beatrice',
  'Camilla', 'Anna', 'Marta', 'Laura', 'Silvia', 'Paola', 'Noemi', 'Aurora', 'Greta', 'Alice', 'Giorgia', 'Irene', 'Elisa', 'Nicole', 'Debora', 'Serena'];
const ED_ROLES = [['P', 'Alzatore'], ['C', 'Centrale'], ['O', 'Opposto'], ['S', 'Schiacciatore'], ['L', 'Libero']];
// rosa inventata: 12 giocatori con i ruoli di una squadra vera, numeri diversi, età e livelli vari
function edInventPlayers(fem) {
  const roles = ['P', 'P', 'C', 'C', 'C', 'O', 'O', 'S', 'S', 'S', 'S', 'L'], used = new Set(), nums = new Set(), rnd = a => a[Math.floor(Math.random() * a.length)];
  const base = 4.5 + Math.random() * 2;
  return roles.map(sigla => {
    let nm; do { nm = rnd(fem ? ED_FEM_FIRST : GEN_FIRST) + '|' + rnd(GEN_LAST); } while (used.has(nm)); used.add(nm);
    let n; do { n = 1 + Math.floor(Math.random() * 24); } while (nums.has(n)); nums.add(n);
    const [nome, cognome] = nm.split('|');
    return { nome, cognome, numero: n, sigla, eta: 18 + Math.floor(Math.random() * 16), livello: clamp(Math.round(base + (Math.random() - 0.5) * 2.4), 3, 8), foto: null };
  });
}
// rosa copiata da una squadra già nel gioco (club di squadre.json, nazionale, squadra di un campionato)
function edCopyPlayers(code) {
  const P = TEAMS[code];
  if (P.roster) return P.roster.map(p => ({ nome: p.nome, cognome: p.cognome, numero: p.numero, sigla: (p.sigla || 'S')[0], eta: p.eta, livello: p.livello || 5, foto: null }));
  const pool = teamPool(code).filter(p => !p.me);
  return pool.map((p, i) => ({ nome: '', cognome: p.label, numero: p.num || i + 1, sigla: (p.role || 'S')[0], eta: p.age || 24, livello: Math.round(p.lv || 5), foto: null }));
}
// girone all'italiana (metodo del cerchio): ogni squadra incontra tutte le altre; con il ritorno a campi invertiti
function edCalendar(names, ritorno) {
  const t = names.slice(); if (t.length % 2) t.push(null);
  const n = t.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const gare = [];
    for (let i = 0; i < n / 2; i++) {
      const a = t[i], b = t[n - 1 - i];
      if (a && b) gare.push(r % 2 ? [b, a] : [a, b]);
    }
    rounds.push(gare);
    t.splice(1, 0, t.pop());
  }
  const all = ritorno ? rounds.concat(rounds.map(g => g.map(([a, b]) => [b, a]))) : rounds;
  return all.map((g, i) => ({ numero: i + 1, gare: g.map(([casa, ospite], k) => ({ gara: `${i + 1}-${k + 1}`, casa, ospite })) }));
}
const edTeamCode = t => asciiUp(t.codice).replace(/[^A-Z0-9]/g, '').slice(0, 3);

// ---------------- all'avvio ----------------
// squadre: dopo quelle di squadre.json diventano club (stesso formato) e vanno nel gruppo MIE SQUADRE
const _loadRostersEd = loadRosters;
loadRosters = async function () {
  await _loadRostersEd();
  const mine = [];
  for (const t of ED.data.squadre) {
    const sq = { tipo: 'club', codice: edTeamCode(t), nome: t.nome, logo: t.logo || null,
                 colori: { maglia: t.maglia, bordo: t.bordo, pantaloncini: t.pantaloncini, pavimento: t.pavimento },
                 giocatori: (t.giocatori || []).map(p => Object.assign({}, p, { ruolo: (ED_ROLES.find(r => r[0] === p.sigla) || ED_ROLES[3])[1], pelle: p.pelle || undefined, capelli: p.capelli || undefined })) };
    const code = rosterTeam(sq, 0);
    if (!code) continue;
    Object.assign(TEAMS[code], { custom: true, allenatore: t.allenatore || '', dirigente: t.dirigente || '', sesso: t.sesso || 'M' });
    mine.push(code);
  }
  if (mine.length) {
    if (!ROSTER.source) ROSTER.source = 'editor';
    for (let i = 0; i < mine.length; i += 12) { GROUPS.push(mine.slice(i, i + 12)); GROUP_NAMES.push(mine.length > 12 ? `MIE SQUADRE ${i / 12 + 1}` : 'MIE SQUADRE'); }
  }
  // loghi delle squadre, degli sponsor e foto degli arbitri (immagini già nel browser)
  await preloadLogos(ED.data.squadre.map(t => t.logo).concat(ED.data.sponsor.map(s => s.logo), ED.data.arbitri.map(a => a.foto)));
};
// campionati creati nell'editor, accanto a quelli di campionati.json
const _loadLeaguesEd = loadLeagues;
loadLeagues = async function () {
  await _loadLeaguesEd();
  for (const c of ED.data.campionati) {
    const sq = (c.squadre || []).filter(s => s && s.nome);
    if (sq.length < 2) continue;
    LEAGUES.list.push({ id: 'ed_' + c.id, nome: c.nome || 'CAMPIONATO', set: c.set || 3, squadre: sq.map(s => ({ nome: s.nome, codice: s.codice })),
                        giornate: edCalendar(sq.map(s => s.nome), !!c.ritorno) });
  }
};

// sponsor: i nomi vanno sui cartelloni al posto di quelli inventati; con il logo si vede il logo
for (const [i, s] of ED.data.sponsor.slice(0, 6).entries()) { if (!s.nome) continue; ADS1[i] = asciiUp(s.nome); if (i < ADS2.length) ADS2[i] = asciiUp(s.nome); }
function edSponsorBoard(c, x, y, w, h, s) {
  const img = s.logo && LOGO_CACHE[s.logo];
  c.fillStyle = s.colore || '#ffffff'; c.fillRect(x, y, w, h);
  if (img) {
    const k = Math.min((w - 2) / img.width, (h - 2) / img.height), iw = img.width * k, ih = img.height * k;
    c.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  } else {
    const col = parseInt((s.colore || '#ffffff').slice(1), 16), dark = ((col >> 16) * 0.3 + ((col >> 8) & 255) * 0.59 + (col & 255) * 0.11) < 140;
    c.fillStyle = dark ? '#ffffff' : '#1a1a2a'; c.font = `bold ${Math.round(h * 0.62)}px Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(asciiUp(s.nome), x + w / 2, y + h / 2 + 0.5, w - 4); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  }
}
const _makeArenaEd = makeArena;
makeArena = function (scene) {
  const had = scene.textures.exists('bg_ads'), r = _makeArenaEd.apply(this, arguments), S = ED.data.sponsor.filter(s => s.nome);
  if (had || !S.length) return r;
  for (const [key, step, x0, y0, w, h, cnt] of [['bg_ads', 76, 4, 5, 64, 12, ADS1.length], ['bg_boards', 92, 6, 3, 80, 18, ADS2.length]]) {
    const t = scene.textures.get(key), c = t.getContext(), W = t.getSourceImage().width / GR;
    for (let i = 0, x = x0; x < W; i++, x += step) { const s = S[i % cnt]; if (s && i % cnt < S.length) edSponsorBoard(c, x, y0, w, h, s); }
    t.refresh();
  }
  return r;
};
const _makeModernArenaEd = makeModernArena;
makeModernArena = function (scene, id) {
  const key = 'marena_' + id, had = scene.textures.exists(key), r = _makeModernArenaEd.apply(this, arguments), S = ED.data.sponsor.filter(s => s.nome);
  if (had || !S.length) return r;
  const t = scene.textures.get(key), c = t.getContext(), Y = v => v - ATOP;
  for (let i = 0, x = 8; x < 552; i++, x += 92) edSponsorBoard(c, x, Y(179), 80, 15, S[i % S.length]);
  t.refresh();
  return r;
};

// arbitro: uno di quelli creati, con il nome (e la foto) nel pannello della battuta
const _matchCreateEd = MatchScene.prototype.create;
MatchScene.prototype.create = function () {
  _matchCreateEd.apply(this, arguments);
  const A = ED.data.arbitri.filter(a => a.nome || a.cognome);
  if (!A.length || !this.serveRef) return;
  const a = A[Math.floor(Math.random() * A.length)];
  this.edRef = [this.add.text(132, 112, `ARBITRO ${asciiUp(a.nome)} ${asciiUp(a.cognome)}${a.nazione ? ' (' + asciiUp(a.nazione) + ')' : ''}`, UI.f(5, '#ffffff', true))
    .setOrigin(0.5, 0).setStroke('#0a1a4a', 3).setScrollFactor(0).setDepth(2101).setVisible(false)];
  const im = a.foto && LOGO_CACHE[a.foto];
  if (im) {
    const key = 'refph_' + a.id;
    if (!this.textures.exists(key)) { const { t, c } = canvasTex(this, key, 24, 24); c.drawImage(im, 0, 0, 24, 24); c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, 23, 23); texDone(t); }
    this.edRef.push(this.add.image(168, 48, key).setScrollFactor(0).setDepth(2102).setVisible(false));
  }
};
const _showServePanelEd = MatchScene.prototype.showServePanel;
MatchScene.prototype.showServePanel = function (on) {
  _showServePanelEd.apply(this, arguments);
  if (this.edRef) this.edRef.forEach(o => o.setVisible(this.serveRef.visible));
};
// presentazione della formazione: allenatore e dirigente delle squadre create
const _lineupCreateEd = LineupScene.prototype.create;
LineupScene.prototype.create = function () {
  _lineupCreateEd.apply(this, arguments);
  const P = TEAMS[this.d.team];
  if (!P || !(P.allenatore || P.dirigente)) return;
  const s = [P.allenatore && 'ALLENATORE ' + asciiUp(P.allenatore), P.dirigente && 'DIRIGENTE ' + asciiUp(P.dirigente)].filter(Boolean).join('   ·   ');
  this.add.text(160, GR > 1 ? 201 : 206, s, UI.f(5.5, '#ffffff', true)).setOrigin(0.5).setStroke('#000000', 3).setDepth(10);
};

// ---------------- profilo sul server ----------------
// api/profilo.php: registra / accedi (utente e password) danno un gettone che resta nel browser; salva / carica il profilo.
// Il profilo è tutto quello che il gioco tiene nel browser (chiavi sf91_...), tranne il gettone e la chiave del server.
const PROF = {
  url: 'api/profilo.php',
  get() { try { return JSON.parse(localStorage.getItem('sf91_profilo')) || null; } catch (e) { return null; } },
  set(v) { try { if (v) localStorage.setItem('sf91_profilo', JSON.stringify(v)); else localStorage.removeItem('sf91_profilo'); } catch (e) { /* */ } },
  snapshot() {
    const o = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('sf91_') && k !== 'sf91_profilo' && k !== 'sf91_chiave_server') o[k] = localStorage.getItem(k); }
    return o;
  },
  async call(body) {
    try {
      const r = await fetch(this.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      return r.ok ? Object.assign({ ok: true }, j) : { ok: false, msg: j.errore || 'errore ' + r.status };
    } catch (e) { return { ok: false, msg: 'server non raggiungibile' }; }
  },
  async enter(azione, utente, password) {
    const r = await this.call({ azione, utente, password });
    if (r.ok) this.set({ utente: r.utente, token: r.token });
    return r;
  },
  async save() { const p = this.get(); if (!p) return { ok: false, msg: 'accedi prima' }; return this.call({ azione: 'salva', utente: p.utente, token: p.token, dati: this.snapshot() }); },
  async load() {
    const p = this.get(); if (!p) return { ok: false, msg: 'accedi prima' };
    const r = await this.call({ azione: 'carica', utente: p.utente, token: p.token });
    if (!r.ok) return r;
    if (!r.dati || typeof r.dati !== 'object') return { ok: false, msg: 'nessun profilo salvato' };
    for (const [k, v] of Object.entries(r.dati)) if (k.startsWith('sf91_') && k !== 'sf91_profilo' && typeof v === 'string') try { localStorage.setItem(k, v); } catch (e) { /* */ }
    return { ok: true };
  }
};

// ---------------- pagina dell'editor ----------------
const ED_CSS = `
#editor { position: fixed; inset: 0; z-index: 40; background: #071233; color: #fff; font: 14px Arial, sans-serif; overflow-y: auto; }
#editor .ed-wrap { max-width: 980px; margin: 0 auto; padding: 12px 16px 40px; }
#editor h1 { font: bold 20px "Arial Black", Arial, sans-serif; color: #ffd23a; margin: 4px 0 10px; }
#editor h2 { font: bold 16px "Arial Black", Arial, sans-serif; color: #7ad0ff; margin: 16px 0 8px; }
#editor .tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
#editor button { font: bold 13px Arial, sans-serif; padding: 8px 12px; border: 0; border-radius: 6px; background: #2a5ad8; color: #fff; cursor: pointer; }
#editor button.on { background: #ffd23a; color: #0a1640; } #editor button.red { background: #a03040; } #editor button.green { background: #2ab060; }
#editor button.small { padding: 4px 8px; font-size: 12px; }
#editor .card { background: #0e2a6a; border: 1px solid #3a6ac8; border-radius: 8px; padding: 10px; margin-bottom: 8px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
#editor .card img, #editor .thumb { width: 44px; height: 44px; object-fit: contain; background: #fff; border-radius: 4px; }
#editor .grow { flex: 1; min-width: 160px; }
#editor .muted { color: #9ab8f0; font-size: 12px; }
#editor label { display: inline-flex; flex-direction: column; gap: 2px; font-size: 12px; color: #9ab8f0; margin: 0 8px 8px 0; }
#editor input, #editor select { font: 14px Arial, sans-serif; padding: 6px; border-radius: 4px; border: 1px solid #3a6ac8; background: #0a1e4a; color: #fff; }
#editor input[type=color] { padding: 0; width: 48px; height: 32px; }
#editor .tbl { width: 100%; overflow-x: auto; }
#editor table { border-collapse: collapse; min-width: 640px; width: 100%; }
#editor td, #editor th { padding: 3px; border-bottom: 1px solid #1a3a8a; text-align: left; font-size: 12px; }
#editor td input { width: 100%; box-sizing: border-box; }
#editor .bar { position: sticky; top: 0; background: #071233; padding: 8px 0; z-index: 2; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
#editor .msg { color: #7ad0ff; font-weight: bold; }
`;
function edEl(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.append(c instanceof Node ? c : String(c));
  return e;
}
// campo collegato a una proprietà dell'oggetto (si aggiorna mentre si scrive)
function edField(lab, obj, key, type = 'text', extra = {}) {
  const inp = edEl('input', Object.assign({ type, value: obj[key] ?? '' }, extra));
  inp.addEventListener('input', () => { obj[key] = type === 'number' ? (inp.value === '' ? '' : Number(inp.value)) : inp.value; });
  return lab ? edEl('label', {}, lab, inp) : inp;
}
function edSelect(lab, obj, key, opts, onChange) {
  const s = edEl('select', {}, opts.map(([v, t]) => edEl('option', { value: v, selected: String(obj[key]) === String(v) }, t)));
  s.addEventListener('change', () => { obj[key] = s.value; if (onChange) onChange(); });
  return lab ? edEl('label', {}, lab, s) : s;
}
// immagine da file (logo, foto): ridotta a size x size, intera e centrata, in PNG (trasparenza) o JPEG
function edPickImage(size, done, png = true) {
  const inp = edEl('input', { type: 'file', accept: 'image/*' });
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
      if (!png) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, size, size); }
      const k = Math.min(size / im.width, size / im.height), w = im.width * k, h = im.height * k;
      g.imageSmoothingQuality = 'high'; g.drawImage(im, (size - w) / 2, (size - h) / 2, w, h);
      done(c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.85));
      URL.revokeObjectURL(im.src);
    };
    im.src = URL.createObjectURL(f);
  };
  inp.click();
}

function openEditor(onClose) {
  if (document.getElementById('editor')) return;
  if (!document.getElementById('editorCss')) document.head.append(edEl('style', { id: 'editorCss' }, ED_CSS));
  const game = window.__game; if (game) game.input.keyboard.enabled = false;
  const D = JSON.parse(JSON.stringify(ED.data));   // copia: si salva solo con SALVA
  let tab = 'squadre', edit = null, msg = '';
  const root = edEl('div', { id: 'editor' }), wrap = edEl('div', { class: 'ed-wrap' }); root.append(wrap); document.body.append(root);
  const close = changed => {
    root.remove();
    if (game) { game.input.keyboard.enabled = true; game.scene.getScenes(true).forEach(sc => sc.input.keyboard && sc.input.keyboard.resetKeys()); }
    if (changed) location.reload(); else onClose && onClose();
  };
  const dirty = () => JSON.stringify(D) !== JSON.stringify(ED.data);
  const say = t => { msg = t; draw(); };
  const usedCodes = self => new Set(Object.keys(TEAMS).filter(c => !TEAMS[c].custom).concat(D.squadre.filter(t => t !== self).map(edTeamCode)));

  function draw() {
    wrap.innerHTML = '';
    wrap.append(edEl('div', { class: 'bar' },
      edEl('h1', { style: 'margin:0 12px 0 0' }, 'EDITOR'),
      edEl('button', { class: 'green', onclick: () => { if (!validate()) return; ED.data = D; if (ED.save()) close(true); } }, '✔ SALVA E CHIUDI'),
      edEl('button', { class: 'red', onclick: () => { if (!dirty() || confirm('Uscire senza salvare le modifiche?')) close(false); } }, '✖ ESCI'),
      edEl('span', { class: 'msg' }, msg)));
    wrap.append(edEl('div', { class: 'tabs' }, [['squadre', 'SQUADRE'], ['arbitri', 'ARBITRI'], ['sponsor', 'SPONSOR'], ['campionati', 'CAMPIONATI'], ['profilo', 'PROFILO']]
      .map(([k, t]) => edEl('button', { class: tab === k ? 'on' : '', onclick: () => { tab = k; edit = null; msg = ''; draw(); } }, t))));
    ({ squadre: edit ? teamForm : teamList, arbitri: refList, sponsor: sponsorList, campionati: leagueList, profilo: profile })[tab]();
  }
  function validate() {
    for (const t of D.squadre) {
      const c = edTeamCode(t);
      if (!t.nome || c.length < 2) { tab = 'squadre'; edit = t; say('Ogni squadra ha bisogno di nome e sigla (2-3 lettere).'); return false; }
      if (usedCodes(t).has(c)) { tab = 'squadre'; edit = t; say(`La sigla ${c} è già usata: scegline un'altra.`); return false; }
      if ((t.giocatori || []).filter(p => p.cognome || p.nome).length < 4) { tab = 'squadre'; edit = t; say(`${t.nome}: servono almeno 4 giocatori.`); return false; }
    }
    return true;
  }

  // --- squadre ---
  function teamList() {
    const src = edEl('select', {}, edEl('option', { value: '' }, 'giocatori inventati'),
      edEl('optgroup', { label: 'copia da una squadra' }, Object.keys(TEAMS).filter(c => c[0] !== '_' && TEAMS[c].name && !TEAMS[c].custom).sort((a, b) => TEAMS[a].name.localeCompare(TEAMS[b].name))
        .map(c => edEl('option', { value: 'T:' + c }, TEAMS[c].name))),
      LEAGUES.list.length ? edEl('optgroup', { label: 'copia da un campionato' }, LEAGUES.list.flatMap(l => l.squadre.map(s => edEl('option', { value: 'L:' + s.nome }, `${s.nome} (${l.nome})`)))) : null);
    const sex = edEl('select', {}, edEl('option', { value: 'M' }, 'maschile'), edEl('option', { value: 'F', selected: !!GS.women }, 'femminile'));
    wrap.append(edEl('div', { class: 'card' }, edEl('span', { class: 'grow' }, 'NUOVA SQUADRA: ', sex, ' ', src),
      edEl('button', { class: 'green', onclick: () => {
        const v = src.value, fem = sex.value === 'F';
        const t = { id: ED.id(), nome: 'NUOVA SQUADRA', codice: '', sesso: sex.value, maglia: '#1a5ad8', bordo: '#ffffff', pantaloncini: '#1a1a1a', pavimento: '#2f6fe0', logo: null, allenatore: '', dirigente: '', giocatori: [] };
        if (v.startsWith('T:')) { const c = v.slice(2), P = TEAMS[c]; Object.assign(t, { nome: P.name, maglia: P.sh, bordo: P.tr, pantaloncini: P.so || '#1a1a1a', logo: P.logo && String(P.logo).startsWith('data:') ? P.logo : null, giocatori: edCopyPlayers(c) }); }
        else if (v.startsWith('L:')) { const sq = genTeam(v.slice(2)); Object.assign(t, { nome: asciiUp(sq.nome), maglia: sq.colori.maglia, bordo: sq.colori.bordo, pantaloncini: sq.colori.pantaloncini, giocatori: sq.giocatori.map(p => ({ nome: p.nome, cognome: p.cognome, numero: p.numero, sigla: p.sigla[0], eta: p.eta, livello: p.livello, foto: null })) }); }
        else t.giocatori = edInventPlayers(fem);
        let c = asciiUp(t.nome).split(/\s+/).map(w => w[0]).join('').replace(/[^A-Z]/g, '').slice(0, 3);
        const used = usedCodes(t);
        if (c.length < 2 || used.has(c)) for (let k = 0; k < 400; k++) { c = String.fromCharCode(65 + (k % 26)) + String.fromCharCode(65 + ((k / 26) % 26 | 0)) + 'X'; if (!used.has(c)) break; }
        t.codice = c;
        D.squadre.push(t); edit = t; msg = ''; draw();
      } }, '+ CREA')));
    if (!D.squadre.length) wrap.append(edEl('p', { class: 'muted' }, 'Nessuna squadra creata. Le squadre create compaiono nel gruppo MIE SQUADRE della selezione, nei campionati dell\'editor e in I MIEI GIOCATORI.'));
    for (const t of D.squadre) wrap.append(edEl('div', { class: 'card' },
      t.logo ? edEl('img', { src: t.logo }) : edEl('div', { class: 'thumb', style: `background:${t.maglia}` }),
      edEl('div', { class: 'grow' }, edEl('b', {}, `${t.nome} (${edTeamCode(t)})`), edEl('div', { class: 'muted' },
        `${t.sesso === 'F' ? 'femminile' : 'maschile'} · ${(t.giocatori || []).length} giocatori${t.allenatore ? ' · all. ' + t.allenatore : ''}${t.dirigente ? ' · dir. ' + t.dirigente : ''}`)),
      edEl('button', { onclick: () => { edit = t; msg = ''; draw(); } }, 'MODIFICA'),
      edEl('button', { class: 'red', onclick: () => { if (confirm(`Eliminare ${t.nome}?`)) { D.squadre.splice(D.squadre.indexOf(t), 1); draw(); } } }, 'ELIMINA')));
  }
  function teamForm() {
    const t = edit;
    wrap.append(edEl('button', { class: 'small', onclick: () => { edit = null; msg = ''; draw(); } }, '◄ TUTTE LE SQUADRE'));
    wrap.append(edEl('h2', {}, t.nome || 'SQUADRA'));
    wrap.append(edEl('div', {},
      edField('Nome', t, 'nome', 'text', { maxlength: 30 }), edField('Sigla (3 lettere)', t, 'codice', 'text', { maxlength: 3, size: 4 }),
      edSelect('Squadra', t, 'sesso', [['M', 'maschile'], ['F', 'femminile']]),
      edField('Maglia', t, 'maglia', 'color'), edField('Bordo e numeri', t, 'bordo', 'color'), edField('Pantaloncini', t, 'pantaloncini', 'color'), edField('Campo', t, 'pavimento', 'color'),
      edField('Allenatore', t, 'allenatore', 'text', { maxlength: 30 }), edField('Dirigente', t, 'dirigente', 'text', { maxlength: 30 })));
    wrap.append(edEl('div', { class: 'card' }, t.logo ? edEl('img', { src: t.logo }) : edEl('span', { class: 'muted' }, 'nessun logo (si vede lo stemma con i colori)'),
      edEl('button', { onclick: () => edPickImage(128, d => { t.logo = d; draw(); }) }, 'CARICA LOGO'),
      t.logo ? edEl('button', { class: 'red small', onclick: () => { t.logo = null; draw(); } }, 'TOGLI') : null));
    wrap.append(edEl('h2', {}, 'ROSA'));
    wrap.append(edEl('div', { style: 'margin-bottom:8px' },
      edEl('button', { onclick: () => { t.giocatori.push(Object.assign(edInventPlayers(t.sesso === 'F')[0], { numero: '' })); draw(); } }, '+ GIOCATORE'), ' ',
      edEl('button', { onclick: () => { if (confirm('Sostituire la rosa con giocatori inventati?')) { t.giocatori = edInventPlayers(t.sesso === 'F'); draw(); } } }, 'INVENTA LA ROSA'),
      edEl('span', { class: 'muted' }, '  Livello 1-10. La foto si fa con la telecamera o da file (pulsante 📷).')));
    const rows = t.giocatori.map((p, i) => edEl('tr', {},
      edEl('td', {}, p.foto ? edEl('img', { src: p.foto, style: 'width:32px;height:32px;border-radius:4px' }) : ''),
      edEl('td', {}, edField('', p, 'nome')), edEl('td', {}, edField('', p, 'cognome')),
      edEl('td', { style: 'width:56px' }, edField('', p, 'numero', 'number', { min: 0, max: 99 })),
      edEl('td', {}, edSelect('', p, 'sigla', ED_ROLES)),
      edEl('td', { style: 'width:56px' }, edField('', p, 'eta', 'number', { min: 12, max: 70 })),
      edEl('td', { style: 'width:56px' }, edField('', p, 'livello', 'number', { min: 1, max: 10 })),
      edEl('td', {}, edEl('button', { class: 'small', title: 'foto', onclick: () => openPhotoCapture(r => { if (r) { p.foto = r.foto; if (r.skinHex) p.pelle = r.skinHex; if (r.hairHex) p.capelli = r.hairHex; } draw(); }) }, '📷'),
        p.foto ? edEl('button', { class: 'small red', onclick: () => { p.foto = null; delete p.pelle; delete p.capelli; draw(); } }, '✖📷') : null),
      edEl('td', {}, edEl('button', { class: 'small red', onclick: () => { t.giocatori.splice(i, 1); draw(); } }, 'TOGLI'))));
    wrap.append(edEl('div', { class: 'tbl' }, edEl('table', {}, edEl('tr', {}, ['', 'Nome', 'Cognome', 'N.', 'Ruolo', 'Età', 'Liv.', 'Foto', ''].map(h => edEl('th', {}, h))), rows)));
  }

  // --- arbitri ---
  function refList() {
    wrap.append(edEl('p', { class: 'muted' }, 'In ogni partita viene scelto uno degli arbitri: nome e foto compaiono nel pannello della battuta (con ARCADE FX attivo).'));
    wrap.append(edEl('button', { class: 'green', onclick: () => { D.arbitri.push({ id: ED.id(), nome: '', cognome: '', nazione: 'ITA', foto: null }); draw(); } }, '+ ARBITRO'));
    for (const a of D.arbitri) wrap.append(edEl('div', { class: 'card' },
      a.foto ? edEl('img', { src: a.foto }) : edEl('div', { class: 'thumb' }),
      edField('Nome', a, 'nome'), edField('Cognome', a, 'cognome'), edField('Nazione', a, 'nazione', 'text', { maxlength: 3, size: 4 }),
      edEl('button', { onclick: () => openPhotoCapture(r => { if (r) a.foto = r.foto; draw(); }) }, '📷 FOTO'),
      edEl('button', { class: 'red', onclick: () => { D.arbitri.splice(D.arbitri.indexOf(a), 1); draw(); } }, 'ELIMINA')));
  }
  // --- sponsor ---
  function sponsorList() {
    wrap.append(edEl('p', { class: 'muted' }, 'Gli sponsor (fino a 6) vanno sui cartelloni del palazzetto e sulla balaustra delle arene: con il logo si vede il logo, altrimenti il nome sul colore scelto.'));
    if (D.sponsor.length < 6) wrap.append(edEl('button', { class: 'green', onclick: () => { D.sponsor.push({ id: ED.id(), nome: '', colore: '#ffffff', logo: null }); draw(); } }, '+ SPONSOR'));
    for (const s of D.sponsor) wrap.append(edEl('div', { class: 'card' },
      s.logo ? edEl('img', { src: s.logo }) : edEl('div', { class: 'thumb', style: `background:${s.colore}` }),
      edField('Nome', s, 'nome', 'text', { maxlength: 16 }), edField('Colore', s, 'colore', 'color'),
      edEl('button', { onclick: () => edPickImage(160, d => { s.logo = d; draw(); }) }, 'CARICA LOGO'),
      s.logo ? edEl('button', { class: 'small red', onclick: () => { s.logo = null; draw(); } }, 'TOGLI LOGO') : null,
      edEl('button', { class: 'red', onclick: () => { D.sponsor.splice(D.sponsor.indexOf(s), 1); draw(); } }, 'ELIMINA')));
  }
  // --- campionati ---
  function leagueList() {
    wrap.append(edEl('p', { class: 'muted' }, 'Girone all\'italiana tra le squadre scelte (le tue e quelle già nel gioco). Si gioca da CAREER come gli altri campionati: calendario, classifica, formazione e sorteggio.'));
    wrap.append(edEl('button', { class: 'green', onclick: () => { D.campionati.push({ id: ED.id(), nome: 'IL MIO CAMPIONATO', ritorno: true, set: 3, squadre: [] }); draw(); } }, '+ CAMPIONATO'));
    const all = D.squadre.map(t => ({ nome: asciiUp(t.nome), codice: edTeamCode(t), mine: true }))
      .concat(Object.keys(TEAMS).filter(c => c[0] !== '_' && TEAMS[c].name && !TEAMS[c].custom && !TEAMS[c].generated).map(c => ({ nome: TEAMS[c].name, codice: c })));
    for (const c of D.campionati) {
      const box = edEl('div', { class: 'card', style: 'display:block' },
        edField('Nome', c, 'nome', 'text', { maxlength: 40 }),
        edSelect('Gare', c, 'ritorno', [['true', 'andata e ritorno'], ['false', 'solo andata']], () => { c.ritorno = c.ritorno === 'true'; }),
        edSelect('Set', c, 'set', [[3, 'al meglio dei 3'], [5, 'al meglio dei 5'], [1, 'set unico']], () => { c.set = Number(c.set); }),
        edEl('button', { class: 'red', onclick: () => { D.campionati.splice(D.campionati.indexOf(c), 1); draw(); } }, 'ELIMINA'),
        edEl('div', { class: 'muted' }, `Squadre scelte: ${c.squadre.length} (almeno 2)`),
        edEl('div', { style: 'display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:6px' }, all.map(s => {
          const on = c.squadre.some(x => x.codice === s.codice);
          const cb = edEl('input', { type: 'checkbox', checked: on });
          cb.addEventListener('change', () => { if (cb.checked) c.squadre.push({ nome: s.nome, codice: s.codice }); else c.squadre = c.squadre.filter(x => x.codice !== s.codice); draw(); });
          return edEl('label', { style: 'flex-direction:row;align-items:center;gap:4px;color:' + (s.mine ? '#ffd23a' : '#fff') }, cb, s.nome);
        })));
      wrap.append(box);
    }
  }
  // --- profilo ---
  function profile() {
    const p = PROF.get(), u = { utente: '', password: '' };
    wrap.append(edEl('p', { class: 'muted' }, 'Con un profilo salvi sul server squadre, arbitri, sponsor, campionati (con classifiche e risultati), i miei giocatori e le formazioni, e li ritrovi su un altro dispositivo.'));
    if (!p) {
      wrap.append(edEl('div', { class: 'card' }, edField('Utente', u, 'utente', 'text', { maxlength: 30, autocomplete: 'username' }), edField('Password (almeno 6 caratteri)', u, 'password', 'password', { autocomplete: 'current-password' }),
        edEl('button', { onclick: async () => { const r = await PROF.enter('accedi', u.utente, u.password); say(r.ok ? 'ACCESSO FATTO' : 'ERRORE: ' + r.msg); } }, 'ACCEDI'),
        edEl('button', { class: 'green', onclick: async () => { const r = await PROF.enter('registra', u.utente, u.password); say(r.ok ? 'PROFILO CREATO' : 'ERRORE: ' + r.msg); } }, 'REGISTRATI')));
      return;
    }
    wrap.append(edEl('div', { class: 'card' }, edEl('b', { class: 'grow' }, 'Profilo: ' + p.utente),
      edEl('button', { class: 'green', onclick: async () => {
        if (dirty()) { if (!validate()) return; ED.data = JSON.parse(JSON.stringify(D)); if (!ED.save()) return; }
        const r = await PROF.save(); say(r.ok ? 'PROFILO SALVATO SUL SERVER' : 'ERRORE: ' + r.msg);
      } }, 'SALVA SUL SERVER'),
      edEl('button', { onclick: async () => {
        if (!confirm('Caricare il profilo dal server? Sostituisce quello che c\'è in questo browser.')) return;
        const r = await PROF.load(); if (r.ok) { root.remove(); location.reload(); } else say('ERRORE: ' + r.msg);
      } }, 'CARICA DAL SERVER'),
      edEl('button', { class: 'red', onclick: () => { PROF.set(null); say('USCITO DAL PROFILO'); } }, 'ESCI')));
  }
  draw();
}

// scena che apre l'editor e torna al menu
class EditorScene extends Base {
  constructor() { super('Editor'); }
  create() {
    camSetup(this); UI.bg(this);
    this.add.text(160, 112, 'EDITOR APERTO', UI.f(9, '#ffd23a', true)).setOrigin(0.5);
    openEditor(() => this.scene.start('MainMenu'));
  }
}
