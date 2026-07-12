import { chromium } from 'playwright';

const OUT = process.env.SHOT_DIR;
const URL = process.env.SHOT_URL || 'http://localhost:5174';

const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('  [console.error]', m.text().slice(0, 200)); });
page.on('pageerror', (e) => console.log('  [pageerror]', e.message.slice(0, 200)));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.click('[data-start]');
const wait = (ms) => page.waitForTimeout(ms);

const shoot = async (name, ms) => { await wait(ms); await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('  shot', name); };

await shoot('phase1', 5000);
await page.click('[data-next]'); await shoot('phase2', 4000);
await page.click('[data-next]'); await shoot('phase3-follow', 4000); await shoot('phase3-orbit', 6000);
await page.click('[data-next]'); await shoot('phase4', 5000);
await page.click('[data-next]'); await shoot('phase5', 5000);
await page.click('[data-next]'); await shoot('phase6', 4000);

await browser.close();
console.log('done');
