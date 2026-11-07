# Validation — Issue #70

Completed 2026-11-07 on Node 24.19.0 / Chromium 154.0.8037.57, against production-code commit `7c17152`. Base remains `a81444b4afc59bfbe1bf83213ba5f6fc4dd7ac76`.

| Check | Result |
|---|---|
| Full `npm --prefix node-server test` | **Exit 0; all 36 test programs passed; 3,832 PASS checks; zero failures, zero skips** |
| New `experience41.js` game-contract program (also in full suite) | 15 grouped checks passed, including configured-round endings and all 24 holes × six safe starts |
| Additional real-browser flows | **14 passed; zero browser page errors** |
| Screenshot matrix | 49 before (48 opening states + reproduced base drawing-focus defect), 48 after opening states, 17 played-flow captures; **114 PNGs total** |
| Required PNG dimensions | Every file verified at 1366×768, 1440×900, 390×844 or 932×430 |
| `git diff --check`, Python reproduction-script compilation, changed JS syntax checks | Passed |

The complete run includes all existing authentication, room/chat, multiplayer games, secrecy, reconnect/reliability, keyboard, responsive layout, bot, lexicon and physics suites. Full unmodified output is [npm-test.log](test-results/npm-test.log); exact machine-readable counts and its SHA-256 are in [results.json](test-results/results.json). Earlier runs exposed obsolete mixed-case Bluff expectations and fake-word Categories fixtures; those assertions now use the required uppercase answer and real deterministic words while retaining privacy/scoring checks. The final complete command passed in one run.

## Real browser verification

`python docs/playgrid-4-1/verify.py` starts an isolated real Express server on port 44071 and uses three independent browser clients. It verifies saved/classic identity through invite joins, compact returning invites, all 20 lobby examples, submitted nonsense rejection with visible server reasons and keyboard-scrolling review tables, Telephone custom settings and a real draw/guess/reveal chain, uppercase anonymous Bluff voting, public Go Fish requests and refresh deduplication, Dots capture ownership, desktop pointer/mobile touch/keyboard tee placement, replay-completion controls, synchronized collision paths and final positions including mid-replay refresh, Harbor course selection/rendering, Tycoon panels/overflow at all four sizes, and an unobscured drawing-focus word/timer bar at 932×430. Results: [browser-checks.json](browser-checks.json), [raw output](test-results/browser-checks.log).

## Visual comparisons and review

The [gallery](SCREENSHOTS.md) pairs untouched-base and implemented screenshots. Direct inspection drove shorter invitation layouts, preserved hidden returning-player editors, readable role cards and validation explanations, on-table Go Fish feedback that preserves private-hand space, and the narrow landscape fixes. The untouched base was separately run to reproduce the remaining expanded drawing overlap; the final regression hit-tests the word rather than relying on visibility alone.

Read-only Codex review covered correctness/privacy/reconnect and the later CSS fixes. Substantive findings fixed: proper names/brands ending in S, country-alias initial-letter validation, and stale-snapshot Golf placement after replay. No further substantive issue was found in the final requested review. See [HANDOFF.md](HANDOFF.md) for limits and [CONTRACTS.md](CONTRACTS.md) for additive game contracts.

## Reproduction

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/pg4-browsers npm --prefix node-server test
python docs/playgrid-4-1/verify.py
python docs/playgrid-4-1/capture.py after
```

The browser path above is this environment's alias to system Chromium. Other environments should install/configure their normal Playwright browser. Python captures explicitly use `/usr/bin/chromium`. No dependency was added to the app. Private alpha is disabled only on isolated capture/flow servers; the automated alpha suite separately verifies protected behavior. Known generated bot screenshots outside this package were restored after testing. No Render deployment, merge or real ads.
