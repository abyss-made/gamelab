# Claude implementation assignment · Issue #55 · approved 13-game set

The owner approved all 13 Stage A directions in this conversation. Stage B now supplies state sheets/specs, reusable HTML/CSS/SVG, responsive/accessibility and event-to-animation contracts. Implement the approved designs in the real node-server frontend, preserving the server and gameplay.

Design source: `codex/playgrid-premium-rest-design`, folder `design/playgrid-premium-rest/`.
Implementation base: latest `codex/playgrid-2-redesign` (design baseline 06609a4).
Tracking/design brief: https://github.com/abyss-made/gamelab/issues/55
Coordination: the owner’s Claude rollout issue #54 covers the separately approved eight-game set. Keep the work streams distinct; use reviewable game-by-game implementation PRs unless the owner directs otherwise.

Read IMPLEMENTATION-HANDOFF.md, each game's SPEC.md and desktop/mobile state sheets, tokens.json, COMPONENT-SPECS.md, RESPONSIVE-ACCESSIBILITY.md, MOTION.md and ASSET-INVENTORY.md. Use state-explorer.html for full-size/narrow/keyboard/reduced-motion inspection.

Required games: **Draw & Guess, Four in a Row, Tic Tac Toe, Rock Paper Scissors Tournament, Dots & Boxes, Word Scramble, Trivia Blitz, Word Chain, Categories Rush, Drawing Telephone, Bluff Battle, The Impostor, Checkers.** Complete every one, not a representative subset.

Do not install static screenshots/scenes as working games or copy sample timers/answers/scores into logic. Adapt components to actual view data and existing intents. Preserve private-information boundaries, authentication, Socket.IO, rooms/party/chat/settings, queue, rematch, switching, spectators/reconnect, bot support boundaries and shipped focus/resign fixes.

For each game: implement states in SPEC.md, run existing and meaningful targeted tests, play in separate browser contexts, capture actual desktop/phone/narrow and relevant keyboard/state screenshots, compare directly to approved references, correct discrepancies and disclose remaining differences. Include the root completion checklist and evidence in each PR. Do not merge, deploy or change live Render.

This design branch contains no production implementation or live multiplayer verification. Claude is responsible for those implementation steps; design-state inspection controls only navigate local examples.
