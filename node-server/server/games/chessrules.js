// Pure chess rules: legal move generation, check / checkmate / stalemate, castling, en passant,
// promotion and automatic draws. No I/O, so it can be tested with perft counts.
// Board: array of 64 squares, index = rank * 8 + file, rank 0 is White's back rank (a1 = 0, h8 = 63).
// Pieces are two characters: colour ('w' | 'b') + type ('P','N','B','R','Q','K'); empty squares are null.

const FILES = 'abcdefgh';
const sqName = (i) => FILES[i & 7] + ((i >> 3) + 1);
const sqIndex = (name) => (/^[a-h][1-8]$/.test(name) ? (name.charCodeAt(1) - 49) * 8 + (name.charCodeAt(0) - 97) : -1);

const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function initial() {
  const b = Array(64).fill(null);
  const back = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let f = 0; f < 8; f++) {
    b[f] = 'w' + back[f];
    b[8 + f] = 'wP';
    b[48 + f] = 'bP';
    b[56 + f] = 'b' + back[f];
  }
  return { board: b, turn: 'w', castling: { wK: true, wQ: true, bK: true, bQ: true }, ep: -1, half: 0, full: 1 };
}

function fromFEN(fen) {
  const [placement, turn, cast, ep, half, full] = fen.split(' ');
  const board = Array(64).fill(null);
  placement.split('/').forEach((row, i) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) f += Number(ch);
      else board[(7 - i) * 8 + f++] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
    }
  });
  return {
    board, turn, ep: ep && ep !== '-' ? sqIndex(ep) : -1, half: Number(half || 0), full: Number(full || 1),
    castling: { wK: cast.includes('K'), wQ: cast.includes('Q'), bK: cast.includes('k'), bQ: cast.includes('q') },
  };
}

function attacked(board, sq, by) {
  const f = sq & 7, r = sq >> 3;
  const at = (ff, rr) => (ff >= 0 && ff < 8 && rr >= 0 && rr < 8 ? board[rr * 8 + ff] : null);
  const pr = by === 'w' ? r - 1 : r + 1; // a pawn of `by` attacks from the rank behind the target
  for (const df of [-1, 1]) if (at(f + df, pr) === by + 'P') return true;
  for (const [df, dr] of KNIGHT) if (at(f + df, r + dr) === by + 'N') return true;
  for (const [df, dr] of KING) if (at(f + df, r + dr) === by + 'K') return true;
  for (const [df, dr] of DIAG) {
    for (let k = 1; k < 8; k++) {
      const p = at(f + df * k, r + dr * k);
      if (p === undefined) break;
      if (p) { if (p === by + 'B' || p === by + 'Q') return true; break; }
    }
  }
  for (const [df, dr] of ORTHO) {
    for (let k = 1; k < 8; k++) {
      const p = at(f + df * k, r + dr * k);
      if (p === undefined) break;
      if (p) { if (p === by + 'R' || p === by + 'Q') return true; break; }
    }
  }
  return false;
}

const kingSquare = (board, c) => board.indexOf(c + 'K');
const inCheck = (pos, c = pos.turn) => {
  const k = kingSquare(pos.board, c);
  return k >= 0 && attacked(pos.board, k, c === 'w' ? 'b' : 'w');
};

// Moves ignoring whether they leave the mover's king in check.
function pseudoMoves(pos) {
  const { board, turn: c, castling, ep } = pos;
  const opp = c === 'w' ? 'b' : 'w';
  const out = [];
  const add = (from, to, extra) => out.push({ from, to, ...extra });
  for (let from = 0; from < 64; from++) {
    const p = board[from];
    if (!p || p[0] !== c) continue;
    const t = p[1];
    const f = from & 7, r = from >> 3;
    if (t === 'P') {
      const dir = c === 'w' ? 1 : -1;
      const startRank = c === 'w' ? 1 : 6;
      const lastRank = c === 'w' ? 7 : 0;
      const push = (to, extra) => {
        if ((to >> 3) === lastRank) for (const promo of ['Q', 'R', 'B', 'N']) add(from, to, { promo, ...extra });
        else add(from, to, extra);
      };
      const one = from + dir * 8;
      if (one >= 0 && one < 64 && !board[one]) {
        push(one);
        if (r === startRank && !board[one + dir * 8]) add(from, one + dir * 8, { double: true });
      }
      for (const df of [-1, 1]) {
        const ff = f + df;
        if (ff < 0 || ff > 7) continue;
        const to = (r + dir) * 8 + ff;
        if (to < 0 || to > 63) continue;
        if (board[to] && board[to][0] === opp) push(to, { capture: true });
        else if (to === ep) add(from, to, { capture: true, enPassant: true });
      }
    } else if (t === 'N' || t === 'K') {
      for (const [df, dr] of t === 'N' ? KNIGHT : KING) {
        const ff = f + df, rr = r + dr;
        if (ff < 0 || ff > 7 || rr < 0 || rr > 7) continue;
        const to = rr * 8 + ff;
        if (!board[to]) add(from, to);
        else if (board[to][0] === opp) add(from, to, { capture: true });
      }
      if (t === 'K') {
        const home = c === 'w' ? 4 : 60;
        if (from === home && !attacked(board, home, opp)) {
          if (castling[c + 'K'] && board[home + 3] === c + 'R' && !board[home + 1] && !board[home + 2] && !attacked(board, home + 1, opp) && !attacked(board, home + 2, opp)) add(from, home + 2, { castle: 'K' });
          if (castling[c + 'Q'] && board[home - 4] === c + 'R' && !board[home - 1] && !board[home - 2] && !board[home - 3] && !attacked(board, home - 1, opp) && !attacked(board, home - 2, opp)) add(from, home - 2, { castle: 'Q' });
        }
      }
    } else {
      const dirs = t === 'B' ? DIAG : t === 'R' ? ORTHO : DIAG.concat(ORTHO);
      for (const [df, dr] of dirs) {
        for (let k = 1; k < 8; k++) {
          const ff = f + df * k, rr = r + dr * k;
          if (ff < 0 || ff > 7 || rr < 0 || rr > 7) break;
          const to = rr * 8 + ff;
          if (!board[to]) { add(from, to); continue; }
          if (board[to][0] === opp) add(from, to, { capture: true });
          break;
        }
      }
    }
  }
  return out;
}

