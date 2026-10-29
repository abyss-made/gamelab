// Liar's Dice: each player secretly rolls dice, then players take turns raising a bid on how many
// dice of one face are on the whole table, or call "liar". Dice are rolled and kept on the server and
// only shown to their owner until a challenge reveals them.
const { randInt } = require('./socialutil');

const meta = { id: 'liarsdice', name: "Liar's Dice", minPlayers: 2, maxPlayers: 8, midJoin: false, resetScores: true, scoreLabel: 'dice' };

const DICE = [3, 5];
const TURN_TIMES = [20, 30, 60];
const defaults = { dice: 5, turnTime: 30, wild: true };
const REVEAL_MS = 7000;
const IDLE_LIMIT = 3;

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (DICE.includes(s.dice)) o.dice = s.dice;
  if (TURN_TIMES.includes(s.turnTime)) o.turnTime = s.turnTime;
  if (typeof s.wild === 'boolean') o.wild = s.wild;
  return o;
}

function create(settings) {
  return { settings: { ...settings }, players: [], turn: 0, bid: null, bidderIdx: -1, round: 0, phase: 'bid', deadline: 0, over: false, reveal: null };
}

const alive = (st) => st.players.filter((p) => p.dice.length > 0);
const totalDice = (st) => alive(st).reduce((n, p) => n + p.dice.length, 0);

function start(st, api) {
  st.players = api.seated().map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, dice: Array.from({ length: st.settings.dice }, () => 0), idle: 0, out: false }));
  st.turn = randInt(st.players.length);
  api.sys("Liar's Dice: bid on the dice across the whole table, or call the last bidder a liar.", 'accent');
  newRound(st, api);
}

function roll(p) {
  p.dice = p.dice.map(() => 1 + randInt(6));
}

function newRound(st, api) {
  st.round++;
  st.bid = null;
  st.bidderIdx = -1;
  st.reveal = null;
  st.phase = 'bid';
  for (const p of alive(st)) roll(p);
  st.deadline = st.settings.turnTime ? api.now() + st.settings.turnTime * 1000 : 0;
  syncScores(st, api);
  api.changed();
}

function syncScores(st, api) {
  for (const p of st.players) {
    const m = api.member(p.id);
    if (m) m.score = p.dice.length;
  }
}

function nextAlive(st, from) {
  const n = st.players.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (st.players[i].dice.length > 0) return i;
  }
  return from;
}

const higher = (bid, prev) => !prev || bid.qty > prev.qty || (bid.qty === prev.qty && bid.face > prev.face);

function passTurn(st, api) {
  st.turn = nextAlive(st, st.turn);
  st.deadline = st.settings.turnTime ? api.now() + st.settings.turnTime * 1000 : 0;
}

function onAction(st, m, a, api) {
  if (st.over || st.phase !== 'bid' || !a || typeof a !== 'object') return;
  const i = st.players.findIndex((p) => p.id === m.id);
  if (i < 0 || i !== st.turn) return; // acting out of turn is ignored
  const p = st.players[i];
  if (a.type === 'bid') {
    const qty = a.qty;
    const face = a.face;
    if (!Number.isInteger(qty) || !Number.isInteger(face) || face < 1 || face > 6 || qty < 1 || qty > totalDice(st)) return;
    const bid = { qty, face };
    if (!higher(bid, st.bid)) return;
    p.idle = 0;
    st.bid = bid;
    st.bidderIdx = i;
    passTurn(st, api);
    api.changed();
  } else if (a.type === 'challenge') {
    if (!st.bid) return;
    p.idle = 0;
    challenge(st, api, i);
  }
}

