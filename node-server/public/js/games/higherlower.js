// Higher or Lower screen.
window.GameUI = window.GameUI || {};
GameUI.higherlower = (() => {
  const C = GameUI.common;
  let root = null;
  let app = null;
  let clock = null;
  let S = null;
  let lastKey = "";

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 hl";
    root.innerHTML = `<div class="b2-players card" id="hl-players"></div>
      <div class="card hl-main">
        <div class="hl-round" id="hl-round"></div>
        <div class="hl-cards"><div id="hl-current"></div><div class="hl-arrow" aria-hidden="true">→</div><div id="hl-next"></div></div>
        <div class="hl-status" id="hl-status" aria-live="polite"></div>
        <div class="hl-btns"><button class="btn btn-big" data-dir="higher">Higher ▲</button><button class="btn btn-big btn-ghost" data-dir="lower">Lower ▼</button></div>
      </div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-dir]");
      if (!b || b.disabled || !S) return;
      app.socket.emit("action", { type: "guess", dir: b.dataset.dir });
    });
  }

  function update(state) {
    S = state;
    const g = S.game;
    clock.set(g.timeLeft);
    root.querySelector("#hl-players").innerHTML = g.players
      .map((p) => C.playerChip(app, p, { extra: p.streak ? `<span class="hl-streak" title="Streak">×${p.streak}</span>` : "", sub: `${p.points} pts` + (p.locked && g.phase === "guess" && !p.out ? " · locked in" : "") }))
      .join("");
    root.querySelector("#hl-round").innerHTML = `Card ${g.round} of ${g.rounds} <span class="fr-timer" data-timer></span>`;
    root.querySelector("#hl-current").innerHTML = C.playingCard(g.current, "big");
    const next = root.querySelector("#hl-next");
    const revealed = g.phase === "reveal" && g.reveal;
    next.innerHTML = revealed ? C.playingCard(g.reveal.card, "big flip") : C.cardBack("big");
    const me = g.myIndex >= 0 ? g.players[g.myIndex] : null;
    const canGuess = me && !me.out && g.phase === "guess" && !g.myGuess;
    root.querySelectorAll("[data-dir]").forEach((b) => {
      b.disabled = !canGuess;
      b.setAttribute("aria-pressed", String(g.myGuess === b.dataset.dir));
      b.classList.toggle("picked", g.myGuess === b.dataset.dir);
    });
    let msg;
    if (!me) msg = "You're watching.";
    else if (me.out) msg = "You're out of this game.";
    else if (g.phase === "reveal") {
      const mine = g.reveal.results.find((x) => x.id === S.you);
      msg = mine ? ({ right: `Correct! +${mine.gained}`, wrong: "Wrong. Streak reset.", miss: "No guess. Streak reset.", push: "Same rank: no change." })[mine.outcome] : "";
    } else msg = g.myGuess ? `You picked ${g.myGuess}. Waiting for the others…` : "Will the next card be higher or lower? Aces are high.";
    root.querySelector("#hl-status").textContent = msg;
    const key = revealed ? "r" + g.round : "g" + g.round;
    if (revealed && key !== lastKey) {
      const mine = g.reveal.results.find((x) => x.id === S.you);
      if (mine) Sound.play(mine.outcome === "right" ? "join" : mine.outcome === "wrong" ? "lose" : "drop");
    }
    lastKey = key;
    clock.set(g.timeLeft);
  }

  function unmount() {
    if (clock) clock.stop();
    if (root) root.remove();
    root = null;
    lastKey = "";
  }

  function renderResult(r, state, a) {
    return `<h2 class="result-title">${C.resultTitle(r, state, a)}</h2>${C.podium(r.standings, a, (p) => p.points, "pts")}<p class="muted center">${r.rounds} cards played.</p>`;
  }
  return { mount, update, unmount, renderResult, resultSound: C.resultSound, scoreLabel: "pts" };
})();
