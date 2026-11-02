// Playgrid bots: rule-based, deterministic given a seeded rng, no network or AI calls.
// A bot is a normal room member (bot: true, no socket) that sits in a seat. Each room-loop pass the
// driver asks supported games' strategies whether it is the bot's turn and, after a short "thinking"
// delay, sends the action through the game's own onAction, so server validation, turn order and
// timers apply to bots exactly as they do to people.
const crypto = require('crypto');
const config = require('../config');
const boards = require('./boards');

const DIFFICULTIES = ['easy', 'normal', 'hard'];

// Compatibility matrix (documented in docs/playgrid-3-3-bots.md). `level` is shown in the lobby.
//   full    - plays the whole game with difficulty levels
//   limited - plays, but with a simpler behaviour than a person (see note)
// Anything not listed is unsupported: Add Bot is disabled with the reason below.
const SUPPORT = {
  tictactoe: { strategy: boards.tictactoe, level: 'full', difficulties: DIFFICULTIES, note: 'Easy plays mostly at random, Hard never loses.' },
  fourrow: { strategy: boards.fourrow, level: 'full', difficulties: DIFFICULTIES, note: 'Search depth grows with difficulty.' },
  dotsboxes: { strategy: boards.dotsboxes, level: 'full', difficulties: DIFFICULTIES, note: 'Takes free boxes; Normal and Hard avoid giving boxes away.' },
  checkers: { strategy: boards.checkers, level: 'full', difficulties: DIFFICULTIES, note: 'Alpha-beta search; follows forced captures and multi-jumps.' },
  chess: { strategy: boards.chess, level: 'limited', difficulties: DIFFICULTIES, note: 'Shallow search (material and position). It ignores draw offers and never offers or resigns.' },
  rps: { strategy: boards.rps, level: 'limited', difficulties: ['normal'], note: 'Throws are random and private; the bot never sees other picks.' },
};

const UNSUPPORTED_REASON = {
  drawguess: "Bots can't draw or guess meaningfully yet.",
  telephone: "Bots can't write or draw prompts yet.",
  bluff: "Bots can't invent convincing bluffs yet.",
  impostor: "Bots can't give or judge clues yet.",
  battleship: 'Bot support for Battleship is not built yet.',
  ludo: 'Bot support for Ludo is not built yet.',
  colorstack: 'Bot support for Color Stack is not built yet.',
  gofish: 'Bot support for Go Fish is not built yet.',
  wordscramble: 'Bots would need the answer, which would be cheating.',
  wordchain: 'Bot support for Word Chain is not built yet.',
  categories: 'Bots would need to type real category answers.',
  trivia: 'Bots would need the answer key, which would be cheating.',
  pool: 'Bot support for Pool is not built yet.',
  golf: 'Bot support for Mini Golf is not built yet.',
  tycoon: 'Bot support for Property Tycoon is not built yet.',
};

const supported = (gameId) => Object.hasOwn(SUPPORT, gameId);
function info(gameId) {
  if (!gameId) return { supported: false, reason: 'Choose a game first.' };
  if (!supported(gameId)) return { supported: false, reason: UNSUPPORTED_REASON[gameId] || 'Bots are not available for this game.' };
  const s = SUPPORT[gameId];
  return { supported: true, level: s.level, difficulties: s.difficulties, note: s.note };
}

const NAMES = ['Pixel', 'Turbo', 'Nova', 'Widget', 'Gizmo', 'Sprocket', 'Zippy', 'Bolt', 'Cobalt', 'Ember', 'Quark', 'Rivet'];
function botName(taken) {
  const free = NAMES.filter((n) => !taken.has(`${n} Bot`));
  const n = free.length ? free[Math.floor(Math.random() * free.length)] : `Bot ${taken.size + 1}`;
  return free.length ? `${n} Bot` : n;
}

function createBot(gameId, taken, difficulty) {
  const s = SUPPORT[gameId];
  const d = s.difficulties.includes(difficulty) ? difficulty : s.difficulties.includes('normal') ? 'normal' : s.difficulties[0];
  const now = Date.now();
  return {
    id: crypto.randomBytes(6).toString('hex'),
    token: null, // never matches a joining player's token
    name: botName(taken),
    avatar: { e: Math.floor(Math.random() * config.AVATAR_EMOJIS), c: Math.floor(Math.random() * config.AVATAR_COLORS) },
    socketId: null,
    connected: true,
    bot: true,
    difficulty: d,
    lastSeen: now,
    lastActive: now,
    score: 0,
    role: 'player',
    ready: true,
    armedAt: 0,
  };
}

const delay = () => {
  const lo = config.BOT_DELAY_MIN_MS;
  const hi = Math.max(lo, config.BOT_DELAY_MAX_MS);
  return lo + Math.random() * (hi - lo);
};

// Called from the room loop for rooms in a game. Only runs while a person is connected, so a room
// with nobody watching does no bot work. One action per bot per pass.
function drive(room, G, now) {
  // Test speed (BOT_DELAY_MS=0) lets bots take several turns per pass; normal play is one action per pass.
  const rounds = config.BOT_DELAY_MAX_MS === 0 ? 8 : 1;
  for (let i = 0; i < rounds; i++) if (!driveOnce(room, G, now)) break;
}

function driveOnce(room, G, now) {
  const S = SUPPORT[room.gameId];
  if (!S) return false;
  const bots = room.seats.map((id) => room.members.get(id)).filter((m) => m && m.bot);
  if (!bots.length) return false;
  if (![...room.members.values()].some((m) => !m.bot && m.connected)) return false;
  let acted = false;
  for (const m of bots) {
    if (room.phase !== 'game' || !room.game) return acted;
    let ready = false;
    try {
      ready = S.strategy.ready(room.game, m);
    } catch (err) {
      console.error('bot ready error', room.gameId, err);
    }
    if (!ready) {
      m.armedAt = 0;
      continue;
    }
    if (!m.armedAt) {
      m.armedAt = now + delay();
      if (m.armedAt > now) continue;
    }
    if (now < m.armedAt) continue;
    m.armedAt = 0;
    try {
      const act = S.strategy.decide(room.game, m, { difficulty: m.difficulty, rng: Math.random });
      if (act) {
        G.onAction(room.game, m, act, room.api);
        acted = true;
      }
    } catch (err) {
      console.error('bot decide error', room.gameId, err);
    }
  }
  return acted;
}

module.exports = { SUPPORT, DIFFICULTIES, supported, info, createBot, drive };
