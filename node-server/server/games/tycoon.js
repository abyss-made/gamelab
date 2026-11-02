// Property Tycoon: an original Playgrid property trading game for 2-6 players on a 36-tile board
// (tycoonboard.js). All dice and shuffles use crypto.randomInt on the server.
//
// Rules used here:
//  - Everybody starts with the same cash on Launch Pad and takes turns: roll two dice and move. Passing or
//    landing on Launch Pad pays $200. Doubles roll again; three doubles in a row send you to Time Out.
//  - Landing on an unowned property, Skyline station or utility: BUY it at list price, or DECLINE and it goes to
//    AUCTION (everyone, including the decliner, may bid; open ascending bids, a bid extends the clock; no
//    bids means it stays unowned). If you can't afford it you can only decline.
//  - Rent: properties charge by upgrade level (owning a whole colour doubles the rent on bare lots); stations
//    charge $25 x 2^(owned-1); utilities charge 4x the dice total (10x with both).
//  - Upgrades (owner of a whole colour group, one level at a time, evenly across the group): Shop, Block, Tower,
//    Landmark. Selling a level refunds half. There are no mortgages.
//  - Time Out: pay $50, use a Get-out card, or roll doubles; on your third turn there you pay $50 and move.
//    Rent can still be collected while you are there.
//  - Surprise tiles draw from a shuffled 12-card deck.
//  - Trades: any two players can swap cash and properties. The offer does nothing until the other player
//    accepts it; either side can walk away. Properties in a colour group with upgrades can't be traded.
//  - Debt: if you can't pay, upgrades are sold off (half price) automatically; if you still can't pay you go
//    bankrupt, and everything you own goes to the player you owed (or back to the bank).
//  - The game ends when one player is left, or (Quick mode) after the chosen number of rounds, when the richest
//    player (cash + property prices + upgrade spending) wins. Classic mode has a 150-round safety cap.
const { randInt } = require('./socialutil');
const B = require('./tycoonboard');

const meta = { id: 'tycoon', name: 'Property Tycoon', minPlayers: 2, maxPlayers: 6, midJoin: false, resetScores: false, scoreLabel: 'wins' };

const TURN_TIMES = [30, 45, 60, 90];
const ROUND_CHOICES = [0, 10, 15, 25];
const CASH_CHOICES = [1000, 1500, 2000];
const defaults = { rounds: 15, startCash: 1500, turnTime: 45 };
const COLOURS = ['Red', 'Blue', 'Green', 'Gold', 'Violet', 'Teal'];
const MAX_ROUNDS = 150;
const IDLE_LIMIT = 3;
const AUCTION_START_MS = 15000;
const AUCTION_BID_MS = 8000;
const TRADE_TTL_MS = 120000;
const MAX_TRADE_PROPS = 8;
const LOG_LIMIT = 14;

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (ROUND_CHOICES.includes(s.rounds)) o.rounds = s.rounds;
  if (CASH_CHOICES.includes(s.startCash)) o.startCash = s.startCash;
  if (TURN_TIMES.includes(s.turnTime)) o.turnTime = s.turnTime;
  return o;
}

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function create(settings) {
  return {
    settings: { ...settings }, players: [], owner: B.TILES.map(() => -1), level: B.TILES.map(() => 0), turn: 0, round: 1,
    phase: 'roll', dice: [0, 0], doubles: 0, rollNo: 0, moved: null, deadline: 0, auction: null, trades: [], tradeSeq: 0,
    deck: [], card: null, log: [], over: false,
  };
}

const alive = (st) => st.players.filter((p) => !p.out);
const idxOf = (st, id) => st.players.findIndex((p) => p.id === id);
const cur = (st) => st.players[st.turn];

function note(st, api, text, style) {
  st.log.push(text);
  if (st.log.length > LOG_LIMIT) st.log.shift();
  api.sys(text, style);
}

function setDeadline(st, api) {
  st.deadline = api.now() + st.settings.turnTime * 1000;
}

