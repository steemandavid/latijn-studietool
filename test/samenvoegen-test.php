<?php
declare(strict_types=1);
/* Eenheidstests voor server/samenvoegen.php — aanvaardingscriterium §11.37.
 *
 * Elke regel uit de tabel van §13.5 apart, met de nadruk op de gevallen die bij
 * "laatste schrijver wint" stil data zouden wissen.
 *
 *     php test/samenvoegen-test.php      (groen = exit 0)
 */
require __DIR__ . '/../server/samenvoegen.php';

$geslaagd = 0; $gefaald = 0;
function check(string $wat, mixed $gekregen, mixed $verwacht): void {
  global $geslaagd, $gefaald;
  if ($gekregen === $verwacht) { $geslaagd++; return; }
  $gefaald++;
  fwrite(STDERR, "FOUT  $wat\n      verwacht: " . json_encode($verwacht, JSON_UNESCAPED_UNICODE)
                . "\n      gekregen: " . json_encode($gekregen, JSON_UNESCAPED_UNICODE) . "\n");
}
$NU = '2026-09-20T20:00:00.000Z';
$item = fn(int $box, int $j, int $f, string $t) =>
  ['box'=>$box, 'juist'=>$j, 'fout'=>$f, 'laatstGezien'=>$t, 'vragenSindsdien'=>0, 'mcSinds'=>0];

/* ---- 1. items: de nieuwste kant zet de box, tellers nemen het maximum ---- */
$r = voegSamen(
  ['items' => ['2:L2N' => $item(4, 7, 1, '2026-09-19T10:00:00.000Z')]],
  ['items' => ['2:L2N' => $item(2, 3, 5, '2026-09-20T10:00:00.000Z')]], $NU);
check('1a box van de nieuwste kant',      $r['items']['2:L2N']['box'], 2);
check('1b juist = maximum',               $r['items']['2:L2N']['juist'], 7);
check('1c fout = maximum',                $r['items']['2:L2N']['fout'], 5);
check('1d laatstGezien = de nieuwste',    $r['items']['2:L2N']['laatstGezien'], '2026-09-20T10:00:00.000Z');

/* omgekeerde volgorde: dezelfde uitkomst (samenvoegen is niet volgorde-afhankelijk) */
$r2 = voegSamen(
  ['items' => ['2:L2N' => $item(2, 3, 5, '2026-09-20T10:00:00.000Z')]],
  ['items' => ['2:L2N' => $item(4, 7, 1, '2026-09-19T10:00:00.000Z')]], $NU);
check('1e omgekeerd samengevoegd is gelijk', $r2['items'], $r['items']);

/* ---- 2. een item dat maar één kant kent, overleeft ---- */
$r = voegSamen(
  ['items' => ['5:L2N' => $item(3, 2, 0, '2026-09-19T10:00:00.000Z')]],
  ['items' => ['9:L2V' => $item(1, 1, 1, '2026-09-20T10:00:00.000Z')]], $NU);
check('2a server-item blijft', $r['items']['5:L2N']['box'], 3);
check('2b client-item komt erbij', $r['items']['9:L2V']['box'], 1);
check('2c niets extra verzonnen', count($r['items']), 2);

/* ---- 3. profiel: monotone tellers gaan alleen omhoog ---- */
$r = voegSamen(
  ['profiel' => ['xp'=>4820, 'besteCombo'=>17, 'blitzRecord'=>23, 'totaalJuist'=>412, 'totaleTijdMs'=>4820000]],
  ['profiel' => ['xp'=>3000, 'besteCombo'=>21, 'blitzRecord'=>9,  'totaalJuist'=>500, 'totaleTijdMs'=>10]], $NU);
check('3a xp max',           $r['profiel']['xp'], 4820);
check('3b besteCombo max',   $r['profiel']['besteCombo'], 21);
check('3c blitzRecord max',  $r['profiel']['blitzRecord'], 23);
check('3d totaalJuist max',  $r['profiel']['totaalJuist'], 500);
check('3e totaleTijdMs max', $r['profiel']['totaleTijdMs'], 4820000);

