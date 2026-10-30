<?php
// Partite online (online.js): scambio dei dati di connessione WebRTC tra i due giocatori, con un codice partita.
// Il gioco poi passa direttamente da un browser all'altro: questo file serve solo all'inizio.
//   POST ?a=create              corpo {offer, meta?}   -> {code}        chi crea la partita
//   GET  ?a=offer&c=CODICE                      -> {offer, meta}  chi entra con il codice
// meta (facoltativo, prototipo 3D): {g3d, beach, women} solo vero/falso, per aprire la stessa versione del gioco
//   POST ?a=answer&c=CODICE     corpo {answer}  -> {ok}
//   GET  ?a=answer&c=CODICE                     -> {answer} oppure {wait:true}
// I dati restano in api/dati/online/ (non raggiungibile dal web) e vengono cancellati dopo 20 minuti.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$dir = __DIR__ . '/dati';
if (!is_dir($dir)) { mkdir($dir, 0700, true); file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n"); }
$dir .= '/online';
if (!is_dir($dir)) mkdir($dir, 0700, true);
foreach (glob($dir . '/*.json') ?: [] as $f) if (filemtime($f) < time() - 1200) @unlink($f);   // partite scadute

function out($code, $data) { http_response_code($code); echo json_encode($data); exit; }
$a = $_GET['a'] ?? '';
$c = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $_GET['c'] ?? ''));
$body = function () {
  $raw = file_get_contents('php://input');
  if (strlen($raw) > 40000) out(413, ['errore' => 'troppi dati']);
  $d = json_decode($raw, true);
  if (!is_array($d)) out(400, ['errore' => 'dati non validi']);
  return $d;
};
$sdp = fn($s) => is_array($s) && isset($s['type'], $s['sdp']) && in_array($s['type'], ['offer', 'answer'], true) && is_string($s['sdp']) && strlen($s['sdp']) < 30000;

if ($a === 'create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
  $d = $body();
  if (!$sdp($d['offer'] ?? null)) out(400, ['errore' => 'offerta non valida']);
  if (count(glob($dir . '/*.json') ?: []) > 500) out(503, ['errore' => 'troppe partite aperte, riprova tra poco']);
  $abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // niente lettere che si confondono (I, O, 0, 1)
  do { $code = ''; for ($i = 0; $i < 5; $i++) $code .= $abc[random_int(0, strlen($abc) - 1)]; } while (is_file("$dir/$code.json"));
  $meta = [];
  if (isset($d['meta']) && is_array($d['meta'])) foreach (['g3d', 'beach', 'women'] as $k) $meta[$k] = !empty($d['meta'][$k]);
  file_put_contents("$dir/$code.json", json_encode(['offer' => $d['offer'], 'answer' => null, 'meta' => $meta]), LOCK_EX);
  out(200, ['code' => $code]);
}
if (!preg_match('/^[A-Z0-9]{5}$/', $c)) out(400, ['errore' => 'codice non valido']);
$file = "$dir/$c.json";
if (!is_file($file)) out(404, ['errore' => 'partita non trovata o scaduta']);
$room = json_decode(file_get_contents($file), true);
if ($a === 'offer') out(200, ['offer' => $room['offer'], 'meta' => $room['meta'] ?? []]);
if ($a === 'answer' && $_SERVER['REQUEST_METHOD'] === 'POST') {
  $d = $body();
  if (!$sdp($d['answer'] ?? null)) out(400, ['errore' => 'risposta non valida']);
  if ($room['answer']) out(409, ['errore' => 'nella partita c\'è già un avversario']);
  $room['answer'] = $d['answer'];
  file_put_contents($file, json_encode($room), LOCK_EX);
  out(200, ['ok' => true]);
}
if ($a === 'answer') {
  if (!$room['answer']) out(200, ['wait' => true]);
  @unlink($file);   // collegati: la partita non serve più sul server
  out(200, ['answer' => $room['answer']]);
}
out(400, ['errore' => 'richiesta non valida']);
