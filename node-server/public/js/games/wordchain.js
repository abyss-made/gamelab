// Word Chain screen.
window.GameUI = window.GameUI || {};
GameUI.wordchain = (() => {
  const C = GameUI.common;
  let root = null;
  let app = null;
  let clock = null;
  let S = null;
  let lastLen = -1;

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 wc";
    root.innerHTML = `
      <div class="b2-players card" id="wc-players"></div>
      <div class="card wc-main">
        <div class="wc-status" id="wc-status" aria-live="polite"></div>
        <div class="wc-letter" id="wc-letter" aria-hidden="true"></div>
        <form class="wc-form" id="wc-form" autocomplete="off">
          <input id="wc-input" type="text" maxlength="24" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="send" aria-label="Your word" placeholder="Type a word">
          <button class="btn" id="wc-send" type="submit">Send</button>
        </form>
        <ol class="wc-chain" id="wc-chain" aria-label="Words so far"></ol>
      </div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.querySelector("#wc-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = root.querySelector("#wc-input");
      const word = input.value.trim();
      if (!word || !S || S.game.turnId !== S.you) return;
      app.socket.emit("action", { type: "word", word });
    });
  }

  function update(state) {
    S = state;
    const g = S.game;
    const mine = g.turnId === S.you;
    clock.set(g.timeLeft);
    root.querySelector("#wc-players").innerHTML = g.players
      .map((p) => {
        const hearts = Array.from({ length: g.maxLives }, (_, i) => `<span class="heart ${i < p.lives ? "on" : ""}" aria-hidden="true"></span>`).join("");
        return C.playerChip(app, { ...p, out: p.lives <= 0 }, { active: p.id === g.turnId, extra: `<span class="wc-lives" aria-label="${p.lives} lives">${hearts}</span>`, sub: `${p.words} ${p.words === 1 ? "word" : "words"}` });
      })
      .join("");
    const turn = g.players.find((p) => p.id === g.turnId);
    root.querySelector("#wc-status").innerHTML = g.myIndex < 0
      ? `Watching. <b>${app.esc(turn ? turn.name : "")}</b> is up <span class="fr-timer" data-timer></span>`
      : mine
        ? `<b>Your turn!</b> ${g.first ? "Start with" : "Next word starts with"} "${g.letter.toUpperCase()}" <span class="fr-timer" data-timer></span>`
        : `Waiting for <b>${app.esc(turn ? turn.name : "")}</b> <span class="fr-timer" data-timer></span>`;
    root.querySelector("#wc-status").className = "wc-status" + (mine ? " mine" : "");
    root.querySelector("#wc-letter").textContent = g.letter.toUpperCase();
    const input = root.querySelector("#wc-input");
    const me = g.players[g.myIndex];
    const canType = mine && me && me.lives > 0;
    input.disabled = !canType;
    root.querySelector("#wc-send").disabled = !canType;
    input.placeholder = canType ? `Word starting with ${g.letter.toUpperCase()} (${g.minLen}+ letters)` : g.myIndex < 0 ? "You're watching" : me && me.lives <= 0 ? "You're out" : "Wait for your turn";
    if (canType && lastLen !== g.chainLength) input.focus({ preventScroll: true });
    if (g.chainLength !== lastLen && lastLen >= 0) {
      input.value = "";
      Sound.play("drop");
    }
    lastLen = g.chainLength;
    root.querySelector("#wc-chain").innerHTML = g.chain
      .slice()
      .reverse()
      .map((c, i) => `<li class="${i === 0 ? "new" : ""}"><b>${app.esc(c.word.slice(0, -1))}<u>${app.esc(c.word.slice(-1))}</u></b><small>${app.esc(c.name)}</small></li>`)
      .join("") || `<li class="empty">No words yet.</li>`;
    clock.set(g.timeLeft);
  }

  function unmount() {
    if (clock) clock.stop();
    if (root) root.remove();
    root = null;
    lastLen = -1;
  }

  function renderResult(r, state, a) {
    return `<h2 class="result-title">${r.winnerId === state.you ? "You win!" : a.esc((r.players.find((p) => p.id === r.winnerId) || { name: "Nobody" }).name) + " wins!"}</h2>
      <p class="muted center">${r.chainLength} words in the chain. Winner bonus: ${r.bonus} points.</p>
      ${C.podium([...r.players].sort((x, y) => y.lives - x.lives || y.words - x.words), a, (p) => p.words, "words")}`;
  }
  return { mount, update, unmount, renderResult, resultSound: (r, s) => C.resultSound({ ...r, standings: r.players }, s), scoreLabel: "pts", chatPlaceholder: () => "Chat (use the box above for words)" };
})();
