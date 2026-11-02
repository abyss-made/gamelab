# The Impostor · implementation specification

**Approved visual direction: Confidential Club. Owner approval covers all 13 directions.** These are stateful design references for Claude; production gameplay is not implemented by this package.

[Full-size state explorer](../state-explorer.html?game=impostor) · [Desktop state sheet](states-desktop.png) · [Phone state sheet](states-mobile.png) · [Approved active view](concept.html).

## Component hierarchy

`ConfidentialSession → PrivateRoleFolder + PublicClueLedger + ClueEntry / DiscussionReady / AnonymousAccusation / LastGuess + Result`

Client: `node-server/public/js/games/impostor.js`; server view: `node-server/server/games/impostor.js`. Preserve current mount/update/unmount/result lifecycle and existing test-facing IDs unless a meaningful updated regression proves parity. Port scoped styles from shared.css/state.css, never mount the static concept as the game.

## Authoritative view mapping

`phase, role, word, category, clues, clueRounds, turnId, ready, myVote, result, players/voted/out, myIndex`

Current wire actions: `action:{type:"clue",text}; {type:"ready"}; {type:"vote",target}; {type:"guess",text}`. These examples document existing payload shapes, not a replacement schema. Validate against the latest branch before implementation; no server/protocol change is authorized.

Crew gets word; impostor gets category only; spectator gets no private role/word until result. Cover is local privacy, not access control. Vote targets are public identities with own target unavailable. Never expose vote counts early or style participants by secret role. Last guess is impostor-only; actual caught/stole/voided controls result.

Crew, impostor, covered, spectator, clue turns, discussion, vote, locked vote, last guess and round result are all specified. Public clues may legitimately let an impostor infer the word; do not block that game mechanic.

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
| [Private impostor role](concept.html?state=impostor) | role=impostor, word null | You are the impostor. Blend in. | Category only; no secret word in DOM/labels/data. |
| [Private word covered](concept.html?state=covered) | Local cover preference while crew view permits word | Word covered. | Local privacy cover; button toggles aria-expanded; not a security boundary. |
| [Another player’s clue](concept.html?state=opponent) | phase=clue and turnId differs from local | Waiting for Nova’s clue. | Own clue form unavailable; public clues readable. |
| [Discussion / ready](concept.html?state=discuss) | phase=discuss | Who doesn’t know the word? | Discussion chat plus existing ready action; no voice feature. |
| [Accusation vote](concept.html?state=vote) | phase=vote and myVote absent | Who is the impostor? | Equal public player targets; own target unavailable. |
| [Vote locked](concept.html?state=voted) | myVote present | Vote locked. Waiting for the others. | Private selected target only; no public counts before result. |
| [Caught impostor / guess](concept.html?state=lastguess) | phase=guess and role=impostor | One last chance. Guess the word. | Word remains unknown; guess input for impostor only. |
| [Round result / word](concept.html?state=reveal) | phase=result and result exists | Nova was the impostor. The word was CANDLE. | Use actual caught/stole/voided result, not inferred votes. |

## Responsive, accessibility and motion

Use [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md) for desktop/phone/narrow and keyboard rules, [MOTION.md](../MOTION.md) for event-driven timing, and [COMPONENT-SPECS.md](../COMPONENT-SPECS.md) for reusable implementation contracts. Public boards/history remain visible while secondary details collapse; essential actions remain reachable without clipping. Text/shape/initial accompanies color. Reduced motion preserves all persistent outcomes and timing.

## Claude acceptance

- Implement every state above from actual room/view data; static sample names, scores, letters, words, board positions and timers never enter production logic.
- Preserve private-information boundaries in rendered DOM, accessibility labels and data attributes, not just CSS visibility.
- Verify eligible/ineligible intents, actual state updates, phase transitions, spectator/reconnect, result/rematch and party-preserving game switch in separate browser contexts.
- Run existing automated coverage and targeted regressions for meaningful interaction changes. Compare actual implementation screenshots to active and state references at matching viewports; disclose remaining differences.
- No merge, deploy, new game rules or unnecessary dependencies. See root IMPLEMENTATION-HANDOFF.md for the full 13-game completion gate.
