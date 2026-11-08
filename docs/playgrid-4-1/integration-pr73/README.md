# PR #73 — integration of Playgrid 4.1 and platform PR #72

Production base: `89d3d89fb4f50a13b9aeab425c8c38d4b231641c` (`codex/playgrid-2-redesign`, merged PR #72). Original 4.1 head: `878e202d62c569b02104a2868cc44297ebbe5369`. Integration merge commit: `50778409a41d8baadcea1e4699b0f735f8069221` on the existing `codex/playgrid-4-1-experience` branch. No rebase, force-push, merge into production or deployment.

## Actual conflict and resolution

| Conflicting file | Cause | Resolution |
|---|---|---|
| `node-server/package.json` | Both branches appended to the same `test` script; their JSON formatting also differed around the adjacent scripts/engines entries | Retain all 35 original test programs plus SOL's `experience41.js` and Claude's `platform.js`, each exactly once. Keep `start`, `test:reliability`, `test:experience` and `loadtest`. Preserve every other manifest field and dependency version. |

This was the **only** file with Git conflict markers. Claude's server entry point, room module, logger, platform tests, load-test script and runbook merged cleanly and remain byte-for-byte identical to production. SOL's entire public frontend/assets, game-module and game-data trees remain identical to the reviewed 4.1 head. [preservation.json](preservation.json) records the matching Git object IDs. No infrastructure contract adjustment or gameplay source edit was necessary.

Both parents' complete test-command sets and every other package field/named script were checked programmatically after resolution.

## Combined verification

| Check | Actual result |
|---|---|
| Full `npm --prefix node-server test` | **Exit 0; all 37 programs passed; 3,854 PASS lines; zero failures and skips** |
| Targeted Claude platform regression | **19 checks passed**, including health, security headers, junk/oversize input, prototype pollution/join flooding, log privacy, bind failure and graceful SIGTERM shutdown |
| Real-browser integration | **15 checks passed; zero page errors** using three real clients, desktop, mobile touch/keyboard, refresh and mid-replay reconnect |
| Local load test | **40 rooms, 160 Socket.IO clients, 40 real matches started, 249 server-confirmed moves, zero errors** |
| Fresh screenshots | **65 real PNGs**: 48 opening-state views and 17 played states at 1366×768, 1440×900, 390×844 and 932×430 |
| Manifest/preservation checks, `git diff --check`, Python QA-script compilation | Passed |

The browser checks cover saved/classic invite identity, new/returning invitation layouts, all 20 visible lobby examples, actual Categories rejection messages/keyboard-scrollable review, Telephone custom source/settings and draw/guess/reveal, anonymous uppercase Bluff votes, Go Fish public transitions and reconnect deduplication, Dots capture ownership, desktop/mobile/keyboard Golf tee placement, collision synchronization and refresh, Harbor Links rendering, Tycoon panels at all four sizes, and non-overlapping expanded Draw & Guess in landscape. The added integration check verifies Claude's headers on redesigned invitations/assets and aggregate-only health with three clients connected. QA server SIGTERM must exit 0.

The full suite additionally includes multiplayer secrecy, game rules, alpha authentication, room lifecycle, bot and accessibility/responsiveness regressions. The load test is localhost Tic Tac Toe with chat/rejoin/host leave; some clients spectate due to the game's seat limit. It is not a production-capacity benchmark. No production or Render endpoint was tested or changed.

- [Full npm log](test-results/npm-test.log)
- [Targeted platform log](test-results/platform.log)
- [Load-test log](test-results/loadtest.log)
- [Browser results](browser-checks.json) and [execution log](test-results/browser-checks.log)
- [Machine-readable results and log hashes](results.json)
- [Fresh desktop/mobile screenshot gallery](SCREENSHOTS.md)

Archived logs remove trailing whitespace only; both original-capture and archived-file hashes are recorded in `results.json`. Message contents/order and PASS counts are unchanged.

Runtime: Node 24.19.0 / Chromium 154.0.8037.57. Capture fixtures disable alpha only on isolated local servers; the automated alpha suite separately verifies protected behavior. Known generated bot screenshots outside this evidence folder were restored. `PG41_EVIDENCE_DIR` selects this folder in the reusable QA scripts, preserving the original 4.1 evidence.

## Review and mergeability

Fresh read-only Codex review of the integration found **no substantive issues**; [REVIEW.md](REVIEW.md) records scope and conclusions. Application source is the reviewed merge commit; later changes are documentation, evidence and QA-output/health assertions.

After pushing, verify that GitHub's generated `refs/pull/73/merge` has the latest production and PR heads as its parents, and that `refs/pull/73/head` matches the pushed branch. This checks GitHub's conflict-free test merge without merging or deploying the PR. The final remote check is reported in the task response.

GitHub CLI GraphQL access returned `Forbidden` during this session. A separate GitHub-hosted review request is attempted after pushing the tested head; do not infer that the old review of `878e202` covers this integration. The prepared [REVIEW-REQUEST.json](REVIEW-REQUEST.json) can post the exact request when API access is available:

```sh
gh api --method POST repos/abyss-made/gamelab/issues/73/comments --input docs/playgrid-4-1/integration-pr73/REVIEW-REQUEST.json
```

Alternatively, add `@codex review` as a new comment on [PR #73](https://github.com/abyss-made/gamelab/pull/73) after the updated head is visible. This triggers hosted review of the current head; the PR remains for owner approval. The environment had no remote-desktop capability or desktop JS tool for a signed-in browser fallback (environment `ccarenv_b64_Y2NhcmVudl9iNWIwZjA5NjM2Mzg4MTkxODRjMTRlYzZkZWY4YmQyZg`).

## Reproduce locally

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/pg4-browsers npm --prefix node-server test
node node-server/test/platform.js
npm --prefix node-server run loadtest -- 40 4 10
PG41_EVIDENCE_DIR="$PWD/docs/playgrid-4-1/integration-pr73" python docs/playgrid-4-1/verify.py
PG41_EVIDENCE_DIR="$PWD/docs/playgrid-4-1/integration-pr73" python docs/playgrid-4-1/capture.py after
```

The Playwright path is specific to this cloud environment; use your configured browser elsewhere. The gameplay limitations in the original [HANDOFF.md](../HANDOFF.md) still apply: finite proper-name lists, party-judged creative semantic fit, deterministic 2D arcade Golf with protected unplayed tee balls. This integration changes none of those rules.
