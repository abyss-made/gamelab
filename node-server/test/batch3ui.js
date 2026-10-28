// Browser UI checks for the batch 3 social games (Playwright). Skipped when Playwright is not installed.
// Run: node test/batch3ui.js   (set SHOTS=1 to save screenshots to docs/screenshots/issue-23)
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.log('SKIP  playwright not installed; batch 3 browser checks not run');
  process.exit(0);
}
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { io } = require('socket.io-client');

const PORT = 3998;
const URL = `http://localhost:${PORT}`;
const SHOTS = process.env.SHOTS ? path.join(__dirname, '..', '..', 'docs', 'screenshots', 'issue-23') : null;
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
const GAMES = ['telephone', 'bluff', 'impostor', 'liarsdice', 'hotpotato'];

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
        fakes.push(f1, f2);
        for (const f of [f1, f2]) await f.emit('joinRoom', { code, token: f.token, profile: f.profile });
        await until(() => f2.state && f2.state.players.length === 3);
        await page.click('#lobby-start');
        await page.waitForFunction(() => document.body.dataset.phase === 'game', null, { timeout: 5000 });
        await sleep(400);
        const t = `${game}/${vp.tag}`;
        ok((await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0, `${t}: no horizontal overflow`);
        ok(await page.evaluate(() => !!document.querySelector('#stage .b2')), `${t}: game screen mounts`);
        const me = await page.evaluate(() => window.App.S.you);

        if (game === 'telephone') {
          await page.fill('#tp-input', 'a purple elephant');
          await page.click('#tp-form button');
          f1.act({ type: 'text', text: 'prompt one' });
          f2.act({ type: 'text', text: 'prompt two' });
          await page.waitForSelector('#tp-cwrap canvas', { timeout: 5000 });
          ok(true, `${t}: drawing round shows the canvas`);
          ok((await page.textContent('.tp-prompt')).includes('prompt'), `${t}: you are shown another player's prompt`);
          const box = await page.locator('#tp-cwrap canvas').boundingBox();
          ok(box.width > 0 && box.width <= vp.width, `${t}: canvas fits the screen (${Math.round(box.width)}px)`);
          await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.6, { steps: 6 });
          await page.mouse.up();
          const inked = await page.$eval('#tp-cwrap canvas', (c) => {
            const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
            for (let i = 0; i < d.length; i += 4) if (d[i] < 50 && d[i + 1] < 50) return true;
            return false;
          });
          ok(inked, `${t}: drawing with the pointer puts ink on the canvas`);
          // more fills than the server allows must be stopped on the client, not rejected after locking
          await page.click('[data-tool="fill"]');
          for (let k = 0; k < 24; k++) await page.locator('#tp-cwrap canvas').click({ position: { x: box.width * (0.05 + 0.03 * k), y: box.height * 0.9 } });
          ok((await page.textContent('#tp-limit')).includes('limit'), `${t}: hitting the fill limit shows a message instead of silently over-collecting`);
          await page.click('#tp-done');
          await until(() => f1.state.game.players.some((p) => p.id === me && p.done));
          ok(f1.state.game.players.some((p) => p.id === me && p.done), `${t}: submitted drawing is recorded`);
          ok(!JSON.stringify(f1.state.game).includes('"strokes"') || f1.state.game.source, `${t}: others only receive the single entry handed to them`);
          if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${game}-${vp.tag}.png`) });
        }
        if (game === 'bluff') {
          await page.fill('#bl-input', 'A walrus tusk');
          await page.click('#bl-form button');
          f1.act({ type: 'bluff', text: 'Fake one' });
          f2.act({ type: 'bluff', text: 'Fake two' });
          await page.waitForSelector('.bl-options button', { timeout: 5000 });
          const opts = await page.$$eval('.bl-options button', (b) => b.map((x) => x.textContent));
          ok(opts.length === 4, `${t}: voting lists every bluff plus the real answer`);
          ok(await page.isDisabled('.bl-options button:has-text("(yours)")'), `${t}: your own bluff cannot be voted for`);
          if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${game}-${vp.tag}.png`) });
          await page.click('.bl-options button:not([disabled]) >> nth=0');
          await sleep(300);
          ok((await page.$$('.bl-options button.picked')).length === 1, `${t}: tapping an option locks your vote`);
          ok(!/"real"|"authors"/.test(JSON.stringify(f1.state.game)), `${t}: other clients see no authorship during voting`);
        }
        if (game === 'impostor') {
          const role = await page.textContent('#im-role');
          const meImp = role.includes('IMPOSTOR');
          const word = f1.state.game.word || f2.state.game.word;
          ok(meImp ? !role.includes(word || '\u0000') : role.includes('Secret word'), `${t}: role card shows ${meImp ? 'no word to the impostor' : 'the secret word to the crew'}`);
          const roles = [f1, f2].map((f) => f.state.game.role).concat(meImp ? ['impostor'] : ['crew']);
          ok(roles.filter((r) => r === 'impostor').length === 1, `${t}: exactly one impostor in the room`);
          if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${game}-${vp.tag}.png`) });
        }
        if (game === 'liarsdice') {
          ok((await page.$$('#ld-hand .ld-die')).length === 5, `${t}: you see your five dice`);
          const myTurn = () => f1.state.game.turnId === me;
          for (let q = 1; !myTurn() && q < 4; q++) {
            const starter = [f1, f2].find((f) => f.state.game.turnId === f.state.you);
            starter.act({ type: 'bid', qty: q, face: 2 });
            await sleep(250);
          }
          await until(myTurn);
          await page.waitForSelector('[data-send="bid"]', { timeout: 5000 });
          ok(true, `${t}: bid controls appear on your turn`);
          await page.click('[data-step="1"]');
          await page.click('[data-face="6"]');
          await page.click('[data-send="bid"]');
          await until(() => f1.state.game.bid && f1.state.game.bidderId === me);
          ok(f1.state.game.bid && f1.state.game.bid.face === 6, `${t}: placing a bid updates the table`);
          ok(await page.waitForSelector('[data-send="bid"]', { state: 'detached', timeout: 3000 }).then(() => true, () => false), `${t}: controls hide when it is not your turn`);
          ok(!JSON.stringify(f1.state.game).includes('"hands"'), `${t}: opponents' dice are not sent`);
          if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${game}-${vp.tag}.png`) });
        }
        if (game === 'hotpotato') {
          const holderIsMe = () => f1.state.game.holderId === me;
          if (!holderIsMe()) {
            const h = [f1, f2].find((f) => f.state.game.holderId === f.state.you);
            h.act({ type: 'pass', to: me, answer: 'pear' });
            await until(holderIsMe);
            await sleep(300);
          }
          await page.waitForSelector('#hp-input', { timeout: 5000 });
          ok(true, `${t}: the holder gets an answer box`);
          ok(!/fuse/i.test(await page.evaluate(() => JSON.stringify(window.App.S.game))), `${t}: no fuse info in game state`);
          if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${game}-${vp.tag}.png`) });
          await page.fill('#hp-input', 'zebra');
          await page.click('.hp-targets button:not([disabled]) >> nth=0');
          ok((await page.inputValue('#hp-input')) === 'zebra', `${t}: choosing a recipient keeps the typed answer`);
          await page.click('#hp-form button');
          await until(() => !holderIsMe());
          ok(!holderIsMe(), `${t}: answering passes the bomb on`);
        }
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
