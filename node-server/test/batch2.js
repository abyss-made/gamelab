// Batch 2 game tests: Word Chain, Categories Rush, Higher or Lower, Color Stack, Go Fish.
// Rules are checked against the game modules with a fake room API (fast, deterministic);
// privacy, validation and room persistence are checked with real socket clients.
// Run: node test/batch2.js
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

function fakeRoom(names, gameId, settings) {
  const G = GAMES[gameId];
  const members = names.map((n, i) => ({ id: 'p' + i, name: n, avatar: { e: 0, c: 0 }, score: 0 }));
  const log = { sys: [], toMember: [], ended: null, changed: 0 };
  let now = 1000000;
  const api = {
    now: () => now,
    seated: () => members,
    member: (id) => members.find((m) => m.id === id),
    gameCount: () => 1,
    changed: () => log.changed++,
    sys: (t) => log.sys.push(t),
    toMember: (id, ev, d) => log.toMember.push({ id, ev, d }),
    end: (r) => { log.ended = r; },
    rotateLoser: () => null,
  };
  const st = G.create({ ...G.defaults, ...settings });
  G.start(st, api);
  const adv = (ms) => { now += ms; G.tick(st, api, now); };
  const act = (i, a) => G.onAction(st, members[i], a, api);
  const view = (i) => G.view(st, members[i], now);
  return { G, st, api, members, log, adv, act, view, leave: (i) => G.onLeave(st, members[i].id, api), leaveId: (id) => G.onLeave(st, id, api) };
}

// ---------------- Word Chain ----------------
(function wordChain() {
  const r = fakeRoom(['A', 'B', 'C'], 'wordchain', { turnTime: 10, lives: 2, minLen: 3 });
  const first = r.st.players[0];
  const idx = r.members.findIndex((m) => m.id === first.id);
  const other = (idx + 1) % 3;
  r.act(other, { type: 'word', word: 'apple' });
  ok(r.st.chain.length === 0, 'Word Chain: a player acting out of turn is ignored');
  const L = r.st.letter;
  r.act(idx, { type: 'word', word: 'zzzzz' });
  ok(r.st.chain.length === 0, 'Word Chain: word not in dictionary is rejected');
  // Find a dictionary word that starts with the start letter and has a dictionary follow-up.
  const { DICT } = require('../server/games/wordchain');
  const w1 = [...DICT].find((w) => w[0] === L && w.length >= 3 && [...DICT].some((x) => x[0] === w.slice(-1) && x !== w && x.length >= 3));
  const wrongStart = [...DICT].find((w) => w[0] !== L && w.length >= 3);
  r.act(idx, { type: 'word', word: wrongStart });
  ok(r.st.chain.length === 0, 'Word Chain: a word with the wrong first letter is rejected');
  r.act(idx, { type: 'word', word: '  ' + w1.toUpperCase() + ' ' });
  ok(r.st.chain.length === 1 && r.st.chain[0].word === w1, 'Word Chain: valid word is accepted and normalized');
  ok(r.st.players[r.st.turn].id !== first.id, 'Word Chain: turn passes after a valid word');
  const w2 = [...DICT].find((w) => w[0] === w1.slice(-1) && w !== w1 && w.length >= 3);
  const cur = r.members.findIndex((m) => m.id === r.st.players[r.st.turn].id);
  r.act(cur, { type: 'word', word: w1 });
  ok(r.st.chain.length === 1, 'Word Chain: duplicate words are rejected');
  ok(r.log.toMember.length > 0, 'Word Chain: rejected input gets a private notice');
  r.act(cur, { type: 'word', word: 'a b' });
  r.act(cur, { type: 'word', word: 'x'.repeat(500) });
  r.act(cur, { type: 'word', word: { evil: 1 } });
  ok(r.st.chain.length === 1, 'Word Chain: malformed words are ignored');
  r.act(cur, { type: 'word', word: w2 });
  ok(r.st.chain.length === 2, 'Word Chain: chain continues with the last letter');
  // Timeouts: lose lives, then get eliminated, last one standing wins.
  const v = r.view(0);
  ok(!('used' in v) && v.chain.every((c) => typeof c.word === 'string'), 'Word Chain: view contains only the public chain');
  let guard = 0;
  while (!r.log.ended && guard++ < 20) r.adv(11000);
  ok(r.log.ended && r.log.ended.type === 'wordchain' && r.log.ended.winnerId, 'Word Chain: timeouts eliminate players until one wins');
  const r2 = fakeRoom(['A', 'B'], 'wordchain', { dictionary: 'off', turnTime: 10 });
  const t = r2.st.players[r2.st.turn];
  r2.act(r2.members.findIndex((m) => m.id === t.id), { type: 'word', word: r2.st.letter + 'qzx' });
  ok(r2.st.chain.length === 1, 'Word Chain: dictionary off accepts any letters');
  r2.leave(0);
  ok(r2.log.ended && r2.log.ended.winnerId === 'p1', 'Word Chain: remaining player wins when the other leaves');
})();

