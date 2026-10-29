// Reversi (Othello): two players on 8x8. A move must flip at least one line of opposing discs.
// If a player has no legal move they pass automatically; the game ends when neither can move
// (or the board is full) and the player with more discs wins. Score = wins in this lobby.
const { randInt } = require('./socialutil');

const meta = { id: 'reversi', name: 'Reversi', minPlayers: 2, maxPlayers: 2, midJoin: false, resetScores: false, scoreLabel: 'wins' };

const TURN_TIMES = [0, 20, 30, 60];
const defaults = { turnTime: 30, winnerStays: true };
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (TURN_TIMES.includes(s.turnTime)) o.turnTime = s.turnTime;
  if (typeof s.winnerStays === 'boolean') o.winnerStays = s.winnerStays;
  return o;
}

// ---- pure rules (1 = player 0 / black, 2 = player 1 / white) ----
function initialBoard() {
  const b = Array(64).fill(0);
  b[3 * 8 + 3] = 2; b[4 * 8 + 4] = 2;
  b[3 * 8 + 4] = 1; b[4 * 8 + 3] = 1;
  return b;
}

// Squares flipped if `colour` plays at `sq` (empty list = illegal).
function flips(board, sq, colour) {
  if (board[sq] !== 0) return [];
  const r = sq >> 3, f = sq & 7;
  const out = [];
  for (const [dr, df] of DIRS) {
    const line = [];
    let rr = r + dr, ff = f + df;
    while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 && board[rr * 8 + ff] === 3 - colour) {
      line.push(rr * 8 + ff);
      rr += dr; ff += df;
    }
    if (line.length && rr >= 0 && rr < 8 && ff >= 0 && ff < 8 && board[rr * 8 + ff] === colour) out.push(...line);
  }
  return out;
}

function legalSquares(board, colour) {
  const out = [];
  for (let sq = 0; sq < 64; sq++) if (flips(board, sq, colour).length) out.push(sq);
  return out;
}

const tally = (board) => ({ black: board.filter((x) => x === 1).length, white: board.filter((x) => x === 2).length });

function create(settings) {
  return { settings: { ...settings }, board: initialBoard(), players: [], names: [], avatars: [], turn: 0, moves: 0, last: null, flipped: [], deadline: 0, timeouts: [0, 0], over: false };
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
  api.sys(`${st.names[0]} plays Black and goes first.`, 'accent');
  api.changed();
}

function finish(st, api, winnerIdx, forfeit) {
  if (st.over) return;
  st.over = true;
  const t = tally(st.board);
  const result = {
    type: 'reversi',
    board: st.board,
    last: st.last,
    players: st.players.map((id, i) => ({ id, name: st.names[i], avatar: st.avatars[i], disc: i ? 'White' : 'Black', discs: i ? t.white : t.black })),
    winnerId: winnerIdx === null ? null : st.players[winnerIdx],
    draw: winnerIdx === null,
    forfeit: !!forfeit,
  };
  if (winnerIdx === null) {
    api.sys(`It's a draw, ${t.black} to ${t.white}.`, 'accent');
  } else {
    const w = api.member(st.players[winnerIdx]);
    if (w) w.score += 1;
    api.sys(`${st.names[winnerIdx]} wins${forfeit ? '' : ` ${Math.max(t.black, t.white)} to ${Math.min(t.black, t.white)}`}!`, 'good');
    if (st.settings.winnerStays) result.nextUp = api.rotateLoser(st.players[1 - winnerIdx]);
  }
  api.end(result);
}

function place(st, api, sq) {
  const colour = st.turn + 1;
  const fl = flips(st.board, sq, colour);
  if (!fl.length) return false;
  st.board[sq] = colour;
  for (const f of fl) st.board[f] = colour;
  st.last = sq;
  st.flipped = fl;
  st.moves++;
  const other = 3 - colour;
  if (legalSquares(st.board, other).length) {
    st.turn = 1 - st.turn;
  } else if (legalSquares(st.board, colour).length) {
    api.sys(`${st.names[1 - st.turn]} has no legal move and passes.`, 'info');
    st.passed = st.moves; // lets the client announce the pass
  } else {
    const t = tally(st.board);
    return finish(st, api, t.black === t.white ? null : t.black > t.white ? 0 : 1), true;
  }
  resetClock(st, api);
  api.changed();
  return true;
}

function onAction(st, m, a, api) {
  if (st.over || !a || typeof a !== 'object') return;
  const me = st.players.indexOf(m.id);
  if (me < 0) return;
  if (a.type === 'resign') return finish(st, api, 1 - me, true);
  if (a.type !== 'place' || me !== st.turn) return;
  if (!Number.isInteger(a.cell) || a.cell < 0 || a.cell > 63) return;
  if (place(st, api, a.cell)) st.timeouts[me] = 0;
}

function tick(st, api, now) {
  if (st.over || !st.deadline || now < st.deadline) return;
  const idx = st.turn;
  st.timeouts[idx]++;
  if (st.timeouts[idx] >= 2) {
    api.sys(`${st.names[idx]} ran out of time twice, so ${st.names[1 - idx]} wins.`, 'warn');
    return finish(st, api, 1 - idx, true);
  }
  const moves = legalSquares(st.board, idx + 1);
  api.sys(`${st.names[idx]} ran out of time, so a random move was made.`, 'warn');
  place(st, api, moves[randInt(moves.length)]);
}

function onLeave(st, id, api) {
  if (st.over) return;
  const idx = st.players.indexOf(id);
  if (idx < 0) return;
  api.sys(`${st.names[idx]} left, so ${st.names[1 - idx]} wins.`, 'warn');
  finish(st, api, 1 - idx, true);
}

function view(st, m, now) {
  const me = st.players.indexOf(m.id);
  const t = tally(st.board);
  return {
    board: st.board,
    turn: st.turn,
    myIndex: me,
    legal: !st.over && me === st.turn ? legalSquares(st.board, me + 1) : [],
    last: st.last,
    flipped: st.flipped,
    moves: st.moves,
    passed: st.passed || 0,
    players: st.players.map((id, i) => ({ id, name: st.names[i], avatar: st.avatars[i], disc: i ? 'White' : 'Black', discs: i ? t.white : t.black })),
    timeLeft: st.deadline ? Math.max(0, st.deadline - now) : null,
  };
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view, rules: { initialBoard, flips, legalSquares, tally } };
