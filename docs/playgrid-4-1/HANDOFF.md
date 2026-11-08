# Playgrid 4.1 — Issue #70

**Integration update:** Production PR #72 is merged into this feature branch. See [PR #73 integration](integration-pr73/README.md) for current base, conflict resolution and combined validation. The original gameplay scope and limits below remain applicable.

Production implementation on `codex/playgrid-4-1-experience`, based on `a81444b4afc59bfbe1bf83213ba5f6fc4dd7ac76` of `codex/playgrid-2-redesign` (merged #68). Target the same branch for review. #66 remains superseded.

## Delivered

- Compact navy/lime party invitation using the existing three home characters, saved identity, complete character editor, one join action, and authoritative party code. Returning players edit their name directly or open customization. Invite viewing does not consume a seat. No invented host/count preview.
- Worked examples for all 20 visible games in the shared lobby. Existing rules, advisory ready controls and host start remain accessible. Expandable instructions do not start a hidden countdown.
- Telephone chain-length, draw/write timer and prompt-source settings, curated/custom seeds, server sanitization and bounded round/completion reporting. Generated entries cannot earn participation points or likes.
- Independent secret Impostor selection each round, clearer private role/word panels, and end-of-round vote breakdown. Repeat assignments are possible; pre-reveal views keep roles, words and ballots private.
- Bluff uppercase entry values, server answers/options and revealed answers, retaining duplicate merging and case-insensitive checks.
- Categories server legitimacy checks, common inflection duplicate keys, factual proper-name lists and aliases, and explicit invalid-answer explanations in review. Hot Potato now rejects unknown words/phrases without extending its fuse. Existing Word Chain/Scramble dictionaries remain authoritative.
- Go Fish public request/outcome events and animations, with no private drawn card exposed. Reconnect seeds the event sequence rather than replaying old transitions. Completed-book feedback and reduced-motion support remain available.
- Dots & Boxes vivid player colors, edge patterns, numbered keys and box owner initials/numbers; capture and extra-turn feedback and accessible line-owner labels.
- Mini Golf distinct safe tee spawns, optional first-stroke tee placement (pointer and keyboard), deterministic multi-ball collisions, synchronized replay paths, slopes, and six original Harbor Links holes. Original 18-hole tour retained. Still 2D top-down; existing portrait rotation and inverse input mapping preserved.
- Tycoon compact status, map-first layout and collapsed properties/trades/log. Incoming trades open the relevant panel. Existing auctions, property controls and trade confirmation remain functional.

## Shared contracts and Claude coordination

No changes to room lifecycle, Socket.IO handlers/architecture, authentication, logging, deployment configuration or bot policy. These changes are confined to game modules/data, gameplay UI, invitation markup/CSS, rules, and validation. Integrate with Claude's #69 through the contracts in [CONTRACTS.md](CONTRACTS.md). Preserve the merged #68 classic Dice invite identity fix. Visual verification reproduced a remaining 932×430 expanded Draw & Guess grid overlap on the untouched #68 base; this branch adds a narrow CSS correction and checks that the word bar is unobscured and the canvas starts below it. Notify Claude on #69 that this specific remaining layout defect is handled here.

`index.html` versions changed frontend modules to `41-1` so existing browser caches request the new assets. No dependency or environment-variable changes. No database migration. Existing partial Telephone settings merge onto defaults. For a future approved deployment, in-flight games run entirely in server memory; use the platform's normal process-restart policy.

## Review and limitations

Read-only Codex review found and fixed Categories terminal-S name/brand corruption, country-alias initial-letter validation, and Golf placement remaining disabled after a replay because of a stale busy snapshot. Each has regression coverage. Browser comparison also fixed the legacy four-pixel landscape shell overflow and the reproduced drawing-grid overlap.

Proper-name lists are authored factual examples, not an exhaustive world encyclopedia. Country/City/name categories require a listed recognized name (with documented aliases). Other creative Categories and Hot Potato prompts check English-word/name legitimacy; the group must judge semantic fit. A real but off-topic answer is not rejected by an automated meaning classifier. Creative drawing prompts and invented Bluff answers intentionally accept original phrases. Word Chain's explicit dictionary-off house mode still delegates legitimacy to players.

Golf uses deterministic fixed-step 2D arcade physics: friction, restitution, terrain drag, slope acceleration, water and equal-mass ball contact. It has no spin, airborne/3D ramps or external physics dependency. Shots are bounded to 16 simulated seconds. Unplayed tee balls are protected circular obstacles; on-course balls can be moved or holed. An opponent knocked into water returns safely without a penalty to that opponent. Tee selection remains optional so existing controls/bots work from valid separated defaults.

See [VALIDATION.md](VALIDATION.md) for test evidence and [SCREENSHOTS.md](SCREENSHOTS.md) for real browser comparisons. No merge, deployment or real ads were performed.
