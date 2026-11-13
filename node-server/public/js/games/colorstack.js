// Color Stack screen (premium "Neon Social Club" direction): plum table, opponents' face-down fans
// built only from public counts, central draw/discard, and a private fan where tapping a card
// inspects it and an explicit Play sends the existing intent (only for server-playable cards).
window.GameUI = window.GameUI || {};
GameUI.colorstack = (() => {
  const C = GameUI.common;
  const FX=GameUI.batch2fx;
  const NAMES = { r: "Red", b: "Blue", g: "Green", y: "Yellow", w: "Wild" };
  const LABEL = { S: "Skip", F: "Flip", D: "+2", W: "Wild", P: "+4" };
  const BACK = "/assets/ten/stack-back.svg";
  const MAX_BACKS = 7; // long fans compress; the exact count stays in text
  let root = null;
  let app = null;
  let clock = null;
  let S = null;
  let pendingWild = null;
  let selected = null; // card id being inspected; survives timer ticks and repaints

  const faceText = (c) => LABEL[c.v] || c.v;
  const tilt = (i, n) => (n <= 1 ? 0 : Math.round((i - (n - 1) / 2) * Math.min(5, 34 / n) * 10) / 10);
  function cardHTML(c, i, n, { playable, sel }) {
    return `<button type="button" class="cs-card pcs-card c-${c.c} ${faceText(c).length > 2 ? "word" : ""} ${playable ? "playable" : ""} ${sel ? "lift" : ""}" style="--tilt:${tilt(i, n)}deg" data-card="${c.id}" aria-pressed="${sel ? "true" : "false"}" aria-label="${NAMES[c.c]} ${faceText(c)}${playable ? ", playable" : ""}"><i class="corner">${faceText(c)}</i>${GameUI.tenArt.stackFace(c,faceText(c))}<small>${NAMES[c.c]}</small><i class="corner bottom" aria-hidden="true">${faceText(c)}</i></button>`;
  }
  const topHTML = (c, color) => `<span class="cs-card pcs-card big static c-${c.c} ${faceText(c).length > 2 ? "word" : ""}" role="img" aria-label="Top card: ${NAMES[c.c]} ${faceText(c)}"><i class="corner">${faceText(c)}</i>${GameUI.tenArt.stackFace(c,faceText(c))}<small>${NAMES[c.c]}</small><i class="corner bottom" aria-hidden="true">${faceText(c)}</i></span>`;
  const backs = (n) => Array.from({ length: Math.min(n, MAX_BACKS) }, (_, i) => `<img src="${BACK}" alt="" style="--tilt:${tilt(i, Math.min(n, MAX_BACKS))}deg">`).join("");

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 cs pcs";
    root.innerHTML = `<div class="pcs-table">
        <div class="pcs-orbit" aria-hidden="true"><span class="pcs-label">COLOR STACK<small>THE SPECTRUM CLUB</small></span></div>
        <div class="pcs-opponents" id="cs-players"></div>
        <div class="pcs-center">
          <div class="pcs-pile"><button type="button" class="cs-deck pcs-deck" id="cs-draw" aria-label="Draw a card"><img src="${BACK}" alt=""></button><small id="cs-deckn"></small></div>
          <div class="pcs-pile"><div class="cs-top" id="cs-top"></div><small id="cs-match"></small></div>
          <span class="cs-dir pcs-dir" id="cs-dir" aria-hidden="true"></span>
        </div>
        <div class="cs-status pcs-status" id="cs-status" aria-live="polite"></div>
        <div class="cs-hand pcs-fan" id="cs-hand" aria-label="Your hand"></div>
        <div class="pcs-dock">
          <span class="pcs-sel" id="cs-sel" aria-live="polite"></span>
          <button type="button" class="btn btn-ghost" id="cs-draw2">Draw card</button>
          <button type="button" class="btn btn-ghost" id="cs-pass" hidden>Keep &amp; pass</button>
          <button type="button" class="btn" id="cs-play" disabled>Play</button>
        </div>
      </div>
      <div class="cs-picker" id="cs-picker" hidden role="dialog" aria-label="Choose a color"><p>Choose a color</p>${["r", "b", "g", "y"].map((c) => `<button type="button" class="cs-pick c-${c}" data-color="${c}">${NAMES[c]}</button>`).join("")}<button type="button" class="btn btn-ghost btn-small" data-color="">Cancel</button></div>`;
    root.dataset.ten='colorstack';
    root.insertAdjacentHTML('afterbegin',GameUI.tenArt.heading('colorstack'));
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("click", (e) => {
      if (!S) return;
      const g = S.game;
      const mine = g.turnId === S.you;
      const col = e.target.closest("[data-color]");
      if (col) {
        if (col.dataset.color && pendingWild !== null && mine && g.playable.includes(pendingWild)) {
          app.socket.emit("action", { type: "play", card: pendingWild, color: col.dataset.color });
          selected = null;
        }
        pendingWild = null;
        root.querySelector("#cs-picker").hidden = true;
        root.querySelector("#cs-play").focus();
        return;
      }
      const card = e.target.closest("[data-card]");
      if (card && g.hand) {
        const id = Number(card.dataset.card);
        selected = selected === id ? null : id; // tap inspects; tap again puts it back
        return paintHand();
      }
      if (e.target.closest("#cs-play")) return playSelected();
      if ((e.target.closest("#cs-draw") || e.target.closest("#cs-draw2")) && mine && g.drawn === null) app.socket.emit("action", { type: "draw" });
      else if (e.target.closest("#cs-pass") && mine) app.socket.emit("action", { type: "pass" });
    });
    window.addEventListener("resize", onResize);
    root.addEventListener("keydown", (e) => {
      const dialog=root.querySelector('#cs-picker');
      if(e.key==='Escape'&&!dialog.hidden){e.preventDefault();pendingWild=null;dialog.hidden=true;root.querySelector('#cs-play').focus();return;}
      FX.trap(e,dialog);
      const card = e.target.closest("[data-card]");
      if (!card || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      const all = [...root.querySelectorAll("#cs-hand [data-card]")];
      const i = all.indexOf(card);
      const j = e.key === "Home" ? 0 : e.key === "End" ? all.length - 1 : Math.max(0, Math.min(all.length - 1, i + (e.key === "ArrowLeft" ? -1 : 1)));
      if (all[j]) { e.preventDefault(); all[j].focus(); }
    });
  }

  function playSelected() {
    const g = S.game;
    if (g.turnId !== S.you || selected === null || !g.playable.includes(selected)) return;
    const c = g.hand.find((x) => x.id === selected);
    if (!c) return;
    if (c.c === "w") {
      pendingWild = c.id;
      root.querySelector("#cs-picker").hidden = false;
      root.querySelector("#cs-picker [data-color]").focus();
    } else {
      app.socket.emit("action", { type: "play", card: c.id });
      selected = null;
    }
  }

  // Overlap cards just enough to fit the row; the corner index of every card stays visible.
  function fitFan(hand) {
    const cards = [...hand.querySelectorAll(".pcs-card")];
    if (cards.length < 2) return;
    const w = cards[0].offsetWidth;
    const avail = hand.clientWidth - 24;
    const need = (cards.length * w - avail) / (cards.length - 1);
    const overlap = Math.max(10, Math.min(Math.max(0,w-44), need));
    cards.forEach((c, i) => { c.style.marginLeft = i ? `${-overlap}px` : "0"; });
    // Very long hands can't fit even at the overlap cap: fall back to a horizontal scroller so every card stays reachable.
    hand.classList.toggle("scroll", need > Math.max(0,w-44));
  }

  // Repaint only the private fan + dock; keeps keyboard focus on the same card id.
  function paintHand() {
    const g = S.game;
    const mine = g.turnId === S.you;
    const hand = root.querySelector("#cs-hand");
    const focusedId = document.activeElement && hand.contains(document.activeElement) ? document.activeElement.dataset.card : null;
    if (g.hand && selected !== null && !g.hand.some((c) => c.id === selected)) selected = null;
    const n = g.hand ? g.hand.length : 0;
    hand.classList.toggle("long", n > 9);
    hand.innerHTML = g.hand
      ? g.hand.map((c, i) => cardHTML(c, i, n, { playable: mine && g.playable.includes(c.id), sel: c.id === selected })).join("") || '<p class="muted">No cards.</p>'
      : '<p class="muted">You\'re watching. Hands are private.</p>';
    fitFan(hand);
    if (focusedId !== null) hand.querySelector(`[data-card="${focusedId}"]`)?.focus();
    const c = g.hand && selected !== null ? g.hand.find((x) => x.id === selected) : null;
    const canPlay = !!c && mine && g.playable.includes(c.id);
    const play = root.querySelector("#cs-play");
    play.disabled = !canPlay;
    play.textContent = c ? `Play ${NAMES[c.c]} ${faceText(c)}` : "Play";
    root.querySelector("#cs-sel").textContent = !g.hand ? "" : !c ? (mine ? "Tap a card to inspect it." : "Tap a card to inspect it. It's not your turn.") : canPlay ? `${NAMES[c.c]} ${faceText(c)} selected` : mine ? `${NAMES[c.c]} ${faceText(c)} doesn't match. Pick another card or draw.` : `${NAMES[c.c]} ${faceText(c)} selected. Wait for your turn.`;
    root.querySelector(".pcs-dock").hidden = !g.hand;
  }

  function update(state) {
    const before=S?.game,oldCard=before?root.querySelector(`[data-card="${state.game.top.id}"]`):null,from=oldCard?.getBoundingClientRect();
    S = state;
    const g = S.game;
    const mine = g.turnId === S.you;
    clock.set(g.timeLeft);
    root.querySelector("#cs-players").innerHTML = g.players
      .filter((p) => p.id !== S.you)
      .map((p) => `<div data-seat="${p.id}" class="pcs-seat">${C.playerChip(app, p, { active: p.id === g.turnId, extra: `<span class="cs-count" title="Cards in hand">${p.count}</span>`, sub: p.count === 1 ? "One card left!" : `${p.count} cards` })}<div class="pcs-backs" aria-hidden="true">${backs(p.count)}</div></div>`)
      .join("");
    const turn = g.players.find((p) => p.id === g.turnId);
    const msg = g.myIndex < 0
      ? `Watching. <b>${app.esc(turn ? turn.name : "")}</b> is up. `
      : mine
        ? g.drawn !== null
          ? "<b>You drew a playable card.</b> Play it or keep it and pass. "
          : g.playable.length ? "<b>Your turn!</b> Choose a card, then Play. Or draw. " : "<b>Your turn.</b> Nothing to play: draw a card. "
        : `Waiting for <b>${app.esc(turn ? turn.name : "")}</b>. `;
    const me = g.players.find((p) => p.id === S.you);
    root.querySelector("#cs-status").innerHTML = msg + '<span class="fr-timer" data-timer></span>' + (me && me.count === 1 ? ' <b class="pcs-one">One card left!</b>' : "");
    root.querySelector("#cs-status").className = "cs-status pcs-status" + (mine ? " mine" : "");
    root.querySelector("#cs-top").innerHTML = topHTML(g.top, g.color);
    root.querySelector("#cs-match").innerHTML = `<span class="cs-color c-${g.color}">${NAMES[g.color]}</span> Match ${NAMES[g.color]} or ${app.esc(faceText(g.top))}`;
    root.querySelector("#cs-dir").textContent = g.dir === 1 ? "⟳" : "⟲";
    root.querySelector("#cs-deckn").textContent = `Draw pile · ${g.deckCount}`;
    const canDraw = mine && g.drawn === null;
    root.querySelector("#cs-draw").disabled = !canDraw;
    root.querySelector("#cs-draw2").disabled = !canDraw;
    root.querySelector("#cs-draw2").hidden = !mine || g.drawn !== null;
    root.querySelector("#cs-pass").hidden = !(mine && g.drawn !== null);
    if (mine && g.drawn !== null && selected === null) selected = g.drawn;
    if (!mine) {
      pendingWild = null;
      root.querySelector("#cs-picker").hidden = true;
    }
    paintHand();
    if(before){
      if(before.top.id!==g.top.id){
        Sound.play('drop');
        const oldActor=before.turnId,origin=from||[...root.querySelectorAll('[data-seat]')].find(n=>n.dataset.seat===oldActor)||root.querySelector('#cs-hand');
        FX.fly(root,origin,root.querySelector('#cs-top'),root.querySelector('#cs-top .pcs-card'));
        if(['S','F','D','P','W'].includes(g.top.v))FX.transient(root,root.querySelector('#cs-top'),'special',faceText(g.top));
      }
      for(const player of g.players.filter(p=>p.id!==S.you)){
        const old=before.players.find(p=>p.id===player.id),seat=[...root.querySelectorAll('[data-seat]')].find(n=>n.dataset.seat===player.id);
        if(old&&player.count>old.count)FX.fly(root,root.querySelector('#cs-draw'),seat,BACK);
      }
      const previous=new Set((before.hand||[]).map(c=>c.id));
      (g.hand||[]).filter(c=>!previous.has(c.id)).forEach(c=>{const el=root.querySelector(`[data-card="${c.id}"]`);FX.fly(root,root.querySelector('#cs-draw'),el,BACK);FX.animate(el,[{opacity:.3,transform:'translateY(25px)'},{opacity:1,transform:'rotate(var(--tilt))'}],340);});
      if(before.color!==g.color)FX.animate(root.querySelector('#cs-match'),[{filter:'brightness(1.8)',transform:'scale(1.08)'},{filter:'brightness(1)',transform:'none'}],420);
      const me=g.players.find(p=>p.id===S.you),was=before.players.find(p=>p.id===S.you);
      if(me?.count===1 && was?.count!==1)FX.animate(root.querySelector('.pcs-one'),[{transform:'scale(.8)',opacity:.3},{transform:'scale(1)',opacity:1}],400);
    }
  }

  function onResize() { if (root) fitFan(root.querySelector("#cs-hand")); }

  function unmount() {
    window.removeEventListener("resize", onResize);
    if (clock) clock.stop();
    if (root) root.remove();
    root = null;
    pendingWild = null;
    selected = null;
  }

  function renderResult(r, state, a) {
    const w = r.hands.find((h) => h.id === r.winnerId);
    return `<h2 class="result-title b25-result">${r.winnerId === state.you ? "You win!" : a.esc(w ? w.name : "Someone") + " wins!"}</h2>
      ${!r.forfeit?'<div class="b25-out" aria-label="Winner has no cards remaining">0<small>CARDS LEFT</small></div>':''}
      <p class="muted center">${r.forfeit ? "Won because the others left." : `Scored ${r.pts} points from the cards left in other hands.`}</p>
      <ol class="b2-podium">${[...r.hands].sort((x, y) => x.cards - y.cards).map((h) => `<li class="${h.id === state.you ? "me" : ""}"><span class="rank">${h.cards}</span>${a.avatarHTML(h.avatar)}<b>${a.esc(h.name)}</b><span class="pts">${h.cards} cards left (${h.value})</span></li>`).join("")}</ol>`;
  }
  return { mount, update, unmount, renderResult, resultSound: (r, s) => C.resultSound({ ...r, standings: r.hands }, s), scoreLabel: "pts" };
})();
