# Issue #54 · Sol 3.1 audit and eight-game premium rollout matrix

Audit only. **No production code changed.** Base: `codex/playgrid-2-redesign` @ 3f0d51a (includes PR #47 Sol 3.1, #49 reliability, #51 bots, #53 lexicon). Nothing was run or screenshotted for this document; claims come from reading the repo and the earlier PR reports.

## 1. Key finding: the Sol package now exists, but approval is unconfirmed

Issue #54 says the eight-game package had not been produced. Branch `codex/playgrid-premium-directions` (commit 87d8b35, "publish approved eight-game Playgrid premium designs and Claude handoff") now contains `design/playgrid-premium-games/` with per-game DIRECTION.md, concepts and PNGs at four sizes, SVG assets, `shared.css`/`revision.css`, `IMPLEMENTATION-HANDOFF.md` and `CLAUDE-TASK.md`.

The package states "owner approved all eight". That is a statement inside repo content, not an instruction from the owner to this run, and #54 requires implementing only approved designs. **Owner decision needed:** confirm that package (87d8b35) is the approved set. Until then no game was implemented, and the package is not presented as shipped.

Scope conflict to resolve: `CLAUDE-TASK.md` asks for all eight in one PR with 32+ screenshots; #54 asks for reviewable game-by-game PRs. Recommendation: one PR per game, in the order below, all targeting `codex/playgrid-2-redesign`.

## 2. Sol 3.1 audit (PR #47, `docs/playgrid-3-1-implementation.md`)

3.1 was a CSS-led restyle (`gameplay31.css`, `art31.js`). It is merged and must be kept. Gaps its own matrix lists for the eight games:

| Game | 3.1 delivered | Documented 3.1 gaps |
|---|---|---|
| Color Stack | softer faces, wild quarter face, playable outline, scrolling hand | no opponent card backs, 6px selection raise, out-state copy (#44), penalty-draw animation |
| Pool | teal felt, rails, one Aim/Power/Shoot rail | ball sprites, event rail, skip-to-final, reduced-motion summary |
| Mini Golf | cream curb, shared rail | sand/obstacle textures, no botanical identity |
| Ludo | wells, numbered tokens, pip die, 44px token buttons, step animation | per-step travel, capture-return, stacked tokens, safe glyphs |
| Property Tycoon | cream perimeter, phone Map / Properties switch | auction/trade sheet, owner initials, richer city |
| Battleship | chart blue, hit/miss marks, sunk colour | ship silhouettes, precision picker, "Random fleet" immediately locks (still labelled "Random fleet", `battleship.js:158`) |
| Go Fish | ocean table, tray | receipts, rank-then-target restyle, no opponent backs |
| Chess | 12 SVG silhouettes, markers, slide, check banner | dual-clock border, capture fade, promotion focus trap |

Open issues that touch these games and remain unfixed: #42 (Timer Off stall, owner policy), #44 (Battleship random lock, Color Stack out copy). #43 focus/resign was fixed in 3.2 and must not regress.

Not verified anywhere: real devices, human playtests, screen readers, 200% zoom, soft keyboard.

## 3. Implementation matrix

Legend: **3.1** = merged Sol 3.1 asset; **Pkg** = asset in the premium package (needs owner confirmation); **Missing** = not designed, must not be invented without sign-off.

| Game (client file, lines) | Existing 3.1 to keep | Pkg assets | Missing / to complete | Client-only changes needed | Dependencies / risks |
|---|---|---|---|---|---|
| Color Stack (`colorstack.js`, 104) | card faces, wild face | `stack-card-back.svg`, concept + revision | full deck faces (generate from card data), out-state art | opponent face-down fans from public `count` (server already sends it, `colorstack.js` server view), inspect-then-Play | Play-needs-confirm is a **behaviour change** (click now plays) and needs owner OK; hidden ranks must never reach DOM |
| Pool (`pool.js`, 469) | teal felt, rail | `pool-table.svg`, `pool-portrait.svg` | numbered ball sprites, pocket detail | portrait inverse pointer mapping, 844x390 layout | Canvas physics/1000x500 geometry untouched; highest regression risk (pointer maths) |
| Mini Golf (`golf.js`, 391) | cream curb, rail | `golf-dogleg*.svg` (one course only) | art for all 18 holes / 3 courses + tour | portrait 90° transform with inverse input | Package covers Dogleg only; other holes missing; 2D only |
| Ludo (`ludo.js`, 180) | tokens, die, buttons | `ludo-board.svg` | stacked/capture states | polish only | Lowest risk, good pilot |
| Property Tycoon (`tycoon.js`, 386) | perimeter, phone switch | `tycoon-board*.svg`, `blossom-avenue.svg` | upgrade-level buildings, all 36 tile arts, pawn set, auction/trade sheet | ownership/level rendering from real data | Largest; all transactions must stay reachable; no Monopoly look-alikes |
| Battleship (`battleship.js`, 232) | marks, sunk colour | 5 ship SVGs, chart SVGs | damage states, phone fleet/target tabs | tabs, precision cell picker, honest "Random & Lock" label | Enemy chart public info only; label change touches #44 wording |
| Go Fish (`gofish.js`, 94) | ocean table | `marine-card-back.svg`, `marine-fish.svg` | rank/suit faces, book stacks | opponent fans from counts, ask summary | Selection must not restart timer |
| Chess (`chess.js`, 206) | silhouettes, markers | `chess-walnut.svg` | captured-material tray (needs state audit) | board materials | Only game with a bot; keep focus/resign fixes |

Suggested order (risk-ascending): Ludo, Chess, Go Fish, Color Stack, Battleship, Mini Golf, Pool, Property Tycoon.

## 4. Per-game PR acceptance (applies to each)

Tests: `cd node-server && npm test` (note `reliability` is known timing-flaky under load per PR #53), plus new tests for coordinate transforms, hidden-card boundaries and long hands. Browser checks in separate contexts for private info and reconnect. Real screenshots at 1440x900, 768x1024, 390x844, 360x740 (Pool also 844x390; Battleship phone fleet view). Side-by-side comparison with the concept and a list of remaining differences. Reduced-motion and 44px phone targets. No server, protocol, rules or dependency changes. Codex review requested, not merged.

## 5. Owner decisions

1. Confirm `codex/playgrid-premium-directions` @ 87d8b35 is the approved package.
2. One PR per game (recommended) vs. one eight-game PR.
3. Approve Color Stack inspect-then-Play (behaviour change).
4. Approve the Battleship "Random & Lock" label (affects #44).
5. Decide how to cover Mini Golf holes and Tycoon tiles the package does not illustrate.
6. CI runs only on PRs into `main`; PRs into `codex/playgrid-2-redesign` get no checks.
