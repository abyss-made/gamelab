# Implementation handoff

Base `8846f15`; branch `codex/playgrid-4-2-premium`. No framework migration, new production dependency, game addition, deployment change, authentication change or Socket.IO protocol rewrite.

## Modules

- `public/js/games/experience42.js`: confirmed-state motion ledger, spatial board navigation, picker focus handling, reduced-motion-aware results. `main.js` captures before/after game updates and resets the ledger on disconnect/unmount. Do not make animations gate server actions.
- `public/experience42.css`: gameplay-scoped materials and mobile controls. Preserve established distinct game surfaces and homepage assets.
- Go Fish private cards are actual buttons using the existing rank intent. Public backs still derive only from counts. Mobile hides the duplicate chip row; tests should locate visible rank controls or the hand.
- Scramble tiles edit the existing answer input. Shuffle is local ordering only. Server accepts guesses; rejected input remains editable. Shared word help reports only after an explicit user click.
- Impostor privacy is a **local screen concealment**, not an authentication boundary. Only the user's own role was sent in the first place. Hide/Show must never call full update or reset clocks.
- Telephone reveal entries are keyed by server entry index, appended when revealed and preserved during likes. Never expose future chain entries or recreate canvases for reactions.
- Chess promotion focuses its options and restores the originating square on cancel. Game clocks/legal moves stay authoritative.
- Golf keyboard tee placement inverse-maps portrait arrows and bounds the draft; the server still rejects collisions/illegal positions. Power presets set existing sliders in Pool/Golf; physics/replay are unchanged.
- Tycoon preserves existing tile-step timing, adds short interpolation, and jumps directly to authoritative positions for reduced motion.

## Dictionary

Read `node-server/server/data/DICTIONARY-2.md` before modifying data. Keep licence notices and pinned inputs. Generated files are marked generated for review. Do not accept arbitrary suffixes or use a runtime dictionary API. Prompt generation and broad answer acceptance remain separate. Concrete category membership and open-ended party judgment have explicit policies.

## Reproduction

```
cd node-server
npm ci
npm install --no-save --package-lock=false playwright
npx playwright install chromium
python -m pip install playwright
# Python runners expect system Chromium at /usr/bin/chromium.
cd ..
python docs/playgrid-4-2/test-suite.py
python docs/playgrid-4-2/verify.py
python docs/playgrid-4-2/capture.py after
PG41_EVIDENCE_DIR="$PWD/docs/playgrid-4-2/integration" python docs/playgrid-4-1/verify.py
npm --prefix node-server run loadtest -- 40 4 10
```

`PLAYWRIGHT_BROWSERS_PATH` is environment-specific. `verify.py`/`capture.py` use `/usr/bin/chromium`, start local servers, and explicitly disable alpha **only for those local test processes**. Never run the load generator against production. Capture baseline only in an untouched `8846f15` worktree.

Use `docs/playgrid-4-2/index.html` to compare screenshots. Remaining limits are documented in README; do not label the platform perfect or treat opening screenshots as complete game-play tests.
