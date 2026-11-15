# Claude integration — Batch 2

Branch `codex/playgrid-5-batch-2`. Base: current production `8846f1514b2bbb8e807ba1b3954e136327b27fa4`. Batch 1 is completed on `codex/playgrid-5-five-game-polish` at `4bff909` but unmerged; this branch does not include or overwrite it. There is **no runtime dependency** on Batch 1.

## Reviewable game commits

- `14f0531`: Battleship, tested before proceeding — mouse/touch drag placement, validity previews, public impact effects, deliberate Fire.
- `2b548bc`: Color Stack, tested before proceeding — actual card flight, draw entry, explicit Play, wild keyboard handling and exposed hand hit areas.
- `571dbfc`: Impostor, tested before proceeding — local role concealment, phase feedback, player voting cards and explicit vote confirmation.
- `6769be0`: Chess, tested before proceeding — mouse/touch dragging, legal-drop checks, capture/check feedback and accessible promotion.
- `c0e4450`: Telephone, tested before proceeding — stable sketchbook reveal, reaction updates without canvas replacement and revealed-entry navigation.
- Later small commits refine public sunk-vessel art, recent capture tray, sound, clock contrast, brush mapping and phone drawing controls. Documentation is a separate commit.

## Shared integration points

The only existing files changed are the HTML entry point and these five renderer modules. `batch2-5.css` and `js/games/batch2fx.js` are new. Preserve Claude's and Batch 1's unrelated includes and script versions when resolving `index.html`; retain both batches' CSS/helper includes. The helper loads after `art31.js` and before the game modules. All five renderer script versions are bumped to `b25-1`.

No server, dictionary, scoring, networking, physics, sound-system, main-controller, avatar or benchmark-renderer changes. Do not wholesale replace Claude's working files if he has updated any of these five renderers: apply the presentation/control hunks while preserving his reliability fixes. Batch 1 modifies a different set of five game modules. Both animation helpers use separate namespaces and cancel only their own animations.

## Contracts to preserve

- **Battleship:** drag changes the local placement draft only; Lock submits the original placement intent. Existing tap placement and Rotate remain. Drop validity checks bounds/overlap against the local draft. Fire still requires a separate explicit press. Effects follow changed public `moves/last/shots`; enemy artwork uses **only publicly sunk cells**, never guessed live vessels. The real marks and turn update immediately; decorative impact follows a 300ms missile flight and never blocks input. Drag-cancel does not submit or discard an existing ship.
- **Color Stack:** selecting or double-tapping a card does not play it. Only Play submits; wilds require color selection. Escape cancels and Tab stays within the color dialog. Card IDs/public counts drive flight; only the viewer's actual private hand drives own-card arrivals. Reconnect seeds silently. Public opponent draws use backs only. The zero-card result badge appears only on a normal server-confirmed win.
- **Impostor:** Hide/Reveal repaints only the local role region and never resets the clock. Concealment is a screen convenience, not an authentication boundary. Voting first selects a public player; Confirm sends the existing vote intent. No private roles of other players are inferred or exposed. Vote tally and impostor identity render only from `g.result`; all real counts appear immediately, with short entry motion rather than invented counting.
- **Chess:** server-provided `g.legal` controls drag targets and drops. Pieces remain at authoritative squares until acknowledgment. Dragging never runs chess rules locally. Tap-to-move remains. Promotion focuses Queen, traps Tab and restores its source on Escape. Recent captures show only observed, confirmed transitions, including en passant; they are not a reconstructed full capture history after reconnect. Clocks/rules are untouched.
- **Telephone:** work-round canvases stay alive across same-round updates. Revealed entries are keyed by public chain/entry index; likes update only the reaction region. Never add unrevealed future entries. Navigation traverses only currently revealed contributions. Brush mapping excludes the visible border and preserves the original 800×600 coordinates. Lost pointer capture ends a stroke. Phone Done is beside the prompt; core drawing tools precede the palette. Submitted drawings remain server-owned.

All shared Web Animations are bounded, use non-interactive overlays and clean up on completion/cancellation. Reduced motion cancels this helper's animations and suppresses the scoped CSS motion. Existing mute controls and locally synthesized Sound tones are reused; no copyrighted audio or forced autoplay is added.

## Reproduce

Use existing npm dev dependencies plus Node/Python Playwright and Chromium. Python harnesses use `/usr/bin/chromium`; recording additionally requires compatible ffmpeg. Session-only cache symlinks point to system Chromium/ffmpeg; they are not production dependencies.

```
python docs/batch2-5/test-suite.py
PLAYWRIGHT_BROWSERS_PATH=/tmp/pg42-browsers python docs/batch2-5/verify.py
python docs/batch2-5/capture.py after 45205
```

`B25_PORT` selects a free harness port; `B25_REPORT` selects a report filename for focused reruns. Game IDs can be passed as arguments. Legacy suite programs have fixed ports, so run the suite serially. A zero exit with a startup error is not a pass. All local test servers disable alpha only in their own environments; never point them at Render.

Before captures require an untouched `8846f15` checkout, with the capture script's ROOT set to that checkout and `PG41_EVIDENCE_DIR` set to this evidence directory. Serve the repository via `python -m http.server 8000` and open `/docs/batch2-5/` for the comparison viewer.

No merge or deployment.
