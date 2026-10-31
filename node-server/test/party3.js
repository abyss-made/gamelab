// Issue #38 multiplayer tests (real server + sockets): a party can be created with no game, the
// host picks one later in the same room, readiness is advisory and resets for each rematch, and a
// game bigger than the party's seats only fits when spectators are allowed.
// Run: node test/party3.js
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

let failures = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tok = () => [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

const PORT = 3982;
const URL = `http://localhost:${PORT}`;
const AUTOSTART_WAIT = 400; // the loop runs every 250ms, so a countdown would have appeared by now
function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}
async function until(fn, ms = 4000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return true;
    await sleep(25);
  }
  return false;
}
const all = [];
function client(name) {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const c = { s, name, token: tok(), state: null, notices: [], profile: { name, avatar: { e: 1, c: 2 } } };
  s.on('state', (st) => (c.state = st));
  s.on('notice', (n) => c.notices.push(n));
  c.call = (ev, d) => new Promise((r) => s.emit(ev, d, r));
  c.emit = (ev, d) => s.emit(ev, d);
  c.join = (code) => c.call('joinRoom', { code, token: c.token, profile: c.profile });
  all.push(c);
  return c;
}

(async () => {
  const env = { ...process.env, PORT: String(PORT), ALPHA_ENABLED: '' };
  delete env.HIDDEN_GAMES;
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  try {
    // ----- routes -----
    for (const p of ['/games', '/rooms']) {
      const r = await get(URL + p);
      ok(r.status === 200 && /<main id="screen-rooms"/.test(r.body), `${p} serves the app page`);
    }

    // ----- a party with no game -----
    const host = client('Alex');
    const res = await host.call('createRoom', { game: null, isPublic: true, spectatorsOn: true, token: host.token, profile: host.profile });
    ok(res.ok && res.role === 'player', 'createRoom with game: null succeeds');
    await until(() => host.state);
    ok(host.state.gameId === null && host.state.settings === null && host.state.game === null, 'no-game party has no game id, settings or game view');
    ok(host.state.name === "Alex's Party", `party is named after its creator (${host.state.name})`);
    ok(host.state.maxPlayers >= 12, `no-game party seats the whole group (${host.state.maxPlayers})`);
    const code = res.code;

    const friends = [];
    for (const n of ['Nova', 'Trouble', 'Kai']) {
      const f = client(n);
      const r = await f.join(code);
      ok(r.ok && r.role === 'player', `${n} joins the no-game party with a seat`);
      friends.push(f);
    }
    await until(() => host.state.players.length === 4);

    const list = JSON.parse((await get(URL + '/api/rooms')).body);
    const row = list.find((r) => r.code === code);
    ok(row && row.gameId === null && row.gameName === null && row.name === "Alex's Party", 'public list shows the party without a game');

    host.emit('startGame');
    await until(() => host.notices.length > 0);
    ok(host.state.phase === 'lobby' && /Choose a game/.test(host.notices.pop() || ''), 'Start is refused until a game is chosen');
    await sleep(AUTOSTART_WAIT);
    ok(host.state.autoStartAt === undefined && host.state.autoStartIn === null, 'a public no-game party never counts down to auto start');

    host.emit('hostUpdate', { settings: { rounds: 2 }, maxPlayers: 3 });
    await sleep(150);
    ok(host.state.settings === null && host.state.maxPlayers >= 12, 'settings and seat limits are ignored without a game');

    // ----- readiness -----
    friends[0].emit('setReady', true);
    friends[1].emit('setReady', true);
    await until(() => host.state.players.filter((p) => p.ready).length === 2);
    ok(host.state.players.filter((p) => p.ready).length === 2, 'two players marked themselves ready');
    friends[1].emit('setReady', false);
    await until(() => host.state.players.filter((p) => p.ready).length === 1);
    ok(host.state.players.find((p) => p.id === friends[1].state.you).ready === false, 'readiness can be undone');

    // ----- votes while there is no game -----
    friends[2].emit('voteNext', 'chess');
    await until(() => host.state.nextVotes.chess === 1);
    ok(host.state.nextVotes.chess === 1 && host.state.gameId === null, 'members can suggest a game; votes never auto-select it');

    // ----- choosing a two-player game with spectators off is refused -----
    host.emit('hostUpdate', { spectatorsOn: false });
    await until(() => host.state.spectatorsOn === false);
    const before = host.notices.length;
    host.emit('switchGame', { game: 'chess' });
    await until(() => host.notices.length > before);
    ok(host.state.gameId === null && /Allow spectators/.test(host.notices[host.notices.length - 1] || ''), 'a 2-seat game is refused for 4 people when spectators are off');

    // ----- with spectators on, the same choice seats two and queues the rest -----
    host.emit('hostUpdate', { spectatorsOn: true });
    await until(() => host.state.spectatorsOn === true);
    host.emit('switchGame', { game: 'chess', seats: [host.state.you, friends[0].state.you] });
    await until(() => host.state.gameId === 'chess');
    ok(host.state.code === code, 'choosing a game keeps the same party code');
    ok(host.state.players.length === 2 && host.state.spectators.length === 2, 'chess seats two and the others watch');
    ok(host.state.queue.length === 2, 'the two who were moved wait in the queue');
    ok(host.state.settings && host.state.settings.clock !== undefined, 'the chosen game brings its settings');

    // non-host cannot pick
    friends[1].emit('switchGame', { game: 'tictactoe' });
    await sleep(150);
    ok(host.state.gameId === 'chess', 'a participant cannot change the game');

    // ----- readiness resets when a match starts -----
    friends[0].emit('setReady', true);
    host.emit('setReady', true);
    await until(() => host.state.players.every((p) => p.ready));
    host.emit('startGame');
    await until(() => host.state.phase === 'game');
    ok(host.state.phase === 'game', 'host starts once the minimum is met');
    ok([...host.state.players, ...host.state.spectators].every((p) => !p.ready), 'readiness resets for the next round');
    friends[0].emit('setReady', true);
    await sleep(150);
    ok(!host.state.players.find((p) => p.id === friends[0].state.you).ready, 'readiness cannot be set during a match');
    host.emit('endGame');
    await until(() => host.state.phase === 'lobby');
    ok(host.state.code === code && host.state.players.length + host.state.spectators.length === 4, 'everyone is still in the party after the game');

    // ----- older clients that omit the game still get Draw & Guess -----
    const old = client('Old');
    const r2 = await old.call('createRoom', { token: old.token, profile: old.profile });
    await until(() => old.state);
    ok(r2.ok && old.state.gameId === 'drawguess', 'createRoom without a game keeps the old Draw & Guess default');

    // ----- joining a full no-game party as a spectator -----
    const tiny = client('Tiny');
    const r3 = await tiny.call('createRoom', { game: null, token: tiny.token, profile: tiny.profile });
    await until(() => tiny.state);
    ok(r3.ok && tiny.state.gameId === null, 'private no-game party created');
    const big = tiny.state.maxPlayers;
    const crowd = [];
    for (let i = 0; i < big; i++) {
      const c = client('P' + i);
      crowd.push(await c.join(r3.code));
    }
    const last = crowd[crowd.length - 1];
    ok(last.ok && last.role === 'spectator' && /party is full/.test(last.notice || ''), 'the person past the seat limit spectates with a clear notice');
  } catch (err) {
    console.error(err);
    failures++;
  } finally {
    all.forEach((c) => c.s.close());
    srv.kill();
  }
  console.log(failures ? `\n${failures} FAILED` : '\nAll party 3.0 checks passed');
  process.exit(failures ? 1 : 0);
})();
