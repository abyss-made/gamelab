# Playgrid 4.1 — production changes for Issue #70

- [Implementation handoff and known limits](HANDOFF.md)
- [Game contracts and integration notes for Claude](CONTRACTS.md)
- [Audit and expected rules](AUDIT.md)
- [Real desktop/mobile before-and-after screenshots](SCREENSHOTS.md)
- [Validation and review evidence](VALIDATION.md)
- [Real-browser check results](browser-checks.json)

Source lives in the existing `node-server` application. This folder contains evidence and reproduction scripts, not a separate demo. Branch: `codex/playgrid-4-1-experience`. PR base: `codex/playgrid-2-redesign`. No merge or deployment.

If GitHub API access prevents creating the review PR from the cloud session, open [the branch comparison](https://github.com/abyss-made/gamelab/compare/codex/playgrid-2-redesign...codex/playgrid-4-1-experience?expand=1). Set base `codex/playgrid-2-redesign`, compare `codex/playgrid-4-1-experience`; use title **Playgrid 4.1: party onboarding, word rules and multiplayer game polish** and paste [PR.md](PR.md). Create the PR without merging. Add `@codex review` as a PR comment to request the GitHub Codex review as well.

From a checkout with working GitHub API access:

```sh
git fetch origin
git switch --track origin/codex/playgrid-4-1-experience
gh pr create --repo abyss-made/gamelab --base codex/playgrid-2-redesign --head codex/playgrid-4-1-experience --title 'Playgrid 4.1: party onboarding, word rules and multiplayer game polish' --body-file docs/playgrid-4-1/PR.md
gh pr comment codex/playgrid-4-1-experience --repo abyss-made/gamelab --body '@codex review'
```

If the local branch already exists, use `git switch codex/playgrid-4-1-experience` instead of `--track`.
