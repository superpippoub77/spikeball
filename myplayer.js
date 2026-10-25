// ============================================================
//  I MIEI GIOCATORI: schede personali (nome, numero, ruolo, età, aspetto, foto, squadra)
//  con statistiche che crescono partita dopo partita in base a quello che ognuno fa davvero:
//    schiacciate -> ATTACCO, ricezioni/difese -> DIFESA, muri -> MURO, battute e ace -> BATTUTA, alzate -> ALZATA.
//  Il livello (1-10) è la media delle statistiche e in partita rende il giocatore più forte (match.js -> plK).
//  Ogni giocatore entra nella rosa della squadra scelta (qualsiasi squadra configurata) e, se è titolare,
//  va sempre in campo (lineup.js), in ogni modalità: partita singola, beach volley, campionati, arcade.
//  FOTO: dalla telecamera del telefono o del computer, oppure da un file; si inquadra il viso nell'ovale e
//  diventa il ritratto del giocatore (pannello di chi batte, formazione...). Dalla foto si ricavano anche
//  il colore della pelle e dei capelli del giocatore in campo.
//  Salvataggio: nel browser (localStorage 'sf91_miei_giocatori'), su file (esporta / importa)
//  oppure sul server (api/giocatori.php, protetto da una chiave che non è nel repository).
// ============================================================
// INDICE DEL FILE
//   1. MYP: elenco dei giocatori, livello, voci della rosa (myEntry), salvataggio locale / file / server
//   2. inserimento nella rosa e in formazione (teamPool / lineupOf estese)
//   3. ritratto dalla foto (drawFace / drawFaceHD estese)
//   4. crescita a fine partita (myPlayerAfterMatch, agganciata a MatchScene.startEnd)
//   5. foto: telecamera o file, inquadratura e colori (openPhotoCapture)
//   6. scene: MyPlayers (elenco) e MyPlayer (scheda)
const MY_ROLES = [['P', 'ALZATORE'], ['C', 'CENTRALE'], ['O', 'OPPOSTO'], ['S', 'SCHIACCIATORE'], ['L', 'LIBERO']];
const MY_STATS = [['att', 'ATTACCO'], ['dif', 'DIFESA'], ['muro', 'MURO'], ['batt', 'BATTUTA'], ['alz', 'ALZATA']];
// statistiche di partenza per ruolo (0-100)
// (72 di media = livello 4,6: un buon giocatore che deve ancora crescere)
const MY_BASE = { P: { alz: 82, dif: 74 }, C: { muro: 82, att: 78 }, O: { att: 82, muro: 76 }, S: { att: 80, dif: 78 }, L: { dif: 84, alz: 76 } };
const MY_KEY = 'sf91_miei_giocatori', MY_SERVER = 'api/giocatori.php';

