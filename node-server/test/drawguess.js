// Draw & Guess unit tests: word bank, difficulty, six choices, settings validation, flood fill.
// Run: node test/drawguess.js (also part of npm test)
const dg = require('../server/games/drawguess');
const { floodFill } = require('../public/js/games/fill');

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) failures++;
};
const norm = (t) => String(t).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// ---------- word bank ----------
const bank = dg.WORD_BANK;
const tiers = ['easy', 'medium', 'hard'];
const all = tiers.flatMap((t) => bank[t]);
ok(tiers.every((t) => Array.isArray(bank[t]) && bank[t].length >= 100), 'each difficulty tier has 100+ words');
ok(all.length >= 700, `word bank has 700+ entries (${all.length})`);
ok(new Set(all.map(norm)).size === all.length, 'no duplicate entries after normalizing');
ok(all.every((w) => /^[a-z0-9 'ñ-]+$/i.test(w) && w.length >= 3 && w.length <= 30), 'entries are 3-30 plain characters');
ok(bank.hard.some((w) => w.includes(' ')) && bank.hard.filter((w) => w.includes(' ')).length >= 50, 'hard tier has many multi-word concepts');
// Phase 2 (#40): larger curated bank, every tier deep enough for long games.
ok(all.length >= 1400 && tiers.every((t) => bank[t].length >= 450), `bank has 1400+ words, 450+ per tier (${tiers.map((t) => bank[t].length).join('/')})`);
{
  const { cleanChat } = require('../server/filter');
  const masked = all.filter((w) => cleanChat(w) !== w);
  ok(!masked.length, `no word is altered by the chat filter, so every word can be guessed (${masked.join(', ')})`);
}

// ---------- settings ----------
const base = { ...dg.defaults };
const san = (s, prev = base) => dg.sanitizeSettings(s, prev);
ok(base.difficulty === 'medium' && base.drawTime === 80, 'defaults: medium difficulty, 80s');
for (const t of [30, 45, 60, 80, 100, 120, 150, 180, 240, 300]) ok(san({ drawTime: t }).drawTime === t, `drawTime ${t} accepted`);
for (const bad of [0, 29, 181, 250, 301, 9999, -5, '120', null, NaN, {}, [120]]) ok(san({ drawTime: bad }).drawTime === 80, `drawTime ${JSON.stringify(bad)} rejected`);
for (const d of ['easy', 'medium', 'hard', 'mixed']) ok(san({ difficulty: d }).difficulty === d, `difficulty ${d} accepted`);
for (const bad of ['EASY', 'extreme', '', null, 1, {}, ['hard']]) ok(san({ difficulty: bad }).difficulty === 'medium', `difficulty ${JSON.stringify(bad)} rejected`);
ok(san({ customOnly: true }).customOnly === false, 'custom-only refused with no custom words');
ok(san({ customOnly: true, customWords: 'a1, b2, c3, d4, e5' }).customOnly === false, 'custom-only refused with 5 custom words');
ok(san({ customOnly: true, customWords: 'aa, bb, cc, dd, ee, ff' }).customOnly === true, 'custom-only accepted with 6 custom words');
ok(san({ customOnly: true, customWords: 'foo bar, foo-bar, Foo  Bar, foo_bar, foo.bar, FOO BAR' }).customOnly === false, 'custom-only counts normalized duplicates once');
ok(san({ customWords: 'aa' }, san({ customOnly: true, customWords: 'aa, bb, cc, dd, ee, ff' })).customOnly === false, 'custom-only switches off when custom words drop below 6');

// ---------- picking ----------
const stFor = (settings, used = []) => ({ settings: { ...base, ...settings }, used: new Set(used.map(norm)) });
const inTier = (w, t) => bank[t].includes(w);
for (const t of tiers) {
  let good = true;
  for (let i = 0; i < 200; i++) {
    const c = dg.pickWords(stFor({ difficulty: t }), dg.CHOICE_COUNT);
    if (c.length !== 6 || new Set(c.map(norm)).size !== 6 || !c.every((w) => inTier(w, t))) good = false;
  }
  ok(good, `${t}: always 6 distinct words, all from the ${t} tier`);
}
{
  const seen = new Set();
  let good = true;
  for (let i = 0; i < 200; i++) {
    const c = dg.pickWords(stFor({ difficulty: 'mixed' }), 6);
    if (c.length !== 6 || new Set(c.map(norm)).size !== 6) good = false;
    for (const w of c) tiers.forEach((t) => inTier(w, t) && seen.add(t));
  }
  ok(good && seen.size === 3, 'mixed: 6 distinct words spanning all three tiers');
  const c = dg.pickWords(stFor({ difficulty: 'mixed' }), 6);
  ok(tiers.filter((t) => c.some((w) => inTier(w, t))).length === 3, 'mixed: every choice set has easy, medium and hard words');
}
{
  const words = 'zeta one, yodel two, xylo three, wombat four, vortex five, umbra six, tango seven';
  const st = stFor({ customWords: words, customOnly: true });
  let good = true;
  for (let i = 0; i < 100; i++) {
    const c = dg.pickWords(st, 6);
    if (c.length !== 6 || new Set(c).size !== 6 || !c.every((w) => words.includes(w))) good = false;
  }
  ok(good, 'custom-only: 6 distinct custom words, no built-in words');
  const small = stFor({ customWords: 'aa, bb, cc', customOnly: true }); // bypasses sanitize on purpose
  const c = dg.pickWords(small, 6);
  ok(c.length === 3 && c.every((w) => ['aa', 'bb', 'cc'].includes(w)), 'custom-only with a short pool never substitutes built-in words');
  const mixed = stFor({ customWords: 'aa, bb, cc', customOnly: false, difficulty: 'hard' });
  let both = false;
  for (let i = 0; i < 100; i++) {
    const c2 = dg.pickWords(mixed, 6);
    if (c2.length !== 6 || new Set(c2).size !== 6) both = false;
    else if (c2.some((w) => ['aa', 'bb', 'cc'].includes(w)) && c2.some((w) => inTier(w, 'hard'))) both = true;
  }
  ok(both, 'custom words are an extra pool alongside the chosen difficulty');
}
{
  // Near exhaustion: all but 3 hard words already played -> unplayed words come first, then repeats; still 6 distinct.
  const keep = bank.hard.slice(0, 3);
  const used = bank.hard.slice(3);
  const c = dg.pickWords(stFor({ difficulty: 'hard' }, used), 6);
  ok(c.length === 6 && new Set(c).size === 6 && keep.every((w) => c.includes(w)), 'near exhaustion: unplayed words first, then repeats, never duplicates');
  const c2 = dg.pickWords(stFor({ difficulty: 'hard' }, bank.hard), 6);
  ok(c2.length === 6 && new Set(c2).size === 6, 'fully exhausted tier still yields 6 distinct words');
}

{
  // A custom word that normalizes like a built-in one counts as already played.
  const builtin = bank.easy.find((w) => w.includes(' ')) || bank.medium.find((w) => w.includes(' '));
  const st = stFor({ difficulty: 'mixed' }, [builtin.replace(/ /g, '-')]);
  let seenAgain = false;
  for (let i = 0; i < 300; i++) if (dg.pickWords(st, 6).includes(builtin)) seenAgain = true;
  ok(!seenAgain, 'played words are matched by normalized form');
}

// ---------- fill cap resync ----------
{
  const sent = [];
  const api = { toMember: (id, ev, d) => sent.push([id, ev, d]), toRoom() {} };
  const st = dg.create(san({}));
  st.phase = 'draw';
  st.drawerId = 'd';
  st.resetBucket = { take: () => true };
  let accepted = 0;
  for (let i = 0; i < 105; i++) if (dg.onDraw(st, { id: 'd' }, { op: 'fill', x: 1, y: 1, color: '#ff0000' }, api)) accepted++;
  ok(accepted === 100 && st.history.length === 100, 'fills are capped at 100 per turn');
  ok(sent.length === 5 && sent.every(([id, ev, d]) => id === 'd' && ev === 'canvas' && d.history.length === 100), 'rejected fills send the real canvas back to the drawer only');
}

// ---------- timers via game state ----------
{
  const events = [];
  const api = {
    now: () => 1000, seated: () => [{ id: 'a' }, { id: 'b' }], member: (id) => ({ id, name: id, score: 0 }), sys() {}, toRoom() {}, changed() {}, chat() {}, toMember() {}, end() {},
  };
  const st = dg.create(san({ drawTime: 300 }));
  dg.start(st, api);
  ok(st.choices.length === 6, 'turn starts with 6 choices');
  const v = dg.view(st, { id: st.drawerId, role: 'player' }, 1000);
  const vs = dg.view(st, { id: 'spec', role: 'spectator' }, 1000);
  ok(v.choices.length === 6 && vs.choices === null, 'only the drawer receives the choices');
  ok(!JSON.stringify(vs).includes(st.choices[0]), 'spectator view does not contain any choice');
  dg.onAction(st, { id: st.drawerId }, { type: 'choose', index: 5 }, api);
  ok(st.phase === 'draw' && st.word === st.choices[5] && st.total === 300000 && st.deadline === 1000 + 300000, '300s timer drives the draw deadline');
  ok(st.hintTimes.length > 0 && st.hintTimes.every((t) => t > 1000 && t < st.deadline), 'hints are scheduled inside the longer turn');
  const rv = dg.view(st, { id: 'x', role: 'player' }, 1000 + 150000);
  ok(rv.timeLeft === 150000 && rv.totalTime === 300000, 'reconnect view reports remaining time against the full 300s');
}

// ---------- flood fill ----------
const W = 100;
const H = 80;
const canvas = () => {
  const d = new Uint8ClampedArray(W * H * 4).fill(255);
  return d;
};
const px = (d, x, y) => [d[(y * W + x) * 4], d[(y * W + x) * 4 + 1], d[(y * W + x) * 4 + 2]];
const setPx = (d, x, y, v) => { const i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; };
// Draw an outlined rectangle with a soft (anti-aliased) 1px rim.
function box(d, x0, y0, x1, y1, gap) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
    const edge = x === x0 || x === x1 || y === y0 || y === y1;
    if (edge) setPx(d, x, y, 0);
  }
  for (let x = x0 - 1; x <= x1 + 1; x++) for (let y = y0 - 1; y <= y1 + 1; y++) {
    const outer = x < x0 || x > x1 || y < y0 || y > y1;
    const inner = x === x0 + 1 || x === x1 - 1 || y === y0 + 1 || y === y1 - 1;
    if (outer) setPx(d, x, y, 170);
    else if (inner && px(d, x, y)[0] === 255) setPx(d, x, y, 170);
  }
  if (gap) setPx(d, gap[0], gap[1], 255), setPx(d, gap[0], gap[1] - 1 >= 0 ? gap[1] : 0, 255);
}
{
  const d = canvas();
  box(d, 20, 20, 60, 50);
  const n = floodFill(d, W, H, 40, 35, '#ff0000');
  ok(n > 0 && px(d, 40, 35).join() === '255,0,0', 'fill paints the clicked area');
  ok(px(d, 5, 5).join() === '255,255,255' && px(d, 90, 70).join() === '255,255,255', 'fill does not leak outside a closed outline');
  ok(px(d, 20, 35).join() === '0,0,0', 'outline core is untouched');
  const rim = px(d, 21, 35);
  ok(rim[0] > 200 && rim[1] < 120 && rim[2] < 120, `anti-aliased rim inside the outline is tinted by the fill, no white halo (${rim})`);
  ok(px(d, 19, 35)[1] === 170, 'rim pixels outside the shape are untouched');
}
{
  const d = canvas();
  box(d, 20, 20, 60, 50);
  floodFill(d, W, H, 5, 5, '#00ff00');
  ok(px(d, 40, 35).join() === '255,255,255' && px(d, 5, 5).join() === '0,255,0', 'filling outside leaves the inside of a closed shape alone');
}
{
  // Thin 1px dividing line must not let the fill grow into the next area.
  const d = canvas();
  for (let y = 0; y < H; y++) setPx(d, 50, y, 0);
  floodFill(d, W, H, 10, 10, '#0000ff');
  ok(px(d, 49, 10).join() !== '255,255,255' && px(d, 51, 10).join() === '255,255,255', 'a 1px line separates two areas');
}
{
  // A gap in the outline lets the fill out (documented behavior), and nothing crashes.
  const d = canvas();
  box(d, 20, 20, 60, 50);
  for (let y = 33; y <= 37; y++) setPx(d, 20, y, 255), setPx(d, 19, y, 255), setPx(d, 21, y, 255);
  floodFill(d, W, H, 40, 35, '#ff0000');
  ok(px(d, 5, 5).join() === '255,0,0', 'an outline with a gap leaks, as expected');
}
{
  const d = canvas();
  ok(floodFill(d, W, H, -1, 5, '#ff0000') === 0 && floodFill(d, W, H, 5, H, '#ff0000') === 0 && floodFill(d, W, H, NaN, 1, '#ff0000') === 0, 'out-of-range clicks are ignored');
  floodFill(d, W, H, 3, 3, '#123456');
  ok(floodFill(d, W, H, 3, 3, '#123456') === 0, 'filling with the same color is a no-op');
}
{
  // Determinism: replaying the same history on a fresh buffer gives identical pixels.
  const history = [[40, 35, '#ff0000'], [5, 5, '#00ff00'], [40, 35, '#0000ff']];
  const run = () => { const d = canvas(); box(d, 20, 20, 60, 50); for (const [x, y, c] of history) floodFill(d, W, H, x, y, c); return d; };
  const a = run();
  const b = run();
  ok(a.length === b.length && a.every((v, i) => v === b[i]), 'same history produces identical canvases');
}
{
  const BW = 800;
  const BH = 600;
  const d = new Uint8ClampedArray(BW * BH * 4).fill(255);
  const t = Date.now();
  floodFill(d, BW, BH, 400, 300, '#ff0000');
  const ms = Date.now() - t;
  ok(ms < 1500, `full 800x600 fill is bounded (${ms} ms)`);
}

{
  // Phase 2 (#40): the faster fill must paint exactly what the original algorithm painted.
  // Reference: the pre-#40 implementation, kept here verbatim in behaviour as an oracle.
  const ref = (d, W, H, x0, y0, hex) => {
    const { TOL, GROW, EDGE_MAX } = require('../public/js/games/fill');
    const x = Math.floor(x0), y = Math.floor(y0);
    if (!(x >= 0 && y >= 0 && x < W && y < H)) return 0;
    const s0 = (y * W + x) * 4, tr = d[s0], tg = d[s0 + 1], tb = d[s0 + 2];
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    if (tr === r && tg === g && tb === b) return 0;
    const dist = (p) => Math.max(Math.abs(d[p * 4] - tr), Math.abs(d[p * 4 + 1] - tg), Math.abs(d[p * 4 + 2] - tb));
    const region = new Uint8Array(W * H);
    const okp = (p) => !region[p] && dist(p) <= TOL;
    const stack = [x, y];
    let count = 0;
    while (stack.length) {
      const cy = stack.pop(), cx = stack.pop();
      if (!okp(cy * W + cx)) continue;
      let lx = cx, rx = cx;
      while (lx > 0 && okp(cy * W + lx - 1)) lx--;
      while (rx < W - 1 && okp(cy * W + rx + 1)) rx++;
      let up = false, down = false;
      for (let xx = lx; xx <= rx; xx++) {
        const p = cy * W + xx;
        region[p] = 1; count++;
        if (cy > 0) { const q = okp(p - W); if (q && !up) stack.push(xx, cy - 1); up = q; }
        if (cy < H - 1) { const q = okp(p + W); if (q && !down) stack.push(xx, cy + 1); down = q; }
      }
    }
    let frontier = [];
    for (let p = 0; p < W * H; p++) if (region[p]) frontier.push(p);
    const edge = [], rim = new Uint8Array(W * H);
    for (let step = 0; step < GROW; step++) {
      const next = [];
      for (const p of frontier) {
        const px = p % W;
        for (const q of [px > 0 ? p - 1 : -1, px < W - 1 ? p + 1 : -1, p >= W ? p - W : -1, p < W * (H - 1) ? p + W : -1]) {
          if (q < 0 || region[q] || rim[q]) continue;
          const dq = dist(q);
          if (dq <= TOL || dq >= EDGE_MAX) continue;
          rim[q] = 1; edge.push(q, 255 - Math.floor((dq * 255) / EDGE_MAX)); next.push(q);
        }
      }
      frontier = next;
    }
    for (let p = 0; p < W * H; p++) if (region[p]) { d[p * 4] = r; d[p * 4 + 1] = g; d[p * 4 + 2] = b; d[p * 4 + 3] = 255; }
    for (let i = 0; i < edge.length; i += 2) {
      const p = edge[i], w = edge[i + 1];
      for (let c = 0; c < 3; c++) d[p * 4 + c] = Math.floor((d[p * 4 + c] * (255 - w) + [r, g, b][c] * w) / 255);
      d[p * 4 + 3] = 255;
    }
    return count;
  };
  let seed = 40;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let same = true;
  // Mixed sizes in one run also prove the reused scratch buffers never carry state between fills.
  for (let t = 0; t < 120 && same; t++) {
    const w = 20 + Math.floor(rnd() * 120), h = 20 + Math.floor(rnd() * 90);
    const d = new Uint8ClampedArray(w * h * 4).fill(255);
    for (let k = 0; k < 40; k++) {
      const x = Math.floor(rnd() * w), y = Math.floor(rnd() * h), v = Math.floor(rnd() * 256), len = Math.floor(rnd() * w), vert = rnd() < 0.5;
      for (let i = 0; i < len; i++) {
        const j = ((vert ? (y + i) % h : y) * w + (vert ? x : (x + i) % w)) * 4;
        d[j] = v; d[j + 1] = Math.floor(rnd() * 256); d[j + 2] = v;
      }
    }
    const a = d.slice(), b = d.slice();
    for (let f = 0; f < 5; f++) {
      const x = rnd() * w, y = rnd() * h, c = '#' + Math.floor(rnd() * 0xffffff).toString(16).padStart(6, '0');
      if (ref(a, w, h, x, y, c) !== floodFill(b, w, h, x, y, c)) same = false;
    }
    if (!a.every((v, i) => v === b[i])) same = false;
  }
  ok(same, 'optimized fill matches the original algorithm pixel for pixel on 120 random canvases');
  const BW = 800, BH = 600;
  const d = new Uint8ClampedArray(BW * BH * 4).fill(255);
  const time = (fn) => { const t = process.hrtime.bigint(); fn(); return Number(process.hrtime.bigint() - t) / 1e6; };
  const refMs = time(() => { for (let i = 0; i < 4; i++) ref(d, BW, BH, 400, 300, i % 2 ? '#ff0000' : '#00ff00'); });
  const newMs = time(() => { for (let i = 0; i < 4; i++) floodFill(d, BW, BH, 400, 300, i % 2 ? '#ff0000' : '#00ff00'); });
  ok(newMs < refMs, `full-canvas fill is faster than before (${(newMs / 4).toFixed(1)} ms vs ${(refMs / 4).toFixed(1)} ms per fill)`);
}

console.log(failures ? `\n${failures} FAILED` : '\nAll passed');
process.exit(failures ? 1 : 0);
