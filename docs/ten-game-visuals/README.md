# Playgrid — ten-game visual revision

[Actual before/after gallery](index.html) · [Full-size screenshots](SCREENSHOTS.md) · [Claude handoff](HANDOFF.md) · [Validation](VALIDATION.md)

This implements the requested visual revision in the existing `node-server` frontend. It includes both earlier functional polish batches and adds original artwork, materials and responsive compositions for all ten games. The homepage and platform identity remain intact.

The **before baseline is ae3000a**, which combines the previous Batch 1 and Batch 2 frontends. Comparing against older production would conceal how much this revision adds to the work already reviewed. Names, cards, roles and turn order are random, so opening captures compare layout/art rather than identical deals.

| Game | Concrete visual changes | Existing interactions retained |
|---|---|---|
| Mini Golf | Illuminated botanical night course, layered foliage and flower beds, mint fairway, slate walls, pale shot desk | Native course geometry, accurate server replay, placement, aim/power, contact and cup effects |
| Pool | Cobalt cloth, beveled cushions, recessed stitched pockets, metal rails and sights; desktop shot desk beside the table | Rotated phone table and inverse pointer mapping, cue placement, fine aim, power presets, authoritative shot replay and pocket feedback |
| Property Tycoon | Original isometric waterfront city, printed ivory board, tile icon family, compact district bands, readable account cards | Server dice, token movement, ownership, money changes, contextual purchase, trades and deed details |
| Go Fish | Thirteen rank-specific fish illustrations, navy/gold marine backs, ocean chart surface, defined pond/books/hand/ask areas | Private own cards, public opponent backs, direct rank selection, named Ask, real transfers and completed-book toast |
| Ludo | Original rocket pieces, orbital crest, four shaded launch stations, contrasting printed track and dice console | Actual legal moves, routed token animation, captures, dice and home feedback |
| Battleship | Five original detailed vessels, ocean cartography, distinct targeting and fleet charts, warm impact marks | Mouse/touch fleet placement, rotation, validity preview, deliberate Fire and public sunk-ship feedback |
| Color Stack | New geometric backs and ivory faces, oversized actual values, special-action symbols, rectangular playmat | Opponent hands remain face down; explicit selection/Play, public card flights, draw feedback and accessible wild dialog |
| The Impostor | Private dossier cards, original mask/fingerprint insignia, lined field-notes panel, readable voting cards | Hide/Reveal, real clue/discussion phases, explicit vote confirmation and server-confirmed reveal |
| Chess | Twelve original sculpted SVG pieces, ink-green/ivory board, restrained frame, player clocks and notes | Server legal moves, mouse/touch dragging, tap fallback, check/capture feedback and accessible promotion |
| Drawing Telephone | Bound sketchbook canvas, reusable vector tool icons, vertical desktop tool rail, touch-sized mobile palette and Done control | Native drawing coordinates, same-round canvas retention, stable public reveal entries, reactions and revealed-entry navigation |

## Assets and scope

39 standalone original SVG files live in `node-server/public/assets/ten/`. `build-art.py` regenerates them using Python's standard library. Chess pieces and drawing-tool symbols are original inline SVGs in `ten-art.js`; Pool/Golf use native canvas rendering. No stock imagery, emoji artwork substitutes, remote asset services or new runtime dependencies are added.

The edition names label the visual treatments; they do not rename game IDs or create separate games. Server rules, physics, scoring, private-state boundaries and networking remain unchanged. Existing synthesized sounds and bounded animation helpers from both previous batches remain active. No homepage, avatar or benchmark-game redesign is included.

## Review limits

These are implemented stylized 2D visuals, not a claim to photorealism or parity with commercial native titles. Phone and short landscape screens scroll vertically when necessary. Tycoon is a compact board overview; selecting a tile opens its complete name, price and rent details. Opponent cards/roles and unsunk enemy ships are never exposed for visual effect.

Browser evidence uses Chromium on Linux, including native CDP touch events. Physical devices, Safari/Firefox and sustained-frame-rate measurement remain untested. Full normal-match victory coverage is not claimed: the result captures are actual departure/forfeit endings. The existing rules' limits, refresh loss of unsent Telephone drafts, and observed-only Chess capture history remain unchanged.

Nothing is merged or deployed. Review the gallery and source branch before integration.