const MYP = {
  list: [], cur: 0,
  get data() { return this.list[this.cur] || null; },   // giocatore selezionato (compatibilità con il resto del gioco)
  load() {
    try { this.list = JSON.parse(localStorage.getItem(MY_KEY)) || []; } catch (e) { this.list = []; }
    if (!this.list.length) {   // vecchio salvataggio con un solo giocatore
      try { const old = JSON.parse(localStorage.getItem('sf91_mio_giocatore')); if (old) this.list = [old]; } catch (e) { /* */ }
    }
    this.list = this.list.filter(d => d && d.st).map(d => this.fix(d));
    this.list.forEach(d => myPhotoImg(d.foto));
    return this.list;
  },
  save() { try { localStorage.setItem(MY_KEY, JSON.stringify(this.list)); } catch (e) { /* spazio pieno: le foto sono piccole, ma il browser può rifiutare */ } },
  fix(d) { if (!d.id) d.id = 'g' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); if (d.titolare === undefined) d.titolare = true; if (!d.tot) d.tot = { pts: 0, spike: 0, block: 0, ace: 0, lob: 0 }; return d; },
  fresh(fem) {
    return this.fix({ sesso: fem ? 'F' : 'M', nome: fem ? 'GIULIA' : 'MARIO', cognome: 'ROSSI', numero: 10, ruolo: 'S', eta: 20, pelle: 1, capelli: 1, team: 'ITA', titolare: true, foto: null,
             st: this.baseStats('S'), xp: 0, partite: 0, vinte: 0, tot: { pts: 0, spike: 0, block: 0, ace: 0, lob: 0 } });
  },
  baseStats(r) { const b = MY_BASE[r] || {}; const o = {}; MY_STATS.forEach(([k]) => { o[k] = b[k] || 68; }); return o; },
  // livello 1-10 dalla media delle statistiche (inverso di lvToStat in roster.js)
  level(d = this.data) { const v = MY_STATS.map(([k]) => d.st[k]); return clamp(Math.round(((v.reduce((a, x) => a + x, 0) / v.length) - 40) / 7 * 10) / 10, 1, 10); },
  label(d = this.data) { return asciiUp(d.cognome || d.nome) || 'IO'; },
  ofTeam(code) { return this.list.filter(d => d.team === code); },
  // le squadre tengono in cache rosa e formazione: vanno ricalcolate quando una scheda cambia
  dirty(code) {
    const P = code && TEAMS[code];
    if (P) { P._pool = null; if (P._sig !== undefined) P._sig = 'da rifare'; }
    const g = window.__game; if (g && code) for (const k of g.textures.getTextureKeys()) if (k.startsWith(`face_${code}_`) || k.startsWith(`pl_${code}_`)) g.textures.remove(k);
  },
  // ---- file: esporta / importa (unisce per id: la versione importata sostituisce quella locale) ----
  exportFile() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(this.list)], { type: 'application/json' }));
    a.download = 'giocatori-spikefever.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  importFile(done) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => { const f = inp.files[0]; if (!f) return; f.text().then(t => done(this.merge(JSON.parse(t)))).catch(() => done(-1)); };
    inp.click();
  },
  merge(arr) {
    if (!Array.isArray(arr)) return -1;
    let n = 0;
    for (const raw of arr) {
      if (!raw || !raw.st) continue;
      const d = this.fix(raw), i = this.list.findIndex(x => x.id === d.id);
      if (i >= 0) { this.dirty(this.list[i].team); this.list[i] = d; } else this.list.push(d);
      myPhotoImg(d.foto); this.dirty(d.team); n++;
    }
    this.save(); return n;
  },
  // ---- server (api/giocatori.php): la chiave si chiede la prima volta e resta nel browser ----
  key(ask) {
    let k = ''; try { k = localStorage.getItem('sf91_chiave_server') || ''; } catch (e) { /* */ }
    if (!k || ask) { k = (window.prompt('Chiave del server per i giocatori (la stessa scritta in api/chiave.php sul server):', k) || '').trim(); try { localStorage.setItem('sf91_chiave_server', k); } catch (e) { /* */ } }
    return k;
  },
  async server(method) {
    const k = this.key(false); if (!k) return { ok: false, msg: 'NESSUNA CHIAVE' };
    try {
      const r = await fetch(MY_SERVER, { method, headers: { 'X-Chiave': k, 'Content-Type': 'application/json' }, body: method === 'POST' ? JSON.stringify(this.list) : undefined, cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (r.status === 403) { this.key(true); return { ok: false, msg: 'CHIAVE SBAGLIATA' }; }
      if (!r.ok) return { ok: false, msg: (j.errore || 'ERRORE ' + r.status).toUpperCase() };
      if (method === 'GET') return { ok: true, msg: `${this.merge(j)} GIOCATORI CARICATI DAL SERVER` };
      return { ok: true, msg: `${j.n} GIOCATORI SALVATI SUL SERVER` };
    } catch (e) { return { ok: false, msg: 'SERVER NON RAGGIUNGIBILE' }; }
  }
};

// immagini delle foto, pronte per i ritratti (una per foto)
const MY_IMG = new Map();
function myPhotoImg(src) {
  if (!src) return null;
  let im = MY_IMG.get(src);
  if (!im) { im = new Image(); im.src = src; MY_IMG.set(src, im); }
  return im.complete && im.naturalWidth ? im : null;
}
MYP.load();

// voce della rosa per un giocatore creato (stessa forma delle altre voci di teamPool)
function myEntry(d) {
  return { label: MYP.label(d), sk: d.skinHex || R_SKINS[d.pelle % R_SKINS.length], ha: d.hairHex || R_HAIR[d.capelli % R_HAIR.length], sh: null, tr: null,
           num: String(d.numero), role: d.ruolo, roles: [d.ruolo], age: d.eta, lv: MYP.level(d), me: true, myId: d.id, foto: d.foto || null };
}

// ---------------- nella rosa e (se titolari) sempre in campo ----------------
// le giocatrici (sesso F) entrano solo nelle squadre femminili, i giocatori solo in quelle maschili
function myFemNow() {
  const g = window.__game;
  if (g) {
    if (g.scene.isActive('BeachSettings') || g.scene.isActive('BeachSelect')) return BSET.women === 1;
    if (g.scene.isActive('Formazione')) return !!(g.scene.getScene('Formazione').d || {}).women;
  }
  return !!LOOK.fem;
}
const mySex = d => d.sesso === 'F' ? 'F' : 'M';
const _teamPoolMy = teamPool;
teamPool = function (code) {
  const P = TEAMS[code], fem = myFemNow();
  if (P._pool && P._myFem !== undefined && P._myFem !== fem) { P._pool = null; if (P._sig !== undefined) P._sig = 'da rifare'; }
  const had = !!P._pool, pool = _teamPoolMy(code);
  if (!had) {
    P._myFem = fem;
    for (const d of MYP.ofTeam(code)) {
      if ((mySex(d) === 'F') !== fem) continue;
      const e = myEntry(d);
      if (pool.some(p => p.label === e.label)) e.label = `${asciiUp(d.nome)[0] || ''}.${e.label}`;
      pool.push(e);
    }
  }
  return pool;
};
// nella versione femminile i nomi della rosa diventano femminili: le giocatrici create tengono il loro
const _femLabelMy = femLabel;
femLabel = function (code, label) { const e = teamPool(code).find(p => p.label === label); return (e && e.me) || (TEAMS[code] && TEAMS[code].custom) ? label : _femLabelMy(code, label); };
const _lineupOfMy = lineupOf;
lineupOf = function (code, n) {
  const on = _lineupOfMy(code, n).slice(), pool = teamPool(code), F = FORMATIONS[n];
  const mine = new Set(on.filter(i => pool[i] && pool[i].me));
  for (const d of MYP.ofTeam(code)) {
    if (!d.titolare || (mySex(d) === 'F') !== myFemNow()) continue;
    const mi = pool.findIndex(p => p.myId === d.id);
    if (mi < 0 || on.includes(mi)) continue;
    // entra nel posto adatto al suo ruolo (o in uno qualsiasi tranne l'alzatore), senza togliere un altro dei miei
    let s = F.findIndex((f, k) => !mine.has(on[k]) && (POS_ROLES[f.pos] || []).includes(d.ruolo));
    if (s < 0) s = F.findIndex((f, k) => !mine.has(on[k]) && f.pos !== 'set');
    if (s < 0) s = F.findIndex((f, k) => !mine.has(on[k]));
    if (s < 0) continue;
    on[s] = mi; mine.add(mi);
  }
  return on;
};

// ---------------- ritratto dalla foto ----------------
// al posto del volto disegnato: la foto nel riquadro, la maglia della squadra e il numero; in ARCADE i colori
// della foto vengono ridotti come in un vecchio gioco a 16 bit; nell'esultanza la foto è più luminosa con un alone
function myPhotoFace(ctx, ox, oy, code, idx, expr) {
  const P = TEAMS[code], src = P && P.fotos && P.fotos[idx], im = myPhotoImg(src);
  if (!im) return false;
  const pal = playerPal(code, idx), cheer = expr === 'cheer';
  const bg = ctx.createLinearGradient(0, oy, 0, oy + 40); bg.addColorStop(0, cheer ? '#5a4a10' : '#24408a'); bg.addColorStop(1, '#0a1640');
  ctx.fillStyle = bg; ctx.fillRect(ox, oy, 40, 40);
  // foto: in ARCADE passa da 40x40 con i colori ridotti (aspetto pixel art)
  const t = document.createElement('canvas'); t.width = t.height = GR > 1 ? 120 : 40;
  const g = t.getContext('2d'); g.imageSmoothingQuality = 'high';
  g.drawImage(im, 0, 0, t.width, t.height);
  if (GR <= 1 || cheer) {
    const id = g.getImageData(0, 0, t.width, t.height), d = id.data, q = GR <= 1 ? 36 : 1;
    for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) {
      let v = d[i + c] * (cheer ? 1.15 : 1) + (cheer ? 10 : 0);
      if (q > 1) v = Math.round(v / q) * q;
      d[i + c] = clamp(v, 0, 255);
    }
    g.putImageData(id, 0, 0);
  }
  ctx.save(); ctx.beginPath(); ctx.rect(ox + 3, oy + 2, 34, 31); ctx.clip();
  ctx.imageSmoothingEnabled = GR > 1; ctx.drawImage(t, ox + 3, oy + 1, 34, 34); ctx.restore();
  ctx.strokeStyle = cheer ? '#ffd23a' : '#ffffff'; ctx.lineWidth = 1; ctx.strokeRect(ox + 3.5, oy + 2.5, 33, 30);
  // maglia della squadra sotto la foto
  ctx.fillStyle = pal.sh; ctx.fillRect(ox, oy + 33, 40, 7); ctx.fillStyle = pal.tr; ctx.fillRect(ox, oy + 33, 40, 1);
  if (pal.num) { ctx.fillStyle = pal.tr; ctx.font = 'bold 6px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(pal.num, ox + 20, oy + 39.5); ctx.textAlign = 'left'; }
  return true;
}
const _drawFaceMy = drawFace, _drawFaceHDMy = drawFaceHD;
drawFace = function (ctx, ox, oy, code, idx, expr) { if (!myPhotoFace(ctx, ox, oy, code, idx, expr)) _drawFaceMy(ctx, ox, oy, code, idx, expr); };
drawFaceHD = function (c, ox, oy, code, idx, expr) { if (!myPhotoFace(c, ox, oy, code, idx, expr)) _drawFaceHDMy(c, ox, oy, code, idx, expr); };

// ---------------- crescita a fine partita ----------------
// ogni gesto fatto in partita fa crescere la statistica collegata (sempre più piano man mano che si avvicina a 99)
function myPlayerAfterMatch(m) {
  const out = [];
  for (const d of MYP.list) {
    const t = m.teams.find(x => x.code === d.team); if (!t) continue;
    const e = teamPool(d.team).find(p => p.myId === d.id);
    const ni = e ? t.pal.names.indexOf(e.label) : -1;
    if (ni < 0 || ni >= t.players.length) continue;
    const s = t.pstats[ni] || {}, n = k => s[k] || 0;
    const before = MYP.level(d);
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
    out.push({ xp, before, after: MYP.level(d), name: e.label, team: d.team });
  }
  if (out.length) { MYP.save(); out.forEach(r => MYP.dirty(r.team)); }
  return out;
}
const _startEndMy = MatchScene.prototype.startEnd;
MatchScene.prototype.startEnd = function () {
  _startEndMy.call(this);
  if (this.mode === 'demo' || this.mode === 'practice') return;
  myPlayerAfterMatch(this).slice(0, 3).forEach((r, i) => {
    const up = r.after > r.before;
    this.add.text(160, 196 - i * 10, `★ ${r.name}  +${r.xp} XP   LIVELLO ${r.before.toFixed(1)} → ${r.after.toFixed(1)}${up ? '  ▲' : ''}`, UI.f(6, up ? '#ffd23a' : '#ffffff', true))
      .setOrigin(0.5).setScrollFactor(0).setDepth(2400).setStroke('#0a1a4a', 3);
  });
};

// ---------------- foto: telecamera o file ----------------
// Pannello sopra il gioco: anteprima con l'ovale in cui mettere il viso, SCATTA (telecamera del telefono o del
// computer), CARICA FOTO (file), zoom e spostamento (trascinando l'anteprima). USA FOTO ritaglia il riquadro del viso,
// lo riduce a 96x96 (JPEG leggero) e stima pelle e capelli. done({ foto, skinHex, hairHex }) oppure done(null).
function openPhotoCapture(done) {
  const wrap = document.createElement('div'); wrap.id = 'photoCap';
  wrap.innerHTML = `
    <div class="pc-box">
      <div class="pc-title">FOTO DEL GIOCATORE</div>
      <div class="pc-stage"><video playsinline autoplay muted></video><canvas width="320" height="320"></canvas></div>
      <div class="pc-hint">Metti il viso dentro l'ovale. Trascina l'immagine per spostarla.</div>
      <label class="pc-zoom">ZOOM <input type="range" min="1" max="3" step="0.02" value="1.3"></label>
      <div class="pc-btns">
        <button data-a="shot">📷 SCATTA</button><button data-a="file">📁 CARICA FOTO</button>
        <button data-a="ok" disabled>✔ USA FOTO</button><button data-a="no">✖ ANNULLA</button>
      </div>
      <input type="file" accept="image/*" capture="user" hidden>
    </div>`;
  document.body.appendChild(wrap);
  const video = wrap.querySelector('video'), cv = wrap.querySelector('canvas'), g = cv.getContext('2d');
  const zoom = wrap.querySelector('input[type=range]'), file = wrap.querySelector('input[type=file]'), okB = wrap.querySelector('[data-a=ok]');
  const game = window.__game; if (game) game.input.keyboard.enabled = false;
  let stream = null, img = null, live = false, ox = 0, oy = 0, drag = null, raf = 0;
  const startCam = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { wrap.querySelector('.pc-hint').textContent = 'Telecamera non disponibile: usa CARICA FOTO.'; return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }, audio: false })
      .then(s => { stream = s; video.srcObject = s; live = true; img = null; okB.disabled = true; })
      .catch(() => { wrap.querySelector('.pc-hint').textContent = 'Telecamera non disponibile o negata: usa CARICA FOTO.'; });
  };
  const stopCam = () => { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; live = false; };
  const source = () => live ? (video.videoWidth ? video : null) : img;
  // riquadro della sorgente mostrato nell'anteprima (quadrato, con zoom e spostamento)
  const rect = s => {
    const W = s.videoWidth || s.naturalWidth || s.width, H = s.videoHeight || s.naturalHeight || s.height;
    const side = Math.min(W, H) / Number(zoom.value);
    const cx = clamp(W / 2 + ox, side / 2, W - side / 2), cy = clamp(H / 2 + oy, side / 2, H - side / 2);
    return [cx - side / 2, cy - side / 2, side, side];
  };
  const draw = () => {
    raf = requestAnimationFrame(draw);
    const s = source(); g.fillStyle = '#0a1640'; g.fillRect(0, 0, 320, 320);
    if (s) {
      const [x, y, w, h] = rect(s);
      g.save(); if (live) { g.translate(320, 0); g.scale(-1, 1); }   // la telecamera frontale si vede come in uno specchio
      g.drawImage(s, x, y, w, h, 0, 0, 320, 320); g.restore();
    }
    g.strokeStyle = 'rgba(255,210,58,0.95)'; g.lineWidth = 3; g.setLineDash([10, 6]);
    g.beginPath(); g.ellipse(160, 150, 92, 120, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.rect(0, 0, 320, 320); g.ellipse(160, 150, 92, 120, 0, 0, Math.PI * 2); g.fill('evenodd');
  };
  draw();
  const close = res => {
    cancelAnimationFrame(raf); stopCam(); wrap.remove();
    if (game) { game.input.keyboard.enabled = true; game.scene.getScenes(true).forEach(sc => sc.input.keyboard && sc.input.keyboard.resetKeys()); }
    done(res);
  };
  cv.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    const s = source(); if (!s) return;
    const k = rect(s)[2] / cv.getBoundingClientRect().width;
    ox -= (e.clientX - drag[0]) * k * (live ? -1 : 1); oy -= (e.clientY - drag[1]) * k; drag = [e.clientX, e.clientY];
  });
  cv.addEventListener('pointerup', () => { drag = null; });
  file.addEventListener('change', () => {
    const f = file.files[0]; if (!f) return;
    const i = new Image(); i.onload = () => { stopCam(); img = i; ox = oy = 0; okB.disabled = false; }; i.src = URL.createObjectURL(f);
  });
  wrap.addEventListener('click', e => {
    const a = e.target.dataset && e.target.dataset.a; if (!a) return;
    if (a === 'file') file.click();
    if (a === 'shot') {
      if (!live) { startCam(); return; }
      const s = source(); if (!s) return;
      // fotogramma fermo (specchiato come nell'anteprima)
      const c = document.createElement('canvas'); c.width = s.videoWidth; c.height = s.videoHeight;
      const cg = c.getContext('2d'); cg.translate(c.width, 0); cg.scale(-1, 1); cg.drawImage(s, 0, 0);
      const i = new Image(); i.onload = () => { stopCam(); img = i; ox = -ox; okB.disabled = false; }; i.src = c.toDataURL('image/jpeg', 0.92);
    }
    if (a === 'no') close(null);
    if (a === 'ok' && img) close(myPhotoProcess(img, rect(img)));
  });
  startCam();
}
// ritaglio del riquadro del viso a 96x96, colori di pelle (guance) e capelli (sopra la fronte)
function myPhotoProcess(img, [x, y, w, h]) {
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, x, y, w, h, 0, 0, 96, 96);
  const avg = (x0, y0, x1, y1, keep) => {
    const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data; let r = 0, gg = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { if (!keep(d[i], d[i + 1], d[i + 2])) continue; r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
    if (!n) return null;
    return '#' + [r, gg, b].map(v => Math.round(v / n).toString(16).padStart(2, '0')).join('');
  };
  const lum = (r, gg, b) => r * 0.299 + gg * 0.587 + b * 0.114;
  const skinHex = avg(30, 50, 66, 70, (r, gg, b) => r > gg && lum(r, gg, b) > 55 && lum(r, gg, b) < 235);
  const hairHex = avg(26, 2, 70, 16, (r, gg, b) => lum(r, gg, b) < 200);
  return { foto: c.toDataURL('image/jpeg', 0.82), skinHex, hairHex };
}

