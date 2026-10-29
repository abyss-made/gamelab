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

  const deg = (r) => ((((r * 180) / Math.PI) % 360) + 360) % 360;

  function geometry() {
    const t = g.table;
    const w = t.w + PAD * 2;
    const h = t.h + PAD * 2;
    const rect = canvas.getBoundingClientRect();
    const k = rect.width / w;
    return { t, w, h, k, rect };
  }

  function fit() {
    if (!canvas || !g) return;
    const { w, h, rect } = geometry();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(rect.width * dpr);
    const ch = Math.round((rect.width * h) / w * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
  }

  const canShoot = () => g && g.myIndex === g.turn && g.myIndex >= 0 && performance.now() >= busyUntil && !S.lastResult;

  function toTable(ev) {
    const { k, rect, t } = geometry();
    const x = ((ev.clientX - rect.left) / rect.width) * (t.w + PAD * 2) - PAD;
    const y = ((ev.clientY - rect.top) / rect.height) * (t.h + PAD * 2) - PAD;
    return { x, y };
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
      c.fillText(String(b.id), x, y + 0.5);
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
    const { t, w, h } = geometry();
    const k = canvas.width / w;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // rail
    ctx.fillStyle = "#5b3a1e";
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(0, 0, w, h, 26) : ctx.rect(0, 0, w, h);
    ctx.fill();
    ctx.strokeStyle = "#8a5a2c";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.translate(PAD, PAD);
    ctx.fillStyle = "#1f8a4c";
    ctx.fillRect(0, 0, t.w, t.h);
    ctx.strokeStyle = "#0f4f2b";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, t.w, t.h);
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
      ctx.arc(p.x, p.y, p.r * 0.82, 0, 7);
      ctx.fillStyle = "#050a0e";
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
      // cue stick
      const back = 26 + power * 1.3;
      ctx.strokeStyle = "#e8c48a";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(from.x - Math.cos(aim) * (t.r + 8 + (power / 100) * 40), from.y - Math.sin(aim) * (t.r + 8 + (power / 100) * 40));
      ctx.lineTo(from.x - Math.cos(aim) * (t.r + back + 150), from.y - Math.sin(aim) * (t.r + back + 150));
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
        <label class="pl-slider"><span>Aim <b id="pl-aim-val"></b></span><input type="range" id="pl-aim" min="0" max="360" step="0.25" aria-label="Aim angle in degrees"></label>
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
    root.querySelector("#pl-aim-val").textContent = Math.round(deg(aim)) + "°";
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
    if (busy && g.last) msg = "Balls are rolling...";
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
    root = null; canvas = null; ctx = null; g = null; animKey = -1; lastShot = -1; busyUntil = 0; cuePos = null; placing = true;
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
