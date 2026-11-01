// Multi-client test harness (issue #48): the real server in a child process plus scripted
// Socket.IO clients, with event-driven waits (no fixed sleeps), invariant checks over the
// authoritative server state, and failure artifacts. Used by test/reliability.js (sockets) and
// test/reliabilityui.js (real browsers).
'use strict';
const fs = require('fs');
const net = require('net');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const ROOT = path.join(__dirname, '..', '..');
const PRELOAD = path.join(__dirname, 'preload.js');
const ENTRY = path.join(ROOT, 'server', 'index.js');
const ARTIFACTS = path.join(ROOT, 'test-artifacts');

const tok = () => crypto.randomBytes(16).toString('hex');

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

// ---------- server ----------
async function startServer({ env = {}, seed = process.env.HARNESS_SEED || '48' } = {}) {
  const port = await freePort();
  const childEnv = { ...process.env, PORT: String(port), ALPHA_ENABLED: '', HARNESS_SEED: String(seed), ...env };
  if (!('HIDDEN_GAMES' in env)) delete childEnv.HIDDEN_GAMES; // production default: four games hidden
  const child = spawn(process.execPath, ['--expose-gc', '-r', PRELOAD, ENTRY], { env: childEnv, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  const log = [];
  const errors = [];
  const pending = new Map();
  let nextId = 1;
  const push = (line) => {
    log.push(line);
    if (log.length > 2000) log.shift();
  };
  child.stdout.on('data', (d) => String(d).split('\n').filter(Boolean).forEach((l) => push('[out] ' + l)));
  child.stderr.on('data', (d) => String(d).split('\n').filter(Boolean).forEach((l) => push('[err] ' + l)));
  child.on('message', (m) => {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'server-error') errors.push(m.text);
    if (m.type === 'harness-reply' && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) p.reject(new Error(m.error));
      else p.resolve(m.data);
    }
  });
  let exited = null;
  child.on('exit', (code, sig) => {
    exited = { code, sig };
    for (const p of pending.values()) p.reject(new Error(`server exited (${code}/${sig})`));
    pending.clear();
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('server did not start in 10s:\n' + log.join('\n'))), 10000);
    const onData = (d) => {
      if (/running on/.test(String(d))) {
        clearTimeout(t);
        child.stdout.off('data', onData);
        resolve();
      }
    };
    child.stdout.on('data', onData);
    child.on('exit', () => reject(new Error('server exited during start:\n' + log.join('\n'))));
  });
  const cmd = (name, extra = {}, ms = 10000) =>
    new Promise((resolve, reject) => {
      if (exited) return reject(new Error('server is not running'));
      const id = nextId++;
      const t = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`harness command ${name} timed out`));
      }, ms);
      pending.set(id, { resolve: (d) => (clearTimeout(t), resolve(d)), reject: (e) => (clearTimeout(t), reject(e)) });
      child.send({ type: 'harness', id, cmd: name, ...extra });
    });
  return {
    url: `http://localhost:${port}`,
    port,
    seed: String(seed),
    log,
    errors,
    snapshot: (opts) => cmd('snapshot', { opts }),
    // Move the server clock forward, then wait for `passes` full room-loop passes so the loop has acted on it.
    advance: async (ms, passes = 2) => {
      await cmd('advance', { ms });
      return cmd('passes', { n: passes });
    },
    passes: (n = 1) => cmd('passes', { n }),
    gc: () => cmd('gc'),
    room: async (code) => (await cmd('snapshot')).rooms.find((r) => r.code === code) || null,
    stop: () =>
      new Promise((resolve) => {
        if (exited) return resolve();
        child.once('exit', () => resolve());
        child.kill('SIGTERM');
        setTimeout(() => child.kill('SIGKILL'), 3000).unref();
      }),
  };
}

