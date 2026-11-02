# Checkers · implementation specification

**Approved visual direction: Emerald House. Owner approval covers all 13 directions.** These are stateful design references for Claude; production gameplay is not implemented by this package.

[Full-size state explorer](../state-explorer.html?game=checkers) · [Desktop state sheet](states-desktop.png) · [Phone state sheet](states-mobile.png) · [Approved active view](concept.html).

## Component hierarchy

`EmeraldTable → OrientedBoard + Man/King + Selection/LegalTargets + ForcedCapture/ChainReceipt + StableResign`

Client: `node-server/public/js/games/checkers.js`; server view: `node-server/server/games/checkers.js`. Preserve current mount/update/unmount/result lifecycle and existing test-facing IDs unless a meaningful updated regression proves parity. Port scoped styles from shared.css/state.css, never mount the static concept as the game.

## Authoritative view mapping

`board, turn, myIndex, legal, mustJump, chain, last, moves, quiet, players/side/pieces, timeLeft nullable`

Current wire actions: `action:{type:"move",from,to}; {type:"resign"}`. These examples document existing payload shapes, not a replacement schema. Validate against the latest branch before implementation; no server/protocol change is authorized.

Map jade material to the existing Lime side and ivory to White; keep side names explicit. Use only server legal targets. Multi-jump uses the same chain piece; kings come from actual piece codes. Preserve C.keepFocus and C.makeConfirm stable two-tap resign; no first-tap action. Draw only from actual result.

Sample capture/chain diagrams each use one piece per side and a legal diagonal jump. King/capture displays are derived components, not an engine. Keep exact 8×8 orientation and stable square labels.

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
| [Opponent turn](concept.html?state=opponent) | turn differs from myIndex | Nova is choosing a move. | No legal targets for local non-turn view. |
| [Mandatory capture](concept.html?state=capture) | mustJump true and legal targets present | You must capture. | Only real movable pieces/targets enabled. |
| [Locked multi-jump](concept.html?state=chain) | chain >= 0 | Keep jumping with the same piece. | Chain piece stays selected; focus next permitted destination. |
| [King crowned](concept.html?state=king) | Accepted board piece >= 3 | Your piece is now a king. | Crown plus named piece; do not infer kings from decorative size. |
| [Resign armed](concept.html?state=resign) | Existing makeConfirm armed state | Tap again to resign. | Stable two-tap confirmation survives re-render; no resign on first tap. |
| [Quiet draw](concept.html?state=draw) | Actual draw result, not local quiet counter alone | A draw · no capture or man move for 40 moves each. | Neutral result and actual final board. |

## Responsive, accessibility and motion

Use [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md) for desktop/phone/narrow and keyboard rules, [MOTION.md](../MOTION.md) for event-driven timing, and [COMPONENT-SPECS.md](../COMPONENT-SPECS.md) for reusable implementation contracts. Public boards/history remain visible while secondary details collapse; essential actions remain reachable without clipping. Text/shape/initial accompanies color. Reduced motion preserves all persistent outcomes and timing.

## Claude acceptance

- Implement every state above from actual room/view data; static sample names, scores, letters, words, board positions and timers never enter production logic.
- Preserve private-information boundaries in rendered DOM, accessibility labels and data attributes, not just CSS visibility.
- Verify eligible/ineligible intents, actual state updates, phase transitions, spectator/reconnect, result/rematch and party-preserving game switch in separate browser contexts.
- Run existing automated coverage and targeted regressions for meaningful interaction changes. Compare actual implementation screenshots to active and state references at matching viewports; disclose remaining differences.
- No merge, deploy, new game rules or unnecessary dependencies. See root IMPLEMENTATION-HANDOFF.md for the full 13-game completion gate.
