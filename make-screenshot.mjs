import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.SHOT_URL || 'http://localhost:4173/';
const OUT = 'docs/screenshot.png';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--no-sandbox',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader-webgl',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--disable-gpu-sandbox',
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await sleep(2500);

const placed = await page.evaluate(() => {
  const ed = window.__editor;
  ed.clearAll();
  let n = 0;
  const put = (shape, x, y, z) => {
    ed.setActiveItem('shape', shape);
    if (ed.placeAt(x, y, z)) n++;
  };
  // Bodenplatte 7x5 (y=0)
  for (let x = -3; x <= 3; x++) for (let z = -2; z <= 2; z++) put('cube', x, 0, z);
  // Hauskoerper 3x3 (y=1)
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) put('cube', x, 1, z);
  // Dach: Reihe Slopes (y=2)
  for (let x = -1; x <= 1; x++) put('slope', x, 2, -1);
  // Rampe am Rand (außerhalb der Platte)
  put('ramp2', 4, 0, 0);
  ed.setActiveItem('shape', 'cube');
  return n;
});

await sleep(900);
await page.screenshot({ path: OUT });
console.log('Platziert: ' + placed + ' Blöcke');
console.log('Screenshot: ' + OUT);
await browser.close();
