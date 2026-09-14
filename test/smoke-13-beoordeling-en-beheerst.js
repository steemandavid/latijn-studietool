/* smoke-13 — aanvaardingscriteria 46 en 47 van de specificatie (v1.7).
 *
 * 46. De leestekens tussen de betekenissen zijn geen leerstof (§7.4): een vertaling
 *     wordt opgedeeld in aanvaarde betekenissen, niet op ", " gesplitst.
 * 47. Een beheerst item (§4.3) komt niet terug als onderhoudsvulling (§4.5).
 */
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

    /* ---------- 46a: het voorbeeld uit de spec, woord 162 ---------- */
    const spec = await p.evaluate(()=>{
      S=leegProfiel();
      const w = W.find(x=>x.nr===162);          // "(z.) wie?, wat?; (b.) welke?"
      const uit = s => beoordeel(s, w, "L2N").uit;
      return {
        vraag: w.w, antwoord: w.t,
        juist: ["(z.) wie?, wat?; (b.) welke?","wie, wat, welke","wie wat welke",
                "wie?, wat? welke?","wie, wat; welke","wat wie welke",
                "(z) wie, wat; (b) welke","wie","welke","wie wat"].map(s=>[s,uit(s)]),
        fout:  ["wie wie","wie wat welke dat","paard","wie paard",""].map(s=>[s,uit(s)])
      };
    });
    console.log("WOORD 162", spec.vraag, "->", spec.antwoord);
    for(const [s,u] of spec.juist) console.log("   juist? ", JSON.stringify(s).padEnd(32), u);
    for(const [s,u] of spec.fout)  console.log("   fout?  ", JSON.stringify(s).padEnd(32), u);
    check('alle scheidings- en labelvarianten van woord 162 tellen als juist',
          spec.juist.every(([,u])=>u==="juist"), spec.juist.filter(([,u])=>u!=="juist"));
    check('een dubbele of verzonnen betekenis blijft fout',
          spec.fout.every(([,u])=>u==="fout"), spec.fout.filter(([,u])=>u!=="fout"));

    /* ---------- 46b: over de hele woordenlijst ---------- */
    const sweep = await p.evaluate(()=>{
      S=leegProfiel();
      const zonderScheiding = s => s.replace(/[;,]/g," ").replace(/\s+/g," ").trim();
      const misL2N=[], misL2V=[], vals=[];
      for(let i=0;i<W.length;i++){
        const w=W[i];
        for(const v of [w.t, zonderScheiding(w.t), w.t.replace(/;/g,",")])
          if(beoordeel(v,w,"L2N").uit!=="juist") misL2N.push([w.nr,w.t,v]);
        if(w.soort!=="geen"){
          const vol = w.vol||w.v;
          for(const v of [vol, zonderScheiding(vol)])
            if(beoordeel(v,w,"L2V").uit!=="juist") misL2V.push([w.nr,vol,v]);
        }
        // De vertaling van een ánder woord mag niet meetellen — tenzij het echte
        // synoniemen zijn: "omdat" is een gedrukte deelbetekenis van "toen; omdat; hoewel".
        const o = W[(i*37+11)%W.length];
        const delen = t => t.split(/\s*;\s*/).map(x=>x.trim());
        const synoniem = delen(w.t).some(d => delen(o.t).includes(d));
        if(o.nr!==w.nr && !synoniem && ["juist","tikfout"].includes(beoordeel(o.t,w,"L2N").uit))
          vals.push([w.nr,w.t,o.t]);
      }
      return {misL2N, misL2V, vals, n:W.length};
    });
    console.log("SWEEP", JSON.stringify({woorden:sweep.n, misL2N:sweep.misL2N.length,
                 misL2V:sweep.misL2V.length, vals:sweep.vals.length}));
    check('elke gedrukte vertaling wordt aanvaard, ook zonder scheidingstekens',
          sweep.misL2N.length===0, sweep.misL2N.slice(0,5));
    check('elke gedrukte vorm wordt aanvaard, ook zonder scheidingstekens',
          sweep.misL2V.length===0, sweep.misL2V.slice(0,5));
    check('geen vertaling van een ander woord wordt juist gerekend',
          sweep.vals.length===0, sweep.vals.slice(0,5));

    /* ---------- 47a: de beheerst-teller zelf ---------- */
    const teller = await p.evaluate(()=>{
      S=leegProfiel();
      const it = item(1,"L2N");
      const meet = () => ({box:it.box, opRij:it.opRij|0, beheerst:isBeheerst(it)});
      const stap = [];
      it.box=5; it.opRij=0;              stap.push(["box 5, vers", meet()]);
      it.opRij=1;                        stap.push(["1 juist", meet()]);
      it.opRij=2;                        stap.push(["2 juist", meet()]);
      it.opRij=0;                        stap.push(["bijna wist de reeks", meet()]);
      it.box=4; it.opRij=9;              stap.push(["box 4 telt nooit", meet()]);
      // oude save zonder opRij: box 5 gold al als beheerst (§8.4)
      zetSave({app:"verba",version:1,items:{"1:L2N":{box:5,juist:9,fout:0},
                                            "1:L2V":{box:3,juist:2,fout:1}}});
      return {stap, na:{L2N:S.items["1:L2N"], L2V:S.items["1:L2V"]}};
    });
    for(const [naam,m] of teller.stap) console.log("   ", naam.padEnd(24), JSON.stringify(m));
    const verwacht = [false,false,true,false,false];
    check('beheerst = box 5 én twee foutloze beurten',
          teller.stap.every((s,i)=>s[1].beheerst===verwacht[i]), teller.stap);
    console.log("MIGRATIE", JSON.stringify(teller.na));
    check('een save zonder opRij krijgt hem terug: box 5 is beheerst, lagere boxen niet',
          teller.na.L2N.opRij===2 && teller.na.L2V.opRij===0, teller.na);

    /* ---------- 47b: beheerste items verdwijnen uit de rotatie ---------- */
    const rot = await p.evaluate(()=>{
      S=leegProfiel();
      S.settings.pakket=[ALLE_SEC[0]]; herbouwPak();
      // Alles op box 5 en niets due. Eén woord op de vier houden we net níét beheerst
      // (box 5 na een "bijna"): zolang die er zijn, mag er geen beheerst item komen.
      const nu=new Date().toISOString();
      const wankel=new Set();
      PAK.forEach((nr,i)=>{
        for(const r of RICHTINGEN(BY_NR[nr]))
          Object.assign(item(nr,r),{box:5, juist:9, fout:0, opRij:5,
                                    laatstGezien:nu, vragenSindsdien:0});
        if(i%4===0){ item(nr,"L2N").opRij=0; wankel.add(nr+":L2N"); }
      });
      Q={modus:"leer", telWoord:new Map(), typ:0, mc:0, omhoog:[], missers:[], foutRonde:new Set()};
      recenteNrs.length=0;
      const gekozen=[];
      for(let i=0;i<20;i++){
        const v=kiesVraag(); if(!v) break;
        gekozen.push({nr:v.nr, r:v.r, beheerst:isBeheerst(v.it)});
        noteerGesteld(v.nr);
        for(const nr of PAK) for(const r of RICHTINGEN(BY_NR[nr])) item(nr,r).vragenSindsdien++;
        item(v.nr,v.r).vragenSindsdien=0;
      }
      return {pakket:PAK.length, wankel:wankel.size, gekozen};
    });
    console.log("ROTATIE pakket van", rot.pakket, "woorden, allemaal box 5,",
                rot.wankel, "items niet beheerst");
    console.log("  gekozen:", JSON.stringify(rot.gekozen.slice(0,6)));
    const uniek = new Set(rot.gekozen.map(g=>g.nr+":"+g.r)).size;
    check('de vulling rouleert, ze blijft niet op dezelfde items hangen',
          uniek === rot.gekozen.length, {uniek, gesteld:rot.gekozen.length});
    check('geen enkel beheerst item wordt als onderhoudsvulling gesteld',
          rot.gekozen.every(g=>!g.beheerst), rot.gekozen.filter(g=>g.beheerst).slice(0,5));

    /* ---------- 47c: onderhoud kiest het langst niet gestelde item ---------- */
    const oudste = await p.evaluate(()=>{
      S=leegProfiel();
      S.settings.pakket=[ALLE_SEC[0]]; herbouwPak();
      const nu=new Date().toISOString();
      for(const nr of PAK) for(const r of RICHTINGEN(BY_NR[nr])){
        // box 4: onderhoud, nooit beheerst, en door de 3 dagen wachttijd niet due
        Object.assign(item(nr,r),{box:4, juist:4, fout:0, opRij:4,
                                  laatstGezien:nu, vragenSindsdien:1});
      }
      const doel = PAK[7];
      item(doel,"L2N").vragenSindsdien = 500;   // deze wacht veruit het langst
      Q={modus:"leer", telWoord:new Map(), typ:0, mc:0, omhoog:[], missers:[], foutRonde:new Set()};
      recenteNrs.length=0;
      const v=kiesVraag();
      return {doel, gekozen:{nr:v.nr, r:v.r, wacht:v.it.vragenSindsdien}};
    });
    console.log("OUDSTE", JSON.stringify(oudste));
    check('onderhoud kiest het item dat het langst niet gesteld is',
          oudste.gekozen.nr===oudste.doel && oudste.gekozen.r==="L2N", oudste);

    console.log("FOUTEN", f.length);
    check('nul console/pageerrors', f.length===0, f.slice(0,3));
  }finally{
    await b.close();
  }
  const mis=checks.filter(c=>!c.ok).length;
  console.log(`SAMENVATTING smoke-13: ${checks.length-mis}/${checks.length} checks OK`);
  process.exit(mis?1:0);
})();
