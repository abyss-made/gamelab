// Bot strategies played directly against the real game modules with a stub room API (no sockets).
// Every action a bot sends must change the game state (so it was legal), games must finish, and a
// seeded rng makes a failure reproducible: BOT_SEED=<n> node test/botsunit.js
'use strict';
const { GAMES } = require('../server/games');
const bots = require('../server/bots');
const H = require('./harness');

const r = H.reporter('botsunit');
const SEED = Number(process.env.BOT_SEED) || 33;
function seeded(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
Math.random = seeded(SEED);

function play(gameId, n, levels, maxSteps) {
  const G = GAMES[gameId];
  const members = levels.slice(0, n).map((d, i) => {
    const b = bots.createBot(gameId, new Set(), d);
    b.name = `B${i}`;
    return b;
  });
  let now = 1e12;
  let ended = null;
  const api = {
    now: () => now,
    seated: () => members,
    member: (id) => members.find((m) => m.id === id),
    gameCount: () => 1,
    changed() {},
    sys() {},
    chat() {},
    toMember() {},
    toRoom() {},
    end: (res) => (ended = res || { type: 'none' }),
    rotateLoser: () => null,
  };
  const st = G.create({ ...G.defaults });
  G.start(st, api);
  const S = bots.SUPPORT[gameId];
  let illegal = 0;
  let acts = 0;
  let step = 0;
  let maxMs = 0;
  for (; step < maxSteps && !ended; step++) {
    now += 2000;
    if (G.tick) G.tick(st, api, now);
    for (const m of members) {
      if (ended || !S.strategy.ready(st, m)) continue;
      const t1 = Date.now();
      const act = S.strategy.decide(st, m, { difficulty: m.difficulty, rng: Math.random });
      maxMs = Math.max(maxMs, Date.now() - t1);
      if (!act) continue;
      const before = JSON.stringify(st, (k, v) => (k === 'deadline' ? undefined : v));
      G.onAction(st, m, act, api);
      acts++;
      if (!ended && gameId !== 'rps' && JSON.stringify(st, (k, v) => (k === 'deadline' ? undefined : v)) === before) illegal++;
    }
  }
  return { ended, illegal, acts, step, members, maxMs };
}

const CASES = [
  ['tictactoe', 2, 3000], ['fourrow', 2, 3000], ['dotsboxes', 3, 3000], ['checkers', 2, 3000], ['chess', 2, 300], ['rps', 3, 3000],
];
for (const [g, n, cap] of CASES) {
  const levels = bots.SUPPORT[g].difficulties;
  const combos = levels.length > 1 ? [['easy', 'easy'], ['normal', 'hard'], ['hard', 'normal'], ['hard', 'hard']] : [['normal', 'normal']];
  for (const combo of combos) {
    const lv = n === 3 ? [...combo, combo[0]] : combo;
    const t0 = Date.now();
    const res = play(g, n, lv, cap);
    const finishes = g !== 'chess'; // chess is capped at a number of plies: legality is what is checked
    r.ok(res.illegal === 0 && res.acts > 0, `${g} ${lv.join('/')}: ${res.acts} bot actions, none illegal (${res.illegal}), slowest decision ${res.maxMs} ms, ${Date.now() - t0} ms total`);
    if (finishes) r.ok(!!res.ended, `${g} ${lv.join('/')}: the game finished by itself (${res.step} steps)`);
  }
}

// Hard tic tac toe never loses to any opponent, and wins when the opponent plays badly.
{
  let hardLosses = 0;
  for (let i = 0; i < 40; i++) {
    const res = play('tictactoe', 2, i % 2 ? ['hard', 'easy'] : ['easy', 'hard'], 100);
    const hard = res.members[i % 2 ? 0 : 1];
    if (res.ended && res.ended.winnerId && res.ended.winnerId !== hard.id) hardLosses++;
  }
  r.ok(hardLosses === 0, `hard Tic Tac Toe lost ${hardLosses} of 40 games against easy`);
}

// Strategies never read hidden state: RPS ready() only needs the phase and throw counter.
{
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'server', 'bots', 'boards.js'), 'utf8');
  const rpsSrc = src.slice(src.indexOf('const rps = {'));
  r.ok(!/pick\.|\.picks|matches/.test(rpsSrc), 'RPS bot code never touches the picks or matches');
}

console.log(`\nbotsunit: seed ${SEED}`);
process.exit(H.finish(r));
