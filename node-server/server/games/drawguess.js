// Draw & Guess: one player draws, everyone else races to guess in chat.
const WORD_BANK = require('../data/words.json'); // { easy: [], medium: [], hard: [] }, kept server-side only
const { clampInt, shuffle, Bucket } = require('../util');

const meta = {
  id: 'drawguess',
  name: 'Draw & Guess',
  minPlayers: 2,
  maxPlayers: 12,
  midJoin: true,        // new players can join while a game is running
  resetScores: true,    // scores start at 0 every game
  scoreLabel: 'pts',
};

const DIFFICULTIES = ['easy', 'medium', 'hard', 'mixed'];
const DRAW_TIMES = [30, 45, 60, 80, 100, 120, 150, 180, 240, 300];
const defaults = { rounds: 3, drawTime: 80, hints: true, difficulty: 'medium', customWords: '', customOnly: false };

const CHOICE_COUNT = 6;
const MIN_CUSTOM_ONLY = CHOICE_COUNT; // custom-only needs enough words to fill a choice set
const MAX_FILLS = 100; // flood fills are the costly op to replay, so cap them per turn
const CHOOSE_MS = 15000;
const REVEAL_MS = 6000;
const W = 800;
const H = 600;
const MAX_POINTS = 60000; // cap on stored drawing points per turn

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (s.rounds !== undefined) o.rounds = clampInt(s.rounds, 1, 10, prev.rounds);
  if (DRAW_TIMES.includes(s.drawTime)) o.drawTime = s.drawTime;
  if (s.hints !== undefined) o.hints = !!s.hints;
  if (DIFFICULTIES.includes(s.difficulty)) o.difficulty = s.difficulty;
  if (typeof s.customWords === 'string') o.customWords = s.customWords.slice(0, 3000);
  if (s.customOnly !== undefined) o.customOnly = !!s.customOnly;
  // Custom-only never falls back to built-in words, so it can't be on without enough custom words.
  if (o.customOnly && customList(o).length < MIN_CUSTOM_ONLY) o.customOnly = false;
  return o;
}

