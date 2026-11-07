# Playgrid 4 integration notes (issue #67)

Branch `claude/playgrid-4-integration` = `codex/playgrid-4-production` (SOL commits `d4595f9`, `feb4e56`), which is a strict fast-forward of `codex/playgrid-2-redesign` (`b506ded`). No SOL code was altered or reimplemented.

## PR #66 reconciliation
PR #66 (`claude/issue-64-avatar-studio-gallery`) conflicts with SOL in `index.html`, `js/main.js` and `test/avatarui.js` (verified with `git merge-tree`). SOL's creator already provides the 35-character gallery, search, live preview and focus handling, so #66's smaller gallery was **superseded and not applied**; applying both would double-implement the gallery. #66 was not merged or closed; owner decides.

## Verification run on this branch (local, Chromium via Playwright)
- `npm --prefix node-server test`: exit 0, 3818 `PASS` lines, 0 `FAIL`.
- `python docs/playgrid-4/verify.py`: exit 0 (173 bounds/viewport records written).
- `python docs/playgrid-4/verify_flows.py`: exit 0, 15 PASS lines, 0 FAIL.
- Regenerated screenshots were spot-checked (Draw & Guess 1366 and 390) and then discarded; SOL's committed screenshots are unchanged.

## Not verified / limits
- Artwork is refined existing illustrations, not a bespoke 35-character redraw (SOL's own stated gap).
- Live Render and real ads were not touched; ads stay disabled.
- Physical iOS/Android/Safari not tested. Phone layouts may scroll vertically.
- I did not independently review all 148 screenshots, only spot checks.
