// Issue #43 regression (Playwright; skipped when not installed). Board games rebuild their boards
// with innerHTML on every selection and state update, which used to drop keyboard focus to <body>,
// and any state update cleared "Tap again to resign". A real page plays each game with the keyboard
// only (focus + Enter) against a scripted Socket.IO opponent, at 1440x900 and 390x844:
//   - Four in a Row, Tic Tac Toe, Checkers, Chess, Battleship, Go Fish: after a selection repaint the
//     same square/chip keeps focus; while it isn't your turn focus waits on the stage (never <body>),
//     and returns to the same control when the opponent's move enables it again;
//   - Checkers, Chess, Battleship: arming Resign, then an opponent move, then Enter still resigns.
// Run: node test/keyboardui.js
'use strict';
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  console.log('SKIP  playwright not installed; keyboard focus checks not run');
  process.exit(0);
}
const H = require('./harness');

const r = H.reporter('keyboardui');
let srv;
let browser;
const ok = (c, m) => r.ok(c, m);

// What has focus: the stage (parked), <body> (lost), or a control described by its data keys.
const focused = (page) =>
  page.evaluate(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return { where: 'body' };
    if (a.id === 'stage') return { where: 'stage' };
    return { where: 'control', id: a.id, tag: a.tagName, text: a.textContent.trim(), disabled: !!a.disabled, ...a.dataset };
  });
const state = (page) => page.evaluate(() => JSON.parse(JSON.stringify(App.S)));
const waitPage = (page, fn, arg, label, ms = 6000) =>
  page.waitForFunction(fn, arg, { timeout: ms, polling: 50 }).catch(() => {
    throw new Error(`timed out waiting for ${label}`);
  });
// Keyboard only: focus a control as Tab would, then press Enter.
async function press(page, sel) {
  await page.focus(sel);
  await page.keyboard.press('Enter');
}
// Whose turn it is, from the bot's latest state (each bot move waits for its fresh state).
const botTurn = (bot) => {
  const g = bot.state && bot.state.game;
  return !!g && (g.turnId !== undefined ? g.turnId === bot.state.you : g.myIndex === g.turn);
};
// Waits until the page itself shows that it is this player's turn.
const mine = (page) =>
  waitPage(page, () => {
    const g = App.S && App.S.game;
    return !!g && (g.turnId !== undefined ? g.turnId === App.S.you : g.myIndex === g.turn);
  }, null, 'my turn on the page');
const myTurn = (page) => page.evaluate(() => {
  const g = App.S && App.S.game;
  if (!g) return false;
  if (g.turnId !== undefined) return g.turnId === App.S.you;
  return g.myIndex === g.turn;
});

async function setup(vp, T) {
  const bot = new H.Client(srv, 'Robo');
  const res = await bot.create({ game: 'fourrow' });
  const ctx = await browser.newContext({ viewport: vp, isMobile: T === 'phone', hasTouch: T === 'phone' });
  await ctx.addInitScript(() => localStorage.setItem('pg_profile', JSON.stringify({ name: 'Keys', avatar: { e: 4, c: 4 } })));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(`${srv.url}/r/${res.code}`);
  await page.click('#join-btn');
  await waitPage(page, () => window.App && App.S && App.S.players.length === 2, null, 'joined');
  return { bot, page, ctx, errors, code: res.code };
}
async function begin(t, game, settings) {
  t.bot.emit('switchGame', { game });
  await t.bot.untilState((s) => s.gameId === game, `switch to ${game}`);
  if (settings) {
    t.bot.emit('hostUpdate', { settings });
    await t.bot.untilState((s) => Object.entries(settings).every(([k, v]) => s.settings[k] === v), 'settings');
  }
  t.bot.emit('startGame');
  await t.bot.untilState((s) => s.phase === 'game' && s.game, `${game} started`);
  await waitPage(t.page, (g) => App.S && App.S.phase === 'game' && document.body.dataset.game === g && App.S.game, game, `${game} on the page`);
}
async function end(t) {
  if (t.bot.state.phase === 'game') t.bot.emit('endGame');
  await t.bot.untilState((s) => s.phase === 'lobby', 'lobby');
  await waitPage(t.page, () => App.S && App.S.phase === 'lobby', null, 'page lobby');
}
// The bot moves when it is its turn: `move(g)` returns the action.
async function botMoves(t, move, label) {
  await t.bot.untilState((s) => s.game && (s.game.turnId !== undefined ? s.game.turnId === s.you : s.game.myIndex === s.game.turn), `bot's turn (${label})`);
  const before = t.bot.counts.state;
  t.bot.action(move(t.bot.g));
  await t.bot.until((c) => c.counts.state > before, `bot move applied (${label})`);
}

