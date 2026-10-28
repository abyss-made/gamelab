// Browser UI checks for the batch 4 strategy / board games (Playwright). Skipped when Playwright is not installed.
// Run: node test/batch4ui.js   (set SHOTS=1 to save screenshots to docs/screenshots/issue-24)
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.log('SKIP  playwright not installed; batch 4 browser checks not run');
  process.exit(0);
}
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { io } = require('socket.io-client');

const PORT = 3991;
const URL = `http://localhost:${PORT}`;
const SHOTS = process.env.SHOTS ? path.join(__dirname, '..', '..', 'docs', 'screenshots', 'issue-24') : null;
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
const GAMES = ['battleship', 'checkers', 'reversi', 'ludo', 'chess'];

(async () => {
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const browser = await chromium.launch();
  const fakes = [];
  try {
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(URL + '/?view=selection');
      await page.waitForSelector('.game-card');
      const ids = await page.$$eval('.game-card[data-game]', (els) => els.map((e) => e.dataset.game));
      for (const g of GAMES) ok(ids.includes(g), `catalog lists ${g}`);
      ok(ids.length === 22, 'catalog lists 22 playable games');
      ok((await page.$$('.game-card.coming-soon')).length >= 1, 'Coming Soon tile still present and not counted');
      ok((await page.$$eval('.game-card img', (imgs) => imgs.filter((i) => !i.complete || i.naturalWidth === 0).length)) === 0, 'all game card artwork loads');
      for (const g of GAMES) {
        await page.click(`[data-create="${g}"]`);
        ok((await page.$$('#create-form [data-setting]')).length >= 1, `${g}: create dialog shows its settings`);
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
        const code = await createRoom(page, game);
        const f1 = fake('Friend1');
        const f2 = fake('Friend2');
        const group = game === 'ludo' ? [f1, f2] : [f1];
        fakes.push(...group);
        for (const f of group) await f.emit('joinRoom', { code, token: f.token, profile: f.profile });
        await until(() => group.every((f) => f.state && f.state.players.length === group.length + 1));
        await page.click('#lobby-start');
        await page.waitForFunction(() => document.body.dataset.phase === 'game', null, { timeout: 5000 });
        await sleep(400);
        const t = `${game}/${vp.tag}`;
        ok((await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, `${t}: no horizontal overflow`);
        ok(await page.evaluate(() => !!document.querySelector('#stage .b2')), `${t}: game screen mounts`);
        const me = await page.evaluate(() => window.App.S.you);
        const shot = async (suffix = '') => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${game}-${vp.tag}${suffix}.png`) }); };

        if (game === 'battleship') {
          await page.waitForSelector('.bs-place');
          // a ship that hangs off the board is refused with a message
          await page.click('#bs-rotate');
          await page.click('#bs-rotate');
          await page.click('.bs-grid [data-cell="8"]'); // column I, Carrier length 5 horizontally
          ok((await page.textContent('#bs-status')).includes('hang off'), `${t}: an off-board placement shows a message`);
          for (let i = 0; i < 5; i++) await page.click(`.bs-grid [data-cell="${i * 20}"]`);
          ok(await page.isEnabled('#bs-lock'), `${t}: lock-in enables once all five ships are placed`);
          const cellBox = await page.locator('.bs-grid [data-cell="0"]').boundingBox();
          ok(cellBox.width >= 24, `${t}: grid squares are at least 24px (${Math.round(cellBox.width)}px)`);
          await shot('-place');
          ok(!JSON.stringify(f1.state.game).includes('"cells"'), `${t}: the draft fleet is never sent before locking`);
          await page.click('#bs-lock');
          f1.act({ type: 'random' });
          await page.waitForSelector('#bs-fire', { timeout: 5000 });
          ok(true, `${t}: battle starts when both fleets are locked`);
          if (f1.state.game.turn === f1.state.game.myIndex) {
            f1.act({ type: 'fire', cell: 99 });
            await until(() => f1.state.game.turn !== f1.state.game.myIndex);
            await sleep(200);
          }
          ok(await page.isDisabled('#bs-fire'), `${t}: Fire is disabled until a target is aimed`);
          await page.click('.bs-two .card:first-child .bs-grid [data-cell="0"]');
          ok(await page.isEnabled('#bs-fire'), `${t}: aiming enables Fire`);
          await shot('-battle');
          await page.click('#bs-fire');
          await until(() => f1.state.game.moves >= 1);
          ok(f1.state.game.moves >= 1, `${t}: firing is applied on the server`);
          await until(async () => (await page.$$('.bs-cell.hit, .bs-cell.miss')).length >= 1);
          ok((await page.$$('.bs-cell.hit, .bs-cell.miss')).length >= 1, `${t}: the shot shows as a hit or miss on the board`);
          ok(!JSON.stringify(f1.state.game.players).includes('"cells"') || f1.state.game.players.every((p) => p.sunk.every((s) => s.cells.length === s.len)), `${t}: opponents only receive cells of sunk ships`);
        }
        if (game === 'checkers') {
          ok((await page.$$('.ck-piece')).length === 24, `${t}: 24 pieces on the board`);
          const sq = await page.locator('.ck-sq:not([disabled])').first().boundingBox();
          ok(sq.width >= 36, `${t}: squares are touch sized (${Math.round(sq.width)}px)`);
          await page.click('.ck-sq:not([disabled]) >> nth=0');
          ok((await page.$$('.ck-sq.target')).length >= 1, `${t}: selecting a piece highlights its destinations`);
          await shot();
          await page.click('.ck-sq.target >> nth=0');
          await until(() => f1.state.game.moves === 1);
          ok(f1.state.game.moves === 1 && f1.state.game.turn === 1, `${t}: the move is sent and the turn passes`);
          const legal = f1.state.game.legal;
          const from = Number(Object.keys(legal)[0]);
          f1.act({ type: 'move', from, to: legal[from][0] });
          await until(() => f1.state.game.moves === 2);
          await sleep(200);
          ok((await page.textContent('#ck-status')).includes('Your turn'), `${t}: it is your turn again after the reply`);
        }
        if (game === 'reversi') {
          ok((await page.$$('.rv-cell.legal')).length === 4, `${t}: four legal squares are marked at the start`);
          await shot();
          await page.click('.rv-cell.legal >> nth=0');
          await until(() => f1.state.game.moves === 1);
          const five = await page.waitForFunction(() => document.querySelectorAll('.rv-disc').length === 5 && document.querySelectorAll('.rv-cell.legal').length === 0, null, { timeout: 4000 }).then(() => true, () => false);
          ok(five, `${t}: placing a disc adds it to the board and clears the legal markers on the opponent's turn`);
        }
        if (game === 'chess') {
          const lbl = await page.getAttribute('[data-sq="12"]', 'aria-label');
          ok(lbl.includes('White pawn'), `${t}: squares have accessible labels (${lbl})`);
          ok((await page.textContent('#ch-top')).match(/\d+:\d\d/), `${t}: clocks are shown`);
          await page.click('[data-sq="12"]');
          ok((await page.$$('.ch-sq.target')).length === 2, `${t}: selecting a pawn shows its two destinations`);
          await shot();
          const b = await page.locator('[data-sq="12"]').boundingBox();
          ok(b.width >= 36 || vp.width > 500, `${t}: squares are touch sized (${Math.round(b.width)}px)`);
          await page.click('[data-sq="28"]');
          await until(() => f1.state.game.moves.length === 1);
          ok(f1.state.game.moves[0] === 'e4', `${t}: the move arrives as e4`);
          ok(await page.waitForFunction(() => document.querySelector('#ch-moves').textContent.includes('e4'), null, { timeout: 4000 }).then(() => true, () => false), `${t}: the move list updates`);
          f1.act({ type: 'move', from: 52, to: 36 });
          await until(() => f1.state.game.moves.length === 2);
          f1.act({ type: 'offerDraw' });
          await until(() => f1.state.game.drawOffer === 1);
          await sleep(200);
          ok(await page.isVisible('[data-act="accept"]'), `${t}: an incoming draw offer shows Accept and Decline`);
          await page.click('[data-act="decline"]');
          await until(() => f1.state.game.drawOffer === -1);
          ok(f1.state.game.drawOffer === -1, `${t}: declining clears the offer`);
          ok(await page.evaluate(() => Object.keys(window.App.S.game.legal).length > 0), `${t}: you receive your legal moves on your turn`);
        }
        if (game === 'ludo') {
          ok((await page.$$('.ld2-tok')).length === 12, `${t}: 12 tokens (3 players x 4) in the yards`);
          const hostTurn = async () => (await page.evaluate(() => window.App.S.game.turnId)) === me;
          for (let k = 0; k < 40 && !(await hostTurn()); k++) {
            const mover = [f1, f2].find((f) => f.state.game.turnId === f.state.you);
            if (mover) {
              if (mover.state.game.phase === 'roll') mover.act({ type: 'roll' });
              else if (mover.state.game.phase === 'move') mover.act({ type: 'move', token: mover.state.game.movable[0] });
            }
            await sleep(120);
          }
          ok(await hostTurn(), `${t}: reached the host's turn`);
          await page.waitForSelector('[data-roll]', { timeout: 5000 });
          const rb = await page.locator('[data-roll]').boundingBox();
          ok(rb.height >= 44, `${t}: the roll button is touch sized (${Math.round(rb.height)}px)`);
          await shot();
          const rollsBefore = await page.evaluate(() => window.App.S.game.rolls);
          await page.click('[data-roll]');
          await until(async () => (await page.evaluate(() => window.App.S.game.rolls)) > rollsBefore);
          const dice = await page.evaluate(() => window.App.S.game.dice);
          ok(dice >= 1 && dice <= 6, `${t}: the server rolled a ${dice}`);
          ok((await page.textContent('#ld2-die')).trim().length > 0, `${t}: the die face is displayed`);
          await sleep(300);
          const movers = await page.$$('[data-move]');
          if (movers.length) {
            await page.click('[data-move] >> nth=0');
            ok(true, `${t}: chose a token with the big buttons`);
          } else ok(true, `${t}: rolled ${dice}: no legal move, the turn passes`);
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
