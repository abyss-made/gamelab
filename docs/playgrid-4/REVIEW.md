# Independent Codex review

A separate Codex reviewer inspected the implementation read-only, including follow-up review after fixes. No files were edited by the reviewer.

Substantive findings addressed:

- Restore reachable classic-avatar controls after choosing Use classic.
- Block first-time joining while the character catalog/draft is unavailable; make failed catalog loads retryable.
- Restore keyboard focus after choosing gallery items or customization options.
- Remember an active room in session storage and validate/rejoin it after refreshing another page.
- Keep an unfilled ad mount collapsed on subsequent render/resize calls.
- Mark a deliberately saved homepage identity as confirmed before opening an invitation.

Follow-up review found no substantive remaining bugs in identity persistence or Draw & Guess's desktop default/expanded/global focus integration. A final review additionally covers game-specific desktop sizing and visible-screen ad guards. Browser and automated test results are tracked separately in VALIDATION.md; source review is not a substitute for those checks.

The final review found one additional ad-lifecycle issue: catalog rebuilding removed an ad mounted inside `#games`. The games placement now mounts on the stable `#screen-selection` element outside the rebuilt card list. A browser regression verifies that navigation/search/filtering preserve the slot. No substantive regression was identified in the game-specific desktop sizing rules.

A randomized-name bounds run exposed variable roster height in Tycoon. The board now measures actual remaining desktop height rather than assuming a fixed header size. Review of that fix caught measurements while the room was hidden: hidden boards are now skipped, and revealing the room triggers the existing resize/fit listeners. A navigation → resize → Return to Game browser regression verifies the fix. Draw & Guess's resize hook also preserves phone chat drafts unless the wide/phone layout classification actually changes.
