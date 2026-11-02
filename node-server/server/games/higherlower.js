// Higher or Lower: guess whether the next hidden card is higher or lower.
// The deck lives on the server and the next card is never sent until it is revealed.
const { shuffle } = require('../util');

const meta = {
  id: 'higherlower',
  name: 'Higher or Lower',
  minPlayers: 2,
  maxPlayers: 8,
  midJoin: false,
  resetScores: true,
  scoreLabel: 'pts',
};

const ROUNDS = [5, 10, 15, 20];
const GUESS_TIMES = [8, 12, 20];
const defaults = { rounds: 10, guessTime: 12 };
const REVEAL_MS = 3000;
const STREAK_CAP = 5;
const IDLE_LIMIT = 3;
const SUITS = ['S', 'H', 'D', 'C'];

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (ROUNDS.includes(s.rounds)) o.rounds = s.rounds;
  if (GUESS_TIMES.includes(s.guessTime)) o.guessTime = s.guessTime;
  return o;
}

function newDeck() {
  const d = [];
  for (const s of SUITS) for (let r = 2; r <= 14; r++) d.push({ r, s });
  return shuffle(d);
}

function create(settings) {
  return { settings: { ...settings }, players: [], deck: [], current: null, next: null, round: 0, phase: 'guess', deadline: 0, over: false, reveal: null };
}

function draw(st) {
  if (!st.deck.length) st.deck = newDeck();
  return st.deck.pop();
}

function start(st, api) {
  st.players = api.seated().map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, streak: 0, best: 0, correct: 0, points: 0, guess: null, idle: 0, out: false }));
  st.deck = newDeck();
  st.current = draw(st);
  deal(st, api);
  api.sys('Higher or Lower: guess if the next card is higher or lower. Aces are high.', 'accent');
  api.changed();
}

function deal(st, api) {
  st.round++;
  st.phase = 'guess';
  st.reveal = null;
  // The next card is drawn up front, kept server-side, and never placed in a view until the reveal.
  st.next = draw(st);
  for (const p of st.players) p.guess = null;
  st.deadline = api.now() + st.settings.guessTime * 1000;
}

const activeP = (st) => st.players.filter((p) => !p.out);

function resolve(st, api) {
  const cur = st.current;
  const nxt = st.next;
  const results = [];
  for (const p of activeP(st)) {
    let outcome;
    if (nxt.r === cur.r) outcome = 'push';
    else if (!p.guess) outcome = 'miss';
    else outcome = (p.guess === 'higher') === (nxt.r > cur.r) ? 'right' : 'wrong';
    let gained = 0;
    if (outcome === 'right') {
      p.streak++;
      p.correct++;
      p.best = Math.max(p.best, p.streak);
      gained = Math.min(p.streak, STREAK_CAP);
      p.points += gained;
    } else if (outcome === 'wrong' || outcome === 'miss') {
      p.streak = 0;
    }
    if (outcome === 'miss') {
      p.idle++;
      if (p.idle >= IDLE_LIMIT) {
        p.out = true;
        api.sys(`${p.name} was away too long and is out.`, 'warn');
      }
    } else p.idle = 0;
    const m = api.member(p.id);
    if (m) m.score = p.points;
    results.push({ id: p.id, guess: p.guess, outcome, gained, streak: p.streak });
  }
  st.reveal = { card: nxt, results };
  st.phase = 'reveal';
  st.deadline = api.now() + REVEAL_MS;
  // st.current stays the card that was guessed against; it is promoted when the next round is dealt.
  api.changed();
}

function onAction(st, m, a, api) {
  if (st.over || st.phase !== 'guess' || !a || a.type !== 'guess') return;
  const p = st.players.find((x) => x.id === m.id);
  if (!p || p.out || p.guess) return; // one guess per round, final once made
  if (a.dir !== 'higher' && a.dir !== 'lower') return;
  p.guess = a.dir;
  if (activeP(st).every((x) => x.guess)) return resolve(st, api);
  api.changed();
}

function finish(st, api, forfeit) {
  if (st.over) return;
  st.over = true;
  const standings = st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, points: p.points, best: p.best, correct: p.correct, out: p.out })).sort((x, y) => y.points - x.points);
  // Players who left or were dropped stay in the standings but can't win.
  const eligible = standings.filter((s) => !s.out);
  const top = eligible[0] ? eligible[0].points : 0;
  const winners = eligible.filter((s) => s.points === top).map((s) => s.id);
  api.sys(!winners.length ? 'Nobody is left, so there is no winner.' : winners.length > 1 ? 'It ends in a tie!' : `${eligible[0].name} wins!`, 'good');
  api.end({ type: 'higherlower', winnerId: winners[0] || null, winners, tie: winners.length > 1, standings, rounds: st.round, forfeit: !!forfeit });
}

function tick(st, api, now) {
  if (st.over || now < st.deadline) return;
  if (st.phase === 'guess') return resolve(st, api);
  if (st.round >= st.settings.rounds || activeP(st).length < 2) return finish(st, api);
  st.current = st.next;
  deal(st, api);
  api.changed();
}

function onLeave(st, id, api) {
  if (st.over) return;
  const p = st.players.find((x) => x.id === id);
  if (!p || p.out) return;
  p.out = true;
  api.sys(`${p.name} left.`, 'warn');
  if (activeP(st).length < 2) return finish(st, api, true);
  if (st.phase === 'guess' && activeP(st).every((x) => x.guess)) return resolve(st, api);
  api.changed();
}

function view(st, m, now) {
  const me = st.players.find((p) => p.id === m.id);
  return {
    players: st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, streak: p.streak, points: p.points, out: p.out, locked: st.phase === 'guess' ? !!p.guess : true })),
    current: st.current,
    phase: st.phase,
    round: st.round,
    rounds: st.settings.rounds,
    myGuess: me ? me.guess : null, // only your own pick is sent before the reveal
    reveal: st.phase === 'reveal' ? st.reveal : null,
    timeLeft: Math.max(0, st.deadline - now),
    totalTime: (st.phase === 'guess' ? st.settings.guessTime * 1000 : REVEAL_MS),
    myIndex: st.players.findIndex((p) => p.id === m.id),
  };
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view };
