// Battleship screen: private fleet placement (tap to place, rotate, random), then aim-and-fire.
// The client only ever knows its own fleet plus public shot results.
window.GameUI = window.GameUI || {};
GameUI.battleship = (() => {
  const C = GameUI.common;
  const resign = C.makeConfirm(); // survives re-renders, so an opponent's shot doesn't disarm it
  const resignHTML = () => `<button type="button" class="btn btn-small btn-ghost" id="bs-resign"${resign.armed ? ' data-armed="1"' : ""}>${resign.armed ? "Tap again to resign" : "Resign"}</button>`;
  const paintResign = () => {
    const b = document.getElementById("bs-resign");
    if (b) C.keepFocus(document.getElementById("stage"), () => (b.outerHTML = resignHTML()));
  };
  const N = 10;
  const COLS = "ABCDEFGHIJ";
  let root = null;
  let app = null;
  let S = null;
  let clock = null;
  let placed = []; // local draft: [{x, y, horizontal}|null] in fleet order
  let pick = 0;
  let horizontal = true;
  let aim = -1;
  let msg = "";
  let lastMoves = -1;

  const cellName = (c) => COLS[c % N] + (Math.floor(c / N) + 1);
  const shipCells = (len, s) => Array.from({ length: len }, (_, k) => (s.y + (s.horizontal ? 0 : k)) * N + s.x + (s.horizontal ? k : 0));

  function resetDraft() {
    placed = [null, null, null, null, null];
    pick = 0;
    horizontal = true;
    msg = "";
  }

  // opts: ships = own ship cell map (cell -> ship index), shots (0/1/2), sunk (cell set), aim, last, tappable
  function gridHTML(opts) {
    const { shots, ships, sunk, aimCell = -1, lastCell = -1, tappable = false, label, draftCells } = opts;
    let html = `<div class="bs-grid" role="group" aria-label="${label}"><i class="bs-corner"></i>`;
    for (let x = 0; x < N; x++) html += `<i class="bs-head">${COLS[x]}</i>`;
    for (let y = 0; y < N; y++) {
      html += `<i class="bs-head">${y + 1}</i>`;
      for (let x = 0; x < N; x++) {
        const c = y * N + x;
        const shot = shots ? shots[c] : 0;
        const ship = ships && ships.has(c);
        const cls = ["bs-cell", ship ? "ship" : "", draftCells && draftCells.has(c) ? "draft" : "", shot === 1 ? "miss" : "", shot === 2 ? "hit" : "", sunk && sunk.has(c) ? "sunk" : "", aimCell === c ? "aim" : "", lastCell === c ? "last" : ""].join(" ");
        const state = shot === 2 ? (sunk && sunk.has(c) ? "hit, ship sunk" : "hit") : shot === 1 ? "miss" : ship ? "your ship" : "unknown";
        const off = !tappable || (shots && shots[c]);
        html += `<button type="button" class="${cls}" data-cell="${c}" aria-label="${cellName(c)}: ${state}" ${off ? "disabled" : ""}>${shot === 2 ? "✹" : shot === 1 ? "•" : ""}</button>`;
      }
    }
    return html + "</div>";
  }

  function mount(stage, a) {
    app = a;
    resetDraft();
    root = document.createElement("div");
    root.className = "b2 bs";
    root.innerHTML = `<div class="b2-players card" id="bs-players"></div>
      <div class="ttt-status" id="bs-status" aria-live="polite"></div>
      <div id="bs-main"></div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("click", (e) => C.keepFocus(document.getElementById("stage"), () => onClick(e)));
  }

  function onClick(e) {
    const g = S && S.game;
    if (!g) return;
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.ship !== undefined) {
      const i = Number(t.dataset.ship);
      if (placed[i]) placed[i] = null; // pick a placed ship back up
      pick = i;
      msg = "";
      return paint();
    }
    if (t.id === "bs-rotate") {
      horizontal = !horizontal;
      return paint();
    }
    if (t.id === "bs-clear") {
      resetDraft();
      return paint();
    }
    if (t.id === "bs-random") return app.socket.emit("action", { type: "random" });
    if (t.id === "bs-lock") {
      if (placed.every(Boolean)) app.socket.emit("action", { type: "place", ships: placed.map((s) => ({ x: s.x, y: s.y, horizontal: s.horizontal })) });
      return;
    }
    if (t.id === "bs-fire") {
      if (aim >= 0) app.socket.emit("action", { type: "fire", cell: aim });
      aim = -1;
      return;
    }
    if (t.id === "bs-resign") {
      if (resign.tap(paintResign)) app.socket.emit("action", { type: "resign" });
      else paintResign();
      return;
    }
    if (t.dataset.cell === undefined || t.disabled) return;
    const c = Number(t.dataset.cell);
    if (g.phase === "place") return placeAt(c, g);
    if (g.phase === "battle" && g.myIndex === g.turn) {
      aim = c;
      paint();
    }
  }

  function placeAt(c, g) {
    if (g.players[g.myIndex].ready) return;
    if (pick < 0 || pick > 4 || placed[pick]) {
      pick = placed.findIndex((s) => !s);
      if (pick < 0) { msg = "All ships placed. Lock in your fleet when ready."; return paint(); }
    }
    const s = { x: c % N, y: Math.floor(c / N), horizontal };
    const cells = shipCells(g.fleet[pick].len, s);
    const out = cells.some((cc, k) => (s.horizontal ? s.x + k >= N : s.y + k >= N));
    const used = new Set();
    placed.forEach((p, i) => { if (p) shipCells(g.fleet[i].len, p).forEach((q) => used.add(q)); });
    if (out) msg = "That ship would hang off the board. Try another square or rotate it.";
    else if (cells.some((q) => used.has(q))) msg = "Ships cannot overlap.";
    else {
      placed[pick] = s;
      msg = "";
      const next = placed.findIndex((p) => !p);
      pick = next;
    }
    paint();
  }

  function legend(g) {
    return `<ul class="bs-fleet">${g.fleet.map((s, i) => `<li><button type="button" class="bs-ship ${i === pick ? "cur" : ""} ${placed[i] ? "done" : ""}" data-ship="${i}" aria-pressed="${i === pick}">${s.name} <span>${"■".repeat(s.len)}</span>${placed[i] ? " ✓" : ""}</button></li>`).join("")}</ul>`;
  }

  function paint() {
    const g = S.game;
    const main = root.querySelector("#bs-main");
    const me = g.myIndex;
    const st = root.querySelector("#bs-status");
    if (g.phase === "place") {
      if (me < 0) {
        st.textContent = "Both players are placing their fleets in secret.";
        main.innerHTML = "";
        return;
      }
      const ready = g.players[me].ready;
      const draftShips = new Map();
      const draftCells = new Set();
      placed.forEach((p, i) => { if (p) shipCells(g.fleet[i].len, p).forEach((q) => { draftShips.set(q, i); draftCells.add(q); }); });
      const shipsSet = ready && g.myShips ? new Set(g.myShips.flatMap((s) => s.cells)) : new Set(draftShips.keys());
      const foe = g.players[1 - me];
      st.innerHTML = ready ? `Fleet locked in. ${foe.ready ? "Starting..." : `Waiting for <b>${app.esc(foe.name)}</b> to place theirs.`}` : msg ? `<span class="warn-text">${app.esc(msg)}</span>` : `Place your <b>${app.esc(g.fleet[Math.max(0, pick)] ? g.fleet[Math.max(0, pick)].name : "fleet")}</b>: tap its top-left square.`;
      st.className = "ttt-status" + (ready ? "" : " mine");
      main.innerHTML = `<div class="card bs-place"><div class="bs-boardwrap">${gridHTML({ ships: shipsSet, shots: null, tappable: !ready, label: "Your fleet placement board" })}</div>
        ${ready ? "" : `${legend(g)}<div class="bs-ctl"><button type="button" class="btn btn-small" id="bs-rotate">Rotate: ${horizontal ? "horizontal ↔" : "vertical ↕"}</button><button type="button" class="btn btn-small btn-ghost" id="bs-random">Random fleet</button><button type="button" class="btn btn-small btn-ghost" id="bs-clear">Clear</button></div><button type="button" class="btn bs-lock" id="bs-lock" ${placed.every(Boolean) ? "" : "disabled"}>Lock in fleet</button>`}</div>`;
      return;
    }
    // battle
    const myTurn = me === g.turn;
    const turnName = app.esc(g.players[g.turn].name);
    const lastTxt = describeLast(g);
    st.innerHTML = (me < 0 ? `You're watching. <b>${turnName}</b> is firing.` : myTurn ? `<b>Your turn!</b> ${aim >= 0 ? `Target ${cellName(aim)} locked. Press Fire!` : "Tap a square in enemy waters to aim."}` : `Waiting for <b>${turnName}</b> to fire...`) + (lastTxt ? ` <span class="muted">${lastTxt}</span>` : "");
    st.className = "ttt-status" + (myTurn ? " mine" : "");
    if (me < 0) {
      main.innerHTML = `<div class="bs-two">${g.players.map((p, i) => `<div class="card"><h3 class="bs-title">${app.esc(p.name)}'s waters <small>${p.remaining} ships left</small></h3>${gridHTML({ shots: p.shots, sunk: new Set(p.sunk.flatMap((s) => s.cells)), lastCell: g.last && g.last.by !== i ? g.last.cell : -1, label: `${p.name}'s waters` })}</div>`).join("")}</div>`;
      return;
    }
    const foe = g.players[1 - me];
    const mine = g.players[me];
    const myShipCells = new Set((g.myShips || []).flatMap((s) => s.cells));
    main.innerHTML = `<div class="bs-two"><div class="card"><h3 class="bs-title">Enemy waters <small>${foe.remaining} ships left</small></h3>${gridHTML({ shots: foe.shots, sunk: new Set(foe.sunk.flatMap((s) => s.cells)), aimCell: aim, lastCell: g.last && g.last.by === me ? g.last.cell : -1, tappable: myTurn, label: "Enemy waters" })}
      <div class="bs-ctl"><button type="button" class="btn bs-fire" id="bs-fire" ${myTurn && aim >= 0 ? "" : "disabled"}>Fire!</button>${resignHTML()}</div></div>
      <div class="card"><h3 class="bs-title">Your fleet <small>${mine.remaining} ships left</small></h3>${gridHTML({ shots: mine.shots, ships: myShipCells, sunk: new Set(mine.sunk.flatMap((s) => s.cells)), lastCell: g.last && g.last.by !== me ? g.last.cell : -1, label: "Your fleet" })}</div></div>`;
  }

  function describeLast(g) {
    if (!g.last) return "";
    const target = g.players[1 - g.last.by];
    const v = target.shots[g.last.cell];
    const who = g.myIndex === g.last.by ? "You" : app.esc(g.players[g.last.by].name);
    const sunk = target.sunk.find((s) => s.cells.includes(g.last.cell));
    return `${who} fired at ${cellName(g.last.cell)}: ${sunk && v === 2 ? `hit and sunk the ${sunk.name}!` : v === 2 ? "hit!" : "miss."}`;
  }

  function update(state) {
    S = state;
    const g = S.game;
    if (!g) return;
    if (g.phase === "battle" || (g.myIndex >= 0 && g.players[g.myIndex].ready)) { /* keep draft */ }
    if (g.phase === "battle" && g.myIndex !== g.turn) aim = -1;
    if (g.phase === "battle" && aim >= 0 && g.myIndex >= 0 && g.players[1 - g.myIndex].shots[aim]) aim = -1;
    clock.set(g.timeLeft);
    root.querySelector("#bs-players").innerHTML = g.players
      .map((p, i) => C.playerChip(app, p, { active: g.phase === "battle" ? g.turn === i : !p.ready, extra: g.phase === "battle" ? (g.turn === i && g.timeLeft !== null ? '<span class="fr-timer" data-timer></span>' : "") : p.ready ? '<span class="bs-badge">Ready</span>' : '<span class="bs-badge wait">Placing</span>', sub: g.phase === "battle" ? `${p.remaining} ship${p.remaining === 1 ? "" : "s"} left` : "" }))
      .join("");
    paint();
    if (g.moves !== lastMoves && lastMoves >= 0) Sound.play("drop");
    lastMoves = g.moves;
  }

  function unmount() {
    if (clock) clock.stop();
    resign.reset();
    if (root) root.remove();
    root = null;
    lastMoves = -1;
    aim = -1;
  }

  function renderResult(r, state, a) {
    const w = r.players.find((p) => p.id === r.winnerId);
    const title = r.winnerId === state.you ? "You win!" : `${a.esc(w ? w.name : "Someone")} wins!`;
    const next = r.nextUp ? `<p class="center next-up">Winner stays: <b>${a.esc(r.nextUp)}</b> plays next.</p>` : "";
    const boards = r.players
      .map((p) => {
        const ships = new Set(p.fleet.flatMap((s) => s.cells));
        return `<div><h3 class="bs-title">${a.esc(p.name)}'s fleet <small>${p.remaining} left</small></h3><div class="bs-small">${gridHTML({ shots: p.shots, ships, label: `${p.name}'s final fleet` })}</div></div>`;
      })
      .join("");
    return `<h2 class="result-title">${title}</h2>${r.forfeit ? '<p class="muted center">Won by forfeit.</p>' : ""}<div class="bs-two">${boards}</div>${next}`;
  }

  function resultSound(r, state) {
    if (!r.players.some((p) => p.id === state.you)) return "reveal";
    return r.winnerId === state.you ? "win" : "lose";
  }

  return { mount, update, unmount, renderResult, resultSound, scoreLabel: "wins" };
})();
