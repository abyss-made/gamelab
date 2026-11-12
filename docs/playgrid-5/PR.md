## Playgrid 5.0: destination redesign and game presentation

The catalog previously presented 20 tiny icons in compact rows, and the homepage ended after its hero. This change adds illustrated discovery cards and a larger game catalog, refreshes the persistent party room and Avatar Studio, and gives games distinct materials, active-player feedback and clearer controls. Portrait Golf keeps its course and shot controls closer together.

Built directly from production `8846f15`, without Claude's unfinished 4.2 work. All 54 server/data files remain byte-identical. No scoring, dictionary, physics, game-module or networking changes and no runtime dependencies. Only the existing HTML entry point and one homepage test are shared-file edits; integration details are in `docs/playgrid-5/HANDOFF.md`.

Review batches:

- `74c57c7`: homepage, catalog, lobby, Studio, read-only presentation adapter.
- `d8ba935`: game-stage materials and compact phone Golf controls.
- `d4fef74`: updated homepage layout contract for the added discovery content.
- Evidence package: real before/after/played captures, test logs, checklist and handoff.

See `docs/playgrid-5/VALIDATION.md` for final test results and rerun history. The screenshot viewer and per-game checklist cover 1440×900, 390×844 and 932×430. The browser harness uses three actual clients for each of the 20 selectable games, with real actions, reconnects, reduced motion, departures and rematches.

Existing board and character artwork is reused. This is not a claim of twenty newly illustrated boards or a new bespoke animation/audio pack. Longer hands, score sheets and small landscape screens can scroll; Safari/Firefox and physical devices remain untested. See README for exact remaining limits.

Do not merge or deploy automatically. Preserve Claude's index script versions and backend work when integrating.

Actual implementation screenshots: [all before/after comparisons](https://github.com/abyss-made/gamelab/blob/codex/playgrid-5-visual/docs/playgrid-5/SCREENSHOTS.md).

![Desktop homepage](https://github.com/abyss-made/gamelab/blob/codex/playgrid-5-visual/docs/playgrid-5/screenshots/after/home-1440.png?raw=true)

![Portrait Golf](https://github.com/abyss-made/gamelab/blob/codex/playgrid-5-visual/docs/playgrid-5/screenshots/after/golf-390.png?raw=true)
