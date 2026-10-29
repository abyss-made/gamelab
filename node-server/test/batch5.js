// Batch 5 tests: Pool, Mini Golf, Property Tycoon.
// Physics and rules are checked against the modules with a fake room API (fast, deterministic); privacy,
// validation and room persistence are checked with real Socket.IO clients.
// Run: node test/batch5.js
const { spawn } = require('child_process');
const path = require('path');
const crypto = require('crypto');
const { io } = require('socket.io-client');

// Property Tycoon draws its dice from socialutil.randInt. Wrap it before the games load so tests can force
// specific dice; with nothing queued it is the real crypto generator.
const SU = require('../server/games/socialutil');
const realRand = SU.randInt;
const forced = [];
SU.randInt = (n) => (forced.length ? forced.shift() : realRand(n));
const { GAMES } = require('../server/games');
const P = require('../server/games/physics');
const B = require('../server/games/tycoonboard');
const COURSES = require('../server/games/golfcourses');
const pool = GAMES.pool;
const GR_early = () => GAMES.golf.rules;
const golf = GAMES.golf;
const tycoon = GAMES.tycoon;

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fakeRoom(names, gameId, settings, gameCount = 1) {
  const G = GAMES[gameId];
  const members = names.map((n, i) => ({ id: 'p' + i, name: n, avatar: { e: 0, c: 0 }, score: 0 }));
  const log = { sys: [], ended: null, changed: 0, rotated: null };
  let now = 1000000;
  const api = {
    now: () => now,
    seated: () => members,
    member: (id) => members.find((m) => m.id === id),
    gameCount: () => gameCount,
    changed: () => log.changed++,
    sys: (t) => log.sys.push(t),
    toMember: () => {},
    end: (r) => { log.ended = r; },
    rotateLoser: (id) => { log.rotated = id; return 'Next'; },
  };
  const st = G.create({ ...G.defaults, ...settings });
  G.start(st, api);
  const spectator = { id: 'spec', name: 'Spec', avatar: { e: 0, c: 0 }, score: 0 };
  const adv = (ms) => { now += ms; G.tick(st, api, now); };
  const act = (i, a) => G.onAction(st, i === 'spec' ? spectator : members[i], a, api);
  const view = (i) => G.view(st, i === 'spec' ? spectator : members[i], now);
  return { G, st, api, members, log, adv, act, view, now: () => now, leave: (i) => G.onLeave(st, members[i].id, api) };
}

// ---------------- Physics ----------------
(function physics() {
  // determinism
  const mk = () => pool.rules.rackBalls((a) => a); // identity shuffle: fixed layout
  const r1 = pool.rules.simulateShot(mk(), 0.03, 0.9);
  const r2 = pool.rules.simulateShot(mk(), 0.03, 0.9);
  ok(JSON.stringify(r1.anim) === JSON.stringify(r2.anim) && JSON.stringify(r1.balls) === JSON.stringify(r2.balls), 'Physics: the same shot always gives the identical result (deterministic)');

  // replay timestamps keep sub-frame precision so samples are not collapsed onto the same time
  const g0 = COURSES.COURSES[0].holes[0];
  const fr = GR_early().simulatePutt(g0, g0.tee[0], g0.tee[1], 0, 0.5).anim.frames;
  ok(new Set(fr.slice(0, 20).map((f) => f[0])).size === Math.min(20, fr.length) && fr[1][0] > 0.01 && fr[1][0] < 0.02, 'Physics: replay timestamps are distinct per sample (1/60 s apart for golf)');
  // equal-mass head-on collision: the mover stops, the target takes the speed (momentum and energy kept, e=1)
  const a = { x: 0, y: 0, vx: 100, vy: 0, r: 10 };
  const b = { x: 19, y: 0, vx: 0, vy: 0, r: 10 };
  P.bounceBalls(a, b, 1);
  ok(Math.abs(a.vx) < 1e-9 && Math.abs(b.vx - 100) < 1e-9, 'Physics: a head-on collision of equal balls transfers all speed');
  const c = { x: 0, y: 0, vx: 60, vy: 30, r: 10 };
  const d = { x: 0, y: 19, vx: -20, vy: -10, r: 10 };
  const p0 = [c.vx + d.vx, c.vy + d.vy];
  const e0 = c.vx ** 2 + c.vy ** 2 + d.vx ** 2 + d.vy ** 2;
  P.bounceBalls(c, d, 1);
  const e1 = c.vx ** 2 + c.vy ** 2 + d.vx ** 2 + d.vy ** 2;
  ok(Math.abs(c.vx + d.vx - p0[0]) < 1e-9 && Math.abs(c.vy + d.vy - p0[1]) < 1e-9 && Math.abs(e1 - e0) < 1e-6, 'Physics: oblique collisions conserve momentum and (elastic) energy');
  const sep = { x: 0, y: 0, vx: 5, vy: 0, r: 10 };
  const sep2 = { x: 5, y: 0, vx: 0, vy: 0, r: 10 };
  P.bounceBalls(sep, sep2, 0.9);
  ok(Math.hypot(sep.x - sep2.x, sep.y - sep2.y) >= 19.99, 'Physics: overlapping balls are pushed apart');

  // wall reflection with loss
  const w = { x: 5, y: 50, vx: -100, vy: 40, r: 10 };
  P.bounceSegment(w, 0, 0, 0, 100, 0.8);
  ok(Math.abs(w.vx - 80) < 1e-9 && w.vy === 40 && w.x >= 10 - 1e-9, 'Physics: a wall reflects the normal speed with restitution and keeps the tangent speed');

  // friction brings every ball to rest within the time limit and nothing leaves the table
  let allRest = true, allInside = true, nan = false;
  for (let i = 0; i < 40; i++) {
    const balls = pool.rules.rackBalls();
    const res = pool.rules.simulateShot(balls, (i / 40) * Math.PI * 2, 0.15 + (i % 7) / 8);
    if (!res.anim.settled) allRest = false;
    for (const q of res.balls) {
      if (!Number.isFinite(q.x) || !Number.isFinite(q.y)) nan = true;
      if (!q.gone && (q.x < 0 || q.x > pool.rules.W || q.y < 0 || q.y > pool.rules.H)) allInside = false;
    }
  }
  ok(allRest, 'Physics: 40 random Pool shots all settle before the time limit');
  ok(allInside && !nan, 'Physics: no ball ever leaves the table or goes NaN in 40 random shots');

  // the rack
  const rack = pool.rules.rackBalls();
  const ids = rack.map((q) => q.id).sort((x, y) => x - y);
  ok(rack.length === 16 && ids.join() === [...Array(16).keys()].join(), 'Pool: the rack has the cue ball and balls 1-15, each once');
  let min = 1e9;
  for (const q of rack) for (const o of rack) if (q !== o) min = Math.min(min, Math.hypot(q.x - o.x, q.y - o.y));
  ok(min >= 2 * pool.rules.R, 'Pool: no balls overlap in the rack');
  const centre = rack.find((q) => q.id === 8);
  const apex = rack.filter((q) => q.id !== 0).sort((x, y) => x.x - y.x)[0];
  ok(Math.abs(centre.y - 250) < 1 && centre.x > apex.x + 10, 'Pool: the 8-ball sits in the middle of the third row');
  const backRow = rack.filter((q) => q.id !== 0 && q.x > 780).map((q) => q.id);
  ok(backRow.length === 5 && Math.min(...backRow) < 8 && Math.max(...backRow) > 8, 'Pool: the back row corners mix a solid and a stripe');
  let randomised = new Set();
  for (let i = 0; i < 6; i++) randomised.add(pool.rules.rackBalls().map((q) => q.id).join());
  ok(randomised.size > 1, 'Pool: the rack order is shuffled');

  // cue placement
  const balls = pool.rules.rackBalls();
  const V = pool.rules.validPlace;
  ok(V(balls, 100, 250, true) && !V(balls, 300, 250, true), 'Pool: the break cue ball must be behind the head string');
  ok(V(balls, 300, 100, false) && !V(balls, 700, 250, false), 'Pool: ball in hand cannot overlap another ball');
  ok(!V(balls, -5, 250, false) && !V(balls, 400, 520, false) && !V(balls, NaN, 10, false) && !V(balls, 5, 5, false), 'Pool: ball in hand stays on the table and out of pockets');
  ok(!V(balls, 'x', 'y', false) && !V(balls, undefined, 1, false), 'Pool: non-numeric placements are rejected');
})();

// ---------------- Pool rules ----------------
function poolScene(setup, opts = {}) {
  const r = fakeRoom(['Ann', 'Bo'], 'pool', { turnTime: opts.turnTime || 0 });
  r.st.breakShot = !!opts.breakShot;
  r.st.inHand = !!opts.inHand;
  for (const b of r.st.balls) b.gone = true;
  for (const [id, x, y] of setup) {
    const b = r.st.balls.find((q) => q.id === id);
    b.x = x; b.y = y; b.gone = false;
  }
  if (opts.groups) r.st.groups = opts.groups;
  return r;
}
const shoot = (r, i, angle, power, place) => r.act(i, { type: 'shoot', angle, power, place });
const settle = (r) => r.adv(r.st.animUntil - r.now() + 5);
const toward = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);

