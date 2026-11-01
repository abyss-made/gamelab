// Browser-level multiplayer reliability checks (issue #48). Real Chromium pages (Playwright) play
// against the real server, started through the same harness as test/reliability.js, so every step
// can be compared with the authoritative server state. Skipped when Playwright is not installed.
//
// Each page is its own browser context (its own tab token and profile), at 1440x900 (desktop) or
// 390x844 (phone, touch). Covered: joining by /r/CODE link, by #CODE, by a pasted link and by a
// typed code; rosters and host-only controls agreeing with the server; Draw & Guess with a drawer,
// guessers and a spectator, where the word never appears in the page of anyone not entitled to it;
// a reload and an offline/online cycle mid-game rejoining as the same member; switching to Four in a
// Row, playing it by clicks, winner-stays and rematch; timers, animation frames and listeners not
// piling up across repeated game cycles; and a multi-client smoke pass of all 21 visible games.
// On failure: screenshots, page errors and the server log under node-server/test-artifacts/reliabilityui/.
// Run: node test/reliabilityui.js     SHOTS_DIR=<dir> also saves screenshots of the key states.
'use strict';
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.log('SKIP  playwright not installed; reliability browser checks not run');
  process.exit(0);
}
const fs = require('fs');
const path = require('path');
const H = require('./harness');
const { GAMES, HIDDEN } = require('../server/games');

const r = H.reporter('reliabilityui');
const VISIBLE = Object.keys(GAMES).filter((g) => !HIDDEN.has(g));
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };
const SHOTS = process.env.SHOTS_DIR ? path.resolve(process.env.SHOTS_DIR) : null;
const ONLY = process.env.SCENARIO || '';
let srv;
let browser;
let CUR = '';
const pages = [];
const metrics = {};
const ok = (c, m) => r.ok(c, `${CUR}: ${m}`);
const clean = (v, m) => r.clean(v, `${CUR}: ${m}`);

// Counts what a page leaves running: intervals, pending animation frames, window/document listeners.
function instrument() {
  const live = new Set();
  const si = window.setInterval;
  const ci = window.clearInterval;
  window.setInterval = function (...a) {
    const id = si.apply(this, a);
    live.add(id);
    return id;
  };
  window.clearInterval = function (id) {
    live.delete(id);
    return ci.call(this, id);
  };
  const frames = new Set();
  const raf = window.requestAnimationFrame;
  const caf = window.cancelAnimationFrame;
  window.requestAnimationFrame = function (fn) {
    const id = raf.call(this, (t) => {
      frames.delete(id);
      fn(t);
    });
    frames.add(id);
    return id;
  };
  window.cancelAnimationFrame = function (id) {
    frames.delete(id);
    return caf.call(this, id);
  };
  const reg = new Map();
  const add = EventTarget.prototype.addEventListener;
  const rem = EventTarget.prototype.removeEventListener;
  const keyOf = (t, type, o) => (t === window ? 'w:' : t === document ? 'd:' : null) && `${t === window ? 'w' : 'd'}:${type}:${typeof o === 'boolean' ? o : !!(o && o.capture)}`;
  EventTarget.prototype.addEventListener = function (type, fn, o) {
    const k = (this === window || this === document) && !(o && o.once) ? keyOf(this, type, o) : null;
    if (k && fn) (reg.get(k) || reg.set(k, new Set()).get(k)).add(fn);
    return add.call(this, type, fn, o);
  };
  EventTarget.prototype.removeEventListener = function (type, fn, o) {
    const k = this === window || this === document ? keyOf(this, type, o) : null;
    if (k && reg.has(k)) reg.get(k).delete(fn);
    return rem.call(this, type, fn, o);
  };
  window.__pg = () => {
    let listeners = 0;
    for (const s of reg.values()) listeners += s.size;
    const sock = window.App && window.App.socket;
    const cb = sock && sock._callbacks ? Object.values(sock._callbacks).reduce((n, a) => n + a.length, 0) : 0;
    return { intervals: live.size, frames: frames.size, listeners, socketCallbacks: cb };
  };
}