function start(st, api) {
  const ms = api.seated().slice(0, meta.maxPlayers);
  st.players = shuffled(ms).map((m, i) => ({ id: m.id, name: m.name, avatar: m.avatar, colour: i, cash: st.settings.startCash, pos: 0, jail: 0, cards: 0, out: false, idle: 0 }));
  st.turn = 0;
  st.deck = [];
  note(st, api, `Property Tycoon: ${st.players.length} players, $${st.settings.startCash} each${st.settings.rounds ? `, ${st.settings.rounds} rounds` : ', last player standing'}. ${st.players[0].name} rolls first.`, 'accent');
  beginTurn(st, api);
}

function beginTurn(st, api) {
  st.phase = 'roll';
  st.doubles = 0;
  st.moved = null;
  setDeadline(st, api);
  api.changed();
}

// ---------- money ----------
const groupOwnedBy = (st, group, idx) => B.GROUP_TILES[group].every((t) => st.owner[t] === idx);
const ownedTiles = (st, idx) => B.TILES.map((_, i) => i).filter((i) => st.owner[i] === idx);
const upgradeSpend = (st, idx) => ownedTiles(st, idx).reduce((s, i) => s + st.level[i] * B.upgradeCost(B.TILES[i]), 0);
const netWorth = (st, idx) => st.players[idx].cash + ownedTiles(st, idx).reduce((s, i) => s + B.TILES[i].price, 0) + upgradeSpend(st, idx);

// Sells the highest upgrade level the player has (keeps groups even). Returns false if nothing to sell.
function sellOneLevel(st, idx) {
  let best = -1;
  for (const i of ownedTiles(st, idx)) if (st.level[i] > 0 && (best < 0 || st.level[i] > st.level[best])) best = i;
  if (best < 0) return false;
  st.level[best]--;
  st.players[idx].cash += Math.floor(B.upgradeCost(B.TILES[best]) / 2);
  return true;
}

// Moves `amount` from `from` to `to` (null = bank), selling upgrades or going bankrupt if short.
// Returns true if the payer survived.
function pay(st, api, from, to, amount, why) {
  if (amount <= 0) return true;
  const p = st.players[from];
  while (p.cash < amount && sellOneLevel(st, from)) { /* liquidate */ }
  if (p.cash >= amount) {
    p.cash -= amount;
    if (to !== null) st.players[to].cash += amount;
    return true;
  }
  const creditor = to;
  const paid = p.cash;
  if (creditor !== null) st.players[creditor].cash += paid;
  p.cash = 0;
  note(st, api, `${p.name} can't pay ${why} and goes bankrupt${creditor !== null ? `. Everything goes to ${st.players[creditor].name}` : ''}.`, 'warn');
  bankrupt(st, api, from, creditor);
  return false;
}

function bankrupt(st, api, idx, creditor) {
  const p = st.players[idx];
  for (const i of ownedTiles(st, idx)) {
    st.level[i] = 0;
    st.owner[i] = creditor !== null && !st.players[creditor].out ? creditor : -1;
  }
  if (creditor !== null && !st.players[creditor].out) st.players[creditor].cards += p.cards;
  p.cards = 0;
  p.cash = 0;
  p.out = true;
  st.trades = st.trades.filter((t) => t.from !== idx && t.to !== idx);
  if (st.auction && st.auction.passed.indexOf(idx) < 0) st.auction.passed.push(idx);
}

// ---------- movement and landing ----------
function moveBy(st, api, idx, steps) {
  const p = st.players[idx];
  const from = p.pos;
  const N = B.TILES.length;
  const raw = from + steps;
  p.pos = ((raw % N) + N) % N;
  if (steps > 0 && raw >= N) {
    p.cash += B.SALARY;
    note(st, api, `${p.name} passed Launch Pad and collected $${B.SALARY}.`, 'good');
  }
  st.moved = { id: p.id, from, to: p.pos, steps };
}

