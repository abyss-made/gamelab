// Trivia Blitz screen.
window.GameUI = window.GameUI || {};
GameUI.trivia = (() => {
  const C = GameUI.common;
  let root = null;
  let app = null;
  let clock = null;
  let S = null;
  let lastKey = "";

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 tv";
    root.innerHTML = `<div class="b2-players card" id="tv-players"></div>
      <div class="card tv-main">
        <div class="hl-round" id="tv-round"></div>
        <h2 class="tv-q" id="tv-q"></h2>
        <div class="tv-choices" id="tv-choices" role="group" aria-label="Answer choices"></div>
        <div class="hl-status" id="tv-status" aria-live="polite"></div>
      </div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-ans]");
      if (!b || b.disabled || !S) return;
      app.socket.emit("action", { type: "answer", choice: Number(b.dataset.ans) });
    });
    document.addEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (!root || !S || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || "").toUpperCase())) return;
    const i = "1234".indexOf(e.key);
    if (i < 0) return;
    const b = root.querySelector(`[data-ans="${i}"]`);
    if (b && !b.disabled) b.click();
  }

  function update(state) {
    S = state;
    const g = S.game;
    clock.set(g.timeLeft);
    root.querySelector("#tv-players").innerHTML = g.players
      .map((p) => C.playerChip(app, p, { extra: p.streak > 1 ? `<span class="hl-streak" title="Streak">×${p.streak}</span>` : "", sub: `${p.points} pts` + (g.phase === "ask" && p.locked && !p.out ? " · locked in" : "") }))
      .join("");
    root.querySelector("#tv-round").innerHTML = `Question ${g.round} of ${g.total} · ${app.esc(g.category)} <span class="fr-timer" data-timer></span>`;
    root.querySelector("#tv-q").textContent = g.question;
    const me = g.myIndex >= 0 ? g.players[g.myIndex] : null;
    const revealed = g.phase === "reveal" && g.reveal;
    const canPick = !!me && !me.out && g.phase === "ask" && g.myPick === null;
    root.querySelector("#tv-choices").innerHTML = g.choices
      .map((c, i) => {
        const cls = ["btn", "tv-choice"];
        if (g.myPick === i) cls.push("picked");
        if (revealed) cls.push(i === g.reveal.correct ? "right" : g.myPick === i ? "wrong" : "dim");
        return `<button type="button" class="${cls.join(" ")}" data-ans="${i}" aria-pressed="${g.myPick === i}" ${canPick ? "" : "disabled"}><kbd aria-hidden="true">${i + 1}</kbd> ${app.esc(c)}</button>`;
      })
      .join("");
    let msg;
    if (!me) msg = "You're watching.";
    else if (revealed) {
      const mine = g.reveal.results.find((x) => x.id === S.you);
      msg = mine ? (mine.right ? `Correct! +${mine.gained}` : g.myPick === null ? "No answer. The correct choice is highlighted." : "Not this time.") : "";
    } else msg = g.myPick !== null ? "Locked in. Waiting for the others…" : "Pick an answer (or press 1 to 4). Faster is better!";
    root.querySelector("#tv-status").textContent = msg;
    const key = g.round + g.phase;
    if (revealed && key !== lastKey && me) {
      const mine = g.reveal.results.find((x) => x.id === S.you);
      if (mine) Sound.play(mine.right ? "join" : "lose");
    }
    lastKey = key;
  }

  function unmount() {
    document.removeEventListener("keydown", onKey);
    if (clock) clock.stop();
    if (root) root.remove();
    root = null;
    lastKey = "";
  }

  function renderResult(r, state, a) {
    return `<h2 class="result-title">${C.resultTitle(r, state, a)}</h2>${C.podium(r.standings, a, (p) => p.points, "pts")}<p class="muted center">${r.questions} questions played.</p>`;
  }
  return { mount, update, unmount, renderResult, resultSound: C.resultSound, scoreLabel: "pts" };
})();
