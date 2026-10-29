// App shell: home, lobby browser, create/join, lobby screen, chat.
// Each game's own screen lives in /js/games/*.js.
(() => {
  // Preserve the server's 24 avatar indices and 10 color indices.
  const AVATAR_COUNT = 24;
  const { icon, mark } = Playgrid;
  const COLORS = [
    "#ff6b6b",
    "#ffa94d",
    "#ffd43b",
    "#69db7c",
    "#38d9a9",
    "#4dabf7",
    "#748ffc",
    "#b197fc",
    "#f783ac",
    "#ced4da",
  ];

  const GAMES = {
    drawguess: {
      name: "Draw & Guess",
      slug: "draw-and-guess",
      min: 2,
      max: 12,
      players: "2–12 active players",
      overflow: "Extra people in the room spectate",
      blurb: "Draw, guess, and have fun together",
      art: '<img src="/assets/draw-guess.svg" alt="A paintbrush over a splash of lime paint" width="180" height="180">',
    },
    fourrow: {
      name: "Four in a Row",
      slug: "four-in-a-row",
      min: 2,
      max: 2,
      players: "2 active players",
      overflow: "Everyone else in the room spectates",
      blurb: "Classic game, multiplayer style",
      art: '<img src="/assets/four-row.svg" alt="A blue board with red and yellow game pieces" width="180" height="180">',
    },
    wordchain: {
      name: "Word Chain",
      slug: "word-chain",
      min: 2,
      max: 8,
      players: "2–8 active players",
      overflow: "Extra people in the room spectate",
      blurb: "Chain words by their last letter",
      art: '<img src="/assets/word-chain.svg" alt="Linked letter tiles" width="180" height="180">',
    },
    categories: {
      name: "Categories Rush",
      slug: "categories-rush",
      min: 2,
      max: 12,
      players: "2–12 active players",
      overflow: "Extra people in the room spectate",
      blurb: "Beat the clock and your friends' answers",
      art: '<img src="/assets/categories-rush.svg" alt="A list with a stopwatch" width="180" height="180">',
    },
    higherlower: {
      name: "Higher or Lower",
      slug: "higher-or-lower",
      min: 2,
      max: 8,
      players: "2–8 active players",
      overflow: "Extra people in the room spectate",
      blurb: "Call the next card and build a streak",
      art: '<img src="/assets/higher-lower.svg" alt="Two playing cards with arrows" width="180" height="180">',
    },
    colorstack: {
      name: "Color Stack",
      slug: "color-stack",
      min: 2,
      max: 8,
      players: "2–8 active players",
      overflow: "Extra people in the room spectate",
      blurb: "Match colors and be first out of cards",
      art: '<img src="/assets/color-stack.svg" alt="A fan of colored cards" width="180" height="180">',
    },
    gofish: {
      name: "Go Fish",
      slug: "go-fish",
      min: 2,
      max: 6,
      players: "2–6 active players",
      overflow: "Extra people in the room spectate",
      blurb: "Ask for ranks and collect books",
      art: '<img src="/assets/go-fish.svg" alt="A fish and playing cards" width="180" height="180">',
    },
    tictactoe: {
      name: "Tic Tac Toe",
      slug: "tic-tac-toe",
      min: 2,
      max: 2,
      players: "2 active players",
      overflow: "Everyone else in the room spectates",
      blurb: "Three in a row wins the board",
      art: '<img src="/assets/tic-tac-toe.svg" alt="A Tic Tac Toe board with X and O marks" width="180" height="180">',
    },
    rps: {
      name: "Rock Paper Scissors",
      slug: "rock-paper-scissors",
      min: 2,
      max: 16,
      players: "2–16 active players",
      overflow: "Extra people in the room spectate",
      blurb: "Win your bracket, one throw at a time",
      art: '<img src="/assets/rps.svg" alt="A rock, paper and scissors in a bracket" width="180" height="180">',
    },
    dotsboxes: {
      name: "Dots & Boxes",
      slug: "dots-and-boxes",
      min: 2,
      max: 4,
      players: "2–4 active players",
      overflow: "Extra people in the room spectate",
      blurb: "Connect dots, claim boxes, take extra turns",
      art: '<img src="/assets/dots-boxes.svg" alt="A grid of dots with some boxes filled in" width="180" height="180">',
    },
    wordscramble: {
      name: "Word Scramble",
      slug: "word-scramble",
      min: 2,
      max: 12,
      players: "2–12 active players",
      overflow: "Extra people in the room spectate",
      blurb: "Unscramble the word before anyone else",
      art: '<img src="/assets/word-scramble.svg" alt="Jumbled letter tiles" width="180" height="180">',
    },
    trivia: {
      name: "Trivia Blitz",
      slug: "trivia-blitz",
      min: 2,
      max: 12,
      players: "2–12 active players",
      overflow: "Extra people in the room spectate",
      blurb: "Fast questions, faster fingers",
      art: '<img src="/assets/trivia.svg" alt="A question mark in a speech bubble" width="180" height="180">',
    },
  };

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const rand = (n) => Math.floor(Math.random() * n);

  // ---------- profile + tab token ----------
  const ADJ = [
    "Happy",
    "Sneaky",
    "Bouncy",
    "Sleepy",
    "Brave",
    "Fuzzy",
    "Spicy",
    "Lucky",
    "Wobbly",
    "Zippy",
    "Cosmic",
    "Silly",
  ];
  const NOUN = [
    "Fox",
    "Panda",
    "Taco",
    "Otter",
    "Pickle",
    "Comet",
    "Noodle",
    "Penguin",
    "Waffle",
    "Gecko",
    "Muffin",
    "Robot",
  ];
  function loadProfile() {
    try {
      const p = JSON.parse(localStorage.getItem("pg_profile"));
      if (p && typeof p.name === "string" && p.avatar) return p;
    } catch (e) {
      /* first visit */
    }
    return {
      name: ADJ[rand(ADJ.length)] + NOUN[rand(NOUN.length)],
      avatar: { e: rand(AVATAR_COUNT), c: rand(COLORS.length) },
    };
  }
  const profile = loadProfile();
  const saveProfile = () =>
    localStorage.setItem("pg_profile", JSON.stringify(profile));
  saveProfile();

  let token = sessionStorage.getItem("pg_token");
  if (!token || !/^[a-f0-9]{32}$/.test(token)) {
    token = [...crypto.getRandomValues(new Uint8Array(16))]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    sessionStorage.setItem("pg_token", token);
  }

  const avatarHTML = (a = {}, cls = "") => {
    const i = Math.max(0, Math.min(23, Number(a.e) || 0));
    return `<span class="avatar ${cls}" aria-hidden="true" style="--av:${COLORS[a.c] || COLORS[0]};--avatar-x:${(i % 2) * 100}%;--avatar-y:${Math.floor((i % 4) / 2) * 100}%;--avatar-hue:${Math.floor(i / 4) * 12}deg"><span class="avatar-art"></span></span>`;
  };

  function renderProfiles() {
    $$("[data-profile]").forEach((el) => {
      el.innerHTML = `
        <div class="avatar-pick">
          <button class="arrow" type="button" data-av="-1" aria-label="Previous avatar">‹</button>
          ${avatarHTML(profile.avatar, "av-xl")}
          <button class="arrow" type="button" data-av="1" aria-label="Next avatar">›</button>
        </div>
        <div class="color-row">${COLORS.map((c, i) => `<button type="button" class="dot ${i === profile.avatar.c ? "on" : ""}" style="--av:${c}" data-color="${i}" aria-label="Color ${i + 1}"></button>`).join("")}</div>
        <div class="name-row">
          <input class="name-input" maxlength="16" placeholder="Your name" value="${esc(profile.name)}" aria-label="Your name">
          <button type="button" class="icon-btn dice" title="Random name and avatar" aria-label="Randomize">${icon("dice")}</button>
        </div>`;
    });
  }
  document.addEventListener("click", (e) => {
    const av = e.target.closest("[data-av]");
    const col = e.target.closest("[data-color]");
    const dice = e.target.closest(".dice");
    if (!av && !col && !dice) return;
    if (av)
      profile.avatar.e =
        (profile.avatar.e + Number(av.dataset.av) + AVATAR_COUNT) %
        AVATAR_COUNT;
    if (col) profile.avatar.c = Number(col.dataset.color);
    if (dice) {
      profile.avatar = { e: rand(AVATAR_COUNT), c: rand(COLORS.length) };
      profile.name = ADJ[rand(ADJ.length)] + NOUN[rand(NOUN.length)];
    }
    saveProfile();
    renderProfiles();
  });
  document.addEventListener("input", (e) => {
    if (!e.target.classList.contains("name-input")) return;
    profile.name = e.target.value.slice(0, 16);
    saveProfile();
    $$(".name-input").forEach((i) => {
      if (i !== e.target) i.value = profile.name;
    });
  });

  // ---------- small UI helpers ----------
  let toastTimer = null;
  function toast(text) {
    const t = $("#toast");
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.hidden = true;
    }, 3800);
  }
  let modalOpener = null;
  function openModal(html) {
    if ($("#modal").hidden) modalOpener = document.activeElement;
    $("#modal-body").classList.remove("settings-modal", "settings-readonly");
    $("#modal-body").innerHTML =
      `<button class="modal-close icon-btn small" data-close aria-label="Close dialog">${icon("close")}</button>` +
      html;
    const title = $("#modal-body").querySelector("h2");
    if (title) title.id = "modal-title";
    $("#modal").hidden = false;
    $("#modal-body").focus();
  }
  function closeModal() {
    $("#modal").hidden = true;
    $("#modal-body").innerHTML = "";
    if (modalOpener && modalOpener.isConnected) modalOpener.focus();
  }
  $("#modal").addEventListener("click", (e) => {
    if (e.target.id === "modal" || e.target.closest("[data-close]"))
      closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if ($("#modal").hidden) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "Tab") {
      const items = $$(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]",
        $("#modal-body"),
      ).filter((el) => el.getClientRects().length);
      const first = items[0],
        last = items[items.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === $("#modal-body"))
      ) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  });

  function showScreen(name) {
    $$(".screen").forEach((s) => {
      s.hidden = s.id !== "screen-" + name;
    });
    document.body.dataset.screen = name;
    $$("[data-tab]").forEach((el) => {
      el.classList.toggle("active", el.dataset.tab === name);
      if (el.dataset.tab === name) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
    });
    if (name !== "room") GameUI.drawguess?.exitBig?.();
    window.scrollTo(0, 0);
    if (typeof syncReturn === "function") syncReturn();
  }

  const soundBtn = $("#sound-btn");
  function syncSound() {
    soundBtn.innerHTML = icon(Sound.muted ? "muted" : "sound");
    soundBtn.setAttribute(
      "aria-label",
      Sound.muted ? "Unmute sound" : "Mute sound",
    );
    soundBtn.setAttribute("aria-pressed", String(!Sound.muted));
  }
  syncSound();
  soundBtn.addEventListener("click", () => {
    Sound.toggle();
    syncSound();
  });
  $("#settings-btn").innerHTML = icon("settings");
  $("#refresh-btn").innerHTML = icon("refresh");
  $("#mobile-players-toggle").innerHTML = icon("people");
  $("#mobile-players-toggle").onclick = () => {
    const open = $("#side").classList.toggle("roster-open");
    $("#mobile-players-toggle").setAttribute("aria-expanded", String(open));
    $("#mobile-players-toggle").setAttribute(
      "aria-label",
      open ? "Hide player list" : "Show player list",
    );
  };
  $("#copy-link").innerHTML = icon("copy");
  $("#share-link").innerHTML = icon("link");
  $("#leave-btn").innerHTML = icon("back") + "<span>Back to Games</span>";
  $(".send-btn").innerHTML = icon("arrow");
  $("#hero-create").innerHTML = icon("plus") + "Create Room";
  $("#hero-join").innerHTML = icon("link") + "Join Room";
  $$("[data-trust]").forEach((el) =>
    el.insertAdjacentHTML("afterbegin", icon(el.dataset.trust)),
  );
  $("#hero-create").onclick = () => openCreate("drawguess");
  $("#hero-join").onclick = () => {
    nav("/?view=games");
    $("#code-input").focus();
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-view]");
    if (!b) return;
    if (b.dataset.view === "profile") return openProfile();
    nav("/?view=" + (b.dataset.view === "rooms" ? "rooms" : "games"));
    if (b.dataset.view === "rooms")
      $("#rooms-browser").scrollIntoView({ block: "nearest" });
  });
  function openProfile() {
    openModal(
      '<h2 class="card-title">Your Player</h2><p class="muted">No accounts. Just a name, a face, and good company.</p><div class="profile" data-profile></div><p class="profile-note">Your player is saved on this device. Changes apply when you next join a room.</p><div class="modal-actions"><button class="btn" data-close>Let’s Play</button></div>',
    );
    renderProfiles();
  }
  $("#settings-btn").onclick = () => (S ? openGameSettings() : openProfile());

  // Track the visual viewport (iOS toolbars, on-screen keyboard) for fixed layers.
  (() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement.style;
    const sync = () => {
      // Only override the CSS fallback (100dvh) when something such as the
      // on-screen keyboard really shrinks the visual viewport.
      if (Math.abs(window.innerHeight - vv.height) < 60) {
        root.removeProperty("--vv-h");
        root.removeProperty("--vv-top");
        return;
      }
      root.setProperty("--vv-h", Math.round(vv.height) + "px");
      root.setProperty("--vv-top", Math.round(vv.offsetTop) + "px");
    };
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    sync();
  })();

  // ---------- socket ----------
  const socket = io();
  let S = null; // latest lobby state from the server
  let currentCode = null; // lobby we're in
  let mounted = null; // what the stage is showing
  let lastResultKey = null;

  const app = {
    socket,
    esc,
    avatarHTML,
    toast,
    get S() {
      return S;
    },
    member: (id) =>
      S &&
      (S.players.find((p) => p.id === id) ||
        S.spectators.find((p) => p.id === id)),
  };
  window.App = app;

  socket.on("disconnect", () => {
    $("#connection-note").hidden = false;
  });
  socket.on("connect", () => {
    $("#connection-note").hidden = true;
    if (currentCode) join(currentCode, { silent: true });
  });
  socket.on("state", (s) => {
    if (!currentCode || s.code !== currentCode) return;
    S = s;
    renderRoom();
    syncReturn();
  });
  socket.on("chat", addChat);
  socket.on("chatHistory", (list) => {
    $("#chat-log").innerHTML = "";
    list.forEach((m) => addChat(m, true));
  });
  socket.on("notice", toast);
  socket.on("kicked", () => {
    leaveLocal();
    showMessage("kicked");
  });
  socket.on("replaced", () => {
    leaveLocal();
    showMessage("replaced");
  });
  socket.on("draw", (d) => GameUI.drawguess.onDraw(d));
  socket.on("canvas", (d) => GameUI.drawguess.onCanvas(d));

  // ---------- routing ----------
  function nav(path) {
    history.pushState({}, "", path);
    route();
  }
  function route() {
    const m = location.pathname.match(/^\/r\/([A-Za-z0-9]{4,8})\/?$/);
    if (m) {
      const code = m[1].toUpperCase();
      if (currentCode === code) return showScreen("room");
      return showJoin(code);
    }
    // Navigating elsewhere never leaves the room; only Leave Lobby does.
    showHome();
  }
  window.addEventListener("popstate", route);
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-nav]");
    if (!a) return;
    e.preventDefault();
    closeModal();
    nav(a.dataset.nav);
  });

  // ---------- home ----------
  let lobbyTimer = null;
  function showHome() {
    const view = new URLSearchParams(location.search).get("view");
    const slugGame =
      Object.keys(GAMES).find(
        (g) => location.pathname === "/" + GAMES[g].slug,
      ) || window.PAGE.game;
    showScreen(view || slugGame ? "selection" : "home");
    renderProfiles();
    renderGames();
    loadLobbies();
    clearInterval(lobbyTimer);
    lobbyTimer = setInterval(() => {
      if (document.body.dataset.screen === "selection") loadLobbies();
    }, 6000);
    if (slugGame)
      $(`.game-card[data-game="${slugGame}"]`)?.classList.add("featured");
  }
  function renderGames() {
    $("#games").innerHTML =
      Object.entries(GAMES)
        .map(
          ([id, g], i) => `
      <article class="card game-card ${!i ? "featured" : ""}" data-game="${id}">
        <div class="game-art">${g.art}</div><div class="game-info"><h2><a href="/${g.slug}" data-nav="/${g.slug}">${g.name}</a></h2><p>${g.blurb}</p><small class="cap-note">${g.overflow}</small></div>
        <div class="game-card-bottom"><span class="game-players">${icon("people")}${g.players}</span><button class="btn btn-small" data-create="${id}">Play</button></div>
        <button class="quick-link" data-quick="${id}">Quick Play ${icon("arrow")}</button>
      </article>`,
        )
        .join("") +
      `<article class="card game-card coming-soon"><div class="game-art"><img src="/assets/coming-soon.svg" width="180" height="180" alt="An illustrated dice"></div><div class="game-info"><h2>Coming Soon</h2><p>More games on the way!</p></div><div class="game-card-bottom"><span class="btn btn-small btn-ghost soon-label">Soon</span></div></article>`;
  }
  $("#games").addEventListener("click", (e) => {
    const q = e.target.closest("[data-quick]"),
      c = e.target.closest("[data-create]");
    if (q) quickPlay(q.dataset.quick);
    if (c) openCreate(c.dataset.create);
  });

  async function loadLobbies() {
    const el = $("#lobby-list");
    try {
      const list = await (await fetch("/api/rooms")).json();
      if (!list.length) {
        el.innerHTML =
          '<p class="empty">No rooms yet. Create one and bring your friends, or use Quick Play to find your people.</p>';
        return;
      }
      el.innerHTML = list
        .map((r) => {
          const seatOpen =
            r.players < r.max &&
            (r.phase === "lobby" || r.gameId === "drawguess");
          return `<div class="room-preview">${avatarHTML({ e: r.gameId === "fourrow" ? 3 : 0, c: 3 })}<div><b>${esc(r.code)}</b><small>${esc(r.gameName)} · ${r.players}/${r.max} players</small><span class="room-host">Hosted by ${esc(r.host)}</span></div><button class="btn btn-small ${!seatOpen ? "btn-ghost" : ""}" data-join="${esc(r.code)}" ${r.locked || (!seatOpen && !r.spectatorsOn) ? "disabled" : ""}>${r.locked ? "Locked" : seatOpen ? "Join" : r.spectatorsOn ? "Spectate" : "Full"}</button></div>`;
        })
        .join("");
    } catch (e) {
      el.innerHTML = '<p class="empty">Could not load lobbies.</p>';
    }
  }
  $("#refresh-btn").addEventListener("click", loadLobbies);
  $("#lobby-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-join]");
    if (b) join(b.dataset.join);
  });
  $("#code-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = $("#code-input").value.trim();
    const code = (
      raw.match(/\/r\/([a-z0-9]{4,8})(?:[/?#]|$)/i)?.[1] || raw
    ).toUpperCase();
    if (/^[A-Z0-9]{4,8}$/.test(code)) join(code);
    else toast("That code does not look right.");
  });

  // ---------- settings forms (used by Create Lobby and the host panel) ----------
  const opt = (v, cur, label = v) =>
    `<option value="${v}" ${String(v) === String(cur) ? "selected" : ""}>${label}</option>`;
  function settingsHTML(gameId, s) {
    if (gameId === "drawguess")
      return `
      <div class="field difficulty-field"><span>Difficulty</span><div class="segmented" role="group" aria-label="Word difficulty">${["easy", "medium", "hard", "mixed"].map((v) => `<button type="button" data-choice="difficulty" data-value="${v}" aria-pressed="${s.difficulty === v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join("")}</div><select data-setting="difficulty" aria-label="Word difficulty" class="sr-only" tabindex="-1" aria-hidden="true">${["easy", "medium", "hard", "mixed"].map((v) => opt(v, s.difficulty, v)).join("")}</select></div>
      <label class="field timer-field"><span>Round Time</span><select data-setting="drawTime">${[30, 45, 60, 80, 100, 120, 150, 180, 240, 300].map((v) => opt(v, s.drawTime, v + " seconds")).join("")}</select></label>
      <label class="field rounds-field"><span>Rounds</span><select data-setting="rounds">${Array.from(
        { length: 10 },
        (_, i) => i + 1,
      )
        .map((v) => opt(v, s.rounds, v + " rounds"))
        .join("")}</select></label>
      <label class="field field-wide custom-field"><span>Custom Word List</span><textarea data-setting="customWords" rows="2" maxlength="3000" placeholder="Enter words separated by commas…">${esc(s.customWords)}</textarea><small>These words will be mixed with the selected difficulty.</small></label>
      <label class="check"><span>Letter Hints</span><input type="checkbox" data-setting="hints" ${s.hints ? "checked" : ""}></label>
      <label class="check"><span>Use Only Custom Words <small>6 distinct words minimum</small></span><input type="checkbox" data-setting="customOnly" ${s.customOnly ? "checked" : ""}></label>`;
    const sel = (key, label, values, cur, fmt = (v) => v) =>
      `<label class="field"><span>${label}</span><select data-setting="${key}">${values.map((v) => opt(v, cur, fmt(v))).join("")}</select></label>`;
    if (gameId === "wordchain")
      return (
        sel("turnTime", "Time Per Word", [10, 15, 20, 30], s.turnTime, (v) => v + " seconds") +
        sel("lives", "Lives", [1, 2, 3, 5], s.lives) +
        sel("minLen", "Minimum Word Length", [2, 3, 4], s.minLen, (v) => v + " letters") +
        `<label class="field"><span>Dictionary</span><select data-setting="dictionary">${opt("common", s.dictionary, "Common words only")}${opt("off", s.dictionary, "Off (any letters, no repeats)")}</select></label>`
      );
    if (gameId === "categories")
      return sel("rounds", "Rounds", [3, 5, 8], s.rounds, (v) => v + " rounds") + sel("roundTime", "Round Time", [30, 45, 60, 90], s.roundTime, (v) => v + " seconds");
    if (gameId === "higherlower")
      return sel("rounds", "Cards", [5, 10, 15, 20], s.rounds) + sel("guessTime", "Time To Guess", [8, 12, 20], s.guessTime, (v) => v + " seconds");
    if (gameId === "tictactoe")
      return sel("turnTime", "Turn Timer", [0, 15, 30, 60], s.turnTime, (v) => (v ? v + " seconds" : "Off")) + `<label class="check"><span>Winner Stays <small>Next spectator takes the other seat</small></span><input type="checkbox" data-setting="winnerStays" ${s.winnerStays ? "checked" : ""}></label>`;
    if (gameId === "rps")
      return sel("bestOf", "Match Length", [1, 3, 5], s.bestOf, (v) => "Best of " + v) + sel("pickTime", "Time To Pick", [8, 12, 20], s.pickTime, (v) => v + " seconds");
    if (gameId === "dotsboxes")
      return sel("size", "Board Size", [3, 4, 5], s.size, (v) => v + " × " + v + " boxes") + sel("turnTime", "Turn Timer", [0, 20, 30, 60], s.turnTime, (v) => (v ? v + " seconds" : "Off"));
    if (gameId === "wordscramble")
      return (
        `<label class="field"><span>Difficulty</span><select data-setting="difficulty">${["easy", "medium", "hard"].map((v) => opt(v, s.difficulty, v[0].toUpperCase() + v.slice(1))).join("")}</select></label>` +
        sel("rounds", "Words", [5, 8, 12], s.rounds) +
        sel("roundTime", "Time Per Word", [20, 30, 45], s.roundTime, (v) => v + " seconds")
      );
    if (gameId === "trivia")
      return (
        sel("questions", "Questions", [5, 10, 15], s.questions) +
        sel("answerTime", "Time To Answer", [10, 15, 20], s.answerTime, (v) => v + " seconds") +
        `<label class="field"><span>Category</span><select data-setting="category">${["mixed", "Science", "Geography", "History", "Entertainment", "Sports", "Food"].map((v) => opt(v, s.category, v === "mixed" ? "Mixed" : v)).join("")}</select></label>`
      );
    if (gameId === "colorstack" || gameId === "gofish")
      return sel("turnTime", "Turn Timer", [0, 20, 30, 60], s.turnTime, (v) => (v ? v + " seconds" : "Off"));
    return `<label class="field"><span>Turn Timer</span><select data-setting="turnTime">${[
      [0, "Off"],
      [15, "15 seconds"],
      [30, "30 seconds"],
      [60, "60 seconds"],
    ]
      .map(([v, l]) => opt(v, s.turnTime, l))
      .join(
        "",
      )}</select></label><label class="check"><span>Winner Stays <small>Next spectator takes the other seat</small></span><input type="checkbox" data-setting="winnerStays" ${s.winnerStays ? "checked" : ""}></label>`;
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-choice]");
    if (!b) return;
    const form = b.closest(".settings-fields, .form-grid");
    const select = form.querySelector(`[data-setting="${b.dataset.choice}"]`);
    select.value = b.dataset.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    $$(`[data-choice="${b.dataset.choice}"]`, form).forEach((el) =>
      el.setAttribute(
        "aria-pressed",
        String(el.dataset.value === select.value),
      ),
    );
  });
  function openGameSettings() {
    const editable = isHost() && S.phase === "lobby";
    openModal(
      `<h2 class="card-title">${icon("controller")} Game Settings</h2><p class="settings-note">${editable ? "Changes are saved to your room instantly." : S.phase === "game" ? "This game is in progress. Settings can change in the lobby." : "Your host controls the room settings."}</p><fieldset class="settings-fields" ${editable ? "" : "disabled"}>${settingsHTML(S.gameId, S.settings)}</fieldset><div class="modal-actions"><button class="btn" data-close>Done</button></div>`,
    );
    $("#modal-body").classList.add("settings-modal");
    $("#modal-body").classList.toggle("settings-readonly", !editable);
    const fields = $(".settings-fields", $("#modal-body"));
    if (S.gameId === "drawguess") {
      const more = document.createElement("details");
      more.className = "settings-more";
      more.innerHTML = "<summary>More Options</summary>";
      for (const [key, title, values] of [
        ["drawTime", "Round Time", [60, 120, 180, 240, 300]],
        ["rounds", "Rounds", [3, 5, 7, 10]],
      ]) {
        const native = fields.querySelector(`[data-setting="${key}"]`);
        const row = document.createElement("div");
        row.className = "field";
        row.innerHTML = `<span>${title}</span><div class="segmented" role="group" aria-label="${title}">${values.map((v) => `<button type="button" data-choice="${key}" data-value="${v}" aria-pressed="${Number(native.value) === v}">${v}</button>`).join("")}</div>`;
        native.closest(".field").before(row);
        more.append(native.closest(".field"));
      }
      fields.querySelectorAll(".check").forEach((el) => more.append(el));
      fields.append(more);
    }
    $(".settings-fields", $("#modal-body")).addEventListener("change", (e) => {
      const t = e.target;
      if (!t.dataset.setting || !editable) return;
      const value =
        t.type === "checkbox"
          ? t.checked
          : t.tagName === "SELECT" && !STRING_SETTINGS.includes(t.dataset.setting)
            ? Number(t.value)
            : t.value;
      socket.emit("hostUpdate", { settings: { [t.dataset.setting]: value } });
    });
  }

  const STRING_SETTINGS = ["difficulty", "dictionary", "category"];
  function readSettings(el) {
    const out = {};
    $$("[data-setting]", el).forEach((i) => {
      const k = i.dataset.setting;
      out[k] =
        i.type === "checkbox"
          ? i.checked
          : i.tagName === "SELECT" && !STRING_SETTINGS.includes(k)
            ? Number(i.value)
            : i.value;
    });
    return out;
  }
  const DEFAULTS = {
    drawguess: {
      rounds: 3,
      drawTime: 80,
      hints: true,
      difficulty: "medium",
      customWords: "",
      customOnly: false,
    },
    fourrow: { turnTime: 30, winnerStays: true },
    wordchain: { turnTime: 20, lives: 3, minLen: 3, dictionary: "common" },
    categories: { rounds: 5, roundTime: 60 },
    higherlower: { rounds: 10, guessTime: 12 },
    colorstack: { turnTime: 30 },
    gofish: { turnTime: 30 },
    tictactoe: { turnTime: 30, winnerStays: true },
    rps: { bestOf: 3, pickTime: 12 },
    dotsboxes: { size: 4, turnTime: 30 },
    wordscramble: { rounds: 8, roundTime: 30, difficulty: "medium" },
    trivia: { questions: 10, answerTime: 15, category: "mixed" },
  };

  // ---------- create lobby ----------
  function openCreate(gameId) {
    const draw = (g) => {
      const G = GAMES[g];
      openModal(`
        <h2 class="card-title">Create a lobby</h2>
        <div class="tiles">${Object.entries(GAMES)
          .map(
            ([id, x]) =>
              `<button type="button" class="tile ${id === g ? "on" : ""}" data-pick="${id}">${x.art}<b>${x.name}</b></button>`,
          )
          .join("")}</div>
        <div class="form-grid" id="create-form">
          <label class="field"><span>Who can join</span><select id="c-public">${opt(0, 0, "Private (link only)")}${opt(1, 0, "Public (listed)")}</select></label>
          <label class="field"><span>Max players</span>${
            G.min === G.max
              ? `<select disabled><option>${G.max}</option></select>`
              : `<select id="c-max">${Array.from(
                  { length: G.max - G.min + 1 },
                  (_, i) => G.min + i,
                )
                  .map((v) => opt(v, G.max))
                  .join("")}</select>`
          }</label>
          <label class="check"><input type="checkbox" id="c-spec" checked><span>Allow spectators</span></label>
          <label class="field"><span>Max spectators</span><select id="c-maxspec">${[5, 10, 20, 50].map((v) => opt(v, 20)).join("")}</select></label>
          ${settingsHTML(g, DEFAULTS[g])}
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-close>Cancel</button>
          <button class="btn btn-big" id="c-go">Create lobby</button>
        </div>`);
      $$("[data-pick]").forEach((b) =>
        b.addEventListener("click", () => draw(b.dataset.pick)),
      );
      $("#c-go").addEventListener("click", () => {
        const form = $("#create-form");
        const opts = {
          game: g,
          isPublic: $("#c-public").value === "1",
          maxPlayers: $("#c-max") ? Number($("#c-max").value) : G.max,
          spectatorsOn: $("#c-spec").checked,
          maxSpectators: Number($("#c-maxspec").value),
          settings: readSettings(form),
          profile,
          token,
        };
        if (!leaveForOtherRoom()) return;
        socket.emit("createRoom", opts, (res) => {
          closeModal();
          handleJoin(res);
        });
      });
    };
    draw(gameId);
  }

  function quickPlay(gameId) {
    if (!leaveForOtherRoom()) return;
    socket.emit("quickPlay", { game: gameId, profile, token }, handleJoin);
  }

  // ---------- join ----------
  function showJoin(code) {
    showScreen("join");
    $("#join-code").textContent = code;
    renderProfiles();
    const other = currentCode && currentCode !== code;
    $("#join-switch-note").hidden = !other;
    if (other)
      $("#join-switch-note").textContent =
        `You are in lobby ${currentCode}. Joining ${code} will leave it.`;
    $("#join-btn").onclick = () => join(code);
  }

  // Leaving is deliberate: confirm when the game or hosting would be disrupted.
  function confirmLeave(text) {
    if (!S) return true;
    const live = S.phase === "game";
    const host = S.hostId === S.you && S.players.length + S.spectators.length > 1;
    if (!live && !host) return true;
    return confirm(
      text +
        (live ? " The game is in progress." : "") +
        (host ? " You are the host; hosting will pass to someone else." : ""),
    );
  }
  // Confirmation only: the server releases the old seat once the new room accepts
  // us, and handleJoin() unmounts the old game, so a failed join loses nothing.
  function leaveForOtherRoom() {
    if (!currentCode) return true;
    return confirmLeave(`You are in lobby ${currentCode}. Leave it?`);
  }

  function join(code, { silent } = {}) {
    if (!silent && currentCode === code) {
      nav("/r/" + code);
      return;
    }
    // Every deliberate join to a different room goes through the leave guard.
    if (!silent && !leaveForOtherRoom()) return;
    socket.emit("joinRoom", { code, profile, token }, (res) =>
      handleJoin(res, silent),
    );
  }

  function handleJoin(res, silent) {
    if (!res || res.error) {
      if (silent && currentCode) leaveLocal();
      return showMessage(res ? res.error : "closed", res);
    }
    const fresh = currentCode !== res.code;
    currentCode = res.code;
    // A silent reconnect must not drag the user back from another view.
    const onRoomView = document.body.dataset.screen === "room";
    if (!silent && location.pathname !== "/r/" + res.code)
      history.pushState({}, "", "/r/" + res.code);
    if (fresh) {
      unmountStage();
      S = null;
      mounted = null;
      lastResultKey = null;
      $("#stage").innerHTML =
        '<div class="card loading">Loading lobby...</div>';
      if (!res.rejoined) $("#chat-log").innerHTML = "";
    }
    if (!silent || onRoomView) showScreen("room");
    else syncReturn();
    if (res.notice) toast(res.notice);
  }

  function leaveLocal() {
    currentCode = null;
    syncReturn();
    unmountStage();
    S = null;
    delete document.body.dataset.phase;
    delete document.body.dataset.game;
  }
  function leaveRoom() {
    socket.emit("leaveRoom");
    leaveLocal();
  }
  $("#leave-btn").addEventListener("click", () => {
    nav("/?view=games");
  });
  $("#leave-lobby-btn").addEventListener("click", () => {
    if (!confirmLeave("Leave this lobby?")) return;
    leaveRoom();
    nav("/");
  });
  const returnBar = $("#return-bar");
  function syncReturn() {
    const show = !!currentCode && document.body.dataset.screen !== "room";
    returnBar.hidden = !show;
    document.body.classList.toggle("has-return", show);
    if (!show) return;
    const playing = S && S.phase === "game";
    $("#return-label").textContent = playing
      ? "Return to Game"
      : "Return to Lobby";
    $("#return-code").textContent = currentCode;
    $("#return-status").textContent = S
      ? playing
        ? "Game in progress"
        : "Waiting in lobby"
      : "Connecting";
  }
  returnBar.addEventListener("click", () => {
    closeModal();
    nav("/r/" + currentCode);
  });
  $("#end-btn").addEventListener("click", () => {
    if (confirm("End the game for everyone and go back to the lobby?"))
      socket.emit("endGame");
  });

  function showMessage(kind, info = {}) {
    const gname = info && info.gameName ? info.gameName : "game";
    const gid = info && info.gameId;
    const M = {
      closed: [
        "exit",
        "This lobby has closed",
        "Everyone left, so the lobby was closed.",
        [
          ["Start a new lobby", "create"],
          ["Back home", "home"],
        ],
      ],
      locked: [
        "lock",
        "This lobby is locked",
        "The host locked it, so no new people can join right now.",
        [
          ["Create your own lobby", "create"],
          ["Find another lobby", "home"],
        ],
      ],
      full: [
        "people",
        "This lobby is full",
        `This lobby is full (${info.players || 0}/${info.max || 0} players) and isn't taking spectators.`,
        [
          [`Create your own ${gname} lobby`, "create"],
          ["Find another lobby", "home"],
        ],
      ],
      kicked: [
        "exit",
        "You were removed",
        "The host or the other players removed you from this lobby.",
        [["Back home", "home"]],
      ],
      replaced: [
        "monitor",
        "Opened somewhere else",
        "This lobby was opened in another tab or window, so this one disconnected.",
        [["Back home", "home"]],
      ],
      slow: [
        "clock",
        "Slow down a little",
        "Too many tries in a row. Wait a few seconds and try again.",
        [["Back home", "home"]],
      ],
      busy: [
        "settings",
        "The server is busy",
        "Try again in a minute.",
        [["Back home", "home"]],
      ],
    };
    const [icon, title, text, actions] = M[kind] || M.closed;
    $("#msg-icon").innerHTML = Playgrid.icon(icon);
    $("#msg-title").textContent = title;
    $("#msg-text").textContent = text;
    $("#msg-actions").innerHTML = actions
      .map(
        ([label, act], i) =>
          `<button class="btn ${i ? "btn-ghost" : ""}" data-act="${act}">${esc(label)}</button>`,
      )
      .join("");
    $("#msg-actions").onclick = (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      history.pushState({}, "", "/");
      showHome();
      if (b.dataset.act === "create") openCreate(gid || "drawguess");
    };
    showScreen("message");
  }

  // ---------- chat ----------
  function addChat(m, quiet) {
    const log = $("#chat-log");
    const near = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
    const div = document.createElement("div");
    if (m.kind === "sys") {
      div.className = "msg sys sys-" + (m.style || "info");
      div.textContent = m.text;
    } else {
      div.className =
        "msg" +
        (m.hidden ? " msg-hidden" : "") +
        (S && m.id === S.you ? " msg-me" : "");
      div.style.setProperty(
        "--name-color",
        ["#fa8dc2", "#80ccff", "#c3ff23", "#ffd3a3"][
          [...String(m.id || m.name)].reduce((n, c) => n + c.charCodeAt(0), 0) %
            4
        ],
      );
      div.innerHTML = `<b>${m.spectator ? icon("eye") : ""}${esc(m.name)}:</b> ${esc(m.text)}`;
    }
    log.appendChild(div);
    while (log.children.length > 150) log.firstChild.remove();
    if (near || quiet) log.scrollTop = log.scrollHeight;
    if (!quiet && m.sound) Sound.play(m.sound);
  }
  $("#chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const i = $("#chat-input");
    const text = i.value.trim();
    if (!text) return;
    socket.emit("chat", text);
    i.value = "";
  });

  // ---------- sharing ----------
  const roomLink = () => `${location.origin}/r/${currentCode}`;
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(roomLink());
      toast("Link copied. Send it to your friends!");
    } catch (e) {
      prompt("Copy this link:", roomLink());
    }
  }
  $("#copy-link").addEventListener("click", copyLink);
  $("#share-link").addEventListener("click", async () => {
    const text = `Come play ${S ? GAMES[S.gameId].name : "with me"}!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: window.PAGE.site,
          text,
          url: roomLink(),
        });
        return;
      } catch (e) {
        /* closed */
      }
    }
    const url = encodeURIComponent(roomLink());
    openModal(`
      <h2 class="card-title">Invite friends</h2>
      <div class="share-box"><input readonly value="${esc(roomLink())}"><button class="btn btn-small" id="m-copy">Copy</button></div>
      <div class="share-row">
        <a class="btn btn-ghost" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(text + " ")}${url}">WhatsApp</a>
        <a class="btn btn-ghost" href="sms:?&body=${encodeURIComponent(text + " ")}${url}">Text</a>
        <a class="btn btn-ghost" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}">X</a>
      </div>
      <p class="muted">For Discord, copy the link and paste it in your server or DM.</p>
      <div class="modal-actions"><button class="btn" data-close>Done</button></div>`);
    $("#m-copy").addEventListener("click", copyLink);
  });

  // ---------- room ----------
  const isHost = () => S && S.hostId === S.you;
  const me = () => app.member(S.you);

  function renderRoom() {
    if (!S) return;
    const G = GAMES[S.gameId];
    const phase =
      S.phase === "game" ? "game" : S.lastResult ? "results" : "lobby";
    const previousPhase = document.body.dataset.phase;
    document.body.dataset.phase = phase;
    document.body.dataset.game = S.gameId;
    $("#screen-room").dataset.phase = phase;
    $("#room-code").textContent = S.code;
    $("#game-word-slot").hidden = !(
      S.phase === "game" && S.gameId === "drawguess"
    );
    $("#lobby-start").hidden = !isHost() || S.phase === "game";
    $("#lobby-start").disabled = S.players.length < G.min;
    $("#lobby-start").textContent = S.lastResult ? "Play Again" : "Start Game";
    $("#header-round").textContent =
      S.gameId === "drawguess" && S.game
        ? `Round ${Math.min(S.game.round, S.game.rounds)}/${S.game.rounds}`
        : G.name;
    $("#header-difficulty").innerHTML =
      S.gameId === "drawguess"
        ? `Difficulty: <b class="difficulty-${esc(S.settings.difficulty)}">${esc(S.settings.difficulty[0].toUpperCase() + S.settings.difficulty.slice(1))}</b>`
        : "";
    $("#room-game").textContent = G.name;
    $("#room-vis").textContent = S.isPublic ? "Public" : "Private";
    $("#room-lock").hidden = !S.locked;
    $("#end-btn").hidden = !(isHost() && S.phase === "game");
    document.title = `${G.name} lobby | ${window.PAGE.site}`;
    renderPeople();
    renderStage();
    if (previousPhase !== phase)
      requestAnimationFrame(() => {
        const log = $("#chat-log");
        log.scrollTop = log.scrollHeight;
      });
    const ui = GameUI[S.gameId];
    const ph =
      S.phase === "game" && ui.chatPlaceholder ? ui.chatPlaceholder(S) : null;
    $("#chat-input").placeholder = ph || "Say something...";

    if (S.lastResult) {
      const key =
        JSON.stringify(S.lastResult).length +
        ":" +
        (S.lastResult.winnerId || "") +
        ":" +
        S.lastResult.type;
      if (key !== lastResultKey) {
        lastResultKey = key;
        const snd = GameUI[S.lastResult.type].resultSound(S.lastResult, S);
        if (snd) Sound.play(snd);
      }
    } else {
      lastResultKey = null;
    }
  }

  function personHTML(p, { spectator } = {}) {
    const g = S.game;
    const icons = [];
    if (p.id === S.hostId)
      icons.push(`<span title="Host">${icon("crown")}</span>`);
    if (g && S.gameId === "drawguess" && g.drawerId === p.id)
      icons.push(`<span title="Drawing">${icon("brush")}</span>`);
    if (g && S.gameId === "drawguess" && g.guessed && g.guessed.includes(p.id))
      icons.push(`<span title="Guessed it">${icon("check")}</span>`);
    if (g && S.gameId === "fourrow") {
      const i = g.players.findIndex((x) => x.id === p.id);
      if (i >= 0)
        icons.push(
          `<span class="mini-disc d${i + 1}" title="${i ? "Yellow" : "Red"}"></span>`,
        );
    }
    let kick = "";
    if (p.id !== S.you) {
      if (isHost())
        kick = `<button class="kick" data-kick="${p.id}" title="Kick ${esc(p.name)}" aria-label="Kick">${icon("close")}</button>`;
      else if (S.isPublic)
        kick = `<button class="kick" data-vote="${p.id}" title="Vote to kick ${esc(p.name)}" aria-label="Vote kick">${icon("exit")}</button>`;
    }
    const label = GameUI[S.gameId].scoreLabel;
    return `<li class="person ${p.connected ? "" : "offline"} ${p.id === S.you ? "me" : ""}">
      ${avatarHTML(p.avatar)}
      <div class="pmain"><div class="pname">${esc(p.name)}${p.id === S.you ? " <small>(you)</small>" : ""}</div>
      ${spectator ? "" : `<div class="pscore"><span class="lobby-status">${p.id === S.hostId ? "(Host)" : p.connected ? "Connected" : "Reconnecting"}</span><span class="game-score">${p.score} ${p.score === 1 && label === "wins" ? "win" : label}</span></div>`}</div>
      <div class="picons">${icons.join("")}${p.connected ? "" : '<span title="Reconnecting">…</span>'}</div>${kick}</li>`;
  }

  function renderPeople() {
    $("#player-count").textContent = `${S.players.length}/${S.maxPlayers}`;
    $("#spec-count").textContent = S.spectators.length
      ? `(${S.spectators.length})`
      : "";
    const sorted =
      S.gameId === "drawguess" && (S.phase === "game" || S.lastResult)
        ? [...S.players].sort((a, b) => b.score - a.score)
        : S.players;
    $("#player-list").innerHTML =
      sorted.map((p) => personHTML(p)).join("") +
        (S.phase === "lobby" && !S.lastResult
          ? Array.from(
              {
                length: Math.max(
                  0,
                  Math.min(S.maxPlayers, 7) - S.players.length,
                ),
              },
              () =>
                `<li class="open-seat">${icon("plus")}<span>Open Slot</span></li>`,
            ).join("")
          : "") || '<li class="empty">Nobody seated</li>';
    $(".spectator-section").hidden = !S.spectators.length;
    $("#players-status").textContent =
      S.phase === "game" && S.gameId === "drawguess" ? "Guessing…" : "";
    $("#spec-list").innerHTML =
      S.spectators.map((p) => personHTML(p, { spectator: true })).join("") ||
      '<li class="empty">Nobody watching</li>';

    const G = GAMES[S.gameId];
    const midJoin = S.gameId === "drawguess";
    let seat = "";
    if (S.role === "spectator") {
      if (S.players.length < S.maxPlayers && (S.phase === "lobby" || midJoin))
        seat =
          '<button class="btn btn-small btn-wide" id="take-seat">Take a Seat</button>';
      else
        seat = `<p class="seat-note">You're watching. ${S.players.length >= S.maxPlayers ? `${G.name} is ${S.maxPlayers} players max, so a Take Seat button shows up when someone leaves.` : "You can take a seat when this match ends."}</p>`;
    } else if (S.phase === "lobby") {
      seat =
        '<button class="link-btn" id="just-watch">Just watch instead</button>';
    }
    const specText = !S.spectatorsOn
      ? "Spectators are off"
      : `Watching ${S.spectators.length}/${S.maxSpectators}`;
    const cap = `<p class="cap-note">Active seats ${S.players.length}/${S.maxPlayers} · ${specText}. Everyone stays in this room; people without a seat spectate.</p>`;
    $("#seat-action").innerHTML = seat + cap;
  }
  $("#seat-action").addEventListener("click", (e) => {
    if (e.target.id === "take-seat") socket.emit("takeSeat");
    if (e.target.id === "just-watch") socket.emit("watch");
  });
  $("#side").addEventListener("click", (e) => {
    const k = e.target.closest("[data-kick]");
    const v = e.target.closest("[data-vote]");
    if (k) {
      const p = app.member(k.dataset.kick);
      if (p && confirm(`Kick ${p.name} from the lobby?`))
        socket.emit("kick", p.id);
    }
    if (v) {
      const p = app.member(v.dataset.vote);
      if (p && confirm(`Vote to kick ${p.name}?`))
        socket.emit("voteKick", p.id);
    }
  });

  // ---------- stage: lobby or game ----------
  function unmountStage() {
    if (mounted && mounted.startsWith("game:"))
      GameUI[mounted.slice(5)].unmount();
    mounted = null;
    hostKey = null;
  }

  function renderStage() {
    const mode = S.phase === "game" ? "game:" + S.gameId : "lobby";
    const stage = $("#stage");
    if (mode !== mounted) {
      unmountStage();
      stage.innerHTML = "";
      mounted = mode;
      if (mode === "lobby") {
        stage.innerHTML =
          '<div class="lobby-stage"><div id="lobby-top"></div><div id="host-panel"></div></div>';
      } else {
        GameUI[S.gameId].mount(stage, app);
      }
    }
    if (mode === "lobby") renderLobby();
    else GameUI[S.gameId].update(S, app);
  }

  // Host-only post-game controls; everyone else sees who they are waiting on.
  function resultActionsHTML() {
    const G = GAMES[S.gameId];
    if (!isHost()) {
      const host = app.member(S.hostId);
      return `<div class="result-actions" role="status"><p class="muted center">Waiting for ${esc(host ? host.name : "the host")} to play again or pick another game.</p></div>`;
    }
    const short = S.players.length < G.min;
    return `<div class="result-actions"><button class="btn" id="result-again" ${short ? "disabled" : ""}>Play Again</button><button class="btn btn-ghost" id="result-choose">Choose Another Game</button>${short ? `<p class="muted center">Need ${G.min} active players to play ${esc(G.name)} again.</p>` : ""}</div>`;
  }

  let autoTimer = null;
  function renderLobby() {
    const G = GAMES[S.gameId];
    const host = app.member(S.hostId);
    let top = "";
    if (S.autoStartIn !== null) {
      top += `<div class="banner">Next game starts in <b id="auto-n">${Math.ceil(S.autoStartIn / 1000)}</b>s${isHost() ? " (or start it now)" : ""}</div>`;
    }
    if (S.lastResult) {
      top += `<div class="card result-card">${GameUI[S.lastResult.type].renderResult(S.lastResult, S, app)}${resultActionsHTML()}</div>`;
    }

    $("#lobby-top").innerHTML = top;
    const n = $("[data-copy]", $("#lobby-top"));
    if (n) n.addEventListener("click", copyLink);
    clearInterval(autoTimer);
    if (S.autoStartIn !== null) {
      const end = performance.now() + S.autoStartIn;
      autoTimer = setInterval(() => {
        const el = $("#auto-n");
        if (!el) return clearInterval(autoTimer);
        el.textContent = Math.max(
          0,
          Math.ceil((end - performance.now()) / 1000),
        );
      }, 250);
    }
    renderHostPanel();
  }

  let hostKey = null;
  function renderHostPanel() {
    const G = GAMES[S.gameId];
    const key = S.gameId + ":" + isHost();
    const panel = $("#host-panel");
    if (key !== hostKey) {
      hostKey = key;
      panel.innerHTML = `<div class="card host-card"><h2>${icon("controller")} Game Settings</h2>
        <fieldset class="form-grid settings-fields" ${isHost() ? "" : "disabled"}>
          <label class="field"><span>Game Mode</span><select id="switch-game">${Object.entries(
            GAMES,
          )
            .map(([id, x]) => opt(id, S.gameId, x.name))
            .join("")}</select></label>
          ${settingsHTML(S.gameId, S.settings)}
          <label class="check"><span>Allow Spectators</span><input type="checkbox" data-host="spectatorsOn"></label>
          <details class="advanced-settings"><summary>Room Options</summary>
            <label class="field"><span>Who Can Join</span><select data-host="isPublic">${opt(0, 0, "Private (link only)")}${opt(1, 0, "Public (listed)")}</select></label>
            <label class="field"><span>Max Players</span><select data-host="maxPlayers" ${G.min === G.max ? "disabled" : ""}>${Array.from(
              { length: G.max - G.min + 1 },
              (_, i) => G.min + i,
            )
              .map((v) => opt(v, 0))
              .join("")}</select></label>
            <label class="check"><span>Lock Room</span><input type="checkbox" data-host="locked"></label>
            <label class="field"><span>Max Spectators</span><select data-host="maxSpectators">${[0, 5, 10, 20, 50].map((v) => opt(v, 0)).join("")}</select></label>
          </details>
        </fieldset><p class="host-note">${isHost() ? "Your room. Your rules." : "The host controls these settings."}</p>
      </div>`;
      if (S.gameId === "drawguess") {
        const fields = panel.querySelector(".settings-fields");
        const details = document.createElement("details");
        details.className = "word-options";
        details.innerHTML = "<summary>Custom Words & Hints</summary>";
        const custom = fields.querySelector(".custom-field");
        custom.before(details);
        details.append(custom);
        ["hints", "customOnly"].forEach((key) =>
          details.append(
            fields.querySelector(`[data-setting="${key}"]`).closest(".check"),
          ),
        );
      }
    }

    // Keep inputs in step with the server without clobbering what's being edited.
    $$("[data-host]", panel).forEach((i) => {
      if (document.activeElement === i) return;
      const v = S[i.dataset.host];
      if (i.type === "checkbox") i.checked = !!v;
      else i.value = typeof v === "boolean" ? (v ? 1 : 0) : v;
    });
    $$("[data-setting]", panel).forEach((i) => {
      if (document.activeElement === i && i.type !== "checkbox") return; // the server may refuse a checkbox (custom-only without 6 words)
      const v = S.settings[i.dataset.setting];
      if (i.type === "checkbox") i.checked = !!v;
      else i.value = v;
    });
    $$("[data-choice]", panel).forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        String(b.dataset.value === String(S.settings[b.dataset.choice])),
      ),
    );
    if (!$("#modal").hidden && $(".settings-modal .settings-fields")) {
      $$("[data-setting]", $("#modal-body")).forEach((i) => {
        if (i === document.activeElement && i.type !== "checkbox") return;
        const v = S.settings[i.dataset.setting];
        if (i.type === "checkbox") i.checked = !!v;
        else i.value = v;
      });
      $$("[data-choice]", $("#modal-body")).forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.value === String(S.settings[b.dataset.choice])),
        ),
      );
    }
  }
  $("#lobby-start").addEventListener("click", () => socket.emit("startGame"));

  $("#stage").addEventListener("change", (e) => {
    const t = e.target;
    if (!isHost()) return;
    if (t.id === "switch-game") return switchGame(t.value);
    if (t.dataset.host) {
      let v = t.type === "checkbox" ? t.checked : Number(t.value);
      if (t.dataset.host === "isPublic") v = !!v;
      socket.emit("hostUpdate", { [t.dataset.host]: v });
    } else if (t.dataset.setting && t.closest("#host-panel")) {
      const v =
        t.type === "checkbox"
          ? t.checked
          : t.tagName === "SELECT" && !STRING_SETTINGS.includes(t.dataset.setting)
            ? Number(t.value)
            : t.value;
      socket.emit("hostUpdate", { settings: { [t.dataset.setting]: v } });
    }
  });
  $("#stage").addEventListener("click", (e) => {
    if (e.target.closest("#start-btn") || e.target.closest("#result-again"))
      socket.emit("startGame");
    if (e.target.closest("#result-choose")) chooseGame();
    const sw = e.target.closest("[data-switch]");
    if (sw && isHost() && sw.dataset.switch !== S.gameId)
      switchGame(sw.dataset.switch);
  });

  function chooseGame() {
    openModal(`
      <h2 class="card-title">Choose another game</h2>
      <p class="muted">Same room, same people, same chat.</p>
      <div class="pick-list">${Object.entries(GAMES)
        .map(
          ([id, x]) =>
            `<button type="button" class="btn ${id === S.gameId ? "btn-ghost" : ""}" data-pickgame="${id}">${esc(x.name)}<small> · ${esc(x.players)}${
              S.players.length + S.spectators.length > x.max
                ? ` · ${S.players.length + S.spectators.length - x.max} will spectate`
                : ""
            }</small></button>`,
        )
        .join("")}</div>
      <div class="modal-actions"><button class="btn btn-ghost" data-close>Cancel</button></div>`);
    $$("[data-pickgame]").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.dataset.pickgame;
        closeModal();
        if (id === S.gameId) return socket.emit("startGame");
        switchGame(id);
      }),
    );
  }

  function switchGame(gameId) {
    const G = GAMES[gameId];
    if (S.players.length <= G.max)
      return socket.emit("switchGame", { game: gameId });
    const total = S.players.length + S.spectators.length;
    openModal(`
      <h2 class="card-title">${G.name} is ${G.max} players max</h2>
      <p>There are ${total} people here. ${G.max} will play and ${total - G.max} will spectate. Nobody is removed from the room, and spectators can take a seat when one opens. Pick who plays:</p>
      <div class="pick-list">${S.players.map((p) => `<label class="pick"><input type="checkbox" value="${p.id}">${avatarHTML(p.avatar)} ${esc(p.name)}</label>`).join("")}</div>
      <p class="muted" id="pick-count">0/${G.max} picked</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-ghost" id="pick-random">${icon("dice")} Random</button>
        <button class="btn" id="pick-go" disabled>Switch</button>
      </div>`);
    const boxes = $$(".pick input");
    const sync = () => {
      const n = boxes.filter((b) => b.checked).length;
      $("#pick-count").textContent = `${n}/${G.max} picked`;
      $("#pick-go").disabled = n !== G.max;
      boxes.forEach((b) => {
        b.disabled = !b.checked && n >= G.max;
      });
    };
    boxes.forEach((b) => b.addEventListener("change", sync));
    $("#pick-random").addEventListener("click", () => {
      socket.emit("switchGame", { game: gameId });
      closeModal();
    });
    $("#pick-go").addEventListener("click", () => {
      socket.emit("switchGame", {
        game: gameId,
        seats: boxes.filter((b) => b.checked).map((b) => b.value),
      });
      closeModal();
    });
  }

  // ---------- start ----------
  route();
})();
