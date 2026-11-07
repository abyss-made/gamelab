# Batch 2/5 QA notes (issue #22)

Games added: Word Chain, Categories Rush, Higher or Lower, Color Stack, Go Fish. Playable games are now 7 (2 existing + 5 new). The Coming Soon tile is not counted.

All five reuse the existing room machinery unchanged: persistent rooms, codes and invite links, reconnect, host settings, spectators and capacity, Play Again, and switching games without leaving the lobby. `rooms.js` has no changes. Server code lives in `server/games/*.js`, screens in `public/js/games/*.js`.

## Rules summary

| Game | Players | Key rules |
|---|---|---|
| Word Chain | 2-8 | Next word starts with the previous word's last letter. No repeats, minimum length (2/3/4). Bundled common-word list (2240 words), or dictionary off. Timeout costs a life; last player standing wins (+5). A word scores length - 2 points (min 1). Invalid words get a private notice and do not use the turn. |
| Categories Rush | 2-12 | 5 categories and one letter per round. Answers stay private until the round ends. Unique valid answer = 2, duplicate (case, punctuation, leading article and plural-s ignored) = 1, wrong letter/too short/filtered = 0. 12 s review between rounds. |
| Higher or Lower | 2-8 | Standard 52-card deck, aces high, reshuffled when exhausted. Everyone guesses the same hidden card. Right = streak points (1,2,3,4,5 capped), wrong or no guess resets streak, equal rank is a push. |
| Color Stack | 2-8 | 108-card original deck (4 colors 0-9, Skip, Flip, +2, Wild, Wild +4). 7-card hands. Match color or symbol. Draw one if stuck; a playable drawn card may be played or kept (pass). Winner scores the value of the cards left in other hands. +2/+4 victims draw and lose the turn (no stacking, no +4 challenge). Flip acts as Skip with 2 players. |
| Go Fish | 2-6 | Standard deck, 7 cards each (2-3 players) or 5 (4+). Ask a player who has cards for a rank you hold. Hit = take all and go again. Miss = fish one card; fishing the requested rank goes again. Books are laid automatically. Most books wins; ties are shared. |

## Server authority and privacy

- Clients only send intents (`word`, `answers`, `guess`, `play`/`draw`/`pass`, `ask`). The server checks turn, ownership of the card, legality and rate limit (existing 10 actions/s bucket).
- Decks, draw piles and hidden next cards are never serialized. Each view contains the viewer's own hand only (`hand: null` for spectators); other players expose counts. Higher or Lower sends the next card only in the reveal. Categories sends only your own answers until the round ends.
- Reconnecting returns the same private hand. Players who disconnect past the grace period are removed; their cards go back to the deck. Players idle for 2-3 consecutive turns/rounds are dropped and the game continues or ends with a forfeit win.
- Mid-game joiners spectate (`midJoin: false`).

## Automated tests

- `node test/batch2.js`: rules and edge cases for each game against the modules with a fake clock, 30 simulated full Color Stack games and 40 Go Fish games (card conservation, termination), plus live Socket.IO clients for privacy, spectators, out-of-turn actions, switching through every game in one room, and reconnect restoring a hand.
- `node test/batch2ui.js` (Playwright): catalog shows 7 games plus Coming Soon, each game mounts at 390x844 and 1280x800 without horizontal overflow or page errors, and real UI interaction for each game. Screenshots: `docs/screenshots/issue-22/` (`SHOTS=1 node test/batch2ui.js`).

## Manual QA checklist (not covered by automation)

- [ ] Real phone: tap targets and card hand scroll, on-screen keyboard with Word Chain and Categories inputs (iOS zoom avoided with 16px inputs, but not device-tested).
- [ ] 3+ real browsers in one Color Stack game: wild color picker, +2/+4, flip direction, "one card left" message.
- [ ] Go Fish with 4-6 people: ask flow, books, spectator view shows no hands.
- [ ] Categories Rush with many players: the review table scrolls horizontally on narrow screens.
- [ ] Switch games from the lobby and from the results screen in a live room; Play Again keeps the room.
- [ ] Reconnect mid-hand (refresh) in Color Stack and Go Fish.
- [ ] Sound cues are reused from existing games (drop/join/win/lose); no new audio.

## Known limitations

- Word Chain's dictionary is a bundled common-word list, not a full dictionary, so some valid words are rejected. Use "Dictionary: Off" for any letters (no repeats). The list is server-side only.
- Categories Rush cannot verify that an answer really fits a category; it checks the letter, length and a profanity filter. Players judge the rest.
- Color Stack has no +4 challenge, no stacking and no call-out penalty for "one card left"; it announces the last card automatically.
- Visual polish is intentionally minimal ("functional playable UI first"); original SVG tile art is placeholder quality.
- No physical-device testing was done. Chromium emulation only.