// ---------- clients ----------
// Mirrors what public/js/main.js does: one token per tab (sessionStorage), and a silent joinRoom
// for the current party whenever the socket (re)connects.
let clientSeq = 0;
// One counter across every client, so "since this mark" is exact even within one millisecond.
let eventSeq = 0;
const mark = () => eventSeq;
class Client {
  constructor(server, name, opts = {}) {
    this.server = server;
    this.name = name;
    this.seq = ++clientSeq;
    this.token = opts.token || tok();
    this.profile = { name, avatar: { e: this.seq % 24, c: this.seq % 10 } };
    this.code = null;
    this.state = null;
    this.events = []; // { seq, t, ev, data } for every message received, kept for leak scans and artifacts
    this.counts = {};
    this.flags = { replaced: 0, kicked: 0 };
    this.autoRejoin = opts.autoRejoin !== false;
    this.reconnects = 0;
    this.lastRejoin = null;
    this.waiters = [];
    this.connect();
  }
  connect() {
    const s = io(this.server.url, { transports: ['websocket'], forceNew: true, reconnection: false });
    this.s = s;
    s.onAny((ev, data) => {
      this.counts[ev] = (this.counts[ev] || 0) + 1;
      this.events.push({ seq: ++eventSeq, t: Date.now(), ev, data });
      if (this.events.length > 6000) this.events.shift();
      if (ev === 'state') this.state = data;
      if (ev === 'replaced') this.flags.replaced++;
      if (ev === 'kicked') this.flags.kicked++;
      this.poke();
    });
    s.on('connect', () => {
      if (this.connectedOnce && this.autoRejoin && this.code) {
        this.reconnects++;
        const at = mark();
        this.rejoining = this.call('joinRoom', { code: this.code, token: this.token, profile: this.profile }).then(async (res) => {
          this.lastRejoin = res;
          if (!res || res.error) this.code = null;
          else await this.freshState(at, res.code);
          return res;
        });
      }
      this.connectedOnce = true;
      this.poke();
    });
    return s;
  }
  poke() {
    for (const w of [...this.waiters]) w.check();
  }
  get id() {
    return this.state ? this.state.you : null;
  }
  get g() {
    return this.state && this.state.game;
  }
  waitConnected(ms = 4000) {
    if (this.s.connected) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`${this.name}: socket did not connect`)), ms);
      this.s.once('connect', () => (clearTimeout(t), resolve()));
    });
  }
  emit(ev, d) {
    this.s.emit(ev, d);
  }
  call(ev, d, ms = 5000) {
    return new Promise((resolve) => {
      this.s.timeout(ms).emit(ev, d, (err, res) => resolve(err ? { error: 'timeout' } : res));
    });
  }
  // The server acks a join first and broadcasts the room state right after (setImmediate), so a
  // join is only complete once a state for that room arrives after the request was sent.
  freshState(at, code) {
    return this.until((c) => c.events.some((e) => e.seq > at && e.ev === 'state' && e.data.code === code), `first state of ${code}`);
  }
  async create(opts = {}) {
    await this.waitConnected();
    const at = mark();
    const res = await this.call('createRoom', { isPublic: false, spectatorsOn: true, ...opts, token: this.token, profile: this.profile });
    if (res && res.ok) {
      this.code = res.code;
      await this.freshState(at, res.code);
    }
    return res;
  }
  async join(code) {
    await this.waitConnected();
    const at = mark();
    const res = await this.call('joinRoom', { code, token: this.token, profile: this.profile });
    if (res && res.ok) {
      this.code = res.code;
      await this.freshState(at, res.code);
    }
    return res;
  }
  leave() {
    this.emit('leaveRoom');
    this.code = null;
  }
  action(a) {
    this.emit('action', a);
  }
  // A dropped connection (network loss, phone asleep). With autoRejoin, reconnect() rejoins.
  drop() {
    this.s.disconnect();
  }
  // Reconnects like the real client: the socket comes back and silently rejoins the current party.
  // Resolves with the rejoin answer once the fresh room state has arrived.
  async reconnect() {
    this.lastRejoin = null;
    this.rejoining = null;
    this.s.connect();
    await this.waitConnected();
    if (!this.code || !this.autoRejoin) return null;
    await this.until((c) => c.rejoining, 'rejoin request');
    return this.rejoining;
  }
  // A page reload: a brand-new socket with the same tab token, then Join on the /r/CODE screen.
  async refresh() {
    const code = this.code;
    this.s.removeAllListeners();
    this.s.disconnect();
    this.state = null;
    this.connectedOnce = false;
    this.connect();
    await this.waitConnected();
    return code ? this.join(code) : null;
  }
  close() {
    this.s.removeAllListeners();
    this.s.disconnect();
  }
  // Resolves with pred(this) once it is truthy, re-checked on every incoming message.
  until(pred, label, ms = 4000) {
    return new Promise((resolve, reject) => {
      const w = {
        check: () => {
          let v;
          try {
            v = pred(this);
          } catch (e) {
            v = false;
          }
          if (v) {
            clearTimeout(w.t);
            this.waiters = this.waiters.filter((x) => x !== w);
            resolve(v);
          }
        },
      };
      w.t = setTimeout(() => {
        this.waiters = this.waiters.filter((x) => x !== w);
        reject(new Error(`${this.name}: timed out waiting for ${label}; last state: ${summary(this.state)}`));
      }, ms);
      this.waiters.push(w);
      w.check();
    });
  }
  // Resolves with the matching state.
  untilState(pred, label, ms) {
    return this.until((c) => (c.state && pred(c.state) ? c.state : null), label, ms);
  }
  // Events received after a mark() (all kinds when ev is null).
  since(at = 0, ev = null) {
    return this.events.filter((e) => e.seq > at && (!ev || e.ev === ev));
  }
  received(ev, at = 0) {
    return this.since(at, ev).map((e) => e.data);
  }
  chats(at = 0) {
    const out = [];
    for (const e of this.since(at)) {
      if (e.ev === 'chat') out.push(e.data);
      if (e.ev === 'chatHistory' && Array.isArray(e.data)) out.push(...e.data);
    }
    return out;
  }
  // Everything this client was sent after a mark, as text (for secret scans).
  transcript(at = 0) {
    return this.since(at)
      .map((e) => {
        try {
          return e.ev + ' ' + JSON.stringify(e.data);
        } catch (err) {
          return e.ev;
        }
      })
      .join('\n');
  }
}

