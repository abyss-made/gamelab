# Actual screenshots and recordings

Six-hole match source: `be8de37ecb1ffa55aea52e7e437dc83e74336cad`. Native-input and phone-fallback samples used `205eaf26ec11d66dee7192a41a7de02aa9bfd025`; the final follow-up only suppresses a finish banner during recaps. PNGs are unchanged native Chromium screenshots. Desktop and phone use the actual 3D renderer.

[Before/after gallery](index.html) · [All native PNGs](screenshots/) · [All recordings](video/) · [Validation](VALIDATION.md) · [Handoff](HANDOFF.md)

| Hole | Desktop 1440×900 | Phone 390×844 |
| --- | --- | --- |
| 1. Ribbon Run | [Follow](screenshots/hole-01-follow-1440.png) · [Overview](screenshots/hole-01-overview-1440.png) | [Follow](screenshots/hole-01-follow-390.png) · [Overview](screenshots/hole-01-overview-390.png) |
| 2. Bounce Boulevard | [Follow](screenshots/hole-02-follow-1440.png) · [Overview](screenshots/hole-02-overview-1440.png) | [Follow](screenshots/hole-02-follow-390.png) · [Overview](screenshots/hole-02-overview-390.png) |
| 3. Gatecrasher | [Follow](screenshots/hole-03-follow-1440.png) · [Overview](screenshots/hole-03-overview-1440.png) | [Follow](screenshots/hole-03-follow-390.png) · [Overview](screenshots/hole-03-overview-390.png) |
| 4. Slime Shortcut | [Follow](screenshots/hole-04-follow-1440.png) · [Overview](screenshots/hole-04-overview-1440.png) | [Follow](screenshots/hole-04-follow-390.png) · [Overview](screenshots/hole-04-overview-390.png) |
| 5. Pinch Point | [Follow](screenshots/hole-05-follow-1440.png) · [Overview](screenshots/hole-05-overview-1440.png) | [Follow](screenshots/hole-05-follow-390.png) · [Overview](screenshots/hole-05-overview-390.png) |
| 6. Victory Lap | [Follow](screenshots/hole-06-follow-1440.png) · [Overview](screenshots/hole-06-overview-1440.png) | [Follow](screenshots/hole-06-follow-390.png) · [Overview](screenshots/hole-06-overview-390.png) |

The before images are the preceding [Gauntlet polish captures](../minigolf-gauntlet-polish/screenshots/) from source `85ab293de52f3f1cd8669cdf0e344dd79efa13d0`. That match had two players; this one has three. Names, timers and gate/motor phases can differ.

| Actual interaction | Evidence |
| --- | --- |
| Turbo launch | [Desktop](screenshots/boost-1440.png) · [Phone](screenshots/boost-390.png) |
| Sweeper contact replay | [Desktop](screenshots/motor-1440.png) · [Phone](screenshots/motor-390.png) |
| Your actual last-shot path | [Desktop](screenshots/learn-from-shot-1440.png) · [Phone input test](screenshots/actual-trail-390.png) |
| Held native touch on a sweeper hole | [Phone](screenshots/native-touch-390.png) |
| Three-player match, third seat in actual 2D fallback | [Landscape 932×430](screenshots/three-player-932.png) |
| Actual phone fallback with WebGL unavailable | [Phone trail](screenshots/fallback-trail-390.png) |
| Normal six-hole result | [Desktop](screenshots/normal-result-1440.png) · [Phone](screenshots/normal-result-390.png) · [Landscape](screenshots/normal-result-932.png) |

[15-second desktop turbo route](video/turbo-desktop.mp4) · [15-second phone turbo finish](video/turbo-finish-mobile.mp4)

[Full desktop match](video/desktop-match.mp4) · [Full phone match](video/mobile-match.mp4)

[Desktop input](video/input-1440.webm) · [Phone input](video/input-390.webm) · [Landscape input](video/input-932.webm)

The full desktop recording stays at 1440×900; the phone stays at 390×844. These are silent page recordings. Excerpts are unaltered real-time segments from those matches. Compression preserves native dimensions, frame rate and duration; [source/probe records](video/encoding-checks.json) identify the files.

All six actual recap transitions on desktop and phone are recorded in [match-checks.json](match-checks.json). Available recap PNGs are additional captures; the brief cards can close while the test checks another client.
