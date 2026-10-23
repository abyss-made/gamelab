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

    const dist = (p) => Math.max(Math.abs(d[p * 4] - tr), Math.abs(d[p * 4 + 1] - tg), Math.abs(d[p * 4 + 2] - tb));
    const region = new Uint8Array(W * H); // 1 = in the fill area
    const ok = (p) => !region[p] && dist(p) <= TOL;

    // Scanline fill. `region` doubles as the visited set; a stack of [x, y] pairs bounds memory.
    const stack = [x, y];
    let count = 0;
    while (stack.length) {
      const cy = stack.pop();
      const cx = stack.pop();
      if (!ok(cy * W + cx)) continue;
      let lx = cx;
      while (lx > 0 && ok(cy * W + lx - 1)) lx--;
      let rx = cx;
      while (rx < W - 1 && ok(cy * W + rx + 1)) rx++;
      let up = false;
      let down = false;
      for (let xx = lx; xx <= rx; xx++) {
        const p = cy * W + xx;
        region[p] = 1;
        count++;
        if (cy > 0) {
          const q = ok(p - W);
          if (q && !up) stack.push(xx, cy - 1);
          up = q;
        }
        if (cy < H - 1) {
          const q = ok(p + W);
          if (q && !down) stack.push(xx, cy + 1);
          down = q;
        }
      }
    }

    // Grow into the anti-aliased rim of nearby lines (never past it): those pixels get the fill
    // blended in by how close they are to the original color, so the line stays crisp, with no halo.
    let frontier = [];
    for (let p = 0; p < W * H; p++) if (region[p]) frontier.push(p);
    const edge = []; // [pixel, weight 0..255]
    const rim = new Uint8Array(W * H);
    for (let step = 0; step < GROW; step++) {
      const next = [];
      for (const p of frontier) {
        const px = p % W;
        const nb = [px > 0 ? p - 1 : -1, px < W - 1 ? p + 1 : -1, p >= W ? p - W : -1, p < W * (H - 1) ? p + W : -1];
        for (const q of nb) {
          if (q < 0 || region[q] || rim[q]) continue;
          const dq = dist(q);
          if (dq <= TOL || dq >= EDGE_MAX) continue; // seed-like pixels beyond a line are other areas
          rim[q] = 1;
          edge.push(q, 255 - Math.floor((dq * 255) / EDGE_MAX));
          next.push(q);
        }
      }
      frontier = next;
    }

    for (let p = 0; p < W * H; p++) {
      if (!region[p]) continue;
      d[p * 4] = r; d[p * 4 + 1] = g; d[p * 4 + 2] = b; d[p * 4 + 3] = 255;
    }
    for (let i = 0; i < edge.length; i += 2) {
      const p = edge[i];
      const w = edge[i + 1];
      d[p * 4] = Math.floor((d[p * 4] * (255 - w) + r * w) / 255);
      d[p * 4 + 1] = Math.floor((d[p * 4 + 1] * (255 - w) + g * w) / 255);
      d[p * 4 + 2] = Math.floor((d[p * 4 + 2] * (255 - w) + b * w) / 255);
      d[p * 4 + 3] = 255;
    }
    return count;
  }

  return { floodFill, TOL, GROW, EDGE_MAX };
});
