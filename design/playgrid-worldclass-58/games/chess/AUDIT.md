# Chess · Issue 58 delta audit

Priority **P1**. Current client reference **06609a4**. Approved composition **87d8b35**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/chess-desktop.png) · [Phone current capture](../../review/current-client/chess-mobile.png) · [Desktop design](../../review/proposed/chess-desktop.png) · [Phone design](../../review/proposed/chess-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=chess) · [Approved specification](https://github.com/abyss-made/gamelab/tree/codex/playgrid-premium-directions/design/playgrid-premium-games)

## Observed current state and scope

The current board is usable, with existing promotion/draw/resign logic. Premium walnut material is approved; the remaining quality gap is legal target clarity, orientation/notation, clock focus stability and complete secondary interactions.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/chess.js`; rules: `node-server/server/games/chess.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Keep Walnut & Ivory rather than decorative furniture around a tiny board. Coordinates remain outside piece silhouettes, selected square and last move are distinct, check is a persistent king marker plus text. Captured pieces and notation are secondary to board and clocks.

## Controls and rules discoverability

Tap a legal own piece, then a server-legal destination. Promotion offers Q/R/B/N before sending {type:move,from,to,promo}. Preserve default Queen only where current flow permits it. Offer/accept/decline draw and stable two-tap resign remain. Board skin changes are local cosmetic preferences, not new game settings.

Current action contract / source reference: `{type:"move",from,to,promo?:"Q"|"R"|"B"|"N"}; {type:"offerDraw"}; {type:"acceptDraw"}; {type:"declineDraw"}; {type:"resign"}`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: square board nearly fills width; clocks and names frame it, notation collapses below. Arrow-square navigation plus Enter selects; labels use file/rank and piece name. Coordinates invert with board orientation without changing engine indices.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Accepted move glides 140ms, capture crossfades 100ms, check outline 160ms then stays. Use short piece tap/capture sounds; no ticking countdown loop. Reduced motion snaps moves; clock and result stay textual. Never announce every clock second.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: focus-preserving board updates, legal target grid and promotion modal. Engine change: none. Clock, castling, en-passant, draw rules and checkmate are authoritative; do not add an engine hint/analysis feature.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting | [Desktop + phone pair](../../review/states/chess/waiting.html) · [Source](index.html?state=waiting) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Active / controls | [Desktop + phone pair](../../review/states/chess/active.html) · [Source](index.html?state=active) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Spectator | [Desktop + phone pair](../../review/states/chess/spectator.html) · [Source](index.html?state=spectator) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Unavailable / invalid | [Desktop + phone pair](../../review/states/chess/invalid.html) · [Source](index.html?state=invalid) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Reconnect / resync | [Desktop + phone pair](../../review/states/chess/reconnect.html) · [Source](index.html?state=reconnect) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Result / host | [Desktop + phone pair](../../review/states/chess/result.html) · [Source](index.html?state=result) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Result / participant | [Desktop + phone pair](../../review/states/chess/rematch.html) · [Source](index.html?state=rematch) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Piece / legal targets | [Desktop + phone pair](../../review/states/chess/selected.html) · [Source](index.html?state=selected) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Check | [Desktop + phone pair](../../review/states/chess/check.html) · [Source](index.html?state=check) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Promotion choice | [Desktop + phone pair](../../review/states/chess/promotion.html) · [Source](index.html?state=promotion) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Draw offer / response | [Desktop + phone pair](../../review/states/chess/draw.html) · [Source](index.html?state=draw) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Resign confirmation | [Desktop + phone pair](../../review/states/chess/resign.html) · [Source](index.html?state=resign) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Opponent turn | [Desktop + phone pair](../../review/states/chess/opponent.html) · [Source](index.html?state=opponent) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Time up | [Desktop + phone pair](../../review/states/chess/clock.html) · [Source](index.html?state=clock) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |

## Acceptance / priority

- **P0 functional parity:** All four promotion values use uppercase promo; wrong-turn move impossible; board orientation matches index labels; clock update does not reset resign confirmation/input; draw acceptance only for offered recipient; final board comes from actual result.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
