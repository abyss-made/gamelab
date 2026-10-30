// Rules coverage for all 25 games + Rules / Focus-mode browser checks (Playwright; browser part skipped if not installed).
// Run: node test/qol.js   (SHOTS=1 saves 1440/390 screenshots to docs/screenshots/issue-33)
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawn } = require('child_process');
const PUB = path.join(__dirname, '..', 'public');
let failures = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failures++; };

// ---- static: every game has complete, accurate-shaped rules ----
const main = fs.readFileSync(path.join(PUB, 'js', 'main.js'), 'utf8');
const gamesSrc = main.match(/const GAMES = \{[\s\S]*?\n  \};/)[0].replace('const GAMES = ', '').replace(/;$/, '');
const GAMES = vm.runInNewContext('(' + gamesSrc + ')');
const win = {};
for (const f of ['rules-a', 'rules-b', 'rules-c']) vm.runInNewContext(fs.readFileSync(path.join(PUB, 'js', 'rules', f + '.js'), 'utf8'), { window: win });
const ids = Object.keys(GAMES);
ok(ids.length === 25, '25 games are registered');
ok(Object.keys(win.GameRules).sort().join() === ids.slice().sort().join(), 'rules exist for exactly the 25 registered games');
for (const id of ids) {
  const R = win.GameRules[id] || {};
  const g = GAMES[id];
  ok(['goal', 'players', 'timer', 'ending'].every((k) => typeof R[k] === 'string' && R[k].length > 8), `${id}: goal/players/timer/ending present`);
  ok(['flow', 'controls', 'scoring'].every((k) => Array.isArray(R[k]) && R[k].length >= 2 && R[k].every((x) => typeof x === 'string' && x.length > 5)), `${id}: flow/controls/scoring lists present`);
  ok(Array.isArray(R.special), `${id}: special mechanics listed`);
  ok(/mouse|click/i.test(R.controls.join(' ')) && /touch|tap|drag/i.test(R.controls.join(' ')), `${id}: controls mention both mouse and touch`);
  const nums = (R.players.match(/\d+/g) || []).map(Number);
  ok(nums.includes(g.min) && nums.includes(g.max), `${id}: rules player count matches ${g.min}-${g.max}`);
}

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  console.log('SKIP  playwright not installed; browser checks not run');
  process.exit(failures ? 1 : 0);
}
const { io } = require('socket.io-client');
const PORT = 3993, URL = `http://localhost:${PORT}`;
const SHOTS = process.env.SHOTS ? path.join(__dirname, '..', '..', 'docs', 'screenshots', 'issue-33') : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const SHOT_GAMES = ['drawguess', 'chess', 'gofish', 'golf', 'tycoon', 'tictactoe'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tok = () => [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

(async () => {
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(PORT), HIDDEN_GAMES: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const browser = await chromium.launch();
  const socks = [];
  try {
    for (const vp of [{ w: 1440, h: 900, t: 'desktop' }, { w: 390, h: 844, t: 'phone' }]) {
      for (const game of ids) {
        const T = `${game}/${vp.t}`;
        const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h }, hasTouch: vp.t === 'phone' });
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(URL + '/?view=selection');
        await page.evaluate(() => localStorage.setItem('pg_profile', JSON.stringify({ name: 'HostUser', avatar: { e: 1, c: 1 } })));
        await page.reload();
        await page.click(`[data-create="${game}"]`);
        await page.click('#c-go');
        await page.waitForSelector('#screen-room', { state: 'visible' });
        const code = (await page.textContent('#room-code')).trim();
        // Rules are reachable from the lobby, and closing them keeps the lobby intact.
        await page.click(vp.t === 'phone' ? '#rules-btn' : '#rules-link');
        ok(await page.isVisible('.rules-modal .rules-goal'), `${T}: Rules open from the lobby`);
        await page.keyboard.press('Escape');
        ok(await page.isHidden('#modal'), `${T}: Escape closes Rules`);
        for (let i = 0; i < GAMES[game].min - 1; i++) {
          const s = io(URL, { transports: ['websocket'], forceNew: true });
          s.on('state', () => {});
          socks.push(s);
          await new Promise((r) => s.emit('joinRoom', { code, token: tok(), profile: { name: 'F' + i, avatar: { e: 2, c: 3 } } }, r));
        }
        await page.waitForFunction((n) => !document.querySelector('#lobby-start').disabled, GAMES[game].min);
        await page.click('#lobby-start');
        await page.waitForFunction(() => document.body.dataset.phase === 'game', null, { timeout: 5000 });
        await sleep(500);
        const stage = () => page.evaluate(() => { const r = document.querySelector('#stage').getBoundingClientRect(); return { w: r.width, h: r.height, ovf: document.documentElement.scrollWidth - innerWidth }; });
        const before = await stage();
        ok(before.ovf <= 0, `${T}: no horizontal overflow in game`);
        // Rules open mid-game without ending it.
        await page.click('#rules-btn');
        const text = await page.textContent('.rules-modal');
        ok(text.includes(win.GameRules[game].goal), `${T}: Rules dialog shows this game's goal mid-game`);
        const box = await page.locator('#modal-body').boundingBox();
        ok(box.width <= vp.w && box.height <= vp.h, `${T}: Rules dialog fits the viewport`);
        await page.click('.rules-modal [data-close].btn');
        ok(await page.isHidden('#modal') && (await page.evaluate(() => document.body.dataset.phase)) === 'game', `${T}: Close returns to the running game`);
        // Focus mode is obvious, reversible and does not shrink the game.
        ok(await page.isVisible('#focus-btn'), `${T}: Focus button visible during play`);
        await page.click('#focus-btn');
        await sleep(300);
        const focus = await stage();
        ok(await page.evaluate(() => document.body.classList.contains('focus-mode')) && (await page.getAttribute('#focus-btn', 'aria-pressed')) === 'true', `${T}: focus mode on`);
        ok(focus.w >= before.w - 1 && focus.ovf <= 0, `${T}: focus stage is not smaller (${Math.round(before.w)} -> ${Math.round(focus.w)}px) and has no overflow`);
        const chatInput = ['drawguess', 'impostor', 'wordchain'].includes(game);
        ok(await page.isHidden('#side') && (chatInput ? await page.isVisible('#chat-input') : await page.isHidden('#room-chat')), `${T}: focus hides roster${chatInput ? ' but keeps the guess/answer input' : ' and chat'}`);
        if (game === 'impostor') ok(await page.isVisible('#chat-log'), `${T}: chat log stays readable in focus mode (discussion happens in chat)`);
        if (SHOTS && SHOT_GAMES.includes(game)) await page.screenshot({ path: path.join(SHOTS, `${game}-${vp.t}-focus.png`) });
        await page.keyboard.press('Escape');
        ok(!(await page.evaluate(() => document.body.classList.contains('focus-mode'))), `${T}: Escape leaves focus mode`);
        await sleep(200);
        if (SHOTS && SHOT_GAMES.includes(game)) await page.screenshot({ path: path.join(SHOTS, `${game}-${vp.t}.png`) });
        ok(errors.length === 0, `${T}: no page errors ${errors.join('|')}`);
        socks.splice(0).forEach((s) => s.close());
        await page.close();
      }
    }
  } catch (e) {
    console.log('FAIL  ' + e.stack);
    failures++;
  } finally {
    socks.forEach((s) => s.close());
    await browser.close();
    srv.kill();
  }
  console.log(failures ? `${failures} FAILED` : 'All passed');
  process.exit(failures ? 1 : 0);
})();
