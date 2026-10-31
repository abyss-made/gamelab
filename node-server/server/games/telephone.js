// Drawing Telephone: everyone writes a prompt, then chains are passed along so each
// player alternately draws what they were told and describes what they were shown.
// Each player only ever sees the one entry passed to them; whole chains are revealed at the end.
const WORDS = require('../data/words.json');
const { clampInt, shuffle } = require('../util');
const { cleanText, pick } = require('./socialutil');

const meta = { id: 'telephone', name: 'Drawing Telephone', minPlayers: 3, maxPlayers: 8, midJoin: false, resetScores: true, scoreLabel: 'pts' };

const DRAW_TIMES = [45, 60, 90];
const WRITE_TIMES = [20, 30, 45];
const defaults = { drawTime: 60, writeTime: 30 };
const W = 800;
const H = 600;
const MAX_STROKES = 250;
const MAX_POINTS = 4000;
const MAX_FILLS = 20;
const TEXT_MAX = 60;
const STEP_MS = 5000; // one reveal step
const CHAIN_GAP_MS = 2500;
const HEX = /^#[0-9a-fA-F]{6}$/;

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (DRAW_TIMES.includes(s.drawTime)) o.drawTime = s.drawTime;
  if (WRITE_TIMES.includes(s.writeTime)) o.writeTime = s.writeTime;
  return o;
}

function create(settings) {
  return { settings: { ...settings }, players: [], chains: [], round: 0, phase: 'work', deadline: 0, over: false, rev: { chain: 0, idx: 0 }, likes: new Set() };
}

const randomPrompt = () => pick([...WORDS.easy, ...WORDS.medium]);
const activeP = (st) => st.players.filter((p) => !p.out);

// Round 0 everyone writes a prompt. Odd rounds draw the text before, even rounds describe the drawing before.
const kindOf = (round) => (round === 0 ? 'prompt' : round % 2 ? 'draw' : 'guess');
// Chain c is worked on by player (c + round) % n in each round.
const chainOf = (st, pi) => (((pi - st.round) % st.players.length) + st.players.length) % st.players.length;

function start(st, api) {
  st.players = shuffle(api.seated()).map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, points: 0, out: false, done: false }));
  st.chains = st.players.map((p) => ({ owner: p.id, entries: [] }));
  api.sys('Drawing Telephone: write a prompt, then draw and describe what gets passed to you.', 'accent');
  beginRound(st, api);
}

function beginRound(st, api) {
  st.phase = 'work';
  for (const p of st.players) p.done = false;
  st.deadline = api.now() + (kindOf(st.round) === 'draw' ? st.settings.drawTime : st.settings.writeTime) * 1000;
  api.changed();
}

function cleanStrokes(raw) {
  if (!Array.isArray(raw) || raw.length > MAX_STROKES + MAX_FILLS) return null;
  const out = [];
  let pts = 0;
  let fills = 0;
  const num = (v, max) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v * 10) / 10 : null);
  for (const h of raw) {
    if (!h || typeof h !== 'object' || typeof h.c !== 'string' || !HEX.test(h.c)) return null;
    if (h.t === 'f') {
      const x = num(h.x, W);
      const y = num(h.y, H);
      if (x === null || y === null || ++fills > MAX_FILLS) return null;
      out.push({ t: 'f', x, y, c: h.c.toLowerCase() });
    } else if (h.t === 's') {
      if (!Array.isArray(h.p) || h.p.length < 2 || h.p.length % 2) return null;
      const p = [];
      for (let i = 0; i < h.p.length; i += 2) {
        const x = num(h.p[i], W);
        const y = num(h.p[i + 1], H);
        if (x === null || y === null) return null;
        p.push(x, y);
      }
      pts += p.length / 2;
      if (pts > MAX_POINTS) return null;
      out.push({ t: 's', c: h.c.toLowerCase(), s: clampInt(h.s, 1, 60, 8), p });
    } else return null;
  }
  return out;
}

function record(st, p, entry) {
  const chain = st.chains[chainOf(st, st.players.indexOf(p))];
  if (chain.entries.length > st.round) return false;
  chain.entries[st.round] = { by: p.id, ...entry };
  p.done = true;
  if (!entry.skipped) p.points += 1;
  return true;
}

function onAction(st, m, a, api) {
  if (!a || typeof a !== 'object') return;
  const p = st.players.find((x) => x.id === m.id);
  if (!p) return;
  if (a.type === 'like') return like(st, p, a, api);
  if (st.over || st.phase !== 'work' || p.out || p.done) return;
  const kind = kindOf(st.round);
  if (kind === 'draw') {
    if (a.type !== 'draw') return;
    const strokes = cleanStrokes(a.strokes);
    if (!strokes) return;
    // A blank canvas (the client auto-sends whatever is drawn just before time runs out) is a skip:
    // no point, same as a timed-out entry.
    record(st, p, strokes.length ? { kind: 'draw', strokes } : { kind: 'draw', strokes, skipped: true });
  } else {
    if (a.type !== 'text') return;
    const text = cleanText(a.text, TEXT_MAX);
    if (!text) return;
    record(st, p, { kind, text });
  }
  if (activeP(st).every((x) => x.done)) return endRound(st, api);
  api.changed();
}

