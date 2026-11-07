// Batch 4 strategy / board game tests: Battleship, Checkers, Reversi, Ludo, Chess.
// Rules are checked against the modules with a fake room API (fast, deterministic); privacy,
// validation and room persistence are checked with real socket clients.
// Run: node test/batch4.js
const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const { io } = require('socket.io-client');
const { GAMES } = require('../server/games');
const CR = require('../server/games/chessrules');
const KR = require('../server/games/checkersrules');

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fakeRoom(names, gameId, settings, gameCount = 1) {
  const G = GAMES[gameId];
  const members = names.map((n, i) => ({ id: 'p' + i, name: n, avatar: { e: 0, c: 0 }, score: 0 }));
  const log = { sys: [], ended: null, changed: 0, rotated: null };
  let now = 1000000;
  const api = {
    now: () => now,
    seated: () => members,
    member: (id) => members.find((m) => m.id === id),
    gameCount: () => gameCount,
    changed: () => log.changed++,
    sys: (t) => log.sys.push(t),
    toMember: () => {},
    end: (r) => { log.ended = r; },
    rotateLoser: (id) => { log.rotated = id; return 'Next'; },
  };
  const st = G.create({ ...G.defaults, ...settings });
  G.start(st, api);
  const spectator = { id: 'spec', name: 'Spec', avatar: { e: 0, c: 0 }, score: 0 };
  const adv = (ms) => { now += ms; G.tick(st, api, now); };
  const act = (i, a) => G.onAction(st, members[i], a, api);
  const view = (i) => G.view(st, i === 'spec' ? spectator : members[i], now);
  return { G, st, api, members, log, adv, act, view, leave: (i) => G.onLeave(st, members[i].id, api) };
}

