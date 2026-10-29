// In-app rules content (part C): checkers, reversi, ludo, chess, pool, golf, tycoon.
window.GameRules = window.GameRules || {};
Object.assign(window.GameRules, {
  checkers: {
    goal: "Capture all of your opponent's pieces, or leave them with no legal move.",
    players: "2 players; everyone else in the room spectates.",
    flow: [
      "Lime moves first; colours swap each game. Pieces sit on the dark squares of an 8x8 board.",
      "Take turns moving one piece one square diagonally forward.",
      "If you can jump an enemy piece, you must. Jump by landing on the empty square just beyond it.",
      "After a jump, the same piece must keep jumping if it can (a multi-jump).",
      "A man reaching the far row becomes a king (kings move and jump in all four diagonals); crowning ends your turn.",
    ],
    controls: [
      "Mouse: click one of your highlighted pieces, then click a highlighted destination square.",
      "Touch: tap your piece, then tap the target square. Tap elsewhere to deselect.",
      "During a multi-jump the jumping piece is selected for you; just tap its next landing square.",
      "Resign: press the Resign button, then press it again within 3 seconds to confirm.",
    ],
    scoring: [
      "A win is worth 1 point on the lobby leaderboard; a draw scores nothing.",
      "The player list shows how many pieces each side has left.",
      "Scores persist across games in the same lobby (they are not reset between games).",
    ],
    special: [
      "Captures are compulsory: when any jump exists, only jumping moves are offered.",
      "Men move and capture forward only; only kings go backward.",
      "Winner Stays (on by default): the winner keeps their seat and the next spectator takes the other.",
    ],
    timer: "Turn Timer: Off, 20, 30 (default) or 60 seconds. Each jump in a multi-jump gets a fresh clock.",
    ending: "You win if the opponent has no pieces or no legal move, resigns, leaves, or times out twice in a row. Draw after 40 moves each with no capture and no man moved. A timeout makes a random move.",
  },

  reversi: {
    goal: "Finish with more discs of your colour on the board than your opponent.",
    players: "2 players; everyone else in the room spectates.",
    flow: [
      "Black moves first; colours swap each game. The board starts with 2 black and 2 white discs in the centre.",
      "On your turn, place a disc on an empty square that traps a straight line of enemy discs against another of your discs.",
      "Every trapped line (any direction, including diagonals) flips to your colour.",
      "If you have no legal move you pass automatically and the turn returns to your opponent.",
      "Play continues until neither player can move (usually a full board).",
    ],
    controls: [
      "Mouse: click a square marked with a dot (the only squares you can play).",
      "Touch: tap a dotted square. There is no drag; a tap places the disc immediately.",
      "Resign: press the Resign button, then press it again within 3 seconds to confirm.",
    ],
    scoring: [
      "Final count is the number of discs per colour; more discs wins.",
      "A win is worth 1 point on the lobby leaderboard; a tie scores nothing.",
      "Scores persist across games in the same lobby (they are not reset between games).",
    ],
    special: [
      "A move must flip at least one disc; otherwise the square is not offered.",
      "Passes are automatic and announced; you never choose to pass.",
      "Winner Stays (on by default): the winner keeps their seat and the next spectator takes the other.",
    ],
    timer: "Turn Timer: Off, 20, 30 (default) or 60 seconds. If it runs out a random legal move is played for you.",
    ending: "More discs wins when nobody can move; equal discs is a draw. You also win if the opponent resigns, leaves, or times out twice in a row.",
  },

  ludo: {
    goal: "Be the first to bring all four of your tokens around the board and into the centre.",
    players: "2–4 players; extras spectate. With 2 players you get opposite corners (Red and Yellow).",
    flow: [
      "A random player starts. On your turn, roll the dice, then pick one token to move that many squares.",
      "You need a 6 to bring a token out of your yard onto your start square.",
      "Tokens travel clockwise once around the track, then up their own five-square home column to the centre.",
      "Rolling a 6 gives you another roll. Three 6s in a row cancel the turn and the third 6 is not played.",
      "If no token can legally move, the turn passes after a short pause.",
    ],
    controls: [
      "Mouse: press Roll dice, then click a glowing token on the board or one of the Token buttons below the dice.",
      "Touch: tap Roll dice, then tap a highlighted token or its Token button (the button also says 'leave yard').",
      "Only tokens that can legally move with your roll are selectable.",
    ],
    scoring: [
      "The score shown is how many of your tokens are home (0 to 4).",
      "The first player with all 4 tokens home wins.",
      "Ludo is the exception: this home count is reset when a new game starts.",
    ],
    special: [
      "Landing exactly on a lone opponent token sends it back to its yard.",
      "Start squares and star squares are safe: no captures there, and different colours can share them.",
      "Two of your tokens on one square form a block that cannot be captured.",
      "Reaching home needs an exact roll; a token cannot overshoot the centre.",
    ],
    timer: "Turn Timer: 15, 25 (default) or 40 seconds per action (roll or move). On timeout the dice are rolled or a token is moved for you. Three timeouts in a row removes you from the game.",
    ending: "First to get all four tokens home wins. If everyone else leaves or is removed for idling, the last player wins. A removed player's tokens leave the board.",
  },

  chess: {
    goal: "Checkmate the opponent's king.",
    players: "2 players; everyone else in the room spectates.",
    flow: [
      "White moves first; colours swap each game. The server only allows fully legal moves.",
      "Take turns moving one piece. You cannot leave your own king in check.",
      "A king in check is highlighted and the status says Check!",
      "Castling, en passant and pawn promotion are all supported.",
      "A pawn reaching the last rank opens a Promote to picker (queen, rook, bishop or knight).",
    ],
    controls: [
      "Mouse: click one of your pieces, then click a highlighted square (dots for moves, rings for captures).",
      "Touch: tap your piece, then tap its destination. Tap another piece of yours to switch.",
      "Castle by selecting the king and choosing the square two files over. The board flips so you are at the bottom.",
      "Side panel: move list, Offer draw, and Resign (press twice within 3 seconds to confirm).",
    ],
    scoring: [
      "A win is worth 1 point on the lobby leaderboard; a draw scores nothing.",
      "Wins can come from checkmate, resignation, the opponent's clock running out, or the opponent leaving.",
      "Scores persist across games in the same lobby.",
    ],
    special: [
      "Draw offers: one standing offer at a time; the opponent can Accept or Decline, and making a move also declines it.",
      "Automatic draws: stalemate, insufficient material, threefold repetition, and the fifty-move rule.",
      "If your clock runs out but the opponent cannot possibly checkmate, the game is a draw.",
      "Winner Stays (on by default): the winner keeps their seat and the next spectator takes the other.",
    ],
    timer: "Clock Per Player: Off, 3, 5, 10 (default), 15 minutes, with Bonus Per Move of none, +2 or +5 seconds. With the clock Off, 3 minutes without moving forfeits.",
    ending: "Checkmate wins. Draw by stalemate, insufficient material, threefold repetition, fifty-move rule or agreement. You also lose by resigning, flagging, idling or leaving.",
  },

  pool: {
    goal: "Pocket all of your balls (solids 1-7 or stripes 9-15), then sink the 8-ball.",
    players: "2 players; everyone else in the room spectates.",
    flow: [
      "The first player breaks with the cue ball placed anywhere behind the head line. The table is open until someone pockets a ball after the break.",
      "That first legal pocket after the break decides your group; your opponent gets the other.",
      "Aim, set power and shoot. Keep shooting while you legally pocket one of your balls; otherwise the turn passes.",
      "Your cue ball must hit one of your own balls first (the 8-ball once yours are all down). On an open table, any ball but the 8.",
      "After a foul, your opponent gets ball in hand anywhere on the table.",
    ],
    controls: [
      "Mouse: drag on the table to aim (the cue points toward the pointer). Use the Aim and Power sliders to fine tune, then press Shoot.",
      "Touch: drag a finger on the table to aim, adjust sliders, tap Shoot. Nothing happens until you press Shoot.",
      "Ball in hand: press Move cue ball, drag it to a spot, press Lock cue ball, then shoot.",
      "Keyboard: arrows adjust aim and power (Shift for bigger steps), Enter shoots.",
    ],
    scoring: [
      "A win is worth 1 point on the lobby leaderboard; there are no draws.",
      "The player list shows each player's group and how many of their balls remain.",
      "Scores persist across games in the same lobby.",
    ],
    special: [
      "Foul: cue ball pocketed, nothing hit, wrong ball hit first, or no ball reaches a rail or pocket after contact.",
      "There are no called shots: any pocket counts. No spin, and the break has no wrong-ball rule.",
      "If the 8-ball drops on the break, it is spotted again and play continues.",
      "Sinking the 8-ball early, with a foul, or while scratching loses the game immediately.",
    ],
    timer: "Turn Timer: Off, 30, 45 (default) or 60 seconds per shot. On timeout a shot is played for you; two timeouts in a row forfeits.",
    ending: "Legally sink the 8-ball after clearing your group to win. You lose if you sink it early or with a foul. Resigning, leaving, or two timeouts in a row also lose.",
  },

  golf: {
    goal: "Finish the course with the fewest total strokes.",
    players: "2–6 players; extras spectate.",
    flow: [
      "Everyone plays the same holes in order. Each hole shows its par.",
      "One player putts at a time. The player farthest from the cup goes next; on the tee the honour rotates each hole.",
      "Aim, set power and putt. The ball's path is played out for everyone.",
      "A hole ends for you when you sink the ball or reach the stroke limit; the hole ends when all players are done.",
      "A scorecard is shown for a few seconds between holes, then the next hole starts automatically.",
    ],
    controls: [
      "Mouse: drag on the course to aim (the putt goes toward the pointer). Adjust the Aim and Power sliders, then press Putt.",
      "Touch: drag a finger to aim, set power with the slider, tap Putt. Nothing happens until you press Putt.",
      "Keyboard: arrows adjust aim and power (Shift for bigger steps), Enter putts.",
    ],
    scoring: [
      "Each putt is 1 stroke. Lowest total strokes over the whole course wins.",
      "Reaching the stroke limit ends your hole and scores exactly the limit.",
      "The winner earns 1 point on the lobby leaderboard; tied leaders each earn 1.",
    ],
    special: [
      "Balls never collide with each other.",
      "Water: +1 penalty stroke and the ball returns to where you hit it from.",
      "Sand slows the ball a lot. Bumpers bounce the ball.",
      "The cup only captures a ball that is slow enough; a fast ball rolls over it.",
    ],
    timer: "Turn Timer: 20, 30, 45 (default) or 60 seconds per putt. On timeout a putt is aimed at the cup for you; two timeouts in a row removes you from the game.",
    ending: "After the last hole, the lowest total wins; equal totals tie. Courses: Meadow, Canyon or Skyline (6 holes) or Playgrid Open (18). Stroke limit per hole: 6, 8 (default) or 10.",
  },

  tycoon: {
    goal: "Build the richest property empire, or be the last player left in the game.",
    players: "2–6 players; extras spectate.",
    flow: [
      "Everyone starts with the same cash. Seating order is random and turns go around in rounds.",
      "Roll two dice and move around the 36-tile board. Passing or landing on Launch Pad pays $200.",
      "Landing on an unowned property, station or utility: buy it at list price, or send it to auction.",
      "Landing on someone else's property makes you pay rent. Tax tiles pay the bank; Surprise tiles draw a card.",
      "Then manage: build upgrades, sell upgrades, trade with players, and end your turn.",
    ],
    controls: [
      "Mouse: use the on-screen buttons (Roll dice, Buy, Send to auction, End turn). Click any tile to see its details and rents.",
      "Touch: tap the same buttons and tiles. Your property list has Build and Sell buttons.",
      "Auction: type a bid and press Bid, use the +10/+50/+100 buttons, or press Pass.",
      "Trades: Propose a trade, pick a player, choose cash and properties each way, and send. They must accept.",
    ],
    scoring: [
      "Rent: bare lots charge the base rent (doubled if you own the whole colour); upgrades raise it. Stations charge $25 x 2 per extra station owned.",
      "Utilities charge 4x the dice total (10x if you own both).",
      "Upgrade levels: Shop, Block, Tower, Landmark. Sell one back for half its cost.",
      "Net worth = cash + property prices + money spent on upgrades. Winners get 1 point on the lobby leaderboard.",
    ],
    special: [
      "Doubles roll again; three doubles in a row sends you to Time Out.",
      "Time Out: pay $50, use a Get-out card, or roll doubles. After your third turn there you pay $50 and move.",
      "Upgrades need the full colour group, one level at a time, evenly across the group. There are no mortgages.",
      "If you cannot pay, upgrades are sold off at half price; if you still cannot, you go bankrupt and your assets go to who you owed (or the bank).",
    ],
    timer: "Turn Timer: 30, 45 (default), 60 or 90 seconds per decision (roll, buy, manage). Auctions run 15 seconds, extended to at least 8 seconds after each bid. Three timeouts in a row removes you.",
    ending: "Game Length: 10, 15 (default) or 25 rounds, after which the highest net worth wins (ties share the win), or Classic: last player standing (150-round safety cap). Everyone else going bankrupt or leaving ends it early.",
  },
});
