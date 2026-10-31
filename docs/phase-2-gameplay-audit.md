# Phase 2 gameplay audit (issue #40, Playgrid 3.1)

Branch base: `codex/playgrid-2-redesign` at `948e7ca` (Playgrid 3.0). This pass changes gameplay only. Routes, lobby, picker, voting and queue, branding, the alpha gate and the no-account flow are untouched. The four hidden games (Higher or Lower, Liar's Dice, Hot Potato, Reversi) stay hidden through the existing `HIDDEN` / `selectable` predicate, and their code and tests are kept.

## How this audit was done

| Method | Done | Notes |
|---|---|---|
| Read every visible game's server module, client, settings form and rules text | Yes | Done in two parallel read-only passes: board/card games, and word/party games |
| Reproduce each logic finding with a fake-room script before fixing it | Yes | Every fix has a regression test in `test/phase2.js` that fails on the old code (checked by stashing the fix) |
| Browser checks at 1440×900 and 390×844 (Playwright, Chromium) | Yes | `test/phase2ui.js`, plus the existing `ui.js` and `party3ui.js` |
| Before/after screenshots from the running app | Yes, for Draw & Guess | `docs/screenshots/phase-2/`, produced by `capture.js` in that folder |
| Hands-on play by people, real phones (iOS Safari, Android) | **No** | Not possible in this run. Touch feel, real-network reconnects and long sessions remain unverified |

## Inventory of the 21 visible games

Defaults come from each module's `defaults`. "Coverage" lists the suites that exercise the game; `audit.js` (seeded fuzz and AFK soak) covers all of them.

| Game | Players | Timers / difficulty (defaults) | Result flow | Coverage | Phase 2 outcome |
|---|---|---|---|---|---|
| Draw & Guess | 2-12 | 80 s draw (30-300 s), 3 rounds, easy/medium/hard/mixed, hints, custom words | Podium | drawguess, smoke, safety, ui, phase1, phase15, **phase2ui** | **Improved** (see below) |
| 4 in a Row | 2 | 30 s turn, winner stays | Winner + rematch | smoke, alpha, phase1, ui | **Fixed** colour identity on phones |
| Word Chain | 2-8 | 20 s turn, 3 lives, min 3 letters, word list on | Last standing | batch2, batch2ui | **Fixed** dead-letter trap; focus on new turn |
| Categories Rush | 2-12 | 5 rounds, 60 s | Scores | batch2, batch2ui | **Fixed** server-side "I'm done" lock |
| Color Stack | 2-8 | 30 s turn | Hand points | batch2, batch2ui | **Fixed** idle on draw, +2/+4 finish |
| Go Fish | 2-6 | 30 s turn | Books | batch2, batch2ui | **Fixed** countdown jump |
| Tic Tac Toe | 2 | 30 s turn, winner stays | Winner + rematch | batch1, batch1ui | Backlog: timer Off, focus |
| Rock Paper Scissors | 2-16 | best of 3, 12 s pick | Bracket | batch1, batch1ui | **Fixed** long-name overflow at 390 px |
| Dots & Boxes | 2-4 | 4×4, 30 s turn | Boxes | batch1, batch1ui | **Fixed** 28 px → 40 px line targets |
| Word Scramble | 2-12 | 8 rounds, 30 s, medium | Scores | batch1, batch1ui | **Fixed** scramble that already spells an answer |
| Trivia Blitz | 2-12 | 10 questions, 15 s, mixed | Scores | batch1, batch1ui | No defect found |
| Drawing Telephone | 3-8 | 60 s draw, 30 s write | Chain reveal | batch3, batch3ui | **Fixed** blank drawing scored a point |
| Bluff Battle | 3-10 | 5 rounds, 45 s bluff, 20 s vote | Scores | batch3, batch3ui | No defect found |
| The Impostor | 3-10 | 3 rounds, 2 clue rounds, 30 s / 60 s | Reveal | batch3, batch3ui | **Fixed** long clue pushed card off-screen |
| Battleship | 2 | 90 s place, 30 s turn | Winner + rematch | batch4, batch4ui | Backlog: random fleet auto-locks, timer Off |
| Checkers | 2 | 30 s turn | Winner + rematch | batch4, batch4ui | Backlog: focus, resign confirm |
| Ludo | 2-4 | 25 s turn | Winner | batch4, batch4ui | **Fixed** removed within one missed turn |
| Chess | 2 | 10 min clock, idle guard without a clock | Winner / draw | batch4, batch4ui | **Fixed** move after flag fall |
| Pool | 2 | 45 s turn | Winner + rematch | batch5, batch5ui | Backlog: timer Off |
| Mini Golf | 2-6 | 45 s turn, max 8 strokes | Scorecard | batch5, batch5ui | **Fixed** 0 strokes shown for players who left |
| Property Tycoon | 2-6 | 15 rounds, 45 s turn | Net worth | batch5, batch5ui | No defect found |

Shared flows were re-checked by the existing suites and not changed: create/join, rematch, back to lobby, spectators, reconnect.

## Draw & Guess (priority)

What already existed before this pass, and was kept as it was: six word choices, which only the drawer's view receives (`choices` is `null` for everyone else). Also kept:
- difficulty easy, medium, hard and mixed;
- draw timer options from 30 to 300 s;
- separate brush and eraser sizes in memory;
- focus mode with a chat panel;
- undo and clear, rate-limited to 2 per burst and 1 per 6 s;
- a cap of 100 fills per turn;
- word privacy for guessers and spectators.

| Area | Before | After | Test |
|---|---|---|---|
| Paint-bucket latency | 55 ms per full-canvas fill in Node. Every undo and every late join replays all fills, so a turn with 100 fills cost about 6 s of replay on each client. | About 15 ms per fill (≈3.7× faster): one classification pass, reused scratch buffers, and the rim is searched only over the fill's rows. Replay batches consecutive fills into one `getImageData` / `putImageData`. In Chromium, replaying 40 strokes and 100 fills takes about 215 ms. | `drawguess.js` compares the new fill with the original algorithm pixel for pixel on 120 random canvases and checks it is faster. `phase2ui.js` times the 100-fill replay. |
| Paint-bucket correctness | Correct, with anti-aliased rim handling | Output is identical, because the change is speed only | same as above |
| Brush and eraser sizes | Independent, but lost on reload | Independent, and saved in `localStorage` (`pg_dg_sizes`, clamped to 4-38) | `phase2ui.js` (reload at both viewports), `ui.js` |
| Canvas at 390×844 | 291×218 beside a narrow tool column. The palette was clipped into a scroll box, and guessers got a disabled tool panel. | 364×273 (+56% area). The tools sit under the canvas in one row with 44 px buttons, and all 22 colours are visible at 30 px. Guessers see only the canvas. Focus mode still gives 388×291. | `phase2ui.js`, `ui.js` (assertion updated, see deviations) |
| Canvas at 1440×900 | 867×650, or 1121×841 in focus mode | Unchanged (it was already good) | `phase2ui.js` |
| Word bank | 862 words (326 / 236 / 300) | 1517 curated, drawable words (497 / 533 / 487). No duplicates after normalising, and none is altered by the chat profanity filter (for example "cockroach" can still be guessed). | `drawguess.js` |
| Timers | 30-300 s already offered | Unchanged; already sensible | existing |

Screenshots: `docs/screenshots/phase-2/before-*.png` and `after-*.png`. Each set covers the choose, drawer, guesser and expanded views at both viewports.

## Findings and fixes

All of these were reproduced before fixing. P1 means a logic error or stuck state, P2 a visible defect or unfair outcome, P3 minor.

| # | Sev | Game | Finding | Fix |
|---|---|---|---|---|
| 1 | P1 | Ludo | Each timeout in a turn (roll, move, bonus roll after a 6) added 1 to `idle`. A player who missed one turn with a 6 was removed after about 75 s, and their tokens were wiped. | A missed turn counts once (`st.idleCounted`, reset in `beginTurn`) |
| 2 | P2 | Word Chain | Once no unused listed word starts with the needed letter (x after "xylophone"), every player loses lives in turn until the game ends | With the word list on, the chain switches to a playable fresh letter and posts a message. Dictionary Off is unchanged. |
| 3 | P2 | Color Stack | Drawing a card did not reset `idle`, so an active player who kept drawing could be removed | `draw` counts as activity |
| 4 | P2 | Color Stack | Going out on +2 / +4 skipped the victim's draw and those points | The victim draws before `finish` |
| 5 | P2 | Chess | A move that arrived after the flag fell, before the next tick, was accepted, and the increment rescued the player | A late move triggers the time loss |
| 6 | P2 | Telephone | A blank canvas (auto-sent at the deadline) scored +1, against the rules | An empty drawing is recorded as `skipped` with no point |
| 7 | P2 | Mini Golf | A player who left showed 0 strokes on every later hole | Later holes are `null` ("–"). Strokes taken before leaving mid-hole are kept. |
| 8 | P2 | Go Fish | Tapping a rank or player chip reset the visible countdown to the last server value | Repaints from a tap no longer reset the clock |
| 9 | P2 | 4 in a Row | On phones the colour disc was hidden, so you could not tell which colour was yours. The status had no `aria-live`. | Disc shown at 14 px. The status names your colour ("You are Red") and is `aria-live="polite"`. |
| 10 | P2 | The Impostor | A 30-character clue with no spaces widened the card to 462 px at 390 px, clipping the secret-word banner | `overflow-wrap:anywhere`, `min-width:0` |
| 11 | P3 | RPS | Two 16-character names widened the duel card to 445 px at 390 px | The sides shrink and names wrap |
| 12 | P3 | Dots & Boxes | Line tap targets were 28 px across, and a tap commits the move | 40 px (cells are at least 32 px, so lines never overlap except at dot corners, as before) |
| 13 | P3 | Categories Rush | "I'm done" was only locked in the client | The server ignores answers after done |
| 14 | P3 | Word Scramble | 0.4% of Easy rounds showed letters that already spelled an accepted word (HARE for "hear") | The scramble retries while it spells a listed word |
| 15 | P3 | Word Chain | The input was not focused when your turn came from someone else timing out | Focus on every new turn |

## Backlog (not done here)

Split into follow-up issues: #42 (timer Off stall), #43 (keyboard focus and resign confirmation), #44 (Battleship random fleet and cells, Color Stack out message, Telephone filler).

| Sev | Games | Item | Why not here |
|---|---|---|---|
| P1 | 4 in a Row, Tic Tac Toe, Checkers, Dots & Boxes, Color Stack, Go Fish, Battleship, Pool | With turn timer **Off**, one connected but absent player stalls the game forever. The host's only remedy, Remove, also bans the player. Chess already has an idle guard. | Changes what "Off" means in 8 games, so it needs an owner decision on the idle limit (for example 3 min) |
| P2 | Battleship | "Random fleet" locks the fleet in immediately, so it can't be reviewed or re-rolled | Product choice: client-side draft vs. renaming the button |
| P2 | Checkers, Chess, Battleship, Tic Tac Toe, 4 in a Row, Go Fish | Keyboard focus drops to `<body>` after each selection or move, because boards are rebuilt with `innerHTML` | Touches six clients; best done as one focused change with keyboard tests |
| P3 | Checkers, Chess, Battleship | The "tap again to resign" confirmation is cleared by any state update | Same rework as focus |
| P3 | Battleship | Cells are about 30 px at 390 px (the aim-then-Fire step limits mis-taps) | Layout change |
| P3 | Color Stack | A removed player still sees "Waiting for X" with no "you're out" message | Small, but separate |
| P3 | Telephone | A player who left keeps a slot, so later players get "(no guess)" or a blank canvas | Documented filler, so this is a design choice |

## Known limitations

- No real-device or human playtesting. The phone results come from Chromium emulation at 390×844.
- The fill timings are from this container (Node 22, headless Chromium). Real phones will be slower, but the relative gain holds.
- The phone tool layout uses `:has()`, as the existing focus-mode CSS already does. Very old browsers fall back to showing the palette label.
