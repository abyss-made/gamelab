# Playgrid 3.1 implementation coverage (issue #46)

Implements Sol's approved design (`codex/playgrid-3-1-game-design` @ 78bdf87) in the live client on top of Phase 2 (`d89486c`).
Presentation only: no server game logic, Socket.IO payloads, settings, lobby, voting, spectator queue, alpha gate or hidden games changed.

**New files:** `node-server/public/gameplay31.css` (loaded after `style.css`), `public/js/games/art31.js` (original SVG chess silhouettes, checkers crown, pip dice), `test/design31ui.js` (browser regression, added to `npm test`), `test/capture31.js` (screenshot helper).
**Edited renderers:** `drawguess.js`, `fourrow.js`, `chess.js`, `checkers.js`, `ludo.js`, `pool.js` and `golf.js` (canvas palette/status copy only), `rps.js`, `tycoon.js`. Two existing test assertions were updated for intentional design changes: RPS reveal now looks for the vector `[data-throw]` icon instead of the ✌ glyph (`batch1ui.js`), and the Tycoon trade test switches to the new phone "Properties & trades" view first (`batch5ui.js`).

## Honest scope statement

All 21 visible games now carry a 3.1 treatment, but this is a **CSS-led implementation**: games were restyled in place, with motion and new controls added where they could be done safely without touching server payloads. Items marked "gap" in the matrix are documented deviations from GAME-SPECS.md, not claims of full parity. Nothing here was playtested by a human or on a real device.

| # | Game | Implemented | Gaps vs GAME-SPECS / HANDOFF |
|---|------|-------------|------------------------------|
| 1 | Draw & Guess | Labelled tool buttons (Brush/Eraser/Fill/Undo/Clear), numeric size readout with tool name, 44px tools, outside-ring swatch selection + aria-pressed, 3px focus rings, 2×3 44px word choices, low-clock amber, paper-edge canvas. Phase 2 canvas geometry, fill/replay speed, persisted sizes and secret isolation untouched and still pass `phase2ui` | Fill cursor ring, rejected-history cooldown copy (server drops silently), non-blocking Clear confirmation (still native `confirm`, which tests depend on), word-in-status layout on phone |
| 2 | Four in a Row | Cobalt cabinet, hover/focus column preview, labelled columns ("Drop Red in column N", "Column N is full"), 220ms fall + settle drop, persistent winning outline, 3px focus ring | Out-of-turn "Nova's turn" message (disabled buttons get no clicks); server-supplied landing-row animation uses existing per-cell `--fall`, not a new protocol |
| 3 | Chess | Cream/slate board, 12 SVG silhouettes, selected ring / dot / capture ring / last-move fill / check ring, check banner with icon and words, 180ms confirmed-move slide (snaps under reduced motion), larger promotion buttons | Dual-clock active border, capture-removal fade, promotion focus trap, Resign modal (#43) |
| 4 | Checkers | Layered timber/slate discs, concentric inset, crowns, same board palette, 180ms confirmed-move slide | Capture fade, multi-jump lock visual, mandatory-capture banner restyle |
| 5 | Ludo | Inset yard wells, raised numbered tokens, pip die (sr-only value), 44px "Token N · K steps" buttons, confirmed-token step animation, safe-cell ring | Per-step track travel, capture-return animation, star/safe vector glyphs, stacked-token states |
| 6 | Pool | Teal felt, dark rails, one Aim/Power/Shoot rail on desktop, "Shot in motion…" status, honest-physics unchanged | Ball sprite upgrade, event rail, skip-to-final, reduced-motion final-state summary |
| 7 | Color Stack | Softened card faces with names, wild quarter-colour face, outlined playable cards, 20px pile gap, scrolling hand tray | 6px selection raise, "You are out · spectating" copy (#44), penalty-draw batch animation |
| 8 | Go Fish | Ocean-blue table, scrolling hand tray, ask-row divider | Separate receipts (asked / go fish / book / turn), rank-then-target restyle |
| 9 | Word Chain | Violet beacon panel, glowing letter, 48px input + focus ring, accent lives | Dead-letter reset sentence, new-turn focus move |
| 10 | Categories Rush | Amber letter badge, 44px fields with focus rings, progress dots | Read-only review rows restyle |
| 11 | Tic Tac Toe | Navy tiles, sky X / amber O, hover lift, 3px focus ring | Neutral draw styling, uncommitted keyboard preview |
| 12 | Rock Paper Scissors | Original vector rock/paper/scissors, equal-width duel, "Locked ✓" and "No throw" text receipts, wrapped long names | Bracket compaction |
| 13 | Dots & Boxes | Indigo lattice, junction dots, bright active edge, 40px targets preserved | Owner-initial fills, extra-turn sentence |
| 14 | Word Scramble | Ivory raised letter tiles, 48px input | Accepted-answer chips |
| 15 | Trivia Blitz | 56px answers, ✓/✕ + words on right/wrong, "Locked in" cue, mint category | — |
| 16 | Drawing Telephone | Pink chapter marker/prompt rule, chain counter hook, swatch borders | Numbered timeline thumbnails |
| 17 | Bluff Battle | Violet prompt, 52px equal-weight answers, focus rings | Lock-vote receipt copy |
| 18 | The Impostor | Mauve role card, wrapped clue timeline, 44px vote buttons; no secret markup added (server view only) | Phase-by-phase layouts |
| 19 | Battleship | Chart-blue sea, hit X / miss dot, ship hull fill, aim crosshair, sunk colour kept (Codex fix), focus rings | Ship silhouettes, precision/focus view, "Randomize & Lock" label |
| 20 | Mini Golf | Cream curb, shared Aim/Power/Putt rail | Sand/obstacle textures, scorecard "–" for left players |
| 21 | Property Tycoon | Cream perimeter, focus rings, phone Map / Properties & trades switch, no-wrap cash | Auction/trade single sheet, owner initials on tiles |

## Follow-ups #42–#44
Not changed. #42 idle policy still needs the owner. #43 (Resign confirmation / logical focus) and #44 (out-spectating copy) remain open; boards still replace DOM nodes on update.

## Verification
See the PR description for exact commands/results. Screenshots (1440×900 and 390×844, all 21 games, live client): `docs/screenshots/playgrid-3-1/<game>-<desktop|mobile>.png`.
Not verified: real devices, human playtesting, screen readers, 200% zoom, soft keyboard, motion timing.
