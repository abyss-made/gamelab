// Mini Golf screen: canvas hole, drag to aim, power slider, scorecard. The server plays each putt and sends the
// sampled path; this screen only replays it.
window.GameUI = window.GameUI || {};
GameUI.golf = (() => {
  const C = GameUI.common;
  const COLORS = ["#ff477b", "#4db8ff", "#ffcd2d", "#adff00", "#b48cff", "#ff9a3d"];
  let root = null;
  let app = null;
  let S = null;
  let g = null;
  let canvas = null;
  let ctx = null;
  let clock = null;
  let raf = 0;
  let aim = 0;
  let power = 50;
  let animKey = -1;
  let animT0 = 0;
  let busyUntil = 0;
  let holeKey = "";
  let dragging = false;
  let tickT = 0;

  const deg = (r) => ((((r * 180) / Math.PI) % 360) + 360) % 360;
  const colorOf = (i) => COLORS[i % COLORS.length];
  const me = () => (g ? g.players.findIndex((p) => p.id === S.you) : -1);
  const canPutt = () => g && g.phase === "play" && g.turnId === S.you && performance.now() >= busyUntil && !S.lastResult;

  function size() {
    const rect = canvas.getBoundingClientRect();
    return { rect, k: rect.width / g.size.w };
  }

  function fit() {
    if (!canvas || !g) return;
    const { rect } = size();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(rect.width * dpr);
    const ch = Math.round(((rect.width * g.size.h) / g.size.w) * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
  }

  function poly(c, pts) {
    c.beginPath();
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
  }

  function myBall() {
    return g.players.find((p) => p.id === S.you);
  }

  // Position of a player's ball right now (the mover's ball follows the replayed path).
  function ballAt(p, now) {
    const a = g.anim;
    if (a && a.shot === animKey && a.by === p.id) {
      const t = (now - animT0) / 1000;
      if (t < a.duration) {
        const fr = a.frames;
        let i = 0;
        while (i < fr.length - 2 && fr[i + 1][0] <= t) i++;
        const f0 = fr[i], f1 = fr[Math.min(i + 1, fr.length - 1)];
        const u = f1[0] > f0[0] ? Math.min(1, Math.max(0, (t - f0[0]) / (f1[0] - f0[0]))) : 0;
        if (f0[1] === null) return null;
        if (f1[1] === null) return { x: f0[1], y: f0[2] };
        return { x: f0[1] + (f1[1] - f0[1]) * u, y: f0[2] + (f1[2] - f0[2]) * u };
      }
      if (a.outcome === "cup") return null;
    }
    return { x: p.x, y: p.y };
  }

  function draw(now) {
    if (!canvas || !g || !g.hole) return;
    fit();
    const h = g.hole;
    const k = canvas.width / g.size.w;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.fillStyle = "#14502f";
    ctx.fillRect(0, 0, g.size.w, g.size.h);
    // fairway
    poly(ctx, h.poly);
    ctx.fillStyle = "#37b865";
    ctx.fill();
    ctx.save();
    poly(ctx, h.poly);
    ctx.clip();
    for (const z of h.sand) { ctx.fillStyle = "#e6cf8d"; ctx.fillRect(z.x, z.y, z.w, z.h); ctx.strokeStyle = "#c9ae66"; ctx.lineWidth = 2; ctx.strokeRect(z.x, z.y, z.w, z.h); }
    for (const z of h.water) { ctx.fillStyle = "#2f8fe0"; ctx.fillRect(z.x, z.y, z.w, z.h); ctx.strokeStyle = "#8cc8ff"; ctx.lineWidth = 2; ctx.strokeRect(z.x, z.y, z.w, z.h); }
    ctx.restore();
    ctx.lineJoin = "round";
    poly(ctx, h.poly);
    ctx.strokeStyle = "#a89868";
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = "#f2e8cf";
    ctx.lineWidth = 3;
    ctx.stroke();
    for (const w of h.walls) {
      poly(ctx, w);
      ctx.fillStyle = "#9a6636";
      ctx.fill();
      ctx.strokeStyle = "#5c3515";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    for (const b of h.bumpers) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, 7);
      ctx.fillStyle = "#adff00";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#030d17";
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.45, 0, 7);
      ctx.fillStyle = "#030d17";
      ctx.fill();
    }
    // tee and cup
    ctx.beginPath();
    ctx.arc(h.tee[0], h.tee[1], 9, 0, 7);
    ctx.fillStyle = "#ffffff30";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(h.cup[0], h.cup[1], h.cupR, 0, 7);
    ctx.fillStyle = "#030d17";
    ctx.fill();
    ctx.strokeStyle = "#f6f8fb";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(h.cup[0], h.cup[1]);
    ctx.lineTo(h.cup[0], h.cup[1] - 34);
    ctx.strokeStyle = "#f6f8fb";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(h.cup[0], h.cup[1] - 34);
    ctx.lineTo(h.cup[0] + 20, h.cup[1] - 27);
    ctx.lineTo(h.cup[0], h.cup[1] - 20);
    ctx.fillStyle = "#ff477b";
    ctx.fill();
    // balls
    const mineIdx = me();
    const t0 = ballAt(myBall() || { x: 0, y: 0 }, now);
    g.players.forEach((p, i) => {
      if (p.out) return;
      const pos = ballAt(p, now);
      if (!pos || (p.holed && !(g.anim && g.anim.by === p.id && g.anim.shot === animKey && now - animT0 < g.anim.duration * 1000))) return;
      ctx.beginPath();
      ctx.arc(pos.x + 1, pos.y + 2, h.ballR, 0, 7);
      ctx.fillStyle = "#0005";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, h.ballR, 0, 7);
      ctx.fillStyle = colorOf(i);
      ctx.fill();
      ctx.lineWidth = p.id === g.turnId ? 3 : 1.5;
      ctx.strokeStyle = p.id === g.turnId ? "#f6f8fb" : "#030d17";
      ctx.stroke();
    });
    // aim guide
    if (canPutt() && mineIdx >= 0 && t0) {
      const len = 40 + power * 1.6;
      ctx.save();
      ctx.setLineDash([9, 7]);
      ctx.strokeStyle = "#f6f8fb";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(t0.x, t0.y);
      ctx.lineTo(t0.x + Math.cos(aim) * len, t0.y + Math.sin(aim) * len);
      ctx.stroke();
      ctx.restore();
      const ex = t0.x + Math.cos(aim) * len, ey = t0.y + Math.sin(aim) * len;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - Math.cos(aim - 0.45) * 14, ey - Math.sin(aim - 0.45) * 14);
      ctx.lineTo(ex - Math.cos(aim + 0.45) * 14, ey - Math.sin(aim + 0.45) * 14);
      ctx.closePath();
      ctx.fillStyle = "#f6f8fb";
      ctx.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function loop() {
    draw(performance.now());
    raf = requestAnimationFrame(loop);
  }

  function toCourse(ev) {
    const { rect } = size();
    return { x: ((ev.clientX - rect.left) / rect.width) * g.size.w, y: ((ev.clientY - rect.top) / rect.height) * g.size.h };
  }

  function onPointer(ev) {
    if (!canPutt()) return;
    if (ev.type === "pointerdown") {
      dragging = true;
      canvas.setPointerCapture && canvas.setPointerCapture(ev.pointerId);
      canvas.focus({ preventScroll: true });
    }
    if (ev.type === "pointerup" || ev.type === "pointercancel") {
      dragging = false;
      return;
    }
    if (!dragging) return;
    ev.preventDefault();
    const b = myBall();
    const p = toCourse(ev);
    if (!b || Math.hypot(p.x - b.x, p.y - b.y) < 4) return;
    aim = Math.atan2(p.y - b.y, p.x - b.x);
    syncControls();
  }

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 gf";
    root.innerHTML = `<div class="b2-players card" id="gf-players"></div>
      <div class="ttt-status" id="gf-status" aria-live="polite"></div>
      <div class="gf-wrap"><canvas id="gf-canvas" class="gf-canvas" tabindex="0" role="application" aria-label="Mini golf hole. Drag to aim. Arrow keys fine tune the aim and power. Enter putts."></canvas></div>
      <div class="gf-between card" id="gf-between" hidden></div>
      <div class="gf-controls card" id="gf-controls">
        <label class="pl-slider"><span>Aim <b id="gf-aim-val"></b></span><input type="range" id="gf-aim" min="0" max="360" step="0.25" aria-label="Aim angle in degrees"></label>
        <label class="pl-slider"><span>Power <b id="gf-pow-val"></b></span><input type="range" id="gf-pow" min="3" max="100" step="1" aria-label="Putt power percent"></label>
        <div class="board-actions"><button type="button" class="btn" id="gf-putt">Putt</button></div>
      </div>
      <div class="gf-card card" id="gf-card"></div>`;
    stage.appendChild(root);
    canvas = root.querySelector("#gf-canvas");
    ctx = canvas.getContext("2d");
    clock = C.makeClock(() => root);
    for (const ev of ["pointerdown", "pointermove", "pointerup", "pointercancel"]) canvas.addEventListener(ev, onPointer);
    canvas.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 5 : 0.5;
      if (e.key === "ArrowLeft") aim -= (step * Math.PI) / 180;
      else if (e.key === "ArrowRight") aim += (step * Math.PI) / 180;
      else if (e.key === "ArrowUp") power = Math.min(100, power + (e.shiftKey ? 10 : 2));
      else if (e.key === "ArrowDown") power = Math.max(3, power - (e.shiftKey ? 10 : 2));
      else if (e.key === "Enter") return putt();
      else return;
      e.preventDefault();
      syncControls();
    });
    root.querySelector("#gf-aim").addEventListener("input", (e) => { aim = (Number(e.target.value) * Math.PI) / 180; syncControls(); });
    root.querySelector("#gf-pow").addEventListener("input", (e) => { power = Number(e.target.value); syncControls(); });
    root.querySelector("#gf-putt").addEventListener("click", putt);
    window.addEventListener("resize", fit);
    raf = requestAnimationFrame(loop);
  }

  function putt() {
    if (!canPutt()) return;
    app.socket.emit("action", { type: "putt", angle: aim, power: power / 100 });
    Sound.play("drop");
    busyUntil = performance.now() + 600;
    syncControls();
  }

  function syncControls() {
    if (!root || !g) return;
    const mine = canPutt();
    const aimEl = root.querySelector("#gf-aim");
    const powEl = root.querySelector("#gf-pow");
    aimEl.value = deg(aim).toFixed(2);
    powEl.value = power;
    root.querySelector("#gf-aim-val").textContent = Math.round(deg(aim)) + "°";
    root.querySelector("#gf-pow-val").textContent = power + "%";
    root.querySelector("#gf-controls").hidden = me() < 0;
    aimEl.disabled = !mine;
    powEl.disabled = !mine;
    root.querySelector("#gf-putt").disabled = !mine;
  }

  function scoreCard() {
    const holes = g.course.pars;
    const head = `<tr><th scope="col">Player</th>${holes.map((p, i) => `<th scope="col" class="${i === g.holeIndex ? "cur" : ""}">${i + 1}<small>par ${p}</small></th>`).join("")}<th scope="col">Total</th></tr>`;
    const rows = g.players
      .map((p, i) => {
        const cells = holes.map((_, h) => {
          const v = h === g.holeIndex && p.scores[h] === null ? (p.strokes ? `<i>${p.strokes}</i>` : "") : p.scores[h] === null ? "" : p.scores[h];
          return `<td class="${h === g.holeIndex ? "cur" : ""}">${v}</td>`;
        });
        return `<tr class="${p.id === S.you ? "me" : ""} ${p.out ? "out" : ""}"><th scope="row"><span class="gf-dot" style="background:${colorOf(i)}"></span>${app.esc(p.name)}</th>${cells.join("")}<td><b>${p.total}</b></td></tr>`;
      })
      .join("");
    return `<div class="gf-scroll"><table class="gf-table"><caption class="sr-only">Scorecard</caption><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
  }

  function statusText() {
    const turn = g.players.find((p) => p.id === g.turnId);
    const holeName = app.esc(g.hole.name);
    const head = `Hole ${g.holeIndex + 1}/${g.course.holes}: <b>${holeName}</b> · par ${g.hole.par}`;
    if (g.phase === "between") return `${head} · hole complete`;
    if (performance.now() < busyUntil) return `${head} · ball rolling...`;
    if (!turn) return head;
    const who = turn.id === S.you ? "<b>Your putt!</b> Drag on the course to aim, set power, then Putt." : `Waiting for <b>${app.esc(turn.name)}</b> (stroke ${turn.strokes + 1}).`;
    const l = g.last;
    const extra = l && l.outcome === "water" ? ' <span class="warn-text">Last ball went in the water (+1).</span>' : "";
    return `${head}<br>${who}${extra}`;
  }

  function paintText() {
    if (!root || !g) return;
    root.querySelector("#gf-players").innerHTML = g.players
      .map((p, i) => C.playerChip(app, p, { active: p.id === g.turnId, extra: `<span class="gf-dot" style="background:${colorOf(i)}" aria-hidden="true"></span>` + (p.id === g.turnId && g.timeLeft !== null ? '<span class="fr-timer" data-timer></span>' : ""), sub: p.out ? "Out" : p.holed ? `Holed in ${p.strokes}` : `${p.strokes} stroke${p.strokes === 1 ? "" : "s"}` }))
      .join("");
    const st = root.querySelector("#gf-status");
    st.innerHTML = statusText();
    st.className = "ttt-status" + (canPutt() ? " mine" : "");
    const bt = root.querySelector("#gf-between");
    if (g.phase === "between" && g.summary) {
      const rows = g.summary.map((s) => {
        const p = g.players.find((x) => x.id === s.id);
        if (!p || s.strokes === null) return "";
        const d = s.strokes - s.par;
        return `<li>${app.esc(p.name)}: <b>${s.strokes}</b> (${d === 0 ? "par" : d > 0 ? "+" + d : d})</li>`;
      });
      bt.hidden = false;
      bt.innerHTML = `<b>Hole ${g.holeIndex + 1} complete</b><ul>${rows.join("")}</ul><small class="muted">${g.holeIndex + 1 >= g.course.holes ? "Final results next..." : "Next hole starting..."}</small>`;
    } else {
      bt.hidden = true;
    }
    root.querySelector("#gf-card").innerHTML = scoreCard();
  }

  function update(state) {
    S = state;
    g = state.game;
    if (!g) return;
    clock.set(g.timeLeft);
    const key = g.course.id + ":" + g.holeIndex;
    if (key !== holeKey) {
      holeKey = key;
      const b = myBall();
      aim = b ? Math.atan2(g.hole.cup[1] - b.y, g.hole.cup[0] - b.x) : 0;
      animKey = -1;
    }
    const a = g.anim;
    if (a && a.shot !== animKey) {
      animKey = a.shot;
      animT0 = performance.now() - a.elapsedMs;
    }
    if (a) busyUntil = Math.max(busyUntil, performance.now() + Math.max(0, g.busyMs));
    else if (g.busyMs <= 0) busyUntil = 0;
    // aim at the cup by default when it becomes my turn
    if (g.turnId === S.you && !dragging && !(a && g.busyMs > 0)) {
      const b = myBall();
      if (b && !update.aimed) {
        aim = Math.atan2(g.hole.cup[1] - b.y, g.hole.cup[0] - b.x);
        update.aimed = true;
      }
    } else if (g.turnId !== S.you) update.aimed = false;
    paintText();
    syncControls();
    clearTimeout(tickT);
    const wait = busyUntil - performance.now();
    if (wait > 0) tickT = setTimeout(() => { paintText(); syncControls(); }, wait + 30);
  }

  function unmount() {
    cancelAnimationFrame(raf);
    clearTimeout(tickT);
    window.removeEventListener("resize", fit);
    if (clock) clock.stop();
    if (root) root.remove();
    root = null; canvas = null; ctx = null; g = null; animKey = -1; holeKey = ""; busyUntil = 0; update.aimed = false;
  }

  function renderResult(r, state, a) {
    const top = r.standings[0];
    const title = r.tie ? (r.winners.includes(state.you) ? "It's a tie, and you're in it!" : "It's a tie!") : r.winnerId === state.you ? "You win!" : `${a.esc(top ? top.name : "Someone")} wins!`;
    const rows = r.standings
      .map((p, i) => `<tr class="${p.id === state.you ? "me" : ""}"><th scope="row">${i + 1}. ${a.esc(p.name)}${p.out ? " (left)" : ""}</th>${r.pars.map((_, h) => `<td>${p.scores[h] === null ? "–" : p.scores[h]}</td>`).join("")}<td><b>${p.total}</b></td></tr>`)
      .join("");
    const head = `<tr><th scope="col">${a.esc(r.course)}</th>${r.pars.map((p, i) => `<th scope="col">${i + 1}<small>par ${p}</small></th>`).join("")}<th scope="col">Total</th></tr>`;
    return `<h2 class="result-title">${title}</h2><div class="gf-scroll"><table class="gf-table"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
  }

  function resultSound(r, state) {
    if (!r.winners.length || !state.you || !r.standings.some((p) => p.id === state.you)) return "reveal";
    return r.winners.includes(state.you) ? "win" : "lose";
  }

  return { mount, update, unmount, renderResult, resultSound, scoreLabel: "wins" };
})();
