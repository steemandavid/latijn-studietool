/* End-to-end test van de VERBA-API — §11.34 t/m §11.41.
 *
 *   VERBA_BEHEER=<beheersleutel> node test/api-test.js
 *
 * Draait tegen de echte server (er is geen lokale MySQL). Maakt zijn eigen wegwerpklassen
 * aan, test erin, en ruimt alles achter zich op — ook als een test faalt.
 */
const BASIS   = process.env.VERBA_API || "https://www.steeman.be/verba/api/v1";
const BEHEER  = process.env.VERBA_BEHEER;
if (!BEHEER) { console.error("zet VERBA_BEHEER=<beheersleutel>"); process.exit(2); }

let geslaagd = 0, gefaald = 0;
const opruimen = [];
function check(wat, gekregen, verwacht) {
  const ok = JSON.stringify(gekregen) === JSON.stringify(verwacht);
  if (ok) { geslaagd++; return; }
  gefaald++;
  console.error(`FOUT  ${wat}\n      verwacht: ${JSON.stringify(verwacht)}\n      gekregen: ${JSON.stringify(gekregen)}`);
}
async function roep(pad, {methode = "GET", token, beheer, body} = {}) {
  const kop = {"Content-Type": "application/json"};
  if (token)  kop["Authorization"] = "Bearer " + token;
  if (beheer) kop["X-Beheer-Sleutel"] = BEHEER;
  const r = await fetch(`${BASIS}/index.php?r=${pad}`, {
    method: methode, headers: kop, body: body ? JSON.stringify(body) : undefined});
  const tekst = await r.text();
  let json = null; try { json = JSON.parse(tekst); } catch {}
  return {code: r.status, json, tekst, kop: r.headers};
}
const item = (box, juist, fout, t) =>
  ({box, juist, fout, laatstGezien: t, vragenSindsdien: 0, mcSinds: 0});