(function poolRules() {
  // opening state
  {
    const r = fakeRoom(['Ann', 'Bo'], 'pool', {});
    ok(r.st.inHand && r.st.breakShot && r.st.turn === 0 && r.st.balls.length === 16, 'Pool: the game starts with the breaker placing the cue ball');
    ok(r.view(0).table.pockets.length === 6 && r.view(0).balls.length === 16, 'Pool: the view describes a six-pocket table');
    const r2 = fakeRoom(['Ann', 'Bo'], 'pool', {}, 2);
    ok(r2.st.players[0] === 'p1', 'Pool: who breaks alternates between games');
  }
  // legal pot on an open table assigns groups and keeps the turn
  {
    const r = poolScene([[0, 200, 200], [3, 100, 100], [12, 800, 300]]);
    shoot(r, 0, toward(200, 200, 100, 100), 0.5);
    ok(r.st.shots === 1 && r.st.last.potted.join() === '3', 'Pool: a ball driven at a corner pocket is pocketed');
    ok(r.st.groups[0] === 'solids' && r.st.groups[1] === 'stripes', 'Pool: the first legal pocket on an open table assigns the groups');
    ok(r.st.turn === 0 && !r.st.inHand && !r.st.last.foul, 'Pool: you shoot again after legally pocketing your ball');
    ok(r.view(0).anim && r.view(0).anim.ids.includes(3) && r.view(0).anim.frames.length > 3, 'Pool: the view carries the sampled path for every moving ball');
    ok(r.view(0).busyMs > 0, 'Pool: the view reports that the shot is still playing');
  }
  // actions are refused while the shot plays
  {
    const r = poolScene([[0, 200, 200], [3, 100, 100], [12, 800, 300]]);
    shoot(r, 0, toward(200, 200, 100, 100), 0.5);
    const before = r.st.shots;
    shoot(r, 0, 0, 0.5);
    ok(r.st.shots === before, 'Pool: a shot sent while the balls are still moving is ignored');
    settle(r);
    shoot(r, 0, 0.3, 0.2);
    ok(r.st.shots === before + 1, 'Pool: shooting works again once the shot has finished');
  }
  // scratch
  {
    const r = poolScene([[0, 100, 100], [12, 800, 300]]);
    shoot(r, 0, toward(100, 100, 0, 0), 0.6);
    ok(r.st.last.foul === 'scratch' && r.st.last.cuePotted, 'Pool: pocketing the cue ball is a scratch');
    ok(r.st.turn === 1 && r.st.inHand, 'Pool: after a scratch the other player has ball in hand');
    shoot(r, 1, 0, 0.5);
    ok(r.st.shots === 1, 'Pool: ball in hand needs a cue ball position (shot without one is ignored)');
    shoot(r, 1, 0, 0.5, { x: 800, y: 300 });
    ok(r.st.shots === 1, 'Pool: an illegal cue ball position (on another ball) is rejected');
    shoot(r, 1, 0, 0.5, { x: 'a', y: {} });
    ok(r.st.shots === 1, 'Pool: a non-numeric cue ball position is rejected');
    settle(r);
    shoot(r, 1, toward(300, 300, 800, 300), 0.6, { x: 300, y: 300 });
    ok(r.st.shots === 2 && r.st.balls.find((b) => b.id === 0).x > 300, 'Pool: a legal placement is accepted and the shot plays from there');
  }
  // no contact
  {
    const r = poolScene([[0, 300, 250], [12, 800, 100]]);
    shoot(r, 0, toward(300, 250, 300, 0), 0.5);
    ok(r.st.last.foul === 'no-contact' && r.st.turn === 1 && r.st.inHand, 'Pool: hitting no ball is a foul and gives ball in hand');
  }
  // wrong ball first
  {
    const r = poolScene([[0, 300, 250], [9, 400, 250], [2, 700, 450]], { groups: ['solids', 'stripes'] });
    shoot(r, 0, 0, 0.5);
    ok(r.st.last.foul === 'wrong-ball' && r.st.turn === 1, 'Pool: hitting the opponent\'s ball first is a foul');
  }
  // eight first on open table
  {
    const r = poolScene([[0, 300, 250], [8, 400, 250], [2, 700, 450]]);
    shoot(r, 0, 0, 0.5);
    ok(r.st.last.foul === 'wrong-ball', 'Pool: hitting the 8-ball first on an open table is a foul');
  }
  // hitting own group first is fine and an opponent ball pocketed ends the turn without a foul
  {
    const r = poolScene([[0, 250, 250], [2, 200, 200], [10, 100, 100], [4, 800, 400]], { groups: ['solids', 'stripes'] });
    shoot(r, 0, toward(250, 250, 200, 200), 0.5);
    ok(r.st.last.potted.join() === '10' && !r.st.last.foul, 'Pool: your ball can drive the opponent\'s ball into a pocket without a foul');
    ok(r.st.turn === 1 && !r.st.inHand, 'Pool: pocketing only the opponent\'s ball passes the turn without ball in hand');
    ok(r.st.balls.find((b) => b.id === 10).gone, 'Pool: that ball stays pocketed');
  }
  // no rail
  {
    const r = poolScene([[0, 500, 250], [1, 545, 250], [10, 800, 100]]);
    shoot(r, 0, 0, 0.03);
    ok(r.st.last.foul === 'no-rail' && r.st.turn === 1, 'Pool: a shot where nothing reaches a rail or pocket is a foul');
  }
  // eight ball early / legal / on the break
  {
    const r = poolScene([[0, 200, 200], [8, 100, 100], [3, 800, 300], [10, 800, 100]]);
    shoot(r, 0, toward(200, 200, 100, 100), 0.5);
    ok(r.st.pendingEnd && r.st.pendingEnd.winner === 1 && !r.log.ended, 'Pool: pocketing the 8 too early loses, but the result waits for the shot to play out');
    settle(r);
    ok(r.log.ended && r.log.ended.winnerId === 'p1' && r.log.ended.reason === 'eight-early', 'Pool: the other player is declared the winner after the replay');
    ok(r.members[1].score === 1 && r.log.rotated === 'p0', 'Pool: the winner gets a point and winner-stays rotates the loser out');
    ok(!r.log.ended.nextUp || r.log.ended.nextUp === 'Next', 'Pool: the result names who plays next');
  }
  {
    const r = poolScene([[0, 200, 200], [8, 100, 100], [10, 800, 100]], { groups: ['solids', 'stripes'] });
    shoot(r, 0, toward(200, 200, 100, 100), 0.5);
    settle(r);
    ok(r.log.ended && r.log.ended.winnerId === 'p0' && r.log.ended.reason === 'eight', 'Pool: pocketing the 8 after clearing your group wins');
  }
  {
    const r = poolScene([[0, 200, 200], [8, 100, 100], [3, 800, 300]], { groups: ['solids', 'stripes'] });
    shoot(r, 0, toward(200, 200, 100, 100), 0.5);
    settle(r);
    ok(r.log.ended && r.log.ended.winnerId === 'p1', 'Pool: pocketing the 8 with your own balls still on the table loses');
  }
  {
    const J = pool.rules.judge;
    const ev = (o) => ({ firstContact: 3, potted: [], rail: true, cuePotted: false, ...o });
    let v = J('solids', ev({ potted: [{ id: 8 }], cuePotted: true }), false, 0);
    ok(v.winner === 'opp' && v.reason === 'eight-scratch' && v.foul === 'scratch', 'Pool: pocketing the 8 and scratching in the same shot loses');
    v = J('solids', ev({ firstContact: 8, potted: [{ id: 8 }] }), false, 0);
    ok(v.winner === 'me' && v.reason === 'eight' && !v.foul, 'Pool rules: the 8 pocketed legally after clearing your group wins');
    v = J('solids', ev({ firstContact: 3, potted: [{ id: 8 }] }), false, 0);
    ok(v.winner === 'opp' && v.reason === 'eight-foul', 'Pool rules: pocketing the 8 after hitting a different ball first loses');
    v = J('solids', ev({ firstContact: 8, potted: [{ id: 8 }] }), false, 2);
    ok(v.winner === 'opp' && v.reason === 'eight-early', 'Pool rules: pocketing the 8 with balls of yours left loses');
    v = J(null, ev({ firstContact: 4, potted: [{ id: 8 }] }), false, 7);
    ok(v.winner === 'opp', 'Pool rules: pocketing the 8 on an open table loses');
    v = J(null, ev({ firstContact: 4, potted: [{ id: 8 }] }), true, 7);
    ok(v.winner === null && v.respot, 'Pool rules: the 8 on the break is respotted');
    v = J('solids', ev({ firstContact: 8 }), false, 3);
    ok(v.foul === 'wrong-ball', 'Pool rules: you must hit your own group first while you still have balls on the table');
    v = J('solids', ev({ firstContact: 3 }), false, 0);
    ok(v.foul === 'wrong-ball', 'Pool rules: once your group is cleared the 8 must be hit first');
    v = J('solids', ev({ firstContact: 3, rail: false }), false, 3);
    ok(v.foul === 'no-rail', 'Pool rules: contact without any rail or pocket is a foul');
    v = J('solids', ev({ firstContact: 3, rail: false, potted: [{ id: 3 }] }), false, 3);
    ok(!v.foul, 'Pool rules: a pocketed ball counts as reaching a pocket (no foul)');
    v = J('solids', ev({ firstContact: null }), false, 3);
    ok(v.foul === 'no-contact', 'Pool rules: missing every ball is a foul');
  }
  {
    const r = poolScene([[0, 200, 200], [8, 100, 100], [3, 800, 300]], { breakShot: true });
    shoot(r, 0, toward(200, 200, 100, 100), 0.5);
    ok(!r.st.pendingEnd && !r.st.balls.find((b) => b.id === 8).gone, 'Pool: an 8-ball pocketed on the break is spotted again, not a loss');
  }
  {
    const r = poolScene([[0, 200, 200], [3, 100, 100], [12, 800, 300]], { breakShot: true });
    shoot(r, 0, toward(200, 200, 100, 100), 0.5);
    ok(r.st.turn === 0 && !r.st.groups[0], 'Pool: the breaker continues after pocketing a ball on the break (groups stay open)');
  }
  {
    // on the break a ball that is not an object ball pocketed keeps the turn; nothing pocketed passes it
    const r = poolScene([[0, 500, 250], [1, 545, 250], [10, 560, 270]], { breakShot: true });
    shoot(r, 0, 0, 0.9);
    ok(r.st.turn === 1 && !r.st.last.foul, 'Pool: a break that pockets nothing (but reaches a rail) just passes the turn');
  }
  // validation
  {
    const r = poolScene([[0, 300, 250], [1, 400, 250], [12, 800, 100]]);
    for (const bad of [
      { type: 'shoot', angle: 'x', power: 0.5 }, { type: 'shoot', angle: NaN, power: 0.5 }, { type: 'shoot', angle: 0, power: 2 },
      { type: 'shoot', angle: 0, power: -1 }, { type: 'shoot', angle: 0, power: Infinity }, { type: 'shoot', angle: 1e9, power: 0.5 },
      { type: 'shoot', power: 0.5 }, { type: 'shoot', angle: 0 }, { type: 'jump' }, null, 'shoot', 5, { type: 'shoot', angle: [0], power: [0.5] },
    ]) r.act(0, bad);
    ok(r.st.shots === 0, 'Pool: malformed shot messages are all ignored');
    shoot(r, 1, 0, 0.5);
    r.act('spec', { type: 'shoot', angle: 0, power: 0.5 });
    ok(r.st.shots === 0, 'Pool: the player not on turn and spectators cannot shoot');
    shoot(r, 0, 0, 0.5);
    ok(r.st.shots === 1, 'Pool: a valid shot from the player on turn is accepted');
  }
  // spectator view and no hidden info
  {
    const r = poolScene([[0, 300, 250], [1, 400, 250], [12, 800, 100]]);
    const v = r.view('spec');
    ok(v.myIndex === -1 && v.balls.length === 16 && !('deadline' in v), 'Pool: spectators see the table (there is no secret information)');
  }
  // timers, resign and leave
  {
    const r = poolScene([[0, 300, 250], [1, 400, 250], [12, 800, 100]], { turnTime: 30 });
    r.st.deadline = r.now() + 30000;
    r.adv(31000);
    ok(r.st.shots === 1 && r.log.sys.some((t) => /ran out of time/.test(t)), 'Pool: when the clock runs out a shot is played for the player');
    const r2 = poolScene([[0, 300, 250], [1, 400, 250]], { turnTime: 30 });
    r2.st.deadline = r2.now() + 30000;
    r2.st.timeouts = [1, 0];
    r2.adv(31000);
    ok(r2.log.ended && r2.log.ended.winnerId === 'p1' && r2.log.ended.forfeit, 'Pool: running out of time twice forfeits');
    const r3 = poolScene([[0, 300, 250], [1, 400, 250]]);
    r3.act(1, { type: 'resign' });
    ok(r3.log.ended && r3.log.ended.winnerId === 'p0' && r3.log.ended.reason === 'resign', 'Pool: either player can resign, even out of turn');
    const r4 = poolScene([[0, 300, 250], [1, 400, 250]]);
    r4.leave(0);
    ok(r4.log.ended && r4.log.ended.winnerId === 'p1' && r4.log.ended.forfeit, 'Pool: leaving forfeits');
    // auto shot from ball in hand
    const r5 = fakeRoom(['Ann', 'Bo'], 'pool', { turnTime: 30 });
    r5.adv(31000);
    ok(r5.st.shots === 1 && r5.st.last.potted !== undefined, 'Pool: an idle breaker gets a legal automatic break');
  }
  // simulated games always end or keep making legal progress
  {
    let finished = 0, stuck = 0;
    for (let g = 0; g < 6; g++) {
      const r = fakeRoom(['Ann', 'Bo'], 'pool', { turnTime: 30 });
      for (let n = 0; n < 220 && !r.log.ended; n++) {
        // every turn is an automatic shot (as if both players ran out of the clock)
        r.st.timeouts = [0, 0];
        r.st.deadline = r.now();
        r.adv(1);
        r.adv(r.st.animUntil - r.now() + 5);
      }
      if (r.log.ended) finished++;
      else stuck++;
      const live = r.st.balls.filter((b) => !b.gone);
      if (live.some((b) => b.x < 0 || b.x > 1000 || b.y < 0 || b.y > 500)) stuck++;
    }
    ok(stuck === 0, `Pool: 6 simulated auto-played games stay on the table (${finished} reached a result)`);
  }
})();

