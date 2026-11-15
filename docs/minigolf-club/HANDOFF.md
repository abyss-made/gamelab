# Mini Golf implementation handoff

Branch: `codex/minigolf-club-rebuild`. Base: `codex/playgrid-standalone-game-scenes` (PR #77). Keep this as a separate review of the Mini Golf rebuild; it already contains the parent branch. No merge or deployment is authorized by this package.

## Runtime structure

| File | Responsibility |
| --- | --- |
| `node-server/public/js/games/golf.js` | Native game lifecycle, authoritative replay interpolation, real mouse/touch/keyboard intents, camera controls, scores, chat/room controls and compatibility renderer. |
| `node-server/public/js/games/golf-scene.js` | Original procedural Three.js scene: course meshes, camera, projection/raycasting, balls, labels, materials, decorative animation and disposal. |
| `node-server/public/minigolf-club.css` | Scoped Mini Golf play surface, HUD, controls, overlays and mobile layouts. |
| `node-server/server/games/golfcourses.js` | Six new Coastal Club holes; the original courses and tour stay intact. |
| `node-server/server/games/golf.js` | Adds/sanitizes the Coastal setting and selects it by default; simulation and authority remain unchanged. |
| `node-server/public/js/main.js` | Mini Golf's catalog description and course picker only. |
| `node-server/public/js/rules/rules-c.js` | Documents pull/release and safe cancellation. |
| `public/assets/golf-club/` | Five original tiling materials and the original compatibility-view palm SVG. |
| `public/vendor/three/` | Pinned Three.js 0.160.1 browser module and MIT license; no runtime CDN or server dependency. |

The page loads the scene factory before the native golf renderer. The factory dynamically imports the local Three.js module only when Mini Golf mounts. If WebGL cannot initialize, the controller replaces the canvas, binds the real controls to a clean 2D context, and explicitly labels compatibility mode.

## Contracts

- World X/Z maps exactly to server X/Y, offset by `(350, 220)`. Heights are presentation. Never simulate a separate client ball trajectory.
- Ball positions interpolate `g.anim.frames` and other moving-ball paths. Include reconnect `elapsedMs`; do not restart animation on every room update.
- Turf, obstacles, water, cup and bumpers derive from the same authoritative hole definitions. Water and cups are actual mesh cutouts. Boundary walls stand outside the collision plane so their inner face matches it.
- Pointer input raycasts the actual current camera onto the course plane. `GameUI.golf.project(x,y,elevation)` is the inverse projection used by input and browser verification.
- A pull starts near the player's ball, captures the pointer, derives aim/power from drag displacement, and emits one normal `putt` intent on deliberate release. Tapping, Escape, pointer cancellation, secondary touch and resizing never submit a shot.
- Dragging elsewhere adjusts aim without shooting. Right-drag changes the camera; buttons and keyboard camera commands also work while spectating.
- Preserve the existing fine-aim sliders, Putt button, optional tee placement and all server validation. The aim guide is directional assistance, not a predicted simulation.
- Follow mode tracks the moving player until the replay ends, then the actual turn. Overview frames the entire hole; manual zoom and rotation work in both modes. Camera labels/pressed states must stay synchronized, including Home/recenter.
- Screen labels use text nodes; native score/name markup uses the existing escaping helpers.
- Dispose course geometry and private materials on hole changes. Dispose textures, scene overlays and the renderer on unmount. Guard async scene creation after the originating root has been removed.
- Shadows for the static scene are baked per hole; moving balls use light contact shadows. Pixel ratio is capped, and small-screen shadow maps are reduced. Decorative water/flag motion and camera easing honor reduced motion.
- Water penalties, stroke limits and course results are server outcomes. Do not infer a win from a visual cup animation. Golf score announcements distinguish birdie, eagle and albatross.

## Reproduce assets

```sh
python docs/minigolf-club/build-textures.py
```

This uses deterministic original procedural materials, with no source photographs. Palm/obstacle/ball geometry is authored in `golf-scene.js`. The SVG is source artwork. Publisher images live only in this documentation folder.

Three.js module SHA-256: `3e690ac7d180b0aadf0891bea39eec643e29e2d3e75c99b18689518665f69ba6`. Its source/version/license are retained in the vendor README. The application package manifest and lock remain unchanged.

## Tests and captures

```sh
cd node-server
npm test
```

From the repository root, with Python Playwright/system Chromium available:

```sh
python docs/minigolf-club/verify-rendering.py
python docs/minigolf-club/verify-input.py
python docs/minigolf-club/verify-extras.py
python docs/minigolf-club/play-course.py
python docs/minigolf-club/encode-recording.py
python docs/minigolf-club/capture-legacy.py after /workspace/gamelab
```

Legacy test programs bind fixed ports and must run serially. The evidence runner retains each program's actual exit code/log, including failures. This workspace uses a local Playwright browser-cache mapping to system Chromium and ffmpeg; those are test environment details, not production dependencies.

The full-course browser harness chooses shots with the real server physics, then enters angles/power through native UI controls. It never injects match state or skips turns/animation. Renderer unit fixtures are separate from actual game screenshots and are explicitly labeled.

For original before captures, use a separate checkout at `b4a7e9d8960d6387a0af19519f9f2c019d83f794` and run `capture-legacy.py before <checkout>`. Never regenerate before images from this branch. Existing before PNGs preserve the same Meadow/Harbor geometry, player names and opening state used for the after comparisons.

Test updates retain the known Meadow hole-in-one regression by explicitly selecting that legacy course. The UI test now verifies actual angled 3D projection/cancellation instead of requiring the old portrait rotation. Geometry/solvability tests cover all 30 holes; the original tour stays at 18. See VALIDATION.md for the final records and device limits.

The published full-course MP4 is codec-compressed from the genuine browser WebM, preserving native dimensions, frame rate and duration. The encoding manifest retains checksums and probes. PNG screenshots are not repainted or transcoded.
