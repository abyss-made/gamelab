# Implementation handoff

Branch: `codex/playgrid-standalone-game-scenes`.

Production-source snapshot: `5fa16390038a1d3219705cc337ceece0072227c8`. This branch includes the earlier five-game and Batch 2 interaction work; do not separately cherry-pick those revisions over it. Review against `codex/playgrid-2-redesign`. No merge/deployment has been performed.

## Integration

- Existing `node-server` Express + Socket.IO application; no separate runtime demo or new runtime dependency.
- `public/index.html` loads `standalone-scenes.css` and `js/games/standalone.js`. The old `ten-visuals.css` include is replaced; that file stays for historical comparisons.
- `GameUI.scenes` provides original asset images, card faces, actual Pool group racks, public meeting composition and result framing. It does not maintain a parallel game state.
- New presentation is scoped to `.room [data-scene]` and active-game room layout. Main routing, homepage, alpha authentication, avatars, Draw & Guess and Four in a Row source are preserved.
- The ten native game renderers still own lifecycle, socket intents, authoritative views, clocks, event listeners, cleanup and outcome logic. Their original result markup is wrapped, not replaced with invented outcomes.
- Keep `premium5.js`, `batch2fx.js`, `ten-art.js`, `five-game5.css` and `batch2-5.css`: the current renderers use their tested interaction primitives. Removing the earlier CSS/helper layers requires a separate careful consolidation.

## Contracts to preserve

| Area | Required behavior |
| --- | --- |
| Pool | Original canvas coordinates, PAD, pocket centers, interpolation, shot intents and server physics. Power is the original input moved into the table rail. PNG sphere diameter matches native radii; vector fallback and vector numbers remain. No ornamental spin control. |
| Golf | Original playable polygons, walls, hazards, tees, holes and path coordinates; decoration stays outside play. Do not turn it into perspective/isometric physics. |
| Tycoon | Ownership, rent tables, money and upgrades come from the view. Building image appears only for actual upgrade levels. Center civic miniature is decorative, not owned property. Car color order is pink/blue/lime/gold/purple/teal; Ludo uses a different order. |
| Cards | Opponent backs use public counts only. Never render hidden opponent faces. Color Stack keeps a stable actual button rectangle, with the tilted face in a pointer-transparent child. Long-hand scrollports deliberately have no scroll snap. |
| Ludo | Original 15×15 cells, routes, legal-token indication, die states and shared-square chooser. Original pawn image must not block token input. |
| Battleship | Own ships and publicly sunk enemies only. Ship images have native dragging disabled so custom mouse/touch placement works. Selection is separate from Fire. Phone placement controls precede the grid. |
| Impostor | Meeting scene uses real players/public clues; secret word/role stays in the player's existing private role panel. Hide-role must not reset countdown. Votes require confirmation. |
| Chess | Fixed board orientation/coordinate mapping, legal moves and server validation. Promotion focus, Escape cancellation and focus return stay intact. |
| Telephone | Original 800×600 drawing coordinates; do not recreate the canvas on same-round room updates. Reactions preserve reveal entry DOM. Settings intent is `hostUpdate`, not `settings`. |

## Asset workflow

All production artwork in `public/assets/scenes/` is original. Assets include 12 chess pieces, 4 pawns, 5 ships, 4 buildings, 6 car tokens, 3 garden models, 16 billiard spheres, two material images, civic miniature and four SVGs. [Manifest and checksums](test-results/assets.json).

Offline regeneration using Blender 4.3:

```sh
blender -b --python docs/standalone-scenes/build-models.py
# To overwrite existing renders:
blender -b --python docs/standalone-scenes/build-models.py -- --force
```

The script uses CPU Cycles, transparent backgrounds where appropriate, and original geometry/materials. Blender is not needed to install or run Playgrid. No commercial reference image is loaded by the app.

## Validation and reproduction

```sh
cd node-server
npm ci
npm test
```

Browser programs additionally need the existing Playwright test tooling and compatible Chromium. This workspace used Python Playwright with `/usr/bin/chromium`, and a local browser-cache mapping for Node Playwright; neither is a production dependency. Legacy test programs bind fixed ports: run them serially.

From repository root, the supplied evidence tools launch isolated local servers with private-alpha disabled only in those subprocess environments:

```sh
python docs/standalone-scenes/test-suite.py
python docs/standalone-scenes/capture.py after 45402
python docs/standalone-scenes/verify-first.py
B25_PORT=45405 python docs/standalone-scenes/verify-second.py
python docs/standalone-scenes/stress.py
python docs/standalone-scenes/capture-course.py
python docs/standalone-scenes/verify-preservation.py
python docs/standalone-scenes/build-previews.py
python docs/standalone-scenes/verify-gallery.py
```

Before capture intentionally requires checking out `600d87b`; run it in a separate checkout instead of overwriting current work. Do not regenerate before images from this branch. First/second browser scripts record actual native actions and videos, not injected game snapshots. Results in the gallery are actual departure outcomes, clearly labeled.

Test adaptations: `batch5ui` accepts the original power-input usability dimensions in either orientation; `design31ui` checks loaded rendered chess pieces instead of requiring SVG specifically. Earlier `keyboardui` changes preserve the expanded action/confirmation flow. The long-hand test was not relaxed: its failure caused the scroll fix.

See [validation](VALIDATION.md) for preserved-source evidence, initial test failure and successful reruns, and remaining device/visual limits. Review in a draft PR; owner approval is required before any later merge/deploy.
