// Multiplayer reliability suite (issue #48). Real server (server/index.js in a child process, see
// test/harness/preload.js) and real Socket.IO clients over WebSockets. This is server-level evidence:
// the authoritative server state plus every message each client actually received. Browser-level
// evidence (real Chromium pages) is in test/reliabilityui.js.
//
// Covered: parties of 2, 4 and 8 with invite codes; switching games in one persistent party; host
// leaving, dropping, idling, transfer and kicks; spectators and the seat queue; start, finish and
// rematch cycles; leave/rejoin, refresh, duplicate tabs, disconnect/reconnect inside and past the
// grace period; late joins; races (last seat, double start, spammed and out-of-turn moves); turn and
// phase timers; secret words, roles, answers and hands; room and socket cleanup; and a smoke pass of
// all 21 visible games. After each step the server state is checked for ghost members, duplicate or
// conflicting membership, stale socket ownership and leftover votes, and every client's view is
// compared with the server's.
//
// Reproducible and bounded: the server's Math.random is seeded (HARNESS_SEED, default 48) and its
// clock is moved forward instead of sleeping; every wait is event-driven with a time limit, and each
// scenario has a hard limit. A failing scenario writes node-server/test-artifacts/reliability/<name>.json
// (server log, server errors, authoritative snapshot, each client's last messages).
// Run: node test/reliability.js     SCENARIO=<name> runs one scenario; HARNESS_SEED=<n> changes the seed.
'use strict';
const H = require('./harness');
const { GAMES, HIDDEN } = require('../server/games');

const r = H.reporter('reliability');
const ONLY = process.env.SCENARIO || '';
const VISIBLE = Object.keys(GAMES).filter((g) => !HIDDEN.has(g));
const GRACE = 20000; // config.DISCONNECT_GRACE_MS default
const HOST_GRACE = 8000;
const HOST_AFK = 180000;
const ROOM_TTL = 120000;
const metrics = {};

