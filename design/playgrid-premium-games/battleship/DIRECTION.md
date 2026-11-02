# Battleship · Bluewater Command

**Approved creative direction. Implement using [the shared handoff](../IMPLEMENTATION-HANDOFF.md).**

## Identity

Nautical chart ink, calm water contours, original grey hulls, pale miss dots and warm hit crosses. Tactical rather than explosive.

## Composition

Revision: five distinct original top-down vessel assets replace generic rounded hulls: carrier with flight deck and aircraft, turreted battleship, destroyer, submarine and patrol vessel. Wakes, deck fittings and subtle ocean detail support a readable tactical grid. Phone fleet/target tabs switch views in the inspection prototype; the action returns to enemy waters while viewing friendly ships. This is local presentation only. The fleet roster is explicitly the local player’s fleet, not a disclosure of enemy positions.

Desktop friendly and enemy charts sit side by side. Phone gives the current targeting chart full width and a fleet tab; confirmed coordinate stays visible near Fire.

## Interaction boundary

Keep manual draft/rotate/lock and aim-then-Fire. Dense cells need a precision/keyboard alternative. Random fleet currently commits immediately; label truthfully, never invent a reroll phase without separate approval. Enemy silhouettes must not render through fog.

## Motion story · intent, not final specification

Reticle selects → accepted shot shows a brief ripple/impact → hit/miss/sunk receipt updates public fleet indicators. No speculative enemy data.

## Required implementation states

Placement/validation, locked/waiting, targeting/confirm, hit, miss, sunk, opponent turn, result, reconnect.

## Approved direction

Approved: twin-chart composition, detailed vessel artwork and quiet impact vocabulary; not new weapon effects or game rules.

Open [desktop](desktop.png), [tablet](tablet.png), [phone](mobile.png), [narrow phone](narrow.png) or [inspectable HTML](concept.html). Shared navigation returns to the same party; no lobby redesign is proposed.
