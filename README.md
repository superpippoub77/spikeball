# Spike Fever '91 — Power Spikes (1991) + Thunder Spikes (2026) in Phaser 3

> **Atari 2600:** c'è anche una versione per Atari 2600 in stile Power Spikes (cartuccia da 16K con 6 livelli, beach volley e nazionali, e cartuccia da 4K 4 contro 4; assembly 6502): [atari2600/](atari2600/README.md). Si gioca nel browser da `atari2600/index.html` e `atari2600/4k/index.html`.

> **Vuoi modificare il gioco?** Leggi la [guida allo sviluppo](GUIDA-SVILUPPO.md): mappa dei file, concetti chiave e una tabella "dove si cambia cosa". Ogni file `.js` inizia con l'indice delle sue parti.

## Menu principale
| Scheda | Cosa fa |
|---|---|
| **ARCADE** | Il gioco arcade del 1991 come nel video originale: gettoni, 5 avversari, Technic, classifica |
| **SINGLE MATCH** | Modalità moderna in stile Thunder Spikes: squadre, campo, pallone e regole a scelta |
| **TUTORIAL** | Pratica dei fondamentali con i comandi in sovraimpressione |
| **CAREER** | Campionati da `campionati.json` o torneo a 4 turni contro le nazionali |
| **BEACH** | Beach volley 2 contro 2 sulla sabbia, con regole e punteggi da spiaggia |
| **MY PLAYER** | Il tuo giocatore con la sua scheda, che migliora partita dopo partita |

### Giocatori in campo e formazione
- **GIOCATORI IN CAMPO** (impostazioni di SINGLE MATCH): 4 contro 4 (classico), 6 contro 6, 3 contro 3 o 2 contro 2. Ogni numero ha la sua formazione (`FORMATIONS` in `config.js`): centrale, alzatore, attaccante, difensori e libero nel 6 contro 6.
- **FORMAZIONE <squadra>**: scegli chi gioca in ogni posto tra tutta la rosa (i giocatori di `squadre.json`, o i 6 nomi di una nazionale).
  - Comandi: ↑↓ per il posto, ← → per il giocatore (se è già in campo i due si scambiano), A per la formazione automatica (per ruolo e livello).
  - La scelta resta salvata nel browser e vale per ogni modalità, campionati compresi.

### BEACH (beach volley)
- 2 contro 2 su un campo di sabbia da 8 x 8 m, in tre spiagge: **Copacabana**, **Beach Tour Stadium** e **Tropical Sunset**.
- **Personaggi da spiaggia:** canotta, pantaloncini lunghi, piedi nudi, occhiali da sole e visiera, in tutte e tre le versioni grafiche.
- **Squadre:** 10 coppie da spiaggia (Sunset Sharks, Coco Locos, Palm Kings, Tiki Bros, Wave Riders, Mango Jam, Italia, Brasil, USA, Norge Beach), più tutte le altre squadre (Q/E). **F** sceglie i due giocatori.
- **Regole e punteggi:**
  - partita al meglio dei 3 set: set a 21, il terzo (tie-break) a 15, sempre con 2 punti di scarto. In alternativa si può giocare un set solo a 21 o a 15;
  - cambio campo ogni 7 punti giocati (ogni 5 nel tie-break);
  - il tocco a muro conta come primo tocco;
  - niente pallonetto a mano aperta: si gioca lo *shot* (pokie o palla alta piazzata);
  - niente palleggio di seconda di là;
  - nessun ruolo fisso: alza chi non ha ricevuto, attacca l'altro;
  - la battuta si alterna tra i due giocatori.
- **Sabbia:** la sabbia si alza e schizza negli stacchi, negli atterraggi, nei tuffi e quando la palla cade. Restano le impronte, che spariscono dopo qualche secondo (il solco del tuffo, la conca della palla). Sulla sabbia si corre più piano che sul parquet.

### Presentazione della formazione
- Nella versione **ARCADE** è come l'originale: campo verde e figurine dei giocatori (volto, numero, nome).
- In **HD** e **3D**: palazzetto e campo in prospettiva, con una scheda per giocatore (ruolo, altezza, specialità).
- Va avanti da sola dopo qualche secondo anche se il computer è lento; con il pulsante si salta.

