/* Smoke 10 — de online build in een echte browser (§11.34, §11.35, §11.37).
 *
 *   VERBA_BEHEER=<beheersleutel> node test/smoke-10-online-sync.js
 *
 * Draait tegen https://www.steeman.be/verba-test/ (de online build op een testpad) en de
 * echte API. Maakt een wegwerpklas aan en ruimt die achteraf weer op.
 *
 * Wat hier bewezen moet worden en nergens anders kan: twee ECHTE browsers, elk met hun
 * eigen localStorage, die elk een ronde spelen en daarna samenkomen zonder dat er iets
 * verdwijnt — plus dat de app blijft werken als de server wegvalt.
 */
const {chromium} = require("playwright");
const URL    = process.env.VERBA_URL || "https://www.steeman.be/verba-test/";
const API    = "https://www.steeman.be/verba/api/v1/index.php?r=";
const BEHEER = process.env.VERBA_BEHEER;
if (!BEHEER) { console.error("zet VERBA_BEHEER=<beheersleutel>"); process.exit(2); }
const EXE = "/home/john/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome";

let geslaagd = 0, gefaald = 0;
function check(wat, gekregen, verwacht) {
  const ok = JSON.stringify(gekregen) === JSON.stringify(verwacht);
  if (ok) { geslaagd++; console.log(`  ok   ${wat}`); return; }
  gefaald++;
  console.error(`  FOUT ${wat}\n       verwacht: ${JSON.stringify(verwacht)}\n       gekregen: ${JSON.stringify(gekregen)}`);
}
const beheer = (pad, body) => fetch(API + pad, {
  method: body ? "POST" : "GET",
  headers: {"Content-Type": "application/json", "X-Beheer-Sleutel": BEHEER},
  body: body ? JSON.stringify(body) : undefined}).then(r => r.json());

/** De hosting heeft een DDoS-bescherming die een geautomatiseerde browser na een reeks
 *  runs met 403 wegstuurt. Dat lijkt op een stukke app — het is er geen. Daarom expliciet
 *  herkennen en zeggen wat er aan de hand is, in plaats van te wachten op een knop die
 *  nooit komt. `curl` en gewone bezoekers merken er niets van; even wachten volstaat. */
async function controleerBereikbaar(resp, pagina) {
  const titel = await pagina.title().catch(() => "");
  if ((resp && resp.status() === 403) || /Protection DDoS/i.test(titel)) {
    throw new Error("de hosting blokkeert deze browser (DDoS-bescherming, HTTP 403). "
      + "Dat is geen fout in de app: wacht een kwartier en draai de test opnieuw, "
      + "of draai hem tegen /verba-test/ in plaats van de live-URL.");
  }
}

/** Meldt een verse browser aan en wacht tot de app draait. */
async function meldAan(pagina, joincode, naam, pin, nieuw) {
  // Met cache-bust: de edge voor steeman.be serveert een statische pagina anders nog
  // even in zijn vorige versie, en dan test je de build van daarnet.
  const resp = await pagina.goto(URL + "?v=" + Date.now(), {waitUntil: "domcontentloaded"});
  await controleerBereikbaar(resp, pagina);
  await pagina.waitForSelector("#aanmeldScherm:not([hidden])");
  if (!nieuw) await pagina.click("#btnWissel");
  await pagina.fill("#inJoincode", joincode);
  await pagina.fill("#inNaam", naam);
  await pagina.fill("#inPin", pin);
  await pagina.click("#btnAanmeld");
  await pagina.waitForSelector("html[data-verba='online-klaar']", {timeout: 30000});
  await pagina.waitForSelector("html[data-verba-sync='klaar']", {timeout: 30000});
}

/** Zet rechtstreeks een paar leeritems in de save — sneller en preciezer dan klikken. */
async function speelRonde(pagina, items, xp) {
  return pagina.evaluate(([items, xp]) => {
    const nu = new Date().toISOString();
    for (const [sleutel, box] of items) {
      S.items[sleutel] = {box, juist: box, fout: 0, laatstGezien: nu, vragenSindsdien: 0, mcSinds: 0};
    }
    S.profiel.xp += xp;
    S.profiel.totaalJuist += items.length;
    S.profiel.totaalRondes += 1;
    bewaar();
    return Object.keys(S.items).length;
  }, [items, xp]);
}

