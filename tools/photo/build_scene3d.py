# Dai fogli 3d-arbitro.png (1 riga x 7 gesti) e 3d-spettatori.png (4 righe x 8 persone) a scene3d-sprites.js.
#  - ritaglia le figure sullo sfondo magenta (senza alone rosa ai bordi);
#  - ARBITRO: 7 gesti (fischio, battuta a sinistra/destra dello schermo, fuori, tocco del muro, rete, punto),
#    tutti alla stessa scala (altezza della figura), con il centro della testa per allinearli nel pannello;
#  - SPETTATORI: 32 persone (righe: seduti, braccia alzate, applauso, sciarpa o bandierina), tutte con la stessa
#    larghezza delle spalle; mappa della maglia bianca (zona collegata al bordo basso della figura, così occhi e denti
#    restano bianchi) con la luminosità per ricolorarla nel gioco mantenendo pieghe e ombre.
# Uso:  python3 build_scene3d.py 3d-arbitro.png 3d-spettatori.png ../../scene3d-sprites.js  [cartella anteprime]
import sys, os, json, base64, io
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ref_src, fan_src, out = sys.argv[1], sys.argv[2], sys.argv[3]
prev = sys.argv[4] if len(sys.argv) > 4 else None
REF_NAMES = ['whistle', 'pointL', 'pointR', 'out', 'touch', 'net', 'win']
REF_H = 300          # altezza della figura dell'arbitro nell'atlante (il pannello è alto 44 unità, 264 px in HD/3D)
FAN_SH = 54          # larghezza delle spalle di uno spettatore nell'atlante (nel gioco ~9 unità, 54 px in HD/3D)