### Giocatori tutti diversi
- Ogni giocatore (e giocatrice) ha **altezza**, **corporatura** e **capelli** suoi, sempre gli stessi per lo stesso nome.
- Ha anche una **specialità**, scritta nella schermata FORMAZIONE insieme all'altezza in cm:
  - **MURO**: i più alti arrivano più in alto e più larghi a muro, ma sono un po' meno rapidi;
  - **RICEZIONE**: ricevono meglio (di solito i più bassi);
  - **VELOCE**: corrono di più;
  - **POTENZA**: schiacciano più forte (i più robusti);
  - **COMPLETO**: nessun punto debole e nessuna specialità.

### Versione femminile
- A fine partita ogni giocatore e giocatrice esulta a modo suo, alternando braccia al cielo, pugno alzato e saltelli a braccia larghe.
- **Come si sceglie:** SINGLE MATCH → scegli le due squadre → nelle impostazioni della partita la prima voce è **SQUADRE (maschili / femminili)**: ← → per cambiare. Nel BEACH è la prima voce delle impostazioni dopo la scelta delle coppie. Nell'**ARCADE** (1 o 2 giocatori) si sceglie in SELECT YOUR TEAM con ← →: **MEN / WOMEN**.
- **Giocatrici:** acconciature diverse (coda di cavallo, treccia, chignon, caschetto), orecchini nel colore della squadra, viso e nomi femminili (per le nazionali nomi del paese), telecronaca al femminile ("SHE MISHITS THE BALL!").
- **Divise:** nel palazzetto maglia e pantaloncini corti; nel beach il costume a due pezzi come nel beach volley vero, con occhiali da sole e visiera. Ogni squadra ha la sua fantasia: tinta unita, bordi colorati o due colori.
- Nella versione 3D le giocatrici sono disegnate come in HD (le foto dei giocatori sono maschili).

### MY PLAYER (i miei giocatori)
- **Elenco:** si possono creare quanti giocatori e giocatrici si vuole, e poi modificarli o eliminarli in qualsiasi momento.
  Tasti: ↑↓ scegli, Z modifica, N nuovo, X elimina (premuto due volte), E/I esporta/importa un file, S/L salva/carica dal server.
- **Scheda:** sesso (maschile o femminile), nome e cognome (scritti con la tastiera), numero, ruolo, età, foto, pelle, capelli, squadra e IN CAMPO (sempre titolare oppure in panchina).
- **Foto:** sulla riga FOTO premi Z. Si apre la telecamera del telefono o del computer, oppure si carica un'immagine (CARICA FOTO).
  Il viso va messo nell'ovale; si può spostare trascinandolo e ingrandire con lo zoom. USA FOTO ritaglia il viso e lo usa come ritratto del giocatore (in ARCADE con i colori ridotti come un vecchio gioco).
  Dalla foto vengono presi anche il colore della pelle e dei capelli, che si possono comunque cambiare con ← →.
- **Squadra:** si può scegliere una qualsiasi squadra configurata: nazionali, coppie da spiaggia e club dei campionati.
  Le giocatrici entrano nelle partite e nei tornei femminili, i giocatori in quelli maschili.
- **In campo:** se è titolare, il giocatore va **sempre in campo** in ogni modalità: partita singola, beach, campionati e arcade. Altrimenti resta nella rosa e si può scegliere in FORMAZIONE.
- **Statistiche:** ATTACCO, DIFESA, MURO, BATTUTA e ALZATA. Ognuna cresce con i gesti fatti davvero in partita:
  - schiacciate → ATTACCO;
  - ricezioni e difese → DIFESA;
  - muri → MURO;
  - battute e ace → BATTUTA;
  - alzate → ALZATA.

  Una vittoria dà una piccola spinta a tutte le statistiche.
- **Livello:** va da 1 a 10 ed è la media delle statistiche. Più è alto, più il giocatore schiaccia forte e sbaglia meno.
- **Fine partita:** per ogni giocatore creato che ha giocato viene mostrato `★ NOME +XP  LIVELLO x → y`.
- **Salvataggio:**
  - nel browser, automatico (`sf91_miei_giocatori`);
  - su file con E (esporta) e I (importa);
  - sul server con S (salva) e L (carica). Serve una chiave: la prima volta il gioco la chiede e la ricorda.
    Sul server la chiave va scritta nel file `api/chiave.php` (da creare a mano, non è nel repository), per esempio `<?php return 'una-frase-lunga-e-segreta';`.
    I dati finiscono in `api/dati/`, cartella non raggiungibile dal web.

