// Mini Golf: 2-6 players play the same holes on original courses (golfcourses.js), one putt at a time.
// Clients send an aim angle and power; the server runs the physics (physics.js) and sends the sampled path.
//  - Balls never collide with each other. The player farthest from the cup putts next (honours rotate per hole).
//  - A ball must be slow enough to drop: a fast ball rolls over the cup.
//  - Water: +1 penalty stroke and the ball goes back to where it was hit from. Sand slows the ball.
//  - A hole ends for a player at the stroke limit (they score the limit). Lowest total over the course wins.
const P = require('./physics');
const COURSES = require('./golfcourses');

const meta = { id: 'golf', name: 'Mini Golf', minPlayers: 2, maxPlayers: 6, midJoin: false, resetScores: false, scoreLabel: 'wins' };

const TURN_TIMES = [20, 30, 45, 60];
const COURSE_IDS = ['meadow', 'canyon', 'skyline', 'tour'];
const defaults = { course: 'meadow', maxStrokes: 8, turnTime: 45 };

const BALL_R = 6;
const CUP_R = 10;
const CUP_MAX_SPEED = 330;
const MIN_SPEED = 60;
const MAX_SPEED = 560;
const MAX_SIM = 16;
const HOLD_MS = 300;
const BETWEEN_MS = 4500;
const IDLE_LIMIT = 2;

function sanitizeSettings(s, prev) {
  const o = { ...prev };
  if (!s || typeof s !== 'object') return o;
  if (COURSE_IDS.includes(s.course)) o.course = s.course;
  if ([6, 8, 10].includes(s.maxStrokes)) o.maxStrokes = s.maxStrokes;
  if (TURN_TIMES.includes(s.turnTime)) o.turnTime = s.turnTime;
  return o;
}

const inRect = (z, x, y) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h;

// Precomputed geometry for a hole (cached by the hole object).
const geo = new WeakMap();
function geometry(hole) {
  let g = geo.get(hole);
  if (!g) {
    const solids = (hole.walls || []);
    g = { walls: P.polyWalls(hole.poly).concat(...solids.map(P.polyWalls)), circles: (hole.bumpers || []).map((b) => ({ x: b.x, y: b.y, r: b.r, rest: 1 })), solids };
    geo.set(hole, g);
  }
  return g;
}

// True if (x, y) is somewhere a ball can legally rest (on the fairway, not inside an obstacle).
function onFairway(hole, x, y) {
  const g = geometry(hole);
  if (!P.inPoly(hole.poly, x, y)) return false;
  for (const s of g.solids) if (P.inPoly(s, x, y)) return false;
  for (const b of hole.bumpers || []) if (Math.hypot(x - b.x, y - b.y) < b.r) return false;
  return true;
}

// Simulates one putt. Returns { x, y, outcome: 'rest' | 'cup' | 'water', anim }.
function simulatePutt(hole, x, y, angle, power) {
  const g = geometry(hole);
  const ball = { id: 0, x, y, vx: 0, vy: 0, r: BALL_R, gone: false };
  const speed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * power;
  ball.vx = Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
  let outcome = 'rest';
  const res = P.run({
    balls: [ball],
    walls: g.walls,
    circles: g.circles,
    wallRest: 0.82,
    roll: 120,
    drag: 0.45,
    stopSpeed: 6,
    maxTime: MAX_SIM,
    sampleEvery: 4,
    frictionAt: (b) => ((hole.sand || []).some((z) => inRect(z, b.x, b.y)) ? 7 : 1),
    afterStep: (b) => {
      if ((hole.water || []).some((z) => inRect(z, b.x, b.y))) {
        outcome = 'water';
        return 'gone';
      }
      if (Math.hypot(b.x - hole.cup[0], b.y - hole.cup[1]) < CUP_R * 0.9 && Math.hypot(b.vx, b.vy) <= CUP_MAX_SPEED) {
        outcome = 'cup';
        b.x = hole.cup[0];
        b.y = hole.cup[1];
        return 'gone';
      }
      return undefined;
    },
  });
  const last = res.frames[res.frames.length - 1];
  return {
    x: outcome === 'cup' ? hole.cup[0] : Math.round(ball.x * 10) / 10,
    y: outcome === 'cup' ? hole.cup[1] : Math.round(ball.y * 10) / 10,
    outcome,
    anim: { frames: res.frames.map((f) => [f[0], f[1], f[2]]), duration: res.duration, settled: res.settled, lastFrame: last },
  };
}

const courseOf = (st) => COURSES.BY_ID[st.settings.course] || COURSES.BY_ID.meadow;

function create(settings) {
  return { settings: { ...settings }, players: [], hole: 0, shots: 0, phase: 'play', turn: -1, anim: null, animUntil: 0, animStart: 0, nextAt: 0, deadline: 0, over: false, last: null, pendingEnd: false };
}

const live = (st) => st.players.filter((p) => !p.out);
const active = (st) => st.players.filter((p) => !p.out && !p.holed);
const totalOf = (p) => p.scores.reduce((a, b) => a + (b || 0), 0);

