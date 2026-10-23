// Draw & Guess screen: canvas, tools, word/hints, timer, overlays.
window.GameUI = window.GameUI || {};
GameUI.drawguess = (() => {
  const W = 800;
  const H = 600;
  const PALETTE = [
    '#000000', '#4c4c4c', '#9a9a9a', '#ffffff', '#ef130b', '#ff7100', '#ffe400', '#00cc00',
    '#00b2ff', '#231fd3', '#a300ba', '#ff8fc8', '#a0522d', '#592f2a', '#ffcfa8', '#740b07',
    '#c23800', '#e8a200', '#005510', '#00569e', '#0e0865', '#550069',
  ];
  const SIZES = [4, 10, 20, 38];

  // One canvas for the whole session, so drawing that arrives before the
  // screen is shown still lands on it.
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.className = 'dg-canvas';
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const blank = () => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); };
  blank();

  let tool = 'brush';
  let color = '#000000';
  let size = 10;
  let remote = null;
  let local = null;
  let pending = [];
  let flushTimer = null;
  let root = null;
  let app = null;
  let S = null;
  let clock = null;
  let deadline = 0;
  let total = 1;
  let lastKey = '';
  let lastSecond = -1;

  // ---------- drawing primitives ----------
  function dot(x, y, c, s) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, s / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  function seg(x0, y0, x1, y1, c, s) {
    ctx.strokeStyle = c;
    ctx.lineWidth = s;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  function flood(x0, y0, hex) {
    const img = ctx.getImageData(0, 0, W, H);
    if (GameUI.fill.floodFill(img.data, W, H, x0, y0, hex)) ctx.putImageData(img, 0, 0);
  }

  function replay(history) {
    blank();
    for (const h of history) {
      if (h.t === 's') {
        const p = h.p;
        dot(p[0], p[1], h.c, h.s);
        for (let i = 2; i < p.length; i += 2) seg(p[i - 2], p[i - 1], p[i], p[i + 1], h.c, h.s);
      } else if (h.t === 'f') {
        flood(h.x, h.y, h.c);
      }
    }
  }

  // ---------- network in ----------
  function onDraw(d) {
    if (d.op === 'begin') {
      remote = { x: d.x, y: d.y, c: d.color, s: d.size };
      dot(d.x, d.y, d.color, d.size);
    } else if (d.op === 'pts' && remote) {
      for (let i = 0; i < d.pts.length; i += 2) {
        seg(remote.x, remote.y, d.pts[i], d.pts[i + 1], remote.c, remote.s);
        remote.x = d.pts[i];
        remote.y = d.pts[i + 1];
      }
    } else if (d.op === 'end') {
      remote = null;
    } else if (d.op === 'fill') {
      flood(d.x, d.y, d.color);
    }
  }
  function onCanvas(d) {
    remote = null;
    replay(d.history || []);
  }

  // ---------- network out ----------
  const canDraw = () => S && S.game && S.game.phase === 'draw' && S.game.drawerId === S.you;
  function flush() {
    clearTimeout(flushTimer);
    flushTimer = null;
    if (!pending.length) return;
    app.socket.emit('draw', { op: 'pts', pts: pending });
    pending = [];
  }
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(W, ((e.clientX - r.left) * W) / r.width));
    const y = Math.max(0, Math.min(H, ((e.clientY - r.top) * H) / r.height));
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!canDraw() || e.button > 0) return;
    e.preventDefault();
    const [x, y] = pos(e);
    if (tool === 'fill') {
      flood(x, y, color);
      app.socket.emit('draw', { op: 'fill', x, y, color });
      return;
    }
    canvas.setPointerCapture(e.pointerId);
    const c = tool === 'eraser' ? '#ffffff' : color;
    local = { x, y, c, s: size };
    dot(x, y, c, size);
    app.socket.emit('draw', { op: 'begin', x, y, color: c, size });
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!local) return;
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of events.length ? events : [e]) {
      const [x, y] = pos(ev);
      if (Math.abs(x - local.x) + Math.abs(y - local.y) < 1.5) continue;
      seg(local.x, local.y, x, y, local.c, local.s);
      local.x = x;
      local.y = y;
      pending.push(x, y);
      if (pending.length >= 380) flush();
    }
    if (!flushTimer && pending.length) flushTimer = setTimeout(flush, 40);
  });
  const stop = () => {
    if (!local) return;
    flush();
    app.socket.emit('draw', { op: 'end' });
    local = null;
  };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
  canvas.addEventListener('lostpointercapture', stop);

  // ---------- screen ----------
  function toolsHTML() {
    return `
      <div class="dg-palette">${PALETTE.map((c) => `<button class="swatch ${c === color ? 'on' : ''}" style="--sw:${c}" data-color="${c}" aria-label="Color ${c}"></button>`).join('')}</div>
      <div class="dg-sizes">${SIZES.map((s) => `<button class="size ${s === size ? 'on' : ''}" data-size="${s}" aria-label="Brush size ${s}"><i style="--s:${Math.max(4, s * 0.6)}px"></i></button>`).join('')}</div>
      <div class="dg-actions">
        <button class="tool ${tool === 'brush' ? 'on' : ''}" data-tool="brush" title="Brush">🖌️</button>
        <button class="tool ${tool === 'fill' ? 'on' : ''}" data-tool="fill" title="Fill">🪣</button>
        <button class="tool ${tool === 'eraser' ? 'on' : ''}" data-tool="eraser" title="Eraser">🧽</button>
        <button class="tool" data-do="undo" title="Undo">↩️</button>
        <button class="tool" data-do="clear" title="Clear">🗑️</button>
      </div>`;
  }

  function mount(stage, a) {
    app = a;
    root = document.createElement('div');
    root.className = 'dg';
    root.innerHTML = `
      <div class="dg-top card">
        <div class="dg-timer"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" class="track"/><circle cx="18" cy="18" r="15" class="bar" id="dg-ring"/></svg><span id="dg-time">0</span></div>
        <div class="dg-word" id="dg-word"></div>
        <div class="dg-round" id="dg-round"></div>
      </div>
      <div class="dg-board card">
        <div class="dg-boardbar"><button type="button" class="btn btn-small btn-ghost" id="dg-expand" aria-pressed="false">⤢ Enlarge canvas</button></div>
        <div class="dg-wrap" id="dg-wrap"><div class="dg-overlay" id="dg-overlay" hidden></div></div>
      </div>
      <div class="dg-tools card" id="dg-tools" hidden>${toolsHTML()}</div>`;
    $('#dg-wrap').prepend(canvas);
    stage.appendChild(root);
    root.addEventListener('click', onClick);
    $('#dg-expand').addEventListener('click', () => setBig(!big));
    document.addEventListener('keydown', onKey);
    clock = setInterval(tickClock, 200);
  }

  const $ = (s) => root.querySelector(s);

  // Enlarged canvas: on wide screens the side list is hidden and the stage grows (chat stays);
  // on phones the drawing area fills the screen. Same canvas element, so nothing is lost.
  let big = false;
  function setBig(on) {
    big = !!on;
    if (!root) return;
    root.classList.toggle('big', big);
    document.body.classList.toggle('dg-big', big);
    const b = $('#dg-expand');
    b.textContent = big ? '⤡ Restore size' : '⤢ Enlarge canvas';
    b.setAttribute('aria-pressed', String(big));
  }
  function onKey(e) { if (e.key === 'Escape' && big) setBig(false); }

  function onClick(e) {
    const c = e.target.closest('[data-color]');
    const s = e.target.closest('[data-size]');
    const t = e.target.closest('[data-tool]');
    const d = e.target.closest('[data-do]');
    const ch = e.target.closest('[data-choose]');
    if (c) { color = c.dataset.color; if (tool === 'eraser') tool = 'brush'; }
    if (s) size = Number(s.dataset.size);
    if (t) tool = t.dataset.tool;
    if (d && canDraw()) {
      if (d.dataset.do === 'clear' && !confirm('Clear the whole drawing?')) return;
      app.socket.emit('draw', { op: d.dataset.do });
    }
    if (ch) app.socket.emit('action', { type: 'choose', index: Number(ch.dataset.choose) });
    if (c || s || t) $('#dg-tools').innerHTML = toolsHTML();
  }

  function tickClock() {
    if (!root) return;
    const left = Math.max(0, deadline - performance.now());
    const sec = Math.ceil(left / 1000);
    $('#dg-time').textContent = sec;
    const ring = $('#dg-ring');
    ring.style.strokeDashoffset = String(94.25 * (1 - left / total));
    root.classList.toggle('hurry', S && S.game && S.game.phase === 'draw' && sec <= 10);
    if (S && S.game && S.game.phase === 'draw' && sec <= 5 && sec > 0 && sec !== lastSecond) Sound.play('tick');
    lastSecond = sec;
  }

  function wordHTML(g, meIsDrawer) {
    if (g.phase === 'choose') return `<span class="dg-label">${meIsDrawer ? 'Pick a word to draw' : 'Get ready...'}</span>`;
    if (g.word) {
      const label = meIsDrawer ? 'Draw this' : g.phase === 'reveal' ? 'The word was' : 'You got it';
      return `<span class="dg-label">${label}</span><span class="dg-answer">${app.esc(g.word)}</span>`;
    }
    if (!g.hint) return '';
    const lens = g.hint.join('').split(' ').map((w) => w.length).join(' ');
    return `<span class="dg-label">Guess the word</span><span class="dg-hint">${g.hint.map((c) => (c === ' ' ? '<i class="gap"></i>' : c === '_' ? '<i class="blank"></i>' : `<i class="letter">${app.esc(c)}</i>`)).join('')}<sup>${lens}</sup></span>`;
  }

  function overlayHTML(g, meIsDrawer) {
    const drawer = app.member(g.drawerId);
    const dname = drawer ? app.esc(drawer.name) : 'Someone';
    if (g.phase === 'choose') {
      if (meIsDrawer) {
        return `<div class="ov-box"><h3>Your turn! Pick a word</h3><div class="choices">${g.choices.map((w, i) => `<button class="btn" data-choose="${i}">${app.esc(w)}</button>`).join('')}</div></div>`;
      }
      return `<div class="ov-box">${drawer ? app.avatarHTML(drawer.avatar, 'av-lg') : ''}<h3>${dname} is choosing a word...</h3></div>`;
    }
    if (g.phase === 'reveal' && g.turnResult) {
      const r = g.turnResult;
      const why = r.reason === 'all' ? 'Everyone guessed it!' : r.reason === 'left' ? 'The drawer left.' : "Time's up!";
      return `<div class="ov-box"><p class="muted">${why}</p><h3>The word was <span class="hl">${app.esc(r.word)}</span></h3>
        <ul class="turn-scores">${r.scores.map((s) => `<li><span>${app.esc(s.name)}${s.drawer ? ' ✏️' : ''}</span><b class="${s.pts ? 'plus' : ''}">+${s.pts}</b></li>`).join('')}</ul></div>`;
    }
    return '';
  }

  function update(state) {
    S = state;
    const g = S.game;
    if (!g) return;
    const meIsDrawer = g.drawerId === S.you;
    deadline = performance.now() + g.timeLeft;
    total = g.totalTime || 1;
    $('#dg-round').textContent = `Round ${Math.min(g.round, g.rounds)} of ${g.rounds}`;
    $('#dg-word').innerHTML = wordHTML(g, meIsDrawer);
    const ov = overlayHTML(g, meIsDrawer);
    const overlay = $('#dg-overlay');
    overlay.hidden = !ov;
    overlay.innerHTML = ov;
    $('#dg-tools').hidden = !(meIsDrawer && g.phase === 'draw');
    root.classList.toggle('drawing', meIsDrawer && g.phase === 'draw');
    const key = g.turnId + ':' + g.phase;
    if (key !== lastKey) {
      lastKey = key;
      if (g.phase === 'choose' && meIsDrawer) Sound.play('yourturn');
      if (g.phase === 'reveal') Sound.play('reveal');
      if (g.phase === 'choose') { tool = 'brush'; $('#dg-tools').innerHTML = toolsHTML(); }
    }
    tickClock();
  }

  function unmount() {
    clearInterval(clock);
    clock = null;
    stop();
    setBig(false);
    document.removeEventListener('keydown', onKey);
    if (root) root.remove();
    root = null;
    lastKey = '';
  }

  function renderResult(r, state, a) {
    const st = r.standings || [];
    const medal = ['🥇', '🥈', '🥉'];
    const podium = st.slice(0, 3).map((p, i) => `
      <div class="podium-spot p${i + 1}">${a.avatarHTML(p.avatar, 'av-lg')}<b>${a.esc(p.name)}</b><span>${p.score} pts</span><div class="podium-block">${medal[i]}</div></div>`);
    // Show 2nd, 1st, 3rd so the winner stands in the middle.
    const order = [podium[1], podium[0], podium[2]].filter(Boolean).join('');
    return `
      <h2 class="result-title">${st.length ? `🏆 ${a.esc(st[0].name)} wins!` : 'Game over'}</h2>
      ${r.note ? `<p class="muted center">${a.esc(r.note)}</p>` : ''}
      <div class="podium">${order}</div>
      ${st.length > 3 ? `<ol class="rest" start="4">${st.slice(3).map((p) => `<li>${a.esc(p.name)} <b>${p.score} pts</b></li>`).join('')}</ol>` : ''}`;
  }

  function resultSound(r, state) {
    const st = r.standings || [];
    if (!st.length) return null;
    return st[0].id === state.you ? 'win' : 'reveal';
  }

  function chatPlaceholder(state) {
    const g = state.game;
    if (!g || g.phase !== 'draw') return null;
    if (g.drawerId === state.you) return "Chat (you can't say the word)";
    if (state.role === 'spectator' || g.guessed.includes(state.you)) return 'Chat with players who know the word...';
    return 'Type your guess here...';
  }

  return { mount, update, unmount, onDraw, onCanvas, renderResult, resultSound, chatPlaceholder, scoreLabel: 'pts' };
})();
