# Dots & Boxes · Stitch & Claim

**Approved direction · Stage B specification is in [SPEC.md](SPEC.md).** Source client: `node-server/public/js/games/dotsboxes.js`. This active page illustrates one state; SPEC.md and the state sheets provide the complete design reference. It is not functional multiplayer.

## Creative direction

Grid-ruled linen, blue/coral stitched edges, joint dots and initialed claimed patches. A quiet craft-table identity replaces a glowing lattice.

## Desktop and phone composition

Desktop large centered 4×4 sample board and side counts. Phone keeps the full board, exact owner initials and extra-turn copy. Edge hit areas use 40px invisible targets, distinct from their thin visual lines.

## Rules and privacy boundary

Grid size remains configurable; do not hard-code the 4×4 sample. Every illustrative owned square is enclosed. Public ownership colors/initials come from engine state. Completing a box still grants the existing extra turn.

## States specified in Stage B

All supported grid sizes; focus/edge selection; taken edge; claim; multiple boxes; extra turn; opponent turn; final boxes/standings; spectator/reconnect/rematch.

## Motion intent

Accepted edge draws in about 140ms; newly enclosed patch resolves in 220ms with owner initial and textual extra-turn receipt. Snap both in reduced motion. Use the event mapping in [MOTION.md](../MOTION.md) and accessibility contract in [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md).

## Review

[Desktop 1440×900](desktop.png) · [Phone 390×844](mobile.png) · [Narrow 360×740](narrow.png) · [Editable HTML](concept.html).

The owner has approved the visual direction and responsive composition. Claude should use SPEC.md and the shared implementation handoff. Shared shell, avatars, rooms, chat, rules and settings remain existing Playgrid behavior.
