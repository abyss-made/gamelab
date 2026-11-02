# Trivia Blitz · Orbit Quiz

**Stage A concept · not yet approved.** Source client: `node-server/public/js/games/trivia.js`. This static page illustrates one supported state, not functional multiplayer or a finished state library.

## Creative direction

Luminous blue quiz stage and four jewel-color numbered answer panels. Type, spacing and bold choices carry the drama; no proprietary Kahoot icon set or logo.

## Desktop and phone composition

Desktop two-column answers under a large question and ten-step progress. Phone uses four full-width answer rows and a compact player rail. Text wraps before shrinking; 1–4 shortcuts remain.

## Rules and privacy boundary

The Everest question is from the existing bank; the pictured ask phase does not mark the right answer. One choice locks immediately. Other picks and the correct index stay hidden until server reveal. No lifelines or fake scoring.

## States to finish after owner approval

Category/question; asking; locked/answered count; right/wrong/no-answer reveal; streak/gain; long questions/answers; spectator/reconnect; standings/results.

## Motion intent

Answer lock is immediate and named. On reveal, show Correct/Wrong text plus symbol/outline, not color alone. Animate outcome for 220ms without changing the answer deadline. These are direction-level timing suggestions; final event mapping and audio/accessibility sheets belong to Stage B after approval.

## Review

[Desktop 1440×900](desktop.png) · [Phone 390×844](mobile.png) · [Narrow 360×740](narrow.png) · [Editable HTML](concept.html).

Approve the visual direction and responsive composition before Claude implements it. Shared shell, avatars, rooms, chat, rules and settings remain existing Playgrid behavior.