async function fourRow(t, T) {
  await begin(t, 'fourrow', { turnTime: 0 });
  if (botTurn(t.bot)) await botMoves(t, () => ({ type: 'drop', col: 0 }), 'opening');
  await waitPage(t.page, () => !document.querySelector('.fr-col[data-col="3"]').disabled, null, 'column enabled');
  await press(t.page, '.fr-col[data-col="3"]');
  await waitPage(t.page, () => App.S.game.moves >= 1 && document.querySelector('.fr-col[data-col="3"]').disabled, null, 'after my drop');
  const parked = await focused(t.page);
  ok(parked.where === 'stage', `${T}: 4 in a Row: after my drop, focus waits on the board area instead of <body> (${parked.where})`);
  await botMoves(t, () => ({ type: 'drop', col: 0 }), 'reply');
  await waitPage(t.page, () => !document.querySelector('.fr-col[data-col="3"]').disabled, null, 'my turn again');
  const back = await focused(t.page);
  ok(back.where === 'control' && back.col === '3', `${T}: 4 in a Row: focus returns to the same column when it is my turn (${JSON.stringify(back)})`);
  const moves = (await state(t.page)).game.moves;
  await t.page.keyboard.press('Enter');
  await waitPage(t.page, (n) => App.S.game && App.S.game.moves === n + 1, moves, 'second keyboard drop');
  ok(true, `${T}: 4 in a Row: Enter on the restored focus drops again, with no mouse`);
  await end(t);
}

async function ticTacToe(t, T) {
  await begin(t, 'tictactoe', { turnTime: 0 });
  if (botTurn(t.bot)) await botMoves(t, () => ({ type: 'place', cell: 0 }), 'opening');
  await mine(t.page);
  await press(t.page, '[data-cell="4"]');
  await waitPage(t.page, () => App.S.game.board[4], null, 'my mark');
  ok((await focused(t.page)).where !== 'body', `${T}: Tic Tac Toe: placing a mark does not drop focus to <body>`);
  await botMoves(t, (g) => ({ type: 'place', cell: g.board.findIndex((v) => !v) }), 'reply');
  await waitPage(t.page, () => App.S.game.board.filter(Boolean).length >= 2 || App.S.phase === 'lobby', null, 'reply shown');
  ok((await focused(t.page)).where !== 'body', `${T}: Tic Tac Toe: an opponent's move does not drop focus to <body>`);
  await end(t);
}

async function checkers(t, T) {
  await begin(t, 'checkers', { turnTime: 0 });
  const botMove = (g) => {
    const from = Number(Object.keys(g.legal)[0]);
    return { type: 'move', from, to: g.legal[from][0] };
  };
  if (botTurn(t.bot)) await botMoves(t, botMove, 'opening');
  await mine(t.page);
  const g = (await state(t.page)).game;
  const from = Number(Object.keys(g.legal)[0]);
  const to = g.legal[from][0];
  await press(t.page, `[data-sq="${from}"]`);
  await waitPage(t.page, (f) => document.querySelector(`[data-sq="${f}"]`).classList.contains('sel'), from, 'selected');
  const sel = await focused(t.page);
  ok(sel.where === 'control' && sel.sq === String(from), `${T}: Checkers: selecting a piece keeps focus on it (${JSON.stringify(sel)})`);
  await press(t.page, `[data-sq="${to}"]`);
  await waitPage(t.page, () => !(App.S.game.myIndex === App.S.game.turn), null, 'moved');
  ok((await focused(t.page)).where === 'stage', `${T}: Checkers: after my move focus waits on the board area`);
  // Arm Resign on the opponent's turn, let them move, then confirm.
  await press(t.page, '#ck-resign');
  await waitPage(t.page, () => /Tap again/.test(document.getElementById('ck-resign').textContent), null, 'armed');
  await botMoves(t, botMove, 'reply while armed');
  await waitPage(t.page, () => App.S.game.myIndex === App.S.game.turn, null, 'state updated');
  const armed = await focused(t.page);
  ok(armed.where === 'control' && armed.id === 'ck-resign' && /Tap again/.test(armed.text), `${T}: Checkers: an opponent's move keeps Resign armed and focused (${JSON.stringify(armed)})`);
  await t.page.keyboard.press('Enter');
  await t.bot.untilState((s) => s.phase === 'lobby' && s.lastResult && s.lastResult.type === 'checkers', 'resigned');
  ok(t.bot.state.lastResult.reason === 'resign' && t.bot.state.lastResult.winnerId === t.bot.id, `${T}: Checkers: the second Enter resigns`);
}

