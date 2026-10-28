// ============================================================
//  GIOCATORI "FOTO": fotogrammi dal foglio sprite fotografico (photo-sprites.js),
//  ricolorati per squadra (maglia, pantaloncini, pelle) e animati in base allo
//  stato del giocatore. Attivi nella versione grafica 3D (tasto H).
// ============================================================
// due serie di fotogrammi: giocatori (PHOTO_SPRITES, photo-sprites.js) e giocatrici (PHOTO_SPRITES_F, photo-sprites-f.js)
const PHOTO = {
  on: GFX === '3d' || GFX === 'pixfoto',
  pixel: GFX === 'pixfoto',      // PIXEL FOTO: stessi fotogrammi ridotti a pixel art (photoPixelate)
  sets: { m: null, f: null }
};
// serie in uso: quella delle giocatrici nella versione femminile (se c'è)
const photoSet = () => (LOOK.fem && PHOTO.sets.f) || PHOTO.sets.m;

function loadImg(src) { return new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; }); }
async function loadPhotoSet(S, fem) {
  const [atlas, regions] = await Promise.all([loadImg(S.atlas), loadImg(S.regions)]);
  return { S, atlas, regions, skinRef: null, fem };
}
async function loadPhoto() {
  if (!PHOTO.on || typeof PHOTO_SPRITES === 'undefined') { PHOTO.on = false; return; }
  try { PHOTO.sets.m = await loadPhotoSet(PHOTO_SPRITES, false); } catch (e) { PHOTO.on = false; return; }
  if (typeof PHOTO_SPRITES_F !== 'undefined') try { PHOTO.sets.f = await loadPhotoSet(PHOTO_SPRITES_F, true); } catch (e) { /* giocatrici disegnate */ }
}
const _startGamePhoto = startGame;
startGame = function () { loadPhoto().finally(_startGamePhoto); };


const hexRGB = h => { const n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

// atlante ricolorato per una squadra (a risoluzione piena del foglio, o ridotto di 'sc' per PIXEL FOTO:
// meno memoria e più veloce, soprattutto sul telefono)
// ricolora l'atlante: maglia (zona 80) e pantaloncini (160) con i colori della squadra mantenendo le pieghe, pelle (240) per tono
function photoRecolor(P, beach, sc = 1) {
  const ps = photoSet(), S = ps.S, W = Math.round(ps.atlas.width * sc), H = Math.round(ps.atlas.height * sc);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(ps.atlas, 0, 0, W, H);
  const img = g.getImageData(0, 0, W, H), d = img.data;
  const rc = document.createElement('canvas'); rc.width = W; rc.height = H;
  const rg = rc.getContext('2d'); rg.imageSmoothingEnabled = false; rg.drawImage(ps.regions, 0, 0, W, H);   // zone senza sfumature
  const R = rg.getImageData(0, 0, W, H).data;
  if (!ps.skinRef) {   // colore medio della pelle nel foglio
    let s = [0, 0, 0], n = 0;
    for (let i = 0; i < d.length; i += 4) if (R[i] === 240 && d[i + 3] > 200) { s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; n++; }
    ps.skinRef = s.map(v => v / Math.max(1, n));
  }
  const sh = hexRGB(P.sh), so = hexRGB(P.so), sk = hexRGB(P.sk), ref = ps.skinRef;
  const lumOf = c3 => c3[0] * 0.299 + c3[1] * 0.587 + c3[2] * 0.114;
  // divisa scura: si lascia il nero originale; altrimenti si ricolora mantenendo luci e pieghe
  const keepSh = lumOf(sh) < 45, keepSo = lumOf(so) < 45;
  for (let i = 0; i < d.length; i += 4) {
    const reg = R[i];
    if (!reg || d[i + 3] === 0) continue;
    if (reg === 80 || reg === 160) {
      if (reg === 80 ? keepSh : keepSo) continue;
      const col = reg === 80 ? sh : so, f = clamp(R[i + 1] / 32 * 0.86, 0.32, 1.3);
      d[i] = clamp(col[0] * f, 0, 255); d[i + 1] = clamp(col[1] * f, 0, 255); d[i + 2] = clamp(col[2] * f, 0, 255);
    } else if (reg === 240) {
      d[i] = clamp(d[i] * sk[0] / ref[0], 0, 255); d[i + 1] = clamp(d[i + 1] * sk[1] / ref[1], 0, 255); d[i + 2] = clamp(d[i + 2] * sk[2] / ref[2], 0, 255);
    }
  }
  if (beach) photoBeach(d, R, W, H, sk, ref, S.cw * sc, S.ch * sc);
  if (beach && ps.fem) photoBikini(d, R, W, H, sk, S.cw * sc, S.ch * sc);
  g.putImageData(img, 0, 0);
  return c;
}

// asse del corpo in una cella dell'atlante: dal centro della maglia (zona 80) al centro dei pantaloncini (160),
// con le mediane delle coordinate (i pixel sparsi lontani non spostano l'asse). null se manca una delle due zone.
function photoAxis(R, W, x0, y0, x1, y1) {
  const P = { 80: [[], []], 160: [[], []] };
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const r = R[(y * W + x) * 4]; if (r === 80 || r === 160) { P[r][0].push(x); P[r][1].push(y); } }
  if (P[80][0].length < 30 || P[160][0].length < 20) return null;
  const med = v => v.sort((p, q) => p - q)[v.length >> 1];
  const ax = med(P[80][0]), ay = med(P[80][1]), bx = med(P[160][0]), by = med(P[160][1]);
  const L = Math.hypot(bx - ax, by - ay) || 1;
  return { ax, ay, ux: (bx - ax) / L, uy: (by - ay) / L, t: (x, y) => (x - ax) * (bx - ax) / L + (y - ay) * (by - ay) / L, L };
}
const cellBounds = (cx, cy, cw, ch, W, H) => [Math.round(cx), Math.round(cy), Math.min(W, Math.round(cx + cw)), Math.min(H, Math.round(cy + ch))];

