window.GameRules = window.GameRules || {};
Object.assign(window.GameRules, {
  dotsboxes: {
    goal: "Draw lines between dots and claim more boxes than anyone else by closing the fourth side of a box.",
    players: "2–4 players; extras spectate",
    flow: [
      "Players take turns drawing one line between two neighbouring dots. The first player rotates each game.",
      "If your line completes a box (or two at once), you claim it and must draw again.",
      "If your line completes nothing, the turn passes to the next player.",
      "The game ends when every line on the board has been drawn.",
    ],
    controls: [
      "Mouse: click an empty gap between two dots on your turn to draw that line.",
      "Touch: tap an empty gap between two dots. The board is only active on your turn.",
      "Spectators and players waiting for their turn cannot draw.",
    ],
    scoring: [
      "1 point per box claimed (shown as boxes). A line that closes two boxes at once scores 2.",
      "Claimed boxes show the first letter of the owner's name in their colour.",
    ],
    special: [
      "Board size is 3×3, 4×4 or 5×5 boxes (default 4×4).",
      "Closing a box always gives a bonus turn, so a chain of boxes can be taken in one go.",
      "The newest line is highlighted so you can see the last move.",
    ],
    timer: "Turn timer: Off, 20, 30 or 60 seconds (default 30). When it runs out, a random line is drawn for you.",
    ending: "Most boxes wins. Equal top scores are a tie. If everyone else leaves or is removed, the remaining player wins by forfeit.",
  },

  wordscramble: {
    goal: "Unscramble the shared letters into the hidden word faster than everyone else.",
    players: "2–12 players; extras spectate",
    flow: [
      "Every round shows the same scrambled letters and the word length to all players.",
      "Type your guess and press Enter or Guess. Wrong guesses are free and unlimited until you solve it.",
      "Once you solve it, you wait. The round ends when everyone has solved it or time runs out.",
      "The answer is revealed for a few seconds (4 s), then the next word starts.",
    ],
    controls: [
      "Mouse: click the text box, type letters a–z, press Enter or click Guess.",
      "Touch: tap the box, type on your keyboard, tap Guess (or the keyboard's Go/Enter).",
      "Only letters are accepted; spaces and symbols are rejected with a notice.",
    ],
    scoring: [
      "Correct answer: 50 points, plus up to 50 speed bonus based on how much time was left.",
      "The first player to solve a word gets an extra 20 points (max 120 per word).",
      "Not solving a word scores 0 for that round.",
    ],
    special: [
      "Any real dictionary word using exactly the same letters is accepted, not only the hidden one.",
      "Difficulty sets word length: Easy 4–5 letters, Medium 6, Hard 7–11 (default Medium).",
      "Words per game: 5, 8 or 12 (default 8). Words do not repeat within a game where possible.",
    ],
    timer: "Time per word: 20, 30 or 45 seconds (default 30), followed by a 4-second answer reveal. There is no idle kick.",
    ending: "After the last word, highest total wins. Equal top totals tie (including if everyone scored 0). Winning by forfeit if all others leave.",
  },

  trivia: {
    goal: "Answer multiple-choice questions correctly and quickly to finish with the most points.",
    players: "2–12 players; extras spectate",
    flow: [
      "Each question appears with four shuffled choices for everyone at once.",
      "Pick one answer. Your choice is final once made and others cannot see it until the reveal.",
      "The question ends when everyone has answered or the timer runs out.",
      "The correct answer and points gained are shown for 4 seconds, then the next question begins.",
    ],
    controls: [
      "Mouse: click an answer button.",
      "Keyboard: press 1, 2, 3 or 4 to choose the matching answer.",
      "Touch: tap an answer. Once picked it is locked in.",
    ],
    scoring: [
      "Correct: 100 points plus up to 100 speed bonus (more if you answer with time to spare).",
      "Streak bonus: +10 for each consecutive correct answer after the first, up to +50.",
      "Wrong or unanswered: 0 points and your streak resets. Best possible per question is 250.",
    ],
    special: [
      "Category can be Mixed or Science, Geography, History, Entertainment, Sports or Food.",
      "If a category has too few questions, the game fills the rest from other categories.",
      "Answer-position is shuffled every question, so do not rely on patterns.",
    ],
    timer: "Time to answer: 10, 15 or 20 seconds (default 15), plus a 4-second reveal. Not answering has no idle kick; it just scores 0.",
    ending: "After the last question (5, 10 or 15; default 10) the highest score wins. Equal top scores tie.",
  },

  telephone: {
    goal: "Pass prompts and drawings along a chain and enjoy how they get twisted, earning points for taking part and for likes.",
    players: "3–8 players; extras spectate",
    flow: [
      "Round 1: everyone secretly writes a prompt. Each prompt starts its own chain.",
      "Then chains rotate. You get one entry from a neighbour: draw text you receive, or describe a drawing you receive, alternating.",
      "There are as many rounds as players, so every chain passes through everyone once.",
      "Finally every chain is replayed step by step. Like the entries you enjoy.",
    ],
    controls: [
      "Mouse: draw by holding the button and dragging on the canvas. Pick colour, brush size, Brush, Fill or Eraser.",
      "Touch: drag a finger on the canvas to draw. Undo and Clear are in the toolbar.",
      "Press Done (or Submit for text) to lock in early. Text entries are up to 60 characters.",
      "During the reveal, click or tap the heart on an entry to like it.",
    ],
    scoring: [
      "+1 point for every entry you submit in time (skipped or timed-out entries earn nothing).",
      "+1 point whenever another player likes one of your entries.",
      "You cannot like your own entries, and skipped entries cannot be liked.",
    ],
    special: [
      "You only ever see the one entry passed to you; the whole chains stay hidden until the end.",
      "Drawing limits: 250 strokes, 4000 points and 20 fills per drawing (12 colours, 3 brush sizes).",
      "If you run out of time, a blank drawing, '(no guess)' or a random prompt is filled in so the chain keeps going.",
    ],
    timer: "Drawing time 45, 60 or 90 seconds (default 60); writing time 20, 30 or 45 (default 30). The reveal auto-advances every 5 seconds.",
    ending: "After all chains are revealed, most points wins. Equal top scores tie. The game ends early (forfeit) if fewer than 2 players remain.",
  },

  bluff: {
    goal: "Invent believable fake answers to trivia questions, and spot the real answer among everyone's bluffs.",
    players: "3–10 players; extras spectate",
    flow: [
      "A question with an unusual answer appears. Everyone writes a fake answer that could pass as real.",
      "All fakes plus the real answer are shown in shuffled order, with no names attached.",
      "Everyone votes for the answer they think is true. You cannot vote for your own bluff.",
      "The truth, authors and voters are revealed (9 s), then the next question starts.",
    ],
    controls: [
      "Mouse: type your bluff in the box (up to 40 characters) and press Enter or Submit; then click an option to vote.",
      "Touch: type and tap Submit; tap an answer card to vote. Submissions and votes are final.",
    ],
    scoring: [
      "Vote for the real answer: +2 points.",
      "Each player who votes for your bluff: +1 point for you.",
      "Voting for a bluff (or not voting) earns no points.",
    ],
    special: [
      "If your bluff matches the real answer, it is rejected and you must write something else.",
      "Identical bluffs from different players are merged into one option; each author still gets fool points.",
      "If nobody submits a bluff in time, the question is skipped.",
    ],
    timer: "Bluff time 30, 45 or 60 seconds (default 45); vote time 15, 20 or 30 (default 20). Reveal lasts 9 seconds. No idle kick.",
    ending: "After the last question (3, 5 or 8; default 5), highest points wins; ties are possible. Ends early if fewer than 3 players remain.",
  },

  impostor: {
    goal: "Crew: find the hidden impostor. Impostor: blend in without knowing the secret word and avoid being caught.",
    players: "3–10 players; extras spectate",
    flow: [
      "Each round one random player is the impostor. The crew sees a secret word; the impostor only sees its category.",
      "Clue phase: in random order each player gives a one-word or short clue. This repeats for the chosen number of laps.",
      "Discussion: talk in the room chat, then everyone presses 'I'm ready to vote' (or the timer ends).",
      "Vote for who you think is the impostor. Most votes is accused; a tie or no votes lets the impostor escape.",
      "If the impostor is caught, they get one guess at the secret word.",
    ],
    controls: [
      "Mouse: type your clue in the box and click Give clue; click a player's name to vote.",
      "Touch: tap the box, type, tap Give clue; tap a name to vote. Use the chat box during discussion.",
      "Votes and clues are final. You cannot vote for yourself.",
    ],
    scoring: [
      "Impostor escapes (not caught): impostor +3, crew 0.",
      "Impostor caught but guesses the word: impostor +2, crew 0.",
      "Impostor caught and guesses wrong: each crew member who voted for the impostor +2.",
      "If the impostor leaves mid-round, the round is void and nobody scores.",
    ],
    special: [
      "Everyone becomes the impostor once before anyone repeats. Secret words do not repeat.",
      "Crew clues may not be exactly the secret word. The impostor's guess must match the word exactly.",
      "Skipped clues show '(no clue)'; there is no penalty, but you lose your chance to look credible.",
    ],
    timer: "Clue time 20/30/45 s (default 30); discussion 30/60/90 s (default 60); fixed 25 s vote and 20 s impostor guess; 9 s result. Rounds 1, 3 or 5 (default 3); clue laps 1–3 (default 2).",
    ending: "After the final round, highest points wins; ties are possible. The game ends early if fewer than 3 players remain.",
  },

  liarsdice: {
    goal: "Be the last player with dice left by bidding smartly and calling out bluffs.",
    players: "2–8 players; extras spectate",
    flow: [
      "Everyone secretly rolls their dice (3 or 5 each). Only you can see your own dice.",
      "On your turn, raise the bid: claim there are at least N dice showing a face across ALL players' dice.",
      "A new bid must have a higher quantity, or the same quantity with a higher face.",
      "Or call 'Liar!' on the previous bid. All dice are revealed; if the table holds fewer than the bid, the bidder loses a die, otherwise the caller does.",
      "The loser of the challenge starts the next round (or the next player if they are out of dice).",
    ],
    controls: [
      "Mouse: use the − and + buttons for quantity, click a face button (1–6), then click Bid. Click Liar! to challenge.",
      "Touch: tap − / + and a face, then tap Bid. Liar! only appears once there is a bid to challenge.",
      "The first bid of a round cannot be challenged.",
    ],
    scoring: [
      "No points: each player's score is the number of dice they still have.",
      "The player who loses a challenge loses exactly one die. At zero dice you are out.",
      "Bid quantity cannot exceed the total dice in play.",
    ],
    special: [
      "Ones Are Wild (default on): ones count as any face except ones. Bidding on ones counts only real ones.",
      "Rolling happens fresh every round; the reveal screen shows everyone's dice, highlighting matches.",
      "If the player who made the standing bid leaves, the round is re-rolled with no loss.",
    ],
    timer: "Turn timer 20, 30 or 60 seconds (default 30). On timeout you open with a 1×2 bid, or automatically call Liar! on the standing bid. 3 timeouts in a row removes you.",
    ending: "Last player with dice wins. If everyone else leaves, the remaining player wins by forfeit. There are no ties.",
  },

  hotpotato: {
    goal: "Pass the bomb before it explodes and be the last player with a life left.",
    players: "2–10 players; extras spectate",
    flow: [
      "Each round shows a prompt (for example a category). A random player starts holding the bomb.",
      "If you hold the bomb, type an answer to the prompt and choose someone to pass it to.",
      "The bomb has a hidden fuse. When it goes off, the current holder loses a life.",
      "After a short pause, a new round starts with a new prompt and a new hidden fuse.",
    ],
    controls: [
      "Mouse: click a player's name to choose a target, type your answer (up to 30 characters), then click Pass! or press Enter.",
      "Touch: tap a name, tap the answer box, type, then tap Pass!.",
      "If you pick nobody, the bomb goes to the first allowed player.",
    ],
    scoring: [
      "No points: players have lives (hearts), 1, 2 or 3 (default 2).",
      "Losing your last life knocks you out for the rest of the game.",
    ],
    special: [
      "Answers need at least 2 characters and cannot repeat within a round.",
      "You cannot pass back to the player who just gave you the bomb (unless only two players are alive).",
      "Holding the bomb longer than 12 seconds makes it explode in your hands, even before the fuse ends.",
      "Fuse length: Short 10–22 s, Medium 18–38 s, Long 30–55 s (random, never shown). Answers are not checked for correctness.",
    ],
    timer: "A 12-second hold limit is shown on screen; the hidden fuse is shorter or longer depending on the setting (default Medium). Boom lasts 4 seconds.",
    ending: "Last player with a life wins. If everyone else leaves, the remaining player wins by forfeit. There are no ties.",
  },

  battleship: {
    goal: "Secretly place your fleet, then sink all five enemy ships before the opponent sinks yours.",
    players: "2 players; everyone else spectates",
    flow: [
      "Both players place five ships on a 10×10 grid in secret: Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2.",
      "Once both fleets are locked in (or placement time runs out), the battle begins with player one.",
      "On your turn, aim at a square in enemy waters and fire. The result is hit, miss or sunk.",
      "A miss passes the turn. A hit passes the turn too, unless 'Hit Again' is on.",
    ],
    controls: [
      "Placing: choose a ship in the list, set Rotate, then click or tap the square for its top-left end. Click a placed ship to pick it up again.",
      "Buttons: Random fleet, Clear and Lock in fleet. Lock in only works when all five ships are placed.",
      "Firing: click or tap a square to aim, then press Fire!. Aiming alone does not shoot.",
      "Resign: click or tap Resign twice within 3 seconds to confirm.",
    ],
    scoring: [
      "No points per shot. The winner gets +1 win on the room scoreboard.",
      "The board shows which ships remain for both sides; sunk ships are revealed.",
    ],
    special: [
      "Ships cannot overlap or hang off the board, but may touch each other.",
      "Hit Again (default off): a hit earns another shot. Winner Stays (default on): the winner plays the next challenger.",
      "Spectators see both boards (shots only, no hidden ships) until the game ends.",
    ],
    timer: "Placement 60, 90 or 120 seconds (default 90); missing fleets are placed randomly. Turn timer Off, 20, 30 or 60 s (default 30); a timeout fires a random shot, and a second timeout loses the game.",
    ending: "Sink all five enemy ships to win. Resigning, leaving, or two turn timeouts forfeits the game. There are no draws.",
  },
});
