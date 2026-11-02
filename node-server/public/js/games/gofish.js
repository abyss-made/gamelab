// Go Fish screen.
window.GameUI = window.GameUI || {};
GameUI.gofish = (() => {
  const C = GameUI.common;
  let root = null;
  let app = null;
  let clock = null;
  let S = null;
  let pickRank = null;
  let pickTarget = null;

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 gf";
    root.innerHTML = `<div class="b2-players card" id="gf-players"></div>
      <div class="card gf-table">
        <div class="cs-status" id="gf-status" aria-live="polite"></div>
        <div class="gf-ask" id="gf-ask"></div>
        <ul class="gf-log" id="gf-log" aria-label="Recent moves"></ul>
      </div>
      <div class="card cs-hand-wrap"><div class="gf-hand" id="gf-hand" aria-label="Your hand"></div></div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("click", (e) => C.keepFocus(document.getElementById("stage"), () => onClick(e)));
  }

  function onClick(e) {
    if (!S) return;
    const g = S.game;
    if (g.turnId !== S.you) return;
    const r = e.target.closest("[data-rank]");
    const t = e.target.closest("[data-target]");
    if (r) pickRank = Number(r.dataset.rank);
    if (t) pickTarget = t.dataset.target;
    if (e.target.closest("#gf-go") && pickRank !== null && pickTarget) {
      app.socket.emit("action", { type: "ask", target: pickTarget, rank: pickRank });
      pickRank = null;
      pickTarget = null;
    }
    // Repaint the picks from the same state; the clock must keep counting from the last server update.
    repainting = true;
    update(S);
    repainting = false;
  }

  let repainting = false;

  function update(state) {
    S = state;
    const g = S.game;
    const mine = g.turnId === S.you;
    if (!repainting) clock.set(g.timeLeft);
    root.querySelector("#gf-players").innerHTML = g.players
      .map((p) => C.playerChip(app, p, { active: p.id === g.turnId, extra: `<span class="gf-books" title="Books">${p.books.map((r) => `<i>${C.rankLabel(r)}</i>`).join("")}</span>`, sub: `${p.count} cards · ${p.books.length} ${p.books.length === 1 ? "book" : "books"}` }))
      .join("");
    const turn = g.players.find((p) => p.id === g.turnId);
    const ranks = g.hand ? [...new Set(g.hand.map((c) => c.r))] : [];
    if (!mine || (pickRank !== null && !ranks.includes(pickRank))) pickRank = null;
    const targets = g.players.filter((p) => p.id !== S.you && !p.out && p.count > 0);
    if (!mine || (pickTarget && !targets.some((p) => p.id === pickTarget))) pickTarget = null;
    if (mine && !pickTarget && targets.length === 1) pickTarget = targets[0].id;
    root.querySelector("#gf-status").innerHTML = g.myIndex < 0
      ? `Watching. <b>${app.esc(turn ? turn.name : "")}</b> is up. <span class="fr-timer" data-timer></span>`
      : mine
        ? `<b>Your turn.</b> Pick a rank from your hand and a player to ask. <span class="fr-timer" data-timer></span>`
        : `Waiting for <b>${app.esc(turn ? turn.name : "")}</b>. <span class="fr-timer" data-timer></span>`;
    root.querySelector("#gf-status").className = "cs-status" + (mine ? " mine" : "");
    const ask = root.querySelector("#gf-ask");
    if (mine) {
      ask.innerHTML = `<div class="gf-row"><span>Ask for</span>${ranks.map((r) => `<button type="button" class="gf-chip ${pickRank === r ? "on" : ""}" data-rank="${r}" aria-pressed="${pickRank === r}">${C.rankLabel(r)}</button>`).join("")}</div>
        <div class="gf-row"><span>From</span>${targets.map((p) => `<button type="button" class="gf-chip ${pickTarget === p.id ? "on" : ""}" data-target="${p.id}" aria-pressed="${pickTarget === p.id}">${app.esc(p.name)}</button>`).join("")}</div>
        <button type="button" class="btn" id="gf-go" ${pickRank !== null && pickTarget ? "" : "disabled"}>Ask${pickRank !== null ? " for " + C.rankWord(pickRank) + "s" : ""}</button>`;
    } else ask.innerHTML = `<p class="muted center">Deck: ${g.deckCount} cards</p>`;
    root.querySelector("#gf-log").innerHTML = g.log.slice().reverse().map((l) => `<li>${app.esc(l)}</li>`).join("");
    root.querySelector("#gf-hand").innerHTML = g.hand
      ? g.hand.map((c) => C.playingCard(c)).join("") || '<p class="muted">No cards in hand.</p>'
      : '<p class="muted">You\'re watching. Hands are private.</p>';
    if (!repainting) clock.set(g.timeLeft);
  }

  function unmount() {
    if (clock) clock.stop();
    if (root) root.remove();
    root = null;
    pickRank = pickTarget = null;
  }

  function renderResult(r, state, a) {
    return `<h2 class="result-title">${C.resultTitle(r, state, a)}</h2>${r.forfeit ? '<p class="muted center">Won because the others left.</p>' : ""}
      ${C.podium(r.standings, a, (p) => p.books.length, "books")}`;
  }
  return { mount, update, unmount, renderResult, resultSound: C.resultSound, scoreLabel: "books" };
})();
