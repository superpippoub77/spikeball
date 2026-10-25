<?php
// Giocatori creati in Spike Fever '91 salvati sul server (myplayer.js -> MYP.server).
// GET  : restituisce l'elenco salvato         POST : sostituisce l'elenco con quello inviato (JSON)
// Serve l'intestazione X-Chiave uguale alla chiave scritta in api/chiave.php (file creato solo sul server,
// non nel repository), per esempio:   <?php return 'una-frase-lunga-e-segreta';
// I dati (con le foto) finiscono in api/dati/giocatori.json, cartella non raggiungibile dal web (.htaccess).
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$fileChiave = __DIR__ . '/chiave.php';
if (!is_file($fileChiave)) { http_response_code(503); echo json_encode(['errore' => 'chiave non configurata sul server']); exit; }
$chiave = (string) require $fileChiave;
$data = $_SERVER['HTTP_X_CHIAVE'] ?? '';
if (strlen($chiave) < 8 || !hash_equals($chiave, $data)) { http_response_code(403); echo json_encode(['errore' => 'chiave sbagliata']); exit; }
$dir = __DIR__ . '/dati';
$file = $dir . '/giocatori.json';
if (!is_dir($dir)) { mkdir($dir, 0700, true); file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n"); }
if ($_SERVER['REQUEST_METHOD'] === 'GET') { echo is_file($file) ? file_get_contents($file) : '[]'; exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['errore' => 'metodo non ammesso']); exit; }
$raw = file_get_contents('php://input');
if (strlen($raw) > 8 * 1024 * 1024) { http_response_code(413); echo json_encode(['errore' => 'troppi dati']); exit; }
$list = json_decode($raw, true);
if (!is_array($list) || count($list) > 300) { http_response_code(400); echo json_encode(['errore' => 'dati non validi']); exit; }
$ok = [];
foreach ($list as $g) {
  if (!is_array($g) || !isset($g['st']) || !is_array($g['st'])) continue;
  // la foto deve essere un'immagine JPEG o PNG in base64
  if (isset($g['foto']) && $g['foto'] !== null && !preg_match('#^data:image/(jpeg|png);base64,[A-Za-z0-9+/=]+$#', (string) $g['foto'])) $g['foto'] = null;
  $ok[] = $g;
}
file_put_contents($file, json_encode($ok), LOCK_EX);
echo json_encode(['n' => count($ok)]);
