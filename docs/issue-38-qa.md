# Issue #38: Playgrid 3.0 party-first shell

The visual source of truth is the approved design package on `codex/playgrid-3-design` (commit `a9a9852`, `docs/playgrid-3/`): `HANDOFF.md`, `desktop-overview.png`, `desktop-modals.png`, `mobile-lobby.png`, `mobile-picker.png` and the HTML/CSS. This branch implements that shell on top of `codex/playgrid-2-redesign`. It does not redesign any game board.

Screenshots in `docs/screenshots/playgrid-3/` come from the running app (desktop 1440×900, phone 390×844) and were captured with `capture.js` in that folder.

## Flow: Create, Invite, Choose, Ready, Play, back to the same lobby

| Design component | What was built | Screenshot |
| --- | --- | --- |
| Navigation | Play `/`, Games `/games`, Rooms `/rooms` are real links. Rooms is its own view, not an alias for Games. `/?view=games` and the game slug pages still open the catalog. The return-to-party bar is unchanged. | `desktop-games.png`, `desktop-rooms-empty.png` |
| Create Party | Only Private/Public (private by default) and Allow spectators (on by default). There are no game, name, seat or settings fields. Create shows "Creating…"; if it fails, the choices stay and the button becomes Try Again with the reason. Play on a game card opens the same dialog and says which game the party will start with. | `desktop-create.png`, `mobile-create.png` |
| No-game lobby | The server now accepts `createRoom({ game: null })`, which sets `gameId: null` and `settings: null`. Everyone gets a seat, up to the largest seat count of any visible game (16). Start is refused ("Choose a game first."), public parties never auto-start, and settings and seat limits are ignored until a game is chosen. The game slot shows **Choose a Game** to the host and **Suggest a Game** to participants. | `desktop-lobby-empty.png` |
| Party header | YOUR PARTY · PRIVATE/PUBLIC (· LOCKED) and the party name. The code button copies the invite link and confirms with "Copied" plus a live-region message. Invite Friends opens the share sheet. The host sees Party Settings; participants see Leave Party. Reconnecting still shows next to the identity in the top bar. | `desktop-lobby.png` |
| Roster | Cards show the host badge and a separate Ready / Not ready / Reconnecting status, using text and a check icon rather than colour alone. The host gets Make host and Remove buttons on each card; public parties keep vote-kick. Host transfer updates in place. | `desktop-lobby.png` |
| Readiness | New `setReady` event. Readiness is advisory: the host can start once the game's minimum is met. It is only accepted in the lobby and resets when a match starts, so rematch readiness starts fresh. | `desktop-lobby.png` |
| Game slot | Icon, title, player range · category, and a short summary built from the real settings (e.g. "3 rounds · Medium · 80 seconds"). Host gets **Change**, participants get **Suggest**, and there is a Rules button. Choosing a game never creates a new party. | `desktop-lobby.png` |
| Picker | One reusable dialog for Choose a Game, Choose Another Game and Suggest a Game. It has labelled search over name, category and description, chips for All · 21, each category and Fits our party, a live result count, and a no-match state with Clear Search. Desktop is a two-column grid; phones get a full-screen single column with a pinned confirm button ("Choose Draw & Guess", or "Suggest Chess" for participants). The selected card has `aria-pressed` and a check. Escape or Close returns focus. | `desktop-picker.png`, `mobile-picker.png` |
| Eligibility | Explained in text on each card, e.g. "2 play, 2 watch". A game is disabled only when the party is bigger than its seats and spectators are off. The server enforces the same rule: `switchGame` refuses with "Allow spectators in Party Settings…". When more people are seated than the game allows, the existing seat picker chooses who plays and the rest are queued. | `desktop-picker.png`, `desktop-lobby-queue.png` |
| Voting / queue | The Party activity panel has "What should we play?", suggestions with vote counts, Voted ✓ with Undo, and a host-only **Choose** per suggestion. Votes never launch or select a game. "Watching · N" lists spectators in queue order with Take a Seat / Join the Queue. On phones this is a "Queue & votes" sheet, and a spectator's own seat button also sits inline. | `desktop-lobby-queue.png`, `mobile-activity-sheet.png` |
| Settings | Only available once a game is chosen. Defaults come first. For Draw & Guess that is Difficulty, Round time 60/80/120 and Rounds 3/5/7. **Advanced settings** holds every existing value (full timer and round lists, custom words, hints, custom-only, max players). Nothing is sent until **Save Settings**, and Cancel discards. Participants see the same form read-only. Party Settings (visibility, spectators, max spectators, lock, Leave Party) also uses explicit Save. | `desktop-settings.png` |
| Results | The existing game results are unchanged. The shared action bar is Back to Lobby / Choose Another Game / Play Again for the host, and Back to Lobby / Vote for Next Game / Ready for Rematch for participants. The participant's Back to Lobby only puts the results away for them; the host's clears them for everyone. Both stay in the same party. | `desktop-results.png` |
| Rooms | Join by code (accepts `CODE`, `#CODE` or an invite link), then the current-party card with Return, then public parties showing name, game (or "Choosing a game"), players and Join/Spectate/Locked/Full. States covered: loading, "No public parties yet. Start one and invite your people.", load failure with Try Again, and malformed, closed, locked, full or kicked codes explained inline. | `desktop-rooms-empty.png`, `mobile-rooms-empty.png` |
| Games | 21 compact cards with icon, title, range · category, a one-line blurb and one Play button, plus search, category chips and the Coming Soon tile. Play creates a party, or if you are already in one, returns to it and opens the picker with the game preselected (host confirms; participants suggest). The old sidebar and Quick Play links are gone; the `quickPlay` socket event is kept. | `desktop-games.png`, `mobile-games.png` |

