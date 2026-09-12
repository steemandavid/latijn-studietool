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
    console.log("FOUTEN", f.length);
    check('nul console/pageerrors', f.length===0, f.slice(0,3));
  }finally{
    await b.close();
  }
  const mis=checks.filter(c=>!c.ok).length;
  console.log(`SAMENVATTING smoke-4: ${checks.length-mis}/${checks.length} checks OK`);
  process.exit(mis?1:0);
})();
