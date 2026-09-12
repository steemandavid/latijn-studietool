const { chromium } = require('playwright');
const PAD = 'file:///home/john/claudecode/projects/latijn-studietool/verba/index.html';
const checks = [];
const check = (naam, ok, detail) => {
  checks.push({naam, ok});
  console.log((ok ? '  ✓ ' : '  ✗ FAIL ') + naam + (ok ? '' : ' — ' + JSON.stringify(detail)));
};
(async () => {
  const b = await chromium.launch({executablePath:'/home/john/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome'});
  try{
    const p = await b.newPage();
    const fouten = [];
    p.on('console', m => { if(m.type()==='error') fouten.push(m.text()); });
    p.on('pageerror', e => fouten.push('PAGEERROR: '+e.message));
    await p.goto(PAD); await p.waitForTimeout(300);

    // Alles in box 4 -> moet TYPEN opleveren
    const typtest = await p.evaluate(async () => {
      S.settings.pakket = ["1.0"]; herbouwPak();
      PAK.forEach(nr => RICHTINGEN(BY_NR[nr]).forEach(r => {
        const it = item(nr,r); it.box = 4; it.vragenSindsdien = 99; it.laatstGezien = null;
      }));
      bewaar();
      let typ=0, mc=0, intro=0, stap=0;
      document.querySelector('#btnLeer').click();
      // 600 ms feedback per vraag ≈ 16 loopiteraties per vraag — budget ruim boven
      // het nodige houden, anders flaket de test op traagere machines.
      while(document.querySelector('#scr-quiz.on') && stap++ < 600){
        const nx = document.querySelector('#fbNext');
        if(nx){ nx.click(); await new Promise(r=>setTimeout(r,30)); continue; }
        if(document.querySelector('#introOk')){ intro++; document.querySelector('#introOk').click(); }
        else if(document.querySelector('#opts .optie:not([disabled])')) { mc++;
          document.querySelector('#opts .optie').click(); }
        else if(document.querySelector('#tIn')){ typ++;
          const inp = document.querySelector('#tIn');
          inp.value = juisteTekst(BY_NR[Q.huidig.nr], Q.huidig.r);
          document.querySelector('#tOk').click(); }
        await new Promise(r=>setTimeout(r,40));
      }
      await new Promise(r=>setTimeout(r,300));
      return {pogingen:typ, vragenGesteld:(Q?Q.i:null), mc, intro, scherm:document.querySelector('.screen.on').id};
    });
    console.log('TYPEN', JSON.stringify(typtest));
    check('box 3+ levert typevragen op', typtest.pogingen>0 && typtest.mc===0, typtest);
    check('ronde loopt tot het resultaatscherm', typtest.scherm==='scr-res', typtest.scherm);

    // Fout antwoord -> box terug naar 1, feedback blijft staan
    const fouttest = await p.evaluate(async () => {
      rondeId++; Q=null; toon('home');
      await new Promise(r=>setTimeout(r,700));
      const voor = {};
      document.querySelector('#btnLeer').click();
      await new Promise(r=>setTimeout(r,60));
      while(!document.querySelector('#tIn') && document.querySelector('#scr-quiz.on')){
        const nx=document.querySelector('#fbNext'); if(nx){nx.click();}
        else if(document.querySelector('#introOk')) document.querySelector('#introOk').click();
        else if(document.querySelector('#opts .optie')) document.querySelector('#opts .optie').click();
        await new Promise(r=>setTimeout(r,40));
      }
      if(!document.querySelector('#tIn')) return {overgeslagen:true};
      const nr = Q.huidig.nr, r = Q.huidig.r;
      voor.box = item(nr,r).box;
      document.querySelector('#tIn').value = "zzzzonzin";
      document.querySelector('#tOk').click();
      await new Promise(r=>setTimeout(r,200));
      return {boxVoor:voor.box, boxNa:item(nr,r).box, combo,
              feedbackZichtbaar: !!document.querySelector('.fb.fout'),
              volgendeKnop: !!document.querySelector('#fbNext'),
              toontAntwoord: (document.querySelector('.fb.fout .antw')||{}).textContent};
    });
    console.log('FOUT', JSON.stringify(fouttest));
    check('fout antwoord -> box 1 en blijvende feedback',
          !fouttest.overgeslagen && fouttest.boxNa===1 && fouttest.feedbackZichtbaar
          && fouttest.volgendeKnop && !!fouttest.toontAntwoord, fouttest);
    check('fout antwoord breekt de combo (chip uit)', !fouttest.overgeslagen && fouttest.combo===0, fouttest);

    // tikfout: één letter mis (sinds 2026-09-12 telt die als juist, §7.4)
    const bijna = await p.evaluate(async () => {
      const w = BY_NR[694];  // hōra / hōrae / het uur
      const r1 = beoordeel("het uue", w, "L2N");
      S.settings.strengheid = "streng";
      const r2 = beoordeel("het uue", w, "L2N");
      const r3 = beoordeel("uur", w, "L2N");        // lidwoord weg in strenge modus
      S.settings.strengheid = "soepel";
      const r4 = (()=>{S.settings.strengheid="streng";const x=beoordeel("het uur",w,"L2N");S.settings.strengheid="soepel";return x;})();
      return {soepel:r1.uit, streng:r2.uit, strengZonderLidwoord:r3.uit, strengVolledig:r4.uit};
    });
    console.log('TIKFOUT', JSON.stringify(bijna));
    check('soepel: typfout = tikfout (telt als juist)', bijna.soepel==='tikfout', bijna);
    check('streng: geen bijna, geen optioneel lidwoord',
          bijna.streng==='fout' && bijna.strengZonderLidwoord==='fout' && bijna.strengVolledig==='juist', bijna);

    // backup roundtrip
    const backup = await p.evaluate(() => {
      S.profiel.xp = 12345; S.badges["centum"] = "x"; bewaar();
      const kopie = JSON.parse(JSON.stringify(S));
      S = leegProfiel(); bewaar();
      const leeg = S.profiel.xp;
      zetSave(kopie); bewaar();
      return {naWissen:leeg, naHerstel:S.profiel.xp, badge:!!S.badges["centum"],
              items:Object.keys(S.items).length};
    });
    console.log('BACKUP', JSON.stringify(backup));
    check('backup-roundtrip herstelt xp en badges',
          backup.naWissen===0 && backup.naHerstel===12345 && backup.badge===true, backup);

    // importvalidatie: verkeerd getypeerde velden en vreemde backups mogen geen crash geven
    const rot = await p.evaluate(() => {
      const uit = {};
      try{
        // items als string: moet genegeerd worden, geen TypeError op item()
        zetSave({version:1, items:"x"});
        uit.itemsString = Array.isArray(Object.keys(S.items)) && Object.keys(S.items).length===0;
        // onbekende woordnummers + onbekende sectiesleutels: stil laten vallen
        zetSave({version:1, items:{"99999:L2N":{box:3,juist:1,fout:0}}, settings:{pakket:["zzz","1.0"]}});
        herbouwPak(); renderHome();
        uit.onbekendNr = !(S.items["99999:L2N"]);
        uit.pakketGefilterd = JSON.stringify(S.settings.pakket)===JSON.stringify(["1.0"]);
        // een FLUO-achtige backup (version 1 maar zonder verba-marker) weigeren bij import
        uit.fluoGeweigerd = false;
        try{ zetSave({version:1, app:"fluo", profiel:{xp:9}}, true); }
        catch(e){ uit.fluoGeweigerd = true; }
        // eigen save mét marker aanvaarden
        zetSave({version:1, app:"verba", profiel:{xp:7}}, true);
        uit.eigenSave = S.profiel.xp===7;
      }catch(e){ uit.crash = e.message; }
      return uit;
    });
    console.log('ROBUUST', JSON.stringify(rot));
    check('import overleeft verkeerd getypeerde velden',
          rot.itemsString && !rot.crash, rot);
    check('onbekende nrs/secties vallen stil weg',
          rot.onbekendNr && rot.pakketGefilterd, rot);
    check('vreemde backup (FLUO) wordt geweigerd', rot.fluoGeweigerd===true, rot);
    check('eigen backup met verba-marker wordt aanvaard', rot.eigenSave===true, rot);

    // flashcards
    const fl = await p.evaluate(async () => {
      S.settings.pakket = ["1.0"]; herbouwPak();
      renderOntdek(); startFlash();
      const eerste = document.querySelector('#flBox .w').textContent;
      flStap(1);
      const tweede = document.querySelector('#flBox .w').textContent;
      FL.open = true; renderFlash();
      return {eerste, tweede, toontVertaling: !!document.querySelector('#flBox .t'),
              aantal: FL.lijst.length};
    });
    console.log('FLASH', JSON.stringify(fl));
    check('flashcards bladeren en draaien',
          fl.aantal>0 && fl.eerste!==undefined && fl.toontVertaling, fl);

    console.log('FOUTEN', fouten.length);
    fouten.slice(0,8).forEach(f => console.log('   !', f));
    check('nul console/pageerrors', fouten.length===0, fouten.slice(0,3));
  }finally{
    await b.close();
  }
  const mis = checks.filter(c=>!c.ok).length;
  console.log(`SAMENVATTING smoke-2: ${checks.length-mis}/${checks.length} checks OK`);
  process.exit(mis ? 1 : 0);
})();
