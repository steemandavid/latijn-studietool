<?php
declare(strict_types=1);
/* Beheer — alleen voor de beheerder (§13.2, §13.7). Aparte sleutel, niet het token van
 * een leerling: geen enkele leerling kan hier ooit bij, ook niet met een geldig account. */

const VERBA_CODE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // zonder O/0 en I/1

function eisBeheerder(): void {
  $sleutel = $_SERVER['HTTP_X_BEHEER_SLEUTEL'] ?? '';
  $hash = (string) (conf()['beheer_hash'] ?? '');
  $teller = 'beheer:' . ipHash();
  if (!magNog($teller, 20, 900)) antwoordFout('te veel mislukte pogingen — wacht een kwartier', 429);
  if ($hash === '' || !is_string($sleutel) || !password_verify($sleutel, $hash)) {
    usleep(400000);
    antwoordFout('geen toegang', 403);
  }
  // De teller remt het RADEN van de sleutel af, niet het gebruik ervan: wie binnen is,
  // mag werken. Anders legt een beheerpagina die wat vaker ververst zichzelf plat.
  vergeetPogingen($teller);
}

function maakJoincode(): string {
  $c = '';
  for ($i = 0; $i < 8; $i++) $c .= VERBA_CODE_LETTERS[random_int(0, strlen(VERBA_CODE_LETTERS) - 1)];
  return $c;
}

