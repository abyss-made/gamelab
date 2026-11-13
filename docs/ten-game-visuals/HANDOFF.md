# Claude integration handoff

Branch: `codex/playgrid-5-ten-game-visuals`. Target: `codex/playgrid-2-redesign`.

This branch contains both earlier batches plus the new visual revision. Do not apply the two old branches again after integrating this one. Earlier baseline production is `8846f1514b2bbb8e807ba1b3954e136327b27fa4`; combined-batch comparison baseline is `ae3000af3312f0cf9b2fa8a6b24b8877ee2cbc1a`.

## Integration points

- Keep `five-game5.css`, `batch2-5.css` and `ten-visuals.css` includes, in that order. The final sheet is intentionally scoped to `[data-ten]` roots of these ten games. Its structural overrides account for the older premium theme's specificity.
- Keep `ten-art.js` before the renderers. Retain `premium5.js` and `batch2fx.js`: each uses its own animation namespace and cleans up only its own effects.
- Keep all ten renderer cache versions at `ten-1` (or bump together after further editing). Do not remove unrelated Claude reliability, dictionary, authentication or platform changes when resolving `index.html`.
- New asset paths are local `/assets/ten/…`. Never substitute opponent face art for backs or render secret enemy ship locations.
- Do not wholesale replace a renderer that has changed since the branch base: reconcile its presentation/control hunks with the latest rules/reliability fixes.

## Contracts to preserve

1. **Pool/Golf:** every shot result and ball path comes from the server. New rail/foliage/cushion art does not change physical boundaries. Pool's portrait rotation must keep its inverse pointer transform; Golf's portrait mapping and native course coordinates must stay intact. Decorative completion/contact feedback never delays authoritative state.
2. **Tycoon:** tile index, owner, account balance and rent remain server data. Tile buttons keep complete accessible labels and open actual deed details even where compact text wraps/truncates. Native dice/purchase/trade intents are unchanged. Public property-type icons carry no hidden data.
3. **Go Fish:** only the viewer's private hand selects face illustrations. Rank illustrations do not replace real rank/suit labels. Opponent counts drive backs; public transfer events drive card flights. Keep direct rank/card selection, named target and explicit Ask.
4. **Ludo:** rocket images sit inside the original token buttons, retaining token IDs, player color, accessible labels, legal-state classes and routed movement coordinates. No animation changes the actual legal path.
5. **Battleship:** drag edits a local placement draft; Lock submits. A target selection alone never fires. Enemy vessel art uses only publicly sunk cells. Native Fire, touch placement and rotation remain available.
6. **Color Stack:** own faces use actual values/colors; public opponent movement uses backs only. Selection never submits a card; Play/wild color confirmation does. Escape and trapped keyboard focus remain in the color picker.
7. **Impostor:** local concealment never restarts the clock. Other players' roles/secret words are never inferred. Select + Confirm submits a vote. Identity/tally appear only from the server's result.
8. **Chess:** legal drops use `g.legal`; pieces move after acknowledgment. New SVG geometry never changes board indices. Keep capture/en-passant handling, clocks, promotion focus trap, Escape restoration and tap fallback. `walnut` remains the persisted theme key for compatibility, with the new Ivory label/art.
9. **Telephone:** canvas coordinates remain 800×600. Exclude borders when mapping pointers. Keep same-round canvas nodes alive, public reveal entries keyed, reactions isolated and navigation limited to revealed entries. New notebook binding is pointer-transparent. Mobile Done stays beside the prompt.
10. **All:** retain native disabled states, legal-move feedback, focus visibility, mute and reduced motion. Animation overlays must remain bounded and noninteractive.

## Reproduce

From repository root, with the app's existing dev dependencies, Python Playwright and Chromium:

```
python docs/ten-game-visuals/build-art.py
python docs/ten-game-visuals/capture.py after 45304
PLAYWRIGHT_BROWSERS_PATH=/tmp/pg42-browsers python docs/ten-game-visuals/verify-first.py
PLAYWRIGHT_BROWSERS_PATH=/tmp/pg42-browsers B25_PORT=45303 python docs/ten-game-visuals/verify-second.py
PLAYWRIGHT_BROWSERS_PATH=/tmp/pg42-browsers python docs/ten-game-visuals/test-suite.py
python -m http.server 8000
```

Open `/docs/ten-game-visuals/`. Harnesses explicitly use `/usr/bin/chromium`. In this cloud session the Playwright browser cache points to system Chromium/ffmpeg; these machine-local symlinks are not production dependencies. Use an appropriately installed Playwright browser cache on another machine. `PG5_GAMES` filters the first harness and `PG5_REPORT` names a focused report; the second accepts game IDs and `B25_PORT` / `B25_REPORT`. Both use real, independent client identities and actual actions. Run the legacy full suite serially because programs reuse ports.

Before captures require a detached worktree at ae3000a: set the capture script's ROOT to that worktree and `PG41_EVIDENCE_DIR` to this documentation directory. Never recapture “before” from the new renderer. Scripts disable alpha only for their own local test process; never direct these harnesses at Render.

Approval, merge and deployment remain with the owner. No deployment configuration changes are included.
