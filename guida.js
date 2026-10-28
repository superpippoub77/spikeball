// ============================================================
//  COME SI GIOCA (guida illustrata) e CREDITI
//  - Guide: 9 pagine (← → per sfogliare, ESC menu). Ogni pagina ha un'illustrazione fatta con i giocatori, il pallone
//    e la rete del gioco (quindi nella grafica scelta: ARCADE, PIXEL FOTO, HD o 3D) e la spiegazione sotto.
//    Testi in italiano e in inglese (le altre lingue usano l'inglese).
//  - Credits: titoli di coda che scorrono; nell'attract mode si alternano con la classifica (TOP TEN).
//    Il breve profilo dell'autore è in CREDITS_BIO (da modificare a piacere).
// ============================================================
const CREDITS_AUTHOR = 'FILIPPO MORANO';
const CREDITS_BIO = {
  it: ['Ingegnere.', "Ha ideato e sviluppato Spike Fever '91 con SpikeCode AI,", "per riportare in campo lo spirito delle sale giochi", "degli anni '90 e la pallavolo di tutti i giorni:", 'campionati FIPAV, squadre vere, giocatori e giocatrici.'],
  en: ['Engineer.', "He designed and developed Spike Fever '91 with SpikeCode AI", 'to bring back the spirit of the 90s arcades', 'together with real everyday volleyball:', 'FIPAV leagues, real teams, men and women players.'],
};

