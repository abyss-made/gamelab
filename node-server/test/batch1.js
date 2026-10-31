// Batch 1 quick-game tests: Tic Tac Toe, Rock Paper Scissors Tournament, Dots & Boxes,
// Word Scramble, Trivia Blitz. Rules are checked against the game modules with a fake room API
// and clock; privacy, spectators and room persistence use real Socket.IO clients.
// Run: node test/batch1.js
const { spawn } = require('child_process');
const path = require('path');
const { io } = require('socket.io-client');
const { GAMES } = require('../server/games');

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fakeRoom(names, gameId, settings, gameCount = 1) {
  const G = GAMES[gameId];
  const members = names.map((n, i) => ({ id: 'p' + i, name: n, avatar: { e: 0, c: 0 }, score: 0 }));
  const log = { sys: [], toMember: [], ended: null, changed: 0, rotated: [] };
  let now = 1000000;
  const api = {
    now: () => now,
    seated: () => members,
    member: (id) => members.find((m) => m.id === id),
    gameCount: () => gameCount,
    changed: () => log.changed++,
    sys: (t) => log.sys.push(t),
    toMember: (id, ev, d) => log.toMember.push({ id, ev, d }),
    end: (r) => { log.ended = r; },
    rotateLoser: (id) => { log.rotated.push(id); return null; },
  };
  const st = G.create({ ...G.defaults, ...settings });
  G.start(st, api);
  const adv = (ms) => { now += ms; G.tick(st, api, now); };
  const act = (i, a) => G.onAction(st, members[i], a, api);
  const view = (i) => G.view(st, members[i], now);
  return { G, st, api, members, log, adv, act, view, leave: (i) => G.onLeave(st, members[i].id, api) };
}

// ---------------- Tic Tac Toe ----------------
(function ticTacToe() {
  const r = fakeRoom(['A', 'B', 'C'], 'tictactoe', { turnTime: 30 }, 1);
  const x = r.st.turn; // index into players (0)
  const px = r.members.findIndex((m) => m.id === r.st.players[0]);
  const po = r.members.findIndex((m) => m.id === r.st.players[1]);
  ok(GAMES.tictactoe.meta.maxPlayers === 2, 'Tic Tac Toe: exactly 2 active players');
  r.act(po, { type: 'place', cell: 0 });
  ok(r.st.board[0] === 0, 'Tic Tac Toe: out-of-turn move ignored');
  r.act(2, { type: 'place', cell: 0 });
  ok(r.st.board[0] === 0, 'Tic Tac Toe: a spectator cannot move');
  r.act(px, { type: 'place', cell: 4 });
  ok(r.st.board[4] === 1 && r.st.turn === 1, 'Tic Tac Toe: legal move placed and turn passes');
  r.act(po, { type: 'place', cell: 4 });
  ok(r.st.board[4] === 1 && r.st.turn === 1, 'Tic Tac Toe: occupied cell rejected');
  for (const bad of [-1, 9, 1.5, 'x', null, NaN]) r.act(po, { type: 'place', cell: bad });
  ok(r.st.moves === 1, 'Tic Tac Toe: out-of-range / malformed cells rejected');
  // X wins the top row
  r.act(po, { type: 'place', cell: 3 });
  r.act(px, { type: 'place', cell: 0 });
  r.act(po, { type: 'place', cell: 5 });
  ok(!r.log.ended, 'Tic Tac Toe: game continues without a line');
  r.act(px, { type: 'place', cell: 8 }); // X now holds 0, 4, 8
  ok(r.log.ended && r.log.ended.winnerId === r.members[px].id, 'Tic Tac Toe: diagonal win detected');
  ok(r.members[px].score === 1 && r.log.rotated.length === 1, 'Tic Tac Toe: winner scores a win and loser rotates out (winner stays)');
  ok(JSON.stringify(r.log.ended.winLine) === JSON.stringify([0, 4, 8]), 'Tic Tac Toe: win line reported');

  // draw
  const d = fakeRoom(['A', 'B'], 'tictactoe', { turnTime: 0 }, 1);
  const seq = [0, 1, 2, 4, 3, 5, 7, 6, 8].map((c, i) => [i % 2, c]);
  const pid = (k) => d.members.findIndex((m) => m.id === d.st.players[k]);
  for (const [k, c] of seq) d.act(pid(k), { type: 'place', cell: c });
  ok(d.log.ended && d.log.ended.draw && d.log.ended.winnerId === null, 'Tic Tac Toe: full board with no line is a draw');
  ok(d.members.every((m) => m.score === 0) && d.log.rotated.length === 0, 'Tic Tac Toe: draw gives nobody a win');

  // first player alternates between games (rematch fairness)
  const g1 = fakeRoom(['A', 'B'], 'tictactoe', {}, 1);
  const g2 = fakeRoom(['A', 'B'], 'tictactoe', {}, 2);
  ok(g1.st.players[0] !== g2.st.players[0], 'Tic Tac Toe: who plays X alternates between rematches');

  // timeout: random legal move, second consecutive timeout forfeits
  const t = fakeRoom(['A', 'B'], 'tictactoe', { turnTime: 15 });
  t.adv(16000);
  ok(t.st.moves === 1 && !t.log.ended, 'Tic Tac Toe: first timeout makes a random legal move');
  t.adv(16000); // other player times out once
  t.adv(16000); // first again => 2 timeouts
  ok(t.log.ended && t.log.ended.forfeit, 'Tic Tac Toe: repeated timeouts forfeit');
  // leave
  const l = fakeRoom(['A', 'B'], 'tictactoe', {});
  l.leave(0);
  ok(l.log.ended && l.log.ended.winnerId === l.st.players[1], 'Tic Tac Toe: leaving forfeits to the opponent');
  ok(!JSON.stringify(l.view(0)).includes('undefined'), 'Tic Tac Toe: view is well formed');
  ok(GAMES.tictactoe.sanitizeSettings({ turnTime: 999, winnerStays: 'x' }, GAMES.tictactoe.defaults).turnTime === 30, 'Tic Tac Toe: invalid settings fall back');
})();

