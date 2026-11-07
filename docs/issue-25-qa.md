# Batch 5/5 QA notes (issue #25)

Games added: Pool, Mini Golf, Property Tycoon. Playable games are now **25** (2 existing + 5 batch 2 + 5 batch 1 + 5 batch 3 + 5 batch 4 + 3 batch 5). The Coming Soon tile is not counted.

This branch is stacked on `claude/practical-heisenberg-qs12bx` (PR #29, head `aeb122a`), which is stacked on PRs #28, #27 and #26. Nothing from earlier batches was dropped. `rooms.js` is unchanged. Server code: `server/games/pool.js`, `golf.js` (+ `golfcourses.js`), `tycoon.js` (+ `tycoonboard.js`) and the shared `physics.js`; screens: `public/js/games/{pool,golf,tycoon}.js`.

## How the physics works (Pool and Mini Golf)

- A client sends only an aim angle, a power (0 to 1) and, with ball in hand, a cue-ball position. The server runs the **whole shot** synchronously in `physics.js` (fixed 1/240 s step, constant rolling deceleration plus exponential drag, elastic-with-loss collisions against line segments, round bumpers and other balls) and applies the result to the game state immediately.
- The server then sends the **sampled path** (30 Hz for Pool, 60 Hz for golf) to everyone; clients only replay it. Nothing a client sends can decide where a ball ends up, what was pocketed or who fouled.
- The server blocks new shots until the replay has finished (`busyMs` in the view), then resumes the turn timer. A shot that has not settled after 24 s (Pool) / 16 s (golf) is stopped dead.
- The simulation is deterministic (no randomness, no wall-clock time). Pool and Golf tests rely on that, and an automated search proves every golf hole can be completed.
- Not modelled: spin/english, jump or masse shots, ball-on-ball friction, slopes or moving obstacles.

## Rules summary

| Game | Players | Key rules |
|---|---|---|
| Pool | 2 | 8-ball on a 1000x500 table with six pockets. 15 balls racked (8 in the middle, a solid and a stripe on the back corners, the rest shuffled). The breaker places the cue ball behind the head string. Table is open until a legal pocket after the break assigns solids/stripes. After the first shot the cue ball must hit one of your own balls first (the 8 once yours are all down; on an open table anything but the 8). **Fouls**: scratch, hitting nothing, wrong ball first, or no ball reaching a rail or pocket after contact. After a foul the other player has **ball in hand** anywhere on the table. You keep the turn while you legally pocket one of your balls. The 8 pocketed with all your balls down and no foul wins; the 8 pocketed any other way loses; the 8 on the break is re-spotted. **No called shots**: any pocket counts. Resign, 45 s default turn timer (an automatic shot is played on a timeout; two timeouts in a row forfeit), winner stays, scores wins in the lobby, break alternates between games. |
| Mini Golf | 2-6 | Three original 6-hole courses (Meadow Mini, Canyon Run, Skyline Gauntlet) or all 18 holes as the Playgrid Open. Every hole has its own layout: walls, islands, bumpers, sand (slows the ball heavily) and water (+1 penalty stroke, ball returns to where it was hit from). Balls never collide with each other. The player **farthest from the cup putts next**; at the tee the honour rotates by hole. A ball drops only if it arrives slowly enough (a fast ball rolls over the cup). Stroke limit per hole (6 / 8 / 10): the player is picked up and scores the limit. Scorecard and leaderboard; lowest total wins, ties are shared. Timer (20-60 s): an automatic putt toward the cup is played on a timeout; two timeouts in a row remove the player. Leaving removes the player; the last one left wins. Winners get a lobby point. |
| Property Tycoon | 2-6 | Original board "Playgrid Plaza": 36 tiles (21 properties in 8 colour districts, 4 Skyline stations, 2 utilities, 3 Surprise tiles, 2 taxes, Launch Pad, Time Out, Rest Stop, Go To Time Out). Server dice (`crypto.randomInt`), two dice, doubles roll again, three doubles go to Time Out. $200 for passing or landing on Launch Pad. **Buy or auction (design choice)**: landing on an unowned property offers it at list price; declining (or running out of time) sends it to an **open ascending auction** that anyone, including the decliner, can bid in (a bid extends the clock to at least 8 s; no bids means it stays unowned; if you can't afford it you can only decline). **Rent**: properties by upgrade level (a whole district doubles the rent on bare lots), stations $25 x 2^(owned-1), utilities 4x (or 10x with both) the dice total. **Upgrades**: owner of a whole district builds one level at a time, evenly (Shop, Block, Tower, Landmark); selling a level refunds half. **Time Out**: pay $50, use a Get-out card or roll doubles; on your third turn you pay and move. 12-card Surprise deck. **Trading**: any two players can swap cash and properties; an offer does nothing until the other player explicitly accepts (it is re-validated at that moment), either side can decline or withdraw, one open offer per proposer, offers expire after 2 minutes, and properties in a district with upgrades cannot be traded. **Debt**: upgrades are sold automatically at half price; if you still cannot pay you go bankrupt and everything goes to the player you owed (or back to the bank). **Finite modes**: *Quick* (default 15 rounds; also 10 or 25) ends after the chosen rounds and the richest player wins (cash + property prices + upgrade spending); *Classic* ends when one player is left (with a 150-round safety cap). Starting cash $1000 / $1500 / $2000. No mortgages, no free-parking jackpot. |

## Server authority and privacy

- Clients only send intents (`shoot`, `putt`, `roll`, `buy`, `bid`, `trade_offer`, ...). Every game validates sender, phase, turn and payload (finite numbers, ranges, integers, enums, array lengths) and ignores everything else.
- Pool and golf have no hidden information, so spectators and players receive the same table, paths and results. A player who is not on turn, or a spectator, cannot shoot.
- Tycoon has no hidden information except the **Surprise deck order**, which is never sent to any client. Dice come from `crypto.randomInt`.
- Disconnects: leaving a Pool game forfeits it; leaving Golf or Tycoon removes that player (Tycoon: their properties return to the bank, their open trades and bids disappear) and the game continues until one player is left. Reconnecting uses the existing member identity and restores the same seat, table or board from server state (a live test checks Pool).
- The replay of a shot in progress is included in the view with its elapsed time, so a reconnecting client joins mid-shot.

## Automated tests

All run locally in `node-server`; see the PR description for the recorded results.

- `node test/batch5.js` (server): physics (determinism, collision conservation, wall reflection, rest/settle, nothing leaves the table in random shots); Pool rack, placement validation, every foul and win/loss path, validation of malformed shots, timers, resign, leave, and simulated auto-played games; Golf: geometry checks for all 18 holes, **a breadth-first search that finds and replays a completing shot sequence on every hole**, random putts that never leave the fairway or pass through walls, sand/water/cup behaviour, turn order, stroke limits, hole progression, scorecards, timeouts, leaving; Tycoon: board integrity, no trademarked names, rent for every tile type, passing Launch Pad, doubles, Time Out, all 12 cards, auctions, building rules, debt and bankruptcy, trades with consent and malformed offers, finite and last-standing endings, idle and leaving players, and **70 randomised full games** (2-6 players, all modes) that check cash, ownership, even-building and "state changed implies a broadcast" invariants after every action. Live Socket.IO clients cover privacy, out-of-turn/spectator actions, reconnect, game switching and trades over the wire.
- `node test/batch5ui.js` (Playwright, 390x844 touch and 1280x800): catalog shows 25 games with artwork and create-dialog settings; each game mounts with no overflow or page errors; Pool: ball in hand, dragging the cue ball, drag-to-aim, arrow keys, power slider, shooting, animated replay, controls locking while balls roll; Golf: aiming, an exact hole-in-one, animation, hole summary and scorecard, progression to the next hole; Tycoon: tapping tiles, rolling, buying/auction with a typed bid, proposing a trade from the form and completion after acceptance. Screenshots in `docs/screenshots/issue-25/` (`SHOTS=1 node test/batch5ui.js`).
- Catalog-count assertions in `batch1ui.js`, `batch2ui.js` and `batch4ui.js` were updated from 22 to 25; `npm test` now also chains `batch5.js` and `batch5ui.js`.

## Manual QA checklist (not covered by automation)

- [ ] **Physical iPhone Safari**: drag-to-aim on the pool table and golf course (the canvas sets `touch-action: none`), the power/aim sliders, number inputs for bids and trades (keyboard overlap), the Property Tycoon board at 390 px (names are hidden below ~520 px board width; tap a tile for details).
- [ ] Android Chrome small screen (360 px) for the Tycoon board and the golf scorecard (it scrolls horizontally inside its own box).
- [ ] Pool feel: break power, how easy cut shots and pocketing are with the sliders on a phone. The pockets are generous (capture radius 27-31 units against a ball radius of 12.5).
- [ ] Mini Golf feel on real hardware: power curve, sand and bumper bounciness (the numbers are in `golf.js`).
- [ ] Two to six real people in Tycoon: auction pacing (15 s start, 8 s after each bid), trade UX, a bankruptcy, the Quick-mode ending.
- [ ] Reconnect in the middle of a Pool or Golf shot replay, and in the middle of a Tycoon auction.
- [ ] Switch games from the lobby / results screen in a live room; Play Again keeps the room and members.
- [ ] Sounds reuse existing cues only.

## Known limitations

- Functional UI only; Sol may restyle. Tycoon tile art is text-and-colour only.
- Pool: no spin/english, no called shots, no jump/masse shots, no push-out, no three-foul rule, no re-rack for a bad break; ball in hand after the break scratch is allowed behind the head string only, otherwise anywhere. The cue stick is a drawing, not a physical object. A long roll (up to 24 s worst case) blocks play until the replay finishes; typical shots take 2-6 s.
- Mini Golf: no moving obstacles, slopes or ice; balls do not collide with each other; the cup is a simple capture radius with a maximum entry speed rather than lip-outs.
- Tycoon: no mortgages, no trading of Get-out cards, no bank limit on upgrades (only the four levels per property), no trade-response timer other than the 2-minute expiry. Players in Time Out still collect rent. The Surprise deck has 12 cards and no "nearest station" cards.
- The shared 10 actions/s per-socket bucket is the only rate limit.
- Local results are not GitHub CI: the Node Server Tests workflow triggers only on PRs targeting `main`, so it does not run on this stacked PR.