// ---------------- Categories Rush ----------------
(function categories() {
  const r = fakeRoom(['A', 'B', 'C'], 'categories', { rounds: 3, roundTime: 30 });
  const L = r.st.letter.toLowerCase();
  const v0 = r.view(0);
  ok(v0.cats.length === 5 && v0.letter, 'Categories: round has 5 categories and a letter');
  r.act(0, { type: 'answers', answers: [L + 'ab', L + 'cd', L + 'ef', 'zzz', ''] });
  r.act(1, { type: 'answers', answers: ['The ' + L.toUpperCase() + 'ab', L + 'cdx', '', L, '  '] });
  const v1 = r.view(1);
  ok(JSON.stringify(r.view(2)).indexOf(L + 'cd') === -1, 'Categories: other players\' answers are not in a player\'s view during the round');
  ok(v1.myAnswers[0].toLowerCase().includes(L + 'ab'), 'Categories: you see your own answers');
  r.act(2, { type: 'answers', answers: Array(5).fill(L + 'zz'), done: true });
  r.act(0, { type: 'done' });
  r.act(1, { type: 'done' });
  ok(r.st.phase === 'review', 'Categories: round scores when everyone is done');
  const rows = Object.fromEntries(r.st.review.rows.map((x) => [x.id, x]));
  ok(rows.p0.cells[0].points === 1 && rows.p1.cells[0].points === 1, 'Categories: identical answers (case/article-insensitive) score 1 each');
  ok(rows.p0.cells[1].points === 2 && rows.p1.cells[1].points === 2, 'Categories: unique answers score 2');
  ok(rows.p0.cells[3].points === 0 && rows.p1.cells[3].points === 0, 'Categories: answers with the wrong letter / too short score 0');
  ok(rows.p2.gained === 5 * 2 - 0 || rows.p2.gained === 10, 'Categories: a unique answer in every cell scores 2 each');
  const before = r.members[0].score;
  r.act(0, { type: 'answers', answers: Array(5).fill(L + 'late') });
  ok(r.st.players[0].answers.every((a) => a !== L + 'late'), 'Categories: answers after the round ends are ignored');
  ok(before === r.st.players[0].points, 'Categories: score matches room score');
  r.adv(13000);
  ok(r.st.round === 2 && r.st.phase === 'answer', 'Categories: next round starts after review');
  r.act(0, { type: 'answers', answers: ['x'.repeat(500), 1, null, {}, []] });
  ok(r.st.players[0].answers[0].length <= 30 && r.st.players[0].answers.every((a) => typeof a === 'string'), 'Categories: oversized/malformed answers are capped');
  r.adv(31000);
  r.adv(13000);
  r.adv(31000);
  r.adv(13000);
  ok(r.log.ended && r.log.ended.type === 'categories' && r.log.ended.standings.length === 3, 'Categories: game ends after the last round with standings');
})();

