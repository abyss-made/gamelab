// Go Fish screen (premium "Marine Salon" direction): sea-glass table, opponents' face-down fans from public
// counts, the pond, public books, an explicit rank -> player -> Ask strip and the private hand.
// Ranks are 2-14 (Ace = 14), matching the server and common.rankLabel.
window.GameUI = window.GameUI || {};
GameUI.gofish = (() => {
  const C = GameUI.common;
  const BACK = "/assets/premium/marine-card-back.svg";
  const FISH = "/assets/premium/marine-fish.svg";
  const MAX_BACKS = 7;
  const SUIT = { S: "♠", H: "♥", D: "♦", C: "♣" };
  let root = null;
  let app = null;
  let clock = null;
  let S = null;
  let pickRank = null;
  let pickTarget = null;
  let pending = null; // { rank, target, key }: an Ask we sent; shown until the view meaningfully changes
  let seen = null; // BookLedger: Set of "playerId:rank" already observed (seeded silently on first view)
  let fresh = new Set(); // books newly observed in this update (animate once)
  let repainting = false;
  let pendingTimer = 0;
  let seenMove = null;
  let lost = false; // last Ask got no response: tell the player they can try again

  const tilt = (i, n) => (n <= 1 ? 0 : Math.round((i - (n - 1) / 2) * Math.min(5, 30 / n) * 10) / 10);
  const backs = (n) => Array.from({ length: Math.min(n, MAX_BACKS) }, (_, i) => `<img src="${BACK}" alt="" style="--tilt:${tilt(i, Math.min(n, MAX_BACKS))}deg">`).join("");
  const viewKey = (g) => `${g.turnId}|${g.deckCount}|${g.log.length ? g.log[g.log.length - 1] : ""}|${g.hand ? g.hand.length : 0}`;

  function cardHTML(c, i, n, picked) {
    const red = c.s === "H" || c.s === "D";
    return `<span class="pgf-card ${red ? "red" : ""} ${picked ? "lift" : ""}" style="--tilt:${tilt(i, n)}deg" role="img" aria-label="${C.rankWord(c.r)} of ${{ S: "spades", H: "hearts", D: "diamonds", C: "clubs" }[c.s]}"><span class="pgf-idx">${C.rankLabel(c.r)}<i>${SUIT[c.s]}</i></span><img src="${FISH}" alt=""><b>${C.rankLabel(c.r)}</b></span>`;
  }

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 gf pgf";
    root.innerHTML = `<div class="pgf-table">
        <div class="pgf-oval" aria-hidden="true"><span class="pgf-orn">THE MARINE SALON<small>A LITTLE LUCK. A GOOD MEMORY.</small></span></div>
        <div class="pgf-opponents" id="gf-players"></div>
        <div class="pgf-mid">
          <div class="pgf-pond"><img src="${BACK}" alt=""><small id="gf-deck"></small></div>
          <div id="gf-public-action" class="pgf-action" role="status" hidden></div><div class="pgf-books" id="gf-mybooks"></div>
        </div>
        <div class="cs-status pgf-status" id="gf-status" aria-live="polite"></div>
        <div class="gf-ask pgf-ask" id="gf-ask"></div>
        <div class="pgf-handhead"><span id="gf-handlabel"></span><span id="gf-bookcount"></span></div>
        <div class="gf-hand pgf-hand" id="gf-hand" aria-label="Your hand"></div>
        <details class="pgf-logwrap"><summary>Recent moves</summary><ul class="gf-log" id="gf-log" aria-label="Recent moves"></ul></details>
      </div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("click", (e) => C.keepFocus(document.getElementById("stage"), () => onClick(e)));
    window.addEventListener("resize", fitHand); // rotation / resize refits the hand
  }

  function onClick(e) {
    if (!S) return;
    const g = S.game;
    if (g.turnId !== S.you) return;
    const r = e.target.closest("[data-rank]");
    const t = e.target.closest("[data-target]");
    if (r && !pending) pickRank = Number(r.dataset.rank);
    if (t && !pending) pickTarget = t.dataset.target;
    if (e.target.closest("#gf-go") && pickRank !== null && pickTarget && !pending) {
      lost = false;
      app.socket.emit("action", { type: "ask", target: pickTarget, rank: pickRank });
      // Keep the named ask visible until the server's view changes; never claim it was accepted.
      pending = { rank: pickRank, target: pickTarget, key: viewKey(g) };
      // If the Ask never reaches the server (e.g. a dropped connection), release the lock after 5s
      // so the player can try again. No automatic retry and no claim that it was accepted.
      clearTimeout(pendingTimer);
      pendingTimer = setTimeout(() => {
        if (!root || !pending || !S) return;
        pending = null;
        lost = true;
        repainting = true;
        update(S);
        repainting = false;
      }, 5000);
    }
    // Repaint the picks from the same state; the clock must keep counting from the last server update.
    repainting = true;
    update(S);
    repainting = false;
  }

  function update(state) {
    S = state;
    const g = S.game;
    const mine = g.turnId === S.you;
    if (!repainting) clock.set(g.timeLeft);
    // pending ask resolves on any meaningful view change (turn, pond, log, hand)
    if (pending && (viewKey(g) !== pending.key || !mine)) { pending = null; pickRank = null; pickTarget = null; clearTimeout(pendingTimer); }
    if (!mine) lost = false;
    // BookLedger: seed silently on the first view (incl. reconnect), then only new (player, rank) pairs animate.
    fresh = new Set();
    const all = g.players.flatMap((p) => p.books.map((r) => `${p.id}:${r}`));
    if (!seen) seen = new Set(all);
    else if (!repainting) for (const k of all) if (!seen.has(k)) { seen.add(k); fresh.add(k); }

    root.querySelector("#gf-players").innerHTML = g.players
      .filter((p) => p.id !== S.you)
      .map((p) => `<div class="pgf-seat ${g.lastMove?.askerId===p.id?"asker":""} ${g.lastMove?.targetId===p.id?"target":""}">${C.playerChip(app, p, { active: p.id === g.turnId, extra: `<span class="gf-books" title="Books">${p.books.map((r) => `<i class="${fresh.has(`${p.id}:${r}`) ? "new" : ""}">${C.rankLabel(r)}</i>`).join("")}</span>`, sub: `${p.count} cards · ${p.books.length} ${p.books.length === 1 ? "book" : "books"}` })}<div class="pgf-backs" aria-hidden="true">${backs(p.count)}</div></div>`)
      .join("");
    const event=g.lastMove,action=root.querySelector('#gf-public-action');
    if(event && action.dataset.sequence!==String(event.sequence)){
      const who=id=>app.esc(g.players.find(player=>player.id===id)?.name||'A player');
      const animated=seenMove!==null && seenMove!==event.sequence;seenMove=event.sequence;
      action.dataset.sequence=String(event.sequence);action.hidden=false;
      action.className='pgf-action'+(animated?(event.received?' transfer':' fish'):'');
      action.innerHTML=`<small>MOST RECENT ASK</small><b>${who(event.askerId)}</b> → <b>${who(event.targetId)}</b> · <strong class="request-rank">${C.rankWord(event.rank)}s</strong><img src="${BACK}" alt=""><small>${event.received?`${event.received} card${event.received===1?'':'s'} handed over.`:event.drawn?'Go Fish — one private card drawn.':'Go Fish — the pond is empty.'} ${event.again?'Asker goes again.':'Turn passes.'}${event.books.map(book=>` ${who(book.by)} completed a book of ${C.rankWord(book.rank)}s!`).join('')}</small>`;
    }else if(!event&&seenMove===null)seenMove=0;
    const turn = g.players.find((p) => p.id === g.turnId);
    const ranks = g.hand ? [...new Set(g.hand.map((c) => c.r))].sort((x, y) => x - y) : [];
    if (!mine || (pickRank !== null && !ranks.includes(pickRank) && !pending)) pickRank = null;
    const targets = g.players.filter((p) => p.id !== S.you && !p.out && p.count > 0);
    if (!mine || (pickTarget && !targets.some((p) => p.id === pickTarget) && !pending)) pickTarget = null;
    if (mine && !pickTarget && targets.length === 1) pickTarget = targets[0].id;
    const tName = (id) => app.esc((g.players.find((p) => p.id === id) || {}).name || "");
    root.querySelector("#gf-status").innerHTML = g.myIndex < 0
      ? `Watching. <b>${app.esc(turn ? turn.name : "")}</b> is up. <span class="fr-timer" data-timer></span>`
      : pending
        ? `Asking <b>${tName(pending.target)}</b> for ${C.rankWord(pending.rank)}s… <span class="fr-timer" data-timer></span>`
        : mine
          ? `<b>Your turn.</b> ${lost ? "Your last ask didn't go through. Try again. " : "Pick a rank from your hand and a player to ask. "}<span class="fr-timer" data-timer></span>`
          : `Waiting for <b>${app.esc(turn ? turn.name : "")}</b>. <span class="fr-timer" data-timer></span>`;
    root.querySelector("#gf-status").className = "cs-status pgf-status" + (mine ? " mine" : "");
    root.querySelector("#gf-deck").textContent = `The pond · ${g.deckCount} cards`;
    const me = g.players.find((p) => p.id === S.you);
    root.querySelector("#gf-mybooks").innerHTML = me
      ? `<span class="pgf-eyebrow">YOUR BOOKS</span>${me.books.map((r) => `<span class="pgf-book ${fresh.has(`${me.id}:${r}`) ? "new" : ""}"><b>${C.rankLabel(r)}</b><small>Complete</small></span>`).join("")}<span class="pgf-book empty">Next catch</span>`
      : "";
    const ask = root.querySelector("#gf-ask");
    if (mine) {
      ask.innerHTML = `<div class="gf-row pgf-step"><small>1 · Choose a rank</small><div>${ranks.map((r) => `<button type="button" class="gf-chip ${pickRank === r ? "on" : ""}" data-rank="${r}" aria-pressed="${pickRank === r}" ${pending ? "disabled" : ""}>${C.rankLabel(r)}</button>`).join("")}</div></div>
        <div class="gf-row pgf-step"><small>2 · Ask a player</small><div>${targets.map((p) => `<button type="button" class="gf-chip ${pickTarget === p.id ? "on" : ""}" data-target="${p.id}" aria-pressed="${pickTarget === p.id}" ${pending ? "disabled" : ""}>${app.esc(p.name)}</button>`).join("")}</div></div>
        <button type="button" class="btn pgf-go" id="gf-go" ${pickRank !== null && pickTarget && !pending ? "" : "disabled"}>${pending ? "Asking…" : `Ask${pickTarget ? " " + tName(pickTarget) : ""}${pickRank !== null ? " for " + C.rankLabel(pickRank) + "s" : ""}`}</button>`;
    } else ask.innerHTML = "";
    ask.hidden = !mine;
    root.querySelector("#gf-log").innerHTML = g.log.slice().reverse().map((l) => `<li>${app.esc(l)}</li>`).join("");
    const hand = g.hand ? g.hand.slice().sort((x, y) => x.r - y.r || x.s.localeCompare(y.s)) : null;
    root.querySelector("#gf-handlabel").textContent = hand ? `YOUR HAND · ${hand.length} CARDS` : "";
    root.querySelector("#gf-bookcount").textContent = me ? `${me.books.length} book${me.books.length === 1 ? "" : "s"} collected` : "";
    root.querySelector("#gf-hand").innerHTML = hand
      ? hand.map((c, i) => cardHTML(c, i, hand.length, c.r === (pending ? pending.rank : pickRank))).join("") || '<p class="muted">No cards in hand.</p>'
      : '<p class="muted">You\'re watching. Hands are private.</p>';
    fitHand();
    if (!repainting) clock.set(g.timeLeft);
  }

  // overlap cards just enough to fit; the corner index stays visible
  function fitHand() {
    if (!root) return;
    const hand = root.querySelector("#gf-hand");
    const cards = [...hand.querySelectorAll(".pgf-card")];
    if (cards.length < 2) return;
    const w = cards[0].offsetWidth;
    const need = (cards.length * w - (hand.clientWidth - 24)) / (cards.length - 1);
    const overlap = Math.max(-12, Math.min(w * 0.7, need));
    cards.forEach((c, i) => { c.style.marginLeft = i ? `${-overlap}px` : "0"; });
    // Hands too long even at the overlap cap scroll horizontally so every card stays reachable.
    hand.classList.toggle("scroll", need > w * 0.7);
  }

  function unmount() {
    window.removeEventListener("resize", fitHand);
    clearTimeout(pendingTimer);
    lost = false;
    if (clock) clock.stop();
    if (root) root.remove();
    root = null;
    pickRank = pickTarget = null;
    pending = null;
    seenMove = null;
    seen = null; // reset the ledger per game instance
    fresh = new Set();
  }

  function renderResult(r, state, a) {
    return `<h2 class="result-title">${C.resultTitle(r, state, a)}</h2>${r.forfeit ? '<p class="muted center">Won because the others left.</p>' : ""}
      ${C.podium(r.standings, a, (p) => p.books.length, "books")}`;
  }
  return { mount, update, unmount, renderResult, resultSound: C.resultSound, scoreLabel: "books" };
})();
