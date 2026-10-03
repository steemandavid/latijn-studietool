// Comites (§9.6): de zes signalen, en vooral wanneer ze NIET mogen verschijnen.
const { chromium } = require('playwright');
const path = require('path');
const PAD = 'file://' + path.join(__dirname, '..', 'verba', 'index.html');
const OUT = path.join(__dirname, 'shots');
const checks = [];
const check = (naam, ok, detail) => {
  checks.push({naam, ok});
  console.log((ok ? '  ✓ ' : '  ✗ FAIL ') + naam + (ok ? '' : ' — ' + JSON.stringify(detail)));
};
const wacht = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch({executablePath:'/home/john/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome'});
  try{
    const p = await b.newPage({viewport:{width:1280, height:900}});
    const fouten = [];
    p.on('pageerror', e => fouten.push(e.message));
    p.on('console', m => { if(m.type()==='error') fouten.push(m.text()); });
    await p.goto(PAD); await p.waitForTimeout(300);

    // Hulpjes in de pagina: een verse leerronde, en antwoorden zonder de feedback-UI.
    await p.evaluate(() => {
      window.__echteFeedback = toonFeedback;
      window.vers = (opties) => {
        zetSave(leegProfiel()); herbouwPak();
        comesLaatst = -Infinity; comesVorigeFig = null; comesVorigeZin = null;
        comesTimers.forEach(clearTimeout); $("#comes").className = "comes"; $("#comes").innerHTML = "";
        toonFeedback = () => {};
        startRonde(opties || {lengte:20});
      };
      let volgend = 0;
      window.antw = (uit, nr) => {
        const w = nr ? BY_NR[nr] : W[(volgend++ * 7) % W.length];
        const v = {nr:w.nr, r:"L2N", it:item(w.nr, "L2N")};
        verwerk(uit, w, v, {getypt:true, gegeven:"x"});
        return w.nr;
      };
      window.zichtbaar = () => $("#comes").classList.contains("on") ? $("#comes").dataset.signaal : null;
    });

    // --- de figuren
    const fig = await p.evaluate(() => COMITES.map(f => ({
      id: f.id, maat: COMES_W, rijen: f.px.length, breed: f.px.every(r => r.length === COMES_W),
      ogen: f.px.join("").includes("w") && !!f.pal.k,
      palet: f.px.join("").split("").every(c => c === "." || f.pal[c])
    })));
    check('zes figuren met de ids uit §9.6',
          fig.map(f => f.id).join() === "noctua,anser,miles,lupa,delphinus,pullus", fig.map(f => f.id));
    check('elk figuur is 32×32, met ogen om te knipperen en een volledig palet',
          fig.every(f => f.maat === 32 && f.rijen === 32 && f.breed && f.ogen && f.palet), fig);

    // --- reeks
    const reeks = await p.evaluate(() => {
      vers(); const r = [];
      antw("fout"); antw("fout"); r.push(zichtbaar());
      antw("fout"); r.push(zichtbaar());
      return r;
    });
    check('twee fouten op rij: niets; de derde: reeks', reeks[0] === null && reeks[1] === "reeks", reeks);

    const bijna = await p.evaluate(() => {
      vers(); antw("fout"); antw("bijna"); antw("fout"); const a = zichtbaar();
      antw("fout"); const b = zichtbaar();
      vers(); antw("fout"); antw("juist"); antw("fout"); antw("fout"); const c = zichtbaar();
      return [a, b, c];
    });
    check('een "bijna" breekt de reeks niet en telt niet mee', bijna[0] === null && bijna[1] === "reeks", bijna);
    check('fout–juist–fout–fout geeft niets', bijna[2] === null, bijna);

    // --- combo en taai
    const cb = await p.evaluate(() => {
      vers(); combo = 8; antw("fout");
      const a = [zichtbaar(), $("#comes .zin") && $("#comes .zin").textContent];
      vers(); combo = 5; antw("fout"); const b = zichtbaar();
      return {a, b};
    });
    check('een fout op een combo van 8 geeft combo, met het getal', cb.a[0] === "combo" && /\b8\b/.test(cb.a[1]), cb);
    check('een combo van 5 is te kort', cb.b === null, cb);

    const taai = await p.evaluate(() => {
      vers(); const w = W.find(x => x.soort === "znw");
      item(w.nr, "L2N").fout = 2; antw("fout", w.nr);
      return {s: zichtbaar(), t: $("#comes .zin") ? $("#comes .zin").textContent : "", kop: w.kop};
    });
    check('derde keer fout op hetzelfde woord: taai', taai.s === "taai", taai);

    const prio = await p.evaluate(() => {
      vers(); const w = W.find(x => x.soort === "znw");
      antw("fout"); antw("fout"); combo = 9; item(w.nr, "L2N").fout = 5; antw("fout", w.nr);
      return zichtbaar();
    });
    check('vallen ze samen, dan wint reeks', prio === "reeks", prio);

    // --- doseren
    const dos = await p.evaluate(() => {
      vers(); combo = 8; antw("fout"); const eerst = zichtbaar();
      comesLaatst = -Infinity; $("#comes").className = "comes";
      antw("fout"); antw("fout"); antw("fout"); const tweede = zichtbaar();
      // nieuwe ronde, maar binnen de pauze
      startRonde({lengte:20}); comesLaatst = Date.now() - 1000;
      antw("fout"); antw("fout"); antw("fout"); const pauze = zichtbaar();
      startRonde({lengte:20}); comesLaatst = Date.now() - COMES_PAUZE - 1;
      antw("fout"); antw("fout"); antw("fout"); const na = zichtbaar();
      return {eerst, tweede, pauze, na, P: COMES_PAUZE};
    });
    check('hoogstens één per ronde', dos.eerst === "combo" && dos.tweede === null, dos);
    check('niet binnen COMES_PAUZE (3 min) van de vorige, wel daarna',
          dos.P === 180000 && dos.pauze === null && dos.na === "reeks", dos);

    const uit = await p.evaluate(() => {
      vers(); S.settings.comites = false; antw("fout"); antw("fout"); antw("fout");
      const a = zichtbaar(); S.settings.comites = true; return a;
    });
    check('met Aanmoedigingen uit: nooit', uit === null, uit);

    const modal = await p.evaluate(() => {
      vers(); toonModal("<p>x</p>"); antw("fout"); antw("fout"); antw("fout");
      const a = zichtbaar(); sluitModal(); return [a, Q.comes];
    });
    check('niet terwijl er een modal openstaat, en dan vervalt hij', modal[0] === null && modal[1] === null, modal);

    // --- nooit in Blitz of een toets
    const blitz = await p.evaluate(() => {
      vers(); startBlitz();
      antw("fout"); antw("fout"); antw("fout");
      const a = zichtbaar(); clearInterval(B.timer); B = null; toon("home"); return [a, Q.modus];
    });
    check('in Blitz: nooit', blitz[0] === null && blitz[1] === "blitz", blitz);
    const ver = await p.evaluate(() => {
      vers(); const d = DELEN[0];
      startRonde({modus:"verover", lengte:d.nrs.length, lijst:d.nrs.map(nr => ({nr, r:"L2N"})), sectie:d.key});
      combo = 9; antw("fout"); antw("fout"); antw("fout");
      const a = zichtbaar(); toon("home"); return [a, Q.modus];
    });
    check('in een veroveringstoets: nooit', ver[0] === null && ver[1] === "verover", ver);

    // --- een comes verandert geen enkele teller
    const tel = await p.evaluate(() => {
      vers(); antw("fout"); antw("fout");
      const snap = () => JSON.stringify({items:S.items, p:S.profiel, combo});
      const voor = snap(); const ok = comes("reeks"); return {ok, gelijk: voor === snap()};
    });
    check('een comes verandert box, combo, XP noch tempo-index', tel.ok && tel.gelijk, tel);

    // --- vorm en toegankelijkheid
    const vorm = await p.evaluate(() => {
      const c = $("#comes"), cs = getComputedStyle(c), r = c.getBoundingClientRect();
      return {pe: cs.pointerEvents, role: c.getAttribute("role"), live: c.getAttribute("aria-live"),
              alt: c.querySelector("img").getAttribute("alt"), links: r.left < 40, onder: innerHeight - r.bottom < 40,
              wie: c.querySelector(".wie").textContent, img: c.querySelector("img").getBoundingClientRect().width};
    });
    check('vangt geen klik af, aria-live polite, figuur met alt=""',
          vorm.pe === "none" && vorm.role === "status" && vorm.live === "polite" && vorm.alt === "", vorm);
    check('linksonder, 96 px, met naam en wie', vorm.links && vorm.onder && vorm.img === 96 && vorm.wie.includes("·"), vorm);
    await wacht(600);                                 // flits en inglijden voorbij
    await p.screenshot({path: path.join(OUT, 'comes-desktop.png')});

    // knipperen bij beweging, en na 4,5 s weg
    const knip = await p.evaluate(async () => {
      vers(); S.settings.animaties = true; antw("fout"); antw("fout"); antw("fout");
      const f = COMITES.find(x => x.id === $("#comes").dataset.fig);
      const img = $("#comes img");
      await new Promise(r => setTimeout(r, COMES_KNIP + 60));
      const dicht = img.src === comesBeeld(f, true);
      await new Promise(r => setTimeout(r, 200));
      const open = img.src === comesBeeld(f, false);
      return {dicht, open, beweeg: $("#comes").classList.contains("beweeg")};
    });
    check('knippert één keer met de ogen', knip.dicht && knip.open && knip.beweeg, knip);
    await wacht(4600 - 1900);
    check('na 4,5 s weg', await p.evaluate(() => zichtbaar() === null && $("#comes").innerHTML === ""));

    const stil = await p.evaluate(async () => {
      vers(); S.settings.animaties = false; antw("fout"); antw("fout"); antw("fout");
      const src = $("#comes img").src;
      await new Promise(r => setTimeout(r, COMES_KNIP + 60));
      const r = {zichtbaar: zichtbaar(), beweeg: $("#comes").classList.contains("beweeg"),
                 zelfde: $("#comes img").src === src};
      S.settings.animaties = true; return r;
    });
    check('animaties uit: verschijnt, maar zonder beweging of knipperen',
          stil.zichtbaar === "reeks" && !stil.beweeg && stil.zelfde, stil);

    // --- afwisseling
    const afw = await p.evaluate(() => {
      vers(); const reeksen = []; let dubbelFig = 0, dubbelZin = 0, vorigeF = null, vorigeZ = null;
      const tel = {};
      for(let i = 0; i < 300; i++){
        Q.comes = null; comesLaatst = -Infinity;
        comes(i % 2 ? "reeks" : "dip", {rest:4});
        const f = $("#comes").dataset.fig, z = $("#comes .zin").textContent;
        if(f === vorigeF) dubbelFig++; if(z === vorigeZ) dubbelZin++;
        vorigeF = f; vorigeZ = z; tel[f] = (tel[f]||0) + 1;
      }
      return {dubbelFig, dubbelZin, tel};
    });
    check('nooit twee keer na elkaar hetzelfde figuur of dezelfde zin',
          afw.dubbelFig === 0 && afw.dubbelZin === 0, afw);
    check('alle zes komen voor, het uiltje het vaakst',
          Object.keys(afw.tel).length === 6 && Object.entries(afw.tel).every(([k, n]) => k === "noctua" || n < afw.tel.noctua), afw.tel);

    const motto = await p.evaluate(() => {
      vers(); let m = 0, lat = true;
      for(let i = 0; i < 300; i++){
        Q.comes = null; comesLaatst = -Infinity; comes("taai", {woord:"amīcus", k:3});
        const e = $("#comes .motto"); if(e){ m++; lat = lat && !!e.querySelector(".lat"); }
      }
      return {m, lat};
    });
    check('een motto in ongeveer één op de drie, in de Latijnse serif', motto.m > 60 && motto.m < 140 && motto.lat, motto);

    // --- terug, dip en zwaar
    const terug = await p.evaluate(async () => {
      const dag = n => { const d = new Date(Date.now() - n*864e5);
        return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); };
      vers(); toon("home"); S.profiel.laatsteActieveDag = dag(5); comesLaatst = -Infinity;
      startRonde({lengte:20}); await new Promise(r => setTimeout(r, 850)); const a = zichtbaar();
      vers(); toon("home"); S.profiel.laatsteActieveDag = dag(2); comesLaatst = -Infinity;
      startRonde({lengte:20}); await new Promise(r => setTimeout(r, 850)); const b = zichtbaar();
      return [a, b];
    });
    check('vijf dagen weg: welkom terug; twee dagen weg (één overgeslagen): niets',
          terug[0] === "terug" && terug[1] === null, terug);

    const dip = await p.evaluate(() => {
      vers({lengte:10}); Q.i = 5; Q.goed = 2; Q.fout = 3; volgendeVraag(); const a = zichtbaar();
      vers({lengte:10}); Q.i = 5; Q.goed = 4; Q.fout = 1; volgendeVraag(); const b = zichtbaar();
      vers({lengte:10}); Q.i = 4; Q.goed = 0; Q.fout = 4; volgendeVraag(); const c = zichtbaar();
      return [a, b, c];
    });
    check('halverwege met ≤ 60 % juist: dip; met 80 % of op een ander moment: niets',
          dip[0] === "dip" && dip[1] === null && dip[2] === null, dip);

    const zwaar = await p.evaluate(async () => {
      // alles al verzameld: een nieuwe badge of tessera opent een modal, en dan vervalt hij
      const alles = () => { TESSERAE.forEach(t => S.tesserae[t.id] = "x"); BADGES.forEach(b => S.badges[b.id] = "x");
                            S.profiel.xp = 50; S.profiel.laatsteActieveDag = vandaag(); };
      vers({lengte:10}); alles(); Q.goed = 2; Q.fout = 6; Q.omhoog = [W[0].nr, W[1].nr]; eindRonde();
      await new Promise(r => setTimeout(r, 1000));
      const a = [zichtbaar(), $("#comes .zin") ? $("#comes .zin").textContent : ""];
      vers({lengte:10}); alles(); Q.goed = 7; Q.fout = 1; eindRonde();
      await new Promise(r => setTimeout(r, 1000));
      const b = zichtbaar();
      while(modalOpen) sluitModal();
      return {a, b};
    });
    check('na een zware ronde: zwaar op het resultaatscherm; na een goede: niets',
          zwaar.a[0] === "zwaar" && zwaar.b === null, zwaar);

    // --- instelling en save
    const inst = await p.evaluate(() => {
      vulInstellingen(); const a = $("#inComites").checked;
      const s = leegProfiel(); delete s.settings.comites; zetSave(s); const oud = S.settings.comites;
      const s2 = leegProfiel(); s2.settings.comites = false; zetSave(s2); const uitgezet = S.settings.comites;
      return {a, oud, uitgezet};
    });
    check('instelling standaard aan, oude saves krijgen aan, uit blijft uit',
          inst.a === true && inst.oud === true && inst.uitgezet === false, inst);

    // --- gsm
    await p.setViewportSize({width:360, height:740});
    const gsm = await p.evaluate(() => {
      vers(); toonFeedback = __echteFeedback; Q.comes = null; comesLaatst = -Infinity; S.settings.animaties = false;
      comes("taai", {woord: BY_NR[1].kop, k: 3});
      const r = $("#comes").getBoundingClientRect();
      return {img: $("#comes img").getBoundingClientRect().width, past: r.right <= 360 && r.left >= 0,
              scroll: document.documentElement.scrollWidth <= 360};
    });
    check('op 360 px: 64 px groot, past in beeld, geen horizontale scroll', gsm.img === 64 && gsm.past && gsm.scroll, gsm);
    await p.screenshot({path: path.join(OUT, 'comes-gsm.png')});

    check('geen JavaScript-fouten', fouten.length === 0, fouten);
  } finally { await b.close(); }
  const ok = checks.filter(c => c.ok).length;
  console.log(`SAMENVATTING smoke-16: ${ok}/${checks.length} checks OK`);
  process.exit(ok === checks.length ? 0 : 1);
})();
