# Playgrid · Premium game experience
## Approved eight-game design package · implementation handoff

**Owner approved all eight directions, including the five revisions. Claude should implement all eight using [the assignment](CLAUDE-TASK.md) and [the implementation handoff](IMPLEMENTATION-HANDOFF.md).** The preview artwork is not a complete production sprite/state library; completing those variants is part of implementation. No gameplay, server, protocol, database, lobby or deployment code changed. The inspected baseline is `codex/playgrid-2-redesign` at **3f0d51a**. Current behavior and uncertainties were audited before creating the concepts.

### Owner revision · five stronger directions

Color Stack and Go Fish now seat opponents with visible private card backs; Mini Golf has a landscaped botanical course and a portrait composition; Property Tycoon has a detailed original miniature city; Battleship has five recognizable vessel designs. Pool, Ludo and Chess remain unchanged.

- [Revised card tables](revised-tables.png): desktop and phone Color Stack / Go Fish.
- [Revised boards](revised-boards.png): desktop and phone Mini Golf / Property Tycoon / Battleship.
- [Battleship phone fleet view](battleship/mobile-fleet.png): inspect the actual friendly ship artwork.
- [Revision notes and validation](REVISION-NOTES.md).

### Review

Open [the eight-concept gallery](index.html) through a local HTTP server, or inspect the PNGs directly. These are exact viewport renders of original concept HTML/CSS—not screenshots of redesigned working games. The sample data is illustrative.

| Game | Proposed identity | Desktop / phone | Four-size source review |
| --- | --- | --- | --- |
| Color Stack | **Neon Social Club** — social arena, original angular card faces, large inspectable fan | [1440×900](color-stack/desktop.png) · [390×844](color-stack/mobile.png) | [Direction](color-stack/DIRECTION.md) · [HTML](color-stack/concept.html) |
| Pool | **The Walnut Room** — green cloth, warm wood, precise perimeter controls | [Desktop](pool/desktop.png) · [Phone](pool/mobile.png) · [Landscape](pool/landscape.png) | [Direction](pool/DIRECTION.md) · [HTML](pool/concept.html) |
| Mini Golf | **Pocket Gardens** — bright 2D top-down botanical course | [Desktop](mini-golf/desktop.png) · [Phone](mini-golf/mobile.png) | [Direction](mini-golf/DIRECTION.md) · [HTML](mini-golf/concept.html) |
| Ludo | **Toybox Royale** — lacquered tokens, inset wells, ivory die | [Desktop](ludo/desktop.png) · [Phone](ludo/mobile.png) | [Direction](ludo/DIRECTION.md) · [HTML](ludo/concept.html) |
| Property Tycoon | **Playgrid Plaza** — original town map and contextual property illustration | [Desktop](property-tycoon/desktop.png) · [Phone](property-tycoon/mobile.png) | [Direction](property-tycoon/DIRECTION.md) · [HTML](property-tycoon/concept.html) |
| Battleship | **Bluewater Command** — twin tactical charts, deliberate targeting | [Desktop](battleship/desktop.png) · [Phone](battleship/mobile.png) | [Direction](battleship/DIRECTION.md) · [HTML](battleship/concept.html) |
| Go Fish | **The Marine Salon** — engraved marine back, ivory cards, rank-first ask rail | [Desktop](go-fish/desktop.png) · [Phone](go-fish/mobile.png) | [Direction](go-fish/DIRECTION.md) · [HTML](go-fish/concept.html) |
| Chess | **Walnut & Ivory** — classic square board, quiet clocks and history | [Desktop](chess/desktop.png) · [Phone](chess/mobile.png) | [Direction](chess/DIRECTION.md) · [HTML](chess/concept.html) |

Each game folder also contains `tablet.png` (768×1024) and `narrow.png` (360×740). Pool adds 844×390 landscape. The gallery links all sizes. **33 responsive renders** are recorded in [layout-checks.json](layout-checks.json), including document bounds, primary-action bounds and page errors. This is layout validation, not proof of gameplay, full accessibility or physical-device performance.

Color Stack includes a small **inspection-only** prototype: selecting a sample card lifts it and shows a valid/invalid Play state. It never sends a game intent or simulates a hand. Battleship also has a local fleet/target view toggle. Other controls illustrate intended layout only. Material/asset studies are original CSS/SVG, not a full production deck/sprite library.

### Documents

- [Current-state audit](CURRENT-STATE-AUDIT.md): supported states, current limitations, shipped 3.2 focus fixes, bot boundaries and open behavior decisions.
- [Reference analysis](REFERENCE-ANALYSIS.md): conceptual lessons from the named category references and deliberate original Playgrid differences. No competitor art copied or live competitor benchmark claimed.
- [Draft design system](DESIGN-SYSTEM.md): shared palette/typography, individual game materials, responsive intent and initial motion/audio direction.
- [Implementation handoff](IMPLEMENTATION-HANDOFF.md): approved scope, all eight client mappings, state requirements, motion, verification and completion checklist.
- [Asset provenance](ASSET-MANIFEST.json): new concept vectors and reused approved Playgrid assets.

### Reopen / render

From repository root, serve the repository with `python3 -m http.server`; open `design/playgrid-premium-games/index.html`. The package ZIP preserves the same `design/…` and reused `node-server/public/…` asset paths, so serve its extracted root similarly.

With Python Playwright and Chromium available, `python3 design/playgrid-premium-games/render-concepts.py` regenerates the 33 screenshots; `CHROMIUM_PATH` may point to another system Chromium. It starts only a temporary loopback docs server, never the app. Original revised artwork can be regenerated with `python3 design/playgrid-premium-games/asset-source/build-revision.py`; its board-reference JSON is review data only. `python3 design/playgrid-premium-games/check-revision.py` checks the revised inspection controls and saves the fleet phone view; `python3 design/playgrid-premium-games/package-review.py` rebuilds the review sheets and ZIP. The SVG sources are inspectable concept artwork; no production art pipeline is being installed.

## Implementation assignment

The approval gate is complete. Read [CLAUDE-TASK.md](CLAUDE-TASK.md) and [IMPLEMENTATION-HANDOFF.md](IMPLEMENTATION-HANDOFF.md). Claude must implement all eight in a separate frontend branch, finish production asset/state variants, test multiplayer and compare actual browser screenshots against these designs. This design branch changes no production code. Do not merge or deploy.
