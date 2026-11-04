# Shared game-feel system · implementation contract

This extends approved compositions; it is not a new application shell. Keep the current home hero, navigation, party continuity, alpha authentication and navy/lime brand. Materials distinguish games; they do not change rules. No RPS design is included.

## Visual hierarchy and reusable pieces

1. **Who / what / when:** game title, current phase or turn, named local/other participant and actual deadline. At desktop, 20–28px primary game heading; at phone 18–22px. Body text 13–15px recommended, key actions 13–14px. Approved dense board labels may be smaller; use an accessible detail/picker alternative instead of shrinking actionable text.
2. **Play surface:** keep it the largest region. Full-bleed dark surroundings, no generic dashboard card wall. Cream paper, green cloth, navy water, jade/ivory and wood belong to their approved game directions. Navy `#06131d`, panel `#102c39`, lime `#b7ff04`/approved lime action variants, warm foreground `#eef3e5`.
3. **Input dock:** selection is distinct from commit. One primary action for the actual phase. Minimum 44px control height, 12–16px panel padding, 8–12px related gap, 16–24px major gap. Target outline 2px with 3px visible keyboard focus; selected and disabled states use labels/shapes as well as color.
4. **Receipt:** one polite message describes accepted action, next participant or a known local invalid reason. Persist essential outcomes. Do not move focus for ordinary receipts. Error text associates to original input with `aria-describedby`; use `role=alert` sparingly.
5. **Result / party:** final board/score and host/member actions reflect actual room data. Preserve party identity. Host Choose Another Game, participant Vote/Ready affordances follow current room authorization. No implicit remount or lost chat history.

Reusable component contracts: `TurnIdentity`, `PhaseHeading`, `ActionDock`, `SelectionSummary`, `PrecisionPicker`, `PendingIntent`, `AcceptedReceipt`, `PrivateHand`, `PublicSeatBacks`, `LegalTargetGrid`, `ConfirmAction`, `RolePrivatePanel`, `ResultBoard`, `ResponsiveDetailSheet`. These are design names, not new dependencies or a framework migration.

## Interaction state machine

`eligible → local draft → local validation → emit existing action once → wait for actual view → accepted / still editable / expired`.

Do not infer acceptance from a button click, animation end, elapsed client timer or a Socket.IO transport send. Some current engine handlers silently drop invalid actions. Where explicit rejection is unavailable, keep drafts and use neutral waiting language. A future rejection acknowledgement requires a separate engineering change. Use current helper lifecycle, focus restoration and confirmation functions instead of replacing whole screens on each clock tick.

The static state explorer changes fixtures independently. A local control draft never advances to a fake success frame. Its extra review chrome lives outside the game iframe; it is not proposed product UI.

## Motion and pacing

| Token / event | Timing / easing | Trigger | Reduced motion |
|---|---|---|---|
| Control hover/focus | 100ms ease-out; ≤2px lift | Local pointer/focus | Border only |
| Selection | 120ms cubic-bezier(.2,.8,.2,1) | Valid local selection | Instant outline |
| Accepted card / piece | 140–240ms; per-game audit overrides | New accepted event/move ID | Instant placement; last-move marker |
| New score / transaction | 180ms opacity, signed delta persists 2s+ | Authoritative changed value | Static signed delta |
| Phase sheet | 180ms ease-out; ≤12px travel | Actual phase change | Instant panel |
| Win accent | 450ms maximum; one burst | Actual result | Static crown / result heading |
| Reconnect | No spinning play surface | Socket unavailable | Same text |
| Pool / golf travel | Existing sampled timestamps, never invented duration | Server path / animUntil | Meaningful position still visible; optional quick final-state presentation; no shake/zoom |

Never block new legal input waiting for decorative motion. Clamp delayed event catch-up to final state; don't replay a queue after reconnect. Cancel on unmount/game change; remove pointer listeners/timers. Maintain at most one animation per changed element. Avoid perpetual glows, bouncing avatars, flashing deadlines and particle layers on boards. Per-game audits specify deal/roll/capture/reveal details.

## Audio direction (specification only)

No audio files, WebAudio synthesis or paid music/sound APIs are supplied. This package specifies desired cues, not implemented sound. Claude should reuse licensed existing app cues when suitable; new samples need original/licensed sources and owner review. Silence is preferable to an unrelated stock effect.

Persist mute preference, honor existing Sound controls, initialize only after a user gesture. Separate low-volume action cues from short result/turn cues. Maximum one new cue at a time, no tick loop; mute background tabs. Never encode information solely in audio. Correctness/secret roles cannot trigger early sound. Do not fabricate cushion collisions if current physics events don't expose them. No voice feature or microphones.

## Responsive and accessibility acceptance

- Primary frames: 1440×900 and 390×844. Narrow guard: 360×740. Actual browser screenshots are included. These static checks are not a complete accessibility certification.
- Board itself can contain smaller targets (Battleship/Chess/Dots). Provide precision selectors, keyboard grid/list or expanded view; do not falsely claim every cell is 44px at phone width.
- Input focus, caret, draft selection and stable two-tap confirmation survive timer/state updates. Dialog traps focus natively and restores its launcher. Escape cancels local selection/dialog, never forfeits a match.
- Browser zoom 200%, mobile keyboard, screen reader, actual iOS/Android touch and contrast measurement are integration checks still required. If content no longer fits, permit page/sheet scrolling and scroll focused controls into view rather than clipping/locking body.
- Color has named side/rank/shape/initial backup. Focus ring contrasts on each game material. No autoplay motion/audio required to understand play. Respect OS reduced motion and offer app setting without overriding OS preference silently.
- Private data is absent from unauthorized DOM, accessibility names, image URLs and datasets. CSS blur, hidden panels and cover cards are not access control.

## Design versus engineering

**Design/CSS:** materials, hierarchy, spacing, naming, art, persistent marks, transitions and optional cue selection.

**Client engineering:** keyed DOM, real state/action mapping, pointer transforms, focus/caret preservation, cancellation, event deduplication, local draft reconciliation and safe avatar composition.

**Separate engine/protocol changes:** any Pool/Golf physics retuning, new rejection acknowledgement, manual Tycoon debt/bankruptcy phase, new game rules/bot behavior and Avatar v2 synchronization. They require explicit implementation scope and regression evidence; this package makes none of those changes.
