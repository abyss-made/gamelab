// Rule-based bots for perfect-information board games. Each strategy reads only what a human
// player sees (the public board) and returns the same action object a client would send, which the
// game module then validates like any other action. Randomness comes from ctx.rng (seedable).
const checkersRules = require('../games/checkersrules');
const chessRules = require('../games/chessrules');

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

// ---------- Tic Tac Toe ----------
const TTT_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const tttWinner = (b) => {
  for (const [x, y, z] of TTT_LINES) if (b[x] && b[x] === b[y] && b[y] === b[z]) return b[x];
  return 0;
};
function tttScore(b, turn, me) {
  const w = tttWinner(b);
  if (w) return w === me ? 10 : -10;
  const open = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  if (!open.length) return 0;
  let best = turn === me ? -Infinity : Infinity;
  for (const i of open) {
    b[i] = turn;
    const s = tttScore(b, 3 - turn, me) + (turn === me ? -0.01 : 0.01); // prefer quicker wins
    b[i] = 0;
    best = turn === me ? Math.max(best, s) : Math.min(best, s);
  }
  return best;
}
const tictactoe = {
  ready: (st, m) => !st.over && st.players.indexOf(m.id) === st.turn,
  decide(st, m, { difficulty, rng }) {
    const me = st.players.indexOf(m.id) + 1;
    const b = st.board.slice();
    const open = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    if (!open.length) return null;
    const smart = difficulty === 'hard' || (difficulty === 'normal' && rng() < 0.75) || (difficulty === 'easy' && rng() < 0.25);
    if (!smart) return { type: 'place', cell: pick(open, rng) };
    const scored = open.map((i) => {
      b[i] = me;
      const s = tttScore(b, 3 - me, me);
      b[i] = 0;
      return { i, s };
    });
    const top = Math.max(...scored.map((x) => x.s));
    return { type: 'place', cell: pick(scored.filter((x) => x.s === top).map((x) => x.i), rng) };
  },
};

// ---------- 4 in a Row ----------
const FR_ROWS = 6;
const FR_COLS = 7;
function frDrop(b, col, who) {
  for (let r = FR_ROWS - 1; r >= 0; r--) {
    if (!b[r][col]) {
      b[r][col] = who;
      return r;
    }
  }
  return -1;
}
function frFour(b, r, c) {
  const who = b[r][c];
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    let n = 1;
    for (const s of [1, -1]) {
      let rr = r + dr * s;
      let cc = c + dc * s;
      while (rr >= 0 && rr < FR_ROWS && cc >= 0 && cc < FR_COLS && b[rr][cc] === who) {
        n++;
        rr += dr * s;
        cc += dc * s;
      }
    }
    if (n >= 4) return true;
  }
  return false;
}
function frEval(b, me) {
  let s = 0;
  const win = (cells) => {
    const mine = cells.filter((v) => v === me).length;
    const theirs = cells.filter((v) => v === 3 - me).length;
    if (mine && theirs) return 0;
    const n = mine || theirs;
    const val = n === 4 ? 1000 : n === 3 ? 12 : n === 2 ? 3 : 0;
    return mine ? val : -val * 1.1;
  };
  for (let r = 0; r < FR_ROWS; r++) {
    for (let c = 0; c < FR_COLS; c++) {
      if (b[r][c] === me && c === 3) s += 3;
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const er = r + dr * 3;
        const ec = c + dc * 3;
        if (er < 0 || er >= FR_ROWS || ec < 0 || ec >= FR_COLS) continue;
        s += win([0, 1, 2, 3].map((k) => b[r + dr * k][c + dc * k]));
      }
    }
  }
  return s;
}
// Negamax-free alpha-beta from `me`'s point of view.
function frSearch(b, depth, turn, me, alpha, beta, order) {
  const cols = order.filter((c) => !b[0][c]);
  if (!cols.length) return 0;
  const maximizing = turn === me;
  let best = maximizing ? -Infinity : Infinity;
  for (const c of cols) {
    const r = frDrop(b, c, turn);
    let s;
    if (frFour(b, r, c)) s = (maximizing ? 100000 : -100000) + (maximizing ? depth : -depth);
    else if (depth <= 1) s = frEval(b, me);
    else s = frSearch(b, depth - 1, 3 - turn, me, alpha, beta, order);
    b[r][c] = 0;
    if (maximizing) {
      best = Math.max(best, s);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, s);
      beta = Math.min(beta, best);
    }
    if (alpha >= beta) break;
  }
  return best;
}
const fourrow = {
  ready: (st, m) => !st.over && st.players.indexOf(m.id) === st.turn,
  decide(st, m, { difficulty, rng }) {
    const me = st.players.indexOf(m.id) + 1;
    const b = st.board.map((row) => row.slice());
    const cols = [3, 2, 4, 1, 5, 0, 6].filter((c) => !b[0][c]);
    if (!cols.length) return null;
    const depth = difficulty === 'hard' ? 6 : difficulty === 'normal' ? 4 : 2;
    if (difficulty === 'easy' && rng() < 0.3) return { type: 'drop', col: pick(cols, rng) };
    const scored = cols.map((c) => {
      const r = frDrop(b, c, me);
      const s = frFour(b, r, c) ? 1e6 : frSearch(b, depth - 1, 3 - me, me, -Infinity, Infinity, [3, 2, 4, 1, 5, 0, 6]);
      b[r][c] = 0;
      return { c, s };
    });
    const top = Math.max(...scored.map((x) => x.s));
    return { type: 'drop', col: pick(scored.filter((x) => x.s === top).map((x) => x.c), rng) };
  },
};

