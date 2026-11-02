// Lobbies: seats, spectators, host controls, links, chat, and the game loop.
// Everything lives in memory. Nothing is saved to disk.
const crypto = require('crypto');
const config = require('./config');
const { GAMES, HIDDEN, selectable } = require('./games');
const filter = require('./filter');
const { clampInt, shuffle, Bucket } = require('./util');
const bots = require('./bots');

const rooms = new Map();
let io = null;

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  let c;
  do {
    c = Array.from(crypto.randomBytes(6), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
  } while (rooms.has(c));
  return c;
}
const newId = () => crypto.randomBytes(6).toString('hex');

function cleanProfile(p) {
  p = p && typeof p === 'object' ? p : {};
  const a = p.avatar && typeof p.avatar === 'object' ? p.avatar : {};
  return {
    name: filter.cleanName(p.name),
    avatar: {
      e: clampInt(a.e, 0, config.AVATAR_EMOJIS - 1, 0),
      c: clampInt(a.c, 0, config.AVATAR_COLORS - 1, 0),
    },
  };
}
const validToken = (t) => typeof t === 'string' && /^[a-f0-9]{16,64}$/.test(t);

// A party can exist before anyone picks a game: room.gameId is then null, nothing can start,
// and everyone gets a seat up to PARTY_MAX. The host chooses the game later in the same room.
const gameOf = (room) => (room.gameId ? GAMES[room.gameId] : null);
const PARTY_MAX = Math.max(...Object.keys(GAMES).filter(selectable).map((id) => GAMES[id].meta.maxPlayers));
const seatCap = (room) => (room.gameId ? Math.min(gameOf(room).meta.maxPlayers, room.maxPlayers) : room.maxPlayers);
const member = (room, id) => room.members.get(id);
const humans = (room) => [...room.members.values()].filter((x) => !x.bot);
const hasBots = (room) => [...room.members.values()].some((x) => x.bot);
const seated = (room) => room.seats.map((id) => room.members.get(id)).filter(Boolean);

// Lobby actions that post system chat (seat changes, vote-kick, lock) share one
// bucket per member, so reconnecting doesn't reset it.
const lobbyLimited = (m) => !(m.lobbyBucket || (m.lobbyBucket = new Bucket(0.5, 4))).take();
// Chat is limited per member too, so reconnecting a socket doesn't refill it.
const chatLimited = (m) => !(m.chatBucket || (m.chatBucket = new Bucket(1, 5))).take();

// Hosting goes to someone connected (and passing `fits`): seated players first, then spectators.
function pickHost(room, exceptId, fits = () => true) {
  const order = [...room.seats, ...room.specs].filter((id) => id !== exceptId).map((id) => room.members.get(id)).filter(Boolean);
  return order.find((x) => !x.bot && x.connected && fits(x)) || null;
}
function setHost(room, m, why) {
  if (!m || room.hostId === m.id) return;
  room.hostId = m.id;
  sys(room, why ? `${m.name} is now the host (${why}).` : `${m.name} is now the host.`, 'accent');
  broadcast(room);
}

// Spectators who asked to play wait in room.queue. Open seats in the lobby go to them in order.
function unqueue(room, id) {
  room.queue = room.queue.filter((x) => x !== id);
}
function seatSpectator(room, m) {
  room.specs = room.specs.filter((x) => x !== m.id);
  unqueue(room, m.id);
  room.seats.push(m.id);
  m.role = 'player';
}
function fillFromQueue(room) {
  if (room.phase !== 'lobby') return;
  while (room.seats.length < seatCap(room)) {
    const m = room.queue.map((id) => room.members.get(id)).find((x) => x && x.role === 'spectator' && x.connected);
    if (!m) break;
    seatSpectator(room, m);
    sys(room, `${m.name} took an open seat from the queue.`);
    emitTo(room, m, 'notice', "A seat opened up, so you're playing next.");
  }
}

function voteTally(room) {
  const t = {};
  for (const g of room.nextVotes.values()) t[g] = (t[g] || 0) + 1;
  return t;
}

// ---------- sending ----------
function emitTo(room, m, ev, data) {
  if (m && m.socketId) io.to(m.socketId).emit(ev, data);
}

