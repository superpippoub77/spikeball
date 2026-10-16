# Estrazione dei fotogrammi: sfondo stimato (mediana larga), differenza di colore, chiusura e riempimento buchi.
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as nd
src, bgfile, outdir = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src).convert('RGBA'); a = np.asarray(im).astype(np.int32)
rgb, al = a[..., :3], a[..., 3]
bg = np.load(bgfile)
d = np.sqrt(((rgb - bg) ** 2).sum(-1))
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
lum = (r * 299 + g * 587 + b * 114) // 1000
# pallone: giallo (verde quasi quanto il rosso, poco blu) o blu saturo; la pelle ha verde/rosso ~0.65
yellow = (r > 140) & (g > 0.74 * r) & (b < 0.5 * r)
blue = (b > r + 40) & (b > g + 15) & (b > 90)
ball = yellow | blue
fg = (d > 26) & (al >= 200) & ~ball
fg = nd.binary_closing(fg, structure=np.ones((7, 7)), iterations=1)
fg = nd.binary_closing(fg, structure=np.ones((13, 3)), iterations=1)   # tagli orizzontali nel busto
fg = nd.binary_fill_holes(fg)
fg = nd.binary_opening(fg, iterations=1)
fg &= ~nd.binary_dilation(ball, iterations=2)
ballnear = nd.binary_dilation(ball, iterations=9)   # cuciture scure del pallone
lab, n = nd.label(fg)
objs = nd.find_objects(lab)
big = [(i, sl) for i, sl in enumerate(objs) if sl[0].stop - sl[0].start >= 60]
small = [(i, sl) for i, sl in enumerate(objs) if sl[0].stop - sl[0].start < 60]
ROWS = [(0, 330), (330, 570), (570, 820), (820, 1000)]
frames = []
for i, sl in big:
    y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
    ids = [i + 1]
    # pezzi staccati (mani, piedi) dentro il riquadro allargato
    for j, s2 in small:
        cy, cx = (s2[0].start + s2[0].stop) / 2, (s2[1].start + s2[1].stop) / 2
        sm = lab[s2] == j + 1
        area = sm.sum()
        if area < 40 or (ballnear[s2] & sm).any(): continue
        txt = ((lum[s2] > 170) & sm).sum() > 0.3 * area          # scritte bianche dei titoli
        above = cy < y0
        if txt or (above and (not (x0 <= cx <= x1) or s2[0].stop < y0 - 6)): continue   # sopra: solo se attaccato (la testa)
        if y0 - 45 <= cy <= y1 + 4 and x0 - 4 <= cx <= x1 + 4:
            ids.append(j + 1); y0, y1, x0, x1 = min(y0, s2[0].start), max(y1, s2[0].stop), min(x0, s2[1].start), max(x1, s2[1].stop)
    m = np.isin(lab[y0:y1, x0:x1], ids)
    row = next(k for k, (lo, hi) in enumerate(ROWS) if lo <= y1 < hi)
    frames.append(dict(row=row, x0=x0, y0=y0, x1=x1, y1=y1, m=m))
frames.sort(key=lambda f: (f['row'], f['x0']))
merged = []
for f in frames:
    p = merged[-1] if merged else None
    ov = (min(p['x1'], f['x1']) - max(p['x0'], f['x0'])) if p else 0
    if p and p['row'] == f['row'] and ov > 0.6 * min(p['x1'] - p['x0'], f['x1'] - f['x0']):   # quasi stessa colonna: figura spezzata
        y0, y1, x0, x1 = min(p['y0'], f['y0']), max(p['y1'], f['y1']), min(p['x0'], f['x0']), max(p['x1'], f['x1'])
        m = np.zeros((y1 - y0, x1 - x0), bool)
        for q in (p, f): m[q['y0'] - y0:q['y1'] - y0, q['x0'] - x0:q['x1'] - x0] |= q['m']
        merged[-1] = dict(row=f['row'], x0=x0, y0=y0, x1=x1, y1=y1, m=m)
    else: merged.append(f)
frames = merged
meta = []
cnt = {}
for f in frames:
    c = cnt.get(f['row'], 0); cnt[f['row']] = c + 1
    crop = a[f['y0']:f['y1'], f['x0']:f['x1']].astype(np.uint8).copy()
    alpha = f['m'].astype(np.float32)
    alpha = nd.gaussian_filter(alpha, 0.6) * f['m'] + 0  # bordo leggermente morbido
    crop[..., 3] = np.clip(alpha * 255, 0, 255).astype(np.uint8)
    name = f"r{f['row']}_{c:02d}.png"
    Image.fromarray(crop).save(f'{outdir}/{name}')
    meta.append(dict(file=name, row=f['row'], x0=int(f['x0']), y0=int(f['y0']), w=int(f['x1'] - f['x0']), h=int(f['y1'] - f['y0']), foot=int(f['y1'])))
json.dump(meta, open(f'{outdir}/meta.json', 'w'), indent=1)
print({k: v for k, v in sorted(cnt.items())})
for r in sorted(cnt): print(r, [(m['x0'], m['w'], m['h']) for m in meta if m['row'] == r])
