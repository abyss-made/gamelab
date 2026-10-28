// Color Stack: an original color/number matching and shedding-card game.
// Match the top card by color or symbol, use action cards to disrupt, and be first to empty your hand.
// The draw pile and everyone's hand stay on the server; players only see their own cards.
const { shuffle } = require('../util');

const meta = {
  id: 'colorstack',
  name: 'Color Stack',
  minPlayers: 2,
  maxPlayers: 8,
  midJoin: false,
  resetScores: true,
  scoreLabel: 'pts',
};

const TURN_TIMES = [0, 20, 30, 60];
const defaults = { turnTime: 30 };
const COLORS = ['r', 'b', 'g', 'y'];
const HAND = 7;
const IDLE_LIMIT = 3;
// Card values: '0'-'9' numbers, 'S' skip, 'F' flip (reverse), 'D' draw two, 'W' wild, '4' wild draw four.

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (s && typeof s === 'object' && TURN_TIMES.includes(s.turnTime)) o.turnTime = s.turnTime;
  return o;
}

function buildDeck() {
  const cards = [];
  let id = 0;
  const add = (c, v) => cards.push({ id: id++, c, v });
  for (const c of COLORS) {
    add(c, '0');
    for (let n = 1; n <= 9; n++) {
      add(c, String(n));
      add(c, String(n));
    }
    for (const v of ['S', 'F', 'D']) {
      add(c, v);
      add(c, v);
    }
  }
  for (let i = 0; i < 4; i++) {
    add('w', 'W');
    add('w', '4');
  }
  return cards;
}

function points(card) {
  if (card.c === 'w') return 50;
  if (/\d/.test(card.v)) return Number(card.v);
  return 20;
}

function canPlay(card, top, color) {
  return card.c === 'w' || card.c === color || card.v === top.v;
}

function create(settings) {
  return { settings: { ...settings }, players: [], deck: [], discard: [], color: 'r', dir: 1, turn: 0, drawn: null, deadline: 0, over: false, last: null };
}

function start(st, api) {
  const ps = api.seated();
  const shift = api.gameCount() % ps.length;
  const ordered = ps.slice(shift).concat(ps.slice(0, shift));
  st.players = ordered.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, hand: [], idle: 0, out: false }));
  st.deck = shuffle(buildDeck());
  for (const p of st.players) for (let i = 0; i < HAND; i++) p.hand.push(st.deck.pop());
  // The first face-up card is always a plain number card.
  let i = st.deck.findIndex((c) => /^\d$/.test(c.v) && c.c !== 'w');
  const first = st.deck.splice(i, 1)[0];
  st.discard = [first];
  st.color = first.c;
  resetClock(st, api);
  api.sys(`${st.players[0].name} goes first.`, 'accent');
  api.changed();
}

function resetClock(st, api) {
  st.deadline = st.settings.turnTime ? api.now() + st.settings.turnTime * 1000 : 0;
}

const top = (st) => st.discard[st.discard.length - 1];
const activeP = (st) => st.players.filter((p) => !p.out);

function drawCards(st, p, n) {
  let got = 0;
  for (let k = 0; k < n; k++) {
    if (!st.deck.length && st.discard.length > 1) {
      const keep = st.discard.pop();
      st.deck = shuffle(st.discard);
      st.discard = [keep];
    }
    if (!st.deck.length) break; // nothing left to draw
    p.hand.push(st.deck.pop());
    got++;
  }
  return got;
}

function step(st, from, n) {
  const len = st.players.length;
  let idx = from;
  let left = n;
  while (left > 0) {
    idx = (idx + st.dir + len) % len;
    if (!st.players[idx].out) left--;
  }
  return idx;
}

function advance(st, api, skip = 0) {
  st.turn = step(st, st.turn, 1 + skip);
  st.drawn = null;
  resetClock(st, api);
  api.changed();
}

function onAction(st, m, a, api) {
  if (st.over || !a) return;
  const p = st.players[st.turn];
  if (!p || p.id !== m.id || p.out) return;
  if (a.type === 'play') return play(st, p, a, api);
  if (a.type === 'draw') return doDraw(st, p, api);
  if (a.type === 'pass') {
    if (st.drawn === null) return; // you can only pass after drawing
    p.idle = 0;
    api.sys(`${p.name} passed.`);
    advance(st, api);
  }
}

