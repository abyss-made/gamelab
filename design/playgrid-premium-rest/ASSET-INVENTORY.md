# Original assets and reusable state families

All new SVGs and HTML/CSS are original design work. No paid API, competitor asset, copied logo, stock image, third-party sprite set or additional app dependency is used. Existing Playgrid mark, Inter and portrait sprite retain their original provenance/licenses.

| Asset family | Source / export | Usage and variants |
|---|---|---|
| Brand / avatars / font | Existing `node-server/public/favicon.svg`, `assets/player-portraits.png`, `assets/fonts/inter-variable.ttf` + OFL.txt | Reuse unchanged. ZIP preserves paths, not a new branding kit. |
| Sketch examples | `assets/sketch-dragon.svg`, `assets/relay-cat-baker.svg` (800×600) | Original example player content for design frames only. In production render actual stroke history; do not ship a fixed drawing as gameplay or hint. |
| RPS throws | `assets/throw-rock.svg`, `throw-paper.svg`, `throw-scissors.svg` (210×190) | Original illustrated hands, distinct silhouette and label. Private lock/reveal/outcome styling in state.css; opponent art renders only when authorized. |
| Ceramic marks | `assets/mark-x.svg`, `mark-o.svg` (96×96) | Original normalized vectors, readable named mark. Default/selected/unavailable/win variants use existing HTML state class. No raster sprite per cell needed. |
| King inlay | `assets/crown.svg` (24×24) | Original dark-outline crown. Combine with state-generated Lime/White man; used only for actual king piece code. Named king accessible label required. |
| Feedback icons | `assets/check.svg`, `cross.svg`, `connection.svg`, `trophy.svg` (24×24) | Original line icons, paired with state text. Native empty/disabled/pending states remain text-first. |
| Tool icons | `assets/pencil.svg`, `eraser.svg`, `fill.svg`, `undo.svg`, `clear.svg` (24×24) | Standalone original exports and matching inline paths in build-concepts.py. Selected/focus/disabled rings in CSS. Keep tool semantics, color palettes and permitted size values. |
| Board, disc, piece, patch, letter families | `shared.css`, `state.css`, `build-concepts.py`, per-game concept.html | Vector/native CSS output generated from every actual value. Square board geometry, circular slots, 7×6/3×3/8×8 and Dots n=3/4/5; owner initials, man/king, legal/selected/last/win/claimed states. Never install a screenshot or whole fixed scene as a playable board. |
| Paper, folder, review, ballot, bracket | Same native HTML/CSS sources; state-preview.js demonstrates phase variants | Materials are reusable without pre-baked answer/role/name content. Anonymous ballots carry no authors before reveal; folder view accepts authorized role only. |
| Motion primitives | motion.css, MOTION.md | Inspect/enter/drop/slide/claim/reveal/receipt, all opt-in after accepted state changes and disabled under reduced motion. |

`build-concepts.py` regenerates original active HTML and five illustration SVGs; `build-states.py` regenerates the state index/sheet sources and twelve vector exports. `components.html` is a local visual preview. The production renderer adapts these assets/styles to actual view data; design-state routing is not app code.

Every state variant is specified in each SPEC.md and available in state-explorer.html. No missing proprietary sprite is required to implement a supported state. Additional player drawings/words/names are content, not an unfinished fixed asset library. Original audio files are not introduced; existing Sound/mute behavior remains.