function moveTo(st, api, idx, tile, collect) {
  const p = st.players[idx];
  const from = p.pos;
  p.pos = tile;
  if (collect && tile <= from) {
    p.cash += B.SALARY;
    note(st, api, `${p.name} passed Launch Pad and collected $${B.SALARY}.`, 'good');
  }
  st.moved = { id: p.id, from, to: tile, steps: (tile - from + B.TILES.length) % B.TILES.length };
}

function goToTimeOut(st, api, idx) {
  const p = st.players[idx];
  const from = p.pos;
  p.pos = B.JAIL_POS;
  p.jail = 1;
  st.doubles = 0;
  st.moved = { id: p.id, from, to: B.JAIL_POS, steps: 0, jump: true };
  note(st, api, `${p.name} goes to Time Out.`, 'warn');
}

function rentFor(st, tile, dice) {
  const t = B.TILES[tile];
  const o = st.owner[tile];
  if (o < 0) return 0;
  if (t.type === 'prop') {
    const lvl = st.level[tile];
    const base = B.rentAt(t, lvl);
    return lvl === 0 && groupOwnedBy(st, t.group, o) ? base * 2 : base;
  }
  if (t.type === 'station') {
    const n = ownedTiles(st, o).filter((i) => B.TILES[i].type === 'station').length;
    return 25 * 2 ** (n - 1);
  }
  const n = ownedTiles(st, o).filter((i) => B.TILES[i].type === 'util').length;
  return (n >= 2 ? 10 : 4) * (dice[0] + dice[1]);
}

function drawCard(st) {
  if (!st.deck.length) {
    const held = st.players.reduce((s, p) => s + p.cards, 0);
    st.deck = shuffled(B.CARDS.map((c) => c[0]).filter((id) => id !== 'freecard' || held === 0));
  }
  return st.deck.pop();
}

function applyCard(st, api, idx, id, depth) {
  const p = st.players[idx];
  const text = B.CARDS.find((c) => c[0] === id)[1];
  st.card = { by: p.id, id, text };
  note(st, api, `${p.name} drew: ${text}`, 'accent');
  const others = () => st.players.map((_, i) => i).filter((i) => i !== idx && !st.players[i].out);
  switch (id) {
    case 'refund': p.cash += 50; break;
    case 'wallet': p.cash += 30; break;
    case 'fair': p.cash += 100; break;
    case 'repairs': {
      const levels = ownedTiles(st, idx).reduce((s, i) => s + st.level[i], 0);
      pay(st, api, idx, null, levels * 10, 'the repairs');
      break;
    }
    case 'launch': moveTo(st, api, idx, 0, false); p.cash += B.SALARY; break;
    case 'timeout': goToTimeOut(st, api, idx); break;
    case 'birthday':
      for (const o of others()) {
        if (!st.players[o].out && !pay(st, api, o, idx, 20, 'your birthday gift')) { /* bankrupt payer handled */ }
      }
      break;
    case 'party':
      for (const o of others()) {
        if (p.out) break;
        pay(st, api, idx, o, 15, 'the party');
      }
      break;
    case 'fwd3': moveBy(st, api, idx, 3); return landOn(st, api, depth + 1);
    case 'back3': moveBy(st, api, idx, -3); return landOn(st, api, depth + 1);
    case 'harbor': moveTo(st, api, idx, 6, true); return landOn(st, api, depth + 1);
    case 'freecard': p.cards++; break;
    default: break;
  }
  return undefined;
}

