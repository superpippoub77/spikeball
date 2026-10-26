# Prompt per ChatGPT: fogli sprite della versione 3D

Questi prompt servono a creare con ChatGPT (generatore di immagini) le figure della versione 3D: giocatori in tutti i movimenti del gioco, versione femminile, beach, pallone, arbitro e spettatori.
I fogli, una volta caricati nel repository, vengono ritagliati e messi in gioco dagli script di `tools/photo/` (come `foglio-sprite-2.webp` e `palloni.webp`).

## Regole che valgono per TUTTI i fogli (non cambiarle)

- **Sfondo magenta pieno `#FF00FF`**, senza ombre, pavimento o sfumature: lo script ritaglia sul magenta.
- **Divisa da ricolorare:** maglia **bianca pura** senza scritte, numeri o loghi; pantaloncini **rosso puro `#E00000`**.
  Il gioco ricolora la maglia (zona bianca attaccata ai pantaloncini) e i pantaloncini (zona rossa) con i colori di ogni squadra, compresa la maglia diversa del libero.
  Ginocchiere, calzettoni e scarpe bianchi restano bianchi.
- **Vista di profilo, il giocatore guarda verso DESTRA**; stessa telecamera, stessa scala e stessa linea dei piedi in ogni fotogramma.
- **Corpo intero**, figure separate tra loro (nessuna sovrapposizione), nessun testo o numero sul foglio.
- **8 fotogrammi per riga**, righe ben distanziate. Meglio pochi movimenti per immagine: **4 righe per foglio**.
- Stile **fotorealistico / rendering 3D realistico**, proporzioni umane vere (atleta di pallavolo alto, circa 1,95 m), luce morbida dall'alto a sinistra.

## Come procedere

1. **Prima il personaggio di riferimento** (prompt 0). Salva l'immagine: nei prompt successivi **allegala** e scrivi "usa questo stesso atleta". Così tutti i fogli hanno la stessa persona.
2. Genera un foglio alla volta (prompt 1-4). Se ChatGPT sbaglia il numero di fotogrammi o i colori, rispondi "rifai: esattamente 8 figure per riga, 4 righe, maglia bianca, pantaloncini rossi, sfondo magenta pieno".
3. Rinomina e mandami i file:
   - `3d-maschile-A.png` … `3d-maschile-D.png`;
   - `3d-femminile-A.png` … `3d-femminile-D.png` (facoltativi);
   - `3d-beach-*.png`, `3d-palloni.png`, `3d-arbitro.png`, `3d-spettatori.png`.

   Li integro io: ritaglio, ricolorazione e collegamento ai movimenti del gioco.

---

## 0. Personaggio di riferimento (da allegare ai fogli successivi)

```
Photorealistic full-body character reference sheet of a professional male volleyball player, about 1.95 m tall, athletic and lean, short dark hair, light tan skin, neutral friendly face.
Outfit: plain pure white short-sleeve volleyball jersey with NO numbers, NO logos, NO text; plain pure red (#E00000) volleyball shorts; white knee pads; short white socks; white indoor volleyball shoes.
Show 4 views in one row: side view facing right, front view, back view, three-quarter view. Same scale, feet on the same baseline, full body visible.
Background: solid flat magenta #FF00FF, no shadows, no floor, no gradient, no text.
```

## 1. Foglio A: attesa, corsa, rincorsa, schiacciata

```
Use this same athlete (attached reference). Create ONE sprite sheet image, photorealistic, side view, the player always faces RIGHT.
Layout: exactly 4 rows, exactly 8 full-body figures per row, evenly spaced, figures never overlap, same scale and same feet baseline in every row.
Outfit in every frame: plain pure white jersey (no numbers, no logos), pure red #E00000 shorts, white knee pads, white socks, white shoes.
Background: solid flat magenta #FF00FF, no shadows, no floor, no text, no labels.

Row 1 - READY STANCE (waiting to receive): knees bent, torso leaning forward, forearms in front of the body; across the 8 frames the player gently bounces on the legs and sways the arms, FEET STAY FLAT ON THE GROUND in every frame.
Row 2 - RUNNING CYCLE to the right: 8 frames of a complete running loop, arms swinging naturally.
Row 3 - SPIKE APPROACH (4 steps): small step, longer step, long penultimate step with both arms swung far back, final two-foot plant with knees deeply bent and arms fully back, arms swinging forward and up, take-off, rising, near the top of the jump.
Row 4 - SPIKE in the air: arms raised, hitting arm cocked back with the ELBOW HIGH and pulled back behind the head and the other arm pointing up at the ball, body arched like a bow, arm whipping forward, contact with the arm fully extended high above the head, wrist snap, follow-through down in front of the body, landing on both feet.
```

## 2. Foglio B: colpi in avanti, bagher, bagher laterale, tuffo

