// Battleship: two players secretly place a fleet on a 10x10 grid, then take turns firing.
// Fleet positions live only on the server: a player's view contains their own ships, and everyone
// (including spectators) only ever sees shots, hits, misses and ships that have been sunk.
// Full fleets are published once the game ends.
const { randInt } = require('./socialutil');

const meta = { id: 'battleship', name: 'Battleship', minPlayers: 2, maxPlayers: 2, midJoin: false, resetScores: false, scoreLabel: 'wins' };

const SIZE = 10;
const FLEET = [
  { name: 'Carrier', len: 5 },
  { name: 'Battleship', len: 4 },
  { name: 'Cruiser', len: 3 },
  { name: 'Submarine', len: 3 },
  { name: 'Destroyer', len: 2 },
];
const PLACE_TIMES = [60, 90, 120];
const TURN_TIMES = [0, 20, 30, 60];
const defaults = { placeTime: 90, turnTime: 30, hitAgain: false, winnerStays: true };

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (PLACE_TIMES.includes(s.placeTime)) o.placeTime = s.placeTime;
  if (TURN_TIMES.includes(s.turnTime)) o.turnTime = s.turnTime;
  if (typeof s.hitAgain === 'boolean') o.hitAgain = s.hitAgain;
  if (typeof s.winnerStays === 'boolean') o.winnerStays = s.winnerStays;
  return o;
}

// Validates a fleet layout: one entry per ship in FLEET order, {x, y, horizontal}. Returns cell lists or null.
function layoutCells(layout) {
  if (!Array.isArray(layout) || layout.length !== FLEET.length) return null;
  const used = new Set();
  const ships = [];
  for (let i = 0; i < FLEET.length; i++) {
    const s = layout[i];
    if (!s || typeof s !== 'object' || !Number.isInteger(s.x) || !Number.isInteger(s.y) || typeof s.horizontal !== 'boolean') return null;
    const cells = [];
    for (let k = 0; k < FLEET[i].len; k++) {
      const x = s.x + (s.horizontal ? k : 0);
      const y = s.y + (s.horizontal ? 0 : k);
      if (x < 0 || x >= SIZE || y < 0 || y >= SIZE || (s.x < 0) || (s.y < 0)) return null;
      const c = y * SIZE + x;
      if (used.has(c)) return null;
      used.add(c);
      cells.push(c);
    }
    ships.push(cells);
  }
  return ships;
}

function randomLayout() {
  for (;;) {
    const layout = [];
    const used = new Set();
    let fail = false;
    for (const ship of FLEET) {
      let placed = false;
      for (let tries = 0; tries < 200 && !placed; tries++) {
        const horizontal = randInt(2) === 0;
        const x = randInt(SIZE - (horizontal ? ship.len - 1 : 0));
        const y = randInt(SIZE - (horizontal ? 0 : ship.len - 1));
        const cells = Array.from({ length: ship.len }, (_, k) => (y + (horizontal ? 0 : k)) * SIZE + x + (horizontal ? k : 0));
        if (cells.some((c) => used.has(c))) continue;
        cells.forEach((c) => used.add(c));
        layout.push({ x, y, horizontal });
        placed = true;
      }
      if (!placed) { fail = true; break; }
    }
    if (!fail) return layout;
  }
}

function create(settings) {
  return { settings: { ...settings }, phase: 'place', players: [], turn: 0, deadline: 0, moves: 0, last: null, timeouts: [0, 0], over: false };
}

function mk(m) {
  return { id: m.id, name: m.name, avatar: m.avatar, ships: null, shots: Array(SIZE * SIZE).fill(0), hit: null, ready: false };
}

function start(st, api) {
  const ps = api.seated().slice(0, 2);
  if (api.gameCount() % 2 === 0) ps.reverse();
  st.players = ps.map(mk);
  st.deadline = api.now() + st.settings.placeTime * 1000;
  api.sys('Battleship: place your fleet in secret, then take turns firing.', 'accent');
  api.changed();
}

function setFleet(p, ships) {
  p.ships = ships.map((cells, i) => ({ name: FLEET[i].name, len: FLEET[i].len, cells, hits: 0 }));
  p.ready = true;
}

function beginBattle(st, api) {
  st.phase = 'battle';
  st.turn = 0;
  st.deadline = st.settings.turnTime ? api.now() + st.settings.turnTime * 1000 : 0;
  api.sys(`Both fleets are ready. ${st.players[0].name} fires first.`, 'accent');
}

const sunkShips = (p) => p.ships.filter((s) => s.hits >= s.len);
const remaining = (p) => p.ships.filter((s) => s.hits < s.len).length;

