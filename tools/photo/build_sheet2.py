# Dal foglio sprite generato (foglio-sprite-2.webp: sfondo magenta, maglia bianca, pantaloncini rossi, 2 pannelli
# da 6 righe x 8 fotogrammi) a photo-sprites.js: ritaglio sul magenta, fotogrammi in un atlante a celle uguali
# (piedi in basso al centro) e mappa delle zone da ricolorare (maglia, pantaloncini, pelle).
# Uso:  python3 build_sheet2.py foglio-sprite-2.webp ../../photo-sprites.js
import sys, json, base64, io
import numpy as np
from PIL import Image
from scipy import ndimage as nd

src, out = sys.argv[1], sys.argv[2]
# righe del foglio: pannello sinistro 1-6, pannello destro 7-12
ROWS = ['idle', 'run', 'appr', 'spike', 'bagher', 'set', 'block', 'jserve', 'serve', 'dive', 'dump', 'cheer']

a = np.asarray(Image.open(src).convert('RGB')).astype(np.int32)
H, W, _ = a.shape
r, g, b = a[..., 0], a[..., 1], a[..., 2]
white = a.min(-1) > 235
bar = white.mean(0) > 0.8                       # barra bianca che separa i due pannelli
split = int(np.nonzero(bar)[0].mean()) if bar.any() else W // 2
mag = np.minimum(r, b) - g                      # quanto un pixel è magenta (sfondo ~ 240)
alpha = np.clip((170 - mag) / 80, 0, 1)         # bordo morbido sul magenta (stretto: niente alone chiaro)
alpha[:, bar] = 0
fg = alpha > 0.5

# figure: componenti connesse (dilatate per unire braccia e gambe staccate), assegnate a riga e pannello
lab, n = nd.label(nd.binary_dilation(fg, iterations=6))
figs = []
for i, s in enumerate(nd.find_objects(lab)):
    sub = (lab[s] == i + 1) & fg[s]
    if sub.sum() < 300 or (s[1].stop - s[1].start) < 20: continue
    cy, cx = (s[0].start + s[0].stop) / 2, (s[1].start + s[1].stop) / 2
    panel = int(cx > split)
    row = panel * 6 + min(5, int(cy // (H / 6)))
    figs.append(dict(row=row, cx=cx, s=s, mask=sub))
figs.sort(key=lambda f: (f['row'], f['cx']))

def cut(f):
    """ritaglio RGBA con lo spill magenta tolto dai bordi"""
    s, m = f['s'], f['mask']
    rgb = a[s].astype(np.float32)
    al = alpha[s] * m
    # niente alone viola: vicino al bordo i pixel che tendono al magenta (rosso e blu alti, verde basso) diventano neutri
    edge = nd.binary_dilation(al < 0.99, iterations=2) & (al > 0)
    gch = rgb[..., 1]
    pink = edge & (rgb[..., 0] > gch + 25) & (rgb[..., 2] > gch + 25)
    lvl = np.maximum(gch, np.minimum(rgb[..., 0], rgb[..., 2]) * 0.85)
    for k in (0, 2): rgb[..., k] = np.where(pink, lvl, rgb[..., k])
    rgb[..., 1] = np.where(pink, lvl, rgb[..., 1])
    core = nd.binary_erosion(al > 0.5, iterations=1)
    al = np.where(core, al, al * 0.45)              # il bordo esterno di 1 px resta appena accennato
    rgba = np.dstack([np.clip(rgb, 0, 255), al * 255]).astype(np.uint8)
    ys, xs = np.nonzero(al > 0.05)
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def regions(rgba):
    """zone: 1 maglia (bianca, attaccata ai pantaloncini), 2 pantaloncini (rossi), 3 pelle; G = chiaroscuro normalizzato"""
    c = rgba[..., :3].astype(np.int32); al = rgba[..., 3] > 100
    R, G, B = c[..., 0], c[..., 1], c[..., 2]
    lum = (R * 299 + G * 587 + B * 114) // 1000
    sat = c.max(-1) - c.min(-1)
    red = al & (R > 120) & (R > G * 1.9) & (R > B * 1.9)                          # pantaloncini rossi
    skin = al & ~red & (R > G + 8) & (G > B) & (G > R * 0.5) & (sat > 18) & (lum > 60)
    whiteish = al & ~red & ~skin & (sat < 45) & (lum > 120)
    reg = np.zeros(lum.shape, np.uint8)
    reg[red] = 2
    # maglia = pezzi bianchi attaccati ai pantaloncini e non più in basso di loro
    # (ginocchiere, calzettoni e scarpe restano bianchi)
    labw, nw = nd.label(whiteish)
    near = nd.binary_dilation(red, iterations=3)
    rcy = np.nonzero(red)[0].mean() if red.any() else lum.shape[0] / 2
    for j in range(1, nw + 1):
        cj = labw == j
        if cj.sum() > 40 and (cj & near).any() and np.nonzero(cj)[0].mean() <= rcy + 2: reg[cj] = 1
    reg[skin] = 3
    # chiaroscuro: luminosità rispetto alla mediana della zona, scalata a 32 (la formula di photo.js usa G/32)
    shade = np.zeros(lum.shape, np.int32)
    for z in (1, 2):
        zm = reg == z
        if zm.any(): shade[zm] = np.clip(lum[zm] / max(1, np.median(lum[zm])) * 37, 0, 255)
    shade[reg == 3] = lum[reg == 3]
    return reg, shade

frames = []
for f in figs:
    im = cut(f)
    al = im[..., 3] > 100
    ys, xs = np.nonzero(al)
    low = ys > im.shape[0] * 0.7
    ax = xs[low].mean() if low.any() else xs.mean()                               # ancoraggio sui piedi
    reg, shade = regions(im)
    frames.append(dict(im=Image.fromarray(im, 'RGBA'), reg=reg, lum=shade, ax=ax, name=ROWS[f['row']]))
# a terra dopo il tuffo: l'ultimo fotogramma sdraiato del tuffo
dive = [f for f in frames if f['name'] == 'dive']
lying = max(dive, key=lambda f: f['im'].width / f['im'].height)
frames.append(dict(lying, name='down'))

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
    sl = regA[y:y + hh, x:x + ww]
    sl[..., 0] = np.where(f['reg'] > 0, f['reg'] * 80, sl[..., 0])
    sl[..., 1] = np.where(f['reg'] > 0, np.clip(f['lum'], 0, 255), sl[..., 1])
    anims.setdefault(f['name'], []).append(k)

def uri(img):
    bio = io.BytesIO(); img.save(bio, 'PNG', optimize=True); return 'data:image/png;base64,' + base64.b64encode(bio.getvalue()).decode()
stand = int(np.median([f['im'].height for f in frames if f['name'] == 'idle']))
js = ('// Generato da tools/photo/build_sheet2.py dal foglio sprite foglio-sprite-2.webp: non modificare a mano.\n'
      f'const PHOTO_SPRITES = {json.dumps(dict(cw=CW, ch=CH, cols=cols, n=len(frames), stand=stand, anims=anims))};\n'
      f"PHOTO_SPRITES.atlas = '{uri(atlas)}';\n"
      f"PHOTO_SPRITES.regions = '{uri(Image.fromarray(regA))}';\n")
open(out, 'w').write(js)
atlas.save(out.replace('.js', '_atlas_preview.png'))
Image.fromarray(regA).save(out.replace('.js', '_regions_preview.png'))
print('celle', CW, CH, 'fotogrammi', len(frames), 'altezza in piedi', stand, 'kB', len(js) // 1024, {k: len(v) for k, v in anims.items()})
