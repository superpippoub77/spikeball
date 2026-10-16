import sys, json
from PIL import Image, ImageDraw
d = sys.argv[1]; meta = json.load(open(d + '/meta.json'))
rows = {}
for m in meta: rows.setdefault(m['row'], []).append(m)
W, H = 110, 190
cols = max(len(v) for v in rows.values())
s = Image.new('RGB', (W * cols, H * len(rows)), (40, 160, 120))
dr = ImageDraw.Draw(s)
for ri, (r, ms) in enumerate(sorted(rows.items())):
    for ci, m in enumerate(ms):
        im = Image.open(d + '/' + m['file'])
        sc = min(1, (H - 20) / im.height, (W - 6) / im.width)
        im = im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))))
        s.paste(im, (ci * W + (W - im.width) // 2, ri * H + H - 14 - im.height), im)
        dr.text((ci * W + 3, ri * H + 2), f'{r}.{ci}', fill=(255, 255, 255))
s.save(sys.argv[2])
