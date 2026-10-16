// ============================================================
//  Grafica procedurale: nessun asset dell'originale.
//  Giocatori, volti, arbitro, bandiere, palazzetto, schermate.
// ============================================================
const FW = 32, FH = 48;   // giocatori alti ~40 px come nel gioco originale (misurati sul video HD)
const POSES = ['idle', 'run1', 'run2', 'pass', 'set', 'jump', 'spike', 'block', 'dive', 'down', 'cheer', 'toss', 'sad'];
const PF = {}; POSES.forEach((p, i) => PF[p] = i);

const SKEL = {
  idle:  { hip: [14, 25], neck: [17, 14], head: [19, 9], bl: [[17, 31], [13, 38]], fl: [[20, 31], [17, 38]], ba: [[18, 21], [22, 23]], fa: [[19, 21], [23, 22]] },
  run1:  { hip: [16, 25], neck: [18, 14], head: [20, 10], bl: [[13, 30], [10, 36]], fl: [[20, 30], [20, 38]], ba: [[15, 19], [13, 22]], fa: [[21, 18], [23, 15]] },
  run2:  { hip: [16, 25], neck: [18, 14], head: [20, 10], bl: [[16, 31], [17, 38]], fl: [[18, 30], [13, 34]], ba: [[20, 18], [22, 15]], fa: [[15, 19], [13, 22]] },
  pass:  { hip: [13, 29], neck: [18, 20], head: [21, 16], bl: [[17, 33], [12, 38]], fl: [[21, 33], [21, 38]], ba: [[22, 25], [27, 28]], fa: [[22, 25], [27, 28]] },
  set:   { hip: [16, 24], neck: [16, 13], head: [17, 9],  bl: [[14, 31], [14, 38]], fl: [[18, 31], [18, 38]], ba: [[15, 8], [17, 3]],  fa: [[19, 8], [19, 3]] },
  jump:  { hip: [16, 24], neck: [17, 13], head: [18, 9],  bl: [[14, 30], [12, 35]], fl: [[19, 30], [16, 36]], ba: [[13, 17], [10, 14]], fa: [[14, 18], [11, 16]] },
  spike: { hip: [15, 24], neck: [16, 13], head: [18, 9],  bl: [[13, 30], [15, 36]], fl: [[18, 30], [15, 37]], ba: [[19, 16], [22, 18]], fa: [[19, 7], [22, 2]] },
  block: { hip: [16, 24], neck: [16, 13], head: [17, 9],  bl: [[15, 31], [15, 38]], fl: [[17, 31], [17, 38]], ba: [[16, 6], [17, 1]],  fa: [[18, 6], [19, 1]] },
  dive:  { hip: [9, 32],  neck: [21, 33], head: [25, 32], bl: [[5, 31], [1, 30]],   fl: [[5, 33], [1, 33]],   ba: [[25, 35], [30, 35]], fa: [[25, 34], [30, 33]] },
  down:  { hip: [10, 36], neck: [22, 36], head: [26, 35], bl: [[6, 37], [2, 38]],   fl: [[6, 38], [2, 37]],   ba: [[26, 38], [30, 38]], fa: [[26, 37], [30, 37]] },
  cheer: { hip: [16, 24], neck: [16, 13], head: [17, 9],  bl: [[14, 31], [13, 38]], fl: [[18, 31], [19, 38]], ba: [[13, 8], [10, 3]],  fa: [[20, 8], [23, 3]] },
  toss:  { hip: [16, 24], neck: [17, 13], head: [18, 9],  bl: [[14, 31], [14, 38]], fl: [[18, 31], [18, 38]], ba: [[14, 18], [12, 21]], fa: [[19, 8], [20, 3]] },
  sad:   { hip: [15, 25], neck: [17, 15], head: [19, 12], bl: [[14, 31], [13, 38]], fl: [[17, 31], [17, 38]], ba: [[16, 20], [15, 25]], fa: [[18, 20], [17, 25]] }
};

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(Math.round(((n >> 16) & 255) * f), 0, 255), g = clamp(Math.round(((n >> 8) & 255) * f), 0, 255), b = clamp(Math.round((n & 255) * f), 0, 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function thick(ctx, ox, a, b, w, color, oy = 0) {
  ctx.fillStyle = color;
  const len = Math.max(1, Math.hypot(b[0] - a[0], b[1] - a[1]));
  for (let i = 0; i <= len * 2; i++) {
    const t = i / (len * 2);
    ctx.fillRect(ox + Math.round(a[0] + (b[0] - a[0]) * t - w / 2), oy + Math.round(a[1] + (b[1] - a[1]) * t - w / 2), w, w);
  }
}
const lerpP = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function poly(ctx, ox, pts, color) {
  ctx.fillStyle = color; ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, ox + p[0], p[1]));
  ctx.closePath(); ctx.fill();
}
// limb: segmento spesso con estremità arrotondate (forma "muscolosa", non stecchino)
let LIMB_K = 1.12;
function limb(ctx, ox, a, b, w0, w1, color) {
  w0 *= LIMB_K; w1 *= LIMB_K;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.max(0.01, Math.hypot(dx, dy)), nx = -dy / L, ny = dx / L;
  poly(ctx, ox, [[a[0] + nx * w0 / 2, a[1] + ny * w0 / 2], [b[0] + nx * w1 / 2, b[1] + ny * w1 / 2], [b[0] - nx * w1 / 2, b[1] - ny * w1 / 2], [a[0] - nx * w0 / 2, a[1] - ny * w0 / 2]], color);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(ox + a[0], a[1], w0 / 2, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(ox + b[0], b[1], w1 / 2, 0, 7); ctx.fill();
}
function drawPlayer(ctx, ox, pose, P, hair) {
  ctx.imageSmoothingEnabled = false;
  const s0 = SKEL[pose];
  // corporatura "arcade": figura di ~30 px, testa grande, busto largo (misure dal video HD)
  const K = 1.17;   // scala del corpo: da ~34 a ~40 px
  const sc = p => [16 + (p[0] - 16) * 1.06, 47 - (39 - p[1]) * K];
  const s = { hip: sc(s0.hip), neck: sc(s0.neck), head: sc(s0.head), bl: s0.bl.map(sc), fl: s0.fl.map(sc), ba: s0.ba.map(sc), fa: s0.fa.map(sc) };
  const skin = P.sk, skinD = shade(P.sk, 0.74), skinB = shade(P.sk, 0.6);
  const shirt = P.sh, shirtD = shade(P.sh, 0.62), shirtL = shade(P.sh, 1.18), shorts = P.so, shortsD = shade(P.so, 0.68);
  const leg = (j, back) => {
    const knee = j[0], foot = j[1];
    limb(ctx, ox, s.hip, knee, 6, 5, back ? skinB : skin);                                   // coscia
    limb(ctx, ox, s.hip, lerpP(s.hip, knee, 0.28), 5.6, 5.2, back ? shortsD : shorts);       // pantaloncino corto
    const sock = lerpP(knee, foot, 0.55);
    limb(ctx, ox, knee, sock, 4, 3.4, back ? skinB : skinD);                                 // polpaccio
    limb(ctx, ox, sock, foot, 3.4, 3, back ? '#b4b4bc' : '#f2f2f2');                          // calzettone
    const fx = Math.round(foot[0]), fy = Math.round(foot[1]);
    ctx.fillStyle = back ? '#a0a0a8' : '#ffffff'; ctx.fillRect(ox + fx - 2, fy - 2, 7, 2);   // scarpa
    ctx.fillStyle = back ? '#6a6a78' : '#9898a8'; ctx.fillRect(ox + fx - 2, fy, 6, 1);
    ctx.fillStyle = back ? '#b8b8c0' : '#f4f4f4';                                            // ginocchiera grande
    ctx.beginPath(); ctx.ellipse(ox + knee[0] + 0.5, knee[1] + 0.5, 3.1, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = back ? '#8c8c96' : '#c4c4cc'; ctx.fillRect(ox + Math.round(knee[0]) - 2, Math.round(knee[1]) + 2, 4, 1);
  };
  const arm = (j, back) => {
    const sh = lerpP(s.neck, s.hip, 0.14);
    limb(ctx, ox, sh, j[0], 4, 3.4, back ? skinB : skin);
    limb(ctx, ox, j[0], j[1], 3.4, 2.8, back ? skinB : skin);
    limb(ctx, ox, sh, lerpP(sh, j[0], 0.42), 4.6, 4, back ? shirtD : shirt);                 // manica corta
    ctx.fillStyle = back ? skinB : skin; ctx.beginPath(); ctx.arc(ox + j[1][0], j[1][1], 1.7, 0, 7); ctx.fill();
  };
  arm(s.ba, true);
  leg(s.bl, true);
  // busto largo con ombra sul dorso e luce sul petto
  const dir = [s.hip[0] - s.neck[0], s.hip[1] - s.neck[1]], L = Math.hypot(dir[0], dir[1]), nx = -dir[1] / L, ny = dir[0] / L;
  const c1 = lerpP(s.neck, s.hip, 0.02), c2 = lerpP(s.neck, s.hip, 0.92);
  const Q = (p, k) => [p[0] + nx * k, p[1] + ny * k];
  poly(ctx, ox, [Q(c1, 6.1), Q(c2, 5), Q(c2, -5.2), Q(c1, -5.9)], shirt);
  poly(ctx, ox, [Q(c1, 6.1), Q(c2, 5), Q(c2, 2.3), Q(c1, 2.5)], shirtD);
  poly(ctx, ox, [Q(c1, -2.8), Q(c2, -3.4), Q(c2, -5.2), Q(c1, -5.9)], shirtL);
  limb(ctx, ox, lerpP(s.neck, s.hip, 0.9), s.hip, 6.6, 6, shorts);
  ctx.fillStyle = shortsD; const hp = Q(s.hip, 2.5); ctx.fillRect(ox + Math.round(hp[0]) - 1, Math.round(hp[1]) - 2, 2, 4);
  leg(s.fl, false);
  // testa grande di profilo
  const [hx, hy] = s.head;
  limb(ctx, ox, s.neck, lerpP(s.neck, s.head, 0.45), 3.2, 3.2, skinD);
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(ox + hx, hy, 4.2, 4.8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = skin; ctx.fillRect(ox + hx + 3.5, hy, 2, 2);                       // naso
  ctx.fillStyle = skinD; ctx.fillRect(ox + hx - 1, hy + 3, 4, 1);                    // mascella
  ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(ox + hx - 0.8, hy - 2.8, 4.8, 3.2, 0, 0, 7); ctx.fill();
  ctx.fillRect(ox + hx - 5.5, hy - 2, 3.5, 6);
  ctx.fillStyle = shade(hair, 1.55); ctx.fillRect(ox + hx - 2, hy - 5, 4, 1);
  ctx.fillStyle = skinD; ctx.fillRect(ox + hx - 1, hy - 1, 1, 2);                    // orecchio
  ctx.fillStyle = '#201010'; ctx.fillRect(ox + hx + 2, hy - 1, 1, 1);                // occhio
  ctx.fillStyle = '#ffffff'; const cl = lerpP(s.neck, s.hip, 0.04); ctx.fillRect(ox + Math.round(cl[0]) - 2, Math.round(cl[1]) - 1, 4, 1); // colletto
  arm(s.fa, false);
}

// ---------------- texture a risoluzione GR (HD) ----------------
// In HD ogni texture è disegnata a GR volte i pixel nativi, poi i suoi frame vengono "ristretti"
// alla misura nativa: il gioco continua a ragionare in pixel 320x224 senza cambiare nulla.
function canvasTex(scene, key, w, h) {
  const t = scene.textures.createCanvas(key, Math.ceil(w * GR), Math.ceil(h * GR)), c = t.getContext();
  c.setTransform(GR, 0, 0, GR, 0, 0);
  return { t, c };
}
// frames: [nome, x, y, w, h] in pixel nativi
function texDone(t, frames = []) {
  t.refresh();
  for (const [n, x, y, w, h] of frames) t.add(n, 0, x * GR, y * GR, w * GR, h * GR);
  if (GR === 1) return;
  t.setFilter(Phaser.Textures.FilterMode.LINEAR);
  for (const n of t.getFrameNames(true)) {
    const f = t.get(n), k = 1 / GR;
    f.cutWidth *= k; f.cutHeight *= k; f.width *= k; f.height *= k; f.x *= k; f.y *= k;
    f.halfWidth = f.width / 2; f.halfHeight = f.height / 2; f.centerX = Math.floor(f.width / 2); f.centerY = Math.floor(f.height / 2);
    const d = f.data;
    d.cut.w *= k; d.cut.h *= k; d.sourceSize.w *= k; d.sourceSize.h *= k;
    d.spriteSourceSize.w *= k; d.spriteSourceSize.h *= k; d.radius *= k;
  }
}

// colori della squadra con i dati del giocatore i (pelle e numero di maglia dalle squadre JSON)
function playerPal(code, i) {
  const P = TEAMS[code];
  if (!P.sks && !P.nums) return P;
  return Object.assign({}, P, { sk: (P.sks && P.sks[i]) || P.sk, num: P.nums ? P.nums[i] : null,
    sh: (P.shs && P.shs[i]) || P.sh, tr: (P.trs && P.trs[i]) || P.tr });
}

function makePlayerTex(scene, code, i) {
  const key = `pl_${code}_${i}`;
  if (scene.textures.exists(key)) return key;
  const P = playerPal(code, i), hair = P.ha[i % P.ha.length];
  const { t, c } = canvasTex(scene, key, FW * POSES.length, FH);
  if (GR > 1) { c.setTransform(1, 0, 0, 1, 0, 0); POSES.forEach((p, k) => c.drawImage(drawPlayerHD(p, P, hair, GR), k * FW * GR, 0)); }
  else POSES.forEach((p, k) => drawPlayer(c, k * FW, p, P, hair));
  texDone(t, POSES.map((p, k) => [k, k * FW, 0, FW, FH]));
  return key;
}

// ---------------- volti (ritratti procedurali) ----------------
function seeded(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function hashStr(t) {
  let h = 2166136261;
  for (const c of t) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (Math.abs(h) % 2147483646) + 1;
}

// ritratto 40x40; expr: 'neutral' | 'cheer'
function drawFace(ctx, ox, oy, code, idx, expr) {
  const P = playerPal(code, idx), R = seeded(hashStr(code + ':' + idx)); R(); R();
  const skin = P.sk, dk = shade(skin, 0.72), lt = shade(skin, 1.12);
  const hair = P.ha[idx % P.ha.length];
  const style = [0, 0, 2, 3, 0, 1, 3, 2][Math.floor(R() * 8)];   // 0 corti, 1 rasati, 2 lunghi, 3 riccioli
  const jaw = 1 + Math.floor(R() * 2);
  const bg = ctx.createLinearGradient(0, oy, 0, oy + 40);
  bg.addColorStop(0, '#1c3478'); bg.addColorStop(1, '#0c1840');
  ctx.fillStyle = bg; ctx.fillRect(ox, oy, 40, 40);
  const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, w, h); };
  // spalle e maglia
  const cheer = expr === 'cheer';
  px(2, 33, 36, 7, P.sh); px(6, 31, 28, 3, P.sh);
  px(15, 30, 10, 4, '#f4f4f4'); px(17, 31, 6, 2, P.tr);
  if (cheer) { px(0, 18, 7, 15, P.sh); px(33, 18, 7, 15, P.sh); px(1, 11, 6, 8, skin); px(33, 11, 6, 8, skin); }
  // collo e viso
  px(16, 26, 8, 5, dk);
  px(11, 8, 18, 18, skin); px(12 - jaw, 12, 2, 10, skin); px(28 - 1 + jaw, 12, 2, 10, skin);
  px(13, 24, 14, 3, skin); px(15, 27, 10, 1, dk);
  px(11, 18, 1, 6, dk); px(28, 18, 1, 6, dk); px(26, 10, 3, 14, shade(skin, 0.9));
  // capelli
  if (style !== 1) { px(10, 5, 20, 5, hair); px(9, 7, 3, 8, hair); px(28, 7, 3, 7, hair); }
  else { px(11, 6, 18, 3, shade(skin, 0.95)); px(12, 6, 16, 1, lt); }
  if (style === 2) { px(8, 9, 3, 14, hair); px(29, 9, 3, 12, hair); }
  if (style === 3) for (let i = 0; i < 6; i++) px(10 + i * 3, 4 + (i % 2), 3, 3, shade(hair, 1.3));
  px(12, 7, 6, 1, shade(hair, 1.4));
  // occhi, sopracciglia, naso, bocca
  const eyeY = cheer ? 15 : 15;
  px(14, eyeY - 2, 4, 1, shade(hair, 0.8)); px(22, eyeY - 2, 4, 1, shade(hair, 0.8));
  px(14, eyeY, 4, 2, '#ffffff'); px(22, eyeY, 4, 2, '#ffffff');
  px(15 + (cheer ? 0 : 1), eyeY, 2, 2, '#2a1a10'); px(23 + (cheer ? 0 : 1), eyeY, 2, 2, '#2a1a10');
  px(19, 16, 2, 5, dk); px(18, 20, 4, 1, dk);
  if (cheer) { px(16, 22, 8, 4, '#5a1010'); px(17, 22, 6, 1, '#ffffff'); px(17, 25, 6, 1, '#c04040'); }
  else { px(16, 23, 8, 1, '#a05048'); px(17, 24, 6, 1, shade(skin, 0.85)); }
  px(13, 9, 4, 1, lt);
}

function makeFaceTex(scene, code, idx, expr) {
  const key = `face_${code}_${idx}_${expr}`;
  if (scene.textures.exists(key)) return key;
  const { t, c } = canvasTex(scene, key, 40, 40);
  (GR > 1 ? drawFaceHD : drawFace)(c, 0, 0, code, idx, expr); texDone(t);
  return key;
}

// ---------------- arbitro ----------------
// pose: 'whistle', 'pointL', 'pointR', 'out', 'touch', 'net', 'win'
function makeRefTex(scene, pose) {
  const key = 'ref_' + pose;
  if (scene.textures.exists(key)) return key;
  const W = 56, H = 44;
  const { t, c } = canvasTex(scene, key, W, H);
  if (GR > 1) { drawRefHD(c, pose, W, H); texDone(t); return key; }
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#22407a'); g.addColorStop(1, '#122650');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const px = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const shirt = '#f0f0f6', sd = '#c8c8d6', skin = '#f0c4a4', sk2 = '#d09878';
  // busto
  px(18, 24, 20, 20, shirt); px(27, 24, 2, 20, sd); px(20, 30, 4, 4, '#d0a020'); px(21, 31, 2, 2, '#4040a0');
  px(25, 22, 6, 3, '#2a2a3a');
  // testa
  px(22, 6, 12, 15, skin); px(21, 9, 1, 8, sk2); px(34, 9, 1, 8, sk2);
  px(21, 3, 14, 5, '#e8e8e0'); px(20, 5, 3, 7, '#d8d8d0'); px(33, 5, 3, 7, '#d8d8d0');
  px(24, 12, 2, 2, '#30304a'); px(30, 12, 2, 2, '#30304a'); px(27, 14, 2, 3, sk2);
  px(26, 18, 4, 1, '#a05050');
  const arm = (pts, col = shirt) => { for (let i = 0; i < pts.length - 1; i++) thick(c, 0, pts[i], pts[i + 1], 4, col); const h = pts[pts.length - 1]; px(h[0] - 2, h[1] - 2, 4, 4, skin); };
  switch (pose) {
    case 'whistle': arm([[20, 26], [16, 30], [24, 20]]); px(27, 17, 3, 2, '#c0c0c0'); arm([[36, 26], [44, 22], [46, 10]]); break;
    case 'pointL': arm([[20, 26], [10, 28], [3, 32]]); arm([[36, 26], [46, 28], [53, 26]]); break;
    case 'pointR': arm([[20, 26], [10, 28], [3, 26]]); arm([[36, 26], [46, 28], [53, 32]]); break;
    case 'out': arm([[20, 26], [16, 16], [16, 6]]); arm([[36, 26], [40, 16], [40, 6]]); break;
    case 'touch': arm([[20, 26], [18, 18], [24, 12]]); arm([[36, 26], [38, 18], [31, 10]]); break;
    case 'net': arm([[20, 26], [14, 32], [14, 40]]); arm([[36, 26], [44, 24], [50, 18]]); px(48, 12, 6, 30, 'rgba(255,255,255,0.25)'); break;
    case 'win': arm([[20, 26], [16, 34], [18, 42]]); arm([[36, 26], [46, 22], [54, 16]]); break;
  }
  c.strokeStyle = '#e0e8ff'; c.lineWidth = 1; c.strokeRect(0.5, 0.5, W - 1, H - 1);
  texDone(t); return key;
}

// ---------------- bandiere ----------------
function drawFlag(c, x, y, w, h, code) {
  const R = (a, b, cw, ch, col) => { c.fillStyle = col; c.fillRect(x + a, y + b, cw, ch); };
  const v3 = (a, b, d) => { const k = w / 3; R(0, 0, k + 1, h, a); R(k, 0, k + 1, h, b); R(2 * k, 0, w - 2 * k, h, d); };
  const h3 = (a, b, d) => { const k = h / 3; R(0, 0, w, k + 1, a); R(0, k, w, k + 1, b); R(0, 2 * k, w, h - 2 * k, d); };
  const cross = (bg, cr, inner) => { R(0, 0, w, h, bg); const cw = Math.max(2, h / 4); R(w * 0.3, 0, cw, h, cr); R(0, h / 2 - cw / 2, w, cw, cr);
    if (inner) { const iw = Math.max(1, cw / 2); R(w * 0.3 + cw / 4, 0, iw, h, inner); R(0, h / 2 - iw / 2, w, iw, inner); } };
  switch (code) {
    case 'ITA': v3('#1e9a40', '#ffffff', '#e02828'); break;
    case 'FRA': v3('#2440b0', '#ffffff', '#e02828'); break;
    case 'GER': h3('#141414', '#e02020', '#f2c818'); break;
    case 'ESP': R(0, 0, w, h, '#d82020'); R(0, h / 4, w, h / 2, '#f2c818'); R(w * 0.25, h * 0.4, w * 0.12, h * 0.2, '#b02020'); break;
    case 'SWE': cross('#2058c0', '#f2c818'); break;
    case 'NOR': cross('#d02020', '#ffffff', '#203080'); break;
    case 'DEN': cross('#d02020', '#ffffff'); break;
    case 'GBR': R(0, 0, w, h, '#203080');
      c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(2, h / 6); c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y + h); c.moveTo(x + w, y); c.lineTo(x, y + h); c.stroke();
      c.strokeStyle = '#d02020'; c.lineWidth = Math.max(1, h / 14); c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y + h); c.moveTo(x + w, y); c.lineTo(x, y + h); c.stroke();
      R(w / 2 - h / 6, 0, h / 3, h, '#ffffff'); R(0, h / 2 - h / 6, w, h / 3, '#ffffff'); R(w / 2 - h / 10, 0, h / 5, h, '#d02020'); R(0, h / 2 - h / 10, w, h / 5, '#d02020'); break;
    case 'BRA': R(0, 0, w, h, '#1e9a40'); c.fillStyle = '#f2d020'; c.beginPath(); c.moveTo(x + w / 2, y + h * 0.1); c.lineTo(x + w * 0.92, y + h / 2); c.lineTo(x + w / 2, y + h * 0.9); c.lineTo(x + w * 0.08, y + h / 2); c.fill();
      c.fillStyle = '#2040b0'; c.beginPath(); c.arc(x + w / 2, y + h / 2, h * 0.22, 0, 7); c.fill(); break;
    case 'CHN': R(0, 0, w, h, '#de2910'); c.fillStyle = '#ffde00'; star(c, x + w * 0.18, y + h * 0.28, h * 0.17);
      for (const [a, b] of [[0.33, 0.12], [0.4, 0.24], [0.4, 0.4], [0.33, 0.52]]) star(c, x + w * a, y + h * b, h * 0.06); break;
    case 'JPN': R(0, 0, w, h, '#ffffff'); c.fillStyle = '#d42020'; c.beginPath(); c.arc(x + w / 2, y + h / 2, h * 0.3, 0, 7); c.fill(); break;
    case 'USA': for (let i = 0; i < 7; i++) R(0, (h / 7) * i, w, h / 14 + 0.5, '#c82020'); for (let i = 0; i < 7; i++) R(0, (h / 7) * i + h / 14, w, h / 14 + 0.5, '#ffffff');
      R(0, 0, w * 0.42, h * 0.54, '#203a90'); c.fillStyle = '#fff'; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) c.fillRect(x + 2 + i * w * 0.1, y + 2 + j * h * 0.16, 1, 1); break;
    case 'CUB': for (let i = 0; i < 5; i++) R(0, (h / 5) * i, w, h / 5 + 0.5, i % 2 ? '#ffffff' : '#2040b0');
      c.fillStyle = '#d02020'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w * 0.45, y + h / 2); c.lineTo(x, y + h); c.fill(); c.fillStyle = '#fff'; star(c, x + w * 0.15, y + h / 2, h * 0.12); break;
    case 'URS': R(0, 0, w, h, '#cc1010'); c.fillStyle = '#ffd820'; star(c, x + w * 0.16, y + h * 0.16, h * 0.07);
      R(w * 0.1, h * 0.3, w * 0.12, Math.max(1, h * 0.05), '#ffd820'); R(w * 0.14, h * 0.24, Math.max(1, w * 0.03), h * 0.2, '#ffd820'); break;
    default: R(0, 0, w, h, '#888');
  }
}
function star(c, cx, cy, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  c.fill();
}
function makeFlagTex(scene, code, w, h) {
  const key = `flag_${code}_${w}x${h}`;
  if (scene.textures.exists(key)) return key;
  const { t, c } = canvasTex(scene, key, w + 2, h + 2);
  c.fillStyle = '#000'; c.fillRect(0, 0, w + 2, h + 2);
  drawFlag(c, 1, 1, w, h, code);
  if (GR > 1) {   // in HD: leggera ondulazione di luce sul tessuto
    const g = c.createLinearGradient(1, 0, w + 1, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.16)'); g.addColorStop(0.35, 'rgba(0,0,0,0.12)'); g.addColorStop(0.7, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.14)');
    c.fillStyle = g; c.fillRect(1, 1, w, h);
  }
  texDone(t); return key;
}

