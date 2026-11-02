# Batch 4/5 QA notes (issue #24)

Games added: Battleship, Checkers, Reversi, Ludo, Chess. Playable games are now 22 (2 existing + 5 batch 2 + 5 batch 1 + 5 batch 3 + 5 batch 4). The Coming Soon tile is not counted.

This branch is stacked on `claude/practical-heisenberg-qdk1yl` (PR #28, head `4df65e5`), which is stacked on PR #27 and PR #26. Nothing from earlier batches was dropped. `rooms.js` is unchanged. Server code: `server/games/*.js` (`chessrules.js` and `checkersrules.js` hold the pure rules); screens: `public/js/games/*.js`.

## Rules summary

| Game | Players | Key rules |
|---|---|---|
| Battleship | 2 | 10x10, fleet of 5 (5, 4, 3, 3, 2). Each player places the fleet in secret (tap to place, rotate, random, lock in; timed, missing fleets are placed randomly). Alternate single shots; a hit does not keep the turn unless "Hit Again" is on. Sinking a ship announces it and reveals its cells. All ships sunk wins. Both fleets are published only in the result. |
| Checkers | 2 | English / American rules on 8x8: men move and capture forward, kings both ways, **captures are compulsory**, a jumping piece must keep jumping (multi-jump), a man crowned mid-capture ends its turn. No pieces or no legal move loses. 80 plies without a capture or man move is a draw. Resign available. |
| Reversi | 2 | Black (first seat) moves first; a move must flip at least one line. A player with no legal move passes automatically (announced); game ends when neither can move; more discs wins, equal is a draw. Resign available. |
| Ludo | 2-4 | 4 tokens each, server-rolled dice (`crypto.randomInt`). A 6 leaves the yard and grants another roll; three 6s in a row forfeit the turn. 52-square track, 51 squares then a 5-square private home column, exact roll to finish. Landing on a lone opponent captures it; start and star squares are safe; two same-colour tokens form a block that cannot be captured. No legal move passes the turn. First to bring all four home wins. 2 players sit opposite each other. |
| Chess | 2 | Full legal-move validation: check, checkmate, stalemate, castling (both sides, not out of / through / into check), en passant, promotion (Q/R/B/N picker, default queen). Automatic draws: stalemate, insufficient material, threefold repetition, fifty-move rule. Draw by agreement (one standing offer, re-offer allowed after the opponent moves), resign. Optional per-side clock (off / 3 / 5 / 10 / 15 min) with optional increment (+2 / +5 s); a timeout loses unless the opponent can never mate (then it is a draw). With the clock off, 3 minutes without a move forfeits. |

Two-player games alternate colours/seats between games, support "Winner Stays" (next spectator takes the loser's seat) and score wins in the lobby. Ludo scores tokens home (reset each game).

## Server authority and privacy

- Clients only send intents (`move`, `place`, `fire`, `roll`, `resign`, ...); every game validates sender, phase, turn and payload (strict integer checks, ranges, enums) and ignores everything else.
- Battleship: a view contains the viewer's own fleet (`myShips`) and, for everyone, only the shots received by each board plus the cells of ships already sunk. Spectators get no fleet. The opponent sees only a "ready" flag during placement. Fleets of both sides are sent only in the final result.
- Chess / Checkers / Reversi: legal moves are computed on the server and sent only to the player to move; spectators receive none.
- Ludo: dice come from `crypto.randomInt`; the dice view carries no internal state. Spectators can see the board and dice but have no movable tokens.
- Disconnects and timeouts: leaving a 2-player game forfeits it. Timeout behaviour per game is listed above (random legal move first, forfeit after repeated timeouts for Checkers / Reversi / Battleship; chess clocks; Ludo auto-rolls / auto-moves and removes a player after 3 idle turns, taking their tokens off the board so nobody is blocked; the last player left wins). Reconnecting uses the existing member identity and restores the same fleet, hand, board and clocks from server state.

## Automated tests

- `node test/batch4.js` (server, 179 assertions): chess rules are checked with perft counts from the start position (depth 4 = 197,281), "Kiwipete" (depth 3 = 97,862), position 3 (depth 4 = 43,238) and position 4 (depth 3 = 9,467), plus castling, en passant, promotion, pins, stalemate, checkmate, insufficient material, fifty-move, repetition, draw offers, clocks and increments; checkers forced captures, multi-jumps, crowning, blocked loss; reversi flips, passes, ties and 20 random playouts; battleship layout validation, privacy of views, sinking, hit-again and timeouts; ludo capture / safe / block / home-column / exact-finish / three sixes / idle removal / leaving, and a 6000-roll uniformity check. Live Socket.IO clients check spectator privacy, out-of-turn actions, reconnect restoring a fleet, switching games without losing members, and results delivery.
- `node test/batch4ui.js` (Playwright, 390x844 touch and 1280x800): catalog shows 22 games with artwork, create-dialog settings for each new game, each game mounts with no horizontal overflow or page errors, plus real interaction: placing and locking a fleet and firing, selecting and moving a checker, placing a reversi disc, selecting e2 and playing e4 with the move list and clocks, handling a draw offer, rolling dice and choosing a token. Screenshots in `docs/screenshots/issue-24/` (`SHOTS=1 node test/batch4ui.js`).
- `batch1ui.js` / `batch2ui.js` catalog counts updated from 17 to 22.
- `npm test` in `node-server` chains everything (see the PR description for the recorded run).

## Manual QA checklist (not covered by automation)

- [ ] Real iPhone Safari: tap targets for the chess / checkers boards and the Ludo token buttons, chess piece glyphs rendering as text (a variation selector forces text style), battleship placement.
- [ ] Android Chrome small screen (360px) for the 15x15 Ludo board.
- [ ] Chess promotion picker in a live game (covered by server tests; UI picker is not driven by the browser test).
- [ ] Two real people: chess clock drift under poor connectivity, draw offers, reconnect mid-game.
- [ ] Ludo with 4 players and a spectator; observe pacing of the 1.1 s "no legal move" notice.
- [ ] Switch games from the lobby / results screen in a live room; Play Again keeps the room.
- [ ] Sounds reuse existing cues only.

## Known limitations

- Visual polish is functional only (per the issue); Sol may restyle.
- Chess has no move takeback, no PGN export, no premoves, no 3-fold *claim* (it is automatic), and no draw claim for a shorter fifty-move count. Clocks run on server time; a slow connection loses the latency of its move.
- Checkers has no draw offer (80 quiet plies or resign) and no mandatory-capture choice of "huffing" (not used in English rules).
- Ludo uses the documented block rule (two same-colour tokens cannot be captured but opponents may still land on that square and share it). House-rule variants (blockades that cannot be passed, doubles, etc.) are not implemented.
- Battleship allows ships to touch; there is no salvo mode.
- Battleship ship drafts are kept in the browser only until the fleet is locked; refreshing mid-placement clears the draft (a locked fleet is restored from the server).
- No per-game rate limit beyond the shared 10 actions/s bucket.
