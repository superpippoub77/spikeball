// ============================================================
//  VERSIONE 3D: ARBITRO E SPETTATORI FOTOREALISTICI (scene3d-sprites.js, da tools/photo/build_scene3d.py)
//  - arbitro: i 7 gesti del foglio 3d-arbitro.png al posto dell'arbitro disegnato nel pannello della battuta e dopo
//    ogni punto (fischio, battuta a sinistra / destra, fuori, tocco del muro, rete, punto);
//  - spettatori: le 32 persone del foglio 3d-spettatori.png al posto di quelli disegnati sugli spalti (tutte le arene);
//    la maglia bianca prende i colori del pubblico (come per i giocatori: pieghe e ombre restano), a volte resta bianca.
//    Quasi tutti seduti o che applaudono, qualcuno con le braccia alzate o con la sciarpa.
//  Nelle versioni ARCADE, PIXEL FOTO e HD restano arbitro e pubblico disegnati.
// ============================================================
const S3D = { ref: null, fans: null, fanReg: null, cache: {} };

const _startGameScene3d = startGame;
startGame = function () {
  const ok = GFX === '3d' && typeof SCENE3D !== 'undefined';
  (ok ? Promise.all([loadImg(SCENE3D.ref.atlas), loadImg(SCENE3D.fans.atlas), loadImg(SCENE3D.fans.regions)])
    .then(([r, f, g]) => { S3D.ref = r; S3D.fans = f; S3D.fanReg = g; }).catch(() => {}) : Promise.resolve()).finally(_startGameScene3d);
};

// ---------------- arbitro ----------------
const _makeRefTex3d = makeRefTex;
makeRefTex = function (scene, pose) {
  // battuta / punto a destra: nel foglio il braccio attraversa il petto; si usa il gesto a sinistra specchiato,
  // come nelle altre versioni (braccio teso verso il lato della squadra)
  const mirror = pose === 'pointR';
  const fr = S3D.ref && SCENE3D.ref.frames.find(f => f.name === (mirror ? 'pointL' : pose));
  if (!fr) return _makeRefTex3d(scene, pose);
  const key = 'ref_' + pose;
  if (scene.textures.exists(key)) return key;
  const W = 56, H = 44;
  const { t, c } = canvasTex(scene, key, W, H);
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a4c8a'); g.addColorStop(1, '#10204a');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const v = c.createRadialGradient(W / 2, H * 0.35, 4, W / 2, H * 0.5, W * 0.7); v.addColorStop(0, 'rgba(255,255,255,0.12)'); v.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = v; c.fillRect(0, 0, W, H);
  // figura alta 54 unità: testa in alto, il pannello taglia poco sotto la cintura (così il braccio teso resta quasi
  // tutto nel pannello); testa al centro del pannello
  const k = 54 / SCENE3D.ref.h;
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  if (mirror) { c.save(); c.translate(W, 0); c.scale(-1, 1); }
  c.drawImage(S3D.ref, fr.x, 0, fr.w, fr.h, W / 2 - fr.hx * k, 2, fr.w * k, fr.h * k);
  if (mirror) c.restore();
  texDone(t); return key;
};

// ---------------- spettatori ----------------
// persona n del foglio con la maglia del colore col (cache per persona e colore)
function fan3dCanvas(n, col) {
  const id = n + ':' + col;
  if (S3D.cache[id]) return S3D.cache[id];
  const f = SCENE3D.fans.frames[n];
  const cv = document.createElement('canvas'); cv.width = f.w; cv.height = f.h;
  const g = cv.getContext('2d'); g.drawImage(S3D.fans, f.x, 0, f.w, f.h, 0, 0, f.w, f.h);
  if (col) {
    const rc = document.createElement('canvas'); rc.width = f.w; rc.height = f.h;
    const rg = rc.getContext('2d'); rg.drawImage(S3D.fanReg, f.x, 0, f.w, f.h, 0, 0, f.w, f.h);
    const img = g.getImageData(0, 0, f.w, f.h), d = img.data, R = rg.getImageData(0, 0, f.w, f.h).data, rgb = hexRGB(col);
    for (let i = 0; i < d.length; i += 4) {
      if (R[i] !== 80 || d[i + 3] === 0) continue;
      const k = clamp(R[i + 1] / 185, 0.3, 1.12);   // luminosità della maglia bianca: pieghe e ombre
      d[i] = clamp(rgb[0] * k, 0, 255); d[i + 1] = clamp(rgb[1] * k, 0, 255); d[i + 2] = clamp(rgb[2] * k, 0, 255);
    }
    g.putImageData(img, 0, 0);
  }
  return (S3D.cache[id] = cv);
}
// righe del foglio: 0 seduti, 1 braccia alzate, 2 applauso, 3 sciarpa o bandierina
const FAN3D_ROWS = [[0, 0.46], [2, 0.32], [1, 0.13], [3, 0.09]];
const _fanPerson3d = fanPerson;
fanPerson = function (c, x, y, R, pal) {
  if (!S3D.fans) return _fanPerson3d(c, x, y, R, pal);
  let r = R(), row = 0;
  for (const [rw, p] of FAN3D_ROWS) { if (r < p) { row = rw; break; } r -= p; }
  const n = row * 8 + Math.floor(R() * 8);
  const sh = pal[Math.floor(R() * pal.length)], white = /^#(e|f|d)[0-9a-f](e|f|d)[0-9a-f](e|f|d)/i.test(sh) || R() < 0.15;
  const cv = fan3dCanvas(n, white ? null : sh), f = SCENE3D.fans.frames[n];
  // spalle larghe 9 unità come gli spettatori disegnati; busto appoggiato in basso nella cella (y + 15)
  const k = 9 / SCENE3D.fans.sh, w = f.w * k, h = f.h * k;
  c.drawImage(cv, x + 4.5 - w / 2, y + 15.5 - h, w, h);
};
