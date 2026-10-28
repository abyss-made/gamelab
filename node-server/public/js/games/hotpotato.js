// Hot Potato screen: the bomb, the prompt, who holds it, and a form to answer and pass it on.
window.GameUI = window.GameUI || {};
GameUI.hotpotato = (() => {
  const C = GameUI.common;
  let root = null;
  let app = null;
  let clock = null;
  let S = null;
  let key = "";
  let target = null;
  let lastHolder = null;

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 hp";
    root.innerHTML = `<div class="b2-players card" id="hp-players"></div>
      <div class="card hp-main">
        <div class="hl-round" id="hp-round"></div>
        <div class="hp-bomb" id="hp-bomb" aria-hidden="true">💣</div>
        <p class="hp-prompt" id="hp-prompt"></p>
        <div class="hp-last" id="hp-last" aria-live="polite"></div>
        <div id="hp-body"></div>
        <div class="hl-status" id="hp-status" aria-live="polite"></div>
      </div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("click", (e) => {
      const t = e.target.closest("[data-to]");
      if (t && !t.disabled) {
        target = t.dataset.to;
        key = "";
        update(S);
        const i = root.querySelector("#hp-input");
        if (i) i.focus();
      }
    });
  }

  const nameOf = (g, id) => {
    const p = g.players.find((x) => x.id === id);
    return p ? app.esc(p.name) : "?";
  };

  function update(state) {
    S = state;
    const g = S.game;
    // Time shown is the hold limit only; the fuse itself is secret.
    clock.set(g.phase === "play" ? g.holdLeft : null);
    const me = g.myIndex >= 0 ? g.players[g.myIndex] : null;
    root.querySelector("#hp-players").innerHTML = g.players
      .map((p) => C.playerChip(app, p, { active: p.id === g.holderId && g.phase === "play", extra: `<span class="hp-lives" title="Lives left">${"♥".repeat(p.lives) || "✖"}</span>`, sub: p.id === g.holderId && g.phase === "play" ? "holding the bomb" : p.out ? "out" : "" }))
      .join("");
    root.querySelector("#hp-round").innerHTML = `Round ${g.round} <span class="fr-timer" data-timer></span>`;
    root.querySelector("#hp-bomb").classList.toggle("boom", g.phase === "boom");
    root.querySelector("#hp-bomb").textContent = g.phase === "boom" ? "💥" : "💣";
    root.querySelector("#hp-prompt").textContent = g.prompt + "!";
    root.querySelector("#hp-last").textContent = g.lastAnswer ? `${(g.players.find((p) => p.id === g.lastAnswer.by) || {}).name || "Someone"} said “${g.lastAnswer.text}”` : "";
    const holding = g.phase === "play" && g.holderId === S.you;
    const eligible = g.players.filter((p) => !p.out && p.id !== S.you).map((p) => p.id);
    // A recipient who left (or can no longer be picked) must not stay selected.
    if (!holding || !eligible.includes(target)) target = null;
    const body = root.querySelector("#hp-body");
    const k = [g.round, g.phase, holding, g.holderId, g.fromId, target, g.used, eligible.join(",")].join("|");
    if (k !== key) {
      key = k;
      // Re-rendering (e.g. choosing a recipient) must not wipe a half-typed answer.
      const old = body.querySelector("#hp-input");
      const typed = old ? old.value : "";
      if (holding) {
        const options = g.players.filter((p) => !p.out && p.id !== S.you);
        body.innerHTML = `<div class="hp-targets" role="group" aria-label="Pass to">${options.map((p) => `<button class="btn btn-ghost ${target === p.id ? "picked" : ""}" data-to="${p.id}" aria-pressed="${target === p.id}" ${p.id === g.fromId && options.length > 1 ? "disabled" : ""}>${app.esc(p.name)}</button>`).join("")}</div>
          <form class="ws-form" id="hp-form" autocomplete="off"><label class="sr-only" for="hp-input">Your answer</label><input id="hp-input" type="text" maxlength="30" placeholder="${app.esc(g.prompt)}"><button class="btn" type="submit">Pass!</button></form>`;
        body.querySelector("#hp-form").addEventListener("submit", (e) => {
          e.preventDefault();
          const answer = body.querySelector("#hp-input").value.trim();
          const to = target || (options.find((p) => p.id !== g.fromId) || options[0] || {}).id;
          if (answer && to) app.socket.emit("action", { type: "pass", to, answer });
        });
        const i = body.querySelector("#hp-input");
        if (i) {
          if (typed && g.holderId === lastHolder) i.value = typed;
          if (matchMedia("(pointer:fine)").matches) i.focus();
        }
        lastHolder = g.holderId;
      } else if (g.phase === "boom") {
        body.innerHTML = `<p class="hp-boom">💥 It blew up on <b>${nameOf(g, g.boom.id)}</b>${g.boom.out ? " who is out!" : "!"}</p>`;
        Sound.play(g.boom.id === S.you ? "lose" : "reveal");
      } else body.innerHTML = "";
    }
    root.querySelector("#hp-status").textContent = !me ? "You're watching." : me.out ? "You're out." : g.phase === "boom" ? "Next round starting…" : holding ? "You have the bomb! Answer and pick who gets it. Don't hold on too long!" : `${(g.players.find((p) => p.id === g.holderId) || {}).name || "Someone"} has the bomb.`;
  }

  function unmount() {
    if (clock) clock.stop();
    if (root) root.remove();
    root = null;
    key = "";
    target = null;
  }
  function renderResult(r, state, a) {
    const title = r.winnerId ? (r.winnerId === state.you ? "You win!" : `${a.esc((r.standings.find((p) => p.id === r.winnerId) || {}).name || "Someone")} wins!`) : "Game over";
    return `<h2 class="result-title">${title}</h2>${C.podium(r.standings, a, (p) => p.lives, "lives")}<p class="muted center">${r.rounds} rounds played.</p>`;
  }
  return { mount, update, unmount, renderResult, resultSound: C.resultSound, scoreLabel: "lives" };
})();
