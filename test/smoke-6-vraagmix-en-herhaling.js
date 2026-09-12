const { chromium } = require('playwright');
const PAD = 'file:///home/john/claudecode/projects/latijn-studietool/verba/index.html';
const checks = [];
const check = (naam, ok, detail) => {
  checks.push({naam, ok});
  console.log((ok ? '  ✓ ' : '  ✗ FAIL ') + naam + (ok ? '' : ' — ' + JSON.stringify(detail)));
};

/* Twee klachten uit de praktijk (2026-09-12):
   - veel te veel meerkeuze, bijna nooit zelf typen;
   - binnen één ronde kwam hetzelfde woord drie, vier of vijf keer terug.
   Deze suite legt beide vast. De klok wordt virtueel vooruitgezet (12 s per vraag,
   een dag tussen sessies), want zonder tijdsverloop is box 2 nooit due en lijkt
   elke ronde terecht één grote meerkeuzetoets. */
(async () => {
  const b = await chromium.launch({executablePath:'/home/john/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome'});
  try{
    const p = await b.newPage();
    const fouten = [];
    p.on('console', m => { if(m.type()==='error') fouten.push(m.text()); });
    p.on('pageerror', e => fouten.push('PAGEERROR: ' + e.message));
    await p.goto(PAD);
    await p.waitForTimeout(400);

    const sim = await p.evaluate(({aandeel}) => {
      S.settings.typAandeel = aandeel;
      let virt = Date.now();
      Date.now = () => virt;                         // virtuele klok
      const uit = {intro:0, mc:0, typ:0, maxPerRonde:0, minGat:99, rondes:[]};
      for(let sessie=0; sessie<6; sessie++){
        for(let ronde=0; ronde<2; ronde++){
          startRonde({});
          const tel = new Map(), volg = [];
          const vormen = {intro:0, mc:0, typ:0};
          for(let i=0; i<Q.lengte; i++){
            const v = kiesVraag();
            if(!v) break;
            noteerGesteld(v.nr);
            Q.telWoord.set(v.nr, (Q.telWoord.get(v.nr) || 0) + 1);
            const vorm = vraagVorm(v);
            vormen[vorm]++; uit[vorm]++;
            if(vorm === 'mc'){ Q.mc++; v.it.mcSinds = (v.it.mcSinds|0) + 1; }
            if(vorm === 'typ') Q.typ++;
            volg.push(v.nr); tel.set(v.nr, (tel.get(v.nr) || 0) + 1);
            const it = v.it;
            virt += 12000;
            vraagTeller++; tikVragen();
            it.vragenSindsdien = 0; it.laatstGezien = new Date(virt).toISOString();
            if(vorm === 'intro'){ it.box = 1; it.nieuwGeintroduceerd = true; it.mcSinds = 0; }
            else if(Math.random() < 0.8){ it.box = Math.min(5, it.box+1); it.juist++; it.nieuwGeintroduceerd = false; }
            else { it.box = 1; it.mcSinds = 0; it.fout++; Q.foutRonde.add(iKey(v.nr, v.r)); it.nieuwGeintroduceerd = false; }
            Q.i++;
          }
          uit.maxPerRonde = Math.max(uit.maxPerRonde, ...tel.values());
          for(let i=0; i<volg.length; i++) for(let j=i+1; j<volg.length; j++)
            if(volg[i] === volg[j]){ uit.minGat = Math.min(uit.minGat, j-i); break; }
          uit.rondes.push(vormen.typ + 'T/' + vormen.mc + 'M/' + vormen.intro + 'I');
          virt += 60000;
        }
        virt += 864e5;
      }
      uit.typAandeel = uit.typ / (uit.typ + uit.mc);
      return uit;
    }, {aandeel:'gemiddeld'});

    console.log('MIX', JSON.stringify(sim));
    check('minstens de helft getypt (§4.6)', sim.typAandeel >= 0.5, sim.typAandeel);
    check('hoogstens 2 × hetzelfde woord per ronde (§4.5)', sim.maxPerRonde <= 2, sim.maxPerRonde);
    check('minstens 2 andere woorden tussen twee beurten', sim.minGat >= 3, sim.minGat);
    check('elke ronde levert vragen op', sim.rondes.length === 12 && sim.intro + sim.mc + sim.typ >= 12*15*0.9,
          {rondes:sim.rondes.length, vragen:sim.intro+sim.mc+sim.typ});

    // "Weinig typen" moet ook echt minder typen geven dan "veel typen".
    const vergelijk = await p.evaluate(() => {
      const meet = (aandeel) => {
        zetSave(leegProfiel()); herbouwPak();
        S.settings.typAandeel = aandeel;
        let virt = Date.now(); Date.now = () => virt;
        let typ = 0, mc = 0;
        for(let ronde=0; ronde<10; ronde++){
          startRonde({});
          for(let i=0; i<Q.lengte; i++){
            const v = kiesVraag(); if(!v) break;
            noteerGesteld(v.nr); Q.telWoord.set(v.nr,(Q.telWoord.get(v.nr)||0)+1);
            const vorm = vraagVorm(v);
            if(vorm === 'mc'){ Q.mc++; mc++; v.it.mcSinds = (v.it.mcSinds|0)+1; }
            if(vorm === 'typ'){ Q.typ++; typ++; }
            const it = v.it; virt += 12000;
            vraagTeller++; tikVragen();
            it.vragenSindsdien = 0; it.laatstGezien = new Date(virt).toISOString();
            if(vorm === 'intro'){ it.box = 1; it.nieuwGeintroduceerd = true; it.mcSinds = 0; }
            else if(Math.random() < 0.6){ it.box = Math.min(5, it.box+1); it.juist++; it.nieuwGeintroduceerd = false; }
            else { it.box = 1; it.mcSinds = 0; it.fout++; Q.foutRonde.add(iKey(v.nr, v.r)); it.nieuwGeintroduceerd = false; }
            Q.i++;
          }
          virt += 6e4;
        }
        return typ / Math.max(1, typ + mc);
      };
      return {weinig: meet('weinig'), veel: meet('veel')};
    });
    console.log('INSTELLING', JSON.stringify(vergelijk));
    check('"veel typen" typt meer dan "weinig typen"', vergelijk.veel > vergelijk.weinig, vergelijk);

    // --- combo loopt door over rondes (§5.2) ---
    const combo = await p.evaluate(async () => {
      zetSave(leegProfiel()); herbouwPak(); bewaar();
      const speel = async (fout) => {
        document.querySelector('#btnLeer').click();
        let stap = 0;
        while(document.querySelector('#scr-quiz.on') && stap++ < 300){
          const io = document.querySelector('#introOk');
          const opt = document.querySelector('#opts .optie:not([disabled])');
          const inp = document.querySelector('#tIn');
          const nx  = document.querySelector('#fbNext');
          if(nx) nx.click();
          else if(io) io.click();
          else if(opt){
            const g = norm(juisteTekst(BY_NR[Q.huidig.nr], Q.huidig.r));
            const i = Q.opts.findIndex(o => norm(o) === g);
            document.querySelectorAll('#opts .optie')[fout ? (i+1) % 4 : i].click();
          }
          else if(inp){
            inp.value = fout ? 'zzzz' : juisteTekst(BY_NR[Q.huidig.nr], Q.huidig.r);
            document.querySelector('#tOk').click();
          }
          await new Promise(r => setTimeout(r, 25));
        }
        await new Promise(r => setTimeout(r, 300));
        const c = combo;
        const b = document.querySelector('#resHome'); if(b) b.click();
        await new Promise(r => setTimeout(r, 150));
        return c;
      };
      const na1 = await speel(false);
      const na2 = await speel(false);        // combo moet doorlopen, niet herbeginnen
      const bewaardNaHerladen = S.profiel.combo;
      const naFout = await speel(true);      // fouten breken hem wel
      return {na1, na2, bewaard:bewaardNaHerladen, naFout};
    });
    console.log('COMBO', JSON.stringify(combo));
    check('combo loopt door in de volgende ronde', combo.na2 > combo.na1, combo);
    check('combo staat in de save', combo.bewaard === combo.na2, combo);
    check('een fout breekt de combo', combo.naFout === 0, combo);

    console.log('FOUTEN', fouten.length);
    check('nul console/pageerrors', fouten.length === 0, fouten.slice(0,3));
  } finally {
    await b.close();
  }
  const slecht = checks.filter(c => !c.ok).length;
  console.log(`SAMENVATTING smoke-6: ${checks.length - slecht}/${checks.length} checks OK`);
  process.exit(slecht ? 1 : 0);
})();