let srv;
let CUR = '';
const live = [];
const ok = (c, m) => r.ok(c, `${CUR}: ${m}`);
const clean = (v, m) => r.clean(v, `${CUR}: ${m}`);
const NAMES = ['Ana', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal', 'Ivo', 'Jun', 'Kit', 'Lou'];
function client(name, opts) {
  const c = new H.Client(srv, name, opts);
  live.push(c);
  return c;
}
const byId = (cs, id) => cs.find((c) => c.id === id);
const everyone = (cs, pred, label, ms) => Promise.all(cs.map((c) => c.untilState(pred, `${label} [${c.name}]`, ms)));
const closeAll = (cs) => cs.forEach((c) => c.close());

// Server state is checked as is; client views get a few loop passes to receive the latest broadcast.
async function consistent(label, cs) {
  let v = [];
  for (let i = 0; i < 6; i++) {
    const snap = await srv.snapshot({ withGame: false });
    const sv = H.snapshotViolations(snap);
    v = [...sv];
    for (const room of snap.rooms) {
      const mine = cs.filter((c) => c.code === room.code);
      if (mine.length) v.push(...H.viewViolations(room, mine));
    }
    if (!v.length || sv.length) break;
    await srv.passes(1);
  }
  return clean(v, `${label}: server state and every client view agree`);
}

// A party of n: the first client creates it, the rest join with the invite code (lower case, as typed).
async function party(n, opts = {}, names = NAMES) {
  const host = client(names[0]);
  const res = await host.create({ game: null, ...opts });
  if (!res || !res.ok) throw new Error('createRoom failed: ' + JSON.stringify(res));
  const rest = names.slice(1, n).map((nm) => client(nm));
  const t0 = Date.now();
  const joins = await Promise.all(rest.map((c) => c.join(res.code.toLowerCase())));
  const joinMs = Date.now() - t0;
  if (joins.some((j) => !j || !j.ok)) throw new Error('a join failed: ' + JSON.stringify(joins));
  const cs = [host, ...rest];
  await everyone(cs, (s) => s.players.length + s.spectators.length === n, `${n} members`);
  return { code: res.code, host, cs, joins, joinMs };
}

async function switchTo(p, game) {
  p.host.emit('switchGame', { game });
  await everyone(p.cs, (s) => s.gameId === game, `switched to ${game}`);
}
async function start(p, game) {
  p.host.emit('startGame');
  await everyone(p.cs, (s) => s.phase === 'game' && s.gameId === game && s.game, `${game} started`);
}
const sysTexts = (c, re, since = 0) => c.chats(since).filter((m) => m.kind === 'sys' && re.test(m.text));
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentionRe = (word) => new RegExp(`(?<![a-z0-9])${escRe(word)}(?![a-z0-9])`, 'i');

// ---------------------------------------------------------------------------------------------
const SCENARIOS = [];
const def = (name, fn, limit) => SCENARIOS.push({ name, fn, limit });

// 1. Parties of 2, 4 and 8: joins, membership, switching games in one persistent party, cleanup.
def('party-sizes', async () => {
  for (const n of [2, 4, 8]) {
    const p = await party(n);
    metrics[`join_${n}_ms`] = p.joinMs;
    ok(p.joins.every((j) => j.role === 'player'), `${n} players: everyone gets a seat in a no-game party`);
    ok(new Set(p.cs.map((c) => c.id)).size === n, `${n} players: every client has its own member id`);
    await consistent(`${n} players joined`, p.cs);

    // Fan-out: one chat line reaches everyone once.
    const t0 = H.mark();
    const w0 = Date.now();
    p.cs[1].emit('chat', `hello from ${n}`);
    await Promise.all(p.cs.map((c) => c.until((x) => x.chats(t0).some((m) => m.text === `hello from ${n}`), 'chat fan-out')));
    metrics[`chat_fanout_${n}_ms`] = Date.now() - w0;
    ok(p.cs.every((c) => c.chats(t0).filter((m) => m.text === `hello from ${n}`).length === 1), `${n} players: a chat line arrives exactly once at every client`);

    // One party, many games: the code and the members stay; seats follow each game's size.
    for (const g of ['fourrow', 'drawguess', 'ludo', 'impostor', 'chess']) {
      const cap = Math.min(n, GAMES[g].meta.maxPlayers);
      await switchTo(p, g);
      const room = await srv.room(p.code);
      ok(room.code === p.code && room.members.length === n, `${n} players → ${g}: same party code and all ${n} members kept`);
      ok(room.seats.length === cap && room.specs.length === n - cap, `${n} players → ${g}: ${cap} seated, ${n - cap} watching`);
      if (n > cap) ok(room.queue.length === n - cap, `${n} players → ${g}: everyone bumped is first in line for a seat`);
      await consistent(`${n} players → ${g}`, p.cs);
    }

    // Fan-out of an authoritative state change to every client.
    await switchTo(p, 'drawguess');
    const t1 = H.mark();
    const w1 = Date.now();
    p.host.emit('hostUpdate', { settings: { rounds: 2 } });
    await everyone(p.cs, (s) => s.settings && s.settings.rounds === 2, 'settings fan-out');
    metrics[`state_fanout_${n}_ms`] = Date.now() - w1;
    await srv.passes(2);
    const perClient = p.cs.map((c) => c.received('state', t1).length);
    ok(perClient.every((k) => k === 1), `${n} players: one host change sends exactly one state update per client (${perClient})`);

    // Everyone leaves: the party closes after its expiry and the code stops working.
    for (const c of p.cs) c.leave();
    await srv.passes(1);
    const empty = await srv.room(p.code);
    ok(empty && empty.members.length === 0, `${n} players: leaving empties the party`);
    await srv.advance(ROOM_TTL + 1000);
    ok(!(await srv.room(p.code)), `${n} players: the empty party is deleted after its expiry`);
    const late = client('Late');
    const jr = await late.join(p.code);
    ok(jr && jr.error === 'closed', `${n} players: the old invite code now reports closed (${JSON.stringify(jr)})`);
    closeAll([...p.cs, late]);
  }
});

// 2. Four in a Row: repeated start → finish → rematch cycles with winner-stays and the queue.
def('fourrow-rematch-cycles', async () => {
  const p = await party(4);
  await switchTo(p, 'fourrow');
  let room = await srv.room(p.code);
  const firstQueue = room.queue.slice();
  for (let cycle = 1; cycle <= 3; cycle++) {
    room = await srv.room(p.code);
    const seatsBefore = room.seats.slice();
    const queueBefore = room.queue.slice();
    const t0 = H.mark();
    await start(p, 'fourrow');
    const g = p.host.g;
    const first = byId(p.cs, g.players[0].id);
    const second = byId(p.cs, g.players[1].id);
    ok(first && second && seatsBefore.includes(first.id) && seatsBefore.includes(second.id), `cycle ${cycle}: the two seated members play`);
    // Spectators can't move, and the second player can't move out of turn.
    const watcher = p.cs.find((c) => c.state.role === 'spectator');
    watcher.action({ type: 'drop', col: 5 });
    second.action({ type: 'drop', col: 5 });
    for (let i = 0; i < 7; i++) {
      const mover = i % 2 ? second : first;
      mover.action({ type: 'drop', col: i % 2 ? 1 : 0 });
      if (i < 6) await everyone(p.cs, (s) => s.game && s.game.moves === i + 1, `move ${i + 1}`);
    }
    await everyone(p.cs, (s) => s.phase === 'lobby' && s.lastResult && s.lastResult.type === 'fourrow', `cycle ${cycle} result`);
    const res = p.host.state.lastResult;
    ok(res.winnerId === first.id && !res.draw, `cycle ${cycle}: the scripted vertical line wins`);
    ok(p.cs.every((c) => sysTexts(c, /wins!$/, t0).length === 1), `cycle ${cycle}: the win is announced exactly once to each client`);
    room = await srv.room(p.code);
    ok(room.gameCount === cycle, `cycle ${cycle}: exactly one game was started (gameCount ${room.gameCount})`);
    ok(room.seats.includes(first.id) && !room.seats.includes(second.id), `cycle ${cycle}: winner stays, loser leaves the seat`);
    ok(room.seats.includes(queueBefore[0]) && room.queue[room.queue.length - 1] === second.id, `cycle ${cycle}: the first in line takes the seat and the loser joins the back of the line`);
    ok(room.members.find((m) => m.id === first.id).score === p.host.state.players.concat(p.host.state.spectators).find((x) => x.id === first.id).score, `cycle ${cycle}: the winner's score matches the server`);
    await consistent(`cycle ${cycle}`, p.cs);
  }
  ok(firstQueue.length === 2, 'the two bumped members were queued when the party switched to a 2-seat game');
  closeAll(p.cs);
});

// 3. Draw & Guess: secrecy of the word for guessers, spectators and late joiners; hidden chat;
//    turn order; the whole game to the podium.
def('drawguess-secrets', async () => {
  const p = await party(4, { game: 'drawguess', settings: { rounds: 1, hints: false, drawTime: 60 } });
  const spec = client('Kit');
  await spec.join(p.code);
  spec.emit('watch');
  await everyone([...p.cs, spec], (s) => s.spectators.length === 1, 'spectator watching');
  const cs = [...p.cs, spec];
  await start(p, 'drawguess');
  let lastTurn = 0;
  const turns = [];
  let late = null;
  for (let guard = 0; guard < 12; guard++) {
    const st = await p.host.untilState((s) => s.phase === 'lobby' || (s.game && s.game.phase === 'choose' && s.game.turnId > lastTurn), 'next turn', 8000);
    if (st.phase === 'lobby') break;
    const g = st.game;
    lastTurn = g.turnId;
    const all = late ? [...cs, late] : cs;
    const drawer = byId(all, g.drawerId);
    await drawer.untilState((s) => s.game && s.game.turnId === g.turnId && s.game.choices, 'drawer gets choices');
    ok(all.filter((c) => c !== drawer).every((c) => !c.g || c.g.choices === null), `turn ${g.turnId}: only the drawer is sent the word choices`);
    drawer.action({ type: 'choose', index: 0 });
    await everyone(all, (s) => s.game && s.game.turnId === g.turnId && s.game.phase === 'draw', `turn ${g.turnId} drawing`);
    const room = await srv.room(p.code);
    const word = room.game.word;
    ok(drawer.g.word === word, `turn ${g.turnId}: the drawer sees the word`);
    ok(all.filter((c) => c !== drawer).every((c) => c.g.word === null), `turn ${g.turnId}: guessers and spectators are not sent the word`);
    const td = H.mark();
    drawer.emit('draw', { op: 'begin', color: '#112233', size: 6, x: 10, y: 10 });
    drawer.emit('draw', { op: 'pts', pts: [20, 20, 40, 40] });
    drawer.emit('draw', { op: 'end' });
    const guessers = all.filter((c) => c !== drawer && c.state.role === 'player');
    await Promise.all(all.filter((c) => c !== drawer).map((c) => c.until((x) => x.received('draw', td).length === 3, 'strokes relayed')));

    if (turns.length === 0) {
      // A late joiner mid-turn gets a seat (Draw & Guess allows it), the canvas so far, and no word.
      late = client('Lou');
      const jr = await late.join(p.code);
      ok(jr.ok && jr.role === 'player', 'a late joiner mid-turn gets a seat');
      await late.until((c) => c.received('canvas').some((x) => x.turnId === g.turnId && x.history.length >= 1), 'late joiner canvas');
      ok(true, 'the late joiner is sent the canvas drawn so far');
      await late.untilState((s) => s.game && s.game.phase === 'draw', 'late joiner view');
      ok(late.g.word === null && late.g.choices === null, 'the late joiner is not sent the word');
      guessers.push(late);
    }

    // First guess, then the hidden channels.
    const [g1, ...others] = guessers;
    const tg = H.mark();
    g1.emit('chat', word.toUpperCase());
    await g1.untilState((s) => s.game && s.game.guessed.includes(g1.id), 'first guess counted');
    ok(g1.g.word === word, `turn ${g.turnId}: a player who guessed is sent the word`);
    ok(g1.chats(tg).some((m) => m.kind === 'sys' && m.text.startsWith('You guessed it')), `turn ${g.turnId}: the guesser gets a private confirmation`);
    if (turns.length === 0) {
      const t1 = H.mark();
      g1.emit('chat', 'psst it rhymes');
      spec.emit('chat', 'spectator says hi');
      await drawer.until((c) => c.chats(t1).some((m) => m.text === 'psst it rhymes') && c.chats(t1).some((m) => m.text === 'spectator says hi'), 'drawer sees hidden chat');
      await srv.passes(1);
      ok(others.every((c) => !c.chats(t1).some((m) => m.text === 'psst it rhymes')), 'what a guessed player says never reaches players still guessing');
      ok(!spec.chats(t1).some((m) => m.text === 'psst it rhymes'), 'what a guessed player says never reaches spectators');
      ok(others.every((c) => !c.chats(t1).some((m) => m.text === 'spectator says hi')), 'spectator chat never reaches players still guessing');
    }
    for (const c of others) {
      await srv.advance(1100, 1); // chat is limited to one line a second per member
      c.emit('chat', word);
    }
    await everyone(all, (s) => s.game && s.game.turnId === g.turnId && s.game.phase === 'reveal', `turn ${g.turnId} reveal`);
    ok(all.every((c) => c.g.word === word), `turn ${g.turnId}: the reveal shows everyone the word`);
    turns.push({ turnId: g.turnId, drawerId: g.drawerId, word });
    await srv.advance(6500, 1);
  }
  await everyone(cs, (s) => s.phase === 'lobby' && s.lastResult && s.lastResult.type === 'drawguess', 'podium');
  const res = p.host.state.lastResult;
  ok(turns.length === 5, `every seated player drew once, including the late joiner (${turns.length} turns)`);
  ok(new Set(turns.map((t) => t.drawerId)).size === turns.length, 'no player drew twice in the round (no duplicate turns)');
  ok(turns.every((t, i) => t.turnId === i + 1), 'turn ids advance by exactly one');
  ok(res.standings.length === 5 && res.standings.every((s) => s.score > 0), 'the podium lists all five players with points');

  // Word leaks, checked over everything each client was sent: a guesser's first sight of the word
  // must be their own "You guessed it" or the reveal; a spectator's must be the reveal.
  const legit = (e) =>
    (e.ev === 'chat' && e.data && e.data.kind === 'sys' && (/^You guessed it/.test(e.data.text) || /^The word was/.test(e.data.text))) ||
    (e.ev === 'state' && e.data.game && (e.data.game.phase === 'reveal' || e.data.game.guessed.includes(e.data.you)));
  const leaks = [];
  for (const t of turns) {
    const re = mentionRe(t.word);
    for (const c of [...cs, late]) {
      if (c.id === t.drawerId) continue;
      const startIdx = c.events.findIndex((e) => e.ev === 'state' && e.data.game && e.data.game.turnId === t.turnId);
      if (startIdx < 0) continue;
      const first = c.events.slice(startIdx).find((e) => re.test(JSON.stringify(e.data) || ''));
      if (first && !legit(first)) leaks.push(`${c.name} saw "${t.word}" in ${first.ev} ${JSON.stringify(first.data).slice(0, 120)}`);
    }
  }
  clean(leaks, 'no guesser or spectator was ever sent a word before guessing it or the reveal');
  await consistent('after the podium', [...cs, late]);
  closeAll([...cs, late]);
}, 90000);

// 4. The Impostor and Bluff Battle: roles, the secret word and the real answer stay hidden.
def('impostor-bluff-secrets', async () => {
  const p = await party(4, { game: 'impostor', settings: { rounds: 1, clueRounds: 1, clueTime: 20, discussTime: 30 } });
  const spec = client('Kit');
  await spec.join(p.code);
  spec.emit('watch');
  const cs = [...p.cs, spec];
  await everyone(cs, (s) => s.spectators.length === 1, 'spectator watching');
  await start(p, 'impostor');
  let room = await srv.room(p.code);
  const word = room.game.word;
  const impId = room.game.impostorId;
  const imp = byId(p.cs, impId);
  await everyone(cs, (s) => s.game && s.game.phase === 'clue', 'clue phase');
  ok(p.cs.filter((c) => c !== imp).every((c) => c.g.role === 'crew' && c.g.word === word), 'every crew member is sent the word and the crew role');
  ok(imp.g.role === 'impostor' && imp.g.word === null, 'the impostor is sent their role and no word');
  ok(spec.g.role === null && spec.g.word === null, 'the spectator is sent neither a role nor the word');
  // Nothing before the result names the impostor to anyone else: no impostor role, no impostorId.
  const named = cs
    .filter((c) => c !== imp)
    .filter((c) => c.events.some((e) => e.ev === 'state' && e.data.game && e.data.game.phase !== 'result' && (e.data.game.role === 'impostor' || 'impostorId' in e.data.game || JSON.stringify(e.data).includes('"impostorId"'))));
  ok(!named.length, `nobody else is told who the impostor is (${named.map((c) => c.name)})`);
  for (let i = 0; i < 4; i++) {
    const turnId = p.host.g.turnId;
    const who = byId(p.cs, turnId);
    who.action({ type: 'clue', text: `clue number ${i}` });
    await p.host.untilState((s) => s.game && (s.game.phase !== 'clue' || s.game.turnId !== turnId), 'next clue');
  }
  await everyone(cs, (s) => s.game && s.game.phase === 'discuss', 'discussion');
  p.cs.forEach((c) => c.action({ type: 'ready' }));
  await everyone(cs, (s) => s.game && s.game.phase === 'vote', 'vote');
  const scapegoat = p.cs.find((c) => c !== imp);
  p.cs.forEach((c) => c.action({ type: 'vote', target: c === imp ? scapegoat.id : impId }));
  await everyone(cs, (s) => s.game && s.game.phase === 'guess', 'impostor caught: guess phase');
  ok(imp.g.word === null && spec.g.word === null, 'the caught impostor still is not sent the word');
  imp.action({ type: 'guess', text: 'definitely wrong' });
  await everyone(cs, (s) => s.game && s.game.phase === 'result', 'result');
  ok(cs.every((c) => c.g.result && c.g.result.word === word && c.g.result.impostorId === impId), 'the result tells everyone the word and the impostor');
  const early = cs
    .filter((c) => c !== imp)
    .filter((c) => c.events.some((e) => e.ev === 'state' && e.data.game && e.data.game.phase !== 'result' && JSON.stringify(e.data).includes('"impostorId"')));
  ok(!early.length, `before the result no view carried the impostor's id (${early.map((c) => c.name)})`);
  const legit = (e) => e.ev === 'state' && e.data.game && e.data.game.phase === 'result';
  for (const c of [imp, spec]) {
    const first = c.events.find((e) => mentionRe(word).test(JSON.stringify(e.data) || ''));
    ok(!first || legit(first), `${c === imp ? 'the impostor' : 'the spectator'} first sees the word at the result`);
  }
  await srv.advance(9500, 1);
  await everyone(cs, (s) => s.phase === 'lobby' && s.lastResult && s.lastResult.type === 'impostor', 'impostor finished');
  await consistent('impostor finished', cs);

  // Bluff Battle: options carry no author and no "real" flag until the reveal.
  await switchTo({ host: p.host, cs }, 'bluff');
  ok(spec.state.role === 'player', 'switching games gives every spectator a seat when the new game has room (by design)');
  spec.emit('watch');
  await everyone(cs, (s) => s.spectators.length === 1, 'spectator watching again');
  await start({ host: p.host, cs }, 'bluff');
  room = await srv.room(p.code);
  const seated = p.cs.filter((c) => room.seats.includes(c.id));
  seated.forEach((c, i) => c.action({ type: 'bluff', text: `made up answer ${i}` }));
  await everyone(cs, (s) => s.game && s.game.phase === 'vote', 'bluff vote');
  const shape = cs.every((c) => c.g.options.every((o) => Object.keys(o).sort().join() === 'i,mine,text'));
  ok(shape, 'vote options carry only their text (no author, no real-answer flag)');
  ok(spec.g.options.every((o) => o.mine === false) && seated.every((c) => c.g.options.filter((o) => o.mine).length === 1), 'each player is told only which option is their own');
  seated.forEach((c) => c.action({ type: 'vote', option: c.g.options.find((o) => !o.mine).i }));
  await everyone(cs, (s) => s.game && s.game.phase === 'reveal', 'bluff reveal');
  ok(cs.every((c) => c.g.reveal && c.g.reveal.answer === room.game.q.a), 'the reveal gives everyone the real answer');
  p.host.emit('endGame');
  await everyone(cs, (s) => s.phase === 'lobby', 'host ended bluff');
  await consistent('bluff ended by the host', cs);
  closeAll(cs);
}, 60000);

// 5. Color Stack to the end: every hand stays private, one turn at a time, one finish.
def('colorstack-full-game', async () => {
  const p = await party(3, { game: 'colorstack' });
  const spec = client('Kit');
  await spec.join(p.code);
  spec.emit('watch');
  const cs = [...p.cs, spec];
  await everyone(cs, (s) => s.spectators.length === 1, 'spectator watching');
  const t0 = H.mark();
  await start(p, 'colorstack');
  let actions = 0;
  let privacyChecks = 0;
  const privacy = [];
  for (; actions < 600; ) {
    const room = await srv.room(p.code);
    if (room.phase !== 'game') break;
    const hands = new Map(room.game.players.map((x) => [x.id, x.hand.map((c) => c.id).sort().join()]));
    // Every client's last view: own hand only; counts for the others; spectator has none.
    await everyone(cs, (s) => s.game && s.game.turnId === room.game.players[room.game.turn].id, 'views up to date', 4000);
    for (const c of cs) {
      const h = c.g.hand;
      if (c === spec) {
        if (h !== null) privacy.push('spectator was sent a hand');
      } else if (!h || h.map((x) => x.id).sort().join() !== hands.get(c.id)) privacy.push(`${c.name}'s hand differs from the server`);
      if (c.g.players.some((x) => 'hand' in x)) privacy.push(`${c.name} was sent another player's hand`);
    }
    privacyChecks++;
    const turnId = room.game.players[room.game.turn].id;
    const mover = byId(p.cs, turnId);
    const g = mover.g;
    const before = mover.counts.state || 0;
    if (g.playable.length) {
      const card = g.hand.find((x) => x.id === g.playable[0]);
      mover.action({ type: 'play', card: card.id, color: card.c === 'w' ? 'r' : undefined });
    } else if (g.drawn === null) mover.action({ type: 'draw' });
    else mover.action({ type: 'pass' });
    actions++;
    await mover.until((c) => (c.counts.state || 0) > before, 'move applied');
    if (actions % 8 === 0) await srv.advance(1000, 1); // keep each socket under its action rate limit
  }
  await everyone(cs, (s) => s.phase === 'lobby' && s.lastResult && s.lastResult.type === 'colorstack', 'colorstack finished', 6000);
  clean(privacy, `hands stayed private across ${privacyChecks} turns`);
  ok(actions < 600, `the game finished in ${actions} moves`);
  ok(cs.every((c) => sysTexts(c, /wins/, t0).length <= 1), 'the winner is announced at most once per client');
  metrics.colorstack_moves = actions;
  await consistent('colorstack finished', cs);
  closeAll(cs);
}, 90000);

// 6. Chess: disconnect/reconnect on your own turn, refresh, a duplicate tab, then mate and rotation.
def('chess-reconnect-identity', async () => {
  const p = await party(2, { game: 'chess', settings: { clock: 10 } });
  const spec = client('Kit');
  await spec.join(p.code);
  const cs = [...p.cs, spec];
  await everyone(cs, (s) => s.spectators.length === 1, 'spectator');
  await start(p, 'chess');
  const white = byId(p.cs, p.host.g.players[0].id);
  const black = byId(p.cs, p.host.g.players[1].id);
  white.action({ type: 'move', from: 13, to: 21 }); // f3
  await everyone(cs, (s) => s.game && s.game.turn === 1, 'black to move');
  const blackId = black.id;
  black.drop();
  await white.untilState((s) => s.players.some((x) => x.id === blackId && !x.connected), 'black shown offline');
  await consistent('black dropped on their turn', [white, spec]);
  await srv.advance(HOST_GRACE + 2000);
  const back = await black.reconnect();
  ok(back && back.rejoined && black.state.you === blackId, 'reconnecting inside the grace period rejoins as the same member');
  ok(black.g && black.g.turn === 1 && black.g.myIndex === 1, 'the reconnected player is still black and still on move');
  await white.untilState((s) => s.players.some((x) => x.id === blackId && x.connected), 'black shown online');
  black.action({ type: 'move', from: 52, to: 36 }); // e5
  await everyone(cs, (s) => s.game && s.game.turn === 0 && s.game.moves.length === 2, 'white to move');
  // A reload: new socket, same tab token, Join again.
  const whiteId = white.id;
  const jr = await white.refresh();
  ok(jr && jr.ok && jr.rejoined, 'a refresh (new socket, same tab token) rejoins');
  ok(white.id === whiteId && white.g && white.g.myIndex === 0, 'a refresh keeps the same member and colour');
  // A duplicate tab with the same token takes over; the old tab is told and goes quiet.
  const tab2 = client('Ben-tab2', { token: black.token });
  tab2.code = p.code;
  const jr2 = await tab2.join(p.code);
  await black.until((c) => c.flags.replaced === 1, 'old tab told it was replaced');
  ok(jr2.ok && jr2.rejoined && tab2.state && tab2.state.you === blackId, 'a duplicate tab takes over the same member');
  black.action({ type: 'move', from: 59, to: 31 }); // the old tab can no longer move
  await srv.passes(2);
  ok((await srv.room(p.code)).game.moves.length === 2, 'the replaced tab cannot move any more');
  await consistent('after refresh and duplicate tab', [white, tab2, spec]);
  white.action({ type: 'move', from: 14, to: 30 }); // g4
  await tab2.untilState((s) => s.game && s.game.turn === 1, 'black again');
  tab2.action({ type: 'move', from: 59, to: 31 }); // Qh4#
  await everyone([white, tab2, spec], (s) => s.phase === 'lobby' && s.lastResult && s.lastResult.type === 'chess', 'mate');
  const res = white.state.lastResult;
  ok(res.winnerId === blackId && res.reason === 'checkmate', 'fool\'s mate ends the game for black');
  const room = await srv.room(p.code);
  ok(room.seats.includes(blackId) && room.seats.includes(spec.id) && room.specs.includes(whiteId), 'winner stays; the spectator takes the loser\'s seat');
  await consistent('after mate', [white, tab2, spec]);
  closeAll([...cs, tab2]);
});

// 7. Host leaving, dropping, idling, transfer, kick and vote kick.
def('host-migration', async () => {
  const p = await party(4);
  // Seats follow arrival order (joins race), so take the order from the server.
  const [a, b, c, d] = (await srv.room(p.code)).seats.map((id) => byId(p.cs, id));
  ok(a === p.host, 'the creator holds the first seat and hosts');
  a.leave();
  await everyone([b, c, d], (s) => s.hostId === b.id && s.players.length === 3, 'host passed to the next seated member');
  ok(true, 'a host who leaves hands hosting to the next connected member');
  await consistent('host left', [b, c, d]);
  const bId = b.id;
  b.drop();
  await c.untilState((s) => s.players.some((x) => x.id === bId && !x.connected), 'host offline');
  await srv.advance(HOST_GRACE + 1000);
  await everyone([c, d], (s) => s.hostId === c.id, 'host passed after the host grace period');
  ok(sysTexts(c, /now the host \(.* disconnected\)/).length === 1, 'the hand-over is announced once');
  const bBack = await b.reconnect();
  ok(bBack && bBack.rejoined && b.state.you === bId && b.state.hostId === c.id && b.state.role === 'player', 'the old host returns as a normal member with their seat');
  // Transfers: never to someone offline; to a spectator is fine.
  const dId = d.id;
  d.drop();
  await c.untilState((s) => s.players.some((x) => x.id === dId && !x.connected), 'd offline');
  c.emit('transferHost', dId);
  await srv.passes(2);
  ok((await srv.room(p.code)).hostId === c.id, 'hosting cannot be transferred to an offline member');
  await d.reconnect();
  d.emit('watch');
  await c.untilState((s) => s.spectators.some((x) => x.id === dId), 'd watching');
  await srv.advance(2500, 1); // the transfer above used the host's lobby-action allowance
  c.emit('transferHost', dId);
  await everyone([b, c, d], (s) => s.hostId === dId, 'transfer to a spectator');
  ok(true, 'hosting can be transferred to a connected spectator');
  // An idle host in the lobby hands over to someone active.
  await srv.advance(HOST_AFK - 10000, 1);
  b.emit('setReady', true);
  await d.untilState((s) => s.players.some((x) => x.id === bId && x.ready), 'b active');
  await srv.advance(11000);
  await everyone([b, c, d], (s) => s.hostId === bId, 'idle host replaced by an active member');
  ok(sysTexts(b, /is away\)/).length === 1, 'an idle host hands over to an active member, once');
  // Kick: banned token can't come back.
  b.emit('kick', c.id);
  await c.until((x) => x.flags.kicked === 1, 'kicked');
  const back = await c.join(p.code);
  ok(back.error === 'kicked', 'a kicked member cannot rejoin with the same tab');
  await consistent('after kick', [b, d]);
  closeAll(p.cs);

  // Vote kick in a public party (needs a majority of the other connected members).
  const q = await party(4, { isPublic: true });
  const [h, x, y, z] = q.cs;
  x.emit('voteKick', z.id);
  await h.until((cl) => sysTexts(cl, /voted to kick/).length === 1, 'first vote');
  ok((await srv.room(q.code)).members.length === 4, 'one vote is not a majority');
  y.emit('voteKick', z.id);
  await z.until((cl) => cl.flags.kicked === 1, 'vote kick');
  const qr = await srv.room(q.code);
  ok(qr.members.length === 3 && Object.keys(qr.votes).length === 0, 'two of three votes remove the member and clear their votes');
  await consistent('after vote kick', [h, x, y]);
  // Host leaves during a game: the next seated member hosts and can still end it.
  await switchTo({ host: h, cs: [h, x, y] }, 'ludo');
  h.emit('startGame');
  await everyone([h, x, y], (s) => s.phase === 'game', 'ludo started');
  const [, next, third] = (await srv.room(q.code)).seats.map((id) => byId(q.cs, id));
  h.leave();
  await everyone([next, third], (s) => s.hostId === next.id, 'host passed mid-game');
  next.emit('endGame');
  await everyone([next, third], (s) => s.phase === 'lobby', 'new host ended the game');
  ok(true, 'after the host leaves mid-game the new host can end the game');
  await consistent('host left mid-game', [x, y]);
  closeAll(q.cs);
});

