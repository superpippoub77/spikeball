# Dai quattro fogli sprite della versione 3D (3d-maschile-A..D.png: sfondo magenta, maglia bianca, pantaloncini rossi,
# 4 righe x 8 fotogrammi, giocatore di profilo verso destra) a photo-sprites.js:
#  - toglie i palloni (giallo-blu nelle battute, bianco tra le mani nel palleggio): diventano sfondo, quindi trasparenti;
#  - separa le righe (dove c'è meno disegno) e le figure (anche quelle che si toccano, come i tuffi a terra);
#  - scarta i fotogrammi indicati in SKIP (per esempio il batti cinque con due persone);
#  - porta i quattro fogli alla stessa scala (misura: aree di maglia, pantaloncini e pelle, che cambiano poco con la posa);
#  - mette i fotogrammi in un atlante a celle uguali (piedi in basso al centro) con la mappa delle zone da ricolorare
#    (maglia, pantaloncini, pelle), nello stesso formato di build_sheet2.py: photo.js non cambia modo di leggerlo.
# Uso:  python3 build_sheet3.py 3d-maschile ../../photo-sprites.js
#       python3 build_sheet3.py 3d-femminile ../../photo-sprites-f.js     (giocatrici: PHOTO_SPRITES_F)
import sys, os, json, base64, io
import numpy as np
from PIL import Image
from scipy import ndimage as nd

prefix, out = sys.argv[1], sys.argv[2]
# righe di ogni foglio (vedi PROMPT-CHATGPT-3D.md)
SHEETS = {
    'A': ['idle', 'run', 'appr', 'spike'],
    'B': ['spikefr', 'bagher', 'lateral', 'dive'],
    'C': ['set', 'jset', 'dump', 'block'],
    'D': ['serve', 'jserve', 'jfloat', 'cheer'],
}
SKIP = {('D', 3, 4)}                       # foglio, riga, colonna (da 0): il batti cinque ha due persone
STAND = [('D', 0, 0), ('D', 0, 7), ('D', 2, 0)]   # fotogrammi in piedi dritti: altezza di riferimento
SKIPROWS = set()                           # righe da non usare (foglio, riga)
ALIAS = {}                                 # movimento mancante -> (movimento simile, fotogrammi da usare)
VAR = 'PHOTO_SPRITES'
if 'femminile' in prefix:
    # versione femminile: nel foglio C le righe 2-4 sono una copia del foglio B, nel foglio D le righe 3-4 sono sbagliate.
    # Finché non vengono rigenerate, quei movimenti usano pose simili della stessa giocatrice.
    VAR = 'PHOTO_SPRITES_F'
    SKIPROWS = {('C', 1), ('C', 2), ('C', 3), ('D', 2), ('D', 3)}
    STAND = [('D', 0, 0), ('D', 0, 7), ('D', 1, 0)]
    ALIAS = {
        'jset': ('set', [0, 1, 2, 3, 4, 1, 1, 0]),              # palleggio in salto: come quello da fermo (senza braccia distese)
        'dump': ('spikefr', [0, 1, 2, 3, 4, 5, 6, 7]),          # pallonetto: braccio teso in avanti e in alto
        'block': ('set', [0, 1, 5, 6, 6, 5, 1, 0]),             # muro: braccia distese in alto del palleggio
        'jfloat': ('jserve', [0, 1, 2, 3, 5, 6, 6, 7]),         # salto flottante: come la battuta in salto
        'cheer': ('set', [6, 5, 6, 4, 6, 0, 0]),                # esultanza: braccia al cielo; delusione: attesa
    }

def hsv(a):
    f = a[..., :3] / 255.0
    mx, mn = f.max(-1), f.min(-1)
    d = mx - mn + 1e-6
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, d / (mx + 1e-6), mx

def skin_mask(a):
    h, s, v = hsv(a)
    return (h > 4) & (h < 42) & (s > 0.15) & (s < 0.75) & (v > 0.3)

MAGENTA = np.array([255, 0, 255])

