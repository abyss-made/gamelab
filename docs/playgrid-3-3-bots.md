# Playgrid 3.3: solo-testing bots (issue #50)

Bots let one person test a private party without other humans. They are rule-based, deterministic
given the server's seeded `Math.random`, and use no AI API, network or background workers.

**Status: partial.** 6 of 21 visible games are supported (4 full, 2 limited). The other 15 clearly
disable Add Bot and say why. Nothing here claims all 21.

## UX

- The host sees **Add Bot** under the game slot in a private party lobby. It is disabled, with the reason
  shown next to it, when the game has no bot, the party is public, seats are full, or a match is running.
- Bots show a **BOT** badge and a distinctive name (`Pixel Bot`, `Turbo Bot`, ...), in the lobby roster and
  the in-game player list. They are always ready.
- The host picks **Easy / Normal / Hard** per bot (a select on the bot's roster card; games with a single
  level show text) and removes a bot with its close button. Removing needs no confirmation.
- Pacing: a bot "thinks" 0.6 to 1.4 s before acting. `BOT_DELAY_MS=0` (tests) removes the delay.
- Mobile: the Add Bot button and the difficulty select are at least 44 px tall and wrap inside the screen.

## Idle bots (any game)

**Add Idle Bot** seats a bot in *any* chosen game, including the 15 without real bots. It never acts, so a
single person can open any game's screen to test the UI. The game's own turn timers still apply to its
turn (a random move, then a forfeit after repeated timeouts), so set the game's turn timer to Off in Game
Settings if you want a board to stay put. Same rules as other bots: host only, private lobby, lobby phase,
free seat; kept when switching games; removed when the last person leaves. Tested in `idle-bots`.

## Compatibility matrix (all 21 visible games)

| Game | Bots | Notes |
|---|---|---|
| Tic Tac Toe | Full | Easy mostly random; Normal 75% perfect; Hard minimax (never loses) |
| 4 in a Row | Full | Alpha-beta depth 2 / 4 / 6 with a window-count heuristic |
| Dots & Boxes (2-4) | Full | Takes free boxes; Normal/Hard avoid giving the third side; Hard minimizes the give-away when forced |
| Checkers | Full | Alpha-beta depth 1 / 3 / 6 on material and advancement; uses the real rules (forced captures, chains) |
| Chess | Limited | Alpha-beta depth 2 (Hard 3) on material plus position. Ignores draw offers, never offers or resigns. Slowest decision measured 272 ms |
| Rock Paper Scissors Tournament | Limited | Random private throws; one level |
| Draw & Guess, Drawing Telephone, Bluff Battle, The Impostor | Unsupported | Need real drawing, writing or social judgment; a placeholder would be fake |
| Word Scramble, Trivia Blitz | Unsupported | A bot would need the answer key, which is cheating |
| Battleship, Ludo, Color Stack, Go Fish, Word Chain, Categories Rush | Not built yet | Priority 1 in the issue, left for a follow-up |
| Pool, Mini Golf, Property Tycoon | Not built yet | Priority 2, follow-up |

Remaining work: the "Not built yet" rows. Battleship, Color Stack, Go Fish and Ludo can be built the
same way (a `ready` and a `decide` per game, using only the bot's own information).

## How it works

- `server/bots/index.js`: the support table (also the source of the lobby text), bot creation and the driver.
- `server/bots/boards.js`: one strategy per game: `ready(state, member)` (cheap: is it my turn?) and
  `decide(state, member, {difficulty, rng})` returning the same action object a client sends.
- A bot is a room member with `bot: true`, no socket and no token (so it can never take over a person's
  reconnect identity). Each room-loop pass, `drive()` asks each seated bot whether it is ready, waits the
  think delay, then calls the game's own `onAction`. All server validation, turn order and timers apply.
  A bot that stalls is handled by the game's normal turn timers.
- Rules in `rooms.js`: only the host can add or remove bots or change difficulty; only in a private lobby;
  never as host, spectator, or queued; bots are never counted as vote-kick voters; `kick` on a bot just
  removes it (no ban entry); winner-stays never benches a bot.
- Lifecycle: switching to a game without bots removes them with a chat notice; switching to a smaller game
  trims bots first; the last person leaving removes every bot; a bot-only room cannot exist.

## Security and fairness

- Bots read only what a player at that seat sees. All six supported games are perfect-information boards
  except RPS, where the bot code never touches picks or matches (checked by `test/botsunit.js`).
  Nothing secret (words, roles, hands) is read, so there is nothing to leak.
- Bots do not appear in `/api/rooms` or quick play (public parties cannot have bots), and a party with
  bots cannot be made public.
- Add Bot is rate limited per host (burst 8). Bot names are server-chosen constants.

## Performance and resources

- No timers per bot. The existing 250 ms room loop drives all bots, one action per bot per pass.
- No work happens unless a person is connected (verified in `no-work-without-people`).
- CPU is bounded by search depth. Measured slowest decisions in the self-play test: checkers Hard under
  a few hundred ms, chess about 270 ms. Chess/checkers decisions block the event loop for that long.

## Tests (all run by `npm test`)

- `test/botsunit.js` (40 checks): each supported game played bot against bot with a stub room, across
  difficulty mixes, with a seeded rng (`BOT_SEED`). Asserts every action changed the state (none illegal),
  games finish, Hard Tic Tac Toe loses 0 of 40 games, RPS bot code avoids hidden state.
- `test/bots.js` (66 checks, real server and sockets, reuses the 3.2 harness invariants, extended so
  bots are checked for no socket/token, never host, always seated, no bot-only rooms): host-only controls, full party,
  public rejection, difficulty, removal, no ban entry, unsupported game, switching games (trim and
  drop), person vs bot rematches, mid-game removal, bot-only games (Tic Tac Toe, 4 in a Row, Checkers,
  Dots & Boxes, RPS) to completion and rematch, chess reply and resign, host leaving, last person
  leaving, and no bot action while nobody is connected.
- `test/botsui.js` (30 checks, Chromium, desktop 1440 and phone 390): Add Bot, badge, difficulty, remove, a
  full game against the bot, disabled state, no overflow, no page errors. Screenshots:
  `docs/screenshots/bots-desktop.png`, `docs/screenshots/bots-phone.png`.

Not covered: reconnect of a person during a bot game beyond the "no work without people" case, and
bots in Priority 1/2/3 games that are not built.

## Manual acceptance checklist

1. Create a private Tic Tac Toe party, Add Bot, set Hard, start: the bot replies within about a second.
2. Play until the end, Play Again: the bot is still there.
3. Switch to Dots & Boxes, add 3 bots, watch a full game (host can also watch).
4. Switch to Chess: extra bots are trimmed. Play a few moves, Resign.
5. Switch to Draw & Guess: bots disappear and Add Bot is disabled with a reason.
6. Make a party with a bot public: refused. Remove the bot, make it public: Add Bot disabled.
7. Remove a bot during a match: the match ends and the person wins.
8. Close all tabs: after about 20 s the party is empty and no bots remain.
