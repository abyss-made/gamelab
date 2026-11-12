# Batch 2 validation

Production baseline `8846f1514b2bbb8e807ba1b3954e136327b27fa4`. Final production-code snapshot `8df0470`. No merge/deployment. Batch 1 is excluded.

## Automated tests

**All 37 programs pass, with zero skips, startup errors or reported failures.** The serial runner executes every command in `node-server/package.json`'s test script. [Per-program exit codes/log counts/durations](test-results/suite.json) · [Final aggregate](test-results/final-summary.json). Counts of PASS lines are not necessarily counts of individual assertions.

The suite includes gameplay, private-state safety, multiplayer reliability, keyboard controls, avatars, responsive UI, bots, lexicon and platform health/shutdown coverage. The lexicon/server files are unchanged; those suites verify compatibility rather than claim dictionary improvements in this batch.

## Real-browser checks

[Complete five-game run](browser-checks.json): 11 successful groups, zero JavaScript page errors. Three independent browser clients; desktop 1440×900, portrait 390×844 and landscape 932×430; reconnect identity, reduced motion and actual departure-result screens for every game.

- Battleship: mouse and native CDP touch dragging, clear local fleet placement, explicit Fire without a shot on aim alone, real miss/hits and a publicly sunk ship. [Final rotation/portrait rerun](battleship-final.json).
- Color Stack: actual card selection does not play it; Play sends the real card intent, or Draw receives a real card. Wild cancel is exercised when an eligible wild is present; full-suite UI also covers wild play. No claim of forcing a wild into a random hand.
- Impostor: Hide/Reveal preserves the countdown; real clue turns, discussion ready state, vote selection without submission, explicit confirmation, last guess when applicable and public reveal.
- Chess: mouse drag, native touch drag, click-to-move capture and a separate legal nine-move promotion sequence. Queen focus, Shift+Tab wrap, Escape restoration and the actual promoted board are checked. [Final focused run](final-focus.json).
- Telephone: actual prompt/drawing/guess submissions and real reveal; entry DOM survives reactions, drawings retain their canvases, revealed-entry navigation works. The [final drawing run](telephone-final.json) uses native touch strokes and checks that drawing does not scroll the page. It draws an original robot through actual controls, not a preloaded image.

## Actual visual evidence

66 PNGs: 15 baseline openings, 15 final openings, 15 played views, 15 real departure-result views, 3 actual promotion-dialog captures and 3 actual drawing captures. All 15 final opening game/viewport captures report zero horizontal overflow. Random hands, roles, names and turn order differ between runs.

The result screens explicitly state departure/forfeit reasons; they are not claimed as five ordinary complete-match wins. Five valid WebM recordings show actual interactions and viewport changes. Their codec/resolution/duration is in `video/index.json`. [Screenshot index](SCREENSHOTS.md) · [Comparison viewer](index.html).

Visual iteration fixed a drag-end click suppression issue, active Chess clock contrast, precise canvas-border mapping, and phone access to Telephone's Done/core tools. Pointer input does not delay authoritative game state for animation. The comparison viewer was opened in Chromium and its real images checked to load.

## Preservation and limits

[Git object preservation](test-results/preservation.json) confirms the complete server/data tree, main controller, avatar module, Draw & Guess and Four in a Row are identical to production. Only the five requested renderers, isolated helper/style and HTML includes change.

Chromium on Linux with native mouse/touch event coverage; physical devices, Safari/Firefox and measured 60 FPS performance remain untested. Recent Chess captures are observed transitions, not invented full historical data. Telephone navigates the currently revealed chain, not future content or a post-game archive. Refreshing an unsubmitted drawing still loses that unsent draft; normal same-round updates and submitted drawings are preserved. Long hands/chains and short viewports can scroll. [README](README.md) lists the remaining limits.

Logs have trailing whitespace removed only. Development-only failed drag/capture attempts led to fixes and are not counted as passing runs.
