const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const WORTEL = path.join(__dirname, '..');
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
    const fouten = [], net = [];
    p.on('console', m => { if(m.type()==='error') fouten.push(m.text()); });
    p.on('pageerror', e => fouten.push('PAGEERROR: '+e.message));
    p.on('request', r => { if(!r.url().startsWith('file://')) net.push(r.url()); });

    await p.goto(PAD);
    await p.waitForTimeout(400);

    const info = await p.evaluate(() => ({
      woorden: W.length, caputs: CAPUTS.length, secties: ALLE_SEC.length,
      items: W.reduce((n,w)=>n+RICHTINGEN(w).length,0),
      cellen: document.querySelectorAll('.cel').length,
      pak: PAK.length, badges: BADGES.length, tess: TESSERAE.length,
    }));
    console.log('DATA', JSON.stringify(info));
    check('1051 woorden, 7 caputs, 35 secties', info.woorden===1051 && info.caputs===7 && info.secties===35, info);
    check('1806 leeritems', info.items===1806, info.items);
    check('mozaïek telt 1051 cellen', info.cellen===1051, info.cellen);
    check('20 badges, 20 tesserae', info.badges===20 && info.tess===20);
    check('starterpakket Caput 1 gevuld', info.pak>0, info.pak);

    // --- normalisatie / beoordeling ---
    const beo = await p.evaluate(() => {
      const w = BY_NR[2];          // amīcus / amīcī / de vriend
      const dux = BY_NR[52];       // dux / ducis, m.
      const bon = BY_NR[33];       // bonus / ~a, ~um
      const loc = BY_NR[6];        // locus: "de plaats; de gelegenheid"
      const vid = BY_NR[276];      // vidēre / vīdī, vīsum
      const forum = BY_NR[26];     // "forum (romeins marktplein)" — haakjes mogen geen rol spelen
      const quis = BY_NR[162];     // "(z.) wie?, wat?" — label en ? mogen geen rol spelen
      const hic = BY_NR[126];      // "deze, dit" — elk kommadeel apart
      const nul = BY_NR[45];       // "nulla, nullius; geen" — ; als , en andersom
      return {
        macronloos:   beoordeel("amici", w, "L2V").uit,
        metMacron:    beoordeel("amīcī", w, "L2V").uit,
        lidwoordWeg:  beoordeel("vriend", w, "L2N").uit,
        metLidwoord:  beoordeel("de vriend", w, "L2N").uit,
        tweedeBetek:  beoordeel("de gelegenheid", loc, "L2N").uit,
        eersteBetek:  beoordeel("de plaats", loc, "L2N").uit,
        genderWeg:    beoordeel("ducis", dux, "L2V").uit,
        genderMee:    beoordeel("ducis, m.", dux, "L2V").uit,
        tildeVorm:    beoordeel("~a, ~um", bon, "L2V").uit,
        uitgeschreven:beoordeel("bona, bonum", bon, "L2V").uit,
        stamtijden:   beoordeel("vidi, visum", vid, "L2V").uit,
        typfout:      beoordeel("amicu", w, "L2V").uit,
        onzin:        beoordeel("paardenbloem", w, "L2N").uit,
        hoofdletters: beoordeel("DE VRIEND", w, "L2N").uit,
        forumZonderHaakjes: beoordeel("het forum", forum, "L2N").uit,
        wieZonderLabelEnVrageteken: beoordeel("wie", quis, "L2N").uit,
        kommaDeel:    beoordeel("deze", hic, "L2N").uit,
        puntkommaAlsKomma: beoordeel("nulla, nullum, nullius", nul, "L2V").uit,
        kommaAlsPuntkomma: beoordeel("nulla; nullum; nullius", nul, "L2V").uit,
      };
    });
    console.log('BEOORDELING', JSON.stringify(beo));
    for(const [k, verwacht] of Object.entries({
      macronloos:'juist', metMacron:'juist', lidwoordWeg:'juist', metLidwoord:'juist',
      tweedeBetek:'juist', eersteBetek:'juist', genderWeg:'juist', genderMee:'juist',
      tildeVorm:'juist', uitgeschreven:'juist', stamtijden:'juist', typfout:'bijna',
      onzin:'fout', hoofdletters:'juist', forumZonderHaakjes:'juist',
      wieZonderLabelEnVrageteken:'juist', kommaDeel:'juist',
      puntkommaAlsKomma:'juist', kommaAlsPuntkomma:'juist'})){
      check('beoordeling: '+k+' = '+verwacht, beo[k]===verwacht, beo[k]);
    }

    // --- INVARIANT: het antwoord dat de app toont wordt altijd aanvaard ---
    const inv = await p.evaluate(() => {
      const slecht = [];
      for(const w of W){
        for(const r of RICHTINGEN(w)){
          const model = juisteTekst(w, r);
          if(beoordeel(model, w, r).uit !== "juist")
            slecht.push({nr:w.nr, r, model});
          if(beoordeel(deMacron(model), w, r).uit !== "juist")
            slecht.push({nr:w.nr, r, model:"[macronloos] "+model});
        }
      }
      return {aantal:slecht.length, eerste:slecht.slice(0,8)};
    });
    console.log('INVARIANT', JSON.stringify(inv));
    check('invariant 1806 items × macron/macronloos: 0 afwijkingen', inv.aantal===0, inv.eerste);

    // --- afleiders: nooit duplicaat, nooit zichzelf ---
    const afl = await p.evaluate(() => {
      let dup = 0, zelf = 0, kort = 0, soortfout = 0;
      for(let i=0;i<300;i++){
        const w = W[(Math.random()*W.length)|0];
        const r = Math.random()<.5 || w.soort==='geen' ? 'L2N' : 'L2V';
        const a = afleiders(w, r, 3);
        if(a.length < 3) kort++;
        const t = a.map(k => norm(juisteTekst(k,r)));
        if(new Set(t).size !== t.length) dup++;
        if(t.includes(norm(juisteTekst(w,r)))) zelf++;
        if(r==='L2V' && a.some(k=>k.soort!==w.soort)) soortfout++;
      }
      return {dup, zelf, kort, soortfout};
    });
    console.log('AFLEIDERS', JSON.stringify(afl));
    check('afleiders: 300 trekkingen, 0 duplicaten/ezelfde/tekort/soortfout',
          afl.dup===0 && afl.zelf===0 && afl.kort===0 && afl.soortfout===0, afl);

    // --- speel een ronde volledig in-page (geen click-races) ---
    const ronde = await p.evaluate(async () => {
      let intros=0, mcs=0, typ=0, stap=0;
      document.querySelector('#btnLeer').click();
      while(document.querySelector('#scr-quiz.on') && stap++ < 200){
        const io = document.querySelector('#introOk');
        const opt = document.querySelector('#opts .optie:not([disabled])');
        const inp = document.querySelector('#tIn');
        const nx  = document.querySelector('#fbNext');
        if(nx){ nx.click(); }
        else if(io){ intros++; io.click(); }
        else if(opt){
          mcs++;
          const g = norm(juisteTekst(BY_NR[Q.huidig.nr], Q.huidig.r));
          const i = Q.opts.findIndex(o => norm(o) === g);
          document.querySelectorAll('#opts .optie')[i].click();
        }
        else if(inp){
          typ++;
          inp.value = juisteTekst(BY_NR[Q.huidig.nr], Q.huidig.r);
          document.querySelector('#tOk').click();
        }
        await new Promise(r => setTimeout(r, 40));
      }
      await new Promise(r => setTimeout(r, 300));
      return {intros, mcs, typ, stap};
    });
    const na = await p.evaluate(() => ({
      scherm: document.querySelector('.screen.on').id,
      xp: S.profiel.xp, rondes: S.profiel.totaalRondes, juist: S.profiel.totaalJuist,
      boxen: Object.values(S.items).map(i=>i.box).filter(b=>b>0).length,
      badges: Object.keys(S.badges), tess: Object.keys(S.tesserae),
    }));
    console.log('RONDE', JSON.stringify({...ronde, ...na}));
    check('ronde eindigt op resultaatscherm', na.scherm==='scr-res', na.scherm);
    check('ronde telde af (rondes>=1, xp>0, juist>0)', na.rondes>=1 && na.xp>0 && na.juist>0);
    check('ronde gaf intro+mc+typ vragen', ronde.intros>0 && ronde.mcs>=0 && (ronde.mcs+ronde.typ)>0);

    // --- persistentie over reload ---
    await p.reload(); await p.waitForTimeout(300);
    const bewaard = await p.evaluate(() => ({xp:S.profiel.xp, items:Object.keys(S.items).length}));
    console.log('PERSISTENT', JSON.stringify(bewaard));
    check('voortgang overleeft reload', bewaard.xp===na.xp && bewaard.items>0,
          {voor:na.xp, na:bewaard.xp});

    // --- verover een kleine sectie volledig ---
    const ver = await p.evaluate(async () => {
      const s = Object.values(SECTIES).sort((a,b)=>a.nrs.length-b.nrs.length)[0];
      startVerover(s);
      let n = 0;
      while(document.querySelector('#scr-quiz.on') && n < 200){
        const inp = document.querySelector('#tIn');
        if(!inp) break;
        inp.value = juisteTekst(BY_NR[Q.huidig.nr], Q.huidig.r);
        document.querySelector('#tOk').click();
        await new Promise(r=>setTimeout(r,25)); n++;
      }
      await new Promise(r=>setTimeout(r,200));
      return {sectie:s.key, woorden:s.nrs.length, gesteld:n,
              veroverd: !!(S.secties[s.key]&&S.secties[s.key].veroverd),
              scherm: document.querySelector('.screen.on').id};
    });
    console.log('VEROVER', JSON.stringify(ver));
    check('sectie veroverd na 100 % juist', ver.veroverd===true, ver);
    check('verovering stelde alle woorden', ver.gesteld>=ver.woorden, ver);

    // --- blitz kort ---
    await p.evaluate(() => { startBlitz(); });
    await p.waitForTimeout(300);
    const bl = await p.evaluate(() => ({scherm:document.querySelector('.screen.on').id,
                                        opties:document.querySelectorAll('#bOpts .optie').length}));
    await p.evaluate(() => { toon('home'); });
    const blWeg = await p.evaluate(() => ({B:!!B, scherm:document.querySelector('.screen.on').id}));
    console.log('BLITZ', JSON.stringify(bl), JSON.stringify(blWeg));
    check('blitz start met 4 opties', bl.scherm==='scr-blitz' && bl.opties===4, bl);
    check('blitz-timer wordt gestopt bij navigatie via toon()', blWeg.B===false, blWeg);

    // --- overige schermen ---
    for(const [naam, fn] of [['ontdek','renderOntdek'],['badges','renderBadges'],
                             ['tess','renderTess'],['stats','renderStats'],['verover','renderVerover']]){
      await p.evaluate(([n,f]) => { window[f](); toon(n); }, [naam, fn]);
      await p.waitForTimeout(90);
    }
    await p.evaluate(() => toon('home'));

    // --- responsive 360px ---
    await p.setViewportSize({width:360, height:740});
    await p.waitForTimeout(250);
    const resp = await p.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth }));
    console.log('RESPONSIVE', JSON.stringify(resp));
    check('geen horizontale scroll op 360 px', resp.scrollW <= resp.clientW, resp);

    // --- colofon met versienummer (§6.0) ---
    // Het nummer in de app moet dat van de specificatie zijn: bouw.py leest het daaruit,
    // dus een spec die gebumpt is en een build die dat niet is, valt hier door de mand.
    const spec = fs.readFileSync(path.join(WORTEL, 'FUNCTIONELE-SPECIFICATIE.md'), 'utf8');
    const specVersie = (spec.match(/^\|\s*Versie\s*\|\s*(\d+\.\d+)\s*\|/m) || [])[1];
    const colofon = (await p.textContent('.colofon')).replace(/\s+/g, ' ').trim();
    console.log('COLOFON', JSON.stringify(colofon), '· spec:', specVersie);
    // De scheidingstekens dragen hun ruimte in CSS, niet in de tekst: vandaar \s* .
    check('de colofon draagt een versienummer xx.xx', /·\s*v\d+\.\d+\s*·/.test(colofon), colofon);
    check('dat nummer is dat van de specificatie',
          !!specVersie && new RegExp('·\\s*v' + specVersie.replace('.', '\\.') + '\\s*·')
            .test(colofon), {colofon, specVersie});
    check('de auteursregel staat er nog',
          colofon.startsWith('© 2026 Robbe en David Steeman'), colofon);
    check('geen placeholder blijven staan', !colofon.includes('__VERSIE__'), colofon);

    console.log('NETWERK', net.length, JSON.stringify(net.slice(0,5)));
    console.log('FOUTEN', fouten.length);
    fouten.slice(0,10).forEach(f => console.log('   !', f));
    check('nul netwerkrequests', net.length===0, net.slice(0,3));
    check('nul console/pageerrors', fouten.length===0, fouten.slice(0,3));
  }finally{
    await b.close();
  }
  const mis = checks.filter(c=>!c.ok).length;
  console.log(`SAMENVATTING smoke-1: ${checks.length-mis}/${checks.length} checks OK`);
  process.exit(mis ? 1 : 0);
})();
