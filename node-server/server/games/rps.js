// Rock Paper Scissors Tournament: single-elimination bracket with byes.
// Picks are simultaneous and private; a pick is only sent to everyone once the throw is resolved.
const { shuffle } = require('../util');

const meta = {
  id: 'rps',
  name: 'Rock Paper Scissors',
  minPlayers: 2,
  maxPlayers: 16,
  midJoin: false,
  resetScores: true,
  scoreLabel: 'pts',
};

const BEST_OF = [1, 3, 5];
const PICK_TIMES = [8, 12, 20];
const defaults = { bestOf: 3, pickTime: 12 };
const REVEAL_MS = 2500;
const MISS_LIMIT = 2; // consecutive missed picks in one match forfeit it
const CHAMPION_BONUS = 2;
const MOVES = ['rock', 'paper', 'scissors'];
const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (BEST_OF.includes(s.bestOf)) o.bestOf = s.bestOf;
  if (PICK_TIMES.includes(s.pickTime)) o.pickTime = s.pickTime;
  return o;
}

function create(settings) {
  return { settings: { ...settings }, players: [], rounds: [], round: 0, phase: 'pick', deadline: 0, throwNo: 0, reveal: null, champion: null, over: false, roundsTotal: 0 };
}

const P = (st, id) => st.players.find((p) => p.id === id);

function makeMatch(a, b) {
  return { a, b, wins: { a: 0, b: 0 }, pick: { a: null, b: null }, miss: { a: 0, b: 0 }, history: [], winner: null, bye: false };
}

function pairRound(ids) {
  // ids: players in seed order. Pads to a power of two; byes go to the first seeds, never bye vs bye.
  let size = 2;
  while (size < ids.length) size *= 2;
  const ms = [];
  for (let m = 0; m < size / 2; m++) ms.push(makeMatch(ids[m], ids[size - 1 - m] || null));
  return ms;
}

function start(st, api) {
  st.players = api.seated().map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, seed: 0, matchWins: 0, out: false, left: false }));
  const order = shuffle(st.players.map((p) => p.id));
  order.forEach((id, i) => (P(st, id).seed = i));
  st.roundsTotal = Math.ceil(Math.log2(order.length));
  st.rounds = [pairRound(order)];
  st.round = 0;
  api.sys(`Rock Paper Scissors Tournament: ${order.length} players, best of ${st.settings.bestOf}.`, 'accent');
  settleByes(st, api);
  beginThrow(st, api);
  api.changed();
}

const need = (st) => Math.ceil(st.settings.bestOf / 2);
const liveMatches = (st) => st.rounds[st.round].filter((m) => !m.winner && !m.dead);

function setScore(st, api, p) {
  const mem = api.member(p.id);
  if (mem) mem.score = p.matchWins + (st.champion === p.id ? CHAMPION_BONUS : 0);
}

function decide(st, api, match, side, forfeit) {
  const id = side === 'a' ? match.a : match.b;
  match.winner = id;
  match.forfeit = !!forfeit;
  const p = P(st, id);
  if (!match.bye) {
    p.matchWins++;
    setScore(st, api, p);
  }
  const loserId = side === 'a' ? match.b : match.a;
  const lp = loserId && P(st, loserId);
  if (lp) lp.out = true;
}

// Byes and matches whose opponent has left resolve immediately.
function settleByes(st, api) {
  for (const m of st.rounds[st.round]) {
    if (m.winner || m.dead) continue;
    const a = m.a && P(st, m.a);
    const b = m.b && P(st, m.b);
    const aGone = !a || a.left;
    const bGone = !b || b.left;
    if (aGone && bGone) {
      m.dead = true; // both sides gone: explicitly resolved, never played or advanced
      m.bye = true;
    } else if (!m.b || bGone) {
      m.bye = !m.b;
      decide(st, api, m, 'a', bGone && !!m.b);
    } else if (aGone) decide(st, api, m, 'b', true);
  }
}

function beginThrow(st, api) {
  st.phase = 'pick';
  st.reveal = null;
  st.throwNo++;
  for (const m of liveMatches(st)) m.pick = { a: null, b: null };
  st.deadline = api.now() + st.settings.pickTime * 1000;
}

function allPicked(st) {
  return liveMatches(st).every((m) => m.pick.a && m.pick.b);
}

function resolveThrow(st, api) {
  const results = [];
  for (const m of liveMatches(st)) {
    const { a, b } = m.pick;
    let out;
    if (a && b) out = a === b ? 'tie' : BEATS[a] === b ? 'a' : 'b';
    else if (a) out = 'a';
    else if (b) out = 'b';
    else out = 'void';
    for (const s of ['a', 'b']) m.miss[s] = m.pick[s] ? 0 : m.miss[s] + 1;
    if (out === 'a' || out === 'b') m.wins[out]++;
    m.history.push({ a, b, out });
    results.push({ a: m.a, b: m.b, pickA: a, pickB: b, out });
    if (m.wins.a >= need(st)) decide(st, api, m, 'a');
    else if (m.wins.b >= need(st)) decide(st, api, m, 'b');
    else if (m.miss.a >= MISS_LIMIT || m.miss.b >= MISS_LIMIT) {
      // Whoever kept playing wins; if both vanished, the better seed advances.
      const pa = P(st, m.a);
      const pb = P(st, m.b);
      const aOut = m.miss.a >= MISS_LIMIT;
      const bOut = m.miss.b >= MISS_LIMIT;
      const side = aOut && bOut ? (pa.seed < pb.seed ? 'a' : 'b') : aOut ? 'b' : 'a';
      api.sys(`${(side === 'a' ? pb : pa).name} stopped playing and forfeits the match.`, 'warn');
      decide(st, api, m, side, true);
    }
  }
  st.reveal = { results };
  st.phase = 'reveal';
  st.deadline = api.now() + REVEAL_MS;
  api.changed();
}

