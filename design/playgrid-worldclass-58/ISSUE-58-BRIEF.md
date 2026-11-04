# SOL DESIGN ASSIGNMENT — World-class game feel + Avatar Studio
Owner direction (Nov 4): The current Playgrid home-screen illustration and visual identity are loved. Draw & Guess and Four in a Row are closest to finished. Most other games feel only ~50% finished. **Do not overhaul the home screen or replace the existing illustration/character style.** Make all games the best versions of themselves, not simply prettier skins.

## Workstream A: Every-game premium gameplay and UX design
Inspect current working client, gameplay mechanics, screenshots, and existing Sol 3.1 and approved premium eight-game package (`codex/playgrid-premium-directions` @ `87d8b35`). Do not duplicate or contradict the already-approved eight-game package: extend it with specific gameplay feel, interactions, usability, and completeness gaps. Existing Claude implementation issue #57 is separate.

Audit each currently supported game except Rock Paper Scissors Tournament (owner removed it). Prioritize Color Stack/UNO-style, Go Fish, Pool, Ludo, Mini Golf (**2D top-down only**), Battleship, Property Tycoon, Chess, Checkers, Drawing Telephone, Bluff Battle, Impostor, word/trivia games. Preserve simplicity of Draw & Guess and Four in a Row; only selective improvements there.

For each game, deliver: (1) current-state audit, (2) benchmark-quality intended play experience (controls, rules discoverability, visual hierarchy, pacing, turn feedback, transitions, sound direction, responsiveness, accessibility), (3) concrete desktop 1440x900 and mobile 390x844 screens plus all major states, (4) original assets / implementable HTML-CSS-SVG where possible, (5) animation specs with reduced-motion fallback, (6) acceptance checklist and prioritization. Game-specific controls matter: Pool shot aiming/power/physics feel; Color Stack card fan/deal/draw/turn; Go Fish dealing/ask/book; etc. Distinguish design polish from engine/physics changes requiring engineering.

## Workstream B: Avatar Studio
**Use the EXACT current home-screen character family as the canonical style reference.** Preserve existing avatar choices. Design 30–50 new distinct original characters and a modular customization system compatible with varying character silhouettes (colorways, expressions, eyes, accessories, hats, glasses, etc). Deliver layered production-ready SVG assets, thumbnails, asset naming, compatibility matrix, and responsive desktop/mobile creator UI. Character must read clearly at tiny lobby size; avoid copied IP. Design avatar animations/reactions for lobby, scoreboards, wins and losses. No accounts required: local config persistence and safe multiplayer sync as engineering handoff; define size limits and fallbacks.

## Non-negotiables
- No broad redesign of homepage, hero illustration, or core navy/lime brand.
- Maintain drawing game's simple uncluttered quality.
- **Remove RPS from future design scope**; separate Claude issue will remove it from playable catalog.
- Don't silently alter server rules, existing game protocols, or deploy. Sol designs; Claude implements after review.
- Produce a detailed implementable handoff, priority matrix, screenshots, reusable assets, and explicitly mark any concept not yet implemented.
- If usage constrained, prioritize polished functional per-game interaction design + Avatar Studio assets over generic mockups.
- Do not claim work started/completed until actual deliverables exist.
