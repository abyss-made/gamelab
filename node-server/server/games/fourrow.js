// 4 in a Row: two players drop discs, first to line up four wins.
const { clampInt } = require('../util');

const meta = {
  id: 'fourrow',
  name: '4 in a Row',
  minPlayers: 2,
  maxPlayers: 2,
  midJoin: false,
  resetScores: false, // score = wins in this lobby, kept between matches
  scoreLabel: 'wins',
};

const defaults = { turnTime: 30, winnerStays: true };
const ROWS = 6;
const COLS = 7;
const TURN_TIMES = [0, 15, 30, 60];

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
  return {
    settings: { ...settings },
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
    players: [],
    names: [],
    turn: 0,
    moves: 0,
    last: null,
    deadline: 0,
    timeouts: [0, 0],
    over: false,
  };
}

function resetClock(st, api) {
  st.deadline = st.settings.turnTime ? api.now() + st.settings.turnTime * 1000 : 0;
}

function start(st, api) {
  const ps = api.seated().slice(0, 2);
  if (api.gameCount() % 2 === 0) ps.reverse(); // alternate who goes first
  st.players = ps.map((m) => m.id);
  st.names = ps.map((m) => m.name);
  st.avatars = ps.map((m) => m.avatar);
  resetClock(st, api);
  api.sys(`${st.names[0]} goes first.`, 'accent');
  api.changed();
}

function winLine(b, r, c) {
  const who = b[r][c];
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const line = [[r, c]];
    for (const s of [1, -1]) {
      let rr = r + dr * s;
      let cc = c + dc * s;
      while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && b[rr][cc] === who) {
        line.push([rr, cc]);
        rr += dr * s;
        cc += dc * s;
      }
    }
    if (line.length >= 4) return line;
  }
  return null;
}

function openCols(st) {
  return [...Array(COLS).keys()].filter((c) => st.board[0][c] === 0);
}

function drop(st, api, col) {
  let r = ROWS - 1;
  while (r >= 0 && st.board[r][col] !== 0) r--;
  if (r < 0) return false;
  st.board[r][col] = st.turn + 1;
  st.last = { r, c: col };
  st.moves++;
  const line = winLine(st.board, r, col);
  if (line) return finish(st, api, st.turn, line);
  if (st.moves === ROWS * COLS) return finish(st, api, null);
  st.turn = 1 - st.turn;
  resetClock(st, api);
  api.changed();
  return true;
}

function finish(st, api, winnerIdx, line, forfeit) {
  st.over = true;
  const result = {
    type: 'fourrow',
    board: st.board,
    winLine: line || null,
    last: st.last,
    players: st.players.map((id, i) => ({ id, name: st.names[i], avatar: st.avatars[i], color: i + 1 })),
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
  if (st.over || !a || a.type !== 'drop') return;
  const idx = st.players.indexOf(m.id);
  if (idx !== st.turn) return;
  const col = clampInt(a.col, 0, COLS - 1, -1);
  if (col < 0) return;
  if (drop(st, api, col)) st.timeouts[idx] = 0;
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
  const cols = openCols(st);
  api.sys(`${st.names[idx]} ran out of time, so a random move was made.`, 'warn');
  drop(st, api, cols[Math.floor(Math.random() * cols.length)]);
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
    players: st.players.map((id, i) => ({ id, name: st.names[i], avatar: st.avatars[i], color: i + 1 })),
    turn: st.turn,
    myIndex: st.players.indexOf(m.id),
    timeLeft: st.deadline ? Math.max(0, st.deadline - now) : null,
    totalTime: st.settings.turnTime * 1000,
    last: st.last,
    moves: st.moves,
  };
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view };
