(() => {
  const bc = new BroadcastChannel('mockroom');
  const me = Math.random().toString(36).slice(2, 12);
  const all = {};
  function makeRoom(name) {
    const listeners = {}, peerL = [], peers = new Map();
    let myPres = {}, snap = null, alive = true;
    const mk = (p, pres, mine) => Object.freeze({ peer: p, by: null, isMe: mine, sameTab: mine, kind: 'viewer', guest: false, presence: Object.freeze({ ...pres }), updatedAt: Date.now() });
    peers.set(me, mk(me, {}, true));
    const snapF = () => snap || (snap = Object.freeze([...peers.values()]));
    const notify = (j, l, u) => { snap = null; const ch = { peers: snapF(), joined: j, left: l, updated: u }; setTimeout(() => alive && peerL.forEach((f) => f(ch)), 0); };
    const onMsg = (ev) => {
      const m = ev.data; if (m.room !== name || !alive) return;
      if (m.type === 'hello') { if (!peers.has(m.peer)) { const np = mk(m.peer, {}, false); peers.set(m.peer, np); notify([np], [], []); } bc.postMessage({ room: name, type: 'pres', peer: me, pres: myPres }); }
      else if (m.type === 'pres') { const ex = peers.get(m.peer); const np = mk(m.peer, m.pres, false); peers.set(m.peer, np); ex ? notify([], [], [np]) : notify([np], [], []); }
      else if (m.type === 'bye') { const ex = peers.get(m.peer); if (ex) { peers.delete(m.peer); notify([], [ex], []); } }
      else if (m.type === 'emit') (listeners[m.topic] || []).forEach((f) => f({ topic: m.topic, data: m.data, peer: m.peer, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false }));
    };
    bc.addEventListener('message', onMsg);
    const api = {
      name,
      emit(topic, data) {
        const s = JSON.stringify(data);
        if (new TextEncoder().encode(s).length > 4096) { console.error('EMIT TOO BIG', topic, s.length); return Promise.reject({ code: 'invalid_argument', message: 'over 4 KiB' }); }
        if (window.__readOnly) return Promise.reject({ code: 'not_permitted' });
        if (window.__drop && Math.random() < window.__drop) return Promise.resolve();
        bc.postMessage({ room: name, type: 'emit', topic, data, peer: me });
        setTimeout(() => (listeners[topic] || []).forEach((f) => f({ topic, data: JSON.parse(s), peer: me, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false })), 0);
        return Promise.resolve();
      },
      on(topic, fn) { (listeners[topic] = listeners[topic] || []).push(fn); return () => { listeners[topic] = listeners[topic].filter((x) => x !== fn); }; },
      presence(patch) {
        myPres = { ...myPres }; for (const k in patch) { if (patch[k] === null) delete myPres[k]; else myPres[k] = patch[k]; }
        if (JSON.stringify(myPres).length > 4096) { console.error('PRESENCE TOO BIG'); return Promise.reject({ code: 'invalid_argument' }); }
        const np = mk(me, myPres, true); peers.set(me, np); notify([], [], [np]);
        bc.postMessage({ room: name, type: 'pres', peer: me, pres: myPres }); return Promise.resolve();
      },
      peers: () => snapF(),
      onPeers(fn) { peerL.push(fn); setTimeout(() => fn({ peers: snapF(), joined: snapF(), left: [], updated: [] }), 0); return () => { const i = peerL.indexOf(fn); if (i >= 0) peerL.splice(i, 1); }; },
      connected: () => true,
      onConnection(fn) { setTimeout(() => fn(true), 0); return () => {}; },
      leave() { alive = false; bc.postMessage({ room: name, type: 'bye', peer: me }); delete all[name]; return Promise.resolve(); },
    };
    bc.postMessage({ room: name, type: 'hello', peer: me });
    addEventListener('pagehide', () => bc.postMessage({ room: name, type: 'bye', peer: me }));
    return api;
  }
  const lobby = makeRoom('__lobby');
  lobby.join = async (n) => all[n] || (all[n] = makeRoom(n));
  window.claude = { use: async (n) => (n === 'room' ? lobby : null) };
})();