// ---------------- Mini Golf ----------------
const GR = golf.rules;
function bfsPath(hole, maxDepth = 7) {
  let frontier = [{ x: hole.tee[0], y: hole.tee[1], path: [] }];
  const seen = new Set();
  for (let d = 1; d <= maxDepth; d++) {
    const next = [];
    for (const s of frontier) {
      for (let a = 0; a < 48; a++) {
        for (const pw of [0.2, 0.4, 0.6, 0.8, 1]) {
          const ang = (a * Math.PI) / 24 + (a % 2 ? 0.02 : 0);
          const r = GR.simulatePutt(hole, s.x, s.y, ang, pw);
          if (r.outcome === 'cup') return s.path.concat([{ angle: ang, power: pw }]);
          if (r.outcome !== 'rest') continue;
          const k = Math.round(r.x / 30) + ',' + Math.round(r.y / 30);
          if (seen.has(k)) continue;
          seen.add(k);
          next.push({ x: r.x, y: r.y, path: s.path.concat([{ angle: ang, power: pw }]) });
        }
      }
    }
    frontier = next.slice(0, 150);
  }
  return null;
}

(function golfPhysics() {
  const all = COURSES.COURSES.flatMap((c) => c.holes.map((h) => ({ c, h })));
  ok(COURSES.COURSES.length === 3 && all.length === 18 && COURSES.BY_ID.tour.holes.length === 18, 'Golf: three courses of six holes, 18 in the full tour');
  ok(new Set(all.map((x) => x.h.name)).size === 18, 'Golf: every hole has its own name (no copies)');
  ok(all.every(({ h }) => GR.onFairway(h, h.tee[0], h.tee[1]) && GR.onFairway(h, h.cup[0], h.cup[1])), 'Golf: every tee and cup is on the fairway, clear of walls and bumpers');
  ok(all.every(({ h }) => !(h.water || []).some((z) => h.tee[0] >= z.x && h.tee[0] <= z.x + z.w && h.tee[1] >= z.y && h.tee[1] <= z.y + z.h) && !(h.water || []).some((z) => h.cup[0] >= z.x && h.cup[0] <= z.x + z.w && h.cup[1] >= z.y && h.cup[1] <= z.y + z.h)), 'Golf: no tee or cup sits in water');
  ok(all.every(({ h }) => h.par >= 2 && h.par <= 5), 'Golf: every hole has a sensible par');
  // distinct geometry: no two holes are identical
  ok(new Set(all.map((x) => JSON.stringify([x.h.poly, x.h.walls, x.h.bumpers, x.h.sand, x.h.water, x.h.tee, x.h.cup]))).size === 18, 'Golf: no hole is a copy of another (no static placeholder holes)');

  // every hole can actually be completed within the stroke limit
  const lens = [];
  let unsolved = [];
  for (const { c, h } of all) {
    const path = bfsPath(h);
    if (!path) unsolved.push(c.id + ':' + h.name);
    else {
      lens.push(path.length);
      // replay the path through the real simulation to prove it
      let x = h.tee[0], y = h.tee[1], res = null;
      for (const s of path) { res = GR.simulatePutt(h, x, y, s.angle, s.power); x = res.x; y = res.y; }
      if (!res || res.outcome !== 'cup') unsolved.push('replay:' + h.name);
    }
  }
  ok(unsolved.length === 0, `Golf: all 18 holes can be completed (found paths of ${Math.min(...lens)}-${Math.max(...lens)} strokes, replayed through the real physics)${unsolved.length ? ' UNSOLVED: ' + unsolved.join(', ') : ''}`);

  // determinism and fuzz: the ball never ends up outside the course or inside an obstacle
  const h = COURSES.COURSES[1].holes[3];
  const a = GR.simulatePutt(h, h.tee[0], h.tee[1], 0.7, 0.8);
  const b = GR.simulatePutt(h, h.tee[0], h.tee[1], 0.7, 0.8);
  ok(JSON.stringify(a) === JSON.stringify(b), 'Golf: a putt is deterministic');
  let outside = 0, bad = 0, unsettled = 0, shots = 0;
  for (const { h: hole } of all) {
    for (let i = 0; i < 70; i++) {
      const r = GR.simulatePutt(hole, hole.tee[0], hole.tee[1], (i / 70) * Math.PI * 2, 0.15 + ((i * 37) % 85) / 100);
      shots++;
      if (!Number.isFinite(r.x) || !Number.isFinite(r.y)) bad++;
      else if (r.outcome === 'rest' && !GR.onFairway(hole, r.x, r.y)) outside++;
      if (!r.anim.settled) unsettled++;
    }
  }
  ok(outside === 0 && bad === 0, `Golf: ${shots} random putts on all holes never leave the fairway or pass through walls`);
  ok(unsettled === 0, 'Golf: every putt comes to rest within the time limit');
  // sand slows the ball, ice does not exist
  const sandHole = COURSES.COURSES[0].holes[3];
  const flat = { poly: sandHole.poly, tee: sandHole.tee, cup: [9999, 9999] };
  const withSand = { ...flat, sand: [{ x: 200, y: 130, w: 100, h: 180 }] };
  const f = GR.simulatePutt(flat, 120, 220, 0, 0.6);
  const s = GR.simulatePutt(withSand, 120, 220, 0, 0.6);
  ok(s.x < f.x - 30, 'Golf: sand slows the ball down');
  // water
  const wet = { poly: sandHole.poly, tee: sandHole.tee, cup: [9999, 9999], water: [{ x: 300, y: 130, w: 60, h: 180 }] };
  ok(GR.simulatePutt(wet, 120, 220, 0, 0.7).outcome === 'water', 'Golf: a ball rolling into water is reported as a water hazard');
  // cup: slow ball drops, fast ball skips over
  const lane = { poly: COURSES.rect(60, 170, 1600, 270), tee: [120, 220], cup: [580, 220] };
  ok(GR.simulatePutt(lane, 120, 220, 0, 0.9).outcome === 'cup' && GR.simulatePutt(lane, 520, 220, 0, 1).outcome === 'rest', 'Golf: a ball that arrives slowly drops in; one that arrives too fast rolls past the cup');
  const fast = GR.simulatePutt(lane, 540, 220, 0, 1);
  ok(fast.outcome === 'rest', 'Golf: a full-power putt over the cup does not sink');
  // walls: a ball shot at a wall bounces back
  const box = { poly: COURSES.rect(60, 170, 640, 270), tee: [120, 220], cup: [9999, 9999] };
  const bounced = GR.simulatePutt(box, 300, 220, Math.PI, 0.9);
  ok(bounced.x > 90 && bounced.x < 634, 'Golf: a ball shot at the end wall bounces off it and stays on the course');
})();

