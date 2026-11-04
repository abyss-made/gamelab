# Bluff Battle · Issue 58 delta audit

Priority **P1**. Current client reference **06609a4**. Approved composition **71ca099**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/bluff-desktop.png) · [Phone current capture](../../review/current-client/bluff-mobile.png) · [Desktop design](../../review/proposed/bluff-desktop.png) · [Phone design](../../review/proposed/bluff-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=bluff) · [Approved specification](../../../playgrid-premium-rest/bluff/SPEC.md)

## Observed current state and scope

Current prompt, bluff input and voting phases need one coherent deception-table rhythm. A vote must never be hinted by correctness styling, authorship labels or impossible self-selection.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/bluff.js`; rules: `node-server/server/games/bluff.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Keep Bluff Parlor authored answer slips, central prompt and equal-weight options. Phase caption explicitly says Write a bluff, Choose an answer or Reveal. Own answer has an unavailable treatment only for its owner, not public authorship.

## Controls and rules discoverability

Type bluff within existing 100-char limit, submit and lock only from phase/mySubmitted. During vote select an eligible option once. Preserve anonymous ordering; reveal truth/authors and point receipts only when the actual view permits it.

Current action contract / source reference: `action:{type:"bluff",text}; {type:"vote",option}`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: answer slips stack at full readable width and large tap height. Keep prompt above choices; submitted text remains visible to self without hidden focus targets. Text symbols and labels complement colors.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Accepted submit 120ms; reveal flip 220ms only after public result. Sound: pen drop then quiet reveal cadence. Reduced motion crossfade/static front/back labels; no 3D flip.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: keyed anonymous choices, draft/lock and reveal hierarchy. Engine change: none; truth, author IDs, vote counts and scoring remain private until reveal.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting / transition | [Desktop + phone pair](../../review/states/bluff/waiting.html) · [Source](index.html?state=waiting) | No eligible game view yet; existing room transition; Keep focus on the route heading; do not autofocus a game control. |
| Active play | [Desktop + phone pair](../../review/states/bluff/active.html) · [Source](index.html?state=active) | The illustrated eligible local participant view; Preserve local input focus across timer/state refreshes. |
| Spectator | [Desktop + phone pair](../../review/states/bluff/spectator.html) · [Source](index.html?state=spectator) | No participating local index / spectator role; Heading then public board/ledger; no private inputs in the tab order. |
| Invalid / unavailable | [Desktop + phone pair](../../review/states/bluff/invalid.html) · [Source](index.html?state=invalid) | Known local constraint or existing authoritative notice; Keep focus on the originating control/input; associate the inline reason. |
| Reconnect / resync | [Desktop + phone pair](../../review/states/bluff/reconnect.html) · [Source](index.html?state=reconnect) | Socket disconnected or room state not yet restored; Keep focus stable; do not move to a disabled game control. |
| Win / results · host | [Desktop + phone pair](../../review/states/bluff/result.html) · [Source](index.html?state=result) | Actual room result, local host; never a guessed timer outcome; Result heading; then existing host result actions. |
| Result · participant | [Desktop + phone pair](../../review/states/bluff/rematch.html) · [Source](index.html?state=rematch) | Actual result; participating non-host; Result heading; Ready for Rematch toggles aria-pressed; retain focus. |
| Write a bluff | [Desktop + phone pair](../../review/states/bluff/write.html) · [Source](index.html?state=write) | phase=bluff, eligible, myFake absent; Fake-answer input max 40, Submit explicit. |
| Bluff locked | [Desktop + phone pair](../../review/states/bluff/locked.html) · [Source](index.html?state=locked) | myFake present in bluff phase; Show own text only; remove editable input. |
| Vote locked | [Desktop + phone pair](../../review/states/bluff/voted.html) · [Source](index.html?state=voted) | phase=vote, myVote not null; Own selected option is named, all vote inputs unavailable. |
| Truth / authors / voters | [Desktop + phone pair](../../review/states/bluff/reveal.html) · [Source](index.html?state=reveal) | phase=reveal; reveal.options returned; Reveal real flag, merged authors and voters only now. |

## Acceptance / priority

- **P0 functional parity:** Own bluff cannot get own vote; no truth marker pre-reveal; count/order matches view; one vote; rejected bluff retained; actual scores and authors only at reveal.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
