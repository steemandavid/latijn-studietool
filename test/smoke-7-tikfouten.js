const { chromium } = require('playwright');
const PAD = 'file:///home/john/claudecode/projects/latijn-studietool/verba/index.html';
const checks = [];
const check = (naam, ok, detail) => {
  checks.push({naam, ok});
  console.log((ok ? '  ✓ ' : '  ✗ FAIL ') + naam + (ok ? '' : ' — ' + JSON.stringify(detail)));
};

/* §7.4, na de gebruikersfeedback van 2026-09-12:
   - een tikfout telt als juist (box, combo en typ-streak lopen door);
   - de volgorde van meerdere betekenissen mag niet uitmaken;
   - maar een andere naamval of een ander woord blijft fout. */
(async () => {
  const b = await chromium.launch({executablePath:'/home/john/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome'});
  try{
    const p = await b.newPage();
    const fouten = [];
    p.on('console', m => { if(m.type()==='error') fouten.push(m.text()); });
    p.on('pageerror', e => fouten.push('PAGEERROR: ' + e.message));
    await p.goto(PAD);
    await p.waitForTimeout(400);

    const g = await p.evaluate(() => {
      const uit = (nr, r, invoer) => beoordeel(invoer, BY_NR[nr], r).uit;
      return {
        // 263 cūrāre = "verzorgen; zorgen voor"
        volgorde:     uit(263, 'L2N', 'zorgen voor, verzorgen'),
        volgordeOrig: uit(263, 'L2N', 'verzorgen, zorgen voor'),
        eenDeel:      uit(263, 'L2N', 'zorgen voor'),
        volgordeTik:  uit(263, 'L2N', 'zorgen voor, verzrogen'),
        vreemdDeel:   uit(263, 'L2N', 'verzorgen, de vriend'),
        dubbelDeel:   uit(263, 'L2N', 'verzorgen, verzorgen'),
        // 2 amīcus / amīcī / de vriend
        letterWeg:    uit(2, 'L2N', 'de vrind'),
        verwisseld:   uit(2, 'L2N', 'de vriedn'),
        anderWoord:   uit(2, 'L2N', 'de vijand'),
        vormTik:      uit(2, 'L2V', 'amcii'),
        vormDubbel:   uit(2, 'L2V', 'amicii'),
        vormNaamval:  uit(2, 'L2V', 'amico'),
        vormJuist:    uit(2, 'L2V', 'amici'),
        // korte antwoorden krijgen geen tolerantie
        kort:         uit(BY_NR[52] ? 52 : 2, 'L2V', 'ducix'),
      };
    });
    console.log('BEOORDELING', JSON.stringify(g));
    check('volgorde van twee betekenissen maakt niet uit', g.volgorde === 'juist' && g.volgordeOrig === 'juist', g);
    check('één betekenis volstaat nog altijd', g.eenDeel === 'juist', g.eenDeel);
    check('tikfout in één van twee betekenissen telt als tikfout', g.volgordeTik === 'tikfout', g.volgordeTik);
    check('een vreemde betekenis erbij blijft fout', g.vreemdDeel === 'fout', g.vreemdDeel);
    check('twee keer dezelfde betekenis blijft fout', g.dubbelDeel === 'fout', g.dubbelDeel);
    check('ontbrekende letter is een tikfout', g.letterWeg === 'tikfout', g.letterWeg);
    check('verwisselde letters zijn een tikfout', g.verwisseld === 'tikfout', g.verwisseld);
    check('een ander woord blijft fout', g.anderWoord === 'fout', g.anderWoord);
    check('tikfout in de stam van een vorm telt als tikfout', g.vormTik === 'tikfout' && g.vormDubbel === 'tikfout', g);
    check('andere naamvalsuitgang blijft "bijna"', g.vormNaamval === 'bijna', g.vormNaamval);
    check('de juiste vorm blijft juist', g.vormJuist === 'juist', g.vormJuist);

    // Geen enkel antwoord van een ánder woord mag als tikfout passeren.
    const kruis = await p.evaluate(() => {
      let getest = 0, lek = 0, voorbeeld = null;
      for(const w of W.slice(0, 400)){
        for(const k of W){
          if(k.nr === w.nr) continue;
          for(const t of (k.ta || []).slice(0, 1)){
            if(Math.abs(t.length - (w.ta[0] || '').length) > 2) continue;
            getest++;
            const u = beoordeel(t, w, 'L2N').uit;
            if(u === 'tikfout'){ lek++; if(!voorbeeld) voorbeeld = [w.kop, t]; }
          }
        }
      }
      return {getest, lek, voorbeeld};
    });
    console.log('KRUISCONTROLE', JSON.stringify(kruis));
    check('geen antwoord van een ander woord glipt door als tikfout', kruis.lek === 0, kruis);

    // Een tikfout mag de combo en de typ-streak niet breken.
    const streak = await p.evaluate(async () => {
      zetSave(leegProfiel()); herbouwPak();
      // Items klaarzetten op box 2 en ruim over tijd: dan zijn het typvragen (§4.6).
      const lang = new Date(Date.now() - 30*864e5).toISOString();
      for(const nr of PAK.slice(0, 30))
        Object.assign(item(nr, 'L2N'), {box:2, juist:2, vragenSindsdien:99, laatstGezien:lang, mcSinds:2});
      bewaar();
      startRonde({});
      const wacht = ms => new Promise(r => setTimeout(r, ms));
      const stel = async (metTikfout) => {
        while(document.querySelector('#introOk')){
          document.querySelector('#introOk').click();
          await wacht(70);
        }
        if(!document.querySelector('#tIn')) return null;          // meerkeuze: overslaan
        const w = BY_NR[Q.huidig.nr], r = Q.huidig.r;
        const goed = juisteTekst(w, r);
        document.querySelector('#tIn').value = metTikfout
          ? goed.slice(0, -2) + goed.slice(-1) + goed.slice(-2, -1)   // laatste twee omgewisseld
          : goed;
        document.querySelector('#tOk').click();
        await wacht(80);
        const staat = {combo, typStreak:S.profiel.typStreak, tik:Q.tik, fout:Q.fout};
        const nx = document.querySelector('#fbNext');
        if(nx) nx.click(); else if(Q.enter) Q.enter();
        // Q.i loopt al op in de feedback; wachten tot de volgende vraag echt staat.
        for(let w2 = 0; w2 < 40 && Q.beantwoord; w2++) await wacht(50);
        return staat;
      };
      const rijtje = [];
      for(let i = 0; i < 12 && document.querySelector('#scr-quiz.on'); i++){
        const st = await stel(i === 6);
        if(st) rijtje.push(st);
      }
      return rijtje;
    });
    console.log('STREAK', JSON.stringify(streak));
    const stijgend = streak.length > 2 && streak.every((s, i) => i === 0 || s.combo === streak[i-1].combo + 1);
    const laatste = streak[streak.length - 1] || {};
    check('combo groeit door, ook over de tikfout heen', stijgend, streak);
    check('de tikfout is als tikfout geteld en niet als fout', laatste.tik >= 1 && laatste.fout === 0, laatste);
    check('typ-streak loopt gelijk met de combo', streak.every(s => s.typStreak === s.combo), streak);

    console.log('FOUTEN', fouten.length);
    check('nul console/pageerrors', fouten.length === 0, fouten.slice(0,3));
  } finally {
    await b.close();
  }
  const slecht = checks.filter(c => !c.ok).length;
  console.log(`SAMENVATTING smoke-7: ${checks.length - slecht}/${checks.length} checks OK`);
  process.exit(slecht ? 1 : 0);
})();
