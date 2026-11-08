# PR #73 — fresh integrated browser captures

These are actual Express + Socket.IO Chromium screenshots after merging production PR #72. The [original before/after gallery](../SCREENSHOTS.md) remains intact. The integration captures use a separate evidence directory and do not replace the historical evidence.

| View | 1440×900 | 1366×768 | 390×844 | 932×430 |
|---|---|---|---|---|
| New invitation | [Open](screenshots/after/invite-new-1440.png) | [Open](screenshots/after/invite-new-1366.png) | [Open](screenshots/after/invite-new-390.png) | [Open](screenshots/after/invite-new-932.png) |
| Returning invitation | [Open](screenshots/after/invite-returning-1440.png) | [Open](screenshots/after/invite-returning-1366.png) | [Open](screenshots/after/invite-returning-390.png) | [Open](screenshots/after/invite-returning-932.png) |
| Lobby briefing | [Open](screenshots/after/lobby-intro-1440.png) | [Open](screenshots/after/lobby-intro-1366.png) | [Open](screenshots/after/lobby-intro-390.png) | [Open](screenshots/after/lobby-intro-932.png) |
| Word Chain | [Open](screenshots/after/wordchain-1440.png) | [Open](screenshots/after/wordchain-1366.png) | [Open](screenshots/after/wordchain-390.png) | [Open](screenshots/after/wordchain-932.png) |
| Categories | [Open](screenshots/after/categories-1440.png) | [Open](screenshots/after/categories-1366.png) | [Open](screenshots/after/categories-390.png) | [Open](screenshots/after/categories-932.png) |
| Telephone | [Open](screenshots/after/telephone-1440.png) | [Open](screenshots/after/telephone-1366.png) | [Open](screenshots/after/telephone-390.png) | [Open](screenshots/after/telephone-932.png) |
| Bluff | [Open](screenshots/after/bluff-1440.png) | [Open](screenshots/after/bluff-1366.png) | [Open](screenshots/after/bluff-390.png) | [Open](screenshots/after/bluff-932.png) |
| Impostor | [Open](screenshots/after/impostor-1440.png) | [Open](screenshots/after/impostor-1366.png) | [Open](screenshots/after/impostor-390.png) | [Open](screenshots/after/impostor-932.png) |
| Go Fish | [Open](screenshots/after/gofish-1440.png) | [Open](screenshots/after/gofish-1366.png) | [Open](screenshots/after/gofish-390.png) | [Open](screenshots/after/gofish-932.png) |
| Dots & Boxes | [Open](screenshots/after/dotsboxes-1440.png) | [Open](screenshots/after/dotsboxes-1366.png) | [Open](screenshots/after/dotsboxes-390.png) | [Open](screenshots/after/dotsboxes-932.png) |
| Golf | [Open](screenshots/after/golf-1440.png) | [Open](screenshots/after/golf-1366.png) | [Open](screenshots/after/golf-390.png) | [Open](screenshots/after/golf-932.png) |
| Tycoon | [Open](screenshots/after/tycoon-1440.png) | [Open](screenshots/after/tycoon-1366.png) | [Open](screenshots/after/tycoon-390.png) | [Open](screenshots/after/tycoon-932.png) |

## Played-state captures

- [bluff-vote-1440](screenshots/flows/bluff-vote-1440.png)
- [categories-rejection-1440](screenshots/flows/categories-rejection-1440.png)
- [categories-rejection-390](screenshots/flows/categories-rejection-390.png)
- [dots-capture-1440](screenshots/flows/dots-capture-1440.png)
- [drawing-landscape-932](screenshots/flows/drawing-landscape-932.png)
- [gofish-request-1440](screenshots/flows/gofish-request-1440.png)
- [gofish-request-390](screenshots/flows/gofish-request-390.png)
- [golf-collision-1440](screenshots/flows/golf-collision-1440.png)
- [golf-harbor-1440](screenshots/flows/golf-harbor-1440.png)
- [golf-harbor-390](screenshots/flows/golf-harbor-390.png)
- [golf-tee-390](screenshots/flows/golf-tee-390.png)
- [returning-390](screenshots/flows/returning-390.png)
- [telephone-reveal-1440](screenshots/flows/telephone-reveal-1440.png)
- [tycoon-1366](screenshots/flows/tycoon-1366.png)
- [tycoon-1440](screenshots/flows/tycoon-1440.png)
- [tycoon-390](screenshots/flows/tycoon-390.png)
- [tycoon-932](screenshots/flows/tycoon-932.png)

The matrix contains 48 viewport screenshots and 17 played-state screenshots. Three independent browser clients perform the flow checks; the matrix additionally uses a real Socket.IO peer. Room codes/names/deals are randomized local fixtures. Longer mobile views scroll; captures preserve the requested viewport dimensions.

Reproduce from the repository root:

```sh
PG41_EVIDENCE_DIR="$PWD/docs/playgrid-4-1/integration-pr73" python docs/playgrid-4-1/verify.py
PG41_EVIDENCE_DIR="$PWD/docs/playgrid-4-1/integration-pr73" python docs/playgrid-4-1/capture.py after
```

These scripts start isolated local servers, with alpha disabled only for the fixtures. No Render or production endpoint is accessed.
