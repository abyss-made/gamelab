# Validation and integration limits

Production baseline: `8846f1514b2bbb8e807ba1b3954e136327b27fa4`. Final opening capture: `23e5dfc` (portrait Pool controls refined after the first complete capture). The homepage test change is separate from the rendered app.

## Actual browser evidence

- **23 gameplay check groups**, all 20 selectable games, three independent real browser clients. Actual actions, identity-preserving reconnect, reduced motion, departure ending and fresh match. A subsequent [Pool-only rerun](pool-checks.json) validates the final compact shot dock. Includes a complete Tic Tac Toe win/rematch, Telephone chain/reactions and Impostor clue/vote/reveal. [browser-checks.json](browser-checks.json).
- **5 discovery/Studio groups:** curated game links at three viewport sizes, live search/empty/reset, no horizontal overflow, avatar Save persistence and reduced motion. [discovery-checks.json](discovery-checks.json).
- **225 images:** 81 before, 81 after, 63 played/results. Viewports: 1440×900, 390×844, 932×430. The 60 final opening gameplay views report zero horizontal overflow. Homepage/catalog screenshots show full pages; gameplay screenshots show the viewport. Random hands/avatars/prompts differ.
- The comparison viewer was opened in Chromium; actual baseline and played phone images loaded. [Screenshot index](SCREENSHOTS.md).
- Zero recorded JavaScript page errors in the browser harnesses. This does not claim every console warning was inspected or that every physical device/browser was tested.

**Final aggregate: all 37 programs have a completed successful run; zero skips.**

## Suite history

[Initial suite](test-results/suite.json) retains each program's original result. The first browser launches failed because the Playwright executable was missing locally. Those failures left local test servers listening; some later programs exited after `EADDRINUSE` without completing their browser checks. Both nonzero exits and zero exits with a startup error are excluded from final passes. After repairing the local executable and terminating those exact orphan servers, affected programs were rerun. Their final logs and [rerun results](test-results/reruns.json) are retained.

The homepage test's old no-vertical-scroll assertion conflicted with the intentional discovery section. `test/phase15.js` now checks horizontal fit, a visible Create action and three discovery links while preserving all its focus/dialog/room tests. [Final homepage/focus log](test-results/phase15-final.log).

The first reliability run failed one spammed-move race assertion (3 moves rather than 2) under concurrent QA. An unchanged rerun passed all 374 checks. No server rule was changed; this remains a timing sensitivity worth Claude's attention. [Rerun log](test-results/reliability-rerun.log).

[Final aggregate](test-results/final-summary.json) selects the completed successful run for each program and records all source logs. PASS counts are printed-line counts rather than a guaranteed count of individual assertions. Archived logs have only trailing whitespace trimmed.

## Preservation and scope

The entire production server/data Git tree is identical: [server-preservation.json](test-results/server-preservation.json). No dictionary, scoring, mechanics or networking edits. Existing original game renderers still own their animations/physics. This pass adds destination design, surface/control hierarchy and restrained confirmed-state feedback; new bespoke transfer/pocket effects and an audio pack are not claimed. [README](README.md) lists per-game changes and remaining visual ambitions.

No merge or deployment. GitHub PR creation is attempted only after pushing the complete package. Cross-engine Safari/Firefox and physical-device testing remain outstanding.