// testi della guida: [titolo, righe]; in inglese per le lingue diverse dall'italiano
const GUIDE_TXT = {
  it: [
    ['I COMANDI', [
      'Si gioca con le FRECCE (un joystick a 8 direzioni) e UN SOLO PULSANTE: Z (oppure SPAZIO). INVIO = START, ESC = indietro.',
      'Le direzioni sono riferite alla rete del TUO campo: AVANTI = verso la rete, INDIETRO = verso il fondo del campo.',
      'Scopo: far cadere la palla nel campo avversario. Ogni azione vale un punto (rally point); il set si vince con 2 punti di scarto.',
      'Il giocatore che comandi ha un alone rosso e la scritta P1 sopra la testa: i compagni li muove il computer.',
      'Il pulsante serve per battere, schiacciare e murare. Ricezione e alzata si fanno solo con le frecce.',
      'In partita premi T: in sovraimpressione vedi in ogni momento che cosa premere.']],
    ['LA BATTUTA', [
      '1. Al fischio il battitore è dietro la linea di fondo, con la palla in mano.',
      '2. Tieni una direzione (o nessuna) e premi Z: la palla viene lanciata. La direzione sceglie la battuta (vedi la rosa a destra).',
      '3. Premi di nuovo Z quando la palla diventa ROSSA (è nella zona di colpo). Anche un attimo prima va bene.',
      "NESSUNA = DALL'ALTO.  AVANTI = IN SALTO (rincorsa e stacco automatici, Z in cima al salto).  AVANTI+GIÙ = SALTO FLOTTANTE (palla tesa che balla).",
      'SU = ALTISSIMA (poi SU+Z).  SU+AVANTI = PHANTOM (poi GIÙ+AVANTI+Z: la palla si sdoppia).  SU+INDIETRO = THUNDER (poi GIÙ+INDIETRO+Z).',
      'Al colpo: AVANTI = battuta lunga, INDIETRO = corta. Allo scadere del conto la palla viene lanciata comunque: devi solo colpirla.']],
    ['RICEZIONE E DIFESA', [
      'Quando la palla arriva nel tuo campo comandi il giocatore SCHIARITO (P1): portalo con ← → sul QUADRATINO BLU, dove cadrà la palla.',
      'Non serve premere nulla: il bagher parte da solo. Palla un po\' lontana = bagher laterale; palla lontana = tuffo.',
      'Le palle oltre la prima linea toccano ai difensori arretrati, quelle corte alla prima linea.',
      'Mentre la palla è nell\'altro campo comandi già il difensore più arretrato: piazzalo in anticipo e riceverà lui.',
      'Tieni SU mentre ricevi = OPEN ATTACK (alzata alta per l\'asso).',
      'Ricezione sbagliata (MISHIT): porta tu l\'alzatore sotto la palla con le frecce.']],
    ["L'ALZATA", [
      "L'alzata è automatica: tu scegli l'attacco tenendo una direzione nel momento in cui l'alzatore tocca la palla.",
      'SU = palla ALTA per l\'asso.   GIÙ = palla BASSA e veloce.',
      'INDIETRO = SECONDA LINEA: attacca un giocatore di fondo, saltando dietro la linea dei 3 metri.',
      "Z subito dopo la ricezione, prima dell'alzata = PRIMO TEMPO: il centrale salta insieme all'alzatore.",
      "Se l'alzatore palleggia in salto: AVANTI + Z = SURPRISE ATTACK (pallonetto di seconda, appena oltre la rete).",
      'Nel palleggio in salto l\'alzatore in volo si gira: lo vedi di fronte nel campo destro, di spalle nel sinistro.']],
    ["L'ATTACCO", [
      'Rincorsa e salto sono automatici. Premi Z quando la palla diventa ROSSA e sopra lo schiacciatore compare HIT! PRESS BUTTON!',
      'La FRECCIA BLU nel campo avversario indica dove andrà la palla: spostala con ← → (MOVE ←→) prima del colpo.',
      'Al colpo: SU = PALLONETTO (palla corta e morbida dietro il muro), GIÙ = POWER SPIKE (fortissima e ripida).',
      "Z prima che l'asso salti = FAKE ATTACK: lui finta e la palla la colpisce un compagno.",
      'Ogni giocatore ha altezza e colpo diversi: potente, alto, veloce, tecnico o piazzatore.']],
    ['IL MURO', [
      'Quando attaccano gli avversari, i tuoi giocatori di prima linea si mettono da soli a muro davanti all\'attaccante.',
      'Premi Z quando lo schiacciatore avversario SALTA: i tuoi saltano con le braccia tese sopra la rete.',
      'Un muro pieno rimanda la palla di là e spesso fa punto; una palla solo sfiorata si può ancora difendere.',
      'Subito dopo torni in difesa: il difensore si muove con ← →.']],
    ['IN PARTITA', [
      'P = pausa   M = audio sì / no   T = comandi in sovraimpressione   ESC = torna al menu.',
      'X = CAMBI (a palla ferma, giocatore 1; Q per il giocatore 2): ↑↓ chi esce, ← → chi entra dalla panchina, Z conferma.',
      'STANCHEZZA: a palla ferma vedi la barra dell\'energia e la % di errori di ogni giocatore. Chi è stanco corre e salta meno e sbaglia di più: cambialo.',
      'Il LIBERO ha la maglia di un altro colore, difende e riceve meglio, e non va a rete.',
      'BEACH: la sabbia si deforma a ogni passo, salto e tuffo, e sulla sabbia smossa si corre e si salta meno. R = TIME-OUT (uno per set, a palla ferma): il rastrello la spiana.',
      'V = scossa dello schermo sì / no   K = effetto CRT   H = cambia grafica (ARCADE, PIXEL FOTO, HD, 3D).',
      'ARCADE: gettone con 5 o C, START con INVIO o 1. Squadre maschili o femminili e grafica si scelgono anche nel menu principale.']],
    ['TELEFONO E 2 GIOCATORI', [
      'Telefono e tablet: appoggia il pollice a sinistra e compare il JOYSTICK; a destra A (= Z), START, ESC, II (pausa) e ⋯ per gli altri tasti.',
      'Gioca in orizzontale: al primo tocco il gioco va a schermo intero (c\'è anche il pulsante in alto a destra).',
      'Senza joystick: nella metà destra un TOCCO vale A e una STRISCIATA vale una freccia (menu e partita). Il pulsante con il joystick mostra o nasconde i comandi.',
      'Su iPhone: Safari > Condividi > Aggiungi alla schermata Home, poi apri il gioco dall\'icona.',
      'Due giocatori sulla stessa tastiera: P2 usa W A S D e G, START con 2.']],
    ['CREDITI', [
      `Ideazione, game design e sviluppo: ${CREDITS_AUTHOR}, by SpikeCode AI.`,
      'Ispirato a Power Spikes (Video System, 1991). Motore: Phaser 3. Caratteri: Press Start 2P e Russo One.',
      'Premi Z per i titoli di coda.']],
  ],
  en: [
    ['CONTROLS', [
      'You play with the ARROWS (an 8-way joystick) and ONE BUTTON: Z (or SPACE). ENTER = START, ESC = back.',
      'Directions refer to the net of YOUR court: FORWARD = towards the net, BACK = towards your baseline.',
      'Goal: make the ball land in the opponent\'s court. Every rally is a point; a set is won by 2 points.',
      'The player you control has a red glow and P1 above the head: the computer moves your team-mates.',
      'The button is for serving, spiking and blocking. Receiving and setting use the arrows only.',
      'During a match press T: an overlay always shows what to press right now.']],
    ['THE SERVE', [
      '1. At the whistle the server stands behind the baseline holding the ball.',
      '2. Hold a direction (or none) and press Z to toss: the direction picks the serve (see the rose on the right).',
      '3. Press Z again when the ball turns RED (hitting zone). A moment early is fine too.',
      'NONE = OVERHAND.  FORWARD = JUMP SERVE (automatic run-up, Z at the top of the jump).  FORWARD+DOWN = JUMP FLOAT.',
      'UP = SKY BALL (then UP+Z).  UP+FORWARD = PHANTOM (then DOWN+FORWARD+Z).  UP+BACK = THUNDER (then DOWN+BACK+Z).',
      'On contact: FORWARD = long serve, BACK = short. When the countdown ends the ball is tossed anyway: you only have to hit it.']],
    ['RECEPTION AND DEFENCE', [
      'When the ball comes to your court you control the HIGHLIGHTED player (P1): move him with ← → onto the BLUE SQUARE where the ball lands.',
      'No button needed: the pass is automatic. Ball a bit far = side pass; far away = dive.',
      'Balls beyond the front row go to the back defenders, short balls to the front row.',
      'While the ball is on the other side you already control the deepest defender: place him early and he will receive.',
      'Hold UP while receiving = OPEN ATTACK (high set for the ace).',
      'Bad reception (MISHIT): move the setter under the ball yourself.']],
    ['THE SET', [
      'The set is automatic: choose the attack by holding a direction when the setter touches the ball.',
      'UP = HIGH ball for the ace.   DOWN = LOW fast ball.',
      'BACK = BACK ROW attack: a back player jumps behind the 3 m line.',
      'Z right after the reception, before the set = QUICK ATTACK: the middle blocker jumps with the setter.',
      'If the setter jump-sets: FORWARD + Z = SURPRISE ATTACK (second-touch dump just over the net).',
      'During a jump set the setter turns in the air: you see his face on the right court, his back on the left.']],
    ['THE SPIKE', [
      'Run-up and jump are automatic. Press Z when the ball turns RED and HIT! PRESS BUTTON! appears above the spiker.',
      'The BLUE ARROW in the opponent\'s court shows where the ball will go: move it with ← → (MOVE ←→) before the hit.',
      'On contact: UP = TIP (short soft ball behind the block), DOWN = POWER SPIKE (very hard and steep).',
      'Z before the ace jumps = FAKE ATTACK: he fakes and a team-mate hits the ball.',
      'Every player has his own height and hitting style: powerful, high, fast, technical or placer.']],
    ['THE BLOCK', [
      'When the opponents attack, your front-row players line up at the net in front of the hitter by themselves.',
      'Press Z when the opposing spiker JUMPS: your blockers jump with their arms stretched over the net.',
      'A full block sends the ball back and often wins the point; a touched ball can still be defended.',
      'Then you are back in defence: move the defender with ← →.']],
    ['DURING THE MATCH', [
      'P = pause   M = sound on / off   T = controls overlay   ESC = back to the menu.',
      'X = SUBSTITUTIONS (dead ball, player 1; Q for player 2): ↑↓ who leaves, ← → who comes in from the bench, Z confirms.',
      'FATIGUE: at a dead ball you see each player\'s energy bar and error %. A tired player runs and jumps less and makes more mistakes: sub him.',
      'The LIBERO wears a different colour, defends and receives better and never plays at the net.',
      'BEACH: the sand gets dug up by every step, jump and dive, and on rough sand you run and jump less. R = TIME-OUT (one per set, dead ball): the rake smooths it.',
      'V = screen shake on / off   K = CRT effect   H = change graphics (ARCADE, PIXEL PHOTO, HD, 3D).',
      'ARCADE: coin with 5 or C, START with ENTER or 1. Men\'s / women\'s teams and graphics can also be chosen in the main menu.']],
    ['PHONE AND 2 PLAYERS', [
      'Phone and tablet: put your thumb on the left and the JOYSTICK appears; on the right A (= Z), START, ESC, II (pause) and ⋯ for the other keys.',
      'Play in landscape: at the first touch the game goes full screen (there is also a button at the top right).',
      'Without the joystick: on the right half a TAP is A and a SWIPE is an arrow (menus and match). The gamepad button shows or hides the controls.',
      'On iPhone: Safari > Share > Add to Home Screen, then open the game from the icon.',
      'Two players on one keyboard: P2 uses W A S D and G, START with 2.']],
    ['CREDITS', [
      `Concept, game design and development: ${CREDITS_AUTHOR}, by SpikeCode AI.`,
      'Inspired by Power Spikes (Video System, 1991). Engine: Phaser 3. Fonts: Press Start 2P and Russo One.',
      'Press Z for the end credits.']],
  ],
};

