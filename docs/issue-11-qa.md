# Issue #11 – Playgrid 2.0 visual integration: QA notes

Screenshots of the **real running app** (Playwright/Chromium, not mockups) are in `docs/screenshots/issue-11/`:
home / create-modal / lobby / Draw & Guess on desktop; home / lobby / Draw & Guess on a 390px phone.
Not captured: Four in a Row gameplay, results/podium and settings modal (restyled via the same tokens, verify manually).

## Preview locally
`cd node-server && npm ci && PORT=3000 npm start` then open http://localhost:3000.

## Design deviations from `playgrid/` prototype
- Reskin of the existing DOM/CSS (navy `#101722` panels, lime `#c6f36b` accent, Space Grotesk + Inter), not a replacement app.
- Drawing canvas stays white (needed for real drawing colours); game art SVGs unchanged.
- No bots, no new server mechanics; no ready-up system added (not currently supported by the server).

## Manual QA checklist
Desktop and phone:
- [ ] Alpha gate (if enabled) and `/healthz` unchanged
- [ ] Home: profile edit, Quick Play, Create Lobby, Join with code, lobby list empty/loading/error states, 10 Coming Soon tiles
- [ ] Create private room -> room code chip copies code; Copy link shows "Copied"; Share works
- [ ] Second player joins via `/r/CODE`; host-only settings hidden from non-hosts
- [ ] Draw & Guess: draw (touch + mouse), guess, chat, enlarge canvas, results; spectators never see the word
- [ ] Four in a Row: play, spectate, winner stays
- [ ] Reload / go offline: "Reconnecting..." indicator shows, then rejoins
- [ ] Phone keyboard with chat input, portrait/landscape, no horizontal scroll, modals scroll
