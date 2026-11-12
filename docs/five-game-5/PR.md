## Five-game premium polish: Mini Golf, Pool, Tycoon, Go Fish and Ludo

This branch excludes the earlier whole-site redesign. It improves these five existing games with real renderer/event work: shaded billiard balls and woven cloth; replay trails and pocket/cup/direction-change rings; actual pot/foul feedback; pipped dice and interpolated Tycoon travel; cash/ownership highlights; directly selectable Go Fish cards, public face-down transfers and persistent completed-book feedback; routed Ludo token movement and capture returns.

Scoped material/control styling, readable phone play surfaces, full-width power controls, desktop power presets and result-entry feedback accompany the renderer changes. Animations follow authoritative events, seed silently on reconnect, respect reduced motion and do not delay valid actions.

The entire server/data tree is unchanged. No dictionary, scoring, physics, networking, homepage, catalog, lobby, Avatar Studio or other game-renderer edits. The HTML entry point adds the shared helper/styles and updates only these five script cache versions. One Go Fish keyboard test now selects visible controls.

See `docs/five-game-5/VALIDATION.md` for the final tests and exact coverage, `SCREENSHOTS.md` for real before/after/played/results captures at 1440×900, 390×844 and 932×430, and `video/` for five actual multiplayer recordings. Claude integration contracts and shared-renderer cautions are in `HANDOFF.md`.

Original artwork is reused and enhanced. Decorative impact rings reflect observed replay direction changes; they do not claim a new collision simulation. Physical devices and Safari/Firefox remain untested. Detailed scorecards/long hands may scroll; desktop power presets are omitted on portrait phones in favor of the slider.

Do not merge or deploy automatically.

Actual evidence: [all five games and viewport comparisons](https://github.com/abyss-made/gamelab/blob/codex/playgrid-5-five-game-polish/docs/five-game-5/SCREENSHOTS.md) · [gameplay recordings](https://github.com/abyss-made/gamelab/tree/codex/playgrid-5-five-game-polish/docs/five-game-5/video).

![Ludo desktop](https://github.com/abyss-made/gamelab/blob/codex/playgrid-5-five-game-polish/docs/five-game-5/screenshots/after/ludo-1440.png?raw=true)

![Pool portrait](https://github.com/abyss-made/gamelab/blob/codex/playgrid-5-five-game-polish/docs/five-game-5/screenshots/after/pool-390.png?raw=true)
