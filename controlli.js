// ============================================================
//  COMANDI: tasti e pulsanti rimappabili, gamepad, pannello di prova
//  Il gioco legge i tasti "originali" (frecce, Z, INVIO, ESC, P, X, R; per il giocatore 2 W A S D, G, 2, Q, Y).
//  Qui, prima che arrivino al gioco:
//   - i tasti veri vengono tradotti nei tasti originali secondo la mappa scelta (un tasto rimappato altrove non
//     fa più la sua vecchia azione); mentre si scrive (editor, nome del giocatore) non si traduce nulla;
//   - i gamepad (USB o Bluetooth, API Gamepad) diventano gli stessi tasti: croce e levetta sinistra = direzioni,
//     pulsanti rimappabili; il primo gamepad è del giocatore 1, il secondo del giocatore 2.
//  Pannello COMANDI (menu principale, riga COMANDI): mini controller che si illumina premendo tasti e pulsanti,
//  per ogni azione il tasto e il pulsante del gamepad con CAMBIA, e RIPRISTINA PREDEFINITI. Tutto resta salvato
//  nel browser (sf91_ctrl).
// ============================================================
const CTRL_ACTIONS = [
  { id: 'up', p: 1, name: 'SU', key: 'ArrowUp', code: 38, pad: 12 },
  { id: 'down', p: 1, name: 'GIÙ', key: 'ArrowDown', code: 40, pad: 13 },
  { id: 'left', p: 1, name: 'SINISTRA', key: 'ArrowLeft', code: 37, pad: 14 },
  { id: 'right', p: 1, name: 'DESTRA', key: 'ArrowRight', code: 39, pad: 15 },
  { id: 'a', p: 1, name: 'A (COLPO / CONFERMA)', key: 'z', code: 90, pad: 0 },
  { id: 'start', p: 1, name: 'START', key: 'Enter', code: 13, pad: 9 },
  { id: 'back', p: 1, name: 'INDIETRO', key: 'Escape', code: 27, pad: 1 },
  { id: 'pause', p: 1, name: 'PAUSA', key: 'p', code: 80, pad: 3 },
  { id: 'subs', p: 1, name: 'CAMBI', key: 'x', code: 88, pad: 2 },
  { id: 'timeout', p: 1, name: 'TIME-OUT (BEACH)', key: 'r', code: 82, pad: 5 },
  { id: 'up2', p: 2, name: 'SU', key: 'w', code: 87, pad: 12 },
  { id: 'down2', p: 2, name: 'GIÙ', key: 's', code: 83, pad: 13 },
  { id: 'left2', p: 2, name: 'SINISTRA', key: 'a', code: 65, pad: 14 },
  { id: 'right2', p: 2, name: 'DESTRA', key: 'd', code: 68, pad: 15 },
  { id: 'a2', p: 2, name: 'A (COLPO / CONFERMA)', key: 'g', code: 71, pad: 0 },
  { id: 'start2', p: 2, name: 'START', key: '2', code: 50, pad: 9 },
  { id: 'subs2', p: 2, name: 'CAMBI', key: 'q', code: 81, pad: 2 },
  { id: 'timeout2', p: 2, name: 'TIME-OUT (BEACH)', key: 'y', code: 89, pad: 5 },
];
const CTRL = {
  map: {},          // id -> { code, label } tasto scelto
  pad: {},          // id -> indice del pulsante del gamepad
  live: {},         // id -> premuto ora (tastiera o gamepad), per il pannello
  padLive: [{}, {}],
  open: false, capture: null,
};
const ctrlKeyLabel = (key, code) => ({ ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'INVIO', Escape: 'ESC', ' ': 'SPAZIO' })[key] || (key && key.length === 1 ? key.toUpperCase() : key || '#' + code);
function ctrlLoad() {
  let s = null; try { s = JSON.parse(localStorage.getItem('sf91_ctrl')); } catch (e) { /* */ }
  for (const A of CTRL_ACTIONS) {
    const k = s && s.keys && s.keys[A.id];
    CTRL.map[A.id] = k && k.code ? k : { code: A.code, label: ctrlKeyLabel(A.key, A.code) };
    CTRL.pad[A.id] = s && s.pad && Number.isInteger(s.pad[A.id]) ? s.pad[A.id] : A.pad;
  }
}
function ctrlSave() { try { localStorage.setItem('sf91_ctrl', JSON.stringify({ keys: CTRL.map, pad: CTRL.pad })); } catch (e) { /* */ } }
function ctrlReset() { try { localStorage.removeItem('sf91_ctrl'); } catch (e) { /* */ } ctrlLoad(); }
ctrlLoad();

