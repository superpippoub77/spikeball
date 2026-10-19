# Dal foglio dei palloni (palloni.webp: sfondo magenta, 4 righe x 8 fotogrammi) a ball-sprites.js.
# Righe: 0 moderno giallo-blu, 1 classico bianco, 2 beach, 3 moderno schiacciato all'impatto.
# Ogni fotogramma va in una cella quadrata CELL x CELL con il pallone tondo di diametro DIAM, centrato
# (stessa scala per tutti: i fotogrammi schiacciati restano più larghi e più bassi).
# Uso:  python3 build_balls.py palloni.webp ../../ball-sprites.js
import sys, json, base64, io
import numpy as np
from PIL import Image
from scipy import ndimage as nd

src, out = sys.argv[1], sys.argv[2]
CELL, DIAM = 112, 84
a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H, W, _ = a.shape
r, g, b = a[..., 0], a[..., 1], a[..., 2]
mag = np.minimum(r, b) - g
alpha = np.clip((170 - mag) / 80, 0, 1)
lab, n = nd.label(nd.binary_dilation(alpha > 0.5, iterations=2))
balls = []
for i, s in enumerate(nd.find_objects(lab)):
    if (s[0].stop - s[0].start) < 30: continue
    balls.append(((s[0].start + s[0].stop) / 2, (s[1].start + s[1].stop) / 2, s))
balls.sort(key=lambda t: (int(t[0] // (H / 4)), t[1]))
assert len(balls) == 32, len(balls)

def cut(s):
    rgb = a[s].copy(); al = alpha[s].copy()
    edge = nd.binary_dilation(al < 0.99, iterations=2) & (al > 0)
    pink = edge & (rgb[..., 0] > rgb[..., 1] + 25) & (rgb[..., 2] > rgb[..., 1] + 25)   # niente alone magenta
    lvl = np.maximum(rgb[..., 1], np.minimum(rgb[..., 0], rgb[..., 2]) * 0.85)
    for k in range(3): rgb[..., k] = np.where(pink, lvl, rgb[..., k])
    ys, xs = np.nonzero(al > 0.05)
    return np.dstack([rgb, al * 255])[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

cuts = [cut(s) for _, _, s in balls]
diam = np.median([max(c.shape[0], c.shape[1]) for c in cuts[:24]])   # pallone tondo nelle prime 3 righe
k = DIAM / diam
atlas = Image.new('RGBA', (CELL * 8, CELL * 4), (0, 0, 0, 0))
for i, c in enumerate(cuts):
    im = Image.fromarray(np.clip(c, 0, 255).astype(np.uint8), 'RGBA')
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    x = (i % 8) * CELL + (CELL - im.width) // 2
    y = (i // 8) * CELL + (CELL - im.height) // 2
    if i >= 24: y = (i // 8) * CELL + (CELL + DIAM) // 2 - im.height   # schiacciato: appoggiato sotto
    atlas.paste(im, (x, y), im)
bio = io.BytesIO(); atlas.save(bio, 'PNG', optimize=True)
js = ('// Generato da tools/photo/build_balls.py dal foglio palloni.webp: non modificare a mano.\n'
      f'const BALL_SPRITES = {json.dumps(dict(cell=CELL, diam=DIAM, rows=dict(pro=0, classic=1, beach=2, squash=3)))};\n'
      f"BALL_SPRITES.atlas = 'data:image/png;base64,{base64.b64encode(bio.getvalue()).decode()}';\n")
open(out, 'w').write(js)
atlas.save(out.replace('.js', '_preview.png'))
print('celle', CELL, 'diametro', DIAM, 'kB', len(js) // 1024)
