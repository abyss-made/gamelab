// Tiny sound effects made with Web Audio. No files to download.
window.Sound = (() => {
  let ctx = null;
  let muted = localStorage.getItem('pg_muted') === '1';

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type = 'sine', vol = 0.15) {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, c.currentTime + start);
    g.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + start);
    o.stop(c.currentTime + start + dur + 0.05);
  }

  const sounds = {
    correct: () => { tone(660, 0, 0.15); tone(990, 0.12, 0.25); },
    guess: () => tone(880, 0, 0.12, 'triangle', 0.1),
    yourturn: () => { tone(523, 0, 0.12); tone(659, 0.1, 0.12); tone(784, 0.2, 0.2); },
    reveal: () => { tone(392, 0, 0.18, 'triangle'); tone(330, 0.15, 0.25, 'triangle'); },
    drop: () => tone(180, 0, 0.12, 'square', 0.06),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.25)),
    lose: () => { tone(330, 0, 0.2, 'triangle'); tone(262, 0.18, 0.35, 'triangle'); },
    join: () => tone(740, 0, 0.08, 'sine', 0.07),
    tick: () => tone(1200, 0, 0.04, 'square', 0.04),
  };

  return {
    play(name) {
      if (muted || !sounds[name]) return;
      try { sounds[name](); } catch (e) { /* audio blocked until first click */ }
    },
    toggle() {
      muted = !muted;
      localStorage.setItem('pg_muted', muted ? '1' : '0');
      return muted;
    },
    get muted() { return muted; },
  };
})();
