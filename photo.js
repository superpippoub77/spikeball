// ============================================================
//  GIOCATORI "FOTO": fotogrammi dal foglio sprite fotografico (photo-sprites.js),
//  ricolorati per squadra (maglia, pantaloncini, pelle) e animati in base allo
//  stato del giocatore. Attivi nella versione grafica 3D (tasto H).
// ============================================================
const PHOTO = {
  on: GFX === '3d',
  atlas: null, regions: null, skinRef: null
};

function loadImg(src) { return new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; }); }
async function loadPhoto() {
  if (!PHOTO.on || typeof PHOTO_SPRITES === 'undefined') { PHOTO.on = false; return; }
  try {
    [PHOTO.atlas, PHOTO.regions] = await Promise.all([loadImg(PHOTO_SPRITES.atlas), loadImg(PHOTO_SPRITES.regions)]);
  } catch (e) { PHOTO.on = false; }
}
const _startGamePhoto = startGame;
startGame = function () { loadPhoto().finally(_startGamePhoto); };


const hexRGB = h => { const n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

// atlante ricolorato per una squadra (a risoluzione piena del foglio)
// ricolora l'atlante: maglia (zona 80) e pantaloncini (160) con i colori della squadra mantenendo le pieghe, pelle (240) per tono
function photoRecolor(P, beach) {
  const S = PHOTO_SPRITES, W = PHOTO.atlas.width, H = PHOTO.atlas.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.drawImage(PHOTO.atlas, 0, 0);
  const img = g.getImageData(0, 0, W, H), d = img.data;
  const rc = document.createElement('canvas'); rc.width = W; rc.height = H;
  const rg = rc.getContext('2d'); rg.drawImage(PHOTO.regions, 0, 0);
  const R = rg.getImageData(0, 0, W, H).data;
  if (!PHOTO.skinRef) {   // colore medio della pelle nel foglio
    let s = [0, 0, 0], n = 0;
    for (let i = 0; i < d.length; i += 4) if (R[i] === 240 && d[i + 3] > 200) { s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; n++; }
    PHOTO.skinRef = s.map(v => v / Math.max(1, n));
  }
  const sh = hexRGB(P.sh), so = hexRGB(P.so), sk = hexRGB(P.sk), ref = PHOTO.skinRef;
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
  if (beach) photoBeach(d, R, W, H, sk, ref);
  g.putImageData(img, 0, 0);
  return c;
}

// beach volley: niente scarpe, calzettoni e ginocchiere. In ogni cella, i pixel non ricolorati (bianchi/grigi)
// della parte bassa della figura diventano pelle: piedi nudi e gambe scoperte.
function photoBeach(d, R, W, H, sk, ref) {
  const S = PHOTO_SPRITES, cw = S.cw, ch = S.ch;
  for (let cy = 0; cy + ch <= H + 1; cy += ch) for (let cx = 0; cx + cw <= W + 1; cx += cw) {
    let top = -1, bot = -1;
    for (let y = cy; y < Math.min(H, cy + ch) && top < 0; y++) for (let x = cx; x < Math.min(W, cx + cw); x++) if (d[(y * W + x) * 4 + 3] > 128) { top = y; break; }
    for (let y = Math.min(H, cy + ch) - 1; y >= cy && bot < 0; y--) for (let x = cx; x < Math.min(W, cx + cw); x++) if (d[(y * W + x) * 4 + 3] > 128) { bot = y; break; }
    if (top < 0 || bot - top < 20) continue;
    const y0 = Math.round(top + (bot - top) * 0.58);
    for (let y = y0; y <= bot; y++) for (let x = cx; x < Math.min(W, cx + cw); x++) {
      const i = (y * W + x) * 4;
      if (d[i + 3] < 30 || R[i]) continue;
      const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), lum = r * 0.299 + g * 0.587 + b * 0.114;
      if (mx - mn > 60) continue;                        // le zone colorate restano
      const f = clamp(0.6 + lum / 420, 0.6, 1.12);        // ginocchiere nere, calzettoni e scarpe diventano pelle
      d[i] = clamp(sk[0] * f, 0, 255); d[i + 1] = clamp(sk[1] * f, 0, 255); d[i + 2] = clamp(sk[2] * f, 0, 255);
    }
  }
}

// pose statiche (menu, schermate) prese dalle animazioni del foglio (righe di tools/photo/foglio-sprite-2.webp)
const PHOTO_STATIC = { idle: ['idle', 0], run1: ['run', 1], run2: ['run', 5], pass: ['bagher', 3], set: ['set', 4], jump: ['block', 2],
  spkload: ['spike', 3], spkfol: ['spike', 5], passload: ['bagher', 1], setload: ['set', 2], dump: ['dump', 3], dumpfol: ['dump', 5],
  passside: ['dive', 0], srvload: ['serve', 3], spike: ['spike', 4], block: ['block', 4], dive: ['dive', 3], down: ['down', 0],
  cheer: ['cheer', 0], cheer2: ['cheer', 1], cheer3: ['cheer', 2], appr: ['appr', 3], plant: ['appr', 4], toss: ['serve', 1], sad: ['cheer', 6],
  srvhold: ['serve', 0], jsetload: ['set', 2], jset: ['set', 4], land: ['block', 6] };

// una texture per squadra: tutti i fotogrammi, piedi in basso al centro di ogni cella
function makePhotoTex(scene, code) {
  const key = plKey(code, 0);   // 'ph_' + codice (+ '_b' con il look da spiaggia)
  if (scene.textures.exists(key)) return key;
  const S = PHOTO_SPRITES, src = photoRecolor(TEAMS[code], LOOK.beach);
  const k = 43 / S.stand;   // in piedi ~43 px: proporzione reale con la rete (1,95 m contro 2,43 m)
  const R = GR > 1 ? 1 / k : 1;                             // HD: risoluzione piena del foglio
  const sc = k * R, cw = S.cw * k, ch = S.ch * k;
  const t = scene.textures.createCanvas(key, Math.ceil(src.width * sc), Math.ceil(src.height * sc)), c = t.getContext();
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  c.drawImage(src, 0, 0, src.width * sc, src.height * sc);
  const cell = n => [(n % S.cols) * cw, Math.floor(n / S.cols) * ch, cw, ch];
  const frames = [];
  for (let n = 0; n < S.n; n++) frames.push(['a' + n, ...cell(n)]);
  POSES.forEach((p, i) => { const [an, j] = PHOTO_STATIC[p]; frames.push([i, ...cell(S.anims[an][j])]); });
  texDone(t, frames, R);
  return key;
}

// fotogramma animato secondo lo stato del giocatore: ogni riga del foglio è un movimento in 8 tempi
// (attesa, corsa, rincorsa, schiacciata, bagher, palleggio, muro, battuta in salto, battuta, tuffo, pallonetto, esultanze)
function photoFrame(m, p) {
  const A = PHOTO_SPRITES.anims, t = p.team, now = m.simT / 1000, b = m.ball;
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

// menu principale: versione grafica attiva
const _mainMenuCreatePhoto = MainMenuScene.prototype.create;
MainMenuScene.prototype.create = function () {
  _mainMenuCreatePhoto.call(this);
  this.add.text(314, 4, `GRAFICA: ${GFX_NAMES[GFX]}   (H: ARCADE / HD / 3D)`, UI.f(4.5, '#8aa0c8')).setOrigin(1, 0);
  // autore e versione sempre visibili nella pagina iniziale
  this.add.text(6, 4, `by ${GAME_AUTHOR}  ·  v${GAME_VERSION}`, UI.f(5, '#ffd23a', true));
};
