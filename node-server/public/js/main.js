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
    telephone: {
      name: "Drawing Telephone",
      slug: "drawing-telephone",
      min: 3,
      max: 8,
      players: "3–8 active players",
      overflow: "Extra people in the room spectate",
      blurb: "Draw it, describe it, watch it go wrong",
      art: '<img src="/assets/telephone.svg" alt="A pencil and a speech bubble" width="180" height="180">',
    },
    bluff: {
      name: "Bluff Battle",
      slug: "bluff-battle",
      min: 3,
      max: 10,
      players: "3–10 active players",
      overflow: "Extra people in the room spectate",
      blurb: "Invent fake answers and fool your friends",
      art: '<img src="/assets/bluff.svg" alt="A masked face" width="180" height="180">',
    },
    impostor: {
      name: "The Impostor",
      slug: "the-impostor",
      min: 3,
      max: 10,
      players: "3–10 active players",
      overflow: "Extra people in the room spectate",
      blurb: "One of you doesn't know the secret word",
      art: '<img src="/assets/impostor.svg" alt="A hooded figure with a question mark" width="180" height="180">',
    },
    liarsdice: {
      name: "Liar's Dice",
      slug: "liars-dice",
      min: 2,
      max: 8,
      players: "2–8 active players",
      overflow: "Extra people in the room spectate",
      blurb: "Bid on hidden dice or call the bluff",
      art: '<img src="/assets/liars-dice.svg" alt="Two dice" width="180" height="180">',
    },
    hotpotato: {
      name: "Hot Potato",
      slug: "hot-potato",
      min: 2,
      max: 10,
      players: "2–10 active players",
      overflow: "Extra people in the room spectate",
      blurb: "Answer fast and pass the bomb",
      art: '<img src="/assets/hot-potato.svg" alt="A round bomb with a lit fuse" width="180" height="180">',
    },
    battleship: {
      name: "Battleship",
      slug: "battleship",
      min: 2,
      max: 2,
      players: "2 active players",
      overflow: "Everyone else in the room spectates",
      blurb: "Hide your fleet and sink theirs",
      art: '<img src="/assets/battleship.svg" alt="A battleship and radar rings" width="180" height="180">',
    },
    checkers: {
      name: "Checkers",
      slug: "checkers",
      min: 2,
      max: 2,
      players: "2 active players",
      overflow: "Everyone else in the room spectates",
      blurb: "Jump, capture and crown your kings",
      art: '<img src="/assets/checkers.svg" alt="Checkers pieces on a board" width="180" height="180">',
    },
    reversi: {
      name: "Reversi",
      slug: "reversi",
      min: 2,
      max: 2,
      players: "2 active players",
      overflow: "Everyone else in the room spectates",
      blurb: "Flank discs and flip the board",
      art: '<img src="/assets/reversi.svg" alt="Black and white discs" width="180" height="180">',
    },
    ludo: {
      name: "Ludo",
      slug: "ludo",
      min: 2,
      max: 4,
      players: "2–4 active players",
      overflow: "Extra people in the room spectate",
      blurb: "Race your tokens home and send rivals back",
      art: '<img src="/assets/ludo.svg" alt="A Ludo board with four coloured tokens" width="180" height="180">',
    },
    chess: {
      name: "Chess",
      slug: "chess",
      min: 2,
      max: 2,
      players: "2 active players",
      overflow: "Everyone else in the room spectates",
      blurb: "The classic game of kings, with clocks",
      art: '<img src="/assets/chess.svg" alt="A chess knight" width="180" height="180">',
    },
    pool: {
      name: "Pool",
      slug: "pool",
      min: 2,
      max: 2,
      players: "2 active players",
      overflow: "Everyone else in the room spectates",
      blurb: "Aim, power up and clear the table",
      art: '<img src="/assets/pool.svg" alt="A pool table with an 8-ball" width="180" height="180">',
    },
    golf: {
      name: "Mini Golf",
      slug: "mini-golf",
      min: 2,
      max: 6,
      players: "2–6 active players",
      overflow: "Extra people in the room spectate",
      blurb: "Putt through 18 holes of bumpers, sand and water",
      art: '<img src="/assets/golf.svg" alt="A golf ball near a flag" width="180" height="180">',
    },
    tycoon: {
      name: "Property Tycoon",
      slug: "property-tycoon",
      min: 2,
      max: 6,
      players: "2–6 active players",
      overflow: "Extra people in the room spectate",
      blurb: "Buy, trade and build your way to the top",
      art: '<img src="/assets/tycoon.svg" alt="A city tower with a dollar sign" width="180" height="180">',
    },
  };

  // Hidden games keep their screens (a room already playing one still works) but are never offered.
  const HIDDEN = new Set(window.PAGE.hidden || []);
  const pickable = (keep) =>
    Object.entries(GAMES).filter(([id]) => !HIDDEN.has(id) || id === keep);

  // One category per game, shared by the Games catalog, the picker and their filters.
  const CATEGORY = {
    drawguess: "Drawing",
    telephone: "Drawing",
    wordchain: "Words",
    wordscramble: "Words",
    categories: "Words",
    trivia: "Social",
    bluff: "Social",
    impostor: "Social",
    rps: "Social",
    hotpotato: "Social",
    colorstack: "Cards",
    gofish: "Cards",
    higherlower: "Cards",
    fourrow: "Strategy",
    tictactoe: "Strategy",
    dotsboxes: "Strategy",
    checkers: "Strategy",
    reversi: "Strategy",
    chess: "Strategy",
    battleship: "Strategy",
    ludo: "Board",
    tycoon: "Board",
    liarsdice: "Board",
    pool: "Skill",
    golf: "Skill",
  };
  for (const [id, g] of Object.entries(GAMES)) g.cat = CATEGORY[id] || "Party";
  const rangeText = (g) =>
    g.min === g.max ? `${g.max} players` : `${g.min}–${g.max} players`;
  const categories = () => [
    ...new Set(pickable().map(([, g]) => g.cat)),
  ];
  // Search matches the name, the category or the short description.
  const matches = (g, q) =>
    !q ||
    [g.name, g.cat, g.blurb].some((t) =>
      t.toLowerCase().includes(q.trim().toLowerCase()),
    );

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
    $("#modal-body").classList.remove("settings-modal", "settings-readonly", "rules-modal");
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

  // ---------- rules + focus mode (shared by all games) ----------
  const RULE_SECTIONS = [
    ["flow", "How a round works"],
    ["controls", "Controls (mouse and touch)"],
    ["scoring", "Scoring"],
    ["special", "Special mechanics"],
  ];
  function rulesHTML(gameId) {
    const G = GAMES[gameId];
    const R = (window.GameRules || {})[gameId];
    if (!R)
      return `<h2 class="card-title">${icon("help")} ${esc(G.name)} rules</h2><p>Rules for this game are not available yet.</p>`;
    const list = (a) => `<ul>${a.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    return `<h2 class="card-title">${icon("help")} How to play ${esc(G.name)}</h2>
      <div class="rules-body" tabindex="0" aria-label="${esc(G.name)} rules">
        <p class="rules-goal"><b>Goal:</b> ${esc(R.goal)}</p>
        <p><b>Players:</b> ${esc(R.players)}</p>
        ${RULE_SECTIONS.filter(([k]) => R[k] && R[k].length)
          .map(([k, t]) => `<h3>${t}</h3>${list(R[k])}`)
          .join("")}
        <h3>Timer</h3><p>${esc(R.timer)}</p>
        <h3>Winning, losing and ties</h3><p>${esc(R.ending)}</p>
      </div>
      <p class="muted rules-note">Your game keeps running while you read. Press Esc or tap Close to return.</p>
      <div class="modal-actions"><button class="btn" data-close>Close</button></div>`;
  }
  function openRules(gameId) {
    if (!gameId || !GAMES[gameId]) return;
    openModal(rulesHTML(gameId));
    $("#modal-body").classList.add("rules-modal");
  }
  const rulesBtn = $("#rules-btn");
  rulesBtn.innerHTML = icon("help");
  rulesBtn.addEventListener("click", () => S && openRules(S.gameId));
  $("#rules-link").addEventListener("click", () => S && openRules(S.gameId));

  let focusMode = false;
  const focusBtn = $("#focus-btn");
  function setFocus(on) {
    focusMode = !!on;
    document.body.classList.toggle("focus-mode", focusMode);
    focusBtn.setAttribute("aria-pressed", String(focusMode));
    focusBtn.innerHTML = icon(focusMode ? "shrink" : "expand");
    const label = focusMode ? "Exit focus mode" : "Enter focus mode";
    focusBtn.setAttribute("aria-label", label);
    focusBtn.title = focusMode
      ? "Exit focus mode (Esc)"
      : "Focus mode: enlarge the game";
    window.dispatchEvent(new Event("resize"));
  }
  focusBtn.innerHTML = icon("expand");
  focusBtn.addEventListener("click", () => setFocus(!focusMode));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && focusMode && $("#modal").hidden) setFocus(false);
  });
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
  $("#hero-create").innerHTML = icon("plus") + "Create Party";
  $("#hero-join").innerHTML = icon("link") + "Join Party";
  $$("[data-trust]").forEach((el) =>
    el.insertAdjacentHTML("afterbegin", icon(el.dataset.trust)),
  );
  $("#hero-create").onclick = () => openCreate();
  $("#hero-join").onclick = () => {
    nav("/rooms");
    $("#code-input").focus();
  };
  // Games and Rooms are real links (data-nav); only Profile opens a dialog.
  document.addEventListener("click", (e) => {
    const b = e.target.closest('[data-view="profile"]');
    if (b) openProfile();
  });
  function openProfile() {
    openModal(
      '<h2 class="card-title">Your Player</h2><p class="muted">No accounts. Just a name, a face, and good company.</p><div class="profile" data-profile></div><p class="profile-note">Your player is saved on this device. Changes apply when you next join a room.</p><div class="modal-actions"><button class="btn" data-close>Let’s Play</button></div>',
    );
    renderProfiles();
  }
  $("#settings-btn").onclick = () =>
    S ? (S.gameId ? openGameSettings() : openPartySettings()) : openProfile();

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
    // Navigating elsewhere never leaves the room; only Leave Party does.
    const view = new URLSearchParams(location.search).get("view");
    if (location.pathname === "/rooms" || view === "rooms") return showRooms();
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

  // ---------- home + Games catalog ----------
  let lobbyTimer = null;
  function showHome() {
    clearInterval(lobbyTimer);
    const view = new URLSearchParams(location.search).get("view");
    const slugGame =
      pickable().map(([g]) => g).find(
        (g) => location.pathname === "/" + GAMES[g].slug,
      ) || (HIDDEN.has(window.PAGE.game) ? "" : window.PAGE.game);
    const catalog = view || slugGame || location.pathname === "/games";
    showScreen(catalog ? "selection" : "home");
    renderProfiles();
    renderGames();
    if (slugGame)
      $(`.game-card[data-game="${slugGame}"]`)?.classList.add("featured");
  }

  const catalogFilter = { q: "", cat: "All" };
  // "Fits our party" only means something once you're in one.
  const partySize = () =>
    S ? S.players.length + S.spectators.length : 0;
  const fits = (g) => {
    const n = partySize();
    return n >= g.min && (n <= g.max || (S && S.spectatorsOn));
  };
  function chipsHTML(f, total) {
    const chips = ["All", ...categories()];
    if (S) chips.push("Fits");
    return chips
      .map(
        (c) =>
          `<button type="button" class="chip" data-filter="${c}" data-k="chip-${c}" aria-pressed="${f.cat === c}">${c === "All" ? `All · ${total}` : c === "Fits" ? "Fits our party" : c}</button>`,
      )
      .join("");
  }
  const filterGames = (f) =>
    pickable().filter(
      ([, g]) =>
        matches(g, f.q) &&
        (f.cat === "All" || (f.cat === "Fits" ? fits(g) : g.cat === f.cat)),
    );
  function renderGames() {
    const all = pickable();
    if (catalogFilter.cat === "Fits" && !S) catalogFilter.cat = "All";
    $("#game-filters").innerHTML = chipsHTML(catalogFilter, all.length);
    const list = filterGames(catalogFilter);
    const filtering = !!catalogFilter.q.trim() || catalogFilter.cat !== "All";
    $("#games").innerHTML =
      list
        .map(
          ([id, g]) => `
      <article class="card game-card" data-game="${id}">
        <div class="game-art">${g.art}</div>
        <div class="game-info"><h2><a href="/${g.slug}" data-nav="/${g.slug}">${g.name}</a></h2><p class="game-meta">${rangeText(g)} · ${g.cat}</p><p class="game-blurb">${g.blurb}</p></div>
        <button class="btn btn-small btn-ghost game-play" data-create="${id}" aria-label="Play ${esc(g.name)}">Play</button>
      </article>`,
        )
        .join("") +
      (filtering
        ? ""
        : `<article class="card game-card coming-soon"><div class="game-art"><img src="/assets/coming-soon.svg" width="180" height="180" alt="An illustrated dice"></div><div class="game-info"><h2>Coming Soon</h2><p class="game-meta">More games on the way!</p></div><span class="soon-label">Soon</span></article>`);
    $("#games-empty").hidden = list.length > 0;
    $("#games-empty-text").textContent = catalogFilter.q.trim()
      ? `No games match “${catalogFilter.q.trim()}”.`
      : "No games in this filter yet.";
    $("#games-count").textContent = `${list.length} game${list.length === 1 ? "" : "s"} shown`;
  }
  $("#game-search").addEventListener("input", (e) => {
    catalogFilter.q = e.target.value;
    renderGames();
  });
  $("#game-filters").addEventListener("click", (e) => {
    const c = e.target.closest("[data-filter]");
    if (!c) return;
    catalogFilter.cat = c.dataset.filter;
    renderGames();
    $(`#game-filters [data-filter="${c.dataset.filter}"]`)?.focus();
  });
  $("#games-clear").addEventListener("click", () => {
    catalogFilter.q = "";
    catalogFilter.cat = "All";
    $("#game-search").value = "";
    renderGames();
    $("#game-search").focus();
  });
  $("#games").addEventListener("click", (e) => {
    const c = e.target.closest("[data-create]");
    if (c) playGame(c.dataset.create);
  });
  // Play always goes through a party: create one, or preselect the game in yours.
  function playGame(gameId) {
    if (!currentCode || !S) return openCreate(gameId);
    nav("/r/" + currentCode);
    openPicker(gameId);
  }

  // ---------- Rooms ----------
  function showRooms() {
    showScreen("rooms");
    renderCurrentParty();
    loadLobbies(true);
    clearInterval(lobbyTimer);
    lobbyTimer = setInterval(() => {
      if (document.body.dataset.screen === "rooms") loadLobbies();
    }, 6000);
  }
  function renderCurrentParty() {
    const el = $("#current-party");
    el.hidden = !currentCode;
    if (!currentCode) return;
    const G = S && S.gameId ? GAMES[S.gameId] : null;
    const count = S ? S.players.length + S.spectators.length : 0;
    el.innerHTML = `<h2 id="current-title">Your current party</h2><div class="current-row"><div><b>${esc(S ? S.name : "Your party")}</b><small>${S ? `${count} ${count === 1 ? "person" : "people"} · ${G ? esc(G.name) : "Choosing a game"}${S.phase === "game" ? " · playing now" : ""}` : "Connecting…"} · ${esc(currentCode)}</small></div><button class="btn btn-ghost btn-small" type="button" id="current-return">Return</button></div>`;
  }
  $("#current-party").addEventListener("click", (e) => {
    if (e.target.closest("#current-return")) nav("/r/" + currentCode);
  });

  let lobbiesLoaded = false;
  async function loadLobbies(first) {
    const el = $("#lobby-list");
    if (first && !lobbiesLoaded) {
      el.setAttribute("aria-busy", "true");
      el.innerHTML = '<p class="empty">Loading public parties…</p>';
    }
    try {
      const list = await (await fetch("/api/rooms")).json();
      lobbiesLoaded = true;
      el.setAttribute("aria-busy", "false");
      if (!list.length) {
        el.innerHTML =
          '<div class="empty rooms-empty"><p>No public parties yet. Start one and invite your people.</p><button class="btn btn-small" type="button" data-room-create>Create Party</button></div>';
        return;
      }
      el.innerHTML = list
        .map((r) => {
          const G = r.gameId ? GAMES[r.gameId] : null;
          const seatOpen =
            r.players < r.max &&
            (r.phase === "lobby" || r.gameId === "drawguess");
          const art = G
            ? `<span class="room-art">${G.art}</span>`
            : `<span class="room-art room-art-empty" aria-hidden="true">${icon("people")}</span>`;
          const label = r.locked
            ? "Locked"
            : seatOpen
              ? "Join"
              : r.spectatorsOn
                ? "Spectate"
                : "Full";
          return `<div class="room-preview">${art}<div><b>${esc(r.name || r.code)}</b><small>${G ? esc(r.gameName) : "Choosing a game"} · ${r.players}/${r.max} players${r.phase === "game" ? " · playing" : ""}</small><span class="room-host">Hosted by ${esc(r.host)} · ${esc(r.code)}</span></div><button class="btn btn-small ${!seatOpen ? "btn-ghost" : ""}" data-join="${esc(r.code)}" aria-label="${label} ${esc(r.name || r.code)}" ${r.locked || (!seatOpen && !r.spectatorsOn) ? "disabled" : ""}>${label}</button></div>`;
        })
        .join("");
    } catch (e) {
      el.setAttribute("aria-busy", "false");
      el.innerHTML =
        '<div class="empty rooms-empty"><p>Could not load public parties.</p><button class="btn btn-small btn-ghost" type="button" data-room-retry>Try Again</button></div>';
    }
  }
  $("#refresh-btn").addEventListener("click", () => loadLobbies());
  $("#lobby-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-join]");
    if (b) join(b.dataset.join);
    if (e.target.closest("[data-room-create]")) openCreate();
    if (e.target.closest("[data-room-retry]")) loadLobbies(true);
  });
  // Accepts a bare code, an invite link (/r/CODE) or #CODE.
  function parseCode(raw) {
    raw = raw.trim();
    const code = (
      raw.match(/\/r\/([a-z0-9]{4,8})(?:[/?#]|$)/i)?.[1] ||
      raw.match(/^#([a-z0-9]{4,8})$/i)?.[1] ||
      raw
    ).toUpperCase();
    return /^[A-Z0-9]{4,8}$/.test(code) ? code : null;
  }
  const codeError = (text) => {
    $("#code-error").hidden = !text;
    $("#code-error").textContent = text || "";
    $("#code-input").setAttribute("aria-invalid", String(!!text));
  };
  $("#code-input").addEventListener("input", () => codeError(""));
  $("#code-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = $("#code-input").value;
    if (!raw.trim()) return codeError("Enter a party code or paste an invite link.");
    const code = parseCode(raw);
    if (!code) return codeError("That code does not look right. Codes are 6 letters and numbers.");
    codeError("");
    join(code, { inline: true });
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
    if (gameId === "telephone")
      return sel("drawTime", "Drawing Time", [45, 60, 90], s.drawTime, (v) => v + " seconds") + sel("writeTime", "Writing Time", [20, 30, 45], s.writeTime, (v) => v + " seconds");
    if (gameId === "bluff")
      return sel("rounds", "Questions", [3, 5, 8], s.rounds) + sel("bluffTime", "Time To Bluff", [30, 45, 60], s.bluffTime, (v) => v + " seconds") + sel("voteTime", "Time To Vote", [15, 20, 30], s.voteTime, (v) => v + " seconds");
    if (gameId === "impostor")
      return (
        sel("rounds", "Rounds", [1, 3, 5], s.rounds) +
        sel("clueRounds", "Clues Per Player", [1, 2, 3], s.clueRounds) +
        sel("clueTime", "Time Per Clue", [20, 30, 45], s.clueTime, (v) => v + " seconds") +
        sel("discussTime", "Discussion Time", [30, 60, 90], s.discussTime, (v) => v + " seconds")
      );
    if (gameId === "liarsdice")
      return sel("dice", "Dice Each", [3, 5], s.dice) + sel("turnTime", "Turn Timer", [20, 30, 60], s.turnTime, (v) => v + " seconds") + `<label class="check"><span>Ones Are Wild <small>Ones count as any face except ones</small></span><input type="checkbox" data-setting="wild" ${s.wild ? "checked" : ""}></label>`;
    if (gameId === "hotpotato")
      return sel("lives", "Lives", [1, 2, 3], s.lives) + `<label class="field"><span>Fuse Length</span><select data-setting="fuse">${[["short", "Short"], ["medium", "Medium"], ["long", "Long"]].map(([v, l]) => opt(v, s.fuse, l)).join("")}</select></label>`;
    const turnOpt = (vals) => sel("turnTime", "Turn Timer", vals, s.turnTime, (v) => (v ? v + " seconds" : "Off"));
    const stays = `<label class="check"><span>Winner Stays <small>Next spectator takes the other seat</small></span><input type="checkbox" data-setting="winnerStays" ${s.winnerStays ? "checked" : ""}></label>`;
    if (gameId === "battleship")
      return sel("placeTime", "Time To Place Fleet", [60, 90, 120], s.placeTime, (v) => v + " seconds") + turnOpt([0, 20, 30, 60]) + `<label class="check"><span>Hit Again <small>A hit earns another shot</small></span><input type="checkbox" data-setting="hitAgain" ${s.hitAgain ? "checked" : ""}></label>` + stays;
    if (gameId === "checkers" || gameId === "reversi") return turnOpt([0, 20, 30, 60]) + stays;
    if (gameId === "ludo") return sel("turnTime", "Turn Timer", [15, 25, 40], s.turnTime, (v) => v + " seconds");
    if (gameId === "chess")
      return sel("clock", "Clock Per Player", [0, 3, 5, 10, 15], s.clock, (v) => (v ? v + " minutes" : "Off")) + sel("increment", "Bonus Per Move", [0, 2, 5], s.increment, (v) => (v ? "+" + v + " seconds" : "None")) + stays;
    if (gameId === "pool") return turnOpt([0, 30, 45, 60]) + stays;
    if (gameId === "golf")
      return (
        `<label class="field"><span>Course</span><select data-setting="course">${[["meadow", "Meadow Mini (6 holes)"], ["canyon", "Canyon Run (6 holes)"], ["skyline", "Skyline Gauntlet (6 holes)"], ["tour", "Playgrid Open (all 18)"]].map(([v, l]) => opt(v, s.course, l)).join("")}</select></label>` +
        sel("maxStrokes", "Stroke Limit Per Hole", [6, 8, 10], s.maxStrokes) +
        sel("turnTime", "Turn Timer", [20, 30, 45, 60], s.turnTime, (v) => v + " seconds")
      );
    if (gameId === "tycoon")
      return (
        sel("rounds", "Game Length", [10, 15, 25, 0], s.rounds, (v) => (v ? v + " rounds (quick)" : "Classic (last player standing)")) +
        sel("startCash", "Starting Cash", [1000, 1500, 2000], s.startCash, (v) => "$" + v) +
        sel("turnTime", "Turn Timer", [30, 45, 60, 90], s.turnTime, (v) => v + " seconds")
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
  // Settings only exist once a game is chosen. Defaults first; every supported value under Advanced.
  // Nothing is sent until Save, and participants see the same form read-only.
  function openGameSettings() {
    if (!S || !S.gameId) return;
    const G = GAMES[S.gameId];
    const editable = isHost() && S.phase === "lobby";
    const seats =
      G.min === G.max
        ? ""
        : `<label class="field"><span>Max Players</span><select data-host="maxPlayers">${Array.from(
            { length: G.max - G.min + 1 },
            (_, i) => G.min + i,
          )
            .map((v) => opt(v, S.maxPlayers))
            .join("")}</select></label>`;
    openModal(
      `<h2 class="card-title">Game Settings</h2><p class="settings-note">${esc(G.name)} · ${editable ? "sensible defaults, fewer decisions." : S.phase === "game" ? "This game is in progress. Settings can change in the lobby." : "Your host controls the game settings."}</p><fieldset class="settings-fields" ${editable ? "" : "disabled"}>${settingsHTML(S.gameId, S.settings)}</fieldset><div class="modal-actions">${editable ? '<button class="btn btn-ghost" data-close>Cancel</button><button class="btn" id="settings-save" type="button">Save Settings</button>' : '<button class="btn" data-close>Close</button>'}</div>`,
    );
    $("#modal-body").classList.add("settings-modal");
    $("#modal-body").classList.toggle("settings-readonly", !editable);
    const fields = $(".settings-fields", $("#modal-body"));
    const more = document.createElement("details");
    more.className = "settings-more";
    more.innerHTML =
      '<summary>Advanced settings</summary><p class="muted settings-more-note">All supported timers, custom words, hints and seat limits live here.</p>';
    if (S.gameId === "drawguess") {
      for (const [key, title, values] of [
        ["drawTime", "Round time", [60, 80, 120]],
        ["rounds", "Rounds", [3, 5, 7]],
      ]) {
        const native = fields.querySelector(`[data-setting="${key}"]`);
        const row = document.createElement("div");
        row.className = "field";
        row.innerHTML = `<span>${title}</span><div class="segmented" role="group" aria-label="${title}">${values.map((v) => `<button type="button" data-choice="${key}" data-value="${v}" aria-pressed="${Number(native.value) === v}">${key === "drawTime" ? v + "s" : v}</button>`).join("")}</div>`;
        native.closest(".field").before(row);
        more.append(native.closest(".field"));
      }
      more.append(fields.querySelector(".custom-field"));
      fields.querySelectorAll(".check").forEach((el) => more.append(el));
    }
    if (seats) more.insertAdjacentHTML("beforeend", seats);
    if (more.querySelector(".field, .check")) fields.append(more);
    $("#settings-save")?.addEventListener("click", () => {
      if (!isHost() || !S.gameId) return closeModal();
      const patch = { settings: readSettings(fields) };
      const max = fields.querySelector('[data-host="maxPlayers"]');
      if (max) patch.maxPlayers = Number(max.value);
      socket.emit("hostUpdate", patch);
      closeModal();
      toast("Game settings saved.");
    });
  }

  const STRING_SETTINGS = ["difficulty", "dictionary", "category", "course"];
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

  // ---------- create party ----------
  // Only two choices: who can join and whether people can watch. The game comes later,
  // in the lobby. Play on a game card passes `gameId` so the new party starts with it.
  function openCreate(gameId) {
    if (gameId && (!GAMES[gameId] || HIDDEN.has(gameId))) gameId = null;
    const G = gameId ? GAMES[gameId] : null;
    openModal(`
      <h2 class="card-title">Create a Party</h2>
      <p class="muted">${G ? `You'll start with ${esc(G.name)} selected. You can change it in the lobby.` : "No game to choose yet. Get your people together first."}</p>
      <div class="create-form" id="create-form">
        <fieldset class="vis-choice"><legend class="sr-only">Who can join</legend>
          <label class="vis-option"><input type="radio" name="c-vis" value="0" checked><span><b>Private</b><small>Only people with your invite can join.</small></span></label>
          <label class="vis-option"><input type="radio" name="c-vis" value="1"><span><b>Public</b><small>Let others find your party in Rooms.</small></span></label>
        </fieldset>
        <label class="switch-row"><span>Allow spectators</span><input type="checkbox" role="switch" id="c-spec" checked></label>
      </div>
      <p class="field-error" id="c-error" role="alert" hidden></p>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-big" id="c-go">Create Party</button>
      </div>
      <p class="muted create-next">Next: an inviteable lobby with “Choose a Game”. No name, game or advanced fields required.</p>`);
    $("#modal-body").classList.add("create-modal");
    $("#c-go").addEventListener("click", () => {
      const go = $("#c-go");
      const opts = {
        game: gameId || null,
        isPublic: $('[name="c-vis"]:checked').value === "1",
        spectatorsOn: $("#c-spec").checked,
        profile,
        token,
      };
      if (!leaveForOtherRoom()) return;
      go.disabled = true;
      go.textContent = "Creating…";
      $("#c-error").hidden = true;
      socket.timeout(8000).emit("createRoom", opts, (err, res) => {
        if (err || !res || res.error) {
          // Keep the dialog and the choices; offer a retry.
          if (!$("#c-go")) return;
          go.disabled = false;
          go.textContent = "Try Again";
          $("#c-error").textContent =
            res && res.error === "slow"
              ? "Too many tries in a row. Wait a few seconds and try again."
              : "Could not create the party. Check your connection and try again.";
          $("#c-error").hidden = false;
          return;
        }
        closeModal();
        handleJoin(res);
      });
    });
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
        `You are in party ${currentCode}. Joining ${code} will leave it.`;
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
    return confirmLeave(`You are in party ${currentCode}. Leave it?`);
  }

  function join(code, { silent, inline } = {}) {
    if (!silent && currentCode === code) {
      nav("/r/" + code);
      return;
    }
    // Every deliberate join to a different room goes through the leave guard.
    if (!silent && !leaveForOtherRoom()) return;
    socket.emit("joinRoom", { code, profile, token }, (res) =>
      handleJoin(res, silent, inline),
    );
  }

  // Joining from the Rooms code box explains a bad code right there instead of leaving the page.
  const INLINE_ERRORS = {
    closed: "No party with that code. It may have closed, or the code has a typo.",
    locked: "That party is locked. Ask the host to unlock it.",
    full: "That party is full and isn't taking spectators.",
    kicked: "You were removed from that party.",
    slow: "Too many tries in a row. Wait a few seconds and try again.",
    busy: "The server is busy. Try again in a minute.",
  };
  function handleJoin(res, silent, inline) {
    if (!res || res.error) {
      if (silent && currentCode) leaveLocal();
      const kind = res ? res.error : "closed";
      if (inline && document.body.dataset.screen === "rooms")
        return codeError(INLINE_ERRORS[kind] || INLINE_ERRORS.closed);
      return showMessage(kind, res);
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
      dismissedResult = null;
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
    rulesBtn.hidden = true;
    focusBtn.hidden = true;
    if (focusMode) setFocus(false);
  }
  function leaveRoom() {
    socket.emit("leaveRoom");
    leaveLocal();
  }
  $("#leave-btn").addEventListener("click", () => {
    nav("/games");
  });
  $("#leave-lobby-btn").addEventListener("click", () => leaveParty());
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
    const M = {
      closed: [
        "exit",
        "This party has closed",
        "Everyone left, or the code is wrong, so there is no party here.",
        [
          ["Start a new party", "create"],
          ["Find another party", "rooms"],
        ],
      ],
      locked: [
        "lock",
        "This party is locked",
        "The host locked it, so no new people can join right now.",
        [
          ["Create your own party", "create"],
          ["Find another party", "rooms"],
        ],
      ],
      full: [
        "people",
        "This party is full",
        `This party is full (${info.players || 0}/${info.max || 0} players) and isn't taking spectators.`,
        [
          ["Create your own party", "create"],
          ["Find another party", "rooms"],
        ],
      ],
      kicked: [
        "exit",
        "You were removed",
        "The host or the other players removed you from this party.",
        [["Back home", "home"]],
      ],
      replaced: [
        "monitor",
        "Opened somewhere else",
        "This party was opened in another tab or window, so this one disconnected.",
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
      if (b.dataset.act === "rooms") return nav("/rooms");
      history.pushState({}, "", "/");
      showHome();
      if (b.dataset.act === "create") openCreate();
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
  $("#share-link").addEventListener("click", shareParty);
  async function shareParty() {
    const text =
      S && S.gameId
        ? `Come play ${GAMES[S.gameId].name} with me!`
        : "Join my party!";
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
  }

  // ---------- room ----------
  const isHost = () => S && S.hostId === S.you;
  const me = () => app.member(S.you);
  const gameOfS = () => (S && S.gameId ? GAMES[S.gameId] : null);
  // A participant can put the results away for themselves; the host's Back to Lobby clears them for all.
  let dismissedResult = null;
  const resultKey = (r) =>
    r ? JSON.stringify(r).length + ":" + (r.winnerId || "") + ":" + r.type : null;
  const showingResult = () =>
    !!S && !!S.lastResult && dismissedResult !== resultKey(S.lastResult);

  // Replace a region only when its markup changed, and keep keyboard focus on the same control.
  function patch(el, html) {
    if (!el || el.dataset.html === html) return;
    const a = document.activeElement;
    const key = a && el.contains(a) ? a.dataset.k || (a.id ? "#" + a.id : null) : null;
    el.innerHTML = html;
    el.dataset.html = html;
    if (!key) return;
    const next = key.startsWith("#")
      ? el.querySelector(key)
      : el.querySelector(`[data-k="${CSS.escape(key)}"]`);
    if (next) next.focus();
  }

  function renderRoom() {
    if (!S) return;
    // A participant's "Back to Lobby" only hides the results it was pressed on. Any match
    // starting, or any new results, shows results again. Settle that before choosing the layout.
    if (S.phase === "game") dismissedResult = null;
    if (S.lastResult) {
      const key = resultKey(S.lastResult);
      if (key !== lastResultKey) {
        lastResultKey = key;
        dismissedResult = null;
        const snd = GameUI[S.lastResult.type].resultSound(S.lastResult, S);
        if (snd) Sound.play(snd);
      }
    } else {
      lastResultKey = null;
    }
    const G = gameOfS();
    const phase =
      S.phase === "game" ? "game" : showingResult() ? "results" : "lobby";
    const previousPhase = document.body.dataset.phase;
    document.body.dataset.phase = phase;
    if (S.gameId) document.body.dataset.game = S.gameId;
    else delete document.body.dataset.game;
    const room = $("#screen-room");
    room.dataset.phase = phase;
    room.classList.toggle("party-mode", phase !== "game");
    $("#room-code").textContent = S.code;
    $("#game-word-slot").hidden = !(
      S.phase === "game" && S.gameId === "drawguess"
    );
    $("#header-round").textContent =
      S.gameId === "drawguess" && S.game
        ? `Round ${Math.min(S.game.round, S.game.rounds)}/${S.game.rounds}`
        : G
          ? G.name
          : "Party";
    $("#header-difficulty").innerHTML =
      S.gameId === "drawguess"
        ? `Difficulty: <b class="difficulty-${esc(S.settings.difficulty)}">${esc(S.settings.difficulty[0].toUpperCase() + S.settings.difficulty.slice(1))}</b>`
        : "";
    $("#room-game").textContent = G ? G.name : "Party";
    $("#room-vis").textContent = S.isPublic ? "Public" : "Private";
    $("#room-lock").hidden = !S.locked;
    $("#end-btn").hidden = !(isHost() && S.phase === "game");
    rulesBtn.hidden = !G;
    focusBtn.hidden = S.phase !== "game";
    if (S.phase !== "game" && focusMode) setFocus(false);
    document.title = `${S.phase === "game" && G ? G.name : S.name || "Your party"} | ${window.PAGE.site}`;
    renderPartyHead();
    if (phase === "game") renderPeople();
    renderStage();
    if (previousPhase !== phase)
      requestAnimationFrame(() => {
        const log = $("#chat-log");
        log.scrollTop = log.scrollHeight;
      });
    const ui = G && GameUI[S.gameId];
    const ph =
      S.phase === "game" && ui && ui.chatPlaceholder
        ? ui.chatPlaceholder(S)
        : null;
    $("#chat-input").placeholder =
      ph || (S.phase === "game" ? "Say something..." : "Message your party…");
    if ($("#picker")) renderPicker();
    if ($("#activity-sheet")) patch($("#activity-sheet"), activityHTML("sheet"));
    if (document.body.dataset.screen === "rooms") renderCurrentParty();

  }

  // ----- party header: identity, invite code, settings or leave -----
  let copiedTimer = null;
  function renderPartyHead() {
    $("#party-eyebrow").textContent =
      `YOUR PARTY · ${S.isPublic ? "PUBLIC" : "PRIVATE"}${S.locked ? " · LOCKED" : ""}`;
    $("#party-name").textContent = S.name || "Your party";
    if (!copiedTimer)
      $("#party-code").innerHTML = `<span>${esc(S.code)}</span>${icon("copy")}`;
    $("#party-code").setAttribute(
      "aria-label",
      `Party code ${S.code}. Copy invite link`,
    );
    $("#party-settings").hidden = !isHost();
    $("#party-leave").hidden = isHost();
  }
  $("#party-code").addEventListener("click", async () => {
    const b = $("#party-code");
    try {
      await navigator.clipboard.writeText(roomLink());
    } catch (e) {
      return prompt("Copy this link:", roomLink());
    }
    $("#party-copied").textContent = "Invite link copied.";
    b.innerHTML = `<span>Copied</span>${icon("check")}`;
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      copiedTimer = null;
      $("#party-copied").textContent = "";
      if (S) b.innerHTML = `<span>${esc(S.code)}</span>${icon("copy")}`;
    }, 2000);
  });
  $("#party-invite").addEventListener("click", shareParty);
  $("#party-settings").addEventListener("click", () => openPartySettings());
  $("#party-leave").addEventListener("click", leaveParty);
  function leaveParty() {
    if (!confirmLeave("Leave this party?")) return;
    closeModal();
    leaveRoom();
    nav("/");
  }

  // ----- game-phase roster (side panel) -----
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
    const label = GameUI[S.gameId].scoreLabel;
    return `<li class="person ${p.connected ? "" : "offline"} ${p.id === S.you ? "me" : ""}">
      ${avatarHTML(p.avatar)}
      <div class="pmain"><div class="pname">${esc(p.name)}${p.id === S.you ? " <small>(you)</small>" : ""}</div>
      ${spectator ? "" : `<div class="pscore"><span class="lobby-status">${p.id === S.hostId ? "(Host)" : p.connected ? "Connected" : "Reconnecting"}</span><span class="game-score">${p.score} ${p.score === 1 && label === "wins" ? "win" : label}</span></div>`}</div>
      <div class="picons">${icons.join("")}${p.connected ? "" : '<span title="Reconnecting">…</span>'}</div>${memberTools(p)}</li>`;
  }
  // Host: remove or hand over hosting. Public parties: anyone can start a vote kick.
  function memberTools(p) {
    if (p.id === S.you) return "";
    if (isHost())
      return (
        `<button class="kick" data-kick="${p.id}" data-k="kick-${p.id}" title="Remove ${esc(p.name)}" aria-label="Remove ${esc(p.name)} from the party">${icon("close")}</button>` +
        (p.connected
          ? `<button class="kick promote" data-promote="${p.id}" data-k="promote-${p.id}" title="Make ${esc(p.name)} the host" aria-label="Make ${esc(p.name)} the host">${icon("crown")}</button>`
          : "")
      );
    if (S.isPublic)
      return `<button class="kick" data-vote="${p.id}" data-k="vote-${p.id}" title="Vote to kick ${esc(p.name)}" aria-label="Vote to kick ${esc(p.name)}">${icon("exit")}</button>`;
    return "";
  }

  function renderPeople() {
    $("#player-count").textContent = `${S.players.length}/${S.maxPlayers}`;
    $("#spec-count").textContent = S.spectators.length
      ? `(${S.spectators.length})`
      : "";
    const sorted =
      S.gameId === "drawguess"
        ? [...S.players].sort((a, b) => b.score - a.score)
        : S.players;
    $("#player-list").innerHTML =
      sorted.map((p) => personHTML(p)).join("") ||
      '<li class="empty">Nobody seated</li>';
    $(".spectator-section").hidden = !S.spectators.length;
    $("#players-status").textContent =
      S.gameId === "drawguess" ? "Guessing…" : "";
    $("#spec-list").innerHTML =
      S.spectators.map((p) => personHTML(p, { spectator: true })).join("") ||
      '<li class="empty">Nobody watching</li>';
    $("#seat-action").innerHTML = seatControlsHTML();
  }
  // Take a seat, line up for one, or step out to watch. Same rules in the lobby and in a game.
  function seatControlsHTML() {
    const G = gameOfS();
    const midJoin = S.gameId === "drawguess";
    if (S.role === "spectator") {
      if (S.players.length < S.maxPlayers && (S.phase === "lobby" || midJoin))
        return '<button class="btn btn-small btn-wide" data-seat="take" data-k="seat">Take a Seat</button>';
      return `<p class="seat-note">You're watching. ${S.players.length >= S.maxPlayers ? `${G ? `${esc(G.name)} is ${S.maxPlayers} players max.` : "Every seat is taken."} Join the queue to get the next open seat.` : "You can take a seat when this match ends."}</p>${queueHTML()}`;
    }
    if (S.phase === "lobby")
      return '<button class="link-btn" data-seat="watch" data-k="seat">Just watch instead</button>';
    return "";
  }
  // Spectators line up for the next open seat; winner-stays games also rotate through this line.
  function queueHTML() {
    if (S.role !== "spectator") return "";
    const pos = S.queue.indexOf(S.you) + 1;
    return pos
      ? `<p class="seat-note queue-note">You're #${pos} in line to play.</p><button class="btn btn-small btn-ghost btn-wide" data-queue="0" data-k="queue">Leave the Queue</button>`
      : `<button class="btn btn-small btn-wide" data-queue="1" data-k="queue">Join the Queue</button>`;
  }
  document.addEventListener("click", (e) => {
    if (!S) return;
    const seat = e.target.closest("[data-seat]");
    if (seat) socket.emit(seat.dataset.seat === "take" ? "takeSeat" : "watch");
    const q = e.target.closest("[data-queue]");
    if (q) socket.emit("queue", q.dataset.queue === "1");
    const k = e.target.closest("[data-kick]");
    const v = e.target.closest("[data-vote]");
    const pr = e.target.closest("[data-promote]");
    if (pr) {
      const p = app.member(pr.dataset.promote);
      if (p && confirm(`Make ${p.name} the host? You'll stay in the party.`))
        socket.emit("transferHost", p.id);
      return;
    }
    if (k) {
      const p = app.member(k.dataset.kick);
      if (p && confirm(`Remove ${p.name} from the party?`))
        socket.emit("kick", p.id);
    }
    if (v) {
      const p = app.member(v.dataset.vote);
      if (p && confirm(`Vote to kick ${p.name}?`))
        socket.emit("voteKick", p.id);
    }
  });

  // ---------- stage: party hub or game ----------
  function unmountStage() {
    if (mounted && mounted.startsWith("game:"))
      GameUI[mounted.slice(5)].unmount();
    mounted = null;
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
          '<div class="lobby-stage"><div id="lobby-top"></div><div id="party-main"></div></div>';
      } else {
        GameUI[S.gameId].mount(stage, app);
      }
    }
    if (mode === "lobby") renderLobby();
    else GameUI[S.gameId].update(S, app);
  }

  // Next-game votes, most popular first.
  const voteList = () =>
    Object.entries(S.nextVotes || {})
      .filter(([id]) => GAMES[id])
      .sort((a, b) => b[1] - a[1]);
  function voteSummary() {
    return voteList()
      .map(([id, n]) => `${esc(GAMES[id].name)} ${n}`)
      .join(" · ");
  }

  const cap1 = (v) => String(v)[0].toUpperCase() + String(v).slice(1);
  const SUMMARY = {
    rounds: (v) => (v ? `${v} rounds` : "Classic"),
    questions: (v) => `${v} questions`,
    difficulty: cap1,
    drawTime: (v) => `${v} seconds`,
    roundTime: (v) => `${v}s per round`,
    clock: (v) => (v ? `${v} min clock` : "No clock"),
    bestOf: (v) => `Best of ${v}`,
    lives: (v) => `${v} lives`,
    size: (v) => `${v}×${v} board`,
    course: cap1,
    category: (v) => (v === "mixed" ? "Mixed topics" : v),
    turnTime: (v) => (v ? `${v}s turns` : "No turn timer"),
  };
  // A short "3 rounds · Medium · 80 seconds" line from the real settings.
  function settingsSummary() {
    if (!S.settings) return "";
    return Object.keys(SUMMARY)
      .filter((k) => k in S.settings)
      .slice(0, 3)
      .map((k) => SUMMARY[k](S.settings[k]))
      .join(" · ");
  }

  function rosterCardHTML(p) {
    const status = [];
    if (p.id === S.hostId) status.push("Host");
    status.push(
      !p.connected
        ? "Reconnecting"
        : p.ready
          ? `${icon("check")}Ready`
          : "Not ready",
    );
    return `<li class="roster-card ${p.id === S.you ? "me" : ""} ${p.connected ? "" : "offline"}">
      ${avatarHTML(p.avatar, "av-roster")}
      <b class="rname">${esc(p.name)}${p.id === S.you ? " <small>(you)</small>" : ""}</b>
      <span class="rstatus ${p.ready && p.connected ? "is-ready" : ""}">${status.join(" · ")}</span>
      <span class="roster-tools">${memberTools(p)}</span></li>`;
  }

  function gameSlotHTML() {
    const G = gameOfS();
    const host = isHost();
    if (!G)
      return `<div class="game-slot empty"><span class="slot-art slot-empty" aria-hidden="true">${icon("controller")}</span>
        <div class="slot-info"><b>No game yet</b><small>${host ? "Pick what to play once your people are here." : "The host picks the game. Suggest one meanwhile."}</small></div>
        <button class="btn" id="slot-choose" type="button">${host ? "Choose a Game" : "Suggest a Game"}</button></div>`;
    return `<div class="game-slot"><span class="slot-art">${G.art}</span>
      <div class="slot-info"><b>${esc(G.name)}</b><small>${rangeText(G)} · ${G.cat}</small><small>${esc(settingsSummary())}</small></div>
      <div class="slot-actions"><button class="btn btn-ghost btn-small" id="slot-rules" type="button">Rules</button><button class="btn btn-ghost" id="slot-change" type="button">${host ? "Change" : "Suggest"}</button></div></div>`;
  }

  // What the party is waiting on, in words.
  function lobbyStatus() {
    const G = gameOfS();
    const hostP = app.member(S.hostId);
    const hostName = hostP ? hostP.name : "the host";
    if (!G)
      return isHost()
        ? "Invite your people, then choose a game together."
        : `Waiting for ${esc(hostName)} to choose a game. Suggest one meanwhile.`;
    const short = G.min - S.players.length;
    if (short > 0)
      return `${esc(G.name)} needs ${G.min} players. Invite ${short} more${S.spectators.length ? " or take a seat" : ""}.`;
    const notReady = S.players.filter((p) => !p.ready);
    const waiting = !notReady.length
      ? "Everyone's ready."
      : notReady.length === 1
        ? `${esc(notReady[0].name)} is still getting ready.`
        : `${notReady.length} people are still getting ready.`;
    return isHost()
      ? `${waiting}${notReady.length ? " Host can start with current players." : ""}`
      : `${waiting} Waiting for ${esc(hostName)} to start.`;
  }

  function partyMainHTML(results) {
    const G = gameOfS();
    const mine = me();
    const ready = S.players.filter((p) => p.ready && p.connected).length;
    const buttons = [];
    if (S.role === "player" && mine)
      buttons.push(
        `<button class="btn btn-ghost" id="ready-btn" type="button" aria-pressed="${!!mine.ready}">${mine.ready ? icon("check") + "Ready" : "I'm Ready"}</button>`,
      );
    if (G)
      buttons.push(
        `<button class="btn btn-ghost" id="game-settings-btn" type="button" aria-haspopup="dialog">Game Settings</button>`,
      );
    if (isHost())
      buttons.push(
        `<button class="btn" id="lobby-start" type="button" ${!G || S.players.length < G.min ? "disabled" : ""}>Start Game</button>`,
      );
    return `<section class="party-panel card" aria-labelledby="people-title">
      <div class="panel-head"><h2 id="people-title">Your people <small>${S.players.length}/${S.maxPlayers}</small></h2><span class="ready-count">${ready} of ${S.players.length} ready</span></div>
      <ul class="party-roster">${S.players.map(rosterCardHTML).join("") || '<li class="empty">Nobody seated yet</li>'}</ul>
      ${gameSlotHTML()}
      ${S.role === "spectator" ? `<div class="mobile-seat seat-controls">${seatControlsHTML()}</div>` : ""}
      <div class="mobile-activity"><span>Watching · ${S.spectators.length}</span><button class="link-btn" id="open-activity" type="button" aria-haspopup="dialog">Queue &amp; votes ${icon("arrow")}</button></div>
      ${results ? "" : `<div class="party-actions"><p class="party-status" role="status">${lobbyStatus()}</p><div class="party-buttons">${buttons.join("")}</div></div>`}
    </section>`;
  }

  // Votes, the spectator queue and seat controls. Shown beside the lobby, or as a sheet on phones.
  function activityHTML(where = "panel") {
    const host = isHost();
    const sfx = where === "panel" ? "" : "-" + where;
    const votes = voteList();
    const voteRows = votes
      .map(([id, n]) => {
        const G = GAMES[id];
        const mineV = S.myVote === id;
        return `<li><span class="vote-name"><b>${esc(G.name)}</b> <small>${n} vote${n === 1 ? "" : "s"}</small></span><span class="vote-tools">${
          mineV
            ? `<button class="link-btn voted" data-unvote data-k="unvote${sfx}" type="button" aria-label="Undo your vote for ${esc(G.name)}">${icon("check")}Voted <span class="undo">Undo</span></button>`
            : `<button class="link-btn" data-vote-game="${id}" data-k="vote-${id}${sfx}" type="button" aria-label="Vote for ${esc(G.name)}">Vote</button>`
        }${host && id !== S.gameId ? `<button class="btn btn-small" data-confirm-game="${id}" data-k="confirm-${id}${sfx}" type="button" aria-label="Choose ${esc(G.name)}">Choose</button>` : ""}</span></li>`;
      })
      .join("");
    const watchers = S.spectators
      .map((p) => {
        const pos = S.queue.indexOf(p.id) + 1;
        return `<li class="${p.connected ? "" : "offline"}">${avatarHTML(p.avatar)}<span><b>${esc(p.name)}</b>${p.id === S.you ? " <small>(you)</small>" : ""} <small>· ${pos ? `Queue #${pos}` : "Watching"}${p.connected ? "" : " · Reconnecting"}</small></span>${memberTools(p)}</li>`;
      })
      .join("");
    return `<h2 id="activity-title${sfx}">Party activity</h2>
      <p class="eyebrow">UP NEXT</p>
      <h3>What should we play?</h3>
      <p class="muted">Anyone can suggest. The host confirms the next game.</p>
      <button class="btn btn-ghost btn-wide" data-suggest data-k="suggest${sfx}" type="button">${host ? "Choose a Game" : "Suggest a Game"}</button>
      ${votes.length ? `<ul class="vote-list">${voteRows}</ul>` : '<p class="muted small-note">No suggestions yet.</p>'}
      <h3 class="watch-title">Watching · ${S.spectators.length}</h3>
      ${watchers ? `<ul class="watch-list">${watchers}</ul>` : `<p class="muted small-note">${S.spectatorsOn ? "Nobody is watching." : "Spectators are off for this party."}</p>`}
      <div class="seat-controls">${S.phase === "lobby" ? seatControlsHTML() : ""}</div>
      <p class="muted activity-foot">Same room, next game.<br>Your people and chat stay here.</p>`;
  }

  // Shared post-game action bar. Only the host launches or confirms a game.
  function resultActionsHTML() {
    const G = gameOfS();
    const votes = voteSummary();
    const voteLine = votes
      ? `<p class="muted center vote-tally">Next-game votes: ${votes}</p>`
      : "";
    if (!isHost()) {
      const host = app.member(S.hostId);
      const mine = me();
      return `<div class="result-actions"><p class="muted center" role="status">Waiting for ${esc(host ? host.name : "the host")} to play again or pick another game.</p>
        <div class="result-buttons"><button class="btn btn-ghost" id="result-dismiss" type="button">Back to Lobby</button><button class="btn btn-ghost" id="result-vote" type="button" aria-haspopup="dialog">Vote for Next Game</button>${
          S.role === "player" && mine
            ? `<button class="btn" id="result-ready" type="button" aria-pressed="${!!mine.ready}">${mine.ready ? icon("check") + "Ready for Rematch" : "Ready for Rematch"}</button>`
            : ""
        }</div>${voteLine}${S.role === "spectator" && S.players.length >= S.maxPlayers ? queueHTML() : ""}</div>`;
    }
    const short = !G || S.players.length < G.min;
    return `<div class="result-actions"><p class="muted center">You're still in ${esc(S.name || "your party")}. What's next?</p>
      <div class="result-buttons"><button class="btn btn-ghost" id="result-lobby" type="button">Back to Lobby</button><button class="btn btn-ghost" id="result-choose" type="button" aria-haspopup="dialog">Choose Another Game</button><button class="btn" id="result-again" type="button" ${short ? "disabled" : ""}>Play Again</button></div>${short && G ? `<p class="muted center">Need ${G.min} active players to play ${esc(G.name)} again.</p>` : ""}${voteLine}</div>`;
  }

  let autoTimer = null;
  function renderLobby() {
    const results = showingResult();
    let top = "";
    if (S.autoStartIn !== null) {
      top += `<div class="banner">Next game starts in <b id="auto-n">${Math.ceil(S.autoStartIn / 1000)}</b>s${isHost() ? " (or start it now)" : ""}</div>`;
    }
    if (results) {
      top += `<div class="card result-card">${GameUI[S.lastResult.type].renderResult(S.lastResult, S, app)}${resultActionsHTML()}</div>`;
    }
    patch($("#lobby-top"), top);
    patch($("#party-main"), partyMainHTML(results));
    patch($("#party-activity"), activityHTML());
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
  }

  function openActivitySheet() {
    openModal(`<div id="activity-sheet" class="party-activity">${activityHTML("sheet")}</div><div class="modal-actions"><button class="btn" data-close>Done</button></div>`);
    $("#modal-body").classList.add("sheet-modal");
    $("#activity-sheet").dataset.html = activityHTML("sheet");
  }

  // One click handler for the hub, the activity panel and the activity sheet.
  document.addEventListener("click", (e) => {
    if (!S || !e.target.closest("#screen-room, #modal-body")) return;
    const t = (sel) => e.target.closest(sel);
    if (t("#lobby-start") || t("#result-again")) socket.emit("startGame");
    else if (t("#ready-btn") || t("#result-ready")) {
      const mine = me();
      if (mine) socket.emit("setReady", !mine.ready);
    } else if (t("#game-settings-btn")) openGameSettings();
    else if (t("#slot-rules")) openRules(S.gameId);
    else if (t("#slot-choose") || t("#slot-change") || t("[data-suggest]") || t("#result-choose") || t("#result-vote"))
      openPicker();
    else if (t("#open-activity")) openActivitySheet();
    else if (t("#result-lobby")) socket.emit("backToLobby");
    else if (t("#result-dismiss")) {
      dismissedResult = resultKey(S.lastResult);
      renderRoom();
      $("#ready-btn")?.focus();
    } else if (t("[data-unvote]")) socket.emit("voteNext", null);
    else if (t("[data-vote-game]")) socket.emit("voteNext", t("[data-vote-game]").dataset.voteGame);
    else if (t("[data-confirm-game]") && isHost()) {
      const id = t("[data-confirm-game]").dataset.confirmGame;
      if ($("#activity-sheet")) closeModal();
      switchGame(id);
    }
  });

  // ---------- game picker: Choose a Game / Choose Another Game / Suggest a Game ----------
  let picker = null;
  function openPicker(preselect) {
    if (!S) return;
    const host = isHost();
    const start =
      preselect && GAMES[preselect] && !HIDDEN.has(preselect)
        ? preselect
        : host
          ? S.gameId
          : S.myVote;
    picker = { sel: start || null, q: "", cat: "All", host };
    const title = !host
      ? "Suggest a Game"
      : S.lastResult
        ? "Choose Another Game"
        : "Choose a Game";
    const n = S.players.length;
    const w = S.spectators.length;
    openModal(`<div class="picker" id="picker">
      <h2 class="card-title">${title}</h2>
      <p class="muted">For your party · ${n} player${n === 1 ? "" : "s"}${w ? `, ${w} spectator${w === 1 ? "" : "s"}` : ""}. ${host ? "Same room, same people, same chat." : "Suggestions never replace the host's choice."}</p>
      <label class="search-field"><span class="sr-only">Search games</span><input id="picker-search" type="search" placeholder="Search by name or category…" autocomplete="off" aria-controls="picker-grid"></label>
      <div class="chips" id="picker-chips" role="group" aria-label="Filter games"></div>
      <p class="sr-only" id="picker-count" role="status" aria-live="polite"></p>
      <div class="pick-grid" id="picker-grid"></div>
      <div class="no-match" id="picker-empty" hidden><h3>No matches</h3><p class="muted" id="picker-empty-text"></p><button class="btn btn-ghost" type="button" id="picker-clear">Clear Search</button></div>
    </div>
    <div class="modal-actions picker-actions"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn" id="picker-go" type="button" disabled>Choose Game</button></div>`);
    $("#modal-body").classList.add("picker-modal");
    renderPicker();
    $("#picker-search").addEventListener("input", (e) => {
      picker.q = e.target.value;
      renderPicker();
    });
    $("#picker-chips").addEventListener("click", (e) => {
      const c = e.target.closest("[data-filter]");
      if (!c) return;
      picker.cat = c.dataset.filter;
      renderPicker();
    });
    $("#picker-clear").addEventListener("click", () => {
      picker.q = "";
      picker.cat = "All";
      $("#picker-search").value = "";
      renderPicker();
      $("#picker-search").focus();
    });
    $("#picker-grid").addEventListener("click", (e) => {
      const b = e.target.closest("[data-pickgame]");
      if (!b || b.disabled) return;
      picker.sel = b.dataset.pickgame;
      renderPicker();
    });
    $("#picker-grid").addEventListener("dblclick", (e) => {
      if (e.target.closest("[data-pickgame]:not(:disabled)")) confirmPick();
    });
    $("#picker-go").addEventListener("click", confirmPick);
    const sel = $("#picker-grid .pick-card.on");
    (sel || $("#picker-search")).focus();
    if (sel) sel.scrollIntoView({ block: "nearest" });
  }

  // Why a game can or can't be chosen, in words (never colour alone).
  function eligibility(g) {
    const n = S.players.length + S.spectators.length;
    if (n > g.max && !S.spectatorsOn)
      return { ok: false, text: `Seats ${g.max}. Allow spectators to bring all ${n}.` };
    if (n > g.max) return { ok: true, text: `${g.max} play, ${n - g.max} watch` };
    if (n < g.min) return { ok: true, text: `Needs ${g.min}+ · invite ${g.min - n} more` };
    return { ok: true, text: "" };
  }
  function renderPicker() {
    if (!picker || !$("#picker")) return;
    const all = pickable();
    patch($("#picker-chips"), chipsHTML(picker, all.length));
    const list = filterGames(picker);
    const html = list
      .map(([id, g]) => {
        const el = eligibility(g);
        const on = picker.sel === id;
        const votes = S.nextVotes && S.nextVotes[id];
        const notes = [
          id === S.gameId ? "Current game" : "",
          votes ? `${votes} vote${votes > 1 ? "s" : ""}` : "",
          el.text,
        ].filter(Boolean);
        return `<button type="button" class="pick-card ${on ? "on" : ""}" data-pickgame="${id}" data-k="pick-${id}" aria-pressed="${on}" ${el.ok ? "" : "disabled"}>
          <span class="pick-art">${g.art}</span>
          <span class="pick-text"><b>${esc(g.name)}</b><small>${rangeText(g)} · ${g.cat}${notes.length ? " · " + notes.map(esc).join(" · ") : ""}</small></span>
          <span class="pick-check" aria-hidden="true">${on ? icon("check") : ""}</span></button>`;
      })
      .join("");
    patch($("#picker-grid"), html);
    $("#picker-empty").hidden = list.length > 0;
    $("#picker-empty-text").textContent = picker.q.trim()
      ? `No games match “${picker.q.trim()}”.`
      : "No games in this filter fit right now.";
    $("#picker-count").textContent = `${list.length} game${list.length === 1 ? "" : "s"} shown`;
    const G = picker.sel ? GAMES[picker.sel] : null;
    const go = $("#picker-go");
    const ok = G && eligibility(G).ok;
    go.disabled = !ok || (picker.host && picker.sel === S.gameId && !S.lastResult);
    go.textContent = !G
      ? picker.host
        ? "Choose Game"
        : "Suggest to Party"
      : picker.host
        ? picker.sel === S.gameId
          ? `Keep ${G.name}`
          : `Choose ${G.name}`
        : `Suggest ${G.name}`;
  }
  function confirmPick() {
    if (!picker || !picker.sel || $("#picker-go").disabled) return;
    const id = picker.sel;
    const host = picker.host && isHost();
    closeModal();
    picker = null;
    if (!host) {
      socket.emit("voteNext", id);
      return toast(`You suggested ${GAMES[id].name}. The host decides.`);
    }
    if (id === S.gameId) {
      // Keeping the same game after a match just puts the results away.
      if (S.lastResult) socket.emit("backToLobby");
      return;
    }
    switchGame(id);
  }

  function switchGame(gameId) {
    const G = GAMES[gameId];
    if (S.players.length <= G.max)
      return socket.emit("switchGame", { game: gameId });
    const total = S.players.length + S.spectators.length;
    openModal(`
      <h2 class="card-title">${G.name} is ${G.max} players max</h2>
      <p>There are ${total} people here. ${G.max} will play and ${total - G.max} will spectate. Nobody is removed from the party, and spectators can take a seat when one opens. Pick who plays:</p>
      <div class="pick-list">${S.players.map((p) => `<label class="pick"><input type="checkbox" value="${p.id}">${avatarHTML(p.avatar)} ${esc(p.name)}</label>`).join("")}</div>
      <p class="muted" id="pick-count" role="status">0/${G.max} picked</p>
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

  // ---------- party settings (host) ----------
  function openPartySettings() {
    if (!S) return;
    const host = isHost();
    openModal(`<h2 class="card-title">Party Settings</h2>
      <p class="muted">${host ? "Who can join and who can watch. Your people and chat stay the same." : "Your host controls the party settings."}</p>
      <fieldset class="create-form party-form" ${host ? "" : "disabled"}>
        <fieldset class="vis-choice"><legend class="sr-only">Who can join</legend>
          <label class="vis-option"><input type="radio" name="p-vis" value="0" ${S.isPublic ? "" : "checked"}><span><b>Private</b><small>Only people with your invite can join.</small></span></label>
          <label class="vis-option"><input type="radio" name="p-vis" value="1" ${S.isPublic ? "checked" : ""}><span><b>Public</b><small>Let others find your party in Rooms.</small></span></label>
        </fieldset>
        <label class="switch-row"><span>Allow spectators</span><input type="checkbox" role="switch" id="p-spec" ${S.spectatorsOn ? "checked" : ""}></label>
        <label class="field"><span>Max spectators</span><select id="p-maxspec">${[0, 5, 10, 20, 50].map((v) => opt(v, S.maxSpectators)).join("")}</select></label>
        <label class="switch-row"><span>Lock party <small>No new people can join</small></span><input type="checkbox" role="switch" id="p-lock" ${S.locked ? "checked" : ""}></label>
      </fieldset>
      <div class="modal-actions"><button class="btn btn-ghost btn-danger" id="p-leave" type="button">Leave Party</button><span class="grow"></span><button class="btn btn-ghost" data-close>Cancel</button>${host ? '<button class="btn" id="p-save" type="button">Save</button>' : ""}</div>`);
    $("#p-leave").addEventListener("click", leaveParty);
    $("#p-save")?.addEventListener("click", () => {
      if (!isHost()) return closeModal();
      socket.emit("hostUpdate", {
        isPublic: $('[name="p-vis"]:checked').value === "1",
        spectatorsOn: $("#p-spec").checked,
        maxSpectators: Number($("#p-maxspec").value),
        locked: $("#p-lock").checked,
      });
      closeModal();
      toast("Party settings saved.");
    });
  }

  // ---------- start ----------
  route();
})();
