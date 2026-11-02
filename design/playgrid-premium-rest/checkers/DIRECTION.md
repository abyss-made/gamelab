# Checkers · Emerald House

**Stage A concept · not yet approved.** Source client: `node-server/public/js/games/checkers.js`. This static page illustrates one supported state, not functional multiplayer or a finished state library.

## Creative direction

Polished jade/ivory discs, concentric inlay and a green/cream stone board. Material depth and visible move targets support a classic game without replacing the rules.

## Desktop and phone composition

Desktop board centered with player counts/details. Phone keeps the full square board, named side counts, selected-piece status and quiet Resign. Preserve board orientation and all keyboard alternatives.

## Rules and privacy boundary

The sample shows all 24 initial men; c3 is selected with b4/d4 targets. Material name Jade maps to existing Lime side; implementation must keep that identity explicit. Keep forced captures/multi-jump lock, kings and stable two-step resign/focus fixes.

## States to finish after owner approval

Selected/available men; legal targets; mandatory capture; locked multi-jump piece; crown; blocked/lost pieces; draw/forfeit; resign confirmation; spectator/reconnect/rematch.

## Motion intent

Accepted slide ~180ms; captured piece fades ~120ms then clears; multi-jump lock persists visibly. Crown is an original inlay, not an emoji. Reduced motion snaps while keeping capture/king text. These are direction-level timing suggestions; final event mapping and audio/accessibility sheets belong to Stage B after approval.

## Review

[Desktop 1440×900](desktop.png) · [Phone 390×844](mobile.png) · [Narrow 360×740](narrow.png) · [Editable HTML](concept.html).

Approve the visual direction and responsive composition before Claude implements it. Shared shell, avatars, rooms, chat, rules and settings remain existing Playgrid behavior.