function finish(st, api, winnerIdx, forfeit) {
  if (st.over) return;
  st.over = true;
  const result = {
    type: 'battleship',
    players: st.players.map((p, i) => ({ id: p.id, name: p.name, avatar: p.avatar, shots: p.shots, remaining: p.ships ? remaining(p) : 0, fleet: p.ships ? p.ships.map((s) => ({ name: s.name, cells: s.cells })) : [], shotsFired: st.players[1 - i].shots.filter(Boolean).length })),
    winnerId: st.players[winnerIdx].id,
    forfeit: !!forfeit,
    draw: false,
  };
  const w = api.member(st.players[winnerIdx].id);
  if (w) w.score += 1;
  api.sys(`${st.players[winnerIdx].name} wins!`, 'good');
  if (st.settings.winnerStays) result.nextUp = api.rotateLoser(st.players[1 - winnerIdx].id);
  api.end(result);
}

function fire(st, api, cell) {
  const me = st.players[st.turn];
  const foe = st.players[1 - st.turn];
  if (foe.shots[cell]) return false;
  const ship = foe.ships.find((s) => s.cells.includes(cell));
  st.moves++;
  st.last = { by: st.turn, cell };
  if (ship) {
    foe.shots[cell] = 2;
    ship.hits++;
    if (ship.hits >= ship.len) api.sys(`${me.name} sank ${foe.name}'s ${ship.name}!`, 'warn');
    if (remaining(foe) === 0) return finish(st, api, st.turn), true;
    if (!st.settings.hitAgain) st.turn = 1 - st.turn;
  } else {
    foe.shots[cell] = 1;
    st.turn = 1 - st.turn;
  }
  st.deadline = st.settings.turnTime ? api.now() + st.settings.turnTime * 1000 : 0;
  api.changed();
  return true;
}

function onAction(st, m, a, api) {
  if (st.over || !a || typeof a !== 'object') return;
  const idx = st.players.findIndex((p) => p.id === m.id);
  if (idx < 0) return;
  const me = st.players[idx];
  if (a.type === 'resign') return finish(st, api, 1 - idx, true);
  if (st.phase === 'place') {
    if (me.ready) return;
    if (a.type === 'random') setFleet(me, layoutCells(randomLayout()));
    else if (a.type === 'place') {
      const ships = layoutCells(a.ships);
      if (!ships) return;
      setFleet(me, ships);
    } else return;
    if (st.players.every((p) => p.ready)) beginBattle(st, api);
    return api.changed();
  }
  if (a.type !== 'fire' || idx !== st.turn) return;
  if (!Number.isInteger(a.cell) || a.cell < 0 || a.cell >= SIZE * SIZE) return;
  if (fire(st, api, a.cell)) st.timeouts[idx] = 0;
}

function tick(st, api, now) {
  if (st.over || !st.deadline || now < st.deadline) return;
  if (st.phase === 'place') {
    for (const p of st.players) if (!p.ready) setFleet(p, layoutCells(randomLayout()));
    api.sys('Time is up, so any missing fleets were placed randomly.', 'warn');
    beginBattle(st, api);
    return api.changed();
  }
  const idx = st.turn;
  st.timeouts[idx]++;
  if (st.timeouts[idx] >= 2) {
    api.sys(`${st.players[idx].name} ran out of time twice, so ${st.players[1 - idx].name} wins.`, 'warn');
    return finish(st, api, 1 - idx, true);
  }
  const open = st.players[1 - idx].shots.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  api.sys(`${st.players[idx].name} ran out of time, so a random shot was fired.`, 'warn');
  fire(st, api, open[randInt(open.length)]);
}

function onLeave(st, id, api) {
  if (st.over) return;
  const idx = st.players.findIndex((p) => p.id === id);
  if (idx < 0) return;
  api.sys(`${st.players[idx].name} left, so ${st.players[1 - idx].name} wins.`, 'warn');
  finish(st, api, 1 - idx, true);
}

function view(st, m, now) {
  const myIndex = st.players.findIndex((p) => p.id === m.id);
  const mine = myIndex >= 0 ? st.players[myIndex] : null;
  return {
    phase: st.phase,
    turn: st.turn,
    myIndex,
    size: SIZE,
    fleet: FLEET,
    hitAgain: st.settings.hitAgain,
    // Per player: the shots *they have received*, which anybody may see, and ships already sunk.
    players: st.players.map((p) => ({
      id: p.id, name: p.name, avatar: p.avatar, ready: p.ready, shots: p.shots,
      remaining: p.ships ? remaining(p) : FLEET.length,
      sunk: p.ships ? sunkShips(p).map((s) => ({ name: s.name, len: s.len, cells: s.cells })) : [],
    })),
    // Only the viewer's own fleet is ever included.
    myShips: mine && mine.ships ? mine.ships.map((s) => ({ name: s.name, len: s.len, cells: s.cells, hits: s.hits })) : null,
    last: st.last,
    moves: st.moves,
    timeLeft: st.deadline ? Math.max(0, st.deadline - now) : null,
  };
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view, rules: { FLEET, SIZE, layoutCells, randomLayout } };