function start(st, api) {
  const ms = api.seated().slice(0, meta.maxPlayers);
  const course = courseOf(st);
  st.players = ms.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, x: 0, y: 0, from: null, strokes: 0, holed: false, scores: course.holes.map(() => null), idle: 0, out: false }));
  api.sys(`${course.name}: ${course.holes.length} holes. Lowest total wins.`, 'accent');
  beginHole(st, api, 0);
}

function beginHole(st, api, idx) {
  const hole = courseOf(st).holes[idx];
  st.hole = idx;
  st.phase = 'play';
  st.anim = null;
  st.animUntil = 0;
  for (const p of st.players) {
    p.x = hole.tee[0]; p.y = hole.tee[1]; p.from = null; p.strokes = 0; p.holed = !!p.out;
  }
  pickNext(st, api);
  api.sys(`Hole ${idx + 1}: ${hole.name} (par ${hole.par}).`, 'accent');
  api.changed();
}

// Farthest from the cup goes next; at the tee, the honour rotates with the hole number.
function pickNext(st, api) {
  const hole = courseOf(st).holes[st.hole];
  const cand = st.players.map((p, i) => ({ p, i })).filter((c) => !c.p.out && !c.p.holed);
  if (!cand.length) { st.turn = -1; return; }
  const n = st.players.length;
  cand.sort((a, b) => {
    const da = Math.round(Math.hypot(a.p.x - hole.cup[0], a.p.y - hole.cup[1]) * 2);
    const db = Math.round(Math.hypot(b.p.x - hole.cup[0], b.p.y - hole.cup[1]) * 2);
    if (da !== db) return db - da;
    return ((a.i - st.hole + n * 8) % n) - ((b.i - st.hole + n * 8) % n);
  });
  st.turn = cand[0].i;
  st.deadline = api.now() + st.settings.turnTime * 1000;
}

function endHole(st, api, ms) {
  st.phase = 'between';
  st.turn = -1;
  st.deadline = 0;
  st.nextAt = api.now() + ms + BETWEEN_MS;
  for (const p of st.players) p.scores[st.hole] = p.out && !p.holed ? p.scores[st.hole] : p.strokes;
  const hole = courseOf(st).holes[st.hole];
  st.summary = st.players.map((p) => ({ id: p.id, strokes: p.scores[st.hole], par: hole.par }));
}

function finishCourse(st, api, forfeit) {
  if (st.over) return;
  st.over = true;
  const course = courseOf(st);
  const rows = st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, scores: p.scores, total: totalOf(p), out: p.out, played: p.scores.filter((s) => s !== null).length }));
  const ranked = rows.filter((r) => !r.out).sort((a, b) => a.total - b.total);
  const best = ranked.length ? ranked[0].total : null;
  const winners = ranked.filter((r) => r.total === best).map((r) => r.id);
  for (const id of winners) {
    const m = api.member(id);
    if (m) m.score += 1;
  }
  const standings = rows.sort((a, b) => (a.out - b.out) || a.total - b.total);
  const tie = winners.length > 1;
  if (tie) api.sys(`It's a tie at ${best} strokes!`, 'good');
  else if (winners.length) api.sys(`${standings[0].name} wins with ${best} strokes!`, 'good');
  api.end({
    type: 'golf',
    course: course.name,
    pars: course.holes.map((h) => h.par),
    standings,
    winnerId: tie || !winners.length ? null : winners[0],
    winners,
    tie,
    forfeit: !!forfeit,
  });
}

function putt(st, api, p, angle, power) {
  const course = courseOf(st);
  const hole = course.holes[st.hole];
  const r = simulatePutt(hole, p.x, p.y, angle, power);
  p.from = { x: p.x, y: p.y };
  p.strokes++;
  let note = null;
  if (r.outcome === 'water') {
    p.strokes++;
    note = 'water';
    api.sys(`${p.name}'s ball found the water (+1 stroke).`, 'warn');
  } else {
    p.x = r.x; p.y = r.y;
    if (r.outcome === 'cup') {
      p.holed = true;
      const vs = p.strokes - hole.par;
      api.sys(`${p.name} sank it in ${p.strokes}${p.strokes === 1 ? ' (hole in one!)' : vs <= -1 ? ' (under par)' : vs === 0 ? ' (par)' : ''}.`, 'good');
    }
  }
  if (r.outcome === 'water') { p.x = p.from.x; p.y = p.from.y; }
  if (!p.holed && p.strokes >= st.settings.maxStrokes) {
    p.holed = true;
    p.strokes = st.settings.maxStrokes;
    note = note || 'limit';
    api.sys(`${p.name} reached the ${st.settings.maxStrokes}-stroke limit and picks up.`, 'warn');
  }
  const ms = Math.ceil(r.anim.duration * 1000) + HOLD_MS;
  st.anim = { shot: ++st.shots, by: p.id, frames: r.anim.frames, duration: r.anim.duration, outcome: r.outcome, from: p.from };
  st.animUntil = api.now() + ms;
  st.animStart = api.now();
  st.last = { by: p.id, outcome: r.outcome, note, strokes: p.strokes };
  if (!active(st).length) {
    endHole(st, api, ms);
  } else {
    pickNext(st, api);
    st.deadline += ms;
  }
  api.changed();
}

