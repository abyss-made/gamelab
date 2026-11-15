# Playgrid: ten standalone game scenes

The previous revision mostly changed visual styling. This revision rebuilds the game scenes themselves: physical boards and pieces, tabletop composition, original modeled assets, and controls arranged around play.

**[Open the comparison gallery](index.html)** · [Every screenshot](SCREENSHOTS.md) · [Handoff](HANDOFF.md) · [Validation](VALIDATION.md) · [Commercial references](REFERENCES.md)

The gallery supports one game at a time, all ten together, desktop/phone/landscape, actual played states, results, and publisher references. Click a capture for full size. Serve it locally with `python -m http.server 45410 --directory docs/standalone-scenes` and open `http://localhost:45410`. GitHub shows the source of HTML; use the screenshot index directly when browsing GitHub.

| Game | Substantial changes |
| --- | --- |
| Mini Golf | Raised course plinth, shaded curbs and timber obstacles, checker fairway, original garden miniatures, visible aiming/power and real stroke feedback. Still 2D top-down with the existing authoritative course geometry. |
| Pool | Complete walnut cabinet, cushions ending at real pocket mouths, inset leather pockets, sights, original enamel sphere renders and actual group racks. The native shot-power input sits beside the table; precise aim and Shoot remain accessible on phones. |
| Property Tycoon | Raised physical board, original car tokens, miniature upgrade buildings tied to actual property levels, styled deeds and financial actions. Compact scrolling mobile balances keep the map visible. |
| Go Fish | Physical felt/wood card table, real opponents with face-down hands, original pip/court faces and PG backs, visible private hand and book area. Stable card selection and long-hand scrolling. |
| Ludo | Wood/enamel board with inset colored homes, sculpted pawns, substantial dice and a focused turn-action pod. Legal routes and shared-square selection remain native. |
| Battleship | Five modeled vessels, physical ocean charts, clear coordinates, touch placement controls before the grid, and explicit Fire above the desktop target chart. Only own or publicly sunk enemy vessels appear. |
| Color Stack | Full card arena, original colored faces and backs, visible opponent hands, readable central discard and deliberate Play. Physical faces fan inside stable button hit areas; large hands remain reachable. |
| The Impostor | Public meeting table built from actual players and public clues, private role card, clue/discussion/vote/reveal progress, explicit voting. Seven to ten players use a readable seating grid. |
| Chess | Twelve original sculpted Staunton renders, walnut board, clocks and captures, real mouse/touch moves, keyboard-accessible promotion. Board remains readable in short landscape windows. |
| Drawing Telephone | Dedicated prompt workspace, drawing tool rail/canvas, compact phone tools and submission, real chain reveal with reactions/navigation. Existing drawing coordinates and same-round canvas preservation remain intact. |

All ten include game-specific result presentation around their original result logic. Existing animation helpers handle balls, dice, routes, transfers, turns and feedback; reduced-motion users receive settled states.

## Evidence and limits

- Before: **600d87bbfb0b2d29f1b3c8ed312cb3dbf44fe491**, the immediately preceding visual revision, not old production.
- After production source: **5fa16390038a1d3219705cc337ceece0072227c8**. Subsequent evidence/documentation commits do not change game code.
- Browser captures: 1440×900, 390×844 and 932×430; real Express + Socket.IO clients. Hands, names, turns and random outcomes differ. Pool's opening after capture uses the actual shooter with the cue ball locked.
- Original assets: **53 Blender-rendered PNGs + 4 SVGs**, with build source. Publisher reference images are documentation only.
- These are fixed 2D/2.5D scenes with pre-rendered models. They do not reproduce commercial live 3D cameras, cinematic sequences or proprietary artwork. Pool adds no unsupported spin physics. Golf preserves all existing courses; the extra Canyon screenshots show an existing course, not new geometry.
- Automated Chromium checks passed. Physical devices, Safari/Firefox and measured frame-rate benchmarks remain unverified.

Nothing was merged or deployed. Review the actual captures before deciding whether this meets the desired quality bar.
