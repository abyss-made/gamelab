# Pool · Issue 58 delta audit

Priority **P0**. Current client reference **06609a4**. Approved composition **87d8b35**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/pool-desktop.png) · [Phone current capture](../../review/current-client/pool-mobile.png) · [Desktop design](../../review/proposed/pool-desktop.png) · [Phone design](../../review/proposed/pool-mobile.png) · [Local state/interaction explorer](../../explorer.html?game=pool) · [Approved specification](https://github.com/abyss-made/gamelab/tree/codex/playgrid-premium-directions/design/playgrid-premium-games)

## Observed current state and scope

The current phone table remains landscape and small above a large Aim/Power panel. Ball-in-hand instructions and two similar lock/shoot controls compete. The current client and server already supply shot sampling and valid placement, so physics quality cannot be inferred from a static screenshot.

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/pool.js`; rules: `node-server/server/games/pool.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

Keep approved walnut rails and readable numbered solids/stripes. Give the table the dominant area, rotate its presentation on phones, and keep controls close. Aim direction must be clear without promising a perfect prediction. Group badges, remaining balls, foul reason and whose shot are persistent.

## Controls and rules discoverability

Drag on cloth to set angle, adjust power 3–100%, then Shoot. Fine buttons and Left/Right change 0.5°, Shift changes 5°. In ball-in-hand, drag cue to a valid location then Lock cue ball locally. Shoot carries {type:shoot,angle,power,place}; Lock is not a separate network action. The server remains the collision/placement authority.

Current action contract / source reference: `{type:"shoot",angle,power,place?:{x,y}}; {type:"resign"}`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

Phone: inverse-transform portrait table coordinates to the exact 1000×500 simulation. Keep numbers upright; input only on the visible image/canvas, not wrapper. Fine aim prevents tiny-screen precision failure. Cues/labels explain solids and stripes without color alone.

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

While sampled balls move, gate all shot input; interpolate the existing time-sampled path instead of replaying guessed physics. Cushion tick follows an actual collision event if available; otherwise omit it. Pocket sound only after accepted pocket data. Reduced motion: preserve ball movement needed to understand play, offer a quick final-state view without camera shake.

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

Client engineering: portrait coordinate mapping, pointer capture, stable aim/power, bounded placement affordance. Separate engine investigation: tunneling, cushion restitution, pocket capture and sample cadence need reproducible physics tests; no numeric retuning is approved by this design.

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
| Waiting | [Desktop + phone pair](../../review/states/pool/waiting.html) · [Source](index.html?state=waiting) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Active / controls | [Desktop + phone pair](../../review/states/pool/active.html) · [Source](index.html?state=active) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Spectator | [Desktop + phone pair](../../review/states/pool/spectator.html) · [Source](index.html?state=spectator) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Unavailable / invalid | [Desktop + phone pair](../../review/states/pool/invalid.html) · [Source](index.html?state=invalid) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Reconnect / resync | [Desktop + phone pair](../../review/states/pool/reconnect.html) · [Source](index.html?state=reconnect) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Result / host | [Desktop + phone pair](../../review/states/pool/result.html) · [Source](index.html?state=result) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Result / participant | [Desktop + phone pair](../../review/states/pool/rematch.html) · [Source](index.html?state=rematch) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Aiming | [Desktop + phone pair](../../review/states/pool/aim.html) · [Source](index.html?state=aim) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Balls in motion | [Desktop + phone pair](../../review/states/pool/resolving.html) · [Source](index.html?state=resolving) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Ball in hand | [Desktop + phone pair](../../review/states/pool/ballinhand.html) · [Source](index.html?state=ballinhand) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Foul / next turn | [Desktop + phone pair](../../review/states/pool/foul.html) · [Source](index.html?state=foul) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Opponent turn | [Desktop + phone pair](../../review/states/pool/opponent.html) · [Source](index.html?state=opponent) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |
| Resign confirmation | [Desktop + phone pair](../../review/states/pool/resign.html) · [Source](index.html?state=resign) | Illustrative fixture; see INTERACTION.md for authoritative mapping; Stable focus and eligibility from actual game view |

## Acceptance / priority

- **P0 functional parity:** Pointer and keyboard select equivalent angles; portrait and landscape target the same point; cue placement stays inside and clear of balls; first lock does not emit shoot; one Shoot sends exactly once; no aiming controls while resolving; scratch/illegal 8-ball results come from engine.
- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.
- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.
- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.
