# Claude implementation handoff · Issue #61

**Design-only next increment. Not approved production code. Do not merge/deploy this design branch.** All new work is under `design/playgrid-61/`; existing app, homepage, server rules/protocol and earlier designs are unchanged.

## Read / review order

1. [README and actual screenshots](README.md), [character/foundation sheet](characters.html), [same-config before/after](style-delta.html), [identity contexts](contexts.html), [test scope](VALIDATION.md).
2. [ASSET-MANIFEST.json](ASSET-MANIFEST.json) source of truth; `avatar-studio/catalog.json` for rendering/fit; [AVATAR-CONTRACT.md](AVATAR-CONTRACT.md) for local state/schema/motion/server expectations; [COMPATIBILITY.csv](avatar-studio/COMPATIBILITY.csv) and [originality inventory](LICENSING-ORIGINALITY.md).
3. [20-game delta matrix and six exact interaction contracts](GAME-FEEL-DELTAS.md). Open [the live local component reference](game-feel/index.html); reviewer controls are separate from the proposed product component.

Serve from repo root using `python3 -m http.server 8765 --bind 127.0.0.1`, then `/design/playgrid-61/`. No new npm/runtime dependency is needed for previews. Existing Inter font and brand assets are reused.

## Source lock / no duplicate redesign

- Approved eight: `codex/playgrid-premium-directions @ 87d8b35`.
- Approved remaining: `codex/playgrid-premium-rest-design @ 71ca099`, including the full state library and implementation handoff. RPS is excluded from all new work.
- Broader #58 extension: `codex/issue-58-game-feel-avatar-studio @ f478a1e`.
- Current gameplay source reviewed: `codex/playgrid-2-redesign @ 06609a4`, latest remote at this audit. Check the latest branch before implementation; do not replace newer gameplay with older design-branch application files.

This package contains **32 refined additional bases + three home-family studies**, not 35 newly invented characters and not another 20-game screen pack. IDs a01–a32 are stable; renderer revision/catalog version changes. Draw & Guess and Four in a Row remain simplicity benchmarks and get no new dashboards.

## Priority order

### 1. Review art, integrate trusted avatar rendering

Compare the exact canonical hero with h01–h03 and all 32 additional bases at actual 24–48px sizes. **Remaining difference:** vector texture/pose does not perfectly reproduce the painted hero. Get owner style review before changing default avatars; never replace home art. Preserve all 24 original portrait choices and ten ring colors.

Port `renderer.js` behavior into the existing trusted avatar renderer (`main.js` avatarHTML/profile flow and relevant style scopes), using catalog allowlists and unique inline instance IDs. Use source SVGs for customization, default-look SVGs for sharp catalog display, and exported PNG/SVG choices for tiny lists. No image upload, arbitrary URL, user SVG/HTML or remote asset loader. Fallback is explicit, never a broken image.

### 2. Integrate creator behavior with local profile

Port the working Studio state pattern into the actual existing settings/profile UI; do not mount a standalone design demo as finished product. Keep current app navigation and private-alpha behavior.

- Config normalization and ≤256-byte serialization; migration/fallback per contract.
- Base, color, expression/eyes, compatible hat/glasses/accessory, signature detail.
- Randomize → Undo; Reset → Undo; bounded history32.
- Local draft independent of accepted/saved look; native Save confirmation; cancel/unsaved-exit recovery; storage and asset errors; dialog focus return.
- Cross-slot fit: headwear and headphones are mutually exclusive in this design. Keep headwear and normalize headphones to None; explain the change. No monetization/locked items.
- Responsive 1440×900, 390×844, 360×740, 768×1024 and 1024×768; keyboard tabs, visible focus, scrollable catalog/forms, safe-area Save, OS reduced motion.

Prototype key `pg_avatar_studio2_design_v1` is intentionally isolated. **Do not ship that key as a replacement for `pg_profile` without a reviewed migration.** Actual multiplayer profile remains unchanged by this source.

### 3. Scope backwards-compatible avatar synchronization

Current rooms normalization accepts `{e,c}` only. Proposed config v3/catalog2 does not sync today. Agree the optional field/event acknowledgement and rate limit as engineering work; retain e/c fallback for old clients. Server must allowlist fields, values, compatible combinations and byte size, validate member ownership, coalesce Save updates, reject raw markup/paths and return accepted config. No accounts. Exact schema and suggested limits are in AVATAR-CONTRACT.md. Tests must cover mixed old/new clients, unknown catalog, malformed input, reconnect and rejected saves. Do not silently change current socket payloads during a CSS port.

### 4. Finish the six highest-impact game interactions