// ---------------- oggetti comuni ----------------
function makeCommon(scene) {
  if (scene.textures.exists('ball')) return;
  let { t, c } = canvasTex(scene, 'ball', 8, 8);
  if (GR > 1) drawBallHD(c, 4, 4, 4);
  else {
    c.fillStyle = '#ffffff'; c.fillRect(2, 0, 4, 8); c.fillRect(0, 2, 8, 4); c.fillRect(1, 1, 6, 6);
    c.fillStyle = '#c8c8d8'; c.fillRect(5, 5, 2, 2); c.fillRect(1, 5, 1, 1); c.fillRect(6, 2, 1, 2);
    c.fillStyle = '#d8d8e0'; c.fillRect(3, 1, 1, 6); c.fillRect(1, 3, 6, 1);
  }
  texDone(t);
  // pallone grande (cursori dei menu)
  ({ t, c } = canvasTex(scene, 'ballbig', 16, 16));
  if (GR > 1) drawBallHD(c, 8, 8, 7.6);
  else {
    c.fillStyle = '#f4f4f4'; c.beginPath(); c.arc(8, 8, 7.5, 0, 7); c.fill();
    c.strokeStyle = '#a0a0b0'; c.lineWidth = 1; c.beginPath(); c.arc(8, 8, 7, 0, 7); c.stroke();
    c.beginPath(); c.arc(2, 6, 8, -0.6, 0.9); c.stroke(); c.beginPath(); c.arc(14, 12, 8, 2.6, 3.9); c.stroke();
    c.fillStyle = '#c8c8d0'; c.fillRect(9, 10, 4, 3);
  }
  texDone(t);
  // marcatore 1P
  ({ t, c } = canvasTex(scene, 'mark1p', 14, 10));
  c.fillStyle = '#e02020'; c.font = 7 * FONT_K + 'px ' + FONT; c.fillText('1P', 0, 7); c.fillStyle = '#ffffff'; c.fillRect(0, 8, 12, 1); c.fillRect(10, 6, 2, 4);
  texDone(t);
  ({ t, c } = canvasTex(scene, 'mark2p', 14, 10));
  c.fillStyle = '#2060ff'; c.font = 7 * FONT_K + 'px ' + FONT; c.fillText('2P', 0, 7); c.fillStyle = '#ffffff'; c.fillRect(0, 8, 12, 1); c.fillRect(10, 6, 2, 4);
  texDone(t);
}