### Cambi in partita e libero
- **Cambi:** a palla ferma (dopo un punto o prima del lancio della battuta) il giocatore 1 preme **X** e il giocatore 2 **Q**. In basso compare il promemoria "X: CAMBI".
  - Nel pannello: ↑↓ sceglie chi esce, ← → chi entra dalla panchina (con ruolo, altezza, specialità e colpo), Z conferma, X o ESC chiude.
  - Chi entra prende il posto e il turno di battuta di chi esce. Il pannello conta i cambi fatti; alla partita dopo torna la formazione scelta.
- **Libero:** è il giocatore con ruolo L (o L1, L2) nella rosa: nelle squadre JSON, nell'editor e nei tuoi giocatori.
  - Ha una maglia di un colore ben diverso da quello della squadra (in ARCADE e HD; nella versione 3D, a fotogrammi, resta con la maglia della squadra).
  - Riceve meglio e si sposta più rapido, e in ricezione si offre per primo.
  - Come da regolamento non batte, non attacca e non va a muro: se tocca a lui battere, batte il compagno più arretrato.

### LINGUA
Lingue disponibili: **italiano, inglese, francese, tedesco, spagnolo**. All'inizio il gioco usa la lingua del browser.
Per cambiarla, nel menu principale sali con ↑ sulla riga della lingua, sopra le schede, e scegli con ← →.
Sono tradotti tutti i testi: menu, telecronaca, comandi della pratica, campionati, editor e pannello della foto.

### Altezze e colpi d'attacco
Ogni giocatore ha la sua altezza, mostrata in cm nella formazione e nella presentazione. Più alto vuol dire muro più alto e colpo in attacco più in alto.
Ha anche un **colpo d'attacco** suo, che dipende dal fisico:
- **POTENTE:** palla sopra la spalla, braccio pesante, tira profondo e spesso forte.
- **DALL'ALTO:** palla presa con il braccio tutto teso sopra la testa; colpo ripido, corto dietro il muro.
- **BRACCIO VELOCE:** palla presa davanti alla testa, un po' prima e più bassa; braccio rapido.
- **TECNICO:** palla presa davanti, cerca angoli e righe, sbaglia meno.
- **PALLONETTI:** gioca spesso il pallonetto e piazza la palla.

Il punto in cui si colpisce cambia il tempo giusto per premere Z e anche la posa del colpo (braccio teso sopra la testa o palla presa davanti).

### EDITOR (squadre, arbitri, sponsor, campionati, profilo)
Dal menu principale, ultima scheda. Si apre una pagina sopra il gioco, comoda anche sul telefono. **SALVA E CHIUDI** salva e ricarica il gioco con le novità.
- **Squadre:** nome, sigla di 3 lettere, maschile o femminile, colori (maglia, bordo, pantaloncini, campo), logo, allenatore e dirigente.
  - La rosa parte da 12 **giocatori inventati** con ruoli veri, oppure è **copiata** da una squadra già nel gioco o da una squadra di un campionato.
  - Ogni giocatore si modifica a piacere (nome, cognome, numero, ruolo, età, livello 1-10) e può avere la **foto** (telecamera o file). Si possono aggiungere o togliere giocatori.
  - Le squadre create sono nel gruppo **MIE SQUADRE** della selezione, nella formazione, in I MIEI GIOCATORI e nei campionati.
  - Una squadra con lo stesso nome di una squadra di un campionato prende il suo posto in quel campionato.
  - Allenatore e dirigente compaiono nella presentazione della formazione.
- **Arbitri:** nome, cognome, nazione e foto. In ogni partita ne viene scelto uno: nome e foto compaiono nel pannello della battuta.
- **Sponsor (fino a 6):** nome, colore e logo, sui cartelloni del palazzetto ARCADE e sulla balaustra delle arene moderne.
- **Campionati:** girone all'italiana (solo andata o andata e ritorno, set unico, al meglio dei 3 o dei 5) tra le squadre scelte, le tue e quelle del gioco. Si gioca da CAREER come gli altri campionati.
- **Profilo:** registrati o accedi con utente e password. SALVA SUL SERVER salva tutto quello che il gioco tiene nel browser (squadre, arbitri, sponsor, campionati con risultati e classifiche, i miei giocatori, formazioni); CARICA DAL SERVER lo riporta su un altro dispositivo.
  Sul server serve PHP (`api/profilo.php`); le password sono salvate solo come hash, i dati in `api/dati/profili/` (non raggiungibile dal web).

