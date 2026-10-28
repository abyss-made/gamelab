// Categories Rush: everyone answers the same categories for a letter before time runs out.
// Answers stay private until the round ends. Unique answers score 2, matching answers score 1.
const filter = require('../filter');

const meta = {
  id: 'categories',
  name: 'Categories Rush',
  minPlayers: 2,
  maxPlayers: 12,
  midJoin: false,
  resetScores: true,
  scoreLabel: 'pts',
};

const ROUNDS = [3, 5, 8];
const ROUND_TIMES = [30, 45, 60, 90];
const defaults = { rounds: 5, roundTime: 60 };
const PER_ROUND = 5;
const REVIEW_MS = 12000;
const MAX_ANSWER = 30;
const LETTERS = 'ABCDEFGHIJKLMNOPRSTW';
const IDLE_LIMIT = 2; // rounds in a row with no answers before a player is dropped

const CATEGORIES = [
  'Animal', 'Food', 'Country', 'City', 'Boy name', 'Girl name', 'Fruit or vegetable', 'Something in a kitchen',
  'Movie or TV show', 'Sport or hobby', 'Job', 'Thing in a school', 'Something you wear', 'Color or shade',
  'Musical instrument', 'Something in a park', 'Drink', 'Thing at the beach', 'Candy or dessert', 'Vehicle',
  'Something that is cold', 'Something that is round', 'Body part', 'Tool', 'Thing in a bedroom',
  'Something in the sky', 'Board or video game', 'Superhero or villain', 'Holiday thing', 'Something you can break',
  'Thing in a bathroom', 'Something that flies', 'Something sticky', 'Cartoon character', 'Brand or store',
  'Something in a toolbox', 'Thing at the zoo', 'Something found in the ocean', 'Farm thing', 'Something loud',
];

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (ROUNDS.includes(s.rounds)) o.rounds = s.rounds;
  if (ROUND_TIMES.includes(s.roundTime)) o.roundTime = s.roundTime;
  return o;
}

function pickCategories(used) {
  const pool = CATEGORIES.filter((c) => !used.has(c));
  const src = pool.length >= PER_ROUND ? pool : CATEGORIES;
  const out = [];
  const copy = src.slice();
  while (out.length < PER_ROUND) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  return out;
}

// Case, punctuation, a leading article and a plural "s" don't make an answer different.
function normalize(raw) {
  if (typeof raw !== 'string') return '';
  let s = raw.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.replace(/^(the|a|an) /, '');
  if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss')) s = s.slice(0, -1);
  return s;
}
function validFor(norm, letter) {
  return norm.length >= 2 && norm[0] === letter.toLowerCase() && !filter.hasBad(norm);
}

function create(settings) {
  return { settings: { ...settings }, players: [], round: 0, letter: '', cats: [], usedCats: new Set(), usedLetters: new Set(), phase: 'answer', deadline: 0, review: null, over: false };
}

function start(st, api) {
  st.players = api.seated().map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, answers: [], done: false, points: 0, idle: 0, out: false }));
  api.sys('Categories Rush: fill in each category with a word starting with the letter.', 'accent');
  nextRound(st, api);
}

function nextRound(st, api) {
  st.round++;
  let letter;
  do letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  while (st.usedLetters.has(letter) && st.usedLetters.size < LETTERS.length);
  st.usedLetters.add(letter);
  st.letter = letter;
  st.cats = pickCategories(st.usedCats);
  st.cats.forEach((c) => st.usedCats.add(c));
  st.phase = 'answer';
  st.review = null;
  for (const p of st.players) {
    p.answers = Array(PER_ROUND).fill('');
    p.done = false;
  }
  st.deadline = api.now() + st.settings.roundTime * 1000;
  api.changed();
}

const activeP = (st) => st.players.filter((p) => !p.out);