// sfondo blu a motivo diagonale (schermate di menu)
function makePattern(scene) {
  if (scene.textures.exists('pattern')) return;
  const { t, c } = canvasTex(scene, 'pattern', 320, 224);
  c.fillStyle = '#1838c0'; c.fillRect(0, 0, 320, 224);
  c.font = 'italic bold 11px Arial, sans-serif'; c.fillStyle = '#2a52e0';
  for (let y = 10, r = 0; y < 240; y += 13, r++)
    for (let x = -((r * 63) % 210); x < 320; x += 210) c.fillText(PATTERN_TEXT, x, y);
  texDone(t);
}

// ---------------- palazzetto ----------------
function crowd(c, x0, y0, w, h, seed, dens = 1) {
  if (GR > 1) return crowdHD(c, x0, y0, w, h, seed, dens);
  const R = seeded(seed);
  const shirts = ['#c8c8c8', '#e0e0e0', '#a04040', '#4050a0', '#808090', '#c09060', '#606070', '#904070', '#d0d0d0'];
  for (let y = y0; y < y0 + h; y += 6) for (let x = x0 + ((y / 6) % 2) * 2; x < x0 + w; x += 4) {
    if (R() > 0.92 * dens) continue;
    c.fillStyle = shirts[Math.floor(R() * shirts.length)]; c.fillRect(x, y + 3, 3, 3);
    c.fillStyle = R() < 0.7 ? '#d8a888' : '#a07050'; c.fillRect(x + 1, y + 1, 2, 2);
    c.fillStyle = R() < 0.6 ? '#2a1a10' : '#5a4030'; c.fillRect(x + 1, y, 2, 1);
  }
}
const ADS1 = ['VOLTEX', 'MIRAKO', 'KOBAYA', 'SESIA', 'NORDLUX', 'ALPINA'];
const ADS2 = ['SPIKE COLA', 'NETWORX', 'RIVA', 'ZEPHYR', 'KOMA'];

