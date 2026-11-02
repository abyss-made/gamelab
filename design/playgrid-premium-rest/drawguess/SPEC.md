# Draw & Guess · implementation specification

**Approved visual direction: Sketch Club. Owner approval covers all 13 directions.** These are stateful design references for Claude; production gameplay is not implemented by this package.

[Full-size state explorer](../state-explorer.html?game=drawguess) · [Desktop state sheet](states-desktop.png) · [Phone state sheet](states-mobile.png) · [Approved active view](concept.html).

## Component hierarchy

`SketchSession → ToolRail + DrawingSurface + PrivateWordPanel / GuessFeed + PlayerScores`

Client: `node-server/public/js/games/drawguess.js`; server view: `node-server/server/games/drawguess.js`. Preserve current mount/update/unmount/result lifecycle and existing test-facing IDs unless a meaningful updated regression proves parity. Port scoped styles from shared.css/state.css, never mount the static concept as the game.

## Authoritative view mapping

`phase, drawerId, choices, word, hint, guessed, turnId, turnResult; room members supply player scores`

Current wire actions: `action:{type:"choose",index}; draw:{op:"begin",x,y,color,size}, {op:"pts",pts}, {op:"end"}, {op:"fill",x,y,color}, {op:"undo"}, {op:"clear"}; guess uses the existing chat/guess path in main.js`. These examples document existing payload shapes, not a replacement schema. Validate against the latest branch before implementation; no server/protocol change is authorized.

Never serialize choices/word for unauthorized roles. Measure the actual 800×600 canvas element, not its decorated wrapper; inverse-map pointer coordinates and preserve existing fill/history replay and limits. Brush and eraser retain independent sizes. A successful guess may legally reveal word to that participant via the view.

13 frames cover private choice, draw/guess/guessed, reveal/focus/clear plus shared lifecycle. Undo/fill cooldown handling may only claim what the client can know; the server currently drops some rejected draws silently.

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
| [Six-word choice](concept.html?state=choose) | Drawer and phase=choose; choices has six words | Choose your word. | First word button; two columns; no word content for other roles. |
| [Guesser / masked word](concept.html?state=guesser) | phase=draw and local eligible guesser has not guessed | Nova is drawing · six-letter mask. | Guess input; never drawer tools. |
| [Guessed correctly](concept.html?state=guessed) | Local ID in guessed; server view now permits word | You got it. Let the others guess. | Success receipt; keep chat focus; no further scoring guesses. |
| [Round reveal](concept.html?state=reveal) | phase=reveal; turnResult and word present | The word was DRAGON. | Reveal heading; do not invent Next button or end the round locally. |
| [Canvas focus mode](concept.html?state=focus) | Existing expanded drawing view | More room for the drawing. | Exit Focus visible; Escape returns focus to original expand control. |
| [Clear confirmation](concept.html?state=clear) | Local clear intent; no clear action sent yet | Clear the whole drawing? | Use existing confirmation behavior; custom dialog is a presentation proposal requiring parity tests. |

## Responsive, accessibility and motion

Use [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md) for desktop/phone/narrow and keyboard rules, [MOTION.md](../MOTION.md) for event-driven timing, and [COMPONENT-SPECS.md](../COMPONENT-SPECS.md) for reusable implementation contracts. Public boards/history remain visible while secondary details collapse; essential actions remain reachable without clipping. Text/shape/initial accompanies color. Reduced motion preserves all persistent outcomes and timing.

## Claude acceptance

- Implement every state above from actual room/view data; static sample names, scores, letters, words, board positions and timers never enter production logic.
- Preserve private-information boundaries in rendered DOM, accessibility labels and data attributes, not just CSS visibility.
- Verify eligible/ineligible intents, actual state updates, phase transitions, spectator/reconnect, result/rematch and party-preserving game switch in separate browser contexts.
- Run existing automated coverage and targeted regressions for meaningful interaction changes. Compare actual implementation screenshots to active and state references at matching viewports; disclose remaining differences.
- No merge, deploy, new game rules or unnecessary dependencies. See root IMPLEMENTATION-HANDOFF.md for the full 13-game completion gate.