function chat(room, msg, onlyFor) {
  msg.at = Date.now();
  if (!onlyFor) {
    room.chatLog.push(msg);
    if (room.chatLog.length > 60) room.chatLog.shift();
    io.to(room.code).emit('chat', msg);
    return;
  }
  for (const m of room.members.values()) if (onlyFor(m)) emitTo(room, m, 'chat', msg);
}
const sys = (room, text, style = 'info') => chat(room, { kind: 'sys', text, style });

function pub(m) {
  const o = { id: m.id, name: m.name, avatar: m.avatar, connected: m.connected, score: m.score, ready: !!m.ready };
  if (m.bot) {
    o.bot = true;
    o.difficulty = m.difficulty;
  }
  return o;
}

// What the lobby needs to show Add Bot: whether this game has bots, why not, and whether a bot fits now.
function botState(room) {
  const i = bots.info(room.gameId);
  const count = room.seats.filter((id) => room.members.get(id) && room.members.get(id).bot).length;
  let canAdd = i.supported;
  let reason = i.supported ? '' : i.reason;
  if (canAdd && room.isPublic) (canAdd = false), (reason = 'Bots are for private parties. Make this party private to add one.');
  else if (canAdd && room.phase !== 'lobby') (canAdd = false), (reason = 'Add bots between games.');
  else if (canAdd && room.seats.length >= seatCap(room)) (canAdd = false), (reason = 'Every seat is taken.');
  return { ...i, count, canAdd, reason };
}

function view(room, m) {
  const G = gameOf(room);
  const now = Date.now();
  return {
    code: room.code,
    name: room.name,
    you: m.id,
    role: m.role,
    hostId: room.hostId,
    gameId: room.gameId,
    isPublic: room.isPublic,
    locked: room.locked,
    spectatorsOn: room.spectatorsOn,
    maxSpectators: room.maxSpectators,
    maxPlayers: seatCap(room),
    settings: room.gameId ? room.settings[room.gameId] : null,
    phase: room.phase,
    autoStartIn: room.autoStartAt ? Math.max(0, room.autoStartAt - now) : null,
    players: seated(room).map(pub),
    spectators: room.specs.map((id) => room.members.get(id)).filter(Boolean).map(pub),
    queue: room.queue.slice(),
    nextVotes: voteTally(room),
    myVote: room.nextVotes.get(m.id) || null,
    game: room.phase === 'game' && room.game && G ? G.view(room.game, m, now) : null,
    lastResult: room.lastResult,
    bots: botState(room),
  };
}

// Several changes in one tick are sent as one update.
function broadcast(room) {
  if (room.dirty) return;
  room.dirty = true;
  setImmediate(() => {
    room.dirty = false;
    if (!rooms.has(room.code)) return;
    for (const m of room.members.values()) if (m.socketId) emitTo(room, m, 'state', view(room, m));
  });
}

// ---------- the API games get ----------
function makeApi(room) {
  return {
    now: () => Date.now(),
    seated: () => seated(room),
    member: (id) => room.members.get(id),
    gameCount: () => room.gameCount,
    changed: () => broadcast(room),
    sys: (text, style) => sys(room, text, style),
    chat: (msg, onlyFor) => chat(room, msg, onlyFor),
    toMember: (id, ev, data) => emitTo(room, room.members.get(id), ev, data),
    toRoom: (ev, data) => io.to(room.code).emit(ev, data),
    end: (result) => endGame(room, result),
    // Winner stays: the loser goes to the back of the spectator line and the
    // first spectator takes the seat. Returns the new player's name, if any.
    rotateLoser: (loserId) => {
      const i = room.seats.indexOf(loserId);
      if (i < 0) return null;
      const lm = room.members.get(loserId);
      if (lm && lm.bot) return null; // a bot keeps its seat; it is never benched as a ghost spectator
      // Queued spectators go first (in order), then whoever has been watching longest. Only someone
      // who is connected: like fillFromQueue, never bench the loser for a spectator who has dropped.
      const here = (id) => room.specs.includes(id) && !!room.members.get(id) && room.members.get(id).connected;
      const nextId = room.queue.find(here) || room.specs.find(here);
      if (!nextId) return null;
      const next = room.members.get(nextId);
      const loser = room.members.get(loserId);
      room.specs = room.specs.filter((x) => x !== nextId);
      unqueue(room, nextId);
      room.seats[i] = nextId;
      room.specs.push(loserId);
      room.queue.push(loserId); // the loser waits in line for another turn
      if (next) next.role = 'player';
      if (loser) loser.role = 'spectator';
      if (next) sys(room, `Winner stays: ${next.name} plays next.`, 'accent');
      return next ? next.name : null;
    },
  };
}