// Returns a new position; the old one is left untouched.
function apply(pos, mv) {
  const board = pos.board.slice();
  const c = pos.turn;
  const piece = board[mv.from];
  const castling = { ...pos.castling };
  let ep = -1;
  const wasCapture = !!board[mv.to] || !!mv.enPassant;
  board[mv.to] = mv.promo ? c + mv.promo : piece;
  board[mv.from] = null;
  if (mv.enPassant) board[mv.to + (c === 'w' ? -8 : 8)] = null;
  if (mv.castle) {
    const home = c === 'w' ? 0 : 56;
    if (mv.castle === 'K') { board[home + 5] = c + 'R'; board[home + 7] = null; } else { board[home + 3] = c + 'R'; board[home] = null; }
  }
  if (mv.double) ep = (mv.from + mv.to) / 2;
  if (piece[1] === 'K') { castling[c + 'K'] = false; castling[c + 'Q'] = false; }
  for (const [sq, key] of [[0, 'wQ'], [7, 'wK'], [56, 'bQ'], [63, 'bK']]) if (mv.from === sq || mv.to === sq) castling[key] = false;
  return {
    board, turn: c === 'w' ? 'b' : 'w', castling, ep,
    half: piece[1] === 'P' || wasCapture ? 0 : pos.half + 1,
    full: pos.full + (c === 'b' ? 1 : 0),
  };
}

function legalMoves(pos) {
  const c = pos.turn;
  return pseudoMoves(pos).filter((mv) => !inCheck(apply(pos, mv), c));
}

function insufficientMaterial(board) {
  const minors = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p || p[1] === 'K') continue;
    if (p[1] === 'P' || p[1] === 'R' || p[1] === 'Q') return false;
    minors.push({ t: p[1], c: p[0], sq: i });
  }
  if (minors.length <= 1) return true; // K vs K, K+minor vs K
  if (minors.every((m) => m.t === 'B')) {
    const colour = (m) => ((m.sq >> 3) + (m.sq & 7)) & 1;
    return minors.every((m) => colour(m) === colour(minors[0])); // bishops all on one colour
  }
  return false;
}

const posKey = (pos) => pos.board.map((p) => p || '-').join('') + pos.turn + ['wK', 'wQ', 'bK', 'bQ'].map((k) => (pos.castling[k] ? 1 : 0)).join('') + legalEpKey(pos);
// A double-step only counts for repetition when an en passant capture is really available.
function legalEpKey(pos) {
  if (pos.ep < 0) return '-';
  return pseudoMoves(pos).some((m) => m.enPassant && !inCheck(apply(pos, m), pos.turn)) ? String(pos.ep) : '-';
}

// 'checkmate' | 'stalemate' | 'insufficient' | 'fifty' | null (threefold is tracked by the caller).
function status(pos) {
  const moves = legalMoves(pos);
  if (!moves.length) return inCheck(pos) ? 'checkmate' : 'stalemate';
  if (insufficientMaterial(pos.board)) return 'insufficient';
  if (pos.half >= 100) return 'fifty';
  return null;
}

// Short algebraic-ish notation for the move list (SAN without disambiguation of check suffix is added by caller).
function san(pos, mv) {
  const piece = pos.board[mv.from];
  if (mv.castle) return mv.castle === 'K' ? 'O-O' : 'O-O-O';
  let s = '';
  if (piece[1] === 'P') {
    if (mv.capture) s += FILES[mv.from & 7] + 'x';
    s += sqName(mv.to);
    if (mv.promo) s += '=' + mv.promo;
  } else {
    s += piece[1];
    const clash = legalMoves(pos).filter((m) => m.to === mv.to && m.from !== mv.from && pos.board[m.from] === piece);
    if (clash.length) {
      const sameFile = clash.some((m) => (m.from & 7) === (mv.from & 7));
      const sameRank = clash.some((m) => (m.from >> 3) === (mv.from >> 3));
      if (!sameFile) s += FILES[mv.from & 7];
      else if (!sameRank) s += (mv.from >> 3) + 1;
      else s += sqName(mv.from);
    }
    if (mv.capture) s += 'x';
    s += sqName(mv.to);
  }
  const next = apply(pos, mv);
  if (inCheck(next)) s += legalMoves(next).length ? '+' : '#';
  return s;
}

function perft(pos, depth) {
  if (depth === 0) return 1;
  const moves = legalMoves(pos);
  if (depth === 1) return moves.length;
  let n = 0;
  for (const mv of moves) n += perft(apply(pos, mv), depth - 1);
  return n;
}

module.exports = { initial, fromFEN, legalMoves, apply, inCheck, status, insufficientMaterial, posKey, san, perft, sqName, sqIndex, kingSquare };
