# Five-game validation

Baseline `8846f15`; final rendered implementation `8de8842`. See [test-results/suite.json](test-results/suite.json) for the serial full-suite run and [test-results/final-summary.json](test-results/final-summary.json) for the final aggregate. PASS-line counts are log counts rather than necessarily individual assertion counts.

## Actual browser proof

[verify.py](verify.py) uses three independent browser clients and real legal actions. All five games exercise 1440×900 desktop, 390×844 portrait and 932×430 landscape, identity reconnect, reduced-motion preference, departure ending and a fresh match. Eight successful groups and zero recorded JavaScript page errors are in [browser-checks.json](browser-checks.json).

- Go Fish selects actual private cards, submits a named Ask, checks public face-down flight, then plays legal requests until a real book completes and checks the independent book reward. No card information is added to public state; test clients inspect only their own hands to choose valid requests.
- Ludo rolls real server dice until a legal move is available, then executes a real token move. No mocked dice or forced six.
- Pool/Golf use actual placement/power/shot controls and wait for authoritative shot/replay state. Existing `batch5ui` additionally checks a sinking Golf putt, hole summary, responsive canvas, touch-sized controls, auctions/trades and disappearing offers.
- Tycoon rolls real dice and uses the contextual purchase control when available.

The book test uncovered a real repaint defect: a rapid new update erased the old inline book effect. An independent newly-confirmed-book overlay now survives hand/seat repaints. The extended hand test also exposed overlapped card centers; the fan now retains 44px of exposed card width before scrolling, with visible corner selection and keyboard access. Those checks passed after the fixes.

## Visual evidence

60 PNGs: 15 production openings, 15 final openings, 15 played views and 15 real departure-result views. All 15 final opening game/viewport views report zero horizontal overflow. Result captures explicitly show the real forfeit/departure reason; they are not claimed as five normal full-match victories. [Screenshot index](SCREENSHOTS.md).

Five actual-play WebM videos show the real multiplayer flows and viewport changes. `video/index.json` records their valid codec/resolution/duration. Random hands, dice, player names and turn order differ between baseline and implementation. The image comparison viewer was checked separately for loading actual images.

## Scope and limits

[Preservation proof](test-results/preservation.json): the entire server/data tree, main application controller and avatar module retain identical Git object IDs. No server mechanics, dictionary, scoring, physics or networking edits. No homepage/catalog/lobby/Avatar Studio redesign is included.

Earlier ad-hoc test launches overlapped fixed local ports; they are excluded from final pass claims. The serial suite and final focused checks are the review evidence. Logs have trailing whitespace trimmed only. A startup error is a failure even if a legacy program exits zero.

Chromium on Linux with touch-capable contexts; physical iOS/Android and Safari/Firefox remain untested. Frame rate and production capacity were not benchmarked. Replays remain functional motion under reduced motion; decorative trails, rings and Web Animations are suppressed. Long hands/scorecards and shorter screens can scroll. No merge or deployment.
