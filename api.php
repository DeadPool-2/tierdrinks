<?php
// TierDrinks API — PHP port of server.js for Beget shared hosting.
// Static files (index.html/app.js/styles.css/images) are served by the web
// server; .htaccess routes /api/* here. Data lives in ../data (outside docroot).

header('Content-Type: application/json; charset=utf-8');

define('DATA_DIR', __DIR__ . '/data');
define('DB', DATA_DIR . '/db.json');
define('SEED', DATA_DIR . '/seed.json');
define('AXES', ['taste', 'energy', 'value', 'aftertaste']);

function jexit($code, $obj) {
  http_response_code($code);
  echo json_encode($obj, JSON_UNESCAPED_UNICODE);
  exit;
}
function body() {
  $b = json_decode(file_get_contents('php://input'), true);
  return is_array($b) ? $b : [];
}
function seedData() {
  $s = json_decode(@file_get_contents(SEED), true);
  return is_array($s) ? $s : ['drinks' => [], 'brandColors' => []];
}
function nowIso() {
  return gmdate('Y-m-d\TH:i:s') . '.000Z';
}
function genId($p) {
  return $p . '_' . dechex(time()) . '_' . bin2hex(random_bytes(3));
}
function clampScore($v) {
  if (!is_numeric($v)) return null;
  $n = (float) $v;
  return max(0, min(10, round($n * 10) / 10));
}

$TRANSLIT = ['а'=>'a','б'=>'b','в'=>'v','г'=>'g','д'=>'d','е'=>'e','ё'=>'e','ж'=>'zh','з'=>'z','и'=>'i','й'=>'y','к'=>'k','л'=>'l','м'=>'m','н'=>'n','о'=>'o','п'=>'p','р'=>'r','с'=>'s','т'=>'t','у'=>'u','ф'=>'f','х'=>'h','ц'=>'ts','ч'=>'ch','ш'=>'sh','щ'=>'sch','ъ'=>'','ы'=>'y','ь'=>'','э'=>'e','ю'=>'yu','я'=>'ya'];
function slugify($str) {
  global $TRANSLIT;
  $s = mb_strtolower($str, 'UTF-8');
  $s = strtr($s, $TRANSLIT);
  $s = preg_replace('/[^a-z0-9]+/u', '-', $s);
  return trim($s, '-');
}

