# Guida allo sviluppo di Spike Fever '91

Questa guida spiega come è fatto il progetto e **dove intervenire** per le modifiche più comuni.
Ogni file `.js` inizia con un **indice** delle sue parti, e le funzioni importanti hanno un commento che spiega cosa fanno.

---

## 1. Provare il gioco sul proprio computer

Il gioco è fatto di soli file statici (HTML + JavaScript + immagini): niente da compilare.
Serve però un **piccolo server locale**, perché il browser non lascia leggere `squadre.json`, `campionati.json` e i loghi aprendo direttamente `index.html`.

```sh
cd spikeball
npx serve            # oppure:  python3 -m http.server 8000
```
Poi apri l'indirizzo indicato (es. `http://localhost:3000`). Dopo ogni modifica basta **ricaricare la pagina** (Ctrl+F5).

Strumenti utili:
- **F12 → Console** del browser: qui compaiono gli errori JavaScript (file e numero di riga).
- Dalla console si può ispezionare il gioco: `window.__game.scene.getScenes(true)` (scena attiva), `TEAMS.VTV`, `LEAGUES.list`, `GS.credits = 9`.
- In partita: **T** mostra cosa premere, **P** pausa, **M** muto, **H** cambia versione grafica (ARCADE / HD / 3D).

---

## 2. Mappa dei file

L'ordine conta: `index.html` carica gli script in questa sequenza e ogni file usa quelli precedenti.

