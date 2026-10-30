// Issue #35 multiplayer tests (real server + sockets): hidden games, persistent party lobbies across
// game switches, rematches with winner-stays and the spectator queue, next-game votes, host
// migration (disconnect, idle, transfer), moderation and spectator lock-out.
// Run: node test/party.js
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

let failures = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tok = () => [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
const HIDDEN = ['higherlower', 'liarsdice', 'hotpotato', 'reversi'];

function start(port, env = {}) {
  const base = { ...process.env, PORT: String(port), ALPHA_ENABLED: '' };
  delete base.HIDDEN_GAMES; // exercise the real default
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...base, ...env }, stdio: ['ignore', 'pipe', 'inherit'] });
  return { srv, ready: new Promise((r) => srv.stdout.once('data', r)), url: `http://localhost:${port}` };
}
function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
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
function client(url, name, token = tok()) {
  const s = io(url, { transports: ['websocket'], forceNew: true });
  const c = { s, name, token, state: null, notices: [], chats: [], kicked: false, profile: { name, avatar: { e: 1, c: 2 } } };
  s.on('state', (st) => (c.state = st));
  s.on('notice', (n) => c.notices.push(n));
  s.on('chat', (m) => c.chats.push(m));
  s.on('kicked', () => (c.kicked = true));
  c.call = (ev, d) => new Promise((r) => s.emit(ev, d, r));
  c.emit = (ev, d) => s.emit(ev, d);
  c.join = (code) => c.call('joinRoom', { code, token: c.token, profile: c.profile });
  all.push(c);
  return c;
}
async function party(url, game, names, opts = {}) {
  const [hostName, ...rest] = names;
  const host = client(url, hostName);
  const res = await host.call('createRoom', { game, token: host.token, profile: host.profile, ...opts });
  const out = [host];
  for (const n of rest) {
    const c = client(url, n);
    await c.join(res.code);
    out.push(c);
  }
  await until(() => out.every((c) => c.state && c.state.players.length + c.state.spectators.length === names.length));
  return { code: res.code, res, cs: out };
}
const ids = (st) => st.players.map((p) => p.id);
const specIds = (st) => st.spectators.map((p) => p.id);

// Plays a won Tic Tac Toe game: X takes the top row while O plays the middle row.
async function winTicTacToe(cs) {
  const byId = (id) => cs.find((c) => c.state.you === id);
  await until(() => cs[0].state.phase === 'game' && cs[0].state.game);
  const g = cs[0].state.game;
  const order = (g.players || []).map((p) => (typeof p === 'string' ? p : p.id));
  const x = byId(order[0]);
  const o = byId(order[1]);
  for (const [who, cell] of [[x, 0], [o, 3], [x, 1], [o, 4], [x, 2]]) {
    const before = cs[0].state.game ? cs[0].state.game.moves : null;
    who.emit('action', { type: 'place', cell });
    await until(() => cs[0].state.phase !== 'game' || (cs[0].state.game && cs[0].state.game.moves !== before));
  }
  await until(() => cs[0].state.phase === 'lobby' && cs[0].state.lastResult);
  return { x, o };
}

