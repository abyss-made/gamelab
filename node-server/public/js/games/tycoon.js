// Property Tycoon screen: ring board, action panel, auctions, upgrades and player-to-player trades.
// Everything shown comes from the server view; buttons only send intentions.
window.GameUI = window.GameUI || {};
GameUI.tycoon = (() => {
  const C = GameUI.common;
  const TOKEN = ["#ff477b", "#4db8ff", "#adff00", "#ffcd2d", "#b48cff", "#2fd6c1"];
  let root = null;
  let app = null;
  let S = null;
  let g = null;
  let clock = null;
  let selTile = -1;
  let lastRoll = -1;
  let wasMyTurn = false;
  let bidText = "";
  let shown = {}; // token positions currently drawn (stepped towards the real ones)
  let stepTimer = 0;
  let auctionTimer = 0;
  let auctionEnds = 0;
  const html = {}; // last HTML per panel, so unchanged panels are not rebuilt
  const tf = { open: false, to: "", giveProps: new Set(), askProps: new Set(), giveCash: "", askCash: "" };

  const N = 36;
  const money = (n) => "$" + n;
  const tile = (i) => g.board[i];
  const pById = (id) => g.players.find((p) => p.id === id);
  const idxOfId = (id) => g.players.findIndex((p) => p.id === id);
  const col = (i) => TOKEN[g.players[i].colour % TOKEN.length];

  function cell(i) {
    if (i <= 9) return { row: 9, col: 9 - i, side: "b" };
    if (i <= 18) return { row: 9 - (i - 9), col: 0, side: "l" };
    if (i <= 27) return { row: 0, col: i - 18, side: "t" };
    return { row: i - 27, col: 9, side: "r" };
  }

  const corner = (t) => ["launch", "timeout", "rest", "gototimeout"].includes(t.type);
  const ICON = { launch: "GO", timeout: "TO", rest: "RS", gototimeout: "→TO", surprise: "?", tax: "$", station: "SKY", util: "UTIL" };
  const SHORT = { launch: "Launch", timeout: "Time Out", rest: "Rest", gototimeout: "Go to Time Out", surprise: "Surprise", tax: "Tax" };

  function tileLabel(i) {
    const t = tile(i);
    let s = t.name;
    if (t.group) s += `, ${g.groups[t.group].name} district`;
    if (t.price) s += `, ${money(t.price)}`;
    const o = g.owners[i];
    if (o >= 0) s += `, owned by ${g.players[o].name}${g.levels[i] ? `, ${g.levelNames[g.levels[i]]}` : ""}`;
    const here = g.players.filter((p) => !p.out && shown[p.id] === i).map((p) => p.name);
    if (here.length) s += `, here: ${here.join(", ")}`;
    return s;
  }

  function boardHTML() {
    let out = `<div class="ty-board" role="group" aria-label="Property Tycoon board">`;
    for (let i = 0; i < N; i++) {
      const t = tile(i);
      const c = cell(i);
      const o = g.owners[i];
      const lvl = g.levels[i];
      const tokens = g.players.map((p, pi) => (!p.out && shown[p.id] === i ? `<span class="ty-tok ${p.id === g.turnId ? "turn" : ""}" style="background:${TOKEN[p.colour % TOKEN.length]}" title="${app.esc(p.name)}"></span>` : "")).join("");
      const band = t.group ? `<span class="ty-band" style="background:${g.groups[t.group].color}"></span>` : "";
      const pips = lvl ? `<span class="ty-lvl" aria-hidden="true">${lvl === 4 ? "★" : "▪".repeat(lvl)}</span>` : "";
      const price = t.price ? `<span class="ty-pr">${money(t.price)}</span>` : t.amount ? `<span class="ty-pr">-${money(t.amount)}</span>` : "";
      const nm = corner(t) || t.type === "surprise" || t.type === "tax" ? SHORT[t.type] : t.name;
      const own = o >= 0 ? `<span class="ty-own" style="background:${col(o)}"></span>` : "";
      out += `<button type="button" class="ty-tile s-${c.side} t-${t.type} ${corner(t) ? "corner" : ""} ${selTile === i ? "sel" : ""}" style="grid-row:${c.row + 1};grid-column:${c.col + 1}" data-tile="${i}" aria-label="${app.esc(tileLabel(i))}">${band}<span class="ty-ic" aria-hidden="true">${ICON[t.type] && t.type !== "prop" ? ICON[t.type] : ""}</span><span class="ty-nm">${app.esc(nm)}</span>${price}${pips}${own}<span class="ty-toks">${tokens}</span></button>`;
    }
    const cur = pById(g.turnId);
    const dice = g.dice[0] ? `<span class="ty-dice ${g.rollNo !== lastRoll ? "roll" : ""}" role="img" aria-label="Dice: ${g.dice[0]} and ${g.dice[1]}"><span class="ty-die">${g.dice[0]}</span><span class="ty-die">${g.dice[1]}</span></span>` : '<span class="ty-dice muted">Roll the dice</span>';
    out += `<div class="ty-center"><div class="ty-logo">Playgrid<br>Plaza</div>${dice}<div class="ty-turn">${cur ? `<b>${app.esc(cur.name)}</b>'s turn` : ""}</div><div class="ty-round">${g.rounds ? `Round ${g.round} of ${g.rounds}` : `Round ${g.round}`}</div>${g.card ? `<div class="ty-card" role="status">${app.esc(g.card.text)}</div>` : ""}</div>`;
    return out + "</div>";
  }

  function playersHTML() {
    return g.players
      .map((p, i) => {
        const where = tile(p.pos).name;
        const status = p.out ? "Bankrupt" : p.jail ? `Time Out (turn ${p.jail})` : where;
        return C.playerChip(app, p, { active: p.id === g.turnId, extra: `<span class="ty-sw" style="background:${TOKEN[p.colour % TOKEN.length]}" aria-hidden="true"></span><b class="ty-cash">${p.out ? "–" : money(p.cash)}</b>` + (p.id === g.turnId && g.timeLeft !== null ? '<span class="fr-timer" data-timer></span>' : ""), sub: `${p.colourName} · ${status} · ${p.props} propert${p.props === 1 ? "y" : "ies"}${p.cards ? " · Get-out card" : ""}` });
      })
      .join("");
  }

  function infoHTML(i) {
    const t = tile(i);
    const o = g.owners[i];
    let rows = "";
    if (t.type === "prop") {
      rows = `<table class="ty-rent"><tbody>${g.rentTable[i].map((r, l) => `<tr class="${g.levels[i] === l && o >= 0 ? "cur" : ""}"><th scope="row">${g.levelNames[l]}</th><td>${money(r)}</td></tr>`).join("")}</tbody></table><p class="muted">Whole district owned: bare-lot rent doubles. Upgrades cost ${money(g.upgradeCost[i])} each.</p>`;
    } else if (t.type === "station") rows = '<p class="muted">Rent $25, doubling for each Skyline station the owner has ($25 / $50 / $100 / $200).</p>';
    else if (t.type === "util") rows = '<p class="muted">Rent is 4× the dice total, or 10× if the owner has both utilities.</p>';
    else if (t.type === "tax") rows = `<p class="muted">Pay ${money(t.amount)} to the bank.</p>`;
    else if (t.type === "launch") rows = `<p class="muted">Collect ${money(g.salary)} when you land on or pass it.</p>`;
    else if (t.type === "gototimeout") rows = '<p class="muted">Go straight to Time Out.</p>';
    else if (t.type === "timeout") rows = '<p class="muted">Just visiting, unless you were sent here. Pay $50, use a card or roll doubles to leave.</p>';
    else if (t.type === "rest") rows = '<p class="muted">A free rest. Nothing happens.</p>';
    else if (t.type === "surprise") rows = '<p class="muted">Draw a Surprise card.</p>';
    const owner = o >= 0 ? `Owned by <b>${app.esc(g.players[o].name)}</b>${g.levels[i] ? ` · ${g.levelNames[g.levels[i]]}` : ""}` : t.price ? `Unowned · ${money(t.price)}` : "";
    const band = t.group ? `<span class="ty-sw" style="background:${g.groups[t.group].color}"></span>${g.groups[t.group].name} district · ` : "";
    return `<div class="ty-info"><button type="button" class="btn btn-small btn-ghost ty-x" data-close-info aria-label="Close tile details">✕</button><b>${app.esc(t.name)}</b><div class="muted">${band}${owner}</div>${rows}</div>`;
  }

  function myIdx() {
    return g.myIndex;
  }

  function actionHTML() {
    const me = myIdx();
    const cur = pById(g.turnId);
    const mine = me >= 0 && g.players[me].id === g.turnId;
    const c = g.can;
    let out = "";
    if (g.auction) {
      const a = g.auction;
      const t = tile(a.tile);
      const hi = a.highId ? pById(a.highId) : null;
      const mePassed = a.mePassed;
      out += `<div class="ty-auction"><b>Auction: ${app.esc(t.name)}</b> <span class="muted">(list price ${money(t.price)})</span><div>${hi ? `High bid <b>${money(a.high)}</b> by ${app.esc(hi.name)}` : "No bids yet"} · <span id="ty-auc-left" class="ty-left"></span></div>`;
      if (me >= 0 && !g.players[me].out && !mePassed) {
        const cash = g.players[me].cash;
        const min = a.high + 1;
        out += `<div class="ty-bidrow"><label class="sr-only" for="ty-bid">Your bid</label><input type="number" id="ty-bid" inputmode="numeric" min="${min}" max="${cash}" step="1" value="${app.esc(bidText)}" placeholder="${Math.min(cash, min)}+"><button type="button" class="btn" data-act="bid">Bid</button>${[10, 50, 100].map((n) => `<button type="button" class="btn btn-small btn-ghost" data-bump="${n}" ${a.high + n > cash ? "disabled" : ""}>+${n}</button>`).join("")}${a.highId === S.you ? "" : '<button type="button" class="btn btn-small btn-ghost" data-act="pass">Pass</button>'}</div><small class="muted">You have ${money(cash)}.${a.highId === S.you ? " You are the high bidder." : ""}</small>`;
      } else if (me >= 0 && mePassed) out += '<div class="muted">You passed.</div>';
      out += "</div>";
      return out;
    }
    if (mine && c.roll) {
      const p = g.players[me];
      out += `<div class="ty-prompt"><b>${p.jail ? "You're in Time Out." : "Your turn!"}</b> ${p.jail ? "Roll for doubles, pay, or use a card." : "Roll the dice."}</div><div class="board-actions"><button type="button" class="btn" data-act="roll">Roll dice</button>${c.payJail ? '<button type="button" class="btn btn-ghost" data-act="payjail">Pay $50</button>' : ""}${c.useCard ? '<button type="button" class="btn btn-ghost" data-act="usecard">Use Get-out card</button>' : ""}</div>`;
    } else if (mine && g.phase === "buy") {
      const t = tile(g.players[me].pos);
      out += `<div class="ty-prompt"><b>${app.esc(t.name)}</b> is for sale: ${money(t.price)}. You have ${money(g.players[me].cash)}.</div><div class="board-actions"><button type="button" class="btn" data-act="buy" ${c.buy ? "" : "disabled"}>Buy for ${money(t.price)}</button><button type="button" class="btn btn-ghost" data-act="decline">Send to auction</button></div>`;
    } else if (mine && c.end) {
      out += '<div class="ty-prompt"><b>Your turn.</b> Build, trade, or end your turn.</div><div class="board-actions"><button type="button" class="btn" data-act="end">End turn</button></div>';
    } else if (cur) {
      out += `<div class="ty-prompt">Waiting for <b>${app.esc(cur.name)}</b>${g.phase === "buy" ? " to decide on a purchase" : g.phase === "roll" ? " to roll" : ""}...</div>`;
    }
    return out;
  }

  function propsHTML() {
    const me = myIdx();
    if (me < 0) return "";
    const mineTiles = [];
    for (let i = 0; i < N; i++) if (g.owners[i] === me) mineTiles.push(i);
    if (!mineTiles.length) return '<p class="muted center">You don\'t own any properties yet.</p>';
    const c = g.can;
    const rows = mineTiles
      .map((i) => {
        const t = tile(i);
        const color = t.group ? g.groups[t.group].color : "#8aa0b3";
        const up = c.build.includes(i) ? `<button type="button" class="btn btn-small" data-build="${i}">Build ${money(g.upgradeCost[i])}</button>` : "";
        const dn = c.sell.includes(i) ? `<button type="button" class="btn btn-small btn-ghost" data-sell="${i}">Sell</button>` : "";
        return `<li><span class="ty-sw" style="background:${color}"></span><button type="button" class="ty-link" data-tile="${i}">${app.esc(t.name)}</button><small class="muted">${t.type === "prop" ? g.levelNames[g.levels[i]] : t.type === "station" ? "Station" : "Utility"}</small><span class="ty-rowbtns">${up}${dn}</span></li>`;
      })
      .join("");
    return `<ul class="ty-props">${rows}</ul>`;
  }

  // ----- trades -----
  const tradeable = (i) => {
    const t = tile(i);
    return t.type !== "prop" || !g.board.some((x, j) => x.group === t.group && g.levels[j] > 0);
  };

  function tradeHTML() {
    const me = myIdx();
    let out = "";
    for (const tr of g.trades) {
      const from = pById(tr.from);
      const to = pById(tr.to);
      if (!from || !to) continue;
      const list = (props, cash) => [...props.map((i) => app.esc(tile(i).name)), ...(cash ? [money(cash)] : [])].join(", ") || "nothing";
      const involved = tr.to === S.you || tr.from === S.you;
      out += `<div class="ty-offer ${involved ? "mine" : ""}"><div><b>${app.esc(from.name)}</b> offers <b>${app.esc(to.name)}</b>: ${list(tr.giveProps, tr.giveCash)} <span class="muted">for</span> ${list(tr.askProps, tr.askCash)}</div>`;
      if (tr.to === S.you) out += `<div class="board-actions"><button type="button" class="btn btn-small" data-trade-accept="${tr.id}">Accept</button><button type="button" class="btn btn-small btn-ghost" data-trade-decline="${tr.id}">Decline</button></div>`;
      else if (tr.from === S.you) out += `<div class="board-actions"><button type="button" class="btn btn-small btn-ghost" data-trade-decline="${tr.id}">Cancel offer</button></div>`;
      out += "</div>";
    }
    if (me < 0 || g.players[me].out) return out;
    out += `<button type="button" class="btn btn-small btn-ghost" data-trade-toggle aria-expanded="${tf.open}">${tf.open ? "Close trade form" : "Propose a trade"}</button>`;
    if (tf.open) {
      const others = g.players.filter((p) => p.id !== S.you && !p.out);
      if (!others.some((p) => p.id === tf.to)) tf.to = others.length ? others[0].id : "";
      const toIdx = idxOfId(tf.to);
      const mineList = [], theirList = [];
      for (let i = 0; i < N; i++) {
        if (g.owners[i] === me) mineList.push(i);
        if (toIdx >= 0 && g.owners[i] === toIdx) theirList.push(i);
      }
      const box = (set, name, list) => (list.length ? list.map((i) => `<label class="ty-chk ${tradeable(i) ? "" : "dis"}"><input type="checkbox" data-tf-${name}="${i}" ${set.has(i) ? "checked" : ""} ${tradeable(i) ? "" : "disabled"}> ${app.esc(tile(i).name)}${tradeable(i) ? "" : " (sell upgrades first)"}</label>`).join("") : '<small class="muted">No properties</small>');
      out += `<div class="ty-form"><label class="field"><span>Trade with</span><select id="tf-to">${others.map((p) => `<option value="${p.id}" ${p.id === tf.to ? "selected" : ""}>${app.esc(p.name)}</option>`).join("")}</select></label>
        <fieldset><legend>You give</legend>${box(tf.giveProps, "give", mineList)}<label class="field"><span>Cash you give</span><input type="number" id="tf-give" min="0" max="${g.players[me].cash}" step="1" inputmode="numeric" value="${app.esc(tf.giveCash)}"></label></fieldset>
        <fieldset><legend>You get</legend>${box(tf.askProps, "ask", theirList)}<label class="field"><span>Cash you get</span><input type="number" id="tf-ask" min="0" step="1" inputmode="numeric" value="${app.esc(tf.askCash)}"></label></fieldset>
        <div class="board-actions"><button type="button" class="btn" data-trade-send>Send offer</button></div><small class="muted">The other player must accept before anything changes hands.</small></div>`;
    }
    return out;
  }

  // Replaces a panel's contents only when its HTML changed, keeping focus and typed text where they were.
  function setPanel(id, markup) {
    if (html[id] === markup) return;
    html[id] = markup;
    const el = root.querySelector("#" + id);
    const a = document.activeElement;
    const keep = a && el.contains(a) && a.id ? { id: a.id, start: a.selectionStart, end: a.selectionEnd } : null;
    el.innerHTML = markup;
    if (keep) {
      const n = root.querySelector("#" + keep.id);
      if (n) {
        n.focus({ preventScroll: true });
        try { n.setSelectionRange(keep.start, keep.end); } catch (e) { /* number inputs have no selection */ }
      }
    }
  }

  function paint() {
    if (!root || !g) return;
    setPanel("ty-boardwrap", boardHTML());
    setPanel("ty-players", playersHTML());
    setPanel("ty-actions", actionHTML());
    setPanel("ty-info", selTile >= 0 ? infoHTML(selTile) : "");
    setPanel("ty-props", propsHTML());
    setPanel("ty-trades", tradeHTML());
    setPanel("ty-log", `<ol>${g.log.slice().reverse().map((l) => `<li>${app.esc(l)}</li>`).join("")}</ol>`);
    root.querySelector("#ty-auc-left") && tickAuction();
  }

  function tickAuction() {
    const el = root && root.querySelector("#ty-auc-left");
    if (el) el.textContent = Math.max(0, Math.ceil((auctionEnds - performance.now()) / 1000)) + "s left";
  }

  // Walks each token forward one tile at a time so moves are easy to follow.
  function stepTokens() {
    clearInterval(stepTimer);
    const differs = () => g.players.some((p) => shown[p.id] !== p.pos);
    if (!differs()) return;
    stepTimer = setInterval(() => {
      if (!root || !g) return clearInterval(stepTimer);
      let more = false;
      for (const p of g.players) {
        if (shown[p.id] === undefined) shown[p.id] = p.pos;
        if (shown[p.id] === p.pos) continue;
        const fwd = (p.pos - shown[p.id] + N) % N;
        if (fwd > 0 && fwd <= 12 && !(g.moved && g.moved.id === p.id && g.moved.jump)) {
          shown[p.id] = (shown[p.id] + 1) % N;
          more = more || shown[p.id] !== p.pos;
        } else shown[p.id] = p.pos;
      }
      html["ty-boardwrap"] = null;
      setPanel("ty-boardwrap", boardHTML());
      if (!more) clearInterval(stepTimer);
    }, 120);
  }

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 ty";
    root.dataset.view = "map";
    root.innerHTML = `<div class="b2-players card ty-players" id="ty-players"></div>
      <div class="ty-views" role="group" aria-label="Phone view"><button type="button" class="btn btn-small" data-tyview="map" aria-pressed="true">Map</button><button type="button" class="btn btn-small btn-ghost" data-tyview="props" aria-pressed="false">Properties &amp; trades</button></div>
      <div id="ty-boardwrap"></div>
      <div id="ty-info" aria-live="polite"></div>
      <div class="card ty-actions" id="ty-actions" aria-live="polite"></div>
      <details class="card ty-sect" open><summary>Your properties</summary><div id="ty-props"></div></details>
      <details class="card ty-sect" open><summary>Trades</summary><div id="ty-trades"></div></details>
      <details class="card ty-sect"><summary>Game log</summary><div id="ty-log" class="ty-log"></div></details>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    auctionTimer = setInterval(tickAuction, 250);
    root.addEventListener("click", (e) => {
      const t = e.target;
      const vw = t.closest("[data-tyview]");
      if (vw) {
        root.dataset.view = vw.dataset.tyview;
        root.querySelectorAll("[data-tyview]").forEach((b) => {
          const on = b === vw;
          b.setAttribute("aria-pressed", String(on));
          b.classList.toggle("btn-ghost", !on);
        });
        return;
      }
      const tl = t.closest("[data-tile]");
      if (tl) {
        selTile = selTile === Number(tl.dataset.tile) ? -1 : Number(tl.dataset.tile);
        return paint();
      }
      if (t.closest("[data-close-info]")) { selTile = -1; return paint(); }
      const act = t.closest("[data-act]");
      if (act) {
        const k = act.dataset.act;
        if (k === "bid") {
          const amount = Number(bidText);
          if (Number.isInteger(amount) && amount > 0) { app.socket.emit("action", { type: "bid", amount }); bidText = ""; }
        } else app.socket.emit("action", { type: k });
        return;
      }
      const bump = t.closest("[data-bump]");
      if (bump) {
        const base = Math.max(g.auction ? g.auction.high : 0, Number(bidText) || 0);
        app.socket.emit("action", { type: "bid", amount: base + Number(bump.dataset.bump) });
        bidText = "";
        return;
      }
      const b = t.closest("[data-build]");
      if (b) return app.socket.emit("action", { type: "build", tile: Number(b.dataset.build) });
      const s = t.closest("[data-sell]");
      if (s) return app.socket.emit("action", { type: "sell", tile: Number(s.dataset.sell) });
      const ta = t.closest("[data-trade-accept]");
      if (ta) return app.socket.emit("action", { type: "trade_accept", id: Number(ta.dataset.tradeAccept) });
      const td = t.closest("[data-trade-decline]");
      if (td) return app.socket.emit("action", { type: "trade_decline", id: Number(td.dataset.tradeDecline) });
      if (t.closest("[data-trade-toggle]")) { tf.open = !tf.open; return paint(); }
      if (t.closest("[data-trade-send]")) {
        app.socket.emit("action", { type: "trade_offer", to: tf.to, giveProps: [...tf.giveProps], askProps: [...tf.askProps], giveCash: Math.max(0, Math.floor(Number(tf.giveCash) || 0)), askCash: Math.max(0, Math.floor(Number(tf.askCash) || 0)) });
        tf.open = false;
        tf.giveProps.clear(); tf.askProps.clear(); tf.giveCash = ""; tf.askCash = "";
        paint();
      }
    });
    root.addEventListener("input", (e) => {
      const t = e.target;
      if (t.id === "ty-bid") bidText = t.value;
      else if (t.id === "tf-give") tf.giveCash = t.value;
      else if (t.id === "tf-ask") tf.askCash = t.value;
    });
    root.addEventListener("change", (e) => {
      const t = e.target;
      if (t.id === "tf-to") { tf.to = t.value; tf.askProps.clear(); paint(); }
      else if (t.dataset.tfGive !== undefined) { t.checked ? tf.giveProps.add(Number(t.dataset.tfGive)) : tf.giveProps.delete(Number(t.dataset.tfGive)); }
      else if (t.dataset.tfAsk !== undefined) { t.checked ? tf.askProps.add(Number(t.dataset.tfAsk)) : tf.askProps.delete(Number(t.dataset.tfAsk)); }
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.id === "ty-bid") {
        e.preventDefault();
        const amount = Number(bidText);
        if (Number.isInteger(amount) && amount > 0) { app.socket.emit("action", { type: "bid", amount }); bidText = ""; }
      }
    });
  }

  function update(state) {
    S = state;
    g = state.game;
    if (!g) return;
    clock.set(g.timeLeft);
    for (const p of g.players) if (shown[p.id] === undefined) shown[p.id] = p.pos;
    auctionEnds = g.auction ? performance.now() + g.auction.leftMs : 0;
    const myTurn = g.myIndex >= 0 && g.players[g.myIndex].id === g.turnId;
    if (myTurn && !wasMyTurn && lastRoll >= 0) Sound.play("yourturn");
    wasMyTurn = myTurn;
    if (g.rollNo !== lastRoll && lastRoll >= 0) Sound.play("drop");
    paint();
    lastRoll = g.rollNo;
    stepTokens();
  }

  function unmount() {
    clearInterval(stepTimer);
    clearInterval(auctionTimer);
    if (clock) clock.stop();
    if (root) root.remove();
    root = null; g = null; selTile = -1; lastRoll = -1; shown = {}; wasMyTurn = false; bidText = "";
    for (const k of Object.keys(html)) delete html[k];
    tf.open = false; tf.giveProps.clear(); tf.askProps.clear(); tf.giveCash = ""; tf.askCash = "";
  }

  function renderResult(r, state, a) {
    const top = r.standings[0];
    const title = r.tie ? (r.winners.includes(state.you) ? "It's a tie, and you're in it!" : "It's a tie!") : r.winnerId === state.you ? "You win!" : `${a.esc(top ? top.name : "Someone")} wins!`;
    const why = r.reason === "rounds" ? `After ${r.rounds} rounds, the richest player wins.` : "Everyone else went bankrupt or left.";
    const rows = r.standings
      .map((p, i) => `<li class="${p.id === state.you ? "me" : ""}"><span class="rank">${i + 1}</span>${a.avatarHTML(p.avatar)}<b>${a.esc(p.name)}</b><span class="pts">${p.out ? "bankrupt" : `$${p.worth} net worth`}</span></li>`)
      .join("");
    return `<h2 class="result-title">${title}</h2><p class="muted center">${why}</p><ol class="b2-podium">${rows}</ol>`;
  }

  function resultSound(r, state) {
    if (!r.winners.length || !r.standings.some((p) => p.id === state.you)) return "reveal";
    return r.winners.includes(state.you) ? "win" : "lose";
  }

  return { mount, update, unmount, renderResult, resultSound, scoreLabel: "wins" };
})();
