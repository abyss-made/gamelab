Selecting **Party Gauntlet** in Mini Golf’s lobby starts a new six-hole obstacle course: winding ribbon lanes, bounce gardens, alternate gate routes, slime shortcuts and a staggered finale. Coastal Club remains the default; existing courses and the original 18-hole tour are preserved.

Gates alternate after each putt, remain fixed during the server-authoritative replay, and stay open when occupied. Original arena meshes share the actual collision geometry. Existing multiplayer, touch/keyboard controls, cameras, rooms, chat and scoring are retained, with no new runtime dependency.

**Stacked on #78** (`codex/minigolf-club-rebuild`); this PR contains the additional course and its verification relative to that branch. Nothing has been merged or deployed.

Validation:

- All 38 package test programs have passing latest records. Initial reliability failures, the test-only heartbeat correction, and the successful 49-check rerun are documented in [VALIDATION.md](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-party-gauntlet/VALIDATION.md). Production connection settings are unchanged.
- A normal two-player browser match completed all six holes with 35 real putts, 12 cups, a verified slime penalty and a 15 / 21 result. All 17 gate replays matched across clients.
- Desktop 1440, phone 390 and landscape 932: real mouse/touch input, cancellation, reconnect, readable controls and no horizontal overflow. All 36 course meshes and camera mappings checked.
- [51 actual screenshots and four recordings](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-party-gauntlet/SCREENSHOTS.md), plus reusable verification scripts and an [implementation handoff](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-party-gauntlet/HANDOFF.md).

| Actual desktop | Actual phone |
| --- | --- |
| ![Ribbon Run desktop](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-party-gauntlet/screenshots/hole-01-follow-1440.png?raw=true) | ![Gatecrasher phone](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-party-gauntlet/screenshots/hole-03-follow-390.png?raw=true) |

The layouts/artwork are original and handcrafted. Gates are turn-based; courses use the existing flat physics plane with an angled 3D view. This does not add procedural generation, jumping or real-time moving sweepers.