function makeArena(scene) {
  const W = 560;
  if (scene.textures.exists('bg_far')) return;
  let { t, c } = canvasTex(scene, 'bg_far', W, 112);
  c.fillStyle = '#1e2420'; c.fillRect(0, 0, W, 112);
  c.fillStyle = '#2c342e';
  for (let x = 0; x < W; x += 34) c.fillRect(x, 0, 2, 54);
  c.fillRect(0, 28, W, 2);
  // riflettori tondi a coppie (video HD) con alone
  const lamp = (x, y, r) => {
    const gr = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0.5, x, y, r);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#c8c8c4'); gr.addColorStop(1, '#3a3e3a');
    c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  };
  for (let x = 20; x < W; x += 70) { lamp(x, 40, 4); lamp(x + 10, 40, 4); }
  for (let x = 54; x < W; x += 70) { c.fillStyle = '#9a9e98'; c.fillRect(x, 20, 2, 2); c.fillRect(x, 32, 2, 2); }
  for (let x = 6; x < W; x += 24) { c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x, 50, 6, 1); }
  c.fillStyle = '#4a4a46'; c.fillRect(0, 56, W, 56);
  crowd(c, 0, 57, W, 54, 7, 1.05);
  c.fillStyle = 'rgba(40,46,40,0.35)'; c.fillRect(0, 56, W, 56);
  texDone(t);
  ({ t, c } = canvasTex(scene, 'bg_ads', W, 22));
  c.fillStyle = '#7a5a40'; c.fillRect(0, 0, W, 22); c.fillStyle = '#9a7a58'; c.fillRect(0, 0, W, 2); c.fillStyle = '#4a3424'; c.fillRect(0, 20, W, 2);
  c.font = 8 * FONT_K + 'px ' + FONT; c.textBaseline = 'middle';
  for (let i = 0, x = 4; x < W; i++, x += 76) {
    c.fillStyle = '#d4d4dc'; c.fillRect(x, 5, 64, 12); c.fillStyle = '#8890b0'; c.fillRect(x, 15, 64, 2);
    c.fillStyle = i % 2 ? '#2040a0' : '#303030'; const s = ADS1[i % ADS1.length]; c.fillText(s, x + 32 - c.measureText(s).width / 2, 11);
  }
  texDone(t);
  ({ t, c } = canvasTex(scene, 'bg_mid', W, 42));
  c.fillStyle = '#505450'; c.fillRect(0, 0, W, 42); crowd(c, 0, 0, W, 42, 99, 1.05);
  c.fillStyle = 'rgba(60,70,60,0.2)'; c.fillRect(0, 0, W, 42);
  texDone(t);
  ({ t, c } = canvasTex(scene, 'bg_boards', W, 24));
  c.fillStyle = '#2a7a3c'; c.fillRect(0, 0, W, 24);
  c.font = 'italic bold 11px Arial, sans-serif'; c.textBaseline = 'middle';
  for (let i = 0, x = 0; x < W; i++, x += 92) {
    const red = i % 2 === 0;
    c.fillStyle = red ? '#d8a0a0' : '#f0e8e8'; c.fillRect(x + 6, 3, 80, 18);
    c.fillStyle = red ? '#c82020' : '#c82020'; const s = ADS2[i % ADS2.length]; c.fillText(s, x + 46 - c.measureText(s).width / 2, 12);
  }
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, 0, W, 24);
  texDone(t);
}