// beach volley femminile: costume da gara sulle pose delle giocatrici. Lungo l'asse del corpo (funziona anche nei tuffi
// e a terra) la parte bassa della maglia diventa pelle (top corto) e la parte dei pantaloncini verso le cosce diventa
// pelle (slip); la pelle nuova ha ombre attenuate.
function photoBikini(d, R, W, H, sk, cw, ch) {
  for (let cy = 0; cy + ch <= H + 1; cy += ch) for (let cx = 0; cx + cw <= W + 1; cx += cw) {
    const [x0, y0, x1, y1] = cellBounds(cx, cy, cw, ch, W, H), A = photoAxis(R, W, x0, y0, x1, y1);
    if (!A) continue;
    const ts = { 80: [], 160: [] };
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const r = R[(y * W + x) * 4]; if (r === 80 || r === 160) ts[r].push(A.t(x, y)); }
    const ext = {};
    for (const r of [80, 160]) { const v = ts[r].sort((p, q) => p - q); ext[r] = [v[Math.floor(v.length * 0.05)], v[Math.floor(v.length * 0.95)]]; }
    const topCut = ext[80][0] + (ext[80][1] - ext[80][0]) * 0.56, botCut = ext[160][0] + (ext[160][1] - ext[160][0]) * 0.5;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4, r = R[i]; if ((r !== 80 && r !== 160) || d[i + 3] === 0) continue;
      if (A.t(x, y) <= (r === 80 ? topCut : botCut)) continue;
      const f = clamp(0.94 + (R[i + 1] / 32 * 0.8 - 0.94) * 0.45, 0.7, 1.08);
      d[i] = clamp(sk[0] * f, 0, 255); d[i + 1] = clamp(sk[1] * f, 0, 255); d[i + 2] = clamp(sk[2] * f, 0, 255);
    }
  }
}

