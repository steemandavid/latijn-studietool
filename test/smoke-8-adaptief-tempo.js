const { chromium } = require('playwright');
const PAD = 'file:///home/john/claudecode/projects/latijn-studietool/verba/index.html';
const checks = [];
const check = (naam, ok, detail) => {
  checks.push({naam, ok});
  console.log((ok ? '  ✓ ' : '  ✗ FAIL ') + naam + (ok ? '' : ' — ' + JSON.stringify(detail)));
};

/* §4.4 — adaptief leertempo. Het plafond op "items in de lucht" en het
   herhalingsvenster volgen een vlotheidsscore per antwoord (juist + snel).
   Hier wordt de motor rechtstreeks gevoed (tempoBij), zodat de test niet van
   echte kloktijd afhangt. */
(async () => {
  const b = await chromium.launch({executablePath:'/home/john/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome'});
  try{
    const p = await b.newPage({viewport:{width:1280, height:900}});
    const fouten = [];
    p.on('pageerror', e => fouten.push(e.message));
    p.on('console', m => { if(m.type()==='error') fouten.push(m.text()); });
    await p.goto(PAD); await p.waitForTimeout(300);

    const start = await p.evaluate(() => ({T:S.profiel.tempo, max:luchtMax(), venster:vensterNu()}));
    console.log('START', JSON.stringify(start));
    check('startwaarde: T = 0,5, plafond 10, venster 5',
          start.T === 0.5 && start.max === 10 && start.venster === 5, start);

    // 1. snelle, juiste antwoorden -> naar het maximum
    const snel = await p.evaluate(() => {
      S.settings.tempo = "auto";
      for(let i = 0; i < 40; i++) tempoBij("juist", 1500, {mc:true}, 8);
      return {T:+S.profiel.tempo.toFixed(3), max:luchtMax(), venster:vensterNu()};
    });
    console.log('SNEL', JSON.stringify(snel));
    check('vlot antwoorden: plafond 14, venster 6', snel.max === 14 && snel.venster === 6, snel);

    // 2. fout/traag -> omlaag
    const traag = await p.evaluate(() => {
      for(let i = 0; i < 40; i++) tempoBij("fout", 20000, {getypt:true}, 8);
      return {T:+S.profiel.tempo.toFixed(3), max:luchtMax(), venster:vensterNu()};
    });
    console.log('TRAAG', JSON.stringify(traag));
    check('worstelen: plafond 5, venster 4', traag.max === 5 && traag.venster === 4, traag);

    // 3. T blijft binnen 0..1, ook bij onzin-invoer
    const grens = await p.evaluate(() => {
      const uit = [];
      for(const [u, ms] of [["juist",0],["juist",-99],["fout",1e9],["tikfout",2500],["bijna",3000]]){
        for(let i = 0; i < 30; i++) tempoBij(u, ms, {getypt:true}, 40);
        uit.push(+S.profiel.tempo.toFixed(3));
      }
      S.profiel.tempo = NaN; S.profiel.tempo = klem01(S.profiel.tempo, 0.5);
      uit.push(S.profiel.tempo);
      return uit;
    });
    console.log('GRENZEN', JSON.stringify(grens));
    check('T blijft altijd in [0,1] en herstelt van onzin',
          grens.every(x => x >= 0 && x <= 1) && grens[grens.length-1] === 0.5, grens);

    // 4. de lengtecorrectie bij typen: een lang antwoord mag niet als traag gelden
    const lengte = await p.evaluate(() => ({
      kort_snel:  +vlotheid("juist", 3000, {getypt:true}, 5).toFixed(3),
      lang_zelfde:+vlotheid("juist", 7000, {getypt:true}, 30).toFixed(3),
      kort_traag: +vlotheid("juist", 7000, {getypt:true}, 5).toFixed(3),
      mc_snel:    +vlotheid("juist", 2000, {mc:true}, 5).toFixed(3),
      mc_traag:   +vlotheid("juist", 12000, {mc:true}, 5).toFixed(3),
      tikfout:    +vlotheid("tikfout", 1000, {getypt:true}, 5).toFixed(3),
      fout:       vlotheid("fout", 1000, {getypt:true}, 5)
    }));
    console.log('VLOTHEID', JSON.stringify(lengte));
    check('lang antwoord krijgt meer tijd dan kort', lengte.lang_zelfde === 1 && lengte.kort_traag < 1, lengte);
    check('meerkeuze: snel = 1, traag = 0,5', lengte.mc_snel === 1 && lengte.mc_traag === 0.5, lengte);
    check('tikfout telt mee maar iets lager, fout is 0',
          lengte.tikfout === 0.9 && lengte.fout === 0, lengte);

    // 5. een vaste keuze negeert T
    const vast = await p.evaluate(() => {
      const uit = {};
      for(let i = 0; i < 40; i++) tempoBij("juist", 1000, {mc:true}, 5);   // T hoog
      for(const k of ["rustig","normaal","snel"]){
        S.settings.tempo = k; uit[k] = [luchtMax(), vensterNu()];
      }
      S.settings.tempo = "auto"; uit.auto = [luchtMax(), vensterNu()];
      return uit;
    });
    console.log('VAST', JSON.stringify(vast));
    check('vaste keuze negeert T, venster blijft 5',
          vast.rustig[0] === 5 && vast.normaal[0] === 10 && vast.snel[0] === 14 &&
          vast.rustig[1] === 5 && vast.snel[1] === 5 && vast.auto[0] === 14, vast);

    // 6. het plafond stuurt echt het aantal introducties in een ronde
    const echt = async (tempo) => await p.evaluate((tempo) => {
      S = leegProfiel();
      S.settings.tempo = tempo;
      S.settings.pakket = CAPUTS[0].secties.map(s => s.key); herbouwPak();
      startRonde({lengte:20});
      let intros = 0, herhaald = 0;
      const gezien = new Set();
      for(let i = 0; i < 20; i++){
        const v = kiesVraag(); if(!v) break;
        if(v.it.box === 0) intros++;
        if(gezien.has(v.nr + ":" + v.r)) herhaald++;
        gezien.add(v.nr + ":" + v.r);
        // beantwoord juist, zonder de UI
        v.it.box = Math.min(5, v.it.box + 1); v.it.vragenSindsdien = 0;
        v.it.laatstGezien = new Date().toISOString();
        noteerGesteld(v.nr); tikVragen();
      }
      return {intros, herhaald, lucht:inLucht(), plafond:luchtMax()};
    }, tempo);

    const r1 = await echt("rustig"), r2 = await echt("snel");
    console.log('RONDE rustig', JSON.stringify(r1), 'snel', JSON.stringify(r2));
    check('rustig introduceert minder nieuwe woorden dan snel',
          r1.intros < r2.intros, {r1, r2});
    check('rustig blijft onder zijn plafond', r1.lucht <= r1.plafond + 1, r1);

    // 7. echte ronde door de UI: de bedrading (vraagStart + tempoBij in verwerk)
    const echteRonde = await p.evaluate(async () => {
      zetSave(leegProfiel()); herbouwPak(); bewaar();
      S.profiel.tempo = 0.5;
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
          await new Promise(r => setTimeout(r, 20));
        }
        await new Promise(r => setTimeout(r, 250));
        const b = document.querySelector('#resHome'); if(b) b.click();
        await new Promise(r => setTimeout(r, 150));
        return +S.profiel.tempo.toFixed(3);
      };
      const naGoed = await speel(false);
      const naFout = await speel(true);
      return {naGoed, naFout};
    });
    console.log('ECHTE RONDE', JSON.stringify(echteRonde));
    check('een snelle, juiste ronde duwt T omhoog', echteRonde.naGoed > 0.5, echteRonde);
    check('een foute ronde duwt T weer omlaag', echteRonde.naFout < echteRonde.naGoed, echteRonde);

    console.log('FOUTEN', fouten.length); fouten.slice(0,5).forEach(f => console.log('  !', f));
    check('nul console/pageerrors', fouten.length === 0, fouten.slice(0,3));
  } finally {
    await b.close();
  }
  const mis = checks.filter(c => !c.ok).length;
  console.log(`SAMENVATTING smoke-8: ${checks.length - mis}/${checks.length} checks OK`);
  process.exit(mis ? 1 : 0);
})();
