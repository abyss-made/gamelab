Party Gauntlet adds an original six-hole obstacle course to the angled Mini Golf rebuild: rotating turns, optional turbo routes, physical sweepers, bumpers and gates, actual shot trails and finish feedback. Coastal Club stays the default.

The latest follow-up makes first shots and continued play easier:

- **Tap the course to aim**, then choose power and Putt; pulling back from the ball still releases a shot. Mouse and native touch both work.
- **Scores & last hole** retains real finishes, avatars and standings after moving on. Back to course restores focus; the party keeps playing while someone reads.
- **Safe graphics recovery:** shots wait for an actually rendered current hole. Stalled graphics loading or lost WebGL falls back to the playable 2D renderer, cancels a held pull without a shot, and preserves room, identity and score. Late scenes are disposed after recovery or leaving.

**Draft, stacked on #78. Nothing merged or deployed.**

### Latest actual screenshots and recordings

- [All 21 desktop / phone / landscape captures](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-round-flow/SCREENSHOTS.md)
- Short real-time clips: [desktop aiming and explicit graphics recovery](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-round-flow/video/aim-recovery-desktop.mp4) · [phone saved recap](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-round-flow/video/scores-mobile.mp4). Full native recordings are included.
- [Interactive gallery source](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-round-flow/index.html): serve the repository root and open `/docs/minigolf-round-flow/`. GitHub does not execute HTML. Graphics-fault captures explicitly show compatibility mode.

| Actual desktop tap aiming | Actual phone last-hole recap |
| --- | --- |
| ![Desktop aim](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-round-flow/screenshots/tap-aim-1440.png?raw=true) | ![Phone recap](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-round-flow/screenshots/saved-recap-390.png?raw=true) |

### Current validation

- **38/38 package programs passing**, with no final failures or skips. Sixteen initial cloud browser-cache/startup blocks were repaired and rerun; original failed setup logs are retained. This is not a clean first-attempt run.
- **19 Gauntlet rules checks**; real-room mouse/native-touch checks at 1440×900, 390×844 and 932×430; actual graphics-loss, delayed-load and leave-during-load cases.
- Seven normal UI putts: one hole finishes 3 / 3, next-hole play continues while the saved recap remains open. No page errors.
- **94-putt, six-player, six-hole differential rules replay** matches previous physical frames, impacts, turns, scores and results. Courses, physics and artwork modules unchanged by this follow-up.
- Gallery image/link/filter and video playback verification passed at desktop/phone sizes.

[Current validation, setup-retry history and limitations](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-round-flow/VALIDATION.md) · [Implementation handoff](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-round-flow/HANDOFF.md).

These are automated tests, not human playtest feedback. Physical phone/Safari testing and first-time-player observations remain outstanding. Flat authoritative physics with angled rendering is retained; this adds no jumping or vertical physics.

### Earlier six-hole course implementation and evidence

Each friend gets one putt before the next active player. Turbo tiles launch a moving ball once per tile per putt; sweepers and launches are simulated by the server. Existing five courses and the original tour retain their geometry and physical behavior. Actual own-shot trails, factual finish celebrations and delayed-frame impact feedback are included. No runtime dependencies added. Backend auth/security/logging/health/shutdown remain preserved.

[Prior full-course evidence](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-party-play/SCREENSHOTS.md) includes all six holes, desktop/phone recordings and the earlier normal three-browser 47-putt match (18 cups, results 15 / 15 / 17). [Prior handoff and validation](https://github.com/abyss-made/gamelab/blob/codex/minigolf-party-gauntlet/docs/minigolf-party-play/VALIDATION.md) remain available at their original source snapshot.