async function open(name, vp, url = '/') {
  const ctx = await browser.newContext({ viewport: vp, isMobile: vp === PHONE, hasTouch: vp === PHONE });
  await ctx.addInitScript((n) => {
    try {
      localStorage.setItem('pg_profile', JSON.stringify({ name: n, avatar: { e: 3, c: 2 } }));
    } catch (e) {
      /* storage blocked */
    }
  }, name);
  await ctx.addInitScript(instrument);
  const page = await ctx.newPage();
  const P = { name, vp, ctx, page, errors: [], consoleErrors: [], offline: false };
  page.on('pageerror', (e) => P.errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|ERR_INTERNET_DISCONNECTED|WebSocket/.test(m.text())) P.consoleErrors.push(m.text());
  });
  page.on('dialog', (d) => d.accept());
  await page.goto(srv.url + url);
  pages.push(P);
  return P;
}
const S = (P) => P.page.evaluate(() => (window.App && window.App.S ? JSON.parse(JSON.stringify(window.App.S)) : null));
async function waitFor(P, fn, arg, label, ms = 8000) {
  try {
    await P.page.waitForFunction(fn, arg, { timeout: ms, polling: 50 });
  } catch (e) {
    throw new Error(`${P.name}: timed out waiting for ${label}`);
  }
}
const waitAll = (ps, fn, arg, label, ms) => Promise.all(ps.map((P) => waitFor(P, fn, arg, label, ms)));
const visible = (P, sel) => P.page.isVisible(sel);
const overflow = (P) => P.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const shot = async (P, name) => {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await P.page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
};
const closeAll = async (ps) => {
  for (const P of ps) {
    await P.ctx.close().catch(() => {});
    pages.splice(pages.indexOf(P), 1);
  }
};

// Compares every page's App.S with the server, as test/reliability.js does for socket clients.
async function consistent(label, ps) {
  let v = [];
  for (let i = 0; i < 8; i++) {
    const snap = await srv.snapshot({ withGame: false });
    v = H.snapshotViolations(snap);
    const states = await Promise.all(ps.map((P) => S(P)));
    const fake = ps.map((P, k) => ({ name: P.name, state: states[k], code: states[k] && states[k].code, s: { connected: !P.offline }, flags: { replaced: 0 } }));
    for (const room of snap.rooms) v.push(...H.viewViolations(room, fake.filter((c) => c.code === room.code)));
    if (!v.length) break;
    await srv.passes(1);
  }
  return clean(v, `${label}: every page agrees with the server`);
}
// How many times a word appears in a page's markup (text, attributes and labels).
const mentions = (P, word) =>
  P.page.evaluate((w) => {
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![a-z0-9])${esc}(?![a-z0-9])`, 'gi');
    return (document.documentElement.innerHTML.match(re) || []).length + (document.title.match(re) || []).length;
  }, word);

async function createParty(P) {
  await P.page.click('#hero-create');
  await P.page.click('#c-go');
  await P.page.waitForSelector('#screen-room', { state: 'visible' });
  await waitFor(P, () => window.App && App.S && App.S.code, null, 'party state');
  return (await S(P)).code;
}
// Choose a game through the picker. When the party is bigger than the game, the host is asked who
// plays: tick `players` (member ids) and Switch, or leave it to Random.
async function pickGame(host, game, players) {
  await host.page.click('#slot-choose, #slot-change');
  await host.page.click(`[data-pickgame="${game}"]`);
  await host.page.click('#picker-go');
  if (await host.page.waitForSelector('#pick-go', { timeout: 1500 }).catch(() => null)) {
    if (players) {
      for (const id of players) await host.page.check(`.pick input[value="${id}"]`);
      await host.page.click('#pick-go');
    } else await host.page.click('#pick-random');
  }
  await waitFor(host, (g) => App.S && App.S.gameId === g, game, `game ${game}`);
}
const memberIds = async (code) => (await srv.room(code)).members.map((m) => m.id);

// ---------------------------------------------------------------------------------------------
const SCENARIOS = [];
const def = (name, fn, limit) => SCENARIOS.push({ name, fn, limit });
let party = null; // shared by the first three scenarios: { code, host, guests }

def('invite-join', async () => {
  const host = await open('Ana', DESKTOP);
  const code = await createParty(host);
  ok(/^[A-Z0-9]{6}$/.test(code), `Create Party opens a party with a code (${code})`);
  // 1. The /r/CODE invite link.
  const ben = await open('Ben', DESKTOP, `/r/${code}`);
  await ben.page.waitForSelector('#join-btn', { state: 'visible' });
  ok((await ben.page.textContent('#join-code')).trim() === code, 'the invite link shows the party code before joining');
  await ben.page.click('#join-btn');
  await ben.page.waitForSelector('#screen-room', { state: 'visible' });
  // 2. #CODE typed into the Rooms code box (phone).
  const cy = await open('Cy', PHONE, '/rooms');
  await cy.page.fill('#code-input', `#${code}`);
  await cy.page.press('#code-input', 'Enter');
  await cy.page.waitForSelector('#screen-room', { state: 'visible' });
  // 3. A whole invite link pasted into the code box (phone), and 4. a lower-case code.
  const dee = await open('Dee', PHONE, '/rooms');
  await dee.page.fill('#code-input', `${srv.url}/r/${code}`);
  await dee.page.press('#code-input', 'Enter');
  await dee.page.waitForSelector('#screen-room', { state: 'visible' });
  const eli = await open('Eli', DESKTOP, '/rooms');
  await eli.page.fill('#code-input', code.toLowerCase());
  await eli.page.press('#code-input', 'Enter');
  await eli.page.waitForSelector('#screen-room', { state: 'visible' });
  const all = [host, ben, cy, dee, eli];
  await waitAll(all, () => App.S && App.S.players.length === 5, null, 'five seated');
  ok(true, 'joining by /r/CODE link, #CODE, a pasted link and a typed lower-case code all reach the same party');
  const cards = await Promise.all(all.map((P) => P.page.$$eval('.party-roster .roster-card', (els) => els.length)));
  ok(cards.every((n) => n === 5), `every page lists the same five people (${cards})`);
  ok(new Set((await memberIds(code))).size === 5, 'the server has five distinct members');
  const startBtn = await Promise.all(all.map((P) => visible(P, '#lobby-start')));
  ok(startBtn[0] && startBtn.slice(1).every((x) => !x), 'only the host sees Start Game');
  const over = await Promise.all([cy, dee].map(overflow));
  ok(over.every((x) => x <= 0), `phones have no horizontal overflow in the lobby (${over})`);
  await consistent('five pages joined', all);
  await shot(host, 'lobby-desktop-host');
  await shot(cy, 'lobby-phone-guest');
  party = { code, host, guests: [ben, cy, dee, eli] };
});

