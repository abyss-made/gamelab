// Dots & Boxes screen: a (2n+1) x (2n+1) grid of dots, edge buttons and boxes.
window.GameUI = window.GameUI || {};
GameUI.dotsboxes = (() => {
  const C = GameUI.common;
  let root = null;
  let app = null;
  let S = null;
  let clock = null;

  function gridHTML(g, { playable, myIndex }) {
    const n = g.n;
    let html = `<div class="db-grid" style="--n:${n}" role="group" aria-label="Dots and Boxes board, ${n} by ${n} boxes">`;
    for (let r = 0; r <= 2 * n; r++) {
      for (let c = 0; c <= 2 * n; c++) {
        if (r % 2 === 0 && c % 2 === 0) html += '<span class="db-dot"></span>';
        else if (r % 2 === 0) {
          const er = r / 2;
          const ec = (c - 1) / 2;
          const o = g.h[er][ec];
          html += edge("h", er, ec, o, playable, g.last, `Horizontal line, row ${er + 1}, column ${ec + 1}`);
        } else if (c % 2 === 0) {
          const er = (r - 1) / 2;
          const ec = c / 2;
          const o = g.v[er][ec];
          html += edge("v", er, ec, o, playable, g.last, `Vertical line, row ${er + 1}, column ${ec + 1}`);
        } else {
          const o = g.boxes[(r - 1) / 2][(c - 1) / 2];
          html += `<span class="db-box ${o >= 0 ? "p" + o : ""}" aria-label="${o >= 0 ? "Box owned by " + app.esc(g.players[o] ? g.players[o].name : "a player") : "Empty box"}">${o >= 0 ? app.esc((g.players[o] ? g.players[o].name : "?").slice(0, 1).toUpperCase()) : ""}</span>`;
        }
      }
    }
    return html + "</div>";
  }
  function edge(kind, r, c, owner, playable, last, label) {
    const taken = owner >= 0;
    const isLast = last && last.kind === kind && last.r === r && last.c === c;
    return `<button type="button" class="db-edge ${kind} ${taken ? "taken p" + owner : ""} ${isLast ? "new" : ""}" data-kind="${kind}" data-r="${r}" data-c="${c}" aria-label="${label}${taken ? ", taken" : ""}" ${playable && !taken ? "" : "disabled"}></button>`;
  }

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 db";
    root.innerHTML = `<div class="b2-players card" id="db-players"></div>
      <div class="ttt-status" id="db-status" aria-live="polite"></div>
      <div class="db-wrap" id="db-board"></div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-kind]");
      if (!b || b.disabled || !S || !S.game || S.game.myIndex !== S.game.turn) return;
      app.socket.emit("action", { type: "edge", kind: b.dataset.kind, r: Number(b.dataset.r), c: Number(b.dataset.c) });
    });
  }

  function update(state) {
    S = state;
    const g = S.game;
    if (!g) return;
    const myTurn = g.myIndex === g.turn;
    clock.set(g.timeLeft);
    root.querySelector("#db-players").innerHTML = g.players
      .map((p, i) => C.playerChip(app, p, { active: g.turn === i && !p.out, extra: `<span class="db-key p${i}" aria-hidden="true"></span>` + (g.turn === i && g.timeLeft !== null ? '<span class="fr-timer" data-timer></span>' : ""), sub: `${p.boxes} box${p.boxes === 1 ? "" : "es"}` }))
      .join("");
    const turnName = app.esc(g.players[g.turn].name);
    const st = root.querySelector("#db-status");
    st.innerHTML = g.myIndex < 0 ? `You're watching. <b>${turnName}</b> is up.` : myTurn ? "<b>Your turn!</b> Draw a line. Complete a box to go again." : `Waiting for <b>${turnName}</b>...`;
    st.className = "ttt-status" + (myTurn ? " mine" : "");
    const key = JSON.stringify(g.last) + g.players.map((p) => p.boxes).join(",") + (myTurn ? "m" : "w");
    const board = root.querySelector("#db-board");
    if (board.dataset.key !== key || !board.firstChild) {
      board.innerHTML = gridHTML(g, { playable: myTurn, myIndex: g.myIndex });
      if (board.dataset.key) Sound.play("drop");
      board.dataset.key = key;
    }
    clock.set(g.timeLeft);
  }

  function unmount() {
    if (clock) clock.stop();
    if (root) root.remove();
    root = null;
  }

  function renderResult(r, state, a) {
    app = a;
    const g = { n: r.n, h: r.h, v: r.v, boxes: r.boxes, players: r.players, last: null };
    return `<h2 class="result-title">${C.resultTitle(r, state, a)}</h2>${r.forfeit ? '<p class="muted center">Won by forfeit.</p>' : ""}${C.podium(r.standings, a, (p) => p.boxes, "boxes")}<div class="db-wrap small">${gridHTML(g, { playable: false })}</div>`;
  }
  return { mount, update, unmount, renderResult, resultSound: C.resultSound, scoreLabel: "boxes" };
})();
