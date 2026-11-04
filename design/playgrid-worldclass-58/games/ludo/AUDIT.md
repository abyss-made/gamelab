# Ludo · Issue 58 delta audit

Priority **P0**. Current client reference **06609a4**. Approved composition **87d8b35**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/ludo-desktop.png) · [Phone current capture](../../review/current-client/ludo-mobile.png) · [Desktop design](../../review/proposed/ludo-desktop.png) · [Phone design](../../review/proposed/ludo-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=ludo) · [Approved specification](https://github.com/abyss-made/gamelab/tree/codex/playgrid-premium-directions/design/playgrid-premium-games)

## Observed current state and scope

The working client provides numbered-token buttons but the board looks like a flat diagram. Phase, legal token choice, stacked/safe cells and extra turns need a single readable explanation. The approved toy-board direction should stay.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/ludo.js`; rules: `node-server/server/games/ludo.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Render four homes as crafted toy trays with clear colored lanes, safe-cell emblems and numbered dimensional pieces. Owner initial plus token number survives tiny stacking. Keep dice and legal choices as one turn pod. Do not animate a rolled value before the real roll arrives.

## Controls and rules discoverability

Roll is enabled only in roll phase. In move phase, both board tokens and the numbered legal-token list use st.movable. A six does not automatically mean every token can move. For a stack, open a compact numbered owner list; do not use an ambiguous giant tap target.

Current action contract / source reference: `{type:"roll"}; {type:"move",token}`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: square board first, compact dice/turn strip, then 2×2 legal token choices at least 44px high. Safe cells are shape plus label; sides retain names. Announce who gets the next roll once, not on each clock tick.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Die settles to actual accepted value over 300ms. Token follows actual path at 70ms/cell, capped at 500ms. Captured piece returns in 220ms; extra-turn label persists. Sound: wood die rattle, quiet token step, distinct home chime. Reduced motion snaps pieces and retains capture/home/bonus receipt.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: legal choice overlays, stack picker and event deduplication. Engine change: none; preserve current triple-six, capture, safe-cell and exact-home rules.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting | [Desktop + phone pair](../../review/states/ludo/waiting.html) · [Source](index.html?state=waiting) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Active / controls | [Desktop + phone pair](../../review/states/ludo/active.html) · [Source](index.html?state=active) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Spectator | [Desktop + phone pair](../../review/states/ludo/spectator.html) · [Source](index.html?state=spectator) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Unavailable / invalid | [Desktop + phone pair](../../review/states/ludo/invalid.html) · [Source](index.html?state=invalid) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Reconnect / resync | [Desktop + phone pair](../../review/states/ludo/reconnect.html) · [Source](index.html?state=reconnect) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Result / host | [Desktop + phone pair](../../review/states/ludo/result.html) · [Source](index.html?state=result) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Result / participant | [Desktop + phone pair](../../review/states/ludo/rematch.html) · [Source](index.html?state=rematch) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Waiting to roll | [Desktop + phone pair](../../review/states/ludo/roll.html) · [Source](index.html?state=roll) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Rolled six / legal choices | [Desktop + phone pair](../../review/states/ludo/choose.html) · [Source](index.html?state=choose) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Stacked tokens / safe cell | [Desktop + phone pair](../../review/states/ludo/stack.html) · [Source](index.html?state=stack) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Capture return | [Desktop + phone pair](../../review/states/ludo/capture.html) · [Source](index.html?state=capture) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Bonus turn | [Desktop + phone pair](../../review/states/ludo/bonus.html) · [Source](index.html?state=bonus) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Opponent turn | [Desktop + phone pair](../../review/states/ludo/opponent.html) · [Source](index.html?state=opponent) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |

## Acceptance / priority

- **P0 functional parity:** Roll cannot move a token; only server-legal tokens are active; same token index from board or list; stacks show each owner/number; capture and bonus follow real state; four colors remain distinguishable by names/patterns.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