def('drawguess-live', async () => {
  if (!party) throw new Error('needs invite-join');
  const { code, host } = party;
  const [ben, cy, dee, eli] = party.guests;
  await pickGame(host, 'drawguess');
  // Eli steps out to watch (after the switch: switching to a game with room seats every spectator).
  await eli.page.click('[data-seat="watch"]');
  await waitFor(host, () => App.S.spectators.length === 1, null, 'one spectator');
  await host.page.evaluate(() => App.socket.emit('hostUpdate', { settings: { rounds: 1, hints: false, drawTime: 60 } }));
  await waitFor(host, () => App.S.settings && App.S.settings.rounds === 1, null, 'settings');
  const all = [host, ben, cy, dee, eli];
  await host.page.click('#lobby-start');
  await waitAll(all, () => App.S && App.S.phase === 'game' && App.S.game, null, 'game started');
  ok((await Promise.all(all.map((P) => P.page.evaluate(() => document.body.dataset.phase)))).every((p) => p === 'game'), 'every page shows the game');
  let lastTurn = 0;
  let turns = 0;
  const leaks = [];
  for (let guard = 0; guard < 8; guard++) {
    await waitFor(host, (t) => App.S.phase === 'lobby' || (App.S.game && App.S.game.phase === 'choose' && App.S.game.turnId > t), lastTurn, 'next turn', 10000);
    const st = await S(host);
    if (st.phase === 'lobby') break;
    lastTurn = st.game.turnId;
    turns++;
    const states = await Promise.all(all.map(S));
    const drawer = all[states.findIndex((x) => x.you === st.game.drawerId)];
    const others = all.filter((P) => P !== drawer);
    await waitFor(drawer, () => document.querySelector('[data-choose="0"]'), null, 'word choices');
    const before = {};
    // The word is chosen below; record how often each candidate already appears on the other pages.
    const choices = (await S(drawer)).game.choices;
    const word = choices[0];
    for (const P of others) before[P.name] = await mentions(P, word);
    await drawer.page.click('[data-choose="0"]');
    await waitAll(all, (t) => App.S.game && App.S.game.turnId === t && App.S.game.phase === 'draw', lastTurn, 'drawing');
    ok(await drawer.page.evaluate((w) => document.getElementById('room-word').textContent.includes(w), word), `turn ${turns}: the drawer's page shows the word`);
    // Draw a stroke with the mouse (or finger) on the drawer's canvas.
    const box = await drawer.page.locator('.dg-board canvas').first().boundingBox();
    await drawer.page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
    await drawer.page.mouse.down();
    await drawer.page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 6 });
    await drawer.page.mouse.up();
    await srv.passes(1);
    for (const P of others) {
      const n = await mentions(P, word);
      if (n > before[P.name]) leaks.push(`turn ${turns}: ${P.name}'s page shows "${word}" ${n - before[P.name]} more time(s) before guessing`);
    }
    const guessers = others.filter((P) => P !== eli);
    if (turns === 1) {
      // A reload mid-turn: back through the join screen as the same member, canvas replayed, still no word.
      const reloader = guessers[guessers.length - 1];
      const idBefore = (await S(reloader)).you;
      await reloader.page.reload();
      await reloader.page.waitForSelector('#join-btn', { state: 'visible' });
      await reloader.page.click('#join-btn');
      await waitFor(reloader, () => App.S && App.S.game && App.S.game.phase === 'draw', null, 'back in the game');
      ok((await S(reloader)).you === idBefore, 'a reload mid-game rejoins as the same member');
      const painted = await reloader.page.evaluate(() => {
        const c = document.querySelector('.dg-board canvas');
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 16) if (d[i] < 200 || d[i + 1] < 200 || d[i + 2] < 200) n++;
        return n;
      });
      ok(painted > 0, `the reloaded page replays the drawing so far (${painted} painted samples)`);
      ok((await mentions(reloader, word)) <= before[reloader.name], 'the reloaded page still does not show the word');
      ok((await memberIds(code)).length === 5, 'the reload left no duplicate member');
      // Offline and back: the others see "Reconnecting", the page itself shows its connection note.
      const flaky = guessers[0];
      const flakyId = (await S(flaky)).you;
      flaky.offline = true;
      await flaky.ctx.setOffline(true);
      await waitFor(host, (id) => App.S.players.some((p) => p.id === id && !p.connected), flakyId, 'offline shown', 15000);
      await waitFor(host, () => document.querySelector('#player-list .person.offline'), null, 'offline roster entry');
      await waitFor(flaky, () => !document.getElementById('connection-note').hidden, null, 'connection note', 15000);
      ok(true, 'going offline shows Reconnecting to the others and a connection note on the page');
      await shot(host, 'drawguess-desktop-host-sees-offline');
      await flaky.ctx.setOffline(false);
      flaky.offline = false;
      await waitFor(flaky, () => document.getElementById('connection-note').hidden && App.S && App.S.game, null, 'reconnected', 20000);
      await waitFor(host, (id) => App.S.players.some((p) => p.id === id && p.connected), flakyId, 'online again', 10000);
      ok((await S(flaky)).you === flakyId, 'coming back online rejoins automatically as the same member');
      await consistent('after reload and offline', all);
      await shot(eli, 'drawguess-phone-spectator');
    }
    // Everyone guesses through the chat box.
    for (const P of guessers) {
      await srv.advance(1100, 1);
      await P.page.fill('#chat-input', word);
      await P.page.press('#chat-input', 'Enter');
      await waitFor(P, () => App.S.game && (App.S.game.word || App.S.game.phase !== 'draw'), null, 'guess counted');
      if (P === guessers[0]) {
        ok(await P.page.evaluate((w) => document.getElementById('room-word').textContent.includes(w), word), `turn ${turns}: a guesser's page shows the word once they guessed it`);
        const specCount = await mentions(eli, word);
        if (specCount > before[eli.name]) leaks.push(`turn ${turns}: the spectator page shows "${word}" after someone guessed`);
      }
    }
    await waitAll(all, (t) => App.S.game && App.S.game.turnId === t && App.S.game.phase === 'reveal', lastTurn, 'reveal');
    if (turns === 1) await shot(cy, 'drawguess-phone-reveal');
    await srv.advance(6500, 1);
  }
  clean(leaks, `over ${turns} turns no page showed the word to anyone who had not guessed it`);
  ok(turns === 4, `each of the four seated players drew once (${turns} turns)`);
  await waitAll(all, () => App.S.phase === 'lobby' && document.querySelector('.result-card'), null, 'podium');
  ok(true, 'the podium appears on every page');
  const errs = all.flatMap((P) => P.errors.map((e) => `${P.name}: ${e}`));
  clean(errs, 'no page errors during the live game');
  await consistent('after the podium', all);
});

