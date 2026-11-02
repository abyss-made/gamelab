# Bluff Battle · The Velvet Lie

**Approved direction · Stage B specification is in [SPEC.md](SPEC.md).** Source client: `node-server/public/js/games/bluff.js`. This active page illustrates one state; SPEC.md and the state sheets provide the complete design reference. It is not functional multiplayer.

## Creative direction

Plum salon, warm numbered answer slips and restrained theatrical lighting. Each anonymous option gets equal visual weight. The only own-option label is permitted private local knowledge.

## Desktop and phone composition

Desktop two columns of answer slips under a large prompt. Phone uses a simple vertical ballot, persistent timer and clear one-vote lock copy. All options must remain reachable when more players contribute.

## Rules and privacy boundary

The #/octothorpe question is from the current bank; sample distractors are illustrative. No real-answer mark, author avatar, popularity or voter counts appear before reveal. Own bluff stays disabled. Duplicate bluffs/authors retain engine behavior.

## States specified in Stage B

Write bluff; invalid/accepted fake; anonymous vote; own/locked/unavailable option; duplicate options; truth/authors/voters/gains reveal; no bluffs/timeout; spectator/reconnect/results.

## Motion intent

Lock receipt is immediate. Author labels and truth accent unfold together only on authoritative reveal, with 250ms paper emphasis; no visual clue before reveal. Use the event mapping in [MOTION.md](../MOTION.md) and accessibility contract in [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md).

## Review

[Desktop 1440×900](desktop.png) · [Phone 390×844](mobile.png) · [Narrow 360×740](narrow.png) · [Editable HTML](concept.html).

The owner has approved the visual direction and responsive composition. Claude should use SPEC.md and the shared implementation handoff. Shared shell, avatars, rooms, chat, rules and settings remain existing Playgrid behavior.
