// The Impostor: the crew shares a secret word, one hidden impostor only knows the category.
// Clue turns, a timed discussion (room chat), then a vote. Roles and the word are sent only to the
// players entitled to them, and everyone learns them together at the results.
const { shuffle } = require('../util');
const { cleanText, norm, pick } = require('./socialutil');
const { IMPOSTOR } = require('../data/social');

const meta = { id: 'impostor', name: 'The Impostor', minPlayers: 3, maxPlayers: 10, midJoin: false, resetScores: true, scoreLabel: 'pts' };

const ROUNDS = [1, 3, 5];
const CLUE_ROUNDS = [1, 2, 3];
const CLUE_TIMES = [20, 30, 45];
const DISCUSS_TIMES = [30, 60, 90];
const defaults = { rounds: 3, clueRounds: 2, clueTime: 30, discussTime: 60 };
const VOTE_MS = 25000;
const GUESS_MS = 20000;
const RESULT_MS = 9000;
const CLUE_MAX = 30;
const CREW_PTS = 2;
const ESCAPE_PTS = 3;
const STEAL_PTS = 2;

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (ROUNDS.includes(s.rounds)) o.rounds = s.rounds;
  if (CLUE_ROUNDS.includes(s.clueRounds)) o.clueRounds = s.clueRounds;
  if (CLUE_TIMES.includes(s.clueTime)) o.clueTime = s.clueTime;
  if (DISCUSS_TIMES.includes(s.discussTime)) o.discussTime = s.discussTime;
  return o;
}

function create(settings) {
  return { settings: { ...settings }, players: [], round: 0, phase: 'clue', deadline: 0, over: false, cat: null, word: null, impostorId: null, order: [], turn: 0, lap: 0, clues: [], skips: new Set(), result: null, history: [], usedImpostors: [], usedWords: new Set() };
}

const activeP = (st) => st.players.filter((p) => !p.out);

function start(st, api) {
  st.players = api.seated().map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, points: 0, out: false, vote: null }));
  api.sys('The Impostor: the crew knows the word. One of you does not. Give clues, then find them.', 'accent');
  nextRound(st, api);
}

function nextRound(st, api) {
  st.round++;
  const live = activeP(st);
  // Everyone takes a turn as impostor before anyone repeats.
  let pool = live.filter((p) => !st.usedImpostors.includes(p.id));
  if (!pool.length) { st.usedImpostors = []; pool = live; }
  const imp = pick(pool);
  st.usedImpostors.push(imp.id);
  st.impostorId = imp.id;
  const fresh = IMPOSTOR.flatMap((c) => c.words.map((w) => ({ cat: c.cat, w }))).filter((x) => !st.usedWords.has(x.w));
  const choice = pick(fresh.length ? fresh : IMPOSTOR.flatMap((c) => c.words.map((w) => ({ cat: c.cat, w }))));
  st.usedWords.add(choice.w);
  st.cat = choice.cat;
  st.word = choice.w;
  st.order = shuffle(live.map((p) => p.id));
  st.turn = 0;
  st.lap = 0;
  st.clues = [];
  st.skips = new Set();
  st.result = null;
  st.caught = false;
  st.accused = null;
  for (const p of st.players) p.vote = null;
  st.phase = 'clue';
  st.deadline = api.now() + st.settings.clueTime * 1000;
  skipAbsent(st, api);
  api.changed();
}

const curId = (st) => st.order[st.turn];

// Players who left are skipped; moves to discussion when everyone has had their laps.
function skipAbsent(st, api) {
  while (st.phase === 'clue') {
    if (st.turn >= st.order.length) {
      st.lap++;
      st.turn = 0;
      if (st.lap >= st.settings.clueRounds) return openDiscuss(st, api);
    }
    const p = st.players.find((x) => x.id === curId(st));
    if (p && !p.out) return;
    st.turn++;
  }
}

function advanceClue(st, api, text) {
  const p = st.players.find((x) => x.id === curId(st));
  st.clues.push({ id: p.id, lap: st.lap, text });
  st.turn++;
  st.deadline = api.now() + st.settings.clueTime * 1000;
  skipAbsent(st, api);
  api.changed();
}

function openDiscuss(st, api) {
  st.phase = 'discuss';
  st.skips = new Set();
  st.deadline = api.now() + st.settings.discussTime * 1000;
  api.sys('Discuss in chat! Who is the impostor?', 'accent');
}

function openVote(st, api) {
  st.phase = 'vote';
  st.deadline = api.now() + VOTE_MS;
  api.changed();
}

function onAction(st, m, a, api) {
  if (st.over || !a || typeof a !== 'object') return;
  const p = st.players.find((x) => x.id === m.id);
  if (!p || p.out) return;
  if (st.phase === 'clue' && a.type === 'clue') {
    if (curId(st) !== p.id) return;
    const text = cleanText(a.text, CLUE_MAX);
    if (!text) return;
    // A clue may not just say the word (the impostor can't, since they don't know it).
    if (p.id !== st.impostorId && norm(text) === norm(st.word)) return api.toMember(p.id, 'notice', "Don't give the word away! Try a different clue.");
    advanceClue(st, api, text);
  } else if (st.phase === 'discuss' && a.type === 'ready') {
    st.skips.add(p.id);
    if (activeP(st).every((x) => st.skips.has(x.id))) return openVote(st, api);
    api.changed();
  } else if (st.phase === 'vote' && a.type === 'vote') {
    if (p.vote) return;
    const target = st.players.find((x) => x.id === a.target);
    if (!target || target.out || target.id === p.id) return; // no self-vote
    p.vote = target.id;
    if (activeP(st).every((x) => x.vote)) return tally(st, api);
    api.changed();
  } else if (st.phase === 'guess' && a.type === 'guess') {
    if (p.id !== st.impostorId) return;
    const text = cleanText(a.text, CLUE_MAX);
    if (!text) return;
    settle(st, api, norm(text) === norm(st.word), text);
  }
}

