# stima dello sfondo (mediana larga su immagine ridotta) e maschera per differenza di colore
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd
im = Image.open(sys.argv[1]).convert('RGBA')
a = np.asarray(im).astype(np.int32)
rgb, al = a[..., :3], a[..., 3]
k = 4
small = np.asarray(im.convert('RGB').resize((im.width // k, im.height // k), Image.BILINEAR)).astype(np.float32)
bg = np.stack([nd.median_filter(small[..., c], size=(9, 31)) for c in range(3)], -1)
bg = np.asarray(Image.fromarray(np.clip(bg, 0, 255).astype(np.uint8)).resize(im.size, Image.BILINEAR)).astype(np.int32)
np.save(sys.argv[2], bg)
d = np.sqrt(((rgb - bg) ** 2).sum(-1))
T = float(sys.argv[3])
fg = (d > T) & (al >= 200)
out = np.zeros_like(rgb); out[:] = [255, 0, 255]; out[fg] = rgb[fg]
y0, y1 = int(sys.argv[5]), int(sys.argv[6])
Image.fromarray(out.astype('uint8')[y0:y1]).save(sys.argv[4])
