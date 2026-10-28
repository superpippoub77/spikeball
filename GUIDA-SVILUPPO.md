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
- In partita: **T** mostra cosa premere, **P** pausa, **M** muto, **H** cambia versione grafica (ARCADE / PIXEL FOTO / HD / 3D; anche dalla riga GRAFICA del menu principale).

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
| `scene3d.js` | Versione **3D**: arbitro fotorealistico nel pannello (`makeRefTex`) e pubblico fotorealistico sugli spalti (`fanPerson`, maglia ricolorata), da `scene3d-sprites.js` (`tools/photo/build_scene3d.py`) |
| `lineup.js` | **Formazione**: rosa di ogni squadra, titolari automatici, scelta dei giocatori in ogni posto (scena `Formazione`) |
| `beach.js` | **Beach volley**: squadre da spiaggia, arene sulla sabbia, menu, partita al meglio dei 3 set |
| `myplayer.js` | **I miei giocatori**: elenco, scheda, foto (telecamera o file), inserimento nella squadra, crescita delle statistiche a fine partita, salvataggio locale / file / server |
| `i18n.js` | **Lingue**: dizionario a 5 lingue (`I18N_ROWS`, colonne it/en/fr/de/es), traduzione al volo di ogni testo (`T`, aggancio a `Text.setText`, `i18nDom` per le pagine HTML), riga LINGUA nel menu principale (↑ e poi ← →). Per un testo nuovo basta aggiungere una riga al dizionario |
| `sabbia.js` | **Beach**: manto di sabbia che si deforma (griglia `sandGrid`, `sandDig`, texture aggiornata solo quando cambia), spruzzi più evidenti, **time-out** (R / Y, uno per squadra per set) con il rastrello che spiana |
| `guida.js` | **Come si gioca** (scena `Guide`, 9 pagine illustrate con i giocatori del gioco, testi in `GUIDE_TXT` it/en) e **crediti** (scena `Credits`, nell'attract dopo la classifica; profilo dell'autore in `CREDITS_BIO`) |
| `touch.js` | **Telefono e tablet**: joystick virtuale e pulsanti che mandano gli stessi tasti della tastiera (`touchKey`, `touchHold`), schermo intero (`touchFullscreen`), invito a ruotare il telefono. Con `manifest.json` e le icone `icona-*.png` il gioco si installa sulla schermata Home |
| `cambi.js` | **Cambi in partita** (X / Q a palla ferma): pannello, scambio dei dati della rosa tra chi esce e chi entra (`doSub`); il libero è in match.js (`isLib`, `serverOf`) e gfx.js (`liberoKit`) |
| `categorie.js` | **Categorie FIPAV**: piramide `FIPAV_LEVELS`, categoria/sesso di campionati e squadre dai JSON (`catOf`, `sexOf`), gruppi del SINGLE MATCH per categoria (`catBuildGroups`), spostamenti (`catMove`, `CAT_MOVES`), promosse/retrocesse a fine campionato |
| `editor.js` | **Editor**: squadre (diventano club con `rosterTeam`), arbitri, sponsor, campionati (girone all'italiana in `LEAGUES`), profilo sul server (`PROF`) |
| `api/profilo.php` | profili: registrazione/accesso con password (hash) e gettone, salvataggio di tutte le chiavi `sf91_` |
| `api/giocatori.php` | salvataggio dei giocatori creati sul server, protetto dalla chiave di `api/chiave.php` (solo sul server) |

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
- `teamPool` / `lineupOf` (lineup.js) → `myplayer.js` aggiunge i giocatori creati alla rosa (solo quelli del sesso giusto) e mette in campo i titolari; `femLabel` lascia il loro nome nella versione femminile.
- `drawFace` / `drawFaceHD` → `myplayer.js` disegna la foto al posto del volto quando `TEAMS[code].fotos[i]` c'è.
- `MatchScene.prototype.startEnd` → `myplayer.js` aggiorna le statistiche dei giocatori creati.

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
| **Logo del campionato** | `"logo"` nel campionato (campionati.json) o dall'editor; `compLogoTex` (league.js) lo trasforma per la versione grafica (pixel art in ARCADE/PIXEL FOTO, liscio in HD/3D) |
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
| **Sabbia** del beach: spruzzi e impronte | `match.js` → `sand`, `drawSand`; velocità sulla sabbia `CFG.SAND_K`, durata delle impronte `CFG.SAND_MARK_T` |
| **Versione femminile**: disegno delle giocatrici, nomi | `gfx.js`/`gfx-hd.js` (`P.fem`, `LOOK.fem`, texture con `_w`; acconciature `P.hs` e `femHairSide`, fantasie `P.pat`); nomi in `config.js` → `FEM_NAMES`; opzione `MSET.women` / `BSET.women` |
| Cambiare le **caratteristiche dei giocatori** (altezza, corporatura, muro, ricezione, velocità, potenza) | `gfx.js` → `playerTraits`; effetti in `match.js` (`trOf`: movePlayer, checkContacts, doSpike) |
| Cambiare la **rincorsa** (passo lungo con balzo, arrivo a piedi pari) | `gfx.js` → `SKEL.appr`, `SKEL.plant`; tempi `CFG.APPR_T`, `CFG.PLANT_T`; `match.js` → `takeoffIn`, `motion` |
| Cambiare chi **riceve** secondo la zona (prima linea / difesa) | `config.js` → `FRONT_ZONE`; `match.js` → `choosePlayer` |
| Cambiare il **pallonetto dell'alzatore** | `gfx.js` → `SKEL.dump`, `SKEL.dumpfol`; `match.js` → `doSet` (traiettoria) |
| Ridisegnare l'**arbitro** o la **presentazione della formazione** | `gfx.js` → `makeRefTex` (HD: `drawRefHD`), `makeLineupCourt`; `scenes.js` → `LineupScene` |
| Cambiare lo **scatto** verso le palle lontane (deviate dal muro) | `config.js` → `CHASE_MAX`; `match.js` → `movePlayer` (`chase`) |
| Cambiare il **sorteggio** (testa o croce, battuta o campo) | `modern.js` → `CoinTossScene`; uso in `startModernMatch` e in `league.js` (`LG.toss`, `startLeagueSet`) |
| Cambiare l'**effetto CRT** | `index.html` → stile `#crt`; `scenes.js` → `applyCRT`, `fitCRT`; opzione `GS.crt` |
| Ridisegnare il **pubblico** (spettatori con il volto) | `gfx.js` → `fanPerson`, `crowd`; arene moderne `modern.js` (`crowdRows`), spiagge `beach.js` (`stand`) |
| Cambiare la **posizione d'attesa** e il molleggio | `gfx.js` → `SKEL.idle`; `match.js` → `render` (`lift`) |
| Ridisegnare i **ritratti** (pannello di chi batte, formazione) | `gfx.js` → `drawFace`; HD: `gfx-hd.js` → `drawFaceHD` |
| Cambiare le **esultanze** | `gfx.js` → `SKEL.cheer`, `cheer2`, `cheer3`; `match.js` → `motion` |
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
| `sf91_miei_giocatori` | elenco dei giocatori creati (schede, foto, statistiche); il vecchio `sf91_mio_giocatore` viene importato |
| `sf91_categorie` | squadre spostate di categoria (nome -> categoria) |
| `sf91_lang` | lingua scelta (it, en, fr, de, es) |
| `sf91_editor` | squadre, arbitri, sponsor e campionati creati nell'editor |
| `sf91_profilo` | utente e gettone del profilo sul server |
| `sf91_chiave_server` | chiave per salvare i giocatori sul server |

---

## 6. Pubblicare una modifica
1. Prova in locale (sezione 1), controlla che la console non mostri errori, prova le tre versioni grafiche (tasto H).
2. Aggiorna `GAME_VERSION` in `config.js` e lo stesso numero in `?v=` degli script di `index.html` (così il browser non usa file vecchi dalla cache).
3. Fai il commit su un branch e apri una pull request verso `main`.
4. Quando la pull request viene unita in `main`, il workflow `.github/workflows/deploy-spikeball-aruba.yml` pubblica il gioco sul sito.