// ---------- Dots & Boxes ----------
function dbSides(st, r, c) {
  return (st.h[r][c] >= 0) + (st.h[r + 1][c] >= 0) + (st.v[r][c] >= 0) + (st.v[r][c + 1] >= 0);
}
function dbEdges(st) {
  const out = [];
  st.h.forEach((row, r) => row.forEach((v, c) => v === -1 && out.push({ kind: 'h', r, c })));
  st.v.forEach((row, r) => row.forEach((v, c) => v === -1 && out.push({ kind: 'v', r, c })));
  return out;
}
function dbTouching(st, e) {
  const n = st.n;
  const cells = e.kind === 'h' ? [[e.r - 1, e.c], [e.r, e.c]] : [[e.r, e.c - 1], [e.r, e.c]];
  return cells.filter(([r, c]) => r >= 0 && r < n && c >= 0 && c < n);
}
// How many boxes an opponent who grabs everything could take after this edge is drawn.
function dbGiveaway(st, e) {
  const h = st.h.map((x) => x.slice());
  const v = st.v.map((x) => x.slice());
  (e.kind === 'h' ? h : v)[e.r][e.c] = 1;
  const sim = { n: st.n, h, v };
  let taken = 0;
  for (let again = true; again; ) {
    again = false;
    for (let r = 0; r < st.n && !again; r++) {
      for (let c = 0; c < st.n && !again; c++) {
        if (dbSides(sim, r, c) !== 3) continue;
        const missing = h[r][c] < 0 ? { kind: 'h', r, c } : h[r + 1][c] < 0 ? { kind: 'h', r: r + 1, c } : v[r][c] < 0 ? { kind: 'v', r, c } : { kind: 'v', r, c: c + 1 };
        (missing.kind === 'h' ? h : v)[missing.r][missing.c] = 1;
        taken++;
        again = true;
      }
    }
  }
  return taken;
}
const dotsboxes = {
  ready: (st, m) => !st.over && !!st.players[st.turn] && st.players[st.turn].id === m.id && !st.players[st.turn].out,
  decide(st, m, { difficulty, rng }) {
    const open = dbEdges(st);
    if (!open.length) return null;
    const act = (e) => ({ type: 'edge', kind: e.kind, r: e.r, c: e.c });
    const completes = open.filter((e) => dbTouching(st, e).some(([r, c]) => st.boxes[r][c] === -1 && dbSides(st, r, c) === 3));
    if (completes.length && (difficulty !== 'easy' || rng() < 0.6)) return act(pick(completes, rng));
    if (difficulty === 'easy') return act(pick(open, rng));
    const safe = open.filter((e) => dbTouching(st, e).every(([r, c]) => dbSides(st, r, c) < 2));
    if (safe.length) return act(pick(safe, rng));
    if (difficulty === 'normal') return act(pick(open, rng));
    // Hard: every move opens a box now, so give away as little as possible.
    const scored = open.map((e) => ({ e, g: dbGiveaway(st, e) }));
    const low = Math.min(...scored.map((x) => x.g));
    return act(pick(scored.filter((x) => x.g === low).map((x) => x.e), rng));
  },
};

