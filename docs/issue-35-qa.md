# Issue #35: multiplayer polish (hidden games, party lobbies, rematches, stability)

No visual redesign. New controls reuse existing buttons, fields and the navy/lime palette.

## What changed

### 1. Four games hidden, not deleted
- Hidden: Higher or Lower, Liar's Dice, Hot Potato, Reversi. **21 games are selectable.**
- One source of truth: `HIDDEN_GAMES` in `node-server/server/config.js`. Setting the environment variable `HIDDEN_GAMES=""` restores all 25 with no code change.
- Server enforcement, so a crafted client can't use them either: `createRoom` and `quickPlay` fall back to Draw & Guess, and `switchGame` and `voteNext` refuse a hidden game. Hidden-game rooms are left out of the public room list and Quick Play matching.
- Client: the catalog, Create Lobby tiles, host Game Mode list, Choose Another Game, next-game vote and slug detection all skip hidden games. The server passes the list to the page as `window.PAGE.hidden`, so client and server can't drift apart.
- Old links: `/higher-or-lower`, `/liars-dice`, `/hot-potato` and `/reversi` redirect (302) to `/?view=games`.
- Graceful for existing rooms: a room already in a hidden game keeps running, can Play Again, and its Game Mode list still shows the current game so it isn't blank. It just can't be picked again.
- Kept: server modules, client screens, rules, assets and every existing test. The legacy full-catalog tests now run with `HIDDEN_GAMES=""`, which also proves reactivation works.

### 2. Persistent party lobbies (audited first)
The existing code already kept room code, invite link, member ids, host, chat and spectators across game switches. It also already handled reconnect-by-token within the grace window. Added only the missing pieces:
- A switch clears the public auto-start countdown and next-game votes. Players bumped to spectating by a smaller game go first in the seat queue.
- **Host migration** now always prefers a *connected* member. Before, it could hand hosting to an offline seat.
- A host offline for `HOST_GRACE_MS` (8 s) hands hosting over but keeps their seat; on return they rejoin as a normal member.
- A host idle in the lobby for `HOST_AFK_MS` (3 min) while someone else is active hands hosting over. Idle time only counts from when the lobby began, so a host who watched a long game isn't demoted when it ends.
- **Host transfer**: a crown button next to each connected member in the roster (host only, with a confirm).

### 3. Rematches and game flow
- Play Again and Choose Another Game already existed. **Back to Lobby** (host) dismisses the results card for everyone, so the roster and seat controls come back.
- **Next-game vote**: on the results card, non-hosts get a "Vote for the next game" picker (21 games). The host sees a tally on the card and in Choose Another Game. The host still decides. Votes clear on start or switch.
- **Spectator queue**: when seats are full, spectators get Join/Leave the Queue and see their position. Any seat that opens in the lobby goes to the first queued, connected spectator. Opened seats come from someone leaving, Just watch, a raised max players, or a game ending.
- **Winner stays** (Four in a Row, Tic Tac Toe, Battleship, Checkers, Chess, Pool): the next player is the first *queued* spectator, falling back to the longest watcher as before. The loser joins the back of the queue, so seats rotate.
- Max player counts are respected everywhere seats change. The tests check seats never exceed `maxPlayers`.

### 4. Reliability and anti-abuse
- Chat rate limit is now per member, not per socket, so reconnecting no longer refills it. Queue, vote and host-transfer actions share the existing per-member lobby limiter.
- Ghost members: existing grace-period removal is kept and now covered by tests. Hosting never sits with a ghost.
- A game id like `constructor` no longer resolves through the object prototype. Before, it could crash `createRoom`.
- Unchanged: kick and ban by token, vote-kick in public rooms, alpha access gate, per-game turn timers and AFK handling (audited in #31).

## Automated tests
- `node test/party.js` (new): sockets against a real server. Covers hidden-game enforcement, redirects and the public list; five switches in a row with 5 people (code, members, host and seat caps kept); reconnect identity; winner-stays with queue rotation; Play Again; spectator and non-host lock-out; queue fill, leave and refuse; votes; Back to Lobby; host drop, return, transfer and kick; ghost cleanup; host leaving mid-game; chat flood across reconnects; spectators and guessers never get the Draw & Guess word; idle-host handover and its long-game regression.
- `node test/partyui.js` (new, Playwright): desktop 1440×900 and phone 390×844. Covers 21 catalog cards plus the Coming Soon tile; no hidden game in the catalog, Create Lobby, Game Mode, Choose Another Game or vote picker; the `/reversi` redirect; a phone spectator joining the queue; results actions; voting from a phone; Back to Lobby; host transfer from the roster; no overflow and no page errors.
- Both are wired into `npm test`.

## Manual QA checklist
- [ ] Home and Games: 21 game cards plus Coming Soon; none of the four hidden games appear (desktop and phone).
- [ ] Open `/reversi`: lands on the game catalog.
- [ ] Create Lobby: 21 tiles. Host Game Mode: 21 options.
- [ ] Five people in Draw & Guess, then switch to Tic Tac Toe: 2 seated, 3 spectating and queued. The room code and link are unchanged.
- [ ] Win Tic Tac Toe: the winner stays, the first queued spectator plays next, and the loser is queued.
- [ ] Results card: the host sees Play Again, Choose Another Game and Back to Lobby; others see the vote picker; the host sees the tally.
- [ ] Host closes the tab: within about 8 s someone connected becomes host; the old host keeps their seat for 20 s.
- [ ] Host taps the crown on a player to hand over hosting.
- [ ] A spectator can't move pieces; spectators never see the drawing word.
- [ ] Phone: queue button, vote picker and roster usable at 390 px with no sideways scroll.

## Deferred / limitations
- **Rotation for multi-seat games** (Ludo, Golf, Dots & Boxes, etc.) only fills *open* seats from the queue. There's no automatic "lowest score sits out", because choosing who leaves is a product decision.
- **Votes are advisory**: the host picks. There's no auto-start of the top vote.
- **Touch discoverability**: kick and host-transfer buttons use the existing hover/focus reveal on the roster, as kick already did.
- **CI scope**: `.github/workflows/node-tests.yml` only runs on PRs into `main`, so this PR (into `codex/playgrid-2-redesign`) gets no automatic CI run. Tests were run locally.
- **Pre-existing flake**: `test/batch2ui.js` "higherlower: game screen mounts" timed out once in a full baseline run on the untouched base branch, then passed twice in isolation.