(async () => {
  // Met de standaard-UA ("HeadlessChrome") stuurt de DDoS-bescherming van de hosting een
  // 403 terug; met een gewone UA komt de test er net als een echte bezoeker door.
  const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
           + "Chrome/141.0.0.0 Safari/537.36";
  const browser = await chromium.launch({executablePath: EXE});
  const nieuwContext = () => browser.newContext({userAgent: UA});
  let klas = null;
  try {
    klas = await beheer("beheer/klas", {naam: "TEST smoke-10"});
    if (!klas.joincode) throw new Error("geen klas: " + JSON.stringify(klas));

    /* ---- 1. zonder klascode geen app en geen woorden (§11.36) ---- */
    const kaal = await nieuwContext();
    const p0 = await kaal.newPage();
    const resp0 = await p0.goto(URL + "?v=" + Date.now(), {waitUntil: "domcontentloaded"});
    await controleerBereikbaar(resp0, p0);
    await p0.waitForSelector("#aanmeldScherm:not([hidden])");
    check("1a het aanmeldscherm staat er", await p0.isVisible("#aanmeldScherm"), true);
    check("1b de app zelf draait niet",
          await p0.evaluate(() => { try { return S ? "app draait" : "app draait"; }
                                    catch (e) { return "niet opgestart"; } }), "niet opgestart");
    check("1c geen woordenlijst in de browser",
          await p0.evaluate(() => (typeof W === "undefined" || !W) ? "geen" : "wel"), "geen");
    const bron = await (await fetch(URL + "?v=" + Date.now())).text();
    check("1d de pagina bevat geen woorddata", /amīcus|servus/.test(bron), false);
    await kaal.close();

    /* ---- 2. laptop: aanmelden en een ronde spelen ---- */
    const laptopCtx = await nieuwContext();
    const laptop = await laptopCtx.newPage();
    await meldAan(laptop, klas.joincode, "robbe", "1234", true);
    check("2a de app is opgestart",
          await laptop.evaluate(() => document.documentElement.dataset.verba), "online-klaar");
    check("2b de woorden staan lokaal", await laptop.evaluate(() => W.length), 1051);
    check("2c het account staat in de instellingen",
          await laptop.evaluate(() => ACC.naam), "robbe");
    // Het aanmeldscherm hing ooit ONZICHTBAAR-maar-zichtbaar over de draaiende app heen:
    // een dood formulier bovenop een app die gewoon werkte. Nooit meer.
    check("2c2 het aanmeldscherm is weg zodra de app draait",
          await laptop.isVisible("#aanmeldScherm"), false);

    await speelRonde(laptop, [["1:L2N", 3], ["2:L2N", 2]], 500);
    await laptop.evaluate(() => syncNu());
    await laptop.waitForFunction(() => ACC.rev > 0, null, {timeout: 20000});
    check("2d de ronde is gesynchroniseerd", await laptop.evaluate(() => ACC.rev >= 1), true);

    /* ---- 3. tablet: tweede toestel, eigen ronde, dan samenvoegen (§11.37) ---- */
    const tabletCtx = await nieuwContext();
    const tablet = await tabletCtx.newPage();
    await meldAan(tablet, klas.joincode, "robbe", "1234", false);
    check("3a de tablet ziet de voortgang van de laptop",
          await tablet.evaluate(() => S.items["1:L2N"] ? S.items["1:L2N"].box : null), 3);
    check("3b en de XP", await tablet.evaluate(() => S.profiel.xp), 500);

    await speelRonde(tablet, [["3:L2V", 1], ["2:L2N", 4]], 300);
    await tablet.evaluate(() => syncNu());
    await tablet.waitForFunction(() => ACC.rev >= 2, null, {timeout: 20000});

    await laptop.evaluate(() => syncNu());
    await laptop.waitForFunction(() => S.items["3:L2V"] !== undefined, null, {timeout: 20000});
    const na = await laptop.evaluate(() => ({
      laptopItem: S.items["1:L2N"].box, tabletItem: S.items["3:L2V"].box,
      gedeeld: S.items["2:L2N"].box, xp: S.profiel.xp}));
    check("3c het item van de laptop leeft nog", na.laptopItem, 3);
    check("3d het item van de tablet is aangekomen", na.tabletItem, 1);
    check("3e het gedeelde item staat op de hoogste box", na.gedeeld, 4);
    check("3f de XP is de hoogste van de twee", na.xp, 800);

    /* ---- 4. zonder server werkt alles door (§11.34) ---- */
    await laptopCtx.setOffline(true);
    const voor = await laptop.evaluate(() => S.profiel.xp);
    await speelRonde(laptop, [["4:L2N", 2]], 120);
    await laptop.evaluate(() => syncNu());
    check("4a de app werkt offline gewoon door",
          await laptop.evaluate(() => S.profiel.xp), voor + 120);
    check("4b de sync meldt dat hij wacht", await laptop.evaluate(() => !!syncFout), true);
    check("4c het item staat lokaal bewaard",
          await laptop.evaluate(() => JSON.parse(localStorage.getItem("verba.save.v1")).items["4:L2N"].box), 2);

    await laptopCtx.setOffline(false);
    await laptop.evaluate(() => syncNu());
    await laptop.waitForFunction(() => !syncFout, null, {timeout: 20000});
    check("4d na herstel gaat de wijziging alsnog weg", await laptop.evaluate(() => !syncFout), true);

    await tablet.evaluate(() => syncNu());
    await tablet.waitForFunction(() => S.items["4:L2N"] !== undefined, null, {timeout: 20000});
    check("4e en komt op het andere toestel aan",
          await tablet.evaluate(() => S.items["4:L2N"].box), 2);

    /* ---- 5. het logboek heeft alles meegekregen (§11.39) ---- */
    const log = await beheer(`beheer/logboek&klas=${klas.klas}&aantal=100`);
    const zinnen = (log.logboek || []).map(x => x.zin);
    check("5a de aanmelding staat erin", zinnen.some(z => z.includes("account aangemaakt")), true);
    check("5b het tweede toestel staat erin", zinnen.some(z => z.includes("nieuw toestel")), true);
    check("5c de syncs staan erin", zinnen.filter(z => z.includes("gesynct")).length >= 2, true);
  } catch (e) {
    gefaald++;
    console.error("ONVERWACHTE FOUT:", e);
  } finally {
    await browser.close();
    if (klas && klas.klas) {
      const {leerlingen = []} = await beheer(`beheer/leerlingen&klas=${klas.klas}`).catch(() => ({}));
      for (const l of leerlingen) await beheer("beheer/wissen", {leerling: l.id});
      await beheer("beheer/klas-wissen", {klas: klas.klas});
    }
    console.log(`\n${geslaagd} geslaagd, ${gefaald} gefaald`);
    process.exit(gefaald === 0 ? 0 : 1);
  }
})();
