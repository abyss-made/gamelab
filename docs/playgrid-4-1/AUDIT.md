# Issue #70 — Playgrid 4.1 audit and implementation contracts

Base: `a81444b4afc59bfbe1bf83213ba5f6fc4dd7ac76` (`codex/playgrid-2-redesign`, merged #68).
Branch: `codex/playgrid-4-1-experience`. #66 is superseded and is not integrated separately.

## Ownership boundary

Game modules, game-specific rules/data, gameplay UI, invitation presentation and scoped CSS belong here. Preserve Express/Socket.IO architecture, room lifecycle, logging, deployment, authentication and performance work. #69 asks Claude to verify the merged classic-avatar invite and short-landscape drawing fixes; preserve both. No merge, deploy or real ads.

## Reproduced/code-confirmed defects and intended behavior

| Area | Current implementation | Expected contract |
|---|---|---|
| Invite | Full-height navy form, isolated returning avatar, editable name plus an "Edit character or name" action, duplicate save actions | Compact party ticket and one identity editor; existing saved identity, classic randomization, room routing and deferred join remain intact; host/count are omitted because invite routes have no authoritative preview data |
| Introductions | Rules exist in a separate dialog; selected-game lobby has no common worked example | All selectable games have a concise lobby briefing with example, timer/ending, expandable rules and existing readiness controls; do not begin hidden timers behind an auto-open modal |
| Telephone settings | Only draw/write timers; chain length hard-coded to player count; no prompt source/custom list | Server-validated configurable chain steps, draw/write timers, player/curated/custom prompts; default retains a full-table pass |
| Telephone rounds | Server increments zero-based work index to n for reveal, then exposes index+1; HUD clamps but module contract can report n+1/n | Expose bounded current step and completed count; reveal is not an extra round; explicit configured total shared by UI/server/results |
| Impostor | Own role/word privacy is already correct. A forced no-repeat role cycle makes the last remaining role predictable; reveal UI omits vote breakdown | Independent secret assignment each round; own role known only to that player, crew word private, no public identity or ballots before result; reveal explains votes/tie/last-chance scoring |
| Bluff | Raw mixed-case fake/real answers persist through options and reveal | Uppercase all user-facing question/answer text, preserving case-insensitive matching and duplicate-bluff merging; arbitrary invented bluffs remain permitted by this game's rules |
| Word Chain / Scramble | Existing broad bundled dictionary, case/accent normalization and server checks are present | Preserve dictionary-backed validation; document plural/inflection/duplicate policy, improve notices, test proper nouns, Unicode and nonsense; don't apply a dictionary to creative drawing prompts or invented Bluff answers |
| Categories | Any plausible-length text with the right first letter scores; unknown nonsense is accepted. Generic plural stripping corrupts proper names (James/Paris) | Server validates real words and recognized proper answers; proper-name categories do not strip terminal s; round review supplies a specific invalid reason; creative-category semantic limits documented |
| Hot Potato (hidden) | Only length/duplicate checks for answers | Keep hidden status; use server word/phrase legitimacy checks with clear rejections without turning creative prompts into exact trivia answers |
| Go Fish | Private hands and selection are correct; only local asker sees pending request; no authoritative transition identity for public transfer/draw/book feedback | Publish only asker/target/rank and public counts/outcome, never drawn private rank or hands; clear event-based animation with reconnect deduplication and reduced motion |
| Dots & Boxes | Owner classes/initials already exist, but premium CSS mutes colors; taken edge labels omit owner | Vibrant distinct owner colors and patterns, numbered keys/initials, explicit capture/extra-turn feedback and accessible ownership labels |
| Golf | Every ball spawns at the identical tee point, ball-ball collisions deliberately disabled, no placement action, courses lack ramps | Non-overlapping designated tee positions, server-validated first-shot placement, deterministic multi-ball physics and synchronized paths, preserve existing 2D top-down coordinate transform; existing hazards/rebounds retained and course variety improved |
| Tycoon | HUD duplicates roster/cash; all properties/trades/log panels expanded beside board | Board remains focal; compact status, concise current action, collapsible contextual property/trade/log panels, viewport/mobile/landscape fit |

## Reviewable implementation groups

1. Game correctness/settings/word rules + edge-case tests.
2. Invitation, lobby introductions, social/game visual feedback + browser evidence.
3. Golf placement, synchronized collisions/course variety + deterministic tests.
4. Integration validation, screenshots, conflicts/known limits and PR review.

The opening-state screenshot matrix will cover 1366×768, 1440×900, 390×844 and 932×430. Full multiplayer transitions/reconnects require additional functional tests; a screenshot alone is not a passing gameplay test.

## Round/end-condition matrix

| Game family | Authoritative meaning | Verification |
|---|---|---|
| Draw & Guess | Configured table rounds; each eligible drawer takes a turn before a round completes | Existing DG suite plus configured-final-total regression |
| Categories, Word Scramble, Bluff, Impostor | One prompt/word/vote cycle per configured round | New regression drives each to the selected final total and checks bounded views/results |
| Trivia | Question index versus configured question count | Existing suite plus configured-final-total regression; shared header says Question |
| Drawing Telephone | Chain steps including initial prompt, then reveal; default initial roster length | New 5-step deterministic and 3-step real-browser custom-source runs; reveal clamps to total |
| Higher or Lower (hidden) | Configured question/guess rounds | New selected-total regression, visibility unchanged |
| Property Tycoon | Table turns, then configured round advances; zero is existing endless mode | Existing batch5 finite/infinite ending tests; compact HUD keeps server round |
| Mini Golf | Hole number / course hole count | Existing per-hole/course/end tests, plus 24-hole geometry/tee matrix; header says Hole |
| Word Chain, Hot Potato, Liar's Dice | Elimination / lives, rather than a configured fixed round total | Existing life/forfeit/fuse tests; do not fabricate a fixed round denominator |
| Board/card games | Legal terminal position, books or empty hand | Existing game suites; no invented round progress |

## Late browser findings

- Distinct Golf starts invalidated a legacy browser fixture's fixed-angle second-player shot. The fixture now tests choosing the vacated central tee through the real placement action before its existing miss/sink scenario.
- Golf's snapshot `busy` flag stays true until another update; placement must use the same local replay deadline as Putt. Fixed and verified without a fresh snapshot.
- The legacy short-landscape shell margin made a 100%-wide shell overflow by four pixels. Scoped landscape margin reset removes that overflow.
- Untouched base `a81444b` still overlays the expanded 932×430 drawing word bar with desktop canvas/tools. Explicit focus grid areas fix this; a real hit-test now checks that the word is unobscured, not merely present in the DOM.
- Go Fish's initial public-action panel pushed the private hand below the desktop fold. The final panel lives in the table center beside the pond/books.
- Played review captures exposed unreadable inherited lime/struck-through validation reasons on the cream Categories table and inherited dark text on new navy Impostor cards. Scoped contrast corrections preserve the answer strike-through alone; the horizontally scrollable review table is keyboard focusable.
