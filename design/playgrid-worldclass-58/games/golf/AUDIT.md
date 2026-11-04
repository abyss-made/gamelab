# Mini Golf · Issue 58 delta audit

Priority **P0**. Current client reference **06609a4**. Approved composition **87d8b35**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/golf-desktop.png) · [Phone current capture](../../review/current-client/golf-mobile.png) · [Desktop design](../../review/proposed/golf-desktop.png) · [Phone design](../../review/proposed/golf-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=golf) · [Approved specification](https://github.com/abyss-made/gamelab/tree/codex/playgrid-premium-directions/design/playgrid-premium-games)

## Observed current state and scope

The current course geometry is legible but visually sparse, and the phone course loses scale in a wide rectangle. The approved Dogleg direction is substantially richer but previously illustrated one hole only. Existing game has 18 authored holes, not a free-form generated course.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/golf.js`; rules: `node-server/server/games/golf.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Extend the approved garden material system across all 18 actual holes. Included 36 new top-down SVG derivatives preserve every outline, wall, bumper, sand rectangle, water rectangle, tee and cup coordinate. Keep the approved Dogleg hero. Avoid isometric terrain or decorative obstructions that look collidable.

## Controls and rules discoverability

Drag toward the intended aim direction; adjust power 2–100%; Putt explicitly commits {type:putt,angle,power}. Add ±0.5° fine aim and keyboard equivalent. Label sand and water in rules; show a stroke receipt and why the ball returned after a water penalty. Never promise a full trajectory preview.

Current action contract / source reference: `{type:"putt",angle,power}`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: rotate the 700×440 presentation, inverse-map the input and keep scoreboard/cup labels upright in production. Maintain turn/stroke/par above the course, power and Putt below. Phone fine aim must not cover the ball or cup; secondary player totals can scroll.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

Use the server path for roll/bounce and settle, then cup ring 220ms or water ring 260ms. Scorecard waits for actual hole/round advance, no fake Next button. Sound: small putt click, gentle cup drop, soft water cue; muted by default until user activation. Reduced motion removes rings and highlights only the final position/penalty.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: SVG material layers over source geometry, portrait mapping, focus and path replay. Engine investigation: lip capture, bounce/roll friction and hazard timing must be isolated tests before any rules/physics change. Decorative depth never changes collision surfaces.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting | [Desktop + phone pair](../../review/states/golf/waiting.html) · [Source](index.html?state=waiting) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Active / controls | [Desktop + phone pair](../../review/states/golf/active.html) · [Source](index.html?state=active) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Spectator | [Desktop + phone pair](../../review/states/golf/spectator.html) · [Source](index.html?state=spectator) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Unavailable / invalid | [Desktop + phone pair](../../review/states/golf/invalid.html) · [Source](index.html?state=invalid) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Reconnect / resync | [Desktop + phone pair](../../review/states/golf/reconnect.html) · [Source](index.html?state=reconnect) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Result / host | [Desktop + phone pair](../../review/states/golf/result.html) · [Source](index.html?state=result) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Result / participant | [Desktop + phone pair](../../review/states/golf/rematch.html) · [Source](index.html?state=rematch) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Aim and power | [Desktop + phone pair](../../review/states/golf/aim.html) · [Source](index.html?state=aim) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Ball rolling | [Desktop + phone pair](../../review/states/golf/rolling.html) · [Source](index.html?state=rolling) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Existing sand | [Desktop + phone pair](../../review/states/golf/sand.html) · [Source](index.html?state=sand) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Existing water penalty | [Desktop + phone pair](../../review/states/golf/water.html) · [Source](index.html?state=water) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Hole complete | [Desktop + phone pair](../../review/states/golf/hole.html) · [Source](index.html?state=hole) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Scorecard | [Desktop + phone pair](../../review/states/golf/scorecard.html) · [Source](index.html?state=scorecard) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |

## Acceptance / priority

- **P0 functional parity:** All 18 source geometries match; Tour reuses the same holes; sand/water are visible and correctly labeled; new art never obscures legal path; no putt while rolling; stroke/par/cap and final totals match server; pointer mapping works in both orientations.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