### SINGLE MATCH / CAREER (Thunder Spikes)
- **Squadre:** 24 nazionali in 2 gruppi (Q/E per cambiare gruppo), ognuna con ATTACK / DEFENSE / SPEED che influiscono sul gioco (velocità di corsa, potenza delle schiacciate, difesa). C alterna tastiera/IA per ogni lato: 1 giocatore, 2 giocatori o IA contro IA.
- **Sorteggio:** prima di ogni partita il capitano chiama testa o croce; chi vince sceglie battuta/ricezione o il campo, l'altra squadra la scelta rimasta.
- **Impostazioni:**
  - PLAYING FIELD: Volleyball Arena, Pro Sports Hall, Gym Hall, Outdoor School e Classic 1991;
  - BALL: Classic, Pro, Retro;
  - STARTING POINTS: 0/5/10/15;
  - REBOUND INDICATOR: EASY/HARD/OFF;
  - ATTACK TARGET: ON/OFF;
  - REGOLE: Rally 25, Rally 15 o Side-out 15 del 1991;
  - ARCADE FX: telecronaca, arbitro, volti, battute speciali di Power Spikes e leggera scossa dello schermo su schiacciate e muri sì/no;
  - SCOSSA DELLO SCHERMO: ON/OFF (la scelta resta salvata; in partita si cambia anche con il tasto **V**, in tutte le modalità).
  - EFFETTO CRT: ON/OFF, come un vecchio monitor arcade (righe di scansione, angoli arrotondati, bordi scuri, colori più accesi). Si cambia anche con il tasto **K** in qualsiasi schermata; la scelta resta salvata.
- **In partita:**
  - pavimento lucido con i riflessi;
  - telecamera che allarga in battuta e stringe durante lo scambio;
  - tabellone LED in alto;
  - arco bianco sopra il punto di caduta e triangolo nero sul bersaglio d'attacco;
  - a fine partita la fascia WIN! e le MATCH STATS per giocatore (Points, Spike, Lob, Block, Aces) con QUIT / MATCH SETTINGS / RESTART.
- **ESC** durante la partita torna al menu.

