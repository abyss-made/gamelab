// Issue #40 regression tests for the gameplay fixes found in the Phase 2 audit
// (docs/phase-2-gameplay-audit.md). Fake room API, deterministic, no server needed.
// Run: node test/phase2.js
const crypto = require('crypto');
const { GAMES } = require('../server/games');

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};

function fakeRoom(names, gameId, settings, gameCount = 1) {
  const G = GAMES[gameId];
  const members = names.map((n, i) => ({ id: 'p' + i, name: n, avatar: { e: 0, c: 0 }, score: 0 }));
  const log = { sys: [], toMember: [], ended: null, changed: 0 };
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
    rotateLoser: () => null,
    chat: () => {},
    toRoom: () => {},
  };
  const st = G.create({ ...G.defaults, ...settings });
  G.start(st, api);
  const adv = (ms) => { now += ms; G.tick(st, api, now); };
  const idx = (id) => members.findIndex((m) => m.id === id);
  const act = (i, a) => G.onAction(st, members[i], a, api);
  const view = (i) => G.view(st, members[i], now);
  return { G, st, api, members, log, adv, act, view, idx, setNow: (t) => { now = t; }, leave: (i) => G.onLeave(st, members[i].id, api) };
}

// ---------- Ludo: a missed turn counts once, however many timeouts it has ----------
{
  const real = crypto.randomInt;
  crypto.randomInt = (a, b) => (b === undefined ? a - 1 : b - 1); // every die is a 6
  try {
    const r = fakeRoom(['A', 'B', 'C'], 'ludo', { turnTime: 25 });
    const p = r.st.players[r.st.turn];
    // Roll timeout -> auto roll (6) -> move timeout -> auto move -> bonus roll timeout -> ... all one turn.
    for (let i = 0; i < 4 && !p.out && r.st.players[r.st.turn] === p; i++) r.adv(25001);
    ok(!p.out && p.idle === 1, `Ludo: four timeouts inside one missed turn count as one (idle ${p.idle}, out ${p.out})`);
  } finally {
    crypto.randomInt = real;
  }
  // Still removed after IDLE_LIMIT whole missed turns (normal dice).
  const r = fakeRoom(['A', 'B'], 'ludo', { turnTime: 25 });
  const p = r.st.players[r.st.turn];
  let n = 0;
  while (!p.out && n++ < 200) {
    r.adv(25001);
    if (!r.log.ended && r.st.players[r.st.turn] !== p && !p.out) {
      const other = r.st.players[r.st.turn];
      other.idle = 0; // the other player stays active
    }
  }
  ok(p.out || r.log.ended, 'Ludo: a player who misses turn after turn is still removed');
}

// ---------- Color Stack ----------
{
  const r = fakeRoom(['A', 'B', 'C'], 'colorstack', { turnTime: 20 });
  const st = r.st;
  st.discard = [{ id: 900, c: 'r', v: '5' }];
  st.color = 'r';
  st.deck = Array.from({ length: 40 }, (_, k) => ({ id: 1000 + k, c: 'b', v: '7' }));
  const A = st.players[0];
  A.hand = [{ id: 2000, c: 'b', v: '8' }];
  A.idle = 2;
  st.turn = 0;
  st.drawn = null;
  r.act(r.idx(A.id), { type: 'draw' });
  ok(A.idle === 0, 'Color Stack: drawing a card counts as activity (idle reset)');
}
for (const [v, n] of [['D', 2], ['P', 4]]) {
  const r = fakeRoom(['A', 'B'], 'colorstack', { turnTime: 20 });
  const st = r.st;
  const A = st.players[st.turn];
  const B = st.players.find((p) => p !== A);
  st.discard = [{ id: 900, c: 'r', v: '5' }];
  st.color = 'r';
  st.deck = Array.from({ length: 10 }, (_, k) => ({ id: 1000 + k, c: 'g', v: '1' }));
  A.hand = [v === 'D' ? { id: 2000, c: 'r', v: 'D' } : { id: 2000, c: 'w', v: 'P' }];
  B.hand = [{ id: 3000, c: 'b', v: '9' }];
  r.act(r.idx(A.id), { type: 'play', card: 2000, color: 'g' });
  ok(r.log.ended && B.hand.length === 1 + n && r.log.ended.pts === 9 + n, `Color Stack: going out on ${v === 'D' ? '+2' : '+4'} still makes the next player draw ${n}, and they count (pts ${r.log.ended && r.log.ended.pts})`);
}

// ---------- Chess: a move after the flag fell loses on time ----------
{
  const r = fakeRoom(['A', 'B'], 'chess', { clock: 3, increment: 5 });
  const white = r.idx(r.st.players[0]);
  r.setNow(r.api.now() + 3 * 60000 + 200); // flag fell, the room loop has not ticked yet
  r.act(white, { type: 'move', from: 12, to: 28 });
  ok(r.log.ended && r.log.ended.reason === 'time' && r.st.moves.length === 0, `Chess: a move sent after the flag fell is refused and White loses on time (${r.log.ended && r.log.ended.reason})`);
  const r2 = fakeRoom(['A', 'B'], 'chess', { clock: 3, increment: 5 });
  r2.setNow(r2.api.now() + 1000);
  r2.act(r2.idx(r2.st.players[0]), { type: 'move', from: 12, to: 28 });
  ok(!r2.log.ended && r2.st.moves.length === 1, 'Chess: a move inside the clock is still played');
}