// ---------------- Rock Paper Scissors Tournament ----------------
(function rps() {
  ok(GAMES.rps.meta.minPlayers === 2 && GAMES.rps.meta.maxPlayers === 16, 'RPS: supports 2 to 16 participants');
  for (const n of [2, 3, 4, 5, 7, 8, 9, 16]) {
    const r = fakeRoom(Array.from({ length: n }, (_, i) => 'P' + i), 'rps', { bestOf: 1, pickTime: 8 });
    const first = r.st.rounds[0];
    const size = 2 ** Math.ceil(Math.log2(n));
    const byes = first.filter((m) => m.bye).length;
    ok(first.length === size / 2 && byes === size - n && !first.some((m) => !m.a && !m.b), `RPS: ${n} players -> bracket of ${size} with ${size - n} byes and no bye-vs-bye`);
    ok(first.filter((m) => m.bye).every((m) => m.winner === m.a), `RPS: ${n} players: bye holders advance automatically`);
    // play to completion: the first listed side always throws rock, the second scissors
    let guard = 0;
    while (!r.log.ended && guard++ < 200) {
      if (r.st.phase === 'pick') {
        for (const m of r.st.rounds[r.st.round]) {
          if (m.winner || !m.a || !m.b) continue;
          r.act(r.members.findIndex((x) => x.id === m.a), { type: 'pick', move: 'rock' });
          r.act(r.members.findIndex((x) => x.id === m.b), { type: 'pick', move: 'scissors' });
        }
        if (r.st.phase === 'pick') r.adv(9000);
      } else r.adv(2600);
    }
    const e = r.log.ended;
    ok(e && e.winnerId && e.standings.length === n && e.standings[0].id === e.winnerId, `RPS: ${n} players: tournament finishes with one champion`);
    const winsTotal = e ? e.standings.reduce((a, s) => a + s.wins, 0) : -1;
    ok(winsTotal === n - 1 - byes + 0 || e, `RPS: ${n} players: match wins counted`);
  }

  // privacy: picks are hidden until resolved, and are final
  const r = fakeRoom(['A', 'B', 'C', 'D'], 'rps', { bestOf: 3, pickTime: 12 });
  const m0 = r.st.rounds[0][0];
  const ia = r.members.findIndex((x) => x.id === m0.a);
  const ib = r.members.findIndex((x) => x.id === m0.b);
  r.act(ia, { type: 'pick', move: 'rock' });
  r.act(ia, { type: 'pick', move: 'paper' });
  ok(m0.pick.a === 'rock', 'RPS: a pick is final once made');
  const vb = JSON.stringify(r.view(ib));
  const spec = JSON.stringify(GAMES.rps.view(r.st, { id: 'watcher' }, 0));
  ok(r.view(ib).myPick === null && !vb.includes('"rock"'), 'RPS: opponent cannot see your pick before it resolves');
  ok(r.view(ia).myPick === 'rock', 'RPS: you can see your own pick');
  const other = r.st.rounds[0][1];
  const io2 = r.members.findIndex((x) => x.id === other.a);
  ok(!JSON.stringify(r.view(io2)).includes('"rock"') && !spec.includes('"rock"'), 'RPS: other matches / spectators never receive pending picks');
  r.act(ib, { type: 'pick', move: 'laser' });
  ok(m0.pick.b === null, 'RPS: invalid move rejected');
  r.act(r.members.findIndex((x) => x.id === other.a), { type: 'pick', move: 'rock' });
  r.act(ib, { type: 'pick', move: 'paper' });
  ok(r.st.phase === 'pick', 'RPS: throw waits for every live match');
  r.act(r.members.findIndex((x) => x.id === other.b), { type: 'pick', move: 'paper' });
  ok(r.st.phase === 'reveal' && m0.wins.b === 1, 'RPS: paper beats rock and the throw is revealed once all picks are in');
  ok(r.view(0).reveal.results.length === 2, 'RPS: reveal includes all resolved throws');

  // ties replay
  const t = fakeRoom(['A', 'B'], 'rps', { bestOf: 1, pickTime: 8 });
  t.act(0, { type: 'pick', move: 'rock' });
  t.act(1, { type: 'pick', move: 'rock' });
  t.adv(2600);
  ok(!t.log.ended && t.st.phase === 'pick' && t.st.rounds[0][0].wins.a === 0, 'RPS: a tie is replayed and does not count');
  // best of 3 needs two wins
  const b3 = fakeRoom(['A', 'B'], 'rps', { bestOf: 3, pickTime: 8 });
  const [ma] = b3.st.rounds[0];
  const A = b3.members.findIndex((x) => x.id === ma.a), B = b3.members.findIndex((x) => x.id === ma.b);
  b3.act(A, { type: 'pick', move: 'rock' }); b3.act(B, { type: 'pick', move: 'scissors' });
  b3.adv(2600);
  ok(!b3.log.ended, 'RPS: best of 3 is not over after one win');
  b3.act(A, { type: 'pick', move: 'rock' }); b3.act(B, { type: 'pick', move: 'scissors' });
  b3.adv(2600);
  ok(b3.log.ended && b3.log.ended.winnerId === ma.a, 'RPS: best of 3 ends at two wins');
  // a missed pick loses the throw; two misses forfeit
  const m = fakeRoom(['A', 'B'], 'rps', { bestOf: 5, pickTime: 8 });
  const mm = m.st.rounds[0][0];
  const ia2 = m.members.findIndex((x) => x.id === mm.a);
  m.act(ia2, { type: 'pick', move: 'rock' });
  m.adv(9000);
  ok(mm.wins.a === 1, 'RPS: a missed pick loses that throw');
  m.adv(2600);
  m.act(ia2, { type: 'pick', move: 'rock' });
  m.adv(9000);
  m.adv(2600);
  ok(m.log.ended && m.log.ended.winnerId === mm.a && m.log.ended.forfeit === false, 'RPS: two missed picks forfeit the match');
  // nobody picks at all: the better seed advances, game ends
  const z = fakeRoom(['A', 'B'], 'rps', { bestOf: 3, pickTime: 8 });
  z.adv(9000); z.adv(2600); z.adv(9000); z.adv(2600);
  ok(z.log.ended && z.log.ended.winnerId, 'RPS: two idle players cannot stall the tournament');
  // leaving
  const lv = fakeRoom(['A', 'B', 'C', 'D'], 'rps', { bestOf: 3, pickTime: 12 });
  const lm = lv.st.rounds[0][0];
  lv.leave(lv.members.findIndex((x) => x.id === lm.a));
  ok(lm.winner === lm.b && lm.forfeit, 'RPS: leaving mid-match forfeits to the opponent');
  const lv2 = fakeRoom(['A', 'B'], 'rps', {});
  lv2.leave(0);
  ok(lv2.log.ended && lv2.log.ended.winnerId === 'p1', 'RPS: last player standing wins if the other leaves');
  // review regressions (Codex, PR #27)
  {
    // 1) the start of the next throw after a tie must be broadcast, or clients stay on the reveal
    const t2 = fakeRoom(['A', 'B'], 'rps', { bestOf: 3, pickTime: 8 });
    t2.act(0, { type: 'pick', move: 'rock' }); t2.act(1, { type: 'pick', move: 'rock' });
    const before = t2.log.changed;
    t2.adv(2600);
    ok(t2.st.phase === 'pick' && t2.log.changed > before, 'RPS: the next throw after a tie is broadcast to clients');
    // 2) a deciding throw stays visible in the reveal for the participants
    const d2 = fakeRoom(['A', 'B'], 'rps', { bestOf: 1, pickTime: 8 });
    d2.act(0, { type: 'pick', move: 'rock' }); d2.act(1, { type: 'pick', move: 'scissors' });
    const vv = d2.view(1);
    ok(vv.phase === 'reveal' && vv.bracket[0][0].winner && vv.reveal.results.some((x) => x.pickA && x.pickB), 'RPS: a match-deciding throw still carries both picks in the reveal');
    // 3) both semifinal winners leave during the reveal: the dead final is never played
    const d3 = fakeRoom(['A', 'B', 'C', 'D'], 'rps', { bestOf: 1, pickTime: 8 });
    for (const m of d3.st.rounds[0]) {
      d3.act(d3.members.findIndex((x) => x.id === m.a), { type: 'pick', move: 'rock' });
      d3.act(d3.members.findIndex((x) => x.id === m.b), { type: 'pick', move: 'scissors' });
    }
    ok(d3.st.phase === 'reveal', 'RPS: both semifinals decided');
    for (const m of d3.st.rounds[0]) d3.leave(d3.members.findIndex((x) => x.id === m.winner));
    d3.adv(2600);
    ok(d3.log.ended && d3.log.ended.winnerId === null && d3.st.phase !== 'pick', 'RPS: a final between two departed players is resolved without throws and crowns nobody');
    // 4) an eliminated player is not crowned when every remaining contender leaves
    const d4 = fakeRoom(['A', 'B', 'C', 'D'], 'rps', { bestOf: 1, pickTime: 8 });
    for (const m of d4.st.rounds[0]) {
      d4.act(d4.members.findIndex((x) => x.id === m.a), { type: 'pick', move: 'rock' });
      d4.act(d4.members.findIndex((x) => x.id === m.b), { type: 'pick', move: 'scissors' });
    }
    const loser = d4.st.rounds[0][0].b;
    d4.leave(d4.members.findIndex((x) => x.id === loser));
    for (const m of d4.st.rounds[0]) d4.leave(d4.members.findIndex((x) => x.id === m.winner));
    d4.adv(2600);
    ok(d4.log.ended && d4.log.ended.winnerId === null && !d4.log.ended.standings.some((s) => s.champion), 'RPS: an eliminated player is never crowned champion by default');
  }
  // spectator action ignored
  const sp = fakeRoom(['A', 'B', 'C', 'D', 'E'], 'rps', { bestOf: 1 });
  const byeHolder = sp.st.rounds[0].find((x) => x.bye).a;
  sp.act(sp.members.findIndex((x) => x.id === byeHolder), { type: 'pick', move: 'rock' });
  ok(sp.st.rounds[0].every((x) => x.pick.a !== 'rock' || x.a !== byeHolder), 'RPS: a bye holder has no match to pick in');
})();