```
Use this same athlete (attached reference). Same rules: ONE sprite sheet, photorealistic, side view facing RIGHT, exactly 4 rows x 8 full-body figures, no overlap, same scale and baseline, plain pure white jersey without numbers or logos, pure red #E00000 shorts, white knee pads, socks and shoes, solid flat magenta #FF00FF background, no text.

Row 1 - FAST-ARM SPIKE (ball contacted IN FRONT of the head, slightly lower): take-off, short arm swing, contact in front of the forehead with the arm extended forward and up, quick follow-through, landing.
Row 2 - FOREARM PASS (bagher): ready, legs bending, arms joined and straight with platform low in front, contact on the forearms, legs pushing up, arms lifting the ball, recovering, back to ready.
Row 3 - LATERAL FOREARM PASS: the player faces the CAMERA (front view) and lunges sideways to the right with joined straight arms to the side, deep lunge, contact, recovering to standing.
Row 4 - DIVE: running low, launching forward to the right, flying horizontally with one arm reaching out, touching the ball, sliding on the floor chest-down, lying flat, getting up on one knee, standing.
```

## 3. Foglio C: palleggio, palleggio in salto, pallonetto dell'alzatore, muro

```
Use this same athlete (attached reference). Same rules: ONE sprite sheet, photorealistic, side view facing RIGHT, exactly 4 rows x 8 full-body figures, no overlap, same scale and baseline, plain pure white jersey without numbers or logos, pure red #E00000 shorts, white knee pads, socks and shoes, solid flat magenta #FF00FF background, no text.

Row 1 - OVERHEAD SET standing (side view): moving under the ball, knees bending, hands up above the forehead forming a window with thumbs and index fingers, ball contact in the fingers, pushing up with arms and legs extending, arms fully extended up, recovering, ready.
Row 2 - JUMP SET (side view, NOT facing the camera): small take-off, rising with knees slightly tucked and hands in the window above the forehead, at the top extending both arms upward to push the ball, arms fully extended, starting to come down with arms lowering forward, legs ready to land, landing on both feet, standing.
Row 3 - SETTER DUMP (second-touch tip over the net): jump like a set, at the top the arm farther from the net extends high and taps the ball over the net with a quick wrist flick, the hand follows down past the net side, landing.
Row 4 - BLOCK: standing at the net, small squat, jump straight up with both arms extended high and hands wide and firm above the net line, top of the block with hands pressing forward, coming down, landing on both feet.
```

## 4. Foglio D: battute ed esultanze

```
Use this same athlete (attached reference). Same rules: ONE sprite sheet, photorealistic, side view facing RIGHT, exactly 4 rows x 8 full-body figures, no overlap, same scale and baseline, plain pure white jersey without numbers or logos, pure red #E00000 shorts, white knee pads, socks and shoes, solid flat magenta #FF00FF background, no text.

Row 1 - STANDING SERVE: standing upright holding the ball with both hands in front of the chest (waiting for the whistle), lifting the ball, tossing it up with one hand, hitting arm loaded back and high above the head with the elbow up and the other arm pointing at the ball, contact high above the head, follow-through, standing.
Row 2 - JUMP SPIN SERVE: one-hand toss high and forward, three approach steps, two-foot take-off, arched body with the hitting elbow high and pulled back, full-arm contact above the head, follow-through, landing inside the court.
Row 3 - JUMP FLOAT SERVE: holding the ball, short toss, two small steps, LOW jump, open-hand contact in front of the head with the arm stopping right after contact (no wrist snap, no follow-through), landing.
Row 4 - CELEBRATIONS AND DISAPPOINTMENT: both arms raised high, fist pump to the sky, jumping with arms wide open, clapping hands, high-five pose, pointing at the crowd, hands on hips looking down (disappointed), head down with hands on knees.
```

## 5. Versione femminile (facoltativa: oggi le giocatrici in 3D sono disegnate)

Prima il riferimento:

```
Photorealistic full-body character reference sheet of a professional female volleyball player, about 1.85 m tall, athletic and toned, long dark hair tied in a high ponytail, light tan skin, natural friendly face.
Outfit: plain pure white fitted short-sleeve volleyball jersey with NO numbers, NO logos, NO text; plain pure red (#E00000) volleyball shorts of standard competition length; white knee pads; white socks; white indoor shoes.
Show 4 views in one row: side view facing right, front view, back view, three-quarter view. Same scale, feet on the same baseline.
Background: solid flat magenta #FF00FF, no shadows, no floor, no gradient, no text.
```

Poi gli stessi prompt dei fogli A, B, C e D, allegando questo riferimento e scrivendo all'inizio `Use this same female athlete (attached reference).` al posto di `Use this same athlete`.

## 6. Beach volley (facoltativo)

Riferimento maschile beach:

```
Photorealistic full-body character reference sheet of a male beach volleyball player, athletic, tanned skin, short hair, sunglasses on the head.
Outfit: plain pure white sleeveless tank top with NO numbers or logos, plain pure red (#E00000) beach shorts, barefoot.
4 views in one row (side facing right, front, back, three-quarter). Background: solid flat magenta #FF00FF, no shadows, no sand, no text.
```

Riferimento femminile beach:

