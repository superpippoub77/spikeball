// ============================================================
//  Grafica HD: giocatori, ritratti, arbitro, pallone e pubblico vettoriali,
//  contorno scuro e ombreggiatura a tre toni (ombra, base, luce).
//  Stesse pose e stesso scheletro della versione pixel art (gfx.js),
//  disegnati a GR volte la risoluzione nativa (vedi canvasTex/texDone in gfx.js).
// ============================================================
const HD_LIGHT = (() => { const x = 0.5, y = -0.85, l = Math.hypot(x, y); return [x / l, y / l]; })();   // luce dall'alto, davanti
const HD_INK = '#17111d';

// ---- forme (unità = pixel nativi del gioco) ----
function hdCapsule(a, b, r0, r1) {
  return g => {
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    g.beginPath();
    g.arc(a[0], a[1], r0, ang + Math.PI / 2, ang - Math.PI / 2);
    g.arc(b[0], b[1], r1, ang - Math.PI / 2, ang + Math.PI / 2);
    g.closePath();
  };
}
// arto con muscolo: rL/rR = gonfiore a metà segmento sui due lati
function hdMuscle(a, b, r0, rL, rR, r1) {
  return g => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.max(0.01, Math.hypot(dx, dy)), nx = -dy / L, ny = dx / L;
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ang = Math.atan2(dy, dx);
    g.beginPath();
    g.moveTo(a[0] + nx * r0, a[1] + ny * r0);
    g.quadraticCurveTo(m[0] + nx * rL * 1.3, m[1] + ny * rL * 1.3, b[0] + nx * r1, b[1] + ny * r1);
    g.arc(b[0], b[1], r1, ang + Math.PI / 2, ang - Math.PI / 2, true);
    g.quadraticCurveTo(m[0] - nx * rR * 1.3, m[1] - ny * rR * 1.3, a[0] - nx * r0, a[1] - ny * r0);
    g.arc(a[0], a[1], r0, ang - Math.PI / 2, ang + Math.PI / 2, true);
    g.closePath();
  };
}
function hdEllipse(c, rx, ry, rot = 0) { return g => { g.beginPath(); g.ellipse(c[0], c[1], rx, ry, rot, 0, Math.PI * 2); }; }
function hdPoly(pts) { return g => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); }; }

// cel shading: ombra sul lato lontano dalla luce, riflesso sul bordo illuminato, filo scuro interno
function hdCel(g, path, col, sh = 1.1, hi = 0.6, line = true) {
  const D = shade(col, 0.66), Lc = shade(col, 1.28);
  g.save();
  path(g); g.fillStyle = D; g.fill(); g.clip();
  g.translate(HD_LIGHT[0] * sh, HD_LIGHT[1] * sh); path(g); g.fillStyle = Lc; g.fill(); g.clip();
  g.translate(-HD_LIGHT[0] * (sh + hi), -HD_LIGHT[1] * (sh + hi)); path(g); g.fillStyle = col; g.fill();
  g.restore();
  if (line) { path(g); g.strokeStyle = shade(col, 0.4); g.lineWidth = 0.22; g.stroke(); }
}

// strato disegnato a parte e contornato (le braccia si staccano dal busto)
function hdLayer(R, fn) {
  const W = FW * R, H = FH * R;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.setTransform(R, 0, 0, R, 0, 0); g.lineJoin = 'round'; g.lineCap = 'round';
  fn(g);
  const ink = document.createElement('canvas'); ink.width = W; ink.height = H;
  const ig = ink.getContext('2d'); ig.drawImage(c, 0, 0); ig.globalCompositeOperation = 'source-in'; ig.fillStyle = HD_INK; ig.fillRect(0, 0, W, H);
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const og = out.getContext('2d'), r = 0.5 * R;
  for (let k = 0; k < 16; k++) og.drawImage(ink, Math.cos(k * Math.PI / 8) * r, Math.sin(k * Math.PI / 8) * r);
  og.drawImage(c, 0, 0);
  return out;
}

