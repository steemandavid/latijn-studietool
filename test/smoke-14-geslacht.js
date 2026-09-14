/* smoke-14 — het geslacht bij de genitiefvraag (§7.2a, aanvaardingscriterium 48).
 *
 * Bij élk zelfstandig naamwoord hoort het geslacht bij het antwoord. Het boek drukt er
 * 153; de andere 190 zijn uit de verbuiging afgeleid (tabel achterin woordenlijst.md) en
 * dragen `ga: 1`. Alleen alter en plērīque krijgen er geen: dat zijn voornaamwoordelijke
 * bijvoeglijke naamwoorden met alle drie de geslachten.
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

    /* ---------- 1: welke woorden dragen een geslacht ---------- */
    const telling = await p.evaluate(()=>{
      const znw = W.filter(w=>w.soort==="znw");
      return {znw:znw.length, metG:znw.filter(w=>w.g).length,
              gedrukt: znw.filter(w=>w.g && !w.ga).length,
              afgeleid: znw.filter(w=>w.ga).length,
              anderSoortMetG: W.filter(w=>w.g && w.soort!=="znw").length,
              zonderG: znw.filter(w=>!w.g).map(w=>w.nr),
              gedruktInVol: znw.filter(w=>w.ga && !w.vol.endsWith(", "+w.g)).length,
              geslInV: znw.filter(w=>w.ga && /,\s*(m|v|o)\./.test(w.v)).length,
              dux: W.find(w=>w.nr===52).g, amicus: W.find(w=>w.nr===2).g};
    });
    console.log("TELLING", JSON.stringify(telling));
    check('343 van de 345 zelfstandige naamwoorden dragen een geslacht: 153 gedrukt, 190 afgeleid',
          telling.znw===345 && telling.metG===343 &&
          telling.gedrukt===153 && telling.afgeleid===190, telling);
    check('alleen alter (174) en plērīque (247) krijgen er geen — die hebben alle drie',
          telling.zonderG.length===2 && telling.zonderG[0]===174 && telling.zonderG[1]===247,
          telling.zonderG);
    check('alleen zelfstandige naamwoorden dragen er een',
          telling.anderSoortMetG===0, telling);
    check('een afgeleid geslacht staat in vol (het antwoord) maar nooit in v (de transcriptie)',
          telling.gedruktInVol===0 && telling.geslInV===0, telling);
    check('dux draagt m. uit het boek, amīcus m. uit de afleiding',
          telling.dux==="m." && telling.amicus==="m.", telling);

    /* ---------- 2: de notatie is vrij, het geslacht niet ---------- */
    const oordeel = await p.evaluate(()=>{
      S=leegProfiel();
      const dux=W.find(x=>x.nr===52), dies=W.find(x=>x.nr===114),
            mai=W.find(x=>x.nr===230), vis=W.find(x=>x.nr===208), am=W.find(x=>x.nr===2);
      const u=(s,w)=>{const r=beoordeel(s,w,"L2V"); return r.geslacht?r.uit+":"+r.geslacht:r.uit;};
      return {
        juist: ["ducis, m.","ducis m.","ducis m","ducis (m.)","ducis;m","ducis mannelijk",
                "ducis, mann.","ducis, masc."].map(s=>[s,u(s,dux)]),
        fout:  ["ducis","ducis, v.","ducis, o.","ducis, x"].map(s=>[s,u(s,dux)]),
        dies:  ["diēī, m./v.","diei m/v","diei, m. en v.","diei, m.","diei"].map(s=>[s,u(s,dies)]),
        mv:    ["māiōrum, m. mv.","maiorum m mv","maiorum, m.","maiorum"].map(s=>[s,u(s,mai)]),
        vis:   ["geen gen., v.","geen gen v","geen gen."].map(s=>[s,u(s,vis)]),
        amicus:["amīcī, m.","amici m","amici mannelijk","amici","amici, v."].map(s=>[s,u(s,am)]),
        vnw:   ["altera, alterum; alterīus","altera alterum alterius"]
                 .map(s=>[s,u(s,W.find(x=>x.nr===174))])
      };
    });
    for(const [k,rij] of Object.entries(oordeel)){
      console.log(" ", k.toUpperCase());
      for(const [s,r] of rij) console.log("    ", JSON.stringify(s).padEnd(24), r);
    }
    check('elke schrijfwijze van het geslacht telt als juist',
          oordeel.juist.every(([,r])=>r==="juist"), oordeel.juist.filter(([,r])=>r!=="juist"));
    check('zonder of met het verkeerde geslacht is fout, met de reden erbij',
          oordeel.fout[0][1]==="fout:vergeten" && oordeel.fout[1][1]==="fout:fout" &&
          oordeel.fout[2][1]==="fout:fout" && oordeel.fout[3][1]==="fout", oordeel.fout);
    check('m./v. vraagt beide geslachten, één ervan volstaat niet',
          oordeel.dies.slice(0,3).every(([,r])=>r==="juist") &&
          oordeel.dies[3][1]==="fout:fout" && oordeel.dies[4][1]==="fout:vergeten", oordeel.dies);
    check('mv. is een meervoudsmerk en mag wegblijven',
          oordeel.mv.slice(0,3).every(([,r])=>r==="juist") &&
          oordeel.mv[3][1]==="fout:vergeten", oordeel.mv);
    check('een punt is een afkortingsteken, geen leerstof ("geen gen." = "geen gen")',
          oordeel.vis[0][1]==="juist" && oordeel.vis[1][1]==="juist" &&
          oordeel.vis[2][1]==="fout:vergeten", oordeel.vis);
    check('een afgeleid geslacht telt net zo hard mee als een gedrukt',
          oordeel.amicus.slice(0,3).every(([,r])=>r==="juist") &&
          oordeel.amicus[3][1]==="fout:vergeten" && oordeel.amicus[4][1]==="fout:fout",
          oordeel.amicus);
    check('bij een woord zonder geslacht (alter) blijft de vorm alleen gewoon juist',
          oordeel.vnw.every(([,r])=>r==="juist"), oordeel.vnw);

    /* ---------- 3: over de hele lijst ---------- */
    const sweep = await p.evaluate(()=>{
      S=leegProfiel();
      const G=/,\s*(m\.\/v\.|m\. en v\.|m\. mv\.|v\. mv\.|o\. mv\.|m\.|v\.|o\.)\s*$/;
      const los = s => s.replace(/[,;]/g," ").replace(/\s+/g," ").trim();
      const gedrukt=[], streng=[], kaal=[], vrij=[], notatie=[];
      const VAR={m:["m","m.","mannelijk","masc."], v:["v","v.","vrouwelijk","f."],
                 o:["o","o.","onzijdig","n."], mv:["m/v","m./v.","m. en v."]};
      for(const w of W){
        if(w.soort==="geen") continue;
        const vol=w.vol||w.v;
        for(const v of [vol, deMacron(vol), los(vol)])
          if(beoordeel(v,w,"L2V").uit!=="juist") gedrukt.push([w.nr,vol,v]);
        S.settings.strengheid="streng";
        if(beoordeel(vol,w,"L2V").uit!=="juist") streng.push([w.nr,vol]);
        S.settings.strengheid="soepel";
        if(w.g){
          const zonder=vol.replace(G,"");
          const r=beoordeel(zonder,w,"L2V");
          if(!(r.uit==="fout" && r.vorm==="juist" && r.geslacht==="vergeten"))
            kaal.push([w.nr,vol,zonder,r]);
          for(const g of VAR[geslKern(w.g)]||[])
            if(beoordeel(zonder+", "+g,w,"L2V").uit!=="juist") notatie.push([w.nr,w.g,g]);
          // en elk ánder geslacht moet fout zijn — anders leert de app een fout antwoord aan
          const ALT={m:["v.","o."],v:["m.","o."],o:["m.","v."],mv:["m.","v.","o."]};
          for(const alt of ALT[geslKern(w.g)]||[])
            if(beoordeel(zonder+", "+alt,w,"L2V").uit!=="fout") vrij.push([w.nr,w.g,alt]);
        }
      }
      return {gedrukt, streng, kaal, vrij, notatie,
              n:W.filter(x=>x.soort!=="geen").length};
    });
    console.log("SWEEP", JSON.stringify({vormen:sweep.n, gedrukt:sweep.gedrukt.length,
      streng:sweep.streng.length, kaal:sweep.kaal.length, vrij:sweep.vrij.length,
      notatie:sweep.notatie.length}));
    check('elke gedrukte vorm blijft juist, met en zonder macrons en scheidingstekens',
          sweep.gedrukt.length===0, sweep.gedrukt.slice(0,5));
    check('strenge modus aanvaardt nog steeds precies wat er gedrukt staat',
          sweep.streng.length===0, sweep.streng.slice(0,5));
    check('bij alle 343 is de vorm zonder geslacht fout, met "vergeten" als reden',
          sweep.kaal.length===0, sweep.kaal.slice(0,5));
    check('alle notatievarianten van elk gedrukt geslacht worden aanvaard',
          sweep.notatie.length===0, sweep.notatie.slice(0,5));
    check('een verkeerd geslacht wordt bij geen enkel woord goedgerekend',
          sweep.vrij.length===0, sweep.vrij.slice(0,5));

    /* ---------- 4: de vraagkop zegt het, de meerkeuze test het ---------- */
    const kop = await p.evaluate(()=>{
      S=leegProfiel();
      const dux=W.find(x=>x.nr===52), am=W.find(x=>x.nr===2);
      const tekst = w => vraagKop(w,"L2V").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
      // meerkeuze: onder de afleiders hoort de juiste vorm met een ander geslacht
      const G=/,\s*(m\.\/v\.|m\. en v\.|m\. mv\.|v\. mv\.|o\. mv\.|m\.|v\.|o\.)\s*$/;
      /* De morfologische afleiders (§7.2) zetten dezelfde stam in andere uitgangen. Waar
         dat niet kan — vīs heeft geen genitief, rēs pūblica is twee woorden — valt de app
         terug op vormen van andere woorden en is er geen valstrik te zetten. Die twee
         uitzonderingen horen benoemd te worden, niet weggemiddeld. */
      let metValstrik=0, gemeten=0, geenMorf=[];
      for(const w of W.filter(x=>x.g)){
        if(!genAfleiders(w,3)){ geenMorf.push(w.nr); continue; }
        const opts = afleiderTeksten(w,"L2V",3);
        gemeten++;
        const juisteVorm = norm((w.vol||w.v).replace(G,""));
        if(opts.some(o => norm(o.replace(G,"")) === juisteVorm)) metValstrik++;
      }
      return {dux:tekst(dux), amicus:tekst(am), gemeten, metValstrik, geenMorf};
    });
    console.log("KOP dux    :", kop.dux);
    console.log("KOP amīcus :", kop.amicus);
    console.log("MEERKEUZE  :", kop.metValstrik, "van de", kop.gemeten,
                "met een geslachtsvalstrik; zonder morfologische afleiders:",
                JSON.stringify(kop.geenMorf));
    check('de kop vraagt zichtbaar naar het geslacht, gedrukt of afgeleid',
          /genitief en het geslacht/.test(kop.dux) &&
          /genitief en het geslacht/.test(kop.amicus), kop);
    check('de meerkeuze zet het geslacht op de proef in plaats van het weg te geven',
          kop.gemeten>=340 && kop.metValstrik===kop.gemeten, kop);
    check('alleen vīs (208) en rēs pūblica (552) missen morfologische afleiders',
          kop.geenMorf.length===2 && kop.geenMorf[0]===208 && kop.geenMorf[1]===552,
          kop.geenMorf);

    console.log("FOUTEN", f.length);
    check('nul console/pageerrors', f.length===0, f.slice(0,3));
  }finally{
    await b.close();
  }
  const mis=checks.filter(c=>!c.ok).length;
  console.log(`SAMENVATTING smoke-14: ${checks.length-mis}/${checks.length} checks OK`);
  process.exit(mis?1:0);
})();
