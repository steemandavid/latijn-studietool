<?php
declare(strict_types=1);
/* Samenvoegen van twee VERBA-saves — §13.5 van de specificatie.
 *
 * De regel die alles stuurt: SAMENVOEGEN, NOOIT OVERSCHRIJVEN. Een save die de andere
 * wint, wist een avond studeren op het andere toestel. Daarom kent elk veld hier zijn
 * eigen regel, en zijn de tellers monotoon: ze kunnen alleen omhoog.
 *
 * Zuiver rekenwerk, geen database en geen HTTP — zo is het testbaar met
 * `php test/samenvoegen-test.php`.
 */

const VERBA_MONOTOON = ['xp','level','besteCombo','blitzRecord','totaalJuist','totaalFout',
                        'vormJuist','vormFout','besteTypStreak','totaalRondes','totaleTijdMs'];
const VERBA_NU_VELDEN = ['combo','typStreak','tempo'];   // van de kant met de nieuwste activiteit
const VERBA_HISTORIEK_MAX = 60;                          // zoals de app zelf (§5.3)
const VERBA_BEHEERST_OPRIJ = 2;                          // zoals de app zelf (§4.3)

function vgObject(mixed $x): ?array {
  return (is_array($x) && !array_is_list($x)) ? $x : null;
}
function vgGetal(mixed $x): int|float {
  return is_numeric($x) ? (0 + $x) : 0;
}
function vgTekst(mixed $x): ?string {
  return (is_string($x) && $x !== '') ? $x : null;
}

/** Tijdstempels van een client zijn onbetrouwbaar: klokken lopen uit elkaar en een
 *  toestel dat in de toekomst staat zou anders elk samenvoegen winnen (§13.5). */
function vgKlemTijd(mixed $t, string $nu): ?string {
  $t = vgTekst($t);
  if ($t === null) return null;
  return ($t > $nu) ? $nu : $t;
}

/** Welke kant heeft het laatst gespeeld? Bepaalt de velden die een momentopname zijn
 *  (combo, typ-streak, tempo-index) en welke itemkant de box mag zetten. */
function vgActiviteit(array $s, string $nu): string {
  $laatste = '';
  foreach ((vgObject($s['items'] ?? null) ?? []) as $it) {
    $t = vgKlemTijd(vgObject($it)['laatstGezien'] ?? null, $nu);
    if ($t !== null && $t > $laatste) $laatste = $t;
  }
  $dag = vgTekst((vgObject($s['profiel'] ?? null) ?? [])['laatsteActieveDag'] ?? null);
  if ($dag !== null && $dag > substr($laatste, 0, 10)) $laatste = $dag;
  return $laatste;
}

/** Dagstreak opnieuw uitrekenen uit de samengevoegde dagen, nooit overnemen: twee
 *  toestellen hebben elk maar een deel van de geschiedenis gezien (§5.3, §13.5). */
function vgHerberekenStreak(array $dagen): array {
  $dagen = array_values(array_unique(array_filter($dagen, fn($d) =>
    is_string($d) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) === 1)));
  sort($dagen);
  if (!$dagen) return ['streak' => 0, 'laatsteActieveDag' => null, 'streakGeschiedenis' => []];

  $laatste = end($dagen);
  $set = array_flip($dagen);
  $streak = 0;
  $d = $laatste;
  while (isset($set[$d])) {
    $streak++;
    $d = date('Y-m-d', strtotime($d . ' -1 day'));
  }
  return [
    'streak' => $streak,
    'laatsteActieveDag' => $laatste,
    'streakGeschiedenis' => array_slice($dagen, -VERBA_HISTORIEK_MAX),
  ];
}

/** Eén leeritem. De nieuwste kant zegt waar het item stáát (box, wachtrij-tellers);
 *  hoe vaak het juist en fout was, is de som van twee toestellen en dus het maximum. */
function vgVoegItemSamen(?array $a, ?array $b, string $nu): array {
  if ($a === null) return vgSchoonItem($b ?? [], $nu);
  if ($b === null) return vgSchoonItem($a, $nu);
  $ta = vgKlemTijd($a['laatstGezien'] ?? null, $nu) ?? '';
  $tb = vgKlemTijd($b['laatstGezien'] ?? null, $nu) ?? '';
  $nieuwste = ($tb > $ta) ? $b : $a;
  return [
    'box'             => max(0, min(5, (int) vgGetal($nieuwste['box'] ?? 0))),
    'juist'           => (int) max(vgGetal($a['juist'] ?? 0), vgGetal($b['juist'] ?? 0)),
    'fout'            => (int) max(vgGetal($a['fout'] ?? 0), vgGetal($b['fout'] ?? 0)),
    'laatstGezien'    => ($tb > $ta) ? ($tb ?: null) : ($ta ?: null),
    'vragenSindsdien' => (int) vgGetal($nieuwste['vragenSindsdien'] ?? 99),
    'mcSinds'         => (int) vgGetal($nieuwste['mcSinds'] ?? 0),
    // De reeks foutloze beurten (§4.3) hoort bij waar het item stáát, net als de box:
    // de nieuwste kant weet dat, de som van twee toestellen zou hem verzinnen.
    'opRij'           => vgOpRij($nieuwste),
  ];
}
/** Saves van vóór §4.3 kennen opRij niet. Box 5 is alleen langs juiste antwoorden te
 *  bereiken (een fout zet terug naar box 1), dus zo'n item gold al als beheerst — net
 *  zoals de app zelf die oude saves leest. */
