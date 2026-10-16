# Impacchetta i fotogrammi in un atlante a celle uguali (piedi in basso al centro) + mappa delle zone da ricolorare.
# Uscita: photo-sprites.js con due PNG in data URI e i metadati delle animazioni.
import sys, json, base64, io
import numpy as np
from PIL import Image
from scipy import ndimage as nd

fdir, out = sys.argv[1], sys.argv[2]
meta = json.load(open(fdir + '/meta.json'))
rows = {}
for m in meta: rows.setdefault(m['row'], []).append(m)
order = []
for r in sorted(rows):
    order += rows[r]
# animazioni nell'ordine del foglio (riga, posizione)
names = ['idle'] * 9 + ['walk'] * 8 + ['run'] * 7 + ['jump'] * 9 + ['spike'] * 9 + ['bagher'] * 8 + ['block'] * 8 + ['serve'] * 8
assert len(order) == len(names), (len(order), len(names))

def regions(im):
    a = np.asarray(im).astype(np.int32)
    rgb, al = a[..., :3], a[..., 3]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = (r * 299 + g * 587 + b * 114) // 1000
    m = al > 100
    sat = rgb.max(-1) - rgb.min(-1)
    warm = (r > g + 6) & (g >= b - 2) & (r - b > 22)
    skin = m & warm & (lum > 52)                         # pelle, anche in ombra
    cloth = m & (lum < 95) & (sat < 22) & (r - b < 14) & ~skin   # nero neutro della divisa (i capelli sono caldi)
    lab, n = nd.label(cloth, structure=np.ones((3, 3)))
    reg = np.zeros(lum.shape, np.uint8)
    if n:
        # divisa = tutti i pezzi di stoffa sopra le ginocchia (il braccio può dividere la maglia) + i pezzi grandi;
        # ginocchiere e scarpe restano scure
        bottom = np.nonzero(m)[0].max()
        knee = bottom - 0.36 * STAND
        hairish = m & (lum < 90) & (r - b >= 14) & ~skin
        nothair = nd.uniform_filter(hairish.astype(np.float32), 7) < 0.22
        big = np.zeros_like(cloth)
        for j in range(1, n + 1):
            cj = lab == j
            area = cj.sum()
            if area < 12: continue
            cy = np.nonzero(cj)[0].mean()
            if cy < knee or area > 350: big |= cj
        big &= nothair
        filled = nd.binary_fill_holes(nd.binary_closing(big, iterations=2))
        big |= filled & m & ~skin & (lum >= 95)              # numeri chiari sulla maglia
        if big.any():
            y1 = np.nonzero(big)[0].max()
            hip = y1 - 18                                     # pantaloncini: gli ultimi ~18 px della divisa
            reg[big] = 1
            reg[big & (np.arange(lum.shape[0])[:, None] > hip)] = 2
    reg[skin] = 3
    return reg, lum

STAND = 166
frames = []
for m, nm in zip(order, names):
    im = Image.open(fdir + '/' + m['file']).convert('RGBA')
    a = np.asarray(im)
    mask = a[..., 3] > 100
    ys, xs = np.nonzero(mask)
    h = mask.shape[0]
    low = ys > h * 0.7                                        # piedi/gambe: ancoraggio orizzontale
    ax = xs[low].mean() if low.any() else xs.mean()
    reg, lum = regions(im)
    frames.append(dict(im=im, reg=reg, lum=lum, ax=ax, name=nm))

# fotogrammi generati: tuffo e a terra (bagher ruotato in avanti)
def rotated(fr, ang, name):
    im = fr['im'].rotate(ang, expand=True, resample=Image.BICUBIC)
    rg = Image.fromarray(fr['reg']).rotate(ang, expand=True, resample=Image.NEAREST)
    lm = Image.fromarray(fr['lum'].astype(np.uint8)).rotate(ang, expand=True, resample=Image.NEAREST)
    a = np.asarray(im); ys, xs = np.nonzero(a[..., 3] > 100)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    im, rg, lm = im.crop(box), rg.crop(box), lm.crop(box)
    return dict(im=im, reg=np.asarray(rg), lum=np.asarray(lm).astype(np.int32), ax=im.width / 2, name=name)
bag = [f for f in frames if f['name'] == 'bagher']
frames.append(rotated(bag[2], -62, 'dive'))
frames.append(rotated(bag[2], -88, 'down'))

half = int(max(max(f['ax'], f['im'].width - f['ax']) for f in frames)) + 2
CW, CH = half * 2, max(f['im'].height for f in frames) + 2
cols = 12
rowsN = (len(frames) + cols - 1) // cols
atlas = Image.new('RGBA', (CW * cols, CH * rowsN), (0, 0, 0, 0))
regA = np.zeros((CH * rowsN, CW * cols, 3), np.uint8)
anims = {}
for k, f in enumerate(frames):
    cx, cy = (k % cols) * CW, (k // cols) * CH
    x = int(round(cx + half - f['ax'])); y = cy + CH - f['im'].height
    atlas.paste(f['im'], (x, y), f['im'])
    hh, ww = f['reg'].shape
    regA[y:y + hh, x:x + ww, 0] = np.where(f['reg'] > 0, f['reg'] * 80, regA[y:y + hh, x:x + ww, 0])
    regA[y:y + hh, x:x + ww, 1] = np.where(f['reg'] > 0, np.clip(f['lum'], 0, 255), regA[y:y + hh, x:x + ww, 1])
    anims.setdefault(f['name'], []).append(k)

def uri(img):
    bio = io.BytesIO(); img.save(bio, 'PNG', optimize=True); return 'data:image/png;base64,' + base64.b64encode(bio.getvalue()).decode()
stand = int(np.median([f['im'].height for f in frames if f['name'] == 'idle']))
js = ('// Generato da build_photo.py dal foglio sprite fotografico: non modificare a mano.\n'
      f'const PHOTO_SPRITES = {json.dumps(dict(cw=CW, ch=CH, cols=cols, n=len(frames), stand=stand, anims=anims))};\n'
      f"PHOTO_SPRITES.atlas = '{uri(atlas)}';\n"
      f"PHOTO_SPRITES.regions = '{uri(Image.fromarray(regA))}';\n")
open(out, 'w').write(js)
atlas.save(out.replace('.js', '_atlas_preview.png'))
Image.fromarray(regA).save(out.replace('.js', '_regions_preview.png'))
print('celle', CW, CH, 'fotogrammi', len(frames), 'altezza in piedi', stand, 'kB', len(js) // 1024, {k: len(v) for k, v in anims.items()})