/* ---- 4. dagstreak: vereniging van de dagen, streak herberekend ---- */
$r = voegSamen(
  ['profiel' => ['streak'=>1, 'streakGeschiedenis'=>['2026-09-18','2026-09-19']]],
  ['profiel' => ['streak'=>1, 'streakGeschiedenis'=>['2026-09-20']]], $NU);
check('4a drie opeenvolgende dagen = streak 3', $r['profiel']['streak'], 3);
check('4b laatste actieve dag',                 $r['profiel']['laatsteActieveDag'], '2026-09-20');
check('4c geschiedenis samengevoegd',           $r['profiel']['streakGeschiedenis'],
      ['2026-09-18','2026-09-19','2026-09-20']);

$r = voegSamen(  // een gat in de reeks zet de streak terug, ook al zijn er meer dagen
  ['profiel' => ['streak'=>9, 'streakGeschiedenis'=>['2026-09-10','2026-09-11','2026-09-12']]],
  ['profiel' => ['streak'=>9, 'streakGeschiedenis'=>['2026-09-20']]], $NU);
check('4d gat in de reeks → streak 1', $r['profiel']['streak'], 1);

/* ---- 5. badges en tesserae: vereniging, vroegste tijdstempel wint ---- */
$r = voegSamen(
  ['badges' => ['primus-gradus'=>'2026-09-01T19:12:00.000Z', 'oud'=>'2026-09-02T10:00:00.000Z']],
  ['badges' => ['primus-gradus'=>'2026-09-05T08:00:00.000Z', 'nieuw'=>'2026-09-06T10:00:00.000Z']], $NU);
check('5a vroegste tijdstempel wint', $r['badges']['primus-gradus'], '2026-09-01T19:12:00.000Z');
check('5b beide kanten behouden',     array_keys($r['badges']), ['nieuw','oud','primus-gradus']);

/* ---- 6. secties: veroverd is een OR, scores het maximum ---- */
$r = voegSamen(
  ['secties' => ['1.0/3' => ['veroverd'=>true,  'besteScore'=>22, 'pogingen'=>2]]],
  ['secties' => ['1.0/3' => ['veroverd'=>false, 'besteScore'=>25, 'pogingen'=>1]]], $NU);
check('6a veroverd blijft veroverd', $r['secties']['1.0/3']['veroverd'], true);
check('6b besteScore max',           $r['secties']['1.0/3']['besteScore'], 25);
check('6c pogingen max',             $r['secties']['1.0/3']['pogingen'], 2);

/* ---- 7. examen ---- */
$r = voegSamen(['examen' => ['gehaald'=>true, 'besteScore'=>54]],
               ['examen' => ['gehaald'=>false,'besteScore'=>58]], $NU);
check('7a gehaald blijft gehaald', $r['examen']['gehaald'], true);
check('7b besteScore max',         $r['examen']['besteScore'], 58);

/* ---- 8. instellingen: laatste schrijver wint, maar afwezig ≠ leeg ---- */
$r = voegSamen(['settings' => ['rondelengte'=>15, 'strengheid'=>'soepel']],
               ['settings' => ['rondelengte'=>20, 'strengheid'=>'streng']], $NU);
check('8a client-instellingen winnen', $r['settings']['rondelengte'], 20);
$r = voegSamen(['settings' => ['rondelengte'=>15]], ['profiel' => ['xp'=>1]], $NU);
check('8b zonder instellingen blijft de server staan', $r['settings']['rondelengte'], 15);

/* ---- 9. momentopnames komen van de kant die het laatst speelde ---- */
$r = voegSamen(
  ['profiel'=>['combo'=>12,'tempo'=>0.9], 'items'=>['1:L2N'=>$item(3,1,0,'2026-09-18T10:00:00.000Z')]],
  ['profiel'=>['combo'=>3, 'tempo'=>0.4], 'items'=>['1:L2N'=>$item(3,1,0,'2026-09-20T10:00:00.000Z')]], $NU);
