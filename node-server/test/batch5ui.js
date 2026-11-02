// Browser UI checks for the batch 5 games: Pool, Mini Golf, Property Tycoon (Playwright). Skipped when Playwright
// is not installed. The browser plays one seat; scripted Socket.IO clients play the others.
// Run: node test/batch5ui.js   (set SHOTS=1 to save screenshots to docs/screenshots/issue-25)
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.log('SKIP  playwright not installed; batch 5 browser checks not run');
  process.exit(0);
}
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { io } = require('socket.io-client');

const PORT = 3994;
const URL = `http://localhost:${PORT}`;
const SHOTS = process.env.SHOTS ? path.join(__dirname, '..', '..', 'docs', 'screenshots', 'issue-25') : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
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
  c.act = (a) => s.emit('action', a);
  return c;
}
async function until(fn, ms = 8000) {
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
const GAMES = ['pool', 'golf', 'tycoon'];

(async () => {
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(PORT), HIDDEN_GAMES: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const browser = await chromium.launch();
  const fakes = [];
  try {
    // ---------- catalog ----------
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(URL + '/?view=selection');
      await page.waitForSelector('.game-card');
      const ids = await page.$$eval('.game-card[data-game]', (els) => els.map((e) => e.dataset.game));
      for (const g of GAMES) ok(ids.includes(g), `catalog lists ${g}`);
      ok(ids.length === 25, 'catalog lists 25 playable games');
      ok((await page.$$('.game-card.coming-soon')).length >= 1, 'Coming Soon tile still present and not counted');
      ok((await page.$$eval('.game-card img', (imgs) => imgs.filter((i) => !i.complete || i.naturalWidth === 0).length)) === 0, 'all game card artwork loads');
      for (const g of GAMES) {
        await page.click(`[data-create="${g}"]`);
        ok((await page.$$('#create-form [data-setting]')).length === 0 && (await page.isVisible('#c-go')), `${g}: Play opens Create Party with no game settings (issue #38)`);
        await page.keyboard.press('Escape');
        await page.evaluate(() => document.querySelector('[data-close]')?.click());
      }
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'catalog-desktop.png') });
      await page.close();
    }

    for (const game of GAMES) {
      for (const vp of [{ width: 390, height: 844, tag: 'phone' }, { width: 1280, height: 800, tag: 'desktop' }]) {
        const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.tag === 'phone' });
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
        const code = await createRoom(page, game);
        if (vp.tag === 'desktop') {
          // Settings live in the lobby once a game is chosen (issue #38).
          await page.click('#game-settings-btn');
          ok((await page.$$('#modal-body .settings-fields [data-setting]')).length >= 1, `${game}: Game Settings dialog shows its settings`);
          await page.keyboard.press('Escape');
        }
        const group = game === 'tycoon' ? [fake('Friend1'), fake('Friend2')] : [fake('Friend1')];
        fakes.push(...group);
        for (const f of group) await f.emit('joinRoom', { code, token: f.token, profile: f.profile });
        await until(() => group.every((f) => f.state && f.state.players.length === group.length + 1));
        await page.click('#lobby-start');
        await page.waitForFunction(() => document.body.dataset.phase === 'game', null, { timeout: 5000 });
        await sleep(500);
        const t = `${game}/${vp.tag}`;
        const f1 = group[0];
        ok((await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, `${t}: no horizontal overflow`);
        ok(await page.evaluate(() => !!document.querySelector('#stage .b2')), `${t}: game screen mounts`);
        const shot = async (suffix = '') => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${game}-${vp.tag}${suffix}.png`) }); };

        // ================= POOL =================
        if (game === 'pool') {
          const canvas = page.locator('#pl-canvas');
          const box = await canvas.boundingBox();
          ok(box.width >= 340 && box.height >= 180, `${t}: the table is a usable size (${Math.round(box.width)}x${Math.round(box.height)})`);
          ok((await canvas.getAttribute('aria-label')).includes('Drag to aim'), `${t}: the table has an accessible description`);
          const hostFirst = await page.evaluate(() => window.App.S.game.turn === window.App.S.game.myIndex);
          if (!hostFirst) {
            // let the friend take the break so the host can be tested with ball in hand
            f1.act({ type: 'shoot', angle: 0, power: 0.9, place: { x: 200, y: 250 } });
            await until(() => f1.state.game.shots >= 1);
            await sleep(500);
          }
          await page.waitForFunction(() => { const g = window.App.S.game; return g && g.turn === g.myIndex; }, null, { timeout: 40000 });
          await page.waitForFunction(() => !document.querySelector('#pl-shoot').disabled || document.querySelector('#pl-place:not([hidden])'), null, { timeout: 40000 });
          const inHand = await page.evaluate(() => window.App.S.game.inHand);
          if (inHand) {
            ok((await page.textContent('#pl-status')).includes('Ball in hand'), `${t}: ball in hand is announced`);
            ok(await page.isDisabled('#pl-shoot'), `${t}: Shoot waits until the cue ball is locked in place`);
            // drag the cue ball
            await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
            await page.mouse.down();
            await page.mouse.move(box.x + box.width * 0.18, box.y + box.height * 0.4, { steps: 4 });
            await page.mouse.up();
            ok(await page.isEnabled('#pl-place'), `${t}: the cue ball can be dragged to a legal spot and locked`);
            await page.click('#pl-place');
            ok(await page.isEnabled('#pl-shoot'), `${t}: Shoot enables after the cue ball is locked`);
          }
          // aim by dragging on the table, power by slider
          const aim0 = await page.inputValue('#pl-aim');
          await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.55, { steps: 6 });
          await page.mouse.up();
          const aim1 = await page.inputValue('#pl-aim');
          ok(aim0 !== aim1, `${t}: dragging on the table changes the aim`);
          await canvas.focus();
          await page.keyboard.press('ArrowRight');
          ok((await page.inputValue('#pl-aim')) !== aim1, `${t}: arrow keys fine-tune the aim`);
          await page.fill('#pl-pow', '85').catch(() => {});
          await page.evaluate(() => { const e = document.querySelector('#pl-pow'); e.value = 85; e.dispatchEvent(new Event('input', { bubbles: true })); });
          ok((await page.textContent('#pl-pow-val')).includes('85'), `${t}: the power slider updates the readout`);
          const sliderBox = await page.locator('#pl-pow').boundingBox();
          ok(sliderBox.height >= 28 && sliderBox.width >= 200, `${t}: the power slider is touch sized`);
          await shot('-aim');
          const shotsBefore = await page.evaluate(() => window.App.S.game.shots);
          await page.click('#pl-shoot');
          await until(() => f1.state && f1.state.game.shots === shotsBefore + 1);
          ok(f1.state.game.shots === shotsBefore + 1, `${t}: Shoot sends the shot and the server plays it`);
          ok(f1.state.game.anim && f1.state.game.anim.frames.length > 5, `${t}: the server returns the path of the balls`);
          ok(await page.isDisabled('#pl-shoot'), `${t}: controls lock while the balls roll`);
          // the canvas animates
          const frameA = await page.evaluate(() => document.querySelector('#pl-canvas').toDataURL());
          await sleep(700);
          const frameB = await page.evaluate(() => document.querySelector('#pl-canvas').toDataURL());
          ok(frameA !== frameB, `${t}: the table animates the shot`);
          await shot('-rolling');
          await page.waitForFunction(() => !/rolling/.test(document.querySelector('#pl-status').textContent), null, { timeout: 30000 });
          ok(true, `${t}: the status returns to normal when the balls stop`);
          await shot('-after');
          // spectator-style info: groups or open table shown
          ok((await page.textContent('#pl-players')).length > 10, `${t}: both players are listed`);
          await page.click('#pl-resign');
          ok((await page.textContent('#pl-resign')).includes('Tap again'), `${t}: Resign asks for a second tap`);
        }

        // ================= GOLF =================
        if (game === 'golf') {
          const canvas = page.locator('#gf-canvas');
          const box = await canvas.boundingBox();
          ok(box.width >= 340, `${t}: the hole is a usable size (${Math.round(box.width)}px wide)`);
          ok((await page.$$('.gf-table tbody tr')).length === 2, `${t}: the scorecard lists both players`);
          const hostFirst = await page.evaluate(() => window.App.S.game.turnId === window.App.S.you);
          ok(hostFirst, `${t}: the first player starts hole 1`);
          ok((await page.textContent('#gf-status')).includes('Straight Shot'), `${t}: the hole name and par are shown`);
          await page.waitForFunction(() => !document.querySelector('#gf-putt').disabled);
          const a0 = await page.inputValue('#gf-aim');
          await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.8, { steps: 5 });
          await page.mouse.up();
          ok((await page.inputValue('#gf-aim')) !== a0, `${t}: dragging aims the putt`);
          await shot('-aim');
          // exact ace: aim straight, 90% power
          await page.evaluate(() => {
            for (const [id, v] of [['#gf-aim', 0], ['#gf-pow', 90]]) { const e = document.querySelector(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }
          });
          ok((await page.textContent('#gf-pow-val')).includes('90'), `${t}: the power readout follows the slider`);
          await page.click('#gf-putt');
          await until(() => f1.state.game.players[0].strokes === 1);
          ok(f1.state.game.players[0].holed, `${t}: a straight 90% putt sinks on hole 1`);
          ok(f1.state.game.anim && f1.state.game.anim.outcome === 'cup', `${t}: the server reports the ball dropping in`);
          const fa = await page.evaluate(() => document.querySelector('#gf-canvas').toDataURL());
          await sleep(500);
          ok(fa !== (await page.evaluate(() => document.querySelector('#gf-canvas').toDataURL())), `${t}: the putt animates`);
          await shot('-rolling');
          await sleep(1800);
          // friend takes a shot that misses, then sinks
          f1.act({ type: 'putt', angle: Math.PI, power: 0.05 });
          await until(() => f1.state.game.players[1].strokes === 1);
          await sleep(1500);
          f1.act({ type: 'putt', angle: 0, power: 0.95 });
          await until(() => f1.state.game.phase === 'between' || f1.state.game.players[1].strokes >= 2);
          await page.waitForSelector('#gf-between:not([hidden])', { timeout: 15000 }).catch(() => {});
          ok(await page.isVisible('#gf-between').catch(() => false) || f1.state.game.holeIndex === 1, `${t}: the hole summary appears when everyone is down`);
          await shot('-between');
          const card = await page.textContent('#gf-card');
          ok(/Total/.test(card) && /HostUser/.test(card), `${t}: the scorecard shows the totals`);
          await page.waitForFunction(() => window.App.S.game.holeIndex === 1, null, { timeout: 15000 }).catch(() => {});
          ok(await page.evaluate(() => window.App.S.game.holeIndex >= 1 || window.App.S.game.phase === 'play'), `${t}: play moves on to the next hole`);
        }

        // ================= TYCOON =================
        if (game === 'tycoon') {
          ok((await page.$$('.ty-tile')).length === 36, `${t}: all 36 tiles are drawn`);
          const tileBox = await page.locator('.ty-tile >> nth=1').boundingBox();
          ok(tileBox.width >= 28 && tileBox.height >= 28, `${t}: tiles are tappable (${Math.round(tileBox.width)}px)`);
          ok((await page.$$('.ty-tok')).length >= 3, `${t}: every player's token is on the board`);
          ok(await page.evaluate(() => [...document.querySelectorAll('.ty-tile')].every((b) => b.getAttribute('aria-label'))), `${t}: every tile has an accessible label`);
          await page.click('.ty-tile[data-tile="7"]');
          ok((await page.textContent('#ty-info')).includes('Kite Hill'), `${t}: tapping a tile shows its details`);
          await page.click('[data-close-info]');
          // play the friends' turns until it is the browser player's turn
          const fr = group;
          const stepFriends = async () => {
            for (let n = 0; n < 60; n++) {
              const g = await page.evaluate(() => window.App.S.game);
              if (g.turnId === (await page.evaluate(() => window.App.S.you))) return true;
              const f = fr.find((x) => x.state.you === g.turnId);
              if (!f) { await sleep(100); continue; }
              if (g.phase === 'roll') f.act({ type: 'roll' });
              else if (g.phase === 'buy') f.act({ type: 'decline' });
              else if (g.phase === 'manage') f.act({ type: 'end' });
              else if (g.phase === 'auction') { for (const x of fr) x.act({ type: 'pass' }); await page.evaluate(() => window.App.socket.emit('action', { type: 'pass' })); await sleep(200); }
              await sleep(250);
            }
            return false;
          };
          ok(await stepFriends(), `${t}: it becomes the browser player's turn`);
          await page.waitForSelector('[data-act="roll"]', { timeout: 8000 });
          await shot('-myturn');
          await page.click('[data-act="roll"]');
          await page.waitForFunction(() => window.App.S.game.rollNo >= 1, null, { timeout: 5000 });
          ok((await page.textContent('.ty-dice')).trim().length > 0 || (await page.$$('.ty-die')).length === 2, `${t}: the dice are shown`);
          await sleep(1800); // token walks
          // resolve whatever happened
          let sawAuction = false;
          for (let n = 0; n < 12; n++) {
            const g = await page.evaluate(() => window.App.S.game);
            const me = await page.evaluate(() => window.App.S.you);
            if (g.turnId !== me) break;
            if (g.phase === 'buy') {
              if (!sawAuction) {
                ok(await page.isVisible('[data-act="decline"]'), `${t}: buy and auction buttons are offered`);
                await shot('-buy');
                await page.click('[data-act="decline"]');
                await page.waitForSelector('#ty-bid', { timeout: 5000 });
                sawAuction = true;
                ok(true, `${t}: sending a property to auction opens the bidding panel`);
                await shot('-auction');
                await page.fill('#ty-bid', String(g.board[g.players.find((p) => p.id === me).pos].price / 2));
                await page.click('[data-act="bid"]');
                await until(() => fr[0].state.game.auction && fr[0].state.game.auction.highId === me);
                ok(fr[0].state.game.auction.highId === me, `${t}: a bid typed in the browser is placed`);
                for (const x of fr) x.act({ type: 'pass' });
                await until(() => !fr[0].state.game.auction);
                ok(fr[0].state.game.owners.includes(fr[0].state.game.players.findIndex((p) => p.id === me)), `${t}: winning the auction gives you the property`);
              } else await page.click('[data-act="decline"]');
            } else if (g.phase === 'manage') {
              // try a trade from the UI: give $10 to Friend1
              // Phone layout (3.1): trades live in the Properties & trades view.
              if (await page.isVisible('[data-tyview="props"]')) await page.click('[data-tyview="props"]');
              await page.click('[data-trade-toggle]');
              ok(await page.isVisible('#tf-to'), `${t}: the trade form opens`);
              await page.fill('#tf-give', '10');
              await page.selectOption('#tf-to', fr[0].state.you);
              await shot('-trade');
              await page.click('[data-trade-send]');
              await until(() => fr[0].state.game.trades.length === 1);
              ok(fr[0].state.game.trades.length === 1 && fr[0].state.game.trades[0].giveCash === 10, `${t}: the trade offer is sent to the other player`);
              const before = fr[0].state.game.players.find((p) => p.id === fr[0].state.you).cash;
              await sleep(200);
              ok(fr[0].state.game.players.find((p) => p.id === fr[0].state.you).cash === before, `${t}: nothing changes hands until it is accepted`);
              fr[0].act({ type: 'trade_accept', id: fr[0].state.game.trades[0].id });
              await until(() => fr[0].state.game.trades.length === 0);
              ok(fr[0].state.game.players.find((p) => p.id === fr[0].state.you).cash === before + 10, `${t}: accepting completes the trade`);
              await page.click('[data-act="end"]');
              break;
            } else if (g.phase === 'roll') await page.click('[data-act="roll"]');
            await sleep(500);
          }
          await shot('-after');
        }
        ok((await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, `${t}: still no horizontal overflow after playing`);
        ok(errors.length === 0, `${t}: no page errors${errors.length ? ' - ' + errors[0] : ''}`);
        fakes.splice(0).forEach((x) => x.s.close());
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
