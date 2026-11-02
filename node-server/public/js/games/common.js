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
  // Re-renders without dropping keyboard focus (#43). Boards are rebuilt with innerHTML, which used
  // to send focus back to <body>. If a button inside `root` had focus and `render` replaced it, its
  // replacement (same data-sq / data-cell / data-col / data-rank / data-target / data-ship / data-act
  // / data-choose, or id) gets focus back. If that control is disabled now (it isn't your turn),
  // focus waits on `root` and returns to it at a later render, once it is enabled again.
  const FOCUS_KEYS = ["sq", "cell", "col", "rank", "target", "ship", "act", "choose"];
  let parked = null;
  function focusKey(el) {
    if (!el || el.tagName !== "BUTTON") return null;
    for (const k of FOCUS_KEYS) if (el.dataset[k] !== undefined) return `[data-${k}="${CSS.escape(el.dataset[k])}"]`;
    return el.id ? "#" + CSS.escape(el.id) : null;
  }
  function keepFocus(root, render) {
    const before = document.activeElement;
    let key = root && before && root.contains(before) ? focusKey(before) : null;
    if (!key && parked && parked.root === root && before === root) key = parked.key;
    render();
    if (!key || !root.isConnected) return;
    const now = document.activeElement;
    if (now && now !== document.body && now !== root) return; // focus survived, or the user moved on
    const next = root.querySelector(key);
    if (next && !next.disabled) {
      parked = null;
      next.focus({ preventScroll: true });
    } else {
      parked = { root, key };
      if (!root.hasAttribute("tabindex")) root.setAttribute("tabindex", "-1");
      root.focus({ preventScroll: true });
    }
  }

  // "Tap again to confirm" whose armed state outlives re-renders (#43): an opponent's move rebuilds
  // the button, but the second tap within `ms` still confirms. `onExpire` repaints the label.
  function makeConfirm(ms = 3000) {
    let until = 0;
    let timer = null;
    return {
      get armed() {
        return performance.now() < until;
      },
      // True when this tap confirms. Otherwise it arms, and calls onExpire when the window closes.
      tap(onExpire) {
        clearTimeout(timer);
        if (performance.now() < until) {
          until = 0;
          return true;
        }
        until = performance.now() + ms;
        timer = setTimeout(() => {
          until = 0;
          if (onExpire) onExpire();
        }, ms);
        return false;
      },
      reset() {
        clearTimeout(timer);
        until = 0;
      },
    };
  }

  // A new game starts with nothing remembered.
  const releaseFocus = () => {
    parked = null;
  };

  return { playingCard, cardBack, makeClock, playerChip, podium, resultTitle, resultSound, rankWord, rankLabel, keepFocus, releaseFocus, makeConfirm };
})();