function drawPlayerHD(pose, P, hair, R) {
  const s0 = SKEL[pose];
  const K = 1.17;
  const sc = p => [16 + (p[0] - 16) * 1.06, 47 - (39 - p[1]) * K];
  const s = { hip: sc(s0.hip), neck: sc(s0.neck), head: sc(s0.head), bl: s0.bl.map(sc), fl: s0.fl.map(sc), ba: s0.ba.map(sc), fa: s0.fa.map(sc) };
  // proporzioni da atleta: gambe più lunghe, busto compatto, stessi piedi a terra
  const lowY = Math.max(s.bl[1][1], s.fl[1][1]);
  const longLeg = j => { const k = [s.hip[0] + (j[0][0] - s.hip[0]) * 1.12, s.hip[1] + (j[0][1] - s.hip[1]) * 1.12]; return [k, [k[0] + (j[1][0] - j[0][0]) * 1.08, k[1] + (j[1][1] - j[0][1]) * 1.08]]; };
  s.bl = longLeg(s.bl); s.fl = longLeg(s.fl);
  const nNeck = lerpP(s.hip, s.neck, 0.92), dN = [nNeck[0] - s.neck[0], nNeck[1] - s.neck[1]];
  const mv = p => [p[0] + dN[0], p[1] + dN[1]];
  s.neck = nNeck; s.head = mv(s.head); s.ba = s.ba.map(mv); s.fa = s.fa.map(mv);
  const dy = lowY - Math.max(s.bl[1][1], s.fl[1][1]), dn = p => [p[0], p[1] + dy];
  s.hip = dn(s.hip); s.neck = dn(s.neck); s.head = dn(s.head);
  for (const k of ['bl', 'fl', 'ba', 'fa']) s[k] = s[k].map(dn);

  const dir = [s.hip[0] - s.neck[0], s.hip[1] - s.neck[1]], L = Math.hypot(dir[0], dir[1]), nx = -dir[1] / L, ny = dir[0] / L;
  const Q = (p, k) => [p[0] + nx * k, p[1] + ny * k];       // k > 0 = verso la schiena
  const shoulder = lerpP(s.neck, s.hip, 0.12);
  const WHITE = '#f4f4f8';

  const leg = (g, j, back) => {
    const knee = j[0], foot = j[1], dim = back ? 0.72 : 1;
    const skin = shade(P.sk, dim), shorts = shade(P.so, dim), white = shade(WHITE, back ? 0.78 : 1);
    const ankle = lerpP(knee, foot, 0.62);
    hdCel(g, hdMuscle(knee, ankle, 2.2, 2.7, 2.1, 1.4), skin, 0.9, 0.5);                 // polpaccio
    hdCel(g, hdCapsule(ankle, lerpP(ankle, foot, 0.85), 1.7, 1.6), white, 0.6, 0.4);     // calzettone
    const fx = foot[0], fy = foot[1];                                                     // scarpa
    hdCel(g, hdPoly([[fx - 2.2, fy - 2.6], [fx + 2.2, fy - 2.4], [fx + 4.6, fy - 1], [fx + 4.6, fy + 0.5], [fx - 2.4, fy + 0.5]]), white, 0.6, 0.4);
    g.fillStyle = shade('#8a8a9c', dim); g.fillRect(fx - 2.4, fy - 0.2, 7, 0.8);
    g.fillStyle = shade(P.tr, dim); g.fillRect(fx - 0.6, fy - 1.9, 2.6, 0.7);
    hdCel(g, hdMuscle(s.hip, knee, 3.3, 3.2, 3.7, 2.4), skin, 1, 0.6);                    // coscia
    hdCel(g, hdEllipse([knee[0] + 0.3, knee[1] + 0.3], 2.9, 2.6), white, 0.8, 0.5);      // ginocchiera
    hdCel(g, hdCapsule(s.hip, lerpP(s.hip, knee, 0.24), 3.6, 3.4), shorts, 1, 0.5, false);       // pantaloncino
  };
  const arm = (g, j, back) => {
    const elbow = j[0], hand = j[1], dim = back ? 0.72 : 1;
    const skin = shade(P.sk, dim), shirt = shade(P.sh, dim), trim = shade(P.tr, dim);
    hdCel(g, hdMuscle(elbow, hand, 1.8, 2.1, 1.9, 1.3), skin, 0.7, 0.45);                // avambraccio
    hdCel(g, hdEllipse(hand, 1.7, 1.5), skin, 0.6, 0.4);                                  // mano
    hdCel(g, hdMuscle(shoulder, elbow, 2.6, 2.9, 2.5, 1.8), skin, 0.8, 0.5);             // bicipite
    const hem = lerpP(shoulder, elbow, 0.38);
    hdCel(g, hdCapsule(shoulder, hem, 2.8, 2.3), shirt, 0.9, 0.5);                       // manica
    const a = Math.atan2(elbow[1] - shoulder[1], elbow[0] - shoulder[0]);
    g.strokeStyle = trim; g.lineWidth = 0.7; g.beginPath();
    g.moveTo(hem[0] + Math.sin(a) * 2.6, hem[1] - Math.cos(a) * 2.2); g.lineTo(hem[0] - Math.sin(a) * 2.2, hem[1] + Math.cos(a) * 2.2); g.stroke();
  };

  const back = hdLayer(R, g => { arm(g, s.ba, true); leg(g, s.bl, true); });
  const body = hdLayer(R, g => {
    leg(g, s.fl, false);
    // bacino / pantaloncini con riga laterale
    const w0 = lerpP(s.neck, s.hip, 0.84);
    hdCel(g, hdCapsule(w0, s.hip, 3.8, 3.6), P.so, 1, 0.6, false);
    g.strokeStyle = P.tr; g.lineWidth = 0.6; g.beginPath(); const t0 = Q(w0, 0.6), t1 = Q(s.hip, 1.4); g.moveTo(t0[0], t0[1]); g.lineTo(t1[0], t1[1] + 2); g.stroke();
    // busto: spalle larghe, petto pieno, vita stretta
    const c1 = lerpP(s.neck, s.hip, -0.04), c2 = lerpP(s.neck, s.hip, 0.88), cm = lerpP(c1, c2, 0.4);
    const torso = g2 => {
      const p = [Q(c1, 5.6), Q(c1, -5.2), Q(cm, -6.6), Q(c2, -4.4), Q(c2, 4.4), Q(cm, 6)];
      g2.beginPath(); g2.moveTo(p[0][0], p[0][1]);
      g2.quadraticCurveTo(lerpP(p[0], p[1], 0.5)[0], lerpP(p[0], p[1], 0.5)[1] - 1.2, p[1][0], p[1][1]);
      g2.quadraticCurveTo(p[2][0], p[2][1], p[3][0], p[3][1]);
      g2.lineTo(p[4][0], p[4][1]);
      g2.quadraticCurveTo(p[5][0], p[5][1], p[0][0], p[0][1]);
      g2.closePath();
    };
    hdCel(g, torso, P.sh, 1.6, 0.8);
    // piega della maglia
    g.strokeStyle = shade(P.sh, 0.6); g.lineWidth = 0.35;
    const f0 = Q(lerpP(c1, c2, 0.55), -1), f1 = Q(lerpP(c1, c2, 0.9), -3);
    g.beginPath(); g.moveTo(f0[0], f0[1]); g.quadraticCurveTo(f1[0] + 1, f0[1] + 1, f1[0], f1[1]); g.stroke();
    if (P.num) {   // numero di maglia sulla schiena
      const nb = Q(lerpP(c1, c2, 0.56), 3.5);
      g.save(); g.translate(nb[0], nb[1]); g.rotate(Math.atan2(dir[1], dir[0]) - Math.PI / 2);
      g.font = 'bold 4px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 0.5; g.strokeStyle = shade(P.sh, 0.45); g.strokeText(P.num, 0, 0); g.fillStyle = P.tr; g.fillText(P.num, 0, 0);
      g.restore();
    }
    // collo e testa
    const [hx, hy] = s.head;
    hdCel(g, hdCapsule(s.neck, lerpP(s.neck, s.head, 0.55), 1.9, 1.8), P.sk, 0.6, 0.4);
    const cl = lerpP(s.neck, s.hip, 0.02);
    g.strokeStyle = P.tr; g.lineWidth = 0.8; g.beginPath(); const k0 = Q(cl, 2.6), k1 = Q(cl, -2.4); g.moveTo(k0[0], k0[1]); g.quadraticCurveTo((k0[0] + k1[0]) / 2 + 0.6, (k0[1] + k1[1]) / 2 + 1.4, k1[0], k1[1]); g.stroke();
    const head = g2 => {
      g2.beginPath();
      g2.ellipse(hx, hy, 3.7, 4.3, 0, Math.PI * 0.62, Math.PI * 2.08);
      g2.lineTo(hx + 4.4, hy + 0.9);                          // naso
      g2.lineTo(hx + 3.6, hy + 1.5);
      g2.quadraticCurveTo(hx + 3.8, hy + 3.6, hx + 1.6, hy + 4.4);   // mento
      g2.closePath();
    };
    hdCel(g, head, P.sk, 0.9, 0.45);
    hdCel(g, hdEllipse([hx - 0.9, hy + 0.4], 0.9, 1.3), shade(P.sk, 0.9), 0.3, 0.2);       // orecchio
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(hx + 2.1, hy - 0.4, 0.75, 0.55, 0, 0, 7); g.fill();
    g.fillStyle = '#1c1420'; g.beginPath(); g.ellipse(hx + 2.5, hy - 0.4, 0.4, 0.5, 0, 0, 7); g.fill();
    g.strokeStyle = shade(P.sk, 0.5); g.lineWidth = 0.3; g.beginPath(); g.moveTo(hx + 2.2, hy + 2.6); g.lineTo(hx + 3.2, hy + 2.5); g.stroke();   // bocca
    // capelli anni '80: ciuffo voluminoso, nuca, basette
    const hairP = g2 => {
      g2.beginPath();
      g2.moveTo(hx + 3.6, hy - 1.2);
      g2.quadraticCurveTo(hx + 4.4, hy - 4.6, hx + 0.6, hy - 5.3);
      g2.quadraticCurveTo(hx - 4.6, hy - 5.6, hx - 4.6, hy - 1.2);
      g2.quadraticCurveTo(hx - 4.8, hy + 2.8, hx - 3, hy + 3.6);
      g2.lineTo(hx - 1.6, hy + 2.2);
      g2.quadraticCurveTo(hx - 0.2, hy - 1.4, hx + 1.6, hy - 1.6);
      g2.quadraticCurveTo(hx + 2.8, hy - 2.4, hx + 3.6, hy - 1.2);
      g2.closePath();
    };
    hdCel(g, hairP, hair, 1, 0.7);
    g.strokeStyle = shade(hair, 1.8); g.lineWidth = 0.4;
    g.beginPath(); g.moveTo(hx - 2.8, hy - 3.6); g.quadraticCurveTo(hx - 0.6, hy - 5, hx + 1.6, hy - 4.2); g.stroke();
    g.strokeStyle = shade(hair, 0.55); g.lineWidth = 0.35;                                // sopracciglio
    g.beginPath(); g.moveTo(hx + 1.4, hy - 1.4); g.lineTo(hx + 3, hy - 1.5); g.stroke();
  });
  const front = hdLayer(R, g => arm(g, s.fa, false));
  const c = document.createElement('canvas'); c.width = FW * R; c.height = FH * R;
  const g = c.getContext('2d'); g.drawImage(back, 0, 0); g.drawImage(body, 0, 0); g.drawImage(front, 0, 0);
  return c;
}

