## Playgrid 4.2: offline word intelligence and premium gameplay interactions

Players can select Go Fish ranks directly from their cards, build Scramble answers with tactile tiles, use quick power presets, navigate boards by keyboard, and follow confirmed card/token/score transitions. Social games gain stable Telephone reveal cards and private-role hiding. The homepage, existing artwork, game architecture, server physics and PR #72 reliability/security implementation are preserved.

The server dictionary grows from 115,503 to 196,560 words with pinned, licensed ESDB data. Categories gains offline WordNet membership for concrete categories and broader GeoNames city coverage. Creative categories explicitly retain party judgment; invented Bluff answers stay valid. Rejections explain the actual rule, retain the entered word, and offer an explicit omission-report link.

- Reviewable commits separate generated dictionary data, gameplay controls, and review fixes.
- See `docs/playgrid-4-2/AUDIT.md`, `README.md`, `REVIEW.md` and `index.html` for scope, limits and actual before/after screenshots at 1440×900, 390×844 and 932×430.
- Validation: all 38 test programs pass after two corrected fixture reruns (initial failures retained), no skips; 28 browser checks across all 20 games, 15 integration checks, zero browser errors; 40-room / 160-connection local load test with zero errors. See `VALIDATION.md` and `test-results/final-summary.json`.
- 201 actual before/after/played screenshots cover desktop, portrait and landscape. All 60 final opening game views have zero horizontal overflow.
- Fresh local Codex review findings resolved. Hosted review should be requested after PR creation. Chromium coverage only; larger server vocabulary adds roughly 25MB retained heap in the local sample.
- No merge or deployment is authorized by this PR.