function onAction(st, m, a, api) {
  if (st.over || !a || typeof a !== 'object' || st.phase !== 'play') return;
  const i = st.players.findIndex((p) => p.id === m.id);
  if (i < 0 || i !== st.turn || api.now() < st.animUntil) return;
  if (a.type !== 'putt') return;
  if (typeof a.angle !== 'number' || !Number.isFinite(a.angle) || Math.abs(a.angle) > 1000) return;
  if (typeof a.power !== 'number' || !Number.isFinite(a.power) || a.power < 0 || a.power > 1) return;
  const p = st.players[i];
  p.idle = 0;
  putt(st, api, p, a.angle, Math.max(0.02, a.power));
}

// Aim straight at the cup with about the right power for an idle player.
function autoPutt(st, api, p) {
  const hole = courseOf(st).holes[st.hole];
  const dx = hole.cup[0] - p.x;
  const dy = hole.cup[1] - p.y;
  const dist = Math.hypot(dx, dy);
  // distance covered ~ v^2 / (2*roll) with a little drag allowance
  const v = Math.sqrt(2 * 120 * dist) * 0.8;
  const power = Math.min(1, Math.max(0.1, (v - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)));
  putt(st, api, p, Math.atan2(dy, dx), power);
}

function dropPlayer(st, api, p, why) {
  if (p.out) return;
  p.out = true;
  p.holed = true;
  api.sys(`${p.name} ${why}.`, 'warn');
  const left = live(st);
  if (left.length <= 1) return finishCourse(st, api, true);
  if (st.phase === 'play') {
    if (!active(st).length) return endHole(st, api, Math.max(0, st.animUntil - api.now()));
    if (st.players[st.turn] === p || st.turn < 0 || st.players[st.turn].holed) pickNext(st, api);
  }
  api.changed();
}

function tick(st, api, now) {
  if (st.over) return;
  if (st.phase === 'between') {
    if (now < st.nextAt) return;
    const course = courseOf(st);
    if (st.hole + 1 >= course.holes.length) return finishCourse(st, api);
    return beginHole(st, api, st.hole + 1);
  }
  if (st.phase !== 'play' || !st.deadline || now < st.deadline || now < st.animUntil) return;
  const p = st.players[st.turn];
  if (!p) return;
  p.idle++;
  if (p.idle >= IDLE_LIMIT) return dropPlayer(st, api, p, 'was away too long and is out');
  api.sys(`${p.name} ran out of time, so a putt was played for them.`, 'warn');
  autoPutt(st, api, p);
}

function onLeave(st, id, api) {
  if (st.over) return;
  const p = st.players.find((x) => x.id === id);
  if (p) dropPlayer(st, api, p, 'left');
}

function view(st, m, now) {
  const course = courseOf(st);
  const hole = course.holes[st.hole];
  const me = st.players.findIndex((p) => p.id === m.id);
  const anim = st.anim && now < st.animUntil ? { ...st.anim, elapsedMs: now - st.animStart } : null;
  const hDef = hole && { name: hole.name, par: hole.par, poly: hole.poly, walls: hole.walls || [], bumpers: hole.bumpers || [], sand: hole.sand || [], water: hole.water || [], tee: hole.tee, cup: hole.cup, cupR: CUP_R, ballR: BALL_R };
  return {
    course: { id: course.id, name: course.name, pars: course.holes.map((h) => h.par), holes: course.holes.length },
    holeIndex: st.hole,
    hole: hDef,
    size: { w: COURSES.W, h: COURSES.H },
    phase: st.phase,
    turnId: st.turn >= 0 ? st.players[st.turn].id : null,
    myIndex: me,
    busy: now < st.animUntil,
    busyMs: Math.max(0, st.animUntil - now),
    anim,
    last: st.last,
    maxStrokes: st.settings.maxStrokes,
    summary: st.phase === 'between' ? st.summary : null,
    players: st.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, x: p.x, y: p.y, strokes: p.strokes, holed: p.holed, scores: p.scores, total: totalOf(p) + (p.scores[st.hole] === null ? p.strokes : 0), out: p.out })),
    timeLeft: st.deadline && st.phase === 'play' ? Math.max(0, st.deadline - now) : null,
    nextInMs: st.phase === 'between' ? Math.max(0, st.nextAt - now) : null,
  };
}

module.exports = {
  meta, defaults, sanitizeSettings, create, start, tick, onAction, onLeave, view,
  rules: { simulatePutt, onFairway, geometry, BALL_R, CUP_R, MAX_SPEED, MIN_SPEED, CUP_MAX_SPEED },
};
