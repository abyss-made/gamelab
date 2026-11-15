# Validation and visual evidence

Comparison baseline: combined previous Batch 1 + Batch 2 frontend, `ae3000a`. Production preservation baseline: `8846f1514b2bbb8e807ba1b3954e136327b27fa4`. Final source snapshot is recorded in `screenshots/after/capture.json`; later documentation commits contain the evidence.

## Automated suite

**All 37 package.json test programs pass, with zero failures, skips or startup errors.**

The serial runner executes every command in the package.json test script, including gameplay, private-state safety, multiplayer, avatars, keyboard, responsive UI, bots, lexicon, logging/health/shutdown and reliability. It treats missing browser executables and occupied-port startup errors as failures even when an old test process returns zero. [Per-program exits and durations](test-results/suite.json) · [Aggregate](test-results/final-summary.json). PASS-line totals are not counts of individual assertions.

## Browser interaction checks

Three independent real client identities; real server actions; 1440×900 desktop, 390×844 phone and 932×430 landscape; identity reconnect, reduced motion and actual departure-result screens for every game. No JavaScript page errors in the completed runs.

- [First five games](first/browser-checks.json): direct Go Fish card/rank selection, target and Ask; actual transfers and a completed book; server dice/legal Ludo movement; actual Pool/Golf placement and shots; Tycoon dice and contextual purchase when available. All five also exercise a fresh match after departure.
- [Second five games](second/browser-checks.json): native mouse/CDP touch Battleship fleet dragging and rotation, explicit Fire and public hits/sunk ship; Color Stack select/Play or actual draw, conditional wild cancel; Impostor concealment without timer reset, legal clues, discussion and confirmed vote/reveal; Chess mouse/touch drag, capture and legal promotion with keyboard focus/Escape; Telephone real prompt/drawing/guess chain and stable reveal/reaction navigation.
- Final targeted checks: [Ludo phone layout](first/final-ludo.json), [Pool landscape layout](first/final-pool.json), [Battleship chart/layout](second/final-battleship.json), [Chess board/promotion](second/final-chess.json).

The first harness had a development-time Ludo race: it read a guest's previous turn phase after the host advanced. It now waits for that client's confirmed turn/roll/event state before acting; the complete run and focused final run passed. This changed the harness, not gameplay rules. The gallery's initial file-URL load was blocked by managed Chromium policy; serving the existing evidence over localhost succeeded.

## Visual evidence

**126 actual PNG captures**: 30 previous openings, 30 final openings, 30 played views, 30 actual departure-result views, 3 Chess promotion views and 3 Telephone drawing views. [Full-size index](SCREENSHOTS.md) · [Before metadata](screenshots/before/capture.json) · [After metadata](screenshots/after/capture.json).

All 30 final opening views report zero horizontal overflow and no page errors. Ten valid WebM recordings show actual play and viewport changes: [first five metadata](first/video/index.json), [second five metadata](second/video/index.json). Composite JPGs add labels outside the original screenshots only.

The [comparison viewer](index.html) was opened in Chromium over localhost; **120 game/viewport/state pairs** loaded both full-size images with no page errors. [Gallery verification](test-results/gallery.json). Optional drawing/promotion detail falls back to the normal opening view for other games.

Direct screenshot inspection led to actual fixes: desktop Golf grid placement, Pool's modeled pockets/cushions and adjacent shot desk, compact phone Ludo roster, short-landscape Pool controls, Chess board/player fit, private-role word size, Tycoon tile wrapping/cash contrast, primary targeting chart placement and old-theme specificity overrides.

## Preservation and practical limits

[Git-object comparison](test-results/preservation.json) verifies the entire server/data tree, main controller, avatar module, Draw & Guess and Four in a Row are identical to production. The production branch was fetched again and remained at 8846f15. All 39 SVGs parse; all 11 new/changed renderer/helper JavaScript files pass syntax checks. No package or lockfile changes and no new runtime dependencies.

These checks use Chromium on Linux, including native CDP touch events. Physical devices, Safari/Firefox and sustained 60 FPS performance remain untested. Phone and short landscape pages can scroll vertically. Tycoon is a compact board overview with full selectable deed details. Normal full-match wins are not claimed by the departure-result captures. Random cards, roles and names differ across before/after captures.

Private-state boundaries, native coordinate/physics mapping and server authority remain intact. Existing limitations remain: an unsent Telephone drawing is lost on refresh; recent Chess captures show observed transitions rather than reconstructed history. No merge or deployment was performed.
