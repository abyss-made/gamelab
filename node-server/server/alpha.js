// Opt-in private-alpha access gate. Off unless ALPHA_ENABLED=true.
// When on, every HTTP route (except /healthz and the login endpoint) and every
// Socket.IO/engine.io request, including WebSocket upgrades, needs an access
// cookie that is only issued after the shared ALPHA_SECRET is posted to /alpha-login.
const crypto = require('crypto');

const COOKIE = 'alpha_access';
const MAX_AGE_S = 7 * 24 * 3600;
const MIN_SECRET_LEN = 16;
const MAX_FAILS = 8;           // wrong passwords per IP per window
const FAIL_WINDOW_MS = 10 * 60 * 1000;

// Returns { enabled: false } or { enabled: true, secret }. Throws when alpha mode
// is requested without a usable secret, so the server fails closed at startup.
function readConfig(env = process.env) {
  const flag = String(env.ALPHA_ENABLED || '').trim().toLowerCase();
  if (!flag || ['0', 'false', 'no', 'off'].includes(flag)) return { enabled: false };
  if (!['1', 'true', 'yes', 'on'].includes(flag)) {
    throw new Error('ALPHA_ENABLED must be "true" or "false"');
  }
  const secret = env.ALPHA_SECRET || '';
  if (secret.length < MIN_SECRET_LEN) {
    throw new Error(`ALPHA_ENABLED is on but ALPHA_SECRET is missing or shorter than ${MIN_SECRET_LEN} characters`);
  }
  return { enabled: true, secret };
}

const hmac = (secret, label) => crypto.createHmac('sha256', secret).update(label).digest();
const safeEqual = (a, b) => a.length === b.length && crypto.timingSafeEqual(a, b);

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function createGate(secret) {
  const cookieValue = hmac(secret, 'playgrid-alpha-cookie-v1').toString('hex');
  const cookieBuf = Buffer.from(cookieValue);
  const fails = new Map(); // ip -> { n, reset }

  const hasAccess = (req) => {
    const v = parseCookies(req.headers.cookie)[COOKIE];
    return typeof v === 'string' && safeEqual(Buffer.from(v), cookieBuf);
  };

  function rateLimited(ip) {
    const now = Date.now();
    const f = fails.get(ip);
    if (!f || f.reset < now) return false;
    return f.n >= MAX_FAILS;
  }
  function recordFail(ip) {
    const now = Date.now();
    const f = fails.get(ip);
    if (!f || f.reset < now) fails.set(ip, { n: 1, reset: now + FAIL_WINDOW_MS });
    else f.n++;
    if (fails.size > 5000) for (const [k, v] of fails) if (v.reset < now) fails.delete(k);
  }

  const page = (msg = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Private alpha</title>
<style>body{font-family:system-ui,sans-serif;background:#0b1530;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0}
form{display:grid;gap:12px;width:min(320px,90vw)}input,button{font:inherit;padding:12px;border-radius:8px;border:0}
button{background:#b6f03c;color:#0b1530;font-weight:700}p{margin:0;color:#ffb4b4}</style></head><body>
<form method="post" action="/alpha-login"><h1>Private alpha</h1>${msg ? `<p>${msg}</p>` : ''}
<input type="password" name="password" placeholder="Access password" autocomplete="current-password" required autofocus>
<button type="submit">Enter</button></form></body></html>`;

  function middleware(req, res, next) {
    res.set('X-Robots-Tag', 'noindex, nofollow');
    if (req.path === '/healthz') return next();
    if (req.path === '/alpha-login' && req.method === 'POST') return login(req, res);
    if (hasAccess(req)) return next();
    res.set('Cache-Control', 'no-store');
    if (req.method === 'GET' && (req.headers.accept || '').includes('text/html')) {
      return res.status(401).type('html').send(page());
    }
    res.status(401).type('text').send('Unauthorized');
  }

  function login(req, res) {
    res.set('Cache-Control', 'no-store');
    if (rateLimited(req.ip)) return res.status(429).type('html').send(page('Too many attempts. Try again later.'));
    const given = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!safeEqual(hmac(given, 'playgrid-alpha-login-v1'), hmac(secret, 'playgrid-alpha-login-v1'))) {
      recordFail(req.ip);
      return res.status(401).type('html').send(page('Wrong password.'));
    }
    const flags = `HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_S}${req.secure ? '; Secure' : ''}`;
    res.set('Set-Cookie', `${COOKIE}=${cookieValue}; ${flags}`);
    res.redirect(303, '/');
  }

  // For Socket.IO's allowRequest: covers polling, WebSocket upgrades and handshake.
  const allowRequest = (req, cb) => cb(null, hasAccess(req));

  return { middleware, allowRequest, hasAccess };
}

module.exports = { readConfig, createGate, COOKIE };
