// Issue #35 browser checks (Playwright; skipped when not installed): the four hidden games never
// appear in any picker, and the party controls (Back to Lobby, next-game vote, spectator queue,
// host transfer) work on desktop and phone without page errors or horizontal overflow.
// Run: node test/partyui.js
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.log('SKIP  playwright not installed; party browser checks not run');
  process.exit(0);
}
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 3973;
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
  const c = { s, state: null, token: tok(), profile: { name, avatar: { e: 2, c: 3 } } };
  s.on('state', (st) => (c.state = st));
  c.call = (ev, d) => new Promise((r) => s.emit(ev, d, r));
  return c;
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

(async () => {
  const base = { ...process.env, PORT: String(PORT) };
  delete base.HIDDEN_GAMES;
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env: base, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const browser = await chromium.launch();
  const fakes = [];
  try {
    for (const vp of [{ w: 1440, h: 900, t: 'desktop' }, { w: 390, h: 844, t: 'phone' }]) {
      const T = vp.t;
      const ctx = { viewport: { width: vp.w, height: vp.h }, hasTouch: T === 'phone' };
      const host = await browser.newPage(ctx);
      const errors = [];
      host.on('pageerror', (e) => errors.push(e.message));
      host.on('dialog', (d) => d.accept());

      // ----- catalog and pickers -----
      await host.goto(URL + '/?view=games');
      await host.evaluate(() => localStorage.setItem('pg_profile', JSON.stringify({ name: 'HostUser', avatar: { e: 1, c: 1 } })));
      await host.reload();
      const cards = await host.$$eval('#games .game-card[data-game]', (els) => els.map((e) => e.dataset.game));
      ok(cards.length === 21, `${T}: catalog shows 21 games (got ${cards.length})`);
      ok(!cards.some((g) => HIDDEN.includes(g)), `${T}: no hidden game tile in the catalog`);
      ok((await host.$$('#games .coming-soon')).length === 1, `${T}: Coming Soon tile kept`);
      ok(!(await host.$$eval('[data-quick],[data-create]', (els) => els.map((e) => e.dataset.quick || e.dataset.create))).some((g) => HIDDEN.includes(g)), `${T}: no Play or Quick Play button for a hidden game`);
      await host.goto(URL + '/reversi');
      ok(new globalThis.URL(host.url()).search === '?view=games' && (await host.evaluate(() => document.body.dataset.screen)) === 'selection', `${T}: old /reversi link lands on the catalog`);
      ok((await host.$$('.game-card[data-game="reversi"]')).length === 0, `${T}: no reversi card after the redirect`);

      await host.click('[data-create="tictactoe"]');
      const tiles = await host.$$eval('#modal-body [data-pick]', (els) => els.map((e) => e.dataset.pick));
      ok(tiles.length === 21 && !tiles.some((g) => HIDDEN.includes(g)), `${T}: Create Lobby offers 21 games, none hidden`);
      await host.click('#c-go');
      await host.waitForSelector('#screen-room', { state: 'visible' });
      const code = (await host.textContent('#room-code')).trim();
      const opts = await host.$$eval('#switch-game option', (els) => els.map((e) => e.value));
      ok(opts.length === 21 && !opts.some((g) => HIDDEN.includes(g)), `${T}: host Game Mode list has 21 games, none hidden`);

      // ----- two more people: one plays, one (a phone page) spectates -----
      const pal = fake('Pal');
      fakes.push(pal);
      await pal.call('joinRoom', { code, token: pal.token, profile: pal.profile });
      const spec = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
      spec.on('pageerror', (e) => errors.push('spectator: ' + e.message));
      spec.on('dialog', (d) => d.accept());
      await spec.goto(URL + '/r/' + code);
      await spec.evaluate(() => localStorage.setItem('pg_profile', JSON.stringify({ name: 'Watcher', avatar: { e: 4, c: 4 } })));
      await spec.click('#join-btn');
      await spec.waitForSelector('#screen-room', { state: 'visible' });
      await until(() => pal.state && pal.state.spectators.length === 1);
      ok(await spec.isVisible('[data-queue="1"]'), `${T}: spectator sees Join the Queue when seats are full`);
      await spec.click('[data-queue="1"]');
      await until(() => pal.state.queue.length === 1);
      await spec.waitForSelector('.queue-note', { timeout: 3000 }).catch(() => {});
      ok(/#1 in line/.test(await spec.textContent('#seat-action')), `${T}: spectator sees their queue position`);

      // ----- play a game to the result -----
      await host.click('#lobby-start');
      await until(() => pal.state.phase === 'game' && pal.state.game);
      const g = pal.state.game;
      const xIsHost = g.players[0].id !== pal.state.you;
      const moves = [[0, 3], [1, 4], [2]];
      for (const [xc, oc] of moves) {
        const before = pal.state.game.moves;
        if (xIsHost) await host.evaluate((c) => App.socket.emit('action', { type: 'place', cell: c }), xc);
        else pal.s.emit('action', { type: 'place', cell: xc });
        await until(() => pal.state.phase !== 'game' || pal.state.game.moves !== before);
        if (oc === undefined || pal.state.phase !== 'game') break;
        const b2 = pal.state.game.moves;
        if (xIsHost) pal.s.emit('action', { type: 'place', cell: oc });
        else await host.evaluate((c) => App.socket.emit('action', { type: 'place', cell: c }), oc);
        await until(() => pal.state.phase !== 'game' || pal.state.game.moves !== b2);
      }
      await until(() => pal.state.phase === 'lobby' && pal.state.lastResult);
      ok(!!pal.state.lastResult, `${T}: game finished`);

      // results: whoever is host now sees host actions; others can vote
      await host.waitForSelector('.result-card', { timeout: 5000 });
      ok(await host.isVisible('#result-again'), `${T}: host sees Play Again`);
      ok(await host.isVisible('#result-lobby'), `${T}: host sees Back to Lobby`);
      await spec.waitForSelector('.result-card', { timeout: 5000 });
      const specRole = await spec.evaluate(() => App.S.role);
      ok(!(await spec.$('#result-again')), `${T}: non-host has no Play Again button`);
      const voteOpts = await spec.$$eval('#vote-next option', (els) => els.map((e) => e.value).filter(Boolean));
      ok(voteOpts.length === 21 && !voteOpts.some((x) => HIDDEN.includes(x)), `${T}: vote picker lists 21 games, none hidden`);
      await spec.selectOption('#vote-next', 'chess');
      await until(() => pal.state.nextVotes.chess === 1);
      ok(pal.state.nextVotes.chess === 1, `${T}: a vote from the phone reaches the server`);
      await host.waitForFunction(() => /Chess 1/.test(document.querySelector('.vote-tally')?.textContent || ''), null, { timeout: 3000 }).catch(() => {});
      ok(/Chess 1/.test((await host.textContent('#lobby-top')) || ''), `${T}: host sees the vote tally`);
      ok(specRole === 'player' || specRole === 'spectator', `${T}: queued spectator role is ${specRole} after winner-stays`);

      await host.click('#result-choose');
      const picks = await host.$$eval('[data-pickgame]', (els) => els.map((e) => e.dataset.pickgame));
      ok(picks.length === 21 && !picks.some((x) => HIDDEN.includes(x)), `${T}: Choose Another Game lists 21 games, none hidden`);
      ok(/1 vote/.test(await host.textContent('[data-pickgame="chess"]')), `${T}: Choose Another Game shows vote counts`);
      await host.keyboard.press('Escape');

      await host.click('#result-lobby');
      await until(() => !pal.state.lastResult);
      await host.waitForFunction(() => document.body.dataset.phase === 'lobby', null, { timeout: 3000 }).catch(() => {});
      ok((await host.evaluate(() => document.body.dataset.phase)) === 'lobby', `${T}: Back to Lobby returns the host view to the lobby`);
      ok((await spec.evaluate(() => document.body.dataset.phase)) === 'lobby', `${T}: and everyone else's view too`);

      // host transfer from the roster
      if (T === 'phone') {
        await host.click('#mobile-players-toggle').catch(() => {});
      }
      const promote = `[data-promote="${pal.state.you}"]`;
      await host.$eval(promote, (b) => b.click());
      await until(() => pal.state.hostId === pal.state.you);
      ok(pal.state.hostId === pal.state.you, `${T}: host can hand hosting to another player from the roster`);
      await until(async () => !(await host.$('#switch-game:not(:disabled)')) || (await host.evaluate(() => App.S.hostId !== App.S.you)));
      ok(await host.evaluate(() => App.S.hostId !== App.S.you), `${T}: former host's view updates`);

      ok((await overflow(host)) <= 0 && (await overflow(spec)) <= 0, `${T}: no horizontal overflow`);
      ok(errors.length === 0, `${T}: no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
      pal.s.emit('leaveRoom');
      await host.close();
      await spec.close();
    }
  } catch (err) {
    console.error(err);
    failures++;
  } finally {
    fakes.forEach((f) => f.s.close());
    await browser.close();
    srv.kill();
  }
  console.log(failures ? `\n${failures} FAILED` : '\nAll party UI checks passed');
  process.exit(failures ? 1 : 0);
})();
