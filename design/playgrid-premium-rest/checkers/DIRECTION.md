# Checkers · Emerald House

**Approved direction · Stage B specification is in [SPEC.md](SPEC.md).** Source client: `node-server/public/js/games/checkers.js`. This active page illustrates one state; SPEC.md and the state sheets provide the complete design reference. It is not functional multiplayer.

## Creative direction

Polished jade/ivory discs, concentric inlay and a green/cream stone board. Material depth and visible move targets support a classic game without replacing the rules.

## Desktop and phone composition

Desktop board centered with player counts/details. Phone keeps the full square board, named side counts, selected-piece status and quiet Resign. Preserve board orientation and all keyboard alternatives.

## Rules and privacy boundary

The sample shows all 24 initial men; c3 is selected with b4/d4 targets. Material name Jade maps to existing Lime side; implementation must keep that identity explicit. Keep forced captures/multi-jump lock, kings and stable two-step resign/focus fixes.

## States specified in Stage B

Selected/available men; legal targets; mandatory capture; locked multi-jump piece; crown; blocked/lost pieces; draw/forfeit; resign confirmation; spectator/reconnect/rematch.

## Motion intent

Accepted slide ~180ms; captured piece fades ~120ms then clears; multi-jump lock persists visibly. Crown is an original inlay, not an emoji. Reduced motion snaps while keeping capture/king text. Use the event mapping in [MOTION.md](../MOTION.md) and accessibility contract in [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md).

## Review

[Desktop 1440×900](desktop.png) · [Phone 390×844](mobile.png) · [Narrow 360×740](narrow.png) · [Editable HTML](concept.html).

The owner has approved the visual direction and responsive composition. Claude should use SPEC.md and the shared implementation handoff. Shared shell, avatars, rooms, chat, rules and settings remain existing Playgrid behavior.
