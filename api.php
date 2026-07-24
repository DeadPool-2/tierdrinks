<?php
// TierDrinks API — PHP port of server.js for shared hosting (Beget).
// Written PHP 5.6-compatible (no arrow fns / ?? / random_bytes / const arrays).
// Static files served by the web server; .htaccess routes /api/* here.

header('Content-Type: application/json; charset=utf-8');

define('DATA_DIR', __DIR__ . '/data');
define('DB', DATA_DIR . '/db.json');
define('SEED', DATA_DIR . '/seed.json');

$AXES = array('taste', 'value', 'aftertaste');

function jexit($code, $obj) {
  http_response_code($code);
  echo json_encode($obj, JSON_UNESCAPED_UNICODE);
  exit;
}
function v($a, $k, $d = null) {
  return isset($a[$k]) ? $a[$k] : $d;
}
function body() {
  $b = json_decode(file_get_contents('php://input'), true);
  return is_array($b) ? $b : array();
}
function seedData() {
  $s = json_decode(@file_get_contents(SEED), true);
  return is_array($s) ? $s : array('drinks' => array(), 'brandColors' => array());
}
function nowIso() {
  return gmdate('Y-m-d\TH:i:s') . '.000Z';
}
function genId($p) {
  return $p . '_' . dechex(time()) . '_' . substr(md5(uniqid('', true) . mt_rand()), 0, 6);
}
function clampScore($val) {
  if (!is_numeric($val)) return null;
  $n = (float) $val;
  return max(0, min(10, round($n * 10) / 10));
}

// mirror of src/flavors.js tagOf() — ordered high→low priority, first hit wins
function tagOf($text) {
  static $groups = null;
  if ($groups === null) $groups = array(
    array('coffee', array('кофе','coffee','мокко','moca','эспрессо','espresso','латте','капуч')),
    array('tea', array('чай','tea')),
    array('caramel', array('карамель','caramel')),
    array('vanilla', array('ваниль','vanilla')),
    array('mango', array('манго','mango')),
    array('peach', array('персик','peach','нектарин','nectar')),
    array('apricot', array('абрикос','apricot')),
    array('cherry', array('вишн','cherry','черешн')),
    array('blueberry', array('черник','blueberry')),
    array('cranberry', array('клюкв','cranberry')),
    array('pomegranate', array('гранат','pomegranate')),
    array('watermelon', array('арбуз','watermelon')),
    array('melon', array('дын','melon')),
    array('pineapple', array('ананас','pineapple')),
    array('coconut', array('кокос','coconut')),
    array('guava', array('гуава','guava')),
    array('strawberry', array('клубник','strawberry')),
    array('raspberry', array('малин','raspberry','razz')),
    array('cactus', array('кактус','cactus')),
    array('lychee', array('личи','lychee','litchi')),
    array('barberry', array('барбарис','barberry')),
    array('passion', array('маракуй','passion','pipeline')),
    array('apple', array('яблок','apple')),
    array('kiwi', array('киви','kiwi')),
    array('feijoa', array('фейхоа','feijoa')),
    array('banana', array('банан','banana')),
    array('bubblegum', array('бабл','bubble','жвачк')),
    array('marshmallow', array('маршмеллоу','marshmallow','зефир')),
    array('mojito', array('мохито','mojito','мят','mint')),
    array('cola', array('кола','cola')),
    array('lemonade', array('лимонад','lemonade')),
    array('orange', array('апельсин','orange','sunrise','dreamsicle')),
    array('citrus', array('цитрус','citrus','лимон','лайм','lime','грейпфрут','лемонграсс','lemongrass','dew')),
    array('grape', array('виноград','grape')),
    array('tropical', array('тропич','тропик','tropical','tropic')),
    array('multifruit', array('мультифрукт','мультифрут','сок','микс','multifruit','пунш','punch','khaos','хаос')),
    array('berry', array('ягод','berry','лесн','wildberry','pacific')),
    array('zero', array('без сахара','zero','ultra','ультра','sugarfree','sugar free','white')),
    array('original', array('оригинал','классик','original','classic','energy','ориджинал','assault')),
  );
  $t = mb_strtolower(strval($text), 'UTF-8');
  foreach ($groups as $g) {
    foreach ($g[1] as $tok) {
      if (strpos($t, $tok) !== false) return $g[0];
    }
  }
  return 'other';
}

