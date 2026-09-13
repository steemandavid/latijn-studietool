/* Lokale testserver: serveert de gebouwde online build en geeft de API door.
 *
 * De DDoS-bescherming van de hosting stuurt een geautomatiseerde browser na een reeks
 * runs met 403 weg. Dat is geen fout in de app, maar het legt de tests wel plat. Deze
 * server serveert verba-online/index.html van schijf en stuurt alleen /verba/api/... door
 * naar de echte server — dat gaat vanuit node, en daar heeft de bescherming geen bezwaar
 * tegen. Zo testen we de échte API met de échte pagina, zonder bot-detectie ertussen.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ECHT = "https://www.steeman.be";

function start(poort = 0, bestand = path.join(__dirname, "..", "verba-online", "index.html")) {
  const html = fs.readFileSync(bestand);
  const server = http.createServer(async (verzoek, antwoord) => {
    if (verzoek.url.startsWith("/verba/api/")) {
      const brokken = [];
      for await (const b of verzoek) brokken.push(b);
      const kop = {};
      for (const naam of ["content-type", "authorization", "x-beheer-sleutel"]) {
        if (verzoek.headers[naam]) kop[naam] = verzoek.headers[naam];
      }
      try {
        const r = await fetch(ECHT + verzoek.url, {
          method: verzoek.method, headers: kop,
          body: brokken.length ? Buffer.concat(brokken) : undefined});
        const tekst = await r.text();
        antwoord.writeHead(r.status, {
          "Content-Type": r.headers.get("content-type") || "application/json",
          "Cache-Control": "no-store"});
        antwoord.end(tekst);
      } catch (e) {
        antwoord.writeHead(502, {"Content-Type": "application/json"});
        antwoord.end(JSON.stringify({fout: "proxy: " + e.message}));
      }
      return;
    }
    antwoord.writeHead(200, {"Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store"});
    antwoord.end(html);
  });
  return new Promise(k => server.listen(poort, () => k({
    server, url: `http://localhost:${server.address().port}/`})));
}

module.exports = {start};
