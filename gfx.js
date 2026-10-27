// ============================================================
//  Grafica procedurale: nessun asset dell'originale.
//  Giocatori, volti, arbitro, bandiere, palazzetto, schermate.
// ============================================================
// INDICE DEL FILE
//   1. scheletro delle pose dei giocatori (SKEL) e disegno pixel art (drawPlayer)
//   2. canvasTex / texDone: texture ad alta risoluzione per HD/3D (leggere prima di creare nuove texture!)
//   3. texture dei giocatori (makePlayerTex), volti, arbitro, bandiere, pallone, sfondo menu
//   4. palazzetto arcade (makeArena), presentazione (makeHallTex), formazione (makeLineupCourt)
//
// Le versioni HD e 3D sostituiscono alcune funzioni: gfx-hd.js (disegni vettoriali) e photo.js (giocatori foto).
// FW x FH = cella di un fotogramma del giocatore in pixel nativi; POSES = elenco delle pose (PF['spike'] = indice).
const FW = 32, FH = 48;   // giocatori alti ~40 px come nel gioco originale (misurati sul video HD)
const POSES = ['idle', 'run1', 'run2', 'pass', 'set', 'jump', 'spike', 'block', 'dive', 'down', 'cheer', 'toss', 'sad',
               'spkload', 'spkfol', 'passload',   // schiacciata: caricamento e accompagnamento; bagher: piegamento
               'setload', 'dump', 'dumpfol',      // palleggio: caricamento (mani alla fronte); pallonetto di seconda dell'alzatore
               'passside', 'srvload',             // bagher laterale (di fronte, affondo di lato); battuta caricata
               'cheer2', 'cheer3',                // esultanze: pugno al cielo, salto a braccia larghe
               'appr', 'plant',                   // rincorsa: passo lungo con le braccia indietro, stacco a piedi pari
               'srvhold',                         // battitore in attesa: in piedi con la palla tra le mani
               'jsetload', 'jset', 'land',        // palleggio in salto di profilo: mani a finestra, spinta, ricaduta
               'spikefr',                         // schiacciata con la palla presa davanti
               'idle2',                           // attesa: ginocchia più piegate (si alterna con idle, piedi fermi)
               'jsetloadF', 'jsetF', 'landF',     // palleggio in salto in volo, girato: di fronte (campo destro)
               'jsetloadB', 'jsetB', 'landB',     // ... e di spalle (campo sinistro)
               'appr0'];                          // rincorsa: primo passo, busto avanti e braccia davanti
const PF = {}; POSES.forEach((p, i) => PF[p] = i);

// Ogni posa: coordinate (x, y) nella cella 32x48 di anca, collo, testa, gamba dietro (bl) e davanti (fl: ginocchio, piede),
// braccio dietro (ba) e davanti (fa: gomito, mano). Il giocatore guarda a destra. Per cambiare una posa basta spostare i punti.
const SKEL = {
  // posizione d'attesa come in Power Spikes: ginocchia ben piegate, busto in avanti, braccia piegate davanti pronte
  idle:  { hip: [13, 27], neck: [18, 17], head: [21, 13], bl: [[18, 32], [13, 38]], fl: [[21, 32], [18, 38]], ba: [[19, 24], [24, 26]], fa: [[20, 24], [25, 25]] },
  // seconda fase del molleggio: piedi nello stesso punto, ginocchia e busto un poco più giù, braccia che oscillano
  idle2: { hip: [13, 28], neck: [18, 18], head: [21, 14], bl: [[18, 33], [13, 38]], fl: [[22, 33], [18, 38]], ba: [[19, 25], [24, 25]], fa: [[20, 25], [25, 24]] },
  run1:  { hip: [16, 25], neck: [18, 14], head: [20, 10], bl: [[13, 30], [10, 36]], fl: [[20, 30], [20, 38]], ba: [[15, 19], [13, 22]], fa: [[21, 18], [23, 15]] },
  run2:  { hip: [16, 25], neck: [18, 14], head: [20, 10], bl: [[16, 31], [17, 38]], fl: [[18, 30], [13, 34]], ba: [[20, 18], [22, 15]], fa: [[15, 19], [13, 22]] },
  // bagher in due tempi: passload = piegati sulle gambe, braccia tese e unite in basso; pass = spinta di gambe e braccia verso l'alto
  passload: { hip: [12, 31], neck: [17, 22], head: [20, 18], bl: [[17, 34], [11, 38]], fl: [[21, 34], [22, 38]], ba: [[22, 29], [27, 32]], fa: [[22, 29], [27, 32]] },
  pass:  { hip: [14, 27], neck: [18, 17], head: [21, 13], bl: [[16, 32], [12, 38]], fl: [[20, 32], [21, 38]], ba: [[23, 21], [28, 19]], fa: [[23, 21], [28, 19]] },
  set:   { hip: [16, 24], neck: [16, 13], head: [17, 9],  bl: [[14, 31], [14, 38]], fl: [[18, 31], [18, 38]], ba: [[15, 8], [17, 3]],  fa: [[19, 8], [19, 3]] },
  jump:  { hip: [16, 24], neck: [17, 13], head: [18, 9],  bl: [[14, 30], [12, 35]], fl: [[19, 30], [16, 36]], ba: [[13, 17], [10, 14]], fa: [[14, 18], [11, 16]] },
  // schiacciata in tre tempi: spkload = corpo inarcato, braccio d'attacco caricato dietro la testa, l'altro punta la palla;
  // spike = braccio teso in alto davanti al colpo; spkfol = accompagnamento, il braccio scende davanti al corpo
  // (caricamento: gomito del braccio d'attacco alto e tirato indietro, mano dietro la testa, l'altro braccio punta la palla)
  spkload: { hip: [14, 24], neck: [14, 13], head: [16, 9], bl: [[12, 29], [14, 35]], fl: [[16, 30], [18, 35]], ba: [[20, 10], [25, 6]], fa: [[8, 11], [12, 5]] },
  spike: { hip: [15, 24], neck: [16, 13], head: [18, 9],  bl: [[13, 30], [15, 36]], fl: [[18, 30], [15, 37]], ba: [[19, 16], [22, 18]], fa: [[19, 7], [22, 2]] },
  // colpo con la palla presa davanti alla testa (braccio veloce, tecnico): braccio teso in avanti e in alto
  spikefr: { hip: [15, 24], neck: [17, 13], head: [19, 9], bl: [[13, 30], [15, 36]], fl: [[18, 30], [16, 37]], ba: [[19, 17], [22, 20]], fa: [[22, 9], [27, 5]] },
  spkfol: { hip: [15, 24], neck: [18, 14], head: [21, 10], bl: [[14, 30], [13, 36]], fl: [[18, 30], [18, 36]], ba: [[14, 18], [11, 21]], fa: [[22, 17], [23, 23]] },
  block: { hip: [16, 24], neck: [16, 13], head: [17, 9],  bl: [[15, 31], [15, 38]], fl: [[17, 31], [17, 38]], ba: [[16, 6], [17, 1]],  fa: [[18, 6], [19, 1]] },
  dive:  { hip: [9, 32],  neck: [21, 33], head: [25, 32], bl: [[5, 31], [1, 30]],   fl: [[5, 33], [1, 33]],   ba: [[25, 35], [30, 35]], fa: [[25, 34], [30, 33]] },
  down:  { hip: [10, 36], neck: [22, 36], head: [26, 35], bl: [[6, 37], [2, 38]],   fl: [[6, 38], [2, 37]],   ba: [[26, 38], [30, 38]], fa: [[26, 37], [30, 37]] },
  // rincorsa d'attacco: appr = penultimo passo lungo e balzo, busto avanti e braccia slanciate indietro;
  // plant = arrivo a piedi pari con le ginocchia piegate, braccia tutte indietro, un attimo prima dello stacco
  // pallonetto di seconda dell'alzatore: in salto si gira verso la rete, il braccio teso sopra la testa spinge la palla
  // di là con un colpo secco del polso (dump), poi la mano accompagna in basso oltre la rete (dumpfol)
  dump:    { hip: [15, 24], neck: [17, 13], head: [19, 9], bl: [[13, 30], [11, 35]], fl: [[18, 30], [17, 36]], ba: [[14, 19], [11, 24]], fa: [[21, 7], [25, 2]] },
  dumpfol: { hip: [15, 24], neck: [18, 13], head: [20, 9], bl: [[13, 30], [11, 35]], fl: [[18, 30], [17, 36]], ba: [[14, 19], [11, 24]], fa: [[23, 10], [28, 9]] },
  appr0: { hip: [16, 25], neck: [19, 15], head: [22, 11], bl: [[13, 31], [9, 37]],  fl: [[19, 30], [19, 38]], ba: [[20, 21], [24, 24]], fa: [[21, 20], [25, 22]] },
  appr:  { hip: [15, 26], neck: [19, 16], head: [22, 12], bl: [[11, 31], [6, 37]],  fl: [[20, 31], [23, 38]], ba: [[12, 20], [7, 22]],  fa: [[13, 21], [8, 24]] },
  plant: { hip: [13, 29], neck: [18, 20], head: [21, 16], bl: [[16, 33], [13, 38]], fl: [[19, 33], [20, 38]], ba: [[13, 23], [6, 22]],  fa: [[14, 24], [7, 24]] },
  cheer2: { hip: [16, 24], neck: [16, 13], head: [17, 9], bl: [[14, 31], [12, 38]], fl: [[18, 31], [20, 38]], ba: [[13, 19], [16, 15]], fa: [[20, 8], [22, 2]] },
  cheer3: { hip: [16, 23], neck: [16, 12], head: [17, 8], bl: [[13, 29], [10, 34]], fl: [[19, 29], [22, 34]], ba: [[11, 11], [6, 7]], fa: [[21, 11], [26, 7]] },
  cheer: { hip: [16, 24], neck: [16, 13], head: [17, 9],  bl: [[14, 31], [13, 38]], fl: [[18, 31], [19, 38]], ba: [[13, 8], [10, 3]],  fa: [[20, 8], [23, 3]] },
  // battuta da fermo: mentre la palla scende il braccio d'attacco si carica dietro la testa, l'altro indica la palla
  srvload: { hip: [15, 25], neck: [14, 14], head: [16, 10], bl: [[13, 31], [10, 38]], fl: [[18, 31], [20, 38]], ba: [[20, 10], [24, 5]], fa: [[8, 12], [12, 6]] },
  toss:  { hip: [16, 24], neck: [17, 13], head: [18, 9],  bl: [[14, 31], [14, 38]], fl: [[18, 31], [18, 38]], ba: [[14, 18], [12, 21]], fa: [[19, 8], [20, 3]] },
  // battitore in attesa del fischio: in piedi, busto dritto, la palla tenuta con due mani davanti al petto
  srvhold: { hip: [16, 25], neck: [17, 14], head: [18, 10], bl: [[15, 31], [13, 38]], fl: [[18, 31], [19, 38]], ba: [[19, 20], [21, 17]], fa: [[20, 20], [22, 16]] },
  // palleggio in salto visto di profilo: in aria con le ginocchia raccolte e le mani a finestra sopra la fronte (jsetload),
  // spinta con le braccia distese in alto e il corpo allungato (jset), ricaduta con le gambe pronte e le braccia che scendono (land)
  jsetload: { hip: [16, 24], neck: [16, 13], head: [17, 9], bl: [[14, 29], [13, 34]], fl: [[18, 29], [17, 35]], ba: [[13, 10], [16, 5]], fa: [[20, 10], [19, 5]] },
  jset:  { hip: [16, 24], neck: [16, 13], head: [17, 9],  bl: [[15, 31], [14, 37]], fl: [[17, 31], [17, 37]], ba: [[16, 6], [18, 1]],  fa: [[19, 6], [20, 1]] },
  land:  { hip: [15, 26], neck: [17, 15], head: [19, 11], bl: [[16, 31], [13, 37]], fl: [[20, 31], [19, 37]], ba: [[18, 20], [21, 24]], fa: [[20, 19], [24, 22]] },
  sad:   { hip: [15, 25], neck: [17, 15], head: [19, 12], bl: [[14, 31], [13, 38]], fl: [[17, 31], [17, 38]], ba: [[16, 20], [15, 25]], fa: [[18, 20], [17, 25]] }
};