def sheet(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    alpha = np.clip((170 - (np.minimum(r, b) - g)) / 80, 0, 1)
    lab, n = nd.label(nd.binary_dilation(alpha > 0.5, iterations=2))
    objs = []
    for i, s in enumerate(nd.find_objects(lab)):
        if (s[0].stop - s[0].start) < 30: continue
        objs.append(((s[0].start + s[0].stop) / 2, (s[1].start + s[1].stop) / 2, s, i + 1))
    return a, alpha, lab, objs

def cut(a, alpha, lab, s, idx):
    rgb = a[s].copy(); al = alpha[s] * (lab[s] == idx)   # solo questa figura
    edge = nd.binary_dilation(al < 0.99, iterations=2) & (al > 0)
    pink = edge & (rgb[..., 0] > rgb[..., 1] + 25) & (rgb[..., 2] > rgb[..., 1] + 25)   # niente alone magenta
    lvl = np.maximum(rgb[..., 1], np.minimum(rgb[..., 0], rgb[..., 2]) * 0.85)
    for k in range(3): rgb[..., k] = np.where(pink, lvl, rgb[..., k])
    # riflesso magenta dentro la figura (per esempio un avambraccio un po' trasparente): il blu scende sotto il verde
    spill = (al > 0) & (rgb[..., 2] > rgb[..., 1] + 12) & (rgb[..., 0] > rgb[..., 1] + 12)
    rgb[..., 2] = np.where(spill, np.minimum(rgb[..., 2], rgb[..., 1] * 0.9), rgb[..., 2])
    ys, xs = np.nonzero(al > 0.05)
    sl = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
    return rgb[sl], al[sl]

def uri(img):
    bio = io.BytesIO(); img.save(bio, 'WEBP', quality=88, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(bio.getvalue()).decode()

def rgba(rgb, al):
    return Image.fromarray(np.dstack([np.clip(rgb, 0, 255), al * 255]).astype(np.uint8), 'RGBA')

# ---------------- arbitro ----------------
a, al, lab, objs = sheet(ref_src)
objs.sort(key=lambda t: t[1])
assert len(objs) == 7, len(objs)
refs = [cut(a, al, lab, s, i) for _, _, s, i in objs]
hmed = np.median([r[0].shape[0] for r in refs])
k = REF_H / hmed
x, frames, ims = 0, [], []
for (rgb, alp), name in zip(refs, REF_NAMES):
    im = rgba(rgb, alp)
    # centro della testa: media delle colonne piene nel 12% più alto della figura
    top = alp[: max(4, int(alp.shape[0] * 0.12))] > 0.5
    hx = np.nonzero(top)[1].mean() if top.any() else alp.shape[1] / 2
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    frames.append(dict(name=name, x=x, w=im.width, h=im.height, hx=round(hx * k, 1)))
    ims.append(im); x += im.width + 4
ref_atlas = Image.new('RGBA', (x, max(i.height for i in ims)), (0, 0, 0, 0))
for f, im in zip(frames, ims): ref_atlas.paste(im, (f['x'], 0), im)

# ---------------- spettatori ----------------
a, al, lab, objs = sheet(fan_src)
H = a.shape[0]
objs.sort(key=lambda t: (int(t[0] // (H / 4)), t[1]))
assert len(objs) == 32, len(objs)
fans = []
for n, (_, _, s, i) in enumerate(objs):
    rgb, alp = cut(a, al, lab, s, i)
    mx, mn = rgb.max(2), rgb.min(2)
    lum = rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114
    white = (alp > 0.5) & (mn > 150) & (mx - mn < 40)
    # maglia: zone bianche grandi nella metà bassa della figura (occhi, denti e riflessi restano com'erano)
    wl, wn = nd.label(nd.binary_closing(white, iterations=2))
    big = [j + 1 for j, (sz, cy) in enumerate(zip(nd.sum(white, wl, range(1, wn + 1)), [c[0] for c in nd.center_of_mass(white, wl, range(1, wn + 1))]))
           if sz > alp.size * 0.04 and cy > alp.shape[0] * 0.35]
    shirt = np.isin(wl, big) & (alp > 0.3)
    rows = np.nonzero(shirt.any(1))[0]
    sw = max(shirt[r].sum() for r in rows[len(rows) // 3:]) if len(rows) else alp.shape[1]   # spalle: riga di maglia più larga
    fans.append((rgb, alp, shirt, lum, sw, n // 8))
k = FAN_SH / np.median([f[4] for f in fans])
fx, fframes, fims, fregs = 0, [], [], []
for rgb, alp, shirt, lum, sw, row in fans:
    im = rgba(rgb, alp)
    W, Hh = max(1, round(im.width * k)), max(1, round(im.height * k))
    im = im.resize((W, Hh), Image.LANCZOS)
    reg = np.zeros((alp.shape[0], alp.shape[1], 4), np.uint8)
    reg[..., 0] = np.where(shirt, 80, 0)
    reg[..., 1] = np.where(shirt, np.clip(lum / 255 * 200, 0, 255), 0)   # luminosità della maglia (pieghe e ombre)
    reg[..., 3] = np.where(shirt, 255, 0)
    rg = Image.fromarray(reg, 'RGBA').resize((W, Hh), Image.NEAREST)
    fframes.append(dict(x=fx, w=W, h=Hh, row=row)); fims.append(im); fregs.append(rg); fx += W + 2
fan_atlas = Image.new('RGBA', (fx, max(i.height for i in fims)), (0, 0, 0, 0))
fan_reg = Image.new('RGBA', fan_atlas.size, (0, 0, 0, 0))
for f, im, rg in zip(fframes, fims, fregs):
    fan_atlas.paste(im, (f['x'], 0), im); fan_reg.paste(rg, (f['x'], 0))

data = dict(ref=dict(h=REF_H, frames=frames), fans=dict(sh=FAN_SH, frames=fframes))
js = (f'// Generato da tools/photo/build_scene3d.py dai fogli {os.path.basename(ref_src)} e {os.path.basename(fan_src)}: non modificare a mano.\n'
      f'const SCENE3D = {json.dumps(data)};\n'
      f"SCENE3D.ref.atlas = '{uri(ref_atlas)}';\n"
      f"SCENE3D.fans.atlas = '{uri(fan_atlas)}';\n"
      f"SCENE3D.fans.regions = 'data:image/png;base64,{base64.b64encode((lambda b: (fan_reg.save(b, 'PNG', optimize=True), b.getvalue())[1])(io.BytesIO())).decode()}';\n")
open(out, 'w').write(js)
if prev:
    ref_atlas.save(os.path.join(prev, 'ref_atlas.png')); fan_atlas.save(os.path.join(prev, 'fan_atlas.png')); fan_reg.save(os.path.join(prev, 'fan_reg.png'))
print('arbitro', ref_atlas.size, 'spettatori', fan_atlas.size, 'kB', len(js) // 1024)
