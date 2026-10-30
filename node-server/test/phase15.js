// Phase 1.5 browser tests (Playwright; skipped when it is not installed):
// the lobby survives in-site navigation, chat stays usable in expanded Draw & Guess,
// the shell fills the viewport and dialogs/controls fit at narrow widths.
// Run: node test/phase15.js
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.log('SKIP  playwright not installed; phase 1.5 browser checks not run');
  process.exit(0);
}
const { spawn } = require('child_process');
const path = require('path');
const { io } = require('socket.io-client');

const PORT = 3996;
const URL = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const tok = () => [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
function fake(name) {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const c = { s, state: null, token: tok(), chats: [], profile: { name, avatar: { e: 2, c: 3 } } };
  s.on('state', (st) => { c.state = st; });
  s.on('chat', (m) => c.chats.push(m));
  c.emit = (ev, d) => new Promise((r) => s.emit(ev, d, r));
  return c;
}
async function until(fn, ms = 5000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await sleep(50);
  }
  return false;
}
async function hostRoom(page, game) {
  await page.goto(URL + '/?view=selection');
  await page.evaluate(() => localStorage.setItem('pg_profile', JSON.stringify({ name: 'HostUser', avatar: { e: 1, c: 1 } })));
  await page.reload();
  await page.click(`[data-create="${game}"]`);
  await page.click('#c-go');
  await page.waitForSelector('#screen-room', { state: 'visible' });
  return (await page.textContent('#room-code')).trim();
}
const screenOf = (page) => page.evaluate(() => document.body.dataset.screen);
const vis = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && !e.hidden && e.getClientRects().length > 0; }, sel);