// ---------- lifecycle ----------
function createRoom(opts) {
  if (rooms.size >= config.MAX_ROOMS) return null;
  opts = opts && typeof opts === 'object' ? opts : {};
  // `game: null` asks for a party with no game yet. Older clients that omit `game` still get Draw & Guess.
  const gameId = opts.game === null ? null : selectable(opts.game) ? opts.game : 'drawguess';
  const G = gameId ? GAMES[gameId] : null;
  const room = {
    code: newCode(),
    name: '',
    gameId,
    hostId: null,
    isPublic: !!opts.isPublic,
    locked: false,
    spectatorsOn: opts.spectatorsOn !== false,
    maxSpectators: clampInt(opts.maxSpectators, 0, 50, 20),
    maxPlayers: G ? clampInt(opts.maxPlayers, G.meta.minPlayers, G.meta.maxPlayers, G.meta.maxPlayers) : PARTY_MAX,
    settings: {},
    members: new Map(),
    seats: [],
    specs: [],
    queue: [],
    nextVotes: new Map(),
    phase: 'lobby',
    game: null,
    lastResult: null,
    banned: new Set(),
    votes: new Map(),
    chatLog: [],
    gameCount: 0,
    autoStartAt: null,
    lobbySince: Date.now(), // host idleness only counts from when the lobby began
    emptySince: Date.now(),
    dirty: false,
  };
  for (const id of Object.keys(GAMES)) room.settings[id] = { ...GAMES[id].defaults };
  if (G) room.settings[gameId] = G.sanitizeSettings(opts.settings, room.settings[gameId]);
  room.api = makeApi(room);
  rooms.set(room.code, room);
  return room;
}

function attachSocket(socket, room, m) {
  // A socket owns one seat. If it was already attached to another room or to a
  // different member of this room, release that one so it can't stay "connected" forever.
  if (socket.data.code && (socket.data.code !== room.code || socket.data.memberId !== m.id)) leaveBySocket(socket);
  if (m.socketId && m.socketId !== socket.id) {
    const old = io.sockets.sockets.get(m.socketId);
    if (old) {
      old.emit('replaced');
      old.leave(room.code);
      old.data.code = null;
      old.data.memberId = null;
    }
  }
  m.socketId = socket.id;
  m.connected = true;
  m.lastActive = Date.now();
  socket.join(room.code);
  socket.data.code = room.code;
  socket.data.memberId = m.id;
}

function syncNewcomer(socket, room, m) {
  socket.emit('chatHistory', room.chatLog);
  const G = gameOf(room);
  if (room.phase === 'game' && room.game && G.syncFor) G.syncFor(room.game, m, (ev, d) => socket.emit(ev, d));
}

function roomInfo(room) {
  const G = gameOf(room);
  return { gameId: room.gameId, gameName: G ? G.meta.name : 'party', players: room.seats.length, max: seatCap(room) };
}

function joinRoom(socket, room, profile, token) {
  let m = [...room.members.values()].find((x) => x.token === token);
  if (m) {
    attachSocket(socket, room, m);
    syncNewcomer(socket, room, m);
    broadcast(room);
    return { ok: true, code: room.code, role: m.role, rejoined: true };
  }
  if (room.banned.has(token)) return { error: 'kicked', ...roomInfo(room) };
  if (room.locked) return { error: 'locked', ...roomInfo(room) };

  const G = gameOf(room);
  const cap = seatCap(room);
  // If this socket is swapping identities in this room, its old member is released on
  // attach, so don't count that member's seat against the newcomer.
  const prev = socket.data.code === room.code ? socket.data.memberId : null;
  const seatsUsed = room.seats.length - (prev && room.seats.includes(prev) ? 1 : 0);
  const specsUsed = room.specs.length - (prev && room.specs.includes(prev) ? 1 : 0);
  let role;
  if (seatsUsed < cap && (room.phase === 'lobby' || (G && G.meta.midJoin))) role = 'player';
  else if (room.spectatorsOn && specsUsed < room.maxSpectators) role = 'spectator';
  else return { error: 'full', ...roomInfo(room) };

  const p = cleanProfile(profile);
  m = { id: newId(), token, name: p.name, avatar: p.avatar, socketId: null, connected: true, lastSeen: Date.now(), lastActive: Date.now(), score: 0, role };
  room.members.set(m.id, m);
  (role === 'player' ? room.seats : room.specs).push(m.id);
  if (!room.hostId) room.hostId = m.id;
  if (!room.name) room.name = `${m.name}'s Party`;
  room.emptySince = null;
  attachSocket(socket, room, m);
  if (role === 'player' && room.phase === 'game' && room.game && G.onJoin) G.onJoin(room.game, m, room.api);
  sys(room, `${m.name} joined${role === 'spectator' ? ' to watch' : ''}.`);
  syncNewcomer(socket, room, m);
  broadcast(room);

  let notice = null;
  if (role === 'spectator' && !G) {
    notice = `This party is full (${cap} players), so you're spectating.`;
  } else if (role === 'spectator') {
    if (room.seats.length >= cap) {
      const seatsText = cap === 2 ? 'Both seats are taken' : `All ${cap} seats are taken`;
      notice = `This lobby is playing ${G.meta.name} (max ${cap} players). ${seatsText}, so you're spectating.`;
    } else {
      notice = `A match is in progress, so you're spectating. Take a seat when it ends.`;
    }
  }
  return { ok: true, code: room.code, role, notice };
}