// 8. Spectators and the seat queue.
def('spectator-queue', async () => {
  const p = await party(5, { game: 'fourrow' });
  const room0 = await srv.room(p.code);
  ok(room0.seats.length === 2 && room0.specs.length === 3, 'a 2-seat game seats two and lets the rest watch');
  const specs = p.cs.filter((c) => c.state.role === 'spectator');
  const [s1, s2, s3] = specs;
  for (const s of specs) s.emit('queue', true);
  await everyone(p.cs, (s) => s.queue.length === 3, 'three in line');
  ok(p.host.state.queue.join() === specs.map((s) => s.id).join(), 'the line keeps the order people joined it');
  s1.emit('takeSeat');
  await s1.until((c) => c.received('notice').some((n) => /No seat is open/.test(n)), 'seat refused');
  ok(true, 'taking a seat when none is open is refused with a notice');
  s1.action({ type: 'drop', col: 0 });
  // s1 goes offline; when a seat opens the next connected spectator in line gets it.
  const s1Id = s1.id;
  s1.drop();
  await p.host.untilState((s) => s.spectators.some((x) => x.id === s1Id && !x.connected), 's1 offline');
  const seated = p.cs.filter((c) => c.state.role === 'player');
  const leaver = seated.find((c) => c !== p.host) || seated[0];
  leaver.emit('watch');
  await p.host.untilState((s) => s.players.some((x) => x.id === s2.id), 'seat filled from the line');
  ok(!p.host.state.players.some((x) => x.id === s1Id), 'an offline spectator in line is skipped');
  await s2.until((c) => c.received('notice').some((n) => /seat opened up/.test(n)), 'seat notice');
  ok(true, 'the spectator who gets the seat is told');
  await consistent('seat filled from the line', p.cs.filter((c) => c !== s1));
  // Winner stays: when the loser is benched, the next *connected* spectator in line plays.
  await s1.reconnect();
  let room = await srv.room(p.code);
  const players = room.seats.map((id) => byId(p.cs, id));
  s1.drop();
  await p.host.untilState((s) => s.spectators.some((x) => x.id === s1Id && !x.connected), 's1 offline again');
  room = await srv.room(p.code);
  const lineBefore = room.queue.slice();
  p.host.emit('startGame');
  await everyone(players, (s) => s.phase === 'game', 'fourrow started');
  const g = players[0].g;
  const first = byId(players, g.players[0].id);
  const second = byId(players, g.players[1].id);
  for (let i = 0; i < 7; i++) {
    (i % 2 ? second : first).action({ type: 'drop', col: i % 2 ? 1 : 0 });
    if (i < 6) await first.untilState((s) => s.game && s.game.moves === i + 1, 'move');
  }
  await first.untilState((s) => s.phase === 'lobby' && s.lastResult, 'result');
  room = await srv.room(p.code);
  const nextUp = room.seats.find((id) => id !== first.id);
  const expected = lineBefore.map((id) => room.members.find((m) => m.id === id)).find((m) => m && m.connected);
  ok(nextUp === (expected && expected.id), `winner stays seats the first connected spectator in line (got ${room.members.find((m) => m.id === nextUp).name}, line was ${lineBefore.map((id) => room.members.find((m) => m.id === id).name + (room.members.find((m) => m.id === id).connected ? '' : '(offline)'))})`);
  await consistent('after winner-stays rotation', p.cs.filter((c) => c !== s1));
  closeAll(p.cs);

  // When every spectator has dropped, nobody is rotated in and the loser keeps the seat.
  const q = await party(3, { game: 'fourrow' });
  const qr = await srv.room(q.code);
  const watcher = byId(q.cs, qr.specs[0]);
  const wId = watcher.id;
  watcher.drop();
  await q.host.untilState((s) => s.spectators.some((x) => x.id === wId && !x.connected), 'only spectator offline');
  const duo = q.cs.filter((c) => c !== watcher);
  q.host.emit('startGame');
  await everyone(duo, (s) => s.phase === 'game', 'started');
  const qg = duo[0].g;
  const w = byId(duo, qg.players[0].id);
  const l = byId(duo, qg.players[1].id);
  for (let i = 0; i < 7; i++) {
    (i % 2 ? l : w).action({ type: 'drop', col: i % 2 ? 1 : 0 });
    if (i < 6) await w.untilState((s) => s.game && s.game.moves === i + 1, 'move');
  }
  await everyone(duo, (s) => s.phase === 'lobby' && s.lastResult, 'result');
  const after = await srv.room(q.code);
  ok(after.seats.includes(l.id) && after.specs.includes(wId) && !w.state.lastResult.nextUp, 'with only an offline spectator, the loser keeps the seat and nobody is announced as next');
  await consistent('no rotation to an offline spectator', duo);
  closeAll(q.cs);
});

