// Tic Tac Toe: two players, server-checked moves, draw detection. Score = wins in this lobby.
const meta = {
  id: 'tictactoe',
  name: 'Tic Tac Toe',
  minPlayers: 2,
  maxPlayers: 2,
  midJoin: false,
  resetScores: false,
  scoreLabel: 'wins',
};

const defaults = { turnTime: 30, winnerStays: true };
const TURN_TIMES = [0, 15, 30, 60];
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (s.turnTime !== undefined) {
    const t = Number(s.turnTime);
    o.turnTime = TURN_TIMES.includes(t) ? t : prev.turnTime;
  }
  if (s.winnerStays !== undefined) o.winnerStays = !!s.winnerStays;
  return o;
}

function create(settings) {
  return { settings: { ...settings }, board: Array(9).fill(0), players: [], names: [], avatars: [], turn: 0, moves: 0, last: null, deadline: 0, timeouts: [0, 0], over: false };
}

function resetClock(st, api) {
  st.deadline = st.settings.turnTime ? api.now() + st.settings.turnTime * 1000 : 0;
}

function start(st, api) {
  const ps = api.seated().slice(0, 2);
  if (api.gameCount() % 2 === 0) ps.reverse(); // alternate who plays X
  st.players = ps.map((m) => m.id);
  st.names = ps.map((m) => m.name);
  st.avatars = ps.map((m) => m.avatar);
  resetClock(st, api);
  api.sys(`${st.names[0]} plays X and goes first.`, 'accent');
  api.changed();
}

function winLine(b) {
  return LINES.find(([x, y, z]) => b[x] && b[x] === b[y] && b[y] === b[z]) || null;
}

function place(st, api, cell) {
  if (st.board[cell] !== 0) return false;
  st.board[cell] = st.turn + 1;
  st.last = cell;
  st.moves++;
  const line = winLine(st.board);
  if (line) return finish(st, api, st.turn, line);
  if (st.moves === 9) return finish(st, api, null);
  st.turn = 1 - st.turn;
  resetClock(st, api);
  api.changed();
  return true;
}

function finish(st, api, winnerIdx, line, forfeit) {
  st.over = true;
  const result = {
    type: 'tictactoe',
    board: st.board,
    winLine: line || null,
    last: st.last,
    players: st.players.map((id, i) => ({ id, name: st.names[i], avatar: st.avatars[i], mark: i ? 'O' : 'X' })),
    winnerId: winnerIdx === null ? null : st.players[winnerIdx],
    draw: winnerIdx === null,
    forfeit: !!forfeit,
  };
  if (winnerIdx === null) {
    api.sys("It's a draw!", 'accent');
  } else {
    const w = api.member(st.players[winnerIdx]);
    if (w) w.score += 1;
    api.sys(`${st.names[winnerIdx]} wins!`, 'good');
    if (st.settings.winnerStays) result.nextUp = api.rotateLoser(st.players[1 - winnerIdx]);
  }
  api.end(result);
  return true;
}

function onAction(st, m, a, api) {
  if (st.over || !a || a.type !== 'place') return;
  const idx = st.players.indexOf(m.id);
  if (idx !== st.turn) return;
  const cell = a.cell;
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) return; // strict: never coerce junk into a legal cell
  if (place(st, api, cell)) st.timeouts[idx] = 0;
}

function tick(st, api, now) {
  if (st.over || !st.deadline || now < st.deadline) return;
  const idx = st.turn;
  st.timeouts[idx]++;
  if (st.timeouts[idx] >= 2) {
    api.sys(`${st.names[idx]} ran out of time twice, so ${st.names[1 - idx]} wins.`, 'warn');
    finish(st, api, 1 - idx, null, true);
    return;
  }
  const open = st.board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  api.sys(`${st.names[idx]} ran out of time, so a random move was made.`, 'warn');
  place(st, api, open[Math.floor(Math.random() * open.length)]);
}

function onLeave(st, id, api) {
  if (st.over) return;
  const idx = st.players.indexOf(id);
  if (idx < 0) return;
  api.sys(`${st.names[idx]} left, so ${st.names[1 - idx]} wins.`, 'warn');
  finish(st, api, 1 - idx, null, true);
}

function view(st, m, now) {
  return {
    board: st.board,
    players: st.players.map((id, i) => ({ id, name: st.names[i], avatar: st.avatars[i], mark: i ? 'O' : 'X' })),
    turn: st.turn,
    myIndex: st.players.indexOf(m.id),
    timeLeft: st.deadline ? Math.max(0, st.deadline - now) : null,
    last: st.last,
    moves: st.moves,
  };
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view };
