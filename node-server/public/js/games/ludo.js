// Ludo screen: 15x15 cross board, server-rolled dice, big touch buttons for choosing a token.
window.GameUI = window.GameUI || {};
GameUI.ludo = (() => {
  const C = GameUI.common;
  const PIPS = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  const HEX = ["#ff477b", "#adff00", "#ffcd2d", "#4db8ff"];
  const NAMES = ["Red", "Green", "Yellow", "Blue"];
  // The 52 track squares as [col, row], clockwise from Red's start.
  const TRACK = [
    [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0],
    [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7], [14, 8],
    [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [7, 14], [6, 14],
    [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6],
  ];
  const HOMECOL = [
    [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
    [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  ];
  const YARD = [
    [[2, 2], [4, 2], [2, 4], [4, 4]],
    [[10, 2], [12, 2], [10, 4], [12, 4]],
    [[10, 10], [12, 10], [10, 12], [12, 12]],
    [[2, 10], [4, 10], [2, 12], [4, 12]],
  ];
  const SAFE = new Set([0, 13, 26, 39, 8, 21, 34, 47]);

  let root = null;
  let app = null;
  let S = null;
  let clock = null;
  let lastRolls = -1;
  let animateMove = false;
  let lastMoveKey = null; // identity of the last confirmed move event; null until the first state is seen

  const pos = (colour, tokenIdx, prog) => {
    if (prog === -1) return YARD[colour][tokenIdx];
    if (prog <= 50) return TRACK[(colour * 13 + prog) % 52];
    if (prog <= 55) return HOMECOL[colour][prog - 51];
    return [7, 7];
  };

  function boardHTML(g) {
    const cells = {};
    const key = (c, r) => c + "," + r;
    const base = {};
    // coloured quadrants and arms
    for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) base[key(c, r)] = { cls: "void" };
    for (let q = 0; q < 4; q++) {
      const [x0, y0] = [[0, 0], [9, 0], [9, 9], [0, 9]][q];
      for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) base[key(x0 + c, y0 + r)] = { cls: "yard c" + q };
    }
    TRACK.forEach(([c, r], i) => {
      base[key(c, r)] = { cls: "track" + (SAFE.has(i) ? " safe" : "") + (i % 13 === 0 ? " start c" + i / 13 : "") + (i % 13 === 8 ? " star" : "") };
    });
    HOMECOL.forEach((col, q) => col.forEach(([c, r]) => (base[key(c, r)] = { cls: "homecol c" + q })));
    base[key(7, 7)] = { cls: "centre" };
    YARD.forEach((ys, q) => ys.forEach(([c, r]) => (base[key(c, r)] = { cls: "yardspot c" + q })));
    // tokens
    g.players.forEach((p) => {
      p.tokens.forEach((prog, ti) => {
        const [c, r] = pos(p.colour, ti, prog);
        (cells[key(c, r)] = cells[key(c, r)] || []).push({ p, ti, prog });
      });
    });
    const turnId = g.turnId;
    let html = `<div class="ld2-board" role="group" aria-label="Ludo board">`;
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const b = base[key(c, r)];
        const toks = cells[key(c, r)] || [];
        const inner = toks
          .map(({ p, ti, prog }) => {
            const can = p.id === S.you && g.movable.includes(ti);
            const label = `${p.colourName} token ${ti + 1}${prog === -1 ? " in the yard" : prog === 56 ? " home" : ""}${can ? ", can move" : ""}`;
            return `<button type="button" class="ld2-tok c${p.colour} ${can ? "can" : ""} ${turnId === p.id ? "turn" : ""}${animateMove && g.lastEvent && g.lastEvent.kind === "move" && g.lastEvent.by === p.id && g.lastEvent.token === ti ? " moved" : ""}" ${can ? `data-token="${ti}"` : "disabled"} aria-label="${label}">${ti + 1}</button>`;
          })
          .join("");
        const ev = g.lastEvent;
        html += `<div class="ld2-cell ${b.cls} ${toks.length > 1 ? "multi" : ""}" style="grid-column:${c + 1};grid-row:${r + 1}">${inner}</div>`;
      }
    }
    return html + "</div>";
  }

  function mount(stage, a) {
    app = a;
    root = document.createElement("div");
    root.className = "b2 ld2";
    root.innerHTML = `<div class="b2-players card" id="ld2-players"></div>
      <div class="card ld2-main"><div class="ld2-status" id="ld2-status" aria-live="polite"></div>
      <div class="ld2-dicebar"><div class="ld2-die" id="ld2-die" role="img" aria-label="Dice"></div><div class="ld2-ctl" id="ld2-ctl"></div></div>
      <div id="ld2-board"></div></div>`;
    stage.appendChild(root);
    clock = C.makeClock(() => root);
    root.addEventListener("click", (e) => {
      const t = e.target.closest("[data-token],[data-roll],[data-move]");
      if (!t || t.disabled || !S || !S.game) return;
      if (t.dataset.roll) app.socket.emit("action", { type: "roll" });
      else app.socket.emit("action", { type: "move", token: Number(t.dataset.token !== undefined ? t.dataset.token : t.dataset.move) });
    });
  }

  function describe(g) {
    const e = g.lastEvent;
    if (!e) return "";
    const p = g.players.find((x) => x.id === e.by);
    const who = p ? (p.id === S.you ? "You" : app.esc(p.name)) : "Someone";
    if (e.kind === "sixes") return `${who} rolled three sixes in a row and lose the turn.`;
    if (e.kind === "stuck") return `${who} had no legal move.`;
    if (e.kind === "move") {
      const cap = e.captured ? g.players.find((x) => x.id === e.captured) : null;
      return `${who} moved token ${e.token + 1}${e.to === 56 ? " home" : ""}${cap ? ` and sent ${cap.id === S.you ? "your" : app.esc(cap.name) + "'s"} token back to the yard` : ""}.`;
    }
    return "";
  }

  function update(state) {
    S = state;
    const g = S.game;
    if (!g) return;
    clock.set(g.timeLeft);
    root.querySelector("#ld2-players").innerHTML = g.players
      .map((p) => C.playerChip(app, p, { active: g.turnId === p.id && !p.out, extra: `<span class="ld2-key c${p.colour}" aria-hidden="true"></span>` + (g.turnId === p.id && g.timeLeft !== null ? '<span class="fr-timer" data-timer></span>' : ""), sub: `${p.colourName} · ${p.home}/4 home${p.out ? " · out" : ""}` }))
      .join("");
    const mine = g.turnId === S.you && g.myIndex >= 0;
    const tp = g.players.find((p) => p.id === g.turnId);
    const tName = tp ? app.esc(tp.name) : "?";
    let text;
    if (g.myIndex < 0) text = `You're watching. <b>${tName}</b> ${g.phase === "roll" ? "is rolling" : "is choosing"}.`;
    else if (mine && g.phase === "roll") text = "<b>Your turn!</b> Roll the dice.";
    else if (mine && g.phase === "move") text = `<b>You rolled a ${g.dice}.</b> Choose a token to move.`;
    else if (mine) text = "No legal move this time...";
    else text = `Waiting for <b>${tName}</b>...`;
    root.querySelector("#ld2-status").innerHTML = text + (describe(g) ? `<div class="muted">${describe(g)}</div>` : "");
    const die = root.querySelector("#ld2-die");
    die.innerHTML = g.dice ? `<span class="sr-only">${g.dice}</span>` + GameUI.art.dieFace(g.dice) : '<span class="ld2-die-idle">?</span>';
    die.dataset.value = g.dice || "";
    die.setAttribute("aria-label", g.dice ? "Dice shows " + g.dice : "Dice");
    die.classList.toggle("roll", g.rolls !== lastRolls && lastRolls >= 0);
    const ctl = root.querySelector("#ld2-ctl");
    if (mine && g.phase === "roll") ctl.innerHTML = '<button type="button" class="btn ld2-roll" data-roll="1">Roll dice</button>';
    else if (mine && g.phase === "move") {
      const me = g.players[g.myIndex];
      ctl.innerHTML = g.movable.map((ti) => `<button type="button" class="btn btn-small ld2-pick c${me.colour}" data-move="${ti}">Token ${ti + 1} · ${g.dice} step${g.dice === 1 ? "" : "s"}${me.tokens[ti] === -1 ? " (leave yard)" : ""}</button>`).join("");
    } else ctl.innerHTML = "";
    const ev = g.lastEvent;
    const moveKey = ev && ev.kind === "move" ? `${ev.by}:${ev.token}:${ev.from}:${ev.to}` : "";
    // Animate only when a new confirmed move arrives, never on a later roll that keeps the old event.
    animateMove = lastMoveKey !== null && moveKey !== "" && moveKey !== lastMoveKey;
    lastMoveKey = moveKey;
    root.querySelector("#ld2-board").innerHTML = boardHTML(g);
    if (g.rolls !== lastRolls && lastRolls >= 0) Sound.play("drop");
    if (mine && g.phase === "roll" && lastRolls >= 0) Sound.play("yourturn");
    lastRolls = g.rolls;
  }

  function unmount() {
    if (clock) clock.stop();
    if (root) root.remove();
    root = null;
    lastRolls = -1;
    lastMoveKey = null;
    animateMove = false;
  }

  function renderResult(r, state, a) {
    const w = r.standings.find((p) => p.id === r.winnerId);
    const title = r.winnerId === state.you ? "You win!" : `${a.esc(w ? w.name : "Someone")} wins!`;
    return `<h2 class="result-title">${title}</h2>${r.forfeit ? '<p class="muted center">Everyone else left the game.</p>' : ""}${C.podium(r.standings, a, (p) => `${p.home}/4`, "home")}`;
  }

  function resultSound(r, state) {
    if (!r.standings.some((p) => p.id === state.you)) return "reveal";
    return r.winnerId === state.you ? "win" : "lose";
  }

  return { mount, update, unmount, renderResult, resultSound, scoreLabel: "home" };
})();
