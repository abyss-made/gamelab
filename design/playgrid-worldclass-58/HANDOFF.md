# Claude implementation handoff · Issue #58

**Ready for design review. Nothing in production is implemented by this package.** Branch `codex/issue-58-game-feel-avatar-studio`; all changes are under `design/playgrid-worldclass-58/`. Do not merge/deploy from this handoff. Issue #57 remains the separate approved eight-game implementation task; Issue #59 owns RPS removal.

## Start here

1. Open [the review gallery](index.html), [Avatar Studio](avatar-studio/index.html), [32-character sheet](avatar-studio/character-review.html), [priorities](PRIORITIES.md) and [validation limits](VALIDATION.md).
2. For each game, open **Current vs proposed**, then its audit and state explorer. Actual current client screenshots come from the local working app, not from old design HTML. Proposed frames are local design fixtures, not completed multiplayer gameplay.
3. Read [shared input/motion/audio rules](SYSTEM.md) and [Avatar production integration](avatar-studio/HANDOFF.md). The 20 per-game `AUDIT.md` files are the concrete delta to approved art, with controls, responsive rules, motion, engineering boundaries and acceptance.

Serve from repository root: `python3 -m http.server 8765 --bind 127.0.0.1`, then open `http://127.0.0.1:8765/design/playgrid-worldclass-58/`. Do not expose a test server publicly. The ZIP includes the minimal canonical public assets at the same paths so an extracted package can be served identically.

## Source order / preserve approvals

- Working gameplay reference: **`codex/playgrid-2-redesign @ 06609a4`**, checked at audit time. `main @ 04faf50` was older. Start implementation from the latest gameplay branch; do not replace it with this design branch or cherry-pick old game logic.
- Eight approved compositions: **`codex/playgrid-premium-directions @ 87d8b35`**. Reused under `reference/eight/` solely for portable review. Issue #58 adds interactions, completeness and geometry coverage; it does not re-approve or compete with them.
- Remaining approved directions: **`codex/playgrid-premium-rest-design @ 71ca099`**; source folder `design/playgrid-premium-rest/`. Twelve apply after excluding RPS. Reference helpers/styles/assets are included here; the original per-game specifications remain useful and linked.
- Registry at audit: 25 registered, 21 selectable including RPS. Scope is **20 selectable games after excluding RPS**. Higher or Lower, Liar's Dice, Hot Potato and Reversi stay hidden; no new design exposes them.
- Current homepage/hero/portrait assets are canonical. No new homepage, route shell, auth flow or navigation direction is proposed.

## What is new in this package

- 20 current-state audits based on source and fresh real desktop/mobile client captures.
- 247 major-state references with desktop/phone screenshot pairs; additional 360px layout guard. State fixtures are independent illustrative moments, not replay sequences.
- Interaction prototype layer: Pool/Golf aim and power including portrait inverse transforms; Pool local placement lock; Color Stack inspect/selection/draw/wild draft; Go Fish rank/target ask draft; Ludo roll/token intent; Battleship chart tabs and precise coordinate fire draft; Chess legal-fixture move/promotion/draw/resign drafts; Tycoon buy/bid/build/trade-review drafts. Remaining controls expose local selection/text drafts. All stay local; no game socket or fake result.
- 36 top-down Golf SVG derivatives for all 18 actual holes, plus exact source geometry snapshot. The approved Dogleg hero stays. Tour uses the same holes. Decorations do not add collisions.
- 32 distinct original modular character SVGs, 32 transparent thumbnails, 12 layers per asset, module anchors, compatibility CSV, 24 preserved classic choices with all ten classic accent/ring colors, functional local Studio, tiny 24/32/48px contexts and reaction previews.

## Important accuracy corrections

- Color Stack color action is `r/b/g/y`, not full CSS names. Card IDs and real ranks stay authoritative. No new Call UNO.
- Go Fish uses numeric ranks 1–13 and actual target member IDs. Asking resolves any required draw internally; no separate draw action.
- Pool Lock cue ball is **local UI state**, not a wire action. Shoot includes `place` while ball-in-hand. Simulation is 1000×500, ball radius 12.5.
- Golf presentation is 700×440 and always top-down 2D. Rotation maps visual input back into unchanged geometry.
- Battleship FLEET order: Carrier 5, Battleship 4, **Cruiser 3**, Submarine 3, **Destroyer 2**. Older approved art's 3-cell “Destroyer”/2-cell “Patrol” labels are corrected in this extension; use existing silhouettes as visual aliases without changing lengths.
- Chess promotion key is **`promo`**, values **`Q/R/B/N`**. Do not ship a lowercase `promotion` field.
- Tycoon has **36** tiles. Its current engine **automatically liquidates upgrades and then bankrupts an insufficient payer**. The debt state here is an explanatory payment receipt. A manual debt timer, bankruptcy button or loan is a new engine design, not approved. Do not copy an old static concept's implied manual action.

## Implementation sequence

1. Baseline current alpha login, party creation/join, rooms, chat, game switching and current tests. Preserve all game settings and mount/update/unmount/result contracts.
2. Add shared focus-preserving input, selection/commit, receipt, reduced-motion and optional sound preference primitives inside the existing application. No new framework or dependency is required.
3. Finish P0 game interaction parity, using the [priority matrix](PRIORITIES.md). Port approved art into real SVG/canvas components; do not mount an iframe/static mockup as the game.
4. Apply P1 material/motion/details and remaining smaller-game polish. Draw & Guess and Four in a Row only get selective improvements.
5. Integrate reviewed avatars using trusted packaged assets. Current server only accepts `{e,c}`; v2 sync is a separate reviewed compatibility change. Preserve classic fallback and no-account flow. See avatar handoff for exact proposed schema/limits.
6. Only after design review and implementation scope: add separately justified engineering changes. Pool/Golf physics need reproducible tests, not subjective “feels better” parameter edits.

## Integration completion gate for Claude

- All 20 audits' functional/visual checks pass against **actual** room views and actions, including spectators, invalid input, reconnect, result, rematch and party-preserving switch.
- Use separate browser contexts for real host/participants and targeted privacy assertions. Local fixture peers in this design audit do not prove completed multiplayer matches or working AI.
- Exercise actual mobile touch/keyboard, desktop keyboard, 200% zoom, screen-reader paths and contrast; test orientation and keyboard-open forms. No early secret information in DOM/URLs/accessibility names.
- Run `npm test` in `node-server` and appropriate targeted regressions. The design author has not claimed a production-code regression run; unchanged production code was only exercised for baseline captures.
- Capture actual implementation at 1440×900/390×844 for all games and major states. Compare against this package and approved predecessors side-by-side. Document measured gaps. Static prototype screenshots are not acceptable substitutes for implemented-site evidence.
- No merge, deploy or live Render change. Return screenshots and differences for the owner's review.

## Deliberate remaining limitations

The new SVG characters use the same chibi proportions, navy clothing, dark ink, glossy eyes and neon rim vocabulary, but **their cleaner vector finish does not exactly reproduce the painted home hero**. Review the sheet beside the canonical illustration before replacing any avatar defaults. Original home art remains unchanged. Real iOS/Android, full screen-reader/contrast certification, production game interactions, audio samples, server/avatar synchronization and physics refinements are not delivered by this design package. Complex fleet placement, full Tycoon asset management and live drawing are specified/illustrated states, not complete game engines in these local previews.
