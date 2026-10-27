// ============================================================
//  TELEFONO E TABLET: joystick virtuale, pulsanti e schermo intero
//  Il gioco legge solo la tastiera: il joystick e i pulsanti mandano gli stessi tasti (frecce, Z, INVIO, ESC...),
//  così funzionano in tutti i menu e in partita senza cambiare le schermate.
//   - joystick "mobile" a sinistra: compare dove appoggi il pollice (8 direzioni)
//   - a destra: A (= Z, colpo / conferma), START (= INVIO), ESC (indietro), PAUSA; ⋯ apre gli altri tasti
//     (X cambi, Q/E pagine, F formazione, T comandi, M audio, K CRT, H grafica)
//   - ⛶ schermo intero (e orientamento orizzontale dove il browser lo permette); al primo tocco parte da solo
//   - in verticale: invito a ruotare il telefono
//  Su iPhone il browser non permette lo schermo intero: "Condividi > Aggiungi alla schermata Home" apre il gioco
//  a tutto schermo (manifest.json e meta apple-mobile-web-app-capable in index.html).
// ============================================================
const TOUCH = {
  on: (() => { try { return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0; } catch (e) { return false; } })(),
  held: new Set(),
};
// tasto finto: stesso evento della tastiera (Phaser legge keyCode, il resto del gioco key)
const TOUCH_KEYS = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, z: 90, Enter: 13, Escape: 27, p: 80, x: 88, q: 81, e: 69, f: 70, t: 84, m: 77, k: 75, h: 72 };
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
  #tpad .base { width: 120px; height: 120px; background: rgba(255,255,255,0.10); border: 2px solid rgba(255,255,255,0.35); }
  #tpad .knob { width: 54px; height: 54px; background: rgba(255,210,58,0.55); border: 2px solid rgba(255,255,255,0.7); }
  #tpad .btn { position: absolute; pointer-events: auto; touch-action: none; display: flex; align-items: center; justify-content: center;
    border-radius: 50%; color: #fff; background: rgba(20,60,160,0.45); border: 2px solid rgba(255,255,255,0.55); font-size: 13px; text-shadow: 0 1px 2px #000; }
  #tpad .btn.on { background: rgba(255,210,58,0.75); color: #1a1a1a; }
  #tpad .a { width: 84px; height: 84px; right: max(22px, env(safe-area-inset-right)); bottom: 34px; font-size: 30px; background: rgba(200,30,40,0.55); }
  #tpad .sm { width: 46px; height: 46px; font-size: 10px; }
  #tpad .more { display: none; position: absolute; right: max(118px, calc(env(safe-area-inset-right) + 96px)); bottom: 128px; pointer-events: auto;
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
  const R = 'max(22px, env(safe-area-inset-right))';
  btn('a', 'A', 'z');
  btn('sm', 'START', 'Enter', { right: 'max(118px, calc(env(safe-area-inset-right) + 96px))', bottom: '24px' });
  btn('sm', 'ESC', 'Escape', { right: R, top: '14px' });
  btn('sm', 'II', 'p', { right: 'max(76px, calc(env(safe-area-inset-right) + 54px))', top: '14px', fontSize: '14px' });
  // altri tasti (cambi, pagine, formazione...)
  const more = document.createElement('div'); more.className = 'more'; pad.appendChild(more);
  for (const k of ['x', 'q', 'e', 'f', 't', 'm', 'k', 'h']) {
    const b = btn('', k.toUpperCase(), k); more.appendChild(b);
  }
  const mb = document.createElement('div'); mb.className = 'btn sm'; mb.textContent = '⋯';
  Object.assign(mb.style, { right: 'max(118px, calc(env(safe-area-inset-right) + 96px))', bottom: '78px', fontSize: '18px' });
  mb.addEventListener('pointerdown', e => { e.preventDefault(); more.classList.toggle('open'); });
  pad.appendChild(mb);
  const fs = document.createElement('div'); fs.className = 'btn sm'; fs.textContent = '⛶';
  Object.assign(fs.style, { right: 'max(130px, calc(env(safe-area-inset-right) + 108px))', top: '14px', fontSize: '18px' });
  fs.addEventListener('pointerdown', e => { e.preventDefault(); touchFullscreen(); });
  pad.appendChild(fs);
  document.body.appendChild(pad);

  // joystick: compare dove si appoggia il pollice; direzione a 8 settori con una piccola zona morta
  let jid = null, ox = 0, oy = 0;
  const MAXR = 50, DEAD = 14;
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
