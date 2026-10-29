# Gameplay audit: all 25 games (issue #31)

Branch base: `codex/playgrid-2-redesign` at `f4767c9`. No visual redesign, no new games, no changes to rooms/lobby behaviour, hosting or the alpha gate.

## How this audit was done (and what it was not)

| Method | Done | Notes |
|---|---|---|
| Re-ran the existing suites repeatedly, per file | Yes | See "Test runs" below for exact counts |
| Root-caused the two known flakes | Yes | Ludo idle removal (real server bug); Draw & Guess Playwright timeout (test race) |
| New seeded fuzz / AFK soak over every game module (`node test/audit.js [seed]`) | Yes | 25 games x min/mid/max players x 3 reps. Junk, out-of-turn and spectator actions, random leaves, view serialisation for every member and spectator, and "everyone goes AFK" must end |
| Verified every unresolved review thread on #26-#30 against the current code | Yes | Table below |
| Hands-on play of each game in a browser by a person | **No** | Not possible in this run. The UI suites (Playwright, Chromium emulation at 390x844 and 1280x800) were re-run, but no human played the games |
| Physical iPhone/Safari/Android testing | **No** | Not done. Do not treat mobile behaviour as verified on real devices |
| 1440px desktop viewport | Partly | `phase15.js` covers 1440x900 for lobby, dialog and Draw & Guess focus mode. Game screens from batches 1-5 are tested at 1280x800 and 390x844 only |

## Findings

| # | Sev | Game | Finding | Status |
|---|---|---|---|---|
| 1 | P1 | Ludo | A timed-out player who still had a legal token was auto-moved, and the auto-move reset the idle counter, so an AFK player was never removed (a table with one absent player stalled at the turn timer forever). This is the intermittent `batch4.js` failure (about 4 of 8 standalone runs failed before the fix; it depended on the random dice). | **Fixed** in `ludo.js` (`move(..., auto)` leaves `idle` untouched on automatic moves). Test is now deterministic (forced dice, token on the board) and fails without the fix |
| 2 | P1 | Categories Rush, Higher or Lower | If every player was idle-removed, `finish()` dereferenced `eligible[0].name` on an empty list and threw `TypeError` inside the room tick. Introduced by the "departed players cannot win" fix from #26. Found by `audit.js`. | **Fixed**: ends with no winner and a system message. Covered by `audit.js` (AFK soak) |
| 3 | P2 | Test only | `ui.js` / `phase15.js` clicked `#lobby-start` through `page.evaluate`. The button is disabled until the host's own page has seen the second player, and a click on a disabled button is silently ignored, so `waitForFunction(phase === 'game')` timed out (this is the "Draw & Guess waitForFunction timeout"). Reproduced by reading the code: the test waited on the fake client's state, not the page's. Did not recur in 10 runs of `ui.js` before or after, so the fix is by root cause, not by observation. | **Fixed**: wait for the button to be enabled before clicking. No sleeps added |
| 4 | P3 | Test only | `batch4.js` "shooter never sees the opponent's unsunk ships" compared the opponent's ship cells to the viewer's whole view, including the viewer's own fleet. When a random opponent Carrier landed exactly where the viewer's Carrier sits, the test failed although nothing leaked. Seen once in 12 runs. | **Fixed**: `myShips` is excluded from that comparison. The server view was already correct |

### Review comments from PRs #26-#30

GitHub still lists these threads as unresolved. Each was checked against the current branch.

| PR | Sev | Thread | Verified in code |
|---|---|---|---|
| 26 | P1 | Color Stack numeric 4 acts as Wild Draw Four | Fixed: Wild Draw Four is its own symbol `P` |
| 26 | P2 | Categories Rush loses answers after refresh | Fixed: inputs filled from `g.myAnswers` |
| 26 | P2 | Higher or Lower reveal shows the same card twice | Fixed: the reveal keeps the previous card |
| 26 | P2 | Departed leader wins a forfeit | Fixed for both games; but see finding 2 (the fix introduced a crash in an edge case, now fixed) |
| 27 | P1 | RPS next throw not broadcast | Fixed: `nextAfterReveal` calls `api.changed()` |
| 27 | P2 | RPS double forfeit never resolves | Fixed: explicit `dead` flag, excluded from `liveMatches` |
| 27 | P2 | RPS deciding throw hidden during reveal | Fixed in the client |
| 27 | P2 | RPS crowns an eliminated player | Fixed: contenders require not `left` and not `out` |
| 28 | P2 | Telephone locks a rejected drawing | Fixed: client enforces server caps, lock comes from the server |
| 28 | P2 | Hot Potato wipes typed answer; stale recipients; late pass | Fixed (restored input, key includes active players, expiry resolved before a pass) |
| 28 | P2 | Telephone replays all fills on every move | Fixed: incremental painting |
| 30 | P2 | Mini Golf hole transition not broadcast | Fixed: `endHole()` calls `api.changed()` |
| 30 | P2 | Pool/golf replay timestamps rounded to 0.1 s | Fixed: millisecond timestamps |

