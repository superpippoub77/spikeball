# Giocatori "foto": rigenerare photo-sprites.js

Dal foglio sprite fotografico (`foglio-sprite.webp`) ai fotogrammi del gioco. Serve Python 3 con `numpy`, `pillow`, `scipy`.

```sh
cd tools/photo
python3 bgest.py foglio-sprite.webp sfondo.npy 26 maschera.png 0 1000   # stima dello sfondo
mkdir -p fotogrammi && python3 extract2.py foglio-sprite.webp sfondo.npy fotogrammi
python3 contact.py fotogrammi anteprima.png                              # controllo a occhio
python3 build_photo.py fotogrammi ../../photo-sprites.js
```

Il foglio deve avere 4 righe di animazioni nell'ordine: attesa (9) e camminata (8); corsa (7) e salto (9);
schiacciata (9) e bagher (8); muro (8) e battuta (8). Tuffo e caduta sono generati ruotando il bagher.
`build_photo.py` crea anche la mappa delle zone (maglia, pantaloncini, pelle) usata per ricolorare le squadre.
