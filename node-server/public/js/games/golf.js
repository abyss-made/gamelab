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
  let placing = false;
  let teeDraft = null;
  let animKey = -1;
  let animT0 = 0;
  let busyUntil = 0;
  let holeKey = "";
  let dragging = false;
  let tickT = 0;
  let loupe = null; // {x,y} screen-space finger while aiming: temporary 2D magnifier of the same course
  let decoKey = "";
  let deco = [];

  // Phone portrait: rotate the unchanged 700x440 course -90deg to fill the screen; input is inverse-mapped.
  const portrait = () => !!canvas && window.innerWidth < 700 && window.innerHeight > window.innerWidth;

  const deg = (r) => ((((r * 180) / Math.PI) % 360) + 360) % 360;
  const colorOf = (i) => COLORS[i % COLORS.length];
  const me = () => (g ? g.players.findIndex((p) => p.id === S.you) : -1);
  const canPutt = () => g && g.phase === "play" && g.turnId === S.you && performance.now() >= busyUntil && !S.lastResult;

  function size() {
    const rect = canvas.getBoundingClientRect();
    const rot = portrait();
    return { rect, rot, k: rect.width / (rot ? g.size.h : g.size.w) };
  }

  function fit() {
    if (!canvas || !g) return;
    const rot = portrait();
    canvas.classList.toggle("portrait", rot);
    if (rot) {
      const maxH = Math.max(320, window.innerHeight * 0.6);
      canvas.style.width = `${Math.min(canvas.parentElement.clientWidth, (maxH * g.size.h) / g.size.w)}px`;
    } else canvas.style.width = "";
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(rect.width * dpr);
    const ch = Math.round((rot ? (rect.width * g.size.w) / g.size.h : (rect.width * g.size.h) / g.size.w) * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
  }

  // ---- botanical decoration: placed only outside the playable polygon, never collides ----
  function inPoly(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function edgeDist(x, y, pts) {
    let d = 1e9;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [ax, ay] = pts[j], [bx, by] = pts[i];
      const vx = bx - ax, vy = by - ay;
      const u = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1)));
      d = Math.min(d, Math.hypot(x - ax - u * vx, y - ay - u * vy));
    }
    return d;
  }
  function buildDeco(h) {
    const out = [];
    let seed = 7;
    for (const ch of h.name || "") seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) % 1000) / 1000;
    for (let y = 34; y < g.size.h - 20; y += 66)
      for (let x = 34; x < g.size.w - 20; x += 76) {
        const px = x + (rnd() - 0.5) * 26, py = y + (rnd() - 0.5) * 22;
        if (inPoly(px, py, h.poly)) continue;
        const d = edgeDist(px, py, h.poly);
        if (d < 26) continue;
        const kind = rnd();
        if (kind < 0.3 && d > 34) out.push({ t: "tree", x: px, y: py, r: Math.min(d - 10, 16 + rnd() * 9) });
        else if (kind < 0.5) out.push({ t: "flowers", x: px, y: py, c: ["#f3a6c0", "#fff2b8", "#e8c3ff"][Math.floor(rnd() * 3)] });
      }
    return out;
  }
  function drawDeco(c) {
    for (const d of deco) {
      if (d.t === "tree") {
        c.beginPath(); c.arc(d.x + 3, d.y + 5, d.r, 0, 7); c.fillStyle = "#0b2e2655"; c.fill();
        c.beginPath(); c.arc(d.x, d.y, d.r, 0, 7); c.fillStyle = "#2f7a46"; c.fill();
        c.beginPath(); c.arc(d.x - d.r * 0.25, d.y - d.r * 0.25, d.r * 0.62, 0, 7); c.fillStyle = "#4f9a52"; c.fill();
        c.beginPath(); c.moveTo(d.x - d.r * 0.5, d.y); c.quadraticCurveTo(d.x, d.y - d.r * 0.5, d.x + d.r * 0.4, d.y - d.r * 0.2); c.strokeStyle = "#9fd07a66"; c.lineWidth = 1.5; c.stroke();
      } else {
        c.fillStyle = "#3d7a3a"; c.beginPath(); c.ellipse(d.x, d.y, 14, 7, 0, 0, 7); c.fill();
        c.fillStyle = d.c;
        for (const [ox, oy] of [[-8, -1], [-3, 2], [3, -2], [8, 1]]) { c.beginPath(); c.arc(d.x + ox, d.y + oy, 2.6, 0, 7); c.fill(); }
      }
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
    const path = a && (a.by === p.id ? a.frames : a.paths?.[p.id]);
    if (a && a.shot === animKey && path) {
      const t = (now - animT0) / 1000;
      if (t < a.duration) {
        const fr = path;
        let i = 0;
        while (i < fr.length - 2 && fr[i + 1][0] <= t) i++;
        const f0 = fr[i], f1 = fr[Math.min(i + 1, fr.length - 1)];
        const u = f1[0] > f0[0] ? Math.min(1, Math.max(0, (t - f0[0]) / (f1[0] - f0[0]))) : 0;
        if (f0[1] === null) return null;
        if (f1[1] === null) return { x: f0[1], y: f0[2] };
        return { x: f0[1] + (f1[1] - f0[1]) * u, y: f0[2] + (f1[2] - f0[2]) * u };
      }
      if (p.holed) return null;
    }
    return { x: p.x, y: p.y };
  }

  function draw(now) {
    if (!canvas || !g || !g.hole) return;
    fit();
    const h = g.hole;
    if (decoKey !== holeKey) { decoKey = holeKey; deco = buildDeco(h); }
    const rot = portrait();
    const k = canvas.width / (rot ? g.size.h : g.size.w);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    if (rot) { ctx.translate(0, g.size.w); ctx.rotate(-Math.PI / 2); }
    scene(now);
    // thumb loupe: magnified mirror of the same course around the ball while the finger is down
    const b = myBall();
    if (loupe && b && canPutt()) {
      const R = 62, Z = 2.1;
      const lx = b.x < g.size.w / 2 ? g.size.w - R - 14 : R + 14, ly = R + 14;
      ctx.save();
      ctx.beginPath(); ctx.arc(lx, ly, R, 0, 7); ctx.fillStyle = "#0a2a22"; ctx.fill(); ctx.clip();
      ctx.translate(lx, ly); ctx.scale(Z, Z); ctx.translate(-b.x, -b.y);
      scene(now);
      ctx.restore();
      ctx.beginPath(); ctx.arc(lx, ly, R, 0, 7); ctx.strokeStyle = "#f2e8cf"; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function scene(now) {
    const h = g.hole;
    const lawn = ctx.createLinearGradient(0, 0, 0, g.size.h);
    lawn.addColorStop(0, "#88bd5e");
    lawn.addColorStop(1, "#588b43");
    ctx.fillStyle = lawn;
    ctx.fillRect(-400, -400, g.size.w + 800, g.size.h + 800);
    drawDeco(ctx);
    // fairway with mowing stripes
    poly(ctx, h.poly);
    ctx.fillStyle = "#4fae5d";
    ctx.fill();
    ctx.save();
    poly(ctx, h.poly);
    ctx.clip();
    ctx.fillStyle = "#ffffff10";
    for (let x = 0; x < g.size.w; x += 44) ctx.fillRect(x, 0, 22, g.size.h);
    const cupGlow = ctx.createRadialGradient(h.cup[0], h.cup[1], 4, h.cup[0], h.cup[1], 70);
    cupGlow.addColorStop(0, "#7fd07a55");
    cupGlow.addColorStop(1, "#7fd07a00");
    ctx.fillStyle = cupGlow;
    ctx.fillRect(h.cup[0] - 70, h.cup[1] - 70, 140, 140);
    for (const z of h.sand) { ctx.fillStyle = "#ead7a0"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(z.x, z.y, z.w, z.h, 14) : ctx.rect(z.x, z.y, z.w, z.h); ctx.fill(); ctx.strokeStyle = "#c9ae66"; ctx.lineWidth = 2; ctx.stroke(); }
    for (const z of h.water) {
      const wg = ctx.createLinearGradient(z.x, z.y, z.x + z.w, z.y + z.h);
      wg.addColorStop(0, "#59b7b2"); wg.addColorStop(1, "#267e8f");
      ctx.fillStyle = wg; ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.strokeStyle = "#cfeee966"; ctx.lineWidth = 1.5;
      for (let y = z.y + 10; y < z.y + z.h; y += 14) { ctx.beginPath(); ctx.moveTo(z.x + 8, y); ctx.bezierCurveTo(z.x + z.w * 0.3, y - 4, z.x + z.w * 0.6, y + 4, z.x + z.w - 8, y); ctx.stroke(); }
    }
    ctx.restore();
    // jointed limestone curbs
    ctx.lineJoin = "round";
    poly(ctx, h.poly);
    ctx.strokeStyle = "#2c5f3f";
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.strokeStyle = "#e9e2c4";
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.save();
    ctx.setLineDash([1.2, 16]);
    ctx.strokeStyle = "#9d987c";
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.restore();
    for (const w of h.walls) {
      poly(ctx, w);
      ctx.fillStyle = "#d9d1b0";
      ctx.fill();
      ctx.strokeStyle = "#7d7759";
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
    for (const zone of h.slopes || []) {
      ctx.fillStyle='#cfba6b88';ctx.fillRect(zone.x,zone.y,zone.w,zone.h);
      ctx.save();ctx.beginPath();ctx.rect(zone.x,zone.y,zone.w,zone.h);ctx.clip();ctx.strokeStyle='#fcf3cc99';ctx.lineWidth=2;
      for(let y=zone.y+14;y<zone.y+zone.h;y+=24)for(let x=zone.x+14;x<zone.x+zone.w;x+=24){
        ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(zone.ay,zone.ax));ctx.beginPath();ctx.moveTo(-7,-5);ctx.lineTo(0,0);ctx.lineTo(-7,5);ctx.stroke();ctx.restore();
      }ctx.restore();
    }
    const area=h.teeArea;
    if(area){ctx.save();ctx.setLineDash([5,4]);ctx.strokeStyle=placing?'#c6ff55':'#ffffff88';ctx.lineWidth=2;ctx.strokeRect(area.x,area.y,area.w,area.h);ctx.restore();}
    if(placing&&teeDraft){ctx.beginPath();ctx.arc(teeDraft.x,teeDraft.y,h.ballR+4,0,7);ctx.strokeStyle='#c6ff55';ctx.lineWidth=3;ctx.stroke();}
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
    ctx.fillStyle = "#efc54a";
    ctx.fill();
    // balls
    const mineIdx = me();
    const t0 = ballAt(myBall() || { x: 0, y: 0 }, now);
    g.players.forEach((p, i) => {
      if (p.out) return;
      const pos = ballAt(p, now);
      if (!pos || (p.holed && !(g.anim && (g.anim.by === p.id || g.anim.paths?.[p.id]) && g.anim.shot === animKey && now - animT0 < g.anim.duration * 1000))) return;
      ctx.beginPath();
      ctx.arc(pos.x + 1, pos.y + 2, h.ballR, 0, 7);
      ctx.fillStyle = "#0005";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, h.ballR, 0, 7);
      const bg = ctx.createRadialGradient(pos.x - h.ballR * 0.4, pos.y - h.ballR * 0.5, 1, pos.x, pos.y, h.ballR);
      bg.addColorStop(0, "#fff"); bg.addColorStop(0.65, "#f6f6e7"); bg.addColorStop(1, "#a0b3aa");
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.lineWidth = p.id === g.turnId ? 3 : 2;
      ctx.strokeStyle = colorOf(i);
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
  }

  function loop() {
    draw(performance.now());
    raf = requestAnimationFrame(loop);
  }

  // Screen point -> unchanged course coordinates (inverse of the portrait rotation).
  function toCourse(ev) {
    const { rect, rot } = size();
    const sx = (ev.clientX - rect.left) / rect.width, sy = (ev.clientY - rect.top) / rect.height;
    if (rot) return { x: g.size.w - sy * g.size.w, y: sx * g.size.h };
    return { x: sx * g.size.w, y: sy * g.size.h };
  }

  const canPlace = () => g && g.phase==='play' && performance.now() >= busyUntil && !S.lastResult && myBall() && !myBall().out && myBall().strokes===0;
  function onPointer(ev) {
    if (placing && canPlace()) {
      ev.preventDefault();
      if(ev.type==='pointerdown'||ev.type==='pointermove'&&ev.buttons){teeDraft=toCourse(ev);}
      if(ev.type==='pointerup'){const p=toCourse(ev);app.socket.emit('action',{type:'place',x:p.x,y:p.y});placing=false;teeDraft=null;syncControls();}
      return;
    }
    if (!canPutt()) return;
    if (ev.type === "pointerdown") {
      dragging = true;
      try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* pointer already gone */ }
      canvas.focus({ preventScroll: true });
    }
    if (ev.type === "pointerup" || ev.type === "pointercancel" || ev.type === "lostpointercapture") {
      dragging = false;
      loupe = null; // release/cancel always removes the loupe; releasing never putts
      return;
    }
    if (!dragging) return;
    if (ev.pointerType === "touch" || ev.pointerType === "pen") loupe = { x: ev.clientX, y: ev.clientY };
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
    root.className = "b2 gf golf";
    root.innerHTML = `<div class="gf-head"><div><span class="gf-eyebrow" id="gf-eyebrow"></span><h2 id="gf-title"></h2></div><div class="gf-score" id="gf-score"></div></div>
      <div class="b2-players card" id="gf-players"></div>
      <div class="ttt-status" id="gf-status" aria-live="polite"></div>
      <div class="gf-wrap"><canvas id="gf-canvas" class="gf-canvas" tabindex="0" role="application" aria-label="Mini golf hole. Drag to aim. Arrow keys fine tune the aim and power. Enter putts."></canvas></div>
      <div class="gf-between card" id="gf-between" hidden></div>
      <div class="gf-controls card" id="gf-controls"><button type="button" class="btn btn-ghost" id="gf-place">Choose tee position</button><small id="gf-place-note" role="status"></small>
        <div class="pl-slider pl-fine"><span>Aim <b id="gf-aim-val"></b></span><div class="pl-fine-row"><button type="button" class="btn btn-ghost btn-small" data-fine="-1" aria-label="Aim half a degree left">−</button><input type="range" id="gf-aim" min="0" max="360" step="0.25" aria-label="Aim angle in degrees"><button type="button" class="btn btn-ghost btn-small" data-fine="1" aria-label="Aim half a degree right">+</button></div></div>
        <label class="pl-slider"><span>Power <b id="gf-pow-val"></b></span><input type="range" id="gf-pow" min="3" max="100" step="1" aria-label="Putt power percent"></label><div class="power-presets" role="group" aria-label="Power presets">${[[20,'Soft'],[50,'Medium'],[85,'Strong']].map(([value,label])=>`<button type="button" class="btn btn-ghost btn-small" data-power="${value}" aria-pressed="false">${label} · ${value}%</button>`).join('')}</div>
        <div class="board-actions"><button type="button" class="btn" id="gf-putt">Putt</button></div>
      </div>
      <div class="gf-card card" id="gf-card"></div>`;
    stage.appendChild(root);
    canvas = root.querySelector("#gf-canvas");
    ctx = canvas.getContext("2d");
    clock = C.makeClock(() => root);
    for (const ev of ["pointerdown", "pointermove", "pointerup", "pointercancel", "lostpointercapture"]) canvas.addEventListener(ev, onPointer);
    root.querySelector('#gf-place').addEventListener('click',()=>{if(!canPlace())return;placing=!placing;teeDraft=placing?{x:myBall().x,y:myBall().y}:null;syncControls();canvas.focus({preventScroll:true});});
    canvas.addEventListener("keydown", (e) => {
      if(placing&&canPlace()){
        const delta={ArrowLeft:[-4,0],ArrowRight:[4,0],ArrowUp:[0,-4],ArrowDown:[0,4]}[e.key];
        if(delta){e.preventDefault();const [dx,dy]=portrait()?[-delta[1],delta[0]]:delta;const a=g.hole.teeArea,r=g.hole.ballR;
          teeDraft.x=Math.max(a.x+r,Math.min(a.x+a.w-r,teeDraft.x+dx));teeDraft.y=Math.max(a.y+r,Math.min(a.y+a.h-r,teeDraft.y+dy));return;}
        if(e.key==='Enter'){e.preventDefault();app.socket.emit('action',{type:'place',x:teeDraft.x,y:teeDraft.y});placing=false;teeDraft=null;syncControls();return;}
        if(e.key==='Escape'){placing=false;teeDraft=null;syncControls();return;}
      }
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
    root.querySelectorAll('[data-power]').forEach(button=>button.addEventListener('click',()=>{if(!canPutt())return;power=Number(button.dataset.power);syncControls();}));
    root.querySelector("#gf-pow").addEventListener("input", (e) => { power = Number(e.target.value); syncControls(); });
    root.querySelector("#gf-putt").addEventListener("click", putt);
    root.querySelectorAll("[data-fine]").forEach((b) => b.addEventListener("click", (e) => {
      if (!canPutt()) return;
      aim += (Number(b.dataset.fine) * (e.shiftKey ? 5 : 0.5) * Math.PI) / 180;
      syncControls();
    }));
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
    const place=root.querySelector('#gf-place');place.hidden=!myBall()||myBall().strokes>0;place.disabled=!canPlace();place.textContent=placing?'Cancel tee placement':'Choose tee position';place.setAttribute('aria-pressed',String(placing));
    root.querySelector('#gf-place-note').textContent=placing?'Tap a free spot inside the square. Keyboard: arrows move, Enter confirms.':canPlace()?'Optional: pick a tee position before your first stroke.':'';
    const aimEl = root.querySelector("#gf-aim");
    const powEl = root.querySelector("#gf-pow");
    aimEl.value = deg(aim).toFixed(2);
    powEl.value = power;
    root.querySelectorAll('[data-power]').forEach(button=>{button.disabled=!mine;button.setAttribute('aria-pressed',String(Number(button.dataset.power)===power));});
    root.querySelector("#gf-aim-val").textContent = deg(aim).toFixed(1) + "°";
    root.querySelectorAll("[data-fine]").forEach((b) => { b.disabled = !mine; });
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
    root.querySelector("#gf-eyebrow").textContent = `${g.course.name || "Course"} · Hole ${g.holeIndex + 1} / ${g.course.holes}`;
    root.querySelector("#gf-title").textContent = g.hole.name;
    const mb = myBall();
    root.querySelector("#gf-score").innerHTML = `<b>PAR ${g.hole.par}</b><span>Stroke <strong>${mb ? mb.strokes : 0}</strong></span>`;
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
      holeKey = key; placing=false;teeDraft=null;
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
    root = null; canvas = null; ctx = null; g = null; placing = false; teeDraft = null; animKey = -1; holeKey = ""; loupe = null; decoKey = ""; deco = []; busyUntil = 0; update.aimed = false;
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
