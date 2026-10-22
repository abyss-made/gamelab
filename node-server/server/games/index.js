// Every game plugs in here. To add a game: write a module with the same
// exports as drawguess.js or fourrow.js and add it to this list.
const list = [require('./drawguess'), require('./fourrow')];

const GAMES = {};
for (const g of list) GAMES[g.meta.id] = g;

module.exports = { GAMES };
