const { chromium } = require('playwright');
const PAD='file:///home/john/claudecode/projects/latijn-studietool/verba/index.html';
const checks = [];
const check = (naam, ok, detail) => {
  checks.push({naam, ok});
  console.log((ok ? '  ✓ ' : '  ✗ FAIL ') + naam + (ok ? '' : ' — ' + JSON.stringify(detail)));
};
(async()=>{
  const b=await chromium.launch({executablePath:'/home/john/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome'});
  try{
    const p=await b.newPage(); const f=[];
    p.on('pageerror',e=>f.push(e.message)); p.on('console',m=>{if(m.type()==='error')f.push(m.text());});
    await p.goto(PAD); await p.waitForTimeout(300);

    const r = await p.evaluate(async () => {
      // vers profiel, alleen sectie 1.0
      S = leegProfiel(); S.settings.pakket=["1.0"]; herbouwPak(); bewaar();

      // simuleer een blitz: 20 vragen, 14 juist / 6 fout, op verschillende woorden
      const gebruikt=[];
      for(let i=0;i<20;i++){
        const nr = PAK[i];                       // 20 verschillende woorden
        const w = BY_NR[nr];
        const v = {nr, r:"L2N", it:item(nr,"L2N")};
        Q = {id:++rondeId, modus:"blitz", i:0, goed:0, fout:0, bijna:0, xp:0, besteCombo:0,
             start:Date.now(), gezien:new Set(), omhoog:[], missers:[]};
        rondeCtx=Q;
        verwerk(i%4===3 ? "fout" : "juist", w, v, {mc:true});
        gebruikt.push({nr, kop:w.kop, soort:w.soort, uitkomst:i%4===3?"fout":"juist"});
      }
      const boxen = gebruikt.map(g=>({...g,
        L2N:item(g.nr,"L2N").box,
        L2V:BY_NR[g.nr].soort!=="geen"?item(g.nr,"L2V").box:null,
        sterren:sterren(g.nr)}));
      renderHome();
      return {
        gekleurd: document.querySelectorAll('.cel.s12,.cel.s34,.cel.s5').length,
        juistAantal: gebruikt.filter(g=>g.uitkomst==="juist").length,
        foutAantal:  gebruikt.filter(g=>g.uitkomst==="fout").length,
        detail: boxen.slice(0,10),
        metSterren: boxen.filter(b=>b.sterren>0).map(b=>`${b.kop}(${b.soort},${b.uitkomst},L2N=${b.L2N})`)
      };
    });
    console.log("BLITZ OP VERS PAKKET");
    console.log("  juist:", r.juistAantal, "· fout:", r.foutAantal, "· gekleurde tegels:", r.gekleurd);
    console.log("  tegels met >0 sterren:", JSON.stringify(r.metSterren));
    console.log("  eerste 10 woorden:");
    r.detail.forEach(d=>console.log(`   ${String(d.nr).padStart(4)} ${d.kop.padEnd(14)} ${d.soort.padEnd(5)} ${d.uitkomst.padEnd(6)} L2N=${d.L2N} L2V=${d.L2V} -> ${d.sterren} ster`));
    check('alle 20 aangeraakte woorden kleuren in het mozaïek', r.gekleurd===20, r.gekleurd);
    check('elk aangeraakt woord heeft >0 sterren', r.metSterren.length===20, r.metSterren);
    /* --- de caputs van "Jouw woordenlijst" klappen in en uit (§6.1) --- */
    const inklap = await p.evaluate(async () => {
      const caput = () => document.querySelector('#moz .mozcap:nth-child(2)');
      const open  = () => caput().querySelector('.mozsecs').classList.contains('op');
      const uit = {allesOpen: document.querySelectorAll('#moz .mozsecs.op').length};
      caput().querySelector('h3').click();
      uit.naKlik = open();
      uit.pijl   = caput().querySelector('.pijl').textContent.trim();
      uit.aria   = caput().querySelector('.pijl').getAttribute('aria-expanded');
      uit.kopBlijft = caput().querySelector('h3').offsetHeight > 0;
      uit.rest   = document.querySelectorAll('#moz .mozsecs.op').length;
      uit.inSave = JSON.parse(localStorage.getItem('verba.save.v1')).settings.mozDicht.length;
      renderHome();                      // een re-render mag de stand niet omgooien
      uit.naHertekenen = open();
      caput().querySelector('h3').click();
      uit.weerOpen = open();
      uit.saveLeeg = JSON.parse(localStorage.getItem('verba.save.v1')).settings.mozDicht.length;
      return uit;
    });
    check('bij een verse save staan alle zeven caputs open', inklap.allesOpen===7, inklap.allesOpen);
    check('een klik op de caputkop klapt hem in', inklap.naKlik===false, inklap);
    check('het pijltje en aria-expanded volgen',
          inklap.pijl==='\u25b8' && inklap.aria==='false', inklap);
    check('de kop met de goudteller blijft staan', inklap.kopBlijft===true, inklap);
    check('de andere caputs blijven open', inklap.rest===6, inklap.rest);
    check('de stand staat in de save', inklap.inSave===1, inklap.inSave);
    check('een re-render behoudt de stand', inklap.naHertekenen===false, inklap);
    check('nog een klik zet hem weer open', inklap.weerOpen===true, inklap);
    check('en haalt hem weer uit de save', inklap.saveLeeg===0, inklap.saveLeeg);

    const kapot = await p.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('verba.save.v1'));
      d.settings.mozDicht = "stuk";                 // een save van een oudere/kapotte versie
      localStorage.setItem('verba.save.v1', JSON.stringify(d));
      laad(); renderHome();
      return document.querySelectorAll('#moz .mozsecs.op').length;
    });
    check('een kapotte mozDicht legt niets plat en zet alles open', kapot===7, kapot);

    console.log("FOUTEN", f.length);
    check('nul console/pageerrors', f.length===0, f.slice(0,3));
  }finally{
    await b.close();
  }
  const mis=checks.filter(c=>!c.ok).length;
  console.log(`SAMENVATTING smoke-4: ${checks.length-mis}/${checks.length} checks OK`);
  process.exit(mis?1:0);
})();
