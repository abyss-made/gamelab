# Go Fish · The Marine Salon

**Approved creative direction. Implement using [the shared handoff](../IMPLEMENTATION-HANDOFF.md).**

## Identity

Engraved-fish card backs, ivory rank/suit faces and a sea-glass social cloth; original marine motifs, not children’s emoji cards.

## Composition

Revision: two opponents now hold six and four visible face-down cards across the table. Original engraved backs match the pond; face cards use a separate fish engraving with readable rank and suit, including distinct suits for the two sevens. A stitched sea-glass table, book stacks and fanned private hand create a physical card-game scene.

Opponents gather around the pond. Books get a small collection area. The large hand and explicit Rank → Player → Ask rail stay connected; phone uses large rank choices instead of a tiny-card guessing gesture.

## Interaction boundary

Ask only for a rank held, from a valid opponent. Card faces in others’ hands remain private. Inspecting cards does not submit; asking is explicit. Longer hands become grouped-rank expansion in implementation, without losing suits or counts.

## Motion story · intent, not final specification

Request travels as a named receipt → authorized transfer or Go Fish draw → fourth matching card gathers into a public book. No inferred hidden ranks.

## Required implementation states

Rank selection, target, ask, successful transfer, Go Fish draw, book, opponent turn, final books, disconnect/reconnect.

## Approved direction

Approved: marine engraving, social seating and rank-first ask controls. The back and sample face are direction studies; the complete original deck must be completed during implementation.

Open [desktop](desktop.png), [tablet](tablet.png), [phone](mobile.png), [narrow phone](narrow.png) or [inspectable HTML](concept.html). Shared navigation returns to the same party; no lobby redesign is proposed.