// Fill anything an absent or timed-out player owes, so every chain keeps moving.
function fillMissing(st) {
  const kind = kindOf(st.round);
  for (const p of st.players) {
    if (p.done) continue;
    const chain = st.chains[chainOf(st, st.players.indexOf(p))];
    if (chain.entries[st.round]) continue;
    if (kind === 'draw') chain.entries[st.round] = { by: p.id, kind, strokes: [], skipped: true };
    else chain.entries[st.round] = { by: p.id, kind, text: kind === 'prompt' ? randomPrompt() : '(no guess)', skipped: true };
    p.done = true;
  }
}

function endRound(st, api) {
  fillMissing(st);
  st.round++;
  if (st.round >= st.players.length) {
    st.phase = 'reveal';
    st.rev = { chain: 0, idx: 0 };
    st.deadline = api.now() + STEP_MS;
    api.sys('Time for the reveal! Like the entries you enjoy.', 'accent');
    return api.changed();
  }
  beginRound(st, api);
}

function like(st, p, a, api) {
  if (st.over || st.phase !== 'reveal') return;
  const c = st.chains[a.chain];
  const e = c && c.entries[a.idx];
  // Only entries that have already been revealed can be liked, and never your own.
  if (!e || e.by === p.id || e.skipped) return;
  if (a.chain > st.rev.chain || (a.chain === st.rev.chain && a.idx > st.rev.idx)) return;
  const key = `${p.id}:${a.chain}:${a.idx}`;
  if (st.likes.has(key)) return;
  st.likes.add(key);
  const author = st.players.find((x) => x.id === e.by);
  if (author) author.points += 1;
  api.changed();
}

function syncScores(st, api) {
  for (const p of st.players) {
    const m = api.member(p.id);
    if (m) m.score = p.points;
  }
}

function finish(st, api, forfeit) {
  if (st.over) return;
  st.over = true;
  syncScores(st, api);
  const standings = st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, points: p.points, out: p.out })).sort((x, y) => y.points - x.points);
  const eligible = standings.filter((s) => !s.out);
  const top = eligible[0] ? eligible[0].points : 0;
  const winners = eligible.filter((s) => s.points === top).map((s) => s.id);
  api.end({ type: 'telephone', winnerId: winners[0] || null, winners, tie: winners.length > 1, standings, forfeit: !!forfeit });
}

function tick(st, api, now) {
  if (st.over || now < st.deadline) return;
  if (st.phase === 'work') return endRound(st, api);
  const c = st.chains[st.rev.chain];
  if (st.rev.idx + 1 < c.entries.length) {
    st.rev.idx++;
    st.deadline = now + STEP_MS;
  } else if (st.rev.chain + 1 < st.chains.length) {
    st.rev = { chain: st.rev.chain + 1, idx: 0 };
    st.deadline = now + STEP_MS + CHAIN_GAP_MS;
  } else return finish(st, api);
  syncScores(st, api);
  api.changed();
}

function onLeave(st, id, api) {
  if (st.over) return;
  const p = st.players.find((x) => x.id === id);
  if (!p || p.out) return;
  p.out = true;
  api.sys(`${p.name} left.`, 'warn');
  if (activeP(st).length < 2) return finish(st, api, true);
  if (st.phase === 'work' && activeP(st).every((x) => x.done)) return endRound(st, api);
  api.changed();
}

function view(st, m, now) {
  const idx = st.players.findIndex((p) => p.id === m.id);
  const me = st.players[idx];
  const g = {
    phase: st.phase,
    players: st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, points: p.points, out: p.out, done: st.phase === 'work' ? p.done : true })),
    round: st.round + 1,
    rounds: st.players.length,
    timeLeft: Math.max(0, st.deadline - now),
    totalTime: st.phase === 'work' ? (kindOf(st.round) === 'draw' ? st.settings.drawTime : st.settings.writeTime) * 1000 : STEP_MS,
    myIndex: idx,
  };
  if (st.phase === 'work') {
    g.kind = kindOf(st.round);
    g.mine = !!me && !me.out;
    g.myDone = !!me && me.done;
    // The only secret content a player receives is the single entry handed to them.
    if (me && !me.out && st.round > 0) {
      const prev = st.chains[chainOf(st, idx)].entries[st.round - 1];
      if (prev) g.source = prev.kind === 'draw' ? { kind: 'draw', strokes: prev.strokes } : { kind: 'text', text: prev.text };
    }
  } else {
    const c = st.chains[st.rev.chain];
    g.rev = {
      chain: st.rev.chain,
      chains: st.chains.length,
      idx: st.rev.idx,
      owner: c.owner,
      entries: c.entries.slice(0, st.rev.idx + 1).map((e, i) => ({
        by: e.by, kind: e.kind, text: e.text, strokes: e.strokes, skipped: !!e.skipped, i,
        liked: st.likes.has(`${m.id}:${st.rev.chain}:${i}`),
        likes: st.players.reduce((n, p) => n + (st.likes.has(`${p.id}:${st.rev.chain}:${i}`) ? 1 : 0), 0),
      })),
    };
  }
  return g;
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view, kindOf, chainOf };
