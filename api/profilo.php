<?php
// Profili di Spike Fever '91 (editor.js -> PROF). Richieste POST in JSON con "azione":
//   registra { utente, password }        -> crea il profilo e restituisce { utente, token }
//   accedi   { utente, password }        -> { utente, token } (nuovo gettone, restano validi gli ultimi 5)
//   salva    { utente, token, dati }     -> salva i dati del gioco (tutto quello che il gioco tiene nel browser)
//   carica   { utente, token }           -> { dati }
// Le password sono salvate solo come hash (password_hash), i gettoni come sha256.
// I file stanno in api/dati/profili/, cartella non raggiungibile dal web (.htaccess in api/dati).
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function fine($code, $dati) { http_response_code($code); echo json_encode($dati); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fine(405, ['errore' => 'metodo non ammesso']);
$raw = file_get_contents('php://input');
if (strlen($raw) > 12 * 1024 * 1024) fine(413, ['errore' => 'profilo troppo grande']);
$in = json_decode($raw, true);
if (!is_array($in)) fine(400, ['errore' => 'richiesta non valida']);
$utente = strtolower(trim((string) ($in['utente'] ?? '')));
if (!preg_match('/^[a-z0-9_.-]{3,30}$/', $utente)) fine(400, ['errore' => 'utente: da 3 a 30 lettere, numeri, punto, trattino']);
$base = __DIR__ . '/dati';
$dir = $base . '/profili';
if (!is_dir($dir)) mkdir($dir, 0700, true);
if (!is_file($base . '/.htaccess')) file_put_contents($base . '/.htaccess', "Require all denied\nDeny from all\n");
$file = $dir . '/' . $utente . '.json';
$prof = is_file($file) ? json_decode(file_get_contents($file), true) : null;
$azione = (string) ($in['azione'] ?? '');
$scrivi = function ($p) use ($file) { file_put_contents($file, json_encode($p), LOCK_EX); };
$gettone = function (&$p) { $t = bin2hex(random_bytes(24)); $p['token'] = array_slice(array_merge([hash('sha256', $t)], $p['token'] ?? []), 0, 5); return $t; };

if ($azione === 'registra' || $azione === 'accedi') {
  $pw = (string) ($in['password'] ?? '');
  if (strlen($pw) < 6) fine(400, ['errore' => 'password di almeno 6 caratteri']);
  if ($azione === 'registra') {
    if ($prof) fine(409, ['errore' => 'utente già esistente']);
    $prof = ['hash' => password_hash($pw, PASSWORD_DEFAULT), 'token' => [], 'dati' => null, 'creato' => date('c')];
  } else {
    usleep(300000);   // rallenta i tentativi
    if (!$prof || !password_verify($pw, $prof['hash'])) fine(403, ['errore' => 'utente o password sbagliati']);
  }
  $t = $gettone($prof); $scrivi($prof);
  fine(200, ['utente' => $utente, 'token' => $t]);
}
if (!$prof || !in_array(hash('sha256', (string) ($in['token'] ?? '')), $prof['token'] ?? [], true)) fine(403, ['errore' => 'accesso scaduto: accedi di nuovo']);
if ($azione === 'salva') {
  if (!is_array($in['dati'] ?? null)) fine(400, ['errore' => 'dati mancanti']);
  $dati = [];
  foreach ($in['dati'] as $k => $v) if (is_string($k) && strpos($k, 'sf91_') === 0 && is_string($v)) $dati[$k] = $v;
  $prof['dati'] = $dati; $prof['salvato'] = date('c'); $scrivi($prof);
  fine(200, ['n' => count($dati)]);
}
if ($azione === 'carica') fine(200, ['dati' => $prof['dati']]);
fine(400, ['errore' => 'azione sconosciuta']);
