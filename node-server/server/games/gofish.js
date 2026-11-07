// Go Fish: ask an opponent for a rank you hold. Collect all four of a rank to make a book.
// The deck and every hand stay on the server; players see only their own cards.
const { shuffle } = require('../util');

const meta = {
  id: 'gofish',
  name: 'Go Fish',
  minPlayers: 2,
  maxPlayers: 6,
  midJoin: false,
  resetScores: true,
  scoreLabel: 'books',
};

const TURN_TIMES = [0, 20, 30, 60];
const defaults = { turnTime: 30 };
const IDLE_LIMIT = 3;
const RANK_NAMES = { 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace' };
const rankName = (r) => RANK_NAMES[r] || String(r);

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (s && typeof s === 'object' && TURN_TIMES.includes(s.turnTime)) o.turnTime = s.turnTime;
  return o;
}

function create(settings) {
  return { settings: { ...settings }, players: [], deck: [], turn: 0, log: [], deadline: 0, over: false };
}

function logLine(st, text) {
  st.log.push(text);
  if (st.log.length > 8) st.log.shift();
}

function start(st, api) {
  const ps = api.seated();
  const shift = api.gameCount() % ps.length;
  const ordered = ps.slice(shift).concat(ps.slice(0, shift));
  st.players = ordered.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, hand: [], books: [], idle: 0, out: false }));
  const deck = [];
  for (const s of ['S', 'H', 'D', 'C']) for (let r = 2; r <= 14; r++) deck.push({ r, s });
  st.deck = shuffle(deck);
  const n = ps.length <= 3 ? 7 : 5;
  for (const p of st.players) for (let i = 0; i < n; i++) p.hand.push(st.deck.pop());
  for (const p of st.players) layBooks(st, p, api);
  resetClock(st, api);
  api.sys(`${st.players[0].name} asks first.`, 'accent');
  settleTurn(st, api);
  api.changed();
}

function resetClock(st, api) {
  st.deadline = st.settings.turnTime ? api.now() + st.settings.turnTime * 1000 : 0;
}

const activeP = (st) => st.players.filter((p) => !p.out);
const totalBooks = (st) => st.players.reduce((n, p) => n + p.books.length, 0);

function layBooks(st, p, api) {
  const counts = {};
  for (const c of p.hand) counts[c.r] = (counts[c.r] || 0) + 1;
  for (const r of Object.keys(counts)) {
    if (counts[r] === 4) {
      p.hand = p.hand.filter((c) => c.r !== Number(r));
      p.books.push(Number(r));
      const m = api.member(p.id);
      if (m) m.score = p.books.length;
      logLine(st, `${p.name} made a book of ${rankName(Number(r))}s.`);
    }
  }
}

function nextIdx(st, from) {
  const len = st.players.length;
  for (let i = 1; i <= len; i++) {
    const idx = (from + i) % len;
    if (!st.players[idx].out) return idx;
  }
  return from;
}

// Make sure the player to act can actually ask someone. A player with no cards, or with
// nobody left to ask, draws a card if the deck has one; otherwise the turn passes.
function settleTurn(st, api) {
  for (let guard = 0; guard < 200 && !st.over; guard++) {
    const withCards = activeP(st).filter((p) => p.hand.length);
    if (totalBooks(st) >= 13 || (st.deck.length === 0 && withCards.length <= 1)) return finish(st, api);
    const p = st.players[st.turn];
    const canAsk = () => p.hand.length > 0 && activeP(st).some((x) => x !== p && x.hand.length);
    if (canAsk()) return;
    if (st.deck.length) {
      p.hand.push(st.deck.pop());
      layBooks(st, p, api);
      logLine(st, `${p.name} had no one to ask and drew a card.`);
      if (canAsk()) return;
    }
    st.turn = nextIdx(st, st.turn);
    resetClock(st, api);
  }
}

function onAction(st, m, a, api) {
  if (st.over || !a || a.type !== 'ask') return;
  const p = st.players[st.turn];
  if (!p || p.id !== m.id || p.out) return;
  const target = st.players.find((x) => x.id === a.target);
  const rank = Number(a.rank);
  if (!target || target === p || target.out || !target.hand.length) return;
  if (!Number.isInteger(rank) || !p.hand.some((c) => c.r === rank)) return; // must hold the rank you ask for
  ask(st, p, target, rank, api);
}

