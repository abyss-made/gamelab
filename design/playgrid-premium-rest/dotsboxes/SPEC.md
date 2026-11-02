# Dots & Boxes · implementation specification

**Approved visual direction: Stitch & Claim. Owner approval covers all 13 directions.** These are stateful design references for Claude; production gameplay is not implemented by this package.

[Full-size state explorer](../state-explorer.html?game=dotsboxes) · [Desktop state sheet](states-desktop.png) · [Phone state sheet](states-mobile.png) · [Approved active view](concept.html).

## Component hierarchy

`QuiltTable → Junction + EdgeTarget + OwnerPatch + BoxCounts + PrecisionEdgePicker`

Client: `node-server/public/js/games/dotsboxes.js`; server view: `node-server/server/games/dotsboxes.js`. Preserve current mount/update/unmount/result lifecycle and existing test-facing IDs unless a meaningful updated regression proves parity. Port scoped styles from shared.css/state.css, never mount the static concept as the game.

## Authoritative view mapping

`n, h, v, boxes, players/boxes/out, turn, myIndex, last, timeLeft nullable`

Current wire actions: `action:{type:"edge",kind:"h"|"v",r,c}`. These examples document existing payload shapes, not a replacement schema. Validate against the latest branch before implementation; no server/protocol change is authorized.

Existing sizes are 3, 4 and 5, never 6. Thin visual stitches have 40px target overlays; dense intersections also need coordinate/keyboard selection. The precision selector is a local presentation of the same edge intent and must offer all valid rows/columns, not the two sample options in the illustration. Claim initials/counts from accepted state.

Default 4×4, largest 5×5 and extra-turn states are shown. Final full quilt totals 9+7=16 boxes. Do not hard-code those samples.

## State matrix

Common waiting/reconnect/result states are room lifecycle views; they do not invent new engine phase names. Every frame is a standalone illustrative fixture, not a sequential replay or a live action acknowledgement.

| State | Existing trigger / eligibility | Copy / feedback | Focus / input contract |
|---|---|---|---|
| [Waiting / transition](concept.html?state=waiting) | No eligible game view yet; existing room transition | Waiting for the next turn to begin. | Keep focus on the route heading; do not autofocus a game control. |
| [Active play](concept.html?state=active) | The illustrated eligible local participant view | The approved active composition. | Preserve local input focus across timer/state refreshes. |
| [Spectator](concept.html?state=spectator) | No participating local index / spectator role | You are watching. Private information stays private. | Heading then public board/ledger; no private inputs in the tab order. |
| [Invalid / unavailable](concept.html?state=invalid) | Known local constraint or existing authoritative notice | Choose an available action. | Keep focus on the originating control/input; associate the inline reason. |
| [Reconnect / resync](concept.html?state=reconnect) | Socket disconnected or room state not yet restored | Reconnecting… Your controls return when you are connected. | Keep focus stable; do not move to a disabled game control. |
| [Win / results · host](concept.html?state=result) | Actual room result, local host; never a guessed timer outcome | Results are in. Your party stays together. | Result heading; then existing host result actions. |
| [Result · participant](concept.html?state=rematch) | Actual result; participating non-host | Ready for another round? | Result heading; Ready for Rematch toggles aria-pressed; retain focus. |
| [Opponent turn](concept.html?state=opponent) | turn differs from myIndex | Nova is choosing an edge. | Disable playable edges; public owner initials remain. |
| [Box / extra turn](concept.html?state=claim) | Accepted edge closes one or more boxes and local turn remains | Box claimed. You go again. | Keep focus on last edge or next legal edge, not a full rerender reset. |
| [Largest supported grid](concept.html?state=dense) | n=5 from existing settings | More boxes, the same clear targets. | Precision/keyboard edge input supplements dense direct targets. |

## Responsive, accessibility and motion

Use [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md) for desktop/phone/narrow and keyboard rules, [MOTION.md](../MOTION.md) for event-driven timing, and [COMPONENT-SPECS.md](../COMPONENT-SPECS.md) for reusable implementation contracts. Public boards/history remain visible while secondary details collapse; essential actions remain reachable without clipping. Text/shape/initial accompanies color. Reduced motion preserves all persistent outcomes and timing.

## Claude acceptance

- Implement every state above from actual room/view data; static sample names, scores, letters, words, board positions and timers never enter production logic.
- Preserve private-information boundaries in rendered DOM, accessibility labels and data attributes, not just CSS visibility.
- Verify eligible/ineligible intents, actual state updates, phase transitions, spectator/reconnect, result/rematch and party-preserving game switch in separate browser contexts.
- Run existing automated coverage and targeted regressions for meaningful interaction changes. Compare actual implementation screenshots to active and state references at matching viewports; disclose remaining differences.
- No merge, deploy, new game rules or unnecessary dependencies. See root IMPLEMENTATION-HANDOFF.md for the full 13-game completion gate.