// palazzetto in prospettiva (schermata presentazione incontro)
function makeHallTex(scene, floorHex) {
  const key = 'hall_' + floorHex;
  if (scene.textures.exists(key)) return key;
  const { t, c } = canvasTex(scene, key, 320, 224);
  const g = c.createLinearGradient(0, 0, 0, 224); g.addColorStop(0, '#1a1814'); g.addColorStop(1, '#3a3428');
  c.fillStyle = g; c.fillRect(0, 0, 320, 224);
  for (let r = 0; r < 18; r++) { c.fillStyle = r % 2 ? '#2a261e' : '#322c22'; c.fillRect(0, r * 8, 320, 4); }
  crowd(c, 0, 20, 320, 100, 33, 0.7);
  c.fillStyle = 'rgba(20,18,14,0.55)'; c.fillRect(0, 0, 320, 224);
  const col = '#' + floorHex.toString(16).padStart(6, '0');
  c.fillStyle = shade(col, 0.6);
  c.beginPath(); c.moveTo(70, 132); c.lineTo(250, 132); c.lineTo(320, 224); c.lineTo(0, 224); c.fill();
  c.fillStyle = '#c89040'; c.beginPath(); c.moveTo(110, 140); c.lineTo(210, 140); c.lineTo(250, 200); c.lineTo(70, 200); c.fill();
  c.fillStyle = col; c.beginPath(); c.moveTo(118, 144); c.lineTo(202, 144); c.lineTo(238, 196); c.lineTo(82, 196); c.fill();
  c.strokeStyle = '#ffffff'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(118, 144); c.lineTo(202, 144); c.lineTo(238, 196); c.lineTo(82, 196); c.closePath(); c.moveTo(102, 168); c.lineTo(218, 168); c.stroke();
  if (GR > 1) for (let i = 0; i < 6; i++) hallPlayerHD(c, 131 + i * 13, 178);
  else for (let i = 0; i < 6; i++) { const x = 128 + i * 13; c.fillStyle = '#d8d0d0'; c.fillRect(x, 160, 6, 12); c.fillStyle = '#d0b090'; c.fillRect(x + 1, 156, 4, 4); c.fillStyle = '#404060'; c.fillRect(x, 172, 2, 6); c.fillRect(x + 4, 172, 2, 6); }
  texDone(t); return key;
}

