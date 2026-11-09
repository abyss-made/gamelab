# Fresh Codex review

Read-only Codex review against production `8846f15`, followed by verification of fixes in `163a528` and the final role-only repaint.

| Finding | Resolution / evidence |
|---|---|
| Strict Job taxonomy rejected common professions; Drink omitted water/juice, Vehicle omitted train | Broadened occupation roots, reviewed supplements, and 35 conventional occupation/drink/vehicle regressions. Direct reviewer checks confirmed acceptance. |
| Chess promotion opened without moving focus, so Escape/Tab containment never started | Focus Queen on open, expose dialog semantics, restore original square on cancel. Real browser sequence legally promotes a pawn after eight preceding moves; verifies Escape, Tab wrapping and promotion. |
| Impostor Hide/Show restarted the displayed countdown | Toggle now repaints **only** private role markup. Timer DOM and countdown remain untouched. Browser check waits then toggles and asserts no increase. |
| Go Fish hand buttons did not reflect pending-Ask disabled state | Pending hand and rank buttons lock together; existing pending/retry tests pass. |
| Trivia guard treated the hidden settings dialog as open | Only rendered dialogs block numeric shortcuts; existing live 1–4-key regression passes. |

Reviewer follow-up: prior substantive findings resolved; no additional licensing/privacy issue found. Celebration effects ignore pointer input, respect reduced motion, clean up and do not delay authoritative actions.

Hosted PR creation/review request cannot be submitted while `api.github.com` returns `Forbidden`. This is an actual local Codex review, not a claim that GitHub approved the branch. No merge or deployment occurred.