function scoreRound(st, api) {
  const counts = st.cats.map(() => new Map());
  const normd = new Map();
  for (const p of activeP(st)) {
    const ns = p.answers.map((a, i) => {
      const n = normalize(a);
      if (!validFor(n, st.letter)) return null;
      counts[i].set(n, (counts[i].get(n) || 0) + 1);
      return n;
    });
    normd.set(p.id, ns);
  }
  const rows = [];
  for (const p of activeP(st)) {
    const ns = normd.get(p.id);
    let gained = 0;
    const cells = p.answers.map((a, i) => {
      const n = ns[i];
      let pts = 0;
      let status = a ? 'invalid' : 'blank';
      if (n) {
        const dup = counts[i].get(n) > 1;
        pts = dup ? 1 : 2;
        status = dup ? 'dup' : 'unique';
      }
      gained += pts;
      return { text: a, points: pts, status };
    });
    p.points += gained;
    const m = api.member(p.id);
    if (m) m.score = p.points;
    const empty = p.answers.every((a) => !a.trim());
    p.idle = empty ? p.idle + 1 : 0;
    rows.push({ id: p.id, name: p.name, avatar: p.avatar, cells, gained, total: p.points });
  }
  for (const p of activeP(st)) {
    if (p.idle >= IDLE_LIMIT) {
      p.out = true;
      api.sys(`${p.name} didn't answer for ${IDLE_LIMIT} rounds and is out.`, 'warn');
    }
  }
  st.review = { letter: st.letter, cats: st.cats, rows };
  st.phase = 'review';
  st.deadline = api.now() + REVIEW_MS;
  api.changed();
}

function onAction(st, m, a, api) {
  if (st.over || st.phase !== 'answer' || !a) return;
  const p = st.players.find((x) => x.id === m.id);
  if (!p || p.out) return;
  if (a.type === 'answers' && Array.isArray(a.answers)) {
    // Replace the whole sheet. Each cell is trimmed and capped, so oversize input can't pile up.
    p.answers = Array.from({ length: PER_ROUND }, (_, i) => (typeof a.answers[i] === 'string' ? filter.clean(a.answers[i], MAX_ANSWER) : ''));
    if (a.done === true) p.done = true;
  } else if (a.type === 'done') {
    p.done = true;
  } else return;
  if (activeP(st).every((x) => x.done)) return scoreRound(st, api);
  api.changed();
}

function finish(st, api, forfeit) {
  if (st.over) return;
  st.over = true;
  const standings = st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, points: p.points })).sort((x, y) => y.points - x.points);
  const top = standings[0] ? standings[0].points : 0;
  const winners = standings.filter((s) => s.points === top).map((s) => s.id);
  api.sys(winners.length > 1 ? 'It ends in a tie!' : `${standings[0].name} wins!`, 'good');
  api.end({ type: 'categories', winnerId: winners[0] || null, winners, tie: winners.length > 1, standings, forfeit: !!forfeit });
}

function tick(st, api, now) {
  if (st.over || now < st.deadline) return;
  if (st.phase === 'answer') return scoreRound(st, api);
  if (st.round >= st.settings.rounds || activeP(st).length < 2) return finish(st, api);
  nextRound(st, api);
}

function onLeave(st, id, api) {
  if (st.over) return;
  const p = st.players.find((x) => x.id === id);
  if (!p || p.out) return;
  p.out = true;
  api.sys(`${p.name} left.`, 'warn');
  if (activeP(st).length < 2) return finish(st, api, true);
  if (st.phase === 'answer' && activeP(st).every((x) => x.done)) return scoreRound(st, api);
  api.changed();
}

function view(st, m, now) {
  const me = st.players.find((p) => p.id === m.id);
  return {
    round: st.round,
    rounds: st.settings.rounds,
    letter: st.letter,
    cats: st.cats,
    phase: st.phase,
    // Only your own answers are ever sent during a round.
    myAnswers: me && st.phase === 'answer' ? me.answers : null,
    myDone: me ? me.done : false,
    players: st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, done: p.done, points: p.points, out: p.out })),
    review: st.phase === 'review' ? st.review : null,
    timeLeft: Math.max(0, st.deadline - now),
    totalTime: st.phase === 'answer' ? st.settings.roundTime * 1000 : REVIEW_MS,
    myIndex: st.players.findIndex((p) => p.id === m.id),
  };
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view, normalize, validFor, CATEGORIES };