## Deviations and judgement calls

- **Too-few-players games stay selectable.** The handoff says to disable a game "when required participants … cannot be satisfied". In a fresh party of one, every game would then be disabled, which breaks the Create → Invite → Choose order. Instead the card says "Needs 3+ · invite 2 more", and **Start Game** stays disabled with the reason until the minimum is met. The only time a card is disabled is when the party is bigger than the seats and spectators are off.
- **Party name.** There is no naming step. The server names the party "{creator}'s Party" on first join and keeps it through host transfer.
- **Results layout.** The results card sits above the lobby rather than replacing it, so the roster, game slot, votes and queue stay visible.
- **Host tools on roster cards.** The design has no Remove or Make host buttons. They are kept as small labelled icon buttons on each card so kick and host transfer keep working.
- **Phone navigation in the lobby.** It shows Play and Rooms, as in `mobile-lobby.png`. Games is one tap further, from Play or Rooms. Profile on phones stays behind the settings button.
- **Compatibility.** A `createRoom` call without `game` still creates a Draw & Guess room, so older clients and every existing test keep working. Only `game: null` creates a no-game party.

## Hidden games

Higher or Lower, Liar's Dice, Hot Potato and Reversi stay hidden through the existing single predicate, `HIDDEN` / `selectable` on the server and `window.PAGE.hidden` on the client. The Games catalog, its search and filters, the picker, suggestions and the public list all use it. Their code, rules and tests remain.

On the live site, I could not inspect it from this environment: it is behind the alpha password and its URL isn't in the repository. Diagnosis from the code:

- The hiding from #35/#36 only exists on `codex/playgrid-2-redesign`. `main` is still the two-game build from #10.
- If Render deploys `main`, or any commit before #36, those cards will still appear.
- If Render sets `HIDDEN_GAMES=""` in its environment, that also un-hides them.

JS and CSS are already served `no-store`, so a stale browser cache is unlikely. **Owner check:** confirm which branch or commit Render deploys and that `HIDDEN_GAMES` is unset.

## Accessibility

- All controls are native buttons, links and inputs.
- The 3px `#D6FF8B` focus ring is visible on every control.
- Dialogs trap focus, close on Escape, and return focus to the control that opened them; the test checks this for the picker.
- Search fields are labelled, and result counts are announced through a live region.
- Ready, selected and disabled states use text or a check icon, not colour alone.
- Hub controls are at least 44px; chips are 32px.
- Lobby re-renders keep keyboard focus on the same control.
- `prefers-reduced-motion` turns off transitions and animations.

## Tests

- `node test/party3.js` (new, sockets against a real server) covers:
  - the `/games` and `/rooms` routes;
  - a no-game party: refused start, no auto start, settings ignored, everyone seated, public listing, spectator notice when full;
  - readiness set, undo, reset when a match starts, and refused mid-game;
  - votes never auto-select;
  - the spectators-off refusal;
  - seats and queue when choosing chess for four people;
  - participant switch refused;
  - same code throughout;
  - the old default game.
- `node test/party3ui.js` (new, Playwright, 1440×900 and 390×844) covers:
  - Games search, no-match, Clear and the Drawing filter;
  - Rooms as its own route, empty state, inline code errors and `#CODE`;
  - Create Party with no game and its defaults;
  - the empty game slot, with Start disabled;
  - the ready count and toggle;
  - votes listed but not applied;
  - picker keyboard use: search focus, Enter to select, Escape returns focus;
  - Fits our party and the 2-play/2-watch text;
  - choosing a game in the same party, and the settings summary;
  - Game Settings Save and Cancel;
  - Party Settings lock;
  - the seat picker and queue, including the phone Queue & votes sheet;
  - the participant view: Leave Party, no Start, Suggest, read-only settings, vote and undo, leaving;
  - Play from Games while in a party preselects the game;
  - the Rooms current-party card and public list with Return;
  - no overflow and no page errors.
- Updated assertions that described the old UI:
  - `ui.js`: compact card text.
  - `partyui.js`:
    - the Create dialog has no game list;
    - the picker replaces the Game Mode select and the vote dropdown;
    - the queue position is read from the party panel.
  - `phase15.js`: Join by code now lives on Rooms.
  - `qol.js`: on desktop, the lobby's Rules button is now in the game slot.
  - `batch1ui`–`batch5ui`:
    - "create dialog shows its settings" is now "Create Party has no settings";
    - a new desktop check that each game's Game Settings dialog renders its settings.

## Manual QA checklist for the owner

- [ ] Desktop 1440 and phone 390: Play, Games and Rooms each open their own view.
- [ ] Create Party with no game, share the link, and have a friend join by link and by code.
- [ ] Choose a 2-player game with 4 people: the seat picker appears and two people watch in queue order.
- [ ] Ready toggles; the host can still start with someone not ready.
- [ ] A participant suggests a game; the host uses Choose from the activity panel.
- [ ] Finish a game, then try Back to Lobby (host and participant), Choose Another Game and Play Again. The party code and chat stay the same.
- [ ] Reconnect: refresh mid-lobby and mid-game. The seat and host are kept.
- [ ] Rules and Focus mode still work in a game.
- [ ] The live site shows exactly 21 games once the hidden-game deploy question above is resolved.
