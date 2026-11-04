# Draw & Guess · Issue 58 delta audit

Priority **P2**. Current client reference **06609a4**. Approved composition **71ca099**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/drawguess-desktop.png) · [Phone current capture](../../review/current-client/drawguess-mobile.png) · [Desktop design](../../review/proposed/drawguess-desktop.png) · [Phone design](../../review/proposed/drawguess-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=drawguess) · [Approved specification](../../../playgrid-premium-rest/drawguess/SPEC.md)

## Observed current state and scope

Closest to the desired finish with Four in a Row. Preserve the working simple drawing hierarchy; a wholesale composition change would add risk without improving the central activity. Main remaining gaps are focus mode, private-word boundaries and restrained tool feedback.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/drawguess.js`; rules: `node-server/server/games/drawguess.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Keep Sketch Club paper, compact tool rail and separate social guess feed. The drawing stays visually dominant. Preserve simple brush/fill/eraser/undo/clear; avoid a large creative-suite ribbon or texture overlay on player marks.

## Controls and rules discoverability

Tool taps select before drawing. Retain independent brush and eraser sizes. Drawer gets choice/private word; guessers get only hint unless their permitted view reveals the answer. Existing guess/chat path stays intact. Clear needs confirmation, Undo stays immediate within actual limits.

Current action contract / source reference: `action:{type:"choose",index}; draw:{op:"begin",x,y,color,size}, {op:"pts",pts}, {op:"end"}, {op:"fill",x,y,color}, {op:"undo"}, {op:"clear"}; guess uses the existing chat/guess path in main.js`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: drawing canvas first, tools as short rail, chat/players in reachable tabs. Pointer maps the measured 800×600 drawing element, never its frame. Focus mode restores focus to its launcher. Keep named color buttons and size labels.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Tool selection 100ms, guessed receipt 180ms; never animate strokes independently of real drawing events. Sound: optional short correct-guess chime, no continuous brush sound. Reduced motion removes receipt scale while preserving score/word reveal.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: focus mode and keyboard/tool clarity only. Engine change: none. Existing dropped/cooldown draws are not explicit acknowledgements; do not show a false Accepted check.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting / transition | [Desktop + phone pair](../../review/states/drawguess/waiting.html) · [Source](index.html?state=waiting) | No eligible game view yet; existing room transition; Keep focus on the route heading; do not autofocus a game control. |
| Active play | [Desktop + phone pair](../../review/states/drawguess/active.html) · [Source](index.html?state=active) | The illustrated eligible local participant view; Preserve local input focus across timer/state refreshes. |
| Spectator | [Desktop + phone pair](../../review/states/drawguess/spectator.html) · [Source](index.html?state=spectator) | No participating local index / spectator role; Heading then public board/ledger; no private inputs in the tab order. |
| Invalid / unavailable | [Desktop + phone pair](../../review/states/drawguess/invalid.html) · [Source](index.html?state=invalid) | Known local constraint or existing authoritative notice; Keep focus on the originating control/input; associate the inline reason. |
| Reconnect / resync | [Desktop + phone pair](../../review/states/drawguess/reconnect.html) · [Source](index.html?state=reconnect) | Socket disconnected or room state not yet restored; Keep focus stable; do not move to a disabled game control. |
| Win / results · host | [Desktop + phone pair](../../review/states/drawguess/result.html) · [Source](index.html?state=result) | Actual room result, local host; never a guessed timer outcome; Result heading; then existing host result actions. |
| Result · participant | [Desktop + phone pair](../../review/states/drawguess/rematch.html) · [Source](index.html?state=rematch) | Actual result; participating non-host; Result heading; Ready for Rematch toggles aria-pressed; retain focus. |
| Six-word choice | [Desktop + phone pair](../../review/states/drawguess/choose.html) · [Source](index.html?state=choose) | Drawer and phase=choose; choices has six words; First word button; two columns; no word content for other roles. |
| Guesser / masked word | [Desktop + phone pair](../../review/states/drawguess/guesser.html) · [Source](index.html?state=guesser) | phase=draw and local eligible guesser has not guessed; Guess input; never drawer tools. |
| Guessed correctly | [Desktop + phone pair](../../review/states/drawguess/guessed.html) · [Source](index.html?state=guessed) | Local ID in guessed; server view now permits word; Success receipt; keep chat focus; no further scoring guesses. |
| Round reveal | [Desktop + phone pair](../../review/states/drawguess/reveal.html) · [Source](index.html?state=reveal) | phase=reveal; turnResult and word present; Reveal heading; do not invent Next button or end the round locally. |
| Canvas focus mode | [Desktop + phone pair](../../review/states/drawguess/focus.html) · [Source](index.html?state=focus) | Existing expanded drawing view; Exit Focus visible; Escape returns focus to original expand control. |
| Clear confirmation | [Desktop + phone pair](../../review/states/drawguess/clear.html) · [Source](index.html?state=clear) | Local clear intent; no clear action sent yet; Use existing confirmation behavior; custom dialog is a presentation proposal requiring parity tests. |

## Acceptance / priority

- **P0 functional parity:** Original drawing remains unfiltered; private word absent from guesser/spectator DOM; fill/undo/history caps preserved; pen/touch maps accurately at both sizes; chat focus survives state refresh; clear cannot happen on first accidental tap.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
