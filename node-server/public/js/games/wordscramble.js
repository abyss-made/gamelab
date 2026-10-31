// Word Scramble screen.
window.GameUI = window.GameUI || {};
GameUI.wordscramble = (() => {
  const C = GameUI.common;
  let root = null;
  let app = null;
  let clock = null;
  let S = null;
  let lastRound = -1;

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 ws";
    root.innerHTML = `<div class="b2-players card" id="ws-players"></div>
      <div class="card ws-main">
        <div class="hl-round" id="ws-round"></div>
        <div class="ws-tiles" id="ws-tiles" aria-live="polite"></div>
        <form class="ws-form" id="ws-form" autocomplete="off">
          <label class="sr-only" for="ws-input">Your answer</label>
          <input id="ws-input" type="text" inputmode="text" maxlength="24" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="Type the word">
          <button class="btn" type="submit">Guess</button>
        </form>
        <div class="hl-status" id="ws-status" aria-live="polite"></div>
      </div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.querySelector("#ws-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = root.querySelector("#ws-input");
      const word = input.value.trim();
      if (!word || !S || S.game.phase !== "play" || S.game.solvedByMe) return;
      app.socket.emit("action", { type: "guess", word });
      input.value = "";
      input.focus();
    });
  }

  function update(state) {
    S = state;
    const g = S.game;
    clock.set(g.timeLeft);
    root.querySelector("#ws-players").innerHTML = g.players
      .map((p) => C.playerChip(app, p, { extra: p.solved && g.phase === "play" ? '<span title="Solved">✔</span>' : "", sub: `${p.points} pts` }))
      .join("");
    root.querySelector("#ws-round").innerHTML = `Word ${g.round} of ${g.rounds} · ${g.length} letters <span class="fr-timer" data-timer></span>`;
    const revealed = g.phase === "reveal" && g.reveal;
    root.querySelector("#ws-tiles").innerHTML = (revealed ? g.reveal.word.toUpperCase().split("") : g.letters)
      .map((ch) => `<span class="ws-tile ${revealed ? "ok" : ""}">${app.esc(ch)}</span>`)
      .join("");
    const me = g.myIndex >= 0 ? g.players[g.myIndex] : null;
    const input = root.querySelector("#ws-input");
    const canType = !!me && !me.out && g.phase === "play" && !g.solvedByMe;
    input.disabled = !canType;
    root.querySelector("#ws-form button").disabled = !canType;
    let msg;
    if (!me) msg = "You're watching.";
    else if (revealed) {
      const first = g.reveal.solvers[0] && g.players.find((p) => p.id === g.reveal.solvers[0]);
      msg = g.solvedByMe ? `You got it! +${g.myGain}` : "Time's up, you missed this one.";
      if (first) msg += ` First: ${first.name}.`;
    } else msg = g.solvedByMe ? `Solved! +${g.myGain}. Waiting for the others…` : "Unscramble the letters and press Enter.";
    root.querySelector("#ws-status").textContent = msg;
    if (g.round !== lastRound) {
      if (lastRound >= 0 && canType) input.focus({ preventScroll: true });
      lastRound = g.round;
    }
  }

  function unmount() {
    if (clock) clock.stop();
    if (root) root.remove();
    root = null;
    lastRound = -1;
  }

  function renderResult(r, state, a) {
    return `<h2 class="result-title">${C.resultTitle(r, state, a)}</h2>${C.podium(r.standings, a, (p) => p.points, "pts")}<p class="muted center">${r.rounds} words played.</p>`;
  }
  return { mount, update, unmount, renderResult, resultSound: C.resultSound, scoreLabel: "pts" };
})();
