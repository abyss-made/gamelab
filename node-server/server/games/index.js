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
  require('./pool'),
  require('./golf'),
  require('./tycoon'),
];

const GAMES = {};
for (const g of list) GAMES[g.meta.id] = g;

// Hidden games stay registered so a room already playing one keeps working, but nobody can
// pick one for a new room, quick play, a game switch or a next-game vote.
const HIDDEN = new Set(require('../config').HIDDEN_GAMES.filter((id) => GAMES[id]));
const selectable = (id) => typeof id === 'string' && Object.hasOwn(GAMES, id) && !HIDDEN.has(id);

module.exports = { GAMES, HIDDEN, selectable };
