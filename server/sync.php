<?php
declare(strict_types=1);
/* Staat ophalen en synchroniseren — §13.5 en §13.6. */

require_once __DIR__ . '/samenvoegen.php';
require_once __DIR__ . '/grenzen.php';

function haalStaatRij(int $leerlingId): array {
  $st = db()->prepare('SELECT staat, rev, bijgewerkt FROM staat WHERE leerling_id = ?');
  $st->execute([$leerlingId]);
  $rij = $st->fetch();
  if (!$rij) return ['staat' => [], 'rev' => 0, 'bijgewerkt' => null];
  $staat = json_decode((string) $rij['staat'], true);
  return ['staat'      => is_array($staat) ? $staat : [],
          'rev'        => (int) $rij['rev'],
          'bijgewerkt' => $rij['bijgewerkt']];
}

/** GET /staat — de volledige samengevoegde staat, bv. na inloggen op een nieuw toestel. */
function doeStaat(): never {
  $l = eisLeerling();
  $rij = haalStaatRij((int) $l['id']);
  antwoord(['rev' => $rij['rev'], 'staat' => $rij['staat'] ?: null,
            'naam' => $l['naam'], 'klas' => $l['klas_naam']]);
}

/** GET /woorden — de woordenlijst, alleen met een geldig token (§13.8, §11.36).
 *  De app bewaart ze daarna lokaal, zodat ze ook zonder verbinding kan werken. */
function doeWoorden(): never {
  eisLeerling();
  $json = require __DIR__ . '/woorden.php';      // de JSON als tekst, niet als array
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  echo '{"woorden":', $json, '}';
  exit;
}

/** POST /sync — {basisRev, wijziging, gebeurtenissen} → samenvoegen en bewaren. */
function doeSync(array $in, string $ruw): never {
  $l = eisLeerling();
  $id = (int) $l['id'];

  if (!magNog('sync:' . $id, 8, 60)) {
    header('Retry-After: 10');
    antwoordFout('te snel achter elkaar — probeer zo opnieuw', 429);
  }

  $wijziging = is_array($in['wijziging'] ?? null) ? $in['wijziging'] : null;
  if ($wijziging === null) antwoordFout('geen wijziging meegestuurd');

  $rij  = haalStaatRij($id);
  $oud  = $rij['staat'];
  $sec  = $rij['bijgewerkt'] ? max(0, time() - strtotime((string) $rij['bijgewerkt'])) : 0;

  // Grenzen (§13.6): weigeren, niet stil afkappen — en de reden in het logboek.
  $clientIsBij = ((int) ($in['basisRev'] ?? -1)) === $rij['rev'];
  if ($reden = keurStaat($wijziging, $oud, $sec, null, $clientIsBij)) {
    logboek((int) $l['klas_id'], $id, $l['naam'], 'sync-geweigerd', 'sync geweigerd — ' . $reden);
    antwoordFout('sync geweigerd: ' . $reden, 422);
  }

  $samen = voegSamen($oud, $wijziging);
  if (count($samen['items']) > VERBA_MAX_ITEMS) {
    logboek((int) $l['klas_id'], $id, $l['naam'], 'sync-geweigerd',
            'sync geweigerd — samengevoegd te veel leeritems (' . count($samen['items']) . ')');
    antwoordFout('sync geweigerd: te veel leeritems', 422);
  }

  $rev = $rij['rev'] + 1;
  $pdo = db();
  $pdo->prepare('INSERT INTO staat (leerling_id, staat, rev) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE staat = VALUES(staat), rev = VALUES(rev)')
      ->execute([$id, json_encode($samen, JSON_UNESCAPED_UNICODE), $rev]);
  $pdo->prepare('UPDATE leerlingen SET rev = ?, laatste_sync = NOW() WHERE id = ?')->execute([$rev, $id]);

  $nieuweItems = count($samen['items']) - count($oud['items'] ?? []);
  $eerste = ($rij['rev'] === 0);
  logboek((int) $l['klas_id'], $id, $l['naam'], $eerste ? 'migratie' : 'sync',
          $eerste
            ? sprintf('eerste sync (migratie van een bestaande save) — %d leeritems, %d XP',
                      count($samen['items']), (int) ($samen['profiel']['xp'] ?? 0))
            : sprintf('gesynct — %d leeritems binnengekregen, %d nieuw, staat nu rev %d',
                      count($wijziging['items'] ?? []), max(0, $nieuweItems), $rev),
          ['items' => count($samen['items']), 'xp' => (int) ($samen['profiel']['xp'] ?? 0)]);

  // Gebeurtenissen van het toestel: alleen de soort en de cijfers tellen, de zin maakt
  // de server zelf (zie zinVoor() — anders schrijft een leerling zijn eigen logboek).
  foreach (array_slice(is_array($in['gebeurtenissen'] ?? null) ? $in['gebeurtenissen'] : [], 0, 20) as $g) {
    if (!is_array($g)) continue;
    $zin = zinVoor((string) ($g['soort'] ?? ''), is_array($g['cijfers'] ?? null) ? $g['cijfers'] : []);
    if ($zin !== null) logboek((int) $l['klas_id'], $id, $l['naam'], (string) $g['soort'], $zin);
  }
  snoeiLogboek();

  // De staat teruggeven als het toestel achterliep (§13.5); anders volstaat het profiel,
  // want daar zitten de herberekende velden (streak, level) in.
  $achter = ((int) ($in['basisRev'] ?? 0)) !== $rij['rev'];
  antwoord($achter
    ? ['rev' => $rev, 'staat' => $samen]
    : ['rev' => $rev, 'profiel' => $samen['profiel']]);
}