check('9a combo van de nieuwste kant', $r['profiel']['combo'], 3);
check('9b tempo van de nieuwste kant', $r['profiel']['tempo'], 0.4);

/* ---- 10. HET GEVAL WAAROM DIT BESTAAT ----------------------------------
 * Twee toestellen spelen elk offline een ronde. Na het samenvoegen moeten BEIDE
 * rondes erin zitten. Bij "laatste schrijver wint" zou er hier één verdwijnen. */
$laptop = ['profiel'=>['xp'=>1000,'totaalJuist'=>100,'totaalRondes'=>10,
                       'streakGeschiedenis'=>['2026-09-19']],
           'items'=>['1:L2N'=>$item(3,5,0,'2026-09-19T20:00:00.000Z'),
                     '2:L2N'=>$item(2,2,1,'2026-09-19T20:01:00.000Z')],
           'badges'=>['primus-gradus'=>'2026-09-19T20:00:00.000Z']];
$tablet = ['profiel'=>['xp'=>1150,'totaalJuist'=>115,'totaalRondes'=>11,
                       'streakGeschiedenis'=>['2026-09-20']],
           'items'=>['3:L2V'=>$item(1,1,0,'2026-09-20T19:00:00.000Z'),
                     '2:L2N'=>$item(3,4,1,'2026-09-20T19:05:00.000Z')],
           'tesserae'=>['lupa'=>'2026-09-20T19:00:00.000Z']];
$r = voegSamen($laptop, $tablet, $NU);
check('10a de laptop-ronde overleeft',        isset($r['items']['1:L2N']), true);
check('10b de tablet-ronde overleeft',        isset($r['items']['3:L2V']), true);
check('10c het gedeelde item staat vooruit',  $r['items']['2:L2N']['box'], 3);
check('10d de badge van de laptop blijft',    isset($r['badges']['primus-gradus']), true);
check('10e de tessera van de tablet blijft',  isset($r['tesserae']['lupa']), true);
check('10f xp is de hoogste, niet de laatste',$r['profiel']['xp'], 1150);
check('10g beide dagen tellen voor de streak',$r['profiel']['streak'], 2);

/* ---- 11. een toestel met een klok in de toekomst wint niet ---- */
$r = voegSamen(
  ['items' => ['4:L2N' => $item(5, 9, 0, '2026-09-20T10:00:00.000Z')]],
  ['items' => ['4:L2N' => $item(0, 0, 9, '2027-01-01T00:00:00.000Z')]], $NU);
check('11a toekomstige tijd geklemd op nu', $r['items']['4:L2N']['laatstGezien'], $NU);
check('11b juist-teller blijft behouden',   $r['items']['4:L2N']['juist'], 9);

/* ---- 12. rommel en lege invoer mogen nooit crashen ---- */
$r = voegSamen([], [], $NU);
check('12a leeg + leeg geeft een geldige staat', [$r['app'], $r['version'], $r['items']], ['verba', 1, []]);
$r = voegSamen(['items'=>'geen object', 'profiel'=>42],
               ['items'=>['9:L2N'=>'kapot', '  ' => null], 'badges'=>['x'=>123]], $NU);
check('12b rommel wordt genegeerd, niet gevolgd', $r['items']['9:L2N']['box'], 0);
check('12c badge met een niet-tekst tijd valt weg', $r['badges'], []);
check('12d box wordt geklemd op 0..5',
      voegSamen([], ['items'=>['1:L2N'=>$item(99, 0, 0, $NU)]], $NU)['items']['1:L2N']['box'], 5);

/* ---- 13. de server als vertrekpunt: een lege server neemt de client over ---- */
$r = voegSamen([], $laptop, $NU);
check('13a eerste sync behoudt alles', [count($r['items']), $r['profiel']['xp']], [2, 1000]);

printf("\n%d geslaagd, %d gefaald\n", $geslaagd, $gefaald);
exit($gefaald === 0 ? 0 : 1);
