# Shared visual grammar · approved Stage B

The owner has approved the directions. tokens.json, COMPONENT-SPECS.md, RESPONSIVE-ACCESSIBILITY.md and MOTION.md provide the Stage B contracts. CSS is in shared.css; per-game source and PNGs resolve exact composition.

- Shell navy #06131D / deep header #04111C; foreground #EDF4EF; brand action #B3F84C with dark #17270E; visible focus #D6FF8B. Retain the existing mark, self-hosted Inter and portrait sprite.
- Surfaces vary by game: ivory sketchpaper, cobalt cabinet, ceramic X/O, electric tournament blue, linen stitching, teal letter desk, jewel quiz, deep blue word chain, fieldbook green, coral relay, plum ballot, midnight dossier and jade/ivory checkers.
- Spacing 6/8/12/16/24/32px. Rounded controls 9–12px; surfaces 14–22px. Body 14px desktop/12–14px phone, primary tasks 24–45px; tiny labels are supplementary, never the only rule or state.
- Phone primary actions ≥44px. Dense color swatches and board targets need appropriate alternatives: Dots edges have 40px invisible target areas; Four in a Row keeps full columns as targets; keyboard focus and coordinates remain required. Do not infer that a static hit-area preview proves touch usability.
- A named side, initial, symbol, pattern or text accompanies ownership and right/wrong feedback. Focus differs from selection; filled/occupied board cells keep full contrast despite unavailable interaction.
- Turn/time remain authoritative. Decorative motion never resets deadlines. Reduce motion to immediate end-state placement and persistent text. No flashing clocks, full-screen shake or looping distraction.
- Desktop target 1440×900; phone 390×844. Narrow 360×740 is additionally rendered. Tablet/keyboard reference layouts and the state families are now included. Claude must verify the actual implementation on real devices and assistive technology.
- Forms have labels and normal keyboard input. Typing is retained in the word games. No artificial virtual keyboards, drag-only letters or hidden draft loss.
- Drawing pages preserve 800×600 coordinates and source tool semantics. The dragon and cat are original example drawings, not shipped fixed backgrounds, auto-drawing features or hidden-answer hints.

Design-preview controls are static illustration; native focus, inputs and range presentation can be inspected. They do not send game actions or claim successful gameplay.
