# Word Scramble · Letterworks

**Stage A concept · not yet approved.** Source client: `node-server/public/js/games/wordscramble.js`. This static page illustrates one supported state, not functional multiplayer or a finished state library.

## Creative direction

Ivory dimensional letter blocks, a teal letter rack, gentle rotations and an uncluttered typing strip. Original tabletop material without a copied tile logo or scoring system.

## Desktop and phone composition

Desktop letter workspace with compact standings. Phone centers the same letters and typed answer, with standings along the bottom. Preserve the input/Enter workflow; letter blocks are not a new drag-only mechanic.

## Rules and privacy boundary

CENAO is illustrative five-letter jumble data, not a hardcoded question. Only server reveal exposes the answer. Players may type while eligible; solved/locked and gain receipts are per player. No unsupported hint/reshuffle.

## States to finish after owner approval

All word lengths/difficulties; active typing; rejected guess; solved/locked; others still answering; time-up/reveal; score gain; long words; spectator/reconnect/results.

## Motion intent

Letter rack assembles once per question (180ms), never on each timer tick. Accepted solve gets a small textual gain chip; answer reveal is gated on the reveal phase. These are direction-level timing suggestions; final event mapping and audio/accessibility sheets belong to Stage B after approval.

## Review

[Desktop 1440×900](desktop.png) · [Phone 390×844](mobile.png) · [Narrow 360×740](narrow.png) · [Editable HTML](concept.html).

Approve the visual direction and responsive composition before Claude implements it. Shared shell, avatars, rooms, chat, rules and settings remain existing Playgrid behavior.
