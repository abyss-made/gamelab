Closes #70.

Implements Playgrid 4.1 in the existing app: compact invitations and game briefings, validated Telephone settings/chain totals, word legitimacy and duplicate rules, secret Impostor assignment/reveal, uppercase Bluff answers, public Go Fish transitions, accessible Dots ownership, and quieter Tycoon panels. Mini Golf gains distinct tee starts, validated optional placement, synchronized ball collisions, slope acceleration and six Harbor Links holes while preserving the original 18-hole tour.

Visual QA also reproduced and corrected the remaining 932×430 expanded Draw & Guess grid overlap on the merged #68 base. The classic Dice invitation identity fix is preserved. No room/socket architecture, auth, logging, deployment or dependency changes. #66 remains superseded.

Validation: full npm suite, game-specific server checks, and 14 additional real-browser flow checks with three clients, touch/keyboard input, refresh/reconnect and all four requested viewport sizes. See the exact results in `docs/playgrid-4-1/VALIDATION.md`.

- [Before/after screenshot gallery](https://github.com/abyss-made/gamelab/blob/codex/playgrid-4-1-experience/docs/playgrid-4-1/SCREENSHOTS.md)
- [Implementation handoff and limits](https://github.com/abyss-made/gamelab/blob/codex/playgrid-4-1-experience/docs/playgrid-4-1/HANDOFF.md)
- [Shared contracts for Claude / #69](https://github.com/abyss-made/gamelab/blob/codex/playgrid-4-1-experience/docs/playgrid-4-1/CONTRACTS.md)

Known limits: proper-name lists are finite; creative category/prompt semantic fit remains party judged. Golf is deterministic fixed-step 2D arcade physics, without spin/airborne ramps. Unplayed tee balls are protected obstacles; opponent-water displacement restores safely without penalizing that opponent. Longer mobile game views scroll.

Read-only Codex review completed; substantive findings fixed and regression tested. Owner review required before merge/deploy.

Desktop invitation:

![Desktop invitation](https://raw.githubusercontent.com/abyss-made/gamelab/codex/playgrid-4-1-experience/docs/playgrid-4-1/screenshots/after/invite-returning-1440.png)

Mobile invitation:

![Mobile invitation](https://raw.githubusercontent.com/abyss-made/gamelab/codex/playgrid-4-1-experience/docs/playgrid-4-1/screenshots/after/invite-returning-390.png)