// ---------------- pallone ----------------
// varianti: classico (spicchi tenui), pro (blu e giallo), retro (cuoio)
const HD_BALL = {
  classic: { base: ['#ffffff', '#eef0f6', '#a8aec4'], a: 'rgba(40,90,220,0.55)', b: 'rgba(245,200,30,0.6)', seam: 'rgba(70,80,110,0.55)' },
  pro: { base: ['#ffffff', '#f2f4f8', '#b0b6c8'], a: 'rgba(24,70,210,0.95)', b: 'rgba(250,205,20,0.95)', seam: 'rgba(30,40,80,0.7)' },
  retro: { base: ['#f4d8a8', '#d8a050', '#8a5a24'], a: 'rgba(150,90,30,0.55)', b: 'rgba(250,225,170,0.55)', seam: 'rgba(80,45,15,0.8)' }
};
function drawBallHD(c, cx, cy, r, pal = HD_BALL.classic) {
  const g = c.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  g.addColorStop(0, pal.base[0]); g.addColorStop(0.6, pal.base[1]); g.addColorStop(1, pal.base[2]);
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  // spicchi colorati e cuciture, come un pallone da pallavolo
  c.save(); c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
  c.fillStyle = pal.a;
  c.beginPath(); c.arc(cx - r * 1.25, cy - r * 0.2, r * 1.05, -0.9, 0.9); c.arc(cx - r * 1.25, cy - r * 0.2, r * 0.72, 0.9, -0.9, true); c.fill();
  c.fillStyle = pal.b;
  c.beginPath(); c.arc(cx + r * 0.9, cy + r * 1.3, r * 1.05, 3.4, 4.6); c.arc(cx + r * 0.9, cy + r * 1.3, r * 0.72, 4.6, 3.4, true); c.fill();
  c.strokeStyle = pal.seam; c.lineWidth = r * 0.09;
  c.beginPath(); c.arc(cx - r * 1.25, cy - r * 0.2, r * 1.05, -0.9, 0.9); c.stroke();
  c.beginPath(); c.arc(cx + r * 0.9, cy + r * 1.3, r * 1.05, 3.4, 4.6); c.stroke();
  c.beginPath(); c.arc(cx + r * 1.3, cy - r * 1.1, r * 1.1, 1.75, 3.1); c.stroke();
  c.restore();
  c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.ellipse(cx - r * 0.38, cy - r * 0.45, r * 0.28, r * 0.18, -0.6, 0, Math.PI * 2); c.fill();
  c.strokeStyle = HD_INK; c.lineWidth = Math.max(0.35, r * 0.1); c.beginPath(); c.arc(cx, cy, r - c.lineWidth / 2, 0, Math.PI * 2); c.stroke();
}