// ---- word helpers ----
function norm(t) {
  return String(t)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
const compact = (t) => norm(t).replace(/ /g, '');

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

// Distinct custom words. Entries that normalize the same (punctuation, accents, case) count once,
// so the count used for custom-only matches what the picker can actually offer.
function customList(settings) {
  const seen = new Set();
  return settings.customWords
    .split(/[,\n]/)
    .map((w) => w.trim().toLowerCase().replace(/\s+/g, ' '))
    .filter((w) => w.length >= 2 && w.length <= 30 && /[a-z0-9]/i.test(w))
    .filter((w) => {
      const k = norm(w);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
}

// Built-in words by difficulty. Mixed spreads picks evenly across the three tiers.
function builtinTiers(difficulty) {
  return difficulty === 'mixed' ? ['easy', 'medium', 'hard'] : [DIFFICULTIES.includes(difficulty) ? difficulty : 'medium'];
}

// Picks n distinct words. Words already played this game are skipped until a pool runs dry,
// then they may repeat (never within one choice set). Custom words are their own pool, not
// tied to a difficulty; with custom-only on, built-in words are never used.
function pickWords(st, n) {
  const custom = customList(st.settings);
  const customOnly = st.settings.customOnly;
  const tiers = builtinTiers(st.settings.difficulty).map((t) => WORD_BANK[t]);
  const out = [];
  const taken = new Set();
  const fresh = (pool) => pool.filter((w) => !taken.has(norm(w)) && !st.used.has(norm(w)));
  const stale = (pool) => pool.filter((w) => !taken.has(norm(w)));
  while (out.length < n) {
    const sources = customOnly ? [custom] : custom.length && Math.random() < 0.5 ? [custom] : [tiers[out.length % tiers.length]];
    // Fall back through every pool before reusing a played word.
    const all = customOnly ? [custom] : [...sources, ...tiers, custom];
    let cand = [];
    for (const pool of all) if ((cand = fresh(pool)).length) break;
    if (!cand.length) for (const pool of all) if ((cand = stale(pool)).length) break;
    if (!cand.length) break;
    const w = cand[Math.floor(Math.random() * cand.length)];
    taken.add(norm(w));
    out.push(w);
  }
  return shuffle(out);
}

const isLetter = (c) => /[a-z0-9]/i.test(c);

function mask(st) {
  return [...st.word].map((c, i) => (isLetter(c) ? (st.revealed.has(i) ? c : '_') : c));
}

function revealLetter(st) {
  const hidden = [...st.word].map((c, i) => i).filter((i) => isLetter(st.word[i]) && !st.revealed.has(i));
  if (hidden.length <= 1) return;
  st.revealed.add(hidden[Math.floor(Math.random() * hidden.length)]);
}

// ---- game flow ----
function create(settings) {
  return {
    settings: { ...settings },
    round: 0,
    order: [],
    turnIdx: -1,
    drawerId: null,
    phase: 'choose',
    word: '',
    choices: [],
    deadline: 0,
    total: 1,
    guessed: new Map(),
    drawerPoints: 0,
    revealed: new Set(),
    hintTimes: [],
    history: [],
    historyPts: 0,
    cur: null,
    resetBucket: null,
    used: new Set(),
    turnId: 0,
    turnResult: null,
  };
}

function start(st, api) {
  st.round = 1;
  st.order = api.seated().map((m) => m.id);
  st.turnIdx = -1;
  nextTurn(st, api);
}

function nextTurn(st, api) {
  const seated = new Set(api.seated().map((m) => m.id));
  if (seated.size < 2) return finish(st, api, 'Not enough players to keep going.');
  st.turnIdx++;
  for (;;) {
    while (st.turnIdx < st.order.length && !seated.has(st.order[st.turnIdx])) st.turnIdx++;
    if (st.turnIdx < st.order.length) break;
    st.round++;
    st.turnIdx = 0;
    st.order = api.seated().map((m) => m.id);
    if (st.round > st.settings.rounds) return finish(st, api);
  }
  st.drawerId = st.order[st.turnIdx];
  st.phase = 'choose';
  st.choices = pickWords(st, CHOICE_COUNT);
  st.deadline = api.now() + CHOOSE_MS;
  st.turnId++;
  st.word = '';
  st.guessed = new Map();
  st.drawerPoints = 0;
  st.revealed = new Set();
  st.hintTimes = [];
  st.history = [];
  st.historyPts = 0;
  st.cur = null;
  st.resetBucket = new Bucket(2, 6); // undo/clear each resend the whole canvas to the room
  st.turnResult = null;
  api.toRoom('canvas', { turnId: st.turnId, history: [] });
  api.changed();
}

function startDrawing(st, api, word) {
  st.word = word;
  st.used.add(norm(word)); // normalized, so a custom 'ice-cream' and built-in 'ice cream' count as the same word
  st.phase = 'draw';
  st.total = st.settings.drawTime * 1000;
  const now = api.now();
  st.deadline = now + st.total;
  const letters = [...word].filter(isLetter).length;
  st.hintTimes = [];
  if (st.settings.hints && letters >= 3) {
    const k = Math.min(3, Math.floor(letters / 3));
    for (let i = 0; i < k; i++) st.hintTimes.push(now + st.total * (0.4 + (0.45 * i) / k));
  }
  const d = api.member(st.drawerId);
  api.sys(`${d ? d.name : 'Someone'} is drawing now!`, 'accent');
  api.changed();
}

function endTurn(st, api, reason) {
  if (!st.word) {
    // drawer never picked a word (left during choosing)
    api.sys('The drawer left, so this turn is skipped.', 'info');
    return nextTurn(st, api);
  }
  st.phase = 'reveal';
  st.deadline = api.now() + REVEAL_MS;
  const drawer = api.member(st.drawerId);
  if (drawer) drawer.score += st.drawerPoints;
  const scores = api
    .seated()
    .map((m) => ({
      id: m.id,
      name: m.name,
      pts: m.id === st.drawerId ? st.drawerPoints : st.guessed.get(m.id) || 0,
      drawer: m.id === st.drawerId,
    }))
    .sort((a, b) => b.pts - a.pts);
  st.turnResult = { word: st.word, reason, scores };
  api.sys(`The word was "${st.word}".`, 'reveal');
  api.changed();
}

function finish(st, api, note) {
  st.phase = 'over';
  const standings = api
    .seated()
    .map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, score: m.score }))
    .sort((a, b) => b.score - a.score);
  if (standings.length && !note) api.sys(`${standings[0].name} wins the game!`, 'good');
  if (note) api.sys(note, 'warn');
  api.end({ type: 'drawguess', standings, note: note || null });
}