// 9. Many leave / rejoin / reconnect / refresh cycles: no growth in members, sockets or listeners.
def('rejoin-cycles', async () => {
  const p = await party(3, { game: 'drawguess' });
  const [a, b, c] = p.cs;
  const before = await srv.snapshot({ withGame: false });
  const baseSockets = before.sockets.length;
  const cId = c.id;
  for (let i = 0; i < 15; i++) {
    const mode = i % 3;
    if (mode === 0) {
      c.leave();
      await a.untilState((s) => s.players.length === 2, `cycle ${i}: left`);
      await srv.advance(2100, 1); // join requests are limited to one each two seconds per socket
      const jr = await c.join(p.code);
      if (!jr.ok) throw new Error(`cycle ${i}: rejoin failed ${JSON.stringify(jr)}`);
      await a.untilState((s) => s.players.length === 3, `cycle ${i}: back`);
    } else if (mode === 1) {
      const id = c.id;
      c.drop();
      await a.untilState((s) => s.players.some((x) => x.id === id && !x.connected), `cycle ${i}: offline`);
      const rj = await c.reconnect();
      if (!rj || !rj.rejoined) throw new Error(`cycle ${i}: reconnect did not rejoin ${JSON.stringify(rj)}`);
      await a.untilState((s) => s.players.some((x) => x.id === id && x.connected), `cycle ${i}: online`);
    } else {
      const id = c.id;
      const rf = await c.refresh();
      if (!rf || !rf.rejoined || c.id !== id) throw new Error(`cycle ${i}: refresh did not rejoin as the same member`);
    }
  }
  const after = await srv.snapshot({ withGame: false });
  const room = after.rooms.find((x) => x.code === p.code);
  ok(room.members.length === 3 && room.seats.length === 3, `15 cycles later the party still has exactly 3 members (${room.members.length})`);
  ok(c.id !== cId, 'leaving and joining again creates a fresh member, as designed');
  ok(after.sockets.length === baseSockets, `no server sockets were left behind (${baseSockets} → ${after.sockets.length})`);
  const listeners = new Set(after.sockets.map((s) => s.listeners));
  ok(listeners.size === 1, `every server socket has the same number of listeners (${[...listeners]})`);
  ok(room.chatLog <= 60, `the chat history stays bounded (${room.chatLog})`);
  ok(a.flags.replaced === 0 && b.flags.replaced === 0, 'nobody else was replaced or disturbed');
  await consistent('after 15 cycles', p.cs);
  closeAll(p.cs);
});