(function golfFlow() {
  const course = COURSES.BY_ID.meadow;
  const paths = course.holes.map((h) => bfsPath(h));
  const r = fakeRoom(['Ann', 'Bo'], 'golf', { course: 'meadow', maxStrokes: 6, turnTime: 30 });
  const st = r.st;
  ok(st.hole === 0 && r.view(0).hole.name === 'Straight Shot' && r.view(0).turnId === 'p0', 'Golf: the game starts on hole 1 with the first honour to the first player');
  ok(r.view(1).hole.cup && r.view(1).hole.poly && r.view('spec').players.length === 2, 'Golf: the view describes the hole geometry for everyone, including spectators');
  const putt = (i, a, p) => r.act(i, { type: 'putt', angle: a, power: p });
  const wait = () => r.adv(st.animUntil - r.now() + 5);
  // validation
  for (const bad of [{ type: 'putt', angle: 'a', power: 0.5 }, { type: 'putt', angle: 0, power: 5 }, { type: 'putt', angle: NaN, power: 0.5 }, { type: 'putt', angle: 0 }, { type: 'putt', angle: 0, power: -0.1 }, { type: 'nope' }, null, 7]) r.act(0, bad);
  putt(1, 0, 0.5);
  r.act('spec', { type: 'putt', angle: 0, power: 0.5 });
  ok(st.players.every((p) => p.strokes === 0), 'Golf: malformed putts, putts out of turn and spectator putts are ignored');
  // hole in one by the first player
  const first = paths[0];
  ok(first && first.length === 1, 'Golf: hole 1 can be holed in one stroke');
  putt(0, first[0].angle, first[0].power);
  ok(st.players[0].holed && st.players[0].strokes === 1, 'Golf: a ball that drops in finishes the hole for that player');
  ok(r.view(0).turnId === 'p1', 'Golf: the turn passes to the player who has not finished');
  putt(0, 0, 0.5);
  ok(st.players[0].strokes === 1, 'Golf: a player who has holed out cannot putt again');
  putt(1, 0, 0.5);
  ok(st.players[1].strokes === 0, 'Golf: putting during the previous ball\'s roll is ignored');
  wait();
  // second player misses, then sinks
  putt(1, Math.PI, 0.05);
  wait();
  ok(st.players[1].strokes === 1 && !st.players[1].holed && r.view(1).turnId === 'p1', 'Golf: the player still on the hole keeps putting');
  const p1x = st.players[1].x;
  ok(p1x < 119 && p1x > 62, 'Golf: a gentle backwards putt moves the ball only a little');
  putt(1, first[0].angle, first[0].power);
  wait();
  // from a different spot this will not necessarily sink; use the solver from the ball's actual spot
  let guard = 0;
  while (!st.players[1].holed && st.phase === 'play' && guard++ < 8) {
    const sol = bfsPath({ ...course.holes[0], tee: [st.players[1].x, st.players[1].y] });
    putt(1, sol[0].angle, sol[0].power);
    wait();
  }
  ok(st.phase === 'between' && st.players[1].holed, 'Golf: the hole ends when everyone is down');
  ok(st.players[0].scores[0] === 1 && st.players[1].scores[0] >= 2, 'Golf: strokes are recorded per hole on the scorecard');
  ok(r.view(0).summary && r.view(0).summary.length === 2, 'Golf: the view carries the hole summary between holes');
  putt(0, 0, 0.5);
  ok(st.players[0].strokes === 1, 'Golf: nobody can putt between holes');
  r.adv(6000);
  ok(st.phase === 'play' && st.hole === 1 && st.players.every((p) => p.strokes === 0 && !p.holed), 'Golf: the next hole starts fresh after the pause');
  ok(r.view(0).turnId === 'p1', 'Golf: the honour rotates to the other player on the next hole');
  // stroke limit: p1 putts tiny shots until the limit
  let n = 0;
  while (st.phase === 'play' && n++ < 30) {
    putt(st.turn, Math.PI, 0.02);
    wait();
  }
  ok(st.phase === 'between' && st.players[1].strokes === 6, 'Golf: a player is picked up at the stroke limit');
  ok(st.players[0].holed && st.players[0].strokes === 6, 'Golf: the limit applies to every player (both picked up at 6)');
  ok(st.phase === 'between' && st.players[0].scores[1] === 6, 'Golf: the capped score is what goes on the card');
  // water penalty
  r.adv(6000);
  ok(st.hole === 2, 'Golf: play continues to hole 3');
  // finish remaining holes with solved paths and check the leaderboard
  let safety = 0;
  while (!r.log.ended && safety++ < 600) {
    if (st.phase === 'between') { r.adv(6000); continue; }
    const mover = st.players[st.turn];
    const hole = course.holes[st.hole];
    const sol = bfsPath({ ...hole, tee: [mover.x, mover.y] }, 6) || [{ angle: 0, power: 0.1 }];
    putt(st.turn, sol[0].angle, sol[0].power);
    wait();
  }
  ok(!!r.log.ended && r.log.ended.type === 'golf', 'Golf: after the last hole the game ends with a result');
  const res = r.log.ended;
  ok(res.standings.length === 2 && res.pars.length === 6 && res.standings[0].total <= res.standings[1].total, 'Golf: the leaderboard is sorted by total strokes');
  ok(res.standings.every((s) => s.total === s.scores.reduce((a, b) => a + b, 0)), 'Golf: each total equals the sum of the hole scores');
  ok(res.tie ? res.winners.length > 1 : res.winnerId === res.standings[0].id, 'Golf: the lowest total wins (ties are shared)');
  const winnerIds = res.winners;
  ok(winnerIds.every((id) => r.members.find((m) => m.id === id).score === 1), 'Golf: winners get a lobby point');
})();

(function golfEdges() {
  // water hazard geometry
  {
    const hole = COURSES.BY_ID.meadow.holes[4];
    const flat = GR.simulatePutt(hole, hole.tee[0], hole.tee[1], 0, 0.7);
    ok(flat.outcome === 'water', 'Golf: hole 5 puts water directly between the tee and the cup');
  }
  // timeouts and idle players
  {
    const r = fakeRoom(['Ann', 'Bo'], 'golf', { course: 'meadow', maxStrokes: 8, turnTime: 20 });
    r.adv(21000);
    ok(r.st.players[0].strokes === 1 && r.log.sys.some((t) => /ran out of time/.test(t)), 'Golf: when the clock runs out a putt is played for the player');
    r.adv(r.st.animUntil - r.now() + 5);
    // the same player stays away: after two timeouts in a row they are removed
    r.st.players[0].idle = 1;
    r.st.turn = 0;
    r.st.deadline = r.now();
    r.adv(1);
    ok(r.st.players[0].out || r.log.ended, 'Golf: a player who times out repeatedly is removed from the game');
    ok(!!r.log.ended && r.log.ended.forfeit && r.log.ended.winners[0] === 'p1', 'Golf: the last player left wins by forfeit');
  }
  {
    // an idle player removed after everyone else finished the hole still triggers a broadcast of the hole summary
    const r = fakeRoom(['Ann', 'Bo', 'Cy'], 'golf', { course: 'meadow', maxStrokes: 8, turnTime: 30 });
    r.st.players[1].holed = true; r.st.players[1].strokes = 2;
    r.st.players[2].holed = true; r.st.players[2].strokes = 3;
    r.st.turn = 0;
    r.st.players[0].idle = 1;
    r.st.deadline = r.now();
    const c0 = r.log.changed;
    r.adv(1);
    ok(r.st.players[0].out && r.st.phase === 'between' && r.log.changed > c0, 'Golf: removing the last idle player of a hole broadcasts the hole summary');
  }
  {
    const r = fakeRoom(['Ann', 'Bo', 'Cy'], 'golf', { course: 'meadow', maxStrokes: 8, turnTime: 30 });
    r.leave(1);
    ok(r.st.players[1].out && !r.log.ended && r.st.players.filter((p) => !p.out).length === 2, 'Golf: one player leaving mid-hole does not end a 3-player game');
    ok(r.view(0).players[1].out, 'Golf: the view marks the player who left');
    r.leave(0);
    ok(!!r.log.ended && r.log.ended.winners[0] === 'p2', 'Golf: when only one player remains they win');
  }
  {
    const r = fakeRoom(['Ann', 'Bo'], 'golf', { course: 'tour', maxStrokes: 6, turnTime: 30 });
    ok(r.view(0).course.holes === 18 && r.view(0).course.pars.length === 18, 'Golf: the Playgrid Open tour has 18 holes');
    const s = golf.sanitizeSettings({ course: 'nope', maxStrokes: 99, turnTime: 'x' }, golf.defaults);
    ok(s.course === golf.defaults.course && s.maxStrokes === 8 && s.turnTime === 45, 'Golf: invalid host settings are ignored');
    const s2 = golf.sanitizeSettings({ course: 'canyon', maxStrokes: 10, turnTime: 20 }, golf.defaults);
    ok(s2.course === 'canyon' && s2.maxStrokes === 10 && s2.turnTime === 20, 'Golf: valid host settings are accepted');
  }
  {
    // three players, honours: farthest from the cup goes next
    const r = fakeRoom(['Ann', 'Bo', 'Cy'], 'golf', { course: 'meadow', maxStrokes: 8, turnTime: 30 });
    r.act(0, { type: 'putt', angle: 0, power: 0.35 });
    r.adv(r.st.animUntil - r.now() + 5);
    ok(r.st.turn === 1, 'Golf: after the first player putts, the next player still on the tee goes (farthest away)');
    r.act(1, { type: 'putt', angle: 0, power: 0.15 });
    r.adv(r.st.animUntil - r.now() + 5);
    ok(r.st.turn === 2, 'Golf: then the third player, who is still farthest');
    r.act(2, { type: 'putt', angle: 0, power: 0.25 });
    r.adv(r.st.animUntil - r.now() + 5);
    ok(r.st.turn === 1, 'Golf: the player whose ball is farthest from the cup putts again');
  }
})();

// ---------------- Property Tycoon ----------------
const TY = tycoon.rules;
function tyRoom(n, settings = {}) {
  const r = fakeRoom(['A', 'B', 'C', 'D', 'E', 'F'].slice(0, n), 'tycoon', { rounds: 0, startCash: 1500, turnTime: 45, ...settings });
  const st = r.st;
  r.p = (i) => st.players[i];
  const memberOf = (i) => r.members.find((x) => x.id === st.players[i].id);
  r.view = (i) => tycoon.view(st, i === 'spec' ? { id: 'spec', name: 'Spec', avatar: { e: 0, c: 0 } } : memberOf(i), r.now());
  r.leave = (i) => tycoon.onLeave(st, st.players[i].id, r.api);
  r.as = (i, a) => { const m = r.members.find((x) => x.id === st.players[i].id); tycoon.onAction(st, m, a, r.api); };
  r.roll = (i, d1, d2) => { forced.push(d1 - 1, d2 - 1); r.as(i, { type: 'roll' }); };
  r.give = (i, tile) => { st.owner[tile] = i; };
  r.decideAuction = () => { r.as(st.turn, { type: 'decline' }); };
  return r;
}

(function tycoonBoard() {
  ok(B.TILES.length === 36, 'Tycoon: the board has 36 tiles');
  const count = (t) => B.TILES.filter((x) => x.type === t).length;
  ok(count('prop') === 21 && count('station') === 4 && count('util') === 2 && count('surprise') === 3 && count('tax') === 2, 'Tycoon: 21 properties, 4 stations, 2 utilities, 3 surprise tiles and 2 taxes');
  ok(['launch', 'timeout', 'rest', 'gototimeout'].every((t, i) => B.TILES[i * 9].type === t), 'Tycoon: the four corners are Launch Pad, Time Out, Rest Stop and Go To Time Out');
  ok(Object.values(B.GROUP_TILES).every((a) => a.length >= 2 && a.length <= 3) && Object.keys(B.GROUPS).length === 8, 'Tycoon: eight colour districts of two or three properties');
  ok(new Set(B.TILES.map((t) => t.name)).size >= 34, 'Tycoon: tile names are unique (apart from the repeated Surprise tiles)');
  const banned = /boardwalk|park place|baltic|mediterranean|marvin|ventnor|pennsylvania|reading|illinois|atlantic|kentucky|monopoly|chance|community chest|jail|go to jail|free parking/i;
  ok(!B.TILES.some((t) => banned.test(t.name)) && !B.CARDS.some((c) => banned.test(c[1])), 'Tycoon: no trademarked board names or card text');
  ok(B.TILES.every((t, i) => t.type !== 'prop' || (B.rentAt(t, 0) > 0 && B.rentAt(t, 4) > B.rentAt(t, 3) && B.rentAt(t, 3) > B.rentAt(t, 2) && B.rentAt(t, 2) > B.rentAt(t, 1) && B.rentAt(t, 1) > B.rentAt(t, 0))), 'Tycoon: rent rises with every upgrade level');
  ok(B.TILES.filter((t) => t.price).every((t, i, arr) => t.price >= 60 && t.price <= 400), 'Tycoon: prices are sensible');
  ok(B.CARDS.length === 12 && new Set(B.CARDS.map((c) => c[0])).size === 12, 'Tycoon: twelve different Surprise cards');
})();

