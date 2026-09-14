/* smoke-14 — het geslacht bij de genitiefvraag (§7.2a, aanvaardingscriterium 48).
 *
 * Drukt het boek het geslacht (ducis, m.), dan hoort het bij het antwoord. Drukt het
 * boek het niet (avī, rosae, templī), dan vraagt de app er ook niet naar.
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
              anderSoortMetG: W.filter(w=>w.g && w.soort!=="znw").length,
              voorbeeld: W.find(w=>w.nr===52).g, zonder: !!W.find(w=>w.nr===2).g};
    });
    console.log("TELLING", JSON.stringify(telling));
    check('153 van de 345 zelfstandige naamwoorden dragen een gedrukt geslacht',
          telling.znw===345 && telling.metG===153, telling);
    check('alleen zelfstandige naamwoorden dragen er een',
          telling.anderSoortMetG===0, telling);
    check('dux draagt m., amīcus draagt niets',
          telling.voorbeeld==="m." && telling.zonder===false, telling);

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
        amicus:["amīcī","amici","amici, m.","amici, v.","amicus"].map(s=>[s,u(s,am)])
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
    check('waar het boek geen geslacht drukt, straft een vrijwillig geslacht niet',
          oordeel.amicus.slice(0,4).every(([,r])=>r==="juist") &&
          oordeel.amicus[4][1]==="fout", oordeel.amicus);

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
        } else if(w.soort==="znw" && beoordeel(vol+", m.",w,"L2V").uit!=="juist"){
          vrij.push([w.nr,vol]);
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
    check('bij alle 153 is de vorm zonder geslacht fout, met "vergeten" als reden',
          sweep.kaal.length===0, sweep.kaal.slice(0,5));
    check('alle notatievarianten van elk gedrukt geslacht worden aanvaard',
          sweep.notatie.length===0, sweep.notatie.slice(0,5));
    check('geen enkel woord zonder gedrukt geslacht straft een vrijwillig geslacht af',
          sweep.vrij.length===0, sweep.vrij.slice(0,5));

    /* ---------- 4: de vraagkop zegt het, de meerkeuze test het ---------- */
    const kop = await p.evaluate(()=>{
      S=leegProfiel();
      const dux=W.find(x=>x.nr===52), am=W.find(x=>x.nr===2);
      const tekst = w => vraagKop(w,"L2V").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
      // meerkeuze: onder de afleiders hoort de juiste vorm met een ander geslacht
      const G=/,\s*(m\.\/v\.|m\. en v\.|m\. mv\.|v\. mv\.|o\. mv\.|m\.|v\.|o\.)\s*$/;
      /* De morfologische afleiders (§7.2) zetten dezelfde stam in andere uitgangen. Waar
         dat niet kan — vīs heeft geen genitief, "geen gen., v." valt niet te ontleden —
         valt de app terug op vormen van andere woorden en is er geen valstrik te zetten.
         Die uitzondering hoort benoemd te worden, niet weggemiddeld. */
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
    check('de kop vraagt zichtbaar naar het geslacht waar dat nodig is',
          /genitief en het geslacht/.test(kop.dux) && !/geslacht/.test(kop.amicus), kop);
    check('de meerkeuze zet het geslacht op de proef in plaats van het weg te geven',
          kop.gemeten>=150 && kop.metValstrik===kop.gemeten, kop);
    check('alleen vīs (208) mist morfologische afleiders — die heeft geen genitief',
          kop.geenMorf.length===1 && kop.geenMorf[0]===208, kop.geenMorf);

    console.log("FOUTEN", f.length);
    check('nul console/pageerrors', f.length===0, f.slice(0,3));
  }finally{
    await b.close();
  }
  const mis=checks.filter(c=>!c.ok).length;
  console.log(`SAMENVATTING smoke-14: ${checks.length-mis}/${checks.length} checks OK`);
  process.exit(mis?1:0);
})();
