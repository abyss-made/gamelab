window.GameRules = window.GameRules || {};
Object.assign(window.GameRules, {
  drawguess: {
    goal: "Score the most points by guessing the drawer's word quickly and by drawing words others can guess.",
    players: "2–12 players; extra people in the room spectate. New players can join mid-game.",
    flow: [
      "Each round, every seated player takes one turn as the drawer, so a game is (rounds x players) turns.",
      "The drawer gets 6 word choices and has 15 seconds to pick one. If they do not pick, the first choice is used automatically.",
      "While the drawer draws, everyone else types guesses into the chat. Case, punctuation and accents are ignored.",
      "A guess counts if it matches the word or contains it as whole words. Close guesses get a private 'is close!' nudge.",
      "The turn ends when every connected guesser has it or time runs out. The word is revealed for 6 seconds, then the next drawer starts.",
    ],
    controls: [
      "Mouse: drag on the canvas to draw. Pick Brush, Eraser or Paint Bucket, a color swatch, and a size (4-38).",
      "Touch: drag a finger to draw and tap with the bucket to fill. Use Expand Canvas for more room (Esc or Close exits).",
      "Undo removes the last stroke or fill. Clear wipes the canvas after a confirmation. The bucket is limited to 100 fills per turn.",
      "Guessers type in the chat box. Once you have guessed, your chat goes only to the drawer and other players who know the word.",
    ],
    scoring: [
      "A correct guess earns 50 to 500 points: 500 for an instant guess, falling to 50 as the clock runs out.",
      "The drawer earns 40% of every guesser's points that turn, so a drawing that many people solve fast pays well.",
      "If nobody guesses, the drawer gets 0. Scores start at 0 each game.",
    ],
    special: [
      "Letter Hints (default on): up to 3 random letters are revealed between 40% and about 85% of the way through the timer. Words under 3 letters get none.",
      "Difficulty is Easy, Medium (default), Hard or Mixed. A Custom Word List is mixed in, and Use Only Custom Words needs 6 distinct words.",
      "The drawer cannot type the word in chat. Spectators and finished guessers chat in a hidden channel so nothing is given away.",
      "Words already used this game are skipped until the word pool runs out.",
    ],
    timer: "Pick a word: 15 s (fixed). Draw time: 80 s by default, host can choose 30 to 300 s. Reveal: 6 s (fixed). Rounds: 3 by default, 1 to 10.",
    ending: "After the last round the highest score wins. If the drawer leaves, the turn ends or is skipped. If fewer than 2 players remain, the game ends early.",
  },

  fourrow: {
    goal: "Be the first to line up four of your discs in a row: horizontally, vertically or diagonally.",
    players: "2 players; everyone else in the room spectates.",
    flow: [
      "The board is 7 columns by 6 rows. Players take turns dropping one disc into a column; it falls to the lowest empty slot.",
      "Who moves first alternates each game in the same lobby.",
      "A move that makes four or more connected discs ends the game immediately and the winning discs are highlighted.",
      "If all 42 slots fill with no line of four, the game is a draw.",
    ],
    controls: [
      "Mouse: click anywhere on a column to drop a disc there. Columns are only clickable on your turn and while they have room.",
      "Touch: tap a column. The whole column is the tap target, and the slot where the disc will land is marked.",
      "Spectators see the board and whose turn it is but cannot play.",
    ],
    scoring: [
      "A win is worth 1 win on the lobby scoreboard, which is kept between games.",
      "Draws score nothing for either player.",
    ],
    special: [
      "Winner Stays (default on): after a win, the loser gives up their seat to the next waiting spectator, if there is one.",
      "A draw does not rotate seats. Leaving the game counts as a forfeit and your opponent wins.",
      "If you time out, a random legal column is played for you once.",
    ],
    timer: "Turn timer: 30 s by default; host can choose Off, 15, 30 or 60 s. Resets after every move.",
    ending: "First to connect four wins. Running out of time twice in a row forfeits the game; one timeout only makes a random move. A full board is a draw.",
  },

  wordchain: {
    goal: "Be the last player standing by always giving a valid word that starts with the last letter of the previous word.",
    players: "2–8 players; extra people in the room spectate.",
    flow: [
      "A random starting letter is chosen. The first player types a word that begins with it, then play passes clockwise.",
      "Each next word must begin with the final letter of the previous word, and no word can be used twice.",
      "Words are letters only (a to z, max 24), at least the minimum length, and must be in the word list when the Dictionary is on.",
      "An invalid word is rejected with a message and you can try again while your timer is still running.",
      "If your timer runs out you lose a life. At zero lives you are out.",
    ],
    controls: [
      "Mouse and Touch: type your word into the box and press Enter or the Send button. The box is only active on your turn.",
      "On phones the keyboard opens automatically at your turn; the required letter is shown large above the box.",
      "Use the room chat to talk. Words only go through the word box.",
    ],
    scoring: [
      "Each accepted word scores its length minus 2 points, with a minimum of 1 (so a 7-letter word is 5 points).",
      "The last player standing gets a 5 point winner bonus.",
      "Points are shown on the scoreboard, but surviving decides the win, not points.",
    ],
    special: [
      "Dictionary 'Common words only' (default) checks a built-in list. 'Off' accepts any letters but still blocks repeats and blocked words.",
      "Lives: 3 by default (1, 2, 3 or 5). Minimum word length: 3 by default (2, 3 or 4).",
      "AFK rule: 3 timeouts in a row removes you even if you still have lives. Playing a word resets the count.",
    ],
    timer: "Time per word: 20 s by default; host can choose 10, 15, 20 or 30 s. The clock resets on every turn.",
    ending: "The game ends when only one player has lives left, and that player wins. Players who leave lose all lives. Who starts rotates each game.",
  },

  categories: {
    goal: "Fill in five categories with words starting with the round's letter, and write answers nobody else thinks of.",
    players: "2–12 players; extra people in the room spectate.",
    flow: [
      "Each round shows one letter and five categories. Everyone answers at the same time.",
      "Every answer must start with the round's letter. Answers stay hidden from others until the round ends.",
      "Your sheet saves automatically as you type. Press I'm done to lock it in; the round ends early when everyone is done.",
      "A results table shows everyone's answers and points for 12 seconds, then the next round starts with a new letter.",
    ],
    controls: [
      "Mouse: click a box and type, Tab to move between boxes, then click I'm done when finished.",
      "Touch: tap a box, type, and tap I'm done. Answers are saved when you leave a box or pause typing.",
      "Once you press I'm done the boxes lock and you cannot edit them.",
    ],
    scoring: [
      "A valid answer nobody else matched scores 2 points. A valid answer another player also gave scores 1 point for each of them.",
      "Blank, wrong-letter, too-short (under 2 letters) or blocked answers score 0.",
      "Matching ignores case, punctuation, a leading 'the/a/an' and a trailing plural 's'. The game does not check whether an answer fits the category.",
    ],
    special: [
      "Letters and categories do not repeat within a game where possible.",
      "AFK rule: leaving all five boxes blank for 2 rounds in a row removes you from the game; you cannot win after being removed.",
      "Answers are capped at 30 characters.",
    ],
    timer: "Round time: 60 s by default; host can choose 30, 45, 60 or 90 s. Rounds: 5 by default (3, 5 or 8). The results screen lasts 12 s.",
    ending: "After the last round, the highest total wins. Equal top scores share a tie. If fewer than 2 players remain, the game ends early.",
  },

  higherlower: {
    goal: "Score the most points by correctly guessing whether the next card is higher or lower than the card showing.",
    players: "2–8 players; extra people in the room spectate.",
    flow: [
      "A face-up card is shown next to a face-down card. Everyone secretly picks Higher or Lower at the same time.",
      "When everyone has picked, or the timer ends, the hidden card is flipped for 3 seconds and points are awarded.",
      "The flipped card becomes the new face-up card and the next round begins.",
      "Cards are ranked 2 up to Ace (Ace is high). Suits do not matter.",
    ],
    controls: [
      "Mouse: click the Higher or Lower button.",
      "Touch: tap Higher or Lower.",
      "Your pick is final once made. Other players only see that you are locked in, not what you chose.",
    ],
    scoring: [
      "A correct guess scores points equal to your current streak: 1, then 2, 3, 4, and 5 per card (capped at 5).",
      "A wrong guess or no guess resets your streak to 0.",
      "If the new card has the same rank as the old one it is a push: nobody scores and streaks are unchanged.",
    ],
    special: [
      "Ties between ranks are pushes. The 52-card deck is reshuffled if it runs out.",
      "AFK rule: missing 3 guesses in a row removes you from the game, and you cannot win after that.",
      "Cards setting (rounds) is how many cards are played: 10 by default (5, 10, 15 or 20).",
    ],
    timer: "Time to guess: 12 s by default; host can choose 8, 12 or 20 s. The reveal pause is 3 s (fixed).",
    ending: "After the last card the highest score wins and equal top scores share a tie. The game ends early if fewer than 2 players remain.",
  },

  colorstack: {
    goal: "Be the first to get rid of all the cards in your hand.",
    players: "2–8 players; extra people in the room spectate.",
    flow: [
      "Everyone starts with 7 cards. The top discard card is always a plain number card at the start.",
      "On your turn, play a card that matches the top card's color or its number/symbol. Wild cards can be played on anything.",
      "If you cannot or do not want to play, draw one card. If that card is playable you may play it, or keep it and pass.",
      "The first player to play their last card wins the hand. There is no need to call out one card left.",
    ],
    controls: [
      "Mouse: click a highlighted card in your hand to play it, or click the draw pile to draw. Only highlighted cards are playable.",
      "Touch: tap a highlighted card to play, or tap the draw pile. Play and draw are available only on your turn.",
      "Wild cards ask you to choose a color. Cancel backs out. After drawing a playable card, tap Keep and pass to hold it.",
    ],
    scoring: [
      "The winner scores the total value of every card left in the other players' hands.",
      "Number cards are worth their number (0 to 9). Skip, Flip and +2 are worth 20 each. Wild and +4 are worth 50 each.",
      "Only one hand is played per game. Scores start at 0 each game.",
    ],
    special: [
      "Skip: next player loses their turn. Flip: reverses direction (with 2 players it acts as a Skip).",
      "+2: next player draws 2 and loses their turn. Wild +4 (any time, no restrictions): choose a color, next player draws 4 and loses their turn.",
      "When the draw pile runs out, the discard pile is reshuffled. Cards of a player who leaves go back into the draw pile.",
      "AFK rule: 3 turn timeouts without playing or passing removes you. Timeout auto-draws for you.",
    ],
    timer: "Turn timer: 30 s by default; host can choose Off, 20, 30 or 60 s. It resets after you draw a playable card.",
    ending: "The first empty hand wins. If everyone else leaves or is removed, the last player wins by default. There are no draws.",
  },

  gofish: {
    goal: "Collect the most books, a book being all four cards of the same rank.",
    players: "2–6 players; extra people in the room spectate.",
    flow: [
      "Each player is dealt 7 cards with 2 or 3 players, or 5 cards with 4 to 6 players. Any ready-made books are laid down right away.",
      "On your turn, pick a rank you hold in your hand and another player to ask for it.",
      "If they have that rank, they hand over every card of it and you ask again. If not, they say Go Fish and you draw one card.",
      "If the card you draw is the rank you asked for, you go again. Otherwise the turn passes.",
      "If you have no cards or nobody has cards to ask, you draw a card (if any remain) or your turn is skipped.",
    ],
    controls: [
      "Mouse: click a rank chip under 'Ask for', click a player under 'From', then click the Ask button.",
      "Touch: tap a rank, tap a player, then tap Ask. With only one possible opponent, they are selected for you.",
      "You can only ask for ranks that are in your hand. Your hand is private and others see only card counts and books.",
    ],
    scoring: [
      "Each completed book (four of a rank, 2 to Ace) is 1 point. Books appear next to each player's name.",
      "The scoreboard counts books, not cards.",
    ],
    special: [
      "A turn continues as long as you keep getting cards or draw the rank you asked for.",
      "AFK rule: if your timer runs out a random request is made for you. 3 timeouts in a row removes you; asking a question yourself resets the count.",
      "Cards of a player who leaves are shuffled back into the deck.",
    ],
    timer: "Turn timer: 30 s by default; host can choose Off, 20, 30 or 60 s. It resets after each question.",
    ending: "The game ends when all 13 books are made, or the deck is empty and at most one player still holds cards. Most books wins; equal top counts tie.",
  },

  tictactoe: {
    goal: "Get three of your marks in a row on the 3x3 grid before your opponent does.",
    players: "2 players; everyone else in the room spectates.",
    flow: [
      "Players alternate placing their mark (X or O) in an empty square. X always goes first.",
      "Who plays X alternates each game in the same lobby.",
      "A row, column or diagonal of three of your marks wins immediately.",
      "If all 9 squares fill with no line, the game is a draw.",
    ],
    controls: [
      "Mouse: click an empty square on your turn.",
      "Touch: tap an empty square on your turn.",
      "Spectators see the board but cannot play. Squares are disabled when it is not your turn.",
    ],
    scoring: [
      "A win is worth 1 win on the lobby scoreboard, which is kept between games.",
      "Draws score nothing for either player.",
    ],
    special: [
      "Winner Stays (default on): after a win, the loser gives up their seat to the next waiting spectator, if there is one.",
      "A draw does not rotate seats. Leaving mid-game is a forfeit and your opponent wins.",
      "If you time out once, a random empty square is played for you.",
    ],
    timer: "Turn timer: 30 s by default; host can choose Off, 15, 30 or 60 s. Resets every move.",
    ending: "Three in a row wins. Timing out twice in a row forfeits the game. A full board with no line is a draw.",
  },

  rps: {
    goal: "Win your matches in a knockout bracket and be the last player left to take the tournament.",
    players: "2–16 players; extra people in the room spectate.",
    flow: [
      "Players are seeded at random into a single-elimination bracket. If the field is not a power of two, some players get a bye into round 2.",
      "In a match, both players pick Rock, Paper or Scissors in secret at the same time, then both throws are revealed together.",
      "Rock beats Scissors, Scissors beats Paper, Paper beats Rock. A tie replays the throw.",
      "First to win the majority of the match (2 in best of 3, 3 in best of 5) advances. The loser is out.",
      "All matches in a round run at the same time and share one pick timer.",
    ],
    controls: [
      "Mouse: click Rock, Paper or Scissors during the pick phase.",
      "Touch: tap one of the three big buttons. Your pick is final once made.",
      "The bracket at the bottom shows every match and each player's wins. Eliminated players and spectators can watch it.",
    ],
    scoring: [
      "Each match you win is 1 point (byes do not count).",
      "The tournament champion gets a bonus of 2 points.",
      "Final standings rank the champion first, then by match wins, then by seed.",
    ],
    special: [
      "If only one player picks in time, they win the throw. If neither picks, the throw is void and replays.",
      "AFK rule: missing 2 picks in a row in a match forfeits it, and the other player advances.",
      "If your opponent leaves, you win that match by forfeit. If both are idle, the better seed advances.",
    ],
    timer: "Time to pick: 12 s by default; host can choose 8, 12 or 20 s. Reveal pause is 2.5 s (fixed). Match length: best of 3 by default (1, 3 or 5).",
    ending: "The last unbeaten player is crowned champion. If everyone else leaves, the remaining player wins.",
  },
});