function removeMember(room, id, how = 'left') {
  const m = room.members.get(id);
  if (!m) return;
  room.members.delete(id);
  const wasPlayer = room.seats.includes(id);
  room.seats = room.seats.filter((x) => x !== id);
  room.specs = room.specs.filter((x) => x !== id);
  unqueue(room, id);
  room.nextVotes.delete(id);
  room.votes.delete(id);
  for (const set of room.votes.values()) set.delete(id);
  if (m.socketId) {
    const s = io.sockets.sockets.get(m.socketId);
    if (s) {
      s.leave(room.code);
      s.data.code = null;
      s.data.memberId = null;
    }
  }
  if (how !== 'quiet') sys(room, how === 'kicked' ? `${m.name} was removed from the lobby.` : how === 'bot' ? `${m.name} was removed.` : `${m.name} left.`);
  if (room.hostId === id) {
    // Prefer someone connected; if everyone left is offline, keep a host anyway.
    const h = pickHost(room, id) || humans(room).find((x) => x.id !== id);
    room.hostId = null;
    if (h) setHost(room, h);
  }
  if (wasPlayer && room.phase === 'game' && room.game) gameOf(room).onLeave(room.game, id, room.api);
  if (wasPlayer) fillFromQueue(room);
  // Bots never outlive the last person: no ghost members, no bot-only rooms.
  if (!m.bot && !humans(room).length) for (const b of [...room.members.values()]) removeMember(room, b.id, 'quiet');
  if (room.members.size === 0) room.emptySince = Date.now();
  broadcast(room);
}

function leaveBySocket(socket) {
  const room = rooms.get(socket.data.code);
  if (room && socket.data.memberId) removeMember(room, socket.data.memberId);
  socket.data.code = null;
  socket.data.memberId = null;
}

function startGame(room) {
  const G = gameOf(room);
  if (!G || room.phase !== 'lobby' || room.seats.length < G.meta.minPlayers) return false;
  if (G.meta.resetScores) for (const m of seated(room)) m.score = 0;
  for (const m of room.members.values()) m.ready = !!m.bot; // readiness is asked again for every rematch
  room.gameCount++;
  room.game = G.create(room.settings[room.gameId]);
  room.phase = 'game';
  room.lastResult = null;
  room.autoStartAt = null;
  room.nextVotes.clear();
  G.start(room.game, room.api);
  broadcast(room);
  return true;
}

function endGame(room, result) {
  room.phase = 'lobby';
  room.game = null;
  room.lastResult = result;
  room.autoStartAt = null;
  room.lobbySince = Date.now();
  fillFromQueue(room);
  broadcast(room);
}

// ---------- public lobby list + quick play ----------
function listPublic() {
  const out = [];
  for (const r of rooms.values()) {
    if (!r.isPublic || r.members.size === 0 || HIDDEN.has(r.gameId) || hasBots(r)) continue;
    const host = r.members.get(r.hostId);
    out.push({
      code: r.code,
      name: r.name,
      gameId: r.gameId,
      gameName: r.gameId ? gameOf(r).meta.name : null,
      host: host ? host.name : '',
      players: r.seats.length,
      max: seatCap(r),
      spectators: r.specs.length,
      spectatorsOn: r.spectatorsOn && r.specs.length < r.maxSpectators,
      locked: r.locked,
      phase: r.phase,
    });
  }
  out.sort((a, b) => b.players - a.players);
  return out.slice(0, 100);
}

