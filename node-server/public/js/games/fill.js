// Paint-bucket fill for Draw & Guess, shared by the browser and the tests.
// Pure integer math over an RGBA buffer, so the same drawing history always
// produces the same fill (replay, undo and late joiners included).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.GameUI = root.GameUI || {}).fill = factory();
})(typeof window !== 'undefined' ? window : globalThis, () => {
  const TOL = 40;        // max per-channel distance from the clicked color that still counts as "the same area"
  const GROW = 2;        // pixels the fill is grown into anti-aliased edges, so no light halo is left along lines
  const EDGE_MAX = 204;  // pixels this far (or more) from the clicked color are line core and are never touched

  const hexRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  // Scratch buffers reused between fills (a fill used to allocate and walk ~0.5M-entry arrays each time,
  // which made replaying a turn with many fills slow). mark: 0 = untouched, 1 = fill area, 2 = rim.
  let mark = null;
  let stack = null;
  let rimList = null;
  let near = null; // 1 = within TOL of the clicked color

  // Fills the area around (x0, y0) in place. Returns the number of pixels set (0 if nothing changed).
  function floodFill(d, W, H, x0, y0, hex) {
    const x = Math.floor(x0);
    const y = Math.floor(y0);
    if (!(x >= 0 && y >= 0 && x < W && y < H)) return 0;
    const s0 = (y * W + x) * 4;
    const tr = d[s0];
    const tg = d[s0 + 1];
    const tb = d[s0 + 2];
    const [r, g, b] = hexRgb(hex);
    if (tr === r && tg === g && tb === b) return 0;

    const N = W * H;
    if (!mark || mark.length < N) {
      mark = new Uint8Array(N);
      stack = new Int32Array(2 * N + 2);
      rimList = new Int32Array(N);
      near = new Uint8Array(N);
    } else mark.fill(0, 0, N);
    // One tight pass to classify every pixel is much cheaper than measuring it on each visit.
    for (let p = 0, i = 0; p < N; p++, i += 4) {
      const a = d[i] - tr;
      const c = d[i + 1] - tg;
      const e = d[i + 2] - tb;
      near[p] = a <= TOL && a >= -TOL && c <= TOL && c >= -TOL && e <= TOL && e >= -TOL ? 1 : 0;
    }
    const dist = (p) => {
      const i = p << 2;
      const a = d[i] - tr;
      const c = d[i + 1] - tg;
      const e = d[i + 2] - tb;
      return Math.max(a < 0 ? -a : a, c < 0 ? -c : c, e < 0 ? -e : e);
    };
    const ok = (p) => mark[p] === 0 && near[p] === 1;

    // Scanline fill over pixel indexes. Each pixel is pushed at most once per span edge, so N bounds the stack.
    let sp = 0;
    stack[sp++] = y * W + x;
    let count = 0;
    let minY = y;
    let maxY = y;
    while (sp) {
      const p0 = stack[--sp];
      if (!ok(p0)) continue;
      const cy = (p0 / W) | 0;
      const row = cy * W;
      let lx = p0 - row;
      while (lx > 0 && ok(row + lx - 1)) lx--;
      let rx = p0 - row;
      while (rx < W - 1 && ok(row + rx + 1)) rx++;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;
      let up = false;
      let down = false;
      for (let p = row + lx, end = row + rx; p <= end; p++) {
        mark[p] = 1;
        count++;
        if (cy > 0) {
          const q = ok(p - W);
          if (q && !up && sp < stack.length) stack[sp++] = p - W;
          up = q;
        }
        if (cy < H - 1) {
          const q = ok(p + W);
          if (q && !down && sp < stack.length) stack[sp++] = p + W;
          down = q;
        }
      }
    }

    // Grow into the anti-aliased rim of nearby lines (never past it): those pixels get the fill
    // blended in by how close they are to the original color, so the line stays crisp, with no halo.
    // Step 1 grows from the fill area, each later step from the rim pixels the previous step added.
    let rn = 0;
    const grow = (q) => {
      if (mark[q]) return;
      const dq = dist(q);
      if (dq <= TOL || dq >= EDGE_MAX) return; // seed-like pixels beyond a line are other areas
      mark[q] = 2;
      rimList[rn++] = q;
    };
    const around = (p) => {
      const px = p % W;
      if (px > 0) grow(p - 1);
      if (px < W - 1) grow(p + 1);
      if (p >= W) grow(p - W);
      if (p < N - W) grow(p + W);
    };
    const lo = minY * W;
    const hi = (maxY + 1) * W;
    for (let p = lo; p < hi; p++) if (mark[p] === 1) around(p);
    let from = 0;
    for (let step = 1; step < GROW; step++) {
      const to = rn;
      for (let i = from; i < to; i++) around(rimList[i]);
      from = to;
    }

    // Blend the rim first: it reads the original pixel, and rim pixels are never in the fill area.
    for (let i = 0; i < rn; i++) {
      const p = rimList[i];
      const w = 255 - Math.floor((dist(p) * 255) / EDGE_MAX);
      const j = p << 2;
      d[j] = Math.floor((d[j] * (255 - w) + r * w) / 255);
      d[j + 1] = Math.floor((d[j + 1] * (255 - w) + g * w) / 255);
      d[j + 2] = Math.floor((d[j + 2] * (255 - w) + b * w) / 255);
      d[j + 3] = 255;
    }
    for (let p = lo; p < hi; p++) {
      if (mark[p] !== 1) continue;
      const j = p << 2;
      d[j] = r; d[j + 1] = g; d[j + 2] = b; d[j + 3] = 255;
    }
    return count;
  }

  return { floodFill, TOL, GROW, EDGE_MAX };
});
