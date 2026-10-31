# Playgrid 3.1 implementation coverage (issue #46)

Implements Sol's approved design (`codex/playgrid-3-1-game-design` @ 78bdf87) in the live client on top of Phase 2 (`d89486c`).
Presentation only: no server game logic, Socket.IO payloads, settings, lobby, voting, spectator queue, alpha gate or hidden games changed.

**New files:** `node-server/public/gameplay31.css` (loaded after `style.css`), `public/js/games/art31.js` (original SVG chess silhouettes, checkers crown, pip dice), `test/design31ui.js` (browser regression, added to `npm test`), `test/capture31.js` (screenshot helper).
**Edited renderers:** `chess.js`, `checkers.js`, `ludo.js`, `fourrow.js`, `pool.js` (canvas palette only).

## Honest scope statement

This is a first, partial pass. Games were restyled by family; many items in GAME-SPECS.md are **not** done (see gaps). Nothing here was playtested by a human or on a real device.

| # | Game | Implemented in this PR | Known gaps vs GAME-SPECS |
|---|------|------------------------|--------------------------|
| 1 | Draw & Guess | Shared focus/clock tokens only; Phase 2 canvas, tools and secrecy untouched | Paper/ink restyle, status-line word, cooldown copy, brush/eraser labels not redone |
| 2 | Four in a Row | Cobalt cabinet frame (raised edge, recessed slots), red/yellow disc tokens, translucent column preview on hover/focus, "Drop Red in column N" / "Column N is full" labels, 3px focus ring, persistent winning-cell outline | Drop-fall animation timing not retuned; out-of-turn "Nova's turn" message not added (disabled buttons receive no clicks) |
| 3 | Chess | Cream/slate board, 12 original SVG piece silhouettes (ivory/navy), selected ring, target dot, capture ring, last-move fill, check ring, larger promotion buttons | Move animation, check banner text, promotion dialog focus trap, Resign modal (#43) not done |
| 4 | Checkers | Layered timber/slate discs, concentric inset, crown for kings, same board palette | Multi-jump lock cue, capture fade, mandatory-capture status restyle not done |
| 5 | Ludo | Warm board, inset yard wells, raised numbered tokens, pip-face die (value from server), 44px "Token N · K steps" buttons | Travel animation, capture/home event sentences, star/safe vector not redone |
| 6 | Pool | Teal felt (#0A4848/#175B58), dark rails (canvas palette) | Aim/power rail relayout, ball sprite upgrades, event rail, reduced-motion final-state mode not done |
| 7 | Color Stack | Softened card faces with names, outlined playable cards, 20px pile gap, scrollable hand tray | "You are out · spectating" copy (#44) not done; 6px raise on selection not done |
| 8 | Go Fish | Shared tokens/focus only | Ocean tray, receipts not done |
| 9 | Word Chain | Shared only | Beacon/lives icons not done |
| 10 | Categories Rush | Shared only | Amber badge, progress dots not done |
| 11 | Tic Tac Toe | Navy tiles, sky X / amber O, heavier strokes, hover lift, 3px focus ring | Neutral draw styling, keyboard preview not done |
| 12 | Rock Paper Scissors | Shared only | Vector icons not done |
| 13 | Dots & Boxes | Indigo lattice, visible junction dots, bright active edge, 40px targets preserved | Owner-initial fills, extra-turn sentence not done |
| 14 | Word Scramble | Shared only | Ivory tile treatment not done |
| 15 | Trivia Blitz | 56px answers, ✓/✕ + words on right/wrong, "Locked in" cue on picked | Category label color not done |
| 16 | Drawing Telephone | Shared only | Chapter marker/timeline not done |
| 17 | Bluff Battle | Shared only | Editorial prompt styling not done |
| 18 | The Impostor | Shared only | Role card styling not done |
| 19 | Battleship | Chart-blue sea, hit/miss marks (dot for miss), aim outline | Ship silhouettes, precision view, Fire flow not done |
| 20 | Mini Golf | Shared only (palette already garden green) | Action rail reuse not done |
| 21 | Property Tycoon | Shared only | Map/Properties toggle, sheet not done |

"Shared" = 3px lime-tint focus ring, reduced-motion guard and CSS tokens from `gameplay31.css` (applies where renderers use the common classes).

## Follow-ups #42–#44
Not changed. #42 idle policy still needs the owner. #43 (Resign confirmation / logical focus) and #44 (out-spectating copy) remain open; board re-render still replaces DOM nodes.

## Verification
See the PR description for exact commands/results. Screenshots (1440×900 and 390×844, all 21 games, live client): `docs/screenshots/playgrid-3-1/<game>-<desktop|mobile>.png`.
Not verified: real devices, human playtesting, screen readers, 200% zoom, soft keyboard, motion timing.