```
Photorealistic full-body character reference sheet of a female beach volleyball player, athletic, tanned skin, ponytail, sports sunglasses.
Outfit: plain pure white sports crop top in standard beach volleyball competition style with NO numbers or logos, plain pure red (#E00000) sports bikini bottom in standard competition cut, barefoot.
4 views in one row (side facing right, front, back, three-quarter). Background: solid flat magenta #FF00FF, no shadows, no sand, no text.
```

Poi gli stessi fogli A-D, aggiungendo: `Barefoot on sand-like movements (no sand drawn), same outfit colors.`

## 7. Palloni

```
Create ONE sprite sheet image of volleyballs, photorealistic, on a solid flat magenta #FF00FF background, no shadows, no text.
Layout: exactly 4 rows x 8 balls, evenly spaced, all balls the same size (except row 4), never overlapping.
Row 1 - modern indoor competition volleyball with yellow and blue curved panels, rotating: 8 frames of one full rotation.
Row 2 - classic all-white leather volleyball with stitched panels, rotating: 8 frames of one full rotation.
Row 3 - beach volleyball with bright colored panels, rotating: 8 frames of one full rotation.
Row 4 - the modern yellow and blue ball SQUASHED on impact (hit by a spike): from round to strongly flattened and back to round, 8 frames.
```

## 8. Arbitro

Il gioco usa l'arbitro nel pannello della battuta e dopo ogni punto, con sette gesti: fischio, battuta a sinistra, battuta a destra, palla fuori, tocco del muro, tocco della rete, punto alla squadra.

```
Create ONE sprite sheet image, photorealistic, of the same volleyball referee in 7 official FIVB hand signals, waist-up framing (head, torso and arms fully visible), front view.
Referee: middle-aged man with short grey hair and a neat grey moustache, white polo shirt with a small plain dark blue badge (no text), black trousers, black whistle on a black lanyard around the neck.
Layout: one row of exactly 7 figures, same scale, evenly spaced, never overlapping:
1 - whistle in the mouth, blowing; 2 - authorization to serve: arm extended pointing to his LEFT side; 3 - authorization to serve: arm extended pointing to his RIGHT side; 4 - ball out: both forearms raised vertically, palms facing himself; 5 - ball touched (block touch): one hand brushing the fingertips of the other raised hand; 6 - net touch: one hand touching the top of an imaginary net at chest height; 7 - point / team to serve: arm extended horizontally to the side of the winning team.
Background: solid flat magenta #FF00FF, no shadows, no text, no labels.
```

Se vuoi anche l'arbitro a corpo intero sul seggiolone (per la vista del campo):

```
Photorealistic full-body volleyball referee (same person: grey hair, grey moustache, white polo, black trousers, whistle on lanyard) standing on a referee stand next to a net post, side view facing LEFT, 4 frames in one row: neutral, whistling, arm extended to his left, arm extended to his right. Solid flat magenta #FF00FF background, no shadows, no text.
```

## 9. Spettatori

Il pubblico si compone in tribuna con persone di gruppi diversi. La maglia bianca si ricolora con i colori delle squadre in campo, come per i giocatori.

```
Create ONE sprite sheet image of volleyball fans seated in the stands, photorealistic, front view, waist-up, all at the same scale, solid flat magenta #FF00FF background, no shadows, no seats, no text.
Layout: exactly 4 rows x 8 different people, evenly spaced, never overlapping. Mix of men and women, young and old, different skin tones and hair styles; some with caps, glasses, scarves. Every person wears a plain pure WHITE t-shirt (no logos, no text).
Row 1 - sitting and watching calmly.
Row 2 - cheering with both arms raised.
Row 3 - clapping hands.
Row 4 - waving a plain red (#E00000) scarf or small flag above the head.
```

Variante con abbigliamento libero (pubblico neutro, non ricolorato):

```
Same sheet as before (4 rows x 8 seated fans, waist-up, front view, same rows: calm, arms raised, clapping, waving), but each person wears different casual clothes in varied realistic colors. Solid flat magenta #FF00FF background, no text.
```

---

## Cosa farò con i file

- **Giocatori:** ritaglio e ricolorazione come per `foglio-sprite-2.webp`, poi collego ogni riga ai movimenti del gioco:
  - attesa con i piedi fermi;
  - rincorsa a 4 appoggi;
  - due tipi di schiacciata (braccio teso sopra la testa e palla presa davanti);
  - bagher, bagher laterale e tuffo;
  - palleggio e palleggio in salto di profilo;
  - pallonetto dell'alzatore e muro;
  - battuta da ferma, in salto e flottante;
  - esultanze e delusione.

  Con la ricolorazione la divisa cambia per ogni squadra, compresa la maglia diversa del libero.
- **Versione femminile e beach:** se li generi, le giocatrici e il beach in 3D useranno i loro fogli invece delle figure disegnate.
- **Palloni:** come `palloni.webp`.
- **Arbitro:** al posto del disegno nel pannello della battuta, nella versione 3D.
- **Spettatori:** le tribune delle arene 3D vengono composte con queste persone, con le maglie nei colori delle squadre.
