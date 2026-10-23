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
ok(san({ customWords: 'aa' }, san({ customOnly: true, customWords: 'aa, bb, cc, dd, ee, ff' })).customOnly === false, 'custom-only switches off when custom words drop below 6');

// ---------- picking ----------
const stFor = (settings, used = []) => ({ settings: { ...base, ...settings }, used: new Set(used) });
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

console.log(failures ? `\n${failures} FAILED` : '\nAll passed');
process.exit(failures ? 1 : 0);
