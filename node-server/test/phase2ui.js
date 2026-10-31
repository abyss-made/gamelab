// Issue #40 browser checks (Playwright; skipped when not installed): Draw & Guess on a 390x844 phone
// (full-width canvas, whole palette reachable, no tool panel for guessers), brush/eraser sizes kept
// across a reload, fast replay of a fill-heavy canvas, and no horizontal overflow at 1440x900.
// Run: node test/phase2ui.js
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.log('SKIP  playwright not installed; phase 2 browser checks not run');
  process.exit(0);
}
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 3961;
const URL = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failures++; };
const tok = () => [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
async function until(fn, ms = 5000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await sleep(50);
  }
  return false;
}
function fake(name) {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const c = { s, state: null, token: tok(), profile: { name, avatar: { e: 2, c: 3 } } };
  s.on('state', (st) => (c.state = st));
  c.call = (ev, d) => new Promise((r) => s.emit(ev, d, r));
  return c;
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function openPage(browser, vp, name) {
  const phone = vp.w < 600;
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: phone, isMobile: phone });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(URL + '/');
  await page.evaluate((n) => localStorage.setItem('pg_profile', JSON.stringify({ name: n, avatar: { e: 1, c: 1 } })), name);
  await page.reload();
  return page;
}

// The page creates a party, picks the game and starts it with one socket friend, so the page draws first.
async function startWithFriend(page, game) {
  await page.click('#hero-create');
  await page.click('#c-go');
  await page.waitForSelector('#screen-room', { state: 'visible' });
  await page.waitForFunction(() => window.App && App.S && App.S.code);
  const code = await page.evaluate(() => App.S.code);
  await page.evaluate((g) => App.socket.emit('switchGame', { game: g }), game);
  const f = fake('Palomino Wrangle');
  await f.call('joinRoom', { code, token: f.token, profile: f.profile });
  await page.waitForFunction((g) => App.S.players.length === 2 && App.S.gameId === g, game);
  await page.evaluate(() => App.socket.emit('startGame'));
  await until(() => f.state && f.state.phase === 'game');
  return { code, f };
}

