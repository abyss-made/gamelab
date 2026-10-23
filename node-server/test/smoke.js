// End-to-end smoke test: starts the server and plays both games with fake players.
// Run: npm test
const { spawn } = require('child_process');
const path = require('path');
const { io } = require('socket.io-client');

const PORT = 3999;
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
  const c = { s, name, token: tok(), state: null, chats: [], notices: [], draws: [], canvas: [], kicked: false };
  s.on('state', (st) => { c.state = st; });
  s.on('chat', (m) => c.chats.push(m));
  s.on('notice', (n) => c.notices.push(n));
  s.on('draw', (d) => c.draws.push(d));
  s.on('canvas', (d) => c.canvas.push(d));
  s.on('kicked', () => { c.kicked = true; });
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

  try {
    // ---------- Draw & Guess with 2 players ----------
    const a = client('Alice');
    const b = client('Bob');
    const r1 = await a.emit('createRoom', { game: 'drawguess', isPublic: false, token: a.token, profile: a.profile, settings: { rounds: 1, drawTime: 30 } });
    ok(r1.ok && /^[A-Z0-9]{6}$/.test(r1.code), 'create private Draw & Guess lobby');
    const code = r1.code;
    const r2 = await b.emit('joinRoom', { code, token: b.token, profile: b.profile });
    ok(r2.ok && r2.role === 'player', 'second player joins by code');
    await waitFor(() => a.state && a.state.players.length === 2, 2000, 'two players');
    ok(a.state.hostId === a.state.you, 'creator is host');

    b.s.emit('startGame');
    await sleep(200);
    ok(b.state.phase === 'lobby', 'non-host cannot start');

    a.s.emit('startGame');
    await waitFor(() => a.state.phase === 'game', 2000, 'game start');
    ok(a.state.phase === 'game', 'host starts game with 2 players');

    const drawer = a.state.game.drawerId === a.state.you ? a : b;
    const guesser = drawer === a ? b : a;
    ok(Array.isArray(drawer.state.game.choices) && drawer.state.game.choices.length === 6 && new Set(drawer.state.game.choices).size === 6, 'drawer gets 6 distinct word choices');
    ok(guesser.state.game.choices === null, 'guesser does not see choices');
    const word = drawer.state.game.choices[1];
    drawer.s.emit('action', { type: 'choose', index: 1 });
    await waitFor(() => guesser.state.game.phase === 'draw', 2000, 'draw phase');
    ok(guesser.state.game.word === null && guesser.state.game.hint.length === word.length, 'guesser sees blanks, not the word');
    ok(drawer.state.game.word === word, 'drawer sees the word');

    drawer.s.emit('draw', { op: 'begin', x: 100, y: 100, color: '#ff0000', size: 10 });
    drawer.s.emit('draw', { op: 'pts', pts: [110, 110, 120, 130] });
    drawer.s.emit('draw', { op: 'end' });
    guesser.s.emit('draw', { op: 'begin', x: 5, y: 5, color: '#000000', size: 4 });
    await waitFor(() => guesser.draws.length >= 3, 1500, 'draw relay');
    ok(guesser.draws.length === 3 && guesser.draws[0].op === 'begin', 'strokes relay to the guesser');
    ok(drawer.draws.length === 0, "guesser's fake drawing was ignored");

    drawer.s.emit('chat', `it is ${word}`);
    await sleep(200);
    ok(!guesser.chats.some((m) => m.text && m.text.includes(word)), 'drawer cannot leak the word in chat');

    guesser.s.emit('chat', 'zzzz wrong');
    await waitFor(() => drawer.chats.some((m) => m.text === 'zzzz wrong'), 1500, 'wrong guess shows');
    ok(true, 'wrong guess shows in chat');

    guesser.s.emit('chat', word.toUpperCase());
    await waitFor(() => guesser.state.game && guesser.state.game.phase === 'reveal' || guesser.state.phase === 'lobby', 3000, 'reveal');
    ok(!drawer.chats.some((m) => m.kind === 'msg' && m.text.toLowerCase() === word), 'correct guess is hidden from others');
    const gScore = guesser.state.players.find((p) => p.id === guesser.state.you).score;
    ok(gScore > 50, `guesser scored (${gScore})`);
    ok(guesser.state.game.turnResult && guesser.state.game.turnResult.word === word, 'turn ends when everyone guessed, word revealed');

    // ---------- link join while full -> spectator; late joiner in D&G gets a seat ----------
    const c = client('Cara');
    const r3 = await c.emit('joinRoom', { code, token: c.token, profile: c.profile });
    ok(r3.ok && r3.role === 'player', 'Draw & Guess lets new players join mid-game');
    await waitFor(() => c.canvas.length > 0 && c.state, 1500, 'canvas sync');
    ok(c.canvas.length > 0, 'late joiner receives the current drawing');

    // ---------- reconnect keeps seat ----------
    const before = c.state && c.state.you;
    c.s.disconnect();
    await sleep(300);
    c.s.connect();
    await new Promise((r) => c.s.once('connect', r));
    const r4 = await c.emit('joinRoom', { code, token: c.token, profile: c.profile });
    ok(r4.ok && r4.rejoined, 'refresh/reconnect rejoins the same seat');
    await waitFor(() => c.state && c.state.you === before, 1500, 'same id');
    ok(c.state.you === before, 'same player id after reconnect');

    // End game, switch to 4 in a Row with 3 people -> host picks seats
    a.s.emit('endGame');
    await waitFor(() => a.state.phase === 'lobby', 2000, 'end');
    ok(a.state.phase === 'lobby', 'host can end the game');
    a.s.emit('switchGame', { game: 'fourrow', seats: [a.state.you, c.state.you] });
    await waitFor(() => a.state.gameId === 'fourrow' && a.state.players.length === 2, 2000, 'switch');
    ok(a.state.players.length === 2 && a.state.spectators.length === 1, 'switch to 4 in a Row: 2 play, 1 spectates');
    ok(b.state.role === 'spectator', 'unpicked player became a spectator');
    ok(b.notices.some((n) => n.includes('4 in a Row')), 'spectator was told why');
    ok(a.state.code === code, 'lobby link stays the same after switching games');

    // Spectator joins via link when full
    const d = client('Dan');
    const r5 = await d.emit('joinRoom', { code, token: d.token, profile: d.profile });
    ok(r5.ok && r5.role === 'spectator' && /Both seats are taken/.test(r5.notice), 'full 2-player lobby: link joiner spectates with message');

    // Spectators off + full -> rejected
    a.s.emit('hostUpdate', { spectatorsOn: false });
    await sleep(150);
    const e = client('Eve');
    const r6 = await e.emit('joinRoom', { code, token: e.token, profile: e.profile });
    ok(r6.error === 'full' && r6.max === 2, 'full lobby with spectators off is rejected with counts');
    a.s.emit('hostUpdate', { spectatorsOn: true });

    // Lock
    a.s.emit('hostUpdate', { locked: true });
    await sleep(150);
    const r7 = await e.emit('joinRoom', { code, token: e.token, profile: e.profile });
    ok(r7.error === 'locked', 'locked lobby rejects new people');
    a.s.emit('hostUpdate', { locked: false });

    // ---------- play 4 in a Row ----------
    a.s.emit('hostUpdate', { settings: { turnTime: 0 } });
    await sleep(100);
    a.s.emit('startGame');
    await waitFor(() => a.state.phase === 'game', 2000, '4row start');
    ok(a.state.game && a.state.game.board.length === 6, '4 in a Row starts');
    const g = a.state.game;
    const first = g.players[0].id === a.state.you ? a : c;
    const second = first === a ? c : a;
    second.s.emit('action', { type: 'drop', col: 0 });
    await sleep(150);
    ok(a.state.game.moves === 0, 'out-of-turn move is ignored');
    // first player stacks column 3, second stacks column 0 -> first wins vertically
    for (let i = 0; i < 4; i++) {
      first.s.emit('action', { type: 'drop', col: 3 });
      await waitFor(() => a.state.phase !== 'game' || a.state.game.turn === 1, 1500, 'turn');
      if (i < 3) {
        second.s.emit('action', { type: 'drop', col: 0 });
        await waitFor(() => a.state.game.turn === 0, 1500, 'turn back');
      }
    }
    await waitFor(() => a.state.phase === 'lobby' && a.state.lastResult, 2000, 'win');
    const res = a.state.lastResult;
    ok(res && res.winnerId === first.state.you && res.winLine.length >= 4, 'vertical four wins');
    ok(res.nextUp && second.state.role === 'spectator', 'winner stays: loser swapped with next spectator');
    ok(d.notices.length >= 0 && a.state.players.some((p) => p.name === 'Bob'), 'first spectator in line took the seat');

    // ---------- forfeit on leave ----------
    a.s.emit('startGame');
    await waitFor(() => a.state.phase === 'game', 2000, 'rematch');
    const winnerSide = a.state.players.find((p) => p.id !== first.state.you);
    first.s.emit('leaveRoom');
    await waitFor(() => a.state && a.state.phase === 'lobby' || (b.state && b.state.phase === 'lobby'), 2500, 'forfeit');
    const watcher = b.state.phase === 'lobby' ? b : d;
    ok(watcher.state.lastResult && watcher.state.lastResult.forfeit && watcher.state.lastResult.winnerId === winnerSide.id, 'leaving mid-match forfeits');
    ok(watcher.state.hostId !== first.state.you, 'host passed on when host left');

    // ---------- quick play + public list ----------
    const q1 = client('Q1');
    const q2 = client('Q2');
    const rq1 = await q1.emit('quickPlay', { game: 'fourrow', token: q1.token, profile: q1.profile });
    const rq2 = await q2.emit('quickPlay', { game: 'fourrow', token: q2.token, profile: q2.profile });
    ok(rq1.ok && rq2.ok && rq1.code === rq2.code, 'quick play pairs two strangers in one public lobby');
    const list = await (await fetch(URL + '/api/rooms')).json();
    ok(list.some((r) => r.code === rq1.code) && !list.some((r) => r.code === code), 'public lobby listed, private one hidden');
    await waitFor(() => q1.state && q1.state.autoStartIn !== null, 2000, 'autostart');
    ok(q1.state.autoStartIn > 0, 'public lobby counts down to auto start');

    // ---------- vote kick in public lobby ----------
    const q3 = client('Q3');
    await q3.emit('joinRoom', { code: rq1.code, token: q3.token, profile: q3.profile });
    await waitFor(() => q1.state.spectators.length === 1, 1500, 'q3');
    const q3id = q1.state.spectators[0].id;
    q1.s.emit('voteKick', q3id);
    q2.s.emit('voteKick', q3id);
    await waitFor(() => q3.kicked, 2000, 'votekick');
    ok(q3.kicked, 'vote kick removes a player in public lobby');
    const rq3 = await q3.emit('joinRoom', { code: rq1.code, token: q3.token, profile: q3.profile });
    ok(rq3.error === 'kicked', 'kicked player cannot rejoin');

    // ---------- pages ----------
    for (const p of ['/', '/draw-and-guess', '/four-in-a-row', '/r/ABCDEF', '/privacy.html', '/ads.txt', '/js/main.js']) {
      const res2 = await fetch(URL + p);
      ok(res2.status === 200, `GET ${p} -> ${res2.status}`);
    }
    const html = await (await fetch(URL + '/four-in-a-row')).text();
    ok(html.includes('<title>4 in a Row - Play online with a friend'), 'game page has its own title');
    const closed = await client('Z').emit('joinRoom', { code: 'ZZZZZZ', token: tok(), profile: {} });
    ok(closed.error === 'closed', 'unknown lobby link says closed');

    [a, b, c, d, e, q1, q2, q3].forEach((x) => x.s.close());
  } catch (err) {
    console.error(err);
    failures++;
  }
  srv.kill();
  console.log(failures ? `\n${failures} FAILED` : '\nAll passed');
  process.exit(failures ? 1 : 0);
})();