Production locations: `node-server/public/js/games/{pool,colorstack,gofish,ludo,tycoon,golf}.js`, shared `common.js`, game styles; authoritative views in matching `server/games/*.js`.

**Pool:** preserve current keyboard/input/placement/path interpolation. Add only cue following/power retraction/release/pending visual contract. Portrait map must match current physical dimensions. The demo SVG margin is 50 units; the existing Pool canvas uses PAD=44. Pass the actual rendered projection into the helper, rather than copying demo padding into the canvas map. The mid-game demo omits ball-in-hand; preserve actual `place` on Shoot when g.inHand, with Lock remaining local UI state. No shot result before accepted state, no invented collision timestamps or physics parameter changes.

**Color Stack:** keyed numeric `data-card` nodes, roving inspect/long hand and stable wild choice; retain current draw/pass rules. Existing common focus keys lack `card`; add identity or use keyed preservation without breaking other games. One tick cannot clear a wild choice or fire an action. No Call UNO.

**Go Fish:** **correction to #58: ranks are 2–14, Ace=14**. Keep existing repainting clock guard. Preserve pending rank/target; animate only newly observed public books, seeded silently on initial/reconnect view. No text-log parsing, private transfer inference, automatic retry or new draw action. `BookLedger` is a reusable design reference for exactly-once observation, not a transport acknowledgement.

**Ludo:** shared-cell owner+number picker supplements movable list. `token` focus identity is absent from current helper; preserve it across refresh. Same die/real movable indices only; accepted roll/move animation already exists.

**Tycoon:** review the actual incoming offer ID with full give/get and projected cash; actual balances update only from view. If offer vanishes while open, disable Accept and keep dialog/focus. View has no expiry timestamp: no invented countdown or “expired” reason. Preserve automatic liquidation/bankruptcy; no new manual debt/loan feature.

**Mini Golf:** temporary thumb loupe mirrors actual 2D world; release/cancel cleans it; explicit Putt. Preserve 18 existing holes and approved top-down material package. No isometric camera, predicted trajectory, terrain/rule/physics change.

`game-feel/components.js` supplies keyed fan, book observation, coordinate/fine-aim helper and sampled-path test reference. Use minimal adapters inside existing lifecycle; don’t replace working helpers merely to import a demo. `fixtures.json` is offline arranged-state output, not production data. Reviewer buttons and draft logs must not enter the product.

### 5. Apply existing approved work to the other games

Follow the matrix and prior specifications. Battleship placement/precision, Chess promotion, Checkers forced chains, drawing/word/trivia/social private states are already designed. Integrate and verify those designs instead of commissioning a third look. No directions for RPS, Higher or Lower, Liar’s Dice, Hot Potato, Reversi or other removed/hidden games.

## Production completion / evidence required

- Run existing `npm test` in `node-server` plus targeted regressions for changed profile, focus and game interactions. The design package’s Chromium checks do **not** claim this production suite was run.
- Test real alpha login, room creation/join/leave, chat/settings, host/member/spectator, reconnect, actual game transitions/results/rematch and party-preserving switching in separate contexts. No regression to existing multiplayer.
- Test color-stack focus/wild across timer ticks; Go Fish Ace14/pending/duplicate snapshots; Ludo token identity; Tycoon stale offer; Pool/Golf portrait mapping/late replay and cancellation. Compare actual game screens with approved packages, not just these small component labs.
- Avatar: all 240 classic pairs; normalize/migrate/unknown future version; all allowed slots and denied/cross-slot combinations; IDs cannot collide in a lobby; Save/cancel/Undo/reset; storage/asset failure; no original-profile mutation until confirmed; mixed-client sync and fallbacks after engineering integration.
- Real iOS/Android touch + keyboard-open forms, 200% zoom, screen-reader/contrast measurement and low-end phone performance are still required. The local checks cover Chromium at the named sizes, not device/accessibility certification.
- Capture actual implementation desktop/mobile and report differences. Audio samples are not supplied; use existing licensed cues or original reviewed assets, user-gesture activation and persisted mute. Keep all information understandable without sound or motion.
- No merge, deployment or Render change. Return reviewable implementation screenshots and unresolved differences to the owner.

## Current delivered vs still conceptual

Delivered: editable assets/exports/manifests; functional local creator; state/error screenshots; six working local component references; unchanged-engine arranged fixtures; targeted tests and explicit acceptance instructions.

Not delivered/claimed: exact painted-texture reproduction, production avatar/profile/server changes, all games implemented, new sound recordings, completed multiplayer match/AI coverage, revised physics, real-device/accessibility certification or owner implementation approval.
