# Word Scramble · Issue 58 delta audit

Priority **P1**. Current client reference **06609a4**. Approved composition **71ca099**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/wordscramble-desktop.png) · [Phone current capture](../../review/current-client/wordscramble-mobile.png) · [Desktop design](../../review/proposed/wordscramble-desktop.png) · [Phone design](../../review/proposed/wordscramble-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=wordscramble) · [Approved specification](../../../playgrid-premium-rest/wordscramble/SPEC.md)

## Observed current state and scope

Working typed input supports core play; the approved letter desk adds focus. Difficulty must match real bank length and solved state must not leak the answer to peers.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/wordscramble.js`; rules: `node-server/server/games/wordscramble.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Keep Letterworks tactile rack with high-contrast letter faces, one generous typed field, deadline and solved count. Letter decoration never changes order or answer semantics. CENAO is Easy; hard fixture uses the real longer bank.

## Controls and rules discoverability

Type and Enter to guess; retain rejected word and error association. No dictionary lookup, hints or drag-only anagram rearrangement. Preserve max length 24, phase/solved guards and actual score gain.

Current action contract / source reference: `action:{type:"guess",word}`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: compact rack with readable letters, input above keyboard, standings below. Maintain input focus and caret across timer refreshes; keyboard submit is first-class.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Invalid input uses border/text 120ms, no shake. Accepted solve has 180ms receipt and actual score. Sound: quiet correct-word chime, no keystroke sounds. Reduced motion static receipt.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: keyed input, validation/focus, score receipt. Engine change: none; dictionary, word bank, idle and scoring unchanged.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting / transition | [Desktop + phone pair](../../review/states/wordscramble/waiting.html) · [Source](index.html?state=waiting) | No eligible game view yet; existing room transition; Keep focus on the route heading; do not autofocus a game control. |
| Active play | [Desktop + phone pair](../../review/states/wordscramble/active.html) · [Source](index.html?state=active) | The illustrated eligible local participant view; Preserve local input focus across timer/state refreshes. |
| Spectator | [Desktop + phone pair](../../review/states/wordscramble/spectator.html) · [Source](index.html?state=spectator) | No participating local index / spectator role; Heading then public board/ledger; no private inputs in the tab order. |
| Invalid / unavailable | [Desktop + phone pair](../../review/states/wordscramble/invalid.html) · [Source](index.html?state=invalid) | Known local constraint or existing authoritative notice; Keep focus on the originating control/input; associate the inline reason. |
| Reconnect / resync | [Desktop + phone pair](../../review/states/wordscramble/reconnect.html) · [Source](index.html?state=reconnect) | Socket disconnected or room state not yet restored; Keep focus stable; do not move to a disabled game control. |
| Win / results · host | [Desktop + phone pair](../../review/states/wordscramble/result.html) · [Source](index.html?state=result) | Actual room result, local host; never a guessed timer outcome; Result heading; then existing host result actions. |
| Result · participant | [Desktop + phone pair](../../review/states/wordscramble/rematch.html) · [Source](index.html?state=rematch) | Actual result; participating non-host; Result heading; Ready for Rematch toggles aria-pressed; retain focus. |
| Solved / locked | [Desktop + phone pair](../../review/states/wordscramble/solved.html) · [Source](index.html?state=solved) | solvedByMe true; Success receipt; do not expose answer to other participants. |
| Answer reveal | [Desktop + phone pair](../../review/states/wordscramble/reveal.html) · [Source](index.html?state=reveal) | phase=reveal and reveal.word exists; Announce reveal once with actual gain/no-answer outcome. |
| Long word / wrapping | [Desktop + phone pair](../../review/states/wordscramble/long.html) · [Source](index.html?state=long) | Existing hard length; same typed-answer rules; Normal input, not drag-only tiles. |

## Acceptance / priority

- **P0 functional parity:** Rejected draft retained; solved user cannot resubmit; not-yet-solved peers do not receive answer; real difficulty lengths; deadline update leaves caret intact; reveal only in permitted phase.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