async function chess(t, T) {
  await begin(t, 'chess', { clock: 0 });
  const botMove = (g) => {
    const from = Number(Object.keys(g.legal).find((k) => g.legal[k].length));
    return { type: 'move', from, to: g.legal[from][0] };
  };
  if (botTurn(t.bot)) await botMoves(t, botMove, 'opening');
  await mine(t.page);
  const g = (await state(t.page)).game;
  const from = Number(Object.keys(g.legal).find((k) => g.legal[k].length));
  const to = g.legal[from][0];
  await press(t.page, `[data-sq="${from}"]`);
  await waitPage(t.page, (f) => document.querySelector(`[data-sq="${f}"]`).classList.contains('sel'), from, 'selected');
  const sel = await focused(t.page);
  ok(sel.where === 'control' && sel.sq === String(from), `${T}: Chess: selecting a piece keeps focus on it (${JSON.stringify(sel)})`);
  await press(t.page, `[data-sq="${to}"]`);
  await waitPage(t.page, () => App.S.game.myIndex !== App.S.game.turn, null, 'moved');
  ok((await focused(t.page)).where !== 'body', `${T}: Chess: after my move focus does not drop to <body>`);
  await press(t.page, '[data-act="resign"]');
  await waitPage(t.page, () => /Tap again/.test(document.querySelector('[data-act="resign"]').textContent), null, 'armed');
  await botMoves(t, botMove, 'reply while armed');
  await waitPage(t.page, () => App.S.game.myIndex === App.S.game.turn, null, 'state updated');
  const armed = await focused(t.page);
  ok(armed.where === 'control' && armed.act === 'resign' && /Tap again/.test(armed.text), `${T}: Chess: an opponent's move keeps Resign armed and focused (${JSON.stringify(armed)})`);
  await t.page.keyboard.press('Enter');
  await t.bot.untilState((s) => s.phase === 'lobby' && s.lastResult && s.lastResult.type === 'chess', 'resigned');
  ok(t.bot.state.lastResult.reason === 'resign', `${T}: Chess: the second Enter resigns`);
}

