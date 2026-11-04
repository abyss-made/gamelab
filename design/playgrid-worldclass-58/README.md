# Playgrid · Issue #58

**Design package for review — not implemented gameplay.** Every change is confined to this folder. Homepage, production code, servers and protocols are unchanged. No merge or deployment.

- [Download complete ZIP](playgrid-issue-58-design.zip)
- [Implementation handoff](HANDOFF.md) · [Priority matrix](PRIORITIES.md) · [Shared interaction/motion system](SYSTEM.md)
- [Review gallery](index.html) · [20-game state explorer](explorer.html) · [Validation and known differences](VALIDATION.md)
- [Avatar Studio desktop](avatar-studio/studio-desktop.png) · [Avatar Studio mobile](avatar-studio/studio-mobile.png) · [32-character sheet](avatar-studio/character-review.png)
- [Avatar asset/schema handoff](avatar-studio/HANDOFF.md) · [Compatibility matrix](avatar-studio/COMPATIBILITY.csv)
- [All 18 existing Mini Golf holes](assets/golf/review.png)

The package extends the approved eight-game and Issue #55 directions, with specific game-feel gaps, local interaction previews, desktop/mobile states and 32 original layered SVG characters. RPS is excluded; separate Issue #59 handles production removal.

**Art difference for review:** new character vectors use the same home-family cues but have a cleaner finish than the painted canonical hero. The original hero and all classic avatar choices stay intact. Audio is direction only; production multiplayer, full game engines, mobile-device/accessibility certification and avatar v2 sync remain implementation work.

## Screenshot boards

| Games | Desktop + phone review board |
|---|---|
| Color Stack, Pool, Mini Golf, Ludo | [Board 1](review/boards/games-1.png) |
| Property Tycoon, Battleship, Go Fish, Chess | [Board 2](review/boards/games-2.png) |
| Draw & Guess, Four in a Row, Tic Tac Toe, Dots & Boxes | [Board 3](review/boards/games-3.png) |
| Word Scramble, Trivia, Word Chain, Categories | [Board 4](review/boards/games-4.png) |
| Drawing Telephone, Bluff Battle, Impostor, Checkers | [Board 5](review/boards/games-5.png) |

Individual full-resolution PNGs are under `review/proposed/`; real unchanged-client captures are under `review/current-client/`. Every named state's 1440×900 and 390×844 screenshot pair is under `review/states/{game}/` and linked from the per-game audit. Static fixtures do not claim completed multiplayer gameplay.

## Open / reproduce

From repository root, run `python3 -m http.server 8765 --bind 127.0.0.1`, then open `http://127.0.0.1:8765/design/playgrid-worldclass-58/`. No application install is needed for the previews. The ZIP carries minimal canonical brand/font/portrait files at the same relative repository paths.

Browser checks require Python Playwright and Chromium at `/usr/bin/chromium`, already available in the task environment:

```sh
python3 design/playgrid-worldclass-58/check-games.py
python3 design/playgrid-worldclass-58/avatar-studio/check-studio.py
python3 design/playgrid-worldclass-58/check-interactions.py
python3 design/playgrid-worldclass-58/build-boards.py
```

`audit-current.py` additionally requires the existing `node-server` dependencies and launches an isolated local fixture app with private alpha enabled. It authenticates normally and captures only initial game states with non-playing fixture peers. Source generation scripts use the approved git commits; generated preview files themselves are standalone. No paid AI APIs or new npm dependencies were used.