// Resolves the tile the current player is standing on. Sets st.phase to 'buy' when a decision is needed.
function landOn(st, api, depth = 0) {
  const idx = st.turn;
  const p = st.players[idx];
  if (p.out || depth > 2) return;
  const t = B.TILES[p.pos];
  st.card = depth === 0 ? null : st.card;
  switch (t.type) {
    case 'prop': case 'station': case 'util': {
      const o = st.owner[p.pos];
      if (o < 0) {
        st.phase = 'buy';
        setDeadline(st, api);
        return;
      }
      if (o !== idx) {
        const rent = rentFor(st, p.pos, st.dice);
        if (rent > 0) {
          note(st, api, `${p.name} pays $${rent} rent to ${st.players[o].name} for ${t.name}.`, undefined);
          pay(st, api, idx, o, rent, 'the rent');
        }
      }
      break;
    }
    case 'tax':
      note(st, api, `${p.name} pays $${t.amount} (${t.name}).`, undefined);
      pay(st, api, idx, null, t.amount, t.name);
      break;
    case 'surprise':
      applyCard(st, api, idx, drawCard(st), depth);
      break;
    case 'gototimeout':
      goToTimeOut(st, api, idx);
      break;
    case 'launch':
      break;
    default:
      break;
  }
}

// After landing (and any buy/auction decision) work out what the turn does next.
function afterLanding(st, api) {
  api.changed();
  if (st.over) return;
  if (checkLast(st, api)) return;
  const p = cur(st);
  if (p.out) return nextTurn(st, api);
  if (st.auction) return;
  if (st.phase === 'buy') return;
  if (st.doubles > 0 && p.jail === 0) {
    st.phase = 'roll'; // doubles: roll again
    setDeadline(st, api);
    return api.changed();
  }
  st.phase = 'manage';
  setDeadline(st, api);
  api.changed();
}

function nextTurn(st, api) {
  if (st.over || checkLast(st, api)) return;
  st.auction = null;
  const n = st.players.length;
  const prev = st.turn;
  let i = prev;
  do { i = (i + 1) % n; } while (st.players[i].out);
  if (i <= prev) {
    const cap = st.settings.rounds || MAX_ROUNDS;
    if (st.round >= cap) return finishByWealth(st, api);
    st.round++;
    note(st, api, `Round ${st.round}${st.settings.rounds ? ` of ${st.settings.rounds}` : ''}.`, 'accent');
  }
  st.turn = i;
  st.card = null;
  beginTurn(st, api);
}

function checkLast(st, api) {
  const left = alive(st);
  if (left.length <= 1 && !st.over) {
    finish(st, api, left.length ? [st.players.indexOf(left[0])] : [], 'last');
    return true;
  }
  return false;
}

function finishByWealth(st, api) {
  const worth = st.players.map((p, i) => (p.out ? -1 : netWorth(st, i)));
  const best = Math.max(...worth);
  finish(st, api, worth.map((w, i) => (w === best ? i : -1)).filter((i) => i >= 0), 'rounds');
}

function finish(st, api, winnerIdxs, reason, forfeit) {
  if (st.over) return;
  st.over = true;
  const standings = st.players
    .map((p, i) => ({ id: p.id, name: p.name, avatar: p.avatar, colour: COLOURS[p.colour], worth: p.out ? 0 : netWorth(st, i), cash: p.cash, properties: ownedTiles(st, i).length, out: p.out }))
    .sort((a, b) => b.worth - a.worth);
  const winners = winnerIdxs.map((i) => st.players[i].id);
  for (const id of winners) {
    const m = api.member(id);
    if (m) m.score += 1;
  }
  const tie = winners.length > 1;
  const w0 = winners.length ? st.players.find((p) => p.id === winners[0]) : null;
  note(st, api, tie ? `It's a tie between ${winners.length} players!` : w0 ? `${w0.name} wins!` : 'Game over.', 'good');
  api.end({ type: 'tycoon', winnerId: tie || !w0 ? null : w0.id, winners, tie, standings, reason, rounds: st.round, forfeit: !!forfeit });
}

