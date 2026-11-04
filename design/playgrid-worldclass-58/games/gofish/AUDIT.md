# Go Fish · Issue 58 delta audit

Priority **P0**. Current client reference **06609a4**. Approved composition **87d8b35**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/gofish-desktop.png) · [Phone current capture](../../review/current-client/gofish-mobile.png) · [Desktop design](../../review/proposed/gofish-desktop.png) · [Phone design](../../review/proposed/gofish-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=gofish) · [Approved specification](https://github.com/abyss-made/gamelab/tree/codex/playgrid-premium-directions/design/playgrid-premium-games)

## Observed current state and scope

Current hand and ask controls support the rules but players do not feel physically seated across the table. Opponent counts matter to memory play. The approved Marine Salon backs, local suit faces and table seats solve composition; completeness needs explicit ask and book feedback.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/gofish.js`; rules: `node-server/server/games/gofish.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Keep illustrated marine backs and visible card counts in every opponent seat. Local rank groups show real suits/counts, and completed books look distinct from a hand. Rank → player → Ask is one short visual sequence, with no hidden required second selection.

## Controls and rules discoverability

Only ranks you hold and other active players with cards are eligible. A face tap selects its rank, not an individual request card. Ask summary states target and rank. Emit {type:ask,target,rank} using numeric ranks (A=1,Q=12) and actual member IDs. Keep pending receipt, then transfer/draw/book only from the real view.

Current action contract / source reference: `{type:"ask",target,rank} (numeric ranks 1–13)`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: opponents stay at the upper edge with compact backs, local hand in a horizontally inspectable rank strip. Rank/target chips wrap with readable names; Ask remains at least 44px high. Long hands cannot cover the confirmation or book tally.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Deal backs at 60ms per card, visual budget 480ms. Ask has no artificial delay. Accepted transfer 180ms, book gathers 240ms, count updates once. Sound: paper slide, gentle draw, four-note book chime under 400ms. Reduced motion snaps cards and retains named rank/count receipt.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: held-rank eligibility, stable member selection and keyed hand/book layout. Engine change: none. No separate draw button, reset clock or invented reward; Go Fish draws occur inside the existing ask resolution.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting | [Desktop + phone pair](../../review/states/gofish/waiting.html) · [Source](index.html?state=waiting) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Active / controls | [Desktop + phone pair](../../review/states/gofish/active.html) · [Source](index.html?state=active) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Spectator | [Desktop + phone pair](../../review/states/gofish/spectator.html) · [Source](index.html?state=spectator) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Unavailable / invalid | [Desktop + phone pair](../../review/states/gofish/invalid.html) · [Source](index.html?state=invalid) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Reconnect / resync | [Desktop + phone pair](../../review/states/gofish/reconnect.html) · [Source](index.html?state=reconnect) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Result / host | [Desktop + phone pair](../../review/states/gofish/result.html) · [Source](index.html?state=result) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Result / participant | [Desktop + phone pair](../../review/states/gofish/rematch.html) · [Source](index.html?state=rematch) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Dealing | [Desktop + phone pair](../../review/states/gofish/deal.html) · [Source](index.html?state=deal) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Choose held rank | [Desktop + phone pair](../../review/states/gofish/rank.html) · [Source](index.html?state=rank) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Choose opponent | [Desktop + phone pair](../../review/states/gofish/target.html) · [Source](index.html?state=target) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Ask pending | [Desktop + phone pair](../../review/states/gofish/locked.html) · [Source](index.html?state=locked) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Go Fish draw | [Desktop + phone pair](../../review/states/gofish/draw.html) · [Source](index.html?state=draw) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Book complete | [Desktop + phone pair](../../review/states/gofish/book.html) · [Source](index.html?state=book) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Long hand | [Desktop + phone pair](../../review/states/gofish/long.html) · [Source](index.html?state=long) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Opponent turn | [Desktop + phone pair](../../review/states/gofish/opponent.html) · [Source](index.html?state=opponent) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |

## Acceptance / priority

- **P0 functional parity:** No absent-rank/self/empty-target asks; target persists through unrelated ticks; public counts accurate; opponents never get local rank/suit data; one accepted transfer creates one book animation; deck-empty and out states preserve watch view.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
