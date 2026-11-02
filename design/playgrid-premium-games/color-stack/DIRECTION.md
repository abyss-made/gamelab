# Color Stack · Neon Social Club

**Approved creative direction. Implement using [the shared handoff](../IMPLEMENTATION-HANDOFF.md).**

## Identity

Plum cloth, colored paper, angular graphic faces; a sociable arena rather than a dark dashboard.

## Composition

Revision: opponents hold visible face-down fans (4 / 6 / 3 cards), seated across a plum cloth table. A bespoke four-color geometric back, paper edges and stronger face typography make the table feel occupied. Counts remain public; ranks/colors never leak. In implementation, long opponent hands compress the fan and retain an exact text count.

Center the draw/discard relationship, surround it with opponent counts and make the private fan the dominant control. Lime marks intent, never recolors a card.

## Interaction boundary

Tap or focus inspects/lifts a card; an explicit Play action is an **approved client-flow change** over today’s immediate legal-card tap. Only server-playable cards can submit. Longer hands need an expanded, non-accidental selection tray in implementation.

## Motion story · intent, not final specification

Dealt backs enter seats → selected face lifts 6–14px → accepted face travels to discard. A +2/+4 uses a short counter/batch receipt, not a full-screen attack effect.

## Required implementation states

Waiting, dealing, local/opponent turn, valid/invalid selection, drawn playable card/keep-pass, wild color, special action, automatic one-card warning (not a new call rule), round result, eliminated/reconnect.

## Approved direction

Approved: the arena, angular card face and inspect-before-play direction; do not approve a branded oval deck or an UNO-call mechanic.

Open [desktop](desktop.png), [tablet](tablet.png), [phone](mobile.png), [narrow phone](narrow.png) or [inspectable HTML](concept.html). Shared navigation returns to the same party; no lobby redesign is proposed.
