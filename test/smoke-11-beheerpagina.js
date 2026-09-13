/* Smoke 11 — de beheerpagina (fase 2).
 *
 *   VERBA_BEHEER=<beheersleutel> node test/smoke-11-beheerpagina.js
 *
 * Draait tegen https://www.steeman.be/verba/beheer/ en de echte API. Maakt een
 * wegwerpklas met een wegwerpleerling, doet er alles mee wat de pagina kan, en ruimt
 * achteraf op — ook als er iets faalt.
 */
const {chromium} = require("playwright");
const BASIS  = process.env.VERBA_BEHEERPAGINA || "https://www.steeman.be/verba/beheer/";
const API    = "https://www.steeman.be/verba/api/v1/index.php?r=";
const BEHEER = process.env.VERBA_BEHEER;
if (!BEHEER) { console.error("zet VERBA_BEHEER=<beheersleutel>"); process.exit(2); }
const EXE = "/home/john/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const UA  = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
          + "Chrome/141.0.0.0 Safari/537.36";

let geslaagd = 0, gefaald = 0;
function check(wat, gekregen, verwacht) {
  if (JSON.stringify(gekregen) === JSON.stringify(verwacht)) { geslaagd++; console.log(`  ok   ${wat}`); return; }
  gefaald++;
  console.error(`  FOUT ${wat}\n       verwacht: ${JSON.stringify(verwacht)}\n       gekregen: ${JSON.stringify(gekregen)}`);
}
const api = (pad, body) => fetch(API + pad, {
  method: body ? "POST" : "GET",
  headers: {"Content-Type": "application/json", "X-Beheer-Sleutel": BEHEER},
  body: body ? JSON.stringify(body) : undefined}).then(r => r.json());

