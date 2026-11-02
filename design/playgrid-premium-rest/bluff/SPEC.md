# Bluff Battle · implementation specification

**Approved visual direction: The Velvet Lie. Owner approval covers all 13 directions.** These are stateful design references for Claude; production gameplay is not implemented by this package.

[Full-size state explorer](../state-explorer.html?game=bluff) · [Desktop state sheet](states-desktop.png) · [Phone state sheet](states-mobile.png) · [Approved active view](concept.html).

## Component hierarchy

`VelvetSalon → Prompt + PrivateFakeEntry/Lock + AnonymousBallot + VoteLock + TruthAuthorship`

Client: `node-server/public/js/games/bluff.js`; server view: `node-server/server/games/bluff.js`. Preserve current mount/update/unmount/result lifecycle and existing test-facing IDs unless a meaningful updated regression proves parity. Port scoped styles from shared.css/state.css, never mount the static concept as the game.

## Authoritative view mapping

`phase, question, myFake, options/{i,text,mine}, myVote, reveal/options/authors/voters/real/gains, players/locked/out, myIndex`

Current wire actions: `action:{type:"bluff",text}; {type:"vote",option}`. These examples document existing payload shapes, not a replacement schema. Validate against the latest branch before implementation; no server/protocol change is authorized.

Keep fake length max 40, merged duplicate authors and own-option guard. During vote, never attach authors/real/voter metadata; do not leak through avatars, DOM attributes or option prominence. Real/author/voter/gain details appear only at reveal.

Duplicate bluffs may reduce option count; no fabricated filler option. A merged option reveals all returned authors and voter identities only when allowed.

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
| [Write a bluff](concept.html?state=write) | phase=bluff, eligible, myFake absent | Make it believable. | Fake-answer input max 40, Submit explicit. |
| [Bluff locked](concept.html?state=locked) | myFake present in bluff phase | Your bluff is in. Waiting for the others. | Show own text only; remove editable input. |
| [Vote locked](concept.html?state=voted) | phase=vote, myVote not null | Gridmark locked. Waiting for the truth. | Own selected option is named, all vote inputs unavailable. |
| [Truth / authors / voters](concept.html?state=reveal) | phase=reveal; reveal.options returned | Octothorpe was the real answer. | Reveal real flag, merged authors and voters only now. |

## Responsive, accessibility and motion

Use [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md) for desktop/phone/narrow and keyboard rules, [MOTION.md](../MOTION.md) for event-driven timing, and [COMPONENT-SPECS.md](../COMPONENT-SPECS.md) for reusable implementation contracts. Public boards/history remain visible while secondary details collapse; essential actions remain reachable without clipping. Text/shape/initial accompanies color. Reduced motion preserves all persistent outcomes and timing.

## Claude acceptance

- Implement every state above from actual room/view data; static sample names, scores, letters, words, board positions and timers never enter production logic.
- Preserve private-information boundaries in rendered DOM, accessibility labels and data attributes, not just CSS visibility.
- Verify eligible/ineligible intents, actual state updates, phase transitions, spectator/reconnect, result/rematch and party-preserving game switch in separate browser contexts.
- Run existing automated coverage and targeted regressions for meaningful interaction changes. Compare actual implementation screenshots to active and state references at matching viewports; disclose remaining differences.
- No merge, deploy, new game rules or unnecessary dependencies. See root IMPLEMENTATION-HANDOFF.md for the full 13-game completion gate.
