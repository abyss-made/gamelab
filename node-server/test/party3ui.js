// Issue #38 browser checks (Playwright; skipped when not installed): separate Play / Games / Rooms
// views, Create Party without a game, the shared party lobby (roster, readiness, game slot, votes,
// queue), the searchable picker with keyboard use, explicit Save for settings, participant
// permissions, and no horizontal overflow at 1440px and 390px.
// Run: node test/party3ui.js
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.log('SKIP  playwright not installed; party 3.0 browser checks not run');
  process.exit(0);
}
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 3974;
const URL = `http://localhost:${PORT}`;
const HIDDEN = ['higherlower', 'liarsdice', 'hotpotato', 'reversi'];
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
  const c = { s, state: null, token: tok(), notices: [], profile: { name, avatar: { e: 2, c: 3 } } };
  s.on('state', (st) => (c.state = st));
  s.on('notice', (n) => c.notices.push(n));
  c.call = (ev, d) => new Promise((r) => s.emit(ev, d, r));
  return c;
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const screen = (page) => page.evaluate(() => document.body.dataset.screen);

(async () => {
  const env = { ...process.env, PORT: String(PORT), ALPHA_ENABLED: '' };
  delete env.HIDDEN_GAMES;
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const browser = await chromium.launch();
  const fakes = [];
  try {
    for (const vp of [{ w: 1440, h: 900, t: 'desktop' }, { w: 390, h: 844, t: 'phone' }]) {
      const T = vp.t;
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: T === 'phone', isMobile: T === 'phone' });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('dialog', (d) => d.accept());
      await page.goto(URL + '/');
      await page.evaluate(() => localStorage.setItem('pg_profile', JSON.stringify({ name: 'Alex', avatar: { e: 1, c: 1 } })));

      // ----- routes: Games and Rooms are separate views -----
      await page.goto(URL + '/games');
      ok((await screen(page)) === 'selection', `${T}: /games shows the Games catalog`);
      ok((await page.$$('#games .game-card[data-game]')).length === 21, `${T}: catalog shows 21 games`);
      ok((await page.$$('#games .coming-soon')).length === 1, `${T}: Coming Soon tile kept`);
      ok((await overflow(page)) <= 0, `${T}: Games has no horizontal overflow`);
      await page.fill('#game-search', 'chess');
      ok(await until(async () => (await page.$$('#games .game-card[data-game]')).length === 1), `${T}: search narrows the catalog`);
      ok(/1 game shown/.test(await page.textContent('#games-count')), `${T}: search result count is announced`);
      await page.fill('#game-search', 'zzzz');
      ok(await page.isVisible('#games-empty') && /zzzz/.test(await page.textContent('#games-empty')), `${T}: no-match state names the query`);
      await page.click('#games-clear');
      ok((await page.$$('#games .game-card[data-game]')).length === 21 && (await page.inputValue('#game-search')) === '', `${T}: Clear Search restores all games`);
      await page.click('#game-filters [data-filter="Drawing"]');
      const drawing = await page.$$eval('#games .game-card[data-game]', (els) => els.map((e) => e.dataset.game));
      ok(drawing.length === 2 && drawing.includes('drawguess') && drawing.includes('telephone'), `${T}: Drawing filter shows the drawing games`);
      await page.click('#game-filters [data-filter="All"]');

      await page.click('.main-nav [data-view="rooms"]');
      ok(new globalThis.URL(page.url()).pathname === '/rooms' && (await screen(page)) === 'rooms', `${T}: Rooms nav opens /rooms, not Games`);
      await page.waitForFunction(() => document.querySelector('#lobby-list').getAttribute('aria-busy') === 'false');
      // The desktop pass's party may still be listed during its reconnect grace, so check the empty state once.
      if (T === 'desktop') ok(/No public parties yet\. Start one and invite your people\./.test(await page.textContent('#lobby-list')), `${T}: Rooms empty state`);
      ok(await page.isHidden('#current-party'), `${T}: no current-party card before joining one`);
      await page.fill('#code-input', 'no!');
      await page.press('#code-input', 'Enter');
      ok(/does not look right/.test(await page.textContent('#code-error')), `${T}: malformed code is explained inline`);
      await page.fill('#code-input', '#ZZZZZZ');
      await page.press('#code-input', 'Enter');
      await page.waitForFunction(() => /No party with that code/.test(document.querySelector('#code-error').textContent));
      ok((await screen(page)) === 'rooms', `${T}: #CODE form is accepted and a closed code stays on Rooms with an inline error`);
      ok((await overflow(page)) <= 0, `${T}: Rooms has no horizontal overflow`);

      // ----- Create Party: no game -----
      await page.click('.main-nav [data-tab="home"]');
      await page.click('#hero-create');
      ok((await page.$$('#modal-body [data-setting], #modal-body [data-pickgame], #modal-body select')).length === 0, `${T}: Create Party has no game, settings or seat fields`);
      ok(await page.isChecked('[name="c-vis"][value="0"]') && (await page.isChecked('#c-spec')), `${T}: private and spectators-allowed are the defaults`);
      await page.check('[name="c-vis"][value="1"]');
      await page.click('#c-go');
      await page.waitForSelector('#screen-room', { state: 'visible' });
      await page.waitForFunction(() => window.App && App.S);
      const code = await page.evaluate(() => App.S.code);
      ok(await page.evaluate(() => App.S.gameId === null && App.S.isPublic), `${T}: party created public with no game`);
      ok(/YOUR PARTY · PUBLIC/.test(await page.textContent('#party-eyebrow')) && /Alex's Party/.test(await page.textContent('#party-name')), `${T}: party header shows visibility and name`);
      ok(/No game yet/.test(await page.textContent('.game-slot')) && (await page.isVisible('#slot-choose')), `${T}: empty game slot with Choose a Game`);
      ok(await page.isDisabled('#lobby-start'), `${T}: Start Game is disabled until a game is chosen`);
      ok(!(await page.$('#game-settings-btn')), `${T}: no Game Settings before a game is chosen`);
      ok(await page.isVisible('#party-settings') && (await page.isHidden('#party-leave')), `${T}: host sees Party Settings, not Leave Party, in the header`);
      ok((await overflow(page)) <= 0, `${T}: empty lobby has no horizontal overflow`);

      // ----- friends arrive; readiness -----
      const nova = fake('Nova');
      const kai = fake('Kai');
      const robin = fake('Robin');
      fakes.push(nova, kai, robin);
      for (const f of [nova, kai, robin]) await f.call('joinRoom', { code, token: f.token, profile: f.profile });
      nova.s.emit('setReady', true);
      await page.waitForFunction(() => /1 of 4 ready/.test(document.querySelector('.ready-count')?.textContent || ''));
      ok(true, `${T}: ready count updates from another player`);
      await page.click('#ready-btn');
      await page.waitForFunction(() => App.S.players.find((p) => p.id === App.S.you).ready);
      ok((await page.getAttribute('#ready-btn', 'aria-pressed')) === 'true', `${T}: Ready toggle is pressed and reaches the server`);
      ok(/Ready/.test(await page.textContent('.roster-card.me .rstatus')), `${T}: own roster card says Ready in text`);

      // ----- votes: participant suggests, host confirms -----
      kai.s.emit('voteNext', 'tictactoe');
      await page.waitForSelector('[data-confirm-game="tictactoe"]', { state: 'attached' });
      ok(/Tic Tac Toe/.test(await page.textContent('#party-activity')) && (await page.evaluate(() => App.S.gameId)) === null, `${T}: votes are listed and never auto-select`);

      // ----- picker: keyboard, search, filters, eligibility -----
      await page.focus('#slot-choose');
      await page.keyboard.press('Enter');
      await page.waitForSelector('#picker');
      ok(await page.evaluate(() => document.activeElement.id === 'picker-search'), `${T}: picker focuses search`);
      ok((await page.$$('#picker-grid [data-pickgame]')).length === 21, `${T}: picker lists 21 games`);
      ok(!(await page.$$eval('#picker-grid [data-pickgame]', (els) => els.map((e) => e.dataset.pickgame))).some((g) => HIDDEN.includes(g)), `${T}: picker has no hidden games`);
      ok(/2 play, 2 watch/.test(await page.textContent('[data-pickgame="chess"]')), `${T}: a 2-seat game explains who watches`);
      await page.keyboard.type('qqqq');
      ok(await until(() => page.isVisible('#picker-empty')), `${T}: picker no-match state`);
      await page.click('#picker-clear');
      ok((await page.$$('#picker-grid [data-pickgame]')).length === 21, `${T}: picker Clear Search`);
      await page.click('#picker-chips [data-filter="Fits"]');
      const fit = await page.$$eval('#picker-grid [data-pickgame]', (els) => els.map((e) => e.dataset.pickgame));
      ok(fit.includes('drawguess') && fit.includes('chess') && fit.length <= 21, `${T}: Fits our party keeps games the party can play`);
      await page.click('#picker-chips [data-filter="All"]');
      await page.keyboard.press('Escape');
      ok(await until(() => page.evaluate(() => document.activeElement && document.activeElement.id === 'slot-choose')), `${T}: Escape closes the picker and returns focus`);

      // choose Draw & Guess with the keyboard
      await page.click('#slot-choose');
      await page.focus('[data-pickgame="drawguess"]');
      await page.keyboard.press('Enter');
      ok((await page.getAttribute('[data-pickgame="drawguess"]', 'aria-pressed')) === 'true', `${T}: Enter selects a game card`);
      ok(/Choose Draw & Guess/.test(await page.textContent('#picker-go')), `${T}: confirm button names the game`);
      await page.click('#picker-go');
      await page.waitForFunction(() => App.S.gameId === 'drawguess');
      ok(await page.evaluate(() => App.S.code) === code, `${T}: choosing a game keeps the same party`);
      ok(/Draw & Guess/.test(await page.textContent('.game-slot')) && /3 rounds · Medium · 80 seconds/.test(await page.textContent('.game-slot')), `${T}: game slot shows the game and a settings summary`);
      ok(!(await page.isDisabled('#lobby-start')), `${T}: Start Game enabled once a game is chosen`);

      // ----- Game Settings: explicit Save -----
      await page.click('#game-settings-btn');
      await page.click('#modal-body [data-choice="rounds"][data-value="5"]');
      await sleep(200);
      ok(await page.evaluate(() => App.S.settings.rounds) === 3, `${T}: settings are not sent before Save`);
      await page.click('#settings-save');
      await page.waitForFunction(() => App.S.settings.rounds === 5);
      ok(true, `${T}: Save Settings applies the change`);
      await page.click('#game-settings-btn');
      await page.click('#modal-body [data-choice="difficulty"][data-value="hard"]');
      await page.click('#modal-body [data-close]');
      await sleep(200);
      ok(await page.evaluate(() => App.S.settings.difficulty) === 'medium', `${T}: Cancel discards changes`);

      // ----- Party Settings -----
      await page.click('#party-settings');
      await page.check('#p-lock');
      await page.click('#p-save');
      await page.waitForFunction(() => App.S.locked);
      ok(/LOCKED/.test(await page.textContent('#party-eyebrow')), `${T}: Party Settings lock the party`);
      await page.click('#party-settings');
      await page.uncheck('#p-lock');
      await page.click('#p-save');
      await page.waitForFunction(() => !App.S.locked);

      // ----- the seat picker and the spectator queue -----
      await page.click('#slot-change');
      await page.click('[data-pickgame="tictactoe"]');
      await page.click('#picker-go');
      await page.waitForSelector('#pick-go');
      await page.click('#pick-random');
      await page.waitForFunction(() => App.S.gameId === 'tictactoe');
      const watching = await page.evaluate(() => App.S.spectators.length);
      ok(watching === 2, `${T}: Tic Tac Toe seats two and two watch`);
      if (T === 'desktop') {
        ok(/Queue #1/.test(await page.textContent('#party-activity')) && /Queue #2/.test(await page.textContent('#party-activity')), `${T}: activity panel lists the queue in order`);
      } else {
        await page.click('#open-activity');
        await page.waitForSelector('#activity-sheet');
        ok(/Queue #1/.test(await page.textContent('#activity-sheet')), `${T}: Queue & votes sheet lists the queue`);
        ok((await overflow(page)) <= 0, `${T}: activity sheet has no horizontal overflow`);
        await page.keyboard.press('Escape');
      }

      // ----- participant view of the same party -----
      const g2 = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: T === 'phone', isMobile: T === 'phone' });
      const gp = await g2.newPage();
      gp.on('pageerror', (e) => errors.push('guest: ' + e.message));
      gp.on('dialog', (d) => d.accept());
      await gp.goto(URL + '/r/' + code);
      await gp.click('#join-btn');
      await gp.waitForSelector('#screen-room', { state: 'visible' });
      await gp.waitForFunction(() => window.App && App.S);
      ok(await gp.isVisible('#party-leave') && (await gp.isHidden('#party-settings')), `${T}: participant sees Leave Party, not Party Settings`);
      ok(!(await gp.$('#lobby-start')), `${T}: participant has no Start Game`);
      ok(/Suggest/.test(await gp.textContent('#slot-change')), `${T}: participant game slot offers Suggest`);
      await gp.click('#game-settings-btn');
      ok((await gp.evaluate(() => document.querySelector('#modal-body .settings-fields').disabled)) && !(await gp.$('#settings-save')), `${T}: participant settings are read-only`);
      await gp.keyboard.press('Escape');
      await gp.click('#slot-change');
      ok(/Suggest a Game/.test(await gp.textContent('#modal-body h2')), `${T}: participant picker is Suggest a Game`);
      await gp.click('[data-pickgame="chess"]');
      await gp.click('#picker-go');
      await until(() => kai.state.nextVotes.chess === 1);
      ok(kai.state.nextVotes.chess === 1 && kai.state.gameId === 'tictactoe', `${T}: participant suggestion is a vote, not a switch`);
      if (T === 'desktop') {
        await gp.waitForSelector('#party-activity [data-unvote]');
        await gp.click('#party-activity [data-unvote]');
        await until(() => !kai.state.nextVotes.chess);
        ok(!kai.state.nextVotes.chess, `${T}: a vote can be undone`);
      }
      ok((await overflow(gp)) <= 0, `${T}: participant lobby has no horizontal overflow`);
      await gp.click('#party-leave');
      await until(() => kai.state.players.length + kai.state.spectators.length === 4);
      ok(kai.state.players.length + kai.state.spectators.length === 4, `${T}: Leave Party leaves the server room`);
      await g2.close();

      // ----- Games Play while in a party preselects the game in the same party -----
      // (phones show Play and Rooms in the lobby nav; Games is one tap further)
      await page.click('.main-nav [data-view="rooms"]');
      await page.click('.main-nav [data-view="selection"]');
      await page.click('[data-create="chess"]');
      await page.waitForSelector('#picker');
      ok((await screen(page)) === 'room' && (await page.getAttribute('[data-pickgame="chess"]', 'aria-pressed')) === 'true', `${T}: Play from Games returns to the party and preselects the game`);
      await page.keyboard.press('Escape');

      // ----- Rooms shows the current party and the public list -----
      await page.click('.main-nav [data-view="rooms"]');
      await page.waitForSelector('#current-party:not([hidden])');
      ok(/Alex's Party/.test(await page.textContent('#current-party')), `${T}: Rooms shows the current party`);
      await page.waitForFunction((c) => document.querySelector('#lobby-list').textContent.includes(c), code);
      ok(/Tic Tac Toe/.test(await page.textContent('#lobby-list')), `${T}: public list shows the party and its game`);
      await page.click('#current-return');
      await page.waitForSelector('#screen-room', { state: 'visible' });
      ok(true, `${T}: Return goes back to the party`);

      ok((await overflow(page)) <= 0, `${T}: no horizontal overflow`);
      ok(errors.length === 0, `${T}: no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
      for (const f of [nova, kai, robin]) f.s.emit('leaveRoom');
      await ctx.close();
    }
    // ----- a participant's Back to Lobby never hides the next match's results -----
    {
      const host = fake('Hostie');
      fakes.push(host);
      const r = await host.call('createRoom', { game: 'tictactoe', token: host.token, profile: host.profile });
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(URL + '/r/' + r.code);
      await page.click('#join-btn');
      await page.waitForFunction(() => window.App && App.S && App.S.role === 'player');
      const me = await page.evaluate(() => App.S.you);
      // The same moves give the same winner and an identical result, so the two results share a key.
      const playOut = async () => {
        host.s.emit('startGame');
        await until(() => host.state.phase === 'game' && host.state.game);
        const xs = host.state.game.players[0].id;
        const mover = (id) => (id === me ? (c) => page.evaluate((cell) => App.socket.emit('action', { type: 'place', cell }), c) : (c) => host.s.emit('action', { type: 'place', cell: c }));
        const X = mover(xs);
        const O = mover(xs === me ? host.state.you : me);
        for (const [f, c] of [[X, 0], [O, 3], [X, 1], [O, 4], [X, 2]]) {
          const before = host.state.game ? host.state.game.moves : -1;
          await f(c);
          await until(() => host.state.phase !== 'game' || host.state.game.moves !== before);
        }
        await until(() => host.state.phase === 'lobby' && host.state.lastResult);
      };
      await playOut();
      await page.waitForSelector('.result-card');
      await page.click('#result-dismiss');
      ok(!(await page.$('.result-card')), 'participant Back to Lobby hides the results for them');
      // Replay through the app's own state handler: results cleared, then a result with the very
      // same key (same length, winner and type). It must show at once, without another update.
      const shown = await page.evaluate(() => {
        const handler = App.socket.listeners('state')[0];
        const res = App.S;
        handler({ ...res, lastResult: null });
        handler({ ...res, lastResult: JSON.parse(JSON.stringify(res.lastResult)) });
        return !!document.querySelector('.result-card');
      });
      ok(shown, 'results with the same key show again at once after an earlier dismissal');
      ok(errors.length === 0, `dismissal check: no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
      await ctx.close();
    }
  } catch (err) {
    console.error(err);
    failures++;
  } finally {
    fakes.forEach((f) => f.s.close());
    await browser.close();
    srv.kill();
  }
  console.log(failures ? `\n${failures} FAILED` : '\nAll party 3.0 UI checks passed');
  process.exit(failures ? 1 : 0);
})();
