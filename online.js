// ============================================================
//  PARTITE ONLINE tra due giocatori (WebRTC, da browser a browser)
//  - Collegamento: chi crea la partita riceve un CODICE (api/online.php scambia solo i dati di connessione);
//    l'altro lo scrive in ENTRA. Poi il gioco passa direttamente tra i due browser (canale dati WebRTC).
//  - Sala d'attesa: ognuno sceglie la sua nazionale; chi ha creato la partita sceglie giocatori in campo, punti
//    del set e campo, poi INIZIA.
//  - Partita: chi ha creato la partita (host) fa girare tutto il gioco come in una partita a 2 giocatori: lui è il
//    giocatore 1 (campo sinistro), l'avversario il giocatore 2 (campo destro) con i comandi che arrivano dalla rete.
//    A ogni fotogramma l'host manda le differenze dello stato (giocatori, pallone, punteggio, scritte) e gli
//    effetti (suoni, sabbia, scritte volanti); l'altro (guest) manda i suoi tasti e disegna lo stato ricevuto,
//    ognuno nella sua grafica (ARCADE, PIXEL FOTO, HD o 3D). Così le due partite non possono andare diversamente.
//  - Online niente cambi e time-out; se l'avversario si scollega, la sua squadra la gioca il computer.
//  Alcune reti (firewall aziendali, alcune reti mobili) non permettono il collegamento diretto: serve un server
//  TURN, non incluso.
// ============================================================
const ONLINE = { pc: null, ch: null, role: null, connected: false, remote: { l: false, r: false, u: false, d: false, press: 0 },
  queue: [], ev: [], recording: false, myTeam: null, peerTeam: null, cfg: { players: 0, rules: 0, arena: 0 }, ui: null };
const ON_API = 'api/online.php';
const ON_ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }];
const onT = s => (typeof T === 'function' ? T(s) : s);

