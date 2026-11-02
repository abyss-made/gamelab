# Implementation handoff boundary · Issue #55

**Stage A only. These 13 new directions are NOT YET APPROVED. Do not implement them until the owner approves them.** Issue #55 explicitly says “Stage A: present original desktop 1440x900 and mobile 390x844 concept mockups for owner approval” and “Stage B after approval.” This package stops at that checkpoint.

## Scope and coordination

Design branch: `codex/playgrid-premium-rest-design`; baseline: `codex/playgrid-2-redesign` at `06609a4`. Work lives only in `design/playgrid-premium-rest/`. No production code, rules, protocol, dependencies, deployment configuration or live data is changed.

This package covers Draw & Guess, Four in a Row, Tic Tac Toe, RPS Tournament, Dots & Boxes, Word Scramble, Trivia Blitz, Word Chain, Categories Rush, Drawing Telephone, Bluff Battle, The Impostor and Checkers. The previously approved eight-game package remains separate at [codex/playgrid-premium-directions](https://github.com/abyss-made/gamelab/tree/codex/playgrid-premium-directions/design/playgrid-premium-games). Its approval does not approve these new concepts.

Claude's existing coordination/audit is Issue #54 and `docs/issue-54-premium-rollout-matrix.md`. That document concerns the eight-game rollout. Do not reassign Issue #55 to that implementation. These 13 require explicit approval first and subsequent coordinated implementation tasks. Preserve the owner's preferred reviewable game-by-game workflow when implementation is assigned; do not merge anything automatically.

## What the package contains

13 original desktop/phone concept pairs plus narrow-phone renders; editable HTML/CSS; five original illustrated SVGs; per-game directions and supported-behavior boundaries; source audit; conceptual reference analysis; shared draft system; browser layout results; four review sheets and a portable ZIP.

One active state per game is illustrated. The pages use fixed illustrative names/scores/board positions/times. Controls do not send actions. They are NOT working multiplayer, comprehensive state sheets, final sprite libraries or an implementation-complete handoff.

## Stage B deliverables after approval

For each approved game, finish component hierarchy, real client/server view mapping, all states listed in its DIRECTION.md, responsive/keyboard-open/long-content layouts, original production asset exports, named event-to-animation mapping, reduced-motion/audio behavior and a Claude acceptance checklist. Complete waiting, local/opponent turn, spectator, invalid/unavailable, accepted/resolving, disconnect/resync, outcome/rematch and party-preserving game switch for every game.

Game-specific priorities: private word choice/guesser/focus modes in Draw & Guess; win/draw/blocked board states; 16-player RPS bracket and private picks; all Dots grid sizes with precise edge targets; long word/chain entry; Categories locked/review tables; Telephone prompt/describe/staged reveal and limits; Bluff anonymous writing/voting/reveal; Impostor role variants/discussion/vote/last guess; Checkers kings/forced capture/multi-jump and stable resign.

## Non-negotiable implementation constraints

- Work inside the existing node-server frontend. Never ship these static pages or a fixed scene as a working game.
- Preserve Express/Socket.IO, alpha authentication, rooms, party lobby/chat, queue, settings, scoring, spectators, reconnect and server authority. No new game rules or opponent-data inference.
- Reuse current gameplay and 3.2 keyboard/focus/resign fixes. Read the latest code before implementing; this design audit does not prove a newer bug is unresolved.
- Four in a Row/Tic Tac Toe/Dots/Checkers have acting bots; RPS has limited random-pick support. The other eight of these 13 do not. Never invent bot capability or expose hidden answers for bots.
- Decorative drawings are example player content. Render actual stroke history with existing fill/replay behavior in production. Opponent words/roles/picks/bluff authors/answers remain hidden until the current server view permits them.
- Complete production variants from actual state. Static samples have no authority over the rules or game contents.

## Later implementation evidence

Run the existing automated suite (`cd node-server && npm test`) and appropriate regressions. Exercise real separate browser contexts for multiplayer, privacy, turns, result/rematch, reconnect and game switch. Capture actual implementation at desktop and phone for all 13, plus narrow/keyboard/long-content variants. Compare at matching dimensions against the approved designs, fix discrepancies and disclose remaining differences. No merge, deployment or live Render changes.

The present `layout-checks.json` verifies design rendering only. No fresh production gameplay test or human-device result is claimed by this design branch.