// tasto "originale" mandato al gioco (stesso evento della tastiera: Phaser legge keyCode)
function ctrlSend(type, A) {
  const ev = new KeyboardEvent(type, { key: A.key, code: A.key.length === 1 ? 'Key' + A.key.toUpperCase() : A.key, bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'keyCode', { get: () => A.code }); Object.defineProperty(ev, 'which', { get: () => A.code });
  window.dispatchEvent(ev);
}
const ctrlTyping = e => { const t = e.target, tg = t && t.tagName; return tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT' || (t && t.isContentEditable) || (typeof myTyping === 'function' && myTyping() && !CTRL.open); };

// ---------------- tastiera ----------------
for (const type of ['keydown', 'keyup']) window.addEventListener(type, e => {
  if (!e.isTrusted) return;   // eventi già tradotti, touch e gamepad
  const down = type === 'keydown';
  if (CTRL.capture && CTRL.capture.kind === 'key') {   // CAMBIA: il prossimo tasto diventa quello dell'azione
    e.preventDefault(); e.stopImmediatePropagation();
    if (down && !e.repeat) ctrlAssignKey(e);
    return;
  }
  const A = CTRL_ACTIONS.find(x => CTRL.map[x.id].code === e.keyCode);
  if (A) CTRL.live[A.id] = down;
  if (CTRL.open) {   // pannello aperto: i tasti accendono il mini controller e non arrivano al gioco
    if (e.keyCode === 27 && down && !e.repeat && !A) ctrlClose();
    else if (A && A.id === 'back' && down) ctrlClose();
    e.stopImmediatePropagation(); return;
  }
  if (ctrlTyping(e)) return;
  if (A && A.code !== e.keyCode) {   // tasto rimappato: al gioco arriva quello originale
    e.preventDefault(); e.stopImmediatePropagation();
    if (!e.repeat) ctrlSend(type, A);
    return;
  }
  // tasto originale di un'azione spostata su un altro tasto (e non usato da altre azioni): non fa più nulla
  if (!A && CTRL_ACTIONS.some(x => x.code === e.keyCode && CTRL.map[x.id].code !== x.code)) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);

// ---------------- gamepad ----------------
// croce (pulsanti 12-15) o levetta sinistra = direzioni; gli altri pulsanti secondo la mappa
function ctrlPadState(gp, p) {
  const st = {}, ax = gp.axes || [], btn = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
  for (const A of CTRL_ACTIONS.filter(x => x.p === p)) {
    let on = btn(CTRL.pad[A.id]);
    const base = A.id.replace('2', '');
    if (base === 'left') on = on || ax[0] < -0.5; if (base === 'right') on = on || ax[0] > 0.5;
    if (base === 'up') on = on || ax[1] < -0.5; if (base === 'down') on = on || ax[1] > 0.5;
    st[A.id] = on;
  }
  return st;
}
function ctrlPoll() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  CTRL.pads = pads;
  pads.slice(0, 2).forEach((gp, n) => {
    const p = n + 1, st = ctrlPadState(gp, p), prev = CTRL.padLive[n];
    if (CTRL.capture && CTRL.capture.kind === 'pad') {   // CAMBIA: il primo pulsante premuto diventa quello dell'azione
      const i = gp.buttons.findIndex((b, k) => (b.pressed || b.value > 0.5) && !(CTRL.capture.held || []).includes(k));
      if (i >= 0) ctrlAssignPad(i);
      CTRL.padLive[n] = st; return;
    }
    for (const A of CTRL_ACTIONS.filter(x => x.p === p)) {
      if (!!st[A.id] === !!prev[A.id]) continue;
      if (CTRL.open) { if (A.id === 'back' && st[A.id]) ctrlClose(); continue; }
      ctrlSend(st[A.id] ? 'keydown' : 'keyup', A);
    }
    CTRL.padLive[n] = st;
  });
  requestAnimationFrame(ctrlPoll);
}
requestAnimationFrame(ctrlPoll);

// ---------------- rimappatura ----------------
function ctrlAssignKey(e) {
  const C = CTRL.capture; CTRL.capture = null;
  if (e.keyCode === 27 && C.id !== 'back') { ctrlDraw(); return; }   // ESC annulla (tranne quando si cambia proprio INDIETRO)
  const other = CTRL_ACTIONS.find(x => x.id !== C.id && CTRL.map[x.id].code === e.keyCode);
  if (other) CTRL.map[other.id] = CTRL.map[C.id];   // il tasto era già usato: le due azioni si scambiano i tasti
  CTRL.map[C.id] = { code: e.keyCode, label: ctrlKeyLabel(e.key, e.keyCode) };
  ctrlSave(); ctrlDraw();
}
function ctrlAssignPad(i) {
  const C = CTRL.capture; CTRL.capture = null;
  const p = CTRL_ACTIONS.find(x => x.id === C.id).p;
  const other = CTRL_ACTIONS.find(x => x.id !== C.id && x.p === p && CTRL.pad[x.id] === i);
  if (other) CTRL.pad[other.id] = CTRL.pad[C.id];
  CTRL.pad[C.id] = i; ctrlSave(); ctrlDraw();
}

// ---------------- pannello ----------------
let ctrlRoot = null, ctrlOnClose = null;
const ctrlT = s => (typeof T === 'function' ? T(s) : s);
function openControls(onClose) {
  ctrlOnClose = onClose; CTRL.open = true;
  if (!document.getElementById('ctrlCss')) {
    const css = document.createElement('style'); css.id = 'ctrlCss';
    css.textContent = `
    #controls { touch-action: pan-y; position: fixed; inset: 0; z-index: 45; background: #071233; color: #fff; font: 13px Arial, sans-serif; overflow-y: auto; padding: 10px max(12px, env(safe-area-inset-left)); }
    #controls h1 { font: 20px "Arial Black", Arial; color: #ffd23a; margin: 4px 0 2px; }
    #controls .muted { color: #9ab8f0; font-size: 12px; }
    #controls .bar { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0; }
    #controls button { background: #1a5ad8; color: #fff; border: 1px solid #7ab0ff; border-radius: 6px; padding: 6px 12px; font: bold 12px Arial; cursor: pointer; }
    #controls button.red { background: #a02028; border-color: #ff8a8a; } #controls button.small { padding: 3px 8px; font-size: 11px; }
    #controls button.wait { background: #ffd23a; color: #1a1a1a; }
    #controls .cols { display: flex; gap: 16px; flex-wrap: wrap; }
    #controls .col { flex: 1 1 380px; background: #0a1e4a; border: 1px solid #3a7ae0; border-radius: 8px; padding: 8px 10px; }
    #controls table { width: 100%; border-collapse: collapse; } #controls td { padding: 3px 4px; border-bottom: 1px solid #1a3070; }
    #controls kbd { display: inline-block; min-width: 26px; text-align: center; background: #e8e8e8; color: #111; border-radius: 4px; padding: 2px 6px; font: bold 12px Arial; box-shadow: 0 2px 0 #9a9a9a; }
    #controls .dot { width: 12px; height: 12px; border-radius: 50%; background: #23345e; display: inline-block; }
    #controls .dot.on, #controls .pad .on { background: #3ad05a !important; box-shadow: 0 0 10px #3ad05a; color: #072; }
    #controls .pad { position: relative; width: 300px; height: 130px; margin: 6px auto 8px; background: #20283c; border-radius: 60px; border: 2px solid #48587a; }
    #controls .pad div { position: absolute; display: flex; align-items: center; justify-content: center; background: #39445e; color: #fff; font: bold 11px Arial; }
    #controls .pad .d { width: 26px; height: 26px; border-radius: 4px; }
    #controls .pad .b { width: 30px; height: 30px; border-radius: 50%; }
    #controls .pad .s { width: 44px; height: 16px; border-radius: 8px; font-size: 9px; }`;
    document.head.appendChild(css);
  }
  ctrlRoot = document.createElement('div'); ctrlRoot.id = 'controls';
  document.body.appendChild(ctrlRoot);
  ctrlDraw(); ctrlLive();
}
function ctrlClose() {
  if (!ctrlRoot) return;
  CTRL.open = false; CTRL.capture = null; CTRL.live = {};
  ctrlRoot.remove(); ctrlRoot = null;
  const f = ctrlOnClose; ctrlOnClose = null; if (f) f();
}
// mini controller di un giocatore: croce, A, INDIETRO, START, PAUSA, CAMBI, TIME-OUT
function ctrlPadHtml(p) {
  const s = p === 2 ? '2' : '';
  const el = (id, cls, x, y, txt) => `<div class="${cls}" data-act="${id}${s}" style="left:${x}px;top:${y}px">${txt}</div>`;
  return `<div class="pad">${el('up', 'd', 52, 26, '↑')}${el('down', 'd', 52, 78, '↓')}${el('left', 'd', 26, 52, '←')}${el('right', 'd', 78, 52, '→')}` +
    el('a', 'b', 236, 64, 'A') + (p === 1 ? el('back', 'b', 266, 36, 'B') + el('pause', 'b', 206, 36, 'P') : '') + el('subs', 'b', 236, 8, 'X') +
    el('start', 's', 158, 52, 'START') + el('timeout', 's', 112, 92, 'TIME') + '</div>';
}
function ctrlDraw() {
  if (!ctrlRoot) return;
  const pads = CTRL.pads || [], C = CTRL.capture;
  const padName = n => pads[n] ? pads[n].id.replace(/\(.*?\)/g, '').trim().slice(0, 40) : ctrlT('nessuno (premi un pulsante del controller)');
  const rows = p => CTRL_ACTIONS.filter(a => a.p === p).map(A => {
    const wk = C && C.id === A.id && C.kind === 'key', wp = C && C.id === A.id && C.kind === 'pad';
    return `<tr><td><span class="dot" data-dot="${A.id}"></span></td><td>${ctrlT(A.name)}</td>` +
      `<td><kbd>${CTRL.map[A.id].label}</kbd> <button class="small${wk ? ' wait' : ''}" data-key="${A.id}">${wk ? ctrlT('PREMI UN TASTO…') : ctrlT('TASTO')}</button></td>` +
      `<td><kbd>${A.id.match(/^(up|down|left|right)/) ? '✚ / ' : ''}${CTRL.pad[A.id]}</kbd> <button class="small${wp ? ' wait' : ''}" data-pad="${A.id}">${wp ? ctrlT('PREMI UN PULSANTE…') : ctrlT('PULSANTE')}</button></td></tr>`;
  }).join('');
  ctrlRoot.innerHTML = `<h1>${ctrlT('COMANDI')}</h1>
    <div class="muted">${ctrlT('Premi un tasto o un pulsante: si accende sul controller e nella lista. TASTO / PULSANTE per cambiarlo (ESC annulla); se era già usato, le due azioni si scambiano.')}</div>
    <div class="bar"><button data-reset="1" class="red">${ctrlT('RIPRISTINA PREDEFINITI')}</button><button data-close="1">${ctrlT('CHIUDI')}</button></div>
    <div class="cols">${[1, 2].map(p => `<div class="col"><b>${ctrlT('GIOCATORE')} ${p}</b> <span class="muted">· gamepad: ${padName(p - 1)}</span>${ctrlPadHtml(p)}
      <table><tr class="muted"><td></td><td>${ctrlT('AZIONE')}</td><td>${ctrlT('TASTIERA')}</td><td>GAMEPAD</td></tr>${rows(p)}</table></div>`).join('')}</div>
    <div class="muted" style="margin-top:8px">${ctrlT('Gamepad: croce e levetta sinistra sono sempre le direzioni; i numeri sono i pulsanti del controller (0 = in basso, 1 = a destra, 2 = a sinistra, 3 = in alto, 9 = START).')}</div>`;
  ctrlRoot.querySelectorAll('[data-key]').forEach(b => b.onclick = () => { CTRL.capture = { id: b.dataset.key, kind: 'key' }; ctrlDraw(); });
  ctrlRoot.querySelectorAll('[data-pad]').forEach(b => b.onclick = () => {
    const held = []; (CTRL.pads || []).forEach(gp => gp.buttons.forEach((x, i) => { if (x.pressed) held.push(i); }));
    CTRL.capture = { id: b.dataset.pad, kind: 'pad', held }; ctrlDraw();
  });
  ctrlRoot.querySelector('[data-reset]').onclick = () => { ctrlReset(); ctrlDraw(); };
  ctrlRoot.querySelector('[data-close]').onclick = () => ctrlClose();
}
// accende controller e lista con quello che è premuto (tastiera o gamepad)
function ctrlLive() {
  if (!ctrlRoot) return;
  const nPads = (CTRL.pads || []).length;
  if (nPads !== ctrlLive.n) { ctrlLive.n = nPads; if (!CTRL.capture) ctrlDraw(); }
  for (const A of CTRL_ACTIONS) {
    const on = !!CTRL.live[A.id] || !!(CTRL.padLive[A.p - 1] || {})[A.id];
    ctrlRoot.querySelectorAll(`[data-act="${A.id}"], [data-dot="${A.id}"]`).forEach(el => el.classList.toggle('on', on));
  }
  requestAnimationFrame(ctrlLive);
}

class ControlsScene extends Base {
  constructor() { super('Controls'); }
  create() {
    camSetup(this); UI.bg(this);
    this.add.text(160, 112, 'COMANDI', UI.f(9, '#ffd23a', true)).setOrigin(0.5);
    openControls(() => this.scene.start('MainMenu'));
  }
}