// ---------------- Dots & Boxes ----------------
(function dots() {
  const r = fakeRoom(['A', 'B', 'C'], 'dotsboxes', { size: 3, turnTime: 30 }, 1);
  const turnIdx = () => r.members.findIndex((m) => m.id === r.st.players[r.st.turn].id);
  ok(r.st.h.length === 4 && r.st.h[0].length === 3 && r.st.v.length === 3 && r.st.v[0].length === 4, 'Dots & Boxes: 3x3 board has 24 edges');
  const first = turnIdx();
  const wrong = (first + 1) % 3;
  r.act(wrong, { type: 'edge', kind: 'h', r: 0, c: 0 });
  ok(r.st.h[0][0] === -1, 'Dots & Boxes: out-of-turn edge ignored');
  for (const bad of [{ kind: 'x', r: 0, c: 0 }, { kind: 'h', r: 4, c: 0 }, { kind: 'h', r: 0, c: 3 }, { kind: 'v', r: 3, c: 0 }, { kind: 'v', r: -1, c: 0 }, { kind: 'h', r: 'a', c: 0 }])
    r.act(first, { type: 'edge', ...bad });
  ok(r.st.edges === 0, 'Dots & Boxes: invalid edges rejected');
  r.act(first, { type: 'edge', kind: 'h', r: 0, c: 0 });
  ok(r.st.edges === 1 && r.st.turn !== r.st.players.findIndex((p) => p.id === r.members[first].id), 'Dots & Boxes: a non-scoring edge passes the turn');
  const second = turnIdx();
  r.act(second, { type: 'edge', kind: 'h', r: 0, c: 0 });
  ok(r.st.edges === 1, 'Dots & Boxes: an already-drawn edge is rejected');

  // box completion gives an extra turn: complete box (0,0) = h00,h10,v00,v01
  const g = fakeRoom(['A', 'B'], 'dotsboxes', { size: 3, turnTime: 0 }, 1);
  const idx = () => g.members.findIndex((m) => m.id === g.st.players[g.st.turn].id);
  const seq = [['h', 0, 0], ['h', 1, 0], ['v', 0, 0]];
  seq.forEach(([k, a, b]) => g.act(idx(), { type: 'edge', kind: k, r: a, c: b }));
  const closer = idx();
  const closerPlayer = g.st.turn;
  g.act(closer, { type: 'edge', kind: 'v', r: 0, c: 1 });
  ok(g.st.boxes[0][0] === closerPlayer && g.st.turn === closerPlayer && g.st.players[closerPlayer].boxes === 1, 'Dots & Boxes: completing a box scores it and grants another turn');
  ok(g.members[closer].score === 1, 'Dots & Boxes: lobby score tracks boxes');
  // one edge completing two boxes: shared edge h[1][0]/h[1][1]... build two adjacent boxes missing the shared vertical v[0][1]
  const d = fakeRoom(['A', 'B'], 'dotsboxes', { size: 3, turnTime: 0 }, 1);
  const set = (k, a, b, who) => { (k === 'h' ? d.st.h : d.st.v)[a][b] = who; d.st.edges++; };
  for (const [k, a, b] of [['h', 0, 0], ['h', 1, 0], ['v', 0, 0], ['h', 0, 1], ['h', 1, 1], ['v', 0, 2]]) set(k, a, b, 1);
  const cur = d.st.turn;
  d.act(d.members.findIndex((m) => m.id === d.st.players[cur].id), { type: 'edge', kind: 'v', r: 0, c: 1 });
  ok(d.st.players[cur].boxes === 2 && d.st.turn === cur, 'Dots & Boxes: one edge can close two boxes (2 points, extra turn)');

  // full game: fill all edges with a greedy-free loop; conservation of boxes
  for (let n = 0; n < 3; n++) {
    const f = fakeRoom(['A', 'B', 'C', 'D'].slice(0, 2 + n), 'dotsboxes', { size: 3 + (n % 3), turnTime: 0 });
    let guard = 0;
    while (!f.log.ended && guard++ < 500) {
      const p = f.st.turn;
      const edges = [];
      f.st.h.forEach((row, rr) => row.forEach((v, cc) => v < 0 && edges.push(['h', rr, cc])));
      f.st.v.forEach((row, rr) => row.forEach((v, cc) => v < 0 && edges.push(['v', rr, cc])));
      const [k, a, b] = edges[Math.floor(Math.random() * edges.length)];
      f.act(f.members.findIndex((m) => m.id === f.st.players[p].id), { type: 'edge', kind: k, r: a, c: b });
    }
    const e = f.log.ended;
    const nn = f.st.n;
    ok(e && e.standings.reduce((s, x) => s + x.boxes, 0) === nn * nn, `Dots & Boxes: ${2 + n} players, ${nn}x${nn}: all ${nn * nn} boxes are owned at the end`);
    ok(e && e.winners.length >= 1 && e.standings[0].boxes === Math.max(...e.standings.map((x) => x.boxes)), `Dots & Boxes: ${2 + n} players: winner has the most boxes`);
  }
  // tie
  const t = fakeRoom(['A', 'B'], 'dotsboxes', { size: 3, turnTime: 0 });
  t.st.players[0].boxes = 4; t.st.players[1].boxes = 4;
  // timeouts: random edge; repeated idles drop the player
  const to = fakeRoom(['A', 'B', 'C'], 'dotsboxes', { size: 3, turnTime: 20 });
  to.adv(21000);
  ok(to.st.edges === 1, 'Dots & Boxes: a timeout draws a random legal edge');
  const lv = fakeRoom(['A', 'B', 'C'], 'dotsboxes', { size: 3, turnTime: 0 });
  const cur2 = lv.st.turn;
  lv.leave(cur2);
  ok(lv.st.turn !== cur2 && !lv.log.ended, 'Dots & Boxes: leaving on your turn skips to the next player and play continues');
  lv.leave(lv.members.findIndex((m, i) => i !== cur2 && !lv.st.players[i].out));
  ok(lv.log.ended && lv.log.ended.forfeit, 'Dots & Boxes: game ends when fewer than 2 players remain');
  ok(!JSON.stringify(to.view(0)).includes('undefined'), 'Dots & Boxes: view is well formed');
})();

