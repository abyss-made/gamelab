# Draw & Guess · Sketch Club

**Stage A concept · not yet approved.** Source client: `node-server/public/js/games/drawguess.js`. This static page illustrates one supported state, not functional multiplayer or a finished state library.

## Creative direction

Warm paper, precise ink, quiet teal controls and an original dragon drawing. The canvas is the star; brand lime marks the private prompt and selected tool, not every surface.

## Desktop and phone composition

Desktop: vertical tool rail, central 4:3 canvas, right prompt/players/guess feed. Phone: compact private prompt above the full-width canvas; five tools, all 22 colors and size beneath; public chat below. Preserve real focus mode and guesser/spectator views without drawer-only tools.

## Rules and privacy boundary

The sample word and drawing are local drawer-view examples. Guesser and spectator views receive no word/choice markup. Reuse the 800×600 stroke/fill model, brush/eraser memory, undo/clear cooldowns and six-choice privacy. This page is not a drawing implementation.

## States to finish after owner approval

Six-word private choice; drawing; guessing; accepted/rejected guess; fill/undo/clear; tool size; time-up; round reveal/podium; focus mode; long chat/keyboard; spectator/reconnect.

## Motion intent

Ink follows the pointer directly; accepted guesses get a restrained named receipt. Low time changes text/accent, never flashing. Do not delay real strokes behind entrance animation. These are direction-level timing suggestions; final event mapping and audio/accessibility sheets belong to Stage B after approval.

## Review

[Desktop 1440×900](desktop.png) · [Phone 390×844](mobile.png) · [Narrow 360×740](narrow.png) · [Editable HTML](concept.html).

Approve the visual direction and responsive composition before Claude implements it. Shared shell, avatars, rooms, chat, rules and settings remain existing Playgrid behavior.
