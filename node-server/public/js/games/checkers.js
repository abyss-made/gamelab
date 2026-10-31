// Checkers screen: 8x8 board, tap a piece then a highlighted square. Forced captures are highlighted.
window.GameUI = window.GameUI || {};
GameUI.checkers = (() => {
  const C = GameUI.common;
  let root = null;
  let app = null;
  let S = null;
  let clock = null;
  let sel = -1;
  let lastMoves = -1;

  const name = (c) => "abcdefgh"[c & 7] + ((c >> 3) + 1);

  function boardHTML(g, { flip = false, playable = false, selected = -1, label = "Checkers board" } = {}) {
    const legal = g.legal || {};
    const targets = new Set(selected >= 0 && legal[selected] ? legal[selected] : []);
    let html = `<div class="ck-board" role="group" aria-label="${label}">`;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const r = flip ? row : 7 - row;
        const f = flip ? 7 - col : col;
        const i = r * 8 + f;
        const dark = (r + f) % 2 === 0;
        const p = g.board[i];
        const movable = playable && legal[i];
        const isT = targets.has(i);
        const cls = ["ck-sq", dark ? "dark" : "light", g.last && (g.last.from === i || g.last.to === i) ? "last" : "", i === selected ? "sel" : "", isT ? "target" : ""].join(" ");
        const piece = p ? `<span class="ck-piece o${(p - 1) & 1} ${p >= 3 ? "king" : ""} ${movable ? "can" : ""}">${p >= 3 ? GameUI.art.crown() : ""}</span>` : isT ? '<span class="ck-dot"></span>' : "";
        const who = p ? `${(p - 1) & 1 ? "White" : "Lime"} ${p >= 3 ? "king" : "man"}` : "empty";
        html += `<button type="button" class="${cls}" data-sq="${i}" aria-label="${name(i)}: ${who}${isT ? ", legal destination" : ""}" ${dark && playable && (movable || isT) ? "" : "disabled"}>${piece}</button>`;
      }
    }
    return html + "</div>";
  }

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 ck";
    root.innerHTML = `<div class="b2-players card" id="ck-players"></div>
      <div class="ttt-status" id="ck-status" aria-live="polite"></div>
      <div id="ck-board"></div>
      <div class="board-actions" id="ck-actions"></div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-sq]");
      if (b && !b.disabled && S && S.game && S.game.myIndex === S.game.turn) {
        const i = Number(b.dataset.sq);
        const g = S.game;
        if (sel >= 0 && g.legal[sel] && g.legal[sel].includes(i)) {
          app.socket.emit("action", { type: "move", from: sel, to: i });
          sel = -1;
        } else if (g.legal[i]) {
          sel = i;
          paint();
        } else {
          sel = -1;
          paint();
        }
        return;
      }
      const r = e.target.closest("#ck-resign");
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

  function paint() {
    const g = S.game;
    const myTurn = g.myIndex === g.turn;
    root.querySelector("#ck-board").innerHTML = boardHTML(g, { flip: g.myIndex === 1, playable: myTurn, selected: sel });
  }

  function update(state) {
    S = state;
    const g = S.game;
    if (!g) return;
    const myTurn = g.myIndex === g.turn;
    clock.set(g.timeLeft);
    if (g.chain >= 0) sel = g.chain; // a multi-jump continues with the same piece
    else if (!myTurn || !g.legal[sel]) sel = -1;
    root.querySelector("#ck-players").innerHTML = g.players
      .map((p, i) => C.playerChip(app, p, { active: g.turn === i, extra: `<span class="ck-key o${i}" aria-hidden="true"></span>` + (g.turn === i && g.timeLeft !== null ? '<span class="fr-timer" data-timer></span>' : ""), sub: `${p.side} · ${p.pieces} piece${p.pieces === 1 ? "" : "s"}` }))
      .join("");
    const turnName = app.esc(g.players[g.turn].name);
    const st = root.querySelector("#ck-status");
    st.innerHTML = g.myIndex < 0 ? `You're watching. <b>${turnName}</b> is up.` : myTurn ? `<b>Your turn!</b> ${g.chain >= 0 ? "Keep jumping with the same piece." : g.mustJump ? "You must capture." : "Tap a piece, then a square."}` : `Waiting for <b>${turnName}</b>...`;
    st.className = "ttt-status" + (myTurn ? " mine" : "");
    paint();
    root.querySelector("#ck-actions").innerHTML = g.myIndex >= 0 ? '<button type="button" class="btn btn-small btn-ghost" id="ck-resign">Resign</button>' : "";
    if (g.moves !== lastMoves && lastMoves >= 0) Sound.play("drop");
    lastMoves = g.moves;
  }

  function unmount() {
    if (clock) clock.stop();
    if (root) root.remove();
    root = null;
    sel = -1;
    lastMoves = -1;
  }

  function renderResult(r, state, a) {
    const w = r.players.find((p) => p.id === r.winnerId);
    const title = r.draw ? "It's a draw!" : r.winnerId === state.you ? "You win!" : `${a.esc(w ? w.name : "Someone")} wins!`;
    const why = r.draw ? "Draw: 40 moves each with no capture or man move." : r.forfeit ? "Won by forfeit." : r.reason === "blocked" ? "The other side has no legal moves left." : "All the other pieces were captured.";
    const next = r.nextUp ? `<p class="center next-up">Winner stays: <b>${a.esc(r.nextUp)}</b> plays next.</p>` : "";
    return `<h2 class="result-title">${title}</h2><p class="muted center">${why}</p><div class="ck-small">${boardHTML({ board: r.board, last: r.last, legal: {} }, { label: "Final Checkers board" })}</div>${next}`;
  }

  function resultSound(r, state) {
    if (r.draw || !r.players.some((p) => p.id === state.you)) return "reveal";
    return r.winnerId === state.you ? "win" : "lose";
  }

  return { mount, update, unmount, renderResult, resultSound, scoreLabel: "wins" };
})();