// testo senza la traduzione automatica (i testi della guida sono già nella lingua giusta)
function rawText(scene, x, y, s, style) {
  const l = I18N.lang; I18N.lang = null;
  const t = scene.add.text(x, y, s, style);
  I18N.lang = l; return t;
}
// freccia da (x1, y1) a (x2, y2); dotted: linea a puntini (traiettoria della palla); curve: altezza dell'arco
function guideArrow(g, x1, y1, x2, y2, col, curve = 0, dotted = false) {
  const pts = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t - Math.sin(Math.PI * t) * curve]); }
  g.fillStyle(col, 1); g.lineStyle(1.2, col, 1);
  if (dotted) pts.forEach((p, i) => { if (i % 2 === 0) g.fillCircle(p[0], p[1], 0.8); });
  else { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.forEach(p => g.lineTo(p[0], p[1])); g.strokePath(); }
  const [ax, ay] = pts[pts.length - 2], a = Math.atan2(y2 - ay, x2 - ax);
  g.fillTriangle(x2, y2, x2 - Math.cos(a - 0.5) * 5, y2 - Math.sin(a - 0.5) * 5, x2 - Math.cos(a + 0.5) * 5, y2 - Math.sin(a + 0.5) * 5);
}

class GuideScene extends Base {
  constructor() { super('Guide'); }
  init(d) { this.page = d && d.page || 0; this.gone = false; this._born = undefined; }
  create() {
    camSetup(this); makeCommon(this); this.keysInit(); UI.bg(this);
    setLook(this, false, !!GS.women);
    const L = I18N.lang === 'it' ? GUIDE_TXT.it : GUIDE_TXT.en, it = I18N.lang === 'it';
    this.pages = L;
    const [title, lines] = L[this.page];
    rawText(this, 160, 4, (it ? 'COME SI GIOCA' : 'HOW TO PLAY') + `  ·  ${this.page + 1}/${L.length}  ·  ${title}`, UI.f(7, '#ffd23a', true)).setOrigin(0.5, 0);
    // illustrazione (in alto) e spiegazione (in basso)
    UI.panel(this, 4, 16, 312, 96, null);
    this.art = this.add.container(0, 0);
    this.drawArt(this.page);
    UI.panel(this, 4, 115, 312, 92, null);
    rawText(this, 10, 119, lines.map(s => '• ' + s).join('\n'), { ...UI.f(4.9, '#ffffff'), wordWrap: { width: 300 }, lineSpacing: 1.2 });
    rawText(this, 160, 210, it ? '← → pagina    ESC: menu' + (this.page === L.length - 1 ? '    Z: titoli di coda' : '    Z: avanti') : '← → page    ESC: menu' + (this.page === L.length - 1 ? '    Z: end credits' : '    Z: next'), UI.f(5, '#9ab8f0')).setOrigin(0.5, 0);
  }
  // giocatore del gioco in una posa: x, y = piedi; flip = guarda a sinistra (campo destro); z = altezza da terra
  pl(code, i, pose, x, y, flip = false, z = 0, k = 0.78) {
    const key = makePlayerTex(this, code, i);
    const s = this.add.sprite(x, y - z * k, key, PF[pose]).setOrigin(0.5, 1).setScale(k).setFlipX(flip);
    this.art.add(s); return s;
  }
  ball(x, y, red = false) { const b = this.add.image(x, y, 'ball').setScale(0.9); if (red) b.setTint(0xff5040); this.art.add(b); return b; }
  label(x, y, s, col = '#ffffff', size = 4.6, o = 0.5) { const t = rawText(this, x, y, s, UI.f(size, col, true)).setOrigin(o, 0.5).setStroke('#000000', 2); this.art.add(t); return t; }
  // tasto della tastiera disegnato, con la lettera scura (senza contorno) e la descrizione a destra
  keycap(g, x, y, k, desc, w = 24) {
    g.fillStyle(0xe8e8e8, 1).fillRoundedRect(x, y, w, 13, 2); g.fillStyle(0xb0b0b0, 1).fillRect(x, y + 11, w, 2);
    const t = rawText(this, x + w / 2, y + 6, k, UI.f(k.length > 2 ? 4.4 : 6.5, '#1a1a1a', true)).setOrigin(0.5); this.art.add(t);
    if (desc) this.label(x + w + 5, y + 6.5, desc, '#ffffff', 4.8, 0);
  }
  // campo visto di lato: pavimento, linee di fondo e dei 3 metri, rete al centro
  court(fy = 100) {
    const g = this.add.graphics(); this.art.add(g);
    g.fillStyle(0xc0603a, 1).fillRect(8, fy, 304, 8); g.fillStyle(0xffffff, 1).fillRect(20, fy, 2, 2).fillRect(298, fy, 2, 2).fillRect(118, fy, 1, 2).fillRect(202, fy, 1, 2);
    g.fillStyle(0x2a2a2a, 1).fillRect(159, fy - 50, 2, 50); g.fillStyle(0xf2f2f2, 1).fillRect(156, fy - 50, 8, 2);
    g.lineStyle(0.6, 0xe0e0e0, 0.7); for (let y = fy - 48; y < fy - 36; y += 2.5) g.lineBetween(156.5, y, 163.5, y);
    return g;
  }
  drawArt(n) {
    const it = I18N.lang === 'it', g = this.add.graphics(), FY = 100; this.art.add(g);
    const A = 'ITA', B = 'BRA';
    if (n === 0) {   // comandi: joystick, pulsante, tasti
      g.fillStyle(0x1a1a1a, 1).fillRoundedRect(22, 70, 70, 26, 6); g.fillStyle(0x606060, 1).fillRect(55, 44, 4, 30);
      g.fillStyle(0xe02020, 1).fillCircle(57, 42, 9); g.fillStyle(0xff7070, 1).fillCircle(54, 39, 3);
      for (const [dx, dy, s] of [[0, -1, '↑'], [1, 0, '→'], [0, 1, '↓'], [-1, 0, '←']]) this.label(57 + dx * 26, 46 + dy * 22, s, '#ffd23a', 7);
      this.label(57, 104 - 2, it ? 'FRECCE = JOYSTICK' : 'ARROWS = JOYSTICK', '#7ad0ff');
      g.fillStyle(0x901010, 1).fillEllipse(140, 74, 44, 20); g.fillStyle(0xe02020, 1).fillEllipse(140, 69, 40, 17); g.fillStyle(0xff6060, 1).fillEllipse(134, 65, 16, 5);
      this.label(140, 92, it ? 'UN SOLO PULSANTE: Z' : 'ONE BUTTON: Z', '#7ad0ff'); this.label(140, 102, it ? '(o SPAZIO; A sul telefono)' : '(or SPACE; A on phones)', '#9ab8f0', 4);
      const keys = [['INVIO', 'START'], ['ESC', it ? 'INDIETRO' : 'BACK'], ['P', it ? 'PAUSA' : 'PAUSE'], ['T', it ? 'AIUTO' : 'HELP'], ['X', it ? 'CAMBI' : 'SUBS'], ['M', 'AUDIO']];
      keys.forEach(([k, d], i) => this.keycap(g, 192 + (i % 2) * 62, 30 + Math.floor(i / 2) * 24, k, d));
    } else if (n === 1) {   // battuta: battitore, lancio, zona rossa; rosa delle direzioni
      this.court(FY);
      this.pl(A, 0, 'toss', 28, FY); this.ball(36, 34, true);
      guideArrow(g, 34, 66, 36, 40, 0xffd23a, 0, true);
      g.lineStyle(1, 0xff5040, 1).strokeRect(28, 36, 16, 22); this.label(46, 31, it ? 'ZONA: Z!' : 'ZONE: Z!', '#ff8070', 4.6, 0);
      guideArrow(g, 44, 40, 150, 62, 0xffffff, 18, true);
      // rosa: direzione tenuta al lancio -> tipo di battuta (→ = verso la rete)
      const cx = 238, cy = 54, R = 22;
      g.fillStyle(0x0a1e4a, 0.95).fillCircle(cx, cy, R); g.lineStyle(1, 0x3a7ae0, 1).strokeCircle(cx, cy, R);
      g.fillStyle(0xe02020, 1).fillCircle(cx, cy, 4);
      const rose = [[1, 0, it ? 'IN SALTO' : 'JUMP'], [1, 1, it ? 'SALTO FLOTTANTE' : 'JUMP FLOAT'], [0, -1, it ? 'ALTISSIMA' : 'SKY BALL'], [1, -1, 'PHANTOM'], [-1, -1, 'THUNDER']];
      for (const [dx, dy, s] of rose) {
        const n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n;
        guideArrow(g, cx + ux * 6, cy + uy * 6, cx + ux * 18, cy + uy * 18, 0xffd23a);
        this.label(cx + ux * 23 + (dx > 0 ? 1 : dx < 0 ? -1 : 0), cy + uy * 25, s, '#ffffff', 4.4, dx > 0 ? 0 : dx < 0 ? 1 : 0.5);
      }
      this.label(cx, cy + R + 8, it ? "NESSUNA DIREZIONE = DALL'ALTO" : 'NO DIRECTION = OVERHAND', '#7ad0ff', 4.4);
      this.label(cx, cy + R + 17, it ? '→ = verso la rete' : '→ = towards the net', '#9ab8f0', 4);
    } else if (n === 2) {   // ricezione: palla in arrivo, quadratino blu, ricevitore schiarito con P1
      this.court(FY);
      this.pl(B, 0, 'spike', 296, FY, true, 18); this.ball(286, 46);
      guideArrow(g, 284, 48, 72, FY - 6, 0xffffff, 30, true);
      g.fillStyle(0x3a8aff, 1).fillRect(66, FY + 1, 12, 4);
      const r = this.pl(A, 1, 'passload', 92, FY); r.setTint(0xffd8e8);
      const m = this.add.image(92, FY - 44, 'mark1p'); this.art.add(m);
      guideArrow(g, 80, FY - 4, 66, FY - 4, 0xffd23a); guideArrow(g, 104, FY - 4, 118, FY - 4, 0xffd23a);
      this.label(92, FY - 52, it ? 'IL TUO GIOCATORE' : 'YOUR PLAYER', '#ffd23a');
      this.label(30, 30, it ? 'QUADRATINO BLU:' : 'BLUE SQUARE:', '#7ad0ff', 4.6, 0); this.label(30, 39, it ? 'qui cade la palla' : 'the ball lands here', '#ffffff', 4.2, 0);
      guideArrow(g, 44, 44, 70, FY - 2, 0x7ad0ff, -6);
      this.label(124, FY - 22, it ? '← → per arrivarci' : '← → to get there', '#ffffff', 4.6, 0);
    } else if (n === 3) {   // alzata: tre traiettorie
      this.court(FY);
      this.pl(A, 1, 'setload', 140, FY); this.ball(141, FY - 44);
      guideArrow(g, 141, FY - 46, 66, FY - 40, 0xffd23a, 40); this.label(96, 20, it ? 'SU = ALTA' : 'UP = HIGH', '#ffd23a');
      guideArrow(g, 139, FY - 46, 116, FY - 38, 0x7ad0ff, 10); this.label(120, FY - 60, it ? 'GIÙ = BASSA' : 'DOWN = LOW', '#7ad0ff');
      guideArrow(g, 141, FY - 46, 40, FY - 44, 0xff9a6a, 22); this.label(36, FY - 58, it ? 'INDIETRO = 2ª LINEA' : 'BACK = BACK ROW', '#ff9a6a');
      this.pl(A, 2, 'idle', 66, FY); this.pl(A, 3, 'idle', 118, FY); this.pl(A, 0, 'idle', 34, FY);
      this.label(230, 40, it ? 'Z PRIMA DELL\'ALZATA' : 'Z BEFORE THE SET', '#ffffff'); this.label(230, 49, it ? '= PRIMO TEMPO' : '= QUICK ATTACK', '#ffd23a');
      this.label(230, 66, it ? 'ALZATA IN SALTO:' : 'JUMP SET:', '#ffffff'); this.label(230, 75, it ? 'AVANTI + Z = SURPRISE' : 'FORWARD + Z = SURPRISE', '#ffd23a');
      this.pl(B, 0, 'idle', 200, FY, true); this.pl(B, 1, 'idle', 270, FY, true);
    } else if (n === 4) {   // attacco: palla rossa, freccia blu, pallonetto / power spike
      this.court(FY);
      this.pl(A, 2, 'spike', 140, FY, false, 26); this.ball(150, 34, true);
      this.label(150, 24, 'HIT! PRESS BUTTON!', '#ff8070', 4.4);
      guideArrow(g, 152, 36, 236, FY - 2, 0xffffff, -4, true);
      g.fillStyle(0x3a8aff, 1).fillTriangle(236, FY - 16, 230, FY - 26, 242, FY - 26).fillRect(234, FY - 34, 4, 9);
      guideArrow(g, 214, FY - 30, 200, FY - 30, 0xffd23a); guideArrow(g, 258, FY - 30, 272, FY - 30, 0xffd23a);
      this.label(236, FY - 42, it ? 'MIRA CON ← →' : 'AIM WITH ← →', '#7ad0ff');
      guideArrow(g, 152, 36, 182, FY - 6, 0x9ad0ff, 18, true); this.label(186, 52, it ? 'SU = PALLONETTO' : 'UP = TIP', '#9ad0ff', 4.2, 0);
      this.label(40, 30, it ? 'GIÙ = POWER SPIKE' : 'DOWN = POWER SPIKE', '#ffd23a', 4.6, 0);
      this.label(40, 42, it ? 'Z PRIMA DEL SALTO = FINTA' : 'Z BEFORE THE JUMP = FAKE', '#ffffff', 4.2, 0);
      this.pl(B, 0, 'block', 176, FY, true, 14); this.pl(B, 1, 'passload', 280, FY, true);
    } else if (n === 5) {   // muro
      this.court(FY);
      this.pl(B, 2, 'spike', 182, FY, true, 26); this.ball(172, 34);
      this.pl(A, 1, 'block', 146, FY, false, 18); this.pl(A, 2, 'block', 134, FY, false, 18);
      this.label(110, 24, it ? 'Z QUANDO L\'AVVERSARIO SALTA' : 'Z WHEN THE OPPONENT JUMPS', '#ffd23a');
      guideArrow(g, 170, 36, 120, FY - 4, 0xffffff, 6, true);
      this.label(80, 60, it ? 'MURO!' : 'BLOCK!', '#ff8070', 8);
      this.pl(A, 0, 'passload', 50, FY); this.label(50, FY - 44, it ? 'DIFESA: ← →' : 'DEFENCE: ← →', '#7ad0ff');
    } else if (n === 6) {   // in partita: tasti
      const keys = [['P', it ? 'PAUSA' : 'PAUSE'], ['M', 'AUDIO'], ['T', it ? 'COMANDI A VIDEO' : 'ON-SCREEN HELP'], ['ESC', 'MENU'], ['X', it ? 'CAMBI (P1)' : 'SUBS (P1)'], ['Q', it ? 'CAMBI (P2)' : 'SUBS (P2)'],
                    ['V', it ? 'SCOSSA SCHERMO' : 'SCREEN SHAKE'], ['K', it ? 'EFFETTO CRT' : 'CRT EFFECT'], ['H', it ? 'GRAFICA' : 'GRAPHICS'], ['5', it ? 'GETTONE' : 'COIN']];
      keys.forEach(([k, d], i) => this.keycap(g, 16 + (i % 2) * 150, 22 + Math.floor(i / 2) * 17, k, d));
    } else if (n === 7) {   // telefono e 2 giocatori
      g.fillStyle(0x101018, 1).fillRoundedRect(14, 26, 170, 78, 10); g.lineStyle(1.5, 0x8a8a9a, 1).strokeRoundedRect(14, 26, 170, 78, 10);
      g.fillStyle(0x1a3a8a, 1).fillRect(46, 32, 106, 66); this.pl(A, 2, 'spike', 80, 92, false, 0, 0.6); this.pl(B, 1, 'passload', 128, 92, true, 0, 0.6);
      g.fillStyle(0xffffff, 0.15).fillCircle(32, 80, 13); g.fillStyle(0xffd23a, 0.7).fillCircle(32, 80, 6);
      g.fillStyle(0xc81e28, 0.85).fillCircle(168, 82, 9); this.label(168, 82, 'A', '#ffffff', 6);
      for (const [x, y, s] of [[156, 38, 'II'], [170, 38, 'ESC'], [154, 94, 'ST']]) { g.fillStyle(0x1a3c8a, 0.8).fillCircle(x, y, 5); this.label(x, y, s, '#ffffff', 3); }
      this.label(32, 100, 'JOYSTICK', '#ffd23a', 4); this.label(99, 22, it ? 'TELEFONO IN ORIZZONTALE' : 'PHONE IN LANDSCAPE', '#7ad0ff');
      this.label(250, 24, it ? '2 GIOCATORI' : '2 PLAYERS', '#ffd23a', 6);
      [['W', 0, -1], ['A', -1, 0], ['S', 0, 0], ['D', 1, 0]].forEach(([k, dx, dy]) => this.keycap(g, 229 + dx * 16, 45 + dy * 16, k, '', 14));
      this.keycap(g, 272, 45, 'G', '', 14);
      this.label(250, 78, it ? 'P2: W A S D + G' : 'P2: W A S D + G', '#ffffff'); this.label(250, 88, 'START: 2', '#9ab8f0', 4.4);
    } else {   // crediti
      this.label(160, 34, "SPIKE FEVER '91", '#ffd23a', 10);
      this.label(160, 56, CREDITS_AUTHOR, '#ffffff', 8);
      this.label(160, 70, 'by SpikeCode AI', '#7ad0ff', 6);
      this.pl(A, 2, 'cheer', 40, FY + 6); this.pl(B, 1, 'cheer2', 280, FY + 6, true);
      this.label(160, 92, (CREDITS_BIO[it ? 'it' : 'en'] || [])[0] || '', '#9ab8f0', 5);
    }
  }
  update() {
    if (this.gone) return;
    const n = this.pages.length;
    const go = p => { this.gone = true; SFX.blip(); this.scene.restart({ page: p }); };
    if (this.jd('left')) return go((this.page + n - 1) % n);
    if (this.jd('right')) return go((this.page + 1) % n);
    if (this.jd('esc')) { this.gone = true; GS.menuSel = 7; this.scene.start('MainMenu'); return; }
    if (this.btn() || this.startPressed()) {
      if (this.page === n - 1) { this.gone = true; SFX.select(); this.scene.start('Credits', { back: 'Guide', page: this.page }); return; }
      go(this.page + 1);
    }
  }
}

