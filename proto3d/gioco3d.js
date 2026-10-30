// ============================================================
//  SPIKE FEVER 3D - PROTOTIPO IN PRIMA PERSONA (three.js)
//  Tu sei uno schiacciatore dell'Italia (4 contro 4, set a 15) e vedi la partita dai tuoi occhi, come la
//  visuale interna dei giochi di guida. V cambia visuale (occhi / dietro le spalle / televisione).
//  Fisica e logica sono quelle del gioco (config.js: CFG e le formule di PHYS) riportate in metri e in 3D:
//    - x lungo il campo (rete in x = 0, Italia a sinistra), z di lato (campo largo 9 m), h altezza;
//    - stessa gravità del pallone (CFG.G / CFG.PPM = 10 m/s²), stessa corsa (CFG.RUN), stessa velocità di
//      schiacciata (CFG.SPIKE_SPEED), stesse distanze di presa (CFG.REACH, LAT_REACH, DIVE_REACH);
//    - le altezze del gioco (rete 2,6 m, salto di 1,7 m da sala giochi) diventano quelle vere: rete 2,43 m,
//      salto di 0,85 m con gli stessi 0,8 s in aria, colpo a 3,35 m;
//    - stessa sequenza di gioco: ricezione e alzata automatiche quando sei nel punto giusto (cerchio blu),
//      schiacciata con Z quando la palla è ROSSA (rincorsa e stacco automatici), muro con Z, battuta Z + Z.
//  Giocatori: manichini costruiti con forme 3D lisce (niente file di modelli), animati a mano: pronto, corsa,
//  bagher, palleggio, schiacciata, muro, battuta, esultanza.
// ============================================================
import * as THREE from 'three';
import { DATA, loadGameData, campState, campSave, campNext, campRecord, campTable } from './dati3d.js';

// ---------------- costanti (dal gioco) ----------------
const PPM = CFG.PPM;
// BEACH (?beach=1, tasto B): 2 contro 2 sulla sabbia all'aperto, campo 16 x 8 m, set a 21, corsa più lenta (CFG.SAND_K)
const BEACH = new URLSearchParams(location.search).get('beach') === '1';
const HALF = (BEACH ? CFG.BEACH_HALF : CFG.HALF) / PPM;   // 9 m (8 m nel beach)
const CW = BEACH ? 4 : 4.5;               // metà larghezza del campo
const NPL = BEACH ? 2 : 4;                // giocatori per squadra
// FEMMINILE (?women=1, tasto F; dal menu segue la riga SQUADRE MASCHILI / FEMMINILI): rete 2,24 m, salto e altezze in proporzione
const WOMEN = (() => { const q = new URLSearchParams(location.search).get('women'); if (q !== null) return q === '1'; try { return localStorage.getItem('sf91_women') === '1'; } catch (e) { return false; } })();
const G = CFG.G / PPM;                    // 10 m/s²
const NET = WOMEN ? 2.24 : 2.43;
const RUN = CFG.RUN / PPM * (BEACH ? CFG.SAND_K : 1);   // 4,4 m/s (3,8 sulla sabbia)
const JUMP_T = CFG.JUMP_V / CFG.PG;       // 0,4 s per arrivare in cima al salto (come nel gioco)
const JUMP_H = WOMEN ? 0.62 : 0.85;
const PG = 2 * JUMP_H / (JUMP_T * JUMP_T);
const JUMP_V = PG * JUMP_T;
const REACH_UP = WOMEN ? 2.3 : 2.45;       // mani alzate da fermo
const HIT_H = REACH_UP + JUMP_H + 0.05;   // 3,35 m
const SET_H = WOMEN ? 2.2 : 2.35, PASS_H = 0.8;
const REACH = CFG.REACH / PPM, LAT = CFG.LAT_REACH / PPM, DIVE = CFG.DIVE_REACH / PPM;
const SPIKE_V = CFG.SPIKE_SPEED / PPM;    // 21,5 m/s
const SETTER_D = CFG.SETTER_D / PPM;      // l'alzatore a 1,5 m dalla rete
const SERVE_X = HALF + 1.4;
const BALL_R = 0.105;
const TARGET = BEACH ? 21 : 15;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
// stanchezza (come fatica.js): energia 0-100 per giocatore della rosa; cala a ogni punto e con gli sforzi, chi è in
// panchina recupera; sotto l'80% calano velocità (fino al 18%), salto (7%), precisione e potenza
const FAT = { point: 0.4, bench: 1.4, jump: 0.35, dive: 0.9, run: 0.0045 * PPM, timeout: 6 };
const fatigue = p => clamp((80 - p.team.en[p.ni]) / 80, 0, 1);
function tire(p, v) { const T = p.team; T.en[p.ni] = clamp(T.en[p.ni] - v, 0, 100); }
const MAX_SUBS = 6;

// formule di PHYS (config.js) in 3D: arco con altezza massima e tiro teso a velocità data
function arc3(x0, z0, h0, x1, z1, h1, apex) {
  apex = Math.max(apex, h0 + 0.1, h1 + 0.1);
  const vy = Math.sqrt(2 * G * (apex - h0)), T = vy / G + Math.sqrt(2 * (apex - h1) / G);
  return { vx: (x1 - x0) / T, vz: (z1 - z0) / T, vy, T };
}
function shot3(x0, z0, h0, x1, z1, h1, speed) {
  const d = Math.hypot(x1 - x0, z1 - z0), T = Math.max(0.08, d / speed);
  return { vx: (x1 - x0) / T, vz: (z1 - z0) / T, vy: (h1 - h0 + 0.5 * G * T * T) / T, T };
}
const heightAtX = (b, v, X) => { if (Math.abs(v.vx) < 1e-3) return Infinity; const t = (X - b.x) / v.vx; return t < 0 ? Infinity : b.h + v.vy * t - 0.5 * G * t * t; };
const timeToH = (h, vy, H) => { const d = vy * vy + 2 * G * (h - H); return d < 0 ? null : (vy + Math.sqrt(d)) / G; };
const clears = (b, v, m = 0.15) => { const hn = heightAtX(b, v, 0); return hn === Infinity || hn > NET + m; };

// ---------------- scena ----------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(BEACH ? 0x8ec8f0 : 0x0b1430);
scene.fog = BEACH ? new THREE.Fog(0xcfe6f5, 70, 190) : new THREE.Fog(0x0b1430, 30, 75);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.06, 200);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