function nextAfterReveal(st, api) {
  if (liveMatches(st).length) {
    settleByes(st, api); // an opponent may have left during the reveal
    if (liveMatches(st).length) {
      beginThrow(st, api);
      return api.changed(); // clients are still showing the reveal until this is broadcast
    }
  }
  advanceRound(st, api);
}

function advanceRound(st, api) {
  const winners = st.rounds[st.round].map((m) => m.winner).filter(Boolean);
  if (winners.length <= 1) return finish(st, api, winners[0]);
  st.rounds.push(pairRound(winners));
  st.round++;
  settleByes(st, api);
  if (!liveMatches(st).length) return advanceRound(st, api);
  api.sys(`Round ${st.round + 1}: ${winners.length} players left.`, 'accent');
  beginThrow(st, api);
  api.changed();
}

function finish(st, api, championId) {
  if (st.over) return;
  st.over = true;
  const champ = championId && P(st, championId);
  if (champ) {
    st.champion = champ.id;
    setScore(st, api, champ);
    api.sys(`${champ.name} wins the tournament!`, 'good');
  }
  // Placement: champion first, then by how deep each player went (match wins), then seed.
  const standings = st.players
    .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, wins: p.matchWins, points: p.matchWins + (p.id === st.champion ? CHAMPION_BONUS : 0), champion: p.id === st.champion, left: p.left }))
    .sort((x, y) => (y.champion - x.champion) || (y.wins - x.wins) || (P(st, x.id).seed - P(st, y.id).seed));
  api.end({ type: 'rps', winnerId: st.champion, standings, bracket: bracketView(st), bestOf: st.settings.bestOf, forfeit: !champ });
}

function onAction(st, m, a, api) {
  if (st.over || st.phase !== 'pick' || !a || a.type !== 'pick') return;
  if (!MOVES.includes(a.move)) return;
  const match = liveMatches(st).find((x) => x.a === m.id || x.b === m.id);
  if (!match) return;
  const side = match.a === m.id ? 'a' : 'b';
  if (match.pick[side]) return; // final once made
  match.pick[side] = a.move;
  if (allPicked(st)) return resolveThrow(st, api);
  api.changed();
}

function tick(st, api, now) {
  if (st.over || now < st.deadline) return;
  if (st.phase === 'pick') return resolveThrow(st, api);
  nextAfterReveal(st, api);
}

function onLeave(st, id, api) {
  if (st.over) return;
  const p = P(st, id);
  if (!p || p.left) return;
  p.left = true;
  api.sys(`${p.name} left.`, 'warn');
  const match = st.rounds[st.round].find((x) => !x.winner && !x.dead && (x.a === id || x.b === id));
  if (match) {
    decide(st, api, match, match.a === id ? 'b' : 'a', true);
    p.out = true;
  }
  if (st.players.filter((x) => !x.left).length < 2 && !st.over) {
    const last = st.players.find((x) => !x.left);
    return finish(st, api, last && last.id);
  }
  if (st.phase === 'pick' && liveMatches(st).length && allPicked(st)) return resolveThrow(st, api);
  if (st.phase === 'pick' && !liveMatches(st).length) return advanceRound(st, api);
  api.changed();
}

function bracketView(st) {
  return st.rounds.map((round) =>
    round.map((m) => ({
      a: m.a,
      b: m.b,
      winsA: m.wins.a,
      winsB: m.wins.b,
      winner: m.winner,
      bye: m.bye,
      forfeit: !!m.forfeit,
    })),
  );
}

function view(st, m, now) {
  const mine = st.rounds[st.round].find((x) => !x.winner && !x.dead && (x.a === m.id || x.b === m.id));
  const side = mine ? (mine.a === m.id ? 'a' : 'b') : null;
  return {
    players: st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, out: p.out, left: p.left, wins: p.matchWins })),
    bracket: bracketView(st),
    round: st.round,
    roundsTotal: st.roundsTotal,
    bestOf: st.settings.bestOf,
    phase: st.phase,
    throwNo: st.throwNo,
    // Only your own pick is sent while picks are open. The reveal carries all resolved throws.
    myPick: side ? mine.pick[side] : null,
    inMatch: !!mine,
    locked: st.phase === 'pick' ? liveMatches(st).flatMap((x) => [x.a && x.pick.a ? x.a : null, x.b && x.pick.b ? x.b : null]).filter(Boolean) : [],
    reveal: st.phase === 'reveal' ? st.reveal : null,
    timeLeft: Math.max(0, st.deadline - now),
    totalTime: (st.phase === 'pick' ? st.settings.pickTime : REVEAL_MS / 1000) * 1000,
  };
}

module.exports = { meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view };
