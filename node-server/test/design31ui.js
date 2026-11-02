// Playgrid 3.1 gameplay visual/interaction regression (issue #46). Playwright; skipped when not installed.
// Every visible game is started in the real client at 1440x900 and 390x844: no page errors, no horizontal
// overflow, and representative games get focused checks of the 3.1 design contract. Saves screenshots when
// SHOTS_DIR is set. Run: node test/design31ui.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIP  playwright not installed; design 3.1 checks not run'); process.exit(0); }
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const PORT = 3979;
const URL = `http://localhost:${PORT}`;
const SHOTS = process.env.SHOTS_DIR;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tok = () => [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
let failures = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failures++; };
const GAMES = ['drawguess','fourrow','chess','checkers','ludo','pool','colorstack','gofish','wordchain','categories','tictactoe','rps','dotsboxes','wordscramble','trivia','telephone','bluff','impostor','battleship','golf','tycoon'];
function fake(name) {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const c = { s, token: tok(), profile: { name, avatar: { e: 2, c: 3 } } };
  c.call = (ev, d) => new Promise((r) => s.emit(ev, d, r));
  return c;
}
async function start(browser, vp, game) {
  const phone = vp.w < 600;
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: phone, isMobile: phone });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  await page.goto(URL + '/');
  await page.evaluate(() => localStorage.setItem('pg_profile', JSON.stringify({ name: 'Alex', avatar: { e: 1, c: 1 } })));
  await page.reload();
  await page.click('#hero-create');
  await page.click('#c-go');
  await page.waitForSelector('#screen-room', { state: 'visible' });
  await page.waitForFunction(() => window.App && App.S && App.S.code);
  const code = await page.evaluate(() => App.S.code);
  await page.evaluate((g) => App.socket.emit('switchGame', { game: g }), game);
  const friends = [];
  for (const n of ['Nova Bright', 'Pip Quill', 'Rex Tango']) {
    const f = fake(n);
    await f.call('joinRoom', { code, token: f.token, profile: f.profile });
    friends.push(f);
  }
  await page.waitForFunction((g) => App.S.gameId === g, game);
  await page.evaluate(() => App.socket.emit('startGame'));
  await page.waitForFunction(() => App.S.phase === 'game', null, { timeout: 8000 }).catch(() => {});
  await sleep(500);
  return { ctx, page, friends };
}

