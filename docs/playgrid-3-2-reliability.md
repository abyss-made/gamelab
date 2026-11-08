# Playgrid 3.2: multiplayer reliability audit and multi-client harness (#48)

Status: the harness, the audit, one server fix, the safe part of the backlog (#43, keyboard focus
and the resign confirmation) and this report are done. The rest of the backlog needs owner
decisions, listed at the end. No game rules, protocol messages or dependencies changed.

## 1. What was built

| File | What it is |
| --- | --- |
| `node-server/test/harness/preload.js` | Test-only preload. The harness starts the real entry point, `node -r test/harness/preload.js server/index.js`, in a child process. Production never loads this file. Over IPC it adds: a server clock that can be moved forward (`Date.now` gets an offset, so timers, grace periods, host hand-over and room expiry run in milliseconds); "wait for N room-loop passes" (proves nothing more happened, without sleeping); an optional seeded `Math.random` (`HARNESS_SEED`, default 48); read-only snapshots of the authoritative rooms and of the live Socket.IO sockets; and every `console.error` (handler or loop errors) forwarded as an event. `HARNESS_PING_MS` shortens the Socket.IO heartbeat, so a page cut off by offline emulation is noticed quickly. |
| `node-server/test/harness/index.js` | Server launcher (free port, logs, IPC). Scripted Socket.IO clients that behave like `public/js/main.js`: one tab token, and a silent rejoin on reconnect. Plus refresh (new socket, same token), duplicate tab (same token), drop/reconnect, waits driven by events with time limits, and global event marks. Invariant checks: ghost members, members both seated and watching, duplicate seats or queue entries, queue entries that aren't spectators, host not a member, seats over the cap, game/phase mismatch, shared tokens or sockets, `connected` without a socket, sockets owned by another member or room, leftover kick votes or next-game votes, and every client's view (players, spectators, queue, host, phase, game, connected flags) compared with the server. Scenario runner with hard time limits and failure artifacts. |
| `node-server/test/reliability.js` | 15 socket-level scenarios (section 3). |
| `node-server/test/reliabilityui.js` | 5 browser-level scenarios: real Chromium pages through Playwright, at 1440x900 and at 390x844 with touch. Skipped when Playwright is not installed, like the other UI suites. |
| `node-server/test/keyboardui.js` | #43 regression: a real page plays six board games with the keyboard only, against a scripted opponent, at both sizes. |

Run them:

```sh
cd node-server
npm test                    # everything, now including both reliability suites
npm run test:reliability    # just the two reliability suites
node test/keyboardui.js     # the #43 keyboard focus checks
node test/reliability.js    # SCENARIO=<name> runs one scenario; HARNESS_SEED=<n> changes the seed
node test/reliabilityui.js  # SHOTS_DIR=<dir> also saves screenshots of key states
```

A failing scenario writes `node-server/test-artifacts/<suite>/<scenario>.json` (git-ignored). It
holds the failures, server errors, the last 200 server log lines, an authoritative snapshot and each
client's last 40 messages. The browser suite also saves a screenshot and the page errors for every
open page. Each run also writes `metrics.json` there.

**Bounded and reproducible.** No fixed sleeps: every wait is either an event-driven predicate with a
time limit, or a counted number of room-loop passes. Each scenario has a hard limit (60 to 180 s).
Long timers are reached by moving the server clock. The server's randomness is seeded. Join order is
a real race, so tests read the seat order from the server instead of assuming it. The whole server
suite passed with seeds 48, 7, 1234 and 99, and individual scenarios passed 3 to 6 times in a row.

## 2. Evidence levels

* **Server-level** (`reliability.js`): what the authoritative server state says, checked after
  every step, plus every message each socket client actually received. It covers protocol behaviour,
  timers and secrecy, and does not render anything.
* **Browser-level** (`reliabilityui.js`): the real client (`public/js`) in Chromium, the DOM users
  see, and `App.S`, compared with the server snapshot. Phones are emulated (390x844 viewport, touch,
  mobile mode). Network loss is Playwright's offline emulation: it blocks the open WebSocket, so the
  server notices through missed heartbeats, as it would with a dropped phone connection.
* **Not covered:** real people, physical devices, Safari/WebKit or Firefox, real radio loss, mobile
  background-tab suspension, and network latency or packet loss (everything runs on localhost).

## 3. Test matrix

