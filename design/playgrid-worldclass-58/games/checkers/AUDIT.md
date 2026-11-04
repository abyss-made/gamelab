# Checkers · Issue 58 delta audit

Priority **P1**. Current client reference **06609a4**. Approved composition **71ca099**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/checkers-desktop.png) · [Phone current capture](../../review/current-client/checkers-mobile.png) · [Desktop design](../../review/proposed/checkers-desktop.png) · [Phone design](../../review/proposed/checkers-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=checkers) · [Approved specification](../../../playgrid-premium-rest/checkers/SPEC.md)

## Observed current state and scope

Working checkers already exposes legal moves and stable confirmation helpers. The approved emerald material needs explicit forced-capture/multi-jump and king feedback so a player understands why another piece is unavailable.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/checkers.js`; rules: `node-server/server/games/checkers.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Keep Emerald House board, named Lime/White sides and distinct crowned kings. Selected piece, forced capture, last move and legal landing dots have separate treatments. Rules cue is concise and adjacent to the turn.

## Controls and rules discoverability

Tap own legal piece then destination from server legal data. When mustJump, show Capture required; when chain is set, lock selection to that piece until complete. Resign stays stable two-tap confirmation using existing helper.

Current action contract / source reference: `action:{type:"move",from,to}; {type:"resign"}`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: square fills width; named side/count/turn stays above; forced action caption below. Keyboard arrows traverse squares, Enter chooses. Crown shape and spoken king label do not depend on color.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Move 150ms, capture fade 120ms, promotion crown 180ms. Sound: wooden piece tap and soft crown chime. Reduced motion snap/crown with persistent capture receipt.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: legal grid, chain focus, promotion marker and stable helper reuse. Engine change: none; draw/quiet counter, captures, kings and orientation unchanged.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting / transition | [Desktop + phone pair](../../review/states/checkers/waiting.html) · [Source](index.html?state=waiting) | No eligible game view yet; existing room transition; Keep focus on the route heading; do not autofocus a game control. |
| Active play | [Desktop + phone pair](../../review/states/checkers/active.html) · [Source](index.html?state=active) | The illustrated eligible local participant view; Preserve local input focus across timer/state refreshes. |
| Spectator | [Desktop + phone pair](../../review/states/checkers/spectator.html) · [Source](index.html?state=spectator) | No participating local index / spectator role; Heading then public board/ledger; no private inputs in the tab order. |
| Invalid / unavailable | [Desktop + phone pair](../../review/states/checkers/invalid.html) · [Source](index.html?state=invalid) | Known local constraint or existing authoritative notice; Keep focus on the originating control/input; associate the inline reason. |
| Reconnect / resync | [Desktop + phone pair](../../review/states/checkers/reconnect.html) · [Source](index.html?state=reconnect) | Socket disconnected or room state not yet restored; Keep focus stable; do not move to a disabled game control. |
| Win / results · host | [Desktop + phone pair](../../review/states/checkers/result.html) · [Source](index.html?state=result) | Actual room result, local host; never a guessed timer outcome; Result heading; then existing host result actions. |
| Result · participant | [Desktop + phone pair](../../review/states/checkers/rematch.html) · [Source](index.html?state=rematch) | Actual result; participating non-host; Result heading; Ready for Rematch toggles aria-pressed; retain focus. |
| Opponent turn | [Desktop + phone pair](../../review/states/checkers/opponent.html) · [Source](index.html?state=opponent) | turn differs from myIndex; No legal targets for local non-turn view. |
| Mandatory capture | [Desktop + phone pair](../../review/states/checkers/capture.html) · [Source](index.html?state=capture) | mustJump true and legal targets present; Only real movable pieces/targets enabled. |
| Locked multi-jump | [Desktop + phone pair](../../review/states/checkers/chain.html) · [Source](index.html?state=chain) | chain >= 0; Chain piece stays selected; focus next permitted destination. |
| King crowned | [Desktop + phone pair](../../review/states/checkers/king.html) · [Source](index.html?state=king) | Accepted board piece >= 3; Crown plus named piece; do not infer kings from decorative size. |
| Resign armed | [Desktop + phone pair](../../review/states/checkers/resign.html) · [Source](index.html?state=resign) | Existing makeConfirm armed state; Stable two-tap confirmation survives re-render; no resign on first tap. |
| Quiet draw | [Desktop + phone pair](../../review/states/checkers/draw.html) · [Source](index.html?state=draw) | Actual draw result, not local quiet counter alone; Neutral result and actual final board. |

## Acceptance / priority

- **P0 functional parity:** Forced jump disables unrelated pieces; chain cannot switch token; crown matches piece code; wrong side cannot act; confirmation survives clock repaint; actual quiet draw and final board retained.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