// ---------- actions ----------
function roll(st, api) {
  const idx = st.turn;
  const p = cur(st);
  st.dice = [1 + randInt(6), 1 + randInt(6)];
  st.rollNo++;
  const dbl = st.dice[0] === st.dice[1];
  const sum = st.dice[0] + st.dice[1];
  note(st, api, `${p.name} rolled ${st.dice[0]} + ${st.dice[1]}${dbl ? ' (doubles)' : ''}.`);
  if (p.jail > 0) {
    if (dbl) {
      p.jail = 0;
      st.doubles = 0; // leaving on doubles: move but no extra roll
      note(st, api, `${p.name} rolled doubles and leaves Time Out.`, 'good');
    } else if (p.jail >= 3) {
      p.jail = 0;
      note(st, api, `${p.name} pays $${B.JAIL_FEE} to leave Time Out.`);
      if (!pay(st, api, idx, null, B.JAIL_FEE, 'the Time Out fee')) return afterLanding(st, api);
    } else {
      p.jail++;
      st.moved = null;
      st.doubles = 0;
      st.phase = 'manage';
      setDeadline(st, api);
      return api.changed();
    }
    moveBy(st, api, idx, sum);
    st.doubles = 0;
    landOn(st, api);
    return afterLanding(st, api);
  }
  if (dbl) {
    st.doubles++;
    if (st.doubles >= 3) {
      note(st, api, `${p.name} rolled three doubles in a row.`, 'warn');
      goToTimeOut(st, api, idx);
      return afterLanding(st, api);
    }
  } else {
    st.doubles = 0;
  }
  moveBy(st, api, idx, sum);
  landOn(st, api);
  afterLanding(st, api);
}

function buy(st, api) {
  const idx = st.turn;
  const p = cur(st);
  const t = B.TILES[p.pos];
  if (p.cash < t.price) return;
  p.cash -= t.price;
  st.owner[p.pos] = idx;
  note(st, api, `${p.name} bought ${t.name} for $${t.price}.`, 'good');
  st.phase = 'manage';
  afterLanding(st, api);
}

function startAuction(st, api) {
  const p = cur(st);
  const t = B.TILES[p.pos];
  st.phase = 'auction';
  st.auction = { tile: p.pos, high: 0, highIdx: -1, passed: [], endsAt: api.now() + AUCTION_START_MS };
  note(st, api, `${t.name} goes to auction (list price $${t.price}).`, 'accent');
  api.changed();
}

function auctionCheck(st, api, force) {
  const a = st.auction;
  if (!a) return;
  const bidders = alive(st).map((p) => st.players.indexOf(p)).filter((i) => !a.passed.includes(i));
  const done = force || (a.highIdx >= 0 ? bidders.every((i) => i === a.highIdx) : bidders.length === 0);
  if (!done) return;
  const t = B.TILES[a.tile];
  if (a.highIdx >= 0 && st.players[a.highIdx].cash >= a.high) {
    const w = st.players[a.highIdx];
    w.cash -= a.high;
    st.owner[a.tile] = a.highIdx;
    note(st, api, `${w.name} wins ${t.name} for $${a.high}.`, 'good');
  } else {
    note(st, api, `Nobody bought ${t.name}.`);
  }
  st.auction = null;
  st.phase = 'manage';
  afterLanding(st, api);
}

function bid(st, api, idx, amount) {
  const a = st.auction;
  const p = st.players[idx];
  if (!a || p.out || a.passed.includes(idx)) return;
  if (!Number.isInteger(amount) || amount <= a.high || amount < 1 || amount > p.cash || amount > 10000) return;
  a.high = amount;
  a.highIdx = idx;
  a.endsAt = Math.max(a.endsAt, api.now() + AUCTION_BID_MS);
  api.changed();
}

function buildable(st, idx, tile) {
  const t = B.TILES[tile];
  if (t.type !== 'prop' || st.owner[tile] !== idx || !groupOwnedBy(st, t.group, idx)) return false;
  if (st.level[tile] >= B.MAX_LEVEL) return false;
  const min = Math.min(...B.GROUP_TILES[t.group].map((i) => st.level[i]));
  return st.level[tile] === min && st.players[idx].cash >= B.upgradeCost(t);
}

function sellable(st, idx, tile) {
  const t = B.TILES[tile];
  if (t.type !== 'prop' || st.owner[tile] !== idx || st.level[tile] <= 0) return false;
  return st.level[tile] === Math.max(...B.GROUP_TILES[t.group].map((i) => st.level[i]));
}

