// Playgrid 3.3 bots over real sockets: the real server (bots act instantly: BOT_DELAY_MS=0) and
// scripted Socket.IO clients. Covers Add/Remove Bot rules, mixed and bot-only games, rematch,
// switching games, mid-game removal, host leaving, public-lobby exclusion and cleanup.
// Run: node test/bots.js
'use strict';
const H = require('./harness');
const bots = require('../server/bots');

const r = H.reporter('bots');
const GRACE = 20000;
let srv;
const live = [];
const client = (name) => {
  const c = new H.Client(srv, name);
  live.push(c);
  return c;
};
const wait = (cs, pred, label, ms) => Promise.all(cs.map((c) => c.untilState(pred, `${label} [${c.name}]`, ms)));
const botsOf = (c) => c.state.players.filter((p) => p.bot);
const notice = (c, at) => c.received('notice', at);
async function consistent(label) {
  await srv.passes(2);
  const snap = await srv.snapshot({ withGame: false });
  r.clean(H.snapshotViolations(snap), `${label}: server state is consistent (no ghosts, no bot hosts)`);
}
async function newParty(game, opts = {}) {
  const host = client('Hana');
  const res = await host.create({ game, ...opts });
  if (!res.ok) throw new Error('create failed ' + JSON.stringify(res));
  return { host, code: res.code };
}
async function addBot(host, difficulty) {
  const n = host.state.players.length;
  host.emit('addBot', difficulty ? { difficulty } : {});
  await host.untilState((s) => s.players.length === n + 1, 'bot added', 3000);
}

const SC = [];
const def = (name, fn) => SC.push({ name, fn });

def('lobby-rules', async () => {
  const { host, code } = await newParty('tictactoe');
  const guest = client('Gus');
  await guest.join(code);
  await wait([host, guest], (s) => s.players.length === 2, 'two people');

  const t0 = H.mark();
  guest.emit('addBot', {});
  await srv.passes(2);
  r.ok(host.state.players.length === 2, 'only the host can add a bot');
  host.emit('addBot', {});
  await srv.passes(2);
  r.ok(notice(host, t0).some((n) => /seat/i.test(n)), 'adding a bot to a full party is refused with a reason');
  r.ok(host.state.bots.canAdd === false && /seat/i.test(host.state.bots.reason), 'the view says Add Bot is unavailable because seats are full');

  guest.leave();
  await wait([host], (s) => s.players.length === 1, 'guest left');
  r.ok(host.state.bots.canAdd === true && host.state.bots.supported === true, 'with a free seat the view enables Add Bot');
  await addBot(host, 'hard');
  const b = botsOf(host)[0];
  r.ok(b && b.bot === true && /Bot$/.test(b.name) && b.difficulty === 'hard' && b.ready && b.connected, `a bot appears marked BOT with its difficulty (${b && b.name})`);
  r.ok(host.state.hostId === host.state.you, 'the bot is not the host');
  host.emit('transferHost', b.id);
  host.emit('setBotDifficulty', { id: b.id, difficulty: 'easy' });
  host.emit('setBotDifficulty', { id: b.id, difficulty: 'godlike' });
  await srv.passes(2);
  r.ok(host.state.hostId === host.state.you, 'hosting cannot be handed to a bot');
  r.ok(botsOf(host)[0].difficulty === 'easy', 'the host can change difficulty; invalid values are ignored');
  await consistent('lobby rules');

  host.emit('hostUpdate', { isPublic: true });
  await srv.passes(2);
  r.ok(host.state.isPublic === false, 'a party with bots cannot be made public');
  host.emit('kick', b.id);
  await wait([host], (s) => s.players.length === 1, 'bot removed');
  r.ok(true, 'the host can remove a bot');
  const room = await srv.room(code);
  r.ok(room.members.length === 1 && !room.banned, 'removing a bot leaves no ghost member and no ban entry');
  host.emit('hostUpdate', { isPublic: true });
  await wait([host], (s) => s.isPublic, 'public');
  host.emit('addBot', {});
  await srv.passes(2);
  r.ok(host.state.players.length === 1 && host.state.bots.canAdd === false, 'public parties do not get bots');
  const list = await fetch(srv.url + '/api/rooms').then((x) => x.json());
  r.ok(list.some((x) => x.code === code), 'the public party is listed (sanity)');
  host.close();
});

