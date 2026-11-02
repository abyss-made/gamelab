# Playgrid · approved premium designs for the remaining 13 games

**Issue #55 · owner-approved directions · Stage B implementation handoff.** Approval covers all 13 visual directions; see [APPROVAL.md](APPROVAL.md). Production code is unchanged. Audited baseline: `codex/playgrid-2-redesign` at 06609a4. Design source branch: `codex/playgrid-premium-rest-design`.

[Download the complete approved package](playgrid-premium-rest-approved.zip).

## Claude entry point

Read [CLAUDE-TASK.md](CLAUDE-TASK.md) and [IMPLEMENTATION-HANDOFF.md](IMPLEMENTATION-HANDOFF.md), then each game's SPEC.md and state sheets. Implement all 13 in the real application using actual view fields/intents; preserve gameplay and private information. Use reviewable per-game PRs, actual multiplayer tests and matching implementation screenshots. Do not merge or deploy.

## Review the designs

- [Interactive state explorer](state-explorer.html): 150 full-size reference views, desktop/phone/narrow/keyboard viewport and reduced-motion options. These selectors navigate fixed design examples, not a game.
- [Reusable components and motion preview](components.html), [component contracts](COMPONENT-SPECS.md), [responsive/accessibility](RESPONSIVE-ACCESSIBILITY.md), [motion timing](MOTION.md), [asset inventory](ASSET-INVENTORY.md), [tokens](tokens.json).
- Approved active composition sheets: [drawing/relay/quiz](review-01.png), [word games](review-02.png), [social/tournament](review-03.png), [tabletop](review-04.png).

| Game | Specification | State sheets | Active views |
|---|---|---|---|
| Draw & Guess | [SPEC](drawguess/SPEC.md) | [Desktop](drawguess/states-desktop.png) · [Phone](drawguess/states-mobile.png) | [1440](drawguess/desktop.png) · [390](drawguess/mobile.png) · [360](drawguess/narrow.png) |
| Four in a Row | [SPEC](fourrow/SPEC.md) | [Desktop](fourrow/states-desktop.png) · [Phone](fourrow/states-mobile.png) | [1440](fourrow/desktop.png) · [390](fourrow/mobile.png) · [360](fourrow/narrow.png) |
| Tic Tac Toe | [SPEC](tictactoe/SPEC.md) | [Desktop](tictactoe/states-desktop.png) · [Phone](tictactoe/states-mobile.png) | [1440](tictactoe/desktop.png) · [390](tictactoe/mobile.png) · [360](tictactoe/narrow.png) |
| Rock Paper Scissors | [SPEC](rps/SPEC.md) | [Desktop](rps/states-desktop.png) · [Phone](rps/states-mobile.png) | [1440](rps/desktop.png) · [390](rps/mobile.png) · [360](rps/narrow.png) |
| Dots & Boxes | [SPEC](dotsboxes/SPEC.md) | [Desktop](dotsboxes/states-desktop.png) · [Phone](dotsboxes/states-mobile.png) | [1440](dotsboxes/desktop.png) · [390](dotsboxes/mobile.png) · [360](dotsboxes/narrow.png) |
| Word Scramble | [SPEC](wordscramble/SPEC.md) | [Desktop](wordscramble/states-desktop.png) · [Phone](wordscramble/states-mobile.png) | [1440](wordscramble/desktop.png) · [390](wordscramble/mobile.png) · [360](wordscramble/narrow.png) |
| Trivia Blitz | [SPEC](trivia/SPEC.md) | [Desktop](trivia/states-desktop.png) · [Phone](trivia/states-mobile.png) | [1440](trivia/desktop.png) · [390](trivia/mobile.png) · [360](trivia/narrow.png) |
| Word Chain | [SPEC](wordchain/SPEC.md) | [Desktop](wordchain/states-desktop.png) · [Phone](wordchain/states-mobile.png) | [1440](wordchain/desktop.png) · [390](wordchain/mobile.png) · [360](wordchain/narrow.png) |
| Categories Rush | [SPEC](categories/SPEC.md) | [Desktop](categories/states-desktop.png) · [Phone](categories/states-mobile.png) | [1440](categories/desktop.png) · [390](categories/mobile.png) · [360](categories/narrow.png) |
| Drawing Telephone | [SPEC](telephone/SPEC.md) | [Desktop](telephone/states-desktop.png) · [Phone](telephone/states-mobile.png) | [1440](telephone/desktop.png) · [390](telephone/mobile.png) · [360](telephone/narrow.png) |
| Bluff Battle | [SPEC](bluff/SPEC.md) | [Desktop](bluff/states-desktop.png) · [Phone](bluff/states-mobile.png) | [1440](bluff/desktop.png) · [390](bluff/mobile.png) · [360](bluff/narrow.png) |
| The Impostor | [SPEC](impostor/SPEC.md) | [Desktop](impostor/states-desktop.png) · [Phone](impostor/states-mobile.png) | [1440](impostor/desktop.png) · [390](impostor/mobile.png) · [360](impostor/narrow.png) |
| Checkers | [SPEC](checkers/SPEC.md) | [Desktop](checkers/states-desktop.png) · [Phone](checkers/states-mobile.png) | [1440](checkers/desktop.png) · [390](checkers/mobile.png) · [360](checkers/narrow.png) |

## Validation and limitations

[VERIFICATION.md](VERIFICATION.md) summarizes the design evidence and its limits. state-checks.json records desktop/phone/narrow checks for all 150 design states, including role-private presentation and visible-control bounds. layout-checks.json covers the 39 core active renders. responsive-checks.json covers tablet, emulated keyboard viewports and reduced-motion preview. Browser captures are design-reference evidence, not live multiplayer, security, physical-device or screen-reader tests. Standalone frames are illustrative fixtures, not a sequential game replay.

The five-letter Word Scramble sample is correctly labeled Easy, the largest Dots grid is 5×5, and Telephone size presets remain 4/10/22. Muted paper/folder text and patch initials have accessible-contrast variants; contrast-checks.json records representative solid-color pairs, not a blanket WCAG certification.

The separately approved eight-game package stays on codex/playgrid-premium-directions. Hidden Higher or Lower, Liar’s Dice, Hot Potato and Reversi remain hidden and outside these 13. CURRENT-STATE-AUDIT.md and ISSUE-55-BRIEF.md are historical source evidence, not current approval gates.

## Serve and regenerate

Serve the repo root using `python3 -m http.server`, then open `design/playgrid-premium-rest/index.html` or state-explorer.html. ZIP extraction preserves repo-relative reused asset paths; serve its root similarly. Historical baseline screenshots require the repository’s docs/screenshots folder and are not bundled.

1. `python3 design/playgrid-premium-rest/build-concepts.py` — active HTML and original illustrations.
2. `python3 design/playgrid-premium-rest/build-states.py` — state index/sheet sources and original icon exports.
3. `python3 design/playgrid-premium-rest/render-concepts.py` — active viewport validation/screenshots.
4. `python3 design/playgrid-premium-rest/check-states.py` — all state viewport checks/contact sheets.
5. `python3 design/playgrid-premium-rest/check-responsive.py` — tablet/keyboard/reduced-motion/component checks.
6. `python3 design/playgrid-premium-rest/package-review.py` — active review sheets and complete portable ZIP.

Builders use Python standard library; browser scripts require Python Playwright and Chromium, with optional CHROMIUM_PATH. They run temporary loopback document servers and do not start or change the app. No paid API or production dependency is introduced.
