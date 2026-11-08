# Playgrid 4.2 audit and implementation standard

Baseline: production `8846f1514b2bbb8e807ba1b3954e136327b27fa4`. Twenty selectable games; hidden Higher/Lower, Liar's Dice, Hot Potato, Reversi and RPS remain hidden. Preserve the homepage, artwork, Express/Socket.IO and PR #72 platform protections.

| Game | Existing foundation / specific improvement |
|---|---|
| Draw & Guess | Preserve benchmark canvas/focus and private words; improve accessible shared control feedback |
| Four in a Row | Preserve benchmark disc drops/legal columns; improve active-player and result feedback |
| Word Chain | Broaden dictionary; use the accepted vocabulary for letter exhaustion; persistent inline rejection reason and missing-word report |
| Categories Rush | Semantic membership for concrete categories, broader cities/aliases, explicit party-judged creative categories; stable review DOM |
| Color Stack | Public backs/private fan already work; focus-contained wild choice with Escape; confirmed discard/hand movement |
| Go Fish | Public request ledger already works; directly selectable private hand, stable keyed feedback and existing book celebrations |
| Tic Tac Toe | Legal cells and SVGs already work; spatial keyboard navigation and stable focus |
| Dots & Boxes | Preserve captures/player colors; composite focus identity and directional navigation |
| Word Scramble | Add actual tappable tiles, shuffle, undo, clear; retain rejected guesses and explain invalid letters vs unknown anagrams |
| Trivia | Retain private answers/1–4 keys; prevent shortcuts through dialogs, improve reveal hierarchy |
| Drawing Telephone | Preserve server reveal timing; stable illustrated reveal entries, no canvas rebuild on likes; latest-entry shortcut |
| Bluff Battle | Preserve invented uppercase answers; improve phase transitions and visual hierarchy |
| The Impostor | Preserve secret role/word/timing; local hide/reveal control and more readable reveal treatment |
| Battleship | Preserve SVG ships/aim/fire/mobile tabs; stronger selected targets and focus |
| Checkers | Preserve server legal/forced captures; spatial keyboard navigation |
| Ludo | Preserve server dice/legal tokens; confirmed token travel and accessible shared-cell picker |
| Chess | Preserve clocks/legal/promotion/themes; spatial navigation and focus-contained promotion |
| Pool | Preserve authoritative physics; reachable labeled power presets and responsive controls |
| Mini Golf | Preserve top-down physics/collisions; portrait-aware bounded tee keyboard movement and power presets |
| Property Tycoon | Preserve compact board/auctions/trade review; interpolate existing tile steps, honor reduced motion |

Standard: retain distinct plum, sea-glass, ivory, midnight, warm-paper and emerald game surfaces inside navy/lime branding. Motion lasts 180–320ms, reflects confirmed changes and never blocks actions. Reconnect seeds motion state. Reduced motion removes decorative transitions. Legal enabled controls remain authoritative. Explicit Play/Ask/Fire prevent accidental actions. No framework or runtime dictionary API.

Evidence must distinguish opening screenshots from played transitions. Test at 1440×900, 390×844 and 932×430 with independent browser clients, reconnects, departures, terminal states and rematches. Record exact results and limits; no claim based on interrupted tests.

Recovery note: the previous environment was replaced before a checkpoint. Earlier uncommitted files and temporary test logs were lost. This branch reconstructs that work and reruns verification; prior unfinished runs are not counted.
