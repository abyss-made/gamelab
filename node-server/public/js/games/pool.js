// Pool screen (8-ball): canvas table, drag to aim, sliders for fine aim and power, drag the cue ball when you have
// ball in hand. The server decides every shot; this screen only replays the path it sends.
window.GameUI = window.GameUI || {};
GameUI.pool = (() => {
  const C = GameUI.common;
  const PAD = 44;
  const COLORS = { 1: "#f6c90e", 2: "#2b6fe0", 3: "#e0393e", 4: "#7b3fb8", 5: "#f08a24", 6: "#1f9d57", 7: "#8a2a2a", 8: "#111", 9: "#f6c90e", 10: "#2b6fe0", 11: "#e0393e", 12: "#7b3fb8", 13: "#f08a24", 14: "#1f9d57", 15: "#8a2a2a" };
  let root = null;
  let app = null;
  let S = null;
  let g = null; // latest game view
  let canvas = null;
  let ctx = null;
  let clock = null;
  let raf = 0;
  let aim = 0; // radians
  let power = 55; // percent
  let placing = true;
  let cuePos = null; // chosen cue-ball spot while ball in hand
  let animKey = -1;
  let animT0 = 0;
  let busyUntil = 0;
  let lastShot = -1;
  let dragging = null;
  let pendingCue = null; // { aim, from, until }: cue shown at contact while the server resolves the shot

  // Phone portrait: draw the physical 1000x500 table rotated -90deg (head string at the bottom).
  // Only presentation changes; pointers are inverse-mapped back to physical table coordinates.
  const portrait = () => !!canvas && window.innerWidth < 700 && window.innerHeight > window.innerWidth;

  const deg = (r) => ((((r * 180) / Math.PI) % 360) + 360) % 360;

  function geometry() {
    const t = g.table;
    const w = t.w + PAD * 2;
    const h = t.h + PAD * 2;
    const rect = canvas.getBoundingClientRect();
    const rot = portrait();
    const k = rect.width / (rot ? h : w);
    return { t, w, h, k, rect, rot };
  }

  function fit() {
    if (!canvas || !g) return;
    const rot = portrait();
    const { w, h } = geometry();
    canvas.classList.toggle("portrait", rot);
    if (rot) {
      // fit the tall table into the viewport height left for it
      const wrapW = canvas.parentElement.clientWidth;
      const maxH = Math.max(320, window.innerHeight * 0.6);
      canvas.style.width = `${Math.min(wrapW, (maxH * h) / w)}px`;
    } else canvas.style.width = "";
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(rect.width * dpr);
    const ch = Math.round((rot ? (rect.width * w) / h : (rect.width * h) / w) * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
  }

  const canShoot = () => g && g.myIndex === g.turn && g.myIndex >= 0 && performance.now() >= busyUntil && !S.lastResult;

  // Screen point -> physical table coordinates (inverse of the draw transform).
  function toTable(ev) {
    const { rect, t, w, h, rot } = geometry();
    const sx = (ev.clientX - rect.left) / rect.width;
    const sy = (ev.clientY - rect.top) / rect.height;
    if (rot) return { x: w - sy * w - PAD, y: sx * h - PAD };
    return { x: sx * w - PAD, y: sy * h - PAD };
  }

  function cueBall() {
    return g.balls.find((b) => b.id === 0);
  }

  function legalSpot(x, y) {
    const t = g.table;
    if (x < t.r || x > t.w - t.r || y < t.r || y > t.h - t.r) return false;
    if (g.breakShot && x > t.headX) return false;
    for (const p of t.pockets) if (Math.hypot(x - p.x, y - p.y) < p.r + t.r * 0.5) return false;
    for (const b of g.balls) if (b.id !== 0 && !b.gone && Math.hypot(b.x - x, b.y - y) < 2 * t.r + 0.5) return false;
    return true;
  }

  function cueXY() {
    if (g.inHand && cuePos) return cuePos;
    const c = cueBall();
    return c && !c.gone ? { x: c.x, y: c.y } : { x: g.table.headX, y: g.table.h / 2 };
  }

  // Ball positions to draw at the current moment (replaying the shot if one is running).
  function currentBalls(now) {
    const a = g.anim;
    if (!a || a.shot !== animKey) return { balls: g.balls, moving: false };
    const t = (now - animT0) / 1000;
    if (t >= a.duration) return { balls: g.balls, moving: false };
    const fr = a.frames;
    let i = 0;
    while (i < fr.length - 2 && fr[i + 1][0] <= t) i++;
    const f0 = fr[i];
    const f1 = fr[Math.min(i + 1, fr.length - 1)];
    const u = f1[0] > f0[0] ? Math.min(1, Math.max(0, (t - f0[0]) / (f1[0] - f0[0]))) : 0;
    const pos = {};
    a.ids.forEach((id, n) => {
      const x0 = f0[1 + n * 2], y0 = f0[2 + n * 2], x1 = f1[1 + n * 2], y1 = f1[2 + n * 2];
      pos[id] = x0 === null ? null : x1 === null ? { x: x0, y: y0 } : { x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u };
    });
    return { balls: g.balls.map((b) => (b.id in pos ? (pos[b.id] ? { ...b, ...pos[b.id], gone: false } : { ...b, gone: true }) : b)), moving: true };
  }

  let labelRot = 0;
  function drawBall(c, b, r) {
    const x = b.x, y = b.y;
    c.save();
    c.beginPath();
    c.arc(x + 1.5, y + 2.5, r, 0, 7);
    c.fillStyle = "#0006";
    c.fill();
    c.beginPath();
    c.arc(x, y, r, 0, 7);
    c.fillStyle = b.id === 0 ? "#f6f8fb" : b.id > 8 ? "#f6f8fb" : COLORS[b.id];
    c.fill();
    if (b.id > 8) {
      c.save();
      c.beginPath();
      c.arc(x, y, r, 0, 7);
      c.clip();
      c.fillStyle = COLORS[b.id];
      c.fillRect(x - r, y - r * 0.55, r * 2, r * 1.1);
      c.restore();
    }
    if (b.id !== 0) {
      c.beginPath();
      c.arc(x, y, r * 0.5, 0, 7);
      c.fillStyle = "#f6f8fb";
      c.fill();
      c.fillStyle = "#111";
      c.font = `700 ${r * 0.72}px Arial, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.save();
      c.translate(x, y);
      if (labelRot) c.rotate(labelRot);
      c.fillText(String(b.id), 0, 0.5);
      c.restore();
    }
    c.beginPath();
    c.arc(x - r * 0.32, y - r * 0.34, r * 0.22, 0, 7);
    c.fillStyle = "#ffffff80";
    c.fill();
    c.lineWidth = 1;
    c.strokeStyle = "#0008";
    c.beginPath();
    c.arc(x, y, r, 0, 7);
    c.stroke();
    c.restore();
  }

  // Where the cue ball would first touch another ball along the aim line (for the guide).
  function firstHit(from, ang) {
    const t = g.table;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let best = null;
    for (const b of g.balls) {
      if (b.id === 0 || b.gone) continue;
      const fx = b.x - from.x, fy = b.y - from.y;
      const proj = fx * dx + fy * dy;
      if (proj <= 0) continue;
      const d2 = fx * fx + fy * fy - proj * proj;
      const rr = (2 * t.r) ** 2;
      if (d2 > rr) continue;
      const hit = proj - Math.sqrt(rr - d2);
      if (hit > 0 && (!best || hit < best.d)) best = { d: hit, ball: b };
    }
    // rail distance
    let rail = 1e9;
    if (dx > 1e-9) rail = Math.min(rail, (t.w - t.r - from.x) / dx);
    if (dx < -1e-9) rail = Math.min(rail, (t.r - from.x) / dx);
    if (dy > 1e-9) rail = Math.min(rail, (t.h - t.r - from.y) / dy);
    if (dy < -1e-9) rail = Math.min(rail, (t.r - from.y) / dy);
    if (best && best.d < rail) return { x: from.x + dx * best.d, y: from.y + dy * best.d, ball: best.ball };
    return { x: from.x + dx * rail, y: from.y + dy * rail, ball: null };
  }

  function draw(now) {
    if (!canvas || !g) return;
    fit();
    const { t, w, h, rot } = geometry();
    const k = canvas.width / (rot ? h : w);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, rot ? h : w, rot ? w : h);
    if (rot) { ctx.translate(0, w); ctx.rotate(-Math.PI / 2); }
    labelRot = rot ? Math.PI / 2 : 0;
    drawTable(t, w, h);
    if (g.breakShot || (g.inHand && placing)) {
      ctx.strokeStyle = "#ffffff30";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t.headX, 0);
      ctx.lineTo(t.headX, t.h);
      ctx.stroke();
    }
    for (const p of t.pockets) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.82 + 5, 0, 7);
      ctx.fillStyle = "#9c7a45";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.82, 0, 7);
      const pg = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
      pg.addColorStop(0, "#000");
      pg.addColorStop(1, "#14110d");
      ctx.fillStyle = pg;
      ctx.fill();
    }
    const cur = currentBalls(now);
    const mine = canShoot();
    // guide
    if (mine && !cur.moving && !(g.inHand && placing)) {
      const from = cueXY();
      const hit = firstHit(from, aim);
      ctx.save();
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = "#f6f8fbcc";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(hit.x, hit.y);
      ctx.stroke();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(hit.x, hit.y, t.r, 0, 7);
      ctx.strokeStyle = "#adff00";
      ctx.lineWidth = 2;
      ctx.stroke();
      // cue stick: follows the aim and draws back with power
      const near = t.r + 8 + (power / 100) * 40;
      const far = near + 230;
      const cx = Math.cos(aim), cy = Math.sin(aim);
      const cg = ctx.createLinearGradient(from.x - cx * near, from.y - cy * near, from.x - cx * far, from.y - cy * far);
      cg.addColorStop(0, "#f3ead6");
      cg.addColorStop(0.04, "#e8c48a");
      cg.addColorStop(0.7, "#c79a5b");
      cg.addColorStop(1, "#5a3a22");
      ctx.strokeStyle = cg;
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(from.x - cx * near, from.y - cy * near);
      ctx.lineTo(from.x - cx * far, from.y - cy * far);
      ctx.stroke();
    }
    if (pendingCue && performance.now() < pendingCue.until && !cur.moving) {
      // accepted-but-unresolved: the cue rests at contact, no predicted result
      const { from, aim: a0 } = pendingCue;
      ctx.strokeStyle = "#c9a26799";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(from.x - Math.cos(a0) * (t.r + 3), from.y - Math.sin(a0) * (t.r + 3));
      ctx.lineTo(from.x - Math.cos(a0) * (t.r + 180), from.y - Math.sin(a0) * (t.r + 180));
      ctx.stroke();
    }
    const handCue = g.inHand && mine && !cur.moving; // the shooter's cue ball is drawn at its chosen spot
    for (const b of cur.balls) {
      if (b.gone || (b.id === 0 && handCue)) continue;
      drawBall(ctx, b, t.r);
    }
    if (handCue) {
      const c = cueXY();
      drawBall(ctx, { id: 0, x: c.x, y: c.y }, t.r);
      ctx.beginPath();
      ctx.arc(c.x, c.y, t.r + 5, 0, 7);
      ctx.strokeStyle = legalSpot(c.x, c.y) ? "#adff00" : "#ff477b";
      ctx.lineWidth = 3;
      ctx.setLineDash(placing ? [6, 4] : []);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // Walnut rail, brass diamonds, jewel-green cloth (material only; geometry is the server's table).
  function drawTable(t, w, h) {
    const wood = ctx.createLinearGradient(0, 0, 0, h);
    wood.addColorStop(0, "#9a6a3f");
    wood.addColorStop(0.5, "#7a4f2c");
    wood.addColorStop(1, "#5e3a1f");
    ctx.fillStyle = wood;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(0, 0, w, h, 30) : ctx.rect(0, 0, w, h);
    ctx.fill();
    ctx.strokeStyle = "#d8b98a66";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#2b1a0e";
    ctx.lineWidth = 1;
    for (let i = 6; i < h; i += 9) { ctx.beginPath(); ctx.moveTo(8, i); ctx.bezierCurveTo(w * 0.3, i + 3, w * 0.6, i - 3, w - 8, i + 1); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = "#e8cf8f";
    for (let i = 1; i < 8; i++) {
      if (i === 4) continue;
      const x = PAD + (t.w * i) / 8;
      for (const y of [PAD / 2, h - PAD / 2]) { ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 4, y); ctx.fill(); }
    }
    for (let i = 1; i < 4; i++) {
      const y = PAD + (t.h * i) / 4;
      for (const x of [PAD / 2, w - PAD / 2]) { ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 4, y); ctx.fill(); }
    }
    ctx.translate(PAD, PAD);
    ctx.fillStyle = "#2f8b5f";
    ctx.fillRect(-10, -10, t.w + 20, t.h + 20);
    const cloth = ctx.createRadialGradient(t.w / 2, t.h * 0.45, 20, t.w / 2, t.h / 2, t.w * 0.62);
    cloth.addColorStop(0, "#1f7a6a");
    cloth.addColorStop(1, "#0b4a43");
    ctx.fillStyle = cloth;
    ctx.fillRect(0, 0, t.w, t.h);
    ctx.strokeStyle = "#0a3a33";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, t.w, t.h);
  }

  function loop(now) {
    draw(performance.now());
    raf = requestAnimationFrame(loop);
  }

  function aimFrom(ev) {
    const p = toTable(ev);
    const from = cueXY();
    const dx = p.x - from.x, dy = p.y - from.y;
    if (Math.hypot(dx, dy) < 4) return;
    aim = Math.atan2(dy, dx);
    syncControls();
  }

  function onPointer(ev) {
    if (!canShoot()) return;
    if (ev.type === "pointerdown") {
      canvas.setPointerCapture && canvas.setPointerCapture(ev.pointerId);
      dragging = true;
      canvas.focus({ preventScroll: true });
    }
    if (!dragging) return;
    if (ev.type === "pointerup" || ev.type === "pointercancel") {
      dragging = false;
      return;
    }
    ev.preventDefault();
    if (g.inHand && placing) {
      const p = toTable(ev);
      const t = g.table;
      const x = Math.min(g.breakShot ? t.headX : t.w - t.r, Math.max(t.r, p.x));
      const y = Math.min(t.h - t.r, Math.max(t.r, p.y));
      cuePos = { x, y };
      syncControls();
    } else {
      aimFrom(ev);
    }
  }

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 pl";
    root.innerHTML = `<div class="b2-players card" id="pl-players"></div>
      <div class="ttt-status" id="pl-status" aria-live="polite"></div>
      <div class="pl-wrap"><canvas id="pl-canvas" class="pl-canvas" tabindex="0" role="application" aria-label="Pool table. Drag to aim. Arrow keys fine tune the aim and power. Enter shoots."></canvas></div>
      <div class="pl-controls card" id="pl-controls">
        <div class="pl-slider pl-fine"><span>Aim <b id="pl-aim-val"></b></span><div class="pl-fine-row"><button type="button" class="btn btn-ghost btn-small" data-fine="-1" aria-label="Aim half a degree left">−</button><input type="range" id="pl-aim" min="0" max="360" step="0.25" aria-label="Aim angle in degrees"><button type="button" class="btn btn-ghost btn-small" data-fine="1" aria-label="Aim half a degree right">+</button></div></div>
        <label class="pl-slider"><span>Power <b id="pl-pow-val"></b></span><input type="range" id="pl-pow" min="3" max="100" step="1" aria-label="Shot power percent"></label>
        <div class="board-actions">
          <button type="button" class="btn" id="pl-shoot">Shoot</button>
          <button type="button" class="btn btn-ghost" id="pl-place" hidden>Lock cue ball</button>
          <button type="button" class="btn btn-small btn-ghost" id="pl-resign">Resign</button>
        </div>
      </div>
      <p class="muted center pl-help" id="pl-help"></p>`;
    stage.appendChild(root);
    canvas = root.querySelector("#pl-canvas");
    ctx = canvas.getContext("2d");
    clock = C.makeClock(() => root);
    for (const ev of ["pointerdown", "pointermove", "pointerup", "pointercancel"]) canvas.addEventListener(ev, onPointer);
    canvas.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 5 : 0.5;
      if (e.key === "ArrowLeft") aim -= (step * Math.PI) / 180;
      else if (e.key === "ArrowRight") aim += (step * Math.PI) / 180;
      else if (e.key === "ArrowUp") power = Math.min(100, power + (e.shiftKey ? 10 : 2));
      else if (e.key === "ArrowDown") power = Math.max(3, power - (e.shiftKey ? 10 : 2));
      else if (e.key === "Enter") return shoot();
      else return;
      e.preventDefault();
      syncControls();
    });
    root.querySelector("#pl-aim").addEventListener("input", (e) => { aim = (Number(e.target.value) * Math.PI) / 180; syncControls(true); });
    root.querySelector("#pl-pow").addEventListener("input", (e) => { power = Number(e.target.value); syncControls(true); });
    root.querySelector("#pl-shoot").addEventListener("click", shoot);
    root.querySelectorAll("[data-fine]").forEach((b) => b.addEventListener("click", (e) => {
      if (!canShoot()) return;
      aim += (Number(b.dataset.fine) * (e.shiftKey ? 5 : 0.5) * Math.PI) / 180;
      syncControls();
    }));
    root.querySelector("#pl-place").addEventListener("click", () => {
      if (!cuePos || !legalSpot(cuePos.x, cuePos.y)) return;
      placing = !placing;
      syncControls();
    });
    root.querySelector("#pl-resign").addEventListener("click", (e) => {
      const r = e.currentTarget;
      if (r.dataset.armed) {
        app.socket.emit("action", { type: "resign" });
      } else {
        r.dataset.armed = "1";
        r.textContent = "Tap again to resign";
        setTimeout(() => { if (r.isConnected) { delete r.dataset.armed; r.textContent = "Resign"; } }, 3000);
      }
    });
    window.addEventListener("resize", fit);
    raf = requestAnimationFrame(loop);
  }

  function shoot() {
    if (!canShoot()) return;
    const msg = { type: "shoot", angle: aim, power: power / 100 };
    if (g.inHand) {
      if (!cuePos || !legalSpot(cuePos.x, cuePos.y)) { placing = true; syncControls(); return; }
      msg.place = { x: cuePos.x, y: cuePos.y };
    }
    app.socket.emit("action", msg);
    pendingCue = { aim, from: cueXY(), until: performance.now() + 1500 };
    Sound.play("drop");
    // lock controls until the server's reply arrives
    busyUntil = performance.now() + 600;
    syncControls();
  }

  function syncControls() {
    if (!root || !g) return;
    const mine = canShoot();
    const aimEl = root.querySelector("#pl-aim");
    const powEl = root.querySelector("#pl-pow");
    aimEl.value = deg(aim).toFixed(2);
    powEl.value = power;
    root.querySelector("#pl-aim-val").textContent = deg(aim).toFixed(1) + "°";
    root.querySelectorAll("[data-fine]").forEach((b) => { b.disabled = !mine; });
    root.querySelector("#pl-pow-val").textContent = power + "%";
    const ctrls = root.querySelector("#pl-controls");
    ctrls.hidden = g.myIndex < 0;
    for (const el of [aimEl, powEl]) el.disabled = !mine;
    const shootBtn = root.querySelector("#pl-shoot");
    shootBtn.disabled = !mine || (g.inHand && placing);
    shootBtn.textContent = g.inHand && placing ? "Lock cue ball first" : "Shoot";
    const place = root.querySelector("#pl-place");
    place.hidden = !(mine && g.inHand);
    place.textContent = placing ? "Lock cue ball" : "Move cue ball";
    place.disabled = placing && !(cuePos && legalSpot(cuePos.x, cuePos.y));
    root.querySelector("#pl-resign").hidden = g.myIndex < 0;
  }

  function statusText() {
    const me = g.myIndex;
    const turnName = app.esc(g.players[g.turn].name);
    const busy = performance.now() < busyUntil;
    let msg;
    if (busy && g.last) msg = "Shot in motion…";
    else if (me < 0) msg = `You're watching. <b>${turnName}</b> is up${g.inHand ? " with ball in hand" : ""}.`;
    else if (me === g.turn) msg = g.inHand ? (placing ? `<b>Ball in hand!</b> Drag the cue ball${g.breakShot ? " behind the line" : ""}, then tap Lock cue ball.` : "<b>Your shot!</b> Drag on the table to aim, set power, then Shoot.") : "<b>Your shot!</b> Drag on the table to aim, set power, then Shoot.";
    else msg = `Waiting for <b>${turnName}</b>...`;
    const l = g.last;
    if (l && !busy && l.foul) {
      const by = app.esc((g.players.find((p) => p.id === l.by) || {}).name || "");
      msg += ` <span class="warn-text">Foul by ${by}: ${{ scratch: "scratch", "no-contact": "missed every ball", "wrong-ball": "wrong ball first", "no-rail": "no rail or pocket" }[l.foul]}.</span>`;
    }
    return msg;
  }

  function paintText() {
    if (!root || !g) return;
    root.querySelector("#pl-players").innerHTML = g.players
      .map((p, i) => C.playerChip(app, p, { active: g.turn === i, extra: g.turn === i && g.timeLeft !== null ? '<span class="fr-timer" data-timer></span>' : "", sub: p.group ? `${p.group === "solids" ? "Solids (1–7)" : "Stripes (9–15)"} · ${p.left} left` : "Table open" }))
      .join("");
    const st = root.querySelector("#pl-status");
    st.innerHTML = statusText();
    st.className = "ttt-status" + (canShoot() ? " mine" : "");
    root.querySelector("#pl-help").textContent = g.myIndex >= 0 ? "Pocket all of your group, then the 8-ball. Hitting the wrong ball first or missing everything is a foul." : "";
  }

  function update(state) {
    S = state;
    g = state.game;
    if (!g) return;
    clock.set(g.timeLeft);
    const a = g.anim;
    if (a && a.shot !== animKey) {
      pendingCue = null;
      animKey = a.shot;
      animT0 = performance.now() - a.elapsedMs;
      if (lastShot >= 0) Sound.play("drop");
    }
    if (a) busyUntil = Math.max(busyUntil, performance.now() + Math.max(0, g.busyMs));
    else if (g.busyMs <= 0) busyUntil = 0;
    if (g.shots !== lastShot) {
      lastShot = g.shots;
      placing = true;
      cuePos = null;
    }
    if (g.inHand && !cuePos) {
      const t = g.table;
      const tries = [[t.headX - 60, t.h / 2], [t.headX - 100, t.h / 2 - 80], [t.headX - 100, t.h / 2 + 80], [t.w / 2, t.h / 2], [t.r * 3, t.r * 3]];
      const c = tries.find(([x, y]) => legalSpot(x, y)) || tries[0];
      cuePos = { x: c[0], y: c[1] };
    }
    if (g.myIndex === g.turn && !g.inHand && aim === 0) {
      const c = cueBall();
      const nearest = g.balls.filter((b) => b.id !== 0 && !b.gone).sort((p, q) => Math.hypot(p.x - c.x, p.y - c.y) - Math.hypot(q.x - c.x, q.y - c.y))[0];
      if (nearest && c) aim = Math.atan2(nearest.y - c.y, nearest.x - c.x);
    }
    paintText();
    syncControls();
    // re-enable controls and text when the replay finishes
    clearTimeout(update.t);
    const wait = busyUntil - performance.now();
    if (wait > 0) update.t = setTimeout(() => { paintText(); syncControls(); }, wait + 30);
  }

  function unmount() {
    cancelAnimationFrame(raf);
    clearTimeout(update.t);
    window.removeEventListener("resize", fit);
    if (clock) clock.stop();
    if (root) root.remove();
    root = null; canvas = null; ctx = null; g = null; pendingCue = null; animKey = -1; lastShot = -1; busyUntil = 0; cuePos = null; placing = true;
  }

  function renderResult(r, state, a) {
    const w = r.players.find((p) => p.id === r.winnerId);
    const title = r.winnerId === state.you ? "You win!" : `${a.esc(w ? w.name : "Someone")} wins!`;
    const why = { eight: "Sank the 8-ball to finish the table.", "eight-early": "The other player pocketed the 8-ball too soon.", "eight-foul": "The other player fouled while pocketing the 8-ball.", "eight-scratch": "The other player scratched on the 8-ball.", resign: "Won by resignation.", time: "Won on time.", abandoned: "The other player left." }[r.reason] || "";
    const rows = r.players.map((p) => `${a.esc(p.name)} (${p.group || "no group"}) <b>${p.left}</b> left`).join(" · ");
    const next = r.nextUp ? `<p class="center next-up">Winner stays: <b>${a.esc(r.nextUp)}</b> plays next.</p>` : "";
    return `<h2 class="result-title">${title}</h2><p class="muted center">${why}</p><p class="center">${rows}</p>${next}`;
  }

  function resultSound(r, state) {
    if (!r.players.some((p) => p.id === state.you)) return "reveal";
    return r.winnerId === state.you ? "win" : "lose";
  }

  return { mount, update, unmount, renderResult, resultSound, scoreLabel: "wins" };
})();
