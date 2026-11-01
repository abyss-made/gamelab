// Test-only preload for the multi-client harness (issue #48). The harness starts the real server
// entry point (server/index.js) in a child process with `node -r test/harness/preload.js`; production
// never loads this file. Over the IPC channel it adds:
//   - a server clock that can be moved forward. Date.now() gains an offset, so turn timers, grace
//     periods, host hand-over and room expiry run in milliseconds instead of minutes. Real timers keep
//     their cadence: the room loop still runs every 250 ms of real time.
//   - "wait for N loop passes", so a test can prove that nothing happened (no duplicate timeout, no
//     late event) without sleeping for a guessed amount of time.
//   - an optional seeded Math.random (HARNESS_SEED) so shuffles, deals and dice repeat between runs.
//   - read-only snapshots of the authoritative room state and of the live Socket.IO sockets, for
//     invariant checks that the protocol alone can't see (ghost members, stale socket ownership).
//   - every console.error the server prints (handler errors, room loop errors) forwarded as an event.
'use strict';
const path = require('path');

if (typeof process.send !== 'function') throw new Error('test/harness/preload.js needs an IPC channel');

// ---------- clock ----------
const realNow = Date.now.bind(Date);
let offset = 0;
Date.now = () => realNow() + offset;

// ---------- seeded random (mulberry32) ----------
if (process.env.HARNESS_SEED) {
  let a = Number(process.env.HARNESS_SEED) >>> 0 || 1;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- loop passes ----------
// rooms.js runs `setInterval(loop, 250)`. Wrap only that callback so each completed pass is counted.
let passes = 0;
let passWaiters = [];
const realSetInterval = global.setInterval;
global.setInterval = function (fn, ms, ...rest) {
  if (typeof fn === 'function' && fn.name === 'loop') {
    const wrapped = function () {
      try {
        return fn.apply(this, arguments);
      } finally {
        passes++;
        const due = passWaiters.filter((w) => passes >= w.at);
        passWaiters = passWaiters.filter((w) => passes < w.at);
        // Let the broadcasts the pass queued (setImmediate) go out before answering.
        if (due.length) setImmediate(() => due.forEach((w) => w.resolve(passes)));
      }
    };
    return realSetInterval.call(this, wrapped, ms, ...rest);
  }
  return realSetInterval.call(this, fn, ms, ...rest);
};

// ---------- the Socket.IO server ----------
let io = null;
const sio = require('socket.io');
const BaseServer = sio.Server;
// HARNESS_PING_MS shortens the Socket.IO heartbeat so a silently dead connection (a page whose
// network was cut) is noticed in about two heartbeats instead of the default 45 seconds.
const PING = Number(process.env.HARNESS_PING_MS) || 0;
sio.Server = class HarnessServer extends BaseServer {
  constructor(srv, opts = {}) {
    super(srv, PING ? { ...opts, pingInterval: PING, pingTimeout: PING } : opts);
    io = this;
  }
};

// ---------- server errors ----------
const realError = console.error.bind(console);
console.error = (...args) => {
  realError(...args);
  try {
    const text = args.map((a) => (a && a.stack ? a.stack : typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    process.send({ type: 'server-error', text });
  } catch (e) {
    /* the channel may be closing */
  }
};

// ---------- snapshots ----------
const SERVER = path.join(__dirname, '..', '..', 'server');
function plain(v, depth = 0) {
  if (depth > 12) return '[deep]';
  if (v instanceof Map) return { __map: [...v].map(([k, x]) => [plain(k, depth + 1), plain(x, depth + 1)]) };
  if (v instanceof Set) return { __set: [...v].map((x) => plain(x, depth + 1)) };
  if (Array.isArray(v)) return v.map((x) => plain(x, depth + 1));
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, x] of Object.entries(v)) if (typeof x !== 'function') o[k] = plain(x, depth + 1);
    return o;
  }
  return v;
}

function snapshot({ withGame = true } = {}) {
  const { rooms } = require(path.join(SERVER, 'rooms.js'));
  const { GAMES } = require(path.join(SERVER, 'games'));
  const out = { now: Date.now(), offset, passes, rooms: [], sockets: [] };
  for (const r of rooms.values()) {
    const G = r.gameId ? GAMES[r.gameId] : null;
    out.rooms.push({
      code: r.code,
      name: r.name,
      gameId: r.gameId,
      phase: r.phase,
      hostId: r.hostId,
      isPublic: r.isPublic,
      locked: r.locked,
      spectatorsOn: r.spectatorsOn,
      maxSpectators: r.maxSpectators,
      maxPlayers: r.maxPlayers,
      cap: G ? Math.min(G.meta.maxPlayers, r.maxPlayers) : r.maxPlayers,
      minPlayers: G ? G.meta.minPlayers : null,
      members: [...r.members.entries()].map(([key, m]) => ({
        key, id: m.id, token: m.token, name: m.name, role: m.role, connected: m.connected, socketId: m.socketId,
        score: m.score, ready: !!m.ready, lastSeen: m.lastSeen, lastActive: m.lastActive,
      })),
      seats: r.seats.slice(),
      specs: r.specs.slice(),
      queue: r.queue.slice(),
      nextVotes: Object.fromEntries(r.nextVotes),
      votes: Object.fromEntries([...r.votes].map(([k, s]) => [k, [...s]])),
      banned: r.banned.size,
      chatLog: r.chatLog.length,
      gameCount: r.gameCount,
      autoStartAt: r.autoStartAt,
      emptySince: r.emptySince,
      lastResultType: r.lastResult ? r.lastResult.type : null,
      hasGame: !!r.game,
      game: withGame && r.game ? plain(r.game) : null,
    });
  }
  if (io) {
    for (const s of io.of('/').sockets.values()) {
      out.sockets.push({
        id: s.id,
        code: s.data.code || null,
        memberId: s.data.memberId || null,
        rooms: [...s.rooms],
        listeners: s.eventNames().reduce((n, e) => n + s.listenerCount(e), 0),
      });
    }
  }
  const mem = process.memoryUsage();
  out.memory = { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal };
  const res = typeof process.getActiveResourcesInfo === 'function' ? process.getActiveResourcesInfo() : [];
  out.resources = res.reduce((o, k) => ((o[k] = (o[k] || 0) + 1), o), {});
  return out;
}

process.on('message', (msg) => {
  if (!msg || typeof msg !== 'object' || msg.type !== 'harness') return;
  const reply = (data, error) => process.send({ type: 'harness-reply', id: msg.id, data, error });
  try {
    switch (msg.cmd) {
      case 'snapshot':
        return reply(snapshot(msg.opts || {}));
      case 'advance':
        offset += Math.max(0, Number(msg.ms) || 0);
        return reply({ offset });
      case 'passes': {
        const at = passes + Math.max(1, Number(msg.n) || 1);
        passWaiters.push({ at, resolve: (n) => reply({ passes: n }) });
        return undefined;
      }
      case 'gc':
        if (global.gc) global.gc();
        return reply(snapshot({ withGame: false }).memory);
      default:
        return reply(null, `unknown command ${msg.cmd}`);
    }
  } catch (err) {
    return reply(null, String(err && err.stack ? err.stack : err));
  }
});
