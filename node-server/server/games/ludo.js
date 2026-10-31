// Ludo: 2-4 players, four tokens each, server-rolled dice.
// Rules used here:
//  - Roll a 6 to bring a token out of the yard onto your start square. A 6 gives an extra roll
//    (three sixes in a row forfeit the turn and the third six is not played).
//  - The track has 52 squares. A token travels 51 of them from its start, then up its own
//    5-square home column and onto the centre. Finishing needs the exact number.
//  - Landing on a single opponent token on a normal square sends it back to its yard. Start squares
//    and star squares are safe: nobody is captured there and tokens of different colours may share them.
//  - Two or more tokens of one colour on a square form a block that cannot be captured.
//  - If a roll has no legal move the turn passes. The first player with all four tokens home wins.
// Progress per token: -1 = in the yard, 0..50 = on the main track, 51..55 = home column, 56 = home.
const { randInt } = require('./socialutil');

const meta = { id: 'ludo', name: 'Ludo', minPlayers: 2, maxPlayers: 4, midJoin: false, resetScores: true, scoreLabel: 'home' };

const TURN_TIMES = [15, 25, 40];
const defaults = { turnTime: 25 };
const COLOURS = ['Red', 'Green', 'Yellow', 'Blue'];
const TRACK = 52;
const HOME = 56;
const IDLE_LIMIT = 3;
const SAFE = new Set([0, 13, 26, 39, 8, 21, 34, 47]); // starts + stars (absolute track squares)
const NOTICE_MS = 1100; // how long a roll with no legal move stays on screen

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (TURN_TIMES.includes(s.turnTime)) o.turnTime = s.turnTime;
  return o;
}

const absOf = (p, prog) => (p.colour * 13 + prog) % TRACK;

function create(settings) {
  return { settings: { ...settings }, players: [], turn: 0, phase: 'roll', dice: 0, sixes: 0, movable: [], deadline: 0, over: false, lastEvent: null, rolls: 0 };
}

function start(st, api) {
  const ms = api.seated();
  const cols = ms.length === 2 ? [0, 2] : [0, 1, 2, 3].slice(0, ms.length);
  st.players = ms.map((m, i) => ({ id: m.id, name: m.name, avatar: m.avatar, colour: cols[i], tokens: [-1, -1, -1, -1], idle: 0, out: false }));
  st.turn = randInt(st.players.length);
  syncScores(st, api);
  api.sys('Ludo: roll a 6 to leave the yard. Land on a lone opponent to send it home!', 'accent');
  beginTurn(st, api);
}

const live = (st) => st.players.filter((p) => !p.out);
const home = (p) => p.tokens.filter((t) => t === HOME).length;

function syncScores(st, api) {
  for (const p of st.players) {
    const m = api.member(p.id);
    if (m) m.score = home(p);
  }
}

function setDeadline(st, api, ms) {
  st.deadline = api.now() + (ms !== undefined ? ms : st.settings.turnTime * 1000);
}

function beginTurn(st, api) {
  st.idleCounted = false;
  st.phase = 'roll';
  st.dice = 0;
  st.movable = [];
  setDeadline(st, api);
  api.changed();
}

function nextPlayerIdx(st, from) {
  const n = st.players.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (!st.players[i].out) return i;
  }
  return from;
}

function endTurn(st, api) {
  st.sixes = 0;
  st.turn = nextPlayerIdx(st, st.turn);
  beginTurn(st, api);
}

// Tokens of player `p` that can legally move `d` squares.
function movableTokens(st, p, d) {
  const out = [];
  p.tokens.forEach((prog, i) => {
    if (prog === HOME) return;
    if (prog === -1) {
      if (d !== 6) return;
      out.push(i); // entering is always allowed: the start square is safe, nobody gets captured
      return;
    }
    const to = prog + d;
    if (to > HOME) return; // exact roll needed
    out.push(i);
  });
  return out;
}

// Opponent tokens that a token landing on absolute square `abs` would capture.
function capturesAt(st, p, abs) {
  if (SAFE.has(abs)) return [];
  const hits = [];
  for (const o of st.players) {
    if (o === p || o.out) continue;
    const here = [];
    o.tokens.forEach((prog, i) => {
      if (prog >= 0 && prog <= 50 && absOf(o, prog) === abs) here.push(i);
    });
    if (here.length === 1) hits.push({ player: o, token: here[0] }); // two of a colour form a block
  }
  return hits;
}

function roll(st, api) {
  const p = st.players[st.turn];
  st.dice = 1 + randInt(6);
  st.rolls++;
  if (st.dice === 6) st.sixes++;
  else st.sixes = 0;
  if (st.sixes === 3) {
    api.sys(`${p.name} rolled three sixes in a row and loses the turn.`, 'warn');
    st.lastEvent = { kind: 'sixes', by: p.id };
    st.phase = 'notice';
    st.movable = [];
    setDeadline(st, api, NOTICE_MS);
    return api.changed();
  }
  st.movable = movableTokens(st, p, st.dice);
  if (!st.movable.length) {
    st.phase = 'notice';
    st.lastEvent = { kind: 'stuck', by: p.id };
    setDeadline(st, api, NOTICE_MS);
    return api.changed();
  }
  st.phase = 'move';
  setDeadline(st, api);
  api.changed();
}

