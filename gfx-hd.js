// ============================================================
//  Grafica HD (prototipo): giocatori vettoriali ad alta risoluzione,
//  contorno scuro e ombreggiatura a tre toni (ombra, base, luce).
//  Stesse pose e stesso scheletro della versione pixel art (gfx.js),
//  disegnati a PL_RES volte la risoluzione nativa.
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
