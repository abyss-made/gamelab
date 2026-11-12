# Five-game premium polish

This batch changes only **Mini Golf, Pool, Property Tycoon, Go Fish and Ludo**. It starts from production `8846f15`; the earlier whole-site redesign is not included. [Integration handoff](HANDOFF.md) · [Validation](VALIDATION.md) · [Actual screenshots](SCREENSHOTS.md).

| Game | Graphics / controls | Confirmed-event feedback |
|---|---|---|
| Mini Golf | Gradient greens, illuminated bumpers, readable top-down course, clear power controls | Actual replay trails, direction-change impacts, cup rings and completed-hole summary entry |
| Pool | Woven cloth, spherical ball lighting, readable table, large power slider and desktop presets | Actual replay trails/pocket rings, confirmed pot count and foul emphasis |
| Property Tycoon | Dimensional map/tokens, printed property-deed treatment, readable cash and pipped dice | Actual dice landing, interpolated tile travel, cash/ownership highlights |
| Go Fish | Directly selectable private cards, richer sea-glass table, explicit rank/target/Ask states | Public face-down transfers, private own-card arrivals, Go Fish response and new-book treatment |
| Ludo | Lacquered board, pearl track, numbered dimensional tokens, clear legal choices | Real dice rolling/landing, routed track/home movement and captured-token returns |

All five retain their server rules, scoring, authoritative physics, multiplayer state, privacy and original artwork. No new dependency, autoplay audio, artificial result, fake deck or local scoring. Animations are short, respect reduced motion and do not queue/block valid actions.

## Real review material

Before/after and played states cover 1440×900 desktop, 390×844 portrait and 932×430 landscape. `video/` contains five actual gameplay recordings. The browser harness uses three independent clients; Go Fish exercises a real public face-down transfer and Ludo executes real dice rolls and a legal token move. Every game also exercises reconnect identity, reduced motion, departure result and a fresh match.

Open `index.html` through a local HTTP server for the side-by-side viewer; GitHub readers can use the screenshot links directly.

## Limits

Existing original board/card/character artwork is reused and enhanced; no claim of an entirely new art collection. Trails and rings are lightweight presentation over existing replay samples, not a replacement physics engine. Physical devices and Safari/Firefox remain untested; evidence uses Chromium and touch-capable browser contexts.

Long hands, detailed score sheets and cramped landscape layouts may scroll. Phone play surfaces retain minimum readable sizes; fitting every advanced control and a full board into every short viewport is not claimed. Preset buttons are omitted on portrait phones in favor of the existing full-width sliders. Ball travel remains functional information under reduced motion; decorative trails/rings and Web Animations are suppressed.

The received assignment ended after Ludo's “Animated dice” bullet. This batch also improves its board, token travel, captures, legal-choice clarity and results, consistent with the five-game objective.

No merge or deployment.
