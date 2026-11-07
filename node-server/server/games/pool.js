// Pool (8-ball): two players, server-simulated shots. Clients only send an aim angle, a power and (with
// ball-in-hand) a cue-ball position; the server runs the physics (physics.js) and sends back the sampled
// path, so no client ever decides what a shot did.
//
// Rules used here (a simplified "bar" 8-ball):
//  - 15 object balls: 1-7 solids, 9-15 stripes, 8 in the middle of the rack. The table is open until a player
//    legally pockets a ball after the break; that ball's type becomes theirs.
//  - After the first shot the cue ball must hit one of your own balls first (the 8 once yours are all down).
//    On an open table any ball but the 8 may be hit first.
//  - Foul = cue ball pocketed, cue ball hits nothing, wrong ball hit first, or no ball reaches a rail or a
//    pocket after contact. After a foul the other player has the cue ball in hand (anywhere on the table;
//    behind the head string for the break).
//  - You keep shooting while you legally pocket one of your balls; otherwise the turn passes.
//  - Pocketing the 8 wins only if all your balls are down and the shot had no foul; otherwise you lose.
//    On the break the 8 is just spotted again. Any pocket counts: there are no called shots.
//  - Not modelled: spin/english, jump or masse shots, push-out, 3-foul rule, re-rack on a bad break.
const P = require('./physics');
const { randInt } = require('./socialutil');

const meta = { id: 'pool', name: 'Pool', minPlayers: 2, maxPlayers: 2, midJoin: false, resetScores: false, scoreLabel: 'wins' };

const TURN_TIMES = [0, 30, 45, 60];
const defaults = { turnTime: 45, winnerStays: true };

const W = 1000;
const H = 500;
const R = 12.5;
const HEAD_X = 250; // head string: the break cue ball goes behind this line
const FOOT = { x: 700, y: 250 };
const POCKETS = [
  { x: 0, y: 0, r: 31 },
  { x: W / 2, y: 0, r: 27 },
  { x: W, y: 0, r: 31 },
  { x: 0, y: H, r: 31 },
  { x: W / 2, y: H, r: 27 },
  { x: W, y: H, r: 31 },
];
const WALLS = P.polyWalls([[0, 0], [W, 0], [W, H], [0, H]]);
const MIN_SPEED = 120;
const MAX_SPEED = 1500;
const MAX_SIM = 24; // seconds; a shot that is still rolling is stopped
const HOLD_MS = 350; // pause after the animation before play resumes
const TIMEOUT_LIMIT = 2;

const groupOf = (id) => (id === 8 ? 'eight' : id < 8 ? 'solids' : 'stripes');

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (TURN_TIMES.includes(s.turnTime)) o.turnTime = s.turnTime;
  if (typeof s.winnerStays === 'boolean') o.winnerStays = s.winnerStays;
  return o;
}

// 15 object balls in a triangle at the foot spot (apex towards the break), 8 in the centre, one solid and
// one stripe on the back corners, the rest shuffled. `shuffle` is injectable for tests.
function rackBalls(shuffle) {
  const solids = [1, 2, 3, 4, 5, 6, 7];
  const stripes = [9, 10, 11, 12, 13, 14, 15];
  const sh = shuffle || ((a) => { for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; });
  sh(solids); sh(stripes);
  const corner1 = solids.pop();
  const corner2 = stripes.pop();
  const rest = sh(solids.concat(stripes));
  const slots = [];
  for (let row = 0; row < 5; row++) for (let k = 0; k <= row; k++) slots.push([row, k]);
  const order = [];
  let ri = 0;
  for (const [row, k] of slots) {
    if (row === 2 && k === 1) order.push(8);
    else if (row === 4 && k === 0) order.push(corner1);
    else if (row === 4 && k === 4) order.push(corner2);
    else order.push(rest[ri++]);
  }
  const dx = Math.sqrt(3) * R + 0.4;
  const balls = [{ id: 0, x: HEAD_X, y: H / 2 }];
  slots.forEach(([row, k], i) => balls.push({ id: order[i], x: FOOT.x + row * dx, y: FOOT.y + (k - row / 2) * (2 * R + 0.4) }));
  return balls.map((b) => ({ ...b, gone: false }));
}

// True when a cue ball centred at (x, y) can legally be put down.
function validPlace(balls, x, y, breakShot) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (x < R || x > W - R || y < R || y > H - R) return false;
  if (breakShot && x > HEAD_X) return false;
  for (const p of POCKETS) if (Math.hypot(x - p.x, y - p.y) < p.r + R * 0.5) return false;
  for (const b of balls) if (b.id !== 0 && !b.gone && Math.hypot(b.x - x, b.y - y) < 2 * R + 0.5) return false;
  return true;
}

