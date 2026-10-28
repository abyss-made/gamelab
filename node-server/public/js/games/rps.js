// Rock Paper Scissors Tournament screen: bracket, private pick, shared reveal.
window.GameUI = window.GameUI || {};
GameUI.rps = (() => {
  const C = GameUI.common;
  const ICON = { rock: "✊", paper: "✋", scissors: "✌️" };
  const LABEL = { rock: "Rock", paper: "Paper", scissors: "Scissors" };
  let root = null;
  let app = null;
  let S = null;
  let clock = null;
  let lastKey = "";

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 rps";
    root.innerHTML = `<div class="card rps-main">
        <div class="hl-round" id="rps-round"></div>
        <div class="rps-duel" id="rps-duel"></div>
        <div class="hl-status" id="rps-status" aria-live="polite"></div>
        <div class="rps-btns" id="rps-btns" role="group" aria-label="Choose your throw">${["rock", "paper", "scissors"]
          .map((m) => `<button type="button" class="btn btn-big rps-btn" data-move="${m}" aria-pressed="false"><span aria-hidden="true">${ICON[m]}</span> ${LABEL[m]}</button>`)
          .join("")}</div>
      </div>
      <div class="card"><h3 class="rps-h">Bracket</h3><div class="rps-bracket" id="rps-bracket"></div></div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-move]");
      if (!b || b.disabled || !S) return;
      app.socket.emit("action", { type: "pick", move: b.dataset.move });
    });
  }

  const nameOf = (id) => {
    if (!id) return "Bye";
    const p = S.game.players.find((x) => x.id === id);
    return p ? p.name : "?";
  };

  function bracketHTML(g, rounds) {
    return rounds
      .map((round, ri) => {
        const title = ri === g.roundsTotal - 1 ? "Final" : ri === g.roundsTotal - 2 ? "Semifinal" : "Round " + (ri + 1);
        return `<div class="rps-col"><b class="rps-coltitle">${title}</b>${round
          .map(
            (m) => `<div class="rps-match ${m.winner ? "done" : ""}">
              ${["a", "b"].map((s) => { const id = m[s]; const w = m.winner && m.winner === id; return `<div class="rps-slot ${w ? "won" : ""} ${id === S.you ? "me" : ""}"><span>${app.esc(nameOf(id))}</span><i>${id ? (s === "a" ? m.winsA : m.winsB) : ""}</i></div>`; }).join("")}
            </div>`,
          )
          .join("")}</div>`;
      })
      .join("");
  }

  function update(state) {
    S = state;
    const g = S.game;
    clock.set(g.timeLeft);
    const rname = g.round === g.roundsTotal - 1 ? "Final" : "Round " + (g.round + 1) + " of " + g.roundsTotal;
    root.querySelector("#rps-round").innerHTML = `${rname} · best of ${g.bestOf} <span class="fr-timer" data-timer></span>`;
    const mine = g.bracket[g.round].find((m) => !m.winner && (m.a === S.you || m.b === S.you));
    const duel = root.querySelector("#rps-duel");
    const revealed = g.phase === "reveal" && g.reveal;
    let status;
    if (mine) {
      const meA = mine.a === S.you;
      const opp = meA ? mine.b : mine.a;
      const rev = revealed ? g.reveal.results.find((x) => x.a === mine.a && x.b === mine.b) : null;
      const myMove = rev ? (meA ? rev.pickA : rev.pickB) : g.myPick;
      const oppMove = rev ? (meA ? rev.pickB : rev.pickA) : null;
      duel.innerHTML = `<div class="rps-side"><b>${app.esc(nameOf(S.you))}</b><span class="rps-hand">${myMove ? ICON[myMove] : "❔"}</span><i>${meA ? mine.winsA : mine.winsB}</i></div>
        <div class="hl-arrow" aria-hidden="true">vs</div>
        <div class="rps-side"><b>${app.esc(nameOf(opp))}</b><span class="rps-hand">${rev ? (oppMove ? ICON[oppMove] : "💤") : g.locked.includes(opp) ? "✔" : "❔"}</span><i>${meA ? mine.winsB : mine.winsA}</i></div>`;
      if (rev) {
        const o = rev.out;
        status = o === "tie" ? "Tie! Throw again." : o === "void" ? "Nobody picked. Throw again." : (o === "a") === meA ? "You win the throw!" : "You lose the throw.";
      } else status = g.myPick ? `You picked ${LABEL[g.myPick]}. Waiting for ${nameOf(opp)}…` : "Pick rock, paper or scissors.";
    } else {
      duel.innerHTML = "";
      const me = g.players.find((p) => p.id === S.you);
      if (!me) status = "You're watching the tournament.";
      else if (me.out || me.left) status = "You're out. Watch the bracket!";
      else status = "You have a bye or are waiting for the next round.";
    }
    root.querySelector("#rps-status").textContent = status;
    root.querySelectorAll("[data-move]").forEach((b) => {
      b.disabled = !(mine && g.phase === "pick" && !g.myPick);
      b.setAttribute("aria-pressed", String(g.myPick === b.dataset.move));
      b.classList.toggle("picked", g.myPick === b.dataset.move);
    });
    root.querySelector("#rps-btns").hidden = !mine;
    root.querySelector("#rps-bracket").innerHTML = bracketHTML(g, g.bracket);
    const key = g.throwNo + g.phase;
    if (revealed && key !== lastKey && mine) {
      const rev = g.reveal.results.find((x) => x.a === mine.a && x.b === mine.b);
      if (rev) Sound.play(rev.out === "tie" || rev.out === "void" ? "drop" : (rev.out === "a") === (mine.a === S.you) ? "join" : "lose");
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
    const rows = r.standings;
    const title = r.winnerId === state.you ? "You won the tournament!" : r.winnerId ? `${a.esc(r.standings[0].name)} wins the tournament!` : "Tournament over";
    return `<h2 class="result-title">${title}</h2>${C.podium(rows, a, (p) => p.points, "pts")}<p class="muted center">Best of ${r.bestOf}. A match win is 1 pt; the champion gets +2.</p>`;
  }
  function resultSound(r, state) {
    if (!r.standings.some((p) => p.id === state.you)) return "reveal";
    return r.winnerId === state.you ? "win" : "lose";
  }
  return { mount, update, unmount, renderResult, resultSound, scoreLabel: "pts" };
})();
