# Validation and limits

Production-source snapshot: **5fa16390038a1d3219705cc337ceece0072227c8**. Evidence/documentation commits follow it without changing the game implementation.

## Automated programs

All **37 programs from `node-server/package.json`'s `test` script have passing latest results**, with zero failed assertions, skipped checks or startup errors in those latest records. [Latest records](test-results/suite.json) · [Initial full-run records](test-results/initial-suite.json).

The initial serial full run passed 36/37. `batch2ui` found that the last card in a long Color Stack hand was partially clipped by scrolling/snap behavior. The production fix removes snap and adds scroll inset. That program then passed in full; its original failing log is retained as `batch2ui-initial.log`. `batch5ui` and `design31ui` were also rerun after affected changes; their final logs and rerun records are retained. This is not a claim that the initial run was clean.

Coverage includes alpha authentication, gameplay rules, multiplayer, room lifecycle, security/safety, reliability, bots, lexicon, keyboard controls, Draw & Guess, Four in a Row, and existing UI suites. The runner executes every listed program even if an earlier one fails, and records exit codes.

## Actual browser work

Python Playwright with system Chromium; viewports **1440×900**, **390×844**, **932×430**. Additional touch input uses Chromium's CDP touch events in touch-enabled contexts. No fake game-state injection is used by these new scenario/capture tools.

- [First five](first/browser-checks.json): real Go Fish asks/books/transfers, Ludo server rolls/legal movement, Pool shot/motion, Golf strokes/hole progression, Tycoon actions; reconnect identity, reduced motion, departure result and fresh match for each.
- [Second five](second/final-second.json): Battleship desktop/touch fleet dragging and explicit Fire through hits/sinking; Color Stack select/play/draw; Impostor concealment, clues, confirmed votes and reveal; Chess mouse/touch/capture/promotion/focus; Telephone prompt/drawing/guess/reactions/reveal.
- Final focused reports: [Pool](first/pool-final.json), [Tycoon](first/tycoon-final.json), [Battleship](second/naval-final.json), [Telephone](second/telephone-final.json), [final landscape Ludo/Tycoon](first/landscape-final.json), [final Chess](second/chess-final.json). Telephone's final fixture correctly uses the actual `hostUpdate` settings event.
- [Maximum-party checks](stress/checks.json): Go Fish 6 players, Color Stack 8, Ludo 4, Tycoon 6 and Impostor 10, at all three sizes: **15 views**. Long card/opponent strips remain reachable. No horizontal page overflow or page exceptions.
- [Opening capture checks](screenshots/after/capture.json): all ten × three sizes, zero page exceptions/overflow. Short-landscape Chess/Ludo/Tycoon boards must retain at least 300px width; this caught and corrected excessive height-based shrinking. Phone Tycoon roster was visually corrected after an overflow-only check failed to expose tall letter wrapping.
- [Existing Canyon course](screenshots/details/course.json): three supplemental views of the actual Canyon Run / S-Bend setting; same existing server geometry.
- [Gallery checks](test-results/gallery.json): image loading, viewport dimensions, controls, references, zoom and navigation.

[All screenshot links](SCREENSHOTS.md) · [First-five videos](first/video/index.json) · [Second-five videos](second/video/index.json).

Captures are actual viewport screenshots. Before and after use random live deals and turns, so they are not identical-state pixel tests. Before is the previous visual revision `600d87b`. After Pool uses the actual shooter with cue-ball placement locked. Capture composition sheets resize images and add labels outside them; they do not repaint gameplay.

Result screenshots exercise real departure/forfeit endings. They do not establish that every normal win permutation was played end-to-end in the visual harness; rules/outcomes are additionally covered by the automated gameplay programs.

## Preservation and assets

[Git-object preservation](test-results/preservation.json) verifies the entire backend and data, main frontend routing, avatar source, Draw & Guess, Four in a Row, package manifest and lock against production `8846f15`. This retains security, logging, health, shutdown and gameplay authority. [Asset integrity / JavaScript syntax](test-results/assets.json) checks all 57 new scene assets and game modules. No runtime dependency was added.

## Remaining limits

These are original fixed 2D/2.5D scenes with pre-rendered geometry; they are not full live 3D replicas of 8 Ball Pool, Chess Ultra or Marmalade MONOPOLY. Their publisher art is only a reference. No spin/English physics was invented for Pool; Golf remains top-down with existing courses. Shared Playgrid navigation/chat remain around each game.

Physical phone/tablet hardware, Safari/Firefox, a device-specific performance/FPS audit, and every cosmetic permutation remain unverified. Long/short viewports can require vertical scrolling rather than shrinking boards or covering controls. Visual quality still needs the owner's screenshot review; passing tests is not a claim of commercial visual parity.
