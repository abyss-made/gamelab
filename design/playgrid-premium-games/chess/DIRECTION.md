# Chess · Walnut & Ivory

**Approved creative direction. Implement using [the shared handoff](../IMPLEMENTATION-HANDOFF.md).**

## Identity

Cream/walnut 2D board, original existing Playgrid silhouette family, restrained ivory clocks and editorial move history.

## Composition

Give the square board most of the screen. Put independent clocks at opponent/local edges; desktop history is quiet and narrow, phone controls stay below the board.

## Interaction boundary

Tap a piece then a legal square; preserve existing keyboard focus and stable two-tap resign. Last-move, legal target, selected origin and check must remain distinct. Local board themes/captured-material tray are proposed presentation features to audit during implementation.

## Motion story · intent, not final specification

Accepted piece slide → capture/castling pair settles → check/promotion or final result appears. Only actual legal data and server clock/flag behavior decide outcomes.

## Required implementation states

Selection, legal/capture destinations, invalid, last move, check/mate, promotion, castling, opponent turn, draw offer/claim, resignation, game end, reconnect; limited BOT badge only for actual bot players.

## Approved direction

Approved: warm classic direction and board-first composition. Complete theme/piece exports, captured tray and promotion focus work belong to implementation.

Open [desktop](desktop.png), [tablet](tablet.png), [phone](mobile.png), [narrow phone](narrow.png) or [inspectable HTML](concept.html). Shared navigation returns to the same party; no lobby redesign is proposed.