// Runs one shot on a copy of `balls`; returns the final balls and the events the rules need.
function simulateShot(balls, angle, power) {
  const sim = balls.map((b) => ({ id: b.id, x: b.x, y: b.y, vx: 0, vy: 0, r: R, gone: !!b.gone }));
  const cue = sim.find((b) => b.id === 0);
  const speed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * power;
  cue.vx = Math.cos(angle) * speed;
  cue.vy = Math.sin(angle) * speed;
  const ev = { firstContact: null, potted: [], rail: false, cuePotted: false };
  const res = P.run({
    balls: sim,
    walls: WALLS,
    collide: true,
    wallRest: 0.78,
    ballRest: 0.96,
    roll: 150,
    drag: 0.25,
    stopSpeed: 8,
    maxTime: MAX_SIM,
    sampleEvery: 8,
    onBalls: (a, b) => {
      if (ev.firstContact === null && (a.id === 0 || b.id === 0)) ev.firstContact = a.id === 0 ? b.id : a.id;
    },
    onWall: () => { if (ev.firstContact !== null) ev.rail = true; },
    afterStep: (b) => {
      for (let i = 0; i < POCKETS.length; i++) {
        const p = POCKETS[i];
        if (Math.hypot(b.x - p.x, b.y - p.y) < p.r) {
          if (b.id === 0) ev.cuePotted = true;
          else ev.potted.push({ id: b.id, pocket: i });
          return 'gone';
        }
      }
      return undefined;
    },
  });
  // Only balls that actually moved are included in the replay.
  const movers = [];
  sim.forEach((b, i) => {
    const o = balls[i];
    if (b.gone !== !!o.gone || Math.abs(b.x - o.x) > 0.05 || Math.abs(b.y - o.y) > 0.05) movers.push(i);
  });
  const frames = res.frames.map((f) => {
    const out = [f[0]];
    for (const i of movers) out.push(f[1 + i * 2], f[2 + i * 2]);
    return out;
  });
  return { balls: sim.map((b) => ({ id: b.id, x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, gone: !!b.gone })), ev, anim: { ids: movers.map((i) => sim[i].id), frames, duration: res.duration, settled: res.settled } };
}

function create(settings) {
  return {
    settings: { ...settings }, players: [], names: [], avatars: [], balls: rackBalls(), turn: 0, groups: [null, null], inHand: true,
    breakShot: true, shots: 0, last: null, anim: null, animUntil: 0, pendingEnd: null, deadline: 0, timeouts: [0, 0], over: false,
  };
}

const onTable = (st, group) => st.balls.filter((b) => !b.gone && b.id !== 0 && groupOf(b.id) === group).length;
const myGroupLeft = (st, idx) => (st.groups[idx] ? onTable(st, st.groups[idx]) : 15);

function resetClock(st, api, extraMs) {
  st.deadline = st.settings.turnTime ? api.now() + (extraMs || 0) + st.settings.turnTime * 1000 : 0;
}

function start(st, api) {
  const ps = api.seated().slice(0, 2);
  if (api.gameCount() % 2 === 0) ps.reverse();
  st.players = ps.map((m) => m.id);
  st.names = ps.map((m) => m.name);
  st.avatars = ps.map((m) => m.avatar);
  resetClock(st, api);
  api.sys(`${st.names[0]} breaks. Pocket your group, then the 8-ball.`, 'accent');
  api.changed();
}

function finish(st, api, winnerIdx, reason, forfeit) {
  if (st.over) return;
  st.over = true;
  st.pendingEnd = null;
  const result = {
    type: 'pool',
    balls: st.balls.map((b) => ({ id: b.id, x: b.x, y: b.y, gone: b.gone })),
    players: st.players.map((id, i) => ({ id, name: st.names[i], avatar: st.avatars[i], group: st.groups[i], left: myGroupLeft(st, i) })),
    winnerId: st.players[winnerIdx],
    draw: false,
    reason,
    forfeit: !!forfeit,
  };
  const w = api.member(st.players[winnerIdx]);
  if (w) w.score += 1;
  api.sys(`${st.names[winnerIdx]} wins!`, 'good');
  if (st.settings.winnerStays) result.nextUp = api.rotateLoser(st.players[1 - winnerIdx]);
  api.end(result);
}

function respotEight(st) {
  const eight = st.balls.find((b) => b.id === 8);
  for (let x = FOOT.x; x < W - R; x += 2 * R + 1) {
    if (!st.balls.some((b) => b !== eight && !b.gone && Math.hypot(b.x - x, b.y - FOOT.y) < 2 * R + 0.5)) {
      eight.x = x; eight.y = FOOT.y; eight.gone = false;
      return;
    }
  }
}

