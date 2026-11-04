# Color Stack · Issue 58 delta audit

Priority **P0**. Current client reference **06609a4**. Approved composition **87d8b35**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/colorstack-desktop.png) · [Phone current capture](../../review/current-client/colorstack-mobile.png) · [Desktop design](../../review/proposed/colorstack-desktop.png) · [Phone design](../../review/proposed/colorstack-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=colorstack) · [Approved specification](https://github.com/abyss-made/gamelab/tree/codex/playgrid-premium-directions/design/playgrid-premium-games)

## Observed current state and scope

Current cards and controls sit in conventional UI panels; opponents are identified mostly through text/counts. The table does not have the approved sense of people seated across from you. The current engine already supports drawn-card play or pass and automatic one-card announcements; do not add a new Call UNO mechanic.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/colorstack.js`; rules: `node-server/server/games/colorstack.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Keep the approved neon social-club felt, original card backs and face-down hands in front of each opponent. The top discard, active color, direction and next eligible player form one central read. Lift one selected card 8px; inspection is separate from committing Play. Illegal cards remain readable with a reason, not a mysterious failed tap.

## Controls and rules discoverability

Tap or arrow through the local fan, select, then Play. A wild opens four named color choices with shape/text. Draw is one action; after a playable draw show Play drawn card and Keep & pass. Preserve card IDs through sorting. Color payload uses r/b/g/y, never CSS names. Opponent DOM contains backs and counts only.

Current action contract / source reference: `{type:"play",card,color?:"r"|"b"|"g"|"y"}; {type:"draw"}; {type:"pass"}`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: overlap hands but preserve the outer rank/color corners. More than eight cards becomes a horizontal rank-readable strip; keep Play and Draw above the safe area. Keyboard selection scrolls into view. Do not make dragging the only play path.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Deal backs at 60ms per visible seat, total visual budget 480ms; deal counts come from the actual batch. Play travels 180ms to discard, reverse arrow rotates 160ms, penalty receipt persists. Sound: soft paper shuffle, restrained felt tap, short reverse click. Reduced motion: instant placement and persistent direction/penalty labels.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: keyed card DOM, eligibility and drawn state, long-hand focus, event receipts. Engine change: none required. Never predict the next player or change draw/stack rules.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting | [Desktop + phone pair](../../review/states/colorstack/waiting.html) · [Source](index.html?state=waiting) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Active / controls | [Desktop + phone pair](../../review/states/colorstack/active.html) · [Source](index.html?state=active) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Spectator | [Desktop + phone pair](../../review/states/colorstack/spectator.html) · [Source](index.html?state=spectator) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Unavailable / invalid | [Desktop + phone pair](../../review/states/colorstack/invalid.html) · [Source](index.html?state=invalid) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Reconnect / resync | [Desktop + phone pair](../../review/states/colorstack/reconnect.html) · [Source](index.html?state=reconnect) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Result / host | [Desktop + phone pair](../../review/states/colorstack/result.html) · [Source](index.html?state=result) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Result / participant | [Desktop + phone pair](../../review/states/colorstack/rematch.html) · [Source](index.html?state=rematch) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Dealing | [Desktop + phone pair](../../review/states/colorstack/deal.html) · [Source](index.html?state=deal) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Opponent turn | [Desktop + phone pair](../../review/states/colorstack/opponent.html) · [Source](index.html?state=opponent) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Drawn playable card / keep-pass | [Desktop + phone pair](../../review/states/colorstack/drawn.html) · [Source](index.html?state=drawn) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Wild color choice | [Desktop + phone pair](../../review/states/colorstack/wild.html) · [Source](index.html?state=wild) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Penalty draw receipt | [Desktop + phone pair](../../review/states/colorstack/penalty.html) · [Source](index.html?state=penalty) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Long hand | [Desktop + phone pair](../../review/states/colorstack/long.html) · [Source](index.html?state=long) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Out / spectating | [Desktop + phone pair](../../review/states/colorstack/out.html) · [Source](index.html?state=out) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |

## Acceptance / priority

- **P0 functional parity:** My hand never appears for spectators; opponent hands contain no ranks; wild cannot submit before a valid color; drawn state permits only the drawn card or pass; hand sorting does not change emitted card ID.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
