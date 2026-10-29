# Batch 3/5 QA notes (issue #23)

Games added: Drawing Telephone, Bluff Battle, The Impostor, Liar's Dice, Hot Potato. Playable games are now 17 (2 existing + 5 batch 2 + 5 batch 1 + 5 batch 3). The Coming Soon tile is not counted.

This branch is stacked on `claude/issue-21-batch1-quick-games` (PR #27, head `e6b026d`), which is itself stacked on PR #26. Nothing from the earlier batches was dropped; `rooms.js` is unchanged. Server code: `server/games/*.js` and content in `server/data/social.js`; screens: `public/js/games/*.js`.

## Rules summary

| Game | Players | Key rules |
|---|---|---|
| Drawing Telephone | 3-8 | Everyone writes a prompt, then chains rotate: draw the text you were handed, describe the drawing you were handed, and so on (one round per player). A timed-out turn is filled with a random word / blank drawing / "(no guess)". Reveal walks every chain entry by entry. Scoring: +1 per finished turn, +1 per like from another player on a revealed entry (no self-likes, one like per entry). Drawings are validated stroke lists (palette hex, canvas bounds, size/point/fill caps). |
| Bluff Battle | 3-10 | A question with a hidden real answer. Everyone writes a fake (40 chars, the real answer is rejected). Identical fakes merge into one option. Anonymous vote, no voting for your own (or merged) bluff. Real answer = 2 pts, each vote your bluff earns = 1 pt. 36 built-in questions, no repeats in a game. |
| The Impostor | 3-10 | Crew sees category + secret word, one impostor sees only the category. Clue turns (1-3 laps), timed discussion in room chat (everyone ready skips ahead), vote (no self-vote). Strict plurality on the impostor catches them, a tie lets them escape. A caught impostor gets one guess at the word. Crew who voted correctly +2, escaped impostor +3, stolen word +2. Everyone is impostor once before repeats; a crew clue equal to the word is rejected. |
| Liar's Dice | 2-8 | 3 or 5 dice each, rolled server-side. Bid quantity x face (must raise quantity, or face at the same quantity) or call "Liar!" Ones wild (optional). Loser of a challenge loses a die and opens the next round; 0 dice = out; last player wins. Timeout: opening bid of 1x2, or an automatic challenge; 3 timeouts in a row removes the player. |
| Hot Potato | 2-10 | A bomb with a server-side hidden fuse (short/medium/long). The holder types an answer to the prompt and picks who gets the bomb (no repeating answers in a round, no passing straight back unless 2 are left). Holding it more than 12 s makes it explode in your hands. Lives 1-3; last player wins. |

## Server authority and privacy

- Clients only send intents; every game validates sender, phase, turn and payload and ignores everything else.
- Telephone: a player's view carries only the one entry handed to them; chains are broadcast only during the reveal, and only the entries already revealed.
- Bluff: the real answer, option authorship and who voted for what appear only in the reveal. Vote options contain just `{i, text, mine}`.
- Impostor: role and word are per-viewer. The impostor and spectators never receive the word; nobody receives `impostorId` until the result. Spectators learn neither role nor word.
- Liar's Dice: dice are rolled with `crypto.randomInt` and only the owner's dice are in a view; all hands are sent only when a challenge resolves.
- Hot Potato: the fuse time is never serialised, only the 12 s hold limit.
- Reconnect restores the same role, word, hand or dice (state is server-side keyed by member). Players removed after the grace period are handled per game (round void/re-rolled, bomb moved on, chain slots skipped) and games end with a forfeit result when too few players remain.
- Chat is room chat; it is open during the game (needed for the Impostor discussion). As in Draw & Guess, players can always talk outside the game.

## Automated tests

- `node test/batch3.js`: rules and edge cases per game against the modules with a fake clock, plus live Socket.IO clients for privacy, spectators, out-of-turn actions, switching games in one room, and reconnect restoring a role and word.
- `node test/batch3ui.js` (Playwright): catalog, create-dialog settings, each game mounts at 390x844 and 1280x800 without horizontal overflow or page errors, plus real UI interaction (typing a prompt, drawing on the canvas and submitting, bluffing and voting, role card, placing a bid, passing the bomb). Screenshots in `docs/screenshots/issue-23/` (`SHOTS=1 node test/batch3ui.js`).
- `batch1ui.js` / `batch2ui.js` catalog counts were updated from 12 to 17 games.
- `npm test` in `node-server` runs everything.

## Manual QA checklist (not covered by automation)

- [ ] Real iPhone Safari: finger drawing on the Telephone canvas (touch-action is disabled on the canvas), keyboard behaviour for the text inputs.
- [ ] 6+ real players in Drawing Telephone: reveal pacing (5 s per entry) and like buttons.
- [ ] Impostor with real chat during discussion; confirm nobody can infer the role from the UI.
- [ ] Liar's Dice reveal timing (7 s) on slow devices.
- [ ] Switch games from the lobby and from the results screen in a live room; Play Again keeps the room.
- [ ] Refresh mid-game in each game.
- [ ] Sounds reuse existing cues.

## Known limitations

- Visual polish is functional only (per the issue); Sol may restyle next week.
- Bluff Battle and Impostor content is a small built-in bank (36 questions, 10 categories x 10 words). Hot Potato answers are not checked against a dictionary (only non-empty, 2+ letters and not already used this round).
- Telephone drawings have no "live" relay; a drawing is sent when its author submits (or auto-submits 1.5 s before the timer).
- There is no per-game rate limit beyond the shared 10 actions/s bucket; bluffs, clues, answers and prompts are length-capped and profanity-masked.
- GitHub CI is not configured to run on stacked PRs, so verification is the local `npm test` run recorded in the PR.