// ---------------- SCENA: elenco dei miei giocatori ----------------
// ↑↓ giocatore   Z/INVIO: modifica   N: nuovo   X/CANC: elimina   E/I: esporta/importa file   S/L: salva/carica dal server
class MyPlayersScene extends Base {
  constructor() { super('MyPlayers'); }
  init(d) { this.msgText = d && d.msg || ''; }
  create() {
    camSetup(this); makeCommon(this); this.keysInit(); setLook(this, false); UI.bg(this);
    this.add.text(160, 8, 'I MIEI GIOCATORI', UI.f(9, '#ffd23a', true)).setOrigin(0.5);
    UI.panel(this, 6, 22, 308, 160, null);
    const kb = this.input.keyboard, K = Phaser.Input.Keyboard.KeyCodes;
    this.kk = kb.addKeys({ n: K.N, x: K.X, del: K.DELETE, e: K.E, i: K.I, s: K.S, l: K.L });
    this.add.text(160, 196, 'Z: MODIFICA   N: NUOVO   X: ELIMINA   E / I: ESPORTA / IMPORTA FILE   S / L: SALVA / CARICA DAL SERVER', UI.f(4.2, '#9ab8f0')).setOrigin(0.5);
    this.add.text(160, 206, '↑↓ scegli   ESC: menu', UI.f(4.6, '#9ab8f0')).setOrigin(0.5);
    this.msg = this.add.text(160, 186, this.msgText, UI.f(5, '#7ad0ff', true)).setOrigin(0.5);
    this.dyn = []; this.sel = Math.min(MYP.cur, Math.max(0, MYP.list.length - 1)); this.confirm = false; this.draw();
  }
  say(t) { this.msg.setText(t); }
  draw() {
    this.dyn.forEach(o => o.destroy()); this.dyn = [];
    const D = o => (this.dyn.push(o), o), L = MYP.list;
    if (!L.length) { D(this.add.text(160, 96, 'NESSUN GIOCATORE\n\nN: CREA IL PRIMO', { ...UI.f(8, '#ffffff', true), align: 'center' }).setOrigin(0.5)); return; }
    const per = 6, first = clamp(this.sel - 2, 0, Math.max(0, L.length - per));
    L.slice(first, first + per).forEach((d, k) => {
      const i = first + k, y = 28 + k * 25, on = i === this.sel;
      const g = D(this.add.graphics()); g.fillStyle(on ? 0x1a5ad8 : 0x0e2a6a, 1).fillRect(12, y, 296, 22);
      if (on) g.lineStyle(1, 0xffd23a).strokeRect(12.5, y + 0.5, 295, 21);
      dropTeamTex(this, '_ME' + i + '_'); TEAMS['_ME' + i + '_'] = myPreviewTeam(d);
      setLook(this, false, mySex(d) === 'F');
      D(this.add.image(16, y + 1, makeFaceTex(this, '_ME' + i + '_', 0, 'neutral')).setOrigin(0).setScale(0.5));
      D(this.add.text(42, y + 3, `#${d.numero}  ${asciiUp(d.nome)} ${asciiUp(d.cognome)}`, UI.f(6.5, on ? '#ffd23a' : '#ffffff', true)));
      D(this.add.text(42, y + 12, `${MY_ROLES.find(r => r[0] === d.ruolo)[1]}  ·  ${TEAMS[d.team] ? TEAMS[d.team].name : d.team}  ·  ${mySex(d) === 'F' ? 'F' : 'M'}  ·  ${d.titolare ? 'TITOLARE' : 'IN PANCHINA'}${d.foto ? '  ·  📷' : ''}`, UI.f(4.6, '#9ab8f0')));
      D(this.add.text(302, y + 5, `LV ${MYP.level(d).toFixed(1)}`, UI.f(7, '#ffd23a', true)).setOrigin(1, 0));
      D(this.add.image(250, y + 11, makeFlagTex(this, TEAMS[d.team] ? d.team : 'ITA', 18, 12)));
    });
  }
  update() {
    if (this.gone) return;
    const n = MYP.list.length, J = k => Phaser.Input.Keyboard.JustDown(this.kk[k]);
    if (n && this.jd('up')) { this.sel = (this.sel + n - 1) % n; this.confirm = false; this.draw(); SFX.blip(); }
    if (n && this.jd('down')) { this.sel = (this.sel + 1) % n; this.confirm = false; this.draw(); SFX.blip(); }
    if (this.jd('esc')) { this.gone = true; this.scene.start('MainMenu'); return; }
    if (J('n')) { MYP.list.push(MYP.fresh(!!GS.women)); MYP.cur = MYP.list.length - 1; this.gone = true; SFX.select(); this.scene.start('MyPlayer', { isNew: true }); return; }
    if (!n) { if (J('i')) MYP.importFile(r => this.scene.restart({ msg: r < 0 ? 'FILE NON VALIDO' : `${r} GIOCATORI IMPORTATI` })); if (J('l')) this.serverOp('GET'); return; }
    if (this.btn() || this.startPressed()) { MYP.cur = this.sel; this.gone = true; SFX.select(); this.scene.start('MyPlayer'); return; }
    if (J('x') || J('del')) {
      if (!this.confirm) { this.confirm = true; this.say(`ELIMINARE ${MYP.label(MYP.list[this.sel])}? PREMI DI NUOVO X`); return; }
      const d = MYP.list.splice(this.sel, 1)[0]; MYP.save(); MYP.dirty(d.team); this.sel = Math.max(0, this.sel - 1); this.confirm = false;
      this.say(`${MYP.label(d)} ELIMINATO`); this.draw(); SFX.select(); return;
    }
    if (J('e')) { MYP.exportFile(); this.say('FILE giocatori-spikefever.json SCARICATO'); }
    if (J('i')) MYP.importFile(r => this.scene.restart({ msg: r < 0 ? 'FILE NON VALIDO' : `${r} GIOCATORI IMPORTATI` }));
    if (J('s')) this.serverOp('POST');
    if (J('l')) this.serverOp('GET');
  }
  serverOp(m) { this.say('SERVER...'); MYP.server(m).then(r => { if (m === 'GET' && r.ok) this.scene.restart({ msg: r.msg }); else this.say(r.msg); }); }
}
// squadra finta per l'anteprima di un giocatore (colori della sua squadra, aspetto e foto del giocatore)
function myPreviewTeam(d) {
  const T = TEAMS[d.team] || TEAMS.ITA, sk = d.skinHex || R_SKINS[d.pelle % R_SKINS.length], ha = d.hairHex || R_HAIR[d.capelli % R_HAIR.length];
  return { name: T.name, sh: T.sh, tr: T.tr, so: T.so, sk, ha: [ha], names: [MYP.label(d)], sks: [sk], nums: [String(d.numero)], fl: T.fl, fotos: [d.foto || null],
           _pool: [{ label: MYP.label(d), sk, ha, sh: null, tr: null, num: String(d.numero), role: d.ruolo, roles: [d.ruolo], age: d.eta, lv: MYP.level(d), foto: d.foto || null }] };
}

