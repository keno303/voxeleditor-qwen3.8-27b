import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://localhost:5173/';

const errors = [];
const logs = [];
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
await page.setViewport({ width: 1280, height: 800 });

page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message));
page.on('dialog', async (d) => { logs.push('DIALOG: ' + d.message()); await d.accept('TestGruppe'); });

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await sleep(2000);

const canvasInfo = await page.evaluate(() => {
  const c = document.querySelector('#viewport canvas');
  return c ? { w: c.width, h: c.height } : null;
});
logs.push('CANVAS: ' + JSON.stringify(canvasInfo));

// Vorschauen in der Palette (müssen PNG-Data-URLs sein)
const previews = await page.evaluate(() =>
  [...document.querySelectorAll('#shape-list .preview')].filter((i) => i.src.startsWith('data:image/png')).length
);
logs.push('PREVIEWS: ' + previews + '/' + await page.evaluate(() => document.querySelectorAll('#shape-list .preview').length));

const blockCount = () => page.evaluate(() => window.__state.allBlocks().length);
const selSize = () => page.evaluate(() => window.__editor.selection.size);
const vp = await page.evaluate(() => {
  const r = document.querySelector('#viewport').getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});

// 1) Kubus platzieren
await page.mouse.move(vp.x, vp.y);
await sleep(300);
await page.mouse.click(vp.x, vp.y);
await sleep(400);
logs.push('1) place -> blocks=' + (await blockCount()));

// 2) Preview drehen (Pfeil rechts)
await page.keyboard.press('ArrowRight');
await sleep(200);
logs.push('2) ArrowRight -> rot=' + (await page.evaluate(() => document.getElementById('rot-info').innerText)));

// 3) Zweiten Kubus platzieren
await page.mouse.move(vp.x + 40, vp.y + 10);
await sleep(300);
await page.mouse.click(vp.x + 40, vp.y + 10);
await sleep(400);
logs.push('3) place 2 -> blocks=' + (await blockCount()));

// 4) Strg+Klick auf Block-FLAECHE: Block-Mitte in Bildschirm-Koordinaten projizieren
const face = await page.evaluate(() => {
  const b = window.__state.allBlocks()[0];
  const f = b.footprint;
  return window.__scene.projectToScreen(b.x + f.x / 2, b.y + f.y, b.z + f.z / 2);
});
await page.keyboard.down('Control');
await page.mouse.click(face.x, face.y);
await page.keyboard.up('Control');
await sleep(400);
let s = await selSize();
logs.push('4) Ctrl+click on face -> selection=' + s + ' (click at ' + Math.round(face.x) + ',' + Math.round(face.y) + ')');

// 5) Block drehen (ausgewaehlt) mit Pfeil
await page.keyboard.press('ArrowRight');
await sleep(300);
logs.push('5) rotate selected -> ok');

// 6) Reset (R)
await page.keyboard.press('r');
await sleep(300);
logs.push('6) reset -> ok');

// 7) Loeschen
await page.evaluate(() => window.__editor.deleteSelection());
await sleep(400);
logs.push('7) delete -> blocks=' + (await blockCount()) + ' selection=' + (await selSize()));

// 8) Undo
await page.keyboard.down('Control');
await page.keyboard.press('z');
await page.keyboard.up('Control');
await sleep(400);
logs.push('8) undo -> blocks=' + (await blockCount()));

// 9) Redo (Shift gedrueckt halten, waehrend Z gedrueckt wird)
await page.keyboard.down('Control');
await page.keyboard.down('Shift');
await page.keyboard.press('z');
await page.keyboard.up('Shift');
await page.keyboard.up('Control');
await sleep(400);
logs.push('9) redo -> blocks=' + (await blockCount()));

// 10) Raeume alles, dann Flaechenfuellen (Strg+Ziehen)
await page.evaluate(() => window.__editor.clearAll());
await sleep(300);
await page.mouse.move(vp.x - 80, vp.y);
await page.keyboard.down('Control');
await page.mouse.down();
await page.mouse.move(vp.x + 80, vp.y + 40, { steps: 12 });
await page.mouse.up();
await page.keyboard.up('Control');
await sleep(500);
logs.push('10) fill-drag -> blocks=' + (await blockCount()));

// 11) Baugruppe aus Auswahl erstellen
await page.evaluate(() => {
  const b = window.__state.allBlocks();
  window.__editor.selection.clear();
  b.slice(0, 3).forEach((x) => window.__editor.selection.add(x.id));
  window.__editor.selectedBlockId = b[0].id;
});
await page.click('#btn-groups');
await sleep(500);
logs.push('11) group list = ' + JSON.stringify(await page.evaluate(() => document.getElementById('group-list').innerText)));

// 12) Gruppe platzieren
await page.evaluate(() => {
  const g = [...window.__state.groups.values()][0];
  window.__editor.setActiveItem('group', g.id);
});
await page.mouse.move(vp.x + 120, vp.y + 60);
await sleep(300);
await page.mouse.click(vp.x + 120, vp.y + 60);
await sleep(500);
logs.push('12) place group -> blocks=' + (await blockCount()));

// 13) Raeume alles (Undo-Test ueber mehrere Schritte)
await page.evaluate(() => window.__editor.clearAll());
await sleep(300);
logs.push('13) clearAll -> blocks=' + (await blockCount()));

await page.screenshot({ path: '/tmp/voxel-test.png' });
logs.push('Screenshot: /tmp/voxel-test.png');

console.log('=== LOGS ===');
for (const l of logs) console.log(l);
console.log('=== ERRORS (' + errors.length + ') ===');
for (const e of errors) console.log(e);

await browser.close();
process.exit(errors.length > 0 ? 1 : 0);
