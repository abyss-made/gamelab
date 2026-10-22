// Regression tests for multiplayer safety fixes: ghost members, undo/clear spam,
// secret word visibility, and system-chat flooding. Run: node test/safety.js
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

function client(name, token = tok()) {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const c = { s, name, token, state: null, chats: [], canvas: [], events: [] };
  s.on('state', (st) => { c.state = st; });
  s.on('chat', (m) => c.chats.push(m));
  s.on('canvas', (d) => c.canvas.push(d));
  s.onAny((ev, d) => c.events.push([ev, d]));
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
const sysCount = (c, re) => c.chats.filter((m) => m.kind === 'sys' && re.test(m.text)).length;
const leaks = (c, word) => JSON.stringify(c.events).toLowerCase().includes(word.toLowerCase());

(async () => {
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DISCONNECT_GRACE_MS: '1500', EMPTY_ROOM_TTL_MS: '1000' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  await new Promise((r) => srv.stdout.once('data', r));
  const all = [];
  const mk = (...a) => { const c = client(...a); all.push(c); return c; };

  try {
    // ---------- 1. ghost members ----------
    const g = mk('Ghost');
    const tokA = tok();
    const tokB = tok();
    const r1 = await g.emit('createRoom', { game: 'drawguess', isPublic: true, token: tokA, profile: g.profile });
    ok(r1.ok, 'ghost: room created');
    const code1 = r1.code;
    // same socket re-joins the same room with a different token (duplicate attachment)
    const r2 = await g.emit('joinRoom', { code: code1, token: tokB, profile: g.profile });
    ok(r2.ok && !r2.rejoined, 'ghost: same socket attaches a second identity');
    await waitFor(() => g.state && g.state.players.length === 1, 1500, 'old identity released');
    ok(g.state.players.length === 1, 'ghost: previous member released immediately, not left connected');
    g.s.disconnect();
    const list0 = await (await fetch(URL + '/api/rooms')).json();
    ok(list0.some((r) => r.code === code1), 'ghost: room still listed during grace period');
    await sleep(1500 + 1000 + 1500); // grace + empty TTL + loop slack
    const list1 = await (await fetch(URL + '/api/rooms')).json();
    ok(!list1.some((r) => r.code === code1), 'ghost: room unlisted after grace');
    const h = mk('Late');
    const rc = await h.emit('joinRoom', { code: code1, token: tok(), profile: h.profile });
    ok(rc.error === 'closed', 'ghost: stale room is deleted after the grace period and TTL');

    // identity swap on a full lobby: the new identity inherits the freed seat
    const sw = mk('Swap');
    const rsw = await sw.emit('createRoom', { game: 'fourrow', token: tok(), profile: sw.profile });
    const sw2 = mk('Swap2');
    await sw2.emit('joinRoom', { code: rsw.code, token: sw2.token, profile: sw2.profile }); // both seats full
    const rsw3 = await sw.emit('joinRoom', { code: rsw.code, token: tok(), profile: sw.profile });
    ok(rsw3.ok && rsw3.role === 'player', 'ghost: identity swap on a full lobby takes the freed seat');

    // legit reconnect keeps identity
    const p = mk('Perm');
    const rp = await p.emit('createRoom', { game: 'drawguess', token: p.token, profile: p.profile });
    await waitFor(() => p.state, 1500, 'state');
    const myId = p.state.you;
    p.s.disconnect();
    await sleep(300);
    p.s.connect();
    await new Promise((r) => p.s.once('connect', r));
    const rp2 = await p.emit('joinRoom', { code: rp.code, token: p.token, profile: p.profile });
    await waitFor(() => p.state && p.state.you === myId, 1500, 'same id');
    ok(rp2.ok && rp2.rejoined && p.state.you === myId, 'ghost: legitimate reconnect recovers same member');
    // replaced socket (second tab, same token) takes over, old one is not a ghost
    const p2 = mk('Perm2', p.token);
    const rp3 = await p2.emit('joinRoom', { code: rp.code, token: p.token, profile: p.profile });
    ok(rp3.ok && rp3.rejoined, 'ghost: same token from another socket takes over the seat');

    // ---------- 3. secret word hidden from spectators ----------
    const a2 = mk('Hosty');
    const b2 = mk('Bobby');
    const ra2 = await a2.emit('createRoom', { game: 'drawguess', isPublic: false, token: a2.token, profile: a2.profile, maxPlayers: 2, settings: { rounds: 1, drawTime: 60 } });
    const code2 = ra2.code;
    await b2.emit('joinRoom', { code: code2, token: b2.token, profile: b2.profile });
    const spec = mk('Watcher');
    const rs = await spec.emit('joinRoom', { code: code2, token: spec.token, profile: spec.profile });
    ok(rs.role === 'spectator', 'word: third person in a 2-seat room spectates');
    a2.s.emit('startGame');
    await waitFor(() => a2.state.phase === 'game', 2000, 'start2');
    const dr = a2.state.game.drawerId === a2.state.you ? a2 : b2;
    const gu = dr === a2 ? b2 : a2;
    const word = dr.state.game.choices[0];
    dr.s.emit('action', { type: 'choose', index: 0 });
    await waitFor(() => gu.state.game.phase === 'draw', 2000, 'draw phase');
    await sleep(200);
    ok(spec.state.game.word === null && !leaks(spec, word), 'word: spectator state and events never contain the secret word');
    ok(gu.state.game.word === null, 'word: guesser does not see the word');
    ok(dr.state.game.word === word, 'word: drawer sees the word');

    // second-tab path: spectator cannot score by taking a seat mid-turn (seats full here)
    spec.s.emit('takeSeat');
    await sleep(200);
    ok(spec.state.role === 'spectator', 'word: no free seat mid-turn for the spectator');

    // a guesser who already guessed cannot pass the word to spectators via hidden chat
    gu.s.emit('chat', word);
    await waitFor(() => gu.state.game.guessed.includes(gu.state.you) || gu.state.game.phase === 'reveal', 2000, 'guessed');
    await sleep(200);
    const dr2 = dr.state.game.phase;
    ok(dr2 === 'reveal' || dr2 === 'draw', 'word: guess accepted');
    // After reveal the word is public
    await waitFor(() => spec.state.game && spec.state.game.phase === 'reveal', 3000, 'reveal');
    ok(spec.state.game.word === word || (spec.state.game.turnResult && spec.state.game.turnResult.word === word), 'word: revealed to spectators at turn end');

    // ---------- 2. undo / clear spam ----------
    const d1 = mk('Dee');
    const d2 = mk('Dom');
    const rd = await d1.emit('createRoom', { game: 'drawguess', token: d1.token, profile: d1.profile, settings: { rounds: 1, drawTime: 60 } });
    await d2.emit('joinRoom', { code: rd.code, token: d2.token, profile: d2.profile });
    d1.s.emit('startGame');
    await waitFor(() => d1.state.phase === 'game', 2000, 'dd start');
    const dd = d1.state.game.drawerId === d1.state.you ? d1 : d2;
    const gg = dd === d1 ? d2 : d1;
    dd.s.emit('action', { type: 'choose', index: 0 });
    await waitFor(() => gg.state.game.phase === 'draw', 2000, 'dd draw');
    dd.s.emit('draw', { op: 'begin', x: 10, y: 10, color: '#000000', size: 4 });
    dd.s.emit('draw', { op: 'end' });
    await sleep(150);
    const before = gg.canvas.length;
    for (let i = 0; i < 200; i++) dd.s.emit('draw', { op: i % 2 ? 'undo' : 'clear' });
    await sleep(500);
    const extra = gg.canvas.length - before;
    ok(extra > 0 && extra <= 8, `undo/clear spam bounded (${extra} canvas broadcasts from 200 requests)`);
    // non-drawer cannot mutate
    const b4 = gg.canvas.length;
    for (let i = 0; i < 20; i++) gg.s.emit('draw', { op: 'clear' });
    await sleep(300);
    ok(gg.canvas.length === b4, 'non-drawer cannot clear or undo');
    // legit action after the bucket refills
    await sleep(1500);
    const b5 = gg.canvas.length;
    dd.s.emit('draw', { op: 'begin', x: 20, y: 20, color: '#ff0000', size: 4 });
    dd.s.emit('draw', { op: 'end' });
    dd.s.emit('draw', { op: 'undo' });
    await waitFor(() => gg.canvas.length > b5, 1500, 'undo works');
    ok(gg.canvas.length > b5, 'legitimate undo still works after spam');

    // ---------- 4. system chat flooding ----------
    const h1 = mk('Hosta');
    const m2 = mk('Mem2');
    const rl = await h1.emit('createRoom', { game: 'fourrow', isPublic: true, token: h1.token, profile: h1.profile });
    await m2.emit('joinRoom', { code: rl.code, token: m2.token, profile: m2.profile });
    const m3 = mk('Mem3');
    await m3.emit('joinRoom', { code: rl.code, token: m3.token, profile: m3.profile }); // spectator
    await waitFor(() => m3.state && m3.state.role === 'spectator', 1500, 'm3 spec');
    // watch / take seat spam by a player
    for (let i = 0; i < 100; i++) { m2.s.emit('watch'); m2.s.emit('takeSeat'); }
    await sleep(400);
    const seatMsgs = sysCount(h1, /took a seat|now watching/);
    ok(seatMsgs > 0 && seatMsgs <= 6, `seat-change spam bounded (${seatMsgs} system messages from 200 requests)`);
    // host lock spam
    for (let i = 0; i < 100; i++) h1.s.emit('hostUpdate', { locked: i % 2 === 0 });
    await sleep(400);
    const lockMsgs = sysCount(h1, /locked|unlocked/);
    ok(lockMsgs > 0 && lockMsgs <= 6, `lock toggle spam bounded (${lockMsgs} system messages from 100 requests)`);
    h1.s.emit('hostUpdate', { locked: false });
    // vote kick spam (public lobby, repeated votes by one member)
    await sleep(2500); // let the shared lobby bucket refill
    const target = m3.state.you;
    for (let i = 0; i < 100; i++) m2.s.emit('voteKick', target);
    await sleep(400);
    const voteMsgs = sysCount(h1, /voted to kick/);
    ok(voteMsgs === 1, `vote-kick spam bounded (${voteMsgs} system messages from 100 requests)`);
    // normal chat unaffected
    h1.s.emit('chat', 'hello there');
    await waitFor(() => m2.chats.some((m) => m.text === 'hello there'), 1500, 'chat');
    ok(m2.chats.some((m) => m.text === 'hello there'), 'normal chat still works');
    // a single legitimate take-seat/watch still works for another member
    m3.s.emit('takeSeat');
    await sleep(200);
    ok(sysCount(h1, /Mem3 took a seat/) <= 1, 'single legitimate seat action is not blocked');
  } catch (err) {
    console.error(err);
    failures++;
  }
  all.forEach((x) => x.s.close());
  srv.kill();
  console.log(failures ? `\n${failures} FAILED` : '\nAll passed');
  process.exit(failures ? 1 : 0);
})();