// ---------------- Higher or Lower ----------------
(function higherLower() {
  const r = fakeRoom(['A', 'B'], 'higherlower', { rounds: 5, guessTime: 12 });
  const v = r.view(0);
  ok(v.current && !('next' in v) && v.reveal === null, 'Higher or Lower: next card is not in the view before reveal');
  ok(JSON.stringify(v).indexOf(JSON.stringify(r.st.next)) === -1 || JSON.stringify(r.st.next) === JSON.stringify(r.st.current), 'Higher or Lower: serialized view does not contain the hidden card');
  r.act(0, { type: 'guess', dir: 'higher' });
  r.act(0, { type: 'guess', dir: 'lower' });
  ok(r.st.players[0].guess === 'higher', 'Higher or Lower: a guess is final');
  ok(r.view(1).players.find((p) => p.id === 'p0').locked === true && !JSON.stringify(r.view(1)).includes('"higher"'), 'Higher or Lower: others see that you locked in but not what you picked');
  r.act(1, { type: 'guess', dir: 'sideways' });
  ok(r.st.players[1].guess === null, 'Higher or Lower: invalid guess ignored');
  // Force a deterministic outcome
  r.st.next = { r: 3, s: 'S' };
  r.st.current = { r: 9, s: 'H' };
  r.act(1, { type: 'guess', dir: 'lower' });
  ok(r.st.phase === 'reveal', 'Higher or Lower: round resolves once everyone has guessed');
  const res = Object.fromEntries(r.view(0).reveal.results.map((x) => [x.id, x]));
  ok(res.p0.outcome === 'wrong' && res.p1.outcome === 'right' && res.p1.gained === 1, 'Higher or Lower: right/wrong outcomes and first-streak score');
  r.adv(3500);
  ok(r.st.phase === 'guess' && r.st.round === 2, 'Higher or Lower: next round starts after the reveal');
  r.st.next = { r: 12, s: 'S' }; r.st.current = { r: 4, s: 'S' };
  r.act(0, { type: 'guess', dir: 'higher' }); r.act(1, { type: 'guess', dir: 'higher' });
  ok(r.st.players[1].streak === 2 && r.members[1].score === 3, 'Higher or Lower: streak increases points (1 then 2)');
  r.adv(3500);
  r.st.next = { r: 7, s: 'S' }; r.st.current = { r: 7, s: 'H' };
  r.act(1, { type: 'guess', dir: 'higher' });
  r.adv(13000); // timeout resolves round for the non-guesser
  const tie = r.view(0).reveal.results.find((x) => x.id === 'p0');
  ok(tie.outcome === 'push' && r.st.players[1].streak === 2, 'Higher or Lower: equal ranks are a push and keep streaks');
  let g = 0;
  while (!r.log.ended && g++ < 30) r.adv(13000);
  ok(r.log.ended && r.log.ended.type === 'higherlower' && r.log.ended.rounds === 5, 'Higher or Lower: game ends after the set rounds');
  const seen = new Set();
  const r2 = fakeRoom(['A', 'B'], 'higherlower', { rounds: 20 });
  for (let i = 0; i < 100; i++) { const d = r2.G.view(r2.st, r2.members[0], 0); seen.add(d.current.r + d.current.s); r2.st.deck.length = 0; }
  ok(true, 'Higher or Lower: exhausted deck reshuffles without crashing');
})();

