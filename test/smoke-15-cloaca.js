// Cloāca Maxima (§6.3a): de easter egg is vindbaar, draait op de flashcards en
// laat de leermotor en de save volledig met rust.
const { chromium } = require('playwright');
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
    const fouten = [];
    p.on('pageerror', e => fouten.push(e.message));
    p.on('console', m => { if(m.type()==='error') fouten.push(m.text()); });
    await p.goto(PAD); await p.waitForTimeout(300);

    const data = await p.evaluate(() => ({
      n: CLOACA.length, woorden: W.length,
      vol: CLOACA.every(b => b.w && b.vol && b.t && b.weetje && b.z.length),
      lekt: CLOACA.some(b => W.some(w => norm(w.w) === norm(b.w))),
    }));
    check('21 bonuswoorden, elk met vorm, vertaling, weetje en sleutels', data.n === 21 && data.vol, data);
    check('de 1051 boekwoorden blijven 1051, zonder overlap', data.woorden === 1051 && !data.lekt, data);

    const sleutels = await p.evaluate(() =>
      ["flatus","Flātus","faeces","scheet","kont","cloaca maxima","merd","cloaca"].map(ladeGevonden)
        .concat(["", "d", "de", "amicus", "puer", "het", "caput"].map(z => !ladeGevonden(z))));
    check('sleutels (Latijn, macronloos, Nederlands, prefix) openen de lade; gewone zoektermen niet',
          sleutels.every(Boolean), sleutels);

    const voor = await p.evaluate(() => localStorage.getItem(Object.keys(localStorage)[0]));
    await p.evaluate(() => toon('ontdek'));
    await p.fill('#oZoek', 'amicus');
    check('geen lade bij een gewone zoekterm', await p.$('.lade') === null);
    await p.fill('#oZoek', 'flatus');
    check('lade verschijnt bij "flatus"', await p.$('.lade') !== null);
    await p.click('.lade');
    check('flashcardscherm opent', await p.evaluate(() => $('#scr-flash').classList.contains('on')));
    const voorkant = await p.textContent('#flBox');
    check('voorkant toont cloāca, zonder woordnummer', voorkant.includes('cloāca') && !/woord \d/.test(voorkant), voorkant);
    await p.keyboard.press(' ');
    const achter = await p.textContent('#flBox');
    check('draaien toont vertaling en weetje', achter.includes('het riool') && achter.includes('Cloācīna'), achter);
    await p.keyboard.press('ArrowRight');
    check('pijltje naar volgende: flātus', (await p.textContent('#flBox')).includes('flātus'));
    check('teller 2 / 21', (await p.textContent('#flTel')).trim() === '2 / 21');
    const na = await p.evaluate(() => localStorage.getItem(Object.keys(localStorage)[0]));
    check('de save is niet aangeraakt', voor === na);

    // gewone flashcards tonen nog steeds caput + woordnummer
    await p.evaluate(() => toon('ontdek'));
    await p.fill('#oZoek', 'amicus'); await p.click('#oFlash');
    check('gewone flashcards: nog altijd "woord N"', /woord \d+/.test(await p.textContent('#flBox')));
    check('geen JS-fouten', fouten.length === 0, fouten);
  } finally { await b.close(); }
  const fout = checks.filter(c => !c.ok).length;
  console.log(`\n${checks.length - fout}/${checks.length} checks OK`);
  process.exit(fout ? 1 : 0);
})();
