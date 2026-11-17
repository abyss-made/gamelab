Party Gauntlet gives Mini Golf an original six-hole obstacle course with rotating party turns, optional turbo shortcuts, physical sweepers, bounce gardens, alternate gates and slime routes. This update makes the course more interactive while preserving the angled rebuild, Playgrid identity and existing multiplayer system. Coastal Club remains the default.

Each friend gets one putt before the turn passes to the next active player. Four lime turbo tiles launch moving balls along their painted arrows; they activate once per tile per ball per putt and do not slow a faster shot. The server simulates both launches and moving-arm collisions. Existing gates switch after shots and remain fixed during replay.

“Your last shot” shows your own actual sampled path, helping you learn banks and shortcuts. Finish celebrations identify genuine bank, multi-bank, sweeper, bumper and turbo finishes without awarding extra points. Recaps show real leaders and lead changes after the last ball has finished. The rolling player stays highlighted and the next displayed turn clock waits for the replay to end.

The original arena artwork, rounded rails, robot crowd/mascot, impact sounds and cup effects are retained. Turbo meshes match their authoritative rectangles in both renderers; mute and reduced motion are respected. No new runtime dependency. The five established courses and original 18-hole tour retain their geometry and physical behavior; other games and backend security/auth/logging/health/shutdown are preserved.

Live impact feedback now catches up after a slow frame with at most four effects per frame, preserving important contacts and avoiding duplicates. Reconnecting players still skip contacts that happened before their arrival. This addresses the effects disappearing during browser testing when a frame missed the previous short playback window.

**Draft, stacked on #78 (`codex/minigolf-club-rebuild`). Nothing merged or deployed.**

### Review the actual game

- [Screenshot and recording index](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-party-play/SCREENSHOTS.md): all six holes, desktop 1440 and phone 390, plus landscape, native touch, turbo shots, actual trails and normal results.
- Real-time excerpts: [desktop turbo route](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-party-play/video/turbo-desktop.mp4) · [phone turbo finish](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-party-play/video/turbo-finish-mobile.mp4). Full native desktop/phone match recordings are included.
- [Before/after gallery source](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-party-play/index.html). Serve the repository root and open `/docs/minigolf-party-play/` to browse one hole or all six at matching viewport/camera. GitHub does not execute the HTML.

| Actual desktop | Actual phone |
| --- | --- |
| ![Actual Ribbon Run turbo route](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-party-play/screenshots/hole-01-overview-1440.png?raw=true) | ![Actual Victory Lap](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-party-play/screenshots/hole-06-follow-390.png?raw=true) |

### Verification and limits

- **38/38 package test programs passed**, without failed checks, skips or startup errors. Backend/browser reliability passed 374/49 checks; the Pool/Golf/Tycoon rules/browser batches passed 274/140.
- A normal three-browser match completed six holes with **47 real putts, 18 cups, five turbo launches, nine motor contacts and a 15 / 15 / 17 result**, without stroke-limit pickups. It verified native touch, exact last-shot samples, rotating turns and all six actual recaps on desktop/phone. Desktop and phone use 3D; the third seat explicitly tests the real 2D compatibility renderer.
- The final banner/recap CSS correction then passed a fresh **140-check browser batch** and a re-recorded full match with clear recaps on both devices.
- **17 Gauntlet rules checks**, all 36 render fixtures, delayed-frame/reconnect effect fixtures, and desktop/phone/landscape native input checks passed. The original five courses retain bit-identical physical paths in 300 old/new comparisons.


[VALIDATION.md](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-party-play/VALIDATION.md) contains the completed run results, actual match data, per-program logs and limitations. [HANDOFF.md](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-party-play/HANDOFF.md) describes the mechanics, data contracts, lifecycle and reproducible checks.

Automated matches and input-noise probes are **not human playtest feedback**. First-time players and physical-phone/Safari observations remain outstanding. The game retains flat server physics with an angled 3D view; this does not add jumping, vertical ramps or procedural generation. Sweepers are powered during putts and park afterward.