// 10. Late joins, and host actions that must wait for the lobby.
def('late-join-and-guards', async () => {
  const p = await party(2, { game: 'checkers' });
  await start(p, 'checkers');
  const late = client('Lou');
  const jr = await late.join(p.code);
  ok(jr.ok && jr.role === 'spectator' && /spectating/.test(jr.notice || ''), `joining a running 2-player game makes you a spectator, with a notice (${jr.notice})`);
  late.emit('queue', true);
  await p.host.untilState((s) => s.queue.includes(late.id), 'late joiner in line');
  p.host.emit('switchGame', { game: 'chess' });
  p.host.emit('hostUpdate', { settings: { turnTime: 60 } });
  await srv.passes(2);
  const room = await srv.room(p.code);
  ok(room.gameId === 'checkers' && room.phase === 'game', 'the game cannot be switched mid-game');
  ok(p.host.state.settings.turnTime !== 60, 'game settings cannot be changed mid-game');
  // One player leaves: the game ends and the queued late joiner gets the open seat.
  const other = p.cs[1];
  other.leave();
  await everyone([p.host, late], (s) => s.phase === 'lobby', 'game over after the leave');
  await late.untilState((s) => s.role === 'player', 'late joiner seated');
  ok(p.host.state.lastResult && p.host.state.lastResult.forfeit, 'the result is recorded as a forfeit');
  ok(late.state.role === 'player', 'the queued late joiner is seated when the game ends');
  await consistent('after late join', [p.host, late]);
  closeAll([...p.cs, late]);
});