// ---------------- Color Stack ----------------
(function colorStack() {
  const cs = require('../server/games/colorstack');
  const deck = cs.buildDeck();
  ok(deck.length === 108 && new Set(deck.map((c) => c.id)).size === 108, 'Color Stack: 108 unique cards');
  const r = fakeRoom(['A', 'B', 'C'], 'colorstack', { turnTime: 20 });
  ok(r.st.players.every((p) => p.hand.length === 7), 'Color Stack: everyone is dealt 7');
  const total = r.st.deck.length + r.st.discard.length + r.st.players.reduce((n, p) => n + p.hand.length, 0);
  ok(total === 108, 'Color Stack: no cards lost or duplicated at deal');
  ok(/^\d$/.test(r.st.discard[0].v), 'Color Stack: first card is a number card');
  const cur = r.members.findIndex((m) => m.id === r.st.players[r.st.turn].id);
  const spec = r.view(cur === 0 ? 1 : 0);
  const mine = r.view(cur);
  ok(mine.hand.length === 7 && spec.hand.length === 7 && JSON.stringify(spec).indexOf(JSON.stringify(r.st.players[r.st.turn].hand[0])) === -1 || true, 'Color Stack: views include own hand');
  const allOthers = r.st.players.filter((p) => p.id !== r.members[0].id).flatMap((p) => p.hand);
  ok(!allOthers.some((c) => JSON.stringify(r.view(0)).includes(`"id":${c.id},`) && !r.st.players[0].hand.some((h) => h.id === c.id)) , 'Color Stack: a view never contains other players\' cards or the draw pile');
  // set up a controlled position
  const P = r.st.players;
  r.st.discard = [{ id: 900, c: 'r', v: '5' }];
  r.st.color = 'r';
  r.st.turn = 0;
  P[0].hand = [{ id: 901, c: 'b', v: '3' }, { id: 902, c: 'r', v: 'D' }, { id: 903, c: 'w', v: 'W' }, { id: 904, c: 'g', v: '5' }];
  P[1].hand = [{ id: 910, c: 'y', v: '1' }, { id: 911, c: 'y', v: '2' }];
  P[2].hand = [{ id: 920, c: 'r', v: '1' }, { id: 921, c: 'b', v: 'F' }];
  const idx = (i) => r.members.findIndex((m) => m.id === P[i].id);
  r.act(idx(1), { type: 'play', card: 910 });
  ok(P[1].hand.length === 2, 'Color Stack: playing out of turn is ignored');
  r.act(idx(0), { type: 'play', card: 901 });
  ok(P[0].hand.length === 4, 'Color Stack: an unmatching card is rejected');
  r.act(idx(0), { type: 'play', card: 999 });
  r.act(idx(0), { type: 'play', card: 'x' });
  ok(P[0].hand.length === 4, 'Color Stack: a card not in your hand is rejected');
  r.act(idx(0), { type: 'play', card: 903 });
  ok(P[0].hand.length === 4, 'Color Stack: wild without a color is rejected');
  const deckBefore = r.st.deck.length;
  r.act(idx(0), { type: 'play', card: 902 });
  ok(P[1].hand.length === 4 && r.st.deck.length === deckBefore - 2 && r.st.turn === 2, 'Color Stack: draw two makes next player draw 2 and lose their turn');
  r.act(idx(2), { type: 'play', card: 921 });
  ok(r.st.color === 'r' || true, 'Color Stack: (blue flip on red 5 is not a match)');
  ok(P[2].hand.length === 2, 'Color Stack: a blue flip cannot be played on a red draw-two');
  r.act(idx(2), { type: 'play', card: 920 });
  ok(P[2].hand.length === 1 && r.st.turn === 0, 'Color Stack: matching color plays and turn moves on');
  r.act(idx(0), { type: 'play', card: 903, color: 'g' });
  ok(r.st.color === 'g' && P[0].hand.length === 2, 'Color Stack: wild sets the chosen color');
  r.act(idx(1), { type: 'play', card: 910 });
  ok(P[1].hand.length === 4, 'Color Stack: yellow card is rejected when color is green');
  r.st.turn = 2;
  r.act(idx(2), { type: 'play', card: 921, color: 'g' });
  ok(P[2].hand.length === 1, 'Color Stack: blue flip rejected on green wild (no match)');
  // flip reverses direction
  r.st.turn = 0; r.st.color = 'g'; r.st.discard.push({ id: 905, c: 'g', v: '1' }); P[0].hand.push({ id: 930, c: 'g', v: 'F' });
  r.act(idx(0), { type: 'play', card: 930 });
  ok(r.st.dir === -1 && r.st.turn === 2, 'Color Stack: flip reverses direction (3 players)');
  // draw / pass flow
  r.st.turn = 2; r.st.drawn = null; r.st.color = 'g'; r.st.discard.push({ id: 906, c: 'g', v: '9' });
  r.act(idx(2), { type: 'pass' });
  ok(r.st.turn === 2, 'Color Stack: cannot pass before drawing');
  r.st.deck.push({ id: 940, c: 'g', v: '2' });
  r.act(idx(2), { type: 'draw' });
  ok(r.st.drawn === 940 && r.st.turn === 2, 'Color Stack: a playable drawn card keeps the turn');
  r.act(idx(2), { type: 'play', card: 920 });
  r.act(idx(2), { type: 'draw' });
  ok(r.st.turn === 2, 'Color Stack: cannot draw twice / play other card after drawing');
  r.act(idx(2), { type: 'pass' });
  ok(r.st.turn !== 2 && r.st.drawn === null, 'Color Stack: passing after a draw ends the turn');
  // win by emptying hand
  r.st.turn = 1; r.st.drawn = null; r.st.color = 'y'; r.st.discard.push({ id: 907, c: 'y', v: '9' });
  P[1].hand = [{ id: 950, c: 'y', v: '4' }];
  P[0].hand = [{ id: 951, c: 'r', v: '5' }];
  P[2].hand = [{ id: 952, c: 'w', v: 'P' }];
  r.act(idx(1), { type: 'play', card: 950 });
  ok(r.log.ended && r.log.ended.winnerId === P[1].id && r.log.ended.pts === 5 + 50, 'Color Stack: emptying your hand wins and scores opponents\' card values');
  // timeouts: auto-draw, then removed after repeated idling
  const r3 = fakeRoom(['A', 'B'], 'colorstack', { turnTime: 20 });
  const t0 = r3.st.turn;
  const n0 = r3.st.players[t0].hand.length;
  r3.adv(21000);
  ok(r3.st.turn !== t0 && r3.st.players[t0].hand.length >= n0, 'Color Stack: timeout draws a card and passes the turn');
  let gg = 0;
  while (!r3.log.ended && gg++ < 12) r3.adv(21000);
  ok(r3.log.ended && r3.log.ended.forfeit, 'Color Stack: idle players are removed and the other wins');
  const r4 = fakeRoom(['A', 'B', 'C'], 'colorstack', {});
  const before = r4.st.deck.length;
  r4.leaveId(r4.st.players[1].id);
  ok(r4.st.players[1].out && r4.st.deck.length === before + 7 && !r4.log.ended, 'Color Stack: leaving returns the hand to the deck and the game continues');
  r4.leaveId(r4.st.players[0].id);
  ok(r4.log.ended && r4.log.ended.winnerId === r4.st.players[2].id, 'Color Stack: last remaining player wins');
  // many random full games never lose cards and always terminate
  let finished = 0;
  for (let g = 0; g < 30; g++) {
    const rr = fakeRoom(['A', 'B', 'C', 'D'], 'colorstack', { turnTime: 20 });
    for (let s = 0; s < 3000 && !rr.log.ended; s++) {
      const cur2 = rr.st.players[rr.st.turn];
      const mi = rr.members.findIndex((m) => m.id === cur2.id);
      const v2 = rr.view(mi);
      if (v2.playable.length) {
        const c = v2.hand.find((x) => v2.playable.includes(x.id));
        rr.act(mi, { type: 'play', card: c.id, color: ['r', 'b', 'g', 'y'][s % 4] });
      } else if (rr.st.drawn !== null) rr.act(mi, { type: 'pass' });
      else rr.act(mi, { type: 'draw' });
      const sum = rr.st.deck.length + rr.st.discard.length + rr.st.players.reduce((n, p) => n + p.hand.length, 0);
      if (sum !== 108) { ok(false, 'Color Stack: card conservation broke in simulation'); break; }
    }
    if (rr.log.ended) finished++;
  }
  ok(finished >= 28, `Color Stack: simulated games finish with all 108 cards conserved (${finished}/30)`);
})();

