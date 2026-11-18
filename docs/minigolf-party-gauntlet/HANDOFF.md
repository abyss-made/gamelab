# Implementation handoff

The feature is implemented in `node-server`, building on `codex/minigolf-club-rebuild` (PR #78). This branch is stacked on that unmerged work; retain that dependency when integrating.

## Rules and rendering

- `server/games/golfcourses.js`: `gauntlet` contains six original hole definitions. Existing course objects and the original 18-hole tour are unchanged.
- `server/games/golf.js`: the settings allowlist accepts `gauntlet`. `gateStates(hole, shot, players)` resolves shot parity and safe occupancy. Closed gate polygons join the actual physics walls. Accepted putts freeze their gate states into `anim.gates`; `hole.gates` describes the next putt’s state. Players, spectators and reconnecting clients receive the same geometry and replay. The shared Pool/Golf physics module is unchanged.
- Gate definitions have an ID, parity phase and polygon. Current gates are rectangles; safe closure uses their bounds plus a 7-unit ball clearance. Keep a permanent bypass and keep gates away from the tee/cup when authoring additional holes.
- `public/js/games/golf-scene.js`: arena surfaces, foam walls, stacked bumpers, gate panels, recessed slime pools, checker cup surrounds and external arena props are original meshes. Physical footprints match server geometry. Raised gates move above ball height; they never slide through a rolling ball. `data.animating` selects the shot’s saved gate geometry until the replay ends, then shows next-turn gates. Reduced motion snaps the presentation to the correct state. Shadows refresh only during gate transitions.
- `public/js/games/golf.js`: existing controls are retained. The 2D compatibility renderer draws the same open/closed gates and hazards. A course hint explains shot-switch gates. The previous course’s theme restores when switching games/courses.
- `public/js/main.js`: real lobby course picker. `public/minigolf-club.css`: scoped hint styles. `public/index.html`: golf asset cache versions updated.

A fuzz check also exposed rounding a resting ball onto an inclusive water boundary. The position serializer retains the exact safe position only when rounding would make it illegal. This preserves a legal next putt without changing the shared physics integrator.

## Verification

From the repository root:

```sh
node node-server/test/golfgauntlet.js
python docs/minigolf-party-gauntlet/verify-rendering.py
PLAYWRIGHT_BROWSERS_PATH=/tmp/pg42-browsers python docs/minigolf-party-gauntlet/play-course.py
# Or replay the previously verified native actions in a fresh real match:
PLAYWRIGHT_BROWSERS_PATH=/tmp/pg42-browsers python docs/minigolf-party-gauntlet/play-course.py --replay
PLAYWRIGHT_BROWSERS_PATH=/tmp/pg42-browsers python docs/minigolf-party-gauntlet/verify-input.py
PLAYWRIGHT_BROWSERS_PATH=/tmp/pg42-browsers python docs/minigolf-party-gauntlet/test-suite.py
```

The `/tmp/pg42-browsers` override is specific to this verification environment. Elsewhere, install Playwright’s Chromium/FFmpeg normally. Python browser scripts launch `/usr/bin/chromium`; adjust that executable if needed. They start and stop their own local development servers; they do not access production.

- The standard package suite includes `test/golfgauntlet.js`. Existing count assertions now correctly describe 36 holes across six courses.
- `test/golfgauntlet.js` checks real closed/open collisions, deterministic replays, safe gate closure, six safe tees per hole, 960 additional fuzz putts over both gate states, the slime-edge regression, out-of-turn/busy rejection and consistent spectator gate states.
- `verify-rendering.py` uses explicitly labeled renderer unit fixtures for all 36 holes: camera inverse mapping, overview framing, cup/water cutouts and finite meshes. These fixtures are not used for gameplay screenshots.
- `play-course.py` uses two actual browser clients, real controls, a search helper that calls authoritative physics to choose shots (or the saved native action sequence with `--replay`), and normal turn/hole progression. It records all six holes, gate replay equality, an intentional slime penalty, and a normal final result. It never sets game state or advances server time.
- `verify-input.py` exercises real mouse/CDP touch at all three viewport sizes, cancellation, secondary-touch cancellation, a held pull and single release, matching opponent replays, scorecard/chat toggles, and reconnect identity/stroke preservation.

Keep GPU-heavy browser tests serial in software-rendered cloud environments. Run the full suite after the screenshot/input harnesses finish. See `VALIDATION.md` for initial failures and isolated rerun records; do not discard failing logs.
