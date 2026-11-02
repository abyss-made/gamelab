# Approved implementation handoff · Issue #55

**Owner approval received for all 13 remaining-game visual directions. The Stage A approval gate is complete.** This Stage B package specifies supported states, reusable components/assets, responsive/accessibility and event-to-animation behavior. Begin with [CLAUDE-TASK.md](CLAUDE-TASK.md).

## Scope and source

Design branch `codex/playgrid-premium-rest-design`; implementation base latest `codex/playgrid-2-redesign`; audited gameplay baseline 06609a4. Re-audit newer code before editing. Work on separate implementation branches and use reviewable game-by-game PRs. This package itself changes only design/playgrid-premium-rest/.

All 13: Draw & Guess, Four in a Row, Tic Tac Toe, RPS Tournament, Dots & Boxes, Word Scramble, Trivia Blitz, Word Chain, Categories Rush, Drawing Telephone, Bluff Battle, The Impostor, Checkers. The approved eight-game package is separate on codex/playgrid-premium-directions. Issue #55 tracks this remaining-game brief, not that earlier set.

## Start here

- Each game's SPEC.md: component hierarchy, real view fields/intents, eligibility/privacy, complete state matrix, focus and acceptance.
- Each game's states-desktop.png / states-mobile.png: state contact sheets, with full-size views available in [state explorer](state-explorer.html).
- [COMPONENT-SPECS.md](COMPONENT-SPECS.md), [RESPONSIVE-ACCESSIBILITY.md](RESPONSIVE-ACCESSIBILITY.md), [MOTION.md](MOTION.md), tokens.json and [ASSET-INVENTORY.md](ASSET-INVENTORY.md).
- shared.css for approved active composition; state.css/state-preview.js illustrate state rendering. motion.css supplies decorative effect primitives. Never install the preview router as production logic.
- CURRENT-STATE-AUDIT.md is historical source evidence, not a report of new gameplay tests. ISSUE-55-BRIEF.md preserves the original issue wording.

## Implementation rules

Use the existing node-server application and mount/update/unmount/result lifecycle. Keep Express, Socket.IO, alpha authentication, rooms/lobby/chat/queue, settings/rules/scoring, spectators, reconnect, rematch and party-preserving switching. No new game rules, server schema, database, dependencies or deployment changes are authorized.

Static data and images are review fixtures, never authority. Rebuild interactive boards/cells/letters/strokes/money/scores/countdowns from actual view fields. Do not use a screenshot or fixed SVG as a working board. Generated HTML/CSS families cover every mark/disc/patch/man/king/letter/selection/outcome state without requiring one raster export per value. Original drawing SVGs are example player content only. Preserve real stroke/fill replay and current caps.

Keep shipped C.keepFocus/C.makeConfirm fixes. One-tap locked choices stay one-tap. Local pending does not mean accepted. Do not expose private words, answer keys, picks, bluff authors or role IDs in hidden DOM/labels/data attributes. Cover-word is only a local privacy view.

Bots: Four in a Row/Tic Tac Toe/Dots/Checkers are acting; RPS is limited. Other eight in this package have no acting bots. Keep support labels honest. Existing Timer-Off behavior/policy is not redesigned here. Reconnect does not pause authoritative game time.

## Concrete data corrections during Stage B

The five-letter Word Scramble example is **Easy**, not Medium (existing Medium is six letters). Largest Dots example is **5×5**, not a new 6×6 option. Telephone size rail must expose its existing 4/10/22 presets. These fixture/control corrections preserve current rules and approved visual identity. Checkers material Jade maps explicitly to existing Lime; Ivory maps to White.

## Evidence and completion gate

1. Implement every listed state in each SPEC.md in the real game, including actual host/member/spectator result actions. Review all 13; do not stop after the easiest boards.
2. Run `cd node-server && npm test`, then targeted regressions for changed view mapping, private-role DOM, focus/confirm, pointer coordinates, dense edges, input/IME/draft lock and phase deduplication as appropriate. Do not weaken tests to fit a screenshot.
3. Test multiplayer in separate browser contexts: legal/illegal input, turn/phase transition, private views, room/chat/settings preservation, results/rematch, reconnect and switching. Do not substitute idle fixtures for acting bots or human participants.
4. Capture actual implementation at 1440×900, 390×844 and 360×740 for all 13 (39 active captures), plus relevant role/phase/result/keyboard variants. Compare side by side at matching dimensions against the approved active/state references; fix scale, typography, spacing, materials, illustrations and control differences.
5. Verify keyboard, focus restoration, reduced motion and 200% zoom/reflow; check actual iOS/Android soft keyboards and screen readers where available. Explicitly disclose untested devices/AT and any remaining differences.
6. Each PR lists completed states, tests and implementation screenshots. Do not merge, deploy or modify live Render. Owner final review remains required.

| Game | Real state-driven UI | States / privacy / multiplayer verified | Matching desktop / phone / narrow comparison | Tests + remaining differences reported |
|---|---|---|---|---|
| Draw & Guess | [ ] | [ ] | [ ] | [ ] |
| Four in a Row | [ ] | [ ] | [ ] | [ ] |
| Tic Tac Toe | [ ] | [ ] | [ ] | [ ] |
| Rock Paper Scissors | [ ] | [ ] | [ ] | [ ] |
| Dots & Boxes | [ ] | [ ] | [ ] | [ ] |
| Word Scramble | [ ] | [ ] | [ ] | [ ] |
| Trivia Blitz | [ ] | [ ] | [ ] | [ ] |
| Word Chain | [ ] | [ ] | [ ] | [ ] |
| Categories Rush | [ ] | [ ] | [ ] | [ ] |
| Drawing Telephone | [ ] | [ ] | [ ] | [ ] |
| Bluff Battle | [ ] | [ ] | [ ] | [ ] |
| The Impostor | [ ] | [ ] | [ ] | [ ] |
| Checkers | [ ] | [ ] | [ ] | [ ] |

The supplied browser checks validate design-reference rendering and privacy presentation, not server security, functional multiplayer, real-device ergonomics or a shipped implementation. No production test result is claimed by this design branch.
