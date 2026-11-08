## Problem and result

The production Avatar Studio was a compact dropdown form, invitation links admitted generated identities, and desktop drawing could extend below the viewport or hide social information in focus mode. This change integrates a visual character editor and deliberate invite confirmation into the real multiplayer app, fits desktop drawing to the viewport, and keeps players/chat alongside it.

**Artwork scope:** all 35 existing bases are refined; all 32 supporting characters have individual costume/construction details. This is not a completed bespoke redraw of all 35 characters. The remaining creative gap is documented explicitly.

Refs #64 and #65; builds on merged PR #63. Target: `codex/playgrid-2-redesign`. Do not merge or deploy without the owner's visual approval.

## Implemented

- Searchable 35-character gallery, live preview, visual accessories, color/expression/eye controls, Undo/Reset/Randomize/Save, keyboard focus retention and mobile layouts. Existing saved v3 and classic avatars remain compatible.
- New-player Save & Join and returning-player Confirm & Join/Edit flows across direct/hash/code invites. Existing room tokens survive refresh; failed room switches preserve the old seat.
- Viewport-fitting 4:3 desktop Draw & Guess, complete tool rail and persistent social information in default/expanded/global focus. Separate laptop board/control improvements for Pool, Golf, Battleship setup, Ludo and Property Tycoon.
- Glowing navbar Return to Game, compact mobile equivalent and retained lower return card.
- Disabled-by-default, centrally configured, consent-aware ad mounts that collapse on smaller/hidden screens. No real ads, IDs or external SDK injected.

## Actual screenshots

[Before / after comparisons](https://github.com/abyss-made/gamelab/blob/codex/playgrid-4-production/docs/playgrid-4/COMPARISON.md) · [All 148 PNGs / six-size game matrix](https://github.com/abyss-made/gamelab/blob/codex/playgrid-4-production/docs/playgrid-4/SCREENSHOTS.md)

| View | Desktop | Phone |
|---|---|---|
| Creator | [1440 × 900](https://github.com/abyss-made/gamelab/blob/codex/playgrid-4-production/docs/playgrid-4/screenshots/studio-1440.png) | [390 × 844](https://github.com/abyss-made/gamelab/blob/codex/playgrid-4-production/docs/playgrid-4/screenshots/studio-390.png) |
| Customize | [Desktop](https://github.com/abyss-made/gamelab/blob/codex/playgrid-4-production/docs/playgrid-4/screenshots/studio-looks-1440.png) | [Phone](https://github.com/abyss-made/gamelab/blob/codex/playgrid-4-production/docs/playgrid-4/screenshots/studio-looks-390.png) |
| New invitation | [Desktop](https://github.com/abyss-made/gamelab/blob/codex/playgrid-4-production/docs/playgrid-4/screenshots/invite-new-1440.png) | [Phone](https://github.com/abyss-made/gamelab/blob/codex/playgrid-4-production/docs/playgrid-4/screenshots/invite-new-390.png) |
| Returning invitation | [Desktop](https://github.com/abyss-made/gamelab/blob/codex/playgrid-4-production/docs/playgrid-4/screenshots/invite-returning-1440.png) | [Phone](https://github.com/abyss-made/gamelab/blob/codex/playgrid-4-production/docs/playgrid-4/screenshots/invite-returning-390.png) |
| Draw & Guess | [1366 × 768](https://github.com/abyss-made/gamelab/blob/codex/playgrid-4-production/docs/playgrid-4/screenshots/drawing-1366.png) | [Phone](https://github.com/abyss-made/gamelab/blob/codex/playgrid-4-production/docs/playgrid-4/screenshots/drawing-390.png) |

## Validation

See [validation records](https://github.com/abyss-made/gamelab/blob/codex/playgrid-4-production/docs/playgrid-4/VALIDATION.md) and AUTOMATED_TESTS.txt for exact commands/results. Browser checks cover all 20 active games at six sizes, primary desktop bounds, actual multiplayer avatar persistence, invite/reconnect paths, real remote drawing/undo coordinates and ad lifecycle. Independent Codex review findings were addressed; see REVIEW.md.

## Integration limits

Production authentication/game rules/homepage illustration are preserved. Chromium was used locally; the live Render URL was blocked by this environment's gateway. Phones retain vertical scrolling for longer content. The ad SDK/CMP and live serving are intentionally not enabled. The 35-character full illustration redraw remains incomplete; this branch provides real integrated functionality and an honest visual review package.
