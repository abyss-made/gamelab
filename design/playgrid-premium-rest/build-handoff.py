from pathlib import Path
import json
P=Path(__file__).resolve().parent;models=json.loads((P/'state-model.json').read_text())
contracts={
'drawguess':('SketchSession → ToolRail + DrawingSurface + PrivateWordPanel / GuessFeed + PlayerScores','phase, drawerId, choices, word, hint, guessed, turnId, turnResult; room members supply player scores','action:{type:"choose",index}; draw:{op:"begin",x,y,color,size}, {op:"pts",pts}, {op:"end"}, {op:"fill",x,y,color}, {op:"undo"}, {op:"clear"}; guess uses the existing chat/guess path in main.js','Never serialize choices/word for unauthorized roles. Measure the actual 800×600 canvas element, not its decorated wrapper; inverse-map pointer coordinates and preserve existing fill/history replay and limits. Brush and eraser retain independent sizes. A successful guess may legally reveal word to that participant via the view.','13 frames cover private choice, draw/guess/guessed, reveal/focus/clear plus shared lifecycle. Undo/fill cooldown handling may only claim what the client can know; the server currently drops some rejected draws silently.'),
'fourrow':('DropTable → PlayerIdentity + ColumnTargets[7] + Slots[6] + TurnReceipt + ResultBoard','board, players/color, turn, myIndex, timeLeft nullable, last, moves; final result.winLine/draw/forfeit','action:{type:"drop",col}','A whole column is the target. Disable full columns and out-of-turn moves; never send on hover. Color name and mini-disc both label the side. Render a winning line only from the actual result.','Sample final win has four Red bottom-row discs and three Yellow discs. Win and draw frames are distinct final-result fixtures, not a replay of the active sample.'),
'tictactoe':('CeramicTable → SideIdentity + Square[9] + Mark + TurnReceipt + WinLine','board, players/mark, turn, myIndex, timeLeft nullable, last, moves; actual final result','action:{type:"place",cell}','Only legal empty cells submit. Occupied marks keep full visual contrast. X/O labels supplement hue; draw is neutral. Keep winner-stays/rematch shared actions.','Win fixture has three X/two O with X diagonal; draw fixture has nine marks without a line.'),
'rps':('ThrowArena → DuelIdentity + ThrowChoice[3] + LockReceipt + TournamentBracket + Reveal','players/out/left, bracket, phase, round, roundsTotal, bestOf, myPick, inMatch, locked, reveal, throwNo','action:{type:"pick",move:"rock"|"paper"|"scissors"}','One tap locks the pick; no new confirmation or take-back. Never infer opponents’ throws from locked IDs. Reveal both only from reveal.results. Full bracket supports 2–16 players, byes and eliminated viewers.','Rock/paper/scissors are original illustrated hands. The 16-player frame demonstrates internal bracket scrolling; it does not invent matches or advance a bracket.'),
'dotsboxes':('QuiltTable → Junction + EdgeTarget + OwnerPatch + BoxCounts + PrecisionEdgePicker','n, h, v, boxes, players/boxes/out, turn, myIndex, last, timeLeft nullable','action:{type:"edge",kind:"h"|"v",r,c}','Existing sizes are 3, 4 and 5, never 6. Thin visual stitches have 40px target overlays; dense intersections also need coordinate/keyboard selection. The precision selector is a local presentation of the same edge intent and must offer all valid rows/columns, not the two sample options in the illustration. Claim initials/counts from accepted state.','Default 4×4, largest 5×5 and extra-turn states are shown. Final full quilt totals 9+7=16 boxes. Do not hard-code those samples.'),
'wordscramble':('LetterDesk → LetterRack + TypedGuess + EligibilityReceipt + Standings','letters, length, round, rounds, phase, solvedByMe, myGain, reveal, players/solved/out, myIndex','action:{type:"guess",word}','No drag-only replacement, hint button or local answer lookup. Preserve input max 24 and phase/solved guards. Easy lengths 4–5, medium exactly 6, hard 7–11. Correct the original five-letter fixture label to Easy; this is sample-data accuracy, not a rule change.','CENAO is a five-letter Easy example; RTAEWFALL is nine-letter WATERFALL from the existing bank in Hard. Revealed answer is shown only in reveal; solved private input does not reveal it to others.'),
 'trivia':('QuizStage → Progress + Question + NumberedAnswer[4] + LockOutcome + ScoreRail','phase, question, category, choices, myPick, reveal/correct/results, round, total, players/locked/streak/out, myIndex','action:{type:"answer",choice}','Choices are shuffled by server. Number keys 1–4 apply only outside text controls. Correct/wrong/no-answer requires reveal; no answer-key hints, lifelines or locally guessed correctness. One tap locks.','Ask, locked, correct, wrong and long-text frames are separate. Correct has label+outline; wrong marks both selected wrong and actual correct answer.'),
 'wordchain':('ChainDesk → RequiredLetter + LivesRail + TypedWord + AcceptedHistory + Notice','turnId, letter, first, chain, chainLength, minLen, maxLives, players/lives/words, myIndex','action:{type:"word",word}','Preserve dictionary/duplicate/dead-letter/life rules and new-turn focus. Keep only received last-15 history plus chainLength; do not invent missing chain entries. Dead-letter restart is rendered only after actual state changes. No typing-induced clock reset.','Long history scrolls inside the ledger. Out and opponent views have no actionable word form. Lives are named as well as dotted.'),
 'categories':('Fieldbook → LetterTab + CategoryField[5] + DraftStatus + DoneLock + ReviewTable','cats, letter, myAnswers, myDone, phase, review/rows, players/done/out, round, rounds, myIndex','action:{type:"answers",answers}; same with done:true for final lock','Keep five categories. Existing 250ms debounced save and focusout flush preserve drafts; Done flushes the latest values with done:true. A local pending label is not proof of durable save: show Saved only when accepted state matches. Never replace the focused input on timer ticks. Spectators get no answers before review.','Review fixture: Alex 2+1+1+2+0=6; Nova 2+1+1+2+2=8. Status labels complement scoring; long names/keyboard keep labels and Done reachable.'),
 'telephone':('RelayStudio → CurrentSource + WorkKind + DrawingSurface/TextEntry + ReadyList + AcceptedLock; RelayReveal → ReleasedEntryTimeline + Like','phase, kind, source only for active work, mine, myDone, players/done/out, round, rounds; reveal.rev with prefix entries, liked/likes/skipped','action:{type:"text",text}; {type:"draw",strokes}; {type:"like",chain,idx}','Only the current handed source is visible during work. No early thumbnails/full chain in DOM. Preserve 800×600, existing 12 colors, brush/eraser presets 4/10/22 and stroke/fill/point caps. The drawn sample is player-content illustration, not a shipped fixed background. Do not lock permanently before myDone; retain draft/history after rejection. Likes obey own/skipped/already-liked/spectator guards.','Four-player sample has four readiness entries. Staged reveal contains only authorized prefix; final reveal animation does not fetch future entries.'),
 'bluff':('VelvetSalon → Prompt + PrivateFakeEntry/Lock + AnonymousBallot + VoteLock + TruthAuthorship','phase, question, myFake, options/{i,text,mine}, myVote, reveal/options/authors/voters/real/gains, players/locked/out, myIndex','action:{type:"bluff",text}; {type:"vote",option}','Keep fake length max 40, merged duplicate authors and own-option guard. During vote, never attach authors/real/voter metadata; do not leak through avatars, DOM attributes or option prominence. Real/author/voter/gain details appear only at reveal.','Duplicate bluffs may reduce option count; no fabricated filler option. A merged option reveals all returned authors and voter identities only when allowed.'),
 'impostor':('ConfidentialSession → PrivateRoleFolder + PublicClueLedger + ClueEntry / DiscussionReady / AnonymousAccusation / LastGuess + Result','phase, role, word, category, clues, clueRounds, turnId, ready, myVote, result, players/voted/out, myIndex','action:{type:"clue",text}; {type:"ready"}; {type:"vote",target}; {type:"guess",text}','Crew gets word; impostor gets category only; spectator gets no private role/word until result. Cover is local privacy, not access control. Vote targets are public identities with own target unavailable. Never expose vote counts early or style participants by secret role. Last guess is impostor-only; actual caught/stole/voided controls result.','Crew, impostor, covered, spectator, clue turns, discussion, vote, locked vote, last guess and round result are all specified. Public clues may legitimately let an impostor infer the word; do not block that game mechanic.'),
 'checkers':('EmeraldTable → OrientedBoard + Man/King + Selection/LegalTargets + ForcedCapture/ChainReceipt + StableResign','board, turn, myIndex, legal, mustJump, chain, last, moves, quiet, players/side/pieces, timeLeft nullable','action:{type:"move",from,to}; {type:"resign"}','Map jade material to the existing Lime side and ivory to White; keep side names explicit. Use only server legal targets. Multi-jump uses the same chain piece; kings come from actual piece codes. Preserve C.keepFocus and C.makeConfirm stable two-tap resign; no first-tap action. Draw only from actual result.','Sample capture/chain diagrams each use one piece per side and a legal diagonal jump. King/capture displays are derived components, not an engine. Keep exact 8×8 orientation and stable square labels.')}