### Server-level: `node test/reliability.js`

| Scenario | People | What it checks |
| --- | --- | --- |
| `party-sizes` | 2, 4, 8 | A no-game party; simultaneous joins with the lower-case code; distinct member ids. One chat line reaches every client exactly once. One party switches Four in a Row → Draw & Guess → Ludo → Impostor → Chess: same code and members, seats = min(party, game max), everyone bumped is queued. One host change sends exactly one state update per client (broadcast coalescing). Everyone leaves: the party expires and the code reports `closed`. |
| `fourrow-rematch-cycles` | 4 | Three start → win → rematch cycles. Spectators and the out-of-turn player can't move. The win is announced once per client. `gameCount` +1 per game. Winner stays, the first in line plays, and the loser goes to the back of the line. Scores match the server. |
| `drawguess-secrets` | 4 + spectator + late joiner | Only the drawer gets the choices and the word. The word is never sent to guessers or the spectator. A late joiner mid-turn gets a seat and the canvas so far, but no word. A guesser sees the word only after guessing it. A guessed player's chat never reaches players still guessing or spectators, and spectator chat never reaches players still guessing. The reveal shows everyone. All five draw once (turn ids +1, no duplicate turns). Podium. Post-game scan of everything each client received: each guesser's first sight of each word is their own "You guessed it" or the reveal; the spectator's is the reveal. |
| `impostor-bluff-secrets` | 4 + spectator | Impostor: crew get the word and role, the impostor only their role, the spectator neither, and nobody is told who the impostor is. Clue, discussion, vote, a caught impostor's guess (still no word), result. The impostor and the spectator first see the word at the result. Bluff Battle: vote options carry only text, no author or real-answer flag; each player learns only which option is theirs; the reveal gives the answer. |
| `colorstack-full-game` | 3 + spectator | A whole game played to the end (131 moves with the default seed). Before every move, every view is checked against the server's hands: your own hand only, counts for the others, none for the spectator. One finish. |
| `chess-reconnect-identity` | 2 + spectator | Black drops on their own turn and returns after 10 s as the same member, still on move. White reloads (new socket, same token) and keeps the same member and colour. A duplicate tab takes over the member; the old tab is told it was replaced and can't move any more. Fool's mate; winner stays; the spectator takes the loser's seat. |
| `host-migration` | 4, then 4 public | The host leaves (next seated member hosts); the host drops past the 8 s grace (hand-over announced once); the old host returns without hosting; no transfer to an offline member; transfer to a spectator; an idle host is replaced by an active member; a kicked member can't rejoin; vote kick needs a majority and clears its votes; the host leaves mid-game and the new host can end the game. |
| `spectator-queue` | 5, then 3 | The queue keeps join order. Take Seat when full is refused with a notice. A spectator's move is ignored. An offline spectator in line is skipped when a seat opens. Winner stays seats the first **connected** spectator in line. With only an offline spectator, nobody is rotated in (regression test for bug 1). |
| `rejoin-cycles` | 3 | 15 cycles of leave/join, drop/reconnect and reload: still exactly 3 members, no server socket left behind, the same listener count on every server socket, chat history capped at 60, nobody else disturbed. |
| `late-join-and-guards` | 2 + late joiner | Joining a running 2-player game gives a spectator seat and a notice. Switching game and changing settings are refused mid-game. When the game ends by a leave (recorded as a forfeit), the queued late joiner is seated. |
| `timers` | 2 | A 15 s Four in a Row timeout makes exactly one random move and one message, and no second move without another timeout. Two timeouts forfeit. Nothing fires in the 120 s after the end. An idle drawer gets exactly one automatic word. Nothing fires in the 200 s after the host ends the game. |
| `races` | 8 | Seven simultaneous joins for one open seat: one player, six spectators. Simultaneous Take Seat never over-fills. Five start requests start one game. Six spammed moves from each player apply one per turn. |
| `autostart-lock-abandon` | 2, then 3 | The public countdown appears, stops when a player drops, nothing starts while they're gone, it restarts when they're back and starts exactly one game. A locked party turns new people away, lets a member reload and rejoin, and keeps out someone who left. The whole table drops mid-game: members time out, the game closes and the party expires. |
| `smoke-all-games` | 2 or 3 + spectator, per game | For each of the **21 visible games**: start; no private field for the spectator (hand, fleet, dice, word, role, source, answers, picks, fakes, and the Draw & Guess choices); every player placed; a player drops and reconnects into the running game as the same member; the host ends it; a rematch starts; all but one leave and the game ends. |
| `cleanup` | n/a | With every client gone, every server socket is closed, every party expires, and no timer is left beyond the baseline. The final state is consistent. Server heap after GC is recorded. |

