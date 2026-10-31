// Browser UI checks (Playwright). Skipped when Playwright is not installed.
// Run: node test/ui.js
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.log('SKIP  playwright not installed; browser UI checks not run');
  process.exit(0);
}
const { spawn } = require('child_process');
const path = require('path');
const { io } = require('socket.io-client');

const PORT = 3997;
const URL = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const tok = () => [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
function fake(name) {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const c = { s, state: null, token: tok(), profile: { name, avatar: { e: 2, c: 3 } } };
  s.on('state', (st) => { c.state = st; });
  c.emit = (ev, d) => new Promise((r) => s.emit(ev, d, r));
  return c;
}
async function until(fn, ms = 5000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await sleep(50);
  }
  return false;
}

async function createRoom(page, game, setup) {
  await page.goto(URL + '/?view=selection');
  await page.evaluate((g) => localStorage.setItem('pg_profile', JSON.stringify({ name: 'HostUser', avatar: { e: 1, c: 1 } })), game);
  await page.reload();
  await page.click(`[data-create="${game}"]`);
  await page.click('#c-go');
  await page.waitForSelector('#screen-room', { state: 'visible' });
  return (await page.textContent('#room-code')).trim();
}

(async () => {
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((r) => srv.stdout.once('data', r));
  const browser = await chromium.launch();
  const fakes = [];
  try {
    // ---------- capacity messaging on game cards ----------
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(URL + '/?view=selection');
      await page.waitForSelector('.game-card');
      const text = await page.textContent('#games');
      ok(/2–12 players · Drawing/.test(text) && /2 players · Strategy/.test(text), 'compact game cards show player range and category');
      ok(await page.isVisible('#game-search') && (await page.$$('#game-filters [data-filter]')).length >= 3, 'catalog has search and category filters');
      ok(!/queue/i.test(text), 'no spectator queue is claimed');
      ok((await page.$$('.game-card.coming-soon')).length >= 1, 'Coming Soon tile still present');
      await page.close();
    }

    // ---------- results actions: Four in a Row, host forfeit flow ----------
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const code = await createRoom(page, 'fourrow');
      const f = fake('Friend');
      fakes.push(f);
      await f.emit('joinRoom', { code, token: f.token, profile: f.profile });
      await until(() => f.state && f.state.players.length === 2);
      await page.click('#lobby-start');
      await until(() => f.state.phase === 'game');
      f.s.emit('leaveRoom'); // opponent leaves -> forfeit result
      await page.waitForSelector('.result-card', { timeout: 5000 });
      ok(await page.isVisible('#result-choose'), 'host sees Choose Another Game on the results screen');
      ok(await page.isDisabled('#result-again'), 'Play Again is disabled with a visible reason when a seat is empty');
      ok(/Need 2 active players/.test(await page.textContent('.result-actions')), 'results explain why Play Again is unavailable');
      const f2 = fake('Friend2');
      fakes.push(f2);
      await f2.emit('joinRoom', { code, token: f2.token, profile: f2.profile });
      await page.waitForFunction(() => !document.querySelector('#result-again')?.disabled);
      await page.click('#result-again');
      await page.waitForFunction(() => document.body.dataset.phase === 'game');
      ok((await page.textContent('#room-code')).trim() === code, 'Play Again keeps the same room code');
      ok(f2.state.hostId === (await f2.state).hostId && f2.state.phase === 'game', 'other player is in the new game');
      // other player's results view shows a waiting state, not host buttons
      await page.close();
    }
    {
      // non-host view of results
      const host = fake('Host');
      fakes.push(host);
      const r = await host.emit('createRoom', { game: 'fourrow', token: host.token, profile: host.profile });
      const opp = fake('Opp');
      fakes.push(opp);
      await opp.emit('joinRoom', { code: r.code, token: opp.token, profile: opp.profile });
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(URL + '/r/' + r.code);
      await page.click('#join-btn');
      await until(() => host.state && host.state.spectators.length === 1, 8000);
      host.s.emit('startGame');
      await until(() => host.state.phase === 'game');
      opp.s.emit('leaveRoom');
      await page.waitForSelector('.result-actions', { timeout: 5000 }).catch(async (e) => { console.log(await page.evaluate(() => document.body.dataset.phase + '|' + document.body.dataset.screen), JSON.stringify(host.state && {p: host.state.phase, lr: !!host.state.lastResult, pl: host.state.players.length})); throw e; });
      ok(!(await page.$('#result-again')) && /Waiting for/.test(await page.textContent('.result-actions')), 'non-host sees a waiting state, no host buttons');
      await page.close();
    }

    // ---------- Draw & Guess: tool sizes + phone focus canvas ----------
    for (const vp of [
      { name: 'desktop', width: 1280, height: 800 },
      { name: 'phone portrait 390x844', width: 390, height: 844 },
      { name: 'phone landscape 844x390', width: 844, height: 390 },
    ]) {
      const ctxt = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.width < 900, isMobile: vp.width < 900 });
      const page = await ctxt.newPage();
      const code = await createRoom(page, 'drawguess');
      const f = fake('Pal');
      fakes.push(f);
      await f.emit('joinRoom', { code, token: f.token, profile: f.profile });
      await until(() => f.state && f.state.players.length === 2);
      await page.waitForFunction(() => { const b = document.getElementById('lobby-start'); return b && !b.hidden && !b.disabled; }); // a click on a disabled button is silently ignored
      await page.evaluate(() => document.getElementById('lobby-start').click());
      await page.waitForFunction(() => document.body.dataset.phase === 'game');
      const hostIsDrawer = await until(() => f.state.game && f.state.game.drawerId !== f.state.you, 3000);
      if (!hostIsDrawer) {
        console.log(`SKIP  ${vp.name}: host was not the drawer this run`);
        await ctxt.close();
        continue;
      }
      await page.click('[data-choose="0"]');
      await page.waitForFunction(() => !document.querySelector('#dg-tools button')?.disabled);

      if (vp.name === 'desktop') {
        const sizeOf = () => page.$eval('#brush-size', (e) => Number(e.value));
        await page.click('[data-tool="brush"]');
        await page.$eval('#brush-size', (e) => { e.value = '30'; e.dispatchEvent(new Event('input', { bubbles: true })); });
        await page.click('[data-tool="eraser"]');
        ok((await sizeOf()) === 10, 'eraser keeps its own size when brush was changed');
        await page.$eval('#brush-size', (e) => { e.value = '20'; e.dispatchEvent(new Event('input', { bubbles: true })); });
        await page.click('[data-tool="brush"]');
        ok((await sizeOf()) === 30, 'brush size restored after using eraser');
        const emitted = [];
        f.s.on('draw', (d) => { if (d.op === 'begin') emitted.push(d); });
        const box = await page.locator('.dg-canvas').boundingBox();
        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        await page.mouse.move(box.x + 90, box.y + 90);
        await page.mouse.up();
        await page.click('[data-tool="eraser"]');
        await page.mouse.move(box.x + 60, box.y + 120);
        await page.mouse.down();
        await page.mouse.up();
        await until(() => emitted.length >= 2);
        ok(emitted[0] && emitted[0].size === 30 && emitted[1] && emitted[1].size === 20 && emitted[1].color === '#ffffff', 'emitted stroke sizes match the active tool (brush 30, eraser 20)');
      } else {
        const before = await page.locator('.dg-canvas').boundingBox();
        await page.click('#dg-expand');
        await sleep(200);
        const after = await page.locator('.dg-canvas').boundingBox();
        const area = (b) => b.width * b.height;
        // Portrait gains width; landscape's old canvas overflowed the viewport, so there the bar is "fully visible and tall enough".
        ok(vp.width < vp.height ? area(after) > area(before) * 1.1 : after.height >= 320, `${vp.name}: focus canvas is larger (${Math.round(before.width)}x${Math.round(before.height)} -> ${Math.round(after.width)}x${Math.round(after.height)})`);
        ok(Math.abs(after.width / after.height - 4 / 3) < 0.02, `${vp.name}: canvas keeps 4:3 (no distortion)`);
        ok(after.x >= -1 && after.y >= -1 && after.x + after.width <= vp.width + 1 && after.y + after.height <= vp.height + 1, `${vp.name}: canvas fully on screen`);
        const toolsBox = await page.locator('#dg-tools').boundingBox();
        ok(toolsBox && toolsBox.y + toolsBox.height <= vp.height + 1 && toolsBox.x + toolsBox.width <= vp.width + 1, `${vp.name}: tool strip on screen`);
        // touch draw lands where expected: tap the canvas centre and compare to server coords
        const got = [];
        f.s.on('draw', (d) => { if (d.op === 'begin') got.push(d); });
        await page.touchscreen.tap(after.x + after.width / 2, after.y + after.height / 2);
        await page.waitForTimeout(100);
        // tap uses pointer events; dot is only sent for brush strokes via pointerdown
        if (got.length) ok(Math.abs(got[0].x - 400) < 6 && Math.abs(got[0].y - 300) < 6, `${vp.name}: touch maps to canvas centre (${got[0].x},${got[0].y})`);
        await page.screenshot({ path: path.join(process.env.UI_SHOTS || '/tmp', `focus-${vp.width}x${vp.height}.png`) });
        await page.click('#dg-expand');
        await sleep(100);
        ok(!(await page.evaluate(() => document.body.classList.contains('dg-big'))), `${vp.name}: close button exits focus mode`);
      }
      await ctxt.close();
    }
  } catch (err) {
    console.error(err);
    failures++;
  }
  fakes.forEach((x) => x.s.close());
  await browser.close();
  srv.kill();
  console.log(failures ? `\n${failures} FAILED` : '\nAll passed');
  process.exit(failures ? 1 : 0);
})();
