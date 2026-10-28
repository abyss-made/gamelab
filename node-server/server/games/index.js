// Every game plugs in here. To add a game: write a module with the same
// exports as drawguess.js or fourrow.js and add it to this list.
const list = [
  require('./drawguess'),
  require('./fourrow'),
  require('./wordchain'),
  require('./categories'),
  require('./higherlower'),
  require('./colorstack'),
  require('./gofish'),
  require('./tictactoe'),
  require('./rps'),
  require('./dotsboxes'),
  require('./wordscramble'),
  require('./trivia'),
  require('./telephone'),
  require('./bluff'),
  require('./impostor'),
  require('./liarsdice'),
  require('./hotpotato'),
  require('./battleship'),
  require('./checkers'),
  require('./reversi'),
  require('./ludo'),
  require('./chess'),
];

const GAMES = {};
for (const g of list) GAMES[g.meta.id] = g;

module.exports = { GAMES };