(async () => {
  const browser = await chromium.launch({executablePath: EXE});
  let klasId = null;
  try {
    const p = await (await browser.newContext({userAgent: UA})).newPage();
    p.on("dialog", async d => { await d.accept(d.type() === "prompt" ? (p.__antwoord || "") : undefined); });
    await p.goto(BASIS + "?v=" + Date.now(), {waitUntil: "domcontentloaded"});

    /* ---- 1. zonder sleutel geen gegevens ---- */
    check("1a het slot staat dicht", await p.isVisible("#slot"), true);
    check("1b het paneel is verborgen", await p.isVisible("#paneel"), false);
    await p.fill("#sleutel", "fout-fout-fout");
    await p.click("#btnOpen");
    await p.waitForSelector(".melding.fout", {timeout: 15000});
    check("1c verkeerde sleutel wordt geweigerd",
          /beheersleutel klopt niet/.test(await p.textContent(".melding")), true);
    check("1d en geeft geen gegevens vrij", await p.isVisible("#paneel"), false);

    /* ---- 2. met de juiste sleutel ---- */
    await p.fill("#sleutel", BEHEER);
    await p.click("#btnOpen");
    await p.waitForSelector("#paneel:not([hidden])", {timeout: 15000});
    check("2a het paneel gaat open", await p.isVisible("#paneel"), true);

    /* ---- 3. klas aanmaken, de code komt één keer in beeld ---- */
    const klasNaam = "TEST beheer " + Date.now().toString().slice(-5);
    await p.fill("#nieuweKlas", klasNaam);
    await p.click("#btnNieuweKlas");
    await p.waitForSelector(".melding.ok", {timeout: 15000});
    const tekst = await p.textContent(".melding");
    const code = (tekst.match(/Joincode: ([A-Z0-9]{8})/) || [])[1];
    check("3a de klas is aangemaakt met een joincode", !!code, true);
    check("3b met de waarschuwing dat hij nu genoteerd moet worden",
          /later niet meer op te vragen/.test(tekst), true);
    const {klassen} = await api("beheer/klassen");
    const klas = klassen.find(k => k.naam === klasNaam);
    klasId = klas && klas.id;
    check("3c de klas staat in de lijst", !!klasId, true);
    check("3d en die code werkt echt",
          (await (await fetch(API + "aanmelden", {method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({joincode: code, naam: "proef", pin: "1234"})})).json()).naam, "proef");

    /* ---- 4. leerlingen ---- */
    await p.selectOption("#klasFilter", String(klasId));
    // Wachten op de INHOUD, niet op de tabel: die stond er al van de vorige selectie.
    await p.waitForFunction(() => document.querySelector("#leerlingen").textContent.includes("proef"),
                            null, {timeout: 15000}).catch(() => {});
    check("4a de leerling staat er", (await p.textContent("#leerlingen")).includes("proef"), true);

    p.__antwoord = "4321";
    await p.evaluate(() => document.querySelector("#melding").innerHTML = "");
    // Op naam klikken, nooit op rijvolgorde: tijdens het bouwen trof "de eerste rij" een
    // echt account omdat de lijst nog ongefilterd was.
    const rijProef = p.locator("#leerlingen tr").filter({hasText: "proef"});
    check("4a2 precies één rij voor de testleerling", await rijProef.count(), 1);
    await rijProef.locator('button[data-doe="pin"]').click();
    await p.waitForSelector(".melding.ok", {timeout: 15000});
    check("4b PIN resetten meldt dat alle toestellen afgemeld zijn",
          /afgemeld/.test(await p.textContent(".melding")), true);
    check("4c en de nieuwe PIN werkt",
          (await (await fetch(API + "inloggen", {method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({joincode: code, naam: "proef", pin: "4321"})})).json()).naam, "proef");

    /* ---- 5. logboek ---- */
    // Eerst de achtergrondverversing laten uitrazen: die tekent anders ná onze keuze en
    // zet het paneel terug op "alle klassen" — dan lijkt een regel van een ándere klas
    // op die van ons.
    await p.waitForLoadState("networkidle");
    await p.selectOption("#logKlas", String(klasId));
    await p.waitForFunction(() => /PIN gereset voor proef/.test(document.querySelector("#logboek").textContent),
                            null, {timeout: 15000}).catch(() => {});
    const log = await p.textContent("#logboek");
    check("5a het logboek toont de aanmaak", /klas .* aangemaakt/.test(log), true);
    check("5b en de PIN-reset van déze klas", /PIN gereset voor proef/.test(log), true);
    if (!/PIN gereset voor proef/.test(log)) {
      console.error("       paneel toonde:\n" + log.split("\n").slice(-6).map(r => "         " + r).join("\n"));
      console.error("       gekozen klas: " + await p.evaluate(() => document.querySelector("#logKlas").value));
    }

    /* ---- 6. namen van leerlingen worden nooit als HTML uitgevoerd ---- */
    await fetch(API + "aanmelden", {method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({joincode: code, naam: "b'oze <i>naam", pin: "1111"})});
    await p.click("#btnVernieuwLeerlingen");
    await p.waitForFunction(() => document.querySelector("#leerlingen").textContent.includes("oze"),
                            null, {timeout: 15000}).catch(() => {});
    check("6a een naam met opmaak blijft tekst",
          await p.evaluate(() => document.querySelectorAll("#leerlingen i").length), 0);

    /* ---- 7. klas wissen ruimt alles op ---- */
    await p.evaluate(() => document.querySelector("#melding").innerHTML = "");
    await p.click(`#klassen tr[data-klas="${klasId}"] button[data-doe="wis"]`);
    await p.waitForSelector(".melding.ok", {timeout: 15000});
    const na = await api("beheer/klassen");
    check("7a de klas is weg", na.klassen.some(k => k.id === klasId), false);
    klasId = null;
  } catch (e) {
    gefaald++;
    console.error("ONVERWACHTE FOUT:", e.message ? e.message.slice(0, 300) : e);
  } finally {
    await browser.close();
    if (klasId) {
      const {leerlingen = []} = await api("beheer/leerlingen&klas=" + klasId).catch(() => ({}));
      for (const l of leerlingen) await api("beheer/wissen", {leerling: l.id});
      await api("beheer/klas-wissen", {klas: klasId});
    }
    console.log(`\n${geslaagd} geslaagd, ${gefaald} gefaald`);
    process.exit(gefaald === 0 ? 0 : 1);
  }
})();