// beach volley: piedi nudi e gambe scoperte. In ogni cella i pixel non ricolorati e poco colorati (ginocchiere bianche o
// nere, calzettoni, scarpe) oltre il bacino, lungo l'asse del corpo, diventano pelle: vale anche nei tuffi e a terra.
// Senza maglia o pantaloncini visibili si usa la parte bassa della figura.
function photoBeach(d, R, W, H, sk, ref, cw, ch) {
  const skinAt = (i, lum) => { const f = 0.8 + 0.2 * lum / 255; d[i] = clamp(sk[0] * f, 0, 255); d[i + 1] = clamp(sk[1] * f, 0, 255); d[i + 2] = clamp(sk[2] * f, 0, 255); };
  for (let cy = 0; cy + ch <= H + 1; cy += ch) for (let cx = 0; cx + cw <= W + 1; cx += cw) {
    const [x0, y0, x1, y1] = cellBounds(cx, cy, cw, ch, W, H), A = photoAxis(R, W, x0, y0, x1, y1);
    let cut = null, cutLeg = null;   // cutLeg: oltre qui un pezzo "di maglia" è una ginocchiera bianca sulla gamba
    if (A) {   // dal bacino in poi lungo l'asse (10% più vicino alla maglia dei pantaloncini): gambe, ginocchia e piedi
      const v = [];
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (R[(y * W + x) * 4] === 160) v.push(A.t(x, y));
      v.sort((p, q) => p - q); cut = v[Math.floor(v.length * 0.1)]; cutLeg = v[Math.floor(v.length * 0.7)];
    }
    // ginocchiere bianche nelle zone pelle o senza zona: basta che siano oltre il centro della maglia (la testa, con il
    // bianco degli occhi, sta dall'altra parte)
    const cutW = A ? 0 : null;
    let top = -1, bot = -1;
    if (!A) {
      for (let y = y0; y < y1 && top < 0; y++) for (let x = x0; x < x1; x++) if (d[(y * W + x) * 4 + 3] > 128) { top = y; break; }
      for (let y = y1 - 1; y >= y0 && bot < 0; y--) for (let x = x0; x < x1; x++) if (d[(y * W + x) * 4 + 3] > 128) { bot = y; break; }
      if (top < 0 || bot - top < 20) continue;
    }
    const yStart = A ? y0 : Math.round(top + (bot - top) * 0.55);
    for (let y = yStart; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4, reg = R[i];
      if (d[i + 3] < 12 || reg === 160) continue;
      if (reg === 80) { if (A && A.t(x, y) > cutLeg) skinAt(i, Math.min(R[i + 1] * 5, 200)); continue; }
      const r = d[i], g = d[i + 1], b = d[i + 2], sat = Math.max(r, g, b) - Math.min(r, g, b), lum = r * 0.299 + g * 0.587 + b * 0.114;
      const whiteFree = reg !== 80 && lum > 120 && sat < 50;   // bianco e grigio chiaro (anche i bordi sfumati)
      if (A && A.t(x, y) <= (whiteFree ? cutW : cut)) continue;
      // zone senza colore: tutto ciò che è grigio o nero; nelle zone pelle e maglia solo il bianco (ginocchiere bianche
      // finite nella zona sbagliata), la pelle vera resta
      if (reg ? !whiteFree : sat > 60) continue;
      skinAt(i, Math.min(lum, 200));
    }
  }
}