function move(st, api, ti, auto) {
  const p = st.players[st.turn];
  const d = st.dice;
  const from = p.tokens[ti];
  const to = from === -1 ? 0 : from + d;
  p.tokens[ti] = to;
  let captured = null;
  if (to <= 50) {
    const hit = capturesAt(st, p, absOf(p, to))[0];
    if (hit) {
      hit.player.tokens[hit.token] = -1;
      captured = { id: hit.player.id, name: hit.player.name };
      api.sys(`${p.name} sent one of ${hit.player.name}'s tokens back to the yard!`, 'warn');
    }
  }
  st.lastEvent = { kind: 'move', by: p.id, token: ti, from, to, captured: captured ? captured.id : null };
  if (!auto) p.idle = 0; // an automatic move on timeout must not count as activity
  syncScores(st, api);
  if (home(p) === 4) return finish(st, api, p);
  if (to === HOME) api.sys(`${p.name} got a token home.`, 'good');
  st.movable = [];
  if (d === 6) {
    st.phase = 'roll'; // bonus roll
    st.dice = 0;
    setDeadline(st, api);
    return api.changed();
  }
  endTurn(st, api);
}

function finish(st, api, winner, forfeit) {
  if (st.over) return;
  st.over = true;
  const standings = st.players
    .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, colour: COLOURS[p.colour], home: home(p), out: p.out }))
    .sort((a, b) => b.home - a.home);
  api.sys(`${winner.name} wins!`, 'good');
  api.end({ type: 'ludo', winnerId: winner.id, winners: [winner.id], tie: false, standings, forfeit: !!forfeit });
}

function onAction(st, m, a, api) {
  if (st.over || !a || typeof a !== 'object') return;
  const i = st.players.findIndex((p) => p.id === m.id);
  if (i < 0 || i !== st.turn || st.players[i].out) return;
  if (a.type === 'roll' && st.phase === 'roll') {
    st.players[i].idle = 0;
    return roll(st, api);
  }
  if (a.type === 'move' && st.phase === 'move') {
    if (!Number.isInteger(a.token) || !st.movable.includes(a.token)) return;
    move(st, api, a.token);
  }
}

// Picks a sensible token for an idle player: finish > capture > leave yard > furthest ahead.
function autoPick(st, p) {
  const score = (ti) => {
    const from = p.tokens[ti];
    const to = from === -1 ? 0 : from + st.dice;
    let s = from === -1 ? 20 : from + st.dice;
    if (to === HOME) s += 100;
    if (to <= 50 && capturesAt(st, p, absOf(p, to)).length) s += 60;
    return s;
  };
  return st.movable.slice().sort((x, y) => score(y) - score(x))[0];
}

function dropPlayer(st, api, p, why) {
  if (p.out) return;
  p.out = true;
  p.tokens = [-1, -1, -1, -1]; // tokens leave the board so nobody is blocked or captured by a ghost
  api.sys(`${p.name} ${why}.`, 'warn');
  syncScores(st, api);
  const left = live(st);
  if (left.length === 1) return finish(st, api, left[0], true);
  if (st.players[st.turn] === p) {
    st.sixes = 0;
    st.turn = nextPlayerIdx(st, st.turn);
    return beginTurn(st, api);
  }
  api.changed();
}

function tick(st, api, now) {
  if (st.over || !st.deadline || now < st.deadline) return;
  const p = st.players[st.turn];
  if (st.phase === 'notice') {
    return endTurn(st, api);
  }
  // A missed turn counts once, however many timeouts it has (roll, move, bonus roll after a 6).
  if (!st.idleCounted) {
    st.idleCounted = true;
    p.idle++;
  }
  if (p.idle >= IDLE_LIMIT) return dropPlayer(st, api, p, 'was away too long and is out');
  if (st.phase === 'roll') {
    api.sys(`${p.name} ran out of time, so the dice were rolled for them.`, 'warn');
    return roll(st, api);
  }
  api.sys(`${p.name} ran out of time, so a token was moved for them.`, 'warn');
  move(st, api, autoPick(st, p), true);
}

function onLeave(st, id, api) {
  if (st.over) return;
  const p = st.players.find((x) => x.id === id);
  if (p) dropPlayer(st, api, p, 'left');
}

function view(st, m, now) {
  const me = st.players.findIndex((p) => p.id === m.id);
  const turnP = st.players[st.turn];
  return {
    phase: st.phase,
    players: st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, colour: p.colour, colourName: COLOURS[p.colour], tokens: p.tokens, home: home(p), out: p.out })),
    turnId: turnP ? turnP.id : null,
    dice: st.dice,
    movable: st.phase === 'move' && me === st.turn ? st.movable : [],
    sixes: st.sixes,
    lastEvent: st.lastEvent,
    rolls: st.rolls,
    myIndex: me,
    timeLeft: st.deadline ? Math.max(0, st.deadline - now) : null,
    safe: Array.from(SAFE),
  };
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view, rules: { movableTokens, capturesAt, absOf, SAFE, HOME, TRACK } };