function beheerRoute(string $wat, array $in): never {
  eisBeheerder();
  $pdo = db();

  switch ($wat) {
    case 'klas':                                   // POST — nieuwe klas + joincode
      $naam = trim((string) ($in['naam'] ?? ''));
      if ($naam === '' || mb_strlen($naam) > 80) antwoordFout('geef de klas een naam');
      $code = maakJoincode();
      $pdo->prepare('INSERT INTO klassen (naam, joincode_hash) VALUES (?, ?)')
          ->execute([$naam, joincodeHash($code)]);
      $id = (int) $pdo->lastInsertId();
      logboek($id, null, 'beheer', 'klas-nieuw', sprintf('klas "%s" aangemaakt', $naam));
      // De code zelf staat nergens opgeslagen — alleen de hash. Nu opschrijven of nooit.
      antwoord(['klas' => $id, 'naam' => $naam, 'joincode' => $code], 201);

    case 'klassen':                                // GET — overzicht
      $rijen = $pdo->query('SELECT k.id, k.naam, k.actief, k.aangemaakt,
                                   COUNT(l.id) AS leerlingen
                            FROM klassen k LEFT JOIN leerlingen l ON l.klas_id = k.id
                            GROUP BY k.id ORDER BY k.id')->fetchAll();
      antwoord(['klassen' => $rijen]);

    case 'leerlingen':                             // GET — wie zit waar (voor beheer, §13.8)
      $st = $pdo->prepare('SELECT l.id, l.naam, l.klas_id, l.aangemaakt, l.laatste_sync, l.rev
                           FROM leerlingen l WHERE (? = 0 OR l.klas_id = ?) ORDER BY l.klas_id, l.naam');
      $klas = (int) ($_GET['klas'] ?? 0);
      $st->execute([$klas, $klas]);
      antwoord(['leerlingen' => $st->fetchAll()]);

    case 'hernoem':                                // POST — klas een andere naam geven
      $klas = (int) ($in['klas'] ?? 0);
      $naam = trim((string) ($in['naam'] ?? ''));
      if ($naam === '' || mb_strlen($naam) > 80) antwoordFout('geef de klas een naam');
      $st = $pdo->prepare('SELECT naam FROM klassen WHERE id = ?'); $st->execute([$klas]);
      if (!$oud = $st->fetchColumn()) antwoordFout('die klas bestaat niet', 404);
      $pdo->prepare('UPDATE klassen SET naam = ? WHERE id = ?')->execute([$naam, $klas]);
      logboek($klas, null, 'beheer', 'klas-hernoemd',
              sprintf('klas "%s" heet voortaan "%s"', $oud, $naam));
      antwoord(['ok' => true, 'was' => $oud, 'nu' => $naam]);

    case 'code':                                   // POST — een eigen joincode instellen
      $klas = (int) ($in['klas'] ?? 0);
      $code = ($in['code'] ?? '') === '' ? maakJoincode()
                                         : normaliseerJoincode((string) $in['code']);
      if (strlen($code) < 4 || strlen($code) > 16)
        antwoordFout('een joincode is 4 tot 16 letters of cijfers');
      $st = $pdo->prepare('SELECT naam FROM klassen WHERE id = ?'); $st->execute([$klas]);
      if (!$naam = $st->fetchColumn()) antwoordFout('die klas bestaat niet', 404);
      // Een korte code is makkelijker door te geven maar ook makkelijker te raden; de
      // limiet op joincode-pogingen per IP (§13.6) is wat hem beschermt.
      $st = $pdo->prepare('SELECT id FROM klassen WHERE joincode_hash = ? AND id <> ?');
      $st->execute([joincodeHash($code), $klas]);
      if ($st->fetch()) antwoordFout('die code is al in gebruik bij een andere klas', 409);
      $pdo->prepare('UPDATE klassen SET joincode_hash = ?, actief = 1 WHERE id = ?')
          ->execute([joincodeHash($code), $klas]);
      logboek($klas, null, 'beheer', 'code-gewijzigd',
              sprintf('joincode van klas "%s" gewijzigd — de vorige werkt niet meer', $naam));
      antwoord(['ok' => true, 'klas' => $naam, 'joincode' => $code]);

    case 'intrekken':                              // POST — joincode onbruikbaar maken
      $klas = (int) ($in['klas'] ?? 0);
      $pdo->prepare('UPDATE klassen SET actief = 0 WHERE id = ?')->execute([$klas]);
      logboek($klas, null, 'beheer', 'code-ingetrokken', 'joincode ingetrokken');
      antwoord(['ok' => true]);

    case 'pin':                                    // POST — PIN opnieuw instellen
      $leerling = (int) ($in['leerling'] ?? 0);
      $pin = (string) ($in['pin'] ?? '');
      if ($f = keurPin($pin)) antwoordFout($f);
      $st = $pdo->prepare('SELECT * FROM leerlingen WHERE id = ?');
      $st->execute([$leerling]);
      if (!$r = $st->fetch()) antwoordFout('die leerling bestaat niet', 404);
      $pdo->prepare('UPDATE leerlingen SET pin_hash = ? WHERE id = ?')
          ->execute([password_hash($pin, PASSWORD_ARGON2ID), $leerling]);
      $pdo->prepare('DELETE FROM sessies WHERE leerling_id = ?')->execute([$leerling]);
      logboek((int) $r['klas_id'], null, 'beheer', 'pin-reset',
              sprintf('PIN gereset voor %s (alle toestellen afgemeld)', $r['naam']));
      antwoord(['ok' => true]);

    case 'verplaats':                              // POST — leerling naar een andere klas
      $leerling = (int) ($in['leerling'] ?? 0);
      $klas = (int) ($in['klas'] ?? 0);
      $st = $pdo->prepare('SELECT * FROM leerlingen WHERE id = ?'); $st->execute([$leerling]);
      if (!$r = $st->fetch()) antwoordFout('die leerling bestaat niet', 404);
      $pdo->prepare('UPDATE leerlingen SET klas_id = ? WHERE id = ?')->execute([$klas, $leerling]);
      logboek($klas, $leerling, $r['naam'], 'verplaatst',
              sprintf('verplaatst van klas %d naar klas %d', (int) $r['klas_id'], $klas));
      antwoord(['ok' => true]);

    case 'wissen':                                 // POST — account echt verwijderen (§13.8)
      $leerling = (int) ($in['leerling'] ?? 0);
      $st = $pdo->prepare('SELECT * FROM leerlingen WHERE id = ?'); $st->execute([$leerling]);
      if (!$r = $st->fetch()) antwoordFout('die leerling bestaat niet', 404);
      // Staat, sessies en logregels gaan mee: wissen is wissen (§13.7, §13.8).
      $pdo->prepare('DELETE FROM gebeurtenissen WHERE leerling_id = ?')->execute([$leerling]);
      $pdo->prepare('DELETE FROM leerlingen WHERE id = ?')->execute([$leerling]);
      logboek((int) $r['klas_id'], null, 'beheer', 'account-gewist',
              sprintf('account van %s verwijderd, met voortgang en logboek', $r['naam']));
      antwoord(['ok' => true]);

    case 'klas-wissen':                            // POST — klas + alles erin verwijderen
      $klas = (int) ($in['klas'] ?? 0);
      $st = $pdo->prepare('SELECT naam FROM klassen WHERE id = ?'); $st->execute([$klas]);
      if (!$naam = $st->fetchColumn()) antwoordFout('die klas bestaat niet', 404);
      $pdo->prepare('DELETE FROM gebeurtenissen WHERE klas_id = ?')->execute([$klas]);
      $pdo->prepare('DELETE FROM klassen WHERE id = ?')->execute([$klas]);   // leerlingen volgen via CASCADE
      antwoord(['ok' => true, 'klas' => $naam]);

    case 'logboek':                                // GET — het leesbare logboek (§13.7)
      $waar = []; $args = [];
      if (!empty($_GET['klas']))     { $waar[] = 'klas_id = ?';     $args[] = (int) $_GET['klas']; }
      if (!empty($_GET['leerling'])) { $waar[] = 'leerling_id = ?'; $args[] = (int) $_GET['leerling']; }
      if (!empty($_GET['dag']))      { $waar[] = 'DATE(tijd) = ?';  $args[] = (string) $_GET['dag']; }
      $sql = 'SELECT tijd, naam, soort, zin, cijfers, klas_id, leerling_id FROM gebeurtenissen'
           . ($waar ? ' WHERE ' . implode(' AND ', $waar) : '')
           . ' ORDER BY tijd DESC, id DESC LIMIT ' . min(2000, max(1, (int) ($_GET['aantal'] ?? 500)));
      $st = $pdo->prepare($sql); $st->execute($args);
      $rijen = $st->fetchAll();
      foreach ($rijen as &$r) {                      // cijfers als object, niet als tekst
        $r['cijfers'] = $r['cijfers'] ? json_decode((string) $r['cijfers'], true) : null;
      }
      unset($r);

      if (($_GET['formaat'] ?? '') === 'tekst') {    // downloadbare platte tekst
        http_response_code(200);
        header('Content-Type: text/plain; charset=utf-8');
        header('Cache-Control: no-store');
        header('Content-Disposition: attachment; filename="verba-logboek-' . date('Y-m-d') . '.txt"');
        foreach (array_reverse($rijen) as $r) echo logregel($r), "\n";
        exit;
      }
      antwoord(['logboek' => $rijen]);

    default:
      antwoordFout('onbekende beheeractie', 404);
  }
}
