# Implementation handoff

## Review scope

Production source: `8b1310448a9a6df951821a920fd33f055058e6e8`. This adds aiming, recap persistence and graphics recovery to the already implemented Party Gauntlet; it does not replace its boards or physics. PR #79 remains a draft stacked on #78, branch `codex/minigolf-club-rebuild`.

## Controls

`public/js/games/golf.js` converts a short course tap into an aim angle using the existing camera projection. Under 12px of pointer travel counts as a tap. It sends no shot and preserves selected power. Dragging from the ball still releases a shot; the existing sliders and keyboard controls remain available. Tapping the ball does not shoot. Rules text describes both paths.

## Saved hole

`server/games/golf.js` exposes `view.lastHole`, a compact snapshot containing hole index, name, par, completed summary and recap. While finishing, it becomes visible only after the authoritative replay finishes. On advancing, that completed snapshot survives the next hole and its shots. No sampled replay frames or room internals are retained in it. A new match starts with `null`.

The finish summary freezes departure state, so a later disconnect cannot retroactively change the finish classification. This metadata does not modify strokes, physics, turn timing or scores. The controller uses real avatars and escaped names and renders the most recent completed-hole card in the existing score details. Historical lead/tie text is explicitly about that hole. The Back button closes details, scrolls to the arena and focuses the canvas; it does not pause the round.

## Render lifecycle

The controller's `renderReady` gates Putt, tee placement and trail controls. It becomes true only after the current hole has actually drawn in 3D or 2D. `aria-busy`, status text and the loading label reflect this state. Each new hole waits for its own frame.

An owned generation token and six-second timer guard the pending scene factory request. The timer is cleared when the factory resolves, rather than timing out a successfully loaded scene in a background tab. A real canvas `webglcontextlost` event or pending-request timeout cancels any pull, removes old scene DOM/listeners, replaces the canvas and draws with the existing 2D renderer. Selected aim, power, room, identity and scores are retained; recovery emits no shot. Restore focus only when the lost canvas had focus. Failure to obtain either graphics context leaves controls disabled with an explanatory status.

Late scene results are disposed after recovery or unmount; they cannot replace the active renderer or resurrect the game after leaving. Unmount clears timers and loss listeners. The six-second timer applies to the scene request, not every asset, GPU stall or network condition.

## Files and compatibility

Only `index.html`, the golf controller, scoped Mini Golf CSS, golf rules text, golf server metadata and `test/golfgauntlet.js` change. Cache keys for changed frontend resources are `round-flow-1`. Physics, course geometry, motion, scene, arena artwork and party effects modules remain byte-identical to the previous PR snapshot. No dependencies or production configuration changes.

Use [VALIDATION.md](VALIDATION.md) to reproduce checks. Keep this as part of PR #79; do not independently merge it ahead of its base. Physical phone/Safari testing and first-time-player feedback remain uncollected.