const groupHasUpgrades = (st, tile) => {
  const t = B.TILES[tile];
  return t.type === 'prop' && B.GROUP_TILES[t.group].some((i) => st.level[i] > 0);
};

function validTile(n) {
  return Number.isInteger(n) && n >= 0 && n < B.TILES.length && B.TILES[n].price !== undefined;
}

// Returns a cleaned offer or null.
function cleanOffer(st, from, a) {
  if (!a || typeof a.to !== 'string') return null;
  const to = idxOf(st, a.to);
  if (to < 0 || to === from || st.players[to].out || st.players[from].out) return null;
  if ((a.giveProps !== undefined && !Array.isArray(a.giveProps)) || (a.askProps !== undefined && !Array.isArray(a.askProps))) return null;
  const list = (v) => (Array.isArray(v) ? v : []);
  if (list(a.giveProps).length > MAX_TRADE_PROPS || list(a.askProps).length > MAX_TRADE_PROPS) return null;
  const giveProps = [...new Set(list(a.giveProps))];
  const askProps = [...new Set(list(a.askProps))];
  const giveCash = a.giveCash === undefined ? 0 : a.giveCash;
  const askCash = a.askCash === undefined ? 0 : a.askCash;
  if (!Number.isInteger(giveCash) || !Number.isInteger(askCash) || giveCash < 0 || askCash < 0 || giveCash > 100000 || askCash > 100000) return null;
  if (giveProps.length > MAX_TRADE_PROPS || askProps.length > MAX_TRADE_PROPS) return null;
  if (![...giveProps, ...askProps].every(validTile)) return null;
  if (!giveProps.length && !askProps.length && !giveCash && !askCash) return null;
  if (giveCash > 0 && askCash > 0 && !giveProps.length && !askProps.length) return null; // cash for cash
  return { from, to, giveCash, askCash, giveProps, askProps };
}

// Checks an offer against the current state (called again when it is accepted).
function offerValid(st, o) {
  const f = st.players[o.from];
  const t = st.players[o.to];
  if (f.out || t.out) return false;
  if (f.cash < o.giveCash || t.cash < o.askCash) return false;
  if (!o.giveProps.every((i) => st.owner[i] === o.from) || !o.askProps.every((i) => st.owner[i] === o.to)) return false;
  if ([...o.giveProps, ...o.askProps].some((i) => groupHasUpgrades(st, i))) return false;
  return true;
}

function sweepTrades(st, now) {
  st.trades = st.trades.filter((t) => now < t.expires && offerValid(st, t));
}

