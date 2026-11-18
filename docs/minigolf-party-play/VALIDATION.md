# Verification and remaining limits

The complete 38-program suite, renderer checks and native-input checks used **`205eaf26ec11d66dee7192a41a7de02aa9bfd025`**. Final source **`be8de37ecb1ffa55aea52e7e437dc83e74336cad`** adds only a three-line CSS rule to keep the finish banner out of the recap; all JavaScript, backend and test sources are byte-identical. The normal six-hole match and review recordings were repeated on that final source, checking the overlap on both devices. Later documentation commits do not change production files. The comparison baseline is the previous PR #79 snapshot, `85ab293de52f3f1cd8669cdf0e344dd79efa13d0`.

| Check | Result |
| --- | --- |
| Full package test suite | **38/38 programs passed in one fresh serial run**, with zero failed checks, skips or startup errors. Each command in `node-server/package.json` ran with its own exit code and verbatim log. [Manifest](test-results/suite.json). Pool/Golf/Tycoon rules/browser batches passed 274/140 checks; backend reliability passed 374 and browser reliability passed 49/49. |
| Final CSS follow-up | A fresh **140-check Pool/Golf/Tycoon browser batch passed** on the final source after the banner/recap fix. The re-recorded normal match passed all twelve actual recap visibility/clear-text checks. [Report](final-css-checks.json). |
| Gauntlet rules | **17 meaningful checks passed**, including 2,400 sampled motor-phase putts, 960 gate-layout putts, deterministic turbo redirection, faster-shot preservation, once-per-ball activation, safe footprints, protected/resting opponents, round-robin turns, replay input rejection, departed-player skipping, factual finish labels and real lead changes. |
| Established courses and shared physics | **300 exact old/new trajectory comparisons passed** across all 30 holes in the five established courses. Their definitions and the original 18-hole tour are identical. The shared physics module is unchanged in this update. [Report](preservation-checks.json). |
| Renderer fixtures | **36/36 holes passed**: finite geometry, recessed cups/water, overview framing and inverse camera mappings. New checks cover actual trail samples, turbo footprints/flashes, reduced motion, live impact catch-up, no duplicate effects, late-reconnect filtering and a four-contact-per-frame catch-up limit. [Report](rendering-checks.json). These are renderer unit fixtures, not gameplay screenshots. |
| Native input | Desktop **1440×900**, phone **390×844** and landscape **932×430** passed mouse/touch release, cancellation, second-finger rejection, exactly one putt, matching opponent replay, trail toggle, rotating turns, scorecard/chat and reload preserving the player/stroke. No horizontal page overflow. [Report](input-checks.json). |
| Phone compatibility view | With WebGL explicitly unavailable, an actual phone UI completed a turbo shot, matched the opponent's authoritative replay, displayed the actual trail and had no horizontal overflow. [Report](fallback-checks.json). |

## Normal recorded multiplayer match

[Raw match evidence](match-checks.json) · [Screenshots and videos](SCREENSHOTS.md)

Three real browser clients completed all six holes through normal UI controls: **47 putts, 18 cups, five turbo launches, nine motor contacts, and a 15 / 15 / 17 result**. Nobody forfeited or reached the stroke limit. Desktop and phone use the actual 3D renderer; the third seat uses the application's real 2D fallback with the Three.js resource explicitly unavailable. All clients received identical sampled paths, impact/motion data and finish labels, and agreed on the next active turn.

The phone completed a native touch-played cup on a motor hole. The desktop trail's vertices matched its actual prior server path. The final phone putt used a turbo tile and earned an actual eagle/“Turbo finish!” label. The fresh match verifies that the transient finish banner is suppressed while each recap is visible, keeping its text clear. Stroke scoring and lobby wins remain unchanged.

All **six recap transitions on both desktop and phone** were observed as genuinely rendered DOM panels after the final ball replay. The live match also passed **41 rolling-player/timer checks** and 5 direct checks that the recap did not cover a still-rolling final shot. Brief cards can close while a test inspects another client; the DOM observer records their actual timing rather than extending game timers to obtain screenshots.

No page errors were reported. Automation did not inject game state, skip holes, extend physics intervals or change turn timers mid-match. Planned legal angles were independently replayed through actual controls.

## Difficulty and reachability probes

- Three two-player rules-level matches completed **36 player-holes without a stroke-limit pickup**. Profiles used exact input and small random errors: the largest profile has up to ±1.5° aim error and ±3 percentage points of power error before UI rounding. Totals were 14/15, 14/17 and 17/20. [Report](balance-checks.json).
- A three-player rules-level match completed 18 player-holes in 47 putts, without pickups. [Planned inputs and results](planned-3-player.json).
- A six-player rules-level match completed 36 player-holes in 94 putts, without pickups. Totals were 14/15/15/15/17/18, with twelve turbo launches and eleven motor contacts. [Report](planned-6-player.json).

These are automated route agents, not first-time human players. Their scores establish reachability under the tested inputs, not whether the game is enjoyable or correctly balanced for people.

## Defects found and corrected

The player panel originally highlighted the next player while the current ball was rolling. It now keeps the shooter active and hides the future turn timer until the replay ends. The recap also waits for the final ball instead of appearing over its motion.

Browser testing exposed impact feedback disappearing when a slow frame missed the previous short playback window. Effect playback now uses the shot's original arrival time, catches up live contacts with bounded work, and consumes them once. A late reconnect still skips contacts that happened before arrival. Dedicated delayed-frame and reconnect fixtures cover that distinction; the final recorded match captured actual turbo and motor feedback.

Initial capture attempts also missed brief recap panels while inspecting three clients. Read-only DOM observation now verifies their real display times. The game timers were not increased for the recording. The final match uses two 3D clients plus the real compatibility renderer for the third seat, so both rendering paths play together.

## Review artifacts

The package contains **52 unchanged native PNGs** and **seven recordings**: two full matches, two 15-second real-time excerpts, and three native-input recordings. Compression preserves native dimensions, frame rate and timing; [encoding records](video/encoding-checks.json) include original/published hashes and probes. [Tested source hashes](source-manifest.json) identify production code separately from later documentation commits.

Clip review also exposed the transient finish banner overlapping the phone recap. A scoped CSS rule suppresses that banner while the recap is visible; the recap retains the finish label in its player row. The full native match was re-recorded after this visual correction.

The final [gallery check](gallery-checks.json) passed all desktop/phone camera comparisons, original image dimensions, one-hole navigation, links, layout overflow and playback of both displayed clips.

## Honest limits

**No human playtest feedback has been collected.** First-time players should check whether rotating turns feel fairer, turbo directions are clear, shortcut risks are worth taking, and the trail helps them improve. Physical phones, Safari and hardware-GPU performance were not tested here. Browser checks use Chromium with software rendering and native CDP touch events; page recordings are silent.

The courses retain flat, server-authoritative physics with an angled presentation. Turbo tiles redirect moving balls; they do not add jumping or vertical ramps. Sweepers run during putts for up to 2.4 seconds, then park. The layouts remain handcrafted.

This remains draft PR #79, stacked on #78. **Nothing has been merged or deployed.**