function ask(st, p, target, rank, api) {
  p.idle = 0;
  const got = target.hand.filter((c) => c.r === rank);
  let again;
  if (got.length) {
    target.hand = target.hand.filter((c) => c.r !== rank);
    p.hand.push(...got);
    logLine(st, `${p.name} asked ${target.name} for ${rankName(rank)}s and got ${got.length}.`);
    layBooks(st, p, api);
    layBooks(st, target, api);
    again = true;
  } else {
    logLine(st, `${p.name} asked ${target.name} for ${rankName(rank)}s. Go Fish!`);
    again = false;
    if (st.deck.length) {
      const c = st.deck.pop();
      p.hand.push(c);
      if (c.r === rank) {
        logLine(st, `${p.name} fished the ${rankName(rank)} they wanted and goes again.`);
        again = true;
      }
      layBooks(st, p, api);
    }
  }
  if (!again) st.turn = nextIdx(st, st.turn);
  resetClock(st, api);
  settleTurn(st, api);
  api.changed();
}

function finish(st, api, forfeit) {
  if (st.over) return;
  st.over = true;
  const standings = st.players
    .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, books: p.books.slice().sort((x, y) => x - y), left: p.out }))
    .sort((x, y) => (x.left - y.left) || (y.books.length - x.books.length));
  const eligible = standings.filter((s) => !s.left);
  const top = eligible[0] ? eligible[0].books.length : 0;
  const winners = eligible.filter((s) => s.books.length === top).map((s) => s.id);
  api.sys(winners.length > 1 ? 'It ends in a tie!' : `${eligible[0].name} wins with ${top} books!`, 'good');
  api.end({ type: 'gofish', winnerId: winners[0] || null, winners, tie: winners.length > 1, standings, forfeit: !!forfeit });
}

function removePlayer(st, p, api, why) {
  p.out = true;
  st.deck = shuffle(st.deck.concat(p.hand.map((c) => ({ r: c.r, s: c.s }))));
  p.hand = [];
  api.sys(`${p.name} ${why}.`, 'warn');
}

function afterRemoval(st, api, wasTurn) {
  if (activeP(st).length < 2) return finish(st, api, true);
  if (wasTurn) {
    st.turn = nextIdx(st, st.turn);
    resetClock(st, api);
  }
  settleTurn(st, api);
  api.changed();
}

function tick(st, api, now) {
  if (st.over || !st.deadline || now < st.deadline) return;
  const p = st.players[st.turn];
  p.idle++;
  if (p.idle >= IDLE_LIMIT) {
    removePlayer(st, p, api, 'was away too long and is out');
    return afterRemoval(st, api, true);
  }
  const targets = activeP(st).filter((x) => x !== p && x.hand.length);
  if (!targets.length || !p.hand.length) {
    st.turn = nextIdx(st, st.turn);
    resetClock(st, api);
    settleTurn(st, api);
    return api.changed();
  }
  const t = targets[Math.floor(Math.random() * targets.length)];
  const c = p.hand[Math.floor(Math.random() * p.hand.length)];
  api.sys(`${p.name} ran out of time, so a random request was made.`, 'warn');
  const idle = p.idle;
  ask(st, p, t, c.r, api);
  p.idle = idle; // an automatic request doesn't count as activity
}

function onLeave(st, id, api) {
  if (st.over) return;
  const i = st.players.findIndex((p) => p.id === id);
  if (i < 0 || st.players[i].out) return;
  const wasTurn = i === st.turn;
  removePlayer(st, st.players[i], api, 'left');
  afterRemoval(st, api, wasTurn);
}

function view(st, m, now) {
  const me = st.players.find((p) => p.id === m.id);
  const cur = st.players[st.turn];
  const hand = me ? me.hand.slice().sort((a, b) => a.r - b.r || a.s.localeCompare(b.s)) : null;
  return {
    players: st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, count: p.hand.length, books: p.books.slice().sort((x, y) => x - y), out: p.out })),
    turnId: cur ? cur.id : null,
    deckCount: st.deck.length,
    hand, // spectators get null
    log: st.log.slice(),
    timeLeft: st.deadline ? Math.max(0, st.deadline - now) : null,
    totalTime: st.settings.turnTime * 1000,
    myIndex: st.players.findIndex((p) => p.id === m.id),
  };
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view };
