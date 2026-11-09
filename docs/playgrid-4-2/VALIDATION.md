# Validation evidence

Production implementation captured at `fecb25713c7a5b4e5b84d2a2c66cfad1a5880801`; `63c3d1e` subsequently corrects only a test fixture. Baseline screenshots are from untouched production `8846f1514b2bbb8e807ba1b3954e136327b27fa4`.

- **Browser:** 28 successful checks, including actual actions in all 20 selectable games with three independent clients, reconnect identity, reduced motion, departure ending and fresh match. Zero recorded browser errors. See [browser-checks.json](browser-checks.json).
- **Integration:** 15 successful checks, zero recorded errors, including private-state handling, multiplayer Golf collision/replay, drawing controls, security headers, health and graceful shutdown. See [integration/browser-checks.json](integration/browser-checks.json).
- **Layouts:** 60 final game/viewport opening captures with zero horizontal overflow; 69 opening images per version including invite/lobby flows, plus 63 played/result images. Desktop 1440×900, portrait 390×844, landscape 932×430. Random hands/prompts/avatars differ between captures. The comparison viewer was also opened in Chromium and its mobile played/baseline images verified to load.
- **Local load:** 40 rooms, 160 connections, 10-second configured workload, zero errors and healthy final server. This is a local smoke load test, not a production capacity guarantee. See [loadtest.log](test-results/loadtest.log).
- **Data:** deterministic regeneration reproduced all four generated datasets byte-for-byte. See [data-rebuild.json](test-results/data-rebuild.json).
- **Platform preservation:** six PR #72 platform/reliability files retain identical Git object IDs. See [platform-preservation.json](test-results/platform-preservation.json).

## Automated suite history

[suite.json](test-results/suite.json) preserves the first run of every command in the package test script, including initial failures in `phase2` and `keyboardui`. Its dead-letter test exhausted the small prompt dictionary rather than the newly authoritative broad dictionary. The corrected fixture exhausts the actual accepted words; all 18 assertions pass in [phase2-rerun.log](test-results/phase2-rerun.log). The separate 4.2 regression also checks the inverse case: a letter must remain playable when broad-list words are still available. No production rule was weakened to pass the test.

The keyboard fixture previously focused a hidden duplicate Go Fish rank chip on mobile. It now targets visible rank controls, exercising the actual hand-card buttons. All 40 keyboard checks pass in [keyboardui-rerun.log](test-results/keyboardui-rerun.log).

**Final aggregate: 38/38 programs pass, zero skips, after the two documented fixture reruns.** The final aggregate result is recorded in [final-summary.json](test-results/final-summary.json). PASS-line counts are log counts, not necessarily assertion counts (some programs print aggregate totals instead).

## Review and limits

[REVIEW.md](REVIEW.md) records the fresh local Codex review and fixes. GitHub-hosted PR creation/review remains blocked by the environment's API policy. No merge or deployment. Browser evidence is Chromium on Linux, including touch emulation; physical iOS/Android and Safari/Firefox remain untested. Dictionary memory/cold-start costs and finite coverage are disclosed in [README.md](README.md).

Archived logs have trailing whitespace removed; test messages and results are otherwise retained.
