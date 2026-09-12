const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const PAD='file:///home/john/claudecode/projects/latijn-studietool/verba/index.html';
const OUT=path.join(__dirname, 'shots');
const checks = [];
const check = (naam, ok, detail) => {
  checks.push({naam, ok});
  console.log((ok ? '  ✓ ' : '  ✗ FAIL ') + naam + (ok ? '' : ' — ' + JSON.stringify(detail)));
};
(async()=>{
  fs.mkdirSync(OUT, {recursive:true});
  const b=await chromium.launch({executablePath:'/home/john/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome'});
  try{
    const p=await b.newPage({viewport:{width:1280,height:900}});
    const fouten=[]; p.on('pageerror',e=>fouten.push(e.message));
    p.on('console',m=>{if(m.type()==='error')fouten.push(m.text());});
    await p.goto(PAD); await p.waitForTimeout(400);

    // invariant in STRENGE modus
    const inv=await p.evaluate(()=>{
      S.settings.strengheid="streng";
      const slecht=[];
      for(const w of W) for(const r of RICHTINGEN(w)){
        const m=juisteTekst(w,r);
        if(beoordeel(m,w,r).uit!=="juist") slecht.push({nr:w.nr,r,m});
        if(beoordeel(deMacron(m),w,r).uit!=="juist") slecht.push({nr:w.nr,r,m:"[mac]"+m});
      }
      S.settings.strengheid="soepel";
      return {aantal:slecht.length, eerste:slecht.slice(0,5)};
    });
    console.log('INVARIANT-STRENG', JSON.stringify(inv));
    check('invariant strenge modus: 0 afwijkingen', inv.aantal===0, inv.eerste);

    // realistische voortgang zetten voor de screenshots
    await p.evaluate(()=>{
      S.settings.pakket = CAPUTS[0].secties.map(s=>s.key).concat(CAPUTS[1].secties.map(s=>s.key));
      herbouwPak();
      W.forEach((w,i)=>{
        const doel = i<120 ? 5 : i<200 ? 3 : i<260 ? 1 : 0;
        if(doel) RICHTINGEN(w).forEach(r=>{ item(w.nr,r).box=doel; item(w.nr,r).juist=doel*2; });
      });
      S.profiel.xp=3400; S.profiel.level=levelVan(3400); S.profiel.streak=4;
      S.profiel.totaalRondes=12; S.profiel.totaalJuist=210; S.profiel.totaalFout=44;
      S.profiel.vormJuist=80; S.profiel.vormFout=30; S.profiel.besteCombo=11; S.profiel.blitzRecord=17;
      S.profiel.totaleTijdMs=52*60000;
      S.profiel.streakGeschiedenis=[...Array(6)].map((_,k)=>{
        const d=new Date(Date.now()-k*864e5);
        return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");});
      S.secties["1.0"]={veroverd:true,besteScore:41,pogingen:2};
      S.secties["1.1"]={veroverd:true,besteScore:15,pogingen:1};
      S.badges={primus:"x",caput1:"x",centum:"x",week:"x"};
      S.tesserae={tessera:"x",stilus:"x",amphora:"x",lucerna:"x",corona:"x",gladius:"x"};
      bewaar(); renderHome();
    });
    await p.waitForTimeout(400);
    await p.screenshot({path:OUT+'/1-home.png', fullPage:false});

    const goud=await p.evaluate(()=>({goud:goudAantal(), tekst:document.querySelector('#goudTxt').textContent,
                                      s5:document.querySelectorAll('.cel.s5').length,
                                      s34:document.querySelectorAll('.cel.s34').length,
                                      buiten:document.querySelectorAll('.cel.buiten').length}));
    console.log('MOZAIEK', JSON.stringify(goud));
    check('mozaïek kleurt en dimt (s5>0, s34>0, buiten>0)',
          goud.s5>0 && goud.s34>0 && goud.buiten>0, goud);

    await p.evaluate(()=>{ startRonde({}); });
    await p.waitForTimeout(400);
    await p.screenshot({path:OUT+'/2-vraag.png'});

    await p.evaluate(()=>{ rondeId++; Q=null; renderVerover(); toon('verover');
                           document.querySelectorAll('details')[0].open=true; });
    await p.waitForTimeout(300);
    await p.screenshot({path:OUT+'/3-verover.png'});

    await p.evaluate(()=>{ renderTess(); toon('tess'); });
    await p.waitForTimeout(400);
    await p.screenshot({path:OUT+'/4-collectie.png'});

    await p.evaluate(()=>{ renderStats(); toon('stats'); });
    await p.waitForTimeout(300);
    await p.screenshot({path:OUT+'/5-stats.png'});

    const p2=await b.newPage({viewport:{width:360,height:760}});
    await p2.goto(PAD); await p2.waitForTimeout(500);
    await p2.screenshot({path:OUT+'/6-mobiel.png'});
    const sc=await p2.evaluate(()=>({sw:document.documentElement.scrollWidth,
                                     cw:document.documentElement.clientWidth}));
    console.log('MOBIEL', JSON.stringify(sc));
    check('geen horizontale scroll op 360 px', sc.sw<=sc.cw, sc);

    console.log('FOUTEN', fouten.length); fouten.slice(0,6).forEach(f=>console.log('  !',f));
    check('nul console/pageerrors', fouten.length===0, fouten.slice(0,3));
  }finally{
    await b.close();
  }
  const mis=checks.filter(c=>!c.ok).length;
  console.log(`SAMENVATTING smoke-3: ${checks.length-mis}/${checks.length} checks OK`);
  console.log('Screenshots in', OUT);
  process.exit(mis?1:0);
})();