def('fourrow-switch-play', async () => {
  if (!party) throw new Error('needs invite-join');
  const { code, host } = party;
  const all = [host, ...party.guests];
  const cy = party.guests[1];
  const chosen = [(await S(host)).you, (await S(cy)).you]; // a desktop and a phone play
  await pickGame(host, 'fourrow', chosen);
  const room = await srv.room(code);
  ok(room.seats.length === 2 && room.specs.length === 3, 'switching to Four in a Row seats two and moves three to watch');
  ok(chosen.every((id) => room.seats.includes(id)), 'the two players the host ticked in "Pick who plays" are the ones seated');
  const states = await Promise.all(all.map(S));
  const watchers = all.filter((P, i) => states[i].role === 'spectator');
  await Promise.all(watchers.filter((P) => room.queue.includes(states[all.indexOf(P)].you)).map((P) => waitFor(P, () => /spectating/.test(document.getElementById('toast').textContent), null, 'switch notice')));
  ok(true, 'everyone moved to watching is told why');
  for (let game = 1; game <= 2; game++) {
    await host.page.click(game === 1 ? '#lobby-start' : '#result-again');
    await waitAll(all, () => App.S.phase === 'game' && App.S.game, null, `fourrow game ${game}`);
    const g = (await S(host)).game;
    const byId = async (id) => {
      for (const P of all) if ((await S(P)).you === id) return P;
      return null;
    };
    const first = await byId(g.players[0].id);
    const second = await byId(g.players[1].id);
    for (let i = 0; i < 7; i++) {
      const P = i % 2 ? second : first;
      await waitFor(P, (n) => App.S.game && App.S.game.moves === n && !document.querySelector('.fr-col[data-col="0"]').disabled, i, `turn ${i + 1}`);
      await P.page.click(`.fr-col[data-col="${i % 2 ? 1 : 0}"]`);
    }
    await waitAll(all, () => App.S.phase === 'lobby' && document.querySelector('.result-card'), null, `result ${game}`);
    const rs = await S(host);
    ok(rs.lastResult.winnerId === g.players[0].id, `game ${game}: four clicks in a column win for the first player`);
    const cardText = await Promise.all(all.map((P) => P.page.textContent('.result-card')));
    ok(cardText.every((t) => /Winner stays/.test(t)), `game ${game}: every page shows who plays next`);
    if (game === 1) await shot(party.guests[1], 'fourrow-phone-result');
    await consistent(`four in a row game ${game}`, all);
  }
});

