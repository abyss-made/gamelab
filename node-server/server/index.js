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
