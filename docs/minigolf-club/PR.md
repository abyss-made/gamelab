Mini Golf previously presented a flat board inside the shared game interface. This rebuild turns it into an actual angled 3D course with a perspective camera, raised masonry, physical obstacles, textured turf, water, original palm islands, recessed cups, rolling balls and a course-first HUD.

The user explicitly approved replacing the earlier top-down requirement with angled 3D inspired by Mini Golf Club. Production models, materials and levels are original.

- Adds six original Coastal Club holes as the default; retains all 24 established holes and the unchanged original 18-hole tour.
- Adds pull-back/release shots, safe cancellation, genuine camera follow/overview/rotate/zoom/recenter, keyboard/fine aim, mobile layouts, scores and accessible room/chat controls.
- Preserves server-authoritative planar physics and sampled replays, rooms, authentication and backend infrastructure. Handles unavailable WebGL with a functioning, labeled compatibility renderer.
- Vendors one deliberate browser library, MIT-licensed Three.js, loaded locally on demand. No server dependency or runtime CDN added.

### Actual desktop and phone captures

![Actual desktop 3D Mini Golf](https://github.com/abyss-made/gamelab/blob/codex/minigolf-club-rebuild/docs/minigolf-club/screenshots/hole-02-follow-1440.png?raw=true)

![Same-course phone before and after](https://github.com/abyss-made/gamelab/blob/codex/minigolf-club-rebuild/docs/minigolf-club/comparison-390.jpg?raw=true)

[All six desktop](https://github.com/abyss-made/gamelab/blob/codex/minigolf-club-rebuild/docs/minigolf-club/coastal-1440.jpg) · [All six phone](https://github.com/abyss-made/gamelab/blob/codex/minigolf-club-rebuild/docs/minigolf-club/coastal-390.jpg) · [Every screenshot and recording](https://github.com/abyss-made/gamelab/blob/codex/minigolf-club-rebuild/docs/minigolf-club/SCREENSHOTS.md).

Before/after comparisons use the same established Meadow/Harbor geometry and starting state. The new Coastal Club is shown separately. The local screenshot viewer supports one hole at a time, follow/overview, three sizes, references and zoom: `python -m http.server 45410 --directory docs/minigolf-club`.

### Validation

All 37 package test programs have passing latest records. The initial full run passed 36/37; a five-browser reliability case timed out while separate GPU captures were running. The entire unmodified reliability program passed serially: 49 passed, 0 failed, including repeated game switching and resource cleanup. Initial logs and the successful rerun are retained.

Additional Chromium checks cover real mouse/touch input, cancellation, matching multiplayer replays, reconnects, six-player layouts, spectators, camera controls, reduced motion, remounts and no-WebGL recovery. Both players complete all six new holes through normal UI controls with a normal non-forfeit result; an intentional water shot verifies its real penalty. Renderer fixtures cover all 30 meshes and 2,424 inverse camera mappings. Desktop 1440×900, phone 390×844 and landscape 932×430 captures and four actual recordings are included.

[Validation / limitations](https://github.com/abyss-made/gamelab/blob/codex/minigolf-club-rebuild/docs/minigolf-club/VALIDATION.md) · [Implementation handoff](https://github.com/abyss-made/gamelab/blob/codex/minigolf-club-rebuild/docs/minigolf-club/HANDOFF.md).

Multilevel ramps, airborne physics, simultaneous free-for-all putting, the reference game's economy/matchmaking, physical-device performance and Safari/Firefox are outside the verified implementation. No commercial visual-parity or unmeasured FPS claim is made.

**Stacked on PR #77 / `codex/playgrid-standalone-game-scenes`. Draft for owner review. Nothing merged or deployed.**