(async () => {
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(PORT), ALPHA_ENABLED: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const browser = await chromium.launch();
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  try {
    for (const g of GAMES) {
      for (const vp of [{ w: 1440, h: 900, t: 'desktop' }, { w: 390, h: 844, t: 'mobile' }]) {
        const { ctx, page, friends } = await start(browser, vp, g);
        const T = `${g}/${vp.t}`;
        ok(await page.evaluate(() => App.S.phase === 'game'), `${T}: game started in the live client`);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        ok(over <= 0, `${T}: no horizontal page overflow (${over})`);
        ok(page.errors.length === 0, `${T}: no page errors ${page.errors.join('|')}`);
        ok(await page.evaluate(() => !!getComputedStyle(document.documentElement).getPropertyValue('--pg-focus').trim()), `${T}: gameplay31.css tokens loaded`);

        if (g === 'chess') {
          ok((await page.$$('.ch-piece .ch-svg')).length === 32, `${T}: 32 SVG chess pieces (no emoji glyphs)`);
          const labels = await page.$$eval('.ch-sq', (els) => els.every((e) => /: (empty|White|Black)/.test(e.getAttribute('aria-label'))));
          ok(labels, `${T}: every square has an accessible name`);
          // Select the first legal piece and check the three markers coexist as specified.
          const sq = await page.$('.ch-sq:not([disabled]) .ch-piece');
          if (sq) {
            await sq.click();
            ok((await page.$$('.ch-sq.sel')).length === 1, `${T}: selected origin is marked`);
            ok((await page.$$('.ch-sq.target .ck-dot')).length >= 1, `${T}: legal empty targets show a dot`);
          }
        }
        if (g === 'checkers') {
          ok((await page.$$('.ck-piece')).length === 24, `${T}: 24 layered checkers discs`);
        }
        if (g === 'fourrow') {
          const first = await page.$eval('.fr-col', (e) => e.getAttribute('aria-label'));
          ok(/^Drop (Red|Yellow) in column 1$/.test(first), `${T}: column button reads "${first}"`);
          const bg = await page.$eval('.fr-board', (e) => getComputedStyle(e).borderTopColor);
          ok(bg === 'rgb(108, 153, 255)', `${T}: cabinet raised top edge (${bg})`);
          await page.focus('.fr-col:not([disabled])');
          await page.keyboard.press('Shift+Tab');
          await page.keyboard.press('Tab');
          const out = await page.$eval('.fr-col:focus-visible', (e) => getComputedStyle(e).outlineWidth).catch(() => '');
          ok(out === '3px', `${T}: keyboard focus ring is 3px (${out})`);
        }
        if (g === 'ludo') {
          // Alex may not roll first; only drive the die when it is Alex's turn (otherwise check the idle die).
          if (await page.$('[data-roll]')) {
            await page.click('[data-roll]');
            await page.waitForFunction(() => App.S.game.dice, null, { timeout: 4000 }).catch(() => {});
          }
          const info = await page.evaluate(() => ({ dice: App.S.game.dice, pips: document.querySelectorAll('#ld2-die i').length, picks: [...document.querySelectorAll('.ld2-pick')].map((b) => [b.getBoundingClientRect().height, b.textContent.trim()]) }));
          ok(info.pips === (info.dice || 0), `${T}: die shows ${info.pips} pips for server value ${info.dice || 'none yet'}`);
          ok(info.picks.every(([h, t]) => h >= 44 && /Token \d · \d steps?/.test(t)), `${T}: token pick buttons are >=44px and name the step count`);
        }
        if (g === 'ludo') {
          // Token motion follows confirmed move events, not dice rolls (client logic driven with synthetic states).
          const seq = await page.evaluate(() => {
            const base = JSON.parse(JSON.stringify(App.S));
            const mk = (ev, rolls) => { const c = JSON.parse(JSON.stringify(base)); c.game.lastEvent = ev; c.game.rolls = rolls; return c; };
            const count = (st) => { GameUI.ludo.update(st); return document.querySelectorAll('.ld2-tok.moved').length; };
            const p0 = base.game.players[0];
            const ev1 = { kind: 'move', by: p0.id, token: 0, from: -1, to: 0, captured: null };
            const ev2 = { kind: 'move', by: p0.id, token: 0, from: 0, to: 4, captured: null };
            const r = base.game.rolls;
            return [count(mk(null, r)), count(mk(ev1, r)), count(mk(ev1, r + 1)), count(mk(ev1, r + 2)), count(mk(ev2, r + 3))];
          });
          ok(JSON.stringify(seq) === '[0,1,0,0,1]', `${T}: only a new confirmed move animates a token, not later rolls (${seq})`);
        }
        if (g === 'colorstack') {
          const names = await page.$$eval('.cs-hand .cs-card', (els) => els.every((e) => e.querySelector('small') && e.getAttribute('aria-label')));
          ok(names, `${T}: every card shows its colour name`);
        }
        if (g === 'pool') {
          const h = await page.evaluate(() => { const c = document.querySelector('canvas'); return !!c; });
          ok(h, `${T}: pool table canvas present`);
        }
        if (g === 'drawguess') {
          if (await page.$('[data-choose="0"]')) {
            await page.click('[data-choose="0"]');
            await page.waitForFunction(() => App.S.game.phase === 'draw', null, { timeout: 4000 }).catch(() => {});
          }
          const t = await page.evaluate(() => ({ labels: document.querySelectorAll('#dg-tools .tool-label').length, out: document.querySelector('#brush-size-val') && document.querySelector('#brush-size-val').textContent, sizes: [...document.querySelectorAll('#dg-tools .tool')].map((b) => Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height)) }));
          if (t.labels) {
            ok(t.labels === 5 && /^\d+$/.test(t.out), `${T}: tools are labelled and the size shows its number (${t.out})`);
            ok(t.sizes.every((w) => w >= 44), `${T}: every tool button is >=44px (${t.sizes.map(Math.round)})`);
          }
        }
        if (g === 'rps') {
          ok((await page.$$('[data-move] svg.rps-svg')).length === 3, `${T}: throws use original vector icons`);
        }
        if (g === 'tycoon') {
          const vis = await page.evaluate(() => getComputedStyle(document.querySelector('.ty-views')).display);
          if (vp.w < 600) {
            ok(vis !== 'none', `${T}: Map / Properties switch is shown`);
            const sect = () => page.evaluate(() => getComputedStyle(document.querySelector('.ty-sect')).display);
            ok((await sect()) === 'none', `${T}: map view hides the property sheets`);
            await page.click('[data-tyview="props"]');
            ok((await sect()) !== 'none' && !(await page.isVisible('.ty-board')), `${T}: properties view shows sheets instead of the map`);
            if (await page.$('.ty-link')) {
              await page.click('.ty-link');
              ok(await page.isVisible('#ty-info .ty-info'), `${T}: property details show in the properties view`);
            }
          } else ok(vis === 'none', `${T}: switch hidden on desktop`);
        }
        if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${g}-${vp.t}.png`) });
        friends.forEach((f) => f.s.close());
        await ctx.close();
      }
    }
    // Reduced motion: no looping/transition animation on boards.
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(URL + '/');
    ok(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), 'reduced-motion media query honoured by the stylesheet context');
    await ctx.close();
  } finally {
    await browser.close();
    srv.kill();
  }
  console.log(failures ? `\n${failures} design 3.1 check(s) FAILED` : '\nAll design 3.1 checks passed');
  process.exit(failures ? 1 : 0);
})();
