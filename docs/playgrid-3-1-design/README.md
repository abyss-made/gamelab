# Playgrid 3.1 · gameplay visual design package

Design-only response to [Issue #41](https://github.com/abyss-made/gamelab/issues/41), based on the completed Phase 2 gameplay pass at `d89486c`. **Owner visual review is required before Claude implements this direction.**

- **21 visible games, 42 full-resolution mockups:** desktop viewport 1440×900 and mobile 390×844. Full-page PNGs retain vertical content; none are stretched to fake viewport fit.
- Detailed art, controls and feedback specifications for Draw & Guess, Four in a Row, Chess, Checkers, Ludo, Pool and Color Stack; individual family adaptations for every other visible game.
- Original reusable board SVGs, shared HTML/CSS, inspectable source mockups, finite motion demos, reduced-motion rules and server-state/permission contracts.
- Existing Playgrid branding, portrait artwork and navy/lime identity retained. Phase 2 mechanics and all production files unchanged.

## Open these first

1. **[HANDOFF.md](HANDOFF.md)** — design system, layout, motion, accessibility, permissions and implementation gates.
2. **[GAME-SPECS.md](GAME-SPECS.md)** — detailed high-impact game specifications plus the remaining 14 adapters.
3. **[AUDIT.md](AUDIT.md)** — all 21 visual findings and the Phase 2 behavior to preserve.
4. [Review index](index.html) — every full-resolution desktop/mobile image and HTML source. Open via HTTP to preview; GitHub displays HTML source.
5. [Asset manifest](asset-manifest.json) · [42 render checks](render-checks.json) · [State/motion source](states.html).

## Visual review sheets

- [Seven high-impact games: desktop + mobile](images/01-hero-games.png)
- [Words, creative and party games: desktop + mobile](images/02-word-party.png)
- [Remaining boards, cards and skill games: desktop + mobile](images/03-board-card-skill.png)
- [State and motion sheet: desktop](images/04-states-desktop.png) · [mobile](images/04-states-mobile.png)

Representative full-resolution pairs: [Draw & Guess desktop](images/drawguess-desktop.png) / [phone](images/drawguess-mobile.png), [Chess desktop](images/chess-desktop.png) / [phone](images/chess-mobile.png), [Pool desktop](images/pool-desktop.png) / [phone](images/pool-mobile.png), [Color Stack desktop](images/colorstack-desktop.png) / [phone](images/colorstack-mobile.png).

## Rebuild

From the repository root, with Python Playwright and Chromium installed:

```sh
python3 docs/playgrid-3-1-design/build.py
python3 docs/playgrid-3-1-design/render.py
```

All 42 game specimens were rendered and checked for horizontal overflow, missing image loads and JavaScript page errors. The state sheet's finite replay and reduced-motion override were exercised at both viewport widths. The mockups are static proposals, not gameplay functionality or a WCAG compliance claim. Production gameplay regression testing belongs to Claude’s implementation phase; no game engine tests were changed or claimed to run for this documentation-only package.

**No production changes, PR, merge, deployment or automatic implementation are part of this package.**