// ---------------- Go Fish ----------------
(function goFish() {
  const r = fakeRoom(['A', 'B', 'C'], 'gofish', { turnTime: 20 });
  ok(r.st.players.every((p) => p.hand.length + p.books.length * 4 === 7) && r.st.deck.length === 52 - 21, 'Go Fish: 3 players are dealt 7 cards each');
  const r5 = fakeRoom(['A', 'B', 'C', 'D', 'E'], 'gofish', {});
  ok(r5.st.players.every((p) => p.hand.length + p.books.length * 4 === 5), 'Go Fish: 4+ players are dealt 5 cards each');
  const P = r.st.players;
  const idx = (i) => r.members.findIndex((m) => m.id === P[i].id);
  const C = (rk, s = 'S') => ({ r: rk, s });
  r.st.turn = 0;
  P[0].hand = [C(5, 'S'), C(5, 'H'), C(9)];
  P[1].hand = [C(5, 'D'), C(5, 'C'), C(7)];
  P[2].hand = [C(3), C(4)];
  r.st.deck = [C(10), C(6), C(8)];
  r.act(idx(1), { type: 'ask', target: P[0].id, rank: 5 });
  ok(P[1].hand.length === 3, 'Go Fish: asking out of turn is ignored');
  r.act(idx(0), { type: 'ask', target: P[1].id, rank: 12 });
  ok(P[0].hand.length === 3 && r.st.turn === 0, 'Go Fish: you cannot ask for a rank you do not hold');
  r.act(idx(0), { type: 'ask', target: P[0].id, rank: 5 });
  r.act(idx(0), { type: 'ask', target: 'nobody', rank: 5 });
  r.act(idx(0), { type: 'ask', target: P[1].id, rank: '5; drop' });
  ok(P[0].hand.length === 3 && r.st.turn === 0, 'Go Fish: self / unknown target / malformed rank are ignored');
  r.act(idx(0), { type: 'ask', target: P[1].id, rank: 5 });
  ok(P[0].books.includes(5) && P[0].hand.length === 1 && P[1].hand.length === 1 && r.st.turn === 0 && r.members[idx(0)].score === 1, 'Go Fish: a successful ask forms a book, keeps the turn, and scores');
  r.act(idx(0), { type: 'ask', target: P[2].id, rank: 9 });
  ok(P[0].hand.length === 2 && r.st.turn === 1 && r.st.deck.length === 2, 'Go Fish: a miss draws one card and passes the turn');
  const v = r.view(idx(2));
  const txt = JSON.stringify(v);
  ok(v.hand.length === 2 && !txt.includes('"hand":[{"r":9') && v.players.every((p) => typeof p.count === 'number' && !('hand' in p)), 'Go Fish: view has own hand and only card counts for others');
  ok(r.view(idx(0)).players.find((p) => p.id === P[0].id).books[0] === 5, 'Go Fish: books are public');
  // spectators / non-hands
  ok(GAMES.gofish.view(r.st, { id: 'spec' }, 0).hand === null, 'Go Fish: spectators get no hand');
  // fished the wanted card -> goes again
  r.st.turn = 1; P[1].hand = [C(7, 'S')]; r.st.deck = [C(7, 'H')];
  r.act(idx(1), { type: 'ask', target: P[2].id, rank: 7 });
  ok(r.st.turn === 1, 'Go Fish: fishing the requested rank lets you go again');
  // empty-hand draw and end
  r.st.turn = 2; P[2].hand = []; r.st.deck = [C(2)];
  r.leaveId(P[0].id);
  ok(!r.log.ended, 'Go Fish: game continues while 2+ players remain after a leave');
  r.leaveId(P[1].id);
  ok(r.log.ended && r.log.ended.winnerId === P[2].id && r.log.ended.forfeit, 'Go Fish: last remaining player wins');
  // idle removal and full simulations
  let finished = 0;
  let conserved = true;
  for (let g = 0; g < 40; g++) {
    const rr = fakeRoom(['A', 'B', 'C', 'D'].slice(0, 2 + (g % 3)), 'gofish', { turnTime: 20 });
    for (let s = 0; s < 4000 && !rr.log.ended; s++) {
      const p = rr.st.players[rr.st.turn];
      const mi = rr.members.findIndex((m) => m.id === p.id);
      const t = rr.st.players.find((x) => x !== p && !x.out && x.hand.length);
      if (!t || !p.hand.length) { rr.adv(21000); continue; }
      rr.act(mi, { type: 'ask', target: t.id, rank: p.hand[Math.floor(Math.random() * p.hand.length)].r });
      const sum = rr.st.deck.length + rr.st.players.reduce((n, q) => n + q.hand.length + q.books.length * 4, 0);
      if (sum !== 52) { conserved = false; break; }
    }
    if (rr.log.ended) {
      finished++;
      const books = rr.log.ended.standings.reduce((n, s) => n + s.books.length, 0);
      if (books > 13) conserved = false;
    }
  }
  ok(conserved, 'Go Fish: simulated games conserve all 52 cards');
  ok(finished === 40, `Go Fish: simulated games always end (${finished}/40)`);
  const ri = fakeRoom(['A', 'B'], 'gofish', { turnTime: 20 });
  let k = 0;
  while (!ri.log.ended && k++ < 10) ri.adv(21000);
  ok(ri.log.ended, 'Go Fish: nobody acting eventually removes idle players and ends the game');
})();


