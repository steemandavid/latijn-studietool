<?php
/* Kopieer dit bestand naar config.php en vul het in OP DE SERVER.
 *
 * config.php staat in .gitignore en hoort daar te blijven: deze repo staat publiek op
 * GitHub, en de FTP-root ís de docroot — er is geen map boven de website om geheimen in
 * te leggen (§13.1).
 */
return [
  'db_host'       => '127.0.0.1',
  'db_naam'       => '',
  'db_gebruiker'  => '',
  'db_wachtwoord' => '',

  // Willekeurige tekenreeks, eenmalig aan te maken (bv. `openssl rand -hex 32`).
  // Wordt gebruikt om joincodes en IP-adressen te hashen. Verander hem nooit meer:
  // bestaande joincodes werken dan niet meer.
  'peper'         => '',

  // De beheersleutel voor /beheer/… — bewaar hier de HASH, niet de sleutel zelf:
  //   php -r 'echo password_hash("jouw-sleutel", PASSWORD_ARGON2ID), "\n";'
  'beheer_hash'   => '',
];
