"""Issue 58 delta audit. Individual approved specifications remain the visual baseline."""
from pathlib import Path
import json,re
P=Path(__file__).resolve().parent;R=P.parents[1];games=json.loads((P/'games.json').read_text());models={m['id']:m for m in json.loads((P/'games/state-model.json').read_text())}
# Current-client findings compare browser captures against the approved direction, not a claim that earlier designs shipped.
D={
'colorstack':[
'P0','Current cards and controls sit in conventional UI panels; opponents are identified mostly through text/counts. The table does not have the approved sense of people seated across from you. The current engine already supports drawn-card play or pass and automatic one-card announcements; do not add a new Call UNO mechanic.',
'Keep the approved neon social-club felt, original card backs and face-down hands in front of each opponent. The top discard, active color, direction and next eligible player form one central read. Lift one selected card 8px; inspection is separate from committing Play. Illegal cards remain readable with a reason, not a mysterious failed tap.',
'Tap or arrow through the local fan, select, then Play. A wild opens four named color choices with shape/text. Draw is one action; after a playable draw show Play drawn card and Keep & pass. Preserve card IDs through sorting. Color payload uses r/b/g/y, never CSS names. Opponent DOM contains backs and counts only.',
'Phone: overlap hands but preserve the outer rank/color corners. More than eight cards becomes a horizontal rank-readable strip; keep Play and Draw above the safe area. Keyboard selection scrolls into view. Do not make dragging the only play path.',
'Deal backs at 60ms per visible seat, total visual budget 480ms; deal counts come from the actual batch. Play travels 180ms to discard, reverse arrow rotates 160ms, penalty receipt persists. Sound: soft paper shuffle, restrained felt tap, short reverse click. Reduced motion: instant placement and persistent direction/penalty labels.',
'Client engineering: keyed card DOM, eligibility and drawn state, long-hand focus, event receipts. Engine change: none required. Never predict the next player or change draw/stack rules.',
'My hand never appears for spectators; opponent hands contain no ranks; wild cannot submit before a valid color; drawn state permits only the drawn card or pass; hand sorting does not change emitted card ID.'],
'pool':[
'P0','The current phone table remains landscape and small above a large Aim/Power panel. Ball-in-hand instructions and two similar lock/shoot controls compete. The current client and server already supply shot sampling and valid placement, so physics quality cannot be inferred from a static screenshot.',
'Keep approved walnut rails and readable numbered solids/stripes. Give the table the dominant area, rotate its presentation on phones, and keep controls close. Aim direction must be clear without promising a perfect prediction. Group badges, remaining balls, foul reason and whose shot are persistent.',
'Drag on cloth to set angle, adjust power 3–100%, then Shoot. Fine buttons and Left/Right change 0.5°, Shift changes 5°. In ball-in-hand, drag cue to a valid location then Lock cue ball locally. Shoot carries {type:shoot,angle,power,place}; Lock is not a separate network action. The server remains the collision/placement authority.',
'Phone: inverse-transform portrait table coordinates to the exact 1000×500 simulation. Keep numbers upright; input only on the visible image/canvas, not wrapper. Fine aim prevents tiny-screen precision failure. Cues/labels explain solids and stripes without color alone.',
'While sampled balls move, gate all shot input; interpolate the existing time-sampled path instead of replaying guessed physics. Cushion tick follows an actual collision event if available; otherwise omit it. Pocket sound only after accepted pocket data. Reduced motion: preserve ball movement needed to understand play, offer a quick final-state view without camera shake.',
'Client engineering: portrait coordinate mapping, pointer capture, stable aim/power, bounded placement affordance. Separate engine investigation: tunneling, cushion restitution, pocket capture and sample cadence need reproducible physics tests; no numeric retuning is approved by this design.',
'Pointer and keyboard select equivalent angles; portrait and landscape target the same point; cue placement stays inside and clear of balls; first lock does not emit shoot; one Shoot sends exactly once; no aiming controls while resolving; scratch/illegal 8-ball results come from engine.'],
'golf':[
'P0','The current course geometry is legible but visually sparse, and the phone course loses scale in a wide rectangle. The approved Dogleg direction is substantially richer but previously illustrated one hole only. Existing game has 18 authored holes, not a free-form generated course.',
'Extend the approved garden material system across all 18 actual holes. Included 36 new top-down SVG derivatives preserve every outline, wall, bumper, sand rectangle, water rectangle, tee and cup coordinate. Keep the approved Dogleg hero. Avoid isometric terrain or decorative obstructions that look collidable.',
'Drag toward the intended aim direction; adjust power 2–100%; Putt explicitly commits {type:putt,angle,power}. Add ±0.5° fine aim and keyboard equivalent. Label sand and water in rules; show a stroke receipt and why the ball returned after a water penalty. Never promise a full trajectory preview.',
'Phone: rotate the 700×440 presentation, inverse-map the input and keep scoreboard/cup labels upright in production. Maintain turn/stroke/par above the course, power and Putt below. Phone fine aim must not cover the ball or cup; secondary player totals can scroll.',
'Use the server path for roll/bounce and settle, then cup ring 220ms or water ring 260ms. Scorecard waits for actual hole/round advance, no fake Next button. Sound: small putt click, gentle cup drop, soft water cue; muted by default until user activation. Reduced motion removes rings and highlights only the final position/penalty.',
'Client engineering: SVG material layers over source geometry, portrait mapping, focus and path replay. Engine investigation: lip capture, bounce/roll friction and hazard timing must be isolated tests before any rules/physics change. Decorative depth never changes collision surfaces.',
'All 18 source geometries match; Tour reuses the same holes; sand/water are visible and correctly labeled; new art never obscures legal path; no putt while rolling; stroke/par/cap and final totals match server; pointer mapping works in both orientations.'],
'ludo':[
'P0','The working client provides numbered-token buttons but the board looks like a flat diagram. Phase, legal token choice, stacked/safe cells and extra turns need a single readable explanation. The approved toy-board direction should stay.',
'Render four homes as crafted toy trays with clear colored lanes, safe-cell emblems and numbered dimensional pieces. Owner initial plus token number survives tiny stacking. Keep dice and legal choices as one turn pod. Do not animate a rolled value before the real roll arrives.',
'Roll is enabled only in roll phase. In move phase, both board tokens and the numbered legal-token list use st.movable. A six does not automatically mean every token can move. For a stack, open a compact numbered owner list; do not use an ambiguous giant tap target.',
'Phone: square board first, compact dice/turn strip, then 2×2 legal token choices at least 44px high. Safe cells are shape plus label; sides retain names. Announce who gets the next roll once, not on each clock tick.',
'Die settles to actual accepted value over 300ms. Token follows actual path at 70ms/cell, capped at 500ms. Captured piece returns in 220ms; extra-turn label persists. Sound: wood die rattle, quiet token step, distinct home chime. Reduced motion snaps pieces and retains capture/home/bonus receipt.',
'Client engineering: legal choice overlays, stack picker and event deduplication. Engine change: none; preserve current triple-six, capture, safe-cell and exact-home rules.',
'Roll cannot move a token; only server-legal tokens are active; same token index from board or list; stacks show each owner/number; capture and bonus follow real state; four colors remain distinguishable by names/patterns.'],
 'tycoon':[
'P0','Current board and property information are functional but much less tactile than the approved Plaza direction. The hardest gap is turn economics: purchase, auction, rent, upgrades, trading and automatic debt resolution need consistent contextual controls rather than a prettier board alone.',
'Keep the original 36-tile Playgrid Plaza, owned-color bands and illustrated city center. Selected property gets a readable deed; current location/owner/level is distinct from local inspection. Do not imitate Monopoly names, 40-tile geometry or copied board/card art.',
'Tap any tile to inspect without taking a turn action. Buy/auction exist only for the currently eligible landed tile. Auction uses high bidder, minimum valid bid, your cash and Pass. Trade review includes both cash amounts and both property lists before offer/accept. Build/sell needs exact cost and eligibility; insufficient-payment receipt explains automatic upgrade liquidation and bankruptcy, never a manual debt timer or invented loan.',
'Phone: numbered board stays visible; a focused deed sheet carries full name, group, rent, purchase and phase action. Bottom actions belong to the active phase. Long trade/asset lists scroll inside the sheet with visible headings; never bury automatic bankruptcy explanation behind a horizontal strip.',
'Dice settles 300ms; accepted travel uses 70ms/tile capped at 650ms, then deed opens 180ms. Cash changes show a signed persistent receipt; no continuous confetti over an auction deadline. Sound: restrained dice, paper deed, soft cash tick. Reduced motion jumps to location and shows transaction line.',
'Client engineering: state-driven phase sheets, 36-tile hit map, ownership details, trade review and focus restoration. Engine change: none. Auction end, automatic liquidation, rent formula, net worth and bankruptcy stay authoritative. Example cash values are fixtures, not a second economy.',
'Exactly 36 tiles with original names/prices; inspection cannot buy another tile; invalid bids cannot be drafted; trade shows full give/get; rent uses actual level; insufficient payments show automatic liquidation/bankruptcy receipts; no wallet change before authoritative update.'],
'battleship':[
'P0','Current ship placement and targeting work but fleet art is diagrammatic. Phone targets are physically small. The approved detailed ships are right; the older visual roster misnamed the 3-cell cruiser and 2-cell destroyer, corrected here against the actual FLEET order.',
'Keep Bluewater Command, actual five vessel silhouettes and two separate friendly/enemy waters. Friendly ships visibly occupy the exact cells. Enemy chart shows public shots/sunk information only. D4 selection is visibly different from a fired hit or miss.',
'Placement: select Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2; choose starting cell, rotate, validate bounds/overlap, then Lock fleet. Current Random action immediately locks; label Random & Lock. Target a square then Fire. Precision row/column pickers provide the same target as pointer input. Resign requires stable confirmation.',
'Phone: tabs show one chart at a time while the fleet summary persists. The 10×10 board cannot promise 44px cells at 390px; use explicit row/column selectors with 44px controls and a labeled confirmation. Announce the coordinate and outcome in text.',
'Fire draft highlights only selected cell. After accepted result, miss ring 180ms, hit flash 120ms, sunk outline 260ms, then permanent marks remain. Sound: soft sonar select, short hit/miss cues; no long explosions masking turn. Reduced motion uses static marks and text.',
'Client engineering: placement validity, view tabs, precision picker, coordinate orientation and focus. Engine change: none; do not reveal enemy fleet or alter hit-again settings. Manual fleet editor is specified; this local state fixture is not a complete fleet editor.',
'Correct lengths/order; overlap and off-board placement unavailable; Random wording matches immediate commitment; same coordinate via picker/pointer; no repeat fire; no unsunk enemy vessels in DOM/alt/data; public sunk/results only.'],
'gofish':[
'P0','Current hand and ask controls support the rules but players do not feel physically seated across the table. Opponent counts matter to memory play. The approved Marine Salon backs, local suit faces and table seats solve composition; completeness needs explicit ask and book feedback.',
'Keep illustrated marine backs and visible card counts in every opponent seat. Local rank groups show real suits/counts, and completed books look distinct from a hand. Rank → player → Ask is one short visual sequence, with no hidden required second selection.',
'Only ranks you hold and other active players with cards are eligible. A face tap selects its rank, not an individual request card. Ask summary states target and rank. Emit {type:ask,target,rank} using numeric ranks (A=1,Q=12) and actual member IDs. Keep pending receipt, then transfer/draw/book only from the real view.',
'Phone: opponents stay at the upper edge with compact backs, local hand in a horizontally inspectable rank strip. Rank/target chips wrap with readable names; Ask remains at least 44px high. Long hands cannot cover the confirmation or book tally.',
'Deal backs at 60ms per card, visual budget 480ms. Ask has no artificial delay. Accepted transfer 180ms, book gathers 240ms, count updates once. Sound: paper slide, gentle draw, four-note book chime under 400ms. Reduced motion snaps cards and retains named rank/count receipt.',
'Client engineering: held-rank eligibility, stable member selection and keyed hand/book layout. Engine change: none. No separate draw button, reset clock or invented reward; Go Fish draws occur inside the existing ask resolution.',
'No absent-rank/self/empty-target asks; target persists through unrelated ticks; public counts accurate; opponents never get local rank/suit data; one accepted transfer creates one book animation; deck-empty and out states preserve watch view.'],
'chess':[
'P1','The current board is usable, with existing promotion/draw/resign logic. Premium walnut material is approved; the remaining quality gap is legal target clarity, orientation/notation, clock focus stability and complete secondary interactions.',
'Keep Walnut & Ivory rather than decorative furniture around a tiny board. Coordinates remain outside piece silhouettes, selected square and last move are distinct, check is a persistent king marker plus text. Captured pieces and notation are secondary to board and clocks.',
'Tap a legal own piece, then a server-legal destination. Promotion offers Q/R/B/N before sending {type:move,from,to,promo}. Preserve default Queen only where current flow permits it. Offer/accept/decline draw and stable two-tap resign remain. Board skin changes are local cosmetic preferences, not new game settings.',
'Phone: square board nearly fills width; clocks and names frame it, notation collapses below. Arrow-square navigation plus Enter selects; labels use file/rank and piece name. Coordinates invert with board orientation without changing engine indices.',
'Accepted move glides 140ms, capture crossfades 100ms, check outline 160ms then stays. Use short piece tap/capture sounds; no ticking countdown loop. Reduced motion snaps moves; clock and result stay textual. Never announce every clock second.',
'Client engineering: focus-preserving board updates, legal target grid and promotion modal. Engine change: none. Clock, castling, en-passant, draw rules and checkmate are authoritative; do not add an engine hint/analysis feature.',
'All four promotion values use uppercase promo; wrong-turn move impossible; board orientation matches index labels; clock update does not reset resign confirmation/input; draw acceptance only for offered recipient; final board comes from actual result.'],
'drawguess':[
'P2','Closest to the desired finish with Four in a Row. Preserve the working simple drawing hierarchy; a wholesale composition change would add risk without improving the central activity. Main remaining gaps are focus mode, private-word boundaries and restrained tool feedback.',
'Keep Sketch Club paper, compact tool rail and separate social guess feed. The drawing stays visually dominant. Preserve simple brush/fill/eraser/undo/clear; avoid a large creative-suite ribbon or texture overlay on player marks.',
'Tool taps select before drawing. Retain independent brush and eraser sizes. Drawer gets choice/private word; guessers get only hint unless their permitted view reveals the answer. Existing guess/chat path stays intact. Clear needs confirmation, Undo stays immediate within actual limits.',
'Phone: drawing canvas first, tools as short rail, chat/players in reachable tabs. Pointer maps the measured 800×600 drawing element, never its frame. Focus mode restores focus to its launcher. Keep named color buttons and size labels.',
'Tool selection 100ms, guessed receipt 180ms; never animate strokes independently of real drawing events. Sound: optional short correct-guess chime, no continuous brush sound. Reduced motion removes receipt scale while preserving score/word reveal.',
'Client engineering: focus mode and keyboard/tool clarity only. Engine change: none. Existing dropped/cooldown draws are not explicit acknowledgements; do not show a false Accepted check.',
'Original drawing remains unfiltered; private word absent from guesser/spectator DOM; fill/undo/history caps preserved; pen/touch maps accurately at both sizes; chat focus survives state refresh; clear cannot happen on first accidental tap.'],
'fourrow':[
'P2','Already close to finished and should remain fast and simple. Approved Drop Society material and strong column affordances need only measured drop/turn feedback and trustworthy final-state treatment.',
'Keep the vertical 7×6 board and large whole-column input. Show both named sides with miniature discs. One pending drop highlight, one active player label; do not add strategy panels or compulsory confirm clicks.',
'Hover/focus previews a column but never sends a drop. Click/Enter sends once if legal and your turn. Full columns explain unavailable state. After real acceptance place one disc at the correct row, and draw only the actual winning line.',
'Phone: seven column targets span the board width, each receives full-height pointer area. Left/Right moves between columns, Enter drops. Gold/Red have text/shape labels. No horizontal scrolling board.',
'Drop 180–240ms with one small 40ms settle; active-player label changes with accepted board. Sound: one wooden clack. Reduced motion snaps disc with persistent last-move outline. No idle board animation.',
'Client engineering: drop event deduplication and focus retention. Engine change: none; preserve current turn, full-column, draw and forfeit semantics.',
'7×6 always; no send on focus; full columns disabled; one input gives one action; result line comes from actual winLine; opponent/spectator cannot drop; current clean hierarchy remains.'],
 'tictactoe':[
'P1','Working rules and small grid are straightforward; plain symbols and spare feedback lack the approved ceramic table personality. Avoid adding clutter to a game whose strength is immediate readability.',
'Use approved ceramic tiles and original X/O assets, restrained depth and negative space. Current turn and assigned mark sit above the 3×3. Final winning trio remains visible; draw gets equal visual care without a false winner.',
'One tap/Enter in an empty square places your mark; occupied cells are inspectable with disabled reason. Do not add confirmation to a reversible selection that is not part of the rules. Preserve winner-stays/score settings.',
'Phone: grid occupies width with generous targets. Roving arrow grid plus square/mark labels. Mark shape is the side identity; color is supporting only.',
'Accepted stamp 140ms, winning line 180ms. Sound: ceramic tick, short result cadence. Reduced motion instant stamp and static win line.',
'Client engineering: legal empty-square semantics, accessible grid and result board. Engine change: none.',
'No occupied/wrong-turn moves; all nine keyboard squares; turn and mark explicit; actual win/draw distinguished; result board is original final position, not regenerated sample.'],
'dotsboxes':[
'P1','Dense line/point board can turn into tiny phone hit areas; extra turns after closing boxes and last-edge identity need clearer receipts. Preserve the exact configurable board and approved quilt metaphor.',
'Use stitched edges, owner initial in filled fabric patches and subdued unclaimed segments. Hover/keyboard focus previews one edge. Points remain visually separate from edge targets; last accepted edge has a persistent stitch highlight.',
'Choose an unclaimed horizontal/vertical edge. Preview then click/Enter commits exact kind/r/c; no change to box completion or bonus turn. Announce completed box count and whether the turn continues.',
'Phone: enlarged invisible edge hit slop must resolve the nearest segment without ambiguous overlap. Keyboard cycles edges; explicit row/column labels. Scroll/zoom or edge list is preferable to pretending all dense edges have 44px spacing.',
'Edge draws 120ms, new patch fills 160ms, extra-turn caption persists. Sound: light stitch tick and gentle completion tap. Reduced motion instant edge/initial fill.',
'Client engineering: hit testing, keyboard edge navigation and event receipts. Engine change: none; scoring and repeated-turn logic remain.',
'Each edge maps to exact kind/r/c at every size; claimed edges unavailable; shared-edge double box counted from state; initials identify owner without color; no layout reset during extra turn.'],
'wordscramble':[
'P1','Working typed input supports core play; the approved letter desk adds focus. Difficulty must match real bank length and solved state must not leak the answer to peers.',
'Keep Letterworks tactile rack with high-contrast letter faces, one generous typed field, deadline and solved count. Letter decoration never changes order or answer semantics. CENAO is Easy; hard fixture uses the real longer bank.',
'Type and Enter to guess; retain rejected word and error association. No dictionary lookup, hints or drag-only anagram rearrangement. Preserve max length 24, phase/solved guards and actual score gain.',
'Phone: compact rack with readable letters, input above keyboard, standings below. Maintain input focus and caret across timer refreshes; keyboard submit is first-class.',
'Invalid input uses border/text 120ms, no shake. Accepted solve has 180ms receipt and actual score. Sound: quiet correct-word chime, no keystroke sounds. Reduced motion static receipt.',
'Client engineering: keyed input, validation/focus, score receipt. Engine change: none; dictionary, word bank, idle and scoring unchanged.',
'Rejected draft retained; solved user cannot resubmit; not-yet-solved peers do not receive answer; real difficulty lengths; deadline update leaves caret intact; reveal only in permitted phase.'],
 'trivia':[
'P1','Functional answer buttons need a stronger question/answer hierarchy and credible lock/reveal separation. Current server already owns correctness and timing; the design cannot reveal answers early.',
'Keep Orbit Quiz question stage, four distinct answer slabs and compact round/deadline. Number labels 1–4 are part of the target. Own selected answer locks quietly; correctness waits until reveal.',
'Tap or press labeled answer, then follow existing immediate-lock behavior (do not insert an extra confirm). Disable all answer changes after accepted own answer. Shuffle/order always comes from actual view.',
'Phone: answers stack with 52px minimum recommended height; question wraps naturally without tiny text. Show time without flashing the whole card; focus stays on locked answer until phase changes.',
'Selection 100ms, accepted lock border persists, correct/wrong reveal 200ms with labels and symbols. Sound: soft select, restrained correct/wrong cue at actual reveal. Reduced motion no flips; static badges.',
'Client engineering: phase styling, locked focus and reveal ordering. Engine change: none; question set, correct index and scoring remain private until authorized.',
'No correctness in hidden markup before reveal; one answer intent only; timer cannot reopen choices; 1–4 matches current order; tied rankings and unanswered states distinct.'],
 'wordchain':[
'P1','The last-word-to-next-letter rule is mechanically simple but context can get lost in a panel. Prior entries, elimination and active-player identity deserve more explicit hierarchy.',
'Keep Chain Letterpress: latest word large, required leading letter as a persistent tile, earlier chain below. Own action is clear; non-turn participants can read without an input suggesting they can play.',
'Type a word beginning with the actual required letter. Submit via Enter. Keep rejected text with repeated-word/wrong-letter feedback when locally knowable; no local dictionary authority. Out players get watch mode, not an input that silently fails.',
'Phone: current word and letter above input, chain in scrollable history below. Use semantic list, labeled input and polite one-time turn notice. Keep submitted words readable under zoom.',
'Accepted word attaches in 180ms, active seat changes once. Sound: subtle typebar success, short turn cue only for local turn. Reduced motion static list append; no typewriter text.',
'Client engineering: keyed history/input, turn gating and error association. Engine change: none; word eligibility, duplicates, timeouts and elimination unchanged.',
'Wrong-turn input unavailable; rejection retains draft; required letter matches last word; real accepted chain only; eliminated participant retains party/chat; no fake dictionary correction.'],
 'categories':[
'P1','The working multi-answer form needs a calmer worksheet hierarchy and stronger saved-versus-final distinction. Review must explain duplicates/points without leaking private answers while editing.',
'Keep Category Desk letter seal and five labeled rows. Save status and Done are distinct. Review shows the actual answers/eligibility and points in aligned rows; shared deadline remains visible.',
'Edit each field with preserved draft/caret, save through existing answers action and finalize with done:true. Final lock must follow myDone, not the click itself. Respect actual text limits; leave rejection editable.',
'Phone: five fields stack, Done reachable above safe area; form may scroll with keyboard open. Avoid sticky header covering the focused field. Saved caption is text, not a color dot alone.',
'Save indicator 120ms, accepted Done check 160ms, review rows appear as a group over 180ms. Sound: optional soft lock/review cue, no sound for every autosave. Reduced motion immediate rows.',
'Client engineering: draft reconciliation, finalization and private review display. Engine change: none; category matching/duplicate scores stay server-owned.',
'Draft survives ticks/rejection; no premature final lock; no other answers before review; actual done flag controls input; points/review labels match authoritative evaluation.'],
 'telephone':[
'P0','The game needs credible handoff/reveal pacing and clear work mode, beyond a polished paper canvas. Early chain thumbnails would spoil the entire game. Existing draw/text constraints and myDone acknowledgement are essential.',
'Keep Paper Relay tools and uncluttered paper; distinguish source prompt from your work. Ready avatars show count without showing future content. Reveal expands only the released prefix of a chain with author, drawing/text and optional like.',
'Draw or describe according to actual kind. Submit explicit text or strokes, preserve draft/history until myDone. Never fetch/render unreleased chain entries. Likes target exact chain/idx and obey own/already-liked/skipped guards. Drawing source art is fixture player content, never shipped canvas background.',
'Phone: paper first, tools compact, source card collapsible only when permitted; text mode replaces drawing controls. Reveal is a vertical readable timeline rather than tiny sideways cards. Keyboard can reach each released entry/like.',
'Accepted handoff paper slide 240ms, reveal entry 220ms with max one at a time. Sound: quiet paper pass and short reveal swell, no autoplay narration. Reduced motion no slide; reveal order/privacy identical.',
'Client engineering: authorized prefix renderer, stable work drafts, draw caps and reaction state. Engine change: none; round/chain assignment and reveal cadence remain.',
'No early full-chain DOM/images; prompt visible only to entitled participant; submit rejection restores work; 800×600 mapping and stroke caps preserved; likes cannot target own/skipped/locked entries.'],
 'bluff':[
'P1','Current prompt, bluff input and voting phases need one coherent deception-table rhythm. A vote must never be hinted by correctness styling, authorship labels or impossible self-selection.',
'Keep Bluff Parlor authored answer slips, central prompt and equal-weight options. Phase caption explicitly says Write a bluff, Choose an answer or Reveal. Own answer has an unavailable treatment only for its owner, not public authorship.',
'Type bluff within existing 100-char limit, submit and lock only from phase/mySubmitted. During vote select an eligible option once. Preserve anonymous ordering; reveal truth/authors and point receipts only when the actual view permits it.',
'Phone: answer slips stack at full readable width and large tap height. Keep prompt above choices; submitted text remains visible to self without hidden focus targets. Text symbols and labels complement colors.',
'Accepted submit 120ms; reveal flip 220ms only after public result. Sound: pen drop then quiet reveal cadence. Reduced motion crossfade/static front/back labels; no 3D flip.',
'Client engineering: keyed anonymous choices, draft/lock and reveal hierarchy. Engine change: none; truth, author IDs, vote counts and scoring remain private until reveal.',
'Own bluff cannot get own vote; no truth marker pre-reveal; count/order matches view; one vote; rejected bluff retained; actual scores and authors only at reveal.'],
 'impostor':[
'P0','Current private role/word plus clue, discussion and vote controls require a stronger privacy model in the interface. Covering a word visually is not access control. No new voice chat or secret-role-colored participants are appropriate.',
'Keep Confidential Club folder, public clue ledger and equal public identity cards. Crew sees word, impostor only category, spectator no role/word. Readiness, anonymous vote and last guess each have one clear primary action.',
'Local cover toggles private word visibility for an entitled crew member; it never grants data. Clues max 30 chars. Discussion uses existing chat and ready. Vote cannot target self; show only own lock before results. Last-guess input belongs only to caught impostor. Result uses actual caught/stole/voided outcome.',
'Phone: private folder compact with explicit cover, clues in chronological list, active phase controls below. Vote identities have equal scale and named targets. Screen-reader labels must obey the same secret boundaries as the visible DOM.',
'Folder cover 160ms, clue append 140ms, result identity reveal 220ms. Sound: restrained card turn and phase cue; no detective alarm that labels a hidden role. Reduced motion static cover/result badges.',
'Client engineering: role-specific DOM, local cover and phase focus. Engine change: none; no early vote aggregation, role inference service or automated accusation.',
'Impostor/spectator have no hidden word in markup/alt/data; cover remains local preference; own vote disabled; clue length exact; last guess never appears to crew; results reflect actual branch.'],
 'checkers':[
'P1','Working checkers already exposes legal moves and stable confirmation helpers. The approved emerald material needs explicit forced-capture/multi-jump and king feedback so a player understands why another piece is unavailable.',
'Keep Emerald House board, named Lime/White sides and distinct crowned kings. Selected piece, forced capture, last move and legal landing dots have separate treatments. Rules cue is concise and adjacent to the turn.',
'Tap own legal piece then destination from server legal data. When mustJump, show Capture required; when chain is set, lock selection to that piece until complete. Resign stays stable two-tap confirmation using existing helper.',
'Phone: square fills width; named side/count/turn stays above; forced action caption below. Keyboard arrows traverse squares, Enter chooses. Crown shape and spoken king label do not depend on color.',
'Move 150ms, capture fade 120ms, promotion crown 180ms. Sound: wooden piece tap and soft crown chime. Reduced motion snap/crown with persistent capture receipt.',
'Client engineering: legal grid, chain focus, promotion marker and stable helper reuse. Engine change: none; draw/quiet counter, captures, kings and orientation unchanged.',
'Forced jump disables unrelated pieces; chain cannot switch token; crown matches piece code; wrong side cannot act; confirmation survives clock repaint; actual quiet draw and final board retained.']}
A={
'colorstack':'{type:"play",card,color?:"r"|"b"|"g"|"y"}; {type:"draw"}; {type:"pass"}',
'pool':'{type:"shoot",angle,power,place?:{x,y}}; {type:"resign"}',
'golf':'{type:"putt",angle,power}',
'ludo':'{type:"roll"}; {type:"move",token}',
'battleship':'{type:"place",ships:[{x,y,horizontal} ×5]}; {type:"random"}; {type:"fire",cell}; {type:"resign"}',
'gofish':'{type:"ask",target,rank} (numeric ranks 1–13)',
'chess':'{type:"move",from,to,promo?:"Q"|"R"|"B"|"N"}; {type:"offerDraw"}; {type:"acceptDraw"}; {type:"declineDraw"}; {type:"resign"}',
 'tycoon':'Read current node-server/server/games/tycoon.js onAction for phase-specific roll/buy/auction/bid/pass/build/sell/trade payloads (bankruptcy is automatic, not a user action); this package does not introduce a replacement action schema.'}
