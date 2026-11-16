# Party Gauntlet

A separate, implemented six-hole Mini Golf course with winding routes, alternate lanes, bounce gardens, slime hazards and shot-switch gates. Original geometric artwork uses a colorful obstacle-arena theme within Playgrid’s existing navy/lime interface. Coastal Club remains the default and all existing courses remain available.

Open [the screenshot gallery](index.html) to inspect every hole at **1440×900**, **390×844**, and **932×430**, in follow and overview cameras. Images and the match recording come from normal two-player browser gameplay, not injected game states or mockups.

| Hole | Route / real obstacle |
| --- | --- |
| Ribbon Run | A winding, connected ribbon with multiple tight corners and bumper banks |
| Bounce Boulevard | Five round bumpers, wide outside routes and an accelerating launch strip |
| Gatecrasher | Two alternating gates with permanent bypass lanes |
| Slime Shortcut | Two recessed slime pools, a narrow center route and a directional boost strip |
| Pinch Point | Wide starting/finishing platforms linked by a narrow, gated middle lane |
| Victory Lap | Staggered switchbacks, alternating gates and a bumper-protected finish |

Choose **Mini Golf → Course → Party Gauntlet** in the real lobby settings. Standard 2–6 player rooms, scoring, chat, server-authoritative putts, keyboard controls, pull-to-putt touch controls and camera controls are retained. The course uses the existing turn timer and stroke-limit options.

Gates alternate after each accepted putt. They stay fixed throughout the authoritative shot replay. A gate with a ball in its footprint stays open, including untouched tee balls. The gate transition finishes during the existing post-shot pause. Slime uses the existing water rule: one penalty stroke and return to a safe starting position.

The layouts are six handcrafted courses with varied turns, rather than runtime procedural generation. This is angled Mini Golf on the existing flat physics plane; no jumping, vertical ramps, copied Fall Guys assets, or platforming controls have been added.

See [implementation details](HANDOFF.md), [validation and initial failure records](VALIDATION.md), [test results](test-results/suite.json), [actual match actions/results](full-course-checks.json), [touch checks](input-checks.json), and [preservation checks](preservation-checks.json). No merge or deployment is part of this change.
