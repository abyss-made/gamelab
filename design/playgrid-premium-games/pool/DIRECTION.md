# Pool · The Walnut Room

**Approved creative direction. Implement using [the shared handoff](../IMPLEMENTATION-HANDOFF.md).**

## Identity

Warm walnut, jewel-green felt, brass/ivory rail diamonds and small contact shadows. A precise competitive table, not a card-style panel.

## Composition

Use one dominant horizontal table on desktop and an upright-numbered portrait rendering on phone. Player groups live outside cloth; fine aim and power stay below/right. Landscape remains available.

## Interaction boundary

Aiming avoids a finger obscuring the ball. Fine angle controls, separate power, existing Shoot and ball-in-hand lock remain. Portrait orientation requires inverse coordinate mapping in a future client; **no physics change**.

## Motion story · intent, not final specification

Cue draws back → accepted strike replays server frames → pocket/foul receipt settles beside the player assignment. Decorative rotation cannot become spin physics.

## Required implementation states

Break, placement/lock, aim, power, resolving, foul, groups assigned, opponent turn, result and reconnect. Unsupported spin, jump/masse, called pockets and extended aiming assistance stay absent.

## Approved direction

Approve wood/green material and portrait/landscape presentation. The rendered vectors are styling references, not a replacement simulation.

Open [desktop](desktop.png), [tablet](tablet.png), [phone](mobile.png), [narrow phone](narrow.png) or [inspectable HTML](concept.html). Shared navigation returns to the same party; no lobby redesign is proposed.
