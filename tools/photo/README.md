# Giocatori "foto": rigenerare photo-sprites.js

## Foglio attuale: foglio-sprite-2.webp (generato con ChatGPT)
Sfondo magenta (#FF00FF), maglia bianca, pantaloncini rossi, due pannelli da 6 righe x 8 fotogrammi:
attesa, corsa, rincorsa, schiacciata, bagher, palleggio | muro, battuta in salto, battuta, tuffo, pallonetto, esultanze.

```sh
cd tools/photo
python3 build_sheet2.py foglio-sprite-2.webp ../../photo-sprites.js
```

`build_sheet2.py` ritaglia le figure sul magenta (senza alone), le assegna a riga e pannello, trova le zone da ricolorare
(maglia bianca attaccata ai pantaloncini, pantaloncini rossi, pelle) e crea l'atlante. In `photo.js` → `photoFrame` ogni
stato del giocatore sceglie il fotogramma della riga giusta. Un foglio nuovo con lo stesso schema si usa senza toccare il codice.

## Palloni: palloni.webp
Sfondo magenta, 4 righe x 8 fotogrammi: pallone moderno giallo-blu (PRO), classico bianco (CLASSIC), beach, moderno schiacciato.

```sh
python3 build_balls.py palloni.webp ../../ball-sprites.js
```

In HD e 3D `balls.js` usa questi fotogrammi: rotazione in 8 tempi con la luce ferma e schiacciamento all'impatto
(a terra, schiacciata, muro). Nella versione ARCADE restano i palloni in pixel art.

## Foglio precedente (divisa nera)

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