// 11. Timers: each timeout fires once, and nothing fires after a game has ended.
def('timers', async () => {
  const p = await party(2, { game: 'fourrow', settings: { turnTime: 15 } });
  await start(p, 'fourrow');
  const t0 = H.mark();
  const g = p.host.g;
  const first = byId(p.cs, g.players[0].id);
  await srv.advance(15500, 2);
  await everyone(p.cs, (s) => s.game && s.game.moves === 1, 'one timed-out move');
  ok(p.cs.every((c) => sysTexts(c, /ran out of time, so a random move/, t0).length === 1), 'one timeout gives exactly one random move and one message');
  await srv.passes(4);
  ok((await srv.room(p.code)).game.moves === 1, 'no second move fires without another timeout');
  const second = byId(p.cs, g.players[1].id);
  second.action({ type: 'drop', col: 3 });
  await first.untilState((s) => s.game && s.game.moves === 2, 'second moves');
  await srv.advance(15500, 2);
  await everyone(p.cs, (s) => s.phase === 'lobby' && s.lastResult, 'second timeout forfeits');
  ok(p.host.state.lastResult.winnerId === second.id && p.host.state.lastResult.forfeit, 'running out of time twice forfeits to the opponent');
  const t1 = H.mark();
  await srv.advance(120000, 3);
  ok(p.cs.every((c) => sysTexts(c, /ran out of time/, t1).length === 0), 'no timer fires after the game ended');

  // Draw & Guess: an idle drawer gets a word picked once; after the host ends it nothing fires.
  await switchTo(p, 'drawguess');
  await start(p, 'drawguess');
  const t2 = H.mark();
  await srv.advance(15500, 2);
  await everyone(p.cs, (s) => s.game && s.game.phase === 'draw', 'word auto-picked');
  ok(p.cs.every((c) => sysTexts(c, /is drawing now!/, t2).length === 1), 'the idle drawer gets exactly one automatic word');
  p.host.emit('endGame');
  await everyone(p.cs, (s) => s.phase === 'lobby', 'host ended drawguess');
  const t3 = H.mark();
  await srv.advance(200000, 3);
  ok(p.cs.every((c) => c.chats(t3).filter((m) => m.kind === 'sys').length <= 1), 'no turn timer fires after the host ends the game');
  await consistent('after timers', p.cs);
  closeAll(p.cs);
});

