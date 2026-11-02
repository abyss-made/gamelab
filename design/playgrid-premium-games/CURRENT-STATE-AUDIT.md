> Historical pre-design audit. Owner approval is now complete; see IMPLEMENTATION-HANDOFF.md for current implementation authorization and requirements.

# Current-state audit · before Stage A design

Inspected baseline: `codex/playgrid-2-redesign` at **3f0d51a** (latest fetched for this assignment). Read the eight server/client renderers and supporting course/property geometry, plus the 3.1 presentation, 3.2 reliability and 3.3 bot reports. The baseline already includes the approved 3.1 CSS-led visual pass; this assignment must go beyond another shell reskin.

Evidence: source inspection and saved client screenshots; no new human playtest, physical-device test, physics benchmark or production observation is claimed. Existing test reports describe their own runs, not verification performed in this design task.

| Game | Supported now | Current UX / presentation limits | Guardrail for the concept |
| --- | --- | --- | --- |
| Color Stack | 2–8; private hand, playable cards, draw, keep/pass when allowed, Skip/Flip/+2/Wild/+4, named wild color picker, one-card count warning, points/results | CSS card faces and scrolling tray; no card deal/transfer choreography, no explicit out-state copy. Click currently plays a normal legal card immediately. | Large original faces, intentional inspect-then-play **proposed client interaction** (no rule change); preserve privacy and current penalties. No new UNO-call rule or button. |
| Pool | 2; server-simulated 8-ball; solids/stripes, break, first-hit aim guide, aim/power sliders and keyboard controls, cue-ball-in-hand placement/lock, fouls, winner-stays | Teal restyle exists, but balls, rail detailing and event feedback are still modest; portrait table can be small | Preserve 1000×500 playable geometry, physical radii and sampled shot trajectories. Spin, jump/masse, called pockets, new modes and extended prediction are unsupported. |
| Mini Golf | 2–6; 2D top-down, 18 original holes in three six-hole courses plus tour; static walls, circular bumpers, sand, water, aim/power/putt, stroke cap, per-hole scores | Primarily flat green polygons and controls; sparse decorative identity; narrow portrait scaling | Repaint existing 700×440 geometry. Sand slows; water costs a stroke and returns the ball. Moving obstacles, elevation and 3D are not supported. Decoration must stay outside collisions. |
| Ludo | 2–4; 15×15, four tokens each, legal-token actions, safe cells, server dice, capture/home, six bonus and triple-six forfeiture | Basic yards and tokens now have 3.1 improvements; stacked-token and capture-return visuals remain limited | Keep existing path, safe squares, per-turn idle accounting and server rolls; add toy-like material and readable numbered choices. |
| Property Tycoon | 2–6; original **36-tile** Playgrid Plaza; original groups/names; dice, purchase/auction, rent, four upgrade levels, trades needing acceptance, debt/bankruptcy, net-worth finish | Small property labels and several phase-local forms; phone Map / Properties & trades switch already exists | Use actual names such as Blossom Avenue and real group prices. No Monopoly assets, mortgages, new currency or economy rules. Buildings are original illustrations for existing levels. |
| Battleship | 2; private draft placement/rotate/manual lock, random fleet **immediately locks**, aim then Fire, hits/misses/sunk, winner-stays | Grids about 30px per cell on phones, weak silhouettes; fleet placement and targeting can be visually dense | Desktop twin boards; phone active-grid tabs + explicit Fire. No unapproved reroll-before-lock behavior. Maintain fog of war and stable keyboard focus. |
| Go Fish | 2–6; private hand, choose held rank then valid opponent, explicit Ask, public counts/books, recent events, result scoring | Small rank/target chips and plain card tray; missing request/transfer/book choreography | Ocean salon table, large rank buttons and an ask summary; keep clock continuous while selecting. Opponent faces stay private. |
| Chess | 2; server legal moves, orientation, promotion, clocks/increment or no-clock idle guard, draw offer/claim, resign, move list; original 3.1 SVG silhouettes | Some secondary visual states remain basic, but **keyboard focus and stable two-tap resign were fixed in 3.2**; do not describe them as still unfixed | Cream/walnut board and elegant original-piece direction; keep legal/check/last-move layers separate. Themes and captured-material tray are proposed local presentation, pending data audit in Stage B. |

## Shared capabilities and uncertainties

- Keep party identity, avatars, chat, rules, rematches, host transfer, spectating/queue and game switching. No lobby redesign in this package.
- Of these eight games, **only Chess has an acting bot**, and it is limited (depth search, no draw-offer/resign behavior). The other seven do not have active bot agents. An Idle Bot can seat in any private lobby but never plays: label it **IDLE BOT**, not a capable opponent.
- Timer Off can still stall a connected idle player in relevant games; policy remains an owner decision (#42). Do not invent auto-kick or new pause/resume rules in a visual concept.
- Battleship random-lock behavior and Color Stack out-state copy remain open (#44). Treat new wording as a presentation proposal, not a shipped fix. Technical “pause” means reconnect/input suspended where existing state requires it, not a new pause-match action.
- Preserve 3.2 focus/confirmation fixes and 3.3 bot boundaries. Source/test reports do not establish real-phone, Safari, keyboard-with-software-keyboard or human play quality.

## Stage A decision

Eight independently composed concepts, one active-play moment each, sharing only the thin Playgrid shell and player identity components. Present at desktop and phone sizes, with tablet/narrow checks. Stage B (after approval) covers full state variants, exhaustive sprite exports, complete motion/audio and Claude’s implementation-ready component contracts.
