// Screenshot driver for the Phase 2 (issue #40) audit. Start a server first:
//   PORT=3555 node node-server/server/index.js
// then from the repo root: node docs/screenshots/phase-2/capture.js [prefix]
// Two browser pages per viewport (drawer + guesser) play a real Draw & Guess turn.
// Prints canvas sizes and horizontal-overflow checks, writes PNGs next to this file.
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:3555';
const OUT = process.env.OUT || __dirname;
const PREFIX = process.argv[2] || 'after';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(browser, vp, name) {
  const phone = vp.w < 600;
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: phone, isMobile: phone });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', name, e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(URL + '/');
  await page.evaluate((n) => localStorage.setItem('pg_profile', JSON.stringify({ name: n, avatar: { e: 1, c: 3 } })), name);
  await page.reload();
  return page;
}
const measure = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('.dg-canvas');
    const r = c ? c.getBoundingClientRect() : null;
    return {
      canvas: r ? `${Math.round(r.width)}x${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)}` : 'none',
      overflowX: document.documentElement.scrollWidth > window.innerWidth,
      scrollW: document.documentElement.scrollWidth,
    };
  });

(async () => {
  const browser = await chromium.launch();
  for (const vp of [{ w: 1440, h: 900, t: 'desktop' }, { w: 390, h: 844, t: 'mobile' }]) {
    const a = await open(browser, vp, 'Alex');
    await a.click('#hero-create');
    await a.click('#c-go');
    await a.waitForSelector('#screen-room', { state: 'visible' });
    await a.waitForFunction(() => window.App && App.S && App.S.code);
    const code = await a.evaluate(() => App.S.code);
    await a.evaluate(() => App.socket.emit('switchGame', { game: 'drawguess' }));
    const b = await open(browser, vp, 'Nova');
    await b.goto(URL + '/r/' + code);
    await b.waitForSelector('#join-btn', { state: 'visible', timeout: 5000 }).then(() => b.click('#join-btn')).catch(() => {});
    await b.waitForSelector('#screen-room', { state: 'visible' });
    await a.waitForFunction(() => App.S.players.length === 2 && App.S.gameId === 'drawguess');
    await a.evaluate(() => App.socket.emit('startGame'));
    await a.waitForSelector('[data-choose]');
    await sleep(300);
    await a.screenshot({ path: `${OUT}/${PREFIX}-${vp.t}-dg-choose.png` });
    await a.click('[data-choose="0"]');
    await a.waitForFunction(() => App.S.game && App.S.game.phase === 'draw');
    // a few strokes and a fill, through real pointer events
    const box = await a.locator('.dg-canvas').boundingBox();
    const P = (fx, fy) => [box.x + box.width * fx, box.y + box.height * fy];
    const stroke = async (pts) => {
      await a.mouse.move(...P(...pts[0]));
      await a.mouse.down();
      for (const p of pts.slice(1)) await a.mouse.move(...P(...p), { steps: 6 });
      await a.mouse.up();
    };
    await stroke([[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7], [0.3, 0.3]]);
    await stroke([[0.1, 0.85], [0.9, 0.85]]);
    await a.click('[data-tool="fill"]');
    await a.click('[data-color="#00b2ff"]');
    await a.click('[data-tool="fill"]');
    await a.mouse.click(...P(0.5, 0.5));
    await sleep(500);
    console.log(vp.t, 'drawer', JSON.stringify(await measure(a)));
    console.log(vp.t, 'guesser', JSON.stringify(await measure(b)));
    await a.screenshot({ path: `${OUT}/${PREFIX}-${vp.t}-dg-drawer.png`, fullPage: vp.t === 'mobile' });
    await b.screenshot({ path: `${OUT}/${PREFIX}-${vp.t}-dg-guesser.png`, fullPage: vp.t === 'mobile' });
    await a.click('#dg-expand');
    await sleep(300);
    console.log(vp.t, 'drawer expanded', JSON.stringify(await measure(a)));
    await a.screenshot({ path: `${OUT}/${PREFIX}-${vp.t}-dg-drawer-expanded.png` });
    await b.click('#dg-expand');
    await sleep(300);
    console.log(vp.t, 'guesser expanded', JSON.stringify(await measure(b)));
    await b.screenshot({ path: `${OUT}/${PREFIX}-${vp.t}-dg-guesser-expanded.png` });
    await a.context().close();
    await b.context().close();
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