function onAction(st, m, a, api) {
  if (st.over || !a || typeof a !== 'object') return;
  const idx = idxOf(st, m.id);
  if (idx < 0 || st.players[idx].out) return;
  sweepTrades(st, api.now());
  const mine = idx === st.turn;
  const p = st.players[idx];
  switch (a.type) {
    case 'roll':
      if (mine && st.phase === 'roll' && !st.auction) { p.idle = 0; roll(st, api); }
      return;
    case 'payjail':
      if (mine && st.phase === 'roll' && p.jail > 0 && p.cash >= B.JAIL_FEE) {
        p.idle = 0;
        pay(st, api, idx, null, B.JAIL_FEE, 'the fee');
        p.jail = 0;
        note(st, api, `${p.name} paid $${B.JAIL_FEE} to leave Time Out.`);
        setDeadline(st, api);
        api.changed();
      }
      return;
    case 'usecard':
      if (mine && st.phase === 'roll' && p.jail > 0 && p.cards > 0) {
        p.idle = 0;
        p.cards--;
        p.jail = 0;
        note(st, api, `${p.name} used a Get-out card and leaves Time Out.`, 'good');
        setDeadline(st, api);
        api.changed();
      }
      return;
    case 'buy':
      if (mine && st.phase === 'buy') { p.idle = 0; buy(st, api); }
      return;
    case 'decline':
      if (mine && st.phase === 'buy') { p.idle = 0; startAuction(st, api); }
      return;
    case 'bid':
      if (st.phase === 'auction') { bid(st, api, idx, a.amount); auctionCheck(st, api); }
      return;
    case 'pass':
      if (st.phase === 'auction' && st.auction && !st.auction.passed.includes(idx) && st.auction.highIdx !== idx) {
        st.auction.passed.push(idx);
        api.changed();
        auctionCheck(st, api);
      }
      return;
    case 'build':
      if (mine && (st.phase === 'roll' || st.phase === 'manage') && validTile(a.tile) && buildable(st, idx, a.tile)) {
        const t = B.TILES[a.tile];
        p.cash -= B.upgradeCost(t);
        st.level[a.tile]++;
        p.idle = 0;
        note(st, api, `${p.name} built a ${B.LEVEL_NAMES[st.level[a.tile]]} on ${t.name}.`, 'good');
        api.changed();
      }
      return;
    case 'sell':
      if (mine && (st.phase === 'roll' || st.phase === 'manage') && validTile(a.tile) && sellable(st, idx, a.tile)) {
        const t = B.TILES[a.tile];
        st.level[a.tile]--;
        p.cash += Math.floor(B.upgradeCost(t) / 2);
        note(st, api, `${p.name} sold an upgrade on ${t.name}.`);
        api.changed();
      }
      return;
    case 'end':
      if (mine && st.phase === 'manage') { p.idle = 0; nextTurn(st, api); }
      return;
    case 'trade_offer': {
      if (st.phase === 'auction') return;
      const o = cleanOffer(st, idx, a);
      if (!o || !offerValid(st, o)) return;
      st.trades = st.trades.filter((t) => t.from !== idx);
      st.trades.push({ ...o, id: ++st.tradeSeq, expires: api.now() + TRADE_TTL_MS });
      note(st, api, `${p.name} offered ${st.players[o.to].name} a trade.`);
      api.changed();
      return;
    }
    case 'trade_accept': {
      if (st.phase === 'auction') return;
      const t = st.trades.find((x) => x.id === a.id);
      if (!t || t.to !== idx) return;
      if (!offerValid(st, t)) {
        st.trades = st.trades.filter((x) => x !== t);
        return api.changed();
      }
      const f = st.players[t.from];
      f.cash += t.askCash - t.giveCash;
      p.cash += t.giveCash - t.askCash;
      for (const i of t.giveProps) st.owner[i] = t.to;
      for (const i of t.askProps) st.owner[i] = t.from;
      st.trades = st.trades.filter((x) => x !== t);
      sweepTrades(st, api.now());
      note(st, api, `${f.name} and ${p.name} agreed a trade.`, 'good');
      api.changed();
      return;
    }
    case 'trade_decline': {
      const t = st.trades.find((x) => x.id === a.id);
      if (!t || (t.to !== idx && t.from !== idx)) return;
      st.trades = st.trades.filter((x) => x !== t);
      note(st, api, t.to === idx ? `${p.name} declined a trade.` : `${p.name} withdrew a trade offer.`);
      api.changed();
      return;
    }
    default:
  }
}

function dropPlayer(st, api, p, why) {
  const idx = st.players.indexOf(p);
  if (p.out) return;
  note(st, api, `${p.name} ${why}, so their properties return to the bank.`, 'warn');
  const wasTurn = idx === st.turn;
  const inAuction = !!st.auction;
  bankrupt(st, api, idx, null);
  if (checkLast(st, api)) return;
  if (inAuction && wasTurn) {
    st.auction = null;
  } else if (inAuction) {
    if (st.auction.highIdx === idx) { st.auction.high = 0; st.auction.highIdx = -1; }
    return auctionCheck(st, api) || api.changed();
  }
  if (wasTurn) return nextTurn(st, api);
  api.changed();
}

