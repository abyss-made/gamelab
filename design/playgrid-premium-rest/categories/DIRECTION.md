# Categories Rush · The Fieldbook

**Approved direction · Stage B specification is in [SPEC.md](SPEC.md).** Source client: `node-server/public/js/games/categories.js`. This active page illustrates one state; SPEC.md and the state sheets provide the complete design reference. It is not functional multiplayer.

## Creative direction

Original fieldbook stationery, numbered lines, a strong green letter tab and quiet autosave/lock explanation. Five private answers get a readable form rather than five dark cards.

## Desktop and phone composition

Desktop ruled form with nearby standings; phone keeps the five categories on one sheet, actual input labels, Done action and private-draft note. Soft-keyboard and long-category variants are included in Stage B.

## Rules and privacy boundary

Exactly five categories per existing round. Four sample B answers are drafts, not validated answers. Autosave must preserve drafts; Done is the existing final server lock. Other answers remain private until review. Unique=2/matching=1 scoring is unchanged.

## States specified in Stage B

Answering; autosave pending/accepted/error; five filled/empty fields; Done/locked; spectator; review table with unique/matching/invalid; next round; reconnect/results.

## Motion intent

Draft acknowledgement is subtle and textual, not a green correctness tick. Lock transitions to read-only after acknowledgement; review scores reveal only on the review phase. Use the event mapping in [MOTION.md](../MOTION.md) and accessibility contract in [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md).

## Review

[Desktop 1440×900](desktop.png) · [Phone 390×844](mobile.png) · [Narrow 360×740](narrow.png) · [Editable HTML](concept.html).

The owner has approved the visual direction and responsive composition. Claude should use SPEC.md and the shared implementation handoff. Shared shell, avatars, rooms, chat, rules and settings remain existing Playgrid behavior.