$TRANSLIT = array('а'=>'a','б'=>'b','в'=>'v','г'=>'g','д'=>'d','е'=>'e','ё'=>'e','ж'=>'zh','з'=>'z','и'=>'i','й'=>'y','к'=>'k','л'=>'l','м'=>'m','н'=>'n','о'=>'o','п'=>'p','р'=>'r','с'=>'s','т'=>'t','у'=>'u','ф'=>'f','х'=>'h','ц'=>'ts','ч'=>'ch','ш'=>'sh','щ'=>'sch','ъ'=>'','ы'=>'y','ь'=>'','э'=>'e','ю'=>'yu','я'=>'ya');
function slugify($str) {
  global $TRANSLIT;
  $s = mb_strtolower($str, 'UTF-8');
  $s = strtr($s, $TRANSLIT);
  $s = preg_replace('/[^a-z0-9]+/u', '-', $s);
  return trim($s, '-');
}

// merge fresh seed.json into an existing db: append new catalog drinks
// (unless tombstoned in db.deleted) and refresh catalog-owned fields on
// seed drinks (image/flavorTag/…). Ratings, prices and log are never touched.
// Without this, catalog updates only reached prod by wiping db.json.
function seedMerge(&$db) {
  $seed = seedData();
  if (empty($seed['drinks'])) return false;
  $changed = false;
  $deleted = array_flip($db['deleted']);
  $byId = array();
  foreach ($seed['drinks'] as $sd) $byId[$sd['id']] = $sd;
  $have = array();
  $fields = array('image', 'flavorTag', 'description', 'collection', 'volume', 'category');
  foreach ($db['drinks'] as $i => $d) {
    $have[$d['id']] = true;
    if (!isset($byId[$d['id']])) continue;
    $sd = $byId[$d['id']];
    foreach ($fields as $f) {
      if (isset($sd[$f]) && (!isset($d[$f]) || $d[$f] !== $sd[$f])) {
        $db['drinks'][$i][$f] = $sd[$f];
        $changed = true;
      }
    }
    // seed-owned price follows the seed until the user edits it
    $ph = (isset($d['priceHistory']) && is_array($d['priceHistory'])) ? $d['priceHistory'] : array();
    $userPriced = false;
    foreach ($ph as $rec) {
      if (isset($rec['user']) && $rec['user'] !== 'seed') { $userPriced = true; break; }
    }
    if (!$userPriced) {
      $sp = isset($sd['price']) ? $sd['price'] : null;
      $dbp = isset($d['price']) ? $d['price'] : null;
      if ($dbp !== $sp) {
        $db['drinks'][$i]['price'] = $sp;
        $db['drinks'][$i]['priceHistory'] = isset($sd['priceHistory']) ? $sd['priceHistory'] : array();
        $changed = true;
      }
    }
  }
  foreach ($seed['drinks'] as $sd) {
    if (isset($have[$sd['id']]) || isset($deleted[$sd['id']])) continue;
    $db['drinks'][] = $sd;
    $changed = true;
  }
  // prune seed-born drinks that dropped out of the seed (superseded lineup):
  // only if the user never rated or re-priced them — user data is sacred
  $logged = array();
  foreach ($db['log'] as $e) $logged[$e['drinkId']] = true;
  $kept = array();
  foreach ($db['drinks'] as $d) {
    $ph = (isset($d['priceHistory']) && is_array($d['priceHistory'])) ? $d['priceHistory'] : array();
    $fromSeed = isset($ph[0]['user']) && $ph[0]['user'] === 'seed';
    $userTouched = isset($logged[$d['id']]) || count($ph) > 1;
    if ($fromSeed && !$userTouched && !isset($byId[$d['id']])) {
      $changed = true;
      continue;
    }
    $kept[] = $d;
  }
  $db['drinks'] = $kept;
  return $changed;
}

