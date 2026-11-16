Selecting **Party Gauntlet** in Mini Golf starts an original six-hole obstacle course with winding lanes, slime shortcuts and alternate gate routes. This update adds physical rotating sweepers to four holes, a floating festival arena, authoritative impact feedback and improved phone aiming. Coastal Club remains the default; the original five courses and 18-hole tour are preserved.

Sweepers accelerate and brake during each putt for up to 2.4 seconds, can push a placed opponent's ball, and park before the next turn. Shared capsule geometry and motion clocks keep server collisions, the 3D scene and the 2D compatibility renderer aligned. Existing gates alternate after putts and stay open when occupied. Impact sounds, rings, cushion reactions and cup celebrations use actual server events and respect mute/reduced motion.

Original artwork includes rounded foam rails, textured court panels, branded signs, robot spectators and mascot, floating islands and a sky backdrop. Phone controls keep power/Putt visible and provide precise aim through a 44px Aim button. The camera now remains stable while aiming and settles before turn controls unlock. No new runtime dependencies.

**Stacked on #78** (`codex/minigolf-club-rebuild`). This remains a draft for owner review. Nothing has been merged or deployed.

### Actual implementation evidence

- [All screenshots and recordings](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-gauntlet-polish/SCREENSHOTS.md): 55 native captures at desktop 1440, phone 390 and landscape 932, including all six holes, impacts, held touch, slime and normal results.
- Short real-time motion clips: [desktop](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-gauntlet-polish/video/highlight-desktop.mp4) · [phone](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-gauntlet-polish/video/highlight-mobile.mp4). Full normal-match recordings and codec/source hashes are included.
- [Interactive before/after gallery source](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-gauntlet-polish/index.html): serve the repository root and open `/docs/minigolf-gauntlet-polish/` to browse one hole at a time or all six at matching viewport/camera. GitHub does not execute this HTML preview.

| Actual desktop | Actual phone |
| --- | --- |
| ![Gatecrasher desktop](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-gauntlet-polish/screenshots/hole-03-overview-1440.png?raw=true) | ![Gatecrasher phone](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-gauntlet-polish/screenshots/hole-03-follow-390.png?raw=true) |

### Validation

- **38/38 package test programs passed in one fresh serial run**, with zero failures, skips or startup errors. Backend reliability: 374 checks; browser reliability: 49/49. [Full results and limitations](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-gauntlet-polish/VALIDATION.md), verbatim per-program logs and reproducible scripts are included.
- **11 Gauntlet rules checks**, including 2,400 motor-phase putts, safe motor envelopes, opponent-ball collisions and deterministic results. Existing golf rules/UI passed 274/136 checks. All 36 render fixtures passed, including reduced motion and camera mapping.
- A normal two-player browser match completed six holes with **29 real putts, 12 cups, one verified slime penalty and a 14–16 result**, without stroke-limit pickups. All 18 motor-shot and ten gate replay checks matched across clients. Native touch, active-motion transport reconnect (941ms), full page reload, cancellation, chat and scores passed.
- The opt-in shared-physics hook preserved bit-identical legacy results in 120 differential cases. Existing game modules and authentication/security/logging/health/shutdown files remain unchanged.
- Seven automated difficulty matches: 83 cups/one cap across 84 player-holes. **These are not human playtests.** [Human feedback checklist](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-gauntlet-polish/PLAYTEST.md) remains outstanding, as do physical-phone/Safari observations.

[Implementation handoff](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-gauntlet-polish/HANDOFF.md). The course remains handcrafted with flat server physics and an angled 3D view; this does not add jumping, vertical ramps or procedural generation.