function tick(st, api, now) {
  if (st.phase === 'choose' && now >= st.deadline) {
    startDrawing(st, api, st.choices[0]);
  } else if (st.phase === 'draw') {
    while (st.hintTimes.length && now >= st.hintTimes[0]) {
      st.hintTimes.shift();
      revealLetter(st);
      api.changed();
    }
    if (now >= st.deadline) endTurn(st, api, 'time');
  } else if (st.phase === 'reveal' && now >= st.deadline) {
    nextTurn(st, api);
  }
}

function onAction(st, m, a, api) {
  if (a && a.type === 'choose' && st.phase === 'choose' && m.id === st.drawerId) {
    const i = clampInt(a.index, 0, st.choices.length - 1, 0);
    startDrawing(st, api, st.choices[i]);
  }
}

function allGuessed(st, api) {
  const guessers = api.seated().filter((x) => x.id !== st.drawerId && x.connected);
  return guessers.length > 0 && guessers.every((x) => st.guessed.has(x.id));
}

// Returns true when the game handled the message itself.
function onChat(st, m, text, api) {
  if (st.phase !== 'draw') return false;
  const g = norm(text);
  const w = norm(st.word);
  const correct = !!g && (compact(text) === compact(st.word) || (' ' + g + ' ').includes(' ' + w + ' '));

  if (m.id === st.drawerId) {
    if (correct || compact(text).includes(compact(st.word))) {
      api.toMember(m.id, 'chat', { kind: 'sys', style: 'warn', text: "You can't say the word!" });
      return true;
    }
    return false;
  }

  // Spectators and players who already guessed talk in a hidden channel
  // so they can't give the answer away. Spectators never see the word, so
  // what players who know it say is kept away from them.
  if (m.role !== 'player' || st.guessed.has(m.id)) {
    const fromSpec = m.role === 'spectator';
    api.chat(
      { kind: 'msg', id: m.id, name: m.name, text, hidden: true, spectator: fromSpec },
      (x) => x.id === st.drawerId || st.guessed.has(x.id) || (fromSpec && x.role === 'spectator')
    );
    return true;
  }

  if (correct) {
    const remaining = Math.max(0, st.deadline - api.now());
    const pts = Math.round(50 + (450 * remaining) / st.total);
    m.score += pts;
    st.guessed.set(m.id, pts);
    st.drawerPoints += Math.round(pts * 0.4);
    api.chat({ kind: 'sys', style: 'good', text: `${m.name} guessed the word!`, sound: 'guess' }, (x) => x.id !== m.id);
    api.toMember(m.id, 'chat', { kind: 'sys', style: 'good', text: `You guessed it: ${st.word} (+${pts})`, sound: 'correct' });
    if (allGuessed(st, api)) endTurn(st, api, 'all');
    api.changed();
    return true;
  }

  api.chat({ kind: 'msg', id: m.id, name: m.name, text });
  const a = compact(text);
  const b = compact(st.word);
  if (b.length >= 4 && lev(a, b) <= (b.length >= 8 ? 2 : 1)) {
    api.toMember(m.id, 'chat', { kind: 'sys', style: 'warn', text: `"${text}" is close!` });
  }
  return true;
}

const num = (v, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(max, Math.max(0, n)) * 10) / 10;
};
const color = (c) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : null);