for g in models:
 hierarchy,fields,actions,guards,notes=contracts[g['id']]
 s=f'''# {g['name']} · implementation specification

**Approved visual direction: {g['direction']}. Owner approval covers all 13 directions.** These are stateful design references for Claude; production gameplay is not implemented by this package.

[Full-size state explorer](../state-explorer.html?game={g['id']}) · [Desktop state sheet](states-desktop.png) · [Phone state sheet](states-mobile.png) · [Approved active view](concept.html).

## Component hierarchy

`{hierarchy}`

Client: `node-server/public/js/games/{g['id']}.js`; server view: `node-server/server/games/{g['id']}.js`. Preserve current mount/update/unmount/result lifecycle and existing test-facing IDs unless a meaningful updated regression proves parity. Port scoped styles from shared.css/state.css, never mount the static concept as the game.

## Authoritative view mapping

`{fields}`

Current wire actions: `{actions}`. These examples document existing payload shapes, not a replacement schema. Validate against the latest branch before implementation; no server/protocol change is authorized.

{guards}

{notes}

## State matrix

Common waiting/reconnect/result states are room lifecycle views; they do not invent new engine phase names. Every frame is a standalone illustrative fixture, not a sequential replay or a live action acknowledgement.

| State | Existing trigger / eligibility | Copy / feedback | Focus / input contract |
|---|---|---|---|
'''
 for st in g['states']:s+=f'| [{st["label"]}](concept.html?state={st["id"]}) | {st["trigger"]} | {st["copy"]} | {st["focus"]} |\n'
 s+='''
## Responsive, accessibility and motion

Use [RESPONSIVE-ACCESSIBILITY.md](../RESPONSIVE-ACCESSIBILITY.md) for desktop/phone/narrow and keyboard rules, [MOTION.md](../MOTION.md) for event-driven timing, and [COMPONENT-SPECS.md](../COMPONENT-SPECS.md) for reusable implementation contracts. Public boards/history remain visible while secondary details collapse; essential actions remain reachable without clipping. Text/shape/initial accompanies color. Reduced motion preserves all persistent outcomes and timing.

## Claude acceptance

- Implement every state above from actual room/view data; static sample names, scores, letters, words, board positions and timers never enter production logic.
- Preserve private-information boundaries in rendered DOM, accessibility labels and data attributes, not just CSS visibility.
- Verify eligible/ineligible intents, actual state updates, phase transitions, spectator/reconnect, result/rematch and party-preserving game switch in separate browser contexts.
- Run existing automated coverage and targeted regressions for meaningful interaction changes. Compare actual implementation screenshots to active and state references at matching viewports; disclose remaining differences.
- No merge, deploy, new game rules or unnecessary dependencies. See root IMPLEMENTATION-HANDOFF.md for the full 13-game completion gate.
'''
 (P/g['id']/'SPEC.md').write_text(s)
