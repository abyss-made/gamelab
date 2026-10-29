// Tic Tac Toe screen.
window.GameUI = window.GameUI || {};
GameUI.tictactoe = (() => {
  const C = GameUI.common;
  let root = null;
  let app = null;
  let S = null;
  let clock = null;
  let lastMoves = -1;

  function boardHTML(board, { last, winLine, playable }) {
    const win = new Set(winLine || []);
    return board
      .map((v, i) => {
        const mark = v ? (v === 1 ? "X" : "O") : "";
        const cls = ["ttt-cell", v ? "m" + v : "", win.has(i) ? "win" : "", last === i ? "new" : ""].join(" ");
        const label = `Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}: ${mark || "empty"}`;
        return `<button type="button" class="${cls}" data-cell="${i}" aria-label="${label}" ${playable && !v ? "" : "disabled"}>${mark}</button>`;
      })
      .join("");
  }

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 ttt";
    root.innerHTML = `<div class="b2-players card" id="ttt-players"></div>
      <div class="ttt-status" id="ttt-status" aria-live="polite"></div>
      <div class="ttt-board" id="ttt-board" role="group" aria-label="Tic Tac Toe board"></div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cell]");
      if (!b || b.disabled || !S || !S.game) return;
      if (S.game.myIndex !== S.game.turn) return;
      app.socket.emit("action", { type: "place", cell: Number(b.dataset.cell) });
    });
  }

  function update(state) {
    S = state;
    const g = S.game;
    if (!g) return;
    const myTurn = g.myIndex === g.turn;
    clock.set(g.timeLeft);
    root.querySelector("#ttt-players").innerHTML = g.players
      .map((p, i) => C.playerChip(app, p, { active: g.turn === i, extra: `<span class="ttt-mark m${i + 1}">${p.mark}</span>` + (g.turn === i && g.timeLeft !== null ? '<span class="fr-timer" data-timer></span>' : ""), sub: `${(app.member(p.id) || { score: 0 }).score} wins` }))
      .join("");
    const turnName = app.esc(g.players[g.turn].name);
    const st = root.querySelector("#ttt-status");
    st.innerHTML = g.myIndex < 0 ? `You're watching. <b>${turnName}</b> is up.` : myTurn ? "<b>Your turn!</b> Pick an empty square." : `Waiting for <b>${turnName}</b>...`;
    st.className = "ttt-status" + (myTurn ? " mine" : "");
    root.querySelector("#ttt-board").innerHTML = boardHTML(g.board, { last: g.moves !== lastMoves ? g.last : null, playable: myTurn });
    if (g.moves !== lastMoves && lastMoves >= 0) Sound.play("drop");
    lastMoves = g.moves;
    clock.set(g.timeLeft);
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
    const sub = r.forfeit ? '<p class="muted center">Won by forfeit.</p>' : "";
    const next = r.nextUp ? `<p class="center next-up">Winner stays: <b>${a.esc(r.nextUp)}</b> plays next.</p>` : "";
    return `<h2 class="result-title">${title}</h2>${sub}<div class="ttt-board small done">${boardHTML(r.board, { winLine: r.winLine, playable: false })}</div>${next}`;
  }

  function resultSound(r, state) {
    if (r.draw) return "reveal";
    if (!r.players.some((p) => p.id === state.you)) return "reveal";
    return r.winnerId === state.you ? "win" : "lose";
  }

  return { mount, update, unmount, renderResult, resultSound, scoreLabel: "wins" };
})();
