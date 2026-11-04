# The Impostor · Issue 58 delta audit

Priority **P0**. Current client reference **06609a4**. Approved composition **71ca099**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/impostor-desktop.png) · [Phone current capture](../../review/current-client/impostor-mobile.png) · [Desktop design](../../review/proposed/impostor-desktop.png) · [Phone design](../../review/proposed/impostor-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=impostor) · [Approved specification](../../../playgrid-premium-rest/impostor/SPEC.md)

## Observed current state and scope

Current private role/word plus clue, discussion and vote controls require a stronger privacy model in the interface. Covering a word visually is not access control. No new voice chat or secret-role-colored participants are appropriate.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/impostor.js`; rules: `node-server/server/games/impostor.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Keep Confidential Club folder, public clue ledger and equal public identity cards. Crew sees word, impostor only category, spectator no role/word. Readiness, anonymous vote and last guess each have one clear primary action.

## Controls and rules discoverability

Local cover toggles private word visibility for an entitled crew member; it never grants data. Clues max 30 chars. Discussion uses existing chat and ready. Vote cannot target self; show only own lock before results. Last-guess input belongs only to caught impostor. Result uses actual caught/stole/voided outcome.

Current action contract / source reference: `action:{type:"clue",text}; {type:"ready"}; {type:"vote",target}; {type:"guess",text}`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: private folder compact with explicit cover, clues in chronological list, active phase controls below. Vote identities have equal scale and named targets. Screen-reader labels must obey the same secret boundaries as the visible DOM.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Folder cover 160ms, clue append 140ms, result identity reveal 220ms. Sound: restrained card turn and phase cue; no detective alarm that labels a hidden role. Reduced motion static cover/result badges.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: role-specific DOM, local cover and phase focus. Engine change: none; no early vote aggregation, role inference service or automated accusation.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting / transition | [Desktop + phone pair](../../review/states/impostor/waiting.html) · [Source](index.html?state=waiting) | No eligible game view yet; existing room transition; Keep focus on the route heading; do not autofocus a game control. |
| Active play | [Desktop + phone pair](../../review/states/impostor/active.html) · [Source](index.html?state=active) | The illustrated eligible local participant view; Preserve local input focus across timer/state refreshes. |
| Spectator | [Desktop + phone pair](../../review/states/impostor/spectator.html) · [Source](index.html?state=spectator) | No participating local index / spectator role; Heading then public board/ledger; no private inputs in the tab order. |
| Invalid / unavailable | [Desktop + phone pair](../../review/states/impostor/invalid.html) · [Source](index.html?state=invalid) | Known local constraint or existing authoritative notice; Keep focus on the originating control/input; associate the inline reason. |
| Reconnect / resync | [Desktop + phone pair](../../review/states/impostor/reconnect.html) · [Source](index.html?state=reconnect) | Socket disconnected or room state not yet restored; Keep focus stable; do not move to a disabled game control. |
| Win / results · host | [Desktop + phone pair](../../review/states/impostor/result.html) · [Source](index.html?state=result) | Actual room result, local host; never a guessed timer outcome; Result heading; then existing host result actions. |
| Result · participant | [Desktop + phone pair](../../review/states/impostor/rematch.html) · [Source](index.html?state=rematch) | Actual result; participating non-host; Result heading; Ready for Rematch toggles aria-pressed; retain focus. |
| Private impostor role | [Desktop + phone pair](../../review/states/impostor/impostor.html) · [Source](index.html?state=impostor) | role=impostor, word null; Category only; no secret word in DOM/labels/data. |
| Private word covered | [Desktop + phone pair](../../review/states/impostor/covered.html) · [Source](index.html?state=covered) | Local cover preference while crew view permits word; Local privacy cover; button toggles aria-expanded; not a security boundary. |
| Another player’s clue | [Desktop + phone pair](../../review/states/impostor/opponent.html) · [Source](index.html?state=opponent) | phase=clue and turnId differs from local; Own clue form unavailable; public clues readable. |
| Discussion / ready | [Desktop + phone pair](../../review/states/impostor/discuss.html) · [Source](index.html?state=discuss) | phase=discuss; Discussion chat plus existing ready action; no voice feature. |
| Accusation vote | [Desktop + phone pair](../../review/states/impostor/vote.html) · [Source](index.html?state=vote) | phase=vote and myVote absent; Equal public player targets; own target unavailable. |
| Vote locked | [Desktop + phone pair](../../review/states/impostor/voted.html) · [Source](index.html?state=voted) | myVote present; Private selected target only; no public counts before result. |
| Caught impostor / guess | [Desktop + phone pair](../../review/states/impostor/lastguess.html) · [Source](index.html?state=lastguess) | phase=guess and role=impostor; Word remains unknown; guess input for impostor only. |
| Round result / word | [Desktop + phone pair](../../review/states/impostor/reveal.html) · [Source](index.html?state=reveal) | phase=result and result exists; Use actual caught/stole/voided result, not inferred votes. |

## Acceptance / priority

- **P0 functional parity:** Impostor/spectator have no hidden word in markup/alt/data; cover remains local preference; own vote disabled; clue length exact; last guess never appears to crew; results reflect actual branch.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
