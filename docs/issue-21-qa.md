# Batch 1/5 QA notes (issue #21)

Games added: Tic Tac Toe, Rock Paper Scissors Tournament, Dots & Boxes, Word Scramble, Trivia Blitz. Playable games are now 12 (2 existing + 5 from batch 2 + 5 new). The Coming Soon tile is not counted.

This branch is stacked on PR #26 (`claude/issue-22-batch2-card-word-games`, head `d8138127`). Shared room machinery (`rooms.js`), the Batch 2 games and their review fixes are untouched. Server modules are in `server/games/*.js`, screens in `public/js/games/*.js`; each plugs in through `server/games/index.js`, the `GAMES`/settings tables in `public/js/main.js`, and the SEO page table in `server/index.js`.

## Rules summary

| Game | Players | Key rules |
|---|---|---|
| Tic Tac Toe | 2 | Server validates turn and cell (strict integers). Win/draw detection, win line reported. First player alternates between rematches. Optional turn timer: first timeout plays a random legal move, second consecutive timeout forfeits. Score = wins in the lobby; "winner stays" rotates in a spectator. |
| Rock Paper Scissors | 2-16 | Single-elimination bracket, shuffled seeding, byes padded to a power of two (never bye vs bye). Best of 1/3/5. Picks are simultaneous, final once made, and hidden until every live match has picked or time runs out. Ties replay. A missed pick loses that throw; two consecutive misses forfeit the match (if both vanish, the better seed advances). Score: 1 per match win, champion +2. Leaving forfeits your match. |
| Dots & Boxes | 2-4 | 3x3, 4x4 or 5x5 boxes. Edge ownership is stored per edge. Completing a box (or two with one edge) scores and grants another turn. Timeout draws a random edge; 3 consecutive timeouts drop a player. Most boxes wins; ties are shared. First player rotates between games. |
| Word Scramble | 2-12 | Everyone unscrambles the same word (easy 4-5, medium 6, hard 7-11 letters, no repeats in a game). Guesses are checked on the server; any dictionary word made from the same letters also counts. Score = 50 + up to 50 for speed, +20 for the first solver. Answer is only sent after the round. Wrong guesses give a private notice to the guesser only. |
| Trivia Blitz | 2-12 | 72 original questions in 6 categories (Science, Geography, History, Entertainment, Sports, Food), mixed or one category (topped up from the rest if the category is smaller than the game). Choices are shuffled per question. Right = 100 + up to 100 for speed + small streak bonus; one final answer per question. Keys 1-4 select an answer. |

## Server authority and privacy

- Clients send intents only (`place`, `pick`, `edge`, `guess`, `answer`); scores, winners, brackets and timers are computed on the server. Existing 10 actions/s per-socket rate limit applies.
- RPS: your pending pick is only in your own view; the opponent, other matches and spectators never receive it until the throw resolves.
- Trivia: the correct index and raw question record are never in a view while a question is open; they appear only in the reveal.
- Word Scramble: the view carries shuffled letters and word length, never the word, until the round is over.
- Mid-game joiners spectate (`midJoin: false`); disconnects past the grace period are removed and handled as forfeits/drops; reconnecting within the grace period returns the same seat and state.
- Input validation is strict. `clampInt` is deliberately not used for Tic Tac Toe cells or Dots & Boxes edges: it would coerce `null`, `-1` or `1.5` into a legal square.

## Automated tests

- `node test/batch1.js`: rules and edge cases per game with a fake clock (illegal/out-of-turn/malformed moves, draw, bracket sizes 2-16 played to completion, ties and best-of logic, forfeits, random full Dots & Boxes games, scoring order, privacy of views, no repeated words/questions) plus live Socket.IO clients (spectators, switching games in one room without losing members, RPS pick privacy, scramble notice scoping, trivia key leak check).
- `node test/batch1ui.js` (Playwright): catalog shows 12 games plus Coming Soon, settings render for each game, each game mounts at 390x844 and 1280x800 with no horizontal overflow or page errors, real UI interaction per game incl. keyboard use. Screenshots: `docs/screenshots/issue-21/` (`SHOTS=1 node test/batch1ui.js`).
- `test/batch2ui.js` catalog assertion updated from 7 to 12 games. Combined suite: `npm test` in `node-server`.

## Manual test plan (not covered by automation)

- [ ] Real phone (Mobile Safari): Dots & Boxes edge tap targets, Word Scramble and Trivia on-screen keyboard (inputs are 16px so iOS does not zoom).
- [ ] 3-4 real browsers: Dots & Boxes extra turns and box colors; RPS bracket with 5+ players including byes, spectators watching.
- [ ] Switch games from the lobby and from the results screen in a live room; Play Again keeps the room and members.
- [ ] Refresh mid-game in each game and confirm the same seat/state returns.
- [ ] Trivia: confirm answers are not visible in the browser's network tab before the reveal.
- [ ] Sound cues are reused from existing games; no new audio.

## Known limitations

- Visual polish is intentionally minimal (functional UI first, per the issue); tile art is simple original SVG placeholders for Sol to replace.
- Trivia has 72 questions; categories are small, so repeated play across games will repeat questions.
- Word Scramble uses the bundled common-word list (no external dictionary), so rare valid anagrams are not accepted.
- RPS has no "best seed" ranking beyond random seeding; the idle tie-break uses that seed.
- No physical-device testing was done. Chromium emulation only.
- CI note: `.github/workflows/node-tests.yml` only runs on pull requests targeting `main`, so this stacked PR (base = the batch 2 branch) does not trigger it automatically. Tests were run locally and the results are in the PR description.