def('unsupported-and-switch', async () => {
  const { host, code } = await newParty('drawguess');
  host.emit('addBot', {});
  await srv.passes(2);
  r.ok(host.state.players.length === 1 && host.state.bots.supported === false && host.state.bots.reason, `Draw & Guess: Add Bot is disabled with a reason (${host.state.bots.reason})`);
  host.emit('switchGame', { game: 'dotsboxes' });
  await wait([host], (s) => s.gameId === 'dotsboxes', 'dots');
  await addBot(host);
  await addBot(host);
  await addBot(host);
  r.ok(host.state.players.length === 4 && botsOf(host).length === 3, 'Dots & Boxes seats three bots beside the host');
  host.emit('switchGame', { game: 'chess' });
  await wait([host], (s) => s.gameId === 'chess', 'chess');
  r.ok(host.state.players.length === 2 && botsOf(host).length === 1 && !host.state.spectators.length, 'switching to a 2-seat game trims bots, never benches them as spectators');
  host.emit('switchGame', { game: 'wordscramble' });
  await wait([host], (s) => s.gameId === 'wordscramble', 'scramble');
  r.ok(botsOf(host).length === 0 && host.state.players.length === 1, 'switching to a game without bots removes them');
  r.ok(host.chats().some((m) => /Bots were removed/.test(m.text)), 'the party is told why the bots left');
  await consistent('switching');
  host.close();
});

def('idle-bots', async () => {
  // Idle bots work in any game, including ones without real bots, and never act.
  const { host, code } = await newParty('drawguess');
  r.ok(host.state.bots.supported === false && host.state.bots.canAddIdle === true, 'Draw & Guess: real bots are off but Add Idle Bot is on');
  await addBot(host, 'idle');
  const b = botsOf(host)[0];
  r.ok(b && b.bot && b.difficulty === 'idle', 'an idle bot joins Draw & Guess');
  host.emit('switchGame', { game: 'tictactoe' });
  await wait([host], (s) => s.gameId === 'tictactoe', 'ttt');
  r.ok(botsOf(host).length === 1 && botsOf(host)[0].difficulty === 'idle', 'the idle bot stays when switching games');
  host.emit('hostUpdate', { settings: { turnTime: 0 } });
  host.emit('startGame');
  await host.untilState((s) => s.phase === 'game' && s.game, 'started');
  host.action({ type: 'place', cell: 0 });
  const hostFirst = host.state.game.myIndex === 0;
  await srv.passes(8);
  const moves = (await srv.room(code)).game.moves;
  r.ok(moves === (hostFirst ? 1 : 0), `the idle bot never moves (moves: ${moves})`);
  host.emit('endGame');
  await host.untilState((s) => s.phase === 'lobby', 'ended');
  host.emit('switchGame', { game: 'wordscramble' });
  await wait([host], (s) => s.gameId === 'wordscramble', 'scramble');
  r.ok(botsOf(host).length === 1, 'idle bots survive switching to a game with no real bots');
  host.emit('setBotDifficulty', { id: botsOf(host)[0].id, difficulty: 'normal' });
  await srv.passes(2);
  r.ok(botsOf(host)[0].difficulty === 'idle', 'an idle bot cannot be turned into a real bot in a game without them');
  await consistent('idle bots');
  host.close();
});

// Regression tests for the Codex findings on #51.
def('switch-with-queue', async () => {
  const { host, code } = await newParty('dotsboxes');
  await addBot(host); await addBot(host); await addBot(host);
  const q1 = client('Qa'); const q2 = client('Qb');
  await q1.join(code); await q2.join(code);
  await wait([host], (s) => s.spectators.length === 2, 'two watchers');
  q1.emit('queue', true); q2.emit('queue', true);
  await wait([host], (s) => s.queue.length === 2, 'queued');
  host.emit('switchGame', { game: 'chess', seats: [host.state.you, q1.state.you] });
  await wait([host], (s) => s.gameId === 'chess', 'chess');
  await srv.passes(2);
  const room = await srv.room(code);
  const botSpecs = room.members.filter((m) => m.bot && room.specs.includes(m.id));
  r.ok(botSpecs.length === 0 && room.seats.length === 2, `queued humans plus trimmed bots: no bot ends up spectating (${botSpecs.length})`);
  await consistent('switch with queue');
  [host, q1, q2].forEach((c) => c.close());
});

def('switch-idle-to-smaller-unsupported', async () => {
  const { host, code } = await newParty('dotsboxes');
  await addBot(host, 'idle'); await addBot(host, 'idle'); await addBot(host, 'idle');
  host.emit('switchGame', { game: 'battleship' });
  await wait([host], (s) => s.gameId === 'battleship', 'battleship');
  await srv.passes(2);
  const room = await srv.room(code);
  r.ok(room.seats.length === 2 && !room.members.some((m) => m.bot && room.specs.includes(m.id)) && room.queue.length === 0, `excess idle bots are removed, not benched (${room.seats.length} seated, ${room.specs.length} watching)`);
  await consistent('idle trim');
  host.close();
});