// fogli 3d-maschile-A..D (build_sheet3.py): righe idle, run, appr, spike / spikefr, bagher, lateral, dive /
// set, jset, dump, block / serve, jserve, jfloat, cheer. Pose statiche per menu e schermate:
const PHOTO_STATIC3 = { idle: ['idle', 0], idle2: ['idle', 4], run1: ['run', 1], run2: ['run', 5], pass: ['bagher', 4], passload: ['bagher', 3],
  passside: ['lateral', 4], set: ['set', 4], setload: ['set', 2], jsetload: ['jset', 3], jset: ['jset', 4], land: ['jset', 6],
  jsetloadF: ['jset', 3], jsetF: ['jset', 4], landF: ['jset', 5], jsetloadB: ['jset', 3], jsetB: ['jset', 4], landB: ['jset', 5],
  jump: ['block', 2], block: ['block', 4], spkload: ['spike', 1], spike: ['spike', 5], spikefr: ['spikefr', 5], spkfol: ['spike', 6],
  dump: ['dump', 4], dumpfol: ['dump', 5], dive: ['dive', 2], down: ['dive', 4], cheer: ['cheer', 0], cheer2: ['cheer', 1], cheer3: ['cheer', 2],
  sad: ['cheer', 5], appr: ['appr', 3], plant: ['appr', 4], appr0: ['appr', 1], toss: ['serve', 2], srvload: ['serve', 4], srvhold: ['serve', 0] };
// pose statiche (menu, schermate) prese dalle animazioni del foglio (righe di tools/photo/foglio-sprite-2.webp)
const PHOTO_STATIC = { idle: ['idle', 0], run1: ['run', 1], run2: ['run', 5], pass: ['bagher', 3], set: ['set', 4], jump: ['block', 2],
  spkload: ['spike', 3], spkfol: ['spike', 5], passload: ['bagher', 1], setload: ['set', 2], dump: ['dump', 3], dumpfol: ['dump', 5],
  passside: ['dive', 0], srvload: ['serve', 3], spike: ['spike', 4], block: ['block', 4], dive: ['dive', 3], down: ['down', 0],
  cheer: ['cheer', 0], cheer2: ['cheer', 1], cheer3: ['cheer', 2], appr: ['appr', 3], plant: ['appr', 4], appr0: ['appr', 2], toss: ['serve', 1], sad: ['cheer', 6],
  spikefr: ['spike', 4], idle2: ['idle', 4], srvhold: ['serve', 0], jsetload: ['set', 2], jset: ['set', 4], land: ['block', 6],
  jsetloadF: ['set', 2], jsetF: ['set', 4], landF: ['set', 2], jsetloadB: ['set', 2], jsetB: ['set', 4], landB: ['set', 2] };

// una texture per squadra: tutti i fotogrammi, piedi in basso al centro di ogni cella
function makePhotoTex(scene, code) {
  const key = plKey(code, 0);   // 'ph_' + codice (+ '_b' con il look da spiaggia)
  if (scene.textures.exists(key)) return key;
  const ps = photoSet(), S = ps.S;
  if (PHOTO.pixel) return makePhotoPixelTex(scene, key, ps, photoRecolor(TEAMS[code], LOOK.beach, PHOTO_PIX_SC));
  const src = photoRecolor(TEAMS[code], LOOK.beach);
  // in piedi ~43 px: proporzione reale con la rete (1,95 m contro 2,43 m); giocatrici ~1,85 m
  const k = 43 * (ps.fem ? 0.95 : 1) / S.stand;
  // HD: risoluzione piena del foglio, ma entro la texture più grande che la scheda grafica accetta (molti telefoni:
  // 4096 px) e non oltre 2048 px sui telefoni e tablet, dove texture enormi fanno scattare e fermare il gioco
  const rd = scene.sys.game.renderer, maxTex = (rd && rd.getMaxTextureSize && rd.getMaxTextureSize()) || 4096;
  const lim = Math.min(maxTex, typeof TOUCH !== 'undefined' && TOUCH.on ? 2048 : 8192);
  const R = GR > 1 ? Math.min(1 / k, lim / (src.width * k), lim / (src.height * k)) : 1;
  const sc = k * R, cw = S.cw * k, ch = S.ch * k;
  const t = scene.textures.createCanvas(key, Math.ceil(src.width * sc), Math.ceil(src.height * sc)), c = t.getContext();
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(src, 0, 0, src.width * sc, src.height * sc);
  const cell = n => [(n % S.cols) * cw, Math.floor(n / S.cols) * ch, cw, ch];
  const frames = [];
  for (let n = 0; n < S.n; n++) frames.push(['a' + n, ...cell(n)]);
  const ST = S.sheet === 3 ? PHOTO_STATIC3 : PHOTO_STATIC;
  POSES.forEach((p, i) => { const [an, j] = ST[p]; const A = S.anims[an]; frames.push([i, ...cell(A[Math.min(j, A.length - 1)])]); });
  texDone(t, frames, R);
  return key;
}