// colore '#rrggbb' schiarito (f > 1) o scurito (f < 1)
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
// disegno pixel art di un giocatore nella posa indicata (versione ARCADE); P = colori della squadra
// alzatore in palleggio: come in Power Spikes si gira di fronte. Tre pose frontali (il giocatore "guarda" la rete a destra):
//  - setload: gambe piegate, gomiti larghi e mani a "finestra" sopra la fronte (aspetta la palla);
//  - set: spinta, braccia e gambe distese verso l'alto;
//  - passside: bagher laterale, affondo di lato con le braccia unite verso la palla;
// dy = abbassamento del busto (testa, spalle, pantaloncini); le coordinate di mani e gomiti sono già finali.
const FRONTS = {
  setload: { dy: 4, hands: [[12.5, 8], [19.5, 8]], elbows: [[5.5, 15], [26.5, 15]],
    hipL: [13, 36], hipR: [19, 36], kneeL: [9.5, 40.5], kneeR: [22.5, 40.5], footL: [11.5, 46], footR: [20.5, 46] },
  set: { dy: -1, hands: [[13.5, 1], [18.5, 1]], elbows: [[10, 8], [22, 8]],
    hipL: [13, 31], hipR: [19, 31], kneeL: [12.5, 38.5], kneeR: [19.5, 38.5], footL: [13, 46], footR: [19, 46] },
  // bagher laterale: di fronte, affondo verso la palla (a destra = verso la rete; specchiato se la palla è dietro)
  passside: { dy: 5, hands: [[27, 31], [27.5, 30]], elbows: [[21, 26], [23, 25]],
    hipL: [13, 36], hipR: [19, 36], kneeL: [8, 40], kneeR: [25, 39], footL: [3, 46], footR: [26, 46] },
  // palleggio in salto in volo, girato del tutto: ginocchia raccolte e mani a finestra sopra la fronte (jsetloadF),
  // spinta con braccia e corpo distesi (jsetF), ricaduta con le braccia che scendono e le gambe pronte (landF).
  // Le pose ...B sono le stesse viste di spalle (campo sinistro): capelli al posto del viso, numero grande sulla schiena.
  jsetloadF: { dy: 0, hands: [[13, 4], [19, 4]], elbows: [[7, 11], [25, 11]],
    hipL: [13, 32], hipR: [19, 32], kneeL: [10.5, 38], kneeR: [21.5, 38], footL: [12, 44], footR: [20, 44] },
  jsetF: { dy: -1, hands: [[14, 0], [18, 0]], elbows: [[11, 7], [21, 7]],
    hipL: [13, 31], hipR: [19, 31], kneeL: [12.5, 38], kneeR: [19.5, 38], footL: [13, 45], footR: [19, 45] },
  landF: { dy: 1, hands: [[8, 25], [24, 25]], elbows: [[8, 19], [24, 19]],
    hipL: [13, 33], hipR: [19, 33], kneeL: [11, 39], kneeR: [21, 39], footL: [12, 45], footR: [20, 45] },
};
for (const k of ['jsetloadF', 'jsetF', 'landF']) FRONTS[k.slice(0, -1) + 'B'] = { ...FRONTS[k], back: true };
const frontOf = pose => { const f = FRONTS[pose], d = f.dy;
  return { ...f, head: [16, 10 + d], sh: [[10, 17 + d], [22, 17 + d]] }; };
