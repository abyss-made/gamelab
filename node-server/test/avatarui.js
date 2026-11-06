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
      await page.waitForSelector('.av-gallery .av-tile');
      ok(true, `${t}: Avatar Studio opens`);
      ok((await page.locator('.av-gallery .av-tile').count()) === 35, `${t}: 35 characters offered`);
      await page.waitForFunction(() => document.querySelectorAll('.av-gallery .av-tile svg').length === 35, null, { timeout: 8000 }).then(() => ok(true, `${t}: all 35 gallery tiles render SVG previews`), () => ok(false, `${t}: all 35 gallery tiles render SVG previews`));
      ok((await page.locator('.av-gallery .av-tile.on').count()) === 1, `${t}: exactly one tile is selected`);
      await page.fill('[data-studio-search]', 'zzzz');
      ok((await page.locator('.av-gallery .av-tile:visible').count()) === 0, `${t}: search with no match hides all tiles`);
      await page.fill('[data-studio-search]', '');
      ok((await page.locator('.av-gallery .av-tile:visible').count()) === 35, `${t}: clearing search restores all 35`);
      if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/gallery-${vp.w}.png` });
      await page.click('[data-studio-pick="a05"]');
      await page.waitForSelector('.av-studio-preview svg');
      ok(await page.isEnabled('[data-studio="save"]'), `${t}: changing the draft enables Save`);
      ok((await page.evaluate(() => JSON.parse(localStorage.getItem('pg_profile')).avatar.v3)) === undefined, `${t}: draft does not touch the saved profile`);
      await page.click('[data-studio="undo"]');
      ok(await page.isDisabled('[data-studio="undo"]'), `${t}: Undo restores the previous draft`);
      await page.click('[data-studio-pick="a01"]');
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
      // Live sync: in the room, the host opens Your player from Party Settings, saves a studio look,
      // and the other member sees it without rejoining.
      if (vp.w === 1440) {
        await hostPage.click('#settings-btn');
        await hostPage.click('#modal [data-view="profile"]');
        await hostPage.click('#modal [data-studio="open"]');
        await hostPage.waitForSelector('#modal .av-gallery .av-tile');
        await hostPage.click('#modal [data-studio-pick="a03"]');
        await hostPage.click('#modal [data-studio="save"]');
        const hostId = await hostPage.evaluate(() => App.S.you);
        await page.waitForFunction((id) => { const p = App.S.players.find((x) => x.id === id); return p && p.avatar.v3 && p.avatar.v3.id === 'a03'; }, hostId, { timeout: 5000 })
          .then(() => ok(true, `${t}: a saved look reaches the rest of the party live`), () => ok(false, `${t}: a saved look reaches the rest of the party live`));
        // Mid-game: a saved look also reaches the active game's own player views (Chess snapshots avatars at start).
        await hostPage.evaluate(() => App.socket.emit('switchGame', { game: 'chess' }));
        await hostPage.waitForFunction(() => App.S.gameId === 'chess');
        await hostPage.evaluate(() => App.socket.emit('startGame'));
        await page.waitForFunction(() => App.S.phase === 'game' && App.S.game && App.S.game.players, null, { timeout: 8000 });
        const look = { v: 3, id: 'a07', palette: 'cyan', expression: 'joy', eyes: 'bright', hat: 'none', glasses: 'none', accessory: 'none', detail: 'clean' };
        const res = await hostPage.evaluate((l) => new Promise((r) => App.socket.emit('setAvatar', l, r)), look);
        ok(res && res.ok, `${t}: mid-game avatar save is accepted`);
        await page.waitForFunction((id) => { const p = App.S.game.players.find((x) => x.id === id); return p && p.avatar && p.avatar.v3 && p.avatar.v3.id === 'a07'; }, hostId, { timeout: 5000 })
          .then(() => ok(true, `${t}: a mid-game save updates the in-game player view`), () => ok(false, `${t}: a mid-game save updates the in-game player view`));
        await hostPage.evaluate(() => App.socket.emit('endGame'));
        // server rejects a forged / malformed config and keeps the accepted one
        const bad = await page.evaluate(() => new Promise((r) => App.socket.emit('setAvatar', { v: 3, id: 'a01', palette: 'url(x)', expression: 'smile', eyes: 'default', hat: 'none', glasses: 'none', accessory: 'none', detail: 'clean' }, r)));
        ok(bad && bad.error === 'invalid' && bad.avatar && bad.avatar.v3 && bad.avatar.v3.v === 3, `${t}: the server rejects a malformed avatar and keeps the accepted one`);
        // rate limit: burst of 3, then slow
        const burst = await page.evaluate(async () => { const out = []; for (let i = 0; i < 5; i++) out.push(await new Promise((r) => App.socket.emit('setAvatar', null, r))); return out.map((x) => x.error || 'ok'); });
        ok(burst.includes('slow'), `${t}: avatar updates are rate limited (${burst.join(',')})`);
        ok(await page.evaluate(() => { const me = App.S.players.find((x) => x.id === App.S.you); return Number.isInteger(me.avatar.e) && Number.isInteger(me.avatar.c); }), `${t}: the classic e/c fallback is always kept`);
        // A save that hits the rate limit is retried automatically and still reaches the party.
        const pageId = await page.evaluate(() => App.S.you);
        await page.evaluate(() => {
          const p = JSON.parse(localStorage.getItem('pg_profile'));
          p.avatar.v3 = { v: 3, id: 'a09', palette: 'rose', expression: 'smile', eyes: 'default', hat: 'none', glasses: 'none', accessory: 'none', detail: 'clean' };
          localStorage.setItem('pg_profile', JSON.stringify(p));
        });
        await page.click('#settings-btn');
        await page.click('#modal [data-view="profile"]');
        if (await page.$('#modal [data-studio="open"]')) await page.click('#modal [data-studio="open"]');
        await page.waitForSelector('#modal .av-gallery .av-tile');
        await page.click('#modal [data-studio-pick="a11"]');
        await page.click('#modal [data-studio="save"]'); // bucket is empty from the burst above -> 'slow' -> retry
        await hostPage.waitForFunction((id) => { const p = App.S.players.find((x) => x.id === id); return p && p.avatar.v3 && p.avatar.v3.id === 'a11'; }, pageId, { timeout: 9000 })
          .then(() => ok(true, `${t}: a rate-limited save is retried and reaches the party`), () => ok(false, `${t}: a rate-limited save is retried and reaches the party`));
      }
      if (vp.w === 390) {
        // Use classic with storage failing keeps the saved Studio look (rollback) and explains why.
        await page.click('#settings-btn');
        await page.click('#modal [data-view="profile"]');
        if (await page.$('#modal [data-studio="close"]')) await page.click('#modal [data-studio="close"]');
        await page.waitForSelector('#modal [data-studio="classic"]', { timeout: 5000 });
        const keep = await page.evaluate(() => {
          const set = Storage.prototype.setItem;
          Storage.prototype.setItem = () => { throw new Error('quota'); };
          const btn = document.querySelector('#modal [data-studio="classic"]');
          if (btn) btn.click();
          Storage.prototype.setItem = set;
          const stillV3 = !!JSON.parse(localStorage.getItem('pg_profile')).avatar.v3;
          const msg = [...document.querySelectorAll('.av-studio [role="status"]')].some((n) => /Could not save/.test(n.textContent));
          return { clicked: !!btn, stillV3, msg };
        });
        ok(keep.clicked && keep.stillV3 && keep.msg, `${t}: Use classic rolls back and explains when storage fails`);
      }
      ok(errors.length === 0, `${t}: no page errors${errors.length ? ' - ' + errors[0] : ''}`);
      await hostPage.context().close();
      await page.context().close();
    }
  } finally { await browser.close(); srv.kill(); }
  process.exit(failures ? 1 : 0);
})();