scene.add(new THREE.HemisphereLight(BEACH ? 0xcfe8ff : 0xdfe8ff, BEACH ? 0xc8a870 : 0x3a2a20, BEACH ? 1.2 : 0.9));
const sun = new THREE.DirectionalLight(BEACH ? 0xfff2d8 : 0xffffff, BEACH ? 2.8 : 2.2);
sun.position.set(-6, 22, 9); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 9, bottom: -9, near: 1, far: 50 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xffe8c8, 0.6); fill.position.set(8, 12, -10); scene.add(fill);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// beach: sabbia con increspature e impronte, righe blu (nastro), mare, palme e un piccolo spalto
let SAND = null;   // manto di sabbia deformabile (solo beach), vedi più sotto
if (BEACH) {
  const sandTex = (w, h, rep) => {
    const t = canvasTex(w, h, (c) => {
      c.fillStyle = '#e6cc94'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < w * h / 40; i++) { const v = Math.random(); c.fillStyle = v < 0.5 ? `rgba(255,248,225,${rnd(0.1, 0.35)})` : `rgba(150,110,60,${rnd(0.06, 0.2)})`; c.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), rnd(1, 3)); }
      for (let i = 0; i < 160; i++) { c.strokeStyle = `rgba(160,120,70,${rnd(0.05, 0.12)})`; c.lineWidth = rnd(2, 6); c.beginPath(); const x = Math.random() * w, y = Math.random() * h; c.ellipse(x, y, rnd(10, 40), rnd(4, 14), rnd(0, 3), 0, 6.3); c.stroke(); }
    });
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }
    return t;
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshStandardMaterial({ map: sandTex(512, 512, 40), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const FW = 26, FD = 16, S = 48;
  const court = canvasTex(FW * S, FD * S, (c, w, h) => {
    c.drawImage(sandTex(512, 512).image, 0, 0, w, h);
    const X = m => (m + FW / 2) * S, Z = m => (m + FD / 2) * S;
    c.strokeStyle = '#1f55c8'; c.lineWidth = 0.06 * S; c.strokeRect(X(-HALF), Z(-CW), 2 * HALF * S, 2 * CW * S);
  });
  // il campo è una griglia di 20 cm che si deforma (impronte, salti, tuffi, pallone): come sabbia.js nel gioco
  const NX = FW * 5, NZ = FD * 5, geo = new THREE.PlaneGeometry(FW, FD, NX, NZ); geo.rotateX(-Math.PI / 2);
  const cm = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: court, roughness: 1 }));
  cm.position.y = 0.006; cm.receiveShadow = true; scene.add(cm);
  SAND = { geo, NX, NZ, W: FW, D: FD, h: new Float32Array((NX + 1) * (NZ + 1)), dirty: false, t: 0, rake: 0 };

  // mare all'orizzonte
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 160), new THREE.MeshStandardMaterial({ color: 0x2a86c8, roughness: 0.15, metalness: 0.3 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.03, -110); scene.add(sea);
  // palme
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.9 }), leafM = new THREE.MeshStandardMaterial({ color: 0x2f8a3a, roughness: 0.8, side: THREE.DoubleSide });
  for (const [x, z] of [[-16, -12], [-9, -15], [13, -13], [19, -9], [-20, 6], [21, 7], [4, -18]]) {
    const palm = new THREE.Group(); palm.position.set(x, 0, z);
    const h = rnd(6, 8.5), lean = rnd(-0.15, 0.15);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, h, 10), trunkM); tr.position.y = h / 2; tr.rotation.z = lean; tr.castShadow = true; palm.add(tr);
    for (let i = 0; i < 8; i++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 3.4, 1, 4), leafM);
      leaf.geometry.translate(0, 1.7, 0);
      leaf.position.set(-Math.sin(lean) * h, h, 0); leaf.rotation.set(rnd(1.0, 1.4), i / 8 * Math.PI * 2, 0, 'YXZ'); leaf.castShadow = true; palm.add(leaf);
    }
    scene.add(palm);
  }
}
// pavimento: zona libera blu, campo arancione, righe bianche (fondo, laterali, linea dei 3 m)
if (!BEACH) {
  const FW = 34, FD = 22, S = 64;
  const tex = canvasTex(FW * S, FD * S, (c, w, h) => {
    c.fillStyle = '#1d4e9e'; c.fillRect(0, 0, w, h);
    const X = m => (m + FW / 2) * S, Z = m => (m + FD / 2) * S;
    c.fillStyle = '#d8783a'; c.fillRect(X(-HALF), Z(-CW), 2 * HALF * S, 2 * CW * S);
    // venature del parquet
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},0.025)`; c.fillRect(Math.random() * w, Math.random() * h, rnd(60, 260), 3); }
    c.strokeStyle = '#ffffff'; c.lineWidth = 0.05 * S;
    c.strokeRect(X(-HALF), Z(-CW), 2 * HALF * S, 2 * CW * S);
    for (const xm of [-3, 3]) { c.beginPath(); c.moveTo(X(xm), Z(-CW)); c.lineTo(X(xm), Z(CW)); c.stroke(); }
    c.beginPath(); c.moveTo(X(0), Z(-CW)); c.lineTo(X(0), Z(CW)); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.font = `bold ${2 * S}px Arial Black, Arial`; c.textAlign = 'center';
    c.save(); c.translate(X(0), Z(CW + 2.6)); c.fillText('SPIKE FEVER \'91', 0, 0); c.restore();
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(FW, FD), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.02 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(120, 90), new THREE.MeshStandardMaterial({ color: 0x14203a, roughness: 0.9 }));
  outer.rotation.x = -Math.PI / 2; outer.position.y = -0.01; scene.add(outer);
}
// rete, pali, antenne
{
  const netTex = canvasTex(1024, 104, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(20,20,20,0.9)'; c.lineWidth = 2;
    for (let x = 0; x <= w; x += 10.5) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y <= h; y += 10.5) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.fillStyle = '#f4f4f4'; c.fillRect(0, 0, w, 7); c.fillRect(0, h - 5, w, 5);
  });
  const net = new THREE.Mesh(new THREE.PlaneGeometry(9.9, 1.0), new THREE.MeshStandardMaterial({ map: netTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.8 }));
  net.rotation.y = Math.PI / 2; net.position.set(0, NET - 0.5, 0); net.castShadow = true; scene.add(net);
  const postM = new THREE.MeshStandardMaterial({ color: 0x2a3a6a, metalness: 0.5, roughness: 0.4 });
  for (const z of [-5.1, 5.1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.6, 16), postM); p.position.set(0, 1.3, z); p.castShadow = true; scene.add(p);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.8, 16), new THREE.MeshStandardMaterial({ color: 0xd82020, roughness: 0.7 })); pad.position.set(0, 0.9, z); scene.add(pad);
  }
  const antTex = canvasTex(8, 64, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#e02020'; c.fillRect(0, i * 8, w, 8); } });
  for (const z of [-CW, CW]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.8, 8), new THREE.MeshStandardMaterial({ map: antTex })); a.position.set(0, NET - 1 + 0.9 + 0.3, z); scene.add(a); }
}
// palazzetto: spalti a gradoni con il pubblico (istanze: pochi oggetti per la scheda grafica)
const crowd = [];
{
  const standM = new THREE.MeshStandardMaterial({ color: 0x27304a, roughness: 0.9 });
  const body = new THREE.CapsuleGeometry(0.2, 0.35, 4, 8), head = new THREE.SphereGeometry(0.12, 10, 8);
  const N = 1400, bodies = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ roughness: 0.85 }), N), heads = new THREE.InstancedMesh(head, new THREE.MeshStandardMaterial({ roughness: 0.7 }), N);
  const cols = ['#2a48d8', '#ffffff', '#24a83a', '#e02020', '#f2d020', '#1a1a1a', '#ff8a2a', '#7a3ad8', '#2a48d8', '#2a48d8'];
  const skins = ['#eeb088', '#c88a5a', '#8a5a38', '#f2c4a4', '#b67a4c'];
  const m = new THREE.Matrix4(), col = new THREE.Color();
  let k = 0;
  const stand = (cx, cz, len, alongX, out) => {   // out: verso di uscita (+1 / -1) lontano dal campo
    for (let r = 0; r < (BEACH ? 6 : 9); r++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 0.9, 0.45, alongX ? 0.9 : len), standM);
      const d = r * 0.9, y = r * 0.45 + 0.22;
      step.position.set(alongX ? cx : cx + out * d, y, alongX ? cz + out * d : cz); step.receiveShadow = true; scene.add(step);
      for (let i = 0; i < len / 0.62 && k < N; i++) {
        if (Math.random() < 0.12) continue;
        const a = -len / 2 + 0.31 + i * 0.62 + rnd(-0.08, 0.08), px = alongX ? cx + a : cx + out * d, pz = alongX ? cz + out * d : cz + a, py = y + 0.22 + 0.37;
        m.makeTranslation(px, py, pz); bodies.setMatrixAt(k, m); bodies.setColorAt(k, col.set(cols[Math.floor(Math.random() * cols.length)]));
        m.makeTranslation(px, py + 0.43, pz); heads.setMatrixAt(k, m); heads.setColorAt(k, col.set(skins[Math.floor(Math.random() * skins.length)]));
        crowd.push({ k, px, py, pz, ph: Math.random() * 6 }); k++;
      }
    }
  };
  if (BEACH) stand(0, 8.6, 22, true, 1);
  else { stand(0, 9.5, 30, true, 1); stand(0, -9.5, 30, true, -1); stand(15, 0, 16, false, 1); stand(-15, 0, 16, false, -1); }
  bodies.count = heads.count = k; scene.add(bodies, heads);
  crowd.bodies = bodies; crowd.heads = heads;
  // (cartelloni: buildAds, dopo il caricamento degli sponsor)
  // luci del soffitto
  if (!BEACH) for (let i = -2; i <= 2; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.6), new THREE.MeshBasicMaterial({ color: 0xfff4d8 })); l.position.set(i * 6, 16, 0); scene.add(l); }
}

// tabelloni pubblicitari a bordo campo: gli sponsor dell'EDITOR (nome sul colore scelto, o il logo), altrimenti quelli inventati
const ADS = [];
function buildAds(list) {
  for (const m of ADS) scene.remove(m); ADS.length = 0;
  const names = ['SPIKE COLA', 'NETWORX', 'VOLTEX', 'MIRAKO', 'SESIA', 'KOBAYA'];
  for (let i = 0; i < 6; i++) {
    const sp = list.length ? list[i % list.length] : null, txt = sp ? String(sp.nome).toUpperCase() : names[i];
    const bg = sp ? sp.colore || '#ffffff' : i % 2 ? '#f4f4f4' : '#c81e3a';
    const fg = (() => { const h = bg.replace('#', ''); const v = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16); return ((v >> 16) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11) > 150 ? '#c81e3a' : '#ffffff'; })();
    const t = canvasTex(512, 64, (c, w, h) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.font = 'italic bold 46px Arial Black, Arial'; c.textAlign = 'center'; c.fillText(txt.slice(0, 16), w / 2, 50); });
    if (sp && sp.logo) {   // logo dello sponsor al centro del cartellone
      const img = new Image(); img.onload = () => { const c = t.image.getContext('2d'); c.fillStyle = bg; c.fillRect(0, 0, 512, 64); const k = Math.min(500 / img.width, 60 / img.height); c.drawImage(img, 256 - img.width * k / 2, 32 - img.height * k / 2, img.width * k, img.height * k); t.needsUpdate = true; }; img.src = sp.logo;
    }
    const b = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.8, 0.12), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }));
    const AZ = BEACH ? 7.4 : 8.6;
    b.position.set(-13.5 + i * 5.4, 0.4, AZ); scene.add(b);
    const b2 = b.clone(); b2.position.z = -AZ; b2.rotation.y = Math.PI; scene.add(b2);
    ADS.push(b, b2);
  }
}

// ---------------- pallone ----------------
const ballTex = canvasTex(512, 256, (c, w, h) => {
  c.fillStyle = BEACH ? '#f6f6f2' : '#f4d21a'; c.fillRect(0, 0, w, h);
  c.fillStyle = BEACH ? '#e8a018' : '#1f4fc8';
  for (let i = 0; i < 3; i++) { c.beginPath(); for (let x = 0; x <= w; x += 8) { const y = h * (0.2 + i * 0.3) + Math.sin(x / w * Math.PI * 4 + i) * 18; x ? c.lineTo(x, y) : c.moveTo(x, y); } for (let x = w; x >= 0; x -= 8) c.lineTo(x, h * (0.2 + i * 0.3) + 26 + Math.sin(x / w * Math.PI * 4 + i) * 18); c.fill(); }
  c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2;
  for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(0, h * i / 6); c.lineTo(w, h * i / 6); c.stroke(); }
});
const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 32, 20), new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.45, emissive: 0x000000 }));
ballMesh.castShadow = true; scene.add(ballMesh);
// PHANTOM: seconda palla (finta) che si separa dalla vera; THUNDER: scia luminosa
const ghostMesh = new THREE.Mesh(ballMesh.geometry, new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.45, transparent: true, opacity: 0.85 }));
ghostMesh.visible = false; scene.add(ghostMesh);
const trail = [];
for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(BALL_R * (1 - i / 16), 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe040, transparent: true, opacity: 0.6 * (1 - i / 14) })); m.visible = false; scene.add(m); trail.push(m); }
const trailPos = [];
// cerchio dove andare (blu) / momento di colpire (rosso)
const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 40), new THREE.MeshBasicMaterial({ color: 0x3a9aff, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.012; scene.add(ring);
const landDot = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
landDot.rotation.x = -Math.PI / 2; landDot.position.y = 0.011; scene.add(landDot);

// ---------------- sabbia (beach): il manto si deforma e si accumula ----------------
// impronta / buca di raggio r e profondità d, con il bordo di sabbia spostata che si alza (rim)
function sandStamp(x, z, r, d, rim = d * 0.4, ex = 1) {
  if (!SAND) return;
  const S2 = SAND, cs = S2.W / S2.NX, ix0 = Math.floor((x + S2.W / 2) / cs), iz0 = Math.floor((z + S2.D / 2) / cs), R = Math.ceil(r * 1.7 * ex / cs) + 1;
  for (let iz = iz0 - R; iz <= iz0 + R; iz++) for (let ix = ix0 - R; ix <= ix0 + R; ix++) {
    if (ix < 0 || iz < 0 || ix > S2.NX || iz > S2.NZ) continue;
    const vx = -S2.W / 2 + ix * cs, vz = -S2.D / 2 + iz * cs, q = Math.hypot((vx - x) / ex, vz - z) / r;
    const k = iz * (S2.NX + 1) + ix;
    if (q < 1) S2.h[k] -= d * (1 - q * q);
    else if (q < 1.7) S2.h[k] += rim * Math.sin((q - 1) / 0.7 * Math.PI);
    else continue;
    S2.h[k] = clamp(S2.h[k], -0.1, 0.07);
  }
  S2.dirty = true;
}
// irregolarità della sabbia intorno a un punto (0 = liscia): rallenta la corsa e accorcia un po' il salto
function sandRough(x, z) {
  if (!SAND) return 0;
  const S2 = SAND, cs = S2.W / S2.NX; let sum = 0, n = 0;
  for (const [dx, dz] of [[0, 0], [0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) {
    const ix = Math.round((x + dx + S2.W / 2) / cs), iz = Math.round((z + dz + S2.D / 2) / cs);
    if (ix < 0 || iz < 0 || ix > S2.NX || iz > S2.NZ) continue;
    sum += Math.abs(S2.h[iz * (S2.NX + 1) + ix]); n++;
  }
  return n ? sum / n : 0;
}
function sandUpdate(dt) {
  if (!SAND) return;
  const S2 = SAND;
  if (S2.rake > 0) { S2.rake -= dt; const k = Math.min(1, dt * 2.2); for (let i = 0; i < S2.h.length; i++) S2.h[i] *= 1 - k; if (S2.rake <= 0) S2.h.fill(0); S2.dirty = true; }
  S2.t += dt;
  if (!S2.dirty || S2.t < 0.15) return;
  S2.t = 0; S2.dirty = false;
  const pos = S2.geo.attributes.position;
  for (let i = 0; i < S2.h.length; i++) pos.setY(i, S2.h[i]);
  pos.needsUpdate = true; S2.geo.computeVertexNormals();
}
// schizzi di sabbia
const SPL = { n: 700, i: 0, pos: null, vel: null, life: null, pts: null };
if (BEACH) {
  SPL.pos = new Float32Array(SPL.n * 3); SPL.vel = new Float32Array(SPL.n * 3); SPL.life = new Float32Array(SPL.n);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(SPL.pos, 3));
  SPL.pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd8bc84, size: 0.045, transparent: true, opacity: 0.9 }));
  SPL.pts.frustumCulled = false; scene.add(SPL.pts);
  for (let i = 0; i < SPL.n; i++) SPL.pos[i * 3 + 1] = -5;
}
function splash(x, z, n, power = 1) {
  if (!SPL.pts) return;
  for (let k = 0; k < n; k++) {
    const i = SPL.i = (SPL.i + 1) % SPL.n, a = Math.random() * Math.PI * 2, v = rnd(0.5, 2.2) * power;
    SPL.pos[i * 3] = x + rnd(-0.1, 0.1); SPL.pos[i * 3 + 1] = 0.03; SPL.pos[i * 3 + 2] = z + rnd(-0.1, 0.1);
    SPL.vel[i * 3] = Math.cos(a) * v; SPL.vel[i * 3 + 1] = rnd(1.2, 3.2) * power; SPL.vel[i * 3 + 2] = Math.sin(a) * v; SPL.life[i] = 1.2;
  }
}
function splashUpdate(dt) {
  if (!SPL.pts) return;
  for (let i = 0; i < SPL.n; i++) {
    if (SPL.life[i] <= 0) continue;
    SPL.life[i] -= dt; SPL.vel[i * 3 + 1] -= 9.8 * dt;
    for (let a = 0; a < 3; a++) SPL.pos[i * 3 + a] += SPL.vel[i * 3 + a] * dt;
    if (SPL.pos[i * 3 + 1] < 0.01 || SPL.life[i] <= 0) { SPL.life[i] = 0; SPL.pos[i * 3 + 1] = -5; }
  }
  SPL.pts.geometry.attributes.position.needsUpdate = true;
}

// ---------------- manichini ----------------
// Altezza 1,92 m. Asse locale: avanti = +Z, sinistra = +X. Articolazioni (gruppi): bacino, busto, testa,
// spalle/gomiti, anche/ginocchia/caviglie; le pose ruotano le articolazioni.
const GEO = {
  cyl: (r1, r2, h) => new THREE.CylinderGeometry(r1, r2, h, 18, 1),
  sph: r => new THREE.SphereGeometry(r, 20, 14),
  cap: (r, h) => new THREE.CapsuleGeometry(r, h, 6, 16)
};
function mat(color, rough = 0.7, extra = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough }, extra)); }
function numberTex(n, fg, bg) {
  return canvasTex(128, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.fillStyle = fg; c.font = 'bold 92px Arial Black, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 6; c.strokeStyle = bg; c.strokeText(String(n), w / 2, h / 2 + 4); c.fillText(String(n), w / 2, h / 2 + 4); });
}
function makeAthlete(kit, num, look) {
  const M = {
    skin: mat(look.skin, 0.55), shirt: mat(kit.shirt, 0.78), trim: mat(kit.trim, 0.7), shorts: mat(kit.shorts, 0.75),
    hair: mat(look.hair, 0.9), white: mat(0xf2f2f2, 0.6), dark: mat(0x1a1a1a, 0.6), eye: mat(0x101010, 0.2), sole: mat(kit.trim, 0.5)
  };
  const root = new THREE.Group(), J = {};
  const add = (parent, geo, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; parent.add(o); return o; };
  const joint = (parent, name, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); J[name] = g; return g; };
  // femminile: spalle più strette, fianchi più larghi, coda di cavallo; nel beach top sportivo e slip (fisico atletico)
  const F = !!look.fem, FB = F && look.beach;
  const pelvis = joint(root, 'pelvis', 0, 0.98, 0);
  // pantaloncini (slip nel beach femminile)
  if (FB) add(pelvis, GEO.cyl(0.162, 0.185, 0.12), M.shorts, 0, -0.045, 0, 1, 1, 0.8);
  else if (F) add(pelvis, GEO.cyl(0.17, 0.195, 0.17), M.shorts, 0, -0.03, 0, 1, 1, 0.8);
  else add(pelvis, GEO.cyl(0.165, 0.18, 0.2), M.shorts, 0, -0.02, 0, 1, 1, 0.78);
  const spine = joint(pelvis, 'spine', 0, 0.06, 0);
  // busto: addome e torace (maglia), spalle rotonde, numero davanti e dietro
  add(spine, GEO.cap(0.15, 0.16), FB ? M.skin : M.shirt, 0, 0.13, 0, F ? 0.98 : 1.08, 1, 0.72);
  add(spine, GEO.cap(0.17, 0.2), M.shirt, 0, 0.32, 0, F ? 1.06 : 1.22, F ? 0.96 : 1, F ? 0.82 : 0.78);
  add(spine, GEO.cyl(0.155, 0.17, 0.04), M.trim, 0, FB ? 0.215 : 0.005, 0, F ? 0.95 : 1.06, 1, 0.74);   // bordo della maglia / del top
  const nt = numberTex(num, '#ffffff', kit.trimHex);
  const nm = new THREE.MeshBasicMaterial({ map: nt, transparent: true });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.17), nm); front.position.set(0, 0.3, 0.142); spine.add(front);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), nm); back.position.set(0, 0.33, -0.142); back.rotation.y = Math.PI; spine.add(back);
  const neck = joint(spine, 'neck', 0, 0.5, 0.01);
  add(neck, GEO.cyl(0.052, 0.06, 0.12), M.skin, 0, 0.04, 0);
  const head = joint(neck, 'head', 0, 0.11, 0.01);
  const hg = new THREE.Group(); head.add(hg); J.headMesh = hg;
  add(hg, GEO.sph(0.112), M.skin, 0, 0.1, 0.005, 0.9, 1.08, 1);                       // cranio
  add(hg, GEO.sph(0.07), M.skin, 0, 0.035, 0.035, 0.95, 0.9, 1);                     // mascella e mento
  add(hg, GEO.sph(0.118), M.hair, 0, 0.13, -0.012, 0.92, 0.85, 1.0);                 // capelli
  if (F) {   // coda di cavallo
    add(hg, GEO.sph(0.05), M.hair, 0, 0.13, -0.11);
    add(hg, GEO.cap(0.035, 0.16), M.hair, 0, 0.03, -0.135, 1, 1, 0.8).rotation.x = 0.25;
  }
  add(hg, GEO.sph(0.022), M.skin, 0.098, 0.095, 0, 0.6, 1.1, 1);                     // orecchie
  add(hg, GEO.sph(0.022), M.skin, -0.098, 0.095, 0, 0.6, 1.1, 1);
  add(hg, GEO.sph(0.013), M.eye, 0.036, 0.11, 0.098); add(hg, GEO.sph(0.013), M.eye, -0.036, 0.11, 0.098);   // occhi
  add(hg, new THREE.ConeGeometry(0.016, 0.04, 10), M.skin, 0, 0.085, 0.112, 1, 1, 1).rotation.x = Math.PI / 2;   // naso
  add(hg, GEO.cyl(0.03, 0.02, 0.008), mat(0x8a4a3a, 0.6), 0, 0.055, 0.1).rotation.x = Math.PI / 2;               // bocca
  if (look.glasses) { const gm = mat(0x101820, 0.1, { metalness: 0.6 }); add(hg, new THREE.BoxGeometry(0.19, 0.035, 0.02), gm, 0, 0.112, 0.103); }   // occhiali da sole
  // braccia: spalla, manica, braccio, gomito, avambraccio, mano
  for (const s of [1, -1]) {
    const sh = joint(spine, s > 0 ? 'shL' : 'shR', s * (F ? 0.19 : 0.215), 0.42, 0);
    add(sh, GEO.sph(0.072), M.shirt, 0, 0, 0, 1, 0.9, 0.95);
    if (!look.beach) add(sh, GEO.cyl(0.068, 0.058, 0.13), M.shirt, 0, -0.07, 0);          // manica (nel beach canottiera)
    add(sh, GEO.cyl(0.052, 0.042, 0.26), M.skin, 0, -0.15, 0);
    const el = joint(sh, s > 0 ? 'elL' : 'elR', 0, -0.285, 0);
    add(el, GEO.sph(0.043), M.skin);
    add(el, GEO.cyl(0.042, 0.032, 0.25), M.skin, 0, -0.13, 0);
    const hand = joint(el, s > 0 ? 'haL' : 'haR', 0, -0.27, 0);
    add(hand, GEO.sph(0.045), M.skin, 0, -0.035, 0.005, 0.75, 1.25, 0.48);
    add(hand, GEO.sph(0.018), M.skin, s * -0.03, -0.01, 0.02, 1, 1.6, 1);                 // pollice
  }
  // gambe: coscia (pantaloncino), ginocchio con ginocchiera, polpaccio, calza, scarpa
  for (const s of [1, -1]) {
    const hip = joint(pelvis, s > 0 ? 'hiL' : 'hiR', s * (F ? 0.1 : 0.095), -0.04, 0);
    if (!FB) add(hip, GEO.cyl(0.092, 0.084, F ? 0.09 : 0.16), M.shorts, 0, F ? -0.03 : -0.06, 0);
    add(hip, GEO.cyl(0.08, 0.06, 0.4), M.skin, 0, -0.2, 0);
    const kn = joint(hip, s > 0 ? 'knL' : 'knR', 0, -0.42, 0);
    if (!look.noPads) add(kn, GEO.cyl(0.066, 0.066, 0.1), kit.padDark ? M.dark : M.white, 0, -0.01, 0.006);
    else add(kn, GEO.sph(0.06), M.skin);
    add(kn, GEO.cyl(0.062, 0.042, 0.24), M.skin, 0, -0.14, -0.005);                       // polpaccio
    if (!look.beach) add(kn, GEO.cyl(0.044, 0.04, 0.14), M.white, 0, -0.32, 0);           // calza
    const an = joint(kn, s > 0 ? 'anL' : 'anR', 0, -0.42, 0);
    if (look.beach) add(an, GEO.cap(0.04, 0.14), M.skin, 0, -0.035, 0.05, 1.1, 0.75, 1).rotation.x = Math.PI / 2;   // piede nudo
    else {
      add(an, GEO.cap(0.048, 0.15), M.white, 0, -0.025, 0.05, 1.05, 1, 1).rotation.x = Math.PI / 2;   // scarpa
      add(an, GEO.cyl(0.06, 0.06, 0.02), M.sole, 0, -0.065, 0.05, 0.85, 1, 1.95);                     // suola
    }
  }
  root.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  return { root, J };
}

// pose: angoli delle articolazioni (radianti). x di spalla/anca negativo = avanti, ginocchio positivo = piegato
const POSE = {
  stand: { lean: 0.05, crouch: 0, sh: [-0.1, -0.1], shZ: [0.12, 0.12], el: [-0.2, -0.2], hi: [0, 0], kn: [0.08, 0.08], an: [0, 0], head: 0 },
  ready: { lean: 0.38, crouch: 0.2, sh: [-0.75, -0.75], shZ: [0.22, 0.22], el: [-0.9, -0.9], hi: [-0.65, -0.65], kn: [1.05, 1.05], an: [-0.3, -0.3], head: -0.3 },
  pass: { lean: 0.42, crouch: 0.24, sh: [-0.9, -0.9], shZ: [-0.12, -0.12], el: [0, 0], hi: [-0.75, -0.75], kn: [1.15, 1.15], an: [-0.35, -0.35], head: -0.35 },
  set: { lean: -0.05, crouch: 0.06, sh: [-2.75, -2.75], shZ: [0.25, 0.25], el: [-1.1, -1.1], hi: [-0.15, -0.15], kn: [0.3, 0.3], an: [0, 0], head: 0.35 },
  jump: { lean: 0.0, crouch: 0, sh: [-2.6, -2.6], shZ: [0.35, 0.35], el: [-0.4, -0.4], hi: [-0.25, -0.25], kn: [0.55, 0.55], an: [0.4, 0.4], head: 0.25 },
  load: { lean: 0.15, crouch: 0, sh: [-2.9, -0.9], shZ: [0.3, 0.2], el: [-1.9, -0.6], hi: [-0.3, -0.1], kn: [0.7, 0.4], an: [0.4, 0.4], head: 0.4 },   // schiacciata: braccio destro caricato dietro la testa
  hit: { lean: 0.55, crouch: 0, sh: [-2.1, -0.5], shZ: [0.2, 0.1], el: [-0.1, -0.4], hi: [-0.6, -0.2], kn: [0.6, 0.5], an: [0.3, 0.3], head: 0.1 },
  block: { lean: -0.05, crouch: 0, sh: [-3.05, -3.05], shZ: [0.1, 0.1], el: [-0.05, -0.05], hi: [-0.1, -0.1], kn: [0.25, 0.25], an: [0.4, 0.4], head: 0.2 },
  toss: { lean: 0.05, crouch: 0.02, sh: [-2.4, -1.4], shZ: [0.3, 0.1], el: [-1.6, -0.2], hi: [0, 0.15], kn: [0.15, 0.1], an: [0, 0], head: 0.45 },
  dive: { lean: 1.1, crouch: 0.45, sh: [-1.5, -1.5], shZ: [-0.1, -0.1], el: [0, 0], hi: [-1.3, 0.2], kn: [1.4, 0.4], an: [0, 0], head: -0.5 },
  cheer: { lean: -0.1, crouch: 0, sh: [-3.0, -3.0], shZ: [0.5, 0.5], el: [-0.3, -0.3], hi: [0, 0], kn: [0.1, 0.1], an: [0, 0], head: 0.4 },
  sad: { lean: 0.35, crouch: 0.05, sh: [-0.05, -0.05], shZ: [0.05, 0.05], el: [-0.1, -0.1], hi: [-0.1, -0.1], kn: [0.2, 0.2], an: [0, 0], head: -0.6 }
};
// corsa: ciclo calcolato dalla fase
function runPose(ph, k) {
  const s = Math.sin(ph), c = Math.cos(ph);
  return { lean: 0.22 * k + 0.05, crouch: 0.04 * k, sh: [0.75 * s * k - 0.1, -0.75 * s * k - 0.1], shZ: [0.1, 0.1], el: [-1.25, -1.25], hi: [-0.75 * s * k, 0.75 * s * k], kn: [0.25 + Math.max(0, -c) * 1.15 * k, 0.25 + Math.max(0, c) * 1.15 * k], an: [0.1, 0.1], head: 0, bob: Math.abs(Math.sin(ph)) * 0.05 * k };
}
function applyPose(pl, P, k) {
  const J = pl.body.J, cur = pl.cur;
  for (const key of ['lean', 'crouch', 'head', 'bob']) cur[key] = lerp(cur[key] || 0, P[key] || 0, k);
  for (const key of ['sh', 'shZ', 'el', 'hi', 'kn', 'an']) { cur[key] = cur[key] || [0, 0]; for (let i = 0; i < 2; i++) cur[key][i] = lerp(cur[key][i], P[key][i], k); }
  // destra = [0] (braccio che colpisce), sinistra = [1]
  J.pelvis.position.y = 0.98 - cur.crouch + cur.bob;
  J.spine.rotation.x = cur.lean; J.head.rotation.x = -cur.lean * 0.6 - cur.head;
  J.shR.rotation.x = cur.sh[0]; J.shL.rotation.x = cur.sh[1]; J.shR.rotation.z = -cur.shZ[0]; J.shL.rotation.z = cur.shZ[1];
  J.elR.rotation.x = cur.el[0]; J.elL.rotation.x = cur.el[1];
  J.hiR.rotation.x = cur.hi[0] - cur.lean * 0.3; J.hiL.rotation.x = cur.hi[1] - cur.lean * 0.3;
  J.knR.rotation.x = cur.kn[0]; J.knL.rotation.x = cur.kn[1]; J.anR.rotation.x = cur.an[0] - cur.kn[0] * 0.45; J.anL.rotation.x = cur.an[1] - cur.kn[1] * 0.45;
}

// etichetta con il nome (N: sopra la testa / sotto i piedi / spenta)
function nameSprite(txt, mine) {
  const t = canvasTex(256, 64, (c, w, h) => { c.font = 'bold 34px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 7; c.strokeStyle = '#000'; c.strokeText(txt, w / 2, h / 2); c.fillStyle = mine ? '#ffe030' : '#ffffff'; c.fillText(txt, w / 2, h / 2); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(0.9, 0.225, 1); s.renderOrder = 10; return s;
}

// ---------------- squadre ----------------
// ruoli: 0 alzatore, 1 schiacciatore di sinistra, 2 schiacciatore di destra, 3 difensore
// posizioni (distanza dalla rete d, lato zl: negativo = alla sinistra del giocatore) per fase
const HOME = BEACH ? {
  receive: [[5.0, 1.9], [5.0, -1.9]],
  attack: [[2.0, 1.0], [3.4, -1.8]],
  defend: [[0.55, 0], [5.4, 0]]
} : {
  receive: [[1.4, 1.6], [6.2, -2.7], [6.2, 2.7], [7.2, 0]],
  attack: [[SETTER_D, 0.8], [3.8, -3.1], [3.8, 3.1], [6.6, 0]],
  defend: [[0.55, 0.3], [0.55, -2.8], [5.4, 2.8], [6.6, -0.8]]
};
// rosa: 6 giocatori nel palazzetto (4 in campo + 2 in panchina per i cambi), 2 nel beach
function makeTeam(code, side, human) {
  const P = TEAMS[code];
  const kit = { shirt: P.sh, trim: P.tr, trimHex: P.tr, shorts: BEACH ? P.tr === '#ffffff' ? P.sh : P.tr : P.so, padDark: P.sh === '#f4f4f4' };
  const T = { code, side, name: P.name, kit, players: [], score: 0, srvI: 0, touches: 0, plan: null, attacker: null, human, subs: 0, to: 0, en: [], st: [], roster: [] };
  // rosa: dai dati del gioco (club, mie squadre, i miei giocatori) oppure dai nomi della nazionale
  const nums = BEACH ? [1, 2] : [3, 7, 11, 14, 9, 5];
  const PL = P.plist ? (BEACH ? P.plist.slice(0, 2) : P.plist.slice(0, 6)) : null;
  for (let ni = 0; ni < (PL ? Math.max(PL.length, NPL) : nums.length); ni++) {
    const e = PL && PL[ni];
    const name = e ? e.name : (WOMEN && !P.club ? femName(code, ni) : P.names[ni % P.names.length]);
    T.roster.push({ ni, num: e ? e.num : nums[ni], name, hair: e ? e.ha : P.ha[ni % P.ha.length], sk: e ? e.sk : P.sk, mine: !!(e && e.mine), foto: e && e.foto, sc: rnd(0.97, 1.04) });
    T.en.push(100); T.st.push({ pts: 0, err: 0, t: 0, ace: 0, blk: 0, kill: 0 });
  }
  T.lv = PL ? PL.slice(0, NPL).reduce((a, e) => a + e.lv, 0) / Math.min(NPL, PL.length) : 6;   // livello medio dei titolari
  for (let i = 0; i < NPL; i++) {
    const p = { team: T, i, role: i, ni: i, x: side * 5, z: 0, h: 0, vh: 0, air: false, act: null, actT: 0, ph: Math.random() * 6, spd: 0, yaw: 0, cur: {}, human: human && i === 1 };
    dress(p);
    T.players.push(p);
  }
  return T;
}
// veste il giocatore p con il membro della rosa p.ni (anche dopo un cambio)
function dress(p) {
  const T = p.team, R = T.roster[p.ni], P = TEAMS[T.code];
  if (p.body) scene.remove(p.body.root);
  if (p.label) scene.remove(p.label);
  const look = { skin: R.sk || P.sk, hair: R.hair, beach: BEACH, noPads: BEACH, glasses: BEACH && p.i === 0, fem: WOMEN };
  p.body = makeAthlete(T.kit, R.num, look); p.cur = {};
  p.body.root.scale.setScalar(R.sc * (WOMEN ? 0.95 : 1));
  p.name = R.name; p.num = R.num;
  p.label = nameSprite(p.human ? R.name + ' (TU)' : R.name, p.human);
  scene.add(p.body.root); scene.add(p.label);
}
let teams = [makeTeam('ITA', -1, true), makeTeam('BRA', 1, false)];
let me = teams[0].players[1];
// nuova partita tra due squadre qualsiasi (scelte nella schermata iniziale)
function setupTeams(a, b) {
  for (const t of teams) for (const p of t.players) { scene.remove(p.body.root); scene.remove(p.label); }
  teams = [makeTeam(a, -1, true), makeTeam(b, 1, false)]; me = teams[0].players[1];
  window.__teams = teams;
}
const other = t => t === teams[0] ? teams[1] : teams[0];
// (prove automatiche: con window.__auto il tuo giocatore gioca da solo)
const hum = p => p.human && !window.__auto;

// arbitro sul seggiolone a bordo rete (nome dall'EDITOR, se c'è)
const REF = { body: makeAthlete({ shirt: '#f4f4f4', trim: '#1a1a1a', trimHex: '#1a1a1a', shorts: '#1a1a1a' }, '', { skin: '#eeb088', hair: '#5a4a3a' }), label: null };
{
  const chair = new THREE.Group(), pm = new THREE.MeshStandardMaterial({ color: 0x8a8f9a, metalness: 0.4, roughness: 0.5 });
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 8), pm); leg.position.set(x, 0.8, z); chair.add(leg); }
  const plat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.8), pm); plat.position.y = 1.6; chair.add(plat);
  chair.position.set(0, 0, -(CW + 1.0)); scene.add(chair);
  REF.body.root.position.set(0, 1.63, -(CW + 1.0)); REF.body.root.rotation.y = 0; scene.add(REF.body.root);
  applyPose({ body: REF.body, cur: {} }, POSE.stand, 1);
}
function refLabel() {
  const R = DATA.refs[0], name = R ? String((R.cognome || '') + ' ' + (R.nome || '')).trim().toUpperCase() : 'ARBITRO';
  if (REF.label) scene.remove(REF.label);
  REF.label = nameSprite(name, false); REF.label.position.set(0, 3.95, -(CW + 1.0)); scene.add(REF.label);
}

// ---------------- stato della partita ----------------
const ball = { x: 0, z: 0, h: 1, vx: 0, vz: 0, vy: 0, held: null, live: false, team: null, last: null, spin: 0, ver: 0 };
const S = { count: {}, statsOn: true, state: 'serve', t: 0, serving: teams[1], server: null, phase: 'walk', toss: false, hitWin: false, msg: '', msgT: 0, over: false, paused: false, cam: 0, names: 1 };
const keys = {}, pressed = new Set();
const input = { l: false, r: false, u: false, d: false };

function homeOf(p, phase) {
  const T = p.team, [d, zl] = HOME[phase][p.role];
  return { x: T.side * d, z: zl * -T.side };
}
function phaseOf(T) {
  if (S.state === 'serve') return T === S.serving ? 'defend' : 'receive';
  if (!ball.live) return 'defend';
  if (ball.team === T) return 'attack';
  // l'altra squadra costruisce l'attacco: a muro e in difesa; dopo la battuta: in ricezione
  const O = other(T);
  if (ball.team === O && O.touches >= 3 && ball.last === S.server && S.t < 3) return 'receive';
  return 'defend';
}
function say(m, t = 1.6) { S.msg = m; S.msgT = t; }

// ---------------- battute (come nel gioco: la direzione tenuta al lancio sceglie la battuta) ----------------
// nessuna = dall'alto (flottante) · ↑ = in salto (jump spin) · ↓ = salto flottante (jump float)
// ← = SKY BALL (altissima, dal basso) · → = PHANTOM (la palla si sdoppia) · ↑ + ← / → = THUNDER (fulmine)
const SERVES = {
  float: { name: 'BATTUTA DALL\'ALTO', toss: 5.4, fwd: 0.6, speed: 17, wob: 1.6, err: 0.05 },
  jfloat: { name: 'SALTO FLOTTANTE', toss: 6.6, fwd: 1.0, speed: 18, wob: 2.6, err: 0.07, jump: 0.6, run: 0.35 },
  jump: { name: 'BATTUTA IN SALTO', toss: 7.2, fwd: 1.3, speed: 22, top: 5, err: 0.1, jump: 1, run: 0.3 },
  thunder: { name: 'THUNDER!', toss: 7.4, fwd: 1.3, speed: 27, top: 7, err: 0.15, jump: 1, run: 0.28 },
  sky: { name: 'SKY BALL!', toss: 1.2, fwd: 0.1, sky: true, err: 0.04 },
  phantom: { name: 'PHANTOM!', toss: 5.4, fwd: 0.6, speed: 17, wob: 1.2, ghost: true, err: 0.07 }
};
function serveKindFromInput() {
  if (input.u && (input.l || input.r)) return 'thunder';
  return input.u ? 'jump' : input.d ? 'jfloat' : input.l ? 'sky' : input.r ? 'phantom' : 'float';
}
function aiServeKind() {
  const r = Math.random();
  return r < 0.34 ? 'float' : r < 0.6 ? 'jfloat' : r < 0.84 ? 'jump' : r < 0.9 ? 'sky' : r < 0.95 ? 'phantom' : 'thunder';
}

function startServe() {
  const T = S.serving, sv = T.players[T.srvI];
  S.state = 'serve'; S.t = 0; S.server = sv; S.phase = 'walk'; S.toss = false; S.hitWin = false; S.kind = null; S.quickReq = false; S.receiverTouched = false;
  Object.assign(ball, { held: sv, live: false, team: null, last: null, vx: 0, vz: 0, vy: 0, wob: 0, top: 0, ghost: 0, thunder: 0 });
  for (const t of teams) { t.touches = 0; t.plan = null; t.attacker = null; for (const p of t.players) { p.act = null; if (!p.human) { const h = homeOf(p, phaseOf(t)); p.x = h.x; p.z = h.z; } p.h = 0; p.vh = 0; p.air = false; } }
  sv.x = T.side * SERVE_X; sv.z = T.side * 1.2;
  if (me !== sv) { const h = homeOf(me, phaseOf(me.team)); me.x = h.x; me.z = h.z; }   // a ogni battuta torni al tuo posto
}
// fine dell'azione: punto, statistiche, stanchezza, cambi e time-out del computer
function point(T, why, who, what) {
  if (S.state !== 'rally' && S.state !== 'serve') return;
  if (who && what) who.team.st[who.ni][what]++;
  if (who && (what === 'kill' || what === 'ace' || what === 'blk')) who.team.st[who.ni].pts++;
  T.score++; S.state = 'dead'; S.t = 0; ball.live = false; S.hitWin = false;
  for (const t of teams) { t.plan = null; t.attacker = null; }
  S.streak = S.streak && S.streak.T === T ? { T, n: S.streak.n + 1 } : { T, n: 1 };
  say(why + ' - PUNTO ' + T.name + (T === me.team ? '!' : ''));
  const won = T.score >= TARGET && T.score - other(T).score >= 2;
  if (T !== S.serving) { S.serving = T; T.srvI = (T.srvI + 1) % NPL; }
  for (const t of teams) {
    const onCourt = new Set(t.players.map(p => p.ni));
    for (const p of t.players) tire(p, FAT.point);
    for (let ni = 0; ni < t.roster.length; ni++) if (!onCourt.has(ni)) t.en[ni] = Math.min(100, t.en[ni] + FAT.bench);
  }
  if (won) { S.over = true; S.state = 'end'; say(T === me.team ? 'HAI VINTO IL SET!' : 'SET PERSO', 99); showStats(true); campEnd(T === me.team); }
  for (const t of teams) for (const p of t.players) { p.act = t === T ? 'cheer' : 'sad'; p.actT = 1.8; }
  if (won) return;
  // il computer: cambia chi è stanco e chiama time-out se l'altra squadra fa 4 punti di fila
  for (const t of teams) if (!t.human) aiSubs(t);
  const O = other(S.streak.T);
  if (!O.human && S.streak.n >= 4 && O.to < 1) callTimeout(O);
}

// ---------------- colpi ----------------
function touch(p, kind) {
  const T = p.team, b = ball;
  if (b.team === T) T.touches++; else { T.touches = 1; other(T).touches = 0; }
  if (b.team !== T && b.last === S.server) S.receiverTouched = true;
  b.team = T; b.last = p; b.ver++; b.held = null; b.wob = 0; b.top = 0; b.ghost = 0; b.thunder = 0; b.kind = kind;
  S.count[kind] = (S.count[kind] || 0) + 1;   // conteggio dei colpi (prove)
  T.st[p.ni].t++;
  if (T.touches > 3) { point(other(T), 'QUATTRO TOCCHI', p, 'err'); return; }
  const side = T.side, spd = Math.hypot(b.vx, b.vy, b.vz), F = fatigue(p);
  if (kind === 'pass') {
    // ricezione / difesa verso chi alza: più errore con palle veloci e con la stanchezza
    const err = ((p.human ? 0.45 : 0.6) + spd / 22 * (p.human ? 1.0 : 1.4)) * (1 + F * 0.8);
    const setter = BEACH ? T.players.find(q => q !== p) : T.players[0] !== p ? T.players[0] : T.players[2];
    const sx = side * (SETTER_D + rnd(-0.2, 0.6) * err), sz = clamp((BEACH ? setter.z * 0.3 : 1.2 * -side) + rnd(-1, 1) * err, -CW + 0.7, CW - 0.7);
    const v = arc3(b.x, b.z, b.h, sx, sz, SET_H, rnd(4.0, 5.2));
    Object.assign(b, v);
    const dive = spd > 13 && Math.hypot(p.x - b.x, p.z - b.z) > REACH + LAT;
    p.act = dive ? 'dive' : 'pass'; p.actT = 0.55;
    if (dive) { tire(p, FAT.dive); sandStamp(p.x, p.z, 0.32, 0.04, 0.016, 1.8); splash(p.x, p.z, 30, 1.1); }
  } else if (kind === 'set') {
    // alzata: nel palazzetto a uno schiacciatore (tu una volta su due se sei in prima linea), nel beach al compagno
    const hit = BEACH ? T.players.filter(q => q !== p) : T.players.filter(q => q.role === 1 || q.role === 2).filter(q => q !== p);
    let a = hit[Math.floor(Math.random() * hit.length)];
    if (T.human && hit.includes(me) && (Math.random() < 0.6 || S.quickReq)) a = me;
    T.attacker = a;
    // tipo di alzata: le tue richieste (↑ alta, ↓ veloce, Z durante la ricezione = primo tempo, oltre i 3 m = seconda linea)
    let type = 'normal';
    if (a === me && hum(me)) {
      if (S.quickReq) type = 'quick'; else if (Math.abs(me.x) > 3.1 && !BEACH) type = 'back'; else if (input.u) type = 'high'; else if (input.d) type = 'fast';
    } else { const r = Math.random(); type = r < 0.15 && !BEACH ? 'quick' : r < 0.3 ? 'high' : r < 0.4 ? 'fast' : r < 0.46 && !BEACH ? 'back' : 'normal'; }
    S.quickReq = false;
    let tz = clamp(a.z * 0.8 + (homeOf(a, 'attack').z) * 0.2, -CW + 0.8, CW - 0.8), tx = side * 0.95, apex = HIT_H + rnd(1.0, 1.5);
    if (type === 'high') { apex = HIT_H + 2.3; tz = clamp(tz * 1.25, -CW + 0.5, CW - 0.5); }
    if (type === 'fast') apex = HIT_H + 0.45;
    if (type === 'quick') { tz = clamp(p.z + (a.z > p.z ? 0.9 : -0.9), -CW + 0.8, CW - 0.8); tx = side * 0.7; apex = HIT_H + 0.25; }
    if (type === 'back') { tx = side * 3.7; apex = HIT_H + 1.3; }
    a.setType = type;
    const v = arc3(b.x, b.z, b.h, tx, tz, HIT_H - 0.05, apex);
    Object.assign(b, v); p.act = 'set'; p.actT = 0.5;
    if (a === me) say({ quick: 'PRIMO TEMPO!', back: 'SECONDA LINEA!', high: 'PALLA ALTA PER TE', fast: 'PALLA VELOCE PER TE', normal: 'ALZATA PER TE!' }[type] + ' Vai sul cerchio', 1.4);
  } else if (kind === 'dump') {
    // SURPRISE ATTACK: l'alzatore in salto manda la palla di là al secondo tocco, appena oltre la rete
    const v = arc3(b.x, b.z, b.h, -side * rnd(1.2, 2.6), clamp(b.z + rnd(-2, 2), -CW + 0.5, CW - 0.5), 0, Math.max(b.h, NET) + 0.45);
    Object.assign(b, v); p.act = 'set'; p.actT = 0.4; T.attacker = null; say(p === me ? 'SURPRISE ATTACK!' : 'ATTACCO DI SECONDA!', 1.2);
  } else if (kind === 'over') {
    // palla facile di là
    const v = arc3(b.x, b.z, b.h, -side * rnd(3, HALF - 2), rnd(-CW + 0.8, CW - 0.8), 0, Math.max(b.h, NET) + rnd(1.2, 2));
    Object.assign(b, v); p.act = 'pass'; p.actT = 0.45;
  } else if (kind === 'spike') {
    let tx = -side * rnd(2.5, HALF - 0.8), tz = rnd(-CW + 0.7, CW - 0.7), sp = SPIKE_V * (p.human ? rnd(0.9, 1.05) : rnd(0.72, 0.95)) * (1 - 0.15 * F) * (WOMEN ? 0.88 : 1), lob = false;
    if (hum(p)) {
      // ← → mira (a sinistra / a destra di chi schiaccia), ↑ pallonetto, ↓ potente
      tz = input.l ? (CW - 1.1) * side : input.r ? -(CW - 1.1) * side : rnd(-1.5, 1.5);
      if (input.u) lob = true; if (input.d) { sp *= 1.18; tx = -side * rnd(5, HALF - 1); }
    } else {
      const r = Math.random();
      if (r < 0.1) lob = true; else if (r < 0.2) sp *= 1.15;
      if (Math.random() < 0.07 + F * 0.08) tx = -side * (HALF + 0.6);   // ogni tanto fuori (di più se stanco)
    }
    let v = lob ? arc3(b.x, b.z, b.h, -side * rnd(2, 3.6), tz, 0, Math.max(b.h, NET) + 0.7) : shot3(b.x, b.z, b.h, tx, tz, 0, sp);
    for (let i = 0; i < 8 && !lob && !clears(b, v, 0.05); i++) { tx -= side * 0.6; v = shot3(b.x, b.z, b.h, tx, tz, 0, sp * 0.95); }
    Object.assign(b, v); p.act = 'hit'; p.actT = 0.35; T.attacker = null;
    b.spin = 30; b.top = lob ? 0 : 3;
    if (!lob && sp > SPIKE_V * 1.05) shake(0.25);
  }
}
function serveHit(p) {
  const T = p.team, side = T.side, b = ball, K = SERVES[S.kind];
  let tx = -side * rnd(4.5, HALF - 0.7), tz = rnd(-CW + 0.9, CW - 0.9);
  if (hum(p)) { tx = -side * (input.u ? HALF - 0.8 : input.d ? 3.6 : HALF * 0.7); tz = input.l ? (CW - 1.2) * side : input.r ? -(CW - 1.2) * side : rnd(-1, 1); }
  if (Math.random() < K.err * (hum(p) ? 0.5 : 1) + fatigue(p) * 0.06) tx = -side * (HALF + 1);   // battuta sbagliata (lunga)
  let v = null;
  if (K.sky) v = arc3(b.x, b.z, b.h, tx, tz, 0, WOMEN ? 13 : 15);                 // SKY BALL: altissima, scende quasi verticale
  else for (let sp = K.speed * (WOMEN ? 0.9 : 1); sp >= 9; sp -= 0.5) { v = shot3(b.x, b.z, b.h, tx, tz, 0, sp); if (clears(b, v, K.top ? 0.12 : 0.25)) break; }
  if (K.top) { // con la rotazione in avanti la palla scende prima: si tira un po' più su
    v = shot3(b.x, b.z, b.h, tx, tz, 0, K.speed * (WOMEN ? 0.9 : 1));
    v.vy += K.top * v.T / 2;
    if (!clears(b, v, 0.1)) v.vy += 1.2;
  }
  Object.assign(b, v); b.held = null; b.live = true; b.team = T; b.last = p; b.ver++; T.touches = 3;   // chi batte non può toccare di nuovo
  b.wob = K.wob || 0; b.wobPh = rnd(0, 6); b.top = K.top || 0; b.ghost = K.ghost ? 1 : 0; b.ghostZ = 0; b.ghostDir = Math.random() < 0.5 ? -1 : 1; b.thunder = S.kind === 'thunder' ? 1 : 0; b.kind = 'serve';
  other(T).touches = 0;
  S.state = 'rally'; S.t = 0; p.act = 'hit'; p.actT = 0.35; b.spin = K.top ? 30 : 3;
  if (K.ghost || S.kind === 'thunder' || K.sky) say(K.name, 1.2);
  if (S.kind === 'thunder') shake(0.4);
}

// ---------------- intelligenza (piani come in match.js: chi prende la palla, dove e quando) ----------------
function think(T) {
  T.plan = null;
  const b = ball;
  if (S.state !== 'rally' || !b.live) return;
  const next = b.team === T ? T.touches + 1 : 1;
  if (next > 3) return;
  let kind = next === 1 ? 'pass' : next === 2 ? 'set' : (T.attacker ? 'spike' : 'over');
  let hc = kind === 'pass' ? PASS_H : kind === 'set' ? SET_H : kind === 'spike' ? HIT_H - 0.05 : 1.6;
  let tc = timeToH(b.h, b.vy, hc);
  if (tc === null && kind === 'spike') { kind = 'over'; hc = 1.6; tc = timeToH(b.h, b.vy, hc); }
  if (tc === null) { hc = Math.max(0.5, b.h - 0.1); tc = timeToH(b.h, b.vy, hc) || 0; }
  const xc = b.x + b.vx * tc, zc = b.z + b.vz * tc;
  if (xc * T.side < 0.15 && kind !== 'spike') return;   // la palla non arriva nel nostro campo
  let p = null;
  if (kind === 'set') p = BEACH ? T.players.find(q => q !== b.last) : T.players[0] !== b.last ? T.players[0] : null;
  if (kind === 'spike') p = T.attacker;
  if (!p) {   // il più vicino al punto (non chi ha appena toccato)
    let best = 1e9;
    for (const q of T.players) { if (q === b.last && b.team === T) continue; const d = Math.hypot(q.x - xc, q.z - zc) - (q.human ? 0.4 : 0); if (d < best) { best = d; p = q; } }
  }
  T.plan = { kind, p, xc, zc, tc, hc };
}
// velocità di corsa: stanchezza e sabbia rovinata rallentano
function speedOf(p) { return RUN * (1 - 0.18 * fatigue(p)) * clamp(1 - sandRough(p.x, p.z) * 5, 0.82, 1); }
function movePlayer(p, dt) {
  const T = p.team, x0 = p.x, z0 = p.z;
  let tx = p.x, tz = p.z, sp = speedOf(p);
  if (hum(p)) {
    const mx = (input.u ? 1 : 0) - (input.d ? 1 : 0), mz = (input.r ? 1 : 0) - (input.l ? 1 : 0);   // ↑ = verso la rete
    let vx = mx * -T.side, vz = mz * -T.side;
    // durante la schiacciata la rincorsa è automatica (come nel gioco)
    if (S.autoAppr && T.plan && T.plan.p === p) { vx = 0; vz = 0; }
    const n = Math.hypot(vx, vz) || 1;
    if (!(p.air || (S.state === 'serve' && S.server === p && S.phase !== 'walk'))) { p.x += vx / n * sp * dt * (vx || vz ? 1 : 0); p.z += vz / n * sp * dt * (vx || vz ? 1 : 0); }
    p.spd = (vx || vz) && !p.air ? sp : 0;
  } else {
    const pl = T.plan;
    if (S.state === 'serve' && S.server === p) { tx = T.side * SERVE_X; tz = T.side * 1.2; }
    else if (pl && pl.p === p && S.verAge < 0.12 && pl.kind === 'pass') { tx = p.x; tz = p.z; }   // tempo di reazione dopo il colpo
    else if (pl && pl.p === p) {
      if (pl.kind === 'spike') {
        // rincorsa: indietro di 2,5 m, poi corsa verso il punto di colpo e stacco quando mancano 0,4 s
        const back = pl.tc > 0.85 ? 2.4 : 0.2;
        tx = pl.xc + T.side * back; tz = pl.zc; sp = pl.tc > 0.85 ? sp : sp * 1.6;
        if (!p.air && pl.tc <= JUMP_T + 0.02 && pl.tc > 0.2) jump(p, 'load');
      } else { tx = pl.xc; tz = pl.zc; sp *= 1.25; }
    } else if (S.state === 'dead' || S.state === 'end' || S.state === 'timeout') { tx = p.x; tz = p.z; }
    else {
      const h = homeOf(p, phaseOf(T)); tx = h.x; tz = h.z;
      // muro: i giocatori a rete seguono lo schiacciatore avversario e saltano con lui (anche sulla finta)
      const O = other(T), a = O.attacker;
      if (a && ball.team === O && Math.abs(tx) < 1.2 && (p.role === 0 || p.role === 1)) {
        tz = clamp(a.z + (p.role === 0 ? 0.35 : -0.35) * -T.side, -CW + 0.3, CW - 0.3);
        if (!p.air && a.air && a.h > 0.12 && p.blockVer !== ball.ver) { p.blockVer = ball.ver; if (Math.random() < 0.75) jump(p, 'block'); }
      }
    }
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    if (!p.air && d > 0.04) { const s = Math.min(d, sp * dt); p.x += dx / d * s; p.z += dz / d * s; p.spd = s / dt; } else p.spd = 0;
  }
  // ognuno nel suo campo (fino a sotto la rete)
  if (T.side < 0) p.x = clamp(p.x, -SERVE_X - 1, -0.25); else p.x = clamp(p.x, 0.25, SERVE_X + 1);
  p.z = clamp(p.z, -7, 7);
  // fatica della corsa e impronte nella sabbia
  const moved = Math.hypot(p.x - x0, p.z - z0);
  if (moved > 0 && S.state === 'rally') tire(p, moved * FAT.run);
  if (SAND && moved > 0 && !p.air) {
    p.stepD = (p.stepD || 0) + moved;
    if (p.stepD > 0.62) { p.stepD = 0; p.foot = -(p.foot || 1); const c = Math.cos(p.yaw), sn = Math.sin(p.yaw); sandStamp(p.x + c * 0.11 * p.foot, p.z - sn * 0.11 * p.foot, 0.1, 0.014, 0.006); if (p.spd > 3.5 && Math.random() < 0.4) splash(p.x, p.z, 3, 0.5); }
  }
  // salto
  if (p.air) {
    p.vh -= PG * dt; p.h += p.vh * dt;
    if (p.h <= 0) {
      p.h = 0; p.vh = 0; p.air = false; if (p.act === 'load' || p.act === 'block' || p.act === 'jump') p.act = null;
      if (SAND) { sandStamp(p.x, p.z, 0.24, 0.03, 0.013); splash(p.x, p.z, 22, 0.9); }   // atterraggio
    }
  }
  if (p.actT > 0) { p.actT -= dt; if (p.actT <= 0 && !p.air) p.act = null; }
}
function jump(p, act, k = 1) {
  if (p.air) return;
  p.air = true; p.vh = JUMP_V * k * (1 - 0.07 * fatigue(p)) * clamp(1 - sandRough(p.x, p.z) * 2, 0.93, 1); p.act = act; p.actT = 0.8;
  tire(p, FAT.jump);
  if (SAND) { sandStamp(p.x, p.z, 0.2, 0.025, 0.012); splash(p.x, p.z, 14, 0.8); }   // stacco
}

// contatti: tocchi automatici (ricezione, alzata, palla di là), schiacciata, muro
function contacts() {
  const b = ball;
  if (S.state !== 'rally' || !b.live) return;
  for (const T of teams) {
    const pl = T.plan; if (!pl || !pl.p) continue;
    const p = pl.p, d = Math.hypot(p.x - b.x, p.z - b.z);
    if (pl.kind === 'spike') {
      const hand = p.h + REACH_UP + 0.1, ok = p.air && d < 0.95 && Math.abs(b.h - hand) < 0.42;
      if (hum(p)) {
        S.hitWin = ok;
        if (ok && S.zPress) { S.zPress = false; touch(p, 'spike'); return; }
        // finestra finita senza Z: palla di là in qualche modo
        if (p.air && d < 1.1 && b.h < hand - 0.4 && b.vy < 0) { touch(p, 'over'); T.attacker = null; return; }
      } else if (ok && (b.vy < 0 || b.h > hand - 0.1)) { touch(p, 'spike'); return; }
      continue;
    }
    // tocchi bassi e alzata: quando la palla scende all'altezza giusta vicino al giocatore
    if (b.vy < 0 && b.h <= pl.hc + 0.12 && b.h > 0.15) {
      const reach = REACH + LAT + (pl.kind === 'pass' ? (p.human ? 0.55 : DIVE * 0.55) : 0.3);
      if (d <= reach && !(p.air && pl.kind === 'pass')) {
        // difesa su schiacciata: più la palla è veloce e lontana, più è difficile tenerla (una prova per palla)
        const spd = Math.hypot(b.vx, b.vy, b.vz);
        if (pl.kind === 'pass' && spd > 14 && p.tryVer !== b.ver) {
          p.tryVer = b.ver;
          const ok = hum(p) ? (d <= REACH + LAT ? 1 : 0.6) : (d <= REACH ? 0.88 : d <= REACH + LAT ? 0.62 : 0.32) * (1 - 0.25 * fatigue(p));
          p.tryOk = Math.random() < ok;
        }
        if (pl.kind === 'pass' && spd > 14 && !p.tryOk) { p.act = 'dive'; p.actT = 0.6; continue; }
        if (!hum(p) && pl.kind === 'pass' && spd <= 14 && d > REACH + LAT && Math.random() < 0.35) continue;   // tuffo non riuscito
        // battute flottanti e sky ball: ricezione più difficile
        if (pl.kind === 'pass' && b.last === S.server && !S.receiverTouched && p.tryVer !== b.ver) {
          p.tryVer = b.ver; const K = SERVES[S.kind] || {};
          p.tryOk = Math.random() > (K.wob ? 0.05 + K.wob * 0.03 : 0) + (K.sky ? 0.15 : 0) + (K.top ? 0.08 : 0) - (hum(p) ? 0.1 : 0);
        }
        if (pl.kind === 'pass' && b.last === S.server && !S.receiverTouched && !p.tryOk) {
          // ricezione sbagliata: la palla schizza via (conta come primo tocco, i compagni possono rincorrerla)
          p.act = 'pass'; p.actT = 0.5; b.vx *= -0.25; b.vz += rnd(-2, 2); b.vy = Math.abs(b.vy) * 0.35 + 2; b.ver++; b.team = T; b.last = p; b.kind = 'pass'; T.touches = 1; other(T).touches = 0;
          S.receiverTouched = true; T.st[p.ni].err++; T.st[p.ni].t++; say('RICEZIONE SBAGLIATA', 1); return;
        }
        // alzatore vicino alla rete: ogni tanto attacco di seconda (SURPRISE ATTACK); tu: Z mentre alzi
        if (pl.kind === 'set' && Math.abs(p.x) < 1.6 && !BEACH && ((hum(p) && S.zPress) || (!hum(p) && Math.random() < 0.06))) { S.zPress = false; touch(p, 'dump'); return; }
        if (pl.kind === 'set' && hum(p) && S.zPress) { S.zPress = false; touch(p, 'dump'); return; }
        touch(p, pl.kind); return;
      }
    }
  }
}
function blockCheck(prevX) {
  const b = ball;
  if (!b.live || Math.sign(prevX) === Math.sign(b.x) && Math.abs(b.x) > 0.3) return false;
  const D = teams.find(t => t.side * b.vx > 0);   // squadra verso cui va la palla
  if (!D || b.team === D) return false;
  for (const p of D.players) {
    if (!p.air || Math.abs(p.x) > 0.9) continue;
    const top = p.h + REACH_UP + 0.12;
    if (Math.abs(p.z - b.z) < 0.55 && b.h < top && b.h > NET - 0.2 && (p.human || Math.random() < 0.55)) {
      b.vx = -b.vx * 0.4; b.vz *= 0.5; b.vy = Math.abs(b.vy) * 0.2 + 1.2; b.x = -D.side * 0.25;
      b.team = D; b.last = p; D.touches = 0; other(D).touches = 0; b.ver++; b.top = 0; b.kind = 'block';
      p.act = 'block'; say(p === me ? 'MURO! BRAVO!' : 'MURO!', 1.2); S.blocker = p;
      return true;
    }
  }
  return false;
}

// ---------------- cambi (X) e time-out (R) a palla ferma ----------------
function aiSubs(T) {
  if (BEACH || T.subs >= MAX_SUBS) return;
  for (const p of T.players) {
    if (p.human || T.en[p.ni] > 50) continue;
    const onCourt = new Set(T.players.map(q => q.ni));
    let best = -1;
    for (let ni = 0; ni < T.roster.length; ni++) if (!onCourt.has(ni) && T.en[ni] > T.en[p.ni] + 20 && (best < 0 || T.en[ni] > T.en[best])) best = ni;
    if (best >= 0) { doSub(T, p, best); say('CAMBIO ' + T.name + ': ENTRA ' + T.roster[best].name, 1.6); }
  }
}
function doSub(T, p, ni) { p.ni = ni; T.subs++; dress(p); }
function callTimeout(T) {
  if (T.to >= 1 || (S.state !== 'dead' && S.state !== 'serve')) return false;
  T.to++; S.state = 'timeout'; S.t = 0;
  for (const p of T.players) T.en[p.ni] = Math.min(100, T.en[p.ni] + FAT.timeout);
  if (SAND) SAND.rake = 1.6;
  say('TIME-OUT ' + T.name + (SAND ? ': SI SPIANA LA SABBIA' : ''), 3);
  for (const t of teams) for (const p of t.players) { p.act = null; }
  return true;
}
const SUB = { open: false, out: 0, inn: 0 };
function subOpen() {
  if (BEACH || (S.state !== 'dead' && S.state !== 'serve') || (S.state === 'serve' && S.phase === 'toss')) return;
  const T = me.team;
  if (T.subs >= MAX_SUBS) { say('CAMBI FINITI (' + MAX_SUBS + ' PER SET)', 1.5); return; }
  SUB.open = true; SUB.out = T.players.findIndex(p => !p.human); SUB.inn = 0; subDraw();
}
function subKey(k) {
  const T = me.team, bench = T.roster.filter(R => !T.players.some(p => p.ni === R.ni)), court = T.players.filter(p => !p.human);
  if (k === 'up' || k === 'down') { let i = court.indexOf(T.players[SUB.out]); i = (i + (k === 'up' ? -1 : 1) + court.length) % court.length; SUB.out = T.players.indexOf(court[i]); }
  if (k === 'left' || k === 'right') SUB.inn = (SUB.inn + (k === 'left' ? -1 : 1) + bench.length) % bench.length;
  if (k === 'ok') { doSub(T, T.players[SUB.out], bench[SUB.inn].ni); say('CAMBIO: ENTRA ' + bench[SUB.inn].name, 1.5); SUB.open = false; }
  if (k === 'close') SUB.open = false;
  subDraw();
}
const bar = e => `<span class="bar"><i style="width:${e}%;background:${e > 60 ? '#3ad070' : e > 35 ? '#f0c030' : '#e04030'}"></i></span>`;
const errPct = (T, ni) => { const s = T.st[ni]; return s.t ? Math.round(s.err / s.t * 100) : 0; };
function subDraw() {
  const el = $('subs'); el.style.display = SUB.open ? '' : 'none'; if (!SUB.open) return;
  const T = me.team, bench = T.roster.filter(R => !T.players.some(p => p.ni === R.ni));
  let h = `<h3>CAMBI (${T.subs}/${MAX_SUBS}) · ↑ ↓ chi esce · ← → chi entra · Z conferma · X chiudi</h3><table>`;
  for (const p of T.players) { const sel = T.players[SUB.out] === p; h += `<tr class="${sel ? 'sel' : ''}${p.human ? ' me' : ''}"><td>${sel ? '▶' : ''}</td><td>${p.num}</td><td>${p.name}</td><td>${bar(Math.round(T.en[p.ni]))} ${Math.round(T.en[p.ni])}%</td><td>err ${errPct(T, p.ni)}%</td></tr>`; }
  h += '</table><h3>PANCHINA</h3><table>';
  bench.forEach((R, i) => { h += `<tr class="${i === SUB.inn ? 'sel' : ''}"><td>${i === SUB.inn ? '▶' : ''}</td><td>${R.num}</td><td>${R.name}</td><td>${bar(Math.round(T.en[R.ni]))} ${Math.round(T.en[R.ni])}%</td><td>err ${errPct(T, R.ni)}%</td></tr>`; });
  el.innerHTML = h + '</table>';
}
// riquadro energia ed errori (a palla ferma, I per nasconderlo) e statistiche di fine set
function showStats(end) {
  const el = $('stats');
  if (!end && (!S.statsOn || !(S.state === 'dead' || S.state === 'timeout' || (S.state === 'serve' && S.phase !== 'toss')))) { el.style.display = 'none'; return; }
  el.style.display = '';
  const team = T => {
    let h = `<h3>${T.name}${end ? '' : ' · ENERGIA ED ERRORI'}</h3><table>`;
    if (end) h += '<tr class="hd"><td></td><td>punti</td><td>attacchi</td><td>muri</td><td>ace</td><td>errori</td><td>energia</td></tr>';
    for (const R of T.roster) {
      const s = T.st[R.ni], on = T.players.some(p => p.ni === R.ni);
      if (!end && !on) continue;
      h += end ? `<tr><td>${R.num} ${R.name}</td><td>${s.pts}</td><td>${s.kill}</td><td>${s.blk}</td><td>${s.ace}</td><td>${s.err}</td><td>${Math.round(T.en[R.ni])}%</td></tr>`
        : `<tr><td>${R.num} ${R.name}</td><td>${bar(Math.round(T.en[R.ni]))}</td><td>${Math.round(T.en[R.ni])}%</td><td>err ${errPct(T, R.ni)}%</td></tr>`;
    }
    return h + '</table>';
  };
  el.innerHTML = end ? team(teams[0]) + team(teams[1]) : team(me.team);
  el.classList.toggle('end', !!end);
}

// ---------------- passo di simulazione (1/120 s come nel gioco) ----------------
function step(dt) {
  S.t += dt;
  const b = ball;
  sandUpdate(dt);
  if (SUB.open) return;   // pannello dei cambi aperto: tutto fermo
  if (S.state === 'timeout') { if (S.t > 3.2) startServe(); return; }
  if (S.state === 'serve') {
    const sv = S.server, T = sv.team;
    if (S.phase === 'walk') {
      const dx = T.side * SERVE_X - sv.x, dz = T.side * 1.2 - sv.z, d = Math.hypot(dx, dz);
      if (d > 0.05 && !hum(sv)) { const s = Math.min(d, RUN * dt); sv.x += dx / d * s; sv.z += dz / d * s; sv.spd = RUN; }
      if (hum(sv)) { sv.x = T.side * SERVE_X; }
      if (d < 0.06 || hum(sv)) { S.phase = 'ready'; S.t = 0; }
    } else if (S.phase === 'ready') {
      if ((hum(sv) && S.zPress) || (!hum(sv) && S.t > 1.5)) {
        S.zPress = false; S.phase = 'toss'; S.t = 0; S.kind = hum(sv) ? serveKindFromInput() : aiServeKind();
        const K = SERVES[S.kind];
        b.held = null; b.vy = K.toss; b.vx = -T.side * K.fwd; b.vz = 0; sv.act = 'toss'; sv.actT = K.jump ? 0.5 : 1.2;
        if (K.sky) { b.h = 0.9; sv.act = 'pass'; }
        if (hum(sv)) say(K.name, 1);
      }
    } else if (S.phase === 'toss') {
      const K = SERVES[S.kind];
      b.vy -= G * dt; b.x += b.vx * dt; b.h += b.vy * dt;
      if (K.jump) {
        // rincorsa e stacco automatici: il battitore va sotto la palla e salta per colpirla in cima al salto
        const tHit = timeToH(b.h, b.vy, sv.h + REACH_UP + JUMP_H * K.jump + 0.05);
        if (!sv.air && S.t > K.run) {
          const tx = b.x + b.vx * (tHit || 0) + T.side * 0.25, d = tx - sv.x;
          if (Math.abs(d) > 0.03) { const s = Math.min(Math.abs(d), RUN * 1.5 * dt); sv.x += Math.sign(d) * s; sv.spd = RUN * 1.4; }
          sv.z = lerp(sv.z, b.z, dt * 4);
          if (tHit !== null && tHit <= JUMP_T * Math.sqrt(K.jump) + 0.02) jump(sv, 'load', Math.sqrt(K.jump));
        }
        const hand = sv.h + REACH_UP + 0.1;
        S.hitWin = sv.air && Math.abs(b.h - hand) < 0.42 && Math.abs(b.x - sv.x) < 0.9;
      } else if (K.sky) S.hitWin = b.vy < 0 && b.h < 1.25 && b.h > 0.6;
      else S.hitWin = b.h > 2.55 && b.h < 3.45 && S.t > 0.3;
      if (S.hitWin && ((hum(sv) && S.zPress) || (!hum(sv) && (K.jump ? b.vy < 0.5 : K.sky ? b.h < 1.05 : b.vy < rnd(-0.5, 1.5))))) { S.zPress = false; S.hitWin = false; serveHit(sv); }
      else if (b.h < (K.sky ? 0.4 : 1.2) && b.vy < 0) { S.hitWin = false; point(other(T), 'BATTUTA SBAGLIATA', sv, 'err'); }
      if (!hum(sv) && (sv.air || sv.h > 0)) movePlayer(sv, dt);
    }
    if (b.held) { const h = b.held; b.x = h.x - h.team.side * 0.35; b.z = h.z - 0.2 * h.team.side; b.h = 1.15; }
    for (const t of teams) for (const p of t.players) if (p !== sv || hum(p)) movePlayer(p, dt);
    return;
  }
  if (S.state === 'rally') {
    if (b.ver !== S.lastVer) { S.lastVer = b.ver; S.verAge = 0; } else S.verAge += dt;
    for (const t of teams) think(t);
    S.autoAppr = false;
    const mp = me.team.plan;
    if (hum(me) && mp && mp.p === me && mp.kind === 'spike' && !me.air) {
      // rincorsa e stacco automatici se sei vicino al punto di colpo (come nel gioco)
      const d = Math.hypot(me.x - mp.xc, me.z - mp.zc);
      // FINTA: Z prima della rincorsa = finto salto (il muro avversario salta), poi il salto vero
      if (S.zPress && mp.tc > 0.85 && me.fakeVer !== ball.ver && !BEACH) { S.zPress = false; me.fakeVer = ball.ver; jump(me, 'load', 0.5); say('FINTA!', 1); }
      else if (d < 1.2 && mp.tc <= JUMP_T + 0.02 && mp.tc > 0.15) { const k = Math.min(1, dt * 8); me.x = lerp(me.x, mp.xc, k); me.z = lerp(me.z, mp.zc, k); jump(me, 'load'); }
      else if (d < 4.6 && mp.tc < 1.0) { S.autoAppr = true; const sp = speedOf(me) * 1.7, s = Math.min(d, sp * dt); if (d > 0.05) { me.x += (mp.xc - me.x) / d * s; me.z += (mp.zc - me.z) / d * s; me.spd = sp; } }
    }
    // Z mentre i compagni ricevono = chiedi il PRIMO TEMPO (palla veloce vicino all'alzatore)
    if (hum(me) && S.zPress && ball.team === me.team && me.team.touches === 1 && !(mp && mp.p === me) && !BEACH) { S.zPress = false; S.quickReq = true; say('PRIMO TEMPO!', 1); }
    for (const t of teams) for (const p of t.players) movePlayer(p, dt);
    // Z senza un colpo da fare: salto (muro vicino alla rete)
    if (S.zPress && !(mp && mp.p === me && (mp.kind === 'spike' || mp.kind === 'set'))) { S.zPress = false; jump(me, Math.abs(me.x) < 1.6 ? 'block' : 'jump'); }
    const px = b.x;
    // flottante: la palla balla di lato; con la rotazione in avanti scende prima
    if (b.wob) b.vz += Math.sin(S.t * 9 + b.wobPh) * b.wob * dt * 3;
    if (b.ghost) b.ghostZ += b.ghostDir * dt * 1.8;   // PHANTOM: la seconda palla si allontana di lato
    b.vy -= (G + (b.top || 0)) * dt; b.x += b.vx * dt; b.z += b.vz * dt; b.h += b.vy * dt;
    // rete e antenne
    if (Math.sign(px) !== Math.sign(b.x) && px !== 0) {
      if (!blockCheck(px)) {
        if (Math.abs(b.z) > CW + 0.1) { point(other(b.team), 'FUORI DALLE ANTENNE', b.last, 'err'); return; }
        if (b.h < NET + BALL_R) { b.vx = -b.vx * 0.2; b.x = px > 0 ? 0.2 : -0.2; b.vy = Math.min(b.vy, 0); say('RETE', 1); S.netBy = b.last; }
      }
    }
    contacts();
    if (b.h <= BALL_R) {
      b.h = BALL_R;
      if (SAND) { sandStamp(b.x, b.z, 0.17, 0.035, 0.014); splash(b.x, b.z, 36, 1.2); }
      const inside = Math.abs(b.x) <= HALF + BALL_R && Math.abs(b.z) <= CW + BALL_R;
      const L = b.last, lastSide = L ? L.team : null;
      if (inside) {
        const T = teams.find(t => t.side * b.x > 0) || teams[0], W = other(T);
        // chi ha fatto il punto: ace (battuta mai toccata), muro, attacco
        let what = null;
        if (L && L.team === W) what = b.kind === 'serve' && !S.receiverTouched ? 'ace' : b.kind === 'block' ? 'blk' : b.kind === 'spike' || b.kind === 'dump' ? 'kill' : null;
        else if (L) what = 'err';   // palla caduta nel proprio campo dopo il proprio tocco (rete, ricezione sbagliata)
        point(W, what === 'ace' ? 'ACE!' : what === 'blk' ? 'MURO VINCENTE' : 'PALLA A TERRA', L, what);
      } else point(lastSide ? other(lastSide) : teams[0], 'FUORI', L, 'err');
      S.blocker = null;
    }
    return;
  }
  // palla ferma: rimbalza un po' e rotola
  if (S.state === 'dead' || S.state === 'end') {
    b.vy -= G * dt; b.x += b.vx * dt; b.z += b.vz * dt; b.h += b.vy * dt;
    if (b.h < BALL_R) { b.h = BALL_R; b.vy = Math.abs(b.vy) * 0.45; b.vx *= 0.7; b.vz *= 0.7; }
    for (const t of teams) for (const p of t.players) { if (p.air) movePlayer(p, dt); if (p.actT > 0) p.actT -= dt; }
    if (S.state === 'dead' && S.t > 2.6) startServe();
  }
}
// scossa della telecamera (schiacciate potenti, thunder)
function shake(t) { S.shakeT = Math.max(S.shakeT || 0, t); }

// ---------------- visuali (V o i tasti 1-6) ----------------
const CAMS = [
  { id: 'eyes', name: 'OCCHI (prima persona)' }, { id: 'eyesBody', name: 'PRIMA PERSONA CON IL CORPO' },
  { id: 'face', name: 'IL TUO VOLTO' }, { id: 'full', name: 'CORPO INTERO' },
  { id: 'shoulders', name: 'DIETRO LE SPALLE' }, { id: 'tv', name: 'TELEVISIONE' }
];
function setCam(i) { S.cam = (i + CAMS.length) % CAMS.length; S.camMsg = 'VISUALE ' + (S.cam + 1) + ': ' + CAMS[S.cam].name; S.camT = 1.6; }
function nextCam(d) { setCam(S.cam + d); }

// ---------------- disegno ----------------
const tmpV = new THREE.Vector3();
let camPos = new THREE.Vector3(-8, 1.8, 0), camLook = new THREE.Vector3(0, 1.5, 0);
function draw(dt) {
  const b = ball;
  ballMesh.position.set(b.x, b.h, b.z);
  ballMesh.rotation.z -= (b.spin || 4) * dt; ballMesh.rotation.x += 2 * dt;
  const red = S.hitWin;
  ballMesh.material.emissive.setHex(red ? 0xd01010 : b.thunder ? (Math.random() < 0.5 ? 0xffd020 : 0x806000) : 0x000000);
  // PHANTOM: la palla finta sparisce quando la vera arriva nel campo di chi riceve
  const rs = b.team ? -b.team.side : 0;
  ghostMesh.visible = !!b.ghost && b.live && b.x * rs < 2.5;
  if (ghostMesh.visible) { ghostMesh.position.set(b.x, b.h + Math.sin(S.t * 7) * 0.1, b.z + b.ghostZ); ghostMesh.material.opacity = clamp(0.85 - (b.x * rs + 6) / 12, 0.15, 0.85); }
  trailPos.unshift([b.x, b.h, b.z]); trailPos.length = trail.length;
  trail.forEach((m, i) => { const q = trailPos[i]; m.visible = !!b.thunder && b.live && !!q; if (m.visible) m.position.set(q[0], q[1], q[2]); });
  splashUpdate(dt);
  // giocatori: posizione, direzione (verso la palla, di solito verso la rete) e posa
  for (const t of teams) for (const p of t.players) {
    const R = p.body.root;
    R.position.set(p.x, p.h, p.z);
    const fx = b.x - p.x, fz = b.z - p.z;
    let yaw = Math.atan2(fx, fz);
    const net = Math.atan2(-t.side, 0);   // verso la rete
    let dy = ((yaw - net + Math.PI * 3) % (Math.PI * 2)) - Math.PI; dy = clamp(dy, -1.2, 1.2);
    yaw = net + dy;
    if (p.spd > 0.5 && !p.air && p !== me) { const h = p.lastMove; if (h !== undefined) yaw = h; }
    p.yaw = p.yaw + (((yaw - p.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 10);
    R.rotation.y = p.yaw;
    let P;
    if (p.act && POSE[p.act]) P = POSE[p.act];
    else if (p.air) P = POSE.jump;
    else if (p.spd > 0.5) { p.ph += dt * p.spd * 2.4; P = runPose(p.ph, clamp(p.spd / RUN, 0.4, 1)); }
    else P = S.state === 'rally' || S.state === 'serve' ? POSE.ready : POSE.stand;
    if (p.act === 'cheer') { P = Object.assign({}, POSE.cheer, { crouch: -Math.abs(Math.sin(S.t * 9)) * 0.06 }); }
    applyPose(p, P, Math.min(1, dt * (p.act === 'hit' ? 26 : 12)));
    // nome
    p.label.visible = S.names > 0 && !(p === me && /eyes|face/.test(CAMS[S.cam].id));
    p.label.position.set(p.x, S.names === 1 ? p.h + 2.25 : 0.12, p.z);
  }
  // in prima persona la tua testa non si vede (si vedono braccia e gambe)
  me.body.J.headMesh.visible = CAMS[S.cam].id !== 'eyes';
  // cerchio: dove andare per il prossimo tocco (o rosso quando è il momento di schiacciare)
  const mp = me.team.plan;
  ring.visible = !!(mp && mp.p === me) || (S.state === 'serve' && S.server === me);
  if (mp && mp.p === me) { ring.position.x = mp.xc; ring.position.z = mp.zc; }
  else if (S.state === 'serve' && S.server === me) { ring.position.x = me.x; ring.position.z = me.z; }
  ring.material.color.setHex(red ? 0xff3020 : 0x3a9aff);
  // punto di caduta della palla
  const tl = b.live ? timeToH(b.h, b.vy, BALL_R) : null;
  landDot.visible = !!tl && S.state === 'rally';
  if (tl) landDot.position.set(b.x + b.vx * tl, 0.011, b.z + b.vz * tl);
  // telecamera
  const side = me.team.side;
  let eye, look;
  // direzione dello sguardo verso la palla (testa che gira al massimo ~80° dalla rete)
  const gaze = from => {
    const toB = new THREE.Vector3(b.x - from.x, b.h - from.y, b.z - from.z);
    let yaw = Math.atan2(toB.z, toB.x), base = side < 0 ? 0 : Math.PI;
    let dy = ((yaw - base + Math.PI * 3) % (Math.PI * 2)) - Math.PI; dy = clamp(dy, -1.35, 1.35);
    yaw = base + dy * 0.85;
    const hd = Math.hypot(toB.x, toB.z), pitch = clamp(Math.atan2(toB.y, hd), -0.55, 1.15) * 0.85;
    return new THREE.Vector3(Math.cos(yaw) * Math.cos(pitch), Math.sin(pitch), Math.sin(yaw) * Math.cos(pitch));
  };
  const J = me.body.J; J.head.updateWorldMatrix(true, false);
  const headW = new THREE.Vector3(0, 0.1, 0).applyMatrix4(J.head.matrixWorld);
  const fwd = new THREE.Vector3(Math.sin(me.yaw), 0, Math.cos(me.yaw));   // dove guarda il tuo corpo
  const V = CAMS[S.cam].id;
  if (V === 'eyes') {
    // occhi del giocatore
    eye = new THREE.Vector3(0, 0.12, 0.09).applyMatrix4(J.head.matrixWorld);
    look = eye.clone().add(gaze(eye).multiplyScalar(5));
    camPos.copy(eye); camLook.lerp(look, Math.min(1, dt * 9));
  } else if (V === 'eyesBody') {
    // prima persona con il corpo: appena dietro e sopra la testa, vedi spalle, braccia e gambe sotto di te
    eye = headW.clone().addScaledVector(fwd, -0.62); eye.y += 0.42;
    const g = gaze(eye); g.y = Math.min(g.y, 0.2) - 0.38;
    look = eye.clone().add(g.normalize().multiplyScalar(5));
    camPos.lerp(eye, Math.min(1, dt * 14)); camLook.lerp(look, Math.min(1, dt * 9));
  } else if (V === 'face') {
    // il tuo volto: telecamera davanti a te, di tre quarti, con il campo alle spalle
    const sideV = new THREE.Vector3(-fwd.z, 0, fwd.x);
    eye = headW.clone().addScaledVector(fwd, 0.95).addScaledVector(sideV, 0.32); eye.y += 0.03;
    look = headW.clone(); look.y -= 0.18;
    camPos.lerp(eye, Math.min(1, dt * 8)); camLook.lerp(look, Math.min(1, dt * 12));
  } else if (V === 'full') {
    // corpo intero: dietro e di lato, tutto il giocatore in vista con la rete davanti
    eye = new THREE.Vector3(me.x + side * 3.4, 1.5, me.z + (me.z > 0 ? -1.5 : 1.5));
    look = new THREE.Vector3(me.x - side * 0.5, 0.95 + me.h * 0.8, me.z);
    camPos.lerp(eye, Math.min(1, dt * 6)); camLook.lerp(look, Math.min(1, dt * 8));
  } else if (V === 'shoulders') {
    // dietro le spalle
    eye = new THREE.Vector3(me.x + side * 3.4, me.h + 2.6, me.z * 0.85);
    look = new THREE.Vector3(lerp(me.x, b.x, 0.5), Math.max(1.6, b.h * 0.6), lerp(me.z, b.z, 0.4));
    camPos.lerp(eye, Math.min(1, dt * 5)); camLook.lerp(look, Math.min(1, dt * 6));
  } else {
    // televisione: di lato, in alto
    eye = new THREE.Vector3(b.x * 0.5, 7.5, 17); look = new THREE.Vector3(b.x * 0.7, 1, 0);
    camPos.lerp(eye, Math.min(1, dt * 3)); camLook.lerp(look, Math.min(1, dt * 4));
  }
  camera.position.copy(camPos); camera.lookAt(camLook);
  if (S.shakeT > 0) { S.shakeT -= dt; const k = S.shakeT * 0.12; camera.position.x += rnd(-k, k); camera.position.y += rnd(-k, k); }
  // pubblico: salta dopo i punti
  if (S.state === 'dead' || S.state === 'end') {
    const m = new THREE.Matrix4();
    for (const c of crowd) { const j = Math.max(0, Math.sin(S.t * 10 + c.ph)) * 0.18; m.makeTranslation(c.px, c.py + j, c.pz); crowd.bodies.setMatrixAt(c.k, m); m.makeTranslation(c.px, c.py + 0.43 + j, c.pz); crowd.heads.setMatrixAt(c.k, m); }
    crowd.bodies.instanceMatrix.needsUpdate = crowd.heads.instanceMatrix.needsUpdate = true; crowd.jumping = true;
  } else if (crowd.jumping) {
    const m = new THREE.Matrix4();
    for (const c of crowd) { m.makeTranslation(c.px, c.py, c.pz); crowd.bodies.setMatrixAt(c.k, m); m.makeTranslation(c.px, c.py + 0.43, c.pz); crowd.heads.setMatrixAt(c.k, m); }
    crowd.bodies.instanceMatrix.needsUpdate = crowd.heads.instanceMatrix.needsUpdate = true; crowd.jumping = false;
  }
  renderer.render(scene, camera);
  hud();
}
// direzione di corsa (per girare il corpo mentre corre)
function trackMoves() { for (const t of teams) for (const p of t.players) { const dx = p.x - (p.px ?? p.x), dz = p.z - (p.pz ?? p.z); if (Math.hypot(dx, dz) > 0.002) p.lastMove = Math.atan2(dx, dz); p.px = p.x; p.pz = p.z; } }

// ---------------- interfaccia ----------------
const $ = id => document.getElementById(id);
const mapC = $('map').getContext('2d');
function hud() {
  const [A, B] = teams;
  const logo = t => TEAMS[t.code].logo ? `<img src="${TEAMS[t.code].logo}" alt="">` : '';
  const sc = `${A.code}${A.score}${S.serving === A}${B.score}`;
  if (S.scoreKey !== sc) { S.scoreKey = sc; $('score').innerHTML = `${logo(A)}<span class="${S.serving === A ? 'srv' : ''}">${A.name} ${A.score}</span> &nbsp;-&nbsp; <span class="${S.serving === B ? 'srv' : ''}">${B.score} ${B.name}</span>${logo(B)}`; }
  $('msg').textContent = S.camT > 0 ? S.camMsg : S.msgT > 0 || S.state === 'end' ? S.msg : '';
  let h = '', now = false;
  const mp = me.team.plan;
  if (S.inSetup) h = '';
  else if (S.paused) h = 'PAUSA (P per riprendere)';
  else if (S.state === 'end') h = 'INVIO = ' + (S.lastCamp ? 'classifica e prossima partita' : 'nuova partita') + '   ·   ESC = torna al gioco';
  else if (S.state === 'serve' && S.server === me) {
    h = S.phase === 'toss' ? (S.hitWin ? 'Z ADESSO! (↑ lunga, ↓ corta, ← → lato)' : SERVES[S.kind].name + ': Z quando la palla diventa ROSSA')
      : 'BATTI TU - Z lancia. Tieni: niente = dall\'alto · ↑ in salto · ↓ salto flottante · ← SKY BALL · → PHANTOM · ↑+←/→ THUNDER';
    now = S.hitWin;
  } else if (S.state === 'serve') h = S.serving === me.team ? 'Batte un compagno: preparati a difendere' : 'Ricezione: vai sul cerchio blu se la palla viene da te';
  else if (mp && mp.p === me) {
    if (mp.kind === 'spike') { h = S.hitWin ? 'Z ADESSO! (← → mira, ↑ pallonetto, ↓ potente)' : 'SCHIACCIA TU: vai vicino al cerchio, salto automatico' + (BEACH ? '' : ' · Z subito = FINTA'); now = S.hitWin; }
    else h = mp.kind === 'pass' ? 'RICEZIONE: mettiti sul cerchio blu (il bagher è automatico)' : 'ALZI TU: mettiti sotto la palla (cerchio blu) · Z = attacco di seconda';
  } else if (S.state === 'rally' && ball.team === me.team && me.team.touches === 1 && !BEACH) {
    h = 'ALZATA IN ARRIVO: tieni ↑ palla alta · ↓ veloce · Z = PRIMO TEMPO · oltre i 3 m = SECONDA LINEA';

  } else if (ball.team && ball.team !== me.team && other(me.team).attacker && Math.abs(me.x) < 1.6) h = 'MURO: Z quando lo schiacciatore salta';
  else h = '';
  if (S.state === 'dead' && !h) h = (BEACH ? '' : 'X = cambi · ') + 'R = time-out · I = energia ed errori';
  const el = $('hint'); el.textContent = h; el.style.display = h ? '' : 'none'; el.classList.toggle('now', now);
  // mappa dall'alto
  const W = 360, H = 200, k = 17, ox = W / 2, oz = H / 2;
  mapC.clearRect(0, 0, W, H);
  mapC.fillStyle = BEACH ? '#d8bc80' : '#c8682e'; mapC.fillRect(ox - HALF * k, oz - CW * k, 2 * HALF * k, 2 * CW * k);
  mapC.strokeStyle = '#fff'; mapC.lineWidth = 2; mapC.strokeRect(ox - HALF * k, oz - CW * k, 2 * HALF * k, 2 * CW * k);
  mapC.beginPath(); mapC.moveTo(ox, oz - CW * k - 8); mapC.lineTo(ox, oz + CW * k + 8); mapC.stroke();
  for (const t of teams) for (const p of t.players) { mapC.fillStyle = p === me ? '#ffe030' : t === me.team ? '#4a7aff' : '#3ac04a'; mapC.beginPath(); mapC.arc(ox + p.x * k, oz + p.z * k, p === me ? 7 : 5, 0, 7); mapC.fill(); }
  mapC.fillStyle = '#fff'; mapC.beginPath(); mapC.arc(ox + ball.x * k, oz + ball.z * k, 4 + ball.h, 0, 7); mapC.fill();
}

// ---------------- comandi: tastiera, gamepad, touch ----------------
const KEYMAP = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd' };
addEventListener('keydown', e => {
  // pannello dei cambi aperto: le frecce scelgono, Z conferma, X o ESC chiude
  if (SUB.open) {
    const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', z: 'ok', Z: 'ok', ' ': 'ok', Enter: 'ok', x: 'close', X: 'close', Escape: 'close' }[e.key];
    if (m && !e.repeat) subKey(m); e.preventDefault(); return;
  }
  if (KEYMAP[e.key]) { input[KEYMAP[e.key]] = true; e.preventDefault(); }
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === 'z' || k === ' ') { S.zPress = true; S.zT = 0.25; e.preventDefault(); }
  if (k === 'v') nextCam(e.shiftKey ? -1 : 1);
  if (k >= '1' && k <= String(CAMS.length)) setCam(Number(k) - 1);
  if (k === 'n') S.names = (S.names + 1) % 3;
  if (k === 'p') S.paused = !S.paused;
  if (k === 'b') { const u = new URL(location.href); if (BEACH) u.searchParams.delete('beach'); else u.searchParams.set('beach', '1'); location.href = u.href; }
  if (k === 'x') subOpen();
  if (k === 'r') { if (!callTimeout(me.team)) say(me.team.to >= 1 ? 'TIME-OUT GIÀ USATO IN QUESTO SET' : 'TIME-OUT SOLO A PALLA FERMA', 1.4); }
  if (k === 'i') { S.statsOn = !S.statsOn; showStats(); }
  if (k === 'l') { S.slow = !S.slow; say(S.slow ? 'AL RALLENTATORE' : 'VELOCITÀ NORMALE', 1.2); }
  if (k === 'f') { const u = new URL(location.href); u.searchParams.set('women', WOMEN ? '0' : '1'); location.href = u.href; }
  if (k === 'h') $('help').style.display = $('help').style.display === 'none' ? '' : 'none';
  if (k === 'enter' && S.state === 'end') openSetup();
  if (k === 'm' && !S.inSetup) openSetup();
  if (k === 'escape') location.href = '../index.html';
});
addEventListener('keyup', e => { if (KEYMAP[e.key]) input[KEYMAP[e.key]] = false; });
let padPrev = {};
function pollPad() {
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(g => g) : null;
  if (!gp) return;
  const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0, B = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
  input.l = ax < -0.4 || B(14); input.r = ax > 0.4 || B(15); input.u = ay < -0.4 || B(12); input.d = ay > 0.4 || B(13);
  const now = { a: B(0), v: B(3), st: B(9) };
  if (now.a && !padPrev.a) { S.zPress = true; S.zT = 0.25; }
  if (now.v && !padPrev.v) nextCam(1);
  if (now.st && !padPrev.st && S.state === 'end') openSetup();
  padPrev = now;
}
// touch: joystick a sinistra, Z, V e START a destra
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  document.body.classList.add('touch');
  const st = $('stick'), kn = $('knob');
  let id = null;
  const set = (x, y) => { const r = st.getBoundingClientRect(), dx = clamp(x - r.left - 65, -45, 45), dy = clamp(y - r.top - 65, -45, 45); kn.style.left = 40 + dx + 'px'; kn.style.top = 40 + dy + 'px'; input.l = dx < -15; input.r = dx > 15; input.u = dy < -15; input.d = dy > 15; };
  st.addEventListener('pointerdown', e => { id = e.pointerId; st.setPointerCapture(id); set(e.clientX, e.clientY); });
  st.addEventListener('pointermove', e => { if (e.pointerId === id) set(e.clientX, e.clientY); });
  st.addEventListener('pointerup', () => { id = null; kn.style.left = kn.style.top = '40px'; input.l = input.r = input.u = input.d = false; });
  $('ta').addEventListener('pointerdown', e => { e.preventDefault(); S.zPress = true; S.zT = 0.25; });
  $('tv').addEventListener('pointerdown', e => { e.preventDefault(); nextCam(1); });
  $('ts').addEventListener('pointerdown', e => { e.preventDefault(); if (SUB.open) subKey('ok'); else if (S.state === 'end') openSetup(); else S.paused = !S.paused; });
  $('tx').addEventListener('pointerdown', e => { e.preventDefault(); if (SUB.open) subKey('close'); else subOpen(); });
  $('tr').addEventListener('pointerdown', e => { e.preventDefault(); callTimeout(me.team); });
}

function newGame() {
  for (const t of teams) {
    t.score = 0; t.srvI = 0; t.subs = 0; t.to = 0; t.en = t.en.map(() => 100); t.st = t.st.map(() => ({ pts: 0, err: 0, t: 0, ace: 0, blk: 0, kill: 0 }));
    for (const p of t.players) if (p.ni !== p.i) { p.ni = p.i; dress(p); }
  }
  if (SAND) { SAND.h.fill(0); SAND.dirty = true; }
  $('stats').classList.remove('end'); S.statsOn = true; S.streak = null;
  S.over = false; S.serving = Math.random() < 0.5 ? teams[0] : teams[1];
  me.x = -5; me.z = -2;
  startServe(); say((BEACH ? 'BEACH  ·  ' : '') + (WOMEN ? 'FEMMINILE  ·  ' : '') + teams[0].name + ' - ' + teams[1].name + '  ·  SET A ' + TARGET, 2.2);
  S.scoreKey = null; refLabel();
}

// ---------------- schermata iniziale: amichevole o campionato, con le squadre del gioco ----------------
const SETUP = { mode: 'friendly', a: 'ITA', b: 'BRA', camp: 0, cur: null };
try { Object.assign(SETUP, JSON.parse(localStorage.getItem('sf91_p3d_setup')) || {}); } catch (e) { /* */ }
const tname = c => TEAMS[c] ? TEAMS[c].name : c;
function teamSelect(id, cur, list) {
  const groups = list ? { '': list } : DATA.groups;
  let h = `<select id="${id}">`;
  for (const g in groups) {
    if (g) h += `<optgroup label="${g}">`;
    for (const c of groups[g]) { const T = TEAMS[c]; h += `<option value="${c}"${c === cur ? ' selected' : ''}>${T.name}${T.mine ? ' ★' : ''}</option>`; }
    if (g) h += '</optgroup>';
  }
  return h + '</select>';
}
function openSetup() {
  S.paused = true; S.inSetup = true;
  const el = $('setup'); el.style.display = '';
  // campionati maschili o femminili come la squadra scelta (se non ce ne sono, tutti)
  const camps = DATA.camps.filter(c => (c.sesso === 'F') === WOMEN).length ? DATA.camps.filter(c => (c.sesso === 'F') === WOMEN) : DATA.camps;
  const mine = DATA.my.map(d => `${String(d.cognome || d.nome).toUpperCase()} (${d.numero}) → ${tname(d.team)}${d.titolare !== false ? ' in campo' : ' in panchina'}`);
  let h = `<h2>SPIKE FEVER 3D · PRIMA PERSONA</h2>
    <div class="row"><button data-m="friendly" class="${SETUP.mode === 'friendly' ? 'on' : ''}">AMICHEVOLE</button><button data-m="camp" class="${SETUP.mode === 'camp' ? 'on' : ''}" ${camps.length ? '' : 'disabled'}>CAMPIONATO</button>
    <button data-x="beach">${BEACH ? 'PALAZZETTO' : 'BEACH'}</button><button data-x="women">${WOMEN ? 'MASCHILE' : 'FEMMINILE'}</button></div>`;
  if (SETUP.mode === 'friendly') {
    h += `<div class="row"><label>LA TUA SQUADRA ${teamSelect('selA', SETUP.a)}</label><label>AVVERSARIO ${teamSelect('selB', SETUP.b)}</label></div>`;
  } else {
    const c = camps[SETUP.camp % camps.length], st = campState(c);
    if (!st.mine || !c.teams.includes(st.mine)) st.mine = c.teams.includes(SETUP.a) ? SETUP.a : c.teams[0];
    const nx = campNext(c, st), tb = campTable(c, st);
    h += `<div class="row"><label>CAMPIONATO <select id="selC">${camps.map((x, i) => `<option value="${i}"${i === SETUP.camp % camps.length ? ' selected' : ''}>${x.nome}</option>`).join('')}</select></label>
      <label>LA TUA SQUADRA ${teamSelect('selM', st.mine, c.teams)}</label></div>
      <p class="next">${nx ? `GIORNATA ${c.giornate[nx.gi].numero}: <b>${tname(nx.g.casa)}</b> - <b>${tname(nx.g.ospite)}</b>` : 'CAMPIONATO FINITO!'}</p>
      <table class="tab"><tr><td></td><td>SQUADRA</td><td>PT</td><td>G</td><td>V</td><td>P</td><td>SET</td></tr>${tb.map((t, i) => `<tr class="${t.code === st.mine ? 'me' : ''}"><td>${i + 1}</td><td>${tname(t.code)}</td><td>${t.pts}</td><td>${t.g}</td><td>${t.w}</td><td>${t.l}</td><td>${t.sv}-${t.sp}</td></tr>`).join('')}</table>
      <div class="row"><button data-x="reset" class="red">RICOMINCIA IL CAMPIONATO</button></div>`;
    SETUP.cur = { c, st, nx };
    campSave(c, st);
  }
  h += `<p class="muted">Squadre: nazionali, club di squadre.json, le tue squadre dell'editor (★) e quelle dei campionati. ${DATA.sponsors.length ? 'Sponsor dell\'editor sui cartelloni. ' : ''}${DATA.refs.length ? 'Arbitro: ' + (DATA.refs[0].cognome || DATA.refs[0].nome) + '. ' : ''}</p>`;
  if (mine.length) h += `<p class="muted">I tuoi giocatori: ${mine.join(' · ')}. Se scegli la loro squadra, in campo sei tu.</p>`;
  h += `<div class="row"><button data-x="go" class="green">${SETUP.mode === 'camp' ? 'GIOCA LA PARTITA' : 'GIOCA'}</button><button data-x="back">TORNA AL GIOCO</button></div>`;
  el.innerHTML = h;
  el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { SETUP.mode = b.dataset.m; openSetup(); });
  const q = id => el.querySelector('#' + id);
  if (q('selA')) q('selA').onchange = e => { SETUP.a = e.target.value; };
  if (q('selB')) q('selB').onchange = e => { SETUP.b = e.target.value; };
  if (q('selC')) q('selC').onchange = e => { SETUP.camp = Number(e.target.value); openSetup(); };
  if (q('selM')) q('selM').onchange = e => { const { c, st } = SETUP.cur; st.mine = e.target.value; campSave(c, st); openSetup(); };
  el.querySelectorAll('[data-x]').forEach(b => b.onclick = () => {
    const x = b.dataset.x;
    if (x === 'beach' || x === 'women') { const u = new URL(location.href); if (x === 'beach') { if (BEACH) u.searchParams.delete('beach'); else u.searchParams.set('beach', '1'); } else u.searchParams.set('women', WOMEN ? '0' : '1'); saveSetup(); location.href = u.href; }
    if (x === 'reset') { const { c } = SETUP.cur; campSave(c, { mine: SETUP.cur.st.mine, res: {} }); openSetup(); }
    if (x === 'back') location.href = '../index.html';
    if (x === 'go') startFromSetup();
  });
}
function saveSetup() { try { localStorage.setItem('sf91_p3d_setup', JSON.stringify({ mode: SETUP.mode, a: SETUP.a, b: SETUP.b, camp: SETUP.camp })); } catch (e) { /* */ } }
function startFromSetup() {
  let a = SETUP.a, b = SETUP.b;
  if (SETUP.mode === 'camp') {
    const { st, nx } = SETUP.cur; if (!nx) return;
    a = st.mine; b = nx.g.casa === st.mine ? nx.g.ospite : nx.g.casa; S.campGame = SETUP.cur;
  } else { if (a === b) b = DATA.teams.find(c => c !== a); S.campGame = null; }
  S.lastCamp = SETUP.mode === 'camp';
  saveSetup();
  $('setup').style.display = 'none'; S.inSetup = false; S.paused = false;
  setupTeams(a, b); newGame();
}
// fine del set in campionato: risultato, altre gare della giornata e classifica
function campEnd(won) {
  const G = S.campGame; if (!G || !G.nx) return;
  campRecord(G.c, G.st, G.nx, won); S.campGame = null;
  say((won ? 'HAI VINTO! ' : 'SET PERSO. ') + 'INVIO = classifica e prossima partita', 99);
}

// ---------------- ciclo ----------------
let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  pollPad();
  if (!S.paused) {
    if (S.zT > 0) { S.zT -= dt; if (S.zT <= 0) S.zPress = false; }   // una pressione di Z vale per 0,25 s
    acc += dt * (S.slow ? 0.45 : 1);
    while (acc >= CFG.STEP) { step(CFG.STEP); acc -= CFG.STEP; }
    trackMoves();
    if (S.msgT > 0 && S.state !== 'end') S.msgT -= dt;
  }
  if (S.camT > 0) S.camT -= dt;
  S.statsT = (S.statsT || 0) + dt;
  if (S.statsT > 0.4 && S.state !== 'end') { S.statsT = 0; showStats(); }
  draw(S.paused ? 0 : dt);
  requestAnimationFrame(frame);
}
window.__DATA = DATA; window.__S = S; window.__ball = ball; window.__teams = teams; window.__input = input;
// prove: n passi di simulazione senza disegnare
window.__sim = n => { for (let i = 0; i < n; i++) { if (S.zT > 0) { S.zT -= CFG.STEP; if (S.zT <= 0) S.zPress = false; } step(CFG.STEP); if (i % 4 === 0) trackMoves(); if (S.msgT > 0) S.msgT -= CFG.STEP; } };
// dati del gioco (squadre, i miei giocatori, sponsor, arbitri, campionati), poi la schermata iniziale
try { await loadGameData(); } catch (e) { console.error(e); }
buildAds(DATA.sponsors); refLabel();
if (!TEAMS[SETUP.a]) SETUP.a = 'ITA'; if (!TEAMS[SETUP.b]) SETUP.b = 'BRA';
setupTeams(SETUP.a, SETUP.b); newGame();
$('load').remove();
openSetup();
setTimeout(() => { $('help').style.display = 'none'; }, 15000);   // le istruzioni spariscono dopo 15 s (H per rivederle)
requestAnimationFrame(frame);