// PIXEL FOTO: ogni fotogramma ridotto a pixel art come i giocatori ARCADE (in piedi ~40 px), in celle di misura intera:
// riduzione in due passi (più nitida), trasparenza netta e colori ridotti a pochi livelli (senza contorno)
const PHOTO_PIX_SC = 0.4;   // PIXEL FOTO: atlante ricolorato già ridotto (in piedi ~90 px, poi 40 px)
function makePhotoPixelTex(scene, key, ps, src) {
  const S = ps.S, k = 40 * (ps.fem ? 0.95 : 1) / S.stand, z = src.width / ps.atlas.width;   // z: riduzione già fatta
  const CW = Math.ceil(S.cw * k), CH = Math.ceil(S.ch * k);
  const mid = document.createElement('canvas'); mid.width = CW * 2; mid.height = CH * 2;
  const mg = mid.getContext('2d'); mg.imageSmoothingEnabled = true; mg.imageSmoothingQuality = 'high';
  const t = scene.textures.createCanvas(key, CW * S.cols, CH * Math.ceil(S.n / S.cols)), c = t.getContext();
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  const q = v => Math.min(255, Math.round(v / 34) * 34 + 8);   // pochi livelli per canale: aspetto da 16 bit
  for (let n = 0; n < S.n; n++) {
    const sx = (n % S.cols) * S.cw * z, sy = Math.floor(n / S.cols) * S.ch * z, dx = (n % S.cols) * CW, dy = Math.floor(n / S.cols) * CH;
    mg.clearRect(0, 0, mid.width, mid.height);
    mg.drawImage(src, sx, sy, S.cw * z, S.ch * z, 0, 0, CW * 2, CH * 2);
    c.drawImage(mid, 0, 0, CW * 2, CH * 2, dx, dy, CW, CH);
    const img = c.getImageData(dx, dy, CW, CH), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 110) { d[i] = q(d[i]); d[i + 1] = q(d[i + 1]); d[i + 2] = q(d[i + 2]); d[i + 3] = 255; }
      else d[i + 3] = 0;
    }
    c.putImageData(img, dx, dy);
  }
  const cell = n => [(n % S.cols) * CW, Math.floor(n / S.cols) * CH, CW, CH];
  const frames = [];
  for (let n = 0; n < S.n; n++) frames.push(['a' + n, ...cell(n)]);
  const ST = S.sheet === 3 ? PHOTO_STATIC3 : PHOTO_STATIC;
  POSES.forEach((p, i) => { const [an, j] = ST[p]; const A = S.anims[an]; frames.push([i, ...cell(A[Math.min(j, A.length - 1)])]); });
  texDone(t, frames, 1);
  return key;
}