// locked read-modify-write; $fn(&$db, $seededNow) returns array(bool save, mixed response)
function withDb($fn) {
  if (!is_dir(DATA_DIR)) @mkdir(DATA_DIR, 0755, true);
  $fp = fopen(DB, 'c+');
  if (!$fp) jexit(500, array('error' => 'db open failed'));
  flock($fp, LOCK_EX);
  $raw = stream_get_contents($fp);
  $db = json_decode($raw, true);
  $seeded = false;
  if (!is_array($db) || empty($db['drinks'])) {
    $seed = seedData();
    $db = array('drinks' => $seed['drinks'], 'log' => array());
    $seeded = true;
  }
  if (!isset($db['log']) || !is_array($db['log'])) $db['log'] = array();
  if (!isset($db['deleted']) || !is_array($db['deleted'])) $db['deleted'] = array();
  $merged = seedMerge($db);
  $ret = $fn($db, $seeded);
  $save = $ret[0];
  $response = $ret[1];
  if ($save || $seeded || $merged) {
    rewind($fp);
    ftruncate($fp, 0);
    fwrite($fp, json_encode($db, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fp);
    dailyBackup();
  }
  flock($fp, LOCK_UN);
  fclose($fp);
  return $response;
}

// rotating daily copy of the db (keeps the last 7); best-effort, never fatal.
// data/ is closed from the web by its .htaccess, backups included.
function dailyBackup() {
  $dir = DATA_DIR . '/backups';
  if (!is_dir($dir)) @mkdir($dir, 0755, true);
  $today = $dir . '/db-' . date('Y-m-d') . '.json';
  if (file_exists($today)) return;
  @copy(DB, $today);
  $files = glob($dir . '/db-*.json');
  if ($files === false) return;
  sort($files);
  while (count($files) > 7) @unlink(array_shift($files));
}
function respond($resp) {
  if (isset($resp['__err'])) jexit($resp['__err'][0], array('error' => $resp['__err'][1]));
  jexit(200, $resp);
}
function findDrink($db, $id) {
  foreach ($db['drinks'] as $i => $d) if ($d['id'] === $id) return $i;
  return -1;
}

// ---- route ----
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$after = preg_replace('#^.*?/api#', '', $uri);      // e.g. /state, /log/xyz
$seg = explode('/', trim($after, '/'));
$r = isset($seg[0]) ? $seg[0] : '';
$id = isset($seg[1]) ? urldecode($seg[1]) : null;

if ($method === 'GET' && $r === 'state') {
  respond(withDb(function (&$db, $seeded) {
    return array(false, array('drinks' => $db['drinks'], 'log' => $db['log'], 'brandColors' => seedData()['brandColors']));
  }));
}

if ($method === 'GET' && $r === 'export') {
  $db = withDb(function (&$db, $seeded) {
    return array(false, $db);
  });
  header('Content-Type: application/json; charset=utf-8');
  header('Content-Disposition: attachment; filename="tierdrinks-backup-' . date('Y-m-d') . '.json"');
  echo json_encode($db, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
  exit;
}

if ($method === 'POST' && $r === 'log' && $id === null) {
  $b = body();
  global $AXES;
  respond(withDb(function (&$db, $seeded) use ($b, $AXES) {
    if (findDrink($db, v($b, 'drinkId', '')) < 0) return array(false, array('__err' => array(404, 'drink not found')));
    if (v($b, 'user') !== 'a' && v($b, 'user') !== 'b') return array(false, array('__err' => array(400, 'bad user')));
    $entry = array('id' => genId('l'), 'drinkId' => $b['drinkId'], 'user' => $b['user']);
    foreach ($AXES as $ax) {
      $s = clampScore(v($b, $ax));
      if ($s === null) return array(false, array('__err' => array(400, "bad score: $ax")));
      $entry[$ax] = $s;
    }
    $tags = is_array(v($b, 'tags')) ? $b['tags'] : array();
    $entry['tags'] = array_slice(array_map('strval', $tags), 0, 12);
    $entry['note'] = mb_substr(strval(v($b, 'note', '')), 0, 500);
    $entry['ts'] = nowIso();
    $db['log'][] = $entry;
    return array(true, array('ok' => true, 'entry' => $entry));
  }));
}

if ($method === 'DELETE' && $r === 'log' && $id !== null) {
  respond(withDb(function (&$db, $seeded) use ($id) {
    $before = count($db['log']);
    $out = array();
    foreach ($db['log'] as $e) if ($e['id'] !== $id) $out[] = $e;
    $db['log'] = $out;
    if (count($db['log']) === $before) return array(false, array('__err' => array(404, 'not found')));
    return array(true, array('ok' => true));
  }));
}

if ($method === 'POST' && $r === 'price') {
  $b = body();
  respond(withDb(function (&$db, $seeded) use ($b) {
    $i = findDrink($db, v($b, 'drinkId', ''));
    if ($i < 0) return array(false, array('__err' => array(404, 'drink not found')));
    $price = is_numeric(v($b, 'price')) ? (float) $b['price'] : -1;
    if ($price <= 0 || $price > 100000) return array(false, array('__err' => array(400, 'bad price')));
    $user = in_array(v($b, 'user'), array('a', 'b'), true) ? $b['user'] : '?';
    if (!isset($db['drinks'][$i]['priceHistory']) || !is_array($db['drinks'][$i]['priceHistory'])) $db['drinks'][$i]['priceHistory'] = array();
    $db['drinks'][$i]['priceHistory'][] = array('price' => round($price), 'ts' => nowIso(), 'user' => $user);
    $db['drinks'][$i]['price'] = round($price);
    return array(true, array('ok' => true, 'drink' => $db['drinks'][$i]));
  }));
}

if ($method === 'POST' && $r === 'drinks') {
  $b = body();
  respond(withDb(function (&$db, $seeded) use ($b) {
    if (empty($b['name']) || empty($b['brand'])) return array(false, array('__err' => array(400, 'name and brand required')));
    $name = mb_substr($b['name'], 0, 80);
    $flavor = mb_substr(v($b, 'flavor', ''), 0, 60);
    $did = slugify($name . '-' . $flavor);
    if ($did === '') $did = 'd-' . dechex(time());
    if (findDrink($db, $did) >= 0) return array(false, array('__err' => array(409, 'already exists')));
    $price = is_numeric(v($b, 'price')) ? (float) $b['price'] : null;
    $img = (v($b, 'image') && is_string($b['image'])) ? mb_substr($b['image'], 0, 300) : null;
    $drink = array(
      'id' => $did,
      'brand' => mb_substr($b['brand'], 0, 60),
      'collection' => v($b, 'collection') ? mb_substr($b['collection'], 0, 40) : null,
      'name' => $name,
      'flavor' => $flavor,
      'flavorTag' => tagOf($name . ' ' . $flavor),
      'category' => v($b, 'category') === 'soda' ? 'soda' : 'energy',
      'volume' => is_numeric(v($b, 'volume')) ? (float) $b['volume'] : null,
      'price' => $price,
      'description' => mb_substr(strval(v($b, 'description', '')), 0, 300),
      'image' => $img,
      'priceHistory' => $price !== null ? array(array('price' => round($price), 'ts' => nowIso(), 'user' => v($b, 'user', '?'))) : array(),
    );
    $db['drinks'][] = $drink;
    return array(true, array('ok' => true, 'drink' => $drink));
  }));
}

if ($method === 'DELETE' && $r === 'drinks' && $id !== null) {
  respond(withDb(function (&$db, $seeded) use ($id) {
    $before = count($db['drinks']);
    $drinks = array();
    foreach ($db['drinks'] as $d) if ($d['id'] !== $id) $drinks[] = $d;
    $log = array();
    foreach ($db['log'] as $e) if ($e['drinkId'] !== $id) $log[] = $e;
    $db['drinks'] = $drinks;
    $db['log'] = $log;
    if (count($db['drinks']) === $before) return array(false, array('__err' => array(404, 'not found')));
    // tombstone: keep seedMerge from resurrecting a deleted seed drink
    if (!in_array($id, $db['deleted'], true)) $db['deleted'][] = $id;
    return array(true, array('ok' => true));
  }));
}

jexit(404, array('error' => 'unknown endpoint'));
