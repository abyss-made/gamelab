# Four in a Row · Drop Society

**Approved direction · Stage B specification is in [SPEC.md](SPEC.md).** Source client: `node-server/public/js/games/fourrow.js`. This active page illustrates one state; SPEC.md and the state sheets provide the complete design reference. It is not functional multiplayer.

## Creative direction

A sculpted cobalt cabinet with coral-red and amber discs, inset holes, timber base and readable column numbers. Disc color stays a named player identity.

## Desktop and phone composition

Desktop board dominates with player/rule details at the sides. Phone places the named Red/Yellow duel above the 7×6 cabinet and the turn receipt below. Keep whole columns as focusable move targets.

## Rules and privacy boundary

Drop is still the existing immediate column action, never a fake landing-row picker. Full columns and out-of-turn input are unavailable. Preview is cosmetic only. The illustrative sample has six discs of each color and Red to move.

## States specified in Stage B

Empty board; hover/focus preview; valid/full column; drop/turn change; opponent turn; persistent win line; draw/forfeit; winner-stays; spectator/reconnect/rematch.

## Motion intent

Accepted drop falls into the authoritative destination in about 220ms, settles once and leaves persistent last-move/win outlines; reduced motion snaps to the slot. Use the event mapping in [MOTION.md](../MOTION.md) and accessibility contract in [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md).

## Review

[Desktop 1440×900](desktop.png) · [Phone 390×844](mobile.png) · [Narrow 360×740](narrow.png) · [Editable HTML](concept.html).

The owner has approved the visual direction and responsive composition. Claude should use SPEC.md and the shared implementation handoff. Shared shell, avatars, rooms, chat, rules and settings remain existing Playgrid behavior.