// ---------------- SCENA: la scheda di un giocatore ----------------
// ↑↓ voce   ← → cambia   lettere: scrivi nome/cognome (CANC per cancellare)   Z su FOTO: telecamera o file
// INVIO: salva   ESC: indietro (salva)
class MyPlayerScene extends Base {
  constructor() { super('MyPlayer'); }
  init(d) { this.isNew = !!(d && d.isNew); }
  create() {
    camSetup(this); makeCommon(this); this.keysInit(); setLook(this, false); UI.bg(this);
    if (!MYP.data) { MYP.list.push(MYP.fresh()); MYP.cur = MYP.list.length - 1; }
    this.d = JSON.parse(JSON.stringify(MYP.data)); this.oldTeam = this.d.team;
    // tutte le squadre configurate: nazionali, coppie da spiaggia, club e squadre di squadre.json
    const nat = [...new Set([...GROUPS.flat(), ...BEACH_TEAMS])].filter(c => TEAMS[c]);
    this.teams = nat.concat(Object.keys(TEAMS).filter(c => c[0] !== '_' && !nat.includes(c) && TEAMS[c].name).sort((a, b) => TEAMS[a].name.localeCompare(TEAMS[b].name)));
    if (!this.teams.includes(this.d.team)) this.d.team = this.teams[0];
    this.rows = [['sesso', 'SESSO'], ['nome', 'NOME'], ['cognome', 'COGNOME'], ['numero', 'NUMERO'], ['ruolo', 'RUOLO'], ['eta', 'ETÀ'],
                 ['foto', 'FOTO (telecamera o file)'], ['pelle', 'PELLE'], ['capelli', 'CAPELLI'], ['team', 'SQUADRA'], ['titolare', 'IN CAMPO'], ['save', 'SALVA']];
    this.add.text(160, 8, this.isNew ? 'NUOVO GIOCATORE' : 'IL MIO GIOCATORE', UI.f(9, '#ffd23a', true)).setOrigin(0.5);
    UI.panel(this, 6, 22, 150, 180, null); UI.panel(this, 162, 22, 152, 180, 'SCHEDA');
    this.add.text(160, 212, '↑↓ voce   ← → cambia   scrivi il nome con la tastiera   Z su FOTO: scatta   INVIO: salva   ESC: indietro', UI.f(4.3, '#9ab8f0')).setOrigin(0.5);
    this.rowT = this.rows.map((r, i) => [this.add.text(168, 35 + i * 13.6, r[1], UI.f(5.1, '#9ab8f0')), this.add.text(308, 35 + i * 13.6, '', UI.f(6, '#ffffff', true)).setOrigin(1, 0)]);
    this.sel = 0; this.dyn = [];
    this.input.keyboard.on('keydown', e => this.typed(e));
    this.refresh();
  }
  // nome e cognome si scrivono direttamente
  typed(e) {
    const k = this.rows[this.sel][0];
    if (this.gone || this.busy || (k !== 'nome' && k !== 'cognome')) return;
    if (/^[a-zA-Z' ]$/.test(e.key) && this.d[k].length < 12) this.d[k] += e.key.toUpperCase();
    else if (e.key === 'Backspace' || e.key === 'Delete') this.d[k] = this.d[k].slice(0, -1);
    else return;
    SFX.blip(); this.refresh();
  }
  val(k) {
    const d = this.d;
    if (k === 'nome' || k === 'cognome') return (d[k] || '') + (this.rows[this.sel][0] === k && Math.floor(this.time.now / 400) % 2 ? '_' : ' ');
    if (k === 'ruolo') return MY_ROLES.find(r => r[0] === d.ruolo)[1];
    if (k === 'foto') return d.foto ? 'SÌ  (Z: rifai  ← cancella)' : 'Z: SCATTA ►';
    if (k === 'pelle' || k === 'capelli') return (k === 'pelle' ? d.skinHex : d.hairHex) ? 'DALLA FOTO ◄ ►' : '◄ ■ ►';
    if (k === 'team') return TEAMS[d.team].name;
    if (k === 'sesso') return mySex(d) === 'F' ? 'FEMMINILE' : 'MASCHILE';
    if (k === 'titolare') return d.titolare ? 'SEMPRE TITOLARE' : 'IN PANCHINA';
    if (k === 'save') return '►';
    return String(d[k]);
  }
  refresh() {
    const d = this.d;
    this.rows.forEach((r, i) => { const on = i === this.sel; this.rowT[i][0].setColor(on ? '#ffd23a' : '#9ab8f0'); this.rowT[i][1].setText(this.val(r[0])).setColor(on ? '#ffd23a' : '#ffffff'); });
    const ri = k => this.rows.findIndex(r => r[0] === k);
    this.rowT[ri('pelle')][1].setColor(d.skinHex || R_SKINS[d.pelle % R_SKINS.length]); this.rowT[ri('capelli')][1].setColor(d.hairHex || R_HAIR[d.capelli % R_HAIR.length]);
    // anteprima: giocatore con i colori della squadra scelta e il ritratto (foto o disegnato)
    TEAMS._ME = myPreviewTeam(d); setLook(this, false, mySex(d) === 'F');
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
    else if (k === 'pelle') { d.skinHex = null; d.pelle = (d.pelle + dx + R_SKINS.length) % R_SKINS.length; }
    else if (k === 'capelli') { d.hairHex = null; d.capelli = (d.capelli + dx + R_HAIR.length) % R_HAIR.length; }
    else if (k === 'foto') { if (dx < 0 && d.foto) d.foto = null; else return; }
    else if (k === 'titolare') d.titolare = !d.titolare;
    else if (k === 'sesso') {
      d.sesso = mySex(d) === 'F' ? 'M' : 'F';
      if (d.nome === 'MARIO' || d.nome === 'GIULIA') d.nome = d.sesso === 'F' ? 'GIULIA' : 'MARIO';   // nome di esempio
    }
    else if (k === 'ruolo') {
      const i = MY_ROLES.findIndex(r => r[0] === d.ruolo), nr = MY_ROLES[(i + dx + MY_ROLES.length) % MY_ROLES.length][0];
      if (d.partite === 0) d.st = MYP.baseStats(nr);   // prima di giocare il ruolo decide le statistiche di partenza
      d.ruolo = nr;
    } else if (k === 'team') { const i = this.teams.indexOf(d.team); d.team = this.teams[(i + dx + this.teams.length) % this.teams.length]; }
    else return;
    SFX.blip(); this.refresh();
  }
  takePhoto() {
    this.busy = true;
    openPhotoCapture(res => {
      this.busy = false;
      if (res) { Object.assign(this.d, res); myPhotoImg(res.foto); const im = MY_IMG.get(res.foto); if (im && !im.complete) im.onload = () => this.refresh(); }
      this.refresh();
    });
  }
  saveAndExit() {
    this.gone = true; SFX.select();
    if (!this.d.nome && !this.d.cognome) this.d.cognome = 'IO';
    MYP.list[MYP.cur] = this.d; MYP.save(); MYP.dirty(this.oldTeam); MYP.dirty(this.d.team);
    this.scene.start('MyPlayers', { msg: `${MYP.label(this.d)} SALVATO` });
  }
  update() {
    if (this.gone || this.busy) return;
    const n = this.rows.length;
    if (this.jd('up')) { this.sel = (this.sel + n - 1) % n; this.refresh(); SFX.blip(); }
    if (this.jd('down')) { this.sel = (this.sel + 1) % n; this.refresh(); SFX.blip(); }
    if (this.jd('left')) this.change(-1);
    if (this.jd('right')) this.change(1);
    const k = this.rows[this.sel][0], text = k === 'nome' || k === 'cognome';
    if (k === 'foto' && this.btn()) { SFX.select(); this.takePhoto(); return; }
    if (this.jd('esc') || this.jd('en') || (!text && k === 'save' && this.btn())) { this.saveAndExit(); return; }
    if (text && Math.floor(this.time.now / 400) !== this._blink) { this._blink = Math.floor(this.time.now / 400); this.rowT[this.sel][1].setText(this.val(k)); }
  }
}

// mentre si scrive un nome o è aperto il pannello della foto i tasti rapidi globali (K, H, C...) non valgono
function myTyping() { const g = window.__game; return !!(document.getElementById('photoCap') || document.getElementById('editor') || (g && g.scene.isActive('MyPlayer'))); }