I did not resolve or reply on those review threads (the issue asks for a report, and the PRs are closed).

## 25-game matrix

Test coverage = existing suites that exercise the game, plus `audit.js` for all. Status is limited to what automated tests and code review can show.

| # | Game | Players | Existing coverage | Audit status | Open issues / remaining risk |
|---|---|---|---|---|---|
| 1 | Draw & Guess | 2-12 | drawguess, smoke, safety, ui, phase1, phase15 | OK; flaky UI test fixed (3) | Fill look and touch undo on real phones unverified |
| 2 | 4 in a Row | 2 | smoke, alpha, phase1, ui | OK | None found |
| 3 | Word Chain | 2-8 | batch2, batch2ui | OK | 2,240-word list rejects some valid words (use Dictionary Off) |
| 4 | Categories Rush | 2-12 | batch2, batch2ui | **Bug 2 fixed** | Cannot verify an answer fits its category |
| 5 | Higher or Lower | 2-8 | batch2, batch2ui | **Bug 2 fixed** | None |
| 6 | Color Stack | 2-8 | batch2, batch2ui | OK (P1 from #26 verified fixed) | No +4 challenge or stacking (design choice) |
| 7 | Go Fish | 2-6 | batch2, batch2ui | OK | None |
| 8 | Tic Tac Toe | 2 | batch1, batch1ui | OK | None |
| 9 | RPS Tournament | 2-16 | batch1, batch1ui | OK (all #27 threads verified fixed) | Large brackets with many mid-reveal leaves are only fuzzed, not scripted |
| 10 | Dots & Boxes | 2-4 | batch1, batch1ui | OK | None |
| 11 | Word Scramble | 2-12 | batch1, batch1ui | OK | None |
| 12 | Trivia Blitz | 2-12 | batch1, batch1ui | OK | 72 questions: repeats likely in long sessions |
| 13 | Drawing Telephone | 3-8 | batch3, batch3ui | OK (#28 verified) | Touch drawing and many-player pacing unverified on devices |
| 14 | Bluff Battle | 3-10 | batch3, batch3ui | OK | 36 questions only |
| 15 | The Impostor | 3-10 | batch3, batch3ui | OK | 10 categories only |
| 16 | Liar's Dice | 2-8 | batch3, batch3ui | OK | None |
| 17 | Hot Potato | 2-10 | batch3, batch3ui | OK (#28 verified) | Answers are not dictionary-checked |
| 18 | Battleship | 2 | batch4, batch4ui | OK; test flake (4) fixed | No salvo mode |
| 19 | Checkers | 2 | batch4, batch4ui | OK | None |
| 20 | Reversi | 2 | batch4, batch4ui | OK | None |
| 21 | Ludo | 2-4 | batch4, batch4ui | **Bug 1 fixed** | House-rule variants not offered |
| 22 | Chess | 2 | batch4, batch4ui | OK (perft-verified rules) | Promotion picker covered by server tests, not driven in the browser |
| 23 | Pool | 2 | batch5, batch5ui | OK | No spin or called shots; physical feel of drag-aim on touch unverified |
| 24 | Mini Golf | 2-6 | batch5, batch5ui | OK | Moving obstacles absent; touch aim unverified |
| 25 | Property Tycoon | 2-6 | batch5, batch5ui | OK | No mortgages; long games not human-played |

Shared flows (create/join by code or link, persistent lobby across game switches, winner stays, play again, spectators, capacity limits, reconnect) are covered by `smoke`, `phase1`, `phase15` and each batch's live Socket.IO section. This audit found no defect in them but did not add new room-level tests. A "spectator queue" does not exist; extra people spectate (documented in #18).

## Test runs

See the pull request description for the exact commands, counts and environment limits of the final runs.

## What still needs manual friend testing

1. Real phones (iPhone Safari, small Android): Draw & Guess and Telephone drawing, Pool and Mini Golf drag-aim, Battleship placement, keyboard behaviour for word games.
2. Full-length sessions with 6+ real players: Property Tycoon, Mini Golf, Impostor, Bluff Battle, RPS with 8+ players. Look for pacing, confusing prompts and timers that feel too short.
3. Reconnect on flaky mobile networks mid-game for each game (tested with sockets, not with real network drops).
4. Content depth: Trivia, Bluff and Impostor banks will repeat quickly.

## Where Sol should focus later

- Visual polish of batch 1-5 screens (they are functional first) and tile art.
- Pool/Golf aim affordance on touch, and the Telephone/Draw canvases on small screens.
- Empty-state and error messages when a game ends with no winner (finding 2 now allows that outcome).
