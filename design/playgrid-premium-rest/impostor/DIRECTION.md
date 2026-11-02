# The Impostor · Confidential Club

**Approved direction · Stage B specification is in [SPEC.md](SPEC.md).** Source client: `node-server/public/js/games/impostor.js`. This active page illustrates one state; SPEC.md and the state sheets provide the complete design reference. It is not functional multiplayer.

## Creative direction

Private cream dossier over midnight blue, confidential stamp and a clean public clue ledger. Public avatars reveal participation only, never role.

## Desktop and phone composition

Desktop local role folder beside public clues and the active clue field. Phone has a compact role card and readable clue ledger before the form. Discussion/vote/last-chance need distinct Stage B compositions.

## Rules and privacy boundary

The sample is a local crew view of CANDLE/Household Items. Impostors receive category only; spectators get no secret. Cover word is a proposed local privacy view control, not server/security logic. Clue turns, ready, votes, caught guess and result remain existing actions.

## States specified in Stage B

Crew/impostor/spectator role views; clue local/opponent turn; long clues; discussion/chat/ready; vote locked; caught last guess; result/void round; reconnect/round transition.

## Motion intent

Private role reveal uses a short 180ms local opening; cover snaps immediately. Public phase changes use text and a stable heading. No animated tells or styling differences revealing other players’ roles. Use the event mapping in [MOTION.md](../MOTION.md) and accessibility contract in [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md).

## Review

[Desktop 1440×900](desktop.png) · [Phone 390×844](mobile.png) · [Narrow 360×740](narrow.png) · [Editable HTML](concept.html).

The owner has approved the visual direction and responsive composition. Claude should use SPEC.md and the shared implementation handoff. Shared shell, avatars, rooms, chat, rules and settings remain existing Playgrid behavior.
