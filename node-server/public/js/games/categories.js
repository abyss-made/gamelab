// Categories Rush screen.
window.GameUI = window.GameUI || {};
GameUI.categories = (() => {
  const C = GameUI.common;
  let root = null;
  let app = null;
  let clock = null;
  let S = null;
  let roundKey = "";
  let sendTimer = null;

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 cr";
    root.innerHTML = `<div class="card cr-head" id="cr-head"></div><div class="card cr-body" id="cr-body"></div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("input", (e) => {
      if (e.target.matches("[data-cat]")) {
        clearTimeout(sendTimer);
        sendTimer = setTimeout(sendAnswers, 250);
      }
    });
    root.addEventListener("focusout", (e) => e.target.matches("[data-cat]") && sendAnswers());
    root.addEventListener("click", (e) => {
      if (e.target.closest("#cr-done")) {
        sendAnswers(true);
      }
    });
  }

  function values() {
    return [...root.querySelectorAll("[data-cat]")].map((i) => i.value);
  }
  function sendAnswers(done) {
    clearTimeout(sendTimer);
    if (!root || !S || S.game.phase !== "answer" || S.game.myIndex < 0) return;
    app.socket.emit("action", done ? { type: "answers", answers: values(), done: true } : { type: "answers", answers: values() });
  }

  function update(state) {
    S = state;
    const g = S.game;
    clock.set(g.timeLeft);
    root.querySelector("#cr-head").innerHTML = `<div class="cr-letter" aria-label="Letter ${g.letter}">${g.letter}</div>
      <div><b>Round ${g.round} of ${g.rounds}</b><div class="muted">${g.phase === "answer" ? "Every answer must start with this letter." : "Round results"}</div></div>
      <span class="fr-timer" data-timer></span>
      <div class="cr-who">${g.players.filter((p) => !p.out).map((p) => `<span class="cr-dot ${p.done || g.phase === "review" ? "done" : ""}" title="${app.esc(p.name)}${p.done ? " is done" : ""}">${app.esc(p.name.slice(0, 1))}</span>`).join("")}</div>`;
    const body = root.querySelector("#cr-body");
    if (g.phase === "answer") {
      const key = "a" + g.round;
      if (key !== roundKey) {
        roundKey = key;
        body.innerHTML = `<div class="cr-grid">${g.cats
          .map((c, i) => `<label class="cr-cell"><span>${app.esc(c)}</span><input data-cat="${i}" type="text" maxlength="30" autocomplete="off" autocapitalize="words" placeholder="${g.letter}…" ${g.myIndex < 0 ? "disabled" : ""}></label>`)
          .join("")}</div>
          <div class="cr-actions"><p class="muted" id="cr-note"></p><button class="btn" id="cr-done" ${g.myIndex < 0 ? "disabled" : ""}>I'm done</button></div>`;
        const first = body.querySelector("input");
        if (first && g.myIndex >= 0) first.focus({ preventScroll: true });
      }
      const done = g.myDone;
      body.querySelectorAll("input").forEach((i) => (i.readOnly = done));
      body.querySelector("#cr-done").disabled = done || g.myIndex < 0;
      body.querySelector("#cr-note").textContent = g.myIndex < 0 ? "You're watching. Answers stay hidden until the round ends." : done ? "Locked in. Waiting for the others…" : "Unique answers score 2. Matching answers score 1.";
    } else if (g.review) {
      roundKey = "r" + g.round;
      const rv = g.review;
      body.innerHTML = `<div class="cr-table-wrap"><table class="cr-table"><thead><tr><th>Player</th>${rv.cats.map((c) => `<th>${app.esc(c)}</th>`).join("")}<th>Round</th><th>Total</th></tr></thead><tbody>${rv.rows
        .map(
          (r) => `<tr class="${r.id === S.you ? "me" : ""}"><th>${app.esc(r.name)}</th>${r.cells.map((c) => `<td class="${c.status}">${c.text ? app.esc(c.text) : "–"}<small>${c.points ? "+" + c.points : ""}</small></td>`).join("")}<td><b>+${r.gained}</b></td><td>${r.total}</td></tr>`,
        )
        .join("")}</tbody></table></div><p class="muted center">Next round starts soon. Answers that match another player's score 1 instead of 2.</p>`;
    }
    clock.set(g.timeLeft);
  }

  function unmount() {
    clearTimeout(sendTimer);
    if (clock) clock.stop();
    if (root) root.remove();
    root = null;
    roundKey = "";
  }

  function renderResult(r, state, a) {
    return `<h2 class="result-title">${C.resultTitle(r, state, a)}</h2>${C.podium(r.standings, a, (p) => p.points, "pts")}`;
  }
  return { mount, update, unmount, renderResult, resultSound: C.resultSound, scoreLabel: "pts" };
})();
