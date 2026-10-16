# SPIKE FEVER 2600

Versione per **Atari 2600 (VCS)** di Spike Fever, in stile **Power Spikes**: 2 contro 2, cartuccia da **4K**, scritta in assembly 6502.
Si gioca nel browser con [`index.html`](index.html) (emulatore Javatari.js), oppure si scarica `spikefever2600.bin` per Stella, per un altro emulatore o per un Atari vero con una cartuccia flash.

## Come si gioca
Ogni squadra ha un **alzatore** (vicino alla rete) e un **attaccante/ricevitore**.

| Momento | Cosa fare |
|---|---|
| Battuta | Pulsante = lancio; di nuovo quando la palla diventa **rossa** = colpo. Joystick verso la rete = corta, verso il fondo = lunga |
| Ricezione | Muovi il ricevitore sul **segno giallo** a terra: il bagher è automatico, più sei preciso più la palla arriva bene all'alzatore |
| Alzata | Automatica |
| Schiacciata | Rincorsa e salto automatici: premi quando la palla è **rossa**. Verso la rete = corta, verso il fondo = lunga, su = pallonetto. Fuori tempo = palla lenta; se non premi, la palla passa facile |
| Muro | Quando attaccano gli avversari, premi il pulsante: salta il tuo alzatore |

- **GAME SELECT**: 1 o 2 giocatori, palazzetto (set a 15) o spiaggia (set a 21). In alto compaiono il numero di giocatori e i punti del set.
- **GAME RESET**: nuova partita. Senza RESET va la dimostrazione (computer contro computer).
- **Difficoltà destra A**: il computer sbaglia meno in ricezione e mura di più.
- **Regole**: rally point, si vince con 2 punti di scarto. Punto quando la palla cade in campo, va fuori o finisce in rete.

Tasti in Javatari: F12 = RESET, F11 = SELECT, F9 = difficoltà destra, frecce + spazio = joystick 1.

## Il kernel
Il cuore del programma è il **kernel**, il codice che disegna lo schermo riga per riga mentre il pennello elettronico scorre.

- **NTSC**: 262 righe per fotogramma (3 VSYNC, 37 VBLANK, 192 visibili, 30 overscan), misurate su 18.000 fotogrammi di gioco.
- **Parte alta (24 righe)**:
  - titolo **SPIKEFEVER** in *playfield asimmetrico*: 6 scritture per riga, a tempo con il pennello;
  - in partita, il punteggio nei colori delle squadre (modo SCORE del TIA).
- **Area di gioco: 168 righe in kernel a 2 righe (2LK)**:
  - **riga A**: colore di fondo (sfumature del cielo, mare, sabbia, parquet, tribune), PF0 e PF1 dello scenario, giocatore sinistro, palla;
  - **riga B**: PF2 (rete con le maglie, sole, nuvole), colore del playfield, segno di caduta (missile 0), giocatore destro.
- **Giocatori multicolore**: ogni riga dello sprite ha il suo colore (capelli, pelle, maglia, pantaloncini, scarpe o piedi nudi in spiaggia). Le animazioni sono 6: fermo, corsa (2), salto, bagher, schiacciata.
- **2 contro 2**: il TIA disegna solo 2 giocatori per riga, quindi i due compagni si alternano a ogni fotogramma (30 Hz), come in molti giochi dell'epoca.
- **La palla è il missile 1**: l'oggetto *ball* del TIA prende il colore del playfield, che cambia a ogni riga. Il missile 1 prende invece il colore del giocatore destro, che fuori dallo sprite vale bianco, oppure **rosso** quando bisogna colpire.
- **Due arene, in dati generati da `gen_data.py`**:
  - **palazzetto**: parquet, linea del campo, cartelloni, pubblico colorato, luci;
  - **spiaggia**: sabbia, nastro blu, mare con riflessi, palme, nuvole, sole, palo imbottito giallo.
- **Traiettorie a tempo fisso** (16, 32 o 64 fotogrammi): la velocità si calcola con soli spostamenti di bit. Così la palla arriva esattamente sulle mani dell'alzatore o nel punto di schiacciata, nel fotogramma previsto.

## Compilare
```sh
npm install dasm                    # assemblatore dasm (versione JavaScript)
python3 gen_data.py > data.inc      # grafica, colori, arene, titolo, cifre
node build.js                       # -> spikefever2600.bin (4096 byte)
```

| File | Contenuto |
|---|---|
| `spikefever2600.asm` | programma completo (kernel, logica, dati), commentato |
| `gen_data.py` | disegni dei giocatori, colori delle squadre, arene, titolo e cifre: modificali qui |
| `data.inc` | tabelle generate (non modificare a mano) |
| `index.html` | pagina per giocare nel browser |
| `javatari.js`, `javatari-license.txt` | emulatore [Javatari.js](https://github.com/ppeccin/javatari.js) di Paulo Peccin (licenza AGPL v3), non modificato |