(function tycoonTurns() {
  const r = tyRoom(3);
  const st = r.st;
  ok(st.players.length === 3 && st.players.every((p) => p.cash === 1500 && p.pos === 0), 'Tycoon: everyone starts on Launch Pad with the starting cash');
  ok(new Set(st.players.map((p) => p.colour)).size === 3, 'Tycoon: each player has their own token colour');
  ok(r.view(0).deck === undefined && !JSON.stringify(r.view(0)).includes('"deck"'), 'Tycoon: the card deck order is never sent to clients');
  // wrong player / phase
  r.as(1, { type: 'roll' });
  ok(st.rollNo === 0, 'Tycoon: only the player on turn can roll');
  r.as(0, { type: 'buy' });
  r.as(0, { type: 'end' });
  ok(st.phase === 'roll', 'Tycoon: buy and end-turn are refused outside their phase');
  // move and buy
  r.roll(0, 3, 4);
  ok(st.players[0].pos === 7 && st.phase === 'buy' && r.view(0).can.buy && !r.view(1).can.buy, 'Tycoon: landing on an unowned property offers it to the player on turn only');
  ok(st.dice.join() === '3,4' && r.view(2).dice.join() === '3,4', 'Tycoon: everyone sees the server-rolled dice');
  r.as(1, { type: 'buy' });
  ok(st.owner[7] === -1, 'Tycoon: another player cannot buy on your behalf');
  r.as(0, { type: 'buy' });
  ok(st.owner[7] === 0 && st.players[0].cash === 1400 && st.phase === 'manage', 'Tycoon: buying costs the list price and moves to the management phase');
  r.as(0, { type: 'roll' });
  ok(st.rollNo === 1, 'Tycoon: you cannot roll twice in one turn');
  r.as(0, { type: 'end' });
  ok(st.turn === 1 && st.phase === 'roll', 'Tycoon: ending the turn passes to the next player');
  // rent
  r.roll(1, 3, 4);
  ok(st.players[1].cash === 1500 - 8 && st.players[0].cash === 1408, 'Tycoon: landing on an owned property pays the owner rent');
  // set doubles bare-lot rent
  r.as(1, { type: 'end' });
  r.as(2, { type: 'end' }) ;
  r.as(0, { type: 'end' });
  r.give(0, 6); r.give(0, 8);
  st.players[1].pos = 0; st.turn = 1; st.phase = 'roll';
  const before = st.players[1].cash;
  r.roll(1, 3, 4);
  ok(before - st.players[1].cash === 16, 'Tycoon: owning the whole colour doubles the rent on bare lots');
  ok(TY.rentFor(st, 7, [1, 1]) === 16, 'Tycoon: rent calculation for a complete set');
  st.level[7] = 2;
  ok(TY.rentFor(st, 7, [1, 1]) === B.rentAt(B.TILES[7], 2), 'Tycoon: upgrades replace the bare-lot rent');
  st.level[7] = 0;
  // stations and utilities
  r.give(2, 5); r.give(2, 14);
  ok(TY.rentFor(st, 5, [1, 1]) === 50 && (r.give(2, 23), TY.rentFor(st, 5, [1, 1])) === 100 && (r.give(2, 32), TY.rentFor(st, 5, [1, 1])) === 200, 'Tycoon: station rent doubles with each station owned (25/50/100/200)');
  r.give(2, 11);
  ok(TY.rentFor(st, 11, [3, 4]) === 28, 'Tycoon: one utility pays 4 times the dice total');
  r.give(2, 26);
  ok(TY.rentFor(st, 11, [3, 4]) === 70, 'Tycoon: both utilities pay 10 times the dice total');
  ok(TY.rentFor(st, 1, [1, 1]) === 0 && TY.rentFor(st, 0, [1, 1]) === 0, 'Tycoon: unowned and non-property tiles charge no rent');
})();

(function tycoonMovement() {
  // passing Launch Pad
  {
    const r = tyRoom(2); const st = r.st;
    st.players[0].pos = 33;
    r.roll(0, 2, 4);
    ok(st.players[0].pos === 3 && st.players[0].cash === 1500 + 200, 'Tycoon: passing Launch Pad pays $200');
  }
  {
    const r = tyRoom(2); const st = r.st;
    st.players[0].pos = 30;
    r.roll(0, 3, 3);
    ok(st.players[0].pos === 0 && st.players[0].cash === 1700, 'Tycoon: landing exactly on Launch Pad pays $200 too');
  }
  // tax
  {
    const r = tyRoom(2); const st = r.st;
    st.players[0].pos = 1;
    r.roll(0, 1, 2);
    ok(st.players[0].cash === 1400 && st.phase === 'manage', 'Tycoon: tax tiles take money for the bank');
  }
  // doubles roll again
  {
    const r = tyRoom(2); const st = r.st;
    r.roll(0, 2, 2); // lands on Rest... pos 4 = City Levy
    ok(st.turn === 0 && st.phase === 'roll' && st.doubles === 1, 'Tycoon: rolling doubles gives another roll');
    r.roll(0, 1, 2);
    ok(st.phase === 'buy' && st.doubles === 0, 'Tycoon: a non-double roll ends the extra rolls (the next step is the purchase decision)');
  }
  // three doubles
  {
    const r = tyRoom(2); const st = r.st;
    st.doubles = 2;
    r.roll(0, 3, 3);
    ok(st.players[0].pos === B.JAIL_POS && st.players[0].jail === 1 && st.phase === 'manage', 'Tycoon: three doubles in a row sends you to Time Out without moving');
    r.as(0, { type: 'end' });
    ok(st.turn === 1, 'Tycoon: the turn ends after going to Time Out');
  }
  // go to time out tile
  {
    const r = tyRoom(2); const st = r.st;
    st.players[0].pos = 24;
    r.roll(0, 1, 2);
    ok(st.players[0].pos === B.JAIL_POS && st.players[0].jail === 1, 'Tycoon: the Go To Time Out tile sends you to Time Out');
  }
  // time out: pay, card, doubles, third turn
  {
    const r = tyRoom(2); const st = r.st;
    st.players[0].pos = 9; st.players[0].jail = 1;
    ok(r.view(0).can.payJail && !r.view(0).can.useCard, 'Tycoon: in Time Out you may pay $50 (no card yet)');
    r.as(0, { type: 'usecard' });
    ok(st.players[0].jail === 1, 'Tycoon: you cannot use a Get-out card you do not have');
    r.as(0, { type: 'payjail' });
    ok(st.players[0].jail === 0 && st.players[0].cash === 1450 && st.phase === 'roll', 'Tycoon: paying $50 frees you and you still roll');
    r.roll(0, 1, 2);
    ok(st.players[0].pos === 12, 'Tycoon: after paying you move by the roll');
  }
  {
    const r = tyRoom(2); const st = r.st;
    st.players[0].pos = 9; st.players[0].jail = 1; st.players[0].cards = 1;
    r.as(0, { type: 'usecard' });
    ok(st.players[0].jail === 0 && st.players[0].cards === 0 && st.players[0].cash === 1500, 'Tycoon: a Get-out card frees you for free');
  }
  {
    const r = tyRoom(2); const st = r.st;
    st.players[0].pos = 9; st.players[0].jail = 1;
    r.roll(0, 2, 3);
    ok(st.players[0].jail === 2 && st.players[0].pos === 9 && st.phase === 'manage', 'Tycoon: failing to roll doubles in Time Out ends the turn');
    st.turn = 0; st.phase = 'roll';
    r.roll(0, 4, 4);
    ok(st.players[0].jail === 0 && st.players[0].pos === 17 && st.phase === 'roll' === false, 'Tycoon: doubles free you from Time Out and you move');
    ok(st.doubles === 0 && st.phase !== 'roll', 'Tycoon: leaving Time Out on doubles gives no extra roll');
  }
  {
    const r = tyRoom(2); const st = r.st;
    st.players[0].pos = 9; st.players[0].jail = 3;
    r.roll(0, 2, 4);
    ok(st.players[0].jail === 0 && st.players[0].cash === 1450 && st.players[0].pos === 15, 'Tycoon: on the third turn in Time Out you pay $50 and move');
  }
  // surprise cards
  const card = (id, setup) => {
    const r = tyRoom(3); const st = r.st;
    st.players[0].pos = 0;
    st.deck = [id];
    if (setup) setup(r, st);
    r.roll(0, 1, 1); // pos 2 = Surprise (doubles)
    return r;
  };
  ok(card('refund').p(0).cash === 1550, 'Tycoon card: tax refund pays $50');
  ok(card('wallet').p(0).cash === 1530, 'Tycoon card: wallet pays $30');
  ok(card('fair').p(0).cash === 1600, 'Tycoon card: street fair pays $100');
  ok(card('repairs', (r, st) => { r.give(0, 1); st.level[1] = 0; r.give(0, 3); }).p(0).cash === 1500, 'Tycoon card: repairs cost nothing without upgrades');
  {
    const r = card('repairs', (rr, st) => { rr.give(0, 1); rr.give(0, 3); st.level[1] = 2; st.level[3] = 1; });
    ok(r.p(0).cash === 1470, 'Tycoon card: repairs cost $10 per upgrade level');
  }
  {
    const r = card('launch');
    ok(r.p(0).pos === 0 && r.p(0).cash === 1700, 'Tycoon card: advance to Launch Pad pays $200');
  }
  ok(card('timeout').p(0).jail === 1 && card('timeout').p(0).pos === 9, 'Tycoon card: go straight to Time Out');
  {
    const r = card('birthday');
    ok(r.p(0).cash === 1540 && r.p(1).cash === 1480 && r.p(2).cash === 1480, 'Tycoon card: birthday collects $20 from every other player');
  }
  {
    const r = card('party');
    ok(r.p(0).cash === 1470 && r.p(1).cash === 1515 && r.p(2).cash === 1515, 'Tycoon card: party pays $15 to every other player');
  }
  ok(card('fwd3').p(0).pos === 5 && card('fwd3').st.phase === 'buy', 'Tycoon card: move forward 3 and resolve the new tile');
  ok(card('back3').p(0).pos === 35 && card('back3').p(0).cash === 1500, 'Tycoon card: move back 3 without collecting Launch Pad money');
  ok(card('back3').st.phase === 'buy', 'Tycoon card: moving back lands on a property that can be bought');
  {
    const r = card('harbor', (rr, st) => { st.players[0].pos = 0; });
    ok(r.p(0).pos === 6, 'Tycoon card: advance to Harbor Walk');
  }
  ok(card('freecard').p(0).cards === 1, 'Tycoon card: the Get-out card is kept for later');
  {
    // deck refills with every card but never a second Get-out card while one is held
    const r = tyRoom(2); const st = r.st;
    st.players[0].cards = 1;
    st.deck = [];
    const pulled = new Set();
    for (let i = 0; i < 11; i++) { st.players[0].pos = 0; st.turn = 0; st.phase = 'roll'; st.doubles = 0; st.deck.length || (st.deck = []); r.roll(0, 1, 1); pulled.add(st.card && st.card.id); st.players[0].cash = 1500; st.phase = 'manage'; st.turn = 0; }
    ok(!pulled.has('freecard'), 'Tycoon: only one Get-out card exists, so it is not redrawn while someone holds it');
  }
})();

