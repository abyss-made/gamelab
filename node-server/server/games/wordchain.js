// Word Chain: each word must start with the last letter of the previous one.
// Words can't repeat, and running out of time costs a life. Last player standing wins.
const fs = require('fs');
const path = require('path');
const { clampInt } = require('../util');
const filter = require('../filter');
const lexicon = require('../lexicon');

const meta = {
  id: 'wordchain',
  name: 'Word Chain',
  minPlayers: 2,
  maxPlayers: 8,
  midJoin: false,
  resetScores: true,
  scoreLabel: 'pts',
};

const TURN_TIMES = [10, 15, 20, 30];
const LIVES = [1, 2, 3, 5];
const MIN_LENS = [2, 3, 4];
const DICTS = ['common', 'off'];
const defaults = { turnTime: 20, lives: 3, minLen: 3, dictionary: 'common' };
const MAX_WORD = 24;
const START_LETTERS = 'abcdefghilmnoprstw';
const WIN_BONUS = 5;
const IDLE_LIMIT = 3; // consecutive timeouts before a player is dropped

// DICT is the small CURATED list (server-side only) used to check a letter can still be played and
// to pick restart letters. Answer validation is broader: any lexicon word is accepted (see isWord).
const DICT = new Set();
function loadDict() {
  const add = (w) => {
    w = String(w).toLowerCase().trim();
    if (/^[a-z]{2,24}$/.test(w)) DICT.add(w);
  };
  fs.readFileSync(path.join(__dirname, '..', 'data', 'wordchain.txt'), 'utf8').split(/\s+/).forEach(add);
  const bank = require('../data/words.json');
  for (const tier of Object.values(bank)) tier.forEach(add);
}
loadDict();

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (TURN_TIMES.includes(s.turnTime)) o.turnTime = s.turnTime;
  if (LIVES.includes(s.lives)) o.lives = s.lives;
  if (MIN_LENS.includes(s.minLen)) o.minLen = s.minLen;
  if (DICTS.includes(s.dictionary)) o.dictionary = s.dictionary;
  return o;
}

function normalize(w) {
  return lexicon.normalize(w);
}

const isWord = (w) => lexicon.has(w) || DICT.has(w);

function create(settings) {
  return { settings: { ...settings }, players: [], turn: 0, chain: [], used: new Set(), letter: '', from: 0, deadline: 0, over: false, order: [] };
}

function alive(st) {
  return st.players.filter((p) => p.lives > 0);
}

function resetClock(st, api) {
  st.deadline = api.now() + st.settings.turnTime * 1000;
}

function start(st, api) {
  const ps = api.seated();
  const shift = api.gameCount() % ps.length;
  const ordered = ps.slice(shift).concat(ps.slice(0, shift));
  st.players = ordered.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, lives: st.settings.lives, words: 0, idle: 0 }));
  st.letter = START_LETTERS[Math.floor(Math.random() * START_LETTERS.length)];
  resetClock(st, api);
  api.sys(`${st.players[0].name} starts. First word begins with "${st.letter.toUpperCase()}".`, 'accent');
  api.changed();
}

// The letter the next word must start with: the last letter of the chain, unless the chain was
// restarted on a fresh letter at its current length (see ensurePlayable).
function need(st) {
  return st.chain.length && st.from !== st.chain.length ? st.chain[st.chain.length - 1].word.slice(-1) : st.letter;
}

function playable(st, l) {
  for (const w of DICT) if (w[0] === l && w.length >= st.settings.minLen && !st.used.has(w)) return true;
  return false;
}

// With the word list on, a letter no unused listed word starts with (x after "xylophone" is used)
// would make every player lose lives in turn. Switch to a fresh letter instead.
function ensurePlayable(st, api) {
  if (st.settings.dictionary !== 'common') return;
  const l = need(st);
  if (playable(st, l)) return;
  const fresh = [...START_LETTERS].filter((c) => c !== l && playable(st, c));
  if (!fresh.length) return;
  st.letter = fresh[Math.floor(Math.random() * fresh.length)];
  st.from = st.chain.length;
  api.sys(`No words left that start with "${l.toUpperCase()}", so the next word starts with "${st.letter.toUpperCase()}".`, 'info');
}