// fotogramma animato secondo lo stato del giocatore: ogni riga del foglio è un movimento in 8 tempi
// (attesa, corsa, rincorsa, schiacciata, bagher, palleggio, muro, battuta in salto, battuta, tuffo, pallonetto, esultanze)
function photoFrame(m, p, pose) {
  if (photoSet().S.sheet === 3) return photoFrame3(m, p, pose);
  const A = photoSet().S.anims, t = p.team, now = m.simT / 1000, b = m.ball;
  const pick = (an, i) => 'a' + A[an][clamp(Math.floor(i), 0, A[an].length - 1)];
  const prog = dur => 1 - clamp(p.animT / dur, 0, 1);
  const st = p.state, server = m.server === p;
  if (st === 'dive') return pick('dive', 2 + (p.diveT > 0.12 ? 0 : 1));
  if (st === 'down') return pick('dive', p.downT > 0.3 ? 4 : 5 + (p.downT < 0.12 ? 1 : 0));
  if (st === 'passside') return pick('dive', 1);
  if (st === 'pass') return pick('bagher', 2 + prog(0.3) * 5);                    // contatto, spinta, ritorno
  if (st === 'set') return pick('set', 3 + prog(0.3) * 3);                         // spinta a braccia tese
  if (st === 'dump') return pick('dump', 3 + prog(0.3) * 3);                       // pallonetto dell'alzatore
  if (st === 'toss') {
    if (m.serveKind === 'jump' || m.serveKind === 'jfloat') return pick('jserve', 0);
    return pick('serve', b.vy < 0 && m.serveKind !== 'tower' ? 3 : 1 + prog(0.4));  // lancio, poi braccio caricato
  }
  if (st === 'spike') {
    if (server && b.lastKind === 'serve') return m.serveKind === 'jump' || m.serveKind === 'jfloat' ? pick('jserve', 4 + prog(0.3) * 2) : pick('serve', 4 + prog(0.3) * 2);
    return pick('spike', 4 + prog(0.3) * 2);                                       // colpo e accompagnamento
  }
  // rincorsa: passi, passo lungo con le braccia indietro, arrivo a piedi pari, stacco
  if (p.z <= 0 && (st === 'run' || st === 'idle')) {
    const tj = m.takeoffIn(p);
    if (tj !== null && tj < CFG.APPR_T + 0.2) {
      if (m.state === 'serve') return pick('jserve', 0);
      return pick('appr', 2 + (1 - clamp(tj / (CFG.APPR_T + 0.2), 0, 1)) * 4);
    }
  }
  if (st === 'run') return pick('run', (p.runT * 12) % A.run.length);
  if (p.z > 0 || st === 'jump' || st === 'block') {
    const fall = p.vz < 0, low = p.z < 8;
    if (st === 'block' || (t.blockers.includes(p) && b.lastTeam !== t)) return pick('block', p.vz > 80 ? 1 : p.vz > 0 ? 3 : low ? 6 : 5);
    if (server && (m.serveKind === 'jump' || m.serveKind === 'jfloat') && b.lastKind !== 'serve') return pick('jserve', p.vz > 60 ? 1 : 2 + (p.vz < 0 ? 1 : 0));
    if (t.attacker === p && !p.decoy) return pick('spike', p.vz > 90 ? 0 : p.vz > 20 ? 1 : 2 + (fall ? 1 : 0));   // braccio caricato
    if (t.plan && t.plan.kind === 'set' && t.plan.p === p) return pick('dump', p.vz > 40 ? 0 : 1);          // alzata in salto
    if (fall && low) return pick(t.attacker === p ? 'spike' : 'block', 6);
    return pick('block', p.vz > 60 ? 1 : p.vz > -40 ? 3 : 5);
  }
  if (st === 'cheer' || st === 'cheer2' || st === 'cheer3') {
    const base = st === 'cheer' ? 0 : st === 'cheer2' ? 1 : 2;
    return pick('cheer', (base + Math.floor(now * 2 + p.idx) % 2 * 3) % 5);
  }
  if (st === 'sad') return pick('cheer', 5 + Math.floor(now + p.idx) % 2);
  // palleggio in arrivo: mani alla fronte
  if (m.state === 'rally' && t.plan && t.plan.p === p && t.plan.kind === 'set' && b.vy < 0) return pick('set', 1 + (now * 4 % 2));
  // posizione d'attesa molleggiata (in azione e durante la battuta), altrimenti attesa più calma
  if (m.state === 'rally' || m.state === 'serve') return pick('idle', (now * 8 + p.idx * 2) % A.idle.length);
  return pick('idle', (now * 3 + p.idx * 2) % A.idle.length);
}

