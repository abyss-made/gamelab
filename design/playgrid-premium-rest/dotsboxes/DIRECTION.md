# Dots & Boxes · Stitch & Claim

**Stage A concept · not yet approved.** Source client: `node-server/public/js/games/dotsboxes.js`. This static page illustrates one supported state, not functional multiplayer or a finished state library.

## Creative direction

Grid-ruled linen, blue/coral stitched edges, joint dots and initialed claimed patches. A quiet craft-table identity replaces a glowing lattice.

## Desktop and phone composition

Desktop large centered 4×4 sample board and side counts. Phone keeps the full board, exact owner initials and extra-turn copy. Edge hit areas use 40px invisible targets, distinct from their thin visual lines.

## Rules and privacy boundary

Grid size remains configurable; do not hard-code the 4×4 sample. Every illustrative owned square is enclosed. Public ownership colors/initials come from engine state. Completing a box still grants the existing extra turn.

## States to finish after owner approval

All supported grid sizes; focus/edge selection; taken edge; claim; multiple boxes; extra turn; opponent turn; final boxes/standings; spectator/reconnect/rematch.

## Motion intent

Accepted edge draws in about 140ms; newly enclosed patch resolves in 220ms with owner initial and textual extra-turn receipt. Snap both in reduced motion. These are direction-level timing suggestions; final event mapping and audio/accessibility sheets belong to Stage B after approval.

## Review

[Desktop 1440×900](desktop.png) · [Phone 390×844](mobile.png) · [Narrow 360×740](narrow.png) · [Editable HTML](concept.html).

Approve the visual direction and responsive composition before Claude implements it. Shared shell, avatars, rooms, chat, rules and settings remain existing Playgrid behavior.