function summary(st) {
  if (!st) return 'none';
  const g = st.game || {};
  return JSON.stringify({
    code: st.code, you: st.you, role: st.role, host: st.hostId, gameId: st.gameId, phase: st.phase,
    players: st.players.map((p) => `${p.name}${p.connected ? '' : '(off)'}`),
    spectators: st.spectators.map((p) => p.name), queue: st.queue.length, gamePhase: g.phase, turn: g.turnId ?? g.turn,
  });
}

// ---------- invariants over the authoritative state ----------
// Returns a list of violations (empty when the room is consistent).
function roomViolations(room, snap) {
  const v = [];
  const ids = room.members.map((m) => m.id);
  const byId = new Map(room.members.map((m) => [m.id, m]));
  const dup = (arr) => arr.filter((x, i) => arr.indexOf(x) !== i);
  if (room.members.some((m) => m.key !== m.id)) v.push('member map key differs from member id');
  if (dup(room.seats).length) v.push(`duplicate seats ${dup(room.seats)}`);
  if (dup(room.specs).length) v.push(`duplicate spectators ${dup(room.specs)}`);
  if (dup(room.queue).length) v.push(`duplicate queue entries ${dup(room.queue)}`);
  for (const id of room.seats) if (room.specs.includes(id)) v.push(`${id} is both seated and spectating`);
  for (const id of [...room.seats, ...room.specs]) if (!byId.has(id)) v.push(`seat/spectator ${id} is not a member`);
  for (const id of ids) if (!room.seats.includes(id) && !room.specs.includes(id)) v.push(`ghost member ${id} (${byId.get(id).name}) has no seat and is not spectating`);
  for (const id of room.seats) if (byId.get(id) && byId.get(id).role !== 'player') v.push(`seated ${id} has role ${byId.get(id).role}`);
  for (const id of room.specs) if (byId.get(id) && byId.get(id).role !== 'spectator') v.push(`spectator ${id} has role ${byId.get(id).role}`);
  for (const id of room.queue) if (!room.specs.includes(id)) v.push(`queued ${id} is not a spectator`);
  if (ids.length && !byId.has(room.hostId)) v.push(`host ${room.hostId} is not a member`);
  if (room.phase === 'lobby' && room.seats.length > room.cap) v.push(`lobby has ${room.seats.length} seats over the cap of ${room.cap}`);
  if (room.phase === 'game' && !room.hasGame) v.push('phase is game but there is no game');
  if (room.phase === 'lobby' && room.hasGame) v.push('phase is lobby but a game object remains');
  const tokens = room.members.map((m) => m.token);
  if (dup(tokens).length) v.push('two members share one token');
  const sids = room.members.map((m) => m.socketId).filter(Boolean);
  if (dup(sids).length) v.push('two members share one socket');
  for (const m of room.members) {
    if (m.connected !== !!m.socketId) v.push(`${m.name}: connected=${m.connected} but socketId=${m.socketId}`);
    if (m.socketId && snap) {
      const s = snap.sockets.find((x) => x.id === m.socketId);
      if (!s) v.push(`${m.name} points at socket ${m.socketId}, which no longer exists`);
      else if (s.code !== room.code || s.memberId !== m.id) v.push(`${m.name}'s socket belongs to ${s.code}/${s.memberId}`);
      else if (!s.rooms.includes(room.code)) v.push(`${m.name}'s socket is not in the Socket.IO room`);
    }
  }
  for (const [target, voters] of Object.entries(room.votes)) {
    if (!byId.has(target)) v.push(`kick votes kept for departed ${target}`);
    for (const x of voters) if (!byId.has(x)) v.push(`kick vote kept from departed ${x}`);
  }
  for (const x of Object.keys(room.nextVotes)) if (!byId.has(x)) v.push(`next-game vote kept from departed ${x}`);
  return v;
}