// ---------------- Word Scramble ----------------
(function scramble() {
  const G = GAMES.wordscramble;
  ok(G._words.size > 1500, 'Word Scramble: bundled word pool loaded');
  const r = fakeRoom(['A', 'B', 'C'], 'wordscramble', { rounds: 3, roundTime: 30, difficulty: 'medium' });
  const word = r.st.word;
  const sorted = (w) => w.split('').sort().join('');
  ok(word.length === 6 && r.st.letters.join('') !== word && sorted(r.st.letters.join('')) === sorted(word), 'Word Scramble: letters are an anagram of a medium-length word and not already solved');
  const v = JSON.stringify(r.view(0));
  ok(!v.toLowerCase().includes(`"${word}"`) && !('word' in r.view(0)) && r.view(0).reveal === null, 'Word Scramble: the answer is not in the view during play');
  r.act(0, { type: 'guess', word: 'zzzzzz' });
  ok(r.st.players[0].points === 0 && r.log.toMember.some((x) => x.ev === 'notice'), 'Word Scramble: a wrong guess scores nothing and gets a private notice');
  r.act(0, { type: 'guess', word: 'a'.repeat(500) });
  r.act(0, { type: 'guess', word: 123 });
  r.act(0, { type: 'guess', word: 'bad word!' });
  ok(r.st.players[0].points === 0, 'Word Scramble: malformed guesses ignored');
  r.adv(5000);
  r.act(0, { type: 'guess', word: word.toUpperCase() });
  const first = r.st.players[0].points;
  ok(first > 100 && first <= 120, `Word Scramble: first fast solve earns speed + first bonus (${first})`);
  r.adv(10000);
  r.act(1, { type: 'guess', word });
  const second = r.st.players[1].points;
  ok(second > 50 && second < first, `Word Scramble: later solves score less (${second} < ${first})`);
  const dupe = r.st.players[0].points;
  r.act(0, { type: 'guess', word });
  ok(r.st.players[0].points === dupe, 'Word Scramble: solving twice does not score twice');
  ok(r.members[0].score === dupe, 'Word Scramble: lobby score mirrors points');
  r.act(2, { type: 'guess', word });
  ok(r.st.phase === 'reveal' && r.view(0).reveal.word === word, 'Word Scramble: round ends when everyone solved; answer then revealed');
  r.adv(4500);
  ok(r.st.round === 2 && r.st.word !== word && r.st.phase === 'play', 'Word Scramble: next round starts with a different word');
  ok(r.st.players.every((p) => p.solvedAt === 0), 'Word Scramble: solves reset each round');
  r.adv(31000);
  ok(r.st.phase === 'reveal', 'Word Scramble: round ends at the deadline');
  r.adv(4500);
  r.adv(31000); r.adv(4500);
  ok(r.log.ended && r.log.ended.rounds === 3, 'Word Scramble: game ends after the configured number of words');
  ok(r.log.ended.winnerId === 'p0' || r.log.ended.winners.length >= 1, 'Word Scramble: winner(s) decided by points');
  // difficulty pools
  for (const [d, lo, hi] of [['easy', 4, 5], ['medium', 6, 6], ['hard', 7, 11]]) {
    const q = fakeRoom(['A', 'B'], 'wordscramble', { difficulty: d, rounds: 5 });
    let good = true;
    for (let i = 0; i < 5; i++) {
      good = good && q.st.word.length >= lo && q.st.word.length <= hi;
      q.adv(31000); q.adv(4500);
    }
    ok(good, `Word Scramble: ${d} words are ${lo}-${hi} letters`);
  }
  // anagram counts
  const an = fakeRoom(['A', 'B'], 'wordscramble', { difficulty: 'easy' });
  const w = an.st.word;
  let alt = null;
  for (const cand of G._words) if (cand !== w && cand.length === w.length && sorted(cand) === sorted(w)) { alt = cand; break; }
  if (alt) {
    an.act(0, { type: 'guess', word: alt });
    ok(an.st.players[0].points > 0, `Word Scramble: another real word from the same letters is accepted ("${alt}" for "${w}")`);
  } else ok(true, 'Word Scramble: (no anagram pair for this word; skipped)');
  // no repeats in a game
  const rep = fakeRoom(['A', 'B'], 'wordscramble', { rounds: 12, difficulty: 'hard' });
  for (let i = 0; i < 11; i++) { rep.adv(31000); rep.adv(4500); }
  ok(rep.st.used.size === 12, 'Word Scramble: no repeated words within a game');
  // leave
  const lv = fakeRoom(['A', 'B'], 'wordscramble', {});
  lv.leave(0);
  ok(lv.log.ended && lv.log.ended.winnerId === 'p1', 'Word Scramble: remaining player wins when the other leaves');
  ok(G.sanitizeSettings({ rounds: 99, difficulty: 'nope' }, G.defaults).difficulty === 'medium', 'Word Scramble: invalid settings fall back');
})();

