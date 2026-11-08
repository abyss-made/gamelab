# Real browser comparison gallery — Issue #70

These are actual Chromium viewport screenshots of the Express + Socket.IO application, not static mockups. **Before** is untouched `a81444b`; **after** is this feature branch. Fixtures use a local isolated server with private alpha authentication disabled only in the test environment. Production authentication is unchanged.

Each opening-state matrix contains 48 PNGs: 12 views × four required viewport sizes. The capture script runs the selected games with three actual connected members (two browser clients and one Socket.IO peer). Names, cards, roles and codes are randomized, so compare layout/interaction rather than identical dealt hands.

## Desktop 1440 × 900

| View | Before | After |
|---|---|---|
| New player invitation | [Before](screenshots/before/invite-new-1440.png) | [After](screenshots/after/invite-new-1440.png) |
| Returning invitation | [Before](screenshots/before/invite-returning-1440.png) | [After](screenshots/after/invite-returning-1440.png) |
| Lobby briefing | [Before](screenshots/before/lobby-intro-1440.png) | [After](screenshots/after/lobby-intro-1440.png) |
| Word Chain | [Before](screenshots/before/wordchain-1440.png) | [After](screenshots/after/wordchain-1440.png) |
| Categories | [Before](screenshots/before/categories-1440.png) | [After](screenshots/after/categories-1440.png) |
| Drawing Telephone | [Before](screenshots/before/telephone-1440.png) | [After](screenshots/after/telephone-1440.png) |
| Bluff Battle | [Before](screenshots/before/bluff-1440.png) | [After](screenshots/after/bluff-1440.png) |
| The Impostor | [Before](screenshots/before/impostor-1440.png) | [After](screenshots/after/impostor-1440.png) |
| Go Fish | [Before](screenshots/before/gofish-1440.png) | [After](screenshots/after/gofish-1440.png) |
| Dots & Boxes | [Before](screenshots/before/dotsboxes-1440.png) | [After](screenshots/after/dotsboxes-1440.png) |
| Mini Golf | [Before](screenshots/before/golf-1440.png) | [After](screenshots/after/golf-1440.png) |
| Property Tycoon | [Before](screenshots/before/tycoon-1440.png) | [After](screenshots/after/tycoon-1440.png) |

## Mobile 390 × 844

| View | Before | After |
|---|---|---|
| New player invitation | [Before](screenshots/before/invite-new-390.png) | [After](screenshots/after/invite-new-390.png) |
| Returning invitation | [Before](screenshots/before/invite-returning-390.png) | [After](screenshots/after/invite-returning-390.png) |
| Lobby briefing | [Before](screenshots/before/lobby-intro-390.png) | [After](screenshots/after/lobby-intro-390.png) |
| Word Chain | [Before](screenshots/before/wordchain-390.png) | [After](screenshots/after/wordchain-390.png) |
| Categories | [Before](screenshots/before/categories-390.png) | [After](screenshots/after/categories-390.png) |
| Drawing Telephone | [Before](screenshots/before/telephone-390.png) | [After](screenshots/after/telephone-390.png) |
| Bluff Battle | [Before](screenshots/before/bluff-390.png) | [After](screenshots/after/bluff-390.png) |
| The Impostor | [Before](screenshots/before/impostor-390.png) | [After](screenshots/after/impostor-390.png) |
| Go Fish | [Before](screenshots/before/gofish-390.png) | [After](screenshots/after/gofish-390.png) |
| Dots & Boxes | [Before](screenshots/before/dotsboxes-390.png) | [After](screenshots/after/dotsboxes-390.png) |
| Mini Golf | [Before](screenshots/before/golf-390.png) | [After](screenshots/after/golf-390.png) |
| Property Tycoon | [Before](screenshots/before/tycoon-390.png) | [After](screenshots/after/tycoon-390.png) |

## Other required viewports

The [before](screenshots/before) and [after](screenshots/after) folders also contain each view at **1366 × 768** (`-1366.png`) and **932 × 430** (`-932.png`). Longer views intentionally scroll; screenshot height is the requested viewport, not a resized full-page image. Portrait Golf keeps its existing rotated top-down course and scrolls to its aim/power controls.

## Played transitions and reconnect

The [flows folder](screenshots/flows) captures server-explained Categories rejections, real drawing/guess/reveal, anonymous Bluff voting, a Go Fish request, a Dots capture, synchronized Golf collision, Tycoon at all required sizes, and expanded Draw & Guess in landscape. See `browser-checks.json` for assertions, including mobile tee placement and refresh during live play/replay.

Reproduce final captures: `python docs/playgrid-4-1/capture.py after`. This uses local port 44070 and requires Python Playwright + Chromium. Reproduce played flows: `python docs/playgrid-4-1/verify.py` (port 44071). Stop conflicting local servers first. The scripts start and clean up their own server; they do not touch Render.

The untouched-base [expanded drawing at 932×430](screenshots/before/drawguess-932.png) reproduces a grid overlap that remained after #68. Compare the [corrected focus view](screenshots/flows/drawing-landscape-932.png): readable word/timer row, tools, and a separate usable canvas.
