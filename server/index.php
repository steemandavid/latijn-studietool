<?php
declare(strict_types=1);
/* Eén ingang voor /verba/api/v1/… (§13.4).
 *
 * Werkt met én zonder mod_rewrite: /verba/api/v1/sync en /verba/api/v1/index.php?r=sync
 * komen allebei hier uit. Zo hangt de API niet af van een .htaccess — en .htaccess is
 * precies wat op deze hosting de PHP-uitvoering kan uitschakelen (§13.1).
 */

require __DIR__ . '/db.php';
require __DIR__ . '/logboek.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/sync.php';
require __DIR__ . '/mozaiek.php';
require __DIR__ . '/beheer.php';

set_exception_handler(function (Throwable $e): void {
  error_log('VERBA fout: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
  antwoordFout('er ging iets mis op de server', 500);     // nooit de details naar buiten
});

$pad = (string) ($_GET['r'] ?? trim((string) ($_SERVER['PATH_INFO'] ?? ''), '/'));
if ($pad === '') {
  $uri = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH) ?: '';
  $pad = trim((string) preg_replace('#^.*/v1/?#', '', $uri), '/');
}
$pad = strtolower(preg_replace('/[^a-z0-9\/_-]/i', '', $pad) ?? '');
$methode = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$ruw = '';
$in = [];
if ($methode === 'POST') {
  $ruw = (string) file_get_contents('php://input');
  if ($reden = keurOmvang($ruw)) antwoordFout('te veel gegevens: ' . $reden, 413);
  $in = json_decode($ruw, true);
  if (!is_array($in)) antwoordFout('ongeldige JSON');
}

if (str_starts_with($pad, 'beheer/')) beheerRoute(substr($pad, 7), $in);

switch ("$methode $pad") {
  case 'GET ping':      antwoord(['verba' => 'v1', 'tijd' => nuIso()]);
  case 'POST aanmelden': doeAanmelden($in);
  case 'POST inloggen':  doeInloggen($in);
  case 'GET woorden':    doeWoorden();
  case 'GET klas':       doeKlas();
  case 'GET staat':      doeStaat();
  case 'POST sync':      doeSync($in, $ruw);
  default:               antwoordFout('onbekend endpoint', 404);
}
