// Word Scramble: everyone unscrambles the same word. The letters are public, the answer is not.
// Guesses are checked on the server; faster correct answers score more.
const fs = require('fs');
const path = require('path');
const { shuffle } = require('../util');
const filter = require('../filter');

const meta = {
  id: 'wordscramble',
  name: 'Word Scramble',
  minPlayers: 2,
  maxPlayers: 12,
  midJoin: false,
  resetScores: true,
  scoreLabel: 'pts',
};

const ROUNDS = [5, 8, 12];
const ROUND_TIMES = [20, 30, 45];
const DIFFS = ['easy', 'medium', 'hard'];
const defaults = { rounds: 8, roundTime: 30, difficulty: 'medium' };
const REVEAL_MS = 4000;
const MAX_GUESS = 24;
const BASE = 50;
const SPEED = 50;
const FIRST_BONUS = 20;
const LEN = { easy: [4, 5], medium: [6, 6], hard: [7, 11] };

const WORDS = new Set();
const POOL = { easy: [], medium: [], hard: [] };
(function load() {
  const txt = fs.readFileSync(path.join(__dirname, '..', 'data', 'wordchain.txt'), 'utf8').split(/\s+/);
  for (const w0 of txt) {
    const w = w0.toLowerCase();
    if (!/^[a-z]{4,11}$/.test(w) || filter.hasBad(w)) continue;
    WORDS.add(w);
    for (const d of DIFFS) if (w.length >= LEN[d][0] && w.length <= LEN[d][1] && new Set(w).size > 2) POOL[d].push(w);
  }
})();

// Anagram key: lets us accept any dictionary word that uses exactly the same letters.
const key = (w) => w.split('').sort().join('');

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (ROUNDS.includes(s.rounds)) o.rounds = s.rounds;
  if (ROUND_TIMES.includes(s.roundTime)) o.roundTime = s.roundTime;
  if (DIFFS.includes(s.difficulty)) o.difficulty = s.difficulty;
  return o;
}

function create(settings) {
  return { settings: { ...settings }, players: [], round: 0, phase: 'play', word: '', letters: [], used: new Set(), deadline: 0, over: false, reveal: null, solveOrder: [] };
}

function scramble(word) {
  for (let i = 0; i < 20; i++) {
    const s = shuffle(word.split(''));
    if (s.join('') !== word) return s;
  }
  return word.split('').reverse();
}

function start(st, api) {
  st.players = api.seated().map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, points: 0, solved: 0, gained: 0, solvedAt: 0, out: false }));
  api.sys('Word Scramble: unscramble the letters before time runs out. Faster answers score more.', 'accent');
  deal(st, api);
  api.changed();
}

function pickWord(st) {
  const pool = POOL[st.settings.difficulty];
  for (let i = 0; i < 50; i++) {
    const w = pool[Math.floor(Math.random() * pool.length)];
    if (!st.used.has(w)) return w;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function deal(st, api) {
  st.round++;
  st.phase = 'play';
  st.reveal = null;
  st.word = pickWord(st);
  st.used.add(st.word);
  st.letters = scramble(st.word);
  st.solveOrder = [];
  for (const p of st.players) {
    p.solvedAt = 0;
    p.gained = 0;
  }
  st.deadline = api.now() + st.settings.roundTime * 1000;
}

const activeP = (st) => st.players.filter((p) => !p.out);

function endRound(st, api) {
  st.phase = 'reveal';
  st.reveal = { word: st.word, solvers: st.solveOrder.slice(), gains: st.players.map((p) => ({ id: p.id, gained: p.gained })) };
  st.deadline = api.now() + REVEAL_MS;
  api.changed();
}

function onAction(st, m, a, api) {
  if (st.over || st.phase !== 'play' || !a || a.type !== 'guess' || typeof a.word !== 'string') return;
  const p = st.players.find((x) => x.id === m.id);
  if (!p || p.out || p.solvedAt) return;
  const w = a.word.toLowerCase().trim().slice(0, MAX_GUESS * 2);
  if (!w || w.length > MAX_GUESS || !/^[a-z]+$/.test(w)) return api.toMember(m.id, 'notice', 'Use letters only (a to z).');
  const exact = w === st.word;
  // Another real word built from the same letters counts too.
  const anagram = !exact && w.length === st.word.length && key(w) === key(st.word) && WORDS.has(w);
  if (!exact && !anagram) return api.toMember(m.id, 'notice', 'Not quite. Try again!');
  const total = st.settings.roundTime * 1000;
  const left = Math.max(0, st.deadline - api.now());
  const gained = BASE + Math.round(SPEED * (left / total)) + (st.solveOrder.length === 0 ? FIRST_BONUS : 0);
  p.solvedAt = api.now();
  p.gained = gained;
  p.points += gained;
  p.solved++;
  st.solveOrder.push(p.id);
  const mem = api.member(p.id);
  if (mem) mem.score = p.points;
  if (activeP(st).every((x) => x.solvedAt)) return endRound(st, api);
  api.changed();
}

function finish(st, api, forfeit) {
  if (st.over) return;
  st.over = true;
  const standings = st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, points: p.points, solved: p.solved, out: p.out })).sort((x, y) => y.points - x.points);
  const eligible = standings.filter((s) => !s.out);
  const top = eligible[0] ? eligible[0].points : 0;
  const winners = top > 0 || eligible.length ? eligible.filter((s) => s.points === top).map((s) => s.id) : [];
  if (eligible.length) api.sys(winners.length > 1 ? 'It ends in a tie!' : `${eligible[0].name} wins!`, 'good');
  api.end({ type: 'wordscramble', winnerId: winners[0] || null, winners, tie: winners.length > 1, standings, rounds: st.round, forfeit: !!forfeit });
}

function tick(st, api, now) {
  if (st.over || now < st.deadline) return;
  if (st.phase === 'play') return endRound(st, api);
  if (st.round >= st.settings.rounds) return finish(st, api);
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
  if (st.phase === 'play' && activeP(st).every((x) => x.solvedAt)) return endRound(st, api);
  api.changed();
}

function view(st, m, now) {
  const me = st.players.find((p) => p.id === m.id);
  return {
    players: st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, points: p.points, out: p.out, solved: !!p.solvedAt })),
    phase: st.phase,
    round: st.round,
    rounds: st.settings.rounds,
    letters: st.letters.map((c) => c.toUpperCase()),
    length: st.word.length,
    solvedByMe: !!(me && me.solvedAt),
    myGain: me ? me.gained : 0,
    reveal: st.phase === 'reveal' ? st.reveal : null, // the answer is only sent once the round is over
    timeLeft: Math.max(0, st.deadline - now),
    totalTime: (st.phase === 'play' ? st.settings.roundTime * 1000 : REVEAL_MS),
    myIndex: st.players.findIndex((p) => p.id === m.id),
  };
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view, _words: WORDS };
