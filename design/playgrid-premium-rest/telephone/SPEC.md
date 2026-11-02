# Drawing Telephone · implementation specification

**Approved visual direction: Paper Relay. Owner approval covers all 13 directions.** These are stateful design references for Claude; production gameplay is not implemented by this package.

[Full-size state explorer](../state-explorer.html?game=telephone) · [Desktop state sheet](states-desktop.png) · [Phone state sheet](states-mobile.png) · [Approved active view](concept.html).

## Component hierarchy

`RelayStudio → CurrentSource + WorkKind + DrawingSurface/TextEntry + ReadyList + AcceptedLock; RelayReveal → ReleasedEntryTimeline + Like`

Client: `node-server/public/js/games/telephone.js`; server view: `node-server/server/games/telephone.js`. Preserve current mount/update/unmount/result lifecycle and existing test-facing IDs unless a meaningful updated regression proves parity. Port scoped styles from shared.css/state.css, never mount the static concept as the game.

## Authoritative view mapping

`phase, kind, source only for active work, mine, myDone, players/done/out, round, rounds; reveal.rev with prefix entries, liked/likes/skipped`

Current wire actions: `action:{type:"text",text}; {type:"draw",strokes}; {type:"like",chain,idx}`. These examples document existing payload shapes, not a replacement schema. Validate against the latest branch before implementation; no server/protocol change is authorized.

Only the current handed source is visible during work. No early thumbnails/full chain in DOM. Preserve 800×600, existing 12 colors, brush/eraser presets 4/10/22 and stroke/fill/point caps. The drawn sample is player-content illustration, not a shipped fixed background. Do not lock permanently before myDone; retain draft/history after rejection. Likes obey own/skipped/already-liked/spectator guards.

Four-player sample has four readiness entries. Staged reveal contains only authorized prefix; final reveal animation does not fetch future entries.

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
| [Initial prompt](concept.html?state=prompt) | phase=work, kind=prompt | Write something fun to draw. | Prompt input then Submit; no source/chain entries yet. |
| [Describe source drawing](concept.html?state=describe) | phase=work, kind=guess and source.kind=draw | What is this a drawing of? | Description input; only this source drawing is shown. |
| [Done awaiting acceptance](concept.html?state=pending) | Local send, myDone still false | Submitting… Your page is not locked yet. | Keep draft/strokes until actual myDone or existing rejection handling. |
| [Done accepted](concept.html?state=locked) | myDone true | Page passed. Waiting for the others. | No editable drawing/text; receipt focus stable. |
| [Staged chain reveal](concept.html?state=reveal) | phase=reveal and rev.entries contains released prefix | One story, wonderfully changed. | Only returned entries; Like disabled for own/skipped/already-liked. |
| [Drawing limit](concept.html?state=limit) | Existing stroke/fill/point cap reached locally | Drawing limit reached. Undo or clear to continue. | Keep Undo/Clear reachable; explain the limit beside canvas. |

## Responsive, accessibility and motion

Use [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md) for desktop/phone/narrow and keyboard rules, [MOTION.md](../MOTION.md) for event-driven timing, and [COMPONENT-SPECS.md](../COMPONENT-SPECS.md) for reusable implementation contracts. Public boards/history remain visible while secondary details collapse; essential actions remain reachable without clipping. Text/shape/initial accompanies color. Reduced motion preserves all persistent outcomes and timing.

## Claude acceptance

- Implement every state above from actual room/view data; static sample names, scores, letters, words, board positions and timers never enter production logic.
- Preserve private-information boundaries in rendered DOM, accessibility labels and data attributes, not just CSS visibility.
- Verify eligible/ineligible intents, actual state updates, phase transitions, spectator/reconnect, result/rematch and party-preserving game switch in separate browser contexts.
- Run existing automated coverage and targeted regressions for meaningful interaction changes. Compare actual implementation screenshots to active and state references at matching viewports; disclose remaining differences.
- No merge, deploy, new game rules or unnecessary dependencies. See root IMPLEMENTATION-HANDOFF.md for the full 13-game completion gate.
