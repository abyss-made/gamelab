# Categories Rush · implementation specification

**Approved visual direction: The Fieldbook. Owner approval covers all 13 directions.** These are stateful design references for Claude; production gameplay is not implemented by this package.

[Full-size state explorer](../state-explorer.html?game=categories) · [Desktop state sheet](states-desktop.png) · [Phone state sheet](states-mobile.png) · [Approved active view](concept.html).

## Component hierarchy

`Fieldbook → LetterTab + CategoryField[5] + DraftStatus + DoneLock + ReviewTable`

Client: `node-server/public/js/games/categories.js`; server view: `node-server/server/games/categories.js`. Preserve current mount/update/unmount/result lifecycle and existing test-facing IDs unless a meaningful updated regression proves parity. Port scoped styles from shared.css/state.css, never mount the static concept as the game.

## Authoritative view mapping

`cats, letter, myAnswers, myDone, phase, review/rows, players/done/out, round, rounds, myIndex`

Current wire actions: `action:{type:"answers",answers}; same with done:true for final lock`. These examples document existing payload shapes, not a replacement schema. Validate against the latest branch before implementation; no server/protocol change is authorized.

Keep five categories. Existing 250ms debounced save and focusout flush preserve drafts; Done flushes the latest values with done:true. A local pending label is not proof of durable save: show Saved only when accepted state matches. Never replace the focused input on timer ticks. Spectators get no answers before review.

Review fixture: Alex 2+1+1+2+0=6; Nova 2+1+1+2+2=8. Status labels complement scoring; long names/keyboard keep labels and Done reachable.

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
| [Done / read-only](concept.html?state=locked) | myDone true | Your answers are locked. Waiting for the others. | Fields readOnly; Done disabled; confirmation receipt remains. |
| [Round answer review](concept.html?state=review) | phase=review and review.rows exists | Unique 2 · matching 1 · invalid 0. | Named review region/table; horizontal scrolling stays inside it. |
| [Draft pending](concept.html?state=autosave) | Local debounce/send without final done | Saving your draft… | Never move focus or replace the active input node. |
| [Long category / keyboard](concept.html?state=long) | Long category names from existing bank | The label wraps. Your answer stays editable. | Focus and caret survive; controls remain reachable above the keyboard. |

## Responsive, accessibility and motion

Use [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md) for desktop/phone/narrow and keyboard rules, [MOTION.md](../MOTION.md) for event-driven timing, and [COMPONENT-SPECS.md](../COMPONENT-SPECS.md) for reusable implementation contracts. Public boards/history remain visible while secondary details collapse; essential actions remain reachable without clipping. Text/shape/initial accompanies color. Reduced motion preserves all persistent outcomes and timing.

## Claude acceptance

- Implement every state above from actual room/view data; static sample names, scores, letters, words, board positions and timers never enter production logic.
- Preserve private-information boundaries in rendered DOM, accessibility labels and data attributes, not just CSS visibility.
- Verify eligible/ineligible intents, actual state updates, phase transitions, spectator/reconnect, result/rematch and party-preserving game switch in separate browser contexts.
- Run existing automated coverage and targeted regressions for meaningful interaction changes. Compare actual implementation screenshots to active and state references at matching viewports; disclose remaining differences.
- No merge, deploy, new game rules or unnecessary dependencies. See root IMPLEMENTATION-HANDOFF.md for the full 13-game completion gate.