// ---------------- pubblico ----------------
// spettatore singolo (arene moderne): (x, y) = angolo in alto a sinistra di una cella 4x7
function crowdPersonHD(c, x, y, pal, R) {
  const sh = pal[Math.floor(R() * pal.length)], sk = R() < 0.7 ? '#e0b090' : '#8a5a3a', hr = R() < 0.6 ? '#2a1a10' : '#6a4a2a';
  const bx = x + 2, up = R() < 0.07;
  c.fillStyle = shade(sh, 0.78); c.beginPath(); c.ellipse(bx, y + 7, 2.1, 3.6, 0, Math.PI, 0); c.fill();
  c.fillStyle = sh; c.beginPath(); c.ellipse(bx - 0.3, y + 7, 1.6, 3.2, 0, Math.PI, 0); c.fill();
  if (up) { c.strokeStyle = sk; c.lineWidth = 0.6; c.beginPath(); c.moveTo(bx - 1.5, y + 4.4); c.lineTo(bx - 2.2, y + 0.6); c.moveTo(bx + 1.5, y + 4.4); c.lineTo(bx + 2.2, y + 0.6); c.stroke(); }
  c.fillStyle = sk; c.beginPath(); c.arc(bx, y + 2.2, 1.25, 0, Math.PI * 2); c.fill();
  c.fillStyle = hr; c.beginPath(); c.arc(bx, y + 1.9, 1.25, Math.PI * 1.05, Math.PI * 1.95); c.fill();
}
function crowdHD(c, x0, y0, w, h, seed, dens = 1) {
  const R = seeded(seed);
  const shirts = ['#c8c8c8', '#e0e0e0', '#a04040', '#4050a0', '#808090', '#c09060', '#606070', '#904070', '#d0d0d0', '#2a7a4a', '#d8b030'];
  const skins = ['#e8b898', '#d8a888', '#b07a58', '#8a5a3a'], hairs = ['#2a1a10', '#5a4030', '#1a1a1a', '#a07a40', '#d0c0a0'];
  for (let y = y0; y < y0 + h; y += 6) for (let x = x0 + ((y / 6) % 2) * 2; x < x0 + w; x += 4) {
    if (R() > 0.92 * dens) continue;
    const sh = shirts[Math.floor(R() * shirts.length)], sk = skins[Math.floor(R() * skins.length)], hr = hairs[Math.floor(R() * hairs.length)];
    const bx = x + 1.5 + (R() - 0.5) * 0.8, up = R() < 0.08;     // qualcuno alza le braccia
    c.fillStyle = shade(sh, 0.8); c.beginPath(); c.ellipse(bx, y + 5.6, 1.9, 2.2, 0, Math.PI, 0); c.fill();
    c.fillStyle = sh; c.beginPath(); c.ellipse(bx - 0.3, y + 5.6, 1.4, 1.9, 0, Math.PI, 0); c.fill();
    if (up) { c.strokeStyle = sk; c.lineWidth = 0.6; c.beginPath(); c.moveTo(bx - 1.4, y + 4.4); c.lineTo(bx - 2, y + 1); c.moveTo(bx + 1.4, y + 4.4); c.lineTo(bx + 2, y + 1); c.stroke(); }
    c.fillStyle = sk; c.beginPath(); c.arc(bx, y + 2.1, 1.15, 0, Math.PI * 2); c.fill();
    c.fillStyle = hr; c.beginPath(); c.arc(bx, y + 1.8, 1.15, Math.PI * 1.05, Math.PI * 1.95); c.fill();
  }
}