// Pure rules check for one shot. `group` is the shooter's group (null on an open table), `ownLeftBefore` how
// many of their balls were on the table before the shot. Returns { foul, winner: 'me' | 'opp' | null, reason, respot }.
function judge(group, ev, wasBreak, ownLeftBefore) {
  const eightIn = ev.potted.some((p) => p.id === 8);
  let foul = null;
  if (ev.cuePotted) foul = 'scratch';
  else if (ev.firstContact === null) foul = 'no-contact';
  else if (!wasBreak) {
    const hit = groupOf(ev.firstContact);
    if (!group) { if (hit === 'eight') foul = 'wrong-ball'; }
    else if (ownLeftBefore === 0 ? hit !== 'eight' : hit !== group) foul = 'wrong-ball';
  }
  if (!foul && !ev.rail && !ev.potted.length) foul = 'no-rail';
  let winner = null;
  let reason = null;
  let respot = false;
  if (eightIn) {
    if (wasBreak) respot = true;
    else if (!foul && group && ownLeftBefore === 0) { winner = 'me'; reason = 'eight'; }
    else { winner = 'opp'; reason = ev.cuePotted ? 'eight-scratch' : group && ownLeftBefore === 0 ? 'eight-foul' : 'eight-early'; }
  }
  return { foul, winner, reason, respot };
}

// Applies a validated shot: simulate, judge, update state, schedule the replay.
function takeShot(st, api, angle, power, place) {
  const me = st.turn;
  const opp = 1 - me;
  if (st.inHand) {
    const cue = st.balls.find((b) => b.id === 0);
    cue.x = place.x; cue.y = place.y; cue.gone = false;
  }
  const ownLeftBefore = myGroupLeft(st, me);
  const res = simulateShot(st.balls, angle, power);
  const wasBreak = st.breakShot;
  st.balls = res.balls;
  const { ev } = res;
  st.shots++;
  st.breakShot = false;
  st.inHand = false;

  const object = ev.potted.filter((p) => p.id !== 8);
  const verdict = judge(st.groups[me], ev, wasBreak, ownLeftBefore);
  const foul = verdict.foul;
  let winner = verdict.winner === 'me' ? me : verdict.winner === 'opp' ? opp : null;
  const reason = verdict.reason;
  if (verdict.respot) respotEight(st);
  // group assignment (open table, legal pocket)
  if (winner === null && !foul && !st.groups[me] && object.length && !wasBreak) {
    const g = groupOf(object[0].id);
    st.groups[me] = g;
    st.groups[opp] = g === 'solids' ? 'stripes' : 'solids';
    api.sys(`${st.names[me]} has ${g}. ${st.names[opp]} has ${st.groups[opp]}.`, 'accent');
  }
  const mine = st.groups[me] ? object.filter((p) => groupOf(p.id) === st.groups[me]) : [];
  let keep = false;
  if (winner === null) {
    if (foul) {
      st.turn = opp;
      st.inHand = true;
    } else if (wasBreak) {
      keep = object.length > 0;
    } else {
      keep = mine.length > 0;
    }
    if (!foul && !keep) st.turn = opp;
  }
  st.last = { by: st.players[me], angle, power, potted: ev.potted.map((p) => p.id), cuePotted: ev.cuePotted, firstContact: ev.firstContact, foul, shot: st.shots };
  if (foul) {
    const why = { scratch: 'scratched', 'no-contact': 'missed every ball', 'wrong-ball': 'hit the wrong ball first', 'no-rail': 'did not reach a rail' }[foul];
    api.sys(`Foul: ${st.names[me]} ${why}. ${st.names[opp]} has ball in hand.`, 'warn');
  }
  const ms = Math.ceil(res.anim.duration * 1000) + HOLD_MS;
  st.anim = { shot: st.shots, ...res.anim };
  st.animUntil = api.now() + ms;
  st.animStart = api.now();
  if (winner !== null) {
    st.pendingEnd = { winner, reason };
    st.deadline = 0;
  } else {
    resetClock(st, api, ms);
  }
  api.changed();
}

