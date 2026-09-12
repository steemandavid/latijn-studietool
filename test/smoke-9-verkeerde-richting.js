const { chromium } = require('playwright');
const PAD = 'file:///home/john/claudecode/projects/latijn-studietool/verba/index.html';
const checks = [];
const check = (naam, ok, detail) => {
  checks.push({naam, ok});
  console.log((ok ? '  ✓ ' : '  ✗ FAIL ') + naam + (ok ? '' : ' — ' + JSON.stringify(detail)));
};

/* §7.4a — het juiste antwoord op de verkeerde vraag (de genitief typen terwijl de
   betekenis gevraagd wordt, of omgekeerd) is een leesfout, geen kennisfout: één
   gratis herkansing waarbij geen enkele teller beweegt. */
(async () => {
  const b = await chromium.launch({executablePath:'/home/john/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome'});
  try{
    const p = await b.newPage({viewport:{width:1280, height:900}});
    const fouten = [];
    p.on('pageerror', e => fouten.push(e.message));
    p.on('console', m => { if(m.type()==='error') fouten.push(m.text()); });
    await p.goto(PAD); await p.waitForTimeout(300);

    // de herkenning zelf, beide richtingen en de grensgevallen
    const herken = await p.evaluate(() => {
      const w  = W.find(x => x.soort === "znw" && !x.t.includes(";"));
      const gw = W.find(x => x.soort === "geen");
      return {
        nr: w.nr,
        vorm_bij_betekenisvraag: isAndereRichting(juisteTekst(w,"L2V"), w, "L2N"),
        betekenis_bij_vormvraag: isAndereRichting(juisteTekst(w,"L2N"), w, "L2V"),
        onzin:                   isAndereRichting("zzzz", w, "L2N"),
        leeg:                    isAndereRichting("   ", w, "L2N"),
        zonder_tweede_vorm:      gw ? isAndereRichting(juisteTekst(gw,"L2N"), gw, "L2N") : null
      };
    });
    console.log('HERKENNING', JSON.stringify(herken));
    check('vorm op een betekenisvraag wordt herkend', herken.vorm_bij_betekenisvraag === true, herken);
    check('betekenis op een vormvraag wordt herkend', herken.betekenis_bij_vormvraag === true, herken);
    check('onzin en leeg zijn geen leesfout',
          herken.onzin === false && herken.leeg === false, herken);
    check('woord zonder tweede vorm kan geen leesfout hebben',
          herken.zonder_tweede_vorm === false, herken);

    // end-to-end door de UI: tellers vóór en ná
    const rit = await p.evaluate(async () => {
      zetSave(leegProfiel()); herbouwPak();
      S.settings.typAandeel = "veel"; S.settings.tempo = "auto"; bewaar();
      // één woord met twee richtingen klaarzetten en een ronde starten
      const w = W.find(x => x.soort === "znw" && !x.t.includes(";"));
      S.settings.pakket = [w.s.split(" ")[0]]; herbouwPak();
      item(w.nr,"L2N").box = 3; item(w.nr,"L2V").box = 3;
      combo = 7; S.profiel.combo = 7; S.profiel.typStreak = 4; S.profiel.xp = 500;
      S.profiel.tempo = 0.5;
      startRonde({lengte:10, lijst:[{nr:w.nr, r:"L2N"}, {nr:w.nr, r:"L2V"}]});
      // doorklikken tot er een typvraag voor dit woord staat
      let stap = 0;
      while(!document.querySelector('#tIn') && stap++ < 40){
        const io = document.querySelector('#introOk'); if(io){ io.click(); }
        const opt = document.querySelector('#opts .optie:not([disabled])'); if(opt) opt.click();
        const nx = document.querySelector('#fbNext'); if(nx) nx.click();
        await new Promise(r => setTimeout(r, 30));
      }
      const v = Q.huidig, ww = BY_NR[v.nr];
      const voor = {
        box: item(v.nr, v.r).box, combo, typStreak: S.profiel.typStreak, xp: S.profiel.xp,
        juist: S.profiel.totaalJuist, fout: S.profiel.totaalFout, tempo: S.profiel.tempo,
        i: Q.i, nr: v.nr, r: v.r
      };
      // het juiste antwoord op de ANDERE richting geven
      const ander = v.r === "L2N" ? "L2V" : "L2N";
      document.querySelector('#tIn').value = juisteTekst(ww, ander);
      document.querySelector('#tOk').click();
      await new Promise(r => setTimeout(r, 120));
      const na = {
        box: item(v.nr, v.r).box, combo, typStreak: S.profiel.typStreak, xp: S.profiel.xp,
        juist: S.profiel.totaalJuist, fout: S.profiel.totaalFout, tempo: S.profiel.tempo,
        i: Q.i, kaart: !!document.querySelector('.fb.tip'),
        zelfdeVraag: Q.huidig.nr === voor.nr && Q.huidig.r === voor.r,
        veldLeeg: document.querySelector('#tIn') ? document.querySelector('#tIn').value === "" : null
      };
      // tweede keer dezelfde leesfout: nu telt hij wel
      document.querySelector('#tIn').value = juisteTekst(ww, ander);
      document.querySelector('#tOk').click();
      await new Promise(r => setTimeout(r, 150));
      const na2 = {fout: S.profiel.totaalFout, combo, i: Q.i,
                   kaartFout: !!document.querySelector('.fb.fout')};
      return {voor, na, na2};
    });
    console.log('RIT', JSON.stringify(rit));
    const {voor, na, na2} = rit;
    check('herkansingskaart staat in beeld, veld leeg, zelfde vraag',
          na.kaart && na.zelfdeVraag && na.veldLeeg === true, na);
    check('geen enkele teller bewoog (box, combo, typ-streak, XP, juist/fout, tempo, vraagteller)',
          na.box === voor.box && na.combo === voor.combo && na.typStreak === voor.typStreak &&
          na.xp === voor.xp && na.juist === voor.juist && na.fout === voor.fout &&
          na.tempo === voor.tempo && na.i === voor.i, {voor, na});
    check('de tweede keer telt wel als fout',
          na2.fout === voor.fout + 1 && na2.combo === 0 && na2.kaartFout, na2);

    console.log('FOUTEN', fouten.length); fouten.slice(0,5).forEach(f => console.log('  !', f));
    check('nul console/pageerrors', fouten.length === 0, fouten.slice(0,3));
  } finally {
    await b.close();
  }
  const mis = checks.filter(c => !c.ok).length;
  console.log(`SAMENVATTING smoke-9: ${checks.length - mis}/${checks.length} checks OK`);
  process.exit(mis ? 1 : 0);
})();