def('no-leaks-across-cycles', async () => {
  if (!party) throw new Error('needs invite-join');
  const { host } = party;
  const all = [host, ...party.guests];
  const games = ['chess', 'pool', 'golf', 'tycoon', 'trivia', 'drawguess', 'colorstack', 'ludo'];
  const sample = [];
  for (let cycle = 0; cycle < 2; cycle++) {
    for (const game of games) {
      await host.page.evaluate((gm) => App.socket.emit('switchGame', { game: gm }), game);
      await waitAll(all, (gm) => App.S.gameId === gm && App.S.phase === 'lobby', game, `switched to ${game}`);
      await host.page.evaluate(() => App.socket.emit('startGame'));
      await waitAll(all, () => App.S.phase === 'game' && document.body.dataset.phase === 'game', null, `${game} started`);
      await srv.passes(1);
      await host.page.click('#end-btn');
      await waitAll(all, () => App.S.phase === 'lobby' && document.body.dataset.phase !== 'game', null, `${game} ended`);
    }
    sample.push(await Promise.all(all.map((P) => P.page.evaluate(() => window.__pg()))));
  }
  const [first, second] = sample;
  const grew = [];
  all.forEach((P, i) => {
    for (const k of Object.keys(first[i])) if (second[i][k] > first[i][k]) grew.push(`${P.name} ${k} ${first[i][k]} → ${second[i][k]}`);
  });
  clean(grew, `after 8 more game cycles nothing grew on any page (${JSON.stringify(second[0])})`);
  metrics.page_resources_after_cycles = second.map((x, i) => ({ page: all[i].name, ...x }));
  ok(second.every((x) => x.frames === 0), 'no animation frame loop keeps running in the lobby');
  const heap = await host.page.evaluate(() => (performance.memory ? performance.memory.usedJSHeapSize : 0));
  metrics.host_page_heap_mb = +(heap / 1048576).toFixed(1);
  const errs = all.flatMap((P) => P.errors.map((e) => `${P.name}: ${e}`));
  clean(errs, 'no page errors across 16 game cycles');
});

