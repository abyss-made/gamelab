# Implementation sequence

P0 means correctness, privacy or core interaction must precede polish. It does not authorize server/physics changes. Each row links detailed design + engineering boundary + per-game acceptance.

| Order | Game | Priority | First completion gate |
|---|---|---|---|
| 1 | [Color Stack](games/colorstack/AUDIT.md) | P0 | My hand never appears for spectators |
| 2 | [Pool](games/pool/AUDIT.md) | P0 | Pointer and keyboard select equivalent angles |
| 3 | [Mini Golf](games/golf/AUDIT.md) | P0 | All 18 source geometries match |
| 4 | [Ludo](games/ludo/AUDIT.md) | P0 | Roll cannot move a token |
| 5 | [Property Tycoon](games/tycoon/AUDIT.md) | P0 | Exactly 36 tiles with original names/prices |
| 6 | [Battleship](games/battleship/AUDIT.md) | P0 | Correct lengths/order |
| 7 | [Go Fish](games/gofish/AUDIT.md) | P0 | No absent-rank/self/empty-target asks |
| 8 | [Drawing Telephone](games/telephone/AUDIT.md) | P0 | No early full-chain DOM/images |
| 9 | [The Impostor](games/impostor/AUDIT.md) | P0 | Impostor/spectator have no hidden word in markup/alt/data |
| 10 | [Chess](games/chess/AUDIT.md) | P1 | All four promotion values use uppercase promo |
| 11 | [Tic Tac Toe](games/tictactoe/AUDIT.md) | P1 | No occupied/wrong-turn moves |
| 12 | [Dots & Boxes](games/dotsboxes/AUDIT.md) | P1 | Each edge maps to exact kind/r/c at every size |
| 13 | [Word Scramble](games/wordscramble/AUDIT.md) | P1 | Rejected draft retained |
| 14 | [Trivia Blitz](games/trivia/AUDIT.md) | P1 | No correctness in hidden markup before reveal |
| 15 | [Word Chain](games/wordchain/AUDIT.md) | P1 | Wrong-turn input unavailable |
| 16 | [Categories Rush](games/categories/AUDIT.md) | P1 | Draft survives ticks/rejection |
| 17 | [Bluff Battle](games/bluff/AUDIT.md) | P1 | Own bluff cannot get own vote |
| 18 | [Checkers](games/checkers/AUDIT.md) | P1 | Forced jump disables unrelated pieces |
| 19 | [Draw & Guess](games/drawguess/AUDIT.md) | P2 | Original drawing remains unfiltered |
| 20 | [Four in a Row](games/fourrow/AUDIT.md) | P2 | 7×6 always |

Before games: preserve current branch gameplay; baseline alpha/rooms/chat/result switching; integrate shared input/focus/feedback primitives. Avatar assets can integrate in parallel only after style review and safe schema approval; asset generation is complete, multiplayer schema is proposed.

Draw & Guess / Four in a Row: protect their simple successful layout. Apply small, targeted corrections after higher-gap games, not a sweeping shell rewrite.

RPS: excluded. Claude Issue #59 owns catalog removal; hidden Higher or Lower, Liar’s Dice, Hot Potato and Reversi are not newly exposed.
