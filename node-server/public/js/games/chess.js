// Chess screen: tap a piece, then a highlighted square. Legal moves come from the server, so the
// client never decides what is allowed. Includes clocks, move list, draw offers and resignation.
window.GameUI = window.GameUI || {};
GameUI.chess = (() => {
  const C = GameUI.common;
  const GLYPH = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" };
  const WORD = { K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight", P: "pawn" };
  let root = null;
  let app = null;
  let S = null;
  let clock = null;
  let sel = -1;
  let pendingPromo = null;
  let stamp = 0;
  let tickTimer = null;
  let lastCount = -1;

  const name = (s) => "abcdefgh"[s & 7] + ((s >> 3) + 1);

  function boardHTML(g, { flip = false, playable = false, selected = -1, label = "Chess board" } = {}) {
    const legal = g.legal || {};
    const targets = new Set(selected >= 0 && legal[selected] ? legal[selected] : []);
    let html = `<div class="ch-board" role="group" aria-label="${label}">`;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const r = flip ? row : 7 - row;
        const f = flip ? 7 - col : col;
        const i = r * 8 + f;
        const p = g.board[i];
        const isT = targets.has(i);
        const can = playable && (legal[i] || isT);
        const cls = ["ch-sq", (r + f) % 2 === 0 ? "dark" : "light", g.last && (g.last.from === i || g.last.to === i) ? "last" : "", i === selected ? "sel" : "", isT ? (p ? "cap" : "target") : "", g.check === i ? "check" : ""].join(" ");
        const who = p ? `${p[0] === "w" ? "White" : "Black"} ${WORD[p[1]]}` : "empty";
        const coord = (col === 0 ? `<i class="rk">${r + 1}</i>` : "") + (row === 7 ? `<i class="fl">${"abcdefgh"[f]}</i>` : "");
        html += `<button type="button" class="${cls}" data-sq="${i}" aria-label="${name(i)}: ${who}${isT ? ", legal destination" : ""}" ${can ? "" : "disabled"}>${coord}${p ? `<span class="ch-piece ${p[0]}">${GameUI.art.chessPiece(p[1])}</span>` : isT ? '<span class="ck-dot"></span>' : ""}</button>`;
      }
    }
    return html + "</div>";
  }

  const fmt = (ms) => {
    const s = Math.ceil(ms / 1000);
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  };

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 ch";
    root.innerHTML = `<div class="ch-top card" id="ch-top"></div>
      <div class="ttt-status" id="ch-status" aria-live="polite"></div>
      <div class="ch-layout"><div id="ch-board"></div><div class="ch-side card"><div id="ch-offer"></div><ol class="ch-moves" id="ch-moves" aria-label="Move list"></ol><div class="board-actions" id="ch-actions"></div></div></div>
      <div class="ch-promo" id="ch-promo" hidden></div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    tickTimer = setInterval(drawClocks, 250);
    root.addEventListener("click", onClick);
  }

  function send(from, to, promo) {
    app.socket.emit("action", promo ? { type: "move", from, to, promo } : { type: "move", from, to });
  }

  function onClick(e) {
    const g = S && S.game;
    if (!g) return;
    const promo = e.target.closest("[data-promo]");
    if (promo && pendingPromo) {
      send(pendingPromo.from, pendingPromo.to, promo.dataset.promo);
      pendingPromo = null;
      sel = -1;
      root.querySelector("#ch-promo").hidden = true;
      return;
    }
    if (e.target.closest("#ch-promo-cancel")) {
      pendingPromo = null;
      root.querySelector("#ch-promo").hidden = true;
      return;
    }
    const b = e.target.closest("[data-sq]");
    if (b && !b.disabled && g.myIndex === g.turn) {
      const i = Number(b.dataset.sq);
      if (sel >= 0 && g.legal[sel] && g.legal[sel].includes(i)) {
        const piece = g.board[sel];
        if (piece && piece[1] === "P" && (i >> 3 === 7 || i >> 3 === 0)) {
          pendingPromo = { from: sel, to: i };
          showPromo(piece[0]);
          return;
        }
        send(sel, i);
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
    const act = e.target.closest("[data-act]");
    if (!act) return;
    const t = act.dataset.act;
    if (t === "resign") {
      if (act.dataset.armed) app.socket.emit("action", { type: "resign" });
      else {
        act.dataset.armed = "1";
        act.textContent = "Tap again to resign";
        setTimeout(() => { if (act.isConnected) { delete act.dataset.armed; act.textContent = "Resign"; } }, 3000);
      }
    } else if (t === "offer") app.socket.emit("action", { type: "offerDraw" });
    else if (t === "accept") app.socket.emit("action", { type: "acceptDraw" });
    else if (t === "decline") app.socket.emit("action", { type: "declineDraw" });
  }

  function showPromo(colour) {
    const el = root.querySelector("#ch-promo");
    el.hidden = false;
    el.innerHTML = `<div class="card"><b>Promote to</b><div class="ch-promo-row">${["Q", "R", "B", "N"].map((t) => `<button type="button" class="btn ch-promo-btn" data-promo="${t}" aria-label="${WORD[t]}"><span class="ch-piece ${colour}">${GameUI.art.chessPiece(t)}</span></button>`).join("")}</div><button type="button" class="btn btn-small btn-ghost" id="ch-promo-cancel">Cancel</button></div>`;
  }

  function paint() {
    const g = S.game;
    root.querySelector("#ch-board").innerHTML = boardHTML(g, { flip: g.myIndex === 1, playable: g.myIndex === g.turn, selected: sel });
  }

  function drawClocks() {
    if (!root || !S || !S.game) return;
    const g = S.game;
    root.querySelectorAll("[data-clock]").forEach((el) => {
      const i = Number(el.dataset.clock);
      if (!g.clocks) { el.textContent = ""; return; }
      const live = g.clocks[i] - (i === g.turn ? performance.now() - stamp : 0);
      el.textContent = fmt(Math.max(0, live));
      el.classList.toggle("hurry", live < 20000);
    });
  }

  function update(state) {
    S = state;
    const g = S.game;
    if (!g) return;
    stamp = performance.now();
    const myTurn = g.myIndex === g.turn;
    if (!myTurn || !g.legal[sel]) sel = -1;
    if (!myTurn || g.moves.length !== lastCount) {
      pendingPromo = null;
      root.querySelector("#ch-promo").hidden = true;
    }
    clock.set(g.clocks ? g.clocks[g.turn] : g.idleLeft);
    const order = g.myIndex === 1 ? [1, 0] : [0, 1]; // your side at the bottom, opponent on top
    root.querySelector("#ch-top").innerHTML = order
      .map((i) => C.playerChip(app, g.players[i], { active: g.turn === i, extra: `<span class="ch-key ${g.players[i].colour}" aria-hidden="true"></span>` + (g.clocks ? `<span class="ch-clock" data-clock="${i}"></span>` : ""), sub: g.players[i].colour === "w" ? "White" : "Black" }))
      .join("");
    const turnName = app.esc(g.players[g.turn].name);
    const st = root.querySelector("#ch-status");
    const chk = g.check >= 0 ? " <b>Check!</b>" : "";
    st.innerHTML = (g.myIndex < 0 ? `You're watching. <b>${turnName}</b> is up.` : myTurn ? "<b>Your turn!</b> Tap a piece, then a square." : `Waiting for <b>${turnName}</b>...`) + chk;
    st.className = "ttt-status" + (myTurn ? " mine" : "");
    paint();
    const list = root.querySelector("#ch-moves");
    list.innerHTML = g.moves.reduce((h, m, i) => (i % 2 === 0 ? h + `<li><span class="n">${i / 2 + 1}.</span> <span>${app.esc(m)}</span>` : h + ` <span>${app.esc(m)}</span></li>`), "") + (g.moves.length % 2 ? "</li>" : "");
    if (g.moves.length !== lastCount) list.scrollTop = list.scrollHeight;
    const offer = root.querySelector("#ch-offer");
    if (g.myIndex >= 0 && g.drawOffer >= 0 && g.drawOffer !== g.myIndex) offer.innerHTML = `<div class="ch-offer"><b>${app.esc(g.players[g.drawOffer].name)} offers a draw.</b><div><button type="button" class="btn btn-small" data-act="accept">Accept</button> <button type="button" class="btn btn-small btn-ghost" data-act="decline">Decline</button></div></div>`;
    else if (g.drawOffer >= 0) offer.innerHTML = '<p class="muted">Draw offer sent.</p>';
    else offer.innerHTML = "";
    root.querySelector("#ch-actions").innerHTML = g.myIndex >= 0 ? `<button type="button" class="btn btn-small btn-ghost" data-act="offer" ${g.canOffer ? "" : "disabled"}>Offer draw</button><button type="button" class="btn btn-small btn-ghost" data-act="resign">Resign</button>` : "";
    if (g.moves.length !== lastCount && lastCount >= 0) Sound.play("drop");
    lastCount = g.moves.length;
    drawClocks();
  }

  function unmount() {
    if (clock) clock.stop();
    clearInterval(tickTimer);
    if (root) root.remove();
    root = null;
    sel = -1;
    pendingPromo = null;
    lastCount = -1;
  }

  function renderResult(r, state, a) {
    const w = r.players.find((p) => p.id === r.winnerId);
    const title = r.draw ? "It's a draw!" : r.winnerId === state.you ? "You win!" : `${a.esc(w ? w.name : "Someone")} wins!`;
    const next = r.nextUp ? `<p class="center next-up">Winner stays: <b>${a.esc(r.nextUp)}</b> plays next.</p>` : "";
    return `<h2 class="result-title">${title}</h2><p class="muted center">${a.esc(r.reasonText)} · ${Math.ceil(r.moves.length / 2)} moves</p><div class="ch-small">${boardHTML({ board: r.board, last: r.last, legal: {}, check: -1 }, { label: "Final chess board" })}</div><p class="ch-final-moves muted">${r.moves.map((m, i) => (i % 2 ? "" : `${i / 2 + 1}. `) + a.esc(m)).join(" ")}</p>${next}`;
  }

  function resultSound(r, state) {
    if (r.draw || !r.players.some((p) => p.id === state.you)) return "reveal";
    return r.winnerId === state.you ? "win" : "lose";
  }

  return { mount, update, unmount, renderResult, resultSound, scoreLabel: "wins" };
})();