| File | Contenuto |
|---|---|
| `phaser.min.js` | Motore di gioco [Phaser 3](https://phaser.io) (non si modifica) |
| `config.js` | **Costanti di gioco** (`CFG`), squadre nazionali (`TEAMS`), avversari arcade (`STAGES`), versione grafica (`GFX`), fisica della palla (`PHYS`), titolo/autore/versione |
| `gfx.js` | Grafica ARCADE (pixel art): pose dei giocatori (`SKEL`), volti, arbitro, bandiere, palazzetto; **canvasTex/texDone** per le texture ad alta risoluzione |
| `gfx-hd.js` | Grafica HD vettoriale (giocatori, volti, arbitro, pallone, pubblico) |
| `audio.js` | Suoni sintetizzati (`SFX`) |
| `match.js` | **La partita** (scena `Match`): battuta, IA, movimento, palla, tocchi, punteggio, telecamera |
| `scenes.js` | Schermate della modalità **arcade 1991** (attract, scelta squadra, intro, classifica...) e **avvio del gioco** (`startGame`) |
| `modern.js` | Modalità moderna: **menu principale**, selezione squadre, impostazioni partita, statistiche finali, arene moderne |
| `roster.js` | **Squadre personalizzate** da `squadre.json`, loghi, trascinamento dei file sulla finestra |
| `league.js` | **Campionati** da `campionati.json`: squadre generate, classifica FIPAV, simulazione, schermate del campionato |
| `photo-sprites.js` | Atlante dei giocatori 3D (generato da `tools/photo`, non si modifica a mano) |
| `photo.js` | Versione **3D**: ricolore per squadra e animazioni dei giocatori fotorealistici |
| `lineup.js` | **Formazione**: rosa di ogni squadra, titolari automatici, scelta dei giocatori in ogni posto (scena `Formazione`) |
| `beach.js` | **Beach volley**: squadre da spiaggia, arene sulla sabbia, menu, partita al meglio dei 3 set |
| `myplayer.js` | **Il mio giocatore**: scheda, inserimento nella squadra, crescita delle statistiche a fine partita |

Dati e risorse:

| File / cartella | Contenuto |
|---|---|
| `squadre.json` | Squadre vere (es. Valsesia): giocatori, numeri, ruoli, età, livelli, colori, logo |
| `squadre.esempio.json` | Esempio con squadre inventate (usato se `squadre.json` manca) |
| `campionati.json` | Campionati con squadre e calendario |
| `loghi/` | Loghi delle squadre |
| `tools/campionati/` | Convertitore del calendario dal sito della federazione a `campionati.json` |
| `tools/photo/` | Script che ricavano i fotogrammi 3D dal foglio sprite |
| `atari2600/` | Versione **Atari 2600** (assembly 6502, cartuccia 16K a 4 banchi): vedi `atari2600/README.md` |
| `.github/workflows/` | Pubblicazione automatica sul sito (FTP Aruba) a ogni modifica di `main` |

---

## 3. Concetti da conoscere prima di modificare

### Coordinate e unità
- Tutto è in **pixel nativi** della risoluzione arcade **320 × 224**, anche in HD e 3D (lì il canvas è solo più grande).
- **x**: posizione orizzontale, **0 = rete**. La squadra sinistra sta a x < 0 (`side = -1`), la destra a x > 0 (`side = +1`).
- **h / z**: altezza dal pavimento (palla / giocatore), verso l'alto. Sullo schermo `y = CFG.FLOOR_Y - h`.
- **20 px = 1 metro** (`CFG.PPM`). La rete è alta 52 px, metà campo 180 px.

### Tre versioni grafiche
`GFX` (in `config.js`) vale `'pixel'` (ARCADE), `'hd'` o `'3d'`. In HD/3D `CFG.ZOOM` passa da 3 a 6 e le texture vengono disegnate a **GR = 6** volte la risoluzione.
Per creare una nuova texture **usa sempre** `canvasTex(scene, chiave, larghezza, altezza)` e `texDone(t)` (in `gfx.js`): disegni in pixel nativi e funziona in tutte e tre le versioni.

### Le scene di Phaser vengono riusate
Ogni schermata è una classe `...Scene`. Phaser **riusa lo stesso oggetto** ogni volta che la scena riparte, quindi le proprietà della volta precedente restano.
- In `create()` chiama sempre `camSetup(this)`: azzera `gone`, `done`, `leaving`, `_born`, `counting`. **Non usare questi nomi** per altre cose: è già successo un bug con `done`.
- Azzera in `create()` tutto quello che la scena tiene in memoria (vedi l'inizio di `MatchScene.create`).

### Funzioni "avvolte"
Alcuni file estendono funzioni definite prima, senza modificarle:
- `drawFlag` → `modern.js` aggiunge bandiere, `roster.js` aggiunge stemmi e loghi.
- `startGame` → `roster.js`, `league.js` e `photo.js` caricano i loro dati prima dell'avvio.
- `MainMenuScene.prototype.create` → `roster.js` e `photo.js` aggiungono scritte al menu.
- `teamPool` / `lineupOf` (lineup.js) → `myplayer.js` aggiunge il mio giocatore alla rosa e lo mette in campo.
- `MatchScene.prototype.startEnd` → `myplayer.js` aggiorna le statistiche del mio giocatore.

### Giocatori in campo, ruoli dei posti, look
- La partita usa `FORMATIONS[n]` (2, 3, 4 o 6 giocatori). Ogni giocatore ha `pos` (mb, set, oh, def, bk, lib, bch): l'IA sceglie chi alza, chi attacca e chi mura dal ruolo del posto, non dall'indice.
- Batte il posto più lontano dalla rete (`t.srvI`); la rotazione fa scorrere i nomi tra i posti.
- `setLook(scene, true)` attiva il look da spiaggia: le texture dei giocatori hanno chiavi diverse (`_b` finale), quindi le due versioni convivono.

Se modifichi una di queste funzioni, ricordati che altri file ci si appoggiano.

### Il ciclo della partita (`match.js`)
Ogni frame: `update` → uno o più `step(dt)` a passi fissi di 1/120 s (fisica sempre uguale) → `render`.
Gli stati della partita sono: `intro → serve → rally → dead → serve … → end`.
In `step`: battuta (`updateServe`), IA (`think`), movimento (`movePlayer`), palla (`updateBall` → `checkContacts` → `doPass`/`doSet`/`doSpike`/`doBlock`), punto (`ballLanded` → `endRally` → `updateDead` → `applyScore`).

---

## 4. Dove si cambia cosa

| Voglio... | Dove |
|---|---|
| Cambiare **titolo, autore, versione** | `config.js`: `GAME_TITLE`, `GAME_AUTHOR`, `GAME_VERSION` (aggiornare la versione a ogni rilascio) |
| Rendere i giocatori **più veloci** o i salti più alti | `config.js` → `CFG.RUN`, `CFG.JUMP_V`, `CFG.DIVE_V` |
| Schiacciate **più potenti** | `CFG.SPIKE_SPEED` |
| Cambiare le **regole** (punti del set, cambio palla) | `CFG.TARGET`, `CFG.WIN_BY`, `CFG.SIDE_OUT`; modalità moderna: `OPT.rules` in `modern.js` |
| Tempo della partita arcade, gettoni | `CFG.MATCH_TIME`, `CFG.FREE_PLAY` |
| **Difficoltà** dell'IA arcade | `STAGES[].skill` in `config.js` |
| Forza delle **nazionali** | `TEAM_STATS` in `modern.js` (attacco, difesa, velocità 0-100) |
| Bilanciamento fine (ace, muro, errori) | `match.js`: `checkContacts` (probabilità `p.miss`), `doBlock` (murate), `blockerJump`, `doSpike` (errori), `aiSpikeTarget` |
| Aggiungere una **squadra vera** | `squadre.json` (formato nel README) |
| Aggiungere un **campionato** | `python3 tools/campionati/calendario2json.py calendario.txt campionati.json --id ID --nome "Nome"` |
| Aggiungere un **logo** | metti l'immagine in `loghi/` e scrivi `"logo": "loghi/nome.png"` nella squadra |
| Aggiungere una **nazionale** | `TEAMS` (in `config.js` o `modern.js`) + `TEAM_STATS` + `GROUPS` in `modern.js` + bandiera in `drawFlag` |
| Cambiare le frasi della **telecronaca** | `match.js`: cerca `this.announce(` |
| Cambiare i **tasti** | `match.js` → `setupInput`; menu → `Base.keysInit` in `scenes.js` |
| Cambiare un **suono** | `audio.js` |
| Colori e aspetto delle **arene moderne** | `modern.js` → `ARENAS`, `makeModernArena` |
| Ritoccare una **posa** dei giocatori disegnati | `gfx.js` → `SKEL` (punti di anca, collo, testa, gambe, braccia); le pose frontali dell'alzatore (palleggio caricato `setload`, spinta `set`, pallonetto di seconda `dump`, bagher laterale `passside`) sono in `FRONTS`; la battuta caricata da fermo è `srvload` |
| Cambiare le **fasi dei movimenti** (caricamento della schiacciata, piegamento del bagher, mani alla fronte nel palleggio) | `match.js` → `motion` (sceglie la posa secondo il momento del gesto) |
| Rifare i **giocatori 3D** da un nuovo foglio sprite | `tools/photo/README.md` |
| Cambiare le **schede del menu principale** | `modern.js` → `MainMenuScene` (`this.cards`) |
| Regolare il **bagher laterale** (palla un po' fuori portata) | `config.js` → `LAT_REACH`; `match.js` → `checkContacts` |
| Cambiare chi si comanda **in attesa** della palla avversaria | `match.js` → `humanMoves`, `ctrlOf` |
| Cambiare l'**alone rosso e la scritta P1/P2** del giocatore comandato | `match.js` → `render` (`p.glow`, `t.tag`) |
| Cambiare dove guarda la **telecamera** | `match.js` → inizio di `render` |
| Cambiare le **posizioni in campo** o aggiungere un numero di giocatori | `config.js` → `FORMATIONS` (posti: d, dep, pos) e `PLAYER_COUNTS` |
| Regole del **beach volley** (punti, cambio campo, misure) | `beach.js` → `BEACH_FORMATS`, `startBeachMatch`; `CFG.BEACH_HALF`; in `match.js` cerca `this.beach` |
| Aggiungere una **spiaggia** o una **coppia beach** | `beach.js` → `BEACH_ARENAS` / `makeBeachArena`, squadre all'inizio del file + `BEACH_TEAMS` |
| Velocità di crescita del **mio giocatore** | `myplayer.js` → `myPlayerAfterMatch` (funzione `grow`) e `MY_BASE` |
| Aggiungere una **nuova schermata** | vedi sotto |

### Aggiungere una schermata
```js
class MiaScena extends Base {
  constructor() { super('MiaScena'); }          // nome con cui la si avvia
  create() {
    camSetup(this); this.keysInit(); UI.bg(this);  // preparazione standard
    this.add.text(160, 100, 'CIAO', UI.f(10)).setOrigin(0.5);
  }
  update() {
    if (this.gone) return;
    if (this.btn()) { this.gone = true; this.scene.start('MainMenu'); }   // Z o Spazio
  }
}
```
Poi aggiungi `MiaScena` all'elenco `scene: [...]` in `startGame` (`scenes.js`) e avviala da un'altra scena con `this.scene.start('MiaScena')`.
Le coordinate sono sempre quelle native 320 × 224.

---

## 5. Dati salvati nel browser
Il gioco salva alcune cose nel `localStorage` del browser (si cancellano dagli strumenti del browser):

| Chiave | Cosa |
|---|---|
| `sf91_gfx` | versione grafica scelta (pixel / hd / 3d) |
| `sf91_rank` | classifica arcade |
| `sf91_squadre`, `sf91_campionati` | file trascinati sulla finestra (CANC nel menu principale li toglie) |
| `sf91_lega_<id>` | progressi di ogni campionato (RICOMINCIA li azzera) |
| `sf91_formazioni` | formazioni scelte per ogni squadra e numero di giocatori |
| `sf91_mio_giocatore` | scheda e statistiche del mio giocatore |

---

## 6. Pubblicare una modifica
1. Prova in locale (sezione 1), controlla che la console non mostri errori, prova le tre versioni grafiche (tasto H).
2. Aggiorna `GAME_VERSION` in `config.js`.
3. Fai il commit su un branch e apri una pull request verso `main`.
4. Quando la pull request viene unita in `main`, il workflow `.github/workflows/deploy-spikeball-aruba.yml` pubblica il gioco sul sito.