function vgOpRij(array $it): int {
  if (isset($it['opRij']) && is_numeric($it['opRij'])) return (int) max(0, vgGetal($it['opRij']));
  return ((int) vgGetal($it['box'] ?? 0) === 5) ? VERBA_BEHEERST_OPRIJ : 0;
}
function vgSchoonItem(array $it, string $nu): array {
  return [
    'box'             => max(0, min(5, (int) vgGetal($it['box'] ?? 0))),
    'juist'           => (int) max(0, vgGetal($it['juist'] ?? 0)),
    'fout'            => (int) max(0, vgGetal($it['fout'] ?? 0)),
    'laatstGezien'    => vgKlemTijd($it['laatstGezien'] ?? null, $nu),
    'vragenSindsdien' => (int) vgGetal($it['vragenSindsdien'] ?? 99),
    'mcSinds'         => (int) vgGetal($it['mcSinds'] ?? 0),
    'opRij'           => vgOpRij($it),
  ];
}

/** Verdiende dingen (badges, tesserae): een vereniging, en bij dubbel wint de VROEGSTE
 *  tijdstempel — je hebt hem toen verdiend, niet bij de laatste sync. */
function vgVoegVerdiendSamen(array $a, array $b): array {
  $uit = [];
  foreach ([$a, $b] as $bron) {
    foreach ($bron as $sleutel => $tijd) {
      $t = vgTekst($tijd);
      if ($t === null) continue;
      if (!isset($uit[$sleutel]) || $t < $uit[$sleutel]) $uit[$sleutel] = $t;
    }
  }
  ksort($uit);
  return $uit;
}

/**
 * Voegt twee saves samen volgens §13.5.
 *
 * @param array       $server  de staat zoals de server hem kent (mag leeg zijn)
 * @param array       $client  wat het toestel meebrengt (mag een gedeeltelijke staat zijn:
 *                             een ontbrekend veld betekent "ik weet het niet", niet "leeg")
 * @param string|null $nu      ISO-tijd, injecteerbaar voor de tests
 */
function voegSamen(array $server, array $client, ?string $nu = null): array {
  $nu ??= gmdate('Y-m-d\TH:i:s.v\Z');

  $sProfiel = vgObject($server['profiel'] ?? null) ?? [];
  $cProfiel = vgObject($client['profiel'] ?? null) ?? [];
  $sAct = vgActiviteit($server, $nu);
  $cAct = vgActiviteit($client, $nu);
  $nieuwsteProfiel = ($cAct >= $sAct) ? $cProfiel : $sProfiel;

  $profiel = [];
  foreach (VERBA_MONOTOON as $veld) {
    $profiel[$veld] = max(vgGetal($sProfiel[$veld] ?? 0), vgGetal($cProfiel[$veld] ?? 0));
  }
  foreach (VERBA_NU_VELDEN as $veld) {
    $profiel[$veld] = vgGetal($nieuwsteProfiel[$veld] ?? ($sProfiel[$veld] ?? 0));
  }
  $profiel['tempo'] = max(0.0, min(1.0, (float) ($profiel['tempo'] ?: 0.5)));
  $profiel += vgHerberekenStreak(array_merge(
    is_array($sProfiel['streakGeschiedenis'] ?? null) ? $sProfiel['streakGeschiedenis'] : [],
    is_array($cProfiel['streakGeschiedenis'] ?? null) ? $cProfiel['streakGeschiedenis'] : []
  ));

  $items = [];
  $sItems = vgObject($server['items'] ?? null) ?? [];
  $cItems = vgObject($client['items'] ?? null) ?? [];
  foreach (array_keys($sItems + $cItems) as $sleutel) {
    $items[$sleutel] = vgVoegItemSamen(
      vgObject($sItems[$sleutel] ?? null), vgObject($cItems[$sleutel] ?? null), $nu);
  }
  ksort($items);

  $secties = [];
  $sSec = vgObject($server['secties'] ?? null) ?? [];
  $cSec = vgObject($client['secties'] ?? null) ?? [];
  foreach (array_keys($sSec + $cSec) as $sleutel) {
    $a = vgObject($sSec[$sleutel] ?? null) ?? [];
    $b = vgObject($cSec[$sleutel] ?? null) ?? [];
    $secties[$sleutel] = [
      'veroverd'   => (bool) ($a['veroverd'] ?? false) || (bool) ($b['veroverd'] ?? false),
      'besteScore' => (int) max(vgGetal($a['besteScore'] ?? 0), vgGetal($b['besteScore'] ?? 0)),
      'pogingen'   => (int) max(vgGetal($a['pogingen'] ?? 0), vgGetal($b['pogingen'] ?? 0)),
    ];
  }
  ksort($secties);

  $sEx = vgObject($server['examen'] ?? null) ?? [];
  $cEx = vgObject($client['examen'] ?? null) ?? [];

  // Instellingen: laatste schrijver wint (§13.5). Brengt het toestel ze niet mee, dan
  // blijft staan wat de server had — een ontbrekend veld is geen leeg veld.
  $settings = vgObject($client['settings'] ?? null) ?? vgObject($server['settings'] ?? null) ?? [];

  return [
    'app'      => 'verba',
    'version'  => 1,
    'settings' => $settings,
    'profiel'  => $profiel,
    'items'    => $items,
    'badges'   => vgVoegVerdiendSamen(vgObject($server['badges'] ?? null) ?? [],
                                      vgObject($client['badges'] ?? null) ?? []),
    'tesserae' => vgVoegVerdiendSamen(vgObject($server['tesserae'] ?? null) ?? [],
                                      vgObject($client['tesserae'] ?? null) ?? []),
    'secties'  => $secties,
    'examen'   => [
      'gehaald'    => (bool) ($sEx['gehaald'] ?? false) || (bool) ($cEx['gehaald'] ?? false),
      'besteScore' => (int) max(vgGetal($sEx['besteScore'] ?? 0), vgGetal($cEx['besteScore'] ?? 0)),
    ],
  ];
}