// Global checks across all rooms and sockets.
function snapshotViolations(snap) {
  const v = [];
  for (const room of snap.rooms) v.push(...roomViolations(room, snap).map((x) => `${room.code}: ${x}`));
  for (const s of snap.sockets) {
    if (!s.code) {
      if (s.rooms.length > 1) v.push(`socket ${s.id} has no party but is still in ${s.rooms.filter((r) => r !== s.id)}`);
      continue;
    }
    const room = snap.rooms.find((r) => r.code === s.code);
    const m = room && room.members.find((x) => x.id === s.memberId);
    if (!m) v.push(`socket ${s.id} claims ${s.code}/${s.memberId}, which does not exist`);
    else if (m.socketId !== s.id) v.push(`socket ${s.id} claims ${m.name}, whose socket is ${m.socketId}`);
    const extra = s.rooms.filter((r) => r !== s.id && r !== s.code);
    if (extra.length) v.push(`socket ${s.id} is also in ${extra}`);
  }
  return v;
}

// Every client in the party agrees with the server on who is seated, watching, queued and hosting.
function viewViolations(room, clients) {
  const v = [];
  for (const c of clients) {
    const st = c.state;
    // An offline client legitimately holds a stale view until it reconnects.
    if (!st || st.code !== room.code || !c.s.connected || c.flags.replaced) continue;
    const mine = room.members.find((m) => m.id === st.you);
    if (!mine) {
      v.push(`${c.name} still shows itself in ${room.code} as ${st.you}, which is not a member`);
      continue;
    }
    if (st.role !== mine.role) v.push(`${c.name} sees role ${st.role}, server has ${mine.role}`);
    const seen = st.players.map((p) => p.id).join();
    if (seen !== room.seats.join()) v.push(`${c.name} sees players [${seen}], server has [${room.seats.join()}]`);
    const specs = st.spectators.map((p) => p.id).join();
    if (specs !== room.specs.join()) v.push(`${c.name} sees spectators [${specs}], server has [${room.specs.join()}]`);
    if (st.queue.join() !== room.queue.join()) v.push(`${c.name} sees queue [${st.queue}], server has [${room.queue}]`);
    if (st.hostId !== room.hostId) v.push(`${c.name} sees host ${st.hostId}, server has ${room.hostId}`);
    if (st.phase !== room.phase) v.push(`${c.name} sees phase ${st.phase}, server has ${room.phase}`);
    if (st.gameId !== room.gameId) v.push(`${c.name} sees game ${st.gameId}, server has ${room.gameId}`);
    for (const p of [...st.players, ...st.spectators]) {
      const m = room.members.find((x) => x.id === p.id);
      if (m && m.connected !== p.connected) v.push(`${c.name} sees ${p.name} connected=${p.connected}, server has ${m.connected}`);
    }
  }
  return v;
}