// ---------------- Chess rules ----------------
(function chessRules() {
  const start = CR.initial();
  ok(CR.perft(start, 3) === 8902 && CR.perft(start, 4) === 197281, 'Chess rules: perft from the start position matches (8902 / 197281)');
  const kiwi = CR.fromFEN('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
  ok(CR.perft(kiwi, 1) === 48 && CR.perft(kiwi, 2) === 2039 && CR.perft(kiwi, 3) === 97862, 'Chess rules: perft "Kiwipete" (castling, pins, en passant, promotion mix) matches');
  const p3 = CR.fromFEN('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1');
  ok(CR.perft(p3, 4) === 43238, 'Chess rules: perft position 3 (en passant discovered checks) matches');
  const p4 = CR.fromFEN('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1');
  ok(CR.perft(p4, 3) === 9467, 'Chess rules: perft position 4 (promotions, castling out of check) matches');
  // castling not allowed through / out of check or after the rook moved
  const castle = CR.fromFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const cm = CR.legalMoves(castle).filter((m) => m.castle);
  ok(cm.length === 2, 'Chess rules: both castling moves are available when clear');
  const thru = CR.fromFEN('r3k2r/8/8/8/8/5r2/8/R3K2R w KQkq - 0 1');
  ok(!CR.legalMoves(thru).some((m) => m.castle === 'K') && CR.legalMoves(thru).some((m) => m.castle === 'Q'), 'Chess rules: cannot castle through an attacked square, other side still fine');
  const inchk = CR.fromFEN('r3k2r/8/8/8/8/8/4r3/R3K2R w KQkq - 0 1');
  ok(!CR.legalMoves(inchk).some((m) => m.castle), 'Chess rules: cannot castle out of check');
  const moved = CR.apply(castle, CR.legalMoves(castle).find((m) => m.from === CR.sqIndex('h1') && m.to === CR.sqIndex('h2')));
  ok(!moved.castling.wK && moved.castling.wQ, 'Chess rules: moving a rook removes that side\'s castling right');
  // en passant only immediately
  let ep = CR.fromFEN('4k3/8/8/8/3p4/8/4P3/4K3 w - - 0 1');
  ep = CR.apply(ep, CR.legalMoves(ep).find((m) => m.double));
  ok(CR.legalMoves(ep).some((m) => m.enPassant && m.to === CR.sqIndex('e3')), 'Chess rules: en passant capture is offered right after a double step');
  const afterOther = CR.apply(ep, CR.legalMoves(ep).find((m) => m.from === CR.sqIndex('e8')));
  const kmove = CR.apply(afterOther, CR.legalMoves(afterOther).find((m) => m.from === CR.sqIndex('e1')));
  ok(!CR.legalMoves(kmove).some((m) => m.enPassant), 'Chess rules: en passant expires one move later');
  const epDone = CR.apply(ep, CR.legalMoves(ep).find((m) => m.enPassant));
  ok(epDone.board[CR.sqIndex('e4')] === null && epDone.board[CR.sqIndex('e3')] === 'bP', 'Chess rules: en passant removes the captured pawn');
  // promotion
  const promo = CR.fromFEN('8/P6k/8/8/8/8/8/K7 w - - 0 1');
  ok(CR.legalMoves(promo).filter((m) => m.promo).map((m) => m.promo).sort().join('') === 'BNQR', 'Chess rules: a pawn on the seventh rank offers all four promotions');
  // pinned piece
  const pin = CR.fromFEN('4r2k/8/8/8/8/8/4B3/4K3 w - - 0 1');
  ok(CR.legalMoves(pin).every((m) => m.from !== CR.sqIndex('e2')), 'Chess rules: a pinned bishop cannot move off the pin line');
  // end states
  ok(CR.status(CR.fromFEN('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')) === 'stalemate', 'Chess rules: stalemate is detected');
  ok(CR.status(CR.fromFEN('R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1')) === 'checkmate', 'Chess rules: back-rank checkmate is detected');
  ok(CR.status(CR.fromFEN('8/8/4k3/8/8/3K4/8/8 w - - 0 1')) === 'insufficient', 'Chess rules: king vs king is a dead position');
  ok(CR.status(CR.fromFEN('8/8/4k3/8/8/3K4/8/6B1 w - - 0 1')) === 'insufficient', 'Chess rules: king and bishop vs king is a dead position');
  ok(CR.status(CR.fromFEN('8/8/4k3/8/8/3K4/8/6R1 w - - 0 1')) === null, 'Chess rules: king and rook vs king is not a dead position');
  ok(CR.status(CR.fromFEN('8/8/4k3/8/8/3K4/8/6R1 w - - 100 80')) === 'fifty', 'Chess rules: fifty-move rule triggers at 100 half moves');
  ok(CR.insufficientMaterial(CR.fromFEN('b7/8/4k3/8/8/3K4/8/7B w - - 0 1').board) === true, 'Chess rules: bishops on the same colour cannot mate');
  ok(CR.insufficientMaterial(CR.fromFEN('b7/8/4k3/8/8/3K4/8/6B1 w - - 0 1').board) === false, 'Chess rules: bishops on opposite colours can mate');
})();

// ---------------- Chess game ----------------
(function chessGame() {
  const S = CR.sqIndex;
  const mv = (r, i, from, to, promo) => r.act(i, { type: 'move', from: S(from), to: S(to), ...(promo ? { promo } : {}) });
  let r = fakeRoom(['White', 'Black'], 'chess', { clock: 0 });
  ok(r.view(0).myIndex === 0 && r.view(0).turn === 0 && r.view(1).myIndex === 1, 'Chess: first seat plays White and moves first');
  ok(Object.keys(r.view(0).legal).length === 10 && Object.keys(r.view(1).legal).length === 0, 'Chess: only the player to move receives legal moves');
  ok(Object.keys(r.view('spec').legal).length === 0, 'Chess: spectators receive no move list');
  mv(r, 1, 'e7', 'e5');
  ok(r.st.moves.length === 0, 'Chess: moving out of turn is ignored');
  mv(r, 0, 'e2', 'e5');
  mv(r, 0, 'e2', 'e2');
  r.act(0, { type: 'move', from: 'e2', to: 'e4' });
  r.act(0, { type: 'move', from: 12.5, to: 28 });
  r.act(0, { type: 'move', from: -1, to: 99 });
  r.act(0, { type: 'move', from: S('e2'), to: S('e4'), promo: 'K' });
  r.act(0, 'junk');
  r.act(0, null);
  ok(r.st.moves.length === 0, 'Chess: illegal, malformed and out-of-range moves are rejected');
  mv(r, 0, 'f2', 'f3');
  mv(r, 1, 'e7', 'e5');
  mv(r, 0, 'g2', 'g4');
  mv(r, 1, 'd8', 'h4');
  ok(r.log.ended && r.log.ended.winnerId === 'p1' && r.log.ended.reason === 'checkmate', "Chess: fool's mate ends the game with a checkmate win for Black");
  ok(r.st.moves.join(' ') === 'f3 e5 g4 Qh4#', 'Chess: move list uses algebraic notation');
  ok(r.members[1].score === 1 && r.log.rotated === 'p0', 'Chess: winner scores and winner-stays rotates the loser');

  r = fakeRoom(['A', 'B'], 'chess', { clock: 0, winnerStays: false });
  for (const [f, t] of [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4'], ['g8', 'f6'], ['e1', 'g1']]) mv(r, r.st.pos.turn === 'w' ? 0 : 1, f, t);
  ok(r.st.pos.board[S('g1')] === 'wK' && r.st.pos.board[S('f1')] === 'wR', 'Chess: castling moves king and rook');
  ok(r.st.moves[r.st.moves.length - 1] === 'O-O', 'Chess: castling notation');
  // promotion choice and default
  r = fakeRoom(['A', 'B'], 'chess', { clock: 0 });
  r.st.pos = CR.fromFEN('8/P6k/8/8/8/8/8/K7 w - - 0 1');
  mv(r, 0, 'a7', 'a8', 'N');
  ok(r.st.pos.board[S('a8')] === 'wN', 'Chess: underpromotion to a knight is honoured');
  r = fakeRoom(['A', 'B'], 'chess', { clock: 0 });
  r.st.pos = CR.fromFEN('8/P6k/8/8/8/8/8/K7 w - - 0 1');
  mv(r, 0, 'a7', 'a8');
  ok(r.st.pos.board[S('a8')] === 'wQ', 'Chess: promotion defaults to a queen');
  // stalemate via game
  r = fakeRoom(['A', 'B'], 'chess', { clock: 0 });
  r.st.pos = CR.fromFEN('7k/8/5K2/6Q1/8/8/8/8 w - - 0 1');
  mv(r, 0, 'g5', 'g6');
  ok(r.log.ended && r.log.ended.draw && r.log.ended.reason === 'stalemate', 'Chess: stalemate ends the game as a draw');
  // threefold repetition
  r = fakeRoom(['A', 'B'], 'chess', { clock: 0 });
  const shuffle = [['g1', 'f3'], ['g8', 'f6'], ['f3', 'g1'], ['f6', 'g8']];
  for (let k = 0; k < 8 && !r.log.ended; k++) { const [f, t] = shuffle[k % 4]; mv(r, k % 2, f, t); }
  ok(r.log.ended && r.log.ended.reason === 'threefold', 'Chess: threefold repetition is an automatic draw');
  // resign, draw offers
  r = fakeRoom(['A', 'B'], 'chess', { clock: 0 });
  r.act(0, { type: 'offerDraw' });
  r.act(0, { type: 'acceptDraw' });
  ok(!r.log.ended, 'Chess: you cannot accept your own draw offer');
  r.act(1, { type: 'declineDraw' });
  ok(r.view(0).drawOffer === -1, 'Chess: declining clears the offer');
  r.act(0, { type: 'offerDraw' });
  ok(r.view(0).drawOffer === -1 && !r.view(0).canOffer, 'Chess: no repeated offers until the opponent has moved');
  mv(r, 0, 'e2', 'e4');
  r.act(1, { type: 'offerDraw' });
  r.act(0, { type: 'acceptDraw' });
  ok(r.log.ended && r.log.ended.draw && r.log.ended.reason === 'agreement', 'Chess: accepted draw offer ends the game as a draw');
  r = fakeRoom(['A', 'B'], 'chess', { clock: 0 });
  r.act(1, { type: 'resign' });
  ok(r.log.ended && r.log.ended.winnerId === 'p0' && r.log.ended.forfeit, 'Chess: resigning gives the opponent the win (even off turn)');
  r = fakeRoom(['A', 'B'], 'chess', { clock: 0 });
  GAMES.chess.onAction(r.st, { id: 'spec' }, { type: 'resign' }, r.api);
  GAMES.chess.onAction(r.st, { id: 'spec' }, { type: 'move', from: S('e2'), to: S('e4') }, r.api);
  ok(!r.log.ended && r.st.moves.length === 0, 'Chess: spectators cannot move or resign');
  // clock
  r = fakeRoom(['A', 'B'], 'chess', { clock: 3, increment: 0 });
  ok(r.view(0).clocks && r.view(0).clocks[0] === 180000 && r.view(0).clocks[1] === 180000, 'Chess: clocks start at the chosen time');
  r.adv(30000);
  mv(r, 0, 'e2', 'e4');
  ok(r.st.clocks[0] === 150000, 'Chess: the mover\'s clock runs down only on their own turn');
  r.adv(150000 + 181000);
  ok(r.log.ended && r.log.ended.winnerId === 'p0' && r.log.ended.reason === 'time', 'Chess: running out of time loses');
  r = fakeRoom(['A', 'B'], 'chess', { clock: 3, increment: 5 });
  r.adv(10000);
  mv(r, 0, 'e2', 'e4');
  ok(r.st.clocks[0] === 175000, 'Chess: increment is added after a move');
  r = fakeRoom(['A', 'B'], 'chess', { clock: 3 });
  r.st.pos = CR.fromFEN('8/8/4k3/8/8/3K4/8/6r1 w - - 0 1'); // white has only a king: black cannot lose on time
  r.st.pos.turn = 'b';
  r.st.deadline = r.api.now() + 1000;
  r.st.clocks = [1000, 1000];
  r.adv(2000);
  ok(r.log.ended && r.log.ended.draw, 'Chess: timeout against a bare king is a draw, not a loss');
  r = fakeRoom(['A', 'B'], 'chess', { clock: 0 });
  r.adv(181000);
  ok(r.log.ended && r.log.ended.winnerId === 'p1' && r.log.ended.reason === 'idle', 'Chess: with no clock, 3 minutes without a move forfeits');
  r = fakeRoom(['A', 'B'], 'chess', { clock: 0 });
  mv(r, 0, 'e2', 'e4');
  r.leave(0);
  ok(r.log.ended && r.log.ended.winnerId === 'p1', 'Chess: leaving forfeits the game');
  // reverse colours on the second game
  r = fakeRoom(['A', 'B'], 'chess', { clock: 0 }, 2);
  ok(r.st.players[0] === 'p1', 'Chess: colours alternate between games');
  ok(GAMES.chess.sanitizeSettings({ clock: 7, increment: 99, winnerStays: 'x' }, GAMES.chess.defaults).clock === 10, 'Chess: invalid settings are ignored');
})();

// ---------------- Checkers ----------------
(function checkers() {
  const init = KR.initial();
  ok(KR.count(init.board, 0) === 12 && KR.count(init.board, 1) === 12, 'Checkers: 12 pieces each');
  ok(KR.legalMoves(init).length === 7, 'Checkers: 7 opening moves for the first player');
  const mk = (cells, turn = 0) => {
    const board = Array(64).fill(0);
    for (const [sq, p] of Object.entries(cells)) board[Number(sq)] = p;
    return { board, turn, chain: -1, quiet: 0 };
  };
  const at = (r, f) => r * 8 + f;
  // mandatory capture
  let pos = mk({ [at(2, 1)]: 1, [at(3, 2)]: 2, [at(0, 7)]: 1, [at(7, 0)]: 2 });
  let moves = KR.legalMoves(pos);
  ok(moves.length === 1 && moves[0].cap === at(3, 2), 'Checkers: a capture is compulsory when one exists');
  // multi-jump keeps the chain
  pos = mk({ [at(2, 1)]: 1, [at(3, 2)]: 2, [at(5, 4)]: 2, [at(7, 0)]: 2 });
  let res = KR.apply(pos, KR.legalMoves(pos)[0]);
  ok(res.chain === at(4, 3) && res.turn === 0, 'Checkers: after a jump the same piece must keep jumping');
  ok(KR.legalMoves(res).length === 1 && KR.legalMoves(res)[0].from === at(4, 3), 'Checkers: only the jumping piece may move during a chain');
  res = KR.apply(res, KR.legalMoves(res)[0]);
  ok(res.chain === -1 && res.turn === 1 && res.board[at(3, 2)] === 0 && res.board[at(5, 4)] === 0, 'Checkers: chain finishes, both victims removed, turn passes');
  // men cannot move or capture backward
  pos = mk({ [at(3, 2)]: 1, [at(2, 3)]: 2, [at(7, 7)]: 2 });
  ok(KR.legalMoves(pos).every((m) => (m.to >> 3) > (m.from >> 3)), 'Checkers: men only move forward');
  ok(!KR.legalMoves(pos).some((m) => m.cap !== undefined), 'Checkers: men cannot capture backward');
  // king moves and captures backward
  pos = mk({ [at(3, 2)]: 3, [at(2, 3)]: 2, [at(7, 7)]: 2 });
  ok(KR.legalMoves(pos).some((m) => m.cap === at(2, 3)), 'Checkers: kings capture backward');
  // crowning ends the turn even if more jumps exist
  pos = mk({ [at(5, 2)]: 1, [at(6, 3)]: 2, [at(6, 5)]: 2, [at(0, 1)]: 2 });
  res = KR.apply(pos, KR.legalMoves(pos).find((m) => m.cap === at(6, 3)));
  ok(res.board[at(7, 4)] === 3 && res.turn === 1 && res.chain === -1, 'Checkers: a man crowned mid-capture stops there');
  // no moves = loss
  pos = mk({ [at(7, 0)]: 2 }, 0);
  ok(KR.outcome(pos).winner === 1, 'Checkers: a player with no pieces loses');
  const stuck = mk({ [at(7, 0)]: 1, [at(7, 2)]: 2 }, 0); // man on the last rank cannot move forward
  ok(KR.outcome(stuck) && KR.outcome(stuck).winner === 1 && KR.outcome(stuck).reason === 'blocked', 'Checkers: a blocked player with no legal move loses');
  pos = mk({ [at(3, 2)]: 3, [at(6, 5)]: 4 }, 0);
  pos.quiet = 80;
  ok(KR.outcome(pos).winner === null, 'Checkers: 80 quiet plies is a draw');

  // game module
  let r = fakeRoom(['A', 'B'], 'checkers', { turnTime: 30 });
  ok(Object.keys(r.view(0).legal).length === 4 && Object.keys(r.view(1).legal).length === 0, 'Checkers: only the mover receives legal moves');
  const m1 = Object.entries(r.view(0).legal)[0];
  r.act(1, { type: 'move', from: Number(m1[0]), to: m1[1][0] });
  ok(r.st.moves === 0, 'Checkers: out-of-turn moves are ignored');
  r.act(0, { type: 'move', from: 0, to: 9 });
  r.act(0, { type: 'move', from: 'x', to: 9 });
  r.act(0, { type: 'move', from: 1.5, to: 9 });
  ok(r.st.moves === 0, 'Checkers: illegal or malformed moves are ignored');
  r.act(0, { type: 'move', from: Number(m1[0]), to: m1[1][0] });
  ok(r.st.moves === 1 && r.view(1).turn === 1 && Object.keys(r.view(1).legal).length > 0, 'Checkers: a legal move passes the turn');
  // forced jump through the module, chain turn kept
  r = fakeRoom(['A', 'B'], 'checkers', { turnTime: 30 });
  r.st.pos = mk({ [at(2, 1)]: 1, [at(3, 2)]: 2, [at(5, 4)]: 2, [at(7, 0)]: 2 });
  ok(r.view(0).mustJump === true, 'Checkers: the view tells the mover a jump is compulsory');
  r.act(0, { type: 'move', from: at(2, 1), to: at(3, 0) });
  ok(r.st.moves === 0, 'Checkers: a plain step is rejected while a capture is available');
  r.act(0, { type: 'move', from: at(2, 1), to: at(4, 3) });
  ok(r.view(0).chain === at(4, 3) && r.view(0).turn === 0, 'Checkers: the jumper keeps the turn mid-chain');
  r.act(0, { type: 'move', from: at(4, 3), to: at(6, 5) });
  ok(r.view(1).turn === 1 && r.view(1).chain === -1, 'Checkers: turn passes after the chain ends');
  // win by capturing the last piece
  r = fakeRoom(['A', 'B'], 'checkers', { turnTime: 30 });
  r.st.pos = mk({ [at(2, 1)]: 1, [at(3, 2)]: 2 });
  r.act(0, { type: 'move', from: at(2, 1), to: at(4, 3) });
  ok(r.log.ended && r.log.ended.winnerId === 'p0' && r.members[0].score === 1, 'Checkers: capturing the last piece wins');
  // timeouts
  r = fakeRoom(['A', 'B'], 'checkers', { turnTime: 20 });
  r.adv(21000);
  ok(r.st.moves >= 1 && r.st.pos.turn === 1 && !r.log.ended, 'Checkers: first timeout plays a random legal move');
  r.adv(21000);
  r.adv(21000);
  r.adv(21000);
  ok(r.log.ended && r.log.ended.forfeit, 'Checkers: repeated timeouts forfeit');
  r = fakeRoom(['A', 'B'], 'checkers', { turnTime: 20 });
  r.st.pos = mk({ [at(2, 1)]: 1, [at(3, 2)]: 2, [at(5, 4)]: 2, [at(7, 0)]: 2 });
  r.adv(21000);
  ok(r.st.pos.chain === -1 && r.st.pos.board[at(5, 4)] === 0, 'Checkers: a timeout move completes a multi-jump');
  r = fakeRoom(['A', 'B'], 'checkers', { turnTime: 0 });
  r.act(0, { type: 'resign' });
  ok(r.log.ended && r.log.ended.winnerId === 'p1', 'Checkers: resigning loses');
  r = fakeRoom(['A', 'B'], 'checkers', {});
  r.leave(1);
  ok(r.log.ended && r.log.ended.winnerId === 'p0', 'Checkers: leaving forfeits');
})();

// ---------------- Reversi ----------------
(function reversi() {
  const { rules } = GAMES.reversi;
  const b0 = rules.initialBoard();
  ok(rules.legalSquares(b0, 1).length === 4 && rules.legalSquares(b0, 2).length === 4, 'Reversi: four opening moves for each side');
  ok(rules.flips(b0, 2 * 8 + 3, 1).length === 1 && rules.flips(b0, 0, 1).length === 0, 'Reversi: flips counted, non-flipping squares are illegal');
  let r = fakeRoom(['A', 'B'], 'reversi', { turnTime: 30 });
  ok(JSON.stringify(r.view(0).legal) === JSON.stringify(rules.legalSquares(b0, 1)) && r.view(1).legal.length === 0, 'Reversi: only the mover receives legal squares');
  r.act(1, { type: 'place', cell: 20 });
  ok(r.st.moves === 0, 'Reversi: out-of-turn placement is ignored');
  r.act(0, { type: 'place', cell: 0 });
  r.act(0, { type: 'place', cell: 64 });
  r.act(0, { type: 'place', cell: 2.5 });
  r.act(0, { type: 'place', cell: '19' });
  ok(r.st.moves === 0, 'Reversi: illegal squares and junk are rejected');
  const first = r.view(0).legal[0];
  r.act(0, { type: 'place', cell: first });
  const t = r.view(0).players;
  ok(t[0].discs === 4 && t[1].discs === 1 && r.view(0).turn === 1, 'Reversi: a move flips discs and passes the turn');
  // pass: white has no move but black does
  const board = Array(64).fill(0);
  board[0] = 1; board[1] = 2; board[2] = 0; // black can play at 2 flipping 1 ... after that white has no pieces to move
  r = fakeRoom(['A', 'B'], 'reversi', {});
  r.st.board = board;
  r.act(0, { type: 'place', cell: 2 });
  ok(r.log.ended && r.log.ended.winnerId === 'p0' && r.log.ended.players[0].discs > r.log.ended.players[1].discs, 'Reversi: game ends when neither player can move, more discs wins');
  // true pass
  const pb = Array(64).fill(0);
  pb[0] = 1; pb[1] = 2; pb[2] = 0; // black plays 2 -> flips 1
  pb[63] = 2; pb[62] = 1; pb[61] = 0; // white could play 61 flipping 62 ... black to move first though
  r = fakeRoom(['A', 'B'], 'reversi', {});
  r.st.board = pb;
  r.act(0, { type: 'place', cell: 2 });
  // after black's move white still has 61 -> flips 62, so no pass here: white's turn
  ok(r.st.turn === 1 && !r.log.ended, 'Reversi: the turn passes normally when the opponent can move');
  const qb = Array(64).fill(0);
  qb[0] = 1; qb[1] = 2; // black plays 2
  qb[40] = 1; qb[41] = 2; // and later 42; white can never flank the edge disc on 40
  r = fakeRoom(['A', 'B'], 'reversi', {});
  r.st.board = qb;
  r.act(0, { type: 'place', cell: 2 });
  ok(r.st.turn === 0 && !r.log.ended && r.log.sys.some((s) => /passes/.test(s)), 'Reversi: a player without a legal move passes automatically and the other continues');
  ok(r.view(0).passed > 0, 'Reversi: the view marks that a pass happened');
  // exact tie: black plays 2 flipping 1 -> 3 black vs 3 white elsewhere, nobody can move afterwards
  const tb = Array(64).fill(0);
  tb[0] = 1; tb[1] = 2; // black plays 2: flips 1 -> black 3
  tb[63] = 2; tb[62] = 2; tb[61] = 2; // 3 isolated white discs
  r = fakeRoom(['A', 'B'], 'reversi', {});
  r.st.board = tb;
  r.act(0, { type: 'place', cell: 2 });
  ok(r.log.ended && r.log.ended.draw && r.log.ended.winnerId === null && r.members[0].score === 0 && r.members[1].score === 0, 'Reversi: equal discs is a draw and nobody scores');
  // timeouts and resign
  r = fakeRoom(['A', 'B'], 'reversi', { turnTime: 20 });
  r.adv(21000);
  ok(r.st.moves === 1 && r.st.turn === 1, 'Reversi: a timeout plays a random legal move');
  r.adv(21000); r.adv(21000); r.adv(21000);
  ok(r.log.ended && r.log.ended.forfeit, 'Reversi: repeated timeouts forfeit');
  r = fakeRoom(['A', 'B'], 'reversi', {});
  r.leave(0);
  ok(r.log.ended && r.log.ended.winnerId === 'p1', 'Reversi: leaving forfeits');
  // random playout always terminates with consistent scoring
  let finished = 0;
  for (let g = 0; g < 20; g++) {
    r = fakeRoom(['A', 'B'], 'reversi', { turnTime: 0 });
    let guard = 0;
    while (!r.log.ended && guard++ < 200) {
      const idx = r.st.turn;
      const legal = r.view(idx).legal;
      r.act(idx, { type: 'place', cell: legal[Math.floor(Math.random() * legal.length)] });
    }
    const e = r.log.ended;
    if (e && e.players[0].discs + e.players[1].discs <= 64 && e.players[0].discs + e.players[1].discs === e.board.filter(Boolean).length) finished++;
  }
  ok(finished === 20, 'Reversi: 20 random playouts all finish with consistent disc counts');
})();

// ---------------- Battleship ----------------
(function battleship() {
  const B = GAMES.battleship;
  const { FLEET, layoutCells, randomLayout } = B.rules;
  const good = FLEET.map((s, i) => ({ x: 0, y: i * 2, horizontal: true })); // rows 0,2,4,6,8
  ok(layoutCells(good) !== null, 'Battleship: a valid layout is accepted');
  ok(layoutCells(good.slice(1)) === null, 'Battleship: a layout with a missing ship is rejected');
  ok(layoutCells(good.map((s, i) => (i === 0 ? { ...s, x: 6 } : s))) === null, 'Battleship: ships hanging off the board are rejected');
  ok(layoutCells(good.map((s, i) => (i === 1 ? { x: 0, y: 0, horizontal: true } : s))) === null, 'Battleship: overlapping ships are rejected');
  ok(layoutCells(good.map((s, i) => (i === 0 ? { x: -1, y: 0, horizontal: true } : s))) === null, 'Battleship: negative coordinates are rejected');
  ok(layoutCells(good.map((s, i) => (i === 0 ? { x: 0.5, y: 0, horizontal: true } : s))) === null, 'Battleship: fractional coordinates are rejected');
  ok(layoutCells(good.map((s, i) => (i === 0 ? { x: 0, y: 0, horizontal: 'yes' } : s))) === null, 'Battleship: a non-boolean orientation is rejected');
  ok(layoutCells('nope') === null && layoutCells(null) === null, 'Battleship: non-array layouts are rejected');
  let allValid = true;
  for (let i = 0; i < 200; i++) if (!layoutCells(randomLayout())) allValid = false;
  ok(allValid, 'Battleship: 200 random fleets are all valid');

  let r = fakeRoom(['A', 'B'], 'battleship', { turnTime: 30, placeTime: 60 });
  ok(r.view(0).phase === 'place' && r.view(0).myShips === null, 'Battleship: starts in placement, nothing placed');
  r.act(0, { type: 'fire', cell: 5 });
  ok(r.st.moves === 0, 'Battleship: firing during placement does nothing');
  r.act(0, { type: 'place', ships: good.slice(1) });
  ok(!r.st.players[0].ready, 'Battleship: an invalid layout does not lock placement');
  r.act(0, { type: 'place', ships: good });
  ok(r.st.players[0].ready && r.view(0).myShips.length === 5, 'Battleship: a valid layout locks the fleet');
  const lay0 = JSON.stringify(r.view(0).myShips);
  r.act(0, { type: 'place', ships: FLEET.map((s, i) => ({ x: 0, y: i, horizontal: false })).slice(0, 5) });
  ok(JSON.stringify(r.view(0).myShips) === lay0, 'Battleship: a placed fleet cannot be changed');
  // privacy during placement
  const v1 = JSON.stringify(r.view(1));
  const vs = JSON.stringify(r.view('spec'));
  ok(!v1.includes('"cells"') && r.view(1).myShips === null, "Battleship: the opponent cannot see your placement");
  ok(!vs.includes('"cells"') && r.view('spec').myShips === null, 'Battleship: spectators cannot see any placement');
  ok(r.view(1).players[0].ready === true && r.view(1).players[1].ready === false, 'Battleship: readiness (only) is visible to the opponent');
  r.act(1, { type: 'random' });
  ok(r.view(0).phase === 'battle' && r.view(0).turn === 0, 'Battleship: battle starts when both are ready');
  // firing
  r.act(1, { type: 'fire', cell: 0 });
  ok(r.st.moves === 0, 'Battleship: firing out of turn is ignored');
  for (const bad of [-1, 100, 1.5, '5', null, NaN]) r.act(0, { type: 'fire', cell: bad });
  ok(r.st.moves === 0, 'Battleship: out-of-range and malformed shots are ignored');
  const foeCells = new Set(r.st.players[1].ships.flatMap((s) => s.cells));
  const miss = [...Array(100).keys()].find((c) => !foeCells.has(c));
  r.act(0, { type: 'fire', cell: miss });
  ok(r.view(0).players[1].shots[miss] === 1 && r.view(0).turn === 1, 'Battleship: a miss is recorded and the turn passes');
  const myCells = new Set(good.flatMap((s, i) => layoutCells(good)[i]));
  const missMe = [...Array(100).keys()].find((c) => !myCells.has(c));
  r.act(1, { type: 'fire', cell: missMe });
  r.act(0, { type: 'fire', cell: miss });
  ok(r.st.moves === 2, 'Battleship: firing at the same square twice is ignored');
  // sink a whole ship, check reveal rules
  const ship = r.st.players[1].ships[4];
  for (const c of ship.cells) {
    r.act(0, { type: 'fire', cell: c });
    if (r.st.turn === 1) { const open = [...Array(100).keys()].find((x) => !r.st.players[0].shots[x] && !myCells.has(x)); r.act(1, { type: 'fire', cell: open }); }
  }
  const sv = r.view('spec');
  ok(sv.players[1].sunk.length === 1 && sv.players[1].sunk[0].name === 'Destroyer', 'Battleship: a sunk ship is revealed to everyone');
  ok(sv.players[1].remaining === 4 && sv.players[1].shots.filter((v) => v === 2).length === 2, 'Battleship: remaining ships and hits tracked');
  const unsunk = r.st.players[1].ships[0].cells;
  ok(!JSON.stringify(sv).includes(JSON.stringify(unsunk)) && sv.myShips === null, 'Battleship: spectators never see unsunk ships');
  ok(!JSON.stringify(Object.assign({}, r.view(0), { myShips: null })).includes(JSON.stringify(unsunk)), 'Battleship: the shooter never sees the opponent\'s unsunk ships');
  ok(r.view(0).myShips.length === 5 && JSON.stringify(r.view(0).myShips.map((s) => s.cells)) === JSON.stringify(layoutCells(good)), 'Battleship: you see your own fleet');
  // win
  const turnNow = () => r.st.turn;
  let guard = 0;
  while (!r.log.ended && guard++ < 400) {
    const idx = turnNow();
    const foe = r.st.players[1 - idx];
    const target = idx === 0 ? foe.ships.flatMap((s) => s.cells).find((c) => !foe.shots[c]) : [...Array(100).keys()].find((c) => !foe.shots[c] && !foe.ships.some((s) => s.cells.includes(c)));
    r.act(idx, { type: 'fire', cell: target });
  }
  const e = r.log.ended;
  ok(e && e.winnerId === 'p0' && e.players[0].fleet.length === 5 && e.players[1].fleet.length === 5, 'Battleship: sinking the whole fleet wins and both fleets are revealed in the result');
  ok(r.members[0].score === 1, 'Battleship: winner scores');
  // hit again
  r = fakeRoom(['A', 'B'], 'battleship', { hitAgain: true });
  r.act(0, { type: 'random' }); r.act(1, { type: 'random' });
  const hitCell = r.st.players[1].ships[0].cells[0];
  r.act(0, { type: 'fire', cell: hitCell });
  ok(r.st.turn === 0, 'Battleship: with hit-again on, a hit keeps the turn');
  const missCell = [...Array(100).keys()].find((c) => !r.st.players[1].ships.some((s) => s.cells.includes(c)));
  r.act(0, { type: 'fire', cell: missCell });
  ok(r.st.turn === 1, 'Battleship: a miss ends the turn');
  // timeouts
  r = fakeRoom(['A', 'B'], 'battleship', { placeTime: 60, turnTime: 20 });
  r.act(0, { type: 'random' });
  r.adv(61000);
  ok(r.view(0).phase === 'battle' && r.st.players[1].ready, 'Battleship: unplaced fleets are placed randomly when time runs out');
  r.adv(21000);
  ok(r.st.moves === 1 && r.st.turn === 1, 'Battleship: a shot timeout fires a random shot');
  r.adv(21000); r.adv(21000); r.adv(21000);
  ok(r.log.ended && r.log.ended.forfeit, 'Battleship: repeated timeouts forfeit');
  r = fakeRoom(['A', 'B'], 'battleship', {});
  r.leave(1);
  ok(r.log.ended && r.log.ended.winnerId === 'p0', 'Battleship: leaving forfeits');
  r = fakeRoom(['A', 'B'], 'battleship', {});
  r.act(0, { type: 'resign' });
  ok(r.log.ended && r.log.ended.winnerId === 'p1', 'Battleship: resigning loses');
})();

// ---------------- Ludo ----------------
(function ludo() {
  const L = GAMES.ludo;
  const { rules } = L;
  const realRandom = crypto.randomInt;
  let queue = [];
  crypto.randomInt = function (a, b) {
    if (queue.length && b === undefined && a === 6) return queue.shift() - 1;
    return realRandom.apply(crypto, arguments);
  };
  const r4 = () => fakeRoom(['A', 'B', 'C', 'D'], 'ludo', { turnTime: 25 });
  const cur = (r) => r.st.players[r.st.turn];
  const idx = (r) => r.st.turn;
  const rollWith = (r, v) => { queue = [v]; r.act(idx(r), { type: 'roll' }); queue = []; };
  let r = r4();
  ok(r.st.players.length === 4 && r.st.players.every((p) => p.tokens.every((t) => t === -1)), 'Ludo: four tokens each, all in the yard');
  ok(new Set(r.st.players.map((p) => p.colour)).size === 4, 'Ludo: each player has a different colour');
  const r2 = fakeRoom(['A', 'B'], 'ludo', {});
  ok(r2.st.players[0].colour === 0 && r2.st.players[1].colour === 2, 'Ludo: two players sit opposite each other');
  // out of turn & spectator rolls ignored
  const other = (idx(r) + 1) % 4;
  r.act(other, { type: 'roll' });
  ok(r.st.dice === 0, 'Ludo: rolling out of turn is ignored');
  GAMES.ludo.onAction(r.st, { id: 'spec' }, { type: 'roll' }, r.api);
  ok(r.st.dice === 0, 'Ludo: spectators cannot roll');
  r.act(idx(r), { type: 'move', token: 0 });
  ok(r.st.phase === 'roll', 'Ludo: moving before rolling does nothing');
  // not a six: no move, turn passes after the notice
  const first = idx(r);
  rollWith(r, 3);
  ok(r.st.phase === 'notice' && r.view(first).movable.length === 0, 'Ludo: a roll with no legal move shows a notice');
  r.adv(1200);
  ok(idx(r) === (first + 1) % 4 && r.st.phase === 'roll', 'Ludo: turn passes to the next player');
  // six brings a token out and grants a bonus roll
  const p = cur(r);
  const me = idx(r);
  rollWith(r, 6);
  ok(r.view(me).movable.length === 4 && r.view((me + 1) % 4).movable.length === 0, 'Ludo: a six lets any yard token out; only the mover sees movable tokens');
  r.act(me, { type: 'move', token: 7 });
  r.act(me, { type: 'move', token: -1 });
  r.act(me, { type: 'move', token: 1.5 });
  ok(p.tokens.every((t) => t === -1), 'Ludo: invalid token choices are rejected');
  r.act(me, { type: 'move', token: 2 });
  ok(p.tokens[2] === 0 && idx(r) === me && r.st.phase === 'roll', 'Ludo: leaving the yard puts the token on its start square, and a six gives another roll');
  rollWith(r, 4);
  ok(r.view(me).movable.join() === '2', 'Ludo: only tokens on the board can move with a 4');
  r.act(me, { type: 'move', token: 2 });
  ok(p.tokens[2] === 4 && idx(r) === (me + 1) % 4, 'Ludo: the token advances and the turn passes');
  // three sixes
  r = r4();
  let who = idx(r);
  rollWith(r, 6); r.act(who, { type: 'move', token: 0 });
  rollWith(r, 6); r.act(who, { type: 'move', token: 1 });
  rollWith(r, 6);
  ok(r.st.phase === 'notice' && r.log.sys.some((s) => /three sixes/.test(s)), 'Ludo: three sixes in a row forfeit the turn');
  r.adv(1200);
  ok(idx(r) !== who && r.st.sixes === 0, 'Ludo: the turn passes and the six counter resets');
  // capture, safe squares, blocks
  r = r4();
  const A = r.st.players[0], Bp = r.st.players[1]; // A start abs 0, B start abs 13
  r.st.turn = 0;
  // Clean construction: A (colour0) at prog 5 (abs 5); B (colour1) at prog 44 -> abs (13+44)%52 = 5
  A.tokens = [3, -1, -1, -1];
  Bp.tokens = [44, -1, -1, -1];
  rollWith(r, 2);
  r.act(0, { type: 'move', token: 0 });
  ok(A.tokens[0] === 5 && Bp.tokens[0] === -1, 'Ludo: landing on a lone opponent sends it back to the yard');
  ok(r.st.lastEvent.captured === Bp.id, 'Ludo: the capture is reported');
  // safe square (star at abs 8): no capture, both coexist
  r.st.turn = 0; r.st.phase = 'roll'; r.st.sixes = 0;
  A.tokens = [6, -1, -1, -1];
  Bp.tokens = [(8 - 13 + 52) % 52, -1, -1, -1]; // prog 47 -> abs 8
  rollWith(r, 2);
  r.act(0, { type: 'move', token: 0 });
  ok(A.tokens[0] === 8 && Bp.tokens[0] === 47, 'Ludo: safe (star) squares cannot be captured on');
  // block: two opponent tokens on one square
  r.st.turn = 0; r.st.phase = 'roll'; r.st.sixes = 0;
  A.tokens = [3, -1, -1, -1];
  Bp.tokens = [44, 44, -1, -1]; // abs 5 twice
  rollWith(r, 2);
  r.act(0, { type: 'move', token: 0 });
  ok(Bp.tokens[0] === 44 && Bp.tokens[1] === 44, 'Ludo: two tokens of one colour on a square cannot be captured');
  // home column is private: no captures after prog 50
  r.st.turn = 0; r.st.phase = 'roll'; r.st.sixes = 0;
  A.tokens = [48, -1, -1, -1];
  rollWith(r, 4);
  r.act(0, { type: 'move', token: 0 });
  ok(A.tokens[0] === 52, 'Ludo: tokens enter the home column after 50');
  // exact finish
  r.st.turn = 0; r.st.phase = 'roll'; r.st.sixes = 0;
  A.tokens = [54, -1, -1, -1];
  rollWith(r, 5);
  ok(r.st.phase === 'notice', 'Ludo: an overshooting roll is not playable');
  r.adv(1200);
  r.st.turn = 0; r.st.phase = 'roll'; r.st.sixes = 0;
  rollWith(r, 2);
  r.act(0, { type: 'move', token: 0 });
  ok(A.tokens[0] === 56 && r.members[0].score === 1, 'Ludo: an exact roll gets a token home and scores');
  // win
  r.st.turn = 0; r.st.phase = 'roll'; r.st.sixes = 0;
  A.tokens = [56, 56, 56, 55];
  rollWith(r, 1);
  r.act(0, { type: 'move', token: 3 });
  ok(r.log.ended && r.log.ended.winnerId === 'p0' && r.log.ended.standings[0].home === 4, 'Ludo: all four tokens home wins the game');
  // idle handling
  r = r4();
  const idler = idx(r);
  r.adv(26000);
  ok(r.st.rolls === 1 && r.log.sys.some((s) => /dice were rolled/.test(s)), 'Ludo: a timeout rolls automatically');
  r = fakeRoom(['A', 'B', 'C'], 'ludo', { turnTime: 15 });
  const away = r.st.players[r.st.turn];
  // deterministic: every roll is a 1 and the idle player always has a token to auto-move
  // (regression: the automatic move used to reset the idle counter, so they were never removed)
  away.tokens[0] = 5;
  queue = Array(200).fill(1);
  for (let k = 0; k < 40 && !away.out; k++) { r.adv(16000); }
  queue = [];
  ok(away.out, 'Ludo: a player who stays idle for three turns is removed');
  ok(!r.log.ended && r.st.players.filter((q) => !q.out).length === 2, 'Ludo: the game continues with the others');
  // leaving
  r = r4();
  const leaver = r.st.players[2];
  leaver.tokens = [5, 6, -1, -1];
  r.leave(2);
  ok(leaver.out && leaver.tokens.every((t) => t === -1) && !r.log.ended, 'Ludo: a player who leaves is removed and their tokens leave the board');
  r.leave(1); r.leave(3);
  ok(r.log.ended && r.log.ended.winnerId === 'p0', 'Ludo: the last remaining player wins');
  r = r4();
  const cur0 = r.st.turn;
  r.leave(cur0);
  ok(r.st.players[r.st.turn].out === false && r.st.turn !== cur0, 'Ludo: when the current player leaves the turn moves on');
  // dice fairness (statistical, crypto.randomInt)
  crypto.randomInt = realRandom;
  const counts = Array(7).fill(0);
  const rr = r4();
  for (let k = 0; k < 6000; k++) { rr.st.phase = 'roll'; rr.st.sixes = 0; rr.act(rr.st.turn, { type: 'roll' }); counts[rr.st.dice]++; }
  ok(counts.slice(1).every((c) => c > 800 && c < 1200), `Ludo: 6000 server rolls are roughly uniform (${counts.slice(1).join('/')})`);
  const view = rr.view(0);
  ok(JSON.stringify(view).indexOf('deadline') < 0, 'Ludo: view carries no internal state');
})();

// ---------------- live Socket.IO ----------------
const PORT = 3992;
const URL = `http://localhost:${PORT}`;
const tok = () => [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
function client(name) {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const c = { s, name, token: tok(), state: null };
  s.on('state', (st) => { c.state = st; });
  c.emit = (ev, data) => new Promise((res) => s.emit(ev, data, res));
  c.profile = { name, avatar: { e: 1, c: 2 } };
  c.act = (a) => c.s.emit('action', a);
  return c;
}
async function waitFor(fn, ms = 4000, label = '') {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return true;
    await sleep(25);
  }
  console.log('  timed out waiting for', label);
  return false;
}

(async () => {
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(PORT), HIDDEN_GAMES: '' }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const all = [];
  try {
    const a = client('Alice'), b = client('Bob'), c = client('Cara'), sp = client('Spec');
    all.push(a, b, c, sp);
    const r1 = await a.emit('createRoom', { game: 'battleship', token: a.token, profile: a.profile });
    const code = r1.code;
    await b.emit('joinRoom', { code, token: b.token, profile: b.profile });
    await waitFor(() => a.state && a.state.players.length === 2, 2000, '2 players');
    await sp.emit('joinRoom', { code, token: sp.token, profile: sp.profile });
    await waitFor(() => sp.state && sp.state.spectators.length === 1, 2000, 'spectator joined');
    ok(sp.state.role === 'spectator', 'Battleship (live): the third person joins as a spectator');
    a.s.emit('startGame');
    await waitFor(() => [a, b, sp].every((x) => x.state.phase === 'game' && x.state.gameId === 'battleship'), 2000, 'battleship start');
    // placement privacy
    const layout = [0, 1, 2, 3, 4].map((i) => ({ x: 0, y: i * 2, horizontal: true }));
    a.act({ type: 'place', ships: layout });
    await waitFor(() => b.state.game.players.some((p) => p.ready), 1500, 'a ready');
    ok(!JSON.stringify(b.state.game).includes('"cells"') && !JSON.stringify(sp.state.game).includes('"cells"'), 'Battleship (live): your placement is never sent to the opponent or spectators');
    ok(a.state.game.myShips && a.state.game.myShips.length === 5 && b.state.game.myShips === null, 'Battleship (live): only the owner receives their own fleet');
    b.act({ type: 'random' });
    await waitFor(() => a.state.game.phase === 'battle', 1500, 'battle');
    await sleep(80);
    const shooter = a.state.game.turn === a.state.game.myIndex ? a : b;
    const target = shooter === a ? b : a;
    // grab a real ship cell only from the server side data to ensure a hit, via a brute-force sweep
    let hitSeen = false;
    for (let cell = 0; cell < 100 && !hitSeen; cell++) {
      const cur = a.state.game.turn === a.state.game.myIndex ? a : b;
      const foe = cur === a ? b : a;
      cur.act({ type: 'fire', cell });
      await sleep(30);
      if (foe.state.game.players[foe.state.game.myIndex].shots[cell] === 2) hitSeen = true;
    }
    ok(hitSeen, 'Battleship (live): shots resolve on the server and report hits');
    const dump = JSON.stringify(sp.state.game);
    ok(sp.state.game.myShips === null && !dump.includes('"hits"'), 'Battleship (live): a spectator sees shots but never a fleet');
    const outsider = a.state.game.turn === a.state.game.myIndex ? b : a;
    const movesBefore = a.state.game.moves;
    outsider.act({ type: 'fire', cell: 99 });
    sp.act({ type: 'fire', cell: 98 });
    await sleep(100);
    ok(a.state.game.moves === movesBefore, 'Battleship (live): out-of-turn and spectator shots are ignored');
    // reconnect restores the fleet
    const tokenA = a.token;
    a.s.disconnect();
    await sleep(200);
    const a2 = client('Alice');
    all.push(a2);
    await a2.emit('joinRoom', { code, token: tokenA, profile: a.profile });
    await waitFor(() => a2.state && a2.state.game, 2000, 'rejoin');
    ok(a2.state.game.myShips && a2.state.game.myShips.length === 5 && a2.state.game.phase === 'battle', 'Battleship (live): reconnecting restores your fleet and the battle');
    a.s = a2.s; a.state = a2.state; a2.s.on('state', (st) => { a.state = st; });
    a.s.emit('endGame');
    await waitFor(() => a.state.phase === 'lobby', 2000, 'ended');

    // Chess: legal moves for the mover only; full flow; switch games keeps members
    const members = a.state.players.length + a.state.spectators.length;
    a.s.emit('switchGame', { game: 'chess' });
    await waitFor(() => a.state.gameId === 'chess', 2000, 'switch chess');
    sp.s.emit('watch');
    await waitFor(() => sp.state.role === 'spectator', 2000, 'spec watches');
    ok(a.state.code === code && a.state.players.length + a.state.spectators.length === members, 'Chess (live): switching games keeps the room and its members');
    a.s.emit('startGame');
    await waitFor(() => [a, b, sp].every((x) => x.state.phase === 'game' && x.state.gameId === 'chess'), 2000, 'chess start');
    await sleep(80);
    const white = a.state.game.myIndex === 0 ? a : b;
    const black = white === a ? b : a;
    ok(Object.keys(white.state.game.legal).length === 10 && Object.keys(black.state.game.legal).length === 0 && Object.keys(sp.state.game.legal).length === 0, 'Chess (live): only White receives legal moves at the start');
    black.act({ type: 'move', from: 52, to: 36 });
    sp.act({ type: 'move', from: 12, to: 28 });
    await sleep(100);
    ok(white.state.game.moves.length === 0, 'Chess (live): Black and spectators cannot move on White\'s turn');
    white.act({ type: 'move', from: 12, to: 28 });
    await waitFor(() => black.state.game.moves.length === 1, 1500, 'e4');
    ok(Object.keys(black.state.game.legal).length > 0 && Object.keys(white.state.game.legal).length === 0, 'Chess (live): the legal move list follows the turn');
    black.act({ type: 'resign' });
    await waitFor(() => white.state.lastResult, 2000, 'resigned');
    ok(white.state.lastResult && white.state.lastResult.type === 'chess' && white.state.lastResult.winnerId === white.state.you, 'Chess (live): resigning ends the game with a result for the room');
    // play again / rematch path: host restarts
    ok(a.state.phase === 'lobby' && a.state.lastResult && a.state.lastResult.type === 'chess', 'Chess (live): the result is delivered to the room');
    a.s.emit('startGame');
    await waitFor(() => a.state.phase === 'game', 2000, 'again');
    ok(a.state.code === code && a.state.players.length + a.state.spectators.length === members, 'Chess (live): the room and members persist after a result');
    if (a.state.phase === 'game') { a.s.emit('endGame'); await waitFor(() => a.state.phase === 'lobby', 2000, 'ended 2'); }

    // Ludo with three players + spectator; Checkers and Reversi start
    await c.emit('joinRoom', { code, token: c.token, profile: c.profile });
    await waitFor(() => c.state && c.state.code === code, 2000, 'c joined');
    for (const gid of ['ludo', 'checkers', 'reversi']) {
      a.s.emit('switchGame', { game: gid });
      await waitFor(() => a.state.gameId === gid, 2000, 'switch ' + gid);
      sp.s.emit('watch');
      await sleep(100);
      a.s.emit('startGame');
      await waitFor(() => a.state.phase === 'game' && a.state.game, 2000, 'start ' + gid);
      ok(a.state.phase === 'game' && a.state.gameId === gid, `${gid} (live): starts in the same room`);
      if (gid === 'ludo') {
        ok(a.state.game.players.length >= 2 && a.state.game.players.length <= 4, 'Ludo (live): the seated players are on the board');
        const mover = [a, b, c].find((x) => x.state.game.turnId === x.state.you);
        if (mover) {
          mover.act({ type: 'roll' });
          await waitFor(() => a.state.game.dice > 0 || a.state.game.rolls > 0, 1500, 'rolled');
          ok(a.state.game.rolls === 1 && a.state.game.dice >= 1 && a.state.game.dice <= 6, 'Ludo (live): the server rolls the dice');
          ok(JSON.stringify(sp.state.game).includes('"dice"') && sp.state.game.movable.length === 0, 'Ludo (live): spectators see the dice but have no moves');
        }
      }
      a.s.emit('endGame');
      await waitFor(() => a.state.phase === 'lobby', 2000, 'end ' + gid);
    }
  } finally {
    all.forEach((x) => x.s.close());
    srv.kill();
  }
  console.log(failures ? `\n${failures} FAILED` : '\nAll passed');
  process.exit(failures ? 1 : 0);
})();
