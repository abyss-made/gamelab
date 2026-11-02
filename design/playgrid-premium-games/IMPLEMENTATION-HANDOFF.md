# Approved implementation handoff · all eight games

**Owner approval received for all eight directions, including revision 2 of Color Stack, Go Fish, Mini Golf, Property Tycoon and Battleship. Implement the approved designs in the real `node-server` application.** This supersedes the earlier Stage A approval gate. Do not stop after implementing a subset. Do not merge or deploy.

Start with [CLAUDE-TASK.md](CLAUDE-TASK.md), the [gallery](index.html), [revised tables](revised-tables.png), [revised boards](revised-boards.png), each game's `DIRECTION.md`, and the [current-state audit](CURRENT-STATE-AUDIT.md). Inspect the full-size per-game desktop/mobile PNGs; overview sheets are only for comparison.

## Baseline and scope

Use the latest `codex/playgrid-2-redesign` as implementation base; the design audit used `3f0d51a`, which was still its remote head at publication. Re-audit any subsequent changes before editing. Work on a separate implementation branch. Bring the design package across without overwriting newer gameplay work.

Preserve Express, Socket.IO, authoritative game state and payloads, alpha authentication, party-first creation/lobby, Rooms/picker, avatars, chat, queue, host transfer, switching, rematches, hidden-game rules and existing tests. Scope production changes to frontend presentation and the approved client interaction changes below. No dependencies are needed for the provided HTML/CSS/SVG assets.

## How to use the design source

- `shared.css` supplies the original eight-game compositions. Load `revision.css` after it for the five revised games; the later file is the approved version. Port the relevant rules into the application's styling rather than loading the entire static concept shell as a replacement app.
- Per-game `concept.html` provides layout and sample inspection controls, not live game code. Replace every sample value with server state. Do not copy sample card-validity JavaScript, sample players, timers, money or counts into production.
- `assets/` contains original editable SVG material studies and scene artwork. `ASSET-MANIFEST.json` identifies reused Playgrid assets. `asset-source/build-revision.py` regenerates revised artwork using standard-library Python and review-only board data.
- **Scene SVGs are visual references, not playable boards.** Rebuild movable pieces, cells, cards, ownership, balls, ships, target states and timers as separate state-driven elements. Decorative layers can be reused when aligned with the actual playable geometry.
- Preserve the approved logo, self-hosted Inter, portraits, navy/lime identity and original Chess silhouette paths. Never replace game illustration with emoji, unrelated stock images or a generic dashboard.
- Complete required production asset families during implementation. This package includes sample card faces/materials and reusable vessel illustrations, not a complete deck, every city upgrade, all naval damage states or all course illustrations. Do not treat those missing variants as permission to omit working states.

## Shared layout and interaction contract

Target desktop **1440×900**, tablet **768×1024**, phone **390×844**, narrow phone **360×740**. Also test Pool at **844×390**. Preserve recognizable composition at each target: dominant playable surface, clear turn ownership, nearby legal controls, secondary chat/rules/player overlays. Avoid a second marketing hero in gameplay.

Shared tokens and materials are in `DESIGN-SYSTEM.md`; CSS is the concrete visual reference. Keep main controls at least 44px on phone. Dense board cells require keyboard and precise selection alternatives. Focus uses a separate visible ring; selected state has a label/outline; disabled state explains why. Preserve shipped 3.2 focus restoration and stable two-step resign confirmation.

Every game must support waiting, local turn, opponent turn, legal/illegal or unavailable action, accepted/resolving action, spectator/private information boundaries, disconnect/resync, actual supported bot or unavailable bot, result/rematch and switch-game retaining the party. Rules/chat must preserve route and game state. Validate safe areas, text expansion, virtual keyboard and orientation changes. Do not clip controls to make a screenshot fit.

Only Chess among these eight currently has an acting bot, and it is limited. Idle Bot is not a playing opponent. Do not invent AI capability or fabricate actions for the other games. Existing Timer-Off idle-policy decisions and unrelated open gameplay changes are outside visual scope.

## Per-game implementation requirements

