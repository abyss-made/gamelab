# Responsive and accessibility specification

## Targets and adaptation

| Target | Layout contract |
|---|---|
| 1440×900 | Dominant gameplay surface with thin shell. Drawing tools left/content center/secondary right; word form + nearby public standings; tactical boards remain geometrically correct. |
| 768×1024 | Move secondary panels below or into existing named overlays before shrinking targets. Board orientation/rules unchanged. In portrait the reading order remains task → public surface → local action → secondary details. |
| 390×844 | Full-width board/canvas; title/time compact; word input and committed action together. Fold history/bracket/review inside named scroll regions. Keep private/public distinction explicit. |
| 360×740 | Preserve task and targets; wrap headings/names, reduce decorative spacing and move secondary text. Never shrink every label/control or clip a canvas/control just to pass document bounds. |
| 390×520 keyboard emulation | visualViewport reduces available content area. Main content may scroll; focused field and its commit/Done action stay above the keyboard. Keep drafts/caret and surrounding label; no input autofocus on touch that unexpectedly opens the keyboard. This is an emulated viewport, not an iOS/Android device test. |

Use minmax(0,1fr), min-height:0 and board flex-shrink:0 deliberately. Keep square boards square, circular slots circular, drawing coordinate surface 4:3. Decorated wrappers may have borders; pointer mapping measures the real canvas. Do not scale a game into a tiny phone thumbnail.

## Keyboard and focus

- Preserve shipped C.keepFocus/C.makeConfirm behavior, including stable two-tap resign during opponent/timer rerenders. Meaningful intent must never be duplicated by click plus key handlers.
- Use a real form for text entry. Enter submits only if eligible and not composing. Shift/IME/selection behavior stays native. Trivia 1–4 shortcuts do not run while typing in chat or another text control.
- Boards: tab/arrow/Enter as the current accessible model allows; every actionable coordinate has a readable label. Checkers forced piece and legal destinations remain discoverable. Dots dense precision picker offers every valid coordinate; the sample limited dropdown is an illustration, not the production option set.
- Modal/overlay: named dialog, focus trap only while modal, Escape where cancellation exists, restore to opener. Draw Clear can preserve native confirm; a custom reference does not waive current test/behavior parity.
- Results move focus to a semantic result heading once, then expose role-appropriate actual shared actions. Countdown ticks never steal focus. Phase changes announce once, not per paint.

## Feedback and color

3px visible focus ring distinct from selected outline. Ownership uses side names, numbers/initials/patterns. Right/wrong uses words plus outline/symbol; low time uses steady text/accent. Keep occupied/disabled board marks at readable contrast. Primary labels target WCAG AA 4.5:1, large text 3:1; validate computed production colors and all states, not only palette swatches. Do not infer conformance from screenshots.

Native labels/fieldset/group/region semantics; decorative SVGs alt empty, meaningful drawings have neutral role-appropriate descriptions. Do not place a secret answer in alt, title, DOM data, logs or spectator nodes. Live announcements: polite accepted/turn/outcome; assertive only a meaningful rejected submission, not every invalid hover.

## Privacy, disconnection and motion

Authorization is based on server view. A local word-cover button is not security. On disconnect, disable new intents and keep only authorized last public/private view until actual role resync; clear private content if role/party changes. Do not invent a Pause action or freeze server time. Reconnect reanchors the deadline and snaps to state without replaying stale effects.

Reduced motion removes travel/scale/flash and preserves immediate position, ownership, check/last move, score and textual receipt. No autoplay atmosphere, looping shake or rapidly blinking clocks. Existing mute persists; no audio-only meaning. Test browser zoom/reflow, keyboard-only use and actual screen-reader/device behavior during implementation; these remain unverified by design mockups.