// ---------- reporting ----------
function reporter(suite) {
  const r = { suite, passed: 0, failed: 0, failures: [], timings: [], started: Date.now() };
  r.ok = (cond, msg) => {
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
    if (cond) r.passed++;
    else {
      r.failed++;
      r.failures.push(msg);
    }
    return !!cond;
  };
  // Records the violations (or a pass) for a consistency check.
  r.clean = (violations, msg) => {
    if (!violations.length) return r.ok(true, msg);
    return r.ok(false, `${msg}: ${violations.slice(0, 6).join('; ')}${violations.length > 6 ? ` (+${violations.length - 6} more)` : ''}`);
  };
  r.artifact = (name, data) => {
    try {
      const dir = path.join(ARTIFACTS, suite);
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${name.replace(/[^a-z0-9-]+/gi, '-').slice(0, 80)}.json`);
      fs.writeFileSync(file, JSON.stringify(data, null, 1));
      return path.relative(ROOT, file);
    } catch (e) {
      return `(could not write artifact: ${e.message})`;
    }
  };
  return r;
}

// Runs one named scenario with a hard time limit. A failure is recorded with an artifact
// (server log, server errors, snapshot, each client's last events) and the suite moves on.
async function scenario(r, server, name, clients, fn, limitMs = 60000) {
  const t0 = Date.now();
  const errorsBefore = server.errors.length;
  let timer;
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`scenario exceeded ${limitMs} ms`)), limitMs);
      }),
    ]);
  } catch (err) {
    r.ok(false, `${name}: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
  const newErrors = server.errors.slice(errorsBefore);
  r.ok(newErrors.length === 0, `${name}: the server logged no handler or loop errors${newErrors.length ? ` (got: ${newErrors[0].slice(0, 300)})` : ''}`);
  const ms = Date.now() - t0;
  r.timings.push({ name, ms });
  if (r.failures.some((f) => f.startsWith(name))) {
    let snap = null;
    try {
      snap = await server.snapshot();
    } catch (e) {
      snap = { error: e.message };
    }
    const file = r.artifact(name, {
      scenario: name,
      seed: server.seed,
      failures: r.failures.filter((f) => f.startsWith(name)),
      serverErrors: newErrors,
      serverLog: server.log.slice(-200),
      snapshot: snap,
      clients: (typeof clients === 'function' ? clients() : clients).map((c) => ({ name: c.name, token: c.token, code: c.code, state: c.state, counts: c.counts, lastEvents: c.events.slice(-40) })),
    });
    console.log(`      artifact: ${file}`);
  }
  console.log(`      (${name}: ${ms} ms)`);
}

function finish(r, extra = '') {
  const total = Date.now() - r.started;
  console.log(`\n${r.suite}: ${r.passed} passed, ${r.failed} failed in ${(total / 1000).toFixed(1)} s${extra}`);
  if (r.failed) {
    console.log('Failures:');
    r.failures.forEach((f) => console.log('  - ' + f));
  }
  return r.failed ? 1 : 0;
}

module.exports = { startServer, Client, mark, tok, roomViolations, snapshotViolations, viewViolations, reporter, scenario, finish, summary, ARTIFACTS, ROOT };