async function battleship(t, T) {
  await begin(t, 'battleship', { turnTime: 0 });
  t.bot.action({ type: 'random' });
  await press(t.page, '#bs-random');
  await waitPage(t.page, () => App.S.game.phase === 'battle', null, 'battle');
  const fire = (g) => {
    const foe = g.players[1 - g.myIndex];
    return { type: 'fire', cell: foe.shots.findIndex((v) => !v) };
  };
  if (botTurn(t.bot)) await botMoves(t, fire, 'opening');
  await mine(t.page);
  await waitPage(t.page, () => document.querySelector('.bs-two button[data-cell]:not(:disabled)'), null, 'enemy waters enabled');
  const cell = await t.page.evaluate(() => {
    const b = [...document.querySelectorAll('.bs-two button[data-cell]')].find((x) => !x.disabled);
    return b ? b.dataset.cell : null;
  });
  await press(t.page, `[data-cell="${cell}"]:not(:disabled)`);
  await waitPage(t.page, () => !document.getElementById('bs-fire').disabled, null, 'aimed');
  const aimed = await focused(t.page);
  ok(aimed.where === 'control' && aimed.cell === cell, `${T}: Battleship: aiming keeps focus on the target square (${JSON.stringify(aimed)})`);
  await press(t.page, '#bs-fire');
  await waitPage(t.page, () => App.S.game.myIndex !== App.S.game.turn || App.S.phase === 'lobby', null, 'fired');
  ok((await focused(t.page)).where !== 'body', `${T}: Battleship: firing does not drop focus to <body>`);
  await press(t.page, '#bs-resign');
  await waitPage(t.page, () => /Tap again/.test(document.getElementById('bs-resign').textContent), null, 'armed');
  await botMoves(t, fire, 'reply while armed');
  await waitPage(t.page, () => App.S.game.myIndex === App.S.game.turn, null, 'state updated');
  const armed = await focused(t.page);
  ok(armed.where === 'control' && armed.id === 'bs-resign' && /Tap again/.test(armed.text), `${T}: Battleship: an opponent's shot keeps Resign armed and focused (${JSON.stringify(armed)})`);
  await t.page.keyboard.press('Enter');
  await t.bot.untilState((s) => s.phase === 'lobby' && s.lastResult && s.lastResult.type === 'battleship', 'resigned');
  ok(t.bot.state.lastResult.winnerId === t.bot.id, `${T}: Battleship: the second Enter resigns`);
}

async function goFish(t, T) {
  await begin(t, 'gofish', { turnTime: 0 });
  // The bot keeps asking while its asks succeed; then it is the page's turn.
  for (let i = 0; i < 20 && botTurn(t.bot); i++) {
    await botMoves(t, (g) => ({ type: 'ask', target: g.players.find((p) => p.id !== t.bot.id).id, rank: g.hand[0].r }), 'bot asks');
  }
  await mine(t.page);
  await waitPage(t.page, () => App.S.game.turnId === App.S.you && document.querySelector('[data-rank]'), null, 'my turn with chips');
  const rank = await t.page.evaluate(() => document.querySelector('[data-rank]').dataset.rank);
  await press(t.page, `[data-rank="${rank}"]`);
  await waitPage(t.page, (rk) => document.querySelector(`[data-rank="${rk}"]`).getAttribute('aria-pressed') === 'true', rank, 'rank picked');
  const chip = await focused(t.page);
  ok(chip.where === 'control' && chip.rank === rank, `${T}: Go Fish: picking a rank keeps focus on the chip (${JSON.stringify(chip)})`);
  const target = await t.page.evaluate(() => document.querySelector('[data-target]').dataset.target);
  await press(t.page, `[data-target="${target}"]`);
  await waitPage(t.page, (tg) => document.querySelector(`[data-target="${tg}"]`).getAttribute('aria-pressed') === 'true', target, 'target picked');
  const who = await focused(t.page);
  ok(who.where === 'control' && who.target === target, `${T}: Go Fish: picking who to ask keeps focus on that chip`);
  await end(t);
}

(async () => {
  srv = await H.startServer();
  browser = await chromium.launch();
  try {
    for (const [vp, T] of [[{ width: 1440, height: 900 }, 'desktop'], [{ width: 390, height: 844 }, 'phone']]) {
      const t = await setup(vp, T);
      for (const [name, fn] of [['fourrow', fourRow], ['tictactoe', ticTacToe], ['checkers', checkers], ['chess', chess], ['battleship', battleship], ['gofish', goFish]]) {
        try {
          await fn(t, T);
        } catch (err) {
          ok(false, `${T}: ${name}: ${err.message}`);
          await t.page.screenshot({ path: require('path').join(H.ARTIFACTS, `keyboardui-${T}-${name}.png`) }).catch(() => {});
          await end(t).catch(() => {});
        }
      }
      ok(!t.errors.length, `${T}: no page errors (${t.errors.slice(0, 2).join(' | ')})`);
      t.bot.close();
      await t.ctx.close();
    }
  } catch (err) {
    ok(false, 'suite crashed: ' + (err && err.stack));
  } finally {
    await browser.close().catch(() => {});
    await srv.stop();
  }
  process.exit(H.finish(r));
})();