(function tycoonAuction() {
  const setup = () => {
    const r = tyRoom(3); const st = r.st;
    r.roll(0, 3, 4); // Kite Hill
    return r;
  };
  {
    const r = setup(); const st = r.st;
    r.as(0, { type: 'decline' });
    ok(st.phase === 'auction' && st.auction && st.auction.tile === 7, 'Tycoon: declining a purchase starts an auction');
    ok(r.view(1).auction.tile === 7 && r.view(1).auction.high === 0, 'Tycoon: everyone sees the auction');
    r.as(1, { type: 'bid', amount: 'ten' }); r.as(1, { type: 'bid', amount: 0 }); r.as(1, { type: 'bid', amount: 20.5 }); r.as(1, { type: 'bid', amount: -5 }); r.as(1, { type: 'bid', amount: 99999 }); r.as(1, { type: 'bid', amount: NaN });
    ok(st.auction.high === 0, 'Tycoon: invalid bids (non-numbers, fractions, negatives, more than your cash) are refused');
    r.as(1, { type: 'bid', amount: 50 });
    r.as(2, { type: 'bid', amount: 50 });
    ok(st.auction.high === 50 && st.auction.highIdx === 1, 'Tycoon: a bid must beat the current high bid');
    r.as(2, { type: 'bid', amount: 80 });
    r.as(2, { type: 'pass' });
    ok(st.auction.highIdx === 2, 'Tycoon: the high bidder cannot pass away their bid');
    r.as(1, { type: 'pass' });
    r.as(0, { type: 'pass' });
    ok(!st.auction && st.owner[7] === 2 && st.players[2].cash === 1420 && st.phase === 'manage', 'Tycoon: when everyone else passes the high bidder pays and owns the property');
  }
  {
    const r = setup(); const st = r.st;
    r.as(0, { type: 'decline' });
    r.as(0, { type: 'pass' }); r.as(1, { type: 'pass' }); r.as(2, { type: 'pass' });
    ok(!st.auction && st.owner[7] === -1 && st.phase === 'manage', 'Tycoon: if nobody bids the property stays unowned');
  }
  {
    const r = setup(); const st = r.st;
    r.as(0, { type: 'decline' });
    r.as(0, { type: 'bid', amount: 30 });
    r.adv(16000);
    ok(!st.auction && st.owner[7] === 0 && st.players[0].cash === 1470, 'Tycoon: the auction ends by itself when the clock runs out (the decliner can bid too)');
  }
  {
    const r = setup(); const st = r.st;
    r.as(0, { type: 'decline' });
    r.as(1, { type: 'bid', amount: 20 });
    st.auction.endsAt = r.now() + 100;
    r.as(2, { type: 'bid', amount: 25 });
    ok(st.auction.endsAt - r.now() >= 7000, 'Tycoon: a new bid extends the auction clock');
  }
  {
    const r = setup(); const st = r.st;
    r.as(0, { type: 'decline' });
    r.as(1, { type: 'bid', amount: 100 });
    r.as(0, { type: 'roll' }); r.as(0, { type: 'end' }); r.as(0, { type: 'buy' });
    ok(st.phase === 'auction', 'Tycoon: nothing else can be done during an auction');
    r.as(1, { type: 'trade_offer', to: r.p(2).id, giveCash: 10 });
    ok(st.trades.length === 0, 'Tycoon: no trades during an auction');
  }
  {
    // cannot afford: buy refused, auction possible
    const r = tyRoom(2); const st = r.st;
    st.players[0].cash = 50;
    r.roll(0, 3, 4);
    ok(st.phase === 'buy' && !r.view(0).can.buy && r.view(0).can.decline, 'Tycoon: if you cannot afford a property you can only send it to auction');
    r.as(0, { type: 'buy' });
    ok(st.owner[7] === -1 && st.phase === 'buy', 'Tycoon: a buy you cannot afford is refused');
  }
})();

(function tycoonBuilding() {
  const r = tyRoom(2); const st = r.st;
  for (const t of [6, 7]) r.give(0, t);
  r.as(0, { type: 'build', tile: 6 });
  ok(st.level[6] === 0, 'Tycoon: you cannot upgrade without the whole colour');
  r.give(0, 8);
  ok(r.view(0).can.build.join() === '6,7,8', 'Tycoon: the whole colour makes every lot of it upgradeable');
  r.as(0, { type: 'build', tile: 6 });
  ok(st.level[6] === 1 && st.players[0].cash === 1500 - B.upgradeCost(B.TILES[6]), 'Tycoon: building costs the upgrade price');
  r.as(0, { type: 'build', tile: 6 });
  ok(st.level[6] === 1, 'Tycoon: upgrades must be built evenly across the colour');
  r.as(0, { type: 'build', tile: 7 }); r.as(0, { type: 'build', tile: 8 }); r.as(0, { type: 'build', tile: 6 });
  ok(st.level[6] === 2 && st.level[7] === 1 && st.level[8] === 1, 'Tycoon: evenness lets the next round of upgrades through');
  for (let i = 0; i < 12; i++) for (const t of [6, 7, 8]) r.as(0, { type: 'build', tile: t });
  ok([6, 7, 8].every((t) => st.level[t] === B.MAX_LEVEL), 'Tycoon: upgrades stop at Landmark (level 4)');
  const cash = st.players[0].cash;
  r.as(0, { type: 'sell', tile: 6 });
  ok(st.level[6] === 4 - 1 && st.players[0].cash === cash + Math.floor(B.upgradeCost(B.TILES[6]) / 2), 'Tycoon: selling an upgrade refunds half');
  r.as(0, { type: 'sell', tile: 7 });
  ok(st.level[7] === 3, 'Tycoon: upgrades are sold evenly too');
  r.as(0, { type: 'build', tile: 'x' }); r.as(0, { type: 'build', tile: -1 }); r.as(0, { type: 'build', tile: 99 }); r.as(0, { type: 'build', tile: 2 }); r.as(0, { type: 'sell', tile: 0 });
  r.as(1, { type: 'build', tile: 8 });
  ok(st.level[8] === 4, 'Tycoon: only the owner on turn can build');
  // building not during buy phase
  st.phase = 'buy';
  r.as(0, { type: 'sell', tile: 8 });
  ok(st.level[8] === 4, 'Tycoon: no building while a purchase decision is pending');
})();

(function tycoonDebt() {
  {
    // owner has upgrades: debtor is forced to sell upgrades then goes bankrupt
    const r = tyRoom(3); const st = r.st;
    for (const t of [20, 21, 22]) { r.give(1, t); st.level[t] = 4; }
    r.give(0, 1); r.give(0, 3);
    st.level[1] = 0;
    st.players[0].cash = 100;
    st.players[0].pos = 17;
    r.roll(0, 1, 2); // 20 Coral Cove, landmark rent
    ok(st.players[0].out, 'Tycoon: a player who cannot pay a landmark rent goes bankrupt');
    ok(st.owner[1] === 1 && st.owner[3] === 1, 'Tycoon: a bankrupt player\'s properties go to the creditor');
    ok(st.players[1].cash >= 1500 + 100, 'Tycoon: the creditor also gets the debtor\'s remaining cash');
    ok(st.turn !== 0 && !st.over, 'Tycoon: play continues to the next player after a bankruptcy');
    ok(st.players[0].cash === 0, 'Tycoon: bankrupt players hold no cash');
  }
  {
    const r = tyRoom(3); const st = r.st;
    for (const t of [24, 25, 28]) { r.give(1, t); st.level[t] = 1; }
    r.give(0, 6); st.level[6] = 0;
    st.players[0].cash = 130;
    st.players[0].pos = 19;
    r.give(1, 22);
    st.level[22] = 4;
    const rent = TY.rentFor(st, 22, [1, 2]);
    r.roll(0, 1, 2);
    ok(rent > 130 && st.players[0].out, 'Tycoon: debt that cannot be covered even by selling upgrades means bankruptcy');
  }
  {
    // debtor sells its own upgrades to pay
    const r = tyRoom(2); const st = r.st;
    for (const t of [6, 7, 8]) { r.give(0, t); st.level[t] = 2; }
    st.players[0].cash = 10;
    for (const t of [10, 12, 13]) { r.give(1, t); }
    st.level[10] = 0;
    st.players[0].pos = 9;
    const rent = TY.rentFor(st, 12, [1, 2]);
    r.roll(0, 1, 2); // pos 12 Petal Plaza (owner 1, whole set doubles)
    ok(!st.players[0].out && st.players[0].cash >= 0 && (st.level[6] + st.level[7] + st.level[8]) < 6, `Tycoon: upgrades are sold off automatically to pay a debt of $${rent}`);
  }
  // last player standing
  {
    const r = tyRoom(2); const st = r.st;
    for (const t of [20, 21, 22]) { r.give(1, t); st.level[t] = 4; }
    st.players[0].cash = 10;
    st.players[0].pos = 17;
    r.roll(0, 1, 2);
    ok(st.over && r.log.ended && r.log.ended.winners.join() === st.players[1].id && r.log.ended.reason === 'last', 'Tycoon: bankruptcy of all but one player ends the game');
    ok(r.members.find((m) => m.id === st.players[1].id).score === 1, 'Tycoon: the winner gets a lobby point');
    ok(r.log.ended.standings[0].id === st.players[1].id && r.log.ended.standings[1].out, 'Tycoon: the result lists the standings with the bankrupt player last');
  }
})();

