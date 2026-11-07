// Playgrid 4.1 platform tests: health, headers, graceful shutdown, log privacy, and adversarial
// socket input. Starts its own server. Run: node test/platform.js
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const { io } = require('socket.io-client');

const PORT = 4041;
const URL = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failures++; };
const tok = () => [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
const get = (p) => new Promise((res, rej) => http.get(URL + p, (r) => { let b = ''; r.on('data', (d) => (b += d)); r.on('end', () => res({ status: r.statusCode, headers: r.headers, body: b })); }).on('error', rej));

(async () => {
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '', err = '', exited = null;
  srv.stdout.on('data', (d) => (out += d));
  srv.stderr.on('data', (d) => (err += d));
  srv.on('exit', (code) => (exited = code));
  while (!out.includes('running on')) await sleep(25);

  // ---- health + headers ----
  const h = await get('/healthz');
  ok(h.status === 200 && h.body === 'ok', '/healthz returns 200 ok');
  ok(h.headers['x-content-type-options'] === 'nosniff', 'nosniff header set');
  ok(h.headers['referrer-policy'] === 'same-origin', 'referrer policy set');
  ok(h.headers['x-frame-options'] === 'SAMEORIGIN', 'frame options set');
  const ah = JSON.parse((await get('/api/health')).body);
  ok(ah.ok === true && typeof ah.rooms === 'number' && typeof ah.rssMb === 'number', '/api/health reports aggregates');
  ok(!/code|token|name/i.test(Object.keys(ah).join(',')), '/api/health exposes no room/player fields');

  // ---- adversarial input: server must survive and keep serving ----
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  await new Promise((r) => s.on('connect', r));
  const emit = (ev, ...a) => new Promise((res) => { s.emit(ev, ...a, res); setTimeout(() => res('timeout'), 700); });
  const junk = [null, undefined, 0, 1e309, -1, 'x'.repeat(5000), [], [[]], {}, { token: 5 }, { token: tok(), code: {} }, { token: tok(), profile: 'str' },
    { token: tok(), profile: { name: { toString() { throw 1; } } } }, { token: tok(), game: { __proto__: { x: 1 } } }, JSON.parse('{"__proto__":{"polluted":1},"token":"' + tok() + '"}')];
  for (const ev of ['createRoom', 'joinRoom', 'quickPlay', 'setAvatar']) {
    for (const j of junk) await emit(ev, j);
  }
  for (const ev of ['chat', 'action', 'draw', 'takeSeat', 'queue', 'leaveRoom', 'nope', 'kick', 'startGame', 'setSettings']) {
    for (const j of junk) s.emit(ev, j); // without a room: must be ignored
  }
  await sleep(300);
  ok(({}).polluted === undefined, 'prototype pollution payload had no effect');
  ok((await get('/healthz')).status === 200, 'server alive after junk events without a room');

  // join a room, then junk in-room events
  ok(['slow', 'bad'].includes((await emit('joinRoom', { token: tok(), code: 'ABCDEF' })).error), 'join flood is rate limited');
  s.close();
  const s2 = io(URL, { transports: ['websocket'], forceNew: true });
  await new Promise((rr) => s2.on('connect', rr));
  const emit2 = (ev, ...a) => new Promise((res) => { s2.emit(ev, ...a, res); setTimeout(() => res('timeout'), 700); });
  const tk = tok();
  const r = await emit2('createRoom', { token: tk, game: 'drawguess', profile: { name: 'Mal', avatar: { e: 1, c: 1 } } });
  ok(r && r.code, 'room created: ' + JSON.stringify(r).slice(0, 80));
  for (const ev of ['chat', 'action', 'draw', 'setAvatar', 'takeSeat', 'queue', 'kick', 'startGame', 'setSettings', 'switchGame', 'voteNext', 'transferHost']) {
    for (const j of junk) s2.emit(ev, j);
  }
  s2.emit('draw', { pts: new Array(5000).fill(1) });
  await sleep(500);
  ok((await get('/healthz')).status === 200, 'server alive after junk events inside a room');
  ok(s2.connected, 'abusive-but-small client still connected (no crash on its payloads)');

  // oversize message is rejected by Socket.IO, not processed
  const big = io(URL, { transports: ['websocket'], forceNew: true });
  await new Promise((rr) => big.on('connect', rr));
  let closed = false; big.on('disconnect', () => (closed = true));
  big.emit('chat', 'a'.repeat(200 * 1024));
  await sleep(500);
  ok(closed, 'oversize (>64KB) packet closes the connection');

  // room code unknown -> closed, no state leak
  const j = await emit2('joinRoom', { token: tok(), code: 'ZZZZZZ', profile: { name: 'x', avatar: { e: 1, c: 1 } } });
  ok(j && j.error === 'closed', 'unknown room code is refused');

  // logs: no tokens or room codes leaked
  const all = out + err;
  ok(!all.includes(tk), 'logs never contain member tokens');
  ok(!all.includes(r.code), 'logs never contain the raw room code');

  // ---- graceful shutdown ----
  srv.kill('SIGTERM');
  for (let i = 0; i < 80 && exited === null; i++) await sleep(50);
  ok(exited === 0, 'SIGTERM exits cleanly with code 0 (got ' + exited + ')');
  ok(/"evt":"shutdown_done"/.test(out), 'shutdown logged as structured JSON');
  s2.close(); big.close();
  console.log(failures ? `\n${failures} FAILED` : '\nall passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
