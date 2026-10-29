// Small deterministic 2D circle physics shared by Pool and Mini Golf (batch 5).
// The server runs the whole shot in one synchronous call and sends the sampled path to clients,
// which only replay it. Nothing here uses randomness or wall-clock time, so the same inputs always
// give the same result (the tests rely on that).
//
// Model: equal-size balls, fixed time step, constant rolling deceleration plus a little exponential
// drag, and elastic-with-loss collisions against line segments and (optionally) each other. There is
// no spin or english; this is deliberately "realistic but manageable".

const DT = 1 / 240;

// Pushes a circle out of a segment and reflects its velocity. Returns the impact speed (0 if no hit).
function bounceSegment(b, x1, y1, x2, y2, rest) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((b.x - x1) * dx + (b.y - y1) * dy) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = x1 + dx * t;
  const cy = y1 + dy * t;
  let nx = b.x - cx;
  let ny = b.y - cy;
  const d2 = nx * nx + ny * ny;
  if (d2 >= b.r * b.r) return 0;
  const d = Math.sqrt(d2);
  if (d < 1e-9) {
    // centre exactly on the segment: use the segment normal
    const l = Math.sqrt(len2) || 1;
    nx = -dy / l;
    ny = dx / l;
  } else {
    nx /= d;
    ny /= d;
  }
  b.x = cx + nx * b.r;
  b.y = cy + ny * b.r;
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return 0;
  b.vx -= (1 + rest) * vn * nx;
  b.vy -= (1 + rest) * vn * ny;
  return -vn;
}

// Equal-mass collision between two circles. Returns the closing speed (0 if no collision).
function bounceBalls(a, b, rest) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const min = a.r + b.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= min * min) return 0;
  const d = Math.sqrt(d2) || 1e-9;
  const nx = d2 ? dx / d : 1;
  const ny = d2 ? dy / d : 0;
  const overlap = (min - d) / 2;
  a.x -= nx * overlap;
  a.y -= ny * overlap;
  b.x += nx * overlap;
  b.y += ny * overlap;
  const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (rvn >= 0) return 0;
  const j = (-(1 + rest) * rvn) / 2;
  a.vx -= j * nx;
  a.vy -= j * ny;
  b.vx += j * nx;
  b.vy += j * ny;
  return -rvn;
}

const r1 = (v) => Math.round(v * 10) / 10;

/**
 * Runs a shot until everything stops or maxTime passes.
 * world: {
 *   balls: [{ id, x, y, vx, vy, r }]            (mutated; removed balls get .gone = true and keep their last x,y)
 *   walls: [[x1,y1,x2,y2], ...]  circles: [{x,y,r}] static round bumpers
 *   wallRest, ballRest, roll (u/s^2), drag (1/s), stopSpeed, maxTime, sampleEvery (steps)
 *   collide: whether balls hit each other
 *   frictionAt(ball) -> multiplier for roll+drag (e.g. sand)
 *   afterStep(ball, t) -> 'gone' to remove the ball (pocket, cup, water) or undefined
 *   onWall(ball, speed, t), onBalls(a, b, speed, t): event hooks
 * }
 * Returns { frames, duration, settled, steps } where frames[i] is [t, ...per-ball (x, y) in input order,
 * null,null for gone balls]. Frame 0 is the starting position.
 */
function run(world) {
  const {
    balls, walls = [], circles = [], wallRest = 0.8, ballRest = 0.96, roll = 100, drag = 0.3, stopSpeed = 5,
    maxTime = 20, sampleEvery = 8, collide = false, frictionAt, afterStep, onWall, onBalls,
  } = world;
  const frames = [];
  const snap = (t) => {
    const f = [Math.round(t * 1000) / 1000]; // millisecond timestamps: samples are 1/30-1/60 s apart
    for (const b of balls) {
      if (b.gone) f.push(null, null);
      else f.push(r1(b.x), r1(b.y));
    }
    frames.push(f);
  };
  snap(0);
  let steps = 0;
  const maxSteps = Math.ceil(maxTime / DT);
  let settled = false;
  while (steps < maxSteps) {
    steps++;
    const t = steps * DT;
    let moving = false;
    for (const b of balls) {
      if (b.gone) continue;
      const sp0 = Math.hypot(b.vx, b.vy);
      if (sp0 === 0) continue;
      b.x += b.vx * DT;
      b.y += b.vy * DT;
      // friction: constant deceleration + drag
      const k = frictionAt ? frictionAt(b) : 1;
      const sp = Math.max(0, sp0 - roll * k * DT) * Math.exp(-drag * k * DT);
      if (sp < stopSpeed) {
        b.vx = 0;
        b.vy = 0;
      } else {
        const s = sp / sp0;
        b.vx *= s;
        b.vy *= s;
      }
    }
    for (const b of balls) {
      if (b.gone) continue;
      for (const w of walls) {
        const hit = bounceSegment(b, w[0], w[1], w[2], w[3], wallRest);
        if (hit && onWall) onWall(b, hit, t);
      }
      for (const c of circles) {
        // a round bumper is a ball of infinite mass
        const dx = b.x - c.x;
        const dy = b.y - c.y;
        const min = b.r + c.r;
        const d2 = dx * dx + dy * dy;
        if (d2 < min * min) {
          const d = Math.sqrt(d2) || 1e-9;
          const nx = dx / d;
          const ny = dy / d;
          b.x = c.x + nx * min;
          b.y = c.y + ny * min;
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) {
            b.vx -= (1 + (c.rest || wallRest)) * vn * nx;
            b.vy -= (1 + (c.rest || wallRest)) * vn * ny;
            if (onWall) onWall(b, -vn, t);
          }
        }
      }
    }
    if (collide) {
      for (let i = 0; i < balls.length; i++) {
        if (balls[i].gone) continue;
        for (let j = i + 1; j < balls.length; j++) {
          if (balls[j].gone) continue;
          const hit = bounceBalls(balls[i], balls[j], ballRest);
          if (hit && onBalls) onBalls(balls[i], balls[j], hit, t);
        }
      }
    }
    if (afterStep) {
      for (const b of balls) {
        if (b.gone) continue;
        if (afterStep(b, t) === 'gone') {
          b.gone = true;
          b.vx = 0;
          b.vy = 0;
        }
      }
    }
    for (const b of balls) if (!b.gone && (b.vx || b.vy)) moving = true;
    if (steps % sampleEvery === 0) snap(t);
    if (!moving) {
      settled = true;
      break;
    }
  }
  // A shot that never settles within maxTime is stopped dead rather than left rolling.
  for (const b of balls) {
    if (!b.gone) {
      b.vx = 0;
      b.vy = 0;
    }
  }
  const duration = steps * DT;
  snap(duration);
  return { frames, duration, settled, steps };
}

// Turns a polygon (list of [x,y]) into closed wall segments.
function polyWalls(points) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    out.push([a[0], a[1], b[0], b[1]]);
  }
  return out;
}

// Even-odd point-in-polygon test.
function inPoly(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

module.exports = { DT, run, polyWalls, inPoly, bounceSegment, bounceBalls };