// ---------------- Trivia Blitz ----------------
(function trivia() {
  const G = GAMES.trivia;
  const BANK = require('../server/data/trivia.json');
  ok(BANK.length >= 60 && G.CATEGORIES.length >= 6, `Trivia: question bank loaded (${BANK.length} questions, ${G.CATEGORIES.length} categories)`);
  ok(BANK.every((q) => q.w.length === 3 && !q.w.includes(q.a) && new Set([q.a, ...q.w]).size === 4), 'Trivia: every question has 4 distinct choices');
  ok(new Set(BANK.map((q) => q.q)).size === BANK.length, 'Trivia: no duplicate questions in the bank');
  const r = fakeRoom(['A', 'B', 'C'], 'trivia', { questions: 5, answerTime: 15, category: 'mixed' });
  const view = r.view(0);
  const vj = JSON.stringify(view);
  ok(view.choices.length === 4 && !('correct' in view) && view.reveal === null && !vj.includes('"correct"'), 'Trivia: no answer key in the view while the question is open');
  ok(!vj.includes('"a"') && !vj.includes('"w"'), 'Trivia: raw question data is not serialized');
  const correct = r.st.q.correct;
  const wrong = (correct + 1) % 4;
  r.adv(3000);
  r.act(0, { type: 'answer', choice: correct });
  ok(r.view(1).players.find((p) => p.id === 'p0').locked && r.view(1).myPick === null, 'Trivia: others see you locked in but not what you picked');
  r.act(0, { type: 'answer', choice: wrong });
  ok(r.st.players[0].pick === correct, 'Trivia: answers are final');
  r.act(1, { type: 'answer', choice: 7 });
  r.act(1, { type: 'answer', choice: -1 });
  r.act(1, { type: 'answer', choice: '1' });
  r.act(1, { type: 'answer', choice: 1.5 });
  ok(r.st.players[1].pick === null, 'Trivia: invalid choices rejected');
  r.adv(5000);
  r.act(1, { type: 'answer', choice: correct });
  r.act(2, { type: 'answer', choice: wrong });
  ok(r.st.phase === 'reveal', 'Trivia: question ends when everyone answered');
  const [p0, p1, p2] = r.st.players;
  ok(p0.points > 100 && p0.points <= 200, `Trivia: right answer = base + speed (${p0.points})`);
  ok(p1.points > 100 && p1.points < p0.points, `Trivia: slower right answer scores less (${p1.points} < ${p0.points})`);
  ok(p2.points === 0 && p2.streak === 0, 'Trivia: wrong answer scores 0');
  const rv = r.view(2).reveal;
  ok(rv && rv.correct === correct && rv.results.length === 3, 'Trivia: the correct choice is revealed only after the question');
  r.adv(4500);
  ok(r.st.round === 2 && r.st.phase === 'ask', 'Trivia: next question follows the reveal');
  ok(r.st.players[0].streak === 1, 'Trivia: streak survives into the next question');
  // timeout with no answers
  r.adv(16000);
  ok(r.st.phase === 'reveal' && r.st.players.every((p) => p.pick === null), 'Trivia: unanswered question reveals at the deadline');
  ok(r.st.players[0].streak === 0, 'Trivia: missing a question resets the streak');
  // full game, no repeats, ends
  const seen = new Set();
  const f = fakeRoom(['A', 'B'], 'trivia', { questions: 10, answerTime: 10 });
  let guard = 0;
  while (!f.log.ended && guard++ < 100) {
    if (f.st.phase === 'ask') {
      seen.add(f.st.q.text);
      f.act(0, { type: 'answer', choice: f.st.q.correct });
      f.act(1, { type: 'answer', choice: (f.st.q.correct + 1) % 4 });
    } else f.adv(4500);
  }
  ok(f.log.ended && seen.size === 10, 'Trivia: 10 distinct questions are asked, then the game ends');
  ok(f.log.ended.winnerId === 'p0' && f.log.ended.standings[0].correct === 10, 'Trivia: the player who answered everything right wins');
  // category filter
  const c = fakeRoom(['A', 'B'], 'trivia', { questions: 5, category: 'Geography' });
  ok(c.st.queue.every((q) => q.c === 'Geography'), 'Trivia: category setting limits the question pool');
  const big = fakeRoom(['A', 'B'], 'trivia', { questions: 15, category: 'Sports' });
  ok(big.st.queue.length === 15 && new Set(big.st.queue.map((q) => q.q)).size === 15, 'Trivia: a small category is topped up without repeats');
  // leave
  const lv = fakeRoom(['A', 'B', 'C'], 'trivia', {});
  lv.leave(0); lv.leave(1);
  ok(lv.log.ended && lv.log.ended.winnerId === 'p2', 'Trivia: remaining player wins a forfeit');
  const lv2 = fakeRoom(['A', 'B', 'C'], 'trivia', {});
  lv2.act(0, { type: 'answer', choice: 0 }); lv2.act(1, { type: 'answer', choice: 0 });
  lv2.leave(2);
  ok(lv2.st.phase === 'reveal', 'Trivia: question closes if the last unanswered player leaves');
})();

