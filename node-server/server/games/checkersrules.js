// Pure rules for English / American checkers (8x8, dark squares only).
// Board: 64 squares, index = rank * 8 + file; playable squares have (rank + file) even.
// Pieces: 0 empty, 1 / 2 = player 0 / 1 men, 3 / 4 = player 0 / 1 kings.
// Player 0 starts on ranks 0-2 and moves towards rank 7; player 1 the other way.
// Rules: men move and capture forward only, kings in all four diagonals. Captures are mandatory;
// after a jump the same piece must keep jumping if it can. A man that reaches the far rank is
// crowned and its turn ends, even in the middle of a capture. No pieces or no legal moves loses.
// Draw after 80 plies with no capture and no man move.

const owner = (p) => (p === 0 ? -1 : (p - 1) & 1); // 1,3 -> 0 ; 2,4 -> 1
const isKing = (p) => p >= 3;

function initial() {
  const b = Array(64).fill(0);
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      if ((r + f) % 2) continue;
      if (r < 3) b[r * 8 + f] = 1;
      else if (r > 4) b[r * 8 + f] = 2;
    }
  }
  return { board: b, turn: 0, chain: -1, quiet: 0 };
}

function dirsFor(p) {
  if (isKing(p)) return [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  return owner(p) === 0 ? [[1, 1], [1, -1]] : [[-1, 1], [-1, -1]];
}

function jumpsFrom(board, sq) {
  const p = board[sq];
  const me = owner(p);
  const f = sq & 7, r = sq >> 3;
  const out = [];
  for (const [dr, df] of dirsFor(p)) {
    const mr = r + dr, mf = f + df, tr = r + 2 * dr, tf = f + 2 * df;
    if (tr < 0 || tr > 7 || tf < 0 || tf > 7) continue;
    const mid = board[mr * 8 + mf];
    if (mid !== 0 && owner(mid) !== me && board[tr * 8 + tf] === 0) out.push({ from: sq, to: tr * 8 + tf, cap: mr * 8 + mf });
  }
  return out;
}

function stepsFrom(board, sq) {
  const f = sq & 7, r = sq >> 3;
  const out = [];
  for (const [dr, df] of dirsFor(board[sq])) {
    const tr = r + dr, tf = f + df;
    if (tr < 0 || tr > 7 || tf < 0 || tf > 7) continue;
    if (board[tr * 8 + tf] === 0) out.push({ from: sq, to: tr * 8 + tf });
  }
  return out;
}

function legalMoves(pos) {
  const { board, turn, chain } = pos;
  if (chain >= 0) return jumpsFrom(board, chain);
  const jumps = [];
  const steps = [];
  for (let sq = 0; sq < 64; sq++) {
    if (!board[sq] || owner(board[sq]) !== turn) continue;
    jumps.push(...jumpsFrom(board, sq));
    steps.push(...stepsFrom(board, sq));
  }
  return jumps.length ? jumps : steps; // a capture is compulsory
}

// Applies a move from legalMoves and returns the new position plus what happened.
function apply(pos, mv) {
  const board = pos.board.slice();
  let p = board[mv.from];
  const wasMan = !isKing(p);
  board[mv.from] = 0;
  board[mv.to] = p;
  let crowned = false;
  const lastRank = owner(p) === 0 ? 7 : 0;
  if (wasMan && (mv.to >> 3) === lastRank) {
    board[mv.to] = p + 2;
    crowned = true;
  }
  const quiet = mv.cap !== undefined || wasMan ? 0 : pos.quiet + 1;
  if (mv.cap !== undefined) {
    board[mv.cap] = 0;
    if (!crowned && jumpsFrom(board, mv.to).length) return { board, turn: pos.turn, chain: mv.to, quiet, crowned, captured: true, continued: true };
  }
  return { board, turn: 1 - pos.turn, chain: -1, quiet, crowned, captured: mv.cap !== undefined, continued: false };
}

const count = (board, who) => board.reduce((n, p) => n + (p && owner(p) === who ? 1 : 0), 0);

// null while play continues, else { winner: 0|1|null, reason }.
function outcome(pos) {
  if (count(pos.board, pos.turn) === 0) return { winner: 1 - pos.turn, reason: 'captured' };
  if (!legalMoves(pos).length) return { winner: 1 - pos.turn, reason: 'blocked' };
  if (pos.quiet >= 80) return { winner: null, reason: 'quiet' };
  return null;
}

module.exports = { initial, legalMoves, apply, outcome, owner, isKing, count, jumpsFrom };