// ---------------- CREDITI ----------------
// titoli di coda che scorrono; nell'attract mode (dopo la classifica) passano da soli all'attract successivo
class CreditsScene extends Base {
  constructor() { super('Credits'); }
  init(d) { this.back = d && d.back; this.backPage = d && d.page; this.gone = false; this._born = undefined; this.t0 = undefined; }
  create() {
    camSetup(this); makeCommon(this); this.keysInit();
    this.bg(); if (!this.back) this.creditText();
    setLook(this, false, false);
    const it = I18N.lang === 'it';
    this.add.text(160, 10, '- CREDITS -', TXT(8, '#ffe030')).setOrigin(0.5).setDepth(5);
    this.add.graphics().setDepth(2).fillStyle(0x05102a, 0.82).fillRoundedRect(44, 0, 232, 224, 6);   // fascia scura: testo leggibile sopra lo sfondo
    const g = this.add.graphics().setDepth(4); g.fillStyle(0x000000, 1).fillRect(0, 0, 320, 22).fillRect(0, 202, 320, 22);
    const L = [
      ["SPIKE FEVER '91", 10, '#ffd23a'], ['', 5],
      [it ? 'IDEAZIONE, GAME DESIGN E SVILUPPO' : 'CONCEPT, GAME DESIGN AND DEVELOPMENT', 5, '#7ad0ff'], [CREDITS_AUTHOR, 9, '#ffffff'], ['by SpikeCode AI', 6, '#ffd23a'], ['', 4],
      ...(CREDITS_BIO[it ? 'it' : 'en'] || []).map(s => [s, 5, '#d8e4ff']), ['', 6],
      [it ? 'GRAFICA, ANIMAZIONI E PROGRAMMAZIONE' : 'GRAPHICS, ANIMATION AND CODE', 5, '#7ad0ff'], [CREDITS_AUTHOR + (it ? ' con SpikeCode AI' : ' with SpikeCode AI'), 6, '#ffffff'], ['', 4],
      [it ? 'ISPIRATO A' : 'INSPIRED BY', 5, '#7ad0ff'], ['POWER SPIKES  (VIDEO SYSTEM, 1991)', 6, '#ffffff'], ['', 4],
      [it ? 'MOTORE' : 'ENGINE', 5, '#7ad0ff'], ['PHASER 3', 6, '#ffffff'], ['', 4],
      [it ? 'CARATTERI' : 'FONTS', 5, '#7ad0ff'], ['PRESS START 2P  ·  RUSSO ONE', 6, '#ffffff'], ['', 4],
      ['WWW.FILIPPOMORANO.COM', 6, '#ffd23a'], ['', 8],
      [it ? 'GRAZIE PER AVER GIOCATO!' : 'THANK YOU FOR PLAYING!', 8, '#ffe030'],
    ];
    this.roll = this.add.container(0, 230).setDepth(3);
    let y = 0;
    for (const [s, sz, col] of L) {
      if (s) this.roll.add(rawText(this, 160, y, s, sz >= 8 ? TXT(sz, col) : UI.f(sz, col, true)).setOrigin(0.5, 0));
      y += sz + 5;
    }
    this.rollH = y;
    // ai lati due giocatori che esultano, a turno
    makePlayerTex(this, 'ITA', 0); makePlayerTex(this, 'BRA', 1);
    this.side = [this.add.sprite(28, 196, plKey('ITA', 0), PF.cheer).setOrigin(0.5, 1).setDepth(6), this.add.sprite(292, 196, plKey('BRA', 1), PF.cheer2).setOrigin(0.5, 1).setFlipX(true).setDepth(6)];
    if (!this.back) this.time.delayedCall(1000 * (this.rollH + 230) / 28 + 500, () => { if (!this.gone) { this.gone = true; nextAttract(this); } });
    else this.add.text(160, 214, it ? 'Z / ESC: torna alla guida' : 'Z / ESC: back to the guide', UI.f(5, '#9ab8f0')).setOrigin(0.5).setDepth(6);
  }
  update(t, dt) {
    // posizione dal tempo trascorso (non dalla somma dei fotogrammi): scorre alla stessa velocità anche se il gioco rallenta
    if (this.t0 === undefined) this.t0 = t;
    this.roll.y = 230 - ((t - this.t0) * 0.028) % (this.back ? this.rollH + 230 : 1e9);
    const k = Math.floor(t / 600) % 2;
    this.side[0].setFrame(k ? PF.cheer : PF.cheer3); this.side[1].setFrame(k ? PF.cheer2 : PF.cheer);
    if (this.gone) return;
    if (this.back) {
      if (this.btn() || this.startPressed() || this.jd('esc')) { this.gone = true; SFX.select(); this.scene.start(this.back, { page: this.backPage }); }
      return;
    }
    if (this.attractInput()) this.gone = true;
  }
}
