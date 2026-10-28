# Giocatori "foto": rigenerare photo-sprites.js

## Fogli attuali: 3d-maschile-A..D.png (generati con ChatGPT, prompt in PROMPT-CHATGPT-3D.md)
Sfondo magenta, maglia bianca, pantaloncini rossi, 4 righe x 8 fotogrammi per foglio:
- A: attesa, corsa, rincorsa, schiacciata;
- B: schiacciata con la palla davanti, bagher, bagher laterale, tuffo;
- C: palleggio, palleggio in salto, pallonetto, muro;
- D: battuta, battuta in salto, salto flottante, esultanze.

```sh
cd tools/photo
python3 build_sheet3.py 3d-maschile ../../photo-sprites.js
```

`build_sheet3.py` lavora così:
- toglie i palloni disegnati (giallo-blu nelle battute, bianco nel palleggio), lasciando le mani;
- separa righe e figure, anche quelle che si toccano;
- scarta i fotogrammi in `SKIP` (il batti cinque con due persone);
- porta i fogli alla stessa scala, misurando maglia, pantaloncini e pelle;
- scrive l'atlante con `sheet: 3`.

In `photo.js` → `photoFrame3` la posa scelta da `match.js` (motion) indica la riga e lo stato del giocatore il fotogramma.

### Giocatrici: 3d-femminile-A..D (PNG o JPG)

```sh
python3 build_sheet3.py 3d-femminile ../../photo-sprites-f.js
```

Lo script scrive `PHOTO_SPRITES_F`; `photo.js` lo usa nella versione femminile.

Nei fogli attuali non sono utilizzabili:
- foglio C, righe 2-4 (copia del foglio B);
- foglio D, righe 3-4 (bagher laterale ed esultanze sovrapposte ai tuffi).

Lo script le salta (`SKIPROWS`) e per quei movimenti usa pose simili (`ALIAS`). Quando arrivano fogli corretti si tolgono da `SKIPROWS` e `ALIAS` e si rilancia.

## Foglio precedente: foglio-sprite-2.webp (generato con ChatGPT)
Sfondo magenta (#FF00FF), maglia bianca, pantaloncini rossi, due pannelli da 6 righe x 8 fotogrammi:
attesa, corsa, rincorsa, schiacciata, bagher, palleggio | muro, battuta in salto, battuta, tuffo, pallonetto, esultanze.

```sh
cd tools/photo
python3 build_sheet2.py foglio-sprite-2.webp ../../photo-sprites.js
```

`build_sheet2.py` ritaglia le figure sul magenta (senza alone), le assegna a riga e pannello, trova le zone da ricolorare
(maglia bianca attaccata ai pantaloncini, pantaloncini rossi, pelle) e crea l'atlante. In `photo.js` → `photoFrame` ogni
stato del giocatore sceglie il fotogramma della riga giusta. Un foglio nuovo con lo stesso schema si usa senza toccare il codice.

## Palloni: 3d-palloni.png
Sfondo magenta, 4 righe x 8 fotogrammi: pallone moderno giallo-blu (PRO), classico bianco (CLASSIC), beach, moderno schiacciato.
(`palloni.webp` è il foglio precedente.)

```sh
python3 build_balls.py 3d-palloni.png ../../ball-sprites.js
```

Nella 3D `balls.js` usa questi fotogrammi: rotazione in 8 tempi con la luce ferma e schiacciamento all'impatto
(a terra, schiacciata, muro). In ARCADE e HD restano i palloni disegnati.

## Arbitro e spettatori: 3d-arbitro.png, 3d-spettatori.png
Arbitro: 1 riga di 7 gesti (fischio, battuta a sinistra e a destra dello schermo, fuori, tocco del muro, rete, punto).
Spettatori: 4 righe x 8 persone con la maglietta bianca (seduti, braccia alzate, applauso, sciarpa o bandierina).

```sh
python3 build_scene3d.py 3d-arbitro.png 3d-spettatori.png ../../scene3d-sprites.js
```

Lo script ritaglia le figure sul magenta (toglie anche il riflesso rosa sulle braccia un po' trasparenti), porta l'arbitro
a una scala unica con il centro della testa per allinearlo nel pannello, e per gli spettatori salva la mappa della maglia
bianca (zone bianche grandi nella metà bassa: occhi e denti restano bianchi). Nella 3D `scene3d.js` mette l'arbitro nel
pannello (`makeRefTex`) e le persone sugli spalti (`fanPerson`), con la maglia ricolorata.

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
