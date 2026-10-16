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
function photoRecolor(P) {
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
  g.putImageData(img, 0, 0);
  return c;
}

// pose statiche (menu, schermate) prese dalle animazioni
const PHOTO_STATIC = { idle: ['idle', 0], run1: ['run', 1], run2: ['run', 4], pass: ['bagher', 3], set: ['block', 2], jump: ['jump', 5],
  spike: ['spike', 5], block: ['block', 4], dive: ['dive', 0], down: ['down', 0], cheer: ['block', 5], toss: ['serve', 3], sad: ['idle', 0] };

// una texture per squadra: tutti i fotogrammi, piedi in basso al centro di ogni cella
function makePhotoTex(scene, code) {
  const key = 'ph_' + code;
  if (scene.textures.exists(key)) return key;
  const S = PHOTO_SPRITES, src = photoRecolor(TEAMS[code]);
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

// fotogramma animato secondo lo stato del giocatore
function photoFrame(m, p) {
  const A = PHOTO_SPRITES.anims, t = p.team, now = m.simT / 1000;
  const pick = (an, i) => 'a' + A[an][clamp(Math.floor(i), 0, A[an].length - 1)];
  const prog = dur => 1 - clamp(p.animT / dur, 0, 1);
  const st = p.state;
  if (st === 'run') return pick('run', (p.runT * 14) % A.run.length);
  if (st === 'dive') return pick('dive', 0);
  if (st === 'down') return pick('down', 0);
  if (st === 'pass') return pick('bagher', 2 + prog(0.3) * 4);                 // contatto e accompagnamento
  if (st === 'set') return pick('block', 2 + prog(0.3) * 2);                   // mani sopra la testa
  if (st === 'toss') return pick('serve', 2 + prog(0.4) * 2);
  if (st === 'spike') {
    if (m.server === p && m.ball.lastKind === 'serve') return pick('serve', 5 + prog(0.3) * 3);
    return pick('spike', 5 + prog(0.3) * 4);
  }
  if (p.z > 0 || st === 'jump' || st === 'block') {
    if (st === 'block' || (t.blockers.includes(p) && m.ball.lastTeam !== t)) return pick('block', p.vz > 60 ? 2 : p.vz > -40 ? 4 : p.z > 6 ? 6 : 7);
    if (t.attacker === p && !p.decoy) return pick('spike', p.vz > 90 ? 2 : 3 + (p.vz < 0 ? 1 : 0));   // braccio caricato
    return pick('jump', p.vz > 80 ? 3 : p.vz > -40 ? 5 : p.z > 6 ? 7 : 8);
  }
  if (st === 'cheer') return pick('block', 4 + Math.floor(now * 4 + p.idx) % 2);
  if (st === 'sad') return pick('idle', 0);
  // fermo: in azione posizione di attesa (bagher pronto), altrimenti respiro
  if (m.state === 'rally' || (m.state === 'serve' && m.server !== p)) return pick('bagher', Math.floor(now * 3 + p.idx) % 2);
  return pick('idle', (now * 6 + p.idx * 2) % A.idle.length);
}

// menu principale: versione grafica attiva
const _mainMenuCreatePhoto = MainMenuScene.prototype.create;
MainMenuScene.prototype.create = function () {
  _mainMenuCreatePhoto.call(this);
  this.add.text(314, 4, `GRAFICA: ${GFX_NAMES[GFX]}   (H: ARCADE / HD / 3D)`, UI.f(4.5, '#8aa0c8')).setOrigin(1, 0);
  // autore e versione sempre visibili nella pagina iniziale
  this.add.text(6, 4, `by ${GAME_AUTHOR}  ·  v${GAME_VERSION}`, UI.f(5, '#ffd23a', true));
};
