// Private-alpha access gate tests. Run: node test/alpha.js
// The secret below is generated per run; no password is committed.
const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const { io } = require('socket.io-client');

const SECRET = crypto.randomBytes(24).toString('hex');
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const server = path.join(__dirname, '..', 'server', 'index.js');

function start(port, env) {
  const srv = spawn('node', [server], {
    env: { ...process.env, PORT: String(port), ALPHA_ENABLED: '', ALPHA_SECRET: '', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  srv.stdout.on('data', (d) => { out += d; });
  srv.stderr.on('data', (d) => { out += d; });
  const ready = new Promise((resolve) => {
    srv.stdout.once('data', () => resolve(true));
    srv.once('exit', (code) => resolve(false));
  });
  return { srv, ready, output: () => out };
}

function tryConnect(url, opts) {
  return new Promise((resolve) => {
    const s = io(url, { forceNew: true, reconnection: false, timeout: 3000, ...opts });
    s.on('connect', () => { s.close(); resolve(true); });
    s.on('connect_error', () => { s.close(); resolve(false); });
  });
}

(async () => {
  // ---- fails closed ----
  for (const [label, env] of [
    ['missing secret', { ALPHA_ENABLED: 'true' }],
    ['short secret', { ALPHA_ENABLED: 'true', ALPHA_SECRET: 'short' }],
    ['invalid flag', { ALPHA_ENABLED: 'maybe', ALPHA_SECRET: SECRET }],
  ]) {
    const p = start(3980, env);
    const up = await p.ready;
    ok(!up, `alpha mode with ${label} refuses to start`);
    ok(!p.output().includes(SECRET), `${label}: secret not logged`);
    p.srv.kill();
  }

  // ---- gated server ----
  const PORT = 3981;
  const URL = `http://localhost:${PORT}`;
  const p = start(PORT, { ALPHA_ENABLED: 'true', ALPHA_SECRET: SECRET });
  ok(await p.ready, 'alpha server starts with valid secret');
  const html = { headers: { accept: 'text/html' }, redirect: 'manual' };
  try {
    for (const route of ['/', '/draw-and-guess', '/four-in-a-row', '/r/ABC123', '/api/rooms', '/js/main.js', '/style.css', '/favicon.svg', '/nope', '/ads.txt']) {
      const r = await fetch(URL + route, html);
      const body = await r.text();
      ok(r.status === 401 && !body.includes('Draw') && !body.includes('createRoom'), `unauthenticated ${route} -> 401 without content`);
    }
    const hz = await fetch(URL + '/healthz');
    ok(hz.status === 200 && (await hz.text()) === 'ok', '/healthz open and exposes nothing');
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const r = await fetch(URL + '/healthz', { method, redirect: 'manual' });
      ok(r.status === 401 && !(await r.text()).includes('<html'), `unauthenticated ${method} /healthz -> 401 without content`);
    }
    ok((await fetch(URL + '/healthz', html)).headers.get('x-robots-tag')?.includes('noindex'), 'noindex header set');

    const lp = await fetch(URL + '/', html);
    ok(/name="password"/.test(await lp.text()), 'login page served to browsers');

    // Socket.IO without cookie: polling, websocket, and direct engine endpoint
    ok(!(await tryConnect(URL, { transports: ['websocket'] })), 'unauthenticated WebSocket rejected');
    ok(!(await tryConnect(URL, { transports: ['polling'] })), 'unauthenticated polling rejected');
    ok((await fetch(`${URL}/socket.io/?EIO=4&transport=polling`)).status === 403, 'direct /socket.io handshake blocked');
    ok(!(await tryConnect(URL, { transports: ['websocket'], extraHeaders: { cookie: 'alpha_access=bogus' } })), 'forged cookie WebSocket rejected');

    // Wrong password
    const post = (pw) => fetch(URL + '/alpha-login', {
      method: 'POST', redirect: 'manual',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ password: pw }),
    });
    const bad = await post('wrong-password');
    ok(bad.status === 401 && !bad.headers.get('set-cookie'), 'wrong password rejected, no cookie');
    ok(!(await fetch(URL + '/alpha-login', { redirect: 'manual', headers: { accept: 'text/html' } })).headers.get('set-cookie'), 'GET login sets no cookie');

    // Correct password
    const good = await post(SECRET);
    const setCookie = good.headers.get('set-cookie') || '';
    ok(good.status === 303 && good.headers.get('location') === '/', 'correct password redirects to /');
    ok(/HttpOnly/i.test(setCookie) && /SameSite=Lax/i.test(setCookie), 'cookie is HttpOnly and SameSite');
    ok(!setCookie.includes(SECRET) && !(good.headers.get('location') || '').includes(SECRET), 'secret not echoed in cookie or URL');
    const cookie = setCookie.split(';')[0];

    const authed = { headers: { cookie, accept: 'text/html' } };
    for (const route of ['/', '/draw-and-guess', '/api/rooms', '/js/main.js', '/style.css']) {
      ok((await fetch(URL + route, authed)).status === 200, `authorized ${route} -> 200`);
    }
    ok((await (await fetch(URL + '/', authed)).text()).includes('<html'), 'authorized visitor gets game page');

    // Authorized sockets can play
    const extraHeaders = { cookie };
    const mk = () => io(URL, { transports: ['websocket'], forceNew: true, extraHeaders });
    const a = mk(), b = mk();
    const emit = (s, ev, d) => new Promise((res) => s.emit(ev, d, res));
    const prof = (n) => ({ name: n, avatar: { e: 1, c: 2 } });
    const t1 = crypto.randomBytes(16).toString('hex'), t2 = crypto.randomBytes(16).toString('hex');
    const r1 = await emit(a, 'createRoom', { game: 'fourrow', isPublic: false, token: t1, profile: prof('Al'), settings: {} });
    ok(r1 && r1.ok, 'authorized socket creates room');
    const r2 = await emit(b, 'joinRoom', { code: r1.code, token: t2, profile: prof('Bo') });
    ok(r2 && r2.ok, 'second authorized socket joins room');
    a.close(); b.close();
    ok(await tryConnect(URL, { transports: ['polling'], extraHeaders }), 'authorized polling transport connects');

    // Rate limiting of wrong guesses
    let last;
    for (let i = 0; i < 10; i++) last = await post('guess-' + i);
    ok(last.status === 429, 'repeated wrong passwords are rate limited');
    ok((await post(SECRET)).status === 429, 'rate limit also blocks further attempts from same IP');
    ok(!p.output().includes(SECRET), 'secret never appears in server logs');
  } finally {
    p.srv.kill();
  }

  // ---- alpha disabled: unchanged behavior ----
  const q = start(3982, {});
  await q.ready;
  try {
    const U = 'http://localhost:3982';
    ok((await fetch(U + '/')).status === 200, 'alpha off: pages open');
    ok((await fetch(U + '/api/rooms')).status === 200, 'alpha off: API open');
    ok(await tryConnect(U, { transports: ['websocket'] }), 'alpha off: sockets open');
    ok((await fetch(U + '/alpha-login', { method: 'POST', redirect: 'manual' })).status !== 303, 'alpha off: no login endpoint behavior');
  } finally {
    q.srv.kill();
  }

  console.log(failures ? `\n${failures} FAILED` : '\nAll passed');
  process.exit(failures ? 1 : 0);
})();
