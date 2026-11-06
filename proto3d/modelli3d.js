// ============================================================
//  MODELLI 3D DA SKETCHFAB (licenza CC Attribution, vedi modelli/CREDITI.txt)
//  - atleta-m.glb: "Man Player" di RiverofCreative; atleta-f.glb: "Tori_Athlete" di kimate.richards
//    (stesso scheletro Character Creator), pallone.glb: "Volleyball" di giftedprototype.
//    Ridotti per il web: niente animazioni ed espressioni, meno poligoni, texture WebP (meshopt).
//  - I giocatori si muovono con le pose del gioco: il manichino (invisibile) fa la posa e lo scheletro del modello
//    allinea ogni segmento (busto, collo, braccia, avambracci, cosce, gambe, piedi) alla stessa direzione.
//  - Maglia e pantaloncini prendono i colori della squadra (la texture diventa in scala di grigi: restano pieghe e
//    cuciture), pelle e capelli quelli del giocatore della rosa; il numero è sul petto e sulla schiena.
//  Se i modelli non si caricano si usano i manichini.
// ============================================================
import * as THREE from 'three';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from './jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from './jsm/utils/SkeletonUtils.js';

export const MODELS = { ok: false, m: null, f: null, ball: null };
const SHIRT = /^(T_shirt|t_shirt)$/i, SHORTS = /^(Classic_Shorts|jeans)$/i, HAIR = /hair|scalp|Front_Transparency/i, SKIN = /^Std_Skin|^Std_Nails/;
const HEADPART = /Skin_Head|Eyelash|Eye_|Cornea|hair|scalp|Front_Transparency|Teeth|Tongue/i;
const bone = (bones, re) => bones.find(b => re.test(b.name));

export async function loadModels() {
  const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder);
  const get = f => new Promise((ok, ko) => L.load(f, g => ok(g.scene), undefined, ko));
  const [m, f, ball] = await Promise.all([get('modelli/atleta-m.glb'), get('modelli/atleta-f.glb'), get('modelli/pallone.glb')]);
  MODELS.m = prep(m); MODELS.f = prep(f); MODELS.ball = ball; MODELS.ok = true;
}
// misure del modello a riposo e texture in scala di grigi (una volta sola)
function prep(scene) {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene), gray = new Map();
  scene.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    const mt = o.material;
    if ((SHIRT.test(mt.name) || SHORTS.test(mt.name) || HAIR.test(mt.name)) && mt.map && !gray.has(mt.name)) gray.set(mt.name, grayTex(mt.map, HAIR.test(mt.name) ? 1.3 : 1.7));
  });
  return { scene, h: box.max.y - box.min.y, gray };
}
function grayTex(tex, gain) {
  const im = tex.image, c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
  // luminosità media portata a un valore fisso: una maglia rossa o una gialla diventano lo stesso grigio chiaro
  let sum = 0, n = 0;
  for (let i = 0; i < a.length; i += 16) if (a[i + 3] > 128) { sum += a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11; n++; }
  const k = (gain > 1.5 ? 225 : 175) / Math.max(20, sum / Math.max(1, n));
  for (let i = 0; i < a.length; i += 4) { const l = Math.min(255, (a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11) * k); a[i] = a[i + 1] = a[i + 2] = l; }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = tex.flipY; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; return t;
}

