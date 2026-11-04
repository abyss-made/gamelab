# Scope and source lock

Current working-game reference: codex/playgrid-2-redesign @ 06609a4, per Issue #57. main @ 04faf50 is older; it is not used to overwrite the active frontend. No merged implementation of Issue #57 was found on the reference branch at audit time. Existing approved eight-game source: codex/playgrid-premium-directions @ 87d8b35. Issue #55 approved Stage B: codex/playgrid-premium-rest-design @ 71ca099.

Default registry still exposes 21 games before the separately assigned RPS removal. New design target: 20 selectable games after excluding RPS. Higher or Lower, Liar's Dice, Hot Potato and Reversi remain registered but hidden; they are documented, not exposed or invented.

Canonical artwork: exact node-server/public/assets/hero-mascots.png and player-portraits.png, viewed directly. Existing 24 legacy choices are four portrait quadrants repeated with six hue offsets, plus ten ring colors; preserve every e/c pair. New vectors must share oversized chibi heads, sharp dark ink, layered hair/fur/metal forms, glossy eyes, navy clothing and lime/violet rim highlights. Never replace the home hero with the new assets.

Priority: complete original modular avatar production assets, real local creator interactions, and specific per-game interaction/state contracts. Reuse approved compositions and state references rather than generating a competing generic dashboard. Local labs never connect to Socket.IO or claim server gameplay/physics.