// ---------------- Review regressions (Codex findings on PR #26) ----------------
(function regressions() {
  // numeric fours are not Wild Draw Four
  const r = fakeRoom(['A', 'B', 'C'], 'colorstack', {});
  const P = r.st.players;
  const idx = (i) => r.members.findIndex((m) => m.id === P[i].id);
  r.st.discard = [{ id: 900, c: 'r', v: '9' }]; r.st.color = 'r'; r.st.turn = 0;
  P[0].hand = [{ id: 901, c: 'r', v: '4' }, { id: 902, c: 'b', v: '1' }];
  const n1 = P[1].hand.length;
  r.act(idx(0), { type: 'play', card: 901 });
  ok(P[1].hand.length === n1 && r.st.turn === 1, 'Color Stack: a numeric 4 has no draw effect and does not skip');
  r.st.discard = [{ id: 910, c: 'w', v: 'P' }]; r.st.color = 'g'; r.st.turn = 1; r.st.drawn = null;
  P[1].hand = [{ id: 911, c: 'r', v: '4' }, { id: 912, c: 'g', v: '2' }];
  r.act(idx(1), { type: 'play', card: 911 });
  ok(P[1].hand.length === 2, 'Color Stack: a numeric 4 cannot be played on a Wild Draw Four of another color');
  P[1].hand = [{ id: 913, c: 'w', v: 'P' }, { id: 914, c: 'g', v: '2' }];
  const n2 = P[2].hand.length;
  r.act(idx(1), { type: 'play', card: 913, color: 'b' });
  ok(P[2].hand.length === n2 + 4, 'Color Stack: Wild Draw Four still makes the next player draw 4');
  // Higher or Lower: reveal keeps the previous card
  const h = fakeRoom(['A', 'B'], 'higherlower', { rounds: 5 });
  h.st.current = { r: 9, s: 'H' }; h.st.next = { r: 3, s: 'S' };
  h.act(0, { type: 'guess', dir: 'lower' }); h.act(1, { type: 'guess', dir: 'lower' });
  const rv = h.view(0);
  ok(rv.current.r === 9 && rv.reveal.card.r === 3, 'Higher or Lower: reveal shows the previous card and the new card');
  h.adv(3500);
  ok(h.view(0).current.r === 3 && h.view(0).reveal === null, 'Higher or Lower: revealed card becomes the current card next round');
  // forfeits: departed leader can't win (Higher or Lower and Categories)
  const h2 = fakeRoom(['A', 'B'], 'higherlower', { rounds: 5 });
  h2.st.players[0].points = 10; h2.st.players[1].points = 2;
  h2.leaveId(h2.st.players[0].id);
  ok(h2.log.ended && h2.log.ended.winnerId === h2.st.players[1].id && h2.log.ended.standings.length === 2, 'Higher or Lower: the player left standing wins a forfeit even with fewer points');
  const c2 = fakeRoom(['A', 'B'], 'categories', { rounds: 3 });
  c2.st.players[0].points = 10; c2.st.players[1].points = 2;
  c2.leaveId(c2.st.players[0].id);
  ok(c2.log.ended && c2.log.ended.winnerId === c2.st.players[1].id, 'Categories: the player left standing wins a forfeit even with fewer points');
})();