for g in games:
 id=g['id'];d=D[id];st=models[id]['states'];old=R/'design/playgrid-premium-rest'/id/'SPEC.md'
 if id not in A:
  text=old.read_text();match=re.search(r'Current wire actions: `([^`]+)`',text);A[id]=match.group(1) if match else 'Existing client actions unchanged.'
 prior=f'../../../playgrid-premium-rest/{id}/SPEC.md' if old.exists() else 'https://github.com/abyss-made/gamelab/tree/codex/playgrid-premium-directions/design/playgrid-premium-games'
 out=f'''# {g['name']} · Issue 58 delta audit

Priority **{d[0]}**. Current client reference **06609a4**. Approved composition **{g['approvedSource']}**. New work extends that direction; the earlier approval is unchanged.

[Desktop current capture](../../review/current-client/{id}-desktop.png) · [Phone current capture](../../review/current-client/{id}-mobile.png) · [Desktop design](../../review/proposed/{id}-desktop.png) · [Phone design](../../review/proposed/{id}-mobile.png) · [Local state/interaction explorer](../../explorer.html?game={id}) · [Approved specification]({prior})

## Observed current state and scope

{d[1]}

Evidence: real local Express/Socket.IO initial-game captures at 1440×900 and 390×844, with authenticated host and non-playing fixture peers. Current screenshots are not evidence of a completed match or tested physics. Existing game module: `node-server/public/js/games/{id}.js`; rules: `node-server/server/games/{id}.js`. Inspect both again before implementation because Claude may advance the gameplay branch.

## Intended experience / hierarchy

{d[2]}

## Controls and rules discoverability

{d[3]}

Current action contract / source reference: `{A[id]}`. Payload examples are existing wire vocabulary, not permission to change protocols. Local preview IDs are fixtures and must never be shipped as member/card IDs. The preview records local input drafts; it does not validate rules or acknowledge a server action.

## Responsive and accessible behavior

{d[4]}

For all states: 1440×900 and 390×844 captures are linked below; 360×740 has an additional layout check. At 200% zoom, use document/form scrolling rather than hiding essential controls. Maintain visible focus, meaningful disabled reason, text alongside color, and a single polite action receipt. Modal focus returns to its opener; timer refreshes do not recreate focused controls. Keyboard/player-device coverage remains a Claude integration acceptance task.

## Motion, pacing and sound

{d[5]}

Use [shared timing, audio and privacy rules](../../SYSTEM.md). Never delay authoritative application or spend turn time on an unskippable flourish. Deduplicate animation by accepted event/move ID. Persistent state is still understandable with all animation/audio off.

## Implementation boundary

{d[6]}

Static results use sample scores/boards only to define hierarchy. Host versus participant room actions are not new engine phases. No production logic or engine changes are included here. [Handoff](../../HANDOFF.md) defines the integration sequence and completion gate.

## Major-state design coverage

| State | Visual reference | Data / eligibility / focus |
|---|---|---|
'''
 for s in st:
  out+=f'| {s["label"]} | [Desktop + phone pair](../../review/states/{id}/{s["id"]}.html) · [Source](index.html?state={s["id"]}) | '+(s.get('trigger','Illustrative state; map to the actual authoritative view')+'; '+s.get('focus','Retain logical focus and preserve private view boundaries')).replace('|','/')+' |\n'
 out+='\n## Acceptance / priority\n\n'
 out+='- **P0 functional parity:** '+d[7]+'\n'
 out+='- **P1 visual finish:** approved material, hierarchy, illustrated assets, spacing and interaction states match desktop/phone references; report any measured difference.\n- **P1 state completeness:** render all named states from actual data, preserve spectators/reconnect and party continuity; no static fixture names/timers/results in game logic.\n- **P2 optional delight:** only add the specified restrained motion/audio after input, privacy, focus and response are correct.\n'
 (P/'games'/id/'AUDIT.md').write_text(out)
