# Playgrid 5.0 — Batch 2

Production frontend upgrades for **Battleship, Color Stack, The Impostor, Chess and Drawing Telephone**. [Handoff](HANDOFF.md) · [Validation](VALIDATION.md) · [Screenshots](SCREENSHOTS.md) · [Interactive comparison](index.html).

| Game | Delivered changes |
|---|---|
| Battleship | Ocean charts and ship rendering; desktop/touch fleet dragging with valid/invalid previews; separate Fire; confirmed missile, hit, splash and sunk-vessel effects; publicly sunk wreck art |
| Color Stack | Dimensional card/table treatment; exposed 44px fan hit areas; confirmed discard and draw flight; public opponent draw backs; special/color-change feedback; safe selection-before-Play; keyboard-contained wild choice |
| The Impostor | Private role presentation with local concealment; obvious phases; avatar voting cards; explicit vote confirmation; actual public tally/reveal entries |
| Chess | Refined board/pieces/clocks; mouse and touch drag using server legal targets; retained click controls; capture/check effects; recent observed captures; accessible promotion and cancellation |
| Drawing Telephone | Large sketchbook canvas, clear tool states and brush size; precise border-aware input; stable revealed drawings during reactions; page entry transitions; navigation through revealed contributions; accessible phone Done/tools |

Real code was committed and tested one game at a time. This branch starts from production and excludes unmerged Batch 1 and Claude's unfinished work. The homepage, lobby, avatars, Draw & Guess, Connect 4 and other games are unchanged. No new dependency or backend/rule/scoring change.

## Review material

Before/after and played/result captures cover 1440×900, 390×844 and 932×430. Additional screenshots show actual Chess promotion and Telephone drawing. Five WebM recordings show real multiplayer interactions, not static demo states. The browser harness uses three independent clients, native mouse/touch input, legal promotion, real submissions/votes/reactions, reconnect identity and reduced motion.

## Known limits

- Existing original ship/card/piece artwork is reused and enhanced; no claim of a completely new art collection.
- Mobile Battleship uses target/fleet tabs rather than shrinking both charts onto one phone screen. Tap placement and rotation supplement dragging.
- Chess's recent-capture tray shows observed transitions only; it does not invent a complete historical tray after reconnect or missed updates.
- Telephone navigation includes only contributions the server has revealed for the current chain. There is no fabricated access to future entries or a full post-game archive. Drafts survive normal same-round updates; refreshing before submitting still loses unsent drawing work. Submitted drawings are preserved by the server.
- Long hands, scorecards, reveal chains and short landscape screens may scroll. Drawing itself prevents accidental page scrolling. Core phone drawing controls and Done were explicitly checked.
- Chromium/touch-context evidence; physical iOS/Android and Safari/Firefox remain untested. Transform/opacity effects target smooth motion, but no physical-device 60 FPS claim or production capacity benchmark is made.
- Existing mute controls and synthesized sound are retained. No new audio pack or forced autoplay.

No merge or deployment.