// ---------- Checkers ----------
function ckEval(pos, me) {
  let s = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = pos.board[sq];
    if (!p) continue;
    const mine = checkersRules.owner(p) === me;
    const king = checkersRules.isKing(p);
    const rank = sq >> 3;
    const adv = checkersRules.owner(p) === 0 ? rank : 7 - rank;
    const v = king ? 160 : 100 + adv * 4;
    s += mine ? v : -v;
  }
  return s;
}
function ckSearch(pos, depth, me, alpha, beta) {
  const out = checkersRules.outcome(pos);
  if (out) return out.winner === null ? 0 : out.winner === me ? 10000 + depth : -10000 - depth;
  if (depth <= 0 && pos.chain < 0) return ckEval(pos, me);
  const moves = checkersRules.legalMoves(pos);
  const maximizing = pos.turn === me;
  let best = maximizing ? -Infinity : Infinity;
  for (const mv of moves) {
    const s = ckSearch(checkersRules.apply(pos, mv), depth - 1, me, alpha, beta);
    if (maximizing) {
      best = Math.max(best, s);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, s);
      beta = Math.min(beta, best);
    }
    if (alpha >= beta) break;
  }
  return best;
}
const checkers = {
  ready: (st, m) => !st.over && st.players.indexOf(m.id) === st.pos.turn,
  decide(st, m, { difficulty, rng }) {
    const me = st.players.indexOf(m.id);
    const moves = checkersRules.legalMoves(st.pos);
    if (!moves.length) return null;
    const move = (mv) => ({ type: 'move', from: mv.from, to: mv.to });
    if (difficulty === 'easy' && rng() < 0.5) return move(pick(moves, rng));
    const depth = difficulty === 'hard' ? 6 : difficulty === 'normal' ? 3 : 1;
    const scored = moves.map((mv) => ({ mv, s: ckSearch(checkersRules.apply(st.pos, mv), depth - 1, me, -Infinity, Infinity) }));
    const top = Math.max(...scored.map((x) => x.s));
    return move(pick(scored.filter((x) => x.s === top).map((x) => x.mv), rng));
  },
};

// ---------- Chess ----------
const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
function chEval(pos, colour) {
  let s = 0;
  for (let i = 0; i < 64; i++) {
    const p = pos.board[i];
    if (!p) continue;
    const f = i & 7;
    const r = i >> 3;
    const rel = p[0] === 'w' ? r : 7 - r;
    let v = VAL[p[1]];
    if (p[1] === 'P') v += rel * 6;
    else if (p[1] !== 'K' && p[1] !== 'R') v += 8 - Math.abs(3.5 - f) * 2 - Math.abs(3.5 - r) * 2; // centralise minor pieces and the queen
    s += p[0] === colour ? v : -v;
  }
  return s;
}
function chOrder(pos, moves) {
  return moves
    .map((mv) => ({ mv, k: (pos.board[mv.to] ? VAL[pos.board[mv.to][1]] * 10 - VAL[pos.board[mv.from][1]] : 0) + (mv.promo ? 800 : 0) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.mv);
}
function chSearch(pos, depth, colour, alpha, beta) {
  const moves = chessRules.legalMoves(pos);
  if (!moves.length) return chessRules.inCheck(pos) ? (pos.turn === colour ? -50000 - depth : 50000 + depth) : 0;
  if (depth <= 0) return chEval(pos, colour);
  const maximizing = pos.turn === colour;
  let best = maximizing ? -Infinity : Infinity;
  for (const mv of chOrder(pos, moves)) {
    const s = chSearch(chessRules.apply(pos, mv), depth - 1, colour, alpha, beta);
    if (maximizing) {
      best = Math.max(best, s);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, s);
      beta = Math.min(beta, best);
    }
    if (alpha >= beta) break;
  }
  return best;
}
const chess = {
  ready: (st, m) => !st.over && st.players.indexOf(m.id) === (st.pos.turn === 'w' ? 0 : 1),
  decide(st, m, { difficulty, rng }) {
    const colour = st.pos.turn;
    const moves = chessRules.legalMoves(st.pos);
    if (!moves.length) return null;
    const act = (mv) => ({ type: 'move', from: mv.from, to: mv.to, ...(mv.promo ? { promo: mv.promo } : {}) });
    if (difficulty === 'easy' && rng() < 0.5) return act(pick(chOrder(st.pos, moves).slice(0, 4), rng));
    const depth = difficulty === 'hard' ? 3 : 2; // shallow on purpose: bounded CPU on a shared server
    const scored = chOrder(st.pos, moves).map((mv) => ({ mv, s: chSearch(chessRules.apply(st.pos, mv), depth - 1, colour, -Infinity, Infinity) + rng() * 2 }));
    const top = Math.max(...scored.map((x) => x.s));
    return act(scored.find((x) => x.s === top).mv);
  },
};

// ---------- Rock Paper Scissors Tournament ----------
// Picks are private and final. The bot never looks at anyone else's pick, only whether a throw is open.
const MOVES = ['rock', 'paper', 'scissors'];
const thrown = new WeakMap(); // game state -> Map(member id -> throw number); per game, so a rematch starts clean
const thrownIn = (st) => thrown.get(st) || thrown.set(st, new Map()).get(st);
const rps = {
  ready: (st, m) => !st.over && st.phase === 'pick' && thrownIn(st).get(m.id) !== st.throwNo,
  decide(st, m, { rng }) {
    thrownIn(st).set(m.id, st.throwNo);
    return { type: 'pick', move: pick(MOVES, rng) };
  },
};

module.exports = { tictactoe, fourrow, dotsboxes, checkers, chess, rps };
