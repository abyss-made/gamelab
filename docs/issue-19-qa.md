# Issue #19 QA: persistent lobby, focus-mode chat, viewport fill, fitting controls

Measured with headless Chromium (Playwright) against the running app. **No physical iPhone or Safari testing was done.**
Screenshots are in `docs/screenshots/issue-19/` (`before-*` / `base-*` from `codex/playgrid-2-redesign`, `final-*` / `fin-*` from this branch).

## Before / after

| Check | Before | After |
|---|---|---|
| Landing 1440x900: shell width / page height | 1360px card with 40px margins, 900 | 1440px (full width), 900 (no scrollbar) |
| Landing 1280x720: page height | 723 (scrolls) | 720 (no scrollbar) |
| Landing 1280x800: shell width | 1232px | 1280px |
| Draw & Guess canvas, normal -> Expand, 1440x900 | 785x589 -> 900x675 | 867x650 -> 1121x841 |
| Same, 1280x720 | 657x493 -> 772x584 | 707x530 -> 881x661 |
| Same, 390x844 | 273x205 -> 388x291 | 291x218 -> 388x291 |
| Same, 844x390 | 482x362 (overflowed the viewport) -> 455x341 | 482x362 -> 452x339 (fits; chat is a toggle) |
| Chat while expanded on phones | hidden (`display:none !important`) | Chat button + unread badge, input and send available |
| Create-lobby dialog 390x844: Create button bottom | 768 (modal bottom 793) | 819 (sticky footer, inside 844) |
| Create-lobby difficulty buttons at 390px | clipped / overlapping | 2x2 grid, no clipping (asserted at 8 widths) |

## Automated coverage

`test/phase15.js` (new, Playwright, skipped if Playwright is absent):

- Lobby persistence: Games / Rooms / Play tabs, Back to Games, logo, browser Back/Forward and the Return button all keep the server room (same code, host, roster, chat, game phase); explicit Leave Lobby leaves and passes host on; opening another invite shows a "will leave it" warning and joins nothing; deep link and reload still join without duplicate membership.
- Focus mode at 390x844, 844x390, 1280x800, 1440x900 and 1280x720: canvas size before/after, 4:3 kept, fully on screen, chat opens without covering the canvas, history kept, send works, unread badge, Escape closes and chat returns to the page.
- Landing page has no vertical scrollbar at 1440x900, 1280x800 and 1280x720; the shell spans the viewport.
- Create dialog at widths 320, 375, 390, 430, 600, 768, 1280 and 1440, plus 640x300: fits the viewport, action buttons reachable, no clipped control text, no overlapping segmented buttons, no horizontal overflow.

## Limitations

- Real iOS Safari behaviour (toolbar collapse, on-screen keyboard, safe areas) is unverified. The layout follows `visualViewport` and `100dvh`, and hides the tool strip while the chat input is focused in portrait, but this was only checked by emulation.
- 200% zoom was approximated by the 320px width run, not by a real zoomed browser.
- Portrait phones stay width-bound: a 4:3 canvas on a 390px screen cannot exceed about 388x291.
- The home hero art is scaled with `object-fit: contain`; at very tall, narrow windows it leaves empty space above it rather than stretching.
