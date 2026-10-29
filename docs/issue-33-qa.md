# Issue #33: larger gameplay, Rules for all 25 games, QoL

Refs #31, #32 (this branch includes the #32 audit fixes via merge). Base: `codex/playgrid-2-redesign`.

## What changed
- **Rules** (`public/js/rules/rules-{a,b,c}.js`, dialog in `main.js`): one Rules control per room (topbar `?` icon plus a "Rules" button in the room bar). Each of the 25 games has goal, player count, turn flow, mouse/touch controls, scoring, special mechanics, timer, win/loss/tie. The dialog scrolls, closes with Esc, the Close button, the X or a backdrop tap, and never touches game state. Content was written from the server game code and client UI.
- **Focus mode**: topbar button (visible only while a game runs), `aria-pressed`, Esc exits. Hides footer, room bar, roster, chat and nav; the game uses the full width/height. Resets on leaving the room or the game ending.
- **Larger boards**: Reversi, Checkers, Chess, Ludo and Tycoon boards size to the viewport height on desktop instead of fixed 480-640px caps (Chess: 520px -> ~650px normal, ~710px focus at 1440x900). Battleship, Telephone canvas, Go Fish/Pool widths raised.
- **QoL**: Drawing Telephone brush and eraser now keep independent sizes (Draw & Guess already did). Play Again / Choose Another Game, persistent lobby and turn banners already existed and are unchanged.

## Automated evidence (`node test/qol.js`, in `npm test`)
- 25 games: rules present, shape, player counts match the registry, controls mention mouse and touch.
- Per game at 1440x900 and 390x844 (touch): Rules open in lobby and mid-game, show that game's goal, fit the viewport, Esc/Close return to the running game; focus mode toggles on/off, hides roster/chat, does not shrink the stage, no horizontal overflow, no page errors.
- Screenshots (6 representative game types x 2 viewports, normal and focus): `docs/screenshots/issue-33/`.

## Manual QA checklist (not done by a human)
- [ ] iPhone Safari / Android Chrome: open Rules, scroll, dismiss by touch; focus toggle; address-bar resize in focus mode
- [ ] Draw & Guess / Telephone drawing with a finger in focus mode
- [ ] Pool / Mini Golf drag-aim on touch in focus mode
- [ ] Landscape phones

## Caveats
- No physical devices; touch is Chromium emulation (`hasTouch`).
- Rules text was written from code reading; behaviors found surprising are listed in the PR, not changed.
- Per-game screens were not individually redesigned: shared layout/CSS only. Mobile Mini Golf and Draw & Guess canvases remain width-limited by their aspect ratios.
- CI "Node Server Tests" only triggers on PRs to `main`, so none is expected for this PR.