(function tycoonTrades() {
  const mk = () => {
    const r = tyRoom(3); const st = r.st;
    r.give(0, 6); r.give(1, 10);
    return r;
  };
  {
    const r = mk(); const st = r.st;
    const idB = r.p(1).id;
    r.as(0, { type: 'trade_offer', to: idB, giveProps: [6], askProps: [10], giveCash: 20 });
    ok(st.trades.length === 1 && r.view(2).trades.length === 1, 'Tycoon: a trade offer is recorded and visible to the table');
    r.as(2, { type: 'trade_accept', id: st.trades[0].id });
    r.as(0, { type: 'trade_accept', id: st.trades[0].id });
    ok(st.owner[6] === 0 && st.owner[10] === 1, 'Tycoon: neither a third party nor the proposer can accept a trade for the other player');
    const before = [r.p(0).cash, r.p(1).cash];
    r.as(1, { type: 'trade_accept', id: st.trades[0].id });
    ok(st.owner[6] === 1 && st.owner[10] === 0 && r.p(0).cash === before[0] - 20 && r.p(1).cash === before[1] + 20, 'Tycoon: the recipient\'s acceptance swaps properties and cash');
    ok(st.trades.length === 0, 'Tycoon: an accepted trade is removed');
  }
  {
    const r = mk(); const st = r.st;
    const idB = r.p(1).id;
    for (const bad of [
      { to: idB, giveCash: -5 }, { to: idB, giveCash: 1.5 }, { to: idB, giveCash: '10' }, { to: idB, giveCash: 99999 }, { to: idB, askCash: 99999 },
      { to: idB, giveProps: [10] }, { to: idB, askProps: [6] }, { to: idB, giveProps: [0] }, { to: idB, giveProps: ['x'] }, { to: idB, giveProps: [-1] }, { to: idB, giveProps: [99] },
      { to: 'nobody', giveCash: 10 }, { to: r.p(0).id, giveCash: 10 }, { giveCash: 10 }, { to: idB }, { to: idB, giveCash: 10, askCash: 10 }, { to: idB, giveProps: 'abc', giveCash: 5 }, { to: idB, giveProps: Array(40).fill(6) },
    ]) r.as(0, { type: 'trade_offer', ...bad });
    ok(st.trades.length === 0, 'Tycoon: malformed, impossible or empty trade offers are all refused');
  }
  {
    const r = mk(); const st = r.st;
    const idB = r.p(1).id;
    r.give(0, 7); r.give(0, 8); st.level[7] = 1;
    r.as(0, { type: 'trade_offer', to: idB, giveProps: [6] });
    ok(st.trades.length === 0, 'Tycoon: properties in a district with upgrades cannot be traded');
    st.level[7] = 0;
    r.as(0, { type: 'trade_offer', to: idB, giveProps: [6] });
    ok(st.trades.length === 1, 'Tycoon: a gift trade (nothing asked) is allowed once the upgrades are gone');
    // a second offer from the same proposer replaces the first
    r.as(0, { type: 'trade_offer', to: idB, giveCash: 5 });
    ok(st.trades.length === 1 && st.trades[0].giveCash === 5, 'Tycoon: a proposer has at most one open offer');
    // validity re-checked on accept
    r.p(0).cash = 0;
    r.as(1, { type: 'trade_accept', id: st.trades[0].id });
    ok(st.owner[6] === 0 && r.p(1).cash === 1500, 'Tycoon: an offer is re-validated when accepted (the proposer no longer has the cash)');
  }
  {
    const r = mk(); const st = r.st;
    const idB = r.p(1).id;
    r.as(0, { type: 'trade_offer', to: idB, giveProps: [6], askCash: 100 });
    const id = st.trades[0].id;
    r.as(1, { type: 'trade_decline', id });
    ok(st.trades.length === 0 && st.owner[6] === 0, 'Tycoon: the recipient can decline an offer');
    r.as(0, { type: 'trade_offer', to: idB, giveProps: [6], askCash: 100 });
    r.as(2, { type: 'trade_decline', id: st.trades[0].id });
    ok(st.trades.length === 1, 'Tycoon: a bystander cannot cancel someone else\'s offer');
    r.as(0, { type: 'trade_decline', id: st.trades[0].id });
    ok(st.trades.length === 0, 'Tycoon: the proposer can withdraw an offer');
  }
  {
    const r = mk(); const st = r.st;
    const idB = r.p(1).id;
    r.as(0, { type: 'trade_offer', to: idB, giveProps: [6], askCash: 100 });
    st.deadline = 0;
    r.adv(121000);
    ok(st.trades.length === 0, 'Tycoon: unanswered offers expire');
    r.as(0, { type: 'trade_offer', to: idB, giveProps: [6], askCash: 100 });
    r.give(2, 6);
    r.as(1, { type: 'trade_accept', id: st.trades[0].id });
    ok(st.owner[6] === 2 && r.p(1).cash === 1500, 'Tycoon: an offer for a property that has since changed hands cannot be accepted');
  }
  {
    // trades while it is not your turn are fine; bankrupt players' offers vanish
    const r = mk(); const st = r.st;
    const idA = r.p(0).id;
    r.as(1, { type: 'trade_offer', to: idA, giveProps: [10] });
    ok(st.trades.length === 1, 'Tycoon: players can trade on anybody\'s turn');
    r.leave(1);
    ok(st.trades.length === 0, 'Tycoon: a player\'s open offers disappear when they leave');
  }
})();

(function tycoonEnds() {
  // finite game: richest wins after N rounds
  {
    const r = tyRoom(3, { rounds: 2 }); const st = r.st;
    r.give(st.turn, 31);
    r.p(st.turn).cash += 500;
    let safety = 0;
    while (!st.over && safety++ < 200) {
      if (st.phase === 'auction') { r.adv(16000); continue; }
      const i = st.turn;
      if (st.phase === 'roll') r.as(i, { type: 'roll' });
      else if (st.phase === 'buy') r.as(i, { type: 'decline' });
      else if (st.phase === 'manage') r.as(i, { type: 'end' });
    }
    ok(st.over && r.log.ended && r.log.ended.reason === 'rounds', 'Tycoon: a quick game ends after the chosen number of rounds');
    ok(st.round <= 2, 'Tycoon: the round counter never passes the limit');
    const top = Math.max(...r.log.ended.standings.map((s) => s.worth));
    ok(r.log.ended.winners.every((id) => r.log.ended.standings.find((s) => s.id === id).worth === top), 'Tycoon: the richest player (cash + properties + upgrades) wins');
    ok(r.log.ended.standings.every((s, i, a) => i === 0 || a[i - 1].worth >= s.worth), 'Tycoon: standings are sorted by net worth');
  }
  // idle player
  {
    const r = tyRoom(3); const st = r.st;
    const idle = st.turn;
    r.adv(46000);
    ok(st.rollNo === 1 && r.log.sys.some((t) => /dice were rolled for them/.test(t)), 'Tycoon: the dice are rolled for a player who runs out of time');
    for (let k = 0; k < 40 && !st.players[idle].out; k++) {
      st.turn = idle; if (st.phase === 'auction') st.auction = null; if (st.phase !== 'roll') st.phase = 'roll';
      st.deadline = r.now() + 1; r.adv(5);
    }
    ok(st.players[idle].out, 'Tycoon: a player who keeps timing out is removed');
  }
  // leaving
  {
    const r = tyRoom(3); const st = r.st;
    const who = st.turn;
    r.leave(who);
    ok(st.players[who].out && st.turn !== who && !st.over, 'Tycoon: when the current player leaves the turn passes on');
    ok(!st.owner.includes(who), 'Tycoon: a leaving player\'s properties return to the bank');
    const rest = st.players.filter((p) => !p.out);
    r.leave(st.players.indexOf(rest[0]));
    ok(st.over && r.log.ended.winners.join() === rest[1].id, 'Tycoon: when everyone else has left the last player wins');
  }
  {
    const r = tyRoom(3); const st = r.st;
    r.roll(st.turn, 3, 4);
    r.as(st.turn, { type: 'decline' });
    const other = (st.turn + 1) % 3;
    r.leave(other);
    ok(st.auction && st.players[other].out, 'Tycoon: the auction carries on when a bidder leaves');
  }
  // settings
  {
    const s = tycoon.sanitizeSettings({ rounds: 7, startCash: 'a', turnTime: 3 }, tycoon.defaults);
    ok(s.rounds === 15 && s.startCash === 1500 && s.turnTime === 45, 'Tycoon: invalid host settings are ignored');
    const s2 = tycoon.sanitizeSettings({ rounds: 0, startCash: 2000, turnTime: 90 }, tycoon.defaults);
    ok(s2.rounds === 0 && s2.startCash === 2000 && s2.turnTime === 90, 'Tycoon: valid host settings are accepted (0 rounds = classic)');
  }
})();

// Randomised whole games: every action a player could take, chosen at random, must keep the state sane.
(function tycoonFuzz() {
  let problems = [];
  let finished = 0;
  const check = (st, tag) => {
    for (const [i, p] of st.players.entries()) {
      if (!Number.isInteger(p.cash) || p.cash < 0) problems.push(`${tag}: cash ${p.cash}`);
      if (p.pos < 0 || p.pos >= 36 || !Number.isInteger(p.pos)) problems.push(`${tag}: pos ${p.pos}`);
      if (p.jail < 0 || p.jail > 3) problems.push(`${tag}: jail ${p.jail}`);
      if (p.out && st.owner.includes(i)) problems.push(`${tag}: bankrupt player owns tiles`);
    }
    st.owner.forEach((o, t) => {
      if (o < -1 || o >= st.players.length) problems.push(`${tag}: owner ${o}`);
      if (st.level[t] < 0 || st.level[t] > 4) problems.push(`${tag}: level ${st.level[t]}`);
      if (st.level[t] > 0 && B.TILES[t].type !== 'prop') problems.push(`${tag}: upgraded a non-property`);
    });
    for (const [g, tiles] of Object.entries(B.GROUP_TILES)) {
      const lv = tiles.map((t) => st.level[t]);
      if (Math.max(...lv) - Math.min(...lv) > 1) problems.push(`${tag}: uneven ${g} ${lv}`);
      if (Math.max(...lv) > 0 && !tiles.every((t) => st.owner[t] === st.owner[tiles[0]])) problems.push(`${tag}: upgrades without a full set ${g}`);
    }
  };
  for (let g = 0; g < 70; g++) {
    const n = 2 + (g % 5);
    const rounds = [0, 10, 15, 25][g % 4];
    const r = tyRoom(n, { rounds, startCash: [1000, 1500, 2000][g % 3] });
    const st = r.st;
    // whenever an action changes what a client would see, the room must be told to broadcast
    const plainAs = r.as;
    r.as = (i, a) => {
      const snap = JSON.stringify(r.view('spec'));
      const c0 = r.log.changed;
      plainAs(i, a);
      if (!st.over && JSON.stringify(r.view('spec')) !== snap && r.log.changed === c0) problems.push(`game ${g}: ${a.type} changed the state without a broadcast`);
    };
    let steps = 0;
    while (!st.over && steps++ < 30000) {
      const i = st.turn;
      const roll = realRand(100);
      if (st.phase === 'auction') {
        for (let j = 0; j < n; j++) {
          if (st.players[j].out) continue;
          const c = realRand(4);
          if (c === 0) r.as(j, { type: 'bid', amount: st.auction ? st.auction.high + 1 + realRand(60) : 10 });
          else if (c === 1) r.as(j, { type: 'pass' });
          if (!st.auction) break;
        }
        if (st.auction && realRand(3) === 0) r.adv(16000);
      } else if (st.phase === 'roll') {
        if (st.players[i].jail && roll < 30) r.as(i, { type: 'payjail' });
        if (roll < 20) for (const t of r.view(i).can.build) { if (realRand(2)) r.as(i, { type: 'build', tile: t }); }
        r.as(i, { type: 'roll' });
      } else if (st.phase === 'buy') {
        r.as(i, { type: roll < 65 ? 'buy' : 'decline' });
      } else if (st.phase === 'manage') {
        if (roll < 40) for (const t of r.view(i).can.build) r.as(i, { type: 'build', tile: t });
        if (roll > 85) for (const t of r.view(i).can.sell) r.as(i, { type: 'sell', tile: t });
        if (roll > 70 && n > 1) {
          const j = realRand(n);
          if (j !== i && !st.players[j].out) {
            const mt = st.owner.map((o, t) => (o === i ? t : -1)).filter((t) => t >= 0);
            const tt = st.owner.map((o, t) => (o === j ? t : -1)).filter((t) => t >= 0);
            r.as(i, { type: 'trade_offer', to: st.players[j].id, giveProps: mt.slice(0, realRand(3)), askProps: tt.slice(0, realRand(2)), giveCash: realRand(100), askCash: realRand(60) });
            if (st.trades.length) r.as(j, { type: realRand(2) ? 'trade_accept' : 'trade_decline', id: st.trades[0].id });
          }
        }
        r.as(i, { type: 'end' });
      }
      if (steps % 50 === 0) r.adv(500);
      check(st, `game ${g}`);
      if (problems.length > 5) break;
    }
    if (st.over) finished++;
    else problems.push(`game ${g} did not finish in ${steps} steps (phase ${st.phase})`);
    if (problems.length > 5) break;
  }
  ok(problems.length === 0, `Tycoon: 70 randomised full games (2-6 players, all modes) keep every invariant${problems.length ? ': ' + problems.slice(0, 5).join('; ') : ''}`);
  ok(finished === 70, `Tycoon: all 70 randomised games reached a result (${finished}/70)`);
})();