function onSend(o) { const ch = ONLINE.ch; if (ch && ch.readyState === 'open') try { ch.send(JSON.stringify(o)); } catch (e) { /* */ } }
function onToast(msg) {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:80;background:rgba(10,30,74,0.95);color:#ffd23a;border:1px solid #3a7ae0;border-radius:8px;padding:8px 14px;font:bold 14px Arial';
  d.textContent = onT(msg); document.body.appendChild(d); setTimeout(() => d.remove(), 4000);
}
async function onApi(a, c, body) {
  const r = await fetch(`${ON_API}?a=${a}${c ? '&c=' + encodeURIComponent(c) : ''}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.errore || 'errore ' + r.status);
  return j;
}
// raccolta completa dei candidati di rete (niente "trickle": si scambia una sola volta)
function onIce(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise(ok => { const t = setTimeout(ok, 4000); pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); ok(); } }); });
}
// browser chiuso o rete persa: lo stato della connessione se ne accorge in pochi secondi (il canale dati molto dopo)
function onWatch(pc) {
  pc.onconnectionstatechange = () => {
    const st = pc.connectionState;
    if (st === 'failed' || st === 'closed') { if (ONLINE.pc === pc) onLost(); }
    else if (st === 'disconnected') setTimeout(() => { if (ONLINE.pc === pc && pc.connectionState !== 'connected') onLost(); }, 3000);
  };
}
function onChannel(ch) {
  ONLINE.ch = ch;
  ch.onopen = () => { ONLINE.connected = true; ONLINE.lastRx = performance.now(); onUi(); };
  ch.onclose = () => onLost();
  ch.onmessage = e => { ONLINE.lastRx = performance.now(); let m; try { m = JSON.parse(e.data); } catch (x) { return; } onMessage(m); };
}
function onClose() {
  ONLINE.connected = false; ONLINE.recording = false;
  try { ONLINE.ch && ONLINE.ch.close(); } catch (e) { /* */ }
  try { ONLINE.pc && ONLINE.pc.close(); } catch (e) { /* */ }
  ONLINE.ch = ONLINE.pc = null; ONLINE.role = null; ONLINE.peerTeam = null; ONLINE.queue = [];
}
// connessione persa: in partita l'host continua contro il computer, il guest torna al menu
function onLost() {
  if (!ONLINE.role) return;
  const g = window.__game, m = g && g.scene.isActive('Match') && g.scene.getScene('Match');
  const role = ONLINE.role; onClose();
  if (m && m.online === 'host') { m.online = null; for (const t of m.teams) if (t.human === 2) t.human = 0; m.announce(onT('AVVERSARIO SCOLLEGATO: GIOCA IL COMPUTER')); onToast('AVVERSARIO SCOLLEGATO: GIOCA IL COMPUTER'); return; }
  if (m && m.online === 'guest') { m.online = null; m.scene.start('MainMenu'); onToast('CONNESSIONE PERSA'); return; }
  if (ONLINE.ui) onUi(); else if (role) onToast('CONNESSIONE PERSA');
}
async function onHost() {
  onClose(); ONLINE.role = 'host'; ONLINE.status = 'CREO LA PARTITA...'; onUi();
  try {
    const pc = ONLINE.pc = new RTCPeerConnection({ iceServers: ON_ICE }); onWatch(pc);
    onChannel(pc.createDataChannel('game', { ordered: true }));
    await pc.setLocalDescription(await pc.createOffer()); await onIce(pc);
    const { code } = await onApi('create', null, { offer: pc.localDescription });
    ONLINE.code = code; ONLINE.status = 'IN ATTESA DELL\'AVVERSARIO...'; onUi();
    for (let i = 0; i < 600 && ONLINE.pc === pc && !ONLINE.connected; i++) {   // fino a 15 minuti
      const r = await onApi('answer', code);
      if (r.answer) { await pc.setRemoteDescription(r.answer); ONLINE.status = 'COLLEGAMENTO...'; onUi(); break; }
      await new Promise(ok => setTimeout(ok, 1500));
    }
  } catch (e) { ONLINE.status = 'ERRORE: ' + e.message; ONLINE.role = null; onUi(); }
}
async function onJoin(code) {
  onClose(); ONLINE.role = 'guest'; ONLINE.code = code; ONLINE.status = 'MI COLLEGO...'; onUi();
  try {
    const { offer } = await onApi('offer', code);
    const pc = ONLINE.pc = new RTCPeerConnection({ iceServers: ON_ICE }); onWatch(pc);
    pc.ondatachannel = e => onChannel(e.channel);
    await pc.setRemoteDescription(offer);
    await pc.setLocalDescription(await pc.createAnswer()); await onIce(pc);
    await onApi('answer', code, { answer: pc.localDescription });
    ONLINE.status = 'COLLEGAMENTO...'; onUi();
    setTimeout(() => { if (ONLINE.pc === pc && !ONLINE.connected) { ONLINE.status = 'COLLEGAMENTO NON RIUSCITO (rete che blocca le connessioni dirette)'; ONLINE.role = null; onUi(); } }, 20000);
  } catch (e) { ONLINE.status = 'ERRORE: ' + e.message; ONLINE.role = null; onUi(); }
}

// battito: un messaggio al secondo; 6 secondi senza notizie dall'altro = scollegato
setInterval(() => {
  if (!ONLINE.connected) return;
  onSend({ t: 'ping' });
  if (performance.now() - ONLINE.lastRx > 6000) onLost();
}, 1000);

// ---------------- messaggi ----------------
function onMessage(m) {
  const g = window.__game, match = g && g.scene.isActive('Match') ? g.scene.getScene('Match') : null;
  if (m.t === 'team') { ONLINE.peerTeam = m.code; onUi(); }
  else if (m.t === 'cfg') { ONLINE.cfg = m.cfg; onUi(); }
  else if (m.t === 'start' && ONLINE.role === 'guest') {
    onUiClose();
    const scene = g.scene.getScenes(true)[0];
    ONLINE.queue = [];
    scene.scene.start('Match', Object.assign(m.cfg, { onDone: () => {} }));
  } else if (m.t === 'in' && match && match.online === 'host') Object.assign(ONLINE.remote, { l: !!m.l, r: !!m.r, u: !!m.u, d: !!m.d });
  else if (m.t === 'press' && match && match.online === 'host') ONLINE.remote.press = Math.min(2, ONLINE.remote.press + 1);
  else if (m.t === 's' && ONLINE.role === 'guest') ONLINE.queue.push(m);   // anche prima che la partita del guest sia pronta: le differenze successive non ripetono lo stato iniziale
  else if (m.t === 'end' && match && match.online === 'guest') { match.online = null; match.scene.start('MatchStats', m.stats); setTimeout(onClose, 1500); }
  else if (m.t === 'bye') onLost();
}

// ---------------- sala d'attesa (pagina sopra il gioco, come l'editor) ----------------
// solo le nazionali del gioco: le squadre personalizzate esistono solo nel browser di chi le ha create
const onTeams = () => Object.keys(TEAMS).filter(k => { const P = TEAMS[k]; return k[0] !== '_' && P && P.name && !P.club && !P.custom && !P.generated && !P.emblem && !P.flagOf; });
// mentre la pagina è aperta i tasti del gioco (Z, cifre...) non vengono bloccati: servono per scrivere il codice
const onCapture = on => { const k = window.__game && window.__game.input.keyboard; if (k) k.preventDefault = !!on; };
function onUiClose() { if (ONLINE.ui) { ONLINE.ui.remove(); ONLINE.ui = null; onCapture(true); } }
function onUi() {
  const root = ONLINE.ui; if (!root) return;
  const C = ONLINE, teams = onTeams(), host = C.role === 'host';
  const opt = (list, cur) => list.map(([v, l]) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${onT(l)}</option>`).join('');
  const tname = c => c && TEAMS[c] ? TEAMS[c].name : '—';
  let h = `<h1>${onT('GIOCA ONLINE')}</h1>`;
  if (!C.connected) {
    h += `<p class="muted">${onT('Uno crea la partita e comunica il CODICE all\'altro, che lo scrive in ENTRA. Si gioca da browser a browser: ognuno vede la partita nella sua grafica.')}</p>
      <div class="box"><button data-a="host">${onT('CREA PARTITA')}</button>
      ${C.role === 'host' && C.code ? `<div class="code">${C.code}</div><div class="muted">${onT('Dai questo codice al tuo avversario')}</div>` : ''}</div>
      <div class="box"><input id="onCode" maxlength="5" placeholder="${onT('CODICE')}" value="${C.role === 'guest' ? C.code || '' : ''}" autocomplete="off"><button data-a="join">${onT('ENTRA CON IL CODICE')}</button></div>`;
    if (C.status) h += `<p class="st">${onT(C.status)}</p>`;
  } else {
    if (!C.myTeam || !teams.includes(C.myTeam)) C.myTeam = host ? 'ITA' : 'BRA';
    h += `<p class="st">${onT('COLLEGATI!')} ${host ? onT('Tu giochi a sinistra (giocatore 1).') : onT('Tu giochi a destra.')}</p>
      <div class="box"><label>${onT('LA TUA SQUADRA')} <select id="onTeam">${opt(teams.map(c => [c, TEAMS[c].name]), C.myTeam)}</select></label>
      <div class="muted">${onT('Avversario')}: <b>${tname(C.peerTeam)}</b></div></div>
      <div class="box"><label>${onT('GIOCATORI IN CAMPO')} <select id="onPl"${host ? '' : ' disabled'}>${opt(PLAYER_COUNTS.map((n, i) => [i, n + ' vs ' + n]), C.cfg.players)}</select></label>
      <label>${onT('SET')} <select id="onRu"${host ? '' : ' disabled'}>${opt([[0, 'a 25 punti'], [1, 'a 15 punti']], C.cfg.rules)}</select></label>
      <label>${onT('CAMPO')} <select id="onAr"${host ? '' : ' disabled'}>${opt(ARENAS.map((a, i) => [i, a.name]), C.cfg.arena)}</select></label></div>`;
    h += host ? `<button data-a="start" class="green"${C.peerTeam ? '' : ' disabled'}>${onT('INIZIA LA PARTITA')}</button>${C.peerTeam ? '' : ` <span class="muted">${onT('l\'avversario sta scegliendo la squadra...')}</span>`}`
      : `<p class="muted">${onT('Aspetta che l\'avversario inizi la partita.')}</p>`;
  }
  h += `<div class="bar"><button data-a="close" class="red">${onT('ESCI')}</button></div>`;
  root.innerHTML = h;
  const q = s => root.querySelector(s);
  root.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'host') onHost();
    else if (a === 'join') { const c = (q('#onCode').value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length === 5) onJoin(c); else { C.status = 'IL CODICE HA 5 CARATTERI'; onUi(); } }
    else if (a === 'start') onStartMatch();
    else if (a === 'close') { onSend({ t: 'bye' }); onClose(); onUiClose(); const s = window.__game.scene.getScenes(true)[0]; s.scene.start('MainMenu'); }
  });
  if (C.connected) {
    const sel = q('#onTeam'); sel.onchange = () => { C.myTeam = sel.value; onSend({ t: 'team', code: C.myTeam }); };
    if (!C.sentTeam) { C.sentTeam = true; onSend({ t: 'team', code: C.myTeam }); }
    if (host) for (const [id, k] of [['#onPl', 'players'], ['#onRu', 'rules'], ['#onAr', 'arena']]) {
      const s = q(id); s.onchange = () => { C.cfg[k] = Number(s.value); onSend({ t: 'cfg', cfg: C.cfg }); };
    }
    if (host && !C.sentCfg) { C.sentCfg = true; onSend({ t: 'cfg', cfg: C.cfg }); }
  }
}
function onOpenUi() {
  if (!document.getElementById('onCss')) {
    const css = document.createElement('style'); css.id = 'onCss';
    css.textContent = `#online { position: fixed; inset: 0; z-index: 45; background: #071233; color: #fff; font: 14px Arial, sans-serif; overflow-y: auto; padding: 12px max(14px, env(safe-area-inset-left)); touch-action: pan-y; }
      #online h1 { font: 22px "Arial Black", Arial; color: #ffd23a; margin: 4px 0; } #online .muted { color: #9ab8f0; font-size: 13px; }
      #online .box { background: #0a1e4a; border: 1px solid #3a7ae0; border-radius: 8px; padding: 10px; margin: 10px 0; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
      #online button { background: #1a5ad8; color: #fff; border: 1px solid #7ab0ff; border-radius: 6px; padding: 8px 16px; font: bold 14px Arial; cursor: pointer; }
      #online button.green { background: #1e8a3a; border-color: #7ae09a; } #online button.red { background: #a02028; border-color: #ff8a8a; } #online button:disabled { opacity: 0.4; }
      #online input, #online select { font: bold 16px Arial; padding: 6px 8px; border-radius: 6px; border: 1px solid #7ab0ff; background: #f4f6ff; color: #111; }
      #online input { width: 110px; text-transform: uppercase; letter-spacing: 3px; } #online label { display: flex; gap: 6px; align-items: center; }
      #online .code { font: 34px "Arial Black", Arial; letter-spacing: 8px; color: #ffd23a; background: #05153a; padding: 4px 14px; border-radius: 8px; }
      #online .st { color: #7ad0ff; font-weight: bold; } #online .bar { margin-top: 16px; }`;
    document.head.appendChild(css);
  }
  onCapture(false);
  ONLINE.ui = document.createElement('div'); ONLINE.ui.id = 'online'; document.body.appendChild(ONLINE.ui);
  ONLINE.sentTeam = ONLINE.sentCfg = false;
  onUi();
}
// l'host avvia la partita a 2 giocatori (lui a sinistra) con le scelte della sala d'attesa
function onStartMatch() {
  const C = ONLINE;
  Object.assign(MSET, { left: C.myTeam, right: C.peerTeam, leftAI: false, rightAI: false, players: C.cfg.players, rules: C.cfg.rules, arena: C.cfg.arena });
  onUiClose();
  startModernMatch(window.__game.scene.getScenes(true)[0]);
}