function tally(st, api) {
  const counts = new Map();
  for (const p of activeP(st)) if (p.vote) counts.set(p.vote, (counts.get(p.vote) || 0) + 1);
  const top = Math.max(0, ...counts.values());
  const leaders = [...counts].filter(([, n]) => n === top).map(([id]) => id);
  // A tie, or no votes, lets the impostor escape.
  st.caught = leaders.length === 1 && leaders[0] === st.impostorId;
  st.accused = leaders.length === 1 ? leaders[0] : null;
  const imp = st.players.find((p) => p.id === st.impostorId);
  if (st.caught && imp && !imp.out) {
    st.phase = 'guess';
    st.deadline = api.now() + GUESS_MS;
    return api.changed();
  }
  settle(st, api, false, null);
}

function settle(st, api, stole, guess) {
  const gains = new Map(st.players.map((p) => [p.id, 0]));
  const imp = st.players.find((p) => p.id === st.impostorId);
  const voided = !imp || imp.out; // the impostor left, so the round doesn't score
  if (!voided) {
    if (!st.caught) gains.set(imp.id, ESCAPE_PTS);
    else if (stole) gains.set(imp.id, STEAL_PTS);
    else for (const p of activeP(st)) if (p.id !== imp.id && p.vote === imp.id) gains.set(p.id, CREW_PTS);
  }
  for (const p of st.players) {
    p.points += gains.get(p.id);
    const mem = api.member(p.id);
    if (mem) mem.score = p.points;
  }
  st.result = {
    impostorId: st.impostorId, word: st.word, category: st.cat, caught: !!st.caught, stole: !!stole, guess, voided,
    votes: Object.fromEntries(st.players.filter((p) => p.vote).map((p) => [p.id, p.vote])),
    gains: Object.fromEntries(gains),
  };
  st.phase = 'result';
  st.deadline = api.now() + RESULT_MS;
  api.changed();
}

function finish(st, api, forfeit) {
  if (st.over) return;
  st.over = true;
  const standings = st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, points: p.points, out: p.out })).sort((x, y) => y.points - x.points);
  const eligible = standings.filter((s) => !s.out);
  const top = eligible[0] ? eligible[0].points : 0;
  const winners = eligible.filter((s) => s.points === top).map((s) => s.id);
  api.end({ type: 'impostor', winnerId: winners[0] || null, winners, tie: winners.length > 1, standings, rounds: st.round, forfeit: !!forfeit });
}

function tick(st, api, now) {
  if (st.over || now < st.deadline) return;
  switch (st.phase) {
    case 'clue': return advanceClue(st, api, '(no clue)');
    case 'discuss': return openVote(st, api);
    case 'vote': return tally(st, api);
    case 'guess': return settle(st, api, false, null);
    default:
      if (st.round >= st.settings.rounds || activeP(st).length < 3) return finish(st, api);
      return nextRound(st, api);
  }
}

function onLeave(st, id, api) {
  if (st.over) return;
  const p = st.players.find((x) => x.id === id);
  if (!p || p.out) return;
  p.out = true;
  api.sys(`${p.name} left.`, 'warn');
  if (activeP(st).length < 3) return finish(st, api, true);
  if (st.phase === 'result') return api.changed();
  if (id === st.impostorId) {
    api.sys('The impostor left. This round is void.', 'warn');
    return settle(st, api, false, null);
  }
  if (st.phase === 'clue') {
    if (curId(st) === id) st.deadline = api.now() + st.settings.clueTime * 1000;
    skipAbsent(st, api);
  }
  else if (st.phase === 'discuss' && activeP(st).every((x) => st.skips.has(x.id))) return openVote(st, api);
  else if (st.phase === 'vote' && activeP(st).every((x) => x.vote)) return tally(st, api);
  api.changed();
}

function view(st, m, now) {
  const me = st.players.find((p) => p.id === m.id);
  const isImp = !!me && me.id === st.impostorId;
  const total = { clue: st.settings.clueTime * 1000, discuss: st.settings.discussTime * 1000, vote: VOTE_MS, guess: GUESS_MS, result: RESULT_MS }[st.phase];
  const g = {
    phase: st.phase,
    round: st.round,
    rounds: st.settings.rounds,
    category: st.cat,
    players: st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, points: p.points, out: p.out, voted: st.phase === 'vote' || st.phase === 'guess' ? !!p.vote : false })),
    clues: st.clues,
    clueRounds: st.settings.clueRounds,
    turnId: st.phase === 'clue' ? curId(st) : null,
    ready: [...st.skips],
    timeLeft: Math.max(0, st.deadline - now),
    totalTime: total,
    myIndex: st.players.findIndex((p) => p.id === m.id),
    // Role: only players know whether they are crew or impostor; spectators learn nothing until the result.
    role: me && !me.out ? (isImp ? 'impostor' : 'crew') : null,
    word: me && !isImp && st.phase !== 'result' ? st.word : null,
    myVote: me ? me.vote : null,
  };
  if (st.phase === 'result') { g.result = st.result; g.word = st.word; }
  return g;
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view };
