# Design verification

- 13 approved games; 150 state references.
- 450 state-layout checks: every state at 1440×900, 390×844 and 360×740. Real browser page loads, font/image loading, document bounds, enabled-control bounds and specific private-role fixture checks are recorded in state-checks.json.
- 39 core active captures, plus 13 tablet captures (768×1024). Exact viewport files are in each game folder. Core checks retain square boards/circular disc slots.
- 26 state contact sheets: desktop and phone for each game; full-size source views in state-explorer.html.
- Seven 390×520 emulated keyboard captures. Focused field and commit action pass viewport bounds and center-point occlusion checks. Categories' field area scrolls separately so Done does not cover it.
- Local component/motion preview respects prefers-reduced-motion. Seven representative normal-text solid-color contrast pairs pass 4.5:1; see contrast-checks.json. This does not certify every computed production color/state.
- HTML references and original SVG XML parse/load. Reused assets preserve existing repository paths/licensing. The historical baseline gallery loads all 26 existing 3.1 screenshots.
- No production files changed; no new paid API, application dependency, merge or deployment.

These checks validate fixed design references only. They do not prove functional multiplayer, server-side privacy/security, real-device soft keyboard behavior, screen-reader usability, actual implementation parity or production performance. Claude's implementation acceptance is separately specified in IMPLEMENTATION-HANDOFF.md. No fresh production npm-test result is claimed by this design branch.

The state index has one check per (game, state, viewport). Targeted rerenders replace only matching entries after a source correction, preserving the complete 450-case index. Reference frames are standalone illustrative fixtures, not an asserted sequential playthrough.
