// ============================================================
//  PALLONI DAL FOGLIO SPRITE (ball-sprites.js, da tools/photo/palloni.webp)
//  Nelle versioni HD e 3D i palloni CLASSIC (bianco), PRO (giallo e blu) e beach usano i fotogrammi del foglio:
//  8 fotogrammi di rotazione (la luce resta in alto a sinistra) e, per il PRO, 8 fotogrammi di schiacciamento
//  all'impatto. Nella versione ARCADE restano i palloni in pixel art.
//   - pballInstall: crea le texture 'ball', 'ball_pro', 'ball_beach' (immagine ferma, per i menu)
//     e 'ballfx_<chiave>' (fotogrammi r0..r7 e s0..s7, per la partita)
//   - in partita: ballFrame sceglie il fotogramma secondo la rotazione e lo schiacciamento
// ============================================================
const PBALL = { img: null, map: { ball: 'classic', ball_pro: 'pro', ball_beach: 'beach' } };

const _startGameBalls = startGame;
startGame = function () {
  const ok = GR > 1 && typeof BALL_SPRITES !== 'undefined';
  (ok ? loadImg(BALL_SPRITES.atlas).then(i => { PBALL.img = i; }).catch(() => {}) : Promise.resolve()).finally(_startGameBalls);
};

function pballInstall(scene) {
  if (!PBALL.img) return;
  const S = BALL_SPRITES, cw = 8 * S.cell / S.diam;   // cella in unità del gioco (pallone di 8 px)
  for (const key in PBALL.map) {
    if (scene.textures.exists('ballfx_' + key) || !scene.textures.exists(key)) continue;
    const row = S.rows[PBALL.map[key]];
    const draw = (c, i, r, dx, dy) => c.drawImage(PBALL.img, i * S.cell, r * S.cell, S.cell, S.cell, dx, dy, cw, cw);
    scene.textures.remove(key);   // immagine ferma per i menu, al posto di quella disegnata
    let { t, c } = canvasTex(scene, key, 8, 8); c.imageSmoothingQuality = 'high';
    draw(c, 0, row, 4 - cw / 2, 4 - cw / 2); texDone(t);
    ({ t, c } = canvasTex(scene, 'ballfx_' + key, cw * 8, cw * 2)); c.imageSmoothingQuality = 'high';
    const frames = [];
    for (let i = 0; i < 8; i++) {
      draw(c, i, row, i * cw, 0); frames.push(['r' + i, i * cw, 0, cw, cw]);
      draw(c, i, S.rows.squash, i * cw, cw); frames.push(['s' + i, i * cw, cw, cw, cw]);
    }
    texDone(t, frames);
  }
}
// le funzioni che creano i palloni installano subito quelli del foglio
for (const fn of ['makeCommon', 'makeBalls', 'makeBeachBall']) {
  const orig = window[fn];
  window[fn] = function (scene) { const r = orig.apply(this, arguments); pballInstall(scene); return r; };
}

// fotogramma del pallone in partita: rotazione (spin) e schiacciamento dopo un colpo forte o a terra
function ballFrame(m, dt) {
  const spr = m.ballSpr, key = m.ballKey, b = m.ball;
  if (!key) return;
  const rot = ((b.spin % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  let frame = 'r' + Math.floor(rot / (Math.PI * 2) * 8) % 8, sx = 1, sy = 1;
  if (m.squashT > 0) {
    m.squashT -= dt;
    const pr = 1 - clamp(m.squashT / CFG.SQUASH_T, 0, 1);
    if (key === 'ball_pro') frame = 's' + Math.min(7, Math.floor(pr * 8));
    else { const k = Math.sin(pr * Math.PI); sx = 1 + 0.22 * k; sy = 1 - 0.28 * k; }
  }
  spr.setFrame(frame).setScale(sx, sy);
  spr.rotation = 0;   // la luce resta ferma: gira il disegno, non l'immagine
}
