<?php
declare(strict_types=1);
/* Database, configuratie en de vorm van elk antwoord. */

/* Deze hosting toont PHP-fouten aan de bezoeker: een onopgevangen uitzondering gaf het
 * volledige pad, de stack trace en de regel code prijs. Dat hoort nooit naar buiten te
 * gaan — fouten gaan naar het serverlogboek, de bezoeker krijgt één zin (§13.1). */
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

function conf(): array {
  static $conf = null;
  if ($conf === null) {
    $pad = __DIR__ . '/config.php';
    if (!is_file($pad)) {
      antwoordFout('server nog niet ingesteld', 500);
    }
    $conf = require $pad;
  }
  return $conf;
}

/** Eén verbinding per verzoek, niet persistent: de hosting staat er maar 8 tegelijk toe
 *  (§13.1). Pas verbinden wanneer een endpoint de database echt nodig heeft. */
function db(): PDO {
  static $pdo = null;
  if ($pdo !== null) return $pdo;
  $c = conf();
  try {
    $pdo = new PDO(
      "mysql:host={$c['db_host']};dbname={$c['db_naam']};charset=utf8mb4",
      $c['db_gebruiker'], $c['db_wachtwoord'],
      [PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
       PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
       PDO::ATTR_EMULATE_PREPARES   => false,
       PDO::ATTR_PERSISTENT         => false]);
  } catch (PDOException $e) {
    // Verbindingslimiet bereikt: de client heeft een wachtrij, dus vragen we hem terug
    // te komen in plaats van zijn ronde te verliezen (§13.1).
    if (in_array((int) $e->getCode(), [1040, 1203], true) ||
        str_contains($e->getMessage(), 'max_user_connections')) {
      header('Retry-After: 5');
      antwoordFout('even te druk, probeer straks opnieuw', 503);
    }
    antwoordFout('database niet bereikbaar', 500);
  }
  return $pdo;
}

function nuIso(): string { return gmdate('Y-m-d\TH:i:s.v\Z'); }

/** Nooit het IP zelf bewaren (§13.8) — alleen een korte hash, om herhaald misbruik te
 *  herkennen zonder iemand te kunnen terugvinden. */
function ipHash(): string {
  $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
  return substr(hash_hmac('sha256', $ip, (string) (conf()['peper'] ?? '')), 0, 16);
}

function antwoord(array $data, int $code = 200): never {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');              // §11.40
  header('X-Content-Type-Options: nosniff');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function antwoordFout(string $bericht, int $code = 400): never {
  antwoord(['fout' => $bericht], $code);
}

/** Snelheidslimiet (§13.6). Geeft true als het mag, false als de teller vol zit. */
function magNog(string $sleutel, int $maximum, int $vensterSec): bool {
  try {
    $pdo = db();
    // Het venster staat als getal in de query in plaats van als gebonden parameter:
    // INTERVAL ? SECOND gedraagt zich niet op elke MariaDB-versie hetzelfde. $vensterSec
    // is altijd een eigen constante, nooit invoer van buiten.
    $pdo->exec('DELETE FROM pogingen WHERE sinds < DATE_SUB(NOW(), INTERVAL ' . (int) $vensterSec . ' SECOND)');
    $pdo->prepare('INSERT INTO pogingen (sleutel, aantal) VALUES (?, 1)
                   ON DUPLICATE KEY UPDATE aantal = aantal + 1')->execute([$sleutel]);
    $st = $pdo->prepare('SELECT aantal FROM pogingen WHERE sleutel = ?');
    $st->execute([$sleutel]);
    return ((int) $st->fetchColumn()) <= $maximum;
  } catch (PDOException $e) {
    // Bestaat de tabel nog niet (verse installatie), dan mag de teller de API niet
    // platleggen. Wel loggen: een snelheidslimiet die stil uitvalt, moet opvallen.
    error_log('VERBA snelheidslimiet werkt niet: ' . $e->getMessage());
    return true;
  }
}
function vergeetPogingen(string $sleutel): void {
  try { db()->prepare('DELETE FROM pogingen WHERE sleutel = ?')->execute([$sleutel]); }
  catch (PDOException $e) { /* zie magNog() */ }
}
