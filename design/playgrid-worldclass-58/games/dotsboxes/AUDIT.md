# Dots & Boxes · Issue 58 delta audit

Priority **P1**. Current client reference **06609a4**. Approved composition **71ca099**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/dotsboxes-desktop.png) · [Phone current capture](../../review/current-client/dotsboxes-mobile.png) · [Desktop design](../../review/proposed/dotsboxes-desktop.png) · [Phone design](../../review/proposed/dotsboxes-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=dotsboxes) · [Approved specification](../../../playgrid-premium-rest/dotsboxes/SPEC.md)

## Observed current state and scope

Dense line/point board can turn into tiny phone hit areas; extra turns after closing boxes and last-edge identity need clearer receipts. Preserve the exact configurable board and approved quilt metaphor.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/dotsboxes.js`; rules: `node-server/server/games/dotsboxes.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Use stitched edges, owner initial in filled fabric patches and subdued unclaimed segments. Hover/keyboard focus previews one edge. Points remain visually separate from edge targets; last accepted edge has a persistent stitch highlight.

## Controls and rules discoverability

Choose an unclaimed horizontal/vertical edge. Preview then click/Enter commits exact kind/r/c; no change to box completion or bonus turn. Announce completed box count and whether the turn continues.

Current action contract / source reference: `action:{type:"edge",kind:"h"|"v",r,c}`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: enlarged invisible edge hit slop must resolve the nearest segment without ambiguous overlap. Keyboard cycles edges; explicit row/column labels. Scroll/zoom or edge list is preferable to pretending all dense edges have 44px spacing.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Edge draws 120ms, new patch fills 160ms, extra-turn caption persists. Sound: light stitch tick and gentle completion tap. Reduced motion instant edge/initial fill.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: hit testing, keyboard edge navigation and event receipts. Engine change: none; scoring and repeated-turn logic remain.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting / transition | [Desktop + phone pair](../../review/states/dotsboxes/waiting.html) · [Source](index.html?state=waiting) | No eligible game view yet; existing room transition; Keep focus on the route heading; do not autofocus a game control. |
| Active play | [Desktop + phone pair](../../review/states/dotsboxes/active.html) · [Source](index.html?state=active) | The illustrated eligible local participant view; Preserve local input focus across timer/state refreshes. |
| Spectator | [Desktop + phone pair](../../review/states/dotsboxes/spectator.html) · [Source](index.html?state=spectator) | No participating local index / spectator role; Heading then public board/ledger; no private inputs in the tab order. |
| Invalid / unavailable | [Desktop + phone pair](../../review/states/dotsboxes/invalid.html) · [Source](index.html?state=invalid) | Known local constraint or existing authoritative notice; Keep focus on the originating control/input; associate the inline reason. |
| Reconnect / resync | [Desktop + phone pair](../../review/states/dotsboxes/reconnect.html) · [Source](index.html?state=reconnect) | Socket disconnected or room state not yet restored; Keep focus stable; do not move to a disabled game control. |
| Win / results · host | [Desktop + phone pair](../../review/states/dotsboxes/result.html) · [Source](index.html?state=result) | Actual room result, local host; never a guessed timer outcome; Result heading; then existing host result actions. |
| Result · participant | [Desktop + phone pair](../../review/states/dotsboxes/rematch.html) · [Source](index.html?state=rematch) | Actual result; participating non-host; Result heading; Ready for Rematch toggles aria-pressed; retain focus. |
| Opponent turn | [Desktop + phone pair](../../review/states/dotsboxes/opponent.html) · [Source](index.html?state=opponent) | turn differs from myIndex; Disable playable edges; public owner initials remain. |
| Box / extra turn | [Desktop + phone pair](../../review/states/dotsboxes/claim.html) · [Source](index.html?state=claim) | Accepted edge closes one or more boxes and local turn remains; Keep focus on last edge or next legal edge, not a full rerender reset. |
| Largest supported grid | [Desktop + phone pair](../../review/states/dotsboxes/dense.html) · [Source](index.html?state=dense) | n=5 from existing settings; Precision/keyboard edge input supplements dense direct targets. |

## Acceptance / priority

- **P0 functional parity:** Each edge maps to exact kind/r/c at every size; claimed edges unavailable; shared-edge double box counted from state; initials identify owner without color; no layout reset during extra turn.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
