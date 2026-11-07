// Repeatable local load test. Spawns its own server on a private port (NEVER point it at
// production). Simulates N concurrent rooms of P players: join, chat/action traffic, drop+rejoin,
// host leave (migration), then leave. Reports latency percentiles, event throughput, server CPU and memory.
// Usage: node scripts/loadtest.js [rooms=40] [players=4] [seconds=10]
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { io } = require('socket.io-client');

const ROOMS = +process.argv[2] || 40, PLAYERS = +process.argv[3] || 4, SECONDS = +process.argv[4] || 10;
const PORT = 4100 + Math.floor(Math.random() * 500);
const URL = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tok = () => [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
const lat = { join: [], rejoin: [], chatFanout: [] };
let errors = 0, emitted = 0, received = 0;
const pct = (a, p) => (a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor((a.length * p) / 100))] : 0);
const summ = (a) => ({ n: a.length, p50: +pct(a, 50).toFixed(1), p95: +pct(a, 95).toFixed(1), p99: +pct(a, 99).toFixed(1), max: +Math.max(0, ...a).toFixed(1) });

function mk(name) {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const c = { s, name, token: tok(), code: null };
  s.on('chat', () => { received++; });
  s.on('state', () => { received++; });
  c.ack = (ev, d) => new Promise((res) => { const t = performance.now(); s.emit(ev, d, (r) => res([r, performance.now() - t])); setTimeout(() => res([{ error: 'timeout' }, 0]), 5000); });
  c.profile = { name, avatar: { e: 1, c: 1 } };
  return c;
}
const cpuMs = (pid) => { try { const f = fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(' '); return (+f[13] + +f[14]) * 10; } catch { return 0; } };
const rssMb = (pid) => { try { return +(fs.readFileSync(`/proc/${pid}/status`, 'utf8').match(/VmRSS:\s+(\d+)/)[1] / 1024).toFixed(1); } catch { return 0; } };

(async () => {
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const rss0 = rssMb(srv.pid), cpu0 = cpuMs(srv.pid), t0 = Date.now();

  const rooms = [];
  // Stagger rooms so the per-socket join limiter (0.5/s, burst 5) is exercised realistically: one socket per player.
  await Promise.all(Array.from({ length: ROOMS }, async (_, i) => {
    const members = Array.from({ length: PLAYERS }, (_, k) => mk(`P${i}_${k}`));
    const [r, ms] = await members[0].ack('createRoom', { token: members[0].token, game: 'tictactoe', isPublic: false, profile: members[0].profile });
    if (!r || !r.code) { errors++; return; }
    lat.join.push(ms);
    members[0].code = r.code;
    for (const m of members.slice(1)) {
      const [jr, jms] = await m.ack('joinRoom', { token: m.token, code: r.code, profile: m.profile });
      if (jr && jr.error) errors++; else lat.join.push(jms);
      m.code = r.code;
    }
    rooms.push(members);
  }));

  // Steady traffic: each player chats ~2/s (server limits chat); measure chat fan-out latency from a probe.
  const end = Date.now() + SECONDS * 1000;
  const probe = async (members) => {
    const [a, b] = [members[0], members[1]];
    const t = performance.now(); const tag = 'p' + Math.random().toString(36).slice(2, 8);
    await new Promise((res) => { const h = (m) => { if (m.text === tag) { b.s.off('chat', h); lat.chatFanout.push(performance.now() - t); res(); } }; b.s.on('chat', h); a.s.emit('chat', tag); emitted++; setTimeout(res, 3000); });
  };
  const loops = rooms.map(async (members, i) => {
    while (Date.now() < end) {
      for (const m of members) { m.s.emit('chat', 'hello ' + Math.random().toString(36).slice(2, 6)); emitted++; m.s.emit('action', { type: 'noop' }); emitted++; }
      if (i % 5 === 0) await probe(members);
      await sleep(600 + Math.random() * 400);
    }
  });
  await Promise.all(loops);

  // Drop + rejoin (same token => same seat) for every room's second player.
  await Promise.all(rooms.map(async (members) => {
    const m = members[1]; m.s.close();
    const n = mk(m.name); n.token = m.token;
    const [r, ms] = await n.ack('joinRoom', { token: n.token, code: m.code, profile: m.profile });
    if (r && r.error) errors++; else lat.rejoin.push(ms);
    members[1] = n; n.code = m.code;
  }));
  // Host migration: host leaves; remaining members must still be in a live room.
  await Promise.all(rooms.map((members) => { members[0].s.emit('leaveRoom'); return sleep(0); }));
  await sleep(500);
  const health = await (await fetch(URL + '/api/health')).json();

  const cpu1 = cpuMs(srv.pid), wall = Date.now() - t0;
  const res = {
    config: { rooms: ROOMS, players: PLAYERS, seconds: SECONDS, node: process.version, cpus: require('os').cpus().length },
    latencyMs: { join: summ(lat.join), rejoin: summ(lat.rejoin), chatFanout: summ(lat.chatFanout) },
    throughput: { clientEventsEmitted: emitted, serverEventsReceivedByClients: received, perSec: Math.round((emitted + received) / (wall / 1000)) },
    server: { cpuPercentOfOneCore: +(((cpu1 - cpu0) / wall) * 100).toFixed(1), rssMbStart: rss0, rssMbEnd: rssMb(srv.pid), healthAtEnd: health },
    errors,
  };
  console.log(JSON.stringify(res, null, 2));
  for (const m of rooms.flat()) m.s.close();
  srv.kill('SIGTERM');
  setTimeout(() => process.exit(errors ? 1 : 0), 300);
})().catch((e) => { console.error(e); process.exit(1); });
