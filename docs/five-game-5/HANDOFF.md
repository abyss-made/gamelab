# Five-game premium integration

Branch `codex/playgrid-5-five-game-polish`, starting from production `8846f1514b2bbb8e807ba1b3954e136327b27fa4`. The earlier whole-site 5.0 branch is excluded. Homepage, catalog, party room, Avatar Studio and other game renderers are untouched.

## Implementation

- `public/js/games/premium5.js`: shared bounded Web Animations, face-down transfer flight, token FLIP interpolation, canvas trails and impact/pocket rings. No intents, inferred scores, card identities or physics simulation. Load after `art31.js` and before the five renderer modules. The helper registers one reduced-motion listener; each canvas history resets on mount/unmount. In-flight animation promises remove their own transient nodes.
- `gofish.js`: real hand cards are buttons using the existing rank intent. Their focus follows stable rank/suit identity. Desktop rank chips remain an alternative; the duplicate rank row is hidden on phones. Public `lastMove.sequence` drives face-down transfers; only the viewer's actual hand drives private card-entry effects. First snapshots/reconnects seed ledgers silently. New public books animate once; an independent confirmed-book overlay survives rapid hand/seat repaints. Card overlap leaves at least 44px exposed before switching to a scrolling hand. Existing pending/retry and privacy contracts remain intact.
- `ludo.js`: confirmed last-event routes walk actual track/home coordinates using `from` and `to`; a yard exit goes from its real yard spot to its start. Captured opponents return to their yards. Real dice faces remain visible throughout the short rolling/landing treatment. Animation never blocks the next legal action or chooses a random face.
- `tycoon.js`: pipped dice use the real values with an accessible numeric label. The existing 120ms tile stepping interpolates between actual rendered positions. Cash/ownership highlights compare authoritative snapshots, seed silently and never alter balances. Reduced motion shows final positions directly. Property deeds, existing map and contextual trade/auction controls stay functional.
- `pool.js`: layered spherical shading, subtle woven cloth, trails on authoritative replay positions and impact/pocket rings. Settled shots show the actual `potted` count; actual fouls receive restrained status emphasis. New shot-power presets edit the existing slider and never shoot automatically.
- `golf.js`: richer green/bumper material rendering, trails from actual replay coordinates, directional-impact rings and cup completion feedback. The completed-hole summary enters only on an observed play→between phase transition. Top-down projection, collision paths, shared multiplayer replay and input inverse mapping are unchanged.
- `five-game5.css`: exclusively scoped to these five games plus their named transient/result classes. Other screens are unaffected. Phone power controls retain full-width sliders and readable playing surfaces. Desktop presets are supplementary; phones keep the direct range controls.
- `index.html`: adds the stylesheet and helper; changes only these five game script cache versions. Preserve Claude's unrelated script versions/includes when integrating.
- `test/keyboardui.js`: Go Fish selects visible rank controls, exercising actual cards on phones instead of trying to focus the hidden duplicate rank chips.

## Integration cautions

Claude may be editing the same five renderer modules in 4.2. Integrate each renderer hunk rather than replacing his files wholesale. In particular preserve any improved pending-action handling, validation messages, replay synchronization and private-state redaction. This branch deliberately changes no server, dictionary, scoring, physics or networking source.

Trails describe observed motion; they are not aim predictions. Direction-change rings describe the replay path and do not claim to identify a specific physics collision type. Pool disappearance rings follow rendered authoritative pocket events. No pocket/holed outcome is invented on release of a pointer. Initial snapshots do not replay old transfers, ownership changes, books or dice celebrations.

## Reproduction

Use existing npm dev dependencies plus local Chromium, Node Playwright and Python Playwright. Python scripts use `/usr/bin/chromium`; video recording additionally requires Playwright-compatible ffmpeg. This session used local cache symlinks to system Chromium/ffmpeg, not a runtime dependency.

```
python docs/five-game-5/test-suite.py
python docs/five-game-5/verify.py
python docs/five-game-5/capture.py after 45106
```

The suite executes every program from `node-server/package.json` serially and retains logs. Avoid running legacy tests with overlapping hardcoded ports concurrently. A zero exit after `EADDRINUSE` is not a completed pass; the runner flags startup errors. Local test servers disable alpha only in their process environments. Never point these scripts at Render.

`capture.py before` requires an untouched `8846f15` worktree. Set its `ROOT` to that checkout and `PG41_EVIDENCE_DIR` to this evidence directory. Rendered openings and played states are captured at 1440×900, 390×844 and 932×430. Videos show the actual three-client flows and viewport changes, not handcrafted demo states.

No merge or deployment.
