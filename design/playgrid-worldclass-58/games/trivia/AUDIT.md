# Trivia Blitz · Issue 58 delta audit

Priority **P1**. Current client reference **06609a4**. Approved composition **71ca099**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/trivia-desktop.png) · [Phone current capture](../../review/current-client/trivia-mobile.png) · [Desktop design](../../review/proposed/trivia-desktop.png) · [Phone design](../../review/proposed/trivia-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=trivia) · [Approved specification](../../../playgrid-premium-rest/trivia/SPEC.md)

## Observed current state and scope

Functional answer buttons need a stronger question/answer hierarchy and credible lock/reveal separation. Current server already owns correctness and timing; the design cannot reveal answers early.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/trivia.js`; rules: `node-server/server/games/trivia.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Keep Orbit Quiz question stage, four distinct answer slabs and compact round/deadline. Number labels 1–4 are part of the target. Own selected answer locks quietly; correctness waits until reveal.

## Controls and rules discoverability

Tap or press labeled answer, then follow existing immediate-lock behavior (do not insert an extra confirm). Disable all answer changes after accepted own answer. Shuffle/order always comes from actual view.

Current action contract / source reference: `action:{type:"answer",choice}`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: answers stack with 52px minimum recommended height; question wraps naturally without tiny text. Show time without flashing the whole card; focus stays on locked answer until phase changes.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Selection 100ms, accepted lock border persists, correct/wrong reveal 200ms with labels and symbols. Sound: soft select, restrained correct/wrong cue at actual reveal. Reduced motion no flips; static badges.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: phase styling, locked focus and reveal ordering. Engine change: none; question set, correct index and scoring remain private until authorized.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting / transition | [Desktop + phone pair](../../review/states/trivia/waiting.html) · [Source](index.html?state=waiting) | No eligible game view yet; existing room transition; Keep focus on the route heading; do not autofocus a game control. |
| Active play | [Desktop + phone pair](../../review/states/trivia/active.html) · [Source](index.html?state=active) | The illustrated eligible local participant view; Preserve local input focus across timer/state refreshes. |
| Spectator | [Desktop + phone pair](../../review/states/trivia/spectator.html) · [Source](index.html?state=spectator) | No participating local index / spectator role; Heading then public board/ledger; no private inputs in the tab order. |
| Invalid / unavailable | [Desktop + phone pair](../../review/states/trivia/invalid.html) · [Source](index.html?state=invalid) | Known local constraint or existing authoritative notice; Keep focus on the originating control/input; associate the inline reason. |
| Reconnect / resync | [Desktop + phone pair](../../review/states/trivia/reconnect.html) · [Source](index.html?state=reconnect) | Socket disconnected or room state not yet restored; Keep focus stable; do not move to a disabled game control. |
| Win / results · host | [Desktop + phone pair](../../review/states/trivia/result.html) · [Source](index.html?state=result) | Actual room result, local host; never a guessed timer outcome; Result heading; then existing host result actions. |
| Result · participant | [Desktop + phone pair](../../review/states/trivia/rematch.html) · [Source](index.html?state=rematch) | Actual result; participating non-host; Result heading; Ready for Rematch toggles aria-pressed; retain focus. |
| Answer locked | [Desktop + phone pair](../../review/states/trivia/locked.html) · [Source](index.html?state=locked) | phase=ask and myPick not null; Selected answer aria-pressed, no change after lock. |
| Correct answer / gain | [Desktop + phone pair](../../review/states/trivia/reveal.html) · [Source](index.html?state=reveal) | phase=reveal and reveal.correct exists; Correct label plus symbol/outline; keyboard focus remains stable. |
| Wrong / no-answer reveal | [Desktop + phone pair](../../review/states/trivia/wrong.html) · [Source](index.html?state=wrong) | phase=reveal and local wrong or absent pick; Mark local wrong separately from the revealed correct answer. |
| Long question / answers | [Desktop + phone pair](../../review/states/trivia/long.html) · [Source](index.html?state=long) | Existing variable-length question and choices; Keep each choice fully readable and touchable. |

## Acceptance / priority

- **P0 functional parity:** No correctness in hidden markup before reveal; one answer intent only; timer cannot reopen choices; 1–4 matches current order; tied rankings and unanswered states distinct.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
