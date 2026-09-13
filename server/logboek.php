<?php
declare(strict_types=1);
/* Het logboek van §13.7: van elke speler elke actie, in leesbaar Nederlands.
 *
 * Harde regel: het logboek mag de app NOOIT ophouden. Faalt het wegschrijven, dan gaat
 * de sync gewoon door — een logboek dat een leerling kan blokkeren is erger dan een gat
 * in het logboek.
 */

function logboek(?int $klasId, ?int $leerlingId, string $naam, string $soort,
                 string $zin, array $cijfers = []): bool {
  try {
    db()->prepare('INSERT INTO gebeurtenissen (klas_id, leerling_id, naam, soort, zin, cijfers, ip_hash)
                   VALUES (?, ?, ?, ?, ?, ?, ?)')
        ->execute([$klasId, $leerlingId, mb_substr($naam, 0, 40), mb_substr($soort, 0, 32),
                   mb_substr($zin, 0, 500),
                   $cijfers ? json_encode($cijfers, JSON_UNESCAPED_UNICODE) : null, ipHash()]);
    return true;
  } catch (Throwable $e) {
    error_log('VERBA logboek faalde: ' . $e->getMessage());
    return false;
  }
}

/** Dezelfde regel als in de beheerpagina, maar als platte tekst (§13.7, download). */
function logregel(array $r): string {
  return sprintf('%s  %-8s %s', substr((string) $r['tijd'], 0, 16), $r['naam'], $r['zin']);
}

/** Ouder dan een schooljaar verdwijnt vanzelf (§13.7). Wordt bij elke sync eens op de
 *  zoveel keer aangeroepen; een apart cron-script heeft deze hosting niet nodig. */
function snoeiLogboek(): void {
  try {
    if (random_int(1, 200) !== 1) return;
    db()->exec('DELETE FROM gebeurtenissen WHERE tijd < DATE_SUB(NOW(), INTERVAL 12 MONTH)');
  } catch (Throwable $e) { /* stilzwijgend: zie de harde regel hierboven */ }
}

/* De zinnen worden op de SERVER samengesteld uit een vaste lijst, nooit overgenomen van
 * het toestel: anders schrijft een leerling zijn eigen regels in het logboek — en de
 * beheerpagina toont ze. De client stuurt dus alleen een soort en wat cijfers. */
function zinVoor(string $soort, array $c): ?string {
  $n = fn(string $v, int $max = 99999) => max(0, min($max, (int) ($c[$v] ?? 0)));
  $tekst = fn(string $v) => mb_substr(preg_replace('/[^\p{L}\p{N} .:\'\-]/u', '',
                                      (string) ($c[$v] ?? '')) ?? '', 0, 40);
  return match ($soort) {
    'ronde'   => sprintf('ronde afgerond — %d vragen, %d juist, +%d XP, %d woorden een box hoger',
                         $n('vragen', 100), $n('juist', 100), $n('xp', 9999), $n('omhoog', 100)),
    'blitz'   => sprintf('blitz gespeeld — %d juist in 60 seconden', $n('juist', 200)),
    'badge'   => 'badge verdiend: '   . ($tekst('wat') ?: '?'),
    'tessera' => 'tessera vrijgespeeld: ' . ($tekst('wat') ?: '?'),
    'sectie'  => sprintf('sectie %s veroverd — %d van de %d juist',
                         $tekst('wat') ?: '?', $n('juist', 100), $n('vragen', 100)),
    'examen'  => sprintf('examen afgelegd — %d van de %d juist', $n('juist', 999), $n('vragen', 999)),
    default   => null,
  };
}