Every scenario also asserts that the server logged no handler or loop errors.

### Browser-level: `node test/reliabilityui.js`

Five pages, each in its own browser context (own tab token and profile): Ana, Ben and Eli on
desktop (1440x900), Cy and Dee on phones (390x844, touch).

| Scenario | What it checks |
| --- | --- |
| `invite-join` | Create Party through the UI. Join by the `/r/CODE` link (the code is shown before joining), by `#CODE` in the Rooms code box, by a whole pasted invite link, and by a typed lower-case code. Every page lists the same five people; the server has five distinct members; only the host sees Start Game; phones don't overflow; every page agrees with the server. |
| `drawguess-live` | Draw & Guess chosen through the picker; one person watches. On each turn the drawer clicks a word and draws with the mouse. No other page's markup (text, attributes, labels) shows the word more often than before it was chosen, until that player guesses. Guesses are typed into the chat box, and a guesser's page shows the word once they guess. **Reload mid-turn:** back through the Join screen as the same member, the canvas is replayed, the word is still hidden, no duplicate member. **Offline/online:** the others see Reconnecting, the page shows its connection note, and it rejoins on its own as the same member. Four turns; the podium on every page; no page errors. |
| `fourrow-switch-play` | Switch through the picker's "Pick who plays" step (the host ticks a desktop and a phone player); the three moved to watching are told why. Two games played by clicking columns; every page shows "Winner stays"; rematch with the Play Again button. |
| `no-leaks-across-cycles` | Eight games (Chess, Pool, Mini Golf, Property Tycoon, Trivia, Draw & Guess, Color Stack, Ludo), started and ended twice on all five pages. Live intervals, pending animation frames, window and document listeners, and Socket.IO callbacks don't grow from the first round of cycles to the second, and no animation loop keeps running in the lobby. |
| `smoke-21-multi-client` | All **21** games started and ended with five pages: every page renders the game, phones don't overflow, extra people watch, and there are no page or console errors. |

### Keyboard, #43: `node test/keyboardui.js`

At 1440x900 and 390x844, against a scripted opponent, using only focus and Enter:

* **Four in a Row:** after my drop, focus waits on the board area (not `<body>`); when the opponent
  has moved it is back on the same column; Enter drops again.
* **Tic Tac Toe:** neither my mark nor the opponent's move drops focus to `<body>`.
* **Checkers and Chess:** selecting a piece keeps focus on it, and after my move focus waits on the board.
* **Battleship:** aiming keeps focus on the target square, and firing keeps focus in the game.
* **Go Fish:** picking a rank or a player keeps focus on that chip.
* **Checkers, Chess and Battleship:** Resign armed, then an opponent move, then Enter still resigns,
  with focus still on the button.

## 4. Bugs found

### Bug 1: Winner stays could give the seat to a spectator who had dropped (fixed)

* **Where:** `server/rooms.js`, `api.rotateLoser`. Used by all seven 2-player winner-stays games: Four in a Row, Tic Tac Toe, Checkers, Chess, Battleship, Pool and Reversi.
* **Repro:** A 2-seat game with spectators queued for a seat. The first spectator in line drops
  (phone locked, network blip) and is still inside the 20 s grace period. The match ends. The
  dropped spectator gets the seat and the loser, who is still there, is benched behind them.
  Observed: `got Ben, line was Ben(offline),Eli`.
* **Effect:** A public lobby can't auto-start, because a seated player is offline. A private host who
  starts anyway starts a match with an absent player, who times out or is removed after 20 s and
  forfeits. The connected person next in line waits, and the loser lost the seat for nothing.
* **Root cause:** `fillFromQueue` only seats connected spectators, but `rotateLoser` took the first
  queued spectator (or the longest watcher) without checking `connected`.
* **Fix:** `rotateLoser` picks the first connected spectator in the queue, otherwise the
  longest-watching connected spectator. If no spectator is connected, nobody is rotated in: the loser
  keeps the seat and no "plays next" is announced. The game result is unchanged.