class OnlineScene extends Base {
  constructor() { super('Online'); }
  create() {
    camSetup(this); UI.bg(this);
    this.add.text(160, 112, onT('GIOCA ONLINE'), UI.f(9, '#ffd23a', true)).setOrigin(0.5);
    if (ONLINE.connected) { onOpenUi(); return; }
    onOpenUi();
  }
}

// ---------------- sincronizzazione della partita ----------------
// stato del gioco senza gli oggetti grafici; i giocatori e le squadre diventano riferimenti {$p:[squadra, giocatore]}
const ON_SKIP = new Set(['cfg', 'gone', 'done', 'leaving', '_born', 'camT', 'camV', 'camX', 'camCx', 'camBot', 'zoom', 'acc', 'inp', 'kSub', 'subCount', 'kTo', 'toUsed', 'k1', 'k1b', 'k2', 'kp', 'kesc', 'testBox', 'testTxt',
  'sub', 'timeoutFx', 'sandFx', 'sandGrid', 'sandTex', 'sandImg', 'fatObjs', 'online', 'testOn', 'popups', 'modern', 'rules', 'beach', 'nPl', 'women', '_lastIn', '_onPrev', '_onHud', '_onScore',
  'srvHelp', 'subHint', 'toHint', 'ballSpr', 'ballRef', 'mSb', 'mSbT', 'sbNames', 'sbG', 'shadowG', 'fx', 'hudCam']);
