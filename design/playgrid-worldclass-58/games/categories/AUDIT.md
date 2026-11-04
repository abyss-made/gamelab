# Categories Rush · Issue 58 delta audit

Priority **P1**. Current client reference **06609a4**. Approved composition **71ca099**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/categories-desktop.png) · [Phone current capture](../../review/current-client/categories-mobile.png) · [Desktop design](../../review/proposed/categories-desktop.png) · [Phone design](../../review/proposed/categories-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=categories) · [Approved specification](../../../playgrid-premium-rest/categories/SPEC.md)

## Observed current state and scope

The working multi-answer form needs a calmer worksheet hierarchy and stronger saved-versus-final distinction. Review must explain duplicates/points without leaking private answers while editing.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/categories.js`; rules: `node-server/server/games/categories.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Keep Category Desk letter seal and five labeled rows. Save status and Done are distinct. Review shows the actual answers/eligibility and points in aligned rows; shared deadline remains visible.

## Controls and rules discoverability

Edit each field with preserved draft/caret, save through existing answers action and finalize with done:true. Final lock must follow myDone, not the click itself. Respect actual text limits; leave rejection editable.

Current action contract / source reference: `action:{type:"answers",answers}; same with done:true for final lock`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: five fields stack, Done reachable above safe area; form may scroll with keyboard open. Avoid sticky header covering the focused field. Saved caption is text, not a color dot alone.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Save indicator 120ms, accepted Done check 160ms, review rows appear as a group over 180ms. Sound: optional soft lock/review cue, no sound for every autosave. Reduced motion immediate rows.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: draft reconciliation, finalization and private review display. Engine change: none; category matching/duplicate scores stay server-owned.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting / transition | [Desktop + phone pair](../../review/states/categories/waiting.html) · [Source](index.html?state=waiting) | No eligible game view yet; existing room transition; Keep focus on the route heading; do not autofocus a game control. |
| Active play | [Desktop + phone pair](../../review/states/categories/active.html) · [Source](index.html?state=active) | The illustrated eligible local participant view; Preserve local input focus across timer/state refreshes. |
| Spectator | [Desktop + phone pair](../../review/states/categories/spectator.html) · [Source](index.html?state=spectator) | No participating local index / spectator role; Heading then public board/ledger; no private inputs in the tab order. |
| Invalid / unavailable | [Desktop + phone pair](../../review/states/categories/invalid.html) · [Source](index.html?state=invalid) | Known local constraint or existing authoritative notice; Keep focus on the originating control/input; associate the inline reason. |
| Reconnect / resync | [Desktop + phone pair](../../review/states/categories/reconnect.html) · [Source](index.html?state=reconnect) | Socket disconnected or room state not yet restored; Keep focus stable; do not move to a disabled game control. |
| Win / results · host | [Desktop + phone pair](../../review/states/categories/result.html) · [Source](index.html?state=result) | Actual room result, local host; never a guessed timer outcome; Result heading; then existing host result actions. |
| Result · participant | [Desktop + phone pair](../../review/states/categories/rematch.html) · [Source](index.html?state=rematch) | Actual result; participating non-host; Result heading; Ready for Rematch toggles aria-pressed; retain focus. |
| Done / read-only | [Desktop + phone pair](../../review/states/categories/locked.html) · [Source](index.html?state=locked) | myDone true; Fields readOnly; Done disabled; confirmation receipt remains. |
| Round answer review | [Desktop + phone pair](../../review/states/categories/review.html) · [Source](index.html?state=review) | phase=review and review.rows exists; Named review region/table; horizontal scrolling stays inside it. |
| Draft pending | [Desktop + phone pair](../../review/states/categories/autosave.html) · [Source](index.html?state=autosave) | Local debounce/send without final done; Never move focus or replace the active input node. |
| Long category / keyboard | [Desktop + phone pair](../../review/states/categories/long.html) · [Source](index.html?state=long) | Long category names from existing bank; Focus and caret survive; controls remain reachable above the keyboard. |

## Acceptance / priority

- **P0 functional parity:** Draft survives ticks/rejection; no premature final lock; no other answers before review; actual done flag controls input; points/review labels match authoritative evaluation.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
