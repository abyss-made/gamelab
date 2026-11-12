# Claude integration handoff

Base: production `8846f1514b2bbb8e807ba1b3954e136327b27fa4`. Branch: `codex/playgrid-5-visual`. This branch intentionally excludes the unfinished 4.2 branch. Do not replace Claude's dictionary, game modules, networking or server changes with files from this branch.

## Reviewable batches

1. `74c57c7`: homepage discovery, illustrated catalog, lobby and Studio presentation, isolated read-only animation adapter.
2. `d8ba935`: distinct game-stage materials, status/control treatment, compact portrait Golf layout.
3. `23e5dfc`: fitted portrait Pool table and reachable shot dock.
4. Evidence/documentation commit: screenshots, reproducible browser scripts, test logs and limitations.

The only shared existing production runtime file is `node-server/public/index.html`. `test/phase15.js` also replaces the old no-vertical-scroll homepage assertion with horizontal-fit, visible-CTA and discovery-link checks. Its changes add two CSS links, one script loaded **after main.js**, a curated discovery section, and catalog copy. Preserve all of Claude's script versions and additional includes when resolving that file. All other implementation files are new: `playgrid5.css`, `gamefeel5.css`, `js/playgrid5.js`. They can be integrated independently; load their styles after existing premium/4.1/4.2 styles. No new dependencies.

## Presentation contracts

- The adapter reads `App.S`, never emits Socket.IO intents or mutates state. It adds a stage data attribute for palettes and sets catalog tint variables. Normal game rendering remains the owner of boards and controls.
- Join animations compare server player IDs within the same room. No identity is inferred from names; reconnecting an existing member does not trigger a new-arrival effect. It uses current roster order, already rendered by main.js.
- Active-player feedback follows confirmed turn/phase changes. Result entry follows a real `lastResult`. No fake points, bot personalities, sounds, achievements or synthetic match events.
- Animations are bounded Web Animations with no retained listeners per game. Reduced motion cancels only this adapter's own animations. Existing replay/physics animations are preserved.
- Pool and Golf's portrait canvas wrappers constrains its width. The original `fit()` reads that width for its backing resolution and pointer mapping. Do not apply non-uniform canvas CSS scaling or change its hit regions.
- Existing saved avatar drafts, compatibility, undo, SVG composition and Save behavior remain intact. No new character assets are claimed.

## Reproduce

Install the repository's existing npm dev dependencies and Chromium/Playwright (Python and Node runners). Python scripts use `/usr/bin/chromium`; Node tests use Playwright's configured executable. Session tests used system Chromium through local Playwright cache symlinks; those `/tmp` paths are not portable requirements.

```
python docs/playgrid-5/test-suite.py
python docs/playgrid-5/verify.py
python docs/playgrid-5/capture.py after 45008
```

`capture.py before` requires production `8846f15` in a separate checkout. For a different source root adapt `ROOT` and set `PG41_EVIDENCE_DIR` to the evidence directory. These scripts start local servers with alpha disabled only in test process environments; they never connect to Render. `discovery-checks.py` expects a local server at port 45003.

Use a free port for each runner. Early browser-launch failures left test servers listening on hardcoded ports; reruns must first terminate those exact local orphan processes. A zero process exit with `EADDRINUSE` and zero assertions is **not** a passing test. Final aggregate evidence must account for this.

Serve the repository locally with `python -m http.server 8000` and open `/docs/playgrid-5/` for the interactive screenshot comparison. No deployment or merge.