const ON_PSKIP = new Set(['team', 'spr', 'ref']), ON_TSKIP = new Set(['pal', 'players', 'planCache']);
// oggetti che non sono dati semplici (grafica, tasti, timer di Phaser...): restano di ognuno dei due
const onIsGO = v => !!v && typeof v === 'object' && (v instanceof Phaser.GameObjects.GameObject || (Object.getPrototypeOf(v) !== Object.prototype && !Array.isArray(v) && Object.getPrototypeOf(v) !== null));
function onSer(m, v, depth = 0) {
  if (v === null || v === undefined) return null;
  const ty = typeof v;
  if (ty === 'number') return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
  if (ty === 'string' || ty === 'boolean') return v;
  if (ty !== 'object' || onIsGO(v) || ArrayBuffer.isView(v) || depth > 5) return undefined;
  for (let ti = 0; ti < m.teams.length; ti++) {
    if (v === m.teams[ti]) return { $t: ti };
    const pi = m.teams[ti].players.indexOf(v); if (pi >= 0) return { $p: [ti, pi] };
  }
  if (Array.isArray(v)) { if (v.some(onIsGO)) return undefined; return v.map(x => { const s = onSer(m, x, depth + 1); return s === undefined ? null : s; }); }
  const o = {};
  for (const k of Object.keys(v)) { if (onIsGO(v[k])) return undefined; const s = onSer(m, v[k], depth + 1); if (s !== undefined) o[k] = s; }
  return o;
}
function onDes(m, v) {
  if (v === null || typeof v !== 'object') return v;
  if (v.$t !== undefined) return m.teams[v.$t];
  if (v.$p) return m.teams[v.$p[0]] && m.teams[v.$p[0]].players[v.$p[1]];
  if (Array.isArray(v)) return v.map(x => onDes(m, x));
  const o = {}; for (const k in v) o[k] = onDes(m, v[k]); return o;
}
// stato piatto: percorso -> valore (JSON), per mandare solo quello che cambia
function onFlat(m) {
  const out = {};
  for (const k of Object.keys(m)) {
    if (ON_SKIP.has(k) || k === 'teams' || k === 'sys') continue;
    const s = onSer(m, m[k]); if (s !== undefined) out[k] = s;
  }
  m.teams.forEach((t, ti) => {
    for (const k of Object.keys(t)) { if (ON_TSKIP.has(k)) continue; const s = onSer(m, t[k]); if (s !== undefined) out[`teams.${ti}.${k}`] = s; }
    t.players.forEach((p, pi) => { for (const k of Object.keys(p)) { if (ON_PSKIP.has(k)) continue; const s = onSer(m, p[k]); if (s !== undefined) out[`teams.${ti}.players.${pi}.${k}`] = s; } });
  });
  return out;
}
// scritte e immagini fisse sullo schermo (punteggio grande, arbitro, volti, annunci...)
function onHud(m) {
  const out = {};
  for (const k of Object.keys(m)) {
    if (ON_SKIP.has(k)) continue;
    const o = m[k];
    if (!(o instanceof Phaser.GameObjects.Text || o instanceof Phaser.GameObjects.Image || o instanceof Phaser.GameObjects.Rectangle)) continue;
    const alive = !!o.scene;
    const h = { v: alive && o.visible, a: alive ? Math.round(o.alpha * 100) / 100 : 0 };
    if (alive && o instanceof Phaser.GameObjects.Text) { h.t = o.text; h.c = o.style.color; }
    if (alive && o instanceof Phaser.GameObjects.Image) { h.k = o.texture.key; h.f = o.frame.name; h.sx = Math.round(o.scaleX * 100) / 100; h.sy = Math.round(o.scaleY * 100) / 100; }
    if (alive) { h.x = Math.round(o.x * 10) / 10; h.y = Math.round(o.y * 10) / 10; }
    out[k] = h;
  }
  return out;
}
function onDiff(prev, cur) {
  const d = {};
  for (const k in cur) { const s = JSON.stringify(cur[k]); if (prev[k] !== s) { d[k] = cur[k]; prev[k] = s; } }
  return d;
}
function onApply(m, s) {
  for (const path in s.d || {}) {
    const ks = path.split('.'); let o = m;
    for (let i = 0; i < ks.length - 1 && o; i++) o = o[ks[i]];
    if (!o) continue;
    const k = ks[ks.length - 1];
    if (onIsGO(o[k]) || (Array.isArray(o[k]) && o[k].some(onIsGO))) continue;   // oggetti grafici del guest: restano suoi
    o[k] = onDes(m, s.d[path]);
  }
  for (const k in s.h || {}) {
    const o = m[k], h = s.h[k]; if (!o || !o.scene) continue;
    o.setVisible(!!h.v); if (h.a !== undefined) o.setAlpha(h.a);
    if (h.x !== undefined) o.setPosition(h.x, h.y);
    if (h.t !== undefined && o.text !== h.t) o.setText(h.t);
    if (h.c && o.setColor && o.style.color !== h.c) o.setColor(h.c);
    if (h.k && m.textures.exists(h.k) && (o.texture.key !== h.k || o.frame.name !== h.f)) { try { o.setTexture(h.k, h.f); } catch (e) { /* */ } }
    if (h.sx !== undefined) o.setScale(h.sx, h.sy);
  }
  // effetti: suoni, sabbia, scossa, scritte volanti, pannello della battuta
  for (const e of s.e || []) {
    try {
      if (e.s) { if (typeof SFX[e.s] === 'function') SFX[e.s](...(e.a || [])); }
      else if (typeof m[e.m] === 'function') m[e.m](...onDes(m, e.a || []));
    } catch (x) { /* */ }
  }
  const sc = m.teams.map(t => t.score).join('-') + '|' + (m.setsWon || '');
  if (sc !== m._onScore) { m._onScore = sc; try { m.updateScoreboard(); } catch (x) { /* */ } }
}

