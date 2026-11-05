// Avatar Studio 2.0 client regression. Playwright; skipped when not installed. Run: node test/avatarui.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.log('SKIP  playwright not installed; avatar studio UI checks not run'); process.exit(0); }
const path = require('path');
const { spawn } = require('child_process');
const PORT = 3981;
const URL = `http://localhost:${PORT}`;
let failures = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failures++; };

(async () => {
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(PORT), ALPHA_ENABLED: '', HIDDEN_GAMES: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const browser = await chromium.launch();
  try {
    for (const vp of [{ w: 1440, h: 900 }, { w: 390, h: 844 }, { w: 360, h: 740 }]) {
      const t = `${vp.w}px`;
      const page = await (await browser.newContext({ viewport: { width: vp.w, height: vp.h } })).newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      // A host creates a party; the tested player opens the invite link and edits their avatar on the join screen.
      const hostPage = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
      await hostPage.goto(URL + '/');
      await hostPage.click('#hero-create');
      await hostPage.click('#c-go');
      await hostPage.waitForFunction(() => window.App && App.S && App.S.code);
      const code = await hostPage.evaluate(() => App.S.code);
      await page.goto(URL + '/');
      await page.evaluate(() => localStorage.setItem('pg_profile', JSON.stringify({ name: 'Alex', avatar: { e: 5, c: 2 } })));
      await page.goto(URL + '/r/' + code);
      await page.reload();
      const open = page.locator('[data-studio="open"]:visible').first();
      await open.waitFor({ timeout: 5000 });
      await open.click();
      await page.waitForSelector('[data-studio-field="id"]');
      ok(true, `${t}: Avatar Studio opens`);
      ok((await page.locator('[data-studio-field="id"] option').count()) === 35, `${t}: 35 characters offered`);
      await page.selectOption('[data-studio-field="id"]', 'a05');
      await page.waitForSelector('.av-studio-preview svg');
      ok(await page.isEnabled('[data-studio="save"]'), `${t}: changing the draft enables Save`);
      ok((await page.evaluate(() => JSON.parse(localStorage.getItem('pg_profile')).avatar.v3)) === undefined, `${t}: draft does not touch the saved profile`);
      await page.click('[data-studio="undo"]');
      ok(await page.isDisabled('[data-studio="undo"]'), `${t}: Undo restores the previous draft`);
      await page.selectOption('[data-studio-field="id"]', 'a01');
      await page.selectOption('[data-studio-field="hat"]', 'beanie');
      ok((await page.evaluate(() => document.querySelector('[data-studio-field="accessory"] option[value="headphones"]').disabled)), `${t}: headphones disabled while a hat is worn`);
      await page.click('[data-studio="random"]');
      await page.click('[data-studio="reset"]');
      await page.click('[data-studio="save"]');
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pg_profile')).avatar);
      ok(saved.v3 && saved.v3.v === 3 && saved.e === 5 && saved.c === 2, `${t}: Save stores v3 and keeps the classic e/c fallback`);
      ok((await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('pg_profile')).avatar.v3).length)) <= 256, `${t}: saved config is within 256 bytes`);
      ok((await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, `${t}: no horizontal overflow`);
      // The server echoes the avatar back in the room and it renders as an inline SVG.
      await page.click('#join-btn');
      await page.waitForSelector('#screen-room', { state: 'visible' });
      await page.waitForFunction(() => window.App && App.S && App.S.code);
      ok(await page.evaluate(() => App.S.players.some((p) => p.id === App.S.you && p.avatar.v3 && p.avatar.v3.v === 3)), `${t}: server keeps the validated v3 config`);
      await page.waitForSelector('#screen-room .avatar.avatar-v3 svg', { timeout: 5000 }).then(() => ok(true, `${t}: room avatar renders the studio SVG`), () => ok(false, `${t}: room avatar renders the studio SVG`));
      ok(errors.length === 0, `${t}: no page errors${errors.length ? ' - ' + errors[0] : ''}`);
      await hostPage.context().close();
      await page.context().close();
    }
  } finally { await browser.close(); srv.kill(); }
  process.exit(failures ? 1 : 0);
})();
