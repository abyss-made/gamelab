// Captures the live client for all 21 visible games at 1440x900 and 390x844.
// Usage: node test/capture31.js OUTDIR [game,game...]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');
const PORT = 3977;
const URL = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tok = () => [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
const GAMES = ['drawguess','fourrow','chess','checkers','ludo','pool','colorstack','gofish','wordchain','categories','tictactoe','rps','dotsboxes','wordscramble','trivia','telephone','bluff','impostor','battleship','golf','tycoon'];
const out = process.argv[2] || path.join(__dirname, '..', '..', 'docs', 'screenshots', 'playgrid-3-1');
const only = process.argv[3] ? process.argv[3].split(',') : GAMES;
fs.mkdirSync(out, { recursive: true });
function fake(name) {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const c = { s, state: null, token: tok(), profile: { name, avatar: { e: 2 + name.length % 3, c: 3 } } };
  s.on('state', (st) => (c.state = st));
  c.call = (ev, d) => new Promise((r) => s.emit(ev, d, r));
  return c;
}
(async () => {
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(PORT), ALPHA_ENABLED: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const browser = await chromium.launch();
  try {
    for (const g of only) for (const vp of [{ w: 1440, h: 900, t: 'desktop' }, { w: 390, h: 844, t: 'mobile' }]) {
      const phone = vp.w < 600;
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, hasTouch: phone, isMobile: phone });
      const page = await ctx.newPage();
      const errs = []; page.on('pageerror', (e) => errs.push(e.message));
      await page.goto(URL + '/');
      await page.evaluate(() => localStorage.setItem('pg_profile', JSON.stringify({ name: 'Alex', avatar: { e: 1, c: 1 } })));
      await page.reload();
      await page.click('#hero-create'); await page.click('#c-go');
      await page.waitForSelector('#screen-room', { state: 'visible' });
      await page.waitForFunction(() => window.App && App.S && App.S.code);
      const code = await page.evaluate(() => App.S.code);
      await page.evaluate((x) => App.socket.emit('switchGame', { game: x }), g);
      const fs_ = [];
      for (const n of ['Nova Bright', 'Pip Quill', 'Rex Tango']) { const f = fake(n); await f.call('joinRoom', { code, token: f.token, profile: f.profile }); fs_.push(f); }
      await page.waitForFunction((x) => App.S.gameId === x && App.S.players.length >= 3, g).catch(() => {});
      await page.evaluate(() => App.socket.emit('startGame'));
      await page.waitForFunction(() => App.S.phase === 'game', null, { timeout: 5000 }).catch(() => {});
      if (g === 'drawguess') { await page.click('[data-choose="0"]').catch(() => {}); await page.waitForFunction(() => App.S.game.phase === 'draw', null, { timeout: 4000 }).catch(() => {}); }
      await sleep(1200);
      await page.screenshot({ path: path.join(out, `${g}-${vp.t}.png`) });
      console.log(g, vp.t, 'errors:', errs.length ? errs.join('|') : 'none');
      fs_.forEach((f) => f.s.close());
      await ctx.close();
    }
  } finally { await browser.close(); srv.kill(); }
})();