function challenge(st, api, challengerIdx) {
  const { qty, face } = st.bid;
  let count = 0;
  for (const p of alive(st)) for (const d of p.dice) if (d === face || (st.settings.wild && face !== 1 && d === 1)) count++;
  const bidder = st.players[st.bidderIdx];
  const challenger = st.players[challengerIdx];
  const bidHeld = count >= qty;
  const loser = bidHeld ? challenger : bidder;
  st.reveal = {
    bid: st.bid, count, bidderId: bidder.id, challengerId: challenger.id, loserId: loser.id, bidHeld,
    hands: alive(st).map((p) => ({ id: p.id, dice: p.dice.slice() })),
  };
  loser.dice.pop();
  st.phase = 'reveal';
  st.deadline = api.now() + REVEAL_MS;
  st.nextStarter = loser.dice.length > 0 ? st.players.indexOf(loser) : nextAlive(st, st.players.indexOf(loser));
  if (loser.dice.length === 0) {
    api.sys(`${loser.name} is out of dice!`, 'warn');
  }
  syncScores(st, api);
  api.changed();
}

function finish(st, api, forfeit) {
  if (st.over) return;
  st.over = true;
  const left = alive(st);
  const winner = left.length === 1 ? left[0] : null;
  const standings = st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, dice: p.dice.length, out: p.dice.length === 0 })).sort((x, y) => y.dice - x.dice);
  if (winner) api.sys(`${winner.name} wins!`, 'good');
  api.end({ type: 'liarsdice', winnerId: winner ? winner.id : null, winners: winner ? [winner.id] : [], tie: false, standings, rounds: st.round, forfeit: !!forfeit });
}

function tick(st, api, now) {
  if (st.over || !st.deadline || now < st.deadline) return;
  if (st.phase === 'reveal') {
    if (alive(st).length <= 1) return finish(st, api);
    st.turn = st.players[st.nextStarter].dice.length > 0 ? st.nextStarter : nextAlive(st, st.nextStarter);
    return newRound(st, api);
  }
  // Out of time: open with the lowest bid, or call the standing bid.
  const p = st.players[st.turn];
  p.idle++;
  if (p.idle >= IDLE_LIMIT) {
    api.sys(`${p.name} was away too long and is out.`, 'warn');
    return eliminate(st, api, p);
  }
  if (!st.bid) {
    st.bid = { qty: 1, face: 2 };
    st.bidderIdx = st.turn;
    passTurn(st, api);
    return api.changed();
  }
  challenge(st, api, st.turn);
}

// Removes a player from play (idle or left) and keeps the round consistent.
function eliminate(st, api, p) {
  const i = st.players.indexOf(p);
  p.dice = [];
  p.out = true;
  syncScores(st, api);
  if (alive(st).length <= 1) return finish(st, api, true);
  if (st.phase === 'reveal') return api.changed();
  if (i === st.bidderIdx) {
    // The standing bid belongs to nobody now; start the round over with fresh dice.
    api.sys('The bidder left, so this round is re-rolled.', 'warn');
    st.turn = nextAlive(st, i);
    return newRound(st, api);
  }
  if (i === st.turn) passTurn(st, api);
  api.changed();
}

function onLeave(st, id, api) {
  if (st.over) return;
  const p = st.players.find((x) => x.id === id);
  if (!p || p.out) return;
  api.sys(`${p.name} left.`, 'warn');
  eliminate(st, api, p);
}

function view(st, m, now) {
  const me = st.players.find((p) => p.id === m.id);
  return {
    phase: st.phase,
    round: st.round,
    wild: st.settings.wild,
    players: st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, diceCount: p.dice.length, out: p.dice.length === 0 })),
    turnId: st.phase === 'bid' ? st.players[st.turn].id : null,
    bid: st.bid,
    bidderId: st.bid ? st.players[st.bidderIdx].id : null,
    totalDice: totalDice(st),
    // Your own dice only. Everyone's dice appear in `reveal`, and only after a challenge resolves it.
    myDice: me && st.phase === 'bid' ? me.dice : me && st.reveal ? (st.reveal.hands.find((h) => h.id === me.id) || { dice: [] }).dice : [],
    reveal: st.phase === 'reveal' ? st.reveal : null,
    timeLeft: st.deadline ? Math.max(0, st.deadline - now) : 0,
    totalTime: st.phase === 'reveal' ? REVEAL_MS : st.settings.turnTime * 1000,
    myIndex: st.players.findIndex((p) => p.id === m.id),
  };
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view };
