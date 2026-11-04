# Sol's next design-only assignment — Avatar Studio 2.0 + game-feel finishing pass

## Context / avoid duplicated work
The owner loves Playgrid's **existing home-screen illustration, navy/lime identity, current character family, and the simple, polished feel of Draw & Guess and Four in a Row**. No site-wide redesign.

The previous two design packages are already delivered:
- Eight premium games: `codex/playgrid-premium-directions` at `87d8b35`
- Remaining-game package: `codex/playgrid-premium-rest-design` under `design/playgrid-premium-rest/` (13 game design references, 150 states and Claude handoff)

**Do not recreate those packages or claim they are not done.** Issue #58 describes the overall vision; this issue is the focused *next incremental Sol deliverable*. Claude implements production code separately. RPS Tournament is **removed from the product scope** even though older design files include it.

## Priority 1 — Avatar Studio 2.0: original character family
1. Inspect actual home hero art and existing avatar assets in the repo. Identify their real visual grammar: silhouettes, colors, expressions, stroke, proportions, personality. **Use these exact characters as the basis**; do not invent a different generic mascot style.
2. Preserve all existing selectable avatars and make 30–50 **distinct, original** additional base characters matching that family. Avoid copyrighted characters, AI image-only mockups, or near-identical recolors presented as distinct.
3. Design a genuinely usable character creator: select base, palette/colorway, eyes/expression, compatible headwear/glasses/accessories, optional character-specific details. Some character silhouettes may need unique attachment points. Specify compatibility and layering rather than promising every accessory fits everything.
4. Supply real editable layered SVG source, deterministic IDs/asset naming, exported thumbnails at lobby size, component/variant manifests, fallback assets, and a licensing/originality inventory. Ensure avatar looks excellent at 24–48 px.
5. Design desktop (1440px), phone (390px and 360px), and tablet avatar selection/customization, including preview, randomize, undo/reset, save/confirm, empty/error/locked-or-unavailable states where relevant. Do not introduce monetization/locked items without owner approval.
6. Design lightweight optional animations and reactions (idle, blink, victory, loss, emotes), with reduced-motion equivalents and performance budgets. Keep player identity visible in lobby, scoreboards, waiting rooms, and games.
7. No accounts required: hand off a compact serializable configuration schema, local persistence, multiplayer sync, validation, sanitization, size constraints, versioning and fallbacks. Specify privacy-safe defaults. Engineering implementation belongs to Claude.

## Priority 2 — Finish the game *feel*, not just the screenshots
Inspect the two completed Sol design packages and current production game implementation. Produce a **gap-by-gap final gameplay-feel audit** of the existing playable games. Benchmark Draw & Guess and Four in a Row for simplicity. Focus especially on:
- Color Stack (UNO-style): card fan/dealing/turns, draw/skip/reverse/wild feedback, animations, mobile hand usability, readable state.
- Go Fish: asking, dealing, collecting books, opponents' turn clarity, animation pacing and character reactions.
- Pool: responsive aim/power, cue behavior, collision/shot feel, feedback and mobile precision; separate visual specs from physics/engine changes.
- Ludo, Property Tycoon, Battleship, Chess, Checkers, Mini Golf (**strictly 2D top-down**) and other active games: distinctive satisfying mechanics, clarity, transitions, sound direction and responsiveness.
- Do **not** design Rock Paper Scissors, Higher or Lower, Liar's Dice, Hot Potato, Reversi or other removed games.

For every uncovered *high-impact* gap, deliver a targeted, original and implementable visual/interaction improvement with state designs, CSS/SVG/motion specs, mobile considerations and clear before/after acceptance criteria. **Do not repeat full existing 21-game screen packs**. Prioritize actual usability and game feel over decoration. Avoid feature creep and excessive visual effects.

## Deliverables and done criteria
- A dedicated design folder in a new GitHub branch with a clear README and source-of-truth asset manifest.
- Production-ready layered avatar SVGs (30–50 genuinely distinct base characters), avatar customization screen references and working HTML/CSS prototype where feasible.
- Animation/state specs, responsive/accessibility checks, and a real config/data contract.
- Prioritized game-feel delta matrix referencing the already-approved eight-game and 13-game packages, with precise new design artifacts only for missing interactions.
- `CLAUDE-HANDOFF.md` with implementation order, files/assets, API/data expectations, measurable acceptance criteria, screenshots and testing plan.
- Run asset validation and responsive checks; report what was actually tested vs conceptual.
- **Design-only:** do not change live gameplay/server, merge, or deploy. No claim of completion without committed assets and links.
- If time/usage is constrained, finish Avatar Studio source assets + handoff first, then the highest-impact Pool/Go Fish/Color Stack interaction gaps.

Owner approval is for **doing the design work**, not automatic production implementation. Post the branch, commit, concrete deliverable inventory, and unresolved questions for owner review.