### Versione 3D (giocatori fotorealistici)
Tre versioni grafiche, si cambia col tasto **H** (o `index.html?gfx=pixel|hd|3d`): **ARCADE** (pixel art), **HD** (giocatori disegnati), **3D**.
Nella 3D i giocatori sono fotogrammi presi da quattro fogli sprite generati con ChatGPT (`tools/photo/3d-maschile-A..D.png`, 127 pose in 16 movimenti):
- attesa molleggiata con i piedi a terra, corsa, rincorsa a 4 appoggi;
- schiacciata con il gomito alto e il colpo sopra la testa, oppure con la palla presa davanti (braccio veloce);
- bagher, bagher laterale, tuffo con rialzata;
- palleggio, palleggio in salto di profilo, pallonetto dell'alzatore, muro;
- battuta da ferma (con l'attesa a palla in mano), battuta in salto, salto flottante;
- esultanze e delusione.

I fotogrammi sono
in proporzione reale con la rete e con la telecamera più vicina. Maglia, pantaloncini e pelle vengono ricolorati con i colori di ogni squadra; le divise scure restano quelle originali.
Anche i palloni della 3D vengono da un foglio sprite (`tools/photo/palloni.webp`): ruotano in 8 tempi con la luce ferma e si schiacciano a terra, sulle schiacciate e sui muri.
Per rigenerare i fotogrammi: `tools/photo/README.md`.

### Squadre personalizzate (squadre.json)
Club nuovi (quanti vuoi) e nazionali con i propri giocatori. Il gioco legge `squadre.json` dalla cartella del gioco; se non c'è usa `squadre.esempio.json`.
- **Con un server locale** (`npx serve`) basta salvare il file accanto a `index.html`.
- **Aprendo `index.html` direttamente** il browser non lascia leggere i file: **trascina il file .json sulla finestra del gioco**. Resta salvato nel browser; nel menu principale **CANC** lo toglie.
- `squadre.json` contiene il **Valsesia Team Volley** (19 giocatori). Il repository e il sito sono pubblici: nel file vanno solo i dati che servono al gioco, niente telefoni, email o date di nascita.

```json
{
  "squadre": [
    {
      "codice": "VTV",
      "nome": "Valsesia Team Volley",
      "tipo": "club",
      "colori": { "maglia": "#c81e2a", "bordo": "#ffffff", "pantaloncini": "#1a1a1a", "pavimento": "#2f6fe0" },
      "titolari": [2, 5, 4, 6],
      "statistiche": [85, 80, 82],
      "giocatori": [
        { "nome": "Mario", "cognome": "Rossi", "numero": 2, "ruolo": "Alzatore", "sigla": "P", "eta": 24, "livello": 7 }
      ]
    }
  ]
}
```
| Campo | Note |
|---|---|
| `codice` | 3 lettere, compare sul tabellone; per una nazionale è il suo codice (`ITA`, `BRA`...) |
| `tipo` | `club` (nuova squadra, gruppo CLUB nella selezione) o `nazionale` (sostituisce i giocatori di una nazionale esistente) |
| `colori` | maglia, bordo (numeri e finiture), pantaloncini, pavimento (arena Classic 1991); facoltativi |
| `giocatori` | almeno 4; `ruolo` Alzatore/Centrale/Opposto/Banda/Libero oppure `sigla` P, C1, O, S1, L1, anche doppia (`O/C2`): conta la prima |
| `numero` | numero di maglia: sulla schiena in HD e nelle schede |
| `livello` | 1-10: forza del giocatore (schiacciata, difesa) e statistiche della squadra |
| `eta` | età: incide un poco sulla SPEED della squadra |
| `titolari` | facoltativo: numeri di maglia tra cui scegliere i 4 in campo; altrimenti li sceglie il gioco per ruolo e livello |
| `statistiche` | facoltativo: ATTACK, DEFENSE, SPEED (0-100); altrimenti calcolate dai titolari |
| `capelli`, `pelle` | facoltativi, colori del singolo giocatore |
| `maglia`, `bordo` | facoltativi, maglia diversa per il singolo giocatore (es. il libero) |
| `logo` (della squadra) | facoltativo: immagine PNG/JPG/SVG (es. `"logo": "loghi/valsesia.png"` nella cartella `loghi/`, o un indirizzo web che lo permetta). Sostituisce lo stemma ovunque. Serve aprire il gioco con un server (o il sito): da `file://` resta lo stemma |

In campo si gioca 4 contro 4 come nell'arcade: centrale, alzatore, attaccante e difensore/battitore.

### Campionati (campionati.json)
Da **CAREER** scegli un campionato (o il vecchio torneo delle nazionali) e la tua squadra:
- giochi le tue gare a set (**SET: 1 / 3 / 5**, il set decisivo a 15), oppure le **SIMULI**; le altre gare della giornata sono simulate secondo la forza delle squadre;
- **classifica FIPAV**: 3 punti per il 3-0/3-1, 2-1 al tie-break; a pari punti contano vittorie, quoziente set e quoziente punti;
- **Q/E** mostra classifica, risultati della giornata e calendario; la scheda della gara ha data, ora, palestra e arbitro;
- i **risultati reali** già presenti nel calendario contano e non si rigiocano; dopo **RICOMINCIA** invece tutte le gare, anche quelle già giocate davvero, tornano da giocare;
- prima di ogni gara scegli **FORMAZIONE** (chi gioca e in che ruolo: centrale, alzatore, attaccante, libero, difesa...) e **GIOCATORI** (4, 6, 3 o 2 in campo); la formazione resta salvata per le gare successive e si può cambiare anche tra un set e l'altro con **F**;
- prima di ogni gara c'è il **sorteggio**: il capitano chiama testa o croce, chi vince sceglie battuta/ricezione o il campo (sinistro/destro), l'altra squadra prende la scelta rimasta; a ogni set le squadre cambiano campo e battuta;
- le squadre che sono in `squadre.json` (stesso nome) giocano con i loro giocatori; le altre vengono **create in automatico** (nomi, numeri, ruoli, età, colori; sempre uguali);
- i progressi restano salvati nel browser (**RICOMINCIA** per ripartire).

Per aggiungere un campionato copia il calendario dal sito della federazione in un file di testo e convertilo:
```sh
python3 tools/campionati/calendario2json.py calendario.txt campionati.json --id 1DIV-M-2026 --nome "Prima Divisione Maschile 2026/27"
```
Ogni squadra del campionato può avere anche `logo`, `colori` e `codice` (per collegarla a una squadra di `squadre.json`):
`"squadre": [{ "nome": "VALSESIA TEAM VOLLEY", "logo": "loghi/valsesia.png" }, ...]`. Anche `campionati.json` si può trascinare sulla finestra.
Rigenerando un campionato con lo stesso `--id`, logo, colori e codice delle squadre restano.

Loghi disponibili in `loghi/`: Bellinzago, Koala Fontaneto, Pavic, Volley Novara (già collegati alla Prima Divisione), Salussola, Santhià, Vigliano Biellese, Volley Crescentino, Volley Vercelli.

### Categorie FIPAV (serie, comitati, promozioni)
Le squadre sono divise secondo la piramide dei campionati FIPAV:

| Livello | Maschile | Femminile | Organizzazione |
|---|---|---|---|
| nazionale | SuperLega (A1), Serie A2, Serie A3, Serie B | Serie A1, A2, A3 (dal 2026/27), B1, B2 | Lega / FIPAV |
| regionale | Serie C, Serie D | Serie C, Serie D | Comitato Regionale |
| territoriale | Prima, Seconda, Terza Divisione | Prima, Seconda, Terza Divisione | Comitato Territoriale |

- **Nei file JSON** (tutti i campi facoltativi):
  - `campionati.json`, per ogni campionato: `"categoria": "Prima Divisione"`, `"sesso": "M"`, `"regione": "Piemonte"`, `"territorio": "..."`, `"girone": "A"`, `"promosse": 1`, `"retrocesse": 2`. Se manca, la categoria si ricava dal nome del campionato ("Prima Divisione Maschile 2026/27", "Serie B1 femminile"...).
  - `squadre.json`, per ogni squadra: `"categoria": "Serie D"`, `"sesso": "F"`, `"regione"`, `"territorio"`.
  - Facoltativo, in cima al file: `"categorie": [{ "id": "U18", "nome": "Under 18", "sesso": "M", "livello": 10, "ambito": "territoriale" }]` per aggiungere o cambiare categorie.
- **SINGLE MATCH:** con Q/E si scorrono le categorie dalla più alta alla più bassa, per esempio "PRIMA DIVISIONE M · PIEMONTE". Ci sono anche tutte le squadre dei campionati, non solo quelle di `squadre.json`.
- **Spostare una squadra:** nell'EDITOR, scheda CATEGORIE, ▲ promuove, ▼ retrocede, oppure si sceglie la categoria dal menu; ↺ la riporta all'origine. Le squadre create nell'editor e i campionati dell'editor hanno anche il campo Categoria.
- **Fine campionato:** le prime `promosse` squadre (di solito 1) salgono di categoria e le ultime `retrocesse` scendono. Lo mostra il riquadro FINALE.
- I cambi di categoria restano nel browser (`sf91_categorie`) e vanno nel profilo.

### Bilanciamento (misurato su centinaia di scambi simulati)
- Ace circa 6-7% (prima 29%): la ricezione dell'IA sbaglia meno sulle battute veloci.
- Muro: un solo tentativo per schiacciata (prima poteva ritentare a ogni fotogramma e toccava quasi tutto); più murate vincenti, tocchi a muro più rari e che schizzano via.
- Scambi di 6 tocchi in media, nessuno scambio infinito; partite combattute tra squadre vicine.
- La statistica SPEED della squadra vale anche per il giocatore umano.

---

# Modalità ARCADE — remake di Power Spikes (Video System, 1991)

Ricostruito scena per scena dal video completo dell'arcade e dal manuale operatore.
Grafica e suoni sono generati da codice (nessun asset originale): volti, arbitro, bandiere e palazzetto sono pixel art nuova.

## Avvio
Apri `index.html` nel browser (meglio con un server locale, es. `npx serve`). Phaser è incluso (`phaser.min.js`).

### Grafica: ARCADE, HD o 3D
- **ARCADE** (predefinita): la pixel art originale a 320×224.
- **HD**: tutta la grafica a 1920 px, senza pixel art (`gfx-hd.js`): giocatori vettoriali con contorni netti e ombreggiatura, ritratti e arbitro disegnati, pallone, pubblico, bandiere, cartelloni e testi nitidi (carattere Russo One). Ogni texture è disegnata a 6× e mostrata alla misura originale, quindi regole e logica di gioco sono identiche.

- **3D**: come HD, ma con i giocatori fotorealistici (vedi sotto).

Si cambia con il tasto **H** (ARCADE → HD → 3D, ricarica la pagina) oppure dall'indirizzo: `index.html?gfx=pixel` / `hd` / `3d`. La scelta viene ricordata.

## Tasti
| | Giocatore 1 | Giocatore 2 |
|---|---|---|
| Joystick (8 direzioni) | Frecce | W A S D |
| Pulsante unico | Z (o Spazio) | G |
| Start | Invio o 1 | 2 |
| Gettone | 5 o C | |
| Pausa / muto | P / M | |
| Grafica ARCADE / HD / 3D | H | |

## Come si gioca (dal manuale)
- **Battuta:** il battitore è già fuori dal campo con la palla in mano. Pulsante per lanciare, pulsante per colpire quando la palla diventa rossa ("HIT! PRESS BUTTON!"). Frecce riferite al battitore rivolto verso la rete:
  - neutro + Z, Z = battuta dall'alto
  - avanti + Z = battuta in salto (rincorsa e stacco automatici dietro la linea, Z in cima al salto)
  - GIÙ-avanti + Z = **salto flottante** (due passi, piccolo salto, colpo secco a mano aperta: la palla va tesa, balla in volo e cade di colpo; anche l'IA la usa)
  - in attesa del fischio il battitore sta in piedi con la palla tra le mani; nella battuta dall'alto lancia la palla e porta il braccio caricato in alto
  - SU + Z, SU + Z = **TOWERING SERVE** (circa 5 s in aria)
  - SU-avanti + Z, GIÙ-avanti + Z = **PHANTOM SERVE** (la palla si sdoppia in 3 scendendo)
  - SU-indietro + Z, GIÙ-indietro + Z = **THUNDER SERVE** (lampo bianco, la palla piomba giù)
- **Ricezione:** solo joystick, porta il giocatore schiarito sul quadratino blu. Il pulsante non si usa, il tuffo è automatico.
  Le palle che superano la prima linea toccano ai difensori arretrati, quelle corte alla prima linea.
  Mentre la palla è nell'altro campo (durante la battuta avversaria, ma anche subito dopo la tua battuta o il tuo attacco) comandi il difensore più arretrato e puoi già piazzarti in anticipo; se lo sposti, riceve di preferenza lui. Se la palla arriva un po' fuori portata il ricevitore la prende lo stesso con un **bagher laterale** (ricezione meno precisa); più lontano si tuffa (se stai già correndo verso la palla il tuffo non parte). Sulle palle lontane, come quelle deviate dal muro che vanno verso il fuori, il ricevitore scatta molto più veloce della corsa normale (anche all'indietro).
  Il giocatore che stai comandando ha un **alone rosso leggero** e la scritta **P1** (o **P2**) sopra la testa.
- **Pallonetto di seconda dell'alzatore** (verso la rete durante l'alzata in salto): l'alzatore si gira verso la rete e con un braccio teso spinge la palla corta appena di là, con un colpo secco del polso.
- **Alzata:** automatica. Se la ricezione è sbagliata ("OH! HE MISHITS THE BALL!") muovi l'alzatore col joystick.
- **Schiacciata:** rincorsa e salto automatici, premi il pulsante quando la palla arriva alla mano. La rincorsa è come nella pallavolo vera: passi di corsa, l'ultimo passo lungo con un piccolo balzo e le braccia slanciate indietro, l'arrivo a piedi pari e lo stacco (anche nella battuta in salto).
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

## Parametri (config.js)
`MATCH_TIME`, `START_2P`, `HARD`, `FREE_PLAY` (come i DIP switch), `G` gravità, `SPIKE_SPEED`, `JUMP_V`, punteggi di partenza e forza CPU in `STAGES`,
squadre, colori, nomi e pavimenti in `TEAMS`. `GAME_TITLE` per cambiare il titolo.

## Modalità test e pratica
- **T** nelle schermate di attract apre il menu **TEST MODE - PRATICA**: battuta, ricezione, alzata e schiacciata, muro e difesa.
- Durante la pratica e in partita, **T** mostra o nasconde i comandi da eseguire in quel momento; nella pratica **ESC** torna al menu.
- `TEST_MODE: true` in `config.js` tiene la sovraimpressione sempre attiva.

## Note tecniche
- Il gioco gira alla risoluzione nativa 320x224, disegnata a 3x (`ZOOM`): lo scorrimento è fluido a sotto-pixel e la grafica resta a pixel.
- Partita persa: sul tabellone finale compare "YOU LOST - CONTINUE PLAY? 9"; con un gettone e Start si rigioca l'incontro.
