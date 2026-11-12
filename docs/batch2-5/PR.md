## Playgrid 5.0 Batch 2 — five premium game upgrades

Battleship gains real mouse/touch fleet dragging, validity previews, deliberate Fire and public missile/hit/miss/sinking effects. Color Stack gains confirmed card/draw motion, safer explicit Play, exposed card hit areas and accessible wild choice. Impostor gains private-role concealment, phase treatment and explicit vote confirmation. Chess gains precise dragging, capture/check feedback, recent observed captures and accessible promotion. Drawing Telephone gains a stable navigable sketchbook reveal, precise brush mapping and a phone layout that keeps Done and core tools accessible.

Real renderer/control code was tested and committed one game at a time. This branch starts from production `8846f15` and is independent of unmerged Batch 1. No server/dictionary/scoring/physics/networking, main-controller, avatar, Draw & Guess or Connect 4 changes. No runtime dependencies. Shared helper/style are isolated to this batch. Existing mute controls/synthesized sounds remain in use.

Validation: all 37 test programs pass, zero skips/startup errors. Real three-client checks cover all five games at 1440×900, 390×844 and 932×430, plus mouse/touch, reconnect, reduced motion, public results, legal promotion, confirmed votes and drawing/reactions. Includes 66 actual screenshots and five gameplay recordings. Exact evidence and limits: `docs/batch2-5/VALIDATION.md`.

Claude integration instructions: `docs/batch2-5/HANDOFF.md`. Keep both batches' helper/style includes and each game's script cache versions when resolving index.html; preserve Claude's unrelated reliability/dictionary work. Batch 1 changes a different set of game modules.

Limits: no measured physical-device FPS claim; Safari/Firefox remain untested. Telephone navigation is restricted to revealed current-chain contributions, and refresh still discards an unsubmitted draft. Recent Chess captures are observed transitions rather than fabricated full history. Detailed chains/long hands/short viewports may scroll.

Do not merge or deploy automatically.

[All before/after comparisons](https://github.com/abyss-made/gamelab/blob/codex/playgrid-5-batch-2/docs/batch2-5/SCREENSHOTS.md) · [Actual gameplay videos](https://github.com/abyss-made/gamelab/tree/codex/playgrid-5-batch-2/docs/batch2-5/video).

![Battleship desktop](https://github.com/abyss-made/gamelab/blob/codex/playgrid-5-batch-2/docs/batch2-5/screenshots/played/battleship-1440.png?raw=true)

![Telephone phone drawing](https://github.com/abyss-made/gamelab/blob/codex/playgrid-5-batch-2/docs/batch2-5/screenshots/played/telephone-drawing-390.png?raw=true)
