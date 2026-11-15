# Validation

Implementation source snapshot: `3b148a286d6258e0c1011660f256ca734a228af3`. Documentation and evidence commits follow it. Parent comparison revision: `b4a7e9d8960d6387a0af19519f9f2c019d83f794`.

## Automated regression suite

All **37 programs** in `node-server/package.json` have passing latest records, with no failed assertions, skipped programs or startup errors in those records. [Latest records](test-results/suite.json) · [Initial full run](test-results/initial-suite.json).

The initial full run passed 36/37. `reliabilityui` timed out during five-browser game switching while separate GPU-heavy captures were running. The **unmodified entire reliability program then passed on its own: 49 passed, 0 failed**. Its initial log and successful rerun are both retained. This does not claim that the initial run was clean or that a precise driver-level cause was proven.

The successful reliability run covers repeated game switches, two desktops and three phone clients, no page/console errors across the game smoke pass, stable listeners/callbacks, and zero leftover animation frames in the lobby. The full suite also covers existing gameplay, rooms, Draw & Guess, Four in a Row, authentication, safety, bots, keyboard behavior, vocabulary and backend reliability.

The established Meadow hole-in-one regression still runs by explicitly selecting that legacy course. UI checks now exercise the real angled camera's inverse mapping and held-shot cancellation. Physics tests solve and replay paths for all 30 holes; the original tour remains at 18.

## Real browser gameplay

System Chromium / Playwright. Viewports: **1440×900**, **390×844**, **932×430**. Touch scenarios use real Chromium CDP touch input. These new match harnesses use normal Socket.IO joins and native UI controls, without injecting match state.

- [Input/reconnect checks](input-checks.json): tapping never shoots; Escape, touch cancellation and a second finger cancel safely; deliberate release sends one authoritative shot; opponent replay frames match; scorecard/chat controls work; reconnect retains identity and strokes.
- [Camera/party checks](extra-checks.json): actual six-player scenes at all three sizes, spectator controls, overview and follow, rotate/zoom/recenter, right-drag without a putt, resizing cancellation, reduced-motion settling, three clean scene remounts and working no-WebGL recovery.
- [Normal full-course match](full-course-checks.json): both players play all six new holes through the actual UI and finish with a normal, non-forfeit result. Search assistance chooses inputs using the exact server physics; it does not modify server state, bypass animation or skip turns. An intentional water shot additionally checks the actual stroke penalty and visible feedback.
- [Before/after captures](screenshots/after/capture.json) preserve the same Meadow/Harbor geometry, player names, starting positions and zero-stroke state. Timers and camera framing differ.

There are 74 actual game PNGs. [Artifact checks and checksums](test-results/artifacts.json) cover dimensions, local links, four recordings and MP4/WebM playback. Recordings show the actual browser: desktop, phone and landscape input scenarios, plus the full course. The full-course recording includes viewport changes made while capturing desktop/mobile layouts.

## Renderer unit fixtures

[Renderer report](rendering-checks.json): all **30 course meshes**, actual recessed cups/water cutouts, finite geometry, full-hole framing and **2,424 inverse camera mappings** across angles, overview/follow and desktop/phone aspect ratios.

These are isolated renderer fixtures made from the authoritative course definitions. They are separate from the real-match browser captures and are not presented as gameplay screenshots.

## Preservation and dependencies

[Preservation / asset / syntax checks](test-results/preservation.json) verify all server files outside the two intended golf modules, unchanged physics, established courses and tour, avatar source, Draw & Guess, Four in a Row, manifest/lock, original material assets, JavaScript syntax and the vendored Three.js checksum/license.

Only the new course setting/default changes in the server controller; the existing simulation, rooms, authentication, logging, security, monitoring and shutdown code remain. Main-page changes are limited to Mini Golf's description and course picker. Homepage artwork/branding is preserved.

Three.js 0.160.1 is the one added browser runtime library. It is locally vendored and loaded on demand. No server package dependency, remote CDN, publisher artwork or new build pipeline is required.

## Fixes and test limitations

Visual/interaction verification corrected an initially collapsed desktop canvas, pointer-test primary identity, overview zoom behavior, stale camera accessibility labels, correct under-par score names, compatibility-mode control visibility and cup framing after completion, and offscreen cup guidance overlapping controls. Test helpers also needed fresh turns for shot cases and asynchronous camera-settling waits. The new full-course harness avoids trying to resize through all viewports during the short between-hole advance window; normal final results are captured at all three sizes.

The reference game's Unity build was not played in this cloud browser; the publisher gameplay image is the visual reference. The actual Playgrid application was played and captured.

This is live 3D presentation over authoritative planar physics. Multilevel ramps, airborne jumps, simultaneous free-for-all putting, career/economy and commercial matchmaking are not implemented. Physical mobile devices, Safari/Firefox, a device-specific FPS/thermal audit and every graphics-driver combination remain unverified. No commercial visual-parity or unmeasured frame-rate claim is made.

Nothing was merged or deployed.
