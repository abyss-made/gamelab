// Gameplay audit fuzz/soak (issue #31). For every registered game and several player counts it
// drives the module with a fake room API and checks, without trusting any client:
//   1. malformed / out-of-turn / spectator actions never throw and never corrupt state,
//   2. every viewer's view stays serialisable (members, spectator, departed players),
//   3. a table that does nothing (everyone AFK) eventually ends or removes players: no game hangs,
//   4. random players leaving mid-game never throws, and the game ends or keeps a legal state.
// Deterministic: seeded PRNG, fake clock. Run: node test/audit.js [seed]
const { GAMES } = require('../server/games');

let failures = 0;
const ok = (cond, msg) => { if (!cond) { failures++; console.log('FAIL  ' + msg); } return cond; };
let passes = 0;
const pass = (msg) => { passes++; if (process.env.VERBOSE) console.log('PASS  ' + msg); };

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

function room(gameId, n, settings, seed) {
  const G = GAMES[gameId];
  const members = Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'P' + i, avatar: { e: 0, c: 0 }, score: 0 }));
  const log = { ended: null, changed: 0, errors: [] };
  let now = 1000000;
  const api = {
    now: () => now, seated: () => members.filter((m) => !m.gone), member: (id) => members.find((m) => m.id === id),
    gameCount: () => 1, changed: () => log.changed++, sys: () => {}, chat: () => {}, toMember: () => {}, toRoom: () => {},
    end: (r) => { log.ended = r; }, rotateLoser: () => 'Next',
  };
  const st = G.create({ ...G.defaults, ...settings });
  G.start(st, api);
  const spec = { id: 'spec', name: 'Spec', avatar: { e: 0, c: 0 }, score: 0 };
  return { G, st, api, members, spec, log, tick: (ms) => { now += ms; G.tick(st, api, now); }, now: () => now };
}

const JUNK = [undefined, null, 0, 1, -1, 1.5, NaN, '', 'x', '__proto__', [], {}, { type: null }, { type: 'x' }, { type: 'pick' }, { type: 'move', from: -1, to: 99 }, { type: 'fire', cell: 1e9 },
  { type: 'roll' }, { type: 'bid', qty: -5, face: 99 }, { type: 'guess', text: 'a'.repeat(5000) }, { type: 'submit', strokes: 'nope' }, { type: 'vote', target: {} }];
function junkAction(rand) {
  if (rand() < 0.5) return JUNK[Math.floor(rand() * JUNK.length)];
  const types = ['pick', 'move', 'roll', 'fire', 'place', 'ready', 'vote', 'guess', 'answer', 'submit', 'pass', 'bid', 'challenge', 'drop', 'resign', 'draw', 'start', 'buy', 'auction', 'trade', 'shoot', 'play', 'draw', 'ask', 'hold', 'clue', 'done', 'random', 'lock'];
  const a = { type: types[Math.floor(rand() * types.length)] };
  for (const k of ['move', 'cell', 'token', 'index', 'target', 'choice', 'text', 'word', 'x', 'y', 'angle', 'power', 'card', 'rank', 'color', 'qty', 'face', 'from', 'to', 'side']) {
    if (rand() < 0.3) a[k] = [0, 1, 2, 3, -1, 99, 1.5, 'a', 'rock', null, true, {}, []][Math.floor(rand() * 13)];
  }
  return a;
}
const settle = (v) => JSON.stringify(v);

function viewsOk(r, label) {
  for (const m of [...r.members, r.spec]) {
    try { settle(r.G.view(r.st, m, r.now())); } catch (e) { return ok(false, `${label}: view threw for ${m.id}: ${e.message}`); }
  }
  return true;
}

const seedArg = Number(process.argv[2]) || 12345;
for (const id of Object.keys(GAMES)) {
  const G = GAMES[id];
  const counts = [...new Set([G.meta.minPlayers, Math.min(G.meta.maxPlayers, G.meta.minPlayers + 1), G.meta.maxPlayers])];
  for (const n of counts) {
    for (let rep = 0; rep < 3; rep++) {
      const label = `${id} x${n} #${rep}`;
      const rand = rng(seedArg * 1000 + rep * 77 + n);
      let r;
      try { r = room(id, n, {}, 1); } catch (e) { ok(false, `${label}: start threw ${e.stack}`); continue; }
      let threw = null;
      try {
        // 1+4. fuzz with junk and random departures
        for (let step = 0; step < 400 && !r.log.ended; step++) {
          const who = rand() < 0.1 ? r.spec : r.members[Math.floor(rand() * n)];
          G.onAction(r.st, who, junkAction(rand), r.api);
          if (rand() < 0.3) r.tick(Math.floor(rand() * 20000));
          if (rand() < 0.01 && n > G.meta.minPlayers - 1) {
            const m = r.members[Math.floor(rand() * n)];
            if (!m.gone) { G.onLeave(r.st, m.id, r.api); if (rand() < 0.5) m.gone = true; }
          }
          if (step % 50 === 0 && !viewsOk(r, label + ' (fuzz)')) break;
        }
      } catch (e) { threw = e; }
      if (threw) { ok(false, `${label}: threw during fuzz: ${threw.stack.split('\n').slice(0, 3).join(' | ')}`); continue; }
      viewsOk(r, label);
      // 3. AFK soak: nobody acts; time passes. The game must end (idle forfeits/auto-play) or stay consistent.
      const r2 = room(id, n, {}, 2);
      try {
        for (let k = 0; k < 4000 && !r2.log.ended; k++) r2.tick(10000);
      } catch (e) { ok(false, `${label}: AFK soak threw ${e.stack.split('\n').slice(0, 3).join(' | ')}`); continue; }
      if (!r2.log.ended) ok(false, `${label}: AFK table never ended after 11 simulated hours (stuck game)`);
      else pass(`${label}: AFK table ends (${r2.log.ended.reason || r2.log.ended.type})`);
      viewsOk(r2, label + ' (afk)');
    }
  }
}
console.log(`${failures ? failures + ' FAILED' : 'All passed'} (${passes} AFK-termination checks, ${Object.keys(GAMES).length} games)`);
process.exit(failures ? 1 : 0);