// ---------------- ritratti ----------------
function hdStrokeFill(c, path, fill, ink = HD_INK, lw = 0.7) { path(c); c.fillStyle = fill; c.fill(); c.strokeStyle = ink; c.lineWidth = lw; c.stroke(); }
function drawFaceHD(c, ox, oy, code, idx, expr) {
  const P = playerPal(code, idx), R = seeded(hashStr(code + ':' + idx)); R(); R();
  const skin = P.sk, dk = shade(skin, 0.74), lt = shade(skin, 1.12);
  const hair = P.ha[idx % P.ha.length];
  const style = [0, 0, 2, 3, 0, 1, 3, 2][Math.floor(R() * 8)];   // 0 corti, 1 rasati, 2 lunghi, 3 riccioli
  const jaw = 1 + Math.floor(R() * 2);
  const cheer = expr === 'cheer';
  c.save(); c.translate(ox, oy);
  const bg = c.createRadialGradient(20, 16, 4, 20, 20, 30);
  bg.addColorStop(0, '#2e52a8'); bg.addColorStop(1, '#0c1840');
  c.fillStyle = bg; c.fillRect(0, 0, 40, 40);
  c.save(); c.beginPath(); c.rect(0, 0, 40, 40); c.clip();
  // braccia alzate (esultanza)
  if (cheer) for (const s of [-1, 1]) {
    const x = 20 + s * 16;
    hdStrokeFill(c, hdCapsule([x, 40], [x + s * 1.5, 14], 3.6, 3), P.sh);
    hdStrokeFill(c, hdCapsule([x + s * 1.5, 22], [x + s * 2, 9], 2.4, 2.2), skin);
    hdStrokeFill(c, hdEllipse([x + s * 2, 8], 2.8, 3.2), skin);
  }
  // spalle e maglia con colletto
  hdStrokeFill(c, g => { g.beginPath(); g.moveTo(1, 41); g.quadraticCurveTo(2, 31, 12, 29.5); g.lineTo(28, 29.5); g.quadraticCurveTo(38, 31, 39, 41); g.closePath(); }, P.sh);
  c.fillStyle = shade(P.sh, 0.75); c.beginPath(); c.moveTo(28, 29.5); c.quadraticCurveTo(38, 31, 39, 41); c.lineTo(31, 41); c.quadraticCurveTo(31, 33, 26, 30); c.fill();
  // collo
  hdStrokeFill(c, g => { g.beginPath(); g.moveTo(15.5, 22); g.lineTo(15, 31); g.quadraticCurveTo(20, 34, 25, 31); g.lineTo(24.5, 22); g.closePath(); }, dk);
  hdStrokeFill(c, g => { g.beginPath(); g.moveTo(14, 29.6); g.quadraticCurveTo(20, 35, 26, 29.6); g.lineTo(24.5, 29.4); g.quadraticCurveTo(20, 32.5, 15.5, 29.4); g.closePath(); }, P.tr, HD_INK, 0.45);
  // capelli dietro (lunghi)
  if (style === 2) hdStrokeFill(c, g => { g.beginPath(); g.moveTo(9, 10); g.quadraticCurveTo(6, 22, 9.5, 27); g.lineTo(30.5, 27); g.quadraticCurveTo(34, 22, 31, 10); g.closePath(); }, shade(hair, 0.85));
  // orecchie
  hdStrokeFill(c, hdEllipse([10.6, 17.5], 1.8, 2.8), dk);
  hdStrokeFill(c, hdEllipse([29.4, 17.5], 1.8, 2.8), dk);
  // viso: mascella più o meno squadrata
  const head = g => {
    g.beginPath(); g.moveTo(11.2, 12);
    g.quadraticCurveTo(11, 4.5, 20, 4.5); g.quadraticCurveTo(29, 4.5, 28.8, 12);
    g.quadraticCurveTo(29 + jaw * 0.3, 22, 24.5, 25.5); g.quadraticCurveTo(20, 28.5, 15.5, 25.5);
    g.quadraticCurveTo(11 - jaw * 0.3, 22, 11.2, 12); g.closePath();
  };
  c.save(); head(c); c.fillStyle = skin; c.fill(); c.clip();
  c.fillStyle = dk; c.beginPath(); c.ellipse(29.5, 17, 4, 12, 0, 0, Math.PI * 2); c.fill();          // ombra laterale
  c.fillStyle = lt; c.beginPath(); c.ellipse(15, 11, 3, 2, -0.4, 0, Math.PI * 2); c.fill();           // luce sulla fronte
  c.restore();
  head(c); c.strokeStyle = HD_INK; c.lineWidth = 0.7; c.stroke();
  // capelli
  if (style === 1) {
    c.fillStyle = shade(hair, 1.05); c.globalAlpha = 0.55;
    c.beginPath(); c.moveTo(11.4, 11); c.quadraticCurveTo(11, 4.6, 20, 4.6); c.quadraticCurveTo(29, 4.6, 28.6, 11); c.quadraticCurveTo(20, 7.5, 11.4, 11); c.fill();
    c.globalAlpha = 1;
  } else {
    hdStrokeFill(c, g => {
      g.beginPath(); g.moveTo(10, 15);
      g.quadraticCurveTo(8, 3, 20, 2.6); g.quadraticCurveTo(32, 3, 30, 15);
      g.lineTo(28.4, 11.5); g.quadraticCurveTo(24, 9.5, 23, 7.8); g.quadraticCurveTo(18, 10.8, 12.5, 9.8); g.lineTo(11.6, 15); g.closePath();
    }, hair);
    if (style === 3) for (let i = 0; i < 6; i++) hdStrokeFill(c, hdEllipse([11.5 + i * 3.4, 4.2 + (i % 2) * 1.2], 2.1, 1.9), shade(hair, 1.15), HD_INK, 0.45);
    c.strokeStyle = shade(hair, 1.8); c.lineWidth = 0.6; c.beginPath(); c.moveTo(13, 6); c.quadraticCurveTo(17, 3.8, 22, 4.2); c.stroke();
  }
  // sopracciglia
  c.strokeStyle = shade(hair, 0.7); c.lineWidth = 1;
  c.beginPath(); c.moveTo(13.6, cheer ? 12.4 : 13); c.quadraticCurveTo(15.8, 11.8, 17.8, 12.8); c.stroke();
  c.beginPath(); c.moveTo(22.2, 12.8); c.quadraticCurveTo(24.2, 11.8, 26.4, cheer ? 12.4 : 13); c.stroke();
  // occhi (in esultanza socchiusi e sorridenti)
  for (const ex of [15.8, 24.2]) {
    if (cheer) { c.strokeStyle = HD_INK; c.lineWidth = 0.8; c.beginPath(); c.arc(ex, 16.2, 1.7, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); continue; }
    hdStrokeFill(c, hdEllipse([ex, 15.6], 2.1, 1.35), '#ffffff', HD_INK, 0.5);
    c.fillStyle = '#4a3020'; c.beginPath(); c.arc(ex + 0.5, 15.6, 1.05, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#100a08'; c.beginPath(); c.arc(ex + 0.5, 15.6, 0.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(ex + 0.1, 15.2, 0.3, 0, Math.PI * 2); c.fill();
  }
  // naso
  c.strokeStyle = shade(skin, 0.6); c.lineWidth = 0.6;
  c.beginPath(); c.moveTo(20.6, 15.5); c.quadraticCurveTo(21.6, 19.5, 20.8, 20.4); c.quadraticCurveTo(20, 21, 18.8, 20.4); c.stroke();
  // bocca
  if (cheer) {
    hdStrokeFill(c, g => { g.beginPath(); g.moveTo(15.8, 22); g.quadraticCurveTo(20, 21.2, 24.2, 22); g.quadraticCurveTo(23.5, 26.6, 20, 26.6); g.quadraticCurveTo(16.5, 26.6, 15.8, 22); g.closePath(); }, '#6a1414', HD_INK, 0.6);
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(16.4, 22.2); c.quadraticCurveTo(20, 21.6, 23.6, 22.2); c.lineTo(23.3, 23.2); c.quadraticCurveTo(20, 22.8, 16.7, 23.2); c.fill();
    c.fillStyle = '#d05050'; c.beginPath(); c.ellipse(20, 25.4, 2.2, 0.9, 0, 0, Math.PI * 2); c.fill();
  } else {
    c.strokeStyle = '#8a3c38'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(17.2, 23); c.quadraticCurveTo(20, 23.7, 22.8, 23); c.stroke();
    c.strokeStyle = shade(skin, 0.82); c.lineWidth = 0.5; c.beginPath(); c.moveTo(18.4, 24.6); c.lineTo(21.6, 24.6); c.stroke();
  }
  c.restore();
  c.strokeStyle = 'rgba(200,215,255,0.9)'; c.lineWidth = 0.6; c.strokeRect(0.3, 0.3, 39.4, 39.4);
  c.restore();
}

// ---------------- arbitro ----------------
function drawRefHD(c, pose, W, H) {
  const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#2a4a8a'); bg.addColorStop(1, '#0f2048');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip();
  const shirt = '#f2f2f8', skin = '#f0c4a4', skD = '#c89070';
  const arm = (pts) => {
    for (let i = 0; i < pts.length - 1; i++) hdStrokeFill(c, hdCapsule(pts[i], pts[i + 1], i ? 1.9 : 2.4, i ? 1.7 : 2), i ? skin : shirt, HD_INK, 0.55);
    const h = pts[pts.length - 1]; hdStrokeFill(c, hdEllipse(h, 2.2, 2.3), skin, HD_INK, 0.55);
  };
  // busto con colletto nero e stemma
  hdStrokeFill(c, g => { g.beginPath(); g.moveTo(16, 46); g.quadraticCurveTo(16, 25, 22, 23.5); g.lineTo(34, 23.5); g.quadraticCurveTo(40, 25, 40, 46); g.closePath(); }, shirt);
  c.fillStyle = '#c8c8d8'; c.beginPath(); c.moveTo(34, 23.5); c.quadraticCurveTo(40, 25, 40, 46); c.lineTo(35, 46); c.quadraticCurveTo(36, 30, 32, 24); c.fill();
  c.strokeStyle = '#b0b0c4'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(28, 26); c.lineTo(28, 46); c.stroke();
  hdStrokeFill(c, g => { g.beginPath(); g.moveTo(23.5, 23.4); g.lineTo(28, 27.5); g.lineTo(32.5, 23.4); g.lineTo(31, 22); g.lineTo(28, 24.6); g.lineTo(25, 22); g.closePath(); }, '#24243a', HD_INK, 0.4);
  hdStrokeFill(c, g => { g.beginPath(); g.moveTo(20.5, 30); g.lineTo(24.5, 30); g.lineTo(24.5, 33.5); g.quadraticCurveTo(22.5, 35, 20.5, 33.5); g.closePath(); }, '#d8a828', HD_INK, 0.35);
  c.fillStyle = '#3a40a0'; c.beginPath(); c.arc(22.5, 31.8, 0.9, 0, Math.PI * 2); c.fill();
  // collo e testa
  hdStrokeFill(c, hdCapsule([28, 20], [28, 24], 2.6, 2.6), skD, HD_INK, 0.5);
  hdStrokeFill(c, hdEllipse([21.3, 12.5], 1.4, 2.4), skD, HD_INK, 0.5);
  hdStrokeFill(c, hdEllipse([34.7, 12.5], 1.4, 2.4), skD, HD_INK, 0.5);
  const head = g => { g.beginPath(); g.moveTo(22, 9); g.quadraticCurveTo(22, 3.6, 28, 3.6); g.quadraticCurveTo(34, 3.6, 34, 9); g.quadraticCurveTo(34.2, 17, 31, 19.6); g.quadraticCurveTo(28, 21.6, 25, 19.6); g.quadraticCurveTo(21.8, 17, 22, 9); g.closePath(); };
  c.save(); head(c); c.fillStyle = skin; c.fill(); c.clip(); c.fillStyle = skD; c.beginPath(); c.ellipse(34.5, 12, 3, 9, 0, 0, Math.PI * 2); c.fill(); c.restore();
  head(c); c.strokeStyle = HD_INK; c.lineWidth = 0.6; c.stroke();
  // capelli grigi, stempiato
  hdStrokeFill(c, g => { g.beginPath(); g.moveTo(21.2, 12.5); g.quadraticCurveTo(20, 3, 28, 2.4); g.quadraticCurveTo(36, 3, 34.8, 12.5); g.lineTo(33.6, 9); g.quadraticCurveTo(31, 5.6, 28, 6.4); g.quadraticCurveTo(25, 5.6, 22.4, 9); g.closePath(); }, '#d8d8d4', HD_INK, 0.5);
  c.strokeStyle = '#a8a8a4'; c.lineWidth = 0.7;
  c.beginPath(); c.moveTo(24, 10.2); c.lineTo(26.4, 10); c.moveTo(29.6, 10); c.lineTo(32, 10.2); c.stroke();
  c.fillStyle = '#30304a'; c.beginPath(); c.arc(25.3, 12.3, 0.75, 0, Math.PI * 2); c.arc(30.7, 12.3, 0.75, 0, Math.PI * 2); c.fill();
  c.strokeStyle = skD; c.lineWidth = 0.55; c.beginPath(); c.moveTo(28.3, 12.6); c.quadraticCurveTo(29, 15.6, 27.6, 15.9); c.stroke();
  if (pose === 'whistle') { hdStrokeFill(c, g => { g.beginPath(); g.roundRect(26, 16.8, 4.5, 2, 0.8); }, '#c8c8d0', HD_INK, 0.4); }
  else { c.strokeStyle = '#a05050'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(26.4, 17.8); c.lineTo(29.6, 17.8); c.stroke(); }
  switch (pose) {
    case 'whistle': arm([[20, 26], [16, 30], [24, 20]]); arm([[36, 26], [44, 22], [46, 10]]); break;
    case 'pointL': arm([[20, 26], [10, 28], [3, 32]]); arm([[36, 26], [46, 28], [53, 26]]); break;
    case 'pointR': arm([[20, 26], [10, 28], [3, 26]]); arm([[36, 26], [46, 28], [53, 32]]); break;
    case 'out': arm([[20, 26], [16, 16], [16, 6]]); arm([[36, 26], [40, 16], [40, 6]]); break;
    case 'touch': arm([[20, 26], [18, 18], [24, 12]]); arm([[36, 26], [38, 18], [31, 10]]); break;
    case 'net': arm([[20, 26], [14, 32], [14, 40]]); arm([[36, 26], [44, 24], [50, 18]]);
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(48, 12, 6, 30); c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 0.3;
      for (let y = 12; y < 42; y += 2) { c.beginPath(); c.moveTo(48, y); c.lineTo(54, y); c.stroke(); } break;
    case 'win': arm([[20, 26], [16, 34], [18, 42]]); arm([[36, 26], [46, 22], [54, 16]]); break;
  }
  c.restore();
  c.strokeStyle = '#e0e8ff'; c.lineWidth = 0.7; c.strokeRect(0.35, 0.35, W - 0.7, H - 0.7);
}

// giocatore in miniatura (schermata di presentazione), visto di fronte; piedi in (x, y)
function hallPlayerHD(c, x, y) {
  const skin = '#e8b898', shirt = '#ececf2', shorts = '#3c3c62';
  hdStrokeFill(c, hdCapsule([x - 1.3, y - 7], [x - 1.4, y - 0.8], 1, 0.9), skin, HD_INK, 0.35);
  hdStrokeFill(c, hdCapsule([x + 1.3, y - 7], [x + 1.4, y - 0.8], 1, 0.9), skin, HD_INK, 0.35);
  c.fillStyle = '#ffffff'; c.fillRect(x - 2.4, y - 1.2, 2, 1.2); c.fillRect(x + 0.4, y - 1.2, 2, 1.2);
  hdStrokeFill(c, g => { g.beginPath(); g.roundRect(x - 3, y - 9.5, 6, 3.4, 0.8); }, shorts, HD_INK, 0.35);
  hdStrokeFill(c, hdCapsule([x - 3.6, y - 15.5], [x - 3.9, y - 10.5], 0.9, 0.8), skin, HD_INK, 0.35);
  hdStrokeFill(c, hdCapsule([x + 3.6, y - 15.5], [x + 3.9, y - 10.5], 0.9, 0.8), skin, HD_INK, 0.35);
  hdStrokeFill(c, g => { g.beginPath(); g.moveTo(x - 4.2, y - 16.4); g.lineTo(x + 4.2, y - 16.4); g.lineTo(x + 3.2, y - 8.6); g.lineTo(x - 3.2, y - 8.6); g.closePath(); }, shirt, HD_INK, 0.35);
  hdStrokeFill(c, hdEllipse([x, y - 19], 2.1, 2.4), skin, HD_INK, 0.35);
  c.fillStyle = '#3a2618'; c.beginPath(); c.arc(x, y - 19.4, 2.1, Math.PI, 0); c.fill();
}
