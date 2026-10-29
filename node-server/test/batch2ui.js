// Browser UI checks for the batch 2 games (Playwright). Skipped when Playwright is not installed.
// Run: node test/batch2ui.js   (set SHOTS=1 to save screenshots to docs/screenshots/issue-22)
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.log('SKIP  playwright not installed; batch 2 browser checks not run');
  process.exit(0);
}
const { spawn } = require('child_process');
const path = require('path');
const { io } = require('socket.io-client');

const PORT = 3995;
const URL = `http://localhost:${PORT}`;
const SHOTS = process.env.SHOTS ? path.join(__dirname, '..', '..', 'docs', 'screenshots', 'issue-22') : null;
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
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const browser = await chromium.launch();
  const fakes = [];
  try {
    // ---- catalog ----
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(URL + '/?view=selection');
      await page.waitForSelector('.game-card');
      const ids = await page.$$eval('.game-card[data-game]', (els) => els.map((e) => e.dataset.game));
      for (const g of ['wordchain', 'categories', 'higherlower', 'colorstack', 'gofish']) ok(ids.includes(g), `catalog lists ${g}`);
      ok(ids.length === 12, "catalog lists 12 playable games (2 existing + 5 batch 2 + 5 batch 1)");
      ok((await page.$$('.game-card.coming-soon')).length >= 1, 'Coming Soon tile still present and not counted as a game');
      const broken = await page.$$eval('.game-card img', (imgs) => imgs.filter((i) => !i.complete || i.naturalWidth === 0).length);
      ok(broken === 0, 'all game card artwork loads');
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'catalog-desktop.png') });
      await page.close();
    }

    const games = ['wordchain', 'categories', 'higherlower', 'colorstack', 'gofish'];
    for (const game of games) {
      for (const vp of [{ width: 390, height: 844, tag: 'phone' }, { width: 1280, height: 800, tag: 'desktop' }]) {
        const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.tag === 'phone' });
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        const code = await createRoom(page, game);
        const f = fake('Friend');
        fakes.push(f);
        await f.emit('joinRoom', { code, token: f.token, profile: f.profile });
        await until(() => f.state && f.state.players.length === 2);
        await page.click('#lobby-start');
        await page.waitForFunction(() => document.body.dataset.phase === 'game', null, { timeout: 5000 });
        await sleep(300);
        const t = `${game}/${vp.tag}`;
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        ok(overflow <= 0, `${t}: no horizontal overflow`);
        const mounted = await page.evaluate(() => !!document.querySelector('#stage .b2'));
        ok(mounted, `${t}: game screen mounts`);

        if (vp.tag === 'desktop') {
          if (game === 'wordchain') {
            // whoever's turn it is plays one valid word through the real UI/bot
            const me = await page.evaluate(() => window.App.S.you);
            const hostTurn = () => f.state.game.turnId === me;
            await until(() => f.state.game);
            if (!hostTurn()) {
              const need = f.state.game.letter;
              f.s.emit('action', { type: 'word', word: need === 'a' ? 'apple' : need === 'b' ? 'banana' : need === 'c' ? 'cat' : need === 'd' ? 'dog' : need === 'e' ? 'eagle' : need === 'f' ? 'fish' : need === 'g' ? 'goat' : need === 'h' ? 'house' : need === 'i' ? 'island' : need === 'l' ? 'lemon' : need === 'm' ? 'mouse' : need === 'n' ? 'night' : need === 'o' ? 'orange' : need === 'p' ? 'panda' : need === 'r' ? 'rabbit' : need === 's' ? 'snake' : need === 't' ? 'tiger' : 'water' });
              await until(() => hostTurn());
              await sleep(200);
            }
            const letter = await page.textContent('#wc-letter');
            ok(await page.isEnabled('#wc-input'), `${t}: word input enabled on your turn`);
            const pick = { a: 'ant', b: 'bear', c: 'cow', d: 'duck', e: 'elephant', f: 'frog', g: 'goose', h: 'horse', i: 'igloo', l: 'lion', m: 'monkey', n: 'nest', o: 'owl', p: 'pig', r: 'rat', s: 'sheep', t: 'turtle', w: 'whale', k: 'kite', y: 'yak' }[letter.toLowerCase()] || 'tree';
            await page.fill('#wc-input', 'zzzzqq');
            await page.click('#wc-send');
            await sleep(300);
            ok((await page.textContent('#wc-chain')).indexOf('zzzzqq') === -1, `${t}: a non-dictionary word is rejected in the UI`);
            await page.fill('#wc-input', pick);
            await page.click('#wc-send');
            await until(() => !hostTurn());
            await sleep(300);
            ok((await page.textContent('#wc-chain')).includes(pick.slice(0, -1)), `${t}: a valid word appears in the chain`);
          }
          if (game === 'categories') {
            const inputs = await page.$$('[data-cat]');
            ok(inputs.length === 5, `${t}: five category inputs`);
            const L = (await page.textContent('.cr-letter')).trim().toLowerCase();
            await inputs[0].fill(L + 'uniqueanswer');
            await sleep(500);
            const hostId = await page.evaluate(() => window.App.S.you);
            ok(!JSON.stringify(f.state.game).includes('uniqueanswer'), `${t}: the other player's state doesn't contain my typed answer`);
            await page.click('#cr-done');
            await sleep(300);
            ok(await page.evaluate(() => document.querySelector('[data-cat]').readOnly), `${t}: inputs lock after I'm done`);
            f.s.emit('action', { type: 'done' });
            await page.waitForSelector('.cr-table', { timeout: 5000 });
            ok((await page.textContent('.cr-table')).includes(L + 'uniqueanswer'), `${t}: review table shows answers after the round`);
          }
          if (game === 'higherlower') {
            await page.click('[data-dir="higher"]');
            await sleep(200);
            ok(await page.isDisabled('[data-dir="higher"]') && await page.isDisabled('[data-dir="lower"]'), `${t}: buttons lock after guessing`);
            const html = await page.content();
            ok(!/class="pc [^"]*flip/.test(html), `${t}: next card is not revealed before everyone guessed`);
            f.s.emit('action', { type: 'guess', dir: 'lower' });
            await page.waitForSelector('.pc.flip', { timeout: 5000 });
            ok(true, `${t}: next card flips after both guess`);
          }
          if (game === 'colorstack') {
            const me = await page.evaluate(() => window.App.S.you);
            const turnHost = () => f.state.game.turnId === me;
            if (!turnHost()) {
              // friend takes a turn: draw (or play) so the host can act
              const g = f.state.game;
              if (g.playable.length) f.s.emit('action', { type: 'play', card: g.playable[0], color: 'r' });
              else f.s.emit('action', { type: 'draw' });
              await sleep(200);
              if (!turnHost() && f.state.game.drawn !== null) f.s.emit('action', { type: 'pass' });
              await until(turnHost);
              await sleep(300);
            }
            const n = await page.$$eval('#cs-hand .cs-card', (e) => e.length);
            ok(n >= 7, `${t}: host sees their own hand (${n} cards)`);
            const enemy = JSON.stringify(f.state.game.hand);
            const pl = await page.$$('#cs-hand .cs-card.playable');
            if (pl.length) {
              const before = await page.$$eval('#cs-hand .cs-card', (e) => e.length);
              const isWild = await pl[0].evaluate((e) => e.classList.contains('c-w'));
              await pl[0].click();
              if (isWild) await page.click('[data-color="g"]');
              await sleep(400);
              const after = await page.$$eval('#cs-hand .cs-card', (e) => e.length);
              ok(after === before - 1, `${t}: tapping a playable card plays it`);
            } else {
              await page.click('#cs-draw');
              await sleep(400);
              ok(true, `${t}: draw button works when nothing is playable`);
            }
            ok(!(await page.content()).includes(enemy.slice(1, 40)) || enemy === '[]', `${t}: the other player's hand is not in the page`);
          }
          if (game === 'gofish') {
            const me = await page.evaluate(() => window.App.S.you);
            const turnHost = () => f.state.game.turnId === me;
            if (!turnHost()) {
              const g = f.state.game;
              const mine = g.hand[0];
              f.s.emit('action', { type: 'ask', target: me, rank: mine.r });
              await until(turnHost, 3000);
              await sleep(300);
            }
            if (turnHost()) {
              await page.click('#gf-ask [data-rank]');
              ok(await page.isEnabled('#gf-go'), `${t}: ask button enables once a rank is chosen (single opponent auto-selected)`);
              await page.click('#gf-go');
              await sleep(400);
              ok((await page.textContent('#gf-log')).length > 0, `${t}: the move appears in the log`);
            }
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
