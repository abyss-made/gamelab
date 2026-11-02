# Word Chain · Chain Reaction

**Stage A concept · not yet approved.** Source client: `node-server/public/js/games/wordchain.js`. This static page illustrates one supported state, not functional multiplayer or a finished state library.

## Creative direction

An ivory starting-letter tile on deep blue, readable connected word ribbons and a compact life rail. The final letter is underlined as well as colored.

## Desktop and phone composition

Desktop input/letter workspace left and chain ledger right. Phone puts a compact history below the word form; history can scroll internally while input and Send remain visible.

## Rules and privacy boundary

ORCHARD→DRAGON→NECTAR→ROCKET→TIGER correctly leaves R. Draft river is not accepted until the engine says so. Keep min length, duplicate/dictionary checks, dead-letter handling and existing lives/elimination.

## States to finish after owner approval

First word; local/opponent turn; accepted word; invalid/repeated/short word; timeout/life loss; out/spectating; dead-letter restart; long chain; reconnect/result.

## Motion intent

New accepted word links into history (180ms); new required-letter tile updates with a named turn receipt. Preserve new-turn input focus and do not reset the timer when typing. These are direction-level timing suggestions; final event mapping and audio/accessibility sheets belong to Stage B after approval.

## Review

[Desktop 1440×900](desktop.png) · [Phone 390×844](mobile.png) · [Narrow 360×740](narrow.png) · [Editable HTML](concept.html).

Approve the visual direction and responsive composition before Claude implements it. Shared shell, avatars, rooms, chat, rules and settings remain existing Playgrid behavior.
