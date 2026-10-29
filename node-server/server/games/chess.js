// Chess: two players, full legal move validation on the server (rules live in chessrules.js).
// Draws: stalemate, insufficient material, threefold repetition, fifty-move rule, or by agreement.
// Optional per-side clock; with the clock off, 3 minutes of inactivity forfeits.
const R = require('./chessrules');

const meta = { id: 'chess', name: 'Chess', minPlayers: 2, maxPlayers: 2, midJoin: false, resetScores: false, scoreLabel: 'wins' };

const CLOCKS = [0, 3, 5, 10, 15];
const INCREMENTS = [0, 2, 5];
const IDLE_MS = 180000;
const defaults = { clock: 10, increment: 0, winnerStays: true };

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (CLOCKS.includes(s.clock)) o.clock = s.clock;
  if (INCREMENTS.includes(s.increment)) o.increment = s.increment;
  if (typeof s.winnerStays === 'boolean') o.winnerStays = s.winnerStays;
  return o;
}

function create(settings) {
  return {
    settings: { ...settings }, pos: R.initial(), players: [], names: [], avatars: [], moves: [], last: null,
    seen: {}, clocks: [0, 0], turnStart: 0, deadline: 0, drawOffer: -1, offered: [false, false], over: false,
  };
}

const idxOfColour = (c) => (c === 'w' ? 0 : 1);

function setDeadline(st, api) {
  const now = api.now();
  st.turnStart = now;
  st.deadline = st.settings.clock ? now + st.clocks[idxOfColour(st.pos.turn)] : now + IDLE_MS;
}

function start(st, api) {
  const ps = api.seated().slice(0, 2);
  if (api.gameCount() % 2 === 0) ps.reverse(); // alternate colours between games
  st.players = ps.map((m) => m.id);
  st.names = ps.map((m) => m.name);
  st.avatars = ps.map((m) => m.avatar);
  const ms = st.settings.clock * 60000;
  st.clocks = [ms, ms];
  st.seen[R.posKey(st.pos)] = 1;
  setDeadline(st, api);
  api.sys(`${st.names[0]} plays White and goes first.`, 'accent');
  api.changed();
}

const REASONS = {
  checkmate: 'Checkmate', stalemate: 'Stalemate', insufficient: 'Draw: insufficient material', fifty: 'Draw: fifty-move rule',
  threefold: 'Draw: threefold repetition', agreement: 'Draw by agreement', resign: 'Resignation', time: 'Out of time', abandoned: 'Opponent left', idle: 'Opponent stopped moving',
};

function finish(st, api, winnerIdx, reason, forfeit) {
  if (st.over) return;
  st.over = true;
  const result = {
    type: 'chess',
    board: st.pos.board,
    last: st.last,
    moves: st.moves,
    players: st.players.map((id, i) => ({ id, name: st.names[i], avatar: st.avatars[i], colour: i ? 'b' : 'w' })),
    winnerId: winnerIdx === null ? null : st.players[winnerIdx],
    draw: winnerIdx === null,
    reason,
    reasonText: REASONS[reason] || reason,
    forfeit: !!forfeit,
  };
  if (winnerIdx === null) {
    api.sys(`Draw (${REASONS[reason]}).`, 'accent');
  } else {
    const w = api.member(st.players[winnerIdx]);
    if (w) w.score += 1;
    api.sys(`${st.names[winnerIdx]} wins by ${String(REASONS[reason]).toLowerCase()}!`, 'good');
    if (st.settings.winnerStays) result.nextUp = api.rotateLoser(st.players[1 - winnerIdx]);
  }
  api.end(result);
}

function checkEnd(st, api) {
  const s = R.status(st.pos);
  const mover = idxOfColour(st.pos.turn);
  if (s === 'checkmate') return finish(st, api, 1 - mover, 'checkmate');
  if (s) return finish(st, api, null, s);
  if ((st.seen[R.posKey(st.pos)] || 0) >= 3) return finish(st, api, null, 'threefold');
  return false;
}

