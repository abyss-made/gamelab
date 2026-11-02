# Tic Tac Toe · Cross & Circle

**Approved direction · Stage B specification is in [SPEC.md](SPEC.md).** Source client: `node-server/public/js/games/tictactoe.js`. This active page illustrates one state; SPEC.md and the state sheets provide the complete design reference. It is not functional multiplayer.

## Creative direction

Ivory ceramic squares, softened blue crosses and coral rings. Deep green/navy surroundings let a small game feel considered rather than empty.

## Desktop and phone composition

Desktop: large compact ceramic board centered with restrained player details. Phone: duel then full board, turn strip and clear X/O names. Occupied marks keep full contrast.

## Rules and privacy boundary

Use the existing 3×3 board and immediate empty-square selection. The sample has two Xs/two Os and X to play. Do not add hints, arbitrary best-of rules or a new confirm step.

## States specified in Stage B

Empty/occupied square; hover/focus; local/opponent turn; accepted mark; win-line/draw/forfeit; winner-stays; spectator/reconnect/rematch.

## Motion intent

Accepted mark appears with a brief 160ms material emphasis; persistent line and text identify the winner. Draw uses neutral text, not victory confetti. Use the event mapping in [MOTION.md](../MOTION.md) and accessibility contract in [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md).

## Review

[Desktop 1440×900](desktop.png) · [Phone 390×844](mobile.png) · [Narrow 360×740](narrow.png) · [Editable HTML](concept.html).

The owner has approved the visual direction and responsive composition. Claude should use SPEC.md and the shared implementation handoff. Shared shell, avatars, rooms, chat, rules and settings remain existing Playgrid behavior.