# Shared tokens are explicit and reusable; surface family colors remain in concrete CSS.
(P/'tokens.json').write_text(json.dumps({'brand':{'navy':'#06131D','deep':'#04111C','text':'#EDF4EF','lime':'#B3F84C','onLime':'#17270E','focus':'#D6FF8B'},'type':{'family':'Inter','bodyDesktop':14,'bodyPhone':14,'metadata':11,'taskDesktop':[30,45],'taskPhone':[20,30]},'space':[4,6,8,10,12,16,20,24,28,32],'radius':{'control':11,'panel':18,'paper':12},'touch':{'primary':44,'denseEdge':40},'motionMs':{'inspect':140,'move':180,'drop':220,'claim':220,'reveal':250,'receipt':200,'result':600},'viewports':{'desktop':[1440,900],'tablet':[768,1024],'phone':[390,844],'narrow':[360,740],'keyboardEmulation':[390,520]},'timing':'Existing authoritative deadlines and shot/phase timing always win.'},indent=2)+'\n')
(P/'COMPONENT-SPECS.md').write_text('''# Reusable component contracts

Use tokens.json plus approved CSS. This document specifies behavior; design-state JS does not implement gameplay. Retain existing game renderer lifecycle, Socket.IO adapter and current tests.

| Component / reference selectors | Inputs | Stable behavior and implementation boundary |
|---|---|---|
| Session shell / header, footer, .phasebar | Game name, actual phase/turn, timeLeft nullable, party identity | Thin navy shell; primary game task stays dominant. Header time uses an anchored deadline, not a new timer per render. Keep chat/rules/player overlays and route/party state. |
| Identity / .person, .avatar, .lives | Public name/avatar, named side, public score/count/lives, active/out/connected | Escape names; wrap long names; preserve existing portraits. State is text plus outline/symbol. Never decorate by hidden role/pick. Lives use a readable number as well as dots. |
| Action / button.primary, .sb-picked, .sb-correct, .sb-wrong | Eligibility, selected, busy/locked, outcome, label/reason | ≥44px phone; focus ring independent of selection. Disabled can retain informational focus via an adjacent reason or correctly implemented aria-disabled pattern; never submit while unavailable. Existing single-tap intents stay single-tap. |
| Typed entry / .answer-form, .sb-form-label | Controlled draft, max length, eligible, pending/accepted/rejected | Real label/input/form in production; Enter submits when permitted; no key handler while IME composing. Keep input node/caret across ticks. Do not clear on send unless existing semantics require it; never call accepted until actual view/notice permits it. |
| Drawing / .paper, .tools, .palette | Authorized stroke history, tool/color, remembered brush/eraser size, limits, role | 800×600 model; canvas content rect → coordinates; preserve batching/fill replay/caps. All tool controls visible or in an explicitly reachable drawer; no drawer-only UI for guessers/spectators. Clear retains existing confirmation or a parity-tested equivalent. |
| Column board / .connect-board, .connect-col | 7×6 board, legal columns, last move, named side, final winLine | One focusable column per legal target, six circular slots; no hover intent. Slot aspect ratio stays 1. Winning path persistent and text-described. |
| Square board / .ceramic-board, .checkers-board | Actual board, orientation, legal targets, selected, last, result | Coordinate labels from actual orientation. Square aspect is invariant; cells/pieces never become ovals from flex shrink. Restore focus after subtree updates; forced capture and chain selection are engine-driven. |
| Edge board / .quilt-board, .quilt-edge, .patch | n=3/4/5, h/v ownership, boxes, last, legal, named owners | Thin stitch + ≥40px hit target where geometry allows. Dense cases also use keyboard/precision control with all valid coordinates and same existing intent. No double submit from overlapping targets. Patch initial/label/count is public accepted ownership. |
| Choice / .quiz-answers, .answer-slip, .throw-choices, .sb-vote-list | Public options; authorized own selection; accepted phase | Equal weight before reveal; selection locks on current rules. Secrets must not enter data attributes/alt text. Anonymous authors/correct flags are absent before reveal. |
| Local role folder / .private-folder | Authorized role/category/word, local cover preference | Render no unauthorized data. Local cover hides the visible word from shoulder-surfing; it is not authorization. Private content is discarded on role/room change; spectators get a separate view. |
| Bracket/history/review / .sb-bracket-scroll, .chain-history, .sb-table-scroll | Only returned public entries and counters | Named, keyboard-reachable internal scroll regions; retain heading/actions. No early chain loading, invented history or revealed picks. |
| Outcome / .sb-finish, .sb-result-actions | Actual room result, host/member/spectator, min players, readiness | Host: Back to Lobby / Choose Another Game / Play Again. Participant: Back to Lobby / Vote for Next Game / Ready for Rematch. Spectator uses actual queue/role eligibility, no Ready button. No local game restart or automatic merge/deploy. |

Production assets are vectors or state-generated HTML/CSS, not screenshots. marks/crown/icons are reusable exports. Checkers man/king, ceramic marks, discs, quilt ownership, letter rack and all states are generated from live data. Example drawing SVGs stay demonstration content; they are not an auto-draw feature.
''')
(P/'RESPONSIVE-ACCESSIBILITY.md').write_text('''# Responsive and accessibility specification

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
''')
(P/'MOTION.md').write_text('''# Event-to-animation contract

Motion never advances game logic, starts a new turn, accepts an intent or delays a deadline. Update accessible state immediately, then animate a decorative layer from the previous accepted snapshot. Key effects by actual phase/round/turn/action revision; do not replay from unrelated timer or chat renders. Cancel or snap on newer state/reconnect/unmount.

| Trigger | Visual | Duration / easing | Reduced motion |
|---|---|---|---|
| Local inspect/focus | Stable ring / small lift where permitted | Focus immediate; optional 140ms ease-out | Ring only |
| Four in a Row accepted drop / moves changed | Disc falls from column top to accepted slot, settles once | 220ms cubic-bezier(.2,.75,.3,1); persistent last/win ring | Immediate destination and ring |
| TTT accepted mark | Material/opacity emphasis | 160ms ease-out | Immediate mark |
| Checkers accepted move | Translate from last.from to last.to; captured piece fade after accepted removal | Move 180ms ease-out; capture 120ms, no added engine delay | Immediate move/removal; text explains capture |
| Checkers crown/chain | Crown appears; persistent forced-piece/target outline | 180ms crown only; chain persists until actual state clears | Immediate crown/outline |
| Dots accepted edge / ownership changed | Stitch reveal, then patch and owner initial | Edge 140ms; patch 220ms ease-out; simultaneous claims all reflect state | Immediate line/initial + extra-turn text |
| Word Scramble new round | Rack enters once; solved gain receipt only for eligible view | 180ms rack; 200ms gain | Static rack + named gain |
| Word Chain chainLength/turn changed | Link accepted word; update required-letter tile once | 180ms, no time reset | Immediate text / new-turn announcement |
| Categories draft send / myDone / review | Pending text; locked field state; row gains | Pending has no success animation; accepted lock 140ms; review 220ms | Same text/readOnly state |
| Trivia accepted local lock / phase reveal | Stable selected border; simultaneous correct/wrong labels | Lock immediate; outcome 220ms | Static labels/outline |
| RPS myPick / reveal.throwNo / phase | Private lock; both authorized throws reveal together | Lock immediate; shared reveal 250ms | Both throws and named outcome appear together |
| Draw choose/draw/reveal | Word choice entrance, native direct ink, named guess receipt | Choice 180ms; pointer ink no extra tween; accepted receipt 200ms | Ink still direct; instant receipt |
| Telephone myDone / rev prefix changed | Page seal only on accepted myDone; new released entry joins timeline | Seal 180ms; released entry 250ms | Static accepted state / appended entry |
| Bluff myFake/myVote / reveal | Private lock; reveal truth, authors and voters together | Lock immediate; reveal 250ms | Immediate authorized text |
| Impostor local cover / actual phase/result | Cover snaps; local permitted role opens briefly; public phase heading stable | Cover immediate; role 180ms; result 250ms | Immediate correct role/phase text |
| Actual final result | Small trophy/heading emphasis, then persistent board/standings | ≤600ms once; no full-screen blocking confetti | Immediate result |

Reusable motion.css demonstrates presentation classes only. Claude must supply offsets from actual board geometry/accepted snapshots and deduplicate by existing revision IDs. Do not attach drop/king/reveal classes unconditionally inside update(). No server path, timers, scoring, physics or caps change.

Sound: keep existing Sound/mute integration and established result/intent events. No new external audio dependency is needed. Avoid repeating tick/collision/like sounds on render. Every sound has equivalent visible text; do not autoplay background audio. Original audio asset production is not required to implement this visual package.
''')
(P/'CLAUDE-TASK.md').write_text('''# Claude implementation assignment · Issue #55 · approved 13-game set

The owner approved all 13 Stage A directions in this conversation. Stage B now supplies state sheets/specs, reusable HTML/CSS/SVG, responsive/accessibility and event-to-animation contracts. Implement the approved designs in the real node-server frontend, preserving the server and gameplay.

Design source: `codex/playgrid-premium-rest-design`, folder `design/playgrid-premium-rest/`.
Implementation base: latest `codex/playgrid-2-redesign` (design baseline 06609a4).
Tracking/design brief: https://github.com/abyss-made/gamelab/issues/55
Coordination: the owner’s Claude rollout issue #54 covers the separately approved eight-game set. Keep the work streams distinct; use reviewable game-by-game implementation PRs unless the owner directs otherwise.

Read IMPLEMENTATION-HANDOFF.md, each game's SPEC.md and desktop/mobile state sheets, tokens.json, COMPONENT-SPECS.md, RESPONSIVE-ACCESSIBILITY.md, MOTION.md and ASSET-INVENTORY.md. Use state-explorer.html for full-size/narrow/keyboard/reduced-motion inspection.

Required games: **Draw & Guess, Four in a Row, Tic Tac Toe, Rock Paper Scissors Tournament, Dots & Boxes, Word Scramble, Trivia Blitz, Word Chain, Categories Rush, Drawing Telephone, Bluff Battle, The Impostor, Checkers.** Complete every one, not a representative subset.

Do not install static screenshots/scenes as working games or copy sample timers/answers/scores into logic. Adapt components to actual view data and existing intents. Preserve private-information boundaries, authentication, Socket.IO, rooms/party/chat/settings, queue, rematch, switching, spectators/reconnect, bot support boundaries and shipped focus/resign fixes.

For each game: implement states in SPEC.md, run existing and meaningful targeted tests, play in separate browser contexts, capture actual desktop/phone/narrow and relevant keyboard/state screenshots, compare directly to approved references, correct discrepancies and disclose remaining differences. Include the root completion checklist and evidence in each PR. Do not merge, deploy or change live Render.

This design branch contains no production implementation or live multiplayer verification. Claude is responsible for those implementation steps; design-state inspection controls only navigate local examples.
''')
(P/'IMPLEMENTATION-HANDOFF.md').write_text('''# Approved implementation handoff · Issue #55

**Owner approval received for all 13 remaining-game visual directions. The Stage A approval gate is complete.** This Stage B package specifies supported states, reusable components/assets, responsive/accessibility and event-to-animation behavior. Begin with [CLAUDE-TASK.md](CLAUDE-TASK.md).

## Scope and source

Design branch `codex/playgrid-premium-rest-design`; implementation base latest `codex/playgrid-2-redesign`; audited gameplay baseline 06609a4. Re-audit newer code before editing. Work on separate implementation branches and use reviewable game-by-game PRs. This package itself changes only design/playgrid-premium-rest/.

All 13: Draw & Guess, Four in a Row, Tic Tac Toe, RPS Tournament, Dots & Boxes, Word Scramble, Trivia Blitz, Word Chain, Categories Rush, Drawing Telephone, Bluff Battle, The Impostor, Checkers. The approved eight-game package is separate on codex/playgrid-premium-directions. Issue #55 tracks this remaining-game brief, not that earlier set.

## Start here

- Each game's SPEC.md: component hierarchy, real view fields/intents, eligibility/privacy, complete state matrix, focus and acceptance.
- Each game's states-desktop.png / states-mobile.png: state contact sheets, with full-size views available in [state explorer](state-explorer.html).
- [COMPONENT-SPECS.md](COMPONENT-SPECS.md), [RESPONSIVE-ACCESSIBILITY.md](RESPONSIVE-ACCESSIBILITY.md), [MOTION.md](MOTION.md), tokens.json and [ASSET-INVENTORY.md](ASSET-INVENTORY.md).
- shared.css for approved active composition; state.css/state-preview.js illustrate state rendering. motion.css supplies decorative effect primitives. Never install the preview router as production logic.
- CURRENT-STATE-AUDIT.md is historical source evidence, not a report of new gameplay tests. ISSUE-55-BRIEF.md preserves the original issue wording.

## Implementation rules

Use the existing node-server application and mount/update/unmount/result lifecycle. Keep Express, Socket.IO, alpha authentication, rooms/lobby/chat/queue, settings/rules/scoring, spectators, reconnect, rematch and party-preserving switching. No new game rules, server schema, database, dependencies or deployment changes are authorized.

Static data and images are review fixtures, never authority. Rebuild interactive boards/cells/letters/strokes/money/scores/countdowns from actual view fields. Do not use a screenshot or fixed SVG as a working board. Generated HTML/CSS families cover every mark/disc/patch/man/king/letter/selection/outcome state without requiring one raster export per value. Original drawing SVGs are example player content only. Preserve real stroke/fill replay and current caps.

Keep shipped C.keepFocus/C.makeConfirm fixes. One-tap locked choices stay one-tap. Local pending does not mean accepted. Do not expose private words, answer keys, picks, bluff authors or role IDs in hidden DOM/labels/data attributes. Cover-word is only a local privacy view.

Bots: Four in a Row/Tic Tac Toe/Dots/Checkers are acting; RPS is limited. Other eight in this package have no acting bots. Keep support labels honest. Existing Timer-Off behavior/policy is not redesigned here. Reconnect does not pause authoritative game time.

## Concrete data corrections during Stage B

The five-letter Word Scramble example is **Easy**, not Medium (existing Medium is six letters). Largest Dots example is **5×5**, not a new 6×6 option. Telephone size rail must expose its existing 4/10/22 presets. These fixture/control corrections preserve current rules and approved visual identity. Checkers material Jade maps explicitly to existing Lime; Ivory maps to White.

## Evidence and completion gate

1. Implement every listed state in each SPEC.md in the real game, including actual host/member/spectator result actions. Review all 13; do not stop after the easiest boards.
2. Run `cd node-server && npm test`, then targeted regressions for changed view mapping, private-role DOM, focus/confirm, pointer coordinates, dense edges, input/IME/draft lock and phase deduplication as appropriate. Do not weaken tests to fit a screenshot.
3. Test multiplayer in separate browser contexts: legal/illegal input, turn/phase transition, private views, room/chat/settings preservation, results/rematch, reconnect and switching. Do not substitute idle fixtures for acting bots or human participants.
4. Capture actual implementation at 1440×900, 390×844 and 360×740 for all 13 (39 active captures), plus relevant role/phase/result/keyboard variants. Compare side by side at matching dimensions against the approved active/state references; fix scale, typography, spacing, materials, illustrations and control differences.
5. Verify keyboard, focus restoration, reduced motion and 200% zoom/reflow; check actual iOS/Android soft keyboards and screen readers where available. Explicitly disclose untested devices/AT and any remaining differences.
6. Each PR lists completed states, tests and implementation screenshots. Do not merge, deploy or modify live Render. Owner final review remains required.

| Game | Real state-driven UI | States / privacy / multiplayer verified | Matching desktop / phone / narrow comparison | Tests + remaining differences reported |
|---|---|---|---|---|
'''+''.join(f'| {g["name"]} | [ ] | [ ] | [ ] | [ ] |\n' for g in models)+'''
The supplied browser checks validate design-reference rendering and privacy presentation, not server security, functional multiplayer, real-device ergonomics or a shipped implementation. No production test result is claimed by this design branch.
''')
print('Approved per-game specifications and shared Claude contracts generated.')