(P/'audit-data.json').write_text(json.dumps({g['id']:{'priority':D[g['id']][0],'finding':D[g['id']][1],'intent':D[g['id']][2],'controls':D[g['id']][3],'responsive':D[g['id']][4],'motion':D[g['id']][5],'engineeringBoundary':D[g['id']][6],'acceptance':D[g['id']][7]} for g in games},indent=2)+'\n')
(P/'PRIORITIES.md').write_text('''# Implementation sequence

P0 means correctness, privacy or core interaction must precede polish. It does not authorize server/physics changes. Each row links detailed design + engineering boundary + per-game acceptance.

| Order | Game | Priority | First completion gate |
|---|---|---|---|
'''+''.join(f'| {i+1} | [{g["name"]}](games/{g["id"]}/AUDIT.md) | {D[g["id"]][0]} | {D[g["id"]][7].split(";")[0]} |\n' for i,g in enumerate(sorted(games,key=lambda g:D[g['id']][0])))+'''
Before games: preserve current branch gameplay; baseline alpha/rooms/chat/result switching; integrate shared input/focus/feedback primitives. Avatar assets can integrate in parallel only after style review and safe schema approval; asset generation is complete, multiplayer schema is proposed.

Draw & Guess / Four in a Row: protect their simple successful layout. Apply small, targeted corrections after higher-gap games, not a sweeping shell rewrite.

RPS: excluded. Claude Issue #59 owns catalog removal; hidden Higher or Lower, Liar’s Dice, Hot Potato and Reversi are not newly exposed.
''')
print('20 specific audits, acceptance contracts and priority matrix.')