(async () => {
  const env = { ...process.env, PORT: String(PORT), ALPHA_ENABLED: '' };
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const browser = await chromium.launch();
  const fakes = [];
  try {
    // ---------- Draw & Guess at 390x844 and 1440x900 ----------
    for (const vp of [{ w: 390, h: 844, t: 'phone' }, { w: 1440, h: 900, t: 'desktop' }]) {
      const T = vp.t;
      const page = await openPage(browser, vp, 'Alex');
      const { f } = await startWithFriend(page, 'drawguess');
      fakes.push(f);
      await page.waitForSelector('[data-choose]');
      ok((await page.$$('[data-choose]')).length === 6, `${T}: the drawer is offered six words`);
      ok(f.state.game.choices === null, `${T}: the guesser never receives the word choices`);
      await page.click('[data-choose="0"]');
      await page.waitForFunction(() => App.S.game.phase === 'draw');
      await page.waitForFunction(() => !document.querySelector('#dg-tools button')?.disabled);
      const cv = await page.locator('.dg-canvas').boundingBox();
      ok(cv.width >= (T === 'phone' ? 350 : 800), `${T}: canvas is ${Math.round(cv.width)}px wide`);
      ok(Math.abs(cv.width / cv.height - 4 / 3) < 0.02, `${T}: canvas keeps 4:3`);
      ok((await overflow(page)) <= 0, `${T}: no horizontal overflow while drawing`);
      // Every swatch is on screen and is the element a tap at its centre hits (not clipped or covered).
      await page.locator('#dg-tools').scrollIntoViewIfNeeded();
      const swatches = await page.evaluate(() =>
        [...document.querySelectorAll('#dg-tools .swatch')].map((el) => {
          el.scrollIntoView({ block: 'nearest' });
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return { ok: r.left >= 0 && r.right <= window.innerWidth && (hit === el || el.contains(hit)), w: r.width };
        })
      );
      ok(swatches.length === 22 && swatches.every((s) => s.ok), `${T}: all ${swatches.length} colours are visible and tappable`);
      if (T === 'phone') {
        ok(swatches.every((s) => s.w >= 28), 'phone: colour swatches are at least 28px');
        const tb = await page.evaluate(() => [...document.querySelectorAll('#dg-tools .tool')].map((b) => b.getBoundingClientRect().width));
        ok(tb.every((w) => w >= 44), `phone: tool buttons are 44px touch targets (${tb.map(Math.round).join(',')})`);
        const below = await page.evaluate(() => document.querySelector('#dg-tools').getBoundingClientRect().top >= document.querySelector('.dg-board').getBoundingClientRect().bottom - 1);
        ok(below, 'phone: tools sit under the canvas, not beside it');
      }

      // Brush and eraser sizes are independent and survive a reload (rejoin as the same player).
      const setSize = (v) => page.$eval('#brush-size', (e, v) => { e.value = String(v); e.dispatchEvent(new Event('input', { bubbles: true })); }, v);
      await page.click('[data-tool="brush"]');
      await setSize(28);
      await page.click('[data-tool="eraser"]');
      await setSize(16);
      await page.reload();
      await page.waitForSelector('#join-btn', { state: 'visible', timeout: 3000 }).then(() => page.click('#join-btn')).catch(() => {});
      await page.waitForFunction(() => window.App && App.S && App.S.game && App.S.game.phase === 'draw');
      await page.waitForFunction(() => !document.querySelector('#dg-tools button')?.disabled);
      const sizeOf = () => page.$eval('#brush-size', (e) => Number(e.value));
      await page.click('[data-tool="brush"]');
      const b = await sizeOf();
      await page.click('[data-tool="eraser"]');
      const e = await sizeOf();
      ok(b === 28 && e === 16, `${T}: brush (28) and eraser (16) sizes survive a reload (${b}, ${e})`);

      // Replaying a fill-heavy history (what undo and late joiners do) stays quick.
      const ms = await page.evaluate(() => {
        const hist = [];
        for (let i = 0; i < 40; i++) hist.push({ t: 's', c: '#000000', s: 6, p: [20 * i, 0, 20 * i, 600] });
        for (let i = 0; i < 100; i++) hist.push({ t: 'f', c: i % 2 ? '#ff0000' : '#00ff00', x: 10 + 20 * (i % 40), y: 300 });
        const t = performance.now();
        GameUI.drawguess.onCanvas({ history: hist });
        return performance.now() - t;
      });
      ok(ms < 2500, `${T}: replaying 100 fills takes ${Math.round(ms)} ms`);
      ok(page.errors.length === 0, `${T}: no page errors (${page.errors.join(' | ')})`);

      // A guesser on the phone gets the canvas, not a disabled tool panel.
      if (T === 'phone') {
        const code = await page.evaluate(() => App.S.code);
        const g = await openPage(browser, vp, 'Gus');
        await g.goto(URL + '/r/' + code);
        await g.waitForSelector('#join-btn', { state: 'visible', timeout: 5000 }).then(() => g.click('#join-btn')).catch(() => {});
        await g.waitForFunction(() => App.S && App.S.game && App.S.game.phase === 'draw', null, { timeout: 8000 });
        await sleep(200);
        const toolsShown = await g.evaluate(() => { const t = document.getElementById('dg-tools'); return !!t && t.getClientRects().length > 0; });
        ok(!toolsShown, 'phone: guessers do not get the drawing tools');
        const gw = (await g.locator('.dg-canvas').boundingBox()).width;
        ok(gw >= 350, `phone: guesser canvas is ${Math.round(gw)}px wide`);
        ok((await overflow(g)) <= 0, 'phone: guesser has no horizontal overflow');
        await g.context().close();
      }
      await page.context().close();
    }
    // ---------- 4 in a Row and RPS on a 390px phone ----------
    // Anything inside the game stage must stay within the viewport (the page itself may not scroll
    // sideways while a child is clipped, so check elements, not just documentElement).
    const stageOverflow = (page) => page.evaluate(() => {
      const bad = [];
      for (const el of document.querySelectorAll('#stage *')) {
        const r = el.getBoundingClientRect();
        if (r.width && r.right > window.innerWidth + 1) bad.push(el.className || el.tagName);
      }
      return bad.slice(0, 5);
    });
    {
      const vp = { w: 390, h: 844 };
      const page = await openPage(browser, vp, 'Alexandria Longn');
      const { f } = await startWithFriend(page, 'fourrow');
      fakes.push(f);
      await page.waitForSelector('#fr-status');
      await page.waitForFunction(() => /Red|Yellow/.test(document.querySelector('#fr-status').textContent));
      const status = await page.textContent('#fr-status');
      const mine = await page.evaluate(() => App.S.game.myIndex);
      ok(status.includes(mine === 0 ? 'Red' : 'Yellow'), `4 in a Row phone: the status names your colour ("${status.trim()}")`);
      const discs = await page.evaluate(() => [...document.querySelectorAll('.fr-player .mini-disc')].map((d) => d.getBoundingClientRect().width));
      ok(discs.length === 2 && discs.every((w) => w >= 10), `4 in a Row phone: each player chip shows its disc colour (${discs.map(Math.round)})`);
      ok((await page.getAttribute('#fr-status', 'aria-live')) === 'polite', '4 in a Row: turn changes are announced (aria-live)');
      ok((await stageOverflow(page)).length === 0, '4 in a Row phone: nothing in the game stage overflows');
      await page.context().close();
    }
    {
      const vp = { w: 390, h: 844 };
      const page = await openPage(browser, vp, 'Alexandria Longn');
      const { f } = await startWithFriend(page, 'rps');
      fakes.push(f);
      await page.waitForSelector('.rps-duel');
      await sleep(300);
      const bad = await stageOverflow(page);
      ok(bad.length === 0, `RPS phone: the duel card fits with 16-character names (${bad.join(', ')})`);
      await page.context().close();
    }
  } catch (e) {
    console.log('FAIL  ' + (e && e.stack));
    failures++;
  } finally {
    for (const f of fakes) f.s.close();
    await browser.close();
    srv.kill();
  }
  console.log(failures ? `\n${failures} FAILED` : '\nAll phase 2 UI checks passed');
  process.exit(failures ? 1 : 0);
})();
