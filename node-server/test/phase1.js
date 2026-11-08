// Phase 1 tests: replay after a finished game and persistent rooms across game switches.
// Run: node test/phase1.js
const { spawn } = require('child_process');
const path = require('path');
const { io } = require('socket.io-client');

const PORT = 3998;
const URL = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const tok = () => [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

function client(name) {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const c = { s, name, token: tok(), state: null, chats: [], notices: [] };
  s.on('state', (st) => { c.state = st; });
  s.on('chat', (m) => c.chats.push(m));
  s.on('notice', (n) => c.notices.push(n));
  c.emit = (ev, data) => new Promise((res) => s.emit(ev, data, res));
  c.profile = { name, avatar: { e: 1, c: 2 } };
  return c;
}
async function waitFor(fn, ms = 4000, label = '') {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return true;
    await sleep(25);
  }
  console.log('  timed out waiting for', label);
  return false;
}

(async () => {
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((r) => srv.stdout.once('data', r));
  const all = [];
  try {
    const a = client('Alice');
    const b = client('Bob');
    const c = client('Cara');
    all.push(a, b, c);
    const r1 = await a.emit('createRoom', { game: 'drawguess', token: a.token, profile: a.profile });
    const code = r1.code;
    await b.emit('joinRoom', { code, token: b.token, profile: b.profile });
    await c.emit('joinRoom', { code, token: c.token, profile: c.profile });
    await waitFor(() => a.state && a.state.players.length === 3, 2000, '3 players');
    const ids = a.state.players.map((p) => p.id).sort();
    const hostId = a.state.hostId;

    // ----- switch to Four in a Row: 2 seats, the third person spectates but stays -----
    a.s.emit('switchGame', { game: 'fourrow', seats: [a.state.you, b.state.you] });
    await waitFor(() => a.state.gameId === 'fourrow', 2000, 'switch to fourrow');
    ok(a.state.code === code && a.state.players.length === 2 && a.state.spectators.length === 1, 'switch to 4 in a Row keeps same room: 2 seated, 1 spectating');
    ok(a.state.maxPlayers === 2, 'view reports 2 active seats for 4 in a Row');
    const everyone = [...a.state.players, ...a.state.spectators].map((p) => p.id).sort();
    ok(JSON.stringify(everyone) === JSON.stringify(ids), 'nobody is ejected when switching to fewer seats');
    ok(a.state.hostId === hostId, 'host unchanged by switch');
    ok(c.notices.some((n) => /spectating/i.test(n)), 'moved player is told they are spectating');

    // ----- play a full game: Alice wins with four in column 0 -----
    a.s.emit('chat', 'hello before game');
    a.s.emit('startGame');
    await waitFor(() => a.state.phase === 'game', 2000, 'game start');
    // Whoever has the turn stacks column 0 while the other stacks column 1, so the
    // first mover wins with four in a row.
    for (let i = 0; i < 12 && a.state.phase === 'game'; i++) {
      const mover = a.state.game.myIndex === a.state.game.turn ? a : b;
      mover.s.emit('action', { type: 'drop', col: mover === a && a.state.game.myIndex === 0 || mover === b && b.state.game.myIndex === 0 ? 0 : 1 });
      await sleep(60);
    }
    ok(a.state.phase === 'lobby' && a.state.lastResult && a.state.lastResult.type === 'fourrow', 'a full 4 in a Row game ends with a result');
    await waitFor(() => a.state.phase === 'lobby', 2000, 'back to lobby');
    ok(a.state.phase === 'lobby', 'finished game returns the room to the lobby');

    // ----- Play Again: same code, same people, same host, chat kept -----
    const rosterBefore = [...a.state.players, ...a.state.spectators].map((p) => p.id).sort();
    const chatLen = a.chats.length;
    const specCap = a.state.maxSpectators;
    b.s.emit('startGame');
    await sleep(150);
    ok(b.state.phase === 'lobby', 'non-host cannot trigger Play Again');
    a.s.emit('startGame');
    await waitFor(() => a.state.phase === 'game', 2000, 'play again');
    ok(a.state.phase === 'game' && a.state.code === code, 'host Play Again starts a new game in the same room code');
    ok(a.state.hostId === hostId, 'host is unchanged after Play Again');
    const rosterAfter = [...a.state.players, ...a.state.spectators].map((p) => p.id).sort();
    ok(JSON.stringify(rosterBefore) === JSON.stringify(rosterAfter), 'roster unchanged after Play Again (winner-stays rotation only swaps seats)');
    ok(a.chats.some((m) => m.text === 'hello before game') && a.chats.length >= chatLen, 'chat history survives Play Again');
    ok(a.state.maxSpectators === specCap, 'spectator capacity unchanged');

    // ----- Choose another game from the post-game state -----
    a.s.emit('endGame');
    await waitFor(() => a.state.phase === 'lobby', 2000, 'ended');
    a.s.emit('switchGame', { game: 'drawguess' });
    await waitFor(() => a.state.gameId === 'drawguess', 2000, 'switch back');
    ok(a.state.code === code && a.state.players.length + a.state.spectators.length === 3, 'switching back keeps all 3 people in the same room');
    ok(a.state.players.length === 3, 'extra people get seats again when more seats are available');
    ok(a.state.hostId === hostId, 'host unchanged after switching back');
    b.s.emit('switchGame', { game: 'fourrow' });
    await sleep(150);
    ok(b.state.gameId === 'drawguess', 'only the host can switch games');
  } catch (err) {
    console.error(err);
    failures++;
  }
  all.forEach((x) => x.s.close());
  srv.kill();
  console.log(failures ? `\n${failures} FAILED` : '\nAll passed');
  process.exit(failures ? 1 : 0);
})();
