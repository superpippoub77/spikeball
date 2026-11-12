// ============================================================
//  MOUSE in tutto il gioco (computer con il mouse; sul telefono restano i gesti di touch.js)
//  - clic sinistro = Z (conferma / colpo) dove non c'è una voce da scegliere; clic destro = ESC (indietro);
//    clic con la rotellina = INVIO (START); rotellina = ↑ / ↓ (con MAIUSC ← / →)
//  - passando sopra le voci di un menu si sceglie la voce, il clic la conferma:
//    schede e righe del menu principale, bandiere della scelta squadre, righe delle impostazioni (il clic su una
//    riga con un valore lo cambia, come →), elenchi delle altre schermate (opts, optT, rows, rowT).
//  I tasti arrivano al gioco come quelli dei comandi touch (touchKey in touch.js).
// ============================================================
(function () {
  if (typeof TOUCH_KEYS !== 'undefined') Object.assign(TOUCH_KEYS, { c: 67, n: 78, b: 66 });
  const press = key => { touchKey('keydown', key); setTimeout(() => touchKey('keyup', key), 70); };
  const M = { x: -1, y: -1, moved: false };
  const ready = setInterval(() => {
    const g = window.__game; if (!g || !g.canvas) return;
    clearInterval(ready);
    const cv = g.canvas;
    const toGame = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * CFG.W, (e.clientY - r.top) / r.height * CFG.H]; };
    cv.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; [M.x, M.y] = toGame(e); M.moved = true; });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerup', e => {
      if (e.pointerType !== 'mouse') return;
      [M.x, M.y] = toGame(e);
      if (e.button === 2) { press('Escape'); return; }
      if (e.button === 1) { press('Enter'); return; }
      if (e.button !== 0) return;
      const sc = topScene(g); if (!sc) return;
      // voce già cliccabile (bandiera della lingua, righe SQUADRE / GRAFICA...): ci pensa lei
      if (sc.input && sc.input.hitTestPointer(g.input.activePointer).length) return;
      const t = findTarget(sc, M.x, M.y);
      if (!t) { press('z'); return; }
      // voci con un'azione: scelta e azione; bandiere: il primo clic sceglie, il secondo conferma
      if (t.act) { t.pick(); t.act(); } else { const was = t.same(); t.pick(); if (was) press('z'); }
    });
    let wheelT = 0;
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      const now = performance.now(); if (now - wheelT < 110) return; wheelT = now;
      const h = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY), d = h ? (e.deltaX || e.deltaY) : e.deltaY;
      if (!d) return;
      press(h ? (d > 0 ? 'ArrowRight' : 'ArrowLeft') : (d > 0 ? 'ArrowDown' : 'ArrowUp'));
    }, { passive: false });
    // passando sopra una voce la si sceglie (solo quando il mouse si muove: la tastiera resta libera)
    g.events.on('poststep', () => {
      if (!M.moved) return; M.moved = false;
      const sc = topScene(g); if (!sc) return;
      const t = findTarget(sc, M.x, M.y);
      if (t && !t.same()) t.pick(true);
      cv.style.cursor = t ? 'pointer' : '';
    });
  }, 300);

  function topScene(g) {
    const list = g.scene.getScenes(true).filter(s => s.scene.key !== 'Match' && !s.gone);
    return list[list.length - 1] || null;
  }
  const inBox = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const textBox = (o, pad = 2) => { const b = o.getBounds(); return [b.x - pad, b.y - pad, b.right + pad, b.bottom + pad]; };
  const redraw = sc => { if (sc.refresh) sc.refresh(); else if (sc.draw) sc.draw(); };
  const blip = () => { try { SFX.blip(); } catch (e) { /* */ } };
  // voce sotto il mouse: { pick(hover), act(), same() }
  function findTarget(sc, x, y) {
    const key = sc.scene.key;
    if (key === 'MainMenu') return mainMenu(sc, x, y);
    if (key === 'TeamSelect') return teamSelect(sc, x, y);
    // elenchi di testi con la voce scelta in sc.sel
    const lists = [sc.optT, Array.isArray(sc.opts) && sc.opts[0] && sc.opts[0].getBounds ? sc.opts : null];
    for (const L of lists) {
      if (!L) continue;
      const items = L.slice();
      if (L === sc.opts && sc.spdTxt) items.push(sc.spdTxt);   // pratica: riga VELOCITÀ (lento.js)
      for (let i = 0; i < items.length; i++) {
        const o = items[i]; if (!o || !o.visible || !o.text) continue;
        const [x0, y0, x1, y1] = textBox(o, 3);
        if (inBox(x, y, x0, y0, x1, y1)) return item(sc, i, () => press(o === sc.spdTxt ? 'ArrowRight' : 'z'));
      }
    }
    // righe con etichetta e valore (impostazioni): il clic su una riga con un valore lo cambia, sulle altre va avanti
    const rows = sc.rowT || (Array.isArray(sc.rows) && sc.rows[0] && (sc.rows[0].getBounds || (Array.isArray(sc.rows[0]) && sc.rows[0][0] && sc.rows[0][0].getBounds)) ? sc.rows : null);
    if (rows) for (let i = 0; i < rows.length; i++) {
      const r = Array.isArray(rows[i]) ? rows[i] : [rows[i]];
      if (!r[0] || !r[0].visible) continue;
      const b0 = textBox(r[0], 1), b1 = r[1] && r[1].visible ? textBox(r[1], 1) : b0;
      const x0 = Math.min(b0[0], b1[0]), y0 = Math.min(b0[1], b1[1]) - 1, x1 = Math.max(b0[2], b1[2], sc.rowT ? CFG.W - 4 : 0), y1 = Math.max(b0[3], b1[3]) + 1;
      if (inBox(x, y, x0, y0, x1, y1)) {
        const v = r[1] && sc.rowT ? String(r[1].text || '') : null;
        return item(sc, i, () => press(v !== null && v !== '' && !/►/.test(v) ? 'ArrowRight' : 'z'));
      }
    }
    return null;
  }
  function item(sc, i, act) {
    return { same: () => sc.sel === i, pick: hover => { if (sc.sel !== i) { sc.sel = i; redraw(sc); if (hover) blip(); } }, act };
  }
  // menu principale: schede, lingua, GIOCA ONLINE, righe SQUADRE / GRAFICA / COMANDI
  function mainMenu(sc, x, y) {
    for (let i = 0; i < MENU_POS.length; i++) {
      const [cx, cy] = MENU_POS[i];
      if (inBox(x, y, cx - 29, cy - 25, cx + 29, cy + 25)) return item(sc, i, () => press('z'));
    }
    if (inBox(x, y, 60, 54, 160, 68)) return { same: () => sc.sel === -1, pick: () => { if (sc.sel !== -1) { sc.sel = -1; sc.refresh(); } }, act: () => sc.cycleLang(x < 90 ? -1 : 1) };
    if (inBox(x, y, 170, 54, 260, 68)) return { same: () => sc.sel === MENU_ONLINE, pick: () => { if (sc.sel !== MENU_ONLINE) { sc.sel = MENU_ONLINE; sc.refresh(); } }, act: () => sc.openOnline() };
    const row = (y0, id, act) => inBox(x, y, 120, y0, 212, y0 + 9) ? { same: () => sc.sel === id, pick: () => { if (sc.sel !== id) { sc.sel = id; sc.refresh(); } }, act } : null;
    return row(184, MENU_SEX, () => sc.toggleSex())
      || row(194, MENU_GFX, () => { if (/^fps/.test(MENU_GFX_LIST[sc.gfxSel])) sc.openFps(); else sc.cycleGfx(x < 140 ? -1 : 1); })
      || row(204, MENU_CTRL, () => sc.openCtrl());
  }
  // scelta delle squadre: bandiere del gruppo; clic sulla bandiera già scelta = conferma
  function teamSelect(sc, x, y) {
    const s = sc.side, ox = s ? 166 : 6, n = GROUPS[sc.grp[s]].length;
    for (let i = 0; i < n; i++) {
      const fx = ox + 9 + (i % 6) * 23, fy = 95 + Math.floor(i / 6) * 18;
      if (inBox(x, y, fx, fy, fx + 20, fy + 14)) {
        return { same: () => sc.idx[s] === i, pick: hover => { if (sc.idx[s] !== i) { sc.idx[s] = i; sc.draw(); if (hover) blip(); } }, act: null };
      }
    }
    if (inBox(x, y, ox, 76, ox + 110, 90)) return { same: () => true, pick: () => {}, act: () => press('e') };   // gruppo successivo
    if (inBox(x, y, ox + 112, 76, ox + 148, 90)) return { same: () => true, pick: () => {}, act: () => press('c') };   // IA / tastiera
    if (inBox(x, y, ox, 8, ox + 148, 70)) return { same: () => true, pick: () => {}, act: () => press('z') };   // bandiera grande: conferma
    return null;
  }
})();
