<?php
declare(strict_types=1);
/* Eenheidstests voor server/grenzen.php — aanvaardingscriterium §11.38.
 *     php test/grenzen-test.php      (groen = exit 0)
 */
require __DIR__ . '/../server/grenzen.php';

$geslaagd = 0; $gefaald = 0;
function check(string $wat, mixed $gekregen, mixed $verwacht): void {
  global $geslaagd, $gefaald;
  $ok = ($verwacht === null) ? ($gekregen === null)
      : (is_string($gekregen) && str_contains($gekregen, $verwacht));
  if ($ok) { $geslaagd++; return; }
  $gefaald++;
  fwrite(STDERR, "FOUT  $wat\n      verwacht: " . var_export($verwacht, true)
                . "\n      gekregen: " . var_export($gekregen, true) . "\n");
}
$NU = '2026-09-20T20:00:00.000Z';
$item = fn($box = 3, $t = '2026-09-20T19:00:00.000Z') =>
  ['box'=>$box, 'juist'=>1, 'fout'=>0, 'laatstGezien'=>$t, 'vragenSindsdien'=>0, 'mcSinds'=>0];
$server = ['profiel' => ['xp'=>1000, 'totaalJuist'=>100, 'totaalFout'=>20, 'totaalRondes'=>10]];
$goed   = ['app'=>'verba','version'=>1,
           'profiel'=>['xp'=>1100,'totaalJuist'=>110,'totaalFout'=>22,'totaalRondes'=>11],
           'items'=>['2:L2N'=>$item()]];

/* ---- een gewone ronde gaat gewoon door ---- */
check('normale sync wordt aanvaard', keurStaat($goed, $server, 900, $NU), null);
/* De eerste sync is een migratie van een bestaande offline save (§13.2): een volle
   save in één keer, die niet aan een groei-per-uur gemeten mag worden. */
check('eerste sync op een lege server', keurStaat($goed, [], 0, $NU), null);
$volleSave = ['app'=>'verba','version'=>1,
              'profiel'=>['xp'=>48200,'totaalJuist'=>4120,'totaalFout'=>880,'totaalRondes'=>340],
              'items'=>['2:L2N'=>$item()]];
check('migratie van een volle save wordt aanvaard', keurStaat($volleSave, [], 0, $NU), null);
check('diezelfde sprong op een bestaand account niet',   // de vragenteller slaat als eerste aan
      keurStaat($volleSave, $server, 180, $NU), 'beantwoorde vragen in één sync');

/* ---- app-marker en versie ---- */
check('save van een andere app',
      keurStaat(['app'=>'fluo'] + $goed, $server, 900, $NU), 'niet van VERBA');
check('onbekende saveversie',
      keurStaat(['version'=>7] + $goed, $server, 900, $NU), 'onbekende saveversie');

/* ---- items ---- */
check('itemsleutel die nergens op slaat',
      keurStaat(['items'=>['kapot'=>$item()]] + $goed, $server, 900, $NU), 'ongeldige itemsleutel');
check('richting die niet bestaat',
      keurStaat(['items'=>['3:N2L'=>$item()]] + $goed, $server, 900, $NU), 'ongeldige itemsleutel');
check('box boven 5',
      keurStaat(['items'=>['3:L2N'=>$item(9)]] + $goed, $server, 900, $NU), 'box buiten 0–5');
check('box negatief',
      keurStaat(['items'=>['3:L2N'=>$item(-1)]] + $goed, $server, 900, $NU), 'box buiten 0–5');
check('tijdstempel in de toekomst',
      keurStaat(['items'=>['3:L2N'=>$item(3,'2027-01-01T00:00:00.000Z')]] + $goed, $server, 900, $NU),
      'in de toekomst');
check('klok die een paar minuten voorloopt mag wel',
      keurStaat(['items'=>['3:L2N'=>$item(3,'2026-09-20T20:03:00.000Z')]] + $goed, $server, 900, $NU), null);

$veel = [];
for ($i = 1; $i <= 1807; $i++) $veel["$i:L2N"] = $item();
check('meer items dan er leeritems bestaan',
      keurStaat(['items'=>$veel] + $goed, $server, 900, $NU), 'te veel leeritems');

/* ---- tellers mogen niet dalen ---- */
check('xp die daalt',
      keurStaat(['profiel'=>['xp'=>500,'totaalJuist'=>110,'totaalFout'=>22,'totaalRondes'=>11]] + $goed,
                $server, 900, $NU), 'profiel.xp daalt');
check('totaalRondes die daalt',
      keurStaat(['profiel'=>['xp'=>1100,'totaalJuist'=>110,'totaalFout'=>22,'totaalRondes'=>2]] + $goed,
                $server, 900, $NU), 'profiel.totaalRondes daalt');
check('negatieve xp',
      keurStaat(['profiel'=>['xp'=>-5]] + $goed, $server, 900, $NU), 'geen positief getal');

/* Een leeg account is een leeg account, ook als er al eens een lege staat weggeschreven is:
   anders blokkeert één aanmelding zonder voortgang de echte migratie van datzelfde kind. */
$legeServer = ['profiel'=>['xp'=>0,'totaalJuist'=>0,'totaalFout'=>0,'totaalRondes'=>0], 'items'=>[]];
check('migratie in een account waar al een lege staat staat',
      keurStaat($volleSave, $legeServer, 60, $NU), null);

/* Een toestel dat achterloopt (of net is aangemeld) heeft lagere tellers: dat is
   achterstand, geen geknoei. Het samenvoegen neemt toch het maximum. */
$vers = ['app'=>'verba','version'=>1,
         'profiel'=>['xp'=>0,'totaalJuist'=>0,'totaalFout'=>0,'totaalRondes'=>0], 'items'=>[]];
check('vers tweede toestel met nullen wordt aanvaard',
      keurStaat($vers, $server, 900, $NU, false), null);
check('dezelfde nullen van een toestel dat bij is, niet',
      keurStaat($vers, $server, 900, $NU, true), 'profiel.xp daalt');

/* ---- de twee snelheidsgrenzen ---- */
check('300 vragen in één sync mag nog',
      keurStaat(['profiel'=>['xp'=>1100,'totaalJuist'=>400,'totaalFout'=>20,'totaalRondes'=>11]] + $goed,
                $server, 3600, $NU), null);
check('meer dan 300 vragen in één sync',
      keurStaat(['profiel'=>['xp'=>1100,'totaalJuist'=>500,'totaalFout'=>20,'totaalRondes'=>11]] + $goed,
                $server, 3600, $NU), 'beantwoorde vragen in één sync');
check('4200 XP in drie minuten',
      keurStaat(['profiel'=>['xp'=>5200,'totaalJuist'=>110,'totaalFout'=>22,'totaalRondes'=>11]] + $goed,
                $server, 180, $NU), 'boven de grens van 6000 XP per uur');
check('diezelfde XP over een hele avond mag wel',
      keurStaat(['profiel'=>['xp'=>5200,'totaalJuist'=>110,'totaalFout'=>22,'totaalRondes'=>11]] + $goed,
                $server, 4 * 3600, $NU), null);

/* ---- omvang ---- */
check('payload binnen de grens', keurOmvang(str_repeat('a', 400 * 1024)), null);
check('payload van een halve MB te groot', keurOmvang(str_repeat('a', 600 * 1024)), 'payload van 600 KB');

printf("\n%d geslaagd, %d gefaald\n", $geslaagd, $gefaald);
exit($gefaald === 0 ? 0 : 1);