(async () => {
  const A = start(3971, { DISCONNECT_GRACE_MS: '1500', HOST_GRACE_MS: '400' });
  const B = start(3972, { HOST_AFK_MS: '1200' });
  await Promise.all([A.ready, B.ready]);
  const url = A.url;
  try {
    // ---------- 1. hidden games ----------
    {
      const page = await get(url + '/');
      const m = page.body.match(/hidden: (\[[^\]]*\])/);
      const hidden = m ? JSON.parse(m[1]) : null;
      ok(hidden && hidden.slice().sort().join() === HIDDEN.slice().sort().join(), 'home page tells the client exactly the four hidden games');
      const { GAMES } = require('../server/games');
      ok(Object.keys(GAMES).length === 25 && HIDDEN.every((id) => GAMES[id]), 'hidden game modules stay registered (25 total)');
      ok(Object.keys(GAMES).length - hidden.length === 21, '21 games are selectable');
      for (const slug of ['/higher-or-lower', '/liars-dice', '/hot-potato', '/reversi']) {
        const r = await get(url + slug);
        ok(r.status === 302 && r.headers.location === '/?view=games', `${slug} redirects to the catalog`);
      }
      ok((await get(url + '/chess')).status === 200, 'visible game pages still render');

      for (const g of HIDDEN) {
        const c = client(url, 'Sneaky');
        const r = await c.call('createRoom', { game: g, token: c.token, profile: c.profile, isPublic: true });
        await until(() => c.state);
        ok(r.ok && c.state.gameId === 'drawguess', `createRoom(${g}) falls back to Draw & Guess`);
        const q = client(url, 'Quick');
        await q.call('quickPlay', { game: g, token: q.token, profile: q.profile });
        await until(() => q.state);
        ok(q.state && q.state.gameId === 'drawguess', `quickPlay(${g}) never lands in ${g}`);
        c.emit('switchGame', { game: g });
        c.emit('voteNext', g);
        await sleep(120);
        ok(c.state.gameId === 'drawguess' && !c.state.nextVotes[g], `switchGame/voteNext to ${g} are refused`);
        c.emit('leaveRoom');
        q.emit('leaveRoom');
      }
      const bad = client(url, 'Proto');
      const r = await bad.call('createRoom', { game: 'constructor', token: bad.token, profile: bad.profile });
      ok(r && r.ok, 'a prototype key as game id is rejected safely (falls back, no crash)');
      bad.emit('leaveRoom');
      const list = JSON.parse((await get(url + '/api/rooms')).body);
      ok(list.every((x) => !HIDDEN.includes(x.gameId)), 'public room list never shows a hidden game');
    }

    // ---------- 2. persistent party across several game switches ----------
    {
      const { code, cs } = await party(url, 'drawguess', ['Host', 'Bea', 'Cal', 'Dee', 'Eve'], { isPublic: false });
      const [host] = cs;
      const everyone = cs.map((c) => c.state.you).sort().join();
      const hostId = host.state.hostId;
      const route = [['tictactoe', 2], ['dotsboxes', 4], ['chess', 2], ['golf', 5], ['trivia', 5]];
      for (const [g, seats] of route) {
        host.emit('switchGame', { game: g });
        await until(() => cs.every((c) => c.state.gameId === g));
        const st = host.state;
        ok(cs.every((c) => c.state.code === code && c.state.gameId === g), `switch to ${g}: same room code for everyone`);
        ok([...ids(st), ...specIds(st)].sort().join() === everyone, `switch to ${g}: all 5 members stay in the room`);
        ok(st.hostId === hostId, `switch to ${g}: host role kept`);
        ok(st.players.length === seats && st.players.length <= st.maxPlayers, `switch to ${g}: ${seats} seated, within max ${st.maxPlayers}`);
        ok(st.autoStartIn === null && Object.keys(st.nextVotes).length === 0, `switch to ${g}: start countdown and votes cleared`);
        if (st.spectators.length) ok(st.queue.length === st.spectators.length, `switch to ${g}: bumped players are queued for a seat`);
      }
      // a reconnecting member keeps identity and seat
      const bea = cs[1];
      const beaId = bea.state.you;
      bea.s.disconnect();
      await until(() => host.state.players.concat(host.state.spectators).some((p) => p.id === beaId && !p.connected));
      const bea2 = client(url, 'Bea', bea.token);
      const rj = await bea2.join(code);
      await until(() => bea2.state);
      ok(rj.rejoined && bea2.state.you === beaId, 'reconnect within grace keeps the same member id');
      ok(host.state.players.concat(host.state.spectators).find((p) => p.id === beaId).connected, 'reconnected member shows as connected again');
      cs.forEach((c) => c.emit('leaveRoom'));
      bea2.emit('leaveRoom');
    }

    // ---------- 3. rematch, winner stays, spectator queue rotation ----------
    {
      const { cs } = await party(url, 'tictactoe', ['Ann', 'Ben', 'Cat', 'Dan']);
      const [ann] = cs;
      const cat = cs[2], dan = cs[3];
      ok(cat.state.role === 'spectator' && dan.state.role === 'spectator', 'two people beyond 2 seats spectate');
      dan.emit('queue', true);
      await until(() => ann.state.queue.length === 1);
      ok(ann.state.queue[0] === dan.state.you, 'spectator can join the queue');
      ann.emit('startGame');
      const { x, o } = await winTicTacToe(cs);
      const st = ann.state;
      ok(st.lastResult && st.lastResult.winnerId === x.state.you, 'game ends with a result');
      ok(ids(st).includes(x.state.you) && ids(st).includes(dan.state.you), 'winner stays and the QUEUED spectator (not the longest watcher) takes the seat');
      ok(specIds(st).includes(o.state.you) && st.queue.includes(o.state.you), 'loser spectates and joins the back of the queue');
      ok(st.players.length === 2, 'seat count still respects the 2-player max');
      // Play Again from results (host may now be a spectator: hosting is unchanged)
      ok(st.hostId === ann.state.you, 'host role survives the rotation');
      ann.emit('startGame');
      await until(() => ann.state.phase === 'game');
      ok(ann.state.phase === 'game' && ann.state.game, 'Play Again starts a rematch');
      // Spectators cannot move
      const spec = cs.find((c) => c.state.role === 'spectator');
      const before = JSON.stringify(ann.state.game.board);
      for (let cell = 0; cell < 9; cell++) spec.emit('action', { type: 'place', cell });
      await sleep(150);
      ok(JSON.stringify(ann.state.game.board) === before, 'a spectator cannot take a turn');
      spec.emit('startGame');
      spec.emit('endGame');
      await sleep(100);
      ok(ann.state.phase === 'game', 'a non-host cannot end or restart the game');
      ann.emit('endGame');
      await until(() => ann.state.phase === 'lobby');
      cs.forEach((c) => c.emit('leaveRoom'));
    }

    // ---------- 4. queue fills open seats in the lobby; back to lobby; votes ----------
    {
      const { cs } = await party(url, 'fourrow', ['Hal', 'Ivy', 'Jo', 'Kit']);
      const [hal, ivy, jo, kit] = cs;
      kit.emit('queue', true);
      await until(() => hal.state.queue.length === 1);
      ivy.emit('watch');
      await until(() => ids(hal.state).includes(kit.state.you));
      ok(ids(hal.state).includes(kit.state.you) && !ids(hal.state).includes(jo.state.you), 'an opened lobby seat goes to the queued spectator, not the idle one');
      ok(hal.state.queue.length === 0, 'seated spectator leaves the queue');
      jo.emit('queue', true);
      await until(() => hal.state.queue.length === 1);
      jo.emit('queue', false);
      await until(() => hal.state.queue.length === 0);
      ok(hal.state.queue.length === 0, 'spectator can leave the queue');
      kit.emit('queue', true);
      await sleep(80);
      ok(!hal.state.queue.includes(kit.state.you), 'a seated player cannot join the queue');

      // votes
      jo.emit('voteNext', 'chess');
      ivy.emit('voteNext', 'chess');
      kit.emit('voteNext', 'pool');
      await until(() => hal.state.nextVotes.chess === 2 && hal.state.nextVotes.pool === 1);
      ok(hal.state.nextVotes.chess === 2 && hal.state.nextVotes.pool === 1, 'next-game votes are tallied for everyone');
      ok(jo.state.myVote === 'chess', 'each member sees their own vote');
      kit.emit('voteNext', 'nonsense');
      kit.emit('voteNext', null);
      await until(() => !hal.state.nextVotes.pool);
      ok(!hal.state.nextVotes.pool && !hal.state.nextVotes.nonsense, 'votes can be withdrawn; unknown games are ignored');
      hal.emit('switchGame', { game: 'chess' });
      await until(() => hal.state.gameId === 'chess');
      ok(Object.keys(hal.state.nextVotes).length === 0, 'switching games clears the votes');

      // back to lobby after a result
      hal.emit('startGame');
      await until(() => hal.state.phase === 'game');
      hal.emit('endGame');
      await until(() => hal.state.phase === 'lobby');
      ok(hal.state.lastResult === null, 'host ending a game returns everyone to the lobby');
      cs.forEach((c) => c.emit('leaveRoom'));
    }
    {
      const { cs } = await party(url, 'tictactoe', ['Lea', 'Max']);
      cs[0].emit('startGame');
      await winTicTacToe(cs);
      cs[1].emit('backToLobby');
      await sleep(100);
      ok(cs[0].state.lastResult, 'only the host can dismiss results');
      cs[0].emit('backToLobby');
      await until(() => !cs[1].state.lastResult);
      ok(!cs[1].state.lastResult && cs[1].state.phase === 'lobby', 'Back to Lobby clears results for everyone');
      cs.forEach((c) => c.emit('leaveRoom'));
    }

    // ---------- 5. host disconnect, transfer, kick, ghost cleanup ----------
    {
      const { code, cs } = await party(url, 'dotsboxes', ['Ned', 'Oli', 'Pam'], { isPublic: false });
      const [ned, oli, pam] = cs;
      const nedId = ned.state.you;
      ned.s.disconnect();
      await until(() => oli.state.hostId !== nedId, 3000);
      ok(oli.state.hostId === oli.state.you, 'host who drops hands hosting to the next connected player');
      ok(ids(oli.state).includes(nedId), 'the dropped host keeps their seat during the grace period');
      const ned2 = client(url, 'Ned', ned.token);
      await ned2.join(code);
      await until(() => ned2.state);
      ok(ned2.state.you === nedId && ned2.state.hostId === oli.state.you, 'returning host rejoins as a member; new host stays');

      // transfer
      pam.emit('transferHost', pam.state.you);
      await sleep(100);
      ok(oli.state.hostId === oli.state.you, 'a non-host cannot take hosting');
      oli.emit('transferHost', pam.state.you);
      await until(() => oli.state.hostId === pam.state.you);
      ok(oli.state.hostId === pam.state.you, 'host can hand hosting to someone else');
      // moderation
      oli.emit('kick', ned2.state.you);
      await sleep(100);
      ok(ids(pam.state).includes(nedId), 'a non-host cannot kick');
      pam.emit('kick', nedId);
      await until(() => ned2.kicked);
      ok(ned2.kicked && !ids(pam.state).includes(nedId), 'host kick removes the member');
      const back = await ned2.join(code);
      ok(back && back.error === 'kicked', 'a kicked member cannot rejoin with the same identity');

      // ghost cleanup: a member who never comes back is removed after the grace period
      const oliId = oli.state.you;
      oli.s.disconnect();
      await until(() => !ids(pam.state).includes(oliId), 4000);
      ok(!ids(pam.state).includes(oliId), 'a disconnected member is cleaned up after the grace period');
      pam.emit('leaveRoom');
    }

    // ---------- 6. host leaving mid-game: hosting moves to a connected member ----------
    {
      const { cs } = await party(url, 'golf', ['Quin', 'Ray', 'Sue']);
      const [quin, ray, sue] = cs;
      quin.emit('startGame');
      await until(() => quin.state.phase === 'game');
      ray.s.disconnect();
      await sleep(50);
      quin.emit('leaveRoom');
      await until(() => sue.state.hostId === sue.state.you);
      ok(sue.state.hostId === sue.state.you, 'host leaving skips the offline member and picks a connected one');
      sue.emit('endGame');
      await until(() => sue.state.phase === 'lobby');
      ok(sue.state.phase === 'lobby', 'the new host can end the game (no stuck transition)');
      sue.emit('leaveRoom');
    }

    // ---------- 7. chat rate limit survives reconnecting ----------
    {
      const { code, cs } = await party(url, 'drawguess', ['Tia', 'Uma']);
      const [tia, uma] = cs;
      for (let i = 0; i < 12; i++) tia.emit('chat', 'spam ' + i);
      await sleep(150);
      const t2 = client(url, 'Tia', tia.token);
      await t2.join(code);
      for (let i = 12; i < 20; i++) t2.emit('chat', 'spam ' + i);
      await sleep(200);
      const got = uma.chats.filter((m) => m.kind === 'msg' && /^spam/.test(m.text)).length;
      ok(got <= 7, `chat flood is limited per member across reconnects (${got}/20 delivered)`);
      tia.emit('leaveRoom');
      t2.emit('leaveRoom');
      uma.emit('leaveRoom');
    }

    // ---------- 8. spectators never see a secret word ----------
    {
      const { cs } = await party(url, 'drawguess', ['Vic', 'Wes', 'Xan']);
      const [vic, wes, xan] = cs;
      vic.emit('hostUpdate', { maxPlayers: 2 });
      await sleep(80);
      xan.emit('watch');
      await until(() => xan.state.role === 'spectator');
      vic.emit('startGame');
      await until(() => vic.state.phase === 'game' && vic.state.game);
      const drawer = cs.find((c) => c.state.game && c.state.game.choices && c.state.game.choices.length);
      ok(!!drawer && drawer !== xan, 'a seated player (not the spectator) is choosing a word');
      drawer.emit('action', { type: 'choose', index: 0 });
      await until(() => drawer.state.game.word, 3000);
      const word = drawer.state.game.word;
      ok(!!word, 'drawer receives the word');
      ok(word && !JSON.stringify(xan.state).includes(`"${word}"`), 'spectator state never contains the secret word');
      const guesser = [vic, wes].find((c) => c.state.game && c.state.game.word !== word);
      ok(guesser && !JSON.stringify(guesser.state).includes(`"${word}"`), 'guesser state never contains the unrevealed word');
      cs.forEach((c) => c.emit('leaveRoom'));
    }

    // ---------- 9. idle host in the lobby hands over to an active member ----------
    {
      // A host who quietly watched a long game is not demoted the moment it ends.
      const { cs } = await party(B.url, 'tictactoe', ['Ava', 'Bo', 'Cy']);
      const [ava, bo, cy] = cs;
      ava.emit('watch');
      bo.emit('queue', true);
      cy.emit('queue', true);
      await until(() => ava.state.players.length === 2 && ava.state.role === 'spectator');
      ava.emit('startGame');
      await until(() => bo.state.phase === 'game');
      await sleep(1500); // longer than HOST_AFK_MS on this server
      await winTicTacToe([bo, cy]);
      await sleep(300);
      ok(bo.state.hostId === ava.state.you, 'a host who watched a long game keeps hosting when it ends');
      cs.forEach((c) => c.emit('leaveRoom'));
    }
    {
      const { cs } = await party(B.url, 'chess', ['Yan', 'Zed']);
      const [yan, zed] = cs;
      const end = Date.now() + 2500;
      while (Date.now() < end && zed.state.hostId !== zed.state.you) {
        zed.emit('chat', 'anyone there?');
        await sleep(300);
      }
      ok(zed.state.hostId === zed.state.you, 'an idle host hands hosting to an active member');
      ok(ids(zed.state).includes(yan.state.you), 'the idle host keeps their seat');
      cs.forEach((c) => c.emit('leaveRoom'));
    }
  } catch (err) {
    console.error(err);
    failures++;
  } finally {
    all.forEach((c) => c.s.close());
    A.srv.kill();
    B.srv.kill();
  }
  console.log(failures ? `\n${failures} FAILED` : '\nAll party tests passed');
  process.exit(failures ? 1 : 0);
})();