(async () => {
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((r) => srv.stdout.once('data', r));
  const browser = await chromium.launch();
  const fakes = [];
  try {
    // ---------- 1. persistent lobby across in-site navigation ----------
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      page.on('dialog', (d) => d.accept());
      const code = await hostRoom(page, 'drawguess');
      const f = fake('Pal');
      fakes.push(f);
      await f.emit('joinRoom', { code, token: f.token, profile: f.profile });
      await until(() => f.state && f.state.players.length === 2);
      await page.fill('#chat-input', 'hello before leaving');
      await page.press('#chat-input', 'Enter');
      await until(() => f.chats.some((m) => m.text === 'hello before leaving'));
      const hostId = f.state.hostId;
      ok(!(await vis(page, '#return-bar')), 'no return indicator while viewing the room');

      const roundTrip = async (label, action, phaseLabel) => {
        if ((await screenOf(page)) !== 'room') await page.click('#return-bar');
        await page.waitForSelector('#screen-room', { state: 'visible' });
        await action();
        await sleep(300);
        ok((await screenOf(page)) !== 'room', `${label}: leaves the room view`);
        ok(await vis(page, '#return-bar'), `${label}: return indicator is shown`);
        ok(new RegExp(phaseLabel).test(await page.textContent('#return-label')) && (await page.textContent('#return-code')).trim() === code, `${label}: indicator says "${phaseLabel}" and names the room code`);
        ok(f.state.players.length === 2 && f.state.hostId === hostId && f.state.players.every((p) => p.connected !== false), `${label}: still seated in the server room (host and roster intact)`);
      };
      await roundTrip('Games tab (lobby)', () => page.click('.main-nav [data-view="selection"]'), 'Return to Lobby');
      await roundTrip('Rooms tab (lobby)', () => page.click('.main-nav [data-view="rooms"]'), 'Return to Lobby');
      // background room updates must not pull the user back into the room view
      const joiner = fake('Joiner');
      fakes.push(joiner);
      await joiner.emit('joinRoom', { code, token: joiner.token, profile: joiner.profile });
      await until(() => f.state.players.length + f.state.spectators.length === 3);
      await sleep(300);
      ok((await screenOf(page)) !== 'room' && (await vis(page, '#return-bar')), 'a room state update while browsing does not switch the view back to the room');
      joiner.s.emit('leaveRoom');
      await until(() => f.state.players.length + f.state.spectators.length === 2);
      await roundTrip('Play tab (lobby)', () => page.click('.main-nav [data-tab="home"]'), 'Return to Lobby');
      await page.click('#return-bar');
      await page.waitForFunction(() => { const b = document.getElementById('lobby-start'); return b && !b.hidden && !b.disabled; }); // a click on a disabled button is silently ignored
      await page.evaluate(() => document.getElementById('lobby-start').click());
      await page.waitForFunction(() => document.body.dataset.phase === 'game');
      await roundTrip('Back to Games (game)', () => page.click('#leave-btn'), 'Return to Game');
      await roundTrip('Logo (game)', () => page.click('.logo'), 'Return to Game');
      // browser back/forward
      await page.goBack();
      await page.goForward();
      await sleep(300);
      ok(f.state.players.length === 2 && f.state.hostId === hostId, 'browser Back/Forward keep room membership');
      await page.click('#return-bar');
      await page.waitForSelector('#screen-room', { state: 'visible' });
      ok(location_ok(await page.url(), code), 'Return button goes back to /r/CODE');
      ok(await page.evaluate(() => document.body.dataset.phase) === 'game', 'gameplay state preserved after returning');
      ok((await page.textContent('#chat-log')).includes('hello before leaving'), 'chat history preserved after returning');
      ok((await page.textContent('#room-code')).trim() === code, 'same room code after returning');

      // chat still works after the round trip
      await page.fill('#chat-input', 'back again');
      await page.press('#chat-input', 'Enter');
      ok(await until(() => f.chats.some((m) => m.text === 'back again')), 'chat works after returning');

      // navigating to a different room is a deliberate transition
      const other = fake('Other');
      fakes.push(other);
      const r2 = await other.emit('createRoom', { game: 'fourrow', token: other.token, profile: other.profile });
      await page.click('.logo');
      await page.evaluate((c) => { history.pushState({}, '', '/r/' + c); window.dispatchEvent(new PopStateEvent('popstate')); }, r2.code);
      await page.waitForSelector('#screen-join', { state: 'visible' });
      ok(/will leave it/.test(await page.textContent('#join-switch-note')), 'deep link to another room warns before leaving the current one');
      ok(f.state.players.length === 2 && other.state.players.length === 1, 'merely opening another invite does not join it or leave the first room');

      // joining another room by code while in a game asks first, then leaves the old room
      const msgs = [];
      const onDlg = (d) => { msgs.push(d.message()); return d.dismiss(); };
      page.removeAllListeners('dialog');
      page.on('dialog', onDlg);
      await page.click('.main-nav [data-view="selection"]');
      await page.waitForSelector('#code-input');
      await page.fill('#code-input', r2.code);
      await page.press('#code-input', 'Enter');
      await sleep(400);
      ok(msgs.length === 1 && /in progress/.test(msgs[0]), 'joining another room by code asks for confirmation while a game is running');
      ok(f.state.players.length === 2 && other.state.players.length === 1, 'declining the confirmation keeps the first room and does not join the second');
      page.removeListener('dialog', onDlg);
      page.on('dialog', (d) => d.accept());
      // a failed join (mistyped code) after confirming must not cost the current seat
      await page.fill('#code-input', 'ZZZZZZ');
      await page.press('#code-input', 'Enter');
      await sleep(500);
      ok(f.state.players.length === 2 && f.state.hostId === hostId, 'a failed join keeps the current seat, host and roster');
      ok(await vis(page, '#return-bar'), 'return indicator remains after a failed join');
      // explicit leave: host passes on, indicator disappears
      await page.click('#return-bar').catch(() => {});
      await page.evaluate((c) => { history.pushState({}, '', '/r/' + c); window.dispatchEvent(new PopStateEvent('popstate')); }, code);
      await page.waitForSelector('#screen-room', { state: 'visible' });
      await page.click('#leave-lobby-btn');
      await until(() => f.state.players.length === 1);
      ok(f.state.players.length === 1 && f.state.hostId === f.state.you, 'Leave Lobby leaves the server room and passes host on');
      ok(!(await vis(page, '#return-bar')), 'no return indicator after leaving');
      await page.close();
    }

    // ---------- 1b. deep link and reload still join normally ----------
    {
      const host = fake('Host2');
      fakes.push(host);
      const r = await host.emit('createRoom', { game: 'drawguess', token: host.token, profile: host.profile });
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(URL + '/r/' + r.code);
      await page.click('#join-btn');
      await page.waitForSelector('#screen-room', { state: 'visible' });
      ok(await until(() => host.state.players.length + host.state.spectators.length === 2), 'deep link /r/CODE joins the room');
      await page.reload();
      await page.click('#join-btn');
      await page.waitForSelector('#screen-room', { state: 'visible' });
      await sleep(300);
      ok(host.state.players.length + host.state.spectators.length === 2, 'reload rejoins without duplicate membership');
      await page.close();
    }

    // ---------- 2. expanded Draw & Guess keeps chat usable ----------
    for (const vp of [
      { w: 390, h: 844 },
      { w: 844, h: 390 },
      { w: 1280, h: 800 },
      { w: 1440, h: 900 },
      { w: 1280, h: 720 },
    ]) {
      const mobile = vp.w < 900;
      const ctxt = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: mobile, isMobile: mobile });
      const page = await ctxt.newPage();
      const tag = `${vp.w}x${vp.h}`;
      const code = await hostRoom(page, 'drawguess');
      const f = fake('Pal');
      fakes.push(f);
      await f.emit('joinRoom', { code, token: f.token, profile: f.profile });
      await until(() => f.state && f.state.players.length === 2);
      await page.waitForFunction(() => { const b = document.getElementById('lobby-start'); return b && !b.hidden && !b.disabled; });
      await page.evaluate(() => document.getElementById('lobby-start').click());
      await page.waitForFunction(() => document.body.dataset.phase === 'game');
      await page.waitForSelector('#dg-expand');
      const box = async () => { const b = await page.locator('.dg-canvas').boundingBox(); return { w: Math.round(b.width), h: Math.round(b.height), x: b.x, y: b.y }; };
      const before = await box();
      f.s.emit('chat', 'before expanding');
      await until(async () => (await page.textContent('#chat-log')).includes('before expanding'));
      await page.click('#dg-expand');
      await sleep(250);
      const after = await box();
      ok(after.w * after.h > before.w * before.h * (mobile && vp.w > vp.h ? 0.8 : 1.15), `${tag}: expanded canvas ${before.w}x${before.h} -> ${after.w}x${after.h}`);
      ok(Math.abs(after.w / after.h - 4 / 3) < 0.02, `${tag}: expanded canvas keeps 4:3`);
      ok(after.x >= -1 && after.y >= -1 && after.x + after.w <= vp.w + 1 && after.y + after.h <= vp.h + 1, `${tag}: expanded canvas fully on screen`);
      ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `${tag}: no horizontal overflow while expanded`);
      ok(await vis(page, '#dg-chat-toggle'), `${tag}: Chat toggle is available in focus mode`);
      // chat panel opens without covering the canvas, keeps history, and can send
      if (!(await vis(page, '#room-chat'))) await page.click('#dg-chat-toggle');
      await sleep(200);
      ok(await vis(page, '#room-chat'), `${tag}: chat panel can be opened while expanded`);
      ok((await page.textContent('#chat-log')).includes('before expanding'), `${tag}: chat history is kept in focus mode`);
      const cb = await page.locator('#room-chat').boundingBox();
      const wb = await page.locator('.dg-canvas').boundingBox();
      const overlap = cb.x < wb.x + wb.width - 1 && cb.x + cb.width > wb.x + 1 && cb.y < wb.y + wb.height - 1 && cb.y + cb.height > wb.y + 1;
      ok(!overlap, `${tag}: chat panel does not cover the canvas`);
      ok(cb.x >= -1 && cb.y >= -1 && cb.x + cb.width <= (await page.evaluate(() => innerWidth)) + 1 && cb.y + cb.height <= (await page.evaluate(() => innerHeight)) + 1, `${tag}: chat panel fully on screen`);
      await page.fill('#chat-input', 'guess from focus mode');
      ok(await page.evaluate(() => { const i = document.getElementById('chat-input').getBoundingClientRect(); return i.bottom <= innerHeight && i.top >= 0; }), `${tag}: chat input is on screen`);
      await page.press('#chat-input', 'Enter');
      ok(await until(() => f.chats.some((m) => m.text === 'guess from focus mode')), `${tag}: message sent from the expanded view reaches the room`);
      // unread badge while closed
      await page.click('#dg-chat-toggle');
      await sleep(100);
      ok(!(await vis(page, '#room-chat')), `${tag}: chat panel collapses`);
      f.s.emit('chat', 'ping one');
      ok(await until(() => vis(page, '#dg-unread')), `${tag}: unread badge appears for new messages`);
      await page.click('#dg-chat-toggle');
      await sleep(100);
      ok(!(await vis(page, '#dg-unread')) && (await page.textContent('#chat-log')).includes('ping one'), `${tag}: opening chat clears the badge and shows the message`);
      // Escape closes focus mode and returns chat to the page with history intact
      await page.keyboard.press('Escape');
      await sleep(150);
      ok(!(await page.evaluate(() => document.body.classList.contains('dg-big'))), `${tag}: Escape exits focus mode`);
      ok(await page.evaluate(() => document.getElementById('room-chat').parentElement.classList.contains('room')), `${tag}: chat returns to the room layout`);
      ok((await page.textContent('#chat-log')).includes('guess from focus mode'), `${tag}: chat history survives closing focus mode`);
      const back = await box();
      ok(Math.abs(back.w - before.w) <= 2, `${tag}: canvas returns to its normal size`);
      await ctxt.close();
    }

    // ---------- 3. viewport fill, 4. controls fit ----------
    for (const [w, h] of [[1440, 900], [1280, 800], [1280, 720]]) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.goto(URL + '/');
      await page.waitForSelector('.hero');
      await sleep(250);
      const m = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, shell: document.querySelector('.site-shell').getBoundingClientRect().width, heroH: document.querySelector('.hero').getBoundingClientRect().height }));
      ok(m.sh <= h, `${w}x${h}: landing page has no vertical scrollbar (${m.sh} <= ${h})`);
      ok(m.shell >= w - 1, `${w}x${h}: app shell spans the full width (${Math.round(m.shell)})`);
      ok(m.heroH >= h * 0.6, `${w}x${h}: hero fills the height (${Math.round(m.heroH)}px)`);
      await page.close();
    }
    for (const w of [320, 375, 390, 430, 600, 768, 1280, 1440]) {
      const h = w < 700 ? 760 : 800;
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.goto(URL + '/');
      await page.waitForSelector('.hero');
      const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
      ok(await noOverflow(), `${w}px: landing has no horizontal overflow`);
      await page.goto(URL + '/?view=selection');
      await page.waitForSelector('[data-create="drawguess"]');
      ok(await noOverflow(), `${w}px: games screen has no horizontal overflow`);
      await page.click('[data-create="drawguess"]');
      await sleep(200);
      const m = await page.evaluate(() => {
        const modal = document.querySelector('#modal-body').getBoundingClientRect();
        const go = document.querySelector('#c-go').getBoundingClientRect();
        const clipped = [...document.querySelectorAll('#modal-body button, #modal-body select, #modal-body label, #modal-body .check span, #modal-body .field > span')]
          .filter((e) => e.getClientRects().length && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).display !== 'inline')
          .map((e) => e.textContent.trim().slice(0, 20) || e.tagName);
        const seg = [...document.querySelectorAll('#modal-body .segmented button')].map((b) => b.getBoundingClientRect());
        const overlap = seg.some((a, i) => seg.some((b, j) => i < j && a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5));
        return { top: modal.top, bottom: modal.bottom, goBottom: go.bottom, goTop: go.top, goVisible: go.left >= 0 && go.right <= innerWidth, clipped, overlap, h: innerHeight, scroll: document.documentElement.scrollWidth <= innerWidth };
      });
      ok(m.bottom <= m.h + 1 && m.top >= -1, `${w}px: create dialog fits inside the viewport`);
      ok(m.goBottom <= m.h && m.goTop >= 0 && m.goVisible, `${w}px: Create lobby button is reachable without scrolling the dialog`);
      ok(m.clipped.length === 0, `${w}px: no clipped control text${m.clipped.length ? ' (' + m.clipped.join(', ') + ')' : ''}`);
      ok(!m.overlap, `${w}px: difficulty buttons do not overlap`);
      ok(m.scroll, `${w}px: dialog adds no horizontal overflow`);
      await page.close();
    }
    // dialog stays usable in a short landscape viewport and with 200% zoom (320 css px wide)
    {
      const page = await browser.newPage({ viewport: { width: 640, height: 300 } });
      await page.goto(URL + '/?view=selection');
      await page.click('[data-create="drawguess"]');
      await sleep(200);
      const m = await page.evaluate(() => ({ go: document.querySelector('#c-go').getBoundingClientRect().bottom, h: innerHeight, scrolls: document.querySelector('#modal-body').scrollHeight > document.querySelector('#modal-body').clientHeight }));
      ok(m.go <= m.h && m.scrolls, 'short landscape: action buttons stay on screen and the dialog scrolls inside');
      await page.close();
    }
  } catch (err) {
    console.error(err);
    failures++;
  }
  fakes.forEach((x) => x.s.close());
  await browser.close();
  srv.kill();
  console.log(failures ? `\n${failures} FAILED` : '\nAll passed');
  process.exit(failures ? 1 : 0);
})();

function location_ok(url, code) {
  return new RegExp('/r/' + code + '/?$').test(url);
}
