# Rock Paper Scissors · Throwdown

**Stage A concept · not yet approved.** Source client: `node-server/public/js/games/rps.js`. This static page illustrates one supported state, not functional multiplayer or a finished state library.

## Creative direction

Electric blue duel stage, original illustrated fist/open-hand/V-hand throws and warm paper action cards. The bracket is supportive rather than the main event.

## Desktop and phone composition

Desktop: avatars and decisive VS over three equal throw cards; tournament rail right. Phone: same three 44px-plus action cards, compact semifinal/final rail below. Full 16-player bracket is a Stage B expansion requirement.

## Rules and privacy boundary

One tap locks the existing private pick. No extra confirmation, changing throws after lock, or hidden opponent hint. Opponent locked/no-throw states remain words; reveal both throws only from server reveal.

## States to finish after owner approval

Private pick/locked; opponent locked; simultaneous reveal; tie/void; bye/waiting; eliminated/spectator; 2–16-player bracket; champion; reconnect/rematch.

## Motion intent

Lock gets an immediate local acknowledgement; shared reveal follows the authoritative phase. Brief 250ms reveal is cosmetic, never a countdown that postpones the real result. These are direction-level timing suggestions; final event mapping and audio/accessibility sheets belong to Stage B after approval.

## Review

[Desktop 1440×900](desktop.png) · [Phone 390×844](mobile.png) · [Narrow 360×740](narrow.png) · [Editable HTML](concept.html).

Approve the visual direction and responsive composition before Claude implements it. Shared shell, avatars, rooms, chat, rules and settings remain existing Playgrid behavior.
