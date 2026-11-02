// Color Stack screen: private hand, discard pile, draw pile.
window.GameUI = window.GameUI || {};
GameUI.colorstack = (() => {
  const C = GameUI.common;
  const NAMES = { r: "Red", b: "Blue", g: "Green", y: "Yellow", w: "Wild" };
  const LABEL = { S: "Skip", F: "Flip", D: "+2", W: "Wild", P: "+4" };
  let root = null;
  let app = null;
  let clock = null;
  let S = null;
  let pendingWild = null;

  const faceText = (c) => LABEL[c.v] || c.v;
  function cardHTML(c, { playable, big } = {}) {
    return `<button type="button" class="cs-card c-${c.c} ${playable ? "playable" : ""} ${big ? "big" : ""}" data-card="${c.id}" ${playable ? "" : "disabled"} aria-label="${NAMES[c.c]} ${faceText(c)}"><b>${faceText(c)}</b><small>${NAMES[c.c]}</small></button>`;
  }
  const topHTML = (c, color) => `<span class="cs-card c-${c.c} big static" role="img" aria-label="Top card: ${NAMES[c.c]} ${faceText(c)}"><b>${faceText(c)}</b><small>${NAMES[c.c]}</small></span><span class="cs-color c-${color}" aria-label="Current color ${NAMES[color]}">${NAMES[color]}</span>`;

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 cs";
    root.innerHTML = `<div class="b2-players card" id="cs-players"></div>
      <div class="card cs-table">
        <div class="cs-status" id="cs-status" aria-live="polite"></div>
        <div class="cs-piles"><button type="button" class="cs-deck" id="cs-draw" aria-label="Draw a card"><span class="pc back"></span><small id="cs-deckn"></small></button><div class="cs-top" id="cs-top"></div></div>
        <div class="cs-actions"><button class="btn btn-ghost" id="cs-pass" hidden>Keep &amp; pass</button></div>
      </div>
      <div class="card cs-hand-wrap"><div class="cs-hand" id="cs-hand" aria-label="Your hand"></div></div>
      <div class="cs-picker" id="cs-picker" hidden role="dialog" aria-label="Choose a color"><p>Choose a color</p>${["r", "b", "g", "y"].map((c) => `<button type="button" class="cs-pick c-${c}" data-color="${c}">${NAMES[c]}</button>`).join("")}<button type="button" class="btn btn-ghost btn-small" data-color="">Cancel</button></div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("click", (e) => {
      if (!S) return;
      const g = S.game;
      const mine = g.turnId === S.you;
      const col = e.target.closest("[data-color]");
      if (col) {
        if (col.dataset.color && pendingWild !== null) app.socket.emit("action", { type: "play", card: pendingWild, color: col.dataset.color });
        pendingWild = null;
        root.querySelector("#cs-picker").hidden = true;
        return;
      }
      const card = e.target.closest("[data-card]");
      if (card && !card.disabled && mine) {
        const c = g.hand.find((x) => x.id === Number(card.dataset.card));
        if (!c) return;
        if (c.c === "w") {
          pendingWild = c.id;
          root.querySelector("#cs-picker").hidden = false;
        } else app.socket.emit("action", { type: "play", card: c.id });
      } else if (e.target.closest("#cs-draw") && mine && g.drawn === null) app.socket.emit("action", { type: "draw" });
      else if (e.target.closest("#cs-pass") && mine) app.socket.emit("action", { type: "pass" });
    });
  }

  function update(state) {
    S = state;
    const g = S.game;
    const mine = g.turnId === S.you;
    clock.set(g.timeLeft);
    root.querySelector("#cs-players").innerHTML = g.players
      .map((p) => C.playerChip(app, p, { active: p.id === g.turnId, extra: `<span class="cs-count" title="Cards in hand">${p.count}</span>`, sub: p.count === 1 ? "One card left!" : `${p.count} cards` }))
      .join("");
    const turn = g.players.find((p) => p.id === g.turnId);
    const msg = g.myIndex < 0
      ? `Watching. <b>${app.esc(turn ? turn.name : "")}</b> is up. `
      : mine
        ? g.drawn !== null
          ? "<b>You drew a playable card.</b> Play it or keep it and pass. "
          : g.playable.length ? "<b>Your turn!</b> Play a highlighted card, or draw. " : "<b>Your turn.</b> Nothing to play: draw a card. "
        : `Waiting for <b>${app.esc(turn ? turn.name : "")}</b>. `;
    root.querySelector("#cs-status").innerHTML = msg + '<span class="fr-timer" data-timer></span>';
    root.querySelector("#cs-status").className = "cs-status" + (mine ? " mine" : "");
    root.querySelector("#cs-top").innerHTML = topHTML(g.top, g.color) + `<span class="cs-dir" title="Direction">${g.dir === 1 ? "⟳" : "⟲"}</span>`;
    root.querySelector("#cs-deckn").textContent = g.deckCount + " left";
    root.querySelector("#cs-draw").disabled = !(mine && g.drawn === null);
    root.querySelector("#cs-pass").hidden = !(mine && g.drawn !== null);
    const hand = root.querySelector("#cs-hand");
    hand.innerHTML = g.hand
      ? g.hand.map((c) => cardHTML(c, { playable: mine && g.playable.includes(c.id) })).join("") || '<p class="muted">No cards.</p>'
      : '<p class="muted">You\'re watching. Hands are private.</p>';
    if (!mine) {
      pendingWild = null;
      root.querySelector("#cs-picker").hidden = true;
    }
    clock.set(g.timeLeft);
  }

  function unmount() {
    if (clock) clock.stop();
    if (root) root.remove();
    root = null;
    pendingWild = null;
  }

  function renderResult(r, state, a) {
    const w = r.hands.find((h) => h.id === r.winnerId);
    return `<h2 class="result-title">${r.winnerId === state.you ? "You win!" : a.esc(w ? w.name : "Someone") + " wins!"}</h2>
      <p class="muted center">${r.forfeit ? "Won because the others left." : `Scored ${r.pts} points from the cards left in other hands.`}</p>
      <ol class="b2-podium">${[...r.hands].sort((x, y) => x.cards - y.cards).map((h) => `<li class="${h.id === state.you ? "me" : ""}"><span class="rank">${h.cards}</span>${a.avatarHTML(h.avatar)}<b>${a.esc(h.name)}</b><span class="pts">${h.cards} cards left (${h.value})</span></li>`).join("")}</ol>`;
  }
  return { mount, update, unmount, renderResult, resultSound: (r, s) => C.resultSound({ ...r, standings: r.hands }, s), scoreLabel: "pts" };
})();
