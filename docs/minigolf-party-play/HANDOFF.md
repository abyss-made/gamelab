# Implementation handoff

Keep PR #79 stacked on PR #78. Do not merge or deploy without owner approval. This package extends the existing game rather than replacing the course rebuild or completed arena artwork.

## Authority and data

`public/js/games/golf-party.js` is a dependency-free shared module. Node uses its boost mechanic and factual finish/recap calculations; the browser uses its finish fallback. A boost tile has `{id,x,y,w,h,angle,speed}` in authoritative course coordinates. The ball's center must enter its painted rectangle while moving faster than six units/sec. Velocity is redirected along `angle` at `max(currentSpeed, speed)`. A per-simulation set allows each ball to use each tile once. Resting opponents do not activate tiles simply because another person putts.

All launches happen in the existing server physics step, after moving-arm collision resolution. No client action enables a boost or supplies tile geometry. Launches are timestamped `boost` entries in the existing bounded impact stream, with the tile ID. The 3D renderer and 2D fallback paint the same rectangles and arrow directions. Physics, sampled paths and scores stay authoritative on the server.

Gauntlet's next player is the next active seat after the person who just putted; finished/absent players are skipped. Initial honours still rotate per hole. Other courses keep their farthest-ball rule. The view exposes `turnOrder` and a stable `shotNumber`. Input during replay remains rejected by the server.

`anim.finishes` maps genuinely sunk player IDs to `{title,score,style}`. The style comes from that player's own recorded contacts on that finishing putt. `player.finish` persists only for the current hole; `summary` carries it into the recap. It resets on the next hole. `recap` computes actual leader IDs, margin, leader change and best-hole scores from completed, non-departed players. These are presentation data, not extra scoring.

## Presentation and lifecycle

`golf-arena.js` constructs the reusable turbo footprint, direction chevrons and a low-cost flash plane. Meshes remain essentially flush with the fairway and add no blockers. `golf-scene.js` consumes real impact events for flash/sound/particles. Reduced motion removes flashes and decorative effects but retains physical ball/arm motion and useful static trails. The existing mute setting covers the new sound.

The controller retains only the current player's most recent authoritative `anim.frames` on the current hole. “Your last shot” toggles that static path in either renderer; a live replay hides it. New-hole/unmount cleanup clears the data, and replacement line geometries are disposed. A page reload can recover an in-flight own shot; a completed path is not stored indefinitely in room history.

The controller also records the elapsed time when a shot first arrives. Effect playback uses that arrival stamp to skip pre-reconnect contacts. It catches up contacts delayed by a slow live frame once, with at most four effects per frame and one throttled sound. This preserves important turbo/arm feedback without producing an unbounded particle burst after a stall.

While a shot plays, player chips identify the actual shooter and do not reveal the next player's timer or premature cup result. The normal clock starts when controls unlock. The recap waits until `busyUntil` has elapsed, so it does not cover the last cup animation. It uses real names and scores, escaped through the existing app helper.

## Verify

From the repository root:

```sh
node node-server/test/golfgauntlet.js
node docs/minigolf-party-play/verify-preservation.js
node docs/minigolf-party-play/balance.js 3
node docs/minigolf-party-play/plan-match.js 3
node docs/minigolf-party-play/plan-match.js 6
python docs/minigolf-party-play/verify-rendering.py
PLAYWRIGHT_BROWSERS_PATH=/tmp/pg42-browsers python docs/minigolf-party-play/verify-input.py
PLAYWRIGHT_BROWSERS_PATH=/tmp/pg42-browsers python docs/minigolf-party-play/play-match.py
PLAYWRIGHT_BROWSERS_PATH=/tmp/pg42-browsers python docs/minigolf-party-play/test-suite.py
python docs/minigolf-party-play/verify-fallback.py
```

The browser cache override is specific to this environment; elsewhere install Playwright Chromium/FFmpeg normally. Python browser scripts launch `/usr/bin/chromium`. Run browser work serially on software GPUs.

`plan-match.js` and `balance.js` are explicitly offline rules-level automation using a fake clock. They are not human observations or a source of screenshots. `play-match.py` independently plays the planned legal inputs through actual controls in three normal browser clients, without injected state or skipped holes. Desktop and phone recordings use the real 3D renderer; the third seat explicitly tests the actual 2D fallback with the Three.js resource unavailable. `browser-probe.js` is read-only verification instrumentation and is never loaded by the production application. It observes the real recap DOM transitions so a brief card does not have to remain open while the test reads the other clients.

Serve the repository root and open `/docs/minigolf-party-play/` for the gallery. GitHub displays its source, not an executed HTML page. The screenshot index and videos can be reviewed directly on the branch.
