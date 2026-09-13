<?php
declare(strict_types=1);
/* Het klasmozaïek — §13.10.
 *
 * Eén tabel houdt bij welk woord door de klas gouden gekregen is en door wie als
 * eerste. Meer is er niet nodig: de stand per caput is een telling, en het eigen
 * aandeel ook.
 */

const VERBA_MOZ_PER_DAG = 40;      // hoeveel nieuwe woorden één leerling per dag mag bijdragen
const VERBA_TESSERAE    = 6144;    // 96 x 64 steentjes per mozaïek

function woordmeta(): array {
  static $meta = null;
  if ($meta === null) $meta = require __DIR__ . '/woordmeta.php';
  return $meta;
}

/** Welke woorden staan in deze staat op goud? Goud = álle richtingen van dat woord op box 5. */
function goudenWoorden(array $staat): array {
  $meta = woordmeta()['woorden'];
  $box = [];
  foreach (($staat['items'] ?? []) as $sleutel => $it) {
    if (!is_array($it) || !preg_match('/^(\d+):(L2N|L2V)$/', (string) $sleutel, $m)) continue;
    if ((int) ($it['box'] ?? 0) === 5) $box[$m[1]] = ($box[$m[1]] ?? 0) + 1;
  }
  $goud = [];
  foreach ($box as $nr => $aantal) {
    if (isset($meta[$nr]) && $aantal >= $meta[$nr][1]) $goud[] = (int) $nr;
  }
  return $goud;
}

/**
 * Schrijft de nieuwe gouden woorden van deze leerling bij de klas.
 * Wie een woord als eerste gouden krijgt, legt de steentjes; daarna telt het niet
 * nog eens (§13.10.2, "verschillende woorden").
 *
 * @return int hoeveel woorden er echt bijgekomen zijn
 */
function legSteentjes(int $klasId, int $leerlingId, array $staat): int {
  $goud = goudenWoorden($staat);
  if (!$goud) return 0;
  $pdo = db();

  // Daglimiet (§13.6): een enkele sync mag het mozaïek niet in één klap uitspelen.
  $st = $pdo->prepare('SELECT COUNT(*) FROM klaswoorden
                       WHERE klas_id = ? AND leerling_id = ? AND DATE(moment) = CURDATE()');
  $st->execute([$klasId, $leerlingId]);
  $ruimte = VERBA_MOZ_PER_DAG - (int) $st->fetchColumn();
  if ($ruimte <= 0) return 0;

  $invoegen = $pdo->prepare('INSERT IGNORE INTO klaswoorden (klas_id, woord_nr, leerling_id)
                             VALUES (?, ?, ?)');
  $gelegd = 0;
  foreach ($goud as $nr) {
    if ($gelegd >= $ruimte) break;
    $invoegen->execute([$klasId, $nr, $leerlingId]);
    if ($invoegen->rowCount() > 0) $gelegd++;      // 0 = een klasgenoot was eerder
  }
  return $gelegd;
}

/** GET /klas — de stand per caput, plus het eigen aandeel. Nooit iets over een ander. */
function doeKlas(): never {
  $l = eisLeerling();
  $meta = woordmeta();
  $pdo = db();

  // De caput-indeling zit in woordmeta, niet in de database: tellen doen we in PHP,
  // dat is voor hoogstens 1051 rijen sneller dan er een tabel bij te slepen.
  $st = $pdo->prepare('SELECT woord_nr, leerling_id FROM klaswoorden WHERE klas_id = ?');
  $st->execute([(int) $l['klas_id']]);

  $klaar = $mijn = [];
  foreach ($st->fetchAll() as $rij) {
    $nr = (string) $rij['woord_nr'];
    if (!isset($meta['woorden'][$nr])) continue;        // woord verdwenen uit de lijst
    $caput = $meta['woorden'][$nr][0];
    $klaar[$caput] = ($klaar[$caput] ?? 0) + 1;
    if ((int) $rij['leerling_id'] === (int) $l['id']) $mijn[$caput] = ($mijn[$caput] ?? 0) + 1;
  }

  $caputs = [];
  $totaalKlaar = $totaalMijn = $totaalWoorden = 0;
  foreach ($meta['perCaput'] as $caput => $woorden) {
    $k = $klaar[$caput] ?? 0;
    $caputs[] = [
      'caput'    => (int) $caput,
      'woorden'  => (int) $woorden,
      'klaar'    => $k,
      'mijn'     => $mijn[$caput] ?? 0,
      // Hoeveel steentjes er liggen: exact af wanneer élk woord van dat caput goud is.
      'steentjes' => (int) floor(VERBA_TESSERAE * $k / max(1, (int) $woorden)),
      'perWoord' => (int) floor(VERBA_TESSERAE / max(1, (int) $woorden)),
    ];
    $totaalKlaar += $k; $totaalMijn += $mijn[$caput] ?? 0; $totaalWoorden += (int) $woorden;
  }
  usort($caputs, fn($a, $b) => $a['caput'] <=> $b['caput']);

  $aantal = $pdo->prepare('SELECT COUNT(*) FROM leerlingen WHERE klas_id = ?');
  $aantal->execute([(int) $l['klas_id']]);

  antwoord([
    'klas'      => $l['klas_naam'],
    'leerlingen' => (int) $aantal->fetchColumn(),
    'caputs'    => $caputs,
    'totaal'    => ['woorden' => $totaalWoorden, 'klaar' => $totaalKlaar, 'mijn' => $totaalMijn],
    'perDag'    => VERBA_MOZ_PER_DAG,
  ]);
}