// campo verde in prospettiva (schermata formazione)
// colore del campo nella schermata formazione (nel video: ITA verde, SWE giallo)
const LINEUP_COLORS = { ITA: '#18d818', SWE: '#f8c020', FRA: '#2858e0', GER: '#e0a030', GBR: '#d82828', ESP: '#e04020', NOR: '#d83030', DEN: '#d83030', BRA: '#f8d020' };
function makeLineupCourt(scene, code) {
  const key = 'lineup_' + code;
  if (scene.textures.exists(key)) return key;
  const { t, c } = canvasTex(scene, key, 320, 224);
  c.fillStyle = LINEUP_COLORS[code] || '#18d818'; c.fillRect(0, 0, 320, 224);
  c.strokeStyle = '#ffffff'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(0, 40); c.lineTo(110, 40); c.lineTo(80, 208); c.lineTo(0, 208); c.stroke();
  c.beginPath(); c.moveTo(110, 40); c.lineTo(320, 40); c.moveTo(80, 208); c.lineTo(320, 208); c.stroke();
  c.beginPath(); c.moveTo(170, 40); c.lineTo(190, 208); c.moveTo(250, 40); c.lineTo(290, 208); c.moveTo(310, 40); c.lineTo(320, 70); c.stroke();
  texDone(t); return key;
}
