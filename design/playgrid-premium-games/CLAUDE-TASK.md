# Implement the approved Playgrid premium designs · all eight games

The owner approved all eight creative directions and the revised Color Stack, Mini Golf, Go Fish, Property Tycoon and Battleship concepts. Implement them in the real `node-server` application, preserving gameplay and the Playgrid navy/lime identity. **Do not implement only the five revised games: all eight are required.**

Design source branch: `codex/playgrid-premium-directions` in `abyss-made/gamelab`.
Implementation base: latest `codex/playgrid-2-redesign`.
Package: `design/playgrid-premium-games/`.

Read in this order:

1. `IMPLEMENTATION-HANDOFF.md` — approved scope, source mapping, required game states, motion and completion gate.
2. `README.md` and each game's `DIRECTION.md`.
3. Full-size `desktop.png`, `tablet.png`, `mobile.png`, `narrow.png` in each game folder. Revision 2 is authoritative for the five revised games; Pool/Ludo/Chess keep their approved initial directions.
4. `shared.css`, then `revision.css`; original SVG assets and provenance; `CURRENT-STATE-AUDIT.md`.

Required games: **Color Stack, Pool, Mini Golf, Ludo, Property Tycoon, Battleship, Go Fish, Chess.**

Card games must show other players' face-down card fans as well as public counts. Mini Golf stays 2D with the existing physics and geometry. Tycoon needs the richer original city/property treatment while preserving all existing transactions. Battleship uses recognizable ship artwork without revealing the enemy fleet. None of the scene SVGs can replace an interactive state-driven board.

Use a separate implementation branch. Complete missing production asset/state variants as part of implementation; sample concept data is never production logic. Preserve Express + Socket.IO, alpha auth, rooms/party, chat, rules, settings, scoring, server authority, accessibility and shipped focus/resign fixes. No new game rules or unnecessary dependencies.

Before reporting completion, implement **all eight**, run `cd node-server && npm test`, test real multiplayer and private information in separate browser contexts, capture actual implementation screenshots at all four target sizes, compare against the approved concepts and fix discrepancies. Include the eight-game evidence checklist and exact remaining differences in the PR. Never merge, deploy or change the live Render site.

The package contains design previews, not proof of gameplay implementation. Owner approval allows implementation; it does not waive browser verification or final PR review.
