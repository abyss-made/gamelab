# Implementation handoff

This updates `codex/minigolf-party-gauntlet`, the existing draft PR #79, stacked on PR #78. Do not merge this stack or deploy it without the owner’s approval.

## Motion and authority

`public/js/games/golf-motion.js` is a dependency-free shared module, usable in Node and the browser. It defines capsule geometry, the cosine drive curve, contact resolution relative to a moving surface, clearance checks and replay-clock mapping. Phase advances during the putt and parks afterward. A complete powered cycle lasts 2.4 seconds; a shot with no remaining simulated balls can finish sooner.

`server/games/golf.js` simulates moving arms at the existing 240Hz step. The opt-in `keepAwake(t)` hook in `physics.js` keeps the simulation alive while a motor can still push a resting ball. Pool and other callers retain their previous behavior. Impacts are timestamped on the server, limited to 64 records per shot, and sent with sampled ball paths. `anim.motion` gives the start, active duration and final phase; `hole.motorTime` gives the parked phase. `anim.sunkIds` identifies genuine cup completions, including a ball knocked in by another player.

`golfcourses.js` contains sweepers on Bounce Boulevard, Gatecrasher, Pinch Point and Victory Lap. Their full envelopes stay clear of tees, cups and static blockers. Pinch Point replaces its old switching gate with a sweeper and moves two bumpers to maintain a usable bypass. Other Gauntlet gates retain their alternating behavior and occupied-lane protection. Existing courses and the original tour retain their geometry.

## Presentation and controls

- `golf-arena.js` constructs original reusable meshes, canvas textures, signs, mascot and instanced crowd. Decoration stays outside the playable polygon or above ball height. Signs and texture resources are cached/disposed with the scene.
- `golf-scene.js` places arms using the shared motion clock; clients never decide collisions. Impacts are consumed from authoritative replay events. Late connections avoid replaying old decorative impacts. Moving arms and balls use inexpensive contact shadows; static arena shadows remain cached. Gates refresh their shadows during transitions.
- Reduced motion disables particles, cushion bounce and decorative motion. Actual ball/obstacle motion remains visible because it communicates the playable state. Audio respects the existing mute setting.
- The camera holds its target/distance during aiming and settles on turn handoff during the existing post-shot pause. It holds the last visible ball position when a ball disappears into a cup/hazard.
- The phone Aim button reveals the existing precise range and fine-step controls. Pull-to-putt, keyboard shortcuts, cancellation, camera controls, scores and chat remain available. The compatibility renderer uses the same arm geometry and clock.

## Reproduce verification

From the repository root:

```sh
node node-server/test/golfgauntlet.js
node docs/minigolf-gauntlet-polish/verify-preservation.js
node docs/minigolf-gauntlet-polish/balance.js 7
node docs/minigolf-gauntlet-polish/balance.js --slime-probe
PLAYWRIGHT_BROWSERS_PATH=/tmp/pg42-browsers python docs/minigolf-gauntlet-polish/play-course.py
python docs/minigolf-gauntlet-polish/verify-rendering.py
PLAYWRIGHT_BROWSERS_PATH=/tmp/pg42-browsers python docs/minigolf-gauntlet-polish/verify-input.py
PLAYWRIGHT_BROWSERS_PATH=/tmp/pg42-browsers python docs/minigolf-gauntlet-polish/test-suite.py
```

The browser path override is specific to this cloud environment; elsewhere install Playwright Chromium/FFmpeg normally. Python scripts launch `/usr/bin/chromium`. GPU-heavy browser tests must run serially in software-rendered environments.

`browser-probe.js` is read-only test instrumentation loaded only into verification contexts. It records the actual scene’s transforms/events; it does not change game state, physics, clocks or rendering arguments. The connection-drop test uses actual Socket.IO disconnect/connect calls scheduled on receipt of a motion replay, so automation latency cannot turn it into an after-the-fact reconnect. Full page reload is checked separately.

`balance.js` uses real game-rule actions with a fake clock solely for offline difficulty probing and planning legal test inputs. `play-course.py` must independently replay those inputs through real UI controls in a normal two-browser match. It never injects server state or skips turns/holes. `--fast` skips the multi-viewport photo collection, not gameplay.