// locked read-modify-write; $fn(&$db, $seededNow) returns [bool save, mixed response]
function withDb(callable $fn) {
  if (!is_dir(DATA_DIR)) @mkdir(DATA_DIR, 0755, true);
  $fp = fopen(DB, 'c+');
  if (!$fp) jexit(500, ['error' => 'db open failed']);
  flock($fp, LOCK_EX);
  $raw = stream_get_contents($fp);
  $db = json_decode($raw, true);
  $seeded = false;
  if (!is_array($db) || empty($db['drinks'])) {
    $seed = seedData();
    $db = ['drinks' => $seed['drinks'], 'log' => []];
    $seeded = true;
  }
  if (!isset($db['log']) || !is_array($db['log'])) $db['log'] = [];
  list($save, $response) = $fn($db, $seeded);
  if ($save || $seeded) {
    rewind($fp);
    ftruncate($fp, 0);
    fwrite($fp, json_encode($db, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fp);
  }
  flock($fp, LOCK_UN);
  fclose($fp);
  return $response;
}
function respond($resp) {
  if (isset($resp['__err'])) jexit($resp['__err'][0], ['error' => $resp['__err'][1]]);
  jexit(200, $resp);
}
function findDrink(&$db, $id) {
  foreach ($db['drinks'] as $i => $d) if ($d['id'] === $id) return $i;
  return -1;
}

// ---- route ----
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$after = preg_replace('#^.*?/api#', '', $uri);      // e.g. /state, /log/xyz
$seg = explode('/', trim($after, '/'));
$r = $seg[0] ?? '';
$id = isset($seg[1]) ? urldecode($seg[1]) : null;

if ($method === 'GET' && $r === 'state') {
  respond(withDb(function (&$db, $seeded) {
    return [false, ['drinks' => $db['drinks'], 'log' => $db['log'], 'brandColors' => seedData()['brandColors']]];
  }));
}

if ($method === 'POST' && $r === 'log' && $id === null) {
  $b = body();
  respond(withDb(function (&$db, $seeded) use ($b) {
    if (findDrink($db, $b['drinkId'] ?? '') < 0) return [false, ['__err' => [404, 'drink not found']]];
    if (($b['user'] ?? '') !== 'a' && ($b['user'] ?? '') !== 'b') return [false, ['__err' => [400, 'bad user']]];
    $entry = ['id' => genId('l'), 'drinkId' => $b['drinkId'], 'user' => $b['user']];
    foreach (AXES as $ax) {
      $s = clampScore($b[$ax] ?? null);
      if ($s === null) return [false, ['__err' => [400, "bad score: $ax"]]];
      $entry[$ax] = $s;
    }
    $tags = is_array($b['tags'] ?? null) ? $b['tags'] : [];
    $entry['tags'] = array_slice(array_map('strval', $tags), 0, 12);
    $entry['note'] = mb_substr(strval($b['note'] ?? ''), 0, 500);
    $entry['ts'] = nowIso();
    $db['log'][] = $entry;
    return [true, ['ok' => true, 'entry' => $entry]];
  }));
}

if ($method === 'DELETE' && $r === 'log' && $id !== null) {
  respond(withDb(function (&$db, $seeded) use ($id) {
    $before = count($db['log']);
    $db['log'] = array_values(array_filter($db['log'], fn($e) => $e['id'] !== $id));
    if (count($db['log']) === $before) return [false, ['__err' => [404, 'not found']]];
    return [true, ['ok' => true]];
  }));
}

if ($method === 'POST' && $r === 'price') {
  $b = body();
  respond(withDb(function (&$db, $seeded) use ($b) {
    $i = findDrink($db, $b['drinkId'] ?? '');
    if ($i < 0) return [false, ['__err' => [404, 'drink not found']]];
    $price = is_numeric($b['price'] ?? null) ? (float) $b['price'] : -1;
    if ($price <= 0 || $price > 100000) return [false, ['__err' => [400, 'bad price']]];
    $user = in_array($b['user'] ?? '', ['a', 'b'], true) ? $b['user'] : '?';
    if (!isset($db['drinks'][$i]['priceHistory']) || !is_array($db['drinks'][$i]['priceHistory'])) $db['drinks'][$i]['priceHistory'] = [];
    $db['drinks'][$i]['priceHistory'][] = ['price' => round($price), 'ts' => nowIso(), 'user' => $user];
    $db['drinks'][$i]['price'] = round($price);
    return [true, ['ok' => true, 'drink' => $db['drinks'][$i]]];
  }));
}

if ($method === 'POST' && $r === 'drinks') {
  $b = body();
  respond(withDb(function (&$db, $seeded) use ($b) {
    if (empty($b['name']) || empty($b['brand'])) return [false, ['__err' => [400, 'name and brand required']]];
    $name = mb_substr($b['name'], 0, 80);
    $flavor = mb_substr($b['flavor'] ?? '', 0, 60);
    $did = slugify($name . '-' . $flavor);
    if ($did === '') $did = 'd-' . dechex(time());
    if (findDrink($db, $did) >= 0) return [false, ['__err' => [409, 'already exists']]];
    $price = is_numeric($b['price'] ?? null) ? (float) $b['price'] : null;
    $img = (!empty($b['image']) && is_string($b['image'])) ? mb_substr($b['image'], 0, 300) : null;
    $drink = [
      'id' => $did,
      'brand' => mb_substr($b['brand'], 0, 60),
      'collection' => !empty($b['collection']) ? mb_substr($b['collection'], 0, 40) : null,
      'name' => $name,
      'flavor' => $flavor,
      'flavorTag' => 'other',
      'category' => ($b['category'] ?? '') === 'soda' ? 'soda' : 'energy',
      'volume' => is_numeric($b['volume'] ?? null) ? (float) $b['volume'] : null,
      'price' => $price,
      'description' => mb_substr(strval($b['description'] ?? ''), 0, 300),
      'image' => $img,
      'priceHistory' => $price !== null ? [['price' => round($price), 'ts' => nowIso(), 'user' => ($b['user'] ?? '?')]] : [],
    ];
    $db['drinks'][] = $drink;
    return [true, ['ok' => true, 'drink' => $drink]];
  }));
}

if ($method === 'DELETE' && $r === 'drinks' && $id !== null) {
  respond(withDb(function (&$db, $seeded) use ($id) {
    $before = count($db['drinks']);
    $db['drinks'] = array_values(array_filter($db['drinks'], fn($d) => $d['id'] !== $id));
    $db['log'] = array_values(array_filter($db['log'], fn($e) => $e['drinkId'] !== $id));
    if (count($db['drinks']) === $before) return [false, ['__err' => [404, 'not found']]];
    return [true, ['ok' => true]];
  }));
}

jexit(404, ['error' => 'unknown endpoint']);
