// ============================================================
//  TELEFONO E TABLET: joystick virtuale, pulsanti e schermo intero
//  Il gioco legge solo la tastiera: il joystick e i pulsanti mandano gli stessi tasti (frecce, Z, INVIO, ESC...),
//  così funzionano in tutti i menu e in partita senza cambiare le schermate.
//   - joystick "mobile" a sinistra: compare dove appoggi il pollice (8 direzioni)
//   - a destra: A (= Z, colpo / conferma), START (= INVIO), ESC (indietro), PAUSA; ⋯ apre gli altri tasti
//     (X cambi, Q/E pagine, F formazione, T comandi, M audio, K CRT, H grafica)
//   - ⛶ schermo intero (e orientamento orizzontale dove il browser lo permette); al primo tocco parte da solo
//   - in verticale: invito a ruotare il telefono
//   - gesti sullo schermo di gioco (fuori da joystick e pulsanti): tocco = A (Z), strisciata = freccia; così i menu
//     si usano anche solo toccando e strisciando
//   - 🎮 mostra / nasconde joystick e pulsanti (si ricorda); con una tastiera vera si nascondono da soli e tornano
//     al primo tocco. Sui tablet joystick e pulsanti sono più grandi (in proporzione allo schermo)
//  Su iPhone il browser non permette lo schermo intero: "Condividi > Aggiungi alla schermata Home" apre il gioco
//  a tutto schermo (manifest.json e meta apple-mobile-web-app-capable in index.html).
// ============================================================
const TOUCH = {
  on: (() => { try { return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0; } catch (e) { return false; } })(),
  held: new Set(),
};
// tasto finto: stesso evento della tastiera (Phaser legge keyCode, il resto del gioco key)
const TOUCH_KEYS = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, z: 90, Enter: 13, Escape: 27, p: 80, x: 88, q: 81, e: 69, f: 70, t: 84, m: 77, k: 75, h: 72, r: 82 };
function touchKey(type, key) {
  const kc = TOUCH_KEYS[key], ev = new KeyboardEvent(type, { key, code: key.length === 1 ? 'Key' + key.toUpperCase() : key, bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'keyCode', { get: () => kc }); Object.defineProperty(ev, 'which', { get: () => kc });
  window.dispatchEvent(ev);
}
function touchHold(key, on) {
  if (on === TOUCH.held.has(key)) return;
  if (on) TOUCH.held.add(key); else TOUCH.held.delete(key);
  touchKey(on ? 'keydown' : 'keyup', key);
}
// schermo intero e orizzontale (Android, iPad); su iPhone non c'è: resta la schermata Home
function touchFullscreen() {
  const d = document, el = d.documentElement;
  if (d.fullscreenElement || d.webkitFullscreenElement) return;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return;
  try {
    const p = req.call(el, { navigationUI: 'hide' });
    const lock = () => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* */ } };
    if (p && p.then) p.then(lock).catch(() => {}); else lock();
  } catch (e) { /* */ }
}

