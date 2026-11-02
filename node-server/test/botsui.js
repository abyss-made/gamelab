// Playgrid 3.3 browser checks (Playwright; skipped when not installed): Add Bot, BOT badge, difficulty,
// Remove Bot, a real game against a bot, and the disabled state for a game without bots, on desktop
// and phone, without page errors or horizontal overflow.
// Run: node test/botsui.js
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.log('SKIP  playwright not installed; bot browser checks not run');
  process.exit(0);
}
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3977;
const URL = `http://localhost:${PORT}`;
let failures = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failures++; };
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

(async () => {
  const env = { ...process.env, PORT: String(PORT), BOT_DELAY_MS: '0' };
  delete env.HIDDEN_GAMES;
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const browser = await chromium.launch();
  try {
    for (const vp of [{ w: 1440, h: 900, t: 'desktop' }, { w: 390, h: 844, t: 'phone' }]) {
      const T = vp.t;
      const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h }, hasTouch: T === 'phone' });
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('dialog', (d) => d.accept());
      await page.goto(URL + '/?view=games');
      await page.evaluate(() => localStorage.setItem('pg_profile', JSON.stringify({ name: 'HostUser', avatar: { e: 1, c: 1 } })));
      await page.reload();
      await page.click('[data-create="tictactoe"]');
      await page.click('#c-go');
      await page.waitForSelector('#screen-room', { state: 'visible' });
      await page.waitForFunction(() => window.App && App.S);

      ok(await page.isEnabled('#add-bot'), `${T}: Add Bot is offered to the host`);
      const box = await page.locator('#add-bot').boundingBox();
      ok(box && box.height >= 40 && box.x >= 0 && box.x + box.width <= vp.w, `${T}: Add Bot is a full-size tap target inside the screen (${box && Math.round(box.height)}px high)`);
      await page.click('#add-bot');
      await page.waitForSelector('.roster-card .bot-badge');
      ok((await page.locator('.roster-card .bot-badge').count()) === 1, `${T}: the bot shows a BOT badge in the roster`);
      ok(/Bot/.test(await page.textContent('.roster-card:has(.bot-badge) .rname')), `${T}: the bot has a distinctive name`);
      ok(!(await page.isEnabled('#add-bot')), `${T}: Add Bot is disabled once seats are full`);
      ok(/seat/i.test((await page.getAttribute('#add-bot', 'title')) || ''), `${T}: the disabled button explains why`);
      await page.selectOption('.bot-level', 'hard');
      await page.waitForFunction(() => App.S.players.some((p) => p.bot && p.difficulty === 'hard'));
      ok(true, `${T}: the host sets the bot to Hard`);
      ok((await overflow(page)) <= 1, `${T}: no horizontal overflow with a bot in the lobby`);

      // Remove, add again, play.
      await page.click('[data-rmbot]');
      await page.waitForFunction(() => App.S.players.length === 1);
      ok(!(await page.locator('.bot-badge').count()), `${T}: Remove Bot takes it out of the roster`);
      await page.click('#add-bot');
      await page.waitForSelector('.roster-card .bot-badge');
      await page.click('#lobby-start');
      await page.waitForFunction(() => App.S.phase === 'game' && App.S.game);
      for (let i = 0; i < 9 && (await page.evaluate(() => App.S.phase)) === 'game'; i++) {
        await page.waitForFunction(() => App.S.phase !== 'game' || App.S.game.turn === App.S.game.myIndex, null, { timeout: 8000 });
        if ((await page.evaluate(() => App.S.phase)) !== 'game') break;
        await page.evaluate(() => {
          const g = App.S.game;
          App.socket.emit('action', { type: 'place', cell: g.board.findIndex((v) => v === 0) });
        });
        await page.waitForTimeout(150);
      }
      await page.waitForFunction(() => App.S.phase === 'lobby' && App.S.lastResult, null, { timeout: 8000 });
      ok(true, `${T}: a full Tic Tac Toe game against the bot reaches the result screen`);
      ok((await page.locator('.bot-badge:visible').count()) >= 1, `${T}: the bot is still in the party after the game`);

      // A game without bots: disabled, with the reason on screen.
      await page.evaluate(() => App.socket.emit('switchGame', { game: 'drawguess' }));
      await page.waitForFunction(() => App.S.gameId === 'drawguess' && document.querySelector('.bot-note'));
      ok(!(await page.locator('.bot-badge:visible').count()), `${T}: bots are removed when the game cannot use them`);
      ok(!(await page.isEnabled('#add-bot')) && /draw/i.test(await page.textContent('.bot-note')), `${T}: Draw & Guess shows Add Bot disabled with the reason`);
      ok((await overflow(page)) <= 1, `${T}: no horizontal overflow on the disabled state`);
      ok(errors.length === 0, `${T}: no page errors${errors.length ? ': ' + errors.join('; ') : ''}`);
      await page.screenshot({ path: path.join(__dirname, '..', '..', 'docs', 'screenshots', `bots-${T}.png`) });
      await page.close();
    }
  } catch (err) {
    ok(false, 'browser test crashed: ' + err.stack);
  } finally {
    await browser.close();
    srv.kill();
  }
  console.log(failures ? `\n${failures} failure(s)` : '\nbotsui: all checks passed');
  process.exit(failures ? 1 : 0);
})();
