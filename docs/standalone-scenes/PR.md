The previous visual revision left too much of each game looking like the same themed interface. This branch rebuilds ten existing game scenes around their boards, cards, pieces and native controls, using original modeled artwork inspired by the reference titles.

Mini Golf, Pool, Property Tycoon, Go Fish, Ludo, Battleship, Color Stack, The Impostor, Chess and Drawing Telephone now have distinct scenes. The branch also includes the preceding five-game/Batch 2 interaction work. Everything runs inside the existing Express + Socket.IO application.

- 53 original Blender-rendered PNGs and 4 SVGs: physical chess pieces, pawns, ships, cars, upgrade buildings, billiard spheres, card backs, materials and garden miniatures. Build source included.
- Rebuilt table/board presentation, actual table-side Pool power, physical card hands with stable selection/scrolling, touch fleet placement, public meeting composition, drawing workspace and game-specific results.
- Preserves backend/data, routing, avatar source, Draw & Guess, Four in a Row, manifest and lock against production `8846f15`. No runtime dependency added.

### Actual before/after captures

Before is the previous visual revision `600d87b`; after source is `5fa1639`. These are live app captures, with random hands/turns. Pool after uses the actual shooter with cue placement locked. Results in the gallery are real departure outcomes.

![Pool desktop before and after](https://github.com/abyss-made/gamelab/blob/codex/playgrid-standalone-game-scenes/docs/standalone-scenes/comparison-pool-1440.jpg?raw=true)

![Ludo phone before and after](https://github.com/abyss-made/gamelab/blob/codex/playgrid-standalone-game-scenes/docs/standalone-scenes/comparison-ludo-390.jpg?raw=true)

[All ten desktop](https://github.com/abyss-made/gamelab/blob/codex/playgrid-standalone-game-scenes/docs/standalone-scenes/overview-1440.jpg) · [All ten phone](https://github.com/abyss-made/gamelab/blob/codex/playgrid-standalone-game-scenes/docs/standalone-scenes/overview-390.jpg) · [Every screenshot / video](https://github.com/abyss-made/gamelab/blob/codex/playgrid-standalone-game-scenes/docs/standalone-scenes/SCREENSHOTS.md)

The review viewer supports one-by-one/all-ten comparisons, three viewport sizes, played/results states, zoom and attributed publisher references. To use it locally: `python -m http.server 45410 --directory docs/standalone-scenes` and open `http://localhost:45410`.

### Validation

All 37 package test programs have passing latest results. The initial full run passed 36/37: a real long-hand scrolling failure in `batch2ui` was fixed in production CSS, then the full affected program passed. Initial failure logs and reruns are retained. Final affected `batch5ui` and `design31ui` runs also passed.

Additional real-browser mouse/touch scenarios cover all ten games, reconnects, reduced motion and outcomes at 1440×900, 390×844 and 932×430. Maximum-party checks cover 15 game/viewport combinations. 146 actual game screenshots, ten gameplay videos, preservation/asset checks and a tested comparison viewer are included. [Detailed evidence and limits](https://github.com/abyss-made/gamelab/blob/codex/playgrid-standalone-game-scenes/docs/standalone-scenes/VALIDATION.md) · [Handoff](https://github.com/abyss-made/gamelab/blob/codex/playgrid-standalone-game-scenes/docs/standalone-scenes/HANDOFF.md).

These are fixed 2D/2.5D scenes, not full commercial live-3D replicas. Golf stays top-down with existing geometry; Pool has no unsupported spin control. Physical devices, Safari/Firefox and measured FPS remain unverified. Owner visual review is still required.

**Draft for review. No merge or deployment performed.**
