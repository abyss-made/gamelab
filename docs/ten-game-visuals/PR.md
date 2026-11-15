## Ten-game visual revision with actual before/after evidence

The earlier functional polish looked too similar to its baseline. This integrates both existing batches and implements new artwork, materials and layouts for Mini Golf, Pool, Property Tycoon, Go Fish, Ludo, Battleship, Color Stack, The Impostor, Chess and Drawing Telephone in the real multiplayer frontend.

Adds 39 original reusable SVG assets, twelve sculpted Chess pieces, original tool icons and new canvas table/course details. Desktop and phone compositions retain the tested controls, native coordinates, private-state boundaries and authoritative rules/physics. Pool includes a dedicated short-landscape shot layout; Ludo's compact phone roster keeps the dice controls visible.

Before evidence uses **ae3000a, the previous combined two-batch frontend**, rather than the older production branch. Random deals/names/roles differ. This branch includes both earlier batches; do not apply those branches again after this one.

![Ten actual desktop game screens](https://github.com/abyss-made/gamelab/blob/codex/playgrid-5-ten-game-visuals/docs/ten-game-visuals/overview-1440.jpg?raw=true)

![Actual Ludo phone comparison](https://github.com/abyss-made/gamelab/blob/codex/playgrid-5-ten-game-visuals/docs/ten-game-visuals/comparison-ludo-390.jpg?raw=true)

[All 126 full-size captures](https://github.com/abyss-made/gamelab/blob/codex/playgrid-5-ten-game-visuals/docs/ten-game-visuals/SCREENSHOTS.md) · [Desktop Pool comparison](https://github.com/abyss-made/gamelab/blob/codex/playgrid-5-ten-game-visuals/docs/ten-game-visuals/comparison-pool-1440.jpg) · [Claude handoff](https://github.com/abyss-made/gamelab/blob/codex/playgrid-5-ten-game-visuals/docs/ten-game-visuals/HANDOFF.md)

**All 37 package.json test programs pass, with zero failures, skips or startup errors.**

Real three-client browser flows pass across all ten games and three viewport sizes, including native touch, reconnect, reduced motion, real departure endings, promotion and drawing details. Final opening captures show no horizontal overflow/page errors. The comparison gallery loads all 120 image pairs. Ten actual-play WebMs and per-program logs are included.

Git-object comparisons confirm server/data, main controller, avatar system, Draw & Guess and Four in a Row are unchanged. No runtime dependency changes. Physical devices, Safari/Firefox and measured sustained frame rate remain untested; long/short views can scroll. Result captures represent actual departure/forfeit endings, not ten normal full-match wins.

No merge or deployment. Owner visual review is required before integration. Detailed validation and limitations: `docs/ten-game-visuals/VALIDATION.md`.
