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

## Owner-approved direction revision (PR #12 comment)
- Palette/typography per spec (#050F1B / #0B1B2D / #20364C / #A9FF18 / #F7FAFC / #9AAFC3, Space Grotesk + Inter); angular lime play emblem + PLAYGRID wordmark.
- Landing: nav (Play/Games/Lobbies anchors, room-code field, Play Now), stacked PLAY / TOGETHER / ANYWHERE hero, Create Room / Join Room, three trust cues, single column on phones.
- Game selection: Quick Play header, Draw & Guess + Four in a Row cards, one disabled "More games - Coming soon" card (lists the ten planned games as disabled chips, kept so the ten Coming Soon titles are preserved), join-by-code and profile cards on the right (stacked below on mobile), honest public-lobby list (no "Your Rooms": the app has no room persistence).
- Draw & Guess: round / timer / difficulty in the top bar; tool column left of the 4:3 canvas on desktop.

### Deviations / open items
- **Reference image not viewed:** github.com/user-attachments/... returned 403 to the automation, so this was built from the written spec only. Needs owner comparison against the storyboard.
- **Illustration trio is a temporary vector placeholder** (hoodie character, robot, cat). Approved artwork asset needed.
- Not yet reworked: lobby layout reordering (host settings left / code centre), results podium restyle beyond palette, settings modal segmented controls. Not screenshotted: drawing tools column with a live drawer, Four in a Row, results.