| Game / client | Approved composition and assets | Required behavior and edge states |
|---|---|---|
| **Color Stack** · `public/js/games/colorstack.js` | Plum cloth arena, avatars seated across the table, physical face-down opponent fans, central draw/discard piles, large angular face cards, bottom private fan and explicit Play. Reuse `stack-card-back.svg`; generate every existing number/action/wild face from real card data. | Backs derive only from public hand counts; never transmit hidden ranks/colors. Long opponent fans may compress but exact counts remain. Tap/focus inspects; Play sends the existing intent only when server `playable` allows it. Handle draw/keep-pass, Wild color choice, reverse/skip/draw effects, automatic one-card warning, out/result. No new UNO-call rule. A long-hand expansion must keep faces legible and selection stable. |
| **Pool** · `public/js/games/pool.js` | Walnut table, green cloth, detailed pockets, numbered solid/stripe balls, upright labels; fine aim, power and Shoot grouped nearby. Use `pool-table.svg` / `pool-portrait.svg` as material/geometry reference, not baked sample ball positions. | Preserve authoritative 1000×500 table and 12.5-unit radius, current cue/aim, ball-in-hand, pocketing, fouls and two-step resign. Portrait presentation must inverse-map pointers to physical coordinates; landscape uses side controls. No spin/jump/called-pocket or replacement physics. Disable shooting while resolving. |
| **Mini Golf** · `public/js/games/golf.js` | Detailed 2D botanical club: stone curbs, turf stripes, canopies, flowers and garden detail. `golf-dogleg.svg` is desktop; `golf-dogleg-portrait.svg` demonstrates a 90° phone view transform. Ball, cup and aim remain separate state-driven layers. | Keep existing 700×440 course coordinates, exact polygons, static obstacles, sand/water behavior, strokes/par and hole progression. The illustrated garden pond/bridge is outside Dogleg play and is decorative. Inverse-map portrait drag input; do not rotate HUD text. Cover aim/power, roll, collision, real penalties, hole complete, scorecard and results for existing courses. No 3D or new hazard mechanics. |
| **Ludo** · `public/js/games/ludo.js` | Lacquered numbered tokens, ivory 15×15 board, inset home wells, die and four legal-token controls. Use `ludo-board.svg` as styling reference. | Use exact paths/safe cells and server dice. Correct occupied/stacked cells, yard exits, captures, bonus turns, triple-six, final home, unavailable tokens and result. Never duplicate a token between yard and track. Legal-token alternatives and keyboard operation must remain available on phone. |
| **Property Tycoon** · `public/js/games/tycoon.js` | Rich original miniature city, canal/fountain, dimensional roof gardens, champagne board edge, readable tile groups and gem-like pawns. Contextual Rose property sheet; full map names on desktop, numbered tiles with full detail sheet on phone. Use `tycoon-board*.svg` and `blossom-avenue.svg` as original art/material sources. | Keep original 36-tile ordering/names/prices/economy. Blossom Avenue is tile 13, $160 purchase and $12 base rent. Build ownership and upgrades from real data; central city decoration is not owned buildings. Support roll/travel, buy, auction/bids, rent, build/sell, trade offer/accept/decline, debt/bankruptcy and results. All existing management remains reachable, not removed for visual simplicity. Do not copy Monopoly branding, board or assets. |
| **Battleship** · `public/js/games/battleship.js` | Two ocean coordinate charts on desktop; target/friendly-fleet tabs on phone. Five actual vessel designs (`ship-carrier`, `ship-battleship`, `ship-destroyer`, `ship-submarine`, `ship-patrol`) with decks/wakes. Confirmed coordinate sits beside Fire. | Separate actual fleet state from decorative water. Render detailed ships on the friendly chart only; enemy chart shows public hit/miss/sunk information only. Cover manual placement, rotate, validation, lock/wait, aim then Fire, hit/miss/sunk, opponent turn and results. Current random action immediately locks: label it truthfully, such as Random & Lock. Phone fleet view returns clearly to targeting; add a keyboard/precision cell picker. |
| **Go Fish** · `public/js/games/gofish.js` | Sea-glass physical card table, visible opposing face-down fans, engraved marine backs and separate ivory rank/suit faces, pond and book stacks. Reuse `marine-card-back.svg` / `marine-fish.svg`; faces must distinguish actual ranks/suits. | Derive public hand counts/books and private local hand from server view. Preserve rank held → valid player → explicit Ask. Selection never restarts the timer. Handle transfer, draw/Go Fish, books, empty/replenished hand, long-hand rank grouping, opponent turn and results. Never reveal or infer other hands from the artwork. |
| **Chess** · `public/js/games/chess.js` | Large square walnut/ivory board, original Playgrid piece silhouettes, edge clocks, restrained move history and quiet draw/resign controls. Use `chess-walnut.svg` as material reference, not a fixed opening position. | Preserve legal moves, turn/side orientation, castling/en passant, promotion dialog, clocks, check/mate/stalemate, draw offer/response, resign confirmation, focus and keyboard operation. Themes must stay local presentation. A captured-material tray requires a state audit; omit unsupported derived claims rather than guessing. No engine/hints/takebacks/new chess rules. |

