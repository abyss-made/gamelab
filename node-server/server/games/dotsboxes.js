// Dots & Boxes: claim edges; completing a box scores it and earns another turn.
// h[r][c] is the horizontal edge above box (r,c); v[r][c] is the vertical edge left of box (r,c).
const meta = {
  id: 'dotsboxes',
  name: 'Dots & Boxes',
  minPlayers: 2,
  maxPlayers: 4,
  midJoin: false,
  resetScores: true,
  scoreLabel: 'boxes',
};

const SIZES = [3, 4, 5];
const TURN_TIMES = [0, 20, 30, 60];
const defaults = { size: 4, turnTime: 30 };
const IDLE_LIMIT = 3;

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (SIZES.includes(s.size)) o.size = s.size;
  if (TURN_TIMES.includes(s.turnTime)) o.turnTime = s.turnTime;
  return o;
}

const grid = (rows, cols, v) => Array.from({ length: rows }, () => Array(cols).fill(v));

function create(settings) {
  const n = settings.size;
  return {
    settings: { ...settings },
    n,
    h: grid(n + 1, n, -1),
    v: grid(n, n + 1, -1),
    boxes: grid(n, n, -1),
    players: [],
    turn: 0,
    edges: 0,
    last: null,
    deadline: 0,
    over: false,
  };
}

const activeP = (st) => st.players.filter((p) => !p.out);

function resetClock(st, api) {
  st.deadline = st.settings.turnTime ? api.now() + st.settings.turnTime * 1000 : 0;
}

function start(st, api) {
  st.players = api.seated().map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, boxes: 0, idle: 0, out: false }));
  // Rotate the first player between games.
  st.turn = api.gameCount() % st.players.length;
  resetClock(st, api);
  api.sys(`Dots & Boxes: ${st.players[st.turn].name} goes first. Complete a box to go again.`, 'accent');
  api.changed();
}

function boxDone(st, r, c) {
  return st.h[r][c] >= 0 && st.h[r + 1][c] >= 0 && st.v[r][c] >= 0 && st.v[r][c + 1] >= 0;
}

// Claims an edge for the current player. Returns false if it is illegal.
function claim(st, api, kind, r, c) {
  const n = st.n;
  const arr = kind === 'h' ? st.h : st.v;
  const rows = kind === 'h' ? n + 1 : n;
  const cols = kind === 'h' ? n : n + 1;
  if (r < 0 || r >= rows || c < 0 || c >= cols || arr[r][c] !== -1) return false;
  arr[r][c] = st.turn;
  st.edges++;
  st.last = { kind, r, c };
  const touching = kind === 'h' ? [[r - 1, c], [r, c]] : [[r, c - 1], [r, c]];
  let got = 0;
  for (const [br, bc] of touching) {
    if (br < 0 || br >= n || bc < 0 || bc >= n) continue;
    if (st.boxes[br][bc] === -1 && boxDone(st, br, bc)) {
      st.boxes[br][bc] = st.turn;
      got++;
    }
  }
  const p = st.players[st.turn];
  if (got) {
    p.boxes += got;
    const m = api.member(p.id);
    if (m) m.score = p.boxes;
  }
  if (st.edges === 2 * n * (n + 1)) {
    finish(st, api);
    return true;
  }
  if (!got) advance(st);
  resetClock(st, api);
  api.changed();
  return true;
}

function advance(st) {
  for (let i = 1; i <= st.players.length; i++) {
    const j = (st.turn + i) % st.players.length;
    if (!st.players[j].out) {
      st.turn = j;
      return;
    }
  }
}

function openEdges(st) {
  const out = [];
  st.h.forEach((row, r) => row.forEach((v, c) => v === -1 && out.push(['h', r, c])));
  st.v.forEach((row, r) => row.forEach((v, c) => v === -1 && out.push(['v', r, c])));
  return out;
}

function finish(st, api, forfeit) {
  if (st.over) return;
  st.over = true;
  const standings = st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, boxes: p.boxes, out: p.out })).sort((a, b) => b.boxes - a.boxes);
  const eligible = standings.filter((s) => !s.out);
  const top = eligible[0] ? eligible[0].boxes : 0;
  const winners = eligible.filter((s) => s.boxes === top).map((s) => s.id);
  if (eligible.length) api.sys(winners.length > 1 ? 'It ends in a tie!' : `${eligible[0].name} wins!`, 'good');
  api.end({ type: 'dotsboxes', n: st.n, h: st.h, v: st.v, boxes: st.boxes, players: st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })), winnerId: winners[0] || null, winners, tie: winners.length > 1, standings, forfeit: !!forfeit });
}

function onAction(st, m, a, api) {
  if (st.over || !a || a.type !== 'edge') return;
  const cur = st.players[st.turn];
  if (!cur || cur.id !== m.id || cur.out) return;
  if (a.kind !== 'h' && a.kind !== 'v') return;
  const { r, c } = a;
  if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || c < 0) return; // strict: never coerce junk into a legal edge
  if (claim(st, api, a.kind, r, c)) cur.idle = 0;
}

function tick(st, api, now) {
  if (st.over || !st.deadline || now < st.deadline) return;
  const p = st.players[st.turn];
  p.idle++;
  if (p.idle >= IDLE_LIMIT) {
    p.out = true;
    api.sys(`${p.name} was away too long and is out.`, 'warn');
    if (activeP(st).length < 2) return finish(st, api, true);
    advance(st);
    resetClock(st, api);
    return api.changed();
  }
  api.sys(`${p.name} ran out of time, so a random edge was drawn.`, 'warn');
  const open = openEdges(st);
  const [k, r, c] = open[Math.floor(Math.random() * open.length)];
  claim(st, api, k, r, c);
}

function onLeave(st, id, api) {
  if (st.over) return;
  const i = st.players.findIndex((p) => p.id === id);
  if (i < 0 || st.players[i].out) return;
  st.players[i].out = true;
  api.sys(`${st.players[i].name} left.`, 'warn');
  if (activeP(st).length < 2) return finish(st, api, true);
  if (st.turn === i) {
    advance(st);
    resetClock(st, api);
  }
  api.changed();
}

function view(st, m, now) {
  return {
    n: st.n,
    h: st.h,
    v: st.v,
    boxes: st.boxes,
    players: st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, boxes: p.boxes, out: p.out })),
    turn: st.turn,
    myIndex: st.players.findIndex((p) => p.id === m.id),
    last: st.last,
    timeLeft: st.deadline ? Math.max(0, st.deadline - now) : null,
  };
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view };