function findQuickRoom(gameId) {
  let best = null;
  for (const r of rooms.values()) {
    if (!r.isPublic || r.locked || r.gameId !== gameId || HIDDEN.has(r.gameId) || hasBots(r)) continue;
    if (![...r.members.values()].some((m) => m.connected)) continue;
    const open = r.seats.length < seatCap(r) && (r.phase === 'lobby' || gameOf(r).meta.midJoin);
    if (!open) continue;
    if (!best || r.seats.length > best.seats.length) best = r;
  }
  return best;
}

// ---------- the loop: timers, cleanup, auto start ----------
function loop() {
  const now = Date.now();
  for (const room of rooms.values()) {
    try {
      if (room.phase === 'game' && room.game) {
        const G = gameOf(room);
        if (G.tick) G.tick(room.game, room.api, now);
        if (room.phase === 'game' && room.game) bots.drive(room, G, now);
      }
      for (const m of [...room.members.values()]) {
        if (!m.connected && now - m.lastSeen > config.DISCONNECT_GRACE_MS) removeMember(room, m.id);
      }
      if (room.members.size && !humans(room).length) {
        for (const b of [...room.members.values()]) removeMember(room, b.id, 'quiet');
      }
      if (room.members.size === 0) {
        if (now - (room.emptySince || now) > config.EMPTY_ROOM_TTL_MS) rooms.delete(room.code);
        continue;
      }
      // A host who dropped (or went idle in the lobby) shouldn't hold everyone up. They keep their seat.
      const host = room.members.get(room.hostId);
      if (!host) {
        setHost(room, pickHost(room));
      } else if (!host.connected && now - host.lastSeen > config.HOST_GRACE_MS) {
        setHost(room, pickHost(room, host.id), `${host.name} disconnected`);
      } else if (host.connected && room.phase === 'lobby' && now - Math.max(host.lastActive, room.lobbySince) > config.HOST_AFK_MS) {
        setHost(room, pickHost(room, host.id, (x) => now - x.lastActive < config.HOST_AFK_MS), `${host.name} is away`);
      }
      // Public lobbies start by themselves so nobody waits on an idle host.
      const G = gameOf(room);
      const ready = !!G && room.isPublic && room.phase === 'lobby' && seated(room).filter((m) => m.connected).length >= G.meta.minPlayers;
      if (ready && !room.autoStartAt) {
        room.autoStartAt = now + config.AUTOSTART_MS;
        broadcast(room);
      } else if (!ready && room.autoStartAt) {
        room.autoStartAt = null;
        broadcast(room);
      } else if (ready && now >= room.autoStartAt) {
        startGame(room);
      }
    } catch (err) {
      console.error('room loop error', room.code, err);
    }
  }
}

