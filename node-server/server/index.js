const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const config = require('./config');
const rooms = require('./rooms');
const alpha = require('./alpha');

// Throws (and the process exits) if alpha mode is on without a usable secret.
const alphaCfg = alpha.readConfig();
const gate = alphaCfg.enabled ? alpha.createGate(alphaCfg.secret) : null;

const app = express();
app.disable('x-powered-by');
if (gate) {
  app.set('trust proxy', 1); // host terminates HTTPS; needed for req.secure and per-IP limits
  app.use(express.urlencoded({ extended: false, limit: '1kb' }));
  app.use(gate.middleware);
}
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 64 * 1024,
  ...(gate ? { allowRequest: gate.allowRequest } : {}),
});

const PUBLIC = path.join(__dirname, '..', 'public');
const template = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');

// One page per game so each can rank on Google for its own searches.
const PAGES = {
  '/': {
    title: `${config.SITE_NAME} - Free party games with friends, no account`,
    desc: 'Play Draw & Guess and 4 in a Row with friends in your browser. Make a lobby, share the link, play in seconds. No sign up.',
    game: '',
  },
  '/draw-and-guess': {
    title: `Draw & Guess - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Free online drawing and guessing game. One player draws, everyone else races to guess. Private rooms with custom words, no account.',
    game: 'drawguess',
  },
  '/four-in-a-row': {
    title: `4 in a Row - Play online with a friend | ${config.SITE_NAME}`,
    desc: 'Play 4 in a Row online against a friend. Send a link and play in seconds. Free, no download, no account.',
    game: 'fourrow',
  },
  '/word-chain': {
    title: `Word Chain - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Chain words by their last letter. Each word must start with the last letter of the one before. Free, no account.',
    game: 'wordchain',
  },
  '/categories-rush': {
    title: `Categories Rush - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Fill in categories for a letter before time runs out. Unique answers score more. Free, no account.',
    game: 'categories',
  },
  '/higher-or-lower': {
    title: `Higher or Lower - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Guess whether the next card is higher or lower and build a streak. Free multiplayer, no account.',
    game: 'higherlower',
  },
  '/color-stack': {
    title: `Color Stack - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Match colors and numbers and be first to empty your hand. Free multiplayer card game, no account.',
    game: 'colorstack',
  },
  '/go-fish': {
    title: `Go Fish - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Ask for ranks, fish from the deck and collect books. Free multiplayer card game, no account.',
    game: 'gofish',
  },
  '/tic-tac-toe': {
    title: `Tic Tac Toe - Play online with a friend | ${config.SITE_NAME}`,
    desc: 'Classic Tic Tac Toe online. Send a link and play in seconds, with spectators and rematches. Free, no account.',
    game: 'tictactoe',
  },
  '/rock-paper-scissors': {
    title: `Rock Paper Scissors Tournament - Play online | ${config.SITE_NAME}`,
    desc: 'Run a Rock Paper Scissors bracket with up to 16 friends. Private picks, byes and best-of rounds. Free, no account.',
    game: 'rps',
  },
  '/dots-and-boxes': {
    title: `Dots & Boxes - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Draw lines, claim boxes and take extra turns in Dots & Boxes for 2 to 4 players. Free, no account.',
    game: 'dotsboxes',
  },
  '/word-scramble': {
    title: `Word Scramble - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Race friends to unscramble words. Faster answers score more. Free multiplayer word game, no account.',
    game: 'wordscramble',
  },
  '/trivia-blitz': {
    title: `Trivia Blitz - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Fast multiple-choice trivia across categories. Speed and accuracy score. Free multiplayer, no account.',
    game: 'trivia',
  },
  '/drawing-telephone': {
    title: `Drawing Telephone - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Write, draw and guess in a chain and watch the prompt change. Free multiplayer party game, no account.',
    game: 'telephone',
  },
  '/bluff-battle': {
    title: `Bluff Battle - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Invent fake answers, vote anonymously and spot the truth. Free multiplayer bluffing game, no account.',
    game: 'bluff',
  },
  '/the-impostor': {
    title: `The Impostor - Play online with friends | ${config.SITE_NAME}`,
    desc: 'One player does not know the secret word. Give clues, discuss and vote. Free social deduction game, no account.',
    game: 'impostor',
  },
  '/liars-dice': {
    title: `Liar's Dice - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Hidden dice, bold bids and bluffs. Last player with dice wins. Free multiplayer, no account.',
    game: 'liarsdice',
  },
  '/hot-potato': {
    title: `Hot Potato - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Answer fast to pass the bomb before it blows. Free multiplayer party game, no account.',
    game: 'hotpotato',
  },
  '/battleship': {
    title: `Battleship - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Hide your fleet, call your shots and sink the enemy ships. Free two-player Battleship online, no account.',
    game: 'battleship',
  },
  '/checkers': {
    title: `Checkers - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Classic Checkers with forced captures, multi-jumps and kings. Free two-player game online, no account.',
    game: 'checkers',
  },
  '/reversi': {
    title: `Reversi - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Flank and flip discs in Reversi (Othello). Free two-player strategy game online, no account.',
    game: 'reversi',
  },
  '/ludo': {
    title: `Ludo - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Roll the dice, race four tokens home and send rivals back to the yard. Free Ludo for 2 to 4 players, no account.',
    game: 'ludo',
  },
  '/chess': {
    title: `Chess - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Play Chess online with a friend, with clocks, draw offers and full rules. Free, no account.',
    game: 'chess',
  },
  '/pool': {
    title: `Pool - Play 8-ball online with friends | ${config.SITE_NAME}`,
    desc: 'Aim, power up and clear your balls before your opponent in two-player 8-ball. Free online pool, no account.',
    game: 'pool',
  },
  '/mini-golf': {
    title: `Mini Golf - Play online with friends | ${config.SITE_NAME}`,
    desc: 'Putt through 18 original mini golf holes with friends: bumpers, sand and water. Free multiplayer game, no account.',
    game: 'golf',
  },
  '/property-tycoon': {
    title: `Property Tycoon - Buy, trade and build with friends | ${config.SITE_NAME}`,
    desc: 'Buy properties, trade with friends, build upgrades and bankrupt your rivals. Free property trading game for 2 to 6 players, no account.',
    game: 'tycoon',
  },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
function render(page) {
  return template
    .replace(/%TITLE%/g, esc(page.title))
    .replace(/%DESC%/g, esc(page.desc))
    .replace(/%SITE%/g, esc(config.SITE_NAME))
    .replace(/%GAME%/g, page.game);
}
const rendered = {};
for (const [p, page] of Object.entries(PAGES)) rendered[p] = render(page);

for (const p of Object.keys(PAGES)) app.get(p, (req, res) => res.set('Cache-Control', 'no-store').type('html').send(rendered[p]));
app.get('/r/:code', (req, res) => res.set('Cache-Control', 'no-store').type('html').send(rendered['/']));
app.get('/api/rooms', (req, res) => res.json(rooms.listPublic()));
app.get('/healthz', (req, res) => res.send('ok'));
app.use(express.static(PUBLIC, { index: false, maxAge: '1h', setHeaders(res, filePath) {
  if (/\.(?:js|css)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-store');
} }));
app.use((req, res) => res.status(404).type('html').send(rendered['/']));

rooms.attach(io);

server.listen(config.PORT, () => {
  console.log(`${config.SITE_NAME} running on http://localhost:${config.PORT}`);
});