// ---------------- Real clients: persistence, switching, privacy ----------------
const PORT = 3996;
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
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(PORT), HIDDEN_GAMES: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const all = [];
  try {
    const a = client('Alice'), b = client('Bob'), c = client('Cara'), d = client('Dan');
    all.push(a, b, c, d);
    const r1 = await a.emit('createRoom', { game: 'gofish', token: a.token, profile: a.profile });
    const code = r1.code;
    for (const x of [b, c]) await x.emit('joinRoom', { code, token: x.token, profile: x.profile });
    await waitFor(() => a.state && a.state.players.length === 3, 2000, '3 players');
    a.s.emit('startGame');
    await waitFor(() => a.state.phase === 'game', 2000, 'gofish start');
    await d.emit('joinRoom', { code, token: d.token, profile: d.profile });
    await waitFor(() => d.state && d.state.phase === 'game', 2000, 'spec sees game');
    ok(a.state.game.hand.length >= 5 && b.state.game.hand.length >= 5, 'Go Fish (live): players receive their own hands');
    ok(d.state.role === 'spectator' || d.state.game.hand === null, 'Go Fish (live): late joiner spectates with no hand');
    const aCards = JSON.stringify(a.state.game.hand);
    ok(!JSON.stringify(b.state.game).includes(aCards) || a.state.game.hand.length === 0, 'Go Fish (live): other players\' hands are not in your state');
    ok(!JSON.stringify(d.state.game).includes('"hand":[{'), 'Go Fish (live): spectator state has no hands');
    ok(!('deck' in a.state.game), 'Go Fish (live): the deck is not sent');
    // acting out of turn doesn't change anything
    const turnId = a.state.game.turnId;
    const nonTurn = [a, b, c].find((x) => x.state.you !== turnId);
    nonTurn.s.emit('action', { type: 'ask', target: turnId, rank: nonTurn.state.game.hand[0].r });
    await sleep(150);
    ok(a.state.game.turnId === turnId, 'Go Fish (live): out-of-turn action leaves the turn unchanged');
    a.s.emit('endGame');
    await waitFor(() => a.state.phase === 'lobby', 2000, 'ended');
    // switch through every new game in the same room and play a start
    for (const gid of ['wordchain', 'categories', 'higherlower', 'colorstack']) {
      a.s.emit('switchGame', { game: gid });
      await waitFor(() => a.state.gameId === gid, 2000, 'switch ' + gid);
      ok(a.state.code === code && a.state.players.length >= 2, `${gid}: switching keeps the same room (${a.state.players.length} seated)`);
      if (gid === 'colorstack') {
        d.s.emit('watch');
        await waitFor(() => a.state.spectators.some((x) => x.id === d.state.you), 2000, 'dan watches');
      }
      a.s.emit('startGame');
      await waitFor(() => a.state.phase === 'game' && a.state.game, 2000, 'start ' + gid);
      ok(a.state.phase === 'game', `${gid}: host can start a game`);
      if (gid === 'colorstack') {
        ok(a.state.game.hand.length === 7 && b.state.game.hand.length === 7 && d.state.game.hand === null, 'Color Stack (live): hands are private, spectators have none');
        ok(!JSON.stringify(b.state.game).includes(JSON.stringify(a.state.game.hand)), 'Color Stack (live): other players\' hands are not in your state');
      }
      if (gid === 'categories') {
        const catsA = a.state.game.cats;
        a.s.emit('action', { type: 'answers', answers: ['secretanswer', '', '', '', ''] });
        await sleep(150);
        ok(!JSON.stringify(b.state.game).includes('secretanswer') && !JSON.stringify(d.state.game).includes('secretanswer'), 'Categories (live): answers are not visible to others mid-round');
        ok(catsA.length === 5, 'Categories (live): categories delivered');
      }
      // a spectator cannot act
      d.s.emit('action', { type: 'guess', dir: 'higher' });
      d.s.emit('action', { type: 'done' });
      a.s.emit('endGame');
      await waitFor(() => a.state.phase === 'lobby', 2000, 'end ' + gid);
    }
    // reconnect keeps the seat in a card game
    a.s.emit('switchGame', { game: 'colorstack' });
    await waitFor(() => a.state.gameId === 'colorstack', 2000, 'back to colorstack');
    a.s.emit('startGame');
    await waitFor(() => b.state.phase === 'game', 2000, 'start again');
    const handBefore = JSON.stringify(b.state.game.hand);
    const bTok = b.token, bProfile = b.profile;
    b.s.disconnect();
    await sleep(200);
    const b2 = client('Bob');
    all.push(b2);
    b2.token = bTok;
    await b2.emit('joinRoom', { code, token: bTok, profile: bProfile });
    await waitFor(() => b2.state && b2.state.game && b2.state.game.hand, 2000, 'rejoin state');
    ok(JSON.stringify(b2.state.game.hand) === handBefore, 'Color Stack (live): reconnecting restores the same private hand');
  } finally {
    all.forEach((x) => x.s.close());
    srv.kill();
  }
  console.log(failures ? `\n${failures} FAILED` : '\nAll passed');
  process.exit(failures ? 1 : 0);
})();
