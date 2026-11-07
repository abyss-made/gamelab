// Trivia Blitz: timed multiple-choice questions. The correct answer index never leaves the
// server until the question is over, and choices are shuffled per question.
const { shuffle } = require('../util');
const BANK = require('../data/trivia.json');

const CATEGORIES = [...new Set(BANK.map((q) => q.c))];

const meta = {
  id: 'trivia',
  name: 'Trivia Blitz',
  minPlayers: 2,
  maxPlayers: 12,
  midJoin: false,
  resetScores: true,
  scoreLabel: 'pts',
};

const QUESTIONS = [5, 10, 15];
const ANSWER_TIMES = [10, 15, 20];
const defaults = { questions: 10, answerTime: 15, category: 'mixed' };
const REVEAL_MS = 4000;
const BASE = 100;
const SPEED = 100;
const STREAK_BONUS = 10; // per consecutive correct answer beyond the first, capped
const STREAK_CAP = 5;

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (QUESTIONS.includes(s.questions)) o.questions = s.questions;
  if (ANSWER_TIMES.includes(s.answerTime)) o.answerTime = s.answerTime;
  if (s.category === 'mixed' || CATEGORIES.includes(s.category)) o.category = s.category;
  return o;
}

function create(settings) {
  return { settings: { ...settings }, players: [], queue: [], q: null, round: 0, phase: 'ask', deadline: 0, startedAt: 0, over: false, reveal: null };
}

function buildQueue(st) {
  const cat = st.settings.category;
  let pool = BANK.filter((q) => cat === 'mixed' || q.c === cat);
  let picked = shuffle(pool).slice(0, st.settings.questions);
  // A single category can have fewer questions than requested; top up from the rest without repeats.
  if (picked.length < st.settings.questions) {
    const rest = shuffle(BANK.filter((q) => !picked.includes(q)));
    picked = picked.concat(rest.slice(0, st.settings.questions - picked.length));
  }
  return picked;
}

function start(st, api) {
  st.players = api.seated().map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, points: 0, correct: 0, streak: 0, pick: null, pickedAt: 0, gained: 0, out: false }));
  st.queue = buildQueue(st);
  api.sys('Trivia Blitz: answer fast. Right answers score more the quicker you are.', 'accent');
  ask(st, api);
  api.changed();
}

function ask(st, api) {
  const src = st.queue[st.round];
  st.round++;
  const choices = shuffle([src.a, ...src.w]);
  st.q = { text: src.q, category: src.c, choices, correct: choices.indexOf(src.a) };
  st.phase = 'ask';
  st.reveal = null;
  st.startedAt = api.now();
  st.deadline = api.now() + st.settings.answerTime * 1000;
  for (const p of st.players) {
    p.pick = null;
    p.pickedAt = 0;
    p.gained = 0;
  }
}

const activeP = (st) => st.players.filter((p) => !p.out);

function reveal(st, api) {
  const total = st.settings.answerTime * 1000;
  const results = [];
  for (const p of st.players) {
    const right = p.pick === st.q.correct;
    if (right) {
      const left = Math.max(0, st.deadline - p.pickedAt);
      p.streak++;
      p.correct++;
      p.gained = BASE + Math.round(SPEED * (left / total)) + STREAK_BONUS * Math.min(p.streak - 1, STREAK_CAP);
      p.points += p.gained;
      const m = api.member(p.id);
      if (m) m.score = p.points;
    } else p.streak = 0;
    results.push({ id: p.id, pick: p.pick, right, gained: p.gained, streak: p.streak });
  }
  st.reveal = { correct: st.q.correct, results };
  st.phase = 'reveal';
  st.deadline = api.now() + REVEAL_MS;
  api.changed();
}

function onAction(st, m, a, api) {
  if (st.over || st.phase !== 'ask' || !a || a.type !== 'answer') return;
  const p = st.players.find((x) => x.id === m.id);
  if (!p || p.out || p.pick !== null) return; // one answer per question, final once made
  const i = a.choice;
  if (!Number.isInteger(i) || i < 0 || i >= st.q.choices.length) return;
  p.pick = i;
  p.pickedAt = api.now();
  if (activeP(st).every((x) => x.pick !== null)) return reveal(st, api);
  api.changed();
}

function finish(st, api, forfeit) {
  if (st.over) return;
  st.over = true;
  const standings = st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, points: p.points, correct: p.correct, out: p.out })).sort((x, y) => y.points - x.points);
  const eligible = standings.filter((s) => !s.out);
  const top = eligible[0] ? eligible[0].points : 0;
  const winners = eligible.filter((s) => s.points === top).map((s) => s.id);
  if (eligible.length) api.sys(winners.length > 1 ? 'It ends in a tie!' : `${eligible[0].name} wins!`, 'good');
  api.end({ type: 'trivia', winnerId: winners[0] || null, winners, tie: winners.length > 1, standings, questions: st.round, forfeit: !!forfeit });
}

function tick(st, api, now) {
  if (st.over || now < st.deadline) return;
  if (st.phase === 'ask') return reveal(st, api);
  if (st.round >= st.queue.length) return finish(st, api);
  ask(st, api);
  api.changed();
}

function onLeave(st, id, api) {
  if (st.over) return;
  const p = st.players.find((x) => x.id === id);
  if (!p || p.out) return;
  p.out = true;
  api.sys(`${p.name} left.`, 'warn');
  if (activeP(st).length < 2) return finish(st, api, true);
  if (st.phase === 'ask' && activeP(st).every((x) => x.pick !== null)) return reveal(st, api);
  api.changed();
}

function view(st, m, now) {
  const me = st.players.find((p) => p.id === m.id);
  const revealed = st.phase === 'reveal';
  return {
    players: st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, points: p.points, streak: p.streak, out: p.out, locked: st.phase === 'ask' ? p.pick !== null : true })),
    phase: st.phase,
    round: st.round,
    total: st.queue.length,
    category: st.q.category,
    question: st.q.text,
    choices: st.q.choices,
    myPick: me ? me.pick : null, // other players' choices stay hidden until the reveal
    reveal: revealed ? st.reveal : null, // the correct index is only included here
    timeLeft: Math.max(0, st.deadline - now),
    totalTime: revealed ? REVEAL_MS : st.settings.answerTime * 1000,
    myIndex: st.players.findIndex((p) => p.id === m.id),
  };
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view, CATEGORIES };
