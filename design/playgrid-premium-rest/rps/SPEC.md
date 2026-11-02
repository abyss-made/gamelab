# Rock Paper Scissors · implementation specification

**Approved visual direction: Throwdown. Owner approval covers all 13 directions.** These are stateful design references for Claude; production gameplay is not implemented by this package.

[Full-size state explorer](../state-explorer.html?game=rps) · [Desktop state sheet](states-desktop.png) · [Phone state sheet](states-mobile.png) · [Approved active view](concept.html).

## Component hierarchy

`ThrowArena → DuelIdentity + ThrowChoice[3] + LockReceipt + TournamentBracket + Reveal`

Client: `node-server/public/js/games/rps.js`; server view: `node-server/server/games/rps.js`. Preserve current mount/update/unmount/result lifecycle and existing test-facing IDs unless a meaningful updated regression proves parity. Port scoped styles from shared.css/state.css, never mount the static concept as the game.

## Authoritative view mapping

`players/out/left, bracket, phase, round, roundsTotal, bestOf, myPick, inMatch, locked, reveal, throwNo`

Current wire actions: `action:{type:"pick",move:"rock"|"paper"|"scissors"}`. These examples document existing payload shapes, not a replacement schema. Validate against the latest branch before implementation; no server/protocol change is authorized.

One tap locks the pick; no new confirmation or take-back. Never infer opponents’ throws from locked IDs. Reveal both only from reveal.results. Full bracket supports 2–16 players, byes and eliminated viewers.

Rock/paper/scissors are original illustrated hands. The 16-player frame demonstrates internal bracket scrolling; it does not invent matches or advance a bracket.

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
| [Private pick locked](concept.html?state=locked) | myPick present, phase=pick | Rock locked. Waiting for Nova. | Selected throw unavailable; lock receipt role=status. |
| [Simultaneous reveal](concept.html?state=reveal) | phase=reveal and reveal.results present | Rock beats scissors. Alex wins the throw. | Announce both throws and outcome together. |
| [Tie / throw again](concept.html?state=tie) | reveal.out=tie | Both chose Rock. Throw again. | Wait for new phase=pick before enabling choices. |
| [Bye / waiting](concept.html?state=bye) | Not in current live match, eligible player | You have a bye. Watch the bracket. | Bracket region; no private throw controls. |
| [Sixteen-player bracket](concept.html?state=bracket16) | Existing bracket with four rounds | The whole tournament at a glance. | Scrollable named bracket region, keyboard reachable. |
| [Eliminated](concept.html?state=out) | players[myIndex].out or left | You’re out. Follow the final. | Bracket only; no picker. |

## Responsive, accessibility and motion

Use [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md) for desktop/phone/narrow and keyboard rules, [MOTION.md](../MOTION.md) for event-driven timing, and [COMPONENT-SPECS.md](../COMPONENT-SPECS.md) for reusable implementation contracts. Public boards/history remain visible while secondary details collapse; essential actions remain reachable without clipping. Text/shape/initial accompanies color. Reduced motion preserves all persistent outcomes and timing.

## Claude acceptance

- Implement every state above from actual room/view data; static sample names, scores, letters, words, board positions and timers never enter production logic.
- Preserve private-information boundaries in rendered DOM, accessibility labels and data attributes, not just CSS visibility.
- Verify eligible/ineligible intents, actual state updates, phase transitions, spectator/reconnect, result/rematch and party-preserving game switch in separate browser contexts.
- Run existing automated coverage and targeted regressions for meaningful interaction changes. Compare actual implementation screenshots to active and state references at matching viewports; disclose remaining differences.
- No merge, deploy, new game rules or unnecessary dependencies. See root IMPLEMENTATION-HANDOFF.md for the full 13-game completion gate.