// Validates a drawing message. Returns what to relay to everyone else, or null.
function onDraw(st, m, d, api) {
  if (st.phase !== 'draw' || m.id !== st.drawerId || !d || typeof d !== 'object') return null;
  switch (d.op) {
    case 'begin': {
      const c = color(d.color);
      const x = num(d.x, W);
      const y = num(d.y, H);
      const s = clampInt(d.size, 1, 60, 6);
      if (!c || x === null || y === null || st.historyPts > MAX_POINTS || st.history.length > 3000) return null;
      st.cur = { t: 's', c, s, p: [x, y] };
      st.history.push(st.cur);
      st.historyPts++;
      return { op: 'begin', color: c, size: s, x, y };
    }
    case 'pts': {
      if (!st.cur || !Array.isArray(d.pts) || d.pts.length > 400 || d.pts.length % 2) return null;
      const out = [];
      for (let i = 0; i < d.pts.length; i += 2) {
        const x = num(d.pts[i], W);
        const y = num(d.pts[i + 1], H);
        if (x === null || y === null) return null;
        out.push(x, y);
      }
      if (st.historyPts + out.length / 2 > MAX_POINTS) return null;
      st.cur.p.push(...out);
      st.historyPts += out.length / 2;
      return { op: 'pts', pts: out };
    }
    case 'end':
      st.cur = null;
      return { op: 'end' };
    case 'fill': {
      const c = color(d.color);
      const x = num(d.x, W);
      const y = num(d.y, H);
      if (!c || x === null || y === null) return null;
      if (st.history.length > 3000 || st.history.filter((h) => h.t === 'f').length >= MAX_FILLS) {
        // The drawer already painted it locally, so send them the real canvas back.
        if (st.resetBucket.take()) api.toMember(m.id, 'canvas', { turnId: st.turnId, history: st.history });
        return null;
      }
      st.cur = null;
      st.history.push({ t: 'f', c, x, y });
      return { op: 'fill', color: c, x, y };
    }
    case 'undo':
      if (!st.resetBucket.take()) return null;
      st.cur = null;
      st.history.pop();
      st.historyPts = st.history.reduce((s, h) => s + (h.p ? h.p.length / 2 : 1), 0);
      api.toRoom('canvas', { turnId: st.turnId, history: st.history });
      return null;
    case 'clear':
      if (!st.resetBucket.take()) return null;
      st.cur = null;
      st.history = [];
      st.historyPts = 0;
      api.toRoom('canvas', { turnId: st.turnId, history: [] });
      return null;
    default:
      return null;
  }
}

function onJoin(st, m) {
  m.score = 0;
  if (!st.order.includes(m.id)) st.order.push(m.id);
}

function onLeave(st, id, api) {
  if (api.seated().length < 2) return finish(st, api, 'Not enough players left, so the game ended.');
  if (id === st.drawerId && (st.phase === 'choose' || st.phase === 'draw')) {
    if (st.phase === 'choose') {
      api.sys('The drawer left, so this turn is skipped.', 'info');
      return nextTurn(st, api);
    }
    return endTurn(st, api, 'left');
  }
  if (st.phase === 'draw' && allGuessed(st, api)) endTurn(st, api, 'all');
}

function syncFor(st, m, emit) {
  emit('canvas', { turnId: st.turnId, history: st.history });
}

function view(st, m, now) {
  const isDrawer = m.id === st.drawerId;
  const seeWord = isDrawer || st.guessed.has(m.id) || st.phase === 'reveal';
  return {
    round: st.round,
    rounds: st.settings.rounds,
    drawerId: st.drawerId,
    phase: st.phase,
    timeLeft: Math.max(0, st.deadline - now),
    totalTime: st.phase === 'draw' ? st.total : st.phase === 'choose' ? CHOOSE_MS : REVEAL_MS,
    turnId: st.turnId,
    choices: isDrawer && st.phase === 'choose' ? st.choices : null,
    word: seeWord && st.word ? st.word : null,
    hint: st.phase === 'draw' ? mask(st) : null,
    guessed: [...st.guessed.keys()],
    turnResult: st.phase === 'reveal' ? st.turnResult : null,
  };
}

module.exports = {
  meta, defaults, DRAW_TIMES, DIFFICULTIES, CHOICE_COUNT, WORD_BANK, pickWords, sanitizeSettings, create, start, tick, onAction, onChat, onDraw, onJoin, onLeave, syncFor, view,
};