// 12. Races: the last seat, many simultaneous joins, double start, spammed moves.
def('races', async () => {
  const p = await party(1, { game: 'fourrow' });
  const crowd = NAMES.slice(1, 8).map((n) => client(n));
  const res = await Promise.all(crowd.map((c) => c.join(p.code)));
  ok(res.filter((x) => x.role === 'player').length === 1 && res.filter((x) => x.role === 'spectator').length === 6, 'seven simultaneous joins into one open seat: one player, six spectators');
  const cs = [p.host, ...crowd];
  await everyone(cs, (s) => s.players.length + s.spectators.length === 8, 'all in');
  await consistent('simultaneous joins', cs);
  const watchers = crowd.filter((c) => res[crowd.indexOf(c)].role === 'spectator');
  const player = crowd.find((c) => res[crowd.indexOf(c)].role === 'player');
  player.emit('watch');
  watchers.forEach((w) => w.emit('takeSeat'));
  await p.host.untilState((s) => s.players.length === 2, 'seat retaken');
  await srv.passes(2);
  let room = await srv.room(p.code);
  ok(room.seats.length === 2, `simultaneous seat grabs never over-fill the game (${room.seats.length} seated)`);
  await consistent('seat grabs', cs);
  for (let i = 0; i < 5; i++) p.host.emit('startGame');
  await everyone(cs, (s) => s.phase === 'game', 'started');
  await srv.passes(2);
  room = await srv.room(p.code);
  ok(room.gameCount === 1, `five start requests start one game (gameCount ${room.gameCount})`);
  const g = p.host.g;
  const a = byId(cs, g.players[0].id);
  const b = byId(cs, g.players[1].id);
  for (let i = 0; i < 6; i++) a.action({ type: 'drop', col: 0 });
  for (let i = 0; i < 6; i++) b.action({ type: 'drop', col: 1 });
  await srv.passes(2);
  room = await srv.room(p.code);
  const counts = room.game.board.flat().reduce((o, v) => ((o[v] = (o[v] || 0) + 1), o), {});
  ok(room.game.moves === 2 && counts[1] === 1 && counts[2] === 1, `spammed moves apply one per turn (${room.game.moves} moves)`);
  await consistent('spammed moves', cs);
  closeAll(cs);
});

