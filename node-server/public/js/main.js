// App shell: home, lobby browser, create/join, lobby screen, chat.
// Each game's own screen lives in /js/games/*.js.
(() => {
  // Must match AVATAR_EMOJIS / AVATAR_COLORS in server/config.js
  const EMOJIS = ['🐶', '🐱', '🦊', '🐼', '🐸', '🐵', '🦁', '🐯', '🐨', '🐷', '🐙', '🦄', '🐧', '🐢', '🦖', '👽', '🤖', '👻', '🎃', '🐝', '🦉', '🐳', '🍕', '🌵'];
  const COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7', '#748ffc', '#b197fc', '#f783ac', '#ced4da'];

  const GAMES = {
    drawguess: {
      name: 'Draw & Guess', slug: 'draw-and-guess', min: 2, max: 12, players: '2-12 players',
      blurb: 'One person draws, everyone else races to guess the word in chat. Faster guesses score more.',
      art: '<svg viewBox="0 0 120 80" aria-hidden="true"><rect x="6" y="6" width="108" height="68" rx="8" fill="#fff" stroke="#1d1b3a" stroke-width="3"/><path d="M22 58c10-22 22-30 34-18s20 10 30-10" fill="none" stroke="#ff6b6b" stroke-width="5" stroke-linecap="round"/><circle cx="86" cy="26" r="9" fill="#ffd23f" stroke="#1d1b3a" stroke-width="3"/><path d="M96 66l14-14 6 6-14 14z" fill="#4dabf7" stroke="#1d1b3a" stroke-width="3"/></svg>',
    },
    fourrow: {
      name: '4 in a Row', slug: 'four-in-a-row', min: 2, max: 2, players: '2 players + spectators',
      blurb: 'Drop discs into the board and line up four in a row before your opponent does.',
      art: '<svg viewBox="0 0 120 80" aria-hidden="true"><rect x="14" y="8" width="92" height="66" rx="10" fill="#4dabf7" stroke="#1d1b3a" stroke-width="3"/>' +
        [0, 1, 2].map((r) => [0, 1, 2, 3, 4].map((c) => {
          const fill = (r === 2 && c < 4) ? '#ff6b6b' : (r === 1 && c === 1) || (r === 2 && c === 4) ? '#ffd23f' : '#fff';
          return `<circle cx="${30 + c * 15}" cy="${24 + r * 18}" r="6" fill="${fill}" stroke="#1d1b3a" stroke-width="2"/>`;
        }).join('')).join('') + '</svg>',
    },
  };

  const SOON = [['Chess', '2 players'], ['Checkers', '2 players'], ['Imposter', '4-10 players'], ['Word Bomb', '2-12 players'], ['Crazy Eights', '2-6 players'], ['Sea Battle', '2 players'], ['Ludo', '2-4 players'], ['Reversi', '2 players'], ['Mancala', '2 players'], ['Dots & Boxes', '2-4 players']];

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rand = (n) => Math.floor(Math.random() * n);

  // ---------- profile + tab token ----------
  const ADJ = ['Happy', 'Sneaky', 'Bouncy', 'Sleepy', 'Brave', 'Fuzzy', 'Spicy', 'Lucky', 'Wobbly', 'Zippy', 'Cosmic', 'Silly'];
  const NOUN = ['Fox', 'Panda', 'Taco', 'Otter', 'Pickle', 'Comet', 'Noodle', 'Penguin', 'Waffle', 'Gecko', 'Muffin', 'Robot'];
  function loadProfile() {
    try {
      const p = JSON.parse(localStorage.getItem('pg_profile'));
      if (p && typeof p.name === 'string' && p.avatar) return p;
    } catch (e) { /* first visit */ }
    return { name: ADJ[rand(ADJ.length)] + NOUN[rand(NOUN.length)], avatar: { e: rand(EMOJIS.length), c: rand(COLORS.length) } };
  }
  const profile = loadProfile();
  const saveProfile = () => localStorage.setItem('pg_profile', JSON.stringify(profile));
  saveProfile();

  let token = sessionStorage.getItem('pg_token');
  if (!token || !/^[a-f0-9]{32}$/.test(token)) {
    token = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem('pg_token', token);
  }

  const avatarHTML = (a, cls = '') => `<span class="avatar ${cls}" style="--av:${COLORS[a.c] || COLORS[0]}">${EMOJIS[a.e] || EMOJIS[0]}</span>`;

  function renderProfiles() {
    $$('[data-profile]').forEach((el) => {
      el.innerHTML = `
        <div class="avatar-pick">
          <button class="arrow" type="button" data-av="-1" aria-label="Previous avatar">‹</button>
          ${avatarHTML(profile.avatar, 'av-xl')}
          <button class="arrow" type="button" data-av="1" aria-label="Next avatar">›</button>
        </div>
        <div class="color-row">${COLORS.map((c, i) => `<button type="button" class="dot ${i === profile.avatar.c ? 'on' : ''}" style="--av:${c}" data-color="${i}" aria-label="Color ${i + 1}"></button>`).join('')}</div>
        <div class="name-row">
          <input class="name-input" maxlength="16" placeholder="Your name" value="${esc(profile.name)}" aria-label="Your name">
          <button type="button" class="icon-btn dice" title="Random name and avatar" aria-label="Randomize">🎲</button>
        </div>`;
    });
  }
  document.addEventListener('click', (e) => {
    const av = e.target.closest('[data-av]');
    const col = e.target.closest('[data-color]');
    const dice = e.target.closest('.dice');
    if (!av && !col && !dice) return;
    if (av) profile.avatar.e = (profile.avatar.e + Number(av.dataset.av) + EMOJIS.length) % EMOJIS.length;
    if (col) profile.avatar.c = Number(col.dataset.color);
    if (dice) {
      profile.avatar = { e: rand(EMOJIS.length), c: rand(COLORS.length) };
      profile.name = ADJ[rand(ADJ.length)] + NOUN[rand(NOUN.length)];
    }
    saveProfile();
    renderProfiles();
  });
  document.addEventListener('input', (e) => {
    if (!e.target.classList.contains('name-input')) return;
    profile.name = e.target.value.slice(0, 16);
    saveProfile();
    $$('.name-input').forEach((i) => { if (i !== e.target) i.value = profile.name; });
  });

  // ---------- small UI helpers ----------
  let toastTimer = null;
  function toast(text) {
    const t = $('#toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3800);
  }
  function openModal(html) {
    $('#modal-body').innerHTML = html;
    $('#modal').hidden = false;
  }
  function closeModal() { $('#modal').hidden = true; $('#modal-body').innerHTML = ''; }
  $('#modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal' || e.target.closest('[data-close]')) closeModal();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

  function showScreen(name) {
    $$('.screen').forEach((s) => { s.hidden = s.id !== 'screen-' + name; });
    document.body.dataset.screen = name;
    window.scrollTo(0, 0);
  }

  const soundBtn = $('#sound-btn');
  soundBtn.textContent = Sound.muted ? '🔇' : '🔊';
  soundBtn.addEventListener('click', () => { soundBtn.textContent = Sound.toggle() ? '🔇' : '🔊'; });

  // ---------- socket ----------
  const socket = io();
  let S = null;            // latest lobby state from the server
  let currentCode = null;  // lobby we're in
  let mounted = null;      // what the stage is showing
  let lastResultKey = null;

  const app = {
    socket, esc, avatarHTML, toast,
    get S() { return S; },
    member: (id) => S && (S.players.find((p) => p.id === id) || S.spectators.find((p) => p.id === id)),
  };
  window.App = app;

  const connEl = $('#conn');
  const setConn = (up) => { connEl.hidden = up; connEl.className = 'conn' + (up ? '' : ' off'); };
  socket.on('connect', () => {
    setConn(true);
    if (currentCode) join(currentCode, { silent: true });
  });
  socket.on('disconnect', () => setConn(false));
  socket.io.on('reconnect_attempt', () => setConn(false));
  socket.on('state', (s) => {
    if (!currentCode || s.code !== currentCode) return;
    S = s;
    renderRoom();
  });
  socket.on('chat', addChat);
  socket.on('chatHistory', (list) => { $('#chat-log').innerHTML = ''; list.forEach((m) => addChat(m, true)); });
  socket.on('notice', toast);
  socket.on('kicked', () => { leaveLocal(); showMessage('kicked'); });
  socket.on('replaced', () => { leaveLocal(); showMessage('replaced'); });
  socket.on('draw', (d) => GameUI.drawguess.onDraw(d));
  socket.on('canvas', (d) => GameUI.drawguess.onCanvas(d));

  // ---------- routing ----------
  function nav(path) {
    history.pushState({}, '', path);
    route();
  }
  function route() {
    const m = location.pathname.match(/^\/r\/([A-Za-z0-9]{4,8})\/?$/);
    if (m) {
      const code = m[1].toUpperCase();
      if (currentCode === code) return showScreen('room');
      if (currentCode) leaveRoom();
      return showJoin(code);
    }
    if (currentCode) leaveRoom();
    showHome();
  }
  window.addEventListener('popstate', route);
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-nav]');
    if (!a) return;
    e.preventDefault();
    closeModal();
    nav(a.dataset.nav);
  });

  // ---------- home ----------
  let lobbyTimer = null;
  function showHome() {
    showScreen('home');
    renderProfiles();
    renderGames();
    $('#soon-grid').innerHTML = SOON.map(([n, p]) => `<div class="soon"><b>${n}</b><small>${p} · Soon</small></div>`).join('');
    $('#lobby-list').innerHTML = '<p class="empty-state">Loading lobbies...</p>';
    loadLobbies();
    clearInterval(lobbyTimer);
    lobbyTimer = setInterval(() => { if (document.body.dataset.screen === 'home') loadLobbies(); }, 6000);
    const slugGame = Object.keys(GAMES).find((g) => location.pathname === '/' + GAMES[g].slug) || window.PAGE.game;
    if (slugGame) {
      const card = $(`.game-card[data-game="${slugGame}"]`);
      if (card) { card.classList.add('featured'); card.scrollIntoView({ block: 'center' }); }
    }
  }

  function renderGames() {
    $('#games').innerHTML = Object.entries(GAMES).map(([id, g]) => `
      <article class="card game-card" data-game="${id}">
        <div class="game-art">${g.art}</div>
        <div class="game-info">
          <h2><a href="/${g.slug}" data-nav="/${g.slug}">${g.name}</a></h2>
          <p class="game-players">${g.players}</p>
          <p>${g.blurb}</p>
          <div class="game-actions">
            <button class="btn" data-quick="${id}">Quick Play</button>
            <button class="btn btn-ghost" data-create="${id}">Create Lobby</button>
          </div>
        </div>
      </article>`).join('');
  }
  $('#games').addEventListener('click', (e) => {
    const q = e.target.closest('[data-quick]');
    const c = e.target.closest('[data-create]');
    if (q) quickPlay(q.dataset.quick);
    if (c) openCreate(c.dataset.create);
  });

  async function loadLobbies() {
    const el = $('#lobby-list');
    try {
      const list = await (await fetch('/api/rooms')).json();
      if (!list.length) {
        el.innerHTML = '<p class="empty-state">No public lobbies right now. Hit Quick Play to start one, or create a private lobby for your friends.</p>';
        return;
      }
      el.innerHTML = `<table class="lobby-table"><thead><tr><th>Game</th><th>Host</th><th>Players</th><th>Watching</th><th>Status</th><th></th></tr></thead><tbody>${list.map((r) => {
        const seatOpen = r.players < r.max && (r.phase === 'lobby' || r.gameId === 'drawguess');
        let btn;
        if (r.locked) btn = '<button class="btn btn-small" disabled>🔒 Locked</button>';
        else if (seatOpen) btn = `<button class="btn btn-small" data-join="${r.code}">Join</button>`;
        else if (r.spectatorsOn) btn = `<button class="btn btn-small btn-ghost" data-join="${r.code}">Watch</button>`;
        else btn = '<button class="btn btn-small" disabled>Full</button>';
        return `<tr><td><span class="game-pill small">${esc(r.gameName)}</span></td><td>${esc(r.host)}</td><td>${r.players}/${r.max}</td><td>${r.spectators}</td><td>${r.phase === 'game' ? 'Playing' : 'In lobby'}</td><td>${btn}</td></tr>`;
      }).join('')}</tbody></table>`;
    } catch (e) {
      el.innerHTML = '<p class="empty-state">Could not load lobbies. Check your connection and hit Refresh.</p>';
    }
  }
  $('#refresh-btn').addEventListener('click', loadLobbies);
  $('#lobby-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-join]');
    if (b) join(b.dataset.join);
  });
  $('#code-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = $('#code-input').value.trim().toUpperCase().replace(/.*\/R\//, '');
    if (/^[A-Z0-9]{4,8}$/.test(code)) join(code);
    else toast('That code does not look right.');
  });

  // ---------- settings forms (used by Create Lobby and the host panel) ----------
  const opt = (v, cur, label = v) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${label}</option>`;
  function settingsHTML(gameId, s) {
    if (gameId === 'drawguess') {
      return `
        <label class="field"><span>Rounds</span><select data-setting="rounds">${[1, 2, 3, 4, 5, 6, 8, 10].map((v) => opt(v, s.rounds)).join('')}</select></label>
        <label class="field"><span>Draw time</span><select data-setting="drawTime">${[30, 45, 60, 80, 100, 120, 150, 180, 240, 300].map((v) => opt(v, s.drawTime, v + 's')).join('')}</select></label>
        <label class="field"><span>Word difficulty</span><select data-setting="difficulty">${[['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard'], ['mixed', 'Mixed']].map(([v, l]) => opt(v, s.difficulty, l)).join('')}</select></label>
        <label class="check"><input type="checkbox" data-setting="hints" ${s.hints ? 'checked' : ''}><span>Letter hints</span></label>
        <label class="field field-wide"><span>Custom words <small>(comma separated)</small></span><textarea data-setting="customWords" rows="2" maxlength="3000" placeholder="inside joke, your teacher, pizza party">${esc(s.customWords)}</textarea></label>
        <label class="check"><input type="checkbox" data-setting="customOnly" ${s.customOnly ? 'checked' : ''}><span>Use only custom words <small>(needs 6+ words)</small></span></label>`;
    }
    return `
      <label class="field"><span>Turn timer</span><select data-setting="turnTime">${[[0, 'Off'], [15, '15s'], [30, '30s'], [60, '60s']].map(([v, l]) => opt(v, s.turnTime, l)).join('')}</select></label>
      <label class="check"><input type="checkbox" data-setting="winnerStays" ${s.winnerStays ? 'checked' : ''}><span>Winner stays <small>(loser swaps with the next spectator)</small></span></label>`;
  }
  function readSettings(el) {
    const out = {};
    $$('[data-setting]', el).forEach((i) => {
      const k = i.dataset.setting;
      out[k] = i.type === 'checkbox' ? i.checked : i.tagName === 'SELECT' && k !== 'difficulty' ? Number(i.value) : i.value;
    });
    return out;
  }
  const DEFAULTS = {
    drawguess: { rounds: 3, drawTime: 80, hints: true, difficulty: 'medium', customWords: '', customOnly: false },
    fourrow: { turnTime: 30, winnerStays: true },
  };

  // ---------- create lobby ----------
  function openCreate(gameId) {
    const draw = (g) => {
      const G = GAMES[g];
      openModal(`
        <h2 class="card-title">Create a lobby</h2>
        <div class="tiles">${Object.entries(GAMES).map(([id, x]) => `<button type="button" class="tile ${id === g ? 'on' : ''}" data-pick="${id}">${x.art}<b>${x.name}</b></button>`).join('')}</div>
        <div class="form-grid" id="create-form">
          <label class="field"><span>Who can join</span><select id="c-public">${opt(0, 0, 'Private (link only)')}${opt(1, 0, 'Public (listed)')}</select></label>
          <label class="field"><span>Max players</span>${G.min === G.max ? `<select disabled><option>${G.max}</option></select>` : `<select id="c-max">${Array.from({ length: G.max - G.min + 1 }, (_, i) => G.min + i).map((v) => opt(v, G.max)).join('')}</select>`}</label>
          <label class="check"><input type="checkbox" id="c-spec" checked><span>Allow spectators</span></label>
          <label class="field"><span>Max spectators</span><select id="c-maxspec">${[5, 10, 20, 50].map((v) => opt(v, 20)).join('')}</select></label>
          ${settingsHTML(g, DEFAULTS[g])}
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-close>Cancel</button>
          <button class="btn btn-big" id="c-go">Create lobby</button>
        </div>`);
      $$('[data-pick]').forEach((b) => b.addEventListener('click', () => draw(b.dataset.pick)));
      $('#c-go').addEventListener('click', () => {
        const form = $('#create-form');
        const opts = {
          game: g,
          isPublic: $('#c-public').value === '1',
          maxPlayers: $('#c-max') ? Number($('#c-max').value) : G.max,
          spectatorsOn: $('#c-spec').checked,
          maxSpectators: Number($('#c-maxspec').value),
          settings: readSettings(form),
          profile, token,
        };
        socket.emit('createRoom', opts, (res) => {
          closeModal();
          handleJoin(res);
        });
      });
    };
    draw(gameId);
  }

  function quickPlay(gameId) {
    socket.emit('quickPlay', { game: gameId, profile, token }, handleJoin);
  }

  // ---------- join ----------
  function showJoin(code) {
    showScreen('join');
    $('#join-code').textContent = code;
    renderProfiles();
    $('#join-btn').onclick = () => join(code);
  }

  function join(code, { silent } = {}) {
    socket.emit('joinRoom', { code, profile, token }, (res) => handleJoin(res, silent));
  }

  function handleJoin(res, silent) {
    if (!res || res.error) {
      if (silent && currentCode) leaveLocal();
      return showMessage(res ? res.error : 'closed', res);
    }
    const fresh = currentCode !== res.code;
    currentCode = res.code;
    if (location.pathname !== '/r/' + res.code) history.pushState({}, '', '/r/' + res.code);
    if (fresh) {
      S = null;
      mounted = null;
      lastResultKey = null;
      $('#stage').innerHTML = '<div class="card loading">Loading lobby...</div>';
      if (!res.rejoined) $('#chat-log').innerHTML = '';
    }
    showScreen('room');
    if (res.notice) toast(res.notice);
  }

  function leaveLocal() {
    currentCode = null;
    S = null;
    unmountStage();
  }
  function leaveRoom() {
    socket.emit('leaveRoom');
    leaveLocal();
  }
  $('#leave-btn').addEventListener('click', () => { leaveRoom(); nav('/'); });
  $('#end-btn').addEventListener('click', () => { if (confirm('End the game for everyone and go back to the lobby?')) socket.emit('endGame'); });

  function showMessage(kind, info = {}) {
    const gname = info && info.gameName ? info.gameName : 'game';
    const gid = info && info.gameId;
    const M = {
      closed: ['🚪', 'This lobby has closed', 'Everyone left, so the lobby was closed.', [['Start a new lobby', 'create'], ['Back home', 'home']]],
      locked: ['🔒', 'This lobby is locked', 'The host locked it, so no new people can join right now.', [['Create your own lobby', 'create'], ['Find another lobby', 'home']]],
      full: ['🙅', 'This lobby is full', `This lobby is full (${info.players || 0}/${info.max || 0} players) and isn't taking spectators.`, [[`Create your own ${gname} lobby`, 'create'], ['Find another lobby', 'home']]],
      kicked: ['👋', 'You were removed', 'The host or the other players removed you from this lobby.', [['Back home', 'home']]],
      replaced: ['🪟', 'Opened somewhere else', 'This lobby was opened in another tab or window, so this one disconnected.', [['Back home', 'home']]],
      slow: ['⏳', 'Slow down a little', 'Too many tries in a row. Wait a few seconds and try again.', [['Back home', 'home']]],
      busy: ['🛠️', 'The server is busy', 'Try again in a minute.', [['Back home', 'home']]],
    };
    const [icon, title, text, actions] = M[kind] || M.closed;
    $('#msg-icon').textContent = icon;
    $('#msg-title').textContent = title;
    $('#msg-text').textContent = text;
    $('#msg-actions').innerHTML = actions.map(([label, act], i) => `<button class="btn ${i ? 'btn-ghost' : ''}" data-act="${act}">${esc(label)}</button>`).join('');
    $('#msg-actions').onclick = (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      history.pushState({}, '', '/');
      showHome();
      if (b.dataset.act === 'create') openCreate(gid || 'drawguess');
    };
    showScreen('message');
  }

  // ---------- chat ----------
  function addChat(m, quiet) {
    const log = $('#chat-log');
    const near = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
    const div = document.createElement('div');
    if (m.kind === 'sys') {
      div.className = 'msg sys sys-' + (m.style || 'info');
      div.textContent = m.text;
    } else {
      div.className = 'msg' + (m.hidden ? ' msg-hidden' : '') + (S && m.id === S.you ? ' msg-me' : '');
      div.innerHTML = `<b>${m.spectator ? '👀 ' : ''}${esc(m.name)}:</b> ${esc(m.text)}`;
    }
    log.appendChild(div);
    while (log.children.length > 150) log.firstChild.remove();
    if (near || quiet) log.scrollTop = log.scrollHeight;
    if (!quiet && m.sound) Sound.play(m.sound);
  }
  $('#chat-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const i = $('#chat-input');
    const text = i.value.trim();
    if (!text) return;
    socket.emit('chat', text);
    i.value = '';
  });

  // ---------- sharing ----------
  const roomLink = () => `${location.origin}/r/${currentCode}`;
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(roomLink());
      toast('Link copied. Send it to your friends!');
    } catch (e) {
      prompt('Copy this link:', roomLink());
    }
  }
  $('#copy-link').addEventListener('click', async () => {
    const b = $('#copy-link'), t = b.textContent;
    await copyLink();
    b.textContent = '✓ Copied';
    setTimeout(() => { b.textContent = t; }, 1500);
  });
  $('#room-code').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(currentCode); toast('Room code ' + currentCode + ' copied'); } catch (e) { toast('Room code: ' + currentCode); }
  });
  $('#share-link').addEventListener('click', async () => {
    const text = `Come play ${S ? GAMES[S.gameId].name : 'with me'}!`;
    if (navigator.share) {
      try { await navigator.share({ title: window.PAGE.site, text, url: roomLink() }); return; } catch (e) { /* closed */ }
    }
    const url = encodeURIComponent(roomLink());
    openModal(`
      <h2 class="card-title">Invite friends</h2>
      <div class="share-box"><input readonly value="${esc(roomLink())}"><button class="btn btn-small" id="m-copy">Copy</button></div>
      <div class="share-row">
        <a class="btn btn-ghost" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(text + ' ')}${url}">WhatsApp</a>
        <a class="btn btn-ghost" href="sms:?&body=${encodeURIComponent(text + ' ')}${url}">Text</a>
        <a class="btn btn-ghost" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}">X</a>
      </div>
      <p class="muted">For Discord, copy the link and paste it in your server or DM.</p>
      <div class="modal-actions"><button class="btn" data-close>Done</button></div>`);
    $('#m-copy').addEventListener('click', copyLink);
  });

  // ---------- room ----------
  const isHost = () => S && S.hostId === S.you;
  const me = () => app.member(S.you);

  function renderRoom() {
    if (!S) return;
    if (document.body.dataset.screen !== 'room') showScreen('room');
    const G = GAMES[S.gameId];
    $('#room-game').textContent = G.name;
    $('#room-vis').textContent = S.isPublic ? 'Public' : 'Private';
    $('#room-lock').hidden = !S.locked;
    $('#room-code').textContent = S.code;
    $('#end-btn').hidden = !(isHost() && S.phase === 'game');
    document.title = `${G.name} lobby | ${window.PAGE.site}`;
    renderPeople();
    renderStage();
    const ui = GameUI[S.gameId];
    const ph = S.phase === 'game' && ui.chatPlaceholder ? ui.chatPlaceholder(S) : null;
    $('#chat-input').placeholder = ph || 'Say something...';

    if (S.lastResult) {
      const key = JSON.stringify(S.lastResult).length + ':' + (S.lastResult.winnerId || '') + ':' + S.lastResult.type;
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
    if (p.id === S.hostId) icons.push('<span title="Host">👑</span>');
    if (g && S.gameId === 'drawguess' && g.drawerId === p.id) icons.push('<span title="Drawing">✏️</span>');
    if (g && S.gameId === 'drawguess' && g.guessed && g.guessed.includes(p.id)) icons.push('<span title="Guessed it">✅</span>');
    if (g && S.gameId === 'fourrow') {
      const i = g.players.findIndex((x) => x.id === p.id);
      if (i >= 0) icons.push(`<span class="mini-disc d${i + 1}" title="${i ? 'Yellow' : 'Red'}"></span>`);
    }
    let kick = '';
    if (p.id !== S.you) {
      if (isHost()) kick = `<button class="kick" data-kick="${p.id}" title="Kick ${esc(p.name)}" aria-label="Kick">✕</button>`;
      else if (S.isPublic) kick = `<button class="kick" data-vote="${p.id}" title="Vote to kick ${esc(p.name)}" aria-label="Vote kick">👎</button>`;
    }
    const label = GameUI[S.gameId].scoreLabel;
    return `<li class="person ${p.connected ? '' : 'offline'} ${p.id === S.you ? 'me' : ''}">
      ${avatarHTML(p.avatar)}
      <div class="pmain"><div class="pname">${esc(p.name)}${p.id === S.you ? ' <small>(you)</small>' : ''}</div>
      ${spectator ? '' : `<div class="pscore">${p.score} ${p.score === 1 && label === 'wins' ? 'win' : label}</div>`}</div>
      <div class="picons">${icons.join('')}${p.connected ? '' : '<span title="Reconnecting">📶</span>'}</div>${kick}</li>`;
  }

  function renderPeople() {
    $('#player-count').textContent = `${S.players.length}/${S.maxPlayers}`;
    $('#spec-count').textContent = S.spectators.length ? `(${S.spectators.length})` : '';
    const sorted = S.gameId === 'drawguess' && (S.phase === 'game' || S.lastResult) ? [...S.players].sort((a, b) => b.score - a.score) : S.players;
    $('#player-list').innerHTML = sorted.map((p) => personHTML(p)).join('') || '<li class="empty">Nobody seated</li>';
    $('#spec-list').innerHTML = S.spectators.map((p) => personHTML(p, { spectator: true })).join('') || '<li class="empty">Nobody watching</li>';

    const G = GAMES[S.gameId];
    const midJoin = S.gameId === 'drawguess';
    let seat = '';
    if (S.role === 'spectator') {
      if (S.players.length < S.maxPlayers && (S.phase === 'lobby' || midJoin)) seat = '<button class="btn btn-small btn-wide" id="take-seat">🪑 Take a seat</button>';
      else seat = `<p class="seat-note">You're watching. ${S.players.length >= S.maxPlayers ? `${G.name} is ${S.maxPlayers} players max, so a Take Seat button shows up when someone leaves.` : 'You can take a seat when this match ends.'}</p>`;
    } else if (S.phase === 'lobby') {
      seat = '<button class="link-btn" id="just-watch">Just watch instead</button>';
    }
    $('#seat-action').innerHTML = seat;
  }
  $('#seat-action').addEventListener('click', (e) => {
    if (e.target.id === 'take-seat') socket.emit('takeSeat');
    if (e.target.id === 'just-watch') socket.emit('watch');
  });
  $('#side').addEventListener('click', (e) => {
    const k = e.target.closest('[data-kick]');
    const v = e.target.closest('[data-vote]');
    if (k) {
      const p = app.member(k.dataset.kick);
      if (p && confirm(`Kick ${p.name} from the lobby?`)) socket.emit('kick', p.id);
    }
    if (v) {
      const p = app.member(v.dataset.vote);
      if (p && confirm(`Vote to kick ${p.name}?`)) socket.emit('voteKick', p.id);
    }
  });

  // ---------- stage: lobby or game ----------
  function unmountStage() {
    if (mounted && mounted.startsWith('game:')) GameUI[mounted.slice(5)].unmount();
    mounted = null;
    hostKey = null;
  }

  function renderStage() {
    const mode = S.phase === 'game' ? 'game:' + S.gameId : 'lobby';
    const stage = $('#stage');
    if (mode !== mounted) {
      unmountStage();
      stage.innerHTML = '';
      mounted = mode;
      if (mode === 'lobby') {
        stage.innerHTML = '<div class="lobby-stage"><div id="lobby-top"></div><div id="host-panel"></div></div>';
      } else {
        GameUI[S.gameId].mount(stage, app);
      }
    }
    if (mode === 'lobby') renderLobby();
    else GameUI[S.gameId].update(S, app);
  }

  let autoTimer = null;
  function renderLobby() {
    const G = GAMES[S.gameId];
    const host = app.member(S.hostId);
    let top = '';
    if (S.autoStartIn !== null) {
      top += `<div class="banner">Next game starts in <b id="auto-n">${Math.ceil(S.autoStartIn / 1000)}</b>s${isHost() ? ' (or start it now)' : ''}</div>`;
    }
    if (S.lastResult) {
      top += `<div class="card result-card">${GameUI[S.lastResult.type].renderResult(S.lastResult, S, app)}</div>`;
      top += '<div class="ad-slot ad-wide" data-slot="between-games">Ad space (between games)</div>';
    } else {
      const need = Math.max(0, G.min - S.players.length);
      top += `<div class="card waiting">
        <div class="waiting-art">${G.art}</div>
        <h2>${G.name}</h2>
        <p>${need ? `Waiting for ${need} more player${need > 1 ? 's' : ''}. Send the link to a friend!` : `${S.players.length}/${S.maxPlayers} players ready.`}</p>
        <div class="share-box"><input readonly value="${esc(roomLink())}" aria-label="Lobby link"><button class="btn btn-small" data-copy>Copy</button></div>
      </div>`;
    }
    $('#lobby-top').innerHTML = top;
    const n = $('[data-copy]', $('#lobby-top'));
    if (n) n.addEventListener('click', copyLink);
    clearInterval(autoTimer);
    if (S.autoStartIn !== null) {
      const end = performance.now() + S.autoStartIn;
      autoTimer = setInterval(() => {
        const el = $('#auto-n');
        if (!el) return clearInterval(autoTimer);
        el.textContent = Math.max(0, Math.ceil((end - performance.now()) / 1000));
      }, 250);
    }
    if (isHost()) renderHostPanel();
    else {
      hostKey = null;
      $('#host-panel').innerHTML = `<div class="card waiting-host">${host ? avatarHTML(host.avatar) : ''}<p>${S.isPublic ? 'Public lobby. The game starts on its own when enough players are in.' : `Waiting for <b>${esc(host ? host.name : 'the host')}</b> to start the game.`}</p></div>`;
    }
  }

  let hostKey = null;
  function renderHostPanel() {
    const G = GAMES[S.gameId];
    const key = S.gameId;
    const panel = $('#host-panel');
    if (key !== hostKey) {
      hostKey = key;
      panel.innerHTML = `<div class="card host-card">
        <div class="host-head"><h3>Host controls</h3><span class="muted">Only you can see this</span></div>
        <div class="tiles tiles-small">${Object.entries(GAMES).map(([id, x]) => `<button type="button" class="tile ${id === S.gameId ? 'on' : ''}" data-switch="${id}">${x.art}<b>${x.name}</b><small>${x.players}</small></button>`).join('')}</div>
        <div class="form-grid">
          <label class="field"><span>Who can join</span><select data-host="isPublic">${opt(0, 0, 'Private (link only)')}${opt(1, 0, 'Public (listed)')}</select></label>
          <label class="field"><span>Max players</span>${G.min === G.max ? `<select disabled><option>${G.max}</option></select>` : `<select data-host="maxPlayers">${Array.from({ length: G.max - G.min + 1 }, (_, i) => G.min + i).map((v) => opt(v, 0)).join('')}</select>`}</label>
          <label class="check"><input type="checkbox" data-host="locked"><span>🔒 Lock lobby <small>(no new joins, even by link)</small></span></label>
          <label class="check"><input type="checkbox" data-host="spectatorsOn"><span>Allow spectators</span></label>
          <label class="field"><span>Max spectators</span><select data-host="maxSpectators">${[0, 5, 10, 20, 50].map((v) => opt(v, 0)).join('')}</select></label>
          ${settingsHTML(S.gameId, S.settings)}
        </div>
        <button class="btn btn-big btn-wide" id="start-btn">Start game</button>
      </div>`;
    }
    // Keep inputs in step with the server without clobbering what's being edited.
    $$('[data-host]', panel).forEach((i) => {
      if (document.activeElement === i) return;
      const v = S[i.dataset.host];
      if (i.type === 'checkbox') i.checked = !!v;
      else i.value = typeof v === 'boolean' ? (v ? 1 : 0) : v;
    });
    $$('[data-setting]', panel).forEach((i) => {
      if (document.activeElement === i && i.type !== 'checkbox') return; // the server may refuse a checkbox (custom-only without 6 words)
      const v = S.settings[i.dataset.setting];
      if (i.type === 'checkbox') i.checked = !!v;
      else i.value = v;
    });
    const need = G.min - S.players.length;
    const btn = $('#start-btn');
    btn.disabled = need > 0;
    btn.textContent = need > 0 ? `Need ${need} more player${need > 1 ? 's' : ''}` : S.lastResult ? 'Play again' : 'Start game';
  }

  $('#stage').addEventListener('change', (e) => {
    const t = e.target;
    if (!isHost()) return;
    if (t.dataset.host) {
      let v = t.type === 'checkbox' ? t.checked : Number(t.value);
      if (t.dataset.host === 'isPublic') v = !!v;
      socket.emit('hostUpdate', { [t.dataset.host]: v });
    } else if (t.dataset.setting && t.closest('#host-panel')) {
      const v = t.type === 'checkbox' ? t.checked : t.tagName === 'SELECT' && t.dataset.setting !== 'difficulty' ? Number(t.value) : t.value;
      socket.emit('hostUpdate', { settings: { [t.dataset.setting]: v } });
    }
  });
  $('#stage').addEventListener('click', (e) => {
    if (e.target.closest('#start-btn')) socket.emit('startGame');
    const sw = e.target.closest('[data-switch]');
    if (sw && isHost() && sw.dataset.switch !== S.gameId) switchGame(sw.dataset.switch);
  });

  function switchGame(gameId) {
    const G = GAMES[gameId];
    if (S.players.length <= G.max) return socket.emit('switchGame', { game: gameId });
    const total = S.players.length + S.spectators.length;
    openModal(`
      <h2 class="card-title">${G.name} is ${G.max} players max</h2>
      <p>There are ${total} people here. ${G.max} will play and ${total - G.max} will spectate. Pick who plays:</p>
      <div class="pick-list">${S.players.map((p) => `<label class="pick"><input type="checkbox" value="${p.id}">${avatarHTML(p.avatar)} ${esc(p.name)}</label>`).join('')}</div>
      <p class="muted" id="pick-count">0/${G.max} picked</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-ghost" id="pick-random">🎲 Random</button>
        <button class="btn" id="pick-go" disabled>Switch</button>
      </div>`);
    const boxes = $$('.pick input');
    const sync = () => {
      const n = boxes.filter((b) => b.checked).length;
      $('#pick-count').textContent = `${n}/${G.max} picked`;
      $('#pick-go').disabled = n !== G.max;
      boxes.forEach((b) => { b.disabled = !b.checked && n >= G.max; });
    };
    boxes.forEach((b) => b.addEventListener('change', sync));
    $('#pick-random').addEventListener('click', () => { socket.emit('switchGame', { game: gameId }); closeModal(); });
    $('#pick-go').addEventListener('click', () => {
      socket.emit('switchGame', { game: gameId, seats: boxes.filter((b) => b.checked).map((b) => b.value) });
      closeModal();
    });
  }

  // ---------- start ----------
  route();
})();
