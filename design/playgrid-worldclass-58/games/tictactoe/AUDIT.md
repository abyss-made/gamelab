# Tic Tac Toe · Issue 58 delta audit

Priority **P1**. Current client reference **06609a4**. Approved composition **71ca099**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/tictactoe-desktop.png) · [Phone current capture](../../review/current-client/tictactoe-mobile.png) · [Desktop design](../../review/proposed/tictactoe-desktop.png) · [Phone design](../../review/proposed/tictactoe-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=tictactoe) · [Approved specification](../../../playgrid-premium-rest/tictactoe/SPEC.md)

## Observed current state and scope

Working rules and small grid are straightforward; plain symbols and spare feedback lack the approved ceramic table personality. Avoid adding clutter to a game whose strength is immediate readability.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/tictactoe.js`; rules: `node-server/server/games/tictactoe.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Use approved ceramic tiles and original X/O assets, restrained depth and negative space. Current turn and assigned mark sit above the 3×3. Final winning trio remains visible; draw gets equal visual care without a false winner.

## Controls and rules discoverability

One tap/Enter in an empty square places your mark; occupied cells are inspectable with disabled reason. Do not add confirmation to a reversible selection that is not part of the rules. Preserve winner-stays/score settings.

Current action contract / source reference: `action:{type:"place",cell}`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: grid occupies width with generous targets. Roving arrow grid plus square/mark labels. Mark shape is the side identity; color is supporting only.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Accepted stamp 140ms, winning line 180ms. Sound: ceramic tick, short result cadence. Reduced motion instant stamp and static win line.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: legal empty-square semantics, accessible grid and result board. Engine change: none.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting / transition | [Desktop + phone pair](../../review/states/tictactoe/waiting.html) · [Source](index.html?state=waiting) | No eligible game view yet; existing room transition; Keep focus on the route heading; do not autofocus a game control. |
| Active play | [Desktop + phone pair](../../review/states/tictactoe/active.html) · [Source](index.html?state=active) | The illustrated eligible local participant view; Preserve local input focus across timer/state refreshes. |
| Spectator | [Desktop + phone pair](../../review/states/tictactoe/spectator.html) · [Source](index.html?state=spectator) | No participating local index / spectator role; Heading then public board/ledger; no private inputs in the tab order. |
| Invalid / unavailable | [Desktop + phone pair](../../review/states/tictactoe/invalid.html) · [Source](index.html?state=invalid) | Known local constraint or existing authoritative notice; Keep focus on the originating control/input; associate the inline reason. |
| Reconnect / resync | [Desktop + phone pair](../../review/states/tictactoe/reconnect.html) · [Source](index.html?state=reconnect) | Socket disconnected or room state not yet restored; Keep focus stable; do not move to a disabled game control. |
| Win / results · host | [Desktop + phone pair](../../review/states/tictactoe/result.html) · [Source](index.html?state=result) | Actual room result, local host; never a guessed timer outcome; Result heading; then existing host result actions. |
| Result · participant | [Desktop + phone pair](../../review/states/tictactoe/rematch.html) · [Source](index.html?state=rematch) | Actual result; participating non-host; Result heading; Ready for Rematch toggles aria-pressed; retain focus. |
| Opponent turn | [Desktop + phone pair](../../review/states/tictactoe/opponent.html) · [Source](index.html?state=opponent) | turn differs from myIndex; Read-only board; keep prior focus stable. |
| Draw result | [Desktop + phone pair](../../review/states/tictactoe/draw.html) · [Source](index.html?state=draw) | Actual result.draw; Neutral result heading; no victory celebration. |

## Acceptance / priority

- **P0 functional parity:** No occupied/wrong-turn moves; all nine keyboard squares; turn and mark explicit; actual win/draw distinguished; result board is original final position, not regenerated sample.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
