# Word Chain · Issue 58 delta audit

Priority **P1**. Current client reference **06609a4**. Approved composition **71ca099**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/wordchain-desktop.png) · [Phone current capture](../../review/current-client/wordchain-mobile.png) · [Desktop design](../../review/proposed/wordchain-desktop.png) · [Phone design](../../review/proposed/wordchain-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=wordchain) · [Approved specification](../../../playgrid-premium-rest/wordchain/SPEC.md)

## Observed current state and scope

The last-word-to-next-letter rule is mechanically simple but context can get lost in a panel. Prior entries, elimination and active-player identity deserve more explicit hierarchy.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/wordchain.js`; rules: `node-server/server/games/wordchain.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Keep Chain Letterpress: latest word large, required leading letter as a persistent tile, earlier chain below. Own action is clear; non-turn participants can read without an input suggesting they can play.

## Controls and rules discoverability

Type a word beginning with the actual required letter. Submit via Enter. Keep rejected text with repeated-word/wrong-letter feedback when locally knowable; no local dictionary authority. Out players get watch mode, not an input that silently fails.

Current action contract / source reference: `action:{type:"word",word}`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: current word and letter above input, chain in scrollable history below. Use semantic list, labeled input and polite one-time turn notice. Keep submitted words readable under zoom.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Accepted word attaches in 180ms, active seat changes once. Sound: subtle typebar success, short turn cue only for local turn. Reduced motion static list append; no typewriter text.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: keyed history/input, turn gating and error association. Engine change: none; word eligibility, duplicates, timeouts and elimination unchanged.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting / transition | [Desktop + phone pair](../../review/states/wordchain/waiting.html) · [Source](index.html?state=waiting) | No eligible game view yet; existing room transition; Keep focus on the route heading; do not autofocus a game control. |
| Active play | [Desktop + phone pair](../../review/states/wordchain/active.html) · [Source](index.html?state=active) | The illustrated eligible local participant view; Preserve local input focus across timer/state refreshes. |
| Spectator | [Desktop + phone pair](../../review/states/wordchain/spectator.html) · [Source](index.html?state=spectator) | No participating local index / spectator role; Heading then public board/ledger; no private inputs in the tab order. |
| Invalid / unavailable | [Desktop + phone pair](../../review/states/wordchain/invalid.html) · [Source](index.html?state=invalid) | Known local constraint or existing authoritative notice; Keep focus on the originating control/input; associate the inline reason. |
| Reconnect / resync | [Desktop + phone pair](../../review/states/wordchain/reconnect.html) · [Source](index.html?state=reconnect) | Socket disconnected or room state not yet restored; Keep focus stable; do not move to a disabled game control. |
| Win / results · host | [Desktop + phone pair](../../review/states/wordchain/result.html) · [Source](index.html?state=result) | Actual room result, local host; never a guessed timer outcome; Result heading; then existing host result actions. |
| Result · participant | [Desktop + phone pair](../../review/states/wordchain/rematch.html) · [Source](index.html?state=rematch) | Actual result; participating non-host; Result heading; Ready for Rematch toggles aria-pressed; retain focus. |
| Opponent turn | [Desktop + phone pair](../../review/states/wordchain/opponent.html) · [Source](index.html?state=opponent) | turnId differs from local ID; Disable local word form; preserve draft if policy allows. |
| Life lost / new turn | [Desktop + phone pair](../../review/states/wordchain/life.html) · [Source](index.html?state=life) | Accepted server lives/turn change after timeout; Announce lives and next turn once; do not restart the deadline. |
| New chain start | [Desktop + phone pair](../../review/states/wordchain/deadletter.html) · [Source](index.html?state=deadletter) | Server clears chain / first becomes true; Focus input only on a newly eligible local turn. |
| Out / watching | [Desktop + phone pair](../../review/states/wordchain/out.html) · [Source](index.html?state=out) | Local lives is zero; Remove actionable word input; preserve public chain/history. |

## Acceptance / priority

- **P0 functional parity:** Wrong-turn input unavailable; rejection retains draft; required letter matches last word; real accepted chain only; eliminated participant retains party/chat; no fake dictionary correction.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