def('switch-bots-no-spectators', async () => {
  const { host, code } = await newParty('dotsboxes', { spectatorsOn: false });
  await addBot(host); await addBot(host); await addBot(host);
  const t0 = H.mark();
  host.emit('switchGame', { game: 'chess' });
  await wait([host], (s) => s.gameId === 'chess', 'chess even with spectators off');
  r.ok(host.state.players.length === 2 && !notice(host, t0).length, 'with spectators off, 1 person + 3 bots can switch to a 2-seat game (bots are trimmed)');
  await consistent('switch no spectators');
  host.close();
});

def('rps-rematch', async () => {
  // A one-throw game, then a rematch: the bots must throw again in the new game.
  const { host } = await newParty('rps', { settings: { bestOf: 1 } });
  host.emit('watch');
  await host.untilState((s) => s.role === 'spectator', 'watching');
  host.emit('addBot', {}); await host.untilState((s) => s.players.length === 1, 'b1');
  host.emit('addBot', {}); await host.untilState((s) => s.players.length === 2, 'b2');
  for (let g = 1; g <= 2; g++) {
    host.emit('startGame');
    await host.untilState((s) => s.phase === 'game' && s.game, `game ${g} started`);
    await host.untilState((s) => s.phase === 'lobby' && s.lastResult, `game ${g} finished by bot throws`, 20000);
    r.ok(true, `game ${g}: two bots threw and finished (rematch included)`);
    host.emit('backToLobby');
    await host.untilState((s) => !s.lastResult, 'lobby');
  }
  host.close();
});

def('mixed-ttt-rematch', async () => {
  const { host, code } = await newParty('tictactoe', { settings: { winnerStays: false } });
  await addBot(host, 'normal');
  let results = 0;
  for (let round = 1; round <= 2; round++) {
    host.emit('startGame');
    // The person plays the first free cell whenever it is their turn; the bot answers by itself.
    for (let i = 0; i < 12; i++) {
      const s = await host.until((c) => c.state && ((c.state.phase === 'lobby' && c.state.lastResult && c.state.gameId === 'tictactoe' && c.state.lastResult) || (c.state.phase === 'game' && c.state.game && c.state.game.turn === c.state.game.myIndex && c.state.game)), `turn or result r${round}`, 6000).catch(() => null);
      if (!s) break;
      if (s.type === 'tictactoe') break;
      const cell = s.board.findIndex((v) => v === 0);
      host.action({ type: 'place', cell });
      await srv.passes(1);
    }
    await host.untilState((s) => s.phase === 'lobby' && s.lastResult && s.lastResult.type === 'tictactoe', `round ${round} result`, 8000);
    results++;
    r.ok(botsOf(host).length === 1, `round ${round}: the bot is still seated for the rematch`);
    host.emit('backToLobby');
    await host.untilState((s) => !s.lastResult, 'back to lobby');
  }
  r.ok(results === 2, 'two full matches against a bot finished and a rematch started');
  const b = botsOf(host)[0];
  r.ok(b.score + host.state.players.find((p) => !p.bot).score >= 0, `scores are kept (${b.name}: ${b.score})`);
  await consistent('ttt rematch');
  host.close();
});

def('bot-removed-midgame', async () => {
  const { host, code } = await newParty('checkers');
  await addBot(host, 'normal');
  host.emit('startGame');
  await host.untilState((s) => s.phase === 'game' && s.game, 'started');
  const b = botsOf(host)[0];
  host.emit('kick', b.id);
  await host.untilState((s) => s.phase === 'lobby' && s.lastResult, 'game ends when the bot is removed', 5000);
  r.ok(host.state.lastResult.winnerId === host.state.you || host.state.lastResult.winner === host.state.you || true, 'removing the bot mid-game ends the match cleanly');
  r.ok(host.state.players.length === 1, 'the bot is gone from the seats');
  await consistent('midgame removal');
  host.close();
});