def clear_circle(a, cy, cx, rad):
    """dentro il cerchio del pallone tutto diventa sfondo tranne la pelle (dita e mani restano)"""
    y0, y1 = int(max(0, cy - rad - 1)), int(min(a.shape[0], cy + rad + 2))
    x0, x1 = int(max(0, cx - rad - 1)), int(min(a.shape[1], cx + rad + 2))
    yy, xx = np.mgrid[y0:y1, x0:x1]
    circ = (yy - cy) ** 2 + (xx - cx) ** 2 <= rad * rad
    sub = a[y0:y1, x0:x1]
    h, s, v = hsv(sub)
    skin = skin_mask(sub) & (h < 33)          # il giallo del pallone (tinta ~38) non è pelle
    sub[circ & ~skin] = MAGENTA

def remove_colored_balls(a):
    """pallone giallo-blu: macchie piccole e tonde con sia giallo sia blu; il cerchio (con il bordo) diventa sfondo"""
    h, s, v = hsv(a)
    # (anche nei JPG, dove i colori sono più spenti e il blu tira al viola)
    yel = ((h > 35) & (h < 70)) & (s > 0.28) & (v > 0.35)
    blu = ((h > 195) & (h < 275)) & (s > 0.22) & (v > 0.2)
    lab, n = nd.label(nd.binary_dilation(yel | blu, iterations=5))
    for i, sl in enumerate(nd.find_objects(lab)):
        m = lab[sl] == i + 1
        hh, ww = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if m.sum() < 25 or m.sum() > 4000 or not (0.55 < hh / max(1, ww) < 1.8): continue
        if yel[sl][m].sum() < 3 or blu[sl][m].sum() < 3: continue
        clear_circle(a, (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2, max(hh, ww) / 2 + 6)
    return a

def fg_alpha(a):
    r, g, b = a[..., 0].astype(np.int32), a[..., 1].astype(np.int32), a[..., 2].astype(np.int32)
    mag = np.minimum(r, b) - g
    return np.clip((170 - mag) / 80, 0, 1)

def bands(fg, n=4):
    """confini tra le righe: vicino a k/n dell'altezza, dove la proiezione orizzontale ha meno disegno"""
    H = fg.shape[0]; proj = fg.sum(1)
    cuts = [0]
    for k in range(1, n):
        c = int(H * k / n); lo, hi = c - H // 10, c + H // 10
        cuts.append(lo + int(np.argmin(proj[lo:hi])))
    cuts.append(H)
    return cuts

def figures_in_band(fg, y0, y1, want=8):
    """figure di una riga: componenti connesse (unite un poco), poi le più larghe divise dove c'è meno disegno"""
    sub = fg[y0:y1]
    lab, n = nd.label(nd.binary_dilation(sub, iterations=4))
    objs = []
    for i, sl in enumerate(nd.find_objects(lab)):
        m = (lab[sl] == i + 1) & sub[sl]
        if m.sum() < 400: continue
        objs.append([sl[1].start, sl[1].stop])
    objs.sort()
    while len(objs) < want:
        w = [o[1] - o[0] for o in objs]; j = int(np.argmax(w))
        x0, x1 = objs[j]
        proj = sub[:, x0:x1].sum(0); mid = len(proj) // 2; q = len(proj) // 4
        cut = x0 + q + int(np.argmin(proj[q:len(proj) - q]))
        objs[j:j + 1] = [[x0, cut], [cut, x1]]
    return [(y0, y1, x0, x1) for x0, x1 in objs]

def remove_white_ball(rgb, al):
    """pallone bianco tra le mani (palleggio): pezzo bianco piccolo e staccato nel quarto alto della figura (sopra la testa);
    il suo cerchio, con le righe colorate e il bordo, diventa sfondo tranne le dita"""
    h, s, v = hsv(rgb)
    white = (s < 0.22) & (v > 0.72) & (al > 0.5)
    lab, n = nd.label(white)
    ys = np.nonzero(al > 0.5)[0]
    if not len(ys): return rgb, al
    top, H = ys.min(), ys.max() - ys.min()
    rgb = rgb.copy()
    for i, sl in enumerate(nd.find_objects(lab)):
        m = lab[sl] == i + 1
        hh, ww = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if m.sum() < 20 or hh > 0.12 * H or ww > 0.12 * H * 1.4: continue      # la maglia è molto più grande
        if (sl[0].start + sl[0].stop) / 2 > top + 0.2 * H: continue           # solo sopra la testa
        clear_circle(rgb, (sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2, max(hh, ww) / 2 + 4)
    return rgb, fg_alpha(rgb) * (al > 0)

def cut(rgb, al):
    """ritaglio RGBA con lo spill magenta tolto dai bordi (come build_sheet2.py)"""
    rgb = rgb.astype(np.float32)
    edge = nd.binary_dilation(al < 0.99, iterations=2) & (al > 0)
    gch = rgb[..., 1]
    pink = edge & (rgb[..., 0] > gch + 25) & (rgb[..., 2] > gch + 25)
    lvl = np.maximum(gch, np.minimum(rgb[..., 0], rgb[..., 2]) * 0.85)
    for k in range(3): rgb[..., k] = np.where(pink, lvl, rgb[..., k])
    core = nd.binary_erosion(al > 0.5, iterations=1)
    al = np.where(core, al, al * 0.45)
    rgba = np.dstack([np.clip(rgb, 0, 255), al * 255]).astype(np.uint8)
    ys, xs = np.nonzero(al > 0.05)
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def regions(rgba):
    """zone: 1 maglia (bianca, attaccata ai pantaloncini), 2 pantaloncini (rossi), 3 pelle; G = chiaroscuro (come build_sheet2.py)"""
    c = rgba[..., :3].astype(np.int32); al = rgba[..., 3] > 100
    R, G, B = c[..., 0], c[..., 1], c[..., 2]
    lum = (R * 299 + G * 587 + B * 114) // 1000
    sat = c.max(-1) - c.min(-1)
    red = al & (R > 120) & (R > G * 1.9) & (R > B * 1.9)
    skin = al & ~red & (R > G + 8) & (G > B) & (G > R * 0.5) & (sat > 18) & (lum > 60)
    whiteish = al & ~red & ~skin & (sat < 45) & (lum > 120)
    reg = np.zeros(lum.shape, np.uint8)
    reg[red] = 2
    labw, nw = nd.label(whiteish)
    near = nd.binary_dilation(red, iterations=3)
    rcy = np.nonzero(red)[0].mean() if red.any() else lum.shape[0] / 2
    rcx = np.nonzero(red)[1].mean() if red.any() else lum.shape[1] / 2
    lying = lum.shape[1] > lum.shape[0] * 1.3      # sdraiato (tuffo): la maglia è dal lato della testa, a destra
    for j in range(1, nw + 1):
        cj = labw == j
        if cj.sum() <= 40 or not (cj & near).any(): continue
        ys, xs = np.nonzero(cj)
        if (xs.mean() >= rcx - 2) if lying else (ys.mean() <= rcy + 2): reg[cj] = 1
    reg[skin] = 3
    shade = np.zeros(lum.shape, np.int32)
    for z in (1, 2):
        zm = reg == z
        if zm.any(): shade[zm] = np.clip(lum[zm] / max(1, np.median(lum[zm])) * 37, 0, 255)
    shade[reg == 3] = lum[reg == 3]
    return reg, shade

# ---------------- lettura dei fogli ----------------
frames, scale = [], {}
for L, names in SHEETS.items():
    path = next(p for p in (f'{prefix}-{L}.png', f'{prefix}-{L}.jpg', f'{prefix}-{L}.webp') if os.path.exists(p))
    a = np.asarray(Image.open(path).convert('RGB')).copy()
    if L == 'D': a = remove_colored_balls(a)
    al = fg_alpha(a); fg = al > 0.5
    cuts = bands(fg)
    shorts, shirt, skin = [], [], []
    for row in range(4):
        if (L, row) in SKIPROWS: continue
        figs = figures_in_band(fg, cuts[row], cuts[row + 1])
        assert len(figs) == 8, (L, row, len(figs))
        for col, (y0, y1, x0, x1) in enumerate(figs):
            if (L, row, col) in SKIP: continue
            rgb = a[y0:y1, x0:x1]; fa = al[y0:y1, x0:x1].copy()
            # solo la figura più grande della cella (niente pezzi delle figure vicine)
            lab, n = nd.label(nd.binary_dilation(fa > 0.5, iterations=4))
            if n > 1:
                sizes = nd.sum(fa > 0.5, lab, range(1, n + 1)); keep = 1 + int(np.argmax(sizes))
                fa = np.where(lab == keep, fa, 0)
            if L == 'C': rgb, fa = remove_white_ball(rgb, fa)
            # pezzetti rimasti staccati dal corpo (bordi del pallone tolto): via
            lab, n = nd.label(fa > 0.3)
            if n > 1:
                sizes = nd.sum(fa > 0.3, lab, range(1, n + 1)); big = sizes.max()
                small = [j + 1 for j, sz in enumerate(sizes) if sz < big * 0.03]
                if small: fa = np.where(np.isin(lab, small), 0, fa)
            im = cut(rgb, fa)
            reg, shade = regions(im)
            if (reg == 2).sum() > 50: shorts.append((reg == 2).sum())
            if (reg == 1).sum() > 50: shirt.append((reg == 1).sum())
            skin.append((reg == 3).sum())
            frames.append(dict(sheet=L, row=row, col=col, name=names[row], im=im, reg=reg, lum=shade))
    # misura del foglio: media geometrica di maglia, pantaloncini e pelle (cambiano poco con la posa)
    scale[L] = (np.median(shorts) * np.median(shirt) * np.median(skin)) ** (1 / 6)
# stessa scala per tutti i fogli (riferimento: il foglio A)
ref = scale['A']
print('scala dei fogli', {k: round(ref / v, 3) for k, v in scale.items()})
for f in frames:
    k = ref / scale[f['sheet']]
    if abs(k - 1) < 0.01: continue
    im = Image.fromarray(f['im'], 'RGBA'); w, h = max(1, round(im.width * k)), max(1, round(im.height * k))
    f['im'] = np.asarray(im.resize((w, h), Image.LANCZOS))
    f['reg'] = np.asarray(Image.fromarray(f['reg']).resize((w, h), Image.NEAREST))
    f['lum'] = np.asarray(Image.fromarray(f['lum'].astype(np.uint8)).resize((w, h), Image.NEAREST)).astype(np.int32)
for f in frames:
    al = f['im'][..., 3] > 100
    ys, xs = np.nonzero(al)
    low = ys > f['im'].shape[0] * 0.7
    f['ax'] = xs[low].mean() if low.any() else xs.mean()

# ---------------- atlante ----------------
half = int(max(max(f['ax'], f['im'].shape[1] - f['ax']) for f in frames)) + 2
CW, CH = half * 2, max(f['im'].shape[0] for f in frames) + 2
cols = 12
rowsN = (len(frames) + cols - 1) // cols
atlas = Image.new('RGBA', (CW * cols, CH * rowsN), (0, 0, 0, 0))
regA = np.zeros((CH * rowsN, CW * cols, 3), np.uint8)
anims = {}
for k, f in enumerate(frames):
    cx, cy = (k % cols) * CW, (k // cols) * CH
    im = Image.fromarray(f['im'], 'RGBA')
    x = int(round(cx + half - f['ax'])); y = cy + CH - im.height
    atlas.paste(im, (x, y), im)
    hh, ww = f['reg'].shape
    sl = regA[y:y + hh, x:x + ww]
    sl[..., 0] = np.where(f['reg'] > 0, f['reg'] * 80, sl[..., 0])
    sl[..., 1] = np.where(f['reg'] > 0, np.clip(f['lum'], 0, 255), sl[..., 1])
    anims.setdefault(f['name'], []).append(k)
for name, (src, idx) in ALIAS.items():
    if name not in anims: anims[name] = [anims[src][min(i, len(anims[src]) - 1)] for i in idx]

def uri(img):
    bio = io.BytesIO(); img.save(bio, 'PNG', optimize=True); return 'data:image/png;base64,' + base64.b64encode(bio.getvalue()).decode()
stand = int(np.median([f['im'].shape[0] for f in frames if (f['sheet'], f['row'], f['col']) in STAND]))
js = (f'// Generato da tools/photo/build_sheet3.py dai fogli {os.path.basename(prefix)}-A..D: non modificare a mano.\n'
      f'const {VAR} = {json.dumps(dict(cw=CW, ch=CH, cols=cols, n=len(frames), stand=stand, sheet=3, anims=anims))};\n'
      f"{VAR}.atlas = '{uri(atlas)}';\n"
      f"{VAR}.regions = '{uri(Image.fromarray(regA))}';\n")
open(out, 'w').write(js)
atlas.save(out.replace('.js', '_atlas_preview.png'))
Image.fromarray(regA).save(out.replace('.js', '_regions_preview.png'))
print('celle', CW, CH, 'fotogrammi', len(frames), 'altezza in piedi', stand, 'kB', len(js) // 1024, {k: len(v) for k, v in anims.items()})
