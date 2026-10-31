// 4 in a Row screen: players, board, turn timer.
window.GameUI = window.GameUI || {};
GameUI.fourrow = (() => {
  const ROWS = 6;
  const COLS = 7;
  let root = null;
  let app = null;
  let S = null;
  let clock = null;
  let deadline = 0;
  let lastMoves = -1;
  let lastTurnKey = "";

  function boardHTML(board, { last, winLine, playable, who = "" }) {
    const win = new Set((winLine || []).map(([r, c]) => r + "," + c));
    let html = "";
    for (let c = 0; c < COLS; c++) {
      let target = -1;
      for (let r = ROWS - 1; r >= 0; r--)
        if (!board[r][c]) {
          target = r;
          break;
        }
      html += `<button class="fr-col" data-col="${c}" ${playable && target >= 0 ? "" : "disabled"} aria-label="${target < 0 ? `Column ${c + 1} is full` : playable ? `Drop ${who || "disc"} in column ${c + 1}` : `Column ${c + 1}`}"${target < 0 ? ' title="Column full"' : ""}>`;
      for (let r = 0; r < ROWS; r++) {
        const v = board[r][c];
        const cls = ["fr-cell"];
        if (r === target) cls.push("target");
        let disc = "";
        if (v) {
          const dc = ["disc", "d" + v];
          if (last && last.r === r && last.c === c) dc.push("new");
          if (win.has(r + "," + c)) dc.push("win");
          disc = `<span class="${dc.join(" ")}" style="--fall:${r + 1}"></span>`;
        }
        html += `<span class="${cls.join(" ")}">${disc}</span>`;
      }
      html += "</button>";
    }
    return html;
  }

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "fr";
    root.innerHTML = `
      <div class="fr-head card" id="fr-head"></div>
      <div class="fr-status" id="fr-status" aria-live="polite"></div>
      <div class="fr-board-wrap"><div class="fr-board" id="fr-board"></div></div>`;
    stage.appendChild(root);
    root.addEventListener("click", (e) => {
      const col = e.target.closest(".fr-col");
      if (!S || !S.game) return;
      const g = S.game;
      if (!col || col.disabled) return;
      if (g.myIndex !== g.turn) return;
      app.socket.emit("action", { type: "drop", col: Number(col.dataset.col) });
    });
    clock = setInterval(tickClock, 250);
  }

  function tickClock() {
    if (!root || !S || !S.game) return;
    const el = root.querySelector("[data-timer]");
    if (!el) return;
    const left = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
    el.textContent = left + "s";
    document.getElementById("header-timer").textContent =
      Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
    el.classList.toggle("hurry", left <= 5);
  }

  function playerHTML(p, i, g) {
    const m = app.member(p.id);
    const active = g.turn === i;
    const timer =
      active && g.timeLeft !== null
        ? '<span class="fr-timer" data-timer></span>'
        : "";
    return `<div class="fr-player ${active ? "active" : ""} ${m && !m.connected ? "offline" : ""}">
      <span class="mini-disc big d${i + 1}"></span>
      ${app.avatarHTML(p.avatar)}
      <div><b>${app.esc(p.name)}</b>${p.id === S.you ? " <small>(you)</small>" : ""}<div class="muted">${m ? m.score : 0} ${m && m.score === 1 ? "win" : "wins"}</div></div>
      ${timer}
    </div>`;
  }

  function update(state) {
    S = state;
    const g = S.game;
    if (!g) return;
    const myTurn = g.myIndex === g.turn;
    if (g.timeLeft !== null) deadline = performance.now() + g.timeLeft;
    root.querySelector("#fr-head").innerHTML =
      `${playerHTML(g.players[0], 0, g)}<div class="fr-vs">VS</div>${playerHTML(g.players[1], 1, g)}`;
    // Name the colour in words too, so nobody has to match disc colours to know which side is theirs.
    const COLOR_NAMES = ["Red", "Yellow"];
    const disc = (i) => `<span class="mini-disc d${i + 1}" aria-hidden="true"></span>`;
    const turnName = app.esc(g.players[g.turn].name);
    const turnColor = `${disc(g.turn)} ${COLOR_NAMES[g.turn]}`;
    root.querySelector("#fr-status").innerHTML =
      g.myIndex < 0
        ? `You're watching. <b>${turnName}</b> (${turnColor}) is up.`
        : myTurn
          ? `<b>Your turn!</b> You are ${disc(g.myIndex)} <b>${COLOR_NAMES[g.myIndex]}</b>. Tap a column to drop a disc.`
          : `You are ${disc(g.myIndex)} ${COLOR_NAMES[g.myIndex]}. Waiting for <b>${turnName}</b>...`;
    root.querySelector("#fr-status").className =
      "fr-status" + (myTurn ? " mine" : "");
    const board = root.querySelector("#fr-board");
    board.className =
      "fr-board" +
      (myTurn ? " myturn" : "") +
      (g.myIndex >= 0 ? " c" + (g.myIndex + 1) : "");
    board.innerHTML = boardHTML(g.board, {
      last: g.moves !== lastMoves ? g.last : null,
      playable: myTurn,
      who: g.myIndex >= 0 ? COLOR_NAMES[g.myIndex] : "",
    });

    if (g.moves !== lastMoves && lastMoves >= 0) Sound.play("drop");
    lastMoves = g.moves;
    const tk = g.turn + ":" + g.moves;
    if (tk !== lastTurnKey) {
      lastTurnKey = tk;
      if (myTurn && g.moves > 0) setTimeout(() => Sound.play("join"), 250);
    }
    tickClock();
  }

  function unmount() {
    clearInterval(clock);
    if (root) root.remove();
    root = null;
    lastMoves = -1;
    lastTurnKey = "";
  }

  function renderResult(r, state, a) {
    const w = r.players.find((p) => p.id === r.winnerId);
    let title;
    if (r.draw) title = "It's a draw!";
    else if (r.winnerId === state.you) title = "You win!";
    else title = `${a.esc(w ? w.name : "Someone")} wins!`;
    const sub = r.forfeit ? '<p class="muted center">Won by forfeit.</p>' : "";
    const next = r.nextUp
      ? `<p class="center next-up">Winner stays: <b>${a.esc(r.nextUp)}</b> plays next.</p>`
      : "";
    return `<h2 class="result-title">${title}</h2>${sub}
      <div class="fr-result">
        ${r.players.map((p) => `<span class="fr-result-p ${p.id === r.winnerId ? "won" : ""}"><span class="mini-disc d${p.color}"></span>${a.esc(p.name)}</span>`).join('<span class="fr-vs small">vs</span>')}
      </div>
      <div class="fr-board-wrap small"><div class="fr-board done">${boardHTML(r.board, { winLine: r.winLine, playable: false })}</div></div>
      ${next}`;
  }

  function resultSound(r, state) {
    if (r.draw) return "reveal";
    const mine = r.players.some((p) => p.id === state.you);
    if (!mine) return "reveal";
    return r.winnerId === state.you ? "win" : "lose";
  }

  return {
    mount,
    update,
    unmount,
    renderResult,
    resultSound,
    scoreLabel: "wins",
  };
})();
