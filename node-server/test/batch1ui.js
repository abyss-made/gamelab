// Browser UI checks for the batch 1 quick games (Playwright). Skipped when Playwright is not installed.
// Run: node test/batch1ui.js   (set SHOTS=1 to save screenshots to docs/screenshots/issue-21)
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.log('SKIP  playwright not installed; batch 1 browser checks not run');
  process.exit(0);
}
const { spawn } = require('child_process');
const path = require('path');
const { io } = require('socket.io-client');

const PORT = 3993;
const URL = `http://localhost:${PORT}`;
const SHOTS = process.env.SHOTS ? path.join(__dirname, '..', '..', 'docs', 'screenshots', 'issue-21') : null;
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
async function until(fn, ms = 6000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await sleep(50);
  }
  return false;
}
async function createRoom(page, game) {
  await page.goto(URL + '/?view=selection');
  await page.evaluate(() => localStorage.setItem('pg_profile', JSON.stringify({ name: 'HostUser', avatar: { e: 1, c: 1 } })));
  await page.reload();
  await page.click(`[data-create="${game}"]`);
  await page.click('#c-go');
  await page.waitForSelector('#screen-room', { state: 'visible' });
  return (await page.textContent('#room-code')).trim();
}

(async () => {
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(PORT), HIDDEN_GAMES: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const browser = await chromium.launch();
  const fakes = [];
  try {
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(URL + '/?view=selection');
      await page.waitForSelector('.game-card');
      const ids = await page.$$eval('.game-card[data-game]', (els) => els.map((e) => e.dataset.game));
      for (const g of ['tictactoe', 'rps', 'dotsboxes', 'wordscramble', 'trivia']) ok(ids.includes(g), `catalog lists ${g}`);
      ok(ids.length === 25, 'catalog lists 25 playable games (2 existing + 23 new)');
      ok((await page.$$('.game-card.coming-soon')).length >= 1, 'Coming Soon tile still present and not counted');
      ok((await page.$$eval('.game-card img', (imgs) => imgs.filter((i) => !i.complete || i.naturalWidth === 0).length)) === 0, 'all game card artwork loads');
      // settings render for each new game in the create dialog without errors
      for (const g of ['tictactoe', 'rps', 'dotsboxes', 'wordscramble', 'trivia']) {
        await page.click(`[data-create="${g}"]`);
        ok((await page.$$('#create-form [data-setting]')).length === 0 && (await page.isVisible('#c-go')), `${g}: Play opens Create Party with no game settings (issue #38)`);
        await page.keyboard.press('Escape');
        await page.evaluate(() => document.querySelector('[data-close]')?.click());
      }
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'catalog-desktop.png') });
      await page.close();
    }

    for (const game of ['tictactoe', 'rps', 'dotsboxes', 'wordscramble', 'trivia']) {
      for (const vp of [{ width: 390, height: 844, tag: 'phone' }, { width: 1280, height: 800, tag: 'desktop' }]) {
        const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.tag === 'phone' });
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message + (process.env.STACK ? e.stack : '')));
        const code = await createRoom(page, game);
        if (vp.tag === 'desktop') {
          // Settings live in the lobby once a game is chosen (issue #38).
          await page.click('#game-settings-btn');
          ok((await page.$$('#modal-body .settings-fields [data-setting]')).length >= 1, `${game}: Game Settings dialog shows its settings`);
          await page.keyboard.press('Escape');
        }
        const f = fake('Friend');
        fakes.push(f);
        await f.emit('joinRoom', { code, token: f.token, profile: f.profile });
        await until(() => f.state && f.state.players.length === 2);
        await page.click('#lobby-start');
        await page.waitForFunction(() => document.body.dataset.phase === 'game', null, { timeout: 5000 });
        await sleep(300);
        const t = `${game}/${vp.tag}`;
        ok((await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, `${t}: no horizontal overflow`);
        ok(await page.evaluate(() => !!document.querySelector('#stage .b2')), `${t}: game screen mounts`);
        const me = await page.evaluate(() => window.App.S.you);

        if (vp.tag === 'desktop') {
          if (game === 'tictactoe') {
            const myTurn = () => f.state.game.players[f.state.game.turn].id === me;
            if (!myTurn()) {
              const cell = f.state.game.board.findIndex((v) => v === 0);
              f.s.emit('action', { type: 'place', cell });
              await until(myTurn);
              await sleep(200);
            }
            const free = await page.$$('.ttt-cell:not([disabled])');
            ok(free.length >= 1, `${t}: empty squares are tappable on your turn`);
            await free[0].focus();
            await page.keyboard.press('Enter');
            await until(() => !myTurn());
            await sleep(200);
            ok((await page.$$eval('.ttt-cell.m1, .ttt-cell.m2', (e) => e.length)) >= 1 && (await page.$$('.ttt-cell:not([disabled])')).length === 0, `${t}: keyboard selects a square, then the board locks until your next turn`);
          }
          if (game === 'rps') {
            await page.click('[data-move="rock"]');
            await sleep(200);
            ok(await page.isDisabled('[data-move="paper"]'), `${t}: throw buttons lock after picking`);
            ok(!JSON.stringify(f.state.game).includes('"rock"'), `${t}: opponent state has no pending pick`);
            f.s.emit('action', { type: 'pick', move: 'scissors' });
            await page.waitForFunction(() => document.querySelector('#rps-duel')?.textContent.includes('✌'), null, { timeout: 5000 });
            ok(true, `${t}: both hands are revealed after both pick`);
            ok((await page.textContent('#rps-bracket')).includes('HostUser'), `${t}: bracket lists players`);
          }
          if (game === 'dotsboxes') {
            const myTurn = () => f.state.game.players[f.state.game.turn].id === me;
            if (!myTurn()) {
              f.s.emit('action', { type: 'edge', kind: 'h', r: 0, c: 0 });
              await until(myTurn);
              await sleep(200);
            }
            const edges = await page.$$('.db-edge:not([disabled])');
            ok(edges.length > 20, `${t}: edges are tappable on your turn (${edges.length})`);
            await edges[5].click();
            await sleep(300);
            ok((await page.$$('.db-edge.taken')).length >= 1 && (await page.$$('.db-edge:not([disabled])')).length === 0, `${t}: drawn edge is shown and the board locks`);
          }
          if (game === 'wordscramble') {
            const tiles = await page.$$eval('.ws-tile', (e) => e.map((x) => x.textContent).join(''));
            ok(tiles.length >= 4, `${t}: scrambled tiles shown (${tiles})`);
            await page.fill('#ws-input', 'qqqqqq');
            await page.keyboard.press('Enter');
            await sleep(300);
            ok(await page.isEnabled('#ws-input'), `${t}: a wrong guess leaves the input available`);
            ok(!(await page.content()).includes('"word"'), `${t}: answer is not in the page`);
          }
          if (game === 'trivia') {
            const n = await page.$$eval('.tv-choice', (e) => e.length);
            ok(n === 4, `${t}: four answer choices`);
            await page.keyboard.press('2');
            await sleep(300);
            ok(await page.isDisabled('.tv-choice >> nth=0') && (await page.$$('.tv-choice.picked')).length === 1, `${t}: keyboard 1-4 picks an answer and locks it`);
            ok(!(await page.content()).includes('class="btn tv-choice right'), `${t}: correct answer is not marked before the reveal`);
            f.s.emit('action', { type: 'answer', choice: 0 });
            await page.waitForSelector('.tv-choice.right', { timeout: 5000 });
            ok(true, `${t}: correct answer highlighted after everyone answered`);
          }
        }
        if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${game}-${vp.tag}.png`) });
        ok(errors.length === 0, `${t}: no page errors${errors.length ? ' - ' + errors[0] : ''}`);
        await page.close();
      }
    }
  } finally {
    fakes.forEach((x) => x.s.close());
    await browser.close();
    srv.kill();
  }
  console.log(failures ? `\n${failures} FAILED` : '\nAll passed');
  process.exit(failures ? 1 : 0);
})();
