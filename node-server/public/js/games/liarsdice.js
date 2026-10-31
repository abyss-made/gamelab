// Liar's Dice screen: your hidden dice, the current bid, bid controls and the showdown.
window.GameUI = window.GameUI || {};
GameUI.liarsdice = (() => {
  const C = GameUI.common;
  const PIPS = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  let root = null;
  let app = null;
  let clock = null;
  let S = null;
  let key = "";
  let qty = 1;
  let face = 2;
  let shownRound = -1;

  const die = (v, extra = "") => `<span class="ld-die ${extra}" role="img" aria-label="${v}">${PIPS[v] || "?"}<i>${v}</i></span>`;
  const nameOf = (g, id) => {
    const p = g.players.find((x) => x.id === id);
    return p ? app.esc(p.name) : "?";
  };
  const legal = (g, q, f) => !g.bid || q > g.bid.qty || (q === g.bid.qty && f > g.bid.face);

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 ld";
    root.innerHTML = `<div class="b2-players card" id="ld-players"></div>
      <div class="card ld-main">
        <div class="hl-round" id="ld-round"></div>
        <div class="ld-bid" id="ld-bid" aria-live="polite"></div>
        <div class="ld-hand" id="ld-hand"></div>
        <div id="ld-ctl"></div>
        <div id="ld-show"></div>
        <div class="hl-status" id="ld-status" aria-live="polite"></div>
      </div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-step],[data-face],[data-send]");
      if (!b || !S || b.disabled) return;
      if (b.dataset.step) qty = Math.max(1, Math.min(S.game.totalDice, qty + Number(b.dataset.step)));
      if (b.dataset.face) face = Number(b.dataset.face);
      if (b.dataset.send === "bid") app.socket.emit("action", { type: "bid", qty, face });
      if (b.dataset.send === "challenge") app.socket.emit("action", { type: "challenge" });
      key = "";
      update(S);
    });
  }

  function update(state) {
    S = state;
    const g = S.game;
    clock.set(g.timeLeft || null);
    const me = g.myIndex >= 0 ? g.players[g.myIndex] : null;
    root.querySelector("#ld-players").innerHTML = g.players
      .map((p) => C.playerChip(app, p, { active: p.id === g.turnId, extra: `<span class="ld-count" title="Dice left">🎲 ${p.diceCount}</span>`, sub: p.id === g.turnId ? "bidding…" : p.out ? "out" : "" }))
      .join("");
    root.querySelector("#ld-round").innerHTML = `Round ${g.round} · ${g.totalDice} dice in play${g.wild ? " · ones are wild" : ""} <span class="fr-timer" data-timer></span>`;
    root.querySelector("#ld-bid").innerHTML = g.bid ? `Current bid: <b>${g.bid.qty} × ${die(g.bid.face, "sm")}</b> by ${nameOf(g, g.bidderId)}` : "No bid yet.";
    const hand = root.querySelector("#ld-hand");
    hand.innerHTML = g.myDice.length ? `<span class="muted">Your dice (only you can see these)</span><div>${g.myDice.map((v) => die(v)).join("")}</div>` : "";
    const myTurn = g.phase === "bid" && g.turnId === S.you;
    // Keep a legal default selection ready.
    if (g.bid && !legal(g, qty, face)) {
      qty = g.bid.qty;
      face = g.bid.face + 1 > 6 ? ((qty += 1), 1) : g.bid.face + 1;
    }
    qty = Math.min(qty, Math.max(1, g.totalDice));
    const ctl = root.querySelector("#ld-ctl");
    const k = [g.round, g.phase, myTurn, qty, face, g.bid && g.bid.qty, g.bid && g.bid.face, g.totalDice].join("|");
    if (k !== key) {
      key = k;
      ctl.innerHTML = myTurn
        ? `<div class="ld-ctl"><div class="ld-qty"><button class="btn btn-ghost" data-step="-1" aria-label="Fewer dice">−</button><output aria-label="Quantity">${qty}</output><button class="btn btn-ghost" data-step="1" aria-label="More dice">+</button></div>
           <div class="ld-faces" role="group" aria-label="Face value">${[1, 2, 3, 4, 5, 6].map((f) => `<button class="btn btn-ghost ${f === face ? "picked" : ""}" data-face="${f}" aria-pressed="${f === face}" aria-label="Face ${f}">${PIPS[f]} ${f}</button>`).join("")}</div>
           <div class="ld-actions"><button class="btn btn-big" data-send="bid" ${legal(g, qty, face) ? "" : "disabled"}>Bid ${qty} × ${face}</button>${g.bid ? '<button class="btn btn-big btn-danger" data-send="challenge">Liar!</button>' : ""}</div></div>`
        : "";
    }
    const show = root.querySelector("#ld-show");
    if (g.phase === "reveal" && g.reveal) {
      const r = g.reveal;
      show.innerHTML = `<div class="ld-reveal"><p>${nameOf(g, r.challengerId)} called ${nameOf(g, r.bidderId)} a liar. The table holds <b>${r.count}</b> × ${die(r.bid.face, "sm")} vs a bid of <b>${r.bid.qty}</b>.</p>
        ${r.hands.map((h) => `<div class="ld-rhand"><b>${nameOf(g, h.id)}</b> ${h.dice.map((v) => die(v, (v === r.bid.face || (g.wild && v === 1 && r.bid.face !== 1)) ? "hit" : "")).join("")}</div>`).join("")}
        <p class="ld-loser">${r.bidHeld ? "The bid held!" : "It was a bluff!"} <b>${nameOf(g, r.loserId)}</b> loses a die.</p></div>`;
      if (shownRound !== g.round) {
        shownRound = g.round;
        Sound.play(r.loserId === S.you ? "lose" : "reveal");
      }
    } else show.innerHTML = "";
    root.querySelector("#ld-status").textContent = !me ? "You're watching." : me.out ? "You're out of dice." : g.phase === "reveal" ? "Next round starting…" : myTurn ? "Your turn: raise the bid or call the last bidder a liar." : "Waiting for the current bidder…";
    clock.set(g.timeLeft || null);
  }

  function unmount() {
    if (clock) clock.stop();
    if (root) root.remove();
    root = null;
    key = "";
    qty = 1;
    face = 2;
    shownRound = -1;
  }
  function renderResult(r, state, a) {
    const title = r.winnerId ? (r.winnerId === state.you ? "You win!" : `${a.esc((r.standings.find((p) => p.id === r.winnerId) || {}).name || "Someone")} wins!`) : "Game over";
    return `<h2 class="result-title">${title}</h2>${C.podium(r.standings, a, (p) => p.dice, "dice")}<p class="muted center">${r.rounds} rounds played.</p>`;
  }
  return { mount, update, unmount, renderResult, resultSound: C.resultSound, scoreLabel: "dice" };
})();
