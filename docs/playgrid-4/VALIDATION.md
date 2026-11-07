# Validation and practical limits

## Browser evidence

Chromium 154.0.8037.57 (Debian), Node 24.19.0. Tests use the actual local Express/Socket.IO server, separate browser contexts and additional socket peers where required. No live Render instance was modified.

- **120 game captures:** all 20 selectable games at 1366 × 768, 1440 × 900, 1920 × 1080, 2560 × 1440, 390 × 844 and 360 × 800. No horizontal document overflow in the captured states.
- **40 desktop bounds assertions:** boards/action controls for Pool, Golf, Property Tycoon, Battleship placement, Chess and Ludo fit the four requested desktop viewports.
- **Draw & Guess:** default desktop canvas fits entirely inside each viewport, retains 4:3, and requires no vertical document scroll. Separate tests exercise default, expanded and global focus, confirm visible players/chat and reachable Clear, and transmit real mouse strokes to another client. Undo clears the remote sample between sizes/modes so a previous stroke cannot make a later coordinate check pass accidentally.
- **Creator:** all 35 choices offered; desktop/mobile screenshots at all six sizes; additional category/accessory views and a 35-character SVG contact sheet.
- **15 focused integration checks:** deliberate homepage save, first invite name validation, character sync, reload/return restoration, returning identity/edit, classic controls/sync, failed catalog retry, desktop social/focus/coordinate checks, phone draft-chat preservation on height change, ad visibility/navigation, failed room-code joins retaining the old seat, invalid remembered rooms, hash invites, and Tycoon navigation/resize restoration. See `flow-checks.json` for the individual reported checks (some combine related assertions).
- **148 PNGs:** 120 opening game views plus creator, drawing workspace, customization, invitations, expanded drawing, ad preview, baseline comparisons and the asset contact sheet. The two JPEG contact sheets are navigation aids, not replacement evidence.

Machine-readable bounds/viewport records are in `checks.json`. Original PNGs are indexed in [SCREENSHOTS.md](SCREENSHOTS.md).

## Repeat browser validation

Requires Python Playwright and Chromium; they were available in the execution environment. No production dependency was added.

```sh
python docs/playgrid-4/verify.py
python docs/playgrid-4/verify_flows.py
```

These scripts use isolated localhost ports 43994/43995 and terminate their servers afterward. To reproduce the baseline, use a detached worktree at the base commit, make the existing Node dependencies available there, then run:

```sh
python docs/playgrid-4/capture_before.py /path/to/base-worktree
```

## Automated repository suite

The repository's `npm --prefix node-server test` runs 35 test programs covering avatar validation/UI/live sync/storage rollback, drawing/fill/undo, multiplayer rules, private-alpha access, room lifecycle, game UIs, navigation, keyboard controls, bots and reliability. Existing UI fixtures now confirm identity where a room-code join requires it and assert silent restoration after refresh. Draw & Guess focus tests now require the desktop social rail to remain visible. No test program was removed or deliberately skipped.

Final command and result are recorded in `AUTOMATED_TESTS.txt` after completion. This environment used its installed Playwright plus a temporary browser-path alias to `/usr/bin/chromium`; that machine-specific alias is not committed.

## Remaining limits

- Artwork is a material pass over all 35 existing bases, plus individual costume/construction refinements for all 32 supporting characters. It is **not** a complete bespoke redraw of all 35 silhouettes/faces/accessory layers. This remains the largest gap against the creative brief.
- The six-size game matrix captures opening-play states. It is not exhaustive visual coverage of every endgame, auction, disconnect overlay, long chat history or animation frame. The automated game suites cover additional behaviors, including full games and reconnects.
- Phone layouts can scroll vertically, particularly long settings, scorecards and property management. The audit does not claim that every mobile game fits in one viewport. The primary desktop board/control assertions are deliberately game-specific.
- Browser verification used Chromium and emulated phone/touch contexts, not physical Safari/iOS/Android devices or a cross-browser lab. Phone height-change tests simulate resize; they do not prove every native keyboard behavior.
- The live Render URL was inaccessible from this environment (gateway 403/tunnel restriction). Local application testing and automated alpha-auth checks passed separately; live-site appearance/access was not verified.
- Ads remain disabled. Only labeled previews and lifecycle/consent guards were exercised; no Google SDK, real publisher/slot IDs, live fill, account approval or CMP was tested. An owner-supplied consent-aware SDK loader is still required to serve ads.
- No merge or deployment was performed. Visual acceptance, the remaining illustration work and eventual ad enablement remain review decisions.
