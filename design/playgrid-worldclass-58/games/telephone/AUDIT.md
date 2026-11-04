# Drawing Telephone · Issue 58 delta audit

Priority **P0**. Current client reference **06609a4**. Approved composition **71ca099**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/telephone-desktop.png) · [Phone current capture](../../review/current-client/telephone-mobile.png) · [Desktop design](../../review/proposed/telephone-desktop.png) · [Phone design](../../review/proposed/telephone-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=telephone) · [Approved specification](../../../playgrid-premium-rest/telephone/SPEC.md)

## Observed current state and scope

The game needs credible handoff/reveal pacing and clear work mode, beyond a polished paper canvas. Early chain thumbnails would spoil the entire game. Existing draw/text constraints and myDone acknowledgement are essential.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/telephone.js`; rules: `node-server/server/games/telephone.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Keep Paper Relay tools and uncluttered paper; distinguish source prompt from your work. Ready avatars show count without showing future content. Reveal expands only the released prefix of a chain with author, drawing/text and optional like.

## Controls and rules discoverability

Draw or describe according to actual kind. Submit explicit text or strokes, preserve draft/history until myDone. Never fetch/render unreleased chain entries. Likes target exact chain/idx and obey own/already-liked/skipped guards. Drawing source art is fixture player content, never shipped canvas background.

Current action contract / source reference: `action:{type:"text",text}; {type:"draw",strokes}; {type:"like",chain,idx}`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: paper first, tools compact, source card collapsible only when permitted; text mode replaces drawing controls. Reveal is a vertical readable timeline rather than tiny sideways cards. Keyboard can reach each released entry/like.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Accepted handoff paper slide 240ms, reveal entry 220ms with max one at a time. Sound: quiet paper pass and short reveal swell, no autoplay narration. Reduced motion no slide; reveal order/privacy identical.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: authorized prefix renderer, stable work drafts, draw caps and reaction state. Engine change: none; round/chain assignment and reveal cadence remain.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting / transition | [Desktop + phone pair](../../review/states/telephone/waiting.html) · [Source](index.html?state=waiting) | No eligible game view yet; existing room transition; Keep focus on the route heading; do not autofocus a game control. |
| Active play | [Desktop + phone pair](../../review/states/telephone/active.html) · [Source](index.html?state=active) | The illustrated eligible local participant view; Preserve local input focus across timer/state refreshes. |
| Spectator | [Desktop + phone pair](../../review/states/telephone/spectator.html) · [Source](index.html?state=spectator) | No participating local index / spectator role; Heading then public board/ledger; no private inputs in the tab order. |
| Invalid / unavailable | [Desktop + phone pair](../../review/states/telephone/invalid.html) · [Source](index.html?state=invalid) | Known local constraint or existing authoritative notice; Keep focus on the originating control/input; associate the inline reason. |
| Reconnect / resync | [Desktop + phone pair](../../review/states/telephone/reconnect.html) · [Source](index.html?state=reconnect) | Socket disconnected or room state not yet restored; Keep focus stable; do not move to a disabled game control. |
| Win / results · host | [Desktop + phone pair](../../review/states/telephone/result.html) · [Source](index.html?state=result) | Actual room result, local host; never a guessed timer outcome; Result heading; then existing host result actions. |
| Result · participant | [Desktop + phone pair](../../review/states/telephone/rematch.html) · [Source](index.html?state=rematch) | Actual result; participating non-host; Result heading; Ready for Rematch toggles aria-pressed; retain focus. |
| Initial prompt | [Desktop + phone pair](../../review/states/telephone/prompt.html) · [Source](index.html?state=prompt) | phase=work, kind=prompt; Prompt input then Submit; no source/chain entries yet. |
| Describe source drawing | [Desktop + phone pair](../../review/states/telephone/describe.html) · [Source](index.html?state=describe) | phase=work, kind=guess and source.kind=draw; Description input; only this source drawing is shown. |
| Done awaiting acceptance | [Desktop + phone pair](../../review/states/telephone/pending.html) · [Source](index.html?state=pending) | Local send, myDone still false; Keep draft/strokes until actual myDone or existing rejection handling. |
| Done accepted | [Desktop + phone pair](../../review/states/telephone/locked.html) · [Source](index.html?state=locked) | myDone true; No editable drawing/text; receipt focus stable. |
| Staged chain reveal | [Desktop + phone pair](../../review/states/telephone/reveal.html) · [Source](index.html?state=reveal) | phase=reveal and rev.entries contains released prefix; Only returned entries; Like disabled for own/skipped/already-liked. |
| Drawing limit | [Desktop + phone pair](../../review/states/telephone/limit.html) · [Source](index.html?state=limit) | Existing stroke/fill/point cap reached locally; Keep Undo/Clear reachable; explain the limit beside canvas. |

## Acceptance / priority

- **P0 functional parity:** No early full-chain DOM/images; prompt visible only to entitled participant; submit rejection restores work; 800×600 mapping and stroke caps preserved; likes cannot target own/skipped/locked entries.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