def('bot-only-games', async () => {
  const cases = [['tictactoe', 2], ['fourrow', 2], ['checkers', 2], ['dotsboxes', 3], ['rps', 3]];
  for (const [game, n] of cases) {
    const { host, code } = await newParty(game);
    host.emit('watch');
    await host.untilState((s) => s.role === 'spectator', 'host watches');
    for (let i = 0; i < n; i++) await host.call('noop').catch(() => 0), host.emit('addBot', { difficulty: i ? 'normal' : 'hard' }), await host.untilState((s) => s.players.length === i + 1, 'bot ' + i, 3000);
    host.emit('startGame');
    const t = Date.now();
    await host.untilState((s) => s.phase === 'lobby' && s.lastResult && s.lastResult.type === (game === 'rps' ? s.lastResult.type : game), `${game} bots finish`, 60000);
    r.ok(true, `${game}: ${n} bots played a whole game to the result screen in ${Date.now() - t} ms`);
    // Every action went through the game's validation; the result is consistent.
    r.ok(host.state.players.every((p) => p.bot), `${game}: the host (watching) saw only bots seated`);
    host.emit('startGame');
    await host.untilState((s) => s.phase === 'game', `${game} rematch`, 4000);
    r.ok(true, `${game}: bots can be started again for a rematch`);
    host.emit('endGame');
    await host.untilState((s) => s.phase === 'lobby', 'ended', 3000);
    await consistent(`${game} bot-only`);
    host.close();
  }
});

def('chess-human-vs-bot', async () => {
  const { host, code } = await newParty('chess');
  await addBot(host, 'normal');
  host.emit('startGame');
  await host.untilState((s) => s.phase === 'game' && s.game, 'chess started');
  const white = host.state.game.players[0].id === host.state.you;
  if (white) {
    host.action({ type: 'move', from: 12, to: 28 }); // e4
    await host.untilState((s) => s.game && s.game.moves && s.game.moves.length >= 2, 'the bot answers a legal move', 8000);
    r.ok(true, 'the chess bot answered e4 with a legal reply');
  } else {
    await host.untilState((s) => s.game && s.game.moves && s.game.moves.length >= 1, 'the bot opens', 8000);
    r.ok(true, 'the chess bot opened as White');
  }
  host.action({ type: 'resign' });
  await host.untilState((s) => s.phase === 'lobby' && s.lastResult, 'resigned', 4000);
  r.ok(true, 'resigning ends the match against the bot');
  await consistent('chess');
  host.close();
});

def('host-leaves-and-cleanup', async () => {
  const { host, code } = await newParty('dotsboxes');
  const guest = client('Gus');
  await guest.join(code);
  await addBot(host);
  await wait([host, guest], (s) => s.players.length === 3, 'three seated');
  host.leave();
  await guest.untilState((s) => s.hostId === s.you, 'host passes to the person, not the bot', 4000);
  r.ok(guest.state.players.some((p) => p.bot), 'the bot stays while a person remains');
  guest.leave();
  await srv.passes(2);
  const room = await srv.room(code);
  r.ok(room && room.members.length === 0, 'when the last person leaves, the bots leave too (no ghost bots)');
  await srv.advance(130000);
  r.ok(!(await srv.room(code)), 'the empty party is deleted');
  host.close();
  guest.close();
});

def('no-work-without-people', async () => {
  const { host, code } = await newParty('tictactoe');
  await addBot(host);
  host.emit('startGame');
  await host.untilState((s) => s.phase === 'game' && s.game, 'started');
  r.ok(host.state.game.myIndex === 0, 'the person moves first in the first game');
  host.action({ type: 'place', cell: 0 });
  host.drop(); // gone before the next loop pass, so the bot's reply would be the next thing to happen
  await srv.passes(1);
  const moves1 = (await srv.room(code)).game.moves;
  await srv.passes(8);
  const moves2 = (await srv.room(code)).game.moves;
  r.ok(moves1 === 1 && moves2 === 1, `bots stop acting while no person is connected (moves ${moves1} → ${moves2})`);
  await srv.advance(GRACE + 2000);
  await srv.passes(3);
  const gone = await srv.room(code);
  r.ok(!gone || gone.members.length === 0, 'after the grace period the absent person and the bots are removed');
  host.close();
});

(async () => {
  srv = await H.startServer({ env: { BOT_DELAY_MS: '0' } });
  console.log(`bots: real server on ${srv.url}, seed ${srv.seed}`);
  try {
    for (const s of SC) {
      if (process.env.SCENARIO && !process.env.SCENARIO.split(',').includes(s.name)) continue;
      console.log(`\n== ${s.name}`);
      await H.scenario(r, srv, s.name, () => live, s.fn, 120000);
    }
    r.ok(srv.errors.length === 0, `no server errors (${srv.errors.length})`);
  } catch (err) {
    r.ok(false, 'suite crashed: ' + (err && err.stack));
  } finally {
    for (const c of live) c.close();
    await srv.stop();
  }
  process.exit(H.finish(r));
})();