(function touchInit() {
  if (!TOUCH.on) return;
  document.body.classList.add('touch');
  const css = document.createElement('style');
  css.textContent = `
  body.touch { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
  #tpad { position: fixed; inset: 0; z-index: 30; pointer-events: none; font-family: "Arial Black", Arial, sans-serif; }
  #tpad .zone { position: absolute; left: 0; top: 0; bottom: 0; width: 46%; pointer-events: auto; touch-action: none; }
  #tpad .base, #tpad .knob { position: absolute; border-radius: 50%; pointer-events: none; transform: translate(-50%, -50%); }
  body.touch.nopad #tpad > :not(.keep) { display: none !important; }
  /* misure dei pulsanti in proporzione allo schermo (telefono e tablet) e posizioni calcolate da queste */
  #tpad { --sz: clamp(44px, 7.5vmin, 64px); --az: clamp(78px, 14vmin, 130px); --gap: 10px; --r0: max(14px, env(safe-area-inset-right)); }
  #tpad .p-a { right: var(--r0); bottom: 22px; }
  #tpad .p-start { right: calc(var(--r0) + var(--az) + var(--gap)); bottom: 14px; }
  #tpad .p-more { right: calc(var(--r0) + var(--az) + var(--gap)); bottom: calc(14px + var(--sz) + var(--gap)); font-size: 18px; }
  #tpad .p-esc { right: var(--r0); top: 12px; }
  #tpad .p-pause { right: calc(var(--r0) + var(--sz) + var(--gap)); top: 12px; font-size: 14px; }
  #tpad .p-fs { right: calc(var(--r0) + 2 * (var(--sz) + var(--gap))); top: 12px; font-size: 18px; }
  #tpad .p-pad { right: calc(var(--r0) + 3 * (var(--sz) + var(--gap))); top: 12px; font-size: 18px; }
  #tpad .base { width: clamp(110px, 18vmin, 170px); height: clamp(110px, 18vmin, 170px); background: rgba(255,255,255,0.10); border: 2px solid rgba(255,255,255,0.35); }
  #tpad .knob { width: clamp(50px, 8vmin, 78px); height: clamp(50px, 8vmin, 78px); background: rgba(255,210,58,0.55); border: 2px solid rgba(255,255,255,0.7); }
  #tpad .btn { position: absolute; pointer-events: auto; touch-action: none; display: flex; align-items: center; justify-content: center;
    border-radius: 50%; color: #fff; background: rgba(20,60,160,0.45); border: 2px solid rgba(255,255,255,0.55); font-size: 13px; text-shadow: 0 1px 2px #000; }
  #tpad .btn.on { background: rgba(255,210,58,0.75); color: #1a1a1a; }
  #tpad .a { width: var(--az); height: var(--az); font-size: 30px; background: rgba(200,30,40,0.55); }
  #tpad .sm { width: var(--sz); height: var(--sz); font-size: 10px; }
  #tpad .more { display: none; position: absolute; right: calc(var(--r0) + var(--az) + var(--gap)); bottom: calc(14px + 2 * (var(--sz) + var(--gap))); pointer-events: auto;
    flex-wrap: wrap; gap: 6px; width: 170px; justify-content: flex-end; }
  #tpad .more.open { display: flex; }
  #tpad .more .btn { position: static; width: 40px; height: 40px; font-size: 13px; border-radius: 10px; }
  #tturn { position: fixed; inset: 0; z-index: 70; display: none; background: #050a1e; color: #ffd23a; align-items: center; justify-content: center;
    flex-direction: column; gap: 14px; font: 18px "Arial Black", Arial, sans-serif; text-align: center; padding: 20px; }
  #tturn .ph { width: 46px; height: 76px; border: 4px solid #ffd23a; border-radius: 9px; animation: tturn 1.6s ease-in-out infinite; }
  @keyframes tturn { 0%, 30% { transform: rotate(0); } 60%, 100% { transform: rotate(-90deg); } }
  @media (orientation: portrait) { body.touch #tturn { display: flex; } }`;
  document.head.appendChild(css);
  const tr = s => (typeof T === 'function' ? T(s) : s);

  const pad = document.createElement('div'); pad.id = 'tpad';
  const zone = document.createElement('div'); zone.className = 'zone';
  const base = document.createElement('div'); base.className = 'base'; base.style.display = 'none';
  const knob = document.createElement('div'); knob.className = 'knob'; knob.style.display = 'none';
  pad.append(zone, base, knob);
  const btn = (cls, label, key, style) => {
    const b = document.createElement('div'); b.className = 'btn ' + cls; b.textContent = label; if (style) Object.assign(b.style, style);
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); b.classList.add('on'); touchHold(key, true); });
    const up = e => { e.preventDefault(); b.classList.remove('on'); touchHold(key, false); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    pad.appendChild(b); return b;
  };
  btn('a p-a', 'A', 'z');
  btn('sm p-start', 'START', 'Enter');
  btn('sm p-esc', 'ESC', 'Escape');
  btn('sm p-pause', 'II', 'p');
  // altri tasti (cambi, pagine, formazione...)
  const more = document.createElement('div'); more.className = 'more'; pad.appendChild(more);
  for (const k of ['x', 'r', 'q', 'e', 'f', 't', 'm', 'k', 'h']) {   // R: time-out nel beach
    const b = btn('', k.toUpperCase(), k); more.appendChild(b);
  }
  const mb = document.createElement('div'); mb.className = 'btn sm p-more'; mb.textContent = '⋯';
  mb.addEventListener('pointerdown', e => { e.preventDefault(); more.classList.toggle('open'); });
  pad.appendChild(mb);
  const fs = document.createElement('div'); fs.className = 'btn sm p-fs'; fs.textContent = '⛶';
  fs.addEventListener('pointerdown', e => { e.preventDefault(); touchFullscreen(); });
  pad.appendChild(fs);
  // mostra / nascondi joystick e pulsanti (resta sempre visibile)
  const pv = document.createElement('div'); pv.className = 'btn sm keep p-pad'; pv.textContent = '🎮';
  const setPad = on => { document.body.classList.toggle('nopad', !on); try { localStorage.setItem('sf91_pad', on ? '1' : '0'); } catch (e) { /* */ } };
  pv.addEventListener('pointerdown', e => { e.preventDefault(); setPad(document.body.classList.contains('nopad')); });
  pad.appendChild(pv);
  try { if (localStorage.getItem('sf91_pad') === '0') document.body.classList.add('nopad'); } catch (e) { /* */ }
  document.body.appendChild(pad);
  // tastiera vera (tablet con tastiera, computer con schermo touch): i comandi a schermo si nascondono da soli
  let kbdHidden = false;
  window.addEventListener('keydown', e => { if (e.isTrusted && !document.body.classList.contains('nopad')) { kbdHidden = true; document.body.classList.add('nopad'); } });

  // gesti sullo schermo di gioco: tocco breve = A (Z), strisciata = una freccia
  const press = key => { touchHold(key, true); setTimeout(() => touchHold(key, false), 90); };
  let gs = null;
  window.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' || e.target.closest('#tpad .btn, #tpad .zone, #tpad .more, #editor, #photoCap, #tturn')) return;
    if (kbdHidden) { kbdHidden = false; document.body.classList.remove('nopad'); }
    gs = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
  });
  window.addEventListener('pointerup', e => {
    if (!gs || e.pointerId !== gs.id) return;
    const dx = e.clientX - gs.x, dy = e.clientY - gs.y, d = Math.hypot(dx, dy), dt = performance.now() - gs.t; gs = null;
    if (d < 14 && dt < 450) {
      // sopra un elemento che risponde già al tocco (bandiera della lingua, righe SQUADRE e GRAFICA...) niente A in più
      const g = window.__game;
      const hit = g && g.scene.getScenes(true).some(sc => sc.input && g.input.pointers.some(pt => sc.input.hitTestPointer(pt).length));
      if (!hit) press('z');
      return;
    }
    if (d >= 30) press(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp'));
  });
  window.addEventListener('pointercancel', () => { gs = null; });

  // joystick: compare dove si appoggia il pollice; direzione a 8 settori con una piccola zona morta
  let jid = null, ox = 0, oy = 0;
  const MAXR = 50, DEAD = 22;   // zona morta ampia: con il pollice appoggiato non parte una direzione (es. battuta in salto)
  const dirs = (dx, dy) => {
    const out = new Set(), d = Math.hypot(dx, dy);
    if (d < DEAD) return out;
    const a = Math.atan2(dy, dx) * 180 / Math.PI;   // 0 = destra, 90 = giù
    if (a > -67.5 && a < 67.5) out.add('ArrowRight');
    if (a > 112.5 || a < -112.5) out.add('ArrowLeft');
    if (a > 22.5 && a < 157.5) out.add('ArrowDown');
    if (a < -22.5 && a > -157.5) out.add('ArrowUp');
    return out;
  };
  const apply = set => { for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) touchHold(k, set.has(k)); };
  const show = (x, y, kx, ky, rest) => {
    base.style.display = knob.style.display = 'block'; base.style.opacity = knob.style.opacity = rest ? 0.45 : 1;
    base.style.left = x + 'px'; base.style.top = y + 'px'; knob.style.left = kx + 'px'; knob.style.top = ky + 'px';
  };
  // a riposo il joystick si vede (più tenue) in basso a sinistra: si capisce dove appoggiare il pollice
  const rest = () => { const x = Math.max(90, 26 + 60), y = innerHeight - 100; show(x, y, x, y, true); };
  rest(); addEventListener('resize', rest);
  zone.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (jid !== null) return;
    jid = e.pointerId; zone.setPointerCapture && zone.setPointerCapture(e.pointerId);
    ox = e.clientX; oy = e.clientY; show(ox, oy, ox, oy);
  });
  zone.addEventListener('pointermove', e => {
    if (e.pointerId !== jid) return;
    e.preventDefault();
    let dx = e.clientX - ox, dy = e.clientY - oy; const d = Math.hypot(dx, dy);
    if (d > MAXR) {   // il joystick segue il pollice se esce dal cerchio
      ox += dx * (1 - MAXR / d); oy += dy * (1 - MAXR / d); dx = e.clientX - ox; dy = e.clientY - oy;
    }
    show(ox, oy, ox + dx, oy + dy); apply(dirs(dx, dy));
  });
  const end = e => { if (e.pointerId !== jid) return; jid = null; rest(); apply(new Set()); };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);

  // invito a ruotare il telefono
  const turn = document.createElement('div'); turn.id = 'tturn';
  turn.innerHTML = '<div class="ph"></div><div class="t1"></div><div class="t2" style="font:13px Arial,sans-serif;color:#9ab8f0"></div>';
  const words = () => { turn.querySelector('.t1').textContent = tr('RUOTA IL TELEFONO IN ORIZZONTALE'); turn.querySelector('.t2').textContent = tr('tocca per giocare a schermo intero'); };
  words(); setInterval(words, 2000);
  turn.addEventListener('pointerdown', () => touchFullscreen());
  document.body.appendChild(turn);

  // primo tocco: audio e schermo intero
  let first = true;
  window.addEventListener('pointerdown', () => {
    try { SFX.init(); } catch (e) { /* */ }
    if (first) { first = false; touchFullscreen(); }
  }, true);
  // l'editor e le schede HTML stanno sopra (z-index più alto): da lì si torna senza tasti rimasti premuti
  window.addEventListener('blur', () => { for (const k of [...TOUCH.held]) touchHold(k, false); });
})();