function play(st, p, a, api) {
  const card = p.hand.find((c) => c.id === a.card);
  if (!card) return;
  if (st.drawn !== null && st.drawn !== card.id) return; // after drawing you may only play that card
  if (!canPlay(card, top(st), st.color)) return;
  let color = card.c;
  if (card.c === 'w') {
    if (!COLORS.includes(a.color)) return; // wild cards need a color chosen
    color = a.color;
  }
  p.hand = p.hand.filter((c) => c.id !== card.id);
  st.discard.push(card);
  st.color = color;
  p.idle = 0;
  st.last = { by: p.id, card };
  if (p.hand.length === 0) return finish(st, api, p);
  if (p.hand.length === 1) api.sys(`${p.name} has one card left!`, 'accent');
  const players = activeP(st);
  let skip = 0;
  if (card.v === 'F') {
    if (players.length === 2) skip = 1;
    else st.dir = -st.dir;
  } else if (card.v === 'S') {
    skip = 1;
  } else if (card.v === 'D' || card.v === '4') {
    const victim = st.players[step(st, st.turn, 1)];
    const n = card.v === 'D' ? 2 : 4;
    drawCards(st, victim, n);
    api.sys(`${victim.name} draws ${n} and loses a turn.`, 'warn');
    skip = 1;
  }
  advance(st, api, skip);
}

function doDraw(st, p, api) {
  if (st.drawn !== null) return; // one draw per turn
  const got = drawCards(st, p, 1);
  if (!got) {
    api.sys('The draw pile is empty, so the turn passes.');
    return advance(st, api);
  }
  const card = p.hand[p.hand.length - 1];
  if (canPlay(card, top(st), st.color)) {
    st.drawn = card.id; // may play it or pass
    resetClock(st, api);
    api.changed();
  } else advance(st, api);
}

function finish(st, api, winner, forfeit) {
  if (st.over) return;
  st.over = true;
  let pts = 0;
  const hands = st.players.map((p) => {
    const v = p.hand.reduce((s, c) => s + points(c), 0);
    if (p !== winner) pts += v;
    return { id: p.id, name: p.name, avatar: p.avatar, cards: p.hand.length, value: v };
  });
  const m = api.member(winner.id);
  if (m) m.score += pts;
  api.sys(`${winner.name} wins the hand and scores ${pts} points!`, 'good');
  api.end({ type: 'colorstack', winnerId: winner.id, pts, hands, forfeit: !!forfeit });
}

function removePlayer(st, p, api, why) {
  p.out = true;
  st.deck = shuffle(st.deck.concat(p.hand));
  p.hand = [];
  api.sys(`${p.name} ${why}.`, 'warn');
}

function afterRemoval(st, api, wasTurn) {
  const left = activeP(st);
  if (left.length < 2) {
    // The last player standing wins by default.
    return finish(st, api, left[0], true);
  }
  if (wasTurn) {
    st.turn = step(st, st.turn, 1);
    st.drawn = null;
    resetClock(st, api);
  }
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
  api.sys(`${p.name} ran out of time.`, 'warn');
  if (st.drawn === null) doDraw(st, p, api); // advances by itself if the card can't be played
  if (!st.over && st.players[st.turn] === p) advance(st, api);
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
  const t = top(st);
  const mine = me ? me.hand.slice().sort((a, b) => (a.c + a.v).localeCompare(b.c + b.v)) : null;
  return {
    players: st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, count: p.hand.length, out: p.out })),
    top: t,
    color: st.color,
    dir: st.dir,
    turnId: cur ? cur.id : null,
    deckCount: st.deck.length,
    hand: mine, // spectators get null; nobody else's cards are ever sent
    playable: mine && cur && cur.id === m.id ? mine.filter((c) => (st.drawn === null || c.id === st.drawn) && canPlay(c, t, st.color)).map((c) => c.id) : [],
    drawn: cur && cur.id === m.id ? st.drawn : null,
    last: st.last,
    timeLeft: st.deadline ? Math.max(0, st.deadline - now) : null,
    totalTime: st.settings.turnTime * 1000,
    myIndex: st.players.findIndex((p) => p.id === m.id),
  };
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view, buildDeck, canPlay };
