// Structured, privacy-safe logging. One JSON object per line on stdout/stderr so Render's log
// search can filter by `evt`. Never log tokens, player names, chat, or full room codes: private
// room codes are join credentials. Room codes are shown only as a short one-way hash.
const crypto = require('crypto');

const SALT = crypto.randomBytes(8).toString('hex'); // per-process; hashes are only for correlating one run's lines
const roomRef = (code) => (code ? crypto.createHash('sha256').update(SALT + String(code)).digest('hex').slice(0, 8) : undefined);

function errInfo(err) {
  if (!err) return undefined;
  const msg = String(err && err.message ? err.message : err);
  const stack = err && err.stack ? String(err.stack).split('\n').slice(0, 6).join('\n') : undefined;
  return { name: err.name || 'Error', message: redact(msg), stack: stack && redact(stack) };
}

// Belt and braces: scrub anything that looks like a 32-hex token or a 4-8 char room code in a path.
function redact(s) {
  return String(s).replace(/\b[0-9a-f]{32,64}\b/gi, '[token]').replace(/(\/r\/)[A-Za-z0-9]{3,10}/g, '$1[code]');
}

function emit(level, evt, fields) {
  const line = { t: new Date().toISOString(), level, evt, ...fields };
  if (line.err) line.err = errInfo(line.err);
  if (line.code) { line.room = roomRef(line.code); delete line.code; }
  try {
    (level === 'error' || level === 'warn' ? process.stderr : process.stdout).write(JSON.stringify(line) + '\n');
  } catch { /* logging must never throw */ }
}

module.exports = {
  info: (evt, f) => emit('info', evt, f),
  warn: (evt, f) => emit('warn', evt, f),
  error: (evt, f) => emit('error', evt, f),
  roomRef, redact,
};