function drawPlayerFront(ctx, ox, P, hair, pose) {
  const F = frontOf(pose), d = F.dy, U = pts => pts.map(p => [p[0], p[1] + d]), B = P.beach, W = P.fem, BK = B && W, skin = P.sk, skinD = shade(P.sk, 0.74), shirt = P.sh, shirtD = shade(P.sh, 0.7);
  // gambe (ginocchiere, calzettoni e scarpe; in spiaggia piedi nudi)
  for (const [h, k, f] of [[F.hipL, F.kneeL, F.footL], [F.hipR, F.kneeR, F.footR]]) {
    limb(ctx, ox, h, k, 5, 4.2, skin); limb(ctx, ox, k, f, 4, 3, skinD);
    if (!B) {
      limb(ctx, ox, lerpP(k, f, 0.55), f, 3.4, 3, '#f2f2f2');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(ox + f[0] - 3, f[1] - 1, 6, 2);
      ctx.fillStyle = '#f4f4f4'; ctx.beginPath(); ctx.ellipse(ox + k[0], k[1], 2.8, 2.6, 0, 0, 7); ctx.fill();
    } else { ctx.fillStyle = skin; ctx.fillRect(ox + f[0] - 2, f[1] - 1, 4, 2); }
  }
  // pantaloncini e busto di fronte
  // giocatrici: pantaloncini corti (in spiaggia slip del costume), spalle più strette e fianchi un po' più larghi
  const so = BK ? 30.5 : W ? 31 : B ? 36 : 33;
  if (BK) poly(ctx, ox, U([[11, 27.5], [21, 27.5], [20.5, 30], [17, so + 1], [15, so + 1], [11.5, 30]]), P.so);
  else poly(ctx, ox, U([[W ? 10.5 : 11, 27], [W ? 21.5 : 21, 27], [21.5, so], [17, so], [16, 30], [15, so], [10.5, so]]), P.so);
  const tw = W ? [10.3, 21.7, 20, 12] : [9.5, 22.5, 20.5, 11.5];
  poly(ctx, ox, U([[tw[0], 16], [tw[1], 16], [tw[2], 28], [tw[3], 28]]), BK ? skin : shirt);
  poly(ctx, ox, U([[tw[0], 16], [12, 16], [13, 28], [tw[3], 28]]), BK ? skinD : shirtD);
  const topC = W && P.pat === 2 ? P.tr : shirt;
  if (BK) poly(ctx, ox, U([[10.5, 18], [21.5, 18], [21, 22.2], [16.5, 21.5], [15.5, 21.5], [11, 22.2]]), topC);   // top del costume
  if (W && P.pat === 1) { ctx.fillStyle = P.tr; if (BK) { ctx.fillRect(ox + 11, 21.6 + d, 10, 0.8); ctx.fillRect(ox + 11.5, 27.6 + d, 9, 0.8); } else { ctx.fillRect(ox + 11, 23 + d, 10, 1.2); } }   // bordi
  if (W && P.pat === 2 && !BK) { ctx.fillStyle = P.tr; ctx.fillRect(ox + 10.5, 16 + d, 11, 3); }   // spalle nel secondo colore
  const BACK = !!F.back;   // di spalle: niente viso, numero grande sulla schiena
  if (W && !BACK) { ctx.fillStyle = shade(P.sh, 0.78); ctx.fillRect(ox + 12.5, 22 + d, 3, 0.8); ctx.fillRect(ox + 16.5, 22 + d, 3, 0.8); }   // seno
  if (P.num && !BK) { ctx.fillStyle = P.tr; ctx.font = `bold ${BACK ? 8 : 6}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(P.num, ox + 16.5, (BACK ? 26 : 25) + d); ctx.textAlign = 'left'; }
  // braccia verso il pallone
  for (let i = 0; i < 2; i++) {
    limb(ctx, ox, F.sh[i], F.elbows[i], 4, 3.4, skin); limb(ctx, ox, F.elbows[i], F.hands[i], 3.4, 2.8, skin);
    if (!B) limb(ctx, ox, F.sh[i], lerpP(F.sh[i], F.elbows[i], 0.4), 4.6, 4, shirt);
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(ox + F.hands[i][0], F.hands[i][1], 1.8, 0, 7); ctx.fill();
  }
  // testa di fronte: capelli, occhi, bocca
  const [hx, hy] = F.head;
  limb(ctx, ox, [16, 16 + d], [16, 13 + d], 3.4, 3.4, skinD);
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(ox + hx, hy, 4.2, 4.8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(ox + hx, hy - 3, 4.6, 2.6, 0, 0, 7); ctx.fill();
  const hl = !W ? 4 : P.hs === 2 ? 4 : P.hs === 3 ? 6 : 8;   // giocatrici: capelli lunghi, caschetto o raccolti
  ctx.fillRect(ox + hx - 4.6, hy - 3, 1.4, hl); ctx.fillRect(ox + hx + 3.2, hy - 3, 1.4, hl);
  if (W && P.hs === 2) { ctx.beginPath(); ctx.ellipse(ox + hx, hy - 6.2, 2.2, 1.8, 0, 0, 7); ctx.fill(); }   // chignon
  if (BACK) {   // nuca: capelli su tutta la testa (lunghi sulla schiena per le giocatrici), orecchie ai lati
    ctx.fillStyle = skinD; ctx.fillRect(ox + hx - 4.8, hy - 0.5, 1.2, 2); ctx.fillRect(ox + hx + 3.6, hy - 0.5, 1.2, 2);
    ctx.fillStyle = hair; ctx.beginPath(); ctx.ellipse(ox + hx, hy - 0.6, 4.4, 4.6, 0, 0, 7); ctx.fill();
    if (W && P.hs !== 2) ctx.fillRect(ox + hx - (P.hs === 1 || !P.hs ? 1.2 : 4), hy, P.hs === 1 || !P.hs ? 2.4 : 8, P.hs === 3 ? 5 : 9);   // coda, treccia o caschetto
    return;
  }
  if (W) { ctx.fillStyle = '#c03848'; ctx.fillRect(ox + hx - 1, hy + 2.5, 2, 1); }
  if (B) { ctx.fillStyle = '#101018'; ctx.fillRect(ox + hx - 3.5, hy - 1, 7, 2); }
  else { ctx.fillStyle = '#201010'; ctx.fillRect(ox + hx - 2.5, hy - 1, 1, 1.4); ctx.fillRect(ox + hx + 1.5, hy - 1, 1, 1.4); }
  ctx.fillStyle = skinD; ctx.fillRect(ox + hx - 1, hy + 2.5, 2, 1);
}

// acconciature delle giocatrici di profilo (dietro la testa): coda di cavallo, treccia, chignon, caschetto
function femHairSide(ctx, ox, hx, hy, P, hair) {
  const dot = (x, y, rx, ry, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(ox + x, y, rx, ry, 0.3, 0, 7); ctx.fill(); };
  if (P.hs === 1) {   // treccia
    for (let k = 0; k < 4; k++) dot(hx - 5.4 - k * 0.4, hy + 0.5 + k * 2.6, 1.6, 1.5, k % 2 ? shade(hair, 1.25) : hair);
    ctx.fillStyle = P.tr; ctx.fillRect(ox + hx - 7.4, hy + 9.6, 1.8, 1.2);
  } else if (P.hs === 2) {   // chignon
    dot(hx - 4.6, hy - 4.2, 2.6, 2.4, hair); ctx.fillStyle = P.tr; ctx.fillRect(ox + hx - 3.6, hy - 3.4, 1.2, 1.6);
  } else if (P.hs === 3) {   // caschetto
    ctx.fillStyle = hair; ctx.fillRect(ox + hx - 5.6, hy - 2, 4, 6.5); dot(hx - 3.6, hy + 4.2, 2.2, 1.2, hair);
  } else {   // coda di cavallo
    dot(hx - 6.2, hy + 1.5, 1.8, 3.8, hair); ctx.fillStyle = P.tr; ctx.fillRect(ox + hx - 5.6, hy - 2.4, 1.6, 1.4);
  }
}

function drawPlayer(ctx, ox, pose, P, hair) {
  ctx.imageSmoothingEnabled = false;
  LIMB_K = 1.12 * (P.bd || 1);   // corporatura: braccia e gambe più o meno muscolose
  if (FRONTS[pose]) return drawPlayerFront(ctx, ox, P, hair, pose);
  const s0 = SKEL[pose];
  // corporatura "arcade": figura di ~30 px, testa grande, busto largo (misure dal video HD)
  const K = 1.17 * (P.ht || 1);   // scala del corpo: da ~34 a ~40 px (più o meno secondo l'altezza del giocatore)
  const sc = p => [16 + (p[0] - 16) * 1.06, 47 - (39 - p[1]) * K];
  const s = { hip: sc(s0.hip), neck: sc(s0.neck), head: sc(s0.head), bl: s0.bl.map(sc), fl: s0.fl.map(sc), ba: s0.ba.map(sc), fa: s0.fa.map(sc) };
  const skin = P.sk, skinD = shade(P.sk, 0.74), skinB = shade(P.sk, 0.6);
  const shirt = P.sh, shirtD = shade(P.sh, 0.62), shirtL = shade(P.sh, 1.18), shorts = P.so, shortsD = shade(P.so, 0.68);
  const B = P.beach;   // look da spiaggia: canotta, pantaloncini lunghi, piedi nudi, occhiali da sole
  const W = P.fem, BK = B && W;   // giocatrici (in spiaggia: costume a due pezzi)
  const leg = (j, back) => {
    const knee = j[0], foot = j[1];
    limb(ctx, ox, s.hip, knee, 6, 5, back ? skinB : skin);                                   // coscia
    limb(ctx, ox, s.hip, lerpP(s.hip, knee, BK ? 0.12 : W ? 0.2 : B ? 0.62 : 0.28), 5.6, 5.2, back ? shortsD : shorts);   // pantaloncino (beach: lungo)
    if (B) {   // gamba e piede nudi
      limb(ctx, ox, knee, foot, 4, 3, back ? skinB : skinD);
      ctx.fillStyle = back ? skinB : skin; ctx.fillRect(ox + Math.round(foot[0]) - 1, Math.round(foot[1]) - 1, 5, 2);
      return;
    }
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
    if (!B) limb(ctx, ox, sh, lerpP(sh, j[0], 0.42), 4.6, 4, back ? shirtD : shirt);         // manica corta (beach: canotta)
    ctx.fillStyle = back ? skinB : skin; ctx.beginPath(); ctx.arc(ox + j[1][0], j[1][1], 1.7, 0, 7); ctx.fill();
  };
  arm(s.ba, true);
  leg(s.bl, true);
  // busto da atleta (snello, spalle un po' più larghe della vita) con ombra sul dorso e luce sul petto
  const dir = [s.hip[0] - s.neck[0], s.hip[1] - s.neck[1]], L = Math.hypot(dir[0], dir[1]), nx = -dir[1] / L, ny = dir[0] / L;
  const c1 = lerpP(s.neck, s.hip, 0.02), c2 = lerpP(s.neck, s.hip, 0.92);
  const Q = (p, k) => [p[0] + nx * k, p[1] + ny * k];
  const ws = (W ? 0.9 : 1) * Math.sqrt(P.bd || 1);   // giocatrici: spalle più strette; corporatura
  // busto con le spalle arrotondate: dalla schiena il profilo sale morbido (trapezio) fino al collo, poi scende sul petto
  const torsoPath = () => {
    const P0 = Q(c2, 3.8), P1 = Q(lerpP(c1, c2, 0.2), 5 * ws), P2 = Q(c1, 1.9), P3 = Q(c1, -2.2), P4 = Q(lerpP(c1, c2, 0.18), -4.8 * ws), P5 = Q(c2, -4);
    const cB = Q(lerpP(c1, c2, -0.02), 4.6 * ws), cF = Q(lerpP(c1, c2, -0.02), -4.2 * ws);
    ctx.beginPath(); ctx.moveTo(ox + P0[0], P0[1]); ctx.lineTo(ox + P1[0], P1[1]);
    ctx.quadraticCurveTo(ox + cB[0], cB[1], ox + P2[0], P2[1]); ctx.lineTo(ox + P3[0], P3[1]);
    ctx.quadraticCurveTo(ox + cF[0], cF[1], ox + P4[0], P4[1]); ctx.lineTo(ox + P5[0], P5[1]); ctx.closePath();
  };
  torsoPath(); ctx.fillStyle = BK ? skin : shirt; ctx.fill();
  ctx.save(); torsoPath(); ctx.clip();   // ombra sul dorso e luce sul petto dentro la sagoma
  poly(ctx, ox, [Q(c1, 6), Q(c2, 3.8), Q(c2, 1.8), Q(c1, 2.2)], BK ? skinD : shirtD);
  poly(ctx, ox, [Q(c1, -2.4), Q(c2, -2.8), Q(c2, -4), Q(c1, -6)], BK ? shade(skin, 1.08) : shirtL);
  ctx.restore();
  const topC = W && P.pat === 2 ? P.tr : shirt;   // fantasia "due colori": top nel colore del bordo
  if (BK) { const t0 = lerpP(s.neck, s.hip, 0.12), t1 = lerpP(s.neck, s.hip, 0.4); poly(ctx, ox, [Q(t0, 4.4), Q(t1, 4), Q(t1, -4.4), Q(t0, -4.6)], topC);
    if (P.pat === 1) poly(ctx, ox, [Q(t1, 4), Q(lerpP(t1, s.hip, 0.06), 4), Q(lerpP(t1, s.hip, 0.06), -4.4), Q(t1, -4.4)], P.tr); }   // top (e bordo)
  else if (W && P.pat) { const a = lerpP(s.neck, s.hip, P.pat === 1 ? 0.5 : 0.02), b2 = lerpP(s.neck, s.hip, P.pat === 1 ? 0.58 : 0.26);
    poly(ctx, ox, [Q(a, 4.6), Q(b2, 4.4), Q(b2, -4.4), Q(a, -4.6)], P.tr); }   // maglia: fascia o spalle nel secondo colore
  if (W) { const bp = Q(lerpP(s.neck, s.hip, 0.3), -4.2); ctx.fillStyle = BK ? topC : shirtL; ctx.beginPath(); ctx.ellipse(ox + bp[0], bp[1], 1.7, 1.9, 0, 0, 7); ctx.fill(); }   // seno
  limb(ctx, ox, lerpP(s.neck, s.hip, BK ? 0.94 : 0.9), s.hip, W ? 6 : 5.6, W ? 5.8 : 5.2, shorts);
  ctx.fillStyle = shortsD; const hp = Q(s.hip, 2.5); ctx.fillRect(ox + Math.round(hp[0]) - 1, Math.round(hp[1]) - 2, 2, 4);
  leg(s.fl, false);
  // testa grande di profilo
  const [hx, hy] = s.head;
  limb(ctx, ox, lerpP(s.neck, s.hip, 0.05), lerpP(s.neck, s.head, 0.45), 4, 3, skinD);
  ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(ox + hx, hy, 4.2, 4.8, 0, 0, 7); ctx.fill();
  // naso piccolo (alla Power Spikes), più fine per le giocatrici; mento morbido
  ctx.fillStyle = skin; if (W) ctx.fillRect(ox + hx + 3.6, hy + 0.4, 1, 1.2); else ctx.fillRect(ox + hx + 3.6, hy + 0.2, 1.4, 1.6);   // naso
  ctx.fillStyle = skinD; ctx.fillRect(ox + hx - 1, hy + 3.4, W ? 3 : 4, W ? 0.6 : 1);                                       // mascella
  if (W) femHairSide(ctx, ox, hx, hy, P, hair);
  const buzz = !W && P.ms === 1;   // rasati: capelli corti e radi
  ctx.fillStyle = buzz ? shade(hair, 1.25) : hair; ctx.beginPath(); ctx.ellipse(ox + hx - 0.8, hy - (buzz ? 3.4 : 2.8), buzz ? 4.4 : 4.8, buzz ? 2.4 : 3.2, 0, 0, 7); ctx.fill();
  ctx.fillRect(ox + hx - 5.5, hy - 2, 3.5, buzz ? 3 : !W && P.ms === 2 ? 9 : 6);   // (lunghi: capelli sulla nuca)
  if (!W && P.ms === 3) for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(ox + hx - 4 + k * 2.2, hy - 5 + (k % 2), 1.4, 0, 7); ctx.fill(); }   // ricci
  ctx.fillStyle = shade(hair, 1.55); ctx.fillRect(ox + hx - 2, hy - 5, 4, 1);
  ctx.fillStyle = skinD; ctx.fillRect(ox + hx - 1, hy - 1, 1, 2);                    // orecchio
  // occhio grande con il bianco (stile anime di Power Spikes); giocatrici: ciglia e labbra
  ctx.fillStyle = '#ffffff'; ctx.fillRect(ox + hx + 1.5, hy - 1.2, 1, 1.1);
  ctx.fillStyle = '#201010'; ctx.fillRect(ox + hx + 2.4, hy - 1.3, 1, 1.3);          // occhio
  if (W) { ctx.fillRect(ox + hx + 1.2, hy - 1.9, 2.2, 0.5); ctx.fillStyle = '#c03848'; ctx.fillRect(ox + hx + 2.4, hy + 2.4, 1.3, 0.7); }
  else { ctx.fillStyle = skinD; ctx.fillRect(ox + hx + 2.4, hy + 2.5, 1.2, 0.5); }   // bocca
  if (B) {
    ctx.fillStyle = '#101018'; ctx.fillRect(ox + hx + 0.5, hy - 1.5, 4.5, 2);          // occhiali da sole
    ctx.fillStyle = '#5ac8f0'; ctx.fillRect(ox + hx + 3, hy - 1.5, 1, 1);
    if (P.cap) { ctx.fillStyle = P.tr; ctx.fillRect(ox + hx - 4, hy - 4.5, 8, 2); ctx.fillRect(ox + hx + 3, hy - 3, 4, 1); }   // visiera
  } else { ctx.fillStyle = '#ffffff'; const cl = lerpP(s.neck, s.hip, 0.04); ctx.fillRect(ox + Math.round(cl[0]) - 2, Math.round(cl[1]) - 1, 4, 1); } // colletto
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
function texDone(t, frames = [], R = GR) {
  t.refresh();
  for (const [n, x, y, w, h] of frames) t.add(n, 0, x * R, y * R, w * R, h * R);
  if (R === 1) return;
  t.setFilter(Phaser.Textures.FilterMode.LINEAR);
  for (const n of t.getFrameNames(true)) {
    const f = t.get(n), k = 1 / R;
    f.cutWidth *= k; f.cutHeight *= k; f.width *= k; f.height *= k; f.x *= k; f.y *= k;
    f.halfWidth = f.width / 2; f.halfHeight = f.height / 2; f.centerX = Math.floor(f.width / 2); f.centerY = Math.floor(f.height / 2);
    const d = f.data;
    d.cut.w *= k; d.cut.h *= k; d.sourceSize.w *= k; d.sourceSize.h *= k;
    d.spriteSourceSize.w *= k; d.spriteSourceSize.h *= k; d.radius *= k;
  }
}

// colpi d'attacco: dove si prende la palla (fwd: px davanti alla testa; up: px sopra o sotto il punto normale),
// velocità del braccio (sp), probabilità di power spike e pallonetto per il computer, zona del campo preferita (d, metri dalla rete)
// e posa del colpo (spike = braccio teso sopra la testa, spikefr = palla presa davanti)
const ATK_STYLES = {
  potente:    { nome: 'POTENTE', fwd: 5, up: 0, sp: 1.08, power: 0.5, dink: 0.02, d: [6, 8.4], pose: 'spike' },
  alto:       { nome: "DALL'ALTO", fwd: 3, up: 3, sp: 1.0, power: 0.3, dink: 0.04, d: [3.6, 6.2], pose: 'spike' },
  veloce:     { nome: 'BRACCIO VELOCE', fwd: 8, up: -3, sp: 1.04, power: 0.3, dink: 0.03, d: [4.5, 8], pose: 'spikefr' },
  tecnico:    { nome: 'TECNICO', fwd: 5, up: 0, sp: 0.97, power: 0.2, dink: 0.06, d: 'angoli', pose: 'spikefr', err: 0.6 },
  piazzatore: { nome: 'PALLONETTI', fwd: 4, up: 1, sp: 0.95, power: 0.15, dink: 0.2, d: [3, 8.4], pose: 'spike' }
};
// colori della squadra con i dati del giocatore i (pelle e numero di maglia dalle squadre JSON)
// look dei giocatori: divisa da palestra oppure da spiaggia (beach volley). Le texture hanno chiavi diverse
// ('_b' finale), così le due versioni convivono; setLook si chiama prima di creare o mostrare i giocatori.
// fem = versione femminile (texture con '_w' finale): giocatrici con coda di cavallo; in spiaggia costume a due pezzi
const LOOK = { beach: false, fem: false };
function setLook(scene, beach, fem) { LOOK.beach = !!beach; LOOK.fem = !!fem; }
// giocatori "foto" (versione 3D); le giocatrici usano i loro fogli (photo-sprites-f.js), se mancano sono disegnate
const usePhoto = () => typeof PHOTO !== 'undefined' && PHOTO.on && (!LOOK.fem || !!PHOTO.sets.f);

// caratteristiche di un giocatore, sempre le stesse per lo stesso nome: altezza (h, cm), corporatura (bd) e specialità.
// Più alti = più portata a muro ma un po' meno rapidi e meno bravi in ricezione; più robusti = schiacciate più forti.
//   blk: px di portata in più a muro   rcv: qualità della ricezione   spd: velocità di corsa   atk: potenza della schiacciata
const TRAITS = new Map();
function playerTraits(code, name, fem) {
  const key = code + ':' + name + (fem ? ':w' : '');
  if (TRAITS.has(key)) return TRAITS.get(key);
  const R = seeded(hashStr('tr:' + key)); R();
  const h = 0.955 + R() * 0.085, t = (h - 0.9975) / 0.0425, bd = 0.9 + R() * 0.22;   // t: -1 basso ... +1 alto
  const tr = { h, bd, cm: Math.round((fem ? 168 : 182) + (t + 1) * (fem ? 12 : 13)),
    blk: t * 3.5 + (R() - 0.5) * 2, rcv: -t * 0.05 + (R() - 0.5) * 0.05, spd: 1 - t * 0.04 + (R() - 0.5) * 0.05, atk: (bd - 1) * 0.45 + (R() - 0.5) * 0.04 };
  // specialità mostrata nella formazione: il punto di forza più marcato
  const sc = [['MURO', tr.blk / 3.5], ['RICEZIONE', tr.rcv / 0.05], ['VELOCE', (tr.spd - 1) / 0.04], ['POTENZA', tr.atk / 0.045]].sort((a, b) => b[1] - a[1]);
  tr.tag = sc[0][1] > 0.5 ? sc[0][0] : 'COMPLETO';
  // attacco: i più alti colpiscono più in alto (reach, px), e ognuno ha il suo colpo (ATK_STYLES): dipende dal fisico
  tr.reach = t * 4;
  const rs = R();
  tr.stile = bd > 1.06 ? 'potente' : t > 0.45 ? 'alto' : tr.spd > 1.03 ? 'veloce' : rs < 0.45 ? 'tecnico' : rs < 0.75 ? 'piazzatore' : 'potente';
  TRAITS.set(key, tr); return tr;
}

// ruolo libero: 'L' oppure sigle come 'L1', 'L2' (squadre JSON)
const isLiberoRole = r => /^L\d?$/.test(String(r || '').toUpperCase());
// maglia del libero: un colore ben diverso da maglia e pantaloncini della squadra (come vuole il regolamento)
function liberoKit(P) {
  const rgb = h => { const n = parseInt(String(h || '#000000').slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const dist = (a, b) => { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  const C = ['#f2d21a', '#20b0e0', '#e0303a', '#f07a1a', '#ffffff', '#1a1a1a', '#2ab060', '#e04a8a'];
  const sh = C.slice().sort((a, b) => Math.min(dist(b, P.sh), dist(b, P.tr)) - Math.min(dist(a, P.sh), dist(a, P.tr)))[0];
  const l = rgb(sh); return { sh, tr: l[0] * 0.3 + l[1] * 0.59 + l[2] * 0.11 > 150 ? '#1a1a2a' : '#ffffff' };
}
function playerPal(code, i) {
  const P = TEAMS[code];
  const lib = P.roles && isLiberoRole(P.roles[i]) && !LOOK.beach && !(P.shs && P.shs[i]) ? liberoKit(P) : null;
  const out = Object.assign({}, P, { sk: (P.sks && P.sks[i]) || P.sk, num: P.nums ? P.nums[i] : null,
    sh: (P.shs && P.shs[i]) || (lib && lib.sh) || P.sh, tr: (P.trs && P.trs[i]) || (lib && lib.tr) || P.tr });
  if (LOOK.beach) { out.beach = true; out.cap = i % 2 === 1; out.num = P.beachNums ? P.beachNums[i] : (i + 1) + ''; }
  const nm = P.names ? P.names[i] : String(i), tr = playerTraits(code, nm, LOOK.fem);
  out.ht = tr.h; out.bd = tr.bd;   // altezza e corporatura nel disegno
  { const r = seeded(hashStr(code + ':' + (nm || i))); r(); r(); out.ms = [0, 0, 2, 3, 0, 1, 3, 2][Math.floor(r() * 8)]; }   // capelli come nel volto
  if (LOOK.fem) {
    out.fem = true;
    out.hs = hashStr(code + ':h' + i) % 4;   // acconciatura: 0 coda di cavallo, 1 treccia, 2 chignon, 3 caschetto
    out.pat = hashStr(code + ':p') % 3;      // fantasia della divisa della squadra: 0 tinta unita, 1 bordi, 2 due colori
  }
  return out;
}

// chiave della texture di un giocatore: con i giocatori "foto" una sola texture per squadra
function plKey(code, i) { const b = (LOOK.beach ? '_b' : '') + (LOOK.fem ? '_w' : ''); return usePhoto() ? 'ph_' + code + b : `pl_${code}_${i}${b}`; }

// toglie le texture già create di una squadra (giocatori e volti): servono quando cambia la formazione
function dropTeamTex(scene, code) {
  const tm = scene.textures;
  for (const k of tm.getTextureKeys()) if (k.startsWith(`pl_${code}_`) || k.startsWith(`face_${code}_`)) tm.remove(k);
}

function makePlayerTex(scene, code, i) {
  if (usePhoto()) return makePhotoTex(scene, code);
  const key = plKey(code, i);
  if (scene.textures.exists(key)) return key;
  const P = playerPal(code, i), hair = P.ha[i % P.ha.length];
  // pose su righe da 12: in HD una riga sola sarebbe larga oltre 7000 px, più della texture massima di molti telefoni
  const PC = 12, cx = k => (k % PC) * FW, cy = k => Math.floor(k / PC) * FH;
  const { t, c } = canvasTex(scene, key, FW * PC, FH * Math.ceil(POSES.length / PC));
  if (GR > 1) { c.setTransform(1, 0, 0, 1, 0, 0); POSES.forEach((p, k) => c.drawImage(drawPlayerHD(p, P, hair, GR), cx(k) * GR, cy(k) * GR)); }
  else POSES.forEach((p, k) => { c.save(); c.translate(0, cy(k)); drawPlayer(c, cx(k), p, P, hair); c.restore(); });
  texDone(t, POSES.map((p, k) => [k, cx(k), cy(k), FW, FH]));
  return key;
}

// ---------------- volti (ritratti procedurali) ----------------
// numeri casuali ripetibili: stesso seme = stessa sequenza (volti, pubblico, squadre generate sempre uguali)
function seeded(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function hashStr(t) {
  let h = 2166136261;
  for (const c of t) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (Math.abs(h) % 2147483646) + 1;
}

// ritratto 40x40 in pixel art (pannello di chi batte, telecronaca, formazione); expr: 'neutral' | 'cheer'
// viso sagomato riga per riga con ombra e luce, occhi grandi colorati con il riflesso (stile Power Spikes),
// acconciatura del giocatore (corti, rasati, lunghi, ricci; per le giocatrici coda, treccia, chignon, caschetto)
function drawFace(ctx, ox, oy, code, idx, expr) {
  const P = playerPal(code, idx), R = seeded(hashStr(code + ':' + (TEAMS[code].names[idx] || idx))); R(); R();   // volto legato al nome
  const skin = P.sk, dk = shade(skin, 0.72), sh = shade(skin, 0.86), lt = shade(skin, 1.1);
  const hair = P.ha[idx % P.ha.length], hairL = shade(hair, 1.45), hairD = shade(hair, 0.7);
  let style = [0, 0, 2, 3, 0, 1, 3, 2][Math.floor(R() * 8)];   // 0 corti, 1 rasati, 2 lunghi, 3 riccioli
  let jaw = 1 + Math.floor(R() * 2);
  const W = !!P.fem;
  if (W) { style = P.hs === 2 ? 4 : P.hs === 3 ? 5 : 2; jaw = 0; }   // giocatrici: lunghi, chignon (4), caschetto (5)
  const iris = ['#5a3418', '#3a2412', '#3a6a9a', '#4a7a3a', '#6a4a20'][Math.floor(R() * 5)];
  const cheer = expr === 'cheer';
  const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, w, h); };
  const rows = (y0, half, col, cx = 20) => half.forEach((hw, k) => { if (hw > 0) px(Math.round(cx - hw), y0 + k, Math.round(hw * 2), 1, col); });
  // sfondo con un alone di luce dietro la testa
  const bg = ctx.createLinearGradient(0, oy, 0, oy + 40); bg.addColorStop(0, '#24408a'); bg.addColorStop(1, '#0a1640');
  ctx.fillStyle = bg; ctx.fillRect(ox, oy, 40, 40);
  const glow = ctx.createRadialGradient(ox + 20, oy + 15, 2, ox + 20, oy + 15, 18); glow.addColorStop(0, 'rgba(120,170,255,0.35)'); glow.addColorStop(1, 'rgba(120,170,255,0)');
  ctx.fillStyle = glow; ctx.fillRect(ox, oy, 40, 40);
  // capelli dietro la testa (lunghi, caschetto)
  if (style === 2) { px(8, 9, 4, W ? 23 : 17, hairD); px(28, 9, 4, W ? 23 : 17, hairD); }
  if (style === 5) { px(8, 9, 4, 15, hairD); px(28, 9, 4, 15, hairD); }
  if (W && P.hs === 1) for (let k = 0; k < 4; k++) px(30, 22 + k * 3, 3, 2, k % 2 ? hairL : hair);   // treccia
  // braccia alzate nell'esultanza
  if (cheer) for (const s of [-1, 1]) {
    const x = s < 0 ? 0 : 34; px(x, 20, 6, 20, P.sh); px(x + (s < 0 ? 4 : 0), 20, 2, 20, shade(P.sh, 0.8));
    px(x + 1, 11, 4, 9, skin); px(x + 1, 8, 5, 4, skin); px(x + 1, 8, 5, 1, lt);
  }
  // spalle e maglia: sagoma arrotondata, ombra a destra, colletto a V nel colore del bordo
  rows(31, [9, 12, 14, 15, 16, 17, 17, 17, 17], P.sh);
  rows(31, [0, 0, 0, 0, 0, 0, 0, 0, 0], P.sh);
  px(27, 33, 8, 7, shade(P.sh, 0.8)); px(5, 34, 3, 6, shade(P.sh, 1.15));
  px(15, 29, 10, 3, P.tr); px(16, 29, 8, 2, skin); px(17, 31, 6, 1, P.tr); px(18, 32, 4, 1, P.tr); px(17, 29, 6, 2, dk);
  if (P.num) { ctx.fillStyle = P.tr; ctx.font = 'bold 5px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(P.num, ox + 10, oy + 39); ctx.textAlign = 'left'; }
  // collo con l'ombra sotto il mento
  px(16, 24, 8, 6, sh); px(16, 24, 8, 2, dk);
  // viso riga per riga (mascella più o meno squadrata), ombra sulla guancia destra e luce sulla fronte
  const face = [5, 7, 8, 8.5, 9, 9, 9, 9, 9, 9, 9, 9, 9, 8.5, 8 + jaw * 0.5, 7.5 + jaw * 0.5, 6.5 + jaw * 0.5, 5.5 + jaw * 0.3, 4.5, 3];
  rows(7, face, skin);
  face.forEach((hw, k) => { if (hw > 2) px(Math.round(20 + hw) - 2, 7 + k, 2, 1, sh); });
  px(13, 8, 5, 2, lt); px(12, 17, 2, 2, lt);
  px(10, 14, 2, 5, dk); px(28, 14, 2, 5, dk); px(10, 15, 1, 3, sh); px(29, 15, 1, 3, sh);   // orecchie
  // capelli sopra: calotta, frangia con il ciuffo, basette, riflessi
  if (style === 1) { rows(5, [6, 8, 9, 9], shade(hair, 1.15)); px(13, 6, 1, 1, sh); px(19, 5, 1, 1, sh); px(25, 6, 1, 1, sh); }
  else if (style === 3) { rows(4, [7, 9, 10, 10, 9], hair); for (let i = 0; i < 7; i++) { px(10 + i * 3, 3 + (i % 2), 3, 3, hair); px(11 + i * 3, 3 + (i % 2), 1, 1, hairL); } px(10, 9, 2, 5, hair); px(28, 9, 2, 5, hair); }
  else {
    rows(3, [6, 8, 9.5, 10, 10.5, 10.5, 10], hair);
    px(11, 10, 6, 1, hair); px(11, 11, 3, 1, hair); px(21, 10, 8, 1, hair); px(25, 11, 4, 1, hair);   // frangia
    px(10, 9, 2, style === 5 || style === 2 ? 12 : 6, hair); px(28, 9, 2, style === 5 || style === 2 ? 12 : 6, hair);
    px(13, 5, 7, 1, hairL); px(12, 6, 3, 1, hairL); px(22, 4, 4, 1, hairL);   // riflessi
    if (style === 4) { rows(0, [3, 4, 4], hair); px(18, 0, 3, 1, hairL); px(19, 3, 2, 1, P.tr); }   // chignon
  }
  // sopracciglia
  px(13, 12, 5, 1, hairD); px(22, 12, 5, 1, hairD); px(13, 13, 1, 1, hairD); px(26, 13, 1, 1, hairD);
  // occhi grandi: bianco, iride colorata, pupilla, riflesso, palpebra (giocatrici: ciglia)
  if (cheer) { for (const x of [13, 22]) { px(x, 15, 1, 1, '#2a1a10'); px(x + 1, 14, 3, 1, '#2a1a10'); px(x + 4, 15, 1, 1, '#2a1a10'); } }
  else for (const x of [13, 22]) {
    px(x, 14, 5, 3, '#ffffff'); px(x + 1, 14, 3, 3, iris); px(x + 2, 15, 1, 2, '#100808'); px(x + 1, 14, 1, 1, '#ffffff');
    px(x, 13, 5, 1, '#2a1a10'); px(x, 17, 5, 1, sh);
    if (W) { px(x === 13 ? x - 1 : x + 5, 13, 1, 1, '#2a1a10'); px(x === 13 ? x - 1 : x + 5, 12, 1, 1, '#2a1a10'); }
  }
  // naso: ombra laterale e narice
  px(20, 16, 1, 4, sh); px(19, 20, 3, 1, dk); px(19, 17, 1, 2, lt);
  // bocca
  if (cheer) { px(16, 22, 8, 1, '#3a0808'); px(16, 23, 8, 3, '#5a1010'); px(17, 22, 6, 1, '#ffffff'); px(18, 25, 4, 1, '#d05050'); px(17, 26, 6, 1, sh); }
  else if (W) { px(17, 23, 6, 1, '#b83848'); px(18, 24, 4, 1, '#d86070'); px(18, 23, 1, 1, '#e88090'); }
  else { px(17, 23, 6, 1, '#8a3c38'); px(18, 24, 4, 1, sh); }
  if (W) { px(12, 19, 3, 2, 'rgba(235,90,100,0.35)'); px(25, 19, 3, 2, 'rgba(235,90,100,0.35)'); px(10, 20, 1, 2, P.tr); px(29, 20, 1, 2, P.tr); }   // fard e orecchini
}

// texture del volto (40x40) del giocatore idx; expr = 'neutral' o 'cheer'
function makeFaceTex(scene, code, idx, expr) {
  const key = `face_${code}_${idx}_${expr}` + (LOOK.fem ? '_w' : '');
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
  const shirt = '#f2f2f8', sd = '#c4c4d4', skin = '#f0c4a4', sk2 = '#d09878', hairC = '#d8d8d0', hairD = '#a8a8a0';
  const path = (pts, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? c.quadraticCurveTo(p[0], p[1], p[2], p[3]) : c.lineTo(p[0], p[1]); c.closePath(); c.fill(); };
  // busto: camicia bianca con spalle arrotondate, ombra a destra, taschino con stemma della federazione
  path([[15, 44], [16, 30], [17, 25, 22, 24], [34, 24], [39, 25, 40, 30], [41, 44]], shirt);
  path([[33, 24], [39, 25, 40, 30], [41, 44], [35, 44], [36, 32]], sd);
  px(27.5, 27, 1, 17, sd); px(28, 30, 1, 1, '#9898a8'); px(28, 35, 1, 1, '#9898a8'); px(28, 40, 1, 1, '#9898a8');   // abbottonatura
  px(19, 31, 6, 6, '#e6e6f0'); px(20, 32, 4, 4, '#d0a020'); px(21, 33, 2, 2, '#2040a0');                            // stemma
  path([[23, 23], [28, 28], [33, 23], [31, 22], [28, 25], [25, 22]], '#2a2a3a');                                     // colletto
  // collo e testa: capelli grigi pettinati, orecchie, sopracciglia, occhi, naso, baffi
  px(25, 19, 6, 5, sk2);
  c.fillStyle = skin; c.beginPath(); c.ellipse(28, 12.5, 6, 7.2, 0, 0, 7); c.fill();
  px(21, 11, 2, 4, sk2); px(33, 11, 2, 4, sk2);
  c.fillStyle = hairC; c.beginPath(); c.ellipse(28, 7, 6.6, 3.6, 0, Math.PI, Math.PI * 2); c.fill();
  px(21.5, 6, 2, 6, hairC); px(32.5, 6, 2, 6, hairC); px(24, 4.5, 8, 1, '#f0f0e8'); px(22, 8, 1, 3, hairD); px(33, 8, 1, 3, hairD);
  px(24, 9.5, 3, 1, '#9a9a90'); px(29, 9.5, 3, 1, '#9a9a90');                                                       // sopracciglia
  px(24, 11, 3, 2, '#ffffff'); px(29, 11, 3, 2, '#ffffff'); px(25, 11, 2, 2, '#30304a'); px(30, 11, 2, 2, '#30304a');
  px(27.5, 13, 1, 3, sk2); px(26, 16, 4, 1, hairD); px(26.5, 18, 3, 1, '#a05050');                                 // naso, baffi, bocca
  // fischietto al collo con il cordino
  c.strokeStyle = '#202030'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(25, 23); c.quadraticCurveTo(26, 28, 28, 30); c.quadraticCurveTo(30, 28, 31, 23); c.stroke();
  LIMB_K = 1.12;   // (la corporatura dei giocatori non vale per l'arbitro)
  const arm = (pts, col = shirt) => {
    for (let i = 0; i < pts.length - 1; i++) limb(c, 0, pts[i], pts[i + 1], i ? 3.8 : 5, 3.6, i ? skin : col);   // manica e avambraccio
    const h = pts[pts.length - 1]; c.fillStyle = skin; c.beginPath(); c.arc(h[0], h[1], 2.1, 0, 7); c.fill();
  };
  const whistle = (x, y) => { px(x - 1.5, y - 1, 3, 2, '#c8c8d0'); px(x + 1.5, y - 0.5, 1, 1, '#909098'); };
  switch (pose) {
    case 'whistle': arm([[20, 26], [16, 30], [24, 20]]); whistle(27, 18); arm([[36, 26], [44, 22], [46, 10]]); break;
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
// Bandiere delle nazionali. modern.js e roster.js 'avvolgono' questa funzione per aggiungere altre bandiere, stemmi e loghi.
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
// texture della bandiera/stemma/logo di una squadra (memorizzata per codice e misura)
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
// texture comuni: pallone, pallone grande dei menu, marcatori 1P/2P
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
// uno spettatore (come nel pubblico di Power Spikes): testa con capelli, occhi e bocca, spalle con la maglia;
// qualcuno ha il cappellino, i capelli lunghi o è calvo, qualcuno alza le braccia. (x, y) = angolo in alto, circa 9 x 14 px
const FAN_SKINS = ['#f0c4a4', '#e8b898', '#d8a888', '#b07a58', '#8a5a3a'], FAN_HAIRS = ['#2a1a10', '#4a3020', '#1a1a1a', '#8a6030', '#d0b080', '#6a6a6a'];
function fanPerson(c, x, y, R, pal) {
  const sh = pal[Math.floor(R() * pal.length)], sk = FAN_SKINS[Math.floor(R() * FAN_SKINS.length)], hr = FAN_HAIRS[Math.floor(R() * FAN_HAIRS.length)];
  const kind = R(), up = R() < 0.12, cx = x + 4, cap = pal[Math.floor(R() * pal.length)];
  if (GR > 1) {   // versione HD: forme morbide
    c.fillStyle = sh; c.beginPath(); c.moveTo(cx - 4.4, y + 15); c.quadraticCurveTo(cx - 4.4, y + 7.4, cx, y + 7.2); c.quadraticCurveTo(cx + 4.4, y + 7.4, cx + 4.4, y + 15); c.fill();
    c.fillStyle = shade(sh, 0.78); c.beginPath(); c.moveTo(cx + 1.6, y + 7.6); c.quadraticCurveTo(cx + 4.4, y + 7.6, cx + 4.4, y + 15); c.lineTo(cx + 2.4, y + 15); c.fill();
    if (up) { c.strokeStyle = sh; c.lineWidth = 1.8; c.beginPath(); c.moveTo(cx - 3.4, y + 9); c.lineTo(cx - 5.2, y + 2); c.moveTo(cx + 3.4, y + 9); c.lineTo(cx + 5.2, y + 2); c.stroke();
      c.fillStyle = sk; c.beginPath(); c.arc(cx - 5.3, y + 1.4, 1.1, 0, 7); c.arc(cx + 5.3, y + 1.4, 1.1, 0, 7); c.fill(); }
    if (kind > 0.15 && kind < 0.35) { c.fillStyle = hr; c.beginPath(); c.ellipse(cx, y + 4.6, 3.6, 4.4, 0, 0, 7); c.fill(); }   // capelli lunghi dietro
    c.fillStyle = sk; c.beginPath(); c.ellipse(cx, y + 3.9, 2.9, 3.4, 0, 0, 7); c.fill();
    c.fillStyle = shade(sk, 0.85); c.beginPath(); c.ellipse(cx + 1.6, y + 4.2, 1.1, 2.6, 0, 0, 7); c.fill();
    if (kind >= 0.35 && kind < 0.45) { c.fillStyle = cap; c.beginPath(); c.ellipse(cx, y + 1.8, 3.1, 2, 0, Math.PI, 0); c.fill(); c.fillRect(cx, y + 1.4, 4.2, 0.9); }   // cappellino
    else if (kind >= 0.15) { c.fillStyle = hr; c.beginPath(); c.ellipse(cx, y + 2, 3.1, 2.1, 0, Math.PI * 0.95, Math.PI * 2.05); c.fill(); }
    c.fillStyle = '#1c1210'; c.beginPath(); c.arc(cx - 1.1, y + 3.9, 0.42, 0, 7); c.arc(cx + 1.1, y + 3.9, 0.42, 0, 7); c.fill();
    c.fillStyle = up ? '#8a2020' : shade(sk, 0.62); c.beginPath(); c.ellipse(cx, y + 5.6, up ? 0.8 : 0.9, up ? 0.6 : 0.3, 0, 0, 7); c.fill();
    return;
  }
  const px = (a, b, w, h, col) => { c.fillStyle = col; c.fillRect(a, b, w, h); };
  px(cx - 4, y + 8, 9, 7, sh); px(cx + 3, y + 8, 2, 7, shade(sh, 0.8)); px(cx - 4, y + 8, 1, 7, shade(sh, 1.12));   // spalle e maglia
  if (up) { px(cx - 6, y + 1, 2, 8, sh); px(cx + 5, y + 1, 2, 8, sh); px(cx - 6, y, 2, 2, sk); px(cx + 5, y, 2, 2, sk); }
  if (kind > 0.15 && kind < 0.35) { px(cx - 3, y + 1, 7, 7, hr); }   // capelli lunghi dietro
  px(cx - 1, y + 7, 3, 1, shade(sk, 0.75));
  px(cx - 2, y + 1, 5, 6, sk); px(cx - 3, y + 2, 7, 4, sk); px(cx + 2, y + 2, 1, 5, shade(sk, 0.86));             // testa
  if (kind < 0.15) px(cx - 1, y + 1, 2, 1, shade(sk, 1.15));                                                        // calvo
  else if (kind < 0.35) { px(cx - 3, y, 7, 2, hr); }
  else if (kind < 0.45) { px(cx - 3, y, 7, 2, cap); px(cx + 3, y + 1, 2, 1, cap); }                                // cappellino
  else { px(cx - 2, y, 5, 1, hr); px(cx - 3, y + 1, 7, 1, hr); px(cx - 3, y + 2, 1, 2, hr); }
  px(cx - 1, y + 3, 1, 1, '#201410'); px(cx + 1, y + 3, 1, 1, '#201410');                                           // occhi
  px(cx, y + 5, 1, 1, up ? '#8a2020' : shade(sk, 0.66));                                                             // bocca
}
// tribuna piena di spettatori a file sfalsate (le file davanti coprono il busto di quelle dietro)
function crowd(c, x0, y0, w, h, seed, dens = 1) {
  const R = seeded(seed), shirts = ['#c8c8c8', '#e0e0e0', '#a04040', '#4050a0', '#808090', '#c09060', '#606070', '#904070', '#d0d0d0', '#2a7a4a', '#d8b030'];
  c.save(); c.beginPath(); c.rect(x0, y0, w, h); c.clip();
  for (let y = y0 - 4, r = 0; y < y0 + h; y += 10, r++) for (let x = x0 - 4 + (r % 2) * 4; x < x0 + w; x += 8) if (R() < 0.94 * dens) fanPerson(c, x + (R() - 0.5), y, R, shirts);
  c.restore();
}
const ADS1 = ['VOLTEX', 'MIRAKO', 'KOBAYA', 'SESIA', 'NORDLUX', 'ALPINA'];
const ADS2 = ['SPIKE COLA', 'NETWORX', 'RIVA', 'ZEPHYR', 'KOMA'];

// palazzetto della modalità arcade: riflettori e tribune (bg_far), pubblicità (bg_ads), tribuna bassa (bg_mid), cartelloni (bg_boards)
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

// schermata della formazione nel modello originale (ARCADE): campo verde in prospettiva come in Power Spikes,
// con le righe e le strisce del taglio dell'erba
const LINEUP_COLORS = { ITA: '#18c818', SWE: '#f0b818', FRA: '#2858e0', GER: '#e0a030', GBR: '#d82828', ESP: '#e04020', NOR: '#d83030', DEN: '#d83030', BRA: '#f0c818' };
function makeLineupClassic(scene, code) {
  const key = 'lineupC_' + code;
  if (scene.textures.exists(key)) return key;
  const { t, c } = canvasTex(scene, key, 320, 224);
  const base = LINEUP_COLORS[code] || '#18c818';
  const gr = c.createLinearGradient(0, 0, 320, 224); gr.addColorStop(0, shade(base, 1.12)); gr.addColorStop(1, shade(base, 0.82));
  c.fillStyle = gr; c.fillRect(0, 0, 320, 224);
  for (let x = -224; x < 320; x += 12) { c.fillStyle = 'rgba(0,0,0,0.05)'; c.beginPath(); c.moveTo(x, 224); c.lineTo(x + 6, 224); c.lineTo(x + 230, 0); c.lineTo(x + 224, 0); c.fill(); }   // strisce del campo
  c.strokeStyle = '#ffffff'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(0, 40); c.lineTo(110, 40); c.lineTo(80, 208); c.lineTo(0, 208); c.stroke();
  c.beginPath(); c.moveTo(110, 40); c.lineTo(320, 40); c.moveTo(80, 208); c.lineTo(320, 208); c.stroke();
  c.beginPath(); c.moveTo(170, 40); c.lineTo(190, 208); c.moveTo(250, 40); c.lineTo(290, 208); c.stroke();
  texDone(t); return key;
}

// schermata della formazione (HD e 3D): palazzetto con il pubblico, rete e campo in prospettiva nel colore dell'arena
function makeLineupCourt(scene, code) {
  const key = 'lineup2_' + code;
  if (scene.textures.exists(key)) return key;
  const { t, c } = canvasTex(scene, key, 320, 224);
  const R = seeded(hashStr('lineup:' + code)), fl = TEAMS[code].fl || 0x24a83a;
  const floor = '#' + fl.toString(16).padStart(6, '0'), floorD = shade(floor, 0.62);
  // muro del palazzetto con il pubblico e la fascia nei colori della squadra
  const wall = c.createLinearGradient(0, 0, 0, 60); wall.addColorStop(0, '#0a0e24'); wall.addColorStop(1, '#1c2450');
  c.fillStyle = wall; c.fillRect(0, 0, 320, 60);
  const crowd = ['#e04040', '#f0d040', '#4080e0', '#f0f0f0', '#40c060', '#e080c0', '#f09040'];
  for (let y = 6; y < 44; y += 4) for (let x = (y / 4) % 2 * 2; x < 320; x += 4) {
    c.fillStyle = shade(crowd[Math.floor(R() * crowd.length)], 0.55 + y / 110); c.fillRect(x, y, 2, 2);
    c.fillStyle = 'rgba(240,200,170,' + (0.25 + y / 120) + ')'; c.fillRect(x, y - 1.5, 2, 1.2);
  }
  c.fillStyle = TEAMS[code].sh; c.fillRect(0, 46, 320, 8); c.fillStyle = TEAMS[code].tr; c.fillRect(0, 46, 320, 1); c.fillRect(0, 53, 320, 1);
  // pavimento in prospettiva: fuori campo più scuro, campo nel colore dell'arena, doghe verso il punto di fuga
  c.fillStyle = floorD; c.fillRect(0, 54, 320, 170);
  const vx = 160, vy = -120, edge = (x0, y) => vx + (x0 - vx) * (y - vy) / (224 - vy);
  c.fillStyle = floor; c.beginPath(); c.moveTo(edge(-10, 64), 64); c.lineTo(edge(330, 64), 64); c.lineTo(330, 224); c.lineTo(-10, 224); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.08)'; c.lineWidth = 1;
  for (let x0 = -200; x0 <= 520; x0 += 16) { c.beginPath(); c.moveTo(edge(x0, 64), 64); c.lineTo(x0, 224); c.stroke(); }
  const shine = c.createLinearGradient(0, 64, 0, 224); shine.addColorStop(0, 'rgba(255,255,255,0.18)'); shine.addColorStop(0.5, 'rgba(255,255,255,0)'); c.fillStyle = shine; c.fillRect(0, 64, 320, 160);
  // linee del campo: laterali, linea centrale sotto la rete e linea d'attacco
  c.strokeStyle = '#ffffff'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(edge(-10, 64), 64); c.lineTo(-10, 224); c.moveTo(edge(330, 64), 64); c.lineTo(330, 224);
  c.moveTo(edge(-10, 64), 64); c.lineTo(edge(330, 64), 64); c.moveTo(edge(-10, 118), 118); c.lineTo(edge(330, 118), 118); c.stroke();
  // rete con i pali e la fascia bianca
  c.fillStyle = '#d8d8e0'; c.fillRect(26, 22, 4, 44); c.fillRect(290, 22, 4, 44);
  c.fillStyle = 'rgba(20,20,30,0.55)'; c.fillRect(30, 26, 260, 24);
  c.strokeStyle = 'rgba(230,230,240,0.35)'; c.lineWidth = 0.6;
  for (let x = 30; x <= 290; x += 5) { c.beginPath(); c.moveTo(x, 26); c.lineTo(x, 50); c.stroke(); }
  for (let y = 26; y <= 50; y += 5) { c.beginPath(); c.moveTo(30, y); c.lineTo(290, y); c.stroke(); }
  c.fillStyle = '#f4f4f8'; c.fillRect(30, 24, 260, 3); c.fillRect(30, 49, 260, 1.5);
  c.fillStyle = '#e03030'; c.fillRect(70, 20, 2, 32); c.fillRect(248, 20, 2, 32);   // antenne
  texDone(t); return key;
}