* **Regression test:** `reliability.js` `spectator-queue`. Against the old code it fails with the seat
  given to the offline spectator, and the loser benched when the only spectator is offline. Against
  the new code it passes. The existing winner-stays checks in `party.js`, `batch1.js` and `batch4.js`
  still pass.

### Bug 2 (test only): a `party.js` check raced the host's broadcast (fixed)

`party.js` read the host's view right after the reconnecting member got its own state. The host's
copy travels on another socket. Under CPU load (the browser suite running at the same time) the
assertion "reconnected member shows as connected again" failed once. It now waits for the host's view,
as the rest of that file does. It passed 6 runs in a row before the fix when run alone, so the race
only shows under load.

### Bug 3 (#43): boards dropped keyboard focus, and any update disarmed Resign (fixed)

* **Repro:** `keyboardui.js` against the old client: 35 of 37 checks fail. Focus falls to `<body>`
  after every selection and every state update. Resign armed and then an opponent's move shows plain
  "Resign" again, so the next Enter only re-arms it.
* **Root cause:** boards are rebuilt with `innerHTML`, so the focused button is removed. The armed
  state lived on that button.
* **Fix:** `GameUI.common.keepFocus(root, render)`. If a button inside `root` had focus and the render
  replaced it, its replacement gets focus back (matched by `data-sq`, `data-cell`, `data-col`,
  `data-rank`, `data-target`, `data-ship`, `data-act`, `data-choose` or `id`). If that button is now
  disabled (not your turn), focus waits on the stage container (`tabindex="-1"`, no outline) and returns
  to the same button once a later update enables it. It wraps the state-update render in `main.js` for
  every game, and the click handlers of Checkers, Chess, Battleship and Go Fish, which repaint on
  selection. It only ever moves focus that was already inside the game stage, and only to buttons,
  never to text inputs, so phone keyboards are not opened. `GameUI.common.makeConfirm()` keeps "Tap
  again to resign" armed for its 3 s window across re-renders, in Checkers, Chess and Battleship.
* **Regression test:** `keyboardui.js`: 40 checks, all passing.

### Audited with no defect found

Each item below has at least one scenario in section 3.

* **Races:** simultaneous joins into the last seat, simultaneous seat grabs, repeated start
  requests, and spammed or out-of-turn moves. Handlers are synchronous on one event loop and
  re-check eligibility, so nothing over-fills.
* **Reconnect and identity ownership:** the tab token is the identity. Within the grace period you
  come back as the same member with the same seat, colour and turn. Past it you are a new member.
  A duplicate tab takes over and the old tab is told and silenced. No socket ever claims a member
  that points elsewhere, and no member points at a dead socket.
* **Host migration:** leave, drop past the 8 s grace, idle in the lobby, transfer, kick and vote kick
  all behave as designed, and are announced once.
* **Eligibility:** spectators can't act in games; late joiners spectate games that don't allow mid-game
  joins (Draw & Guess does); the queue keeps order; open seats skip offline spectators.
* **Stale state:** closed codes report `closed`; locked parties let members back but not leavers; a
  silent rejoin into an expired party leaves cleanly.
* **Secret leakage:** Draw & Guess words and choices, the Impostor's role and word, Bluff authors and
  answers, Color Stack hands, and the private fields of all 21 games for spectators.
* **Rematch and switching:** repeated rematch cycles, all 21 games switched, started and ended in one
  persistent party, and the party code and members kept throughout.
* **Timers:** each timeout fires once, nothing fires after a game ends, an idle drawer gets one
  automatic word, the public auto-start runs once and is cancelled when someone drops.
* **Memory and listeners:** server sockets return to zero; every server socket carries the same
  listener count; chat history stays capped; empty parties expire; Node timers return to the
  baseline; browser intervals, animation frames, listeners and socket callbacks don't grow.
* **Message size:** the server accepts at most 64 KB per message (`maxHttpBufferSize`). The largest
  Drawing Telephone drawing the client allows (250 strokes, 4000 points, 20 fills, coordinates
  rounded to 0.1) is 57.5 KB, so it fits with about 8 KB to spare.

### Observed, not changed (by design or needs a decision)

* **A game switch seats every spectator when the new game has room**, including people who chose
  "Just watch instead". It is consistent with "everyone plays the next game", but it overrides an
  explicit choice. Owner decision.