function nextTurn(st, api) {
  for (let i = 1; i <= st.players.length; i++) {
    const idx = (st.turn + i) % st.players.length;
    if (st.players[idx].lives > 0) {
      st.turn = idx;
      break;
    }
  }
  resetClock(st, api);
  ensurePlayable(st, api);
}

function checkEnd(st, api) {
  const left = alive(st);
  if (left.length > 1) return false;
  finish(st, api, left[0] || null);
  return true;
}

function finish(st, api, winner) {
  if (st.over) return;
  st.over = true;
  if (winner) {
    const m = api.member(winner.id);
    if (m) m.score += WIN_BONUS;
    api.sys(`${winner.name} is the last one standing!`, 'good');
  }
  api.end({
    type: 'wordchain',
    winnerId: winner ? winner.id : null,
    players: st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, lives: p.lives, words: p.words })),
    chain: st.chain.slice(-12),
    chainLength: st.chain.length,
    bonus: WIN_BONUS,
  });
}

function reject(api, m, text) {
  api.toMember(m.id, 'notice', text);
}

function onAction(st, m, a, api) {
  if (st.over || !a || a.type !== 'word') return;
  const cur = st.players[st.turn];
  if (!cur || cur.id !== m.id || cur.lives <= 0) return;
  const w = normalize(a.word);
  if (!w) return;
  if (w.length > MAX_WORD || !/^[a-z]+$/.test(w)) return reject(api, m, 'Use letters only (a to z), no spaces.');
  if (w.length < st.settings.minLen) return reject(api, m, `Words need at least ${st.settings.minLen} letters.`);
  const needed = need(st);
  if (w[0] !== needed) return reject(api, m, `Your word has to start with "${needed.toUpperCase()}".`);
  if (st.used.has(w)) return reject(api, m, `"${w}" was already used.`);
  if (filter.hasBad(w)) return reject(api, m, 'That word is not allowed.');
  if (st.settings.dictionary === 'common' && !isWord(w)) return reject(api, m, `"${w}" isn't in the word list.`);
  st.used.add(w);
  st.chain.push({ word: w, by: cur.id, name: cur.name });
  cur.words++;
  cur.idle = 0;
  const mem = api.member(cur.id);
  if (mem) mem.score += Math.max(1, w.length - 2);
  nextTurn(st, api);
  api.changed();
}

function dropPlayer(st, p, api, why) {
  p.lives = 0;
  api.sys(`${p.name} ${why}.`, 'warn');
}

function tick(st, api, now) {
  if (st.over || now < st.deadline) return;
  const p = st.players[st.turn];
  p.lives--;
  p.idle++;
  if (p.lives > 0 && p.idle >= IDLE_LIMIT) dropPlayer(st, p, api, 'was away too long and is out');
  else if (p.lives <= 0) api.sys(`${p.name} ran out of time and is out!`, 'warn');
  else api.sys(`${p.name} ran out of time and loses a life (${p.lives} left).`, 'warn');
  if (checkEnd(st, api)) return;
  nextTurn(st, api);
  api.changed();
}

function onLeave(st, id, api) {
  if (st.over) return;
  const i = st.players.findIndex((p) => p.id === id);
  if (i < 0 || st.players[i].lives <= 0) return;
  dropPlayer(st, st.players[i], api, 'left');
  if (checkEnd(st, api)) return;
  if (i === st.turn) {
    nextTurn(st, api);
  }
  api.changed();
}

function view(st, m, now) {
  const cur = st.players[st.turn];
  return {
    players: st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, lives: p.lives, words: p.words })),
    maxLives: st.settings.lives,
    turnId: cur ? cur.id : null,
    letter: need(st),
    first: st.chain.length === 0,
    chain: st.chain.slice(-15),
    chainLength: st.chain.length,
    minLen: st.settings.minLen,
    timeLeft: Math.max(0, st.deadline - now),
    totalTime: st.settings.turnTime * 1000,
    myIndex: st.players.findIndex((p) => p.id === m.id),
  };
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view, DICT, normalize, isWord };
