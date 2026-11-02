# Trivia Blitz · Orbit Quiz

**Approved direction · Stage B specification is in [SPEC.md](SPEC.md).** Source client: `node-server/public/js/games/trivia.js`. This active page illustrates one state; SPEC.md and the state sheets provide the complete design reference. It is not functional multiplayer.

## Creative direction

Luminous blue quiz stage and four jewel-color numbered answer panels. Type, spacing and bold choices carry the drama; no proprietary Kahoot icon set or logo.

## Desktop and phone composition

Desktop two-column answers under a large question and ten-step progress. Phone uses four full-width answer rows and a compact player rail. Text wraps before shrinking; 1–4 shortcuts remain.

## Rules and privacy boundary

The Everest question is from the existing bank; the pictured ask phase does not mark the right answer. One choice locks immediately. Other picks and the correct index stay hidden until server reveal. No lifelines or fake scoring.

## States specified in Stage B

Category/question; asking; locked/answered count; right/wrong/no-answer reveal; streak/gain; long questions/answers; spectator/reconnect; standings/results.

## Motion intent

Answer lock is immediate and named. On reveal, show Correct/Wrong text plus symbol/outline, not color alone. Animate outcome for 220ms without changing the answer deadline. Use the event mapping in [MOTION.md](../MOTION.md) and accessibility contract in [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md).

## Review

[Desktop 1440×900](desktop.png) · [Phone 390×844](mobile.png) · [Narrow 360×740](narrow.png) · [Editable HTML](concept.html).

The owner has approved the visual direction and responsive composition. Claude should use SPEC.md and the shared implementation handoff. Shared shell, avatars, rooms, chat, rules and settings remain existing Playgrid behavior.