// fogli 3d-maschile-A..D: la posa scelta da match.js (motion) indica il movimento, lo stato e il tempo il fotogramma.
// Righe di 8 tempi: idle (molleggio), run, appr (4 appoggi e stacco), spike (braccio caricato, colpo sopra la testa),
// spikefr (palla presa davanti), bagher, lateral (bagher laterale di fronte), dive (tuffo, a terra, rialzarsi),
// set, jset (palleggio in salto), dump, block, serve (in piedi), jserve (in salto), jfloat (salto flottante), cheer.
function photoFrame3(m, p, pose) {
  const A = photoSet().S.anims, t = p.team, now = m.simT / 1000, b = m.ball;
  const pick = (an, i) => { const L = A[an] || A.idle; return 'a' + L[clamp(Math.floor(i), 0, L.length - 1)]; };
  const prog = dur => 1 - clamp(p.animT / dur, 0, 1);
  const st = p.state, server = m.server === p, sk = m.serveKind;
  const srvAnim = sk === 'jump' ? 'jserve' : sk === 'jfloat' ? 'jfloat' : 'serve';
  // a terra dopo un tuffo, tuffo, bagher laterale
  if (st === 'down' || pose === 'down') return pick('dive', p.downT > 0.25 ? 4 + Math.floor(now * 2) % 2 : 6);
  if (st === 'dive' || pose === 'dive') return pick('dive', p.diveT > 0.14 ? 2 : 3);
  if (st === 'passside' || pose === 'passside') return pick('lateral', 3 + prog(0.3) * 2);
  // battuta: attesa con la palla, lancio, braccio caricato, colpo
  if (pose === 'srvhold') return pick(srvAnim, 0);
  if (st === 'toss') {
    if (sk === 'jump' || sk === 'jfloat') return pick(srvAnim, 1);
    return pick('serve', pose === 'srvload' ? 3 + (b.h > 70 ? 0 : 1) : 2);
  }
  if (st === 'spike' && server && b.lastKind === 'serve' && b.lastPlayer === p) {
    if (sk === 'jump') return pick('jserve', 5 + prog(0.3) * 2);
    if (sk === 'jfloat') return pick('jfloat', 4 + prog(0.3) * 2);
    return pick('serve', 5 + prog(0.3) * 2);
  }
  // colpi
  if (st === 'spike') return pose === 'spikefr' || (pose === 'spkfol' && m.atkOf(p).pose === 'spikefr') ? pick('spikefr', 4 + prog(0.3) * 2.5) : pick('spike', 4 + prog(0.3) * 2.5);
  if (st === 'pass' || pose === 'pass') return pick('bagher', 4 + prog(0.3) * 2.5);
  if (pose === 'passload') return pick('bagher', 2 + (now * 4) % 2);
  // palleggio in salto girato (pose ...F di fronte nel campo destro, ...B di spalle nel sinistro): righe jsetfr / jsetbk
  // del foglio E se ci sono, altrimenti il palleggio in salto di profilo
  if (/^(jsetload|jset|land)[FB]$/.test(pose)) {
    const row = pose.endsWith('F') ? 'jsetfr' : 'jsetbk', base = pose.slice(0, -1);
    if (A[row]) return pick(row, base === 'jsetload' ? 2 + (p.vz < 20 ? 1 : 0) : base === 'jset' ? (p.animT > 0.2 ? 3 : 4) : (p.z > 6 ? 5 : 6));
    pose = base;
  }
  if (pose === 'jsetload') return pick('jset', 2 + (p.vz < 20 ? 1 : 0));
  // palleggio in salto: mani a finestra sopra la fronte, spinta breve, poi in aria resta la stessa posa e
  // vicino a terra si prepara all'atterraggio (niente braccia distese come a muro)
  if (pose === 'jset') return pick('jset', p.animT > 0.2 ? 3 : 4);
  if (pose === 'land') return pick('jset', p.z > 6 ? 3 : 5);
  if (st === 'set' || pose === 'set') return pick('set', 3 + prog(0.3) * 3);
  if (pose === 'setload') return pick('set', 1 + (now * 4) % 2);
  if (st === 'dump' || pose === 'dump' || pose === 'dumpfol') return pick('dump', 3 + prog(0.3) * 3);
  // battuta in salto: subito dopo il lancio il braccio resta alto un attimo, poi parte la rincorsa
  if (m.state === 'serve' && server && (sk === 'jump' || sk === 'jfloat') && m.servePhase === 'toss' && !p.jsJumped && m.jsT < 0.2) return pick(srvAnim, 1);
  // rincorsa (attacco o battuta in salto): passi, passo lungo con le braccia indietro, piedi pari
  if (p.z <= 0 && (pose === 'appr0' || pose === 'appr' || pose === 'plant' || st === 'run')) {
    const tj = m.takeoffIn(p);
    // la riga 'appr' (passi, passo lungo con le braccia indietro, piedi pari, stacco) dura quanto la rincorsa vera:
    // APPR_RUN per l'attacco, un po' di più per la battuta in salto (che parte da più lontano)
    const srvA = m.state === 'serve' && server, win = srvA ? CFG.APPR_T + 0.35 : CFG.APPR_RUN;
    if (tj !== null && tj < win) {
      const k = 1 - clamp(tj / win, 0, 1);
      return pick('appr', k * 5.4);
    }
  }
  if (st === 'run' || pose === 'run1' || pose === 'run2') return pick('run', (p.runT * 12) % A.run.length);
  // in aria
  if (p.z > 0 || st === 'jump' || st === 'block') {
    const fall = p.vz < 0, low = p.z < 8;
    if (p.srvAir) return pick(srvAnim, fall && low ? 7 : 6);   // dopo la battuta in salto: accompagnamento e atterraggio
    if (st === 'block' || (t.blockers.includes(p) && b.lastTeam !== t)) return pick('block', p.vz > 80 ? 2 : p.vz > 0 ? 3 : low ? 6 : 5);
    if (server && (sk === 'jump' || sk === 'jfloat') && !p.served && m.state === 'serve') return pick(srvAnim, sk === 'jump' ? (p.vz > 40 ? 3 : 4) : 3);
    if (t.attacker === p && !p.decoy) {
      if (m.atkOf(p).pose === 'spikefr') return pick('spikefr', p.vz > 60 ? 1 : p.vz > 0 ? 2 : 3);
      return pick('spike', p.vz > 90 ? 0 : p.vz > 30 ? 1 : p.vz > -20 ? 2 : 3);   // braccio caricato, gomito alto
    }
    if (fall && low) return pick(t.attacker === p ? 'spike' : 'block', 7);
    if (p.decoy) return pick('appr', 7);
    return pick('block', p.vz > 60 ? 2 : p.vz > -40 ? 3 : 5);
  }
  if (st === 'cheer' || st === 'cheer2' || st === 'cheer3') {
    const base = st === 'cheer' ? 0 : st === 'cheer2' ? 1 : 2;
    return pick('cheer', [base, 3, 4][(Math.floor(now * 1.5) + p.idx) % 3]);
  }
  if (st === 'sad') return pick('cheer', 5 + Math.floor(now * 0.7 + p.idx) % 2);
  // attesa: molleggio sulle gambe (piedi a terra), più vivo durante il gioco
  if (m.state === 'rally' || m.state === 'serve') return pick('idle', (now * 9 + p.idx * 2) % A.idle.length);
  return pick('idle', (now * 3 + p.idx * 2) % A.idle.length);
}

// menu principale: versione grafica attiva
const _mainMenuCreatePhoto = MainMenuScene.prototype.create;
MainMenuScene.prototype.create = function () {
  _mainMenuCreatePhoto.call(this);
  // autore e versione sempre visibili nella pagina iniziale
  this.add.text(6, 4, `by ${GAME_AUTHOR}  ·  v${GAME_VERSION}`, UI.f(5, '#ffd23a', true));
};
