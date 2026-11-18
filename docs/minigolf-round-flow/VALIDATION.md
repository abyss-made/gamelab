# Validation and limits

Production source: `8b1310448a9a6df951821a920fd33f055058e6e8`. See [source-manifest.json](source-manifest.json) for the six changed source hashes and all published media hashes. No production changes were made during the retries.

## Completed checks

| Evidence | Actual result |
| --- | --- |
| All package test programs | **38/38 passing final records**, no final failed checks, skips or startup errors. See [suite.json](test-results/suite.json) and per-program logs. |
| Gauntlet rules | **19 passed**, including saved recaps, replay boundaries, next-hole persistence, departing-player classification and snapshot isolation. Existing motor/gate fuzz checks retained. |
| New real-room browser flow | Desktop 1440×900 and phone 390×844; seven real UI putts, one completed hole (3 / 3), then a shot on the next hole while a friend reads the saved recap. [flow-checks.json](flow-checks.json). |
| Mouse / native CDP touch | Course tap aims without shooting or changing power. Existing pull cancellation, second-finger handling, one-shot release, exact opponent replay, trails, chat, turns and reload tested at 1440×900, 390×844 and 932×430. [input-checks.json](input-checks.json). The desktop `touchCancelAndMultitouch: false` is not applicable; both touch viewports report true. |
| Graphics / lifecycle | Real WebGL loss during a held pull cancels without a shot; actual 2D fallback remains playable. Held module requests test the six-second deadline, disposal of late scenes and actual Leave Lobby during loading. Identity, score, aim and focus preserved as applicable. No page errors. |
| Preservation | **94 putts**, six players, six holes: identical physical frames, impacts, turns, deadlines, scores and results against the previous PR snapshot. Fake-clock rules probe, not UI or human testing. Art, courses and physics modules byte-identical. [preservation-checks.json](preservation-checks.json). |
| Review media | **21 original PNGs**, two full native recordings and two 15-second real-time excerpts. Gallery links/images/filters and actual clip playback checked in Chromium at 1440 and 390; no page overflow. [gallery-checks.json](gallery-checks.json), [encoding-checks.json](video/encoding-checks.json). |

The existing [Party Play package](../minigolf-party-play/VALIDATION.md) retains the prior full six-hole native match and before/after visual evidence. This follow-up does not claim that the new seven-putt flow is another full match.

## Cloud setup recovery

The first full suite completed with 16 programs blocked by missing Playwright executable paths or occupied test ports from the aborted browser starts. The workspace restart had removed the temporary browser cache. Repository Node Playwright 1.65 and Python Playwright 1.62 require different cache revisions. Both were linked to the already-installed Linux Chromium 154 and FFmpeg, without app or dependency changes. Only confirmed orphan app servers owned by that failed suite were stopped.

All 16 affected commands were rerun in package order, with the other 22 already passing records retained. This is a complete passing final set after setup repair, **not a clean first-attempt run**. Raw logs retain their original trailing whitespace. Initial logs/manifest remain in [setup-attempt/](test-results/setup-attempt/), with [retry history](test-results/setup-retry.json), [cache setup](test-results/setup-attempt/cache-setup.json) and [owned-process cleanup](test-results/setup-orphan-cleanup.json). This helper uses system Chromium, not a bundled official Playwright browser build.

## Reproduce

From repository root, with dependencies and Python Playwright installed:

```sh
export PLAYWRIGHT_BROWSERS_PATH=/tmp/pg42-browsers
python docs/minigolf-round-flow/prepare-cloud-browser.py
node node-server/test/golfgauntlet.js
python docs/minigolf-round-flow/verify-flow.py
python docs/minigolf-round-flow/verify-input.py
node docs/minigolf-round-flow/verify-preservation.js
python docs/minigolf-round-flow/test-suite.py
python docs/minigolf-round-flow/encode.py
python docs/minigolf-round-flow/verify-gallery.py
```

Run browser checks sequentially. `prepare-cloud-browser.py` is a Linux cloud helper for existing system Chromium/FFmpeg; use normal Playwright browser installation elsewhere. Re-recording intentionally replaces evidence. `retry-browser-setup.py` is only for a completed first run with startup failures, and refuses to overwrite its archive. Functional failures require investigation.

Browser screenshots and native input are real, but players are automated. No first-time human feedback or physical-device/Safari observations were collected. WebGL uses cloud SwiftShader; real GPU performance remains unmeasured. Fault tests cover the named cases, not every browser/network failure. No merge, deploy, Render change or live-site write occurred.
