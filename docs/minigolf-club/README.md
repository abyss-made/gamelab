# Playgrid Mini Golf Club

A rebuild of the actual multiplayer game around **angled, live 3D courses**. The user approved replacing the earlier top-down requirement with angled 3D inspired by [Mini Golf Club](https://minigolfclub.io/).

[Open the screenshot viewer](index.html) · [Every capture](SCREENSHOTS.md) · [Implementation handoff](HANDOFF.md) · [Validation](VALIDATION.md)

- Real perspective camera, lighting and shadows; modeled stone walls, wooden obstacles, palm islands, bumpers, recessed cups, flags and dimpled balls.
- Follow the moving ball, see the full hole, rotate, zoom and recenter. Offscreen cup markers show the actual direction.
- Pull back from your ball and release to putt. Taps, Escape, touch cancellation, a second finger and resizing cancel safely. Sliders, fine aim and keyboard input remain available.
- Compact course HUD, actual player scores, collapsible scorecard and room/chat controls; responsive desktop and phone layouts.
- Six new original **Coastal Club** holes, now the default: Palm Promenade, Crate Escape, Lagoon Bend, Sandy Shortcut, Split Decision and Clubhouse Finish.
- All 24 established holes remain available and render in 3D. The original 18-hole tour is unchanged.
- Rolling follows the server's exact replay samples; cup drops, correct golf score announcements and completion confetti reflect actual outcomes. Reduced motion settles decorative animation and camera transitions.
- A working, explicitly labeled top-down compatibility renderer handles unavailable WebGL.

The existing Express + Socket.IO application still owns rooms, authentication, chat, rules, turns, scores and ball simulation. The 3D scene adds no client authority. Production assets are original; publisher screenshots are reference documentation only. Three.js is locally vendored with its MIT license and loads only when Mini Golf mounts.

## Review the actual app

Screenshots use **1440×900**, **390×844** and **932×430** viewports. The viewer offers all six new holes in follow/overview modes, actual play/results, and identical legacy-hole before/after comparisons. On GitHub, use [the PNG index](SCREENSHOTS.md); HTML is shown as source there.

```sh
python -m http.server 45410 --directory docs/minigolf-club
# Open http://localhost:45410 for the screenshot viewer.
```

To play the implementation locally:

```sh
cd node-server
npm ci
PORT=45450 npm start
```

Create a party and join it from a second browser/profile, select Mini Golf and start. Existing private-alpha authentication still applies when configured.

## Scope and remaining differences

This is an original Playgrid game inspired by the reference, not a copy of its artwork, Unity code, levels, economy or matchmaking. Its 3D presentation uses the established **server-authoritative planar physics**. Multilevel ramps, jumping/airborne ball physics and simultaneous free-for-all putting are not implemented. Playgrid's turn-based party rules remain.

Physical-device performance and Safari/Firefox still need verification. The package records what Chromium and actual Socket.IO clients verified; it makes no unmeasured FPS or visual-parity claim.

Branch: `codex/minigolf-club-rebuild`. This change is stacked on the ten-game scene branch / PR #77. Nothing has been merged or deployed.
