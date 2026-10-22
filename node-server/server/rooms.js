// Lobbies: seats, spectators, host controls, links, chat, and the game loop.
// Everything lives in memory. Nothing is saved to disk.
const crypto = require('crypto');
const config = require('./config');
const { GAMES } = require('./games');
const filter = require('./filter');
const { clampInt, shuffle, Bucket } = require('./util');

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

const gameOf = (room) => GAMES[room.gameId];
const seatCap = (room) => Math.min(gameOf(room).meta.maxPlayers, room.maxPlayers);
const member = (room, id) => room.members.get(id);
const seated = (room) => room.seats.map((id) => room.members.get(id)).filter(Boolean);

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
  return { id: m.id, name: m.name, avatar: m.avatar, connected: m.connected, score: m.score };
}

function view(room, m) {
  const G = gameOf(room);
  const now = Date.now();
  return {
    code: room.code,
    you: m.id,
    role: m.role,
    hostId: room.hostId,
    gameId: room.gameId,
    isPublic: room.isPublic,
    locked: room.locked,
    spectatorsOn: room.spectatorsOn,
    maxSpectators: room.maxSpectators,
    maxPlayers: seatCap(room),
    settings: room.settings[room.gameId],
    phase: room.phase,
    autoStartIn: room.autoStartAt ? Math.max(0, room.autoStartAt - now) : null,
    players: seated(room).map(pub),
    spectators: room.specs.map((id) => room.members.get(id)).filter(Boolean).map(pub),
    game: room.phase === 'game' && room.game ? G.view(room.game, m, now) : null,
    lastResult: room.lastResult,
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
      if (i < 0 || room.specs.length === 0) return null;
      const nextId = room.specs.shift();
      const next = room.members.get(nextId);
      const loser = room.members.get(loserId);
      room.seats[i] = nextId;
      room.specs.push(loserId);
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
  const gameId = GAMES[opts.game] ? opts.game : 'drawguess';
  const G = GAMES[gameId];
  const room = {
    code: newCode(),
    gameId,
    hostId: null,
    isPublic: !!opts.isPublic,
    locked: false,
    spectatorsOn: opts.spectatorsOn !== false,
    maxSpectators: clampInt(opts.maxSpectators, 0, 50, 20),
    maxPlayers: clampInt(opts.maxPlayers, G.meta.minPlayers, G.meta.maxPlayers, G.meta.maxPlayers),
    settings: {},
    members: new Map(),
    seats: [],
    specs: [],
    phase: 'lobby',
    game: null,
    lastResult: null,
    banned: new Set(),
    votes: new Map(),
    chatLog: [],
    gameCount: 0,
    autoStartAt: null,
    emptySince: Date.now(),
    dirty: false,
  };
  for (const id of Object.keys(GAMES)) room.settings[id] = { ...GAMES[id].defaults };
  room.settings[gameId] = G.sanitizeSettings(opts.settings, room.settings[gameId]);
  room.api = makeApi(room);
  rooms.set(room.code, room);
  return room;
}

function attachSocket(socket, room, m) {
  if (socket.data.code && socket.data.code !== room.code) leaveBySocket(socket);
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
  return { gameId: room.gameId, gameName: G.meta.name, players: room.seats.length, max: seatCap(room) };
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
  let role;
  if (room.seats.length < cap && (room.phase === 'lobby' || G.meta.midJoin)) role = 'player';
  else if (room.spectatorsOn && room.specs.length < room.maxSpectators) role = 'spectator';
  else return { error: 'full', ...roomInfo(room) };

  const p = cleanProfile(profile);
  m = { id: newId(), token, name: p.name, avatar: p.avatar, socketId: null, connected: true, lastSeen: Date.now(), score: 0, role };
  room.members.set(m.id, m);
  (role === 'player' ? room.seats : room.specs).push(m.id);
  if (!room.hostId) room.hostId = m.id;
  room.emptySince = null;
  attachSocket(socket, room, m);
  if (role === 'player' && room.phase === 'game' && room.game && G.onJoin) G.onJoin(room.game, m, room.api);
  sys(room, `${m.name} joined${role === 'spectator' ? ' to watch' : ''}.`);
  syncNewcomer(socket, room, m);
  broadcast(room);

  let notice = null;
  if (role === 'spectator') {
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
  sys(room, how === 'kicked' ? `${m.name} was removed from the lobby.` : `${m.name} left.`);
  if (room.hostId === id) {
    room.hostId = room.seats[0] || room.specs[0] || null;
    const h = room.members.get(room.hostId);
    if (h) sys(room, `${h.name} is now the host.`, 'accent');
  }
  if (wasPlayer && room.phase === 'game' && room.game) gameOf(room).onLeave(room.game, id, room.api);
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
  if (room.phase !== 'lobby' || room.seats.length < G.meta.minPlayers) return false;
  if (G.meta.resetScores) for (const m of seated(room)) m.score = 0;
  room.gameCount++;
  room.game = G.create(room.settings[room.gameId]);
  room.phase = 'game';
  room.lastResult = null;
  room.autoStartAt = null;
  G.start(room.game, room.api);
  broadcast(room);
  return true;
}

function endGame(room, result) {
  room.phase = 'lobby';
  room.game = null;
  room.lastResult = result;
  room.autoStartAt = null;
  broadcast(room);
}

// ---------- public lobby list + quick play ----------
function listPublic() {
  const out = [];
  for (const r of rooms.values()) {
    if (!r.isPublic || r.members.size === 0) continue;
    const host = r.members.get(r.hostId);
    out.push({
      code: r.code,
      gameId: r.gameId,
      gameName: gameOf(r).meta.name,
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
    if (!r.isPublic || r.locked || r.gameId !== gameId) continue;
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
      }
      for (const m of [...room.members.values()]) {
        if (!m.connected && now - m.lastSeen > config.DISCONNECT_GRACE_MS) removeMember(room, m.id);
      }
      if (room.members.size === 0) {
        if (now - (room.emptySince || now) > config.EMPTY_ROOM_TTL_MS) rooms.delete(room.code);
        continue;
      }
      // Public lobbies start by themselves so nobody waits on an idle host.
      const G = gameOf(room);
      const ready = room.isPublic && room.phase === 'lobby' && seated(room).filter((m) => m.connected).length >= G.meta.minPlayers;
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
    const chatBucket = new Bucket(1, 5);
    const drawBucket = new Bucket(3000, 6000);
    const actionBucket = new Bucket(10, 20);
    const joinBucket = new Bucket(0.5, 5);

    const ctx = () => {
      const room = rooms.get(socket.data.code);
      const m = room && room.members.get(socket.data.memberId);
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
      const gameId = GAMES[opts.game] ? opts.game : 'drawguess';
      const room = findQuickRoom(gameId) || createRoom({ game: gameId, isPublic: true });
      if (!room) return reply(ack, { error: 'busy' });
      reply(ack, joinRoom(socket, room, opts.profile, opts.token));
    });

    on('leaveRoom', () => leaveBySocket(socket));

    on('chat', (text) => {
      const c = ctx();
      if (!c || !chatBucket.take()) return;
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
      const G = gameOf(room);
      if (room.seats.length >= seatCap(room)) return socket.emit('notice', 'No seat is open right now.');
      if (room.phase !== 'lobby' && !G.meta.midJoin) return socket.emit('notice', 'Wait for this match to end.');
      room.specs = room.specs.filter((x) => x !== m.id);
      room.seats.push(m.id);
      m.role = 'player';
      if (room.phase === 'game' && room.game && G.onJoin) G.onJoin(room.game, m, room.api);
      sys(room, `${m.name} took a seat.`);
      broadcast(room);
    });

    on('watch', () => {
      const c = ctx();
      if (!c || c.m.role !== 'player' || c.room.phase !== 'lobby') return;
      const { room, m } = c;
      room.seats = room.seats.filter((x) => x !== m.id);
      room.specs.push(m.id);
      m.role = 'spectator';
      sys(room, `${m.name} is now watching.`);
      broadcast(room);
    });

    // ----- host controls -----
    on('hostUpdate', (patch) => {
      const c = hostCtx();
      if (!c || !patch || typeof patch !== 'object') return;
      const { room } = c;
      const G = gameOf(room);
      if ('isPublic' in patch) room.isPublic = !!patch.isPublic;
      if ('locked' in patch) {
        room.locked = !!patch.locked;
        sys(room, room.locked ? 'The host locked the lobby. No new people can join.' : 'The host unlocked the lobby.', 'accent');
      }
      if ('spectatorsOn' in patch) room.spectatorsOn = !!patch.spectatorsOn;
      if ('maxSpectators' in patch) room.maxSpectators = clampInt(patch.maxSpectators, 0, 50, room.maxSpectators);
      if ('maxPlayers' in patch) {
        const lowest = Math.max(G.meta.minPlayers, room.seats.length);
        room.maxPlayers = clampInt(patch.maxPlayers, lowest, G.meta.maxPlayers, room.maxPlayers);
      }
      if ('settings' in patch && room.phase === 'lobby') {
        room.settings[room.gameId] = G.sanitizeSettings(patch.settings, room.settings[room.gameId]);
      }
      broadcast(room);
    });

    on('switchGame', (opts) => {
      const c = hostCtx();
      if (!c || !opts || !GAMES[opts.game]) return;
      const { room } = c;
      if (room.phase !== 'lobby' || opts.game === room.gameId) return;
      const G2 = GAMES[opts.game];
      room.gameId = opts.game;
      room.maxPlayers = G2.meta.maxPlayers;
      room.lastResult = null;
      room.game = null;
      const cap = G2.meta.maxPlayers;
      if (room.seats.length > cap) {
        let chosen = Array.isArray(opts.seats) ? opts.seats.filter((id) => room.seats.includes(id)) : [];
        chosen = [...new Set(chosen)].slice(0, cap);
        const rest = shuffle(room.seats.filter((id) => !chosen.includes(id)));
        while (chosen.length < cap) chosen.push(rest.shift());
        const moved = room.seats.filter((id) => !chosen.includes(id));
        room.seats = room.seats.filter((id) => chosen.includes(id));
        room.specs = [...moved, ...room.specs];
        for (const id of moved) {
          const m = room.members.get(id);
          m.role = 'spectator';
          emitTo(room, m, 'notice', `Switched to ${G2.meta.name} (${cap} players). You're spectating. Take a seat when one opens.`);
        }
      } else {
        while (room.seats.length < cap && room.specs.length) {
          const id = room.specs.shift();
          room.seats.push(id);
          const m = room.members.get(id);
          m.role = 'player';
          emitTo(room, m, 'notice', `Switched to ${G2.meta.name}. You've been given a seat.`);
        }
      }
      for (const m of room.members.values()) m.score = 0;
      sys(room, `The host switched the game to ${G2.meta.name}.`, 'accent');
      broadcast(room);
    });

    on('startGame', () => {
      const c = hostCtx();
      if (!c) return;
      if (!startGame(c.room)) socket.emit('notice', `You need at least ${gameOf(c.room).meta.minPlayers} players to start.`);
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
      c.room.banned.add(target.token);
      emitTo(c.room, target, 'kicked');
      removeMember(c.room, id, 'kicked');
    });

    on('voteKick', (id) => {
      const c = ctx();
      if (!c || !c.room.isPublic || id === c.m.id) return;
      const { room, m } = c;
      const target = room.members.get(id);
      if (!target) return;
      const voters = [...room.members.values()].filter((x) => x.connected && x.id !== id);
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