* **A reload shows the Join screen.** The seat is held for 20 s (`DISCONNECT_GRACE_MS`). Someone who
  takes longer than that to press Join loses the seat, and in a 2-player game forfeits. Auto-rejoining
  a tab whose token is still a member would change the existing flow, so it is listed as a decision.
* **The Rooms screen's 6 s public-list poll keeps its interval registered** after you leave the Rooms
  screen. It does no work there, is cleared on the next visit, and never exceeds one. Benign.

## 5. Backlog review (#42, #43, #44)

* **#42 Timer "Off" stall.** Confirmed by reading the code: with `turnTime: 0`, Four in a Row, Tic Tac
  Toe, Checkers, Dots & Boxes, Color Stack, Go Fish, Battleship (battle) and Pool have no deadline,
  and a connected player who walks away stalls the game. Chess has its own 3-minute idle guard. **Not
  changed:** the issue asks not to invent the policy. The harness can now test any chosen policy in
  milliseconds by moving the server clock.
* **#43 Keyboard focus and the resign confirmation.** Fixed (bug 3), with keyboard browser tests at
  1440x900 and 390x844 for Four in a Row, Tic Tac Toe, Checkers, Chess, Battleship and Go Fish.
* **#44.** The Battleship "Random fleet" behaviour and the Drawing Telephone slot for a player who left
  are owner decisions. Phone cell size (about 30 px at 390 px for a 10x10 grid) needs a layout decision:
  40 px cells don't fit a 390 px screen without scrolling. Color Stack "you're out" is a small client
  message, not done here.

## 6. Residual risks

* No human or physical-device testing; Chromium only; emulated phones; localhost network.
* With production heartbeat settings, a phone that loses signal without closing its connection can
  look connected to the others for up to about 45 s. That doesn't change seats or turns, but it does
  delay "Reconnecting" and the host hand-over.
* iOS Safari suspends background tabs. Past 20 s that loses the seat (by design), but isn't measured here.
* Everything is in memory on one process. A restart or deploy ends every party; clients then see
  "This party has closed".
* The harness moves the server clock forward. Real timer cadence and event-loop stalls under heavy load
  are not simulated.
* Ludo, Pool, Mini Golf, Property Tycoon, Battleship, Checkers and the word games get the smoke pass
  (start, reconnect, end, rematch, abandonment) rather than a full scripted game. Their rules stay
  covered by the existing batch suites.
* The 64 KB message cap leaves about 8 KB of room for Drawing Telephone. Raising its stroke or point
  limits could make large drawings disconnect the sender.
* GitHub Actions' Node Server Tests workflow only runs for pull requests into `main`, and it doesn't
  install Playwright. A PR into `codex/playgrid-2-redesign` gets no CI run, and the browser suites
  skip in CI. The local runs below are the evidence.

## 7. Measurements

Environment: Linux container, 4 vCPU Intel Xeon @ 2.10 GHz, 16 GB RAM, Node v22.23.4, Chromium from
Playwright 1.63.0, server and clients on localhost. Seed 48.

**Test runs** (final code, `cd node-server && npm test`, Playwright installed, so nothing skipped):

| Run | Result | Time |
| --- | --- | --- |
| Full `npm test`, before this work (baseline) | 3051 passed, 0 failed, 0 skipped | 7 min 57 s |
| Full `npm test`, this branch | **3513 passed, 0 failed, 0 skipped** | 8 min 44 s |
| `node test/reliability.js` (seed 48) | 380 passed, 0 failed | 29.1 s |
| `node test/reliability.js` with seeds 7, 1234, 99 | 380 passed, 0 failed, each | 25.8 to 27.7 s |
| `node test/reliabilityui.js` | 49 passed, 0 failed | 25.8 s |
| `node test/keyboardui.js` | 40 passed, 0 failed (also 5 runs in a row) | 3.2 s |

The existing files' pass counts match the baseline file by file, except three groups of checks that
only run when the random deal, dice or roles produce that situation. Go Fish's browser checks run when
the page gets the turn (`batch2ui`, +2 this run). An Impostor check runs when the first clue-giver is
crew (`batch3`, −1). Tycoon's auction checks run when the page lands on an unowned property (`batch5ui`,
−8). Compared line by line, no check failed or was skipped because of this change.

