// Chess screen: tap a piece, then a highlighted square. Legal moves come from the server, so the
// client never decides what is allowed. Includes clocks, move list, draw offers and resignation.
window.GameUI = window.GameUI || {};
GameUI.chess = (() => {
  const C = GameUI.common;
  const FX=GameUI.batch2fx;
  let drag=null,suppressClick=false,captures=[];
  const GLYPH = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" };
  const WORD = { K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight", P: "pawn" };
  let root = null;
  let app = null;
  let S = null;
  let clock = null;
  let sel = -1;
  let pendingPromo = null;
  let stamp = 0;
  let tickTimer = null;
  let lastCount = -1;
  let animatedCount = -1;
  const resign = C.makeConfirm(); // survives re-renders, so an opponent's move doesn't disarm it
  const actionsHTML = (g) =>
    g.myIndex >= 0
      ? `<button type="button" class="btn btn-small btn-ghost" data-act="offer" ${g.canOffer ? "" : "disabled"}>Offer draw</button><button type="button" class="btn btn-small btn-ghost" data-act="resign"${resign.armed ? ' data-armed="1"' : ""}>${resign.armed ? "Tap again to resign" : "Resign"}</button>`
      : "";
  const paintActions = () => {
    const el = root && root.querySelector("#ch-actions");
    if (el && S && S.game) C.keepFocus(document.getElementById("stage"), () => (el.innerHTML = actionsHTML(S.game)));
  };

  const name = (s) => "abcdefgh"[s & 7] + ((s >> 3) + 1);
  // Board theme is local presentation only (never sent to the server).
  const loadTheme = () => { try { return localStorage.getItem("pg_chess_theme") === "slate" ? "slate" : "walnut"; } catch (e) { return "walnut"; } };

  function boardHTML(g, { flip = false, playable = false, selected = -1, label = "Chess board", animate = false } = {}) {
    const legal = g.legal || {};
    const targets = new Set(selected >= 0 && legal[selected] ? legal[selected] : []);
    let html = `<div class="ch-board" role="group" aria-label="${label}">`;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const r = flip ? row : 7 - row;
        const f = flip ? 7 - col : col;
        const i = r * 8 + f;
        const p = g.board[i];
        const isT = targets.has(i);
        const can = playable && (legal[i] || isT);
        const cls = ["ch-sq", (r + f) % 2 === 0 ? "dark" : "light", g.last && (g.last.from === i || g.last.to === i) ? "last" : "", i === selected ? "sel" : "", isT ? (p ? "cap" : "target") : "", g.check === i ? "check" : ""].join(" ");
        const who = p ? `${p[0] === "w" ? "White" : "Black"} ${WORD[p[1]]}` : "empty";
        const coord = (col === 0 ? `<i class="rk">${r + 1}</i>` : "") + (row === 7 ? `<i class="fl">${"abcdefgh"[f]}</i>` : "");
        html += `<button type="button" class="${cls}" data-sq="${i}" aria-label="${name(i)}: ${who}${isT ? ", legal destination" : ""}" ${can ? "" : "disabled"}>${coord}${p ? `<span class="ch-piece ${p[0]}${animate && g.last && g.last.to === i && g.last.from !== undefined ? " slid" : ""}"${animate && g.last && g.last.to === i && g.last.from !== undefined ? ` style="${GameUI.art.slide(g.last.from, i, flip)}"` : ""}>${GameUI.art.chessPiece(p[1])}</span>` : isT ? '<span class="ck-dot"></span>' : ""}</button>`;
      }
    }
    return html + "</div>";
  }

  const fmt = (ms) => {
    const s = Math.ceil(ms / 1000);
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  };

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 ch pch";
    root.dataset.theme = loadTheme();
    root.innerHTML = `<div class="ch-layout pch-layout"><div class="pch-table" id="ch-top"><div class="pch-player" id="ch-opp"></div><div id="ch-board"></div><div class="pch-player" id="ch-me"></div></div>
      <div class="ch-side pch-notes"><div class="pch-caption"><span class="pch-eyebrow" id="ch-eyebrow">WALNUT &amp; IVORY</span><div class="ttt-status" id="ch-status" aria-live="polite"></div></div>
      <div class="b25-captures" id="ch-captures" hidden aria-label="Recent captures"></div><div id="ch-offer"></div><div class="pch-moves"><span class="pch-eyebrow">MOVES</span><ol class="ch-moves" id="ch-moves" aria-label="Move list"></ol></div>
      <div class="pch-theme" role="group" aria-label="Board style"><span>Board style</span><button type="button" class="btn btn-small btn-ghost" data-theme="walnut">Walnut</button><button type="button" class="btn btn-small btn-ghost" data-theme="slate">Slate</button></div>
      <div class="board-actions" id="ch-actions"></div><small class="muted">Tap a piece, then a highlighted square.</small></div></div>
      <div class="ch-promo" id="ch-promo" hidden></div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    tickTimer = setInterval(drawClocks, 250);
    root.addEventListener("click", e=>{if(suppressClick)return;C.keepFocus(document.getElementById("stage"),()=>onClick(e));});
    bindDrag();
    root.addEventListener('keydown',e=>{
      const dialog=root.querySelector('#ch-promo');FX.trap(e,dialog);
      if(e.key==='Escape'&&!dialog.hidden){e.preventDefault();cancelPromo();}
    });
  }

  function cancelPromo(){const from=pendingPromo?.from;pendingPromo=null;root.querySelector('#ch-promo').hidden=true;if(from!==undefined)root.querySelector(`[data-sq="${from}"]`)?.focus();}
  function moveTo(from,to){
    const g=S?.game;if(!g||g.myIndex!==g.turn||!g.legal[from]?.includes(to))return;
    const p=g.board[from];if(p?.[1]==='P'&&(to>>3===7||to>>3===0)){pendingPromo={from,to};showPromo(p[0]);return;}
    send(from,to);sel=-1;
  }
  function clearDrag(){
    drag?.ghost?.remove();root?.querySelectorAll('.b25-drag-target,.b25-drag-source').forEach(n=>n.classList.remove('b25-drag-target','b25-drag-source'));drag=null;
  }
  function bindDrag(){
    root.addEventListener('pointerdown',e=>{const b=e.target.closest('[data-sq]'),g=S?.game;if(!b||g?.myIndex!==g?.turn||!g.legal[b.dataset.sq])return;drag={from:Number(b.dataset.sq),x:e.clientX,y:e.clientY,pointer:e.pointerId,moved:false};});
    root.addEventListener('pointermove',e=>{
      if(!drag||drag.pointer!==e.pointerId)return;
      if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6){drag.moved=true;root.setPointerCapture(e.pointerId);sel=drag.from;paint();const p=root.querySelector(`[data-sq="${sel}"] .ch-piece`);drag.ghost=p?.cloneNode(true);if(drag.ghost){drag.ghost.classList.add('b25-chess-ghost');drag.ghost.setAttribute('aria-hidden','true');root.append(drag.ghost);}root.querySelector(`[data-sq="${sel}"]`)?.classList.add('b25-drag-source');}
      if(!drag.moved)return;e.preventDefault();if(drag.ghost){drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';}
      root.querySelectorAll('.b25-drag-target').forEach(n=>n.classList.remove('b25-drag-target'));
      const b=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-sq]');if(b&&S.game.legal[drag.from]?.includes(Number(b.dataset.sq)))b.classList.add('b25-drag-target');
    });
    root.addEventListener('pointerup',e=>{
      if(!drag)return;const d=drag,b=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-sq]');clearDrag();if(!d.moved)return;
      suppressClick=true;setTimeout(()=>suppressClick=false,0);if(root.hasPointerCapture(e.pointerId))root.releasePointerCapture(e.pointerId);
      if(b)moveTo(d.from,Number(b.dataset.sq));
    });
    root.addEventListener('pointercancel',clearDrag);
  }

  function send(from, to, promo) {
    app.socket.emit("action", promo ? { type: "move", from, to, promo } : { type: "move", from, to });
  }

  function onClick(e) {
    const g = S && S.game;
    if (!g) return;
    const promo = e.target.closest("[data-promo]");
    if (promo && pendingPromo) {
      send(pendingPromo.from, pendingPromo.to, promo.dataset.promo);
      pendingPromo = null;
      sel = -1;
      root.querySelector("#ch-promo").hidden = true;
      return;
    }
    if (e.target.closest("#ch-promo-cancel")) {
      cancelPromo();
      return;
    }
    const b = e.target.closest("[data-sq]");
    if (b && !b.disabled && g.myIndex === g.turn) {
      const i = Number(b.dataset.sq);
      if (sel >= 0 && g.legal[sel] && g.legal[sel].includes(i)) {
        moveTo(sel,i);
      } else if (g.legal[i]) {
        sel = i;
        paint();
      } else {
        sel = -1;
        paint();
      }
      return;
    }
    const th = e.target.closest("button[data-theme]");
    if (th) {
      root.dataset.theme = th.dataset.theme;
      try { localStorage.setItem("pg_chess_theme", th.dataset.theme); } catch (err) { /* private mode */ }
      root.querySelector("#ch-eyebrow").textContent = th.dataset.theme === "slate" ? "SLATE & IVORY" : "WALNUT & IVORY";
      root.querySelectorAll("button[data-theme]").forEach((b) => b.setAttribute("aria-pressed", String(b === th)));
      return;
    }
    const act = e.target.closest("[data-act]");
    if (!act) return;
    const t = act.dataset.act;
    if (t === "resign") {
      if (resign.tap(paintActions)) app.socket.emit("action", { type: "resign" });
      else paintActions();
    } else if (t === "offer") app.socket.emit("action", { type: "offerDraw" });
    else if (t === "accept") app.socket.emit("action", { type: "acceptDraw" });
    else if (t === "decline") app.socket.emit("action", { type: "declineDraw" });
  }

  function showPromo(colour) {
    const el = root.querySelector("#ch-promo");
    el.hidden = false;el.setAttribute("role","dialog");el.setAttribute("aria-modal","true");el.setAttribute("aria-label","Choose promotion piece");
    el.innerHTML = `<div class="card"><b>Promote to</b><div class="ch-promo-row">${["Q", "R", "B", "N"].map((t) => `<button type="button" class="btn ch-promo-btn" data-promo="${t}" aria-label="${WORD[t]}"><span class="ch-piece ${colour}">${GameUI.art.chessPiece(t)}</span></button>`).join("")}</div><button type="button" class="btn btn-small btn-ghost" id="ch-promo-cancel">Cancel</button></div>`;
    FX.animate(el.firstElementChild,[{opacity:.2,transform:"translateY(14px)"},{opacity:1,transform:"none"}],260);
    el.querySelector("[data-promo]").focus();
  }

  function paint() {
    const g = S.game;
    root.querySelector("#ch-board").innerHTML = boardHTML(g, { flip: g.myIndex === 1, playable: g.myIndex === g.turn, selected: sel, animate: g.moves.length !== animatedCount });
    animatedCount = g.moves.length;
  }

  function drawClocks() {
    if (!root || !S || !S.game) return;
    const g = S.game;
    root.querySelectorAll("[data-clock]").forEach((el) => {
      const i = Number(el.dataset.clock);
      if (!g.clocks) { el.textContent = ""; return; }
      const live = g.clocks[i] - (i === g.turn ? performance.now() - stamp : 0);
      el.textContent = fmt(Math.max(0, live));
      el.classList.toggle("hurry", live < 20000);
    });
  }

  function update(state) {
    const before=S?.game;
    clearDrag();
    S = state;
    const g = S.game;
    if (!g) return;
    stamp = performance.now();
    const myTurn = g.myIndex === g.turn;
    if (!myTurn || !g.legal[sel]) sel = -1;
    if (!myTurn || g.moves.length !== lastCount) {
      pendingPromo = null;
      root.querySelector("#ch-promo").hidden = true;
    }
    clock.set(g.clocks ? g.clocks[g.turn] : g.idleLeft);
    const order = g.myIndex === 1 ? [1, 0] : [0, 1]; // your side at the bottom, opponent on top
    const chip = (i) => C.playerChip(app, g.players[i], { active: g.turn === i, extra: `<span class="ch-key ${g.players[i].colour}" aria-hidden="true"></span>`, sub: (g.players[i].colour === "w" ? "White" : "Black") + (g.turn === i && i === g.myIndex ? " · Your move" : "") }) + (g.clocks ? `<span class="ch-clock ${g.turn === i ? "ticking" : ""}" data-clock="${i}"></span>` : "");
    root.querySelector("#ch-opp").innerHTML = chip(order[1]);
    root.querySelector("#ch-me").innerHTML = chip(order[0]);
    root.querySelectorAll("button[data-theme]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.theme === root.dataset.theme)));
    root.querySelector("#ch-eyebrow").textContent = root.dataset.theme === "slate" ? "SLATE & IVORY" : "WALNUT & IVORY";
    const turnName = app.esc(g.players[g.turn].name);
    const st = root.querySelector("#ch-status");
    const chk = g.check >= 0 ? ' <b class="ch-check-banner" role="status">Check — protect your king</b>' : "";
    st.innerHTML = (g.myIndex < 0 ? `You're watching. <b>${turnName}</b> is up.` : myTurn ? "<b>Your turn!</b> Tap a piece, then a square." : `Waiting for <b>${turnName}</b>...`) + chk;
    st.className = "ttt-status" + (myTurn ? " mine" : "");
    paint();
    if(before&&g.moves.length>before.moves.length&&g.last){
      let taken=before.board[g.last.to];
      const mover=before.board[g.last.from];
      if(!taken&&mover?.[1]==='P'&&(g.last.from&7)!==(g.last.to&7))taken=before.board[(g.last.from&~7)+(g.last.to&7)];
      if(taken && g.moves.length===before.moves.length+1)captures.push(taken);
      captures=captures.slice(-6);
      if(taken)FX.transient(root,root.querySelector(`[data-sq="${g.last.to}"]`),'capture');
      if(g.check>=0&&g.check!==before.check)FX.transient(root,root.querySelector(`[data-sq="${g.check}"]`),'check');
    }
    const tray=root.querySelector('#ch-captures');tray.hidden=!captures.length;
    tray.innerHTML='<small>RECENT CAPTURES</small>'+captures.map(p=>`<span class="ch-piece ${p[0]}" role="img" aria-label="Captured ${p[0]==='w'?'White':'Black'} ${WORD[p[1]]}">${GameUI.art.chessPiece(p[1])}</span>`).join('');
    const list = root.querySelector("#ch-moves");
    list.innerHTML = g.moves.reduce((h, m, i) => (i % 2 === 0 ? h + `<li><span class="n">${i / 2 + 1}.</span> <span>${app.esc(m)}</span>` : h + ` <span>${app.esc(m)}</span></li>`), "") + (g.moves.length % 2 ? "</li>" : "");
    if (g.moves.length !== lastCount) list.scrollTop = list.scrollHeight;
    const offer = root.querySelector("#ch-offer");
    if (g.myIndex >= 0 && g.drawOffer >= 0 && g.drawOffer !== g.myIndex) offer.innerHTML = `<div class="ch-offer"><b>${app.esc(g.players[g.drawOffer].name)} offers a draw.</b><div><button type="button" class="btn btn-small" data-act="accept">Accept</button> <button type="button" class="btn btn-small btn-ghost" data-act="decline">Decline</button></div></div>`;
    else if (g.drawOffer >= 0) offer.innerHTML = '<p class="muted">Draw offer sent.</p>';
    else offer.innerHTML = "";
    root.querySelector("#ch-actions").innerHTML = actionsHTML(g);
    if (g.moves.length !== lastCount && lastCount >= 0) Sound.play("drop");
    lastCount = g.moves.length;
    drawClocks();
  }

  function unmount() {
    if (clock) clock.stop();
    resign.reset();
    clearInterval(tickTimer);
    clearDrag();
    if (root) root.remove();
    root = null;
    sel = -1;captures=[];
    pendingPromo = null;
    lastCount = -1;
    animatedCount = -1;
  }

  function renderResult(r, state, a) {
    const w = r.players.find((p) => p.id === r.winnerId);
    const title = r.draw ? "It's a draw!" : r.winnerId === state.you ? "You win!" : `${a.esc(w ? w.name : "Someone")} wins!`;
    const next = r.nextUp ? `<p class="center next-up">Winner stays: <b>${a.esc(r.nextUp)}</b> plays next.</p>` : "";
    return `<h2 class="result-title b25-result">${title}</h2><p class="muted center">${a.esc(r.reasonText)} · ${Math.ceil(r.moves.length / 2)} moves</p><div class="ch-small">${boardHTML({ board: r.board, last: r.last, legal: {}, check: -1 }, { label: "Final chess board" })}</div><p class="ch-final-moves muted">${r.moves.map((m, i) => (i % 2 ? "" : `${i / 2 + 1}. `) + a.esc(m)).join(" ")}</p>${next}`;
  }

  function resultSound(r, state) {
    if (r.draw || !r.players.some((p) => p.id === state.you)) return "reveal";
    return r.winnerId === state.you ? "win" : "lose";
  }

  return { mount, update, unmount, renderResult, resultSound, scoreLabel: "wins" };
})();
