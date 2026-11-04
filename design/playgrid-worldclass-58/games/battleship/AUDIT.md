# Battleship · Issue 58 delta audit

Priority **P0**. Current client reference **06609a4**. Approved composition **87d8b35**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/battleship-desktop.png) · [Phone current capture](../../review/current-client/battleship-mobile.png) · [Desktop design](../../review/proposed/battleship-desktop.png) · [Phone design](../../review/proposed/battleship-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=battleship) · [Approved specification](https://github.com/abyss-made/gamelab/tree/codex/playgrid-premium-directions/design/playgrid-premium-games)

## Observed current state and scope

Current ship placement and targeting work but fleet art is diagrammatic. Phone targets are physically small. The approved detailed ships are right; the older visual roster misnamed the 3-cell cruiser and 2-cell destroyer, corrected here against the actual FLEET order.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/battleship.js`; rules: `node-server/server/games/battleship.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Keep Bluewater Command, actual five vessel silhouettes and two separate friendly/enemy waters. Friendly ships visibly occupy the exact cells. Enemy chart shows public shots/sunk information only. D4 selection is visibly different from a fired hit or miss.

## Controls and rules discoverability

Placement: select Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2; choose starting cell, rotate, validate bounds/overlap, then Lock fleet. Current Random action immediately locks; label Random & Lock. Target a square then Fire. Precision row/column pickers provide the same target as pointer input. Resign requires stable confirmation.

Current action contract / source reference: `{type:"place",ships:[{x,y,horizontal} ×5]}; {type:"random"}; {type:"fire",cell}; {type:"resign"}`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: tabs show one chart at a time while the fleet summary persists. The 10×10 board cannot promise 44px cells at 390px; use explicit row/column selectors with 44px controls and a labeled confirmation. Announce the coordinate and outcome in text.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Fire draft highlights only selected cell. After accepted result, miss ring 180ms, hit flash 120ms, sunk outline 260ms, then permanent marks remain. Sound: soft sonar select, short hit/miss cues; no long explosions masking turn. Reduced motion uses static marks and text.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: placement validity, view tabs, precision picker, coordinate orientation and focus. Engine change: none; do not reveal enemy fleet or alter hit-again settings. Manual fleet editor is specified; this local state fixture is not a complete fleet editor.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting | [Desktop + phone pair](../../review/states/battleship/waiting.html) · [Source](index.html?state=waiting) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Active / controls | [Desktop + phone pair](../../review/states/battleship/active.html) · [Source](index.html?state=active) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Spectator | [Desktop + phone pair](../../review/states/battleship/spectator.html) · [Source](index.html?state=spectator) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Unavailable / invalid | [Desktop + phone pair](../../review/states/battleship/invalid.html) · [Source](index.html?state=invalid) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Reconnect / resync | [Desktop + phone pair](../../review/states/battleship/reconnect.html) · [Source](index.html?state=reconnect) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Result / host | [Desktop + phone pair](../../review/states/battleship/result.html) · [Source](index.html?state=result) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Result / participant | [Desktop + phone pair](../../review/states/battleship/rematch.html) · [Source](index.html?state=rematch) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Manual placement | [Desktop + phone pair](../../review/states/battleship/placement.html) · [Source](index.html?state=placement) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Random & Lock meaning | [Desktop + phone pair](../../review/states/battleship/random.html) · [Source](index.html?state=random) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Friendly fleet | [Desktop + phone pair](../../review/states/battleship/fleet.html) · [Source](index.html?state=fleet) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Hit / miss receipt | [Desktop + phone pair](../../review/states/battleship/hit.html) · [Source](index.html?state=hit) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Public sunk receipt | [Desktop + phone pair](../../review/states/battleship/sunk.html) · [Source](index.html?state=sunk) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Opponent turn | [Desktop + phone pair](../../review/states/battleship/opponent.html) · [Source](index.html?state=opponent) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Resign confirmation | [Desktop + phone pair](../../review/states/battleship/resign.html) · [Source](index.html?state=resign) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |

## Acceptance / priority

- **P0 functional parity:** Correct lengths/order; overlap and off-board placement unavailable; Random wording matches immediate commitment; same coordinate via picker/pointer; no repeat fire; no unsunk enemy vessels in DOM/alt/data; public sunk/results only.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
