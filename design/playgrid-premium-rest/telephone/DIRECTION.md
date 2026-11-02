# Drawing Telephone · Paper Relay

**Approved direction · Stage B specification is in [SPEC.md](SPEC.md).** Source client: `node-server/public/js/games/telephone.js`. This active page illustrates one state; SPEC.md and the state sheets provide the complete design reference. It is not functional multiplayer.

## Creative direction

Coral paper studio, layered page edges, original cat-baker example drawing and a numbered relay spine. The prior private text source has its own small paper brief.

## Desktop and phone composition

Desktop large 4:3 page with left tools and right current brief/readiness/Done. Phone gives the current brief above the page, tools below and explicit Done. Work view contains no early chain thumbnails.

## Rules and privacy boundary

The sample is draw step 2 of a four-player relay. Only the current source is visible. Keep prompt/draw/guess sequence, 800×600 canvas, exact tool colors, three size presets, drawing caps and server-acknowledged lock. Like rules/own entry restrictions remain.

## States specified in Stage B

Initial prompt; draw; describe; empty/rejected/limit state; Done pending/ack; waiting; staged chain reveal/likes; skipped entries; long text; spectator/reconnect/results.

## Motion intent

Done briefly seals the page only after acceptance. At final reveal, each authorized entry joins a numbered paper timeline (200–300ms). Never animate future entries before receipt. Use the event mapping in [MOTION.md](../MOTION.md) and accessibility contract in [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md).

## Review

[Desktop 1440×900](desktop.png) · [Phone 390×844](mobile.png) · [Narrow 360×740](narrow.png) · [Editable HTML](concept.html).

The owner has approved the visual direction and responsive composition. Claude should use SPEC.md and the shared implementation handoff. Shared shell, avatars, rooms, chat, rules and settings remain existing Playgrid behavior.
