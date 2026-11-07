// Screenshot driver for the issue #38 QA notes: drives a running server (default :3555) with a host
// page plus socket fakes. Run from the repo root: PORT=3555 node node-server/server/index.js, then
// node docs/screenshots/playgrid-3/capture.js (needs Playwright). Writes PNGs next to this file.
const { chromium } = require('playwright');
const { io } = require('../../../node-server/node_modules/socket.io-client');
const URL = process.env.URL || 'http://localhost:3555';
const OUT = process.env.OUT || __dirname;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tok = () => [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
function fake(name, e, c) {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const f = { s, state: null, token: tok(), profile: { name, avatar: { e, c } } };
  s.on('state', (st) => (f.state = st));
  f.call = (ev, d) => new Promise((r) => s.emit(ev, d, r));
  return f;
}
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const fakes = [];
  for (const vp of [{ w: 1440, h: 900, t: 'desktop' }, { w: 390, h: 844, t: 'mobile' }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: vp.t === 'mobile', isMobile: vp.t === 'mobile' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(vp.t + ': ' + e.message));
    page.on('dialog', (d) => d.accept());
    await page.goto(URL + '/');
    await page.evaluate(() => localStorage.setItem('pg_profile', JSON.stringify({ name: 'Alex', avatar: { e: 1, c: 3 } })));
    await page.reload();
    await page.screenshot({ path: `${OUT}/${vp.t}-play.png`, fullPage: true });
    await page.goto(URL + '/games');
    await page.waitForSelector('#games .game-card');
    await page.screenshot({ path: `${OUT}/${vp.t}-games.png`, fullPage: true });
    await page.goto(URL + '/rooms');
    await sleep(400);
    await page.screenshot({ path: `${OUT}/${vp.t}-rooms-empty.png`, fullPage: true });
    // create party
    await page.click('#hero-create').catch(async () => { await page.goto(URL + '/'); await page.click('#hero-create'); });
    await page.waitForSelector('#c-go');
    await page.screenshot({ path: `${OUT}/${vp.t}-create.png` });
    await page.click('#c-go');
    await page.waitForSelector('#screen-room', { state: 'visible' });
    await page.waitForFunction(() => window.App && App.S);
    const code = await page.evaluate(() => App.S.code);
    await sleep(300);
    await page.screenshot({ path: `${OUT}/${vp.t}-lobby-empty.png`, fullPage: true });
    // friends
    const names = [['Nova', 8, 8], ['Trouble', 5, 2], ['Kai', 6, 5]];
    const fs = [];
    for (const [n, e, c] of names) {
      const f = fake(n, e, c);
      fakes.push(f);
      await f.call('joinRoom', { code, token: f.token, profile: f.profile });
      fs.push(f);
    }
    fs[0].s.emit('setReady', true);
    fs[1].s.emit('setReady', true);
    fs[0].s.emit('chat', 'ready for another one?');
    fs[1].s.emit('chat', "let's draw!");
    fs[2].s.emit('voteNext', 'drawguess');
    await sleep(400);
    // open picker as host
    await page.click('#slot-choose');
    await page.waitForSelector('#picker');
    await sleep(200);
    await page.screenshot({ path: `${OUT}/${vp.t}-picker.png` });
    await page.fill('#picker-search', 'zzz');
    await sleep(150);
    await page.screenshot({ path: `${OUT}/${vp.t}-picker-nomatch.png` });
    await page.click('#picker-clear');
    await page.click('[data-pickgame="drawguess"]');
    await page.click('#picker-go');
    await page.waitForFunction(() => App.S.gameId === 'drawguess');
    await page.evaluate(() => App.socket.emit('setReady', true));
    // two spectators in the queue: switch to a 12-player game first keeps all seated; add watchers
    for (const [n, e, c] of [['Robin', 9, 1], ['Sam', 10, 6]]) {
      const f = fake(n, e, c);
      fakes.push(f);
      await f.call('joinRoom', { code, token: f.token, profile: f.profile });
      f.s.emit('watch');
      await sleep(150);
      f.s.emit('queue', true);
    }
    await sleep(500);
    await page.screenshot({ path: `${OUT}/${vp.t}-lobby.png`, fullPage: true });
    await page.screenshot({ path: `${OUT}/${vp.t}-lobby-viewport.png` });
    if (vp.t === 'mobile') {
      await page.click('#open-activity');
      await sleep(200);
      await page.screenshot({ path: `${OUT}/${vp.t}-activity-sheet.png` });
      await page.keyboard.press('Escape');
    }
    await page.click('#game-settings-btn');
    await sleep(200);
    await page.screenshot({ path: `${OUT}/${vp.t}-settings.png` });
    await page.keyboard.press('Escape');
    await page.click('#party-settings');
    await sleep(200);
    await page.screenshot({ path: `${OUT}/${vp.t}-party-settings.png` });
    await page.keyboard.press('Escape');
    // play a quick tic tac toe to reach results
    await page.evaluate(() => App.socket.emit('switchGame', { game: 'tictactoe', seats: [App.S.you, App.S.players[1].id] }));
    await page.waitForFunction(() => App.S.gameId === 'tictactoe');
    await page.click('#lobby-start');
    await page.waitForFunction(() => App.S.phase === 'game');
    const opp = fs[0];
    const xIsHost = await page.evaluate(() => App.S.game.players[0].id === App.S.you);
    const play = async (who, cell) => { const before = opp.state.game.moves; if (who === 'host') await page.evaluate((c) => App.socket.emit('action', { type: 'place', cell: c }), cell); else opp.s.emit('action', { type: 'place', cell }); for (let i = 0; i < 40 && opp.state.phase === 'game' && opp.state.game.moves === before; i++) await sleep(50); };
    const X = xIsHost ? 'host' : 'opp', O = xIsHost ? 'opp' : 'host';
    for (const [w, c] of [[X, 0], [O, 3], [X, 1], [O, 4], [X, 2]]) { if (opp.state.phase !== 'game') break; await play(w, c); }
    await page.waitForSelector('.result-card');
    await sleep(500);
    await page.screenshot({ path: `${OUT}/${vp.t}-results.png`, fullPage: true });
    await page.click('#result-lobby');
    await page.waitForFunction(() => !App.S.lastResult);
    await sleep(300);
    await page.screenshot({ path: `${OUT}/${vp.t}-lobby-queue.png`, fullPage: true });
    // overflow check
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    console.log(vp.t, 'overflow', ov);
    await page.goto(URL + '/rooms');
    await sleep(500);
    await page.screenshot({ path: `${OUT}/${vp.t}-rooms.png`, fullPage: true });
    fakes.forEach((f) => f.s.close());
    fakes.length = 0;
    await ctx.close();
  }
  console.log('errors', errors);
  await browser.close();
})();