// ---------------- live Socket.IO ----------------
const PORT = 3993;
const URL = `http://localhost:${PORT}`;
const tok = () => [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
function client(name) {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  const c = { s, name, token: tok(), state: null };
  s.on('state', (st) => { c.state = st; });
  c.emit = (ev, data) => new Promise((res) => s.emit(ev, data, res));
  c.profile = { name, avatar: { e: 1, c: 2 } };
  c.act = (a) => c.s.emit('action', a);
  return c;
}
async function waitFor(fn, ms = 4000, label = '') {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (fn()) return true;
    await sleep(25);
  }
  console.log('  timed out waiting for', label);
  return false;
}

(async () => {
  const srv = spawn('node', [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const all = [];
  try {
    const a = client('Alice'), b = client('Bob'), c = client('Cara'), sp = client('Spec');
    all.push(a, b, c, sp);
    // ----- Pool live -----
    const r1 = await a.emit('createRoom', { game: 'pool', token: a.token, profile: a.profile });
    const code = r1.code;
    await b.emit('joinRoom', { code, token: b.token, profile: b.profile });
    await sp.emit('joinRoom', { code, token: sp.token, profile: sp.profile });
    await waitFor(() => sp.state && sp.state.players.length === 2, 2000, 'joined');
    ok(sp.state.role === 'spectator', 'Pool (live): the third person joins as a spectator');
    a.s.emit('startGame');
    await waitFor(() => a.state.phase === 'game' && b.state.game, 3000, 'pool game');
    const breaker = a.state.game.myIndex === a.state.game.turn ? a : b;
    const other = breaker === a ? b : a;
    ok(breaker.state.game.inHand && breaker.state.game.breakShot && breaker.state.game.balls.length === 16, 'Pool (live): the breaker starts with ball in hand and a racked table');
    ok(JSON.stringify(sp.state.game.balls) === JSON.stringify(breaker.state.game.balls), 'Pool (live): everyone sees the same table');
    // out-of-turn / spectator / garbage
    other.act({ type: 'shoot', angle: 0, power: 0.5, place: { x: 100, y: 250 } });
    sp.act({ type: 'shoot', angle: 0, power: 0.5, place: { x: 100, y: 250 } });
    breaker.act({ type: 'shoot', angle: 'x', power: 9 });
    breaker.act({ type: 'shoot', angle: 0, power: 0.5 });
    breaker.act({ type: 'shoot', angle: 0, power: 0.5, place: { x: 900, y: 250 } });
    breaker.act(null);
    await sleep(300);
    ok(breaker.state.game.shots === 0, 'Pool (live): out-of-turn, spectator, malformed and illegal-placement shots are ignored');
    // the break
    breaker.act({ type: 'shoot', angle: 0, power: 0.95, place: { x: 200, y: 250 } });
    await waitFor(() => other.state.game.shots === 1 && sp.state.game.shots === 1, 3000, 'break');
    ok(other.state.game.anim && other.state.game.anim.frames.length > 5 && other.state.game.anim.ids.length > 5, 'Pool (live): the opponent receives the sampled path of the break');
    ok(sp.state.game.anim && sp.state.game.anim.duration === other.state.game.anim.duration, 'Pool (live): spectators receive the same path');
    ok(other.state.game.busyMs > 0, 'Pool (live): the view says the balls are still moving');
    const sizeKB = JSON.stringify(other.state.game).length / 1024;
    ok(sizeKB < 120, `Pool (live): a break update is a reasonable size (${sizeKB.toFixed(0)} KB)`);
    // reconnect during/after a shot
    const tokenB = other.token;
    other.s.disconnect();
    await sleep(100);
    const b2 = client('Bob');
    b2.token = tokenB;
    all.push(b2);
    await b2.emit('joinRoom', { code, token: tokenB, profile: other.profile });
    await waitFor(() => b2.state && b2.state.game, 2000, 'reconnect');
    ok(b2.state.game.shots === 1 && b2.state.game.balls.length === 16 && b2.state.players.some((p) => p.id === b2.state.you), 'Pool (live): reconnecting restores the same seat and table');
    // resign gives a result to the room and the room persists
    breaker.act({ type: 'resign' });
    await waitFor(() => a.state.lastResult && a.state.lastResult.type === 'pool', 3000, 'result');
    ok(a.state.lastResult.winnerId === b2.state.you && a.state.phase === 'lobby', 'Pool (live): resigning ends the game with a result in the lobby');
    ok(a.state.code === code && a.state.players.length + a.state.spectators.length === 3, 'Pool (live): the room and its members persist after the result');
    // ----- game switching -----
    const members = a.state.players.length + a.state.spectators.length;
    for (const gid of ['golf', 'tycoon', 'pool']) {
      a.s.emit('switchGame', { game: gid });
      await waitFor(() => a.state.gameId === gid, 2000, 'switch ' + gid);
      ok(a.state.code === code && a.state.players.length + a.state.spectators.length === members, `${gid} (live): switching games keeps the room and its members`);
      sp.s.emit('watch');
    }
    a.s.emit('switchGame', { game: 'golf' });
    await waitFor(() => a.state.gameId === 'golf', 2000, 'golf');
    // ----- Golf live -----
    c.s.disconnect();
    await sleep(50);
    a.s.emit('startGame');
    await waitFor(() => a.state.phase === 'game' && a.state.game && a.state.game.hole, 3000, 'golf game');
    ok(a.state.game.course.name === 'Meadow Mini' && a.state.game.hole.name === 'Straight Shot', 'Golf (live): the game starts on the first hole of the selected course');
    const seats = [a, b2].filter((x) => x.state.role === 'player');
    const mover = seats.find((x) => x.state.you === a.state.game.turnId);
    const waiter = seats.find((x) => x !== mover);
    waiter.act({ type: 'putt', angle: 0, power: 0.5 });
    sp.act({ type: 'putt', angle: 0, power: 0.5 });
    await sleep(250);
    ok(a.state.game.players.every((p) => p.strokes === 0), 'Golf (live): out-of-turn and spectator putts are ignored');
    mover.act({ type: 'putt', angle: 0, power: 0.5 });
    await waitFor(() => a.state.game.players.some((p) => p.strokes > 0), 2000, 'putt');
    ok(a.state.game.anim && a.state.game.anim.by === mover.state.you && a.state.game.anim.frames.length > 3, 'Golf (live): the server sends the path of the putt');
    ok(JSON.stringify(sp.state.game.anim.frames) === JSON.stringify(a.state.game.anim.frames), 'Golf (live): spectators see the same putt');
    await sleep(100);
    a.s.emit('endGame');
    await waitFor(() => a.state.phase === 'lobby', 2000, 'ended');
    // ----- Tycoon live -----
    const cc = client('Cara2');
    all.push(cc);
    await cc.emit('joinRoom', { code, token: cc.token, profile: cc.profile });
    a.s.emit('switchGame', { game: 'tycoon' });
    await waitFor(() => a.state.gameId === 'tycoon', 2000, 'tycoon');
    sp.s.emit('watch');
    await sleep(100);
    a.s.emit('startGame');
    await waitFor(() => a.state.phase === 'game' && a.state.game && a.state.game.board, 3000, 'tycoon game');
    const tg = a.state.game;
    ok(tg.board.length === 36 && tg.players.length >= 2 && tg.players.every((p) => p.cash === 1500), 'Tycoon (live): the board and starting cash arrive in the view');
    ok(!JSON.stringify(tg).includes('"deck"'), 'Tycoon (live): the deck is not part of the view');
    const seated = [a, b2, cc].filter((x) => x.state && x.state.role === 'player');
    const turnClient = seated.find((x) => x.state.you === tg.turnId);
    const offClient = seated.find((x) => x !== turnClient);
    offClient.act({ type: 'roll' });
    await sleep(200);
    ok(a.state.game.rollNo === 0, 'Tycoon (live): rolling out of turn is ignored');
    turnClient.act({ type: 'roll' });
    await waitFor(() => a.state.game.rollNo === 1, 2000, 'roll');
    const d = a.state.game.dice;
    ok(d[0] >= 1 && d[0] <= 6 && d[1] >= 1 && d[1] <= 6, 'Tycoon (live): the server rolls the dice');
    ok(JSON.stringify(sp.state.game.dice) === JSON.stringify(d), 'Tycoon (live): spectators see the same dice');
    ok(sp.state.game.can.roll === false && sp.state.game.can.end === false, 'Tycoon (live): spectators have no actions');
    // trade between two players over the wire (consent)
    const g2 = a.state.game;
    const ownerClient = seated.find((x) => x.state.you === g2.turnId);
    const tradeTarget = seated.find((x) => x !== ownerClient);
    ownerClient.act({ type: 'trade_offer', to: tradeTarget.state.you, giveCash: 25 });
    await waitFor(() => a.state.game.trades.length === 1, 2000, 'offer');
    const beforeCash = tradeTarget.state.game.players.find((p) => p.id === tradeTarget.state.you).cash;
    const ownerCash = ownerClient.state.game.players.find((p) => p.id === ownerClient.state.you).cash;
    await sleep(150);
    ok(tradeTarget.state.game.players.find((p) => p.id === tradeTarget.state.you).cash === beforeCash, 'Tycoon (live): an offer changes nothing until it is accepted');
    tradeTarget.act({ type: 'trade_accept', id: a.state.game.trades[0].id });
    await waitFor(() => a.state.game.trades.length === 0, 2000, 'accepted');
    await sleep(100);
    ok(tradeTarget.state.game.players.find((p) => p.id === tradeTarget.state.you).cash === beforeCash + 25 && ownerClient.state.game.players.find((p) => p.id === ownerClient.state.you).cash === ownerCash - 25, 'Tycoon (live): accepting a trade moves the cash');
    a.s.emit('endGame');
    await waitFor(() => a.state.phase === 'lobby', 2000, 'ended tycoon');
    ok(a.state.code === code, 'Tycoon (live): ending the game leaves the room intact');
  } catch (e) {
    console.error('live test crashed', e);
    failures++;
  } finally {
    for (const x of all) x.s.disconnect();
    srv.kill();
  }
  console.log(failures ? `\n${failures} FAILED` : '\nAll passed');
  process.exit(failures ? 1 : 0);
})();