**Server, socket-level** (`metrics.json` from the full run):

| Measure | 2 people | 4 people | 8 people |
| --- | --- | --- | --- |
| All joins acked (one party, joining at once) | 5 ms | 5 ms | 10 ms |
| One chat line reaches every client | 1 ms | 1 ms | 1 ms |
| One host change reaches every client | 1 ms | 1 ms | 1 ms |
| State messages per client for that change | 1 | 1 | 1 |

* Server heap: 11.0 MB at start, 12.4 MB after every scenario and a forced GC. RSS 74.7 MB. Node timers
  are back to the baseline of one, the room loop.
* A whole Color Stack game with 3 players: 131 moves (seed 48).
* Slowest scenarios: `drawguess-secrets` 5.3 s, `colorstack-full-game` 4.0 s, `timers` 4.0 s,
  `autostart-lock-abandon` 4.0 s, `party-sizes` 3.8 s. Most of that is counted loop passes (250 ms each)
  after moving the clock. The 21-game smoke pass takes 0.4 s.

**Browser** (5 pages; Chromium 153 from Playwright 1.63.0):

* After 16 game cycles across 8 games: 0 pending animation frames, 25 window/document listeners and 10
  Socket.IO callbacks per page, unchanged from the first round of cycles. Live intervals: 0, or 1 on pages
  that had visited Rooms (the idle Rooms poll in section 4). Host page JS heap 9.5 MB.
* Offline emulation with a 2 s heartbeat: the server marks the page offline in about two heartbeats,
  and the page rejoins within about a second of coming back online. A probe with a 1 s heartbeat
  measured 1.9 s and 0.9 s. With production settings (25 s interval, 20 s timeout) detection takes up to
  45 s. Until then the others see the player as connected.

**Screenshots** (`docs/screenshots/playgrid-3-2/`, from `SHOTS_DIR=../docs/screenshots/playgrid-3-2 node test/reliabilityui.js`):

* `lobby-desktop-host.png` and `lobby-phone-guest.png`: five people joined in four different ways.
* `drawguess-desktop-host-sees-offline.png`: the drawer sees the word, and Ben, who went offline, shows as reconnecting.
* `drawguess-desktop-spectator.png`: the spectator sees only the blanks, and chat goes to "players who know the word".
* `drawguess-phone-reveal.png`: the reveal on a phone.
* `fourrow-phone-result.png`: a result on a phone with "Winner stays: … plays next" (a connected spectator).

## 8. Recommended next playtest (people, real devices)

Six to eight people: at least two iPhones (Safari), two Android phones (Chrome) and two laptops, on
real Wi-Fi and cellular, in one private party.

1. Join four ways: the shared link, the code typed in Rooms, `#CODE`, and a pasted link.
2. Draw & Guess, two rounds. One phone locks its screen for about 10 s during its own drawing turn,
   and another for about 30 s while guessing. Note who comes back as themselves and who has to press Join.
3. Switch to Four in a Row with "Pick who plays". Play three winner-stays rematches while a queued
   spectator closes their tab just before a match ends (bug 1).
4. The host closes their tab mid-game; check hosting passes and the new host can end the game.
5. Someone duplicates their tab; the old tab should say "Opened somewhere else".
6. A phone toggles airplane mode for 5 s and for 30 s.
7. The Impostor and Bluff Battle with two spectators, who confirm they never see the word or the answer.

Record: time to reconnect, any surprise "Opened somewhere else", anything secret seen early, any game
that stops moving, and the device and browser for each problem.

## 9. Owner decisions

1. #42: the idle limit when the turn timer is Off (for example 3 minutes, as in Chess), and whether
   hitting it forfeits or skips the turn.
2. Should a deliberate "Just watch instead" survive a game switch?
3. Should a reload auto-rejoin while the seat is still held, instead of showing the Join screen?
4. #44: Battleship "Random fleet" (draft on the client, or rename it to "Random & lock in"),
   Battleship phone cell size, and the Drawing Telephone slot for players who left.
5. Should the Node Server Tests workflow also run for pull requests into `codex/playgrid-2-redesign`?
   That is a workflow change, so it was not made here.
6. Should the Socket.IO heartbeat be shorter than the default (25 s interval, 20 s timeout)? A dead
   phone connection would show as "Reconnecting" sooner, at the cost of more keep-alive traffic. Not
   changed here.