// A shot for a player who ran out of time: put the cue ball down legally and hit the nearest own ball.
function autoShot(st, api) {
  const me = st.turn;
  const g = st.groups[me];
  const want = (b) => (g ? (myGroupLeft(st, me) === 0 ? b.id === 8 : groupOf(b.id) === g) : b.id !== 8);
  let place = null;
  if (st.inHand) {
    const cands = [[HEAD_X - 60, H / 2], [HEAD_X - 100, H / 2 - 80], [HEAD_X - 100, H / 2 + 80], [R * 3, H / 2], [R * 3, R * 3]];
    if (!st.breakShot) for (let x = 100; x < W - 100; x += 60) for (let y = 60; y < H - 60; y += 60) cands.push([x, y]);
    const c = cands.find(([x, y]) => validPlace(st.balls, x, y, st.breakShot));
    place = { x: c ? c[0] : HEAD_X - 60, y: c ? c[1] : H / 2 };
  }
  const cue = place || st.balls.find((b) => b.id === 0);
  const targets = st.balls.filter((b) => !b.gone && b.id !== 0 && want(b));
  targets.sort((a, b) => Math.hypot(a.x - cue.x, a.y - cue.y) - Math.hypot(b.x - cue.x, b.y - cue.y));
  const t = targets[0] || st.balls.find((b) => !b.gone && b.id !== 0);
  const angle = Math.atan2(t.y - cue.y, t.x - cue.x);
  takeShot(st, api, angle, st.breakShot ? 0.9 : 0.5, place);
}

function onAction(st, m, a, api) {
  if (st.over || !a || typeof a !== 'object') return;
  const me = st.players.indexOf(m.id);
  if (me < 0) return;
  if (a.type === 'resign') {
    if (st.pendingEnd) return;
    return finish(st, api, 1 - me, 'resign', true);
  }
  if (a.type !== 'shoot' || me !== st.turn || st.pendingEnd || api.now() < st.animUntil) return;
  if (typeof a.angle !== 'number' || !Number.isFinite(a.angle) || Math.abs(a.angle) > 1000) return;
  if (typeof a.power !== 'number' || !Number.isFinite(a.power) || a.power < 0 || a.power > 1) return;
  let place = null;
  if (st.inHand) {
    if (!a.place || typeof a.place !== 'object' || !validPlace(st.balls, a.place.x, a.place.y, st.breakShot)) return;
    place = { x: a.place.x, y: a.place.y };
  }
  st.timeouts[me] = 0;
  takeShot(st, api, a.angle, Math.max(0.03, a.power), place);
}

function tick(st, api, now) {
  if (st.over) return;
  if (st.pendingEnd) {
    if (now >= st.animUntil) finish(st, api, st.pendingEnd.winner, st.pendingEnd.reason);
    return;
  }
  if (!st.deadline || now < st.deadline) return;
  const idx = st.turn;
  st.timeouts[idx]++;
  if (st.timeouts[idx] >= TIMEOUT_LIMIT) {
    api.sys(`${st.names[idx]} ran out of time twice, so ${st.names[1 - idx]} wins.`, 'warn');
    return finish(st, api, 1 - idx, 'time', true);
  }
  api.sys(`${st.names[idx]} ran out of time, so a shot was played for them.`, 'warn');
  autoShot(st, api);
}

function onLeave(st, id, api) {
  if (st.over) return;
  const idx = st.players.indexOf(id);
  if (idx < 0) return;
  if (st.pendingEnd) {
    // The deciding shot is already on screen; let it finish rather than rewarding a leaver.
    if (st.pendingEnd.winner !== idx) return;
  }
  api.sys(`${st.names[idx]} left, so ${st.names[1 - idx]} wins.`, 'warn');
  finish(st, api, 1 - idx, 'abandoned', true);
}

function view(st, m, now) {
  const me = st.players.indexOf(m.id);
  const busy = now < st.animUntil || !!st.pendingEnd;
  const anim = st.anim && now < st.animUntil ? { ...st.anim, elapsedMs: now - st.animStart } : null;
  return {
    table: { w: W, h: H, r: R, pockets: POCKETS, headX: HEAD_X },
    balls: st.balls,
    turn: st.turn,
    myIndex: me,
    inHand: st.inHand,
    breakShot: st.breakShot,
    busy,
    busyMs: Math.max(0, st.animUntil - now),
    anim,
    last: st.last,
    shots: st.shots,
    players: st.players.map((id, i) => ({ id, name: st.names[i], avatar: st.avatars[i], group: st.groups[i], left: myGroupLeft(st, i), potted: st.groups[i] ? 7 - onTable(st, st.groups[i]) : 0 })),
    timeLeft: st.deadline ? Math.max(0, st.deadline - now) : null,
  };
}

module.exports = {
  meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view,
  rules: { W, H, R, HEAD_X, FOOT, POCKETS, rackBalls, validPlace, simulateShot, groupOf, judge, MAX_SPEED, MIN_SPEED },
};