(async () => {
try {
  /* ---- 1. ping, koppen, geen broncodelek (§11.40) ---- */
  let r = await roep("ping");
  check("1a ping antwoordt", r.json?.verba, "v1");
  check("1b niet gecached", r.kop.get("cache-control"), "no-store");
  check("1c geen broncode in het antwoord", r.tekst.startsWith("<?php"), false);

  /* ---- 2. klassen aanmaken (twee, om de scheiding te testen) ---- */
  r = await roep("beheer/klas", {methode: "POST", beheer: true, body: {naam: "TEST klas A"}});
  check("2a klas aangemaakt", r.code, 201);
  const klasA = r.json; opruimen.push(["klas", klasA.klas]);
  r = await roep("beheer/klas", {methode: "POST", beheer: true, body: {naam: "TEST klas B"}});
  const klasB = r.json; opruimen.push(["klas", klasB.klas]);
  check("2b twee verschillende joincodes", klasA.joincode !== klasB.joincode, true);
  check("2c joincode is 8 tekens", klasA.joincode.length, 8);

  r = await roep("beheer/klas", {methode: "POST", body: {naam: "zonder sleutel"}});
  check("2d zonder beheersleutel geen toegang", r.code, 403);

  /* ---- 3. aanmelden (§11.35, §11.36) ---- */
  r = await roep("aanmelden", {methode: "POST", body: {joincode: "XXXXXXXX", naam: "robbe", pin: "1234"}});
  check("3a verkeerde klascode wordt geweigerd", r.code, 403);
  r = await roep("aanmelden", {methode: "POST", body: {joincode: klasA.joincode, naam: "robbe", pin: "12"}});
  check("3b PIN van 2 cijfers wordt geweigerd", r.code, 400);
  r = await roep("aanmelden", {methode: "POST", body: {joincode: klasA.joincode, naam: "r", pin: "1234"}});
  check("3c naam van 1 teken wordt geweigerd", r.code, 400);
  r = await roep("aanmelden", {methode: "POST", body: {joincode: klasA.joincode, naam: "robbe<script>", pin: "1234"}});
  check("3d naam met HTML wordt geweigerd", r.code, 400);

  r = await roep("aanmelden", {methode: "POST", body: {joincode: klasA.joincode, naam: "robbe", pin: "1234"}});
  check("3e account aangemaakt", r.code, 201);
  const laptop = r.json.token;
  check("3f klasnaam komt terug", r.json.klas, "TEST klas A");

  r = await roep("aanmelden", {methode: "POST", body: {joincode: klasA.joincode, naam: "Robbe", pin: "9999"}});
  check("3g dezelfde naam in dezelfde klas kan niet", r.code, 409);
  r = await roep("aanmelden", {methode: "POST", body: {joincode: klasB.joincode, naam: "robbe", pin: "5555"}});
  check("3h dezelfde naam in een ándere klas kan wel (§11.41)", r.code, 201);

  /* ---- 4. zonder token geen gegevens (§11.36) ---- */
  check("4a staat zonder token", (await roep("staat")).code, 401);
  check("4b sync zonder token", (await roep("sync", {methode: "POST", body: {}})).code, 401);
  check("4c onzin-token", (await roep("staat", {token: "a".repeat(64)})).code, 401);

  /* ---- 5. eerste sync = migratie van een bestaande save (§13.2) ---- */
  const save = {
    app: "verba", version: 1,
    settings: {rondelengte: 15, strengheid: "soepel"},
    profiel: {xp: 4820, level: 9, totaalJuist: 412, totaalFout: 88, totaalRondes: 34,
              streakGeschiedenis: ["2026-09-11"]},
    items: {"1:L2N": item(3, 5, 0, "2026-09-11T20:00:00.000Z"),
            "2:L2N": item(2, 2, 1, "2026-09-11T20:01:00.000Z")},
    badges: {"primus-gradus": "2026-09-11T20:00:00.000Z"},
  };
  r = await roep("sync", {methode: "POST", token: laptop,
                          body: {basisRev: 0, wijziging: save,
                                 gebeurtenissen: [{soort: "ronde", cijfers: {vragen: 15, juist: 13, xp: 120, omhoog: 4}}]}});
  check("5a migratie aanvaard", r.code, 200);
  check("5b rev staat op 1", r.json.rev, 1);

  r = await roep("staat", {token: laptop});
  check("5c de staat is bewaard", r.json.staat.profiel.xp, 4820);
  check("5d de items staan er", Object.keys(r.json.staat.items).sort(), ["1:L2N", "2:L2N"]);

  /* ---- 6. tweede toestel: inloggen en samenvoegen (§11.37) ---- */
  r = await roep("inloggen", {methode: "POST", body: {joincode: klasA.joincode, naam: "ROBBE", pin: "1234"}});
  check("6a inloggen op een tweede toestel", r.code, 200);
  const tablet = r.json.token;
  check("6b het tweede toestel ziet dezelfde rev", r.json.rev, 1);

  r = await roep("inloggen", {methode: "POST", body: {joincode: klasA.joincode, naam: "robbe", pin: "0000"}});
  check("6c verkeerde PIN", r.code, 403);

  // de tablet speelt een ronde op een item dat de laptop niet kent, en zet er één vooruit
  r = await roep("sync", {methode: "POST", token: tablet, body: {basisRev: 1, wijziging: {
    app: "verba", version: 1,
    profiel: {xp: 5000, totaalJuist: 430, totaalFout: 90, totaalRondes: 35,
              streakGeschiedenis: ["2026-09-12"]},
    items: {"3:L2V": item(1, 1, 0, "2026-09-12T19:00:00.000Z"),
            "2:L2N": item(3, 4, 1, "2026-09-12T19:05:00.000Z")},
    tesserae: {lupa: "2026-09-12T19:00:00.000Z"}}}});
  check("6d de sync van de tablet lukt", r.code, 200);
  check("6e rev is opgeschoven", r.json.rev, 2);

  r = await roep("staat", {token: laptop});
  const s = r.json.staat;
  check("6f het item van de laptop leeft nog", s.items["1:L2N"].box, 3);
  check("6g het item van de tablet is erbij", s.items["3:L2V"].box, 1);
  check("6h het gedeelde item staat vooruit", s.items["2:L2N"].box, 3);
  check("6i de badge van de laptop blijft", !!s.badges["primus-gradus"], true);
  check("6j de tessera van de tablet blijft", !!s.tesserae.lupa, true);
  check("6k xp is de hoogste van de twee", s.profiel.xp, 5000);
  check("6l beide dagen tellen mee voor de streak", s.profiel.streak, 2);

  /* ---- 7. grenzen weigeren, en loggen (§11.38) ---- */
  r = await roep("sync", {methode: "POST", token: laptop, body: {basisRev: 2, wijziging: {
    app: "verba", version: 1, profiel: {xp: 999999, totaalJuist: 430, totaalFout: 90, totaalRondes: 35}}}});
  check("7a absurde XP wordt geweigerd", r.code, 422);
  check("7b met een leesbare reden", /XP per uur/.test(r.json.fout), true);

  r = await roep("sync", {methode: "POST", token: laptop, body: {basisRev: 2, wijziging: {
    app: "verba", version: 1, profiel: {xp: 5000, totaalJuist: 430, totaalFout: 90, totaalRondes: 35},
    items: {"kapotte-sleutel": item(1, 0, 0, "2026-09-12T19:00:00.000Z")}}}});
  check("7c ongeldige itemsleutel wordt geweigerd", r.code, 422);

  r = await roep("sync", {methode: "POST", token: laptop, body: {basisRev: 2, wijziging: {
    app: "verba", version: 1, profiel: {xp: 100, totaalJuist: 10, totaalFout: 1, totaalRondes: 1}}}});
  check("7d dalende tellers worden geweigerd", r.code, 422);

  r = await roep("staat", {token: laptop});
  check("7e de staat is door dit alles niet veranderd", r.json.staat.profiel.xp, 5000);

  /* ---- 8. het logboek (§11.39) ---- */
  r = await roep(`beheer/logboek&klas=${klasA.klas}&aantal=50`, {beheer: true});
  const zinnen = r.json.logboek.map(x => x.zin);
  check("8a account aangemaakt staat erin", zinnen.some(z => z.includes("account aangemaakt")), true);
  check("8b de ronde staat erin", zinnen.some(z => z.includes("ronde afgerond — 15 vragen, 13 juist")), true);
  check("8c de migratie staat erin", zinnen.some(z => z.includes("eerste sync")), true);
  check("8d het inloggen staat erin", zinnen.some(z => z.includes("nieuw toestel")), true);
  check("8e de geweigerde sync staat erin, met reden",
        zinnen.some(z => z.includes("sync geweigerd") && z.includes("XP per uur")), true);
  check("8f de mislukte PIN staat erin", zinnen.some(z => z.includes("verkeerde PIN")), true);

  const tekst = await fetch(`${BASIS}/index.php?r=beheer/logboek&klas=${klasA.klas}&formaat=tekst`,
                            {headers: {"X-Beheer-Sleutel": BEHEER}});
  const platte = await tekst.text();
  check("8g downloadbare platte tekst", tekst.headers.get("content-type").startsWith("text/plain"), true);
  check("8h één regel per gebeurtenis", platte.trim().split("\n").length >= 6, true);
  check("8i leerlingen zien het logboek niet", (await roep("beheer/logboek", {token: laptop})).code, 403);

  /* ---- 9. klasscheiding (§11.41) ---- */
  r = await roep(`beheer/logboek&klas=${klasB.klas}`, {beheer: true});
  check("9a het logboek van klas B bevat niets van klas A",
        r.json.logboek.every(x => !x.zin.includes("ronde afgerond")), true);

} catch (e) {
  gefaald++;
  console.error("ONVERWACHTE FOUT:", e);
} finally {
  /* ---- opruimen: wegwerpklassen en hun leerlingen verdwijnen weer ---- */
  for (const [soort, id] of opruimen) {
    if (soort !== "klas") continue;
    const r = await fetch(`${BASIS}/index.php?r=beheer/leerlingen&klas=${id}`,
                          {headers: {"X-Beheer-Sleutel": BEHEER}});
    const {leerlingen = []} = await r.json().catch(() => ({}));
    for (const l of leerlingen) {
      await fetch(`${BASIS}/index.php?r=beheer/wissen`, {method: "POST",
        headers: {"Content-Type": "application/json", "X-Beheer-Sleutel": BEHEER},
        body: JSON.stringify({leerling: l.id})});
    }
    await fetch(`${BASIS}/index.php?r=beheer/klas-wissen`, {method: "POST",
      headers: {"Content-Type": "application/json", "X-Beheer-Sleutel": BEHEER},
      body: JSON.stringify({klas: id})});
  }
  console.log(`\n${geslaagd} geslaagd, ${gefaald} gefaald`);
  process.exit(gefaald === 0 ? 0 : 1);
}
})();