function tick(st, api, now) {
  if (st.over) return;
  sweepTrades(st, now);
  if (st.phase === 'auction' && st.auction) {
    if (now >= st.auction.endsAt) {
      // everyone who hasn't bid is treated as passing
      auctionCheck(st, api, true);
    }
    return;
  }
  if (!st.deadline || now < st.deadline) return;
  const p = cur(st);
  p.idle++;
  if (p.idle >= IDLE_LIMIT) return dropPlayer(st, api, p, 'was away too long and is out');
  if (st.phase === 'roll') {
    note(st, api, `${p.name} ran out of time, so the dice were rolled for them.`, 'warn');
    return roll(st, api);
  }
  if (st.phase === 'buy') {
    note(st, api, `${p.name} ran out of time, so the property goes to auction.`, 'warn');
    return startAuction(st, api);
  }
  if (st.phase === 'manage') {
    note(st, api, `${p.name} ran out of time, so their turn ended.`, 'warn');
    nextTurn(st, api);
  }
}

function onLeave(st, id, api) {
  if (st.over) return;
  const p = st.players.find((x) => x.id === id);
  if (p) dropPlayer(st, api, p, 'left');
}

function view(st, m, now) {
  const me = idxOf(st, m.id);
  const t = cur(st);
  const mine = me >= 0 && me === st.turn;
  const can = { roll: false, payJail: false, useCard: false, buy: false, decline: false, end: false, build: [], sell: [] };
  if (mine && !st.over) {
    const p = st.players[me];
    if (st.phase === 'roll') {
      can.roll = true;
      can.payJail = p.jail > 0 && p.cash >= B.JAIL_FEE;
      can.useCard = p.jail > 0 && p.cards > 0;
    }
    if (st.phase === 'buy') {
      can.buy = p.cash >= B.TILES[p.pos].price;
      can.decline = true;
    }
    if (st.phase === 'manage') can.end = true;
    if (st.phase === 'roll' || st.phase === 'manage') {
      for (let i = 0; i < B.TILES.length; i++) {
        if (buildable(st, me, i)) can.build.push(i);
        if (sellable(st, me, i)) can.sell.push(i);
      }
    }
  }
  const a = st.auction;
  return {
    board: B.TILES,
    groups: B.GROUPS,
    rentTable: B.TILES.map((x, i) => (x.type === 'prop' ? [0, 1, 2, 3, 4].map((l) => B.rentAt(x, l)) : null)),
    upgradeCost: B.TILES.map((x) => (x.type === 'prop' ? B.upgradeCost(x) : 0)),
    levelNames: B.LEVEL_NAMES,
    owners: st.owner,
    levels: st.level,
    players: st.players.map((p, i) => ({ id: p.id, name: p.name, avatar: p.avatar, colour: p.colour, colourName: COLOURS[p.colour], cash: p.cash, pos: p.pos, jail: p.jail, cards: p.cards, out: p.out, worth: p.out ? 0 : netWorth(st, i), props: ownedTiles(st, i).length })),
    turnId: t ? t.id : null,
    myIndex: me,
    phase: st.phase,
    dice: st.dice,
    rollNo: st.rollNo,
    doubles: st.doubles,
    moved: st.moved,
    card: st.card,
    round: st.round,
    rounds: st.settings.rounds,
    salary: B.SALARY,
    log: st.log,
    can,
    auction: a ? { tile: a.tile, high: a.high, highId: a.highIdx >= 0 ? st.players[a.highIdx].id : null, passed: a.passed.map((i) => st.players[i].id), leftMs: Math.max(0, a.endsAt - now), mePassed: me >= 0 && a.passed.includes(me) } : null,
    trades: st.trades.map((x) => ({ id: x.id, from: st.players[x.from].id, to: st.players[x.to].id, giveCash: x.giveCash, askCash: x.askCash, giveProps: x.giveProps, askProps: x.askProps })),
    timeLeft: st.deadline && st.phase !== 'auction' ? Math.max(0, st.deadline - now) : null,
  };
}

module.exports = {
  meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view,
  rules: { rentFor, netWorth, buildable, sellable, offerValid, cleanOffer, groupOwnedBy, ownedTiles },
};
