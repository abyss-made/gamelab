# Rock Paper Scissors · Throwdown

**Approved direction · Stage B specification is in [SPEC.md](SPEC.md).** Source client: `node-server/public/js/games/rps.js`. This active page illustrates one state; SPEC.md and the state sheets provide the complete design reference. It is not functional multiplayer.

## Creative direction

Electric blue duel stage, original illustrated fist/open-hand/V-hand throws and warm paper action cards. The bracket is supportive rather than the main event.

## Desktop and phone composition

Desktop: avatars and decisive VS over three equal throw cards; tournament rail right. Phone: same three 44px-plus action cards, compact semifinal/final rail below. The full 16-player bracket is included in the Stage B state sheets.

## Rules and privacy boundary

One tap locks the existing private pick. No extra confirmation, changing throws after lock, or hidden opponent hint. Opponent locked/no-throw states remain words; reveal both throws only from server reveal.

## States specified in Stage B

Private pick/locked; opponent locked; simultaneous reveal; tie/void; bye/waiting; eliminated/spectator; 2–16-player bracket; champion; reconnect/rematch.

## Motion intent

Lock gets an immediate local acknowledgement; shared reveal follows the authoritative phase. Brief 250ms reveal is cosmetic, never a countdown that postpones the real result. Use the event mapping in [MOTION.md](../MOTION.md) and accessibility contract in [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md).

## Review

[Desktop 1440×900](desktop.png) · [Phone 390×844](mobile.png) · [Narrow 360×740](narrow.png) · [Editable HTML](concept.html).

The owner has approved the visual direction and responsive composition. Claude should use SPEC.md and the shared implementation handoff. Shared shell, avatars, rooms, chat, rules and settings remain existing Playgrid behavior.
