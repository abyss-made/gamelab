# Final game-feel delta matrix · Issue #61

Reference code: `codex/playgrid-2-redesign @ 06609a4`, still the latest remote reference at this audit. These are source/local-preview findings, not a claim that the live Render site was inspected. Preserve completed directions at `87d8b35` (eight), `71ca099` (remaining) and `f478a1e` (#58). Do not redo their boards, card backs, game art, 18-hole Golf coverage or 247-state pack.

New high-impact artifacts are six focused components in `game-feel/`. The other rows either have a complete approved design already, or need engineering acceptance of that design rather than another creative direction. The scope is 20 active games after excluding RPS. No designs for removed/hidden games are supplied.

| Game | Current / existing good behavior to keep | Remaining delta and concrete action | Priority / artifact |
|---|---|---|---|
| Pool | Server-sampled paths, elapsedMs resume, fine-aim keyboard, placement and shoot payload already work | Cue follows angle/power; brief release; no click-created outcome. Preserve sampled playback and avoid predicted rail sounds. | P0 · [Cue/precision reference](game-feel/index.html?game=pool) |
| Color Stack | Server-private hands, drawn-card keep/pass, wild allowlist and automatic one-card announcement | Current hand rebuilds and `common.js` FOCUS_KEYS lacks `card`; keep numeric ID/focus/wild choice through unrelated updates and support long-hand inspection. | P0 · [Stable hand](game-feel/index.html?game=colorstack) |
| Go Fish | Clock-safe local repaint and eligible rank/target filtering already exist | Current click clears rank/target immediately; retain request while waiting, derive new books only from public view deltas once. Correct Ace=14. | P0 · [Ask/book reference](game-feel/index.html?game=gofish) |
| Ludo | Real die/movable list, safe cells, roll identity and accepted move animation already exist | Shared-cell owner+number picker, stable `data-token` focus identity (also absent from helper keys). Keep same die. | P0 · [Shared-cell picker](game-feel/index.html?game=ludo) |
| Property Tycoon | Two-sided offers, current trade IDs, build/sell and automatic liquidation already exist | Review must remain guarded if offer disappears. Current view exposes no expiry timestamp, so use neutral “no longer available,” not a made-up timer/reason. | P0 · [Offer review guard](game-feel/index.html?game=tycoon) |
| Mini Golf | 2D course geometry, sand/water, replay elapsedMs and 18 authored holes already exist | Temporary thumb loupe mirrors actual SVG geometry; fine controls and explicit commit keep the target visible. No new terrain/camera/physics. | P1 · [2D precision reference](game-feel/index.html?game=golf) |
| Battleship | Existing 10×10 rules and friendly/private view; approved ship art and #58 precision picker | Implement the already-specified placement/overlap/rotation and row/column parity. Preserve fleet 5/4/3/3/2; Random & Lock semantics. | P0 integration; [prior audit](https://github.com/abyss-made/gamelab/blob/codex/issue-58-game-feel-avatar-studio/design/playgrid-worldclass-58/games/battleship/AUDIT.md) |
| Chess | Legal move data, promo Q/R/B/N, clocks/draw/resign helpers | Integrate approved promotion/check/final board states; confirm focus survives clock refresh. No hint engine or new board. | P1 integration; prior Chess audit |
| Checkers | Server legal/forced capture/chain and existing confirmation helper | Port approved crown/capture/chain cues; no piece-switch during a chain. No new rule or asset needed. | P1 integration; prior Checkers audit |
| Draw & Guess | Quality benchmark: direct canvas/tools/guess feed | Keep simple. Only integrate reviewed avatar rendering and already-approved focus/clear/private-word checks. | P2 selective; no new screen |
| Four in a Row | Quality benchmark: whole-column target, fast action, strong side identity | Preserve no-confirm drop and actual winning-line result. Integrate avatar fallback only; no new panels. | P2 selective; no new screen |
| Tic Tac Toe | Nine-square simplicity, approved ceramic marks | Port accepted stamp/final result from existing package; no new interaction gap justifies extra art. | P2 integration |
| Dots & Boxes | Exact edge semantics and approved quilt ownership | Verify dense-board hit testing/keyboard alternative from prior spec; owner initials persist without motion. | P1 acceptance, existing design |
| Word Scramble | Typed guess and bank/phase guards | Preserve draft/caret on rejection, reveal only when permitted; approved letter rack already complete. | P1 acceptance, existing design |
| Trivia | Immediate locked selection, private correctness until reveal | Port existing reveal labels and lock focus; no extra confirmation or early-correct sound. | P1 acceptance, existing design |
| Word Chain | Turn/required-letter/duplicate semantics | Preserve rejected text and turn label; existing letterpress direction already covers out/reconnect. | P1 acceptance, existing design |
| Categories | Partial answers vs done, private review boundary | Preserve input drafts/final-ack logic and keyboard-open form scrolling specified previously. | P1 acceptance, existing design |
| Drawing Telephone | Existing work/reveal phases and drawing caps | Approved prefix-only reveal must ship without future-chain thumbnails; keep myDone as acceptance. | P0 privacy integration, existing design |
| Bluff Battle | Anonymous options and existing own-vote guards | Approved write/vote/reveal covers completeness; no new truth/author hint from avatar reactions. | P0 privacy integration, existing design |
| Impostor | Role-specific word/category/clue/vote/guess views | Preserve the approved privacy boundaries; avatar reactions never reveal role or votes. Cover is local, not access control. | P0 privacy integration, existing design |

For the existing 12 remaining directions use [their approved implementation handoff](https://github.com/abyss-made/gamelab/blob/codex/playgrid-premium-rest-design/design/playgrid-premium-rest/IMPLEMENTATION-HANDOFF.md). The [#58 handoff](https://github.com/abyss-made/gamelab/blob/codex/issue-58-game-feel-avatar-studio/design/playgrid-worldclass-58/HANDOFF.md) remains a broader reference except the Go Fish rank correction below. Completed designs are not undone by this matrix.

## Pool

**Source evidence:** `public/js/games/pool.js` already has `toTable`, `legalSpot`, `currentBalls`, arrow/Shift fine control and `animT0 = performance.now() - a.elapsedMs`. Do not replace those just to call them new.

**New component:** cue-stick transform uses the same aim radians as draft; changing power retracts ≤16 simulation units, not a guessed physical prediction. Explicit Shoot shows a 100ms stick release and neutral pending receipt. Accepted path samples control all ball motion. `sampleAt` is a standalone reference for testing existing interpolation behavior, not a request to replace a working engine/client.

**States:** aim, power, drafted, received sample, halfway resume, settled, reconnect. A replay control sits outside the product component and is labeled offline fixture. It is not proof of a network acknowledgement. No exact collision/pocket sound without authoritative event data; sampled positions alone do not give reliable collision timestamps.

**Before → after acceptance:** pointer/keyboard gives same angle; changing power never shoots; one click yields one draft; cue stays aligned across portrait rotation; view updates do not reset aim unnecessarily; no controls while busy/reconnecting; late replay starts at elapsed position, not frame zero. Compare actual app at 1440/390/360. CSS/SVG delight is client work; tunneling/cushion/pocket restitution is a separate reproducible engineering task with no parameter change authorized here.

## Color Stack

**Source evidence:** `public/js/games/colorstack.js` assigns `hand.innerHTML`; cards use `data-card`; `common.js` focus keys do not include card. The completed package already supplies the fan, opponent backs, table and wild state.

**New component:** `createFan` keys buttons by numeric card ID, avoids moving unchanged nodes, retains selection and focus, uses roving arrows/Home/End, shows unavailable reason and separates inspection from Play. Expanded grid is an optional mobile inspect mode. Same-card refresh leaves an open wild picker alone; real card/eligibility change closes an invalid draft.

**States:** 12-card compact/expanded, legal/illegal inspection, wild color, unchanged refresh, reverse/skip/draw-two received snippets. The latter are generated by the unchanged rule module. A real application must apply the entire new view, not mix snippets or predict next turn from animation.

**Motion/audio:** 120ms selection lift ≤8px; accepted play 180ms; reverse/skip caption stays; batch deal ≤480ms, not one long sequence per huge hand. Optional paper tap/short action cue only on actual accepted event. Reduced motion uses instant placement and named direction/penalty. Do not add a Call UNO feature.

**Before → after acceptance:** real card IDs survive sort; all cards inspectable by keyboard; illegal card cannot emit; rank/color remain visible in long hands; stable focus and wild choice across a tick; r/b/g/y and numeric card payload; public seats contain backs/count only. Add `card` identity to the existing helper or preserve it through keyed DOM without regressing its other keys.

## Go Fish

**Critical correction:** current `server/games/gofish.js` builds **ranks 2–14** and `common.rankLabel` maps **14 to A**. My #58 handoff incorrectly said Ace=1. This package supersedes that mapping; no server change is needed.

**Source evidence:** current onClick emits ask then clears pickRank/pickTarget immediately; repainting guard already avoids resetting the timer. Keep that timer behavior. Current view supplies public books/counts, local hand and an eight-line text log, without stable event IDs.

**New component:** preserve named pending rank/target until meaningful view/turn change; do not pretend a click was accepted. `BookLedger` seeds initial public books without replay, then emits only newly observed `(player,rank)` per mounted game. Duplicate snapshot produces no celebration. Reset ledger when game instance changes. Do not parse human log strings into authoritative transfer events or invent an exact hidden-card path.

**States:** rank/player selection, pending summary, actual observed book, duplicate view, Ace request, unchanged view. Book fixture is generated from a prearranged but real rule-module state; it is not a completed multiplayer match.

**Motion/audio:** accepted local hand arrival ≤180ms, new book gather 240ms. Opponent hands remain backs. One optional short book chime; muted/reduced motion keeps book rank and score text. A missed/unconfirmed intent retains editable draft; no automatic resends. If exact acknowledgement/rejection timing is required, scope a separate protocol change.

**Before → after acceptance:** no absent-rank/self/empty-target ask; Ace emits14; ask button not repeatedly actionable while local pending; clock continues unchanged; draft survives unrelated refresh; accepted public book animates once; reconnect initial history does not replay; spectators have no private hand/rank selectors.

## Ludo

**Source evidence:** movable IDs and `lastEvent/rolls` already exist; `data-token` is absent from shared focus keys. Safe-cell multi-owner tokens can become ambiguous when very small.

**New component:** shared-cell popover/list names owner+number and only enables `g.movable`. The included fixture comes from current `movableTokens`, not invented dice. Same-roll updates do not switch selected token. The visual safe-cell fragment is an input aid, not a new board.

**Before → after acceptance:** A1/A2/N1 remain distinguishable; own token index matches board/list; unavailable owner never emits; same accepted roll used; no reroll or predicted capture. Keep existing dice motion (≤300ms), accepted token path (≤500ms), captured-return receipt (220ms) and actual bonus rules. Reduced motion snaps with text. Optional toy click, not emoji dice. Add stable `token` focus identity while retaining current helper.

## Tycoon

**Source evidence:** current trade view has immutable `id/from/to/giveCash/askCash/giveProps/askProps`, no expiry timestamp. Server validates offer again at accept; silent invalidation can occur before a button click. Existing engine automatically sells upgrades and bankrupts an insufficient payer; no manual debt phase is proposed.

**New component:** side-by-side You Give/You Get with property IDs/names, upgrades and cash; projected balances are a local arithmetic preview, never applied balances. Incoming offer review is bound to ID41. If that offer disappears while review is open, preserve modal/focus and disable Accept with neutral reason. Never silently accept a replacement offer or infer that disappearance means expiry.

**Before → after acceptance:** both sides and cash shown before accept; ID checked against latest view; stale offer cannot emit; Escape/close returns to opener; pending intent changes no cash/ownership. The sample uses fixture-owned Blossom Avenue/Harbor Walk, independent of prior unowned-deed examples. Actual transfer follows accepted state only. 180ms sheet transition/soft paper cue optional; no urgency countdown without real data.

## Golf

**Source evidence:** current 700×440 geometry, sampled paths/elapsedMs, sand/water and fine keyboard control work; #58 already supplies all 18 top-down hole illustrations. Do not redraw them or make an isometric game.

**New component:** while the finger is down, a 130×130 simulation-unit loupe mirrors the **same** SVG world via `<use>`, including boundaries and current aim. Pointerup/cancel/lostcapture removes it. Fine buttons adjust 0.5°, Shift arrow5°, power2–100%; releasing aim never submits. Putt is explicit.

**Before → after acceptance:** loupe shows the same geometry (not a decorative approximation or predicted path); it never covers Putt/power; all pointer cancellation paths clean up; portrait input transforms remain exact if production uses the approved rotated layout; unchanged pars/hazards/stroke cap; no input while rolling. Reduced motion retains static zoom while finger is down and removes decorative pulse. Replay/motion uses actual samples; any new roll friction/cup capture behavior is a separate engine investigation.

## Shared completion gate

Port targeted components into the existing mount/update/unmount lifecycle; do not iframe these labs as games. Keep existing alpha/rooms/chat/settings/results and benchmark simplicity. Cancel timers/RAF/pointer capture on unmount. Local fixtures are explicitly reviewer controls, never product features. Sound directions do not include new audio assets or new WebAudio code. Test actual host/participant/spectator/reconnect and actual mobile devices after integration; static previews and offline rule fixtures do not prove multiplayer correctness.
