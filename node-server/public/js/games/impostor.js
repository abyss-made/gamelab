// The Impostor screen: secret role card, clue turns, discussion (room chat), vote and results.
window.GameUI = window.GameUI || {};
GameUI.impostor = (() => {
  const C = GameUI.common;
  let root = null;
  let app = null;
  let clock = null;
  let S = null;
  let key = "";

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 im";
    root.innerHTML = `<div class="b2-players card" id="im-players"></div>
      <div class="card im-main">
        <div class="hl-round" id="im-round"></div>
        <div class="im-role" id="im-role" aria-live="polite"></div>
        <ul class="im-clues" id="im-clues"></ul>
        <div id="im-body"></div>
        <div class="hl-status" id="im-status" aria-live="polite"></div>
      </div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("click", (e) => {
      const v = e.target.closest("[data-vote]");
      if (v && !v.disabled) app.socket.emit("action", { type: "vote", target: v.dataset.vote });
      if (e.target.closest("#im-ready")) app.socket.emit("action", { type: "ready" });
    });
  }

  const nameOf = (g, id) => {
    const p = g.players.find((x) => x.id === id);
    return p ? app.esc(p.name) : "?";
  };

  function update(state) {
    S = state;
    const g = S.game;
    clock.set(g.timeLeft);
    const me = g.myIndex >= 0 ? g.players[g.myIndex] : null;
    root.querySelector("#im-players").innerHTML = g.players
      .map((p) =>
        C.playerChip(app, p, {
          active: p.id === g.turnId,
          sub: `${p.points} pts` + (p.id === g.turnId ? " · giving a clue" : "") + (g.phase === "vote" && p.voted ? " · voted" : "") + (g.phase === "discuss" && g.ready.includes(p.id) ? " · ready" : ""),
        }),
      )
      .join("");
    const phaseName = { clue: "Clues", discuss: "Discussion", vote: "Vote", guess: "Last chance", result: "Results" }[g.phase];
    root.querySelector("#im-round").innerHTML = `Round ${g.round} of ${g.rounds} · ${phaseName} <span class="fr-timer" data-timer></span>`;
    let role;
    if (!me || me.out) role = `<div class="im-card">You're watching. Category: <b>${app.esc(g.category)}</b></div>`;
    else if (g.role === "impostor") role = `<div class="im-card impostor">You are the <b>IMPOSTOR</b>. Category: <b>${app.esc(g.category)}</b>. Blend in!</div>`;
    else role = `<div class="im-card crew">Category: <b>${app.esc(g.category)}</b> · Secret word: <b>${app.esc(g.word || "")}</b></div>`;
    root.querySelector("#im-role").innerHTML = role;
    root.querySelector("#im-clues").innerHTML = g.clues.map((c) => `<li><b>${nameOf(g, c.id)}</b>: ${app.esc(c.text)}</li>`).join("");
    const body = root.querySelector("#im-body");
    const status = root.querySelector("#im-status");
    const myTurn = g.phase === "clue" && g.turnId === S.you;
    const k = [g.round, g.phase, myTurn, g.myVote, g.clues.length, g.ready.includes(S.you), g.result ? 1 : 0].join("|");
    if (k !== key) {
      key = k;
      if (g.phase === "clue" && myTurn) {
        body.innerHTML = `<form class="ws-form" id="im-form" autocomplete="off"><label class="sr-only" for="im-input">Your clue</label><input id="im-input" type="text" maxlength="30" placeholder="One word or short phrase"><button class="btn" type="submit">Give clue</button></form>`;
        body.querySelector("#im-form").addEventListener("submit", (e) => {
          e.preventDefault();
          const t = body.querySelector("#im-input").value.trim();
          if (t) app.socket.emit("action", { type: "clue", text: t });
        });
        if (matchMedia("(pointer:fine)").matches) body.querySelector("#im-input").focus();
      } else if (g.phase === "discuss") {
        body.innerHTML = me && !me.out ? `<button class="btn" id="im-ready" ${g.ready.includes(S.you) ? "disabled" : ""}>${g.ready.includes(S.you) ? "Waiting for others…" : "I'm ready to vote"}</button>` : "";
      } else if (g.phase === "vote") {
        const can = me && !me.out && !g.myVote;
        body.innerHTML = `<ul class="im-votes">${g.players.filter((p) => !p.out).map((p) => `<li><button class="btn ${g.myVote === p.id ? "picked" : "btn-ghost"}" data-vote="${p.id}" ${!can || p.id === S.you ? "disabled" : ""}>${app.esc(p.name)}</button></li>`).join("")}</ul>`;
      } else if (g.phase === "guess") {
        if (g.role === "impostor") {
          body.innerHTML = `<form class="ws-form" id="im-gform" autocomplete="off"><label class="sr-only" for="im-guess">Guess the secret word</label><input id="im-guess" type="text" maxlength="30" placeholder="Guess the secret word"><button class="btn" type="submit">Guess</button></form>`;
          body.querySelector("#im-gform").addEventListener("submit", (e) => {
            e.preventDefault();
            const t = body.querySelector("#im-guess").value.trim();
            if (t) app.socket.emit("action", { type: "guess", text: t });
          });
        } else body.innerHTML = "";
      } else if (g.phase === "result") {
        const r = g.result;
        body.innerHTML = `<div class="im-result"><p>The impostor was <b>${nameOf(g, r.impostorId)}</b>. The word was <b>${app.esc(r.word)}</b>.</p>
          <p>${r.voided ? "The impostor left, so this round doesn't count." : r.stole ? `${nameOf(g, r.impostorId)} guessed the word and steals it!` : r.caught ? "The crew caught the impostor!" : "The impostor got away!"}${r.guess && !r.stole ? ` (Guessed “${app.esc(r.guess)}”.)` : ""}</p>
          <ul class="bl-gains">${g.players.filter((p) => r.gains[p.id]).map((p) => `<li>${app.esc(p.name)} <b>+${r.gains[p.id]}</b></li>`).join("")}</ul></div>`;
        if (me) Sound.play(r.gains[S.you] ? "join" : "drop");
      } else body.innerHTML = "";
    }
    status.textContent = !me || me.out ? "You're watching."
      : g.phase === "clue" ? (myTurn ? "Your turn: give a clue." : "Waiting for the next clue…")
      : g.phase === "discuss" ? "Discuss in the chat. Who doesn't know the word?"
      : g.phase === "vote" ? (g.myVote ? "Vote locked in." : "Vote for who you think is the impostor.")
      : g.phase === "guess" ? (g.role === "impostor" ? "You were caught! Guess the word to steal the win." : "The impostor is making a last guess…")
      : "";
    clock.set(g.timeLeft);
  }

  function unmount() {
    if (clock) clock.stop();
    if (root) root.remove();
    root = null;
    key = "";
  }
  const chatPlaceholder = (st) => (st.game && st.game.phase === "discuss" ? "Discuss who the impostor is…" : null);
  function renderResult(r, state, a) {
    return `<h2 class="result-title">${C.resultTitle(r, state, a)}</h2>${C.podium(r.standings, a, (p) => p.points, "pts")}<p class="muted center">${r.rounds} rounds played.</p>`;
  }
  return { mount, update, unmount, renderResult, chatPlaceholder, resultSound: C.resultSound, scoreLabel: "pts" };
})();