def('smoke-21-multi-client', async () => {
  if (!party) throw new Error('needs invite-join');
  const { host } = party;
  const all = [host, ...party.guests];
  const phones = all.filter((P) => P.vp === PHONE);
  const problems = [];
  for (const game of VISIBLE) {
    await host.page.evaluate((gm) => App.socket.emit('switchGame', { game: gm }), game);
    await waitAll(all, (gm) => App.S.gameId === gm && App.S.phase === 'lobby', game, `switched to ${game}`);
    await host.page.click('#lobby-start');
    await waitAll(all, (gm) => App.S.phase === 'game' && document.body.dataset.game === gm && document.querySelector('#stage').children.length > 0, game, `${game} on every page`);
    for (const P of phones) {
      const o = await overflow(P);
      if (o > 0) problems.push(`${game}: ${P.name} overflows by ${o}px`);
    }
    const roles = await Promise.all(all.map((P) => P.page.evaluate(() => App.S.role)));
    if (!roles.includes('spectator') && GAMES[game].meta.maxPlayers < all.length) problems.push(`${game}: nobody is watching`);
    await host.page.click('#end-btn');
    await waitAll(all, () => App.S.phase === 'lobby', null, `${game} back to the lobby`);
  }
  clean(problems, `all ${VISIBLE.length} games start and end on two desktops and three phones without overflow`);
  const errs = all.flatMap((P) => [...P.errors, ...P.consoleErrors].map((e) => `${P.name}: ${e}`));
  clean(errs, 'no page errors or console errors across the smoke pass');
  await consistent('after the smoke pass', all);
}, 180000);

// ---------------------------------------------------------------------------------------------
(async () => {
  // A 2 s heartbeat (default 25 s + 20 s) so a page cut off by offline emulation is noticed quickly.
  srv = await H.startServer({ env: { HARNESS_PING_MS: '2000' } });
  browser = await chromium.launch();
  const chromiumVersion = browser.version();
  console.log(`reliabilityui: real server on ${srv.url}, seed ${srv.seed}, Chromium ${chromiumVersion}`);
  try {
    for (const s of SCENARIOS) {
      if (ONLY && !ONLY.split(',').includes(s.name) && s.name !== 'invite-join') continue;
      CUR = s.name;
      console.log(`\n== ${s.name}`);
      const before = r.failed;
      await H.scenario(r, srv, s.name, [], s.fn, s.limit || 90000);
      if (r.failed > before) {
        const dir = path.join(H.ARTIFACTS, 'reliabilityui');
        fs.mkdirSync(dir, { recursive: true });
        for (const P of pages) {
          await P.page.screenshot({ path: path.join(dir, `${s.name}-${P.name}.png`) }).catch(() => {});
          fs.writeFileSync(path.join(dir, `${s.name}-${P.name}.json`), JSON.stringify({ errors: P.errors, console: P.consoleErrors, state: await S(P).catch(() => null) }, null, 1));
        }
        console.log(`      screenshots: ${path.relative(H.ROOT, dir)}`);
      }
    }
  } catch (err) {
    r.ok(false, 'suite crashed: ' + (err && err.stack));
  } finally {
    await browser.close().catch(() => {});
    await srv.stop();
  }
  r.artifact('metrics', { metrics, chromium: chromiumVersion, node: process.version });
  console.log('\nmetrics ' + JSON.stringify(metrics));
  process.exit(H.finish(r));
})();
