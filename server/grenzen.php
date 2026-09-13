<?php
declare(strict_types=1);
/* Plausibiliteitsgrenzen op wat een toestel binnenstuurt — §13.6.
 *
 * De leermotor draait in de browser, dus elke score is een BEWERING. Deze grenzen maken
 * vals spelen niet onmogelijk (dat zou de hele motor serverzijdig vragen), maar wel
 * zichtbaar en onschadelijk: wat er niet doorkan wordt GEWEIGERD, niet stil afgekapt,
 * en belandt met reden in het logboek (§13.7).
 *
 * Zuiver rekenwerk: `php test/grenzen-test.php`.
 */

const VERBA_MAX_PAYLOAD       = 512 * 1024;  // bytes
const VERBA_MAX_ITEMS         = 1806;        // 1051 × L2N + 755 × L2V (§11.4)
const VERBA_MAX_VRAGEN_SYNC   = 300;         // beantwoorde vragen in één sync
const VERBA_MAX_XP_PER_UUR    = 6000;
const VERBA_MIN_VENSTER_SEC   = 600;         // rekenvenster voor XP: minstens 10 minuten,
                                             // anders straft een snelle tweede sync je
const VERBA_TOEKOMST_MARGE    = 300;         // seconden speling op een klok die voorloopt

/**
 * @param bool $clientIsBij  Heeft het toestel de huidige serverstaat gezien (basisRev == rev)?
 *                           Zo niet, dan zijn lagere tellers gewoon achterstand — een vers
 *                           tweede toestel begint nu eenmaal op nul — en mag daar niet op
 *                           afgerekend worden; het samenvoegen neemt toch het maximum.
 * @return string|null        null = in orde; anders de reden, in het Nederlands, voor het logboek
 */
function keurStaat(array $client, array $server, int $secondenSindsSync, ?string $nu = null,
                   bool $clientIsBij = true): ?string {
  $nu ??= gmdate('Y-m-d\TH:i:s.v\Z');
  $grens = strtotime($nu) + VERBA_TOEKOMST_MARGE;

  if (($client['app'] ?? 'verba') !== 'verba')  return 'staat is niet van VERBA';
  if ((int) ($client['version'] ?? 1) !== 1)    return 'onbekende saveversie';

  $items = $client['items'] ?? [];
  if (!is_array($items)) return 'items is geen object';
  if (count($items) > VERBA_MAX_ITEMS)
    return 'te veel leeritems: ' . count($items) . ' (maximum ' . VERBA_MAX_ITEMS . ')';

  foreach ($items as $sleutel => $it) {
    if (!is_string($sleutel) || preg_match('/^\d+:(L2N|L2V)$/', $sleutel) !== 1)
      return 'ongeldige itemsleutel: ' . substr((string) $sleutel, 0, 20);
    if (!is_array($it)) return "item $sleutel is geen object";
    $box = $it['box'] ?? 0;
    if (!is_numeric($box) || $box < 0 || $box > 5)
      return "box buiten 0–5 bij $sleutel: " . substr((string) $box, 0, 10);
    $t = $it['laatstGezien'] ?? null;
    if (is_string($t) && $t !== '' && strtotime($t) > $grens)
      return "tijdstempel in de toekomst bij $sleutel: $t";
  }

  $cProfiel = is_array($client['profiel'] ?? null) ? $client['profiel'] : [];
  $sProfiel = is_array($server['profiel'] ?? null) ? $server['profiel'] : [];

  // Een import in een LEEG account is een MIGRATIE, geen groei (§13.2): wie al maanden
  // offline leerde, brengt in één keer een volle save mee. Die aan een groei-per-uur meten
  // zou precies de bestaande gebruiker buitensluiten. Vorm, sleutels, boxen en tijdstempels
  // zijn hierboven wél al gecontroleerd, en de import komt met omvang in het logboek.
  //
  // Niet "is er al eens gesynct?" maar "staat er al iets?": één toestel dat zich aanmeldt
  // zonder voortgang schrijft anders een lege staat weg, en de échte save van datzelfde
  // kind wordt daarna als onmogelijke groei geweigerd.
  $serverLeeg = empty($server['items']) && (($sProfiel['xp'] ?? 0) + 0) <= 0
                                        && (($sProfiel['totaalRondes'] ?? 0) + 0) <= 0;
  $eersteSync = $sProfiel === [] || $serverLeeg;
  foreach (['xp','totaalJuist','totaalFout','totaalRondes','totaleTijdMs'] as $veld) {
    $w = $cProfiel[$veld] ?? 0;
    if (!is_numeric($w) || $w < 0) return "profiel.$veld is geen positief getal";
  }

  // Tellers mogen niet dalen: dat wijst op geknoei of op een teruggedraaide save.
  if ($eersteSync || !$clientIsBij) return null;

  foreach (['xp','totaalJuist','totaalFout','totaalRondes'] as $veld) {
    if (($cProfiel[$veld] ?? 0) + 0 < ($sProfiel[$veld] ?? 0) + 0 - 0.001)
      return "profiel.$veld daalt van " . ($sProfiel[$veld] ?? 0) . ' naar ' . ($cProfiel[$veld] ?? 0);
  }

  $vragen = (($cProfiel['totaalJuist'] ?? 0) + ($cProfiel['totaalFout'] ?? 0))
          - (($sProfiel['totaalJuist'] ?? 0) + ($sProfiel['totaalFout'] ?? 0));
  if ($vragen > VERBA_MAX_VRAGEN_SYNC)
    return "$vragen beantwoorde vragen in één sync (maximum " . VERBA_MAX_VRAGEN_SYNC . ')';

  $xp = ($cProfiel['xp'] ?? 0) - ($sProfiel['xp'] ?? 0);
  $venster = max($secondenSindsSync, VERBA_MIN_VENSTER_SEC);
  $toegestaan = VERBA_MAX_XP_PER_UUR * $venster / 3600;
  if ($xp > $toegestaan)
    return sprintf('%d XP in %d minuten, boven de grens van %d XP per uur',
                   (int) $xp, (int) round($venster / 60), VERBA_MAX_XP_PER_UUR);

  return null;
}

/** De omvangcontrole gebeurt vóór het JSON-parsen: een payload van 50 MB mag nooit eerst
 *  gedecodeerd worden om daarna pas geweigerd te worden. */
function keurOmvang(string $ruw): ?string {
  $n = strlen($ruw);
  if ($n > VERBA_MAX_PAYLOAD)
    return 'payload van ' . round($n / 1024) . ' KB (maximum ' . (VERBA_MAX_PAYLOAD / 1024) . ' KB)';
  return null;
}
