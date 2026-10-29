// Drawing Telephone screen: write, draw and describe in turns, then watch each chain unfold.
window.GameUI = window.GameUI || {};
GameUI.telephone = (() => {
  const C = GameUI.common;
  const W = 800;
  const H = 600;
  const COLORS = ["#000000", "#9a9a9a", "#ffffff", "#ef130b", "#ff7100", "#ffe400", "#00cc00", "#00b2ff", "#231fd3", "#a300ba", "#ff8fc8", "#a0522d"];
  const SIZES = [4, 10, 22];
  // Same caps the server enforces, so a drawing is never rejected after the player has locked it in.
  const MAX_STROKES = 250;
  const MAX_POINTS = 4000;
  const MAX_FILLS = 20;
  let root = null;
  let app = null;
  let clock = null;
  let S = null;
  let key = "";
  let autoTimer = null;
  let submitted = false;
  // drawing session
  let cv = null;
  let ctx = null;
  let history = [];
  let tool = "brush";
  let color = "#000000";
  let size = 10;
  let cur = null;

  const paintDot = (x, h) => {
    x.fillStyle = h.c;
    x.beginPath();
    x.arc(h.p[0], h.p[1], h.s / 2, 0, 7);
    x.fill();
  };
  const paintSeg = (x, h, x0, y0, x1, y1) => {
    x.strokeStyle = h.c;
    x.lineWidth = h.s;
    x.lineCap = x.lineJoin = "round";
    x.beginPath();
    x.moveTo(x0, y0);
    x.lineTo(x1, y1);
    x.stroke();
  };
  const paintFill = (x, h) => {
    const img = x.getImageData(0, 0, W, H);
    if (GameUI.fill.floodFill(img.data, W, H, h.x, h.y, h.c)) x.putImageData(img, 0, 0);
  };
  // Full redraw: only for undo/clear and for showing finished drawings.
  const replay = (c, hist) => {
    const x = c.getContext("2d", { willReadFrequently: true });
    x.fillStyle = "#fff";
    x.fillRect(0, 0, W, H);
    for (const h of hist || []) {
      if (h.t === "s") {
        paintDot(x, h);
        for (let i = 2; i < h.p.length; i += 2) paintSeg(x, h, h.p[i - 2], h.p[i - 1], h.p[i], h.p[i + 1]);
      } else if (h.t === "f") paintFill(x, h);
    }
  };
  const thumb = (strokes, label) => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    c.className = "tp-canvas readonly";
    c.setAttribute("role", "img");
    c.setAttribute("aria-label", label || "A drawing");
    replay(c, strokes);
    return c;
  };

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 tp";
    root.innerHTML = `<div class="b2-players card" id="tp-players"></div><div class="card tp-main"><div class="hl-round" id="tp-head"></div><div id="tp-body"></div><div class="hl-status" id="tp-status" aria-live="polite"></div></div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("click", (e) => {
      const l = e.target.closest("[data-like]");
      if (l && !l.disabled) {
        const [chain, idx] = l.dataset.like.split(":").map(Number);
        app.socket.emit("action", { type: "like", chain, idx });
      }
    });
  }

  // The lock only comes from the server (myDone), so a rejected submission can still be fixed and resent.
  function send(payload) {
    if (submitted) return;
    clearTimeout(autoTimer);
    app.socket.emit("action", payload);
  }
  const usage = () => ({
    strokes: history.length,
    fills: history.filter((h) => h.t === "f").length,
    points: history.reduce((n, h) => n + (h.t === "s" ? h.p.length / 2 : 0), 0),
  });
  const limitMsg = (u) => (u.strokes >= MAX_STROKES + MAX_FILLS || u.fills >= MAX_FILLS || u.points >= MAX_POINTS - 50 ? "Drawing limit reached. Undo or clear to keep drawing." : "");
  function showLimit() {
    const m = root && root.querySelector("#tp-limit");
    if (m) m.textContent = limitMsg(usage());
  }

  // ---------- drawing tools ----------
  function pos(e) {
    const r = cv.getBoundingClientRect();
    return [Math.round(Math.max(0, Math.min(W, ((e.clientX - r.left) * W) / r.width)) * 10) / 10, Math.round(Math.max(0, Math.min(H, ((e.clientY - r.top) * H) / r.height)) * 10) / 10];
  }
  function bindCanvas() {
    cv.addEventListener("pointerdown", (e) => {
      if (submitted || (S && S.game.myDone)) return;
      e.preventDefault();
      const [x, y] = pos(e);
      const u = usage();
      if (u.strokes >= MAX_STROKES || u.points >= MAX_POINTS - 50 || (tool === "fill" && u.fills >= MAX_FILLS)) return showLimit();
      if (tool === "fill") {
        const f = { t: "f", x, y, c: color };
        history.push(f);
        paintFill(cv.getContext("2d", { willReadFrequently: true }), f);
        showLimit();
        return;
      }
      cv.setPointerCapture(e.pointerId);
      cur = { t: "s", c: tool === "eraser" ? "#ffffff" : color, s: size, p: [x, y] };
      history.push(cur);
      paintDot(cv.getContext("2d"), cur);
    });
    cv.addEventListener("pointermove", (e) => {
      if (!cur) return;
      const [x, y] = pos(e);
      const n = cur.p.length;
      if (Math.abs(cur.p[n - 2] - x) + Math.abs(cur.p[n - 1] - y) < 2) return;
      if (usage().points >= MAX_POINTS - 50) return showLimit();
      cur.p.push(x, y);
      paintSeg(cv.getContext("2d"), cur, cur.p[n - 2], cur.p[n - 1], x, y);
    });
    const up = () => {
      cur = null;
      showLimit();
    };
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
  }
  const toolsHTML = () => `<div class="tp-tools" role="toolbar" aria-label="Drawing tools">
      ${COLORS.map((c) => `<button type="button" class="tp-sw ${c === color && tool !== "eraser" ? "on" : ""}" data-color="${c}" style="background:${c}" aria-label="Colour ${c}" aria-pressed="${c === color}"></button>`).join("")}
      <span class="tp-sep"></span>
      ${SIZES.map((s) => `<button type="button" class="btn btn-small btn-ghost ${s === size ? "on" : ""}" data-size="${s}" aria-label="Brush size ${s}">${s === 4 ? "S" : s === 10 ? "M" : "L"}</button>`).join("")}
      <span class="tp-sep"></span>
      <button type="button" class="btn btn-small btn-ghost ${tool === "brush" ? "on" : ""}" data-tool="brush">Brush</button>
      <button type="button" class="btn btn-small btn-ghost ${tool === "fill" ? "on" : ""}" data-tool="fill">Fill</button>
      <button type="button" class="btn btn-small btn-ghost ${tool === "eraser" ? "on" : ""}" data-tool="eraser">Eraser</button>
      <button type="button" class="btn btn-small btn-ghost" data-act="undo">Undo</button>
      <button type="button" class="btn btn-small btn-ghost" data-act="clear">Clear</button>
    </div>`;

  function buildDraw(body, g) {
    history = [];
    cur = null;
    cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    cv.className = "tp-canvas";
    cv.setAttribute("role", "img");
    cv.setAttribute("aria-label", "Your drawing canvas");
    replay(cv, history);
    bindCanvas();
    const src = g.source ? `<p class="tp-prompt">Draw: <b>${app.esc(g.source.text)}</b></p>` : "";
    body.innerHTML = `${src}<div id="tp-cwrap"></div><div id="tp-tb">${toolsHTML()}</div><p class="muted center" id="tp-limit" aria-live="polite"></p><button class="btn btn-big" id="tp-done" type="button">Done</button>`;
    body.querySelector("#tp-cwrap").appendChild(cv);
    body.addEventListener("click", toolClick);
    body.querySelector("#tp-done").addEventListener("click", () => send({ type: "draw", strokes: history }));
  }
  function toolClick(e) {
    const b = e.target.closest("button");
    if (!b || !cv || submitted) return;
    if (b.dataset.color) { color = b.dataset.color; if (tool === "eraser") tool = "brush"; }
    else if (b.dataset.size) size = Number(b.dataset.size);
    else if (b.dataset.tool) tool = b.dataset.tool;
    else if (b.dataset.act === "undo") { history.pop(); replay(cv, history); showLimit(); }
    else if (b.dataset.act === "clear") { history = []; replay(cv, history); showLimit(); }
    else return;
    root.querySelector("#tp-tb").innerHTML = toolsHTML();
  }

  function buildText(body, g) {
    const prompt = g.kind === "prompt";
    body.innerHTML = `${g.source && g.source.kind === "draw" ? '<div id="tp-src"></div>' : ""}
      <form class="ws-form" id="tp-form" autocomplete="off">
        <label class="sr-only" for="tp-input">${prompt ? "Your prompt" : "What is this a drawing of?"}</label>
        <input id="tp-input" type="text" maxlength="60" placeholder="${prompt ? "Write something fun to draw…" : "Describe the drawing"}" autocapitalize="sentences">
        <button class="btn" type="submit">Submit</button>
      </form>`;
    if (g.source && g.source.kind === "draw") body.querySelector("#tp-src").appendChild(thumb(g.source.strokes, "The drawing you need to describe"));
    body.querySelector("#tp-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const t = body.querySelector("#tp-input").value.trim();
      if (t) send({ type: "text", text: t });
    });
    const i = body.querySelector("#tp-input");
    if (i && matchMedia("(pointer:fine)").matches) i.focus();
  }

  function renderReveal(body, g) {
    const r = g.rev;
    const owner = g.players.find((p) => p.id === r.owner);
    body.innerHTML = `<h3 class="tp-chain">${owner ? app.esc(owner.name) + "'s chain" : "Chain"} <small>${r.chain + 1} of ${r.chains}</small></h3><ol class="tp-entries" id="tp-entries"></ol>`;
    const ol = body.querySelector("#tp-entries");
    r.entries.forEach((e) => {
      const who = g.players.find((p) => p.id === e.by);
      const li = document.createElement("li");
      li.className = "tp-entry";
      const label = e.kind === "draw" ? "drew" : e.kind === "prompt" ? "wrote" : "guessed";
      li.innerHTML = `<div class="tp-by">${who ? app.avatarHTML(who.avatar) : ""}<b>${who ? app.esc(who.name) : "?"}</b> ${label}</div><div class="tp-content"></div>`;
      const content = li.querySelector(".tp-content");
      if (e.kind === "draw") content.appendChild(e.skipped ? Object.assign(document.createElement("em"), { textContent: "(no drawing)" }) : thumb(e.strokes, `Drawing by ${who ? who.name : "a player"}`));
      else content.innerHTML = `<p class="tp-text">${app.esc(e.text)}</p>`;
      if (!e.skipped && e.by !== S.you && g.myIndex >= 0) {
        li.insertAdjacentHTML("beforeend", `<button class="btn btn-small btn-ghost tp-like ${e.liked ? "on" : ""}" data-like="${r.chain}:${e.i}" ${e.liked ? "disabled" : ""} aria-label="Like this entry">${e.liked ? "♥" : "♡"} ${e.likes}</button>`);
      } else if (e.likes) li.insertAdjacentHTML("beforeend", `<span class="tp-like-n">♥ ${e.likes}</span>`);
      ol.appendChild(li);
    });
  }

  function update(state) {
    S = state;
    const g = S.game;
    clock.set(g.timeLeft);
    root.querySelector("#tp-players").innerHTML = g.players
      .map((p) => C.playerChip(app, p, { sub: g.phase === "work" ? (p.out ? "left" : p.done ? "done ✔" : "working…") : `${p.points} pts` }))
      .join("");
    const body = root.querySelector("#tp-body");
    const head = root.querySelector("#tp-head");
    const status = root.querySelector("#tp-status");
    if (g.phase === "work") {
      head.innerHTML = `Round ${g.round} of ${g.rounds} · ${g.kind === "prompt" ? "Write a prompt" : g.kind === "draw" ? "Draw it" : "Describe it"} <span class="fr-timer" data-timer></span>`;
      const k = "w" + g.round;
      if (k !== key) {
        key = k;
        submitted = false;
        clearTimeout(autoTimer);
        body.replaceWith(Object.assign(body.cloneNode(false), {}));
        const nb = root.querySelector("#tp-body");
        nb.innerHTML = "";
        if (g.mine) {
          if (g.kind === "draw") buildDraw(nb, g);
          else buildText(nb, g);
          // Send whatever is there just before time runs out so work isn't lost.
          autoTimer = setTimeout(() => {
            if (g.kind === "draw") send({ type: "draw", strokes: history });
            else {
              const i = root.querySelector("#tp-input");
              if (i && i.value.trim()) send({ type: "text", text: i.value.trim() });
            }
          }, Math.max(0, g.timeLeft - 1500));
        } else nb.innerHTML = '<p class="muted center">You are watching this round.</p>';
      }
      submitted = !!g.myDone;
      const nb = root.querySelector("#tp-body");
      nb.classList.toggle("locked", !!g.myDone);
      nb.querySelectorAll("input,button").forEach((el) => (el.disabled = !!g.myDone));
      status.textContent = !g.mine ? "" : g.myDone ? "Submitted. Waiting for the others…" : g.kind === "draw" ? "Draw what the prompt says, then press Done." : g.kind === "guess" ? "What is this a drawing of?" : "Write a prompt for someone else to draw.";
    } else {
      head.innerHTML = `The reveal <span class="fr-timer" data-timer></span>`;
      const k = `r${g.rev.chain}:${g.rev.idx}:${g.rev.entries.map((e) => e.likes + (e.liked ? "y" : "n")).join("")}`;
      if (k !== key) {
        key = k;
        renderReveal(body, g);
      }
      status.textContent = g.myIndex >= 0 ? "Like entries you enjoy. You can't like your own." : "";
    }
    clock.set(g.timeLeft);
  }

  function unmount() {
    clearTimeout(autoTimer);
    if (clock) clock.stop();
    if (root) root.remove();
    root = cv = null;
    key = "";
  }

  function renderResult(r, state, a) {
    return `<h2 class="result-title">${C.resultTitle(r, state, a)}</h2>${C.podium(r.standings, a, (p) => p.points, "pts")}<p class="muted center">Points come from finishing your turns and from likes.</p>`;
  }
  return { mount, update, unmount, renderResult, resultSound: C.resultSound, scoreLabel: "pts" };
})();
