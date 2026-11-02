# Playgrid · premium designs for the remaining games

**Issue #55 · Stage A · 13 concepts awaiting owner approval.** No production code is changed. Baseline: `codex/playgrid-2-redesign` at 06609a4. Design branch: `codex/playgrid-premium-rest-design`.

Open [the gallery](index.html) or these desktop/phone review sheets:

1. [Drawing, relay and trivia](review-01.png)
2. [Word games](review-02.png)
3. [Social deduction and tournament](review-03.png)
4. [Tabletop strategy](review-04.png)

| Game | Direction | Desktop / phone | Source |
|---|---|---|---|
| Draw & Guess | Sketch Club | [1440×900](drawguess/desktop.png) · [390×844](drawguess/mobile.png) | [HTML](drawguess/concept.html) · [Direction](drawguess/DIRECTION.md) |
| Four in a Row | Drop Society | [1440×900](fourrow/desktop.png) · [390×844](fourrow/mobile.png) | [HTML](fourrow/concept.html) · [Direction](fourrow/DIRECTION.md) |
| Tic Tac Toe | Cross & Circle | [1440×900](tictactoe/desktop.png) · [390×844](tictactoe/mobile.png) | [HTML](tictactoe/concept.html) · [Direction](tictactoe/DIRECTION.md) |
| Rock Paper Scissors | Throwdown | [1440×900](rps/desktop.png) · [390×844](rps/mobile.png) | [HTML](rps/concept.html) · [Direction](rps/DIRECTION.md) |
| Dots & Boxes | Stitch & Claim | [1440×900](dotsboxes/desktop.png) · [390×844](dotsboxes/mobile.png) | [HTML](dotsboxes/concept.html) · [Direction](dotsboxes/DIRECTION.md) |
| Word Scramble | Letterworks | [1440×900](wordscramble/desktop.png) · [390×844](wordscramble/mobile.png) | [HTML](wordscramble/concept.html) · [Direction](wordscramble/DIRECTION.md) |
| Trivia Blitz | Orbit Quiz | [1440×900](trivia/desktop.png) · [390×844](trivia/mobile.png) | [HTML](trivia/concept.html) · [Direction](trivia/DIRECTION.md) |
| Word Chain | Chain Reaction | [1440×900](wordchain/desktop.png) · [390×844](wordchain/mobile.png) | [HTML](wordchain/concept.html) · [Direction](wordchain/DIRECTION.md) |
| Categories Rush | The Fieldbook | [1440×900](categories/desktop.png) · [390×844](categories/mobile.png) | [HTML](categories/concept.html) · [Direction](categories/DIRECTION.md) |
| Drawing Telephone | Paper Relay | [1440×900](telephone/desktop.png) · [390×844](telephone/mobile.png) | [HTML](telephone/concept.html) · [Direction](telephone/DIRECTION.md) |
| Bluff Battle | The Velvet Lie | [1440×900](bluff/desktop.png) · [390×844](bluff/mobile.png) | [HTML](bluff/concept.html) · [Direction](bluff/DIRECTION.md) |
| The Impostor | Confidential Club | [1440×900](impostor/desktop.png) · [390×844](impostor/mobile.png) | [HTML](impostor/concept.html) · [Direction](impostor/DIRECTION.md) |
| Checkers | Emerald House | [1440×900](checkers/desktop.png) · [390×844](checkers/mobile.png) | [HTML](checkers/concept.html) · [Direction](checkers/DIRECTION.md) |

Each folder also includes a 360×740 narrow-phone render. There are 39 exact viewport renders; `layout-checks.json` records overflow, page errors and visible-control bounds. These are static concept browser screenshots, not working multiplayer. Controls do not submit actions, timers do not run and no fake network success is simulated.

## Review documents

- [Current-state audit](CURRENT-STATE-AUDIT.md): verified roster, per-game gaps and source limitations.
- [Reference principles](REFERENCE-ANALYSIS.md): category leaders interpreted with original art.
- [Shared system](DESIGN-SYSTEM.md): reusable tokens, material palettes and responsiveness.
- [Implementation boundary](IMPLEMENTATION-HANDOFF.md): what must wait for approval and what Claude will need later.
- [Asset provenance](ASSET-MANIFEST.json) and [original issue brief](ISSUE-55-BRIEF.md).

The earlier approved eight-game package remains separate. Issue #55 does not track implementation of that set. Hidden Higher or Lower, Liar’s Dice, Hot Potato and Reversi remain hidden and outside these 13 visible-game concepts.

## Reopen and regenerate

Serve the repo root with `python3 -m http.server`; open `design/playgrid-premium-rest/index.html`. ZIP extraction preserves repo-relative asset paths; serve its root likewise. The historical-baseline gallery requires the existing repository screenshot folder and is not bundled into the portable ZIP.

`python3 design/playgrid-premium-rest/build-concepts.py` regenerates HTML and original SVGs with standard-library Python. `python3 design/playgrid-premium-rest/render-concepts.py` renders/validates all 39 concepts using Python Playwright and Chromium (optional CHROMIUM_PATH). `package-review.py` creates the review sheets and ZIP. These run a temporary loopback document server, never the game server. No paid APIs or new app dependencies are used.

## Approval checkpoint

Review each visual direction and desktop/phone composition. Issue #55 explicitly reserves complete state sheets, production asset families and final Claude implementation contracts for Stage B after approval. The current handoff describes that boundary rather than claiming that those later deliverables are finished. Nothing is merged or deployed.
