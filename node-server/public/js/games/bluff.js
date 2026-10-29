// Bluff Battle screen: write a believable fake, vote for the real answer, see who fooled whom.
window.GameUI = window.GameUI || {};
GameUI.bluff = (() => {
  const C = GameUI.common;
  let root = null;
  let app = null;
  let clock = null;
  let S = null;
  let key = "";

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 bl";
    root.innerHTML = `<div class="b2-players card" id="bl-players"></div>
      <div class="card bl-main">
        <div class="hl-round" id="bl-round"></div>
        <p class="bl-question" id="bl-q"></p>
        <div id="bl-body"></div>
        <div class="hl-status" id="bl-status" aria-live="polite"></div>
      </div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-opt]");
      if (!b || b.disabled || !S) return;
      app.socket.emit("action", { type: "vote", option: Number(b.dataset.opt) });
    });
  }

  function update(state) {
    S = state;
    const g = S.game;
    clock.set(g.timeLeft);
    const me = g.myIndex >= 0 ? g.players[g.myIndex] : null;
    root.querySelector("#bl-players").innerHTML = g.players
      .map((p) => C.playerChip(app, p, { sub: `${p.points} pts` + (g.phase !== "reveal" && p.locked && !p.out ? " · locked in" : "") }))
      .join("");
    root.querySelector("#bl-round").innerHTML = `Question ${g.round} of ${g.rounds} · ${g.phase === "bluff" ? "Write a bluff" : g.phase === "vote" ? "Find the real answer" : "The truth"} <span class="fr-timer" data-timer></span>`;
    root.querySelector("#bl-q").textContent = g.question;
    const body = root.querySelector("#bl-body");
    const status = root.querySelector("#bl-status");
    if (g.phase === "bluff") {
      const k = "b" + g.round + (g.myFake ? "d" : "");
      if (k !== key) {
        key = k;
        if (me && !me.out && !g.myFake) {
          body.innerHTML = `<form class="ws-form" id="bl-form" autocomplete="off"><label class="sr-only" for="bl-input">Your fake answer</label><input id="bl-input" type="text" maxlength="40" placeholder="Type a convincing fake answer"><button class="btn" type="submit">Submit</button></form>`;
          body.querySelector("#bl-form").addEventListener("submit", (e) => {
            e.preventDefault();
            const t = body.querySelector("#bl-input").value.trim();
            if (t) app.socket.emit("action", { type: "bluff", text: t });
          });
          if (matchMedia("(pointer:fine)").matches) body.querySelector("#bl-input").focus();
        } else body.innerHTML = g.myFake ? `<p class="bl-mine">Your bluff: <b>${app.esc(g.myFake)}</b></p>` : "";
      }
      status.textContent = !me ? "You're watching." : g.myFake ? "Locked in. Waiting for the others…" : "Make up an answer that could fool your friends. Don't use the real one!";
    } else if (g.phase === "vote") {
      const k = "v" + g.round + ":" + g.myVote;
      if (k !== key) {
        key = k;
        const can = me && !me.out && g.myVote === null;
        body.innerHTML = `<ul class="bl-options">${g.options
          .map((o) => `<li><button class="btn btn-big ${g.myVote === o.i ? "picked" : "btn-ghost"}" data-opt="${o.i}" ${!can || o.mine ? "disabled" : ""} aria-pressed="${g.myVote === o.i}">${app.esc(o.text)}${o.mine ? " <small>(yours)</small>" : ""}</button></li>`)
          .join("")}</ul>`;
      }
      status.textContent = !me ? "You're watching." : g.myVote !== null ? "Vote locked in. Waiting for the others…" : "Which one is the real answer? You can't vote for your own.";
    } else {
      const k = "r" + g.round;
      if (k !== key) {
        key = k;
        const name = (id) => {
          const p = g.players.find((x) => x.id === id);
          return p ? app.esc(p.name) : "?";
        };
        body.innerHTML = `<ul class="bl-options reveal">${g.reveal.options
          .map(
            (o) => `<li class="${o.real ? "real" : ""}"><div class="bl-opt"><b>${app.esc(o.text)}</b>${o.real ? ' <span class="bl-tag">✔ Real answer</span>' : `<small> bluff by ${o.authors.map(name).join(" & ")}</small>`}</div><div class="muted">${o.voters.length ? "Voted by " + o.voters.map(name).join(", ") : "No votes"}</div></li>`,
          )
          .join("")}</ul><ol class="bl-gains">${g.players.filter((p) => g.reveal.gains[p.id]).map((p) => `<li>${app.esc(p.name)} <b>+${g.reveal.gains[p.id]}</b></li>`).join("")}</ol>`;
        if (me) Sound.play(g.reveal.options.some((o) => o.real && o.voters.includes(S.you)) ? "join" : "drop");
      }
      status.textContent = me && g.reveal.gains[S.you] ? `You scored ${g.reveal.gains[S.you]} this round.` : "";
    }
    clock.set(g.timeLeft);
  }

  function unmount() {
    if (clock) clock.stop();
    if (root) root.remove();
    root = null;
    key = "";
  }
  function renderResult(r, state, a) {
    return `<h2 class="result-title">${C.resultTitle(r, state, a)}</h2>${C.podium(r.standings, a, (p) => p.points, "pts")}<p class="muted center">${r.rounds} questions played.</p>`;
  }
  return { mount, update, unmount, renderResult, resultSound: C.resultSound, scoreLabel: "pts" };
})();