All client paths above are relative to `node-server/`. Inspect each existing renderer/server view before refactoring; the table is a preservation checklist, not a new protocol specification.

## Motion and feedback

Use state transitions keyed by authoritative revision/action identity, never repaint-triggered duplicate effects. Update game state immediately; animate presentation without delaying clocks, input validity or socket handling. On reconnect snap/resync rather than replaying old actions.

- Card inspect: 140ms lift; accepted play/transfer: 220–320ms transform; book gather: 350ms. Opponent transfer displays backs only. Keep selected-card focus stable across renders.
- Pool/Golf: render the server's existing sampled motion and timing. Rails/pockets/cup may get short material feedback; no independent trajectory prediction or physics substitution.
- Ludo/Tycoon: accepted token travel follows the existing tile sequence; decorative travel may shorten or snap when superseded. Never delay the next legal turn behind an animation.
- Naval hit/miss: short ripple or warm impact, then persistent cell state and textual receipt. Ship damage must match accepted public/local state.
- Chess: 160–220ms piece translation on accepted move; persistent check/last move cues, never flashing.
- Reduced motion: snap to accepted positions, preserve outcome text and pending/resolving feedback. No continuous shake/pulse or rapid flashes. Existing mute persists; no autoplay ambience. Audio is optional polish, not a dependency or missing-state excuse.

## Verification and completion gate

1. Implement all eight in the real application; no separate static demo, screenshot-as-board or fake controls.
2. Run `npm test` from `node-server` and appropriate browser checks. Preserve existing suites; add meaningful regression coverage for coordinate transforms, hidden-card boundaries, long hands and interaction changes where not already covered.
3. Exercise real multiplayer rooms with separate browser contexts: legal actions, turn changes, private hands/fleets, results/rematch, reconnect and party-preserving game switch. Use valid alpha access without removing authentication. Use actual players for games without acting bots.
4. Capture the running implementation at the four target viewports for every game: **32 core screenshots**, plus Pool landscape and Battleship phone fleet. Add screenshots of materially different selection/promotion/placement/auction/long-hand states. Do not use the design PNGs as implementation evidence.
5. Compare implementation and approved design side by side at matching viewport sizes. Iterate on board scale, spacing, typography, materials, artwork, card backs and controls. Document exact remaining differences and missing asset/state work; no blanket “pixel perfect” claim.
6. Open an implementation PR for owner review, containing the eight-game checklist, test results, screenshot links and remaining gaps. Do not merge, deploy or modify live Render.

## Eight-game release checklist

| Game | State-driven implementation | Required states / multiplayer checked | Desktop / tablet / phone / narrow compared | Remaining differences disclosed |
|---|---|---|---|---|
| Color Stack | [ ] | [ ] | [ ] | [ ] |
| Pool | [ ] | [ ] | [ ] | [ ] |
| Mini Golf | [ ] | [ ] | [ ] | [ ] |
| Ludo | [ ] | [ ] | [ ] | [ ] |
| Property Tycoon | [ ] | [ ] | [ ] | [ ] |
| Battleship | [ ] | [ ] | [ ] | [ ] |
| Go Fish | [ ] | [ ] | [ ] | [ ] |
| Chess | [ ] | [ ] | [ ] | [ ] |

Design approval does not mean implementation is complete. Claude must fill this checklist with evidence in the implementation PR. No production code is changed by this design branch.
