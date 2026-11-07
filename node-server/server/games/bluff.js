// Bluff Battle: everyone invents a believable wrong answer, then everyone votes anonymously.
// The real answer and who wrote what stay on the server until the reveal.
const { clampInt, shuffle } = require('../util');
const { cleanText, norm } = require('./socialutil');
const { BLUFF } = require('../data/social');

const meta = { id: 'bluff', name: 'Bluff Battle', minPlayers: 3, maxPlayers: 10, midJoin: false, resetScores: true, scoreLabel: 'pts' };

const ROUNDS = [3, 5, 8];
const BLUFF_TIMES = [30, 45, 60];
const VOTE_TIMES = [15, 20, 30];
const defaults = { rounds: 5, bluffTime: 45, voteTime: 20 };
const REVEAL_MS = 9000;
const ANSWER_MAX = 40;
const RIGHT_PTS = 2;
const FOOL_PTS = 1;

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (ROUNDS.includes(s.rounds)) o.rounds = s.rounds;
  if (BLUFF_TIMES.includes(s.bluffTime)) o.bluffTime = s.bluffTime;
  if (VOTE_TIMES.includes(s.voteTime)) o.voteTime = s.voteTime;
  return o;
}

function create(settings) {
  return { settings: { ...settings }, players: [], deck: [], q: null, round: 0, phase: 'bluff', deadline: 0, over: false, options: [], reveal: null };
}

const activeP = (st) => st.players.filter((p) => !p.out);

function start(st, api) {
  st.players = api.seated().map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, points: 0, out: false, fake: null, vote: null }));
  st.deck = shuffle(BLUFF);
  api.sys('Bluff Battle: write a fake answer that fools the others, then spot the real one.', 'accent');
  nextRound(st, api);
}

function nextRound(st, api) {
  st.round++;
  if (!st.deck.length) st.deck = shuffle(BLUFF);
  st.q = st.deck.pop();
  st.phase = 'bluff';
  st.options = [];
  st.reveal = null;
  for (const p of st.players) { p.fake = null; p.vote = null; }
  st.deadline = api.now() + st.settings.bluffTime * 1000;
  api.changed();
}

const isReal = (st, text) => [st.q.a, ...(st.q.alt || [])].some((a) => norm(a) === norm(text));

function onAction(st, m, a, api) {
  if (st.over || !a || typeof a !== 'object') return;
  const p = st.players.find((x) => x.id === m.id);
  if (!p || p.out) return;
  if (st.phase === 'bluff' && a.type === 'bluff') {
    if (p.fake) return; // final once submitted
    const text = cleanText(a.text, ANSWER_MAX);
    if (!text) return;
    if (isReal(st, text)) return api.toMember(p.id, 'notice', "That's the real answer! Invent something else.");
    p.fake = text;
    if (activeP(st).every((x) => x.fake)) return openVote(st, api);
    api.changed();
  } else if (st.phase === 'vote' && a.type === 'vote') {
    if (p.vote !== null) return;
    const o = st.options[a.option];
    if (!o || o.authors.includes(p.id)) return; // no self-voting, including merged identical bluffs
    p.vote = a.option;
    if (activeP(st).every((x) => x.vote !== null || !canVote(st, x))) return reveal(st, api);
    api.changed();
  }
}

// A player can vote unless they wrote every option on offer (only possible with a single merged bluff).
const canVote = (st, p) => st.options.some((o) => !o.authors.includes(p.id));

function openVote(st, api) {
  const byText = new Map();
  for (const p of activeP(st)) {
    if (!p.fake) continue;
    const k = norm(p.fake) || p.fake;
    if (byText.has(k)) byText.get(k).authors.push(p.id);
    else byText.set(k, { text: p.fake, authors: [p.id], real: false });
  }
  if (!byText.size) {
    api.sys('Nobody bluffed in time. Skipping this question.', 'warn');
    st.options = [{ text: st.q.a, authors: [], real: true }];
    return reveal(st, api);
  }
  st.options = shuffle([...byText.values(), { text: st.q.a, authors: [], real: true }]);
  st.phase = 'vote';
  st.deadline = api.now() + st.settings.voteTime * 1000;
  api.changed();
}

function reveal(st, api) {
  const gains = new Map(st.players.map((p) => [p.id, 0]));
  for (const p of activeP(st)) {
    if (p.vote === null) continue;
    const o = st.options[p.vote];
    if (o.real) gains.set(p.id, gains.get(p.id) + RIGHT_PTS);
    else for (const id of o.authors) gains.set(id, gains.get(id) + FOOL_PTS);
  }
  for (const p of st.players) {
    p.points += gains.get(p.id);
    const mem = api.member(p.id);
    if (mem) mem.score = p.points;
  }
  st.reveal = {
    answer: st.q.a,
    options: st.options.map((o) => ({
      text: o.text, real: o.real,
      authors: o.authors,
      voters: st.players.filter((p) => p.vote !== null && st.options[p.vote] === o).map((p) => p.id),
    })),
    gains: Object.fromEntries(gains),
  };
  st.phase = 'reveal';
  st.deadline = api.now() + REVEAL_MS;
  api.changed();
}

function finish(st, api, forfeit) {
  if (st.over) return;
  st.over = true;
  const standings = st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, points: p.points, out: p.out })).sort((x, y) => y.points - x.points);
  const eligible = standings.filter((s) => !s.out);
  const top = eligible[0] ? eligible[0].points : 0;
  const winners = eligible.filter((s) => s.points === top).map((s) => s.id);
  api.end({ type: 'bluff', winnerId: winners[0] || null, winners, tie: winners.length > 1, standings, rounds: st.round, forfeit: !!forfeit });
}

function tick(st, api, now) {
  if (st.over || now < st.deadline) return;
  if (st.phase === 'bluff') return openVote(st, api);
  if (st.phase === 'vote') return reveal(st, api);
  if (st.round >= st.settings.rounds) return finish(st, api);
  nextRound(st, api);
}

function onLeave(st, id, api) {
  if (st.over) return;
  const p = st.players.find((x) => x.id === id);
  if (!p || p.out) return;
  p.out = true;
  api.sys(`${p.name} left.`, 'warn');
  if (activeP(st).length < 3) return finish(st, api, true);
  if (st.phase === 'bluff' && activeP(st).every((x) => x.fake)) return openVote(st, api);
  if (st.phase === 'vote' && activeP(st).every((x) => x.vote !== null || !canVote(st, x))) return reveal(st, api);
  api.changed();
}

function view(st, m, now) {
  const me = st.players.find((p) => p.id === m.id);
  const g = {
    phase: st.phase,
    round: st.round,
    rounds: st.settings.rounds,
    question: st.q.q,
    players: st.players.map((p) => ({
      id: p.id, name: p.name, avatar: p.avatar, points: p.points, out: p.out,
      locked: st.phase === 'bluff' ? !!p.fake : st.phase === 'vote' ? p.vote !== null : true,
    })),
    myFake: me ? me.fake : null,
    timeLeft: Math.max(0, st.deadline - now),
    totalTime: st.phase === 'bluff' ? st.settings.bluffTime * 1000 : st.phase === 'vote' ? st.settings.voteTime * 1000 : REVEAL_MS,
    myIndex: st.players.findIndex((p) => p.id === m.id),
  };
  if (st.phase === 'vote') {
    // Options carry no authorship and no "real" flag until the reveal.
    g.options = st.options.map((o, i) => ({ i, text: o.text, mine: !!me && o.authors.includes(me.id) }));
    g.myVote = me ? me.vote : null;
  }
  if (st.phase === 'reveal') g.reveal = st.reveal;
  return g;
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view };