// giocatore con i colori della squadra: { root, bones, rest, hipOff, head (parti della testa da nascondere in prima persona) }
export function makeSkinned(fem, look, num, numberTex) {
  const M = fem ? MODELS.f : MODELS.m, root = SkeletonUtils.clone(M.scene), heads = [];
  const k = 1.9 * (fem ? 0.96 : 1) / M.h;
  root.scale.setScalar(k);
  const skin = new THREE.Color(look.skin), hair = new THREE.Color(look.hair);
  root.traverse(o => {
    if (!o.isMesh) return;
    const mt = o.material.clone(); o.material = mt;
    if (SHIRT.test(mt.name)) { mt.map = M.gray.get(mt.name) || mt.map; mt.color.set(look.shirt); }
    else if (SHORTS.test(mt.name)) { mt.map = M.gray.get(mt.name) || mt.map; mt.color.set(look.shorts); }
    else if (HAIR.test(mt.name)) { if (M.gray.get(mt.name)) mt.map = M.gray.get(mt.name); mt.color.copy(hair).lerp(new THREE.Color(1, 1, 1), 0.15); }
    else if (SKIN.test(mt.name)) { const base = new THREE.Color(0.86, 0.68, 0.56); mt.color.setRGB(clamp(skin.r / base.r, 0.35, 1.2), clamp(skin.g / base.g, 0.35, 1.2), clamp(skin.b / base.b, 0.35, 1.2)); }
    if (HEADPART.test(mt.name)) heads.push(o);
  });
  const bones = []; root.traverse(o => { if (o.isBone) bones.push(o); });
  const B = side => ({
    sh: bone(bones, new RegExp(`^CC_Base_${side}_Upperarm_\\d+$`)), el: bone(bones, new RegExp(`^CC_Base_${side}_Forearm_\\d+$`)), ha: bone(bones, new RegExp(`^CC_Base_${side}_Hand_\\d+$`)),
    hi: bone(bones, new RegExp(`^CC_Base_${side}_Thigh_\\d+$`)), kn: bone(bones, new RegExp(`^CC_Base_${side}_Calf_\\d+$`)), an: bone(bones, new RegExp(`^CC_Base_${side}_Foot_\\d+$`)),
    toe: bone(bones, new RegExp(`^CC_Base_${side}_ToeBase_\\d+$`))
  });
  const S = {
    root, bones, heads, k, L: B('L'), R: B('R'),
    hip: bone(bones, /^CC_Base_Hip_\d+$/), waist: bone(bones, /^CC_Base_Waist_\d+$/), spine2: bone(bones, /^CC_Base_Spine02_\d+$/),
    neck: bone(bones, /^CC_Base_NeckTwist01_\d+$/), head: bone(bones, /^CC_Base_Head_\d+$/)
  };
  S.rest = new Map(bones.map(b => [b, b.quaternion.clone()]));
  S.hipRest = S.hip.position.clone();
  // numero sul petto e sulla schiena, attaccato al busto
  if (num !== '' && num !== undefined) {
    root.updateMatrixWorld(true);
    const sp = new THREE.Vector3(); S.spine2.getWorldPosition(sp);
    const mat = new THREE.MeshBasicMaterial({ map: numberTex, transparent: true, depthWrite: false });
    for (const [z, s, ry] of [[0.125, 0.15, 0], [-0.13, 0.22, Math.PI]]) {
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(s, s), mat);
      pl.position.set(sp.x, sp.y + (z > 0 ? 0.02 : 0.06), sp.z + z); pl.rotation.y = ry;
      root.add(pl); S.spine2.attach(pl);
    }
  }
  return S;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// posa: il modello copia la posa del manichino J (gruppi delle articolazioni di makeAthlete in gioco3d.js)
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
const _q = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _qw = new THREE.Quaternion();
function aim(bn, child, fromObj, toPos) {
  if (!bn || !child) return;
  bn.getWorldPosition(_a); child.getWorldPosition(_b);
  _c.subVectors(_b, _a).normalize();
  fromObj.getWorldPosition(_d); _d.subVectors(toPos, _d).normalize();
  if (_c.lengthSq() < 1e-6 || _d.lengthSq() < 1e-6) return;
  _q.setFromUnitVectors(_c, _d);
  bn.getWorldQuaternion(_qw); _qw.premultiply(_q);
  bn.parent.getWorldQuaternion(_qp).invert();
  bn.quaternion.copy(_qp.multiply(_qw));
  bn.updateMatrixWorld(true);
}
const _t = new THREE.Vector3(), _e = new THREE.Vector3();
const wp = (o, out) => o.getWorldPosition(out);
export function poseSkinned(S, J, mannequinRoot) {
  for (const [b, q] of S.rest) b.quaternion.copy(q);
  S.hip.position.copy(S.hipRest);
  mannequinRoot.updateMatrixWorld(true);
  // bacino: abbassato come quello del manichino (piegamento sulle gambe)
  const drop = (0.98 - J.pelvis.position.y) * mannequinRoot.scale.y;
  S.hip.getWorldPosition(_a); _a.y -= drop; S.hip.parent.worldToLocal(_a); S.hip.position.copy(_a);
  S.root.updateMatrixWorld(true);
  const P = new THREE.Vector3();
  // busto e collo
  aim(S.waist, S.neck, J.spine, wp(J.neck, P).clone());
  aim(S.neck, S.head, J.neck, wp(J.head, _t).clone().add(_e.set(0, 0, 0)));
  for (const s of ['L', 'R']) {
    const b = S[s];
    aim(b.sh, b.el, J['sh' + s], wp(J['el' + s], P).clone());
    aim(b.el, b.ha, J['el' + s], wp(J['ha' + s], P).clone());
    aim(b.hi, b.kn, J['hi' + s], wp(J['kn' + s], P).clone());
    aim(b.kn, b.an, J['kn' + s], wp(J['an' + s], P).clone());
    // piede: verso la punta del piede del manichino
    const toe = J['an' + s].localToWorld(_t.set(0, -0.04, 0.16)).clone();
    aim(b.an, b.toe, J['an' + s], toe);
  }
}
// pallone: copia del modello con il raggio dato
export function makeBall(r) {
  const g = MODELS.ball.clone(true); g.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(g), s = r * 2 / Math.max(box.max.x - box.min.x, box.max.y - box.min.y);
  const c = box.getCenter(new THREE.Vector3());
  const wrap = new THREE.Group(); g.position.sub(c); wrap.add(g); wrap.scale.setScalar(s);
  const mats = [];
  wrap.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material = o.material.clone(); mats.push(o.material); } });
  wrap.userData.mats = mats;
  return wrap;
}
