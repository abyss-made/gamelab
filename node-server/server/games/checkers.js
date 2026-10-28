// Checkers (English / American rules, see checkersrules.js): two players, server-validated moves,
// forced captures, multi-jumps, kings. Score = wins in this lobby.
const R = require('./checkersrules');
const { randInt } = require('./socialutil');

const meta = { id: 'checkers', name: 'Checkers', minPlayers: 2, maxPlayers: 2, midJoin: false, resetScores: false, scoreLabel: 'wins' };

const TURN_TIMES = [0, 20, 30, 60];
const defaults = { turnTime: 30, winnerStays: true };

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (TURN_TIMES.includes(s.turnTime)) o.turnTime = s.turnTime;
  if (typeof s.winnerStays === 'boolean') o.winnerStays = s.winnerStays;
  return o;
}

function create(settings) {
  return { settings: { ...settings }, pos: R.initial(), players: [], names: [], avatars: [], moves: 0, last: null, deadline: 0, timeouts: [0, 0], over: false };
}

function resetClock(st, api) {
  st.deadline = st.settings.turnTime ? api.now() + st.settings.turnTime * 1000 : 0;
}

function start(st, api) {
  const ps = api.seated().slice(0, 2);
  if (api.gameCount() % 2 === 0) ps.reverse();
  st.players = ps.map((m) => m.id);
  st.names = ps.map((m) => m.name);
  st.avatars = ps.map((m) => m.avatar);
  resetClock(st, api);
  api.sys(`${st.names[0]} plays Lime and goes first. Captures are compulsory.`, 'accent');
  api.changed();
}

function finish(st, api, winnerIdx, reason, forfeit) {
  if (st.over) return;
  st.over = true;
  const result = {
    type: 'checkers',
    board: st.pos.board,
    last: st.last,
    players: st.players.map((id, i) => ({ id, name: st.names[i], avatar: st.avatars[i], side: i ? 'White' : 'Lime', pieces: R.count(st.pos.board, i) })),
    winnerId: winnerIdx === null ? null : st.players[winnerIdx],
    draw: winnerIdx === null,
    reason,
    forfeit: !!forfeit,
  };
  if (winnerIdx === null) {
    api.sys('Draw: 40 moves each without a capture or a man moving.', 'accent');
  } else {
    const w = api.member(st.players[winnerIdx]);
    if (w) w.score += 1;
    api.sys(`${st.names[winnerIdx]} wins!`, 'good');
    if (st.settings.winnerStays) result.nextUp = api.rotateLoser(st.players[1 - winnerIdx]);
  }
  api.end(result);
}

function play(st, api, mv) {
  const next = R.apply(st.pos, mv);
  st.pos = next;
  st.last = { from: mv.from, to: mv.to };
  st.moves++;
  const out = next.chain >= 0 ? null : R.outcome(next);
  if (out) return finish(st, api, out.winner, out.reason);
  resetClock(st, api); // each jump in a chain gets a fresh clock
  api.changed();
}

function onAction(st, m, a, api) {
  if (st.over || !a || typeof a !== 'object') return;
  const me = st.players.indexOf(m.id);
  if (me < 0) return;
  if (a.type === 'resign') return finish(st, api, 1 - me, 'resign', true);
  if (a.type !== 'move' || me !== st.pos.turn) return;
  const { from, to } = a;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from > 63 || to < 0 || to > 63) return;
  const mv = R.legalMoves(st.pos).find((x) => x.from === from && x.to === to);
  if (!mv) return;
  st.timeouts[me] = 0;
  play(st, api, mv);
}

function tick(st, api, now) {
  if (st.over || !st.deadline || now < st.deadline) return;
  const idx = st.pos.turn;
  st.timeouts[idx]++;
  if (st.timeouts[idx] >= 2) {
    api.sys(`${st.names[idx]} ran out of time twice, so ${st.names[1 - idx]} wins.`, 'warn');
    return finish(st, api, 1 - idx, 'time', true);
  }
  api.sys(`${st.names[idx]} ran out of time, so a random move was made.`, 'warn');
  // Finish any multi-jump the random move starts.
  while (!st.over && st.pos.turn === idx) {
    const moves = R.legalMoves(st.pos);
    play(st, api, moves[randInt(moves.length)]);
  }
}

function onLeave(st, id, api) {
  if (st.over) return;
  const idx = st.players.indexOf(id);
  if (idx < 0) return;
  api.sys(`${st.names[idx]} left, so ${st.names[1 - idx]} wins.`, 'warn');
  finish(st, api, 1 - idx, 'abandoned', true);
}

function view(st, m, now) {
  const me = st.players.indexOf(m.id);
  const moves = !st.over && me === st.pos.turn ? R.legalMoves(st.pos) : [];
  const legal = {};
  for (const mv of moves) (legal[mv.from] = legal[mv.from] || []).push(mv.to);
  return {
    board: st.pos.board,
    turn: st.pos.turn,
    myIndex: me,
    legal,
    mustJump: moves.some((x) => x.cap !== undefined),
    chain: st.pos.chain,
    last: st.last,
    moves: st.moves,
    quiet: st.pos.quiet,
    players: st.players.map((id, i) => ({ id, name: st.names[i], avatar: st.avatars[i], side: i ? 'White' : 'Lime', pieces: R.count(st.pos.board, i) })),
    timeLeft: st.deadline ? Math.max(0, st.deadline - now) : null,
  };
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view };
