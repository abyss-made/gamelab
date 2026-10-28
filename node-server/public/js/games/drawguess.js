// Draw & Guess screen: canvas, tools, word/hints, timer, overlays.
window.GameUI = window.GameUI || {};
GameUI.drawguess = (() => {
  const W = 800;
  const H = 600;
  const PALETTE = [
    "#000000",
    "#4c4c4c",
    "#9a9a9a",
    "#ffffff",
    "#ef130b",
    "#ff7100",
    "#ffe400",
    "#00cc00",
    "#00b2ff",
    "#231fd3",
    "#a300ba",
    "#ff8fc8",
    "#a0522d",
    "#592f2a",
    "#ffcfa8",
    "#740b07",
    "#c23800",
    "#e8a200",
    "#005510",
    "#00569e",
    "#0e0865",
    "#550069",
  ];
  const icon = (...args) => Playgrid.icon(...args);

  // One canvas for the whole session, so drawing that arrives before the
  // screen is shown still lands on it.
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  canvas.className = "dg-canvas";
  canvas.setAttribute("aria-label", "Shared drawing canvas");
  canvas.setAttribute("role", "img");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const blank = () => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
  };
  blank();

  let tool = "brush";
  let color = "#000000";
  // Brush and eraser remember their own sizes; fill has no size.
  const sizes = { brush: 10, eraser: 10 };
  const sizeTool = () => (tool === "eraser" ? "eraser" : "brush");
  const curSize = () => sizes[sizeTool()];
  let remote = null;
  let local = null;
  let pending = [];
  let flushTimer = null;
  let root = null;
  let app = null;
  let S = null;
  let clock = null;
  let deadline = 0;
  let total = 1;
  let lastKey = "";
  let lastSecond = -1;

  // ---------- drawing primitives ----------
  function dot(x, y, c, s) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, s / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  function seg(x0, y0, x1, y1, c, s) {
    ctx.strokeStyle = c;
    ctx.lineWidth = s;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  function flood(x0, y0, hex) {
    const img = ctx.getImageData(0, 0, W, H);
    if (GameUI.fill.floodFill(img.data, W, H, x0, y0, hex))
      ctx.putImageData(img, 0, 0);
  }

  function replay(history) {
    blank();
    for (const h of history) {
      if (h.t === "s") {
        const p = h.p;
        dot(p[0], p[1], h.c, h.s);
        for (let i = 2; i < p.length; i += 2)
          seg(p[i - 2], p[i - 1], p[i], p[i + 1], h.c, h.s);
      } else if (h.t === "f") {
        flood(h.x, h.y, h.c);
      }
    }
  }

  // ---------- network in ----------
  function onDraw(d) {
    if (d.op === "begin") {
      remote = { x: d.x, y: d.y, c: d.color, s: d.size };
      dot(d.x, d.y, d.color, d.size);
    } else if (d.op === "pts" && remote) {
      for (let i = 0; i < d.pts.length; i += 2) {
        seg(remote.x, remote.y, d.pts[i], d.pts[i + 1], remote.c, remote.s);
        remote.x = d.pts[i];
        remote.y = d.pts[i + 1];
      }
    } else if (d.op === "end") {
      remote = null;
    } else if (d.op === "fill") {
      flood(d.x, d.y, d.color);
    }
  }
  function onCanvas(d) {
    remote = null;
    replay(d.history || []);
  }

  // ---------- network out ----------
  const canDraw = () =>
    S && S.game && S.game.phase === "draw" && S.game.drawerId === S.you;
  function flush() {
    clearTimeout(flushTimer);
    flushTimer = null;
    if (!pending.length) return;
    app.socket.emit("draw", { op: "pts", pts: pending });
    pending = [];
  }
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(W, ((e.clientX - r.left) * W) / r.width));
    const y = Math.max(0, Math.min(H, ((e.clientY - r.top) * H) / r.height));
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (!canDraw() || e.button > 0) return;
    e.preventDefault();
    const [x, y] = pos(e);
    if (tool === "fill") {
      flood(x, y, color);
      app.socket.emit("draw", { op: "fill", x, y, color });
      return;
    }
    canvas.setPointerCapture(e.pointerId);
    const c = tool === "eraser" ? "#ffffff" : color;
    const size = curSize();
    local = { x, y, c, s: size };
    dot(x, y, c, size);
    app.socket.emit("draw", { op: "begin", x, y, color: c, size });
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!local) return;
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of events.length ? events : [e]) {
      const [x, y] = pos(ev);
      if (Math.abs(x - local.x) + Math.abs(y - local.y) < 1.5) continue;
      seg(local.x, local.y, x, y, local.c, local.s);
      local.x = x;
      local.y = y;
      pending.push(x, y);
      if (pending.length >= 380) flush();
    }
    if (!flushTimer && pending.length) flushTimer = setTimeout(flush, 40);
  });
  const stop = () => {
    if (!local) return;
    flush();
    app.socket.emit("draw", { op: "end" });
    local = null;
  };
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
  canvas.addEventListener("lostpointercapture", stop);

  // ---------- screen ----------
  function toolsHTML() {
    return `<span class="tools-title">Tools</span><div class="tool-picks">
      <button class="tool ${tool === "brush" ? "on" : ""}" data-tool="brush" title="Brush" aria-label="Brush" aria-pressed="${tool === "brush"}">${icon("brush")}</button>
      <button class="tool ${tool === "eraser" ? "on" : ""}" data-tool="eraser" title="Eraser" aria-label="Eraser" aria-pressed="${tool === "eraser"}">${icon("eraser")}</button>
      <button class="tool ${tool === "fill" ? "on" : ""}" data-tool="fill" title="Paint bucket" aria-label="Paint bucket" aria-pressed="${tool === "fill"}">${icon("fill")}</button>
      </div><label class="tool-field">${tool === "eraser" ? "Eraser size" : "Brush size"}<input id="brush-size" type="range" min="4" max="38" step="2" value="${curSize()}" aria-label="${tool === "eraser" ? "Eraser size" : "Brush size"}"></label>
      <div class="tool-field"><span>Color</span><div class="dg-palette">${PALETTE.map((c) => `<button class="swatch ${c === color ? "on" : ""}" style="--sw:${c}" data-color="${c}" title="${c}" aria-label="Color ${c}" aria-pressed="${c === color}"></button>`).join("")}</div></div>
      <div class="dg-actions"><button class="tool" data-do="undo" title="Undo" aria-label="Undo last stroke">${icon("undo")}</button><button class="tool" data-do="clear" title="Clear" aria-label="Clear drawing">${icon("trash")}</button></div><span class="tool-caption">Only the drawer can draw</span>`;
  }
  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "dg";
    root.innerHTML = `
      <div class="dg-top card">
        <div class="dg-timer"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" class="track"/><circle cx="18" cy="18" r="15" class="bar" id="dg-ring"/></svg><span id="dg-time">0</span></div>
        <div class="dg-word" id="dg-word"></div>
        <div class="dg-round" id="dg-round"></div>
      </div>
      <div class="dg-board card">
        <div class="dg-boardbar"><button type="button" class="btn btn-small btn-ghost dg-chat-toggle" id="dg-chat-toggle" aria-pressed="false" aria-controls="room-chat" hidden><span>Chat</span><b class="dg-unread" id="dg-unread" hidden></b></button><button type="button" class="btn btn-small btn-ghost" id="dg-expand" aria-pressed="false">${icon("expand")}<span>Expand Canvas</span></button></div>
        <div class="dg-wrap" id="dg-wrap"><div class="dg-overlay" id="dg-overlay" hidden></div></div>
      </div>
      <div class="dg-tools card" id="dg-tools" tabindex="0" role="group" aria-label="Drawing tools" hidden>${toolsHTML()}</div>`;
    $("#dg-wrap").prepend(canvas);
    stage.appendChild(root);
    root.addEventListener("click", onClick);
    root.addEventListener("input", (e) => {
      if (e.target.id === "brush-size") sizes[sizeTool()] = Number(e.target.value);
    });
    $("#dg-expand").addEventListener("click", () => setBig(!big));
    $("#dg-chat-toggle").addEventListener("click", () => setChat(!chatOpen));
    document.addEventListener("keydown", onKey);
    clock = setInterval(tickClock, 200);
  }

  const $ = (s) => root.querySelector(s);

  // Enlarged canvas ("focus mode"): the drawing area fills the visual viewport on every screen size.
  // The chat panel is moved (not cloned) into the focus layout, so messages, scroll position and any
  // half-typed guess survive opening and closing it. It is a collapsible panel with an unread badge.
  let big = false;
  let chatOpen = false;
  let unread = 0;
  let chatHome = null; // placeholder marking where the chat lives outside focus mode
  let chatObserver = null;
  const isPhone = () =>
    window.matchMedia("(max-width: 600px), (max-height: 500px) and (orientation: landscape)").matches;
  const isWide = () => window.matchMedia("(min-width: 901px) and (min-height: 501px)").matches;
  function setChat(on) {
    chatOpen = !!on;
    if (!root) return;
    root.classList.toggle("chat-open", chatOpen);
    const t = $("#dg-chat-toggle");
    t.setAttribute("aria-pressed", String(chatOpen));
    if (chatOpen) {
      unread = 0;
      const log = document.getElementById("chat-log");
      if (log) log.scrollTop = log.scrollHeight;
    }
    renderUnread();
  }
  function renderUnread() {
    const b = $("#dg-unread");
    if (!b) return;
    b.hidden = !unread;
    b.textContent = unread > 9 ? "9+" : String(unread);
    $("#dg-chat-toggle").setAttribute(
      "aria-label",
      unread ? `Chat, ${unread} unread` : "Chat",
    );
  }
  function adoptChat() {
    const chat = document.getElementById("room-chat");
    if (!chat || chatHome) return;
    chatHome = document.createComment("chat-home");
    chat.before(chatHome);
    root.appendChild(chat);
    const log = document.getElementById("chat-log");
    chatObserver = new MutationObserver((list) => {
      if (chatOpen) return;
      for (const m of list)
        for (const n of m.addedNodes)
          if (n.classList && !n.classList.contains("sys") && !n.classList.contains("msg-me")) unread++;
      renderUnread();
    });
    chatObserver.observe(log, { childList: true });
  }
  function releaseChat() {
    if (chatObserver) chatObserver.disconnect();
    chatObserver = null;
    const chat = document.getElementById("room-chat");
    if (chatHome && chat) {
      chatHome.replaceWith(chat);
    }
    chatHome = null;
  }
  function setBig(on) {
    big = !!on;
    if (!root) return;
    root.classList.toggle("big", big);
    document.body.classList.toggle("dg-big", big);
    const b = $("#dg-expand");
    b.innerHTML =
      icon("expand") +
      "<span>" +
      (big ? (isPhone() ? "Close" : "Restore Size") : "Expand Canvas") +
      "</span>";
    b.setAttribute("aria-pressed", String(big));
    $("#dg-chat-toggle").hidden = !big;
    if (big) {
      adoptChat();
      unread = 0;
      // Guessers need the chat to guess; drawers get the pixels until they ask for it.
      setChat(isWide() && !canDraw());
    } else {
      releaseChat();
      root.classList.remove("chat-open");
    }
  }
  function onKey(e) {
    if (e.key === "Escape" && big) setBig(false);
  }

  function onClick(e) {
    const c = e.target.closest("[data-color]");
    const s = e.target.closest("[data-size]");
    const t = e.target.closest("[data-tool]");
    const d = e.target.closest("[data-do]");
    const ch = e.target.closest("[data-choose]");
    if (c) {
      color = c.dataset.color;
      if (tool === "eraser") tool = "brush";
    }
    if (s) sizes[sizeTool()] = Number(s.dataset.size);
    if (t) tool = t.dataset.tool;
    if (d && canDraw()) {
      if (d.dataset.do === "clear" && !confirm("Clear the whole drawing?"))
        return;
      app.socket.emit("draw", { op: d.dataset.do });
    }
    if (ch)
      app.socket.emit("action", {
        type: "choose",
        index: Number(ch.dataset.choose),
      });
    if (c || s || t) {
      $("#dg-tools").innerHTML = toolsHTML();
      syncTools();
    }
  }

  function tickClock() {
    if (!root) return;
    const left = Math.max(0, deadline - performance.now());
    const sec = Math.ceil(left / 1000);
    $("#dg-time").textContent = sec;
    const headerTime = document.getElementById("header-timer");
    if (headerTime)
      headerTime.textContent =
        Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
    const ring = $("#dg-ring");
    ring.style.strokeDashoffset = String(94.25 * (1 - left / total));
    root.classList.toggle(
      "hurry",
      S && S.game && S.game.phase === "draw" && sec <= 10,
    );
    if (
      S &&
      S.game &&
      S.game.phase === "draw" &&
      sec <= 5 &&
      sec > 0 &&
      sec !== lastSecond
    )
      Sound.play("tick");
    lastSecond = sec;
  }

  function wordHTML(g, meIsDrawer) {
    if (g.phase === "choose")
      return `<span class="dg-label">${meIsDrawer ? "Pick a word to draw" : "Get ready..."}</span>`;
    if (g.word) {
      const label = meIsDrawer
        ? "You are drawing:"
        : g.phase === "reveal"
          ? "The word was"
          : "You got it";
      return `<span class="dg-label">${label}</span><span class="dg-answer">${app.esc(g.word)}</span>`;
    }
    if (!g.hint) return "";
    const lens = g.hint
      .join("")
      .split(" ")
      .map((w) => w.length)
      .join(" ");
    return `<span class="dg-label">Guess the word</span><span class="dg-hint">${g.hint.map((c) => (c === " " ? '<i class="gap"></i>' : c === "_" ? '<i class="blank"></i>' : `<i class="letter">${app.esc(c)}</i>`)).join("")}<sup>${lens}</sup></span>`;
  }

  function overlayHTML(g, meIsDrawer) {
    const drawer = app.member(g.drawerId);
    const dname = drawer ? app.esc(drawer.name) : "Someone";
    if (g.phase === "choose") {
      if (meIsDrawer) {
        return `<div class="ov-box"><h3>Your turn! Pick a word</h3><div class="choices">${g.choices.map((w, i) => `<button class="btn" data-choose="${i}">${app.esc(w)}</button>`).join("")}</div></div>`;
      }
      return `<div class="ov-box">${drawer ? app.avatarHTML(drawer.avatar, "av-lg") : ""}<h3>${dname} is choosing a word...</h3></div>`;
    }
    if (g.phase === "reveal" && g.turnResult) {
      const r = g.turnResult;
      const why =
        r.reason === "all"
          ? "Everyone guessed it!"
          : r.reason === "left"
            ? "The drawer left."
            : "Time's up!";
      return `<div class="ov-box"><p class="muted">${why}</p><h3>The word was <span class="hl">${app.esc(r.word)}</span></h3>
        <ul class="turn-scores">${r.scores.map((s) => `<li><span>${app.esc(s.name)}${s.drawer ? " (drawer)" : ""}</span><b class="${s.pts ? "plus" : ""}">+${s.pts}</b></li>`).join("")}</ul></div>`;
    }
    return "";
  }

  function update(state) {
    S = state;
    const g = S.game;
    if (!g) return;
    const meIsDrawer = g.drawerId === S.you;
    deadline = performance.now() + g.timeLeft;
    total = g.totalTime || 1;
    $("#dg-round").textContent =
      `Round ${Math.min(g.round, g.rounds)} of ${g.rounds}`;
    $("#dg-word").innerHTML = wordHTML(g, meIsDrawer);
    document.getElementById("room-word").innerHTML = wordHTML(g, meIsDrawer);
    const ov = overlayHTML(g, meIsDrawer);
    const overlay = $("#dg-overlay");
    overlay.hidden = !ov;
    overlay.innerHTML = ov;
    $("#dg-tools").hidden = false;
    syncTools();
    root.classList.toggle("drawing", meIsDrawer && g.phase === "draw");
    const key = g.turnId + ":" + g.phase;
    if (key !== lastKey) {
      lastKey = key;
      if (g.phase === "choose" && meIsDrawer) Sound.play("yourturn");
      if (g.phase === "reveal") Sound.play("reveal");
      if (g.phase === "choose") {
        tool = "brush";
        $("#dg-tools").innerHTML = toolsHTML();
      }
    }
    syncTools();
    tickClock();
  }

  function syncTools() {
    if (!root) return;
    $("#dg-tools")
      .querySelectorAll("button, input")
      .forEach((el) => {
        el.disabled = !canDraw();
      });
  }

  function unmount() {
    clearInterval(clock);
    clock = null;
    stop();
    setBig(false);
    document.removeEventListener("keydown", onKey);
    if (root) root.remove();
    root = null;
    lastKey = "";
  }

  function renderResult(r, state, a) {
    const st = r.standings || [];
    const confetti = Array.from(
      { length: 60 },
      (_, i) =>
        `<i style="--x:${(i * 37 + 3) % 98}%;--y:${(i * 19 + 7) % 91}%;--r:${i * 47}deg;--c:${["#adff00", "#35b7ca", "#f6b513", "#b644c7", "#e35379"][i % 5]}"></i>`,
    ).join("");
    const podium = st
      .slice(0, 3)
      .map(
        (p, i) =>
          `<div class="podium-spot p${i + 1}">${!i ? `<span class="winner-crown">${icon("crown")}</span>` : ""}${a.avatarHTML(p.avatar, "av-lg")}<div class="podium-block"><b>${a.esc(p.name)}</b><span class="place">${["1st", "2nd", "3rd"][i]}</span><span class="podium-points">${p.score} pts</span></div></div>`,
      );
    return `<div class="confetti" aria-hidden="true">${confetti}</div><h2 class="result-title">Round Complete!</h2><p class="result-subtitle">${st.length ? a.esc(st[0].name) + " takes the crown. Good game, everyone!" : "Good game, everyone!"}</p>${r.note ? `<p class="muted center">${a.esc(r.note)}</p>` : ""}<div class="podium">${[podium[1], podium[0], podium[2]].filter(Boolean).join("")}</div>${
      st.length > 3
        ? `<ol class="rest" start="4">${st
            .slice(3)
            .map((p) => `<li>${a.esc(p.name)} <b>${p.score} pts</b></li>`)
            .join("")}</ol>`
        : ""
    }`;
  }

  function resultSound(r, state) {
    const st = r.standings || [];
    if (!st.length) return null;
    return st[0].id === state.you ? "win" : "reveal";
  }

  function chatPlaceholder(state) {
    const g = state.game;
    if (!g || g.phase !== "draw") return null;
    if (g.drawerId === state.you) return "Chat (you can't say the word)";
    if (state.role === "spectator" || g.guessed.includes(state.you))
      return "Chat with players who know the word...";
    return "Type your guess here...";
  }

  return {
    mount,
    update,
    unmount,
    onDraw,
    onCanvas,
    exitBig: () => setBig(false),
    renderResult,
    resultSound,
    chatPlaceholder,
    scoreLabel: "pts",
  };
})();
