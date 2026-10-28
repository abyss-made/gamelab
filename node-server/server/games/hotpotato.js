// Hot Potato: a bomb with a hidden fuse is passed by answering a category prompt. The fuse length is
// chosen and held by the server and never sent to clients; whoever holds the bomb when it blows loses a life.
const { shuffle } = require('../util');
const { cleanText, norm, randInt, pick } = require('./socialutil');
const { POTATO } = require('../data/social');

const meta = { id: 'hotpotato', name: 'Hot Potato', minPlayers: 2, maxPlayers: 10, midJoin: false, resetScores: true, scoreLabel: 'lives' };

const LIVES = [1, 2, 3];
const FUSES = { short: [10, 22], medium: [18, 38], long: [30, 55] };
const defaults = { lives: 2, fuse: 'medium' };
const HOLD_MS = 12000; // sit on the bomb longer than this and it goes off in your hands
const BOOM_MS = 4000;
const ANSWER_MAX = 30;

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (LIVES.includes(s.lives)) o.lives = s.lives;
  if (FUSES[s.fuse]) o.fuse = s.fuse;
  return o;
}

function create(settings) {
  return { settings: { ...settings }, players: [], holder: -1, from: -1, prompt: '', used: [], round: 0, phase: 'play', fuseAt: 0, holdUntil: 0, deadline: 0, over: false, boom: null, lastAnswer: null, deck: [] };
}

const alive = (st) => st.players.filter((p) => p.lives > 0 && !p.out);

function start(st, api) {
  st.players = api.seated().map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, lives: st.settings.lives, out: false }));
  st.deck = shuffle(POTATO);
  api.sys('Hot Potato: answer the prompt to pass the bomb. Nobody knows when it blows!', 'accent');
  newRound(st, api);
}

function newRound(st, api) {
  st.round++;
  if (!st.deck.length) st.deck = shuffle(POTATO);
  st.prompt = st.deck.pop();
  st.used = [];
  st.boom = null;
  st.lastAnswer = null;
  st.from = -1;
  const live = alive(st);
  st.holder = st.players.indexOf(pick(live));
  const [lo, hi] = FUSES[st.settings.fuse];
  const now = api.now();
  st.fuseAt = now + (lo + randInt(hi - lo + 1)) * 1000; // server-side only
  st.holdUntil = now + HOLD_MS;
  st.phase = 'play';
  st.deadline = Math.min(st.fuseAt, st.holdUntil);
  syncScores(st, api);
  api.changed();
}

function syncScores(st, api) {
  for (const p of st.players) {
    const m = api.member(p.id);
    if (m) m.score = p.out ? 0 : p.lives;
  }
}

function onAction(st, m, a, api) {
  if (st.over || st.phase !== 'play' || !a || a.type !== 'pass') return;
  const i = st.players.findIndex((p) => p.id === m.id);
  if (i < 0 || i !== st.holder) return; // only the holder can pass
  const target = st.players.findIndex((p) => p.id === a.to);
  const t = st.players[target];
  if (!t || target === i || t.lives <= 0 || t.out) return;
  // Passing straight back to the person who just gave it to you is not allowed (unless nobody else is left).
  if (target === st.from && alive(st).length > 2) return api.toMember(m.id, 'notice', "You can't pass it straight back. Pick someone else.");
  const text = cleanText(a.answer, ANSWER_MAX);
  if (norm(text).length < 2) return api.toMember(m.id, 'notice', 'Type an answer to pass the bomb.');
  if (st.used.includes(norm(text))) return api.toMember(m.id, 'notice', 'That answer was already used this round.');
  st.used.push(norm(text));
  st.lastAnswer = { by: m.id, text };
  st.from = i;
  st.holder = target;
  st.holdUntil = api.now() + HOLD_MS;
  st.deadline = Math.min(st.fuseAt, st.holdUntil);
  api.changed();
}

function explode(st, api) {
  const p = st.players[st.holder];
  p.lives--;
  st.boom = { id: p.id, out: p.lives <= 0 };
  if (p.lives <= 0) api.sys(`${p.name} blew up and is out!`, 'warn');
  st.phase = 'boom';
  st.deadline = api.now() + BOOM_MS;
  syncScores(st, api);
  api.changed();
}

function finish(st, api, forfeit) {
  if (st.over) return;
  st.over = true;
  const left = alive(st);
  const winner = left.length === 1 ? left[0] : null;
  const standings = st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, lives: p.out ? 0 : p.lives, out: p.lives <= 0 || p.out })).sort((x, y) => y.lives - x.lives);
  if (winner) api.sys(`${winner.name} is the last one standing!`, 'good');
  api.end({ type: 'hotpotato', winnerId: winner ? winner.id : null, winners: winner ? [winner.id] : [], tie: false, standings, rounds: st.round, forfeit: !!forfeit });
}

function tick(st, api, now) {
  if (st.over || now < st.deadline) return;
  if (st.phase === 'boom') {
    if (alive(st).length <= 1) return finish(st, api);
    return newRound(st, api);
  }
  // The fuse ran out, or the holder stalled past the hold limit: it goes off in their hands.
  explode(st, api);
}

function onLeave(st, id, api) {
  if (st.over) return;
  const i = st.players.findIndex((x) => x.id === id);
  const p = st.players[i];
  if (!p || p.out) return;
  p.out = true;
  p.lives = 0;
  api.sys(`${p.name} left.`, 'warn');
  syncScores(st, api);
  if (alive(st).length <= 1) return finish(st, api, true);
  if (st.phase === 'play' && i === st.holder) {
    // A departing holder hands the bomb on at random; nobody is penalised for it.
    const others = alive(st);
    st.holder = st.players.indexOf(pick(others));
    st.from = -1;
    st.holdUntil = api.now() + HOLD_MS;
    st.deadline = Math.min(st.fuseAt, st.holdUntil);
  } else if (st.phase === 'boom' && st.boom.id === id) st.boom.out = true;
  api.changed();
}

function view(st, m, now) {
  return {
    phase: st.phase,
    round: st.round,
    prompt: st.prompt,
    players: st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, lives: p.out ? 0 : p.lives, out: p.out || p.lives <= 0 })),
    holderId: st.players[st.holder] ? st.players[st.holder].id : null,
    fromId: st.from >= 0 ? st.players[st.from].id : null,
    used: st.used.length,
    lastAnswer: st.lastAnswer,
    boom: st.boom,
    // Only the hold limit is sent. The fuse itself (fuseAt) never leaves the server.
    holdLeft: st.phase === 'play' ? Math.max(0, st.holdUntil - now) : 0,
    totalTime: HOLD_MS,
    myIndex: st.players.findIndex((p) => p.id === m.id),
  };
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view };
