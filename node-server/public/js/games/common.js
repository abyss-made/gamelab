// Small helpers shared by the card and word games.
window.GameUI = window.GameUI || {};
GameUI.common = (() => {
  const SUITS = { S: "♠", H: "♥", D: "♦", C: "♣" };
  const RANKS = { 11: "J", 12: "Q", 13: "K", 14: "A" };
  const rankLabel = (r) => RANKS[r] || String(r);
  const rankWord = (r) => ({ 11: "Jack", 12: "Queen", 13: "King", 14: "Ace" })[r] || String(r);

  function playingCard(c, extra = "") {
    const red = c.s === "H" || c.s === "D";
    return `<span class="pc ${red ? "red" : "black"} ${extra}" role="img" aria-label="${rankWord(c.r)} of ${{ S: "spades", H: "hearts", D: "diamonds", C: "clubs" }[c.s]}"><b>${rankLabel(c.r)}</b><i>${SUITS[c.s]}</i></span>`;
  }
  const cardBack = (extra = "") => `<span class="pc back ${extra}" aria-hidden="true"></span>`;

  // Counts a deadline down into a header timer and any [data-timer] elements.
  function makeClock(getRoot) {
    let deadline = 0;
    let handle = setInterval(tick, 250);
    function tick() {
      const root = getRoot();
      if (!root) return;
      const left = deadline ? Math.max(0, Math.ceil((deadline - performance.now()) / 1000)) : null;
      const text = left === null ? "" : left + "s";
      root.querySelectorAll("[data-timer]").forEach((el) => {
        el.textContent = text;
        el.classList.toggle("hurry", left !== null && left <= 5);
      });
      const h = document.getElementById("header-timer");
      if (h) h.textContent = left === null ? "--" : Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
    }
    return {
      set(ms) {
        deadline = ms === null || ms === undefined ? 0 : performance.now() + ms;
        tick();
      },
      stop() {
        clearInterval(handle);
      },
    };
  }

  function playerChip(a, p, { active, extra = "", sub = "" } = {}) {
    const m = a.member(p.id);
    return `<div class="b2-player ${active ? "active" : ""} ${p.out || (m && !m.connected) ? "offline" : ""}">${a.avatarHTML(p.avatar)}<div><b>${a.esc(p.name)}</b>${p.id === a.S.you ? " <small>(you)</small>" : ""}<div class="muted">${sub}</div></div>${extra}</div>`;
  }

  function podium(rows, a, key, unit) {
    return `<ol class="b2-podium">${rows
      .map(
        (r, i) =>
          `<li class="${r.id === a.S.you ? "me" : ""}"><span class="rank">${i + 1}</span>${a.avatarHTML(r.avatar)}<b>${a.esc(r.name)}</b><span class="pts">${key(r)} ${unit}</span></li>`,
      )
      .join("")}</ol>`;
  }

  function resultTitle(r, state, a) {
    if (r.tie) return r.winners.includes(state.you) ? "It's a tie, and you're in it!" : "It's a tie!";
    if (r.winnerId === state.you) return "You win!";
    const w = (r.standings || r.players || []).find((p) => p.id === r.winnerId);
    return w ? `${a.esc(w.name)} wins!` : "Game over";
  }
  function resultSound(r, state) {
    const mine = (r.standings || r.players || r.hands || []).some((p) => p.id === state.you);
    if (!mine) return "reveal";
    return r.winnerId === state.you || (r.winners && r.winners.includes(state.you)) ? "win" : "lose";
  }
  return { playingCard, cardBack, makeClock, playerChip, podium, resultTitle, resultSound, rankWord, rankLabel };
})();
