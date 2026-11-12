# Playgrid 5.0 — visual experience batches

A production frontend implementation on `codex/playgrid-5-visual`, based on production `8846f15`. No merge or deployment. [Original brief](BRIEF.md) · [Screenshot comparisons](index.html) · [Image index](SCREENSHOTS.md) · [Claude handoff](HANDOFF.md).

## Delivered

- A larger, framed homepage composition with the existing original character illustration, clearer hierarchy and three illustrated discovery paths. Links open the real game catalog flow.
- All 20 selectable games get larger illustrated catalog cards, distinct tinted stages, tactile Play buttons, focus/hover treatment, readable player requirements and existing live search/category filters.
- A persistent party header, larger character roster cards, explicit host/ready/start states, game-selection panel and restrained arrival animation. Existing party identity, chat and game picker remain functional.
- Avatar Studio has an illuminated preview, stronger character-selection cards, clearer category controls and mobile Save presentation. All 35 original characters, customization compatibility, draft/undo and persisted Save remain functional.
- Game presentation uses individual accent palettes, richer surfaces, score/player hierarchy, visible confirmed active-turn feedback, comfortable controls and result entry animation. Drawing surfaces and existing original board/card artwork remain the foundation.
- Portrait Pool and Golf receive compact player strips, fitted play surfaces and two-column shot controls; the local course pointer transformation and original physics remain unchanged.
- Interaction feedback stays immediate and follows confirmed state; reduced motion cancels this layer's animation only. No runtime dependencies, asset downloads or autoplay audio.

## Quality checklist

Each row has real before/after captures at 1440×900, 390×844 and 932×430. `browser-checks.json` documents actual actions, identity reconnect, reduced motion, departure ending and fresh match for every row. The existing full suite adds keyboard, avatar, multiplayer, drawing and bot coverage. See `test-results/` for logs including unsuccessful setup attempts and reruns; do not infer pass status from a zero exit alone.

| Game | Presentation pass | Specific preserved behavior / interaction |
|---|---|---|
| Draw & Guess | Drawing remains the visual focus; shared control material | Real canvas strokes and drawer choice |
| Four in a Row | Original arcade board retained, blue discovery identity | Legal column drop; falling-disc behavior retained |
| Word Chain | Botanical word desk, clearer input/status and score strip | Real accepted word; dictionary unchanged |
| Categories Rush | Teal review/input surface and clearer answer controls | Private submissions and result review |
| Color Stack | Plum tabletop, larger discovery art and active-player treatment | Card draw and private hand rules |
| Go Fish | Sea-glass table/player hierarchy, preserved original card backs | Rank/target selection and authoritative Ask |
| Tic Tac Toe | Violet identity, tactile controls and result entry | Complete legal win and rematch |
| Dots & Boxes | Cyan identity, deliberate line hover/focus | Real edge and existing capture behavior |
| Word Scramble | Ivory tiles on slate desk, clarified answer area | Exact anagram accepted by existing validation |
| Trivia Blitz | Violet answer hierarchy and status framing | Real submitted answers and reveal |
| Drawing Telephone | Warm-paper identity, canvas hierarchy | Real write/draw/guess chain and reactions |
| Bluff Battle | Rose/midnight presentation | Invented answers, vote and public reveal |
| The Impostor | Suspenseful violet surface and role/turn hierarchy | Clue turns, discussion, vote and reveal |
| Battleship | Naval-blue framing, existing original ships retained | Placement/ready and actual Fire |
| Checkers | Warm wood identity, original pieces and board | Legal piece selection/move |
| Ludo | Emerald frame, original multicolor board retained | Real roll/token action |
| Chess | Ivory accent, original piece art and board shadows | Legal move with original clock/rules |
| Pool | Club-green controls, depth around original canvas | Ball placement, power/shot and replay |
| Mini Golf | Botanical surface, compact portrait layout | Real putt, deterministic replay, responsive course |
| Property Tycoon | Emerald control/score framing and original map | Real dice/roll and contextual purchase |

## Limits kept explicit

This release builds on the existing original game art; it does not claim twenty entirely new illustrated boards or a new physics engine. Card dealing, ball travel, token movement and captures use the existing game renderers. New bespoke transfer animations, additional course art, new pool pocket particles and a new audio pack are not included in these batches. The brief's larger standalone-game ambitions should remain follow-up work rather than being represented as finished by shared CSS.

Long card hands, detailed score sheets and cramped landscape screens can still require scrolling. Golf's phone course is smaller to keep its controls nearer the viewport; it remains a complete, uniformly scaled top-down course, not a crop. Physical iOS/Android and Safari/Firefox are not covered by the Chromium evidence. No FPS/performance benchmark claim is made.

No dictionary, scoring, server mechanics or networking files are modified. Claude's unfinished 4.2 branch is not included. The only existing runtime file changed is `public/index.html`; `test/phase15.js` also updates the homepage layout contract; integration instructions list its exact additions.
