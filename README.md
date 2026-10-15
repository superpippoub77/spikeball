# Spike Fever '91 — remake di Power Spikes (Video System, 1991) in Phaser 3

Ricostruito scena per scena dal video completo dell'arcade e dal manuale operatore.
Grafica e suoni sono generati da codice (nessun asset originale): volti, arbitro, bandiere e palazzetto sono pixel art nuova.

## Avvio
Apri `index.html` nel browser (meglio con un server locale, es. `npx serve`). Phaser è incluso (`phaser.min.js`).

### Grafica: pixel art o HD
- **Pixel art** (predefinita): la grafica originale a 320×224.
- **HD** (prototipo): giocatori vettoriali ad alta risoluzione con contorni netti e ombreggiatura (`gfx-hd.js`), canvas a 1920 px. Palazzetto, pallone e schermate restano per ora in pixel art.

Si cambia con il tasto **H** (ricarica la pagina) oppure dall'indirizzo: `index.html?gfx=hd` / `index.html?gfx=pixel`. La scelta viene ricordata.

## Tasti
| | Giocatore 1 | Giocatore 2 |
|---|---|---|
| Joystick (8 direzioni) | Frecce | W A S D |
| Pulsante unico | Z (o Spazio) | G |
| Start | Invio o 1 | 2 |
| Gettone | 5 o C | |
| Pausa / muto | P / M | |
| Grafica pixel / HD | H | |

## Come si gioca (dal manuale)
- **Battuta:** il battitore è già fuori dal campo con la palla in mano. Pulsante per lanciare, pulsante per colpire quando la palla diventa rossa ("HIT! PRESS BUTTON!"). Frecce riferite al battitore rivolto verso la rete:
  - neutro + Z, Z = battuta dall'alto
  - avanti + Z = battuta in salto (rincorsa e stacco automatici dietro la linea, Z in cima al salto)
  - SU + Z, SU + Z = **TOWERING SERVE** (circa 5 s in aria)
  - SU-avanti + Z, GIÙ-avanti + Z = **PHANTOM SERVE** (la palla si sdoppia in 3 scendendo)
  - SU-indietro + Z, GIÙ-indietro + Z = **THUNDER SERVE** (lampo bianco, la palla piomba giù)
- **Ricezione:** solo joystick, porta il giocatore schiarito sul quadratino blu. Il pulsante non si usa, il tuffo è automatico.
- **Alzata:** automatica. Se la ricezione è sbagliata ("OH! HE MISHITS THE BALL!") muovi l'alzatore col joystick.
- **Schiacciata:** rincorsa e salto automatici, premi il pulsante quando la palla arriva alla mano.
  Quando la palla è colpibile diventa rossa e sopra lo schiacciatore compare "HIT! PRESS BUTTON!".
  La freccia blu nel campo avversario è il punto di arrivo: la sposti con sinistra/destra ("MOVE ←→").
  Primo tempo: premi il pulsante prima dell'alzata e il centrale salta insieme all'alzatore (alzata corta).
  Seconda linea (joystick indietro all'alzata): il giocatore di fondo stacca dietro la linea dei 3 metri.
- **Muro:** premi il pulsante quando l'avversario salta.

### Tecniche (schermate TECHNIC 1-4)
- **Direzione:** sinistra/destra mentre colpisci.
- **Quick attack:** pulsante prima dell'alzata.
- **Open attack:** joystick SU durante la ricezione.
- **Tipo di alzata:** SU alta, GIÙ bassa, INDIETRO seconda linea.
- **In schiacciata:** SU pallonetto, GIÙ power spike.
- **Fake attack:** pulsante prima che l'asso salti; lui finta e colpisce un compagno.
- **Surprise attack:** durante l'alzata in salto, joystick verso rete + pulsante.

## Struttura arcade
- **Attract:** logo, demo, "EASY TO PLAY", "CHALLENGE A FRIEND", demo, classifica.
- **1 giocatore:** scegli tra 9 nazionali, poi CINA, GIAPPONE, USA, CUBA e finale URSS. Con le regole 1991 si parte da 12-12, 11-12, 10-12, 9-12, 8-11 come nel video; in rally point gli stessi punteggi meno 7 (5-5, 4-5, 3-5, 2-5, 1-4: `RALLY_START_SHIFT`).
- **Partita:** set a 15 in **rally point** (regola odierna: ogni azione vale un punto), 2 punti di scarto, senza tetto. Con `SIDE_OUT: true` in `config.js` tornano le regole 1991 (cambio palla, tetto a 17), tempo 3:00 a scalare. Il tempo avanzato diventa bonus. Se perdi c'è CONTINUE, alla fine classifica con nome.
- **2 giocatori:** 1 set o 5 set (vince chi arriva a 3), partenza 9-9, 3 minuti per set.

## Parametri (src/config.js)
`MATCH_TIME`, `START_2P`, `HARD`, `FREE_PLAY` (come i DIP switch), `G` gravità, `SPIKE_SPEED`, `JUMP_V`, punteggi di partenza e forza CPU in `STAGES`,
squadre, colori, nomi e pavimenti in `TEAMS`. `GAME_TITLE` per cambiare il titolo.

## Modalità test e pratica
- **T** nelle schermate di attract apre il menu **TEST MODE - PRATICA**: battuta, ricezione, alzata e schiacciata, muro e difesa.
- Durante la pratica e in partita, **T** mostra o nasconde i comandi da eseguire in quel momento; nella pratica **ESC** torna al menu.
- `TEST_MODE: true` in `config.js` tiene la sovraimpressione sempre attiva.

## Note tecniche
- Il gioco gira alla risoluzione nativa 320x224, disegnata a 3x (`ZOOM`): lo scorrimento è fluido a sotto-pixel e la grafica resta a pixel.
- Partita persa: sul tabellone finale compare "YOU LOST - CONTINUE PLAY? 9"; con un gettone e Start si rigioca l'incontro.