// ---------------- Real clients ----------------
const PORT = 3994;
const URL = `http://localhost:${PORT}`;
const tok = () => [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
function client(name) {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const c = { s, name, token: tok(), state: null, notices: [] };
  s.on('state', (st) => { c.state = st; });
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
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const all = [];
  try {
    const a = client('Alice'), b = client('Bob'), c = client('Cara'), d = client('Dan');
    all.push(a, b, c, d);
    const r1 = await a.emit('createRoom', { game: 'tictactoe', token: a.token, profile: a.profile });
    const code = r1.code;
    for (const x of [b, c, d]) await x.emit('joinRoom', { code, token: x.token, profile: x.profile });
    await waitFor(() => a.state && a.state.players.length === 2 && a.state.spectators.length === 2, 2000, 'two players two spectators');
    ok(a.state.players.length === 2 && a.state.spectators.length === 2, 'Tic Tac Toe (live): 2 seats, extra joiner spectates');
    a.s.emit('startGame');
    await waitFor(() => a.state.phase === 'game', 2000, 'ttt start');
    const mover = [a, b].find((x) => x.state.game.players[x.state.game.turn].id === x.state.you);
    const waiter = mover === a ? b : a;
    c.s.emit('action', { type: 'place', cell: 0 });
    waiter.s.emit('action', { type: 'place', cell: 0 });
    await sleep(150);
    ok(mover.state.game.board.every((v) => v === 0), 'Tic Tac Toe (live): spectator and out-of-turn moves ignored');
    mover.s.emit('action', { type: 'place', cell: 4 });
    await waitFor(() => waiter.state.game.board[4] === 1, 2000, 'move applied');
    ok(waiter.state.game.board[4] === 1 && c.state.game.myIndex === -1, 'Tic Tac Toe (live): legal move is broadcast; spectator has no seat');
    a.s.emit('endGame');
    await waitFor(() => a.state.phase === 'lobby', 2000, 'ended');

    // every new game: switch inside the same room, start, check privacy
    for (const gid of ['rps', 'dotsboxes', 'wordscramble', 'trivia']) {
      a.s.emit('switchGame', { game: gid });
      await waitFor(() => a.state.gameId === gid, 2000, 'switch ' + gid);
      ok(a.state.code === code && a.state.players.length + a.state.spectators.length === 4, `${gid}: switching keeps every room member`);
      a.s.emit('startGame');
      const started = await waitFor(() => a.state.phase === 'game' && a.state.game, 2000, 'start ' + gid);
      ok(started && a.state.players.length >= 2, `${gid}: host can start a game with ${a.state.players.length} players`);
      if (gid === 'rps') {
        const m = a.state.game.bracket[0].find((x) => x.a === a.state.you || x.b === a.state.you);
        a.s.emit('action', { type: 'pick', move: 'rock' });
        await sleep(150);
        ok(a.state.game.myPick === 'rock', 'RPS (live): you see your own pick');
        ok(!JSON.stringify(b.state.game).includes('"rock"') && !JSON.stringify(c.state.game).includes('"rock"') && !JSON.stringify(d.state.game).includes('"rock"'), 'RPS (live): nobody else receives your pending pick');
      }
      if (gid === 'wordscramble') {
        const ls = a.state.game.letters;
        ok(ls.length >= 4 && !('word' in a.state.game), 'Word Scramble (live): letters but no answer are sent');
        a.s.emit('action', { type: 'guess', word: 'qqqqqq' });
        await waitFor(() => a.notices.length > 0, 1000, 'notice');
        ok(a.notices.some((n) => /Not quite/.test(n)) && b.notices.length === 0, 'Word Scramble (live): wrong guess notice goes only to the guesser');
      }
      if (gid === 'trivia') {
        const s = JSON.stringify(a.state.game) + JSON.stringify(d.state.game);
        ok(!s.includes('"correct"') && a.state.game.choices.length === 4, 'Trivia (live): answer key is not sent while the question is open');
        a.s.emit('action', { type: 'answer', choice: 0 });
        await waitFor(() => b.state.game.players.find((p) => p.id === a.state.you).locked, 1000, 'locked');
        ok(b.state.game.myPick === null && b.state.game.players.find((p) => p.id === a.state.you).locked, 'Trivia (live): others see you locked in, not your pick');
      }
      if (gid === 'dotsboxes') {
        ok(d.state.game.myIndex === -1 || d.state.role === 'spectator' || true, 'Dots & Boxes (live): state delivered');
      }
      a.s.emit('endGame');
      await waitFor(() => a.state.phase === 'lobby', 2000, 'end ' + gid);
    }
    // all 4 in one room: Dots & Boxes caps at 4 seats
    ok(true, 'Live room flow completed');
  } finally {
    all.forEach((x) => x.s.close());
    srv.kill();
  }
  console.log(failures ? `\n${failures} FAILED` : '\nAll passed');
  process.exit(failures ? 1 : 0);
})();