// ---------- socket handlers ----------
function attach(ioServer) {
  io = ioServer;
  setInterval(loop, 250);

  io.on('connection', (socket) => {
    const drawBucket = new Bucket(3000, 6000);
    const actionBucket = new Bucket(10, 20);
    const joinBucket = new Bucket(0.5, 5);

    const ctx = () => {
      const room = rooms.get(socket.data.code);
      const m = room && room.members.get(socket.data.memberId);
      if (m) m.lastActive = Date.now();
      return room && m ? { room, m } : null;
    };
    const hostCtx = () => {
      const c = ctx();
      return c && c.room.hostId === c.m.id ? c : null;
    };
    const on = (ev, fn) =>
      socket.on(ev, (...args) => {
        try {
          fn(...args);
        } catch (err) {
          console.error('handler error', ev, err);
        }
      });
    const reply = (ack, data) => {
      if (typeof ack === 'function') ack(data);
    };

    on('createRoom', (opts, ack) => {
      if (!joinBucket.take()) return reply(ack, { error: 'slow' });
      opts = opts && typeof opts === 'object' ? opts : {};
      if (!validToken(opts.token)) return reply(ack, { error: 'bad' });
      const room = createRoom(opts);
      if (!room) return reply(ack, { error: 'busy' });
      reply(ack, joinRoom(socket, room, opts.profile, opts.token));
    });

    on('joinRoom', (opts, ack) => {
      if (!joinBucket.take()) return reply(ack, { error: 'slow' });
      opts = opts && typeof opts === 'object' ? opts : {};
      if (!validToken(opts.token)) return reply(ack, { error: 'bad' });
      const code = String(opts.code || '').toUpperCase();
      const room = rooms.get(code);
      if (!room) return reply(ack, { error: 'closed' });
      reply(ack, joinRoom(socket, room, opts.profile, opts.token));
    });

    on('quickPlay', (opts, ack) => {
      if (!joinBucket.take()) return reply(ack, { error: 'slow' });
      opts = opts && typeof opts === 'object' ? opts : {};
      if (!validToken(opts.token)) return reply(ack, { error: 'bad' });
      const gameId = selectable(opts.game) ? opts.game : 'drawguess';
      const room = findQuickRoom(gameId) || createRoom({ game: gameId, isPublic: true });
      if (!room) return reply(ack, { error: 'busy' });
      reply(ack, joinRoom(socket, room, opts.profile, opts.token));
    });

    on('leaveRoom', () => leaveBySocket(socket));

    on('chat', (text) => {
      const c = ctx();
      if (!c || chatLimited(c.m)) return;
      const clean = filter.cleanChat(text);
      if (!clean) return;
      const G = gameOf(c.room);
      if (c.room.phase === 'game' && c.room.game && G.onChat && G.onChat(c.room.game, c.m, clean, c.room.api)) return;
      chat(c.room, { kind: 'msg', id: c.m.id, name: c.m.name, text: clean, spectator: c.m.role === 'spectator' });
    });

    on('action', (a) => {
      const c = ctx();
      if (!c || !actionBucket.take()) return;
      const G = gameOf(c.room);
      if (c.room.phase === 'game' && c.room.game && G.onAction) G.onAction(c.room.game, c.m, a, c.room.api);
    });

    on('draw', (d) => {
      const c = ctx();
      if (!c) return;
      const cost = d && Array.isArray(d.pts) ? d.pts.length / 2 : 1;
      if (!drawBucket.take(cost)) return;
      const G = gameOf(c.room);
      if (c.room.phase !== 'game' || !c.room.game || !G.onDraw) return;
      const relay = G.onDraw(c.room.game, c.m, d, c.room.api);
      if (relay) socket.to(c.room.code).emit('draw', relay);
    });

    on('takeSeat', () => {
      const c = ctx();
      if (!c || c.m.role !== 'spectator') return;
      const { room, m } = c;
      if (lobbyLimited(m)) return;
      const G = gameOf(room);
      if (room.seats.length >= seatCap(room)) return socket.emit('notice', 'No seat is open right now.');
      if (room.phase !== 'lobby' && !(G && G.meta.midJoin)) return socket.emit('notice', 'Wait for this match to end.');
      seatSpectator(room, m);
      if (room.phase === 'game' && room.game && G.onJoin) G.onJoin(room.game, m, room.api);
      sys(room, `${m.name} took a seat.`);
      broadcast(room);
    });

    // Spectators line up for the next open seat (and for winner-stays rotation).
    on('queue', (want) => {
      const c = ctx();
      if (!c || c.m.role !== 'spectator') return;
      const { room, m } = c;
      const inLine = room.queue.includes(m.id);
      if (!!want === inLine || lobbyLimited(m)) return;
      if (want) room.queue.push(m.id);
      else unqueue(room, m.id);
      fillFromQueue(room);
      broadcast(room);
    });

    // Anyone in the room can suggest the next game while in the lobby. The host decides.
    on('voteNext', (gameId) => {
      const c = ctx();
      if (!c || c.room.phase !== 'lobby') return;
      const { room, m } = c;
      if (gameId === null) {
        if (!room.nextVotes.delete(m.id)) return;
      } else if (selectable(gameId)) {
        if (room.nextVotes.get(m.id) === gameId || lobbyLimited(m)) return;
        room.nextVotes.set(m.id, gameId);
      } else return;
      broadcast(room);
    });

    // Readiness is advisory: it tells the host who is set, but never blocks or launches a game.
    on('setReady', (want) => {
      const c = ctx();
      if (!c || c.room.phase !== 'lobby') return;
      const { room, m } = c;
      if (!!want === !!m.ready || lobbyLimited(m)) return;
      m.ready = !!want;
      broadcast(room);
    });

    on('watch', () => {
      const c = ctx();
      if (!c || c.m.role !== 'player' || c.room.phase !== 'lobby') return;
      const { room, m } = c;
      if (lobbyLimited(m)) return;
      room.seats = room.seats.filter((x) => x !== m.id);
      room.specs.push(m.id);
      m.role = 'spectator';
      sys(room, `${m.name} is now watching.`);
      fillFromQueue(room);
      broadcast(room);
    });

    // ----- host controls -----
    on('hostUpdate', (patch) => {
      const c = hostCtx();
      if (!c || !patch || typeof patch !== 'object') return;
      const { room } = c;
      const G = gameOf(room);
      if ('isPublic' in patch) {
        if (patch.isPublic && hasBots(room)) emitTo(room, c.m, 'notice', 'Remove the bots before making this party public.');
        else room.isPublic = !!patch.isPublic;
      }
      if ('locked' in patch && !!patch.locked !== room.locked && !lobbyLimited(c.m)) {
        room.locked = !!patch.locked;
        sys(room, room.locked ? 'The host locked the lobby. No new people can join.' : 'The host unlocked the lobby.', 'accent');
      }
      if ('spectatorsOn' in patch) room.spectatorsOn = !!patch.spectatorsOn;
      if ('maxSpectators' in patch) room.maxSpectators = clampInt(patch.maxSpectators, 0, 50, room.maxSpectators);
      if ('maxPlayers' in patch && G) {
        const lowest = Math.max(G.meta.minPlayers, room.seats.length);
        room.maxPlayers = clampInt(patch.maxPlayers, lowest, G.meta.maxPlayers, room.maxPlayers);
        fillFromQueue(room);
      }
      if ('settings' in patch && room.phase === 'lobby' && G) {
        room.settings[room.gameId] = G.sanitizeSettings(patch.settings, room.settings[room.gameId]);
      }
      broadcast(room);
    });

    on('switchGame', (opts) => {
      const c = hostCtx();
      if (!c || !opts || !selectable(opts.game)) return;
      const { room } = c;
      if (room.phase !== 'lobby' || opts.game === room.gameId) return;
      const G2 = GAMES[opts.game];
      // A party bigger than the game only fits if the extra people can watch.
      if (room.seats.length > G2.meta.maxPlayers && !room.spectatorsOn) {
        return socket.emit('notice', `${G2.meta.name} seats ${G2.meta.maxPlayers}. Allow spectators in Party Settings so everyone else can watch.`);
      }
      // Bots only come along to games they can play, and never as spectators.
      const dropBots = (pred) => {
        for (const b of [...room.members.values()]) if (b.bot && pred(b)) removeMember(room, b.id, 'quiet');
      };
      if (!bots.supported(opts.game)) {
        if (hasBots(room)) sys(room, `Bots were removed: ${bots.info(opts.game).reason}`, 'warn');
        dropBots(() => true);
      } else {
        const keepable = bots.info(opts.game).difficulties;
        for (const b of room.members.values()) if (b.bot && !keepable.includes(b.difficulty)) b.difficulty = keepable.includes('normal') ? 'normal' : keepable[0];
        const over = room.seats.length - G2.meta.maxPlayers;
        if (over > 0) {
          const spare = room.seats.filter((id) => room.members.get(id).bot).slice(-over);
          for (const id of spare) removeMember(room, id, 'quiet');
          if (spare.length) sys(room, `${spare.length} bot${spare.length === 1 ? ' was' : 's were'} removed to make room for people.`, 'info');
        }
      }
      room.gameId = opts.game;
      room.maxPlayers = G2.meta.maxPlayers;
      room.lastResult = null;
      room.game = null;
      room.autoStartAt = null; // a new game restarts the public countdown
      room.nextVotes.clear();
      const cap = G2.meta.maxPlayers;
      if (room.seats.length > cap) {
        let chosen = Array.isArray(opts.seats) ? opts.seats.filter((id) => room.seats.includes(id)) : [];
        chosen = [...new Set(chosen)].slice(0, cap);
        const rest = shuffle(room.seats.filter((id) => !chosen.includes(id)));
        while (chosen.length < cap) chosen.push(rest.shift());
        const moved = room.seats.filter((id) => !chosen.includes(id));
        room.seats = room.seats.filter((id) => chosen.includes(id));
        room.specs = [...moved, ...room.specs];
        room.queue = [...moved, ...room.queue.filter((id) => !moved.includes(id))]; // bumped players get the next open seats
        for (const id of moved) {
          const m = room.members.get(id);
          m.role = 'spectator';
          emitTo(room, m, 'notice', `Switched to ${G2.meta.name} (${cap} players). You're spectating and first in line for an open seat.`);
        }
      } else {
        while (room.seats.length < cap && room.specs.length) {
          const id = room.specs.shift();
          room.seats.push(id);
          unqueue(room, id);
          const m = room.members.get(id);
          m.role = 'player';
          emitTo(room, m, 'notice', `Switched to ${G2.meta.name}. You've been given a seat.`);
        }
      }
      for (const m of room.members.values()) m.score = 0;
      sys(room, `The host switched the game to ${G2.meta.name}.`, 'accent');
      broadcast(room);
    });

    // ----- bots (host only, private parties, lobby only) -----
    on('addBot', (opts) => {
      const c = hostCtx();
      if (!c) return;
      const { room, m } = c;
      if (!(m.botBucket || (m.botBucket = new Bucket(2, 8))).take()) return;
      const st = botState(room);
      if (!st.canAdd) return socket.emit('notice', st.reason);
      const taken = new Set([...room.members.values()].map((x) => x.name));
      const bot = bots.createBot(room.gameId, taken, opts && opts.difficulty);
      room.members.set(bot.id, bot);
      room.seats.push(bot.id);
      sys(room, `${bot.name} joined (bot, ${bot.difficulty}).`);
      broadcast(room);
    });

    on('setBotDifficulty', (opts) => {
      const c = hostCtx();
      if (!c || !opts || typeof opts !== 'object') return;
      const bot = c.room.members.get(opts.id);
      const i = bots.info(c.room.gameId);
      if (!bot || !bot.bot || !i.supported || !i.difficulties.includes(opts.difficulty)) return;
      bot.difficulty = opts.difficulty;
      broadcast(c.room);
    });

    on('startGame', () => {
      const c = hostCtx();
      if (!c) return;
      const G = gameOf(c.room);
      if (!G) return socket.emit('notice', 'Choose a game first.');
      if (!startGame(c.room)) socket.emit('notice', `You need at least ${G.meta.minPlayers} players to start.`);
    });

    // Dismiss the results card so everyone is back in the lobby view.
    on('backToLobby', () => {
      const c = hostCtx();
      if (!c || c.room.phase !== 'lobby' || !c.room.lastResult) return;
      c.room.lastResult = null;
      broadcast(c.room);
    });

    on('transferHost', (id) => {
      const c = hostCtx();
      if (!c || id === c.m.id || lobbyLimited(c.m)) return;
      const target = c.room.members.get(id);
      if (!target || target.bot || !target.connected) return;
      setHost(c.room, target);
      broadcast(c.room);
    });

    on('endGame', () => {
      const c = hostCtx();
      if (!c || c.room.phase !== 'game') return;
      sys(c.room, 'The host ended the game.', 'warn');
      endGame(c.room, null);
    });

    on('kick', (id) => {
      const c = hostCtx();
      if (!c || id === c.m.id) return;
      const target = c.room.members.get(id);
      if (!target) return;
      if (target.bot) return removeMember(c.room, id, 'bot');
      c.room.banned.add(target.token);
      emitTo(c.room, target, 'kicked');
      removeMember(c.room, id, 'kicked');
    });

    on('voteKick', (id) => {
      const c = ctx();
      if (!c || !c.room.isPublic || id === c.m.id) return;
      const { room, m } = c;
      const target = room.members.get(id);
      if (!target || target.bot) return;
      if (room.votes.get(id) && room.votes.get(id).has(m.id)) return;
      if (lobbyLimited(m)) return;
      const voters = [...room.members.values()].filter((x) => !x.bot && x.connected && x.id !== id);
      if (voters.length < 2) return socket.emit('notice', 'Not enough people here for a vote kick.');
      const needed = Math.floor(voters.length / 2) + 1;
      if (!room.votes.has(id)) room.votes.set(id, new Set());
      const set = room.votes.get(id);
      set.add(m.id);
      sys(room, `${m.name} voted to kick ${target.name} (${set.size}/${needed}).`, 'warn');
      if (set.size >= needed) {
        room.banned.add(target.token);
        emitTo(room, target, 'kicked');
        removeMember(room, id, 'kicked');
      }
    });

    on('disconnect', () => {
      const c = ctx();
      if (!c || c.m.socketId !== socket.id) return;
      c.m.connected = false;
      c.m.socketId = null;
      c.m.lastSeen = Date.now();
      broadcast(c.room);
    });
  });
}

module.exports = { attach, listPublic, rooms };
