# Four in a Row · Issue 58 delta audit

Priority **P2**. Current client reference **06609a4**. Approved composition **71ca099**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/fourrow-desktop.png) · [Phone current capture](../../review/current-client/fourrow-mobile.png) · [Desktop design](../../review/proposed/fourrow-desktop.png) · [Phone design](../../review/proposed/fourrow-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=fourrow) · [Approved specification](../../../playgrid-premium-rest/fourrow/SPEC.md)

## Observed current state and scope

Already close to finished and should remain fast and simple. Approved Drop Society material and strong column affordances need only measured drop/turn feedback and trustworthy final-state treatment.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/fourrow.js`; rules: `node-server/server/games/fourrow.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Keep the vertical 7×6 board and large whole-column input. Show both named sides with miniature discs. One pending drop highlight, one active player label; do not add strategy panels or compulsory confirm clicks.

## Controls and rules discoverability

Hover/focus previews a column but never sends a drop. Click/Enter sends once if legal and your turn. Full columns explain unavailable state. After real acceptance place one disc at the correct row, and draw only the actual winning line.

Current action contract / source reference: `action:{type:"drop",col}`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: seven column targets span the board width, each receives full-height pointer area. Left/Right moves between columns, Enter drops. Gold/Red have text/shape labels. No horizontal scrolling board.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Drop 180–240ms with one small 40ms settle; active-player label changes with accepted board. Sound: one wooden clack. Reduced motion snaps disc with persistent last-move outline. No idle board animation.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: drop event deduplication and focus retention. Engine change: none; preserve current turn, full-column, draw and forfeit semantics.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting / transition | [Desktop + phone pair](../../review/states/fourrow/waiting.html) · [Source](index.html?state=waiting) | No eligible game view yet; existing room transition; Keep focus on the route heading; do not autofocus a game control. |
| Active play | [Desktop + phone pair](../../review/states/fourrow/active.html) · [Source](index.html?state=active) | The illustrated eligible local participant view; Preserve local input focus across timer/state refreshes. |
| Spectator | [Desktop + phone pair](../../review/states/fourrow/spectator.html) · [Source](index.html?state=spectator) | No participating local index / spectator role; Heading then public board/ledger; no private inputs in the tab order. |
| Invalid / unavailable | [Desktop + phone pair](../../review/states/fourrow/invalid.html) · [Source](index.html?state=invalid) | Known local constraint or existing authoritative notice; Keep focus on the originating control/input; associate the inline reason. |
| Reconnect / resync | [Desktop + phone pair](../../review/states/fourrow/reconnect.html) · [Source](index.html?state=reconnect) | Socket disconnected or room state not yet restored; Keep focus stable; do not move to a disabled game control. |
| Win / results · host | [Desktop + phone pair](../../review/states/fourrow/result.html) · [Source](index.html?state=result) | Actual room result, local host; never a guessed timer outcome; Result heading; then existing host result actions. |
| Result · participant | [Desktop + phone pair](../../review/states/fourrow/rematch.html) · [Source](index.html?state=rematch) | Actual result; participating non-host; Result heading; Ready for Rematch toggles aria-pressed; retain focus. |
| Opponent turn | [Desktop + phone pair](../../review/states/fourrow/opponent.html) · [Source](index.html?state=opponent) | turn differs from myIndex; Read-only board; turn announcement once, not every tick. |
| Full column | [Desktop + phone pair](../../review/states/fourrow/full.html) · [Source](index.html?state=full) | Six occupied slots in a column; Full column is unavailable; keep an accessible reason. |
| Draw result | [Desktop + phone pair](../../review/states/fourrow/draw.html) · [Source](index.html?state=draw) | Actual result.draw; Result heading; neutral palette and existing result actions. |

## Acceptance / priority

- **P0 functional parity:** 7×6 always; no send on focus; full columns disabled; one input gives one action; result line comes from actual winLine; opponent/spectator cannot drop; current clean hierarchy remains.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
