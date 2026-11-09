# Playgrid 4.2 — premium gameplay and offline word intelligence

Branch: `codex/playgrid-4-2-premium`. Base: production `8846f15`. This package contains actual production-code changes and real browser evidence. No merge or deployment.

**Start with [the visual comparison viewer](index.html)** or [the screenshot index](SCREENSHOTS.md). Compare all 20 selectable games at **1440×900**, **390×844** and **932×430**, including played states. The homepage and existing artwork are preserved.

## What changed

| Game | Delivered improvement |
|---|---|
| Draw & Guess | Existing benchmark drawing/focus behavior retained; shared focus/pressed states and result treatment |
| Four in a Row | Existing falling-disc/column controls retained; active-player and result feedback |
| Word Chain | Larger dictionary, accurate broad-list letter exhaustion, inline rejection with retained input, omission reporting, refined word desk |
| Categories Rush | Concrete category membership, geographic coverage and aliases, explicit party-judged creative categories, stable result review and omission link |
| Color Stack | Confirmed discard/hand transitions, stronger playable/selected cards, Escape and keyboard containment in color choice |
| Go Fish | Select rank directly from actual private cards; public request/back privacy preserved; mobile hand above a compact Ask panel; pending controls consistently disabled |
| Tic Tac Toe | Spatial keyboard navigation, persistent focus identity and result presentation |
| Dots & Boxes | Composite edge focus identity, spatial navigation, visible focus/hover, existing owner/capture/extra-turn feedback preserved |
| Word Scramble | Tap tiles, shuffle, undo, clear; typing remains available; retained invalid guesses, specific server rejection reasons, stable tactile tile rack |
| Trivia Blitz | Improved answer/reveal hierarchy; numeric shortcuts work during play and stop while a visible dialog is open |
| Drawing Telephone | Stable keyed reveal entries, preserved canvases during likes, illustrated warm-paper reveal cards, latest-reveal shortcut |
| Bluff Battle | Phase feedback and visual hierarchy with uppercase/invented-answer mechanics preserved |
| The Impostor | Private-role Hide/Show, focused role/vote/results presentation, no local countdown reset |
| Battleship | Stronger aim/focus treatment; original ship art, deliberate Fire, keyboard and phone charts preserved |
| Checkers | Spatial legal-square keyboard navigation and focused destinations; forced captures unchanged |
| Ludo | Confirmed token travel, shared active-player feedback, keyboard-contained stacked-token picker |
| Chess | Spatial board navigation, properly focused promotion dialog, Escape restoration and Tab containment; clocks/rules unchanged |
| Pool | Labeled power presets, refined control grouping and shared feedback; authoritative physics unchanged |
| Mini Golf | Portrait-aware bounded keyboard tee movement, labeled power presets and refined controls; 2D top-down replay/collisions unchanged |
| Property Tycoon | Interpolated existing tile-step travel, direct final positions for reduced motion, phase/result feedback; compact board/trade/auction flows preserved |

Shared effects are driven by confirmed snapshots and reset on disconnect/unmount. No synthetic scores or delayed action queues. Results get bounded, non-interactive celebrations; reduced motion disables decorative effects. No new sound layer or framework.

## Dictionary 2.0

**115,503 → 196,560 accepted English words**. Existing accepted spellings are retained; plurals/inflections come from actual entries rather than guessed suffixes. Word Chain, exact-anagram Scramble, factual categories and creative games have distinct policies. All validation stays on the server with no runtime external API.

Ten concrete Categories vocabularies use licensed WordNet data and reviewed supplements. GeoNames adds Latin-script city names/aliases. Source pins, hashes, attribution, normalization and deterministic regeneration: [DICTIONARY-2.md](../../node-server/server/data/DICTIONARY-2.md).

## Validation and review

See [VALIDATION.md](VALIDATION.md) for final results, the two corrected test fixtures and preserved rerun history.

- [Per-program test results](test-results/suite.json): every command in `node-server/package.json`'s `test` script, with exit codes, PASS/FAIL/SKIP counts and durations. Individual logs sit alongside it.
- [Real-browser checks](browser-checks.json): three independent browser clients, actual actions for every visible game, 3 viewport captures, identity reconnect, reduced motion, departure endings and fresh matches. Additional full Tic Tac Toe win/rematch and legal Chess promotion flow.
- [4.1 integration regression](integration/browser-checks.json): real Drawing/Telephone/Bluff/Go Fish/Dots/Golf/Tycoon behavior plus PR #72 security headers, aggregate health and shutdown.
- [Fresh Codex review](REVIEW.md): substantive findings and fixes, including category coverage, role timer, pending Ask and promotion focus.
- [Performance before](test-results/performance-before.json) / [after](test-results/performance-after.json): local single-sample measurements under concurrent QA, not a production capacity guarantee. The larger vocabulary costs ~25MB additional retained heap and ~35MB RSS in this sample; cold loading all game modules rose from ~219ms to ~719ms. 100,000 normalized lookups remained ~83ms. New data is server-only (~3.2MB uncompressed).

The browser and suite runners fail on errors; screenshots alone are not claimed as functional proof. See [HANDOFF.md](HANDOFF.md) for exact reproduction commands and module contracts.

## Limits and next work

- This is an interaction/feedback overhaul built on existing original game artwork. It is not a newly illustrated board for every game; Draw & Guess and Four in a Row deliberately retain their benchmarks.
- Dictionaries and factual names remain finite. GeoNames' source population threshold misses smaller places; personal-name lists are incomplete. WordNet has dated vocabulary and polysemous meanings. Open-ended category fit remains party-judged and is labeled as such.
- The omission-report flow opens a reviewable GitHub issue and requires GitHub login; it does not collect reports inside Playgrid or automatically award points.
- Long hands, detailed scorecards and small landscape screens can scroll. No claim of zero vertical scrolling or testing on every physical device.
- Physics remains deterministic browser-game physics. Reduced motion suppresses decoration, while ball travel remains functional information.
- Browser coverage uses Chromium. Cross-engine Safari/Firefox and real iOS/Android device checks remain recommended; no invented FPS or device coverage claims.
- Hosted PR creation is blocked by this environment's GitHub API restriction. Branch pushes work. The final PR body is in [PR.md](PR.md); use the compare link supplied at delivery if the API remains blocked.