function onAction(st, m, a, api) {
  if (st.over || !a || typeof a !== 'object') return;
  const me = st.players.indexOf(m.id);
  if (me < 0) return;
  const turn = idxOfColour(st.pos.turn);
  if (a.type === 'resign') return finish(st, api, 1 - me, 'resign', true);
  if (a.type === 'offerDraw') {
    if (st.drawOffer >= 0 || st.offered[me]) return; // one standing offer, one per move
    st.offered[me] = true;
    st.drawOffer = me;
    api.sys(`${st.names[me]} offers a draw.`, 'info');
    return api.changed();
  }
  if (a.type === 'declineDraw') {
    if (st.drawOffer < 0 || st.drawOffer === me) return;
    st.drawOffer = -1;
    return api.changed();
  }
  if (a.type === 'acceptDraw') {
    if (st.drawOffer < 0 || st.drawOffer === me) return;
    return finish(st, api, null, 'agreement');
  }
  if (a.type !== 'move' || me !== turn) return;
  const { from, to } = a;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from > 63 || to < 0 || to > 63) return;
  const promo = a.promo === undefined ? undefined : a.promo;
  if (promo !== undefined && !['Q', 'R', 'B', 'N'].includes(promo)) return;
  const cands = R.legalMoves(st.pos).filter((mv) => mv.from === from && mv.to === to);
  if (!cands.length) return;
  let mv = cands[0];
  if (cands.length > 1) mv = cands.find((c) => c.promo === (promo || 'Q')); // promotion choice, queen by default
  if (!mv) return;
  play(st, api, mv, me);
}

function play(st, api, mv, me) {
  const now = api.now();
  if (st.settings.clock) {
    st.clocks[me] = Math.max(0, st.clocks[me] - (now - st.turnStart)) + st.settings.increment * 1000;
  }
  let text = R.san(st.pos, mv);
  st.moves.push(text);
  st.last = { from: mv.from, to: mv.to };
  st.pos = R.apply(st.pos, mv);
  const key = R.posKey(st.pos);
  st.seen[key] = (st.seen[key] || 0) + 1;
  st.drawOffer = -1; // moving declines a standing offer
  st.offered[1 - me] = false; // the opponent may offer again after a move
  st.idle = 0;
  if (checkEnd(st, api) === false) {
    setDeadline(st, api);
    api.changed();
  }
}

function lacksMatingMaterial(board, colour) {
  // Can `colour` ever mate? Strip the other side down to its king and ask.
  return R.insufficientMaterial(board.map((p) => (p && (p[0] === colour || p[1] === 'K') ? p : null)));
}

function tick(st, api, now) {
  if (st.over || !st.deadline || now < st.deadline) return;
  const loser = idxOfColour(st.pos.turn);
  if (st.settings.clock) {
    if (lacksMatingMaterial(st.pos.board, st.pos.turn === 'w' ? 'b' : 'w')) return finish(st, api, null, 'insufficient');
    api.sys(`${st.names[loser]} ran out of time.`, 'warn');
    return finish(st, api, 1 - loser, 'time', true);
  }
  api.sys(`${st.names[loser]} stopped moving, so ${st.names[1 - loser]} wins.`, 'warn');
  finish(st, api, 1 - loser, 'idle', true);
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
  const turn = idxOfColour(st.pos.turn);
  const legal = {};
  if (!st.over && me === turn) for (const mv of R.legalMoves(st.pos)) (legal[mv.from] = legal[mv.from] || []).push(mv.promo && mv.promo !== 'Q' ? null : mv.to);
  for (const k of Object.keys(legal)) legal[k] = legal[k].filter((x) => x !== null);
  const clocks = st.settings.clock ? st.clocks.map((c, i) => (i === turn ? Math.max(0, st.deadline - now) : c)) : null;
  return {
    board: st.pos.board,
    turn,
    myIndex: me,
    legal,
    last: st.last,
    check: R.inCheck(st.pos) ? R.kingSquare(st.pos.board, st.pos.turn) : -1,
    moves: st.moves,
    players: st.players.map((id, i) => ({ id, name: st.names[i], avatar: st.avatars[i], colour: i ? 'b' : 'w' })),
    clocks,
    idleLeft: st.settings.clock ? null : Math.max(0, st.deadline - now),
    drawOffer: st.drawOffer,
    canOffer: me >= 0 && st.drawOffer < 0 && !st.offered[me],
    half: st.pos.half,
  };
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view };
