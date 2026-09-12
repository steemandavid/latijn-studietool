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
    const r=await p.evaluate(()=>{
      S=leegProfiel(); S.settings.pakket=ALLE_SEC.slice(); herbouwPak();
      const metVorm = W.find(w=>w.soort!=="geen").nr;
      const zonder  = W.find(w=>w.soort==="geen").nr;
      const tab=[];
      for(let a=0;a<=5;a++) for(let bb=0;bb<=5;bb++){
        item(metVorm,"L2N").box=a; item(metVorm,"L2V").box=bb;
        tab.push({L2N:a,L2V:bb,ster:sterren(metVorm)});
      }
      const zonderTab=[];
      for(let a=0;a<=5;a++){ item(zonder,"L2N").box=a; zonderTab.push({box:a,ster:sterren(zonder)}); }
      // regels die moeten gelden — in béíde richtingen van de tabel
      const goudFouten = tab.filter(t=>(t.ster===5) !== (t.L2N===5&&t.L2V===5));
      const nulFouten  = tab.filter(t=>(t.ster===0) !== (t.L2N===0&&t.L2V===0));
      const monotoonL2N = tab.filter(t=>{
        const meer = tab.find(u=>u.L2N===Math.min(5,t.L2N+1)&&u.L2V===t.L2V);
        return meer && meer.ster < t.ster;
      });
      const monotoonL2V = tab.filter(t=>{
        const meer = tab.find(u=>u.L2V===Math.min(5,t.L2V+1)&&u.L2N===t.L2N);
        return meer && meer.ster < t.ster;
      });
      return {tab, zonderTab, goudFouten, nulFouten, monotoonL2N, monotoonL2V};
    });
    const g=(a,b)=>r.tab.find(t=>t.L2N===a&&t.L2V===b).ster;
    console.log("STERREN — woord MET tweede vorm (rij = L2N, kolom = L2V)");
    console.log("      L2V: 0  1  2  3  4  5");
    for(let a=0;a<=5;a++) console.log(`  L2N=${a}:     ` + [0,1,2,3,4,5].map(b=>String(g(a,b)).padStart(2)).join(" "));
    console.log("STERREN — woord ZONDER tweede vorm:", JSON.stringify(r.zonderTab.map(x=>x.ster)));
    check('goud alleen bij 5+5', r.goudFouten.length===0, r.goudFouten);
    check('0 sterren alleen bij 0+0', r.nulFouten.length===0, r.nulFouten);
    check('monotoon in de L2N-richting', r.monotoonL2N.length===0, r.monotoonL2N);
    check('monotoon in de L2V-richting', r.monotoonL2V.length===0, r.monotoonL2V);
    console.log("FOUTEN", f.length);
    check('nul console/pageerrors', f.length===0, f.slice(0,3));
  }finally{
    await b.close();
  }
  const mis=checks.filter(c=>!c.ok).length;
  console.log(`SAMENVATTING smoke-5: ${checks.length-mis}/${checks.length} checks OK`);
  process.exit(mis?1:0);
})();