// ---------- Word Chain: a dead letter switches to a fresh one ----------
{
  const r = fakeRoom(['A', 'B', 'C'], 'wordchain', { lives: 3, turnTime: 10 });
  const DICT = r.G.DICT;
  // Use up every listed word starting with "x", then play a word ending in "x".
  for (const w of DICT) if (w[0] === 'x') r.st.used.add(w);
  const who = () => r.idx(r.st.players[r.st.turn].id);
  r.st.letter = 'b';
  r.act(who(), { type: 'word', word: 'box' });
  const need = r.view(0).letter;
  ok(r.st.chain.length === 1 && need !== 'x' && [...DICT].some((w) => w[0] === need && !r.st.used.has(w)), `Word Chain: after "box" with no x-words left, the next letter is a playable one ("${need}")`);
  const fresh = [...DICT].find((w) => w[0] === need && !r.st.used.has(w) && w.length >= 3) || 'none';
  r.act(who(), { type: 'word', word: fresh });
  ok(r.st.chain.length === 2, `Word Chain: a word on the fresh letter is accepted ("${fresh}")`);
  ok(r.view(0).letter === fresh.slice(-1), 'Word Chain: the chain continues from the new word\'s last letter');
  const lives = r.st.players.map((p) => p.lives).join();
  ok(lives === '3,3,3', 'Word Chain: nobody lost a life to the dead letter');
  // Dictionary off: no switching (any letters are allowed there).
  const off = fakeRoom(['A', 'B'], 'wordchain', { dictionary: 'off' });
  off.st.letter = 'b';
  off.act(off.idx(off.st.players[off.st.turn].id), { type: 'word', word: 'bqqx' });
  ok(off.view(0).letter === 'x', 'Word Chain: with the dictionary off the chain letter is never changed');
}

// ---------- Drawing Telephone: a blank drawing is a skip ----------
{
  const r = fakeRoom(['A', 'B', 'C'], 'telephone', {});
  for (let i = 0; i < 3; i++) r.act(i, { type: 'text', text: 'cat ' + i });
  r.act(0, { type: 'draw', strokes: [] });
  const p0 = r.st.players.find((p) => p.id === 'p0');
  const e = r.st.chains.flatMap((c) => c.entries).find((x) => x && x.by === 'p0' && x.kind === 'draw');
  ok(e && e.skipped === true && p0.points === 1, `Telephone: an empty drawing earns no point and is marked skipped (points ${p0.points})`);
  r.act(1, { type: 'draw', strokes: [{ t: 's', c: '#000000', s: 6, p: [10, 10, 20, 20] }] });
  const p1 = r.st.players.find((p) => p.id === 'p1');
  ok(p1.points === 2, 'Telephone: a real drawing still earns its point');
}

// ---------- Mini Golf: a player who left shows no score on later holes ----------
{
  const r = fakeRoom(['A', 'B', 'C'], 'golf', {});
  r.leave(2);
  let guard = 0;
  // The other two keep "playing" (auto putts on timeout, idle reset) through the whole course.
  while (!r.log.ended && guard++ < 5000) {
    for (const p of r.st.players) if (!p.out) p.idle = 0;
    r.adv(5000);
  }
  const row = r.log.ended && r.log.ended.standings.find((x) => x.id === 'p2');
  ok(row && row.scores.every((s) => s === null) && row.played === 0, `Mini Golf: a player who left before putting has no scores (${row && JSON.stringify(row.scores)})`);
  // Strokes taken before leaving mid-hole are kept for that hole.
  const r2 = fakeRoom(['A', 'B', 'C'], 'golf', {});
  const p = r2.st.players[2];
  p.strokes = 3;
  r2.leave(2);
  ok(p.scores[0] === 3, 'Mini Golf: strokes taken before leaving mid-hole are recorded for that hole');
}

// ---------- Categories Rush: "I'm done" locks the sheet on the server ----------
{
  const r = fakeRoom(['A', 'B', 'C'], 'categories', {});
  const L = r.st.letter;
  r.act(0, { type: 'answers', answers: ['', '', '', '', ''], done: true });
  r.act(0, { type: 'answers', answers: [L + 'xx', L + 'yy', L + 'zz', L + 'ww', L + 'vv'] });
  ok(r.st.players[0].answers.every((a) => a === ''), 'Categories Rush: answers sent after "I\'m done" are ignored');
}

// ---------- Word Scramble: the shown letters are never already an answer ----------
{
  const WS = GAMES.wordscramble;
  const anagramWords = [...WS._words].filter((w) => {
    const k = w.split('').sort().join('');
    return [...WS._words].some((o) => o !== w && o.length === w.length && o.split('').sort().join('') === k);
  }).slice(0, 30);
  let bad = 0;
  for (const w of anagramWords) for (let i = 0; i < 100; i++) if (WS._words.has(WS.scramble(w).join(''))) bad++;
  ok(anagramWords.length > 0 && bad === 0, `Word Scramble: scrambles of ${anagramWords.length} words with listed anagrams never spell a listed word (${bad} bad)`);
}

console.log(failures ? `\n${failures} FAILED` : '\nAll passed');
process.exit(failures ? 1 : 0);
