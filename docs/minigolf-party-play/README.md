# Mini Golf: more to play with

This updates the actual multiplayer game in `node-server`, on `codex/minigolf-party-gauntlet` / draft PR #79. It builds on the angled course rebuild and arena artwork. Nothing is merged or deployed.

- **A turn for every friend.** Party Gauntlet rotates after each putt and skips finished players. The person who is rolling stays highlighted; the next player's displayed clock starts after the replay. The other courses retain traditional farthest-ball turns.
- **Four optional turbo routes.** Lime arrow tiles redirect a moving ball at a minimum launch speed, once per tile per ball during a putt. They never slow a faster ball. Ribbon Run, Bounce Boulevard, Slime Shortcut and Victory Lap each have one. Ordinary routes remain available.
- **Learn the shot you actually played.** “Your last shot” overlays your own sampled path on the current hole. It is a static trail, not a prediction, undo or replay that pauses the room. It clears on the next hole and hides during a live shot.
- **Give a good finish its moment.** Bank, multi-bank, bumper, sweeper and turbo finishes come from server contacts on the finishing stroke. Hole-in-one and under-par labels use the actual stroke count. Celebrations never change the score or invent bonus points.
- **Keep feedback through a slow frame.** Live launch/impact effects catch up once with bounded work; reconnecting players skip old contacts. This fixes effects disappearing when a frame missed the old short delivery window.
- **Make the next hole matter.** The recap waits for the final ball, shows genuine finish labels, and reports the actual leader, margin, tie or lead change. Turbo sounds, tile flashes and particles respect mute/reduced motion.

[Actual screenshot index](SCREENSHOTS.md) · [Comparison gallery](index.html) · [Validation](VALIDATION.md) · [Implementation handoff](HANDOFF.md) · [Tested source hashes](source-manifest.json)

The existing homepage/artwork, Coastal Club default, five established courses, original tour, other games and private-alpha/backend systems are preserved. The game retains server-authoritative flat physics with an angled 3D presentation. No dependency was added.

Automation establishes that these routes and controls work. It does **not** establish that human players find them fun. Two first-time players should try a normal six-hole match, then repeat with four to six people: check whether turns feel fairer, tile directions are understood, risky routes are worth choosing, and the last-shot trail helps. Record real observations rather than treating automated scores as feedback.
