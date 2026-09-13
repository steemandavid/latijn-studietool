<?php
declare(strict_types=1);
/* Accounts: klascode + naam + PIN (§13.2). Geen e-mail, geen OAuth, geen herstel per mail. */

const VERBA_TOKEN_BYTES = 32;

function normaliseerJoincode(string $code): string {
  return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code) ?? '');
}
function joincodeHash(string $code): string {
  return hash_hmac('sha256', normaliseerJoincode($code), (string) (conf()['peper'] ?? ''));
}
function naamSleutel(string $naam): string {
  return mb_strtolower(trim(preg_replace('/\s+/u', ' ', $naam) ?? ''));
}

/** Een bijnaam, geen persoonsgegeven (§13.8): letters, cijfers, spatie, streepje, apostrof. */
function keurNaam(string $naam): ?string {
  $naam = trim($naam);
  $n = mb_strlen($naam);
  if ($n < 2 || $n > 20) return 'kies een naam van 2 tot 20 tekens';
  if (preg_match("/^[\p{L}\p{N} '\-]+$/u", $naam) !== 1)
    return 'gebruik alleen letters, cijfers, spaties, - en \'';
  return null;
}
function keurPin(string $pin): ?string {
  return preg_match('/^\d{4}$/', $pin) === 1 ? null : 'de PIN is precies 4 cijfers';
}

function zoekKlas(string $joincode): ?array {
  $st = db()->prepare('SELECT * FROM klassen WHERE joincode_hash = ? AND actief = 1');
  $st->execute([joincodeHash($joincode)]);
  return $st->fetch() ?: null;
}

function maakToken(int $leerlingId): string {
  $token = bin2hex(random_bytes(VERBA_TOKEN_BYTES));
  db()->prepare('INSERT INTO sessies (token_hash, leerling_id, laatst_gezien) VALUES (?, ?, NOW())')
      ->execute([hash('sha256', $token), $leerlingId]);
  return $token;                                    // alleen de hash blijft op de server
}

/** De leerling achter het token in de Authorization-header, of null. */
function huidigeLeerling(): ?array {
  $kop = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
  if (!preg_match('/Bearer\s+([a-f0-9]{16,128})/i', $kop, $m)) return null;
  $st = db()->prepare('SELECT l.*, k.naam AS klas_naam FROM sessies s
                       JOIN leerlingen l ON l.id = s.leerling_id
                       JOIN klassen k    ON k.id = l.klas_id
                       WHERE s.token_hash = ? AND k.actief = 1');
  $st->execute([hash('sha256', $m[1])]);
  $leerling = $st->fetch() ?: null;
  if ($leerling) {
    db()->prepare('UPDATE sessies SET laatst_gezien = NOW() WHERE token_hash = ?')
        ->execute([hash('sha256', $m[1])]);
  }
  return $leerling;
}
function eisLeerling(): array {
  $l = huidigeLeerling();
  if (!$l) antwoordFout('niet aangemeld', 401);
  return $l;
}

/** POST /aanmelden — joincode + naam + PIN → nieuw account. */
function doeAanmelden(array $in): never {
  $joincode = (string) ($in['joincode'] ?? '');
  $naam     = trim((string) ($in['naam'] ?? ''));
  $pin      = (string) ($in['pin'] ?? '');

  if (!magNog('join:' . ipHash(), 20, 3600))
    antwoordFout('te veel pogingen, probeer het over een uur opnieuw', 429);
  if ($f = keurNaam($naam)) antwoordFout($f);
  if ($f = keurPin($pin))   antwoordFout($f);

  $klas = zoekKlas($joincode);
  if (!$klas) antwoordFout('die klascode klopt niet', 403);

  $pdo = db();
  $st = $pdo->prepare('SELECT id FROM leerlingen WHERE klas_id = ? AND naam_sleutel = ?');
  $st->execute([$klas['id'], naamSleutel($naam)]);
  if ($st->fetch()) antwoordFout('die naam is in deze klas al bezet — kies een andere', 409);

  $pdo->prepare('INSERT INTO leerlingen (klas_id, naam, naam_sleutel, pin_hash) VALUES (?, ?, ?, ?)')
      ->execute([$klas['id'], $naam, naamSleutel($naam), password_hash($pin, PASSWORD_ARGON2ID)]);
  $id = (int) $pdo->lastInsertId();

  vergeetPogingen('join:' . ipHash());
  logboek((int) $klas['id'], $id, $naam, 'account-nieuw',
          sprintf('account aangemaakt in klas "%s"', $klas['naam']));
  antwoord(['token' => maakToken($id), 'naam' => $naam, 'klas' => $klas['naam'], 'rev' => 0], 201);
}

/** POST /inloggen — joincode + naam + PIN → token voor dit toestel. */
function doeInloggen(array $in): never {
  $joincode = (string) ($in['joincode'] ?? '');
  $naam     = trim((string) ($in['naam'] ?? ''));
  $pin      = (string) ($in['pin'] ?? '');

  $sleutel = 'login:' . substr(hash('sha256', normaliseerJoincode($joincode) . '|' . naamSleutel($naam)), 0, 40);
  if (!magNog($sleutel, 10, 900) || !magNog('login-ip:' . ipHash(), 60, 900)) {
    usleep(500000);
    antwoordFout('te veel pogingen — wacht een kwartier', 429);
  }

  $klas = zoekKlas($joincode);
  if (!$klas) { usleep(300000); antwoordFout('klascode, naam of PIN klopt niet', 403); }

  $st = db()->prepare('SELECT * FROM leerlingen WHERE klas_id = ? AND naam_sleutel = ?');
  $st->execute([$klas['id'], naamSleutel($naam)]);
  $leerling = $st->fetch();

  if (!$leerling || !password_verify($pin, $leerling['pin_hash'])) {
    usleep(300000);                                  // even remmen, en geen hint welk deel fout is
    if ($leerling) {
      logboek((int) $klas['id'], (int) $leerling['id'], $leerling['naam'], 'login-mislukt',
              'mislukte aanmeldpoging (verkeerde PIN)');
    }
    antwoordFout('klascode, naam of PIN klopt niet', 403);
  }

  vergeetPogingen($sleutel);
  logboek((int) $klas['id'], (int) $leerling['id'], $leerling['naam'], 'login',
          'ingelogd op een nieuw toestel');
  antwoord(['token' => maakToken((int) $leerling['id']), 'naam' => $leerling['naam'],
            'klas' => $klas['naam'], 'rev' => (int) $leerling['rev']]);
}
