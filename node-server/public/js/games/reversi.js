// Reversi screen: 8x8 board, legal squares shown to the player to move, pass notices.
window.GameUI = window.GameUI || {};
GameUI.reversi = (() => {
  const C = GameUI.common;
  let root = null;
  let app = null;
  let S = null;
  let clock = null;
  let lastMoves = -1;
  let lastPassed = 0;

  const name = (c) => "abcdefgh"[c & 7] + (8 - (c >> 3));

  function boardHTML(board, { legal = [], last = -1, flipped = [], playable = false, label = "Reversi board" } = {}) {
    const lg = new Set(legal);
    const fl = new Set(flipped);
    let html = `<div class="rv-board" role="group" aria-label="${label}">`;
    for (let i = 0; i < 64; i++) {
      const v = board[i];
      const can = playable && lg.has(i);
      const state = v === 1 ? "black disc" : v === 2 ? "white disc" : can ? "legal move" : "empty";
      html += `<button type="button" class="rv-cell ${can ? "legal" : ""} ${last === i ? "last" : ""}" data-cell="${i}" aria-label="${name(i)}: ${state}" ${can ? "" : "disabled"}>${v ? `<span class="rv-disc d${v} ${fl.has(i) ? "flip" : ""}"></span>` : can ? '<span class="rv-dot"></span>' : ""}</button>`;
    }
    return html + "</div>";
  }

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 rv";
    root.innerHTML = `<div class="b2-players card" id="rv-players"></div>
      <div class="ttt-status" id="rv-status" aria-live="polite"></div>
      <div id="rv-board"></div>
      <div class="board-actions" id="rv-actions"></div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cell]");
      if (b && !b.disabled && S && S.game && S.game.myIndex === S.game.turn) {
        app.socket.emit("action", { type: "place", cell: Number(b.dataset.cell) });
        return;
      }
      const r = e.target.closest("#rv-resign");
      if (r) {
        if (r.dataset.armed) {
          app.socket.emit("action", { type: "resign" });
        } else {
          r.dataset.armed = "1";
          r.textContent = "Tap again to resign";
          setTimeout(() => {
            if (r.isConnected) { delete r.dataset.armed; r.textContent = "Resign"; }
          }, 3000);
        }
      }
    });
  }

  function update(state) {
    S = state;
    const g = S.game;
    if (!g) return;
    const myTurn = g.myIndex === g.turn;
    clock.set(g.timeLeft);
    root.querySelector("#rv-players").innerHTML = g.players
      .map((p, i) => C.playerChip(app, p, { active: g.turn === i, extra: `<span class="rv-key d${i + 1}" aria-hidden="true"></span>` + (g.turn === i && g.timeLeft !== null ? '<span class="fr-timer" data-timer></span>' : ""), sub: `${p.disc} · ${p.discs} disc${p.discs === 1 ? "" : "s"}` }))
      .join("");
    const turnName = app.esc(g.players[g.turn].name);
    let msg = g.myIndex < 0 ? `You're watching. <b>${turnName}</b> is up.` : myTurn ? "<b>Your turn!</b> Tap a square with a dot." : `Waiting for <b>${turnName}</b>...`;
    if (g.passed && g.passed === g.moves) msg += ` <span class="muted">(${app.esc(g.players[1 - g.turn].name)} had no move and passed.)</span>`;
    const st = root.querySelector("#rv-status");
    st.innerHTML = msg;
    st.className = "ttt-status" + (myTurn ? " mine" : "");
    root.querySelector("#rv-board").innerHTML = boardHTML(g.board, { legal: g.legal, last: g.moves !== lastMoves ? g.last : -1, flipped: g.moves !== lastMoves ? g.flipped : [], playable: myTurn });
    root.querySelector("#rv-actions").innerHTML = g.myIndex >= 0 ? '<button type="button" class="btn btn-small btn-ghost" id="rv-resign">Resign</button>' : "";
    if (g.moves !== lastMoves && lastMoves >= 0) Sound.play("drop");
    lastMoves = g.moves;
    lastPassed = g.passed;
  }

  function unmount() {
    if (clock) clock.stop();
    if (root) root.remove();
    root = null;
    lastMoves = -1;
  }

  function renderResult(r, state, a) {
    const w = r.players.find((p) => p.id === r.winnerId);
    const title = r.draw ? "It's a draw!" : r.winnerId === state.you ? "You win!" : `${a.esc(w ? w.name : "Someone")} wins!`;
    const score = r.players.map((p) => `${a.esc(p.name)} (${p.disc}) <b>${p.discs}</b>`).join(" · ");
    const sub = r.forfeit ? '<p class="muted center">Won by forfeit.</p>' : "";
    const next = r.nextUp ? `<p class="center next-up">Winner stays: <b>${a.esc(r.nextUp)}</b> plays next.</p>` : "";
    return `<h2 class="result-title">${title}</h2>${sub}<p class="center">${score}</p><div class="rv-small">${boardHTML(r.board, { last: r.last, label: "Final Reversi board" })}</div>${next}`;
  }

  function resultSound(r, state) {
    if (r.draw || !r.players.some((p) => p.id === state.you)) return "reveal";
    return r.winnerId === state.you ? "win" : "lose";
  }

  return { mount, update, unmount, renderResult, resultSound, scoreLabel: "wins" };
})();