// 12b. Public auto-start countdown, locked parties, and a whole table dropping mid-game.
def('autostart-lock-abandon', async () => {
  const p = await party(2, { game: 'fourrow', isPublic: true });
  await everyone(p.cs, (s) => s.autoStartIn !== null, 'countdown shown');
  ok(p.cs.every((c) => c.state.autoStartIn > 10000), 'a public lobby with enough players shows the start countdown');
  const [a, b] = p.cs;
  const bId = b.id;
  b.drop();
  await a.untilState((s) => s.autoStartIn === null, 'countdown cancelled');
  ok(true, 'the countdown stops when a player drops');
  await srv.advance(13000);
  ok((await srv.room(p.code)).phase === 'lobby', 'nothing starts while a player is missing');
  const back = await b.reconnect();
  ok(back && back.rejoined && b.id === bId, 'the player comes back as the same member');
  await everyone(p.cs, (s) => s.autoStartIn !== null, 'countdown restarted');
  await srv.advance(12500, 3);
  await everyone(p.cs, (s) => s.phase === 'game', 'auto-started');
  await srv.passes(3);
  ok((await srv.room(p.code)).gameCount === 1, 'the countdown starts exactly one game');
  // Locked: members can still come back, nobody new can get in.
  p.host.emit('endGame');
  await everyone(p.cs, (s) => s.phase === 'lobby', 'ended');
  p.host.emit('hostUpdate', { isPublic: false, locked: true });
  await everyone(p.cs, (s) => s.locked && !s.isPublic, 'locked');
  const outsider = client('Lou');
  const no = await outsider.join(p.code);
  ok(no.error === 'locked', 'a locked party turns new people away');
  const rf = await b.refresh();
  ok(rf && rf.rejoined, 'a member of a locked party can still reload and rejoin');
  b.leave();
  await a.untilState((s) => s.players.length === 1, 'b left');
  await srv.advance(2100, 1);
  const again = await b.join(p.code);
  ok(again.error === 'locked', 'someone who left a locked party cannot walk back in');
  closeAll([...p.cs, outsider]);

  // Everyone drops mid-game: the game ends when they time out, then the party expires.
  const q = await party(3, { game: 'colorstack' });
  await start(q, 'colorstack');
  const ids = q.cs.map((c) => c.id);
  q.cs.forEach((c) => c.drop());
  for (let i = 0; i < 20; i++) {
    const room = await srv.room(q.code);
    if (room.members.every((m) => !m.connected)) break;
    await srv.passes(1);
  }
  await srv.advance(GRACE + 1000);
  let room = await srv.room(q.code);
  ok(room && room.members.length === 0 && room.phase === 'lobby' && !room.hasGame, 'when the whole table drops, the members time out and the game is closed');
  await srv.advance(ROOM_TTL + 1000);
  room = await srv.room(q.code);
  ok(!room, 'and the empty party expires');
  ok(ids.length === 3, 'three members were dropped');
  closeAll(q.cs);
});

// 13. Smoke pass of every visible game: start, private fields, reconnect, end, rematch, abandonment.
// Fields that carry one player's private information. Trivia's `choices` are the public answer options.
const PRIVATE = ['hand', 'myShips', 'word', 'role', 'source', 'myAnswers', 'myPick', 'myFake'];
const PRIVATE_FOR = { drawguess: ['choices'] };
def('smoke-all-games', async () => {
  ok(VISIBLE.length === 21, `21 games are visible (${VISIBLE.length})`);
  for (const game of VISIBLE) {
    const meta = GAMES[game].meta;
    const n = Math.min(meta.maxPlayers, Math.max(meta.minPlayers, 3));
    const p = await party(n, { game });
    const spec = client('Kit');
    await spec.join(p.code);
    if (spec.state && spec.state.role !== 'spectator') spec.emit('watch');
    const cs = [...p.cs, spec];
    await everyone(cs, (s) => s.spectators.length === 1 && s.players.length === n, `${game}: seated`);
    await start({ host: p.host, cs }, game);
    const leaked = [...PRIVATE, ...(PRIVATE_FOR[game] || [])].filter((k) => spec.g[k] !== undefined && spec.g[k] !== null && !(Array.isArray(spec.g[k]) && !spec.g[k].length));
    ok(!leaked.length && !(spec.g.myDice && spec.g.myDice.length), `${game}: the spectator gets no private fields (${leaked})`);
    ok(p.cs.every((c) => c.g && (c.g.myIndex === undefined || c.g.myIndex >= 0)), `${game}: every player is placed in the game`);
    // A player drops and comes back inside the grace period.
    const v = p.cs[n - 1];
    const vid = v.id;
    v.drop();
    await p.host.untilState((s) => s.players.some((x) => x.id === vid && !x.connected), `${game}: offline`);
    const vb = await v.reconnect();
    ok(vb && vb.rejoined && v.state.you === vid && v.state.phase === 'game' && v.g, `${game}: a dropped player reconnects into the running game as the same member`);
    await consistent(`${game} reconnect`, cs);
    p.host.emit('endGame');
    await everyone(cs, (s) => s.phase === 'lobby', `${game}: ended by host`);
    await start({ host: p.host, cs }, game);
    ok(true, `${game}: a rematch starts`);
    for (const c of p.cs.slice(0, -1)) c.leave();
    await everyone([p.cs[n - 1], spec], (s) => s.phase === 'lobby', `${game}: ends when one player is left`);
    await consistent(`${game} abandoned`, [p.cs[n - 1], spec]);
    closeAll(cs);
  }
}, 120000);

// 14. Cleanup: with every client gone, no sockets, members, rooms or timers are left behind.
def('cleanup', async () => {
  for (const c of live) c.close();
  const s0 = await srv.snapshot({ withGame: false });
  for (let i = 0; i < 20 && (await srv.snapshot({ withGame: false })).sockets.length; i++) await srv.passes(1);
  const s1 = await srv.snapshot({ withGame: false });
  ok(s1.sockets.length === 0, `every server socket is closed (${s0.sockets.length} → ${s1.sockets.length})`);
  await srv.advance(GRACE + 1000);
  await srv.advance(ROOM_TTL + 1000);
  const s2 = await srv.snapshot({ withGame: false });
  ok(s2.rooms.length === 0, `every party expired (${s2.rooms.length} left)`);
  const mem = await srv.gc();
  metrics.heap_after_gc_mb = +(mem.heapUsed / 1048576).toFixed(1);
  metrics.rss_mb = +(mem.rss / 1048576).toFixed(1);
  const timers = s2.resources.Timeout || 0;
  ok(timers <= metrics.baseline_timeouts + 2, `no timers are left behind (${metrics.baseline_timeouts} at start, ${timers} now)`);
  clean(H.snapshotViolations(s2), 'the final server state is consistent');
});

// ---------------------------------------------------------------------------------------------
(async () => {
  srv = await H.startServer();
  const base = await srv.snapshot({ withGame: false });
  metrics.baseline_timeouts = base.resources.Timeout || 0;
  metrics.heap_start_mb = +(base.memory.heapUsed / 1048576).toFixed(1);
  console.log(`reliability: real server on ${srv.url}, seed ${srv.seed}`);
  try {
    for (const s of SCENARIOS) {
      if (ONLY && s.name !== ONLY && s.name !== 'cleanup') continue;
      CUR = s.name;
      console.log(`\n== ${s.name}`);
      await H.scenario(r, srv, s.name, () => live, s.fn, s.limit || 60000);
    }
  } catch (err) {
    r.ok(false, 'suite crashed: ' + (err && err.stack));
  } finally {
    for (const c of live) c.close();
    await srv.stop();
  }
  metrics.scenarios = Object.fromEntries(r.timings.map((t) => [t.name, t.ms]));
  r.artifact('metrics', { seed: srv.seed, node: process.version, platform: `${process.platform} ${process.arch}`, metrics });
  console.log('\nmetrics ' + JSON.stringify(metrics));
  process.exit(H.finish(r));
})();