// effetti da replicare: i metodi della partita e i suoni chiamati mentre l'host gioca
for (const name of ['popup', 'sand', 'shake', 'showServePanel']) {
  const orig = MatchScene.prototype[name];
  MatchScene.prototype[name] = function (...a) {
    if (this.online === 'host' && ONLINE.recording) { const s = onSer(this, a); if (s) ONLINE.ev.push({ m: name, a: s }); }
    return orig.apply(this, a);
  };
}
if (typeof SFX !== 'undefined') for (const k of Object.keys(SFX)) {
  if (typeof SFX[k] !== 'function' || k === 'init') continue;
  const orig = SFX[k];
  SFX[k] = function (...a) { if (ONLINE.recording) ONLINE.ev.push({ s: k, a: a.filter(x => typeof x !== 'object') }); return orig.apply(this, a); };
}

const _createOn = MatchScene.prototype.create;
MatchScene.prototype.create = function (d) {
  this.online = null; this._onPrev = {}; this._onHud = {}; this._onScore = null; this._lastIn = null; ONLINE.recording = false; ONLINE.ev = [];
  _createOn.apply(this, arguments);
  if (!ONLINE.connected || !ONLINE.role || !d || d.mode !== 'modern') return;
  this.online = ONLINE.role;
  if (this.online === 'host') {
    ONLINE.remote = { l: false, r: false, u: false, d: false, press: 0 }; ONLINE.ev = []; ONLINE.recording = true;
    const cfg = Object.assign({}, d); delete cfg.onDone;
    onSend({ t: 'start', cfg });
    const od = d.onDone;
    this.cfg.onDone = m => {
      ONLINE.recording = false;
      onSend({ t: 'end', stats: { teams: m.teams.map(t => ({ code: t.code, score: t.score, players: t.players.map(p => ({ name: p.name, ni: p.ni, idx: p.idx, pos: p.pos })), stats: t.pstats })), winner: m.winner.id } });
      setTimeout(onClose, 1500);
      od(m);
    };
  }
};
// online niente cambi e time-out (pannelli e pause solo da una parte)
const _canSubOn = MatchScene.prototype.canSub;
MatchScene.prototype.canSub = function () { return !this.online && _canSubOn.apply(this, arguments); };
// host: il giocatore 2 sono i tasti che arrivano dalla rete
const _pollOn = MatchScene.prototype.pollInput;
MatchScene.prototype.pollInput = function () {
  _pollOn.apply(this, arguments);
  if (this.online !== 'host') return;
  const s = this.inp[2], R = ONLINE.remote;
  s.l = R.l; s.r = R.r; s.u = R.u; s.d = R.d; s.a = false;
  if (R.press > 0) { R.press--; if (this.time.now - this._born > 400) s.a = true; }
};
const _updateOn = MatchScene.prototype.update;
MatchScene.prototype.update = function (time, delta) {
  if (this.online === 'guest') return onGuestUpdate(this, delta);
  _updateOn.apply(this, arguments);
  if (this.online === 'host' && ONLINE.connected) {
    const d = onDiff(this._onPrev, onFlat(this)), h = onDiff(this._onHud, onHud(this)), e = ONLINE.ev.splice(0);
    if (Object.keys(d).length || Object.keys(h).length || e.length) onSend({ t: 's', d, h, e });
  }
};
// guest: manda i suoi tasti (giocatore 1 sul suo computer), applica lo stato ricevuto e disegna
function onGuestUpdate(m, delta) {
  const J = Phaser.Input.Keyboard.JustDown, k = m.k1;
  const st = { l: k.l.isDown, r: k.r.isDown, u: k.u.isDown, d: k.d.isDown }, sj = JSON.stringify(st);
  if (sj !== m._lastIn) { m._lastIn = sj; onSend(Object.assign({ t: 'in' }, st)); }
  if (J(k.a) || J(m.k1b.a)) onSend({ t: 'press' });
  if (J(m.kesc)) { onSend({ t: 'bye' }); m.online = null; onClose(); m.scene.start('MainMenu'); return; }
  for (const s of ONLINE.queue.splice(0)) onApply(m, s);
  m.render(delta / 1000);
}
